import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Door } from "@/lib/supabase/doors";

/**
 * Signs out of one door only: `?door=team` ends the back-office session and
 * returns to /admin; otherwise the customer session ends and returns to
 * /login. The other door stays signed in.
 */
export async function POST(request: Request) {
  const door: Door = new URL(request.url).searchParams.get("door") === "team" ? "team" : "customer";
  const supabase = await createClient(door);
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(door === "team" ? "/admin?signed_out=1" : "/login?signed_out=1", request.url), { status: 303 });
}
