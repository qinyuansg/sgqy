// old_home — LOC_HOME: the navigator's coastal granite house (17th c., era 'home', CT_HOME) + a small lab-window rig for
// the S017 reflection shot and a vitrine-glass layer for the S041 reflection hand-off.
// Shots: S016 S017 S019 S035 S041 S042 · named views (nested): view_home_candle view_home_hand view_home_rain.
//
// World (metres, Y up). Main room interior x −2.5…2.5, z −2.0…2.0, floor y 0; granite walls 0.4 m; a side room continues
// the facade to z 4.6. Canonical interior camera looks −Z from the +Z side: WIFE on the screen-LEFT bench (x −0.62) facing
// right (+X), the empty bench screen-right (x +0.62), cracked-ice lattice window in the screen-right (east) wall, the door
// in the screen-left (west) wall at z 0.69–1.61. Outside the door: one granite step (top y −0.18), the yard (y −0.42),
// eaves overhang 0.72 m (drip line x −3.62 = the step's outer edge, where the bowl stands), lamp niche in the facade LEFT
// of the door (seen from outside, z 0.16–0.42), stone seat right of the door, low yard wall at z 8.6, the sea beyond.
// The S017 lab rig is a separate group at x +60 (lab window muntins, the restorer's true-mirror reflection, and a plate
// showing the home rendered into an RT by a second camera); the S041 vitrine glass hangs just in front of S019's camera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { createSea } from '../lib/sea.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
// ---- set dimensions
const WT = 2.56, RIDGE = 4.01, EAVE_X = 3.62, EAVE_Y = 2.2, ROOF_Z0 = -2.7, ROOF_Z1 = 4.9;
const DOOR = { z0: 0.69, z1: 1.61, y0: 0.10, y1: 2.05 }, DOOR_ZC = 1.15;
const WIN = { z0: -0.75, z1: 0.05, y0: 1.2, y1: 2.2 };
const NICHE = { z0: 0.16, z1: 0.42, y0: 1.16, y1: 1.44, d: 0.2 };
const YARD = -0.42, STEP_Y = -0.18;
const TABLE = { x: 0, z: 0, top: 0.82, s: 0.95 };
const BENCH_X = 0.62, BENCH_TOP = 0.45;
const BOWL_T = V3(0.17, TABLE.top, 0.02);       // on the table, before the empty bench (side A → −Z = frame top)
const CANDLE_T = V3(-0.07, TABLE.top, -0.03);
const BOWL_S = V3(-3.60, STEP_Y, 1.22);           // on the step's outer edge under the drip line, in front of the door
const SEAT = { x0: -3.24, x1: -2.9, z0: 2.2, z1: 2.64, top: 0.2 };
const LAB = V3(60, 1.3, 0);                        // S017 rig origin (camera)
// ---- palette (bible.json P-ids)
const P = { P01: 0x0E1B30, P02: 0x1A2D4A, P03: 0x2E4A6E, P04: 0xC8D2DB, P05: 0x8F9EAD, P06: 0xEDF1EF, P13: 0xE2A458, P14: 0xC67A35 };
const CANDLE_COL = 0xffa85a, LAMP_COL = 0xffa458;

// ---- shot timing (absolute song seconds from shots.json sync_points)
const T = { S016: 65.25, S017: 67.0, S019: 73.458, S035: 118.333, S041: 135.417, S042: 138.167 };

