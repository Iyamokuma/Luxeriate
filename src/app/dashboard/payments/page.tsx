import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Download, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { getEnrollmentDetail, getMyEnrollments } from "@/lib/data/customer";
import { CHANNEL_LABEL, ENROLLMENT_LABEL, INSTALLMENT_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonth, naira, percent, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments & receipts" };

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Payments &amp; receipts</h1>
        <p className="mt-1.5 text-ink-500">Every confirmed payment, with a receipt you can download.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-[1.25rem]" />}>
        <PaymentsContent />
      </Suspense>
    </div>
  );
}

const stateTone = { paid: "forest", due: "clay", late: "danger", upcoming: "neutral", cancelled: "neutral" } as const;

async function PaymentsContent() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/payments");
  const enrollments = await getMyEnrollments(session);
  if (!enrollments.length) {
    return (
      <Card>
        <EmptyState icon={<Receipt />} title="No payments yet" description="Your receipts will appear here after your first payment." />
      </Card>
    );
  }
  const details = await Promise.all(enrollments.map((e) => getEnrollmentDetail(session, e.id).then((d) => ({ e, ...d }))));
  const allPayments = details.flatMap((d) => d.payments);
  const totalPaid = allPayments.reduce((t, p) => t + Number(p.amount_kobo), 0);
  const nextDue = details
    .filter((d) => d.e.status === "active")
    .flatMap((d) => d.installments.filter((i) => !i.paid_at).slice(0, 1).map((i) => ({ i, e: d.e })))
    .sort((a, b) => a.i.due_date.localeCompare(b.i.due_date))[0];
  const remaining = details.filter((d) => d.e.status === "active").reduce((t, d) => t + Number(d.e.outstanding_kobo), 0);

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-cream shadow-soft lg:grid-cols-4">
        <Summary label="Paid in total" value={naira(totalPaid)} sub="Registration included" />
        <Summary label="Receipts" value={String(allPayments.length)} sub={plural(enrollments.length, "plan")} />
        <Summary
          label="Next payment"
          value={nextDue ? formatDate(nextDue.i.due_date, "short") : "—"}
          sub={nextDue ? `${naira(nextDue.i.amount_kobo)} · ${nextDue.e.package_name}` : "Nothing scheduled"}
        />
        <Summary label="Still to pay" value={naira(remaining)} sub="Across active plans" />
      </dl>

      {details.map(({ e, payments, installments }) => (
        <section key={e.id} className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">
                {e.cycle_year} cycle{e.customer_code ? ` · ${e.customer_code}` : ""}
              </p>
              <h2 className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink-900">
                {e.package_name}
                <Badge tone={e.status === "completed" ? "ink" : e.status === "active" ? (e.late_count ? "danger" : "forest") : "neutral"} size="sm">
                  {e.status === "active" && e.late_count ? `${e.late_count} late` : ENROLLMENT_LABEL[e.status]}
                </Badge>
              </h2>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-ink-500">
                <span className="tnum">
                  {naira(e.paid_kobo)} of {naira(e.total_kobo)}
                </span>
                <span className="tnum font-semibold text-ink-900">{percent(e.paid_kobo, e.total_kobo)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className={cn("h-full rounded-full", e.late_count ? "bg-danger-500" : "bg-forest-600")} style={{ width: `${percent(e.paid_kobo, e.total_kobo)}%` }} />
              </div>
            </div>
          </div>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0">
              {payments.length === 0 ? (
                <p className="px-6 pb-8 text-sm text-ink-500">No confirmed payments yet.</p>
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Date</TH>
                        <TH>Covers</TH>
                        <TH>Method</TH>
                        <TH>Receipt</TH>
                        <TH className="text-right">Amount</TH>
                        <TH className="w-12" />
                      </tr>
                    </THead>
                    <tbody>
                      {payments.map((p) => (
                        <TR key={p.id}>
                          <TD className="text-ink-900">{formatDateTime(p.paid_at)}</TD>
                          <TD>
                            {p.months_label ?? "—"}
                            {p.registration_kobo > 0 && <Badge tone="honey" size="sm" className="ml-2">+ registration</Badge>}
                          </TD>
                          <TD>{CHANNEL_LABEL[p.channel ?? ""] ?? p.channel ?? "—"}</TD>
                          <TD className="font-mono text-xs">{p.receipt_number}</TD>
                          <TD className="tnum text-right font-semibold text-ink-900">{naira(p.amount_kobo)}</TD>
                          <TD>
                            <Button asChild variant="ghost" size="icon-sm" aria-label="Download receipt PDF">
                              <a href={`/api/receipts/${p.id}`} target="_blank" rel="noreferrer">
                                <Download />
                              </a>
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <p className="text-sm text-ink-500">
                {naira(e.paid_kobo)} paid of {naira(e.total_kobo)} · {naira(e.outstanding_kobo)} left
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0">
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Month</TH>
                      <TH>Due date</TH>
                      <TH>Status</TH>
                      <TH>Paid on</TH>
                      <TH className="text-right">Amount</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {installments.map((i) => (
                      <TR key={i.id}>
                        <TD className="font-semibold text-ink-900">{formatMonth(i.period_month)}</TD>
                        <TD>{formatDate(i.due_date)}</TD>
                        <TD>
                          <Badge tone={stateTone[i.state]} dot>
                            {INSTALLMENT_LABEL[i.state]}
                          </Badge>
                        </TD>
                        <TD>{i.paid_at ? formatDate(i.paid_at) : "—"}</TD>
                        <TD className="tnum text-right font-semibold text-ink-900">{naira(i.amount_kobo)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 border-line px-5 py-5 odd:border-r sm:px-6 lg:border-r lg:last:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0">
      <dt className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">{label}</dt>
      <dd className="tnum mt-1.5 truncate text-[1.375rem] font-semibold tracking-[-0.02em] text-ink-950">{value}</dd>
      <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>
    </div>
  );
}
