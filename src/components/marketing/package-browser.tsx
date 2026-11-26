"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog as D } from "radix-ui";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_STYLES } from "@/lib/constants";
import { formatMonth, lagosToday, naira } from "@/lib/format";
import { qtyLabel } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import type { PackageWithItems } from "@/types/db";

/**
 * "View our packages": one modal for the whole site. Pick a package on the
 * left and the right side explains, for that package specifically, what you
 * pay today, what you pay each month and until when, what's in the box and
 * how to join.
 *
 * Open it from anywhere with `openPackages(slug?)`, a <PackagesButton>, or a
 * link to `/#choose` (or `/#choose-gold` to preselect a package).
 */

const EVENT = "lux:packages";
const HASH = "#choose";

export function openPackages(slug?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(EVENT, { detail: slug }));
}

export function PackagesButton({
  slug,
  className,
  children,
  variant = "ink",
  size = "lg",
}: {
  slug?: string;
  className?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => openPackages(slug)}>
      {children}
    </Button>
  );
}

/** Bare trigger for custom-styled tiles. */
export function PackagesTrigger({ slug, className, children }: { slug?: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => openPackages(slug)}>
      {children}
    </button>
  );
}

function monthsBetween(fromIso: string, toIso: string) {
  return (Number(toIso.slice(0, 4)) - Number(fromIso.slice(0, 4))) * 12 + (Number(toIso.slice(5, 7)) - Number(fromIso.slice(5, 7)));
}

