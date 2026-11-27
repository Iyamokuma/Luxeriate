import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MobileNav, Sidebar, type NavKey, type SidebarUser } from "@/components/admin/sidebar";
import { AdminSignIn } from "@/components/admin/admin-sign-in";
import { CommandSearch } from "@/components/admin/command-search";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Logo } from "@/components/ui/logo";
import { can, getSession, isStaff, type Session } from "@/lib/auth";
import type { Permission } from "@/lib/constants";
import type { Profile } from "@/types/db";

const NAV_PERMS: [NavKey, Permission | null][] = [
  ["executive", null],
  ["overview", null],
  ["customers", "customers.view"],
  ["payments", "payments.view"],
  ["referrals", "referrals.view"],
  ["packages", "packages.manage"],
  ["procurement", "procurement.view"],
  ["fulfilment", "fulfilment.manage"],
  ["savings", "savings.manage"],
  ["emails", "emails.manage"],
  ["reports", "reports.view"],
  ["staff", "staff.manage"],
  ["activity", "activity.view"],
  ["settings", "settings.manage"],
];

function allowedFor(profile: Profile) {
  return NAV_PERMS.filter(([k, p]) => (k === "executive" ? profile.role === "owner" : !p || can(profile, p))).map(([k]) => k);
}

function userFor(profile: Profile, email: string): SidebarUser {
  return { name: profile.full_name || email, role: profile.role === "owner" ? "owner" : "staff", permissions: profile.permissions.length };
}

/**
 * /admin is the team's front door: signed out, it shows the back-office
 * sign-in (customers use /login); signed in as staff or the owner, the back
 * office itself.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return <AdminSignIn />;
  if (!isStaff(session.profile)) redirect("/dashboard");
  return <Shell session={session}>{children}</Shell>;
}

function Shell({ session, children }: { session: Session; children: React.ReactNode }) {
  const allowed = allowedFor(session.profile);
  const owner = session.profile.role === "owner";
  return (
    <div className="min-h-dvh">
      <Sidebar allowed={allowed} owner={owner} user={userFor(session.profile, session.email)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <MobileNav allowed={allowed} owner={owner} />
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <div className="flex flex-1 justify-center lg:justify-start">
              <CommandSearch />
            </div>
            <UserMenu name={session.profile.full_name || session.email} email={session.email} isStaff admin />
          </div>
        </header>
        <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-night lg:block" />
      <div className="lg:pl-64">
        <div className="h-16 border-b border-line bg-paper/85" />
        <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] bg-night" />
        </div>
      </div>
    </div>
  );
}
