import { CalendarClock, Check, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrollmentOverview } from "@/types/db";

const STEPS = [
  { key: "contributing", label: "Contributing" },
  { key: "completed", label: "Completed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "collection_scheduled", label: "Scheduled" },
  { key: "collected", label: "Collected" },
];

function currentIndex(e: EnrollmentOverview) {
  if (e.status !== "completed") return 0;
  const map: Record<string, number> = { not_started: 1, preparing: 2, ready: 3, collection_scheduled: 4, collected: 5 };
  return map[e.fulfilment_status] ?? 1;
}

export function FulfilmentTracker({ enrollment }: { enrollment: EnrollmentOverview }) {
  const idx = currentIndex(enrollment);
  return (
    <div>
      <ol className="relative grid grid-cols-6">
        <div className="absolute left-[8.33%] right-[8.33%] top-4 h-0.5 rounded-full bg-line" aria-hidden />
        <div
          className="absolute left-[8.33%] top-4 h-0.5 rounded-full bg-forest-600 transition-[width] duration-1000"
          style={{ width: `${(idx / (STEPS.length - 1)) * 83.33}%` }}
          aria-hidden
        />
        {STEPS.map((s, i) => (
          <li key={s.key} className="relative flex flex-col items-center gap-2 text-center">
            <span
              className={cn(
                "relative z-[1] flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                i < idx && "border-forest-600 bg-forest-600 text-cream",
                i === idx && "border-forest-600 bg-cream text-forest-700 ring-4 ring-forest-500/15",
                i > idx && "border-line-strong bg-cream text-ink-300",
              )}
            >
              {i < idx ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-[0.6875rem] font-semibold leading-tight sm:whitespace-normal sm:text-xs",
                i <= idx ? "text-ink-900" : "text-ink-400",
                // on a phone only the current step is named; the rest are numbered circles
                i !== idx && "max-sm:sr-only",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      {enrollment.fulfilment_status === "collection_scheduled" && enrollment.collection_scheduled_for && (
        <div className="mt-6 grid gap-3 rounded-2xl border border-forest-200 bg-forest-50 p-4 sm:grid-cols-2">
          <p className="flex items-start gap-2.5 text-sm text-forest-900">
            <CalendarClock className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="block font-semibold">Collection</span>
              {formatDateTime(enrollment.collection_scheduled_for)}
            </span>
          </p>
          <p className="flex items-start gap-2.5 text-sm text-forest-900">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="block font-semibold">{enrollment.collection_point_name}</span>
              {enrollment.collection_point_address}
            </span>
          </p>
          {enrollment.fulfilment_note && <p className="text-sm text-forest-800 sm:col-span-2">{enrollment.fulfilment_note}</p>}
        </div>
      )}
    </div>
  );
}
