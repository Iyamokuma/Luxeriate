import type { Metadata } from "next";
import { Suspense } from "react";
import { Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { SegmentFilter, SelectFilter, YearSwitcher } from "@/components/admin/url-controls";
import { FulfilmentBoard } from "@/components/admin/fulfilment-board";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { FULFILMENT_LABEL, type FulfilmentStatus } from "@/lib/constants";
import { firstParam } from "@/lib/utils";
import type { EnrollmentOverview } from "@/types/db";

export const metadata: Metadata = { title: "Fulfilment" };

export default function FulfilmentPage(props: PageProps<"/admin/fulfilment">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <FulfilmentContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function FulfilmentContent({ searchParams }: { searchParams: PageProps<"/admin/fulfilment">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("fulfilment.manage");
  const db = session.supabase;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const status = (firstParam(sp.status) ?? "") as FulfilmentStatus | "";
  const point = firstParam(sp.point) ?? "";

  const [{ data: all }, { data: points }] = await Promise.all([
    db.from("enrollment_overview").select("*").eq("cycle_year", year).eq("status", "completed").order("full_name"),
    db.from("collection_points").select("id, name").order("sort_order"),
  ]);
  const everyone = (all ?? []) as EnrollmentOverview[];
  const counts = everyone.reduce<Record<string, number>>((acc, e) => ((acc[e.fulfilment_status] = (acc[e.fulfilment_status] ?? 0) + 1), acc), {});
  const rows = everyone.filter((e) => (!status || e.fulfilment_status === status) && (!point || e.collection_point_id === point));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fulfilment"
        description="Move completed packages through each step. Customers get an email every time their package moves."
        actions={<YearSwitcher years={years} year={year} />}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentFilter
          param="status"
          options={[
            { value: "", label: "All completed", count: everyone.length },
            ...(["not_started", "preparing", "ready", "collection_scheduled", "collected"] as const).map((s) => ({
              value: s,
              label: s === "not_started" ? "To prepare" : FULFILMENT_LABEL[s],
              count: counts[s] ?? 0,
            })),
          ]}
        />
        <SelectFilter param="point" label="All collection points" options={(points ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck />}
            title={everyone.length ? "No packages at this step" : "No completed customers yet"}
            description={everyone.length ? "Try another filter." : "Customers appear here straight after their final payment."}
          />
        </Card>
      ) : (
        <FulfilmentBoard rows={rows} />
      )}
    </div>
  );
}
