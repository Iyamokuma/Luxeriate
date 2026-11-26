import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageDetail } from "@/components/marketing/package-detail";
import { getCatalog, getCollectionPoints, getPackageBySlug } from "@/lib/data/catalog";
import { naira } from "@/lib/format";

export async function generateStaticParams() {
  const { packages } = await getCatalog();
  return packages.length ? packages.map((p) => ({ slug: p.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/packages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) return { title: "Package not found" };
  return {
    title: `${pkg.name} package`,
    description: `${naira(pkg.monthly_amount_kobo)} a month for ${pkg.duration_months} months. ${pkg.tagline ?? ""}`.trim(),
  };
}

export default function PackagePage({ params }: PageProps<"/packages/[slug]">) {
  return (
    <Suspense fallback={<PackageSkeleton />}>
      <PackageContent params={params} />
    </Suspense>
  );
}

async function PackageContent({ params }: { params: PageProps<"/packages/[slug]">["params"] }) {
  const { slug } = await params;
  const [pkg, catalog, points] = await Promise.all([getPackageBySlug(slug), getCatalog(), getCollectionPoints()]);
  if (!pkg) notFound();

  return <PackageDetail pkg={pkg} catalog={catalog.packages} points={points} />;
}

function PackageSkeleton() {
  return (
    <div>
      <div className="border-b border-line bg-cream">
        <div className="mx-auto max-w-7xl space-y-5 px-4 pb-20 pt-24 sm:px-6 lg:px-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}
