import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { SettingsForms } from "@/components/admin/settings-forms";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import type { AppSettings, CollectionPoint } from "@/types/db";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const session = await requireStaff("settings.manage");
  const [{ data: settings }, { data: points }] = await Promise.all([
    session.supabase.from("app_settings").select("*").eq("id", 1).single<AppSettings>(),
    session.supabase.from("collection_points").select("*").order("sort_order"),
  ]);
  const key = env.paystackSecretKey;
  const integrations = {
    paystack: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : env.paystackTestMode ? "simulated" : "missing",
    webhookUrl: `${env.siteUrl}/api/paystack/webhook`,
    email: env.emailProvider,
    emailFrom: env.emailFrom,
    cron: Boolean(env.cronSecret && env.cronSecret !== "change-me-to-a-long-random-string"),
    dva: env.dvaEnabled,
    siteUrl: env.siteUrl,
  } as const;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Business details, reminders, terms and collection points." />
      <SettingsForms settings={settings!} points={(points ?? []) as CollectionPoint[]} integrations={integrations} />
    </div>
  );
}
