import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/constants";
import type { Profile } from "@/types/db";

export type Session = {
  userId: string;
  email: string;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/** The signed-in user and their profile, read once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  // A session is always per-request; saying so up front lets pages that read
  // the session also read today's date (greetings, due dates) safely.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile, supabase };
});

export function isStaff(profile: Pick<Profile, "role" | "is_active"> | null | undefined) {
  return Boolean(profile && profile.is_active && (profile.role === "owner" || profile.role === "staff"));
}

export function can(profile: Pick<Profile, "role" | "permissions" | "is_active"> | null | undefined, permission: Permission) {
  if (!profile || !profile.is_active) return false;
  if (profile.role === "owner") return true;
  return profile.role === "staff" && profile.permissions.includes(permission);
}

export async function requireUser(next = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/** Staff gate for admin pages and actions. */
export async function requireStaff(permission?: Permission) {
  const session = await getSession();
  if (!session) redirect("/admin");
  if (!isStaff(session.profile)) redirect("/dashboard");
  if (permission && !can(session.profile, permission)) redirect(`/admin/no-access?need=${permission}`);
  return session;
}

/** For server actions: returns an error instead of redirecting. */
export async function authorize(permission?: Permission) {
  const session = await getSession();
  if (!session || !isStaff(session.profile)) return { ok: false as const, error: "Please sign in again." };
  if (permission && !can(session.profile, permission))
    return { ok: false as const, error: "You don't have permission to do that." };
  return { ok: true as const, session };
}

/** Where someone lands after signing in: the back office at /admin for the team, the dashboard for customers. */
export function homeFor(profile: Pick<Profile, "role" | "is_active"> | null | undefined) {
  return isStaff(profile) ? "/admin" : "/dashboard";
}
