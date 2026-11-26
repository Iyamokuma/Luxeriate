import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Download,
  Gift,
  MapPin,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ProgressRing } from "@/components/ui/progress";
import { FulfilmentTracker } from "@/components/dashboard/fulfilment-tracker";
import { MonthGrid } from "@/components/dashboard/month-grid";
import { PayButton } from "@/components/dashboard/pay-button";
import { ReferralShare } from "@/components/dashboard/referral-share";
import { Timeline } from "@/components/dashboard/timeline";
import { PaymentFeedback } from "@/components/dashboard/welcome";
import { CHANNEL_LABEL, ENROLLMENT_LABEL } from "@/lib/constants";
import { env } from "@/lib/env";
import { formatDate, formatMonth, greeting, monthName, naira, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrollmentEvent, EnrollmentOverview, InstallmentOverview, PaymentOverview, Profile } from "@/types/db";
import { ArcsMotif } from "@/components/ui/logo";

export function DashboardOverview({
  name,
  enrollments,
  e,
  installments,
  events,
  payments,
  profile,
  payParam,
}: {
  name: string;
  enrollments: EnrollmentOverview[];
  e: EnrollmentOverview;
  installments: InstallmentOverview[];
  events: EnrollmentEvent[];
  payments: PaymentOverview[];
  profile: Pick<Profile, "dva_account_number" | "dva_bank_name" | "dva_account_name">;
  payParam: boolean;
}) {
  const unpaid = installments.filter((i) => !i.paid_at);
  const next = unpaid[0];
  const pct = percent(e.paid_kobo, e.total_kobo);
  const lateCount = installments.filter((i) => i.state === "late").length;
  const dueCount = installments.filter((i) => i.state === "due" || i.state === "late").length;
  const nextMonths = unpaid.map((i) => formatMonth(i.period_month, "short"));
  const autoOpenPay = payParam && e.status === "active";

  return (
    <div className="space-y-8">
      <PaymentFeedback customerCode={e.customer_code} referralCode={e.referral_code} packageName={e.package_name} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Greeting name={name} subtitle={e.status === "completed" ? "Your contributions are complete." : undefined} />
        {enrollments.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {enrollments.map((x) => (
              <Link
                key={x.id}
                href={`/dashboard?e=${x.id}`}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  x.id === e.id ? "border-forest-700 bg-forest-700 text-cream" : "border-line-strong bg-cream text-ink-600 hover:text-ink-900",
                )}
              >
                {x.package_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {e.status === "pending_payment" ? (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-forest-800 p-7 text-cream shadow-float sm:p-10">
          <ArcsMotif className="absolute -right-10 -top-16 h-80 text-honey-300/30" />
          <div className="relative max-w-xl">
            <Badge tone="light" dot pulse>
              Awaiting first payment
            </Badge>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              One step left to activate your <span className="text-honey-200">{e.package_name}</span> package
            </h2>
            <p className="mt-3 text-forest-100/80">
              Pay the {naira(e.registration_fee_kobo)} registration fee and your first month. Your customer ID is issued the moment
              Paystack confirms it.
            </p>
            <div className="mt-7">
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                registrationKobo={e.registration_fee_kobo}
                creditKobo={e.credit_kobo}
                nextMonths={nextMonths}
                variant="light"
                label={`Pay ${naira(e.registration_fee_kobo + e.monthly_amount_kobo - e.credit_kobo)} now`}
                autoOpen={payParam}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Progress hero */}
          <div className="relative overflow-hidden rounded-[1.75rem] bg-forest-800 p-6 text-cream shadow-float sm:p-8">
            <ArcsMotif className="absolute -right-14 -top-20 h-[22rem] text-honey-300/25" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="eyebrow text-honey-300">{e.package_name}</p>
                <Badge tone="light" size="sm">
                  {ENROLLMENT_LABEL[e.status]}
                </Badge>
              </div>
              {e.customer_code && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-3 pr-0.5 font-mono text-xs tracking-wide text-forest-50">
                  {e.customer_code}
                  <CopyButton value={e.customer_code} iconOnly variant="outline-light" className="size-7 border-0" label="Copy customer ID" />
                </span>
              )}
            </div>

            <div className="relative mt-7 flex flex-col gap-7 sm:flex-row sm:items-center">
              <ProgressRing value={pct} size={156} stroke={13} trackClassName="stroke-white/10" barClassName="stroke-honey-300">
                <span className="tnum font-display text-4xl font-semibold">{e.paid_count}</span>
                <span className="text-xs text-forest-100/70">of {e.duration_months} months</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-forest-100/70">Saved so far</p>
                <p className="tnum font-display text-4xl font-semibold tracking-tight sm:text-5xl">{naira(e.paid_kobo)}</p>
                <p className="tnum mt-1 text-forest-100/80">of {naira(e.total_kobo)} · {pct}% complete</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-honey-200 to-honey-400 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
                </div>
                {e.credit_kobo > 0 && (
                  <p className="mt-3 text-xs text-honey-200">{naira(e.credit_kobo)} credit will be applied to your next payment.</p>
                )}
              </div>
            </div>
          </div>

          {/* Next payment */}
          <Card className="flex flex-col">
            {e.status === "completed" ? (
              <CardContent className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                  <BadgeCheck className="size-7" />
                </span>
                <p className="mt-4 font-display text-2xl font-semibold text-ink-900">All paid up</p>
                <p className="mt-1 text-sm text-ink-500">Completed {formatDate(e.completed_at)}. Follow your package below.</p>
              </CardContent>
            ) : next ? (
              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-500">Next payment</p>
                  {lateCount > 0 ? (
                    <Badge tone="danger" dot>
                      {lateCount} late
                    </Badge>
                  ) : dueCount > 0 ? (
                    <Badge tone="clay" dot pulse>
                      Due now
                    </Badge>
                  ) : (
                    <Badge tone="forest">On track</Badge>
                  )}
                </div>
                <p className="mt-4 font-display text-xl text-ink-700">{formatMonth(next.period_month)}</p>
                <p className="tnum font-display text-4xl font-semibold tracking-tight text-ink-900">{naira(next.amount_kobo)}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
                  <CalendarClock className="size-4" /> Due {formatDate(next.due_date, "long")}
                </p>
                {dueCount > 1 && (
                  <p className="mt-3 rounded-xl bg-clay-50 px-3 py-2 text-[0.8125rem] text-clay-700">
                    {dueCount} months are due. You can pay them together.
                  </p>
                )}
                <div className="mt-auto pt-6">
                  <PayButton
                    enrollmentId={e.id}
                    monthlyKobo={e.monthly_amount_kobo}
                    remainingMonths={unpaid.length}
                    creditKobo={e.credit_kobo}
                    defaultMonths={Math.max(1, dueCount)}
                    nextMonths={nextMonths}
                    block
                    label="Pay now"
                    autoOpen={autoOpenPay}
                  />
                  <p className="mt-2.5 text-center text-xs text-ink-400">Card, bank transfer or USSD</p>
                </div>
              </CardContent>
            ) : null}
          </Card>
        </section>
      )}

      {/* Month by month */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Month by month</CardTitle>
            <p className="mt-0.5 text-sm text-ink-500">
              {monthName(installments[0]?.period_month ?? e.package_start_month, "long")} to{" "}
              {formatMonth(installments[installments.length - 1]?.period_month ?? e.package_start_month)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-ink-500">
            <Legend className="bg-forest-600" label="Paid" />
            <Legend className="bg-clay-500" label="Due" />
            <Legend className="bg-danger-500" label="Late" />
            <Legend className="bg-ink-200" label="Upcoming" />
          </div>
        </CardHeader>
        <CardContent>
          <MonthGrid installments={installments} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Your package</CardTitle>
              <p className="text-sm text-ink-500">
                {e.status === "completed"
                  ? "We'll email you at every step until collection."
                  : "Once every month is paid, we buy and pack your foodstuff."}
              </p>
            </CardHeader>
            <CardContent className="pt-7">
              <FulfilmentTracker enrollment={e} />
              {e.collection_point_name && e.fulfilment_status !== "collection_scheduled" && (
                <p className="mt-6 flex items-start gap-2 rounded-2xl bg-sand/70 px-4 py-3 text-sm text-ink-600">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-clay-500" />
                  <span>
                    Collection point: <span className="font-semibold text-ink-900">{e.collection_point_name}</span>
                    {e.collection_point_address ? `, ${e.collection_point_address}` : ""}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent receipts</CardTitle>
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
                    <li key={p.id} className="flex items-center gap-4 py-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                        <Receipt className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {p.months_label ?? (p.registration_kobo ? "Registration" : "Credit")}
                          {p.registration_kobo > 0 && p.months_label ? " + registration" : ""}
                        </p>
                        <p className="text-xs text-ink-400">
                          {formatDate(p.paid_at)} · {CHANNEL_LABEL[p.channel ?? ""] ?? p.channel} · {p.receipt_number}
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
        </div>

        <div className="space-y-5">
          {e.referral_code && (
            <div className="relative overflow-hidden rounded-[1.25rem] border border-honey-200 bg-honey-50 p-6">
              <ArcsMotif className="absolute -right-6 -top-8 h-32 text-honey-300/40" />
              <div className="relative">
                <p className="flex items-center gap-2 text-sm font-semibold text-honey-700">
                  <Sparkles className="size-4" /> Your referral code
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-wider text-ink-900">{e.referral_code}</p>
                <p className="mt-1 text-sm text-ink-600">Share it with friends and family when they join.</p>
                <div className="mt-4">
                  <ReferralShare code={e.referral_code} siteUrl={env.siteUrl} compact />
                </div>
              </div>
            </div>
          )}

          {e.savings_return_kobo > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-honey-100 text-honey-700">
                    <Gift className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-500">Savings return</p>
                    <p className="tnum font-display text-2xl font-semibold text-ink-900">{naira(e.savings_return_kobo)}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {e.savings_return_status === "paid"
                        ? `Paid ${formatDate(e.savings_return_paid_at)}`
                        : e.savings_return_status === "pending"
                          ? "Due to you now. We'll mark it paid when it's sent."
                          : "Paid to you after your final month."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} /> {label}
    </span>
  );
}

