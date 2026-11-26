import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { AppSettings, CollectionPoint, PackageWithItems } from "@/types/db";

/**
 * Used when Supabase can't be reached (e.g. a build without credentials):
 * still prerenderable, but retried a minute later instead of hours later.
 */
const RETRY_SOON = { stale: 60, revalidate: 60, expire: 300 };

export type Catalog = { year: number | null; packages: PackageWithItems[] };

function sortItems(p: PackageWithItems): PackageWithItems {
  return { ...p, package_items: [...(p.package_items ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}

/**
 * The packages shown on the public site: the latest cycle that is open for
 * sign-up, or the latest cycle overall when registration has closed.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag("packages");
  try {
    const supabase = createPublicClient();
    const { data: years, error: yErr } = await supabase
      .from("packages")
      .select("cycle_year, is_open")
      .order("cycle_year", { ascending: false });
    if (yErr) throw yErr;
    const year = years?.find((y) => y.is_open)?.cycle_year ?? years?.[0]?.cycle_year ?? null;
    if (!year) {
      cacheLife("minutes");
      return { year: null, packages: [] };
    }
    const { data, error } = await supabase
      .from("packages")
      .select("*, package_items(*)")
      .eq("cycle_year", year)
      .order("sort_order");
    if (error) throw error;
    cacheLife("hours");
    return { year, packages: (data as PackageWithItems[]).map(sortItems) };
  } catch (err) {
    console.error("[catalog] could not load packages", err);
    cacheLife(RETRY_SOON);
    return { year: null, packages: [] };
  }
}

export async function getPackageBySlug(slug: string): Promise<PackageWithItems | null> {
  const catalog = await getCatalog();
  const inCatalog = catalog.packages.find((p) => p.slug === slug);
  if (inCatalog) return inCatalog;
  return getLatestPackageBySlug(slug);
}

async function getLatestPackageBySlug(slug: string): Promise<PackageWithItems | null> {
  "use cache";
  cacheTag("packages");
  cacheLife("hours");
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("packages")
      .select("*, package_items(*)")
      .eq("slug", slug)
      .order("cycle_year", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? sortItems(data as PackageWithItems) : null;
  } catch {
    return null;
  }
}

export async function getCollectionPoints(): Promise<CollectionPoint[]> {
  "use cache";
  cacheTag("collection-points");
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("collection_points")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    cacheLife("hours");
    return (data ?? []) as CollectionPoint[];
  } catch {
    cacheLife(RETRY_SOON);
    return [];
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  business_name: "Luxuriate Foodstuff",
  support_email: null,
  support_phone: null,
  whatsapp_number: null,
  office_address: null,
  reminder_days_before: 3,
  late_grace_days: 7,
  send_overdue_notices: true,
  terms_content: "",
  terms_updated_at: null,
};

export async function getPublicSettings(): Promise<AppSettings> {
  "use cache";
  cacheTag("settings");
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    cacheLife("hours");
    return { ...DEFAULT_SETTINGS, ...(data as AppSettings) };
  } catch {
    cacheLife(RETRY_SOON);
    return DEFAULT_SETTINGS;
  }
}
