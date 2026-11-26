"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, MapPin, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
import { STATES } from "@/lib/data/nigeria";
import { saveCollectionPoint, saveSettings, saveTerms } from "@/app/admin/actions/settings";
import type { AppSettings, CollectionPoint } from "@/types/db";

type Integrations = {
  paystack: "live" | "test" | "simulated" | "missing";
  webhookUrl: string;
  email: string;
  emailFrom: string;
  cron: boolean;
  dva: boolean;
  siteUrl: string;
};

export function SettingsForms({ settings, points, integrations }: { settings: AppSettings; points: CollectionPoint[]; integrations: Integrations }) {
  return (
    <Tabs defaultValue="business" className="space-y-6">
      <TabsList className="flex w-full overflow-x-auto sm:w-fit">
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="points">Collection points</TabsTrigger>
        <TabsTrigger value="terms">Terms</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>
      <TabsContent value="business">
        <BusinessForm settings={settings} />
      </TabsContent>
      <TabsContent value="points">
        <Points points={points} />
      </TabsContent>
      <TabsContent value="terms">
        <TermsForm initial={settings.terms_content} />
      </TabsContent>
      <TabsContent value="integrations">
        <IntegrationStatus i={integrations} />
      </TabsContent>
    </Tabs>
  );
}

function BusinessForm({ settings }: { settings: AppSettings }) {
  const [v, setV] = useState({
    business_name: settings.business_name,
    support_email: settings.support_email ?? "",
    support_phone: settings.support_phone ?? "",
    whatsapp_number: settings.whatsapp_number ?? "",
    office_address: settings.office_address ?? "",
    reminder_days_before: String(settings.reminder_days_before),
    late_grace_days: String(settings.late_grace_days),
    send_overdue_notices: settings.send_overdue_notices,
  });
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <p className="text-sm text-ink-500">Shown on the website footer, emails and receipts.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" className="sm:col-span-2">
            <Input value={v.business_name} onChange={set("business_name")} />
          </Field>
          <Field label="Support email" hint="Customers' replies go here">
            <Input type="email" value={v.support_email} onChange={set("support_email")} />
          </Field>
          <Field label="Phone">
            <Input value={v.support_phone} onChange={set("support_phone")} />
          </Field>
          <Field label="WhatsApp number">
            <Input value={v.whatsapp_number} onChange={set("whatsapp_number")} />
          </Field>
          <Field label="Office address">
            <Input value={v.office_address} onChange={set("office_address")} />
          </Field>
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
          <p className="text-sm text-ink-500">Sent automatically every morning.</p>
        </CardHeader>
        <CardContent className="grid flex-1 gap-4 sm:grid-cols-2">
          <Field label="Remind customers" hint="Days before each due date">
            <Input type="number" min={0} max={14} value={v.reminder_days_before} onChange={set("reminder_days_before")} />
          </Field>
          <Field label="Grace period" hint="Days after the due date before a month counts as late">
            <Input type="number" min={0} max={60} value={v.late_grace_days} onChange={set("late_grace_days")} />
          </Field>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 sm:col-span-2">
            <span>
              <span className="block font-semibold text-ink-900">Send an overdue notice</span>
              <span className="block text-sm text-ink-500">One email on the day the grace period ends.</span>
            </span>
            <Switch checked={v.send_overdue_notices} onCheckedChange={(c) => setV((p) => ({ ...p, send_overdue_notices: c }))} />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await saveSettings(v);
                if (r.ok) toast.success("Settings saved");
                else toast.error(r.error);
              })
            }
          >
            Save settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Points({ points }: { points: CollectionPoint[] }) {
  const [editing, setEditing] = useState<Partial<CollectionPoint> | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Collection points</CardTitle>
          <p className="text-sm text-ink-500">Where customers pick up their packages. Inactive points stay on existing records but can&apos;t be chosen.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ is_active: true, sort_order: points.length + 1 })}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="divide-y divide-line border-t border-line">
          {points.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <MapPin className="size-4 shrink-0 text-clay-500" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{p.name}</p>
                <p className="truncate text-sm text-ink-500">
                  {p.address}
                  {p.state ? `, ${p.state}` : ""}
                </p>
              </div>
              {!p.is_active && <Badge size="sm">Inactive</Badge>}
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit collection point" : "New collection point"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <DialogBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2">
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Lekki Hub" />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </Field>
              <Field label="State">
                <NativeSelect value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })}>
                  <option value="">Select state</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Phone" optional>
                <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="Display order">
                <Input type="number" value={String(editing.sort_order ?? 0)} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium text-ink-700">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(c) => setEditing({ ...editing, is_active: c })} /> Active
              </label>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const e = editing!;
                  const r = await saveCollectionPoint({
                    id: e.id,
                    name: e.name ?? "",
                    address: e.address ?? "",
                    state: e.state ?? "",
                    phone: e.phone ?? "",
                    is_active: e.is_active ?? true,
                    sort_order: e.sort_order ?? 0,
                  });
                  if (r.ok) {
                    toast.success("Collection point saved");
                    setEditing(null);
                  } else toast.error(r.error);
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TermsForm({ initial }: { initial: string }) {
  const [content, setContent] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Terms and conditions</CardTitle>
          <p className="text-sm text-ink-500">
            Use <code className="rounded bg-sand px-1">## Heading</code>, blank lines between paragraphs, <code className="rounded bg-sand px-1">- </code> for lists and{" "}
            <code className="rounded bg-sand px-1">**bold**</code>.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea rows={24} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-[0.8125rem] leading-relaxed" />
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            loading={pending}
            disabled={content === initial}
            onClick={() =>
              start(async () => {
                const r = await saveTerms(content);
                if (r.ok) toast.success("Terms published");
                else toast.error(r.error);
              })
            }
          >
            Publish terms
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[44rem] overflow-y-auto">
          <Markdown content={content} className="prose-lux" />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-5 py-4 sm:px-6">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-forest-600" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-honey-600" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{title}</p>
        <div className="mt-0.5 text-sm text-ink-500">{children}</div>
      </div>
    </li>
  );
}

