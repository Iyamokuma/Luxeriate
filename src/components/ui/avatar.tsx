import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const palettes = [
  "bg-forest-100 text-forest-800",
  "bg-honey-100 text-honey-700",
  "bg-blush-100 text-clay-700",
  "bg-sand text-ink-700",
  "bg-clay-100 text-clay-800",
  "bg-forest-50 text-forest-700",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, className, size = "md" }: { name: string; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide",
        size === "sm" ? "size-7 text-[0.6875rem]" : size === "md" ? "size-9 text-xs" : "size-12 text-sm",
        palettes[hash(name || "?") % palettes.length],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
