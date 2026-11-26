"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Gift,
  HandCoins,
  LayoutDashboard,
  Mail,
  Menu,
  Package,
  PiggyBank,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Sheet, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type NavKey =
  | "overview" | "customers" | "payments" | "packages" | "procurement" | "fulfilment" | "savings"
  | "referrals" | "emails" | "reports" | "staff" | "activity" | "settings";

const GROUPS: { label: string; items: { key: NavKey; href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "",
    items: [{ key: "overview", href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Customers & money",
    items: [
      { key: "customers", href: "/admin/customers", label: "Customers", icon: Users },
      { key: "payments", href: "/admin/payments", label: "Payments", icon: HandCoins },
      { key: "referrals", href: "/admin/referrals", label: "Referrals", icon: Gift },
    ],
  },
  {
    label: "Packages & delivery",
    items: [
      { key: "packages", href: "/admin/packages", label: "Packages", icon: Package },
      { key: "procurement", href: "/admin/procurement", label: "Procurement", icon: ShoppingCart },
      { key: "fulfilment", href: "/admin/fulfilment", label: "Fulfilment", icon: Truck },
      { key: "savings", href: "/admin/savings", label: "Savings returns", icon: PiggyBank },
    ],
  },
  {
    label: "Run the business",
    items: [
      { key: "emails", href: "/admin/emails", label: "Emails", icon: Mail },
      { key: "reports", href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { key: "staff", href: "/admin/staff", label: "Staff", icon: UserCog },
      { key: "activity", href: "/admin/activity", label: "Activity log", icon: Activity },
      { key: "settings", href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavList({ allowed, onNavigate }: { allowed: NavKey[]; onNavigate?: () => void }) {
  // the navigation always sits on the dark night-green panel
  const pathname = usePathname();
  const params = useSearchParams();
  const year = params.get("year");
  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Back office">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => allowed.includes(i.key));
        if (!items.length) return null;
        return (
          <div key={g.label || "top"}>
            {g.label && <p className="eyebrow mb-2 px-3 text-ink-400">{g.label}</p>}
            <ul className="space-y-0.5">
              {items.map(({ key, href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <li key={key}>
                    <Link
                      href={year && key !== "staff" && key !== "settings" && key !== "activity" ? `${href}?year=${year}` : href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[0.9375rem] font-medium transition",
                        active
                          ? "bg-white/[0.09] text-cream shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-honey-400"
                          : "text-ink-300 hover:bg-white/[0.05] hover:text-cream",
                      )}
                    >
                      <Icon className={cn("size-[1.05rem] shrink-0", active ? "text-honey-300" : "text-ink-400 group-hover:text-ink-200")} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ allowed }: { allowed: NavKey[] }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-night text-cream lg:flex">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_35%_at_0%_0%,rgb(207_158_41/0.10),transparent_70%)]" />
      <div className="relative flex h-16 items-center px-6">
        <Link href="/admin" aria-label="Back office home">
          <Logo light />
        </Link>
      </div>
      <div className="relative flex-1 overflow-y-auto py-4">
        <NavList allowed={allowed} />
      </div>
      <div className="relative border-t border-white/10 px-6 py-4">
        <p className="eyebrow text-ink-400">Back office</p>
      </div>
    </aside>
  );
}

export function MobileNav({ allowed }: { allowed: NavKey[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="flex size-10 items-center justify-center rounded-xl text-ink-700 hover:bg-sand lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-night text-cream">
          <div className="flex h-16 items-center px-6">
            <Logo light />
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <NavList allowed={allowed} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
