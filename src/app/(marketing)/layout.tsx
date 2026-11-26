import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PackageBrowser } from "@/components/marketing/package-browser";
import { getCatalog, getCollectionPoints } from "@/lib/data/catalog";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Packages />
    </div>
  );
}

/** The "View our packages" modal, available on every public page. */
async function Packages() {
  const [{ packages }, points] = await Promise.all([getCatalog(), getCollectionPoints()]);
  return <PackageBrowser packages={packages} hubs={points.length} />;
}
