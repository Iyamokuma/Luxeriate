/**
 * Resting pose of the hero dashboard window. Shared by the server markup (so the
 * first paint already has the pose) and the WebGL layer (so the gold rings sit
 * in exactly the same 3D space as the HTML window).
 */
export const HERO_TILT = { rx: 9, ry: -19, rz: 2 } as const;

/** How far the pointer can lean the window, in degrees. */
export const HERO_LEAN = { rx: 3.5, ry: 5 } as const;

export function tiltTransform(t: { rx: number; ry: number; rz: number }) {
  return `rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${t.rz}deg)`;
}
