import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { cookieNameFor, type Door } from "./doors";

/**
 * Supabase client acting as the signed-in user (RLS applies). Each door keeps
 * its own session cookie: "team" for the back office, "customer" for customers.
 */
export async function createClient(door: Door) {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookieOptions: { name: cookieNameFor(door) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
