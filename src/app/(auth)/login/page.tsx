import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { doorOf, getSession } from "@/lib/auth";
import { LoginForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900">Welcome back</h1>
      <p className="mt-2 text-ink-500">Log in to see your contributions, receipts and package status.</p>
      <div className="mt-9">
        <Suspense>
          <RedirectIfSignedIn />
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">
        New to Luxuriate?{" "}
        <Link href="/#packages" className="font-semibold text-forest-700 hover:underline">
          Choose a package to join
        </Link>
      </p>
    </>
  );
}

async function RedirectIfSignedIn() {
  const session = await getSession("customer");
  // only the customer session counts here; a team session at /admin is separate
  if (session && doorOf(session.profile) === "customer") redirect("/dashboard");
  return null;
}
