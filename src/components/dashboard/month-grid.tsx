import { AlertTriangle, Check } from "lucide-react";
import { INSTALLMENT_LABEL } from "@/lib/constants";
import { formatDate, monthName, naira } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InstallmentOverview } from "@/types/db";

export function MonthGrid({ installments }: { installments: InstallmentOverview[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
      {installments.map((i) => {
        const s = i.state;
        return (
          <li
            key={i.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-3.5 transition",
              s === "paid" && "border-forest-200 bg-forest-50",
              s === "due" && "border-clay-300 bg-clay-50 shadow-[0_0_0_3px_rgb(196_98_60/0.08)]",
              s === "late" && "border-danger-100 bg-danger-50",
              (s === "upcoming" || s === "cancelled") && "border-line bg-cream",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("text-xs font-bold uppercase tracking-wider", s === "paid" ? "text-forest-700" : s === "due" ? "text-clay-700" : s === "late" ? "text-danger-700" : "text-ink-400")}>
                {monthName(i.period_month)}
              </span>
              {s === "paid" && (
                <span className="flex size-5 items-center justify-center rounded-full bg-forest-600 text-cream">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              {s === "late" && <AlertTriangle className="size-4 text-danger-500" />}
              {s === "due" && <span className="mt-1 size-2 animate-pulse rounded-full bg-clay-500" />}
            </div>
            <p className={cn("tnum mt-3 font-display text-base font-semibold", s === "upcoming" ? "text-ink-500" : "text-ink-900")}>
              {naira(i.amount_kobo)}
            </p>
            <p className={cn("mt-0.5 text-[0.6875rem] font-medium", s === "paid" ? "text-forest-700" : s === "late" ? "text-danger-600" : s === "due" ? "text-clay-600" : "text-ink-400")}>
              {s === "paid" ? `Paid ${formatDate(i.paid_at, "short")}` : `${INSTALLMENT_LABEL[s]} · ${formatDate(i.due_date, "short")}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