export default async function create(ctx) {
  const { cam, util } = ctx;
  const { clamp, lerp, smoothstep, ease } = util;
  const ks = (k, t, e = ease.inOutSine) => util.keys(k, t, e);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 3000);
  camera.userData.H = ctx.H;
  scene.background = new THREE.Color(0x020306);
  const fog = new THREE.FogExp2(0x1b2a42, 0.0); scene.fog = fog;
  const OFF = new Set((new URLSearchParams(location.search).get('ohoff') || '').split(',').filter(Boolean)); // perf A/B switches

  // ================================================================ helpers
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; if (parent) parent.add(m); return m; };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctex = (c, srgb = true, wrap = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  // world-space box UVs (u along the face's horizontal axis, v up), so textures run continuously across boxes
  function worldUV(geo, scale) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); }
      else if (az >= ay) { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
      else { u = p.getX(i); v = p.getZ(i); }
      uv.setXY(i, u / scale, v / scale);
    }
    uv.needsUpdate = true; return geo;
  }
  const boxAt = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // axis-aligned solid minus axis-aligned holes, by grid decomposition (cells whose centre is in a hole are dropped)
  function carve(b, holes) {
    const xs = new Set([b[0], b[1]]), ys = new Set([b[2], b[3]]), zs = new Set([b[4], b[5]]);
    for (const h of holes) { for (const v of [h[0], h[1]]) if (v > b[0] && v < b[1]) xs.add(v); for (const v of [h[2], h[3]]) if (v > b[2] && v < b[3]) ys.add(v); for (const v of [h[4], h[5]]) if (v > b[4] && v < b[5]) zs.add(v); }
    const X = [...xs].sort((a, c) => a - c), Y = [...ys].sort((a, c) => a - c), Z = [...zs].sort((a, c) => a - c), out = [];
    for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Y.length - 1; j++) for (let k = 0; k < Z.length - 1; k++) {
      const cx = (X[i] + X[i + 1]) / 2, cy = (Y[j] + Y[j + 1]) / 2, cz = (Z[k] + Z[k + 1]) / 2;
      if (holes.some((h) => cx > h[0] && cx < h[1] && cy > h[2] && cy < h[3] && cz > h[4] && cz < h[5])) continue;
      out.push(boxAt(X[i], X[i + 1], Y[j], Y[j + 1], Z[k], Z[k + 1]));
    }
    return out;
  }
  const merged = (geos, mat, parent, scale = 1.2, cast = true) => { for (const g of geos) worldUV(g, scale); const m = mesh(mergeGeometries(geos), mat, parent, 0, 0, 0, cast); return m; };
  function heightToNormal(h, W, H, k = 2) {
    const c = canvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = h[y * W + ((x - 1 + W) % W)], r = h[y * W + ((x + 1) % W)], t = h[((y - 1 + H) % H) * W + x], b = h[((y + 1) % H) * W + x];
      let nx = (l - r) * k, ny = (b - t) * k, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
      d[i * 4] = (nx * 0.5 + 0.5) * 255; d[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; d[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0); return ctex(c, false);
  }

  // ================================================================ procedural textures (deterministic)
  // cold rice (PROP_BOWL 当年状态): dry, half-translucent grains, no steam
  const riceTex = (() => {
    const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = util.rng(41), hgt = new Float32Array(S * S);
    g.fillStyle = '#d6d1c4'; g.fillRect(0, 0, S, S);
    const hc = canvas(S, S), hg = hc.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
    for (let i = 0; i < 3400; i++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, L = 34 + r() * 10, Wd = 13 + r() * 4, k = r();
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = 'rgba(70,64,56,0.22)'; g.beginPath(); g.ellipse(1.5, 2, L * 0.55, Wd * 0.62, 0, 0, Math.PI * 2); g.fill();
      const gr = g.createRadialGradient(-L * 0.12, -Wd * 0.15, 1, 0, 0, L * 0.55);
      const top = 228 + k * 18, edge = 196 + k * 16;
      gr.addColorStop(0, `rgb(${top},${top - 2},${top - 8})`); gr.addColorStop(0.7, `rgb(${edge + 8},${edge + 6},${edge})`); gr.addColorStop(1, `rgba(${edge - 10},${edge - 12},${edge - 18},0.9)`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * 0.5, Wd * 0.5, 0, 0, Math.PI * 2); g.fill();
      if (k > 0.7) { g.fillStyle = 'rgba(255,255,250,0.35)'; g.beginPath(); g.ellipse(-L * 0.15, -Wd * 0.12, L * 0.16, Wd * 0.12, 0, 0, Math.PI * 2); g.fill(); } // dry chalky tip
      g.restore();
      hg.save(); hg.translate(x, y); hg.rotate(a); const hr = hg.createRadialGradient(0, 0, 0, 0, 0, L * 0.5); hr.addColorStop(0, 'rgba(255,255,255,0.9)'); hr.addColorStop(1, 'rgba(255,255,255,0)'); hg.fillStyle = hr; hg.beginPath(); hg.ellipse(0, 0, L * 0.5, Wd * 0.5, 0, 0, Math.PI * 2); hg.fill(); hg.restore();
    }
    const hd = hg.getImageData(0, 0, S, S).data; for (let i = 0; i < S * S; i++) hgt[i] = hd[i * 4] / 255;
    return { map: ctex(c), normalMap: heightToNormal(hgt, S, S, 3.5) };
  })();
  // grey roof tiles: rounded cover-tile rows down the slope (canvas x = down-slope, y = along the ridge), lime-bedded joints
  const roofTex = (() => {
    const W = 512, H = 512, c = canvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data, N = TX.makeNoise(57), hgt = new Float32Array(W * H);
    const rows = 5, courses = 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, fy = (y / H) * rows % 1, fx = (x / W) * courses % 1, row = Math.floor(y / H * rows);
      const cover = Math.max(0, Math.cos((fy - 0.5) * Math.PI * 2.2)) ** 0.6;       // rounded cover tile (筒瓦)
      const lap = smoothstep(0.92, 1.0, (fx + 0.13 * N.n(row * 3.1, 0, 32, 32)) % 1);  // overlap edge of each course
      const n = N.fbm(x / W, y / H, 8, 4) * 0.5 + 0.5, lich = smoothstep(0.62, 0.8, N.fbm(x / W + 3, y / H, 4, 3) * 0.5 + 0.5);
      let v = 58 + 26 * cover - 30 * lap + 18 * (n - 0.5);
      const lime = cover < 0.06 ? 0.55 * smoothstep(0.5, 0.75, N.n(x / W * 64, y / H * 64, 64, 64) * 0.5 + 0.5) : 0;
      let rr = v * 0.98, gg = v, bb = v * 1.04;
      rr = lerp(rr, 150, lime); gg = lerp(gg, 146, lime); bb = lerp(bb, 136, lime);
      rr = lerp(rr, rr * 0.92 + 8, lich); gg = lerp(gg, gg * 0.95 + 10, lich); bb = lerp(bb, bb * 0.85, lich);
      d[i * 4] = rr; d[i * 4 + 1] = gg; d[i * 4 + 2] = bb; d[i * 4 + 3] = 255;
      hgt[i] = 0.55 * cover - 0.25 * lap + 0.05 * n;
    }
    g.putImageData(im, 0, 0);
    return { map: ctex(c), normalMap: heightToNormal(hgt, W, H, 6) };
  })();
  // moonlit night seen through the open lattice from inside (soft vertical gradient + faint cloud)
  const nightCard = (() => {
    const c = canvas(64, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#5d6f8c'); gr.addColorStop(0.55, '#8193b0'); gr.addColorStop(1, '#3a4660'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    return ctex(c, true, false);
  })();
  const crackCookie = TX.windowCookie({ pattern: 'crackedIce', size: 512, blur: 1.2, glass: 0, frame: 0.05, seed: 19 });

  // ================================================================ materials
  const M = {
    granite: TX.mat('granite', { color: 0xc8c2b8 }),
    graniteIn: TX.mat('granite', { color: 0x9a8f80 }),          // smoke-darkened inside
    graniteStep: TX.mat('granite', { tex: { rows: 2, seed: 33 }, color: 0xb4ada3 }),
    floor: TX.mat('tiles_clay', { repeat: [1, 1] }),
    camphor: TX.mat('camphor', { repeat: [1, 1] }),
    camphorTop: TX.mat('camphor', { repeat: [1, 1], tex: { planks: 4, seed: 6, wear: 0.7 }, color: 0x786a62, roughness: 1, normalScale: new THREE.Vector2(0.35, 0.35) }),
    bench: TX.mat('wood_home', { repeat: [1, 1], tex: { planks: 2, seed: 9 } }),
    beam: TX.mat('wood_beam', { repeat: [1, 1] }),
    boards: TX.mat('wood_smoke', { repeat: [1, 1], tex: { planks: 6, seed: 4 } }),
    door: TX.mat('wood_smoke', { repeat: [1, 1], tex: { planks: 4, joints: 0, seed: 7 } }),
    yard: TX.mat('granite', { repeat: [1, 1], tex: { rows: 4, seed: 44 }, color: 0x7a7c80 }),
    roof: std({ map: roofTex.map, normalMap: roofTex.normalMap, roughness: 0.82, color: 0xd8dade }),
    dark: std({ color: 0x15110e, roughness: 0.9 }),
  };
  for (const [k, s] of [['granite', 1.6], ['graniteIn', 1.6], ['graniteStep', 1.0], ['floor', 1.4], ['yard', 2.4], ['boards', 2.0], ['door', 1.2]]) { const m = M[k]; for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) t.repeat.set(1, 1); m.userData.uvScale = s; }
  M.roof.map.repeat.set(1, 1); M.roof.normalMap.repeat.set(1, 1);
  const porcelain = TX.mat('porcelain_bowl', { envMapIntensity: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.12 });
  const bowlGeo = TX.bowlGeometry();

  // ================================================================ groups
  const G = {
    house: new THREE.Group(), interior: new THREE.Group(), exterior: new THREE.Group(), lab: new THREE.Group(), glass41: new THREE.Group(), rain: new THREE.Group(),
  };
  for (const g of Object.values(G)) scene.add(g);
  G.lab.position.copy(LAB);

  // ================================================================ HOUSE shell
  const H = G.house;
  // west facade wall (door, outer lamp niche; S035 cheat niche cut into the +Z door reveal near the outer face)
  const westHoles = [
    [-3.0, -2.4, DOOR.y0, DOOR.y1, DOOR.z0, DOOR.z1],
    [-3.0, -2.9 + NICHE.d, NICHE.y0, NICHE.y1, NICHE.z0, NICHE.z1],
    [-2.88, -2.70, 1.16, 1.42, DOOR.z1 - 0.01, DOOR.z1 + 0.17],
  ];
  const wallsOut = [], wallsIn = [];
  for (const b of carve([-2.9, -2.5, YARD, WT, -2.4, 4.6], westHoles)) wallsOut.push(b);
  for (const b of carve([2.5, 2.9, YARD, WT, -2.4, 4.6], [[2.4, 3.0, WIN.y0, WIN.y1, WIN.z0, WIN.z1]])) wallsOut.push(b);
  wallsOut.push(boxAt(-2.5, 2.5, YARD, WT, -2.4, -2.0));
  const partition = boxAt(-2.5, 2.5, 0, WT + 0.2, 2.0, 2.4);
  // gables (north + south) and the partition gable
  const gable = (z0, z1) => { const s = new THREE.Shape([new THREE.Vector2(-2.9, WT), new THREE.Vector2(2.9, WT), new THREE.Vector2(0, RIDGE + 0.05)]); const gg = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); gg.translate(0, 0, z0); gg.computeVertexNormals(); return gg; };
  const nonIdx = (gg) => (gg.index ? gg.toNonIndexed() : gg);
  merged([...wallsOut, gable(-2.4, -2.0)].map(nonIdx), M.granite, H, 1.6);
  const southWall = merged([boxAt(-2.5, 2.5, YARD, WT, 4.2, 4.6), gable(4.2, 4.6)].map(nonIdx), M.granite, H, 1.6);   // hidden for S017's plate camera
  const partMesh = merged([partition, gable(2.0, 2.4)].map(nonIdx), M.graniteIn, H, 1.6);
  // inner wall skins (smoke-darkened) 2 cm proud of the inner faces so the interior reads darker than the facade
  {
    const skins = [];
    for (const b of carve([-2.52, -2.5, 0, WT, -2.0, 2.0], [[-2.6, -2.4, DOOR.y0, DOOR.y1, DOOR.z0, DOOR.z1]])) skins.push(b);
    for (const b of carve([2.5, 2.52, 0, WT, -2.0, 2.0], [[2.4, 2.6, WIN.y0, WIN.y1, WIN.z0, WIN.z1]])) skins.push(b);
    skins.push(boxAt(-2.5, 2.5, 0, WT, -2.02, -2.0), gable(-2.02, -2.0));
    G.interior.userData.skin = merged(skins.map((gg) => gg.index ? gg.toNonIndexed() : gg), M.graniteIn, G.interior, 1.6);
  }
  // threshold stone, floor, lintels
  merged([boxAt(-2.9, -2.5, YARD, DOOR.y0, DOOR.z0, DOOR.z1)], M.graniteStep, H, 1.0);
  merged([boxAt(-2.95, -2.45, DOOR.y1, DOOR.y1 + 0.16, DOOR.z0 - 0.12, DOOR.z1 + 0.12)], M.graniteStep, H, 1.0);   // granite lintel
  merged([boxAt(2.45, 2.95, WIN.y1, WIN.y1 + 0.12, WIN.z0 - 0.1, WIN.z1 + 0.1)], M.graniteStep, H, 1.0);
  const floor = mesh(new THREE.PlaneGeometry(5.0, 4.0), M.floor, G.interior, 0, 0.0, 0, false); floor.rotation.x = -Math.PI / 2;
  worldUV(floor.geometry, 1.4); // plane: normal +Z before rotation → uses (x, y); fine for a floor
  // roof: two slabs (tiles on top, smoked boards beneath), ridge roll, purlins and ridge beam inside
  const slope = Math.atan(0.5), slabW = Math.hypot(EAVE_X, RIDGE - EAVE_Y) + 0.06, slabL = ROOF_Z1 - ROOF_Z0;
  const roofTop = M.roof, roofUnder = M.boards;
  for (const sgn of [-1, 1]) {
    const g = new THREE.BoxGeometry(slabW, 0.1, slabL);
    // UVs: top face → tile courses (x down-slope, z along the ridge) in metres
    const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getY(i)) > 0.5 ? p.getX(i) * 1.0 : p.getZ(i) * 0.5, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) * 1.0 : p.getY(i) * 0.5);
    const m = new THREE.Mesh(g, [roofUnder, roofUnder, roofTop, roofUnder, roofUnder, roofUnder]);
    const cx = sgn * EAVE_X / 2, cy = (RIDGE + EAVE_Y) / 2;
    m.position.set(cx - sgn * Math.sin(slope) * 0.05 * 0, cy + 0.05 * Math.cos(slope), (ROOF_Z0 + ROOF_Z1) / 2);
    m.rotation.z = -sgn * slope; m.castShadow = m.receiveShadow = true; H.add(m);
  }
  {
    const ridge = mesh(new THREE.CylinderGeometry(0.09, 0.09, slabL + 0.1, 12), std({ color: 0x3e3f42, roughness: 0.8 }), H, 0, RIDGE + 0.12, (ROOF_Z0 + ROOF_Z1) / 2); ridge.rotation.x = Math.PI / 2;
    // eave fascia: a row of round tile ends (瓦当) along each eave edge
    const endG = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12); endG.rotateZ(Math.PI / 2);
    const mats = []; for (let z = ROOF_Z0 + 0.1; z < ROOF_Z1; z += 0.2) for (const sg of [-1, 1]) mats.push(new THREE.Matrix4().makeTranslation(sg * (EAVE_X + 0.01), EAVE_Y + 0.04, z));
    const ends = new THREE.InstancedMesh(endG, std({ color: 0x45474a, roughness: 0.85 }), mats.length); mats.forEach((m, i) => ends.setMatrixAt(i, m)); ends.castShadow = true; ends.receiveShadow = true; H.add(ends);
    // purlins (round timbers) under the roof, interior span only, + rafters seen under the eaves outside
    const purG = new THREE.CylinderGeometry(0.065, 0.07, 4.0, 10); purG.rotateX(Math.PI / 2);
    G.interior.userData.purlins = [-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((x) => mesh(purG, M.beam, G.interior, x, RIDGE - Math.abs(x) * 0.5 - 0.13, 0));
    const rafG = new THREE.BoxGeometry(0.06, 0.05, 0.05);
    const rm = []; for (let z = -2.6; z < 4.85; z += 0.42) for (const sg of [-1, 1]) for (let s = 0; s < 3; s++) { const x = sg * (2.95 + s * 0.24); rm.push(new THREE.Matrix4().compose(V3(x, RIDGE - Math.abs(x) * 0.5 - 0.02, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sg * slope)), V3(4.2, 1, 1))); }
    const rafters = new THREE.InstancedMesh(rafG, M.beam, rm.length); rm.forEach((m, i) => rafters.setMatrixAt(i, m)); rafters.castShadow = true; rafters.receiveShadow = true; H.add(rafters);
  }
  // door leaf (inward, hinged on the −Z jamb), half open; door frame posts
  const doorPivot = new THREE.Group(); doorPivot.position.set(-2.52, 0, DOOR.z0 + 0.02); H.add(doorPivot);
  {
    const leaf = mesh(new THREE.BoxGeometry(0.05, DOOR.y1 - DOOR.y0 - 0.02, DOOR.z1 - DOOR.z0 - 0.04), M.door, doorPivot, 0.025, (DOOR.y0 + DOOR.y1) / 2, (DOOR.z1 - DOOR.z0 - 0.04) / 2);
    worldUV(leaf.geometry, 1.2);
    for (const y of [0.45, 1.6]) mesh(new THREE.BoxGeometry(0.03, 0.08, DOOR.z1 - DOOR.z0 - 0.08), M.beam, doorPivot, 0.06, y, (DOOR.z1 - DOOR.z0) / 2);
    const ring = mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 16), std({ color: 0x2a2622, metalness: 0.6, roughness: 0.5 }), doorPivot, 0.09, 1.05, DOOR.z1 - DOOR.z0 - 0.15); ring.rotation.y = Math.PI / 2;
  }
  // big shell meshes only need to cast for the exterior moon (inside, the windowLight's blocker plane gates the moonlight and
  // nothing lies behind the walls for the candle) — dropping them from the interior shadow passes saves most of their cost
  const shell = []; G.house.traverse((o) => { if (o.isMesh || o.isInstancedMesh) shell.push(o); });
  shell.push(G.interior.userData.skin, ...G.interior.userData.purlins);
  // side-room shutter (closed) on the facade
  mesh(new THREE.BoxGeometry(0.05, 0.55, 0.6), M.door, H, -2.93, 1.35, 3.4);
  // lamp niche back (oil-stained) + the facade niche lamp (PROP_LAMP) and the S035 cheat lamp (reveal niche)
  const nicheBack = mesh(new THREE.PlaneGeometry(NICHE.z1 - NICHE.z0, NICHE.y1 - NICHE.y0), std({ color: 0x2c2620, roughness: 0.95 }), H, -2.9 + NICHE.d - 0.001, (NICHE.y0 + NICHE.y1) / 2, (NICHE.z0 + NICHE.z1) / 2, false); nicheBack.rotation.y = -Math.PI / 2;
  const lampOut = FX.oilLamp({ intensity: 0.35, seed: 11 }); lampOut.object3D.position.set(-2.82, NICHE.y0 + 0.003, (NICHE.z0 + NICHE.z1) / 2); lampOut.object3D.rotation.y = Math.PI; H.add(lampOut.object3D);
  const lampOutFlame = lampOut.object3D.children.slice(3).filter((o) => !o.isLight);
  lampOut.light.distance = 6;
  const lampIn = FX.oilLamp({ intensity: 0.012, seed: 12 }); lampIn.object3D.position.set(-2.79, 1.163, DOOR.z1 + 0.08); lampIn.object3D.rotation.y = Math.PI / 2; G.interior.add(lampIn.object3D);
  lampIn.light.distance = 5;

  // ================================================================ INTERIOR furniture & props
  const I = G.interior;
  const tableG = new THREE.Group(); tableG.position.set(TABLE.x, 0, TABLE.z); I.add(tableG);
  {
    const s = TABLE.s, t = 0.045, top = TABLE.top;
    const topM = mesh(new THREE.BoxGeometry(s, t, s), M.camphorTop, tableG, 0, top - t / 2, 0); worldUV(topM.geometry, 0.48);
    for (const [x, z, w, d] of [[0, s / 2 - 0.03, s - 0.06, 0.025], [0, -s / 2 + 0.03, s - 0.06, 0.025], [s / 2 - 0.03, 0, 0.025, s - 0.06], [-s / 2 + 0.03, 0, 0.025, s - 0.06]]) mesh(new THREE.BoxGeometry(w, 0.07, d), M.camphor, tableG, x, top - t - 0.035, z);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) mesh(new THREE.BoxGeometry(0.055, top - t, 0.055), M.camphor, tableG, x * (s / 2 - 0.045), (top - t) / 2, z * (s / 2 - 0.045));
    for (const [x, z, w, d] of [[0, s / 2 - 0.045, s - 0.1, 0.03], [0, -s / 2 + 0.045, s - 0.1, 0.03]]) mesh(new THREE.BoxGeometry(w, 0.03, d), M.camphor, tableG, x, 0.16, z);
  }
  const benchG = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); I.add(g);
    const L = 1.15, w = 0.19, t = 0.045;
    const top = mesh(new THREE.BoxGeometry(w, t, L), M.bench, g, 0, BENCH_TOP - t / 2, 0); worldUV(top.geometry, 1.0);
    for (const z of [-L / 2 + 0.12, L / 2 - 0.12]) for (const sx of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(0.04, BENCH_TOP - t, 0.05), M.bench, g, sx * 0.065, (BENCH_TOP - t) / 2, z); leg.rotation.z = sx * 0.09; }
    for (const z of [-L / 2 + 0.12, L / 2 - 0.12]) mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), M.bench, g, 0, 0.2, z);
    return g;
  };
  benchG(-BENCH_X); benchG(BENCH_X);
  // the bowl of cold rice + untouched chopsticks
  const bowlT = new THREE.Group(); bowlT.position.copy(BOWL_T); bowlT.rotation.y = Math.PI / 2; I.add(bowlT);
  {
    const b = mesh(bowlGeo, porcelain, bowlT); b.castShadow = true;
    // rice heap: lathe cap, slightly lumpy, top a little above the rim, edge tucked inside the rim
    const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16, r = 0.0705 * t; pts.push(new THREE.Vector2(r, TX.BOWL.H + 0.0005 - 0.0085 * t * t - 0.003 * t ** 6)); }
    const rg = new THREE.LatheGeometry(pts.reverse(), 64);
    const rp = rg.attributes.position, ruv = rg.attributes.uv, N = TX.makeNoise(8);
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), z = rp.getZ(i), y = rp.getY(i); const rr = Math.hypot(x, z); rp.setY(i, y + 0.0022 * N.fbm(x * 8 + 0.5, z * 8 + 0.5, 4, 3) * (rr / 0.07)); ruv.setXY(i, x / 0.15 + 0.5, z / 0.15 + 0.5); }
    rg.computeVertexNormals();
    const riceM = std({ map: riceTex.map, normalMap: riceTex.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.66, color: 0xffffff });
    riceM.map.wrapS = riceM.map.wrapT = THREE.ClampToEdgeWrapping;
    const rice = mesh(rg, riceM, bowlT); rice.castShadow = true;
    // chopsticks (pale bamboo #D2B27E desaturated), across the rim from screen lower-left to upper-right
    const chopM = std({ color: 0xc4a77a, roughness: 0.55 });
    const chopG = new THREE.CylinderGeometry(0.0034, 0.0021, 0.235, 8); chopG.rotateZ(Math.PI / 2);
    const chop = new THREE.Group(); chop.position.set(0, TX.BOWL.H + 0.0036, 0); chop.rotation.y = -Math.PI / 4; bowlT.add(chop);
    for (const dz of [-0.008, 0.008]) { const c = mesh(chopG, chopM, chop, 0.012, dz > 0 ? 0.0003 : 0, dz); c.rotation.y = dz * 0.9; }
    bowlT.userData.chop = chop;
  }
  // candle (PROP_CANDLE), brass stick with drip pan; pooled wax for state C
  const candle = FX.candle({ state: 'B', seed: 3, intensity: 0.34, castShadow: true });
  candle.object3D.position.copy(CANDLE_T); I.add(candle.object3D);
  for (const o of candle.object3D.children) if (o.isMesh && o.material.metalness === 1) { o.material = o.material.clone(); o.material.metalness = 0.35; o.material.roughness = 0.5; o.material.color.setHex(0xa88a5e); o.material.envMapIntensity = 1.2; }
  candle.light.shadow.mapSize.set(512, 512); candle.light.shadow.camera.far = 8;
  const waxPool = mesh(new THREE.CylinderGeometry(0.024, 0.027, 0.004, 20), std({ color: 0xE8DFC8, roughness: 0.5, emissive: 0x3a1c0a, emissiveIntensity: 0.2 }), candle.object3D, 0.006, 0.0095, 0.004);
  waxPool.scale.set(1, 1, 0.8);
  const waxDrip2 = mesh(new THREE.CapsuleGeometry(0.0019, 0.03, 4, 8), std({ color: 0xE8DFC8, roughness: 0.5 }), candle.object3D, -0.009, 0.035, 0.004);
  // low stool + sewing basket under the window (S035) and a little stand where she has moved the candle to sew
  const stool = new THREE.Group(); I.add(stool);
  {
    mesh(new THREE.BoxGeometry(0.36, 0.035, 0.26), M.bench, stool, 0, 0.30, 0);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) mesh(new THREE.BoxGeometry(0.035, 0.285, 0.035), M.bench, stool, x * 0.14, 0.142, z * 0.09);
  }
  const basket = new THREE.Group(); I.add(basket);
  {
    const bm = TX.mat('rattan', { repeat: [2, 0.6], tex: { seed: 21, age: 0.5 } });
    mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.12, 24, 1, true), bm, basket, 0, 0.06, 0).material.side = THREE.DoubleSide;
    mesh(new THREE.CircleGeometry(0.14, 24), bm, basket, 0, 0.004, 0).rotation.x = -Math.PI / 2;
    const cl = mesh(new THREE.SphereGeometry(0.1, 14, 8), TX.mat('cotton', { repeat: [0.5, 0.5], tex: { tone: [60, 72, 98], seed: 5 } }), basket, 0.02, 0.09, 0); cl.scale.set(1.2, 0.35, 1);
  }
  const stand = new THREE.Group(); I.add(stand);
  {
    mesh(new THREE.BoxGeometry(0.34, 0.03, 0.28), M.camphor, stand, 0, 0.5, 0);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) mesh(new THREE.BoxGeometry(0.03, 0.485, 0.03), M.camphor, stand, x * 0.14, 0.2425, z * 0.11);
  }
  // dressing: water jar with lid, shelf with jars, bamboo hat on a peg, broom, rice bucket
  {
    const glaze = std({ color: 0x3a2c22, roughness: 0.28, metalness: 0 });
    const jarPts = [[0, 0], [0.2, 0], [0.27, 0.12], [0.31, 0.35], [0.29, 0.55], [0.24, 0.64], [0.235, 0.66], [0.2, 0.66]].map(([r, y]) => new THREE.Vector2(r, y));
    mesh(new THREE.LatheGeometry(jarPts, 32), glaze, I, -2.05, 0, -1.55);
    mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 24), M.bench, I, -2.05, 0.675, -1.55);
    const shelf = mesh(new THREE.BoxGeometry(1.5, 0.035, 0.26), M.bench, I, -0.55, 1.55, -1.85);
    for (const x of [-1.2, 0.1]) mesh(new THREE.BoxGeometry(0.03, 0.2, 0.2), M.bench, I, x, 1.44, -1.9);
    const jarSmall = new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.07, 0.06], [0.06, 0.12], [0.035, 0.15], [0.04, 0.16], [0, 0.16]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    for (const [x, s, c] of [[-1.05, 1, 0x4a3a2c], [-0.8, 0.8, 0x6b5a46], [-0.25, 1.2, 0x3a2c22], [0.0, 0.7, 0x5a4636]]) { const j = mesh(jarSmall, std({ color: c, roughness: 0.35 }), I, x, 1.567, -1.85); j.scale.setScalar(s); }
    const bwS = mesh(bowlGeo, porcelain, I, -0.55, 1.567, -1.82); bwS.scale.setScalar(0.9); bwS.rotation.y = 0.6;
    const hat = mesh(new THREE.ConeGeometry(0.27, 0.12, 28, 1, true), TX.mat('rattan', { repeat: [3, 1], tex: { seed: 7, age: 0.6 } }), I, 1.55, 1.72, -1.94);
    hat.material.side = THREE.DoubleSide; hat.rotation.x = Math.PI / 2 - 0.25;
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), M.beam, I, 1.55, 1.8, -1.96).rotation.x = Math.PI / 2;
    const broom = new THREE.Group(); broom.position.set(2.3, 0, -1.8); broom.rotation.z = 0.12; I.add(broom);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), M.beam, broom, 0, 0.8, 0);
    mesh(new THREE.ConeGeometry(0.11, 0.35, 10), std({ color: 0x6e5a3a, roughness: 0.95 }), broom, 0, 0.17, 0).rotation.x = Math.PI;
    mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.3, 20), M.bench, I, 1.9, 0.15, 1.55);
  }
  // the lattice window (PROP / LOC lock): dark wood frame, open cracked-ice lattice, moonlit night beyond
  const winC = V3(2.7, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
  const winR = V3(0, 0, (WIN.z1 - WIN.z0) / 2), winU = V3(0, (WIN.y1 - WIN.y0) / 2, 0);
  {
    const fm = std({ color: 0x3A2A1E, roughness: 0.7 });
    for (const [y, h] of [[WIN.y0 + 0.025, 0.05], [WIN.y1 - 0.025, 0.05]]) mesh(new THREE.BoxGeometry(0.12, h, WIN.z1 - WIN.z0), fm, I, 2.62, y, winC.z);
    for (const z of [WIN.z0 + 0.025, WIN.z1 - 0.025]) mesh(new THREE.BoxGeometry(0.12, WIN.y1 - WIN.y0, 0.05), fm, I, 2.62, winC.y, z);
    const card = mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0), new THREE.MeshBasicMaterial({ map: nightCard, color: new THREE.Color(0.05, 0.06, 0.085) }), I, 2.86, winC.y, winC.z, false);
    card.rotation.y = -Math.PI / 2; card.receiveShadow = false;
  }
  // moonlight through the lattice: low east moon (cheat: elevation ~16°), a slight southward drift; second direction for S017's C plate
  const MOON_IN_A = V3(-0.95, -0.285, 0.12).normalize(), MOON_IN_C = V3(-0.95, -0.27, 0.165).normalize();
  const moonWL = FX.windowLight({ center: winC, right: winR, up: winU, dir: MOON_IN_A, cookie: crackCookie.map, color: 0xa6b8dc, intensity: 8.0, frameVisible: true, frameColor: 0x3A2A1E, bounce: 0.25, floorY: 0, mapSize: 1024 });
  I.add(moonWL.object3D);
  function setMoonIn(dir) { const L = moonWL.light; L.position.copy(winC).addScaledVector(dir, -25); L.target.position.copy(winC); L.target.updateMatrixWorld(); }
  const intHemi = new THREE.HemisphereLight(0x1a2438, 0x140d08, 0.06); I.add(intHemi);
  const tableBounce = new THREE.PointLight(0xffa868, 0.02, 2.5, 2); tableBounce.position.set(-0.05, 0.95, 0.2); I.add(tableBounce);   // warm bounce off the table top (fills the candle's own shadow on the drip pan)

  // ================================================================ EXTERIOR: yard, step, seat, low wall, sea, sky, props
  const E = G.exterior;
  {
    const yard = mesh(new THREE.PlaneGeometry(44, 20), M.yard, E, -9, YARD, -0.5, false); yard.rotation.x = -Math.PI / 2;
    const yu = yard.geometry.attributes.uv, yp = yard.geometry.attributes.position; for (let i = 0; i < yp.count; i++) yu.setXY(i, yp.getX(i) / 2.2, yp.getY(i) / 2.2);
    merged([boxAt(-3.68, -2.9, YARD, STEP_Y, 0.2, 3.1)], M.graniteStep, E, 1.0);
    // low granite rubble wall along the seaward (south) side of the yard, and a short return
    merged([boxAt(-30, 10, YARD, 0.62, 8.6, 9.05), boxAt(9.55, 10, YARD, 0.62, -6, 8.6)], M.granite, E, 1.2);
    const cliff = mesh(new THREE.PlaneGeometry(60, 8), M.dark, E, -10, -4.4, 9.5, false); cliff.rotation.x = 0.1;
    // props: water urn by the side room, a bucket, firewood stack, net-drying poles (silhouettes against the sea)
    const glaze = std({ color: 0x2f2620, roughness: 0.3 });
    const urn = mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.33, 0.2], [0.35, 0.42], [0.28, 0.66], [0.25, 0.7], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r, y)), 28), glaze, E, -3.45, YARD, 4.0);
    const bucket = mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 16), M.bench, E, -3.75, YARD + 0.15, 3.35);
    for (let k = 0; k < 9; k++) { const l = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 7), M.beam, E, -3.25, YARD + 0.06 + (k % 3) * 0.085, -1.3 + Math.floor(k / 3) * 0.09 + (k % 3) * 0.045); l.rotation.x = Math.PI / 2; l.rotation.z = Math.PI / 2; l.position.x = -3.2 - 0.02 * (k % 2); }
    const netM = new THREE.MeshStandardMaterial({ color: 0x3a3a34, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    for (const [x, z] of [[-9.5, 6.9], [-6.3, 7.6]]) mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.4, 6), M.beam, E, x, YARD + 1.2, z);
    const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.5, 6), M.beam, E, -7.9, YARD + 2.25, 7.25); bar.rotation.z = Math.PI / 2; bar.rotation.y = Math.atan2(0.7, 3.2);
    const net = mesh(new THREE.PlaneGeometry(3.0, 1.6, 12, 6), netM, E, -7.9, YARD + 1.45, 7.25, false); net.rotation.y = -Math.atan2(0.7, 3.2);
    { const np = net.geometry.attributes.position; for (let i = 0; i < np.count; i++) { const x = np.getX(i), y = np.getY(i); np.setZ(i, 0.12 * Math.sin(x * 2.1) * (0.8 - y) + 0.05 * Math.cos(y * 4)); np.setY(i, y - 0.08 * Math.cos(x * 1.0)); } net.geometry.computeVertexNormals(); }
  }
  // sky + sea (night, waning gibbous moon, gathering clouds); moon glow anchored at frame (0.80, 0.14) of S019's camera
  const CAM19 = { pos: V3(-13.0, 1.15, 0.4), target: V3(-3.2, 0.85, 4.2), mm: 32 };
  const moonDir19 = (() => { const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, CAM19.mm); cam.place(c, CAM19.pos, CAM19.target); c.updateMatrixWorld(); return V3(0.6, 0.72, 0.5).unproject(c).sub(c.position).normalize(); })();
  const MOON_AZ = Math.atan2(moonDir19.x, -moonDir19.z) / D2R, MOON_EL = Math.asin(moonDir19.y) / D2R;
  const SKY_CH1 = { preset: 'night', moonAz: MOON_AZ, moonElev: MOON_EL, moonSize: 0.0105, moonIntensity: 3.2, moonHalo: 0.45, stars: 0.35, cloudCover: 0.58, cloudDensity: 0.88, cloudScale: 0.085, wind: [-0.0035, 0.0008], exposure: 1.0 };
  const SKY_CH2 = { ...SKY_CH1, moonIntensity: 0.25, moonHalo: 0.32, stars: 0.0, cloudCover: 0.92, cloudDensity: 0.98, cloudScale: 0.07, cloudLit: ['#5d6984', 0.34], cloudDark: ['#161d30', 0.26], horizon: ['#1c2a44', 0.6], haze: ['#222c42', 0.45], hazeAmt: 0.15, wind: [-0.004, 0.001], exposure: 0.7 };
  const SKY_CH3 = { ...SKY_CH2, moonIntensity: 0.4, moonHalo: 0.35, cloudLit: ['#4c5670', 0.3], cloudDark: ['#121828', 0.24] };
  const sky = createSky(SKY_CH1); E.add(sky.object3D);
  const sea = createSea({ sky, swell: 'calm', windDir: 200, level: -5.5, cols: 96, rows: 64, foam: 0.1, defines: { NO_LAMP: '' } });
  E.add(sea.object3D);
  const envExtA = envTexture(ctx.renderer, 'moon_exterior', { sky: SKY_CH1 });
  const envExtB = envTexture(ctx.renderer, 'moon_exterior', { sky: SKY_CH2 });
  const envInt = envTexture(ctx.renderer, 'candle_interior', { moon: 0.8 });
  const envLab = envTexture(ctx.renderer, 'night_museum', { moon: 0.6 });
  // exterior lights
  const moonDirL = new THREE.DirectionalLight(0xc8d4e6, 0.55);
  // lighting cheat (director: moon position cheats approved): keep the visible moon's azimuth, raise the light to ~30° so the
  // yard and the low wall are moonlit (at the true 7.6° the low wall would shadow the whole yard)
  const moonLightDir = V3(moonDir19.x, 0, moonDir19.z).normalize().multiplyScalar(Math.cos(30 * D2R)).add(V3(0, Math.sin(30 * D2R), 0));
  moonDirL.position.copy(V3(-3.3, 0, 2.0)).addScaledVector(moonLightDir, 40); moonDirL.target.position.set(-3.3, 0, 2.0);
  moonDirL.castShadow = true; moonDirL.shadow.mapSize.set(2048, 2048);
  { const c = moonDirL.shadow.camera; c.left = -9; c.right = 9; c.top = 7; c.bottom = -7; c.near = 20; c.far = 70; }
  moonDirL.shadow.bias = -0.0004; moonDirL.shadow.normalBias = 0.02;
  E.add(moonDirL, moonDirL.target);
  const extHemi = new THREE.HemisphereLight(0x6f84aa, 0x1a1712, 0.3); E.add(extHemi);
  const yardBounce = new THREE.PointLight(0x9fb2d4, 1.2, 14, 2); yardBounce.position.set(-6.5, 0.6, 4.8); E.add(yardBounce);   // moonlit paving → facade
  const doorGlow = new THREE.PointLight(0xffa458, 0.45, 7, 2); doorGlow.position.set(-2.35, 1.05, 1.05); E.add(doorGlow);
  // interior seen through the door from outside: a candle glow on the far table (no shadow, cheap)
  const farCandle = FX.flameMesh({ width: 0.012, height: 0.03, seed: 5 }); farCandle.position.set(CANDLE_T.x, CANDLE_T.y + 0.135, CANDLE_T.z); E.add(farCandle);

  // ================================================================ FIGURES
  const wifeHi = await loadCharacter('WIFE', { lod: 'hi' });
  const wifeMid = await loadCharacter('WIFE', { lod: 'mid' });
  scene.add(wifeHi.root, wifeMid.root);
  let wife = wifeHi;
  const wifeHandL = await loadCharacterHand('WIFE', 'L', { lod: 'close', noBangle: true, noCuff: true });
  const wifeHandR = await loadCharacterHand('WIFE', 'R', { lod: 'close', noCuff: true });
  for (const [s, h] of [['L', wifeHandL], ['R', wifeHandR]]) { const old = wifeHi.hands[s], bone = old.root.parent; h.root.position.copy(old.root.position); h.root.quaternion.copy(old.root.quaternion); h.root.scale.copy(old.root.scale); bone.remove(old.root); bone.add(h.root); wifeHi.hands[s] = h; h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  const child = await loadCharacter('CHILD', { lod: 'hi' });
  scene.add(child.root);
  {
    const CP = child.P, len = CP.kneeY - CP.ankleY, tm = new THREE.MeshStandardMaterial({ color: 0x2C2925, roughness: 0.95, side: THREE.DoubleSide });
    for (const sd of ['L', 'R']) { const g = new THREE.CylinderGeometry(CP.calfR * 1.5, CP.calfR * 1.75, len * 0.86, 14, 1, true); const m = new THREE.Mesh(g, tm); m.position.set(0, -len * 0.47, 0); m.castShadow = true; m.receiveShadow = true; child.bone(`leg${sd}.lower`).add(m); }
  }
  const ghost = await loadCharacter('RESTORER', { lod: 'mid' });
  G.lab.add(ghost.root);
  const gloveR = await loadCharacterHand('RESTORER', 'R', { lod: 'close' });
  const gloveTwin = await loadCharacterHand('RESTORER', 'L', { lod: 'close' });
  G.glass41.add(gloveR.root, gloveTwin.root);
  const woolM = TX.mat('wool_coat', { repeat: [1.2, 1.2] });
  for (const h of [gloveR, gloveTwin]) { const sl = mesh(new THREE.CylinderGeometry(0.047, 0.056, 0.34, 24, 1, true), woolM, h.root, 0, 0.21, 0); sl.material = woolM.clone(); sl.material.side = THREE.DoubleSide; }
  // the ghost and the twin are faint additive images (true mirror reflections of the present)
  const ghostMats = [];
  ghost.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = true; m.premultipliedAlpha = false; ghostMats.push(m); } } });
  const fadeMats = (root) => { const out = []; root.traverse((o) => { if (o.isMesh) { o.castShadow = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.transparent = true; out.push(m); } } }); return out; };
  const gloveMats = fadeMats(gloveR.root), twinMats = fadeMats(gloveTwin.root);
  for (const m of twinMats) { m.blending = THREE.AdditiveBlending; m.depthWrite = false; }

  // ---- props held / used by the wife: the step bowl (empty), the indigo cuff + patch, needle, thread, thimble
  const bowlS = new THREE.Group(); scene.add(bowlS);
  mesh(bowlGeo, porcelain, bowlS).castShadow = true;
  const cuffG = new THREE.Group(); scene.add(cuffG);
  {
    // the navigator's jacket sleeve end turned inside out: indigo outside, the pale-blue patch with running stitches inside
    const ind = TX.mat('indigo', { repeat: [0.6, 0.6], tex: { seed: 3 } }); ind.side = THREE.DoubleSide;
    const tube = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.16, 24, 1, true, 0, Math.PI * 1.55), ind, cuffG, 0, 0, 0); tube.rotation.z = Math.PI / 2;
    const sag = mesh(new THREE.PlaneGeometry(0.22, 0.14, 8, 4), ind, cuffG, 0.12, -0.03, 0.0); sag.rotation.x = -1.2; // the rest of the sleeve draped over her lap
    const pc = canvas(256, 256), pg = pc.getContext('2d'); pg.fillStyle = '#7D9CBB'; pg.fillRect(0, 0, 256, 256);
    const N = TX.makeNoise(4); const id = pg.getImageData(0, 0, 256, 256), dd = id.data; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 4, k = 0.9 + 0.12 * N.n(x / 8, y / 2, 32, 128) + 0.05 * N.n(x / 2, y / 8, 128, 32); dd[i] *= k; dd[i + 1] *= k; dd[i + 2] *= k; } pg.putImageData(id, 0, 0);
    pg.strokeStyle = '#E9E4D6'; pg.lineWidth = 3; pg.setLineDash([10, 9]); pg.strokeRect(14, 14, 228, 228); pg.setLineDash([]); pg.beginPath(); pg.arc(232, 236, 5, 0, 7); pg.stroke(); pg.beginPath(); pg.arc(238, 228, 4, 0, 7); pg.stroke();
    const patch = mesh(new THREE.PlaneGeometry(0.045, 0.06), std({ map: ctex(pc, true, false), roughness: 0.9, side: THREE.DoubleSide }), cuffG, -0.02, 0.0, 0.051, false);
    patch.rotation.y = 0.1; patch.rotation.z = Math.PI / 2;
    cuffG.userData.patch = patch;
  }
  const needle = mesh(new THREE.CylinderGeometry(0.0005, 0.0003, 0.04, 5), std({ color: 0xd8dadc, metalness: 1, roughness: 0.2 }), null);
  const threadM = new THREE.LineBasicMaterial({ color: 0xE9E4D6 });
  const threadGeo = new THREE.BufferGeometry().setFromPoints([V3(), V3()]); const thread = new THREE.Line(threadGeo, threadM); thread.frustumCulled = false; scene.add(thread);
  const thimble = mesh(new THREE.CylinderGeometry(0.0085, 0.009, 0.012, 14, 1, true), std({ color: 0x9A7D4E, metalness: 1, roughness: 0.45, side: THREE.DoubleSide }), null);
  const needleHolder = new THREE.Group(); needleHolder.add(needle); needle.position.set(0, 0.012, 0); wifeHi.hold('R', needleHolder, { socket: 'pinch' });
  wifeHandL.fingerBones.middle[1].add(thimble); thimble.position.set(0, -0.012, 0);

  // ================================================================ LAB RIG (S017): lab window section + true-mirror reflection + home plate
  const RT_W = 640, RT_H = 268;
  const rtA = ctx.makeRT(RT_W, RT_H), rtB = ctx.makeRT(RT_W, RT_H);
  const homeCam = new THREE.PerspectiveCamera(30, RT_W / RT_H, 0.05, 60);
  const plateMat = new THREE.ShaderMaterial({
    uniforms: { tA: { value: rtA.texture }, tB: { value: rtB.texture }, mixAmt: { value: 0 }, gain: { value: 1.5 }, uT: { value: 0 }, uNoise: { value: TX.noiseTexture() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform sampler2D tA, tB, uNoise; uniform float mixAmt, gain, uT;
      void main(){ vec2 w = (texture2D(uNoise, vUv * vec2(1.7, 0.6) + vec2(0.0, uT * 0.002)).rg - 0.5) * 0.004; // old-glass waviness
        vec3 a = texture2D(tA, vUv + w).rgb, b = texture2D(tB, vUv + w).rgb;
        vec3 c = mix(a, b, mixAmt) * gain; c = c * vec3(0.96, 0.98, 1.04) + vec3(0.002, 0.003, 0.006); // a reflection in dark glass: slightly cooled, lifted blacks
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const PLATE_Z = -12;
  const plate = mesh(new THREE.PlaneGeometry(1, 1), plateMat, G.lab, 0, 0, PLATE_Z, false); plate.receiveShadow = false;
  {
    const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, 75);
    const hh = Math.tan(c.fov * D2R / 2) * -PLATE_Z * 1.08; plate.scale.set(hh * 2 * 2.39, hh * 2, 1);
  }
  const GLASS_Z = -2.1;
  const GHOST_HEAD = (() => { const c = new THREE.PerspectiveCamera(30, 2.39, 0.05, 100); cam.lens(c, 75); cam.place(c, LAB, LAB.clone().add(V3(0, 0, -1))); c.updateMatrixWorld(); const r = V3(0.63 * 2 - 1, 1 - 0.40 * 2, 0.5).unproject(c).sub(c.position).normalize(); return LAB.clone().addScaledVector(r, 6.2 / -r.z).sub(LAB); })();
  {
    const white = std({ color: 0xE3DED3, roughness: 0.55 });
    mesh(new THREE.BoxGeometry(0.022, 1.4, 0.04), white, G.lab, -0.33, 0, GLASS_Z + 0.02);           // vertical muntin
    mesh(new THREE.BoxGeometry(2.0, 0.022, 0.04), white, G.lab, 0, 0.142, GLASS_Z + 0.02);            // glazing bar
    mesh(new THREE.BoxGeometry(2.0, 0.05, 0.06), white, G.lab, 0, 0.232, GLASS_Z + 0.05);             // meeting rail (upper sash in front)
    mesh(new THREE.BoxGeometry(2.0, 0.09, 0.08), white, G.lab, 0, -0.27, GLASS_Z + 0.04);             // bottom rail (just below frame)
    // dust / smudges on the glass, lit by the lamp (faint additive)
    const sm = TX.glassSmudge({ seed: 23, prints: 3, wipes: 2, dust: 0.6 });
    const dust = mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: sm.map, color: new THREE.Color(0.05, 0.042, 0.032), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), G.lab, 0, 0, GLASS_Z + 0.002, false);
    dust.renderOrder = 30;
    const lampRefl = FX.glow({ color: 0xffd0a0, size: 0.9, intensity: 0.05, falloff: 1.6 }); lampRefl.object3D.position.set(-0.62, 0.3, GLASS_Z - 1.4); G.lab.add(lampRefl.object3D);
    // far harbour lights (transmitted through the glass, very dim)
    for (const [x, y, s, c] of [[-1.9, -0.25, 0.09, 0xffc890], [2.3, -0.32, 0.07, 0xffd8b0], [1.1, -0.38, 0.05, 0xb8c8e0], [-2.6, -0.4, 0.06, 0xffc890]]) { const g = FX.glow({ color: c, size: s, intensity: 0.12, falloff: 2.5 }); g.object3D.position.set(x, y, -10); G.lab.add(g.object3D); }
  }
  const labLamp = new THREE.SpotLight(0xffd6ae, 4.0, 6, 0.6, 0.8, 2); labLamp.position.set(-1.0, 1.2, 0.6); labLamp.target.position.set(0, 0, GLASS_Z); G.lab.add(labLamp, labLamp.target);
  const ghostKey = new THREE.SpotLight(0xffd2a0, 1.6, 3.0, 0.5, 0.7, 2); ghostKey.position.set(-0.85, 0.55, -2.45); G.lab.add(ghostKey, ghostKey.target);
  const labHemi = new THREE.HemisphereLight(0x223048, 0x0a0806, 0.15); G.lab.add(labHemi);

  // ================================================================ S041 vitrine-glass layer (G3c, modern) in front of S019's camera
  const dir19 = CAM19.target.clone().sub(CAM19.pos).normalize();
  const GL41_D = 0.72;                                       // glass plane distance ahead of S019's camera position
  const glassMat41 = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { k: { value: 0.85 }, dustK: { value: 1 }, uNoise: { value: TX.noiseTexture() }, uSm: { value: TX.glassSmudge({ seed: 31, prints: 2, wipes: 1, dust: 0.7 }).map } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform float k, dustK; uniform sampler2D uNoise, uSm;
      void main(){
        vec2 p = vUv;
        vec3 velvet = vec3(0.006, 0.008, 0.013);
        // the open rattan case and the faded violet stamp far behind the glass, deeply defocused (soft blobs)
        float caseG = exp(-pow(length((p - vec2(0.63, 0.47)) * vec2(5.5, 9.0)), 2.0));
        float stamp = exp(-pow(length((p - vec2(0.60, 0.50)) * vec2(14.0, 26.0)), 2.0));
        float edge = smoothstep(0.035, 0.0, p.y) * 0.6 + smoothstep(0.03, 0.0, 1.0 - p.x) * 0.4;     // moon-silver highlight along the pane edge
        vec3 col = velvet + vec3(0.20, 0.13, 0.065) * caseG * 0.22 + vec3(0.10, 0.08, 0.13) * stamp * 0.22 + vec3(0.09, 0.1, 0.12) * edge;
        vec4 sm = texture2D(uSm, p * vec2(1.6, 0.8));
        col += vec3(0.05, 0.055, 0.065) * (sm.r * 0.4 + sm.b * 0.8) * dustK;   // dust & smudge catching the gallery light
        gl_FragColor = vec4(col, k); }`,
  });
  const glass41 = mesh(new THREE.PlaneGeometry(1.6, 0.8), glassMat41, G.glass41, 0, 0, 0, false); glass41.renderOrder = 60;
  glass41.position.copy(CAM19.pos).addScaledVector(dir19, GL41_D); glass41.lookAt(CAM19.pos);
  const gl41Key = new THREE.SpotLight(0xffd2a0, 3.2, 3, 0.7, 0.8, 2); G.glass41.add(gl41Key, gl41Key.target);

  // ================================================================ RAIN (view_home_rain; CH3)
  const lampOutWorld = lampOut.object3D.localToWorld(V3(0.043, 0.06, 0));
  const dripPts = []; for (let z = -2.6; z < 4.8; z += 0.13) dripPts.push([-EAVE_X - 0.005, EAVE_Y - 0.02, z + 0.03 * Math.sin(z * 7)]);
  const drips = FX.drips({ points: dripPts, toY: STEP_Y, period: [0.35, 0.9], size: 0.0035, intensity: 0.5, lamp: { position: lampOutWorld, color: 0xE2A458, intensity: 1.6 } });
  G.rain.add(drips.object3D);
  const rainFx = FX.rain({ center: [-7, 1.2, 1.5], size: [7.0, 3.6, 9], count: 5200, speed: 7.0, wind: [0.4, 0.15], intensity: 0.22, lamp: { position: lampOutWorld, color: 0xE2A458, intensity: 2.2 } });
  G.rain.add(rainFx.object3D);
  const water = FX.ripples({ radius: 0.034, sources: [{ x: 0, z: 0, period: 1.35, offset: 207.07 }, { x: 0.012, z: -0.01, period: 0.83, offset: 0.3 }, { x: -0.014, z: 0.008, period: 1.1, offset: 0.7 }], rainRate: 0, color: 0x0c1420, strength: 1.4 });
  water.object3D.position.set(0, 0.0175, 0); bowlS.add(water.object3D);
  const drop = mesh(new THREE.SphereGeometry(0.0032, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.8) }), G.rain, 0, 0, 0, false); drop.scale.set(1, 2.2, 1);
  const crownG = new THREE.Group(); G.rain.add(crownG);
  const crownDrops = []; for (let k = 0; k < 12; k++) { const d = mesh(new THREE.SphereGeometry(0.0016, 6, 5), drop.material, crownG, 0, 0, 0, false); crownDrops.push(d); }

  // ================================================================ light sets + modes
  const LIGHTS = {
    int: [candle.object3D, moonWL.object3D, intHemi, tableBounce, lampIn.object3D],
    ext: [moonDirL, extHemi, doorGlow, lampOut.object3D, yardBounce],
    lab: [labLamp, ghostKey, labHemi],
  };
  const allLightHolders = [...LIGHTS.int, ...LIGHTS.ext, ...LIGHTS.lab];
  function mode(m, o = {}) {
    const isInt = m === 'int', isExt = m === 'ext', isLab = m === 'lab';
    G.house.visible = !isLab; G.interior.visible = isInt || (isExt && !!o.seeInside); G.exterior.visible = isExt; G.lab.visible = isLab;
    G.glass41.visible = isExt && !!o.glass41; G.rain.visible = isExt && !!o.rain;
    for (const l of allLightHolders) l.visible = false;
    for (const l of LIGHTS[m]) l.visible = true;
    // the interior group is reused from outside (through the door) without its own lights
    if (isExt && o.seeInside) for (const l of LIGHTS.int) l.visible = false;
    partMesh.visible = !o.noPartition; southWall.visible = !o.noPartition;
    for (const m of shell) m.castShadow = isExt;
    // light economy (each light / shadow pass costs on every lit pixel): per-shot switches
    candle.light.castShadow = isInt && o.candleShadow !== false;
    if (moonWL.bounce) moonWL.bounce.visible = isInt && o.bounce !== false;
    tableBounce.visible = isInt && o.bounce !== false;
    lampIn.light.visible = false;                                   // the reveal-niche lamp reads by its flame alone
    moonDirL.castShadow = isExt && o.moonShadow !== false;
    sky.object3D.visible = isExt && o.sky !== false; sea.object3D.visible = isExt && o.sea !== false;
    lampIn.object3D.visible = isInt && !!o.lampIn;
    farCandle.visible = isExt;
    wife = o.wife === 'mid' ? wifeMid : wifeHi;
    wifeHi.root.visible = o.wife !== false && o.wife !== 'mid'; wifeMid.root.visible = o.wife === 'mid'; child.root.visible = !!o.child; bowlS.visible = isExt && o.bowlS !== false; cuffG.visible = isInt && !!o.sew;
    needle.visible = thread.visible = thimble.visible = !!o.sew; stand.visible = isInt && !!o.sew;
    bowlT.visible = isInt && o.bowlT !== false;
    candle.object3D.position.copy(CANDLE_T);
    scene.environment = isInt ? envInt : isExt ? (o.env || envExtA) : envLab;
    scene.environmentIntensity = isInt ? 0.55 : isExt ? 0.6 : 0.5;
    scene.background.setHex(isExt ? 0x020306 : 0x010102);
    fog.density = isExt ? 0.006 : 0.0; fog.color.setHex(0x1b2638);
    if (isExt) sky.update(ctx.T);
  }
  // candle state (B 11 cm → C 6 cm) with matching wax extras
  function setCandle(st, T) { candle.setState(st); waxPool.visible = st === 'C' || st === 'D'; waxDrip2.visible = st !== 'A'; candle.update(T, { intensity: 0.34 }); }

  // ================================================================ WIFE poses (pure functions of time)
  const DOWN = V3(0, -1, 0);
  function settleFeet(fig, groundY) {           // shift the root so the lower ankle sits at its standing height above groundY
    fig.root.updateMatrixWorld(true);
    const aL = fig.worldPos('legL.foot'), aR = fig.worldPos('legR.foot');
    const lo = Math.min(aL.y, aR.y), want = groundY + fig.P.ankleY;
    fig.root.position.y += want - lo; fig.root.updateMatrixWorld(true);
  }
  // as settleFeet, and also slide the root horizontally so the feet's midpoint lands at (fx, fz)
  function settleFeetAt(fig, groundY, fx, fz) {
    settleFeet(fig, groundY);
    const aL = fig.worldPos('legL.foot'), aR = fig.worldPos('legR.foot');
    fig.root.position.x += fx - (aL.x + aR.x) / 2; fig.root.position.z += fz - (aL.z + aR.z) / 2; fig.root.updateMatrixWorld(true);
  }
  // seated on the left bench, upright, hands folded on the table edge (left over right, bangle up)
  function wifeAtTable(T0, { breath = 1, sigh = 0, lean = 0, look = null } = {}) {
    wife.root.position.set(-BENCH_X - 0.035, 0, TABLE.z + 0.09); wife.root.rotation.set(0, Math.PI / 2, 0);
    wife.pose('sit_bench', { seat: BENCH_TOP + 0.005, feet: 0.1, lean: 0.0, hands: 'none' });
    wife.pose({ 'spine.x': -0.04 + lean * 0.5, 'chest.x': -0.03 + lean * 0.4, 'neck.x': 0.16, 'head.x': 0.14, 'head.y': 0.06 }, { add: true });
    if (sigh) { wife.pose({ 'chest.x': -0.035 * sigh, 'armL.clav.z': 0.07 * sigh, 'armR.clav.z': 0.07 * sigh, 'head.x': -0.03 * sigh }, { add: true }); }
    wife.root.updateMatrixWorld(true);
    wife.breathe(T0, breath, 0.2);
  }
  // hands folded on the table edge: right hand flat, fingers toward her left; left hand over it, fingers toward her right
  function foldedHands() {
    const x = -TABLE.s / 2 + 0.075;
    wife.reach('R', V3(x, TABLE.top + 0.024, TABLE.z + 0.155), { palm: DOWN, fingers: V3(0.12, -0.08, -1).normalize(), elbowOut: 0.2 });
    wife.hands.R.pose('relaxed', { curl: 0.3 });
    wife.reach('L', V3(x + 0.012, TABLE.top + 0.05, TABLE.z - 0.065), { palm: DOWN, fingers: V3(0.12, -0.18, 1).normalize(), elbowOut: 0.2 });
    wife.hands.L.pose('relaxed', { curl: 0.4 });
  }

  // ---- exterior state per weather (CH1: dry, gathering cloud, moon in and out · CH2: heavier low cloud, damp, moon glow only
  // · CH3: rain). The interior is seen through the half-open door, lit only by a warm spill light and the far candle.
  const farGlow = FX.glow({ color: 0xffa050, size: 0.14, intensity: 0.55, falloff: 2.4 }); E.add(farGlow.object3D);
  const roomGlow = (() => { const c = canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(40, 36, 2, 32, 32, 34); gr.addColorStop(0, 'rgba(255,190,120,1)'); gr.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return ctex(c, true, false); })();
  const doorCard = mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: roomGlow, color: new THREE.Color(0.05, 0.03, 0.016), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), E, -1.6, 0.95, 0.6, false);
  doorCard.rotation.y = -Math.PI / 2 + 0.25;   // the warm candle-lit room as seen through the door (cheap stand-in for the interior light)
  const yardRough0 = 1.0;
  function exterior(T0, ch, tl, o = {}) {
    mode('ext', { seeInside: true, wife: o.wife || 'mid', child: o.child, glass41: o.glass41, rain: o.rain, env: ch === 'ch1' ? envExtA : envExtB, moonShadow: ch === 'ch1', sky: o.sky, sea: o.sea });
    sky.set(ch === 'ch1' ? SKY_CH1 : ch === 'ch2' ? SKY_CH2 : SKY_CH3); sky.update(T0);
    let mI = ch === 'ch1' ? 0.75 : ch === 'ch2' ? 0.16 : 0.06;
    if (ch === 'ch1') { const dip = Math.sin(clamp((T0 - T.S019 - 0.3) / 1.0) * Math.PI); mI *= 1 - 0.3 * dip; sky.uniforms.uMoonIntensity.value = SKY_CH1.moonIntensity * (1 - 0.65 * dip); sky.uniforms.uMoonHalo.value = SKY_CH1.moonHalo * (1 + 0.6 * dip); }
    moonDirL.intensity = mI;
    extHemi.intensity = ch === 'ch1' ? 0.32 : ch === 'ch2' ? 0.42 : 0.3;
    yardBounce.intensity = ch === 'ch1' ? 1.4 * (mI / 0.75) : ch === 'ch2' ? 0.5 : 0.25;
    doorGlow.intensity = 1.6 * util.flicker(T0, 9);
    const damp = ch === 'ch1' ? 0 : ch === 'ch2' ? 0.55 : 1;
    M.yard.roughness = yardRough0 - 0.45 * damp; M.graniteStep.roughness = 1 - 0.5 * damp;
    M.yard.color.setScalar(1 - 0.25 * damp); M.graniteStep.color.setHex(0xb4ada3).multiplyScalar(1 - 0.2 * damp);
    fog.density = ch === 'ch1' ? 0.006 : 0.012; fog.color.setHex(ch === 'ch1' ? 0x1b2638 : 0x1e2533);
    // the candle on the table, seen through the door (state C on PRE1/CH1 nights, the stub D later)
    const fy = 0.012 + (ch === 'ch1' ? 0.06 : 0.025) + 0.006;
    farCandle.position.set(CANDLE_T.x, CANDLE_T.y + fy, CANDLE_T.z); farCandle.material.uniforms.uT.value = T0;
    farGlow.object3D.position.copy(farCandle.position).add(V3(0, 0.015, 0)); farGlow.set(0.55 * util.flicker(T0, 3));
    setCandle(ch === 'ch1' ? 'C' : 'D', T0); candle.object3D.position.copy(CANDLE_T);
    bowlS.position.copy(BOWL_S); bowlS.rotation.set(0, Math.PI / 2 + 0.4, 0);
    water.object3D.visible = ch === 'ch3';
  }
  function lampLit(on) { for (const o of lampOutFlame) o.visible = on; lampOut.light.visible = true; if (!on) lampOut.light.intensity = 0; }

  // ---- S019: she has bent to set the bowl on the step's outer edge (contact 0.72 s, palm lifts 1.14 s)
  function wifePlaceBowl(tl, T0) {
    const W = wife;
    W.root.position.set(-3.16, STEP_Y, 1.40); W.root.rotation.set(0, -Math.PI / 2 - 0.3, 0);
    W.pose('stand', { weight: 0.2 });
    const hb = 0.95;  // pelvis tilt; thighs flex by hb + their own world angle so the knees stay forward of the feet
    W.pose({ 'hips.x': hb, 'spine.x': 0.3, 'chest.x': 0.25, 'neck.x': 0.02, 'head.x': 0.2,
      'legL.upper.x': hb + 0.62, 'legR.upper.x': hb + 0.42, 'legL.lower.x': 1.15, 'legR.lower.x': 0.8, 'legL.foot.x': 0.5, 'legR.foot.x': 0.36, 'legL.upper.z': 0.08, 'legR.upper.z': 0.06 }, { add: true });
    W.root.updateMatrixWorld(true); settleFeetAt(W, STEP_Y, -3.14, 1.42); W.breathe(T0, 0.8);
    const lower = ease.inOutSine(clamp(tl / 0.72)), settle = tl > 0.72 ? 0.004 * Math.exp(-(tl - 0.72) * 18) * Math.sin((tl - 0.72) * 40) : 0;
    const h = 0.10 * (1 - lower) + Math.max(0, settle);
    bowlS.position.copy(BOWL_S).add(V3(0, h, 0)); bowlS.updateMatrixWorld(true);
    const lift = ease.inOutSine(clamp((tl - 1.14) / 0.2));
    const rim = bowlS.localToWorld(V3(0, TX.BOWL.H, 0)).add(V3(0.075, 0, 0.0));
    const wrist = rim.clone().add(V3(0.06 + 0.02 * lift, 0.06 + 0.08 * lift, 0.0));
    W.reach('R', wrist, { palm: V3(-0.6, -0.8, 0).normalize(), fingers: V3(-0.55, -0.8, 0.1).normalize(), elbowOut: 0.3 });
    W.hands.R.pose('cupped');
    const knee = W.worldPos('legL.lower');
    W.reach('L', knee.clone().add(V3(-0.05, 0.07, 0.02)), { palm: DOWN, fingers: V3(-0.8, -0.5, 0.1).normalize(), elbowOut: 0.4 });
    W.hands.L.pose('relaxed', { curl: 0.6 });
  }
  // ---- S041/S042: seated on the doorstone (threshold), feet on the step, looking out toward the sea (screen right)
  function wifeOnDoorstone(T0, { breathAt = null } = {}) {
    const W = wife;
    W.root.position.set(-2.78, STEP_Y, 1.47); W.root.rotation.set(0, -Math.PI / 2 + 0.2, 0);
    W.pose('sit_bench', { seat: 0.285, feet: 0.05, lean: 0.22, hands: 'knees' });
    W.pose({ 'neck.y': 0.22, 'head.y': 0.3, 'head.x': 0.08 }, { add: true });
    W.root.updateMatrixWorld(true);
    const b = breathAt ? Math.exp(-(((T0 - breathAt) / 0.7) ** 2)) : 0;
    W.breathe(T0, 0.9 + 2.2 * b, 0.22);
  }
  // ---- S042: the child's bare feet step out of the doorway and settle between the bowl and her shoe; toes wiggle at 1.5 s
  function childFeet(tl, T0) {
    const C = child, a = smoothstep(0.62, 1.12, tl);
    const P0 = V3(-2.66, DOOR.y0, 1.12), P1 = V3(-3.40, STEP_Y, 1.33);
    const p = P0.clone().lerp(P1, a);
    const down = smoothstep(0.35, 0.8, a);
    p.y = lerp(DOOR.y0, STEP_Y, down) + 0.035 * Math.sin(Math.PI * clamp((a - 0.3) / 0.55));
    C.root.position.copy(p); C.root.rotation.set(0, -Math.PI / 2 - 0.25 + 0.25 * a, 0);
    if (a < 0.999) C.pose('walk', { phase: (a * 1.25) % 1, stride: 0.75 * (1 - a * 0.6) });
    else C.pose('stand', { weight: -0.2 });
    const w = Math.exp(-(((tl - 1.52) / 0.12) ** 2));
    C.pose({ 'legL.foot.x': -0.14 * w, 'legR.foot.x': -0.1 * w * Math.sin(tl * 30) }, { add: true });
    C.root.updateMatrixWorld(true);
    settleFeet(C, a > 0.7 ? STEP_Y : DOOR.y0 + (STEP_Y - DOOR.y0) * down);
    C.breathe(T0, 1.0, 0.35);
  }
  // ---- S035: mending the patch on the low stool under the window
  const C35 = { pos: V3(2.3, 0.78, -0.25), target: V3(0.347, 0.908, 0.164) };
  const S35 = { x: 1.05, z: -0.95 }, MOON_S35 = V3(-0.95, -0.27, -0.26).normalize();
  const C42 = { pos: V3(-3.88, -0.11, 1.35), target: V3(-1.882, -0.027, 1.312) };
  const CHAND = { pos: V3(0.62, 1.16, 0.62), target: V3(0.12, 0.88, 0.06) }, CRAIN = { pos: V3(-6.0, 0.62, 2.55), target: V3(-3.3, 0.45, 0.95) };
  function wifeSewing(tl, T0) {
    const W = wife, yaw = 0.35;
    W.root.position.set(S35.x, 0, S35.z); W.root.rotation.set(0, yaw, 0);
    stool.position.set(S35.x - Math.sin(yaw) * 0.03, 0, S35.z - Math.cos(yaw) * 0.03); stool.rotation.y = yaw;
    basket.position.set(S35.x + 0.45, 0, S35.z - 0.35);
    if (S35.candle) stand.position.set(S35.candle.x, 0, S35.candle.z);
    W.pose('sit_chair', { seat: 0.32, feet: 0.1, lean: 0.4, hands: 'none' });
    const bite = Math.sin(Math.PI * clamp((tl - 0.22) / 0.42));            // cuff lifted to the mouth and lowered
    const smile = smoothstep(0.6, 1.0, tl) * (1 - 0.4 * smoothstep(1.1, 1.6, tl));
    const glance = ease.inOutSine(clamp((tl - 1.17) / 0.3));
    W.pose({ 'neck.x': 0.3 - 0.06 * smile, 'head.x': 0.3 - 0.12 * bite - 0.08 * smile, 'head.z': 0.05 * smile, 'neck.y': -0.1 * glance, 'head.y': -0.18 * glance }, { add: true });
    W.root.updateMatrixWorld(true); W.breathe(T0, 0.8);
    const hbn = W.bone('head'); hbn.updateWorldMatrix(true, false);
    const mouthW = V3(0, 0.0, 0.44 * W.P.hu).applyMatrix4(hbn.matrixWorld);
    const fwdW = V3(Math.sin(yaw), 0, Math.cos(yaw));
    const cuffC = mouthW.clone().addScaledVector(fwdW, 0.13 - 0.07 * bite).add(V3(0, -0.12 + 0.1 * bite, 0));
    cuffG.position.copy(cuffC); cuffG.rotation.set(-0.5 - 0.4 * bite, yaw, 0.15); cuffG.updateMatrixWorld(true);
    const dirW = (x, y, z) => V3(x, y, z).applyQuaternion(W.root.quaternion).normalize();
    const offW = (x, y, z) => V3(x, y, z).applyQuaternion(W.root.quaternion);
    // left hand (thimble on the middle finger, bangle) holds the cuff from below; right hand pinches the needle above it
    W.reach('L', cuffC.clone().add(offW(0.08, -0.03, -0.06)), { palm: dirW(-0.3, 1, 0.2), fingers: dirW(-0.8, 0.1, 0.5), elbowOut: 0.35 });
    W.hands.L.pose('cupped');
    const stitch = Math.sin(clamp(tl / 0.22) * Math.PI);               // last pull of the thread
    const nPos = cuffC.clone().add(offW(-0.05 - 0.02 * stitch, 0.05 + 0.06 * stitch, 0.02));
    W.reach('R', nPos.clone().add(offW(-0.06, 0.02, -0.07)), { palm: dirW(0.4, -0.6, -0.3), fingers: dirW(0.5, -0.2, 0.75), elbowOut: 0.45 });
    W.hands.R.pose('pinch');
    W.root.updateMatrixWorld(true);
    const tip = needle.localToWorld(V3(0, 0.02, 0)), patchPt = cuffG.userData.patch.localToWorld(V3(0.02, 0.025, 0));
    const tp = threadGeo.attributes.position; tp.setXYZ(0, patchPt.x, patchPt.y, patchPt.z); tp.setXYZ(1, tip.x, tip.y, tip.z); tp.needsUpdate = true; threadGeo.computeBoundingSphere();
    thread.visible = tl < 0.5;
  }
  // ---- view_home_hand: her left hand straightens the chopsticks before the empty seat
  function wifeStraighten(t, T0) {
    wifeAtTable(T0, { breath: 0.8, lean: 1.0 });
    const chop = bowlT.userData.chop;
    const st = ease.inOutSine(clamp((t - 0.3) / 0.6)), nudge = Math.exp(-(((t - 1.21) / 0.12) ** 2));
    chop.rotation.y = -Math.PI / 4 + 0.16 * (1 - st) + 0.012 * nudge; chop.position.x = 0.004 * (1 - st);
    bowlT.updateMatrixWorld(true);
    const reachIn = ease.inOutSine(clamp(t / 0.3));
    const grip = chop.localToWorld(V3(-0.1, 0.004, 0));
    const rest = V3(-0.34, TABLE.top + 0.03, -0.05);
    const wrist = rest.clone().lerp(grip.clone().add(V3(-0.075, 0.03, -0.02)), reachIn);
    wife.reach('L', wrist, { palm: V3(0.1, -1, 0.15).normalize(), fingers: V3(1, -0.35, 0.25).normalize(), elbowOut: 0.3 });
    if (typeof window !== 'undefined' && window.__OHLOG) console.log('OH straighten target=' + wrist.toArray().map((x) => x.toFixed(3)) + ' got=' + wife.worldPos('armL.hand').toArray().map((x) => x.toFixed(3)) + ' shoulder=' + wife.worldPos('armL.upper').toArray().map((x) => x.toFixed(3)));
    wife.hands.L.pose(reachIn > 0.6 ? 'pinch' : 'relaxed', { curl: 0.5 });
    const x = -TABLE.s / 2 + 0.075;
    wife.reach('R', V3(x, TABLE.top + 0.024, TABLE.z + 0.155), { palm: DOWN, fingers: V3(0.12, -0.08, -1).normalize(), elbowOut: 0.2 });
    wife.hands.R.pose('relaxed', { curl: 0.3 });
  }
  // ---- view_home_rain: standing on the step, she puts her right palm out under the eave edge
  function wifeReachRain(Tr) {
    const W = wife;
    W.root.position.set(-3.08, STEP_Y, 1.58); W.root.rotation.set(0, -Math.PI / 2 + 0.35, 0);
    W.pose('stand', { weight: 0.3 }); W.pose({ 'chest.x': 0.06, 'neck.x': 0.12, 'head.x': 0.1 }, { add: true });
    W.root.updateMatrixWorld(true); settleFeet(W, STEP_Y); W.breathe(Tr, 1.0);
    const out = ease.inOutSine(clamp((Tr - 206.95) / 0.5)) * (1 - ease.inOutSine(clamp((Tr - 209.3) / 0.6)));
    const sh = W.worldPos('armR.upper');
    const wrist = sh.clone().add(V3(-0.12 - 0.36 * out, -0.42 + 0.2 * out, -0.08 + 0.02 * out));
    W.reach('R', wrist, { palm: V3(0, 1, 0).lerp(V3(0.6, -0.2, 0.2), 1 - out).normalize(), fingers: V3(-1, -0.15 * out - 0.8 * (1 - out), 0).normalize(), elbowOut: 0.3 });
    W.hands.R.pose('cupped');
    W.reach('L', W.root.localToWorld(V3(0.14, 0.78, 0.1)), { palm: V3(1, 0, 0), fingers: V3(0, -1, 0.1).normalize() });
  }
  // ---- view_home_rain: drops into the bowl's centre blossom (first at 207.07, then every 1.35 s), crown splash
  function rainDrop(Tr) {
    const per = 1.35, ph = ((Tr - 207.07) % per + per) % per, fall = 0.69;
    const top = EAVE_Y - 0.02, surf = BOWL_S.y + 0.0175;
    const tf = per - ph < fall ? fall - (per - ph) : -1;               // time since this drop left the eave
    drop.visible = tf >= 0 && Tr > 206.3;
    if (drop.visible) drop.position.set(BOWL_S.x - 0.006, top - 4.9 * tf * tf, BOWL_S.z + 0.004);
    const ca = ph < 0.22 && Tr > 207.0 ? ph / 0.22 : -1;
    crownG.visible = ca >= 0;
    if (ca >= 0) crownDrops.forEach((d, k) => { const a = k / crownDrops.length * Math.PI * 2; const r = 0.004 + 0.03 * ca; d.position.set(BOWL_S.x + Math.cos(a) * r, surf + 0.02 * Math.sin(Math.PI * ca) * (0.7 + 0.3 * Math.sin(k * 2.3)), BOWL_S.z + Math.sin(a) * r); d.scale.setScalar(1 - 0.6 * ca); });
    drips.update(Tr); rainFx.update(Tr); water.update(Tr);
  }
  // ---- S041: the gloved hand (and its faint mirror twin) just in front of G3c's glass
  const cam41 = new THREE.PerspectiveCamera(30, 2.39, 0.05, 100); cam.lens(cam41, CAM19.mm);
  cam.place(cam41, CAM19.pos.clone().addScaledVector(dir19, -0.15), CAM19.target.clone().addScaledVector(dir19, -0.15)); cam41.updateMatrixWorld();
  const gloveRay = V3(0.36 * 2 - 1, 1 - 0.56 * 2, 0.5).unproject(cam41).sub(cam41.position).normalize();
  const gloveC = cam41.position.clone().addScaledVector(gloveRay, 0.85 / gloveRay.dot(dir19));
  const glassN = dir19.clone();                                           // glass normal (toward the scene)
  const glassP = CAM19.pos.clone().addScaledVector(dir19, GL41_D);
  function placeGloves(tl) {
    const up = V3(0, 1, 0), side = V3().crossVectors(dir19, up).normalize();
    const fingers = up.clone().multiplyScalar(0.95).addScaledVector(side, -0.2).addScaledVector(dir19, 0.12).normalize();
    gloveR.placeWrist(gloveC.clone().addScaledVector(fingers, -0.085), fingers, dir19.clone());
    gloveR.pose('relaxed', { curl: 0.5 });
    // mirror twin: reflect across the glass plane (a left hand, palm toward the camera)
    const refl = (v) => { const d = v.clone().sub(glassP).dot(glassN); return v.clone().addScaledVector(glassN, -2 * d); };
    const fT = fingers.clone().addScaledVector(glassN, -2 * fingers.dot(glassN));
    gloveTwin.placeWrist(refl(gloveC.clone().addScaledVector(fingers, -0.085)), fT, dir19.clone().negate());
    gloveTwin.pose('relaxed', { curl: 0.5 });
    const fade = 1 - smoothstep(0.45, 1.2, tl);
    for (const m of gloveMats) m.opacity = fade;
    for (const m of twinMats) m.opacity = 0.3 * fade;
    gloveR.root.visible = gloveTwin.root.visible = fade > 0.003;
    gl41Key.position.copy(gloveC).addScaledVector(dir19, -0.7).add(V3(0, 0.8, 0)).addScaledVector(side, 0.35); gl41Key.target.position.copy(gloveC); gl41Key.target.updateMatrixWorld();
  }

  // ---- aim solver: yaw/pitch (no roll) that best places world points at registered screen positions, camera at `pos`
  function aimCamera(pos, pts, mm, aspect = 2.39) {
    const c = new THREE.PerspectiveCamera(30, aspect, 0.01, 100); c.position.copy(pos); cam.lens(c, mm);
    const P = pts.map(([w, sc]) => [w.clone(), sc]), d = V3(), q = V3();
    const err = (yaw, pitch) => { d.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)); c.up.set(0, 1, 0); c.lookAt(q.copy(pos).add(d)); c.updateMatrixWorld();
      let e = 0; for (const [w, sc] of P) { const v = w.clone().project(c); e += (v.x * 0.5 + 0.5 - sc[0]) ** 2 + (0.5 - v.y * 0.5 - sc[1]) ** 2 + (v.z > 1 ? 10 : 0); } return e; };
    const cen = P.reduce((a, [w]) => a.add(w), V3()).multiplyScalar(1 / P.length).sub(pos).normalize();
    const y0 = Math.atan2(cen.x, -cen.z), p0 = Math.asin(cen.y);
    let best = [1e9, 0, 0];
    for (let yaw = y0 - 0.5; yaw < y0 + 0.5; yaw += 0.02) for (let pitch = p0 - 0.4; pitch < p0 + 0.4; pitch += 0.02) { const e = err(yaw, pitch); if (e < best[0]) best = [e, yaw, pitch]; }
    for (const st of [0.004, 0.0008]) { const [, y0, p0] = best; for (let yaw = y0 - st * 6; yaw <= y0 + st * 6; yaw += st) for (let pitch = p0 - st * 6; pitch <= p0 + st * 6; pitch += st) { const e = err(yaw, pitch); if (e < best[0]) best = [e, yaw, pitch]; } }
    const [, yaw, pitch] = best;
    return { pos: pos.clone(), target: pos.clone().add(V3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(2)), err: best[0] };
  }

  // ================================================================ camera rigs
  const C16 = (() => {
    const rimC = BOWL_T.clone().add(V3(0, TX.BOWL.H, 0)), tilt = 15 * D2R, dist = 0.631;
    const a = { pos: rimC.clone().add(V3(0, Math.cos(tilt) * dist, Math.sin(tilt) * dist)), target: rimC.clone() };
    const b = { pos: V3(0.1, 1.95, 0.65), target: V3(0.003, 0.842, -0.022) };   // solved: bowl (0.68,0.62), candle (0.42,0.39), hands (0.07,0.61), 59° down
    return { a, b, rimC };
  })();
  // ease: 6-frame ease-in then constant (cut on motion)
  const easeInConst = (u, a) => { u = clamp(u); const k = 1 / (1 - a / 2); return u < a ? k * u * u / (2 * a) : k * (u - a / 2); };

  // ================================================================ SETUPS
  const setups = {
    // S016 — CU 50 mm. MATCH CUT from S015 (T07): rim circle centred (0.50, 0.52), Ø ≈ 78 % of frame height, 15° from vertical
    // (tilted from the 6 o'clock side), side A toward 12 o'clock. Rise + pull back to a 60° high angle revealing the candle
    // (state B) and the empty bench's edge at frame right; her folded hands with the bangle at the left edge. No steam.
    S016(tl, u, T0) {
      mode('int', {});
      setCandle('B', T0); setMoonIn(MOON_IN_A);
      wifeAtTable(T0, { breath: 0.6 }); foldedHands();
      const e = easeInConst(tl / 1.75, 6 / 42);
      const pos = C16.a.pos.clone().lerp(C16.b.pos, e), tgt = C16.a.target.clone().lerp(C16.b.target, e);
      cam.place(camera, pos, tgt); cam.lens(camera, 50);
      camera.near = 0.02; camera.far = 40;
      const focus = lerp(cam.distTo(camera, C16.rimC), cam.distTo(camera, V3(-0.1, TABLE.top, 0.05)), smoothstep(0.1, 0.9, e));
      return { dof: { focus, fstop: 2.8 }, exposure: 1.25 };
    },
    // S017 — MS 75 mm, locked, square to the lab's arched sash window. On the glass: the restorer's faint true-mirror reflection
    // bowed over her bench (0.62, 0.40), warm from the 3500 K lamp off frame upper left. Deep in the glass: the old home
    // (candle point at (0.42, 0.46), wife on the left bench, empty bench right). 0–0.8 s rack from her reflection into the
    // home; 1.0–2.0 s a 24-frame dissolve INSIDE the reflection only (candle B → C, lattice shadow one cell on); 2.6 s her
    // shoulders rise and fall once.
    S017(tl, u, T0) {
      const dis = smoothstep(1.0, 2.0, tl);
      const renderHome = (rt, st, moonDir) => {
        mode('int', { noPartition: true, wife: 'mid' });
        setCandle(st, T0); setMoonIn(moonDir);
        const sig = Math.max(0, Math.sin(clamp((tl - 2.45) / 0.9) * Math.PI));
        wifeAtTable(T0, { breath: 0.8, sigh: sig }); foldedHands();
        intHemi.intensity = 0.22;
        homeCam.aspect = RT_W / RT_H; homeCam.position.set(0.42, 0.93, 6.3); homeCam.lookAt(0.18, 0.9, -0.2); cam.lens(homeCam, 40); homeCam.updateProjectionMatrix();
        const r = ctx.renderer, prev = r.getRenderTarget();
        r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, homeCam); r.setRenderTarget(prev);
      };
      plate.visible = false;
      if (dis < 0.999) renderHome(rtA, 'B', MOON_IN_A);
      if (dis > 0.001) renderHome(rtB, 'C', MOON_IN_C);
      plate.visible = true; intHemi.intensity = 0.06;
      plateMat.uniforms.mixAmt.value = dis; plateMat.uniforms.uT.value = T0;
      mode('lab', { wife: false });
      // the restorer's reflection: seated at her bench facing the window (mirror image faces the camera), bowed, working
      ghost.root.position.set(0.52, -1.14, -6.2); ghost.root.rotation.set(0, Math.PI + 0.12, 0);
      ghost.pose('sit_desk', { seat: 0.47, lean: 0.45 });
      ghost.pose({ 'neck.x': 0.28, 'head.x': 0.2, 'chest.x': 0.1 }, { add: true });
      ghost.root.updateMatrixWorld(true); ghost.breathe(T0, 0.6);
      { const hd = ghost.worldPos('head'); ghost.root.position.add(LAB.clone().add(GHOST_HEAD).sub(hd)); ghost.root.updateMatrixWorld(true); }
      const work = Math.sin(T0 * 2.1) * 0.012 + Math.sin(T0 * 5.3) * 0.004;
      ghost.reach('R', ghost.root.localToWorld(V3(-0.07 + work, 0.80, 0.42)), { palm: DOWN, fingers: V3(0.2, -0.4, -1).normalize() });
      ghost.reach('L', ghost.root.localToWorld(V3(0.12, 0.79, 0.38)), { palm: DOWN, fingers: V3(-0.3, -0.4, -1).normalize() });
      ghostKey.position.set(-0.6, 0.9, -5.5); ghostKey.target.position.set(0.52, -0.1, -6.1); ghostKey.target.updateMatrixWorld();
      for (const m of ghostMats) m.opacity = 0.13;
      cam.place(camera, LAB, LAB.clone().add(V3(0, 0, -1))); cam.lens(camera, 75);
      camera.near = 0.05; camera.far = 40;
      const fRef = 6.0, fHome = -PLATE_Z;
      const focus = Math.exp(lerp(Math.log(fRef), Math.log(fHome), ease.inOutSine(clamp(tl / 0.8))));
      return { dof: { focus, fstop: 2.4 }, exposure: 1.35, temp: -0.05, saturation: 0.9, bloom: { strength: 0.5, threshold: 0.7 } };
    },

    // S019 — WS 32 mm, eye level, LOCKED (camera data reused by S041). Sky = upper third (S018's end: gathering clouds, veiled
    // moon at (0.80, 0.14)). Under the eaves: she has bent to set the empty bowl on the step's outer edge under the drip line;
    // 74.18 '等' the foot touches the step; 74.60 '场雨' the palm leaves the rim and stops ~8 cm above. Niche lamp unlit.
    S019(tl, u, T0) {
      exterior(T0, 'ch1', tl);
      lampLit(false);
      doorPivot.rotation.y = -0.95;
      wifePlaceBowl(tl, T0);
      cam.place(camera, CAM19.pos, CAM19.target); cam.lens(camera, CAM19.mm);
      camera.near = 0.05; camera.far = 3000;
      return { dof: null, exposure: 1.55, temp: -0.12, saturation: 0.86, bloom: { strength: 0.45, threshold: 0.75 } };
    },
    // S035 — CU 75 mm, locked. Under the lattice window she bites off the thread (0.54 s '红'), the shy smile (head lifts
    // 0.6–1.1), 1.17 s a 15° glance toward the open door at screen left; focus racks 1.47–1.98 s from her hands/mouth to
    // the small oil lamp just past the left jamb (0.22, 0.44), sharp on '谁的' (120.31).
    S035(tl, u, T0) {
      mode('int', { sew: true, lampIn: true, bowlT: false, candleShadow: false, bounce: false });
      setCandle('A', T0); setMoonIn(MOON_S35);
      candle.object3D.position.copy(S35.candle); candle.update(T0, { intensity: 0.5 });
      stand.position.set(S35.candle.x, 0, S35.candle.z);
      doorPivot.rotation.y = -1.45;
      lampIn.update(T0, { intensity: 0.012 });
      wifeSewing(tl, T0);
      cam.place(camera, C35.pos, C35.target); cam.lens(camera, 75);
      camera.near = 0.05; camera.far = 40;
      const dNear = cam.distTo(camera, wife.hands.R.sockets.pinch.getWorldPosition(V3())), dLamp = cam.distTo(camera, lampIn.object3D.position);
      const f = smoothstep(1.47, 1.98, tl);
      const focus = Math.exp(lerp(Math.log(dNear), Math.log(dLamp), f));
      return { dof: { focus, fstop: 2.0 }, exposure: 1.3, bloom: { strength: 0.5, threshold: 0.7 } };
    },
    // S041 — WS 32 mm. REFLECTION hand-off from S040 (G3c glass, gloved hand at (0.36, 0.56)): 0–1.6 s a 15 cm push toward
    // the glass ending exactly on S019's camera, focus racks from the glove's reflection plane into mirror depth while the
    // vitrine's transmitted interior (case glow, faded stamp) is pulled down and the glove blurs away (gone by 1.2 s).
    // Then locked = S019 composition, CH2 weather: heavy low cloud, moon only a glow, damp step, the niche lamp lit; she sits
    // on the doorstone, the empty bowl beside her; one slow breath at 2.1 s.
    S041(tl, u, T0) {
      const k = 1 - smoothstep(0.3, 1.6, tl);
      exterior(T0, 'ch2', tl, { glass41: k > 0.002 });
      lampLit(true); lampOut.update(T0, { intensity: 0.35 });
      doorPivot.rotation.y = -0.95;
      wifeOnDoorstone(T0, { breathAt: T.S041 + 2.1 });
      const push = 1 - ease.outCubic(clamp(tl / 1.6));
      const pos = CAM19.pos.clone().addScaledVector(dir19, -0.15 * push), tgt = CAM19.target.clone().addScaledVector(dir19, -0.15 * push);
      cam.place(camera, pos, tgt); cam.lens(camera, CAM19.mm);
      camera.near = 0.05; camera.far = 3000;
      glassMat41.uniforms.k.value = 0.86 * k; glassMat41.uniforms.dustK.value = k;
      placeGloves(tl);
      const fNear = 0.89, fFar = cam.distTo(camera, V3(-2.85, 0.6, 1.5));
      const fr = smoothstep(0.06, 1.6, tl);
      const focus = Math.exp(lerp(Math.log(fNear), Math.log(fFar), fr));
      return { dof: { focus, fstop: 2.0 + 3.6 * fr }, exposure: lerp(1.15, 1.6, smoothstep(0.2, 1.6, tl)), temp: -0.12, saturation: 0.86, grain: lerp(0.035, 0.04, fr), bloom: { strength: 0.45, threshold: 0.75 } };
    },
    // S042 — INSERT, 24 mm probe 7 cm above the damp doorstep, locked. Bowl rim large at left, her mended shoe at right, damp
    // stone between. 139.02 '等' a child's bare feet step out of the dark doorway and settle between them; 139.68 '雨' the toes
    // wiggle. Nothing above the ankles in frame.
    S042(tl, u, T0) {
      exterior(T0, 'ch2', tl, { child: true, wife: 'mid', sky: false, sea: false });
      lampLit(true); lampOut.update(T0, { intensity: 0.35 });
      doorPivot.rotation.y = -0.95;
      wifeOnDoorstone(T0, {});
      childFeet(tl, T0);
      cam.place(camera, C42.pos, C42.target); cam.lens(camera, 24);
      camera.near = 0.01; camera.far = 600;
      return { dof: { focus: cam.distTo(camera, V3(-3.42, -0.14, 1.36)), fstop: 4.0 }, exposure: 2.3, temp: -0.06, saturation: 0.88, lift: [0.014, 0.014, 0.018], bloom: { strength: 0.55, threshold: 0.65 } };
    },

    // ---------------------------------------------------------------- named views (nested; no post — linear HDR straight into a pane)
    // view_home_candle — the wife at the table by the candle (state C), the empty seat opposite, face unresolved (G3b S024/S025)
    view_home_candle(tl, u, T0) {
      mode('int', { noPartition: true, wife: 'mid' });
      setCandle('C', T0); setMoonIn(MOON_IN_C);
      wifeAtTable(T0, { breath: 1 }); foldedHands();
      cam.place(camera, [0.32, 1.02, 3.7], [0.06, 0.92, -0.1]); cam.lens(camera, 40);
      camera.near = 0.05; camera.far = 40;
      return { dof: null, exposure: 1.0 };
    },
    // view_home_hand — her left hand with the silver bangle straightens the chopsticks before the empty seat (gallery S026):
    // straighten 0.3–0.9 s, pause, nudge at 1.21 s, still from 2.70 s (tl of S026; loops for other callers)
    view_home_hand(tl, u, T0) {
      mode('int', { noPartition: true });
      setCandle('C', T0); setMoonIn(MOON_IN_C);
      const t = tl % 3.67;
      wifeStraighten(t, T0);
      cam.place(camera, CHAND.pos, CHAND.target); cam.lens(camera, 70);
      camera.near = 0.03; camera.far = 40;
      return { dof: null, exposure: 1.0 };
    },
    // view_home_rain — CH3: under the eaves at night the rain finally falls into the bowl at the step's edge; the door lamp
    // backlights the drops; her palm reaches out under the eave. Timed on song time (S066: drop into the centre at 207.07,
    // palm out ~207.3) and loops on a 4 s cycle for other callers.
    view_home_rain(tl, u, T0) {
      const Tr = T0 >= 204 && T0 <= 214 ? T0 : 206.0 + ((T0 % 4) + 4) % 4;
      exterior(Tr, 'ch3', tl, { rain: true, sky: false, sea: false });
      lampLit(true); lampOut.update(Tr, { intensity: 1.1 });
      doorPivot.rotation.y = -0.95;
      wifeReachRain(Tr);
      rainDrop(Tr);
      // drops fall from the eave edge through the lamp's glow (behind) past her palm into the bowl: one vertical axis
      cam.place(camera, [-6.0, 0.5, 2.9], [-3.4, 0.44, 0.95]); cam.lens(camera, camera.aspect >= 1.2 ? 30 : 45);
      camera.near = 0.05; camera.far = 600;
      return { dof: null, exposure: 1.0 };
    },
  };
  // ---- debug views (out/check/old_home/dbg_shots.json)
  setups.DBG_ROOM = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); cam.place(camera, [1.9, 1.7, 3.6], [-0.2, 0.7, -0.5]); cam.lens(camera, 24); camera.near = 0.05; camera.far = 60; return { dof: null, exposure: 1.6 }; };
  setups.DBG_TOP = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); cam.place(camera, [0.0, 2.6, 1.2], [-0.15, 0.8, 0.0]); cam.lens(camera, 28); camera.near = 0.05; camera.far = 60; return { dof: null, exposure: 1.4 }; };
  setups.DBG_WIFE = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); cam.place(camera, [-0.2, 1.1, 1.6], [-0.5, 0.85, 0.0]); cam.lens(camera, 35); camera.near = 0.05; camera.far = 60; return { dof: null, exposure: 1.6 }; };
  setups.DBG_EXT = (tl, u, T0) => { const r = setups.S041(2.0, 0.7, T.S041 + 2.0); cam.place(camera, [-9.5, 3.2, 6.5], [-3.0, 0.6, 1.2]); cam.lens(camera, 24); return { ...r, dof: null }; };
  setups.DBG_SEW = (tl, u, T0) => { const r = setups.S035(0.9, 0.3, T.S035 + 0.9); cam.place(camera, [2.4, 1.6, 1.6], [1.25, 0.7, -0.3]); cam.lens(camera, 28); return { ...r, dof: null, exposure: 2.0 }; };
  setups.DBG_SEW2 = (tl, u, T0) => { const r = setups.S035(0.9, 0.3, T.S035 + 0.9); cam.place(camera, [1.3, 1.25, 0.55], [1.35, 0.75, -0.3]); cam.lens(camera, 35); return { ...r, dof: null, exposure: 2.0 }; };
  setups.DBG_PROBE = (tl, u, T0) => { const r = setups.S042(1.5, 0.9, T.S042 + 1.5); cam.place(camera, [-4.6, 0.9, 2.6], [-3.3, 0.0, 1.3]); cam.lens(camera, 28); return { ...r, dof: null, exposure: 2.0 }; };
  setups.DBG_HANDS = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); cam.place(camera, [-0.3, 1.45, 0.25], [-0.38, 0.85, -0.03]); cam.lens(camera, 40); camera.near = 0.02; camera.far = 60; return { dof: null, exposure: 1.6 }; };
  setups.DBG_LAB = (tl, u, T0) => { const r = setups.S017(1.5, 0.5, T.S017 + 1.5); cam.place(camera, LAB.clone().add(V3(2.2, 0.5, 1.0)), LAB.clone().add(V3(0, -0.3, -4))); cam.lens(camera, 20); camera.far = 60; return { ...r, dof: null }; };
  setups.default = setups.S016;

  // ---- solve the registered framings from the actual posed figures (robust to pose / figure-library changes)
  {
    mode('int', { sew: true, lampIn: true, bowlT: false }); wifeSewing(0.9, T.S035 + 0.9);
    const hb = wife.bone('head'); hb.updateWorldMatrix(true, false);
    const mouth = V3(0, 0.0, 0.44 * wife.P.hu).applyMatrix4(hb.matrixWorld), lampP = lampIn.object3D.localToWorld(V3(0.043, 0.06, 0));
    let best = null;
    const ldir = mouth.clone().sub(lampP).setY(0).normalize();
    for (const k of [1.1, 1.3, 1.5, 1.7]) for (const off of [-0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6]) for (const cy of [0.5, 0.58, 0.66, 0.74]) {
      const cx = mouth.x + ldir.x * k - ldir.z * off, cz = mouth.z + ldir.z * k + ldir.x * off;
      if (cx > 2.42 || cz < -1.9 || cz > 1.9) continue;
      const hands = cuffG.position.clone();
      const r = aimCamera(V3(cx, cy, cz), [[lampP, [0.22, 0.44]], [mouth, [0.66, 0.30]], [hands, [0.54, 0.58]]], 75);
      if (!best || r.err < best.err) best = r;
    }
    C35.pos.copy(best.pos); C35.target.copy(best.target);
    { // the candle she sews by: beyond her face and off frame left → a side-back key on her profile
      const v = C35.target.clone().sub(C35.pos).setY(0).normalize(), left = V3(v.z, 0, -v.x);
      S35.candle = mouth.clone().addScaledVector(v, 0.55).addScaledVector(left, -0.42).setY(0.515);   // beyond her, behind her head from the camera
    }
    console.log('OH C35 err', best.err.toFixed(5));
    exterior(T.S042 + 1.0, 'ch2', 1.0, { child: true, wife: 'mid', sky: false, sea: false }); wifeOnDoorstone(T.S042 + 1.0, {});
    const toe = wife.worldPos('legL.foot').add(V3(-0.12, -0.02, 0.03)), rim = BOWL_S.clone().add(V3(0, 0.055, 0));
    best = null;
    for (const cx of [-4.0, -3.94, -3.88, -3.82]) for (const cz of [1.2, 1.28, 1.36, 1.44, 1.52]) {
      const p = V3(cx, STEP_Y + 0.07, cz), d = Math.hypot(cx - BOWL_S.x, cz - BOWL_S.z);
      const r = aimCamera(p, [[rim, [0.22, 0.62]], [toe, [0.74, 0.70]]], 24); r.err += 0.2 * (d - 0.3) ** 2;
      if (!best || r.err < best.err) best = r;
    }
    C42.pos.copy(best.pos); C42.target.copy(best.target);
    // view_home_hand: candle soft upper left (0.30, 0.35), bowl (0.62, 0.55), her hand on the chopsticks (0.56, 0.58)
    mode('int', { noPartition: true }); setCandle('C', T.S017); wifeStraighten(2.0, 95.0);
    const flame = CANDLE_T.clone().add(V3(0, 0.012 + 0.06 + 0.012, 0)), rimT = BOWL_T.clone().add(V3(0, 0.066, 0)), gripT = bowlT.userData.chop.localToWorld(V3(-0.1, 0.004, 0));
    best = null;
    for (const cx of [0.15, 0.3, 0.45, 0.6]) for (const cz of [0.9, 1.15, 1.4, 1.7]) for (const cy of [1.1, 1.3, 1.5, 1.7]) {
      const r = aimCamera(V3(cx, cy, cz), [[flame, [0.30, 0.35]], [rimT, [0.62, 0.55]], [gripT, [0.56, 0.58]]], 70);
      if (!best || r.err < best.err) best = r;
    }
    CHAND.pos.copy(best.pos); CHAND.target.copy(best.target);
    console.log('OH solved CHAND', CHAND.pos.toArray().map((x) => x.toFixed(2)), best.err.toFixed(4));
    console.log('OH solved C35', C35.pos.toArray().map((x) => x.toFixed(3)), C35.target.toArray().map((x) => x.toFixed(3)), 'C42', C42.pos.toArray().map((x) => x.toFixed(3)), C42.target.toArray().map((x) => x.toFixed(3)));
  }

  return {
    scene, camera,
    post: { exposure: 1.0, contrast: 1.05, saturation: 0.9, temp: 0.0, lift: [0.012, 0.012, 0.016], shadowTint: [0.45, 0.5, 0.6], highTint: [0.56, 0.52, 0.46], grain: 0.04, vignette: 0.38, bloom: { strength: 0.42, radius: 0.55, threshold: 0.8 } },
    setShot(shot, tl, u, T0) {
      const fn = setups[shot.id] || setups.default;
      const r = fn(tl, u, T0, shot) || {};
      if (G.exterior.visible) { camera.updateMatrixWorld(); camera.updateProjectionMatrix(); sea.update(T0, camera); }
      if (typeof window !== 'undefined' && window.__OHLOG) {
        const f = (v) => v.toArray().map((x) => x.toFixed(3)).join(',');
        const W = wife; W.root.updateMatrixWorld(true);
        console.log('OH ' + shot.id + ' tl=' + tl.toFixed(2) + ' eye=' + f(W.eye()) + ' head=' + f(W.worldPos('head')) + ' hips=' + f(W.worldPos('hips')) + ' footL=' + f(W.worldPos('legL.foot')) + ' footR=' + f(W.worldPos('legR.foot')) + ' wristL=' + f(W.worldPos('armL.hand')) + ' wristR=' + f(W.worldPos('armR.hand')) + ' childFootL=' + f(child.worldPos('legL.foot')) + ' childFootR=' + f(child.worldPos('legR.foot')));
      }
      const OFFX = (typeof window !== 'undefined' && window.__OHOFF) || OFF;
      if (OFFX.size) { const OFF = OFFX;
        if (OFF.has('cshadow')) candle.light.castShadow = false;
        if (OFF.has('mshadow')) moonWL.light.castShadow = false;
        if (OFF.has('wife')) wife.root.visible = false;
        if (OFF.has('dof')) r.dof = null;
        if (OFF.has('house')) G.house.visible = false;
        if (OFF.has('moon')) moonWL.object3D.visible = false;
        if (OFF.has('msh2')) moonDirL.castShadow = false;
        if (OFF.has('sea')) sea.object3D.visible = false;
        if (OFF.has('sky')) sky.object3D.visible = false;
        if (OFF.has('child')) child.root.visible = false;
        if (OFF.has('inside')) G.interior.visible = false;
        if (OFF.has('ext')) G.exterior.visible = false;
        if (OFF.has('bloom')) r.bloom = { strength: 0 };
        if (OFF.has('bounce')) { if (moonWL.bounce) moonWL.bounce.visible = false; tableBounce.visible = false; }
        if (OFF.has('figshadow')) for (const f of [wifeHi, wifeMid, child]) f.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        if (OFF.has('yb')) yardBounce.visible = false;
        if (OFF.has('door')) doorGlow.visible = false;
        if (OFF.has('lamp')) lampOut.light.visible = false;
      } else { moonWL.light.castShadow = true; for (const f of [wifeHi, wifeMid, child]) f.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
      return r;
    },
  };
}
