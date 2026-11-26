import "server-only";
import type { Session } from "@/lib/auth";

/** Record a staff action; the actor is taken from the session by the database. */
export async function logActivity(
  session: Session,
  action: string,
  summary: string,
  entity?: { type: string; id: string | null },
  details?: Record<string, unknown>,
) {
  const { error } = await session.supabase.rpc("log_activity", {
    p_action: action,
    p_entity_type: entity?.type ?? null,
    p_entity_id: entity?.id ?? null,
    p_summary: summary,
    p_details: details ?? null,
  });
  if (error) console.error("[activity] could not log", action, error.message);
}
