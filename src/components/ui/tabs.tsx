"use client";

import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn("inline-flex items-center gap-1 rounded-2xl border border-line bg-sand/70 p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-500 transition-all hover:text-ink-800 data-[state=active]:bg-cream data-[state=active]:text-ink-900 data-[state=active]:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("outline-none data-[state=active]:animate-fade-in", className)} {...props} />;
}
