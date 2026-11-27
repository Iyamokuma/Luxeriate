/**
 * Read-outs for the customer dashboard, worked out from the schedule the
 * database already returns. Pure functions, so server pages and client charts
 * agree on every figure.
 */
import { CHANNEL_LABEL } from "@/lib/constants";
import type { EnrollmentOverview, InstallmentOverview, PaymentOverview } from "@/types/db";

const lagosDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" });
/** The Lagos calendar day a timestamp falls on, as YYYY-MM-DD. */
export const dayOf = (ts: string) => lagosDay.format(new Date(ts));

export function daysBetween(from: string, to: string) {
  const d = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((d(to) - d(from)) / 86_400_000);
}

export type Standing =
  | { kind: "pending" }
  | { kind: "late"; late: InstallmentOverview[]; dueNow: InstallmentOverview[]; overdueKobo: number }
  | { kind: "due"; dueNow: InstallmentOverview[]; next: InstallmentOverview; daysLeft: number }
  | { kind: "ahead"; next: InstallmentOverview | null; paidThrough: InstallmentOverview | null; daysLeft: number | null }
  | { kind: "completed" };

/** Where a plan stands today: what is late, what is due, or how far ahead it is. */
export function standing(e: EnrollmentOverview, installments: InstallmentOverview[], today: string): Standing {
  if (e.status === "pending_payment") return { kind: "pending" };
  if (e.status === "completed") return { kind: "completed" };
  const late = installments.filter((i) => i.state === "late");
  const dueNow = installments.filter((i) => i.state === "due" || i.state === "late");
  const unpaid = installments.filter((i) => !i.paid_at);
  const next = unpaid[0] ?? null;
  if (late.length) return { kind: "late", late, dueNow, overdueKobo: late.reduce((s, i) => s + Number(i.amount_kobo), 0) };
  if (dueNow.length && next) return { kind: "due", dueNow, next, daysLeft: daysBetween(today, next.due_date) };
  const paid = installments.filter((i) => i.paid_at);
  return { kind: "ahead", next, paidThrough: paid[paid.length - 1] ?? null, daysLeft: next ? daysBetween(today, next.due_date) : null };
}

export type PaymentRecord = {
  /** months paid on or before their due date */
  onTime: number;
  /** months that have been paid, or are already late */
  counted: number;
  /** on-time months in a row, counting back from the latest */
  streak: number;
  /** months paid before the month itself began */
  aheadMonths: number;
  preferred: string | null;
  payments: number;
  /** everything paid, registration fee included */
  totalKobo: number;
};

export function paymentRecord(installments: InstallmentOverview[], payments: PaymentOverview[]): PaymentRecord {
  const counted = installments.filter((i) => i.paid_at || i.state === "late");
  const ok = (i: InstallmentOverview) => Boolean(i.paid_at && dayOf(i.paid_at) <= i.due_date);
  let streak = 0;
  for (let k = counted.length - 1; k >= 0 && ok(counted[k]); k--) streak++;
  const channels = new Map<string, number>();
  for (const p of payments) if (p.channel) channels.set(p.channel, (channels.get(p.channel) ?? 0) + 1);
  const top = [...channels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    onTime: counted.filter(ok).length,
    counted: counted.length,
    streak,
    aheadMonths: installments.filter((i) => i.paid_at && dayOf(i.paid_at) < i.period_month).length,
    preferred: top ? (CHANNEL_LABEL[top] ?? top) : null,
    payments: payments.length,
    totalKobo: payments.reduce((t, p) => t + Number(p.amount_kobo), 0),
  };
}

export type JourneyPoint = {
  month: string;
  due: string;
  /** what the plan expects in by this month's due date */
  plan: number;
  /** what had actually been paid by then (today, for the month in progress); null for months ahead */
  saved: number | null;
  current: boolean;
};

/** Money saved against the plan, month by month, up to today. */
export function journey(installments: InstallmentOverview[], today: string): JourneyPoint[] {
  const paidDays = installments.filter((i) => i.paid_at).map((i) => ({ day: dayOf(i.paid_at!), kobo: Number(i.amount_kobo) }));
  const paidBy = (day: string) => paidDays.reduce((s, p) => (p.day <= day ? s + p.kobo : s), 0);
  const totalNow = paidDays.reduce((s, p) => s + p.kobo, 0);
  let plan = 0;
  let reachedToday = false;
  return installments.map((i) => {
    plan += Number(i.amount_kobo);
    let saved: number | null = null;
    let current = false;
    if (i.due_date < today) saved = paidBy(i.due_date);
    else if (!reachedToday) {
      reachedToday = true;
      current = true;
      saved = totalNow;
    }
    return { month: i.period_month, due: i.due_date, plan, saved, current };
  });
}

/** Twelve items in the box, filled in proportion to the months paid. */
export function boxItems(e: EnrollmentOverview) {
  if (e.status === "completed") return 12;
  if (!e.duration_months) return 0;
  return Math.round((e.paid_count / e.duration_months) * 12);
}
