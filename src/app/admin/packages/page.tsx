import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Gift, Package, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { YearSwitcher } from "@/components/admin/url-controls";
import { DuplicateCycleButton, OpenToggle } from "@/components/admin/package-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { THEME_STYLES } from "@/lib/constants";
import { contributionPeriod, naira } from "@/lib/format";
import { cn, firstParam } from "@/lib/utils";
import type { PackageWithItems } from "@/types/db";
import { ArcsMotif } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Packages" };

export default function PackagesPage(props: PageProps<"/admin/packages">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <PackagesContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PackagesContent({ searchParams }: { searchParams: PageProps<"/admin/packages">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("packages.manage");
  const db = session.supabase;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const [{ data }, { data: counts }] = await Promise.all([
    db.from("packages").select("*, package_items(*)").eq("cycle_year", year).order("sort_order"),
    db.from("enrollments").select("package_id, status").neq("status", "cancelled"),
  ]);
  const packages = (data ?? []) as PackageWithItems[];
  const tally = new Map<string, { total: number; active: number }>();
  for (const c of counts ?? []) {
    const t = tally.get(c.package_id) ?? { total: 0, active: 0 };
    if (c.status !== "pending_payment") t.total++;
    if (c.status === "active") t.active++;
    tally.set(c.package_id, t);
  }
  const latest = Math.max(...years);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Create and edit packages, their food items and savings returns. Each cycle year keeps its own records."
        actions={
          <>
            <YearSwitcher years={years} year={year} />
            {packages.length > 0 && year === latest && <DuplicateCycleButton fromYear={year} />}
            <Button asChild size="sm">
              <Link href={`/admin/packages/new?year=${year}`}>
                <Plus /> New package
              </Link>
            </Button>
          </>
        }
      />

      {packages.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package />}
            title={`No packages for ${year} yet`}
            description="Add your first package, or copy last year's packages and adjust them."
            action={
              <Button asChild>
                <Link href={`/admin/packages/new?year=${year}`}>
                  <Plus /> New package
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {packages.map((p) => {
            const theme = THEME_STYLES[p.theme] ?? THEME_STYLES.oat;
            const t = tally.get(p.id) ?? { total: 0, active: 0 };
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                <div className={cn("relative overflow-hidden px-5 py-4", theme.card)}>
                  <ArcsMotif className={cn("absolute -right-5 -top-8 h-28", theme.dark ? "text-honey-300/40" : "text-honey-400/35")} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className={cn("font-display text-xl font-semibold", theme.dark ? "text-cream" : "text-ink-900")}>{p.name}</p>
                      <p className={cn("tnum text-sm", theme.dark ? "text-forest-100/80" : "text-ink-500")}>
                        {naira(p.monthly_amount_kobo)} / month · {contributionPeriod(p.start_month, p.duration_months)}
                      </p>
                    </div>
                    {p.badge && (
                      <Badge tone={theme.dark ? "light" : "clay"} size="sm">
                        {p.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                  <div className="py-3">
                    <p className="text-lg font-semibold text-ink-900">{t.total}</p>
                    <p className="text-xs text-ink-400">customers</p>
                  </div>
                  <div className="py-3">
                    <p className="text-lg font-semibold text-ink-900">{p.package_items.length}</p>
                    <p className="text-xs text-ink-400">items</p>
                  </div>
                  <div className="py-3">
                    <p className="text-lg font-semibold text-ink-900">{naira(p.monthly_amount_kobo * p.duration_months).replace(/,\d{3}$/, "k")}</p>
                    <p className="text-xs text-ink-400">total</p>
                  </div>
                </div>
                <div className="flex-1 px-5 py-4 text-sm text-ink-600">
                  <p className="line-clamp-2">
                    {p.package_items.slice(0, 6).map((i) => i.name).join(", ")}
                    {p.package_items.length > 6 ? "…" : ""}
                  </p>
                  {p.savings_return_kobo > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 font-medium text-clay-600">
                      <Gift className="size-3.5" /> {naira(p.savings_return_kobo)} savings return
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
                  <OpenToggle id={p.id} open={p.is_open} />
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="View on website">
                      <Link href={`/packages/${p.slug}`} target="_blank">
                        <ExternalLink />
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/packages/${p.id}`}>
                        <Pencil /> Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
