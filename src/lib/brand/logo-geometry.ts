/**
 * The Luxuriate "LM" mark, traced from the supplied logo artwork (1536×1024).
 * One source of truth for the SVG logo and the Three.js sculptures.
 */

export const BRAND = {
  green: "#014e22",
  gold: "#cf9e29",
} as const;

export type Pt = readonly [number, number];

/** Optical centre of the mark (centre of the gold ring). */
export const MARK_CENTER: Pt = [758.5, 381];

export const L_POLY: readonly Pt[] = [
  [514, 256],
  [589, 193],
  [589, 461],
  [775, 461],
  [829, 528],
  [514, 528],
];

export const M_POLY: readonly Pt[] = [
  [670, 217],
  [833, 367],
  [994, 218],
  [994, 528],
  [928, 528],
  [928, 366],
  [833, 459],
  [734, 365],
  [734, 438],
  [670, 438],
];

/**
 * Each gold crescent runs between two tips. The outer edge is an arc of radius
 * `outer`, the inner edge a flatter arc of radius `inner` through the same tips,
 * so the stroke swells in the middle and tapers to a point at both ends.
 */
export type Crescent = { a: Pt; b: Pt; outer: number; inner: number; side: "top" | "bottom" };

export const ARCS: readonly Crescent[] = [
  { a: [492, 233], b: [1025, 233], outer: 295.4, inner: 319.8, side: "top" },
  { a: [480, 514], b: [1037, 514], outer: 303.4, inner: 323.9, side: "bottom" },
];

/** Tight box around the mark, with a little breathing room. */
export const MARK_BOX = { x: 472, y: 58, w: 573, h: 647 } as const;

/** Square box centred on the ring, for icons and avatars. */
export const MARK_SQUARE = { x: 418.5, y: 41, size: 680 } as const;

export function polyPath(points: readonly Pt[]) {
  return `M${points.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

export function crescentPath(c: Crescent) {
  const [ax, ay] = c.a;
  const [bx, by] = c.b;
  // top arc bulges upwards: clockwise from a to b in SVG's y-down space
  const out = c.side === "top" ? 1 : 0;
  const back = 1 - out;
  return `M${ax} ${ay}A${c.outer} ${c.outer} 0 0 ${out} ${bx} ${by}A${c.inner} ${c.inner} 0 0 ${back} ${ax} ${ay}Z`;
}

/** Point list for a crescent (for extrusion), outer edge a→b then inner edge b→a. */
export function crescentPoints(c: Crescent, segments = 64): Pt[] {
  const edge = (r: number, from: Pt, to: Pt): Pt[] => {
    const h = Math.abs(to[0] - from[0]) / 2;
    const mx = (from[0] + to[0]) / 2;
    const off = Math.sqrt(r * r - h * h);
    const cy = c.side === "top" ? from[1] + off : from[1] - off;
    const a0 = Math.atan2(from[1] - cy, from[0] - mx);
    const a1 = Math.atan2(to[1] - cy, to[0] - mx);
    // both edges are minor arcs, so the short way round always passes the bulge
    const delta = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    const pts: Pt[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = a0 + (delta * i) / segments;
      pts.push([mx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return pts;
  };
  const outer = edge(c.outer, c.a, c.b);
  const inner = edge(c.inner, c.b, c.a).slice(1, -1);
  return [...outer, ...inner];
}
