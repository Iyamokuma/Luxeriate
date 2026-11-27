import { CalendarClock, MapPin, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FulfilmentTracker } from "@/components/dashboard/fulfilment-tracker";
import { FULFILMENT_LABEL } from "@/lib/constants";
import { formatDateTime, formatMonth, quantity } from "@/lib/format";
import type { EnrollmentOverview, PackageItem } from "@/types/db";

/** What the customer is saving for, and where their package is on its way to them. */
export function Basket({ e, items, lastMonth }: { e: EnrollmentOverview; items: PackageItem[]; lastMonth: string }) {
  const done = e.status === "completed";
  const half = Math.ceil(items.length / 2);
  return (
    <section id="package" className="card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-900">Your {e.package_name} package</h3>
          <p className="mt-0.5 text-sm text-ink-500">
            {done ? "Every month is paid. We'll email you at every step until collection." : `Packed for you once every month is paid, after ${formatMonth(lastMonth)}.`}
          </p>
        </div>
        <Badge tone={done ? (e.fulfilment_status === "collected" ? "ink" : "forest") : "neutral"} dot={done && e.fulfilment_status !== "collected"} pulse={done && e.fulfilment_status !== "collected"}>
          {done ? (e.fulfilment_status === "not_started" ? "Completed" : FULFILMENT_LABEL[e.fulfilment_status]) : "Contributing"}
        </Badge>
      </div>

      <div className="px-5 pt-7 sm:px-6">
        <FulfilmentTracker enrollment={e} />
      </div>

      {items.length > 0 && (
        <div className="mt-7 border-t border-line bg-[linear-gradient(180deg,var(--color-sand)_0%,transparent_100%)] px-5 py-6 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">
            <PackageOpen className="size-3.5" /> In your box · {items.length} items
          </p>
          <div className="mt-4 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {[items.slice(0, half), items.slice(half)].map((col, k) => (
              <ul key={k} className="space-y-2.5">
                {col.map((i) => (
                  <li key={i.id} className="flex items-end text-sm">
                    <span className="text-ink-800">{i.name}</span>
                    <span className="leader" aria-hidden />
                    <span className="tnum whitespace-nowrap font-mono text-[0.8125rem] font-medium text-ink-900">
                      {quantity(i.quantity)} {i.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}

      {e.collection_point_name && e.fulfilment_status !== "collection_scheduled" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-sm text-ink-600 sm:px-6">
          <span className="inline-flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-clay-500" />
            <span>
              Collect at <span className="font-semibold text-ink-900">{e.collection_point_name}</span>
              {e.collection_point_address ? `, ${e.collection_point_address}` : ""}
            </span>
          </span>
          {e.fulfilment_status === "collected" && e.fulfilment_updated_at && (
            <span className="inline-flex items-center gap-2 text-ink-500">
              <CalendarClock className="size-4" /> Collected {formatDateTime(e.fulfilment_updated_at)}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
