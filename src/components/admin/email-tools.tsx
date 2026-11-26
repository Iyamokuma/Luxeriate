"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { bodyToHtml, fill, layout } from "@/lib/email/render";
import { SAMPLE_VARS } from "@/lib/email/samples";
import { countRecipients, saveTemplate, sendBroadcastAction, sendTestEmail, toggleTemplate } from "@/app/admin/actions/emails";
import type { EmailTemplate } from "@/types/db";

export function TemplateSwitch({ templateKey, enabled }: { templateKey: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={on}
      disabled={pending}
      aria-label={on ? "Turn off" : "Turn on"}
      onCheckedChange={(v) => {
        setOn(v);
        start(async () => {
          const r = await toggleTemplate(templateKey, v);
          if (!r.ok) {
            setOn(!v);
            toast.error(r.error);
          } else toast.success(v ? "Email turned on" : "Email turned off");
        });
      }}
    />
  );
}

function Preview({ subject, body, businessName, siteUrl }: { subject: string; body: string; businessName: string; siteUrl: string }) {
  const vars = useMemo(
    () => ({ ...SAMPLE_VARS, site_url: siteUrl, dashboard_url: `${siteUrl}/dashboard`, pay_url: `${siteUrl}/dashboard?pay=1`, receipt_url: `${siteUrl}/dashboard/payments`, action_url: `${siteUrl}/login` }),
    [siteUrl],
  );
  const html = useMemo(() => layout({ contentHtml: bodyToHtml(body, vars), businessName, siteUrl }), [body, vars, businessName, siteUrl]);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="border-b border-line bg-sand/60 px-4 py-3">
        <p className="text-xs text-ink-400">Subject</p>
        <p className="truncate text-sm font-semibold text-ink-900">{fill(subject, vars)}</p>
      </div>
      <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[36rem] w-full bg-paper" />
    </div>
  );
}

export function TemplateEditor({ template, businessName, siteUrl }: { template: EmailTemplate; businessName: string; siteUrl: string }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.is_enabled);
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = subject !== template.subject || body !== template.body || enabled !== template.is_enabled;

  const insert = (v: string) => {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: s, selectionEnd: e } = el;
    setBody((b) => b.slice(0, s) + token + b.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/emails" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Emails
      </Link>
      <div>
        <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-ink-900">{template.name}</h1>
        <p className="mt-1 text-ink-500">{template.description}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wording</CardTitle>
            <p className="text-sm text-ink-500">
              Blank line for a new paragraph, <code className="rounded bg-sand px-1">**bold**</code>, lines starting with <code className="rounded bg-sand px-1">- </code> for a list, and{" "}
              <code className="rounded bg-sand px-1">[[Button text|{"{{dashboard_url}}"}]]</code> for a button.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Message" htmlFor="body">
              <Textarea id="body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-mono text-[0.8125rem] leading-relaxed" />
            </Field>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-500">Insert a detail</p>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <button key={v} type="button" onClick={() => insert(v)} className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-xs text-ink-600 transition hover:border-forest-300 hover:bg-forest-50 hover:text-forest-800">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-line bg-white p-4">
              <span>
                <span className="block font-semibold text-ink-900">Send this email automatically</span>
                <span className="block text-sm text-ink-500">Turn off to stop it going out.</span>
              </span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </label>
          </CardContent>
          <CardFooter className="flex-wrap justify-between">
            <Button
              variant="ghost"
              loading={testing}
              onClick={() =>
                startTest(async () => {
                  const r = await sendTestEmail(subject, body);
                  if (r.ok) toast.success(`Test sent to ${r.to}`);
                  else toast.error(r.error);
                })
              }
            >
              <Send /> Send me a test
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={!dirty}
                onClick={() => {
                  setSubject(template.subject);
                  setBody(template.body);
                  setEnabled(template.is_enabled);
                }}
              >
                Discard
              </Button>
              <Button
                loading={pending}
                disabled={!dirty}
                onClick={() =>
                  start(async () => {
                    const r = await saveTemplate(template.key, { subject, body, is_enabled: enabled });
                    if (r.ok) toast.success("Email saved");
                    else toast.error(r.error);
                  })
                }
              >
                Save
              </Button>
            </div>
          </CardFooter>
        </Card>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
            <Eye className="size-3.5" /> Preview with example details
          </p>
          <Preview subject={subject} body={body} businessName={businessName} siteUrl={siteUrl} />
        </div>
      </div>
    </div>
  );
}

export function BroadcastForm({ year, years, packages, siteUrl, businessName }: { year: number; years: number[]; packages: { id: string; name: string }[]; siteUrl: string; businessName: string }) {
  const [cycle, setCycle] = useState(year);
  const [packageId, setPackageId] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "pending_payment" | "late" | "all">("active");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {{first_name}},\n\n\n\n[[Open your dashboard|{{dashboard_url}}]]");
  const [count, setCount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    countRecipients({ year: cycle, packageId: packageId || undefined, status }).then((n) => live && setCount(n));
    return () => {
      live = false;
    };
  }, [cycle, packageId, status]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New message</CardTitle>
          <p className="text-sm text-ink-500">Personalised for each customer. You can use {"{{first_name}}"}, {"{{customer_id}}"} and {"{{package_name}}"}.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cycle">
              <NativeSelect value={cycle} onChange={(e) => setCycle(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Package">
              <NativeSelect value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                <option value="">All packages</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Customers">
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="active">Active</option>
                <option value="late">Behind on payments</option>
                <option value="completed">Completed</option>
                <option value="pending_payment">Awaiting first payment</option>
                <option value="all">Everyone</option>
              </NativeSelect>
            </Field>
          </div>
          <p className="flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-2.5 text-sm text-forest-800">
            <Users className="size-4" /> {count === null ? "Counting…" : `${count} customer${count === 1 ? "" : "s"} will receive this`}
          </p>
          <Field label="Subject" htmlFor="b-subject">
            <Input id="b-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Collection dates for December" />
          </Field>
          <Field label="Message" htmlFor="b-body">
            <Textarea id="b-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-[0.8125rem]" />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={!count || subject.trim().length < 3} onClick={() => setConfirm(true)}>
            <Send /> Review and send
          </Button>
        </CardFooter>
      </Card>
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
          <Eye className="size-3.5" /> Preview
        </p>
        <Preview subject={subject || "(no subject)"} body={body} businessName={businessName} siteUrl={siteUrl} />
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Send to {count} customers?</DialogTitle>
            <DialogDescription>&ldquo;{subject}&rdquo; will be emailed now. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await sendBroadcastAction({ year: cycle, packageId: packageId || undefined, status, subject, body });
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(`Sending to ${r.count} customers`, { description: "Follow progress in the delivery log." });
                    setConfirm(false);
                    setSubject("");
                  }
                })
              }
            >
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
