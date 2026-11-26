import { HERO_LEAN, HERO_TILT, tiltTransform } from "./hero-tilt";
import { RING_RADIUS, THREE, createRenderer, crescentGeometries, disposeScene, loopWhileVisible, studioEnvironment } from "./brand-meshes";
import { ARCS, MARK_CENTER, crescentPoints } from "@/lib/brand/logo-geometry";

/**
 * The logo's two gold arcs, orbiting the hero dashboard window like a gyroscope.
 *
 * Each arc has its own tilted orbit, and the second orbit slowly wobbles like a
 * gyroscope. The arcs stay on opposite sides of the window, so one is always
 * sweeping in front of it while the other passes behind. A fine gold dust
 * trails from each arc. The WebGL camera matches the stage's CSS
 * perspective, and an invisible copy of the window writes depth only, so the
 * arcs and the dust pass behind the real HTML window with correct occlusion.
 */

const RAD = Math.PI / 180;
const DUST = 480;
const INTRO = 1.9;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 10);
}

/** soft round sprites, gold at the rim and pale gold in the middle */
function dustMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aTone;
      uniform float uScale;
      varying float vAlpha;
      varying float vTone;
      void main() {
        vAlpha = aAlpha;
        vTone = aTone;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vTone;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = 1.0 - smoothstep(0.0, 0.5, d);
        float a = pow(core, 1.8) * vAlpha;
        if (a < 0.01) discard;
        vec3 deep = vec3(0.78, 0.56, 0.14);
        vec3 pale = vec3(1.0, 0.94, 0.74);
        gl_FragColor = vec4(mix(deep, pale, vTone * core), a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function mountGoldOrbit({
  stage,
  win,
  canvas,
  reduce,
}: {
  stage: HTMLElement;
  win: HTMLElement;
  canvas: HTMLCanvasElement;
  reduce: boolean;
}) {
  let renderer: InstanceType<typeof THREE.WebGLRenderer> | null = null;
  try {
    renderer = createRenderer(canvas, 1.75);
  } catch {
    renderer = null; // no WebGL: the window still leans with the pointer
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);

  // `pivot` carries exactly the CSS transform of the window
  const pivot = new THREE.Group();
  scene.add(pivot);
  const occluder = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -1;
  pivot.add(occluder);

  // two orbits on different planes, sharing the window's centre
  const ring = new THREE.Group();
  pivot.add(ring);
  const orbitA = new THREE.Group();
  const orbitB = new THREE.Group();
  orbitB.rotation.set(-0.16, 0.4, 0.08);
  const spinA = new THREE.Group();
  const spinB = new THREE.Group();
  orbitA.add(spinA);
  orbitB.add(spinB);
  ring.add(orbitA, orbitB);

  const gold = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dcae45"),
    metalness: 1,
    roughness: 0.17,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.35,
  });
  const [geoTop, geoBottom] = crescentGeometries(5, 1.6, 0.42);
  const arcA = new THREE.Mesh(geoTop, gold);
  const arcB = new THREE.Mesh(geoBottom, gold);
  spinA.add(arcA);
  spinB.add(arcB);

  // where dust is shed: anywhere along each arc's outer edge (the dust stays
  // put while the arc moves on, which draws the trail)
  const shedPoints = ARCS.map((arc) =>
    crescentPoints(arc, 64)
      .slice(2, 63)
      .map(([x, y]) => new THREE.Vector3(x - MARK_CENTER[0], MARK_CENTER[1] - y, 0)),
  );

  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  const rim = new THREE.DirectionalLight(0xffd27a, 1.6);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfff8ee, 0xb59a6a, 0.5));

  let env: InstanceType<typeof THREE.Texture> | null = null;
  if (renderer) {
    env = studioEnvironment(renderer);
    scene.environment = env;
  }

  /* gold dust */
  const pos = new Float32Array(DUST * 3);
  const vel = new Float32Array(DUST * 3);
  const life = new Float32Array(DUST).fill(1);
  const span = new Float32Array(DUST).fill(1);
  const size = new Float32Array(DUST);
  const baseSize = new Float32Array(DUST);
  const alpha = new Float32Array(DUST);
  const tone = new Float32Array(DUST);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute("aTone", new THREE.BufferAttribute(tone, 1));
  const dustMat = dustMaterial();
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 2;
  scene.add(dust);
  let nextSlot = 0;
  const tmp = new THREE.Vector3();
  const emit = (mesh: THREE.Mesh, points: THREE.Vector3[], scale: number) => {
    const i = nextSlot;
    nextSlot = (nextSlot + 1) % DUST;
    tmp.copy(points[Math.floor(Math.random() * points.length)]);
    tmp.z = (Math.random() - 0.5) * 6;
    tmp.applyMatrix4(mesh.matrixWorld);
    pos[i * 3] = tmp.x;
    pos[i * 3 + 1] = tmp.y;
    pos[i * 3 + 2] = tmp.z;
    const speed = (6 + Math.random() * 16) * scale;
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 2 - 1);
    vel[i * 3] = Math.sin(b) * Math.cos(a) * speed;
    vel[i * 3 + 1] = Math.sin(b) * Math.sin(a) * speed - 5 * scale;
    vel[i * 3 + 2] = Math.cos(b) * speed;
    life[i] = 0;
    span[i] = 1.3 + Math.random() * 1.6;
    baseSize[i] = (Math.random() < 0.07 ? 9 + Math.random() * 5 : 3 + Math.random() * 4) * scale;
    tone[i] = Math.random();
  };
  let dustScale = 1;

  /* layout */
  let ringTilt = 1;
  let pixelRatio = 1;
  const layout = () => {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const P = parseFloat(getComputedStyle(stage).perspective) || 2400;
    camera.fov = (2 * Math.atan(H / 2 / P)) / RAD;
    camera.aspect = W / H;
    camera.near = P * 0.1;
    camera.far = P * 4;
    camera.position.set(0, 0, P);
    camera.updateProjectionMatrix();

    const w = win.offsetWidth;
    const h = win.offsetHeight;
    const face = (win.firstElementChild as HTMLElement | null) ?? win;
    const r = parseFloat(getComputedStyle(face).borderTopLeftRadius) || 0;
    pivot.position.set(win.offsetLeft + w / 2 - W / 2, -(win.offsetTop + h / 2 - H / 2), 0);
    occluder.geometry.dispose();
    occluder.geometry = roundedRect(w, h, r);

    // rings a little wider than the window, tilted so the front arcs sweep
    // just under its bottom edge; the second orbit is slightly larger so the
    // two arcs can never touch where their planes cross
    const R = w * 0.6;
    spinA.scale.setScalar(R / RING_RADIUS);
    spinB.scale.setScalar((R * 1.07) / RING_RADIUS);
    ring.position.set(-w * 0.04, h * 0.08, 0);
    ringTilt = Math.acos(Math.min(0.96, (h * 0.56) / R));

    key.position.set(-0.3 * w, 0.9 * h, 1.2 * w);
    rim.position.set(0.9 * w, 0.2 * h, -0.6 * w);
    dustScale = w / 960;
    if (renderer) {
      renderer.setSize(W, H, false);
      pixelRatio = renderer.getPixelRatio();
    }
    dustMat.uniforms.uScale.value = P * pixelRatio;
  };

  /* pointer and scroll */
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    const rect = stage.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2));
  };
  const onLeave = () => {
    target.x = 0;
    target.y = 0;
  };
  let lastScroll = window.scrollY;
  let nudge = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nudge += (y - lastScroll) * 0.0012;
    nudge = Math.max(-1.2, Math.min(1.2, nudge));
    lastScroll = y;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  /* animation */
  let angle = 0.35;
  const carry = [0, 0];
  let shown = false;
  const frame = (dt: number, t: number) => {
    const ease = Math.min(1, dt * 3);
    cur.x += (target.x - cur.x) * ease;
    cur.y += (target.y - cur.y) * ease;
    const rx = HERO_TILT.rx - cur.y * HERO_LEAN.rx;
    const ry = HERO_TILT.ry + cur.x * HERO_LEAN.ry;
    const rz = HERO_TILT.rz;
    if (!reduce) win.style.transform = tiltTransform({ rx, ry, rz });
    pivot.rotation.set(-rx * RAD, ry * RAD, -rz * RAD, "XYZ");

    // sweep in on arrival, then turn steadily; scrolling gives them a push
    const intro = reduce ? 1 : easeOut(Math.min(1, t / INTRO));
    if (!reduce) {
      nudge *= Math.pow(0.08, dt);
      angle += dt * (0.12 + nudge);
    }
    spinA.rotation.z = angle - (1 - intro) * 1.6;
    spinB.rotation.z = angle + (1 - intro) * 1.6;
    orbitB.rotation.set(-0.16 + Math.sin(t * 0.17) * 0.06, 0.4 + Math.sin(t * 0.21) * 0.14, 0.08);
    ring.scale.setScalar(0.88 + 0.12 * intro);
    ring.rotation.set(-ringTilt + Math.sin(t * 0.4) * 0.03, Math.sin(t * 0.27) * 0.04, 0);

    // dust
    if (!reduce && renderer) {
      scene.updateMatrixWorld();
      const rate = 90 * (intro < 1 ? 2.4 : 1) * (1 + Math.abs(nudge) * 2);
      [arcA, arcB].forEach((mesh, k) => {
        carry[k] += rate * dt;
        while (carry[k] >= 1) {
          carry[k] -= 1;
          emit(mesh, shedPoints[k], dustScale);
        }
      });
      const drag = Math.pow(0.35, dt);
      for (let i = 0; i < DUST; i++) {
        if (life[i] >= span[i]) {
          alpha[i] = 0;
          continue;
        }
        life[i] += dt;
        const p = life[i] / span[i];
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3] *= drag;
        vel[i * 3 + 1] *= drag;
        vel[i * 3 + 2] *= drag;
        const twinkle = 0.75 + 0.25 * Math.sin(t * 9 + i * 1.7);
        alpha[i] = Math.pow(Math.sin(Math.min(1, p) * Math.PI), 0.7) * twinkle * 0.95;
        size[i] = baseSize[i] * (1 - 0.35 * p);
      }
      dustGeo.attributes.position.needsUpdate = true;
      dustGeo.attributes.aAlpha.needsUpdate = true;
      dustGeo.attributes.aSize.needsUpdate = true;
    }

    if (renderer) {
      renderer.render(scene, camera);
      if (!shown) {
        shown = true;
        canvas.dataset.ready = "";
      }
    }
  };

  layout();
  const ro = new ResizeObserver(() => {
    layout();
    if (reduce) frame(0, INTRO);
  });
  ro.observe(stage);
  ro.observe(win);
  const stop = loopWhileVisible(stage, frame, { once: reduce });

  return () => {
    stop();
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    disposeScene(scene);
    dustGeo.dispose();
    dustMat.dispose();
    env?.dispose();
    renderer?.dispose();
  };
}
