// museum_gallery — LOC_GALLERY: the present-day night gallery in the old customs house (and its future variant).
// Shots: S001 S002 S003 S004 (INTRO/V1) · S023 S024 S025 S026 (CH1B) · S028 S029 S030 (INTERLUDE) · S040 (V2)
//        · S070 S071 S078 (CH4/OUTRO, the future gallery).
//
// World: metres, Y up, +X = east, +Z = south. Gallery x −15…15, z −7 (north wall: G3a/b/c) … +7 (south wall with five arched
// doorways to the glazed verandah corridor z 7.6…13). Moonlight enters through the doorways only (one shadowed directional
// moon; the gallery shell casts, the corridor's glazed outer wall does not). Two rows of six cast-iron columns at z = ±2.35.
// G1 (compass / future coat) free-standing at (0, 3.6), south glass face z = 3.9, opposite doorway 3. G2 flat chart case
// 1.5 m east of it. G3a/b/c tall wall vitrines centred x −2.2 / 0 / +2.2, front glass z = −6.3 (G3c's front is a door).
//
// Glass device (the film's centre): each hero pane = lib glassMaterial (env reflections, low-iron edge) + an own additive
// overlay ('paneOverlay') that composites
//   (a) another era's night: ctx.renderNested(...) into an RT, mapped on a VIRTUAL IMAGE PLANE behind the glass (depth D,
//       so it slides with parallax as the camera moves and leaves the pane by angle — never a fade), composited as seen
//       (director ruling 1: era images are not mirrored);
//   (b) a screen-space era layer rendered by this module (the navigator's salt hand S001/S002, the future viewer S071/S078);
//   (c) true-mirror reflections of the present (her reflection, the moonlit doorways, the reflected moon): a mirror pass
//       renders the scene from the reflected camera (oblique near plane = the glass) into an RT that is sampled flipped in x;
//   (d) the dust film on G1's glass that the glove wipes (S001).
// Era layers are blurred by their own mirror depth (separable blur pass); the engine DOF handles the real scene, with a
// depth-only proxy at the navigator's hand so the engine blur follows that hand's mirror depth.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { glassMaterial, vitrine } from '../lib/glass.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';
import { blendHandChannels, handPose } from '../lib/hand.js';
import { moonSprite } from '../lib/sky.js';
import { needleChart } from './ship_cabin.js';

// (?nonest=1: dev/staging mode — the other eras are not loaded and their panes stay dark; never used for the film)
export const needs = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('nonest')) ? [] : ['sea_deck', 'ship_cabin', 'old_home', 'pier_waiting'];
const NONEST = needs.length === 0;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const hex = (h) => new THREE.Color(h);
// bible.json palette
const P = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P06: '#EDF1EF', P07: '#2B4A8B', P09: '#B08D57',
  P10: '#6E5536', P11: '#D2B27E', P12: '#5E8C7E', P13: '#E2A458', P15: '#D6C6A2', P16: '#A33A2E', P21: '#EBB894', P22: '#F5E4C8', P28: '#0A0F17',
  teak: '#5E4430', iron: '#3B4540', brick: '#7A4B3A', wash: '#A9A296', velvet: '#101A2A', velvet3: '#0E1622', plinth: '#2A2622',
  chartMuseum: '#CDB98C', foxing: '#A8875A', coat: '#3C4045', coatAged: '#5B5853', wear: '#5A5E62', linen: '#D8D1C2',
  rattan: '#A8783F', rattanDark: '#7A5530', strap: '#6A4A30', buckle: '#9A7D4E', lining: '#3B5578', liningFlower: '#E6E0D2',
  shirtMuseum: '#8392A0', shirtCollar: '#55667A', comb: '#C9A46A', combCloth: '#8E4A3C', pass: '#E4DAC2', passBorder: '#7C8B7E', stampFaded: '#7A6E8C',
  glove: '#F1EFE8', horn: '#3A2C22', future: '#CFCAC2',
};
const L_OVL = 3;      // glass panes + overlays (main camera only; never in the mirror pass → no feedback loop)
const L_MIR = 5;      // reflection-only extras (the reflected moon, doorway glow) — mirror pass only

// ---------------------------------------------------------------------------------------------------------- geometry
const GAL = { x0: -15, x1: 15, z0: -7, z1: 7, h: 6 };
const COLS_X = [-11.25, -6.75, -2.25, 2.25, 6.75, 11.25], COLS_Z = [-2.35, 2.35];
const DOORS_X = [-12, -6, 0, 6, 12], DOOR = { w: 2.4, spring: 3.2, r: 1.2, t: 0.6 };          // arched doorways, apex 4.4 m
const COR = { z0: 7.6, z1: 13.0, h: 5.2 };                                                       // verandah corridor beyond
const G1 = { x: 0, z: 3.6, w: 0.6, d: 0.6, h: 0.5, plinthH: 0.95 };
const G1F = G1.z + G1.d / 2;                                                                       // south glass face z
const G2 = { x: 2.35, z: 3.65, w: 1.2, d: 0.75, h: 0.9 };
const G3 = { xs: [-2.2, 0, 2.2], w: 1.4, d: 0.7, base: 0.32, top: 3.0, cap: 3.25, back: -7.0 };
const G3F = G3.back + G3.d;                                                                        // front glass z (−6.3)
const G3PZ = G3.back + G3.d - 0.012;                                                               // the glass surface itself
const DECK3 = 0.86;                                                                                 // G3 display deck height
// the opening camera (motion-control data reused by S071): lens height 1.18, 1.28 m from G1's south glass, 100 mm
const MC_OPEN = { pos: V(0, 1.18, G1F + 1.28), target: V(0, 1.18, G1F), mm: 100 };

// moon directions (light travel). INTRO 00:40 SE ~40° (bible §3.3); CH1B/INTERLUDE: cinematic cheat (ruling 2) — lower
// (≈19°) and SSE so the arched pools reach across the floor toward the north-wall vitrines.
const moonDir = (az, el) => { const a = az * D2R, e = el * D2R; return V(-Math.sin(a) * Math.cos(e), -Math.sin(e), Math.cos(a) * Math.cos(e)).normalize(); };
// az measured from north (−Z) clockwise; returned vector = direction the light TRAVELS (from the moon to the ground)
// (integration) CH1B/INTERLUDE moon lowered to 12° (az 150) — ruling 2's cheat — so the doorway pools reach the north-wall cases and
// the path she walks in S023 (at 17° only the arch tips reached that far: the gallery read black)
const MOON_INTRO = moonDir(166, 30), MOON_CH1 = moonDir(150, 12), MOON_FUT = moonDir(170, 24);

// ---------------------------------------------------------------------------------------------------------- canvas helpers
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb = true, wrap = false) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true; return t;
}
// arched doorway cookie (white = light passes): 2.4 × 4.4 m rectangle with a semicircular head from 3.2 m
function archCookie() {
  const W = 240, H = 440, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H - 320); g.arc(W / 2, H - 320, W / 2, Math.PI, 0); g.lineTo(W, H); g.closePath(); g.fill();
  g.filter = 'blur(2px)'; g.drawImage(c, 0, 0);
  return ctex(c, false);
}

