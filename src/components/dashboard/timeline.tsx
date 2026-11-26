import { BadgeCheck, CalendarClock, CircleDot, Gift, PackageCheck, Receipt, Sparkles, Truck, XCircle } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { EnrollmentEvent } from "@/types/db";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  registered: CircleDot,
  activated: Sparkles,
  payment: Receipt,
  completed: BadgeCheck,
  "fulfilment:preparing": PackageCheck,
  "fulfilment:ready": PackageCheck,
  "fulfilment:collection_scheduled": CalendarClock,
  "fulfilment:collected": Truck,
  savings_paid: Gift,
  cancelled: XCircle,
};

export function Timeline({ events }: { events: EnrollmentEvent[] }) {
  return (
    <ol className="relative space-y-5">
      <div className="absolute bottom-2 left-[0.9375rem] top-2 w-px bg-line" aria-hidden />
      {events.map((e) => {
        const Icon = ICONS[e.kind] ?? CircleDot;
        return (
          <li key={e.id} className="relative flex gap-3.5">
            <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-cream text-forest-700">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-ink-900">{e.title}</p>
              {e.body && <p className="mt-0.5 text-[0.8125rem] text-ink-500">{e.body}</p>}
              <p className="mt-1 text-xs text-ink-400">{relativeTime(e.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
