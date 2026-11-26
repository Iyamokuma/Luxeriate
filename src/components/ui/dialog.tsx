"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  size = "md",
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { size?: "sm" | "md" | "lg" | "xl"; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          // bottom sheet on phones, centred card from sm up
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-line bg-cream shadow-float outline-none data-[state=open]:animate-scale-in",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem]",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          size === "xl" && "sm:max-w-4xl",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-200 sm:hidden" />
        {children}
        {!hideClose && (
          <D.Close
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-ink-400 transition hover:bg-sand hover:text-ink-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1.5 px-6 pb-2 pt-6 pr-12", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-line bg-sand/40 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("font-display text-xl font-semibold text-ink-900", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("text-sm leading-relaxed text-ink-500", className)} {...props} />;
}

export function Sheet({ children, ...props }: React.ComponentProps<typeof D.Root>) {
  return <D.Root {...props}>{children}</D.Root>;
}

export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-xs flex-col bg-cream shadow-float outline-none data-[state=open]:animate-sheet-in",
          className,
        )}
        {...props}
      >
        <D.Title className="sr-only">Menu</D.Title>
        {children}
      </D.Content>
    </D.Portal>
  );
}
