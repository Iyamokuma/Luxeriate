import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/data/catalog";
import { formatDate } from "@/lib/format";
import { Markdown } from "@/components/markdown";

export const metadata: Metadata = { title: "Terms and conditions" };

export default async function TermsPage() {
  const s = await getPublicSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="eyebrow text-forest-600">The fine print</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">Terms and conditions</h1>
      {s.terms_updated_at && <p className="mt-3 text-sm text-ink-400">Last updated {formatDate(s.terms_updated_at, "long")}</p>}
      <div className="card mt-10 p-6 sm:p-10">
        {s.terms_content ? (
          <Markdown content={s.terms_content} className="prose-lux" />
        ) : (
          <p className="text-ink-500">Our terms and conditions will be published here shortly.</p>
        )}
      </div>
    </div>
  );
}
