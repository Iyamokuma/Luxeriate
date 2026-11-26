import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleAlert,
  Cpu,
  Database,
  HandCoins,
  KeyRound,
  Mail,
  MailWarning,
  Minus,
  ShieldCheck,
  Timer,
  UserCog,
  UserPlus,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CHANNEL_LABEL } from "@/lib/constants";
import { formatDate, naira, nairaShort, number, percent, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HealthCheck, HealthStatus, ReadinessItem } from "@/lib/data/health";
import type { SystemMonitor } from "@/types/db";
import { C } from "./colors";
import { SinceLabel } from "./live-bits";

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────
export function Panel({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("card relative flex min-w-0 flex-col p-5 sm:p-6", className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHead({ title, hint, href, linkLabel }: { title: string; hint?: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink-900">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-ink-500">{hint}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 transition hover:bg-sand hover:text-ink-900"
        >
          {linkLabel ?? "Open"}
          <ArrowUpRight className="size-3.5 transition group-hover:-translate-y-px group-hover:translate-x-px" />
        </Link>
      )}
    </div>
  );
}

export function SectionTitle({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-3.5">
      <h2 className="flex items-baseline gap-3 text-[1.375rem] font-bold tracking-[-0.025em] text-ink-900">
        <span className="font-mono text-[0.75rem] font-medium tracking-normal text-honey-600">{index}</span>
        {title}
      </h2>
      <p className="text-sm text-ink-500">{description}</p>
    </div>
  );
}

function Figure({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "danger" | "muted" }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={cn("tnum mt-1.5 truncate font-mono text-[1.0625rem] font-medium tracking-[-0.02em]", tone === "danger" ? "text-danger-600" : tone === "muted" ? "text-ink-500" : "text-ink-900")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

const STATUS_META: Record<HealthStatus, { label: string; dot: string; text: string; ring: string }> = {
  ok: { label: "Healthy", dot: "bg-forest-400", text: "text-forest-300", ring: "ring-forest-400/25" },
  warn: { label: "Needs attention", dot: "bg-honey-400", text: "text-honey-300", ring: "ring-honey-400/25" },
  error: { label: "Problem", dot: "bg-[#e0685d]", text: "text-[#f0958c]", ring: "ring-[#e0685d]/30" },
  idle: { label: "Waiting", dot: "bg-ink-400", text: "text-ink-300", ring: "ring-white/10" },
};

const CHECK_ICON: Record<HealthCheck["key"], React.ComponentType<{ className?: string }>> = {
  database: Database,
  payments: HandCoins,
  webhooks: Webhook,
  email: Mail,
  reminders: Timer,
  signups: KeyRound,
  security: ShieldCheck,
};

// ─────────────────────────────────────────────────────────────────────────────
// Health instruments (on the charcoal band)
// ─────────────────────────────────────────────────────────────────────────────
export function HealthPanel({ checks, checkedAt }: { checks: HealthCheck[]; checkedAt: string }) {
  const problems = checks.filter((c) => c.status === "error").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  const overall: HealthStatus = problems ? "error" : warnings ? "warn" : "ok";
  const headline = problems
    ? `${problems} problem${problems === 1 ? "" : "s"}${warnings ? ` · ${warnings} to check` : ""}`
    : warnings
      ? `${warnings} thing${warnings === 1 ? "" : "s"} to check`
      : "All systems normal";
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] bg-white/[0.035] ring-1 ring-inset ring-white/[0.08]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", STATUS_META[overall].dot)} />
            <span className={cn("relative size-2.5 rounded-full", STATUS_META[overall].dot)} />
          </span>
          <p className="text-[0.9375rem] font-semibold text-cream">{headline}</p>
        </div>
        <p className="font-mono text-[0.6875rem] text-ink-400">
          <SinceLabel at={checkedAt} />
        </p>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {checks.map((c) => {
          const Icon = CHECK_ICON[c.key];
          const meta = STATUS_META[c.status];
          const body = (
            <>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-white/[0.05] text-ink-300 ring-1 ring-inset", meta.ring)}>
                <Icon className="size-[0.95rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium text-ink-200">{c.label}</span>
                <span className="block truncate text-xs text-ink-400" title={c.detail}>
                  {c.detail}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={cn("font-mono text-[0.75rem] font-medium", meta.text)}>{c.value}</span>
                <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
                <span className="sr-only">{meta.label}</span>
              </span>
            </>
          );
          return (
            <li key={c.key}>
              {c.href ? (
                <Link href={c.href} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-white/[0.03]">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Fallback for staff who can't see system health: their day at a glance. */
export function TodayPanel({ rows }: { rows: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-white/[0.035] ring-1 ring-inset ring-white/[0.08]">
      <p className="border-b border-white/[0.07] px-5 py-4 text-[0.9375rem] font-semibold text-cream">At a glance</p>
      <ul className="divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 px-5 py-3">
            <span>
              <span className="block text-[0.8125rem] font-medium text-ink-200">{r.label}</span>
              {r.sub && <span className="block text-xs text-ink-400">{r.sub}</span>}
            </span>
            <span className="tnum font-mono text-sm font-medium text-honey-200">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-white/[0.035] ring-1 ring-inset ring-white/[0.08]">
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-4">
        <span className="size-2.5 animate-pulse rounded-full bg-ink-500" />
        <span className="h-3.5 w-40 animate-pulse rounded bg-white/10" />
      </div>
      <div className="space-y-0 divide-y divide-white/[0.06]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-2.5">
            <span className="size-8 animate-pulse rounded-[0.6rem] bg-white/[0.06]" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-3 w-24 animate-pulse rounded bg-white/10" />
              <span className="block h-2.5 w-40 animate-pulse rounded bg-white/[0.06]" />
            </span>
            <span className="h-3 w-14 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attention: business items that need a person
// ─────────────────────────────────────────────────────────────────────────────
export type AttentionItem = { key: string; count: string; label: string; href: string; tone: "warn" | "danger" };

export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-500">
        <CircleAlert className="size-3.5 text-honey-600" /> Needs a person
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((i) => (
          <li key={i.key}>
            <Link
              href={i.href}
              className={cn(
                "group flex h-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition",
                i.tone === "danger" ? "border-danger-100 bg-danger-50/70 hover:bg-danger-50" : "border-honey-200/80 bg-honey-50/80 hover:bg-honey-50",
              )}
            >
              <span
                className={cn(
                  "tnum flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-mono text-sm font-medium",
                  i.tone === "danger" ? "bg-danger-100 text-danger-700" : "bg-honey-100 text-honey-700",
                )}
              >
                {i.count}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink-800">{i.label}</span>
              <ArrowUpRight className="size-4 shrink-0 text-ink-400 transition group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-ink-700" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vital-sign tile
// ─────────────────────────────────────────────────────────────────────────────
export function Vital({
  label,
  value,
  hint,
  delta,
  tone,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: { text: string; up: boolean | null };
  tone?: "danger";
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[0.75rem] font-medium text-ink-500 sm:text-[0.8125rem]">{label}</p>
        {delta && (
          <span
            className={cn(
              "tnum rounded-full px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium",
              delta.up === null ? "bg-sand text-ink-500" : delta.up ? "bg-forest-50 text-forest-700" : "bg-danger-50 text-danger-700",
            )}
          >
            {delta.text}
          </span>
        )}
      </div>
      <p className={cn("tnum mt-2.5 truncate font-mono text-[1.375rem] font-medium leading-none tracking-[-0.035em] sm:text-[1.625rem]", tone === "danger" ? "text-danger-600" : "text-ink-950")}>
        {value}
      </p>
      {hint && <p className="mt-2 truncate text-xs text-ink-400">{hint}</p>}
      <div className="mt-auto pt-4">{children}</div>
    </div>
  );
}

/** A thin 100% bar split into parts, 2px gaps between parts. */
export function Meter({ parts, label }: { parts: { value: number; color: string; label: string }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-ink-100/70" role="img" aria-label={label}>
      {total > 0 &&
        parts
          .filter((p) => p.value > 0)
          .map((p) => <span key={p.label} title={`${p.label}: ${number(p.value)}`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout health and how customers pay
// ─────────────────────────────────────────────────────────────────────────────
const CHANNEL_COLORS = [C.contributions, C.fees, C.third];

export function PaymentHealth({ money }: { money: NonNullable<SystemMonitor["money"]> }) {
  const a = money.attempts;
  const finished = Number(a.success) + Number(a.failed) + Number(a.abandoned);
  const rate = finished ? Math.round((Number(a.success) / finished) * 100) : null;
  const channels = money.channels.map((c) => ({ ...c, n: Number(c.n), kobo: Number(c.kobo) }));
  const top = channels.slice(0, 3);
  const rest = channels.slice(3);
  const shown = rest.length ? [...top, { channel: "other", n: rest.reduce((s, r) => s + r.n, 0), kobo: rest.reduce((s, r) => s + r.kobo, 0) }] : top;
  const totalKobo = shown.reduce((s, c) => s + c.kobo, 0);
  const attemptParts = [
    { label: "Succeeded", value: Number(a.success), color: C.good, icon: Check },
    { label: "Failed", value: Number(a.failed), color: C.critical, icon: X },
    { label: "Abandoned", value: Number(a.abandoned), color: C.warning, icon: Minus },
    { label: "In progress", value: Number(a.open), color: C.neutral, icon: Timer },
  ];
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Checkouts completed · 30 days</p>
            <p className="tnum mt-1.5 font-mono text-[2rem] font-medium leading-none tracking-[-0.04em] text-ink-950">
              {rate === null ? "—" : `${rate}%`}
            </p>
          </div>
          <p className="pb-0.5 text-right text-xs text-ink-400">
            {number(a.success)} of {number(finished)} finished
          </p>
        </div>
        <div className="mt-3">
          <Meter parts={attemptParts} label={`Checkout outcomes: ${attemptParts.map((p) => `${p.label} ${p.value}`).join(", ")}`} />
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {attemptParts.map(({ label, value, color, icon: Icon }) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-600">
                <span className="flex size-3.5 items-center justify-center rounded-[4px] text-white" style={{ background: color }}>
                  <Icon className="size-2.5" strokeWidth={3} />
                </span>
                {label}
              </span>
              <span className="tnum font-mono font-medium text-ink-800">{number(value)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line pt-5">
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">How customers pay · 90 days</p>
        {totalKobo === 0 ? (
          <p className="mt-3 text-sm text-ink-400">No payments in the last 90 days.</p>
        ) : (
          <>
            <div className="mt-3">
              <Meter
                parts={shown.map((c, i) => ({ label: CHANNEL_LABEL[c.channel] ?? c.channel, value: c.kobo, color: c.channel === "other" ? C.other : CHANNEL_COLORS[i] ?? C.other }))}
                label="Share of money by payment method"
              />
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {shown.map((c, i) => (
                <li key={c.channel} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[3px]" style={{ background: c.channel === "other" ? C.other : CHANNEL_COLORS[i] ?? C.other }} />
                  <span className="flex-1 text-ink-600">{c.channel === "other" ? "Other" : (CHANNEL_LABEL[c.channel] ?? c.channel)}</span>
                  <span className="tnum font-mono text-ink-400">{number(c.n)}×</span>
                  <span className="tnum w-14 text-right font-mono font-medium text-ink-800">{percent(c.kobo, totalKobo)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-5">
        <Figure label="Gateway fees" value={nairaShort(money.fees_kobo)} sub="All time" tone="muted" />
        <Figure label="Credit held" value={nairaShort(money.credit_held_kobo)} sub="Not yet a full month" tone="muted" />
        <Figure label="To review" value={number(money.needs_review)} sub="Odd amounts" tone={Number(money.needs_review) > 0 ? "danger" : "muted"} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer journey funnel
// ─────────────────────────────────────────────────────────────────────────────
export function Journey({ c }: { c: NonNullable<SystemMonitor["customers"]> }) {
  const registered = Number(c.registered) - Number(c.cancelled);
  const paid = Number(c.active) + Number(c.completed);
  const onTrack = Math.max(0, Number(c.active) - Number(c.late)) + Number(c.completed);
  const steps = [
    { label: "Registered", value: registered, color: "#b2d6c0", note: "Signed up this cycle" },
    { label: "Paid registration", value: paid, color: "#80b998", note: `${percent(paid, registered)}% of sign-ups` },
    { label: "On track", value: onTrack, color: "#23784c", note: `${percent(onTrack, paid)}% of payers` },
    { label: "Completed", value: Number(c.completed), color: "#014e22", note: `${percent(Number(c.completed), paid)}% finished` },
  ];
  const max = Math.max(1, registered);
  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="grid grid-cols-[8.5rem_1fr] items-center gap-4 sm:grid-cols-[10rem_1fr]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                <span className="font-mono text-[0.625rem] font-medium text-ink-400">0{i + 1}</span>
                {s.label}
              </p>
              <p className="mt-0.5 truncate pl-6 text-xs text-ink-400">{s.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-8 flex-1 overflow-hidden rounded-[0.55rem] bg-sand/70">
                <div
                  className="absolute inset-y-0 left-0 rounded-[0.55rem] transition-[width] duration-700"
                  style={{ width: `${s.value ? Math.max(2, (s.value / max) * 100) : 0}%`, background: s.color }}
                />
              </div>
              <span className="tnum w-12 text-right font-mono text-[0.9375rem] font-medium text-ink-900">{number(s.value)}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
        <Figure label="Awaiting payment" value={number(c.pending)} sub={Number(c.stalled) ? `${number(c.stalled)} for 3+ days` : "None stuck"} />
        <Figure label="Behind" value={number(c.late)} sub="Past the grace period" tone={Number(c.late) > 0 ? "danger" : undefined} />
        <Figure label="Cancelled" value={number(c.cancelled)} sub="This cycle" tone="muted" />
      </div>
    </div>
  );
}

export function StateBars({ rows }: { rows: { state: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.n)));
  if (!rows.length) return <p className="py-8 text-center text-sm text-ink-400">Locations appear once customers pay.</p>;
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  const top = rows[0];
  const named = rows.filter((r) => r.state !== "Not given").length;
  return (
    <div className="flex flex-1 flex-col">
      <StateList rows={rows} max={max} />
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-5">
        <Figure label={`${top.state} share`} value={`${percent(Number(top.n), total)}%`} sub={`${number(top.n)} of ${number(total)}`} />
        <Figure label="States reached" value={number(named)} sub={rows.length >= 8 ? "Top eight shown" : "Every state with a payer"} />
      </div>
    </div>
  );
}

function StateList({ rows, max }: { rows: { state: string; n: number }[]; max: number }) {
  return (
    <ul className="mb-6 space-y-2.5">
      {rows.map((r) => (
        <li key={r.state} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-700">{r.state}</span>
          <span className="h-2 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-r-[4px]" style={{ width: `${(Number(r.n) / max) * 100}%`, background: C.contributions }} />
          </span>
          <span className="tnum text-right font-mono text-[0.8125rem] font-medium text-ink-900">{number(r.n)}</span>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Package performance table
// ─────────────────────────────────────────────────────────────────────────────
export type PackageRow = {
  package_id: string;
  package_name: string;
  monthly_amount_kobo: number;
  customers: number;
  completed: number;
  late_customers: number;
  expected_kobo: number;
  collected_kobo: number;
  outstanding_kobo: number;
};

export function PackageTable({ rows, year }: { rows: PackageRow[]; year: number }) {
  const totals = rows.reduce(
    (t, r) => ({
      customers: t.customers + Number(r.customers),
      late: t.late + Number(r.late_customers),
      expected: t.expected + Number(r.expected_kobo),
      collected: t.collected + Number(r.collected_kobo),
    }),
    { customers: 0, late: 0, expected: 0, collected: 0 },
  );
  const maxCustomers = Math.max(1, ...rows.map((r) => Number(r.customers)));
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-400">
            <th className="py-2.5 pl-5 pr-3 font-medium sm:pl-6">Package</th>
            <th className="px-3 py-2.5 text-right font-medium">Monthly</th>
            <th className="px-3 py-2.5 font-medium">Customers</th>
            <th className="px-3 py-2.5 text-right font-medium">Behind</th>
            <th className="px-3 py-2.5 font-medium">Collected of expected</th>
            <th className="py-2.5 pl-3 pr-5 text-right font-medium sm:pr-6">Still due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct = percent(Number(r.collected_kobo), Number(r.expected_kobo));
            return (
              <tr key={r.package_id} className="border-b border-line/70 last:border-0 hover:bg-sand/40">
                <td className="py-3 pl-5 pr-3 sm:pl-6">
                  <Link href={`/admin/packages/${r.package_id}?year=${year}`} className="font-semibold text-ink-900 hover:underline">
                    {r.package_name}
                  </Link>
                </td>
                <td className="tnum px-3 py-3 text-right font-mono text-[0.8125rem] text-ink-600">{naira(r.monthly_amount_kobo)}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="tnum w-7 font-mono text-[0.8125rem] font-medium text-ink-900">{number(r.customers)}</span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-sand">
                      <span className="block h-full rounded-r-full bg-ink-300" style={{ width: `${(Number(r.customers) / maxCustomers) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className={cn("tnum px-3 py-3 text-right font-mono text-[0.8125rem]", Number(r.late_customers) ? "font-medium text-danger-600" : "text-ink-300")}>
                  {number(r.late_customers)}
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-[#d9ebe0]">
                      <span className="block h-full rounded-r-full" style={{ width: `${pct}%`, background: C.contributions }} />
                    </span>
                    <span className="tnum font-mono text-[0.75rem] text-ink-500">{pct}%</span>
                  </span>
                </td>
                <td className="tnum py-3 pl-3 pr-5 text-right font-mono text-[0.8125rem] text-ink-800 sm:pr-6">{nairaShort(r.outstanding_kobo)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong text-ink-900">
            <td className="py-3 pl-5 pr-3 font-semibold sm:pl-6">All packages</td>
            <td />
            <td className="tnum px-3 py-3 font-mono text-[0.8125rem] font-medium">{number(totals.customers)}</td>
            <td className={cn("tnum px-3 py-3 text-right font-mono text-[0.8125rem]", totals.late ? "font-medium text-danger-600" : "text-ink-300")}>{number(totals.late)}</td>
            <td className="tnum px-3 py-3 font-mono text-[0.75rem] text-ink-500">
              {nairaShort(totals.collected)} of {nairaShort(totals.expected)}
            </td>
            <td className="tnum py-3 pl-3 pr-5 text-right font-mono text-[0.8125rem] font-medium sm:pr-6">{nairaShort(totals.expected - totals.collected)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fulfilment pipeline
// ─────────────────────────────────────────────────────────────────────────────
export function Pipeline({ f, year }: { f: NonNullable<SystemMonitor["operations"]>["fulfilment"]; year: number }) {
  const stages = [
    { key: "not_started", label: "Not started", value: Number(f.not_started), color: "#d8d0c5" },
    { key: "preparing", label: "Preparing", value: Number(f.preparing), color: "#b2d6c0" },
    { key: "ready", label: "Ready", value: Number(f.ready), color: "#4d986f" },
    { key: "collection_scheduled", label: "Scheduled", value: Number(f.collection_scheduled), color: "#23784c" },
    { key: "collected", label: "Collected", value: Number(f.collected), color: "#014e22" },
  ];
  const total = stages.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stages.map((s, i) => (
          <li key={s.key} className={cn("relative", i === stages.length - 1 && "col-span-2 sm:col-span-1")}>
            <Link
              href={`/admin/fulfilment?status=${s.key}&year=${year}`}
              className="group block rounded-2xl border border-line bg-paper/60 p-4 transition hover:border-line-strong hover:bg-cream"
            >
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="font-mono text-[0.625rem] font-medium text-ink-400">0{i + 1}</span>
              </span>
              <span className="tnum mt-3 block font-mono text-[1.625rem] font-medium leading-none tracking-[-0.03em] text-ink-950">{number(s.value)}</span>
              <span className="mt-1.5 block text-[0.8125rem] font-medium text-ink-600">{s.label}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-5">
        <Meter parts={stages.map((s) => ({ label: s.label, value: s.value, color: s.color }))} label="Packages by fulfilment stage" />
        <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-xs text-ink-400">
          <span>{number(total)} paying customers this cycle</span>
          <span>
            {Number(f.scheduled_7d) > 0 ? `${number(f.scheduled_7d)} collection${Number(f.scheduled_7d) === 1 ? "" : "s"} in the next 7 days` : "No collections booked this week"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live stream
// ─────────────────────────────────────────────────────────────────────────────
const STREAM_META: Record<SystemMonitor["stream"][number]["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string; verb: string }> = {
  payment: { icon: HandCoins, tone: "bg-forest-50 text-forest-700", verb: "Paid" },
  payment_failed: { icon: XCircle, tone: "bg-danger-50 text-danger-600", verb: "Payment didn't go through" },
  signup: { icon: UserPlus, tone: "bg-honey-50 text-honey-700", verb: "New registration" },
  completed: { icon: BadgeCheck, tone: "bg-forest-100 text-forest-800", verb: "Package complete" },
  email_failed: { icon: MailWarning, tone: "bg-danger-50 text-danger-600", verb: "Email failed" },
  staff: { icon: UserCog, tone: "bg-sand text-ink-600", verb: "Staff" },
  system: { icon: Cpu, tone: "bg-sand text-ink-600", verb: "System" },
  system_error: { icon: AlertTriangle, tone: "bg-danger-50 text-danger-600", verb: "System error" },
};

const SOURCE_LABEL: Record<string, string> = { "cron.reminders": "Reminder job", "paystack.webhook": "Paystack webhook" };

function streamHref(e: SystemMonitor["stream"][number]) {
  if ((e.kind === "payment" || e.kind === "payment_failed" || e.kind === "signup" || e.kind === "completed") && e.ref) return `/admin/customers/${e.ref}`;
  if (e.kind === "email_failed") return "/admin/emails?tab=log&status=failed";
  if (e.kind === "staff") return "/admin/activity";
  return "#system";
}

export function LiveStream({ events }: { events: SystemMonitor["stream"] }) {
  if (!events.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <span className="relative flex size-10 items-center justify-center rounded-full bg-forest-50">
          <span className="absolute inset-0 animate-ping rounded-full bg-forest-100 opacity-60" />
          <span className="relative size-2.5 rounded-full bg-forest-500" />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink-800">Listening</p>
        <p className="mt-1 max-w-[16rem] text-xs text-ink-400">Payments, registrations and staff actions appear here the moment they happen.</p>
      </div>
    );
  return (
    <ol className="relative -mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
      {events.map((e, i) => {
        const meta = STREAM_META[e.kind];
        const Icon = meta.icon;
        const title = e.kind === "system" || e.kind === "system_error" ? (SOURCE_LABEL[e.title] ?? e.title) : e.title;
        return (
          <li key={`${e.kind}-${e.ref}-${i}`}>
            <Link href={streamHref(e)} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-sand/60">
              <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[0.6rem]", meta.tone)}>
                <Icon className="size-[0.95rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.8125rem] font-semibold text-ink-900">{title}</span>
                  {e.kobo != null && e.kind === "payment" && (
                    <span className="tnum shrink-0 font-mono text-[0.8125rem] font-medium text-forest-700">+{naira(e.kobo)}</span>
                  )}
                </span>
                <span className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-ink-400">
                  <span className="truncate">
                    {e.kind === "payment" ? prettyDetail(e.detail) : e.kind === "payment_failed" || e.kind === "email_failed" ? `${meta.verb} · ${e.detail ?? ""}` : e.detail}
                  </span>
                  <span className="shrink-0 font-mono text-[0.6875rem]">{relativeTime(e.at)}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function prettyDetail(detail: string | null) {
  if (!detail) return "";
  const [pkg, channel] = detail.split(" · ");
  return channel ? `${pkg} · ${CHANNEL_LABEL[channel] ?? channel}` : pkg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team
// ─────────────────────────────────────────────────────────────────────────────
export function TeamTable({ members }: { members: NonNullable<SystemMonitor["team"]>["members"] }) {
  if (!members.length) return <p className="py-8 text-center text-sm text-ink-400">No staff accounts yet.</p>;
  const active = members.filter((m) => m.is_active);
  const changes = members.reduce((s, m) => s + Number(m.actions_7d), 0);
  return (
    <div className="flex flex-1 flex-col">
      <MemberRows members={members} />
      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-5">
        <Figure label="Active accounts" value={number(active.length)} sub={`${number(active.filter((m) => m.role === "owner").length)} owner${active.filter((m) => m.role === "owner").length === 1 ? "" : "s"}`} />
        <Figure label="Changes · 7d" value={number(changes)} sub="Logged in Activity" />
        <Figure label="Switched off" value={number(members.length - active.length)} sub="Can't sign in" tone="muted" />
      </div>
    </div>
  );
}

function MemberRows({ members }: { members: NonNullable<SystemMonitor["team"]>["members"] }) {
  return (
    <div className="-mx-5 mb-6 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-400">
            <th className="py-2.5 pl-5 pr-3 font-medium sm:pl-6">Person</th>
            <th className="px-3 py-2.5 font-medium">Access</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Last signed in</th>
            <th className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right font-medium sm:pr-6">Changes · 7d</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className={cn("border-b border-line/70 last:border-0", !m.is_active && "opacity-55")}>
              <td className="py-3 pl-5 pr-3 sm:pl-6">
                <span className="flex items-center gap-3">
                  <Avatar name={m.full_name || m.email} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink-900">{m.full_name || "Unnamed"}</span>
                    <span className="block truncate text-xs text-ink-400">{m.email}</span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-3">
                {m.role === "owner" ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink-900 px-2.5 py-1 text-[0.6875rem] font-semibold text-honey-200" title="Owners hold every permission">
                    <ShieldCheck className="size-3" /> Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-sand px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-600">
                    {m.is_active ? `${m.permissions} permission${m.permissions === 1 ? "" : "s"}` : "Switched off"}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-ink-600">
                {m.last_sign_in_at ? relativeTime(m.last_sign_in_at) : <span className="text-ink-300">Never</span>}
                {m.last_action_at && <span className="block text-xs text-ink-400">Changed something {relativeTime(m.last_action_at)}</span>}
              </td>
              <td className="tnum py-3 pl-3 pr-5 text-right font-mono text-[0.8125rem] font-medium text-ink-900 sm:pr-6">{number(m.actions_7d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Launch readiness
// ─────────────────────────────────────────────────────────────────────────────
export function Readiness({ items }: { items: ReadinessItem[] }) {
  const done = items.filter((i) => i.ok).length;
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div>
      <div className="flex items-center gap-4 rounded-2xl bg-night p-4 text-cream">
        <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${done} of ${items.length} ready`}>
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={C.gold}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(done / items.length) * circ} ${circ}`}
            transform="rotate(-90 28 28)"
          />
          <text x="28" y="28" dy="0.35em" textAnchor="middle" className="fill-cream font-mono text-[13px] font-medium">
            {done}/{items.length}
          </text>
        </svg>
        <div>
          <p className="font-semibold">{done === items.length ? "Ready for customers" : `${items.length - done} step${items.length - done === 1 ? "" : "s"} before launch`}</p>
          <p className="mt-0.5 text-xs text-ink-300">Checked live against your setup each time this page loads.</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {items.map((i) => {
          const row = (
            <>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", i.ok ? "bg-forest-100 text-forest-700" : "bg-honey-100 text-honey-700")}>
                {i.ok ? <Check className="size-3" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">{i.label}</span>
              <span className={cn("truncate text-right text-xs", i.ok ? "text-ink-400" : "font-medium text-honey-700")}>{i.detail}</span>
            </>
          );
          return (
            <li key={i.label}>
              {i.href && !i.ok ? (
                <Link href={i.href} className="flex items-center gap-3 py-2.5 hover:bg-sand/40">
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data footprint and background runs
// ─────────────────────────────────────────────────────────────────────────────
export function DataFootprint({ system }: { system: NonNullable<SystemMonitor["system"]> }) {
  const rows: [string, number][] = [
    ["Accounts", system.rows.profiles],
    ["Enrollments", system.rows.enrollments],
    ["Payments", system.rows.payments],
    ["Schedule rows", system.rows.installments],
    ["Emails logged", system.rows.email_log],
    ["Staff changes", system.rows.activity_log],
  ];
  const mb = system.db_bytes / 1024 ** 2;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Database size</p>
            <p className="tnum mt-1.5 font-mono text-[1.75rem] font-medium leading-none tracking-[-0.035em] text-ink-950">
              {mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`}
            </p>
          </div>
          <p className="text-right text-xs text-ink-400">
            {number(system.auth.users)} sign-in accounts
            <br />
            {number(system.auth.signins_24h)} signed in today
          </p>
        </div>
        <div className="mt-3">
          <Meter parts={[{ label: "Used of 500 MB (free plan)", value: Math.min(mb, 500), color: C.contributions }, { label: "Free", value: Math.max(0, 500 - mb), color: "transparent" }]} label={`${mb.toFixed(1)} MB of a 500 MB free plan`} />
          <p className="mt-1.5 text-xs text-ink-400">{percent(mb, 500)}% of the 500 MB Supabase free plan</p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {rows.map(([label, n]) => (
            <div key={label}>
              <dt className="text-xs text-ink-400">{label}</dt>
              <dd className="tnum font-mono text-[0.9375rem] font-medium text-ink-900">{number(n)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Background runs</p>
        {system.jobs.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-500">
            Nothing has run yet. The daily reminder job and Paystack webhooks report here once they start.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {system.jobs.map((j) => (
              <li key={j.source} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("size-2 shrink-0 rounded-full", j.status === "error" ? "bg-danger-500" : j.status === "skipped" ? "bg-ink-300" : "bg-forest-500")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{SOURCE_LABEL[j.source] ?? j.source}</span>
                  <span className="block truncate text-xs text-ink-400">{j.summary}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xs text-ink-600">{relativeTime(j.created_at)}</span>
                  {j.duration_ms != null && <span className="block font-mono text-[0.6875rem] text-ink-400">{number(j.duration_ms)} ms</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {system.settings && (
          <p className="mt-3 text-xs text-ink-400">
            Reminders go out {system.settings.reminder_days_before} days before each due date
            {system.settings.send_overdue_notices ? `, with an overdue notice after ${system.settings.late_grace_days} days` : "; overdue notices are off"}.
          </p>
        )}
      </div>
    </div>
  );
}

export function TemplateList({ rows }: { rows: NonNullable<SystemMonitor["emails"]>["by_template"] }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-400">No emails in the last 30 days.</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r.sent) + Number(r.failed)));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-700">{r.name}</span>
          <span className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-sand">
            <span className="h-full rounded-l-full" style={{ width: `${(Number(r.sent) / max) * 100}%`, background: C.good }} />
            {Number(r.failed) > 0 && <span className="h-full rounded-r-full" style={{ width: `${(Number(r.failed) / max) * 100}%`, background: C.critical }} />}
          </span>
          <span className="tnum text-right font-mono text-[0.8125rem] font-medium text-ink-900">{number(Number(r.sent) + Number(r.failed))}</span>
        </li>
      ))}
    </ul>
  );
}

export function FailureList({ rows }: { rows: NonNullable<SystemMonitor["emails"]>["failures"] }) {
  if (!rows.length)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-forest-50 px-3.5 py-3 text-sm text-forest-800">
        <BadgeCheck className="size-4" /> No failed emails.
      </p>
    );
  return (
    <ul className="space-y-2">
      {rows.map((f, i) => (
        <li key={i} className="rounded-xl border border-danger-100 bg-danger-50/50 px-3.5 py-2.5">
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink-800">{f.to}</span>
            <span className="shrink-0 font-mono text-[0.6875rem] text-ink-400">{relativeTime(f.at)}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-danger-700" title={f.error ?? undefined}>
            {f.error ?? f.subject}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function nextDueLabel(d: string) {
  return formatDate(d, "short");
}
