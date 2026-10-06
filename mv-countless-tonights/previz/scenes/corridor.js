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
const EYE = 1.45;                                                          // dolly lens height
// minor niches: [x, side(-1 north / +1 south), kind, seed]  (kind 0 fishing lamp · 1 stove fire · 2 lighthouse · 3 night market)
const NICHES = [
  [-41.0, -1, 2, 1], [-38.0, 1, 0, 2], [-31.0, -1, 3, 3], [-30.0, 1, 1, 4], [-25.0, -1, 0, 5], [-26.0, 1, 2, 6], [-19.0, -1, 1, 7],
  [-20.0, 1, 3, 8], [-13.0, -1, 2, 9], [-12.0, 1, 0, 10], [-6.8, -1, 3, 11], [-8.0, 1, 1, 12], [-4.4, -1, 0, 13], [-4.0, 1, 2, 14],
];
// review: the x = −8.7 niche overlapped the x = −10 doorway (her head vanished behind its glass in S027) → −6.8; niches are
// shallow (bible 浅壁龛) with the glow just behind the glass, so they still glow when seen edge-on from the west end
const NICHE_W = 0.6, NICHE_H = 0.9, NICHE_Y = 1.15, NICHE_D = 0.16;

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
  // review: P1 a little larger and less crushed so the night sea reads as water around the lamp; P2 framed lower (bowl, rain,
  // her hand; her face above the pane's soft top); every pane softened (blur) so faces stay unresolved
  { id: 'P1', key: 'sea_deck', view: 'view_shiplamp', x: -7.3, z: -1.0, peak: 0.85, rise: 0.0, depth: 1.1, anchor: [0.0, 1.45], size: 1.6, subj: [0.5, 0.52], glow: '#c99a62', grade: 'nav', black: 0.0025, blur: 0.0035, rt: [448, 552] },
  { id: 'P2', key: 'old_home', view: 'view_home_rain', zoom: [0.24, 0.26, 0.96, 0.98], x: -5.1, z: 1.0, peak: 2.5, rise: 2.1, depth: 1.0, anchor: [0.0, 1.36], size: 2.3, subj: [0.56, 0.58], glow: '#e2a458', grade: 'home', black: 0.004, blur: 0.006, rt: [448, 552] },
  { id: 'P3', key: 'pier_waiting', view: 'view_pier', x: -2.9, z: -1.0, peak: 3.9, rise: 3.0, depth: 1.0, anchor: [0.0, 1.5], size: 2.0, subj: [0.5, 0.5], glow: '#e8b87a', grade: 'mig', black: 0.01, blur: 0.006, rt: [448, 552] },
  { id: 'P4', key: 'chapel', view: 'view_chapel', x: -0.75, z: 1.2, alpha: 60, peak: 5.71, rise: 4.5, depth: 0.9, anchor: [0.0, 1.45], size: 1.05, subj: [0.6, 0.45], glow: '#c99088', grade: 'chapel', black: 0.008, rt: [512, 632] },
];
// per-era look inside the pane (bible §2.4 LUT notes, applied to the nested linear-HDR frame before compositing)
const GRADES = {
  nav: { expo: 1.45, sat: 0.95, gain: [0.97, 0.99, 1.06], green: 0.8 },        // CT_NAV: strongest warm/cool split, greens −20 %
  home: { expo: 1.9, sat: 0.95, gain: [1.04, 0.99, 0.95], green: 0.92 },     // CT_HOME: candle-warm vs lattice moon
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
    for (let x = X_W + 1; x < 0; x += 1.5) box(0.14, 0.22, 2 * HW, mBeam, x, CEIL - 0.11, 0, scene, false);
    for (const z of [-1.35, 0, 1.35]) box(-X_W, 0.16, 0.12, mBeam, X_W / 2, CEIL - 0.3, z, scene, false);
    const west = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(2 * HW, CEIL).rotateY(Math.PI / 2).translate(X_W, CEIL / 2, 0), 1.6, 1.6), mPlaster); west.receiveShadow = true; scene.add(west);
    // bulkhead over the end screen (x = 0, 3.05 → 5.2) + cornice
    const mBulk = mPlaster.clone(); mBulk.color = hex('#4a463f');
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
  const nicheMats = [], nicheGlows = []; let nicheSide = null;
  {
    const mIn = std({ color: hex('#14161b'), roughness: 0.9 });
    nicheSide = std({ color: hex('#14161b'), roughness: 0.9, emissive: K3000.clone(), emissiveIntensity: 0.05 });
    const nGlass = glassMaterial({ haze: 0.5, dust: 0.3, hazeLevel: 0.03, edge: 0, absorb: 0.06, envMapIntensity: 0.9, res: [ctx.W, ctx.H] });
    nGlass.material.envMap = ENV;
    for (const [x, side, kind, seed] of NICHES) {
      const zf = side * HW, zb = side * (HW + NICHE_D);
      const g = new THREE.Group(); scene.add(g);
      // recess box (back + sides + top + bottom)
      box(NICHE_W, NICHE_H, 0.02, mIn, x, NICHE_Y + NICHE_H / 2, zb, g, false);
      for (const sx of [-1, 1]) box(0.02, NICHE_H, NICHE_D, nicheSide, x + sx * NICHE_W / 2, NICHE_Y + NICHE_H / 2, (zf + zb) / 2, g, false);   // reveals catch the glow
      for (const yy of [NICHE_Y, NICHE_Y + NICHE_H]) box(NICHE_W, 0.02, NICHE_D, mIn, x, yy, (zf + zb) / 2, g, false);
      // the defocused glow card (deep inside), facing the corridor
      const m = nicheMat(kind, seed); nicheMats.push(m);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(NICHE_W - 0.06, NICHE_H - 0.06), m);
      card.position.set(x, NICHE_Y + NICHE_H / 2, zf + side * 0.07); card.rotation.y = side > 0 ? Math.PI : 0; g.add(card);
      // glass front, a dark frame
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(NICHE_W, NICHE_H), nGlass.material); gl.position.set(x, NICHE_Y + NICHE_H / 2, zf + side * 0.02); gl.rotation.y = side > 0 ? Math.PI : 0; gl.renderOrder = 65; g.add(gl);
      for (const yy of [NICHE_Y - 0.02, NICHE_Y + NICHE_H + 0.02]) box(NICHE_W + 0.08, 0.04, 0.04, mTimber, x, yy, zf - side * 0.01, g, false);
      // the warm spill on the wall around it (additive, no light)
      const sp = FX.glow({ color: kind === 1 ? hex('#ffa060') : K3000, size: 0.9, intensity: 0.035, falloff: 2.6 });
      sp.object3D.position.set(x, NICHE_Y + NICHE_H / 2, zf - side * 0.05); g.add(sp.object3D); nicheGlows.push(sp); sp.base = { x, zf, side };
    }
  }

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

  // ============================================================ the end screen (x = 0): timber + glass; the bay is the portal behind it
  const SCR_Z = [-2.7, -1.85, -1.0, 1.0, 1.85, 2.7];       // review: centre bay 2.0 m (S061 looks past z = 0.8 to the guard)
  const screenGlass = glassMaterial({ haze: 0.18, dust: 0.18, hazeLevel: 0.018, edge: 0, absorb: 0.05, envMapIntensity: 1.0, res: [ctx.W, ctx.H] });
  screenGlass.material.envMap = ENV;
  const wavyGlass = glassMaterial({ haze: 0.6, dust: 0.3, hazeLevel: 0.03, edge: 0, absorb: 0.08, envMapIntensity: 1.1, res: [ctx.W, ctx.H] });
  wavyGlass.material.envMap = ENV;
  {
    const mw = 0.075, dd = 0.08;
    for (const z of SCR_Z) box(dd, SCREEN_TOP, Math.abs(z) > 2.6 ? 0.12 : mw, mTimber, 0, SCREEN_TOP / 2, z - Math.sign(z) * (Math.abs(z) > 2.6 ? 0.06 : 0));
    for (const y of [0.04, DADO, 2.2, SCREEN_TOP - 0.04]) box(dd, 0.08, 2 * HW, mTimber, 0, y, 0);
    // door leaves (north pair) stiles + their own mid rail
    for (const z of [-2.62, -1.89, -1.81, -1.08]) box(dd + 0.01, 2.16, 0.055, mTimber, -0.005, 1.1, z);
    // dado panels (0.08 → 0.91), raised
    const mPanel = std({ color: hex('#2a2119'), roughness: 0.6, envMap: ENV, envMapIntensity: 0.4 });
    for (let i = 0; i < SCR_Z.length - 1; i++) {
      const z0 = SCR_Z[i], z1 = SCR_Z[i + 1], w0 = z1 - z0 - 0.09;
      box(0.03, DADO - 0.1, w0, mPanel, -0.02, DADO / 2 + 0.02, (z0 + z1) / 2);
      // raised field + bolection moulding
      box(0.02, DADO - 0.24, w0 - 0.16, mTimber, -0.045, DADO / 2 + 0.02, (z0 + z1) / 2);
    }
    // glass: lower clear (0.99 → 2.16), upper wavy (2.24 → 3.01)
    for (let i = 0; i < SCR_Z.length - 1; i++) {
      const z0 = SCR_Z[i], z1 = SCR_Z[i + 1];
      const lo = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 2.16 - DADO - 0.04), screenGlass.material); lo.position.set(-0.01, (2.16 + DADO + 0.04) / 2, (z0 + z1) / 2); lo.rotation.y = -Math.PI / 2; lo.renderOrder = 80; scene.add(lo);
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
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, SCREEN_TOP - DADO), portalMat);
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
  function renderBay(tl, u, T, { scale = 1, hideFigs = false, lampShift = null } = {}) {
    portalMat.uniforms.uOk.value = 0;
    if (!NW.cam || OFF.has('nobay')) return;
    camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    // screen bbox of the portal quad
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0, anyFront = false;
    for (const [z, y] of [[-HW, DADO], [HW, DADO], [-HW, SCREEN_TOP], [HW, SCREEN_TOP]]) {
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
        try { return orig.call(this, s, c); } finally {
          hide.forEach((o, i) => { o.visible = vis[i]; });
          if (lampShift) for (const o of NW.lamp) { o.position.sub(lampShift); o.updateMatrixWorld(true); }
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
    uniform sampler2D tEra; uniform vec3 uCam, uO, uU, uV, uN; uniform float uStr, uExpo, uSat, uGreen, uAsp, uBlack, uBlur, uAspT; uniform vec3 uGain;
    void main(){
      vec3 rd = normalize(vW - uCam);
      float t = dot(uO - uCam, uN) / dot(rd, uN);
      vec3 H = uCam + rd * t - uO;
      vec2 q = vec2(dot(H, uU) / dot(uU, uU), dot(H, uV) / dot(uV, uV));
      vec2 uv = q * 0.5 + 0.5;
      float inb = smoothstep(0.0, 0.14, uv.x) * smoothstep(0.0, 0.14, 1.0 - uv.x) * smoothstep(0.0, 0.16, uv.y) * smoothstep(0.0, 0.16, 1.0 - uv.y);
      inb *= mix(0.35, 1.0, smoothstep(0.78, 0.25, length((uv - vec2(0.5, 0.52)) * vec2(1.25, 1.0))));   // the other night glows from its centre
      // dark glass: only the other night's light registers; a soft 9-tap disc (review): the other night is seen through
      // old glass at its own depth — shapes, light and gesture read, faces stay unresolved (留白)
      vec3 c = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        float a = float(i) * 2.39996 + 0.5, r = i == 0 ? 0.0 : sqrt(float(i) / 8.0);
        c += max(texture2D(tEra, clamp(uv + vec2(cos(a), sin(a) * uAspT) * r * uBlur, 0.002, 0.998)).rgb - uBlack, 0.0);
      }
      c *= uExpo / 9.0;
      c += 0.2 * max(texture2D(tEra, clamp(uv + vec2(0.007, -0.004), 0.002, 0.998)).rgb - uBlack, 0.0) * uExpo;   // the faint second image of thick glass
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat); c.g = mix(l, c.g, uGreen) * 0.5 + c.g * 0.5; c *= uGain;
      float e = smoothstep(0.0, 0.025, min(min(vUv.x, 1.0 - vUv.x) * uAsp, min(vUv.y, 1.0 - vUv.y))) * smoothstep(0.03, 0.17, vUv.y);
      gl_FragColor = vec4(max(c, 0.0) * uStr * inb * e, 1.0);
    }`;
  const paneObjs = [];
  const VW = 1.1, VD = 0.6, VH = 2.3, VP = 0.4;
  const velvetM = TX.mat('velvet', { color: hex('#141c2a'), sheenColor: hex('#1a2436') });
  for (const P of PANES) {
    const side = Math.sign(P.z);                 // -1 north, +1 south
    const a = (P.alpha ?? ALPHA) * D2R;                          // P4 turned 60° (review: S061's hands need room in front of its glass)
    const n = V(-Math.sin(a), 0, -side * Math.cos(a));          // front normal: toward the corridor axis, turned west
    const w = V(n.z, 0, -n.x).normalize();                        // along the pane: the right hand of a viewer facing the glass
    const Pc = V(P.x, 0, P.z);                                    // front-pane centre (floor level)
    const foot = Pc.clone().addScaledVector(n, -VD / 2);
    const v = vitrine({ w: VW, d: VD, h: VH, plinthH: VP, frame: 0, deck: 'velvet', light: 'none', res: [ctx.W, ctx.H], seed: 3 + paneObjs.length,
      glass: { haze: 0.28, dust: 0.22, hazeLevel: 0.022, envMapIntensity: 1.7 } });
    const grp = v.object3D; grp.position.copy(foot); grp.rotation.y = Math.atan2(n.x, n.z); scene.add(grp);
    for (const gm of Object.values(v.glass)) { gm.material.envMap = ENV; }
    grp.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity >= 2) { o.material.envMap = ENV; o.material.envMapIntensity = 3.0; o.material.roughness = 0.3; } });
    v.plinth.material.color.set('#0a0b0e'); v.plinth.material.roughness = 0.55; v.plinth.material.envMap = ENV; v.plinth.material.envMapIntensity = 0.5;
    if (v.deck.material.isMeshPhysicalMaterial) { v.deck.material.color.set('#0c1018'); v.deck.material.sheen = 0.15; v.deck.material.sheenColor.set('#141a26'); }
    // velvet-lined back wall inside (the dark behind the glass that lets the other night be seen)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(VW - 0.03, VH - 0.03), velvetM); back.position.set(0, VP + VH / 2, -VD / 2 + 0.015); back.receiveShadow = true; grp.add(back);
    // era plate just inside the front glass
    const rt = ctx.makeRT(P.rt[0], P.rt[1]);
    const rtLo = ctx.makeRT(Math.round(P.rt[0] / 2 / 8) * 8, Math.round(P.rt[1] / 2 / 8) * 8);   // pane LOD: far or faint → half res
    const U = { tEra: { value: rt.texture }, uCam: { value: V(0, 0, 0) }, uO: { value: V(0, 0, 0) }, uU: { value: V(1, 0, 0) }, uV: { value: V(0, 1, 0) }, uN: { value: n.clone() },
      uStr: { value: 0 }, uExpo: { value: GRADES[P.grade].expo }, uSat: { value: GRADES[P.grade].sat }, uGreen: { value: GRADES[P.grade].green }, uGain: { value: V(...GRADES[P.grade].gain) }, uAsp: { value: VW / VH }, uBlack: { value: P.black }, uBlur: { value: P.blur ?? 0.004 }, uAspT: { value: P.rt[0] / P.rt[1] } };
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
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), color: hex(P.glow), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.rotation.x = -Math.PI / 2; gl.position.copy(Pc).addScaledVector(n, 0.55).setY(0.006); gl.rotation.z = Math.atan2(n.x, n.z); scene.add(gl);
    paneObjs.push({ P, v, grp, plate, U, rt, rtLo, n, w, Pc, side, box: new THREE.Box3(), floorGlow: gl });
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
    // (review: set to the back-left of the deck — centred, it stood exactly on the era image's bowl and read as a candle in it)
    const csX = 0.33, csZ = -0.12;
    const cs = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), br); cs.position.set(csX, deck + 0.16, csZ); paneObjs[1].grp.add(cs);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.025, 16), std({ color: hex('#d8cdb2'), roughness: 0.7 })); stub.position.set(csX, deck + 0.16 + 0.19 + 0.0125, csZ); paneObjs[1].grp.add(stub);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), velvetM); stand.position.set(csX, deck + 0.08, csZ); paneObjs[1].grp.add(stand);
    // P3: the waiting shed's old enamel lamp shade (white outside, chipped, dark inside)
    const sh = [[0.02, 0.0], [0.04, 0.01], [0.09, 0.05], [0.16, 0.11], [0.2, 0.14], [0.205, 0.15]].map(([r, y]) => new THREE.Vector2(r, -y));
    const shade = new THREE.Mesh(new THREE.LatheGeometry(sh, 40), std({ color: hex('#3a3833'), roughness: 0.45, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: 0.2 }));
    shade.position.set(0, deck + 1.05, 0); paneObjs[2].grp.add(shade);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, VH - 1.05, 6), mSteel); rod.position.set(0, deck + 1.05 + (VH - 1.05) / 2, 0); paneObjs[2].grp.add(rod);
  }

  // ============================================================ P4: PROP_GLASSPANEL — 60 × 90 cm leaded panel on a very dim lightbox
  const P4 = paneObjs[3];
  const PANEL = { w: 0.6, h: 0.9, y: 1.70, back: 0.14 };       // centre height (review: diamond at 1.45 = her bowed eye line), distance behind the front glass
  const DIAM = { u: -0.19, v: -0.25, w: 0.06, h: 0.09 };        // the clear diamond quarry, lower left (panel-local, m)
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
  const panelG = new THREE.Group(); P4.grp.add(panelG);
  panelG.position.set(0, PANEL.y, VD / 2 - PANEL.back);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), panelMat); panelG.add(panel);
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
        // old, slightly uneven quarry glass: a soft 5-tap reflection (review: the crisp mirror read as a mask)
        vec2 px = 1.6 / uSize;
        vec3 r = uOk > 0.5 ? 0.36 * texture2D(tRef, clamp(uv, 0.0, 1.0)).rgb
          + 0.16 * (texture2D(tRef, clamp(uv + vec2(px.x, 0.4 * px.y), 0.0, 1.0)).rgb + texture2D(tRef, clamp(uv - vec2(px.x, 0.4 * px.y), 0.0, 1.0)).rgb
                  + texture2D(tRef, clamp(uv + vec2(-0.4 * px.x, px.y), 0.0, 1.0)).rgb + texture2D(tRef, clamp(uv - vec2(-0.4 * px.x, px.y), 0.0, 1.0)).rgb) : vec3(0.0);
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
  for (const h of [shellR, shellL]) { const m = h.gloveMat || (h.meshes.glove && h.meshes.glove.material); if (m) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -24; } }
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
    const gm = std({ color: hex(C.glove).multiplyScalar(0.9), map: kn, roughness: 0.95 });
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
    for (const P of PANES) if (P.zoom) {
      r.render = function (s, c) { if (r.getRenderTarget() === rt && c.isPerspectiveCamera) viewCams[P.id] = c; return orig.call(this, s, c); };
      try { ctx.renderNested(P.key, P.view, 2.4, 0.28, 207.07, rt, 32 / 40); } catch (e) { console.warn('corridor: view prime failed', P.id, String(e).slice(0, 160)); }
      r.render = orig;
    }
    rt.dispose();
  }
  function updatePanes(tl, u, T, strengthOf, { force = null } = {}) {
    camera.updateMatrixWorld(true);
    let n = 0;
    for (const o of paneObjs) {
      const s = strengthOf(o, tl);
      o.U.uCam.value.copy(camera.position); o.U.uStr.value = s;
      o.floorGlow.material.opacity = 1; o.floorGlow.material.color.set(o.P.glow).multiplyScalar(0.16 * s / 0.75);
      const vis = !OFF.has('nopanes') && s > 0.004 && (force ? force.includes(o.P.id) : inView(o.plate, o.box));
      o.plate.visible = vis;
      if (vis) {
        // LOD (review, perf): a pane farther than 6.5 m or still faint is small / dim on screen → its half-res RT
        const lo = camera.position.distanceTo(o.Pc.clone().setY(EYE)) > 6.5 || s < 0.3, rt = lo ? o.rtLo : o.rt;
        o.U.tEra.value = rt.texture;
        const zc = o.P.zoom && viewCams[o.P.id], w = rt.width, h = rt.height;
        if (zc) { const [a, b, c, d] = o.P.zoom; zc.setViewOffset(w, h, a * w, b * h, (c - a) * w, (d - b) * h); }
        try { ctx.renderNested(o.P.key, o.P.view, tl, u, T, rt, o.P.rt[0] / o.P.rt[1]); } finally { if (zc) { zc.clearViewOffset(); zc.updateProjectionMatrix(); } }
        n++;
      }
    }
    return n;
  }
  function hideFigure() { for (const sp of doorSpills) sp.material.color.copy(K3000).multiplyScalar(0.07); portalMat.uniforms.uGain.value = 1.0; bayLamp.position.set(3.24, 1.62, -0.98); diamond.renderOrder = 0; diamondMat.depthFunc = THREE.LessEqualDepth; floorRefl.visible = true; panelGlow.intensity = 0; galleryLight.intensity = 0; R.root.visible = false; for (const h of [bareR, bareL, shellR, shellL]) h.root.visible = false; folded.visible = false; bundle.visible = false; bundle.userData.flop.visible = false; for (const sl of sleeves) sl.visible = false; }
  // off = how far the soft glow sits in front of the wall (S027 sees the niches edge-on from 13–40 m: the glow must clear
  // the wall plane to read as warm bokeh rather than a half disc cut by the wall)
  function nicheUpdate(T, k = 1, glow = 0.035, size = 0.9, side = 0.05, off = 0.05) {
    nicheSide.emissiveIntensity = side * k;
    for (const g of nicheGlows) g.object3D.position.set(g.base.x, NICHE_Y + NICHE_H / 2, g.base.zf - g.base.side * off);
    nicheMats.forEach((m, i) => { m.uniforms.uT.value = T; m.uniforms.uK.value = k; const g = nicheGlows[i]; g.set(glow * (0.85 + 0.3 * util.noise1(T * 0.7, i))); g.object3D.scale.setScalar(size / 2); });
  }
  const dist = (p) => camera.position.distanceTo(p);

  // ============================================================ setups
  const setups = {};

  // ---- S027 (96.917–101.792): WS 135 mm from the west end, compressing east; 02:10, moon due south ~60°
  setups.S027 = (tl, u, T) => {
    hideFigure();
    setMoon(180, 60, 2.2, V(-30, 0, -HW), V(1, CEIL, HW + WALL_T));
    setLightbox(0.12);
    hemi.intensity = 0.10; bayLamp.intensity = 1.0; bounce.intensity = 0;
    nicheUpdate(T, 1.0, 0.13, 0.85, 0.035, 0.3);                       // seen edge-on from the west end: their glow reads as warm bokeh
    doorSpills.forEach((sp, i) => sp.material.color.copy(K3000).multiplyScalar(i === DOOR_X.length - 1 ? 0.28 : 0.07));
    // the last doorway's far reveal is the warm field her silhouette crosses (review: brighter; she reads dark against it)
    revealMats.forEach((m, i) => { m.emissiveIntensity = i === DOOR_X.length - 1 ? 1.5 : 0.1; });
    galleryLight.intensity = 4.0; galleryLight.position.set(-8.4, 1.7, -3.8);   // G3's 3000 K light beyond the doorway, behind her: a warm rim
    // motion control: 0.3 m over 4.2 s from tl 0.70 (12-frame ease-in), level, centre line
    const s = clamp((tl - 0.7) / 4.2), push = 0.3 * (s < 0.12 ? (s * s) / 0.24 : s - 0.06) / 0.94;
    cam.lens(camera, 135); camera.near = 0.5; camera.far = 600;
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
    renderBay(tl, u, T, { scale: 0.85, hideFigs: true });
    return { dof: { focus: 40, fstop: 8 }, exposure: 1.45, temp: -0.12, lift: [0.03, 0.034, 0.048] };   // (the base contrast eats a smaller lift: deep blue, never 0)
  };

  // ---- S066 (204.667–213.208): the signature dolly east through the five windows of the eras; 04:30, moon SW ~42°
  const LAMP66 = V(0, -0.10, 0.45), LAMP66_POS = V(3.24, 1.52, -0.53);
  const paneStrength66 = (o, tl) => {
    const P = o.P;
    const up = smoothstep(P.rise - 0.2, P.peak, tl);                // surfaces as the camera approaches
    const base = 0.25 + 0.75 * up;
    const after = 1 - 0.35 * smoothstep(P.peak + 0.4, P.peak + 1.6, tl);
    // the reflection reads strongest at grazing view (fresnel-like), but the composite is "as seen": a soft angle term
    const toCam = camera.position.clone().sub(o.Pc.clone().setY(EYE)).normalize();
    const cosV = Math.abs(toCam.dot(o.n));
    const ang = lerp(1.15, 0.85, cosV);
    return 0.75 * base * after * ang;
  };
  setups.S066 = (tl, u, T) => {
    hideFigure();
    setMoon(225, 42, 6.0, V(-16, 0, -HW), V(1, CEIL, HW + WALL_T));
    hemi.intensity = 0.22; bayLamp.intensity = 1.0;
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    setLightbox(0.05);                                 // the lightbox dims: the chapel's own colour takes over in P4
    const x = x66(tl);
    cam.lens(camera, 40); camera.near = 0.05; camera.far = 600;
    cam.place(camera, [x, EYE, 0], [x + 10, EYE - 10 * Math.tan(1.5 * D2R), 0]);   // level-looking, 1.5° down: the floor (and its moon pools) from 6.8 m
    bounce.intensity = 0;
    updatePanes(tl, u, T, paneStrength66);
    // the bay through the end screen: seen through the screen's glass and the corridor's reflection in it while we travel,
    // it resolves as the dolly comes to rest (shot list: the E pane resolves 6.5–8.1 s); the reading lamp is cheated
    // onto the S067 stern lantern's screen point (see NW.lamp)
    portalMat.uniforms.uGain.value = lerp(0.55, 1.0, smoothstep(5.0, 7.9, tl));
    bayLamp.position.copy(LAMP66_POS);
    renderBay(tl, u, T, { scale: lerp(0.62, 1.0, smoothstep(5.0, 7.6, tl)), lampShift: LAMP66 });   // dimmed + soft while far: reduced res
    // focus: each pane's mirror depth (camera → glass + reflected depth) in turn, finally the two backs in the bay
    const fp = (i) => { const o = paneObjs[i]; return dist(o.Pc.clone().setY(EYE)) + o.P.depth; };
    const backs = 3.23 - x;
    const w = [smoothstep(-1, 0.4, tl) * (1 - smoothstep(1.3, 2.0, tl)), smoothstep(1.3, 2.0, tl) * (1 - smoothstep(3.1, 3.6, tl)), smoothstep(3.1, 3.6, tl) * (1 - smoothstep(4.6, 5.1, tl)), smoothstep(4.6, 5.1, tl) * (1 - smoothstep(6.1, 6.9, tl))];
    const wb = smoothstep(6.1, 6.9, tl);
    let f = 0, ws = 0; for (let i = 0; i < 4; i++) { f += w[i] * fp(i); ws += w[i]; }
    f += wb * backs; ws += wb;
    return { dof: { focus: f / Math.max(ws, 1e-3), fstop: 2.8 }, exposure: 1.3, temp: -0.1, aa: 'msaa' };
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
    const r = dir.clone().sub(P4N.clone().multiplyScalar(2 * dir.dot(P4N)));   // reflected ray from the diamond back into the corridor
    const Fe = D.clone().addScaledVector(r, f);                                  // her eyes (plan)
    return { D, Bay, dir, r, Cpos: Cc.clone().setY(D.y), Fe, c, f, convex: 1.55 };
  })();
  const TILT61 = 3.4 * D2R;                       // the operator settles 3.4° down onto her hands with the second rack
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
    const H = S61.Fe.clone().addScaledVector(Fb, 0.29).addScaledVector(Rb, 0.04).setY(1.27);     // hands' working place (x≈0.35, y≈0.69)
    const toCam = S61.Cpos.clone().sub(H).setY(0).normalize();
    // the gloved hand is offered fingers up-forward-right (its forearm then leaves the frame bottom-left), palm toward her left
    const fR = nz(along, 0.78, up, 0.5, toCam, 0.12);
    const K = {
      H, Fb, Lb, Rb, along, toCam,
      fR, palmDn: nz(Lb, 0.55, up, -0.55, along, 0.25, toCam, -0.35),
      WR0: H.clone().addScaledVector(fR, -0.07),
      // the pinching hand takes the fingertip from behind (further from the lens), fingers up-right too, palm toward the lens side
      fP: nz(along, 0.62, up, 0.62, Lb, 0.15), palmP: nz(toCam, 0.6, up, -0.35, along, -0.3),
      // the right hand takes the left glove's fingertip from the near side, palm away from the lens
      fP2: nz(along, 0.62, up, 0.62, Rb, 0.1), palmP2: nz(toCam, -0.6, up, -0.35, along, -0.3),
      // the left hand offered for the second glove: the same place, a little further from the lens
      WL1: H.clone().addScaledVector(fR, -0.07).addScaledVector(Lb, 0.04).addScaledVector(Fb, 0.02),
      // the fold and the grip: right palm up (radial side, scar, toward the lens)
      WRf: H.clone().addScaledVector(fR, -0.07), fRf: nz(along, 0.8, up, 0.38, toCam, 0.1), palmUp: nz(up, 0.8, toCam, 0.3, along, -0.3),
      WRg: H.clone().addScaledVector(fR, -0.06).addScaledVector(up, 0.01), fRg: nz(along, 0.72, up, 0.5, toCam, 0.12), palmG: nz(up, 0.7, toCam, 0.45, along, -0.4),
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
  const chOnly = (c) => Object.fromEntries(Object.entries(c || {}).filter(([k, v]) => Array.isArray(v) || k === '_radius'));
  const blendCh = (a, b, t) => blendHandChannels(chOnly(a), chOnly(b), t);
  const lerpV = (a, b, t) => a.clone().lerp(b, t);
  const nlerp = (a, b, t) => a.clone().lerp(b, t).normalize();
  const _q = new THREE.Quaternion();
  setups.S061 = (tl, u, T) => {
    // 04:00 moon SW ~45° (az 215 keeps her head and hands inside the x = −2 window's light, from behind right of the lens)
    setMoon(215, 40, 2.4, V(-6, 0, -HW), V(1, CEIL, HW + WALL_T));      // (at 45° the 0.5 m window reveal shades her face)
    setLightbox(0.16);
    hemi.intensity = 0.3; bayLamp.intensity = 1.5;
    bounce.position.set(-0.7, 0.08, 1.2); bounce.color.set('#8a9cc0'); bounce.distance = 4; bounce.intensity = 0.9;   // the moon pool at her feet, bouncing up
    nicheUpdate(T, 1.0);
    for (const m of revealMats) m.emissiveIntensity = 0.25;
    for (const o of paneObjs) o.plate.visible = false;
    folded.visible = false; bundle.visible = false; bundle.userData.flop.visible = false;
    const { D } = S61;
    floorRefl.visible = false;                                       // no floor in a level 100 mm frame
    const eyeY = D.y;                                                // lens at the diamond's height → her eyes at the same height
    const settle = ease.inOutSine(clamp((tl - 1.78) / 0.75));        // the settle starts as her hands rise (tugs in frame)
    place61(camera, TILT61 * settle);
    const { right, fwd, up, K } = A61;
    // ---- her body: standing N of the diamond, bent toward the glass, straightening as she looks up, bowing to her hands
    R.root.visible = true; R.setGloves(true);
    for (const h of Object.values(R.hands)) h.root.visible = false;        // close-up hands replace the figure's
    // (her head bows to her hands through lookAt; the spine stays nearly upright so her face never enters the frame)
    const lean = 1 - 0.8 * ease.inOutSine(clamp((tl - 0.92) / 0.6)) + 0.12 * ease.inOutSine(clamp((tl - 1.85) / 0.5));
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
    const kStep = ease.inOutSine(clamp((tl - 1.45) / 0.55));
    R.root.position.copy(S61.rootOff).addScaledVector(K.Fb, 0.05 * kStep); poseBody(lean); R.root.updateMatrixWorld(true);
    // ---- the hands (world anchors measured through the settled frame; see A61). Timeline: 1.70 the gloved hands rise ·
    // 1.88 / 2.07 / 2.26 the left fingers tug the right glove's index, middle, ring tips · 2.42–2.86 the left hand draws the
    // right glove off (forward = screen right) · 2.88–3.04 the hands trade places, the dangling right glove handed to the
    // right palm · 3.04–3.32 the right thumb and index hold the left glove's tip while the left hand pulls out of it · 3.34
    // folded together across the right palm, the left hand presses them · 3.64–4.01 the right fist closes round them
    const kRise = ease.outCubic(clamp((tl - 1.70) / 0.42));
    const low = (p) => p.clone().addScaledVector(up, -0.34 * (1 - kRise)).addScaledVector(right, -0.06 * (1 - kRise)).addScaledVector(fwd, -0.06 * (1 - kRise));
    const TUG = [1.98, 2.13, 2.28];
    let slideR = 0; for (const a of TUG) slideR += 0.008 * ease.inOutSine(clamp((tl - a) / 0.12));
    const drawR = ease.inOutSine(clamp((tl - 2.42) / 0.44));
    slideR += 0.15 * drawR;                                            // 0 → 0.174 (the glove leaves the fingertips ≈ 2.80)
    const backR = 0.065 * drawR;                                       // the right hand draws back as the left pulls (hands part)
    const relL = 0.17 * ease.inOutSine(clamp((tl - 3.04) / 0.28));      // the left glove's slide off the left hand
    const kSwap = ease.inOutSine(clamp((tl - 2.88) / 0.16));
    const kFold = ease.inOutSine(clamp((tl - 3.34) / 0.22)), kGrip = ease.inOutSine(clamp((tl - 3.64) / 0.37));
    const bend = (h, s) => { const st = Math.min(s, 0.035); h.root.scale.set(1, 1 + st / 0.17, 1); h.root.updateMatrixWorld(true); return s - st * 0.5; };
    // a loosened glove slipping off: the shell swells a little (cloth lifting off the knuckles) so the hand never pokes through
    const puff = (h, s) => { const k = 1 + 0.11 * smoothstep(0.02, 0.06, s) * (1 - smoothstep(0.15, 0.175, s)); h.root.scale.x *= k; h.root.scale.z *= k; h.root.updateMatrixWorld(true); };
    for (const h of [shellR, shellL]) h.root.scale.set(1, 1, 1);
    const restL = low(K.H.clone().addScaledVector(K.Lb, 0.13).addScaledVector(up, 0.02));
    const OFF_F = 0.175;                                               // wrist → middle fingertip
    if (tl < 2.88) {
      // ---- phase 1: the right glove. right hand offered (gloved), the left pinch rides on the fingertip being worked
      const wR = low(K.WR0).addScaledVector(K.fR, -backR);
      bareR.pose(['flat', { spread: 0.08 }]); bareR.placeWrist(wR, K.fR, K.palmDn);
      shellR.setChannels(slideR < 0.06 ? chOnly(bareR.channels) : blendCh(bareR.channels, handPose('relaxed', { curl: 0.6 }, shellR.dims), clamp((slideR - 0.06) / 0.08)));
      if (slideR < 0.035) { const sh = bend(shellR, slideR); shellR.placeWrist(wR.clone().addScaledVector(K.fR, sh), K.fR, K.palmDn); }
      else shellR.placeWrist(wR.clone().addScaledVector(K.fR, slideR - 0.0175), K.fR, K.palmDn);
      puff(shellR, slideR);
      shellR.root.updateMatrixWorld(true);
      const which = tl < 2.07 ? 'index' : tl < 2.22 ? 'middle' : tl < 2.37 ? 'ring' : 'middle';
      const tip = shellR.tip(which, V(0, 0, 0), false).addScaledVector(K.fR, -0.006).addScaledVector(up, 0.006);
      const engage = smoothstep(1.80, 1.92, tl);
      bareL.pose(engage > 0.4 ? ['pinch', {}] : ['relaxed', { curl: 0.5 }]);
      handTo(bareL, tip, K.fP, K.palmP, 'pinch');
      const wPinch = bareL.root.position.clone();
      bareL.placeWrist(lerpV(restL, wPinch, engage), nlerp(K.fR, K.fP, engage), nlerp(K.palmDn, K.palmP, engage));
      // off the fingertips (slide > 0.16): the glove drops to hang from the left pinch
      const kh = smoothstep(2.78, 2.88, tl);
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
      const kp = smoothstep(3.34, 3.5, tl), kAway = smoothstep(3.80, 4.02, tl);
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
      if (tl >= 3.34) {
        wR = lerpV(lerpV(wPin, K.WRf, kFold), K.WRg, kGrip);
        fR = nlerp(nlerp(K.fP2, K.fRf, kFold), K.fRg, kGrip); pR = nlerp(nlerp(K.palmP2, K.palmUp, kFold), K.palmG, kGrip);
        poseR = blendCh(blendCh(handPose('pinch', {}, bareR.dims), handPose('cupped', {}, bareR.dims), kFold), handPose('grip', { radius: 0.016 }, bareR.dims), kGrip);
      }
      bareR.pose(poseR); bareR.placeWrist(wR, fR, pR); bareR.root.updateMatrixWorld(true);
      if (relL >= 0.16) hangShell(shellL, bareR.sockets.pinch.getWorldPosition(V(0, 0, 0)), smoothstep(3.26, 3.33, tl), K.fR);
      // the right glove: handed over from the left pinch to the right palm, hanging there until the fold
      const gs = bareR.sockets.grip.getWorldPosition(V(0, 0, 0)).addScaledVector(up, -0.012);
      bareL.root.updateMatrixWorld(true);
      hangShell(shellR, bareL.sockets.pinch.getWorldPosition(V(0, 0, 0)).lerp(gs, kSwap), 1, null, 1 - kSwap);
      if (tl >= 3.34) {
        bareR.root.updateMatrixWorld(true);
        const ps = bareR.sockets.palm.getWorldPosition(V(0, 0, 0));
        const press = ps.clone().addScaledVector(up, 0.03).addScaledVector(K.fR, -0.075).addScaledVector(fwd, 0.02);
        wLx = lerpV(lerpV(wLx, press, kp), K.H.clone().addScaledVector(K.Lb, 0.16).addScaledVector(up, -0.36), kAway);
        bareL.pose(['flat', { spread: 0.02 }]); bareL.placeWrist(wLx, K.fR, nlerp(K.palmDn, up.clone().negate(), kp)); bareL.root.updateMatrixWorld(true);
      }
      bareR.root.visible = true; bareL.root.visible = relL > 0.03;
      shellR.root.visible = tl < 3.36; shellL.root.visible = tl < 3.36;
    }
    if (kRise <= 0) { bareR.root.visible = bareL.root.visible = shellR.root.visible = shellL.root.visible = false; }
    // the folded pair across the right palm (3.36–3.72), then a soft bundle in the fist
    if (tl >= 3.36) {
      bareR.root.updateMatrixWorld(true);
      const flat = tl < 3.72;
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
    const study = D.clone().lerp(panelG.getWorldPosition(V(0, 0, 0)), 1.7).add(V(0, 0.06, 0));
    const gaze = study.lerp(V(3.0, 1.15, 0.2), wBay).lerp(K.WR0.clone().addScaledVector(K.fR, 0.12), wH);
    R.lookAt(gaze, 1); R.breathe(T, 0.8);
    // the panel's faint coloured glow on her (the lightbox is very dim): a soft fill on the cheek, not a key
    { const e = R.eye(V(0, 0, 0)); panelGlow.target.position.copy(panelG.worldToLocal(e.clone().add(V(0, -0.25, 0)))); panelGlow.target.updateMatrixWorld(); panelGlow.intensity = 0.16; panelGlow.color.set('#c99a8a'); }
    // mirror render for the diamond, the bay through the screen
    renderMirror();
    // (perf) the bay is sharp only while the focus holds on it (≈1.4–2.2 s); defocused it renders at 0.6 resolution
    if (!mirror.dbgHold) renderBay(tl, u, T, { scale: lerp(0.6, 1.0, smoothstep(1.1, 1.5, tl) * (1 - smoothstep(2.15, 2.5, tl))) });
    const backs = V(3.23, 1.1, 0.31);
    bareR.root.updateMatrixWorld(true);
    const handsAt = K.WR0.clone().addScaledVector(K.fR, 0.08);
    const fMirror = S61.c + S61.f, fBay = dist(backs), fHands = dist(handsAt);
    const fc = tl < 1.24 ? fMirror : tl < 1.9 ? lerp(fMirror, fBay, ease.inOutSine((tl - 1.24) / 0.66)) : tl < 2.1 ? fBay : lerp(fBay, fHands, ease.inOutSine(clamp((tl - 2.1) / 0.5)));
    diamondMat.uniforms.uDepth.value = fMirror; diamondMat.uniforms.uStr.value = 0.26;
    // the diamond writes the mirror depth (2.6 m) for the DOF, which lies behind the vitrine's velvet back: in this shot it
    // is drawn after the opaque set and always passes the depth test (nothing passes in front of it here)
    diamond.renderOrder = 60; diamondMat.depthFunc = THREE.AlwaysDepth;
    return { dof: { focus: fc, fstop: 2.8 }, exposure: 1.2, temp: -0.1 };
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
    const hidden = [diamond, panel, portal, floorRefl, ...paneObjs.map((o) => o.plate)];
    const vis = hidden.map((o) => o.visible); for (const o of hidden) o.visible = false;
    r.clippingPlanes = [new THREE.Plane(pn.clone(), -pn.dot(pp) + 0.002)];
    r.setRenderTarget(mirror.rt); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(scene, mc);
    r.setRenderTarget(prev); r.clippingPlanes = clip;
    hidden.forEach((o, i) => { o.visible = vis[i]; });
    mc.clearViewOffset();
    if (OFF.has('mirrorcam')) { camera.position.copy(mc.position); camera.quaternion.copy(mc.quaternion); camera.updateMatrixWorld(true); r.clippingPlanes = [new THREE.Plane(pn.clone(), -pn.dot(pp) + 0.002)]; for (const o of hidden) o.visible = false; mirror.dbgHold = true; }
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
      viewG.visible = false; hideFigure(); bounce.intensity = 0; mirror.dbgHold = false;   // per-frame defaults (setups are pure functions of their inputs)
      const f = setups[shot.dbg ? (shot.dbg.views ? 'DBG_VIEWS' : 'DBG') : shot.id] || setups.default;
      const p = f(tl, u, T, shot) || {};
      if (OFF.has('nodof')) p.dof = null;
      if (OFF.has('nobounce')) bounce.intensity = 0;
      if (OFF.has('nobaylamp')) bayLamp.intensity = 0;
      if (OFF.has('nobay')) portal.visible = false;
      return p;
    },
  };
}
