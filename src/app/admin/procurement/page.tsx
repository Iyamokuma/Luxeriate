import type { Metadata } from "next";
import { Suspense } from "react";
import { FileSpreadsheet, FileText, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { SegmentFilter, YearSwitcher } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { number, quantity } from "@/lib/format";
import { qtyLabel } from "@/lib/quantity";
import { firstParam } from "@/lib/utils";
import type { ProcurementRow } from "@/types/db";

export const metadata: Metadata = { title: "Procurement" };


export default function ProcurementPage(props: PageProps<"/admin/procurement">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProcurementContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ProcurementContent({ searchParams }: { searchParams: PageProps<"/admin/procurement">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("procurement.view");
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const scope = firstParam(sp.scope) === "completed" ? "completed" : "all";
  const statuses = scope === "completed" ? ["completed"] : ["active", "completed"];
  const { data } = await session.supabase.rpc("procurement_totals", { p_cycle_year: year, p_statuses: statuses });
  const rows = (data ?? []) as ProcurementRow[];
  const { count: customers } = await session.supabase
    .from("enrollments")
    .select("id, packages!inner(cycle_year)", { count: "exact", head: true })
    .eq("packages.cycle_year", year)
    .in("status", statuses);
  const packagesCount = new Set(rows.flatMap((r) => r.breakdown.map((b) => b.package))).size;
  const qs = `year=${year}&scope=${scope}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Every food item added up across all customers. Use it as your buying list."
        actions={
          <>
            <YearSwitcher years={years} year={year} />
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/export?type=procurement&${qs}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/export?type=procurement&format=pdf&${qs}`} target="_blank" rel="noreferrer">
                <FileText /> PDF
              </a>
            </Button>
          </>
        }
      />
      <SegmentFilter
        param="scope"
        options={[
          { value: "", label: "Everyone contributing" },
          { value: "completed", label: "Completed customers only" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Customers counted" value={number(customers ?? 0)} hint={scope === "completed" ? "Fully paid" : "Active and completed"} />
        <Stat label="Different items" value={number(rows.length)} />
        <Stat label="Packages included" value={number(packagesCount)} />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<ShoppingCart />} title="Nothing to buy yet" description="Items appear here as customers activate their packages." />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH className="text-right">Total to buy</TH>
                  <TH className="text-right">Customers</TH>
                  <TH>By package</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <TR key={`${r.item_name}-${r.unit}`}>
                    <TD className="font-semibold text-ink-900">{r.item_name}</TD>
                    <TD className="text-right">
                      <span className="tnum text-base font-semibold text-ink-900">{quantity(r.total_quantity)}</span>{" "}
                      <span className="text-ink-500">{r.unit}</span>
                    </TD>
                    <TD className="tnum text-right">{number(r.customers)}</TD>
                    <TD className="whitespace-normal">
                      <div className="flex flex-wrap gap-1.5">
                        {r.breakdown.map((b) => (
                          <span key={b.package} className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs text-ink-600" title={`${b.customers} × ${qtyLabel(b.per_customer, r.unit)}`}>
                            <span className="font-semibold text-ink-800">{b.package}</span>
                            <span className="tnum">
                              {b.customers} × {qtyLabel(b.per_customer, r.unit)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TD>
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
