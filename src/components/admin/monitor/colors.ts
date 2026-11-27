/**
 * Chart colours for the dashboards, checked with the dataviz palette validator
 * on the white card surface (#ffffff): contributions / fees / third pass the
 * lightness, chroma, colour-blind separation and contrast checks in that
 * order. A plain module (not "use client") so server and client components
 * read the same values.
 */
export const C = {
  contributions: "#1d7a52",
  fees: "#4a7fc8",
  third: "#c2577f",
  other: "#8e9a93",
  remaining: "#d9ebe0",
  good: "#23784c",
  warning: "#d9661f",
  critical: "#c0443a",
  neutral: "#adb7b0",
  /** the one line on the dark band (single series, checked for contrast on #0c1a14) */
  spark: "#c2e86c",
  grid: "#e7ece7",
  axis: "#ccd3c9",
  surface: "#ffffff",
  night: "#0c1a14",
};
