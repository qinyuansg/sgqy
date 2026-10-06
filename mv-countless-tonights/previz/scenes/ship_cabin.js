// ship_cabin — 火长针房 LOC_CABIN (navigator era, early 17th c., dusk): S005 S006 S007 S009 S010 S011
// + named nested view 'view_cabin' (navigator bent over the compass under the swinging horn lamp — gallery G3a, S024).
//
// Set (ship-local metres, Y up, floor y=0): cabin 2.4 (x) × 2.0 (z) × 1.65 headroom. Stern wall z=-1 with the 55×40 cm
// barred window, fold-down chart table hinged under it running fore-aft, compass box let into its port (-x) side,
// 70×70 hatch overhead above the table, two low beams (lamp on beam A just forward of the hatch). Bow = +z.
// Above deck (S007 only): stern deck + hatch coaming, mizzen mast and a battened junk sail against the dusk dome.
//
// Exports `needleChart(state)` (the T03 chart card, 'then' | 'museum') and `T03` (its frame registration) so the gallery
// module can draw the identical chart in S004 for the match cut.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';
import { rng, clamp, lerp, smoothstep, ease, keys, noise1, fbm1, flicker } from '../engine/util.js';

// ------------------------------------------------------------------ palette (bible.json P01–P30)
const PAL = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P09: '#B08D57', P10: '#6E5536', P11: '#D2B27E',
  P13: '#E2A458', P14: '#C67A35', P15: '#D6C6A2', P16: '#A33A2E', P19: '#A26F4C', P28: '#0A0F17',
  smoke: '#3A2A1E', beam: '#2A1E15', sail: '#8A5A3A', batten: '#4E3624', wax: '#E8DFC8', chartThen: '#DCCDA6', chartMuseum: '#CDB98C',
};
const col = (h, k = 1) => new THREE.Color(h).multiplyScalar(k);

// ------------------------------------------------------------------ set dimensions
const CEIL = 1.65, DECK_T = 0.06, DECK_Y = CEIL + DECK_T;
const CAB = { x0: -1.2, x1: 1.2, z0: -1.0, z1: 1.0 };
const TABLE = { x0: -0.30, x1: 0.36, z0: -1.0, z1: -0.10, y: 0.80, th: 0.035 };
const HATCH = { x0: -0.25, x1: 0.45, z0: -0.95, z1: -0.25 };
const BEAM_A = -0.12, BEAM_B = 0.62, BEAM_W = 0.12, BEAM_D = 0.14;
const LAMP_HOOK = new THREE.Vector3(0.12, CEIL - BEAM_D, -0.12);
const WIN = { cx: 0.03, cy: 1.06, w: 0.55, h: 0.40 };
const CH = { L: 0.60, Wd: 0.32, x0: -0.04, z0: -0.32, y: TABLE.y + 0.0012 };   // visible chart: local X along -world z, local Z along +world x
const CP = { x: -0.195, z: -0.45 };                                            // compass centre (plan)
const BOX_TOP = TABLE.y + 0.03, DIAL_Y = TABLE.y + 0.044, RIM_Y = TABLE.y + 0.047, COMP_R = 0.075, FACE_R = 0.0715;
const WELL_R = 0.145 / 0.5 * FACE_R; // 2.07 cm (Ø4.2 cm well)

// T03 registration (shot list S004/S005): chart spans frame x 0.05–0.95, lower edge y 0.88, islet (0.62,0.40)
export const T03 = { chartX: [0.05, 0.95], lowerEdgeY: 0.88, islet: [0.62, 0.40], route0: [0.15, 0.70], bar1: [0.10, 0.50], bar2: [0.78, 0.06], stone: [0.08, 0.85], wax: [0.30, 0.62] };
const FRAME_W = CH.L / 0.9, FRAME_H = FRAME_W / 2.39;
// frame (fx, fy) -> chart uv (u along length 0..1, v top→bottom 0..1)
const frameToUV = (fx, fy) => [(fx - 0.05) / 0.9, 1 - (0.88 - fy) * FRAME_H / CH.Wd];

// ================================================================== needle-route chart card (针路图) — no text, no rose
const CHART_CACHE = new Map();
export function needleChart(state = 'then', { W = 2048, H = 1092, seed = 23 } = {}) {
  const key = state + ':' + W + 'x' + H + ':' + seed;
  if (CHART_CACHE.has(key)) return CHART_CACHE.get(key);
  const museum = state === 'museum';
  const N = TX.makeNoise(seed), N2 = TX.makeNoise(seed + 7), r = rng(seed * 977 + 3);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H), d = img.data;
  const hgt = new Float32Array(W * H);
  const paper = museum ? [205, 185, 140] : [221, 206, 168], darkP = museum ? [160, 128, 84] : [186, 166, 128];
  const creases = [0.355, 0.705];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, i = y * W + x;
    const m = N.fbm(u, v, 4, 4, 0.5, 2) * 0.5 + 0.5;
    const fib = N.n(u * 700, v * 190, 700, 190) * 0.45 + N.n(u * 210, v * 640, 210, 640) * 0.3 + N2.n(u * 1000, v * 533, 1000, 533) * 0.25;
    const edge = Math.min(u * W, (1 - u) * W, v * H, (1 - v) * H) / W;          // fraction of width to nearest edge
    const burn = smoothstep(0.035, 0.0, edge + 0.006 * N.n(u * 40, v * 21, 40, 21));
    const hand = museum ? 0 : smoothstep(0.55, 0.85, N2.fbm(u, v, 2, 3, 0.5, 1) * 0.5 + 0.5) * 0.35 * smoothstep(0.4, 1.0, v);
    let cr = 0; for (const k of creases) { const dd = (u - k) * W; cr = Math.max(cr, Math.exp(-dd * dd / (museum ? 6 : 3))); }
    let t = clamp(0.08 + 0.22 * (1 - m) + 0.7 * burn + hand + cr * (museum ? 0.25 : 0.08));
    let cc = [0, 1, 2].map((k) => lerp(paper[k], darkP[k], t) * (0.955 + 0.06 * fib));
    d[i * 4] = cc[0]; d[i * 4 + 1] = cc[1]; d[i * 4 + 2] = cc[2]; d[i * 4 + 3] = 255;
    hgt[i] = 0.5 + 0.035 * fib + 0.25 * (N.fbm(u, v, 6, 3, 0.5, 3)) - cr * 0.3;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const inkA = museum ? 0.62 : 0.88;
  const INK = (a = 1) => `rgba(${museum ? '58,46,34' : '38,28,20'},${(a * inkA).toFixed(3)})`;
  const X = (u) => u * W, Y = (v) => v * H;
  // ---- water wash (pale indigo #6E8AA0) along the coast and round the islands; land wash (#B49A6E)
  const coastY = (u) => 0.31 + 0.045 * Math.sin(u * 7.1 + 0.6) + 0.03 * Math.sin(u * 17.3 + 2.0) + 0.02 * N.n(u * 9, 0.5, 9, 4);
  g.save();
  const grd = g.createLinearGradient(0, Y(0.26), 0, Y(0.62));
  grd.addColorStop(0, 'rgba(110,138,160,0.0)'); grd.addColorStop(0.12, `rgba(110,138,160,${museum ? 0.16 : 0.22})`); grd.addColorStop(1, 'rgba(110,138,160,0.0)');
  g.fillStyle = grd; g.fillRect(0, 0, W, Y(0.66));
  g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= 100; k++) { const u = k / 100; g.lineTo(X(u), Y(coastY(u))); } g.lineTo(W, 0); g.closePath();
  g.fillStyle = museum ? 'rgba(168,140,98,0.42)' : 'rgba(180,154,110,0.45)'; g.fill();
  g.restore();
  // ---- mountain profile (立面山形): baseline by, peaks [[dx, h, w]] in px
  const mountain = (cx, by, peaks, o = {}) => {
    const w0 = Math.min(...peaks.map((p) => p[0] - p[2])), w1 = Math.max(...peaks.map((p) => p[0] + p[2]));
    const pts = [[cx + w0 - 6, by]];
    for (const [dx, h, w] of peaks) { pts.push([cx + dx - w * 0.75, by - h * 0.32], [cx + dx - w * 0.28, by - h * 0.86], [cx + dx, by - h], [cx + dx + w * 0.3, by - h * 0.82], [cx + dx + w * 0.8, by - h * 0.28]); }
    pts.push([cx + w1 + 6, by]);
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length - 1; k++) { const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2; g.quadraticCurveTo(pts[k][0], pts[k][1], mx, my); } g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
    // halo of water wash
    const rg = g.createRadialGradient(cx, by, 4, cx, by, (w1 - w0) * 0.9 + 30);
    rg.addColorStop(0, `rgba(110,138,160,${museum ? 0.18 : 0.26})`); rg.addColorStop(1, 'rgba(110,138,160,0)');
    g.fillStyle = rg; g.fillRect(cx + w0 - 120, by - 120, (w1 - w0) + 240, 240);
    path(); g.closePath(); g.fillStyle = o.fill || (museum ? 'rgba(160,140,104,0.55)' : 'rgba(172,152,112,0.62)'); g.fill();
    // shading strokes (皴) down from the ridges + moss dots
    g.strokeStyle = INK(0.45); g.lineWidth = 1.1;
    for (const [dx, h, w] of peaks) {
      const n = 3 + Math.floor(h / 14);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, sx = cx + dx - w * 0.55 + w * 1.1 * t, sy = by - h * (0.85 - 0.6 * Math.abs(t - 0.5)); g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx - 2 + r() * 4, (sy + by) / 2, sx - 3 + r() * 2, by - 3 - r() * 4); g.stroke(); }
      g.fillStyle = INK(0.75); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + dx - w * 0.25 + r() * w * 0.5, by - h * (0.9 + r() * 0.08), 1.4 + r(), 0, Math.PI * 2); g.fill(); }
    }
    path(); g.strokeStyle = INK(0.95); g.lineWidth = o.lw || 2.4; g.stroke();
    // water line under the island
    g.strokeStyle = INK(0.6); g.lineWidth = 1.4; g.beginPath();
    for (let k = 0; k <= 24; k++) { const xx = cx + w0 - 10 + (w1 - w0 + 20) * k / 24; const yy = by + 2 + 1.6 * Math.sin(k * 1.9); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  };
  // ---- coast: profiles standing along the coastline (top of chart)
  for (let k = 0; k < 12; k++) {
    const u = 0.03 + k / 11.6 + (r() - 0.5) * 0.02, by = Y(coastY(u)) + 6;
    const pk = [], n = 2 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) pk.push([(j - (n - 1) / 2) * 52 + (r() - 0.5) * 16, 46 + r() * 58, 34 + r() * 18]);
    mountain(X(u), by, pk, { lw: 2.6 });
  }
  // coastline ink
  g.strokeStyle = INK(0.9); g.lineWidth = 2.8; g.beginPath(); for (let k = 0; k <= 160; k++) { const u = k / 160; const yy = Y(coastY(u)) + 5 + 2 * N.n(u * 60, 0.3, 60, 4); k ? g.lineTo(X(u), yy) : g.moveTo(X(u), yy); } g.stroke();
  // ---- islands in the sea; the twin-peaked islet registered at T03.islet
  const [iu, iv] = frameToUV(T03.islet[0], T03.islet[1]);
  mountain(X(iu), Y(iv) + 46, [[-46, 86, 44], [44, 104, 48]], { lw: 3.2 });      // centre of the twin peaks ≈ (iu, iv)
  const isl = [[0.31, 0.52, 1], [0.44, 0.78, 2], [0.84, 0.46, 1], [0.90, 0.84, 3], [0.17, 0.50, 2], [0.75, 0.68, 1], [0.07, 0.66, 1], [0.58, 0.95, 2], [0.24, 0.92, 1], [0.97, 0.62, 2]];
  isl.push([0.13, 0.78, 1], [0.37, 0.64, 2], [0.52, 0.47, 1], [0.66, 0.86, 1], [0.81, 0.58, 2], [0.94, 0.40, 1]);
  for (const [u, v, n] of isl) { const pk = []; for (let j = 0; j < n; j++) pk.push([(j - (n - 1) / 2) * 52, 40 + r() * 46, 34 + r() * 14]); mountain(X(u), Y(v), pk, { lw: 2.6 }); }
  // reefs: ink dot clusters
  g.fillStyle = INK(0.8);
  for (const [u, v] of [[0.54, 0.84], [0.66, 0.73], [0.24, 0.62], [0.95, 0.56], [0.38, 0.92]]) for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(X(u) + (r() - 0.5) * 40, Y(v) + (r() - 0.5) * 18, 1.6 + r() * 1.6, 0, Math.PI * 2); g.fill(); }
  // wave hatching in open water
  g.strokeStyle = INK(0.28); g.lineWidth = 1.0;
  for (let k = 0; k < 90; k++) { const x0 = r() * W, y0 = Y(0.42 + r() * 0.56); for (let j = 0; j < 3; j++) { const xx = x0 + j * 11; g.beginPath(); g.moveTo(xx - 5, y0); g.quadraticCurveTo(xx, y0 - 4, xx + 5, y0); g.stroke(); } }
  // ---- the needle route: dotted ink line from the lower-left to the islet and on past it (no red)
  const [ru, rv] = frameToUV(T03.route0[0], T03.route0[1]);
  const route = []; const P0 = [X(ru), Y(rv)], P1 = [X(0.32), Y(0.74)], P2 = [X(iu) - 70, Y(iv) + 52], P3 = [X(iu) + 120, Y(iv) + 40], P4 = [X(1.02), Y(0.50)];
  const seg = (a, b, cpt, n) => { for (let k = 0; k <= n; k++) { const t = k / n, A = (1 - t) * (1 - t), B = 2 * (1 - t) * t, C = t * t; route.push([A * a[0] + B * cpt[0] + C * b[0], A * a[1] + B * cpt[1] + C * b[1]]); } };
  seg(P0, P2, P1, 120); seg(P2, P3, [X(iu) + 20, Y(iv) + 78], 40); seg(P3, P4, [X(0.86), Y(0.62)], 70);
  g.fillStyle = INK(0.92);
  let acc = 0; for (let k = 1; k < route.length; k++) { const l = Math.hypot(route[k][0] - route[k - 1][0], route[k][1] - route[k - 1][1]); acc += l; if (acc > 12) { acc = 0; g.beginPath(); g.arc(route[k][0], route[k][1], 2.4, 0, Math.PI * 2); g.fill(); } }
  // ---- illegible annotation columns (tiny brush marks, never characters)
  const marks = (x, y, n, s = 6) => { g.strokeStyle = INK(0.62); g.lineWidth = 1.05; for (let j = 0; j < n; j++) { const yy = y + j * s * 1.5; for (let q = 0; q < 2 + Math.floor(r() * 2); q++) { const a = r() * Math.PI, l = s * (0.3 + r() * 0.5), ox = (r() - 0.5) * s * 0.6, oy = (r() - 0.5) * s * 0.6; g.beginPath(); g.moveTo(x + ox - Math.cos(a) * l / 2, yy + oy - Math.sin(a) * l / 2); g.lineTo(x + ox + Math.cos(a) * l / 2, yy + oy + Math.sin(a) * l / 2); g.stroke(); } } };
  for (let k = 20; k < route.length - 10; k += 34) marks(route[k][0] + 14, route[k][1] - 30, 3 + Math.floor(r() * 3));
  for (const [u, v] of isl) marks(X(u) + 46, Y(v) - 36, 2 + Math.floor(r() * 3));
  marks(X(iu) + 72, Y(iv) - 60, 4); marks(X(iu) + 86, Y(iv) - 60, 3);
  for (let k = 0; k < 9; k++) marks(X(0.05 + k * 0.11), Y(coastY(0.05 + k * 0.11)) + 26, 2 + Math.floor(r() * 2));
  // ---- ageing
  if (museum) {
    const im2 = g.getImageData(0, 0, W, H), e = im2.data;
    for (let k = 0; k < 420; k++) { // foxing #A8875A
      const fx = r() * W, fy = r() * H, rr = 1.5 + Math.pow(r(), 3) * 9;
      for (let yy = Math.max(0, fy - rr * 2) | 0; yy < Math.min(H, fy + rr * 2); yy++) for (let xx = Math.max(0, fx - rr * 2) | 0; xx < Math.min(W, fx + rr * 2); xx++) {
        const dd = Math.hypot(xx - fx, yy - fy) / rr, a = Math.exp(-dd * dd) * 0.55, o = (yy * W + xx) * 4;
        e[o] = lerp(e[o], 168, a); e[o + 1] = lerp(e[o + 1], 135, a); e[o + 2] = lerp(e[o + 2], 90, a);
      }
    }
    g.putImageData(im2, 0, 0);
    // toned tissue repairs on edge losses (slightly paler)
    g.fillStyle = 'rgba(222,208,172,0.85)'; g.strokeStyle = 'rgba(150,126,90,0.35)'; g.lineWidth = 1;
    for (const [u, v, s] of [[0.0, 0.62, 60], [0.43, 1.0, 80], [1.0, 0.15, 70], [0.81, 0.0, 50]]) { g.beginPath(); for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2, rr = s * (0.7 + 0.3 * N.n(k * 0.7, u * 9, 64, 64)); const xx = X(u) + Math.cos(a) * rr, yy = Y(v) + Math.sin(a) * rr * 0.6; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); g.fill(); g.stroke(); }
  } else {
    // soot / thumb smudges of use, a little wax sheen
    for (let k = 0; k < 6; k++) { const xx = X(0.05 + r() * 0.9), yy = Y(0.7 + r() * 0.28), rg = g.createRadialGradient(xx, yy, 2, xx, yy, 40 + r() * 50); rg.addColorStop(0, 'rgba(90,72,52,0.10)'); rg.addColorStop(1, 'rgba(90,72,52,0)'); g.fillStyle = rg; g.fillRect(xx - 100, yy - 100, 200, 200); }
  }
  // normal map from paper height (+ ink is slightly raised)
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; const ng = nc.getContext('2d'), ni = ng.createImageData(W, H), nd = ni.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(H - 1, y + 1);
    let nx = -(hgt[y * W + xr] - hgt[y * W + xl]) * 2.2, ny = (hgt[yd * W + x] - hgt[yu * W + x]) * 2.2, nz = 1; const l = 1 / Math.hypot(nx, ny, nz);
    nd[i * 4] = (nx * l * 0.5 + 0.5) * 255; nd[i * 4 + 1] = (ny * l * 0.5 + 0.5) * 255; nd[i * 4 + 2] = (nz * l * 0.5 + 0.5) * 255; nd[i * 4 + 3] = 255;
  }
  ng.putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.needsUpdate = true;
  const normalMap = new THREE.CanvasTexture(nc); normalMap.colorSpace = THREE.NoColorSpace; normalMap.anisotropy = 8; normalMap.needsUpdate = true;
  const out = { map, normalMap };
  CHART_CACHE.set(key, out);
  return out;
}

