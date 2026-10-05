// LAB (private, character polish pass): with ?wip=1 imports WIP library copies from previz/lib/_wip/ ; shot ids prefixed
// OLD_ use the production previz/lib/ for before/after comparisons under identical light + camera.
// Shots (out/lab/polish_shots.json):
//   CAST        full lineup, neutral three-quarter key + rim (studio cyc)
//   BENCH       low-key moonlit two-shot: RESTORER + GUARD on a bench
//   FACE_<code> head-and-shoulders close-up, 85 mm, candle-like warm side light
//   H_WIPE H_SALT H_PART H_CUP H_PATCH   close-up hands (glove wipe, salt hand, two hands parting, cup, cuff patch)
//   SKIRT       seated qipao / long skirt / robe ; WALK walking ; PRAY pray_kneel ; REACH reach to glass
//   CONT        continuity details (worn cuff, glasses cord, badge, bangles) ; PERF0 / PERF1 perf probes
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ?wip=1 loads WIP copies from lib/_wip/ (a future polish pass); by default both sides use the production lib
const WIPQ = typeof location !== 'undefined' && new URLSearchParams(location.search).has('wip');
const wipOr = (f) => import(WIPQ ? `/previz/lib/_wip/${f}` : `/previz/lib/${f}`);
const WIP = await wipOr('cast.js');
const WIPH = await wipOr('hand.js');
const WIPF = await wipOr('figure.js');
let PROD = null, PRODH = null, PRODF = null;

