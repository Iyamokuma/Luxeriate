import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, Gift, Send, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { ReferralShare } from "@/components/dashboard/referral-share";
import { getSession } from "@/lib/auth";
import { getMyEnrollments } from "@/lib/data/customer";
import { ENROLLMENT_LABEL } from "@/lib/constants";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { ArcsMotif } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Referrals" };

export default function ReferralsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Referrals</h1>
        <p className="mt-1.5 text-ink-500">Bring friends and family along. Luxuriate rewards top referrers.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-80 rounded-[1.25rem]" />}>
        <ReferralsContent />
      </Suspense>
    </div>
  );
}

async function ReferralsContent() {
  const session = await getSession("customer");
  if (!session) redirect("/login?next=/dashboard/referrals");
  const [enrollments, { data }] = await Promise.all([getMyEnrollments(session), session.supabase.rpc("my_referrals")]);
  const codes = enrollments.filter((e) => e.referral_code);
  const referrals = (data ?? []) as { referral_code: string; first_name: string; package_name: string; status: keyof typeof ENROLLMENT_LABEL; joined_at: string }[];
  const active = referrals.filter((r) => r.status === "active" || r.status === "completed").length;

  if (!codes.length) {
    return (
      <Card>
        <EmptyState icon={<Gift />} title="Your code is on its way" description="You'll get a personal referral code as soon as your first payment is confirmed." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Send, title: "Share your code", body: "Send it on WhatsApp or copy it anywhere." },
          { icon: UserPlus, title: "They register", body: "Friends enter your code on the registration form." },
          { icon: BadgeCheck, title: "It counts once they pay", body: "Luxuriate rewards its top referrers each cycle." },
        ].map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="card flex items-start gap-3.5 p-4 sm:p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-leaf-100 text-forest-800 ring-1 ring-inset ring-leaf-200">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Step {i + 1}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink-900">{title}</p>
              <p className="mt-0.5 text-[0.8125rem] text-ink-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          {codes.map((e) => (
            <div key={e.id} className="relative overflow-hidden rounded-[1.5rem] bg-forest-800 p-7 text-cream shadow-float">
              <ArcsMotif className="absolute -right-8 -top-10 h-52 text-leaf-300/25" />
              <p className="eyebrow relative text-leaf-300">{e.package_name}</p>
              <p className="relative mt-3 font-mono text-4xl font-semibold tracking-wider">{e.referral_code}</p>
              <p className="relative mt-2 text-sm text-forest-100/80">Friends enter this code on the registration form.</p>
              <div className="relative mt-6 [&_a]:border-white/20 [&_a]:bg-white/10 [&_a]:text-cream [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-cream">
                <ReferralShare code={e.referral_code!} siteUrl={env.siteUrl} compact />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">People referred</p>
                <p className="tnum mt-2 text-3xl font-semibold tracking-tight text-ink-900">{referrals.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Now paying</p>
                <p className="tnum mt-2 text-3xl font-semibold tracking-tight text-forest-700">{active}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>People you&apos;ve referred</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <EmptyState icon={<Users />} title="No referrals yet" description="When someone joins with your code, they'll appear here." className="py-10" />
            ) : (
              <ul className="divide-y divide-line">
                {referrals.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 py-3.5">
                    <Avatar name={r.first_name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{r.first_name}</p>
                      <p className="text-xs text-ink-400">
                        {r.package_name} · joined {formatDate(r.joined_at)}
                      </p>
                    </div>
                    <Badge tone={r.status === "active" ? "forest" : r.status === "completed" ? "ink" : "neutral"} size="sm">
                      {ENROLLMENT_LABEL[r.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
