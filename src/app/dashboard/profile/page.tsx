import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth";
import { ProfileForms } from "./forms";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Profile</h1>
        <p className="mt-1.5 text-ink-500">Keep your contact details up to date so we can reach you.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-[1.25rem]" />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}

async function ProfileContent() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/profile");
  const p = session.profile;
  return (
    <ProfileForms
      email={session.email}
      initial={{
        full_name: p.full_name,
        phone: p.phone ?? "",
        whatsapp: p.whatsapp ?? "",
        address: p.address ?? "",
        state: p.state ?? "",
        lga: p.lga ?? "",
        emergency_contact_name: p.emergency_contact_name ?? "",
        emergency_contact_phone: p.emergency_contact_phone ?? "",
      }}
    />
  );
}
