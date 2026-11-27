import Link from "next/link";
import { ArrowDownRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { PayButton } from "@/components/dashboard/pay-button";
import { FULFILMENT_LABEL } from "@/lib/constants";
import type { PaymentRecord, Standing } from "@/lib/customer-insights";
import { formatDate, formatMonth, greeting, monthName, naira, percent, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrollmentOverview, InstallmentOverview } from "@/types/db";

/**
 * The top of the customer dashboard: where this plan stands, what to do next,
 * and the customer's own package box filling month by month.
 */
export function PlanHero({
  name,
  enrollments,
  e,
  installments,
  standing: s,
  record,
  payParam,
}: {
  name: string;
  enrollments: EnrollmentOverview[];
  e: EnrollmentOverview;
  installments: InstallmentOverview[];
  standing: Standing;
  record: PaymentRecord;
  payParam: boolean;
}) {
  const pct = percent(e.paid_kobo, e.total_kobo);
  const unpaid = installments.filter((i) => !i.paid_at);
  const nextMonths = unpaid.map((i) => formatMonth(i.period_month, "short"));
  const dueKobo = s.kind === "late" || s.kind === "due" ? s.dueNow.reduce((t, i) => t + Number(i.amount_kobo), 0) : 0;
  const pending = e.status === "pending_payment";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-2xl">
          {greeting()}, {name}
        </h1>
        {enrollments.length > 1 && <PlanSwitcher enrollments={enrollments} current={e.id} />}
      </div>

      {/* the account: balance first, like a bank card */}
      <div className="overflow-hidden rounded-3xl bg-night text-cream shadow-lift">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-300">
              {e.package_name} savings · {e.cycle_year}
            </p>
            <div className="mt-1 flex items-center gap-1 font-mono text-xs tracking-wide text-ink-400">
              {e.customer_code ? (
                <>
                  {e.customer_code}
                  <CopyButton value={e.customer_code} iconOnly variant="ghost" className="size-6 text-ink-400 hover:bg-white/10 hover:text-cream" label="Copy customer ID" />
                </>
              ) : (
                "Account number issued on payment"
              )}
            </div>
            <p className="mt-7 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">{pending ? "To activate" : "Balance"}</p>
            <p className="tnum mt-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
              {naira(pending ? e.registration_fee_kobo + e.monthly_amount_kobo - e.credit_kobo : e.paid_kobo)}
            </p>
            <p className="tnum mt-2 text-sm text-ink-300">
              {pending ? `${naira(e.registration_fee_kobo)} registration + first month` : `of ${naira(e.total_kobo)} goal · ${pct}%`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {pending ? (
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                registrationKobo={e.registration_fee_kobo}
                creditKobo={e.credit_kobo}
                nextMonths={nextMonths}
                variant="leaf"
                label="Pay to activate"
                autoOpen={payParam}
              />
            ) : unpaid.length > 0 ? (
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                creditKobo={e.credit_kobo}
                defaultMonths={s.kind === "late" || s.kind === "due" ? Math.max(1, s.dueNow.length) : 1}
                nextMonths={nextMonths}
                variant="leaf"
                label={dueKobo > 0 ? `Pay ${naira(Math.max(100, dueKobo - e.credit_kobo))}` : "Pay ahead"}
                autoOpen={payParam}
              />
            ) : (
              <Button asChild variant="leaf">
                <a href="#package">
                  Track package <ArrowDownRight />
                </a>
              </Button>
            )}
            {!pending && (
              <Button asChild variant="outline-light">
                <Link href="/dashboard/payments">
                  <Receipt /> Statement
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="h-1 bg-white/10" role="img" aria-label={`${pct}% of your goal saved`}>
          <div className="h-full bg-leaf-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* the few facts that matter */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-cream lg:grid-cols-4">
        {s.kind === "late" ? (
          <Fact label="Overdue" sub={`Since ${formatDate(s.late[0].due_date, "short")}`} tone="danger">
            {naira(s.overdueKobo)}
          </Fact>
        ) : (
          <Fact label={e.status === "completed" ? "Completed" : "Next payment"} sub={nextSub(e, unpaid[0])}>
            {e.status === "completed" ? formatDate(e.completed_at) : unpaid[0] ? formatDate(unpaid[0].due_date, "short") : "—"}
          </Fact>
        )}
        <Fact label="Months paid" sub={`${plural(unpaid.length, "month")} to go`}>
          {e.paid_count} of {e.duration_months}
        </Fact>
        <Fact label="Paid on time" sub={record.streak > 1 ? `${record.streak} in a row` : undefined}>
          {record.counted ? `${record.onTime} of ${record.counted}` : "—"}
        </Fact>
        {e.savings_return_kobo > 0 ? (
          <Fact label="Savings return" sub={e.savings_return_status === "paid" ? "Paid" : "After your final month"}>
            {naira(e.savings_return_kobo)}
          </Fact>
        ) : (
          <Fact label="Collection point" sub={e.collection_point_address ?? undefined}>
            {e.collection_point_name ?? "—"}
          </Fact>
        )}
      </dl>
    </section>
  );
}

function nextSub(e: EnrollmentOverview, next?: InstallmentOverview) {
  if (e.status === "completed") return FULFILMENT_LABEL[e.fulfilment_status];
  if (!next) return undefined;
  return `${naira(next.amount_kobo)} for ${monthName(next.period_month, "long")}`;
}

function PlanSwitcher({ enrollments, current }: { enrollments: EnrollmentOverview[]; current: string }) {
  return (
    <nav aria-label="Your plans" className="scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-full bg-sand p-1 ring-1 ring-inset ring-line">
      {enrollments.map((x) => {
        const active = x.id === current;
        const dot =
          x.status === "pending_payment"
            ? "bg-ink-400"
            : x.status === "completed"
              ? "bg-leaf-300"
              : x.late_count > 0
                ? "bg-[#f07a6d]"
                : "bg-forest-300";
        return (
          <Link
            key={x.id}
            href={`/dashboard?e=${x.id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              active ? "bg-cream text-ink-950 shadow-soft ring-1 ring-line" : "text-ink-500 hover:text-ink-900",
            )}
          >
            <span className={cn("size-1.5 rounded-full", dot)} />
            {x.package_name}
            <span className={cn("font-mono text-[0.6875rem] font-medium", active ? "text-ink-400" : "text-ink-500")}>{x.cycle_year}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Fact({ label, sub, tone, children }: { label: string; sub?: string; tone?: "danger"; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border-line px-5 py-4 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
      <dt className={cn("text-xs font-medium", tone === "danger" ? "text-danger-600" : "text-ink-500")}>{label}</dt>
      <dd className={cn("tnum mt-1 truncate text-[0.9375rem] font-semibold", tone === "danger" ? "text-danger-700" : "text-ink-900")}>{children}</dd>
      {sub && <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>}
    </div>
  );
}
