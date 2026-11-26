import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { THEME_STYLES } from "@/lib/constants";
import { naira } from "@/lib/format";
import { qtyLabel } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import type { PackageWithItems } from "@/types/db";

export function PackageCard({ pkg, className }: { pkg: PackageWithItems; className?: string }) {
  const theme = THEME_STYLES[pkg.theme] ?? THEME_STYLES.oat;
  const dark = theme.dark;
  const highlights = pkg.package_items.slice(0, 4);
  const more = pkg.package_items.length - highlights.length;
  const total = pkg.monthly_amount_kobo * pkg.duration_months;

  return (
    <Link
      href={`/packages/${pkg.slug}`}
      prefetch
      className={cn(
        "group relative flex h-full flex-col rounded-[1.25rem] border p-6 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 sm:p-7",
        theme.card === "bg-cream" ? "bg-white" : theme.card,
        dark
          ? "border-white/[0.06] text-cream shadow-[0_30px_60px_-36px_rgb(1_28_13/0.7)]"
          : "border-ink-900/[0.07] shadow-[0_1px_2px_rgb(30_26_22/0.03)] hover:shadow-[0_30px_60px_-36px_rgb(60_40_10/0.35)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", theme.dot)} />
          <h3 className={cn("text-[1.1875rem] font-bold tracking-[-0.025em]", dark ? "text-cream" : "text-ink-950")}>{pkg.name}</h3>
        </div>
        {pkg.badge && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em]",
              dark ? "bg-honey-300 text-ink-950" : "bg-ink-950 text-cream",
            )}
          >
            {pkg.badge}
          </span>
        )}
      </div>
      {pkg.tagline && (
        <p className={cn("mt-2 line-clamp-2 min-h-[2.9em] text-[0.875rem] leading-[1.45]", dark ? "text-forest-100/75" : "text-ink-500")}>
          {pkg.tagline}
        </p>
      )}

      <div className="mt-6 flex items-baseline gap-1.5">
        <span className={cn("font-mono text-[2.125rem] font-medium leading-none tracking-[-0.05em]", dark ? "text-cream" : "text-ink-950")}>
          {naira(pkg.monthly_amount_kobo)}
        </span>
        <span className={cn("text-[0.8125rem]", dark ? "text-forest-100/60" : "text-ink-400")}>/ month</span>
      </div>
      <p className={cn("mt-2.5 font-mono text-[0.6875rem]", dark ? "text-forest-100/60" : "text-ink-500")}>
        {pkg.duration_months} payments · {naira(total)} total
      </p>

      <div className={cn("my-6 border-t border-dashed", dark ? "border-white/15" : "border-ink-900/[0.12]")} />

      <ul className="space-y-2 text-[0.875rem]">
        {highlights.map((item) => (
          <li key={item.id} className="flex items-baseline">
            <span className={cn("truncate", dark ? "text-forest-50" : "text-ink-700")}>{item.name}</span>
            <span className={cn("leader", dark && "border-white/20")} />
            <span className={cn("shrink-0 font-mono text-[0.75rem]", dark ? "text-cream" : "text-ink-900")}>{qtyLabel(item.quantity, item.unit)}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className={cn("mt-2.5 text-[0.8125rem]", dark ? "text-forest-100/55" : "text-ink-400")}>
          + {more} more item{more === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-auto pt-7">
        {pkg.savings_return_kobo > 0 && (
          <p
            className={cn(
              "mb-4 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-semibold",
              dark ? "bg-white/[0.08] text-honey-200" : "bg-honey-100 text-honey-700",
            )}
          >
            <span className="font-mono font-medium">{naira(pkg.savings_return_kobo)}</span> savings return
          </p>
        )}
        <div
          className={cn(
            "flex items-center justify-between border-t pt-4 text-[0.875rem] font-semibold",
            dark ? "border-white/10 text-cream" : "border-ink-900/[0.07] text-ink-900",
          )}
        >
          {pkg.is_open ? "View package" : "View details"}
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors duration-300",
              dark ? "bg-white/10 group-hover:bg-honey-300 group-hover:text-ink-950" : "bg-ink-900/[0.05] group-hover:bg-ink-950 group-hover:text-cream",
            )}
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
