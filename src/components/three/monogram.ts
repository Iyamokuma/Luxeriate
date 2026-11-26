import {
  THREE,
  createRenderer,
  crescentGeometries,
  disposeScene,
  enamelMaterial,
  goldMaterial,
  letterGeometries,
  loopWhileVisible,
  studioEnvironment,
} from "./brand-meshes";

/**
 * The LM monogram as a small sculpture: enamel letters inside polished gold
 * arcs. It sways on its own, leans towards the pointer and can be spun by
 * dragging.
 */

// a touch darker than the flat logo green: reflections lift it back to brand colour
const LETTER_COLOR = { brand: "#013a19", light: "#f4eee2" } as const;

export function mountMonogram({
  host,
  canvas,
  tone,
  reduce,
}: {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  tone: keyof typeof LETTER_COLOR;
  reduce: boolean;
}) {
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = createRenderer(canvas, 2);
  } catch {
    return () => {};
  }

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(24, 1, 10, 20000);
  const sculpture = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.add(sculpture);
  scene.add(tilt);

  const enamel = enamelMaterial(LETTER_COLOR[tone]);
  for (const g of letterGeometries(78, 7)) sculpture.add(new THREE.Mesh(g, enamel));
  const gold = goldMaterial();
  crescentGeometries(30, 6).forEach((g, i) => {
    const mesh = new THREE.Mesh(g, gold);
    mesh.position.z = i === 0 ? -14 : 14;
    sculpture.add(mesh);
  });

  const key = new THREE.DirectionalLight(0xfff3e2, 2.1);
  key.position.set(-500, 700, 900);
  const rim = new THREE.DirectionalLight(tone === "light" ? 0xd8f0e0 : 0xffe2b0, 1.4);
  rim.position.set(700, 200, -600);
  scene.add(key, rim, new THREE.HemisphereLight(0xfffaf0, 0xb59c74, 0.5));

  const layout = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the ~640-unit-tall mark into ~78% of the shorter side
    const fit = 640 / 0.78 / Math.min(1, camera.aspect);
    camera.position.set(0, 0, fit / 2 / Math.tan((camera.fov * Math.PI) / 360));
    camera.updateProjectionMatrix();
  };

  // pointer lean + drag to spin
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let spin = 0;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      velocity = dx * 0.012;
      spin += velocity;
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

  let shown = false;
  const frame = (dt: number, t: number) => {
    const ease = Math.min(1, dt * 2.5);
    lean.x += (lean.tx - lean.x) * ease;
    lean.y += (lean.ty - lean.y) * ease;
    if (!dragging) {
      spin += velocity;
      velocity *= Math.pow(0.04, dt); // inertia
      // drift back to the nearest front-facing turn
      const home = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
      spin += (home - spin) * Math.min(1, dt * 0.9);
    }
    const sway = reduce ? 0 : Math.sin(t * 0.55) * 0.38;
    sculpture.rotation.y = sway + spin;
    tilt.rotation.x = lean.y * 0.18 + (reduce ? 0 : Math.sin(t * 0.43) * 0.05);
    tilt.rotation.y = lean.x * 0.22;
    sculpture.position.y = reduce ? 0 : Math.sin(t * 0.9) * 10;
    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      host.dataset.ready = "";
    }
  };

  layout();
  const ro = new ResizeObserver(() => {
    layout();
    if (reduce) frame(0, 0);
  });
  ro.observe(host);
  // with reduced motion we still let people drag it, so keep the loop but without sway
  const stop = loopWhileVisible(host, frame);

  return () => {
    stop();
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    disposeScene(scene);
    env.dispose();
    renderer.dispose();
  };
}
