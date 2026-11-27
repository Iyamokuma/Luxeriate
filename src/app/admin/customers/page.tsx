import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { ListSkeleton } from "@/components/admin/skeletons";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, SearchBox, SegmentFilter, SelectFilter, YearSwitcher } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { ENROLLMENT_LABEL, PAGE_SIZE } from "@/lib/constants";
import { formatDate, naira, percent } from "@/lib/format";
import { escapeFilter, firstParam } from "@/lib/utils";
import type { EnrollmentOverview } from "@/types/db";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CustomersContent searchParams={props.searchParams} />
    </Suspense>
  );
}

const statusTone = { active: "forest", pending_payment: "tide", completed: "ink", cancelled: "neutral" } as const;

async function CustomersContent({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("customers.view");
  const db = session.supabase;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const q = escapeFilter(firstParam(sp.q) ?? "");
  const status = firstParam(sp.status) ?? "";
  const pkg = firstParam(sp.package) ?? "";
  const point = firstParam(sp.point) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page) ?? 1) || 1);

  let query = db.from("enrollment_overview").select("*", { count: "exact" }).eq("cycle_year", year);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_code.ilike.%${q}%,email.ilike.%${q}%`);
  if (status === "late") query = query.eq("status", "active").gt("late_count", 0);
  else if (status) query = query.eq("status", status);
  else query = query.neq("status", "cancelled");
  if (pkg) query = query.eq("package_id", pkg);
  if (point) query = query.eq("collection_point_id", point);

  const countFor = (s: string) => {
    let c = db.from("enrollment_overview").select("id", { count: "exact", head: true }).eq("cycle_year", year);
    c = s === "late" ? c.eq("status", "active").gt("late_count", 0) : s ? c.eq("status", s) : c.neq("status", "cancelled");
    return c;
  };

  const [{ data, count }, packages, points, ...counts] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    db.from("packages").select("id, name").eq("cycle_year", year).order("sort_order"),
    db.from("collection_points").select("id, name").order("sort_order"),
    countFor(""),
    countFor("active"),
    countFor("late"),
    countFor("pending_payment"),
    countFor("completed"),
    countFor("cancelled"),
  ]);
  const rows = (data ?? []) as EnrollmentOverview[];
  const [all, active, late, pending, completed, cancelled] = counts.map((c) => c.count ?? 0);

  const exportQs = new URLSearchParams({ type: "customers", year: String(year), ...(q && { q }), ...(status && { status }), ...(pkg && { package: pkg }), ...(point && { point }) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Everyone who has registered for a package this cycle."
        actions={
          <>
            <YearSwitcher years={years} year={year} />
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/export?${exportQs}`}>
                <Download /> Export to Excel
              </a>
            </Button>
          </>
        }
      />

      <SegmentFilter
        param="status"
        options={[
          { value: "", label: "All", count: all },
          { value: "active", label: "Active", count: active },
          { value: "late", label: "Behind", count: late },
          { value: "pending_payment", label: "Awaiting payment", count: pending },
          { value: "completed", label: "Completed", count: completed },
          { value: "cancelled", label: "Cancelled", count: cancelled },
        ]}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchBox placeholder="Search name, phone, email or ID" />
          <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
            <SelectFilter param="package" label="All packages" options={(packages.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            <SelectFilter param="point" label="All collection points" options={(points.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title={q ? "No customers match your search" : "No customers yet"} description={q ? "Try a different name, phone number or ID." : "New registrations will appear here."} />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH>Customer ID</TH>
                  <TH>Package</TH>
                  <TH className="min-w-44">Progress</TH>
                  <TH>Status</TH>
                  <TH>Last payment</TH>
                  <TH className="text-right">Outstanding</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <Link href={`/admin/customers/${e.id}`} className="flex items-center gap-3">
                        <Avatar name={e.full_name} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink-900 group-hover:underline">{e.full_name}</span>
                          <span className="block text-xs text-ink-400">{e.phone ?? e.email}</span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="font-mono text-xs text-ink-600">{e.customer_code ?? "—"}</TD>
                    <TD>{e.package_name}</TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Progress value={percent(e.paid_count, e.duration_months)} size="sm" className="w-24" />
                        <span className="tnum text-xs font-medium text-ink-500">
                          {e.paid_count}/{e.duration_months}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={statusTone[e.status]} size="sm" dot>
                          {ENROLLMENT_LABEL[e.status]}
                        </Badge>
                        {e.late_count > 0 && e.status === "active" && (
                          <Badge tone="danger" size="sm">
                            {e.late_count} late
                          </Badge>
                        )}
                      </div>
                    </TD>
                    <TD className="text-ink-500">{e.last_paid_at ? formatDate(e.last_paid_at) : "—"}</TD>
                    <TD className="tnum text-right font-semibold text-ink-900">{naira(e.outstanding_kobo)}</TD>
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