// ================================================================== NAVIGATOR dressing (integration pass; shared with sea_deck)
// The library 'headcloth' is a smooth shell that stops high on the forehead and above the ears: in close-ups it read as a
// beret on a bald pink mannequin head with a big crisp ear (QA S007/S010/S045). This builds, module-side and once per
// figure, (1) a WRAPPED head-cloth shrink-wrapped over the skull from a spherical max-radius map of the head mesh (dilated +
// blurred so it drapes over the ear instead of following it), low on the forehead, over most of the ear, wound in diagonal
// layers, with the topknot bump at the crown-back and a knot + two short tails at the back; (2) a short salt-bleached BEARD
// (a conforming skinned overlay on the jaw / chin / upper lip, feathered at its edge, lips bare); (3) weathered skin: darker,
// less saturated brown, almost no pink sheen. The lib hair layer is hidden. Pure geometry built once; no per-frame cost
// beyond two small meshes. fig.userData.navDress = { cloth, knot, beard, hemAt(phi) }.
export function dressNavigator(fig, o = {}) {
  if (fig.userData && fig.userData.navDress) return fig.userData.navDress;
  const ear = o.ear ?? 0.8, hu = fig.P.hu;
  const inv = fig.skeleton.boneInverses[fig.bi.head];
  const c0 = new THREE.Vector3(0, 0.40 * hu, -0.05 * hu);
  // ---- spherical max-radius map of the head (head-local, around c0)
  const NP = 128, NE = 64, Rm = new Float32Array(NP * NE);
  const binOf = (phi, el) => { const ip = ((Math.floor((phi + Math.PI) / (2 * Math.PI) * NP) % NP) + NP) % NP, ie = clamp(Math.floor((el + Math.PI / 2) / Math.PI * NE), 0, NE - 1); return ie * NP + ip; };
  const p = new THREE.Vector3();
  for (const L of [fig.layers.head, fig.layers.body]) {
    if (!L) continue; const pa = L.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      p.fromBufferAttribute(pa, i).applyMatrix4(inv).sub(c0);
      const r = p.length(); if (r > 0.8 * hu || r < 1e-5) continue;
      const k = binOf(Math.atan2(p.x, p.z), Math.asin(clamp(p.y / r, -1, 1)));
      if (r > Rm[k]) Rm[k] = r;
    }
  }
  // fill empty bins (nearest along the row / from the pole side), then dilate ±3 bins and blur
  for (let pass = 0; pass < 6; pass++) for (let ie = 0; ie < NE; ie++) for (let ip = 0; ip < NP; ip++) {
    const k = ie * NP + ip; if (Rm[k] > 0) continue;
    let s = 0, n = 0; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const je = ie + b; if (je < 0 || je >= NE) continue; const v = Rm[je * NP + ((ip + a + NP) % NP)]; if (v > 0) { s += v; n++; } }
    if (n) Rm[k] = s / n;
  }
  const filt = (src, rad, mode) => { const out = new Float32Array(src.length);
    for (let ie = 0; ie < NE; ie++) for (let ip = 0; ip < NP; ip++) { let m = mode === 'max' ? 0 : 0, n = 0;
      for (let b = -rad; b <= rad; b++) { const je = clamp(ie + b, 0, NE - 1); for (let a = -rad; a <= rad; a++) { const v = src[je * NP + ((ip + a + NP) % NP)]; if (mode === 'max') m = Math.max(m, v); else { m += v; n++; } } }
      out[ie * NP + ip] = mode === 'max' ? m : m / n; } return out; };
  let Rs = filt(filt(filt(Rm, 3, 'max'), 2, 'avg'), 2, 'avg');
  const Rat = (phi, el) => { const fp = (phi + Math.PI) / (2 * Math.PI) * NP - 0.5, fe = clamp((el + Math.PI / 2) / Math.PI * NE - 0.5, 0, NE - 1.001);
    const ip = Math.floor(fp), ie = Math.floor(fe), tp = fp - ip, te = fe - ie, g = (a, b) => Rs[clamp(ie + b, 0, NE - 1) * NP + (((ip + a) % NP) + NP) % NP];
    return lerp(lerp(g(0, 0), g(1, 0), tp), lerp(g(0, 1), g(1, 1), tp), te); };
  // ---- hem line (elevation vs |azimuth|): low on the forehead, over the ear (ear = 0 … 1 coverage), down to the nape
  const HK = [[0, 0.2], [0.55, 0.14], [1.05, lerp(-0.05, -0.2, ear)], [1.6, lerp(-0.12, -0.72, ear)], [2.2, lerp(-0.2, -0.6, ear)], [Math.PI, -0.62]];
  const hemAt = (phi) => { const a = Math.abs(phi); let h = HK[HK.length - 1][1];
    for (let i = 0; i < HK.length - 1; i++) if (a <= HK[i + 1][0]) { const t = (a - HK[i][0]) / (HK[i + 1][0] - HK[i][0]); h = lerp(HK[i][1], HK[i + 1][1], t * t * (3 - 2 * t)); break; }
    return h - 0.07 * Math.exp(-Math.pow(phi / 0.22, 2)) + 0.025 * Math.sin(phi) * Math.exp(-Math.pow(phi / 0.9, 2)); };   // the wrap's crossing point dips over the forehead
  const dirOf = (phi, el) => new THREE.Vector3(Math.sin(phi) * Math.cos(el), Math.sin(el), Math.cos(phi) * Math.cos(el));
  const dK = new THREE.Vector3(0, 0.42, -0.08).normalize(), dB = dirOf(Math.PI, -0.2);
  const N = TX.makeNoise(o.seed ?? 5);
  const NPc = 96, NRr = 30, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NRr; j++) for (let i = 0; i <= NPc; i++) {
    const phi = -Math.PI + 2 * Math.PI * i / NPc, h = hemAt(phi), t = j / NRr, el = h + (Math.PI / 2 - 0.02 - h) * Math.pow(t, 0.85);
    const d = dirOf(phi, el);
    const band = el - 0.28 * Math.cos(phi) + 0.05 * Math.sin(phi * 2);              // wrap layers: tilted, higher at the front
    const r0 = Math.pow(0.5 + 0.5 * Math.sin(band * 12.0 + 0.7 * Math.sin(phi * 3.0)), 3);
    // over the forehead the two wraps cross (an X of folds), round the back they run as tilted layers
    const rA = Math.pow(0.5 + 0.5 * Math.sin((el + 0.62 * phi) * 10.0), 4), rB = Math.pow(0.5 + 0.5 * Math.sin((el - 0.62 * phi) * 10.0 + 1.1), 4);
    const ridge = lerp(r0, Math.max(rA, rB), smoothstep(1.5, 0.5, Math.abs(phi)));
    const lump = N.n(phi * 2.2 + 3, el * 2.2 + 1, 64, 64);
    let th = 0.0058 + 0.0048 * ridge + 0.0016 * lump;
    th += 0.0035 * Math.exp(-Math.pow(t / 0.07, 2));                                  // rolled hem edge
    if (j === 0) th = 0.0016;                                                          // the hem tucks against the skin
    const aK = d.angleTo(dK); th += 0.085 * hu * Math.pow(Math.max(0, 1 - aK / 0.5), 1.6);   // topknot under the cloth
    const aB = d.angleTo(dB); th += 0.03 * hu * Math.pow(Math.max(0, 1 - aB / 0.32), 1.4);   // where the ends are knotted
    const R = Rat(phi, el) + th;
    pos.push(c0.x + d.x * R, c0.y + d.y * R, c0.z + d.z * R); uv.push(i / NPc * 7, t * 2.2);
  }
  for (let j = 0; j < NRr; j++) for (let i = 0; i < NPc; i++) { const a = j * (NPc + 1) + i, b = a + 1, c = a + NPc + 1, dd = c + 1; idx.push(a, b, c, b, dd, c); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cg.setIndex(idx); cg.computeVertexNormals();
  const ind = TX.mat('indigo', { repeat: [1, 1], tex: { salt: 0.12, seed: 21 }, color: new THREE.Color(o.clothTint ?? 0xb4c0d8) });
  ind.side = THREE.DoubleSide; ind.roughness = 0.95; if ('sheen' in ind) ind.sheen = 0.15;
  const cloth = new THREE.Mesh(cg, ind); cloth.name = 'nav_headcloth'; cloth.castShadow = cloth.receiveShadow = true;
  const head = fig.bone('head'); head.add(cloth);
  // knot + two short tails at the back (head-local)
  const knot = new THREE.Group(); head.add(knot);
  { const kp = c0.clone().addScaledVector(dB, Rat(Math.PI, -0.2) + 0.012);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.026 * hu / 0.23, 14, 10), ind); kn.scale.set(1.25, 0.8, 0.7); kn.position.copy(kp); knot.add(kn);
    for (const [sx, len, rz] of [[0.012, 0.075, 0.22], [-0.014, 0.06, -0.3]]) {
      const tg = new THREE.PlaneGeometry(0.022, len, 2, 6); tg.translate(0, -len / 2, 0);
      const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setZ(i, -0.012 * Math.pow(Math.max(0, -y / len), 1.4) + 0.003 * Math.sin(tp.getX(i) * 120)); }
      tg.computeVertexNormals();
      const tl = new THREE.Mesh(tg, ind); tl.position.copy(kp).add(new THREE.Vector3(sx, -0.008, -0.01)); tl.rotation.set(0.25, 0, rz); knot.add(tl);
    }
    knot.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); }
  // ---- beard: conforming skinned overlay of the head layer (jaw line, chin, upper lip; lips and cheeks above the
  // cheekbone stay bare), 1.5–3 mm proud, feathered into the skin at its edge
  let beard = null;
  if (o.beard !== false && fig.layers.head) {
    const src = fig.layers.head, g = src.geometry, pa = g.attributes.position, n = pa.count, w = new Float32Array(n);
    const E = (q, cx, cy, cz, rx, ry, rz) => clamp(1 - ((q.x - cx) / rx) ** 2 - ((q.y - cy) / ry) ** 2 - ((q.z - cz) / rz) ** 2, 0, 1);
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pa, i).applyMatrix4(inv).multiplyScalar(1 / hu); const q = { x: Math.abs(p.x), y: p.y, z: p.z };
      // short beard along the jaw line: below a line from the mouth corner up to the ear, in front of the ear
      const top = 0.0 + 0.62 * Math.max(0, q.x - 0.07);
      const jaw = E(q, 0.0, -0.02, 0.16, 0.44, 0.26, 0.38) * smoothstep(top + 0.02, top - 0.05, q.y) * smoothstep(-0.09, 0.0, q.z);
      const must = E(q, 0.0, 0.088, 0.37, 0.1, 0.026, 0.08) * smoothstep(0.0, 0.3, q.z);   // moustache over the upper lip
      const lips = E(q, 0.0, 0.042, 0.37, 0.07, 0.026, 0.09);
      w[i] = clamp(Math.max(jaw * 1.6, must * 1.6) - lips * 3.0, 0, 1);
    }
    const ix = g.index ? g.index.array : null, nt = ix ? ix.length / 3 : n / 3, keep = [], map = new Map(), ni = [];
    for (let t = 0; t < nt; t++) { const v = ix ? [ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2];
      if (Math.max(w[v[0]], w[v[1]], w[v[2]]) <= 0.02) continue;
      for (const a of v) { let k = map.get(a); if (k === undefined) { k = keep.length; map.set(a, k); keep.push(a); } ni.push(k); } }
    if (keep.length) {
      const bg = new THREE.BufferGeometry();
      for (const an of ['position', 'normal', 'skinIndex', 'skinWeight']) { const att = g.attributes[an]; if (!att) continue; const it = att.itemSize, sa = att.array, dst = new sa.constructor(keep.length * it);
        keep.forEach((v, j) => { for (let c = 0; c < it; c++) dst[j * it + c] = sa[v * it + c]; }); bg.setAttribute(an, new THREE.BufferAttribute(dst, it, att.normalized)); }
      const P2 = bg.attributes.position, N2 = bg.attributes.normal, colA = new Float32Array(keep.length * 4), uvA = new Float32Array(keep.length * 2);
      const skinC = new THREE.Color(0x7a5238), hairC = new THREE.Color(0x3b2617), tipC = new THREE.Color(0x86684a);
      keep.forEach((v, j) => {
        const ww = w[v], q = p.fromBufferAttribute(pa, v).applyMatrix4(inv).multiplyScalar(1 / hu);
        const nz = N.n(q.x * 40 + 5, q.y * 40 + 9, 256, 256), off = (0.0005 + 0.0019 * smoothstep(0.0, 0.8, ww)) * (0.85 + 0.3 * nz);
        P2.setXYZ(j, P2.getX(j) + N2.getX(j) * off, P2.getY(j) + N2.getY(j) * off, P2.getZ(j) + N2.getZ(j) * off);
        const c = hairC.clone().lerp(tipC, 0.4 * smoothstep(0.2, 0.9, nz + 0.6 * q.y + 0.3)).lerp(skinC, 1 - smoothstep(0.1, 0.75, ww));
        colA.set([c.r, c.g, c.b, smoothstep(0.03, 0.6, ww)], j * 4); uvA.set([q.x * 6, q.y * 6], j * 2);
      });
      bg.setAttribute('color', new THREE.BufferAttribute(colA, 4)); bg.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); bg.setIndex(ni);
      const bm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, transparent: false, alphaHash: true, normalMap: TX.cotton({ tone: [60, 44, 30], threads: 160, creases: 0.2, slub: 1.0, fade: 0.2, seed: 41 }).normalMap, normalScale: new THREE.Vector2(1.2, 1.2), envMapIntensity: 0.2 });
      beard = new THREE.SkinnedMesh(bg, bm); beard.name = 'nav_beard'; beard.castShadow = false; beard.receiveShadow = true;
      beard.bind(fig.skeleton, new THREE.Matrix4()); beard.frustumCulled = false; fig.root.add(beard);
    }
  }
  // ---- weathered skin (figure material only; close-up hands are toned by the modules)
  const sk = fig.materials.skin;
  if (sk) { sk.color.set(o.skin ?? 0x8f6346); if ('sheen' in sk) { sk.sheen = 0.1; sk.sheenColor && sk.sheenColor.set(0x6a4030); } sk.roughness = 0.62; }
  if (fig.layers.hair) fig.layers.hair.visible = false;
  // faded indigo jacket (it read royal blue under the cool hatch / moon light) and a darker, denser 交领 collar band so the
  // cross-collar reads against it (the library trim is cut in the jacket's own colour)
  const M = fig.materials;
  if (M.jacket) { M.jacket.color.set(o.jacket ?? 0x283043); if ('sheen' in M.jacket) M.jacket.sheen = Math.min(M.jacket.sheen, 0.2); }
  if (M['jacket.trim']) M['jacket.trim'].color.set(o.trim ?? 0x161d2b);
  const out = { cloth, knot, beard, hemAt, c0, Rat };
  fig.userData = fig.userData || {}; fig.userData.navDress = out;
  return out;
}

// ================================================================== PROP_PATCH canvas (hand-woven #7D9CBB plain weave, off-white running
// stitches, one uneven corner with a double knot + thread tail, frayed turned-under edge, centre rubbed soft and pale)
function patchCanvas(seed = 808, { W = 256, H = 256, Wm = 0.036, Hm = 0.042 } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const q = c.getContext('2d'); const r = rng(seed);
  const mx = 0.002 / Wm * W, my = 0.002 / Hm * H, pw = W - 2 * mx, ph = H - 2 * my;
  q.clearRect(0, 0, W, H); q.save(); q.beginPath();
  for (let k = 0; k <= 64; k++) { const t = k / 64; let x, y; if (t < 0.25) { x = mx + pw * t * 4; y = my; } else if (t < 0.5) { x = mx + pw; y = my + ph * (t - 0.25) * 4; } else if (t < 0.75) { x = mx + pw * (1 - (t - 0.5) * 4); y = my + ph; } else { x = mx; y = my + ph * (1 - (t - 0.75) * 4); }
    x += (r() - 0.5) * 2.2; y += (r() - 0.5) * 2.2; k ? q.lineTo(x, y) : q.moveTo(x, y); }
  q.closePath(); q.clip();
  q.fillStyle = '#7D9CBB'; q.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) { q.fillStyle = `rgba(40,60,90,${0.10 + r() * 0.08})`; q.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x += 3) { q.fillStyle = `rgba(230,238,245,${0.05 + r() * 0.06})`; q.fillRect(x, 0, 1, H); }
  for (let k = 0; k < 40; k++) { q.fillStyle = `rgba(${r() < 0.5 ? '60,80,110' : '170,190,210'},0.08)`; q.fillRect(r() * W, 0, 1 + r() * 2, H); }
  const rg = q.createRadialGradient(W / 2, H * 0.53, 8, W / 2, H * 0.53, W * 0.36); rg.addColorStop(0, 'rgba(176,198,222,0.55)'); rg.addColorStop(0.6, 'rgba(160,184,212,0.16)'); rg.addColorStop(1, 'rgba(160,184,212,0)');
  q.fillStyle = rg; q.fillRect(0, 0, W, H);
  q.strokeStyle = 'rgba(40,52,70,0.55)'; q.lineWidth = 3; q.strokeRect(mx + 1, my + 1, pw - 2, ph - 2);
  q.restore();
  const st = 0.0025 / Wm * W, sl = 0.003 / Wm * W;
  q.strokeStyle = '#E3DDCC'; q.lineCap = 'round'; q.lineWidth = 2.0;
  const run = (x0, y0, x1, y1, uneven) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / (sl * 1.8)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let k = 0; k < n; k++) { const bad = uneven && k > n - 4, t0 = (k + 0.1 + (r() - 0.5) * 0.25) / n, t1 = t0 + (sl / L) * (bad ? 0.5 + r() * 1.1 : 0.8 + r() * 0.4);
      const j0 = (r() - 0.5) * (bad ? 5 : 1.6), j1 = (r() - 0.5) * (bad ? 5 : 1.6);
      q.beginPath(); q.moveTo(x0 + (x1 - x0) * t0 + nx * j0, y0 + (y1 - y0) * t0 + ny * j0); q.lineTo(x0 + (x1 - x0) * Math.min(t1, 1) + nx * j1, y0 + (y1 - y0) * Math.min(t1, 1) + ny * j1); q.stroke(); } };
  const X0 = mx + st, X1 = W - mx - st, Y0 = my + st, Y1 = H - my - st;
  run(X0, Y0, X1, Y0, true); run(X1, Y1, X1, Y0, true); run(X1, Y1, X0, Y1, false); run(X0, Y1, X0, Y0, false);
  q.fillStyle = '#E6E0D0'; q.strokeStyle = 'rgba(120,110,95,0.6)'; q.lineWidth = 0.8;
  for (const [dx, dy, rr] of [[-5, 6, 4.0], [-1, 2, 3.4]]) { q.beginPath(); q.arc(X1 + dx, Y0 + dy, rr, 0, Math.PI * 2); q.fill(); q.stroke(); }
  q.strokeStyle = 'rgba(227,221,204,0.9)'; q.lineWidth = 1.4; q.beginPath(); q.moveTo(X1 - 3, Y0 + 6); q.quadraticCurveTo(X1 + 6, Y0 + 12, X1 + 4, Y0 + 20); q.stroke();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// ================================================================== close-up salt hands: smooth the nail-fold normals (integration)
// The library's nail plate border is a jagged surface-nets edge: under a grazing practical its normals flip and the nail fold
// prints as black squiggles ("insects", QA S011 / S045). Laplacian-smooth the normals (and a little of the positions) of the
// skin vertices on and around the nail border, in place on this hand's geometry.
export function smoothNailFolds(hand, { iters = 4 } = {}) {
  const m = hand.meshes && hand.meshes.skin; if (!m || m.userData.nailSmoothed) return; m.userData.nailSmoothed = true;
  const g = m.geometry, aux = g.attributes.aux, P = g.attributes.position, N = g.attributes.normal, ix = g.index && g.index.array; if (!aux || !ix || !N) return;
  const n = P.count, nb = Array.from({ length: n }, () => []);
  for (let t = 0; t < ix.length; t += 3) { const a = ix[t], b = ix[t + 1], c = ix[t + 2]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
  // region: nail mask strictly between 0 and 1 (the border), dilated by two rings
  let sel = new Uint8Array(n); for (let i = 0; i < n; i++) { const x = aux.getX(i); if (x > 0.02 && x < 0.98) sel[i] = 1; }
  for (let r = 0; r < 2; r++) { const s2 = sel.slice(); for (let i = 0; i < n; i++) if (sel[i]) for (const j of nb[i]) s2[j] = 1; sel = s2; }
  const nn = new Float32Array(N.array), pp = new Float32Array(P.array);
  for (let it = 0; it < iters; it++) {
    const src = nn.slice(), sp = pp.slice();
    for (let i = 0; i < n; i++) { if (!sel[i]) continue; let x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2], px = 0, py = 0, pz = 0, k = 0;
      for (const j of nb[i]) { x += src[j * 3]; y += src[j * 3 + 1]; z += src[j * 3 + 2]; px += sp[j * 3]; py += sp[j * 3 + 1]; pz += sp[j * 3 + 2]; k++; }
      const l = Math.hypot(x, y, z) || 1; nn[i * 3] = x / l; nn[i * 3 + 1] = y / l; nn[i * 3 + 2] = z / l;
      if (k) { pp[i * 3] = lerp(sp[i * 3], px / k, 0.35); pp[i * 3 + 1] = lerp(sp[i * 3 + 1], py / k, 0.35); pp[i * 3 + 2] = lerp(sp[i * 3 + 2], pz / k, 0.35); } }
  }
  N.array.set(nn); N.needsUpdate = true; P.array.set(pp); P.needsUpdate = true;
}

