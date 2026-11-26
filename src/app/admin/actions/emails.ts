"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { renderEmail, sendBroadcast } from "@/lib/email/notify";
import { sendEmail } from "@/lib/email/send";
import { SAMPLE_VARS } from "@/lib/email/samples";
import { env } from "@/lib/env";

const templateSchema = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(200),
  body: z.string().trim().min(10, "Add the message").max(10_000),
  is_enabled: z.boolean(),
});

export async function saveTemplate(key: string, input: z.input<typeof templateSchema>) {
  const auth = await authorize("emails.manage");
  if (!auth.ok) return auth;
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the template." };
  const { data, error } = await auth.session.supabase
    .from("email_templates")
    .update({ ...parsed.data, updated_by: auth.session.userId })
    .eq("key", key)
    .select("name")
    .single();
  if (error || !data) return { ok: false as const, error: "We couldn't save the template." };
  await logActivity(auth.session, "email.template", `Edited the "${data.name}" email`, { type: "email_template", id: key });
  refresh();
  return { ok: true as const };
}

export async function toggleTemplate(key: string, enabled: boolean) {
  const auth = await authorize("emails.manage");
  if (!auth.ok) return auth;
  const { data, error } = await auth.session.supabase.from("email_templates").update({ is_enabled: enabled }).eq("key", key).select("name").single();
  if (error || !data) return { ok: false as const, error: "We couldn't update the template." };
  await logActivity(auth.session, "email.toggle", `${enabled ? "Turned on" : "Turned off"} the "${data.name}" email`, { type: "email_template", id: key });
  return { ok: true as const };
}

export async function sendTestEmail(subject: string, body: string) {
  const auth = await authorize("emails.manage");
  if (!auth.ok) return auth;
  const { data: s } = await auth.session.supabase.from("app_settings").select("business_name").eq("id", 1).single();
  const vars = { ...SAMPLE_VARS, site_url: env.siteUrl, dashboard_url: `${env.siteUrl}/dashboard`, pay_url: `${env.siteUrl}/dashboard?pay=1`, receipt_url: `${env.siteUrl}/dashboard/payments`, action_url: `${env.siteUrl}/login` };
  const rendered = await renderEmail({ subject: `[Test] ${subject}`, body }, vars, s?.business_name ?? "Luxuriate Foodstuff");
  const r = await sendEmail({ to: auth.session.email, ...rendered });
  return r.ok ? { ok: true as const, to: auth.session.email } : { ok: false as const, error: `Sending failed: ${r.error}` };
}

const audienceSchema = z.object({
  year: z.number().int(),
  packageId: z.string().optional(),
  status: z.enum(["active", "completed", "pending_payment", "late", "all"]),
});

async function recipientsFor(auth: Extract<Awaited<ReturnType<typeof authorize>>, { ok: true }>, a: z.infer<typeof audienceSchema>) {
  let q = auth.session.supabase
    .from("enrollment_overview")
    .select("id, user_id, email, full_name, customer_code, package_name")
    .eq("cycle_year", a.year)
    .neq("status", "cancelled");
  if (a.packageId) q = q.eq("package_id", a.packageId);
  if (a.status === "late") q = q.eq("status", "active").gt("late_count", 0);
  else if (a.status !== "all") q = q.eq("status", a.status);
  const { data } = await q.limit(5000);
  return data ?? [];
}

export async function countRecipients(input: z.input<typeof audienceSchema>) {
  const auth = await authorize("emails.manage");
  if (!auth.ok) return 0;
  const a = audienceSchema.safeParse(input);
  if (!a.success) return 0;
  return (await recipientsFor(auth, a.data)).length;
}

export async function sendBroadcastAction(input: z.input<typeof audienceSchema> & { subject: string; body: string }) {
  const auth = await authorize("emails.manage");
  if (!auth.ok) return auth;
  const a = audienceSchema.safeParse(input);
  if (!a.success) return { ok: false as const, error: "Choose who to send to." };
  if (input.subject.trim().length < 3 || input.body.trim().length < 10) return { ok: false as const, error: "Add a subject and a message." };
  const list = await recipientsFor(auth, a.data);
  if (!list.length) return { ok: false as const, error: "Nobody matches that audience." };
  const id = crypto.randomUUID();
  const recipients = list.map((r) => ({ email: r.email, full_name: r.full_name, user_id: r.user_id, enrollment_id: r.id, customer_code: r.customer_code, package_name: r.package_name }));
  after(async () => {
    const result = await sendBroadcast(recipients, input.subject.trim(), input.body.trim(), id);
    console.info(`[broadcast ${id}] sent ${result.sent}, failed ${result.failed}`);
  });
  await logActivity(auth.session, "email.broadcast", `Sent "${input.subject.trim()}" to ${list.length} customers`, { type: "broadcast", id }, { audience: a.data });
  return { ok: true as const, count: list.length };
}
