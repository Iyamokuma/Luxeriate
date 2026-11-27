import Link from "next/link";
import { ArrowDownRight, Check, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ArcsMotif } from "@/components/ui/logo";
import { PackageBox } from "@/components/dashboard/package-box";
import { PayButton } from "@/components/dashboard/pay-button";
import { FULFILMENT_LABEL } from "@/lib/constants";
import { boxItems, type PaymentRecord, type Standing } from "@/lib/customer-insights";
import { formatDate, formatDateTime, formatMonth, greeting, monthName, naira, nairaShort, percent, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrollmentOverview, InstallmentOverview } from "@/types/db";

const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" });

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
  const items = boxItems(e);
  const totalSaved = enrollments.reduce((t, x) => t + Number(x.paid_kobo), 0);
  const dueKobo = s.kind === "late" || s.kind === "due" ? s.dueNow.reduce((t, i) => t + Number(i.amount_kobo), 0) : 0;
  const lastMonth = installments[installments.length - 1]?.period_month ?? e.package_start_month;

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-night text-cream shadow-[0_40px_80px_-40px_rgb(10_8_5/0.65)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(207_158_41/0.18),transparent_60%),radial-gradient(50%_70%_at_0%_100%,rgb(1_78_34/0.45),transparent_70%)]"
      />
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-40 invert [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <ArcsMotif className="pointer-events-none absolute -left-24 -top-40 h-[26rem] w-auto text-honey-300/[0.05]" />

      <div className="relative grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        {/* ── what's happening ─────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col p-6 sm:p-8 xl:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-400">{longDay.format(new Date())}</p>
            {enrollments.length > 1 && <PlanSwitcher enrollments={enrollments} current={e.id} />}
          </div>

          <h1 className="mt-6 text-[2rem] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[2.6rem]">
            {greeting()}, <span className="text-honey-300">{name}</span>
          </h1>
          <StatusLine e={e} s={s} dueKobo={dueKobo} />

          <div className="mt-9">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-400">
              {e.status === "pending_payment" ? "To activate" : "Saved"} · {e.package_name} · {e.cycle_year}
            </p>
            {e.status === "pending_payment" ? (
              <p className="tnum mt-2.5 bg-gradient-to-b from-honey-100 via-honey-300 to-honey-500 bg-clip-text text-[2.75rem] font-semibold leading-none tracking-[-0.045em] text-transparent sm:text-[3.5rem]">
                {naira(e.registration_fee_kobo + e.monthly_amount_kobo - e.credit_kobo)}
              </p>
            ) : (
              <p className="tnum mt-2.5 bg-gradient-to-b from-honey-100 via-honey-300 to-honey-500 bg-clip-text text-[2.75rem] font-semibold leading-none tracking-[-0.045em] text-transparent sm:text-[3.75rem]">
                {naira(e.paid_kobo)}
              </p>
            )}
            <p className="tnum mt-2.5 text-[0.9375rem] text-ink-300">
              {e.status === "pending_payment" ? (
                <>
                  {naira(e.registration_fee_kobo)} registration + your first month of {naira(e.monthly_amount_kobo)}
                </>
              ) : (
                <>
                  of {naira(e.total_kobo)} · {e.paid_count} of {e.duration_months} months · {pct}%
                </>
              )}
            </p>
          </div>

          <MonthMeter installments={installments} />
          <p className="mt-2 flex justify-between font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-400">
            <span>{monthName(installments[0]?.period_month ?? e.package_start_month)}</span>
            <span>{e.credit_kobo > 0 ? `${naira(e.credit_kobo)} credit held` : ""}</span>
            <span>{monthName(lastMonth)} {lastMonth.slice(0, 4)}</span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            {e.status === "pending_payment" ? (
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                registrationKobo={e.registration_fee_kobo}
                creditKobo={e.credit_kobo}
                nextMonths={nextMonths}
                variant="gold"
                label={`Pay ${naira(e.registration_fee_kobo + e.monthly_amount_kobo - e.credit_kobo)} to activate`}
                autoOpen={payParam}
              />
            ) : s.kind === "late" || s.kind === "due" ? (
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                creditKobo={e.credit_kobo}
                defaultMonths={Math.max(1, s.dueNow.length)}
                nextMonths={nextMonths}
                variant="gold"
                label={`Pay ${naira(Math.max(100, dueKobo - e.credit_kobo))} now`}
                autoOpen={payParam}
              />
            ) : s.kind === "ahead" && unpaid.length > 0 ? (
              <PayButton
                enrollmentId={e.id}
                monthlyKobo={e.monthly_amount_kobo}
                remainingMonths={unpaid.length}
                creditKobo={e.credit_kobo}
                nextMonths={nextMonths}
                variant="gold"
                label="Pay ahead"
                autoOpen={payParam}
              />
            ) : (
              <Button asChild variant="gold" size="lg">
                <a href="#package">
                  Track your package <ArrowDownRight />
                </a>
              </Button>
            )}
            {e.status !== "pending_payment" && (
              <Button asChild variant="outline-light" size="lg">
                <Link href="/dashboard/payments">
                  <Receipt /> Receipts
                </Link>
              </Button>
            )}
            <span className="w-full text-xs text-ink-400 sm:ml-2 sm:w-auto">
              {e.status === "completed" ? "Every month is paid" : "Card, bank transfer or USSD · secured by Paystack"}
            </span>
          </div>
        </div>

        {/* ── the box ──────────────────────────────────────────────── */}
        <div className="relative min-h-[19rem] border-t border-white/[0.06] sm:min-h-[22rem] lg:border-l lg:border-t-0">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_58%,rgb(233_199_107/0.16),transparent_70%)]" />
          <PackageBox
            filled={items}
            label={`Your ${e.package_name} box with ${items} of 12 items in it, one for each month paid. Drag to turn it.`}
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 sm:inset-x-7 sm:bottom-7">
            <div className="rounded-2xl bg-night-2/75 px-4 py-3 ring-1 ring-inset ring-white/10 backdrop-blur-md">
              <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-honey-300">Your box</p>
              <p className="mt-1 text-sm text-ink-200">
                <span className="tnum font-semibold text-cream">{items}</span> of 12 items in
              </p>
            </div>
            {enrollments.length > 1 && (
              <div className="hidden rounded-2xl bg-night-2/75 px-4 py-3 text-right ring-1 ring-inset ring-white/10 backdrop-blur-md sm:block">
                <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">All {enrollments.length} plans</p>
                <p className="tnum mt-1 text-sm font-semibold text-cream">{nairaShort(totalSaved)} saved</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── the facts ──────────────────────────────────────────────── */}
      <dl className="relative grid grid-cols-2 border-t border-white/[0.08] lg:grid-cols-4">
        <Fact label="Customer ID" className="col-span-2 border-b lg:col-span-1 lg:border-b-0 lg:border-r">
          {e.customer_code ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono tracking-wide">{e.customer_code}</span>
              <CopyButton value={e.customer_code} iconOnly variant="ghost" className="size-7 text-ink-300 hover:bg-white/10 hover:text-cream" label="Copy customer ID" />
            </span>
          ) : (
            <span className="text-ink-400">Issued on payment</span>
          )}
        </Fact>
        {s.kind === "late" ? (
          <Fact label="Overdue" sub={`Since ${formatDate(s.late[0].due_date, "short")}`} className="border-b border-r lg:border-b-0" tone="danger">
            {naira(s.overdueKobo)}
          </Fact>
        ) : (
          <Fact label={e.status === "completed" ? "Completed" : "Next payment"} sub={nextSub(e, unpaid[0])} className="border-b border-r lg:border-b-0">
            {e.status === "completed" ? formatDate(e.completed_at) : unpaid[0] ? formatDate(unpaid[0].due_date, "short") : "—"}
          </Fact>
        )}
        <Fact
          label="Paid on time"
          sub={record.streak > 1 ? `${record.streak} in a row` : record.counted ? "Every month counts" : "Starts with your first month"}
          className="border-b lg:border-b-0 lg:border-r"
        >
          {record.counted ? `${record.onTime} of ${record.counted}` : "—"}
        </Fact>
        {e.savings_return_kobo > 0 ? (
          <Fact
            label="Savings return"
            sub={e.savings_return_status === "paid" ? `Paid ${formatDate(e.savings_return_paid_at, "short")}` : e.savings_return_status === "pending" ? "Due to you now" : "After your final month"}
            className="col-span-2 lg:col-span-1"
          >
            {naira(e.savings_return_kobo)}
          </Fact>
        ) : (
          <Fact label="Collection point" sub={e.collection_point_address ?? undefined} className="col-span-2 lg:col-span-1">
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

function StatusLine({ e, s, dueKobo }: { e: EnrollmentOverview; s: Standing; dueKobo: number }) {
  let tone: "danger" | "honey" | "good" | "gold" | "muted" = "muted";
  let chip = "";
  let text: React.ReactNode = "";
  if (s.kind === "pending") {
    chip = "Awaiting first payment";
    text = "Pay your registration fee and first month. Your customer ID is issued the moment Paystack confirms it.";
  } else if (s.kind === "late") {
    tone = "danger";
    chip = `${plural(s.late.length, "month")} overdue`;
    text = (
      <>
        Pay <span className="tnum font-semibold text-cream">{naira(dueKobo)}</span> to bring your {e.package_name} plan back on track.
      </>
    );
  } else if (s.kind === "due") {
    tone = "honey";
    chip = s.daysLeft <= 0 ? "Due today" : s.daysLeft === 1 ? "Due tomorrow" : `Due in ${s.daysLeft} days`;
    text = (
      <>
        Your {monthName(s.next.period_month, "long")} contribution of <span className="tnum font-semibold text-cream">{naira(s.next.amount_kobo)}</span> is due on{" "}
        {formatDate(s.next.due_date, "long").replace(/ \d{4}$/, "")}.
      </>
    );
  } else if (s.kind === "ahead") {
    tone = "good";
    chip = "On track";
    text = s.next
      ? s.paidThrough
        ? `You're paid up to ${formatMonth(s.paidThrough.period_month)}. Your next payment is due ${formatDate(s.next.due_date, "long").replace(/ \d{4}$/, "")}.`
        : `Your first month is due ${formatDate(s.next.due_date, "long")}.`
      : "Every month is paid.";
  } else {
    tone = "gold";
    chip = FULFILMENT_LABEL[e.fulfilment_status] === "Not started" ? "Completed" : FULFILMENT_LABEL[e.fulfilment_status];
    text =
      e.fulfilment_status === "collected"
        ? "Collected. Thank you for saving with Luxuriate."
        : e.fulfilment_status === "collection_scheduled" && e.collection_scheduled_for
          ? `Collect your package ${formatDateTime(e.collection_scheduled_for)} at ${e.collection_point_name ?? "your collection point"}.`
          : e.fulfilment_status === "ready"
            ? "Your package is packed and waiting. We'll confirm your collection date."
            : e.fulfilment_status === "preparing"
              ? "Every month is paid. We're buying and packing your foodstuff now."
              : "Every month is paid. We'll let you know as your package is prepared.";
  }
  const chipCls = {
    danger: "bg-danger-500/15 text-[#f3a59c] ring-danger-500/30",
    honey: "bg-honey-400/12 text-honey-200 ring-honey-400/30",
    good: "bg-forest-400/15 text-forest-200 ring-forest-400/30",
    gold: "bg-honey-400/12 text-honey-200 ring-honey-400/30",
    muted: "bg-white/[0.06] text-ink-200 ring-white/15",
  }[tone];
  const dot = { danger: "bg-[#f07a6d]", honey: "bg-honey-300", good: "bg-forest-300", gold: "bg-honey-300", muted: "bg-ink-300" }[tone];
  return (
    <div className="mt-3 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", chipCls)}>
        {tone === "gold" ? (
          <Check className="size-3" strokeWidth={3} />
        ) : (
          <span className="relative flex size-1.5">
            {(tone === "danger" || tone === "honey") && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", dot)} />}
            <span className={cn("relative size-1.5 rounded-full", dot)} />
          </span>
        )}
        {chip}
      </span>
      <p className="text-[0.9375rem] leading-relaxed text-ink-300">{text}</p>
    </div>
  );
}

/** One slice per month: gold when paid, red when late, outlined when due. */
function MonthMeter({ installments }: { installments: InstallmentOverview[] }) {
  const paid = installments.filter((i) => i.paid_at).length;
  return (
    <div
      role="img"
      aria-label={`${paid} of ${installments.length} months paid`}
      className="mt-6 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${Math.max(installments.length, 1)}, minmax(0, 1fr))` }}
    >
      {installments.map((i) => (
        <span
          key={i.id}
          title={`${formatMonth(i.period_month)}: ${i.state}`}
          className={cn(
            "h-2 rounded-full",
            i.state === "paid" && "bg-gradient-to-r from-honey-200 to-honey-400",
            i.state === "late" && "bg-[#e0645a]",
            i.state === "due" && "bg-honey-300/15 ring-1 ring-inset ring-honey-300/70",
            (i.state === "upcoming" || i.state === "cancelled") && "bg-white/10",
          )}
        />
      ))}
    </div>
  );
}

function PlanSwitcher({ enrollments, current }: { enrollments: EnrollmentOverview[]; current: string }) {
  return (
    <nav aria-label="Your plans" className="scrollbar-none -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.05] p-1 ring-1 ring-inset ring-white/10">
      {enrollments.map((x) => {
        const active = x.id === current;
        const dot =
          x.status === "pending_payment"
            ? "bg-ink-400"
            : x.status === "completed"
              ? "bg-honey-300"
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
              active ? "bg-cream text-ink-950 shadow-soft" : "text-ink-300 hover:text-cream",
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

function Fact({ label, sub, className, tone, children }: { label: string; sub?: string; className?: string; tone?: "danger"; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0 border-white/[0.08] px-6 py-5 sm:px-8", className)}>
      <dt className={cn("font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em]", tone === "danger" ? "text-[#f3a59c]" : "text-ink-400")}>{label}</dt>
      <dd className={cn("tnum mt-1.5 truncate text-[1.0625rem] font-semibold tracking-[-0.01em]", tone === "danger" ? "text-[#f8c4bd]" : "text-cream")}>{children}</dd>
      {sub && <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>}
    </div>
  );
}
