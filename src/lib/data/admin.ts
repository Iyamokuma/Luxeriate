import "server-only";
import type { Session } from "@/lib/auth";

/** Cycle years that have packages, newest first, and the one being viewed. */
export async function getCycleYears(session: Session, requested?: string | null) {
  const { data } = await session.supabase.from("packages").select("cycle_year").order("cycle_year", { ascending: false });
  const years = [...new Set((data ?? []).map((r) => r.cycle_year as number))];
  const fallback = years[0] ?? new Date().getFullYear() + 1;
  const asked = Number(requested);
  const year = years.includes(asked) ? asked : fallback;
  return { years: years.length ? years : [fallback], year };
}
