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
import { CHANNEL_LABEL, INSTALLMENT_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonth, naira } from "@/lib/format";

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

  return (
    <div className="space-y-8">
      {details.map(({ e, payments, installments }) => (
        <div key={e.id} className="space-y-5">
          {enrollments.length > 1 && <h2 className="font-display text-xl font-semibold text-ink-900">{e.package_name}</h2>}
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
        </div>
      ))}
    </div>
  );
}
