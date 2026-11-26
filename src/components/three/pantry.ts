import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  createRenderer,
  crescentGeometries,
  disposeScene,
  goldMaterial,
  letterGeometries,
  loopWhileVisible,
  studioEnvironment,
} from "./brand-meshes";

/**
 * "Save monthly, receive your package", told in 3D: a Luxuriate package box
 * fills with foodstuff, one item for every monthly payment. When month twelve
 * lands the full box is sent off for collection and an empty one slides in
 * for the next cycle.
 *
 * Everything is modelled here from primitives with painted labels, so there
 * are no model files to download.
 */

export type PantryPhase = "filling" | "complete" | "moving";
export type PantryState = { phase: PantryPhase; month: number };

// box (units are roughly feet)
const W = 3.2;
const D = 2.1;
const H = 0.85;
const T = 0.08;
const FLOOR = T;

// timeline, in seconds
const START = 0.9;
const STEP = 0.82;
const FALL = 0.55;
const SETTLE = 0.4;
const DROP = 3.4;
const FILLED = START + 11 * STEP + FALL + SETTLE;
const HOLD = 2.2;
const OUT = 1.1;
const IN = 1.2;
const CYCLE = FILLED + HOLD + OUT + IN + 0.3;

const BRAND_GREEN = "#014e22";
const GOLD = "#cf9e29";
const IVORY = "#f1e9d8";

/* ─── painting labels ───────────────────────────────────────── */

type Painter = (c: CanvasRenderingContext2D, w: number, h: number) => void;

function makePainter(font: string, textures: THREE.Texture[]) {
  const tex = (w: number, h: number, paint: Painter) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    paint(c, w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    textures.push(t);
    return t;
  };

  const text = (
    c: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    size: number,
    weight: number,
    color: string,
    spacing = 0,
    align: CanvasTextAlign = "center",
  ) => {
    c.font = `${weight} ${size}px ${font}`;
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = "middle";
    if ("letterSpacing" in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    c.fillText(s, x, y);
    if ("letterSpacing" in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  };

  const weave = (c: CanvasRenderingContext2D, w: number, h: number, base: string) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.16;
    c.strokeStyle = "#5a4526";
    c.lineWidth = 1.2;
    for (let x = 0; x < w; x += 7) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    c.globalAlpha = 0.1;
    for (let y = 0; y < h; y += 7) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  };

  /** woven sack with a printed label panel */
  const sackFace = (base: string, accent: string, name: string, sub: string) =>
    tex(512, 768, (c, w, h) => {
      weave(c, w, h, base);
      c.fillStyle = accent;
      c.fillRect(0, h * 0.08, w, 16);
      c.fillRect(0, h * 0.88, w, 16);
      const px = 62;
      const py = h * 0.24;
      const pw = w - px * 2;
      const ph = h * 0.5;
      c.fillStyle = "#fffdf8";
      c.beginPath();
      c.roundRect(px, py, pw, ph, 22);
      c.fill();
      c.save();
      c.beginPath();
      c.roundRect(px, py, pw, ph, 22);
      c.clip();
      c.fillStyle = BRAND_GREEN;
      c.fillRect(px, py, pw, 74);
      c.restore();
      text(c, "LUXURIATE", w / 2, py + 38, 26, 800, GOLD, 9);
      text(c, name, w / 2, py + ph * 0.5 + 6, 104, 800, accent, -2);
      text(c, sub, w / 2, py + ph * 0.5 + 92, 30, 600, "#6d645a", 3);
    });

  const sackSide = (base: string) => tex(256, 256, (c, w, h) => weave(c, w, h, base));

  /** printed carton front */
  const cartonFace = (
    w: number,
    h: number,
    base: string,
    name: string,
    sub: string,
    ink = "#fffdf8",
    accent = GOLD,
    nameSize = 0.2,
  ) =>
    tex(w, h, (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, w, h);
      c.fillStyle = accent;
      c.fillRect(0, h * 0.7, w, h * 0.05);
      text(c, "LUXURIATE", w / 2, h * 0.14, Math.round(w * 0.075), 800, accent, Math.round(w * 0.02));
      text(c, name, w / 2, h * 0.42, Math.round(Math.min(w, h * 1.4) * nameSize), 800, ink, -1);
      text(c, sub, w / 2, h * 0.86, Math.round(w * 0.07), 600, ink, 2);
    });

  /** wrap-around tin label, printed twice so it reads from either side */
  const tinWrap = (base: string, name: string, sub: string, ink = "#fffdf8") =>
    tex(1024, 280, (c, w, h) => {
      c.fillStyle = base;
      c.fillRect(0, 0, w, h);
      c.fillStyle = GOLD;
      c.fillRect(0, 18, w, 10);
      c.fillRect(0, h - 28, w, 10);
      for (const cx of [w * 0.25, w * 0.75]) {
        text(c, "LUXURIATE", cx, 66, 22, 800, GOLD, 6);
        text(c, name, cx, h * 0.5 + 6, 54, 800, ink, -1);
        text(c, sub, cx, h * 0.5 + 58, 22, 600, ink, 2);
      }
    });

  const yamSkin = () =>
    tex(512, 256, (c, w, h) => {
      c.fillStyle = "#6a4a30";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 3 + 0.5;
        c.fillStyle = Math.random() > 0.5 ? "rgba(40,26,14,0.45)" : "rgba(150,110,70,0.35)";
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    });

  const pool = () =>
    tex(512, 512, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,236,196,0.55)");
      g.addColorStop(0.45, "rgba(232,190,110,0.18)");
      g.addColorStop(1, "rgba(232,190,110,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });

  return { sackFace, sackSide, cartonFace, tinWrap, yamSkin, pool };
}

/* ─── geometry helpers ──────────────────────────────────────── */

function rounded(w: number, h: number, d: number, r: number, segments = 4) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2));
}

