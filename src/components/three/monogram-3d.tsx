"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * 3D LM monogram. Shows the flat logo until Three.js has loaded and rendered,
 * then cross-fades to the sculpture.
 */
export function Monogram3D({ tone = "brand", className }: { tone?: "brand" | "light"; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // only fetch three.js once the sculpture is close to the viewport
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        import("./monogram")
          .then(({ mountMonogram }) => {
            if (!cancelled) teardown = mountMonogram({ host, canvas, tone, reduce });
          })
          .catch(() => {});
      },
      { rootMargin: "300px" },
    );
    io.observe(host);
    return () => {
      cancelled = true;
      io.disconnect();
      teardown?.();
    };
  }, [tone]);

  return (
    <div ref={hostRef} className={cn("group/mono relative", className)}>
      <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-700 group-data-[ready]/mono:opacity-0">
        <LogoMark tone={tone} className="h-[62%]" />
      </div>
      <canvas
        ref={canvasRef}
        aria-label="The Luxuriate monogram in 3D. Drag to turn it."
        role="img"
        className="absolute inset-0 size-full cursor-grab touch-pan-y opacity-0 transition-opacity duration-700 group-data-[ready]/mono:opacity-100"
      />
    </div>
  );
}
