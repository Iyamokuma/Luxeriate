import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-xl border border-line-strong bg-white text-[0.9375rem] text-ink-900 shadow-[inset_0_1px_2px_rgb(30_26_22/0.04)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-300 hover:border-ink-300 focus:border-forest-500 focus:ring-4 focus:ring-forest-500/12 disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink-500 aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-500/10";

type InputProps = Omit<React.ComponentProps<"input">, "prefix"> & { prefix?: React.ReactNode; suffix?: React.ReactNode };

export function Input({ className, prefix, suffix, ...props }: InputProps) {
  if (!prefix && !suffix) return <input className={cn(inputBase, "h-11 px-3.5", className)} {...props} />;
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-400">{prefix}</span>
      )}
      <input className={cn(inputBase, "h-11 px-3.5", prefix && "pl-9", suffix && "pr-11", className)} {...props} />
      {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-2">{suffix}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(inputBase, "min-h-24 px-3.5 py-2.5 leading-relaxed", className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          inputBase,
          "h-11 appearance-none pl-3.5 pr-10 [&:has(option[value='']:checked)]:text-ink-300",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-semibold text-ink-800", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 flex-1">{label}</span>
          {optional && <span className="text-xs font-normal text-ink-400">Optional</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="animate-fade-in text-[0.8125rem] font-medium text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[0.8125rem] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
