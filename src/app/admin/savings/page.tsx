import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PiggyBank } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { SegmentFilter, YearSwitcher } from "@/components/admin/url-controls";
import { MarkSavingsPaidButton } from "@/components/admin/savings-button";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { formatDate, naira, nairaShort, number } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import type { EnrollmentOverview } from "@/types/db";

export const metadata: Metadata = { title: "Savings returns" };

export default function SavingsPage(props: PageProps<"/admin/savings">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <SavingsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function SavingsContent({ searchParams }: { searchParams: PageProps<"/admin/savings">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("savings.manage");
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const view = firstParam(sp.view) === "paid" ? "paid" : firstParam(sp.view) === "upcoming" ? "upcoming" : "due";
  const { data } = await session.supabase
    .from("enrollment_overview")
    .select("*")
    .eq("cycle_year", year)
    .gt("savings_return_kobo", 0)
    .neq("status", "cancelled")
    .order("completed_at", { ascending: true, nullsFirst: false });
  const all = (data ?? []) as EnrollmentOverview[];
  const due = all.filter((e) => e.savings_return_status === "pending");
  const paid = all.filter((e) => e.savings_return_status === "paid");
  const upcoming = all.filter((e) => e.savings_return_status === "not_applicable" && e.status === "active");
  const rows = view === "paid" ? paid : view === "upcoming" ? upcoming : due;
  const sum = (l: EnrollmentOverview[]) => l.reduce((s, e) => s + Number(e.savings_return_kobo), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings returns"
        description="Savings returns owed to customers who completed their contributions. Mark each one paid once you've sent it."
        actions={<YearSwitcher years={years} year={year} />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Due now" value={nairaShort(sum(due))} hint={`${number(due.length)} customers`} tone="clay" />
        <Stat label="Paid" value={nairaShort(sum(paid))} hint={`${number(paid.length)} customers`} tone="forest" />
        <Stat label="Still contributing" value={nairaShort(sum(upcoming))} hint={`${number(upcoming.length)} customers, due on completion`} />
      </div>
      <SegmentFilter
        param="view"
        options={[
          { value: "", label: "Due now", count: due.length },
          { value: "paid", label: "Paid", count: paid.length },
          { value: "upcoming", label: "Still contributing", count: upcoming.length },
        ]}
      />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<PiggyBank />} title={view === "due" ? "Nothing due right now" : "Nothing here yet"} description="Customers appear here once their package includes a savings return." />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH>Package</TH>
                  <TH>{view === "paid" ? "Paid on" : view === "due" ? "Completed" : "Progress"}</TH>
                  {view === "paid" && <TH>Reference</TH>}
                  <TH className="text-right">Amount</TH>
                  {view === "due" && <TH className="w-32" />}
                </tr>
              </THead>
              <tbody>
                {rows.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <Link href={`/admin/customers/${e.id}`} className="flex items-center gap-3">
                        <Avatar name={e.full_name} size="sm" />
                        <span>
                          <span className="block font-semibold text-ink-900 group-hover:underline">{e.full_name}</span>
                          <span className="block font-mono text-[0.6875rem] text-ink-400">{e.customer_code}</span>
                        </span>
                      </Link>
                    </TD>
                    <TD>{e.package_name}</TD>
                    <TD>
                      {view === "paid" ? formatDate(e.savings_return_paid_at) : view === "due" ? formatDate(e.completed_at) : `${e.paid_count}/${e.duration_months} months`}
                    </TD>
                    {view === "paid" && <TD className="font-mono text-xs">{e.savings_return_reference ?? "—"}</TD>}
                    <TD className="tnum text-right font-semibold text-ink-900">{naira(e.savings_return_kobo)}</TD>
                    {view === "due" && (
                      <TD className="text-right">
                        <MarkSavingsPaidButton enrollmentId={e.id} name={e.full_name} amountKobo={e.savings_return_kobo} />
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
