import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { Pagination, SearchBox, SegmentFilter } from "@/components/admin/url-controls";
import { BroadcastForm, TemplateSwitch } from "@/components/admin/email-tools";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { env } from "@/lib/env";
import { PAGE_SIZE } from "@/lib/constants";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn, escapeFilter, firstParam } from "@/lib/utils";
import type { EmailTemplate } from "@/types/db";

export const metadata: Metadata = { title: "Emails" };

export default function EmailsPage(props: PageProps<"/admin/emails">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EmailsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

const ORDER = [
  "welcome",
  "payment_confirmation",
  "payment_reminder",
  "payment_overdue",
  "contribution_completed",
  "fulfilment_preparing",
  "fulfilment_ready",
  "fulfilment_collection_scheduled",
  "fulfilment_collected",
  "savings_return_paid",
  "staff_invite",
  "password_reset",
];

async function EmailsContent({ searchParams }: { searchParams: PageProps<"/admin/emails">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("emails.manage");
  const db = session.supabase;
  const tab = (["templates", "send", "log"] as const).find((t) => t === firstParam(sp.tab)) ?? "templates";
  const tabs = [
    { key: "templates", label: "Automatic emails" },
    { key: "send", label: "Send a message" },
    { key: "log", label: "Delivery log" },
  ];

  const header = (
    <>
      <PageHeader title="Emails" description="Reminders, receipts and updates go out automatically. Edit the wording, or email customers directly." />
      <div className="flex gap-1 rounded-2xl border border-line bg-sand/70 p-1 sm:w-fit">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/emails?tab=${t.key}`}
            className={cn("flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition sm:flex-none", tab === t.key ? "bg-cream text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </>
  );

  if (tab === "send") {
    const { years, year } = await getCycleYears(session, firstParam(sp.year));
    const [{ data: packages }, { data: settings }] = await Promise.all([
      db.from("packages").select("id, name").eq("cycle_year", year).order("sort_order"),
      db.from("app_settings").select("business_name").eq("id", 1).single(),
    ]);
    return (
      <div className="space-y-6">
        {header}
        <BroadcastForm year={year} years={years} packages={packages ?? []} siteUrl={env.siteUrl} businessName={settings?.business_name ?? "Luxuriate Foodstuff"} />
      </div>
    );
  }

  if (tab === "log") {
    const q = escapeFilter(firstParam(sp.q) ?? "");
    const status = firstParam(sp.status) ?? "";
    const page = Math.max(1, Number(firstParam(sp.page) ?? 1) || 1);
    let query = db.from("email_log").select("*", { count: "exact" });
    if (q) query = query.or(`to_email.ilike.%${q}%,subject.ilike.%${q}%`);
    if (status) query = query.eq("status", status);
    const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    return (
      <div className="space-y-6">
        {header}
        <SegmentFilter
          param="status"
          options={[
            { value: "", label: "All" },
            { value: "sent", label: "Sent" },
            { value: "failed", label: "Failed" },
            { value: "skipped", label: "Skipped" },
          ]}
        />
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4 sm:px-6">
            <SearchBox placeholder="Search email address or subject" />
          </div>
          {(data ?? []).length === 0 ? (
            <EmptyState icon={<Mail />} title="No emails yet" description="Every email the system sends is listed here." />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>When</TH>
                    <TH>To</TH>
                    <TH>Subject</TH>
                    <TH>Type</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <tbody>
                  {(data ?? []).map((l) => (
                    <TR key={l.id}>
                      <TD className="text-ink-500" title={formatDateTime(l.created_at)}>
                        {relativeTime(l.created_at)}
                      </TD>
                      <TD className="text-ink-900">{l.to_email}</TD>
                      <TD className="max-w-md truncate">{l.subject}</TD>
                      <TD className="text-xs text-ink-500">{String(l.template_key ?? "").replace(/_/g, " ")}</TD>
                      <TD>
                        <Badge tone={l.status === "sent" ? "forest" : l.status === "failed" ? "danger" : "neutral"} size="sm" title={l.error ?? undefined}>
                          {l.status}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </Card>
      </div>
    );
  }

  const { data } = await db.from("email_templates").select("*");
  const templates = ((data ?? []) as EmailTemplate[]).sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  return (
    <div className="space-y-6">
      {header}
      <Card className="divide-y divide-line overflow-hidden">
        {templates.map((t) => (
          <div key={t.key} className="flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
              <Mail className="size-4" />
            </span>
            <Link href={`/admin/emails/${t.key}`} className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">{t.name}</p>
              <p className="truncate text-sm text-ink-500">{t.description}</p>
            </Link>
            <span className="hidden text-xs text-ink-400 md:block">Edited {relativeTime(t.updated_at)}</span>
            <TemplateSwitch templateKey={t.key} enabled={t.is_enabled} />
            <Link href={`/admin/emails/${t.key}`} aria-label={`Edit ${t.name}`} className="rounded-lg p-1 text-ink-400 hover:bg-sand hover:text-ink-700">
              <ChevronRight className="size-5" />
            </Link>
          </div>
        ))}
      </Card>
    </div>
  );
}
