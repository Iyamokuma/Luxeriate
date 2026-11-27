"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

/** Refreshes the page when payments or enrollments change, so figures update on their own. */
export function LiveRefresh({
  tables = ["payments", "enrollments"],
  dark,
  every,
}: {
  tables?: string[];
  dark?: boolean;
  /** Also refresh on a timer (ms) while the tab is visible, for figures that come from outside the database. */
  every?: number;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient("team");
    const channel = supabase.channel("admin-live");
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 800);
      });
    }
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));
    const tick = every
      ? setInterval(() => {
          if (document.visibilityState === "visible") router.refresh();
        }, every)
      : null;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (tick) clearInterval(tick);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <span
      className={
        dark
          ? "inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-ink-200 ring-1 ring-inset ring-white/10"
          : "inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1 text-xs font-semibold text-ink-500"
      }
      title={live ? "Updates automatically" : "Connecting…"}
    >
      <span className="relative flex size-2">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-forest-400 opacity-70" />}
        <span className={live ? "relative size-2 rounded-full bg-forest-400" : "relative size-2 rounded-full bg-ink-400"} />
      </span>
      {live ? "Live" : "Offline"}
    </span>
  );
}
