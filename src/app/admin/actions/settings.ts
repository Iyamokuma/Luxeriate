"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const settingsSchema = z.object({
  business_name: z.string().trim().min(2).max(80),
  support_email: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"))]),
  support_phone: z.string().trim().max(30),
  whatsapp_number: z.string().trim().max(30),
  office_address: z.string().trim().max(200),
  reminder_days_before: z.coerce.number().int().min(0).max(14),
  late_grace_days: z.coerce.number().int().min(0).max(60),
  send_overdue_notices: z.boolean(),
});

export async function saveSettings(input: z.input<typeof settingsSchema>) {
  const auth = await authorize("settings.manage");
  if (!auth.ok) return auth;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const { error } = await auth.session.supabase
    .from("app_settings")
    .update({
      ...d,
      support_email: d.support_email || null,
      support_phone: d.support_phone || null,
      whatsapp_number: d.whatsapp_number || null,
      office_address: d.office_address || null,
    })
    .eq("id", 1);
  if (error) return { ok: false as const, error: "We couldn't save the settings." };
  await logActivity(auth.session, "settings.update", "Updated business settings", { type: "settings", id: "1" }, d);
  updateTag("settings");
  return { ok: true as const };
}

export async function saveTerms(content: string) {
  const auth = await authorize("settings.manage");
  if (!auth.ok) return auth;
  if (content.length > 50_000) return { ok: false as const, error: "That's too long." };
  const { error } = await auth.session.supabase.from("app_settings").update({ terms_content: content, terms_updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { ok: false as const, error: "We couldn't save the terms." };
  await logActivity(auth.session, "settings.terms", "Updated the terms and conditions", { type: "settings", id: "terms" });
  updateTag("settings");
  return { ok: true as const };
}

const pointSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name the collection point").max(80),
  address: z.string().trim().min(4, "Add the address").max(200),
  state: z.string().trim().max(40),
  phone: z.string().trim().max(30),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveCollectionPoint(input: z.input<typeof pointSchema>) {
  const auth = await authorize("settings.manage");
  if (!auth.ok) return auth;
  const parsed = pointSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { id, ...row } = parsed.data;
  const payload = { ...row, state: row.state || null, phone: row.phone || null };
  const res = id
    ? await auth.session.supabase.from("collection_points").update(payload).eq("id", id).select("id").single()
    : await auth.session.supabase.from("collection_points").insert(payload).select("id").single();
  if (res.error) return { ok: false as const, error: "We couldn't save the collection point." };
  await logActivity(auth.session, "settings.collection_point", `${id ? "Updated" : "Added"} collection point ${row.name}`, { type: "collection_point", id: res.data.id });
  updateTag("collection-points");
  refresh();
  return { ok: true as const };
}
