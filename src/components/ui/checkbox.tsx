"use client";

import { Checkbox as C, Switch as S } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-md border border-line-strong bg-white shadow-[inset_0_1px_2px_rgb(30_26_22/0.05)] transition hover:border-ink-300 data-[state=checked]:border-forest-700 data-[state=checked]:bg-forest-700 data-[state=checked]:text-cream aria-[invalid=true]:border-danger-500",
        className,
      )}
      {...props}
    >
      <C.Indicator className="animate-scale-in">
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-ink-200 transition-colors data-[state=checked]:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[var(--ease-spring)] data-[state=checked]:translate-x-[1.375rem]" />
    </S.Root>
  );
}
