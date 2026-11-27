import "server-only";
import type { Session } from "@/lib/auth";
import { lagosToday } from "@/lib/format";
import type { AdminOverview, MonthlyCollection, SystemMonitor } from "@/types/db";

export type PackageBalance = {
  package_id: string;
  package_name: string;
  sort_order: number;
  monthly_amount_kobo: number;
  customers: number;
  completed: number;
  late_customers: number;
  expected_kobo: number;
  collected_kobo: number;
  outstanding_kobo: number;
  registration_fees_kobo: number;
};

export type CycleFigures = {
  year: number;
  paying: number;
  active: number;
  completed: number;
  late: number;
  pending: number;
  booked: number;
  collected: number;
  outstanding: number;
  overdue: number;
  registration: number;
  savingsOwed: number;
  avgPlan: number;
};

export type AtRisk = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  customer_code: string | null;
  package_name: string;
  late_count: number;
  monthly_amount_kobo: number;
  last_paid_at: string | null;
};

export type Stalled = { id: string; full_name: string; phone: string | null; package_name: string; created_at: string };

export type AuditEntry = { id: number; actor_name: string | null; action: string; summary: string; created_at: string };

/** Actions only the owner usually needs to see: access, money and settings. */
const SENSITIVE = [
  "staff.invite", "staff.update", "enrollment.cancel", "payment.manual", "savings.paid",
  "settings.update", "settings.terms", "settings.collection_point", "package.delete", "package.toggle", "email.broadcast",
];

const n = (v: unknown) => Number(v ?? 0);

function figures(year: number, ov: AdminOverview | null, bal: PackageBalance[]): CycleFigures {
  const booked = bal.reduce((t, r) => t + n(r.expected_kobo), 0);
  const active = n(ov?.active_contributors);
  const completed = n(ov?.completed_customers);
  const paying = active + completed;
  return {
    year,
    paying,
    active,
    completed,
    late: n(ov?.late_customers),
    pending: n(ov?.pending_customers),
    booked,
    collected: bal.reduce((t, r) => t + n(r.collected_kobo), 0),
    outstanding: bal.reduce((t, r) => t + n(r.outstanding_kobo), 0),
    overdue: n(ov?.overdue_kobo),
    registration: n(ov?.registration_fees_kobo),
    savingsOwed: n(ov?.savings_pending_kobo),
    avgPlan: paying ? Math.round(booked / paying) : 0,
  };
}

/** Every user id on a cycle with the given statuses, a page at a time (the Data API returns 1,000 rows at most). */
async function userIds(db: Session["supabase"], year: number, statuses: string[]) {
  const ids = new Set<string>();
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await db
      .from("enrollment_overview")
      .select("user_id")
      .eq("cycle_year", year)
      .in("status", statuses)
      .order("id")
      .range(from, from + 999);
    if (error || !data?.length) break;
    data.forEach((r) => ids.add(r.user_id as string));
    if (data.length < 1000) break;
  }
  return ids;
}

/**
 * Everything the owner's executive brief needs, in one parallel round of
 * queries against functions and views the database already has.
 */
export async function getExecutiveBrief(session: Session, year: number, years: number[]) {
  const db = session.supabase;
  const prevYear = years.includes(year - 1) ? year - 1 : null;
  const today = lagosToday();
  const stalledBefore = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const [mon, ov, ovPrev, bal, balPrev, trend, leaders, atRisk, stalled, referred, audit, current, previous] = await Promise.all([
    db.rpc("system_monitor", { p_cycle_year: year }),
    db.rpc("admin_overview", { p_cycle_year: year }),
    prevYear ? db.rpc("admin_overview", { p_cycle_year: prevYear }) : Promise.resolve({ data: null }),
    db.rpc("report_package_balances", { p_cycle_year: year }),
    prevYear ? db.rpc("report_package_balances", { p_cycle_year: prevYear }) : Promise.resolve({ data: [] }),
    db.rpc("report_collections_window", { p_end_month: `${today.slice(0, 7)}-01`, p_months: 12 }),
    db.rpc("referral_leaderboard", { p_cycle_year: year }),
    db
      .from("enrollment_overview")
      .select("id, full_name, phone, whatsapp, customer_code, package_name, late_count, monthly_amount_kobo, last_paid_at", { count: "exact" })
      .eq("cycle_year", year)
      .eq("status", "active")
      .gt("late_count", 0)
      .order("late_count", { ascending: false })
      .order("monthly_amount_kobo", { ascending: false })
      .limit(6),
    db
      .from("enrollment_overview")
      .select("id, full_name, phone, package_name, created_at", { count: "exact" })
      .eq("cycle_year", year)
      .eq("status", "pending_payment")
      .lt("created_at", stalledBefore)
      .order("created_at")
      .limit(5),
    db
      .from("enrollment_overview")
      .select("id", { count: "exact", head: true })
      .eq("cycle_year", year)
      .in("status", ["active", "completed"])
      .not("referred_by_enrollment_id", "is", null),
    db.from("activity_log").select("id, actor_name, action, summary, created_at").in("action", SENSITIVE).order("created_at", { ascending: false }).limit(7),
    userIds(db, year, ["active", "completed"]),
    prevYear ? userIds(db, prevYear, ["active", "completed"]) : Promise.resolve(new Set<string>()),
  ]);

  const now = figures(year, (ov.data ?? null) as AdminOverview | null, (bal.data ?? []) as PackageBalance[]);
  const before = prevYear ? figures(prevYear, (ovPrev.data ?? null) as AdminOverview | null, (balPrev.data ?? []) as PackageBalance[]) : null;
  const returning = [...previous].filter((id) => current.has(id)).length;

  return {
    today,
    monitor: (mon.data ?? null) as SystemMonitor | null,
    error: mon.error?.message ?? ov.error?.message ?? null,
    now,
    before,
    packages: ((bal.data ?? []) as PackageBalance[]).filter((p) => p.package_name),
    trend: (trend.data ?? []) as MonthlyCollection[],
    leaders: ((leaders.data ?? []) as { enrollment_id: string; full_name: string; referral_code: string; package_name: string; referred_count: number; active_count: number; completed_count: number }[]).slice(0, 4),
    atRisk: (atRisk.data ?? []) as AtRisk[],
    atRiskCount: atRisk.count ?? 0,
    stalled: (stalled.data ?? []) as Stalled[],
    stalledCount: stalled.count ?? 0,
    referred: referred.count ?? 0,
    renewal: prevYear ? { returning, of: previous.size, prevYear } : null,
    audit: (audit.data ?? []) as AuditEntry[],
  };
}

export type ExecutiveBrief = Awaited<ReturnType<typeof getExecutiveBrief>>;