export default async function create(ctx) {
  const { cam } = ctx;
  const ids = ctx.shots.filter((s) => s.scene === '_lab_polish').map((s) => s.id);
  if (ids.some((i) => i.startsWith('OLD_'))) { PROD = await import('/previz/lib/cast.js'); PRODH = await import('/previz/lib/hand.js'); PRODF = await import('/previz/lib/figure.js'); }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1d22);
  const pm = new THREE.PMREMGenerator(ctx.renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 80);
  // studio cyclorama
  const cycMat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.92, side: THREE.DoubleSide });
  const cyc = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), cycMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 5); floor.receiveShadow = true; cyc.add(floor);
  const curve = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 60, 32, 1, true, Math.PI, Math.PI / 2), cycMat);
  curve.rotation.z = Math.PI / 2; curve.position.set(0, 3, -7); curve.receiveShadow = true; cyc.add(curve);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), cycMat); wall.position.set(0, 13, -10); cyc.add(wall);
  scene.add(cyc);
  // dark set (low key): floor + wall close behind
  const dark = new THREE.Group(); scene.add(dark);
  const dFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.6 })); dFloor.rotation.x = -Math.PI / 2; dFloor.position.y = 0.001; dFloor.receiveShadow = true; dark.add(dFloor);
  const dWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: 0x323946, roughness: 0.9 })); dWall.position.set(0, 3, -1.6); dWall.receiveShadow = true; dark.add(dWall);
  // light rig (one shadowed key, rim, fill) — reconfigured per shot
  const key = new THREE.SpotLight(0xfff2e6, 80, 0, 0.5, 0.85, 2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0001; key.shadow.normalBias = 0.004; key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xcad8ff, 1.0); scene.add(rim, rim.target);
  const fill = new THREE.HemisphereLight(0xc4ccd8, 0x302a24, 0.6); scene.add(fill);
  const fillF = new THREE.DirectionalLight(0xffeedd, 0.3); scene.add(fillF, fillF.target);
  const prac = new THREE.PointLight(0xffa860, 0, 0, 2); scene.add(prac); // close practical (lantern) for the sheen test
  const setLight = (L, pos, tgt, intensity, color) => { L.position.set(...pos); if (L.target) L.target.position.set(...tgt); L.intensity = intensity; if (color !== undefined) L.color.set(color); L.visible = intensity > 0; };
  // props
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.55 });
  const bench = new THREE.Group(); scene.add(bench);
  { const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.44), wood); top.position.set(0, 0.42, -0.04); top.castShadow = top.receiveShadow = true; bench.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.39, 0.38), new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.7 })); base.position.set(0, 0.195, -0.06); base.castShadow = base.receiveShadow = true; bench.add(base); }
  const stools = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.45, 0.42), wood); m.castShadow = m.receiveShadow = true; scene.add(m); return m; });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.008), new THREE.MeshPhysicalMaterial({ color: 0xdfe8f0, roughness: 0.04, transparent: true, opacity: 0.12, envMapIntensity: 1.4 }));
  scene.add(glass);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.55 })); table.receiveShadow = table.castShadow = true; scene.add(table);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.031, 0.075, 40), new THREE.MeshPhysicalMaterial({ color: 0xedf1ef, roughness: 0.18, clearcoat: 0.6 })); cup.castShadow = cup.receiveShadow = true;
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0352, 0.0012, 6, 48), new THREE.MeshStandardMaterial({ color: 0x2b4a8b, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; cup.add(ring); }
  const cup2 = cup.clone();
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.009), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.3, emissive: 0x4a6080, emissiveIntensity: 0.5 }));
  const caseM = new THREE.Group(); { const cs = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.36, 0.5), new THREE.MeshStandardMaterial({ color: 0xa8783f, roughness: 0.7 })); cs.position.set(0, 0, 0.21); cs.castShadow = true; caseM.add(cs); }
  const props = [bench, ...stools, glass, table, cup, cup2, phone, caseM];

  // ---- figure pool per library (lazy, synchronous after preload)
  const crowds = { wip: null, old: null };
  const crowdOf = (lib) => {
    if (crowds[lib]) return crowds[lib];
    const people = [];
    for (let i = 0; i < 14; i++) people.push({ pos: [(i % 7 - 3) * 0.7 + (i > 6 ? 0.35 : 0), 0, i > 6 ? -1.0 : 0], rotY: (i * 0.7) % 1 - 0.5, pose: i % 3 === 0 ? 'walk' : 'stand', phase: (i * 0.37) % 1, seed: i });
    const eras = ['migrant', 'chapel'];
    const g = new THREE.Group();
    eras.forEach((era, k) => { const c = libs[lib].C.makeCrowd(era, people.map((p) => ({ ...p, pos: [p.pos[0], 0, p.pos[2] - k * 2.2] }))); g.add(c); });
    scene.add(g); crowds[lib] = g; return g;
  };
  const libs = { wip: { C: WIP, H: WIPH, F: WIPF }, old: PROD ? { C: PROD, H: PRODH, F: PRODF } : null };
  const t0 = performance.now();
  for (const [k, L] of Object.entries(libs)) {
    if (!L) continue;
    const r = await L.C.preloadCharacters(L.C.CAST_CODES);
    const r2 = await L.C.preloadCharacters(['RESTORER'], { gloves: false });
    const r3 = await L.C.preloadCharacters(['NAVIGATOR'], { cuffTurned: true });
    console.log('preload', k, JSON.stringify([r, r2, r3]), (performance.now() - t0).toFixed(0), 'ms');
  }
  const pool = { wip: {}, old: {} };
  const getF = (lib, code, opts = {}) => {
    const k = code + JSON.stringify(opts);
    if (pool[lib][k]) return pool[lib][k];
    const tt = performance.now();
    const f = libs[lib].C.makeCharacter(code, { lod: 'hi', ...opts });
    console.log('built', lib, code, JSON.stringify(opts), (performance.now() - tt).toFixed(0), 'ms', JSON.stringify(f.G.tris));
    scene.add(f.root); pool[lib][k] = f; return f;
  };
  const handPool = { wip: {}, old: {} };
  const getH = (lib, code, side, opts = {}, tag = '') => {
    const k = code + side + JSON.stringify(opts) + tag;
    if (handPool[lib][k]) return handPool[lib][k];
    const h = libs[lib].C.makeCharacterHand(code, side, { lod: 'close', ...opts });
    scene.add(h.root); handPool[lib][k] = h; return h;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bodyPool = { wip: [], old: [] };
  const BODIES = [
    { sex: 'f', height: 1.62, age: 28, build: 0.36, skin: 0xe3bfa0, hair: { style: 'ponytail', color: 0x2a211c } },
    { sex: 'f', height: 1.60, age: 45, build: 0.5, skin: 0xc99a78, hair: { style: 'low_bun', color: 0x1b1715 } },
    { sex: 'm', height: 1.72, age: 35, build: 0.62, skin: 0xa26f4c, hair: { style: 'short', color: 0x1b1612 } },
    { sex: 'm', height: 1.70, age: 65, build: 0.55, stoop: 0.55, skin: 0xc99a78, hair: { style: 'short', color: 0x8e8c88, grey: 0.55, thickness: 0.04, hairline: 0.66 } },
    { sex: 'm', height: 1.63, age: 17, build: 0.28, skin: 0xb07a55, hair: { style: 'topknot', color: 0x1a1511 } },
    { sex: 'm', age: 5, build: 0.5, skin: 0xc8956e, hair: { style: 'topknot', color: 0x1a1511 } },
  ];
  const bodyOne = (lib, i) => { let f = bodyPool[lib][i]; if (!f) { f = libs[lib].F.makeFigure({ ...BODIES[i], lod: 'hi', costume: [] }); scene.add(f.root); bodyPool[lib][i] = f; } use(f.root); return f; };
  const bodies = (lib) => BODIES.map((o, i) => bodyOne(lib, i));
  const ORDER = ['NAVIGATOR', 'COMPANION', 'WIFE', 'CHILD', 'MAPHAND', 'MIGRANT', 'TRAVELLER', 'MOTHER', 'LONELY', 'GUARD', 'RESTORER', 'FUTURE'];
  let used = new Set();
  const use = (o) => { used.add(o); o.visible = true; return o; };
  const fig = (lib, code, opts) => { const f = getF(lib, code, opts); use(f.root); return f; };
  const hand = (lib, code, side, opts, tag) => { const h = getH(lib, code, side, opts, tag); use(h.root); return h; };
  const place = (f, x, z, ry = 0) => { f.root.position.set(x, 0, z); f.root.rotation.set(0, ry, 0); f.root.updateMatrixWorld(true); };
  const studio = () => { cyc.visible = true; dark.visible = false; scene.background.set(0x1a1d22); fill.intensity = 0.6; fill.visible = true; fill.color.set(0xc4ccd8); fill.groundColor.set(0x302a24); scene.environmentIntensity = 0.25; };
  const lowkey = (bg = 0x06080c) => { cyc.visible = false; dark.visible = true; scene.background.set(bg); fill.color.set(0x5a6a88); fill.groundColor.set(0x1a140f); fill.intensity = 0.18; scene.environmentIntensity = 0.12; };
  const shadowCam = (near, far) => { key.shadow.camera.near = near; key.shadow.camera.far = far; key.shadow.camera.updateProjectionMatrix(); };

  const layouts = {
    CAST(lib, u, T, lod) {
      studio();
      ORDER.forEach((code, i) => { const f = fig(lib, code, lod ? { lod } : undefined); const x = (i - (ORDER.length - 1) / 2) * 0.64; place(f, x, -Math.abs(x) * 0.08, -x * 0.05); f.pose('stand', { weight: (i % 3 - 1) * 0.6 }); });
      setLight(key, [4.5, 4.6, 5.2], [0, 0.95, 0], 110, 0xfff0e2); key.angle = 0.62; key.penumbra = 0.9; shadowCam(3, 16);
      setLight(rim, [-5, 4.2, -5.5], [0, 1.1, 0], 1.6, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.25);
      cam.place(camera, [0, 1.12, 9.4], [0, 0.86, 0]); cam.lens(camera, 40);
      return { dof: null, vignette: 0.2, exposure: 0.9, contrast: 1.06 };
    },
    CAST_MID(lib, u, T) { const r = layouts.CAST(lib, u, T, 'mid'); cam.place(camera, [1.0, 1.25, 4.4], [1.0, 1.0, 0]); cam.lens(camera, 50); return r; },
    CAST_CU(lib) { // half the lineup closer (detail check)
      const r = layouts.CAST(lib);
      cam.place(camera, [1.0, 1.25, 4.4], [1.0, 1.0, 0]); cam.lens(camera, 50);
      return r;
    },
    CAST_CL(lib) { const r = layouts.CAST(lib); cam.place(camera, [-1.9, 1.25, 4.4], [-1.9, 1.0, 0]); cam.lens(camera, 50); return r; },
    BENCH(lib) {
      lowkey();
      use(bench); bench.position.set(0, 0, 0);
      const R = fig(lib, 'RESTORER', { gloves: false }), G = fig(lib, 'GUARD');
      place(R, -0.32, 0, 0.12); R.pose('sit_bench', { seat: 0.45, hands: 'none' });
      place(G, 0.32, 0, -0.1); G.pose('sit_bench', { seat: 0.45, lean: 0.3, hands: 'none' });
      use(cup); R.hold('L', cup, { socket: 'cup', grip: ['hold_cup'] });
      R.reach('L', R.root.localToWorld(V(0.05, 0.78, 0.3)), { palm: V(-1, 0, 0), fingers: V(0, 0, 1) });
      R.reach('R', R.root.localToWorld(V(-0.02, 0.75, 0.36)), { palm: V(1, 0.2, 0), fingers: V(0, 0, 1) });
      use(phone); G.hold('R', phone, { socket: 'palm', grip: ['cupped'] });
      G.reach('R', G.root.localToWorld(V(-0.05, 0.92, 0.32)), { palm: V(0, 0.75, -0.6), fingers: V(0.3, 0.3, 0.9) });
      G.reach('L', G.root.localToWorld(V(0.12, 0.62, 0.3)), {});
      G.lookAt(phone.getWorldPosition(V(0, 0, 0))); R.lookAt(G.eye());
      // moon key from window (camera right, high, cool) + warm low bounce + cool rim
      setLight(key, [2.6, 3.2, 1.6], [0, 0.8, 0], 30, 0xb8c8ff); key.angle = 0.5; key.penumbra = 0.7; shadowCam(1.5, 8);
      setLight(rim, [-2.5, 3, -2.5], [0, 1, 0], 1.1, 0x9ab0e8); setLight(fillF, [-1.5, 0.4, 2.0], [0, 0.9, 0], 0.12, 0xffc89a);
      cam.place(camera, [0.55, 1.05, 2.5], [0, 0.78, 0]); cam.lens(camera, 40);
      return { dof: { focus: 2.5, fstop: 4 }, exposure: 1.0, vignette: 0.3, temp: -0.15 };
    },
    BENCH_SIDE(lib) { const r = layouts.BENCH(lib); cam.place(camera, [-2.6, 0.95, 0.6], [0, 0.72, 0.05]); cam.lens(camera, 40); return { ...r, dof: { focus: 2.6, fstop: 4 } }; },
    SKIRT(lib) {
      lowkey(0x0b0f17);
      const M = fig(lib, 'MOTHER'), W = fig(lib, 'WIFE'), F = fig(lib, 'FUTURE');
      [M, W, F].forEach((f, i) => { const x = (i - 1) * 0.75, ry = 0.5 - i * 0.25; place(f, x, 0, ry); use(stools[i]); stools[i].position.set(x - Math.sin(ry) * 0.03, 0.225, -Math.cos(ry) * 0.03); stools[i].rotation.y = ry; f.pose('sit_chair', { seat: 0.45 }); });
      setLight(key, [-2.2, 2.8, 2.4], [0, 0.7, 0], 34, 0xffd2a8); key.angle = 0.6; key.penumbra = 0.85; shadowCam(1, 9);
      setLight(rim, [3, 3.5, -3], [0, 1, 0], 1.6, 0xa8c0ff); setLight(fillF, [1.5, 1.0, 3.0], [0, 0.8, 0], 0.2, 0xc8d4ff);
      cam.place(camera, [0.2, 1.0, 3.3], [0, 0.66, 0]); cam.lens(camera, 40);
      return { dof: null, exposure: 1.0, vignette: 0.3 };
    },
    WALK(lib, u) {
      studio();
      const Mi = fig(lib, 'MIGRANT'), R = fig(lib, 'RESTORER'), T = fig(lib, 'TRAVELLER');
      const ph = 0.15 + (u || 0) * 0;
      place(Mi, -0.9, 0.0, Math.PI / 2); Mi.pose('walk', { phase: ph });
      use(caseM); Mi.hold('R', caseM, { socket: 'grip', grip: ['rattan'] });
      place(R, 0.25, -0.4, Math.PI / 2); R.pose('walk', { phase: ph + 0.5 });
      place(T, 1.3, 0.2, Math.PI / 2 - 0.4); T.pose('walk', { phase: ph + 0.25 });
      setLight(key, [2.5, 4.2, 4.6], [0, 0.95, 0], 90, 0xfff0e2); key.angle = 0.55; key.penumbra = 0.9; shadowCam(2, 14);
      setLight(rim, [-4, 4, -5], [0, 1.1, 0], 1.6, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.25);
      cam.place(camera, [0.1, 1.05, 5.4], [0.1, 0.85, 0]); cam.lens(camera, 40);
      return { dof: null, vignette: 0.2, exposure: 0.9 };
    },
    PRAY(lib) {
      lowkey(0x0b0f17);
      const M = fig(lib, 'MOTHER'), L = fig(lib, 'LONELY'), Mi = fig(lib, 'MIGRANT');
      place(M, -0.55, 0, 0.35); M.pose('pray_kneel', {});
      use(bench); bench.position.set(0.5, 0, -0.1);
      place(L, 0.75, 0, -0.15); L.pose('sit_bench', { seat: 0.45, hands: 'lap' });
      place(Mi, 0.15, 0, 0.1); Mi.pose('pray_sit', { seat: 0.45 });
      setLight(key, [-1.6, 3.4, 2.0], [0, 0.6, 0], 38, 0xffe0bd); key.angle = 0.6; key.penumbra = 0.85; shadowCam(1, 9);
      setLight(rim, [3, 3.5, -3], [0, 1, 0], 1.8, 0xa8c0ff); setLight(fillF, [1.5, 1.0, 3.0], [0, 0.8, 0], 0.2, 0xc8d4ff);
      cam.place(camera, [0.0, 1.0, 3.2], [0.05, 0.62, 0]); cam.lens(camera, 40);
      return { dof: null, exposure: 1.0, vignette: 0.3 };
    },
    REACH(lib) {
      studio();
      const R = fig(lib, 'RESTORER'), F = fig(lib, 'FUTURE'), N = fig(lib, 'NAVIGATOR');
      use(glass); glass.position.set(0.0, 1.25, 0.42); glass.rotation.set(0, 0, 0);
      place(R, -0.55, 0, 0.35); R.pose('stand', { weight: 0.4 });
      R.reach('R', V(-0.35, 1.32, 0.40), { palm: V(0, 0, 1), fingers: V(0.1, 1, 0) }); R.hands.R.pose('flat_on_glass'); R.lookAt(V(-0.35, 1.32, 0.42));
      place(F, 0.6, 0, -0.35); F.pose('stand', { weight: -0.3 });
      F.reach('R', V(0.42, 1.3, 0.40), { palm: V(0, 0, 1), fingers: V(0, 1, 0) }); F.hands.R.pose('flat_on_glass', { spread: 0.3 });
      place(N, 1.4, -0.3, -0.5); N.pose('stand'); N.reach('R', N.root.localToWorld(V(-0.05, 1.05, 0.32)), { palm: V(0.2, 1, 0.2), fingers: V(0.6, 0, 0.7) });
      setLight(key, [3.4, 4.0, 4.2], [0, 1.0, 0], 90, 0xfff0e2); key.angle = 0.55; key.penumbra = 0.9; shadowCam(2, 14);
      setLight(rim, [-4, 4, -5], [0, 1.1, 0], 1.6, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.25);
      cam.place(camera, [0.6, 1.2, 4.2], [0.3, 1.0, 0]); cam.lens(camera, 40);
      return { dof: null, vignette: 0.2, exposure: 0.9 };
    },
    CONT(lib) { // continuity details, mid shots
      studio();
      const R = fig(lib, 'RESTORER'), G = fig(lib, 'GUARD'), N = fig(lib, 'NAVIGATOR', { cuffTurned: true }), W = fig(lib, 'WIFE'), M = fig(lib, 'MOTHER');
      [W, R, G, N, M].forEach((f, i) => { place(f, (i - 2) * 0.62, 0, 0); f.pose('stand', { weight: 0.3 }); });
      // restorer: left forearm forward on the "worktable" so the worn cuff spot faces the camera
      R.reach('L', R.root.localToWorld(V(0.16, 1.0, 0.28)), { palm: V(0, -1, 0), fingers: V(-0.3, 0, 1) });
      N.reach('R', N.root.localToWorld(V(-0.05, 1.05, 0.32)), { palm: V(0.2, 1, 0.2), fingers: V(0.6, 0, 0.7) });
      setLight(key, [3.0, 4.2, 5.0], [0, 1.1, 0], 90, 0xfff0e2); key.angle = 0.5; key.penumbra = 0.9; shadowCam(2, 14);
      setLight(rim, [-4, 4, -5], [0, 1.1, 0], 1.4, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.3);
      cam.place(camera, [0.0, 1.25, 3.6], [0.0, 1.05, 0]); cam.lens(camera, 40);
      return { dof: null, vignette: 0.2, exposure: 0.9 };
    },
    BODY(lib, u, T, view = 0) {
      studio();
      bodies(lib).forEach((f, i) => { place(f, (i - 2.5) * 0.62, 0, view); f.pose('stand', { weight: 0 }); });
      setLight(key, [4.5, 4.6, 5.2], [0, 0.95, 0], 110, 0xfff0e2); key.angle = 0.62; key.penumbra = 0.9; shadowCam(3, 16);
      setLight(rim, [-5, 4.2, -5.5], [0, 1.1, 0], 1.6, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.25);
      cam.place(camera, [0, 1.0, 5.6], [0, 0.85, 0]); cam.lens(camera, 40);
      return { dof: null, vignette: 0.2, exposure: 0.9, contrast: 1.06 };
    },
    HEADS(lib, u, T, ry = 0.45) { // bare heads in a row, warm side key (candle-like) + cool rim
      lowkey(0x07080b);
      const B = bodies(lib);
      B.forEach((f, i) => { place(f, (i - 2.5) * 0.36, 0, ry); f.pose('stand', { weight: 0 }); });
      const e = B[0].eye();
      setLight(key, [-1.6, e.y + 0.05, 1.4], [0, e.y - 0.05, 0], 9, 0xffb070); key.angle = 0.6; key.penumbra = 0.9; shadowCam(0.8, 5);
      setLight(rim, [2.5, e.y + 1.5, -2.0], [0, e.y, 0], 0.7, 0x8fa8e0); setLight(fillF, [1, e.y - 0.3, 2], [0, e.y, 0], 0.05, 0xffd0a8); fill.intensity = 0.06;
      cam.place(camera, [0, e.y - 0.08, 3.4], [0, e.y - 0.12, 0]); cam.lens(camera, 50);
      return { dof: null, exposure: 1.05, vignette: 0.3 };
    },
    HEADS_F(lib, u, T) { return layouts.HEADS(lib, u, T, 0.0); },
    HEADS_P(lib, u, T) { return layouts.HEADS(lib, u, T, 1.25); },
    HEAD0(lib) { return headCU(lib, 0, 0.5); }, HEAD2(lib) { return headCU(lib, 2, 0.6); }, HEAD3(lib) { return headCU(lib, 3, -0.4, 1); }, HEAD1(lib) { return headCU(lib, 1, 1.1); }, HEAD4(lib) { return headCU(lib, 4, 0.2); }, HEAD5(lib) { return headCU(lib, 5, 0.3); },
    BODY_SIDE(lib, u, T) { return layouts.BODY(lib, u, T, Math.PI / 2); },
    BODY_3Q(lib, u, T) { return layouts.BODY(lib, u, T, 0.7); },
    BODY_BACK(lib, u, T) { return layouts.BODY(lib, u, T, Math.PI); },
    CROWD(lib) {
      studio(); const g = crowdOf(lib); use(g);
      setLight(key, [3, 5, 5], [0, 0.9, -1], 100, 0xfff0e2); key.angle = 0.7; key.penumbra = 0.9; shadowCam(2, 18);
      setLight(rim, [-4, 4, -6], [0, 1.1, 0], 1.4, 0xc8d6ff); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.3);
      cam.place(camera, [0, 1.4, 6.5], [0, 0.9, -1.2]); cam.lens(camera, 35);
      return { dof: null, vignette: 0.2, exposure: 0.9 };
    },
    SHEEN(lib) { // ship_cabin report: a horn lantern 15–25 cm from the NAVIGATOR's indigo jacket
      lowkey(0x050608);
      const N = fig(lib, 'NAVIGATOR'); place(N, 0, 0, 0.3); N.pose('stand', { weight: 0.2 });
      const c = N.worldPos('chest'); prac.position.set(c.x - 0.12, c.y - 0.05, c.z + 0.2); prac.intensity = 0.5;
      setLight(key, [-1.5, 2.5, 1.5], [0, 1.2, 0], 2, 0xffd2a8); key.angle = 0.5; key.penumbra = 1; shadowCam(1, 6);
      setLight(rim, [2, 2.5, -2], [0, 1.2, 0], 0.3, 0x8fa8e0); setLight(fillF, [0, 1, 2], [0, 1, 0], 0.02); fill.intensity = 0.04;
      cam.place(camera, [0.3, 1.35, 1.9], [0, 1.15, 0]); cam.lens(camera, 50);
      return { dof: null, exposure: 1.0, vignette: 0.3 };
    },
    PERF0(lib) { studio(); setLight(key, [3, 5, 5], [0, 0.9, 0], 60); shadowCam(2, 14); setLight(rim, [-4, 4, -5], [0, 1.1, 0], 1.0); setLight(fillF, [-3, 1.6, 6], [0, 1, 0], 0.3); cam.place(camera, [0.5, 1.1, 4.5], [0, 0.9, 0]); cam.lens(camera, 40); return { dof: null }; },
    PERF1(lib) { const r = layouts.PERF0(lib); const f = fig(lib, 'RESTORER'); place(f, 0, 0, 0); f.pose('stand'); return r; },
    PERF2(lib) { const r = layouts.PERF0(lib); const f = fig(lib, 'RESTORER'); place(f, 0, 0, 0); f.pose('stand'); const e = f.eye(); cam.place(camera, [0.35, e.y - 0.15, 1.6], [0, e.y - 0.35, 0]); cam.lens(camera, 40); return r; },
  };
  const headCU = (lib, i, ry, side = -1) => {
    lowkey(0x050608);
    const f = bodyOne(lib, i);
    place(f, 0, 0, ry); f.pose('stand', { weight: 0 }); f.root.updateMatrixWorld(true);
    const e = f.eye();
    setLight(key, [e.x + side * 0.75, e.y - 0.1, e.z + 0.5], [e.x, e.y - 0.05, e.z], 2.6, 0xffa860); key.angle = 0.7; key.penumbra = 1.0; shadowCam(0.2, 3);
    setLight(rim, [e.x - side * 1.5, e.y + 1.2, e.z - 1.6], [e.x, e.y, e.z], 0.55, 0x8fa8e0);
    setLight(fillF, [e.x - side * 0.8, e.y - 0.4, e.z + 1.2], [e.x, e.y, e.z], 0.04, 0xffd0a8); fill.intensity = 0.06;
    cam.place(camera, [e.x + 0.1, e.y + 0.0, e.z + 2.1], [e.x, e.y - 0.03, e.z]); cam.lens(camera, 85);
    return { dof: { focus: 2.0, fstop: 2.8 }, exposure: 1.05, vignette: 0.32 };
  };
  // portrait study: one bare head filling the frame. F front, Q three-quarter, P profile (classic high side key);
  // L = low candle from the side
  const headStudy = (lib, i, view) => {
    lowkey(0x0a0b0e);
    const f = bodyOne(lib, i);
    const ry = { F: 0, Q: 0.62, P: 1.45, L: 0.5 }[view];
    place(f, 0, 0, ry); f.pose('stand', { weight: 0 }); f.root.updateMatrixWorld(true);
    const e = f.eye();
    if (view === 'L') setLight(key, [e.x - 0.8, e.y - 0.15, e.z + 0.35], [e.x, e.y, e.z], 2.4, 0xffa860);
    else setLight(key, [e.x - 1.0, e.y + 0.75, e.z + 1.3], [e.x, e.y - 0.03, e.z], 9, 0xfff0e0);
    key.angle = 0.5; key.penumbra = 1.0; shadowCam(0.3, 4);
    setLight(rim, [e.x + 1.6, e.y + 1.0, e.z - 1.4], [e.x, e.y, e.z], view === 'L' ? 0.5 : 0.9, 0x9fb4e8);
    setLight(fillF, [e.x + 1.0, e.y - 0.1, e.z + 1.8], [e.x, e.y, e.z], view === 'L' ? 0.04 : 0.12, 0xd8e0ff); fill.intensity = view === 'L' ? 0.06 : 0.12;
    cam.place(camera, [e.x, e.y - 0.01, e.z + 1.75], [e.x, e.y - 0.035, e.z]); cam.lens(camera, 135);
    return { dof: null, exposure: 1.0, vignette: 0.25 };
  };
  // faces: 85 mm, candle-like warm side light, dark ground
  const faceShot = (lib, code, opts = {}) => {
    lowkey(0x050608);
    const f = fig(lib, code, opts.fo);
    place(f, 0, 0, opts.ry ?? 0.35); f.pose('stand', { weight: 0.2 });
    if (opts.look) f.lookAt(f.root.localToWorld(V(...opts.look)));
    f.root.updateMatrixWorld(true);
    const e = f.eye();
    const side = opts.side ?? -1; // candle on the camera-left
    setLight(key, [e.x + side * 0.75, e.y - 0.12, e.z + 0.45], [e.x, e.y - 0.05, e.z], 2.6, 0xffa860); key.angle = 0.7; key.penumbra = 1.0; key.decay = 2; shadowCam(0.2, 3);
    setLight(rim, [e.x - side * 1.5, e.y + 1.2, e.z - 1.6], [e.x, e.y, e.z], 0.55, 0x8fa8e0);
    setLight(fillF, [e.x - side * 0.8, e.y - 0.4, e.z + 1.2], [e.x, e.y, e.z], 0.04, 0xffd0a8);
    fill.intensity = 0.06;
    const d = opts.dist ?? 2.0;
    cam.place(camera, [e.x + (opts.camX ?? 0.12), e.y + 0.0, e.z + d], [e.x, e.y - (opts.drop ?? 0.035), e.z]); cam.lens(camera, opts.mm ?? 85);
    return { dof: { focus: d, fstop: 2.8 }, exposure: 1.05, vignette: 0.32, contrast: 1.04 };
  };
  for (const [code, o] of Object.entries({ RESTORER: {}, GUARD: { side: 1, ry: -0.35 }, NAVIGATOR: { ry: 0.6 }, MOTHER: { ry: -0.2, side: 1 }, MIGRANT: { ry: 0.25 }, WIFE: { ry: 1.2, camX: 0.0 }, LONELY: { ry: 0.4 }, FUTURE: { ry: -0.25, side: 1 }, COMPANION: { ry: 0.3 }, TRAVELLER: { ry: -0.3, side: 1 }, CHILD: { ry: 0.3, drop: 0.1 }, MAPHAND: { ry: 0.3 } })) {
    layouts['FACE_' + code] = (lib) => faceShot(lib, code, o);
    layouts['FACEP_' + code] = (lib) => faceShot(lib, code, { ...o, ry: (o.ry ?? 0.35) + 1.1, mm: 100, dist: 2.3 }); // near-profile
  }
  // hands
  const handSet = (lib) => { lowkey(0x0c0d10); use(table); table.position.set(0, -0.02, 0); };
  const handLight = (pos, tgt, I = 2.4, col = 0xffe6cc) => { setLight(key, pos, tgt, I, col); key.angle = 0.6; key.penumbra = 0.9; key.decay = 2; shadowCam(0.2, 4); setLight(rim, [tgt[0] - 1, tgt[1] + 1.2, tgt[2] - 1.4], tgt, 0.8, 0xb0c4ff); setLight(fillF, [tgt[0] + 0.5, tgt[1] + 0.3, tgt[2] + 1.2], tgt, 0.1, 0xffe0c0); fill.intensity = 0.25; };
  Object.assign(layouts, {
    H_WIPE(lib) {
      handSet(lib); use(glass); glass.position.set(0, 0.25, 0); glass.rotation.set(0, 0, 0);
      const h = hand(lib, 'RESTORER', 'R'); h.pose('wipe'); h.placeWrist([0.03, 0.12, -0.012], [-0.25, 0.97, 0], [0, 0, 1]);
      handLight([0.5, 0.7, 0.9], [0, 0.18, 0]);
      cam.place(camera, [0.03, 0.2, 1.0], [0.0, 0.19, 0]); cam.lens(camera, 85);
      return { dof: { focus: 1.0, fstop: 4 }, vignette: 0.25, exposure: 0.95 };
    },
    H_SALT(lib) {
      handSet(lib);
      const h = hand(lib, 'NAVIGATOR', 'L'); h.pose('relaxed', { curl: 0.7 }); h.placeWrist([-0.08, 0.06, 0.0], [1, -0.02, 0.15], [0, -1, 0]);
      const h2 = hand(lib, 'NAVIGATOR', 'R'); h2.pose('spread'); h2.placeWrist([0.14, 0.1, -0.06], [-0.6, -0.15, 0.75], [0, 0.6, 0.8]);
      handLight([0.6, 0.6, 0.5], [0.02, 0.06, 0]);
      cam.place(camera, [0.05, 0.32, 0.6], [0.03, 0.06, 0]); cam.lens(camera, 85);
      return { dof: { focus: 0.62, fstop: 5.6 }, vignette: 0.25, exposure: 0.95 };
    },
    H_PART(lib) {
      handSet(lib);
      const a = hand(lib, 'MIGRANT', 'R'), b = hand(lib, 'WIFE', 'L', { noBangle: false });
      a.placeWrist([-0.12, 0.2, 0.0], [1, -0.05, 0.02], [0, 0, -1]);
      (lib === 'wip' ? WIPH : PRODH).pairHands(a, b, { mode: 'hold', t: 0.45 });
      handLight([-0.5, 0.7, 0.7], [0, 0.2, 0]);
      cam.place(camera, [-0.02, 0.26, 0.6], [0.0, 0.2, 0]); cam.lens(camera, 85);
      return { dof: { focus: 0.6, fstop: 4 }, vignette: 0.25, exposure: 0.95 };
    },
    H_CUP(lib) {
      handSet(lib);
      const h = hand(lib, 'GUARD', 'R'); h.pose('hold_cup'); h.placeWrist([0.09, 0.06, 0.06], [-0.6, 0.0, -0.8], [-0.8, 0, 0.6]);
      use(cup); h.hold(cup, 'cup'); h.root.updateMatrixWorld(true);
      const cw = cup.getWorldPosition(V(0, 0, 0)); h.root.position.y += 0.0385 - cw.y; h.root.updateMatrixWorld(true);
      const h2 = hand(lib, 'GUARD', 'L'); h2.pose('cupped'); h2.placeWrist([-0.1, 0.035, 0.1], [0.75, -0.25, -0.6], [0.0, 1, 0.1]);
      handLight([0.45, 0.55, 0.5], [0, 0.05, 0], 2.0, 0xffc890);
      cam.place(camera, [0.05, 0.25, 0.52], [0.0, 0.05, 0]); cam.lens(camera, 85);
      return { dof: { focus: 0.56, fstop: 4 }, vignette: 0.25, exposure: 0.95 };
    },
    H_PATCH(lib) {
      handSet(lib);
      const h = hand(lib, 'NAVIGATOR', 'R', { cuffTurned: true }); h.pose('relaxed', { curl: 0.8 }); h.placeWrist([0.02, 0.09, 0.0], [-0.35, 0.05, 0.94], [0, 1, 0]);
      const h2 = hand(lib, 'NAVIGATOR', 'L', {}, 'b'); h2.pose('touch'); h2.placeWrist([0.13, 0.155, -0.07], [-0.8, -0.35, 0.45], [-0.25, -0.95, 0.1]);
      h.root.updateMatrixWorld(true);
      const D = h.dims, patch = h.root.localToWorld(V(-(0.05 * D.s + 0.007), 0.04 * D.s, 0.0));
      const tip = h2.tip('index', V(0, 0, 0)); h2.root.position.add(patch.sub(tip).add(V(0, 0.004, 0))); h2.root.updateMatrixWorld(true);
      handLight([0.4, 0.6, 0.6], [0.02, 0.1, -0.03], 2.2);
      cam.place(camera, [-0.16, 0.36, 0.4], [0.02, 0.1, -0.03]); cam.lens(camera, 70);
      return { dof: { focus: 0.5, fstop: 4 }, vignette: 0.25, exposure: 0.95 };
    },
    H_WORN(lib) { // restorer's LEFT coat cuff worn spot + glove
      handSet(lib);
      const h = hand(lib, 'RESTORER', 'L'); h.pose('relaxed', { curl: 0.6 }); h.placeWrist([0.0, 0.05, 0.0], [0.9, -0.1, 0.4], [0, -1, 0]);
      handLight([0.3, 0.6, 0.7], [0, 0.06, 0], 2.0);
      cam.place(camera, [-0.05, 0.25, 0.45], [-0.04, 0.06, 0]); cam.lens(camera, 70);
      return { dof: { focus: 0.48, fstop: 4 }, vignette: 0.25, exposure: 0.95 };
    },
  });

  return {
    scene, camera, post: { exposure: 1.0, vignette: 0.22, grain: 0.02, saturation: 0.95 },
    setShot(shot, tl, u, T) {
      const old = shot.id.startsWith('OLD_');
      const lib = old ? 'old' : 'wip';
      const id = old ? shot.id.slice(4) : shot.id;
      used = new Set();
      for (const p of Object.values(pool)) for (const f of Object.values(p)) f.root.visible = false;
      for (const p of Object.values(handPool)) for (const h of Object.values(p)) h.root.visible = false;
      for (const p of Object.values(bodyPool)) for (const f of p) if (f) f.root.visible = false;
      for (const p of props) p.visible = false;
      for (const c of Object.values(crowds)) if (c) c.visible = false;
      key.decay = 2; prac.intensity = 0;
      const mc = /^MIDC_([A-Z]+)(_S|_B|_X)?$/.exec(id);
      if (mc) { // single character mid shot (standing, or seated on a stool with _S), studio light
        studio(); const f = fig(lib, mc[1]); place(f, 0, 0, 0.35);
        if (mc[2] === '_B') { f.pose({ 'armL.upper.z': 0.45, 'armR.upper.z': 0.45, 'armL.lower.x': 0.06, 'armR.lower.x': 0.06, 'legL.upper.z': 0.045, 'legR.upper.z': 0.045 }); }
        else if (mc[2]) { if (mc[2] === '_X') f.root.rotation.y += 1.2; use(stools[0]); const ry = f.root.rotation.y; stools[0].position.set(-Math.sin(ry) * 0.03, 0.225, -Math.cos(ry) * 0.03); stools[0].rotation.y = ry; f.pose('sit_chair', { seat: 0.45 }); } else f.pose('stand', { weight: 0.3 });
        setLight(key, [2.2, 3.4, 3.4], [0, 1.0, 0], 60, 0xfff0e2); key.angle = 0.5; key.penumbra = 0.9; shadowCam(1.5, 10);
        setLight(rim, [-3, 3.5, -4], [0, 1.1, 0], 1.4, 0xc8d6ff); setLight(fillF, [-3, 1.6, 5], [0, 1, 0], 0.3);
        const yc = mc[2] === '_S' || mc[2] === '_X' ? 0.62 : 1.05;
        cam.place(camera, [0.15, yc + 0.08, mc[2] === '_S' || mc[2] === '_X' ? 2.3 : 2.6], [0, yc, 0]); cam.lens(camera, 50);
        return { dof: null, vignette: 0.2, exposure: 0.9 };
      }
      const shm = /^SH(F|C)_?([A-Z0-9]+?)(_B)?$/.exec(id);
      if (shm) { // frontal upper body at shoulder height (shoulder-line check), soft frontal key + top light
        studio(); const f = shm[1] === 'F' ? bodyOne(lib, +shm[2]) : fig(lib, shm[2]); place(f, 0, 0, 0); if (shm[3]) f.pose({ 'armL.upper.z': 0.45, 'armR.upper.z': 0.45, 'armL.lower.x': 0.06, 'armR.lower.x': 0.06, 'legL.upper.z': 0.045, 'legR.upper.z': 0.045 }); else f.pose('stand', { weight: 0 });
        f.root.updateMatrixWorld(true); const e = f.eye();
        setLight(key, [1.2, 3.6, 3.4], [0, 1.0, 0], 60, 0xfff0e2); key.angle = 0.5; key.penumbra = 0.9; shadowCam(1.5, 10);
        setLight(rim, [-3, 3.5, -4], [0, 1.1, 0], 1.4, 0xc8d6ff); setLight(fillF, [-3, 1.6, 5], [0, 1, 0], 0.3);
        cam.place(camera, [0, e.y - 0.16, 3.2], [0, e.y - 0.2, 0]); cam.lens(camera, 85); return { dof: null, vignette: 0.2, exposure: 0.9 }; }
      const bm = /^BODYM(\d)$/.exec(id);
      if (bm) { studio(); const f = bodyOne(lib, +bm[1]); place(f, 0, 0, 0.35); f.pose('stand', { weight: 0.3 });
        setLight(key, [2.2, 3.4, 3.4], [0, 1.0, 0], 60, 0xfff0e2); key.angle = 0.5; key.penumbra = 0.9; shadowCam(1.5, 10);
        setLight(rim, [-3, 3.5, -4], [0, 1.1, 0], 1.4, 0xc8d6ff); setLight(fillF, [-3, 1.6, 5], [0, 1, 0], 0.3);
        cam.place(camera, [0.15, 1.13, 2.6], [0, 1.05, 0]); cam.lens(camera, 50); return { dof: null, vignette: 0.2, exposure: 0.9 }; }
      const hr = /^HR(\d)([FB])$/.exec(id);
      if (hr) { const r = headStudy(lib, +hr[1], hr[2] === 'B' ? 'P' : 'Q'); const f = bodyPool[lib][+hr[1]]; if (hr[2] === 'B') { place(f, 0, 0, 2.6); } const e = f.eye(); cam.place(camera, [e.x + 0.15, e.y + 0.25, e.z + 1.6], [e.x, e.y + 0.02, e.z]); cam.lens(camera, 70); return r; }
      const hv = /^HV(\d)([FQPL])$/.exec(id);
      if (hv) return headStudy(lib, +hv[1], hv[2]);
      const fn = layouts[id] || layouts.CAST;
      return fn(lib, u, T);
    },
  };
}
