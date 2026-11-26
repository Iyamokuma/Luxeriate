import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ARCS, L_POLY, M_POLY, MARK_CENTER, crescentPoints, type Crescent, type Pt } from "@/lib/brand/logo-geometry";

/**
 * Three.js versions of the logo, built from the same traced coordinates as the
 * SVG. Units are pixels of the master artwork, centred on the ring, y up.
 */

function shape(points: readonly Pt[]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const X = x - MARK_CENTER[0];
    const Y = MARK_CENTER[1] - y;
    if (i === 0) s.moveTo(X, Y);
    else s.lineTo(X, Y);
  });
  s.closePath();
  return s;
}

function extrude(points: readonly Pt[], depth: number, bevel: number) {
  const geo = new THREE.ExtrudeGeometry(shape(points), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  // smooth across the bevels and the curved crescent walls, keep the letter corners crisp
  return toCreasedNormals(geo, (38 * Math.PI) / 180);
}

/**
 * Same tips and outer curve as the logo, but with the stroke's thickness at its
 * widest point multiplied by `k` (the logo's proportions look heavy when the
 * ring is drawn hundreds of pixels wide).
 */
function slim(arc: Crescent, k: number): Crescent {
  if (k === 1) return arc;
  const h = Math.abs(arc.b[0] - arc.a[0]) / 2;
  const sag = (r: number) => r - Math.sqrt(r * r - h * h);
  const so = sag(arc.outer);
  const si = so - (so - sag(arc.inner)) * k;
  return { ...arc, inner: (h * h + si * si) / (2 * si) };
}

export function crescentGeometries(depth = 22, bevel = 5, thickness = 1) {
  return ARCS.map((arc) => extrude(crescentPoints(slim(arc, thickness), 160), depth, bevel));
}

export function letterGeometries(depth = 70, bevel = 6) {
  return [extrude(L_POLY, depth, bevel), extrude(M_POLY, depth, bevel)];
}

/** Outer radius of the gold ring in master units. */
export const RING_RADIUS = 300;

export function goldMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#d9a93a"),
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.15,
  });
}

export function enamelMaterial(hex: string) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    metalness: 0,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.55,
  });
}

export function createRenderer(canvas: HTMLCanvasElement, maxDpr = 1.75) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  // On machines where the browser falls back to drawing WebGL on the CPU, the
  // sculptures would cost a second per frame. Skip them; the page is complete without.
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  if (/swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(name)) {
    renderer.dispose();
    throw new Error(`Software WebGL (${name})`);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** A soft studio environment for reflections, so gold reads as gold. */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.035).texture;
  room.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  });
  pmrem.dispose();
  return texture;
}

export function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const m = mesh.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m.dispose();
  });
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `frame` on every animation frame while the element is on screen and the
 * tab is visible. If the device can't keep up (under ~25 fps once warmed up),
 * it stops animating and leaves the last frame in place. Returns a stop function.
 */
export function loopWhileVisible(el: Element, frame: (dt: number, t: number) => void, opts: { once?: boolean } = {}) {
  let raf = 0;
  let onScreen = false;
  let last = performance.now();
  let t = 0;
  let count = 0;
  let slowTime = 0;
  let tooSlow = false;
  const tick = (now: number) => {
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    t += dt;
    frame(dt, t);
    // ignore the first frames (shader compilation), then sample 40 frames
    count++;
    if (count > 10 && count <= 50) {
      slowTime += raw;
      if (count === 50 && slowTime / 40 > 0.04) {
        tooSlow = true;
        raf = 0;
        return;
      }
    }
    raf = requestAnimationFrame(tick);
  };
  const sync = () => {
    const run = onScreen && document.visibilityState === "visible" && !opts.once && !tooSlow;
    if (run && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (opts.once && onScreen) frame(0, t);
    sync();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}

export { THREE };
