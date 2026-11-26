import { cn } from "@/lib/utils";

const tones = {
  forest: "bg-gradient-to-r from-forest-500 to-forest-700",
  clay: "bg-gradient-to-r from-clay-400 to-clay-600",
  honey: "bg-gradient-to-r from-honey-300 to-honey-500",
  light: "bg-gradient-to-r from-honey-200 to-honey-400",
};

export function Progress({
  value,
  className,
  tone = "forest",
  trackClassName,
  size = "md",
}: {
  value: number;
  className?: string;
  tone?: keyof typeof tones;
  trackClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-ink-100",
        size === "sm" ? "h-1.5" : size === "md" ? "h-2.5" : "h-3.5",
        trackClassName,
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-1000 ease-[var(--ease-out-soft)]", tones[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  className,
  trackClassName = "stroke-ink-100",
  barClassName = "stroke-forest-600",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out-soft)]", barClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
