"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccountLink } from "@/lib/email/notify";
import { PERMISSIONS, type Permission } from "@/lib/constants";
import { env } from "@/lib/env";

const KEYS = PERMISSIONS.map((p) => p.key) as [Permission, ...Permission[]];
const inviteSchema = z.object({
  full_name: z.string().trim().min(2, "Enter their name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  permissions: z.array(z.enum(KEYS)).min(1, "Choose at least one permission"),
});

async function sendInvite(email: string, name: string, inviter: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: name } } });
  if (error || !data?.properties?.hashed_token) {
    // Already-registered users get a password-setup (recovery) link instead
    const rec = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (rec.error || !rec.data?.properties?.hashed_token) return { ok: false as const, error: rec.error?.message ?? error?.message ?? "Could not create the invite." };
    const url = `${env.siteUrl}/auth/confirm?token_hash=${rec.data.properties.hashed_token}&type=recovery&next=/reset-password`;
    await sendAccountLink("staff_invite", email, name, url, inviter);
    return { ok: true as const, userId: rec.data.user.id };
  }
  const url = `${env.siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=invite&next=/reset-password`;
  await sendAccountLink("staff_invite", email, name, url, inviter);
  return { ok: true as const, userId: data.user.id };
}

export async function inviteStaff(input: z.input<typeof inviteSchema>) {
  const auth = await authorize("staff.manage");
  if (!auth.ok) return auth;
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id, role").ilike("email", d.email).maybeSingle();
  if (existing?.role === "customer") {
    const { count } = await admin.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", existing.id);
    if (count) return { ok: false as const, error: "That email belongs to a customer. Use a separate email for staff access." };
  }
  if (existing && existing.role !== "customer") return { ok: false as const, error: "That person already has staff access." };

  const sent = await sendInvite(d.email, d.full_name, auth.session.profile.full_name);
  if (!sent.ok) return sent;
  const { error } = await admin
    .from("profiles")
    .update({ role: "staff", permissions: d.permissions, full_name: d.full_name, is_active: true })
    .eq("id", sent.userId);
  if (error) return { ok: false as const, error: "Invite sent, but permissions couldn't be saved. Edit them below." };
  await logActivity(auth.session, "staff.invite", `Invited ${d.full_name} (${d.email}) as staff`, { type: "profile", id: sent.userId }, { permissions: d.permissions });
  refresh();
  return { ok: true as const };
}

export async function updateStaff(userId: string, permissions: Permission[], isActive: boolean) {
  const auth = await authorize("staff.manage");
  if (!auth.ok) return auth;
  if (userId === auth.session.userId) return { ok: false as const, error: "You can't change your own access." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role, full_name").eq("id", userId).single();
  if (!target || target.role === "customer") return { ok: false as const, error: "Staff member not found." };
  if (target.role === "owner") return { ok: false as const, error: "Owner accounts always have full access." };
  const clean = permissions.filter((p) => KEYS.includes(p));
  const { error } = await admin.from("profiles").update({ permissions: clean, is_active: isActive }).eq("id", userId);
  if (error) return { ok: false as const, error: "We couldn't save those changes." };
  await logActivity(auth.session, "staff.update", `${isActive ? "Updated access for" : "Deactivated"} ${target.full_name}`, { type: "profile", id: userId }, { permissions: clean, is_active: isActive });
  refresh();
  return { ok: true as const };
}

export async function resendInvite(userId: string) {
  const auth = await authorize("staff.manage");
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("email, full_name, role").eq("id", userId).single();
  if (!p || p.role === "customer") return { ok: false as const, error: "Staff member not found." };
  const r = await sendInvite(p.email, p.full_name, auth.session.profile.full_name);
  return r.ok ? { ok: true as const } : r;
}
