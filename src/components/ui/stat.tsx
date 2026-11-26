import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "forest" | "clay" | "honey";
  className?: string;
}) {
  const toneBg = {
    neutral: "bg-sand text-ink-600",
    forest: "bg-forest-50 text-forest-700",
    clay: "bg-clay-50 text-clay-600",
    honey: "bg-honey-50 text-honey-600",
  }[tone];
  return (
    <div className={cn("card relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-ink-500">{label}</p>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-xl [&_svg]:size-4", toneBg)}>{icon}</span>}
      </div>
      <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink-900">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
