import {
  ARCS,
  BRAND,
  L_POLY,
  M_POLY,
  MARK_BOX,
  crescentPath,
  polyPath,
} from "@/lib/brand/logo-geometry";
import { SUBTITLE, WORDMARK } from "@/lib/brand/wordmark";
import { cn } from "@/lib/utils";

const ARCS_D = ARCS.map(crescentPath).join("");
const LM_D = polyPath(L_POLY) + polyPath(M_POLY);

type Tone = "brand" | "light";

// Arcs read a CSS variable so the dashboards can swap the gold for their leaf accent.
const TONES: Record<Tone, { letters: string; arcs: string }> = {
  brand: { letters: BRAND.green, arcs: `var(--logo-arcs, ${BRAND.gold})` },
  light: { letters: "#fffdf9", arcs: "var(--logo-arcs-light, #ddb343)" },
};

/** The LM monogram inside its two arcs (gold on the website, leaf in the dashboards). */
export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <svg
      viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
      className={cn("h-9 w-auto shrink-0", className)}
      aria-hidden
    >
      <path style={{ fill: t.arcs }} d={ARCS_D} />
      <path fill={t.letters} d={LM_D} />
    </svg>
  );
}

/** "LUXURIATE" lettering on its own. */
export function Wordmark({ className, tone = "brand" }: { className?: string; tone?: Tone }) {
  return (
    <svg viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`} className={cn("h-3 w-auto", className)} aria-hidden>
      <path fill={TONES[tone].letters} d={WORDMARK.d} />
    </svg>
  );
}

/**
 * Horizontal lockup for headers: mark + lettering, with an optional label
 * after a hairline (e.g. "Back office").
 */
export function Logo({
  className,
  light,
  compact,
  tag,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
  tag?: string;
}) {
  const tone: Tone = light ? "light" : "brand";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className="h-[2.125rem]" />
      {!compact && (
        <>
          <span className="sr-only">Luxuriate</span>
          <Wordmark tone={tone} className="h-[0.8125rem]" />
          {tag && (
            <span
              className={cn(
                "ml-1 border-l pl-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em]",
                light ? "border-white/20 text-forest-200" : "border-ink-900/15 text-ink-500",
              )}
            >
              {tag}
            </span>
          )}
        </>
      )}
      {compact && <span className="sr-only">Luxuriate</span>}
    </span>
  );
}

/** The full stacked logo exactly as supplied: mark, LUXURIATE, INTERNATIONAL MART LIMITED. */
export function LogoFull({ className, tone = "brand" }: { className?: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <svg viewBox="213 52 1110 890" className={cn("h-24 w-auto", className)} role="img" aria-label="Luxuriate International Mart Limited">
      <path style={{ fill: t.arcs }} d={ARCS_D} />
      <path fill={t.letters} d={LM_D} />
      <path fill={t.letters} transform="translate(223 743)" d={WORDMARK.d} />
      <path fill={t.letters} transform="translate(232 899)" d={SUBTITLE.d} />
    </svg>
  );
}

/**
 * The two gold arcs on their own, as a quiet background motif for dark cards.
 * Colour comes from `currentColor`, so set it with a text-* class.
 */
export function ArcsMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
      className={cn("pointer-events-none w-auto -rotate-[18deg]", className)}
      aria-hidden
    >
      <path fill="currentColor" d={ARCS_D} />
    </svg>
  );
}
