import "server-only";
import type { Session } from "@/lib/auth";
import type { EnrollmentEvent, EnrollmentOverview, InstallmentOverview, PaymentOverview } from "@/types/db";

export async function getMyEnrollments(session: Session) {
  const { data } = await session.supabase
    .from("enrollment_overview")
    .select("*")
    .eq("user_id", session.userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  return (data ?? []) as EnrollmentOverview[];
}

/** Active first, then awaiting payment, then completed (most recent first). */
export function pickEnrollment(list: EnrollmentOverview[], id?: string | null) {
  if (id) {
    const found = list.find((e) => e.id === id);
    if (found) return found;
  }
  const rank = { active: 0, pending_payment: 1, completed: 2, cancelled: 3 } as const;
  return [...list].sort((a, b) => rank[a.status] - rank[b.status])[0] ?? null;
}

export async function getEnrollmentDetail(session: Session, enrollmentId: string) {
  const db = session.supabase;
  const [inst, events, payments] = await Promise.all([
    db.from("installment_overview").select("*").eq("enrollment_id", enrollmentId).order("month_index"),
    db.from("enrollment_events").select("*").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false }).limit(8),
    db
      .from("payment_overview")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("status", "success")
      .order("paid_at", { ascending: false }),
  ]);
  return {
    installments: (inst.data ?? []) as InstallmentOverview[],
    events: (events.data ?? []) as EnrollmentEvent[],
    payments: (payments.data ?? []) as PaymentOverview[],
  };
}
