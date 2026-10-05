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
const WT = 2.56, RIDGE = 4.01, EAVE_X = 3.62, EAVE_Y = 2.2, ROOF_Z0 = -2.7, ROOF_Z1 = 3.9, HOUSE_Z1 = 3.6;
const DOOR = { z0: 0.69, z1: 1.61, y0: 0.10, y1: 2.05 }, DOOR_ZC = 1.15;
const WIN = { z0: -0.75, z1: 0.05, y0: 1.2, y1: 2.2 };
const NICHE = { z0: 0.16, z1: 0.42, y0: 0.98, y1: 1.24, d: 0.2 };
// S035 staging cheat (review): a small recess in the INNER face of the west wall just south of the door (screen left of the
// door from inside), so the locked 75 mm sees the lamp frontally in its lit niche (the old cut in the door reveal read as a slit)
const NICHE_IN = { x0: -2.68, z0: 1.72, z1: 1.92, y0: 0.62, y1: 0.88 };
const YARD = -0.42, STEP_Y = -0.18;
const TABLE = { x: 0, z: 0, top: 0.82, s: 0.95 };
const BENCH_X = 0.6, BENCH_TOP = 0.45;
const BOWL_T = V3(0.22, TABLE.top, 0.04);       // on the table, before the empty bench (side A → −Z = frame top)
const CANDLE_T = V3(-0.07, TABLE.top, -0.03);
const BOWL_S = V3(-3.60, STEP_Y, 1.95);           // on the step's outer edge under the drip line, just right (south) of the door
const SEAT = { x0: -3.26, x1: -2.9, z0: 2.22, z1: 2.68, top: 0.13 };   // granite seat block on the step against the facade
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
  // 1024² over the 15 cm heap (≈68 px/cm): grains 6–7 × 2.6–3 mm drawn in three layers, each with a soft contact shadow, so
  // the crevices read dark and every top grain reads as one smooth, dry, slightly translucent grain (no foil-like crinkle)
  const riceTex = (() => {
    const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = util.rng(41), hgt = new Float32Array(S * S);
    g.fillStyle = '#77716a'; g.fillRect(0, 0, S, S);
    const hc = canvas(S, S), hg = hc.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S); hg.globalCompositeOperation = 'lighten';
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 950; i++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, L = 40 + r() * 8, Wd = 17 + r() * 3, k = r(), lift = 0.45 + 0.27 * layer;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = 'rgba(40,36,32,0.28)'; g.beginPath(); g.ellipse(2.5, 3, L * 0.56, Wd * 0.66, 0, 0, Math.PI * 2); g.fill();   // contact shadow
      const gr = g.createRadialGradient(-L * 0.1, -Wd * 0.18, 1, 0, 0, L * 0.52);
      const top = 226 + k * 14 + layer * 6, edge = 188 + k * 12 + layer * 6;
      gr.addColorStop(0, `rgb(${top},${top - 3},${top - 10})`); gr.addColorStop(0.75, `rgb(${edge + 6},${edge + 3},${edge - 4})`); gr.addColorStop(1, `rgb(${edge - 22},${edge - 25},${edge - 30})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * 0.5, Wd * 0.5, 0, 0, Math.PI * 2); g.fill();
      if (k > 0.72) { g.fillStyle = 'rgba(250,248,242,0.28)'; g.beginPath(); g.ellipse(-L * 0.18, -Wd * 0.1, L * 0.14, Wd * 0.18, 0, 0, Math.PI * 2); g.fill(); } // dry, chalky embryo end
      g.restore();
      hg.save(); hg.translate(x, y); hg.rotate(a); hg.scale(1, Wd / L);
      const hr = hg.createRadialGradient(0, 0, 0, 0, 0, L * 0.5), v = Math.round(255 * lift);
      hr.addColorStop(0, `rgb(${v},${v},${v})`); hr.addColorStop(0.6, `rgb(${Math.round(v * 0.85)},${Math.round(v * 0.85)},${Math.round(v * 0.85)})`); hr.addColorStop(1, 'rgb(0,0,0)');
      hg.fillStyle = hr; hg.beginPath(); hg.arc(0, 0, L * 0.5, 0, Math.PI * 2); hg.fill(); hg.restore();
    }
    const hd = hg.getImageData(0, 0, S, S).data; for (let i = 0; i < S * S; i++) hgt[i] = hd[i * 4] / 255;
    return { map: ctex(c), normalMap: heightToNormal(hgt, S, S, 1.6) };
  })();
  // grey roof tiles: rounded cover-tile rows down the slope (canvas x = down-slope, y = along the ridge), lime-bedded joints
  // grey clay roof (青灰瓦, 仰合瓦): narrow convex cover-tile rows (合瓦) over wide concave pan tiles (仰瓦), each course a
  // separate tile with its own tone and a shadowed overlap lip; lime bedding at the cover-tile seams, a little lichen.
  // Canvas x = down-slope (1 m), y = along the ridge (1 m): 5 tile rows of 20 cm, 4 courses of 25 cm.
  const roofTex = (() => {
    const W = 512, H = 512, c = canvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data, N = TX.makeNoise(57), hgt = new Float32Array(W * H);
    const rows = 5, courses = 4, hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, fy = (y / H) * rows % 1, row = Math.floor(y / H * rows);
      const jit = 0.06 * (hsh(row, 1) - 0.5), fxr = (x / W) * courses + jit + 0.5 * (row % 2) * 0.0, crs = Math.floor(fxr), fx = fxr - crs;
      const dc = Math.abs(fy - 0.5) / 0.19;                                             // cover tile half-width 3.8 cm of a 20 cm row
      const cover = dc < 1 ? Math.sqrt(1 - dc * dc) : 0;                                 // convex cover tile
      const pan = dc >= 1 ? 0.35 * (1 - Math.cos(Math.PI * (Math.abs(fy - 0.5) - 0.19) / 0.31)) : 0; // concave pan tile
      const lip = smoothstep(0.86, 0.995, fx), shade = smoothstep(0.0, 0.08, fx);          // overlap lip of the course above + its shadow
      const tone = 0.86 + 0.24 * hsh(row * 7 + 3, crs * 13 + 1), n = N.fbm(x / W, y / H, 8, 4) * 0.5 + 0.5;
      const lich = smoothstep(0.66, 0.84, N.fbm(x / W + 3, y / H, 4, 3) * 0.5 + 0.5) * (1 - cover * 0.6);
      let v = (52 + 30 * cover + 10 * pan) * tone * (0.82 + 0.18 * shade) - 18 * lip + 14 * (n - 0.5);
      const seam = dc > 0.92 && dc < 1.12 ? 0.6 * smoothstep(0.45, 0.7, N.n(x / W * 80, y / H * 80, 80, 80) * 0.5 + 0.5) : 0;   // lime bedding
      let rr = v * 0.96, gg = v * 0.99, bb = v * 1.05;
      rr = lerp(rr, 140, seam); gg = lerp(gg, 137, seam); bb = lerp(bb, 128, seam);
      rr = lerp(rr, rr * 0.9 + 6, lich); gg = lerp(gg, gg * 0.96 + 9, lich); bb = lerp(bb, bb * 0.82, lich);
      d[i * 4] = rr; d[i * 4 + 1] = gg; d[i * 4 + 2] = bb; d[i * 4 + 3] = 255;
      hgt[i] = 0.6 * cover - 0.2 * pan - 0.3 * lip + 0.25 * (1 - shade) * 0 + 0.04 * n;
    }
    g.putImageData(im, 0, 0);
    return { map: ctex(c), normalMap: heightToNormal(hgt, W, H, 5) };
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
    yard: TX.mat('stone', { repeat: [1, 1], tex: { rows: 3, seed: 44, wear: 0.7 }, color: 0x8e8e8c }),
    roof: std({ map: roofTex.map, normalMap: roofTex.normalMap, roughness: 0.82, color: 0xd8dade }),
    dark: std({ color: 0x15110e, roughness: 0.9 }),
  };
  for (const [k, s] of [['granite', 1.6], ['graniteIn', 1.6], ['graniteStep', 1.0], ['floor', 1.4], ['yard', 2.7], ['boards', 2.0], ['door', 1.2]]) { const m = M[k]; for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) t.repeat.set(1, 1); m.userData.uvScale = s; }
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
    [NICHE_IN.x0, -2.49, NICHE_IN.y0, NICHE_IN.y1, NICHE_IN.z0, NICHE_IN.z1],
  ];
  const wallsOut = [], wallsIn = [];
  for (const b of carve([-2.9, -2.5, YARD, WT, -2.4, HOUSE_Z1], westHoles)) wallsOut.push(b);
  for (const b of carve([2.5, 2.9, YARD, WT, -2.4, HOUSE_Z1], [[2.4, 3.0, WIN.y0, WIN.y1, WIN.z0, WIN.z1]])) wallsOut.push(b);
  wallsOut.push(boxAt(-2.5, 2.5, YARD, WT, -2.4, -2.0));
  const partition = boxAt(-2.5, 2.5, 0, WT + 0.2, 2.0, 2.4);
  // gables (north + south) and the partition gable
  const gable = (z0, z1) => { const s = new THREE.Shape([new THREE.Vector2(-2.9, WT), new THREE.Vector2(2.9, WT), new THREE.Vector2(0, RIDGE + 0.05)]); const gg = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); gg.translate(0, 0, z0); gg.computeVertexNormals(); return gg; };
  const nonIdx = (gg) => (gg.index ? gg.toNonIndexed() : gg);
  merged([...wallsOut, gable(-2.4, -2.0)].map(nonIdx), M.granite, H, 1.6);
  const southWall = merged([boxAt(-2.5, 2.5, YARD, WT, HOUSE_Z1 - 0.4, HOUSE_Z1), gable(HOUSE_Z1 - 0.4, HOUSE_Z1)].map(nonIdx), M.granite, H, 1.6);   // hidden for S017's plate camera
  const partMesh = merged([partition, gable(2.0, 2.4)].map(nonIdx), M.graniteIn, H, 1.6);
  // inner wall skins (smoke-darkened) 2 cm proud of the inner faces so the interior reads darker than the facade
  {
    const skins = [];
    for (const b of carve([-2.52, -2.5, 0, WT, -2.0, 2.0], [[-2.6, -2.4, DOOR.y0, DOOR.y1, DOOR.z0, DOOR.z1], [-2.6, -2.4, NICHE_IN.y0, NICHE_IN.y1, NICHE_IN.z0, NICHE_IN.z1]])) skins.push(b);
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
    const rm = []; for (let z = -2.6; z < ROOF_Z1 - 0.05; z += 0.42) for (const sg of [-1, 1]) for (let s = 0; s < 3; s++) { const x = sg * (2.95 + s * 0.24); rm.push(new THREE.Matrix4().compose(V3(x, RIDGE - Math.abs(x) * 0.5 - 0.02, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sg * slope)), V3(4.2, 1, 1))); }
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
  mesh(new THREE.BoxGeometry(0.05, 0.5, 0.45), M.door, H, -2.93, 1.45, 3.05);
  // lamp niche back (oil-stained) + the facade niche lamp (PROP_LAMP) and the S035 cheat lamp (reveal niche)
  const nicheBack = mesh(new THREE.PlaneGeometry(NICHE.z1 - NICHE.z0, NICHE.y1 - NICHE.y0), std({ color: 0x2c2620, roughness: 0.95 }), H, -2.9 + NICHE.d - 0.001, (NICHE.y0 + NICHE.y1) / 2, (NICHE.z0 + NICHE.z1) / 2, false); nicheBack.rotation.y = -Math.PI / 2;
  const lampOut = FX.oilLamp({ intensity: 0.35, seed: 11 }); lampOut.object3D.position.set(-2.82, NICHE.y0 + 0.003, (NICHE.z0 + NICHE.z1) / 2); lampOut.object3D.rotation.y = Math.PI; H.add(lampOut.object3D);
  const lampOutFlame = lampOut.object3D.children.slice(3).filter((o) => !o.isLight);
  lampOut.light.distance = 6;
  const lampIn = FX.oilLamp({ intensity: 0.012, seed: 12 }); lampIn.object3D.position.set(NICHE_IN.x0 + 0.08, NICHE_IN.y0 + 0.003, (NICHE_IN.z0 + NICHE_IN.z1) / 2 - 0.02); lampIn.object3D.rotation.y = 0.2; G.interior.add(lampIn.object3D);
  { const sootB = mesh(new THREE.PlaneGeometry(NICHE_IN.z1 - NICHE_IN.z0, NICHE_IN.y1 - NICHE_IN.y0), std({ color: 0x2a221c, roughness: 0.95 }), G.interior, NICHE_IN.x0 + 0.002, (NICHE_IN.y0 + NICHE_IN.y1) / 2, (NICHE_IN.z0 + NICHE_IN.z1) / 2, false); sootB.rotation.y = Math.PI / 2; }
  lampIn.light.distance = 5;
  const lampInHalo = FX.glow({ color: 0xE2A458, size: 0.05, intensity: 0.9, falloff: 2.0 }); lampInHalo.object3D.position.set(0.043, 0.065, 0); lampIn.object3D.add(lampInHalo.object3D);   // S035: reads as a point at 5 m

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
  // review: the empty bench stands 8 cm further out, so a dark gap of floor separates it from the table edge and its moonlit
  // top reads as a seat (S016's '失' reveal), not as a continuation of the table
  const EMPTY_X = BENCH_X + 0.08;
  benchG(-BENCH_X); benchG(EMPTY_X);
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
    const riceM = std({ map: riceTex.map, normalMap: riceTex.normalMap, normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.8, color: 0xeeebe4 });
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
  for (const o of candle.object3D.children) if (o.isMesh && o.material.metalness === 1) { o.material = o.material.clone(); o.material.metalness = 0.7; o.material.roughness = 0.5; o.material.color.setHex(0x8C7350); o.material.envMapIntensity = 1.0; }
  // the wax body must not shadow its own drip pan from the flame just above it (a real flame is ~2 cm tall and the pan gets
  // bounce from the table; a point light right over the wick paints the whole brass dish black)
  candle.object3D.children[0].castShadow = false;
  candle.light.shadow.mapSize.set(512, 512); candle.light.shadow.camera.far = 1.6;   // only the table, bowl, benches and her hands are in its 6 cube faces
  candle.light.color.setHex(0xffb676);   // 1850 K, a touch less saturated than the kit default so candle-lit skin stays amber, not orange
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
  const MOON_16 = V3(-0.9, -0.42, 0.1).normalize();   // S016: higher, so the beam falls on the table AND the empty bench beside it
  const moonWL = FX.windowLight({ center: winC, right: winR, up: winU, dir: MOON_IN_A, cookie: crackCookie.map, color: 0xa6b8dc, intensity: 11.0, frameVisible: true, frameColor: 0x3A2A1E, bounce: 0.25, floorY: 0, mapSize: 1024 });
  I.add(moonWL.object3D);
  function setMoonIn(dir) { const L = moonWL.light; L.position.copy(winC).addScaledVector(dir, -25); L.target.position.copy(winC); L.target.updateMatrixWorld(); }
  const intHemi = new THREE.HemisphereLight(0x1a2438, 0x140d08, 0.06); I.add(intHemi);
  const tableBounce = new THREE.PointLight(0xffa868, 0.02, 2.5, 2); tableBounce.position.set(-0.05, 0.95, 0.2); I.add(tableBounce);
  // S035 (review): the candle's warm bounce off the cloth in her lap, from below on the camera side — the key on the work
  // (patch, needle, thimble, bangle); unshadowed, short reach so the far wall / doorway stay dark
  const sewFill = new THREE.PointLight(0xffb27a, 0.0, 1.1, 2); sewFill.visible = false; I.add(sewFill);   // warm bounce off the table top (fills the candle's own shadow on the drip pan)

  // ================================================================ EXTERIOR: yard, step, seat, low wall, sea, sky, props
  const E = G.exterior;
  {
    const yard = mesh(new THREE.PlaneGeometry(44, 20), M.yard, E, -9, YARD, -0.5, false); yard.rotation.x = -Math.PI / 2;
    const yu = yard.geometry.attributes.uv, yp = yard.geometry.attributes.position; for (let i = 0; i < yp.count; i++) yu.setXY(i, yp.getX(i) / 2.7, yp.getY(i) / 2.7);
    // the long granite doorstep (its outer edge = the eaves' drip line), a granite seat block on it right of the door, and
    // dressed granite door jambs either side of the opening (石门框) under the lintel
    merged([boxAt(-3.68, -2.9, YARD, STEP_Y, 0.2, 3.3)], M.graniteStep, E, 1.0);
    merged([boxAt(SEAT.x0, SEAT.x1, STEP_Y, SEAT.top, SEAT.z0, SEAT.z1)], M.graniteStep, E, 0.8);
    merged([boxAt(-2.96, -2.86, DOOR.y0, DOOR.y1, DOOR.z0 - 0.13, DOOR.z0), boxAt(-2.96, -2.86, DOOR.y0, DOOR.y1, DOOR.z1, DOOR.z1 + 0.13)], M.graniteStep, H, 0.9);
    // low granite rubble wall along the seaward (south) side of the yard, and a short return
    merged([boxAt(-30, 10, YARD, 0.1, 8.6, 9.0), boxAt(9.55, 10, YARD, 0.1, -6, 8.6)], M.granite, E, 1.2);   // knee-high, so the sea reads above it
    const cliff = mesh(new THREE.PlaneGeometry(60, 8), M.dark, E, -10, -4.4, 9.5, false); cliff.rotation.x = 0.1;
    // props: water urn and a bucket at the house corner, a firewood stack north of the door
    const glaze = std({ color: 0x2f2620, roughness: 0.3 });
    mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.33, 0.2], [0.35, 0.42], [0.28, 0.66], [0.25, 0.7], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r, y)), 28), glaze, E, -3.3, YARD, 4.05);
    mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 16), M.bench, E, -3.85, YARD + 0.15, 3.62);
    for (let k = 0; k < 9; k++) { const l = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 7), M.beam, E, -3.25, YARD + 0.06 + (k % 3) * 0.085, -1.3 + Math.floor(k / 3) * 0.09 + (k % 3) * 0.045); l.rotation.x = Math.PI / 2; l.rotation.z = Math.PI / 2; l.position.x = -3.2 - 0.02 * (k % 2); }
  }
  // sky + sea (night, waning gibbous moon, gathering clouds); moon glow anchored at frame (0.80, 0.14) of S019's camera
  // ORIENTATION LOCK: harbor_eras.js copies CAM19_REF (pos/target/mm) to aim S018's end on the same moon + clouds (the S018 →
  // S019 sky match). The sky is direction-only, so S019/S041 may move the camera, but must keep exactly this view direction.
  const CAM19_REF = { pos: V3(-13.0, 1.15, 0.4), target: V3(-3.2, 0.85, 4.2), mm: 32 };
  const moonDir19 = (() => { const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, CAM19_REF.mm); cam.place(c, CAM19_REF.pos, CAM19_REF.target); c.updateMatrixWorld(); return V3(0.6, 0.72, 0.5).unproject(c).sub(c.position).normalize(); })();
  // the S019/S041 camera: same orientation, moved in so the bowl on the step (centre) lands at (0.30, 0.78), 6.5 m deep —
  // a true WS where the bending woman reads (≈ 35 % of frame height) instead of a figure lost in the facade
  const CAM19 = (() => {
    const d = CAM19_REF.target.clone().sub(CAM19_REF.pos).normalize();
    const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, CAM19_REF.mm); cam.place(c, V3(), d); c.updateMatrixWorld();
    const ray = V3(0.30 * 2 - 1, 1 - 0.78 * 2, 0.5).unproject(c).normalize();
    const P0 = BOWL_S.clone().add(V3(0, 0.04, 0)).addScaledVector(ray, -6.5 / ray.dot(d));
    return { pos: P0, target: P0.clone().addScaledVector(d, 10), mm: CAM19_REF.mm };
  })();
  const MOON_AZ = Math.atan2(moonDir19.x, -moonDir19.z) / D2R, MOON_EL = Math.asin(moonDir19.y) / D2R;
  const SKY_CH1 = { preset: 'night', moonAz: MOON_AZ, moonElev: MOON_EL, moonSize: 0.0105, moonIntensity: 3.2, moonHalo: 0.45, stars: 0.35, cloudCover: 0.58, cloudDensity: 0.88, cloudScale: 0.085, wind: [-0.0035, 0.0008], exposure: 1.0 };
  const SKY_CH2 = { ...SKY_CH1, moonIntensity: 0.3, moonHalo: 0.5, stars: 0.0, cloudCover: 0.93, cloudDensity: 0.95, cloudScale: 0.07, cloudLit: ['#5d6984', 0.34], cloudDark: ['#161d30', 0.26], horizon: ['#1a2640', 0.5], haze: ['#222c42', 0.4], hazeAmt: 0.12, wind: [-0.004, 0.001], exposure: 0.7 };
  const SKY_CH3 = { ...SKY_CH2, moonIntensity: 0.4, moonHalo: 0.35, cloudLit: ['#4c5670', 0.3], cloudDark: ['#121828', 0.24] };
  const sky = createSky(SKY_CH1); E.add(sky.object3D);
  const sea = createSea({ sky, swell: 'calm', windDir: 200, level: -5.5, cols: 96, rows: 64, foam: 0.1, defines: { NO_LAMP: '' } });
  E.add(sea.object3D);
  // review — CH2/CH3 "heavy low cloud": sky.js fades cloud cover out below ~6° elevation and gives thin cloud a silver lining
  // toward the moon, so a dense deck left a bright band of clear sky + lit fringe above the horizon (the brightest thing in
  // S041). Patched in THIS module's sky + sea shader instances only (string patch before first compile, own program): with
  // uLowCloud = 1 the deck runs down to the horizon, and the moon becomes a diffuse glow inside the cloud (no disc / lining).
  // uLowCloud = 0 (CH1, S019) leaves the shared sky plate of the S018 → S019 match unchanged.
  const uLowCloud = { value: 0 };
  {
    const patch = (src) => src
      .replace('uniform vec3 uCloudLit, uCloudDark;', 'uniform vec3 uCloudLit, uCloudDark; uniform float uLowCloud;')
      .replace('return cov * smoothstep(0.0, 0.1, d.y) * uCloudDensity;', 'return cov * mix(smoothstep(0.0, 0.1, d.y), smoothstep(-0.02, 0.0, d.y), uLowCloud) * uCloudDensity;')
      .replace('    col = mix(col, cc, cov);', '    cc += uMoonColor * uMoonHalo * uLowCloud * (0.6 * exp(-ang * ang / 0.0018) + 0.18 * exp(-ang * 6.0));\n    col = mix(col, cc, cov);');
    for (const [m, keys] of [[sky.material, ['fragmentShader']], [sea.material, ['vertexShader', 'fragmentShader']]]) {
      for (const k of keys) { const a = m[k], b = patch(a); if (a === b) console.warn('old_home: sky patch did not apply to', k); m[k] = b; }
      m.uniforms.uLowCloud = uLowCloud;
    }
    sky.uniforms.uLowCloud = uLowCloud;
  }
  const envExtA = envTexture(ctx.renderer, 'moon_exterior', { sky: SKY_CH1 });
  const envExtB = envTexture(ctx.renderer, 'moon_exterior', { sky: SKY_CH2 });
  const envInt = envTexture(ctx.renderer, 'candle_interior', { moon: 0.8 });
  const envLab = envTexture(ctx.renderer, 'night_museum', { moon: 0.6 });
  // exterior lights
  const moonDirL = new THREE.DirectionalLight(0xc8d4e6, 0.55);
  // lighting cheat (director: moon position cheats approved): the visible moon hangs low at upper right (az ≈130°, 7.6°) —
  // straight backlight. The light is swung to az 200° / 26°: still "from the right" in frame, but it rakes the west facade
  // from the south, so the granite reads, the eave throws its dark band over the upper wall, and the step's outer edge +
  // the bowl sit in moonlight just beyond the drip line.
  const moonLightDir = V3(Math.sin(200 * D2R) * Math.cos(26 * D2R), Math.sin(26 * D2R), -Math.cos(200 * D2R) * Math.cos(26 * D2R));
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
  // close-up hands swapped onto the figure's hand bones. forearmLen 0.03 = the figure's own stub: the kit's default 12 cm
  // forearm stub rides with the HAND bone, so on a flexed wrist it stuck out of the sleeve as a bare skin 'plank' at the
  // hand's angle (review: S016 end frame, view_home_hand, the folded hands read as upright sticks)
  const wifeHandL = await loadCharacterHand('WIFE', 'L', { lod: 'close', noBangle: true, noCuff: true, hand: { forearmLen: 0.03 } });
  const wifeHandR = await loadCharacterHand('WIFE', 'R', { lod: 'close', noCuff: true, hand: { forearmLen: 0.03 } });
  for (const [s, h] of [['L', wifeHandL], ['R', wifeHandR]]) { const old = wifeHi.hands[s], bone = old.root.parent; h.root.position.copy(old.root.position); h.root.quaternion.copy(old.root.quaternion); h.root.scale.copy(old.root.scale); bone.remove(old.root); bone.add(h.root); wifeHi.hands[s] = h; h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  // per-shot figure shadow casting (the candle's point-light shadow = 6 passes of every caster): body meshes vs. close-up hands
  const castLists = (fig, handRoots) => { const body = [], hands = []; const hr = new Set(); for (const h of handRoots) h.traverse((o) => hr.add(o));
    fig.root.traverse((o) => { if (o.isMesh) (hr.has(o) ? hands : body).push(o); }); return { body, hands }; };
  const child = await loadCharacter('CHILD', { lod: 'hi' });
  scene.add(child.root);
  // review: the kit's bare feet are toe-less 'sock' blobs, which read badly in S042's probe insert (the toes curl on the cold
  // stone and wiggle on '雨'). Five small toe digits per foot in the figure's own skin material, parented to the foot bones
  // (foot space: ankle origin, +Z forward, sole at y = −ankleY; the kit's toe mass ends ≈ 0.77 footL).
  const CHILD_TOES = [];
  {
    let skinM = null; child.root.traverse((o) => { if (!skinM && o.isMesh && o.material && o.material.userData && /skin/i.test(o.material.name || '')) skinM = o.material; });
    if (!skinM) skinM = (child.layers.body && child.layers.body.material) || std({ color: 0xC8956E, roughness: 0.6 });
    const P = child.P, fl = P.footL, ay = P.ankleY, H = P.H;
    for (const [side, sg] of [['L', 1], ['R', -1]]) {
      const bone = child.bone(`leg${side}.foot`);
      // big toe medial (−sg·x), little toe lateral
      const spec = [[-0.0125, 0.0068, 0.026, 0.0], [-0.0035, 0.0052, 0.021, -0.004], [0.0035, 0.0047, 0.019, -0.008], [0.0098, 0.0043, 0.017, -0.013], [0.0158, 0.0038, 0.014, -0.019]];
      spec.forEach(([x, r, len, dz], k) => {
        const pivot = new THREE.Group();
        pivot.position.set(sg * (x * H / 1.05 + 0.006 * H), -ay + r * 1.0, fl * 0.55 + dz);
        const g = new THREE.CapsuleGeometry(r, len, 4, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2);
        const toe = new THREE.Mesh(g, skinM); toe.castShadow = true; toe.receiveShadow = true; toe.scale.set(1.05, 0.82, 1);
        const rest = 0.06 + 0.03 * k;   // toes resting down on the stone, the little ones curled a touch more
        pivot.rotation.set(rest, sg * (k - 1.2) * 0.05, 0); pivot.add(toe); bone.add(pivot);
        CHILD_TOES.push({ pivot, rest, k, side: sg, big: k === 0 });
      });
    }
  }
  const CAST = { hi: castLists(wifeHi, [wifeHandL.root, wifeHandR.root]), mid: castLists(wifeMid, []), child: castLists(child, []) };
  function figShadows(mode) { // 'all' | 'hands' | 'none' for the active wife; the child always casts when visible
    for (const k of ['hi', 'mid']) { for (const m of CAST[k].body) m.castShadow = mode === 'all'; for (const m of CAST[k].hands) m.castShadow = mode !== 'none'; }
    for (const m of CAST.child.body) m.castShadow = true;
  }
  const ghost = await loadCharacter('RESTORER', { lod: 'mid' });
  G.lab.add(ghost.root);
  const gloveR = await loadCharacterHand('RESTORER', 'R', { lod: 'close' });
  const gloveTwin = await loadCharacterHand('RESTORER', 'L', { lod: 'close' });
  G.glass41.add(gloveR.root, gloveTwin.root);
  const woolM = TX.mat('wool_coat', { repeat: [1.2, 1.2] });
  const gloveSleeves = [];
  for (const h of [gloveR, gloveTwin]) { const sl = mesh(new THREE.CylinderGeometry(0.047, 0.056, 0.34, 24, 1, true), woolM, h.root, 0, 0.21, 0); sl.material = woolM.clone(); sl.material.side = THREE.DoubleSide; gloveSleeves.push(sl.material); }
  // the ghost and the twin are faint additive images (true mirror reflections of the present)
  // review: the ghost used to be drawn with additive materials, so her cream knit showed THROUGH the charcoal coat and the
  // dark hair added nothing (pale torso, bald head). Now she is rendered normally (opaque, lit by the lab lamp) into her own
  // RT and that image is added onto the glass (ghostPlate, S017) — a real reflection: the coat occludes the knit, the hair
  // reads as a dark mass with the lamp's rim on it. The hair is lifted a touch so the head keeps its shape against the room.
  ghost.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  if (ghost.layers.hair && ghost.layers.hair.material && ghost.layers.hair.material.color) ghost.layers.hair.material.color.multiplyScalar(2.4);
  const fadeMats = (root) => { const out = []; root.traverse((o) => { if (o.isMesh) { o.castShadow = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.transparent = true; out.push(m); } } }); return out; };
  const gloveMats = fadeMats(gloveR.root), twinMats = fadeMats(gloveTwin.root);
  for (const m of gloveMats) if (m.emissive) { m.emissive.setHex(gloveSleeves.includes(m) ? 0x050506 : 0x2a1a0c); m.emissiveIntensity = 1; }   // warm glow of the case through the glass on the glove (no extra light); review: the charcoal coat sleeve had the same warm emissive and read orange-brown
  for (const m of twinMats) { m.blending = THREE.AdditiveBlending; m.depthWrite = false; }

  // ---- props held / used by the wife: the step bowl (empty), the indigo cuff + patch, needle, thread, thimble
  const bowlS = new THREE.Group(); scene.add(bowlS);
  mesh(bowlGeo, porcelain, bowlS).castShadow = true;
  // S042 cut-in (review): her mended cloth shoe + the hem of her dark indigo skirt as a PROP beside the bowl. The seated
  // figure slid there by the old footAt cheat hovered in front of the seat block with bare shin showing above the shoe.
  // 布鞋: black cloth upper, layered cotton sole (#cfc6b4), a darned patch with pale stitches on the toe (PROP: 鞋面有补过的针脚).
  const shoeG = new THREE.Group(); shoeG.visible = false; scene.add(shoeG);
  {
    const tc = canvas(256, 128), tg = tc.getContext('2d'); tg.fillStyle = '#2A2624'; tg.fillRect(0, 0, 256, 128);
    const N = TX.makeNoise(17), id = tg.getImageData(0, 0, 256, 128), dd = id.data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 4, k = 0.85 + 0.12 * N.n(x / 3, y / 1.5, 85, 85) + 0.08 * ((x + y) % 3 === 0 ? 1 : 0); dd[i] *= k; dd[i + 1] *= k; dd[i + 2] *= k; }
    tg.putImageData(id, 0, 0);
    // darn on the toe: the toe end of the upper is u ≈ 0.25 (+Z) of the sphere map, v ≈ 0.55–0.75 (canvas rows 32–58)
    tg.fillStyle = '#3a3430'; tg.beginPath(); tg.ellipse(64, 46, 17, 11, 0.2, 0, 7); tg.fill();
    tg.strokeStyle = 'rgba(214,204,186,0.85)'; tg.lineWidth = 1.3;
    for (let k = -3; k <= 3; k++) { tg.beginPath(); tg.moveTo(52 + k * 1.5, 38 + k * 2.6); tg.lineTo(76 + k * 1.5, 41 + k * 2.6); tg.stroke(); }
    for (let k = -4; k <= 4; k++) { tg.beginPath(); tg.moveTo(62 + k * 3.2, 35); tg.lineTo(66 + k * 3.2, 57); tg.stroke(); }
    const upM = std({ map: ctex(tc, true, false), roughness: 0.95 });
    const soleM = std({ color: 0xcfc6b4, roughness: 0.9 });
    const fp = new THREE.Shape(); { const L = 0.232, W1 = 0.044, W2 = 0.034; fp.moveTo(0, -L / 2); fp.bezierCurveTo(W2, -L / 2, W2, -L * 0.1, W1, L * 0.12); fp.bezierCurveTo(W1, L * 0.42, 0.016, L / 2, 0, L / 2); fp.bezierCurveTo(-0.018, L / 2, -W1 - 0.004, L * 0.42, -W1, L * 0.12); fp.bezierCurveTo(-W2, -L * 0.1, -W2, -L / 2, 0, -L / 2); }
    for (const [dx, dz, ry] of [[0, 0, 0], [0.11, -0.05, 0.12]]) {   // near shoe (in frame) + the other one beside it
      const one = new THREE.Group(); one.position.set(dx, 0, dz); one.rotation.y = ry; shoeG.add(one);
      const sole = new THREE.Mesh(new THREE.ExtrudeGeometry(fp, { depth: 0.022, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 18 }), soleM);
      sole.rotation.x = Math.PI / 2; sole.position.y = 0.024; sole.castShadow = sole.receiveShadow = true; one.add(sole);
      const up = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), upM);
      up.scale.set(0.043, 0.052, 0.112); up.position.set(0, 0.022, 0.004); up.castShadow = up.receiveShadow = true; one.add(up);
    }
    // the skirt hem falling to just above the step behind the shoes (dark indigo, soft folds), two-sided
    const hemG = new THREE.CylinderGeometry(0.1, 0.125, 0.42, 40, 6, true, -Math.PI * 0.9, Math.PI * 1.8), hp = hemG.attributes.position;
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), z = hp.getZ(i), y = hp.getY(i), a = Math.atan2(x, z), k = 1 + 0.06 * Math.sin(a * 9 + 0.7) * (0.6 - y) + 0.03 * Math.sin(a * 23); hp.setX(i, x * k); hp.setZ(i, z * k); }
    hemG.computeVertexNormals();
    const hem = new THREE.Mesh(hemG, TX.mat('cotton', { repeat: [3, 2], tex: { tone: [34, 40, 58], seed: 12 }, color: 0x22283A, side: THREE.DoubleSide, roughness: 0.95 }));
    hem.position.set(0.06, 0.25, -0.1); hem.castShadow = hem.receiveShadow = true; shoeG.add(hem);
  }
  // the navigator's indigo jacket in her lap, its RIGHT sleeve end turned back so the inside of the cuff faces up: the pale-blue
  // patch (PROP_PATCH 4.5 × 6 cm, #7D9CBB, running stitches #E9E4D6, one corner uneven with a double knot) sewn there.
  // cuffG origin = centre of the cuff opening; local +X = out of the cuff along the sleeve axis, +Y = up, +Z = toward her.
  const cuffG = new THREE.Group(); scene.add(cuffG);
  {
    const ind = TX.mat('indigo', { repeat: [0.5, 0.5], tex: { seed: 3 } }); ind.side = THREE.DoubleSide;
    const lin = TX.mat('indigo', { repeat: [0.5, 0.5], tex: { seed: 9 }, color: 0x9aa6bc }); lin.side = THREE.DoubleSide;   // the cloth's paler inner face
    const tube = mesh(new THREE.CylinderGeometry(0.05, 0.057, 0.24, 28, 1, true), ind, cuffG, -0.18, -0.004, 0); tube.rotation.z = Math.PI / 2; tube.scale.set(1, 1, 0.72);
    const band = mesh(new THREE.CylinderGeometry(0.0605, 0.0595, 0.062, 32, 1, true), lin, cuffG, -0.031, 0, 0); band.rotation.z = Math.PI / 2; band.scale.set(1, 1, 0.76);
    const roll = mesh(new THREE.TorusGeometry(0.0605, 0.0055, 8, 32), ind, cuffG, 0.0, 0, 0); roll.rotation.y = Math.PI / 2; roll.scale.set(1, 0.76, 1);
    const roll2 = mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 32), lin, cuffG, -0.062, 0, 0); roll2.rotation.y = Math.PI / 2; roll2.scale.set(1, 0.76, 1);
    // the rest of the jacket over her thighs: a soft, folded cloth mass behind the sleeve (mostly below frame)
    const lapG = new THREE.PlaneGeometry(0.42, 0.34, 18, 14), lp = lapG.attributes.position;
    for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, 0.018 * Math.sin(x * 23 + y * 7) + 0.012 * Math.sin(y * 31 - x * 5) - 0.6 * (y + 0.17) ** 2); }
    lapG.computeVertexNormals();
    // (the jacket's body lies on her lap below frame; not modelled)
    // the patch on the turned-back band, facing up (a curved segment of the band's outer surface)
    const pc = canvas(256, 320), pg = pc.getContext('2d'); pg.fillStyle = '#7D9CBB'; pg.fillRect(0, 0, 256, 320);
    const N = TX.makeNoise(4); const id = pg.getImageData(0, 0, 256, 320), dd = id.data;
    for (let y = 0; y < 320; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 4, k = 0.88 + 0.1 * N.n(x / 6, y / 2, 43, 160) + 0.06 * N.n(x / 2, y / 6, 128, 54) + 0.05 * ((x + y) % 4 < 2 ? 1 : -1); dd[i] *= k; dd[i + 1] *= k; dd[i + 2] *= k; }
    pg.putImageData(id, 0, 0);
    pg.strokeStyle = 'rgba(40,52,72,0.55)'; pg.lineWidth = 5; pg.strokeRect(6, 6, 244, 308);                                   // the folded-under edge
    pg.strokeStyle = '#ECE7DA'; pg.lineWidth = 3.2; pg.setLineDash([15, 13]); pg.strokeRect(20, 20, 216, 280); pg.setLineDash([]);   // running stitch ~3 mm
    pg.beginPath(); pg.moveTo(222, 300); pg.lineTo(236, 288); pg.lineTo(229, 279); pg.stroke();                                     // the uneven corner…
    pg.beginPath(); pg.arc(238, 300, 4.5, 0, 7); pg.stroke(); pg.beginPath(); pg.arc(244, 292, 3.8, 0, 7); pg.stroke();             // …with the double knot
    const pr = 0.0615, pth = 0.045 / pr;
    // the patch sits between 'up' and the camera side (−Z) of the band
    const patch = mesh(new THREE.CylinderGeometry(pr, pr, 0.06, 12, 1, true, 0.72 * Math.PI - pth / 2, pth), std({ map: ctex(pc, true, false), roughness: 0.92, side: THREE.DoubleSide }), cuffG, -0.031, 0, 0, false);
    patch.rotation.z = Math.PI / 2; patch.scale.set(1, 1, 0.76);
    cuffG.userData.patch = patch;
    cuffG.userData.knot = V3(-0.006, 0.047 * 0.6, -0.034);   // the double-knot corner (cuff space), where the thread leaves the patch
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
    mesh(new THREE.BoxGeometry(0.022, 1.4, 0.04), white, G.lab, 0.38, 0, GLASS_Z + 0.02);            // the next one (six-over-six grid)
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
  const RTG_W = 800, RTG_H = 334, rtG = ctx.makeRT(RTG_W, RTG_H), ghostCam = new THREE.PerspectiveCamera(30, RTG_W / RTG_H, 0.05, 40);
  const ghostPlate = mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rtG.texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.2, alphaTest: 0.04, depthWrite: true, toneMapped: false, fog: false }), G.lab, 0, 0, -6.2, false);
  ghostPlate.renderOrder = 25;
  { const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, 75); const hh = Math.tan(c.fov * D2R / 2) * 6.2; ghostPlate.scale.set(hh * 2 * 2.39, hh * 2, 1); }
  const labLamp = new THREE.SpotLight(0xffd6ae, 4.0, 6, 0.6, 0.8, 2); labLamp.position.set(-1.0, 1.2, 0.6); labLamp.target.position.set(0, 0, GLASS_Z); G.lab.add(labLamp, labLamp.target);
  const ghostKey = new THREE.SpotLight(0xffd2a0, 1.6, 3.0, 0.5, 0.7, 2); ghostKey.position.set(-0.85, 0.55, -2.45); G.lab.add(ghostKey, ghostKey.target);
  const labHemi = new THREE.HemisphereLight(0x223048, 0x0a0806, 0.15); G.lab.add(labHemi);

  // ================================================================ S041 vitrine-glass layer (G3c, modern) in front of S019's camera
  const dir19 = CAM19.target.clone().sub(CAM19.pos).normalize();
  const GL41_D = 1.38;                                       // glass plane distance ahead of S019's camera position (glove ≈ 25 % of frame height)
  const glassMat41 = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { k: { value: 0.85 }, dustK: { value: 1 }, uNoise: { value: TX.noiseTexture() }, uSm: { value: TX.glassSmudge({ seed: 31, prints: 2, wipes: 1, dust: 0.7 }).map } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform float k, dustK; uniform sampler2D uNoise, uSm;
      void main(){
        vec2 p = vUv;
        vec3 velvet = vec3(0.006, 0.008, 0.013);
        // the open rattan case and the faded violet stamp far behind the glass, deeply defocused (soft blobs)
        float caseG = exp(-pow(length((p - vec2(0.62, 0.48)) * vec2(7.5, 5.5)), 2.0));    // review: rounder (was a 3.6:1 streak that read as a lens flare)
        float stamp = exp(-pow(length((p - vec2(0.60, 0.50)) * vec2(22.0, 10.0)), 2.0));
        float edge = smoothstep(0.035, 0.0, p.y) * 0.6 + smoothstep(0.03, 0.0, 1.0 - p.x) * 0.4;     // moon-silver highlight along the pane edge
        vec3 col = velvet + vec3(0.20, 0.13, 0.065) * caseG * 0.75 + vec3(0.10, 0.075, 0.14) * stamp * 0.6 + vec3(0.09, 0.1, 0.12) * edge;
        vec4 sm = texture2D(uSm, p * vec2(1.6, 0.8));
        col += vec3(0.05, 0.055, 0.065) * (sm.r * 0.4 + sm.b * 0.8) * dustK;   // dust & smudge catching the gallery light
        gl_FragColor = vec4(col, k); }`,
  });
  const glass41 = mesh(new THREE.PlaneGeometry(2.1, 0.95), glassMat41, G.glass41, 0, 0, 0, false); glass41.renderOrder = 60;
  glass41.position.copy(CAM19.pos).addScaledVector(dir19, GL41_D); glass41.lookAt(CAM19.pos);
  // the glove is lit only from the case behind the glass (3000 K glow through the pane → warm rim, back of the hand in shadow)
  const gl41Key = new THREE.SpotLight(0xffc890, 0.9, 2.5, 0.8, 0.9, 2); G.glass41.add(gl41Key, gl41Key.target); gl41Key.visible = false;   // (kept for A/B; the glove is self-lit below)

  // ================================================================ RAIN (view_home_rain; CH3)
  lampOut.object3D.updateMatrixWorld(true); const lampOutWorld = lampOut.object3D.localToWorld(V3(0.043, 0.06, 0));   // (matrixWorld is stale at build time without the update)
  const dripPts = []; for (let z = -2.6; z < ROOF_Z1 - 0.05; z += 0.13) dripPts.push([-EAVE_X - 0.005, EAVE_Y - 0.02, z + 0.03 * Math.sin(z * 7)]);
  const drips = FX.drips({ points: dripPts, toY: STEP_Y, period: [0.35, 0.9], size: 0.0035, intensity: 0.5, lamp: { position: lampOutWorld, color: 0xE2A458, intensity: 1.6 } });
  G.rain.add(drips.object3D);
  const rainFx = FX.rain({ center: [-7, 1.2, 1.5], size: [7.0, 3.6, 9], count: 5200, speed: 7.0, wind: [0.4, 0.15], intensity: 0.3, lamp: { position: lampOutWorld, color: 0xE2A458, intensity: 3.0 } });
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
    figShadows(o.figShadow || 'all');
    moonWL.light.castShadow = isInt && o.moonShadowIn !== false;
    moonWL.update(ctx.T, { intensity: o.moonI ?? 11 });
    if (moonWL.bounce) moonWL.bounce.visible = isInt && o.bounce !== false;
    tableBounce.visible = isInt && o.bounce !== false;
    lampIn.light.visible = false;                                   // the reveal-niche lamp reads by its flame alone (S035 lights its niche)
    sewFill.visible = false; candle.light.distance = 0; uLowCloud.value = 0;
    moonDirL.castShadow = isExt && o.moonShadow !== false;
    sky.object3D.visible = isExt && o.sky !== false; sea.object3D.visible = isExt && o.sea !== false;
    lampIn.object3D.visible = isInt && !!o.lampIn;
    farCandle.visible = isExt;
    wife = o.wife === 'mid' ? wifeMid : wifeHi;
    wifeHi.root.visible = o.wife !== false && o.wife !== 'mid'; wifeMid.root.visible = o.wife === 'mid'; child.root.visible = !!o.child; bowlS.visible = isExt && o.bowlS !== false; cuffG.visible = isInt && !!o.sew;
    needle.visible = thread.visible = thimble.visible = !!o.sew; stand.visible = isInt && !!o.sew;
    bowlT.visible = isInt && o.bowlT !== false; shoeG.visible = false;
    bowlT.position.copy(BOWL_T); bowlT.userData.chop.rotation.y = -Math.PI / 4; bowlT.userData.chop.position.x = 0;   // (view_home_hand moves them)
    // purity: everything a setup may change is re-set here (frames render out of order, in parallel processes)
    doorPivot.rotation.y = -0.95; intHemi.intensity = 0.06;
    stool.position.set(S35.x - Math.sin(S35.yaw) * 0.03, 0, S35.z - Math.cos(S35.yaw) * 0.03); stool.rotation.y = S35.yaw;   // the low stool under the window
    basket.position.set(S35.x + 0.42, 0, S35.z - 0.3);
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
  // turn: head yaw toward her own left (= away from a camera on the +Z side): 0.32 (review) puts the face into a 3/4-back
  // view — the candle rims the cheek and nose line from beyond, the face itself stays unresolved (bible: 脸永不完全清晰)
  function wifeAtTable(T0, { breath = 1, sigh = 0, lean = 0, look = null, turn = 0.06 } = {}) {
    wife.root.position.set(-BENCH_X - 0.035, 0, TABLE.z + 0.09); wife.root.rotation.set(0, Math.PI / 2, 0);
    wife.pose('sit_bench', { seat: BENCH_TOP + 0.005, feet: 0.1, lean: 0.0, hands: 'none' });
    wife.pose({ 'spine.x': -0.04 + lean * 0.5, 'chest.x': -0.03 + lean * 0.4, 'neck.x': 0.16, 'head.x': 0.14, 'neck.y': 0.4 * (turn - 0.06), 'head.y': turn - 0.4 * (turn - 0.06) }, { add: true });
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
  const doorCard = mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: roomGlow, color: new THREE.Color(0.16, 0.085, 0.035), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), E, -1.6, 0.95, 0.6, false);
  doorCard.rotation.y = -Math.PI / 2 + 0.25;   // the warm candle-lit room as seen through the door (cheap stand-in for the interior light)
  const yardRough0 = 1.0;
  function exterior(T0, ch, tl, o = {}) {
    mode('ext', { seeInside: o.seeInside !== false, wife: o.wife === undefined ? 'mid' : o.wife, child: o.child, glass41: o.glass41, rain: o.rain, env: ch === 'ch1' ? envExtA : envExtB, moonShadow: ch === 'ch1', sky: o.sky, sea: o.sea });
    sky.set(ch === 'ch1' ? SKY_CH1 : ch === 'ch2' ? SKY_CH2 : SKY_CH3); sky.update(T0); uLowCloud.value = ch === 'ch1' ? 0 : 1;
    let mI = ch === 'ch1' ? 0.75 : ch === 'ch2' ? 0.16 : 0.06;
    if (ch === 'ch1') { const dip = Math.sin(clamp((T0 - T.S019 - 0.3) / 1.0) * Math.PI); mI *= 1 - 0.3 * dip; sky.uniforms.uMoonIntensity.value = SKY_CH1.moonIntensity * (1 - 0.65 * dip); sky.uniforms.uMoonHalo.value = SKY_CH1.moonHalo * (1 + 0.6 * dip); }
    moonDirL.intensity = mI;
    extHemi.intensity = ch === 'ch1' ? 0.32 : ch === 'ch2' ? 0.42 : 0.3;
    yardBounce.intensity = ch === 'ch1' ? 1.4 * (mI / 0.75) : ch === 'ch2' ? 0.5 : 0.25;
    yardBounce.visible = o.yb ?? ch === 'ch1';           // light economy: every visible light is evaluated on every lit pixel
    doorGlow.intensity = 1.6 * util.flicker(T0, 9);
    const damp = ch === 'ch1' ? 0 : ch === 'ch2' ? 0.55 : 1;
    M.yard.roughness = yardRough0 - 0.45 * damp; M.graniteStep.roughness = 1 - 0.5 * damp;
    M.yard.color.setHex(0x8e8e8c).multiplyScalar(1 - 0.25 * damp); M.graniteStep.color.setHex(0xb4ada3).multiplyScalar(1 - 0.2 * damp);
    fog.density = ch === 'ch1' ? 0.006 : 0.012; fog.color.setHex(ch === 'ch1' ? 0x1b2638 : 0x1e2533);
    // the candle on the table, seen through the door (state C on PRE1/CH1 nights, the stub D later)
    const fy = 0.012 + (ch === 'ch1' ? 0.06 : 0.025) + 0.006;
    farCandle.position.set(CANDLE_T.x, CANDLE_T.y + fy, CANDLE_T.z); farCandle.material.uniforms.uT.value = T0;
    farGlow.object3D.position.copy(farCandle.position).add(V3(0, 0.015, 0)); farGlow.set(0.55 * util.flicker(T0, 3));
    setCandle(ch === 'ch1' ? 'C' : 'D', T0); candle.object3D.position.copy(CANDLE_T);
    bowlS.position.copy(BOWL_S); bowlS.rotation.set(0, Math.PI / 2 + 0.4, 0);
    water.object3D.visible = ch === 'ch3';
  }
  function lampLit(on, light = true) { for (const o of lampOutFlame) o.visible = on; lampOut.light.visible = on && light; }

  // ---- S019: she has bent to set the bowl on the step's outer edge (contact 0.72 s, palm lifts 1.14 s)
  function wifePlaceBowl(tl, T0) {
    const W = wife;
    W.root.position.set(BOWL_S.x + 0.34, STEP_Y, BOWL_S.z + 0.17); W.root.rotation.set(0, -Math.PI / 2 - 0.32, 0);
    W.pose('stand', { weight: 0.2 });
    // a deep crouch-bend (knees well bent, back rounded over the step's edge): her shoulder comes within arm's reach of a
    // point 10 cm above the step; thighs flex by hb + their own angle so the knees stay forward of the feet
    // review: a real squat (蹲) — thighs above horizontal, knees forward of the ankles, heels just lifting, back inclined
    // ~65° with the head bowed over the bowl. The old pose folded the trunk ~107° (head between the knees, hair hanging to
    // the step), which read as a doubled-over mannequin at WS.
    W.pose({ 'hips.x': 0.74, 'spine.x': 0.36, 'chest.x': 0.26, 'neck.x': 0.06, 'head.x': 0.3,
      'legL.upper.x': 1.95, 'legR.upper.x': 1.82, 'legL.lower.x': 2.3, 'legR.lower.x': 2.2, 'legL.foot.x': 0.55, 'legR.foot.x': 0.5, 'legL.upper.z': 0.1, 'legR.upper.z': 0.06 }, { add: true });
    W.root.updateMatrixWorld(true); settleFeetAt(W, STEP_Y, BOWL_S.x + 0.36, BOWL_S.z + 0.19); W.breathe(T0, 0.8);
    const lower = ease.inOutSine(clamp(tl / 0.72)), settle = tl > 0.72 ? 0.004 * Math.exp(-(tl - 0.72) * 18) * Math.sin((tl - 0.72) * 40) : 0;
    const h = 0.10 * (1 - lower) + Math.max(0, settle);
    bowlS.position.copy(BOWL_S).add(V3(0, h, 0)); bowlS.updateMatrixWorld(true);
    const lift = ease.inOutSine(clamp((tl - 1.14) / 0.2));
    const rim = bowlS.localToWorld(V3(0, TX.BOWL.H, 0)).add(V3(0.07, 0, 0.0));
    const wrist = rim.clone().add(V3(0.055 + 0.02 * lift, 0.055 + 0.08 * lift, 0.01));
    W.reach('R', wrist, { palm: V3(-0.6, -0.8, 0).normalize(), fingers: V3(-0.55, -0.8, 0.1).normalize(), elbowOut: 0.3 });
    W.hands.R.pose('cupped');
    const knee = W.worldPos('legL.lower');
    W.reach('L', knee.clone().add(V3(-0.05, 0.07, 0.02)), { palm: DOWN, fingers: V3(-0.8, -0.5, 0.1).normalize(), elbowOut: 0.4 });
    W.hands.L.pose('relaxed', { curl: 0.6 });
    if (typeof window !== 'undefined' && window.__OHLOG) console.log('OH bowl19 target=' + wrist.toArray().map((x) => x.toFixed(3)) + ' got=' + W.worldPos('armR.hand').toArray().map((x) => x.toFixed(3)) + ' sh=' + W.worldPos('armR.upper').toArray().map((x) => x.toFixed(3)));
  }
  // seated on the granite seat block right of the door, turned toward the sea (screen right), the bowl on the step at her
  // left. footAt (S042 cut-in only): slide the figure so her right (near) shoe rests at that point beside the bowl.
  function wifeOnDoorstone(T0, { breathAt = null, yaw = -0.45, footAt = null } = {}) {
    const W = wife;
    W.root.position.set((SEAT.x0 + SEAT.x1) / 2 + 0.02, STEP_Y, (SEAT.z0 + SEAT.z1) / 2 - 0.02); W.root.rotation.set(0, yaw, 0);
    W.pose('sit_bench', { seat: SEAT.top - STEP_Y + 0.005, feet: 0.06, lean: 0.2, hands: 'knees' });
    W.pose({ 'neck.y': -0.1, 'head.y': -0.12, 'head.x': -0.08, 'neck.x': 0.02, 'legR.upper.y': 0.12, 'legL.upper.y': 0.08 }, { add: true });   // looking out past the eave toward the sea
    W.root.updateMatrixWorld(true); settleFeet(W, STEP_Y);   // the sit pose's legs fall a few cm short of this low seat → feet down on the step
    if (footAt) { const f = W.worldPos('legR.foot'); W.root.position.x += footAt.x - f.x; W.root.position.z += footAt.z - f.z; W.root.updateMatrixWorld(true); }
    const b = breathAt ? Math.exp(-(((T0 - breathAt) / 0.7) ** 2)) : 0;
    W.breathe(T0, 0.9 + 2.2 * b, 0.22);
  }
  // ---- S042 (review re-stage): the child stands just inside the door, hidden by the jamb; ~0.6 s steps onto the threshold
  // (feet appear at the TOP of the low probe frame, out of the dark doorway — 139.02 '等' ≈ 0.85 s), steps down onto the step
  // and trots two steps to the spot between the bowl and her shoe, settled by ~1.2 s, facing the lens; 1.5 s the toes curl
  // and wiggle (sculpted toe digits, see CHILD_TOES). Pure function of tl.
  const S42 = (() => {
    const pos = V3(-3.645, STEP_Y + 0.045, 2.24), yaw = 30.2 * D2R, pitch = -4.2 * D2R;
    const d = V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const flat = V3(Math.sin(yaw), 0, -Math.cos(yaw)), right = V3(Math.cos(yaw), 0, Math.sin(yaw));
    const at = (along, lat) => pos.clone().setY(STEP_Y).addScaledVector(flat, along).addScaledVector(right, lat);
    return { pos, target: pos.clone().addScaledVector(d, 2), spot: at(0.44, 0.025), toe: at(0.5, 0.215), flat, right,
      A: V3(-2.62, 0, 1.95), B: V3(-2.80, DOOR.y0, 1.42), Cp: V3(-3.06, STEP_Y, 1.62) };
  })();
  function childFeet(tl, T0) {
    const C = child, { A, B, Cp, spot } = S42;
    const s0 = smoothstep(0.2, 0.62, tl), s1 = smoothstep(0.62, 0.8, tl), s2 = smoothstep(0.8, 1.2, tl);
    let p, ground, dir;
    if (s1 <= 0) { p = A.clone().lerp(B, s0); ground = lerp(0, DOOR.y0, smoothstep(0.7, 1, s0)); dir = B.clone().sub(A); }
    else if (s2 <= 0) { p = B.clone().lerp(Cp, s1); ground = lerp(DOOR.y0, STEP_Y, smoothstep(0.2, 0.9, s1)); dir = Cp.clone().sub(B); }
    else { p = Cp.clone().lerp(spot, s2); ground = STEP_Y; dir = spot.clone().sub(Cp); }
    const walkHead = Math.atan2(dir.x, dir.z), faceLens = Math.atan2(S42.pos.x - spot.x, S42.pos.z - spot.z);   // settle facing the lens
    let head = walkHead; if (s2 > 0) head = walkHead + (((faceLens - walkHead + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * smoothstep(0.55, 1, s2);
    C.root.position.copy(p); C.root.rotation.set(0, head, 0);
    const prog = s0 * 0.9 + s1 * 0.6 + s2 * 1.2, moving = tl > 0.2 && tl < 1.2;
    if (moving) C.pose('walk', { phase: prog % 1, stride: 0.7 * (1 - 0.7 * smoothstep(0.75, 1, s2)) });
    else C.pose('stand', { weight: -0.15 });
    if (!moving || s2 > 0.7) C.pose({ 'legL.upper.y': -0.22 * (moving ? smoothstep(0.7, 1, s2) : 1), 'legR.upper.y': -0.22 * (moving ? smoothstep(0.7, 1, s2) : 1) }, { add: true });   // a small child's feet stand straight / slightly pigeon-toed (the kit stance toes out ~25°, which read as sideways feet at the probe's grazing angle)
    C.root.updateMatrixWorld(true);
    settleFeet(C, ground);
    C.breathe(T0, 1.0, 0.35);
    if (typeof window !== 'undefined' && window.__OHLOG) { const b = C.bone('legL.foot'); b.updateWorldMatrix(true, false); const o = b.localToWorld(V3()), f = b.localToWorld(V3(0, 0, 0.1)).sub(o); console.log('OH child head=' + head.toFixed(2) + ' footFwd=' + f.toArray().map((x) => x.toFixed(3)) + ' rootFwd=' + V3(0, 0, 1).applyQuaternion(C.root.quaternion).toArray().map((x) => x.toFixed(2)) + ' toLens=' + S42.pos.clone().sub(spot).setY(0).normalize().toArray().map((x) => x.toFixed(2))); }
    // toes: curl at 1.5 s, then a quick wiggle (139.68 '雨' ≈ 1.51 s)
    const w = Math.exp(-(((tl - 1.52) / 0.14) ** 2)), wig = w * Math.sin((tl - 1.4) * 34);
    for (const t of CHILD_TOES) t.pivot.rotation.x = t.rest + 0.5 * w * (t.big ? 0.7 : 1) + 0.18 * wig * (t.side > 0 ? 1 : -1) * (t.k % 2 ? 1 : 0.6);
  }
  // ---- S035: mending the patch on the low stool under the window
  const C35 = { pos: V3(2.3, 0.78, -0.25), target: V3(0.347, 0.908, 0.164) };
  // review: moved 0.2 m west / 0.65 m south (beside the table's south-east corner) so the locked 75 mm can stand back far
  // enough for mouth (0.66, 0.30) + needle hand (0.54, 0.58) in one CU (the east wall stopped it at ~1.5 m before); the
  // lattice moon is cheated round to still cross her shoulder. The 'mouth' point was ~4 cm low (under the chin): fixed.
  const S35 = { x: 0.62, z: 0.55, yaw: 0.3 }, MOON_S35 = V3(-0.85, -0.42, 0.40).normalize();   // near-profile to a camera on her left (window side), head bowed over the work
  const C42 = { pos: V3(-3.88, -0.11, 1.35), target: V3(-1.882, -0.027, 1.312) };
  const S42_WIFE = { yaw: -1.2, footAt: V3(-3.43, 0, 2.34) };   // S042 cut-in: her near shoe beside the bowl
  const CHAND = { pos: V3(0.62, 1.16, 0.62), target: V3(0.12, 0.88, 0.06) }, CRAIN = { pos: V3(-6.0, 0.62, 2.55), target: V3(-3.3, 0.45, 0.95) };
  function wifeSewing(tl, T0) {
    const W = wife, yaw = S35.yaw;
    W.root.position.set(S35.x, 0, S35.z); W.root.rotation.set(0, yaw, 0);
    stool.position.set(S35.x - Math.sin(yaw) * 0.03, 0, S35.z - Math.cos(yaw) * 0.03); stool.rotation.y = yaw;
    basket.position.set(S35.x + 0.42, 0, S35.z - 0.3);
    if (S35.candle) stand.position.set(S35.candle.x, 0, S35.candle.z);
    W.pose('sit_chair', { seat: 0.32, feet: 0.12, lean: 0.22, hands: 'none' });
    const bite = Math.sin(Math.PI * clamp((tl - 0.2) / 0.44));             // she lifts the cuff and bites the thread off ('红' 0.54 s)
    const smile = smoothstep(0.62, 1.05, tl) * (1 - 0.35 * smoothstep(1.2, 1.7, tl));
    const glance = ease.inOutSine(clamp((tl - 1.17) / 0.32));              // 15° toward the open door (screen left)
    W.pose({ 'neck.x': 0.24 - 0.05 * smile + 0.06 * bite, 'head.x': 0.24 + 0.05 * bite - 0.1 * smile, 'head.z': 0.06 * smile, 'neck.y': -0.1 * glance, 'head.y': -0.17 * glance }, { add: true });
    W.root.updateMatrixWorld(true); W.breathe(T0, 0.8);
    const hbn = W.bone('head'); hbn.updateWorldMatrix(true, false);
    const mouthW = V3(0, 0.33 * W.P.hu - 0.062, 0.45 * W.P.hu).applyMatrix4(hbn.matrixWorld);
    const q = W.root.quaternion, fwdW = V3(0, 0, 1).applyQuaternion(q), leftW = V3(1, 0, 0).applyQuaternion(q);
    // the cuff: held in front of her chest (sleeve axis across her body, opening toward her left hand), lifted to her mouth for the bite
    const chest = W.worldPos('chest');
    const rest = mouthW.clone().addScaledVector(fwdW, 0.1).addScaledVector(leftW, -0.04).add(V3(0, -0.125, 0));   // review: centred under her face / a little to her right, so the needle arm comes straight forward from her right side (hidden behind the work) instead of crossing her body in front of the lens   // held up just under her bowed face, close to the light
    const atMouth = mouthW.clone().addScaledVector(fwdW, 0.035).addScaledVector(leftW, -0.03).add(V3(0, -0.035, 0));
    const cuffC = rest.clone().lerp(atMouth, 0.85 * bite);
    cuffG.position.copy(cuffC);
    // sleeve axis across the frame (world ≈ south, a little toward the camera), the cuff end to her right-front, tipping up to
    // her mouth for the bite; the turned-back band's patch faces up toward her eyes and the slightly-high camera
    {
      const ax = fwdW.clone().addScaledVector(leftW, -0.1).normalize(), tilt = 0.2 + 0.6 * bite;   // the sleeve points away from her across the frame (review: was 0.35 toward the camera → the cuff opening faced the lens)
      const X = ax.clone().multiplyScalar(Math.cos(tilt)).add(V3(0, Math.sin(tilt), 0)), Y = V3(0, 1, 0).addScaledVector(X, -X.y).normalize();
      const Z = V3().crossVectors(X, Y);
      cuffG.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
      cuffG.rotateX(-0.7);                                                   // roll the patch toward the camera (review: was −0.35 — the patch faced the ceiling, unlit)
    }
    cuffG.updateMatrixWorld(true);
    const cw = (x, y, z) => cuffG.localToWorld(V3(x, y, z)), cd = (x, y, z) => V3(x, y, z).applyQuaternion(cuffG.quaternion).normalize();
    // left hand (bangle on the wrist, thimble on the middle finger) under the sleeve on the camera side, palm up, fingers curling
    // round it; right hand comes from the far side and pinches the needle above the patch's knotted corner
    const poleL = V3(0.35, -1, -0.25).applyQuaternion(q), poleR = V3(-0.8, -0.6, -0.3).applyQuaternion(q);   // reach() pole = elbow DIRECTION: left elbow down/out/back below the work, right elbow out to her right side (the needle arm comes over the top from the far side)
    // review re-stage: the LEFT hand holds the sleeve from below on the camera side, toward her body (screen right of the
    // patch) — wrist + bangle in view, fingers curling up the near side so the thimbled middle finger shows at the band's
    // lower edge; the RIGHT hand comes from ABOVE the cuff end (fingers down), so it no longer covers the patch, and pulls
    // the thread up out of the knotted corner. (Cuff space: +X = out of the cuff = screen left, +Y up, −Z toward the camera.)
    W.reach('L', cw(-0.15, -0.06, -0.075), { palm: cd(0.0, 1, 0.45), fingers: cd(0.2, 0.25, 1), pole: poleL });
    W.hands.L.pose('cupped');
    const pull = Math.sin(clamp(tl / 0.22) * Math.PI * 0.5) * (1 - 0.6 * bite) * (1 - 0.85 * smoothstep(0.6, 1.05, tl));   // last pull of the thread (0–0.22 s), then the needle hand settles back on the work
    // the needle hand BEHIND the work: thumb + index pinch the needle just above the band's far edge over the knotted corner,
    // so the patch faces the lens unobstructed and the right wrist / wide sleeve stay hidden behind the cuff
    const pinch = cw(0.012, 0.042 + 0.03 * pull, 0.07);
    const fR = cd(0.1, 0.92, -0.2);                                         // fingers UP just beyond the band's far edge: wrist + sleeve hidden behind the cuff
    W.reach('R', pinch.clone().addScaledVector(fR, -0.085), { palm: cd(-0.5, 0.0, -0.85), fingers: fR, pole: poleR });
    W.hands.R.pose('pinch');
    W.root.updateMatrixWorld(true);
    const tip = needle.localToWorld(V3(0, 0.02, 0)), knot = cw(...cuffG.userData.knot.toArray());
    const tp = threadGeo.attributes.position; tp.setXYZ(0, knot.x, knot.y, knot.z); tp.setXYZ(1, tip.x, tip.y, tip.z); tp.needsUpdate = true; threadGeo.computeBoundingSphere();
    thread.visible = tl < 0.52;
  }
  // ---- view_home_hand: her left hand straightens the chopsticks before the empty seat
  // view_home_hand (seen from the empty seat): the bowl sits within her reach for this pane (centre of the table, on the empty
  // seat's side of the candle); the chopsticks lie crooked across the rim; 0.3–0.9 s her left hand (bangle) draws them
  // straight (along Z = across the bowl in front of the empty seat), a tiny second nudge at 1.21 s, still from 2.70 s.
  const VH = { bowl: V3(0.03, TABLE.top, -0.04), candle: V3(-0.2, TABLE.top, 0.2) };
  function wifeStraighten(t, T0) {
    wifeAtTable(T0, { breath: 0.8, lean: 0.9 });
    bowlT.position.copy(VH.bowl); candle.object3D.position.copy(VH.candle);
    const chop = bowlT.userData.chop;
    const st = ease.inOutSine(clamp((t - 0.3) / 0.6)), nudge = Math.exp(-(((t - 1.21) / 0.12) ** 2)) * (t < 2.7 ? 1 : 0);
    chop.rotation.y = -0.38 * (1 - st) + 0.018 * nudge; chop.position.x = 0.006 * (1 - st);
    bowlT.updateMatrixWorld(true);
    const reachIn = ease.inOutSine(clamp(t / 0.3));
    const grip = chop.localToWorld(V3(-0.075, 0.004, 0));            // the pair, a little short of their end on her (left) side
    const chopDir = chop.localToWorld(V3(1, 0, 0)).sub(chop.localToWorld(V3(0, 0, 0))).normalize();
    const rest = V3(-0.34, TABLE.top + 0.03, -0.05);
    const fingers = chopDir.clone().multiplyScalar(0.3).add(V3(0.9, -0.16, 0)).normalize();   // fingertips laid along the chopsticks
    // contact (review): solve the wrist so the index + middle finger PADS rest on top of the pair (stick radius ≈ 3 mm);
    // the old wrist offset let the curled 'touch' fingers hang down the bowl's side, below the chopsticks
    const palmL = V3(0.15, -1, 0.1).normalize(), poleL = V3(0.2, -1, -0.6).normalize();
    const padT = grip.clone().add(V3(0, 0.0032, 0));
    let wrist = grip.clone().addScaledVector(fingers, -0.085).add(V3(0, 0.035, 0));
    wife.hands.L.pose('touch', { curl: 0.35 });
    for (let it = 0; it < 3; it++) {
      wife.reach('L', wrist, { palm: palmL, fingers, pole: poleL });
      const pad = wife.hands.L.tip('index').add(wife.hands.L.tip('middle')).multiplyScalar(0.5);
      wrist.add(padT.clone().sub(pad));
    }
    wrist = rest.clone().lerp(wrist, reachIn);
    wife.reach('L', wrist, { palm: palmL, fingers, pole: poleL });
    if (typeof window !== 'undefined' && window.__OHLOG) console.log('OH straighten target=' + wrist.toArray().map((x) => x.toFixed(3)) + ' got=' + wife.worldPos('armL.hand').toArray().map((x) => x.toFixed(3)) + ' pad=' + wife.hands.L.tip('index').toArray().map((x) => x.toFixed(3)) + ' grip=' + padT.toArray().map((x) => x.toFixed(3)));
    wife.hands.L.pose(reachIn > 0.6 ? 'touch' : 'relaxed', { curl: reachIn > 0.6 ? 0.35 : 0.45 });
    const x = -TABLE.s / 2 + 0.075;
    wife.reach('R', V3(x, TABLE.top + 0.024, TABLE.z + 0.155), { palm: DOWN, fingers: V3(0.12, -0.08, -1).normalize(), elbowOut: 0.2 });
    wife.hands.R.pose('relaxed', { curl: 0.3 });
  }
  // ---- view_home_rain: standing on the step, she puts her right palm out under the eave edge
  // she stands on the step between the door and the bowl, facing out; ~207 s her LEFT palm (the bangle) goes out past the
  // eave edge just beyond the bowl, palm up under the drip line, catches a drop, and is drawn back at ~209.3 s
  const RAIN_W = { x: BOWL_S.x + 0.32, z: BOWL_S.z - 0.42, yaw: -Math.PI / 2 + 0.3 };
  function wifeReachRain(Tr) {
    const W = wife;
    W.root.position.set(RAIN_W.x, STEP_Y, RAIN_W.z); W.root.rotation.set(0, RAIN_W.yaw, 0);
    W.pose('stand', { weight: -0.3 }); W.pose({ 'hips.x': 0.1, 'spine.x': 0.18, 'chest.x': 0.12, 'neck.x': 0.2, 'head.x': 0.18, 'head.y': 0.15 }, { add: true });
    W.root.updateMatrixWorld(true); settleFeet(W, STEP_Y); W.breathe(Tr, 1.0);
    const out = ease.inOutSine(clamp((Tr - 206.95) / 0.5)) * (1 - ease.inOutSine(clamp((Tr - 209.3) / 0.6)));
    const rest = W.root.localToWorld(V3(0.2, 0.8, 0.12)), palmOut = V3(-EAVE_X - 0.05, 0.52, BOWL_S.z - 0.17);
    const wrist = rest.clone().lerp(palmOut.clone().add(V3(0.07, 0.02, -0.01)), out);
    W.reach('L', wrist, { palm: V3(0.6, -0.5, -0.1).lerp(V3(0, 1, 0), out).normalize(), fingers: V3(-1, -0.6 * (1 - out), 0.05).normalize(), pole: V3(0.2, -1, -0.5).normalize() });
    W.hands.L.pose(out > 0.5 ? 'cupped' : 'relaxed', { curl: 0.3 });
    W.reach('R', W.root.localToWorld(V3(-0.14, 0.78, 0.1)), { palm: V3(-1, 0, 0), fingers: V3(0, -1, 0.1).normalize() });
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
  const gloveC = cam41.position.clone().addScaledVector(gloveRay, (GL41_D + 0.15 - 0.03) / gloveRay.dot(dir19));
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
    gl41Key.position.copy(gloveC).addScaledVector(dir19, 0.45).add(V3(0, -0.12, 0)).addScaledVector(side, 0.28); gl41Key.target.position.copy(gloveC); gl41Key.target.updateMatrixWorld();
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
    const b = { pos: V3(0.1, 1.95, 0.65), target: V3(0.003, 0.842, -0.022) };   // re-solved below from the posed figure (end frame)
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
      mode('int', { figShadow: 'hands' });   // her body is off frame: keep it out of the 6 candle-shadow passes
      setCandle('B', T0); setMoonIn(MOON_16);
      wifeAtTable(T0, { breath: 0.6 }); foldedHands();
      // 6-frame ease-in, near-constant rise/pull-back that reveals the empty bench by '失' (66.32 s, tl 1.07), then settles
      const e = tl < 1.1 ? 0.84 * easeInConst(tl / 1.1, 6 / 26.4) : 0.84 + 0.16 * ease.outSine(clamp((tl - 1.1) / 0.65));
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
        mode('int', { noPartition: true, wife: 'mid', candleShadow: false });   // a 640 px plate behind glass: no point-light shadows
        setCandle(st, T0); setMoonIn(moonDir);
        const sig = Math.max(0, Math.sin(clamp((tl - 2.15) / 0.9) * Math.PI));   // shoulders rise and fall once, peak at 2.6 s (69.6)
        wifeAtTable(T0, { breath: 0.8, sigh: sig, turn: 0.34 }); foldedHands();
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
      // a TRUE mirror image: she faces the window, so her reflection faces the camera, bowed over the (reflected) bench
      ghost.root.position.set(0.52, -1.14, -6.2); ghost.root.rotation.set(0, -0.22, 0);
      ghost.pose('sit_desk', { seat: 0.47, lean: 0.45 });
      ghost.pose({ 'neck.x': 0.18, 'head.x': 0.1, 'chest.x': 0.1 }, { add: true });
      ghost.root.updateMatrixWorld(true); ghost.breathe(T0, 0.6);
      { const hd = ghost.worldPos('head'); ghost.root.position.add(LAB.clone().add(GHOST_HEAD).sub(hd)); ghost.root.updateMatrixWorld(true); }
      const work = Math.sin(T0 * 2.1) * 0.012 + Math.sin(T0 * 5.3) * 0.004;
      ghost.reach('R', ghost.root.localToWorld(V3(-0.07 + work, 0.80, 0.42)), { palm: DOWN, fingers: V3(0.2, -0.4, 1).applyQuaternion(ghost.root.getWorldQuaternion(new THREE.Quaternion())).normalize() });
      ghost.reach('L', ghost.root.localToWorld(V3(0.12, 0.79, 0.38)), { palm: DOWN, fingers: V3(-0.3, -0.4, 1).applyQuaternion(ghost.root.getWorldQuaternion(new THREE.Quaternion())).normalize() });
      ghostKey.position.set(-0.6, 0.9, -5.5); ghostKey.target.position.set(0.52, -0.1, -6.1); ghostKey.target.updateMatrixWorld();
      cam.place(camera, LAB, LAB.clone().add(V3(0, 0, -1))); cam.lens(camera, 75);
      camera.near = 0.05; camera.far = 40;
      { // her reflection: render her alone (lab lamp + key) into rtG with the shot camera, then add it onto the glass plane
        const hidden = []; for (const c of G.lab.children) if (c !== ghost.root && !c.isLight && c.visible) { hidden.push(c); c.visible = false; }
        ghost.root.visible = true;
        ghostCam.position.copy(camera.position); ghostCam.quaternion.copy(camera.quaternion); ghostCam.fov = camera.fov; ghostCam.aspect = RTG_W / RTG_H; ghostCam.updateProjectionMatrix(); ghostCam.updateMatrixWorld();
        const r = ctx.renderer, prev = r.getRenderTarget(), bg = scene.background; scene.background = null;
        r.setRenderTarget(rtG); r.setClearColor(0x000000, 0); r.clear(true, true, true); r.render(scene, ghostCam); r.setRenderTarget(prev);
        scene.background = bg; for (const c of hidden) c.visible = true; ghost.root.visible = false;
        ghostPlate.material.opacity = 0.2;
      }
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
      // review: the moonlit pale-blue jacket was the brightest area of the frame and the patch sat in shadow — the moon is now
      // a cool accent on her shoulder (moonI 1.15 → 0.42), a warm fill from her lap lights the work, the candle is a short-reach
      // rim (the doorway stays a dark shape) and the niche lamp lights its own little recess so it reads as a lamp, not a dot
      mode('int', { sew: true, lampIn: true, bowlT: false, candleShadow: false, bounce: false, moonI: 0.42, figShadow: 'hands' });
      setCandle('C', T0); setMoonIn(MOON_S35);
      candle.object3D.position.copy(S35.candle); candle.update(T0, { intensity: 0.42 });
      stand.position.set(S35.candle.x, 0, S35.candle.z);
      doorPivot.rotation.y = -1.45;
      lampIn.update(T0, { intensity: 0.045 }); lampInHalo.set(0.9 * util.flicker(T0, 12));
      lampIn.light.visible = true; lampIn.light.distance = 0.6;
      candle.light.distance = 2.2;
      wifeSewing(tl, T0);
      {
        const toCam = C35.pos.clone().sub(cuffG.position).setY(0).normalize(), fwdS = V3(Math.sin(S35.yaw), 0, Math.cos(S35.yaw));
        sewFill.position.copy(cuffG.position).addScaledVector(toCam, 0.3).addScaledVector(fwdS, 0.12).add(V3(0, -0.24, 0));
        sewFill.intensity = 0.085 * util.flicker(T0, 3); sewFill.visible = true;
      }
      cam.place(camera, C35.pos, C35.target); cam.lens(camera, 75);
      camera.near = 0.05; camera.far = 40;
      if (typeof window !== 'undefined' && window.__OHLOG) {
        camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        const hb = wife.bone('head'); hb.updateWorldMatrix(true, false);
        const sp = (v) => { const q = v.clone().project(camera); return `(${(q.x * 0.5 + 0.5).toFixed(2)},${(0.5 - q.y * 0.5).toFixed(2)})`; };
        const f3 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
        console.log('OH35arm shL=' + f3(wife.worldPos('armL.upper')) + ' elL=' + f3(wife.worldPos('armL.lower')) + ' wrL=' + f3(wife.worldPos('armL.hand')) + ' shR=' + f3(wife.worldPos('armR.upper')) + ' elR=' + f3(wife.worldPos('armR.lower')) + ' wrR=' + f3(wife.worldPos('armR.hand')) + ' mouth=' + f3(V3(0, 0.33 * wife.P.hu - 0.062, 0.45 * wife.P.hu).applyMatrix4(hb.matrixWorld)) + ' cuff=' + f3(cuffG.position));
        console.log('OH35 cam=' + camera.position.toArray().map((x) => x.toFixed(2)) + ' mouth' + sp(V3(0, 0.33 * wife.P.hu - 0.062, 0.45 * wife.P.hu).applyMatrix4(hb.matrixWorld)) + ' eye' + sp(wife.eye()) + ' cuff' + sp(cuffG.position) + ' pinch' + sp(wife.hands.R.sockets.pinch.getWorldPosition(V3())) + ' lamp' + sp(lampIn.object3D.localToWorld(V3(0.043, 0.06, 0))) + ' candle' + sp(candle.object3D.position) + ' chest=' + wife.worldPos('chest').toArray().map((x) => x.toFixed(2)) + ' cuffW=' + cuffG.position.toArray().map((x) => x.toFixed(2)));
      }
      const dNear = cam.distTo(camera, wife.hands.R.sockets.pinch.getWorldPosition(V3())), dLamp = cam.distTo(camera, lampIn.object3D.position);
      const f = smoothstep(1.47, 1.98, tl);
      const focus = Math.exp(lerp(Math.log(dNear), Math.log(dLamp), f));
      return { dof: { focus, fstop: 2.0 }, exposure: 1.22, saturation: 0.88, bloom: { strength: 0.5, threshold: 0.7 } };
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
      const fNear = GL41_D + 0.15 * push + 0.2, fFar = cam.distTo(camera, wife.worldPos('chest'));   // glove's mirror plane → her
      const fr = smoothstep(0.06, 1.6, tl);
      const focus = Math.exp(lerp(Math.log(fNear), Math.log(fFar), fr));
      return { dof: { focus, fstop: 2.0 + 3.6 * fr }, exposure: lerp(1.15, 1.6, smoothstep(0.2, 1.6, tl)), temp: -0.12, saturation: 0.86, grain: lerp(0.035, 0.04, fr), bloom: { strength: 0.45, threshold: 0.75 } };
    },
    // S042 — INSERT, 24 mm probe 7 cm above the damp doorstep, locked. Bowl rim large at left, her mended shoe at right, damp
    // stone between. 139.02 '等' a child's bare feet step out of the dark doorway and settle between them; 139.68 '雨' the toes
    // wiggle. Nothing above the ankles in frame.
    S042(tl, u, T0) {
      // review re-stage: the probe really sits ON the step (4.5 cm up, beside the bowl at the outer edge) looking in at the
      // dark doorway, tilted 4° down so the frame top cuts the child's legs a hand's width above the ankles (bible §10-8:
      // the child is only a pair of small feet); her shoe + hem are a prop (cut-in cheat), the seated figure is not rendered
      exterior(T0, 'ch2', tl, { child: true, wife: false, sky: false, sea: false, seeInside: true });
      lampLit(true, false); lampOut.update(T0, { intensity: 0.35 });
      doorPivot.rotation.y = -0.95;
      shoeG.visible = true; shoeG.position.copy(S42.toe); shoeG.rotation.set(0, Math.atan2(-S42.flat.x, -S42.flat.z) + 0.5, 0);
      shoeG.position.addScaledVector(V3(Math.sin(shoeG.rotation.y), 0, Math.cos(shoeG.rotation.y)), -0.1);   // toe tip at S42.toe
      childFeet(tl, T0);
      cam.place(camera, S42.pos, S42.target); cam.lens(camera, 24);
      camera.near = 0.01; camera.far = 600;
      // focus between the bowl rim and the little feet
      return { dof: { focus: 0.37, fstop: 4.0 }, exposure: 2.3, temp: -0.06, saturation: 0.88, lift: [0.014, 0.014, 0.018], bloom: { strength: 0.55, threshold: 0.65 } };
    },

    // ---------------------------------------------------------------- named views (nested; no post — linear HDR straight into a pane)
    // view_home_candle — the wife at the table by the candle (state C), the empty seat opposite, face unresolved (G3b S024/S025)
    view_home_candle(tl, u, T0) {
      // review: the lattice moon now falls on the EMPTY bench + the bowl's side of the table (MOON_16 direction), she is lit by
      // the candle alone, her head turned a little away so the candle only rims her cheek — the face stays unresolved in the
      // pane (nested views get no DOF to hide it)
      mode('int', { noPartition: true, wife: 'mid', moonI: 9 });
      setCandle('C', T0); setMoonIn(MOON_16);
      candle.update(T0, { intensity: 0.5 });                      // nested views get no post exposure: lights a touch brighter
      intHemi.intensity = 0.1;
      candle.object3D.position.set(-0.22, TABLE.top, -0.27);    // on the far side of her profile: 烛光侧逆, the camera-side face in shadow
      wifeAtTable(T0, { breath: 1, turn: 0.34 }); foldedHands();
      // from the front: her (screen left) by the candle, the bowl before the empty bench (screen right); tall panes get a
      // closer MS (seated figure, candle, bowl, bench edge), wide ones the room
      if (camera.aspect >= 1.6) { cam.place(camera, [0.2, 1.02, 2.55], [-0.04, 0.86, 0.0]); cam.lens(camera, 45); }
      else { cam.place(camera, [0.02, 1.06, 1.6], [-0.08, 0.84, 0.0]); cam.lens(camera, 34); }
      camera.near = 0.05; camera.far = 40;
      return { dof: null, exposure: 1.0 };
    },
    // view_home_hand — her left hand with the silver bangle straightens the chopsticks before the empty seat (gallery S026):
    // straighten 0.3–0.9 s, pause, nudge at 1.21 s, still from 2.70 s (tl of S026; loops for other callers)
    view_home_hand(tl, u, T0) {
      mode('int', { noPartition: true, moonI: 6 });
      setCandle('C', T0); setMoonIn(MOON_IN_C);
      candle.update(T0, { intensity: 0.45 });
      const t = tl % 3.67;
      wifeStraighten(t, T0);
      // tall panes see more above the table: aim lower so her face stays a warm blur at the top edge
      const tall = camera.aspect < 1.4;
      cam.place(camera, CHAND.pos, tall ? CHAND.target.clone().add(V3(0, -0.04, 0)) : CHAND.target); cam.lens(camera, tall ? 95 : 70);
      camera.near = 0.03; camera.far = 40;
      return { dof: null, exposure: 1.0 };
    },
    // view_home_rain — CH3: under the eaves at night the rain finally falls into the bowl at the step's edge; the door lamp
    // backlights the drops; her palm reaches out under the eave. Timed on song time (S066: drop into the centre at 207.07,
    // palm out ~207.3) and loops on a 4 s cycle for other callers.
    view_home_rain(tl, u, T0) {
      const Tr = T0 >= 204 && T0 <= 214 ? T0 : 206.0 + ((T0 % 4) + 4) % 4;
      exterior(Tr, 'ch3', tl, { rain: true, sky: false, sea: false, wife: 'hi' });
      lampLit(true); lampOut.update(Tr, { intensity: 1.6 });
      extHemi.intensity = 0.55;                                  // wet-sky fill so her silhouette and palm read against the door
      doorPivot.rotation.y = -0.95;
      wifeReachRain(Tr);
      rainDrop(Tr);
      // low, outside the drip line, looking back at the door lamp: the drops are backlit (forward scattering), the bowl large
      // in the lower frame, her palm out under the eave beside it
      const wide = camera.aspect >= 1.4;
      cam.place(camera, CRAIN.pos, wide ? CRAIN.target.clone().add(V3(0, -0.3, 0)) : CRAIN.target); cam.lens(camera, camera.aspect < 1.1 ? 22 : wide ? 20 : 24);
      camera.near = 0.03; camera.far = 600;
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
  setups.DBG_PROBE = (tl, u, T0) => { const r = setups.S042(1.5, 0.9, T.S042 + 1.5); cam.place(camera, [-4.7, 0.35, 3.3], [-3.35, -0.05, 2.15]); cam.lens(camera, 28); return { ...r, dof: null, exposure: 2.0 }; };
  setups.DBG_HANDS = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); cam.place(camera, [-0.3, 1.45, 0.25], [-0.38, 0.85, -0.03]); cam.lens(camera, 40); camera.near = 0.02; camera.far = 60; return { dof: null, exposure: 1.6 }; };
  setups.DBG_LAB = (tl, u, T0) => { const r = setups.S017(1.5, 0.5, T.S017 + 1.5); cam.place(camera, LAB.clone().add(V3(2.2, 0.5, 1.0)), LAB.clone().add(V3(0, -0.3, -4))); cam.lens(camera, 20); camera.far = 60; return { ...r, dof: null }; };
  setups.DBG_HEAD = (tl, u, T0) => { mode('int', { noPartition: true }); setCandle('B', T0); setMoonIn(MOON_IN_A); wifeAtTable(T0); foldedHands(); const e = wife.eye(); cam.place(camera, e.clone().add(V3(0.75, 0.15, 0.55)), e); cam.lens(camera, 50); camera.near = 0.05; camera.far = 60; intHemi.intensity = 1.5; return { dof: null, exposure: 2.0 }; };
  setups.DBG_BOWL19 = (tl, u, T0) => { const t = [0.3, 0.72, 1.0, 1.45][Math.min(3, Math.floor(tl / 0.5))]; const r = setups.S019(t, t / 1.583, T.S019 + t); cam.place(camera, [-4.75, 0.45, 2.75], [-3.5, -0.05, 1.98]); cam.lens(camera, 40); return { ...r, dof: null, exposure: 2.4 }; };
  setups.DBG_HANDS35 = (tl, u, T0) => { const t = tl < 1 ? 0.1 : 0.4; const r = setups.S035(t, t / 2.917, T.S035 + t); const h = cuffG.position.clone(); const p0 = C35.pos.clone().lerp(h, 0.55); cam.place(camera, p0, h); cam.lens(camera, 50); intHemi.intensity = 0.8; return { ...r, dof: null, exposure: 1.6 }; };
  const camMark = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2020 })); camMark.visible = false; scene.add(camMark);
  setups.DBG_S35TOP = (tl, u, T0) => { const t = tl < 1 ? 0.05 : 0.4; const r = setups.S035(t, t / 2.917, T.S035 + t); const c = cuffG.position.clone();
    camMark.position.copy(C35.pos); camMark.lookAt(C35.target); camMark.visible = true; intHemi.intensity = 2.5;
    cam.place(camera, c.clone().add(V3(0.9, 1.6, 1.3)), c.clone().add(V3(0.3, -0.1, 0))); cam.lens(camera, 24); return { ...r, dof: null, exposure: 1.4 }; };
  // DBG_PANES: the three named views rendered like a nested pane (portrait RT, linear HDR, no post) side by side
  const paneG = new THREE.Group(); paneG.position.set(0, 60, 0); paneG.visible = false; scene.add(paneG);
  const paneRT = [0, 1, 2].map(() => ctx.makeRT(400, 470));
  paneRT.forEach((rt, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.0), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false })); m.position.set((i - 1) * 0.92, 0, 0); paneG.add(m); });
  setups.DBG_PANES = (tl, u, T0) => {
    const names = ['view_home_candle', 'view_home_hand', 'view_home_rain'], times = [T0, T0, 207.2 + (tl % 2)];
    const r = ctx.renderer, prev = r.getRenderTarget(), asp = camera.aspect;
    [2, 0, 1].forEach((i) => { const n = names[i]; camera.aspect = 400 / 470; camera.layers.enable(1); setups[n](tl, u, times[i]); camera.updateProjectionMatrix(); if (G.exterior.visible) { camera.updateMatrixWorld(); sea.update(times[i], camera); }
      r.setRenderTarget(paneRT[i]); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, camera); });
    r.setRenderTarget(prev); camera.aspect = asp; camera.layers.disable(1);
    for (const g of Object.values(G)) g.visible = false; for (const f of [wifeHi, wifeMid, child]) f.root.visible = false; bowlS.visible = false; cuffG.visible = false; thread.visible = false;
    paneG.visible = true; scene.background.setHex(0x111111); scene.fog.density = 0;
    cam.place(camera, [0, 60, 2.2], [0, 60, 0]); cam.lens(camera, 24); camera.near = 0.05; camera.far = 50;
    return { dof: null, exposure: 1.0, vignette: 0, grain: 0.01 };
  };
  // RV_CAM (review harness, out/check/old_home/review/rv.mjs --q): run setup ?rvshot= at tl ?rvt= (song time T[shot] + tl, or
  // ?rvT= for views), then optionally re-aim the camera ?rvcam=px,py,pz,tx,ty,tz,mm, ?rvexp= exposure, ?rvfill= extra hemi fill
  setups.RV_CAM = (tl, u, T0) => {
    const q = new URLSearchParams(location.search), id = q.get('rvshot') || 'S016', t = +(q.get('rvt') || 0);
    const TT = q.get('rvT') ? +q.get('rvT') : (T[id] ?? 0) + t;
    const r = setups[id](t, t / 3, TT) || {};
    if (q.get('rvcam')) { const c = q.get('rvcam').split(',').map(Number); cam.place(camera, c.slice(0, 3), c.slice(3, 6)); cam.lens(camera, c[6] || 35); camera.near = 0.01; camera.far = 3000; r.dof = null; }
    if (q.get('rvfill')) { const h = new THREE.HemisphereLight(0xffffff, 0x444444, +q.get('rvfill')); h.name = 'rvfill'; if (!scene.getObjectByName('rvfill')) scene.add(h); }
    if (q.get('rvexp')) r.exposure = +q.get('rvexp');
    if (q.get('rvnodof')) r.dof = null;
    return r;
  };
  setups.default = setups.S016;

  // ---- solve the registered framings from the actual posed figures (robust to pose / figure-library changes)
  {
    // S016 end frame (t 1.75 s, ~60° down): bowl (0.68, 0.60), candle flame (0.46, 0.40), her folded hands at the left edge
    // (0.07, 0.62), the empty bench's inner edge at frame right (0.92, 0.66)
    mode('int', {}); setCandle('B', T.S016); wifeAtTable(T.S016); foldedHands(); wife.root.updateMatrixWorld(true);
    const hL = wife.worldPos('armL.hand').lerp(wife.hands.L.tip('middle'), 0.5);
    const fl16 = CANDLE_T.clone().add(V3(0, 0.012 + 0.11 + 0.012, 0)), rim16 = BOWL_T.clone().add(V3(0, 0.066, 0)), bench16 = V3(EMPTY_X + 0.02, BENCH_TOP, BOWL_T.z);
    let b16 = null;
    for (const cx of [0.0, 0.08, 0.16, 0.24, 0.32]) for (const cy of [1.65, 1.75, 1.85, 1.95, 2.05]) for (const cz of [0.45, 0.55, 0.65, 0.75, 0.85]) {
      const r = aimCamera(V3(cx, cy, cz), [[rim16, [0.68, 0.60]], [fl16, [0.46, 0.40]], [hL, [0.1, 0.64]], [bench16, [0.9, 0.62]]], 50);
      const d = r.target.clone().sub(r.pos).normalize(), pitch = Math.asin(d.y);
      r.err += 0.15 * (pitch + 60 * D2R) ** 2;
      if (!b16 || r.err < b16.err) b16 = r;
    }
    C16.b.pos.copy(b16.pos); C16.b.target.copy(b16.target);
    console.log('OH solved C16b', C16.b.pos.toArray().map((x) => x.toFixed(3)), b16.err.toFixed(4));
  }
  {
    mode('int', { sew: true, lampIn: true, bowlT: false }); wifeSewing(0.0, T.S035);   // frame 0 = the S034 → S035 gesture match
    const hb = wife.bone('head'); hb.updateWorldMatrix(true, false);
    const mouth = V3(0, 0.33 * wife.P.hu - 0.062, 0.45 * wife.P.hu).applyMatrix4(hb.matrixWorld), lampP = lampIn.object3D.localToWorld(V3(0.043, 0.06, 0));
    let best = null;
    const chestP = wife.worldPos('chest'), hands = cuffG.position.clone(), pinchP = wife.hands.R.sockets.pinch.getWorldPosition(V3()), eyeP = wife.eye();
    // camera on her left (east) side, looking west past her profile toward the door lamp; never inside her arms or the work
    for (let cx = S35.x + 0.65; cx <= 2.42; cx += 0.08) for (let cz = S35.z - 0.5; cz <= S35.z + 0.7; cz += 0.08) for (const cy of [0.92, 0.98, 1.04, 1.1]) {
      if (V3(cx, cy, cz).distanceTo(hands) < 1.15 || V3(cx, cy, cz).distanceTo(hands) > 1.75) continue;   // a 75 mm CU of hands + lower face
      const P0 = V3(cx, cy, cz);
      if (P0.distanceTo(hands) < 0.42 || P0.distanceTo(chestP) < 0.5) continue;
      // S034 → S035 gesture match: the needle-pinching fingers at (0.54, 0.58) (±3 %) is the binding registration (weight 3)
      // + the eyes held at the top edge (留白: only the lower face — 只露下半张脸)
      // registered on the WORK (cuff centre, where the needle-pinching fingers are: the S034 → S035 gesture match) rather than the
      // pinch socket, which now sits just behind the band's far edge
      const r = aimCamera(P0, [[lampP, [0.22, 0.44]], [mouth, [0.66, 0.30]], [mouth, [0.66, 0.30]], [hands, [0.53, 0.62]], [hands, [0.53, 0.62]], [hands, [0.53, 0.62]], [eyeP, [0.6, 0.04]]], 75);
      if (!best || r.err < best.err) best = r;
    }
    C35.pos.copy(best.pos); C35.target.copy(best.target);
    { // the candle she sews by: low, in front of her and a little beyond (from the camera) — it lights the work and her lower
      // face from below; the camera-side half of the face stays in shadow (烛光侧逆, eyes never in the light); below frame
      const v = C35.target.clone().sub(C35.pos).setY(0).normalize(), fwd = V3(Math.sin(S35.yaw), 0, Math.cos(S35.yaw));
      const leftS = V3(Math.cos(S35.yaw), 0, -Math.sin(S35.yaw));
      S35.candle = hands.clone().addScaledVector(fwd, 0.2).addScaledVector(v, -0.14).setY(0.515);   // review: low, in front of her on the CAMERA side (below frame) — warm key on the work and the lower face from below; the far-side needle arm stays in shadow instead of glowing
    }
    console.log('OH C35 err', best.err.toFixed(5));
    // (S042's probe is placed by hand now — S42 above — on the step beside the bowl)
    // view_home_hand (S026): from the empty seat — candle soft upper left (0.30, 0.35), bowl (0.62, 0.55), her hand on the
    // chopsticks (0.56, 0.58), her face a warm blur at the top edge (0.45, 0.08)
    mode('int', { noPartition: true }); setCandle('C', T.S017); wifeStraighten(2.0, 95.0);
    const flame = VH.candle.clone().add(V3(0, 0.012 + 0.06 + 0.012, 0)), rimT = VH.bowl.clone().add(V3(0, 0.066, 0)), gripT = bowlT.userData.chop.localToWorld(V3(-0.075, 0.004, 0)), eyeT = wife.eye();
    best = null;
    for (let cx = 0.45; cx <= 1.05; cx += 0.1) for (let cz = -0.5; cz <= 0.5; cz += 0.1) for (const cy of [1.0, 1.12, 1.24, 1.36, 1.48]) {
      const r = aimCamera(V3(cx, cy, cz), [[flame, [0.30, 0.35]], [rimT, [0.62, 0.55]], [gripT, [0.56, 0.58]], [gripT, [0.56, 0.58]], [eyeT, [0.45, 0.08]]], 70);
      if (!best || r.err < best.err) best = r;
    }
    CHAND.pos.copy(best.pos); CHAND.target.copy(best.target);
    // view_home_rain: hand-placed (designed for a tall vitrine pane, aspect ≈ 0.8–1.3; checked offline): at 28 mm / 0.9 the
    // niche lamp sits mid-left behind the rain curtain (0.36, 0.46), her palm upper right (0.67, 0.25), the bowl lower right
    // (0.61, 0.80); wide panes get a wider lens from the same place
    CRAIN.pos.set(-4.0, 0.02, 2.22); CRAIN.target.set(-3.35, 0.3, 1.5);
    best = { err: 0 };
    console.log('OH solved CRAIN', CRAIN.pos.toArray().map((x) => x.toFixed(2)), best.err.toFixed(4));
    console.log('OH solved CHAND', CHAND.pos.toArray().map((x) => x.toFixed(2)), best.err.toFixed(4));
    console.log('OH solved C35', C35.pos.toArray().map((x) => x.toFixed(3)), C35.target.toArray().map((x) => x.toFixed(3)));
  }

  let figShadowOff = false;
  return {
    scene, camera,
    post: { exposure: 1.0, contrast: 1.05, saturation: 0.9, temp: 0.0, lift: [0.012, 0.012, 0.016], shadowTint: [0.45, 0.5, 0.6], highTint: [0.56, 0.52, 0.46], grain: 0.04, vignette: 0.38, bloom: { strength: 0.42, radius: 0.55, threshold: 0.8 } },
    setShot(shot, tl, u, T0) {
      camMark.visible = false; paneG.visible = false;
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
        if (OFF.has('wl')) moonWL.object3D.visible = false;
        if (OFF.has('cast')) scene.traverse((o) => { if (o.isLight && o.castShadow) { o.userData.cs = true; o.castShadow = false; } });
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
        if (OFF.has('figshadow')) { figShadowOff = true; for (const f of [wifeHi, wifeMid, child]) f.root.traverse((o) => { if (o.isMesh) o.castShadow = false; }); }
        if (OFF.has('yb')) yardBounce.visible = false;
        if (OFF.has('door')) doorGlow.visible = false;
        if (OFF.has('lamp')) lampOut.light.visible = false;
      }
      // (figure shadow flags are re-set by mode() → figShadows() every frame)
      return r;
    },
  };
}
