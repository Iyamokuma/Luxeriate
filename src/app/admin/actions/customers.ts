"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyPaymentResult } from "@/lib/email/notify";
import { fieldErrors, normalisePhone, profileUpdateSchema } from "@/lib/validation";
import type { FinalizeResult } from "@/types/db";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateCustomer(userId: string, values: Record<string, string>): Promise<ActionResult> {
  const auth = await authorize("customers.edit");
  if (!auth.ok) return auth;
  const parsed = profileUpdateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const { data, error } = await auth.session.supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      phone: normalisePhone(d.phone),
      whatsapp: normalisePhone(d.whatsapp),
      address: d.address,
      state: d.state,
      lga: d.lga,
      emergency_contact_name: d.emergency_contact_name,
      emergency_contact_phone: normalisePhone(d.emergency_contact_phone),
    })
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "We couldn't save those changes." };
  await logActivity(auth.session, "customer.update", `Updated contact details for ${d.full_name}`, { type: "profile", id: userId });
  refresh();
  return { ok: true, message: "Customer details saved." };
}

export async function changeCollectionPoint(enrollmentId: string, pointId: string): Promise<ActionResult> {
  const auth = await authorize("customers.edit");
  if (!auth.ok) return auth;
  const { data, error } = await auth.session.supabase.from("enrollments").update({ collection_point_id: pointId }).eq("id", enrollmentId).select("id, customer_code");
  if (error || !data?.length) return { ok: false, error: "We couldn't change the collection point." };
  await logActivity(auth.session, "enrollment.collection_point", `Changed collection point for ${data[0].customer_code ?? "customer"}`, { type: "enrollment", id: enrollmentId }, { collection_point_id: pointId });
  refresh();
  return { ok: true, message: "Collection point updated." };
}

export async function recordOfflinePayment(enrollmentId: string, months: number, note: string, paidAt: string): Promise<ActionResult> {
  const auth = await authorize("payments.record");
  if (!auth.ok) return auth;
  if (!note.trim()) return { ok: false, error: "Add a note explaining how the money was received.", fieldErrors: { note: "Required" } };
  const { data, error } = await auth.session.supabase.rpc("record_manual_payment", {
    p_enrollment_id: enrollmentId,
    p_months: months,
    p_note: note.trim(),
    p_paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
  });
  if (error) {
    const msg = error.message.includes("ENROLLMENT_CLOSED")
      ? "This package is already fully paid or cancelled."
      : error.message.includes("NOTHING_DUE")
        ? "There's nothing left to pay."
        : "We couldn't record that payment.";
    return { ok: false, error: msg };
  }
  const r = data as FinalizeResult;
  after(() => notifyPaymentResult(r));
  refresh();
  return { ok: true, message: `Recorded. Receipt ${r.receipt_number} sent to the customer.` };
}

export async function cancelEnrollment(enrollmentId: string, reason: string): Promise<ActionResult> {
  const auth = await authorize("customers.cancel");
  if (!auth.ok) return auth;
  if (reason.trim().length < 3) return { ok: false, error: "Please give a reason.", fieldErrors: { reason: "Required" } };
  const { error } = await auth.session.supabase.rpc("cancel_enrollment", { p_enrollment_id: enrollmentId, p_reason: reason.trim() });
  if (error) return { ok: false, error: "This enrollment can't be cancelled." };
  refresh();
  return { ok: true, message: "Enrollment cancelled." };
}
