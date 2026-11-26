"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { notifyFulfilment, notifySavingsPaid, type FulfilmentRow } from "@/lib/email/notify";

const STATUSES = ["preparing", "ready", "collection_scheduled", "collected"] as const;
type Status = (typeof STATUSES)[number];

export async function setFulfilment(ids: string[], status: Status, scheduledFor?: string, note?: string) {
  const auth = await authorize("fulfilment.manage");
  if (!auth.ok) return auth;
  if (!ids.length) return { ok: false as const, error: "Select at least one customer." };
  if (!STATUSES.includes(status)) return { ok: false as const, error: "Unknown status." };
  if (status === "collection_scheduled" && !scheduledFor) return { ok: false as const, error: "Choose the collection date and time." };

  const { data, error } = await auth.session.supabase.rpc("set_fulfilment_status", {
    p_enrollment_ids: ids,
    p_status: status,
    p_scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    p_note: note?.trim() || null,
  });
  if (error) return { ok: false as const, error: "We couldn't update those packages." };
  const rows = (data ?? []) as FulfilmentRow[];
  if (rows.length) after(() => notifyFulfilment(rows, status, note));
  refresh();
  return { ok: true as const, count: rows.length };
}

export async function markSavingsPaid(enrollmentId: string, reference: string, paidAt: string) {
  const auth = await authorize("savings.manage");
  if (!auth.ok) return auth;
  const { data, error } = await auth.session.supabase.rpc("mark_savings_return_paid", {
    p_enrollment_id: enrollmentId,
    p_reference: reference.trim() || null,
    p_paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message.includes("SAVINGS_NOT_PENDING") ? "This savings return was already marked as paid." : "We couldn't update it." };
  const r = data as Parameters<typeof notifySavingsPaid>[0];
  after(() => notifySavingsPaid(r));
  refresh();
  return { ok: true as const };
}
