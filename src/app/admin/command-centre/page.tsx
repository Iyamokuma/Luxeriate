import type { Metadata } from "next";
import { Suspense } from "react";
import { CommandCentre, CommandCentreSkeleton } from "../_home/command-centre";

export const metadata: Metadata = { title: "Command centre" };

export default function CommandCentrePage(props: PageProps<"/admin/command-centre">) {
  return (
    <Suspense fallback={<CommandCentreSkeleton />}>
      <CommandCentre searchParams={props.searchParams} />
    </Suspense>
  );
}
