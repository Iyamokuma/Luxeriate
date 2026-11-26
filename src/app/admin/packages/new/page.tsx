import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { PackageEditor } from "@/components/admin/package-editor";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "New package" };

export default function NewPackagePage(props: PageProps<"/admin/packages/new">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <NewPackage searchParams={props.searchParams} />
    </Suspense>
  );
}

async function NewPackage({ searchParams }: { searchParams: PageProps<"/admin/packages/new">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("packages.manage");
  const requested = Number(firstParam(sp.year));
  const { year } = await getCycleYears(session, firstParam(sp.year));
  return <PackageEditor year={requested >= 2024 && requested <= 2100 ? requested : year} customers={0} />;
}
