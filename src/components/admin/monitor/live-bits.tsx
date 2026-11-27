"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const clockFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

/** The current time, rounded down to `step` ms and ticking. 0 on the server and during hydration. */
function useNow(step: number) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const id = setInterval(notify, Math.min(step, 5_000));
      return () => clearInterval(id);
    },
    [step],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / step) * step,
    () => 0,
  );
}

/** Lagos date and time, ticking. Empty until hydrated so server and browser never disagree. */
export function LagosClock({ className }: { className?: string }) {
  const tick = useNow(10_000);
  const now = tick ? new Date(tick) : null;
  const parts = now ? clockFmt.formatToParts(now) : [];
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return (
    <span className={cn("inline-flex min-w-[11.5rem] items-center gap-2 font-mono text-[0.75rem] tracking-[0.04em]", className)}>
      {now ? (
        <>
          <span>
            {get("weekday")} {get("day")} {get("month")}
          </span>
          <span className="opacity-40">·</span>
          <span className="tnum">
            {get("hour")}:{get("minute")}
          </span>
          <span className="opacity-60">WAT</span>
        </>
      ) : (
        <span className="opacity-0">Thu 00 Jan · 00:00 WAT</span>
      )}
    </span>
  );
}

/** "checked 20 s ago", counting up from a server timestamp. */
export function SinceLabel({ at, prefix = "Checked" }: { at: string; prefix?: string }) {
  const tick = useNow(5_000);
  if (!tick) return <span>{prefix} just now</span>;
  const s = Math.max(0, Math.round((tick - new Date(at).getTime()) / 1000));
  const text = s < 15 ? "just now" : s < 60 ? `${Math.round(s / 5) * 5}s ago` : `${Math.round(s / 60)} min ago`;
  return (
    <span>
      {prefix} {text}
    </span>
  );
}

/** Sticky chips that jump between overview sections and follow the scroll. */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Overview sections"
      className="sticky top-16 z-10 -mx-4 border-b border-line/70 bg-paper/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
    >
      <ul className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${s.id}`);
                setActive(s.id);
              }}
              className={cn(
                "relative flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium transition",
                active === s.id
                  ? "text-ink-900 after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-leaf-400"
                  : "text-ink-400 hover:text-ink-700",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
