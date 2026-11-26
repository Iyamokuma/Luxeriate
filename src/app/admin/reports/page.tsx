import type { Metadata } from "next";
import { Suspense } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { CollectionsChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { SelectFilter, YearSwitcher } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { formatDate, formatMonth, naira, nairaShort, number } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import type { EnrollmentOverview, MonthlyCollection } from "@/types/db";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage(props: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ReportsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

type Balance = {
  package_id: string;
  package_name: string;
  monthly_amount_kobo: number;
  customers: number;
  completed: number;
  late_customers: number;
  expected_kobo: number;
  collected_kobo: number;
  outstanding_kobo: number;
  registration_fees_kobo: number;
};

async function ReportsContent({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("reports.view");
  const db = session.supabase;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const thisYear = new Date().getFullYear();
  const calYears = [...new Set([thisYear - 1, thisYear, ...years])].sort((a, b) => b - a);
  const calYear = Number(firstParam(sp.cal)) || thisYear;

  const [{ data: monthly }, { data: balances }, { data: completed }] = await Promise.all([
    db.rpc("report_monthly_collections", { p_year: calYear }),
    db.rpc("report_package_balances", { p_cycle_year: year }),
    db.from("enrollment_overview").select("*").eq("cycle_year", year).eq("status", "completed").order("completed_at", { ascending: false }).limit(50),
  ]);
  const months = (monthly ?? []) as MonthlyCollection[];
  const rows = (balances ?? []) as Balance[];
  const done = (completed ?? []) as EnrollmentOverview[];
  const sum = (k: keyof Balance) => rows.reduce((s, r) => s + Number(r[k]), 0);
  const yearContrib = months.reduce((s, m) => s + Number(m.contributions_kobo), 0);
  const yearFees = months.reduce((s, m) => s + Number(m.registration_fees_kobo), 0);
  const qs = `year=${year}&cal=${calYear}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Collections, registration fees, balances by package and completed customers."
        actions={
          <>
            <YearSwitcher years={years} year={year} />
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/export?type=report&${qs}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/export?type=report&format=pdf&${qs}`} target="_blank" rel="noreferrer">
                <FileText /> PDF
              </a>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label={`Contributions received in ${calYear}`} value={nairaShort(yearContrib)} tone="forest" />
        <Stat label={`Registration fees in ${calYear}`} value={nairaShort(yearFees)} tone="honey" />
        <Stat label={`Outstanding, ${year} cycle`} value={nairaShort(sum("outstanding_kobo"))} hint={`of ${nairaShort(sum("expected_kobo"))} expected`} />
        <Stat label={`Completed, ${year} cycle`} value={number(sum("completed"))} hint={`of ${number(sum("customers"))} customers`} tone="forest" />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Monthly collections</CardTitle>
            <p className="text-sm text-ink-500">By payment date in {calYear}</p>
          </div>
          <SelectFilter param="cal" label={`${thisYear}`} options={calYears.filter((y) => y !== thisYear).map((y) => ({ value: String(y), label: String(y) }))} />
        </CardHeader>
        <CardContent>
          <CollectionsChart data={months} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Balances by package · {year}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Package</TH>
                  <TH className="text-right">Customers</TH>
                  <TH className="text-right">Completed</TH>
                  <TH className="text-right">Behind</TH>
                  <TH className="text-right">Expected</TH>
                  <TH className="text-right">Collected</TH>
                  <TH className="text-right">Outstanding</TH>
                  <TH className="text-right">Reg. fees</TH>
                </tr>
              </THead>
              <tbody className="tnum">
                {rows.map((r) => (
                  <TR key={r.package_id}>
                    <TD className="font-semibold text-ink-900">{r.package_name}</TD>
                    <TD className="text-right">{number(r.customers)}</TD>
                    <TD className="text-right">{number(r.completed)}</TD>
                    <TD className="text-right">{Number(r.late_customers) > 0 ? <span className="font-semibold text-danger-600">{r.late_customers}</span> : 0}</TD>
                    <TD className="text-right">{naira(r.expected_kobo)}</TD>
                    <TD className="text-right">{naira(r.collected_kobo)}</TD>
                    <TD className="text-right font-semibold text-ink-900">{naira(r.outstanding_kobo)}</TD>
                    <TD className="text-right">{naira(r.registration_fees_kobo)}</TD>
                  </TR>
                ))}
                <tr className="bg-sand/60 font-semibold text-ink-900">
                  <td className="px-5 py-3 sm:px-6">Total</td>
                  <td className="px-4 py-3 text-right">{number(sum("customers"))}</td>
                  <td className="px-4 py-3 text-right">{number(sum("completed"))}</td>
                  <td className="px-4 py-3 text-right">{number(sum("late_customers"))}</td>
                  <td className="px-4 py-3 text-right">{naira(sum("expected_kobo"))}</td>
                  <td className="px-4 py-3 text-right">{naira(sum("collected_kobo"))}</td>
                  <td className="px-4 py-3 text-right">{naira(sum("outstanding_kobo"))}</td>
                  <td className="px-4 py-3 pr-5 text-right sm:pr-6">{naira(sum("registration_fees_kobo"))}</td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Month by month · {calYear}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Month</TH>
                    <TH className="text-right">Contributions</TH>
                    <TH className="text-right">Registration</TH>
                    <TH className="text-right">Payments</TH>
                  </tr>
                </THead>
                <tbody className="tnum">
                  {months.map((m) => (
                    <TR key={m.month}>
                      <TD className="text-ink-900">{formatMonth(m.month)}</TD>
                      <TD className="text-right">{naira(m.contributions_kobo)}</TD>
                      <TD className="text-right">{naira(m.registration_fees_kobo)}</TD>
                      <TD className="text-right">{number(m.payments_count)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Completed customers · {year}</CardTitle>
            <p className="text-sm text-ink-500">Most recent first{done.length === 50 ? " (latest 50; export for all)" : ""}</p>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {done.length === 0 ? (
              <p className="px-6 pb-8 text-sm text-ink-500">Nobody has completed yet.</p>
            ) : (
              <TableWrap className="max-h-[32rem] overflow-y-auto">
                <Table>
                  <THead>
                    <tr>
                      <TH>Customer</TH>
                      <TH>Package</TH>
                      <TH>Completed</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {done.map((e) => (
                      <TR key={e.id}>
                        <TD>
                          <span className="block font-semibold text-ink-900">{e.full_name}</span>
                          <span className="font-mono text-[0.6875rem] text-ink-400">{e.customer_code}</span>
                        </TD>
                        <TD>{e.package_name}</TD>
                        <TD>{formatDate(e.completed_at)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
