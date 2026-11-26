import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MobileNav, Sidebar, type NavKey } from "@/components/admin/sidebar";
import { CommandSearch } from "@/components/admin/command-search";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Logo } from "@/components/ui/logo";
import { can, getSession, isStaff } from "@/lib/auth";
import type { Permission } from "@/lib/constants";
import type { Profile } from "@/types/db";

const NAV_PERMS: [NavKey, Permission | null][] = [
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
  return NAV_PERMS.filter(([, p]) => !p || can(profile, p)).map(([k]) => k);
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-cream lg:block" />}>
        <StaffSidebar />
      </Suspense>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <Suspense fallback={null}>
              <StaffMobileNav />
            </Suspense>
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <div className="flex flex-1 justify-center lg:justify-start">
              <CommandSearch />
            </div>
            <Suspense fallback={<div className="size-9 rounded-full bg-sand" />}>
              <StaffMenu />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

async function StaffSidebar() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isStaff(session.profile)) redirect("/dashboard");
  return <Sidebar allowed={allowedFor(session.profile)} />;
}

async function StaffMobileNav() {
  const session = await getSession();
  if (!session || !isStaff(session.profile)) return null;
  return <MobileNav allowed={allowedFor(session.profile)} />;
}

async function StaffMenu() {
  const session = await getSession();
  if (!session) return null;
  return <UserMenu name={session.profile.full_name || session.email} email={session.email} isStaff admin />;
}
