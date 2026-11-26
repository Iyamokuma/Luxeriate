import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SystemEventSource = "cron.reminders" | "paystack.webhook";

/**
 * Records a background run (the reminder job, a Paystack webhook) so the
 * back-office overview can show when it last ran and whether it worked.
 * Never throws: monitoring must not break the thing it monitors.
 */
export async function recordSystemEvent(
  source: SystemEventSource,
  status: "ok" | "error" | "skipped",
  summary: string,
  extra: { details?: Record<string, unknown>; startedAt?: number; durationMs?: number } = {},
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("system_events").insert({
      source,
      status,
      summary: summary.slice(0, 500),
      details: extra.details ?? null,
      duration_ms:
        extra.durationMs != null ? Math.round(extra.durationMs) : extra.startedAt ? Math.round(performance.now() - extra.startedAt) : null,
    });
    if (error) console.error("[system-events] could not record", source, error.message);
  } catch (err) {
    console.error("[system-events] could not record", source, err);
  }
}

/** Keeps the run log small: anything older than 90 days goes. */
export async function pruneSystemEvents() {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
    await admin.from("system_events").delete().lt("created_at", cutoff);
  } catch (err) {
    console.error("[system-events] prune failed", err);
  }
}
