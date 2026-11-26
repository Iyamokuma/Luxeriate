import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { Pagination, SearchBox, SelectFilter } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { escapeFilter, firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity log" };

const AREAS = [
  { value: "payment", label: "Payments" },
  { value: "package", label: "Packages" },
  { value: "fulfilment", label: "Fulfilment" },
  { value: "savings", label: "Savings returns" },
  { value: "customer", label: "Customers" },
  { value: "enrollment", label: "Enrollments" },
  { value: "email", label: "Emails" },
  { value: "staff", label: "Staff" },
  { value: "settings", label: "Settings" },
];

export default function ActivityPage(props: PageProps<"/admin/activity">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ActivityContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ActivityContent({ searchParams }: { searchParams: PageProps<"/admin/activity">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("activity.view");
  const q = escapeFilter(firstParam(sp.q) ?? "");
  const area = firstParam(sp.area) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page) ?? 1) || 1);
  const size = 40;
  let query = session.supabase.from("activity_log").select("*", { count: "exact" });
  if (q) query = query.or(`summary.ilike.%${q}%,actor_name.ilike.%${q}%`);
  if (area) query = query.like("action", `${area}.%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity log" description="Every change made in the back office, with who made it and when." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchBox placeholder="Search what changed or who did it" />
          <SelectFilter param="area" label="Everything" options={AREAS} className="sm:ml-auto" />
        </div>
        {(data ?? []).length === 0 ? (
          <EmptyState icon={<Activity />} title="Nothing logged yet" description="Changes made by staff will show up here." />
        ) : (
          <ul className="divide-y divide-line">
            {(data ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                <Avatar name={a.actor_name ?? "System"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-800">
                    <span className="font-semibold text-ink-900">{a.actor_name ?? "System"}</span> {a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}
                  </p>
                  {a.details?.note && <p className="mt-0.5 text-xs text-ink-500">&ldquo;{String(a.details.note)}&rdquo;</p>}
                </div>
                <span className="shrink-0 text-xs text-ink-400" title={formatDateTime(a.created_at)}>
                  {relativeTime(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={size} total={count ?? 0} />
      </Card>
    </div>
  );
}
