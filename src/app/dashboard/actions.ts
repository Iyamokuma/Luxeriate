"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/auth";
import { startPayment, type StartPaymentResult } from "@/lib/payments";
import { fieldErrors, normalisePhone, profileUpdateSchema } from "@/lib/validation";

export async function startPaymentAction(enrollmentId: string, months: number): Promise<StartPaymentResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in again." };
  return startPayment({ enrollmentId, userId: session.userId, months });
}

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const parsed = profileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const { error } = await session.supabase
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
    .eq("id", session.userId);
  if (error) return { error: "We couldn't save your changes. Please try again." };
  refresh();
  return { ok: true };
}

export async function changePassword(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters" } };
  if (password !== confirm) return { fieldErrors: { confirm: "The passwords don't match" } };
  const { error: signInError } = await session.supabase.auth.signInWithPassword({ email: session.email, password: current });
  if (signInError) return { fieldErrors: { current: "That's not your current password" } };
  const { error } = await session.supabase.auth.updateUser({ password });
  if (error) return { error: "We couldn't change your password. Please try again." };
  return { ok: true };
}