/** rounded box with a gentle belly, like a filled sack */
function sackGeometry(w: number, h: number, d: number) {
  const geo = rounded(w, h, d, Math.min(w, d) * 0.4, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / (h / 2);
    const belly = 1 - y * y;
    p.setZ(i, p.getZ(i) * (1 + 0.24 * belly));
    p.setX(i, p.getX(i) * (1 + 0.06 * belly));
  }
  return geo;
}

/** faces: +x, -x, +y, -y, +z (front), -z */
function faces(front: THREE.Material, rest: THREE.Material) {
  return [rest, rest, rest, rest, front, front];
}

const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Item = {
  obj: THREE.Object3D;
  pos: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Euler;
};

export function mountPantry({
  host,
  canvas,
  reduce,
  onState,
}: {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  reduce: boolean;
  onState: (s: PantryState) => void;
}) {
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = createRenderer(canvas, 2);
  } catch {
    return null;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const textures: THREE.Texture[] = [];
  const paint = makePainter(getComputedStyle(document.body).fontFamily || "sans-serif", textures);

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 0.78, 0);

  // root leans with the pointer, cart slides the box in and out
  const root = new THREE.Group();
  const cart = new THREE.Group();
  root.add(cart);
  scene.add(root);

  /* lights */
  // high and slightly in front, so shadows stay tucked under the box
  const key = new THREE.DirectionalLight(0xffe7c2, 2.7);
  key.position.set(-2.2, 8, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight(0xf3c45a, 1.9);
  rim.position.set(3.5, 2.6, -4.5);
  const fill = new THREE.DirectionalLight(0xdfe4ea, 0.4);
  fill.position.set(4.5, 1.5, 3);
  scene.add(key, rim, fill, new THREE.HemisphereLight(0xfff4e2, 0x1e170e, 0.55));

  /* stage floor: a warm pool of light and the contact shadows */
  const poolMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 5.6),
    new THREE.MeshBasicMaterial({ map: paint.pool(), transparent: true, depthWrite: false }),
  );
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.y = -0.002;
  scene.add(poolMesh);
  const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ color: 0x050403, opacity: 0.55 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  /* the box */
  const box = new THREE.Group();
  cart.add(box);
  const ivory = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.62 });
  const inside = new THREE.MeshStandardMaterial({ color: "#d9cdb4", roughness: 0.8 });
  const green = new THREE.MeshStandardMaterial({ color: BRAND_GREEN, roughness: 0.5 });
  const gold = goldMaterial();
  const parts: [THREE.BufferGeometry, THREE.Material, [number, number, number]][] = [
    [rounded(W, T, D, 0.03), inside, [0, T / 2, 0]],
    [rounded(W, H, T, 0.03), ivory, [0, H / 2, D / 2 - T / 2]],
    [rounded(W, H, T, 0.03), ivory, [0, H / 2, -D / 2 + T / 2]],
    [rounded(T, H, D - T * 2, 0.03), ivory, [W / 2 - T / 2, H / 2, 0]],
    [rounded(T, H, D - T * 2, 0.03), ivory, [-W / 2 + T / 2, H / 2, 0]],
    // green band round the base
    [rounded(W + 0.02, 0.13, T + 0.02, 0.02), green, [0, 0.13, D / 2 - T / 2]],
    [rounded(W + 0.02, 0.13, T + 0.02, 0.02), green, [0, 0.13, -D / 2 + T / 2]],
    [rounded(T + 0.02, 0.13, D, 0.02), green, [W / 2 - T / 2, 0.13, 0]],
    [rounded(T + 0.02, 0.13, D, 0.02), green, [-W / 2 + T / 2, 0.13, 0]],
  ];
  for (const [g, m, p] of parts) {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...p);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    box.add(mesh);
  }
  // gold LM emblem on the front
  const emblem = new THREE.Group();
  for (const g of letterGeometries(16, 3)) emblem.add(new THREE.Mesh(g, gold));
  for (const g of crescentGeometries(10, 2.5)) emblem.add(new THREE.Mesh(g, gold));
  emblem.scale.setScalar(0.00078);
  emblem.position.set(0, H * 0.56, D / 2 + 0.012);
  box.add(emblem);

  /* the twelve items, in the order they arrive */
  const sideMat = (base: string) => new THREE.MeshStandardMaterial({ map: paint.sackSide(base), roughness: 0.95 });
  const faceMat = (map: THREE.Texture, roughness = 0.85) => new THREE.MeshStandardMaterial({ map, roughness });
  const items: Item[] = [];
  const add = (obj: THREE.Object3D, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => {
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    obj.visible = false;
    cart.add(obj);
    items.push({
      obj,
      pos: new THREE.Vector3(...pos),
      rot: new THREE.Euler(...rot),
      spin: new THREE.Euler((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.4),
    });
  };
  const sack = (w: number, h: number, d: number, base: string, accent: string, name: string, sub: string) =>
    new THREE.Mesh(sackGeometry(w, h, d), faces(faceMat(paint.sackFace(base, accent, name, sub), 0.9), sideMat(base)));
  const carton = (w: number, h: number, d: number, base: string, name: string, sub: string, ink?: string, accent?: string, size?: number) => {
    const px = 512;
    const face = paint.cartonFace(px, Math.round((px * h) / w), base, name, sub, ink, accent, size);
    return new THREE.Mesh(rounded(w, h, d, 0.025), faces(faceMat(face, 0.55), new THREE.MeshStandardMaterial({ color: base, roughness: 0.55 })));
  };
  const tin = (r: number, h: number, base: string, name: string, sub: string, ink?: string) => {
    const g = new THREE.Group();
    const lid = new THREE.MeshStandardMaterial({ color: "#c9ccd1", metalness: 1, roughness: 0.32 });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h * 0.86, 48),
      [new THREE.MeshStandardMaterial({ map: paint.tinWrap(base, name, sub, ink), roughness: 0.42, metalness: 0.15 }), lid, lid],
    );
    g.add(body);
    for (const y of [h / 2 - h * 0.05, -h / 2 + h * 0.05]) {
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.1, 48), lid);
      rimMesh.position.y = y;
      g.add(rimMesh);
    }
    return g;
  };

  const LY = (h: number) => FLOOR + h / 2;

  // 1 rice
  add(sack(1.15, 1.75, 0.6, "#efe8d8", BRAND_GREEN, "RICE", "PARBOILED · 50 KG"), [-1.0, LY(1.75), -0.42], [0.02, 0.2, 0.03]);
  // 2 beans
  add(sack(0.95, 1.3, 0.55, "#e6d7bb", "#8b3f26", "BEANS", "BROWN · 25 KG"), [1.05, LY(1.3), -0.42], [0, -0.28, -0.04]);
  // 3 garri
  add(sack(1.0, 1.0, 0.52, "#f2efe6", "#b0841f", "GARRI", "WHITE · 25 KG"), [-0.92, LY(1.0), 0.45], [-0.05, -0.12, 0.02]);
  // 4 vegetable oil, a 5-litre jerrycan
  {
    const g = new THREE.Group();
    const plastic = new THREE.MeshPhysicalMaterial({ color: "#e7b42c", roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const label = paint.cartonFace(512, 600, "#fffdf8", "VEG. OIL", "5 LITRES", BRAND_GREEN, GOLD, 0.22);
    const body = new THREE.Mesh(rounded(0.78, 1.2, 0.42, 0.09), faces(new THREE.MeshPhysicalMaterial({ map: label, roughness: 0.4, clearcoat: 0.4 }), plastic));
    g.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 12, 24, Math.PI), plastic);
    handle.position.set(-0.14, 0.6, 0);
    g.add(handle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 24), green);
    cap.position.set(0.22, 0.66, 0);
    g.add(cap);
    add(g, [0.08, LY(1.2), -0.55], [0, 0.06, 0]);
  }
  // 5 spaghetti, standing and leaning
  add(carton(0.36, 1.32, 0.16, "#1f3c88", "SPAGHETTI", "500 G", "#fffdf8", GOLD, 0.28), [0.66, LY(1.32) + 0.02, -0.18], [0.05, -0.2, -0.13]);
  // 6 noodles carton
  add(carton(0.86, 0.6, 0.6, "#c79c62", "NOODLES", "40 PACKS", "#5a2a14", "#8b3f26", 0.22), [-0.08, LY(0.6), 0.42], [0, 0.08, 0]);
  // 7 tomato paste
  add(tin(0.19, 0.34, "#b8322a", "TOMATO", "PASTE · 400 G"), [0.55, LY(0.34), 0.52]);
  // 8 evaporated milk
  add(tin(0.17, 0.36, "#1d4f91", "MILK", "EVAPORATED"), [0.96, LY(0.36), 0.56]);
  // 9 seasoning cubes, on the noodles
  add(carton(0.44, 0.3, 0.3, "#c0392b", "SEASONING", "CUBES · 100", "#ffe9a8", "#ffe9a8", 0.24), [-0.1, FLOOR + 0.6 + 0.15, 0.42], [0, 0.42, 0]);
  // 10 sugar
  add(carton(0.5, 0.44, 0.3, "#fbfaf6", "SUGAR", "CUBES · 500 G", "#2a5db0", "#2a5db0", 0.24), [1.24, LY(0.44), 0.36], [0, -0.3, 0]);
  // 11 salt, on the milk tin
  add(carton(0.3, 0.42, 0.2, "#fbfaf6", "SALT", "IODISED", BRAND_GREEN, BRAND_GREEN, 0.3), [0.96, FLOOR + 0.36 + 0.21, 0.56], [0, -0.5, 0]);
  // 12 yam
  {
    const geo = new THREE.CapsuleGeometry(0.17, 1.25, 10, 24);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const taper = 1 - 0.28 * Math.max(0, y / 0.8);
      const lump = 1 + 0.08 * Math.sin(y * 7.3) + 0.05 * Math.sin(y * 13.1 + 1.7);
      p.setX(i, p.getX(i) * taper * lump);
      p.setZ(i, p.getZ(i) * taper * lump * 0.92);
    }
    geo.computeVertexNormals();
    const yam = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: paint.yamSkin(), roughness: 0.96 }));
    // resting across the front, clear of the sack labels
    add(yam, [0.32, 0.88, 0.7], [0.1, 0.14, Math.PI / 2 - 0.1]);
  }

  /* layout */
  const layout = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit ~5.4 units across (or ~4.6 tall), looking down at about 31°
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(5.4 / 2 / Math.tan(hfov / 2), 4.6 / 2 / Math.tan(vfov / 2));
    const elev = (31 * Math.PI) / 180;
    camera.position.set(0, target.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };

  /* interaction: lean towards the pointer, drag to turn */
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let turn = 0;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      velocity = dx * 0.01;
      turn += velocity;
      return;
    }
    if (reduce || e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    lean.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    lean.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    velocity = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "";
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  /* animation */
  let last = "";
  const emit = (phase: PantryPhase, month: number) => {
    const k = `${phase}:${month}`;
    if (k === last) return;
    last = k;
    onState({ phase, month });
  };

  const tmpRot = new THREE.Euler();
  const placeItems = (tc: number) => {
    let landed = 0;
    items.forEach((it, i) => {
      const s = START + i * STEP;
      const o = it.obj;
      if (tc < s) {
        o.visible = false;
        return;
      }
      o.visible = true;
      const ft = (tc - s) / FALL;
      if (ft < 1) {
        const p = easeIn(ft);
        o.position.set(it.pos.x, it.pos.y + DROP * (1 - p), it.pos.z);
        const r = 1 - easeOut(ft);
        tmpRot.set(it.rot.x + it.spin.x * r, it.rot.y + it.spin.y * r, it.rot.z + it.spin.z * r);
        o.rotation.copy(tmpRot);
        o.scale.set(1, 1, 1);
        return;
      }
      landed++;
      const st = Math.min(1, (tc - s - FALL) / SETTLE);
      const wobble = Math.sin(st * Math.PI) * (1 - st);
      o.position.set(it.pos.x, it.pos.y + 0.05 * Math.sin(st * Math.PI * 2) * (1 - st), it.pos.z);
      o.rotation.copy(it.rot);
      o.scale.set(1 + 0.05 * wobble, 1 - 0.08 * wobble, 1 + 0.05 * wobble);
    });
    return landed;
  };

  const frame = (dt: number, t: number) => {
    const ease = Math.min(1, dt * 2.5);
    lean.x += (lean.tx - lean.x) * ease;
    lean.y += (lean.ty - lean.y) * ease;
    if (!dragging) {
      turn += velocity;
      velocity *= Math.pow(0.05, dt);
      turn += (0 - turn) * Math.min(1, dt * 0.8);
    }
    root.rotation.y = -0.5 + (reduce ? 0 : Math.sin(t * 0.22) * 0.1) + lean.x * 0.22 + turn;
    root.rotation.x = lean.y * 0.06;

    if (reduce) {
      placeItems(1e6);
      cart.position.set(0, 0, 0);
      emit("complete", 12);
    } else {
      const tc = t % CYCLE;
      if (tc < FILLED) {
        cart.position.set(0, 0, 0);
        cart.rotation.set(0, 0, 0);
        emit("filling", placeItems(tc));
      } else if (tc < FILLED + HOLD) {
        placeItems(1e6);
        const ht = (tc - FILLED) / HOLD;
        // a small, pleased hop
        const hop = ht < 0.35 ? Math.sin((ht / 0.35) * Math.PI) : 0;
        cart.position.set(0, hop * 0.18, 0);
        emit("complete", 12);
      } else if (tc < FILLED + HOLD + OUT) {
        placeItems(1e6);
        const ot = easeInOut((tc - FILLED - HOLD) / OUT);
        cart.position.set(ot * 9, 0, 0);
        cart.rotation.set(0, 0, -Math.sin(ot * Math.PI) * 0.06);
        emit("moving", 12);
      } else {
        // empty box rolls in from the other side
        items.forEach((item) => (item.obj.visible = false));
        const p = easeOut(Math.min(1, (tc - FILLED - HOLD - OUT) / IN));
        cart.position.set(-9 * (1 - p), 0, 0);
        cart.rotation.set(0, 0, Math.sin(p * Math.PI) * 0.05);
        emit("filling", 0);
      }
    }
    renderer.render(scene, camera);
    if (!host.dataset.ready) host.dataset.ready = "";
  };

  layout();
  const ro = new ResizeObserver(() => {
    layout();
    if (reduce) frame(0, 0);
  });
  ro.observe(canvas);
  const stop = loopWhileVisible(host, frame);

  return () => {
    stop();
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    disposeScene(scene);
    textures.forEach((t) => t.dispose());
    env.dispose();
    renderer.dispose();
  };
}