// ================================================================== turned-back cuff with the patch INSIDE (integration; shared with sea_deck)
// The library's cuffTurned cuff is a static roll with the patch printed on its outside (it read as a laundry label). This
// replaces it on a close-up NAVIGATOR right hand: a short sleeve tube + a FLAP (the last ≈ 4.6 cm of the sleeve) hinged on a
// ring 6 cm above the wrist. setFold(α): α = 0 the flap hangs down over the wrist like a plain cuff (outside = faded indigo);
// α = π it is turned back up over the sleeve, so its INNER face — with the hand-sewn patch — faces out. The fold leads on the
// side being pinched (aPinch). The patch sits on the inner face at angle uPatchA (set per shot so it faces the lens).
// Forearm-bone local frame (wrist at the origin, forearm +Y), x squashed by 0.86 like the library sleeve.
export function buildCuffFlap(hand, o = {}) {
  const R = o.R ?? 0.052, ex = 0.86, yH = o.hinge ?? 0.062, LF = o.len ?? 0.046, rb = 0.0032, NA = 72, NS = 14;
  const fore = hand.byName.forearm;
  const grp = new THREE.Group(); grp.name = 'cuffFlap'; fore.add(grp);
  const ind = TX.mat('indigo', { repeat: [3, 1.2], tex: { salt: 0.18, seed: 12 }, side: THREE.DoubleSide, color: new THREE.Color(o.tint ?? 0x7b8aa6) });
  ind.roughness = 0.93; if ('sheen' in ind) ind.sheen = 0.18;
  // sleeve tube (hinge → under the module's forearm sleeve tube)
  { const g = new THREE.CylinderGeometry(R * 1.06, R, 0.075, 48, 8, true); g.translate(0, yH + 0.0375, 0);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.03 * Math.sin(a * 3 + y * 60) + 0.02 * Math.sin(a * 5 - y * 90); p.setXYZ(i, x * k * ex, y, z * k); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, ind); m.castShadow = m.receiveShadow = true; grp.add(m); }
  // flap: grid (angle × along-cloth), positions per fold state; aFl = (angle, s)
  const pos = new Float32Array((NA + 1) * (NS + 1) * 3), fl = new Float32Array((NA + 1) * (NS + 1) * 2), uv = new Float32Array((NA + 1) * (NS + 1) * 2), idx = [];
  for (let j = 0; j <= NS; j++) for (let i = 0; i <= NA; i++) { const k = j * (NA + 1) + i, a = -Math.PI + 2 * Math.PI * i / NA, s = LF * j / NS; fl[k * 2] = a; fl[k * 2 + 1] = s; uv[k * 2] = i / NA * 3; uv[k * 2 + 1] = s / LF * 0.4; }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('aFl', new THREE.BufferAttribute(fl, 2)); fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); fg.setIndex(idx);
  const tPatch = patchCanvas(o.seed ?? 808);
  const U = { tPatch: { value: tPatch }, uPatchA: { value: 0 }, uPatchW: { value: 0.043 }, uS0: { value: 0.002 }, uS1: { value: 0.045 }, uR: { value: R }, uFlip: { value: -1 }, uInner: { value: new THREE.Color(0x232c3c) } };
  const fm = ind.clone(); fm.side = THREE.DoubleSide;
  fm.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec2 aFl; varying vec2 vFl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFl = aFl;');
    sh.fragmentShader = 'varying vec2 vFl; uniform sampler2D tPatch; uniform float uPatchA, uPatchW, uS0, uS1, uR, uFlip; uniform vec3 uInner;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      bool innerFace = (gl_FrontFacing ? 1.0 : -1.0) * uFlip < 0.0;
      if (innerFace) {
        diffuseColor.rgb = uInner * (0.85 + 0.3 * diffuseColor.r / max(0.05, diffuseColor.r + diffuseColor.g + diffuseColor.b) * 3.0);
        float da = atan(sin(vFl.x - uPatchA), cos(vFl.x - uPatchA));
        vec2 pu = vec2(da * uR / uPatchW + 0.5, (vFl.y - uS0) / (uS1 - uS0));
        if (pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) { vec4 pc = texture2D(tPatch, vec2(pu.x, 1.0 - pu.y)); diffuseColor.rgb = mix(diffuseColor.rgb, pc.rgb, step(0.4, pc.a)); }
      }`);
  };
  fm.customProgramCacheKey = () => 'nav_cuff_flap';
  const flap = new THREE.Mesh(fg, fm); flap.castShadow = flap.receiveShadow = true; flap.frustumCulled = false; grp.add(flap);
  const profile = (s, al) => { const sb = rb * al; if (s <= sb) { const t = s / rb; return [rb * (1 - Math.cos(t)), -rb * Math.sin(t)]; } return [rb * (1 - Math.cos(al)) + (s - sb) * Math.sin(al), -rb * Math.sin(al) - (s - sb) * Math.cos(al)]; };
  let aPinch = 0, alpha = Math.PI;
  const local = (a, s, out = new THREE.Vector3()) => {
    const al = Math.max(0, alpha - (Math.PI - alpha) * 0.35 * (1 - Math.cos(a - aPinch)) / 2);   // the pinched side leads; fully folded at α = π
    const [dr, dy] = profile(s, al), wav = 0.0012 * Math.sin(a * 7 + 1.3) * (s / LF) + 0.0008 * Math.sin(a * 13);
    const rr = R * (1 + 0.025 * Math.sin(a * 3 + 0.5)) + dr + wav;
    return out.set(Math.cos(a) * rr * ex, yH + dy, Math.sin(a) * rr);
  };
  const tmp = new THREE.Vector3();
  const setFold = (al, ap = aPinch) => {
    alpha = al; aPinch = ap;
    for (let j = 0; j <= NS; j++) for (let i = 0; i <= NA; i++) { const k = j * (NA + 1) + i; local(fl[k * 2], fl[k * 2 + 1], tmp); pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z; }
    fg.attributes.position.needsUpdate = true; fg.computeVertexNormals();
  };
  setFold(Math.PI, 0);
  // the library cuff (and any patch decal on it) is replaced
  const hideLib = (on = true) => { for (const m of hand.meshes.cuffs || []) { m.visible = !on; m.traverse((c) => { if (c !== m && c.name === 'patch_decal') c.visible = !on; }); if (m.parent) for (const c of m.parent.children) if (c.name === 'patch_decal') c.visible = !on; } grp.visible = on; };
  // angle (forearm-local) whose surface normal points at a world point (e.g. the camera)
  const angleToward = (P) => { fore.updateWorldMatrix(true, false); const q = fore.worldToLocal(P.clone()); return Math.atan2(q.z, q.x / ex); };
  const worldAt = (a, s) => { fore.updateWorldMatrix(true, false); return fore.localToWorld(local(a, s)); };
  return { group: grp, flap, uniforms: U, setFold, hideLib, angleToward, worldAt, R, LF, yH, get alpha() { return alpha; } };
}

// ------------------------------------------------------------------ small helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d, m, x, y, z, { cast = true, recv = true } = {}) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = recv; return o; };
// camera with an explicit up vector (top-down shots)
function placeUp(camera, pos, target, up) { camera.position.copy(pos); camera.up.copy(up).normalize(); camera.lookAt(target); camera.up.set(0, 1, 0); }
// box-projected UVs in metres / tile (no stretched texture on long thin props)
function boxUV(geo, tile = 0.25) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [a, b] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, a / tile + 0.37, b / tile + 0.61);
  }
  uv.needsUpdate = true; return geo;
}
// ship motion (period ≈ 7 s): roll (about z, rad), pitch (about x)
const roll = (T) => 0.035 * Math.sin(T * 2 * Math.PI / 7.0) + 0.01 * Math.sin(T * 2 * Math.PI / 4.3 + 1.1);
const pitch = (T) => 0.012 * Math.sin(T * 2 * Math.PI / 7.0 + 1.4);

export default async function create(ctx) {
  const { cam } = ctx;
  const DBG = new URLSearchParams(location.search).has('dbg');
  const OFF = new Set((new URLSearchParams(location.search).get('off') || '').split(',').filter(Boolean));
  const dbg = (...a) => { if (DBG) console.log('[ship_cabin]', ...a.map((x) => (x && x.isVector3 ? x.toArray().map((q) => q.toFixed(3)).join(',') : typeof x === 'object' ? JSON.stringify(x) : x))); };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020304);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.01, 600);
  camera.userData.H = ctx.H;
  const envCabin = envTexture(ctx.renderer, 'candle_interior', { warmth: 1.0, moon: 1.6 });
  scene.environment = envCabin; scene.environmentIntensity = 0.55;

  // film grain: the engine's integer-hash grain (engine/post.js) through post only — CT_NAV 0.042 (integration pass: the
  // module-side half-res grain quad of the review is gone; nested views get no grain from the engine)
  const GRAIN = 0.042;

  const cabin = new THREE.Group(); cabin.name = 'cabin'; scene.add(cabin);
  const ext = new THREE.Group(); ext.name = 'exterior'; scene.add(ext);

  // ================================================================ materials
  const mWall = TX.mat('wood_smoke', { repeat: [1.6, 0.9], tex: { planks: 7, seed: 3, wear: 0.6 } });
  const mWall2 = TX.mat('wood_smoke', { repeat: [1.2, 0.8], tex: { planks: 6, seed: 5, wear: 0.7 } });
  const mFloor = TX.mat('wood_smoke', { repeat: [1.4, 1.4], tex: { planks: 6, seed: 7, wear: 0.9, salt: 0.15 } });
  const mCeil = TX.mat('wood_smoke', { repeat: [1.3, 1.3], tex: { planks: 6, seed: 9, wear: 0.4 } });   // (review) untinted: the tint made the deck-head a dead black field during the S007 tilt
  const mBeam = TX.mat('wood_beam', { repeat: [1.2, 0.3], tex: { seed: 4 } });
  const mTable = TX.mat('wood_smoke', { repeat: [0.7, 0.9], tex: { planks: 4, seed: 11, wear: 1.0, joints: 0 }, color: 0xd8c8b4 });
  const mBox = TX.mat('camphor', { repeat: [0.35, 0.35], tex: { seed: 6 } });
  const mBrass = TX.mat('brass', { repeat: [0.6, 0.6], tex: { tone: 'then', patina: 0.06, polish: 0.75, scratches: 0.35, seed: 8 }, envMapIntensity: 1.3 });
  // (integration) dull cast brass #8E7348 with one lamp highlight: at envMapIntensity 1.5 the warm cabin env made them read as emissive orange tubes
  const mBrassBar = TX.mat('brass', { repeat: [1, 1], tex: { tone: 'then', patina: 0.14, polish: 0.4, seed: 12 }, envMapIntensity: 0.22, metalness: 0.55, roughness: 0.8, color: new THREE.Color(0x8e7348).multiplyScalar(0.9) });
  const mDeck = TX.mat('wood_ship', { repeat: [2.5, 2.5], tex: { salt: 0.35, seed: 14 } });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x1b140e, roughness: 0.85 });
  const mRope = new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.95 });

  // ================================================================ cabin shell
  {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.0), mFloor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; cabin.add(floor);
    // deck-head (ceiling) with the hatch hole: 4 slabs
    const th = DECK_T, y = CEIL + th / 2;
    cabin.add(box(HATCH.x0 - CAB.x0, th, 2.0, mCeil, (CAB.x0 + HATCH.x0) / 2, y, 0));
    cabin.add(box(CAB.x1 - HATCH.x1, th, 2.0, mCeil, (CAB.x1 + HATCH.x1) / 2, y, 0));
    cabin.add(box(HATCH.x1 - HATCH.x0, th, HATCH.z0 - CAB.z0, mCeil, (HATCH.x0 + HATCH.x1) / 2, y, (CAB.z0 + HATCH.z0) / 2));
    cabin.add(box(HATCH.x1 - HATCH.x0, th, CAB.z1 - HATCH.z1, mCeil, (HATCH.x0 + HATCH.x1) / 2, y, (CAB.z1 + HATCH.z1) / 2));
    // hatch trimmers (under the deck, framing the opening)
    for (const [w, d, x, z] of [[0.08, 0.86, HATCH.x0 - 0.04, -0.6], [0.08, 0.86, HATCH.x1 + 0.04, -0.6], [0.86, 0.08, 0.1, HATCH.z0 - 0.04], [0.86, 0.08, 0.1, HATCH.z1 + 0.04]]) cabin.add(box(w, 0.07, d, mBeam, x, CEIL - 0.035, z));
    // beams
    cabin.add(box(2.4, BEAM_D, BEAM_W, mBeam, 0, CEIL - BEAM_D / 2, BEAM_A));
    cabin.add(box(2.4, BEAM_D, BEAM_W, mBeam, 0, CEIL - BEAM_D / 2, BEAM_B));
    // side walls (planked) and forward bulkhead
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, CEIL), mWall); wl.position.set(CAB.x0, CEIL / 2, 0); wl.rotation.y = Math.PI / 2; wl.receiveShadow = true; cabin.add(wl);
    const wr = new THREE.Mesh(new THREE.PlaneGeometry(2.0, CEIL), mWall); wr.position.set(CAB.x1, CEIL / 2, 0); wr.rotation.y = -Math.PI / 2; wr.receiveShadow = true; cabin.add(wr);
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(2.4, CEIL), mWall2); wf.position.set(0, CEIL / 2, CAB.z1); wf.rotation.y = Math.PI; wf.receiveShadow = true; cabin.add(wf);
    // stern wall with the window opening (4 panels)
    const sx0 = WIN.cx - WIN.w / 2, sx1 = WIN.cx + WIN.w / 2, sy0 = WIN.cy - WIN.h / 2, sy1 = WIN.cy + WIN.h / 2;
    const sw = (w, h, x, yy) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mWall2); m.position.set(x, yy, CAB.z0); m.receiveShadow = true; m.castShadow = true; cabin.add(m); };
    sw(sx0 - CAB.x0, CEIL, (CAB.x0 + sx0) / 2, CEIL / 2); sw(CAB.x1 - sx1, CEIL, (CAB.x1 + sx1) / 2, CEIL / 2);
    sw(WIN.w, sy0, WIN.cx, sy0 / 2); sw(WIN.w, CEIL - sy1, WIN.cx, (sy1 + CEIL) / 2);
    // window frame (reveal) + sliding board pushed aside
    for (const [w, h, x, yy] of [[WIN.w + 0.08, 0.04, WIN.cx, sy0 - 0.02], [WIN.w + 0.08, 0.04, WIN.cx, sy1 + 0.02], [0.04, WIN.h, sx0 - 0.02, WIN.cy], [0.04, WIN.h, sx1 + 0.02, WIN.cy]]) cabin.add(box(w, h, 0.07, mBeam, x, yy, CAB.z0 + 0.02));
    cabin.add(box(0.36, WIN.h + 0.06, 0.02, mBeam, sx1 + 0.2, WIN.cy, CAB.z0 + 0.05));
    // knees / frames on the side walls
    for (const z of [-0.55, 0.15, 0.85]) for (const x of [CAB.x0 + 0.05, CAB.x1 - 0.05]) cabin.add(box(0.1, CEIL, 0.1, mBeam, x, CEIL / 2, z));
  }
  // ---- chart table (fold-down, hinged under the window, legs/bracket forward) + compass box let into its port side
  {
    cabin.add(box(TABLE.x1 - TABLE.x0, TABLE.th, TABLE.z1 - TABLE.z0, mTable, (TABLE.x0 + TABLE.x1) / 2, TABLE.y - TABLE.th / 2, (TABLE.z0 + TABLE.z1) / 2));
    cabin.add(box(TABLE.x1 - TABLE.x0, 0.05, 0.04, mBeam, (TABLE.x0 + TABLE.x1) / 2, TABLE.y - 0.06, TABLE.z1 - 0.03));
    for (const x of [TABLE.x0 + 0.05, TABLE.x1 - 0.05]) { const leg = box(0.04, TABLE.y - 0.06, 0.04, mBeam, x, (TABLE.y - 0.06) / 2, TABLE.z1 - 0.06); cabin.add(leg); }
    const strut = box(0.03, 0.03, 0.8, mBeam, TABLE.x0 + 0.05, 0.25, -0.55); strut.rotation.x = 0.45; cabin.add(strut);
  }
  // ---- compass in its box (in-use state: warm brass, soot in grooves, salt bloom at the south rim, intact mica)
  const comp = new THREE.Group(); comp.position.set(CP.x, 0, CP.z); comp.rotation.y = Math.PI; cabin.add(comp); // dial south (local +Z) → world −z
  let needle, needleShadow, salt, saltMask, mica;
  {
    const bx = box(0.19, 0.05, 0.19, mBox, 0, BOX_TOP - 0.025, 0); comp.add(bx);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(COMP_R + 0.004, 0.004, 8, 64), mBox); lip.rotation.x = Math.PI / 2; lip.position.y = BOX_TOP; comp.add(lip);
    // brass body: lathe (outer wall, rounded rim lip, dial plane)
    const prof = [[0, DIAL_Y - 0.032], [COMP_R - 0.002, DIAL_Y - 0.032], [COMP_R, DIAL_Y - 0.03], [COMP_R + 0.0005, RIM_Y - 0.004], [COMP_R - 0.0008, RIM_Y], [COMP_R - 0.0035, RIM_Y + 0.0003], [FACE_R + 0.0004, RIM_Y - 0.0006], [FACE_R, DIAL_Y + 0.0002]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 96), mBrass); body.castShadow = true; body.receiveShadow = true; comp.add(body);
    const face = new THREE.Mesh(new THREE.RingGeometry(WELL_R, FACE_R, 96, 2), TX.mat('compass', { tex: { state: 'then', seed: 6 }, envMapIntensity: 1.25 }));
    face.rotation.x = -Math.PI / 2; face.position.y = DIAL_Y; face.receiveShadow = true; comp.add(face);
    // needle well floor (dark lacquer) below the dial
    const well = new THREE.Mesh(new THREE.CylinderGeometry(WELL_R, WELL_R, 0.006, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.5, side: THREE.BackSide })); well.position.y = DIAL_Y - 0.003; comp.add(well);
    const wc = document.createElement('canvas'); wc.width = wc.height = 256; const wg = wc.getContext('2d');
    const wgr = wg.createRadialGradient(128, 128, 10, 128, 128, 128); wgr.addColorStop(0, '#9a8466'); wgr.addColorStop(0.85, '#7e6a50'); wgr.addColorStop(1, '#4a3c2c');
    wg.fillStyle = wgr; wg.fillRect(0, 0, 256, 256);
    const wr2 = rng(61); for (let k = 0; k < 500; k++) { const a = wr2() * Math.PI * 2, r0 = wr2() * 120; wg.strokeStyle = `rgba(${wr2() < 0.5 ? '60,46,30' : '170,150,120'},0.12)`; wg.lineWidth = 0.8; wg.beginPath(); wg.arc(128, 128, r0, a, a + 0.2 + wr2() * 0.5); wg.stroke(); }
    wg.strokeStyle = 'rgba(30,22,14,0.85)'; wg.lineWidth = 2; for (const dx of [-5, 5]) { wg.beginPath(); wg.moveTo(128 + dx, 6); wg.lineTo(128 + dx, 250); wg.stroke(); }
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
    const wellFloor = new THREE.Mesh(new THREE.CircleGeometry(WELL_R, 48), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.38, metalness: 0.0, envMapIntensity: 0.6 })); wellFloor.rotation.x = -Math.PI / 2; wellFloor.position.y = DIAL_Y - 0.0058; wellFloor.receiveShadow = true; comp.add(wellFloor);
    // pivot pin + needle (blued steel, diamond section, red-lacquer south tip, brass cap)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0009, 0.004, 10), mBrass); pin.position.y = DIAL_Y - 0.0038; comp.add(pin);
    needle = new THREE.Group(); needle.position.y = DIAL_Y - 0.0016; comp.add(needle);
    const L = 0.018, wN = 0.0021, hN = 0.0007;
    const ng = new THREE.BufferGeometry();
    const vtx = [0, hN, L, wN, 0, 0, 0, hN, -L, -wN, 0, 0, 0, -hN * 0.3, L * 0.98, 0, -hN * 0.3, -L * 0.98];
    ng.setAttribute('position', new THREE.Float32BufferAttribute(vtx, 3));
    ng.setIndex([0, 1, 2, 0, 2, 3, 4, 1, 0, 5, 2, 1, 0, 3, 4, 2, 5, 3, 1, 4, 5, 3, 5, 4].slice(0, 24));
    ng.computeVertexNormals();
    const needleM = new THREE.MeshPhysicalMaterial({ color: 0x1d2a3e, metalness: 0.9, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1.6, flatShading: true });
    const nm = new THREE.Mesh(ng, needleM); nm.castShadow = true; needle.add(nm);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 16, 10), new THREE.MeshPhysicalMaterial({ color: PAL.P16, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.1 }));
    red.scale.set(0.75, 0.42, 1.25); red.position.set(0, hN * 0.35, L * 0.8); needle.add(red);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0019, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mBrass); cap.scale.y = 0.8; cap.position.y = hN * 0.4; needle.add(cap);
    // soft contact shadow of the needle on the well floor (follows the rotation)
    needleShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.038), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false, map: TX.spriteTexture('soft') }));
    needleShadow.rotation.x = -Math.PI / 2; needleShadow.position.y = DIAL_Y - 0.0056; comp.add(needleShadow);
    // mica cover: faintly golden, laminated (alpha streaks), catches the window and lamp
    const mc = document.createElement('canvas'); mc.width = mc.height = 256; const mg = mc.getContext('2d'); const mr = rng(51);
    mg.fillStyle = '#ffffff'; mg.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 70; k++) { mg.fillStyle = `rgba(${150 + mr() * 60},${120 + mr() * 50},${60 + mr() * 40},${0.08 + mr() * 0.14})`; mg.beginPath(); const x = mr() * 256, y = mr() * 256; mg.ellipse(x, y, 10 + mr() * 60, 3 + mr() * 14, mr() * 3.1, 0, Math.PI * 2); mg.fill(); }
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    mica = new THREE.Mesh(new THREE.CircleGeometry(WELL_R + 0.0012, 64), new THREE.MeshPhysicalMaterial({ color: 0xffe2a8, map: mt, transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4, depthWrite: false }));
    mica.rotation.x = -Math.PI / 2; mica.position.y = DIAL_Y + 0.0003; mica.renderOrder = 5; comp.add(mica);
    // salt bloom on the rim at the south mark (wiped by the thumb in S006)
    const segN = 48, a0 = Math.PI / 2 - 0.17, a1 = Math.PI / 2 + 0.19, ri = FACE_R + 0.0002, ro = COMP_R + 0.0004; // local angle: atan2(z, x); +π/2 = +Z = south
    const pos = [], uv = [], idx = [];
    for (let k = 0; k <= segN; k++) { const a = lerp(a0, a1, k / segN); for (const [rr, vv] of [[ri, 0], [ro, 1]]) { const yy = RIM_Y + 0.0006; pos.push(Math.cos(a) * rr, yy, Math.sin(a) * rr); uv.push(k / segN, vv); } }
    for (let k = 0; k < segN; k++) { const i0 = k * 2; idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
    const st = TX.withRepeat(TX.saltCrust({ density: 0.85, seed: 21 }), 3, 0.4);
    const mk = document.createElement('canvas'); mk.width = 256; mk.height = 4; const kg = mk.getContext('2d'); const kgr = kg.createLinearGradient(0, 0, 256, 0);
    kgr.addColorStop(0, '#000'); kgr.addColorStop(0.47, '#000'); kgr.addColorStop(0.53, '#fff'); kgr.addColorStop(1, '#fff'); kg.fillStyle = kgr; kg.fillRect(0, 0, 256, 4);
    saltMask = new THREE.CanvasTexture(mk); saltMask.wrapS = THREE.ClampToEdgeWrapping;
    const sm = new THREE.MeshStandardMaterial({ map: st.map, alphaMap: saltMask, transparent: true, depthWrite: false, roughness: 0.6, color: 0xf6f3ea, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    salt = new THREE.Mesh(sg, sm); salt.renderOrder = 4; comp.add(salt);
    comp.traverse((o) => { if (o.isMesh && o !== mica && o !== salt && o !== needleShadow) { o.receiveShadow = true; } });
  }
  // ---- the chart (in use): deformable sheet (free lower-right corner lifts in the gust), roller, two brass bars, stone, wax
  const chartGrp = new THREE.Group(); chartGrp.position.set(CH.x0, CH.y, CH.z0); chartGrp.rotation.y = Math.PI / 2; cabin.add(chartGrp);
  const NX = 72, NZ = 40;
  const chartGeo = new THREE.PlaneGeometry(CH.L, CH.Wd, NX, NZ);
  const chartRoll = [];
  {
    // re-lay the plane: local X = u·L, local Z = v·Wd (v from the top edge), y up
    const p = chartGeo.attributes.position, uvA = chartGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const u = uvA.getX(i), vv = 1 - uvA.getY(i); p.setXYZ(i, u * CH.L, 0, vv * CH.Wd); }
    chartGeo.computeVertexNormals();
    chartGeo.userData.rest = Float32Array.from(p.array);
  }
  const ct = needleChart('then');
  const mChart = new THREE.MeshStandardMaterial({ map: ct.map, normalMap: ct.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.86, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.25 });
  // (integration) S005's stern-window light: one soft vertical dusk-blue band at frame right (x 0.78–0.95, i.e. a strip across
  // the chart near its stern end, world z ≈ −0.93…−0.80) with two thin bar shadows running along it; lit as light × albedo
  const chartBand = { uBand: { value: 0 }, uBandCol: { value: new THREE.Color(0x3a6cc0) } };
  mChart.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, chartBand);
    sh.vertexShader = 'varying vec3 vWpC;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWpC = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWpC; uniform float uBand; uniform vec3 uBandCol;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.72, 0.58), 0.82);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (uBand > 0.0) { float z = vWpC.z; float b = smoothstep(-0.958, -0.925, z) * (1.0 - smoothstep(-0.818, -0.785, z));
          float bars = 1.0 - 0.62 * (1.0 - smoothstep(0.0015, 0.0045, abs(z + 0.848))) - 0.62 * (1.0 - smoothstep(0.0015, 0.0045, abs(z + 0.892)));
          float soft = 0.85 + 0.15 * sin(vWpC.x * 23.0 + 1.3);
          totalEmissiveRadiance += uBandCol * uBand * b * bars * soft * diffuseColor.rgb; }`);
  };
  mChart.customProgramCacheKey = () => 'cabin_chart_back';
  const chartMesh = new THREE.Mesh(chartGeo, mChart); chartMesh.castShadow = true; chartMesh.receiveShadow = true; chartGrp.add(chartMesh);
  {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CH.Wd + 0.004, 32), new THREE.MeshStandardMaterial({ color: 0xcdbb94, roughness: 0.85 }));
    roll.rotation.x = Math.PI / 2; roll.position.set(-0.012, 0.014, CH.Wd / 2); roll.castShadow = roll.receiveShadow = true; chartGrp.add(roll); chartRoll.push(roll);
    for (const zz of [-0.012, CH.Wd + 0.012]) { const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 20), mDark); knob.rotation.x = Math.PI / 2; knob.position.set(-0.012, 0.014, zz); knob.castShadow = true; chartGrp.add(knob); chartRoll.push(knob); }
    // (review) the 镇纸 are cast brass bars with eased edges (the edges catch the lamp, so they read as metal from above);
    // UVs box-projected in metres (the stretched texture drew copper-pipe streaks); a raised spine along the top
    const bar = (len, u, v, alongX) => { const g = boxUV(new RoundedBoxGeometry(alongX ? len : 0.022, 0.012, alongX ? 0.022 : len, 3, 0.0028), 0.12); const m = new THREE.Mesh(g, mBrassBar); m.position.set(u * CH.L, 0.006, v * CH.Wd); m.castShadow = m.receiveShadow = true; chartGrp.add(m);
      const top = new THREE.Mesh(boxUV(new RoundedBoxGeometry(alongX ? len * 0.9 : 0.009, 0.006, alongX ? 0.009 : len * 0.9, 2, 0.0025), 0.12), mBrassBar); top.position.set(u * CH.L, 0.0125, v * CH.Wd); top.castShadow = true; chartGrp.add(top); return m; };
    const [b1u, b1v] = frameToUV(T03.bar1[0], T03.bar1[1]); bar(0.2, b1u, b1v, false);
    const [b2u, b2v] = frameToUV(0.75, T03.bar2[1]); bar(0.27, 0.775, b2v, true); void b2u;
    const [su, sv] = frameToUV(T03.stone[0], T03.stone[1]);
    // (review) a sea-worn pebble: displaced icosphere with box-projected UVs (the UV sphere showed a pale wedge at its seam)
    const sGeo = new THREE.IcosahedronGeometry(0.03, 5); { const pp = sGeo.attributes.position, sn = TX.makeNoise(41);
      for (let i = 0; i < pp.count; i++) { const v3 = V(pp.getX(i), pp.getY(i), pp.getZ(i)); const k = 1 + 0.06 * sn.n(v3.x * 60 + 7, v3.z * 60 + 9 + v3.y * 30, 512, 512) + 0.03 * sn.n(v3.y * 140 + 3, v3.x * 140 + 1, 512, 512); v3.multiplyScalar(k); pp.setXYZ(i, v3.x, v3.y, v3.z); }
      sGeo.computeVertexNormals();
      const cc = []; for (let i = 0; i < pp.count; i++) { const m = 0.5 + 0.5 * sn.n(pp.getX(i) * 300 + 11, pp.getZ(i) * 300 + pp.getY(i) * 200 + 5, 1024, 1024), f = 0.5 + 0.5 * sn.n(pp.getX(i) * 1500 + 3, pp.getZ(i) * 1500 + 7, 1024, 1024);
        const k = 0.78 + 0.22 * m + 0.1 * (f > 0.82 ? 1 : 0); cc.push(0.25 * k, 0.245 * k, 0.235 * k); }
      sGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); }
    // the pointed-block 'granite' set read as a wicker ball here: a smooth grey sea pebble, faintly speckled
    const stone = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.5 }));
    stone.scale.set(1.05, 0.55, 0.9); stone.position.set(su * CH.L, 0.014, sv * CH.Wd); stone.rotation.y = 0.6; stone.castShadow = stone.receiveShadow = true; chartGrp.add(stone);
    const [wu, wv] = frameToUV(T03.wax[0], T03.wax[1]);
    const wax = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 20, 10), new THREE.MeshPhysicalMaterial({ color: PAL.wax, roughness: 0.35, transmission: 0, clearcoat: 0.4, sheen: 0.3 }));
    wax.scale.set(1.0, 0.12, 0.8); wax.position.set(wu * CH.L, 0.0006, wv * CH.Wd); wax.receiveShadow = true; chartGrp.add(wax);
    const wax2 = wax.clone(); wax2.scale.set(0.45, 0.1, 0.35); wax2.position.x += 0.011; wax2.position.z -= 0.004; chartGrp.add(wax2);
    // the loose end of the scroll continues off the table forward (rolled), ink stone + brush beyond frame top
    const inkStone = box(0.07, 0.015, 0.11, new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.4 }), 0.27, 0.0075, -0.08); chartGrp.add(inkStone);
  }
  const chartRest = chartGeo.userData.rest;
  let chartKey = null;
  // (review) the gust is a real page curl: the free lower-right corner rolls up toward the lens around a fold line
  // across the corner (paper wrapped on a cylinder, then straight), so from straight above it visibly folds back,
  // shows its pale underside and throws a moving shadow; g 0…1 = gust envelope, Tq drives the flutter
  const setChartLift = (g, Tq) => {
    const key = g === 0 ? 'rest' : g.toFixed(5) + ':' + Tq.toFixed(4);
    if (key === chartKey) return; chartKey = key;
    const p = chartGeo.attributes.position;
    const dx = CH.L, dz = CH.Wd, dl = Math.SQRT1_2;                     // fold axis normal: 45° toward the corner (metric)
    const fold = 0.125 * Math.pow(g, 0.8);                               // fold line distance from the corner (integration: ~5 cm lift)
    const Rc = lerp(0.16, 0.03, g), thMax = 2.35 * g + 0.25 * g * g * Math.sin(Tq * 26.0);
    for (let i = 0; i < p.count; i++) {
      const x = chartRest[i * 3], z = chartRest[i * 3 + 2], u = x / CH.L, v = z / CH.Wd;
      // corner curl at rest (handled paper)
      const dc = Math.hypot((1 - u) * CH.L, (1 - v) * CH.Wd), wC = Math.max(0, 1 - dc / 0.16);
      const dU = Math.hypot((1 - u) * CH.L, v * CH.Wd), wU = Math.max(0, 1 - dU / 0.05);
      let X = x, Z = z, Y = 0.004 * wC * wC + 0.002 * wU * wU + 0.0006 * N1(u * 7, v * 5);
      if (g > 0) {
        const a = ((x - dx) + (z - dz)) * dl + fold;                    // > 0 on the corner side of the fold line
        if (a > 0) {
          const ripple = 0.004 * g * Math.sin(a * 90 - Tq * 24) * smoothstep(0, 0.06, a);
          const th = Math.min(a / Rc, thMax);
          let along = Rc * Math.sin(th), up = Rc * (1 - Math.cos(th));
          const rest = a - Rc * th;
          if (rest > 0) { along += rest * Math.cos(thMax); up += rest * Math.sin(thMax); }
          X += (along - a) * dl; Z += (along - a) * dl; Y += up + ripple;
        }
      }
      p.setXYZ(i, X, Y, Z);
    }
    p.needsUpdate = true; chartGeo.computeVertexNormals();
  };
  const N1 = (a, b) => Math.sin(a * 2.1 + b * 1.3) * Math.sin(b * 2.7 - a * 0.7);
  setChartLift(0, 0);

  // ---- props round the cabin: scroll rack, water jar, straw mat, rope coils, sea chest
  {
    const rack = new THREE.Group(); rack.position.set(CAB.x1 - 0.12, 1.15, 0.35); cabin.add(rack);
    rack.add(box(0.05, 0.4, 0.6, mBeam, 0, 0, 0));
    const scr = new THREE.MeshStandardMaterial({ color: 0xc8b48a, roughness: 0.85 });
    for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 16), scr); s.rotation.z = Math.PI / 2; s.position.set(-0.17, -0.12 + (k % 3) * 0.1, -0.24 + k * 0.08); s.castShadow = s.receiveShadow = true; rack.add(s); }
    const jarPts = [[0, 0], [0.09, 0], [0.12, 0.05], [0.15, 0.18], [0.13, 0.3], [0.07, 0.36], [0.075, 0.4], [0.06, 0.4]].map(([a, b]) => new THREE.Vector2(a, b));
    const jar = new THREE.Mesh(new THREE.LatheGeometry(jarPts, 40), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.3, envMapIntensity: 0.8 })); jar.position.set(CAB.x0 + 0.25, 0, 0.75); jar.castShadow = jar.receiveShadow = true; cabin.add(jar);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 24), TX.mat('rattan', { repeat: [2, 4], tex: { tone: 'dark' } })); mat.rotation.x = Math.PI / 2; mat.position.set(CAB.x0 + 0.2, 0.09, 0.0); mat.castShadow = mat.receiveShadow = true; cabin.add(mat);
    for (const [x, z, s] of [[0.85, 0.75, 1], [0.95, -0.6, 0.8]]) { for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.16 * s - k * 0.012, 0.014, 8, 40), mRope); t.rotation.x = Math.PI / 2; t.position.set(x, 0.015 + k * 0.026, z); t.castShadow = t.receiveShadow = true; cabin.add(t); } }
    const chest = box(0.42, 0.42, 0.7, TX.mat('camphor', { repeat: [0.8, 0.5], tex: { seed: 9 } }), -0.95, 0.21, 0.55); cabin.add(chest);
  }

  // shadow casters: structure only receives (the window light has its own blocker plane); props on the table cast
  for (const o of cabin.children) if (o.isMesh && o !== chartGrp) o.castShadow = false;
  cabin.traverse((o) => { if (o.isMesh && (o.parent === comp || o.parent === chartGrp || o.parent === needle)) o.castShadow = o !== salt && o !== needleShadow && o !== mica; });

  // ================================================================ lights
  // horn cabin lantern (PROP_SHIPLAMP small, 25 cm) on beam A: point light (unshadowed fill) + shadowed spot (down cone)
  const lamp = FX.lantern({ style: 'horn', size: 0.45, color: 0xE2A458, intensity: 0.22, seed: 4, period: 7, pendulum: 0 });
  lamp.object3D.position.copy(LAMP_HOOK); cabin.add(lamp.object3D);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6), mRope); cord.position.y = 0.03; lamp.object3D.add(cord);
  const flameLocal = lamp.light.position.clone();
  const LAMP_COL = lamp.light.color.clone();
  // (review) close-ups of skin are balanced for the practical (camera ≈ 2700 K): the lamp reads amber, skin stays brown
  const LAMP_SKIN = 0xffd7ad, LAMP_SKIN_PT = new THREE.Color(0xffdcb4);
  const LAMP_I = 0.75, LAMP_PT = 0.22;
  const lampSpot = new THREE.SpotLight(0xffc48a, LAMP_I, 0, 0.95, 1.0, 2);
  lampSpot.position.copy(flameLocal); lampSpot.target.position.copy(flameLocal).add(V(0, -1, 0));
  lampSpot.castShadow = true; lampSpot.shadow.mapSize.set(1024, 1024); lampSpot.shadow.camera.near = 0.04; lampSpot.shadow.camera.far = 2.4;
  lampSpot.shadow.bias = -0.0004; lampSpot.shadow.normalBias = 0.004; lampSpot.shadow.radius = 2;
  lamp.body.add(lampSpot, lampSpot.target);
  
  // stern window: dusk blue (P03) skylight through the vertical bars — shadowed far spot + visible bars + faint shaft
  const winCookie = TX.windowCookie({ pattern: 'bars', size: 512, cols: 3, bar: 0.035, frame: 0.05, blur: 1.5, glass: 0 });
  const winDir = V(0.04, -0.82, 0.57).normalize();
  const winC = V(WIN.cx, WIN.cy, CAB.z0 - 0.012);
  const WIN_I = 0.42;
  const winLight = FX.windowLight({ center: winC, right: [WIN.w / 2, 0, 0], up: [0, WIN.h / 2, 0], dir: winDir, cookie: winCookie.map, color: 0x2f62b4, intensity: WIN_I, mapSize: 1024, bounce: 0, frameColor: 0x22180f });
  cabin.add(winLight.object3D);
  const shaft = FX.windowShaft({ center: winC, right: [WIN.w / 2, 0, 0], up: [0, WIN.h / 2, 0], dir: winDir, length: 1.2, cookie: winCookie.map, color: 0x7d96c8, intensity: 0.05, floorY: TABLE.y, noise: 0.7, soft: 0.1, penumbra: 0.03 });
  cabin.add(shaft.object3D);
  // what you see through the window: dusk sky over a dark sea (cheap backdrop, no dome)
  const backdrop = (() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, PAL.P01); gr.addColorStop(0.42, PAL.P03); gr.addColorStop(0.555, '#5a6a88'); gr.addColorStop(0.575, '#8a7a72'); gr.addColorStop(0.585, '#23324d'); gr.addColorStop(1, '#0a1220');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), new THREE.MeshBasicMaterial({ map: t, color: col('#ffffff', 0.55) }));
    m.position.set(WIN.cx, 1.1, CAB.z0 - 1.6); m.castShadow = false; m.receiveShadow = false; cabin.add(m);
    return m;
  })();
  // sky through the open hatch: a narrow cool column (no shadow) + faint warm bounce off the chart
  const hatchSky = new THREE.SpotLight(0x5f7cb0, 0, 0, 0.085, 0.7, 2); hatchSky.position.set(0.1, DECK_Y + 7, -0.6); hatchSky.target.position.set(0.1, 0, -0.6); cabin.add(hatchSky, hatchSky.target);
  const hemi = new THREE.HemisphereLight(0x33405e, 0x2a1a10, 0.05); scene.add(hemi);
  const bounce = new THREE.PointLight(0xffa860, 0.05, 2.5, 2); bounce.position.set(0.1, 0.95, -0.55); cabin.add(bounce);
  const glint = FX.glow({ color: 0xffd6a0, size: 0.006, intensity: 1.4, falloff: 4.0, core: 1.2 }); glint.object3D.visible = false; cabin.add(glint.object3D);
  const dust = FX.dustMotes({ center: [WIN.cx, 1.0, -0.65], size: [0.7, 0.7, 0.7], count: 260, beam: { shaft }, intensity: 0.8, ambient: 0.02, moteSize: 0.0016 });
  cabin.add(dust.object3D);

  // ================================================================ exterior (S007): deck, hatch coaming, mast, battened sail, dusk dome
  const sky = createSky({ preset: 'dusk', sunAz: 170, sunElev: -4, moonAz: 230, moonElev: 14, cloudCover: 0.5, exposure: 1.7 });
  sky.object3D.visible = false; scene.add(sky.object3D);
  const sailParts = {};
  {
    // deck (top surface) with the hatch hole, coaming, lid propped open
    const dk = (w, d, x, z) => { const m = box(w, 0.02, d, mDeck, x, DECK_Y - 0.01, z, { cast: false }); ext.add(m); };
    dk(HATCH.x0 + 3, 6, (HATCH.x0 - 3) / 2, 1.5); dk(3 - HATCH.x1, 6, (HATCH.x1 + 3) / 2, 1.5);
    dk(HATCH.x1 - HATCH.x0, HATCH.z0 + 1.5, (HATCH.x0 + HATCH.x1) / 2, (HATCH.z0 - 1.5) / 2); dk(HATCH.x1 - HATCH.x0, 4.5 - HATCH.z1, (HATCH.x0 + HATCH.x1) / 2, (HATCH.z1 + 4.5) / 2);
    const ch = 0.12, ct2 = 0.05;
    for (const [w, d, x, z] of [[ct2, 0.8, HATCH.x0 - ct2 / 2, -0.6], [ct2, 0.8, HATCH.x1 + ct2 / 2, -0.6], [0.8, ct2, 0.1, HATCH.z0 - ct2 / 2], [0.8, ct2, 0.1, HATCH.z1 + ct2 / 2]]) ext.add(box(w, ch + DECK_T, d, mBeam, x, DECK_Y + ch / 2 - DECK_T / 2, z));
    // (review) the lid is hinged on the AFT coaming and stands open leaning aft, so the rise (looking forward-up) sees the
    // forward coaming edge against the sky and the sail straight away instead of the lid's black underside
    const lid = box(0.78, 0.04, 0.78, mDeck, 0.1, DECK_Y + 0.12 + 0.37, HATCH.z0 - 0.05 - 0.13); lid.rotation.x = 1.22; ext.add(lid);
    // bulwark aft and to the sides (seen as the camera clears the hatch)
    ext.add(box(6, 0.7, 0.08, mDeck, 0, DECK_Y + 0.35, -1.45));
    for (const x of [-2.6, 2.6]) ext.add(box(0.08, 0.7, 6, mDeck, x, DECK_Y + 0.35, 1.5));
    // mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 20, 24), TX.mat('wood_beam', { repeat: [1, 8] })); mast.position.set(-0.9, DECK_Y + 10, 3.4); mast.castShadow = false; ext.add(mast);
    sailParts.mast = mast;
    // battened lug sail: quad (foot 4.2 m above deck, head yard raked), 9 panels bellied forward between battens
    const sailW0 = 6.6, sailW1 = 5.4, sailH = 13, nB = 10, cols = 24, rowsPer = 6;
    const foot = { y: DECK_Y + 3.4, x0: -1.4, x1: -1.4 + sailW0, z: 3.0 }, head = { y: DECK_Y + 3.4 + sailH, x0: -2.2, x1: -2.2 + sailW1, z: 2.3 };
    const rows = nB * rowsPer;
    const sp = [], suv = [], sidx = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, pan = (j % rowsPer) / rowsPer, belly = Math.sin(pan * Math.PI) * 0.36;
      for (let i = 0; i <= cols; i++) {
        const s = i / cols;
        const x = lerp(lerp(foot.x0, foot.x1, s), lerp(head.x0, head.x1, s), t);
        const y = lerp(foot.y, head.y, t) + 0.5 * Math.sin(s * Math.PI) * 0;
        const z = lerp(foot.z, head.z, t) + belly * Math.sin(s * Math.PI) * (0.6 + 0.4 * t) + 0.5 * Math.sin(s * Math.PI) * 0.6;
        sp.push(x, y, z); suv.push(s * 7, j / rowsPer);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c2 = a + cols + 1, d2 = c2 + 1; sidx.push(a, c2, b, b, c2, d2); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(suv, 2)); sg.setIndex(sidx); sg.computeVertexNormals();
    // (review) the sail is not a flat card: the head still catches the last warm afterglow, the foot sinks into the cool
    // dusk, and each panel darkens toward its batten (shadowed by the bamboo, cloth pulled taut there)
    { const cA = []; for (let j = 0; j <= rows; j++) { const t = j / rows, pan = (j % rowsPer) / rowsPer, edge = 0.82 + 0.18 * Math.sin(pan * Math.PI);
        for (let i = 0; i <= cols; i++) { const sI = i / cols, k = lerp(0.7, 1.12, smoothstep(0.0, 1.0, t)) * edge * (0.94 + 0.06 * Math.sin(sI * Math.PI));
          cA.push(k * lerp(0.92, 1.08, t), k, k * lerp(1.08, 0.9, t)); } }
      sg.setAttribute('color', new THREE.Float32BufferAttribute(cA, 3)); }
    const cot = TX.cotton({ tone: [152, 108, 64], threads: 48, creases: 0.8, slub: 0.9, fade: 0.6, seed: 17 });
    const scv = document.createElement('canvas'); scv.width = scv.height = 512; const sgc = scv.getContext('2d');
    sgc.drawImage(cot.map.image, 0, 0, 512, 512);
    const vg = sgc.createLinearGradient(0, 0, 0, 512); vg.addColorStop(0, 'rgba(20,10,4,0.75)'); vg.addColorStop(0.07, 'rgba(20,10,4,0.25)'); vg.addColorStop(0.5, 'rgba(255,220,180,0.10)'); vg.addColorStop(0.93, 'rgba(20,10,4,0.25)'); vg.addColorStop(1, 'rgba(20,10,4,0.75)');
    sgc.fillStyle = vg; sgc.fillRect(0, 0, 512, 512);
    sgc.fillStyle = 'rgba(40,22,12,0.35)'; for (const xq of [170, 341]) sgc.fillRect(xq - 2, 0, 4, 512);
    const sr2 = rng(91); for (let q = 0; q < 6; q++) { sgc.fillStyle = `rgba(${90 + sr2() * 40},${60 + sr2() * 20},${40},0.35)`; sgc.fillRect(sr2() * 460, sr2() * 400 + 40, 30 + sr2() * 40, 25 + sr2() * 50); }
    const sTex = new THREE.CanvasTexture(scv); sTex.colorSpace = THREE.SRGBColorSpace; sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping; sTex.anisotropy = 8;
    const sailMat = new THREE.MeshStandardMaterial({ map: sTex, normalMap: cot.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.95, side: THREE.DoubleSide, emissive: col('#c8914e', 1), emissiveMap: sTex, emissiveIntensity: 0.24, vertexColors: true });
    const sail = new THREE.Mesh(sg, sailMat); ext.add(sail); sailParts.sail = sail; sailParts.mat = sailMat;
    // battens (bamboo) + sheets fanning down to a block aft of the hatch
    const batM = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.55, emissive: col('#4E3624', 1), emissiveIntensity: 0.15 });
    const sheetPts = [];
    for (let b = 0; b <= nB; b++) {
      const t = b / nB;
      const a = V(lerp(foot.x0, head.x0, t) - 0.2, lerp(foot.y, head.y, t), lerp(foot.z, head.z, t) + 0.05), e = V(lerp(foot.x1, head.x1, t) + 0.25, lerp(foot.y, head.y, t), lerp(foot.z, head.z, t) + 0.05);
      const len = a.distanceTo(e), bt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), batM);
      bt.position.copy(a).lerp(e, 0.5); bt.quaternion.setFromUnitVectors(V(0, 1, 0), e.clone().sub(a).normalize()); ext.add(bt);
      if (b % 2 === 0 && b < nB) sheetPts.push(e.clone().add(V(-0.1, 0, -0.03)));
    }
    const block = V(1.9, DECK_Y + 0.9, -1.2);
    for (const p of sheetPts) { const len = p.distanceTo(block), ln = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 5), mRope); ln.position.copy(p).lerp(block, 0.5); ln.quaternion.setFromUnitVectors(V(0, 1, 0), block.clone().sub(p).normalize()); ext.add(ln); }
    // halyard + shrouds
    const hal = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 22, 5), mRope); hal.position.set(-0.75, DECK_Y + 11, 3.2); hal.rotation.x = 0.04; ext.add(hal);
    // exterior light: cool sky hemisphere + last warm afterglow from forward-low (backlight through the mat sail)
    const extHemi = new THREE.HemisphereLight(0x5c6c92, 0x1a1612, 0.0); ext.add(extHemi); sailParts.hemi = extHemi;
    const glowL = new THREE.DirectionalLight(0xd59a6a, 0.0); glowL.position.set(1.5, 4, 30); glowL.target.position.set(0, 8, 0); ext.add(glowL, glowL.target); sailParts.glow = glowL;
  }
  ext.visible = false;

  // ================================================================ characters
  const nav = await loadCharacter('NAVIGATOR', { lod: 'hi' });
  nav.root.visible = false; scene.add(nav.root);
  if (DBG) dbg('layers', Object.keys(nav.layers).join(','));
  if (DBG) for (const [k, m] of Object.entries(nav.materials)) dbg('mat', k, m && m.type, m && m.color && m.color.getHexString(), m && m.map ? 'map' : '', m && m.userData && m.userData.fzUniforms ? Object.keys(m.userData.fzUniforms).join('|').slice(0, 200) : '');
  const navMid = await loadCharacter('NAVIGATOR', { lod: 'mid' });
  navMid.root.visible = false; scene.add(navMid.root);
  // (integration) wrapped head-cloth over the topknot, short beard, weathered skin (see dressNavigator)
  if (!OFF.has('dress')) { dressNavigator(nav, { ear: 0.8 }); dressNavigator(navMid, { ear: 0.8 }); }
  const thumbHand = await loadCharacterHand('NAVIGATOR', 'R', { lod: 'close' });
  thumbHand.root.visible = false; scene.add(thumbHand.root);
  const cuffR = await loadCharacterHand('NAVIGATOR', 'R', { lod: 'close', cuffTurned: true });
  const cuffL = await loadCharacterHand('NAVIGATOR', 'L', { lod: OFF.has('macroL') ? 'macro' : 'close' });
  cuffR.root.visible = cuffL.root.visible = false; scene.add(cuffR.root, cuffL.root);
  const Q_DET = new URLSearchParams(location.search).get('det');
  // sleeves continuing the cuff stubs up the forearms (S011 / S006): tapered tubes in the cuff's own cloth
  const mSleeve = TX.mat('indigo', { repeat: [6, 3.5], tex: { salt: 0.15, seed: 12 }, side: THREE.DoubleSide, color: 0xc8d0e0 });
  // (review) the sleeve is a soft cloth tube, not a stovepipe: folds ringing the forearm, a little sag, taper to the cuff
  const sleeveFor = (h, len = 0.24, r0 = 0.05, r1 = 0.062, y0 = 0.11, seed = 1) => {
    const g = new THREE.CylinderGeometry(r1, r0, len, 48, 24, true); g.translate(0, len / 2 + y0, 0);
    const p = g.attributes.position, sr = rng(seed * 31 + 7), ph = [sr() * 6.3, sr() * 6.3, sr() * 6.3];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y - y0) / len;
      const k = 1 + 0.045 * Math.sin(a * 3 + y * 42 + ph[0]) * smoothstep(0.0, 0.25, t) + 0.03 * Math.sin(a * 5 - y * 77 + ph[1]) + 0.02 * Math.sin(y * 130 + a * 2 + ph[2]);
      p.setXYZ(i, x * k, y, z * k - 0.006 * smoothstep(0.1, 1, t) * (0.5 + 0.5 * Math.cos(a - Math.PI / 2)));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mSleeve); m.castShadow = m.receiveShadow = true; m.scale.set(0.86, 1, 1); h.byName.forearm.add(m); return m;
  };
  sleeveFor(cuffR, 0.26, 0.051, 0.058, 0.11, 1); sleeveFor(cuffL, 0.26, 0.05, 0.057, 0.11, 2); sleeveFor(thumbHand, 0.2, 0.05, 0.056, 0.11, 3);
  // (integration) the right cuff is the module's turned-back flap with the patch on its inner face (S011)
  const flapR = buildCuffFlap(cuffR, { seed: 808 }); flapR.hideLib(true);
  // (review) close-up hands: the salt crust reads as fine crystals in the creases, not white blotches; short work-darkened
  // nails (no manicure-white plates)
  for (const h of [cuffR, cuffL, thumbHand]) {
    const mat = h.skinMat, U = mat && mat.userData.fzUniforms;
    if (!U) continue;
    if (U.uSalt) U.uSalt.value = 0.45;
    // (integration) weathered brown, less saturated; nails close to the skin (the dark nail edges read as insects in S011)
    mat.color.set(0x8f6346); if ('sheen' in mat) mat.sheen = Math.min(mat.sheen ?? 0, 0.12);
    if (U.uNail) U.uNail.value.set(0x9a7056).lerp(new THREE.Color(0x8a7462), 0.3);
    if (U.uDetail) U.uDetail.value = +(Q_DET || 0.35);
    if (OFF.has('ds')) mat.side = THREE.DoubleSide;
    if (!OFF.has('nailsm')) smoothNailFolds(h);
    if (OFF.has('flatL') && h === cuffL) { h.meshes.skin.material = new THREE.MeshNormalMaterial(); }   // knuckle creases / cracks as faint hairlines, not black squiggles
    // the library whitens the nail's free edge and lunula (a clean hand); a seaman's nail edge is the nail's own dull colour
    const ob = mat.onBeforeCompile;
    if (ob && !OFF.has('nail')) {
      mat.onBeforeCompile = (sh, r) => { ob(sh, r); sh.fragmentShader = sh.fragmentShader
        .replace('mix(uNail, vec3(0.97, 0.92, 0.88), 0.55)', 'mix(uNail, vec3(0.97, 0.92, 0.88), 0.15)')
        .replace('vec3(0.94, 0.9, 0.86), smoothstep(0.8, 0.93, nt)', 'uNail * vec3(1.06, 1.03, 1.0), smoothstep(0.8, 0.93, nt)'); };
      mat.customProgramCacheKey = () => 'skin2_cabin_nail'; mat.needsUpdate = true;
    }
  }
  // a few loose strands of hair escaping under the head-cloth hem at his LEFT temple (S010: backlit against the stern window,
  // moving in the draught through the bars) — parented to the head bone, rooted on the hem of the wrapped cloth
  const strands = new THREE.Group(); nav.bone('head').add(strands);
  {
    const hm = new THREE.MeshStandardMaterial({ color: 0x17110c, roughness: 0.92 });
    const sr = rng(77), nd = nav.userData && nav.userData.navDress, hu = nav.P.hu;
    for (let k = 0; k < 9; k++) {
      const phi = 0.36 + 0.34 * (k / 8) + (sr() - 0.5) * 0.05;          // front temple: they hang against the window
      const el = nd ? nd.hemAt(phi) - 0.015 : -0.05, d = V(Math.sin(phi) * Math.cos(el), Math.sin(el), Math.cos(phi) * Math.cos(el));
      const r0 = nd ? nd.Rat(phi, el) + 0.0012 : 0.1, c0 = nd ? nd.c0 : V(0, 0.4 * hu, -0.05 * hu);
      const a = c0.clone().addScaledVector(d, r0), out = V(d.x, 0, d.z).normalize(), len = 0.016 + 0.02 * sr();
      const pts = []; for (let j = 0; j < 5; j++) { const t = j / 4; pts.push(a.clone().addScaledVector(out, 0.004 * Math.sin(t * 2.4) + 0.002 * t).add(V(0, -len * t, 0.006 * t * t * (sr() - 0.3)))); }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.00042 * (0.8 + 0.4 * sr()), 4, false);
      tg.translate(-a.x, -a.y, -a.z); const m = new THREE.Mesh(tg, hm); m.position.copy(a); m.userData.k = k; strands.add(m);
    }
  }
  strands.visible = false;

  // (integration) the LEFT eye's surface point (most forward head-mesh point over the left eye centre, head-bone space): the
  // S010 catch-light sits on it (a faceless head has no cornea, so the lamp's reflection point stands in for the eye)
  const eyeSurf = (() => { const m = nav.layers.head, hu = nav.P.hu, inv = nav.skeleton.boneInverses[nav.bi.head], pa = m.geometry.attributes.position, v = new THREE.Vector3(); let best = null;
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(inv); if (v.x < 0.115 * hu || v.x > 0.165 * hu || Math.abs(v.y - 0.33 * hu) > 0.025 * hu) continue; if (!best || v.z > best.z) best = v.clone(); }
    return best ? best.add(V(0, 0, 0.0012)) : V(0.14 * hu, 0.33 * hu, 0.39 * hu); })();
  const eyeSW = () => { const b = nav.bone('head'); b.updateWorldMatrix(true, false); return eyeSurf.clone().applyMatrix4(b.matrixWorld); };
  // a catch-light that is not hidden by the cheek in a three-quarter-back view (no depth test; tiny)
  const catchL = FX.glow({ color: 0xcfe0ff, size: 0.0042, intensity: 0, falloff: 3.2, core: 1.4 }); catchL.material.depthTest = false; catchL.object3D.renderOrder = 30; catchL.object3D.visible = false; scene.add(catchL.object3D);
  // S010 cheat (ruling 2): the barred stern window as a soft plate behind his profile (the real 55 × 40 cm opening cannot sit
  // behind a 100 mm three-quarter face). Dusk sky over the sea horizon between dark vertical bars, frame and sill; HDR, unlit.
  const winPlate = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 384);
    gr.addColorStop(0, '#16284a'); gr.addColorStop(0.45, '#35588a'); gr.addColorStop(0.6, '#6f86ac'); gr.addColorStop(0.645, '#a08a86'); gr.addColorStop(0.66, '#2b3c5c'); gr.addColorStop(1, '#0d1626');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#0a0705';
    g.fillRect(0, 0, 512, 30); g.fillRect(0, 346, 512, 38); g.fillRect(0, 0, 26, 384); g.fillRect(486, 0, 26, 384);   // frame + sill
    for (const x of [150, 262, 374]) g.fillRect(x - 9, 0, 18, 384);                                                       // vertical bars
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.75), new THREE.MeshBasicMaterial({ map: t, color: col('#ffffff', 1.0), fog: false }));
    m.visible = false; scene.add(m); return m;
  })();
  // aim the camera from pos so that world point P lands at screen (sx, sy) (0..1 from top-left), horizon level
  const aimAt = (pos, P, sx, sy, roll0 = 0) => { camera.position.copy(pos); camera.rotation.order = 'YXZ'; const d = P.clone().sub(pos).normalize();
    let yaw = Math.atan2(-d.x, -d.z), pt = Math.asin(clamp(d.y, -1, 1)); camera.updateProjectionMatrix(); const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tx = ty * camera.aspect;
    for (let i = 0; i < 5; i++) { camera.rotation.set(pt, yaw, roll0); camera.updateMatrixWorld(true); const q = P.clone().project(camera); yaw += Math.atan((2 * sx - 1 - q.x) * tx); pt -= Math.atan((1 - 2 * sy - q.y) * ty); }
    camera.rotation.set(pt, yaw, roll0); camera.updateMatrixWorld(true); };

  // ================================================================ per-frame common animation
  const THUMB_CH = (new URLSearchParams(location.search).get('thch') || '0.1,-0.75,0.05,0.12,0.3').split(',').map(Number);
  // (review) a horn lantern's candle breathes, it does not strobe: half the library flicker depth (frame-to-frame swings
  // of ±5 % read as flicker on the macro inserts)
  const flk = (T) => 0.954 + 0.5 * (flicker(T, 4) - 0.92);
  const S006_MC = +(new URLSearchParams(location.search).get('mc') || 1);
  const Q5 = Object.fromEntries((new URLSearchParams(location.search).get('s5') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  const Q6 = Object.fromEntries((new URLSearchParams(location.search).get('s6') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  const Q7 = Object.fromEntries((new URLSearchParams(location.search).get('s7') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  const Q11 = Object.fromEntries((new URLSearchParams(location.search).get('s11') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  const Q10 = Object.fromEntries((new URLSearchParams(location.search).get('s10') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));   // dev: ?s10=th:132,d:1.0,…
  const SHOT_T0 = {}; for (const id of ['S005', 'S006', 'S007', 'S009', 'S010', 'S011']) { const s = ctx.shotById(id); if (s) SHOT_T0[id] = s.in_frame / 24; }
  // lamp swing (pendulum relative to the rolling cabin): [rotZ, rotX] radians, ≈7 s
  const lampSwing = (T) => [-roll(T) * 2.4 + 0.11 * Math.sin(T * 2 * Math.PI / 7.0 + 0.4), -pitch(T) * 2.0 + 0.04 * Math.sin(T * 2 * Math.PI / 5.3 + 1.0)];
  const lampGlows = []; lamp.body.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uFall) lampGlows.push(o); });
  const glowBase = lampGlows.map((o) => o.scale.x);
  const setLampGlow = (k) => lampGlows.forEach((o, i) => o.scale.setScalar(glowBase[i] * k));
  // cheap cool window fill (no shadow) where the shadowed window light does not reach the subject
  const winFill = new THREE.SpotLight(0x7a96d0, 0, 0, 0.55, 0.9, 2); winFill.position.set(WIN.cx, WIN.cy + 0.02, CAB.z0 - 0.1); cabin.add(winFill, winFill.target);
  // the navigator's sea chest (he sits on it at the table's forward end in S010 / S011)
  const chest2 = box(0.5, 0.43, 0.36, TX.mat('camphor', { repeat: [0.7, 0.5], tex: { seed: 15 } }), 0.02, 0.215, 0.44, { cast: false }); cabin.add(chest2);

  function resetCommon(T) {
    cabin.visible = true; ext.visible = false; sky.object3D.visible = false; backdrop.visible = true;
    nav.root.visible = navMid.root.visible = thumbHand.root.visible = cuffR.root.visible = cuffL.root.visible = false; strands.visible = false;
    for (const f of [nav, navMid]) for (const h of Object.values(f.hands)) h.root.visible = true;
    lamp.object3D.position.copy(LAMP_HOOK); lamp.object3D.visible = true; setLampGlow(1); lampSpot.castShadow = true;
    lamp.update(T, { swing: lampSwing(T) });
    lampSpot.intensity = LAMP_I * flk(T); lamp.light.intensity = LAMP_PT * flk(T);
    winLight.object3D.visible = true; winLight.update(T, { intensity: WIN_I });
    winFill.intensity = 0; winFill.angle = 0.55; winFill.color.setHex(0x7a96d0); winFill.position.set(WIN.cx, WIN.cy + 0.02, CAB.z0 - 0.1); winFill.target.position.set(WIN.cx, TABLE.y, -0.5);
    hatchSky.visible = false; hatchSky.intensity = 0; hatchSky.color.setHex(0x5f7cb0); hatchSky.angle = 0.085; hatchSky.penumbra = 0.7; hatchSky.position.set(0.1, DECK_Y + 7, -0.6); hatchSky.target.position.set(0.1, 0, -0.6); bounce.color.setHex(0xffa860); shaft.object3D.visible = false; dust.object3D.visible = false;
    hemi.intensity = 0.05; hemi.color.setHex(0x33405e); bounce.position.set(0.1, 0.95, -0.55); bounce.intensity = 0.05 * flk(T);
    scene.environment = envCabin; scene.environmentIntensity = 0.55;
    needle.rotation.y = 0; needleShadow.rotation.z = 0; saltMask.offset.x = 0.53; salt.visible = true; glint.object3D.visible = false; catchL.object3D.visible = false; winPlate.visible = false;
    backdrop.material.color.copy(col('#ffffff', 0.55)); cabin.visible = true; chartBand.uBand.value = 0; scene.background.setHex(0x020304);
    setChartLift(0, 0);
    bounce.visible = false;
    for (const o of chartRoll) o.visible = true;
    lampSpot.color.setHex(0xffc48a); lamp.light.color.copy(LAMP_COL); lampSpot.angle = 0.95; lampSpot.penumbra = 1.0;
    lampSpot.target.position.copy(flameLocal).add(V(0, -1, 0));
  }
  // standing navigator stooped under the low beam over the table (root on the floor, facing aft −z)
  const NAV_ROOT = V(0.0, 0, 0.2);
  function poseStoop(fig, T, { lift = 0, dz = 0, yaw = 0 } = {}) {
    fig.root.position.copy(NAV_ROOT).add(V(0, 0, dz)); fig.root.rotation.set(0, Math.PI + yaw, 0);
    fig.pose({ 'hips.py': -0.04, 'legL.upper.x': 0.18, 'legR.upper.x': 0.18, 'legL.lower.x': 0.34, 'legR.lower.x': 0.34, 'legL.foot.x': -0.16, 'legR.foot.x': -0.16,
      'legL.upper.z': 0.04, 'legR.upper.z': 0.04, 'hips.x': 0.1, 'spine.x': lerp(0.18, 0.1, lift), 'chest.x': lerp(0.26, 0.14, lift), 'neck.x': lerp(0.12, 0.02, lift), 'head.x': lerp(0.14, -0.05, lift),
      handL: ['flat', {}], handR: ['flat', {}] });
    fig.reach('L', V(-0.17, TABLE.y + 0.035, TABLE.z1 - 0.08), { palm: V(0, -1, 0), fingers: V(0.15, -0.25, -1).normalize() });
    fig.reach('R', V(0.2, TABLE.y + 0.035, TABLE.z1 - 0.07), { palm: V(0, -1, 0), fingers: V(-0.1, -0.25, -1).normalize() });
    fig.breathe(T, 0.8);
    return fig;
  }
  // seated on the sea chest at the table's forward end, facing aft toward the stern window
  const SEAT = V(0.02, 0, 0.32);
  function poseSeated(fig, T, { lean = 0.22 } = {}) {
    fig.root.position.copy(SEAT); fig.root.rotation.set(0, Math.PI, 0);
    fig.pose('sit_bench', { seat: 0.43, lean, hands: 'knees' });
    return fig;
  }
  // patch centre on the turned-back right cuff (from the cuff geometry's patch mask), world space
  const patchIdx = []; {
    // (review) the patch mask covers both walls of the rolled band and the tube under it; keep only the OUTER (visible)
    // cloth around the patch's centroid (in angle / along-arm), so contact lands on the visible patch centre
    const g = cuffR.meshes.cuffs[0].geometry, aux = g.attributes.aux, P = g.attributes.position;
    const all = []; for (let i = 0; i < aux.count; i++) if (aux.getY(i) > 0.6) all.push(i);
    const ang = (i) => Math.atan2(P.getZ(i), P.getX(i) / 0.86), rad = (i) => Math.hypot(P.getX(i) / 0.86, P.getZ(i));
    let sx = 0, sz = 0, sy = 0; for (const i of all) { const a = ang(i); sx += Math.cos(a); sz += Math.sin(a); sy += P.getY(i); }
    const a0 = Math.atan2(sz, sx), y0 = sy / Math.max(1, all.length);
    const near = all.filter((i) => Math.abs(Math.atan2(Math.sin(ang(i) - a0), Math.cos(ang(i) - a0))) < 0.14 && Math.abs(P.getY(i) - y0) < 0.005);
    const rMax = Math.max(...near.map(rad));
    for (const i of near) if (rad(i) > rMax - 0.0009) patchIdx.push(i);
    if (!patchIdx.length) patchIdx.push(...all);
  }
  // (review) PROP_PATCH hero decal on the turned cuff (S011): the library draws a flat pale square; the shot needs the
  // hand-woven plain weave #7D9CBB, off-white 3 mm running stitches, one uneven corner with a double knot and a centre
  // rubbed soft and shiny (bible §6.4). Same place and size as the library patch (continuity with S035/S045/S067):
  // a skinned copy of the cuff's outward-facing cloth in the patch window, 0.4 mm proud of it.
  {
    const src = cuffR.meshes.cuffs[0], g = src.geometry, P = g.attributes.position, Nn = g.attributes.normal, aux = g.attributes.aux;
    const idx = g.index ? g.index.array : null;
    const pa = [], pyv = []; for (let i = 0; i < aux.count; i++) if (aux.getY(i) > 0.5) { pa.push(Math.atan2(P.getZ(i), P.getX(i) / 0.86)); pyv.push(P.getY(i)); }
    let sx = 0, sz = 0; for (const a of pa) { sx += Math.cos(a); sz += Math.sin(a); }
    const a0 = Math.atan2(sz, sx), ya = Math.min(...pyv), yb = Math.max(...pyv), Rr = 0.058, halfW = Math.max(...pa.map((a) => Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))))) * Rr;
    const da = (i) => Math.atan2(Math.sin(Math.atan2(P.getZ(i), P.getX(i) / 0.86) - a0), Math.cos(Math.atan2(P.getZ(i), P.getX(i) / 0.86) - a0));
    const ok = (i) => { const x = P.getX(i) / 0.86, z = P.getZ(i), l = Math.hypot(x, z); const out = (Nn.getX(i) * x + Nn.getZ(i) * z) / l > 0.3;
      return out && Math.abs(da(i)) * Rr < halfW + 0.003 && P.getY(i) > ya - 0.003 && P.getY(i) < yb + 0.003; };
    const map = new Map(), pos = [], nrm = [], uvs = [], si = [], sw = [], tri = [];
    const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const vid = (i) => { if (map.has(i)) return map.get(i); const k = map.size; map.set(i, k);
      pos.push(P.getX(i) + Nn.getX(i) * 0.0004, P.getY(i) + Nn.getY(i) * 0.0004, P.getZ(i) + Nn.getZ(i) * 0.0004); nrm.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i));
      uvs.push(0.5 + da(i) * Rr / (2 * halfW + 0.006) * (src.parent && cuffR.mir < 0 ? -1 : 1), (P.getY(i) - (ya - 0.003)) / (yb - ya + 0.006));
      for (let c = 0; c < 4; c++) { si.push(SI ? SI.getComponent(i, c) : 0); sw.push(SW ? SW.getComponent(i, c) : c === 0 ? 1 : 0); }
      return k; };
    const nTri = idx ? idx.length / 3 : P.count / 3;
    for (let t = 0; t < nTri; t++) { const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2; if (ok(a) && ok(b) && ok(c)) tri.push(vid(a), vid(b), vid(c)); }
    if (tri.length) {
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      dg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); dg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      dg.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); dg.setIndex(tri);
      // texture: 256 px over (2·halfW + 6 mm) × (yb − ya + 6 mm); patch inset 3 mm on every side
      const c = document.createElement('canvas'); c.width = c.height = 256; const q = c.getContext('2d'); const r = rng(808);
      const Wm = 2 * halfW + 0.006, Hm = yb - ya + 0.006, mx = 0.003 / Wm * 256, my = 0.003 / Hm * 256, pw = 256 - 2 * mx, ph = 256 - 2 * my;
      q.clearRect(0, 0, 256, 256);
      q.save(); q.beginPath();                                                   // frayed, hand-cut outline
      for (let k = 0; k <= 64; k++) { const t = k / 64; let x, y; if (t < 0.25) { x = mx + pw * t * 4; y = my; } else if (t < 0.5) { x = mx + pw; y = my + ph * (t - 0.25) * 4; } else if (t < 0.75) { x = mx + pw * (1 - (t - 0.5) * 4); y = my + ph; } else { x = mx; y = my + ph * (1 - (t - 0.75) * 4); }
        x += (r() - 0.5) * 2.2; y += (r() - 0.5) * 2.2; k ? q.lineTo(x, y) : q.moveTo(x, y); }
      q.closePath(); q.clip();
      q.fillStyle = '#7D9CBB'; q.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 3) { q.fillStyle = `rgba(40,60,90,${0.10 + r() * 0.08})`; q.fillRect(0, y, 256, 1); }   // plain weave
      for (let x = 0; x < 256; x += 3) { q.fillStyle = `rgba(230,238,245,${0.05 + r() * 0.06})`; q.fillRect(x, 0, 1, 256); }
      for (let k = 0; k < 40; k++) { q.fillStyle = `rgba(${r() < 0.5 ? '60,80,110' : '170,190,210'},0.08)`; q.fillRect(r() * 256, 0, 1 + r() * 2, 256); }   // slubs
      const rg = q.createRadialGradient(128, 136, 8, 128, 136, 92); rg.addColorStop(0, 'rgba(205,218,228,0.55)'); rg.addColorStop(0.6, 'rgba(190,205,220,0.18)'); rg.addColorStop(1, 'rgba(190,205,220,0)');
      q.fillStyle = rg; q.fillRect(0, 0, 256, 256);                               // centre rubbed soft and pale
      q.strokeStyle = 'rgba(40,52,70,0.55)'; q.lineWidth = 3; q.strokeRect(mx + 1, my + 1, pw - 2, ph - 2);  // turned-under edge
      q.restore();
      // running stitches, ~3 mm, 2.5 mm in from the edge; the upper-right corner uneven, with a double knot
      const st = 0.0025 / Wm * 256, sl = 0.003 / Wm * 256;
      q.strokeStyle = '#E9E4D6'; q.lineCap = 'round'; q.lineWidth = 2.2;
      // hand stitching: every stitch a little different in length, spacing and angle; the last few before the knot uneven
      const run = (x0, y0, x1, y1, uneven) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / (sl * 1.8)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        for (let k = 0; k < n; k++) { const bad = uneven && k > n - 4, t0 = (k + 0.1 + (r() - 0.5) * 0.25) / n, t1 = t0 + (sl / L) * (bad ? 0.5 + r() * 1.1 : 0.8 + r() * 0.4);
          const j0 = (r() - 0.5) * (bad ? 5 : 1.6), j1 = (r() - 0.5) * (bad ? 5 : 1.6);
          q.beginPath(); q.moveTo(x0 + (x1 - x0) * t0 + nx * j0, y0 + (y1 - y0) * t0 + ny * j0); q.lineTo(x0 + (x1 - x0) * Math.min(t1, 1) + nx * j1, y0 + (y1 - y0) * Math.min(t1, 1) + ny * j1); q.stroke(); } };
      const X0 = mx + st, X1 = 256 - mx - st, Y0 = my + st, Y1 = 256 - my - st;
      run(X0, Y0, X1, Y0, true); run(X1, Y1, X1, Y0, true); run(X1, Y1, X0, Y1, false); run(X0, Y1, X0, Y0, false);
      q.fillStyle = '#EDE8DA'; q.strokeStyle = 'rgba(120,110,95,0.6)'; q.lineWidth = 0.8;
      for (const [dx, dy, rr] of [[-5, 6, 4.0], [-1, 2, 3.4]]) { q.beginPath(); q.arc(X1 + dx, Y0 + dy, rr, 0, Math.PI * 2); q.fill(); q.stroke(); }
      q.strokeStyle = '#E9E4D6'; q.lineWidth = 2.2;
      q.strokeStyle = 'rgba(233,228,214,0.9)'; q.lineWidth = 1.4; q.beginPath(); q.moveTo(X1 - 3, Y0 + 6); q.quadraticCurveTo(X1 + 6, Y0 + 12, X1 + 4, Y0 + 20); q.stroke();  // thread tail
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const dm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.82, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const decal = new THREE.SkinnedMesh(dg, dm); decal.name = 'patch_decal'; decal.castShadow = false; decal.receiveShadow = true;
      decal.bind(src.skeleton, src.bindMatrix.clone()); decal.boundingSphere = src.boundingSphere ? src.boundingSphere.clone() : null; decal.frustumCulled = false;
      src.parent.add(decal);
      // the library's own flat patch under the decal: paint it over in the cuff cloth so no stitch peeks at the edges
      const CU = cuffR.cuffMats[0] && cuffR.cuffMats[0].userData.fzUniforms;
      if (CU && CU.uPatchColor) { CU.uPatchColor.value.copy(cuffR.cuffMats[0].color); if (CU.uStitchColor) CU.uStitchColor.value.copy(cuffR.cuffMats[0].color); }
      dbg('patch decal tris', tri.length / 3, 'halfW', halfW.toFixed(4), 'ya', ya.toFixed(4), 'yb', yb.toFixed(4));
    }
  }
  const _pv = new THREE.Vector3();
  const patchWorld = () => {
    const m = cuffR.meshes.cuffs[0]; m.updateMatrixWorld(true); m.skeleton.update();
    const c = new THREE.Vector3();
    for (const i of patchIdx) { m.getVertexPosition(i, _pv); c.add(_pv.applyMatrix4(m.matrixWorld)); }
    return c.multiplyScalar(1 / patchIdx.length);
  };

  // ================================================================ shots
  const setups = {
    // ---------------------------------------------------------- S005 — match cut from S004: same chart registration, 90° top-down, 48 fps
    S005(tl, u, T) {
      const Tq = SHOT_T0.S005 + tl * 0.5; // 50 % slow motion: everything that moves runs at half speed
      lamp.update(Tq, { swing: lampSwing(Tq) });
      // (review) the lamp pool is kept to the left two-thirds so the window stripe on the right reads as dusk blue (P03)
      // rather than lavender (warm spill + blue on cream paper)
      lampSpot.angle = 0.66; lampSpot.intensity = LAMP_I * 1.1 * flk(Tq); lamp.light.intensity = LAMP_PT * 0.6 * flk(Tq);
      // (integration) the barred stern window as one soft vertical dusk-blue band at frame right (the four bar stripes of the
      // window spot read as blinds and pre-empted S021's louvres)
      winLight.object3D.visible = false; chartBand.uBand.value = +(Q5.bd || 0.55);
      // gust from the stern window (frame right) at tl 1.10: free lower-right corner lifts ~6 cm, flutters, settles by 2.6 s
      const g = tl < 1.1 ? 0 : tl < 1.62 ? ease.outCubic((tl - 1.1) / 0.52) : tl < 2.6 ? 1 - ease.inOutSine((tl - 1.62) / 0.98) : 0;
      setChartLift(g, Tq);
      // camera: frame centre over the registered chart; up = frame-up (world −x); sway ≤ 1 % of frame
      const cx = CH.x0 + (1 - (0.88 - 0.5) * FRAME_H / CH.Wd) * CH.Wd, cz = CH.z0 - 0.5 * CH.L;
      const dist = FRAME_W * 50 / 36;
      const sw = 0.0022 * Math.sin(Tq * 2 * Math.PI / 7), sw2 = 0.0012 * Math.sin(Tq * 2 * Math.PI / 4.3 + 1);
      cam.lens(camera, 50);
      placeUp(camera, V(cx + sw2, CH.y + dist, cz + sw), V(cx + sw2, CH.y, cz + sw), V(-1, 0, 0.0));
      camera.rotateZ(roll(Tq) * 0.04);
      return { dof: null, exposure: 1.0 };   // (review) shot list: 全幅清晰 — the whole sheet sharp (and one pass cheaper)
    },
    // ---------------------------------------------------------- S006 — macro on the star ring: lamp glint travels E→S; right thumb wipes the salt
    S006(tl, u, T) {
      winLight.object3D.visible = false; winFill.intensity = 0.0;
      // camera: grazing from the SE side of the dial (aft-port of the box), looking NW, close on the near arc
      // (integration) camera 1.45× further back: the thumb that wipes the rim is a part of the frame, not a blob over half of it
      const kD = +(Q6.kd || 1.45), tgt = comp.localToWorld(V(-0.004 + 0.01 * (kD - 1), DIAL_Y, 0.043 + 0.012 * (kD - 1)));   // south rim lower-left, star ring across the middle
      const C = tgt.clone().add(comp.localToWorld(V(0.16, DIAL_Y + 0.165, 0.16)).sub(comp.localToWorld(V(-0.004, DIAL_Y, 0.043))).multiplyScalar(kD));
      cam.lens(camera, 100);
      cam.place(camera, C, tgt);
      cam.handheld(camera, T, 0.1, 6);
      // glint path on the star ring: local angle atan2(z, x), E = 0, S = π/2; ~60° from ESE to S, resting on 午 at 4.7 s
      const sw = ease.inOutSine(clamp(tl / 4.7));
      const aLoc = lerp(0.52, Math.PI / 2, sw);
      const R = 0.0425;
      const P = comp.localToWorld(V(Math.cos(aLoc) * R, DIAL_Y, Math.sin(aLoc) * R));
      const hL = 0.53, hC = C.y - DIAL_Y;
      const Lh = V(P.x + (P.x - C.x) * hL / hC, DIAL_Y + hL, P.z + (P.z - C.z) * hL / hC);
      lamp.update(T, { swing: [0, 0] });
      lamp.object3D.position.copy(Lh).sub(flameLocal);
      lampSpot.intensity = LAMP_I * 0.55 * flk(T); lamp.light.intensity = LAMP_PT * 0.5 * flk(T);
      // thumb (review restage): the right hand rests OUTSIDE the dial beyond its south-west rim (screen left, at the
      // dial's own focus distance), fingers hooked over the box edge; the extended thumb lies along the rim with its pad on
      // the salt at 午 and drags one slow stroke E → W toward the palm, then the hand lifts away to the left. The earlier
      // staging (hand between lens and dial) put a defocused dark shape over half the frame.
      const th = thumbHand;
      const L0 = comp.localToWorld(V(0, 0, 0)), dL = (x, y, z) => comp.localToWorld(V(x, y, z)).sub(L0).normalize();
      const Ed = dL(1, 0, 0), Sd = dL(0, 0, 1), Upd = V(0, 1, 0);
      const rimS = comp.localToWorld(V(0, RIM_Y + 0.003, COMP_R - 0.0028));            // south rim (local +Z)
      const tangent = Ed;
      const enter = clamp((tl - 2.45) / 0.5), wipe = clamp((tl - 2.95) / 0.85), leave = clamp((tl - 3.75) / 0.35);
      const along = lerp(0.011, -0.009, ease.inOutSine(wipe));                                                   // drag E → W across 午
      const away = Ed.clone().multiplyScalar(-0.55).addScaledVector(Sd, 0.35).addScaledVector(Upd, 0.75).normalize().multiplyScalar(0.06);
      const padT = comp.localToWorld(V(along, RIM_Y + 0.0034, COMP_R - 0.0032));
      const pad = padT.clone().addScaledVector(away, (1 - ease.outCubic(enter)) + ease.inCubic(leave));
      th.setChannels({ wrist: [0.15, 0.15], thumb: [THUMB_CH[0], THUMB_CH[1], THUMB_CH[2], THUMB_CH[3], THUMB_CH[4]], index: [0.95, 1.15, 0.7, 0.02], middle: [1.0, 1.2, 0.7, 0], ring: [1.05, 1.2, 0.7, -0.02], little: [1.1, 1.2, 0.7, -0.05] });
      const Fh = Sd.clone().multiplyScalar(0.7).addScaledVector(Upd, -0.55).addScaledVector(Ed, -0.25).normalize();
      const Nh = Upd.clone().negate().addScaledVector(Sd, 0.25); Nh.addScaledVector(Fh, -Nh.dot(Fh)).normalize();
      th.placeWrist(pad.clone().addScaledVector(Ed, -0.075).addScaledVector(Sd, 0.03).addScaledVector(Upd, 0.03), Fh, Nh);
      th.root.updateMatrixWorld(true);
      // swing the whole hand about the thumb pad so the distal thumb lies along the rim (E, dipping 10°): the thumb then
      // stays in the dial's focal plane instead of rising toward the lens
      { const tp = th.tip('thumb', new THREE.Vector3()), tb = th.fingerBones.thumb[1].getWorldPosition(new THREE.Vector3());
        const want = Ed.clone().addScaledVector(Upd, -0.18).addScaledVector(Sd, -0.12).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(tp.clone().sub(tb).normalize(), want);
        th.root.position.sub(tp).applyQuaternion(q).add(tp); th.root.quaternion.premultiply(q); th.root.updateMatrixWorld(true); }
      const tip = th.tip('thumb', new THREE.Vector3()); th.root.position.add(pad.clone().sub(tip)); th.root.updateMatrixWorld(true);
      th.root.visible = tl > 2.35 && tl < 4.2;
      lampSpot.castShadow = th.root.visible;   // only the thumb casts a shadow worth a pass here (needle shadow = decal)
      if (DBG) { const pr = (v) => { camera.updateMatrixWorld(); const q = v.clone().project(camera); return [(q.x * 0.5 + 0.5).toFixed(2), (0.5 - q.y * 0.5).toFixed(2)]; };
        const tdir = th.tip('thumb', new THREE.Vector3()).sub(th.fingerBones.thumb[1].getWorldPosition(new THREE.Vector3())).normalize();
        dbg('S006', tl.toFixed(2), 'pad', pr(pad), 'wrist', pr(th.root.position), 'rimS', pr(rimS), 'glint', pr(P), 'thumbDir·E', tdir.dot(Ed).toFixed(2), '·S', tdir.dot(Sd).toFixed(2), '·Up', tdir.dot(Upd).toFixed(2)); }
      if (DBG && new URLSearchParams(location.search).get('far')) { cam.lens(camera, 30); }
      // salt wiped where the thumb has passed (mask offset along the arc)
      saltMask.offset.x = 0.53 - 1.06 * ease.inOutSine(wipe);
      glint.object3D.visible = true; glint.object3D.position.copy(P).add(V(0, 0.0008, 0));
      bounce.visible = true; bounce.position.copy(C).add(V(0, 0.04, 0)); bounce.intensity = (0.03 + +(Q6.bo || 0.1) * (th.root.visible ? 1 : 0)) * flk(T);   // warm chart bounce: the thumb reads as weathered brown skin
      // the stern window is behind the lens: a cool twilight fill models the thumb's near side (warm lamp rim beyond it)
      if (th.root.visible) { winFill.intensity = +(Q6.wf || 0.3); winFill.angle = 0.13; winFill.penumbra = 0.9; winFill.color.setHex(0x7d98cc); winFill.position.set(WIN.cx - 0.1, WIN.cy, CAB.z0 + 0.05); winFill.target.position.copy(pad); }
      glint.set(1.1 * (0.7 + 0.3 * Math.abs(Math.sin(aLoc * 28))) * flk(T));
      // focus: the star ring; a gentle rack to the thumb (its nail plane, ~1.5 cm above the dial) while it works, back to the
      // ring for the glint coming to rest on 午 (4.7 s); T8 (shot: T5.6–T8)
      const fRing = cam.distTo(camera, comp.localToWorld(V(0.03, DIAL_Y, 0.03)));
      const fThumb = cam.distTo(camera, pad.clone().addScaledVector(Upd, 0.011));
      const wF = smoothstep(2.32, 2.6, tl) * (1 - smoothstep(3.85, 4.35, tl));   // (integration) the thumb is sharp as it enters
      return { dof: { focus: lerp(fRing, fThumb, wF), fstop: 8, maxCoc: S006_MC }, exposure: 0.85, saturation: 0.8, temp: -0.06 };
    },
    // ---------------------------------------------------------- S007 — he looks up; the camera rises along his eyeline through the hatch to the sail
    // (integration restage) 0–1.6 s: MCU from a little below his eye line; the swinging lantern is cheated behind-left of him
    // (a three-quarter-back key: cheek edge, nose ridge, brow and head-cloth warm, the face toward us 60–70 % in shadow) and
    // the open hatch above the table is a cool dusk top light on the head-cloth and shoulders. 1.61 s '你把半生': he lifts his
    // face into that cool light; the camera rises and tilts up while easing aft under the hatch so the dusk-blue opening is in
    // frame from the first moment of the tilt and grows (≈15 % at 1.8 s → filling the frame by 2.83 s = 43.0 s, the dark-wood
    // seam of T04 lit warm by the lantern's bounce on the coaming); it clears the coaming and tilts on to the battened sail,
    // which fills the frame on 3.77 s (43.94 '帆') and keeps sliding down the frame as the crane keeps rising to the cut (→ S008).
    // The sky is S008's dusk (P01 → P03, no stars).
    S007(tl, u, T) {
      nav.root.visible = true; ext.visible = true; sky.object3D.visible = true; backdrop.visible = false;
      winLight.object3D.visible = false;
      const up = smoothstep(1.55, 2.35, tl);
      const hatchC = V(0.1, DECK_Y + 0.5, -0.6);
      poseStoop(nav, T, { lift: up, dz: 0.2, yaw: -(+(Q7.yw || 0.32)) });   // turned a little toward the lantern: short lighting, the near cheek in shadow
      if (up > 0) nav.lookAt(hatchC, up);
      const eye = nav.eye();
      // lantern: behind-left of him (frame left, just out of frame), swinging; its shadowed spot is the key
      lamp.object3D.position.set(+(Q7.lx || 1.12), LAMP_HOOK.y + 0.02, +(Q7.lz || 0.34)); setLampGlow(0.5);
      lamp.update(T, { swing: lampSwing(T) });
      lampSpot.color.setHex(LAMP_SKIN); lamp.light.color.copy(LAMP_SKIN_PT);
      lampSpot.angle = 0.6; lampSpot.penumbra = 1.0;
      lamp.object3D.updateMatrixWorld(true);
      lampSpot.target.position.copy(lamp.body.worldToLocal(eye.clone().add(V(0.0, 0.04, 0.06))));
      lampSpot.intensity = +(Q7.lk || 1.7) * flk(T); lamp.light.intensity = LAMP_PT * 0.9 * flk(T);
      for (const o of chartRoll) o.visible = false;   // the cream roller end was the brightest blob at lower left
      // the open hatch: a cool dusk top light on the head-cloth, shoulders and the chart below (no shadow)
      hatchSky.visible = true; hatchSky.color.setHex(0x6f8cc4); hatchSky.angle = 0.3; hatchSky.penumbra = 0.9;
      hatchSky.position.set(0.08, DECK_Y + 0.9, -0.66); hatchSky.target.position.copy(eye).add(V(0, 0.12, 0.05));
      hatchSky.intensity = +(Q7.hs || 1.1);
      hemi.intensity = 0.12; hemi.color.setHex(0x4a62a0);
      // the lantern's bounce on the hatch coaming / trimmer undersides: the passage stays readable (≥ 25/255)
      const pass = smoothstep(1.7, 2.3, tl) * (1 - smoothstep(3.1, 3.5, tl));
      bounce.visible = true; bounce.color.setHex(0xffa860); bounce.position.set(0.12, CEIL - 0.2, -0.5); bounce.intensity = (0.03 + +(Q7.bo || 0.32) * pass) * flk(T);
      // camera: solved on his face for the hold, then a smooth crane (Hermite on position + yaw / pitch, zero velocity at 1.6 s)
      cam.lens(camera, 32);
      const C0 = V(0.03, 1.17 + 0.012 * smoothstep(0, 1.6, tl), -0.86);
      aimAt(C0, eye, 0.58, 0.48);
      const y0 = camera.rotation.y < 0 ? camera.rotation.y + 2 * Math.PI : camera.rotation.y, p0 = camera.rotation.x;   // unwrapped near π (looking +z)
      if (tl > 1.6) {
        const D = THREE.MathUtils.degToRad;
        const K = [
          [1.6, [C0.x, C0.y, C0.z], y0, p0],
          [1.95, [-0.045, 1.24, -0.87], Math.PI + 0.03, D(31)],
          [2.35, [-0.04, 1.36, -0.88], Math.PI + 0.07, D(46)],
          [2.83, [-0.02, 1.55, -0.87], Math.PI + 0.12, D(58)],
          [3.3, [0.0, 1.95, -0.84], Math.PI + 0.22, D(56)],
          [3.77, [0.03, 2.32, -0.8], Math.PI + 0.3, D(50)],
          [4.7, [0.06, 2.98, -0.76], Math.PI + 0.32, D(57)],
        ];
        const n = K.length, tk = (k) => K[k][0], val = (k, c) => (c < 3 ? K[k][1][c] : K[k][c - 1]);
        const tan = (k, c) => (k === 0 ? 0 : (val(Math.min(n - 1, k + 1), c) - val(k - 1, c)) / (tk(Math.min(n - 1, k + 1)) - tk(k - 1)));
        let i = 0; while (i < n - 2 && tl > tk(i + 1)) i++;
        const h = tk(i + 1) - tk(i), x = clamp((tl - tk(i)) / h, 0, 1.5), x2 = x * x, x3 = x2 * x;
        const H = (c) => val(i, c) * (2 * x3 - 3 * x2 + 1) + tan(i, c) * h * (x3 - 2 * x2 + x) + val(i + 1, c) * (-2 * x3 + 3 * x2) + tan(i + 1, c) * h * (x3 - x2);
        camera.position.set(H(0), H(1), H(2)); camera.rotation.order = 'YXZ'; camera.rotation.set(H(4), H(3), 0); camera.updateMatrixWorld(true);
      }
      cam.handheld(camera, T, 0.22, 7);
      if (DBG) { camera.updateMatrixWorld(); const lw = lamp.light.getWorldPosition(new THREE.Vector3()); const q = lw.clone().project(camera); dbg('S007', tl.toFixed(2), 'eye', eye, 'cam', camera.position, 'lamp', lw, 'scr', q.x.toFixed(2), q.y.toFixed(2), 'z', q.z.toFixed(3)); }
      // focus: face → the hatch edge / near wood (≈ 0.5 m) → sail; T4
      const fFace = cam.distTo(camera, eye), fSail = 9, fNear = 0.5;
      const focus = tl < 1.7 ? fFace : tl < 2.9 ? lerp(fFace, fNear, smoothstep(1.7, 2.3, tl)) : lerp(fNear, fSail, smoothstep(2.85, 3.45, tl));
      const outK = smoothstep(2.3, 3.3, tl);
      sailParts.hemi.intensity = 2.6; sailParts.glow.intensity = 1.6;
      sky.set({ stars: 0, cloudCover: 0.32 }); sky.update(T);
      return { dof: { focus, fstop: 4 }, exposure: lerp(1.12, +(Q7.ex || 1.75), outK), temp: lerp(0.0, -0.08, outK), saturation: lerp(0.86, 0.8, outK) };
    },
    // ---------------------------------------------------------- S009 — needle settles on 午 exactly at 49.77 (tl 1.48); pivot at (0.46,0.50)
    S009(tl, u, T) {
      winLight.object3D.visible = false;
      lampSpot.castShadow = false;   // top-down macro: needle contact shadow is the decal
      const tS = 1.455;  // 49.77 s '南' = frame 1194 (tl 1.458): at rest on that frame
      // damped oscillation about south: ±8° → ±4° (0.6 s) → ±1° (1.1 s) → dead stop at 1.48 s
      // (integration) 8° clockwise of south at frame 0, 2.5 damped cycles (±4° by 0.6 s, ±1.3° by 1.1 s), the envelope reaching
      // zero with zero slope at tS: dead still from frame 1194 (49.77 '南')
      const env = THREE.MathUtils.degToRad(8) * Math.pow(Math.max(0, 1 - tl / tS), 1.35);
      needle.rotation.y = tl < tS ? -env * Math.cos((tl / tS) * Math.PI * 2 * 2.5) : 0;
      needleShadow.rotation.z = -needle.rotation.y;
      const piv = comp.localToWorld(V(0, DIAL_Y, 0));
      const S = comp.localToWorld(V(0, 0, 1)).sub(comp.localToWorld(V(0, 0, 0))).setY(0).normalize();
      const ang = THREE.MathUtils.degToRad(215), ca = Math.cos(ang), sa = Math.sin(ang);
      const Up = V(S.z * ca + S.x * sa, 0, -S.x * ca + S.z * sa).normalize();
      const dist = 0.40, R = V(-Up.z, 0, Up.x), fw = dist * 36 / 100;
      const off = R.clone().multiplyScalar(0.04 * fw);
      const sway = 0.0006 * Math.sin(T * 2 * Math.PI / 7);
      cam.lens(camera, 100);
      // a 4° tilt about the screen-vertical axis puts the frame's left/right edges out of the focal plane (bearing glyphs soft)
      placeUp(camera, piv.clone().add(off).add(V(sway, dist, 0)).addScaledVector(R, dist * Math.tan(0.07)), piv.clone().add(off).add(V(sway, 0, 0)), Up);
      // (review) in-use brass must read warm gold (#B8925A), not the museum's chocolate: the lantern is hung where its
      // reflection lands just beyond the frame's upper-left corner, so a warm sheen grades across the dial from upper left
      // (sliding a little with the swing); the env reflections are lifted for the polished metal.
      const Cxz = camera.position.clone(), hC = Cxz.y - DIAL_Y, hL = 0.5;
      const sw7 = Math.sin(T * 2 * Math.PI / 7);
      const Pm = piv.clone().add(off).addScaledVector(R, -0.115 + 0.008 * sw7).addScaledVector(Up, 0.05);
      const Lw = Pm.clone().multiplyScalar((hC + hL) / hC).addScaledVector(Cxz, -hL / hC); Lw.y = DIAL_Y + hL;
      lamp.update(T, { swing: [0, 0] }); lamp.object3D.position.copy(Lw).sub(flameLocal);
      lampSpot.intensity = LAMP_I * 0.3 * flk(T); lamp.light.intensity = LAMP_PT * 0.6 * flk(T);
      scene.environmentIntensity = 0.8;
      // a cool line along the needle (bible: '针面一线高光'): the window cheated to the spot whose mirror image in the
      // needle's sloped top facet reaches the lens when the needle is at rest
      { needle.updateMatrixWorld(true);
        const q0 = comp.getWorldQuaternion(new THREE.Quaternion());
        const nF = V(0.0007, 0.0021, 0).normalize().applyQuaternion(q0);        // +x top facet of the diamond section (needle at rest)
        const Pf = comp.localToWorld(V(0.0007, DIAL_Y - 0.0012, -0.008));        // on the north half of the needle
        const cv = camera.position.clone().sub(Pf).normalize();
        const lv = nF.clone().multiplyScalar(2 * nF.dot(cv)).sub(cv).normalize();
        winFill.intensity = 0.007; winFill.angle = 0.06; winFill.penumbra = 0.8; winFill.color.setHex(0x8eb0e6);
        winFill.position.copy(Pf).addScaledVector(lv, 0.45); winFill.target.position.copy(Pf); }
      return { dof: { focus: dist - 0.001, fstop: 2.8 }, exposure: 1.1 };
    },
    // ---------------------------------------------------------- S010 — eye-line CU (integration restage): his LEFT eye at (0.46,0.50), gaze to frame left
    // A low-key eye-line close-up instead of a lit mask: he leans in close to the barred stern window (eye ≈ 0.45 m from it)
    // and looks out toward the shore he cannot see; the camera is behind his LEFT shoulder (three-quarter back, 100 mm), so
    // the window — soft, deep dusk blue between dark vertical bars — fills frame left BEHIND his profile and the brow, lid
    // line, nose and beard read as a near-silhouette edge. The window is also the cool key: a thin rim on the front planes
    // only. The swinging lantern (behind-left, out of frame) is a warm graze on the ear / cheek edge / head-cloth. The eye is
    // a cue, not a sculpt: the window's wet catch-light sits on the eye point exactly at (0.46, 0.50) (T05 = the needle's
    // pivot) and the 51.39 '回' blink is the catch-light going out for 4 frames. A few loose strands escaping the head-cloth
    // move in the draught against the window.
    S010(tl, u, T) {
      nav.root.visible = true; strands.visible = true;
      winLight.object3D.visible = false; backdrop.visible = true;
      for (const o of chartRoll) o.visible = false;
      // seated low beside the table, leaning toward the window; the figure is placed by its eye (feet never in frame)
      const E10 = V(0.02, WIN.cy + 0.03, CAB.z0 + 0.47);
      nav.root.rotation.set(0, Math.PI - 0.08, 0); nav.root.position.set(0, 0, 0);
      nav.pose('sit_bench', { seat: 0.43, lean: 0.34, hands: 'knees' });
      nav.pose({ 'neck.x': -0.06, 'head.x': -0.04 }, { add: true });
      const gazeAt = V(WIN.cx - 0.18, WIN.cy - 0.06, CAB.z0 - 3.0);
      nav.root.updateMatrixWorld(true);
      { const e0 = nav.eye(); nav.root.position.add(E10.clone().sub(e0)); nav.root.updateMatrixWorld(true); }
      nav.lookAt(gazeAt, 0.9); nav.breathe(T, 0.45);
      const hb = nav.bone('head'); hb.updateWorldMatrix(true, false);
      const eyeL = eyeSW();
      const fwd = gazeAt.clone().sub(eyeL).setY(0).normalize(), left = V(fwd.z, 0, -fwd.x);   // his left (fwd × up)
      // camera: three-quarter back from his left (θ from his facing), ~1.0 m, a hair below the eye line; imperceptible push
      const th = THREE.MathUtils.degToRad(+(Q10.th || 115)), D = lerp(+(Q10.d || 1.02), +(Q10.d || 1.02) * 0.975, ease.inOutSine(clamp(u)));
      const C = eyeL.clone().addScaledVector(fwd, Math.cos(th) * D).addScaledVector(left, Math.sin(th) * D).add(V(0, -0.02, 0));
      cam.lens(camera, 100);
      aimAt(C, eyeL, 0.46, 0.50);
      // the window behind his profile (cheated plate, see winPlate): 0.6 m beyond the eye, its right frame edge hidden by his head
      { const vd = eyeL.clone().sub(C).normalize(), Rr = vd.clone().cross(V(0, 1, 0)).normalize(), dP = D + +(Q10.pd || 0.34), fwP = dP * 36 / 100;
        winPlate.visible = true; winPlate.position.copy(C).addScaledVector(vd, dP).addScaledVector(Rr, (0.25 - 0.5) * fwP).add(V(0, 0.012, 0));
        winPlate.lookAt(C); winPlate.scale.setScalar(fwP * 0.7); winPlate.material.color.copy(col('#ffffff', +(Q10.bk || 1.35))); }
      // cool window key from the plate's side: a thin rim on brow, lid line, nose and beard edge (the front planes face it)
      winFill.intensity = +(Q10.wf || 4.2); winFill.angle = 0.2; winFill.penumbra = 1.0; winFill.color.setHex(0x86a8dc);
      winFill.position.copy(winPlate.position).add(V(0, 0.05, 0)); winFill.target.position.copy(eyeL).add(V(0, -0.03, 0));
      // lantern: behind-left of him, out of frame, swinging — a warm graze on the ear, the cheek edge and the head-cloth
      setLampGlow(0.25);
      const sw = Math.sin(T * 2 * Math.PI / 7.0 + 0.4);
      lamp.object3D.position.copy(eyeL).addScaledVector(left, +(Q10.ll || 0.4)).addScaledVector(fwd, -0.4 + 0.05 * sw).setY(Math.min(CEIL - 0.12, eyeL.y + 0.3));
      lamp.object3D.updateMatrixWorld(true);
      lampSpot.color.setHex(LAMP_SKIN); lampSpot.castShadow = true; lampSpot.angle = 0.5; lampSpot.penumbra = 1.0;
      lampSpot.target.position.copy(lamp.body.worldToLocal(eyeL.clone().addScaledVector(fwd, -0.09).addScaledVector(left, 0.03).add(V(0, 0.03, 0))));
      lampSpot.intensity = +(Q10.lk || 0.11) * flk(T) * (0.85 + 0.15 * sw);
      lamp.light.color.copy(LAMP_SKIN_PT); lamp.light.intensity = 0.02 * flk(T);
      hemi.intensity = 0.03;
      bounce.visible = false;
      // the catch-light: the window's reflection on the eye, exactly at (0.46, 0.50); out for 4 frames on '回' (51.39)
      const blink = tl >= 1.385 && tl < 1.385 + 4 / 24;
      catchL.object3D.visible = !blink; catchL.object3D.position.copy(eyeL); catchL.set((+(Q10.cl || 2.2)) * (0.92 + 0.08 * Math.sin(T * 5.3)));
      // loose strands in the draught (about their roots on the hem)
      for (const m of strands.children) { const kq = m.userData.k; m.rotation.set(0.16 * noise1(T * 2.3 + kq * 3, 4), 0, 0.22 * fbm1(T * 1.7 + kq, 9) + 0.08); }
      cam.handheld(camera, T, 0.1, 10);
      if (DBG) { camera.updateMatrixWorld(); const q = eyeL.clone().project(camera); dbg('S010', 'eyeL', eyeL, 'C', C, 'screen', ((q.x * 0.5 + 0.5)).toFixed(3), (0.5 - q.y * 0.5).toFixed(3)); }
      return { dof: { focus: cam.distTo(camera, eyeL), fstop: 2.8 }, exposure: +(Q10.ex || 1.15), saturation: 0.82, temp: -0.03, contrast: 1.1 };
    },
    // ---------------------------------------------------------- S011 — left fingers turn back the RIGHT cuff; pads settle on the patch (53.0) and hold
    // (integration) the cuff is the module's turned-back flap (buildCuffFlap): the patch is sewn on the INSIDE of the sleeve
    // end and only shows because the cuff is folded back. Cut in mid-gesture: 0–0.17 s the left thumb + index, pinching the
    // cuff's edge, turn it the last half of the way back (the patch swings into view, the side being pinched leading);
    // 0.17–0.27 s they let go and the index + middle pads settle on the patch (53.0 vocal end), then nothing moves; the
    // lantern pool brightens on the patch 1.0–2.5 s; a little cool window light keeps the patch pale blue (#7D9CBB).
    S011(tl, u, T) {
      cuffR.root.visible = cuffL.root.visible = true;
      winLight.object3D.visible = false;
      setLampGlow(0.4);
      for (const o of chartRoll) o.visible = false;   // the cream roller end sat right behind the cuff as the brightest blob in frame
      lampSpot.color.setHex(LAMP_SKIN); lamp.light.color.copy(LAMP_SKIN_PT);
      const settle = ease.outCubic(clamp(tl / 0.25));
      // right forearm resting on the chart table, pointing aft (screen right), palm up, wrist rolled a little inward
      const W_R = V(0.13, TABLE.y + 0.04, -0.34);
      const rollIn = lerp(-0.12, 0, settle);
      const fd = V(-0.12, -0.05, -1).normalize();
      const pn = V(0.34 + rollIn, 0.94, 0.0).normalize();
      cuffR.pose('relaxed', { curl: 0.62 });
      cuffR.placeWrist(W_R, fd, pn);
      cuffR.root.updateMatrixWorld(true);
      // camera direction (slight high angle from starboard); the patch is sewn where it faces the lens
      const camDir = V(0.6, 0.42, 0.06).normalize();
      flapR.hideLib(true);
      const aP = flapR.angleToward(W_R.clone().add(V(0, 0, 0.09)).addScaledVector(camDir, 3));
      flapR.uniforms.uPatchA.value = aP;
      const sMid = 0.5 * (flapR.uniforms.uS0.value + flapR.uniforms.uS1.value);
      flapR.setFold(Math.PI, aP);
      const patch = flapR.worldAt(aP, sMid);                                                  // final (folded) patch centre
      const al = lerp(0.74 * Math.PI, Math.PI, ease.outCubic(clamp(tl / 0.17)));
      // the cuff is pinched at its top edge in frame (the far side of the arm), so the hand never hides the patch
      let aPin = aP + 1.05; { const eA = flapR.worldAt(aP + 1.05, flapR.LF), eB = flapR.worldAt(aP - 1.05, flapR.LF), cTmp = patch.clone().addScaledVector(camDir, 0.9), up = V(0, 1, 0);
        if (eB.clone().sub(cTmp).dot(up) > eA.clone().sub(cTmp).dot(up)) aPin = aP - 1.05; }
      flapR.setFold(al, aPin);
      const ax = V(0, 1, 0).applyQuaternion(cuffR.root.quaternion);                     // forearm axis (toward the elbow)
      const radial = (p) => { const r = p.clone().sub(cuffR.root.position); return r.addScaledVector(ax, -r.dot(ax)); };
      const nP = radial(patch).normalize(), Rout = radial(patch).length();
      const C = patch.clone().addScaledVector(camDir, 0.9);
      const viewDir = patch.clone().sub(C).normalize();
      const Rv = viewDir.clone().cross(V(0, 1, 0)).normalize(), Uv = Rv.clone().cross(viewDir).normalize();
      const dist = C.distanceTo(patch), fh = dist * 36 / 100 / 2.39;
      cam.lens(camera, 100);
      // final left-hand pose: index + middle pads on the patch, fingers to screen lower-left ~30° below horizontal (→ S012)
      const sd = Rv.clone().multiplyScalar(-Math.cos(0.52)).addScaledVector(Uv, -Math.sin(0.52));
      const kV = (0.22 - sd.dot(nP)) / Math.min(-0.2, viewDir.dot(nP));
      const lfd = sd.clone().addScaledVector(viewDir, kV).normalize();
      const lpn = nP.clone().negate().addScaledVector(lfd, nP.dot(lfd)).normalize();
      const CH_REST = { wrist: [0.06, 0.0], thumb: [0.3, 0.35, 0.2, 0.25, 0.1], index: [0.2, 0.16, 0.06, 0.04], middle: [0.18, 0.18, 0.07, -0.01], ring: [0.42, 0.72, 0.42, -0.05], little: [0.55, 0.85, 0.5, -0.1] };
      cuffL.setChannels(CH_REST);
      cuffL.placeWrist(patch.clone().addScaledVector(lfd, -0.16).addScaledVector(nP, 0.03), lfd, lpn);
      const pads = () => { cuffL.root.updateMatrixWorld(true); return [cuffL.tip('index', new THREE.Vector3()), cuffL.tip('middle', new THREE.Vector3())]; };
      const gap = (p) => radial(p).length() - Rout;                                             // pad point above the cloth
      const PAD = 0.0030;                                                                        // tip() pad point sits ~0.4 r inside the finger
      const target = patch.clone().addScaledVector(ax, -0.013).addScaledVector(Rv, 0.002);   // pads on the wrist-side half: the knotted corner shows
      for (let it = 0; it < 3; it++) {
        let [pi, pm] = pads();
        const mid = pi.clone().add(pm).multiplyScalar(0.5), sep = pi.distanceTo(pm);
        const e = gap(pi) - gap(pm);
        if (Math.abs(e) > 0.0003 && sep > 0.005) {
          const ang = Math.atan2(e, sep);
          for (const sgn of [1, -1]) {
            const q = new THREE.Quaternion().setFromAxisAngle(lfd, sgn * ang);
            const save = [cuffL.root.position.clone(), cuffL.root.quaternion.clone()];
            cuffL.root.position.sub(mid).applyQuaternion(q).add(mid); cuffL.root.quaternion.premultiply(q);
            [pi, pm] = pads();
            if (Math.abs(gap(pi) - gap(pm)) < Math.abs(e)) break;
            cuffL.root.position.copy(save[0]); cuffL.root.quaternion.copy(save[1]); [pi, pm] = pads();
          }
        }
        const m2 = pi.clone().add(pm).multiplyScalar(0.5);
        const tgt = target.clone().addScaledVector(nP, PAD - (gap(target)));
        cuffL.root.position.add(tgt.sub(m2));
      }
      { const [pi, pm] = pads(); cuffL.root.position.addScaledVector(nP, PAD - 0.5 * (gap(pi) + gap(pm))); }
      // camera (locked): framed so the pads' contact sits at the S012 registration (0.50, 0.52)
      { const [pi, pm] = pads(); const d = pi.clone().add(pm).multiplyScalar(0.5).addScaledVector(nP, -PAD).sub(patch); d.addScaledVector(viewDir, -d.dot(viewDir));
        cam.place(camera, C.clone().add(d), patch.clone().add(d).addScaledVector(Uv, 0.02 * fh)); cam.handheld(camera, T, 0.2, 11);
        if (DBG && new URLSearchParams(location.search).get('far')) { cam.lens(camera, 35); } }
      // the fold: thumb + index pinch the cuff's edge and carry it over (0–0.17 s), then release onto the patch (→ 0.27 s)
      const kRel = smoothstep(0.15, 0.27, tl);
      if (kRel < 1) {
        const posB = cuffL.root.position.clone(), qB = cuffL.root.quaternion.clone();
        const PINCH = { wrist: [0.1, 0.05], thumb: [0.55, 0.42, 0.25, 0.25, 0.35], index: [0.62, 0.72, 0.32, 0.0], middle: [0.62, 0.95, 0.45, 0.0], ring: [0.7, 1.05, 0.5, -0.02], little: [0.78, 1.1, 0.55, -0.05] };
        cuffL.setChannels(PINCH);
        const pdir = lfd.clone().addScaledVector(nP, -0.6).normalize(); cuffL.placeWrist(posB, pdir, nP.clone().negate().addScaledVector(pdir, nP.dot(pdir)).normalize());
        cuffL.root.updateMatrixWorld(true);
        const edge = flapR.worldAt(aPin, flapR.LF * 0.96);
        const pin = cuffL.sockets.pinch.getWorldPosition(new THREE.Vector3());
        cuffL.root.position.add(edge.sub(pin)); cuffL.root.updateMatrixWorld(true);
        const posA = cuffL.root.position.clone(), qA = cuffL.root.quaternion.clone();
        const chB = CH_REST, ch = {}; for (const k of Object.keys(chB)) ch[k] = PINCH[k].map((x, i) => x + (chB[k][i] - x) * kRel);
        cuffL.setChannels(ch);
        cuffL.root.position.copy(posA).lerp(posB, kRel); cuffL.root.quaternion.copy(qA).slerp(qB, kRel);
      }
      cuffL.root.updateMatrixWorld(true);
      winFill.intensity = +(Q11.wf || 0.7); winFill.target.position.copy(patch);
      if (DBG && new URLSearchParams(location.search).get('nolh')) cuffL.root.visible = false;
      // lantern light passes over the patch: brighter 1.0–2.5 s
      const kL = smoothstep(0.7, 1.4, tl) * (1 - smoothstep(2.4, 3.1, tl));
      lampSpot.intensity = LAMP_I * (0.75 + 0.45 * kL) * flk(T);
      if (DBG) { const [pi, pm] = pads(); const pr = (v) => { const q = v.clone().project(camera); return [(q.x * 0.5 + 0.5).toFixed(3), (0.5 - q.y * 0.5).toFixed(3)]; }; dbg('S011', tl.toFixed(2), 'gapI', (gap(pi) * 1000).toFixed(2), 'gapM', (gap(pm) * 1000).toFixed(2), 'padI', pr(pi), 'padM', pr(pm), 'patch', pr(patch), 'Rout', Rout.toFixed(4)); }
      return { dof: { focus: dist, fstop: 5.6 }, exposure: 1.0, temp: -0.04, saturation: 0.86, bloom: { strength: 0 } };   // no practical in frame: skip bloom (perf)
    },
    // ---------------------------------------------------------- nested: the navigator bent over the compass under the swinging lamp (gallery G3a)
    view_cabin(tl, u, T) {
      // he stands on the port side of the compass box, bent over it, facing starboard (profile to camera); lamp from the
      // hatch's forward trimmer swinging above the dial; the barred stern window glows behind the table (moonlight, upper right)
      navMid.root.visible = true; dust.object3D.visible = true; shaft.object3D.visible = true;
      navMid.root.position.set(-0.6, 0, -0.43); navMid.root.rotation.set(0, Math.PI / 2, 0);
      navMid.pose({ 'hips.py': -0.04, 'legL.upper.x': 0.18, 'legR.upper.x': 0.18, 'legL.lower.x': 0.34, 'legR.lower.x': 0.34, 'legL.foot.x': -0.16, 'legR.foot.x': -0.16, 'hips.x': 0.16, 'spine.x': 0.26, 'chest.x': 0.34, 'neck.x': 0.18, 'head.x': 0.28, handL: ['flat', {}], handR: ['relaxed', { curl: 0.45 }] });
      navMid.reach('L', V(-0.27, TABLE.y + 0.04, -0.6), { palm: V(0, -1, 0), fingers: V(1, -0.2, -0.1).normalize() });
      navMid.reach('R', V(-0.26, TABLE.y + 0.07, -0.3), { palm: V(0, -1, 0.2), fingers: V(1, -0.35, 0.0).normalize() });
      navMid.lookAt(V(CP.x, DIAL_Y, CP.z), 0.95); navMid.breathe(T, 0.8);
      // (review) hung further starboard along the trimmer: 45 cm clear of his head-cloth (it overlapped his head from
      // this angle), still over the compass box / chart, lighting his profile from the front
      lamp.object3D.position.set(0.13, CEIL - 0.07, HATCH.z1 + 0.04); setLampGlow(0.8);
      lamp.update(T, { swing: lampSwing(T).map((x) => x * 1.3) });
      lampSpot.angle = 1.15; lampSpot.intensity = LAMP_I * 1.2 * flk(T); lamp.light.intensity = LAMP_PT * 2.6 * flk(T);
      // camera forward-starboard of him looking aft; slow truck screen-right for parallax in the gallery glass
      const truck = lerp(-0.07, 0.07, clamp(u));
      const port = camera.aspect < 1.2;
      const C = V(0.06 + truck, port ? 1.22 : 1.34, 0.9), tg = V((port ? -0.17 : -0.3) + truck * 0.5, port ? 0.98 : 1.1, -0.46);
      cam.place(camera, C, tg);
      if (port) { camera.fov = 60; camera.userData.mm = 26; } else cam.lens(camera, 22);
      winLight.update(T, { intensity: WIN_I * 1.2 });
      shaft.update(T); dust.update(T, { camera, focus: 1.6, fstop: 4 });
      return { dof: null };
    },
  };
  // lab (integration pass): the dressed navigator's head from 8 angles (frame n → n·45°), neutral key — out/check/ship_cabin/integ
  let labKey = null;
  setups.LAB_HEAD = (tl, u, T) => {
    nav.root.visible = true; lamp.object3D.visible = false; winLight.object3D.visible = false; backdrop.visible = false; cabin.visible = false;
    scene.background.setHex(0x3a4048);
    if (!labKey) { labKey = new THREE.DirectionalLight(0xffffff, 0); scene.add(labKey, labKey.target); }
    nav.root.position.set(0, 0, 0.3); nav.root.rotation.set(0, Math.PI, 0); nav.pose('stand'); nav.root.updateMatrixWorld(true);
    const e = nav.eye(), k = Math.round(tl * 24), a = k * Math.PI / 4, fwd = V(0, 0, -1), lf = V(-1, 0, 0);
    const C = e.clone().addScaledVector(fwd, Math.cos(a) * 0.9).addScaledVector(lf, Math.sin(a) * 0.9).add(V(0, 0.02, 0));
    cam.lens(camera, 60); cam.place(camera, C, e.clone().add(V(0, -0.03, 0)));
    labKey.intensity = 2.2; labKey.position.copy(e).add(V(-0.6, 0.8, -0.9)); labKey.target.position.copy(e);
    hemi.intensity = 0.6; hemi.color.setHex(0x8090b0);
    return { dof: null, exposure: 1.0, vignette: 0.1 };
  };
  setups.default = setups.view_cabin;

  return {
    scene, camera,
    post: { exposure: 1.0, contrast: 1.07, saturation: 0.88, temp: -0.04, shadowTint: [0.43, 0.49, 0.62], highTint: [0.56, 0.52, 0.47], grain: GRAIN, vignette: 0.38,
      bloom: { strength: 0.4, radius: 0.6, threshold: 0.85 }, lift: [0.01, 0.012, 0.02] },
    setShot(shot, tl, u, T) {
      resetCommon(T);
      const fn = setups[shot.id] || setups.default;
      const r = fn(tl, u, T, shot) || {};
      winFill.visible = winFill.intensity > 0;
      if (!shot.nested && r.grain === undefined) r.grain = GRAIN;
      if (OFF.size) { // perf probes (?off=lampShadow,winShadow,win,shaft,dof,bloom,fill,env,fig)
        lampSpot.castShadow = !OFF.has('lampShadow'); winLight.light.castShadow = !OFF.has('winShadow');
        if (OFF.has('win')) winLight.object3D.visible = false; if (OFF.has('shaft')) shaft.object3D.visible = false;
        if (OFF.has('dof')) r.dof = null; if (OFF.has('bloom')) r.bloom = { strength: 0 };
        if (OFF.has('fill')) { winFill.visible = false; bounce.visible = false; hatchSky.visible = false; hemi.visible = false; lamp.light.visible = false; }
        if (OFF.has('env')) scene.environment = null; if (OFF.has('fig')) nav.root.visible = false;
      }
      return r;
    },
  };
}
