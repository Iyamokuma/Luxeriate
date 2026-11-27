import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { CommandCentre, CommandCentreSkeleton } from "./_home/command-centre";
import { ExecutiveBrief, ExecutiveSkeleton } from "./_home/executive";

export const metadata: Metadata = { title: "Back office" };

/** Everyone's back-office home: the executive brief for the owner, the command centre for staff. */
export default function AdminHome(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<CommandCentreSkeleton />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const session = await requireStaff();
  if (session.profile.role !== "owner") return <CommandCentre searchParams={searchParams} />;
  return (
    <Suspense fallback={<ExecutiveSkeleton />}>
      <ExecutiveBrief session={session} searchParams={searchParams} />
    </Suspense>
  );
}
