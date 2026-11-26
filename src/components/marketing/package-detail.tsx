import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Gift, Lock, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/marketing/package-card";
import { contributionPeriod, monthName, naira } from "@/lib/format";
import { qtyLabel } from "@/lib/quantity";
import { THEME_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CollectionPoint, PackageWithItems } from "@/types/db";
import { ArcsMotif } from "@/components/ui/logo";

export function PackageDetail({ pkg, catalog, points }: { pkg: PackageWithItems; catalog: PackageWithItems[]; points: CollectionPoint[] }) {
  const theme = THEME_STYLES[pkg.theme] ?? THEME_STYLES.oat;
  const total = pkg.monthly_amount_kobo * pkg.duration_months;
  const firstPayment = pkg.monthly_amount_kobo + pkg.registration_fee_kobo;
  const months = Array.from({ length: pkg.duration_months }, (_, i) => {
    const d = new Date(pkg.start_month + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + i);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const due = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), Math.min(pkg.due_day, last), 12));
    return { label: monthName(d.toISOString().slice(0, 10)), due: due.toISOString().slice(0, 10) };
  });
  const others = catalog
    .filter((p) => p.id !== pkg.id)
    .sort((a, b) => Math.abs(a.monthly_amount_kobo - pkg.monthly_amount_kobo) - Math.abs(b.monthly_amount_kobo - pkg.monthly_amount_kobo))
    .slice(0, 3)
    .sort((a, b) => a.sort_order - b.sort_order);
  const half = Math.ceil(pkg.package_items.length / 2);

  return (
    <div className="pb-28 lg:pb-0">
      {/* Header band */}
      <section className={cn("relative overflow-hidden border-b", theme.dark ? "border-transparent" : "border-line", theme.card)}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn("grid-lines absolute inset-0 [mask-image:linear-gradient(100deg,transparent_35%,black)]", theme.dark && "opacity-40 invert")} />
          <ArcsMotif className={cn("absolute -right-16 -top-24 h-[30rem] sm:right-[6%]", theme.dark ? "text-honey-300/40" : "text-honey-400/35")} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20">
          <Link
            href="/#packages"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium transition",
              theme.dark ? "text-forest-100/70 hover:text-cream" : "text-ink-500 hover:text-ink-900",
            )}
          >
            <ArrowLeft className="size-4" /> All packages
          </Link>
          <div className="mt-10 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("eyebrow rounded-full px-2.5 py-1", theme.chip)}>{pkg.cycle_year} package</span>
              {pkg.badge && (
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", theme.dark ? "bg-honey-300 text-ink-900" : "bg-clay-500 text-white")}>
                  {pkg.badge}
                </span>
              )}
              {!pkg.is_open && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-1 text-xs font-semibold text-cream">
                  <Lock className="size-3" /> Registration closed
                </span>
              )}
            </div>
            <h1 className={cn("mt-5 text-[clamp(3rem,8vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em]", theme.dark ? "text-cream" : "text-ink-950")}>
              {pkg.name}
            </h1>
            {pkg.tagline && (
              <p className={cn("mt-4 max-w-2xl font-display text-xl font-medium leading-relaxed tracking-[-0.01em] sm:text-2xl", theme.dark ? "text-honey-200" : "text-ink-500")}>
                {pkg.tagline}
              </p>
            )}
            {pkg.description && (
              <p className={cn("mt-4 max-w-2xl leading-relaxed", theme.dark ? "text-forest-100/80" : "text-ink-600")}>{pkg.description}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_24rem] lg:gap-14 lg:px-8 lg:py-16">
        <div className="min-w-0 space-y-10">
          {/* Items */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow text-forest-600">What you receive</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">Food items</h2>
              </div>
              <p className="text-sm text-ink-400">{pkg.package_items.length} items</p>
            </div>
            <div className="grid gap-x-12 px-6 py-6 sm:px-8 md:grid-cols-2">
              {[pkg.package_items.slice(0, half), pkg.package_items.slice(half)].map((col, ci) => (
                <ul key={ci} className="divide-y divide-transparent">
                  {col.map((item) => (
                    <li key={item.id} className="flex items-end py-2.5 text-[0.975rem]">
                      <span className="text-ink-800">{item.name}</span>
                      <span className="leader" />
                      <span className="tnum whitespace-nowrap font-semibold text-ink-900">{qtyLabel(item.quantity, item.unit)}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
            <p className="border-t border-line bg-sand/50 px-6 py-3.5 text-xs text-ink-500 sm:px-8">
              Items may be substituted with equal or greater value if a brand or size is unavailable at purchase time.
            </p>
          </section>

          {/* Savings return, kept apart from food */}
          {pkg.savings_return_kobo > 0 && (
            <section className="relative overflow-hidden rounded-[1.5rem] border border-honey-200 bg-honey-50 p-6 sm:p-8">
              <ArcsMotif className="absolute -right-6 -top-10 h-40 text-honey-300/40" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-honey-300 text-ink-900">
                  <Gift className="size-6" />
                </span>
                <div>
                  <p className="eyebrow text-honey-700">Separate from your food items</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
                    Plus a <span className="tnum">{naira(pkg.savings_return_kobo)}</span> savings return
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                    Paid back to you in cash after you complete all {pkg.duration_months} contributions. You can follow its status in
                    your dashboard.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Schedule */}
          <section className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-forest-600">Contribution period</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
                  {contributionPeriod(pkg.start_month, pkg.duration_months)}
                </h2>
              </div>
              <p className="flex items-center gap-2 text-sm text-ink-500">
                <CalendarDays className="size-4 text-forest-600" /> Due on the {pkg.due_day}
                {ordinal(pkg.due_day)} of each month
              </p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {months.map((m, i) => (
                <div key={i} className="rounded-xl border border-line bg-paper px-2 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{m.label}</p>
                  <p className="tnum mt-1 text-sm font-semibold text-ink-800">{naira(pkg.monthly_amount_kobo)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Your first payment covers the registration fee and the {monthName(pkg.start_month, "long")} contribution. After
              that, we remind you by email before every due date.
            </p>
          </section>

          {points.length > 0 && (
            <section className="card p-6 sm:p-8">
              <p className="eyebrow text-forest-600">Collection points</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">Collect close to home</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {points.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 rounded-2xl bg-sand/60 p-4">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-clay-500" />
                    <div>
                      <p className="font-semibold text-ink-900">{p.name}</p>
                      <p className="text-sm text-ink-500">{p.address}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Price aside */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="p-6 sm:p-7">
              <p className="text-sm font-medium text-ink-500">Monthly contribution</p>
              <p className="mt-2 font-mono text-[2.75rem] font-medium leading-none tracking-[-0.05em] text-ink-950">{naira(pkg.monthly_amount_kobo)}</p>
              <dl className="mt-6 space-y-3 text-[0.9375rem]">
                <Row label="Registration (one-time)" value={naira(pkg.registration_fee_kobo)} />
                <Row label={`Total over ${pkg.duration_months} months`} value={naira(total)} />
                {pkg.savings_return_kobo > 0 && <Row label="Savings return" value={naira(pkg.savings_return_kobo)} accent />}
              </dl>
              <div className="mt-6 rounded-2xl bg-forest-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Pay today</p>
                <p className="mt-1 font-mono text-2xl font-medium tracking-[-0.04em] text-forest-900">{naira(firstPayment)}</p>
                <p className="tnum text-xs text-forest-700/80">
                  {naira(pkg.registration_fee_kobo)} registration + {naira(pkg.monthly_amount_kobo)} first month
                </p>
              </div>
              {pkg.is_open ? (
                <Button asChild size="lg" block className="mt-6">
                  <Link href={`/join/${pkg.slug}`}>
                    Join {pkg.name} <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" block className="mt-6" disabled>
                  <Lock /> Registration closed
                </Button>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
                <ShieldCheck className="size-3.5 text-forest-600" /> Secure checkout by Paystack
              </p>
            </div>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="border-t border-line bg-cream py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Compare with</h2>
              <Link href="/#packages" className="text-sm font-semibold text-forest-700 hover:underline">
                See all packages
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky bar */}
      {pkg.is_open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xl font-medium tracking-[-0.04em] text-ink-900">
                {naira(pkg.monthly_amount_kobo)}
                <span className="font-sans text-sm font-normal text-ink-400"> / month</span>
              </p>
              <p className="tnum text-xs text-ink-500">{naira(firstPayment)} today</p>
            </div>
            <Button asChild size="lg">
              <Link href={`/join/${pkg.slug}`}>
                Join now <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn("tnum font-semibold", accent ? "text-clay-600" : "text-ink-900")}>{value}</dd>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

