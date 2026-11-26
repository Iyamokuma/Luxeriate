import type { Metadata } from "next";
import { Suspense } from "react";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { ListSkeleton } from "@/components/admin/skeletons";
import { EditStaffButton, InviteStaffButton } from "@/components/admin/staff-tools";
import { requireStaff } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import type { Profile } from "@/types/db";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  const session = await requireStaff("staff.manage");
  const { data } = await session.supabase.from("profiles").select("*").in("role", ["owner", "staff"]).order("role").order("full_name");
  const staff = (data ?? []) as Profile[];
  const label = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Owners have full control. Staff accounts only see and do what you allow. Every change is recorded in the activity log."
        actions={<InviteStaffButton />}
      />
      <Card className="divide-y divide-line overflow-hidden">
        {staff.map((s) => (
          <div key={s.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar name={s.full_name || s.email} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{s.full_name || s.email}</p>
                  {s.role === "owner" ? (
                    <Badge tone="ink" size="sm">
                      <Crown className="size-3" /> Owner
                    </Badge>
                  ) : (
                    <Badge tone="forest" size="sm">
                      Staff
                    </Badge>
                  )}
                  {!s.is_active && <Badge tone="danger" size="sm">Deactivated</Badge>}
                  {s.id === session.userId && <Badge tone="outline" size="sm">You</Badge>}
                </div>
                <p className="text-sm text-ink-500">
                  {s.email} · added {relativeTime(s.created_at)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {s.role === "owner" ? (
                    <span className="text-sm text-ink-500">Full access to everything</span>
                  ) : s.permissions.length ? (
                    s.permissions.map((p) => (
                      <span key={p} className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-ink-600">
                        {label[p] ?? p}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-ink-400">No permissions yet</span>
                  )}
                </div>
              </div>
            </div>
            {s.role === "staff" && s.id !== session.userId && (
              <EditStaffButton userId={s.id} name={s.full_name || s.email} permissions={s.permissions} isActive={s.is_active} />
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
