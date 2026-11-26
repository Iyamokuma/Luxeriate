import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { DashboardNav, MobileTabBar } from "@/components/dashboard/nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { getSession } from "@/lib/auth";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="sticky top-0 z-40 bg-night/95 text-cream shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Logo light />
          </Link>
          <DashboardNav />
          <Suspense fallback={<div className="size-9 rounded-full bg-white/10" />}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <MobileTabBar />
    </div>
  );
}

async function AccountMenu() {
  const session = await getSession();
  if (!session) return null;
  return <UserMenu name={session.profile.full_name || session.email} email={session.email} isStaff={session.profile.role !== "customer"} />;
}
