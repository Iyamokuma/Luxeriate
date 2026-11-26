"use client";

import { Accordion as A } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = A.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof A.Item>) {
  return <A.Item className={cn("border-b border-line", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header>
      <A.Trigger
        className={cn(
          "group flex w-full items-center justify-between gap-6 py-5 text-left text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink-900 transition hover:text-forest-700",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-cream transition duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-forest-200 group-data-[state=open]:bg-forest-50 group-data-[state=open]:text-forest-700">
          <Plus className="size-4" />
        </span>
      </A.Trigger>
    </A.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content
      className="overflow-hidden data-[state=closed]:animate-[fade-in_0.2s_reverse] data-[state=open]:animate-fade-in"
      {...props}
    >
      <div className={cn("max-w-2xl pb-6 pr-12 leading-relaxed text-ink-600", className)}>{children}</div>
    </A.Content>
  );
}
