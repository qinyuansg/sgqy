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

export const needs = ['sea_deck', 'ship_cabin', 'old_home', 'pier_waiting'];

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
const MOON_INTRO = moonDir(160, 31), MOON_CH1 = moonDir(152, 19), MOON_FUT = moonDir(170, 24);

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
  const mTeak = TX.mat('teak', { repeat: [7, 3.2], tex: { seed: 51, wear: 0.6 }, color: hex('#b9a18a') });
  const mTeakCor = TX.mat('teak', { repeat: [2, 6], tex: { seed: 52 }, color: hex('#a8927c') });
  const mWall = TX.mat('plaster_museum', { repeat: [0.2, 0.2], tex: { tone: 'blue', seed: 41, cracks: 0.1 }, color: hex('#46587a') });   // deep museum blue (P02 under moon)
  const mWallS = TX.mat('plaster_museum', { repeat: [0.2, 0.2], tex: { tone: 'blue', seed: 42, cracks: 0.1 }, color: hex('#46587a') });
  const mBrick = TX.mat('brick', { repeat: [0.45, 0.45], tex: { limewash: 0.5, seed: 31 }, color: hex('#b8a89c') });
  const mCorWall = TX.mat('plaster_museum', { repeat: [0.25, 0.25], tex: { tone: 'grey', seed: 43 }, color: hex('#8e8a84') });
  const mBeam = TX.mat('wood_beam', { repeat: [1, 3] });
  const mCeil = std({ color: 0x1a1612, roughness: 0.9 });
  const mIron = std({ color: hex(P.iron), roughness: 0.5, metalness: 0.35, envMap: env, envMapIntensity: 0.35 });
  const mPlinth = std({ color: hex(P.plinth), roughness: 0.55 });
  const mVelvet3 = TX.mat('velvet', { repeat: [3, 3], tex: { tone: P.velvet3, seed: 61 } });
  const mDark = std({ color: 0x0c0d10, roughness: 0.6 });
  const mBronze = TX.mat('bronze', { repeat: [2, 2], tex: { patina: 0.2, seed: 71 }, roughness: 1, metalness: 1, color: hex('#6d6256'), envMap: env, envMapIntensity: 0.6 });
  const mAcrylic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.12, envMap: env, envMapIntensity: 1.2, depthWrite: false });
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
    gr.addColorStop(0, '#0b1426'); gr.addColorStop(0.55, '#1b2d4b'); gr.addColorStop(0.82, '#2c4468'); gr.addColorStop(1, '#101828'); sk.fillStyle = gr; sk.fillRect(0, 0, 8, 256);
    const skyM = new THREE.MeshBasicMaterial({ map: ctex(skc), color: new THREE.Color(0.55, 0.62, 0.8), fog: false });
    const sky = mesh(new THREE.PlaneGeometry(60, 14), skyM, room, 0, 4, COR.z1 + 2.5, false, false); sky.rotation.y = Math.PI; sky.name = 'sky'; sky.userData.keep = true;
    room.userData.skyM = skyM;
  }
  mergeStatic(room);

  // ======================================================================================================== G1 — compass vitrine (future: the folded coat)
  const g1 = vitrine({ w: G1.w, d: G1.d, h: G1.h, plinthH: G1.plinthH, frame: 0, deck: 'velvet', light: 'spot', lightIntensity: 2.2, res: [ctx.W, ctx.H],
    glass: { haze: 0.12, dust: 0.08, hazeLevel: 0.012, envMapIntensity: 0.6, reflect: 0.55 }, front: { haze: 0.1, dust: 0.05 } });
  g1.object3D.position.set(G1.x, 0, G1.z); scene.add(g1.object3D);
  for (const p of Object.values(g1.panes)) p.layers.set(L_OVL);
  for (const gm of Object.values(g1.glass)) { gm.material.envMap = env; }
  g1.plinth.material = mPlinth;
  const g1Deck = g1.deck, g1Velvet = g1Deck.material;
  const DECK1 = g1.deckY;                                                     // 0.97
  // the brass compass (museum state) on its 15° acrylic cradle, south (red needle end) toward lower left in the S003 view
  const compass = new THREE.Group(); compass.name = 'compass'; scene.add(compass);
  const COMP_R = 0.075, FACE_R = 0.0715, WELL_R = 0.0207, COMP_ROT = -0.7;
  const compPivot = new THREE.Group(); compass.add(compPivot);
  {
    compass.position.set(G1.x, DECK1 + 0.105, G1.z - 0.02);
    compPivot.rotation.x = 15 * D2R;                                          // tilted 15° toward the south glass (camera)
    const mBrassM = TX.mat('brass', { repeat: [1, 1], tex: { tone: 'museum', patina: 0.55, polish: 0.25, seed: 9 }, roughness: 1, metalness: 1, envMap: env, envMapIntensity: 0.9, color: hex('#a08868') });
    const pr = [[0, -0.032], [COMP_R - 0.002, -0.032], [COMP_R, -0.03], [COMP_R + 0.0005, -0.001], [COMP_R - 0.0008, 0.003], [COMP_R - 0.0035, 0.0033], [FACE_R + 0.0004, 0.0024], [FACE_R, 0.0002]];
    const body = mesh(new THREE.LatheGeometry(pr.map(([a, b]) => new THREE.Vector2(a, b)), 96), mBrassM, compPivot); body.castShadow = true;
    const faceM = TX.mat('compass', { tex: { state: 'museum', seed: 6 }, envMap: env, envMapIntensity: 0.8 });
    const face = mesh(new THREE.RingGeometry(WELL_R, FACE_R, 96, 2), faceM, compPivot); face.rotation.x = -Math.PI / 2; face.rotation.z = COMP_ROT;   // dial north (子) toward the upper right → 午 (south) at the lower left of the S003 frame
    const well = mesh(new THREE.CircleGeometry(WELL_R, 48), std({ color: 0x4a3c2c, roughness: 0.45, envMap: env, envMapIntensity: 0.4 }), compPivot, 0, -0.0055, 0); well.rotation.x = -Math.PI / 2;
    const wall = mesh(new THREE.CylinderGeometry(WELL_R, WELL_R, 0.0058, 48, 1, true), std({ color: 0x2a2018, roughness: 0.5, side: THREE.BackSide }), compPivot, 0, -0.0029, 0, false);
    // needle: blued steel, faint rust, red-lacquer south tip; points south (local −Z after the face flip → toward camera-left)
    const needle = new THREE.Group(); needle.position.y = -0.0018; compPivot.add(needle); needle.rotation.y = COMP_ROT;   // red south tip on 午, toward the lower left of the S003 frame
    const L = 0.018, wN = 0.0021, hN = 0.0007, ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute([0, hN, L, wN, 0, 0, 0, hN, -L, -wN, 0, 0, 0, -hN * 0.3, L * 0.98, 0, -hN * 0.3, -L * 0.98], 3));
    ng.setIndex([0, 1, 2, 0, 2, 3, 4, 1, 0, 5, 2, 1, 0, 3, 4, 2, 5, 3, 1, 4, 5, 3, 5, 4]); ng.computeVertexNormals();
    mesh(ng, new THREE.MeshPhysicalMaterial({ color: 0x232a33, metalness: 0.8, roughness: 0.35, clearcoat: 0.3, envMap: env, envMapIntensity: 1.0, flatShading: true }), needle);
    const red = mesh(new THREE.SphereGeometry(0.0021, 16, 10), new THREE.MeshPhysicalMaterial({ color: P.P16, roughness: 0.45, clearcoat: 0.4, envMap: env }), needle, 0, hN * 0.35, L * 0.8); red.scale.set(0.75, 0.42, 1.25);
    mesh(new THREE.SphereGeometry(0.0019, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mBrassM, needle, 0, hN * 0.4, 0).scale.y = 0.8;
    // mica cover with the crack at 乾 (NW) — the time mark
    const mc = canvas(256, 256), mg = mc.getContext('2d'), mr = util.rng(51);
    mg.fillStyle = '#fff'; mg.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 70; k++) { mg.fillStyle = `rgba(${150 + mr() * 60},${120 + mr() * 50},${60 + mr() * 40},${0.08 + mr() * 0.14})`; mg.beginPath(); mg.ellipse(mr() * 256, mr() * 256, 10 + mr() * 60, 3 + mr() * 14, mr() * 3.1, 0, 6.283); mg.fill(); }
    mg.strokeStyle = 'rgba(40,30,20,0.9)'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(40, 52); mg.lineTo(70, 80); mg.lineTo(84, 86); mg.lineTo(105, 112); mg.stroke();
    mg.strokeStyle = 'rgba(255,250,235,0.9)'; mg.lineWidth = 1; mg.beginPath(); mg.moveTo(41, 50); mg.lineTo(71, 78); mg.lineTo(85, 84); mg.lineTo(106, 110); mg.stroke();
    const mica = mesh(new THREE.CircleGeometry(WELL_R + 0.0012, 64), new THREE.MeshPhysicalMaterial({ color: 0xffe2a8, map: ctex(mc), transparent: true, opacity: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 1.3, depthWrite: false }), compPivot, 0, 0.0004, 0, false);
    mica.rotation.x = -Math.PI / 2; mica.rotation.z = COMP_ROT; mica.renderOrder = 5;
    // acrylic cradle: a tilted slab + two side cheeks
    const cr = mesh(box(0.17, 0.006, 0.17), mAcrylic, compass, 0, -0.04, 0, false, false); cr.rotation.x = 15 * D2R; cr.renderOrder = 6;
    for (const sx of [-1, 1]) { const ch = mesh(box(0.006, 0.09, 0.1), mAcrylic, compass, sx * 0.07, -0.08, 0, false, false); ch.renderOrder = 6; }
    compass.traverse((o) => { if (o.isMesh && o.material !== mAcrylic) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // the future: linen-covered board tilted 12°, the folded aged coat (left cuff on top toward the glass, worn spot up), blank label
  const future = new THREE.Group(); future.name = 'future'; scene.add(future); future.visible = false;
  const coat = new THREE.Group(); future.add(coat);
  let coatCuff = null, cuffWorn = new THREE.Vector3();
  const mLinen = TX.mat('linen', { repeat: [2.2, 2.2], tex: { tone: 'linen', seed: 15, creases: 0.12 }, color: hex('#e9e2d4') });
  const mCoatAged = TX.mat('wool_coat', { repeat: [2.4, 2.4], tex: { tone: P.coatAged, pill: 0.9, seed: 35 } });
  {
    const board = mesh(box(0.54, 0.025, 0.5), mLinen, future, 0, 0, 0); board.name = 'board';
    future.position.set(G1.x, DECK1 + 0.06, G1.z - 0.01); future.rotation.x = 12 * D2R;      // raised at the back
    // folded coat block (≈ 44 × 36 cm): lumpy wool slab, lapels + collar at the back, three dull horn buttons down the front fold
    const cb = new THREE.BoxGeometry(0.44, 0.045, 0.36, 26, 3, 22), N = TX.makeNoise(77), bp = cb.attributes.position;
    for (let i = 0; i < bp.count; i++) { let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); const e = Math.max(Math.abs(x) / 0.22, Math.abs(z) / 0.18);
      if (y > 0) y -= 0.012 * smoothstep(0.75, 1.0, e) - 0.004 * N.fbm(x * 4 + 0.3, z * 4 + 0.6, 2, 3); x *= 1 + 0.03 * Math.sin(Math.PI * (y + 0.0225) / 0.045); bp.setXYZ(i, x, y, z); }
    cb.computeVertexNormals();
    mesh(cb, mCoatAged, coat, 0, 0.035, 0);
    const lap = mesh(box(0.2, 0.012, 0.09), mCoatAged, coat, -0.06, 0.06, -0.13); lap.rotation.y = 0.3; lap.rotation.z = 0.05;
    const col = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), mCoatAged, coat, 0, 0.058, -0.165); col.rotation.z = Math.PI / 2; col.scale.z = 0.6;
    const hornM = std({ color: hex('#2e2620'), roughness: 0.75 });
    for (let k = 0; k < 3; k++) { const b = mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.005, 20), hornM, coat, 0.11, 0.06, -0.09 + k * 0.08); b.rotation.x = 0.02; }
    // left sleeve folded across the front of the block: a flattened tube ending in the library's worn cuff (hand hidden)
    const sl = mesh(new THREE.CylinderGeometry(0.047, 0.052, 0.36, 24, 1, false), mCoatAged, coat, -0.02, 0.074, 0.075);
    sl.rotation.set(0, 0, Math.PI / 2 - 0.12); sl.scale.set(1, 1, 0.55); sl.rotation.order = 'ZXY';
    coat.position.set(0.0, 0.0125, 0.0);
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
    const stripM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.18, envMap: env, envMapIntensity: 1.6, depthWrite: false });
    const s1 = mesh(new RoundedBoxGeometry(0.024, 0.006, 0.2, 2, 0.0025), stripM, chartBoard, 0, 0.0105, 0, false, false); s1.name = 'strip1'; s1.renderOrder = 7;
    const s2 = mesh(new RoundedBoxGeometry(0.27, 0.006, 0.024, 2, 0.0025), stripM, chartBoard, 0, 0.0105, 0, false, false); s2.name = 'strip2'; s2.renderOrder = 7;
    // registry: frame centre over the chart at v = 0.669 from the top edge (ship_cabin S005); place the strips in frame coords
    const vC = 1 - (0.88 - 0.5) * FRAME_H / CH.Wd;                         // 0.669
    const fr2loc = (fx, fy) => V((fx - 0.5) * FRAME_W, 0, -CH.Wd / 2 + vC * CH.Wd + (fy - 0.5) * FRAME_H);
    s1.position.copy(fr2loc(0.10, 0.50)).setY(0.0105); s2.position.copy(fr2loc(0.75, 0.06)).setY(0.0105);
    chartBoard.userData.fr2loc = fr2loc;
    // glass top (horizontal)
    g2Glass = glassMaterial({ haze: 0.06, dust: 0.04, hazeLevel: 0.008, envMapIntensity: 0.3, reflect: 0.2, res: [ctx.W, ctx.H], aspect: G2.w / G2.d, smudgeRepeat: [2, 1.2] });
    g2Glass.material.envMap = env;
    g2GlassMesh = new THREE.Mesh(new THREE.PlaneGeometry(G2.w - 0.02, G2.d - 0.02), g2Glass.material); g2GlassMesh.rotation.x = -Math.PI / 2; g2GlassMesh.position.y = G2.h; g2GlassMesh.renderOrder = 60; g2GlassMesh.layers.set(L_OVL); g2.add(g2GlassMesh);
    g2.traverse((o) => { if (o.isMesh && o !== g2GlassMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  }
  const g2Light = new THREE.SpotLight(0xffd2a0, 0, 0, 0.5, 0.9, 2); g2Light.position.set(G2.x - 0.1, 2.2, G2.z + 0.2); g2Light.target.position.set(G2.x, G2.h - 0.08, G2.z); scene.add(g2Light, g2Light.target);

  // ======================================================================================================== G3 — three tall wall vitrines
  const g3 = []; const g3Grp = new THREE.Group(); g3Grp.name = 'g3'; scene.add(g3Grp);
  const mVitBack = TX.mat('velvet', { repeat: [2, 3], tex: { tone: P.velvet3, seed: 62 } });
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
    mesh(box(W, G3.base, D), mPlinth, v.grp, 0, G3.base / 2, D / 2);
    mesh(box(W, G3.cap - G3.top, D), mPlinth, v.grp, 0, (G3.top + G3.cap) / 2, D / 2);
    mesh(new THREE.PlaneGeometry(W - 0.02, G3.top - G3.base), mVitBack, v.grp, 0, (G3.top + G3.base) / 2, 0.012, false, true);
    for (const sx of [-1, 1]) { const sd = mesh(new THREE.PlaneGeometry(D, G3.top - G3.base), mVitBack, v.grp, sx * (W / 2 - 0.01), (G3.top + G3.base) / 2, D / 2, false, true); sd.rotation.y = -sx * Math.PI / 2; }
    // slim bronze frame (these are framed wall cases, unlike the frameless G1)
    for (const sx of [-1, 1]) mesh(box(0.03, G3.top - G3.base, 0.03), mBronze, v.grp, sx * (W / 2 - 0.015), (G3.top + G3.base) / 2, D - 0.015);
    mesh(box(W, 0.03, 0.03), mBronze, v.grp, 0, G3.top - 0.015, D - 0.015); mesh(box(W, 0.03, 0.03), mBronze, v.grp, 0, G3.base + 0.015, D - 0.015);
    // display deck (velvet) at DECK3, and the interior light strip under the cornice (emissive) + a soft glow on the back
    mesh(box(W - 0.04, 0.03, D - 0.06), mVelvet3, v.grp, 0, DECK3 - 0.015, D / 2 - 0.01);
    mesh(box(W - 0.04, DECK3 - G3.base - 0.03, 0.02), mPlinth, v.grp, 0, (DECK3 + G3.base) / 2 - 0.015, D - 0.05);
    const strip = mesh(box(W - 0.12, 0.008, 0.016), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.58).multiplyScalar(2.2) }), v.grp, 0, G3.top - 0.03, D - 0.12, false, false);
    const glowM = new THREE.MeshBasicMaterial({ map: TX.spriteTexture('soft'), color: new THREE.Color(0.9, 0.7, 0.5).multiplyScalar(0.045), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const gl = mesh(new THREE.PlaneGeometry(W * 1.1, 2.2), glowM, v.grp, 0, 2.05, 0.02, false, false); gl.renderOrder = 8;
    v.strip = strip; v.glow = gl;
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
    const ring = mesh(new THREE.TorusGeometry(0.045, 0.0035, 8, 40), mAcrylic, c, 0, MY + 0.02, 0.33, false, false); ring.rotation.x = Math.PI / 2; ring.renderOrder = 6;
    const stem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), mAcrylic, c, 0, MY - 0.02, 0.33, false, false); stem.renderOrder = 6;
    const shelf = mesh(box(0.3, 0.012, 0.22), mAcrylic, c, 0, MY - 0.066, 0.3, false, false); shelf.renderOrder = 6;
    for (const sx of [-0.13, 0.13]) { const arm = mesh(new THREE.BoxGeometry(0.006, 0.12, 0.006), mAcrylic, c, sx * 0.4, MY, 0.33, false, false); arm.rotation.z = sx > 0 ? -0.5 : 0.5; arm.renderOrder = 6; }
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
    const shirtM = TX.mat('shirt', { repeat: [3.2, 2.4], tex: { seed: 21, creases: 0.45, tone: 'shirtMuseum' }, color: new THREE.Color(1.0, 1.06, 1.18) });
    const bg = new THREE.BoxGeometry(0.3, 0.032, 0.22, 24, 3, 18), N = TX.makeNoise(61), bpp = bg.attributes.position;
    for (let i = 0; i < bpp.count; i++) { let x = bpp.getX(i), y = bpp.getY(i), z = bpp.getZ(i); const e = Math.max(Math.abs(x) / 0.15, Math.abs(z) / 0.11), tt = (y + 0.016) / 0.032;
      const bulge = 1 + 0.035 * Math.sin(Math.PI * tt); x *= bulge; z *= bulge; if (y > 0) y -= 0.009 * smoothstep(0.7, 1.0, e) - 0.0016 * N.fbm(x * 3 + 0.5, z * 3 + 0.5, 2, 3); bpp.setXYZ(i, x, y, z); }
    bg.computeVertexNormals();
    mesh(bg, shirtM, shirtG, 0, 0.016, 0);
    const seam = std({ color: 0x6b7987, roughness: 0.95 }), pale = std({ color: 0x9aa6b2, roughness: 0.95 });
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
    const clothM = TX.mat('cotton', { repeat: [0.5, 0.5], tex: { tone: [118, 70, 60], seed: 33, creases: 0.9 } });
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
    const sx0 = 640, sy0 = 210; g.strokeStyle = 'rgba(122,110,140,0.55)'; g.lineWidth = 4; g.beginPath(); g.arc(sx0, sy0, 62, 0, 6.28); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(sx0, sy0, 50, 0, 6.28); g.stroke();
    g.fillStyle = 'rgba(122,110,140,0.5)'; g.fillRect(sx0 - 28, sy0 - 4, 56, 12); g.fillRect(sx0 - 6, sy0 - 22, 10, 18);
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = -36; x <= 36; x += 3) { const y = sy0 + 18 + k * 8 + Math.sin(x * 0.3) * 2.5; x === -36 ? g.moveTo(sx0 + x, y) : g.lineTo(sx0 + x, y); } g.stroke(); }
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; g.moveTo(sx0 + 30, sy0 - 34); g.lineTo(sx0 + 30 + Math.cos(a) * 7, sy0 - 34 + Math.sin(a) * 7); } g.stroke();
    // centre fold shading
    const fg = g.createLinearGradient(374, 0, 394, 0); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, 'rgba(60,50,30,0.22)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fg; g.fillRect(370, 0, 30, 576);
    const passT = ctex(pc);
    const passM = std({ map: passT, roughness: 0.9, side: THREE.DoubleSide });
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
  const inspLamp = new THREE.Group(); inspLamp.name = 'inspLamp'; g3[2].grp.add(inspLamp); inspLamp.visible = false;
  const inspHead = new THREE.Group(); inspLamp.add(inspHead);
  {
    const blk = std({ color: 0x141518, roughness: 0.45, metalness: 0.4, envMap: env, envMapIntensity: 0.5 });
    mesh(box(0.03, 0.06, 0.04), blk, inspLamp, 0, 0, 0);
    const neck = new THREE.CatmullRomCurve3([V(0, 0.02, 0), V(-0.05, 0.14, 0.02), V(-0.16, 0.2, 0.06), V(-0.24, 0.17, 0.08)]);
    mesh(new THREE.TubeGeometry(neck, 20, 0.005, 6, false), blk, inspLamp);
    inspHead.position.set(-0.24, 0.17, 0.08);
    const hood = mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.06, 20, 1, true), std({ color: 0x141518, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), inspHead); hood.rotation.z = Math.PI / 2 + 0.6;
    const bulb = mesh(new THREE.CircleGeometry(0.016, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.65).multiplyScalar(6) }), inspHead, -0.012, -0.016, 0, false, false); bulb.rotation.y = -Math.PI / 2; bulb.rotation.x = 0.6;
    inspLamp.position.set(G3.w / 2 - 0.06, 1.25, G3.d - 0.05);
  }
  const inspLight = new THREE.SpotLight(0xffd6a6, 0, 1.6, 0.62, 0.7, 2); scene.add(inspLight, inspLight.target);

  // ======================================================================================================== LIGHTS
  const moon = new THREE.DirectionalLight(0xbccbe6, 1.6);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0003; moon.shadow.normalBias = 0.02; moon.shadow.radius = 2;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0x2a3d60, 0x1c140e, 0.2); scene.add(hemi);
  const g1Spot = g1.light;                                                    // the 3000 K pin spot (lib vitrine)
  const g3Spot = new THREE.SpotLight(0xffd4a4, 0, 3.2, 0.55, 0.85, 2); scene.add(g3Spot, g3Spot.target);   // the one lit wall case of a close shot
  const torch = new THREE.SpotLight(0xffeedd, 0, 14, 0.2, 0.55, 2); torch.castShadow = false; scene.add(torch, torch.target);
  const torchCone = FX.beamCone({ origin: [0, 1, 0], dir: [0, -1, 0.3], angle: 0.18, length: 3.2, color: 0xfff1e0, intensity: 0.12 }); scene.add(torchCone.object3D);
  const fillA = new THREE.PointLight(0x8fa3c4, 0, 4, 2); scene.add(fillA);             // per-shot "bounce" fill (moon pool / floor)
  const warmFill = new THREE.PointLight(0xffc88e, 0, 3, 2); scene.add(warmFill);
  const futTop = new THREE.SpotLight(0xf4efe6, 0, 0, 0.6, 0.95, 2); scene.add(futTop, futTop.target);  // the future gallery: broad soft top light
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
  const shafts = DOORS_X.map((x, i) => FX.windowShaft({ center: [x, 2.2, GAL.z1], right: [1.2, 0, 0], up: [0, 2.2, 0], dir: MOON_CH1.toArray(), length: 18, cookie, color: 0xb8c8e8, intensity: 0.08, floorY: 0, noise: 0.55, seed: i, penumbra: 0.012 }));
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
  R.root.visible = false;
  const guard = await loadCharacter('GUARD', { lod: 'mid' });
  scene.add(guard.root); guard.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); guard.root.visible = false;
  // the guard's torch: moved from the belt into his right hand
  const torchObj = guard.accessories.flashlight;
  if (torchObj) { torchObj.parent.remove(torchObj); guard.hold('R', torchObj, { socket: 'grip', grip: ['grip', { radius: 0.015 }] }); torchObj.position.set(0, 0, 0); torchObj.rotation.set(0, 0, 0); }
  // close-up gloved right hand (+ coat sleeve) — S001/S002/S004/S026/S030/S040
  const handR = await loadCharacterHand('RESTORER', 'R', { lod: 'close' });
  toneGlove(handR.meshes.glove && handR.meshes.glove.material, 0.74);
  { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.36, 28, 1, false), mWool); sl.position.y = 0.04 + 0.18; sl.castShadow = sl.receiveShadow = true; handR.root.add(sl); handR.root.userData.sleeve = sl; }
  handR.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(handR.root); handR.root.visible = false;
  // the aged left cuff for the future coat: the library cuff (worn spot 18×8 mm, 1 cm above the edge, little-finger side) in the
  // aged colour, hand meshes hidden; own options → own materials
  const cuffHand = await loadCharacterHand('RESTORER', 'L', { lod: 'close', hand: { cuffs: [{ style: 'plain', color: hex(P.coatAged), fabric: 'wool', radius: 0.046, edge: 0.012, wearColor: hex('#8a8784'), detail: [{ type: 'worn', amount: 1 }] }] } });
  for (const k of ['glove', 'skin', 'skinArm']) if (cuffHand.meshes[k]) cuffHand.meshes[k].visible = false;
  cuffHand.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  coat.add(cuffHand.root); coatCuff = cuffHand;

  // ======================================================================================================== ERA SCENE (screen-space era layer)
  // rendered with the main camera's transform into an RGBA RT, composited in G1's glass: the navigator's salt hand, the glints,
  // the future viewer (S071/S078). Its own lights — nothing in it lights or shadows the gallery.
  const eraScene = new THREE.Scene();
  const eraMoon = new THREE.DirectionalLight(0xaebfe0, 2.2); eraScene.add(eraMoon, eraMoon.target);
  const eraLamp = new THREE.PointLight(0xffb060, 0, 3, 2); eraScene.add(eraLamp);
  const eraHemi = new THREE.HemisphereLight(0x3a5078, 0x14100c, 0.35); eraScene.add(eraHemi);
  const navHand = await loadCharacterHand('NAVIGATOR', 'L', { lod: 'close' });
  eraScene.add(navHand.root); navHand.root.visible = false;
  const glints = []; for (let k = 0; k < 7; k++) { const g = FX.glow({ color: 0xf2f4ff, size: 0.006 + (k % 3) * 0.002, intensity: 3, falloff: 3.5, core: 1.2 }); eraScene.add(g.object3D); g.object3D.visible = false; glints.push(g); }
  const fut = await loadCharacter('FUTURE', { lod: 'hi' });
  eraScene.add(fut.root); fut.root.visible = false;
  const futHandL = await loadCharacterHand('FUTURE', 'L', { lod: 'close' });   // the reflected raised hand (a mirrored right hand = a left hand)
  eraScene.add(futHandL.root); futHandL.root.visible = false;
  const eraKey = new THREE.SpotLight(0xf6efe4, 0, 8, 0.7, 0.9, 2); eraScene.add(eraKey, eraKey.target);
  // depth-only proxy so the engine DOF blurs the composited hand by ITS mirror depth (sits between the glass and the velvet)
  const dofProxy = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true }));
  dofProxy.renderOrder = 59; dofProxy.visible = false; scene.add(dofProxy);

  // ======================================================================================================== RENDER TARGETS, BLUR, MIRROR
  const rtHand = ctx.makeRT(ctx.W, ctx.H);
  const rtMir = ctx.makeRT(640, 268);
  const rtMirB = [ctx.makeRT(640, 268), ctx.makeRT(640, 268)];
  const rtSea = ctx.makeRT(560, 420);
  const rtEra = [ctx.makeRT(384, 576), ctx.makeRT(384, 576), ctx.makeRT(384, 576)];
  const rtEraW = ctx.makeRT(640, 268);                                         // S026: screen-space home view
  const rtBlur = { 640: [ctx.makeRT(640, 268), ctx.makeRT(640, 268)], 384: [ctx.makeRT(384, 576), ctx.makeRT(384, 576)], 560: [ctx.makeRT(560, 420), ctx.makeRT(560, 420)], hand: [ctx.makeRT(640, 268), ctx.makeRT(640, 268)] };
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
  function mirrorPass(p0, n, rt, { hide = [] } = {}) {
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
    const vis = hide.map((o) => o.visible); hide.forEach((o) => { o.visible = false; });
    const r = ctx.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, vcam); r.setRenderTarget(prev);
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
  const OV_COMMON = `varying vec3 vW; varying vec2 vUv; varying vec3 vN;
    uniform mat4 uProjM; uniform vec2 uRes; uniform sampler2D tMir, tEra, tEra2, tSmudge, uNoiseT; uniform float uMir, uMirFres, uEra, uEraFres, uEra2, uEra2Depth, uAspect, uEdgeSoft;
    uniform vec3 uEraO, uEraU, uEraV, uEraTint, uDustCol; uniform int uWipeN; uniform vec2 uWipeP[6]; uniform float uWipeL[6];
    uniform float uWipeProg, uWipeW, uWipeSoft, uMaskFloor, uMaskFloor2, uDust, uDustTop, uDustLod, uGlint; uniform vec2 uDustRep;
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
        float inb = t > 0.0 ? smoothstep(0.0, 0.06, euv.x) * smoothstep(1.0, 0.94, euv.x) * smoothstep(0.0, 0.06, euv.y) * smoothstep(1.0, 0.94, euv.y) : 0.0;
        col += texture2D(tEra, clamp(euv, 0.0, 1.0)).rgb * inb * uEra * uEraTint * mix(uMaskFloor, 1.0, wm) * mix(1.0, 0.45 + 14.0 * fr, uEraFres);
      }
      if (uMir > 0.0) { vec3 r = texture2D(tMir, vec2(1.0 - s.x, s.y)).rgb; col += r * uMir * mix(1.0, fr / 0.04, uMirFres); }
      if (uDust > 0.0) {   // dust film on the glass, lit along its upper edge by the warm pin spot; cleared where wiped
        vec4 sm = textureLod(tSmudge, vUv * uDustRep, uDustLod);
        float lit = mix(1.0, smoothstep(0.15, 1.0, vUv.y) * 1.7 + 0.2, uDustTop);
        col += uDustCol * (sm.r * 0.45 + sm.b * 1.8) * uDust * lit * (1.0 - 0.94 * wm);
      }
      if (uGlint > 0.0) { float g = texture2D(uNoiseT, vUv * vec2(uAspect, 1.0) * 7.0).b; col += vec3(0.9, 0.95, 1.0) * pow(max(g - 0.84, 0.0) * 6.2, 3.0) * uGlint * wm; }
      gl_FragColor = vec4(col * edge, 1.0);
    }`,
    // ROLE 1 main (full res)
    `void main(){
      float edge = paneEdge(), wm = wipeMask(vUv); vec2 s = gl_FragCoord.xy / uRes;
      vec4 h = texture2D(tEra2, s);
      gl_FragColor = vec4(h.rgb * uEra2 * mix(uMaskFloor2, 1.0, wm) * edge, 1.0);
    }`,
    // ROLE 2 depth (era layer mirror depth)
    `void main(){
      vec2 s = gl_FragCoord.xy / uRes; float a = texture2D(tEra2, s).a * min(uEra2, 1.0);
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
      tEra2: { value: null }, uEra2: { value: 0 }, uEra2Depth: { value: 0.02 },
      uAspect: { value: aspect }, uEdgeSoft: { value: 0.03 },
      uWipeN: { value: 0 }, uWipeP: { value: wp }, uWipeL: { value: wl }, uWipeProg: { value: 0 }, uWipeW: { value: 0.1 }, uWipeSoft: { value: 0.03 },
      uMaskFloor: { value: 1 }, uMaskFloor2: { value: 1 }, uDust: { value: 0 }, uDustCol: { value: new THREE.Color(1.0, 0.86, 0.66) }, tSmudge: { value: smudge }, uDustRep: { value: new THREE.Vector2(1, 1) },
      uDustTop: { value: 0.6 }, uDustLod: { value: 0 }, uNoiseT: { value: TX.noiseTexture() }, uGlint: { value: 0 },
    };
    const mk = (role) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: OV_VERT, fragmentShader: OV_COMMON + OV_FRAG[role], transparent: true,
      depthTest: true, depthWrite: role === 2, colorWrite: role !== 2,
      ...(role === 2 ? {} : { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }) });
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
      reset() { U.uMir.value = 0; U.uEra.value = 0; U.uEra2.value = 0; U.uDust.value = 0; U.uGlint.value = 0; U.uWipeN.value = 0; U.uMaskFloor.value = 1; U.uMaskFloor2.value = 1; U.uEraFres.value = 0.3; U.uMirFres.value = 1; U.uEraTint.value.setRGB(1, 1, 1); U.uDustLod.value = 0; },
      sync() { low.visible = U.uEra.value > 0 || U.uMir.value > 0 || U.uDust.value > 0 || U.uGlint.value > 0; main.visible = dep.visible = U.uEra2.value > 0; },
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
  function reset(o = {}) {
    for (const ov of allOv) ov.reset();
    R.root.visible = false; guard.root.visible = false; handR.root.visible = false; handR.setGlove(true);
    navHand.root.visible = false; fut.root.visible = false; futHandL.root.visible = false; for (const g of glints) g.object3D.visible = false;
    dofProxy.visible = false; mirMoon.object3D.visible = false; archGlow.visible = false;
    for (const s of [...shafts, ...shaftsI]) s.object3D.visible = false; dust.object3D.visible = false;
    compass.visible = !o.future; future.visible = !!o.future; g1Deck.material = o.future ? mLinen : g1Velvet;
    g1Spot.visible = true; g1Spot.intensity = o.g1Spot ?? 2.2 * 6;
    g2Light.intensity = o.g2 ?? 0; g3Spot.intensity = 0; g3Spot.visible = false; torch.intensity = 0; torch.visible = false; torchCone.object3D.visible = false;
    inspLamp.visible = false; inspLight.intensity = 0; inspLight.visible = false;
    fillA.intensity = 0; fillA.visible = false; warmFill.intensity = 0; warmFill.visible = false; futTop.intensity = 0; futTop.visible = false;
    hemi.intensity = o.hemi ?? 0.2; hemi.color.set(0x2a3d60); hemi.groundColor.set(0x1c140e);
    setMoon(o.moon || MOON_CH1, o.moonI ?? 1.6, o.bounds);
    moon.visible = o.moonI !== 0;
    g3[2].door.rotation.y = 0;
    for (const v of g3) { v.strip.visible = true; v.glow.visible = true; }
    caseLid.rotation.x = -1.95;
    room.userData.skyM.color.setRGB(0.55, 0.62, 0.8);
    scene.background.set('#020305');
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
  function nested(key, view, tl, u, T, rt) { if (OFF.has('nested')) return rt.texture; return ctx.renderNested(key, view, tl, u, T, rt, rt.width / rt.height); }

  // ======================================================================================================== SHOT SETUPS
  // S001 hand choreography (screen coords of the index pad on the glass, from the opening camera): the fingertip enters from
  // frame right, wipes an arc right → left that turns the hand from fingers-left to fingers-up (1.23–4.5 s), then rests with
  // the hand centred at (0.50, 0.55) (T01). The path end is calibrated once so that her palm centre lands there.
  const S1 = { touch: 1.23, wipeEnd: 4.5, off: [0, 0] };
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
    const fd = V(-Math.cos(tp.ang), Math.sin(tp.ang), -0.05).normalize();   // fingers along the glass, slightly into it
    if (s < 0.7) handR.pose('wipe'); else handR.setChannels(blendHandChannels(handPose('wipe', {}, handR.dims), handPose('relaxed', { curl: 0.32 }, handR.dims), ease.inOutSine(clamp((s - 0.7) / 0.3))));
    placeHandAt(handR, tip, fd, V(0.0, 0.0, -1), 'index');
    return handR.sockets.palm.getWorldPosition(V());
  }
  if (!S1.cal) { // calibrate: palm centre at the end of the wipe → (0.50, 0.55)
    for (let it = 0; it < 3; it++) { const pc = herHandOnGlass(1, 0, 0); const sp = toScreenOpen(pc); S1.off[0] += 0.5 - sp[0]; S1.off[1] += 0.55 - sp[1]; }
    S1.cal = true; handR.root.visible = false;
  }
  // the navigator's left hand behind the glass at mirror depth d (m), rise r (0 low … 1 in place), palm toward the glass,
  // centred on HER palm (rel = screen offset), ~8 % larger than hers
  function navHandAt(d, r, T, herPalm, rel = [-0.01, 0.012]) {
    navHand.root.visible = true;
    navHand.pose('relaxed', { curl: 0.22 });
    const w = MC_OPEN.target.distanceTo(MC_OPEN.pos) * 36 / MC_OPEN.mm, h = w / ctx.aspect;
    const c = herPalm.clone().setZ(G1F).add(V(rel[0] * w, -rel[1] * h, 0));
    const p = c.clone().add(V(0.0, -0.17 * (1 - r), -d));
    navHand.placeWrist([0, 0, 0], V(-0.03, 1, 0.0).normalize(), V(0, 0, 1)); navHand.root.scale.setScalar(1.0); navHand.root.updateMatrixWorld(true);
    const palm = navHand.sockets.palm.getWorldPosition(V());
    navHand.root.position.add(p.clone().sub(palm)); navHand.root.updateMatrixWorld(true);
    // his own night: cool moon from the upper right, a warm low ship-lamp glow from the lower left
    eraMoon.intensity = 0.9; eraMoon.position.copy(p).add(V(0.9, 1.3, 1.2)); eraMoon.target.position.copy(p); eraMoon.target.updateMatrixWorld();
    eraLamp.visible = true; eraLamp.position.copy(p).add(V(-0.3, -0.32, 0.22)); eraLamp.intensity = 0.05 * util.flicker(T, 3);
    eraHemi.intensity = 0.3;
    return p;
  }
  // G1's south pane: the night sea (sea_deck view_shiplamp) on a virtual image plane 20 m behind the glass, framed so that
  // from the S002 end camera it fills the frame window x 0.19–0.95 (lamp ≈ (0.36, 0.32))
  const SEA = (() => {
    const camZ = MC_OPEN.pos.z + 1.2 - 0.026 * 1.28, D = 20, dist = camZ - (G1F - D);
    const fw = dist * 36 / 100, fh = fw / ctx.aspect;           // frame size at the image plane (S002 end camera)
    const x0 = (0.19 - 0.5) * fw, x1 = (0.95 - 0.5) * fw;
    return { c: V((x0 + x1) / 2, MC_OPEN.pos.y, G1F - D), U: V((x1 - x0) / 2, 0, 0), Vv: V(0, fh / 2 * 1.02, 0), z: G1F - D };
  })();
  function seaPlane(tl, u, T, strength, focus, mm, N) {
    const tex0 = nested('sea_deck', 'view_shiplamp', tl, u, T, rtSea);
    const z = camera.position.z - SEA.z, c = cocPx(z, focus, mm, N);
    const scrW = (2 * SEA.U.x) / (z * 36 / mm) * ctx.W;                       // the image plane's width on screen (px)
    eraPlane(ovG1, blur(tex0, rtBlur[560], Math.min(14, c * rtSea.width / scrW + 0.6)), strength, SEA.c, SEA.U, SEA.Vv);
  }
  const dustFor = (ov, focus, dGlass, mm, N, k) => { ov.U.uDust.value = k; ov.U.uDustLod.value = Math.log2(1 + cocPx(dGlass, focus, mm, N) * 0.5); };

  const setups = {
    // ---------------------------------------------------------------------------------------------- S001 ECU 100 mm
    // 0–13.25 s, fade in. MC push 2 %. 1.23 touch; 1.2–4.5 wipe arc; 3.0 salt glints in the cleared band; 6.6–9 focus racks
    // through the glass; 8–11 his left hand rises, palm to glass, stops one finger short; 11–13.25 still, closing mm.
    S001(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: 3.0, bounds: { x0: -2, x1: 2, y0: 0, y1: 2.5, z0: 2.8, z1: 7.6 }, hemi: 0.12 });
      const push = ease.inOutSine(clamp(tl / 13.25));
      const pos = MC_OPEN.pos.clone().lerp(MC_OPEN.target, 0.02 * push);
      cam.place(camera, pos, MC_OPEN.target); cam.lens(camera, MC_OPEN.mm);
      // her hand: enters from the right (0.15–1.23), wipes 1.23–4.5 (decelerating), rests with a micro tremor
      const s = tl < S1.touch ? 0 : ease.outCubic(clamp((tl - S1.touch) / (S1.wipeEnd - S1.touch)));
      const enter = ease.outCubic(clamp((tl - 0.15) / 1.08));
      const herPalm = herHandOnGlass(s, T, 0.0003, (1 - enter) * 0.03);
      if (tl < S1.touch) { handR.root.position.x += (1 - enter) * 0.09; handR.root.updateMatrixWorld(true); }
      // moonlight from the doorway behind the lens on the back of the glove; a little warm spill of the pin spot on top
      warmFill.visible = true; warmFill.color.set(0xffc890); warmFill.position.set(0.02, 1.62, G1F + 0.12); warmFill.intensity = 0.05; warmFill.distance = 0.9;
      // wipe mask (pane UV along the fingertip path) + dust
      const wpts = [0, 0.25, 0.5, 0.75, 1].map((k) => toPaneUV(glassPt(tipPath(k).fx, tipPath(k).fy)));
      ovG1.setWipe(wpts, 0.075, 0.025, s);
      const fGlass = camera.position.z - G1F;
      // his hand: from 8.0 s it rises and advances 30 → 2 cm behind the glass, stops at 11.0; then closes 2 → 1.2 cm
      const k8 = ease.inOutSine(clamp((tl - 8.0) / 3.0));
      const d = lerp(0.30, 0.02, k8) - 0.008 * ease.inOutSine(clamp((tl - 11) / 2.25));
      const vis = smoothstep(6.4, 9.6, tl);
      if (tl > 6.0) navHandAt(d, k8, T, herPalm);
      // salt glints (3.0 s): a few white crystals right behind the cleared band — the first trace of the other hand
      const gOn = tl > 2.6 && tl < 5.2;
      for (let k = 0; k < glints.length; k++) {
        const tp = tipPath(0.35 + 0.08 * k);
        const gpt = glassPt(tp.fx + 0.025 * Math.sin(k * 2.3), tp.fy + 0.03 * Math.cos(k * 1.7)).add(V(0, 0, -0.006 - 0.002 * (k % 3)));
        glints[k].object3D.visible = gOn; glints[k].object3D.position.copy(gpt);
        glints[k].set(3.2 * smoothstep(2.85, 3.05 + 0.06 * k, tl) * (1 - smoothstep(3.3 + 0.12 * k, 5.0, tl)));
      }
      // focus: glass surface (+ glove) → 6.6–9.0 through the glass to ~30 cm → follows his hand back to ~2 cm
      const rack = ease.inOutSine(clamp((tl - 6.6) / 2.4));
      const focus = fGlass + lerp(0.0, d, rack) + lerp(0.004, 0, rack);
      if (tl > 6.0 || gOn) {
        const eraTex = eraPass();
        ovG1.U.tEra2.value = eraTex; ovG1.U.uEra2.value = tl > 6.0 ? 0.9 * vis : 0.9; ovG1.U.uMaskFloor2.value = 0.5;
        ovG1.U.uEra2Depth.value = tl > 6.0 ? Math.max(d, 0.006) : 0.008;
      }
      dustFor(ovG1, focus, fGlass, 100, 4, 0.03); ovG1.U.uDustRep.value.set(1.6, 1.33); ovG1.U.uDustTop.value = 0.75;
      ovG1.U.uGlint.value = 2.2 * smoothstep(2.75, 3.0, tl) * (1 - smoothstep(3.4, 4.8, tl));
      DBGP.herPalm = herPalm;
      return { dof: { focus, fstop: 4.0, maxCoc: 1.6 }, exposure: 1.3, bloom: { strength: 0.28, threshold: 0.9 } };
    },
    // ---------------------------------------------------------------------------------------------- S002 ECU → MCU 100 mm
    // 13.25–21.125. Residual push to 3.45 s; hands nearly coincide on 千 (15.14 → tl 1.89); her tremor on 年 (tl 2.31);
    // 3.4–3.9 her hand lifts and exits right; from 3.45 a slow 1.2 m pull-back; 4.24 (17.49) focus into mirror depth, his hand
    // recedes ~40 cm and darkens as the night sea opens in the pane; 6.25 (19.5) the guard's torch sweeps once far away.
    S002(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: 3.0, bounds: { x0: -6, x1: 6, y0: 0, y1: 3, z0: -7, z1: 7.6 }, hemi: 0.12 });
      const back = ease.inOutSine(clamp((tl - 3.45) / 4.43)) * 1.2;
      const pushRes = 0.02 + 0.006 * ease.outSine(clamp(tl / 3.45));
      const base = MC_OPEN.pos.clone().lerp(MC_OPEN.target, pushRes);
      const pos = base.clone().add(V(0.012 * smoothstep(7.2, 7.875, tl), 0, back));
      cam.place(camera, pos, MC_OPEN.target.clone().add(V(0, -0.005 * smoothstep(3.5, 7.8, tl), 0))); cam.lens(camera, MC_OPEN.mm);
      const fGlass = camera.position.z - G1F;
      // her hand: still (tremor on 年), lifts 3.4 and exits right by 3.9; his hand aligned on her resting palm
      const herP0 = herHandOnGlass(1, 0, 0, 0);
      const lift = ease.inOutSine(clamp((tl - 3.4) / 0.5));
      herHandOnGlass(1, T * 4, 0.0004 + 0.0016 * Math.exp(-Math.pow((tl - 2.31) / 0.12, 2)), 0.03 * lift);
      if (lift > 0) { handR.root.position.x += 0.35 * lift * lift; handR.root.updateMatrixWorld(true); }
      handR.root.visible = lift < 1;
      warmFill.visible = true; warmFill.color.set(0xffc890); warmFill.position.set(0.02, 1.62, G1F + 0.12); warmFill.intensity = 0.05; warmFill.distance = 0.9;
      // his hand: closes the last millimetres to near-coincidence by 1.9, still; from 4.24 recedes 40 cm and darkens
      const recede = ease.inOutSine(clamp((tl - 4.24) / 2.6));
      const d = lerp(0.012, 0.006, ease.inOutSine(clamp(tl / 1.9))) + 0.40 * recede;
      navHandAt(d, 1, T, herP0);
      // focus: glass (both hands) → 4.24 into the mirror depth: the receding hand, the sea and the vitrine read together
      const rack = ease.inOutSine(clamp((tl - 4.24) / 1.0));
      const focus = fGlass + lerp(0.006, 0.55, rack) + 0.4 * recede * rack;
      const eraTex = eraPass();
      ovG1.U.tEra2.value = eraTex; ovG1.U.uEra2.value = 0.9 * (1 - 0.8 * recede); ovG1.U.uEra2Depth.value = d;
      // the sea opens in the pane: the wiped band widens to the whole pane, the image strengthens
      const wpts = [0, 0.25, 0.5, 0.75, 1].map((k) => toPaneUV(glassPt(tipPath(k).fx, tipPath(k).fy)));
      const open = ease.inOutSine(clamp((tl - 3.7) / 3.2));
      ovG1.setWipe(wpts, lerp(0.075, 1.3, open), lerp(0.025, 0.35, open), 1);
      ovG1.U.uMaskFloor.value = lerp(0.25, 1.0, open); ovG1.U.uMaskFloor2.value = 0.5;
      seaPlane(tl, u, T, lerp(0.35, 1.0, ease.inOutSine(clamp((tl - 3.2) / 3.5))), Math.max(focus, fGlass + 0.3 * rack), 100, 5.6);
      dustFor(ovG1, focus, fGlass, 100, 4.5, 0.03 * (1 - 0.5 * open)); ovG1.U.uDustRep.value.set(1.6, 1.33); ovG1.U.uDustTop.value = 0.75;
      // her faint reflected silhouette (she stepped back to the right of the lens) — true mirror
      if (tl > 3.6) {
        standAt(0.62, G1F + 1.05 + back * 0.7, Math.PI + 0.35, { weight: 0.3 });
        R.pose({ 'armR.upper.x': 0.12, 'armR.lower.x': 0.35, 'neck.x': 0.14, 'head.y': 0.2 }, { add: true }); R.lookAt(V(0, 1.12, G1F - 0.2), 0.6);
        const mt = mirrorPass(V(0, 1.2, G1F), V(0, 0, 1), rtMir, { hide: [compass, future] });
        const zr = fGlass + (R.root.position.z - G1F);
        ovG1.U.tMir.value = blur(mt, rtMirB, Math.min(10, cocPx(zr, focus, 100, 5.6) * 0.5 + 0.8)); ovG1.U.uMir.value = 0.55 * smoothstep(3.8, 5.2, tl); ovG1.U.uMirFres.value = 0.0;
      }
      // far background: the guard's torch sweeps once right → left (6.25 s)
      const sw = clamp((tl - 5.9) / 1.4);
      if (sw > 0 && sw < 1) {
        torch.visible = true; torchCone.object3D.visible = true;
        const o = V(lerp(4.6, -3.6, ease.inOutSine(sw)), 1.05, -4.4);
        const tgt = o.clone().add(V(-0.7, -1.05, 1.5));
        torch.position.copy(o); torch.target.position.copy(tgt); torch.target.updateMatrixWorld(); torch.intensity = 40 * Math.sin(Math.PI * sw); torch.angle = 0.24; torch.distance = 9;
        torchCone.update(T, { origin: o, dir: tgt.clone().sub(o), intensity: 0.16 * Math.sin(Math.PI * sw) });
      }
      return { dof: { focus, fstop: 5.6, maxCoc: 1.5 }, exposure: 1.3, bloom: { strength: 0.32, threshold: 0.86 } };
    },
    // ---------------------------------------------------------------------------------------------- S003 CU 75 mm
    // 21.125–28.42. 0–0.45 retreat momentum → slow rightward arc ~15° + push toward the compass, settles 4.9 s; the sea slides
    // off the pane by angle (gone by ~2.9 s — virtual image plane far behind the glass); focus reflection → dial; hold.
    S003(tl, u, T) {
      reset({ moon: MOON_INTRO, moonI: 3.0, bounds: { x0: -3, x1: 3, y0: 0, y1: 3, z0: -7, z1: 7.6 }, hemi: 0.12 });
      const a = ease.inOutSine(clamp((tl - 0.1) / 4.8));
      const C = compass.getWorldPosition(V());
      const ang = lerp(0, 15, a) * D2R;
      const dist = lerp(1.95, 0.98, a), hgt = lerp(0.13, 0.42, a);
      const pos = V(C.x + Math.sin(ang) * dist, C.y + hgt, C.z + Math.cos(ang) * dist);
      frameAt(pos, C, 0.5, lerp(0.62, 0.55, a), 75);
      const fC = cam.distTo(camera, C);
      const focus = lerp(fC + 2.2, fC, ease.inOutSine(clamp((tl - 0.5) / 1.3)));
      seaPlane(tl + 7.875, u, T, 1.0, focus, 75, 5.6);
      dustFor(ovG1, focus, cam.distTo(camera, V(C.x, C.y, G1F)), 75, 5.6, 0.012); ovG1.U.uDustRep.value.set(1.6, 1.33);
      return { dof: { focus, fstop: 5.6, maxCoc: 1.4 }, exposure: 1.35, bloom: { strength: 0.3, threshold: 0.9 } };
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
      return { dof: null, exposure: 1.1, temp: -0.05, saturation: 0.82, bloom: { strength: 0.12, threshold: 0.95 } };
    },
    // ---------------------------------------------------------------------------------------------- S023 WS 32 mm tilt-down
    // 83.54–86.79. The same moon, reflected high in G3c's glass at (0.70, 0.40) (light point → light point from S022's
    // catchlight); 0.12–2.52 tilt down (≈ 11°, see md) — the reflected moon rises out of frame with the glass; moon shafts from
    // the south doorways over the lens; the three cases in a row; she walks in from screen-left toward the moonlight.
    S023(tl, u, T) {
      reset({ moon: MOON_CH1, moonI: 3.2, hemi: 0.22 });
      for (const s of shafts) s.object3D.visible = true; dust.object3D.visible = true;
      const pos = V(0, 1.5, 2.85);
      const tilt = ease.inOutSine(clamp((tl - 0.12) / 2.4));
      const el0 = 3.9 * D2R, el1 = -7.0 * D2R;
      const aim = (el) => pos.clone().add(V(0, Math.tan(el) * 9.15, -9.15));
      cam.lens(camera, 32); cam.place(camera, pos, aim(lerp(el0, el1, tilt)));
      // the reflected moon (mirror-only sprite) placed so that from the START camera it sits at (0.70, 0.40) in the glass
      if (!setups._s23moon) {
        cam.place(camera, pos, aim(el0)); const hit = rayZ(0.70, 0.40, G3PZ); const rd = hit.clone().sub(camera.position).normalize(); rd.z = -rd.z;
        setups._s23moon = { p: hit.clone().addScaledVector(rd, 60), a: hit.clone().addScaledVector(rd, 9) };
        cam.place(camera, pos, aim(lerp(el0, el1, tilt)));
      }
      mirMoon.object3D.visible = true; mirMoon.object3D.position.copy(setups._s23moon.p);
      archGlow.visible = true; archGlow.position.copy(setups._s23moon.a); archGlow.scale.set(2.2, 3.4, 1); archGlow.lookAt(setups._s23moon.a.clone().add(V(0, 0, -10)));
      // she walks in from screen-left at ~1.3 m/s (in the dark, toward the moon pool)
      const wx = -5.0 + 1.3 * Math.max(0, tl - 1.7);
      if (tl > 1.7) { walkAt(wx, -3.9, Math.PI / 2, wx + 10); R.lookAt(V(wx + 3, 1.5, -6.3), 0.35); }
      // mirror pass across the three G3 panes (one plane)
      const mt = mirrorPass(V(0, 1.6, G3PZ), V(0, 0, 1), rtMir, { hide: [g3Grp] });
      const mb = blur(mt, rtMirB, 1.4);
      for (const ov of ovG3) { ov.U.tMir.value = mb; ov.U.uMir.value = 0.35; ov.U.uMirFres.value = 0.3; }
      for (const s of shafts) s.update(T, { intensity: 0.32 }); dust.update(T, { camera, focus: 6, fstop: 8 });
      fillA.visible = true; fillA.color.set(0x8ea2c6); fillA.position.set(1.0, 0.3, -1.0); fillA.intensity = 1.2; fillA.distance = 9;
      return { dof: { focus: lerp(14, 8.0, tilt), fstop: 5.6 }, exposure: 1.45, bloom: { strength: 0.35, threshold: 0.85 } };
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
      if (OFF.has('moonshadow')) moon.castShadow = false; else moon.castShadow = true;
      if (OFF.has('shafts')) for (const s of [...shafts, ...shaftsI]) s.object3D.visible = false;
      if (OFF.has('fig')) { R.root.visible = false; guard.root.visible = false; }
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
