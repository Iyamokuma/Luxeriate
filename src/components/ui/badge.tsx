import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none tracking-[-0.003em]",
  {
    variants: {
      tone: {
        neutral: "bg-sand text-ink-600",
        forest: "bg-forest-100 text-forest-800",
        clay: "bg-clay-100 text-clay-700",
        honey: "bg-honey-100 text-honey-700",
        danger: "bg-danger-100 text-danger-700",
        ink: "bg-ink-900 text-cream",
        outline: "border border-line-strong bg-cream text-ink-600",
        light: "bg-white/15 text-cream",
      },
      size: {
        sm: "h-5 px-2 text-[0.6875rem]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-[0.8125rem]",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

const dotColor: Record<string, string> = {
  neutral: "bg-ink-400",
  forest: "bg-forest-500",
  clay: "bg-clay-500",
  honey: "bg-honey-500",
  danger: "bg-danger-500",
  ink: "bg-honey-300",
  outline: "bg-ink-400",
  light: "bg-honey-300",
};

export function Badge({
  className,
  tone,
  size,
  dot,
  pulse,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean; pulse?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", dotColor[tone ?? "neutral"])} />}
          <span className={cn("relative size-1.5 rounded-full", dotColor[tone ?? "neutral"])} />
        </span>
      )}
      {children}
    </span>
  );
}
