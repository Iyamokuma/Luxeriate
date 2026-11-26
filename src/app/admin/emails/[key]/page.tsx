import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { TemplateEditor } from "@/components/admin/email-tools";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import type { EmailTemplate } from "@/types/db";

export const metadata: Metadata = { title: "Edit email" };

export default function TemplatePage({ params }: PageProps<"/admin/emails/[key]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TemplateContent params={params} />
    </Suspense>
  );
}

async function TemplateContent({ params }: { params: PageProps<"/admin/emails/[key]">["params"] }) {
  const { key } = await params;
  const session = await requireStaff("emails.manage");
  const [{ data }, { data: s }] = await Promise.all([
    session.supabase.from("email_templates").select("*").eq("key", key).maybeSingle<EmailTemplate>(),
    session.supabase.from("app_settings").select("business_name").eq("id", 1).single(),
  ]);
  if (!data) notFound();
  return <TemplateEditor template={data} businessName={s?.business_name ?? "Luxuriate Foodstuff"} siteUrl={env.siteUrl} />;
}
