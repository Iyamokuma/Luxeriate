import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { YearSwitcher } from "@/components/admin/url-controls";
import { requireStaff } from "@/lib/auth";
import { getCycleYears } from "@/lib/data/admin";
import { ENROLLMENT_LABEL } from "@/lib/constants";
import { formatDate, number } from "@/lib/format";
import { cn, firstParam } from "@/lib/utils";
import type { EnrollmentOverview } from "@/types/db";

export const metadata: Metadata = { title: "Referrals" };

type Leader = {
  enrollment_id: string;
  full_name: string;
  phone: string | null;
  referral_code: string;
  customer_code: string;
  package_name: string;
  referred_count: number;
  active_count: number;
  completed_count: number;
};

export default function ReferralsPage(props: PageProps<"/admin/referrals">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ReferralsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ReferralsContent({ searchParams }: { searchParams: PageProps<"/admin/referrals">["searchParams"] }) {
  const sp = await searchParams;
  const session = await requireStaff("referrals.view");
  const { years, year } = await getCycleYears(session, firstParam(sp.year));
  const [{ data: leaders }, { data: recent }] = await Promise.all([
    session.supabase.rpc("referral_leaderboard", { p_cycle_year: year }),
    session.supabase
      .from("enrollment_overview")
      .select("*")
      .eq("cycle_year", year)
      .not("referred_by_enrollment_id", "is", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const board = (leaders ?? []) as Leader[];
  const referred = (recent ?? []) as EnrollmentOverview[];
  const totalReferred = board.reduce((s, l) => s + Number(l.referred_count), 0);
  const converted = board.reduce((s, l) => s + Number(l.active_count) + Number(l.completed_count), 0);
  const medal = ["bg-leaf-300 text-forest-950", "bg-ink-200 text-ink-800", "bg-clay-200 text-clay-800"];

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description="Who is bringing in new customers. Reward them however you choose." actions={<YearSwitcher years={years} year={year} />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="People referred" value={number(totalReferred)} icon={<Gift />} tone="forest" />
        <Stat label="Now paying" value={number(converted)} hint="Active or completed" tone="forest" />
        <Stat label="Customers who referred" value={number(board.length)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-leaf-600" /> Top referrers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {board.length === 0 ? (
              <EmptyState icon={<Gift />} title="No referrals yet" description="When customers join with someone's code, the leaderboard fills up." />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH className="w-12">#</TH>
                      <TH>Customer</TH>
                      <TH>Code</TH>
                      <TH className="text-right">Referred</TH>
                      <TH className="text-right">Paying</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {board.map((l, i) => (
                      <TR key={l.enrollment_id}>
                        <TD>
                          <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-bold", medal[i] ?? "bg-sand text-ink-500")}>{i + 1}</span>
                        </TD>
                        <TD>
                          <Link href={`/admin/customers/${l.enrollment_id}`} className="font-semibold text-ink-900 hover:underline">
                            {l.full_name}
                          </Link>
                          <span className="block text-xs text-ink-400">
                            {l.package_name} · {l.phone}
                          </span>
                        </TD>
                        <TD className="font-mono text-xs">{l.referral_code}</TD>
                        <TD className="tnum text-right font-semibold text-ink-900">{l.referred_count}</TD>
                        <TD className="tnum text-right">{Number(l.active_count) + Number(l.completed_count)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest referred customers</CardTitle>
          </CardHeader>
          <CardContent>
            {referred.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">None yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {referred.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <Avatar name={e.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/customers/${e.id}`} className="block truncate text-sm font-semibold text-ink-900 hover:underline">
                        {e.full_name}
                      </Link>
                      <p className="truncate text-xs text-ink-400">
                        via <span className="font-mono">{e.referred_by_code}</span> · {formatDate(e.created_at)}
                      </p>
                    </div>
                    <Badge tone={e.status === "active" ? "forest" : e.status === "completed" ? "ink" : "tide"} size="sm">
                      {ENROLLMENT_LABEL[e.status]}
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
