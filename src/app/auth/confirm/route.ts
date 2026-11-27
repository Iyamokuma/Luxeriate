import { NextResponse, type NextRequest } from "next/server";
import { createClient as createStatelessClient, type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { doorOf } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * Landing point for password-reset and staff-invite links. The link is checked
 * first, then the session is stored at the account's own door: the team's
 * session for staff and the owner, the customer session for customers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/reset-password";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/reset-password";

  if (tokenHash && type) {
    const verifier = createStatelessClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await verifier.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.session && data.user) {
      const { data: profile } = await createAdminClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      const door = doorOf(profile);
      const supabase = await createClient(door);
      const set = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      if (!set.error) {
        const to = new URL(safeNext, request.url);
        if (to.pathname === "/reset-password" && door === "team") to.searchParams.set("door", "team");
        return NextResponse.redirect(to);
      }
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
