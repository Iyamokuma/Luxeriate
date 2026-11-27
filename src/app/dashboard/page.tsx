import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardOverview, Greeting } from "@/components/dashboard/overview";
import { getSession, isStaff } from "@/lib/auth";
import { getEnrollmentDetail, getMyEnrollments, pickEnrollment } from "@/lib/data/customer";
import { firstName } from "@/lib/format";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "My dashboard" };

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const session = await getSession("customer");
  if (!session) redirect("/login?next=/dashboard");
  if (isStaff(session.profile)) redirect("/admin");

  const enrollments = await getMyEnrollments(session);
  const e = pickEnrollment(enrollments, firstParam(sp.e));
  const name = firstName(session.profile.full_name);

  if (!e) {
    return (
      <div className="space-y-8">
        <Greeting name={name} />
        <Card>
          <EmptyState
            icon={<ShoppingBasket />}
            title="You haven't joined a package yet"
            description="Choose a foodstuff package to start your monthly contributions."
            action={
              <Button asChild pill>
                <Link href="/#packages">
                  Browse packages <ArrowRight />
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const { installments, events, payments, items } = await getEnrollmentDetail(session, e.id, e.package_id);

  return (
    <DashboardOverview
      name={name}
      enrollments={enrollments}
      e={e}
      installments={installments}
      events={events}
      payments={payments}
      items={items}
      profile={session.profile}
      payParam={firstParam(sp.pay) === "1"}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="h-[38rem] animate-pulse rounded-[2rem] bg-night lg:h-[33rem]" />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Skeleton className="h-96 rounded-[1.25rem]" />
        <Skeleton className="h-96 rounded-[1.25rem]" />
      </div>
      <Skeleton className="h-48 rounded-[1.25rem]" />
    </div>
  );
}
