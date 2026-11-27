import Link from "next/link";
import { ArrowUpRight, Crown, TriangleAlert } from "lucide-react";
import { LiveRefresh } from "@/components/admin/realtime";
import { YearSwitcher } from "@/components/admin/url-controls";
import { firstName, formatDate, greeting, naira, nairaShort, number, percent, plural, relativeTime } from "@/lib/format";
import type { AdminOverview, SystemMonitor } from "@/types/db";
import { EmailChart, FlowChart, ForecastChart, PulseChart, SignupChart, Sparkline } from "./charts";
import { C } from "./colors";
import { SectionNav } from "./live-bits";
import {
  AttentionStrip,
  DataFootprint,
  FailureList,
  Journey,
  LiveStream,
  Meter,
  PackageTable,
  Panel,
  PanelHead,
  PaymentHealth,
  Pipeline,
  SectionTitle,
  StateBars,
  TeamTable,
  TemplateList,
  TodayPanel,
  Vital,
  type AttentionItem,
  type PackageRow,
} from "./panels";

const LIVE_TABLES = ["payments", "enrollments", "email_log", "activity_log", "system_events"];

export type OverviewProps = {
  name: string;
  owner: boolean;
  years: number[];
  year: number;
  monitor: SystemMonitor | null;
  monitorError: string | null;
  ov: AdminOverview;
  packages: PackageRow[];
  /** The live health panel (streams in); null for staff who can't see system health. */
  healthSlot: React.ReactNode | null;
  readinessSlot: React.ReactNode | null;
};

/**
 * The back-office overview. Purely presentational: the page loads the data
 * (each section is already trimmed to the viewer's permissions) and passes it in.
 */
