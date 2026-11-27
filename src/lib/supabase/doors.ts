/**
 * Luxuriate has two front doors, each with its own session cookie, so a team
 * member and a customer can be signed in on the same browser at the same time:
 *
 * - "team": the back office. Signs in at /admin; covers /admin/* and /api/admin/*.
 * - "customer": customers. Sign in at /login; covers /dashboard, checkout and the rest.
 */
export type Door = "team" | "customer";

const COOKIE: Record<Door, string> = { team: "lux-team-auth", customer: "lux-customer-auth" };

/** The cookie (storage key) that holds a door's session. */
export const cookieNameFor = (door: Door) => COOKIE[door];

/** Which door a request path belongs to. */
export function doorFor(pathname: string): Door {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/") ? "team" : "customer";
}
