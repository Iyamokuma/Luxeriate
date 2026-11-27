import Link from "next/link";
import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Monogram3D } from "@/components/three/monogram-3d";
import { StaffLoginForm } from "@/app/(auth)/auth-form";

/** What a signed-out visitor sees at /admin: the team's own way in. Customers sign in at /login. */
export function AdminSignIn() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,40rem)_1fr]">
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="w-fit" aria-label="Home">
            <Logo tag="Back office" />
          </Link>
          <Link href="/login" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
            Customer login
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[25rem] animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-2.5 py-1 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-honey-200">
              <LockKeyhole className="size-3" /> Team only
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900">Back office</h1>
            <p className="mt-2 text-ink-500">Sign in to run Luxuriate: customers, payments, packages and deliveries.</p>
            <div className="mt-9">
              <Suspense>
                <StaffLoginForm />
              </Suspense>
            </div>
            <p className="mt-8 rounded-2xl bg-sand/70 px-4 py-3 text-center text-sm text-ink-600">
              Saving for a package?{" "}
              <Link href="/login" className="font-semibold text-forest-700 hover:underline">
                Log in to your dashboard
              </Link>
            </p>
          </div>
        </div>
        <p className="text-center font-mono text-[0.6875rem] text-ink-400 lg:text-left">Every change in the back office is recorded in the activity log.</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-night text-cream lg:flex lg:flex-col">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-50 invert [mask-image:radial-gradient(ellipse_80%_60%_at_50%_35%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_40%,rgb(207_158_41/0.2),transparent),radial-gradient(60%_50%_at_100%_100%,rgb(1_78_34/0.45),transparent)]" />
        <div className="relative min-h-0 flex-1">
          <Monogram3D tone="light" className="absolute inset-0" />
        </div>
        <div className="relative px-14 pb-14">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-honey-300">Luxuriate · Back office</p>
          <p className="mt-4 max-w-md text-[2.125rem] font-bold leading-[1.1] tracking-[-0.035em]">
            The whole business, <span className="text-honey-300">on one screen.</span>
          </p>
          <div className="mt-9 grid max-w-md grid-cols-3 gap-2.5">
            {[
              ["Money", "Live"],
              ["Customers", "Live"],
              ["Deliveries", "Live"],
            ].map(([label, state]) => (
              <div key={label} className="rounded-xl bg-white/[0.05] p-3.5 ring-1 ring-inset ring-white/10">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-400">{label}</p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-cream">
                  <span className="size-1.5 rounded-full bg-forest-300" /> {state}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
