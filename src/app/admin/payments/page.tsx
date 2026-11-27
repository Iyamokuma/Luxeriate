import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, HandCoins, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { LiveRefresh } from "@/components/admin/realtime";
import { Pagination, SearchBox, SegmentFilter, SelectFilter, YearSwitcher } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { CHANNEL_LABEL, INSTALLMENT_LABEL, PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonth, naira } from "@/lib/format";
import { cn, escapeFilter, firstParam } from "@/lib/utils";
import type { InstallmentOverview, PaymentOverview } from "@/types/db";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage(props: PageProps<"/admin/payments">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <PaymentsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

const stateTone = { paid: "forest", due: "clay", late: "danger", upcoming: "neutral", cancelled: "neutral" } as const;

async function PaymentsContent({ searchParams }: { searchParams: PageProps<"/admin/payments">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("payments.view");
  const db = session.supabase;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const tab = firstParam(sp.tab) === "transactions" ? "transactions" : "contributions";
  const q = escapeFilter(firstParam(sp.q) ?? "");
  const page = Math.max(1, Number(firstParam(sp.page) ?? 1) || 1);
  const pkg = firstParam(sp.package) ?? "";
  const { data: packages } = await db.from("packages").select("id, name, start_month, duration_months").eq("cycle_year", year).order("sort_order");

  const tabHref = (t: string) => `/admin/payments?tab=${t}&year=${year}`;

  const header = (
    <>
      <PageHeader
        title="Payments"
        description="Every month for every customer, and every transaction from Paystack."
        actions={
          <>
            <LiveRefresh />
            <YearSwitcher years={years} year={year} />
          </>
        }
      />
      <div className="flex gap-1 rounded-2xl border border-line bg-sand/70 p-1 sm:w-fit">
        {[
          { key: "contributions", label: "Monthly contributions" },
          { key: "transactions", label: "Transactions" },
        ].map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition sm:flex-none",
              tab === t.key ? "bg-cream text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </>
  );

  if (tab === "contributions") {
    const state = firstParam(sp.state) ?? "";
    const month = firstParam(sp.month) ?? "";
    let query = db.from("installment_overview").select("*", { count: "exact" }).eq("cycle_year", year).neq("enrollment_status", "cancelled");
    // Months only count once the customer has activated
    query = query.neq("enrollment_status", "pending_payment");
    if (state === "paid") query = query.eq("state", "paid");
    else if (state === "unpaid") query = query.in("state", ["due", "upcoming"]);
    else if (state === "late") query = query.eq("state", "late");
    else if (state === "completed") query = query.eq("enrollment_status", "completed");
    if (month) query = query.eq("period_month", month);
    if (pkg) query = query.eq("package_id", pkg);
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_code.ilike.%${q}%`);
    const { data, count } = await query
      .order("period_month", { ascending: true })
      .order("full_name")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const rows = (data ?? []) as InstallmentOverview[];

    const first = packages?.[0];
    const monthOptions = first
      ? Array.from({ length: first.duration_months }, (_, i) => {
          const d = new Date(first.start_month + "T12:00:00Z");
          d.setUTCMonth(d.getUTCMonth() + i);
          const v = d.toISOString().slice(0, 10).replace(/-\d{2}$/, "-01");
          return { value: v, label: formatMonth(v) };
        })
      : [];
    const exportQs = new URLSearchParams({ type: "installments", year: String(year), ...(state && { state }), ...(month && { month }), ...(pkg && { package: pkg }), ...(q && { q }) });

    return (
      <div className="space-y-6">
        {header}
        <SegmentFilter
          param="state"
          options={[
            { value: "", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
            { value: "late", label: "Late" },
            { value: "completed", label: "Completed customers" },
          ]}
        />
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">
            <SearchBox placeholder="Search customer, phone or ID" />
            <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
              <SelectFilter param="month" label="All months" options={monthOptions} />
              <SelectFilter param="package" label="All packages" options={(packages ?? []).map((p) => ({ value: p.id, label: p.name }))} />
              <Button asChild variant="secondary" size="sm" className="h-10">
                <a href={`/api/admin/export?${exportQs}`}>
                  <Download /> Excel
                </a>
              </Button>
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<HandCoins />} title="Nothing here" description="No months match these filters." />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Customer</TH>
                    <TH>Package</TH>
                    <TH>Month</TH>
                    <TH>Due</TH>
                    <TH>Status</TH>
                    <TH>Paid on</TH>
                    <TH className="text-right">Amount</TH>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((i) => (
                    <TR key={i.id}>
                      <TD>
                        <Link href={`/admin/customers/${i.enrollment_id}`} className="flex items-center gap-3">
                          <Avatar name={i.full_name} size="sm" />
                          <span>
                            <span className="block font-semibold text-ink-900 group-hover:underline">{i.full_name}</span>
                            <span className="block font-mono text-[0.6875rem] text-ink-400">{i.customer_code}</span>
                          </span>
                        </Link>
                      </TD>
                      <TD>{i.package_name}</TD>
                      <TD className="font-medium text-ink-900">{formatMonth(i.period_month, "short")}</TD>
                      <TD>{formatDate(i.due_date)}</TD>
                      <TD>
                        <Badge tone={stateTone[i.state]} size="sm" dot>
                          {INSTALLMENT_LABEL[i.state]}
                        </Badge>
                      </TD>
                      <TD className="text-ink-500">{i.paid_at ? formatDate(i.paid_at) : "—"}</TD>
                      <TD className="tnum text-right font-semibold text-ink-900">{naira(i.amount_kobo)}</TD>
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

  // Transactions
  const status = firstParam(sp.status) ?? "success";
  const review = firstParam(sp.review) === "1";
  let query = db.from("payment_overview").select("*", { count: "exact" }).eq("cycle_year", year);
  if (status !== "all") query = query.eq("status", status);
  if (review) query = query.eq("needs_review", true);
  if (pkg) query = query.eq("package_id", pkg);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_code.ilike.%${q}%,reference.ilike.%${q}%,receipt_number.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as PaymentOverview[];
  const exportQs = new URLSearchParams({ type: "transactions", year: String(year), status, ...(pkg && { package: pkg }), ...(q && { q }), ...(review && { review: "1" }) });

  return (
    <div className="space-y-6">
      {header}
      <SegmentFilter
        param="status"
        options={[
          { value: "", label: "Successful" },
          { value: "pending", label: "Started" },
          { value: "failed", label: "Failed" },
          { value: "abandoned", label: "Abandoned" },
          { value: "all", label: "All" },
        ]}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchBox placeholder="Customer, reference or receipt number" />
          <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
            <SelectFilter param="package" label="All packages" options={(packages ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            <SelectFilter param="review" label="All payments" options={[{ value: "1", label: "Needs review" }]} />
            <Button asChild variant="secondary" size="sm" className="h-10">
              <a href={`/api/admin/export?${exportQs}`}>
                <Download /> Excel
              </a>
            </Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<HandCoins />} title="No transactions" description="Nothing matches these filters yet." />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH>Covers</TH>
                  <TH className="text-right">Registration</TH>
                  <TH className="text-right">Contribution</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Method</TH>
                  <TH>Reference</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD className="text-ink-900">{formatDateTime(p.paid_at ?? p.created_at)}</TD>
                    <TD>
                      <Link href={`/admin/customers/${p.enrollment_id}`} className="font-semibold text-ink-900 hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="block text-xs text-ink-400">{p.package_name}</span>
                    </TD>
                    <TD>{p.months_label ?? (p.status === "success" ? "Credit" : `${p.months_requested} mo.`)}</TD>
                    <TD className="tnum text-right">{p.registration_kobo ? naira(p.registration_kobo) : "—"}</TD>
                    <TD className="tnum text-right">{p.contribution_kobo ? naira(p.contribution_kobo) : "—"}</TD>
                    <TD className="tnum text-right font-semibold text-ink-900">
                      {naira(p.amount_kobo)}
                      {p.needs_review && <ShieldAlert className="ml-1 inline size-4 text-ember-600" aria-label="Needs review" />}
                    </TD>
                    <TD>
                      {CHANNEL_LABEL[p.channel ?? ""] ?? p.channel ?? "—"}
                      {p.provider === "manual" && <Badge tone="tide" size="sm" className="ml-1.5">Offline</Badge>}
                      {p.status !== "success" && (
                        <Badge tone={p.status === "pending" ? "neutral" : "danger"} size="sm" className="ml-1.5">
                          {p.status}
                        </Badge>
                      )}
                    </TD>
                    <TD className="font-mono text-[0.6875rem] text-ink-500">
                      {p.receipt_number && <span className="block text-ink-700">{p.receipt_number}</span>}
                      {p.reference}
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
