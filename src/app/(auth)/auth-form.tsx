"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { requestPasswordReset, signIn, updatePassword, type FormState } from "./actions";

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      suffix={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-sand hover:text-ink-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "flex items-start gap-2.5 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          : "flex items-start gap-2.5 rounded-2xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-800"
      }
    >
      {tone === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <MailCheck className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  const linkError = params.get("error") === "link";
  const signedOut = params.get("signed_out") === "1";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      {state?.error && <Alert>{state.error}</Alert>}
      {!state?.error && linkError && <Alert>That link has expired or was already used. Please request a new one.</Alert>}
      {!state?.error && signedOut && <Alert tone="success">You&apos;ve been signed out. See you soon.</Alert>}
      <Field label="Email address" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
      </Field>
      <Field
        label={
          <span className="flex w-full items-center justify-between">
            Password
            <Link href="/forgot-password" className="text-[0.8125rem] font-semibold text-forest-700 hover:underline">
              Forgot password?
            </Link>
          </span>
        }
        htmlFor="password"
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="Your password" />
      </Field>
      <Button type="submit" size="lg" block loading={pending}>
        Log in <ArrowRight />
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Email address" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Button type="submit" size="lg" block loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
      <Button type="submit" size="lg" block loading={pending}>
        Save password
      </Button>
    </form>
  );
}
