import Link from "next/link";
import { ArrowUpRight, Building2, Download, Flame, Receipt, Sparkles, Timer, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ArcsMotif } from "@/components/ui/logo";
import { ProgressRing } from "@/components/ui/progress";
import { Basket } from "@/components/dashboard/basket";
import { JourneyChart } from "@/components/dashboard/journey-chart";
import { MonthGrid } from "@/components/dashboard/month-grid";
import { PlanHero } from "@/components/dashboard/plan-hero";
import { ReferralShare } from "@/components/dashboard/referral-share";
import { Timeline } from "@/components/dashboard/timeline";
import { PaymentFeedback } from "@/components/dashboard/welcome";
import { CHANNEL_LABEL } from "@/lib/constants";
import { journey, paymentRecord, standing, type PaymentRecord } from "@/lib/customer-insights";
import { env } from "@/lib/env";
import { formatDate, formatMonth, greeting, lagosToday, naira, percent, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrollmentEvent, EnrollmentOverview, InstallmentOverview, PackageItem, PaymentOverview, Profile } from "@/types/db";

export function DashboardOverview({
  name,
  enrollments,
  e,
  installments,
  events,
  payments,
  items,
  profile,
  payParam,
}: {
  name: string;
  enrollments: EnrollmentOverview[];
  e: EnrollmentOverview;
  installments: InstallmentOverview[];
  events: EnrollmentEvent[];
  payments: PaymentOverview[];
  items: PackageItem[];
  profile: Pick<Profile, "dva_account_number" | "dva_bank_name" | "dva_account_name">;
  payParam: boolean;
}) {
  const today = lagosToday();
  const s = standing(e, installments, today);
  const record = paymentRecord(installments, payments);
  const points = journey(installments, today);
  const lastMonth = installments[installments.length - 1]?.period_month ?? e.package_start_month;
  const done = e.status === "completed";
  const pending = e.status === "pending_payment";

  const receipts = (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Recent receipts</CardTitle>
          <p className="mt-0.5 text-sm text-ink-500">Confirmed by Paystack. A PDF copy for every payment.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/payments">
            All payments <ArrowUpRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">Your receipts will appear here after your first payment.</p>
        ) : (
          <ul className="divide-y divide-line">
            {payments.slice(0, 4).map((p) => (
              <li key={p.id} className="group flex items-center gap-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-100">
                  <Receipt className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {p.months_label ?? (p.registration_kobo ? "Registration" : "Credit")}
                    {p.registration_kobo > 0 && p.months_label ? " + registration" : ""}
                  </p>
                  <p className="truncate text-xs text-ink-400">
                    {formatDate(p.paid_at)} · {CHANNEL_LABEL[p.channel ?? ""] ?? p.channel} · <span className="font-mono">{p.receipt_number}</span>
                  </p>
                </div>
                <p className="tnum text-sm font-semibold text-ink-900">{naira(p.amount_kobo)}</p>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Download receipt">
                  <a href={`/api/receipts/${p.id}`} target="_blank" rel="noreferrer">
                    <Download />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      <PaymentFeedback customerCode={e.customer_code} referralCode={e.referral_code} packageName={e.package_name} />

      <PlanHero name={name} enrollments={enrollments} e={e} installments={installments} standing={s} record={record} payParam={payParam} />

      {done && <Basket e={e} items={items} lastMonth={lastMonth} />}

      {!pending && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Savings against plan</CardTitle>
              <p className="text-sm text-ink-500">What you&apos;ve put away, and what the schedule expects by each due date</p>
            </CardHeader>
            <CardContent className="pt-5">
              <JourneyChart points={points} />
            </CardContent>
          </Card>
          <RecordCard record={record} e={e} />
        </div>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Month by month</CardTitle>
            <p className="mt-0.5 text-sm text-ink-500">
              {formatMonth(installments[0]?.period_month ?? e.package_start_month)} to {formatMonth(lastMonth)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-ink-500">
            <Key className="bg-forest-600" label="Paid" />
            <Key className="bg-tide-500" label="Due" />
            <Key className="bg-danger-500" label="Late" />
            <Key className="bg-ink-200" label="Upcoming" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <MonthGrid installments={installments} today={today} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {!done && <Basket e={e} items={items} lastMonth={lastMonth} />}
          {receipts}
        </div>

        <div className="min-w-0 space-y-5">
          {e.referral_code && (
            <div className="relative overflow-hidden rounded-[1.25rem] bg-forest-800 p-6 text-cream shadow-float">
              <ArcsMotif className="absolute -right-10 -top-12 h-44 text-leaf-300/20" />
              <div className="relative">
                <p className="flex items-center gap-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-leaf-300">
                  <Sparkles className="size-3.5" /> Your referral code
                </p>
                <p className="mt-3 font-mono text-[1.75rem] font-semibold tracking-[0.08em]">{e.referral_code}</p>
                <p className="mt-1 text-sm text-forest-100/80">Friends and family enter it when they register. Luxuriate rewards top referrers.</p>
                <div className="mt-5 [&_a]:border-white/20 [&_a]:bg-white/10 [&_a]:text-cream [&_a:hover]:bg-white/15 [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-cream [&_button:hover]:bg-white/15">
                  <ReferralShare code={e.referral_code} siteUrl={env.siteUrl} compact />
                </div>
                <Link href="/dashboard/referrals" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-leaf-200 hover:text-leaf-100">
                  See who joined with your code <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}

          {profile.dva_account_number && (
            <Card>
              <CardContent>
                <p className="flex items-center gap-2 text-sm font-medium text-ink-500">
                  <Building2 className="size-4" /> Your personal account number
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-wider text-ink-900">{profile.dva_account_number}</p>
                <p className="text-sm text-ink-500">
                  {profile.dva_bank_name} · {profile.dva_account_name}
                </p>
                <p className="mt-3 text-xs text-ink-400">Transfer from any banking app. Payments are matched to you automatically.</p>
                <CopyButton value={profile.dva_account_number} className="mt-4" label="Copy account number" />
              </CardContent>
            </Card>
          )}

          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline events={events} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ record, e }: { record: PaymentRecord; e: EnrollmentOverview }) {
  const pct = percent(record.onTime, record.counted);
  const rows: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[] = [
    { icon: Flame, label: "Current streak", value: record.streak ? plural(record.streak, "month") : "—" },
    { icon: Timer, label: "Months paid ahead", value: record.aheadMonths ? plural(record.aheadMonths, "month") : "None yet" },
    { icon: Receipt, label: "Payments made", value: record.payments ? `${record.payments} · ${naira(record.totalKobo)}` : "—" },
    { icon: Wallet, label: "Usually pays by", value: record.preferred ?? "—" },
  ];
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Your record</CardTitle>
        <p className="text-sm text-ink-500">How reliably your months have come in</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={record.counted ? pct : 0} size={104} stroke={9} barClassName={cn(pct >= 90 ? "stroke-forest-600" : pct >= 60 ? "stroke-tide-500" : "stroke-danger-500")}>
            <span className="tnum text-[1.375rem] font-semibold leading-none tracking-[-0.02em] text-ink-900">{record.counted ? `${pct}%` : "—"}</span>
            <span className="mt-1 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-400">on time</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-semibold text-ink-900">
              {record.counted ? `${record.onTime} of ${record.counted} months on time` : "Your record starts with your first month"}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {e.late_count > 0
                ? `${plural(e.late_count, "month")} past the grace period.`
                : record.counted && record.onTime === record.counted
                  ? "Not a single month late. Well done."
                  : "Paid on or before the due date counts as on time."}
            </p>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-line border-t border-line">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-3">
              <dt className="inline-flex items-center gap-2.5 text-sm text-ink-500">
                <Icon className="size-4 text-ink-400" /> {label}
              </dt>
              <dd className="tnum truncate text-sm font-semibold text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function Greeting({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
        {greeting()}, <span className="text-forest-700">{name}</span>
      </h1>
      <p className="mt-1.5 text-ink-500">{subtitle ?? "Here's where your foodstuff savings stand."}</p>
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} /> {label}
    </span>
  );
}