export function OverviewView({ name, owner, years, year, monitor, monitorError, ov, packages, healthSlot, readinessSlot }: OverviewProps) {
  const m = monitor;
  const money = m?.money;
  const cust = m?.customers;
  const ops = m?.operations;
  const em = m?.emails;
  const sys = m?.system;

  // ── derived figures ──────────────────────────────────────────────────────
  const mtd = Number(money?.mtd_kobo ?? 0);
  const prevMtd = Number(money?.prev_mtd_kobo ?? 0);
  const monthDelta =
    mtd === 0 && prevMtd === 0
      ? null
      : prevMtd === 0
        ? { text: "New", up: true as boolean | null }
        : (() => {
            const pct = Math.round(((mtd - prevMtd) / prevMtd) * 100);
            return { text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}%`, up: pct === 0 ? null : pct > 0 };
          })();
  const collectedCycle = Number(ov.contributions_kobo ?? 0);
  const outstanding = Number(ov.outstanding_kobo ?? 0);
  const overdue = Number(ov.overdue_kobo ?? 0);
  const attempts = money?.attempts;
  const finished = attempts ? Number(attempts.success) + Number(attempts.failed) + Number(attempts.abandoned) : 0;
  const successRate = attempts && finished ? Math.round((Number(attempts.success) / finished) * 100) : null;
  const nextDue = money?.next_due ?? null;
  const daysToDue = nextDue && m ? daysBetween(m.today, nextDue.date) : null;
  const daily30 = (money?.daily ?? []).slice(-30);

  // ── what needs a person ──────────────────────────────────────────────────
  const attention: AttentionItem[] = [];
  if (money && Number(money.needs_review) > 0)
    attention.push({ key: "review", count: number(money.needs_review), label: "payments with odd amounts need a look", href: `/admin/payments?tab=transactions&review=1&year=${year}`, tone: "warn" });
  if (cust && Number(cust.late) > 0)
    attention.push({ key: "late", count: number(cust.late), label: `${Number(cust.late) === 1 ? "customer is" : "customers are"} behind on payments`, href: `/admin/customers?status=late&year=${year}`, tone: "danger" });
  if (cust && Number(cust.stalled) > 0)
    attention.push({ key: "stalled", count: number(cust.stalled), label: "registrations unpaid for over 3 days", href: `/admin/customers?status=pending_payment&year=${year}`, tone: "warn" });
  if (ops && Number(ops.fulfilment.completed_waiting) > 0)
    attention.push({ key: "fulfil", count: number(ops.fulfilment.completed_waiting), label: "finished packages not yet being prepared", href: `/admin/fulfilment?status=not_started&year=${year}`, tone: "warn" });
  if (ops && Number(ops.savings.pending) > 0)
    attention.push({ key: "savings", count: nairaShort(ops.savings.pending_kobo), label: `in savings returns owed to ${plural(Number(ops.savings.pending), "customer")}`, href: `/admin/savings?year=${year}`, tone: "warn" });
  if (em && Number(em.failed_24h) > 0)
    attention.push({ key: "email", count: number(em.failed_24h), label: "emails failed in the last 24 hours", href: "/admin/emails?tab=log&status=failed", tone: "danger" });
  if (sys && Number(sys.errors_24h) > 0)
    attention.push({ key: "system", count: number(sys.errors_24h), label: "background errors in the last 24 hours", href: "#system", tone: "danger" });

  const sections = [
    { id: "pulse", label: "Overview" },
    ...(money ? [{ id: "money", label: "Money" }] : []),
    ...(cust ? [{ id: "customers", label: "Customers" }] : []),
    ...(packages.length ? [{ id: "packages", label: "Packages" }] : []),
    ...(ops ? [{ id: "operations", label: "Operations" }] : []),
    ...(em ? [{ id: "emails", label: "Emails" }] : []),
    ...(sys || m?.team ? [{ id: "system", label: "Team & system" }] : []),
  ];
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  return (
    <div className="space-y-10">
      {/* ── Command band ──────────────────────────────────────────────── */}
      <section id="pulse" className="relative scroll-mt-40 overflow-hidden rounded-[1.75rem] bg-night text-cream shadow-[0_40px_80px_-40px_rgb(6_20_14/0.6)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_100%_0%,rgb(194_232_108/0.12),transparent_62%),radial-gradient(45%_60%_at_0%_100%,rgb(35_120_76/0.36),transparent_70%)]"
        />

        <div className="relative p-5 sm:p-8 xl:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-cream sm:text-2xl">
                {greeting()}, {firstName(name)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {owner && (
                <Link
                  href={`/admin?year=${year}`}
                  className="group hidden items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-cream sm:inline-flex"
                >
                  <Crown className="size-3.5 text-leaf-300" /> Executive brief
                  <ArrowUpRight className="size-3 text-ink-400 transition group-hover:text-cream" />
                </Link>
              )}
              <LiveRefresh dark every={60_000} tables={LIVE_TABLES} />
              <YearSwitcher dark years={years} year={year} />
            </div>
          </div>

          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-12">
            <div className="flex min-w-0 flex-col">
              {money ? (
                <>
                  <div>
                    <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-400">Received · all time</p>
                    <p
                      className="tnum mt-2.5 text-[2.75rem] font-semibold leading-none tracking-[-0.045em] text-cream sm:text-[3.75rem]"
                      title={`${number(money.payments_count)} payments`}
                    >
                      {naira(money.all_time_kobo)}
                    </p>
                  </div>
                  <dl className="mt-7 grid max-w-xl grid-cols-3 gap-4 border-t border-white/[0.08] pt-5">
                    <BandFigure label="Today" value={nairaShort(money.today_kobo)} sub={plural(Number(money.today_count), "payment")} />
                    <BandFigure label="This month" value={nairaShort(mtd)} sub={monthDelta ? `${monthDelta.text} on last month` : "Nothing yet"} />
                    <BandFigure label={`${year} cycle`} value={nairaShort(collectedCycle + Number(ov.registration_fees_kobo ?? 0))} sub={`${nairaShort(ov.registration_fees_kobo)} registration`} />
                  </dl>
                  <div className="mt-8">
                    <PulseChart data={money.daily} />
                  </div>
                </>
              ) : cust ? (
                <dl className="mt-9 grid max-w-xl grid-cols-3 gap-4 border-t border-white/[0.08] pt-5">
                  <BandFigure label="Paying" value={number(Number(cust.active) + Number(cust.completed))} sub={`${year} cycle`} />
                  <BandFigure label="New · 7 days" value={number(cust.new_7d)} sub="Registrations" />
                  <BandFigure label="Behind" value={number(cust.late)} sub="Past grace period" />
                </dl>
              ) : null}
            </div>

            <div className="min-w-0">
              {healthSlot ?? (
                <TodayPanel
                  rows={[
                    ...(cust
                      ? [
                          { label: "Paying customers", value: number(Number(cust.active) + Number(cust.completed)), sub: `${year} cycle` },
                          { label: "New registrations", value: number(cust.new_7d), sub: "Last 7 days" },
                          { label: "Behind on payments", value: number(cust.late), sub: "Past the grace period" },
                        ]
                      : []),
                    ...(ops
                      ? [
                          { label: "Ready for collection", value: number(ops.fulfilment.ready), sub: "Packed and waiting" },
                          { label: "Collections this week", value: number(ops.fulfilment.scheduled_7d), sub: "Booked" },
                        ]
                      : []),
                    ...(em ? [{ label: "Emails sent", value: number(em.sent_30d), sub: "Last 30 days" }] : []),
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {monitorError && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-5 py-4 text-sm text-danger-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Some figures could not load.</span> {monitorError}
          </p>
        </div>
      )}

      <SectionNav sections={sections} />

      <AttentionStrip items={attention} />

      {/* ── Vital signs ───────────────────────────────────────────────── */}
      {(money || cust) && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
          {cust && (
            <Vital label="Paying customers" value={number(Number(cust.active) + Number(cust.completed))} hint={`${number(cust.new_7d)} registered in 7 days`}>
              <Sparkline
                label="Customers activated per day, last 30 days"
                values={cust.daily.map((d) => Number(d.activated))}
                labels={cust.daily.map((d) => d.d)}
                unit="activation"
              />
            </Vital>
          )}
          {money && (
            <Vital label="This month" value={<span title={naira(mtd)}>{nairaShort(mtd)}</span>} hint={`${nairaShort(prevMtd)} by this day last month`} delta={monthDelta ?? undefined}>
              <Sparkline
                label="Money received per day, last 30 days"
                values={daily30.map((d) => Number(d.c) + Number(d.f))}
                labels={daily30.map((d) => d.d)}
                format="naira"
              />
            </Vital>
          )}
          {money && (
            <Vital label={`Still to collect · ${year}`} value={<span title={naira(outstanding)}>{nairaShort(outstanding)}</span>} hint={`${percent(collectedCycle, collectedCycle + outstanding)}% of the cycle is in`}>
              <Meter
                parts={[
                  { label: "Collected", value: collectedCycle, color: C.contributions },
                  { label: "Still to collect", value: outstanding, color: C.remaining },
                ]}
                label={`${naira(collectedCycle)} collected, ${naira(outstanding)} to go`}
              />
            </Vital>
          )}
          {money && (
            <Vital
              label="Overdue"
              value={<span title={naira(overdue)}>{nairaShort(overdue)}</span>}
              tone={overdue > 0 ? "danger" : undefined}
              hint={Number(ov.late_customers) ? `${plural(Number(ov.late_customers), "customer")} past the grace period` : "Nobody is behind"}
            >
              <Meter
                parts={[
                  { label: "Behind", value: Number(ov.late_customers ?? 0), color: C.critical },
                  { label: "On track", value: Math.max(0, Number(ov.active_contributors ?? 0) - Number(ov.late_customers ?? 0)), color: C.good },
                ]}
                label="Customers behind versus on track"
              />
            </Vital>
          )}
          {money && attempts && (
            <Vital label="Checkout success" value={successRate === null ? "—" : `${successRate}%`} hint={finished ? `${number(attempts.success)} of ${number(finished)} in 30 days` : "No checkouts in 30 days"}>
              <Meter
                parts={[
                  { label: "Succeeded", value: Number(attempts.success), color: C.good },
                  { label: "Failed", value: Number(attempts.failed), color: C.critical },
                  { label: "Abandoned", value: Number(attempts.abandoned), color: C.warning },
                ]}
                label="Checkout outcomes, last 30 days"
              />
            </Vital>
          )}
          {money && (
            <Vital
              label="Next due date"
              value={nextDue ? formatDate(nextDue.date, "short") : "—"}
              hint={nextDue ? `${nairaShort(nextDue.kobo)} from ${plural(Number(nextDue.customers), "customer")}` : "Nothing scheduled"}
              delta={daysToDue !== null ? { text: daysToDue === 0 ? "Today" : `in ${daysToDue}d`, up: null } : undefined}
            >
              <p className="text-xs text-ink-400">
                {money.last_payment_at ? (
                  <>
                    Last payment <span className="font-medium text-ink-600">{relativeTime(money.last_payment_at)}</span>
                  </>
                ) : (
                  "No payments yet"
                )}
              </p>
            </Vital>
          )}
        </div>
      )}

      {/* ── Cash flow and the live stream ─────────────────────────────── */}
      {(money || m?.stream) && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          {money && (
            <Panel>
              <PanelHead title="Cash flow" hint="Money received each day, by what it paid for" href={`/admin/payments?tab=transactions&year=${year}`} linkLabel="Payments" />
              <FlowChart data={money.daily} />
            </Panel>
          )}
          <Panel className="max-h-[32rem] xl:max-h-none xl:[contain:size]">
            <PanelHead
              title="Live"
              hint={
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex size-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-forest-400 opacity-70" />
                    <span className="relative size-1.5 rounded-full bg-forest-500" />
                  </span>
                  Everything as it happens
                </span>
              }
            />
            <LiveStream events={m?.stream ?? []} />
          </Panel>
        </div>
      )}

      {/* ── Money ─────────────────────────────────────────────────────── */}
      {money && (
        <section id="money" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Money" description="What's due, what's in, and how people pay" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHead title="The next six months" hint="Contributions due each month, and how much is already in" href={`/admin/reports?year=${year}`} linkLabel="Reports" />
              <ForecastChart data={money.forecast} today={m!.today} />
            </Panel>
            <Panel>
              <PanelHead title="Checkout health" />
              <PaymentHealth money={money} />
            </Panel>
          </div>
        </section>
      )}

      {/* ── Customers ─────────────────────────────────────────────────── */}
      {cust && (
        <section id="customers" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Customers" description={`From sign-up to collection, ${year} cycle`} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHead title="Customer journey" hint="Where everyone is right now" href={`/admin/customers?year=${year}`} linkLabel="Customers" />
              <Journey c={cust} />
            </Panel>
            <Panel>
              <PanelHead title="New sign-ups" hint="Every package, last 30 days" />
              <div className="mb-4 grid grid-cols-3 gap-3">
                <MiniFigure label="Registered · 7d" value={number(cust.new_7d)} />
                <MiniFigure label="Activated · 7d" value={number(cust.activated_7d)} />
                <MiniFigure label="Accounts" value={number(cust.accounts)} />
              </div>
              <SignupChart data={cust.daily} />
            </Panel>
          </div>
        </section>
      )}

      {/* ── Packages ──────────────────────────────────────────────────── */}
      {packages.length > 0 && (
        <section id="packages" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Packages" description="How each package is performing" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHead title="Package performance" hint="Paying customers and money against what's expected" href={`/admin/packages?year=${year}`} linkLabel="Packages" />
              <PackageTable rows={packages} year={year} />
            </Panel>
            {cust && (
              <Panel>
                <PanelHead title="Where customers are" hint="Paying customers by state" />
                <StateBars rows={cust.by_state} />
              </Panel>
            )}
          </div>
        </section>
      )}

      {/* ── Operations ────────────────────────────────────────────────── */}
      {ops && (
        <section id="operations" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Operations" description="Packing, collection and savings returns" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHead title="Fulfilment" hint="Where every paying customer's package is" href={`/admin/fulfilment?year=${year}`} linkLabel="Fulfilment" />
              <Pipeline f={ops.fulfilment} year={year} />
            </Panel>
            <Panel>
              <PanelHead title="Savings returns" hint="Money owed back to finishers" href={`/admin/savings?year=${year}`} linkLabel="Savings" />
              <div className="space-y-4">
                <div className="rounded-2xl bg-tide-50/80 p-4 ring-1 ring-inset ring-tide-200/70">
                  <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-tide-700">To pay out</p>
                  <p className="tnum mt-1.5 font-mono text-[1.625rem] font-medium leading-none tracking-[-0.03em] text-ink-950">{naira(ops.savings.pending_kobo)}</p>
                  <p className="mt-1.5 text-xs text-ink-500">{plural(Number(ops.savings.pending), "customer")} waiting</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniFigure label="Paid out" value={nairaShort(ops.savings.paid_kobo)} sub={plural(Number(ops.savings.paid), "customer")} />
                  <MiniFigure label="Collection points" value={number(ops.collection_points)} sub="Open" />
                </div>
              </div>
            </Panel>
          </div>
        </section>
      )}

      {/* ── Emails ────────────────────────────────────────────────────── */}
      {em && (
        <section id="emails" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Emails" description="Every message the system sends, and whether it arrived" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHead title="Delivery" hint="Last 14 days" href="/admin/emails?tab=log" linkLabel="Email log" />
              <div className="mb-4 grid grid-cols-3 gap-3">
                <MiniFigure label="Delivered · 30d" value={number(em.sent_30d)} />
                <MiniFigure label="Failed · 30d" value={number(em.failed_30d)} danger={Number(em.failed_30d) > 0} />
                <MiniFigure label="Templates on" value={`${number(em.templates.enabled)}/${number(em.templates.total)}`} />
              </div>
              <EmailChart data={em.daily} />
            </Panel>
            <Panel>
              <PanelHead title="By template" hint="Last 30 days" href="/admin/emails" linkLabel="Templates" />
              <TemplateList rows={em.by_template} />
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Recent failures</p>
                <FailureList rows={em.failures} />
              </div>
            </Panel>
          </div>
        </section>
      )}

      {/* ── Team & system ─────────────────────────────────────────────── */}
      {(sys || m?.team) && (
        <section id="system" className="scroll-mt-36 space-y-5">
          <SectionTitle index={idx()} title="Team & system" description="Who has access, and whether everything is set up" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {m?.team && (
              <Panel>
                <PanelHead title="Team" hint="Staff accounts and what they've done this week" href="/admin/staff" linkLabel="Staff" />
                <TeamTable members={m.team.members} />
              </Panel>
            )}
            {readinessSlot && (
              <Panel>
                <PanelHead title="Launch readiness" hint="What's left before real customers arrive" />
                {readinessSlot}
              </Panel>
            )}
          </div>
          {sys && (
            <Panel>
              <PanelHead title="Data and background jobs" hint="What's stored, and the jobs that run without anyone" href="/admin/activity" linkLabel="Activity log" />
              <DataFootprint system={sys} />
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}

function daysBetween(from: string, to: string) {
  const day = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

function BandFigure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">{label}</dt>
      <dd className="tnum mt-1.5 truncate font-mono text-[1.125rem] font-medium tracking-[-0.02em] text-cream">{value}</dd>
      <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>
    </div>
  );
}

function MiniFigure({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-sand/60 px-3.5 py-3">
      <p className="font-mono text-[0.5625rem] font-medium uppercase leading-snug tracking-[0.14em] text-ink-400">{label}</p>
      <p className={`tnum mt-1 truncate font-mono text-[1.0625rem] font-medium tracking-[-0.02em] ${danger ? "text-danger-600" : "text-ink-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-400">{sub}</p>}
    </div>
  );
}
