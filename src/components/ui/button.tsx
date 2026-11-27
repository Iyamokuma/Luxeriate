import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-forest-700 text-cream shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(20_44_34/0.35),0_6px_16px_-6px_rgb(20_44_34/0.45)] hover:bg-forest-800",
        accent:
          "bg-clay-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(111_51_32/0.35),0_6px_16px_-6px_rgb(196_98_60/0.5)] hover:bg-clay-600",
        ink: "bg-ink-950 text-cream shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_1px_2px_rgb(0_0_0/0.3),0_8px_20px_-8px_rgb(21_18_15/0.55)] hover:bg-ink-800",
        secondary: "border border-line-strong bg-cream text-ink-900 shadow-soft hover:border-ink-300 hover:bg-white",
        subtle: "bg-sand text-ink-800 hover:bg-ink-100",
        ghost: "text-ink-600 hover:bg-sand hover:text-ink-900",
        danger: "bg-danger-600 text-white shadow-soft hover:bg-danger-700",
        "danger-ghost": "text-danger-600 hover:bg-danger-50",
        light: "bg-cream text-forest-900 shadow-soft hover:bg-white",
        leaf: "bg-leaf-300 text-forest-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(30_60_10/0.3),0_12px_28px_-12px_rgb(166_214_69/0.65)] hover:bg-leaf-200",
        "outline-light": "border border-white/25 text-cream hover:bg-white/10",
        link: "h-auto px-0 text-forest-700 underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
        sm: "h-9 rounded-lg px-3.5 text-sm",
        md: "h-11 rounded-xl px-5 text-[0.9375rem]",
        lg: "h-[3.25rem] rounded-2xl px-7 text-base",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
      pill: { true: "rounded-full" },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, pill, block, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, pill, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          )}
          <span className={cn("inline-flex items-center gap-[inherit]", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
}
