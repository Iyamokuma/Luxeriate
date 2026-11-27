"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, LayoutDashboard, Receipt, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/payments", label: "Payments", icon: Receipt },
  { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 rounded-full bg-sand p-1 ring-1 ring-inset ring-line md:flex" aria-label="Account">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition",
            isActive(pathname, i.href) ? "bg-cream text-ink-950 shadow-soft ring-1 ring-line" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Account"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2.5">
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition",
                  active ? "bg-leaf-200 text-forest-900" : "text-ink-400",
                )}
              >
                <Icon className="size-[1.15rem]" />
              </span>
              <span className={cn("text-[0.6875rem] font-semibold", active ? "text-ink-950" : "text-ink-400")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
