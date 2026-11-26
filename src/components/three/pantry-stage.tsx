"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { PantryState } from "./pantry";

const fmt = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const naira = (kobo: number) => `₦${fmt.format(Math.round(kobo / 100))}`;
const saved = (kobo: number, name: string) => (kobo > 0 ? `${naira(kobo)} saved · ${name}` : name);

/**
 * The hero's 3D package box, plus the little ledger card that follows it month
 * by month. Three.js loads after the page is interactive; until then (or without
 * WebGL) the flat logo holds the space.
 */
export function PantryStage({
  months,
  monthlyKobo,
  packageName,
  className,
}: {
  months: string[];
  monthlyKobo: number;
  packageName: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const n = months.length || 12;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let teardown: (() => void) | null | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const show = ({ phase, month }: PantryState) => {
      const m = Math.min(n, month);
      barsRef.current?.querySelectorAll("span").forEach((s, i) => {
        if (i < m) s.dataset.on = "";
        else delete s.dataset.on;
      });
      if (!titleRef.current || !noteRef.current) return;
      if (phase === "complete" || phase === "moving") {
        titleRef.current.textContent = phase === "complete" ? "Package complete" : "Ready for collection";
        noteRef.current.textContent = saved(monthlyKobo * n, packageName);
      } else if (m === 0) {
        titleRef.current.textContent = "A new cycle begins";
        noteRef.current.textContent = monthlyKobo > 0 ? `${naira(monthlyKobo)} a month · ${packageName}` : packageName;
      } else {
        titleRef.current.textContent = `Month ${String(m).padStart(2, "0")} / ${n} · ${months[m - 1] ?? ""}`;
        noteRef.current.textContent = saved(monthlyKobo * m, packageName);
      }
    };

    // labels on the 3D packaging use the page font, so wait for it
    document.fonts.ready
      .then(() => import("./pantry"))
      .then(({ mountPantry }) => {
        if (cancelled) return;
        teardown = mountPantry({ host, canvas, reduce, onState: show });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [months, monthlyKobo, n, packageName]);

  return (
    <div ref={hostRef} className={cn("group/pantry relative", className)}>
      {/* stand-in until the scene is ready */}
      <div className="absolute inset-x-0 bottom-[6.5rem] top-0 flex items-center justify-center transition-opacity duration-700 group-data-[ready]/pantry:opacity-0 lg:bottom-0">
        <LogoMark tone="light" className="h-[38%] opacity-90" />
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        style={{
          // feather every edge so the scene melts into the backdrop
          maskImage: "linear-gradient(to right, transparent, black 9%, black 91%, transparent), linear-gradient(to bottom, transparent, black 10%, black 88%, transparent)",
          maskComposite: "intersect",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 9%, black 91%, transparent), linear-gradient(to bottom, transparent, black 10%, black 88%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
        aria-label={`A Luxuriate package box filling with foodstuff, one item for each of the ${n} monthly payments. Drag to turn it.`}
        className="absolute inset-x-0 bottom-[6.5rem] top-0 h-[calc(100%-6.5rem)] w-full cursor-grab touch-pan-y opacity-0 transition-opacity duration-1000 group-data-[ready]/pantry:opacity-100 lg:bottom-0 lg:h-full"
      />

      {/* ledger card */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 w-[17rem] -translate-x-1/2 rounded-2xl lg:bottom-8 lg:left-6 lg:translate-x-0 bg-night-2/75 p-4 text-cream shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-inset ring-white/10 backdrop-blur-md">
        <p ref={titleRef} className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-honey-300">
          Package complete
        </p>
        <div ref={barsRef} className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              data-on=""
              className="h-1.5 rounded-full bg-white/10 transition-colors duration-300 data-[on]:bg-honey-400"
            />
          ))}
        </div>
        <p ref={noteRef} className="mt-3 text-[0.8125rem] text-ink-200">
          {saved(monthlyKobo * n, packageName)}
        </p>
      </div>
    </div>
  );
}
