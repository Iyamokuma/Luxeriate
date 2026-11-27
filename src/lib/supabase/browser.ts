"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookieNameFor, type Door } from "./doors";

const clients: Partial<Record<Door, SupabaseClient>> = {};

/** One browser client per door, each reading its own session cookie. */
export function createClient(door: Door): SupabaseClient {
  return (clients[door] ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookieOptions: { name: cookieNameFor(door) }, isSingleton: false },
  ));
}
