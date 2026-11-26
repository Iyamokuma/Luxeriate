"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, Plus } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { openPackages } from "./package-browser";

const NAV: { href: string; label: string; packages?: boolean }[] = [
  { href: "/#choose", label: "Packages", packages: true },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "Questions" },
  { href: "/about", label: "About" },
];

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // the homepage opens on a dark hero, so start in light-on-dark there
  const [onDark, setOnDark] = useState(pathname === "/");
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn();

  useEffect(() => {
    // light text whenever the header sits over a dark section
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const line = 36; // middle of the header
      const dark = [...document.querySelectorAll("[data-dark]")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      setOnDark(dark);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        onDark
          ? scrolled
            ? "bg-night/75 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl backdrop-saturate-150"
            : "bg-transparent"
          : scrolled
            ? "bg-paper/80 shadow-[0_1px_0_rgb(30_26_22/0.07)] backdrop-blur-xl backdrop-saturate-150"
            : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[77.5rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Luxuriate Foodstuff home" className="shrink-0">
          <Logo light={onDark} tag="Foodstuff" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={(e) => {
                if (!n.packages) return;
                e.preventDefault();
                openPackages();
              }}
              className={cn(
                "text-[0.875rem] font-medium transition-colors",
                onDark ? "text-ink-200 hover:text-cream" : "text-ink-600 hover:text-ink-950",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          {signedIn ? (
            <Button asChild variant={onDark ? "light" : "ink"} size="sm" className="h-10 px-4">
              <Link href="/dashboard">
                My account <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn("h-10 px-4", onDark && "text-ink-200 hover:bg-white/10 hover:text-cream")}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant={onDark ? "light" : "ink"} size="sm" className="h-10 px-4" onClick={() => openPackages()}>
                <Plus className="size-3.5" strokeWidth={2.75} /> Join now
              </Button>
            </>
          )}
        </div>

        <button
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition lg:hidden",
            onDark ? "text-cream hover:bg-white/10" : "text-ink-800 hover:bg-sand",
          )}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="left-auto right-0 data-[state=open]:animate-[fade-in_0.25s]">
          <div className="flex h-[4.5rem] items-center justify-between px-5">
            <Logo />
            <button
              className="flex size-10 items-center justify-center rounded-full hover:bg-sand"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-3 py-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={(e) => {
                  setOpen(false);
                  if (!n.packages) return;
                  e.preventDefault();
                  openPackages();
                }}
                className="rounded-2xl px-4 py-3.5 text-xl font-semibold tracking-[-0.02em] text-ink-800 transition hover:bg-sand"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-line p-5">
            {signedIn ? (
              <Button asChild size="lg" variant="ink" block>
                <Link href="/dashboard" onClick={() => setOpen(false)}>My account</Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="ink"
                  block
                  onClick={() => {
                    setOpen(false);
                    openPackages();
                  }}
                >
                  Choose a package
                </Button>
                <Button asChild size="lg" variant="secondary" block>
                  <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
