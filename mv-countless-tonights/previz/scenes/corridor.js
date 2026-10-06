// corridor — LOC_CORRIDOR (bible §7.11): the 44 m moonlit upper verandah corridor of the old customs house, the film's
// signature image. Shots: S027 (WS 135 mm from the west end, 02:10) · S061 (CU 100 mm at vitrine P4, 04:00) ·
// S066 (the 8.54 s dolly east through the five "windows of the eras", 04:30).
//
// World: metres, Y up, +X = east, +Z = south (sky.js azimuths are compass bearings) — the same frame as night_window.js,
// so the end screen of the corridor is the plane x = 0 and the window bay beyond it is night_window's own set.
// Corridor x ∈ [−44, 0], z ∈ [−2.7, 2.7], floor y = 0, ceiling 5.2. South wall (right when looking east): 11 arched
// windows (centres x = −2, −6 … −42, 2.0 × 4.0 m, sill 0.6). North wall: five arched gallery doorways, the staff pantry
// door at x = −2, the minor "countless nights" niches (always-defocused warm glows).
//
// The five windows of the eras: P1–P4 are free-standing tall vitrines staggered left/right along the last 8 m (see
// corridor.md for why they are not on the bible's x = −10/−8/−6/−4 against the walls); their era images are other
// modules' named views rendered nested and composited "as seen" (director ruling MP-1) behind the front glass with a
// virtual-depth parallax. P5 = the end screen: NOT a reflection — the real present, night_window's scene rendered from
// THIS camera (camera override, see renderBay) and depth-composited through the glazed screen.
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { vitrine, glassMaterial } from '../lib/glass.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';
import { handPose, blendHandChannels } from '../lib/hand.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const needs = ['sea_deck', 'old_home', 'pier_waiting', 'chapel', 'night_window'];

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const hex = (h) => new THREE.Color(h);

// ---- bible colours (bible.json palette P01–P30 + LOC_CORRIDOR / LOC_GALLERY materials)
const C = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P06: '#EDF1EF', P07: '#2B4A8B', P09: '#B08D57',
  P10: '#6E5536', P11: '#D2B27E', P13: '#E2A458', P14: '#C67A35', P23: '#9A4545', P24: '#C9913F', P25: '#34548F', P26: '#4C7F68', P27: '#C98F8A', P28: '#0A0F17',
  teak: '#5E4430', render: '#8E8A84', velvet: '#0E1622', plinth: '#16191f', screen: '#3f3226', steel: '#3B4540', castIron: '#3B4540',
  enamel: '#E6E2D6', glove: '#F1EFE8', coat: '#3C4045',
};
const K3000 = hex('#ffcf9a'), K2700 = hex('#ffbf85'), K4000 = hex('#ffe2c0'), MOONC = hex('#c4d2ea');

// ---- layout
const HW = 2.7, CEIL = 5.2, X_W = -44.3, WALL_T = 0.5;
const WIN_X = Array.from({ length: 11 }, (_, k) => -2 - 4 * k);           // south windows (centres)
const WIN_W = 2.0, WIN_SILL = 0.6, WIN_SPRING = 3.6, WIN_TOP = 4.6;
const DOOR_X = [-34, -28, -22, -16, -10];                                 // gallery doorways (north wall)
const DOOR_W = 2.4, DOOR_SPRING = 2.6, DOOR_TOP = 3.8;
const PANTRY_X = -2.0;
const SCREEN_TOP = 3.05;                                                   // = night_window CEIL
const DADO = 0.46;                                                         // the screen's low timber dado (glass above it)
const OPEN_HW = 1.25;                                                      // integration: half-width of the end wall's glazed opening
const EYE = 1.45;                                                          // S027 lens height (shot list)
const EYE66 = 1.15;                                                        // integration: S066 dolly lens height (director: low, ~1.1–1.2 m)
// minor niches ("countless nights", integration rebuild): small shallow wall cases in rows along BOTH walls over the whole
// 44 m — dozens of warm points that never resolve (only five windows are ever seen clearly). [x, y, side, kind, seed, k]
// kind 0 fishing lamp · 1 stove fire · 2 lighthouse · 3 night market. North wall: two rows between the doorways; south wall:
// a 2 × 2 block on every pier (piers centred x = −4, −8 …).
const MINOR_W = 0.34, MINOR_H = 0.44, MINOR_D = 0.07;
const MINOR = (() => {
  const out = [], r = (s) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
  let s = 1;
  const doorFree = (x) => [-34, -28, -22, -16, -10].every((d) => Math.abs(x - d) > 1.55) && Math.abs(x + 2.0) > 0.75;
  for (let x = -43.2; x < -0.6; x += 1.32) for (const y of [1.2, 1.95, 2.75]) {
    if ((y > 2.5 && Math.abs(x + 2.0) < 0.75 ? false : !doorFree(x)) || Math.abs(((x % 4) + 4) % 4) < 0.5 || Math.abs(((x % 4) + 4) % 4 - 4) < 0.5) continue;   // clear of the pilasters (x = −4k)
    s++; out.push([x + (r(s) - 0.5) * 0.12, y + (r(s + 50) - 0.5) * 0.06, -1, Math.floor(r(s + 9) * 4), s, r(s + 3) < 0.12 ? 0 : 0.45 + 0.75 * r(s + 7)]);
  }
  for (let pc = 0, first = true; pc >= -40; pc -= 4, first = false) for (const dx of first ? [-0.5] : [-0.42, 0.42]) for (const y of [1.2, 1.95, 2.75]) {
    s++; out.push([pc + dx, y + (r(s + 50) - 0.5) * 0.06, 1, Math.floor(r(s + 9) * 4), s, r(s + 3) < 0.12 ? 0 : 0.45 + 0.75 * r(s + 7)]);
  }
  return out;
})();

// ---- S066 camera path (motion control): constant ≈1.43 m/s from x = −12.5 (204.67), ease-out from tl 7.25 (211.92), rest
// at x = −1.51 by tl 8.12 (212.79). The vitrines are placed so each pane is at its largest / clearest on its lyric line.
// Integration (director: the corridor must read LONG, the end bay small at the vanishing point from frame 0): the move
// starts 4.5 m further west (x −17) at ≈1.97 m/s, still one constant, perfectly smooth move with the shot list's ease-out
// from 211.92 to rest at 212.79, now at x −1.9 (the screen's posts frame the pair), 32 mm at 1.15 m.
const S66 = { x0: -17.0, v: 15.1 / 7.685, te: 7.25, tr: 8.12, mm: 32 };
function x66(tl) {
  const t = Math.max(0, tl);
  if (t <= S66.te) return S66.x0 + S66.v * t;
  const dt = S66.tr - S66.te, s = Math.min(t - S66.te, dt);
  return S66.x0 + S66.v * S66.te + S66.v * (s - (s * s) / (2 * dt));
}
// vitrine fronts: pane centre (x, z), toe angle (deg, the front turned toward the west = toward the approaching camera)
// Integration rebuild (director: each pane a luminous window into another night, ≈1.6–2.0 m of image, close to the camera
// path so it sweeps through about a third of the frame as we pass, the centre of the frame left open for the vanishing
// point): P1–P3 are 1.5 × 2.4 m glass at ±1.6 m off the axis, toed 38°, each ≈4.4 m ahead of the lens on its lyric line;
// P4 keeps its S061 place (−0.75, +1.2, 60°). `rect` = [u, v, s]: the part of the other module's named view actually
// rendered — centre (u, v) of its frame (v down) and span s (1 = its own frame, < 1 a zoom in, > 1 a wider frame), through
// setViewOffset on its captured camera (set only around our call).
const ALPHA = 38;
const PANES = [
  { id: 'P1', key: 'sea_deck', view: 'view_shiplamp', rect: [0.38, 0.44, 1.35], x: -10.9, z: -1.65, vw: 1.45, vh: 2.1, vp: 0.36, vd: 0.36, smoke: 0.62, peak: 0.85, rise: -0.4, depth: 1.6, anchor: [0.0, 1.35], size: 2.25, subj: [0.5, 0.5], grade: 'nav', black: 0.0015, blur: 0.0022, rt: [480, 640] },
  { id: 'P2', key: 'old_home', view: 'view_home_rain', ov: { pos: [-3.95, 0.05, 3.5], target: [-3.5, 0.45, 1.4], fov: 46 }, rainL: [0.74, 0.6, 0.85], x: -7.9, z: 1.65, vw: 1.45, vh: 2.1, vp: 0.36, vd: 0.36, smoke: 0.62, peak: 2.4, rise: 1.6, depth: 1.3, anchor: [0.0, 1.25], size: 2.3, subj: [0.5, 0.5], grade: 'home', black: 0.002, blur: 0.0032, rt: [480, 640], rain: 1 },
  { id: 'P3', key: 'pier_waiting', view: 'view_pier', ov: { piv: 3.11, yaw: 25, pitch: -4, d: 5.5, fov: 44, ay: 0.62 }, x: -4.9, z: -1.65, vw: 1.45, vh: 2.1, vp: 0.36, vd: 0.36, smoke: 0.62, peak: 3.9, rise: 3.0, depth: 1.5, anchor: [0.0, 1.35], size: 2.25, subj: [0.5, 0.5], grade: 'mig', black: 0.004, blur: 0.0036, rt: [480, 640] },
  { id: 'P4', key: 'chapel', view: 'view_chapel', ov: { piv: 2.66, d: 3.4, fov: 30, yaw: 10, pitch: 4, ay: 0.62 }, x: -0.75, z: 1.45, alpha: 60, vw: 1.1, vh: 2.3, vp: 0.4, peak: 5.71, rise: 4.6, depth: 1.0, anchor: [0.0, 1.3], size: 1.9, subj: [0.5, 0.45], grade: 'chapel', black: 0.003, blur: 0.0034, rt: [448, 640] },
];
// per-era look inside the pane (bible §2.4 LUT notes, applied to the nested linear-HDR frame before compositing).
// pink: hue-selective pull of skin-pink highlights toward dove grey (P4: the qipao read as a bare pink back).
const GRADES = {
  nav: { expo: 2.1, sat: 1.05, gain: [0.92, 1.0, 1.14], green: 0.8, pink: 0, comp: 0.6, gam: 0.92, clip: 0.42 },       // CT_NAV: strongest warm/cool split, greens −20 %
  home: { expo: 1.35, sat: 1.0, gain: [1.05, 0.99, 0.94], green: 0.92, pink: 0, comp: 0.5, gam: 1.12, skin: 1.0, clip: 0.5 },    // CT_HOME: candle-warm vs lattice moon
  mig: { expo: 1.8, sat: 0.85, gain: [1.04, 1.0, 0.93], green: 0.95, pink: 0, comp: 0.25, gam: 0.9, skin: 1.0 },       // CT_MIG: −15 % sat, creamy highlights, no sepia
  chapel: { expo: 1.25, sat: 1.05, gain: [0.84, 0.92, 1.12], green: 0.95, pink: 1.0, comp: 0.9, gam: 1.0, skin: 0.8 },  // CT_CHAPEL: richest colour, softened 30 %
};

