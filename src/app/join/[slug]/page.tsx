import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalog, getCollectionPoints, getPackageBySlug } from "@/lib/data/catalog";
import { getSession, isStaff } from "@/lib/auth";
import { lagosToday } from "@/lib/format";
import { JoinWizard } from "./wizard";

export const metadata: Metadata = { title: "Join a package", robots: { index: false } };

export async function generateStaticParams() {
  const { packages } = await getCatalog();
  return packages.length ? packages.map((p) => ({ slug: p.slug })) : [{ slug: "__placeholder__" }];
}

export default function JoinPage({ params }: PageProps<"/join/[slug]">) {
  return (
    <Suspense fallback={<JoinSkeleton />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({ params }: { params: PageProps<"/join/[slug]">["params"] }) {
  const { slug } = await params;
  const [pkg, points, session] = await Promise.all([getPackageBySlug(slug), getCollectionPoints(), getSession()]);
  if (!pkg) notFound();

  if (!pkg.is_open) {
    return (
      <Notice title="Registration has closed" body={`Sign-ups for ${pkg.name} are closed for the ${pkg.cycle_year} cycle.`}>
        <Button asChild pill>
          <Link href="/#packages">See open packages</Link>
        </Button>
      </Notice>
    );
  }

  if (session && isStaff(session.profile)) {
    return (
      <Notice title="You're signed in as staff" body="Staff accounts can't join packages. Sign out and register with a customer account.">
        <Button asChild pill>
          <Link href="/admin">Go to the back office</Link>
        </Button>
      </Notice>
    );
  }

  if (session) {
    const { data: existing } = await session.supabase
      .from("enrollments")
      .select("id, status")
      .eq("package_id", pkg.id)
      .neq("status", "cancelled")
      .maybeSingle();
    if (existing && existing.status !== "pending_payment") redirect("/dashboard");
  }

  // Joining after the cycle started? Offer to catch up on the months already due.
  const today = lagosToday();
  const start = pkg.start_month;
  const monthsElapsed =
    (Number(today.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + (Number(today.slice(5, 7)) - Number(start.slice(5, 7))) + 1;
  const catchUp = Math.max(1, Math.min(pkg.duration_months, monthsElapsed));

  const p = session?.profile;
  return (
    <JoinWizard
      pkg={pkg}
      points={points}
      catchUpMonths={catchUp}
      account={
        p
          ? {
              full_name: p.full_name,
              email: session.email,
              phone: p.phone ?? "",
              whatsapp: p.whatsapp ?? "",
              address: p.address ?? "",
              state: p.state ?? "",
              lga: p.lga ?? "",
              emergency_contact_name: p.emergency_contact_name ?? "",
              emergency_contact_phone: p.emergency_contact_phone ?? "",
            }
          : null
      }
    />
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sand text-ink-500">
        <Lock className="size-6" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink-900">{title}</h1>
      <p className="mt-3 text-ink-500">{body}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function JoinSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[34rem] rounded-3xl" />
      </div>
      <Skeleton className="hidden h-96 rounded-3xl lg:block" />
    </div>
  );
}
