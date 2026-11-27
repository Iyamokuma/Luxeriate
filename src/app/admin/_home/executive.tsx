import { Skeleton } from "@/components/ui/skeleton";
import { ExecutiveView } from "@/components/admin/executive/executive-view";
import type { Session } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { getExecutiveBrief } from "@/lib/data/executive";
import { env } from "@/lib/env";
import { firstParam } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The owner's executive brief, shown at /admin when the owner is signed in. */
export async function ExecutiveBrief({ session, searchParams }: { session: Session; searchParams: SearchParams }) {
  const sp = await searchParams;
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const brief = await getExecutiveBrief(session, year, years);
  return <ExecutiveView name={session.profile.full_name} years={years} year={year} brief={brief} siteUrl={env.siteUrl} />;
}

export function ExecutiveSkeleton() {
  return (
    <div className="space-y-10">
      <div className="h-[40rem] animate-pulse rounded-[1.75rem] bg-night xl:h-[36rem]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[1.25rem]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-[26rem] rounded-[1.25rem]" />
        <Skeleton className="h-[26rem] rounded-[1.25rem]" />
      </div>
    </div>
  );
}