function IntegrationStatus({ i }: { i: Integrations }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <p className="text-sm text-ink-500">Configured through environment variables on the server. See the README for setup steps.</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="divide-y divide-line border-t border-line">
          <Row ok={i.paystack === "live"} title={`Paystack: ${{ live: "live mode", test: "test mode", simulated: "simulated (development only)", missing: "not configured" }[i.paystack]}`}>
            {i.paystack === "live" ? "Real payments are being accepted." : "Switch to your live secret key before launch."}
          </Row>
          <Row ok={i.paystack === "live" || i.paystack === "test"} title="Paystack webhook">
            <span className="mt-1 flex flex-wrap items-center gap-2">
              Paste this URL into Paystack → Settings → API Keys &amp; Webhooks:
              <code className="rounded-lg bg-sand px-2 py-1 font-mono text-xs text-ink-800">{i.webhookUrl}</code>
              <CopyButton value={i.webhookUrl} iconOnly variant="ghost" label="Copy webhook URL" />
            </span>
          </Row>
          <Row ok={i.email !== "console"} title={`Email: ${i.email}`}>
            {i.email === "console" ? "Emails are only printed to the server log. Set EMAIL_PROVIDER to resend or smtp." : `Sending as ${i.emailFrom}`}
          </Row>
          <Row ok={i.cron} title="Daily reminders">
            {i.cron ? "The reminder job is protected with a secret." : "Set CRON_SECRET so the daily reminder job can run."}
          </Row>
          <Row ok title={`Personal account numbers: ${i.dva ? "on" : "off"}`}>
            {i.dva ? "Each new customer gets a dedicated bank account number from Paystack." : "Optional. Requires a CAC-registered Paystack business."}
          </Row>
          <Row ok={!i.siteUrl.includes("localhost")} title="Website address">
            {i.siteUrl}
          </Row>
        </ul>
      </CardContent>
    </Card>
  );
}
