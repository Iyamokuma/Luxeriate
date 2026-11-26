import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthPanel, HealthSkeleton, Readiness, type PackageRow } from "@/components/admin/monitor/panels";
import { OverviewView } from "@/components/admin/monitor/overview-view";
import { can, requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { buildHealth, probeServices, type ServiceProbes } from "@/lib/data/health";
import { firstParam } from "@/lib/utils";
import type { AdminOverview, SystemMonitor } from "@/types/db";

export const metadata: Metadata = { title: "Overview" };

export default function AdminHome(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff();
  const db = session.supabase;
  const profile = session.profile;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const showPackages = can(profile, "payments.view") || can(profile, "customers.view") || can(profile, "reports.view");

  // Outside services (Paystack, Supabase Auth) are probed alongside the
  // database; the panels that need them stream in when they answer.
  const probes = can(profile, "settings.manage") ? probeServices() : null;

  const [mon, { data: ovData }, { data: balData }] = await Promise.all([
    loadMonitor(db, year),
    db.rpc("admin_overview", { p_cycle_year: year }),
    showPackages ? db.rpc("report_package_balances", { p_cycle_year: year }) : Promise.resolve({ data: [] as PackageRow[] }),
  ]);
  const dbStatus = { ms: mon.ms, error: mon.error?.message ?? null };

  return (
    <OverviewView
      name={profile.full_name}
      owner={profile.role === "owner"}
      years={years}
      year={year}
      monitor={mon.data}
      monitorError={mon.error?.message ?? null}
      ov={(ovData ?? {}) as AdminOverview}
      packages={((balData ?? []) as PackageRow[]).filter((p) => p.package_name)}
      healthSlot={
        probes ? (
          <Suspense fallback={<HealthSkeleton />}>
            <HealthBlock probes={probes} monitor={mon.data} db={dbStatus} />
          </Suspense>
        ) : null
      }
      readinessSlot={
        probes ? (
          <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
            <ReadinessBlock probes={probes} monitor={mon.data} db={dbStatus} />
          </Suspense>
        ) : null
      }
    />
  );
}

/** The monitor query, timed: its round trip is the database figure on the health panel. */
async function loadMonitor(db: Awaited<ReturnType<typeof requireStaff>>["supabase"], year: number) {
  const started = performance.now();
  const r = await db.rpc("system_monitor", { p_cycle_year: year });
  return { data: r.data as SystemMonitor | null, error: r.error, ms: Math.round(performance.now() - started) };
}

async function HealthBlock({ probes, monitor, db }: { probes: Promise<ServiceProbes>; monitor: SystemMonitor | null; db: { ms: number; error: string | null } }) {
  const health = buildHealth(monitor, db, await probes);
  return <HealthPanel checks={health.checks} checkedAt={health.checkedAt} />;
}

async function ReadinessBlock({ probes, monitor, db }: { probes: Promise<ServiceProbes>; monitor: SystemMonitor | null; db: { ms: number; error: string | null } }) {
  const health = buildHealth(monitor, db, await probes);
  return health.readiness ? <Readiness items={health.readiness} /> : null;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-10">
      <div className="h-[34rem] animate-pulse rounded-[1.75rem] bg-night" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[1.25rem]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <Skeleton className="h-96 rounded-[1.25rem]" />
        <Skeleton className="h-96 rounded-[1.25rem]" />
      </div>
    </div>
  );
}
