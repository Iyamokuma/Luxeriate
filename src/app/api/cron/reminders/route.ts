import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendReminder, type ReminderCandidate } from "@/lib/email/notify";
import { pruneSystemEvents, recordSystemEvent } from "@/lib/system-events";

/**
 * Daily job: reminder emails a few days before each due date, plus one
 * overdue notice when the grace period ends. Safe to run more than once a
 * day; every email is de-duplicated. Each run is logged to system_events so
 * the back-office overview can show when it last ran.
 *
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const startedAt = performance.now();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reminder_candidates");
  if (error) {
    console.error("[cron] reminder_candidates failed", error);
    await recordSystemEvent("cron.reminders", "error", `Could not list reminders: ${error.message}`, { startedAt });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const candidates = (data ?? []) as ReminderCandidate[];
  let sent = 0;
  let failed = 0;
  for (const c of candidates) {
    const r = await sendReminder(c);
    if (!r.ok) failed++;
    else if (!("skipped" in r && r.skipped)) sent++;
  }
  const summary = candidates.length
    ? `${sent} sent${failed ? `, ${failed} failed` : ""} of ${candidates.length} due`
    : "Nothing due today";
  await recordSystemEvent("cron.reminders", failed ? "error" : "ok", summary, {
    startedAt,
    details: { candidates: candidates.length, sent, failed },
  });
  await pruneSystemEvents();
  return Response.json({ ok: true, candidates: candidates.length, sent, failed });
}