export default async function create(ctx) {
  const { cam, util } = ctx;
  const { clamp, lerp, smoothstep, ease } = util;
  const ks = (k, t, e = ease.inOutSine) => util.keys(k, t, e);
  const Q = new URLSearchParams(location.search);
  const OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));       // perf / debug probes only (also window.__MGOFF per frame)
  const OFF0 = new Set(OFF);
  const SHOT_T0 = {}; for (const s of ctx.shots) if (s.scene === 'museum_gallery') SHOT_T0[s.id] = s.in_frame / 24;

  const scene = new THREE.Scene();
  scene.background = hex('#020305');
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 120);
  camera.layers.enable(L_OVL);
  const env = envTexture(ctx.renderer, 'night_museum', { moon: 1.2, warmth: 1.0, rotation: Math.PI });
  scene.environment = null;                     // per-material envMap only (full-screen IBL is expensive on SwiftShader)

  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const mesh = (g, m, parent, x = 0, y = 0, z = 0, cast = true, recv = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = recv; if (parent) parent.add(o); return o; };
  // merge the static meshes of a group per material (draw calls are expensive on SwiftShader)
  function mergeStatic(group) {
    group.updateMatrixWorld(true);
    const buckets = new Map();
    const kill = [];
    group.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.keep || Array.isArray(o.material)) return;
      const k = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '') + o.renderOrder;
      if (!buckets.has(k)) buckets.set(k, { m: o.material, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder, gs: [] });
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(o.matrixWorld.clone().premultiply(new THREE.Matrix4().copy(group.matrixWorld).invert()));
      buckets.get(k).gs.push(g); kill.push(o);
    });
    for (const o of kill) o.parent.remove(o);
    for (const b of buckets.values()) { const m = new THREE.Mesh(mergeGeometries(b.gs), b.m); m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.ro; group.add(m); }
  }

  // ======================================================================================================== MATERIALS
  const mTeak = TX.mat('teak', { repeat: [24, 11.2], tex: { seed: 51, wear: 0.6 }, color: hex('#b9a18a') });
  const mTeakCor = TX.mat('teak', { repeat: [2, 6], tex: { seed: 52 }, color: hex('#a8927c') });
  const mWall = TX.mat('plaster_museum', { repeat: [0.2, 0.2], tex: { tone: 'blue', seed: 41, cracks: 0.1 }, color: hex('#2c3850') });   // deep museum blue (P02) — dark, never cyan
  const mWallS = TX.mat('plaster_museum', { repeat: [0.2, 0.2], tex: { tone: 'blue', seed: 42, cracks: 0.1 }, color: hex('#2c3850') });
  const mBrick = TX.mat('brick', { repeat: [0.45, 0.45], tex: { limewash: 0.5, seed: 31 }, color: hex('#b8a89c') });
  const mCorWall = TX.mat('plaster_museum', { repeat: [0.25, 0.25], tex: { tone: 'grey', seed: 43 }, color: hex('#8e8a84') });
  const mBeam = TX.mat('wood_beam', { repeat: [1, 3] });
  const mCeil = std({ color: 0x3b3530, roughness: 0.9 });   // (integration) the timber boarding catches the pools' bounce (it read 0 at the top of S023)
  const mIron = std({ color: hex(P.iron), roughness: 0.5, metalness: 0.35, envMap: env, envMapIntensity: 0.35 });
  const mPlinth = std({ color: hex(P.plinth), roughness: 0.55 });
  const velvetStd = (rep, seed, tone = P.velvet3) => { const t = TX.withRepeat(TX.velvet({ tone, seed }), rep[0], rep[1]); return std({ map: t.map, normalMap: t.normalMap, roughness: 0.92 }); };   // (perf: MeshPhysical sheen cost ≈ 0.3 cpu-s)
  const mVelvet3 = velvetStd([3, 3], 61);
  const mDark = std({ color: 0x0c0d10, roughness: 0.6 });
  const mBronze = TX.mat('bronze', { repeat: [2, 2], tex: { patina: 0.2, seed: 71 }, roughness: 1, metalness: 1, color: hex('#6d6256'), envMap: env, envMapIntensity: 0.6 });
  const mAcrylic = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.18, envMap: env, envMapIntensity: 0.8, depthWrite: false });   // clear acrylic: only its reflections read
  const mWool = TX.mat('wool_coat', { repeat: [1.2, 1.2] });

  // ======================================================================================================== ROOM
  const room = new THREE.Group(); room.name = 'room'; scene.add(room);
  {
    const floor = mesh(new THREE.PlaneGeometry(30, 14.0), mTeak, room, 0, 0, 0, false, true); floor.rotation.x = -Math.PI / 2; floor.userData.keep = true; floor.name = 'floor';
    const ceil = mesh(new THREE.PlaneGeometry(30, 14.6), mCeil, room, 0, GAL.h, 0.3, true, true); ceil.rotation.x = Math.PI / 2;
    for (let x = -13.5; x <= 13.6; x += 4.5) mesh(box(0.28, 0.42, 14.2), mBeam, room, x, GAL.h - 0.21, 0.1, true, true);
    // north wall: plaster with two exposed brick panels flanking the G3 row (bible: brick partly exposed)
    const nw = mesh(new THREE.PlaneGeometry(30, GAL.h), mWall, room, 0, GAL.h / 2, GAL.z0, true, true);
    for (const x of [-6.2, 6.2]) mesh(new THREE.PlaneGeometry(3.4, 4.2), mBrick, room, x, 2.1, GAL.z0 + 0.012, false, true);
    for (const sx of [-1, 1]) { const w = mesh(new THREE.PlaneGeometry(14.6, GAL.h), mWall, room, sx * 15, GAL.h / 2, 0.3, true, true); w.rotation.y = -sx * Math.PI / 2; }
    // skirting
    mesh(box(30, 0.16, 0.03), mDark, room, 0, 0.08, GAL.z0 + 0.015, false, true);
    // (integration) cast-iron half-columns (pilasters) against the north wall between and beside the G3 cases: they catch a
    // silver moon edge and give the gallery between the panes a structure (S023 / S024 / S028)
    { const pr = [[0, 0], [0.16, 0], [0.16, 0.05], [0.13, 0.08], [0.11, 0.2], [0.09, 0.26], [0.085, 5.4], [0.12, 5.5], [0.15, 5.65], [0.15, 5.8], [0, 5.8]];
      const pg = new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 20, -Math.PI / 2, Math.PI);
      for (const x of [-3.3, -1.1, 1.1, 3.3]) { const m = mesh(pg.clone(), mIron, room, x, 0, GAL.z0 + 0.02, true, true); m.rotation.y = 0; } }
    // south wall with the five arched doorways (extruded: reveals catch the moon)
    const s = new THREE.Shape(); s.moveTo(-15.2, -0.05); s.lineTo(15.2, -0.05); s.lineTo(15.2, GAL.h + 0.05); s.lineTo(-15.2, GAL.h + 0.05); s.lineTo(-15.2, -0.05);
    for (const x of DOORS_X) { const h = new THREE.Path(); h.moveTo(x - DOOR.w / 2, 0); h.lineTo(x + DOOR.w / 2, 0); h.lineTo(x + DOOR.w / 2, DOOR.spring); h.absarc(x, DOOR.spring, DOOR.r, 0, Math.PI, false); h.lineTo(x - DOOR.w / 2, 0); s.holes.push(h); }
    const sg = new THREE.ExtrudeGeometry(s, { depth: DOOR.t, bevelEnabled: false, curveSegments: 20 });
    const sw = mesh(sg, mWallS, room, 0, 0, GAL.z1, true, true); sw.userData.keep = true; sw.name = 'southWall';
    // brick piers on the gallery face between doorways (exposed brick)
    for (let i = 0; i < DOORS_X.length - 1; i++) { const x = (DOORS_X[i] + DOORS_X[i + 1]) / 2; mesh(new THREE.PlaneGeometry(2.2, 3.6), mBrick, room, x, 1.8, GAL.z1 - 0.012, false, true).rotation.y = Math.PI; }
    // door reveals' stone thresholds
    for (const x of DOORS_X) mesh(box(DOOR.w, 0.02, DOOR.t), std({ color: 0x6b6862, roughness: 0.7 }), room, x, 0.01, GAL.z1 + DOOR.t / 2, false, true);
    // columns: lathe (moulded base, tapering shaft, capital) — merged
    const prof = [[0, 0], [0.22, 0], [0.22, 0.06], [0.19, 0.09], [0.17, 0.2], [0.135, 0.26], [0.115, 0.32], [0.112, 2.8], [0.1, 5.3], [0.11, 5.38], [0.16, 5.5], [0.2, 5.62], [0.2, 5.79], [0, 5.79]];
    const colG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    const cg = []; for (const x of COLS_X) for (const z of COLS_Z) cg.push(colG.clone().translate(x, 0, z));
    const cols = mesh(mergeGeometries(cg), mIron, room, 0, 0, 0, true, true); cols.userData.keep = true; cols.name = 'columns';
    // the verandah corridor beyond the doorways (glimpsed): floor, back wall, glazed arched outer wall + night sky
    const cfl = mesh(new THREE.PlaneGeometry(30, COR.z1 - COR.z0), mTeakCor, room, 0, 0.002, (COR.z0 + COR.z1) / 2, false, true); cfl.rotation.x = -Math.PI / 2; cfl.userData.keep = true;
    const cce = mesh(new THREE.PlaneGeometry(30, COR.z1 - COR.z0), mCeil, room, 0, COR.h, (COR.z0 + COR.z1) / 2, false, true); cce.rotation.x = Math.PI / 2;
    const os = new THREE.Shape(); os.moveTo(-15.2, -0.05); os.lineTo(15.2, -0.05); os.lineTo(15.2, COR.h + 0.05); os.lineTo(-15.2, COR.h + 0.05); os.lineTo(-15.2, -0.05);
    for (let x = -14; x <= 14.1; x += 4) { const h = new THREE.Path(); h.moveTo(x - 1.0, 0.6); h.lineTo(x + 1.0, 0.6); h.lineTo(x + 1.0, 3.6); h.absarc(x, 3.6, 1.0, 0, Math.PI, false); h.lineTo(x - 1.0, 0.6); os.holes.push(h); }
    const ow = mesh(new THREE.ExtrudeGeometry(os, { depth: 0.4, bevelEnabled: false, curveSegments: 16 }), mCorWall, room, 0, 0, COR.z1, false, true); ow.userData.keep = true;
    // slim steel glazing bars in the corridor windows (dark silhouettes against the sky)
    const barM = std({ color: 0x15181c, roughness: 0.5 });
    for (let x = -14; x <= 14.1; x += 4) { mesh(box(0.03, 4.0, 0.03), barM, room, x, 2.6, COR.z1 + 0.2, false, false); for (const y of [1.6, 2.6, 3.6]) mesh(box(2.0, 0.03, 0.03), barM, room, x, y, COR.z1 + 0.2, false, false); }
    // night sky beyond the corridor glazing (unlit gradient + soft moon glow toward the SSE)
    const skc = canvas(8, 256), sk = skc.getContext('2d'); const gr = sk.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#101826'); gr.addColorStop(0.55, '#2a3a52'); gr.addColorStop(0.82, '#4a5a72'); gr.addColorStop(1, '#161c26'); sk.fillStyle = gr; sk.fillRect(0, 0, 8, 256);
    const skyM = new THREE.MeshBasicMaterial({ map: ctex(skc), color: new THREE.Color(0.55, 0.62, 0.8), fog: false });
    const sky = mesh(new THREE.PlaneGeometry(60, 14), skyM, room, 0, 4, COR.z1 + 2.5, false, false); sky.rotation.y = Math.PI; sky.name = 'sky'; sky.userData.keep = true;
    room.userData.skyM = skyM; room.userData.skyNight = skyM.map; room.userData.sky = sky;
    // the not-yet-dawn sky of the future (S078): blue-grey #5B6F8A, the faintest peach at the horizon
    { const dc = canvas(8, 256), dg = dc.getContext('2d'), g2 = dg.createLinearGradient(0, 0, 0, 256);
      g2.addColorStop(0, '#34405a'); g2.addColorStop(0.45, '#5B6F8A'); g2.addColorStop(0.64, '#8a8d9c'); g2.addColorStop(0.70, '#b2a6a4'); g2.addColorStop(0.73, '#5d6470'); g2.addColorStop(1, '#2a2e36');
      dg.fillStyle = g2; dg.fillRect(0, 0, 8, 256); room.userData.skyDawn = ctex(dc); }
  }
  mergeStatic(room);

  // ======================================================================================================== G1 — compass vitrine (future: the folded coat)
  const g1 = vitrine({ w: G1.w, d: G1.d, h: G1.h, plinthH: G1.plinthH, frame: 0, deck: 'velvet', light: 'spot', lightIntensity: 2.2, res: [ctx.W, ctx.H],
    glass: { haze: 0.12, dust: 0.08, hazeLevel: 0.012, envMapIntensity: 0.25, reflect: 0.5 }, front: { haze: 0.08, dust: 0.04 } });
  g1.object3D.position.set(G1.x, 0, G1.z); scene.add(g1.object3D);
  for (const p of Object.values(g1.panes)) p.layers.set(L_OVL);
  // perf: the back / side / top panes get a cheap additive env-reflection glass (no per-light shading); the front pane keeps the
  // full lib glass (+ overlays). Edge strips of the frameless hood stay.
  const cheapGlass = new THREE.MeshBasicMaterial({ color: 0x000000, envMap: env, reflectivity: 1, combine: THREE.MixOperation, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const k of ['back', 'left', 'right', 'top']) g1.panes[k].material = cheapGlass;
  for (const gm of Object.values(g1.glass)) { gm.material.envMap = env; }
  g1.plinth.material = mPlinth;
  g1.object3D.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x16211e) { o.material.roughness = 0.65; o.material.opacity = 0.4; o.material.color.set(0x070b0a); } });
  // the frameless hood's polished glass edges: faint pale-green lines (low-iron edge) so the cover reads in the wider frames
  {
    g1.object3D.updateMatrixWorld(true);
    const bb = new THREE.Box3(); for (const p of Object.values(g1.panes)) bb.expandByObject(p);
    const edgeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.13, 0.12), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const e = 0.003, { min, max } = bb, cx = (min.x + max.x) / 2, cz = (min.z + max.z) / 2, w = max.x - min.x, d = max.z - min.z, h = max.y - min.y;
    const edges = new THREE.Group(); edges.name = 'g1edges'; scene.add(edges);
    for (const [x, z] of [[min.x, min.z], [max.x, min.z], [min.x, max.z], [max.x, max.z]]) mesh(box(e, h, e), edgeM, edges, x, (min.y + max.y) / 2, z, false, false);
    for (const y of [min.y + e, max.y]) { for (const z of [min.z, max.z]) mesh(box(w, e, e), edgeM, edges, cx, y, z, false, false); for (const x of [min.x, max.x]) mesh(box(e, e, d), edgeM, edges, x, y, cz, false, false); }
    edges.traverse((o) => { o.renderOrder = 63; });
    edges.userData.m = edgeM;
  }
  const g1Velvet = velvetStd([1, 1], 40, P.velvet); g1.deck.material = g1Velvet; const g1Deck = g1.deck;
  g1.object3D.traverse((o) => { if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false; });   // lib pool decal: the real pin spot does it
  const DECK1 = g1.deckY;                                                     // 0.97
  // the brass compass (museum state) on its 15° acrylic cradle, south (red needle end) toward lower left in the S003 view
  const compass = new THREE.Group(); compass.name = 'compass'; scene.add(compass);
  const COMP_R = 0.075, FACE_R = 0.0715, WELL_R = 0.0207, COMP_ROT = -0.7;
  const compPivot = new THREE.Group(); compass.add(compPivot);
  {
    compass.position.set(G1.x, DECK1 + 0.105, G1.z - 0.02);
    compPivot.rotation.x = 15 * D2R;                                          // tilted 15° toward the south glass (camera)
    const mBrassM = TX.mat('brass', { repeat: [1, 1], tex: { tone: 'museum', patina: 0.5, polish: 0.35, seed: 9 }, roughness: 0.85, metalness: 0.72, envMap: env, envMapIntensity: 2.4, color: hex('#c2a47c') });
    const pr = [[0, -0.032], [COMP_R - 0.002, -0.032], [COMP_R, -0.03], [COMP_R + 0.0005, -0.001], [COMP_R - 0.0008, 0.003], [COMP_R - 0.0035, 0.0033], [FACE_R + 0.0004, 0.0024], [FACE_R, 0.0002]];
    const body = mesh(new THREE.LatheGeometry(pr.map(([a, b]) => new THREE.Vector2(a, b)), 96), mBrassM, compPivot); body.castShadow = true;
    const faceM = TX.mat('compass', { tex: { state: 'museum', seed: 6 }, envMap: env, envMapIntensity: 0.8 });
    const face = mesh(new THREE.RingGeometry(WELL_R, FACE_R, 96, 2), faceM, compPivot); face.rotation.x = -Math.PI / 2; face.rotation.z = COMP_ROT;   // dial north (子) toward the upper right → 午 (south) at the lower left of the S003 frame
    const well = mesh(new THREE.CircleGeometry(WELL_R, 48), std({ color: 0x8a7553, roughness: 0.55, envMap: env, envMapIntensity: 0.4 }), compPivot, 0, -0.0055, 0); well.rotation.x = -Math.PI / 2;
    const wall = mesh(new THREE.CylinderGeometry(WELL_R, WELL_R, 0.0058, 48, 1, true), std({ color: 0x2a2018, roughness: 0.5, side: THREE.BackSide }), compPivot, 0, -0.0029, 0, false);
    // needle: blued steel, faint rust, red-lacquer south tip; points south (local −Z after the face flip → toward camera-left)
    const needle = new THREE.Group(); needle.position.y = -0.0018; compPivot.add(needle); needle.rotation.y = COMP_ROT;   // red south tip on 午, toward the lower left of the S003 frame
    const L = 0.018, wN = 0.0027, hN = 0.0008, ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute([0, hN, L, wN, 0, 0, 0, hN, -L, -wN, 0, 0, 0, -hN * 0.3, L * 0.98, 0, -hN * 0.3, -L * 0.98], 3));
    ng.setIndex([0, 1, 2, 0, 2, 3, 4, 1, 0, 5, 2, 1, 0, 3, 4, 2, 5, 3, 1, 4, 5, 3, 5, 4]); ng.computeVertexNormals();
    mesh(ng, new THREE.MeshPhysicalMaterial({ color: 0x1a2028, metalness: 0.7, roughness: 0.38, clearcoat: 0.3, envMap: env, envMapIntensity: 0.55, flatShading: true }), needle);
    const red = mesh(new THREE.SphereGeometry(0.0021, 16, 10), new THREE.MeshPhysicalMaterial({ color: P.P16, roughness: 0.45, clearcoat: 0.4, envMap: env }), needle, 0, hN * 0.35, L * 0.8); red.scale.set(0.75, 0.42, 1.25);
    mesh(new THREE.SphereGeometry(0.0019, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mBrassM, needle, 0, hN * 0.4, 0).scale.y = 0.8;
    // mica cover with the crack at 乾 (NW) — the time mark
    const mc = canvas(256, 256), mg = mc.getContext('2d'), mr = util.rng(51);
    mg.fillStyle = 'rgba(255,244,222,0.07)'; mg.fillRect(0, 0, 256, 256);   // review: the opaque-white mica washed the well to a beige plate and hid the needle
    for (let k = 0; k < 70; k++) { mg.fillStyle = `rgba(${150 + mr() * 60},${120 + mr() * 50},${60 + mr() * 40},${0.03 + mr() * 0.06})`; mg.beginPath(); mg.ellipse(mr() * 256, mr() * 256, 10 + mr() * 60, 3 + mr() * 14, mr() * 3.1, 0, 6.283); mg.fill(); }
    mg.strokeStyle = 'rgba(40,30,20,0.9)'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(40, 52); mg.lineTo(70, 80); mg.lineTo(84, 86); mg.lineTo(105, 112); mg.stroke();
    mg.strokeStyle = 'rgba(255,250,235,0.9)'; mg.lineWidth = 1; mg.beginPath(); mg.moveTo(41, 50); mg.lineTo(71, 78); mg.lineTo(85, 84); mg.lineTo(106, 110); mg.stroke();
    const mica = mesh(new THREE.CircleGeometry(WELL_R + 0.0012, 64), new THREE.MeshPhysicalMaterial({ color: 0xffe2a8, map: ctex(mc), transparent: true, opacity: 1.0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 1.3, depthWrite: false }), compPivot, 0, 0.0004, 0, false);
    mica.rotation.x = -Math.PI / 2; mica.rotation.z = COMP_ROT; mica.renderOrder = 5;
    // acrylic cradle: a tilted slab + two side cheeks
    const cr = mesh(box(0.13, 0.005, 0.13), mAcrylic, compPivot, 0, -0.036, 0, false, false); cr.renderOrder = 6;
    for (const sx of [-1, 1]) { const ch = mesh(box(0.005, 0.07, 0.05), mAcrylic, compass, sx * 0.05, -0.07, 0.01, false, false); ch.renderOrder = 6; }
    compass.traverse((o) => { if (o.isMesh && o.material !== mAcrylic) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // the future: linen-covered board tilted 12°, the folded aged coat (left cuff on top toward the glass, worn spot up), blank label
  const future = new THREE.Group(); future.name = 'future'; scene.add(future); future.visible = false;
  const coat = new THREE.Group(); future.add(coat);
  const mLinen = TX.mat('linen', { repeat: [2.2, 2.2], tex: { tone: 'linen', seed: 15, creases: 0.12 }, color: hex('#e9e2d4') });
  const mCoatAged = TX.mat('wool_coat', { repeat: [2.6, 2.2], tex: { tone: P.coatAged, pill: 0.9, seed: 35 } });
  {
    const board = mesh(box(0.54, 0.025, 0.5), mLinen, future, 0, 0, 0); board.name = 'board';
    future.position.set(G1.x, DECK1 + 0.06, G1.z - 0.01); future.rotation.x = 12 * D2R;      // linen board, raised at the back
    // the folded coat (PROP_COAT future state, ~44 × 36 cm): one sculpted cushion — rounded edges, collar roll and lapels at
    // the back, placket with three dull horn buttons, the LEFT sleeve folded diagonally across the front, its cuff at the
    // front-left corner toward the glass with the worn spot up; soft creases, pilled aged wool #5B5853
    const N = TX.makeNoise(77), BX = 0.22, BZ = 0.18;
    const A = [-0.125, 0.128], B = [0.13, -0.105];                       // sleeve: cuff end (front-left) → shoulder (back-right)
    const seg = (x, z, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz)); return [Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t), t]; };
    const Hc = (x, z) => {
      const e = Math.min(BX - Math.abs(x), BZ - Math.abs(z)); if (e <= 0) return 0;
      const round = Math.sqrt(clamp(e / 0.024));
      let h = 0.036 * round + 0.004 * N.fbm(x * 5 + 0.3, z * 5 + 0.7, 3, 4) * round;
      h += 0.013 * Math.exp(-(((z + 0.15) / 0.016) ** 2)) * smoothstep(0.18, 0.12, Math.abs(x)) * round;          // collar roll
      for (const sx of [-1, 1]) { const [d] = seg(x, z, [sx * 0.11, -0.14], [0.015, 0.02]); h += 0.005 * Math.exp(-((d / 0.01) ** 2)) * round; }   // lapel edges
      const [ds, ts] = seg(x, z, A, B);                                    // the folded sleeve ridge
      h += 0.022 * Math.pow(Math.max(0, 1 - (ds / 0.054) ** 2), 0.55) * smoothstep(0.0, 0.08, ts) * round;
      h -= 0.0035 * Math.exp(-(((x * 0.8 + z * 0.6 - 0.04) / 0.006) ** 2)) * round + 0.0025 * Math.exp(-(((x - 0.06) / 0.005) ** 2)) * smoothstep(0.0, 0.1, z) * round;   // creases
      return h;
    };
    const cg = new THREE.PlaneGeometry(BX * 2, BZ * 2, 96, 80); cg.rotateX(-Math.PI / 2);
    { const pa = cg.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, Hc(pa.getX(i), pa.getZ(i))); cg.computeVertexNormals(); }
    mesh(cg, mCoatAged, coat);
    const hornM = std({ color: hex('#2e2620'), roughness: 0.8 });
    for (let k = 0; k < 3; k++) { const x = 0.105, z = -0.06 + k * 0.075; const bt = mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.004, 20), hornM, coat, x, Hc(x, z) + 0.0015, z); bt.rotation.x = 0.03; }
    // the cuff: an open, flattened tube continuing the sleeve past its end, hem rim, dark lining, the worn patch on top
    const dC = V(A[0] - B[0], 0, A[1] - B[1]).normalize(), up = V(0, 1, 0), xC = new THREE.Vector3().crossVectors(dC, up);
    const basis = new THREE.Matrix4().makeBasis(xC, dC, up);
    const cuff = new THREE.Group(); coat.add(cuff); cuff.quaternion.setFromRotationMatrix(basis);
    const c0 = V(A[0], 0, A[1]); c0.y = Hc(A[0], A[1]) - 0.019; cuff.position.copy(c0).addScaledVector(dC, 0.012);
    const tube = new THREE.CylinderGeometry(0.047, 0.048, 0.075, 40, 6, true); tube.scale(1, 1, 0.48); tube.translate(0, 0.0375, 0);
    { const pa = tube.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const a = Math.atan2(z, x);
      pa.setXYZ(i, x * (1 + 0.03 * Math.sin(a * 5 + y * 60)), y, z * (1 + 0.05 * Math.sin(a * 3 + 1))); } tube.computeVertexNormals(); }
    mesh(tube, mCoatAged, cuff);
    mesh(tube, std({ color: 0x1f1d1b, roughness: 0.95, side: THREE.BackSide }), cuff, 0, 0, 0, false, true);
    const rim = mesh(new THREE.TorusGeometry(0.047, 0.0045, 8, 48), mCoatAged, cuff, 0, 0.075, 0); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 0.48, 1);
    // worn patch 18 × 8 mm, ~1 cm in from the cuff edge, on the upper face: paler, raised nap, a little sheen
    const wc = canvas(128, 64), wg = wc.getContext('2d'), wr = util.rng(23);
    // a soft-edged rubbed ellipse (paler, flattened nap) + pills of lifted fibre
    wg.filter = 'blur(6px)'; wg.fillStyle = 'rgba(130,127,120,0.95)'; wg.beginPath(); wg.ellipse(64, 32, 55, 24, 0, 0, 6.283); wg.fill(); wg.filter = 'none';
    for (let k = 0; k < 900; k++) { const a = wr() * 6.283, rr = Math.sqrt(wr()); const x = 64 + Math.cos(a) * 54 * rr, y = 32 + Math.sin(a) * 23 * rr;
      const v = 128 + wr() * 52; wg.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.35 + 0.5 * wr()})`; wg.fillRect(x, y, 1 + wr() * 2.2, 1 + wr() * 1.5); }
    const wornM = new THREE.MeshStandardMaterial({ map: ctex(wc), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const worn = mesh(new THREE.PlaneGeometry(0.02, 0.0095), wornM, cuff, 0, 0.075 - 0.011, 0.0247, false, true);   // upper face of the flattened tube
    // (cuff frame: x around the cuff, y along the sleeve axis, z up — the plane's own axes: 20 mm around, 9.5 mm along)
    coat.userData.worn = worn;
    coat.position.set(0.0, 0.0125, 0.0);
    coat.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // blank label card at the plinth's right front (no text)
  const label = mesh(box(0.09, 0.055, 0.004), std({ color: 0xe9e5dc, roughness: 0.85 }), future, 0.235, 0.012, 0.2); label.rotation.x = -0.75;
  // ======================================================================================================== G2 — chart flat case (T03 registry with ship_cabin S005)
  const g2 = new THREE.Group(); g2.name = 'g2'; scene.add(g2); g2.position.set(G2.x, 0, G2.z);
  const CH = { L: 0.60, Wd: 0.32 };
  const FRAME_W = CH.L / 0.9, FRAME_H = FRAME_W / 2.39;                   // the S004/S005 crop at the chart
  const chartBoard = new THREE.Group(); g2.add(chartBoard);
  let g2Glass, g2GlassMesh, chartMesh;
  {
    mesh(box(G2.w, G2.h - 0.12, G2.d), mPlinth, g2, 0, (G2.h - 0.12) / 2, 0);
    // case well (dark linen) + walls, glass top at G2.h
    mesh(box(G2.w - 0.06, 0.01, G2.d - 0.06), std({ color: 0x1b1f27, roughness: 0.9 }), g2, 0, G2.h - 0.115, 0);
    for (const sz of [-1, 1]) mesh(box(G2.w, 0.12, 0.03), mPlinth, g2, 0, G2.h - 0.06, sz * (G2.d / 2 - 0.015));
    for (const sx of [-1, 1]) mesh(box(0.03, 0.12, G2.d), mPlinth, g2, sx * (G2.w / 2 - 0.015), G2.h - 0.06, 0);
    // acid-free board tilted 10° (raised at the north/back = chart top), dark grey-blue linen covering
    chartBoard.position.set(0, G2.h - 0.085, 0.0); chartBoard.rotation.x = 10 * D2R;
    mesh(box(1.02, 0.012, 0.56), std({ color: 0x2a2e36, roughness: 0.92 }), chartBoard, 0, 0, 0);
    // the chart: museum-state needle-route chart card, 0.60 × 0.32 m, long axis along X, top edge toward −Z (north)
    const ct = needleChart('museum');
    chartMesh = mesh(new THREE.PlaneGeometry(CH.L, CH.Wd), std({ map: ct.map, normalMap: ct.normalMap || null, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.88, envMap: env, envMapIntensity: 0.15 }), chartBoard, 0, 0.0068, 0, false, true);
    chartMesh.rotation.x = -Math.PI / 2;
    // the rolled remainder of the scroll at the left end, in a padded trough
    const roll = mesh(new THREE.CylinderGeometry(0.016, 0.016, CH.Wd + 0.004, 32), std({ color: hex('#bfae86'), roughness: 0.86 }), chartBoard, -CH.L / 2 - 0.012, 0.018, 0); roll.rotation.x = Math.PI / 2;
    // two clear acrylic strips where S005's brass weights lie (T03: strip 1 vertical at frame x≈0.10, strip 2 along the top x 0.55–0.95)
    const stripM = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.05, transparent: true, opacity: 0.22, envMap: env, envMapIntensity: 1.0, depthWrite: false });
    const s1 = mesh(new RoundedBoxGeometry(0.024, 0.006, 0.2, 2, 0.0025), stripM, chartBoard, 0, 0.0105, 0, false, false); s1.name = 'strip1'; s1.renderOrder = 7;
    const s2 = mesh(new RoundedBoxGeometry(0.27, 0.006, 0.024, 2, 0.0025), stripM, chartBoard, 0, 0.0105, 0, false, false); s2.name = 'strip2'; s2.renderOrder = 7;
    // registry: frame centre over the chart at v = 0.669 from the top edge (ship_cabin S005); place the strips in frame coords
    const vC = 1 - (0.88 - 0.5) * FRAME_H / CH.Wd;                         // 0.669
    const fr2loc = (fx, fy) => V((fx - 0.5) * FRAME_W, 0, -CH.Wd / 2 + vC * CH.Wd + (fy - 0.5) * FRAME_H);
    s1.position.copy(fr2loc(0.10, 0.50)).setY(0.0105); s2.position.copy(fr2loc(0.75, 0.06)).setY(0.0105);
    chartBoard.userData.fr2loc = fr2loc;
    // glass top (horizontal)
    g2Glass = glassMaterial({ haze: 0.05, dust: 0.03, hazeLevel: 0.006, envMapIntensity: 0.15, reflect: 0.03, res: [ctx.W, ctx.H], aspect: G2.w / G2.d, smudgeRepeat: [2, 1.2] });   // the shot uses a polariser: no top reflections
    g2Glass.material.envMap = env;
    g2GlassMesh = new THREE.Mesh(new THREE.PlaneGeometry(G2.w - 0.02, G2.d - 0.02), g2Glass.material); g2GlassMesh.rotation.x = -Math.PI / 2; g2GlassMesh.position.y = G2.h; g2GlassMesh.renderOrder = 60; g2GlassMesh.layers.set(L_OVL); g2.add(g2GlassMesh);
    g2.traverse((o) => { if (o.isMesh && o !== g2GlassMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  }
  const g2Light = new THREE.SpotLight(0xffd8ae, 0, 0, 0.42, 0.9, 2); g2Light.position.set(G2.x - 0.9, 2.4, G2.z + 0.9); g2Light.target.position.set(G2.x, G2.h - 0.08, G2.z); scene.add(g2Light, g2Light.target);

  // ======================================================================================================== G3 — three tall wall vitrines
  const g3 = []; const g3Grp = new THREE.Group(); g3Grp.name = 'g3'; scene.add(g3Grp);
  const mVitBack = velvetStd([2, 3], 62);
  // dimmed 3000 K wall-case light: a lit back panel, brightest under the cornice strip, falling off toward the deck
  const g3GlowTex = (() => { const c = canvas(64, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.14)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0.03)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,0.6)'); h.addColorStop(0.2, 'rgba(0,0,0,0)'); h.addColorStop(0.8, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256); return ctex(c); })();
  const mLiningT = (() => { const W = 512, c = canvas(W, W), g = c.getContext('2d'), r = util.rng(77); g.fillStyle = '#334a68'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(20,30,50,${0.04 + r() * 0.05})`; g.fillRect(r() * W, r() * W, 2, 6 + r() * 20); }
    for (let y = 16; y < W; y += 32) for (let x = (y / 32 % 2) * 16 + 8; x < W; x += 32) { const xx = x + (r() - 0.5) * 4, yy = y + (r() - 0.5) * 4; g.fillStyle = `rgba(220,216,204,${0.6 + r() * 0.2})`;
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + 0.4; g.beginPath(); g.ellipse(xx + Math.cos(a) * 3.2, yy + Math.sin(a) * 3.2, 2.6, 1.5, a, 0, 6.283); g.fill(); } g.beginPath(); g.arc(xx, yy, 1.1, 0, 6.283); g.fill(); }
    const t = ctex(c, true, true); t.repeat.set(1.6, 1.6); return t; })();
  const mLining = std({ map: mLiningT, roughness: 0.92 });
  for (let i = 0; i < 3; i++) {
    const v = { grp: new THREE.Group(), x: G3.xs[i] };
    v.grp.position.set(v.x, 0, G3.back); g3Grp.add(v.grp);
    const W = G3.w, D = G3.d;
    const shell = new THREE.Group(); v.grp.add(shell);
    mesh(box(W, G3.base, D), mPlinth, shell, 0, G3.base / 2, D / 2);
    mesh(box(W, G3.cap - G3.top, D), mPlinth, shell, 0, (G3.top + G3.cap) / 2, D / 2);
    mesh(new THREE.PlaneGeometry(W - 0.02, G3.top - G3.base), mVitBack, shell, 0, (G3.top + G3.base) / 2, 0.012, false, true);
    for (const sx of [-1, 1]) { const sd = mesh(new THREE.PlaneGeometry(D, G3.top - G3.base), mVitBack, shell, sx * (W / 2 - 0.01), (G3.top + G3.base) / 2, D / 2, false, true); sd.rotation.y = -sx * Math.PI / 2; }
    // slim bronze frame (these are framed wall cases, unlike the frameless G1)
    for (const sx of [-1, 1]) mesh(box(0.03, G3.top - G3.base, 0.03), mBronze, shell, sx * (W / 2 - 0.015), (G3.top + G3.base) / 2, D - 0.015);
    mesh(box(W, 0.03, 0.03), mBronze, shell, 0, G3.top - 0.015, D - 0.015); mesh(box(W, 0.03, 0.03), mBronze, shell, 0, G3.base + 0.015, D - 0.015);
    // display deck (velvet) at DECK3, and the interior light strip under the cornice (emissive) + a soft glow on the back
    mesh(box(W - 0.04, 0.03, D - 0.06), mVelvet3, shell, 0, DECK3 - 0.015, D / 2 - 0.01);
    mesh(box(W - 0.04, DECK3 - G3.base - 0.03, 0.02), mPlinth, shell, 0, (DECK3 + G3.base) / 2 - 0.015, D - 0.05);
    mergeStatic(shell);
    const strip = mesh(box(W - 0.12, 0.008, 0.016), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.7).multiplyScalar(0.22) }), v.grp, 0, G3.top - 0.035, D - 0.14, false, false);   // (integration) dim 3000 K warm-white (it bloomed lilac)
    const glowM = new THREE.MeshBasicMaterial({ map: g3GlowTex, color: new THREE.Color(0.95, 0.74, 0.52).multiplyScalar(0.055), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const gl = mesh(new THREE.PlaneGeometry(W - 0.05, G3.top - G3.base - 0.05), glowM, v.grp, 0, (G3.top + G3.base) / 2, 0.016, false, false); gl.renderOrder = 8;
    const poolM = new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), color: new THREE.Color(0.95, 0.74, 0.52).multiplyScalar(0.09), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const pool = mesh(new THREE.PlaneGeometry(W * 0.95, D * 0.9), poolM, v.grp, 0, DECK3 + 0.002, D / 2, false, false); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 8;
    v.strip = strip; v.glow = gl; v.glowC = glowM.color.clone();
    // front glass (G3c: a door hinged on its east edge)
    const gm = glassMaterial({ haze: 0.22, dust: 0.12, hazeLevel: 0.012, envMapIntensity: 0.55, reflect: 0.55, res: [ctx.W, ctx.H], aspect: (W - 0.06) / (G3.top - G3.base - 0.06), smudgeRepeat: [2.2, 4], seed: 20 + i });
    gm.material.envMap = env;
    const pg = new THREE.PlaneGeometry(W - 0.06, G3.top - G3.base - 0.06);
    const pane = new THREE.Mesh(pg, gm.material); pane.renderOrder = 60; pane.layers.set(L_OVL);
    const door = new THREE.Group(); door.position.set(W / 2 - 0.03, (G3.top + G3.base) / 2, D - 0.012); v.grp.add(door);
    pane.position.set(-(W - 0.06) / 2, 0, 0); door.add(pane);
    v.pane = pane; v.glass = gm; v.door = door;
    if (i === 2) { // door edge stile + a small brass handle (only G3c opens)
      const st = mesh(box(0.012, G3.top - G3.base - 0.06, 0.012), mBronze, door, -(W - 0.06), 0, 0.006); void st;
      mesh(box(0.012, 0.12, 0.02), mBronze, door, -(W - 0.06) + 0.04, -0.2, 0.02);
    }
    v.contents = new THREE.Group(); v.grp.add(v.contents);
    g3.push(v);
  }
  // --- G3a navigation: needle-route book (closed, on a wedge), sounding lead on its line, a folded chart
  {
    const c = g3[0].contents;
    const wedge = mesh(box(0.3, 0.02, 0.22), mAcrylic, c, -0.25, DECK3 + 0.03, 0.34, false, false); wedge.rotation.x = -0.35;
    const book = mesh(box(0.24, 0.035, 0.17), std({ color: 0x4a3a2a, roughness: 0.8 }), c, -0.25, DECK3 + 0.07, 0.34); book.rotation.x = -0.35;
    mesh(box(0.235, 0.03, 0.005), std({ color: 0xcdbb94, roughness: 0.9 }), c, -0.25, DECK3 + 0.073, 0.428).rotation.x = -0.35;
    const lead = mesh(new THREE.CylinderGeometry(0.022, 0.034, 0.16, 16), std({ color: 0x55585c, roughness: 0.55, metalness: 0.6, envMap: env, envMapIntensity: 0.4 }), c, 0.32, 1.32, 0.35); void lead;
    mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.0, 6), std({ color: 0x7a6a50, roughness: 0.9 }), c, 0.32, 1.9, 0.35, false);
    mesh(box(0.34, 0.012, 0.22), std({ color: hex(P.chartMuseum), roughness: 0.9 }), c, 0.15, DECK3 + 0.007, 0.32);
  }
  // --- G3b household: the EMPTY acrylic mount at eye height (for the bowl being restored) + other blue-and-white sherds low
  let bracketPos;
  {
    const c = g3[1].contents;
    const MY = 1.42;
    const mMount = new THREE.MeshStandardMaterial({ color: 0x8e98a2, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.32, envMap: env, envMapIntensity: 1.4, depthWrite: false });
    const ring = mesh(new THREE.TorusGeometry(0.045, 0.0035, 8, 40), mMount, c, 0, MY + 0.02, 0.33, false, false); ring.rotation.x = Math.PI / 2; ring.renderOrder = 6;
    const stem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), mMount, c, 0, MY - 0.02, 0.33, false, false); stem.renderOrder = 6;
    const shelf = mesh(box(0.3, 0.012, 0.22), mAcrylic, c, 0, MY - 0.066, 0.3, false, false); shelf.renderOrder = 6;
    for (const sx of [-0.13, 0.13]) { const arm = mesh(new THREE.BoxGeometry(0.006, 0.12, 0.006), mMount, c, sx * 0.4, MY, 0.33, false, false); arm.rotation.z = sx > 0 ? -0.5 : 0.5; arm.renderOrder = 6; }
    bracketPos = V(G3.xs[1], MY, G3.back + 0.33);
    const shardM = TX.mat('porcelain_tile', { tex: { seed: 5 }, envMap: env, envMapIntensity: 0.6 });
    const rr = util.rng(91);
    for (let k = 0; k < 6; k++) { const s = mesh(new THREE.CircleGeometry(0.03 + rr() * 0.025, 5 + (k % 3)), shardM, c, -0.45 + k * 0.17, DECK3 + 0.004 + rr() * 0.003, 0.25 + rr() * 0.15); s.rotation.x = -Math.PI / 2 + 0.25; s.rotation.z = rr() * 6; }
  }
  // --- G3c migration: the open rattan case (museum state), shirt with the cut corner, comb on its unwrapped cloth, travel pass
  const caseG = new THREE.Group(); caseG.name = 'case'; g3[2].contents.add(caseG);
  const CASE = { W: 0.58, D: 0.38, H: 0.16, t: 0.012 };
  let caseLid, shirtG, combG, passG, stampPt = V();
  {
    const ratt = TX.mat('rattan', { repeat: [5, 1.6], tex: { seed: 13, age: 0.9 }, color: hex('#b6a590') });
    const rattTop = TX.mat('rattan', { repeat: [5, 3.3], tex: { seed: 13, age: 0.9 }, color: hex('#b6a590') });
    const leather = std({ color: hex(P.strap).multiplyScalar(0.62), roughness: 0.7 });
    const buckleM = std({ color: hex(P.buckle).multiplyScalar(0.62), metalness: 0.8, roughness: 0.5, envMap: env, envMapIntensity: 0.5 });
    const { W, D, H, t } = CASE;
    // case local frame: origin bottom centre, +Z = front (handle) toward the glass, hinge along the back top edge
    mesh(box(W, t, D), rattTop, caseG, 0, t / 2, 0);
    mesh(box(W, H, t), ratt, caseG, 0, H / 2, D / 2 - t / 2); mesh(box(W, H, t), ratt, caseG, 0, H / 2, -D / 2 + t / 2);
    mesh(box(t, H, D), ratt, caseG, W / 2 - t / 2, H / 2, 0); mesh(box(t, H, D), ratt, caseG, -W / 2 + t / 2, H / 2, 0);
    const lin = (w, h, x, y, z, rx, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), mLining, caseG, x, y, z, false); m.rotation.set(rx, ry, 0); return m; };
    lin(W - 2 * t, D - 2 * t, 0, t + 0.001, 0, -Math.PI / 2, 0);
    lin(W - 2 * t, H - t, 0, H / 2 + t / 2, D / 2 - t - 0.001, 0, Math.PI); lin(W - 2 * t, H - t, 0, H / 2 + t / 2, -D / 2 + t + 0.001, 0, 0);
    lin(D - 2 * t, H - t, W / 2 - t - 0.001, H / 2 + t / 2, 0, 0, -Math.PI / 2); lin(D - 2 * t, H - t, -W / 2 + t + 0.001, H / 2 + t / 2, 0, 0, Math.PI / 2);
    for (const z of [D / 2, -D / 2]) mesh(box(W + 0.006, 0.016, 0.016), leather, caseG, 0, H - 0.004, z);
    for (const x of [W / 2, -W / 2]) mesh(box(0.016, 0.016, D + 0.006), leather, caseG, x, H - 0.004, 0);
    for (const x of [W / 2, -W / 2]) for (const z of [D / 2, -D / 2]) mesh(box(0.05, 0.05, 0.05), leather, caseG, x * 0.97, 0.024, z * 0.95);
    // lid hinged at the back, propped open against the back velvet; one corner strip broken and lifting
    caseLid = new THREE.Group(); caseLid.position.set(0, H, -D / 2); caseG.add(caseLid);
    const LH = 0.05;
    mesh(box(W, LH, D), [ratt, ratt, rattTop, mLining, ratt, ratt], caseLid, 0, LH / 2, D / 2);
    for (const x of [-0.17, 0.17]) { mesh(box(0.032, 0.004, D + 0.012), leather, caseLid, x, LH + 0.002, D / 2); mesh(box(0.032, 0.09, 0.004), leather, caseLid, x, LH - 0.04, D + 0.004); mesh(box(0.04, 0.032, 0.008), buckleM, caseLid, x, LH - 0.03, D + 0.008); }
    for (let k = 0; k < 4; k++) { const st = mesh(box(0.004, 0.0015, 0.05 + k * 0.006), std({ color: 0x6a4a2c, roughness: 0.8 }), caseLid, W / 2 - 0.05 - k * 0.006, LH + 0.004 + k * 0.002, D - 0.04); st.rotation.x = -0.25 - k * 0.07; }
    caseLid.rotation.x = -1.95;
    const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), std({ color: 0x4e3524, roughness: 0.6 }), caseG, 0, H - 0.03, D / 2 + 0.03); handle.rotation.z = Math.PI / 2;
    for (const x of [-0.085, 0.085]) mesh(box(0.02, 0.04, 0.035), leather, caseG, x, H - 0.03, D / 2 + 0.014);
    // PROP_SHIRT, museum state: the same folded 30×22 block as pier_waiting, faded #8392A0, folds paler, cut hem corner up
    shirtG = new THREE.Group(); shirtG.name = 'shirt'; caseG.add(shirtG); shirtG.position.set(0.0, 0.013, -0.005);
    const shirtM = TX.mat('shirt', { repeat: [3.2, 2.4], tex: { seed: 21, creases: 0.45, tone: 'shirtMuseum' }, color: new THREE.Color(0.84, 1.0, 1.32) });
    const bg = new THREE.BoxGeometry(0.3, 0.032, 0.22, 24, 3, 18), N = TX.makeNoise(61), bpp = bg.attributes.position;
    for (let i = 0; i < bpp.count; i++) { let x = bpp.getX(i), y = bpp.getY(i), z = bpp.getZ(i); const e = Math.max(Math.abs(x) / 0.15, Math.abs(z) / 0.11), tt = (y + 0.016) / 0.032;
      const bulge = 1 + 0.035 * Math.sin(Math.PI * tt); x *= bulge; z *= bulge; if (y > 0) y -= 0.009 * smoothstep(0.7, 1.0, e) - 0.0016 * N.fbm(x * 3 + 0.5, z * 3 + 0.5, 2, 3); bpp.setXYZ(i, x, y, z); }
    bg.computeVertexNormals();
    mesh(bg, shirtM, shirtG, 0, 0.016, 0);
    const seam = std({ color: 0x6b7987, roughness: 0.95 }), pale = std({ color: 0x8c98a4, roughness: 0.95 });
    for (let k = 0; k < 3; k++) mesh(box(0.29, 0.0012, 0.003), seam, shirtG, 0, 0.006 + k * 0.009, 0.1125, false);
    for (let k = 0; k < 3; k++) mesh(box(0.003, 0.0012, 0.2), seam, shirtG, 0.1525, 0.006 + k * 0.009, 0, false);
    const cpts = []; for (let k = 0; k <= 24; k++) { const a = Math.PI * (k / 24); cpts.push(V(-0.06 + Math.cos(a) * 0.05, 0.0, -0.075 - Math.sin(a) * 0.028)); }
    const collar = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts), 32, 0.0075, 8, false), std({ color: 0x7d8b9a, roughness: 0.85 }), shirtG, 0, 0.034, 0, false); collar.scale.y = 0.8;
    const neck = mesh(new THREE.CircleGeometry(0.044, 24, 0, Math.PI), std({ color: 0x75838f, roughness: 0.95 }), shirtG, -0.06, 0.0322, -0.075, false); neck.rotation.x = -Math.PI / 2; neck.scale.set(1, 0.6, 1);
    mesh(box(0.011, 0.0015, 0.15), std({ color: 0x7f8d9b, roughness: 0.9 }), shirtG, -0.06, 0.033, 0.03, false);
    for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(0.0042, 8, 6), std({ color: 0x5a6878, roughness: 0.9 }), shirtG, -0.06, 0.035, -0.035 + k * 0.037, false); b.scale.y = 0.6; }
    // pale fold lines (fibres whitened along the folds)
    for (const z of [-0.035, 0.04]) mesh(box(0.28, 0.0012, 0.004), pale, shirtG, 0, 0.0325, z, false);
    const flap = new THREE.Group(); flap.position.set(0.15, 0.032, 0); shirtG.add(flap);
    mesh(box(0.1, 0.008, 0.214), shirtM, flap, -0.05, 0.004, 0, true);
    const notch = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.04, 0), new THREE.Vector2(0, 0.03)])), std({ color: 0x2f405a, roughness: 0.95, side: THREE.DoubleSide }), flap, -0.004, 0.0085, 0.105, false);
    notch.rotation.x = -Math.PI / 2; notch.rotation.z = Math.PI;
    // PROP_KEEPSAKE museum state: the boxwood comb on its unwrapped, flat-laid cloth (creases), on the shirt's top-right corner
    combG = new THREE.Group(); combG.name = 'comb'; caseG.add(combG);
    const clothM = TX.mat('cotton', { repeat: [0.5, 0.5], tex: { tone: [112, 74, 66], seed: 33, creases: 0.9 }, color: hex('#b9a8a0') });
    const cl = mesh(new THREE.PlaneGeometry(0.15, 0.15, 8, 8), clothM, combG, 0, 0.001, 0, false); cl.rotation.x = -Math.PI / 2;
    { const pa = cl.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, 0.0018 * Math.sin(pa.getX(i) * 70) * Math.cos(pa.getY(i) * 44)); cl.geometry.computeVertexNormals(); }
    const sh = new THREE.Shape(); const cw = 0.095, chh = 0.05; sh.moveTo(-cw / 2, 0); sh.quadraticCurveTo(0, chh * 0.62, cw / 2, 0);
    for (let k = 34; k >= 0; k--) { const x = -cw / 2 + cw * k / 34; sh.lineTo(x, -chh * 0.38 + (k === 9 || k === 22 ? 0.006 : 0)); sh.lineTo(x - cw / 34 * 0.5, -chh * 0.38); sh.lineTo(x - cw / 34 * 0.5, -0.004); }
    sh.lineTo(-cw / 2, 0);
    const cm = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.005, bevelEnabled: false }), std({ color: hex(P.comb).multiplyScalar(0.85), roughness: 0.45, envMap: env, envMapIntensity: 0.3 }), combG, 0, 0.0022, 0.012); cm.rotation.x = -Math.PI / 2;
    combG.position.set(0.105, 0.05, -0.044); combG.rotation.y = 0.25;
    // PROP_PASS: folded card standing open beside the case on a small acrylic easel, four EMPTY photo corners, faded stamp
    passG = new THREE.Group(); passG.name = 'pass'; g3[2].contents.add(passG);
    const pc = canvas(768, 576), g = pc.getContext('2d'), r = util.rng(17);
    g.fillStyle = P.pass; g.fillRect(0, 0, 768, 576);
    for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 50},${70 + r() * 40},${0.03 + r() * 0.05})`; g.fillRect(r() * 768, r() * 576, 1 + r() * 3, 1 + r() * 3); }
    g.strokeStyle = 'rgba(124,139,126,0.75)'; g.lineWidth = 3;
    for (const half of [0, 384]) { // guilloche border on each leaf
      g.strokeRect(half + 18, 18, 348, 540); g.lineWidth = 1.2; for (let k = 0; k < 160; k++) { const a = k / 160 * Math.PI * 2; g.beginPath(); g.arc(half + 192 + Math.cos(a) * 160, 288 + Math.sin(a) * 250, 6, 0, 6.28); g.stroke(); } g.lineWidth = 3; }
    g.strokeStyle = 'rgba(110,110,105,0.35)'; g.lineWidth = 1.5; for (let y = 300; y < 520; y += 26) { g.beginPath(); g.moveTo(420, y); g.lineTo(730, y); g.stroke(); }
    for (let y = 120; y < 520; y += 26) { g.beginPath(); g.moveTo(40, y); g.lineTo(200, y); g.stroke(); }
    // illegible handwriting scribbles (never characters)
    g.strokeStyle = 'rgba(55,50,60,0.55)'; g.lineCap = 'round';
    for (let y = 300; y < 520; y += 26) { let x = 430 + r() * 20; while (x < 700 - r() * 80) { g.lineWidth = 1.2 + r(); g.beginPath(); g.moveTo(x, y - 4); g.quadraticCurveTo(x + 5, y - 14 * r(), x + 9, y - 3); g.stroke(); x += 10 + r() * 6; } }
    // the empty photo place (upper-left of the right leaf): four photo corners only, paler paper where the photo sat
    g.fillStyle = 'rgba(245,240,226,0.6)'; g.fillRect(430, 60, 140, 180);
    g.fillStyle = 'rgba(40,36,30,0.85)'; for (const [x, y, sx, sy] of [[430, 60, 1, 1], [570, 60, -1, 1], [430, 240, 1, -1], [570, 240, -1, -1]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 26, y); g.lineTo(x, y + sy * 26); g.closePath(); g.fill(); }
    // faded grey-violet stamp: double ring, a simplified steamer, three waves and a six-point star (no letters)
    const sx0 = 640, sy0 = 210; g.fillStyle = 'rgba(122,110,140,0.26)'; g.beginPath(); g.arc(sx0, sy0, 64, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(122,110,140,0.92)'; g.lineWidth = 4; g.beginPath(); g.arc(sx0, sy0, 62, 0, 6.28); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(sx0, sy0, 50, 0, 6.28); g.stroke();
    g.fillStyle = 'rgba(122,110,140,0.72)'; g.fillRect(sx0 - 28, sy0 - 4, 56, 12); g.fillRect(sx0 - 6, sy0 - 22, 10, 18);
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = -36; x <= 36; x += 3) { const y = sy0 + 18 + k * 8 + Math.sin(x * 0.3) * 2.5; x === -36 ? g.moveTo(sx0 + x, y) : g.lineTo(sx0 + x, y); } g.stroke(); }
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; g.moveTo(sx0 + 30, sy0 - 34); g.lineTo(sx0 + 30 + Math.cos(a) * 7, sy0 - 34 + Math.sin(a) * 7); } g.stroke();
    // centre fold shading
    const fg = g.createLinearGradient(374, 0, 394, 0); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, 'rgba(60,50,30,0.22)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fg; g.fillRect(370, 0, 30, 576);
    const passT = ctex(pc);
    const passM = std({ map: passT, roughness: 0.9, side: THREE.DoubleSide, color: hex('#b8b0a4') });
    // two leaves opened at ~150°, standing on an acrylic easel, slightly reclined
    for (const s of [-1, 1]) { const leaf = new THREE.Group(); passG.add(leaf); leaf.rotation.y = s * 0.26;
      const geo = new THREE.PlaneGeometry(0.12, 0.18); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
      mesh(geo, passM, leaf, s * 0.06, 0, 0, true, true); }
    const easel = mesh(box(0.2, 0.006, 0.05), mAcrylic, passG, 0, -0.093, 0.01, false, false); easel.renderOrder = 6;
    passG.position.set(0.48, DECK3 + 0.1, 0.42); passG.rotation.x = -0.18; passG.rotation.y = -0.15;
    caseG.position.set(-0.12, DECK3, 0.36);
    caseG.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // inspection lamp (S028–S030): a small hooded 3500 K lamp on a gooseneck clamped to G3c's east jamb
  let inspBulb = null; const G3C_OPEN = 2.75;                               // G3c's door swung ~158° (back toward the wall, out of the S028 axis)
  const inspLamp = new THREE.Group(); inspLamp.name = 'inspLamp'; g3[2].grp.add(inspLamp); inspLamp.visible = false;
  const inspHead = new THREE.Group(); inspLamp.add(inspHead);
  {
    const blk = std({ color: 0x141518, roughness: 0.45, metalness: 0.4, envMap: env, envMapIntensity: 0.5 });
    mesh(box(0.03, 0.06, 0.04), blk, inspLamp, 0, 0, 0);
    const neck = new THREE.CatmullRomCurve3([V(0, 0.02, 0), V(-0.05, 0.14, 0.02), V(-0.16, 0.2, 0.06), V(-0.24, 0.17, 0.08)]);
    mesh(new THREE.TubeGeometry(neck, 20, 0.005, 6, false), blk, inspLamp);
    inspHead.position.set(-0.24, 0.17, 0.08);
    const hood = mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.06, 20, 1, true), std({ color: 0x141518, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), inspHead); hood.rotation.z = Math.PI / 2 + 0.6;
    const bulb = mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.65).multiplyScalar(2.5) }), inspHead, -0.02, -0.012, -0.004, false, false); bulb.rotation.y = -Math.PI / 2; bulb.rotation.x = 0.6;
    inspBulb = bulb; bulb.visible = false;   // the hood hides the bulb from every camera axis we use (its glare read as a hot spot)
    inspHead.rotation.y = 0.9;   // aimed back into the case (away from the gallery)
    inspLamp.position.set(G3.w / 2 - 0.06, 1.25, G3.d - 0.18);
  }
  const inspLight = new THREE.SpotLight(0xffd6a6, 0, 1.6, 0.62, 0.7, 2); scene.add(inspLight, inspLight.target);

  // ======================================================================================================== LIGHTS
  const moon = new THREE.DirectionalLight(0xc8d2db, 1.6);                     // P04 moonlight silver
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0003; moon.shadow.normalBias = 0.02; moon.shadow.radius = 2;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0x2a3d60, 0x1c140e, 0.2); scene.add(hemi);
  const g1Spot = g1.light;                                                    // the 3000 K pin spot (lib vitrine)
  const g3Spot = new THREE.SpotLight(0xffd4a4, 0, 3.2, 0.55, 0.85, 2); scene.add(g3Spot, g3Spot.target);   // the one lit wall case of a close shot
  const torch = new THREE.SpotLight(0xffeedd, 0, 14, 0.2, 0.55, 2); torch.castShadow = false; scene.add(torch, torch.target);
  const torchCone = FX.beamCone({ origin: [0, 1, 0], dir: [0, -1, 0.3], angle: 0.18, length: 3.2, color: 0xfff1e0, intensity: 0.12 }); scene.add(torchCone.object3D);
  // (integration) the lib cone's edge read as a hard white wedge: steeper falloff toward the silhouette, no hot origin, dusty
  torchCone.material.fragmentShader = torchCone.material.fragmentShader.replace('pow(abs(dot(normalize(vN), V)), 2.5)', 'pow(abs(dot(normalize(vN), V)), 6.0)').replace('smoothstep(0.0, 0.05, vAx)', 'smoothstep(0.0, 0.22, vAx)');
  torchCone.material.uniforms.uNA.value = 0.75; torchCone.material.needsUpdate = true;
  const fillA = new THREE.PointLight(0x8fa3c4, 0, 4, 2); scene.add(fillA);             // per-shot "bounce" fill (moon pool / floor)
  const warmFill = new THREE.PointLight(0xffc88e, 0, 3, 2); scene.add(warmFill);
  const futTop = new THREE.SpotLight(0xf4efe6, 0, 0, 0.6, 0.95, 2); scene.add(futTop, futTop.target);  // the future gallery: broad soft top light
  const mirLight = new THREE.PointLight(0xffd2a0, 0, 0.5, 2); mirLight.visible = false; scene.add(mirLight);   // mirror passes only: light on the glass side of a hand
  // (integration) the moon pools' first bounce, from under the floor (lights walls, cases, columns, ceiling — not the floor)
  const poolBounce = new THREE.PointLight(0x8ea2c6, 0, 14, 2); poolBounce.visible = false; scene.add(poolBounce);
  function setShadowRes(n) { if (moon.shadow.mapSize.x !== n) { moon.shadow.mapSize.set(n, n); if (moon.shadow.map) { moon.shadow.map.dispose(); moon.shadow.map = null; } } }
  function setMoon(dir, I, bounds) {
    moon.intensity = I;
    moon.target.position.set(0, 0, 0); moon.position.copy(dir).multiplyScalar(-40);
    moon.target.updateMatrixWorld(); moon.updateMatrixWorld();
    // fit the ortho shadow camera to a box (light space)
    const b = bounds || { x0: -15, x1: 15, y0: 0, y1: 6, z0: -7, z1: 7.6 };
    const vm = new THREE.Matrix4().lookAt(moon.position, moon.target.position, V(0, 1, 0)).setPosition(moon.position).invert();
    let mn = V(1e9, 1e9, 1e9), mx = V(-1e9, -1e9, -1e9);
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) { const p = V(x, y, z).applyMatrix4(vm); mn.min(p); mx.max(p); }
    const sc = moon.shadow.camera; sc.left = mn.x - 0.2; sc.right = mx.x + 0.2; sc.bottom = mn.y - 0.2; sc.top = mx.y + 0.2; sc.near = Math.max(0.1, -mx.z - 1); sc.far = -mn.z + 1; sc.updateProjectionMatrix();
  }
  // ---- volumetric moon shafts through the doorways (half-res layer) + dust
  const cookie = archCookie();
  const shafts = DOORS_X.map((x, i) => FX.windowShaft({ center: [x, 2.2, GAL.z1], right: [1.2, 0, 0], up: [0, 2.2, 0], dir: MOON_CH1.toArray(), length: 23, cookie, color: 0xb8c8e8, intensity: 0.08, floorY: 0, noise: 0.55, seed: i, penumbra: 0.012 }));
  const shaftsI = shafts.map((s, i) => FX.windowShaft({ center: [DOORS_X[i], 2.2, GAL.z1], right: [1.2, 0, 0], up: [0, 2.2, 0], dir: MOON_INTRO.toArray(), length: 10, cookie, color: 0xb8c8e8, intensity: 0.08, floorY: 0, noise: 0.55, seed: 9 + i, penumbra: 0.012 }));
  for (const s of [...shafts, ...shaftsI]) { s.object3D.visible = false; scene.add(s.object3D); }
  const dust = FX.dustMotes({ count: 900, center: [0, 1.6, 3.5], size: [6, 3.2, 7], moteSize: 0.0025, intensity: 0.9, beam: { shaft: shafts[2] }, ambient: 0.015, seed: 3 });
  dust.object3D.visible = false; scene.add(dust.object3D);
  // ---- reflection-only extras (mirror pass): the reflected moon + a faint arch around it
  const mirMoon = moonSprite({ size: 1.6, intensity: 9, halo: 0.5, haloSize: 7 });
  mirMoon.object3D.layers.set(L_MIR); mirMoon.material.depthTest = false; mirMoon.object3D.renderOrder = 900; scene.add(mirMoon.object3D); mirMoon.object3D.visible = false;
  const archGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: (() => { const c = canvas(256, 400), g = c.getContext('2d'); g.strokeStyle = 'rgba(190,205,230,0.55)'; g.lineWidth = 9; g.filter = 'blur(5px)';
    g.beginPath(); g.moveTo(28, 400); g.lineTo(28, 128); g.arc(128, 128, 100, Math.PI, 0); g.lineTo(228, 400); g.stroke(); return ctex(c); })(), color: new THREE.Color(0.35, 0.42, 0.56), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  archGlow.layers.set(L_MIR); archGlow.renderOrder = 899; archGlow.visible = false; scene.add(archGlow);

  // ======================================================================================================== FIGURES
  const toned = new Set();
  const toneGlove = (m, k) => { if (m && m.color && !toned.has(m)) { toned.add(m); m.color.multiplyScalar(k); } };
  const R = await loadCharacter('RESTORER', { lod: 'hi' });
  scene.add(R.root); R.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const s of ['L', 'R']) toneGlove(R.hands[s] && R.hands[s].meshes.glove && R.hands[s].meshes.glove.material, 0.72);
  const R_MESHES = []; R.root.traverse((o) => { if (o.isMesh) R_MESHES.push(o); });
  const setRShadow = (on) => { for (const m of R_MESHES) m.castShadow = on; };
  R.root.visible = false;
  const guard = await loadCharacter('GUARD', { lod: 'mid' });
  scene.add(guard.root); guard.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); guard.root.visible = false;
  // the guard's torch: moved from the belt into his right hand
  const torchObj = guard.accessories.flashlight;
  if (torchObj) { torchObj.parent.remove(torchObj); guard.hold('R', torchObj, { socket: 'grip', grip: ['grip', { radius: 0.015 }] }); torchObj.position.set(0, 0, 0); torchObj.rotation.set(0, 0, 0); }
  // close-up gloved right hand (+ coat sleeve) — S001/S002/S004/S026/S030/S040
  const handR = await loadCharacterHand('RESTORER', 'R', { lod: 'close' });
  // (integration) the hook's glove must read as cotton, not a puffy plaster cast: slimmer (finger width −18 %, thickness −12 %;
  // hand frame: Z across the hand, X palm normal), warm white #E9E4DA toned down, a stronger weave relief and seams
  handR.root.scale.set(0.88, 1.0, 0.82);
  if (handR.meshes.glove) { const gm = handR.meshes.glove.material; gm.color.set('#E9E4DA').multiplyScalar(0.5); toned.add(gm);
    const fz = gm.userData && gm.userData.fzUniforms; if (fz) { if (fz.uWAmp) fz.uWAmp.value *= 2.6; if (fz.uWeave) fz.uWeave.value = 0.0021; if (fz.uMottle) fz.uMottle.value = 0.07; if (fz.uFold) fz.uFold.value *= 1.4; }
    gm.sheen = 0.35; gm.roughness = 0.95; }
  { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.36, 28, 1, false), mWool); sl.position.y = 0.04 + 0.18; sl.castShadow = sl.receiveShadow = true; handR.root.add(sl); handR.root.userData.sleeve = sl; }
  handR.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(handR.root); handR.root.visible = false;
  // ======================================================================================================== ERA SCENE (screen-space era layer)
  // rendered with the main camera's transform into an RGBA RT, composited in G1's glass: the navigator's salt hand, the glints,
  // the future viewer (S071/S078). Its own lights — nothing in it lights or shadows the gallery.
  const eraScene = new THREE.Scene();
  const eraMoon = new THREE.DirectionalLight(0xaebfe0, 2.2); eraScene.add(eraMoon, eraMoon.target);
  const eraLamp = new THREE.PointLight(0xffb060, 0, 3, 2); eraScene.add(eraLamp);
  const eraHemi = new THREE.HemisphereLight(0x3a5078, 0x14100c, 0.35); eraScene.add(eraHemi);
  const navHand = await loadCharacterHand('NAVIGATOR', 'L', { lod: 'close' });
  eraScene.add(navHand.root); navHand.root.visible = false;
  // review: at ECU the salt read as plain warm skin — stronger crust (the lib's per-vertex salt map, back + finger gaps + edges)
  navHand.root.traverse((o) => { const fz = o.isMesh && o.material && o.material.userData && o.material.userData.fzUniforms; if (fz && fz.uSalt) fz.uSalt.value = Math.max(1.6, fz.uSalt.value * 2.8); });
  // (integration) the first trace of the other hand (S001 3.0 s): 7 faceted salt crystals (0.7–1.4 mm, 2–4 px at 1280) behind
  // the glass in the wiped band, each catching the pin spot for a few frames — not round glow dots
  const glints = []; { const cr = util.rng(57);
    for (let k = 0; k < 7; k++) {
      const grp = new THREE.Group(); const s = 0.00042 + cr() * 0.00028;
      const base = new THREE.Mesh(new THREE.CircleGeometry(s, 5 + (k % 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
      base.scale.set(1, 0.6 + 0.4 * cr(), 1); base.rotation.z = cr() * 6.28; grp.add(base);
      const fac = new THREE.Mesh(new THREE.CircleGeometry(s * 0.55, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
      fac.position.set(s * 0.25 * (cr() - 0.5), s * 0.25 * (cr() - 0.5), 0.0001); fac.rotation.z = cr() * 6.28; grp.add(fac);
      base.renderOrder = fac.renderOrder = 20; eraScene.add(grp); grp.visible = false;
      glints.push({ object3D: grp, set(v, flash = 0) { base.material.color.setRGB(0.55, 0.58, 0.62).multiplyScalar(v); fac.material.color.setRGB(1.0, 1.0, 1.05).multiplyScalar(v * (0.6 + 9.0 * flash)); } });
    } }
  // salt crystals on his hand (review: the lib's crust sits on the back of the hand; from the palm side it read as plain skin):
  // tiny moonlit sparkles in the finger gaps and along the finger edges, riding the hand
  // (integration) salt on his hand's VISIBLE margins (her glove hides the palm centre): 20 tiny faceted crystals (0.3–0.6 mm)
  // along the thumb, the little-finger edge, the finger tops and the heel, catching his moon for a few frames each
  const saltG = []; { const cr = util.rng(91);
    for (let k = 0; k < 40; k++) {
      const s0 = 0.0003 + cr() * 0.00038, m = new THREE.Mesh(new THREE.CircleGeometry(s0, 4 + (k % 3)), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
      m.scale.set(1, 0.55 + 0.45 * cr(), 1); m.rotation.z = cr() * 6.28; m.renderOrder = 20; eraScene.add(m); m.visible = false;   // drawn after the hand (no depth write)
      saltG.push({ object3D: m, set(v) { m.material.color.setRGB(0.92, 0.95, 1.0).multiplyScalar(v); } });
    } }
  const fut = await loadCharacter('FUTURE', { lod: 'hi' });
  eraScene.add(fut.root); fut.root.visible = false;
  const futHandL = await loadCharacterHand('FUTURE', 'L', { lod: 'close' });   // the reflected raised hand (a mirrored right hand = a left hand)
  eraScene.add(futHandL.root); futHandL.root.visible = false;
  const eraKey = new THREE.SpotLight(0xf6efe4, 0, 8, 0.7, 0.9, 2); eraKey.visible = false; eraScene.add(eraKey, eraKey.target);
  // depth-only proxy so the engine DOF blurs the composited hand by ITS mirror depth (sits between the glass and the velvet)
  const dofProxy = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true }));
  dofProxy.renderOrder = 59; dofProxy.visible = false; scene.add(dofProxy);

  // ======================================================================================================== RENDER TARGETS, BLUR, MIRROR
  const rtHand = ctx.makeRT(ctx.W, ctx.H);
  const rtMir = ctx.makeRT(480, 200);
  const rtMirB = [ctx.makeRT(480, 200), ctx.makeRT(480, 200)];
  const rtSea = ctx.makeRT(480, 360);
  const rtEra = [ctx.makeRT(384, 576), ctx.makeRT(384, 576), ctx.makeRT(384, 576)];
  const rtEraW = ctx.makeRT(640, 268);                                         // S026: screen-space home view
  const rtBlur = { 640: [ctx.makeRT(640, 268), ctx.makeRT(640, 268)], 384: [ctx.makeRT(384, 576), ctx.makeRT(384, 576)], pane: [0, 1, 2].map(() => [ctx.makeRT(384, 576), ctx.makeRT(384, 576)]), 560: [ctx.makeRT(480, 360), ctx.makeRT(480, 360)], hand: [ctx.makeRT(640, 268), ctx.makeRT(640, 268)] };
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;
      void main(){ vec4 a = vec4(0.0); float w = 0.0;
        for (int i = -6; i <= 6; i++) { float fi = float(i); float k = exp(-fi * fi / 18.0); a += texture2D(tSrc, vUv + uDir * fi / 6.0) * k; w += k; }
        gl_FragColor = a / w; }`,
    depthTest: false, depthWrite: false,
  });
  const blurQ = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat); blurQ.frustumCulled = false;
  const blurScene = new THREE.Scene(); blurScene.add(blurQ); const blurCam = new THREE.Camera();
  // blur src (texture of size w×h) by radius r px (of that texture) into pair[1]; returns the texture
  function blur(src, pair, rPx) {
    if (rPx < 0.35) return src;
    const r = ctx.renderer, prev = r.getRenderTarget(), w = pair[0].width, h = pair[0].height;
    blurMat.uniforms.tSrc.value = src; blurMat.uniforms.uDir.value.set(rPx / w, 0); r.setRenderTarget(pair[0]); r.render(blurScene, blurCam);
    blurMat.uniforms.tSrc.value = pair[0].texture; blurMat.uniforms.uDir.value.set(0, rPx / h); r.setRenderTarget(pair[1]); r.render(blurScene, blurCam);
    r.setRenderTarget(prev);
    return pair[1].texture;
  }
  // mirror pass: render the present from the reflected camera (plane: point p0, unit normal n toward the camera side)
  const vcam = new THREE.PerspectiveCamera();
  const _q4 = new THREE.Vector4(), _pl = new THREE.Plane();
  function mirrorPass(p0, n, rt, { hide = [], keepMoon = false, mirFill = 0.35, boost = [] } = {}) {
    if (OFF.has('mirror')) return null;
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const cp = camera.position, d = cp.clone().sub(p0).dot(n);
    if (d <= 0.01) return null;
    const f = camera.getWorldDirection(V()), u = V(0, 1, 0).applyQuaternion(camera.quaternion);
    const refl = (v) => v.clone().sub(n.clone().multiplyScalar(2 * v.dot(n)));
    vcam.position.copy(cp).addScaledVector(n, -2 * d);
    vcam.up.copy(refl(u)); vcam.lookAt(vcam.position.clone().add(refl(f)));
    vcam.updateMatrixWorld(); vcam.matrixWorldInverse.copy(vcam.matrixWorld).invert();
    vcam.projectionMatrix.copy(camera.projectionMatrix); vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    // oblique near plane = the glass (Lengyel; as three's Reflector)
    _pl.setFromNormalAndCoplanarPoint(n, p0).applyMatrix4(vcam.matrixWorldInverse);
    const clip = new THREE.Vector4(_pl.normal.x, _pl.normal.y, _pl.normal.z, _pl.constant), pm = vcam.projectionMatrix.elements;
    _q4.set((Math.sign(clip.x) + pm[8]) / pm[0], (Math.sign(clip.y) + pm[9]) / pm[5], -1, (1 + pm[10]) / pm[14]);
    clip.multiplyScalar(2 / clip.dot(_q4));
    pm[2] = clip.x; pm[6] = clip.y; pm[10] = clip.z + 1 - 0.0005; pm[14] = clip.w;
    vcam.layers.mask = (1 << 0) | (1 << L_MIR);
    if (OFF.has('mirfig')) hide = hide.concat([R.root]);
    const vis = hide.map((o) => o.visible); hide.forEach((o) => { o.visible = false; });
    // perf: the reflection is faint and blurred — rendered without the moon (its 2048² shadow map would be re-rendered for this
    // pass), lit by the hemisphere + practicals and a little extra sky fill; the doorways/sky glow carry it
    const mv = moon.visible, hi = hemi.intensity; moon.visible = !!keepMoon; if (!keepMoon) hemi.intensity = hi + mirFill;
    const bs = boost.map(([l, I]) => { const o = [l.visible, l.intensity]; l.visible = true; l.intensity = I; return o; });   // lights for the reflected side only
    const r = ctx.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, vcam); r.setRenderTarget(prev);
    boost.forEach(([l], i) => { l.visible = bs[i][0]; l.intensity = bs[i][1]; });
    moon.visible = mv; hemi.intensity = hi;
    hide.forEach((o, i) => { o.visible = vis[i]; });
    return rt.texture;
  }
  // the era scene into rtHand (RGBA, alpha = coverage)
  function eraPass() {
    if (OFF.has('era')) return rtHand.texture;
    camera.updateMatrixWorld();
    const r = ctx.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(rtHand); r.setClearColor(0x000000, 0); r.clear(true, true, true); r.render(eraScene, camera); r.setRenderTarget(prev); r.setClearColor(0x000000, 1);
    return rtHand.texture;
  }

  // ======================================================================================================== PANE OVERLAY (3 roles)
  // ROLE 0 'low'  : engine half-res additive layer (merged AFTER the DOF): era image plane, mirror reflection, dust, glints —
  //                 each pre-blurred by its own circle of confusion (blur pass / texture LOD), so the engine never blurs
  //                 them by the depth that happens to lie behind the glass.
  // ROLE 1 'main' : full-res additive: the screen-space era layer (navigator hand / future viewer) — hero detail.
  // ROLE 2 'depth': depth-only, writes the era layer's mirror depth where it covers, so the engine DOF blurs it correctly.
  const smudge = TX.glassSmudge({ seed: 18 }).map;
  // (integration) G1's own dust film (S001/S002, the hook): pane-UV, square ~0.375 mm texels. R = the film (mottled haze + old
  // cleaning swirls), G = dust specks and a few fibres, B = two faint old fingerprints. Lit along the top by the pin spot.
  const dustFilm = (() => {
    const W = 1600, H = 1334, N = TX.makeNoise(83), r = util.rng(84);
    const lay = () => { const c = canvas(W, H), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return [c, g]; };
    // R: film density (low-frequency mottle) + swirl marks of an old cleaning cloth
    const [cr, gr] = lay();
    { const w = 400, h = 334, c0 = canvas(w, h), g0 = c0.getContext('2d'), im = g0.createImageData(w, h), d = im.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w, v = y / h;
        const f = 0.5 + 0.5 * N.fbm(u, v, 5, 5, 0.55), f2 = 0.5 + 0.5 * N.fbm(u + 0.37, v + 0.11, 24, 3, 0.5);
        const k = clamp(0.32 + 0.55 * smoothstep(0.25, 0.8, f) + 0.18 * (f2 - 0.5)); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = k * 255; d[i + 3] = 255; }
      g0.putImageData(im, 0, 0); gr.imageSmoothingEnabled = true; gr.drawImage(c0, 0, 0, W, H); }
    gr.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) { const x = r() * W, y = r() * H, R0 = 120 + r() * 380, a0 = r() * 6.28;
      for (let q = 0; q < 18; q++) { gr.strokeStyle = `rgba(255,255,255,${0.012 + r() * 0.03})`; gr.lineWidth = 1 + r() * 3; gr.beginPath(); gr.arc(x, y, R0 + q * 3.1, a0, a0 + 0.8 + r() * 0.9); gr.stroke(); } }
    // G: specks (0.4–1.5 mm) + a few short fibres
    const [cg, gg] = lay();
    for (let k = 0; k < 2600; k++) { const s = 0.5 + Math.pow(r(), 3) * 2.4; gg.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * r()})`; gg.beginPath(); gg.arc(r() * W, r() * H, s, 0, 6.283); gg.fill(); }
    gg.lineCap = 'round';
    for (let k = 0; k < 40; k++) { const x = r() * W, y = r() * H, a = r() * 6.28, L = 8 + r() * 26; gg.strokeStyle = `rgba(255,255,255,${0.3 + 0.4 * r()})`; gg.lineWidth = 0.8; gg.beginPath(); gg.moveTo(x, y); gg.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.6, y + Math.sin(a + 0.6) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); gg.stroke(); }
    // B: two faint old fingerprints (ridges ~0.45 mm) on the visible part of the pane (S001: u 0.12–0.88, v 0.27–0.65)
    const [cb, gb] = lay();
    for (const [u, v, a] of [[0.30, 0.60, 0.5], [0.69, 0.33, -0.3]]) { gb.save(); gb.translate(u * W, (1 - v) * H); gb.rotate(a);
      for (let q = 1; q < 28; q++) { gb.strokeStyle = `rgba(255,255,255,${0.5 * (1 - q / 30)})`; gb.lineWidth = 0.9; gb.beginPath(); gb.ellipse(0, 0, q * 1.25, q * 1.6, 0, r() * 0.6, 6.283 - r() * 1.1); gb.stroke(); }
      gb.restore(); }
    const R_ = cr.getContext('2d').getImageData(0, 0, W, H).data, G_ = gg.getImageData(0, 0, W, H).data, B_ = gb.getImageData(0, 0, W, H).data;
    const out = canvas(W, H), og = out.getContext('2d'), im = og.createImageData(W, H), d = im.data;
    for (let i = 0; i < W * H; i++) { d[i * 4] = R_[i * 4]; d[i * 4 + 1] = G_[i * 4]; d[i * 4 + 2] = B_[i * 4]; d[i * 4 + 3] = 255; }
    og.putImageData(im, 0, 0);
    const t = ctex(out, false); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
  })();
  const OV_COMMON = `varying vec3 vW; varying vec2 vUv; varying vec3 vN;
    uniform mat4 uProjM; uniform vec2 uRes; uniform sampler2D tMir, tEra, tEra2, tSmudge, uNoiseT, tDust2; uniform float uMir, uMirFres, uEra, uEraFres, uEra2, uEra2Depth, uAspect, uEdgeSoft, uDepthK, uEra2Occ, uEraSoft, uEra2Over, uEra2Low; uniform vec4 uEra2Xf; uniform vec2 uEra2Fade; uniform sampler2D tEra2B; uniform vec2 uEra2BY;
    uniform vec3 uEraO, uEraU, uEraV, uEraTint, uDustCol, uStreakCol; uniform int uWipeN; uniform vec2 uWipeP[6]; uniform float uWipeL[6];
    uniform float uWipeProg, uWipeW, uWipeSoft, uMaskFloor, uMaskFloor2, uDust, uDustTop, uDustLod, uGlint, uDust2, uStreak; uniform vec2 uDustRep, uDustLit; uniform vec4 uDust2K, uStreakL, uEraUV; uniform vec2 uEraFB; uniform float uEraComp;
    float wipeMask(vec2 p){
      if (uWipeN < 2) return 0.0;
      vec2 sc = vec2(uAspect, 1.0); p *= sc; float lim = uWipeProg * uWipeL[5]; float d = 1e9;
      for (int i = 1; i < 6; i++) { if (i >= uWipeN) break; float l0 = uWipeL[i - 1], l1 = uWipeL[i]; if (l0 >= lim) break;
        vec2 a = uWipeP[i - 1] * sc, b = uWipeP[i] * sc; b = mix(a, b, clamp((lim - l0) / max(l1 - l0, 1e-5), 0.0, 1.0));
        vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0); d = min(d, length(pa - ba * h)); }
      float n = texture2D(uNoiseT, p * vec2(2.0, 9.0)).r - 0.5;
      return 1.0 - smoothstep(uWipeW - uWipeSoft, uWipeW + uWipeSoft, d + n * uWipeSoft * 2.0);
    }
    float fresnelK(){ vec3 Vd = normalize(cameraPosition - vW); float ndv = clamp(abs(dot(normalize(vN), Vd)), 0.0, 1.0); return 0.04 + 0.96 * pow(1.0 - ndv, 5.0); }
    float paneEdge(){ float e = min(min(vUv.x, 1.0 - vUv.x) * uAspect, min(vUv.y, 1.0 - vUv.y)); return smoothstep(0.0, uEdgeSoft, e); }`;
  const OV_FRAG = [
    // ROLE 0 low
    `void main(){
      float fr = fresnelK(), edge = paneEdge(), wm = wipeMask(vUv); vec2 s = gl_FragCoord.xy * 2.0 / uRes;   // half-res target
      vec3 col = vec3(0.0);
      if (uEra > 0.0) {   // virtual image plane behind the glass (parallax), composited as seen (not mirrored)
        vec3 rd = normalize(vW - cameraPosition); vec3 N = normalize(cross(uEraU, uEraV));
        float dn = dot(rd, N); float t = abs(dn) > 1e-5 ? dot(uEraO - cameraPosition, N) / dn : -1.0;
        vec3 P = cameraPosition + rd * max(t, 0.0); vec3 l = P - uEraO;
        vec2 euv = vec2(0.5 + 0.5 * dot(l, uEraU) / dot(uEraU, uEraU), 0.5 + 0.5 * dot(l, uEraV) / dot(uEraV, uEraV));
        float inb = t > 0.0 ? smoothstep(0.0, uEraSoft, euv.x) * smoothstep(1.0, 1.0 - uEraSoft, euv.x) * smoothstep(0.0, uEraSoft, euv.y) * smoothstep(1.0, 1.0 - uEraSoft, euv.y) : 0.0;
        inb *= smoothstep(uEraFB.x, uEraFB.y, euv.y);
        vec3 ec = texture2D(tEra, clamp(clamp(euv, 0.0, 1.0) * uEraUV.xy + uEraUV.zw, 0.0, 1.0)).rgb; ec /= 1.0 + uEraComp * dot(ec, vec3(0.3, 0.55, 0.15));   // highlight roll-off (moon glitter)
        col += ec * inb * uEra * uEraTint * mix(uMaskFloor, 1.0, wm) * mix(1.0, 0.45 + 14.0 * fr, uEraFres);
      }
      if (uMir > 0.0) { vec3 r = texture2D(tMir, vec2(1.0 - s.x, s.y)).rgb; r = (any(isnan(r)) || any(isinf(r))) ? vec3(0.0) : clamp(r, 0.0, 64.0); col += r * uMir * mix(1.0, fr / 0.04, uMirFres) * (1.0 - uEra2Occ * texture2D(tEra2, s).a); }
      if (uDust > 0.0) {   // dust film on the glass, lit along its upper edge by the warm pin spot; cleared where wiped
        vec4 sm = textureLod(tSmudge, vUv * uDustRep, uDustLod);
        float lit = mix(1.0, smoothstep(0.15, 1.0, vUv.y) * 1.7 + 0.2, uDustTop);
        col += uDustCol * (sm.r * 0.12 + sm.b * 1.8) * uDust * lit * (1.0 - 0.94 * wm);
      }
      if (uDust2 > 0.0) {  // G1's dust film (S001/S002): lit from the top by the pin spot; the wiped band is clear, its edges
                           // hold the pushed-aside dust
        vec4 dt = textureLod(tDust2, vUv, uDustLod);
        float lit = mix(1.0, smoothstep(uDustLit.x, uDustLit.y, vUv.y), uDustTop);
        float rim = wm * (1.0 - wm) * 4.0;
        float dd = dt.r * uDust2K.x + dt.g * uDust2K.y + dt.b * uDust2K.z;
        float stk = texture2D(uNoiseT, vUv * vec2(uAspect * 0.7, 23.0)).r;           // residual streaks along the stroke
        col += uDustCol * dd * uDust2 * (lit + uDust2K.w) * (1.0 - wm * (0.8 - 0.32 * stk) + 0.5 * rim);
      }
      if (uStreak > 0.0) {   // a soft diagonal sheen (the reflected edge of a moonlit doorway) across the pane
        vec2 p = vUv * vec2(uAspect, 1.0); float x = dot(p, normalize(uStreakL.xy)) - uStreakL.z;
        col += uStreakCol * uStreak * (exp(-x * x / (uStreakL.w * uStreakL.w)) + 0.35 * exp(-(x + 2.6 * uStreakL.w) * (x + 2.6 * uStreakL.w) / (0.16 * uStreakL.w * uStreakL.w)));
      }
      if (uGlint > 0.0) { float g = texture2D(uNoiseT, vUv * vec2(uAspect, 1.0) * 7.0).b; col += vec3(0.9, 0.95, 1.0) * pow(max(g - 0.84, 0.0) * 6.2, 3.0) * uGlint * wm; }
      if (uEra2Low > 0.0) {   // the screen-space era layer after the DOF (pre-blurred by its own CoC): no depth proxy, so the
                              // real scene behind the glass keeps its own blur inside the reflection's silhouette
        vec2 s2 = s * uEra2Xf.xy + uEra2Xf.zw;
        vec4 h = texture2D(tEra2, s2) * (uEra2Xf.w != 0.0 ? smoothstep(0.0, 0.06, s2.y) * smoothstep(1.0, 0.94, s2.y) : 1.0);
        col += h.rgb * uEra2Low * mix(uMaskFloor2, 1.0, wm) * smoothstep(uEra2Fade.x, uEra2Fade.y, s.y);
      }
      gl_FragColor = vec4(col * edge, 1.0);
    }`,
    // ROLE 1 main (full res)
    `void main(){
      float edge = paneEdge(), wm = wipeMask(vUv); vec2 s = gl_FragCoord.xy / uRes; vec2 s2 = s * uEra2Xf.xy + uEra2Xf.zw;
      vec4 h = texture2D(tEra2, s2);
      if (uEra2BY.y > uEra2BY.x) h = mix(h, texture2D(tEra2B, s2), smoothstep(uEra2BY.x, uEra2BY.y, s.y));
      h *= (uEra2Xf.w != 0.0 ? smoothstep(0.0, 0.06, s2.y) * smoothstep(1.0, 0.94, s2.y) : 1.0);
      float k = mix(uMaskFloor2, 1.0, wm) * edge * smoothstep(uEra2Fade.x, uEra2Fade.y, s.y);
      gl_FragColor = vec4(h.rgb * uEra2 * k, clamp(h.a * uEra2Over * edge * smoothstep(uEra2Fade.x, uEra2Fade.y, s.y) * min(uEra2 / 0.9, 1.0), 0.0, 1.0));
    }`,
    // ROLE 2 depth (era layer mirror depth)
    `void main(){
      vec2 s = gl_FragCoord.xy / uRes; float a = texture2D(tEra2, s * uEra2Xf.xy + uEra2Xf.zw).a * min(uEra2 * uDepthK, 1.0);
      if (a < 0.35) discard;
      vec3 rd = normalize(vW - cameraPosition); float c = max(abs(dot(rd, normalize(vN))), 0.2);
      vec3 P = vW + rd * (uEra2Depth / c);
      vec4 q = uProjM * viewMatrix * vec4(P, 1.0);
      gl_FragDepth = clamp((q.z / q.w) * 0.5 + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(0.0);
    }`,
  ];
  const OV_VERT = `varying vec3 vW; varying vec2 vUv; varying vec3 vN;
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  function paneOverlay(paneMesh, aspect) {
    const wp = Array.from({ length: 6 }, () => new THREE.Vector2()), wl = new Array(6).fill(0);
    const U = {
      uRes: { value: new THREE.Vector2(ctx.W, ctx.H) }, uProjM: { value: camera.projectionMatrix },
      tMir: { value: null }, uMir: { value: 0 }, uMirFres: { value: 1 },
      tEra: { value: null }, uEra: { value: 0 }, uEraFres: { value: 0.3 },
      uEraO: { value: V() }, uEraU: { value: V(1, 0, 0) }, uEraV: { value: V(0, 1, 0) }, uEraTint: { value: new THREE.Color(1, 1, 1) },
      tEra2: { value: null }, uEra2: { value: 0 }, uEra2Over: { value: 0 }, uEra2Low: { value: 0 }, uEra2Depth: { value: 0.02 }, uDepthK: { value: 1 }, uEra2Occ: { value: 0 }, uEraSoft: { value: 0.06 }, uEra2Xf: { value: new THREE.Vector4(1, 1, 0, 0) }, uEra2Fade: { value: new THREE.Vector2(-2, -1) }, tEra2B: { value: null }, uEra2BY: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: aspect }, uEdgeSoft: { value: 0.03 },
      uWipeN: { value: 0 }, uWipeP: { value: wp }, uWipeL: { value: wl }, uWipeProg: { value: 0 }, uWipeW: { value: 0.1 }, uWipeSoft: { value: 0.03 },
      uMaskFloor: { value: 1 }, uMaskFloor2: { value: 1 }, uDust: { value: 0 }, uDustCol: { value: new THREE.Color(1.0, 0.86, 0.66) }, tSmudge: { value: smudge }, uDustRep: { value: new THREE.Vector2(1, 1) },
      uDustTop: { value: 0.6 }, uDustLod: { value: 0 }, uNoiseT: { value: TX.noiseTexture() }, uGlint: { value: 0 },
      tDust2: { value: dustFilm }, uDust2: { value: 0 }, uDust2K: { value: new THREE.Vector4(0.35, 1.0, 0.5, 0.06) }, uDustLit: { value: new THREE.Vector2(0.3, 0.7) },
      uEraComp: { value: 0 }, uEraUV: { value: new THREE.Vector4(1, 1, 0, 0) }, uEraFB: { value: new THREE.Vector2(-1, 0) },
      uStreak: { value: 0 }, uStreakL: { value: new THREE.Vector4(-0.7, 0.7, 0.0, 0.05) }, uStreakCol: { value: new THREE.Color(0.55, 0.62, 0.75) },
    };
    const mk = (role) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: OV_VERT, fragmentShader: OV_COMMON + OV_FRAG[role], transparent: true,
      depthTest: true, depthWrite: role === 2, colorWrite: role !== 2,
      ...(role === 2 ? {} : { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: role === 1 ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor }) });
    const mLow = mk(0), mMain = mk(1), mDepth = mk(2);
    const low = new THREE.Mesh(paneMesh.geometry, mLow); low.layers.set(1); low.renderOrder = 62;          // LOWRES_LAYER
    const main = new THREE.Mesh(paneMesh.geometry, mMain); main.layers.set(L_OVL); main.renderOrder = 61;
    const dep = new THREE.Mesh(paneMesh.geometry, mDepth); dep.layers.set(L_OVL); dep.renderOrder = 59;
    for (const o of [low, main, dep]) { paneMesh.add(o); o.position.set(0, 0, 0.0004); o.frustumCulled = false; }
    const api = {
      U, low, main, dep,
      setWipe(pts, width, soft, prog) {
        const ps = pts.slice(0, 6); U.uWipeN.value = ps.length; let acc = 0;
        ps.forEach((q, i) => { wp[i].set(q[0], q[1]); if (i) acc += Math.hypot((q[0] - ps[i - 1][0]) * aspect, q[1] - ps[i - 1][1]); wl[i] = acc; });
        for (let i = ps.length; i < 6; i++) wl[i] = acc;
        U.uWipeW.value = width; U.uWipeSoft.value = soft; U.uWipeProg.value = prog;
      },
      reset() { U.uMir.value = 0; U.uEra.value = 0; U.uEra2.value = 0; U.uEra2Over.value = 0; U.uEra2Low.value = 0; U.uDust.value = 0; U.uGlint.value = 0; U.uWipeN.value = 0; U.uMaskFloor.value = 1; U.uMaskFloor2.value = 1; U.uEraFres.value = 0.3; U.uMirFres.value = 1; U.uEraTint.value.setRGB(1, 1, 1); U.uDustLod.value = 0; U.uDepthK.value = 1; U.uEra2Occ.value = 0; U.uEraSoft.value = 0.06; U.uEra2Xf.value.set(1, 1, 0, 0); U.uEra2Fade.value.set(-2, -1); U.tEra2B.value = null; U.uEra2BY.value.set(0, 0);
        U.uDustCol.value.setRGB(1.0, 0.86, 0.66); U.uDustTop.value = 0.6; U.uDustRep.value.set(1, 1); U.uMaskFloor.value = 1; U.uEra2Depth.value = 0.02; U.tEra2.value = null; U.tMir.value = null; U.tEra.value = null;
        U.uDust2.value = 0; U.uDust2K.value.set(0.35, 1.0, 0.5, 0.06); U.uDustLit.value.set(0.3, 0.7); U.uStreak.value = 0; U.uEraUV.value.set(1, 1, 0, 0); U.uEraFB.value.set(-1, 0); U.uEraComp.value = 0; U.uStreakL.value.set(-0.7, 0.7, 0.0, 0.05); U.uStreakCol.value.setRGB(0.55, 0.62, 0.75); },
      sync() { low.visible = U.uEra.value > 0 || U.uMir.value > 0 || U.uDust.value > 0 || U.uGlint.value > 0 || U.uEra2Low.value > 0 || U.uDust2.value > 0 || U.uStreak.value > 0; main.visible = dep.visible = U.uEra2.value > 0; },
    };
    return api;
  }
  const overlayFor = (paneMesh, aspect) => paneOverlay(paneMesh, aspect);
  // circle of confusion (full-res px) of a layer at distance z with the lens focused at s
  const cocPx = (z, s, mm, N) => { const f = mm / 1000; return (f * f / N) * Math.abs(z - s) / (z * Math.max(s - f, 1e-3)) / 0.036 * ctx.W; };
  const ovG1 = overlayFor(g1.panes.front, G1.w / G1.h);
  const ovG2 = overlayFor(g2GlassMesh, G2.w / G2.d);
  const ovG3 = g3.map((v) => overlayFor(v.pane, (G3.w - 0.06) / (G3.top - G3.base - 0.06)));
  const allOv = [ovG1, ovG2, ...ovG3];
  // world helpers
  const paneN = (mesh) => V(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const paneP = (mesh) => mesh.getWorldPosition(V());
  // set an overlay's era image plane: centred on point c (world), right/up half-axes (world vectors)
  function eraPlane(ov, tex, strength, c, right, up) { ov.U.tEra.value = tex; ov.U.uEra.value = strength; ov.U.uEraO.value.copy(c); ov.U.uEraU.value.copy(right); ov.U.uEraV.value.copy(up); }

  // ======================================================================================================== CAMERA HELPERS
  // place camera at pos so that world point p lands exactly at frame (fx, fy) (y from the top), level horizon (+ roll)
  function frameAt(pos, p, fx, fy, mm, roll = 0) {
    cam.lens(camera, mm); camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(p);
    const Y = V(0, 1, 0);
    for (let i = 0; i < 5; i++) {
      camera.updateMatrixWorld(); const q = p.clone().project(camera); const sx = 0.5 + 0.5 * q.x, sy = 0.5 - 0.5 * q.y;
      const vf = camera.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      camera.rotateOnWorldAxis(Y, (fx - sx) * hf * 0.98); camera.rotateX((fy - sy) * vf * 0.98);
    }
    if (roll) camera.rotateZ(roll);
    camera.updateMatrixWorld();
  }
  const scr = (p) => { camera.updateMatrixWorld(); const q = p.clone().project(camera); return [+(q.x * 0.5 + 0.5).toFixed(3), +(0.5 - q.y * 0.5).toFixed(3)]; };
  // world point on a plane z = zp seen at frame (fx, fy) from the current camera
  function rayZ(fx, fy, zp) { camera.updateMatrixWorld(); const r = V(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(camera).sub(camera.position).normalize(); return camera.position.clone().addScaledVector(r, (zp - camera.position.z) / r.z); }
  const DBGP = {};
  // place a close-up hand so that its index pad / pinch / palm socket lands on pt
  const _v = V();
  function placeHandAt(h, pt, fingerDir, palmN, socket = 'index') {
    h.placeWrist([0, 0, 0], fingerDir, palmN); h.root.updateMatrixWorld(true);
    const p = socket === 'index' ? h.tip('index', _v) : socket === 'middle' ? h.tip('middle', _v) : socket === 'wrist' ? h.root.getWorldPosition(_v) : h.sockets[socket].getWorldPosition(_v);
    h.root.position.add(pt.clone().sub(p)); h.root.updateMatrixWorld(true);
  }

  // ======================================================================================================== PER-SHOT STATE (pure)
  const S = { mirror: null };
  // every shared light restored to its build-time state on each frame (frames render in any order: no state may leak)
  const LSNAP = [g1Spot, g2Light, g3Spot, torch, fillA, warmFill, futTop, inspLight, eraKey, eraMoon, eraLamp, eraHemi, poolBounce, mirLight].map((l) => ({ l,
    c: l.color.clone(), g: l.groundColor ? l.groundColor.clone() : null, d: l.distance, a: l.angle, p: l.penumbra, k: l.decay,
    pos: l.position.clone(), t: l.target ? l.target.position.clone() : null }));
  function restoreLights() { for (const s of LSNAP) { const l = s.l; l.color.copy(s.c); if (s.g) l.groundColor.copy(s.g); if (s.d !== undefined) l.distance = s.d; if (s.a !== undefined) l.angle = s.a;
    if (s.p !== undefined) l.penumbra = s.p; if (s.k !== undefined) l.decay = s.k; l.position.copy(s.pos); if (s.t) { l.target.position.copy(s.t); l.target.updateMatrixWorld(); } } }
  function reset(o = {}) {
    restoreLights();
    for (const ov of allOv) ov.reset();
    R.root.visible = false; guard.root.visible = false; handR.root.visible = false; handR.setGlove(true); setRShadow(true);
    navHand.root.visible = false; fut.root.visible = false; futHandL.root.visible = false; for (const g of glints) g.object3D.visible = false; for (const g of saltG) g.object3D.visible = false;
    dofProxy.visible = false; mirMoon.object3D.visible = false; archGlow.visible = false;
    mirMoon.material.uniforms.uInt.value = 9; mirMoon.material.uniforms.uHalo.value = 0.5; archGlow.material.color.setRGB(0.35, 0.42, 0.56);
    eraKey.visible = false; eraKey.intensity = 0; eraLamp.visible = true; eraHemi.color.set(0x3a5078); eraHemi.groundColor.set(0x14100c); eraHemi.intensity = 0.35;
    for (const s of [...shafts, ...shaftsI]) s.object3D.visible = false; dust.object3D.visible = false;
    compass.visible = !o.future; future.visible = !!o.future; g1Deck.material = o.future ? mLinen : g1Velvet;
    g1Spot.visible = true; g1Spot.intensity = o.g1Spot ?? 2.2 * 6;
    g2Light.intensity = o.g2 ?? 0; g2Light.visible = !!o.g2; g3Spot.intensity = 0; g3Spot.visible = false; torch.intensity = 0; torch.visible = false; torchCone.object3D.visible = false;
    inspLamp.visible = false; inspLight.intensity = 0; inspLight.visible = false;
    fillA.intensity = 0; fillA.visible = false; warmFill.intensity = 0; warmFill.visible = false; futTop.intensity = 0; futTop.visible = false;
    poolBounce.intensity = 0; poolBounce.visible = false; mirLight.intensity = 0; mirLight.visible = false;
    hemi.intensity = o.hemi ?? 0.2; hemi.color.set(0x2a3d60); hemi.groundColor.set(0x1c140e);
    setShadowRes(o.shadowRes || 2048); setMoon(o.moon || MOON_CH1, o.moonI ?? 1.6, o.bounds);
    moon.visible = o.moonI !== 0;
    g3[2].door.rotation.y = 0;
    for (const v of g3) { v.strip.visible = true; v.glow.visible = true; v.contents.visible = !!o.g3; v.glow.material.color.copy(v.glowC).multiplyScalar(o.g3glow ?? 1); } g3[1].contents.position.set(0, 0, 0);
    caseLid.rotation.x = -1.95;
    room.userData.skyM.color.setRGB(0.55, 0.62, 0.8); room.userData.skyM.map = room.userData.skyNight;
    scene.background.set('#020305');
    { const eg = scene.getObjectByName('g1edges'), em = eg.userData.m;
      eg.visible = true;
      if (o.future) { em.blending = THREE.NormalBlending; em.color.set(0x3a4541); em.opacity = 0.8; eg.children.forEach((c) => c.scale.set(c.geometry.parameters.width > 0.1 ? 1 : 2.2, c.geometry.parameters.height > 0.1 ? 1 : 2.2, c.geometry.parameters.depth > 0.1 ? 1 : 2.2)); }
      else { em.blending = THREE.AdditiveBlending; em.color.setRGB(0.1, 0.13, 0.12); em.opacity = 1; eg.children.forEach((c) => c.scale.set(1, 1, 1)); } }
    mBrick.visible = !o.future; mLining.color.setRGB(o.lining ?? 1, o.lining ?? 1, o.lining ?? 1);                                                // the future: the brick panels lime-washed over
    mWall.color.set(o.future ? '#a9a296' : '#2c3850'); mWallS.color.set(o.future ? '#a9a296' : '#2c3850');
    S.mirror = null;
  }
  const lightsOnlyMirror = [];
  void lightsOnlyMirror;

  // ======================================================================================================== RESTORER POSES
  // stand at a point facing yaw (rad, 0 = +Z), pure
  function standAt(x, z, yaw, o = {}) {
    R.root.visible = true; R.root.position.set(x, 0, z); R.root.rotation.set(0, yaw, 0);
    R.pose('stand', { weight: o.weight ?? 0.2 });
    if (o.add) R.pose(o.add, { add: true });
    R.root.updateMatrixWorld(true);
  }
  function walkAt(x, z, yaw, dist, o = {}) {
    R.root.visible = true; R.root.position.set(x, 0, z); R.root.rotation.set(0, yaw, 0);
    const cyc = 1.15 * R.P.H / 1.7 * (o.stride ?? 1);
    R.pose('walk', { phase: dist / cyc, stride: o.stride ?? 1 });
    R.root.updateMatrixWorld(true);
  }

  // ======================================================================================================== NESTED ERA VIEWS
  function nested(key, view, tl, u, T, rt) { if (OFF.has('nested') || NONEST) return rt.texture; return ctx.renderNested(key, view, tl, u, T, rt, rt.width / rt.height); }

  // ======================================================================================================== SHOT SETUPS
  // S001 hand choreography (screen coords of the index pad on the glass, from the opening camera): the fingertip enters from
  // frame right, wipes an arc right → left that turns the hand from fingers-left to fingers-up (1.23–4.5 s), then rests with
  // the hand centred at (0.50, 0.55) (T01). The path end is calibrated once so that her palm centre lands there.
  const S1 = { touch: 1.23, wipeEnd: 4.5, off: [0, 0] };
  const INTRO_BOUNDS = { x0: -6, x1: 6, y0: 0, y1: 3, z0: -7, z1: 7.6 };
  const TIP_PTS = [[0.80, 0.52], [0.70, 0.43], [0.61, 0.31], [0.545, 0.21], [0.51, 0.165]];
  const tipPath = (s) => {   // s ∈ [0,1] along the wipe → index pad [fx, fy] + finger angle (0 = pointing left, π/2 = up)
    const f = clamp(s) * (TIP_PTS.length - 1), i = Math.min(TIP_PTS.length - 2, Math.floor(f)), t = f - i;
    const a = TIP_PTS[i], b = TIP_PTS[i + 1], k = ease.inOutSine(clamp(s));
    return { fx: lerp(a[0], b[0], t) + S1.off[0] * k, fy: lerp(a[1], b[1], t) + S1.off[1] * k, ang: lerp(0.18, Math.PI / 2 + 0.03, k) };
  };
  const glassPt = (fx, fy) => { // the opening camera's view of G1's south glass plane
    const w = MC_OPEN.target.distanceTo(MC_OPEN.pos) * 36 / MC_OPEN.mm, h = w / ctx.aspect;
    return V(MC_OPEN.target.x + (fx - 0.5) * w, MC_OPEN.target.y + (0.5 - fy) * h, G1F);
  };
  const toScreenOpen = (p) => { const w = MC_OPEN.target.distanceTo(MC_OPEN.pos) * 36 / MC_OPEN.mm, h = w / ctx.aspect; return [0.5 + (p.x - MC_OPEN.target.x) / w, 0.5 - (p.y - MC_OPEN.target.y) / h]; };
  const toPaneUV = (p) => [(p.x - (G1.x - G1.w / 2)) / G1.w, (p.y - G1.plinthH) / G1.h];
  // her right hand on the glass at wipe progress s, micro tremor amplitude k (m); returns her palm centre (world)
  function herHandOnGlass(s, T, k = 0.0004, lift = 0) {
    handR.root.visible = true;
    const tp = tipPath(s);
    const tip = glassPt(tp.fx, tp.fy).add(V(0, 0, 0.0035 + lift));
    tip.x += k * util.noise1(T * 3.1, 11); tip.y += k * util.noise1(T * 2.7, 12);
    const fd = V(-Math.cos(tp.ang), Math.sin(tp.ang), -0.3).normalize();    // fingertips on the glass, the forearm coming back toward the lens
    if (s < 0.7) handR.pose('wipe'); else handR.setChannels(blendHandChannels(handPose('wipe', {}, handR.dims), handPose('relaxed', { curl: 0.32 }, handR.dims), ease.inOutSine(clamp((s - 0.7) / 0.3))));
    placeHandAt(handR, tip, fd, V(0.0, 0.25, -1), 'index');
    return handR.sockets.palm.getWorldPosition(V());
  }
  // the palm socket sits near the heel of the hand: socket at y 0.65 puts the whole hand's centre on (0.50, 0.55) — fingertips
  // ≈ 0.08 below the frame top, so his (larger) fingertips show above hers
  const S1_PALM_Y = 0.65;
  if (!S1.cal) { // calibrate: palm socket at the end of the wipe → (0.50, S1_PALM_Y)
    for (let it = 0; it < 3; it++) { const pc = herHandOnGlass(1, 0, 0); const sp = toScreenOpen(pc); S1.off[0] += 0.5 - sp[0]; S1.off[1] += S1_PALM_Y - sp[1]; }
    S1.cal = true; handR.root.visible = false;
  }
  // (integration) the hook's wipe: index + middle pads on the glass, the hand ~35° off the pane, fingers leading to the left along
  // an arc (0.78, 0.52) → (0.455, 0.42), 1.23–4.5 s (decelerating); 4.6–6.4 s the hand turns upright and lays its palm to the
  // glass, ending exactly in the rest pose herHandOnGlass(1) (the T01 registration of S002 / S071)
  const WIPE_PTS = [[0.80, 0.37], [0.715, 0.305], [0.63, 0.255], [0.55, 0.222], [0.475, 0.205]];
  const wipeAt = (w) => { const f = clamp(w) * (WIPE_PTS.length - 1), i = Math.min(WIPE_PTS.length - 2, Math.floor(f)), t = f - i; const a = WIPE_PTS[i], b = WIPE_PTS[i + 1]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; };
  const WIPE_W = 0.026, WIPE_SOFT = 0.012, WIPE_DX = 0.02, WIPE_DY = 0.012;  // band half-width (pane heights), edge; centre between the index + middle pads
  function setG1Wipe(prog, widen = 0) { ovG1.setWipe(WIPE_PTS.map((q) => toPaneUV(glassPt(q[0] + WIPE_DX, q[1] + WIPE_DY))), WIPE_W + widen, WIPE_SOFT + widen * 0.4, prog); }
  const T35 = 35 * D2R, TREST = Math.atan(0.3);
  function herHandWipe(w, r, T, k = 0.0003, lift = 0, xoff = 0) {
    handR.root.visible = true;
    const rest = tipPath(1), wp = wipeAt(w), rr = ease.inOutSine(clamp(r));
    const fx = lerp(wp[0], rest.fx, rr), fy = lerp(wp[1], rest.fy, rr);
    const ang = lerp(lerp(1.08, 1.3, w), Math.PI / 2 + 0.03, rr), tilt = lerp(T35, TREST, rr);   // fingers up-left: the band trails to the right, clear of the hand
    const tip = glassPt(fx, fy).add(V(xoff, 0, 0.0035 + lift));
    tip.x += k * util.noise1(T * 3.1, 11); tip.y += k * util.noise1(T * 2.7, 12);
    const fd = V(-Math.cos(ang) * Math.cos(tilt), Math.sin(ang) * Math.cos(tilt), -Math.sin(tilt)).normalize();
    const n0 = V(0, 0, -1).addScaledVector(fd, fd.z).normalize();                // palm toward the glass, square to the fingers
    const palmN = n0.lerp(V(0, 0.25, -1).normalize(), rr).normalize();
    handR.setChannels(blendHandChannels(handPose('wipe', {}, handR.dims), handPose('relaxed', { curl: 0.32 }, handR.dims), rr));
    placeHandAt(handR, tip, fd, palmN, 'index');
    return handR.sockets.palm.getWorldPosition(V());
  }
  // her glove's faint front-surface reflection: a mirror pass of the glove alone about a plane through the contact point, tilted
  // 8° (a cheat: square to the lens the reflection hides behind the hand) so the reflected fingers meet the real ones at the pad
  function gloveReflection(contact, strength, focus) {
    const tl8 = 8 * D2R, n = V(0, Math.sin(tl8), Math.cos(tl8));
    mirLight.position.copy(contact).add(V(0.03, -0.035, -0.035)); mirLight.color.set(0xffd2a0); mirLight.distance = 0.4;
    const mt = mirrorPass(contact, n, rtMir, { hide: [compass, future, g2, g3Grp, guard.root, room, g1.object3D], mirFill: 0.0, boost: [[mirLight, 0.045]] });
    if (!mt) return;
    ovG1.U.tMir.value = blur(mt, rtMirB, Math.min(6, cocPx(camera.position.z - G1F + 0.06, focus, 100, 4) * 0.375 + 0.6)); ovG1.U.uMir.value = strength; ovG1.U.uMirFres.value = 0.0;
  }
  // the navigator's left hand behind the glass at mirror depth d (m), rise r (0 low … 1 in place), palm toward the glass,
  // centred on HER palm (rel = screen offset), ~8 % larger than hers
  function navHandAt(d, r, T, herPalm, rel = [0.008, -0.022], o = {}) {
    navHand.root.visible = true;
    navHand.pose('relaxed', { curl: 0.22 });
    const w = MC_OPEN.target.distanceTo(MC_OPEN.pos) * 36 / MC_OPEN.mm, h = w / ctx.aspect;
    const c = herPalm.clone().setZ(G1F).add(V(rel[0] * w, -rel[1] * h, 0));
    const p = c.clone().add(V(0.0, -(o.drop ?? 0.17) * (1 - r), -d));
    navHand.placeWrist([0, 0, 0], V(-0.03, 1, 0.12).normalize(), V(0, 0, 1)); navHand.root.scale.setScalar(1.06); navHand.root.updateMatrixWorld(true);
    const palm = navHand.sockets.palm.getWorldPosition(V());
    navHand.root.position.add(p.clone().sub(palm)); navHand.root.updateMatrixWorld(true);
    { const fb = navHand.fingerBones, wp = (b) => b.getWorldPosition(V()), pts = [];
      const ctr = navHand.sockets.palm.getWorldPosition(V());
      const edge = (q, k) => { const o = q.clone().sub(ctr); o.z = 0; return q.addScaledVector(o.normalize(), k).add(V(0, 0, 0.0095)); };   // bones sit ~6–8 mm inside the palm surface
      // clusters along the visible margins: thumb, little-finger edge, the finger tops, the heel
      const segs = [[fb.thumb[0], fb.thumb[1], 0.009], [fb.thumb[1], fb.thumb[2], 0.008], [fb.little[0], fb.little[1], 0.008], [fb.little[1], fb.little[2], 0.0065], [fb.ring[1], fb.ring[2], 0.006]];
      const sr = util.rng(93);
      for (let k = 0; k < 40; k++) {
        if (k < 30) { const sg = segs[k % segs.length]; pts.push(edge(wp(sg[0]).lerp(wp(sg[1]), sr()), sg[2] * (0.75 + 0.5 * sr()))); }
        else if (k < 36) pts.push(edge(navHand.tip(['index', 'middle', 'ring', 'little', 'thumb', 'little'][k - 30], V(), false), 0.002 + 0.003 * sr()));
        else pts.push(edge(wp(navHand.byName.wrist).lerp(ctr, 0.3 + 0.3 * sr()), 0.028 + 0.01 * sr()));
      }
      saltG.forEach((g, k) => { const q = pts[k % pts.length]; g.object3D.visible = (o.salt ?? 1) > 0.01; g.object3D.position.copy(q);
        const tw = Math.max(0, util.noise1(T * 2.6 + k * 7.1, 40 + k)); g.set((0.75 + 7.0 * Math.pow(tw, 3)) * (o.salt ?? 1)); }); }
    // his own night: cool moon from the upper right, a warm low ship-lamp glow from the lower left
    eraMoon.intensity = 2.2; eraMoon.color.set(0x9fb4dc); eraMoon.position.copy(p).add(V(0.7, 1.1, 0.5)); eraMoon.target.position.copy(p); eraMoon.target.updateMatrixWorld();   // his night's moon, from the upper right
    eraKey.visible = true; eraKey.color.set(0xb8c8ea); eraKey.position.copy(p).add(V(0.35, 0.5, -0.6)); eraKey.target.position.copy(p); eraKey.target.updateMatrixWorld(); eraKey.intensity = 1.6; eraKey.angle = 0.6; eraKey.penumbra = 0.8; eraKey.distance = 0;   // (integration) cool moon RIM from behind him: the margins outside her glove read
    eraLamp.visible = true; eraLamp.color.set(0xffa860); eraLamp.position.copy(p).add(V(-0.34, -0.2, 0.12)); eraLamp.intensity = 0.05 * util.flicker(T, 3); eraLamp.distance = 2;   // the ship lamp, low and warm
    eraHemi.intensity = 0.1;
    return p;
  }
  // G1's south pane: the night sea (sea_deck view_shiplamp) on a virtual image plane 20 m behind the glass, framed so that
  // from the S002 end camera it fills the frame window x 0.19–0.95 (lamp ≈ (0.36, 0.32))
  // the S002 end camera (review): the pull-back ends with the compass at (0.50, 0.62) as the S002 end frame / S003 frame 0 specify
  // (it ended at 0.74 and S003 opened at 0.62 with the lantern 0.17 frame heights higher: a visible jump on the hidden cut)
  const S2END = (() => {
    const pos = MC_OPEN.pos.clone().lerp(MC_OPEN.target, 0.026).add(V(0.012, 0, 1.2));
    const C = compass.getWorldPosition(V());
    frameAt(pos, C, 0.5, 0.62, 100);
    return { pos, q: camera.quaternion.clone(), C, fov: camera.fov };
  })();
  const SEA = (() => {   // the image plane window x 0.19–0.95 (lamp ≈ (0.36, 0.32)) as seen from the S002 end camera
    const D = 20, zp = G1F - D;
    camera.position.copy(S2END.pos); camera.quaternion.copy(S2END.q); cam.lens(camera, 100); camera.updateMatrixWorld();
    const a = rayZ(0.19, 0.5, zp), b = rayZ(0.95, 0.5, zp), t = rayZ(0.57, 0.0, zp), bt = rayZ(0.57, 1.0, zp);
    const c = a.clone().add(b).multiplyScalar(0.5); c.y = (t.y + bt.y) / 2;
    return { c, U: V((b.x - a.x) / 2, 0, 0), Vv: V(0, (t.y - bt.y) / 2 * 1.02, 0), z: zp };
  })();
  // (integration) the S003 frame-0 camera sees the sea plane through the same screen window as S002's end (the 75 mm camera
  // at 0.75× the distance frames the compass identically but a far plane 20 m away would shrink and jump ~0.07 at the cut)
  const SEA3 = (() => {
    const C = compass.getWorldPosition(V()), d0 = (S2END.pos.z - C.z) * 0.75, h0 = (S2END.pos.y - C.y) * 0.75;
    frameAt(V(C.x + 0.009, C.y + h0, C.z + d0), C, 0.5, 0.62, 75);
    const zp = SEA.z, a = rayZ(0.19, 0.5, zp), b = rayZ(0.95, 0.5, zp), t = rayZ(0.57, 0.0, zp), bt = rayZ(0.57, 1.0, zp);
    const c = a.clone().add(b).multiplyScalar(0.5); c.y = (t.y + bt.y) / 2;
    return { c, U: V((b.x - a.x) / 2, 0, 0), Vv: V(0, (t.y - bt.y) / 2 * 1.02, 0), z: zp };
  })();
  function seaBlur(P, camZ, focus, mm, N) { const z = camZ - P.z, c = cocPx(z, focus, mm, N), scrW = (2 * P.U.x) / (z * 36 / mm) * ctx.W; return Math.min(14, c * rtSea.width / scrW + 0.6); }
  function seaPlane(tl, u, T, strength, focus, mm, N, off = null, o = {}) {
    const P = o.plane || SEA;
    const tex0 = nested('sea_deck', 'view_shiplamp', tl, u, T, rtSea);
    const b = o.blurOverride >= 0 ? o.blurOverride : seaBlur(P, camera.position.z, focus, mm, N);
    eraPlane(ovG1, blur(tex0, rtBlur[560], b), strength, off ? P.c.clone().add(off) : P.c, P.U, P.Vv);
    ovG1.U.uEraSoft.value = 0.16;                                             // a soft vignette: the plate's edges never read inside the pane
    ovG1.U.uEraUV.value.set(1, 0.68, 0, 0.32); ovG1.U.uEraFB.value.set(0.0, 0.28); ovG1.U.uEraComp.value = 0.9;   // (integration) the plate's upper 68 % (lamp, swell, moon road); the lit rail at its foot faded out
  }
  // S002's end optics (the S003 hidden cut starts from them): focus = glass + 0.95 m (S002 rack + recede), f/5.6, 100 mm
  const S2_FOCUS_END = (S2END.pos.z - G1F) + 0.95;
  const S2_SEA_BLUR = seaBlur(SEA, S2END.pos.z, S2_FOCUS_END, 100, 5.6);
  const S2_MIR_BLUR = Math.min(10, cocPx((S2END.pos.z - G1F) + 2.25, S2_FOCUS_END, 100, 5.6) * 0.5 + 0.8);

  const dustFor = (ov, focus, dGlass, mm, N, k) => { ov.U.uDust.value = k; ov.U.uDustLod.value = Math.log2(1 + cocPx(dGlass, focus, mm, N) * 0.5); };

  // ---------------------------------------------------------------------------------------------- INTERLUDE (S028 / S029)
  // geometry shared by both set-ups: she checks G3c (door open) under the hooded lamp; the guard stops between the columns
  // S028 axis: the lens 0.3 m off G3a's glass line looking east-south-east along the north wall — G3c open at frame left, her
  // left shoulder/back soft in the foreground, the north-row columns at x ≈ 0.56 / 0.75 in the deep background
  const IL = { her: V(2.12, 0, G3PZ + 0.5), cam: V(-2.0, 1.42, -6.0), shoulder: V(1.99, 1.33, -5.81) };
  { // the guard's stop: on the S028 camera's horizontal ray through frame x 0.63 (centre third, so the nod reads), ~12 m
    // out, just beyond the north column row; he steps in from frame right (south-east) out of the dark into the moon pool
    const c0 = camera.position.clone(), q0 = camera.quaternion.clone(), mm0 = camera.userData.mm;
    cam.lens(camera, 50); camera.position.copy(IL.cam); camera.up.set(0, 1, 0); camera.lookAt(IL.shoulder);
    for (let i = 0; i < 5; i++) { camera.updateMatrixWorld(); const q = IL.shoulder.clone().project(camera); const vf = camera.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      camera.rotateOnWorldAxis(V(0, 1, 0), (0.35 - (0.5 + 0.5 * q.x)) * hf * 0.98); camera.rotateX((0.5 - (0.5 - 0.5 * q.y)) * vf * 0.98); }
    camera.updateMatrixWorld();
    const r = V(0.63 * 2 - 1, 0, 0.5).unproject(camera).sub(camera.position).setY(0).normalize();
    IL.gStop = IL.cam.clone().setY(0).addScaledVector(r, 12.0);
    const side = V(-r.z, 0, r.x);                                             // screen-right in plan
    IL.gStart = IL.gStop.clone().addScaledVector(side, 1.05).addScaledVector(r, 0.3);
    camera.position.copy(c0); camera.quaternion.copy(q0); if (mm0) cam.lens(camera, mm0);
  }
  function interlude(tl, u, T, id) {
    reset({ moon: MOON_CH1, moonI: 2.3, hemi: 0.3, g3: true, bounds: { x0: -2, x1: 13, y0: 0, y1: 6, z0: -7, z1: 7.6 } });
    const T0 = SHOT_T0.S028, t = T - T0;                                      // interlude clock: tl of S028 (S029 = +2.833)
    g3[2].door.rotation.y = G3C_OPEN;
    // the restorer: leaning into the open case, left forearm resting along the deck edge, right glove on the shirt
    standAt(IL.her.x, IL.her.z, Math.PI + 0.06, { weight: -0.3 });
    R.pose({ 'hips.x': 0.24, 'spine.x': 0.16, 'chest.x': 0.1, 'neck.x': 0.16, 'head.x': 0.16, handL: ['relaxed', { curl: 0.45 }], handR: ['flat', { spread: 0.1 }] }, { add: true });
    R.root.updateMatrixWorld(true);
    if (!IL.eye0) IL.eye0 = R.eye().clone();                                   // S029's framing anchor: the base pose (no beats, no breath)
    // S029 beats: 104.99 eyes up + slightly right, 105.3 quick nod, 105.5 eyes back down
    const up = id === 'S029' ? ease.inOutSine(clamp((tl - 0.30) / 0.2)) * (1 - ease.inOutSine(clamp((tl - 0.84) / 0.25))) : 0;
    const nod = id === 'S029' ? Math.sin(clamp((tl - 0.62) / 0.22) * Math.PI) : 0;
    R.pose({ 'neck.x': -0.16 * up + 0.05 * nod, 'head.x': -0.2 * up + 0.07 * nod, 'head.y': -0.28 * up, 'chest.y': -0.04 * up }, { add: true });
    R.root.updateMatrixWorld(true);
    caseG.updateMatrixWorld(true);
    const deckEdge = V(IL.her.x - 0.1, DECK3 + 0.045, G3.back + G3.d - 0.02);
    R.reach('L', deckEdge, { palm: V(0, -1, 0), fingers: V(0.45, -0.12, -0.9).normalize(), pole: V(-0.75, -0.65, 0.1).normalize() });
    const strokeX = 0.01 * Math.sin(t * 1.3);
    R.reach('R', caseG.localToWorld(V(0.02 + strokeX, 0.13, 0.05)), { palm: V(0, -1, 0.1).normalize(), fingers: V(-0.2, -0.35, -1).normalize(), pole: V(0.7, -0.6, 0.3).normalize() });
    R.breathe(T, 0.6);
    // the guard: walks in from frame right between the columns (S028 0.38–1.2 at ~0.6 m/s), stops, nods (S028 1.58);
    // lingers ~0.5 s after her nod, turns away (S029 2.28) and walks off right, the torch pool sliding away
    guard.root.visible = true;
    const w1 = clamp((t - 0.05) / 1.15), turn = ease.inOutSine(clamp((t - 5.11) / 0.6)), leave = Math.max(0, t - 5.5);
    const dirIn = IL.gStop.clone().sub(IL.gStart).normalize(), yawIn = Math.atan2(dirIn.x, dirIn.z);
    const yawOut = yawIn + Math.PI * 0.9;
    let gp = IL.gStart.clone().lerp(IL.gStop, ease.outSine(w1));
    const yaw = lerp(yawIn, yawOut, turn);
    if (leave > 0) gp = IL.gStop.clone().add(V(Math.sin(yawOut), 0, Math.cos(yawOut)).multiplyScalar(0.6 * leave));
    if (id === 'S029') gp.add(V(0.28, 0, -1.0));                              // cheat across the cut: he holds background right of her (≈0.74)
    guard.root.position.copy(gp); guard.root.rotation.set(0, yaw, 0);
    const walking = (t < 1.22) || leave > 0;
    const gv = IL.gStart.distanceTo(IL.gStop) / 0.82;
    if (walking) guard.pose('walk', { phase: (leave > 0 ? leave * 0.6 : ease.outSine(w1) * IL.gStart.distanceTo(IL.gStop)) / (1.15 * guard.P.H / 1.7), stride: 0.75 }); else guard.pose('stand', { weight: 0.15 });
    void gv;
    // left hand behind his back, torch in the right, beam on the floor
    guard.pose({ 'armL.upper.x': -0.32, 'armL.upper.z': 0.05, 'armL.lower.x': 1.35, 'armL.lower.y': 0.8, 'armR.upper.x': 0.32, 'armR.lower.x': 0.55, handL: ['relaxed', { curl: 0.7 }], handR: ['grip', { radius: 0.015 }] }, { add: true });
    const gnod = Math.sin(clamp((t - 1.48) / 0.5) * Math.PI);
    guard.pose({ 'neck.x': 0.07 * gnod, 'head.x': 0.06 * gnod }, { add: true });
    guard.root.updateMatrixWorld(true);
    // his free (left) hand behind his back: IK to the small of the back, palm out, fingers across
    { const L2W = (x, y, z) => V(x, y, z).transformDirection(guard.root.matrixWorld);
      guard.reach('L', guard.root.localToWorld(V(0.05, 0.98, -0.15)), { palm: L2W(0, 0, -1), fingers: L2W(-0.8, -0.5, 0).normalize(), pole: L2W(1, 0, -0.6).normalize() }); guard.root.updateMatrixWorld(true); }
    if (t > 1.2 && t < 5.2) guard.lookAt(R.eye(), 0.6);
    // torch: SpotLight + cone from the hand, aimed at the floor ~1.6 m ahead
    const hand = guard.socket('R', 'grip').getWorldPosition(V());
    const fwdG = V(Math.sin(yaw), 0, Math.cos(yaw));
    const tgtT = hand.clone().addScaledVector(fwdG, 0.55).setY(0.02);
    torch.visible = true; torchCone.object3D.visible = true; torch.position.copy(hand); torch.target.position.copy(tgtT); torch.target.updateMatrixWorld();
    torch.intensity = 6; torch.angle = 0.3; torch.distance = 8;
    torchCone.update(T, { origin: hand, dir: tgtT.clone().sub(hand), intensity: 0.025 });
    // practicals at G3c: the dim case light and the hooded inspection lamp (only into the case; warm on her lower face)
    inspLamp.visible = true; inspLight.visible = true;
    inspLight.position.copy(caseG.localToWorld(V(0.36, 0.34, 0.12))); inspLight.target.position.copy(caseG.localToWorld(V(-0.04, 0.04, -0.04))); inspLight.target.updateMatrixWorld();
    inspLight.intensity = 0.9; inspLight.angle = 0.55; inspLight.distance = 1.6; inspLight.color.set(0xffd6a6);
    g3Spot.visible = true; g3Spot.position.set(G3.xs[2], G3.top - 0.05, G3.back + 0.45); g3Spot.target.position.copy(caseG.getWorldPosition(V())); g3Spot.target.updateMatrixWorld(); g3Spot.intensity = 0.5; g3Spot.angle = 0.24;   // the case only, not her head
    { const toCam = IL.cam.clone().sub(IL.gStop).setY(0).normalize();     // the moon pool's bounce on him (close: spares the columns)
      // he walks out of the dark into the pool (it lights him as he arrives, then leaves with him); from the doorway side, so
      // his face is half-lit, not a pale front-lit mask
      const inPool = smoothstep(0.15, 0.85, ease.outSine(w1)) * (1 - smoothstep(0.6, 1.6, leave));
      fillA.visible = true; fillA.color.set(0x9aaccc); fillA.position.copy(gp).addScaledVector(toCam, 0.45).add(V(0.5, 1.75, 0.6)); fillA.intensity = 2.1 * (0.12 + 0.88 * inPool); fillA.distance = 2.6; }
    for (const s of shafts) s.object3D.visible = true; for (const s of shafts) s.update(T, { intensity: 0.06 });
    // the case's warm light falling back on her (front / cheek): she is lit by what she studies
    warmFill.visible = true; warmFill.color.set(0xffd0a0); warmFill.position.copy(caseG.localToWorld(V(-0.05, 0.2, 0.22))); warmFill.intensity = 0.1; warmFill.distance = 0.9;   // bounce off the shirt (chin)
    const herShoulder = R.worldPos('armL.upper').add(V(0, 0.02, 0)), eye = R.eye();
    // a cold moon edge on her back / shoulder / hair from the doorways behind (narrow spot, keeps the floor dark)
    futTop.visible = true; futTop.color.set(0xc8d2db); futTop.position.copy(herShoulder).add(V(1.3, 1.6, 2.2));   // from the doorways behind her (SE): an edge, not a front fill toward the west-side lens futTop.target.position.copy(herShoulder).add(V(0, 0.05, 0)); futTop.target.updateMatrixWorld();
    futTop.intensity = 4.0; futTop.angle = 0.16; futTop.penumbra = 0.7; futTop.distance = 0;
    if (id === 'S028') {
      frameAt(IL.cam, IL.shoulder, 0.35, 0.50, 50);
      const fr = ease.inOutSine(clamp((tl - 0.6) / 0.8));
      const focus = lerp(cam.distTo(camera, herShoulder), cam.distTo(camera, gp.clone().setY(1.5)), fr);
      DBGP.shoulder = herShoulder; DBGP.guard = gp.clone().setY(1.0);
      return { dof: { focus, fstop: 2.0, maxCoc: 1.4 }, exposure: 1.6, bloom: { strength: 0.3, threshold: 0.86 } };
    }
    {
      // same side, tighter: 2.3 m from her eye, pushed to G3's glass line (z −6.22) so the guard stays in the background right
      const zc = -6.22, dz = IL.eye0.z - zc, dx = Math.sqrt(Math.max(2.3 * 2.3 - dz * dz, 1));
      const p29 = V(IL.eye0.x - dx, IL.eye0.y + 0.04, zc); frameAt(p29, IL.eye0, 0.32, 0.42, 75); }
    const fr = ease.inOutSine(clamp((tl - 0.98) / 0.8));
    const focus = lerp(cam.distTo(camera, eye), cam.distTo(camera, gp.clone().setY(1.5)), fr);
    DBGP.eye = eye; DBGP.guard = gp.clone().setY(1.0);
    return { dof: { focus, fstop: 2.0, maxCoc: 1.4 }, exposure: 1.5, bloom: { strength: 0.3, threshold: 0.86 } };
  }
  // ---------------------------------------------------------------------------------------------- FUTURE (S070 / S071 / S078)
  // CT_FUTURE: the same gallery, softer & higher-key, silver-white with a trace of warmth, lowest contrast; no sci-fi teal
  function futureLook(o = {}) {
    reset({ future: true, moon: MOON_FUT, moonI: o.dawn ? 0.6 : 0.3, hemi: o.dawn ? 0.9 : 3.0, g3: false, shadowRes: 1024, bounds: { x0: -3, x1: 3, y0: 0, y1: 3, z0: 1, z1: 7.6 } });
    hemi.color.set(0xe6e5e2); hemi.groundColor.set(0x948a7e);
    g1Spot.intensity = 0; g1Spot.visible = false;
    futTop.visible = true; futTop.color.set(0xf6f1e8); futTop.position.set(G1.x + 0.5, 3.8, G1.z + 0.9); futTop.target.position.set(G1.x, DECK1, G1.z); futTop.target.updateMatrixWorld();
    futTop.intensity = 7; futTop.angle = 0.7; futTop.penumbra = 1.0; futTop.distance = 0;
    fillA.visible = true; fillA.color.set(0xe8ecf2); fillA.position.set(G1.x - 1.2, 1.9, G1.z + 1.6); fillA.intensity = 1.6; fillA.distance = 5;   // soft side light (models the wool)
    room.userData.skyM.color.setRGB(o.dawn ? 1.3 : 0.9, o.dawn ? 1.3 : 0.95, o.dawn ? 1.3 : 1.0); if (o.dawn) room.userData.skyM.map = room.userData.skyDawn;
    warmFill.visible = true; warmFill.color.set(0xffd9b8); warmFill.position.set(G1.x + 1.6, 1.2, G1.z + 2.6); warmFill.intensity = o.dawn ? 1.4 : 0.6; warmFill.distance = 5;
    scene.background.set('#0e1013');
  }
  const futurePost = (r) => ({ contrast: 0.9, saturation: 0.8, lift: [0.035, 0.035, 0.034], gamma: [1.0, 1.0, 1.0], temp: 0.03, tint: 0.0,
    shadowTint: [0.5, 0.5, 0.52], highTint: [0.53, 0.52, 0.5], grain: 0.025, vignette: 0.22, bloom: { strength: 0.18, threshold: 0.92, radius: 0.6 }, ...r });
  // the future viewer as a virtual image behind G1's south glass (a reflection composited as seen; never resolves)
  function futureViewer(tl, T, o) {
    fut.root.visible = true; eraKey.visible = true; navHand.root.visible = false; for (const g of glints) g.object3D.visible = false;
    eraMoon.intensity = 0; eraLamp.visible = false; eraHemi.intensity = 0.7; eraHemi.color.set(0xe8eaee); eraHemi.groundColor.set(0x7a7268);
    fut.hands.L.root.visible = true;
    if (!o.profile) {
      // facing the lens; raises its LEFT hand (the mirror of a right hand) palm to the glass at the T01 point (0.50, 0.55)
      const T01 = glassPt(0.50, 0.55).setZ(G1F - 0.025);
      const z = o.stand - 0.35 * (1 - o.step);
      fut.root.position.set(T01.x - 0.24, 0, z); fut.root.rotation.set(0, 0.06, 0);
      fut.pose('stand', { weight: 0.15 }); fut.pose({ 'neck.x': 0.12, 'head.x': 0.1 }, { add: true });
      fut.breathe(T, 0.6);
      const low = V(T01.x + 0.02, 0.86, z + 0.12);
      const rp = T01.clone().add(V(0, -0.075, -0.005));
      const wrist = low.clone().lerp(rp, o.rise);
      const fingD = V(0.05, lerp(0.2, 1, o.rise), lerp(0.95, 0.1, o.rise)).normalize(), palmD = V(0, 0.15 * (1 - o.rise), 1).normalize();
      // the close-up hand on the figure's wrist (the figure-LOD hand hidden); the IK target is corrected by the palm-centre
      // residual so the palm lands on T01 at the end while the hand stays on the arm (no gap at the sleeve)
      fut.hands.L.root.visible = false; futHandL.root.visible = true; futHandL.pose('flat', { spread: 0.25 });
      for (let it = 0; it < 3; it++) {
        fut.reach('L', wrist, { palm: palmD, fingers: fingD, pole: V(0.35, -1, 0.15).normalize() });   // elbow down: the sleeve seen from the side, not end-on
        futHandL.placeWrist(fut.worldPos('armL.hand'), fingD, palmD); futHandL.root.updateMatrixWorld(true);
        const pc = futHandL.sockets.palm.getWorldPosition(V()), goal = T01.clone().add(V(0, -0.046, 0));   // socket sits near the heel: hand centre → (0.50, 0.55), as S002's T01
        wrist.addScaledVector(goal.sub(pc).setZ(0), o.rise);
        if (it === 2) { DBGP.futPalm = pc.clone(); DBGP.T01 = T01.clone(); DBGP.futWrist = fut.worldPos('armL.hand'); }
      }
      fut.lookAt(T01.clone().add(V(0, 0, 1)), 0.6);
      eraKey.position.copy(T01).add(V(0.25, 0.9, 1.6)); eraKey.target.position.copy(T01).add(V(-0.2, 0.2, -0.3)); eraKey.target.updateMatrixWorld(); eraKey.intensity = 2.2; eraKey.angle = 0.7; eraKey.color.set(0xf4eee4); eraHemi.intensity = 0.45;
    } else {
      // profile facing screen-right (a lost profile, turned ~10° away from the lens) toward the doorway's not-yet-dawn sky;
      // the eye registered on o.eye at o.dist along the lens ray (a virtual image ~2 m behind the glass)
      futHandL.root.visible = false;
      camera.updateMatrixWorld();
      const r = V(o.eye[0] * 2 - 1, 1 - o.eye[1] * 2, 0.5).unproject(camera).sub(camera.position).normalize();
      const rp = V(r.x, 0, r.z).normalize(), perp = V(-rp.z, 0, rp.x);
      const face = perp.clone().addScaledVector(rp, 0.18).normalize();
      fut.root.rotation.set(0, Math.atan2(face.x, face.z), 0); fut.root.position.set(0, 0, 0);
      fut.pose('stand', { weight: 0.1 }); fut.pose({ 'neck.x': -0.05, 'head.x': -0.03 }, { add: true }); fut.breathe(T, 0.6);
      fut.root.updateMatrixWorld(true);
      for (let i = 0; i < 3; i++) { const e = fut.eye(); const hit = camera.position.clone().addScaledVector(r, o.dist); fut.root.position.add(hit.sub(e)); fut.root.updateMatrixWorld(true); }
      const e = fut.eye();
      // the only directional light: the pre-dawn sky ahead of the face (screen right), a touch behind it → brow/nose/chin line
      eraKey.position.copy(e).addScaledVector(face, 1.6).addScaledVector(rp, 0.7).add(V(0, 0.35, 0)); eraKey.target.position.copy(e); eraKey.target.updateMatrixWorld();
      eraKey.intensity = o.key ?? 9.0; eraKey.angle = 0.5; eraKey.color.set(0xe9e4e0);
      eraHemi.intensity = 0.1;
    }
    fut.root.updateMatrixWorld(true);
  }

  // (integration) the glove's light in S001–S002 (one function, so the hidden seam S001 → S002 is lit identically): the pin
  // spot's warm spill raking down across the back of the glove (texture, seams), a little warm top spill, a cool moon edge
  // from the doorway side. k fades them (S002: the hand leaves)
  const G3GLOW_INTRO = 5, S2MIR = 0.3;
  function introGloveLights(rset, k = 1) {
    futTop.visible = k > 0.001; futTop.color.set(0xffcf9c); futTop.position.set(-0.1, 1.5, G1F + 0.05); futTop.target.position.set(0.06, 1.14, G1F + 0.02); futTop.target.updateMatrixWorld();
    futTop.intensity = lerp(0.17, 0.1, ease.inOutSine(clamp(rset))) * k; futTop.angle = 0.5; futTop.penumbra = 0.9; futTop.distance = 0;
    warmFill.visible = true; warmFill.color.set(0xffc890); warmFill.position.set(0.02, 1.62, G1F + 0.12); warmFill.intensity = 0.03; warmFill.distance = 0.9;
    fillA.visible = k > 0.001; fillA.color.set(0x9db0d0); fillA.position.set(0.42, 1.05, G1F + 0.35); fillA.intensity = 0.035 * k; fillA.distance = 0.9;   // cool moon edge (doorway side)
  }
  // the far torch sweep (S002 19.5 s): the guard far beyond G1 swings his beam right → left once (sw 0 → 1)
  function torchSweep(sw, T) {
    if (!(sw > 0 && sw < 1)) return;
    const env = Math.sin(Math.PI * sw), a = lerp(0.95, -0.95, ease.inOutSine(sw));
    const o = V(1.3, 1.05, -5.6), tgt = o.clone().add(V(Math.sin(a) * 2.6, -1.05, 1.2 + Math.cos(a) * 0.6));
    torch.visible = true; torch.position.copy(o); torch.target.position.copy(tgt); torch.target.updateMatrixWorld();
    torch.intensity = 14 * env; torch.angle = 0.32; torch.penumbra = 0.85; torch.distance = 10;
    torchCone.object3D.visible = true; torchCone.update(T, { origin: o, dir: tgt.clone().sub(o), intensity: 0.035 * env });
  }

  // (integration) the moonlit gallery night (S023–S030, S040): the base is the corridor's level (mean 6–10 %, ≤ 40 % of pixels
  // below 4 %): hemisphere fill with a cool floor-bounce ground colour (ceiling, beams), the pools' first bounce under the floor
  // (walls, cases, columns), the doorway shafts with dust. Never a black frame; night stays night.
  function nightGallery({ hemi: hI = 0.45, bounce = 2.4, at = [0, -0.3, -2.5], dist = 14, wall = '#4c5670' } = {}) {
    mWall.color.set(wall); mWallS.color.set(wall);   // the lime-washed plaster under the moon reads deep blue (P02/P03), not black
    hemi.intensity = hI; hemi.color.set(0x34486e); hemi.groundColor.set(0x3a4560);
    poolBounce.visible = bounce > 0; poolBounce.color.set(0xa9b5c9); poolBounce.position.set(at[0], at[1], at[2]); poolBounce.intensity = bounce; poolBounce.distance = dist;
  }

  const setups = {
    // ---------------------------------------------------------------------------------------------- S001 ECU 100 mm
    // 0–13.25 s, fade in. MC push 2 %. 1.23 touch; 1.2–4.5 wipe arc; 3.0 salt glints in the cleared band; 6.6–9 focus racks
    // through the glass; 8–11 his left hand rises, palm to glass, stops one finger short; 11–13.25 still, closing mm.
    S001(tl, u, T) {
      // (integration) the hook. 0–3 s must read "a white cotton glove wiping museum glass": a lit dust film on the pane (brightest
      // along the top, where the pin spot rakes it), the fingertip pads clearing a clean dark band, the glove's faint reflection
      // meeting it at the contact point, 2.75–4 s a few faceted salt crystals glinting in the cleared band; 4.6–6.4 the hand turns
      // upright onto the glass; 6.6 s the salt hand rises from below frame IN the wiped glass (25 % → full by 8.5 s), stops one
      // finger short at 11.0 s; the focus follows him in but never lets her glove pass ~6 px of blur.
      reset({ moon: MOON_INTRO, moonI: 0.5, bounds: INTRO_BOUNDS, hemi: 0.1, shadowRes: 1024, g3glow: G3GLOW_INTRO });
      const push = ease.inOutSine(clamp(tl / 13.25));
      const pos = MC_OPEN.pos.clone().lerp(MC_OPEN.target, 0.02 * push);
      cam.place(camera, pos, MC_OPEN.target); cam.lens(camera, MC_OPEN.mm);
      const fGlass = camera.position.z - G1F;
      // her hand: enters from the right (0.15–1.23), wipes 1.23–4.5 (decelerating), turns onto the glass 4.6–6.4, rests (tremor)
      const w = tl < S1.touch ? 0 : ease.outCubic(clamp((tl - S1.touch) / (S1.wipeEnd - S1.touch)));
      const rset = clamp((tl - 4.6) / 1.8);
      const enter = ease.outCubic(clamp((tl - 0.15) / 1.08));
      const herPalm = herHandWipe(w, rset, T, 0.0003, (1 - enter) * 0.028, (1 - enter) * 0.085);
      const contact = handR.tip('index', V()).setZ(G1F);
      // light: the pin spot's warm spill rakes down across the back of the glove (texture, seams), a cool moon edge from the
      // doorway behind the lens; the far hood edges stay dark (they read as cage bars)
      introGloveLights(rset, 1);
      scene.getObjectByName('g1edges').visible = false;
      // the dust film + the wiped band
      setG1Wipe(w);
      ovG1.U.uDust2.value = 0.09; ovG1.U.uDust2K.value.set(0.42, 0.3, 0.5, 0.05); ovG1.U.uDustLit.value.set(0.33, 0.64); ovG1.U.uDustTop.value = 0.88;
      // his hand: 6.6 s rises from below frame at ~25 %, readable by 8.5 s, advances 26 → 2 cm behind the glass, stops at 11.0 s
      // one finger short; then closes 2 → 1.2 cm (S002 carries on to near-coincidence on 千)
      const kr = ease.inOutSine(clamp((tl - 6.6) / 4.4));
      const d = lerp(0.26, 0.02, kr) - 0.008 * ease.inOutSine(clamp((tl - 11) / 2.25));
      const vis = 0.25 + 0.75 * smoothstep(6.6, 8.5, tl);
      const rise = ease.outSine(clamp((tl - 6.6) / 4.4));
      if (tl > 6.5) navHandAt(d, rise, T, herPalm, undefined, { salt: smoothstep(7.5, 8.6, tl), drop: 0.3 });
      // salt crystals (2.75–4.2 s): a cluster in the cleared band x 0.55–0.70, each catching the light for a few frames
      const gOn = tl > 2.6 && tl < 6.6;
      for (let k = 0; k < glints.length; k++) {
        const fx = 0.55 + 0.15 * ((k * 0.618) % 1), wp = wipeAt(clamp((0.80 + WIPE_DX - fx) / 0.325));
        const gpt = glassPt(fx + 0.006 * Math.sin(k * 2.3), wp[1] + WIPE_DY + 0.035 * Math.cos(k * 1.7)).add(V(0, 0, -0.005 - 0.002 * (k % 3)));
        glints[k].object3D.visible = gOn; glints[k].object3D.position.copy(gpt);
        const t0 = 2.75 + 0.19 * k, flash = Math.exp(-(((tl - t0) / 0.07) ** 2)) + 0.5 * Math.exp(-(((tl - t0 - 0.9) / 0.06) ** 2));
        glints[k].set(smoothstep(2.6, 2.9, tl) * (1 - smoothstep(5.0, 6.4, tl)), flash);
      }
      // focus: the glass surface → from 6.6 (≥ 1 beat) into the glass after his hand, at most ~11 cm deep (her glove ≤ ~6 px)
      const rack = ease.inOutSine(clamp((tl - 6.6) / 2.2));
      const focus = fGlass + rack * Math.min(0.48 * d + 0.006, 0.105) + lerp(0.004, 0, rack);
      if (tl > 6.5 || gOn) {
        const eraTex = eraPass();
        ovG1.U.tEra2.value = eraTex; ovG1.U.uEra2.value = tl > 6.5 ? 0.9 * vis : 0.9; ovG1.U.uMaskFloor2.value = 0.45;
        ovG1.U.uEra2Over.value = 0.85;   // his hand hides what lies behind the glass (else the depth proxy kept the compass sharp inside it)
        ovG1.U.uEra2Depth.value = tl > 6.5 ? Math.max(d, 0.006) : 0.006;
      }
      // her glove's faint reflection on the pane meets the fingertip at the contact point (strongest while she wipes)
      if (tl > 0.9) gloveReflection(contact, 0.2 * smoothstep(0.9, 1.4, tl) * (1 - 0.55 * ease.inOutSine(clamp((tl - 4.6) / 1.8))), focus);
      ovG1.U.uDustLod.value = Math.log2(1 + cocPx(fGlass, focus, 100, 4) * 0.5);
      ovG1.U.uGlint.value = 0;
      DBGP.herPalm = herPalm; DBGP.contact = contact;
      return { dof: { focus, fstop: 4.0, maxCoc: 1.6 }, exposure: 1.3, bloom: { strength: 0.3, threshold: 0.86 } };
    },
    // ---------------------------------------------------------------------------------------------- S002 ECU → MCU 100 mm
    // 13.25–21.125. Residual push to 3.45 s; hands nearly coincide on 千 (15.14 → tl 1.89); her tremor on 年 (tl 2.31);
    // 3.4–3.9 her hand lifts and exits right; from 3.45 a slow 1.2 m pull-back; 4.24 (17.49) focus into mirror depth, his hand
    // recedes ~40 cm and darkens as the night sea opens in the pane; 6.25 (19.5) the guard's torch sweeps once far away.
    S002(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: lerp(0.5, 1.1, ease.inOutSine(clamp((tl - 3.5) / 4.3))), bounds: INTRO_BOUNDS, hemi: 0.1, shadowRes: 1024, g3glow: G3GLOW_INTRO });
      const back = ease.inOutSine(clamp((tl - 3.45) / 4.43)) * 1.2;
      const pushRes = 0.02 + 0.006 * ease.outSine(clamp(tl / 3.45));
      const base = MC_OPEN.pos.clone().lerp(MC_OPEN.target, pushRes);
      const pos = base.clone().add(V(0.012 * smoothstep(7.2, 7.875, tl), 0, back));
      cam.place(camera, pos, MC_OPEN.target); cam.lens(camera, MC_OPEN.mm);
      const kq = ease.inOutSine(smoothstep(3.5, 7.875, tl)); if (kq > 0) { camera.quaternion.slerp(S2END.q, kq); camera.updateMatrixWorld(); }   // tilts to the end framing
      const fGlass = camera.position.z - G1F;
      // her hand: still (tremor on 年), lifts 3.4 and exits right by 3.9; his hand aligned on her resting palm
      const herP0 = herHandOnGlass(1, 0, 0, 0);
      const lift = ease.inOutSine(clamp((tl - 3.4) / 0.5));
      herHandOnGlass(1, T * 4, 0.0004 + 0.0016 * Math.exp(-Math.pow((tl - 2.31) / 0.12, 2)), 0.03 * lift);
      if (lift > 0) { handR.root.position.x += 0.35 * lift * lift; handR.root.updateMatrixWorld(true); }
      handR.root.visible = lift < 1;
      introGloveLights(1, 1 - lift);
      // the far hood edges come back with the pull-back (the hood must read at the MCU end; S003 matches it)
      { const eg = scene.getObjectByName('g1edges'), ke = smoothstep(4.0, 7.0, tl); eg.visible = ke > 0.01; eg.userData.m.color.setRGB(0.1 * ke, 0.13 * ke, 0.12 * ke); }
      // his hand: closes the last millimetres to near-coincidence by 1.9, still; from 4.24 recedes 40 cm and darkens
      const recede = ease.inOutSine(clamp((tl - 4.24) / 2.6));
      const d = lerp(0.012, 0.006, ease.inOutSine(clamp(tl / 1.9))) + 0.40 * recede;
      navHandAt(d, 1, T, herP0, undefined, { salt: 1 - recede });
      // focus: glass (both hands) → 4.24 into the mirror depth: the receding hand, the sea and the vitrine read together
      const rack = ease.inOutSine(clamp((tl - 4.24) / 1.0));
      const focus = fGlass + lerp(0.006, 0.55, rack) + 0.4 * recede * rack;
      const eraTex = eraPass();
      ovG1.U.tEra2.value = eraTex; ovG1.U.uEra2.value = 0.9 * (1 - 0.8 * recede); ovG1.U.uEra2Depth.value = d; ovG1.U.uEra2Over.value = 0.85;
      // the sea opens first inside the wiped band, then across the whole pane (the band itself stays as she wiped it); the dust
      // film stays on the glass, softening as the focus goes deep
      const open = ease.inOutSine(clamp((tl - 3.7) / 3.2));
      setG1Wipe(1);
      ovG1.U.uMaskFloor.value = lerp(0.2, 1.0, open); ovG1.U.uMaskFloor2.value = 0.45;
      seaPlane(tl, u, T, ease.inOutSine(clamp((tl - 2.9) / 3.6)), Math.max(focus, fGlass + 0.3 * rack), 100, 5.6);   // nothing at the S001 seam; opens with the pull-back
      ovG1.U.uDust2.value = 0.09 * (1 - 0.45 * open); ovG1.U.uDust2K.value.set(0.42, 0.3, 0.5, 0.05);
      ovG1.U.uDustLit.value.set(lerp(0.33, 0.45, open), lerp(0.64, 1.0, open)); ovG1.U.uDustTop.value = 0.88;
      ovG1.U.uDustLod.value = Math.log2(1 + cocPx(fGlass, focus, 100, 5.6) * 0.5);
      if (tl < 3.6) gloveReflection(handR.tip('index', V()).setZ(G1F), 0.09 * (1 - lift), focus);
      // her faint reflected silhouette (she stepped back to the right of the lens) — true mirror: head and shoulders dark, a
      // cool rim from the doorway behind her (no front fill: the reflection shows the side of her that faces the glass)
      if (tl > 3.6) {
        standAt(0.40, G1F + 1.05 + back, Math.PI + 0.2, { weight: 0.3 });
        R.pose({ 'armR.upper.x': 0.12, 'armR.lower.x': 0.35, 'neck.x': 0.14, 'head.y': 0.2 }, { add: true }); R.lookAt(V(0, 1.12, G1F - 0.2), 0.6);
        R.root.updateMatrixWorld(true);
        mirLight.position.copy(R.eye()).add(V(0.25, 0.25, 0.75)); mirLight.color.set(0xb4c4e0); mirLight.distance = 2.2;
        const mt = mirrorPass(V(0, 1.2, G1F), V(0, 0, 1), rtMir, { hide: [compass, future, room.userData.sky], mirFill: 0.08, boost: [[mirLight, 0.9 * smoothstep(3.9, 4.8, tl)]] });   // (the corridor sky would print a hard blue doorway over the sea)
        const zr = fGlass + (R.root.position.z - G1F);
        ovG1.U.tMir.value = blur(mt, rtMirB, Math.min(10, cocPx(zr, focus, 100, 5.6) * 0.5 + 0.8)); ovG1.U.uMir.value = S2MIR * smoothstep(3.8, 5.2, tl); ovG1.U.uMirFres.value = 0.0;
      }
      // far background (19.5 s): the guard's torch swings once right → left far beyond the case — a soft beam, a moving pool on
      // the far floor and the cases, never brighter than ~10 %
      torchSweep(clamp((tl - 5.85) / 0.85), T);
      return { dof: { focus, fstop: 5.6, maxCoc: 1.5 }, exposure: 1.3, bloom: { strength: 0.32, threshold: 0.86 } };
    },
    // ---------------------------------------------------------------------------------------------- S003 CU 75 mm
    // 21.125–28.42. 0–0.45 retreat momentum → slow rightward arc ~15° + push toward the compass, settles 4.9 s; the sea slides
    // off the pane by angle (gone by ~2.9 s — virtual image plane far behind the glass); focus reflection → dial; hold.
    S003(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: 1.1, bounds: INTRO_BOUNDS, hemi: 0.1, shadowRes: 1024, g3glow: G3GLOW_INTRO });
      const a = ease.inOutSine(clamp((tl - 0.1) / 4.8));
      const C = compass.getWorldPosition(V());
      const ang = lerp(0, 15, a) * D2R;
      const d0 = (S2END.pos.z - C.z) * 0.75, h0 = (S2END.pos.y - C.y) * 0.75;   // same framing as S002's last frame, 100 → 75 mm
      const dist = lerp(d0, 0.98, a), hgt = lerp(h0, 0.42, a);
      const pos = V(C.x + Math.sin(ang) * dist + 0.009 * (1 - a), C.y + hgt, C.z + Math.cos(ang) * dist);
      frameAt(pos, C, 0.5, lerp(0.62, 0.55, a), 75);
      const fC = cam.distTo(camera, C);
      const focus = lerp(fC + 2.2, fC, ease.inOutSine(clamp((tl - 0.5) / 1.3)));
      // (integration) the hidden cut S002 → S003: for the first ~0.6 s every reflected layer is driven as S002's end saw it — the
      // sea plane fitted to S003's frame-0 camera (same screen window, so the lamp stays at S002's (0.39, 0.29)), S002's blur,
      // her reflection rendered from S002's end camera — then eases into this shot's own optics as the arc begins.
      // ruling 1: the era image follows the shot list's layout — it slides toward frame LEFT with the angle change and leaves
      // past the hood's left edge by ~1.8 s, gone by 2.9 s
      const kc = smoothstep(0.0, 0.6, tl);
      seaPlane(tl + 7.875, u, T, 1.0, focus, 75, 5.6, V(-14.0 * ease.inOutSine(clamp((tl - 0.45) / 1.9)), 0, 0), { plane: SEA3, blurOverride: lerp(S2_SEA_BLUR, seaBlur(SEA3, camera.position.z, focus, 75, 5.6), kc) });
      // the dust film and the wiped band continue from S002 (they leave the frame with the arc)
      setG1Wipe(1); ovG1.U.uDust2.value = 0.09 * 0.55 * (1 - 0.4 * a); ovG1.U.uDust2K.value.set(0.42, 0.3, 0.5, 0.05);
      ovG1.U.uDustLit.value.set(0.45, 1.0); ovG1.U.uDustTop.value = 0.88;
      ovG1.U.uDustLod.value = Math.log2(1 + cocPx(cam.distTo(camera, V(C.x, C.y, G1F)), focus, 75, 5.6) * 0.5);
      // continuity across the hidden cut: her faint reflected silhouette (S002's end) is still in the pane and leaves by angle
      if (tl < 2.2) {
        standAt(0.40, G1F + 2.25, Math.PI + 0.2, { weight: 0.3 });
        R.pose({ 'armR.upper.x': 0.12, 'armR.lower.x': 0.35, 'neck.x': 0.14, 'head.y': 0.2 }, { add: true }); R.lookAt(V(0, 1.12, G1F - 0.2), 0.6);
        R.root.updateMatrixWorld(true);
        mirLight.position.copy(R.eye()).add(V(0.25, 0.25, 0.75)); mirLight.color.set(0xb4c4e0); mirLight.distance = 2.2;
        // the mirror camera: S002's end camera at the cut, easing into this one
        const cp = camera.position.clone(), cq = camera.quaternion.clone(), cf = camera.fov;
        if (kc < 1) { camera.position.lerpVectors(S2END.pos, cp, kc); camera.quaternion.slerpQuaternions(S2END.q, cq, kc); camera.fov = lerp(S2END.fov, cf, kc); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }
        const mt = mirrorPass(V(0, 1.2, G1F), V(0, 0, 1), rtMir, { hide: [compass, future, room.userData.sky], mirFill: 0.08, boost: [[mirLight, 0.9]] });
        camera.position.copy(cp); camera.quaternion.copy(cq); camera.fov = cf; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        const zr = cam.distTo(camera, V(C.x, C.y, G1F)) + (R.root.position.z - G1F);
        ovG1.U.tMir.value = blur(mt, rtMirB, lerp(S2_MIR_BLUR, Math.min(10, cocPx(zr, focus, 75, 5.6) * 0.5 + 0.8), kc)); ovG1.U.uMir.value = S2MIR * (1 - smoothstep(1.5, 2.2, tl)); ovG1.U.uMirFres.value = 0.0;
      }
      return { dof: { focus, fstop: 5.6, maxCoc: 1.4 }, exposure: lerp(1.3, 1.35, kc), bloom: { strength: lerp(0.32, 0.3, kc), threshold: lerp(0.86, 0.9, kc) } };
    },
    // ---------------------------------------------------------------------------------------------- S004 INSERT 50 mm overhead
    // 28.42–31.67. Square to the 10° board through G2's glass; T03 registry for the S005 match cut; frame 0 the gloved fingertip
    // rests on the glass at (0.90, 0.82); 0.2–1.1 it lifts and withdraws right, its faint reflection gone by 1.4; ~3 % push.
    S004(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: 2.0, g2: 1.6, bounds: { x0: 0, x1: 5, y0: 0, y1: 2, z0: 1.5, z1: 7.6 }, hemi: 0.08 });
      g1Spot.intensity = 0;
      chartBoard.updateMatrixWorld(true);
      const fr2loc = chartBoard.userData.fr2loc;
      const c = chartBoard.localToWorld(fr2loc(0.5, 0.5).setY(0.0068));
      const bq = chartBoard.getWorldQuaternion(new THREE.Quaternion());
      const nrm = V(0, 1, 0).applyQuaternion(bq).normalize(), upW = V(0, 0, -1).applyQuaternion(bq).normalize();   // chart top = frame up
      const dist = FRAME_W * 50 / 36 * (1 - 0.03 * clamp(u));
      camera.up.copy(upW); camera.position.copy(c).addScaledVector(nrm, dist); camera.lookAt(c); camera.up.set(0, 1, 0); cam.lens(camera, 50);
      camera.updateMatrixWorld();
      // the gloved fingertip on the glass at the lower right, lifts 0.2 and exits right by 1.1
      const go = ease.inOutSine(clamp((tl - 0.2) / 0.9));
      if (go < 1) {
        handR.root.visible = true; handR.pose('touch');
        const r = V(0.90 * 2 - 1, 1 - 0.82 * 2, 0.5).unproject(camera).sub(camera.position).normalize();
        const gp = camera.position.clone().addScaledVector(r, (G2.h + 0.004 - camera.position.y) / r.y);
        const tip = gp.clone().add(V(0.25 * go * go, 0.05 * go, 0.03 * go));
        placeHandAt(handR, tip, V(-0.5, -0.5, -0.62).normalize(), V(0.1, -1, 0.25), 'index');
        const mt = mirrorPass(V(G2.x, G2.h, G2.z), V(0, 1, 0), rtMir, { hide: [g2] });
        ovG2.U.tMir.value = blur(mt, rtMirB, 1.5); ovG2.U.uMir.value = 0.06 * (1 - smoothstep(0.5, 1.4, tl)); ovG2.U.uMirFres.value = 0.0;
      }
      // the moonlight line along the case's glass edge (top of frame) from doorway 4's pool
      fillA.visible = true; fillA.color.set(0x9fb2d6); fillA.position.copy(c).add(V(0.0, 0.12, -0.2)); fillA.intensity = 0.012; fillA.distance = 0.45;
      return { dof: null, exposure: 1.3, temp: -0.05, saturation: 0.84, bloom: { strength: 0.12, threshold: 0.95 } };
    },
    // ---------------------------------------------------------------------------------------------- S023 WS 32 mm tilt-down
    // 83.54–86.79. The same moon, reflected high in G3c's glass at (0.70, 0.40) (light point → light point from S022's
    // catchlight); 0.12–2.52 tilt down (+5° → −2°, ≈ 7°, see md) — the reflected moon rides up with the glass; moon shafts from
    // the south doorways over the lens; the three cases in a row; she walks in from screen-left toward the moonlight.
    S023(tl, u, T) {
      // (integration) the moonlit gallery must READ: doorway pools on the teak (moon 12°, ruling 2), the pools' bounce on walls,
      // pilasters and ceiling, the cases glowing softly (interiors dark velvet, not light boxes); she enters at 1.15 s and steps
      // into the doorway-4 pool at '今' (86.06, tl 2.52) — the moon is her key
      reset({ moon: MOON_CH1, moonI: 3.6, g3: true, g3glow: 0.4, bounds: { x0: -8, x1: 13, y0: 0, y1: 6, z0: -7, z1: 7.6 } });
      nightGallery({ hemi: 0.55, bounce: 10, at: [0.5, -0.3, -4.2] });
      for (const s of shafts) s.object3D.visible = true; dust.object3D.visible = true;
      // review: 7.9 m from the glass (was 9.2): G3a/b/c land on x 0.25 / 0.50 / 0.75 at ~72 % of frame height as the end frame asks
      const pos = V(0, 1.5, 1.55);
      const tilt = ease.inOutSine(clamp((tl - 0.12) / 2.4));
      const el0 = 5.0 * D2R, el1 = -3.0 * D2R;                                // ends level-ish: G3 whole (~70 % of frame height) + the floor pools below
      const aim = (el) => pos.clone().add(V(0, Math.tan(el) * 7.9, -7.9));
      cam.lens(camera, 32); cam.place(camera, pos, aim(lerp(el0, el1, tilt)));
      // the reflected moon (mirror-only sprite) placed so that from the START camera it sits at (0.70, 0.40) in the glass
      if (!setups._s23moon) {
        cam.place(camera, pos, aim(el0)); const hit = rayZ(0.70, 0.40, G3PZ); const rd = hit.clone().sub(camera.position).normalize(); rd.z = -rd.z;
        setups._s23moon = { p: hit.clone().addScaledVector(rd, 60), a: hit.clone().addScaledVector(rd, 9) };
        cam.place(camera, pos, aim(lerp(el0, el1, tilt)));
      }
      // the moon in the glass: soft (≈ 70 %), inside a faint reflected doorway arch — not a bulb
      mirMoon.object3D.visible = true; mirMoon.object3D.position.copy(setups._s23moon.p); mirMoon.object3D.scale.setScalar(0.55 * 7);
      mirMoon.material.uniforms.uInt.value = 3.2; mirMoon.material.uniforms.uHalo.value = 1.1;
      archGlow.visible = true; archGlow.position.copy(setups._s23moon.a); archGlow.scale.set(2.2, 3.4, 1); archGlow.lookAt(setups._s23moon.a.clone().add(V(0, 0, -10)));
      archGlow.material.color.setRGB(0.75, 0.85, 1.05);
      // she walks in from screen-left at 1.3 m/s from 1.15 s, close in front of the cases; at 2.36 s she crosses into the pool
      const wx = -3.95 + 1.3 * Math.max(0, tl - 1.15);
      if (tl > 1.1) { walkAt(wx, -5.35, Math.PI / 2, wx + 10); R.lookAt(V(wx + 3, 1.4, -6.3), 0.3); }
      for (const s of shafts) s.update(T, { intensity: 0.024 }); dust.material.uniforms.uInt.value = 0.22; dust.update(T, { camera, focus: 6, fstop: 8 });
      // a narrow cool edge on her from the doorway side as she enters the pool (the moon itself is her key)
      if (tl > 1.1) { const hp = V(wx, 1.2, -5.35); futTop.visible = true; futTop.color.set(0xc8d2db); futTop.position.copy(hp).add(V(2.2, 2.6, 3.4)); futTop.target.position.copy(hp); futTop.target.updateMatrixWorld();
        futTop.intensity = 4.0 * smoothstep(2.2, 2.6, tl); futTop.angle = 0.11; futTop.penumbra = 0.8; futTop.distance = 0; }
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp] });
      const mb = blur(mt, rtMirB, 1.6);
      for (const ov of ovG3) { ov.U.tMir.value = mb; ov.U.uMir.value = 0.3; ov.U.uMirFres.value = 0.3;
        ov.U.uStreak.value = 0.05; ov.U.uStreakL.value.set(0.6, 0.8, 1.25, 0.07); ov.U.uStreakCol.value.setRGB(0.55, 0.62, 0.76); }
      return { dof: { focus: lerp(14, 8.3, tilt), fstop: 5.6 }, exposure: 1.75, bloom: { strength: 0.35, threshold: 0.85 } };
    },

    // ---------------------------------------------------------------------------------------------- S024 MS 40 mm lateral track
    // 86.79–90.04. Constant left → right dolly parallel to G3a/b/c; each pane holds its era's night (cabin / home / pier) on a
    // virtual image plane 1.6 m behind the glass (parallax), strength ~10 % at entry → 40 % centred; centred at 0.4 / 1.49 /
    // 2.57 s (多少 / 借月色 / 流传). Her dim reflection travels with us (she walks just behind the dolly).
    S024(tl, u, T) {
      // (integration) CH1's set piece, the S066 preview: three luminous panes of three nights in a moonlit room (never black between
      // them: the north wall + pilasters in the pools' bounce, a diagonal moon sheen on each pane, the real contents faint behind
      // the era image); the dolly runs at 2.03 m/s to G3b on 借月色 (88.28) and eases out so G3c centres on 流传 (89.36) and holds
      reset({ moon: MOON_CH1, moonI: 3.6, g3: true, g3glow: 0.4, lining: 0.35, bounds: { x0: -8, x1: 13, y0: 0, y1: 6, z0: -7, z1: 7.6 } });
      const v = 2.2 / 1.085, T1 = 1.49, T2 = 2.57, d = 3.55;
      let cx;
      if (tl <= T1) cx = (tl - T1) * v;
      else if (tl < T2) { const Tt = T2 - T1, s = (tl - T1) / Tt; cx = Tt * v * (s * s * s - 2 * s * s + s) + 2.2 * (-2 * s * s * s + 3 * s * s); }
      else cx = 2.2 + 0.012 * ease.inOutSine(clamp((tl - T2) / 0.8));
      nightGallery({ hemi: 0.5, bounce: 15, at: [cx, -0.3, -4.6], dist: 10 });
      const pos = V(cx, 1.47, G3PZ + d);
      cam.lens(camera, 40); cam.place(camera, pos, pos.clone().add(V(0, -0.02, -1)));
      camera.updateMatrixWorld();
      const views = [['ship_cabin', 'view_cabin'], ['old_home', 'view_home_candle'], ['pier_waiting', 'view_pier']];
      const fw = d * 36 / 40;
      for (let i = 0; i < 3; i++) {
        const sx = 0.5 + (G3.xs[i] - cx) / fw;                                  // pane centre on screen
        const ov = ovG3[i];
        // the moon's sheen on every pane, upper right → lower left, sliding a little with the dolly (it is a reflection)
        ov.U.uStreak.value = 0.035; ov.U.uStreakL.value.set(0.707, -0.707, -0.2 + 0.05 * (cx - G3.xs[i]), 0.04); ov.U.uStreakCol.value.setRGB(0.55, 0.63, 0.8);
        if (sx < -0.45 || sx > 1.45) continue;
        const str = 0.25 + 0.35 * (1 - smoothstep(0.0, 0.5, Math.abs(sx - 0.5)));
        const tex = nested(views[i][0], views[i][1], tl, u, T, rtEra[i]);
        const D = 1.6, z = d + D, c = cocPx(z, d + D, 40, 4);
        const img = blur(tex, rtBlur.pane[i], 0.8 + c * 0.3);
        eraPlane(ov, img, str, V(G3.xs[i], i === 0 ? 1.5 : 1.62, G3PZ - D), V(0.82, 0, 0), V(0, 1.23, 0));
        ov.U.uEraFres.value = 0.2;
      }
      // her reflection: she walks behind the dolly at the same pace (true mirror): a dark silhouette with a silver edge from the
      // doorways behind her (no front light — the reflection shows the side of her that faces the glass)
      const hx = cx + 0.35;
      if (tl < T2 + 0.2) walkAt(hx, G3PZ + d + 1.25, Math.PI / 2, hx + 10, { stride: 1.25 });
      else { standAt(hx, G3PZ + d + 1.25, Math.PI * 0.9, { weight: 0.2 }); }
      R.lookAt(V(hx + 1, 1.4, G3PZ), 0.5); R.root.updateMatrixWorld(true);
      mirLight.position.copy(R.eye()).add(V(-0.3, 0.35, 0.8)); mirLight.color.set(0xb8c8e6); mirLight.distance = 2.4;
      // (review) deeper under the floor: at −0.15 m its specular glint in the glass rode the bottom of the frame like a hot pixel
      fillA.visible = true; fillA.color.set(0x8ea2c6); fillA.position.set(cx + 1.0, -1.1, -2.0); fillA.intensity = 1.25; fillA.distance = 7;
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp], mirFill: 0.3, boost: [[mirLight, 1.2]] });
      const mb = blur(mt, rtMirB, Math.min(6, cocPx(2 * d + 1.25, d + 1.6, 40, 4) * 0.375 + 1.0));
      for (const ov of ovG3) { ov.U.tMir.value = mb; ov.U.uMir.value = 0.2; ov.U.uMirFres.value = 0.2; }
      return { dof: { focus: d + 1.6, fstop: 4 }, exposure: 1.6, bloom: { strength: 0.32, threshold: 0.85 } };
    },
    // ---------------------------------------------------------------------------------------------- S025 MCU 75 mm
    // 90.04–93.25. She stops at G3b and leans close (0.1–0.6): her own dark reflection lands on the EMPTY mount; deeper, the
    // wife's face by the candle (old_home view_home_candle) never resolves. Slow push with a 25° arc right: over the right
    // shoulder → near right profile. Focus hunts three times between her reflection depth and the home depth.
    S025(tl, u, T) {
      // (integration) the gallery night level (mean ~7 %), her profile low-key: the moon from behind her (SSE) edges her ear, cheek
      // and hair, the case light falls on the mount (not on her eye), her reflection stays darker than the candle
      reset({ moon: MOON_CH1, moonI: 3.0, g3: true, g3glow: 0.4, lining: 0.35, bounds: { x0: -3, x1: 9, y0: 0, y1: 4, z0: -7, z1: 7.6 } });
      nightGallery({ hemi: 0.45, bounce: 7, at: [0.8, -0.3, -4.0], dist: 10 });
      g3[1].glow.visible = false;
      setRShadow(false);                                                       // (her head's moon shadow printed a black disc on G3b's back panel)                                              // the era image sits over dark velvet (no light-box panel)
      // she stops close in front of G3b and leans in to ~15 cm from the glass: her own reflection lands on the empty mount
      const pose25 = (t, TT, live) => {
        const lean = ease.inOutSine(clamp((t - 0.1) / 0.5));
        standAt(0.03, G3PZ + 0.36, Math.PI - 0.05, { weight: 0.25 });
        R.pose({ 'hips.x': 0.08 * lean, 'spine.x': 0.06 + 0.1 * lean, 'chest.x': 0.05 + 0.08 * lean, 'neck.x': 0.04 + 0.1 * lean, 'head.x': 0.0 + 0.04 * lean, 'head.z': 0.04 * Math.sin(clamp((t - 1.5) / 0.5) * Math.PI),
          'armR.upper.x': 0.1, 'armR.lower.x': 0.45, 'armL.upper.x': 0.08, 'armL.lower.x': 0.3, handR: ['relaxed', { curl: 0.6 }], handL: ['relaxed', { curl: 0.6 }] }, { add: true });
        R.lookAt(bracketPos.clone().add(V(0.32 * ease.inOutSine(clamp((t - 0.4) / 2.2)), 0.03, 0)), 0.9); if (live) R.breathe(TT, 0.7);   // she angles her head to the right, searching
        R.root.updateMatrixWorld(true);
      };
      // the mount is set where her reflected face lies at full lean (fixed pose: deterministic, independent of frame order)
      if (!setups._s25eye) { pose25(1.2, 0, false); setups._s25eye = R.eye().clone(); }
      pose25(tl, T, true);
      const eye = R.eye();
      { const eL = setups._s25eye, Em = V(eL.x, eL.y - 0.03, 2 * G3PZ - eL.z);   // the reflected face's centre (eyes a little above it)
        g3[1].contents.position.set(Em.x - bracketPos.x, Em.y - bracketPos.y, Em.z - bracketPos.z); }
      // camera: over her right shoulder (SE, 42°) → near right profile (75°), slow push ~10 cm/s; she faces screen right,
      // the glass fills the right of frame at a grazing angle
      const k = ease.inOutSine(clamp(tl / 3.2));
      const ang = lerp(42, 68, k) * D2R, rr = lerp(2.55, 2.25, k);           // review: MCU (her head was 70 % of frame height — a giant mask)
      const pos = V(eye.x + Math.sin(ang) * rr, eye.y + 0.03, Math.max(eye.z + Math.cos(ang) * rr, G3F + 0.12));
      frameAt(pos, eye, lerp(0.17, 0.30, k), lerp(0.42, 0.45, k), 75);
      // the home night deep in the glass, composited as seen: a small picture plane held 2.6 m behind the glass on the ray
      // through (0.70, 0.42) (the candle), facing the lens; the face a warm oval up-right of it, never resolved
      const tex = nested('old_home', 'view_home_candle', tl, u, T, rtEra[1]);
      camera.updateMatrixWorld();
      const rc = V(0.70 * 2 - 1, 1 - 0.42 * 2, 0.5).unproject(camera).sub(camera.position).normalize();
      const dGl = (camera.position.z - G3PZ) / -rc.z, dHome = dGl + 2.6 / Math.max(0.35, -rc.z);
      const cR = V(1, 0, 0).applyQuaternion(camera.quaternion), cU = V(0, 1, 0).applyQuaternion(camera.quaternion);
      const dRef = cam.distTo(camera, V(eye.x, eye.y, 2 * G3PZ - eye.z));
      const hunt = 0.5 + 0.5 * Math.sin((tl - 0.25) * 2.4);              // 0 = her reflection, 1 = the home depth
      const focus = lerp(dRef, dHome, 0.1 + 0.75 * hunt) - 0.35 * Math.exp(-Math.pow((tl - 2.62) / 0.35, 2));
      const W = 1.6 * 0.36 * dHome / 4.4; ovG3[1].U.uEraSoft.value = 0.3;   // (integration) ×1.6: her never-resolving face oval ~13 % of frame height
      eraPlane(ovG3[1], blur(tex, rtBlur[384], Math.max(8, Math.min(14, cocPx(dHome, focus, 75, 2.8) * 0.6))), 0.55, camera.position.clone().addScaledVector(rc, dHome), cR.multiplyScalar(W), cU.multiplyScalar(W * 1.5));
      ovG3[1].U.uEraFres.value = 0.1;
      // moonlight edge on her ear and collar (the doorways behind her), warm teak bounce from below
      // (review) from behind her, the doorway side (SSW): an edge on ear, hair and collar — it was a cold front fill that blew the
      // profile out into a bright mask
      fillA.visible = true; fillA.color.set(0xb4c0d2); fillA.position.copy(eye).add(V(-0.55, 0.4, 0.9)); fillA.intensity = 0.16; fillA.distance = 3.0;   // back rim from the SSW doorway, ~1 stop under
      warmFill.visible = true; warmFill.color.set(0xffc690); warmFill.position.copy(eye).add(V(0.12, -0.35, 0.1)); warmFill.intensity = 0.05; warmFill.distance = 0.9;   // teak bounce under her chin
      g3Spot.visible = true; g3Spot.position.set(G3.xs[1], G3.top - 0.05, G3.back + 0.45); g3Spot.target.position.set(G3.xs[1], DECK3, G3.back + 0.3); g3Spot.target.updateMatrixWorld(); g3Spot.intensity = 0.35; g3Spot.angle = 0.3;
      // the case's dimmed 3000 K glow spilling out onto her face front — what her reflection on the mount is made of
      inspLight.visible = true; inspLight.color.set(0xffc890); inspLight.position.copy(bracketPos).add(g3[1].contents.position).add(V(0.05, 0.3, 0.2)); inspLight.target.position.copy(bracketPos).add(g3[1].contents.position); inspLight.target.updateMatrixWorld();
      inspLight.intensity = 0.14; inspLight.angle = 0.35; inspLight.penumbra = 0.8; inspLight.distance = 1.4;
      // (review) the lights are set BEFORE the mirror pass — it used to render with them still off, so her reflection was black
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp], mirFill: 0.2, boost: [[inspLight, 0.26]] });
      ovG3[1].U.tMir.value = blur(mt, rtMirB, Math.min(9, Math.max(3.5, cocPx(dRef, focus, 75, 2.8) * 0.375 + 0.5))); ovG3[1].U.uMir.value = 0.06; ovG3[1].U.uMirFres.value = 0.3;   // darker than the candle (continuity note)
      DBGP.eye = eye; DBGP.mount = bracketPos.clone().add(g3[1].contents.position); DBGP.refl = V(eye.x, eye.y, 2 * G3PZ - eye.z);
      return { dof: { focus, fstop: 2.8, maxCoc: 1.4 }, exposure: 1.45, bloom: { strength: 0.3, threshold: 0.86 } };
    },
    // ---------------------------------------------------------------------------------------------- S026 INSERT 100 mm locked
    // 93.25–96.917. Through G3b: the wife's left hand with the silver bangle straightens the chopsticks (old_home view_home_hand,
    // screen-mapped); the face stays a warm blur; focus face → hand 0.07–0.9; her glove's reflection approaches the glass
    // without touching; the full-band stop 95.95 (tl 2.70) freezes the hand.
    S026(tl, u, T) {
      reset({ moon: MOON_CH1, moonI: 1.4, hemi: 0.15, g3: true, bounds: { x0: -2, x1: 2, y0: 0, y1: 3, z0: -7, z1: 0 } });
      // review: the lens yawed 24° from the west so the real fingertip and its true reflection separate on screen (square to the
      // glass they overlapped into one soft blob); the reflection approaches from the left and stops a sliver short
      const tgt = V(0.04, 1.30, G3PZ), yaw = 24 * D2R;
      const pos = tgt.clone().add(V(0.05 - Math.sin(yaw) * 0.745, 0.06, Math.cos(yaw) * 0.745));
      cam.place(camera, pos, tgt); cam.lens(camera, 100);
      const dGl = cam.distTo(camera, tgt), DH = 0.6, fH = dGl + DH / Math.cos(yaw);   // the home plate's mirror depth: in front of the back panel (0.68 m), or the depth write fails its test
      // the home hand: screen-mapped era layer (main role, full res), pre-blurred for the face → hand rack
      const tex = nested('old_home', 'view_home_hand', tl, u, T, rtEraW);
      const rack = ease.inOutSine(clamp((tl - 0.07) / 0.83));
      const eraT = blur(tex, rtBlur[640], lerp(5.0, 0.0, rack));
      g3[1].glow.visible = false;                                              // B over dark velvet (no light-box panel)
      // the plate as old_home solved it (candle (0.30, 0.35), bowl (0.62, 0.55), hand + bangle (0.56, 0.58), face at the top edge);
      // the top band (her face) always takes a 7 px blur: the face never resolves while the hand comes sharp
      ovG3[1].U.tEra2.value = eraT; ovG3[1].U.tEra2B.value = blur(tex, rtBlur.hand, 7.0); ovG3[1].U.uEra2BY.value.set(0.88, 0.98);
      ovG3[1].U.uEra2.value = 0.32; ovG3[1].U.uEra2Depth.value = DH; ovG3[1].U.uDepthK.value = 4;
      dustFor(ovG3[1], fH, dGl, 100, 4, 0.022); ovG3[1].U.uDustTop.value = 0.0; ovG3[1].U.uDustCol.value.setRGB(0.75, 0.8, 0.9);
      // her glove: the real fingertip enters lower right, out of focus; its reflection approaches its own tip, ~1 cm short
      const appr = ease.inOutSine(clamp((tl - 0.5) / 2.0));
      handR.root.visible = true; handR.pose('point');
      const tipS = rayZ(lerp(0.95, 0.755, appr), lerp(0.82, 0.715, appr), G3PZ + lerp(0.05, 0.011, appr));   // its reflection ≈ (0.80, 0.78) → (0.72, 0.70)
      placeHandAt(handR, tipS, V(-0.45, 0.45, -0.75).normalize(), V(0.2, -0.4, -0.85), 'index');
      fillA.visible = true; fillA.color.set(0xc0cad8); fillA.position.copy(tipS).add(V(0.3, 0.3, 0.4)); fillA.intensity = 1.0; fillA.distance = 1.6;   // moonlight off the floor pools on her glove
      warmFill.color.set(0xc6d0de); warmFill.position.copy(tipS).add(V(-0.06, 0.07, 0.004)); warmFill.distance = 0.35; warmFill.intensity = 0;   // (mirror pass only)
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp], mirFill: 0.6, boost: [[warmFill, 0.07]] });
      ovG3[1].U.tMir.value = blur(mt, rtMirB, 1.2); ovG3[1].U.uMir.value = 0.32; ovG3[1].U.uMirFres.value = 0.0;
      return { dof: { focus: fH, fstop: 4, maxCoc: 1.5 }, exposure: 1.3, bloom: { strength: 0.3, threshold: 0.82 } };
    },
    // ---------------------------------------------------------------------------------------------- S028 MS 50 mm locked
    // 101.79–104.625. G3c's door open; she checks the case under the hooded inspection lamp, back/left shoulder soft in the
    // foreground; the guard walks in from screen-right between the iron columns (0.38–1.2), torch beam on the floor, stops,
    // nods on 103.37 (tl 1.58); focus her → him 0.6–1.4.
    S028(tl, u, T) { return interlude(tl, u, T, 'S028'); },
    S029(tl, u, T) { return interlude(tl, u, T, 'S029'); },
    // ---------------------------------------------------------------------------------------------- S030 INSERT 75 mm top-down
    // 107.875–109.875. Inside G3c: the open case — the S031 composition (same case, shirt block, handle at the bottom edge);
    // 0.8 the inspection light swings in from the right; 1.2 the gloved hand enters bottom-left; 1.63 mid-stroke on the collar.
    S030(tl, u, T) {
      reset({ moon: MOON_CH1, moonI: 1.2, hemi: 0.12, g3: true, bounds: { x0: 0, x1: 4, y0: 0, y1: 3, z0: -7, z1: -4 } });
      g3[2].door.rotation.y = G3C_OPEN;
      caseG.updateMatrixWorld(true);
      const CL = (x, y, z) => caseG.localToWorld(V(x, y, z));
      const fwd = CL(0, 0, -1).sub(CL(0, 0, 0)).normalize();
      const tgt = CL(0.0, 0.06, -0.012);
      const push = 1 - 0.08 * ease.inOutSine(clamp((tl - 0.0) / 2.0));
      const off = V(0, 1.6, 0).addScaledVector(fwd, -0.29).multiplyScalar(push);
      cam.place(camera, tgt.clone().add(off), tgt); cam.lens(camera, 75);
      // dim 3000 K case light, then the hooded inspection lamp swings in from frame right (raking the folds)
      g3Spot.visible = true; g3Spot.position.copy(CL(0.0, 1.9, 0.05)); g3Spot.target.position.copy(CL(0, 0, 0)); g3Spot.target.updateMatrixWorld(); g3Spot.intensity = 0.55; g3Spot.angle = 0.7;
      const sw = ease.inOutSine(clamp((tl - 0.8) / 0.3));
      inspLamp.visible = true; inspLight.visible = true;
      inspLight.position.copy(CL(lerp(0.75, 0.42, sw), 0.32, lerp(-0.1, 0.0, sw))); inspLight.target.position.copy(CL(-0.06, 0.03, -0.06)); inspLight.target.updateMatrixWorld();
      inspLight.intensity = 0.85 * sw; inspLight.angle = 0.6; inspLight.distance = 2.0; inspLight.color.set(0xffdcb4);
      // her gloved right hand: enters from the bottom-left at 1.2, palm flat on the collar fold stroking left → right;
      // at 1.63 (cut) the palm centre passes (0.42, 0.42), mid-stroke. Fingers toward the upper right, the sleeve from lower left
      const enter = ease.outCubic(clamp((tl - 1.2) / 0.3));
      if (tl > 1.15) {
        handR.root.visible = true; handR.pose('flat', { spread: 0.08 });
        const fx = 0.42 + 0.2 * (tl - 1.63) - 0.16 * (1 - enter), fy = 0.42 + 0.42 * (1 - enter);
        const yPalm = CL(0, 0.06, 0).y + 0.03 * (1 - enter);
        camera.updateMatrixWorld(); const rr = V(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(camera).sub(camera.position).normalize();
        const pt = camera.position.clone().addScaledVector(rr, (yPalm - camera.position.y) / rr.y);
        const right = CL(1, 0, 0).sub(CL(0, 0, 0)).normalize();
        const fing = fwd.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(right, Math.sin(0.6)).add(V(0, -0.06, 0)).normalize();
        placeHandAt(handR, pt, fing, V(0, -1, 0), 'palm');
        DBGP.palm = pt;
      }
      return { dof: { focus: cam.distTo(camera, tgt), fstop: 4 }, exposure: 1.3, temp: -0.02, bloom: { strength: 0.22, threshold: 0.92 } };
    },
    // ---------------------------------------------------------------------------------------------- S040 ECU 100 mm
    // 133.79–135.42. T15 match from S039: her gloved right hand stops before G3c's (closed) glass — back of the hand to camera,
    // fingers gently curled, thumb at left, (0.36, 0.56), ~40 % of frame height, a finger-width from the glass; the faded stamp
    // soft behind at (0.60, 0.50); slow MC pull-back 2 %, focus breath at 0.81 s.
    S040(tl, u, T) {
      reset({ moon: MOON_CH1, moonI: 1.4, hemi: 0.15, g3: true, bounds: { x0: 0, x1: 5, y0: 0, y1: 3, z0: -7, z1: 0 } });
      passG.updateMatrixWorld(true);
      const stamp = passG.localToWorld(V(0.075, 0.03, 0.002));
      const camZ = G3PZ + 1.42 * (1 + 0.02 * ease.inOutSine(clamp(u)));
      const pos = V(stamp.x - 0.06, stamp.y + 0.05, camZ);
      frameAt(pos, stamp, 0.60, 0.50, 100);
      // the hand: palm toward the glass (north), fingers up and gently curled, a finger-width (≈1.6 cm) from it
      handR.root.visible = true; handR.pose('relaxed', { curl: 0.62 });
      const hp = rayZ(0.37, 0.79, G3PZ + 0.035);
      handR.placeWrist([0, 0, 0], V(0.12, 1, -0.32).normalize(), V(0.1, 0.25, -1)); handR.root.updateMatrixWorld(true);
      const palm = handR.sockets.palm.getWorldPosition(V());
      handR.root.position.add(hp.clone().sub(palm)); handR.root.position.x += 0.0004 * util.noise1(T * 5, 3); handR.root.updateMatrixWorld(true);
      g3Spot.visible = true; g3Spot.position.set(G3.xs[2], G3.top - 0.05, G3.back + 0.45); g3Spot.target.position.copy(passG.getWorldPosition(V())); g3Spot.target.updateMatrixWorld(); g3Spot.intensity = 0.36; g3Spot.angle = 0.55;
      fillA.visible = true; fillA.color.set(0xc2c8d4); fillA.position.copy(hp).add(V(0.6, 0.6, 0.9)); fillA.intensity = 0.32; fillA.distance = 2.5;
      // a faint reflection of the glove in the glass (S041 passes through it)
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp], mirFill: 0.6 });
      ovG3[2].U.tMir.value = blur(mt, rtMirB, 2.0); ovG3[2].U.uMir.value = 0.08 + 0.05 * u; ovG3[2].U.uMirFres.value = 0.0;
      const dH = cam.distTo(camera, hp), dS = cam.distTo(camera, stamp);
      const focus = dH + 0.012 + 0.3 * Math.exp(-Math.pow((tl - 0.81) / 0.32, 2)) * (dS - dH);
      dustFor(ovG3[2], focus, cam.distTo(camera, V(hp.x, hp.y, G3PZ)), 100, 2.8, 0.01); ovG3[2].U.uDustTop.value = 0.0; ovG3[2].U.uDustCol.value.setRGB(0.7, 0.75, 0.85);
      return { dof: { focus, fstop: 2.8, maxCoc: 1.5 }, exposure: 1.25, bloom: { strength: 0.25, threshold: 0.9 } };
    },
    // ---------------------------------------------------------------------------------------------- S070 INSERT 100 mm (future)
    // 219.71–223.375. Dissolve-in from S069's sleeves (0.42, 0.62) → the aged LEFT cuff of the folded coat in G1, worn spot
    // crisp at (0.42, 0.62); locked to 1.69 s (翻), then MC pull-back ~1.4 m to the frontal G1 on the S001 axis; blank label.
    S070(tl, u, T) {
      futureLook();
      coat.updateMatrixWorld(true);
      const worn = coat.userData.worn.getWorldPosition(V());     // the worn patch (18 × 8 mm, ~1 cm in from the cuff edge)
      const back = ease.inOutCubic(clamp((tl - 1.69) / 1.25)) * 0.92 + 0.08 * ease.inOutSine(clamp((tl - 2.71) / 0.96));
      const p0 = V(worn.x + 0.05, worn.y + 0.75, worn.z + 1.95), p1 = V(MC_OPEN.pos.x, 1.2, G1F + 4.35);   // review: the end frame holds the whole glass cover (it cut off at 1.34 m, so no glass read)
      const pos = p0.clone().lerp(p1, back);
      const t0 = worn, t1 = V(G1.x, 1.19, G1.z);
      camera.position.copy(pos); cam.lens(camera, 100);
      frameAt(pos, t0.clone().lerp(t1, back), lerp(0.42, 0.5, back), lerp(0.62, 0.5, back), 100);
      const f0 = cam.distTo(camera, worn), f1 = cam.distTo(camera, t1);
      return futurePost({ dof: { focus: lerp(f0, f1, back), fstop: lerp(5.6, 4.5, back), maxCoc: 1.3 }, exposure: 1.15 });
    },
    // ---------------------------------------------------------------------------------------------- S071 ECU 100 mm (future)
    // 223.375–226.29. The opening camera EXACTLY (MC_OPEN, focus on the glass): the future viewer's reflection fades up as
    // they step into place (0.13–0.6), raises the right hand palm to the glass (0.79–2.29) to the T01 point (0.50, 0.55).
    S071(tl, u, T) {
      futureLook();
      cam.place(camera, MC_OPEN.pos, MC_OPEN.target); cam.lens(camera, MC_OPEN.mm);
      const fGlass = camera.position.z - G1F;
      const step = ease.inOutSine(clamp((tl - 0.13) / 0.5)), rise = ease.outCubic(clamp((tl - 0.79) / 1.5));
      futureViewer(tl, T, { stand: G1F - 0.24, step, rise, profile: false });
      const eraTex = eraPass();
      ovG1.U.tEra2.value = blur(eraTex, rtBlur.hand, 2.2); ovG1.U.uEra2Low.value = 0.27 * step;   // post-DOF, pre-blurred (no depth proxy: the room behind keeps its own blur)
      ovG1.U.uEra2Fade.value.set(0.04, 0.34);                                  // the reflection thins out low on the pane, over the bright linen (hides the sleeve opening)
      // the faint present: dust sparkle + the room behind the lens, barely
      dustFor(ovG1, fGlass + 0.004, fGlass, 100, 4, 0.012); ovG1.U.uDustRep.value.set(1.6, 1.33); ovG1.U.uDustTop.value = 0.2; ovG1.U.uDustCol.value.setRGB(0.95, 0.93, 0.9);
      return futurePost({ dof: { focus: fGlass + 0.004, fstop: 4.0, maxCoc: 1.6 }, exposure: 1.15 });
    },
    // ---------------------------------------------------------------------------------------------- S078 MCU 75 mm (future)
    // 240.0–242.04. Dissolve-in from S077 (her profile eye (0.33, 0.40)): the future viewer's reflection in profile, facing
    // screen-right, in the left third; in the glass to the right the reflected doorway holds the not-yet-dawn sky (the only
    // directional light, from screen right); the coat soft beyond at lower right. Lens 0.85 m off the glass, looking NW so the
    // glass fills the frame.
    S078(tl, u, T) {
      futureLook({ dawn: true });
      const pos = V(G1.x + 0.45, 1.1, G1F + 0.85);
      frameAt(pos, V(G1.x + 0.05, 1.03, G1.z + 0.08), 0.74, 0.8, 75);
      const form = smoothstep(0.0, 0.36, tl);
      const D = 2.9;
      futureViewer(tl, T, { profile: true, eye: [0.33, 0.40], dist: D, key: 13 * (0.55 + 0.45 * form) });
      const eraTex = eraPass();
      const dGl = (pos.z - G1F) / Math.abs(camera.getWorldDirection(V()).z);
      ovG1.U.tEra2.value = blur(eraTex, rtBlur.hand, 6.5); ovG1.U.uEra2Low.value = 0.34 * (0.35 + 0.65 * form);
      // the room behind the lens in the glass: the arched doorway at screen right, the corridor glazing and the sky beyond
      const mt = mirrorPass(V(0, 1.2, G1F), V(0, 0, 1), rtMir, { hide: [future, g1.object3D], mirFill: 0.0 });
      ovG1.U.tMir.value = blur(mt, rtMirB, 7.0); ovG1.U.uMir.value = 0.2; ovG1.U.uMirFres.value = 0.0; ovG1.U.uEra2Occ.value = 0.9;
      futTop.intensity = 3.5; fillA.intensity = 0.6;
      warmFill.color.set(0xf2e0d0); warmFill.position.set(G1.x + 0.9, 1.3, G1.z + 0.2); warmFill.intensity = 1.1; warmFill.distance = 3;   // dawn side light on the coat from screen right
      return futurePost({ dof: { focus: D, fstop: 4, maxCoc: 1.5 }, exposure: 1.25, temp: 0.04 });
    },
  };
  // ---- placeholder for shots still to be built: a wide view of the gallery
  setups.default = (tl, u, T) => {
    reset({ moon: MOON_CH1, moonI: 1.9 });
    for (const s of shafts) s.object3D.visible = true;
    cam.place(camera, [-6, 1.6, 5.5], [2, 1.2, -5]); cam.lens(camera, 24);
    for (const s of shafts) s.update(T);
    return { dof: null, exposure: 1.3 };
  };

  return {
    scene, camera,
    post: { exposure: 1.0, temp: -0.12, saturation: 0.86, contrast: 1.05, grain: 0.035, vignette: 0.34, bloom: { strength: 0.32, threshold: 0.88, radius: 0.55 },
      lift: [0.012, 0.016, 0.026], shadowTint: [0.45, 0.5, 0.6], highTint: [0.55, 0.52, 0.48] },
    setShot(shot, tl, u, T) {
      OFF.clear(); for (const k of OFF0) OFF.add(k); if (typeof window !== 'undefined' && window.__MGOFF) for (const k of String(window.__MGOFF).split(',')) if (k) OFF.add(k);
      const f = setups[shot.id] || setups.default;
      const r = f(tl, u, T, shot) || {};
      for (const ov of allOv) { ov.sync(); if (OFF.has('low')) ov.low.visible = false; }
      if (Q.get('dbgcam')) { // staging: look at the set-up from another camera (?dbgcam=px,py,pz,tx,ty,tz,mm | plan)
        const c = Q.get('dbgcam') === 'plan' ? [camera.position.x + 2, 14, camera.position.z + 0.01, camera.position.x + 2, 0, camera.position.z, 18] : Q.get('dbgcam').split(',').map(Number);
        const mk = scene.userData.camMark || (() => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3030 })); scene.add(m); scene.userData.camMark = m; return m; })();
        mk.position.copy(camera.position); mk.quaternion.copy(camera.quaternion); mk.visible = true;
        cam.place(camera, c.slice(0, 3), c.slice(3, 6)); cam.lens(camera, c[6] || 24); r.dof = null; hemi.intensity += +(Q.get('dbgfill') || 0);
        if (Q.get('dbgcam') === 'plan') { camera.near = 8.6; camera.far = 40; camera.updateProjectionMatrix(); r.exposure = 2.2; } else { camera.near = 0.02; camera.far = 120; }
      } else if (scene.userData.camMark) scene.userData.camMark.visible = false;
      if (OFF.has('moonshadow')) moon.castShadow = false; else moon.castShadow = true;
      if (OFF.has('shafts')) for (const s of [...shafts, ...shaftsI]) s.object3D.visible = false;
      if (OFF.has('fig')) { R.root.visible = false; guard.root.visible = false; }
      if (OFF.has('hand')) handR.root.visible = false;
      if (OFF.has('room')) room.visible = false; else room.visible = true;
      if (OFF.has('g3')) g3Grp.visible = false; else g3Grp.visible = true;
      if (OFF.has('g2')) g2.visible = false; else g2.visible = true;
      if (OFF.has('g1')) { g1.object3D.visible = false; compass.visible = false; } else g1.object3D.visible = true;
      if (OFF.has('bloom')) r.bloom = { strength: 0 };
      if (OFF.has('xlights')) scene.traverse((o) => { if (o.isLight && o !== moon && o !== hemi) o.visible = false; });
      if (OFF.has('glass')) scene.traverse((o) => { if (o.isMesh && o.material && o.material.userData && o.material.userData.glass) o.visible = false; });
      if (OFF.has('lights')) { const L = []; scene.traverse((o) => { if (o.isLight && o.visible) L.push(o.type + ':' + (o.name || '') + ':' + (o.castShadow ? 'S' : '') + ':' + o.intensity.toFixed(2)); }); console.log('DBG lights', L.join(' | ')); }
      if (Q.get('dbgtex')) { // debug: show one of the internal textures full frame
        const k = Q.get('dbgtex'), t = k === 'era' ? ovG1.U.tEra.value : k === 'era2' ? ovG1.U.tEra2.value : k === 'mir' ? (ovG1.U.tMir.value || ovG3[1].U.tMir.value) : k === 'g3' ? ovG3[+(Q.get('i') || 1)].U.tEra.value : null;
        if (!scene.userData.dbgQ) { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false })); q.renderOrder = 1e6; q.frustumCulled = false;
          q.onBeforeRender = (rr, sc, c) => { q.position.copy(c.position).add(c.getWorldDirection(V()).multiplyScalar(0.5)); q.quaternion.copy(c.quaternion); const h = 2 * 0.5 * Math.tan(c.fov * D2R / 2); q.scale.set(h * c.aspect / 2, h / 2, 1); q.updateMatrixWorld(); };
          q.layers.set(L_OVL); scene.add(q); scene.userData.dbgQ = q; }
        scene.userData.dbgQ.material.map = t; scene.userData.dbgQ.material.needsUpdate = true; r.dof = null; r.exposure = 1.0;
      }
      camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      if (OFF.has('pts')) console.log('PTS', shot.id, tl.toFixed(2), JSON.stringify(Object.fromEntries(Object.entries(DBGP).map(([k, v]) => [k, scr(v)]))));
      if (OFF.has('dof')) r.dof = null;
      if (OFF.has('info')) { const i = ctx.renderer.info; console.log('INFO calls', i.render.calls, 'tris', i.render.triangles, 'programs', i.programs.length); }
      return r;
    },
  };
}
