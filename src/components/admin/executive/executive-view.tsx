import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Crown,
  Gauge,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  Phone,
  Settings,
  ShieldAlert,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ProgressRing } from "@/components/ui/progress";
import { ArcsMotif } from "@/components/ui/logo";
import { LiveRefresh } from "@/components/admin/realtime";
import { YearSwitcher } from "@/components/admin/url-controls";
import { Sparkline } from "@/components/admin/monitor/charts";
import { C } from "@/components/admin/monitor/colors";
import { LagosClock } from "@/components/admin/monitor/live-bits";
import { Meter, Panel, PanelHead, SectionTitle, TeamTable, Vital } from "@/components/admin/monitor/panels";
import { RevenueChart } from "@/components/admin/executive/revenue-chart";
import type { CycleFigures, ExecutiveBrief } from "@/lib/data/executive";
import { firstName, greeting, naira, nairaShort, number, percent, plural, relativeTime, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIVE_TABLES = ["payments", "enrollments", "activity_log"];

/**
 * The owner's executive brief: the cycle's economics, how it compares with
 * the last one, who needs a call, and who has access. Purely presentational;
 * the page loads the brief and passes it in.
 */
export function ExecutiveView({ name, years, year, brief, siteUrl }: { name: string; years: number[]; year: number; brief: ExecutiveBrief; siteUrl: string }) {
  const { now, before, monitor: m } = brief;
  const money = m?.money;
  const ops = m?.operations;
  const cust = m?.customers;
  const collectedPct = percent(now.collected, now.booked);
  const overduePct = now.collected + now.overdue ? Math.round((now.overdue / (now.collected + now.overdue)) * 1000) / 10 : 0;
  const toHandOver = ops ? now.paying - Number(ops.fulfilment.collected) : null;
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-night text-cream shadow-[0_40px_80px_-40px_rgb(6_20_14/0.6)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_0%_0%,rgb(194_232_108/0.12),transparent_62%),radial-gradient(55%_75%_at_100%_100%,rgb(35_120_76/0.4),transparent_70%)]"
        />
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-40 invert [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <ArcsMotif className="pointer-events-none absolute -right-36 -top-48 h-[30rem] w-auto text-white/[0.035]" />

        <div className="relative p-5 sm:p-8 xl:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-300 px-2.5 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-forest-950 shadow-[0_6px_18px_-8px_rgb(166_214_69/0.8)]">
                <Crown className="size-3" />
                Super admin
              </span>
              <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">Executive brief</span>
              <LagosClock className="text-ink-300" />
            </div>
            <div className="flex items-center gap-2">
              <LiveRefresh dark every={120_000} tables={LIVE_TABLES} />
              <YearSwitcher dark years={years} year={year} />
            </div>
          </div>

          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:gap-12">
            <div className="flex min-w-0 flex-col">
              <h1 className="text-[2rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[2.5rem]">
                {greeting()}, <span className="text-leaf-300">{firstName(name)}</span>
              </h1>
              <p className="mt-2.5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-300">
                The {year} cycle at a glance: what customers have committed to, what&apos;s in the bank, what&apos;s promised back, and who needs a call.
              </p>

              <div className="mt-9">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-400">Booked · {year} cycle</p>
                <p
                  className="tnum mt-2.5 text-[2.75rem] font-semibold leading-none tracking-[-0.045em] text-cream sm:text-[3.75rem]"
                  title="The full value of every paying customer's plan"
                >
                  {naira(now.booked)}
                </p>
                <p className="mt-2.5 text-[0.9375rem] text-ink-300">
                  {plural(now.paying, "paying customer")} · average plan <span className="tnum text-cream">{naira(now.avgPlan)}</span>
                </p>
              </div>

              <div className="mt-7 max-w-xl">
                <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${collectedPct}% of the booked value is collected`}>
                  {now.collected > 0 && <span className="h-full rounded-l-full bg-leaf-300" style={{ width: `${collectedPct}%` }} />}
                  {now.overdue > 0 && <span className="h-full bg-[#e0645a]" style={{ width: `${Math.max(0.8, (now.overdue / (now.booked || 1)) * 100)}%` }} />}
                </div>
                <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-ink-300">
                    <span className="tnum font-semibold text-cream">{naira(now.collected)}</span> collected · {collectedPct}%
                  </span>
                  <span className="text-ink-400">
                    {now.overdue > 0 && (
                      <>
                        <span className="tnum font-semibold text-[#f3a59c]">{nairaShort(now.overdue)}</span> overdue ·{" "}
                      </>
                    )}
                    <span className="tnum text-ink-200">{nairaShort(now.outstanding)}</span> still to collect
                  </span>
                </div>
              </div>

              <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-white/[0.08] pt-5">
                <HeroFigure label="Registration" value={nairaShort(now.registration)} sub="Income this cycle" />
                <HeroFigure label="All time" value={nairaShort(money?.all_time_kobo)} sub={`${number(money?.payments_count)} payments`} />
                <HeroFigure label="Paystack fees" value={nairaShort(money?.fees_kobo)} sub="All time" />
              </dl>
            </div>

            <Scorecard now={now} before={before} />
          </div>

          <nav aria-label="Shortcuts" className="mt-9 flex flex-wrap gap-2 border-t border-white/[0.08] pt-6">
            {[
              { href: `/admin/command-centre?year=${year}`, label: "Command centre", icon: LayoutDashboard },
              { href: `/admin/customers?year=${year}`, label: "Customers", icon: Users },
              { href: `/admin/reports?year=${year}`, label: "Reports", icon: BarChart3 },
              { href: "/admin/staff", label: "Staff & access", icon: UserCog },
              { href: "/admin/settings", label: "Settings", icon: Settings },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-2 text-sm font-semibold text-ink-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-cream"
              >
                <Icon className="size-4 text-leaf-300" />
                {label}
                <ArrowUpRight className="size-3.5 text-ink-400 transition group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-cream" />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {brief.error && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-5 py-4 text-sm text-danger-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Some figures could not load.</span> {brief.error}
          </p>
        </div>
      )}

      {/* ── Health of the cycle ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <Vital label="Collected of booked" value={`${collectedPct}%`} hint={`${nairaShort(now.collected)} of ${nairaShort(now.booked)}`}>
          <Meter
            parts={[
              { label: "Collected", value: now.collected, color: C.contributions },
              { label: "Still to collect", value: now.outstanding, color: C.remaining },
            ]}
            label={`${naira(now.collected)} collected of ${naira(now.booked)} booked`}
          />
        </Vital>
        <Vital label="Overdue rate" value={`${overduePct}%`} tone={overduePct > 5 ? "danger" : undefined} hint={now.overdue ? `${nairaShort(now.overdue)} past the grace period` : "Nothing overdue"}>
          <Meter
            parts={[
              { label: "Paid", value: now.collected, color: C.good },
              { label: "Overdue", value: now.overdue, color: C.critical },
            ]}
            label="Money paid versus money overdue"
          />
        </Vital>
        <Vital label="Behind on payments" value={number(now.late)} tone={now.late ? "danger" : undefined} hint={now.active ? `${percent(now.late, now.active)}% of active customers` : "No active customers"}>
          <Meter
            parts={[
              { label: "Behind", value: now.late, color: C.critical },
              { label: "On track", value: Math.max(0, now.active - now.late), color: C.good },
            ]}
            label="Customers behind versus on track"
          />
        </Vital>
        <Vital label="Completion" value={`${percent(now.completed, now.paying)}%`} hint={`${plural(now.completed, "customer")} finished`}>
          <Meter
            parts={[
              { label: "Completed", value: now.completed, color: C.contributions },
              { label: "Still paying", value: now.active, color: C.remaining },
            ]}
            label="Customers who have finished paying"
          />
        </Vital>
        <Vital
          label="Renewal"
          value={brief.renewal ? `${percent(brief.renewal.returning, brief.renewal.of)}%` : "—"}
          hint={brief.renewal ? `${brief.renewal.returning} of ${brief.renewal.of} from ${brief.renewal.prevYear} rejoined` : "First cycle on record"}
        >
          <Meter
            parts={brief.renewal ? [{ label: "Rejoined", value: brief.renewal.returning, color: C.contributions }, { label: "Not yet", value: brief.renewal.of - brief.renewal.returning, color: C.remaining }] : []}
            label="Last cycle's customers who joined this cycle"
          />
        </Vital>
        <Vital label="Joined by referral" value={`${percent(brief.referred, now.paying)}%`} hint={`${plural(brief.referred, "customer")} used a code`}>
          <Meter
            parts={[
              { label: "Referred", value: brief.referred, color: C.fees },
              { label: "Found us directly", value: Math.max(0, now.paying - brief.referred), color: C.remaining },
            ]}
            label="Paying customers who joined with a referral code"
          />
        </Vital>
      </div>

      {/* ── Money ───────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionTitle index={idx()} title="Money" description="What came in, month by month, and where it stands today" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHead title="Revenue, last 12 months" hint="By the month the money arrived, across every cycle" href={`/admin/reports?year=${year}`} linkLabel="Reports" />
            <RevenueChart data={brief.trend} today={brief.today} />
          </Panel>
          <Panel>
            <PanelHead title="Where the money stands" hint={`${year} cycle, unless marked`} href={`/admin/payments?year=${year}`} linkLabel="Payments" />
            <Ledger
              groups={[
                {
                  title: "Received",
                  rows: [
                    { label: "Contributions", value: naira(now.collected) },
                    { label: "Registration fees", value: naira(now.registration) },
                    { label: "Credit held for customers", value: naira(money?.credit_held_kobo), note: "All cycles" },
                  ],
                },
                {
                  title: "Still to come",
                  rows: [
                    { label: "Scheduled, not yet paid", value: naira(now.outstanding) },
                    { label: "Of which overdue", value: naira(now.overdue), danger: now.overdue > 0 },
                  ],
                },
                {
                  title: "Promised back",
                  rows: [
                    { label: "Packages to hand over", value: toHandOver === null ? "—" : number(toHandOver) },
                    { label: "Savings returns owed", value: naira(now.savingsOwed), warn: now.savingsOwed > 0 },
                    { label: "Savings returns paid", value: naira(ops?.savings.paid_kobo) },
                  ],
                },
                { title: "Costs", rows: [{ label: "Paystack fees", value: naira(money?.fees_kobo), note: "All time" }] },
              ]}
            />
          </Panel>
        </div>
      </section>

      {/* ── Packages and growth ─────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionTitle index={idx()} title="Packages & growth" description="Which plans carry the business, and whether customers come back" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHead title="Package mix" hint="Booked value per package, and how much of it is in" href={`/admin/packages?year=${year}`} linkLabel="Packages" />
            <PackageMix rows={brief.packages} />
          </Panel>
          <Panel>
            <PanelHead title="Loyalty & referrals" hint="Returning customers and who brings new ones" href={`/admin/referrals?year=${year}`} linkLabel="Referrals" />
            <div className="flex items-center gap-5">
              <ProgressRing value={brief.renewal ? percent(brief.renewal.returning, brief.renewal.of) : 0} size={96} stroke={9} barClassName="stroke-forest-600">
                <span className="tnum text-xl font-semibold leading-none text-ink-900">{brief.renewal ? `${percent(brief.renewal.returning, brief.renewal.of)}%` : "—"}</span>
                <span className="mt-1 text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-ink-400">renewed</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-ink-900">
                  {brief.renewal ? `${plural(brief.renewal.returning, "customer")} from ${brief.renewal.prevYear} came back` : "Renewals appear from the second cycle"}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {brief.renewal && brief.renewal.of - brief.renewal.returning > 0
                    ? `${brief.renewal.of - brief.renewal.returning} haven't joined ${year} yet. They already trust you.`
                    : "Every returning customer costs nothing to win."}
                </p>
              </div>
            </div>
            {cust && (
              <div className="mt-6 rounded-xl bg-sand/60 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-ink-400">New sign-ups · 30 days</p>
                  <p className="tnum font-mono text-sm font-medium text-ink-900">{number(cust.daily.reduce((t, d) => t + Number(d.joined), 0))}</p>
                </div>
                <div className="mt-2">
                  <Sparkline label="Registrations per day, last 30 days" values={cust.daily.map((d) => Number(d.joined))} labels={cust.daily.map((d) => d.d)} unit="registration" height={36} />
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Top referrers · {year}</p>
              {brief.leaders.length === 0 ? (
                <p className="text-sm text-ink-500">Nobody has referred a customer to the {year} cycle yet.</p>
              ) : (
                <ol className="space-y-3">
                  {brief.leaders.map((r, i) => (
                    <li key={r.enrollment_id} className="flex items-center gap-3">
                      <span className="tnum w-4 font-mono text-xs text-ink-400">{i + 1}</span>
                      <Avatar name={r.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{r.full_name}</p>
                        <p className="truncate font-mono text-[0.6875rem] text-ink-400">
                          {r.referral_code} · {r.package_name}
                        </p>
                      </div>
                      <span className="tnum rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-800 ring-1 ring-inset ring-leaf-200">
                        {Number(r.active_count) + Number(r.completed_count)} paying
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Panel>
        </div>
      </section>

      {/* ── People who need a call ──────────────────────────────────── */}
      <section className="space-y-5">
        <SectionTitle index={idx()} title="Needs a call" description="Customers behind on payments, and registrations that never paid" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Panel className="p-0 sm:p-0">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <PanelHead
                title="Behind on payments"
                hint={brief.atRiskCount ? `${plural(brief.atRiskCount, "customer")} past the grace period, most months behind first` : "Everyone is up to date"}
                href={`/admin/customers?status=late&year=${year}`}
                linkLabel="All late"
              />
            </div>
            {brief.atRisk.length === 0 ? (
              <p className="px-6 pb-8 text-sm text-ink-500">Nobody in the {year} cycle is past the grace period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-y border-line bg-sand/50 text-left font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-400">
                      <th className="px-6 py-2.5 font-medium">Customer</th>
                      <th className="px-3 py-2.5 font-medium">Package</th>
                      <th className="px-3 py-2.5 text-right font-medium">Behind</th>
                      <th className="px-3 py-2.5 font-medium">Last paid</th>
                      <th className="px-6 py-2.5 text-right font-medium">Reach out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {brief.atRisk.map((c) => {
                      const owed = c.late_count * Number(c.monthly_amount_kobo);
                      const msg = `Hello ${firstName(c.full_name)}, this is Luxuriate Foodstuff. A friendly reminder that ${plural(c.late_count, "month")} of your ${c.package_name} contributions (${naira(owed)}) ${c.late_count === 1 ? "is" : "are"} overdue. You can pay any time from your dashboard: ${siteUrl}/dashboard`;
                      return (
                        <tr key={c.id} className="transition hover:bg-sand/40">
                          <td className="px-6 py-3">
                            <Link href={`/admin/customers/${c.id}`} className="group flex items-center gap-3">
                              <Avatar name={c.full_name} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-ink-900 group-hover:underline">{c.full_name}</span>
                                <span className="block font-mono text-[0.6875rem] text-ink-400">{c.customer_code}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-ink-600">{c.package_name}</td>
                          <td className="px-3 py-3 text-right">
                            <span className="tnum block font-semibold text-danger-600">{naira(owed)}</span>
                            <span className="block text-xs text-ink-400">{plural(c.late_count, "month")}</span>
                          </td>
                          <td className="px-3 py-3 text-ink-500">{c.last_paid_at ? relativeTime(c.last_paid_at) : "Never"}</td>
                          <td className="px-6 py-3">
                            <div className="flex justify-end gap-1.5">
                              {c.phone && (
                                <a href={`tel:${c.phone}`} aria-label={`Call ${c.full_name}`} className="flex size-8 items-center justify-center rounded-lg text-ink-500 ring-1 ring-inset ring-line transition hover:bg-sand hover:text-ink-900">
                                  <Phone className="size-3.5" />
                                </a>
                              )}
                              <a
                                href={whatsappLink(c.whatsapp || c.phone, msg)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`WhatsApp ${c.full_name}`}
                                className="flex size-8 items-center justify-center rounded-lg text-[#1f9e55] ring-1 ring-inset ring-line transition hover:bg-[#e9f8ef]"
                              >
                                <MessageCircle className="size-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHead
              title="Registered, never paid"
              hint={brief.stalledCount ? `${plural(brief.stalledCount, "registration")} unpaid for over 3 days` : "No stalled registrations"}
              href={`/admin/customers?status=pending_payment&year=${year}`}
              linkLabel="All pending"
            />
            {brief.stalled.length === 0 ? (
              <p className="text-sm text-ink-500">Everyone who registered more than three days ago has paid.</p>
            ) : (
              <ul className="divide-y divide-line">
                {brief.stalled.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0">
                    <Avatar name={c.full_name} size="sm" />
                    <Link href={`/admin/customers/${c.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900 hover:underline">{c.full_name}</span>
                      <span className="block text-xs text-ink-400">
                        {c.package_name} · registered {relativeTime(c.created_at)}
                      </span>
                    </Link>
                    <a
                      href={whatsappLink(c.phone, `Hello ${firstName(c.full_name)}, this is Luxuriate Foodstuff. We saw you started registering for the ${c.package_name} package. Can we help you finish? ${siteUrl}/dashboard`)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp ${c.full_name}`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#1f9e55] ring-1 ring-inset ring-line transition hover:bg-[#e9f8ef]"
                    >
                      <MessageCircle className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>

      {/* ── Access ──────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionTitle index={idx()} title="Access & audit" description="Who can see and change what, and the changes that matter most" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {m?.team && (
            <Panel>
              <PanelHead title="Team" hint="Staff accounts and what they've done this week" href="/admin/staff" linkLabel="Manage staff" />
              <TeamTable members={m.team.members} />
            </Panel>
          )}
          <Panel>
            <PanelHead title="Sensitive changes" hint="Access, money and settings, newest first" href="/admin/activity" linkLabel="Activity log" />
            {brief.audit.length === 0 ? (
              <p className="text-sm text-ink-500">No access, money or settings changes yet.</p>
            ) : (
              <ol className="relative space-y-4">
                <span aria-hidden className="absolute bottom-2 left-[0.9375rem] top-2 w-px bg-line" />
                {brief.audit.map((a) => {
                  const Icon = a.action.startsWith("staff") ? KeyRound : a.action.startsWith("settings") ? Settings : a.action.includes("cancel") || a.action.includes("delete") ? ShieldAlert : Gauge;
                  return (
                    <li key={a.id} className="relative flex gap-3">
                      <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-cream text-ink-600">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm text-ink-800">
                          <span className="font-semibold text-ink-900">{a.actor_name ?? "System"}</span> {a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">{relativeTime(a.created_at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}

function HeroFigure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">{label}</dt>
      <dd className="tnum mt-1.5 truncate font-mono text-[1.125rem] font-medium tracking-[-0.02em] text-cream">{value}</dd>
      <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>
    </div>
  );
}

/** This cycle against the last one, line by line. */
function Scorecard({ now, before }: { now: CycleFigures; before: CycleFigures | null }) {
  const rows: { label: string; a: number; b?: number; fmt: (v: number) => string; lowerIsBetter?: boolean }[] = [
    { label: "Paying customers", a: now.paying, b: before?.paying, fmt: number },
    { label: "Booked value", a: now.booked, b: before?.booked, fmt: nairaShort },
    { label: "Collected", a: now.collected, b: before?.collected, fmt: nairaShort },
    { label: "Average plan", a: now.avgPlan, b: before?.avgPlan, fmt: nairaShort },
    { label: "Registration income", a: now.registration, b: before?.registration, fmt: nairaShort },
    { label: "Finished paying", a: now.completed, b: before?.completed, fmt: number },
    { label: "Behind on payments", a: now.late, b: before?.late, fmt: number, lowerIsBetter: true },
  ];
  return (
    <div className="min-w-0 self-start rounded-2xl bg-white/[0.035] ring-1 ring-inset ring-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
        <p className="text-[0.9375rem] font-semibold text-cream">Cycle scorecard</p>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-400">{before ? `${now.year} vs ${before.year}` : `${now.year} · first cycle`}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-400">
            <th className="px-5 pb-1 pt-3 text-left font-medium" />
            <th className="px-2 pb-1 pt-3 text-right font-medium">{now.year}</th>
            {before && <th className="px-2 pb-1 pt-3 text-right font-medium">{before.year}</th>}
            {before && <th className="px-5 pb-1 pt-3 text-right font-medium">Change</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.b === undefined ? null : r.b === 0 ? (r.a === 0 ? 0 : null) : Math.round(((r.a - r.b) / r.b) * 100);
            const good = d === null || d === 0 ? null : r.lowerIsBetter ? d < 0 : d > 0;
            return (
              <tr key={r.label} className="border-t border-white/[0.05]">
                <td className="px-5 py-2.5 text-ink-300">{r.label}</td>
                <td className="tnum px-2 py-2.5 text-right font-mono font-medium text-cream">{r.fmt(r.a)}</td>
                {before && <td className="tnum px-2 py-2.5 text-right font-mono text-ink-400">{r.fmt(r.b ?? 0)}</td>}
                {before && (
                  <td className="px-5 py-2.5 text-right">
                    <span
                      className={cn(
                        "tnum inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium",
                        good === null ? "bg-white/[0.06] text-ink-300" : good ? "bg-forest-400/15 text-forest-200" : "bg-danger-500/15 text-[#f3a59c]",
                      )}
                    >
                      {d === null ? (
                        "New"
                      ) : d === 0 ? (
                        "Same"
                      ) : (
                        <>
                          {d > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {Math.abs(d)}%
                        </>
                      )}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-white/[0.08] px-5 py-3 text-xs leading-relaxed text-ink-400">
        {before ? `${before.year} figures are as they stand today. A cycle in progress will trail one that has finished.` : "Comparisons appear once a second cycle opens."}
      </p>
    </div>
  );
}

function Ledger({
  groups,
}: {
  groups: { title: string; rows: { label: string; value: string; note?: string; danger?: boolean; warn?: boolean }[] }[];
}) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">{g.title}</p>
          <ul className="space-y-2">
            {g.rows.map((r) => (
              <li key={r.label} className="flex items-end text-sm">
                <span className="text-ink-700">
                  {r.label}
                  {r.note && <span className="ml-1.5 text-xs text-ink-400">· {r.note}</span>}
                </span>
                <span className="leader" aria-hidden />
                <span className={cn("tnum whitespace-nowrap font-mono text-[0.875rem] font-medium", r.danger ? "text-danger-600" : r.warn ? "text-ember-700" : "text-ink-950")}>{r.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PackageMix({ rows }: { rows: ExecutiveBrief["packages"] }) {
  const sorted = [...rows].sort((a, b) => Number(b.expected_kobo) - Number(a.expected_kobo));
  const booked = sorted.reduce((t, r) => t + Number(r.expected_kobo), 0);
  const top = Math.max(...sorted.map((r) => Number(r.expected_kobo)), 1);
  if (!booked) return <p className="text-sm text-ink-500">Package figures appear once customers start paying.</p>;
  return (
    <div>
      <ul className="space-y-3.5">
        {sorted.map((r) => {
          const exp = Number(r.expected_kobo);
          const col = Number(r.collected_kobo);
          const share = percent(exp, booked);
          return (
            <li key={r.package_id} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem_3rem]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{r.package_name}</p>
                <p className="text-xs text-ink-400">{plural(Number(r.customers), "customer")}</p>
              </div>
              <div
                className="flex h-3 gap-[2px]"
                style={{ width: `${Math.max(2, (exp / top) * 100)}%` }}
                title={`${r.package_name}: ${naira(col)} collected of ${naira(exp)} booked`}
              >
                {exp > 0 && col > 0 && <span className="h-full rounded-l-[4px]" style={{ width: `${(col / exp) * 100}%`, background: C.contributions }} />}
                {exp - col > 0 && <span className={cn("h-full rounded-r-[4px]", col === 0 && "rounded-l-[4px]")} style={{ width: `${((exp - col) / exp) * 100}%`, background: C.remaining }} />}
                {exp === 0 && <span className="h-full w-full rounded-[4px]" style={{ background: C.grid }} />}
              </div>
              <p className="tnum text-right font-mono text-[0.8125rem] font-medium text-ink-900">{nairaShort(exp)}</p>
              <p className="tnum hidden text-right font-mono text-xs text-ink-400 sm:block">{share}%</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap gap-4 text-xs font-medium text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: C.contributions }} /> Collected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: C.remaining }} /> Still to collect
          </span>
        </div>
        <p className="tnum font-mono text-xs text-ink-500">
          {nairaShort(booked)} booked across {sorted.filter((r) => Number(r.customers) > 0).length} packages
        </p>
      </div>
    </div>
  );
}
