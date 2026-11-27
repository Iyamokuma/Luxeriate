import "server-only";
import type { Session } from "@/lib/auth";
import { lagosToday } from "@/lib/format";
import type { EnrollmentEvent, EnrollmentOverview, InstallmentOverview, PackageItem, PaymentOverview } from "@/types/db";

export async function getMyEnrollments(session: Session) {
  const { data } = await session.supabase
    .from("enrollment_overview")
    .select("*")
    .eq("user_id", session.userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  return (data ?? []) as EnrollmentOverview[];
}

/** How urgently a plan needs the customer: late, then due this month, then the rest. */
export function urgency(e: EnrollmentOverview, today = lagosToday()) {
  if (e.status === "active" && e.late_count > 0) return 0;
  if (e.status === "active" && e.next_due_date && e.next_due_date.slice(0, 7) <= today.slice(0, 7)) return 1;
  // a package waiting to be collected matters more than a plan that's simply on track
  if (e.status === "completed" && (e.fulfilment_status === "ready" || e.fulfilment_status === "collection_scheduled")) return 2;
  if (e.status === "pending_payment") return 3;
  if (e.status === "active") return 4;
  if (e.status === "completed" && e.fulfilment_status !== "collected") return 5;
  return 6;
}

/** The plan asked for, else the one that needs attention first (newest wins a tie). */
export function pickEnrollment(list: EnrollmentOverview[], id?: string | null) {
  if (id) {
    const found = list.find((e) => e.id === id);
    if (found) return found;
  }
  const today = lagosToday();
  return [...list].sort((a, b) => urgency(a, today) - urgency(b, today))[0] ?? null;
}

export async function getEnrollmentDetail(session: Session, enrollmentId: string, packageId?: string) {
  const db = session.supabase;
  const [inst, events, payments, items] = await Promise.all([
    db.from("installment_overview").select("*").eq("enrollment_id", enrollmentId).order("month_index"),
    db.from("enrollment_events").select("*").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false }).limit(8),
    db
      .from("payment_overview")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("status", "success")
      .order("paid_at", { ascending: false }),
    packageId
      ? db.from("package_items").select("*").eq("package_id", packageId).order("sort_order")
      : Promise.resolve({ data: [] as PackageItem[] }),
  ]);
  return {
    installments: (inst.data ?? []) as InstallmentOverview[],
    events: (events.data ?? []) as EnrollmentEvent[],
    payments: (payments.data ?? []) as PaymentOverview[],
    items: (items.data ?? []) as PackageItem[],
  };
}