export default async function create(ctx) {
  const { util, cam } = ctx;
  const { clamp, lerp, smoothstep, ease } = util;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 600);
  const q = new URLSearchParams(location.search);
  const OFF = new Set((q.get('cor') || '').split(',').filter(Boolean));     // debug switches ?cor=nopanes,nobay,…
  const rng = util.rng;

  // ============================================================ helpers
  const std = (o) => new THREE.MeshStandardMaterial(o);
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; }
  const box = (w, h, d, mat, x, y, z, parent = scene, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  // world-space UVs (metres / scale) chosen by the face normal: walls (x|z, y), floors (x, z)
  function worldUV(geo, su = 1, sv = 1, matrix = null) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2), v = new THREE.Vector3(), nn = new THREE.Vector3();
    const nm = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
      if (matrix) { v.applyMatrix4(matrix); nn.applyMatrix3(nm).normalize(); }
      const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
      let a, b;
      if (ay > ax && ay > az) { a = v.x; b = v.z; } else if (az >= ax) { a = v.x; b = v.y; } else { a = v.z; b = v.y; }
      uv[i * 2] = a / su; uv[i * 2 + 1] = b / sv;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }
  // arched opening path (x0 = centre, width w, sill y0, spring ys, radius = w/2) into a THREE.Path / Shape
  function archPath(path, x0, w, y0, ys) {
    const r = w / 2;
    path.moveTo(x0 - r, y0); path.lineTo(x0 + r, y0); path.lineTo(x0 + r, ys);
    path.absarc(x0, ys, r, 0, Math.PI, false); path.lineTo(x0 - r, y0);
    return path;
  }
  function rectPath(path, x0, x1, y0, y1) { path.moveTo(x0, y0); path.lineTo(x1, y0); path.lineTo(x1, y1); path.lineTo(x0, y1); path.lineTo(x0, y0); return path; }

  // ============================================================ materials
  const mFloor = TX.mat('teak', { tex: { seed: 4, wear: 0.4 }, roughness: 1, color: hex('#cbc4be') });
  { for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = mFloor[k]; if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; } } }
  // corridor walls: rendered brick under a worn warm-grey lime render (#8E8A84), the brick showing through in places
  const mWall = TX.mat('plaster', { tex: { tone: 'grey', seed: 33, damp: 0.25, flake: 0.35, cracks: 0.3 }, color: hex('#6f6a62') });
  { for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = mWall[k]; if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } } }
  const mPlaster = TX.mat('plaster_museum', { color: hex('#bdb6aa') });
  { for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = mPlaster[k]; if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } } }
  const mCeil = std({ color: hex('#2a2018'), roughness: 0.85 });
  const mBeam = std({ color: hex('#3a2a1e'), roughness: 0.75 });
  const mSteel = std({ color: hex(C.steel), roughness: 0.5, metalness: 0.6 });
  const mTimber = std({ color: hex(C.screen), roughness: 0.5, metalness: 0 });
  const mSill = std({ color: hex('#9a948a'), roughness: 0.6 });
  const ENV = envTexture(ctx.renderer, 'night_museum', { moon: 1.4, warmth: 0.8 });
  mFloor.envMap = ENV; mFloor.envMapIntensity = 0.5;
  mSteel.envMap = ENV; mTimber.envMap = ENV; mTimber.envMapIntensity = 0.6;

  // ============================================================ floor, ceiling, end walls
  const spillLater = [];                          // materials made inside blocks that also take the era spill (addSpill)
  let floorRefl = null;
  {
    const g = new THREE.PlaneGeometry(-X_W + 6, 2 * HW).rotateX(-Math.PI / 2).translate((X_W + 6) / 2, 0, 0);
    // planks run along the corridor (texture v = world x): 5 planks per 0.72 m across, piece length ≈ 3 m
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getZ(i) / 0.72; uv[i * 2 + 1] = p.getX(i) / 3.2; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const floor = new THREE.Mesh(g, mFloor); floor.receiveShadow = true; floor.renderOrder = 15; scene.add(floor);
    // waxed teak: a soft planar reflection (half res, blurred along the view, fresnel-weighted, broken up by the planks)
    floorRefl = new Reflector(new THREE.PlaneGeometry(-X_W, 2 * HW), { textureWidth: Math.round(ctx.W / 2), textureHeight: Math.round(ctx.H / 2), multisample: 0, clipBias: 0.002,
      shader: {
        name: 'CorridorFloorRefl',
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStr: { value: 1.2 }, uBlur: { value: 0.009 }, tPlank: { value: mFloor.roughnessMap || mFloor.map } },
        vertexShader: /* glsl */ `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; varying vec2 vP;
          void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vP = vec2(w.z / 0.72, w.x / 3.2); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `uniform vec3 color; uniform sampler2D tDiffuse, tPlank; uniform float uStr, uBlur; varying vec4 vUv; varying vec3 vW; varying vec2 vP;
          void main(){
            vec2 uv = vUv.xy / vUv.w; vec3 acc = vec3(0.0); float ws = 0.0;
            for (int i = -5; i <= 5; i++) { float fi = float(i); float w = exp(-fi * fi / 10.0); acc += texture2D(tDiffuse, uv + vec2(fi * uBlur * 0.18, fi * uBlur)).rgb * w; ws += w; }
            vec3 V = normalize(cameraPosition - vW);
            float fr = 0.03 + 0.97 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
            float wax = texture2D(tPlank, vP).g;                     // ORM roughness: worn boards reflect less
            float k = clamp(1.25 - wax * 1.1, 0.15, 1.0);
            gl_FragColor = vec4(acc / ws * color * uStr * fr * k, 1.0);
          }`,
      } });
    floorRefl.material.transparent = true; floorRefl.material.blending = THREE.AdditiveBlending; floorRefl.material.depthWrite = false;
    floorRefl.material.uniforms.color.value.set(0xffffff);
    floorRefl.rotation.x = -Math.PI / 2; floorRefl.position.set(X_W / 2, 0.002, 0); floorRefl.renderOrder = 16; scene.add(floorRefl);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(-X_W, 2 * HW).rotateX(Math.PI / 2).translate(X_W / 2, CEIL, 0), mCeil); scene.add(ceil);
    // integration: the roof shadows the moon (it leaked over the south wall's top onto the north wall's upper half and the
    // end bulkhead: a flat grey veil over the whole corridor); a thick shadow-only slab above the ceiling + the ceiling itself
    ceil.castShadow = true; ceil.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(-X_W + 8, 0.3, 2 * HW + 2 * WALL_T + 0.6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    roof.position.set(X_W / 2 + 2, CEIL + 0.18, 0); roof.castShadow = true; scene.add(roof);
    for (let x = X_W + 1; x < 0; x += 1.5) box(0.14, 0.22, 2 * HW, mBeam, x, CEIL - 0.11, 0, scene, false);
    for (const z of [-1.35, 0, 1.35]) box(-X_W, 0.16, 0.12, mBeam, X_W / 2, CEIL - 0.3, z, scene, false);
    const west = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(2 * HW, CEIL).rotateY(Math.PI / 2).translate(X_W, CEIL / 2, 0), 1.6, 1.6), mPlaster); west.receiveShadow = true; scene.add(west);
    // bulkhead over the end screen (x = 0, 3.05 → 5.2) + cornice
    const mBulk = mPlaster.clone(); mBulk.color = hex('#4a463f'); spillLater.push(mBulk);
    const bh = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(2 * HW, CEIL - SCREEN_TOP).rotateY(-Math.PI / 2).translate(0, (CEIL + SCREEN_TOP) / 2, 0), 1.6, 1.6), mBulk); bh.receiveShadow = true; scene.add(bh);
    box(0.12, 0.12, 2 * HW, mTimber, -0.03, SCREEN_TOP + 0.06, 0);
  }

  // ============================================================ south wall (11 arched windows) and north wall (doorways, niches)
  const extrudeWall = (shape, z0, inward) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 18 });
    g.translate(0, 0, inward > 0 ? z0 - WALL_T : z0); g.computeVertexNormals();
    worldUV(g, 1.05, 1.05);
    const m = new THREE.Mesh(g, mWall); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  };
  {
    const s = rectPath(new THREE.Shape(), X_W, 0, 0, CEIL);
    for (const x of WIN_X) s.holes.push(archPath(new THREE.Path(), x, WIN_W, WIN_SILL, WIN_SPRING));
    extrudeWall(s, HW, -1);                       // inner face at z = +2.7, outer +3.2
    // stone sills
    for (const x of WIN_X) box(WIN_W + 0.1, 0.06, WALL_T + 0.08, mSill, x, WIN_SILL - 0.03, HW + WALL_T / 2 - 0.02);
  }
  {
    const s = rectPath(new THREE.Shape(), X_W, 0, 0, CEIL);
    for (const x of DOOR_X) s.holes.push(archPath(new THREE.Path(), x, DOOR_W, 0.0005, DOOR_SPRING));
    extrudeWall(s, -HW, 1);                       // inner face at z = −2.7, outer −3.2
    // pantry door (closed, dark timber, a warm crack of light under it)
    box(0.95, 2.15, 0.06, mTimber, PANTRY_X, 1.075, -HW + 0.02);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.012), new THREE.MeshBasicMaterial({ color: K2700.clone().multiplyScalar(1.6) }));
    crack.position.set(PANTRY_X, 0.008, -HW + 0.055); scene.add(crack);
  }
  // skirting (dark timber) along both walls
  for (const z of [-HW + 0.012, HW - 0.012]) box(-X_W, 0.16, 0.025, mTimber, X_W / 2, 0.08, z, scene, false);
  // integration: the north wall answers the south arcade — a blind arch (architrave ring) opposite every window that is not
  // a doorway, pilasters opposite the piers, a dado rail and a picture rail: long receding lines + the 4 m beat on both sides
  {
    const ring = new THREE.Shape(); archPath(ring, 0, WIN_W + 0.24, 0.45, WIN_SPRING); const hole = archPath(new THREE.Path(), 0, WIN_W, 0.57, WIN_SPRING); ring.holes.push(hole);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.05, bevelEnabled: false, curveSegments: 16 }); rg.computeVertexNormals();
    const panel = archPath(new THREE.Shape(), 0, WIN_W, 0.57, WIN_SPRING), pg = new THREE.ShapeGeometry(panel, 16);
    const mPanelW = mWall.clone(); mPanelW.color = hex('#5d5850'); spillLater.push(mPanelW);
    const blind = WIN_X.filter((x) => DOOR_X.every((d) => Math.abs(d - x) > 1.6) && Math.abs(x - PANTRY_X) > 0.5);
    const imR = new THREE.InstancedMesh(rg, mWall, blind.length), imP = new THREE.InstancedMesh(pg, mPanelW, blind.length);
    const m4 = new THREE.Matrix4();
    blind.forEach((x, i) => { m4.makeTranslation(x, 0, -HW); imR.setMatrixAt(i, m4); m4.makeTranslation(x, 0, -HW + 0.004); imP.setMatrixAt(i, m4); });
    for (const im of [imR, imP]) { im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false; scene.add(im); }
    const pil = WIN_X.map((x) => x - 2).filter((x) => x > X_W + 0.5 && DOOR_X.every((d) => Math.abs(d - x) > 1.5));
    const imPil = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, CEIL, 0.07), mWall, pil.length);
    pil.forEach((x, i) => { m4.makeTranslation(x, CEIL / 2, -HW + 0.035); imPil.setMatrixAt(i, m4); });
    imPil.receiveShadow = true; imPil.frustumCulled = false; scene.add(imPil);
    for (const y of [0.82, 2.62]) box(-X_W, 0.05, 0.035, mTimber, X_W / 2, y, -HW + 0.018, scene, false);
  }

  // ============================================================ windows: slim steel glazing bars (alpha-tested: they shadow the moon pools)
  let winCookie = null;
  const barTex = (() => {
    const W = 256, H = 512, c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // arched opening: semicircle radius W/2 at the top (window 2.0 × 4.0 → the arch is 1.0 m of the 4.0 m)
    const r = W / 2, fr = 7, bar = 4.5;
    g.save(); g.beginPath(); g.moveTo(0, H); g.lineTo(0, r); g.arc(r, r, r, Math.PI, 0); g.lineTo(W, H); g.closePath(); g.clip();
    g.fillStyle = '#fff'; g.fillRect(fr, fr, W - 2 * fr, H - 2 * fr);
    g.fillStyle = '#000';
    for (const k of [1, 2]) g.fillRect(fr + (W - 2 * fr) * k / 3 - bar / 2, r, bar, H - r - fr);          // 3 columns
    for (let j = 1; j < 6; j++) g.fillRect(fr, r + (H - r - fr) * j / 6 - bar / 2, W - 2 * fr, bar);     // 6 rows
    g.fillRect(fr, r - bar / 2, W - 2 * fr, bar * 1.6);                                                  // spring transom
    g.lineWidth = bar; g.strokeStyle = '#000';
    for (let k = 1; k < 4; k++) { const a = Math.PI + Math.PI * k / 4; g.beginPath(); g.moveTo(r, r); g.lineTo(r + Math.cos(a) * W, r + Math.sin(a) * W); g.stroke(); }
    g.beginPath(); g.arc(r, r, r * 0.42, Math.PI, 0); g.stroke();
    g.restore();
    // a 6 px steel frame inside the arch edge
    g.lineWidth = fr * 2; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, r); g.arc(r, r, r, Math.PI, 0); g.lineTo(W, H); g.closePath(); g.stroke();
    // integration: the same drawing (panes white) is the moon shafts' cookie (mipmapped: the bars blur down the beam)
    { const c2 = canvas(W, H); c2.getContext('2d').drawImage(c, 0, 0); winCookie = ctex(c2, false); winCookie.generateMipmaps = true; winCookie.minFilter = THREE.LinearMipmapLinearFilter; }
    // alphaMap: bars opaque (white), panes clear (black) → invert
    const im = g.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255 - d[i]; d[i + 3] = 255; } g.putImageData(im, 0, 0);
    const t = ctex(c, false); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t;
  })();
  const mBars = new THREE.MeshStandardMaterial({ color: hex('#2c3330'), roughness: 0.55, metalness: 0.5, alphaMap: barTex, alphaTest: 0.5, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: 0.8 });
  // inverted alpha (glass where light passes): reflections + a faint cool sheen
  const winGlass = glassMaterial({ haze: 0.25, dust: 0.2, hazeLevel: 0.02, edge: 0, absorb: 0.02, envMapIntensity: 1.2, res: [ctx.W, ctx.H] });
  winGlass.material.envMap = ENV; winGlass.material.side = THREE.DoubleSide;
  const winH = WIN_SPRING + WIN_W / 2 - WIN_SILL;
  for (const x of WIN_X) {
    const g = new THREE.PlaneGeometry(WIN_W, winH);
    const bars = new THREE.Mesh(g, mBars); bars.position.set(x, WIN_SILL + winH / 2, HW + 0.32); bars.castShadow = true; bars.receiveShadow = false; scene.add(bars);
    const gl = new THREE.Mesh(g, winGlass.material); gl.position.set(x, WIN_SILL + winH / 2, HW + 0.30); gl.rotation.y = Math.PI; gl.renderOrder = 70; scene.add(gl);
  }
  // integration: the moon through every arched window as a hazy volumetric shaft (half-res layer), re-aimed per shot
  // (setShafts): the corridor's tall bays read as light, not just as pools on the floor
  const shafts = WIN_X.map((x, i) => {
    const sh = FX.windowShaft({ center: [x, WIN_SILL + winH / 2, HW + 0.31], right: [WIN_W / 2, 0, 0], up: [0, winH / 2, 0], dir: [0.6, -0.6, -0.5], length: 9,
      color: 0xb4c6e6, intensity: 0, cookie: winCookie, floorY: 0, noise: 0.55, soft: 0.1, steps: 10, seed: i * 3 + 1, penumbra: 0.02 });
    sh.object3D.visible = false; sh.object3D.frustumCulled = true; scene.add(sh.object3D); return sh;   // (culled when out of view: perf)
  });
  const _sM = new THREE.Matrix4();
  function setShafts(az, el, k, T, xs = null) {
    const d = moonDirOf(az, el).negate(), len = (WIN_SILL + winH + 0.2) / Math.max(0.2, -d.y);
    for (let i = 0; i < shafts.length; i++) {
      const sh = shafts[i], on = k > 0 && (!xs || (WIN_X[i] >= xs[0] && WIN_X[i] <= xs[1]));
      sh.object3D.visible = on && !OFF.has('noshaft'); if (!on) continue;
      _sM.makeBasis(sh.right, sh.up, d.clone().multiplyScalar(len)).setPosition(sh.center);
      sh.object3D.matrix.copy(_sM); sh.object3D.matrixWorld.copy(_sM); sh.material.uniforms.uInv.value.copy(_sM).invert();
      sh.update(T, { intensity: k });
    }
  }

  // ============================================================ exterior through the south windows: night sky + dark harbour + lights
  const sky = createSky({ preset: 'night', moonAz: 225, moonElev: 42, stars: 0.5, cloudCover: 0.3, cloudScale: 0.09, exposure: 1.5 });
  scene.add(sky.object3D);
  {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hex('#0a1322').multiplyScalar(0.5), fog: false }));
    sea.position.set(-20, -8.2, 1000 + 12); scene.add(sea);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 8), new THREE.MeshBasicMaterial({ color: 0x05070b })); quay.position.set(-20, -7.7, 9); scene.add(quay);
    // harbour lights (constant pixel size points), south / south-east
    const pts = [], cols = [];
    const r = rng(77);
    for (let i = 0; i < 90; i++) {
      const b = lerp(95, 250, r()), d = lerp(300, 3200, Math.pow(r(), 0.7)), a = b * D2R;
      pts.push(Math.sin(a) * d - 20, -8.2 + 1.5 + r() * (d > 2000 ? 30 : 8), -Math.cos(a) * d);
      const c = r() < 0.75 ? hex(C.P13) : hex('#fff1d8'); const k = lerp(1.2, 3.2, r()); cols.push(c.r * k, c.g * k, c.b * k);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: ctx.H / 536 } },
      vertexShader: /* glsl */ `attribute vec3 aCol; varying vec3 vC; uniform float uPx; void main(){ vC = aCol; gl_PointSize = 5.0 * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vC; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); gl_FragColor = vec4(vC * (exp(-r2 * 10.0) + 0.08 * exp(-r2 * 2.5)), 1.0); }` });
    const P = new THREE.Points(g, m); P.frustumCulled = false; P.renderOrder = -5; scene.add(P);
    // integration (S027 / S066): warm harbour points low on the horizon east of the bay (bearings 60–120°, 0.9–4 km), drawn
    // after the bay portal and depth-tested against it, so they only appear where the bay's windows show sea and sky
    const bp = [], bc = [], rb = rng(91);
    for (let i = 0; i < 44; i++) {
      const b = (i < 26 ? lerp(58, 122, rb()) : lerp(80, 100, rb())) * D2R, d = lerp(900, 4200, Math.pow(rb(), 0.8));   // (+18 round due east: S027's 135 mm sees 6–10 of them in the bay window)
      bp.push(Math.sin(b) * d, -8.2 + 1.0 + rb() * (d > 2500 ? 14 : 5), -Math.cos(b) * d);
      const c = rb() < 0.8 ? hex('#ff9a48') : hex('#ffd9a8'); const k = lerp(1.8, 4.0, rb()); bc.push(c.r * k, c.g * k, c.b * k);
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g2.setAttribute('aCol', new THREE.Float32BufferAttribute(bc, 3));
    const P2 = new THREE.Points(g2, m); P2.frustumCulled = false; P2.renderOrder = 6; scene.add(P2);
  }

  // ============================================================ lights
  const moon = new THREE.DirectionalLight(MOONC.clone(), 1.0);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);
  // ambient: dim night air from above, the moonlit floor's cool bounce from below
  const hemi = new THREE.HemisphereLight(hex('#1c2638'), hex('#4c5c7c'), 0.25); scene.add(hemi);
  // bounce off the moonlit floor (unshadowed, upward fill on vitrines, walls and figures)
  const bounce = new THREE.PointLight(hex('#8ea0bd'), 0, 9, 2); scene.add(bounce);
  // the bay's 2700 K reading lamp spills through the screen onto the corridor end (night_window LAMP_HEAD)
  const bayLamp = new THREE.PointLight(K2700.clone(), 0, 12, 2); bayLamp.position.set(3.24, 1.62, -0.98); scene.add(bayLamp);
  const moonDirOf = (az, el) => { const a = az * D2R, e = el * D2R; return V(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };
  // fit the moon's orthographic shadow frustum around a box of interest
  function setMoon(az, el, intensity, boxMin, boxMax) {
    const d = moonDirOf(az, el);
    const ctr = boxMin.clone().add(boxMax).multiplyScalar(0.5);
    moon.position.copy(ctr).addScaledVector(d, 40); moon.target.position.copy(ctr); moon.target.updateMatrixWorld(); moon.updateMatrixWorld();
    moon.intensity = intensity;
    const sc = moon.shadow.camera;
    // light space = the shadow camera's view space (a camera at the light looking at the target)
    const L = new THREE.OrthographicCamera(); L.position.copy(moon.position); L.lookAt(ctr); L.updateMatrixWorld(); const Linv = L.matrixWorld.clone().invert();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < 8; i++) { const p = V(i & 1 ? boxMax.x : boxMin.x, i & 2 ? boxMax.y : boxMin.y, i & 4 ? boxMax.z : boxMin.z).applyMatrix4(Linv); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    sc.left = x0; sc.right = x1; sc.bottom = y0; sc.top = y1; sc.near = Math.max(0.1, -z1 - 2); sc.far = -z0 + 2; sc.updateProjectionMatrix();
    sky.set({ moonAz: az, moonElev: el });
  }

  // ============================================================ minor niches: "countless nights" — warm glows that never resolve
  // Integration rebuild: dozens of small shallow wall cases (MINOR) on both walls, each a dark recess with a timber lip and
  // one warm glow (a fishing lamp / a stove / a lighthouse pulse / a night-market window) drawn as a soft anamorphic bokeh
  // point (one THREE.Points draw call, sized in metres, never sharp) plus a faint warm wash on the wall around it.
  const minorPts = (() => {
    const N = MINOR.length;
    // recesses + lips: two instanced meshes (built once)
    const mIn = std({ color: hex('#0c0d10'), roughness: 0.95 });
    const recess = new THREE.InstancedMesh(new THREE.BoxGeometry(MINOR_W, MINOR_H, MINOR_D), mIn, N);
    const lip = new THREE.InstancedMesh(new THREE.BoxGeometry(MINOR_W + 0.07, MINOR_H + 0.07, 0.025), mTimber, N);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(1, 1, 1);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), aux = new Float32Array(N * 4);
    const wash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.25, 1.1), new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff }), N);
    const tint = [hex('#ffc890'), hex('#ff9a55'), hex('#ffe6c8'), hex('#ffb877')], washBase = [];
    MINOR.forEach(([x, y, side, kind, seed, k], i) => {
      const zf = side * HW;
      q4.setFromEuler(new THREE.Euler(0, side > 0 ? Math.PI : 0, 0));
      m4.compose(V(x, y, zf - side * (MINOR_D / 2 - 0.02)), q4, s4); recess.setMatrixAt(i, m4);
      m4.compose(V(x, y, zf - side * 0.012), q4, s4); lip.setMatrixAt(i, m4);
      m4.compose(V(x, y, zf - side * 0.004), q4, s4); wash.setMatrixAt(i, m4);
      const c = tint[kind].clone().multiplyScalar(k);
      wash.setColorAt(i, c.clone().multiplyScalar(0.05)); washBase.push(c.clone().multiplyScalar(0.05));
      pos.set([x, y, zf - side * 0.06], i * 3); col.set([c.r * 1.6, c.g * 1.6, c.b * 1.6], i * 3); aux.set([kind, seed, 0.12 + 0.06 * ((seed * 7) % 3) / 2, side], i * 4);
    });
    for (const im of [recess, lip, wash]) { im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; scene.add(im); }
    recess.receiveShadow = true; lip.receiveShadow = true; wash.renderOrder = 12;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aAux', new THREE.BufferAttribute(aux, 4));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uK: { value: 1 }, uSize: { value: 1 }, uPx: { value: 1 }, uOff: { value: 0 }, uDisc: { value: 0 } },
      vertexShader: /* glsl */ `attribute vec3 aCol; attribute vec4 aAux; uniform float uT, uK, uSize, uPx, uOff; varying vec3 vC;
        float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
        float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
        void main(){
          float kind = aAux.x, sd = aAux.y, fl = 1.0;
          if (kind < 0.5) fl = 0.9 + 0.1 * sin(uT * 0.8 + sd);                                    // fishing lamp: slow sway
          else if (kind < 1.5) fl = 0.78 + 0.22 * n1(uT * 6.0 + sd * 3.1);                       // stove: flicker
          else if (kind < 2.5) fl = 0.45 + 1.3 * pow(max(0.0, cos(uT * 0.7 + sd)), 8.0);         // lighthouse: a slow pulse
          else fl = 0.85 + 0.15 * step(0.25, n1(uT * 4.0 + sd));                                 // night market: one tube flickers
          vC = aCol * fl * uK;
          vec3 pp = position; pp.z -= aAux.w * uOff;                                            // off the wall, toward the axis
          vec4 mv = modelViewMatrix * vec4(pp, 1.0);
          gl_PointSize = clamp(aAux.z * uSize * uPx / max(-mv.z, 0.1), 2.0, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `varying vec3 vC; uniform float uDisc;
        void main(){
          vec2 d = gl_PointCoord * 2.0 - 1.0; d.x *= 1.3;                    // anamorphic: an upright oval
          float r2 = dot(d, d); if (r2 > 1.0) discard;
          // integration: a warm point with a soft halo (a lamp seen deep in a small case, never resolved), not a hard disc
          float soft = 0.22 * smoothstep(1.0, 0.45, r2) + exp(-r2 * 10.0);
          float bok = 0.55 * smoothstep(1.0, 0.72, r2) * (0.5 + 0.5 * smoothstep(0.2, 0.9, r2)) + 0.75 * exp(-r2 * 4.0);   // a defocused disc (long lens)
          gl_FragColor = vec4(vC * mix(soft, bok, uDisc), 1.0);
        }` });
    const P = new THREE.Points(g, mat); P.frustumCulled = false; P.renderOrder = 66; scene.add(P);
    // pixel scale from the camera actually drawing (main, floor reflection, S061 mirror) and its target height
    P.onBeforeRender = (r, sc, cm) => { const rt = r.getRenderTarget(); mat.uniforms.uPx.value = (rt ? rt.height : ctx.H) * 0.5 * cm.projectionMatrix.elements[5]; };
    return { P, mat, wash, recess, lip, washBase };
  })();

  // ============================================================ gallery doorways (S027: warm glow; her silhouette crosses the last one)
  const gallery = new THREE.Group(); scene.add(gallery);
  const revealMats = [], doorSpills = [];
  {
    // the gallery beyond: a dim warm room proxy (never seen directly — only its light on the reveals and floor)
    const gm = new THREE.MeshBasicMaterial({ color: hex('#3a2a1c').multiplyScalar(0.5), side: THREE.BackSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 14), gm); room.position.set(-24, 3, -HW - WALL_T - 7); gallery.add(room);
    for (const x of DOOR_X) {
      // reveal faces lit by the gallery's 3000 K vitrine light (emissive gradient: brighter low and toward the gallery side)
      const c = canvas(64, 128), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 128, 0, 0);
      gr.addColorStop(0, 'rgba(255,205,150,1)'); gr.addColorStop(0.55, 'rgba(200,150,105,0.65)'); gr.addColorStop(1, 'rgba(90,70,55,0.2)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
      const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,0.55)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(0, 0, 64, 128);
      const em = ctex(c);
      const m = new THREE.MeshStandardMaterial({ color: hex('#2a2520'), roughness: 0.9, emissive: hex('#ffffff'), emissiveMap: em, emissiveIntensity: 0.35 });
      revealMats.push(m);
      for (const sx of [-1, 1]) {
        const rv = new THREE.Mesh(new THREE.PlaneGeometry(WALL_T, DOOR_SPRING), m);
        rv.position.set(x + sx * (DOOR_W / 2 - 0.004), DOOR_SPRING / 2, -HW - WALL_T / 2); rv.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; gallery.add(rv);
      }
      // warm light spilling out onto the corridor floor (additive decal)
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 1.6, 2.4), new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), color: K3000.clone().multiplyScalar(0.07), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      spill.rotation.x = -Math.PI / 2; spill.position.set(x + 0.3, 0.004, -HW + 0.7); gallery.add(spill); doorSpills.push(spill);
      // a soft glow filling the opening (the bright gallery beyond)
      const gw = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_TOP), new THREE.MeshBasicMaterial({ color: hex('#5a4030').multiplyScalar(0.55) }));
      gw.position.set(x, DOOR_TOP / 2, -HW - WALL_T - 0.02); gallery.add(gw);
    }
  }

  const galleryLight = new THREE.PointLight(K3000.clone(), 0, 7, 2); galleryLight.position.set(-9.2, 1.7, -4.2); scene.add(galleryLight);

  // ============================================================ the end wall (x = 0): solid panelled flanks, a glazed screen in the middle
  // integration (S066 direction: the end bay small, warm and luminous at the vanishing point): the end is no longer a
  // full-width glazed screen. Solid flanks (lime render over a timber dado, a framed timber architrave round the opening)
  // leave a 2.5 m glazed opening on the axis; inside it the screen's posts at ±0.62 frame the pair at rest (seen THROUGH
  // real glass), the dado 0.46, clear glass to 2.16, old wavy cylinder glass above. S061 looks past z ≈ 0.7 to the guard.
  const SCR_Z = [-OPEN_HW, -0.62, 0.62, OPEN_HW];
  const screenGlass = glassMaterial({ haze: 0.18, dust: 0.18, hazeLevel: 0.018, edge: 0, absorb: 0.05, envMapIntensity: 1.0, res: [ctx.W, ctx.H] });
  screenGlass.material.envMap = ENV;
  const wavyGlass = glassMaterial({ haze: 0.6, dust: 0.3, hazeLevel: 0.03, edge: 0, absorb: 0.08, envMapIntensity: 1.1, res: [ctx.W, ctx.H] });
  wavyGlass.material.envMap = ENV;
  const mEndW = mPlaster.clone(); mEndW.color = hex('#6e675c'); spillLater.push(mEndW);
  const mPanel = std({ color: hex('#2a2119'), roughness: 0.6, envMap: ENV, envMapIntensity: 0.4 }); spillLater.push(mPanel);
  {
    const mw = 0.075, dd = 0.08;
    // the flanks: rendered wall (x = 0, z ±OPEN_HW … ±HW, floor → SCREEN_TOP) with a timber dado and a framed panel above it
    for (const sz of [-1, 1]) {
      const zc = sz * (OPEN_HW + HW) / 2, w = HW - OPEN_HW;
      const wall = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(w, SCREEN_TOP).rotateY(-Math.PI / 2).translate(0.02, SCREEN_TOP / 2, zc), 1.6, 1.6), mEndW); wall.receiveShadow = true; scene.add(wall);
      box(0.04, 0.92, w, mPanel, -0.0, 0.46, zc);                                   // dado
      box(0.03, 0.05, w, mTimber, -0.025, 0.93, zc, scene, false);                    // dado rail
      // a tall framed panel (bolection) on each flank: the end reads as one composed wall around the opening
      const pw = w - 0.36;
      for (const [y0, y1] of [[1.15, 2.85]]) {
        for (const [yy, hh] of [[y0, 0.04], [y1, 0.04]]) box(0.035, hh, pw, mTimber, -0.03, yy, zc, scene, false);
        for (const zz of [zc - pw / 2, zc + pw / 2]) box(0.035, y1 - y0, 0.04, mTimber, -0.03, (y0 + y1) / 2, zz, scene, false);
      }
    }
    // the architrave round the opening (protruding 6 cm) and its head
    for (const sz of [-1, 1]) box(0.14, SCREEN_TOP + 0.12, 0.16, mTimber, -0.05, (SCREEN_TOP + 0.12) / 2, sz * (OPEN_HW + 0.06));
    box(0.14, 0.16, 2 * OPEN_HW + 0.44, mTimber, -0.05, SCREEN_TOP + 0.04, 0);
    // the screen in the opening: posts, rails, dado panels, glass
    for (const z of SCR_Z) box(dd, SCREEN_TOP, mw, mTimber, 0, SCREEN_TOP / 2, z);
    for (const y of [0.04, DADO, 2.2, SCREEN_TOP - 0.04]) box(dd, 0.08, 2 * OPEN_HW, mTimber, 0, y, 0);
    for (let i = 0; i < SCR_Z.length - 1; i++) {
      const z0 = SCR_Z[i], z1 = SCR_Z[i + 1], w0 = z1 - z0 - 0.09;
      box(0.03, DADO - 0.1, w0, mPanel, -0.02, DADO / 2 + 0.02, (z0 + z1) / 2);
      box(0.02, DADO - 0.24, w0 - 0.16, mTimber, -0.045, DADO / 2 + 0.02, (z0 + z1) / 2);
    }
    for (let i = 0; i < SCR_Z.length - 1; i++) {
      const z0 = SCR_Z[i], z1 = SCR_Z[i + 1];
      const lo = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 2.16 - DADO - 0.04), screenGlass.material); lo.position.set(-0.01, (2.16 + DADO + 0.04) / 2, (z0 + z1) / 2); lo.rotation.y = -Math.PI / 2; lo.renderOrder = 80; scene.add(lo);
      const up = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.77), wavyGlass.material); up.position.set(-0.01, 2.625, (z0 + z1) / 2); up.rotation.y = -Math.PI / 2; up.renderOrder = 80; scene.add(up);
    }
  }
  // integration (S066 at rest: the two backs seen THROUGH real glass): the corridor behind the lens faintly reflected in the
  // screen's clear glass — a quarter-res planar mirror, only in the last ~2.5 s of S066 (the moonlit windows and the warm
  // niche points as a 10–15 % veil over the bay)
  const screenRefl = new Reflector(new THREE.PlaneGeometry(2 * OPEN_HW, 2.16 - DADO - 0.04), { textureWidth: Math.round(ctx.W / 4), textureHeight: Math.round(ctx.H / 4), multisample: 0, clipBias: 0.003,
    shader: {
      name: 'CorridorScreenRefl',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStr: { value: 0 } },
      vertexShader: /* glsl */ `uniform mat4 textureMatrix; varying vec4 vUv; void main(){ vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float uStr; varying vec4 vUv;
        void main(){ vec2 uv = vUv.xy / vUv.w; vec3 c = vec3(0.0);
          for (int i = -2; i <= 2; i++) for (int j = -1; j <= 1; j++) c += texture2D(tDiffuse, uv + vec2(float(i) * 0.004, float(j) * 0.006)).rgb;
          gl_FragColor = vec4(c / 15.0 * uStr, 1.0); }`,
    } });
  screenRefl.material.transparent = true; screenRefl.material.blending = THREE.AdditiveBlending; screenRefl.material.depthWrite = false;
  screenRefl.position.set(-0.016, (2.16 + DADO + 0.04) / 2, 0); screenRefl.rotation.y = -Math.PI / 2; screenRefl.renderOrder = 82; screenRefl.visible = false; scene.add(screenRefl);
  // the two planar mirrors never render each other (no nested mirror passes)
  { const wrap = (a, b) => { const ob = a.onBeforeRender; a.onBeforeRender = function (...args) { const v = b.visible; b.visible = false; try { ob.apply(this, args); } finally { b.visible = v; } }; }; wrap(screenRefl, floorRefl); wrap(floorRefl, screenRefl); }
  // P5 portal: shows night_window's scene rendered from this camera (rt + depth); writes the bay's true depth so the DOF works
  const bay = { rt: null, tex: null, dep: null, w: 0, h: 0, ok: false };
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDep: { value: null }, uOff: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) },
      nNear: { value: 0.02 }, nFar: { value: 9000 }, mNear: { value: 0.03 }, mFar: { value: 600 }, uGain: { value: 1.0 }, uOk: { value: 0 }, uWavyY: { value: 2.2 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `#include <packing>
      varying vec3 vW; uniform sampler2D tCol, tDep; uniform vec2 uOff, uSize; uniform float nNear, nFar, mNear, mFar, uGain, uOk, uWavyY;
      void main(){
        vec2 uv = (gl_FragCoord.xy - uOff) / uSize;
        if (vW.y > uWavyY) uv += vec2(sin(vW.z * 23.0 + vW.y * 7.0) * 0.004 + sin(vW.z * 61.0) * 0.0015, sin(vW.y * 31.0 + vW.z * 5.0) * 0.003);  // old cylinder glass
        vec3 c = uOk > 0.5 ? texture2D(tCol, uv).rgb : vec3(0.02, 0.025, 0.035);
        float d = uOk > 0.5 ? texture2D(tDep, uv).x : 1.0;
        float myd = d >= 0.99999 ? 0.9999995 : viewZToPerspectiveDepth(perspectiveDepthToViewZ(d, nNear, nFar), mNear, mFar);
        gl_FragDepth = max(myd, gl_FragCoord.z);
        gl_FragColor = vec4(c * uGain, 1.0);
      }`,
  });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2 * OPEN_HW, SCREEN_TOP - DADO), portalMat);
  portal.position.set(0.06, (SCREEN_TOP + DADO) / 2, 0); portal.rotation.y = -Math.PI / 2; portal.renderOrder = 5; scene.add(portal);

  // ---- night_window camera override: the bay must be seen from THIS camera (transmitted, real parallax), but its module
  // only exposes view_bay_back with its own camera. We capture its camera once and, only while our renderNested call is
  // running, snap it to our pose / lens / sub-frustum on every updateMatrixWorld (their exterior pass + the final render).
  const NW = { cam: null, scene: null, hide: [], figs: [], lamp: [], active: false, pos: V(0, 0, 0), quat: new THREE.Quaternion(), fov: 30, aspect: ctx.aspect, view: null, near: 0.02, far: 9000 };
  {
    const r = ctx.renderer, orig = r.render, rt = ctx.makeRT(32, 16);
    r.render = function (s, c) { if (r.getRenderTarget() === rt && c.isPerspectiveCamera) { NW.cam = c; NW.scene = s; } return orig.call(this, s, c); };
    try { ctx.renderNested('night_window', 'view_bay_back', 0, 0, 205, rt, ctx.aspect); } catch (e) { console.warn('corridor: bay prime failed', String(e).slice(0, 200)); }
    r.render = orig; rt.dispose();
    if (NW.cam) {
      const scr = hex('#3f3226');
      NW.scene.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material, p = new THREE.Vector3(); o.getWorldPosition(p);
        // their glazed screen + corridor stub (x ≤ 0.05): our own corridor replaces it
        if (Math.abs(p.x) < 0.06 && m && m.color && (m.color.equals(scr) || (m.isMeshBasicMaterial && m.transparent && m.opacity < 0.2))) NW.hide.push(o);
      });
      for (const ch of NW.scene.children) if (['figure', 'GUARD', 'RESTORER'].includes(ch.name)) NW.figs.push(ch);
      // review: the reading lamp (night_window LAMP_HEAD 3.24, 1.66, −0.98): its stand group, glow, key and up-light, so S066
      // can cheat it 0.45 m south / 0.10 m down inside our render only — the S066 → S067 light match puts the lamp on the
      // stern lantern's (0.376, 0.381); the true position lands at (0.26, 0.24). Invisible from S062–S065's angles.
      const LH = V(3.24, 1.66, -0.98), wp = new THREE.Vector3();
      for (const ch of NW.scene.children) {
        if (ch.isLight && !ch.isDirectionalLight && !ch.isHemisphereLight && ch.position.distanceTo(LH) < 0.3) NW.lamp.push(ch);
        else if (ch.isMesh && ch.position.distanceTo(LH) < 0.08) NW.lamp.push(ch);            // the glow billboard
        else if (ch.isGroup && ch.children.some((c) => c.isMesh && c.position.distanceTo(LH) < 0.01)) NW.lamp.push(ch);   // stand, shade, bulb
      }
      void wp;
      const base = NW.cam.updateMatrixWorld;
      NW.cam.updateMatrixWorld = function (force) {
        if (NW.active) {
          this.position.copy(NW.pos); this.quaternion.copy(NW.quat); this.fov = NW.fov; this.aspect = NW.aspect;
          if (NW.view) this.setViewOffset(NW.view.fw, NW.view.fh, NW.view.x, NW.view.y, NW.view.w, NW.view.h); else if (this.view) this.clearViewOffset();
          this.updateProjectionMatrix(); NW.near = this.near; NW.far = this.far;
        }
        return base.call(this, force);
      };
    }
  }
  // review: the portal's bbox changes every frame of a dolly → one RT per size grew without bound over a long render;
  // keep the six most recent sizes (LRU), dispose the rest
  const bayRTs = new Map();
  function bayRT(w, h) {
    const k = w + 'x' + h;
    if (bayRTs.has(k)) { const rt = bayRTs.get(k); bayRTs.delete(k); bayRTs.set(k, rt); return rt; }
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
    const rt = ctx.makeRT(w, h, { depthTexture: dt, depthBuffer: true }); bayRTs.set(k, rt);
    while (bayRTs.size > 6) { const [k0, r0] = bayRTs.entries().next().value; if (r0.depthTexture) r0.depthTexture.dispose(); r0.dispose(); bayRTs.delete(k0); }
    return rt;
  }
  // render the bay through the portal's screen-space bounding box at `scale` × full resolution
  const _v = new THREE.Vector3();
  function renderBay(tl, u, T, { scale = 1, hideFigs = false, lampShift = null, lampK = 1 } = {}) {
    portalMat.uniforms.uOk.value = 0;
    if (!NW.cam || OFF.has('nobay')) return;
    camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    // screen bbox of the portal quad
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0, anyFront = false;
    for (const [z, y] of [[-OPEN_HW, DADO], [OPEN_HW, DADO], [-OPEN_HW, SCREEN_TOP], [OPEN_HW, SCREEN_TOP]]) {
      _v.set(0.06, y, z).applyMatrix4(camera.matrixWorldInverse); if (_v.z < 0) anyFront = true;
      _v.set(0.06, y, z).project(camera);
      x0 = Math.min(x0, _v.x * 0.5 + 0.5); x1 = Math.max(x1, _v.x * 0.5 + 0.5); y0 = Math.min(y0, _v.y * 0.5 + 0.5); y1 = Math.max(y1, _v.y * 0.5 + 0.5);
    }
    if (!anyFront) return;
    x0 = clamp(x0 - 0.01); x1 = clamp(x1 + 0.01); y0 = clamp(y0 - 0.01); y1 = clamp(y1 + 0.01);
    if (x1 - x0 < 0.002 || y1 - y0 < 0.002) return;
    const FW = ctx.W, FH = ctx.H;
    const px0 = Math.floor(x0 * FW), px1 = Math.ceil(x1 * FW), py0 = Math.floor(y0 * FH), py1 = Math.ceil(y1 * FH);
    const vw = px1 - px0, vh = py1 - py0;
    const rw = Math.max(16, Math.round(vw * scale / 8) * 8), rh = Math.max(16, Math.round(vh * scale / 8) * 8);
    const rt = bayRT(rw, rh);
    NW.pos.copy(camera.position); NW.quat.copy(camera.quaternion); NW.fov = camera.fov; NW.aspect = camera.aspect;
    NW.view = { fw: FW, fh: FH, x: px0, y: FH - py1, w: vw, h: vh };       // setViewOffset y is from the top
    const r = ctx.renderer, orig = r.render;
    const hide = hideFigs ? [...NW.hide, ...NW.figs] : NW.hide;
    r.render = function (s, c) {
      if (s === NW.scene && r.getRenderTarget() === rt) {
        const vis = hide.map((o) => o.visible); for (const o of hide) o.visible = false;
        if (lampShift) for (const o of NW.lamp) { o.position.add(lampShift); o.updateMatrixWorld(true); }
        // lampK (S027, 02:10: the bay is empty and its reading lamp is off): the lamp's lights scaled, its glow billboard hidden
        const lamps = lampK !== 1 ? NW.lamp.filter((o) => o.isLight) : [], li = lamps.map((o) => o.intensity), glows = lampK !== 1 ? NW.lamp.filter((o) => o.isMesh) : [], gv = glows.map((o) => o.visible);
        lamps.forEach((o) => { o.intensity *= lampK; }); glows.forEach((o) => { o.visible = lampK > 0.5; });
        // (integration) an unlit lamp: its shade / bulb stop glowing too (emissive scaled inside our render only)
        const em = []; if (lampK !== 1) for (const g of NW.lamp) if (g.isGroup) g.traverse((m) => { if (m.isMesh && m.material && m.material.emissiveIntensity !== undefined) { em.push([m.material, m.material.emissiveIntensity]); m.material.emissiveIntensity *= lampK; } });
        try { return orig.call(this, s, c); } finally {
          hide.forEach((o, i) => { o.visible = vis[i]; });
          if (lampShift) for (const o of NW.lamp) { o.position.sub(lampShift); o.updateMatrixWorld(true); }
          lamps.forEach((o, i) => { o.intensity = li[i]; }); glows.forEach((o, i) => { o.visible = gv[i]; });
          for (const [m, v] of em) m.emissiveIntensity = v;
        }
      }
      return orig.call(this, s, c);
    };
    NW.active = true;
    try { ctx.renderNested('night_window', 'view_bay_back', tl, u, T, rt, camera.aspect); }
    catch (e) { console.warn('corridor: bay render failed', String(e).slice(0, 200)); }
    finally { NW.active = false; r.render = orig; NW.cam.clearViewOffset(); NW.cam.updateProjectionMatrix(); }
    const U = portalMat.uniforms;
    U.tCol.value = rt.texture; U.tDep.value = rt.depthTexture; U.uOff.value.set(px0, py0); U.uSize.value.set(vw, vh);
    U.nNear.value = NW.near; U.nFar.value = NW.far; U.mNear.value = camera.near; U.mFar.value = camera.far; U.uOk.value = 1;
  }

  // ============================================================ the five windows of the eras: P1–P4 vitrines
  const paneVS = /* glsl */ `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const paneFS = /* glsl */ `varying vec3 vW; varying vec2 vUv;
    uniform sampler2D tEra, tPet; uniform vec3 uCam, uO, uU, uV, uN; uniform float uStr, uExpo, uSat, uGreen, uAsp, uBlack, uBlur, uAspT, uPink, uPet, uT, uComp, uGam, uSkin, uRain, uClip; uniform vec3 uGain, uRainL;
    float h11(float x){ return fract(sin(x * 127.1) * 43758.5453); }
    // P2 (integration): the CH3 rain as 3–5 cm streaks, motion-blurred, three depth layers, lit from behind by the era's own
    // light (the door lamp, the warm doorway): each streak glows with the image's local brightness, faint where it is dark
    float rainLayer(vec2 uv, float n, float spd, float len, float t, float seed){
      vec2 p = vec2(uv.x * n + uv.y * 0.6, uv.y);
      float c = floor(p.x), f = fract(p.x), r = h11(c + seed), r2 = h11(c * 1.73 + seed + 3.1);
      float w = smoothstep(0.07, 0.0, abs(f - (0.15 + 0.7 * r)));
      float y = fract(p.y * (0.55 + 0.3 * r2) + t * spd * (0.85 + 0.3 * r) + r2 * 7.0);
      return w * smoothstep(0.0, 0.02, y) * smoothstep(len, len * 0.35, y);
    }
    void main(){
      vec3 rd = normalize(vW - uCam);
      float t = dot(uO - uCam, uN) / dot(rd, uN);
      vec3 H = uCam + rd * t - uO;
      vec2 q = vec2(dot(H, uU) / dot(uU, uU), dot(H, uV) / dot(uV, uV));
      vec2 uv = q * 0.5 + 0.5;
      // integration: the other night fills its window (only a soft fall-off at the image's own borders)
      float inb = smoothstep(0.0, 0.07, uv.x) * smoothstep(0.0, 0.07, 1.0 - uv.x) * smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
      inb *= mix(0.7, 1.0, smoothstep(0.85, 0.3, length((uv - vec2(0.5, 0.5)) * vec2(1.2, 1.0))));
      // dark glass: only the other night's light registers; a soft 9-tap disc: the other night is seen through old glass at
      // its own depth — shapes, light and gesture read, faces stay unresolved (留白)
      vec3 c = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        float a = float(i) * 2.39996 + 0.5, r = i == 0 ? 0.0 : sqrt(float(i) / 8.0);
        c += max(texture2D(tEra, clamp(uv + vec2(cos(a), sin(a) * uAspT) * r * uBlur, 0.002, 0.998)).rgb - uBlack, 0.0);
      }
      c *= uExpo / 9.0;
      c += 0.12 * max(texture2D(tEra, clamp(uv + vec2(0.006, -0.004), 0.002, 0.998)).rgb - uBlack, 0.0) * uExpo;   // the faint second image of thick glass
      // the other night's own tone: lift its darks (the swell, the wet stone read) and roll its lamps off (no blown glare)
      c = pow(max(c, 0.0) / 0.5, vec3(uGam)) * 0.5;
      c = c / (1.0 + c * uComp);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= uClip / max(uClip, l); l = min(l, uClip);                 // no blown glitter 'confetti' in the glass (soft ceiling per era)
      // skin-pink → dove grey (hue-selective: warm, red > green > blue, mid saturation)
      float pk = uPink * smoothstep(0.02, 0.12, c.r - c.b) * smoothstep(0.0, 0.08, c.g - c.b) * (1.0 - smoothstep(0.5, 0.9, (c.r - c.b) / max(c.r, 1e-4)));
      c = mix(c, vec3(l) * vec3(0.95, 0.97, 1.04), pk);
      // faces never read as pale masks: skin-hued, lit areas go down ≈ 1.3 stops (the case's rattan and the bulbs are more saturated)
      float sat = (c.r - c.b) / max(c.r, 1e-4), gr = c.g / max(c.r, 1e-4);
      float sk = uSkin * smoothstep(0.12, 0.22, sat) * (1.0 - smoothstep(0.5, 0.64, sat)) * smoothstep(0.58, 0.68, gr) * (1.0 - smoothstep(0.88, 0.95, gr)) * smoothstep(0.04, 0.2, l);
      c *= 1.0 - 0.6 * sk; l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // P4: the stained-glass petals laid as coloured light over whatever is lit (the mother's shoulders under the window)
      if (uPet > 0.0) {
        vec3 pt = texture2D(tPet, uv * vec2(0.55, 0.45) + vec2(0.22, 0.3 + 0.01 * sin(uT * 0.3)), 2.0).rgb;
        float pl = dot(pt, vec3(0.333));
        c *= mix(vec3(1.0), pt / max(pl, 0.05) * 0.9, uPet * smoothstep(0.01, 0.12, l));
      }
      if (uRain > 0.0) {
        vec3 bl = vec3(0.0);
        for (int i = 0; i < 6; i++) { float a = float(i) * 1.047; bl += max(texture2D(tEra, clamp(uv + vec2(cos(a), sin(a)) * vec2(0.09, 0.07), 0.002, 0.998)).rgb - uBlack, 0.0); }
        bl *= uExpo / 6.0;
        float rr = rainLayer(vUv, 34.0, 1.9, 0.07, uT, 1.0) * 0.55 + rainLayer(vUv, 21.0, 1.5, 0.09, uT, 7.0) * 0.8 + rainLayer(vUv, 12.0, 1.15, 0.12, uT, 13.0);
        vec2 dl = (vUv - uRainL.xy) * vec2(uAsp, 1.0);
        vec3 back = bl * vec3(0.9, 0.95, 1.05) * 1.6 + uRainL.z * vec3(1.0, 0.72, 0.42) * exp(-dot(dl, dl) / 0.08);   // + the door lamp behind the curtain
        c += rr * uRain * (vec3(0.012, 0.014, 0.018) + back);
        c += uRain * uRainL.z * vec3(0.30, 0.17, 0.08) * exp(-dot(dl, dl) / 0.03);                                      // its glow through the rain
      }
      c = mix(vec3(l), c, uSat); c.g = mix(l, c.g, uGreen) * 0.5 + c.g * 0.5; c *= uGain;
      float e = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x) * uAsp, min(vUv.y, 1.0 - vUv.y))) * smoothstep(0.0, 0.06, vUv.y);
      gl_FragColor = vec4(max(c, 0.0) * uStr * inb * e, 1.0);
    }`;
  const paneObjs = [];
  const VW = 1.1, VD = 0.6, VH = 2.3, VP = 0.4;             // P4 (S061 is staged on it); P1–P3 carry their own (vw, vh, vp)
  const velvetM = TX.mat('velvet', { color: hex('#141c2a'), sheenColor: hex('#1a2436') });
  for (const P of PANES) {
    const side = Math.sign(P.z);                 // -1 north, +1 south
    const pw = P.vw ?? VW, ph = P.vh ?? VH, pp = P.vp ?? VP, vd = P.vd ?? VD;
    const a = (P.alpha ?? ALPHA) * D2R;                          // P4 turned 60° (review: S061's hands need room in front of its glass)
    const n = V(-Math.sin(a), 0, -side * Math.cos(a));          // front normal: toward the corridor axis, turned west
    const w = V(n.z, 0, -n.x).normalize();                        // along the pane: the right hand of a viewer facing the glass
    const Pc = V(P.x, 0, P.z);                                    // front-pane centre (floor level)
    const foot = Pc.clone().addScaledVector(n, -vd / 2);
    const v = vitrine({ w: pw, d: vd, h: ph, plinthH: pp, frame: 0, deck: 'velvet', light: 'none', res: [ctx.W, ctx.H], seed: 3 + paneObjs.length,
      glass: { haze: 0.16, dust: 0.1, hazeLevel: 0.01, envMapIntensity: 0.75 } });
    const grp = v.object3D; grp.position.copy(foot); grp.rotation.y = Math.atan2(n.x, n.z); scene.add(grp);
    for (const gm of Object.values(v.glass)) { gm.material.envMap = ENV; }
    grp.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity >= 2) { o.material.envMap = ENV; o.material.envMapIntensity = 3.0; o.material.roughness = 0.3; } });
    v.plinth.material.color.set('#0a0b0e'); v.plinth.material.roughness = 0.55; v.plinth.material.envMap = ENV; v.plinth.material.envMapIntensity = 0.5;
    if (v.deck.material.isMeshPhysicalMaterial) { v.deck.material.color.set('#0c1018'); v.deck.material.sheen = 0.15; v.deck.material.sheenColor.set('#141a26'); }
    // velvet-lined back wall inside (the dark behind the glass that lets the other night be seen)
    // integration: P1–P3 are see-through cases (smoked glass back): the corridor's perspective stays readable through them
    // and the other night floats in the glass as light (dark parts of an era show the corridor faintly behind)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.03, ph - 0.03), P.smoke ? new THREE.MeshBasicMaterial({ color: 0x04060a, transparent: true, opacity: P.smoke, depthWrite: true }) : velvetM);
    back.position.set(0, pp + ph / 2, -vd / 2 + 0.015); back.receiveShadow = true; if (P.smoke) back.renderOrder = 50; grp.add(back);
    // era plate just inside the front glass
    const rt = ctx.makeRT(P.rt[0], P.rt[1]);
    const rtLo = ctx.makeRT(Math.round(P.rt[0] / 2 / 8) * 8, Math.round(P.rt[1] / 2 / 8) * 8);   // pane LOD: far or faint → half res
    const G = GRADES[P.grade];
    const U = { tEra: { value: rt.texture }, tPet: { value: null }, uCam: { value: V(0, 0, 0) }, uO: { value: V(0, 0, 0) }, uU: { value: V(1, 0, 0) }, uV: { value: V(0, 1, 0) }, uN: { value: n.clone() },
      uStr: { value: 0 }, uExpo: { value: G.expo }, uSat: { value: G.sat }, uGreen: { value: G.green }, uGain: { value: V(...G.gain) }, uAsp: { value: pw / ph }, uBlack: { value: P.black }, uBlur: { value: P.blur ?? 0.004 },
      uAspT: { value: P.rt[0] / P.rt[1] }, uPink: { value: G.pink || 0 }, uPet: { value: 0 }, uT: { value: 0 }, uComp: { value: G.comp ?? 0.2 }, uGam: { value: G.gam ?? 1 }, uSkin: { value: G.skin ?? 0 }, uRain: { value: P.rain ?? 0 }, uRainL: { value: V(...(P.rainL || [0.5, 0.8, 0])) }, uClip: { value: G.clip ?? 10 } };
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.02, ph - 0.02), new THREE.ShaderMaterial({ uniforms: U, vertexShader: paneVS, fragmentShader: paneFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    plate.position.set(0, pp + ph / 2, vd / 2 - 0.012); plate.renderOrder = 55; grp.add(plate);
    // virtual image plane: parallel to the pane, `depth` m behind it, centred on the ray from the peak camera position
    const anchor = Pc.clone().addScaledVector(w, P.anchor[0]).setY(P.anchor[1]);
    const Cpk = V(x66(P.peak), EYE66, 0);
    const O0 = Pc.clone().addScaledVector(n, -P.depth).setY(0);
    const rd = anchor.clone().sub(Cpk).normalize();
    const tt = O0.clone().sub(Cpk).dot(n) / rd.dot(n);
    const O = Cpk.clone().addScaledVector(rd, tt);
    const asp = P.rt[0] / P.rt[1];
    const dpk = anchor.distanceTo(Cpk);
    const Hv = P.size * (dpk + P.depth) / dpk, Wv = Hv * asp;     // at its peak the other night fills the pane, ≈ P.size tall
    // shift the image so its subject (view uv P.subj) sits on the anchor ray at the peak
    U.uU.value.copy(w).multiplyScalar(Wv / 2); U.uV.value.set(0, Hv / 2, 0);
    O.addScaledVector(U.uU.value, -(2 * P.subj[0] - 1)).addScaledVector(U.uV.value, -(2 * P.subj[1] - 1));
    U.uO.value.copy(O);
    // the glass rectangle in world space (for the spill: its light falling out onto the corridor)
    const gC = Pc.clone().setY(pp + ph / 2).addScaledVector(n, 0.0), gU = w.clone().multiplyScalar(pw / 2), gV = V(0, ph / 2, 0);
    paneObjs.push({ P, v, grp, plate, U, rt, rtLo, n, w, Pc, side, pw, ph, pp, vd, gC, gU, gV, box: new THREE.Box3() });
  }
  // museum objects inside the panes (dim, unlit): P1 old stern lantern · P2 brass candlestick + stub · P3 enamel shade · P4 stained glass
  {
    // P1: the old horn stern lantern, unlit, a missing panel — standing low on the deck (integration: hung at mid height it
    // read as a second lantern in the sea image)
    const deck1 = paneObjs[0].pp + 0.02;
    const L = FX.lantern({ style: 'horn', size: 0.75, intensity: 0, seed: 5 });
    L.light.visible = false; L.body.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uInt) o.visible = false; });
    if (L.halo) L.halo.object3D.visible = false; L.body.children.forEach((o) => { if (o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false; });
    if (L.body.userData.shell) { L.body.userData.shell.emissiveIntensity = 0; L.body.userData.shell.color.set('#2a2016'); L.body.userData.shellBase = 0; }
    L.object3D.position.set(0.42, deck1 + 0.34, -0.02); L.object3D.scale.setScalar(0.8); paneObjs[0].grp.add(L.object3D); L.update(0, { swing: 0, intensity: 0 });
    if (L.body.userData.shell) L.body.userData.shell.emissiveIntensity = 0;
    // P2: brass candlestick with a 2.5 cm stub
    const deck2 = paneObjs[1].pp + 0.02;
    const br = TX.mat('brass', { tex: { tone: 'museum', patina: 0.5 } });
    const prof = [[0, 0], [0.055, 0], [0.058, 0.012], [0.03, 0.03], [0.014, 0.06], [0.012, 0.16], [0.02, 0.17], [0.034, 0.18], [0.034, 0.188], [0.016, 0.19], [0, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
    // (review: set to the back-left of the deck — centred, it stood exactly on the era image's bowl and read as a candle in it)
    const csX = 0.5, csZ = -0.05;
    const cs = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), br); cs.position.set(csX, deck2 + 0.16, csZ); paneObjs[1].grp.add(cs);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.025, 16), std({ color: hex('#d8cdb2'), roughness: 0.7 })); stub.position.set(csX, deck2 + 0.16 + 0.19 + 0.0125, csZ); paneObjs[1].grp.add(stub);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), velvetM); stand.position.set(csX, deck2 + 0.08, csZ); paneObjs[1].grp.add(stand);
    // P3: the waiting shed's old enamel lamp shade, hung high in the case (integration: at chest height its cone crossed the
    // migrant's image)
    const o3 = paneObjs[2], top3 = o3.pp + o3.ph;
    const sh = [[0.02, 0.0], [0.04, 0.01], [0.09, 0.05], [0.16, 0.11], [0.2, 0.14], [0.205, 0.15]].map(([r, y]) => new THREE.Vector2(r, -y));
    const shade = new THREE.Mesh(new THREE.LatheGeometry(sh, 40), std({ color: hex('#3a3833'), roughness: 0.45, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: 0.2 }));
    shade.position.set(0.42, top3 - 0.3, -0.01); shade.scale.setScalar(0.7); o3.grp.add(shade);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), mSteel); rod.position.set(0.42, top3 - 0.15, -0.01); o3.grp.add(rod);
  }

  // ============================================================ era light spilling out of the panes onto the corridor
  // (integration) Each pane is a window into a lit night: its light falls out onto the floor, the walls and the ceiling
  // around it — P1 sea-blue shimmer + the swaying lamp's warm point · P2 candle amber + cold rain sparkle · P3 warm bulb
  // pools · P4 stained-glass petals. A custom light term injected into the corridor's standard materials (one loop over the
  // four glass rectangles: a soft area-light form factor × a per-era pattern; front side full, back side 40 %), driven by
  // uniforms only (zero in S027 / S061: no eras yet / none now). No shadows; the floor's waxed reflection doubles it.
  const SPILL = {
    uSpC: { value: paneObjs.map((o) => o.gC.clone()) }, uSpN: { value: paneObjs.map((o) => o.n.clone()) },
    uSpU: { value: paneObjs.map((o) => o.gU.clone()) }, uSpV: { value: paneObjs.map((o) => o.gV.clone()) },
    uSpK: { value: paneObjs.map(() => V(0, 0, 0)) }, uSpW: { value: paneObjs.map(() => V(0, 0, 0)) }, uSpWK: { value: paneObjs.map(() => V(0, 0, 0)) },
    uSpT: { value: 0 }, tSpPet: { value: null }, uSpPetM: { value: new THREE.Matrix4() },
  };
  const spillGLSL = /* glsl */ `
    uniform vec3 uSpC[4], uSpN[4], uSpU[4], uSpV[4], uSpK[4], uSpW[4], uSpWK[4]; uniform float uSpT; uniform sampler2D tSpPet; uniform mat4 uSpPetM;
    varying vec3 vSpW;
    float spH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec3 eraSpill(vec3 wp, vec3 wn){
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        vec3 K = uSpK[i];
        vec3 W = uSpW[i], WK = uSpWK[i];
        if (K.x + K.y + K.z + WK.x + WK.y + WK.z < 1e-5) continue;
        vec3 C = uSpC[i], N = uSpN[i], U = uSpU[i], Vv = uSpV[i];
        vec3 d = wp - C;
        float hN = dot(d, N), back = hN > 0.0 ? 1.0 : 0.4;
        float a = clamp(dot(d, U) / dot(U, U), -1.0, 1.0), b = clamp(dot(d, Vv) / dot(Vv, Vv), -1.0, 1.0);
        vec3 q = C + U * a + Vv * b;
        vec3 L = q - wp; float r2 = max(dot(L, L), 1e-4); vec3 l = L * inversesqrt(r2);
        float ndl = max(dot(wn, l), 0.0), emit = abs(dot(l, N)) * 0.75 + 0.25;
        float A = 4.0 * length(U) * length(Vv);
        float ff = A * ndl * emit / (3.14159 * r2 + A) * back / (1.0 + 0.3 * r2);   // + a faster fall-off: the light pools round its pane
        vec3 pat = vec3(1.0);
        if (i == 0) {          // P1: moonlit swell — moving caustic ridges
          vec2 p = wp.xz * 1.7 + wp.y * vec2(0.6, -0.4);
          float cs = sin(p.x * 2.1 + sin(p.y * 1.7 + uSpT * 0.9) * 1.3 + uSpT * 0.6) * sin(p.y * 2.6 + sin(p.x * 1.3 - uSpT * 0.7) * 1.1 - uSpT * 0.5);
          pat = vec3(0.45 + 1.35 * pow(clamp(abs(cs), 0.0, 1.0), 3.0));
        } else if (i == 1) {   // P2: candle amber (flicker in K) + cold rain sparkle on the boards
          vec2 cell = floor(wp.xz * 26.0 + wp.y * 9.0); float h = spH(cell);
          float tw = step(0.975, h) * pow(clamp(0.5 + 0.5 * sin(uSpT * 11.0 + h * 80.0), 0.0, 1.0), 10.0);
          pat = vec3(1.0) + vec3(0.7, 0.85, 1.25) * tw * 9.0 * smoothstep(0.5, 0.95, wn.y);
        } else if (i == 2) {   // P3: three bulb pools on the floor in front of the case
          float pools = 0.0;
          for (int k = 0; k < 3; k++) { vec3 pc = C + U * (float(k) - 1.0) * 0.75 + N * (0.9 + 0.35 * float(k)); pc.y = 0.0; vec3 dd = wp - pc; pools += exp(-dot(dd.xz, dd.xz) / 0.28); }
          pat = vec3(0.45 + 2.2 * pools * smoothstep(0.5, 0.95, wn.y) + 0.6 * (1.0 - smoothstep(0.5, 0.95, wn.y)));
        } else {               // P4: stained-glass petals projected from a high point behind the panel
          vec4 pq = uSpPetM * vec4(wp, 1.0); vec2 puv = pq.xy / max(pq.w, 1e-3);
          float inside = step(0.0, pq.w) * smoothstep(0.0, 0.08, puv.x) * smoothstep(0.0, 0.08, 1.0 - puv.x) * smoothstep(0.0, 0.08, puv.y) * smoothstep(0.0, 0.08, 1.0 - puv.y);
          vec3 pt = texture2D(tSpPet, puv, 1.5).rgb;
          pat = vec3(0.35) + pt * 4.0 * inside;
        }
        acc += K * ff * pat;
        // the era's own lamp, a warm point (P1 swinging lantern, P2 candle): soft point light just inside the glass
        vec3 LW = W - wp; float w2 = dot(LW, LW);
        acc += WK * max(dot(wn, LW * inversesqrt(max(w2, 1e-4))), 0.0) / (w2 + 0.25) * (dot(wp - W, N) > -0.05 ? 1.0 : 0.4);
      }
      if (any(isnan(acc))) acc = vec3(0.0);
      return min(acc, vec3(60.0));
    }`;
  const spillMats = new Set();
  function addSpill(m) {
    if (!m || spillMats.has(m)) return; spillMats.add(m);
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, SPILL);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSpW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvSpW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + spillGLSL)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.directDiffuse += diffuseColor.rgb * eraSpill(vSpW, normalize(inverseTransformDirection(normal, viewMatrix)));');
    };
    m.customProgramCacheKey = () => 'corridorSpill';
    m.needsUpdate = true;
  }
  for (const m of [mFloor, mWall, mPlaster, mCeil, mBeam, mSill, mTimber, ...spillLater]) addSpill(m);

  // ============================================================ P4: PROP_GLASSPANEL — 60 × 90 cm leaded panel on a very dim lightbox
  const P4 = paneObjs[3];
  const PANEL = { w: 0.6, h: 0.9, y: 1.70, back: 0.14 };       // centre height (review: diamond at 1.45 = her bowed eye line), distance behind the front glass
  const DIAM = { u: -0.19, v: -0.25, w: 0.078, h: 0.117 };   // integration: the clear quarry ×1.3 (was 6 × 9 cm): her whole head fits in it        // the clear diamond quarry, lower left (panel-local, m)
  // the panel: layered non-figurative petals in the five softened colours (P23–P27) over a lattice of pale diamond quarries,
  // oxidised grey leads (two cracked pieces); one clear 6 × 9 cm diamond at lower left (alpha 0: the reflection lives there)
  const panelTex = (() => {
    const W = 1024, H = 1536, c = canvas(W, H), g = c.getContext('2d'), r = rng(57), N = TX.makeNoise(23);
    const pxm = W / PANEL.w / 1000;                                 // px per mm
    const soft = (hx, k) => { const cc = new THREE.Color(hx); const l = 0.2126 * cc.r + 0.7152 * cc.g + 0.0722 * cc.b; cc.lerp(new THREE.Color(l, l, l), k); return '#' + cc.getHexString(); };
    const COLS = [C.P23, C.P24, C.P25, C.P26, C.P27].map((h) => soft(h, 0.3));
    const LEAD = '#4b4e51', lw = 5.5 * pxm;
    const leadPath = (path) => { g.save(); g.strokeStyle = LEAD; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(path); g.strokeStyle = 'rgba(150,152,150,0.35)'; g.lineWidth = lw * 0.3; g.stroke(path); g.restore(); };
    // ground: a dense field of overlapping petals (every piece a petal: 'light divided into ten thousand petals')
    g.fillStyle = soft(C.P25, 0.3); g.fillRect(0, 0, W, H);
    const petal = (cx, cy, a, len, wid, col) => {
      const pth = new Path2D(), nx = -Math.sin(a), ny = Math.cos(a), ex = Math.cos(a), ey = Math.sin(a);
      pth.moveTo(cx - ex * len / 2, cy - ey * len / 2);
      pth.quadraticCurveTo(cx + nx * wid, cy + ny * wid, cx + ex * len / 2, cy + ey * len / 2);
      pth.quadraticCurveTo(cx - nx * wid, cy - ny * wid, cx - ex * len / 2, cy - ey * len / 2);
      g.fillStyle = col; g.fill(pth); leadPath(pth);
    };
    for (let i = 0; i < 900; i++) {
      const cc = new THREE.Color(COLS[Math.floor(r() * 5)]).multiplyScalar(0.8 + r() * 0.35);
      const len = (34 + r() * 52) * pxm, wid = len * (0.22 + r() * 0.16);
      petal(r() * W, r() * H, r() * Math.PI, len, wid, '#' + cc.getHexString());
    }
    // rosettes of layered petals
    const ros = [[0.62, 0.3, 0.15], [0.3, 0.5, 0.12], [0.72, 0.68, 0.13], [0.42, 0.88, 0.09], [0.18, 0.18, 0.08], [0.85, 0.47, 0.08], [0.5, 0.08, 0.07]];
    for (const [ux, uy, rr0] of ros) {
      const cx = ux * W, cy = uy * H, R0 = rr0 * W;
      const layers = 3;
      for (let L = 0; L < layers; L++) {
        const n = 6 + Math.floor(r() * 4) + L, R = R0 * (1 - L * 0.28), ph = r() * Math.PI;
        const col = COLS[Math.floor(r() * 5)];
        for (let k = 0; k < n; k++) {
          const a = ph + k / n * Math.PI * 2, len = R * (0.85 + r() * 0.3), wid = R * (0.32 + r() * 0.12);
          const pth = new Path2D();
          const tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
          pth.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
          pth.quadraticCurveTo(cx + Math.cos(a) * len * 0.55 + nx * wid, cy + Math.sin(a) * len * 0.55 + ny * wid, tx, ty);
          pth.quadraticCurveTo(cx + Math.cos(a) * len * 0.55 - nx * wid, cy + Math.sin(a) * len * 0.55 - ny * wid, cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
          const cc = new THREE.Color(r() < 0.75 ? col : COLS[Math.floor(r() * 5)]).multiplyScalar(0.85 + r() * 0.3);
          g.fillStyle = '#' + cc.getHexString(); g.fill(pth); leadPath(pth);
        }
      }
      const ctr = new Path2D(); ctr.arc(cx, cy, R0 * 0.16, 0, Math.PI * 2); g.fillStyle = soft(C.P24, 0.05); g.fill(ctr); leadPath(ctr);
    }
    // glass texture: density mottling, streaks, seed bubbles (painted over the colour, leads re-darkened after)
    const im = g.getImageData(0, 0, W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, u = x / W, v = y / H;
      const k = 0.86 + 0.18 * N.fbm(u * 3, v * 4.5, 8, 3) + 0.06 * N.n(u * 2 + v * 40, v * 3, 40, 3);
      d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
    }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,245,${0.1 + r() * 0.25})`; g.beginPath(); g.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, Math.PI * 2); g.fill(); }
    // a few clear quarries (pale, transmitting the lightbox)
    for (const [ux, uy] of [[0.78, 0.14], [0.14, 0.4], [0.55, 0.56], [0.86, 0.86], [0.6, 0.93]]) {
      const qx = ux * W, qy = uy * H, qw2 = 30 * pxm, qh2 = 45 * pxm, pth = new Path2D();
      pth.moveTo(qx, qy - qh2); pth.lineTo(qx + qw2, qy); pth.lineTo(qx, qy + qh2); pth.lineTo(qx - qw2, qy); pth.closePath();
      g.fillStyle = '#c6cbc8'; g.fill(pth); leadPath(pth);
    }
    // two cracks
    g.strokeStyle = 'rgba(25,25,25,0.85)'; g.lineWidth = 1.4;
    for (const [x, y] of [[0.66 * W, 0.24 * H], [0.24 * W, 0.6 * H]]) { g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let k = 0; k < 7; k++) { px += (r() - 0.35) * 40; py += (r() - 0.5) * 40; g.lineTo(px, py); } g.stroke(); }
    // border came
    g.strokeStyle = LEAD; g.lineWidth = lw * 2.2; g.strokeRect(lw, lw, W - 2 * lw, H - 2 * lw);
    // the clear diamond at lower left: alpha 0 with its came
    const dx = (0.5 + DIAM.u / PANEL.w) * W, dy = (0.5 - DIAM.v / PANEL.h) * H, hw = DIAM.w / PANEL.w * W / 2, hh = DIAM.h / PANEL.h * H / 2;
    const dp = new Path2D(); dp.moveTo(dx, dy - hh); dp.lineTo(dx + hw, dy); dp.lineTo(dx, dy + hh); dp.lineTo(dx - hw, dy); dp.closePath();
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(dp); g.restore();
    g.save(); g.strokeStyle = LEAD; g.lineWidth = lw * 1.3; g.stroke(dp); g.restore();
    const t = ctex(c); t.anisotropy = 8; return t;
  })();
  // transmitted light = emissive (the very dim lightbox behind); the front surface is dark glossy glass with leads
  const panelMat = new THREE.MeshStandardMaterial({ color: hex('#2a2a2a'), map: panelTex, emissive: hex('#e8e0d4'), emissiveMap: panelTex, emissiveIntensity: 0.2,
    roughness: 0.18, metalness: 0.0, envMap: ENV, envMapIntensity: 0.8, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
  const setLightbox = (k) => { panelMat.emissiveIntensity = k; };
  SPILL.tSpPet.value = panelTex;
  const panelG = new THREE.Group(); P4.grp.add(panelG);
  panelG.position.set(0, PANEL.y, VD / 2 - PANEL.back);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), panelMat); panelG.add(panel);
  const frameM = std({ color: hex('#2b2c2e'), roughness: 0.5, metalness: 0.6 });
  for (const [sx, sy, w, h] of [[0, PANEL.h / 2 + 0.012, PANEL.w + 0.05, 0.024], [0, -PANEL.h / 2 - 0.012, PANEL.w + 0.05, 0.024], [PANEL.w / 2 + 0.012, 0, 0.024, PANEL.h], [-PANEL.w / 2 - 0.012, 0, 0.024, PANEL.h]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), frameM); f.position.set(sx, sy, -0.012); panelG.add(f);
  }
  const panelStand = new THREE.Mesh(new THREE.BoxGeometry(0.03, PANEL.y - PANEL.h / 2 - VP, 0.03), frameM); panelStand.position.set(0, -(PANEL.y - VP) / 2 - PANEL.h / 4, -0.03); panelG.add(panelStand);
  // the panel's soft coloured glow on whoever studies it (one cheap unshadowed spot)
  // S061: a cool rim from behind her head (moon reach cheat): her profile edge reads in the dark quarry
  const rim61 = new THREE.SpotLight(hex('#b8c8e8'), 0, 2.5, 0.32, 0.6, 2); scene.add(rim61, rim61.target);
  const panelGlow = new THREE.SpotLight(hex('#c9a48a'), 0, 3.0, 0.9, 0.9, 2); panelGlow.position.set(0, 0, 0.05); panelG.add(panelGlow, panelGlow.target); panelGlow.target.position.set(0, -0.1, 1.0);
  // the diamond: an opaque dark quarry showing the mirror render (her reflection), at mirror depth for the DOF
  const mirror = { rt: null, mask: null, cam: new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 600), on: false, depth: 1.6 };
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const diamondMat = new THREE.ShaderMaterial({
    uniforms: { tRef: { value: null }, tRefD: { value: null }, uOff: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uFlipX: { value: 0 }, uStr: { value: 0.45 }, uDepth: { value: 0.5 }, uOk: { value: 0 }, uNear: { value: 0.03 }, uFar: { value: 600 }, uHeadD: { value: 2.6 }, uSheen: { value: 0.65 } },
    vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `#include <packing>
      uniform sampler2D tRef, tRefD; uniform vec2 uOff, uSize; uniform float uStr, uDepth, uOk, uNear, uFar, uFlipX, uHeadD, uSheen;
      void main(){
        vec2 uv = (gl_FragCoord.xy - uOff) / uSize; uv.x = mix(uv.x, 1.0 - uv.x, uFlipX);
        // old, slightly uneven quarry glass: a soft 5-tap reflection (review: the crisp mirror read as a mask)
        vec2 px = 1.6 / uSize;
        vec3 r = uOk > 0.5 ? 0.36 * texture2D(tRef, clamp(uv, 0.0, 1.0)).rgb
          + 0.16 * (texture2D(tRef, clamp(uv + vec2(px.x, 0.4 * px.y), 0.0, 1.0)).rgb + texture2D(tRef, clamp(uv - vec2(px.x, 0.4 * px.y), 0.0, 1.0)).rgb
                  + texture2D(tRef, clamp(uv + vec2(-0.4 * px.x, px.y), 0.0, 1.0)).rgb + texture2D(tRef, clamp(uv - vec2(-0.4 * px.x, px.y), 0.0, 1.0)).rgb) : vec3(0.0);
        // integration: a moonlit silhouette. The quarry glass carries a cool sheen of the moonlit corridor behind her; her head
        // (found by the mirror render's depth: nearer than uHeadD) is a darker shape over it — the face plane ≥ 1.5 stops under
        // the sheen and the panel — with only the moon's rim along her profile (and the eye's wet glint) kept bright
        float rl = dot(r, vec3(0.2126, 0.7152, 0.0722));
        float head = uOk > 0.5 ? 0.25 * (texture2D(tRefD, clamp(uv, 0.0, 1.0)).r * 2.0 + texture2D(tRefD, clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).r + texture2D(tRefD, clamp(uv - vec2(px.x, 0.0), 0.0, 1.0)).r) : 0.0;
        vec3 sheen = vec3(0.30, 0.38, 0.55) * uSheen * (0.7 + 0.6 * smoothstep(0.0, 1.0, uv.y)) + r * 0.5;
        vec3 face = r * (0.08 + 2.0 * smoothstep(0.25, 0.8, rl)) * vec3(0.8, 0.92, 1.15) + vec3(0.30, 0.38, 0.55) * uSheen * 0.16;
        gl_FragColor = vec4(vec3(0.004, 0.005, 0.007) + mix(sheen, face, head) * uStr, 1.0);
        gl_FragDepth = uOk > 0.5 ? viewZToPerspectiveDepth(-uDepth, uNear, uFar) : gl_FragCoord.z;
      }`,
  });
  const diamondGeo = new THREE.BufferGeometry().setFromPoints([V(0, DIAM.h / 2, 0), V(-DIAM.w / 2, 0, 0), V(0, -DIAM.h / 2, 0), V(DIAM.w / 2, 0, 0)]);
  diamondGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const diamond = new THREE.Mesh(diamondGeo, diamondMat); diamond.position.set(DIAM.u, DIAM.v, -0.004); panelG.add(diamond);
  // world helpers for P4's panel / diamond
  const P4N = P4.n.clone();
  const diamondWorld = () => { diamond.updateWorldMatrix(true, false); return diamond.getWorldPosition(V(0, 0, 0)); };

  // ============================================================ the restorer (S027 silhouette in the doorway · S061 at P4)
  const R = await loadCharacter('RESTORER', { lod: 'hi' });
  scene.add(R.root); R.root.visible = false;
  // close-up hands for S061: bare R/L (with coat cuffs) + glove shells (glove mesh only) that slide off
  const HAND_OPT = { lod: 'close', hand: { forearmLen: 0.1 } };
  const bareR = await loadCharacterHand('RESTORER', 'R', { ...HAND_OPT, gloves: false });
  const bareL = await loadCharacterHand('RESTORER', 'L', { ...HAND_OPT, gloves: false });
  const shellR = await loadCharacterHand('RESTORER', 'R', { ...HAND_OPT, gloves: true, noCuff: true });
  const shellL = await loadCharacterHand('RESTORER', 'L', { ...HAND_OPT, gloves: true, noCuff: true });
  for (const h of [bareR, bareL, shellR, shellL]) { scene.add(h.root); h.root.visible = false; }
  // review: coat-sleeve stubs that carry the close-up hands' forearms out of the frame's lower left (S061). The figure's own
  // arms no longer reach the close-up wrists: in this side-on 100 mm frame any arm crossing to the hands filled half the
  // frame height; her body is out of frame left, the sleeves read as her forearms.
  const sleeves = [bareR, bareL].map((h) => {
    const g = new THREE.CylinderGeometry(0.057, 0.0485, 0.36, 22, 1, true); g.translate(0, 0.06 + 0.18, 0);
    const m = new THREE.Mesh(g, h.cuffMats && h.cuffMats[0] ? h.cuffMats[0] : std({ color: hex(C.coat), roughness: 0.9 }));
    m.castShadow = true; m.receiveShadow = true; m.visible = false; scene.add(m); return m;
  });
  for (const h of [shellR, shellL]) { if (h.meshes.skin) h.meshes.skin.visible = false; if (h.meshes.skinArm) h.meshes.skinArm.visible = false; for (const c of h.meshes.cuffs) c.visible = false; }
  // review: the shells win the depth test over the bare hand inside them (a few mm bias): the sliding glove no longer shows
  // the fingers through it as dark stripes (per-instance glove materials, only used here)
  for (const h of [shellR, shellL]) { const m = h.gloveMat || (h.meshes.glove && h.meshes.glove.material); if (m) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -24; if (m.color) m.color.multiplyScalar(0.72); m.roughness = Math.max(m.roughness ?? 0.9, 0.95); } }   // (integration: soft warm-white cotton, not glaring shells)
  // the healed 6 mm scar: "右手食指第二指节外侧" — outer (dorso-radial) side of the right index finger at the second knuckle
  // (PIP), so it reads on the back of the hand and from the thumb side (review: was purely radial, hidden from the lens)
  {
    const D = bareR.dims, F = D.F.find((f) => f.name === 'index');
    const scar = new THREE.Mesh(new THREE.CapsuleGeometry(0.0011, 0.0058, 2, 8), std({ color: hex('#f3d9cf'), roughness: 0.3, emissive: hex('#3a2a26'), emissiveIntensity: 0.25 }));
    const b = bareR.fingerBones.index[1];
    const r = F.r[1] ?? 0.008, m = bareR.mir ?? -1;
    scar.position.set(0.62 * r * m, -F.len[1] * 0.18, 0.62 * r); scar.rotation.set(0, 0, 0.12);
    b.add(scar);
  }
  // folded gloves (the pair, folded once): two flat glove shapes
  const folded = new THREE.Group(); let bundle = null;
  {
    // thin knit cotton: a fine soft noise only (a woven texture at this scale reads as lines of writing)
    const kn = (() => { const c = canvas(128, 128), g = c.getContext('2d'), r = rng(71); g.fillStyle = '#eeebe3'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,250' : '200,196,186'},${0.12 + r() * 0.15})`; g.fillRect(r() * 128, r() * 128, 1 + r() * 1.5, 1 + r() * 1.5); }
      const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t; })();
    const gm = std({ color: hex(C.glove).multiplyScalar(0.7), map: kn, roughness: 0.95 });
    gm.sheen = 0; gm.envMapIntensity = 0.2;
    // review: the folded pair is cloth, not a slab — two thin glove layers (palm + ribbed cuff) with the four fingers folded
    // back over the palm as soft ridges, a crease along the fold, everything rounded and sagging a little over the palm
    {
      const layer = (w, l, t, seed) => {
        const g = new THREE.BoxGeometry(w, l, t, 12, 14, 2), p = g.attributes.position, rr = rng(seed);
        const ph = rr() * 6.28;
        for (let i = 0; i < p.count; i++) {
          let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          const ex = Math.abs(x) / (w / 2), ey = Math.abs(y) / (l / 2);
          z *= 1 - 0.55 * Math.pow(Math.max(ex, ey), 6);                        // soft rounded edges
          x *= 1 - 0.06 * Math.pow(ey, 4);
          z += -0.004 * (ex * ex) + 0.0012 * Math.sin(x * 160 + ph) * Math.cos(y * 90);   // sags over the palm, knit ripples
          p.setXYZ(i, x, y, z);
        }
        g.computeVertexNormals(); return g;
      };
      const L1 = new THREE.Mesh(layer(0.082, 0.108, 0.006, 3), gm), L2 = new THREE.Mesh(layer(0.08, 0.104, 0.006, 5), gm);
      L1.position.set(0, 0, 0); L2.position.set(0.003, 0.004, 0.0055); L2.rotation.z = 0.05;
      folded.add(L1, L2);
      // ribbed cuffs at the y = −l/2 end
      const ribG = new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 6); ribG.rotateZ(Math.PI / 2);
      for (let k = 0; k < 9; k++) { const rb = new THREE.Mesh(ribG, gm); rb.position.set(0, -0.046 + k * 0.0032, 0.0085); rb.scale.set(2.5, 1, 0.6); folded.add(rb); }
      // the folded-back fingers: four soft ridges lying over the palm, tips toward the cuff, plus the thumb along one side
      const fg = new THREE.CapsuleGeometry(0.0072, 0.05, 4, 10); fg.scale(1, 1, 0.55);
      [-0.027, -0.009, 0.009, 0.026].forEach((x, i) => { const f = new THREE.Mesh(fg, gm); f.position.set(x, 0.012 - 0.004 * Math.abs(i - 1.5), 0.0115); f.rotation.z = 0.04 * (i - 1.5); f.scale.y = 0.85 + 0.1 * (i === 1 || i === 2); folded.add(f); });
      const th = new THREE.Mesh(fg, gm); th.position.set(0.041, -0.006, 0.006); th.rotation.z = 0.5; th.scale.set(1.05, 0.7, 1); folded.add(th);
      // the crease along the fold (the far end)
      const cr = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.068, 4, 10).rotateZ(Math.PI / 2), gm); cr.position.set(0, 0.05, 0.007); cr.scale.set(1, 1, 0.7); folded.add(cr);
      folded.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    folded.visible = false; scene.add(folded);
    // in the fist: a soft crumpled bundle (axis along the grip socket's +Y)
    const bg = new THREE.CapsuleGeometry(0.0165, 0.034, 10, 20); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const k = 1 + 0.2 * Math.sin(y * 110 + 2 * a) + 0.13 * Math.sin(5 * a + y * 55) + 0.08 * Math.cos(9 * a - y * 140) + 0.05 * Math.sin(13 * a + y * 260);
      p.setX(i, x * k); p.setZ(i, z * 0.78 * k); p.setY(i, y * (1 + 0.1 * Math.sin(3 * a))); } bg.computeVertexNormals(); }
    bundle = new THREE.Group(); const bm = new THREE.Mesh(bg, gm); bm.castShadow = true; bundle.add(bm);
    // the gloves' empty fingers flop out of the fist and hang (review: a world-oriented group, so they hang down whatever
    // the fist's orientation — they pointed up like ears with the palm-up grip)
    const fg = new THREE.CapsuleGeometry(0.0062, 0.034, 4, 8); fg.translate(0, -0.017, 0); fg.scale(1, 1, 0.65);
    const flop = new THREE.Group(); bundle.userData.flop = flop; scene.add(flop); flop.visible = false;
    [[-0.007, 0.35, 0.2], [0.0, 0.1, -0.15], [0.008, -0.25, 0.25], [0.004, 0.55, -0.35]].forEach(([dx, rz, rx], i) => {
      const f = new THREE.Mesh(fg, gm); f.position.set(dx, 0, 0.004 * (i - 1.5)); f.rotation.set(rx * 0.6, 0, rz * 0.6); f.scale.setScalar(0.85 + 0.1 * (i % 2)); f.castShadow = true; flop.add(f); });
    bundle.visible = false; scene.add(bundle);
  }

  // ============================================================ per-frame helpers
  const frustum = new THREE.Frustum(), _pm = new THREE.Matrix4();
  function inView(obj, box) { box.setFromObject(obj); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_pm); return frustum.intersectsBox(box); }
  // review: a pane may render only a sub-rectangle of its view (P.zoom = [u0, v0, u1, v1] of the view frame, v down) — a
  // digital zoom at full RT resolution through the view camera's setViewOffset (captured once, see viewCams), set just for
  // our call. P2 frames old_home's rain view on the bowl, the drip line and her palm (her face falls outside: 留白).
  const viewCams = {};
  {
    const r = ctx.renderer, orig = r.render, rt = ctx.makeRT(32, 40);
    for (const P of PANES) {
      r.render = function (s, c) { if (r.getRenderTarget() === rt && c.isPerspectiveCamera && !viewCams[P.id]) viewCams[P.id] = c; return orig.call(this, s, c); };
      try { ctx.renderNested(P.key, P.view, P.peak, 0.3, 204.667 + P.peak, rt, 32 / 40); } catch (e) { console.warn('corridor: view prime failed', P.id, String(e).slice(0, 160)); }
      r.render = orig;
    }
    rt.dispose();
  }
  // ---- era views through our own lens (integration). The other module's named view runs its setShot unchanged; only its
  // final draw into our RT is made with `eraCam`, posed RELATIVE to the view's own camera (so it follows their staging):
  // pivot = their lens + their forward × piv (+ pivOff, world m); the lens orbits the pivot by yaw (about world up, deg) and
  // pitch (deg, + = from higher), at distance d, vertical fov (deg), the pivot landing at frame point (ax, ay). Modules
  // whose frame depends on the lens itself (sea_deck's projected sea grid) take only the view offset `rect` instead.
  const eraCam = new THREE.PerspectiveCamera(40, 0.75, 0.03, 900);
  const _ef = new THREE.Vector3(), _eb = new THREE.Vector3(), _es = new THREE.Vector3();
  function eraCamFrom(c, ov, aspect) {
    c.updateMatrixWorld(true);
    if (ov.pos) {             // absolute placement in the other module's world (for sets whose layout is fixed constants)
      eraCam.position.set(...ov.pos); eraCam.up.set(0, 1, 0); eraCam.lookAt(...ov.target);
      eraCam.aspect = aspect; eraCam.fov = ov.fov ?? c.fov; eraCam.near = Math.max(0.02, c.near); eraCam.far = c.far; eraCam.updateProjectionMatrix();
      eraCam.layers.mask = c.layers.mask; eraCam.updateMatrixWorld(true);
      return eraCam;
    }
    _ef.set(0, 0, -1).applyQuaternion(c.quaternion);
    const piv = c.position.clone().addScaledVector(_ef, ov.piv ?? 3);
    if (ov.pivOff) piv.add(V(...ov.pivOff));
    _eb.copy(_ef).negate().applyAxisAngle(V(0, 1, 0), (ov.yaw || 0) * D2R);
    _es.crossVectors(V(0, 1, 0), _eb).normalize();
    _eb.applyAxisAngle(_es, -(ov.pitch || 0) * D2R).normalize();
    eraCam.position.copy(piv).addScaledVector(_eb, ov.d ?? (ov.piv ?? 3));
    eraCam.up.set(0, 1, 0); eraCam.lookAt(piv);
    eraCam.aspect = aspect; eraCam.fov = ov.fov ?? c.fov; eraCam.near = Math.max(0.02, c.near); eraCam.far = c.far;
    eraCam.updateProjectionMatrix();
    // the pivot lands at (ax, ay) of the frame (v down): turn the lens the other way by the matching angles
    const vf = Math.tan(eraCam.fov * D2R / 2), hf = vf * aspect;
    if (ov.ax !== undefined) eraCam.rotateY(Math.atan((ov.ax - 0.5) * 2 * hf));
    if (ov.ay !== undefined) eraCam.rotateX(-Math.atan((ov.ay - 0.5) * 2 * vf));
    if (ov.roll) eraCam.rotateZ(ov.roll * D2R);
    eraCam.layers.mask = c.layers.mask;
    eraCam.updateMatrixWorld(true);
    return eraCam;
  }
  // render pane `P`'s era view into rt, with its view offset (rect, sea_deck) or our own lens (ov)
  function renderEra(P, tl, u, T, rt, ov = P.ov) {
    const zc = P.rect && viewCams[P.id], w = rt.width, h = rt.height;
    if (zc) { const [cu, cv, sp] = P.rect; zc.setViewOffset(w, h, (cu - sp / 2) * w, (cv - sp / 2) * h, sp * w, sp * h); }
    const r = ctx.renderer, orig = r.render;
    if (ov) r.render = function (s, c) { if (r.getRenderTarget() === rt && c.isPerspectiveCamera) return orig.call(this, s, eraCamFrom(c, ov, w / h)); return orig.call(this, s, c); };
    try { ctx.renderNested(P.key, P.view, tl, u, T, rt, P.rt[0] / P.rt[1]); }
    finally { r.render = orig; if (zc) { zc.clearViewOffset(); zc.updateProjectionMatrix(); } }
  }
  function updatePanes(tl, u, T, strengthOf, { force = null, gain = 1 } = {}) {
    camera.updateMatrixWorld(true);
    let n = 0;
    for (const o of paneObjs) {
      const s = strengthOf(o, tl);
      o.U.uCam.value.copy(camera.position); o.U.uStr.value = s * gain; o.U.uT.value = T;
      const vis = !OFF.has('nopanes') && s > 0.004 && (force ? force.includes(o.P.id) : inView(o.plate, o.box));
      o.plate.visible = vis;
      if (vis) {
        // LOD (review, perf): a pane farther than 7 m or still faint is small / dim on screen → its half-res RT
        const lo = camera.position.distanceTo(o.Pc.clone().setY(camera.position.y)) > 7.0 || s < 0.25, rt = lo ? o.rtLo : o.rt;
        o.U.tEra.value = rt.texture;
        renderEra(o.P, tl, u, T, rt);
        n++;
      }
    }
    return n;
  }
  function hideFigure() { screenRefl.visible = false; bayLamp.distance = 12; for (const sh of shafts) sh.object3D.visible = false; for (const o of paneObjs) o.grp.visible = true; hemi.color.set('#1c2638'); hemi.groundColor.set('#4c5c7c'); floorRefl.material.uniforms.uStr.value = 1.2; floorRefl.material.uniforms.uBlur.value = 0.009; for (const v of SPILL.uSpK.value) v.set(0, 0, 0); for (const v of SPILL.uSpWK.value) v.set(0, 0, 0); for (const sp of doorSpills) sp.material.color.copy(K3000).multiplyScalar(0.07); portalMat.uniforms.uGain.value = 1.0; bayLamp.position.set(3.24, 1.62, -0.98); diamond.renderOrder = 0; diamondMat.depthFunc = THREE.LessEqualDepth; floorRefl.visible = true; panelGlow.intensity = 0; rim61.intensity = 0; galleryLight.intensity = 0; R.root.visible = false; for (const h of [bareR, bareL, shellR, shellL]) h.root.visible = false; folded.visible = false; bundle.visible = false; bundle.userData.flop.visible = false; for (const sl of sleeves) sl.visible = false; }
  // the minor niches: k = brightness, size = bokeh diameter (m) at the glow (they never resolve, whatever the lens)
  let washK = -1;
  function nicheUpdate(T, k = 1, size = 1, off = 0, wash = 1, disc = 1) {
    const U = minorPts.mat.uniforms; U.uT.value = T; U.uK.value = k; U.uSize.value = size; U.uOff.value = off; U.uDisc.value = disc;
    if (wash !== washK) { washK = wash; const c = new THREE.Color(); minorPts.washBase.forEach((b, i) => minorPts.wash.setColorAt(i, c.copy(b).multiplyScalar(wash))); minorPts.wash.instanceColor.needsUpdate = true; }
  }
  const dist = (p) => camera.position.distanceTo(p);

  // ============================================================ setups
  const setups = {};

  // ---- S027 (96.917–101.792): WS 135 mm from the west end, compressing east; 02:10, moon due south ~60°
  setups.S027 = (tl, u, T) => {
    hideFigure();
    // integration: a readable night (the moonlit boards, both walls deep blue, the bay window bright at the end), the bay's
    // reading lamp off (02:10: the bench is empty — it reads against the moonlit window and the harbour points)
    // (integration: the roof now shadows the moon — the walls had been lit by a leak over the south wall; the boards' pools and
    // a deep-blue fill carry the night instead, a faint haze in the moonbeams)
    setMoon(180, 60, DOV.moon ?? 7.0, V(-30, 0, -HW), V(1, CEIL, HW + WALL_T));
    setShafts(180, 60, DOV.shaft ?? 0.014, T, [-40, 0]);
    setLightbox(0.12);
    hemi.intensity = DOV.hemi ?? 6.0; hemi.color.set('#22324e'); hemi.groundColor.set('#3a4a68'); bayLamp.intensity = 0.15; bounce.intensity = 0;
    nicheUpdate(T, 0.42, 1.1, 0.22);                                   // seen edge-on from the west end: soft warm bokeh clear of the wall
    doorSpills.forEach((sp, i) => sp.material.color.copy(K3000).multiplyScalar(i === DOOR_X.length - 1 ? 0.28 : 0.07));
    // the last doorway's far reveal is the warm field her silhouette crosses (review: brighter; she reads dark against it)
    revealMats.forEach((m, i) => { m.emissiveIntensity = i === DOOR_X.length - 1 ? 1.5 : 0.1; });
    galleryLight.intensity = 4.0; galleryLight.position.set(-8.4, 1.7, -3.8);   // G3's 3000 K light beyond the doorway, behind her: a warm rim
    // motion control: 0.3 m over 4.2 s from tl 0.70 (12-frame ease-in), level, centre line
    const s = clamp((tl - 0.7) / 4.2), push = 0.3 * (s < 0.12 ? (s * s) / 0.24 : s - 0.06) / 0.94;
    cam.lens(camera, 135); camera.near = 0.5; camera.far = 6000;
    cam.place(camera, [-44 + push, EYE, 0], [10, EYE, 0]);
    // her silhouette crosses the last doorway's glow (x = −10), walking east, 2.58 → 3.8 s
    const k = clamp((tl - 2.25) / 1.75);
    if (k > 0 && k < 1) {
      R.root.visible = true; R.setGloves(true); for (const h of Object.values(R.hands)) h.root.visible = true;
      const x = lerp(-11.0, -9.3, k);
      R.root.position.set(x, 0, -HW - 0.08); R.root.rotation.set(0, Math.PI / 2 - 0.12, 0);
      R.pose('walk', { phase: (x + 11.15) / 0.78, stride: 0.8 });
    }
    // P1–P4 hold only their dark museum glass here (no eras yet)
    for (const o of paneObjs) o.plate.visible = false;
    renderBay(tl, u, T, { scale: 0.85, hideFigs: true, lampK: 0.0 });
    return { dof: { focus: 40, fstop: 8 }, exposure: DOV.expo ?? 1.85, temp: -0.12, lift: [0.022, 0.026, 0.04], grain: 0.035 };   // (the base contrast eats a smaller lift: deep blue, never 0)
  };

  // ---- S066 (204.667–213.208): the signature dolly east through the five windows of the eras; 04:30, moon SW ~42°
  // Integration rebuild (director): the film's spectacle. 35 mm at 1.15 m on the centre line, one-point perspective down the
  // corridor; one continuous move (1.43 m/s, ease-out from 211.92, rest 212.79): the moon pools pass out under the lens on
  // the beats 205.54 / 208.38 / 211.23; each pane surfaces as we approach, swells on its line (light pouring out of it onto
  // the boards, walls and ceiling), settles after; the bay is the warm point at the vanishing point from frame 0 and the
  // destination at rest. Tilt 1.0° down while travelling (the boards and their pools), easing to 0.4° up as the dolly
  // settles (the S067 light match: the reading lamp lands on the stern lantern's screen point).
  const TILT66 = [-1.0, 0.4];
  let DOV = {};                                   // debug overrides (shot.dbg.s66 = { x, mm, eye, shaft, nopanes … }), {} in the film
  const camAt66 = (c3, tl) => {
    const x = DOV.x ?? x66(tl), k = smoothstep(S66.te - 0.4, S66.tr, tl), tilt = (DOV.tilt ?? lerp(TILT66[0], TILT66[1], k)) * D2R;
    cam.lens(c3, DOV.mm ?? S66.mm); c3.near = 0.05; c3.far = 6000;
    const ey = DOV.eye ?? EYE66;
    cam.place(c3, [x, ey, 0], [x + 10, ey + 10 * Math.tan(tilt), 0]);
    c3.updateMatrixWorld(true);
    return x;
  };
  // the light match: the lamp head (night_window LAMP_HEAD 3.24, 1.66, −0.98) is cheated, inside our render only, onto the
  // ray through S067's stern-lantern point (0.376, 0.381) of the rest frame, in the plane x = 3.24
  const LAMP_HEAD_NW = V(3.24, 1.66, -0.98);
  const LAMP66 = (() => {
    const c3 = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 600); camAt66(c3, 8.5); c3.updateProjectionMatrix();
    const p = V(0.376 * 2 - 1, 1 - 0.381 * 2, 0.5).unproject(c3), d = p.sub(c3.position).normalize();
    const t = (LAMP_HEAD_NW.x - c3.position.x) / d.x;
    return c3.position.clone().addScaledVector(d, t).sub(LAMP_HEAD_NW);
  })();
  const LAMP66_POS = LAMP_HEAD_NW.clone().add(LAMP66).add(V(0, -0.04, 0));
  // per-pane envelope: surfaces as the camera approaches (rise → peak), swells on its line, settles after
  const env66 = (o, tl) => {
    const P = o.P;
    const up = smoothstep(P.rise, P.peak - 0.15, tl);
    const swell = Math.exp(-Math.pow((tl - P.peak) / 0.5, 2));
    const settle = smoothstep(P.peak + 0.5, P.peak + 1.7, tl);
    const far = smoothstep(10.5, 5.5, camera.position.distanceTo(o.gC));          // far panes stay faint glows (frame 0 is not cluttered)
    return clamp((0.28 + 0.62 * up + 0.3 * swell - 0.3 * settle) * (0.35 + 0.65 * far), 0, 1.25);
  };
  const paneStrength66 = (o, tl) => env66(o, tl);
  // the era light that falls out of each pane (linear rgb at env = 1)
  const SP66 = [
    { k: hex('#5a8ee8').multiplyScalar(7.0), warm: hex('#ffb070').multiplyScalar(1.6) },   // P1 sea blue + the swinging lantern
    { k: hex('#ffb070').multiplyScalar(4.5), warm: hex('#ffa050').multiplyScalar(1.4) },   // P2 candle amber (+ cold rain sparkle)
    { k: hex('#ffc888').multiplyScalar(4.5), warm: null },                                 // P3 2400 K bulb pools
    { k: hex('#fff4ec').multiplyScalar(5.0), warm: null },                                 // P4 stained-glass petals
  ];
  // P4's petal projector: a point high behind the panel throwing the leaded glass onto the boards and the wall
  {
    const o = paneObjs[3], S4 = o.gC.clone().addScaledVector(o.n, -1.6).add(V(0, 1.1, 0));
    const pc = new THREE.PerspectiveCamera(2 * Math.atan(o.ph * 0.42 / S4.distanceTo(o.gC)) / D2R, o.pw / o.ph * 1.1, 0.1, 50);
    pc.position.copy(S4); pc.lookAt(o.gC); pc.updateMatrixWorld(true); pc.updateProjectionMatrix();
    // clip → [0, 1] before the divide: puv = (0.5 xc + 0.5 w) / w
    SPILL.uSpPetM.value.copy(new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 1, 0, 0, 0, 0, 1).multiply(pc.projectionMatrix).multiply(pc.matrixWorldInverse));
  }
  function spill66(tl, T) {
    SPILL.uSpT.value = T;
    paneObjs.forEach((o, i) => {
      const e = env66(o, tl), sp = SP66[i];
      let k = e;
      if (i === 1) k *= 0.86 + 0.14 * util.noise1(T * 5.0, 7) + 0.05 * Math.sin(T * 23.0);     // candle breath
      SPILL.uSpK.value[i].set(sp.k.r, sp.k.g, sp.k.b).multiplyScalar(k * (DOV.sg ?? 2.0));            // (a Color → Vector3 uniform)
      if (sp.warm) {
        const W = SPILL.uSpW.value[i];
        if (i === 0) { const sw = Math.sin(2 * Math.PI * (T - 204.0) / 7.0); W.copy(o.gC).addScaledVector(o.gU, 0.55 * sw).addScaledVector(o.gV, 0.42).addScaledVector(o.n, 0.12); }
        else W.copy(o.gC).addScaledVector(o.gU, -0.25).addScaledVector(o.gV, -0.35).addScaledVector(o.n, 0.1);
        SPILL.uSpWK.value[i].set(sp.warm.r, sp.warm.g, sp.warm.b).multiplyScalar(e * (i === 0 ? 0.8 + 0.2 * Math.abs(Math.sin(2 * Math.PI * (T - 204.0) / 7.0)) : k));
      }
    });
  }
  setups.S066 = (tl, u, T) => {
    hideFigure();
    setMoon(235, 36, DOV.moon ?? 9.0, V(-19, 0, -HW), V(1, CEIL, HW + WALL_T));
    hemi.intensity = DOV.hemi ?? 4.0; hemi.color.set('#22324e'); hemi.groundColor.set('#3a4a68'); bayLamp.intensity = DOV.bay ?? 5.0; bayLamp.distance = 16;   // the pools' silver bounce: walls deep blue, never black
    nicheUpdate(T, DOV.niche ?? 2.0, 0.95, 0.14, 2.6, 0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    setLightbox(0.05);                                 // the lightbox dims: the chapel's own colour takes over in P4
    const x = camAt66(camera, tl);
    if (DOV.hideVit) for (const o of paneObjs) o.grp.visible = false;
    setShafts(235, 36, DOV.shaft ?? 0.036, T, [-22, 0]);
    bounce.intensity = 0;
    floorRefl.material.uniforms.uStr.value = 2.6; floorRefl.material.uniforms.uBlur.value = 0.006;   // the waxed boards double every light
    paneObjs[3].U.uPet.value = 1.0; paneObjs[3].U.tPet.value = panelTex;
    if (!DOV.nopanes) updatePanes(tl, u, T, paneStrength66, { gain: DOV.pg ?? 1.8 }); else for (const o of paneObjs) o.plate.visible = false;
    if (!DOV.nopanes) spill66(tl, T);
    // the bay through the end screen: the warm point at the vanishing point from frame 0, the destination at rest; the
    // reading lamp is cheated onto the S067 stern lantern's screen point (see NW.lamp)
    portalMat.uniforms.uGain.value = lerp(0.85, 1.0, smoothstep(5.0, 7.6, tl));
    bayLamp.position.copy(LAMP66_POS);
    renderBay(tl, u, T, { scale: lerp(0.7, 1.0, smoothstep(5.0, 7.4, tl)), lampShift: LAMP66 });
    const kr = smoothstep(5.8, 7.2, tl); screenRefl.visible = kr > 0.01 && !(DOV.off || []).includes('norefl'); screenRefl.material.uniforms.uStr.value = 0.10 * kr;
    // focus: each pane's mirror depth (camera → glass + reflected depth) in turn, finally the two backs in the bay
    const fp = (i) => { const o = paneObjs[i]; return dist(o.gC) + o.P.depth; };
    const backs = 3.23 - x;
    const w = [smoothstep(-1, 0.4, tl) * (1 - smoothstep(1.3, 2.0, tl)), smoothstep(1.3, 2.0, tl) * (1 - smoothstep(3.1, 3.6, tl)), smoothstep(3.1, 3.6, tl) * (1 - smoothstep(4.6, 5.1, tl)), smoothstep(4.6, 5.1, tl) * (1 - smoothstep(6.1, 6.9, tl))];
    const wb = smoothstep(6.1, 6.9, tl);
    let f = 0, ws = 0; for (let i = 0; i < 4; i++) { f += w[i] * fp(i); ws += w[i]; }
    f += wb * backs; ws += wb;
    return { dof: { focus: f / Math.max(ws, 1e-3), fstop: 2.8 }, exposure: DOV.expo ?? 1.35, temp: -0.08, aa: DOV.aa ?? 'fxaa', grain: 0.035,
      bloom: { strength: 0.5, radius: 0.65, threshold: 0.7 }, lift: [0.012, 0.015, 0.024] };
  };

  // ---- S061 (190.958–195.0): CU 100 mm at P4 — her face in the clear diamond, the rack past the vitrine edge to the bay,
  // the gloves come off. Staging is solved from the mirror geometry (see corridor.md): camera west of the diamond looking
  // east, she stands north of it (out of frame left), the bay 8.8° left of the diamond.
  // Review restage: camera 1.6 m from the diamond (was 1.2 — the hands filled the frame and her right sleeve crossed the
  // lens), she stands 0.55 m from the panel (was 0.42), the lens at the diamond's height (her eyes reflect in it at 1.45 m:
  // a 9 cm bow), and the old hand-blown quarry is slightly convex (the mirror view minified ×1.55) so her eyes, brows and
  // nose sit inside the 6 × 9 cm diamond instead of a giant nose and mouth.
  const S61 = (() => {
    P4.grp.updateMatrixWorld(true);
    const D = diamondWorld();
    const Bay = V(3.23, 1.12, 0.31);
    const c = 2.0, f = 0.6;
    let dir = V(1, 0, 0);
    let Cc = D.clone().addScaledVector(dir, -c);
    for (let i = 0; i < 8; i++) {
      const toB = Bay.clone().sub(Cc); toB.y = 0; toB.normalize();
      const ang = Math.atan2(toB.z, toB.x) + 8.8 * D2R;          // the diamond 8.8° to the right (south) of the bay
      dir = V(Math.cos(ang), 0, Math.sin(ang));
      Cc = D.clone().addScaledVector(dir, -c);
    }
    // (integration: the QA's "lens 8 cm lower" does not raise his back — the frame is anchored on the diamond, 2 m away, so a
    // lower lens re-pitches up and the far back drops; kept at the diamond's height. His back rides higher through a deeper
    // settle instead, and the hands work lower — see TILT61 / A61)
    const LOW61 = 0.0, Cpos = Cc.clone().setY(D.y - LOW61), d3 = D.clone().sub(Cpos).normalize();
    const r = d3.clone().sub(P4N.clone().multiplyScalar(2 * d3.dot(P4N)));     // reflected ray from the diamond back into the corridor
    const Fe = D.clone().addScaledVector(r, f);                                  // her eyes
    return { D, Bay, dir, r, Cpos, Fe, c, f, convex: 2.0, low: LOW61 };   // (with the ×1.3 quarry her whole head — its silhouette — fits)
  })();
  const TILT61 = 4.2 * D2R;                       // the operator settles 3.4° down onto her hands with the second rack
  function place61(c3, tilt) {
    cam.lens(c3, 100); c3.near = 0.03; c3.far = 600;
    const hf = Math.atan(18 / 100), vf = Math.atan(18 / 100 / c3.aspect);
    cam.place(c3, S61.Cpos, S61.D);
    c3.rotateY(Math.atan((0.70 - 0.5) * 2 * Math.tan(hf)));              // the diamond at x 0.70
    c3.rotateX(-Math.atan((0.5 - 0.45) * 2 * Math.tan(vf)) - tilt);       // … and y 0.45 before the settle
    c3.updateMatrixWorld(true);
  }
  // the hands' working places are fixed in the world, measured once through the camera at its settled framing
  const A61 = (() => {
    const c3 = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 600); place61(c3, TILT61); c3.updateProjectionMatrix();
    const at = (sx, sy, d) => { const p = V(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(c3); return c3.position.clone().add(p.sub(c3.position).normalize().multiplyScalar(d)); };
    const right = V(1, 0, 0).applyQuaternion(c3.quaternion).setY(0).normalize(), fwd = V(0, 0, -1).applyQuaternion(c3.quaternion).setY(0).normalize(), up = V(0, 1, 0);
    const nz = (...a) => { const v = V(0, 0, 0); for (let i = 0; i < a.length; i += 2) v.addScaledVector(a[i], a[i + 1]); return v.normalize(); };
    // her frame (facing the diamond from her eyes), the vitrine's front-pane axis (SSW, parallel to the glass)
    const Fb = S61.D.clone().sub(S61.Fe).setY(0).normalize(), Lb = V(Fb.z, 0, -Fb.x), Rb = Lb.clone().negate();
    const along = V(P4N.z, 0, -P4N.x).normalize(); if (along.z < 0) along.negate();
    // integration: the hands work low in the settled frame (≈ x 0.25–0.45, y 0.72–0.95: under his silhouette, never over
    // it), horizontal — fingers toward the panel (screen right), palms down, so we see the backs of the hands (and the scar)
    // and no open palm is ever raised to the lens (it read as waving)
    const H = S61.Fe.clone().addScaledVector(Fb, 0.27).addScaledVector(Rb, 0.04).setY(1.215);   // integration: 6 cm lower: the hands work under his silhouette   // integration: 5 cm lower — the hands work under his silhouette
    const toCam = S61.Cpos.clone().sub(H).setY(0).normalize();
    const fR = nz(along, 0.9, up, 0.12, toCam, 0.12);
    const K = {
      H, Fb, Lb, Rb, along, toCam,
      fR, palmDn: nz(up, -0.8, toCam, -0.45, Lb, 0.15),
      WR0: H.clone().addScaledVector(fR, -0.07),
      // the pinching left hand comes from her side, behind the right hand, fingers forward too, palm toward the lens side
      fP: nz(along, 0.85, up, 0.2, toCam, -0.2), palmP: nz(toCam, 0.7, up, -0.45, along, -0.2),
      // the right hand takes the left glove's fingertip from the near side, palm away from the lens
      fP2: nz(along, 0.85, up, 0.2, toCam, 0.2), palmP2: nz(toCam, -0.7, up, -0.45, along, -0.2),
      // the left hand offered for the second glove: the same place, a little further from the lens
      WL1: H.clone().addScaledVector(fR, -0.07).addScaledVector(Lb, 0.04).addScaledVector(Fb, 0.02),
      // the fold and the grip: right palm up (radial side, scar, toward the lens), low
      WRf: H.clone().addScaledVector(fR, -0.07).addScaledVector(up, -0.015), fRf: nz(along, 0.9, up, 0.15, toCam, 0.1), palmUp: nz(up, 0.85, toCam, 0.3, along, -0.2),
      WRg: H.clone().addScaledVector(fR, -0.06).addScaledVector(up, -0.02), fRg: nz(along, 0.85, up, 0.22, toCam, 0.12), palmG: nz(up, 0.6, toCam, 0.6, along, -0.3),
    };
    return { at, right, fwd, up, K };
  })();
  // place a hand so that its pinch / grip / palm socket (or a fingertip) lands on a world target
  const _t61 = new THREE.Vector3();
  function handTo(h, target, fingers, palm, pt = 'pinch') {
    h.placeWrist(target, fingers, palm); h.root.updateMatrixWorld(true);
    const p = ['pinch', 'grip', 'palm', 'cup', 'pen'].includes(pt) ? h.sockets[pt].getWorldPosition(_t61) : h.tip(pt, _t61, false);
    h.root.position.add(target.clone().sub(p)); h.root.updateMatrixWorld(true);
  }
  // a glove shell hanging limp from a point by its middle fingertip; k blends from `alignDir` (still on the fingers) to hanging
  function hangShell(sh, tipWorld, k = 1, alignDir = null, sway = 0) {
    const { right, up, fwd } = A61;
    const hang = up.clone().multiplyScalar(-1).addScaledVector(right, 0.18 + 0.08 * sway).addScaledVector(fwd, 0.06).normalize();
    const dirF = alignDir ? nlerp(alignDir, hang.clone().negate(), ease.inOutSine(k)) : hang.clone().negate();   // finger direction
    sh.setChannels(blendCh(handPose('relaxed', { curl: 0.45 }, sh.dims), handPose('relaxed', { curl: 0.85 }, sh.dims), k));   // limp (no carried state)
    const palm = right.clone().multiplyScalar(-1).addScaledVector(fwd, 0.3).addScaledVector(dirF, -right.clone().multiplyScalar(-1).dot(dirF)).normalize();
    handTo(sh, tipWorld, dirF, palm, 'middle');
  }
  // integration: the glove choreography runs on its own clock, warped onto the shot list's sync points — right glove from
  // 192.7 (tl 1.74: three fingertip tugs, then the cuff stretched and drawn off by 193.6), left glove 193.9–194.4 (2.94–3.40),
  // folded 194.6 (3.64), gripped + turn 194.97 (4.01). [new tl, choreography clock]
  const WARP61 = [[0, 0.25], [1.40, 1.65], [1.74, 1.98], [2.06, 2.28], [2.20, 2.42], [2.64, 2.86], [2.66, 2.88], [2.92, 3.04], [3.40, 3.32], [3.46, 3.36], [3.64, 3.64], [4.2, 4.2]];
  const warp61 = (t) => { for (let i = 1; i < WARP61.length; i++) { const [a0, b0] = WARP61[i - 1], [a1, b1] = WARP61[i]; if (t <= a1) return b0 + (b1 - b0) * clamp((t - a0) / (a1 - a0)); } return t; };
  const chOnly = (c) => Object.fromEntries(Object.entries(c || {}).filter(([k, v]) => Array.isArray(v) || k === '_radius'));
  const blendCh = (a, b, t) => blendHandChannels(chOnly(a), chOnly(b), t);
  const lerpV = (a, b, t) => a.clone().lerp(b, t);
  const nlerp = (a, b, t) => a.clone().lerp(b, t).normalize();
  const _q = new THREE.Quaternion();
  setups.S061 = (tl, u, T) => {
    // 04:00 moon SW ~45° (az 215 keeps her head and hands inside the x = −2 window's light, from behind right of the lens)
    setMoon(215, 40, 1.8, V(-6, 0, -HW), V(1, CEIL, HW + WALL_T));      // (at 45° the 0.5 m window reveal shades her face)
    setLightbox(0.16);
    hemi.intensity = 0.3; bayLamp.intensity = 1.5;
    bounce.position.set(-0.7, 0.08, 1.2); bounce.color.set('#8a9cc0'); bounce.distance = 4; bounce.intensity = 0.25;  // the moon pool at her feet, bouncing up (low: her face stays a silhouette)
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    for (const o of paneObjs) o.plate.visible = false;
    folded.visible = false; bundle.visible = false; bundle.userData.flop.visible = false;
    const { D } = S61;
    floorRefl.visible = false;                                       // no floor in a level 100 mm frame
    const eyeY = S61.Fe.y;                                           // her eyes on the reflected ray (just above the diamond)
    const settle = ease.inOutSine(clamp((tl - 1.78) / 0.75));        // the settle starts as her hands rise (tugs in frame)
    place61(camera, TILT61 * settle);
    const { right, fwd, up, K } = A61;
    // ---- her body: standing N of the diamond, bent toward the glass, straightening as she looks up, bowing to her hands
    R.root.visible = true; R.setGloves(true);
    for (const h of Object.values(R.hands)) h.root.visible = false;        // close-up hands replace the figure's
    // (her head bows to her hands through lookAt; the spine stays nearly upright so her face never enters the frame)
    const lean = 1 - 0.18 * ease.inOutSine(clamp((tl - 0.92) / 0.5)) - 0.55 * ease.inOutSine(clamp((tl - 1.5) / 0.5));
    const turn = 0.16 * smoothstep(3.95, 4.04, tl) + 0.06 * smoothstep(3.7, 4.04, tl);
    const fwdB = D.clone().sub(S61.Fe).setY(0).normalize();
    const poseBody = (ln) => {
      R.pose('stand', { weight: 0.2 });
      R.pose({ 'spine.x': 0.1 * ln, 'chest.x': 0.07 * ln, 'neck.x': 0.06 * ln, 'chest.y': -turn, 'spine.y': -turn * 0.5 }, { add: true });
    };
    R.root.rotation.set(0, Math.atan2(fwdB.x, fwdB.z), 0);
    if (!S61.rootOff) {        // root so that (bent, looking at the glass) her eyes sit at S61.Fe / eyeY
      R.root.position.set(0, 0, 0);
      for (let k = 0; k < 4; k++) {
        poseBody(1); R.root.updateMatrixWorld(true); R.lookAt(D, 1);
        const e = R.eye(V(0, 0, 0));
        R.root.position.add(V(S61.Fe.x - e.x, eyeY - e.y, S61.Fe.z - e.z)); R.root.updateMatrixWorld(true);
      }
      S61.rootOff = R.root.position.clone();
    }
    // after the reflection beat she steps in a little toward her hands (half a step forward-right), so her elbows bend
    const kStep = 0;                                                  // (integration: no step in — her head stayed out of frame)
    R.root.position.copy(S61.rootOff).addScaledVector(K.Fb, 0.05 * kStep); poseBody(lean); R.root.updateMatrixWorld(true);
    // ---- the hands (world anchors measured through the settled frame; see A61). Timeline: 1.70 the gloved hands rise ·
    // 1.88 / 2.07 / 2.26 the left fingers tug the right glove's index, middle, ring tips · 2.42–2.86 the left hand draws the
    // right glove off (forward = screen right) · 2.88–3.04 the hands trade places, the dangling right glove handed to the
    // right palm · 3.04–3.32 the right thumb and index hold the left glove's tip while the left hand pulls out of it · 3.34
    // folded together across the right palm, the left hand presses them · 3.64–4.01 the right fist closes round them
    const tg = warp61(tl);                                            // the choreography's clock (see WARP61)
    const kRise = ease.outCubic(clamp((tg - 1.70) / 0.42));
    const low = (p) => p.clone().addScaledVector(up, -0.34 * (1 - kRise)).addScaledVector(right, -0.06 * (1 - kRise)).addScaledVector(fwd, -0.06 * (1 - kRise));
    const TUG = [1.98, 2.13, 2.28];
    let slideR = 0; for (const a of TUG) slideR += 0.008 * ease.inOutSine(clamp((tg - a) / 0.12));
    const drawR = ease.inOutSine(clamp((tg - 2.42) / 0.44));
    slideR += 0.15 * drawR;                                            // 0 → 0.174 (the glove leaves the fingertips ≈ 2.80)
    const backR = 0.065 * drawR;                                       // the right hand draws back as the left pulls (hands part)
    const relL = 0.17 * ease.inOutSine(clamp((tg - 3.04) / 0.28));      // the left glove's slide off the left hand
    const kSwap = ease.inOutSine(clamp((tg - 2.88) / 0.16));
    const kFold = ease.inOutSine(clamp((tg - 3.34) / 0.22)), kGrip = ease.inOutSine(clamp((tg - 3.64) / 0.37));
    const bend = (h, s) => { const st = Math.min(s, 0.035); h.root.scale.set(1, 1 + st / 0.17, 1); h.root.updateMatrixWorld(true); return s - st * 0.5; };
    // a loosened glove slipping off: the shell swells a little (cloth lifting off the knuckles) so the hand never pokes through
    const puff = (h, s) => { const k = 1 + 0.11 * smoothstep(0.02, 0.06, s) * (1 - smoothstep(0.15, 0.175, s)); h.root.scale.x *= k; h.root.scale.z *= k; h.root.updateMatrixWorld(true); };
    for (const h of [shellR, shellL]) h.root.scale.set(1, 1, 1);
    const restL = low(K.H.clone().addScaledVector(K.Lb, 0.13).addScaledVector(up, 0.02));
    const OFF_F = 0.175;                                               // wrist → middle fingertip
    if (tg < 2.88) {
      // ---- phase 1: the right glove. right hand offered (gloved), the left pinch rides on the fingertip being worked
      const wR = low(K.WR0).addScaledVector(K.fR, -backR);
      bareR.pose(['flat', { spread: 0.08 }]); bareR.placeWrist(wR, K.fR, K.palmDn);
      shellR.setChannels(slideR < 0.06 ? chOnly(bareR.channels) : blendCh(bareR.channels, handPose('relaxed', { curl: 0.6 }, shellR.dims), clamp((slideR - 0.06) / 0.08)));
      if (slideR < 0.035) { const sh = bend(shellR, slideR); shellR.placeWrist(wR.clone().addScaledVector(K.fR, sh), K.fR, K.palmDn); }
      else shellR.placeWrist(wR.clone().addScaledVector(K.fR, slideR - 0.0175), K.fR, K.palmDn);
      puff(shellR, slideR);
      shellR.root.updateMatrixWorld(true);
      const which = tg < 2.07 ? 'index' : tg < 2.22 ? 'middle' : tg < 2.37 ? 'ring' : 'middle';
      const tip = shellR.tip(which, V(0, 0, 0), false).addScaledVector(K.fR, -0.006).addScaledVector(up, 0.006);
      const engage = smoothstep(1.80, 1.92, tg);
      bareL.pose(engage > 0.4 ? ['pinch', {}] : ['relaxed', { curl: 0.5 }]);
      handTo(bareL, tip, K.fP, K.palmP, 'pinch');
      const wPinch = bareL.root.position.clone();
      bareL.placeWrist(lerpV(restL, wPinch, engage), nlerp(K.fR, K.fP, engage), nlerp(K.palmDn, K.palmP, engage));
      // off the fingertips (slide > 0.16): the glove drops to hang from the left pinch
      const kh = smoothstep(2.78, 2.88, tg);
      if (kh > 0) { bareL.root.updateMatrixWorld(true); hangShell(shellR, bareL.sockets.pinch.getWorldPosition(V(0, 0, 0)), kh, K.fR); }
      bareR.root.visible = slideR > 0.03; bareL.root.visible = false;
      shellR.root.visible = true; shellL.root.visible = true;
      bareL.root.updateMatrixWorld(true); shellL.setChannels(chOnly(bareL.channels));
      shellL.root.position.copy(bareL.root.position); shellL.root.quaternion.copy(bareL.root.quaternion); shellL.root.updateMatrixWorld(true);
    } else {
      // ---- phase 2: the left glove. the left hand offers its fingers where the right one was, then pulls out of the glove
      // where the left hand was at the end of phase 1 (its pinch on the right glove's middle tip, fully drawn)
      const tipEnd = K.WR0.clone().addScaledVector(K.fR, 0.174 - 0.0175 + OFF_F - 0.065).addScaledVector(K.fR, -0.006).addScaledVector(up, 0.006);
      bareL.pose(['pinch', {}]); handTo(bareL, tipEnd, K.fP, K.palmP, 'pinch');
      const wL0 = bareL.root.position.clone();
      const wL1 = K.WL1.clone().addScaledVector(K.fR, -0.45 * relL);
      let wLx = lerpV(wL0, wL1, kSwap), fL = nlerp(K.fP, K.fR, kSwap), pL = nlerp(K.palmP, K.palmDn, kSwap);
      const poseL = blendCh(handPose('pinch', {}, bareL.dims), handPose('flat', { spread: 0.06 }, bareL.dims), kSwap);
      // the fold: the bare left hand presses the folded pair onto the right palm, then drops away
      const kp = smoothstep(3.34, 3.5, tg), kAway = smoothstep(3.80, 4.02, tg);
      bareL.pose(poseL); bareL.placeWrist(wLx, fL, pL); bareL.root.updateMatrixWorld(true);
      // left glove shell: on the hand, stretched, slid off along the fingers, then hanging from the right pinch
      shellL.setChannels(relL < 0.06 ? chOnly(bareL.channels) : blendCh(bareL.channels, handPose('relaxed', { curl: 0.6 }, shellL.dims), clamp((relL - 0.06) / 0.08)));
      if (relL < 0.035) { const sh = bend(shellL, relL); shellL.placeWrist(wLx.clone().addScaledVector(fL, sh), fL, pL); }
      else shellL.placeWrist(wLx.clone().addScaledVector(fL, relL - 0.0175), fL, pL);
      puff(shellL, relL);
      shellL.root.updateMatrixWorld(true);
      // right hand: from its offered place over to the left glove's fingertip (pinch from above), then palm up, then the fist
      const tipL = shellL.tip('middle', V(0, 0, 0), false).addScaledVector(K.fR, -0.006).addScaledVector(up, 0.006);
      bareR.pose(['pinch', {}]); handTo(bareR, tipL, K.fP2, K.palmP2, 'pinch');
      const wPin = bareR.root.position.clone();
      let wR = lerpV(K.WR0.clone().addScaledVector(K.fR, -0.065), wPin, kSwap), fR = nlerp(K.fR, K.fP2, kSwap), pR = nlerp(K.palmDn, K.palmP2, kSwap), poseR = blendCh(handPose('flat', { spread: 0.08 }, bareR.dims), handPose('pinch', {}, bareR.dims), kSwap);
      if (tg >= 3.34) {
        wR = lerpV(lerpV(wPin, K.WRf, kFold), K.WRg, kGrip);
        fR = nlerp(nlerp(K.fP2, K.fRf, kFold), K.fRg, kGrip); pR = nlerp(nlerp(K.palmP2, K.palmUp, kFold), K.palmG, kGrip);
        poseR = blendCh(blendCh(handPose('pinch', {}, bareR.dims), handPose('cupped', {}, bareR.dims), kFold), handPose('grip', { radius: 0.016 }, bareR.dims), kGrip);
      }
      bareR.pose(poseR); bareR.placeWrist(wR, fR, pR); bareR.root.updateMatrixWorld(true);
      if (relL >= 0.16) hangShell(shellL, bareR.sockets.pinch.getWorldPosition(V(0, 0, 0)), smoothstep(3.26, 3.33, tg), K.fR);
      // the right glove: handed over from the left pinch to the right palm, hanging there until the fold
      const gs = bareR.sockets.grip.getWorldPosition(V(0, 0, 0)).addScaledVector(up, -0.012);
      bareL.root.updateMatrixWorld(true);
      hangShell(shellR, bareL.sockets.pinch.getWorldPosition(V(0, 0, 0)).lerp(gs, kSwap), 1, null, 1 - kSwap);
      if (tg >= 3.34) {
        bareR.root.updateMatrixWorld(true);
        const ps = bareR.sockets.palm.getWorldPosition(V(0, 0, 0));
        const press = ps.clone().addScaledVector(up, 0.03).addScaledVector(K.fR, -0.075).addScaledVector(fwd, 0.02);
        wLx = lerpV(lerpV(wLx, press, kp), K.H.clone().addScaledVector(K.Lb, 0.16).addScaledVector(up, -0.36), kAway);
        bareL.pose(['flat', { spread: 0.02 }]); bareL.placeWrist(wLx, K.fR, nlerp(K.palmDn, up.clone().negate(), kp)); bareL.root.updateMatrixWorld(true);
      }
      bareR.root.visible = true; bareL.root.visible = relL > 0.03;
      shellR.root.visible = tg < 3.36; shellL.root.visible = tg < 3.36;
    }
    if (kRise <= 0) { bareR.root.visible = bareL.root.visible = shellR.root.visible = shellL.root.visible = false; }
    // the folded pair across the right palm (3.36–3.72), then a soft bundle in the fist
    if (tg >= 3.36) {
      bareR.root.updateMatrixWorld(true);
      const flat = tg < 3.72;
      folded.visible = flat; bundle.visible = !flat;
      if (flat) {
        const ps = bareR.sockets.palm; ps.updateWorldMatrix(true, false);
        folded.position.copy(ps.getWorldPosition(V(0, 0, 0))); folded.quaternion.copy(ps.getWorldQuaternion(_q)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.25)));
        folded.translateZ(0.004 + 0.01 * (1 - kFold)); folded.scale.setScalar(0.92 + 0.08 * kFold); folded.updateMatrixWorld(true);
      } else {
        const gs = bareR.sockets.grip; gs.updateWorldMatrix(true, false);
        bundle.position.copy(gs.getWorldPosition(V(0, 0, 0))); bundle.quaternion.copy(gs.getWorldQuaternion(_q)); bundle.updateMatrixWorld(true);
        // the empty fingers hang out of the little-finger side of the fist (local −Y of the grip socket), swinging a little
        const fl = bundle.userData.flop; fl.visible = true;
        fl.position.copy(V(0, -0.028, 0.004).applyMatrix4(bundle.matrixWorld));
        fl.rotation.set(0.12 * Math.sin(T * 2.1), Math.atan2(K.along.x, K.along.z), 0.1 + 0.08 * Math.sin(T * 1.7 + 1)); fl.updateMatrixWorld(true);
      }
    }
    // the coat-sleeve stubs follow the close-up wrists out of the frame's lower left (see `sleeves`)
    [bareR, bareL].forEach((h, i) => {
      h.root.updateMatrixWorld(true);
      sleeves[i].position.copy(h.root.position); sleeves[i].quaternion.copy(h.root.quaternion); sleeves[i].visible = kRise > 0;
    });
    // eyes: the glass → the bay (0.92) → her hands (1.85)
    const wBay = smoothstep(0.92, 1.35, tl) * (1 - smoothstep(1.85, 2.2, tl)), wH = smoothstep(1.85, 2.2, tl);
    // she studies the panel a little to the right of the diamond (her face three-quarter in the reflection, not frontal)
    const study = D.clone().lerp(panelG.getWorldPosition(V(0, 0, 0)), 1.5).add(V(0, -0.34, 0));   // (integration: she studies it a little lower, so the lift of her eyes on 还 reads)
    const gaze = study.lerp(V(3.0, 1.58, 0.25), wBay).lerp(K.WR0.clone().addScaledVector(K.fR, 0.12), wH);
    R.lookAt(gaze, 1 - 0.45 * wH); R.breathe(T, 0.8);
    // the panel's faint coloured glow on her (the lightbox is very dim): a soft fill on the cheek, not a key
    { const e = R.eye(V(0, 0, 0)); panelGlow.target.position.copy(panelG.worldToLocal(e.clone().add(V(0, -0.25, 0)))); panelGlow.target.updateMatrixWorld(); panelGlow.intensity = 0.07; panelGlow.color.set('#c99a8a');
      rim61.position.copy(e).addScaledVector(K.Fb, -0.7).add(V(0, 0.3, 0)).addScaledVector(K.Rb, 0.42); rim61.target.position.copy(e).add(V(0, -0.05, 0)); rim61.target.updateMatrixWorld(); rim61.intensity = 9.0; }
    // mirror render for the diamond, the bay through the screen
    renderMirror();
    // (perf) the bay is sharp only while the focus holds on it (≈1.4–2.2 s); defocused it renders at 0.6 resolution
    if (!mirror.dbgHold) renderBay(tl, u, T, { scale: lerp(0.6, 1.0, smoothstep(1.1, 1.5, tl) * (1 - smoothstep(2.15, 2.5, tl))) });
    const backs = V(3.23, 1.1, 0.31);
    bareR.root.updateMatrixWorld(true);
    const handsAt = K.WR0.clone().addScaledVector(K.fR, 0.08);
    const fMirror = S61.c + S61.f, fBay = dist(backs), fHands = dist(handsAt);
    const fc = tl < 1.24 ? fMirror : tl < 1.9 ? lerp(fMirror, fBay, ease.inOutSine((tl - 1.24) / 0.66)) : tl < 2.1 ? fBay : lerp(fBay, fHands, ease.inOutSine(clamp((tl - 2.1) / 0.5)));
    diamondMat.uniforms.uDepth.value = fMirror; diamondMat.uniforms.uStr.value = 0.42;
    // the diamond writes the mirror depth (2.6 m) for the DOF, which lies behind the vitrine's velvet back: in this shot it
    // is drawn after the opaque set and always passes the depth test (nothing passes in front of it here)
    diamond.renderOrder = 60; diamondMat.depthFunc = THREE.AlwaysDepth;
    return { dof: { focus: fc, fstop: 2.8 }, exposure: 1.32, temp: -0.1, grain: 0.035 };
  };

  // mirror render: our scene from the camera mirrored in P4's panel plane, into the diamond's screen box only
  function renderMirror() {
    diamondMat.uniforms.uOk.value = 0;
    camera.updateMatrixWorld(true);
    panel.updateWorldMatrix(true, false);
    const pn = P4N.clone(), pp = diamondWorld();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(pn, pp);
    // screen box of the diamond
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (const lp of [V(0, DIAM.h / 2, 0), V(-DIAM.w / 2, 0, 0), V(0, -DIAM.h / 2, 0), V(DIAM.w / 2, 0, 0)]) {
      const p = lp.applyMatrix4(diamond.matrixWorld).project(camera);
      x0 = Math.min(x0, p.x * 0.5 + 0.5); x1 = Math.max(x1, p.x * 0.5 + 0.5); y0 = Math.min(y0, p.y * 0.5 + 0.5); y1 = Math.max(y1, p.y * 0.5 + 0.5);
    }
    x0 = clamp(x0 - 0.01); x1 = clamp(x1 + 0.01); y0 = clamp(y0 - 0.01); y1 = clamp(y1 + 0.01);
    if (x1 <= x0 || y1 <= y0) return;
    const FW = ctx.W, FH = ctx.H, px0 = Math.floor(x0 * FW), px1 = Math.ceil(x1 * FW), py0 = Math.floor(y0 * FH), py1 = Math.ceil(y1 * FH);
    const vw = px1 - px0, vh = py1 - py0;
    if (!mirror.rt || mirror.rt.width !== vw || mirror.rt.height !== vh) { if (mirror.rt) mirror.rt.dispose(); mirror.rt = ctx.makeRT(vw, vh); }
    // virtual camera: reflected position, reflected look direction and up; the image is then mirrored in x (uFlipX)
    const mc = mirror.cam;
    const cp = camera.position.clone(), fw = V(0, 0, -1).applyQuaternion(camera.quaternion), upv = V(0, 1, 0).applyQuaternion(camera.quaternion);
    const refl = (v, isPoint) => isPoint ? v.clone().sub(pn.clone().multiplyScalar(2 * plane.distanceToPoint(v))) : v.clone().sub(pn.clone().multiplyScalar(2 * v.dot(pn)));
    mc.position.copy(refl(cp, true)); mc.up.copy(refl(upv, false)); mc.lookAt(mc.position.clone().add(refl(fw, false)));
    mc.fov = camera.fov; mc.aspect = camera.aspect; mc.near = camera.near; mc.far = camera.far;
    // the mirrored image of screen column X is column (FW − X): flip the view box. The old hand-blown quarry is slightly
    // convex (review): the mirror sub-frustum is S61.convex × wider about the diamond's centre, so the reflection is minified
    const kc = S61.convex || 1, cxp = (px0 + px1) / 2, cyp = (py0 + py1) / 2;
    mc.setViewOffset(FW, FH, FW - cxp - vw * kc / 2, FH - cyp - vh * kc / 2, vw * kc, vh * kc); mc.updateProjectionMatrix(); mc.updateMatrixWorld(true);
    const r = ctx.renderer, prev = r.getRenderTarget(), clip = r.clippingPlanes;
    const hidden = [diamond, panel, portal, floorRefl, screenRefl, ...paneObjs.map((o) => o.plate)];
    const vis = hidden.map((o) => o.visible); for (const o of hidden) o.visible = false;
    r.clippingPlanes = [new THREE.Plane(pn.clone(), -pn.dot(pp) + 0.002)];
    r.setRenderTarget(mirror.rt); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(scene, mc);
    // integration: her silhouette mask (her figure alone, flat white) for the quarry's moonlit-silhouette treatment
    if (!mirror.mask || mirror.mask.width !== vw || mirror.mask.height !== vh) { if (mirror.mask) mirror.mask.dispose(); mirror.mask = ctx.makeRT(vw, vh); }
    {
      const kids = scene.children.map((o) => o.visible); scene.children.forEach((o) => { o.visible = o === R.root; });
      const bg = scene.background, om = scene.overrideMaterial; scene.background = null; scene.overrideMaterial = maskMat;
      r.setRenderTarget(mirror.mask); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, mc);
      scene.background = bg; scene.overrideMaterial = om; scene.children.forEach((o, i) => { o.visible = kids[i]; });
    }
    r.setRenderTarget(prev); r.clippingPlanes = clip;
    hidden.forEach((o, i) => { o.visible = vis[i]; });
    mc.clearViewOffset();
    if (OFF.has('mirrorcam')) { camera.position.copy(mc.position); camera.quaternion.copy(mc.quaternion); camera.updateMatrixWorld(true); r.clippingPlanes = [new THREE.Plane(pn.clone(), -pn.dot(pp) + 0.002)]; for (const o of hidden) o.visible = false; mirror.dbgHold = true; }
    if (OFF.has('dbgm')) { const px = new Float32Array(4); const rr = ctx.renderer; rr.readRenderTargetPixels(mirror.rt, vw >> 1, vh >> 1, 1, 1, px); console.log('MIRROR', px0, px1, py0, py1, 'cam', mc.position.toArray().map((v) => v.toFixed(2)).join(','), 'centre px', Array.from(px).map((v) => v.toFixed(4)).join(',')); }
    const U = diamondMat.uniforms; U.tRef.value = mirror.rt.texture; U.tRefD.value = mirror.mask.texture; U.uOff.value.set(px0, py0); U.uSize.value.set(vw, vh); U.uFlipX.value = 1; U.uOk.value = 1; U.uNear.value = camera.near; U.uFar.value = camera.far;
  }

  // ---- debug overviews (?shots=/previz/out/check/corridor/dbg_shots.json)
  const camMark = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020 })); camMark.visible = false; scene.add(camMark);
  setups.DBG = (tl, u, T, shot) => {
    const d = shot.dbg || {};
    if (d.run) {   // run a shot's staging, then look at it from an overview camera (red cone = the shot camera)
      const r = setups[d.run](d.tl || 0, 0, (d.T0 || 0) + (d.tl || 0), { id: d.run }) || {};
      camMark.position.copy(camera.position); camMark.quaternion.copy(camera.quaternion); camMark.visible = true;
      cam.lens(camera, d.mm || 24); camera.near = 0.02; camera.far = 600; cam.place(camera, d.pos, d.target); camera.updateMatrixWorld(true);
      return { ...r, dof: null, exposure: d.exposure || 1.6 };
    }
    hideFigure();
    setMoon(225, 42, 1.3, V(-16, 0, -HW), V(1, CEIL, HW + WALL_T)); bayLamp.intensity = 1.6; nicheUpdate(T);
    cam.lens(camera, d.mm || 24); camera.near = 0.05; camera.far = 600; cam.place(camera, d.pos || [-12, 3, 2], d.target || [-2, 1, 0]);
    if (d.panes) updatePanes(tl, u, T, () => 0.4); else for (const o of paneObjs) o.plate.visible = false;
    if (d.bay) renderBay(tl, u, T, { scale: 0.6 });
    return { dof: null, exposure: d.exposure || 1.2 };
  };
  // DBG_VIEWS: the four era views as the panes receive them (linear HDR, no post), side by side
  const viewG = new THREE.Group(); viewG.position.set(0, -60, 0); viewG.visible = false; scene.add(viewG);
  paneObjs.forEach((o, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.81, 1.0), new THREE.MeshBasicMaterial({ map: o.rt.texture })); m.position.set((i - 1.5) * 0.86, 0, 0); viewG.add(m); });
  setups.DBG_VIEWS = (tl, u, T, shot) => {
    hideFigure(); floorRefl.visible = false;
    const Tv = shot.dbg && shot.dbg.T ? shot.dbg.T : 206 + tl;
    for (const o of paneObjs) { o.plate.visible = false; ctx.renderNested(o.P.key, o.P.view, Tv - 204.667, (Tv - 204.667) / 8.54, Tv, o.rt, o.P.rt[0] / o.P.rt[1]); }
    viewG.visible = true;
    cam.lens(camera, 24); camera.near = 0.05; camera.far = 100; cam.place(camera, [0, -60, 2.1], [0, -60, 0]);
    return { dof: null, exposure: 1.0, vignette: 0, bloom: { strength: 0.1 } };
  };
  // DBG_ERA: up to four framings of ONE era view side by side (shot.dbg = { era: 'P3', T, ovs: [ov | null, …], expo })
  const dbgRTs = [0, 1, 2, 3].map(() => ctx.makeRT(480, 640));
  const eraG = new THREE.Group(); eraG.position.set(0, -80, 0); eraG.visible = false; scene.add(eraG);
  const eraM = dbgRTs.map((rt, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshBasicMaterial({ map: rt.texture })); m.position.set((i - 1.5) * 0.78, 0, 0); eraG.add(m); return m; });
  setups.DBG_ERA = (tl, u, T, shot) => {
    hideFigure(); floorRefl.visible = false;
    const d = shot.dbg, P = PANES.find((p) => p.id === d.era), Tv = d.T ?? 206;
    (d.ovs || [{}]).forEach((e, i) => {      // e = { rect?, ov?, raw? }: raw → their own camera, no rect / ov
      const P2 = { ...P, rt: [480, 640], rect: e.raw ? null : (e.rect ?? P.rect) };
      renderEra(P2, Tv - 204.667, (Tv - 204.667) / 8.54, Tv, dbgRTs[i], e.raw ? null : (e.ov ?? P.ov));
      eraM[i].material.color.setScalar(d.expo ?? 1);
    });
    for (let i = 0; i < 4; i++) eraM[i].visible = i < (d.ovs || [{}]).length;
    eraG.visible = true;
    cam.lens(camera, 24); camera.near = 0.05; camera.far = 100; cam.place(camera, [0, -80, 2.12], [0, -80, 0]);
    return { dof: null, exposure: 1.0, vignette: 0, bloom: { strength: 0.1 } };
  };
  setups.default = setups.S066;

  return {
    scene, camera,
    post: { exposure: 1.15, contrast: 1.05, saturation: 0.9, temp: -0.1, shadowTint: [0.45, 0.49, 0.58], highTint: [0.55, 0.53, 0.5], lift: [0.008, 0.01, 0.016],
      vignette: 0.34, grain: 0.035, aberration: 0.5, bloom: { strength: 0.38, radius: 0.6, threshold: 0.8 } },
    setShot(shot, tl, u, T) {
      sky.update(T); camMark.visible = false;
      viewG.visible = false; eraG.visible = false; hideFigure(); bounce.intensity = 0; mirror.dbgHold = false;   // per-frame defaults (setups are pure functions of their inputs)
      DOV = {};
      let p;
      if (shot.dbg && shot.dbg.s66) { DOV = shot.dbg.s66; const t = DOV.tl ?? 0; p = setups.S066(t, t / 8.54, 204.667 + t, shot) || {}; }
      else if (shot.dbg && shot.dbg.s27) { DOV = shot.dbg.s27; const t = DOV.tl ?? 0; p = setups.S027(t, t / 4.875, 96.917 + t, shot) || {}; }
      else { const f = setups[shot.dbg ? (shot.dbg.era ? 'DBG_ERA' : shot.dbg.views ? 'DBG_VIEWS' : 'DBG') : shot.id] || setups.default; p = f(tl, u, T, shot) || {}; }
      const off = new Set([...OFF, ...(DOV.off || [])]);
      if (off.has('nodof')) p.dof = null;
      if (off.has('nobounce')) bounce.intensity = 0;
      if (off.has('nobaylamp')) bayLamp.intensity = 0;
      portal.visible = !off.has('nobay');
      if (off.has('nospill')) { for (const v of SPILL.uSpK.value) v.set(0, 0, 0); for (const v of SPILL.uSpWK.value) v.set(0, 0, 0); }
      minorPts.P.visible = !off.has('nominor');
      if (off.has('noshaft')) for (const sh of shafts) sh.object3D.visible = false;
      if (off.has('norefl')) floorRefl.visible = false;
      if (off.has('nomoon')) moon.intensity = 0;
      if (off.has('nohemi')) hemi.intensity = 0;
      if (off.has('nopost')) Object.assign(p, { exposure: 1, bloom: { strength: 0 } });
      return p;
    },
  };
}
