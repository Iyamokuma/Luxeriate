"use server";

import { updateTag } from "next/cache";
import { refresh } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PACKAGE_THEMES } from "@/lib/constants";
import { fieldErrors } from "@/lib/validation";

const naira = z.coerce.number().min(0, "Can't be negative").max(100_000_000);

const packageSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Give the package a name").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  cycle_year: z.coerce.number().int().min(2024).max(2100),
  tagline: z.string().trim().max(140).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  badge: z.string().trim().max(24).optional().default(""),
  theme: z.enum(PACKAGE_THEMES),
  monthly_amount: naira.refine((v) => v >= 100, "Enter the monthly amount"),
  registration_fee: naira,
  savings_return: naira,
  duration_months: z.coerce.number().int().min(1).max(24),
  start_month: z.string().regex(/^\d{4}-\d{2}$/, "Choose the first contribution month"),
  due_day: z.coerce.number().int().min(1, "1–28").max(28, "1–28"),
  is_open: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Item name is required").max(80),
        quantity: z.coerce.number().positive("Quantity must be more than 0"),
        unit: z.string().trim().max(20).optional().default(""),
      }),
    )
    .min(1, "Add at least one food item"),
});

export type PackageInput = z.input<typeof packageSchema>;
export type SaveResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function savePackage(input: PackageInput): Promise<SaveResult> {
  const auth = await authorize("packages.manage");
  if (!auth.ok) return auth;
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) {
    const fe = fieldErrors(parsed.error);
    const itemIssue = parsed.error.issues.find((i) => i.path[0] === "items");
    return { ok: false, error: itemIssue?.message ?? "Please check the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  const db = auth.session.supabase;
  const row = {
    name: d.name,
    slug: d.slug,
    cycle_year: d.cycle_year,
    tagline: d.tagline || null,
    description: d.description || null,
    badge: d.badge || null,
    theme: d.theme,
    monthly_amount_kobo: Math.round(d.monthly_amount * 100),
    registration_fee_kobo: Math.round(d.registration_fee * 100),
    savings_return_kobo: Math.round(d.savings_return * 100),
    duration_months: d.duration_months,
    start_month: `${d.start_month}-01`,
    due_day: d.due_day,
    is_open: d.is_open,
    sort_order: d.sort_order,
  };

  let id = d.id;
  if (id) {
    const { error } = await db.from("packages").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "Another package this year already uses that web address." : "We couldn't save the package." };
    const { error: delErr } = await db.from("package_items").delete().eq("package_id", id);
    if (delErr) return { ok: false, error: "We couldn't update the food items." };
  } else {
    const { data, error } = await db.from("packages").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "Another package this year already uses that web address." : "We couldn't create the package." };
    id = data.id as string;
  }
  const { error: itemErr } = await db
    .from("package_items")
    .insert(d.items.map((it, i) => ({ package_id: id, name: it.name, quantity: it.quantity, unit: it.unit ?? "", sort_order: i + 1 })));
  if (itemErr) return { ok: false, error: "The package was saved but its items couldn't be. Please try again." };

  await logActivity(auth.session, d.id ? "package.update" : "package.create", `${d.id ? "Updated" : "Created"} the ${d.name} ${d.cycle_year} package`, { type: "package", id: id! }, {
    monthly: d.monthly_amount,
    items: d.items.length,
    is_open: d.is_open,
  });
  updateTag("packages");
  return { ok: true, id: id! };
}

export async function setPackageOpen(id: string, open: boolean) {
  const auth = await authorize("packages.manage");
  if (!auth.ok) return auth;
  const { data, error } = await auth.session.supabase.from("packages").update({ is_open: open }).eq("id", id).select("name, cycle_year").single();
  if (error || !data) return { ok: false as const, error: "We couldn't update the package." };
  await logActivity(auth.session, "package.toggle", `${open ? "Opened" : "Closed"} sign-ups for ${data.name} ${data.cycle_year}`, { type: "package", id });
  updateTag("packages");
  refresh();
  return { ok: true as const };
}

export async function deletePackage(id: string) {
  const auth = await authorize("packages.manage");
  if (!auth.ok) return auth;
  const { count } = await auth.session.supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("package_id", id);
  if (count) return { ok: false as const, error: "Customers have registered for this package, so it can't be deleted. Close sign-ups instead." };
  const { data, error } = await auth.session.supabase.from("packages").delete().eq("id", id).select("name, cycle_year").single();
  if (error || !data) return { ok: false as const, error: "We couldn't delete the package." };
  await logActivity(auth.session, "package.delete", `Deleted the ${data.name} ${data.cycle_year} package`, { type: "package", id });
  updateTag("packages");
  return { ok: true as const };
}

/** Copy a whole cycle's packages to the next year (closed until you open them). */
export async function duplicateCycle(fromYear: number, toYear: number) {
  const auth = await authorize("packages.manage");
  if (!auth.ok) return auth;
  const db = auth.session.supabase;
  const { count: existing } = await db.from("packages").select("id", { count: "exact", head: true }).eq("cycle_year", toYear);
  if (existing) return { ok: false as const, error: `There are already packages for ${toYear}.` };
  const { data: pkgs, error } = await db.from("packages").select("*, package_items(*)").eq("cycle_year", fromYear);
  if (error || !pkgs?.length) return { ok: false as const, error: `No packages found for ${fromYear}.` };
  const shift = toYear - fromYear;
  for (const p of pkgs) {
    const start = new Date(p.start_month + "T12:00:00Z");
    start.setUTCFullYear(start.getUTCFullYear() + shift);
    const { data: created, error: insErr } = await db
      .from("packages")
      .insert({
        cycle_year: toYear,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        badge: p.badge,
        theme: p.theme,
        monthly_amount_kobo: p.monthly_amount_kobo,
        registration_fee_kobo: p.registration_fee_kobo,
        savings_return_kobo: p.savings_return_kobo,
        duration_months: p.duration_months,
        start_month: start.toISOString().slice(0, 10),
        due_day: p.due_day,
        is_open: false,
        sort_order: p.sort_order,
      })
      .select("id")
      .single();
    if (insErr || !created) return { ok: false as const, error: "Copying stopped part-way. Please check the packages list." };
    const items = (p.package_items as { name: string; quantity: number; unit: string; sort_order: number }[]) ?? [];
    if (items.length)
      await db.from("package_items").insert(items.map((it) => ({ package_id: created.id, name: it.name, quantity: it.quantity, unit: it.unit, sort_order: it.sort_order })));
  }
  await logActivity(auth.session, "package.duplicate", `Copied ${pkgs.length} packages from ${fromYear} to ${toYear}`, { type: "cycle", id: String(toYear) });
  updateTag("packages");
  return { ok: true as const, count: pkgs.length };
}
