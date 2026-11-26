"use client";

import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({ className, sideOffset = 8, align = "end", ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-2xl border border-line bg-cream p-1.5 shadow-lift data-[state=open]:animate-scale-in",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-sand data-[highlighted]:text-ink-900 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-400",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-3 pb-1 pt-2 text-xs text-ink-400", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("my-1.5 h-px bg-line", className)} {...props} />;
}
