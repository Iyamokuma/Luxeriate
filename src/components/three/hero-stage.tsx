"use client";

import { useEffect, useRef } from "react";
import { HERO_TILT, tiltTransform } from "./hero-tilt";
import { cn } from "@/lib/utils";

/**
 * Perspective stage for the hero window. The window renders on the server in
 * its resting pose, in front of a charcoal disc with a soft gold corona (where
 * the light page and the dark shade meet). Once on screen, the Three.js layer
 * (loaded on demand) adds the orbiting gold arcs and lets the window lean
 * towards the pointer.
 */
export function HeroStage({ children, className }: { children: React.ReactNode; className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const win = winRef.current;
    const canvas = canvasRef.current;
    if (!stage || !win || !canvas) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./gold-orbit")
      .then(({ mountGoldOrbit }) => {
        if (!cancelled) teardown = mountGoldOrbit({ stage, win, canvas, reduce });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <div ref={stageRef} className={cn("relative [perspective:150em]", className)}>
      {/* the dark disc and its gold corona */}
      <div
        aria-hidden
        className="absolute left-[21em] top-[8.5em] size-[48em] rounded-full"
        style={{
          background: "radial-gradient(circle at 32% 28%, #2e2820 0%, #1c1915 34%, #110f0c 70%, #0d0b09 100%)",
          boxShadow:
            "inset 0 0 0 0.12em rgb(233 199 107 / 0.32), inset 2.4em 2.6em 6em -3em rgb(240 205 120 / 0.34), 0 0 0 0.6em rgb(233 199 107 / 0.06), 0 0 5em 0.6em rgb(233 199 107 / 0.5), 0 0 16em 3em rgb(233 199 107 / 0.26)",
        }}
      />
      <div
        ref={winRef}
        aria-hidden
        className="absolute left-[8em] top-[11em] h-[42em] w-[62em] will-change-transform"
        style={{ transform: tiltTransform(HERO_TILT) }}
      >
        {children}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-[1400ms] ease-out data-[ready]:opacity-100"
      />
    </div>
  );
}