function addMonths(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function PackageBrowser({ packages, hubs }: { packages: PackageWithItems[]; hubs: number }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  const fallback = useMemo(
    () => packages.find((p) => p.badge?.toLowerCase().includes("popular"))?.slug ?? packages[0]?.slug,
    [packages],
  );
  const pkg = packages.find((p) => p.slug === slug) ?? packages.find((p) => p.slug === fallback);

  const show = useCallback(
    (s?: string) => {
      setSlug(s && packages.some((p) => p.slug === s) ? s : fallback);
      setOpen(true);
    },
    [packages, fallback],
  );

  // open from the URL (#choose or #choose-gold), from links and from buttons
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash;
      if (h === HASH || h.startsWith(`${HASH}-`)) show(h.slice(HASH.length + 1) || undefined);
    };
    const onEvent = (e: Event) => show((e as CustomEvent<string | undefined>).detail);
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener(EVENT, onEvent);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener(EVENT, onEvent);
    };
  }, [show]);

  // keep the address bar in step, so a selection can be shared
  useEffect(() => {
    if (!open || !pkg) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${HASH}-${pkg.slug}`);
  }, [open, pkg]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && window.location.hash.startsWith(HASH)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  // keep the selected package visible in the list
  useEffect(() => {
    if (!open || !pkg) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slug="${pkg.slug}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open, pkg]);

  if (!packages.length) return null;

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink-950/55 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
        <D.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-hidden bg-cream outline-none data-[state=open]:animate-scale-in",
            "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:grid lg:h-[min(50rem,calc(100dvh-3rem))] lg:w-[min(76rem,calc(100%-3rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:grid-cols-[20rem_1fr] lg:rounded-[1.75rem] lg:shadow-[0_60px_120px_-40px_rgb(10_8_5/0.6)]",
          )}
        >
          {/* ── package list ── */}
          <div className="relative shrink-0 bg-night text-cream lg:flex lg:min-h-0 lg:flex-col">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_40%_at_0%_0%,rgb(207_158_41/0.14),transparent_70%)]" />
            <div className="relative flex items-start justify-between gap-4 px-5 pb-4 pt-5 lg:px-6 lg:pt-7">
              <div>
                <D.Title className="text-[1.375rem] font-bold tracking-[-0.03em] text-[#f7f1e5]">Our packages</D.Title>
                <p className="mt-1 text-[0.8125rem] text-ink-300">Choose one to see exactly how to join it.</p>
              </div>
              <D.Close
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-ink-200 transition hover:bg-white/15 hover:text-cream lg:hidden"
                aria-label="Close"
              >
                <X className="size-4" />
              </D.Close>
            </div>
            <div
              ref={listRef}
              role="listbox"
              aria-label="Packages"
              className="scrollbar-none relative flex gap-2 overflow-x-auto px-5 pb-4 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-visible lg:px-3 lg:pb-3"
            >
              {packages.map((p) => {
                const active = p.slug === pkg?.slug;
                const theme = THEME_STYLES[p.theme] ?? THEME_STYLES.oat;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-slug={p.slug}
                    onClick={() => setSlug(p.slug)}
                    className={cn(
                      "group relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition lg:w-full lg:py-3",
                      active
                        ? "bg-white/[0.1] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] lg:before:absolute lg:before:inset-y-2.5 lg:before:-left-3 lg:before:w-[3px] lg:before:rounded-r-full lg:before:bg-honey-400"
                        : "bg-white/[0.03] hover:bg-white/[0.06] lg:bg-transparent",
                    )}
                  >
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", theme.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block whitespace-nowrap text-[0.9375rem] font-semibold", active ? "text-cream" : "text-ink-200")}>
                        {p.name}
                      </span>
                      {p.badge && (
                        <span className="hidden font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-honey-300 lg:block">{p.badge}</span>
                      )}
                    </span>
                    <span className={cn("whitespace-nowrap font-mono text-[0.8125rem]", active ? "text-honey-300" : "text-ink-400")}>
                      {naira(p.monthly_amount_kobo)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="relative hidden border-t border-white/10 px-6 py-4 font-mono text-[0.6875rem] leading-relaxed text-ink-400 lg:block">
              Every package: {naira(packages[0].registration_fee_kobo)} one-time registration, then {packages[0].duration_months}{" "}
              monthly payments.
            </p>
          </div>

          {/* ── the selected package ── */}
          {pkg && <PackagePanel key={pkg.slug} pkg={pkg} hubs={hubs} onClose={() => onOpenChange(false)} />}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function PackagePanel({ pkg, hubs, onClose }: { pkg: PackageWithItems; hubs: number; onClose: () => void }) {
  const theme = THEME_STYLES[pkg.theme] ?? THEME_STYLES.oat;
  const n = pkg.duration_months;
  const monthly = pkg.monthly_amount_kobo;
  const fee = pkg.registration_fee_kobo;
  const end = addMonths(pkg.start_month, n - 1);

  // joining after the cycle has started means catching up on the months already due
  // (this panel only renders after someone opens it, so reading today's date is fine)
  const today = lagosToday();
  const elapsed = monthsBetween(pkg.start_month, today) + 1;
  const catchUp = Math.max(1, Math.min(n, elapsed));
  const firstMonths = catchUp;
  const firstPayment = fee + monthly * firstMonths;
  const remaining = n - firstMonths;
  const nextMonth = addMonths(pkg.start_month, firstMonths);
  const closed = !pkg.is_open || elapsed > n;

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Fill in a short form",
      body: (
        <>
          Your name, phone and address, then pick where you&apos;ll collect{hubs > 0 ? ` (we have ${hubs} collection ${hubs === 1 ? "point" : "points"})` : ""}{" "}
          and set a password. It takes about five minutes on your phone.
        </>
      ),
    },
    {
      title: `Pay ${naira(firstPayment)} today`,
      body: (
        <>
          That&apos;s the {naira(fee)} one-time registration fee plus{" "}
          {firstMonths === 1 ? (
            <>your first month ({formatMonth(pkg.start_month)})</>
          ) : (
            <>
              {firstMonths} months already due ({formatMonth(pkg.start_month, "short")} to {formatMonth(addMonths(pkg.start_month, firstMonths - 1), "short")}),{" "}
              {naira(monthly)} each
            </>
          )}
          . Pay by card, bank transfer or USSD on Paystack&apos;s secure checkout.
        </>
      ),
    },
    {
      title: "Get your customer ID",
      body: <>As soon as Paystack confirms your payment, we email your receipt and your Luxuriate customer ID. Your dashboard opens straight away.</>,
    },
    remaining > 0
      ? {
          title: `Pay ${naira(monthly)} a month`,
          body: (
            <>
              {remaining} more {remaining === 1 ? "payment" : "payments"}, due by the {ordinal(pkg.due_day)} of each month from{" "}
              {formatMonth(nextMonth)} to {formatMonth(end)}. We email a reminder before each due date, and you can pay ahead any time.
            </>
          ),
        }
      : {
          title: "No more monthly payments",
          body: <>Joining this late, your first payment covers the whole cycle, so there&apos;s nothing more to pay.</>,
        },
    {
      title: `Collect your ${pkg.name} package`,
      body: (
        <>
          After your final payment in {formatMonth(end)}, we buy and pack your foodstuff and keep you posted until it&apos;s ready at your
          collection point.
          {pkg.savings_return_kobo > 0 && <> You also receive your {naira(pkg.savings_return_kobo)} savings return.</>}
        </>
      ),
    },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <D.Close
        className="absolute right-5 top-5 z-10 hidden size-9 items-center justify-center rounded-full text-ink-400 transition hover:bg-sand hover:text-ink-800 lg:flex"
        aria-label="Close"
      >
        <X className="size-4" />
      </D.Close>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* heading and figures */}
        <div className="border-b border-ink-900/[0.07] px-5 pb-6 pt-6 sm:px-8 lg:px-10 lg:pt-9">
          <div className="flex flex-wrap items-center gap-2.5 pr-10">
            <span aria-hidden className={cn("size-2.5 rounded-full", theme.dot)} />
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-500">
              {pkg.cycle_year} package · {pkg.package_items.length} items
            </p>
            {pkg.badge && (
              <span className="rounded-full bg-ink-950 px-2.5 py-1 font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-cream">
                {pkg.badge}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-none tracking-[-0.045em] text-ink-950">{pkg.name}</h3>
          {pkg.tagline && <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-ink-500">{pkg.tagline}</p>}

          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-900/[0.08] ring-1 ring-ink-900/[0.08] sm:grid-cols-4">
            {[
              { k: "Monthly", v: naira(monthly), sub: `${n} payments` },
              { k: "Pay today", v: naira(firstPayment), sub: `${naira(fee)} + ${firstMonths === 1 ? "month 1" : `${firstMonths} months`}`, hi: true },
              { k: "Total contributions", v: naira(monthly * n), sub: `${formatMonth(pkg.start_month, "short")} – ${formatMonth(end, "short")}` },
              pkg.savings_return_kobo > 0
                ? { k: "Savings return", v: naira(pkg.savings_return_kobo), sub: "paid back to you" }
                : { k: "Registration", v: naira(fee), sub: "one time only" },
            ].map((f) => (
              <div key={f.k} className={cn("p-4", f.hi ? "bg-honey-50" : "bg-paper")}>
                <dt className="font-mono text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-ink-400">{f.k}</dt>
                <dd className={cn("mt-2 font-mono text-[1.25rem] font-medium tracking-[-0.04em]", f.hi ? "text-forest-700" : "text-ink-950")}>{f.v}</dd>
                <dd className="mt-1 text-[0.75rem] text-ink-500">{f.sub}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:px-10">
          {/* how to join this package */}
          <section>
            <h4 className="text-[1.125rem] font-bold tracking-[-0.02em] text-ink-950">How to join {pkg.name}</h4>
            <ol className="mt-5">
              {steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < steps.length - 1 && <span aria-hidden className="absolute left-[0.9rem] top-8 h-[calc(100%-2rem)] w-px bg-ink-900/10" />}
                  <span
                    className={cn(
                      "relative flex size-[1.85rem] shrink-0 items-center justify-center rounded-full font-mono text-[0.75rem] font-medium",
                      i === 1 ? "bg-forest-700 text-cream" : "bg-sand text-ink-700 ring-1 ring-inset ring-ink-900/[0.06]",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[0.9375rem] font-semibold text-ink-950">{s.title}</p>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-500">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* what's in the box */}
          <section>
            <h4 className="text-[1.125rem] font-bold tracking-[-0.02em] text-ink-950">What&apos;s in the box</h4>
            <ul className="mt-5 space-y-2.5 text-[0.875rem]">
              {pkg.package_items.map((item) => (
                <li key={item.id} className="flex items-baseline">
                  <span className="truncate text-ink-700">{item.name}</span>
                  <span className="leader" />
                  <span className="shrink-0 font-mono text-[0.75rem] text-ink-950">{qtyLabel(item.quantity, item.unit)}</span>
                </li>
              ))}
            </ul>
            {pkg.savings_return_kobo > 0 && (
              <p className="mt-5 flex items-start gap-2 rounded-xl bg-honey-50 p-3.5 text-[0.8125rem] leading-relaxed text-honey-700 ring-1 ring-inset ring-honey-200">
                <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                Plus a {naira(pkg.savings_return_kobo)} savings return, paid to you separately once your contributions are complete.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* action */}
      <div className="flex flex-col gap-3 border-t border-ink-900/[0.08] bg-paper/90 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        {closed ? (
          <p className="text-[0.875rem] text-ink-500">Registration for this package is closed for the {pkg.cycle_year} cycle.</p>
        ) : (
          <p className="text-[0.8125rem] text-ink-500">
            You&apos;ll pay <span className="font-mono font-medium text-ink-950">{naira(firstPayment)}</span> today, then{" "}
            {remaining > 0 ? (
              <>
                <span className="font-mono font-medium text-ink-950">{naira(monthly)}</span> a month.
              </>
            ) : (
              <>nothing more.</>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={`/packages/${pkg.slug}`} onClick={onClose} className="group text-[0.875rem] font-semibold text-ink-700">
            <span className="border-b border-ink-900/20 pb-0.5 transition-colors group-hover:border-ink-900">Full details</span>
            <ArrowUpRight className="ml-1 inline size-3.5" />
          </Link>
          {!closed && (
            <Button asChild variant="ink" size="lg" className="h-12 rounded-xl px-6">
              <Link href={`/join/${pkg.slug}`} onClick={onClose}>
                Join {pkg.name} <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
