import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotForm } from "../auth-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Back to log in
      </Link>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900">Forgot your password?</h1>
      <p className="mt-2 text-ink-500">Enter the email you registered with and we&apos;ll send you a link to choose a new one.</p>
      <div className="mt-9">
        <ForgotForm />
      </div>
    </>
  );
}
