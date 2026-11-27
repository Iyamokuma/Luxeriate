"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardPaste, Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PackageCard } from "@/components/marketing/package-card";
import { PACKAGE_THEMES, THEME_STYLES, type PackageTheme } from "@/lib/constants";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deletePackage, savePackage } from "@/app/admin/actions/packages";
import type { PackageWithItems } from "@/types/db";

type Item = { key: string; name: string; quantity: string; unit: string };

const UNITS = ["kg", "litres", "packs", "tins", "cartons", "tubers", "bags", "bottles", "crates", "pieces", "sachets"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

let keySeq = 0;
const k = () => `i${++keySeq}`;

export function PackageEditor({ pkg, year, customers }: { pkg?: PackageWithItems; year: number; customers: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(pkg));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [f, setF] = useState({
    name: pkg?.name ?? "",
    slug: pkg?.slug ?? "",
    cycle_year: String(pkg?.cycle_year ?? year),
    tagline: pkg?.tagline ?? "",
    description: pkg?.description ?? "",
    badge: pkg?.badge ?? "",
    theme: (pkg?.theme ?? "oat") as PackageTheme,
    monthly_amount: pkg ? String(pkg.monthly_amount_kobo / 100) : "",
    registration_fee: pkg ? String(pkg.registration_fee_kobo / 100) : "3000",
    savings_return: pkg ? String(pkg.savings_return_kobo / 100) : "0",
    duration_months: String(pkg?.duration_months ?? 12),
    start_month: pkg?.start_month.slice(0, 7) ?? `${year}-01`,
    due_day: String(pkg?.due_day ?? 28),
    is_open: pkg?.is_open ?? false,
    sort_order: String(pkg?.sort_order ?? 0),
  });
  const [items, setItems] = useState<Item[]>(
    pkg?.package_items.map((i) => ({ key: k(), name: i.name, quantity: String(Number(i.quantity)), unit: i.unit })) ?? [{ key: k(), name: "", quantity: "", unit: "kg" }],
  );

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => {
    setF((p) => {
      const next = { ...p, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const preview = useMemo<PackageWithItems>(
    () => ({
      id: pkg?.id ?? "preview",
      cycle_year: Number(f.cycle_year),
      slug: f.slug || "preview",
      name: f.name || "Package name",
      tagline: f.tagline || null,
      description: f.description || null,
      badge: f.badge || null,
      theme: f.theme,
      monthly_amount_kobo: Math.round(Number(f.monthly_amount || 0) * 100),
      registration_fee_kobo: Math.round(Number(f.registration_fee || 0) * 100),
      savings_return_kobo: Math.round(Number(f.savings_return || 0) * 100),
      duration_months: Number(f.duration_months || 12),
      start_month: `${f.start_month}-01`,
      due_day: Number(f.due_day || 28),
      is_open: f.is_open,
      sort_order: Number(f.sort_order || 0),
      created_at: "",
      updated_at: "",
      package_items: items
        .filter((i) => i.name && Number(i.quantity) > 0)
        .map((i, idx) => ({ id: i.key, package_id: "preview", name: i.name, quantity: Number(i.quantity), unit: i.unit, sort_order: idx })),
    }),
    [f, items, pkg?.id],
  );

  const move = (i: number, d: -1 | 1) =>
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const applyPaste = () => {
    const parsed = paste
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/[,\t|]/).map((p) => p.trim());
        if (parts.length >= 2) return { key: k(), name: parts[0], quantity: parts[1].replace(/[^\d.]/g, ""), unit: parts[2] ?? "" };
        const m = l.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
        return m ? { key: k(), name: m[1], quantity: m[2], unit: m[3] ?? "" } : { key: k(), name: l, quantity: "1", unit: "" };
      });
    if (!parsed.length) return;
    setItems((list) => [...list.filter((i) => i.name.trim()), ...parsed]);
    setPaste("");
    setPasteOpen(false);
    toast.success(`Added ${parsed.length} item${parsed.length === 1 ? "" : "s"}`);
  };

  const save = () =>
    start(async () => {
      const r = await savePackage({
        id: pkg?.id,
        ...f,
        items: items.filter((i) => i.name.trim() || i.quantity).map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
      });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(pkg ? "Package saved" : "Package created");
      router.push(`/admin/packages?year=${f.cycle_year}`);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const r = await deletePackage(pkg!.id);
      if (!r.ok) {
        toast.error(r.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Package deleted");
      router.push(`/admin/packages?year=${f.cycle_year}`);
    });

  return (
    <div className="space-y-6 pb-24">
      <Link href={`/admin/packages?year=${f.cycle_year}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Packages
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-ink-900">{pkg ? `Edit ${pkg.name}` : "New package"}</h1>
          <p className="mt-1 text-ink-500">{pkg ? `${pkg.cycle_year} cycle` : `For the ${f.cycle_year} cycle`}</p>
        </div>
      </div>

      {pkg && customers > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-ember-200 bg-ember-50 px-5 py-4 text-sm text-ember-700">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">{customers} customer{customers === 1 ? " is" : "s are"} on this package.</span> Price, fee and savings changes
            apply to new sign-ups only; existing customers keep the amounts they signed up with. Food item changes update everyone&apos;s procurement list.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Package name" htmlFor="name" error={errors.name}>
                <Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Diamond Pro" />
              </Field>
              <Field label="Web address" htmlFor="slug" error={errors.slug} hint={`/packages/${f.slug || "…"}`}>
                <Input
                  id="slug"
                  value={f.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </Field>
              <Field label="Tagline" htmlFor="tagline" error={errors.tagline} className="sm:col-span-2" optional>
                <Input id="tagline" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Everything in Diamond, with a full bag of beans." />
              </Field>
              <Field label="Description" htmlFor="description" className="sm:col-span-2" optional>
                <Textarea id="description" value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing and schedule</CardTitle>
              <p className="text-sm text-ink-500">Amounts in naira.</p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <Field label="Monthly amount" htmlFor="monthly_amount" error={errors.monthly_amount}>
                <Input id="monthly_amount" inputMode="numeric" prefix="₦" value={f.monthly_amount} onChange={(e) => set("monthly_amount", e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Registration fee" htmlFor="registration_fee" error={errors.registration_fee}>
                <Input id="registration_fee" inputMode="numeric" prefix="₦" value={f.registration_fee} onChange={(e) => set("registration_fee", e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Savings return" htmlFor="savings_return" error={errors.savings_return} hint="0 if none">
                <Input id="savings_return" inputMode="numeric" prefix="₦" value={f.savings_return} onChange={(e) => set("savings_return", e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="First contribution month" htmlFor="start_month" error={errors.start_month}>
                <Input id="start_month" type="month" value={f.start_month} onChange={(e) => set("start_month", e.target.value)} />
              </Field>
              <Field label="Number of months" htmlFor="duration_months" error={errors.duration_months}>
                <Input id="duration_months" type="number" min={1} max={24} value={f.duration_months} onChange={(e) => set("duration_months", e.target.value)} />
              </Field>
              <Field label="Due day of month" htmlFor="due_day" error={errors.due_day} hint="1 to 28">
                <Input id="due_day" type="number" min={1} max={28} value={f.due_day} onChange={(e) => set("due_day", e.target.value)} />
              </Field>
              <div className="rounded-2xl bg-sand/70 px-4 py-3 text-sm text-ink-600 sm:col-span-3">
                Customers pay <span className="tnum font-semibold text-ink-900">{naira(preview.registration_fee_kobo + preview.monthly_amount_kobo)}</span> at
                sign-up, then <span className="tnum font-semibold text-ink-900">{naira(preview.monthly_amount_kobo)}</span> a month.{" "}
                <span className="tnum font-semibold text-ink-900">{naira(preview.monthly_amount_kobo * preview.duration_months)}</span> in contributions over{" "}
                {preview.duration_months} months.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Food items</CardTitle>
                <p className="text-sm text-ink-500">Use the same name and unit across packages so procurement adds them up correctly.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setPasteOpen(true)}>
                <ClipboardPaste /> Paste a list
              </Button>
            </CardHeader>
            <CardContent>
              {errors.items && <p className="mb-3 text-sm font-medium text-danger-600">{errors.items}</p>}
              <datalist id="units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              <div className="hidden grid-cols-[1fr_6rem_7rem_6.5rem] gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-400 sm:grid">
                <span>Item</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span />
              </div>
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={it.key} className="grid grid-cols-[1fr_5rem_5.5rem] gap-2 rounded-2xl bg-sand/40 p-2 sm:grid-cols-[1fr_6rem_7rem_6.5rem] sm:bg-transparent sm:p-0">
                    <Input
                      aria-label="Item name"
                      value={it.name}
                      placeholder="Rice (parboiled)"
                      className="col-span-3 h-10 sm:col-span-1"
                      onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, name: e.target.value } : x)))}
                    />
                    <Input
                      aria-label="Quantity"
                      inputMode="decimal"
                      value={it.quantity}
                      placeholder="50"
                      className="h-10"
                      onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, quantity: e.target.value.replace(/[^\d.]/g, "") } : x)))}
                    />
                    <Input
                      aria-label="Unit"
                      list="units"
                      value={it.unit}
                      placeholder="kg"
                      className="h-10"
                      onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, unit: e.target.value } : x)))}
                    />
                    <div className="col-span-3 flex justify-end gap-0.5 sm:col-span-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">
                        <ArrowDown />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))} aria-label="Remove item">
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setItems((l) => [...l, { key: k(), name: "", quantity: "", unit: "" }])}>
                <Plus /> Add item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance and availability</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Card colour" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {PACKAGE_THEMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("theme", t)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition",
                        f.theme === t ? "border-forest-600 ring-4 ring-forest-500/10" : "border-line-strong hover:border-ink-300",
                      )}
                    >
                      <span className={cn("size-6 rounded-full border border-black/5", THEME_STYLES[t].card)} />
                      {THEME_STYLES[t].label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Badge" htmlFor="badge" optional hint="e.g. Most popular">
                <Input id="badge" value={f.badge} onChange={(e) => set("badge", e.target.value)} />
              </Field>
              <Field label="Display order" htmlFor="sort_order" hint="Lower numbers appear first">
                <Input id="sort_order" type="number" value={f.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
              </Field>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 sm:col-span-2">
                <span>
                  <span className="block font-semibold text-ink-900">Open for sign-up</span>
                  <span className="block text-sm text-ink-500">When closed, the package stays visible but nobody new can join.</span>
                </span>
                <Switch checked={f.is_open} onCheckedChange={(v) => set("is_open", v)} />
              </label>
            </CardContent>
          </Card>

          {pkg && (
            <div className="flex justify-start">
              <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete package
              </Button>
            </div>
          )}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-3">
            <p className="eyebrow text-ink-400">Live preview</p>
            <div className="pointer-events-none">
              <PackageCard pkg={preview} />
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream/95 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-[90rem] items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <Button asChild variant="ghost">
            <Link href={`/admin/packages?year=${f.cycle_year}`}>Cancel</Link>
          </Button>
          <Button onClick={save} loading={pending}>
            {pkg ? "Save changes" : "Create package"}
          </Button>
        </div>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste food items</DialogTitle>
            <DialogDescription>One item per line as name, quantity, unit. You can paste straight from a spreadsheet.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Rice (parboiled), 50, kg\nVegetable oil, 25, litres\nTomato paste, 48, tins"} className="font-mono text-sm" />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyPaste}>Add items</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete {pkg?.name}?</DialogTitle>
            <DialogDescription>This removes the package and its items. Packages that customers have joined can&apos;t be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
