import { AlertTriangle, Check } from "lucide-react";
import { formatDate, formatMonth, lagosToday, monthName, naira } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InstallmentOverview } from "@/types/db";

const STATE = {
  paid: { tile: "border-forest-200/80 bg-forest-50", bar: "bg-forest-600", label: "text-forest-700", note: "text-forest-700" },
  due: { tile: "border-tide-300 bg-tide-50 shadow-[0_0_0_3px_rgb(61_120_194/0.12)]", bar: "bg-tide-500", label: "text-tide-700", note: "text-tide-700" },
  late: { tile: "border-danger-100 bg-danger-50", bar: "bg-danger-500", label: "text-danger-700", note: "text-danger-600" },
  upcoming: { tile: "border-line bg-cream", bar: "bg-ink-100", label: "text-ink-400", note: "text-ink-400" },
  cancelled: { tile: "border-line bg-sand/50", bar: "bg-ink-100", label: "text-ink-300", note: "text-ink-300" },
} as const;

/** The year as a ribbon of months: what's paid, what's due, what's late, what's ahead. */
export function MonthGrid({
  installments,
  today = lagosToday(),
  compact,
}: {
  installments: InstallmentOverview[];
  today?: string;
  /** six across at most, for narrower columns */
  compact?: boolean;
}) {
  const thisMonth = today.slice(0, 7);
  return (
    <ol className={cn("grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-6", !compact && "lg:grid-cols-12")}>
      {installments.map((i) => {
        const s = STATE[i.state];
        const now = i.period_month.slice(0, 7) === thisMonth;
        return (
          <li
            key={i.id}
            title={`${formatMonth(i.period_month)} · ${naira(i.amount_kobo)}`}
            className={cn("relative flex min-w-0 flex-col rounded-2xl border px-3 pb-3 pt-2.5 transition", s.tile)}
          >
            <span className={cn("h-1 rounded-full", s.bar)} />
            <div className="mt-2.5 flex items-center justify-between gap-1">
              <span className={cn("font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em]", s.label)}>{monthName(i.period_month)}</span>
              {i.state === "paid" && (
                <span className="flex size-4 items-center justify-center rounded-full bg-forest-600 text-cream">
                  <Check className="size-2.5" strokeWidth={3.5} />
                </span>
              )}
              {i.state === "late" && <AlertTriangle className="size-3.5 text-danger-500" />}
              {i.state === "due" && (
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-tide-400 opacity-60" />
                  <span className="relative size-2 rounded-full bg-tide-500" />
                </span>
              )}
            </div>
            <p className={cn("tnum mt-1.5 truncate text-[0.8125rem] font-semibold", i.state === "upcoming" ? "text-ink-500" : "text-ink-900")}>{naira(i.amount_kobo)}</p>
            <p className={cn("mt-0.5 truncate text-[0.6875rem] font-medium", s.note)}>
              <span className="sr-only">{i.state === "paid" ? "Paid " : i.state === "due" ? "Due " : i.state === "upcoming" ? "Due " : ""}</span>
              {i.state === "paid" ? formatDate(i.paid_at, "short") : i.state === "late" ? "Overdue" : formatDate(i.due_date, "short")}
            </p>
            {now && (
              <span className="absolute -top-2 right-2 rounded-full bg-ink-950 px-1.5 py-px font-mono text-[0.5625rem] font-medium uppercase tracking-[0.12em] text-leaf-300">
                Now
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
