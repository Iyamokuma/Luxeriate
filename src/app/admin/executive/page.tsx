import { Suspense } from "react";
import { redirect } from "next/navigation";
import { firstParam } from "@/lib/utils";

/** The executive brief now lives at /admin; keep old links working. */
export default function ExecutivePage(props: PageProps<"/admin/executive">) {
  return (
    <Suspense>
      <Forward searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Forward({ searchParams }: { searchParams: PageProps<"/admin/executive">["searchParams"] }): Promise<React.ReactNode> {
  const year = firstParam((await searchParams).year);
  return redirect(year ? `/admin?year=${encodeURIComponent(year)}` : "/admin");
}
