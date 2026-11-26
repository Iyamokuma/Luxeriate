import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-9 w-[30rem] max-w-full rounded-full" />
      <Skeleton className="h-[32rem] rounded-[1.25rem]" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-96 max-w-full" />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[40rem] rounded-[1.25rem]" />
        <Skeleton className="h-[40rem] rounded-[1.25rem]" />
      </div>
    </div>
  );
}
