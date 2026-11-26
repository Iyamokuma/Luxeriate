"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccountLink } from "@/lib/email/notify";
import { env } from "@/lib/env";
import { homeFor } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null);

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1) })
    .safeParse({ email: String(formData.get("email") ?? "").trim().toLowerCase(), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "That email and password don't match our records." };

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).single();
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Please contact the owner." };
  }
  redirect(safeNext(formData.get("next")) ?? homeFor(profile));
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address." };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (!error && data?.properties?.hashed_token) {
      const url = `${env.siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`;
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      await sendAccountLink("password_reset", email, profile?.full_name ?? "", url);
    }
  } catch (err) {
    console.error("[auth] reset link failed", err);
  }
  // Same answer whether or not the account exists
  return { ok: true, message: "If an account exists for that email, a reset link is on its way. It expires in one hour." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Choose a password you haven't used before." : "We couldn't update your password. Please try again." };
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  redirect(`${homeFor(profile)}?password=updated`);
}
