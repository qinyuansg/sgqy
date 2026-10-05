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
const EYE = 1.45;                                                          // dolly lens height
// minor niches: [x, side(-1 north / +1 south), kind, seed]  (kind 0 fishing lamp · 1 stove fire · 2 lighthouse · 3 night market)
const NICHES = [
  [-41.0, -1, 2, 1], [-38.0, 1, 0, 2], [-31.0, -1, 3, 3], [-30.0, 1, 1, 4], [-25.0, -1, 0, 5], [-26.0, 1, 2, 6], [-19.0, -1, 1, 7],
  [-20.0, 1, 3, 8], [-13.0, -1, 2, 9], [-12.0, 1, 0, 10], [-8.7, -1, 3, 11], [-8.0, 1, 1, 12], [-4.4, -1, 0, 13], [-4.0, 1, 2, 14],
];
const NICHE_W = 0.6, NICHE_H = 0.9, NICHE_Y = 1.15, NICHE_D = 0.28;

// ---- S066 camera path (motion control): constant ≈1.43 m/s from x = −12.5 (204.67), ease-out from tl 7.25 (211.92), rest
// at x = −1.51 by tl 8.12 (212.79). The vitrines are placed so each pane is at its largest / clearest on its lyric line.
const S66 = { x0: -12.5, v: 1.43, te: 7.25, tr: 8.12 };
function x66(tl) {
  const t = Math.max(0, tl);
  if (t <= S66.te) return S66.x0 + S66.v * t;
  const dt = S66.tr - S66.te, s = Math.min(t - S66.te, dt);
  return S66.x0 + S66.v * S66.te + S66.v * (s - (s * s) / (2 * dt));
}
// vitrine fronts: pane centre (x, z), toe angle (deg, the front turned toward the west = toward the approaching camera)
const ALPHA = 45;
const PANES = [
  { id: 'P1', key: 'sea_deck', view: 'view_shiplamp', x: -7.3, z: -1.3, peak: 0.85, rise: 0.0, depth: 1.1, anchor: [0.0, 1.55], size: 1.8, subj: [0.3, 0.66], glow: '#c99a62', grade: 'nav', black: 0.006, rt: [416, 512] },
  { id: 'P2', key: 'old_home', view: 'view_home_rain', x: -5.1, z: 1.3, peak: 2.5, rise: 2.1, depth: 1.0, anchor: [0.0, 1.5], size: 1.75, subj: [0.42, 0.58], glow: '#e2a458', grade: 'home', black: 0.004, rt: [416, 512] },
  { id: 'P3', key: 'pier_waiting', view: 'view_pier', x: -2.9, z: -1.25, peak: 3.9, rise: 3.0, depth: 1.0, anchor: [0.0, 1.5], size: 1.75, subj: [0.5, 0.5], glow: '#e8b87a', grade: 'mig', black: 0.01, rt: [416, 512] },
  { id: 'P4', key: 'chapel', view: 'view_chapel', x: -0.75, z: 1.2, peak: 5.71, rise: 4.5, depth: 0.9, anchor: [0.0, 1.5], size: 1.7, subj: [0.62, 0.52], glow: '#c99088', grade: 'chapel', black: 0.008, rt: [416, 512] },
];
// per-era look inside the pane (bible §2.4 LUT notes, applied to the nested linear-HDR frame before compositing)
const GRADES = {
  nav: { expo: 1.25, sat: 0.92, gain: [1.0, 0.98, 1.04], green: 0.8 },        // CT_NAV: strongest warm/cool split, greens −20 %
  home: { expo: 2.2, sat: 0.95, gain: [1.04, 0.99, 0.95], green: 0.92 },     // CT_HOME: candle-warm vs lattice moon
  mig: { expo: 1.2, sat: 0.85, gain: [1.04, 1.0, 0.93], green: 0.95 },        // CT_MIG: −15 % sat, creamy highlights, no sepia
  chapel: { expo: 1.25, sat: 1.0, gain: [1.0, 0.98, 1.02], green: 0.95 },     // CT_CHAPEL: richest colour, softened 30 %
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
  const mWall = TX.mat('plaster', { tex: { tone: 'grey', seed: 33, damp: 0.25, flake: 0.35, cracks: 0.3 }, color: hex('#9c968c') });
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
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStr: { value: 0.85 }, uBlur: { value: 0.009 }, tPlank: { value: mFloor.roughnessMap || mFloor.map } },
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
    for (let x = X_W + 1; x < 0; x += 1.5) box(0.14, 0.22, 2 * HW, mBeam, x, CEIL - 0.11, 0, scene, false);
    for (const z of [-1.35, 0, 1.35]) box(-X_W, 0.16, 0.12, mBeam, X_W / 2, CEIL - 0.3, z, scene, false);
    const west = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(2 * HW, CEIL).rotateY(Math.PI / 2).translate(X_W, CEIL / 2, 0), 1.6, 1.6), mPlaster); west.receiveShadow = true; scene.add(west);
    // bulkhead over the end screen (x = 0, 3.05 → 5.2) + cornice
    const bh = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(2 * HW, CEIL - SCREEN_TOP).rotateY(-Math.PI / 2).translate(0, (CEIL + SCREEN_TOP) / 2, 0), 1.6, 1.6), mPlaster); bh.receiveShadow = true; scene.add(bh);
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
    const nicheS = NICHES.filter((n) => n[1] > 0);
    for (const [x] of nicheS) s.holes.push(rectPath(new THREE.Path(), x - NICHE_W / 2, x + NICHE_W / 2, NICHE_Y, NICHE_Y + NICHE_H));
    extrudeWall(s, HW, -1);                       // inner face at z = +2.7, outer +3.2
    // stone sills
    for (const x of WIN_X) box(WIN_W + 0.1, 0.06, WALL_T + 0.08, mSill, x, WIN_SILL - 0.03, HW + WALL_T / 2 - 0.02);
  }
  {
    const s = rectPath(new THREE.Shape(), X_W, 0, 0, CEIL);
    for (const x of DOOR_X) s.holes.push(archPath(new THREE.Path(), x, DOOR_W, 0.0005, DOOR_SPRING));
    for (const [x] of NICHES.filter((n) => n[1] < 0)) s.holes.push(rectPath(new THREE.Path(), x - NICHE_W / 2, x + NICHE_W / 2, NICHE_Y, NICHE_Y + NICHE_H));
    extrudeWall(s, -HW, 1);                       // inner face at z = −2.7, outer −3.2
    // pantry door (closed, dark timber, a warm crack of light under it)
    box(0.95, 2.15, 0.06, mTimber, PANTRY_X, 1.075, -HW + 0.02);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.012), new THREE.MeshBasicMaterial({ color: K2700.clone().multiplyScalar(1.6) }));
    crack.position.set(PANTRY_X, 0.008, -HW + 0.055); scene.add(crack);
  }
  // skirting (dark timber) along both walls
  for (const z of [-HW + 0.012, HW - 0.012]) box(-X_W, 0.16, 0.025, mTimber, X_W / 2, 0.08, z, scene, false);

  // ============================================================ windows: slim steel glazing bars (alpha-tested: they shadow the moon pools)
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

  // ============================================================ exterior through the south windows: night sky + dark harbour + lights
  const sky = createSky({ preset: 'night', moonAz: 225, moonElev: 42, stars: 0.5, cloudCover: 0.3, cloudScale: 0.09, exposure: 0.8 });
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
  }

  // ============================================================ lights
  const moon = new THREE.DirectionalLight(MOONC.clone(), 1.0);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(hex('#43577c'), hex('#1a1410'), 0.25); scene.add(hemi);
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
  const nicheMat = (kind, seed) => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uKind: { value: kind }, uSeed: { value: seed }, uK: { value: 1 }, uCol: { value: K3000.clone() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform float uT, uKind, uSeed, uK; uniform vec3 uCol;
      float g2(vec2 p, vec2 c, vec2 s){ vec2 d = (p - c) / s; return exp(-dot(d, d)); }
      float h1(float x){ return fract(sin(x * 127.1 + uSeed * 311.7) * 43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
      void main(){
        vec2 p = vUv; vec3 c = vec3(0.0);
        if (uKind < 0.5) {            // fishing lamp: a swaying warm point over dark water, its smeared reflection below
          float sw = 0.08 * sin(uT * 0.9 + uSeed) ;
          vec2 L = vec2(0.5 + sw, 0.62);
          c += uCol * 1.6 * g2(p, L, vec2(0.13, 0.11)) + uCol * 0.5 * g2(p, L, vec2(0.32, 0.26));
          c += uCol * vec3(0.9, 0.85, 0.9) * 0.35 * g2(p, vec2(L.x, 0.25 + 0.02 * sin(uT * 2.0)), vec2(0.1, 0.16));
          c += vec3(0.05, 0.08, 0.14) * 0.6 * smoothstep(0.45, 0.0, p.y);
        } else if (uKind < 1.5) {     // stove fire: low orange flicker, the glow climbing a wall
          float f = 0.75 + 0.25 * n1(uT * 7.0) + 0.1 * n1(uT * 19.0);
          c += vec3(1.0, 0.55, 0.22) * 1.7 * f * g2(p, vec2(0.48, 0.2), vec2(0.22, 0.12));
          c += vec3(1.0, 0.62, 0.3) * 0.45 * f * g2(p, vec2(0.5, 0.42), vec2(0.42, 0.4));
        } else if (uKind < 2.5) {     // lighthouse: a soft beam turning, a bright pulse when it faces the glass
          float a = uT * 0.9 + uSeed;
          float face = pow(max(0.0, cos(a)), 6.0);
          vec2 L = vec2(0.5, 0.58);
          c += uCol * vec3(1.0, 0.95, 0.9) * (0.35 + 2.4 * face) * g2(p, L, vec2(0.1, 0.1));
          c += uCol * 0.5 * (0.2 + face) * g2(p, L + vec2(0.35 * sin(a), 0.0), vec2(0.45, 0.07));
          c += vec3(0.05, 0.08, 0.14) * 0.5;
        } else {                      // night-market window: a row of warm stalls, one flickering tube
          for (int i = 0; i < 4; i++) {
            float fi = float(i); vec2 L = vec2(0.17 + 0.22 * fi, 0.45 + 0.07 * sin(fi * 2.1 + uSeed));
            vec3 cc = mix(uCol, vec3(1.0, 0.7, 0.45), h1(fi + 3.0)) * (0.8 + 0.5 * h1(fi));
            if (i == 2) cc *= 0.6 + 0.4 * step(0.3, n1(uT * 5.0));
            c += cc * 1.1 * g2(p, L, vec2(0.11, 0.16));
          }
        }
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(0.0, 0.12, 1.0 - vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.12, 1.0 - vUv.y);
        gl_FragColor = vec4(c * uK * edge, 1.0);
      }`,
  });
  const nicheMats = [];
  {
    const mIn = std({ color: hex('#14161b'), roughness: 0.9 });
    const nGlass = glassMaterial({ haze: 0.5, dust: 0.3, hazeLevel: 0.03, edge: 0, absorb: 0.06, envMapIntensity: 0.9, res: [ctx.W, ctx.H] });
    nGlass.material.envMap = ENV;
    for (const [x, side, kind, seed] of NICHES) {
      const zf = side * HW, zb = side * (HW + NICHE_D);
      const g = new THREE.Group(); scene.add(g);
      // recess box (back + sides + top + bottom)
      box(NICHE_W, NICHE_H, 0.02, mIn, x, NICHE_Y + NICHE_H / 2, zb, g, false);
      for (const sx of [-1, 1]) box(0.02, NICHE_H, NICHE_D, mIn, x + sx * NICHE_W / 2, NICHE_Y + NICHE_H / 2, (zf + zb) / 2, g, false);
      for (const yy of [NICHE_Y, NICHE_Y + NICHE_H]) box(NICHE_W, 0.02, NICHE_D, mIn, x, yy, (zf + zb) / 2, g, false);
      // the defocused glow card (deep inside), facing the corridor
      const m = nicheMat(kind, seed); nicheMats.push(m);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(NICHE_W - 0.06, NICHE_H - 0.06), m);
      card.position.set(x, NICHE_Y + NICHE_H / 2, zb - side * 0.03); card.rotation.y = side > 0 ? Math.PI : 0; g.add(card);
      // glass front, a dark frame
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(NICHE_W, NICHE_H), nGlass.material); gl.position.set(x, NICHE_Y + NICHE_H / 2, zf + side * 0.02); gl.rotation.y = side > 0 ? Math.PI : 0; gl.renderOrder = 65; g.add(gl);
      for (const yy of [NICHE_Y - 0.02, NICHE_Y + NICHE_H + 0.02]) box(NICHE_W + 0.08, 0.04, 0.04, mTimber, x, yy, zf - side * 0.01, g, false);
      // the warm spill on the wall around it (additive, no light)
      const sp = FX.glow({ color: kind === 1 ? hex('#ffa060') : K3000, size: 1.6, intensity: 0.05, falloff: 2.4 });
      sp.object3D.position.set(x, NICHE_Y + NICHE_H / 2, zf - side * 0.05); g.add(sp.object3D);
    }
  }

  // ============================================================ gallery doorways (S027: warm glow; her silhouette crosses the last one)
  const gallery = new THREE.Group(); scene.add(gallery);
  const revealMats = [];
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
      spill.rotation.x = -Math.PI / 2; spill.position.set(x + 0.3, 0.004, -HW + 0.7); gallery.add(spill);
      // a soft glow filling the opening (the bright gallery beyond)
      const gw = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_TOP), new THREE.MeshBasicMaterial({ color: hex('#5a4030').multiplyScalar(0.55) }));
      gw.position.set(x, DOOR_TOP / 2, -HW - WALL_T - 0.02); gallery.add(gw);
    }
  }

  // ============================================================ the end screen (x = 0): timber + glass; the bay is the portal behind it
  const SCR_Z = [-2.7, -1.75, -0.8, 0.8, 1.75, 2.7];
  const screenGlass = glassMaterial({ haze: 0.18, dust: 0.18, hazeLevel: 0.018, edge: 0, absorb: 0.05, envMapIntensity: 1.0, res: [ctx.W, ctx.H] });
  screenGlass.material.envMap = ENV;
  const wavyGlass = glassMaterial({ haze: 0.6, dust: 0.3, hazeLevel: 0.03, edge: 0, absorb: 0.08, envMapIntensity: 1.1, res: [ctx.W, ctx.H] });
  wavyGlass.material.envMap = ENV;
  {
    const mw = 0.075, dd = 0.08;
    for (const z of SCR_Z) box(dd, SCREEN_TOP, Math.abs(z) > 2.6 ? 0.12 : mw, mTimber, 0, SCREEN_TOP / 2, z - Math.sign(z) * (Math.abs(z) > 2.6 ? 0.06 : 0));
    for (const y of [0.04, 0.95, 2.2, SCREEN_TOP - 0.04]) box(dd, 0.08, 2 * HW, mTimber, 0, y, 0);
    // door leaves (north pair) stiles + their own mid rail
    for (const z of [-2.62, -1.8, -1.7, -0.88]) box(dd + 0.01, 2.16, 0.055, mTimber, -0.005, 1.1, z);
    // dado panels (0.08 → 0.91), raised
    const mPanel = std({ color: hex(C.screen).multiplyScalar(0.85), roughness: 0.55 });
    for (let i = 0; i < SCR_Z.length - 1; i++) { const z0 = SCR_Z[i], z1 = SCR_Z[i + 1]; box(0.03, 0.8, z1 - z0 - 0.09, mPanel, -0.02, 0.5, (z0 + z1) / 2); }
    // glass: lower clear (0.99 → 2.16), upper wavy (2.24 → 3.01)
    for (let i = 0; i < SCR_Z.length - 1; i++) {
      const z0 = SCR_Z[i], z1 = SCR_Z[i + 1];
      const lo = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 1.17), screenGlass.material); lo.position.set(-0.01, 1.575, (z0 + z1) / 2); lo.rotation.y = -Math.PI / 2; lo.renderOrder = 80; scene.add(lo);
      const up = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.77), wavyGlass.material); up.position.set(-0.01, 2.625, (z0 + z1) / 2); up.rotation.y = -Math.PI / 2; up.renderOrder = 80; scene.add(up);
    }
  }
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
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, SCREEN_TOP - 0.95), portalMat);
  portal.position.set(0.06, (SCREEN_TOP + 0.95) / 2, 0); portal.rotation.y = -Math.PI / 2; portal.renderOrder = 5; scene.add(portal);

  // ---- night_window camera override: the bay must be seen from THIS camera (transmitted, real parallax), but its module
  // only exposes view_bay_back with its own camera. We capture its camera once and, only while our renderNested call is
  // running, snap it to our pose / lens / sub-frustum on every updateMatrixWorld (their exterior pass + the final render).
  const NW = { cam: null, scene: null, hide: [], figs: [], active: false, pos: V(0, 0, 0), quat: new THREE.Quaternion(), fov: 30, aspect: ctx.aspect, view: null, near: 0.02, far: 9000 };
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
  const bayRTs = new Map();
  function bayRT(w, h) {
    const k = w + 'x' + h; if (bayRTs.has(k)) return bayRTs.get(k);
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
    const rt = ctx.makeRT(w, h, { depthTexture: dt, depthBuffer: true }); bayRTs.set(k, rt); return rt;
  }
  // render the bay through the portal's screen-space bounding box at `scale` × full resolution
  const _v = new THREE.Vector3();
  function renderBay(tl, u, T, { scale = 1, hideFigs = false } = {}) {
    portalMat.uniforms.uOk.value = 0;
    if (!NW.cam || OFF.has('nobay')) return;
    camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    // screen bbox of the portal quad
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0, anyFront = false;
    for (const [z, y] of [[-HW, 0.95], [HW, 0.95], [-HW, SCREEN_TOP], [HW, SCREEN_TOP]]) {
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
        try { return orig.call(this, s, c); } finally { hide.forEach((o, i) => { o.visible = vis[i]; }); }
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
    uniform sampler2D tEra; uniform vec3 uCam, uO, uU, uV, uN; uniform float uStr, uExpo, uSat, uGreen, uAsp, uBlack; uniform vec3 uGain;
    void main(){
      vec3 rd = normalize(vW - uCam);
      float t = dot(uO - uCam, uN) / dot(rd, uN);
      vec3 H = uCam + rd * t - uO;
      vec2 q = vec2(dot(H, uU) / dot(uU, uU), dot(H, uV) / dot(uV, uV));
      vec2 uv = q * 0.5 + 0.5;
      float inb = smoothstep(0.0, 0.14, uv.x) * smoothstep(0.0, 0.14, 1.0 - uv.x) * smoothstep(0.0, 0.16, uv.y) * smoothstep(0.0, 0.16, 1.0 - uv.y);
      inb *= mix(0.35, 1.0, smoothstep(0.78, 0.25, length((uv - vec2(0.5, 0.52)) * vec2(1.25, 1.0))));   // the other night glows from its centre
      vec3 c = max(texture2D(tEra, clamp(uv, 0.002, 0.998)).rgb - uBlack, 0.0) * uExpo;   // dark glass: only the other night's light registers
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat); c.g = mix(l, c.g, uGreen) * 0.5 + c.g * 0.5; c *= uGain;
      float e = smoothstep(0.0, 0.025, min(min(vUv.x, 1.0 - vUv.x) * uAsp, min(vUv.y, 1.0 - vUv.y))) * smoothstep(0.08, 0.32, vUv.y);
      gl_FragColor = vec4(max(c, 0.0) * uStr * inb * e, 1.0);
    }`;
  const paneObjs = [];
  const VW = 1.1, VD = 0.6, VH = 2.3, VP = 0.4;
  const velvetM = TX.mat('velvet', { color: hex('#141c2a'), sheenColor: hex('#1a2436') });
  for (const P of PANES) {
    const side = Math.sign(P.z);                 // -1 north, +1 south
    const a = ALPHA * D2R;
    const n = V(-Math.sin(a), 0, -side * Math.cos(a));          // front normal: toward the corridor axis, turned west
    const w = V(n.z, 0, -n.x).normalize();                        // along the pane: the right hand of a viewer facing the glass
    const Pc = V(P.x, 0, P.z);                                    // front-pane centre (floor level)
    const foot = Pc.clone().addScaledVector(n, -VD / 2);
    const v = vitrine({ w: VW, d: VD, h: VH, plinthH: VP, frame: 0, deck: 'velvet', light: 'none', res: [ctx.W, ctx.H], seed: 3 + paneObjs.length,
      glass: { haze: 0.28, dust: 0.22, hazeLevel: 0.02, envMapIntensity: 1.1 } });
    const grp = v.object3D; grp.position.copy(foot); grp.rotation.y = Math.atan2(n.x, n.z); scene.add(grp);
    for (const gm of Object.values(v.glass)) { gm.material.envMap = ENV; }
    grp.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity >= 2) { o.material.envMap = ENV; o.material.envMapIntensity = 3.0; } });
    v.plinth.material.color.set('#0f1115'); v.plinth.material.roughness = 0.8;
    if (v.deck.material.isMeshPhysicalMaterial) { v.deck.material.color.set('#10151f'); v.deck.material.sheen = 0.25; v.deck.material.sheenColor.set('#1a2230'); }
    // velvet-lined back wall inside (the dark behind the glass that lets the other night be seen)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(VW - 0.03, VH - 0.03), velvetM); back.position.set(0, VP + VH / 2, -VD / 2 + 0.015); back.receiveShadow = true; grp.add(back);
    // era plate just inside the front glass
    const rt = ctx.makeRT(P.rt[0], P.rt[1]);
    const U = { tEra: { value: rt.texture }, uCam: { value: V(0, 0, 0) }, uO: { value: V(0, 0, 0) }, uU: { value: V(1, 0, 0) }, uV: { value: V(0, 1, 0) }, uN: { value: n.clone() },
      uStr: { value: 0 }, uExpo: { value: GRADES[P.grade].expo }, uSat: { value: GRADES[P.grade].sat }, uGreen: { value: GRADES[P.grade].green }, uGain: { value: V(...GRADES[P.grade].gain) }, uAsp: { value: VW / VH }, uBlack: { value: P.black } };
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(VW - 0.02, VH - 0.02), new THREE.ShaderMaterial({ uniforms: U, vertexShader: paneVS, fragmentShader: paneFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    plate.position.set(0, VP + VH / 2, VD / 2 - 0.012); plate.renderOrder = 55; grp.add(plate);
    // virtual image plane: parallel to the pane, `depth` m behind it, centred on the ray from the peak camera position
    const anchor = Pc.clone().addScaledVector(w, P.anchor[0]).setY(P.anchor[1]);
    const Cpk = V(x66(P.peak), EYE, 0);
    const O0 = Pc.clone().addScaledVector(n, -P.depth).setY(0);
    const rd = anchor.clone().sub(Cpk).normalize();
    const tt = O0.clone().sub(Cpk).dot(n) / rd.dot(n);
    const O = Cpk.clone().addScaledVector(rd, tt);
    const asp = P.rt[0] / P.rt[1];
    const dpk = anchor.distanceTo(Cpk);
    const Hv = P.size * (dpk + P.depth) / dpk, Wv = Hv * asp;     // at its peak the other night fills the pane's middle, ≈ P.size tall
    // shift the image so its subject (view uv P.subj) sits on the anchor ray at the peak
    U.uU.value.copy(w).multiplyScalar(Wv / 2); U.uV.value.set(0, Hv / 2, 0);
    O.addScaledVector(U.uU.value, -(2 * P.subj[0] - 1)).addScaledVector(U.uV.value, -(2 * P.subj[1] - 1));
    U.uO.value.copy(O);
    // the pane's glow on the floor in front of it (its era's colour, rises and falls with the image)
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), color: hex(P.glow), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.rotation.x = -Math.PI / 2; gl.position.copy(Pc).addScaledVector(n, 0.55).setY(0.006); gl.rotation.z = Math.atan2(n.x, n.z); scene.add(gl);
    paneObjs.push({ P, v, grp, plate, U, rt, n, w, Pc, side, box: new THREE.Box3(), floorGlow: gl });
  }
  // museum objects inside the panes (dim, unlit): P1 old stern lantern · P2 brass candlestick + stub · P3 enamel shade · P4 stained glass
  {
    const deck = VP + 0.02;
    // P1: the old horn stern lantern, unlit, a missing panel
    const L = FX.lantern({ style: 'horn', size: 0.9, intensity: 0, seed: 5 });
    L.light.visible = false; L.body.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uInt) o.visible = false; });
    if (L.halo) L.halo.object3D.visible = false; L.body.children.forEach((o) => { if (o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false; });
    if (L.body.userData.shell) { L.body.userData.shell.emissiveIntensity = 0; L.body.userData.shell.color.set('#3a2c1e'); L.body.userData.shellBase = 0; }
    L.object3D.position.set(0, deck + 0.62, -0.05); paneObjs[0].grp.add(L.object3D); L.update(0, { swing: 0, intensity: 0 });
    if (L.body.userData.shell) L.body.userData.shell.emissiveIntensity = 0;
    // P2: brass candlestick with a 2.5 cm stub
    const br = TX.mat('brass', { tex: { tone: 'museum', patina: 0.5 } });
    const prof = [[0, 0], [0.055, 0], [0.058, 0.012], [0.03, 0.03], [0.014, 0.06], [0.012, 0.16], [0.02, 0.17], [0.034, 0.18], [0.034, 0.188], [0.016, 0.19], [0, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
    const cs = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), br); cs.position.set(0, deck + 0.16, 0); paneObjs[1].grp.add(cs);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.025, 16), std({ color: hex('#d8cdb2'), roughness: 0.7 })); stub.position.set(0, deck + 0.16 + 0.19 + 0.0125, 0); paneObjs[1].grp.add(stub);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), velvetM); stand.position.set(0, deck + 0.08, 0); paneObjs[1].grp.add(stand);
    // P3: the waiting shed's old enamel lamp shade (white outside, chipped, dark inside)
    const sh = [[0.02, 0.0], [0.04, 0.01], [0.09, 0.05], [0.16, 0.11], [0.2, 0.14], [0.205, 0.15]].map(([r, y]) => new THREE.Vector2(r, -y));
    const shade = new THREE.Mesh(new THREE.LatheGeometry(sh, 40), std({ color: hex('#5e5b55'), roughness: 0.4, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: 0.35 }));
    shade.position.set(0, deck + 1.05, 0); paneObjs[2].grp.add(shade);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, VH - 1.05, 6), mSteel); rod.position.set(0, deck + 1.05 + (VH - 1.05) / 2, 0); paneObjs[2].grp.add(rod);
  }

  // ============================================================ P4: PROP_GLASSPANEL — 60 × 90 cm leaded panel on a very dim lightbox
  const P4 = paneObjs[3];
  const PANEL = { w: 0.6, h: 0.9, y: 1.62, back: 0.14 };       // centre height, distance behind the front glass
  const DIAM = { u: -0.19, v: -0.25, w: 0.06, h: 0.09 };        // the clear diamond quarry, lower left (panel-local, m)
  const panelTex = (() => {
    const W = 384, H = 576, c = canvas(W, H), g = c.getContext('2d'), r = rng(57);
    const pal = [C.P23, C.P24, C.P25, C.P26, C.P27, '#b9a77a', '#7e8fa8'];
    g.fillStyle = '#20242a'; g.fillRect(0, 0, W, H);
    // petal fields: overlapping soft ovals in the five softened colours
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H, rr = 18 + r() * 46, a = r() * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a); g.scale(1, 0.45 + r() * 0.35);
      g.fillStyle = pal[Math.floor(r() * 5)]; g.globalAlpha = 0.85; g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.globalAlpha = 1;
    // pale diamond quarries along the borders
    for (let i = 0; i < 6; i++) for (const yy of [0, 1]) { g.fillStyle = r() < 0.5 ? '#c8c2a8' : '#aab4bc'; const cx = (i + 0.5) * W / 6, cy = yy ? H - 26 : 26; g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 30, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 30, cy); g.closePath(); g.fill(); }
    // leads: a cell net (Voronoi-ish polylines) + the border
    g.strokeStyle = '#3c3f43'; g.lineWidth = 5; g.lineJoin = 'round';
    const pts = []; for (let i = 0; i < 42; i++) pts.push([r() * W, r() * H]);
    for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6) {
      let d1 = 1e9, d2 = 1e9; for (const [px, py] of pts) { const d = (px - x) ** 2 + (py - y) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      if (Math.sqrt(d2) - Math.sqrt(d1) < 3.2) { g.fillStyle = '#3a3d41'; g.fillRect(x - 2.5, y - 2.5, 5, 5); }
    }
    g.lineWidth = 9; g.strokeRect(4, 4, W - 8, H - 8);
    // the clear diamond at lower left: transparent (alpha 0) with its lead came
    const dx = (0.5 + DIAM.u / PANEL.w) * W, dy = (0.5 - DIAM.v / PANEL.h) * H, hw = DIAM.w / PANEL.w * W / 2, hh = DIAM.h / PANEL.h * H / 2;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(dx, dy - hh); g.lineTo(dx + hw, dy); g.lineTo(dx, dy + hh); g.lineTo(dx - hw, dy); g.closePath(); g.fill(); g.restore();
    g.strokeStyle = '#3c3f43'; g.lineWidth = 6; g.beginPath(); g.moveTo(dx, dy - hh); g.lineTo(dx + hw, dy); g.lineTo(dx, dy + hh); g.lineTo(dx - hw, dy); g.closePath(); g.stroke();
    // two cracks
    g.strokeStyle = 'rgba(30,30,30,0.8)'; g.lineWidth = 1.2; for (const [x, y] of [[250, 180], [120, 400]]) { g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let k = 0; k < 6; k++) { px += (r() - 0.4) * 22; py += (r() - 0.5) * 22; g.lineTo(px, py); } g.stroke(); }
    return ctex(c);
  })();
  const panelMat = new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, alphaTest: 0.5, color: new THREE.Color(0.2, 0.19, 0.185), side: THREE.DoubleSide });
  const panelG = new THREE.Group(); P4.grp.add(panelG);
  panelG.position.set(0, PANEL.y, VD / 2 - PANEL.back);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), panelMat); panelG.add(panel);
  // lightbox behind: very dim warm-white diffuser (not behind the clear diamond: a black baffle there)
  const lbox = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w + 0.04, PANEL.h + 0.04), new THREE.MeshBasicMaterial({ color: hex('#2a2620') })); lbox.position.z = -0.03; panelG.add(lbox);
  const baffle = new THREE.Mesh(new THREE.PlaneGeometry(DIAM.w * 1.15, DIAM.h * 1.15), new THREE.MeshBasicMaterial({ color: 0x020203 })); baffle.position.set(DIAM.u, DIAM.v, -0.012); panelG.add(baffle);
  const frameM = std({ color: hex('#2b2c2e'), roughness: 0.5, metalness: 0.6 });
  for (const [sx, sy, w, h] of [[0, PANEL.h / 2 + 0.012, PANEL.w + 0.05, 0.024], [0, -PANEL.h / 2 - 0.012, PANEL.w + 0.05, 0.024], [PANEL.w / 2 + 0.012, 0, 0.024, PANEL.h], [-PANEL.w / 2 - 0.012, 0, 0.024, PANEL.h]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), frameM); f.position.set(sx, sy, -0.012); panelG.add(f);
  }
  const panelStand = new THREE.Mesh(new THREE.BoxGeometry(0.03, PANEL.y - PANEL.h / 2 - VP, 0.03), frameM); panelStand.position.set(0, -(PANEL.y - VP) / 2 - PANEL.h / 4, -0.03); panelG.add(panelStand);
  // the panel's soft coloured glow on whoever studies it (one cheap unshadowed spot)
  const panelGlow = new THREE.SpotLight(hex('#c9a48a'), 0, 3.0, 0.9, 0.9, 2); panelGlow.position.set(0, 0, 0.05); panelG.add(panelGlow, panelGlow.target); panelGlow.target.position.set(0, -0.1, 1.0);
  // the diamond: an opaque dark quarry showing the mirror render (her reflection), at mirror depth for the DOF
  const mirror = { rt: null, cam: new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 600), on: false, depth: 1.6 };
  const diamondMat = new THREE.ShaderMaterial({
    uniforms: { tRef: { value: null }, uOff: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uFlipX: { value: 0 }, uStr: { value: 0.45 }, uDepth: { value: 0.5 }, uOk: { value: 0 }, uNear: { value: 0.03 }, uFar: { value: 600 } },
    vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `#include <packing>
      uniform sampler2D tRef; uniform vec2 uOff, uSize; uniform float uStr, uDepth, uOk, uNear, uFar, uFlipX;
      void main(){
        vec2 uv = (gl_FragCoord.xy - uOff) / uSize; uv.x = mix(uv.x, 1.0 - uv.x, uFlipX);
        vec3 r = uOk > 0.5 ? texture2D(tRef, clamp(uv, 0.0, 1.0)).rgb : vec3(0.0);
        gl_FragColor = vec4(vec3(0.004, 0.005, 0.007) + r * uStr, 1.0);
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
  for (const h of [shellR, shellL]) { if (h.meshes.skin) h.meshes.skin.visible = false; if (h.meshes.skinArm) h.meshes.skinArm.visible = false; for (const c of h.meshes.cuffs) c.visible = false; }
  // the healed 6 mm scar: outer (thumb) side of the right index finger, over the PIP joint
  {
    const D = bareR.dims, F = D.F.find((f) => f.name === 'index');
    const scar = new THREE.Mesh(new THREE.CapsuleGeometry(0.0006, 0.0055, 2, 6), std({ color: hex('#e7c4b4'), roughness: 0.45 }));
    const b = bareR.fingerBones.index[0];
    const r = F.r[1] ?? 0.008;
    scar.position.set(0, -F.len[0] * 0.92, r * 0.86); scar.rotation.set(0, 0, 0);
    b.add(scar);
  }
  // folded gloves (the pair, folded once): two flat glove shapes
  const folded = new THREE.Group();
  {
    const gm = std({ color: hex(C.glove), roughness: 0.95 });
    const shape = new THREE.Shape(); shape.moveTo(-0.04, -0.06); shape.lineTo(0.04, -0.06); shape.quadraticCurveTo(0.047, 0.035, 0.03, 0.065); shape.quadraticCurveTo(0, 0.075, -0.03, 0.065); shape.quadraticCurveTo(-0.047, 0.035, -0.04, -0.06);
    const eg = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(eg, gm); m.position.set(0.003 * i, 0.002 * i, 0.012 * i); m.castShadow = true; folded.add(m); }
    folded.visible = false; scene.add(folded);
  }

  // ============================================================ per-frame helpers
  const frustum = new THREE.Frustum(), _pm = new THREE.Matrix4();
  function inView(obj, box) { box.setFromObject(obj); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_pm); return frustum.intersectsBox(box); }
  function updatePanes(tl, u, T, strengthOf, { force = null } = {}) {
    camera.updateMatrixWorld(true);
    let n = 0;
    for (const o of paneObjs) {
      const s = strengthOf(o, tl);
      o.U.uCam.value.copy(camera.position); o.U.uStr.value = s;
      o.floorGlow.material.opacity = 1; o.floorGlow.material.color.set(o.P.glow).multiplyScalar(0.09 * s / 0.5);
      const vis = !OFF.has('nopanes') && s > 0.004 && (force ? force.includes(o.P.id) : inView(o.plate, o.box));
      o.plate.visible = vis;
      if (vis) { ctx.renderNested(o.P.key, o.P.view, tl, u, T, o.rt, o.P.rt[0] / o.P.rt[1]); n++; }
    }
    return n;
  }
  function hideFigure() { floorRefl.visible = true; R.root.visible = false; for (const h of [bareR, bareL, shellR, shellL]) h.root.visible = false; folded.visible = false; }
  function nicheUpdate(T, k = 1) { for (const m of nicheMats) { m.uniforms.uT.value = T; m.uniforms.uK.value = k; } }
  const dist = (p) => camera.position.distanceTo(p);

  // ============================================================ setups
  const setups = {};

  // ---- S027 (96.917–101.792): WS 135 mm from the west end, compressing east; 02:10, moon due south ~60°
  setups.S027 = (tl, u, T) => {
    hideFigure();
    setMoon(180, 60, 2.2, V(-30, 0, -HW), V(1, CEIL, HW + WALL_T));
    panelMat.color.setScalar(0.12);
    hemi.intensity = 0.22; bounce.intensity = 0; bayLamp.intensity = 1.2;
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.35;
    // motion control: 0.3 m over 4.2 s from tl 0.70 (12-frame ease-in), level, centre line
    const s = clamp((tl - 0.7) / 4.2), push = 0.3 * (s < 0.12 ? (s * s) / 0.24 : s - 0.06) / 0.94;
    cam.lens(camera, 135); camera.near = 0.5; camera.far = 600;
    cam.place(camera, [-44 + push, EYE, 0], [10, EYE, 0]);
    // her silhouette crosses the last doorway's glow (x = −10), walking east, 2.58 → 3.8 s
    const k = clamp((tl - 2.25) / 1.75);
    if (k > 0 && k < 1) {
      R.root.visible = true; R.setGloves(true); for (const h of Object.values(R.hands)) h.root.visible = true;
      const x = lerp(-11.15, -9.45, k);
      R.root.position.set(x, 0, -HW - 0.26); R.root.rotation.set(0, Math.PI / 2, 0);
      R.pose('walk', { phase: (x + 11.15) / 0.78, stride: 0.8 });
    }
    // P1–P4 hold only their dark museum glass here (no eras yet)
    for (const o of paneObjs) o.plate.visible = false;
    renderBay(tl, u, T, { scale: 0.85, hideFigs: true });
    return { dof: { focus: 40, fstop: 8 }, exposure: 1.15, temp: -0.12 };
  };

  // ---- S066 (204.667–213.208): the signature dolly east through the five windows of the eras; 04:30, moon SW ~42°
  const paneStrength66 = (o, tl) => {
    const P = o.P;
    const up = smoothstep(P.rise - 0.2, P.peak, tl);                // surfaces as the camera approaches
    const base = 0.25 + 0.75 * up;
    const after = 1 - 0.35 * smoothstep(P.peak + 0.4, P.peak + 1.6, tl);
    // the reflection reads strongest at grazing view (fresnel-like), but the composite is "as seen": a soft angle term
    const toCam = camera.position.clone().sub(o.Pc.clone().setY(EYE)).normalize();
    const cosV = Math.abs(toCam.dot(o.n));
    const ang = lerp(1.15, 0.85, cosV);
    return 0.5 * base * after * ang;
  };
  setups.S066 = (tl, u, T) => {
    hideFigure();
    setMoon(225, 42, 5.0, V(-16, 0, -HW), V(1, CEIL, HW + WALL_T));
    hemi.intensity = 0.12; bayLamp.intensity = 1.0;
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    panelMat.color.setScalar(0.045);                                 // the lightbox dims: the chapel's own colour takes over in P4
    const x = x66(tl);
    cam.lens(camera, 40); camera.near = 0.05; camera.far = 600;
    cam.place(camera, [x, EYE, 0], [x + 10, EYE - 10 * Math.tan(1.5 * D2R), 0]);   // level-looking, 1.5° down: the floor (and its moon pools) from 6.8 m
    bounce.position.set(x + 6.0, 0.15, 0.6); bounce.intensity = 1.0;
    updatePanes(tl, u, T, paneStrength66);
    renderBay(tl, u, T, { scale: 0.8 });
    // focus: each pane's mirror depth (camera → glass + reflected depth) in turn, finally the two backs in the bay
    const fp = (i) => { const o = paneObjs[i]; return dist(o.Pc.clone().setY(EYE)) + o.P.depth; };
    const backs = 3.23 - x;
    const w = [smoothstep(-1, 0.4, tl) * (1 - smoothstep(1.3, 2.0, tl)), smoothstep(1.3, 2.0, tl) * (1 - smoothstep(3.1, 3.6, tl)), smoothstep(3.1, 3.6, tl) * (1 - smoothstep(4.6, 5.1, tl)), smoothstep(4.6, 5.1, tl) * (1 - smoothstep(6.1, 6.9, tl))];
    const wb = smoothstep(6.1, 6.9, tl);
    let f = 0, ws = 0; for (let i = 0; i < 4; i++) { f += w[i] * fp(i); ws += w[i]; }
    f += wb * backs; ws += wb;
    return { dof: { focus: f / Math.max(ws, 1e-3), fstop: 2.8 }, exposure: 1.3, temp: -0.1 };
  };

  // ---- S061 (190.958–195.0): CU 100 mm at P4 — her face in the clear diamond, the rack past the vitrine edge to the bay,
  // the gloves come off. Staging is solved from the mirror geometry (see corridor.md): camera west of the diamond looking
  // east, she stands north-west of it (out of frame left), the bay 8.8° left of the diamond.
  const S61 = (() => {
    P4.grp.updateMatrixWorld(true);
    const D = diamondWorld();
    const Bay = V(3.23, 1.12, 0.31);
    const c = 1.2, f = 0.42;
    let dir = V(1, 0, 0);
    let Cc = D.clone().addScaledVector(dir, -c);
    for (let i = 0; i < 6; i++) {
      const toB = Bay.clone().sub(Cc); toB.y = 0; toB.normalize();
      const ang = Math.atan2(toB.z, toB.x) + 8.8 * D2R;          // the diamond 8.8° to the right (south) of the bay
      dir = V(Math.cos(ang), 0, Math.sin(ang));
      Cc = D.clone().addScaledVector(dir, -c);
    }
    const r = dir.clone().sub(P4N.clone().multiplyScalar(2 * dir.dot(P4N)));   // reflected ray from the diamond back into the corridor
    const Fe = D.clone().addScaledVector(r, f);                                  // her eyes (plan)
    return { D, Bay, dir, r, Cpos: Cc, Fe, c, f };
  })();
  setups.S061 = (tl, u, T) => {
    setMoon(225, 45, 2.2, V(-6, 0, -HW), V(1, CEIL, HW + WALL_T));
    panelMat.color.setScalar(0.2);
    hemi.intensity = 0.2; bayLamp.intensity = 1.5; bounce.intensity = 0.3; bounce.position.set(-2.2, 0.2, 1.4);
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    for (const o of paneObjs) o.plate.visible = false;
    const { D, dir } = S61;
    floorRefl.visible = false;                                       // no floor in a level 100 mm frame
    const camY = 1.44, eyeY = 1.43;
    const Cpos = D.clone().addScaledVector(dir, -S61.c).setY(camY);
    cam.lens(camera, 100); camera.near = 0.03; camera.far = 600;
    // aim: the diamond at (0.70, 0.42)
    cam.place(camera, Cpos, D);
    const hf = Math.atan(18 / 100), vf = Math.atan(18 / 100 / camera.aspect);
    camera.rotateY(Math.atan((0.70 - 0.5) * 2 * Math.tan(hf)));
    camera.rotateX(-Math.atan((0.5 - 0.42) * 2 * Math.tan(vf)));
    camera.updateMatrixWorld(true);
    // her: eyes at S61.Fe (height eyeY), facing the diamond
    R.root.visible = true; R.setGloves(true);
    const look = D.clone();
    const fwd = look.clone().sub(S61.Fe).setY(0).normalize();
    R.pose('stand', { weight: 0.2 });
    R.pose({ 'spine.x': 0.08, 'chest.x': 0.06, 'neck.x': 0.12 }, { add: true });
    R.root.rotation.set(0, Math.atan2(fwd.x, fwd.z), 0);
    R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
    const e0 = R.eye(V(0, 0, 0));
    R.root.position.set(S61.Fe.x - e0.x, eyeY - e0.y, S61.Fe.z - e0.z); R.root.updateMatrixWorld(true);
    R.lookAt(look, 1); R.breathe(T, 0.8);
    for (const h of Object.values(R.hands)) h.root.visible = true;
    for (const h of [bareR, bareL, shellR, shellL]) h.root.visible = false;
    // mirror render for the diamond
    renderMirror();
    renderBay(tl, u, T, { scale: 1.0 });
    const backs = V(3.23, 1.1, 0.31);
    const fMirror = S61.c + S61.f, fBay = dist(backs), fHands = 0.62;
    const f = tl < 1.24 ? fMirror : tl < 1.9 ? lerp(fMirror, fBay, ease.inOutSine((tl - 1.24) / 0.66)) : tl < 2.1 ? fBay : lerp(fBay, fHands, ease.inOutSine(clamp((tl - 2.1) / 0.5)));
    diamondMat.uniforms.uDepth.value = fMirror;
    return { dof: { focus: f, fstop: 2.8 }, exposure: 1.2, temp: -0.1 };
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
    // the mirrored image of screen column X is column (FW − X): flip the view box
    mc.setViewOffset(FW, FH, FW - px1, FH - py1, vw, vh); mc.updateProjectionMatrix(); mc.updateMatrixWorld(true);
    const r = ctx.renderer, prev = r.getRenderTarget(), clip = r.clippingPlanes;
    const hidden = [diamond, panel, portal, floorRefl, ...paneObjs.map((o) => o.plate)];
    const vis = hidden.map((o) => o.visible); for (const o of hidden) o.visible = false;
    r.clippingPlanes = [new THREE.Plane(pn.clone(), -pn.dot(pp) + 0.002)];
    r.setRenderTarget(mirror.rt); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(scene, mc);
    r.setRenderTarget(prev); r.clippingPlanes = clip;
    hidden.forEach((o, i) => { o.visible = vis[i]; });
    mc.clearViewOffset();
    if (OFF.has('dbgm')) { const px = new Float32Array(4); const rr = ctx.renderer; rr.readRenderTargetPixels(mirror.rt, vw >> 1, vh >> 1, 1, 1, px); console.log('MIRROR', px0, px1, py0, py1, 'cam', mc.position.toArray().map((v) => v.toFixed(2)).join(','), 'centre px', Array.from(px).map((v) => v.toFixed(4)).join(',')); }
    const U = diamondMat.uniforms; U.tRef.value = mirror.rt.texture; U.uOff.value.set(px0, py0); U.uSize.value.set(vw, vh); U.uFlipX.value = 1; U.uOk.value = 1; U.uNear.value = camera.near; U.uFar.value = camera.far;
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
    return { dof: null, exposure: 1.0, vignette: 0, grain: 0.0, bloom: { strength: 0.1 } };
  };
  setups.default = setups.S066;

  return {
    scene, camera,
    post: { exposure: 1.15, contrast: 1.05, saturation: 0.9, temp: -0.1, shadowTint: [0.45, 0.49, 0.58], highTint: [0.55, 0.53, 0.5], lift: [0.008, 0.01, 0.016],
      vignette: 0.34, grain: 0.035, aberration: 0.5, bloom: { strength: 0.38, radius: 0.6, threshold: 0.8 } },
    setShot(shot, tl, u, T) {
      sky.update(T); camMark.visible = false;
      viewG.visible = false;
      const f = setups[shot.dbg ? (shot.dbg.views ? 'DBG_VIEWS' : 'DBG') : shot.id] || setups.default;
      const p = f(tl, u, T, shot) || {};
      if (OFF.has('nodof')) p.dof = null;
      return p;
    },
  };
}
