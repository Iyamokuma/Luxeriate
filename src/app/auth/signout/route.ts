import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs out and returns the team to their sign-in at /admin, customers to /login. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let team = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    team = data?.role === "owner" || data?.role === "staff";
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(team ? "/admin?signed_out=1" : "/login?signed_out=1", request.url), { status: 303 });
}
