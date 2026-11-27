"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, ShoppingBasket, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";

/** `admin` is the back-office menu; signing out there ends only the team session. */
export function UserMenu({ name, email, admin }: { name: string; email: string; admin?: boolean }) {
  return (
    <Dropdown>
      <DropdownTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none ring-forest-500/20 transition hover:ring-4 focus-visible:ring-4">
        <Avatar name={name} />
      </DropdownTrigger>
      <DropdownContent className="w-64">
        <div className="px-3 pb-2 pt-1.5">
          <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
          <p className="truncate text-xs text-ink-400">{email}</p>
        </div>
        <DropdownSeparator />
        {admin ? (
          <DropdownItem asChild>
            <Link href="/">
              <ShoppingBasket /> View website
            </Link>
          </DropdownItem>
        ) : (
          <>
            <DropdownItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard /> Dashboard
              </Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/dashboard/profile">
                <UserRound /> Profile
              </Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/#packages">
                <ShoppingBasket /> Browse packages
              </Link>
            </DropdownItem>
          </>
        )}
        <DropdownSeparator />
        <form action={admin ? "/auth/signout?door=team" : "/auth/signout"} method="post">
          <DropdownItem asChild>
            <button type="submit" className="w-full text-danger-600 [&_svg]:!text-danger-500">
              <LogOut /> Sign out
            </button>
          </DropdownItem>
        </form>
      </DropdownContent>
    </Dropdown>
  );
}
