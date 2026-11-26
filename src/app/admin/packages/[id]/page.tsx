import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { PackageEditor } from "@/components/admin/package-editor";
import { requireStaff } from "@/lib/auth";
import type { PackageWithItems } from "@/types/db";

export const metadata: Metadata = { title: "Edit package" };

export default function EditPackagePage({ params }: PageProps<"/admin/packages/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditPackage params={params} />
    </Suspense>
  );
}

async function EditPackage({ params }: { params: PageProps<"/admin/packages/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const session = await requireStaff("packages.manage");
  const [{ data }, { count }] = await Promise.all([
    session.supabase.from("packages").select("*, package_items(*)").eq("id", id).maybeSingle(),
    session.supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("package_id", id).neq("status", "cancelled"),
  ]);
  if (!data) notFound();
  const pkg = data as PackageWithItems;
  pkg.package_items = [...pkg.package_items].sort((a, b) => a.sort_order - b.sort_order);
  return <PackageEditor pkg={pkg} year={pkg.cycle_year} customers={count ?? 0} />;
}
