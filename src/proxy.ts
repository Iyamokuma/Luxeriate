import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieNameFor, doorFor } from "@/lib/supabase/doors";

/**
 * Refreshes the session cookie of the door this path belongs to (team for
 * /admin, customer for everything else) and sends signed-out visitors to that
 * door's sign-in. The two doors keep separate cookies, so a team member and a
 * customer can be signed in on the same browser. This is only an optimistic
 * check; every private page and action verifies the user again on the server.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;
  const door = doorFor(pathname);
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: { name: cookieNameFor(door) },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // /admin itself is the team's sign-in page when signed out
  const gated = door === "team" ? pathname.startsWith("/admin/") : pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!signedIn && gated) {
    const login = request.nextUrl.clone();
    login.pathname = door === "team" ? "/admin" : "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|api/paystack|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
