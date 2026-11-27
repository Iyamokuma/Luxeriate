"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * The customer's own Luxuriate box: the same 3D package as the About page,
 * filled with one item for each month they have paid (out of twelve), so the
 * dashboard shows their year at a glance. Three.js loads after the page is
 * interactive; until then, or without WebGL, the flat mark holds the space.
 */
export function PackageBox({ filled, label, className }: { filled: number; label: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let teardown: (() => void) | null | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.fonts.ready
      .then(() => import("@/components/three/pantry"))
      .then(({ mountPantry }) => {
        if (cancelled) return;
        teardown = mountPantry({ host, canvas, reduce, filled, fresh: true, onState: () => {} });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [filled]);

  return (
    <div ref={hostRef} className={cn("group/box relative", className)}>
      <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-700 group-data-[ready]/box:opacity-0">
        <LogoMark tone="light" className="h-[34%] opacity-80" />
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 6%, black 90%, transparent)",
          maskComposite: "intersect",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 6%, black 90%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
        className="absolute inset-0 h-full w-full cursor-grab touch-pan-y opacity-0 transition-opacity duration-1000 group-data-[ready]/box:opacity-100"
      />
    </div>
  );
}
