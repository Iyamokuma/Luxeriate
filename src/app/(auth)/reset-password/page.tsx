import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "../auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900">Choose a password</h1>
      <p className="mt-2 text-ink-500">Pick something memorable that you don&apos;t use anywhere else.</p>
      <div className="mt-9">
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </>
  );
}
