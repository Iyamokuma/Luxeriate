import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every navigation and sends
 * signed-out visitors away from private areas. This is only an optimistic
 * check; every private page and action verifies the user again on the server.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
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
  const { pathname, search } = request.nextUrl;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPrivate = pathname.startsWith("/dashboard") || isAdmin;
  // /admin itself is the team's sign-in page when signed out
  if (!signedIn && isPrivate && pathname !== "/admin") {
    const login = request.nextUrl.clone();
    // the team signs in at /admin, customers at /login
    login.pathname = isAdmin ? "/admin" : "/login";
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
