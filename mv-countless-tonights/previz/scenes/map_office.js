// map_office — LOC_MAPOFFICE: the 1890s harbour survey office (the same south-east room as today's restoration lab) and its
// annex, the customs-hall threshold (c. 1930s).  Shots: S021 (CH1) · S044 (CH2) · S047 · S048 (BR1).  No named views.
//
// Desk set (world metres, Y up, table top TY): a linen-backed hand-drawn coastal map 90 × 70 cm centred on the origin,
// map +x (cm, left→right) = world +X = frame right, map +y (cm, top→bottom) = world +Z = frame down (every desk shot is a
// 90° top-down with camera-up = −Z).  The official sits at +Z (frame bottom): right hand frame right, left hand frame left.
// Kerosene lamp (2200 K) on the desk at frame right (+X), out of frame; moonlight from frame upper-right through tall,
// half-closed VERTICAL louvre boards → parallel cold stripes running upper-right → lower-left (a SpotLight with a bar cookie).
// Threshold set (S048) lives at O48 (far from the desk; its lights are switched per shot).
//
// Registration (shot list): ink line horizontal at frame y 0.66, drawn left → right (S020→S021, S043→S044, S046→S047→S048);
// S021 end: village mark (0.30, 0.58) uncovered → S022 shore light; S044 end: left palm (0.45, 0.60) → S045 left hand;
// S048 end: handle bar y 0.66, x 0.28–0.72 → S049 (restoration_lab: bar Ø23 mm × 150 mm, leather tabs at ±68 mm).
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand, loadCrowd } from '../lib/cast.js';
import { clamp, lerp, smoothstep, ease, noise1, fbm1, flicker, rng } from '../engine/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const hex = (h) => new THREE.Color(h);
const ONE = V(1, 1, 1);

// ------------------------------------------------------------------ bible colours
const C = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P09: '#B08D57', P10: '#6E5536', P13: '#E2A458', P28: '#0A0F17',
  paper: '#E2D6B8', ink: '#1E2230', teak: '#5A3A26', ebony: '#1E1A17', brass: '#A8894F', wall: '#D9D2C2', dado: '#3E4A40',
  rattan: '#A8783F', rattanGrip: '#7A5530', strap: '#6A4A30', buckle: '#9A7D4E', granite: '#8F8C86',
};
const K2200 = hex('#ffbb7d'), K2400 = hex('#ffdcb6'), MOON = hex('#98b2e8'), DUSK = hex('#7d8aa6');

// ------------------------------------------------------------------ desk geometry
const TY = 0.80;                                  // table top
const MAPW = 90, MAPH = 70;                        // cm
const mw = (mx, my, y = TY) => V(mx / 100 - MAPW / 200, y, my / 100 - MAPH / 200);   // map cm → world
const LINE_W = 0.0020;                             // ruling-pen line width (m) — a bold ruling, reads at 16 px/cm
const RULER = { w: 0.0125, t: 0.0045, brass: 0.0026 };   // integration: a slim 12.5 mm ebony rule (≈ 3.7 % of S021's frame height; the 32 mm one read as a redaction bar)
const INK_GAP = 0.0020;                            // paper between the brass edge and the ink (blade thickness)

// the coast (map cm): x of the coastline as a function of y — one spline + a small hand-drawn wobble
const COAST = [[-4, 23.0], [4, 26.2], [11, 24.6], [18, 27.0], [25, 26.2], [31, 27.3], [36, 28.0], [40.4, 29.0], [45, 31.0], [50, 34.0], [54, 35.6],
  [58.3, 36.5], [62, 35.5], [67, 36.6], [74, 37.8]];
function coastX(my) {
  let i = 0; while (i < COAST.length - 2 && my > COAST[i + 1][0]) i++;
  const p0 = COAST[Math.max(0, i - 1)], p1 = COAST[i], p2 = COAST[i + 1], p3 = COAST[Math.min(COAST.length - 1, i + 2)];
  const t = clamp((my - p1[0]) / (p2[0] - p1[0]), 0, 1), t2 = t * t, t3 = t2 * t;
  const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * (p2[0] - p1[0]), m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * (p2[0] - p1[0]);
  const x = (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
  return x + 0.2 * Math.sin(my * 1.1 + 0.4) + 0.07 * Math.sin(my * 2.9 + 1.3);   // integration: gentler wobble (the old 4.1 cm⁻¹ term read as a hair)
}
// Integration pass: the coast TURNS. In S021's frame the shore runs horizontal at frame y ≈ 0.59 from the left edge to the
// harbour-village mark (x 0.30), then turns south and crosses the ruler line at x 0.30 — the same shape as S022's real coast
// (a low horizontal silhouette at y 0.58, x 0–0.48, the shore light at (0.30, 0.58)), and still "from the sea into the land".
// The sea is the bay south of bayY(x) and west of coastX(y); everything else is land.
const BAY_Y0 = 38.25;
function bayY(mx) { return BAY_Y0 + 0.2 * Math.sin(mx * 0.8 + 0.7) + 0.08 * Math.sin(mx * 2.1 + 1.9) - 0.6 * smoothstep(20, 4, mx); }
function landD(mx, my) {          // signed land distance (cm, > 0 = land): smooth max of the two shore constraints (rounded corner)
  const a = mx - coastX(my), b = bayY(mx) - my, k = 2.4;
  const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1);
  return lerp(b, a, h) + k * h * (1 - h);
}
function coastAt(my) {           // x (map cm) where the shore crosses row my (sea → land)
  let lo = coastX(my) - 9, hi = coastX(my) + 9;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (landD(m, my) > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
function coastPolyline() {        // zero contour of landD, west → corner → south (sea on the left of travel)
  const bis = (f, lo, hi) => { let flo = f(lo); for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; };
  const cx = coastX(BAY_Y0), cy = BAY_Y0, R = 3.0, pts = [];
  for (let x = -1.5; x <= cx - R; x += 0.12) pts.push([x, bis((y) => landD(x, y), cy - 7, cy + 7)]);
  const P0 = [cx - R, cy + R];
  for (let k = 1; k < 40; k++) { const th = -Math.PI / 2 + (k / 40) * (Math.PI / 2), dx = Math.cos(th), dy = Math.sin(th);
    const r = bis((r) => landD(P0[0] + dx * r, P0[1] + dy * r), 0, 10); pts.push([P0[0] + dx * r, P0[1] + dy * r]); }
  for (let y = cy + R; y <= MAPH + 1.5; y += 0.12) pts.push([bis((x) => landD(x, y), cx - 9, cx + 15), y]);
  // sea-side normals (tangent rotated +90°), smoothed so the waterlining offsets never cusp at the corner
  const nrm = pts.map((p, i) => { const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l]; });
  return { pts, nrm };
}
// registration constants (map cm) used by both the map drawing and the cameras
const S021 = { lineY: 40.36, markY: 37.68 };                 // line row (ruler edge) and harbour-village mark row
const S044 = { vY: 56.1, lineY: 58.33 };                     // fishing village centre row, line row (through the lowest houses)
const S047 = { cx: 54, lineY: 29.7 };                        // south flank of the inland hill (hachures run across the line)

// ------------------------------------------------------------------ small helpers
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, { srgb = true, wrap = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso; t.needsUpdate = true; return t;
}
function placeTop(camera, x, z, h, roll = 0) {     // 90° top-down, frame up = −Z (rolled by `roll` rad)
  camera.position.set(x, TY + h, z);
  camera.up.set(Math.sin(roll), 0, -Math.cos(roll));
  camera.lookAt(x, TY, z);
  camera.up.set(0, 1, 0);
  camera.updateMatrixWorld(true);
}
// monotone cubic through points [[t, v], ...] with zero end slopes (pen travel: steady, no hesitation, soft start/stop)
function pchip(P, t) {
  if (t <= P[0][0]) return P[0][1];
  if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
  const n = P.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
  m[0] = 0; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]);
  let i = 0; while (t > P[i + 1][0]) i++;
  const h = P[i + 1][0] - P[i][0], s = (t - P[i][0]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * P[i][1] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * P[i + 1][1] + (s3 - s2) * h * m[i + 1];
}
const kf = (K, t, e = ease.inOutSine) => {   // keyframes [[t, v|array]] with easing per segment
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, v0] = K[i], [t1, v1] = K[i + 1];
    if (t <= t1) { const s = e((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], s)) : lerp(v0, v1, s); }
  }
  return K[K.length - 1][1];
};

// ================================================================== PAPER: fibre tile (normal + albedo detail)
function fibreTile(seed = 5, N = 1024) {   // 1024² tile = 6.4 cm (160 px/cm): machine-direction fibres, felt, a few long hairs
  const r = rng(seed);
  const c = canvas(N, N), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
  const strokeWrapped = (fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  for (let k = 0; k < 9000; k++) {
    const x = r() * N, y = r() * N, L = 6 + Math.pow(r(), 2) * 60, a = (r() - 0.5) * 1.2 + (r() < 0.25 ? Math.PI / 2 : 0), bend = (r() - 0.5) * 0.6;
    const light = r() < 0.5, al = 0.05 + r() * 0.12;
    if (x > 70 && x < N - 70 && y > 70 && y < N - 70) {
      g.strokeStyle = light ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al})`; g.lineWidth = 0.8 + r() * 1.4;
      g.beginPath(); g.moveTo(x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2); g.quadraticCurveTo(x + Math.cos(a + 1.57) * L * bend, y + Math.sin(a + 1.57) * L * bend, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2); g.stroke();
    } else strokeWrapped(() => { g.strokeStyle = light ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al})`; g.lineWidth = 0.8 + r() * 1.4;
      g.beginPath(); g.moveTo(x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2); g.lineTo(x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2); g.stroke(); });
  }
  const im = g.getImageData(0, 0, N, N), d = im.data;
  const Nz = TX.makeNoise(seed + 3);
  const hgt = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; hgt[i] = d[i * 4] / 255 + 0.25 * Nz.fbm(x / N, y / N, 16, 3, 0.5);
  }
  const nc = canvas(N, N), ng = nc.getContext('2d'), ni = ng.createImageData(N, N), nd = ni.data;
  const ac = canvas(N, N), ag = ac.getContext('2d'), ai = ag.createImageData(N, N), ad = ai.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, xl = (x + N - 1) % N, xr = (x + 1) % N, yu = (y + N - 1) % N, yd = (y + 1) % N;
    const nx = -(hgt[y * N + xr] - hgt[y * N + xl]) * 1.6, ny = (hgt[yd * N + x] - hgt[yu * N + x]) * 1.6, l = 1 / Math.hypot(nx, ny, 1);
    nd[i * 4] = (nx * l * 0.5 + 0.5) * 255; nd[i * 4 + 1] = (ny * l * 0.5 + 0.5) * 255; nd[i * 4 + 2] = (l * 0.5 + 0.5) * 255; nd[i * 4 + 3] = 255;
    const v = 128 + (hgt[i] - 0.5) * 70; ad[i * 4] = ad[i * 4 + 1] = ad[i * 4 + 2] = clamp(v, 0, 255); ad[i * 4 + 3] = 255;
  }
  ng.putImageData(ni, 0, 0); ag.putImageData(ai, 0, 0);
  return { normal: ctex(nc, { srgb: false, wrap: true }), albedoCanvas: ac };
}

// ================================================================== PROP_MAP: drawing (vector list, rendered at any scale)
// Everything is drawn from one deterministic description so the macro patch (S047) shows the very same strokes.
function mapDrawing() {
  const r = rng(1893), N = TX.makeNoise(1893);
  const ops = [];               // {k:'line', pts:[[x,y]...], w, c, a} · {k:'poly', pts, fill, a} · {k:'dot', x, y, rad, c, a}
  const INK = '62,44,30', INK2 = '44,32,24';
  const vill = [];              // village house rectangles (for masking hachures)
  // ---- land height field (cm units → arbitrary height). Review: spurs and ravines run down to the coast (the old field was
  //      one long ridge parallel to the coast + fbm rings); a narrow coastal plain that widens behind both villages; a
  //      river valley that follows the drawn river (it used to run against it); the S047 hill north-east of the S021 line.
  const RIV = { x0: coastX(52.4) + 0.1, x1: 70, y0: 52.4, y1: 44.5 };
  const riverY = (x) => { const t = clamp((x - RIV.x0) / (RIV.x1 - RIV.x0), 0, 1);
    return lerp(RIV.y0, RIV.y1, Math.pow(t, 1.25)) + 0.75 * Math.sin(t * 15.0 + 0.5) * (1 - 0.5 * t) + 0.3 * Math.sin(t * 37.0 + 1.1); };
  const PEAKS = [[57, 21, 4.6, 95, 80], [46, 7, 3.4, 45, 40], [75, 35, 4.2, 130, 85], [67, 63, 3.3, 85, 50],
    [83, 11, 3.2, 60, 60], [86, 52, 3.0, 70, 90], [39, 24, 1.6, 22, 18], [44, 45, 1.5, 30, 14]];
  const H = (x, y) => {
    const dist = landD(x, y);                                    // integration: signed distance to the turning shore
    if (dist < 0) return 0;
    const plainW = 2.6 + 8.2 * Math.exp(-((y - 56.6) ** 2) / 20) + 1.6 * Math.exp(-((y - 37.7) ** 2) / 5);
    const rise = smoothstep(plainW, plainW + 9, dist);
    let h = 0.9 * rise + 0.9 * smoothstep(18, 46, dist);
    for (const [px, py, A, sx, sy] of PEAKS) h += 0.75 * A * Math.exp(-(((x - px) ** 2) / sx + ((y - py) ** 2) / sy));
    // ridge network: sharpened ridged noise (connected crests, spurs running down to the coast, ravines between)
    const rg = N.ridged(x / 90 + 0.09 * N.fbm(x / 90, y / 70, 3, 2), y / 70 + 0.05 * N.fbm(x / 90 + 0.3, y / 70, 3, 2), 3, 3, 4);
    h += 2.1 * rg * rg * smoothstep(plainW + 1, plainW + 10, dist) * (0.6 + 0.4 * smoothstep(-0.3, 0.4, N.fbm(x / 90 + 0.5, y / 70, 2, 2)));
    h += 0.3 * N.fbm(x / 90, y / 70, 6, 4, 0.5);
    if (x > RIV.x0 - 1) h -= 1.1 * Math.exp(-((y - riverY(x)) ** 2) / 12) * smoothstep(plainW - 1, plainW + 6, dist);   // river valley
    return 2.5 * Math.max(0, h * smoothstep(0.4, 2.6, dist));
  };
  const inVillage = (x, y) => vill.some((b) => x > b[0] - 0.5 && x < b[2] + 0.5 && y > b[1] - 0.5 && y < b[3] + 0.5);
  // ---- villages (built first: hachures avoid them)
  // S044 fishing village: 4 rows of house outlines on the flat plain behind the beach; the lowest row sits on the S044 line
  const vx0 = coastX(S044.lineY) + 2.4;
  const inkY = S044.lineY - 0.31;                       // ink centre line (ruler edge − gap − ½ width)
  const rows = [inkY - 4.2, inkY - 2.8, inkY - 1.4, inkY];
  const houses = [];
  rows.forEach((ry, ri) => {
    let x = vx0 + 0.5 + (3 - ri) * 0.35 + r() * 0.4;
    const n = 6 + ri;
    for (let k = 0; k < n; k++) {
      // integration: an organic fishing village (it read as a grid of boxes): varied sizes and angles, gaps, a lane; the lowest
      // row stays on the line (the line cuts through it)
      const w = 0.5 + r() * 0.55, d = 0.42 + r() * 0.3, a = (r() - 0.5) * (ri === 3 ? 0.22 : 0.6), skip = ri < 3 && r() < 0.22;
      if (!skip) houses.push({ x, y: ry + (r() - 0.5) * (ri === 3 ? 0.08 : 0.55), w, d, a });
      x += w + 0.15 + r() * 0.6 + (k === 2 ? 0.7 : 0);          // a lane
    }
  });
  for (const hs of houses) vill.push([hs.x - hs.w / 2, hs.y - hs.d / 2, hs.x + hs.w / 2, hs.y + hs.d / 2]);
  // S021 harbour-village mark: a compact cluster on the shore with a short jetty into the sea
  const hm = { x: coastX(S021.markY) + 0.35, y: S021.markY };
  const markHouses = [[-0.05, -0.42], [0.38, -0.38], [0.0, 0.02], [0.42, 0.06], [0.14, 0.46], [0.66, -0.12], [0.58, 0.42], [0.82, 0.2]];
  for (const [dx, dy] of markHouses) vill.push([hm.x + dx - 0.2, hm.y + dy - 0.17, hm.x + dx + 0.2, hm.y + dy + 0.17]);

  // ---- hachures. Review: jittered fall-line strokes (stratified 1.5 mm cells, no contour rows → no banding or moiré at
  //      16–25 px/cm), tapered from the uphill end, width/alpha/density ∝ slope (Lehmann-ish: steep = dark, crests and plain
  //      white); each stroke bends once along the fall line. Drawn as filled wedges ('hach2' op).
  const step = 0.07, nx = Math.ceil(MAPW / step), ny = Math.ceil(MAPH / step);
  const grid = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) grid[j * (nx + 1) + i] = H(i * step, j * step);
  const Gi = (i, j) => grid[clamp(j, 0, ny) * (nx + 1) + clamp(i, 0, nx)];
  const hAt = (x, y) => { const fx = x / step, fy = y / step, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    return lerp(lerp(Gi(i, j), Gi(i + 1, j), u), lerp(Gi(i, j + 1), Gi(i + 1, j + 1), u), v); };
  const grad = (x, y) => { const e = step; return [(hAt(x + e, y) - hAt(x - e, y)) / (2 * e), (hAt(x, y + e) - hAt(x, y - e)) / (2 * e)]; };
  const hach = [];
  const cell = 0.1;
  const GP = (() => { const rq = rng(77), gs = []; for (let k = 0; k < 24000; k++) { const x = 3 + rq() * 84, y = 3 + rq() * 64; if (hAt(x, y) > 0.03) gs.push(Math.hypot(...grad(x, y))); }
    gs.sort((a, b) => a - b); const q = (f) => gs[Math.floor(f * (gs.length - 1))]; return { p15: q(0.15), p30: q(0.3), p95: q(0.95) }; })();
  for (let j = 0; j < MAPH / cell; j++) for (let i = 0; i < MAPW / cell; i++) {
    const px = (i + 0.25 + 0.5 * r()) * cell, py = (j + 0.25 + 0.5 * r()) * cell, rr = r(), rl = r(), rw = r();   // moderate jitter: even spacing, no lattice
    if (px < 2.7 || px > MAPW - 2.7 || py < 2.7 || py > MAPH - 2.7) continue;
    if (hAt(px, py) <= 0.03) continue;
    const [gx, gy] = grad(px, py), gm = Math.hypot(gx, gy);
    const tg = smoothstep(GP.p30, GP.p95, gm);                                     // slope → ink weight across the slope distribution (p30 … p95)
    if (gm < GP.p15 * 0.8 || rr > smoothstep(GP.p15 * 0.8, GP.p30 * 1.2, gm)) continue;
    if (inVillage(px, py)) continue;
    const L = 0.3 * (0.9 + 0.2 * rl) * (1.15 - 0.3 * smoothstep(0.5, 2.5, gm));   // straight pen dashes, shorter where steep
    const ux = -gx / gm, uy = -gy / gm;
    const mx = px + ux * L * 0.5, my = py + uy * L * 0.5, ex = px + ux * L, ey = py + uy * L;
    if (landD(ex, ey) < 1.2 || inVillage(ex, ey)) continue;
    const w = lerp(0.002, 0.026, Math.pow(tg, 1.3)) * (0.85 + 0.3 * rw), a = 0.55 + 0.4 * tg;
    hach.push([px, py, mx, my, ex, ey, w, a]);
  }
  if (new URLSearchParams(location.search).has('mopts')) { const gs = []; for (let k = 0; k < 20000; k++) { const x = 3 + r() * 84, y = 3 + r() * 64; if (hAt(x, y) > 0.03) gs.push(Math.hypot(...grad(x, y))); } gs.sort((a, b) => a - b); console.warn('[map_office] gm pct', [0.1, 0.3, 0.5, 0.7, 0.9, 0.97].map((q) => gs[Math.floor(q * gs.length)].toFixed(2)).join(' '), 'n', hach.length, JSON.stringify(GP)); }
  ops.push({ k: 'hach2', list: hach, c: '84,60,40' });   // hachures in a lighter brown than the coast and lines
  // ---- the river (from the hills down the valley to the coast just north of the fishing village)
  { const pts = []; for (let k = 0; k <= 160; k++) { const x = lerp(RIV.x1, RIV.x0, k / 160); pts.push([x, riverY(x)]); }
    for (let k = 0; k < pts.length - 1; k += 4) ops.push({ k: 'line', pts: pts.slice(k, k + 5), w: lerp(0.016, 0.06, k / pts.length), c: INK, a: 0.85 }); }
  // ---- coast road: dashed double line behind the beach linking both villages
  { const pts = []; for (let y = 30; y <= 66; y += 0.5) pts.push([coastX(y) + 2.6 + 0.25 * Math.sin(y * 0.4), y]);
    ops.push({ k: 'line', pts, w: 0.018, c: INK, a: 0.55, dash: [0.45, 0.3], off: 0.09 }); ops.push({ k: 'line', pts, w: 0.018, c: INK, a: 0.55, dash: [0.45, 0.3], off: -0.09 }); }
  // ---- coastline + waterlining (sea otherwise blank)
  { const { pts, nrm } = coastPolyline();
    // integration: the sea is washed grey-blue (deeper along the shore, as on a hand-tinted survey sheet), the land stays warm
    // paper; the coastline is a firm sepia line (no longer a black hair), waterlining follows the turning shore
    ops.unshift({ k: 'sea', pts, c: '104,124,140' });
    ops.push({ k: 'line', pts, w: 0.15, c: '74,52,36', a: 0.92 });
    [[0.16, 0.6, 0.022], [0.34, 0.46, 0.019], [0.56, 0.34, 0.016], [0.84, 0.24, 0.014], [1.2, 0.15, 0.012]].forEach(([o, a, w]) =>
      ops.push({ k: 'line', pts: pts.map(([x, y], i) => { const q = o + 0.03 * Math.sin((x + y) * 0.9 + o * 9); return [x + nrm[i][0] * q, y + nrm[i][1] * q]; }), w, c: '70,84,96', a }));
    // beach stipple in front of both villages
    for (let k = 0; k < 1100; k++) { const y = 52.6 + r() * 7.6, x = coastX(y) + 0.15 + Math.pow(r(), 1.4) * 1.9; ops.push({ k: 'dot', x, y, rad: 0.018 + r() * 0.012, c: INK, a: 0.55 }); }
  }
  // ---- houses (outline + diagonal hatch)
  ops.push({ k: 'houses', list: houses, c: INK2 });
  // ---- boats drawn up on the beach (never on the water), bows toward the land
  const boats = [];
  for (let k = 0; k < 6; k++) { const y = 53.6 + k * 1.0 + (r() - 0.5) * 0.3; boats.push({ x: coastX(y) + 0.75 + r() * 0.5, y, L: 0.95 + r() * 0.25, a: (r() - 0.5) * 0.35 }); }
  ops.push({ k: 'boats', list: boats, c: INK2 });
  // ---- S021 mark: filled little blocks + jetty + a tiny ring (harbour light)
  const ring = [-0.7, 0.72];       // integration: the harbour light sits just off the corner of the turning shore (frame ≈ (0.30, 0.60))
  ops.push({ k: 'mark', x: hm.x, y: hm.y, list: markHouses, ring, c: INK2 });
  // ---- neatline
  ops.push({ k: 'rect', x0: 2.0, y0: 2.0, x1: MAPW - 2.0, y1: MAPH - 2.0, w: 0.11, c: INK2, a: 0.9 });
  ops.push({ k: 'rect', x0: 2.35, y0: 2.35, x1: MAPW - 2.35, y1: MAPH - 2.35, w: 0.025, c: INK2, a: 0.8 });
  return { ops, houses, boats, hm, ring, H };
}

// render the drawing into a 2D context: k px/cm, origin offset (ox, oy) cm
function drawOps(g, ops, k, ox = 0, oy = 0, clip = null) {
  const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k;
  const inClip = (x, y, m = 1) => !clip || (x > clip[0] - m && x < clip[2] + m && y > clip[1] - m && y < clip[3] + m);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const minW = 0.75;
  for (const o of ops) {
    if (o.k === 'sea') {                  // integration: grey-blue wash over the bay, deeper along the shore
      const P = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); };
      g.save();
      P(o.pts); g.lineTo(X(-3), Y(MAPH + 3)); g.lineTo(X(-3), Y(o.pts[0][1])); g.closePath();
      g.fillStyle = `rgba(${o.c},0.30)`; g.fill(); g.clip();
      g.lineCap = g.lineJoin = 'round';
      for (const [w, a] of [[3.2, 0.06], [2.0, 0.07], [1.1, 0.08], [0.5, 0.09]]) { P(o.pts); g.strokeStyle = `rgba(${o.c},${a})`; g.lineWidth = w * 2 * k; g.stroke(); }
      g.restore();
    } else if (o.k === 'hach') {
      for (const [x0, y0, x1, y1, w, a] of o.list) {
        if (!inClip(x0, y0)) continue;
        g.strokeStyle = `rgba(${o.c},${a.toFixed(3)})`; g.lineWidth = Math.max(minW * 0.8, w * k);
        g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(lerp(x0, x1, 0.5)) + w * k * 0.15, Y(lerp(y0, y1, 0.5))); g.lineTo(X(x1), Y(y1)); g.stroke();
      }
    } else if (o.k === 'hach2') {
      g.fillStyle = `rgb(${o.c})`;
      const macro = k >= 80;                                                      // S047 patch: sparse printed strokes (no merged 'fur')
      for (const [x0, y0, x1, y1, x2, y2, w0_, a] of o.list) {
        if (!inClip(x0, y0)) continue;
        if (macro) { const hs = Math.sin(x0 * 12.9898 + y0 * 78.233) * 43758.5453; if (hs - Math.floor(hs) > 0.3) continue; }
        const w = macro ? Math.min(w0_, 0.02) * 0.9 + 0.006 : w0_;             // macro: ≈ 0.2 mm printed strokes
        const dx = x2 - x0, dy = y2 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        const w0 = w * 0.5, w1 = w * 0.42, w2 = w * 0.12;                         // tapered wedge, blunt uphill end
        g.globalAlpha = macro ? a * 0.2 : a * 0.27;                              // integration: lighter relief, the line and coast read first
        g.beginPath();
        g.moveTo(X(x0 + nx * w0), Y(y0 + ny * w0)); g.lineTo(X(x1 + nx * w1), Y(y1 + ny * w1)); g.lineTo(X(x2 + nx * w2), Y(y2 + ny * w2));
        g.lineTo(X(x2 - nx * w2), Y(y2 - ny * w2)); g.lineTo(X(x1 - nx * w1), Y(y1 - ny * w1)); g.lineTo(X(x0 - nx * w0), Y(y0 - ny * w0));
        g.fill();
      }
      g.globalAlpha = 1;
    } else if (o.k === 'line') {
      const pts = o.pts; if (!pts.some(([x, y]) => inClip(x, y, 3))) continue;
      g.strokeStyle = `rgba(${o.c},${o.a})`; g.lineWidth = Math.max(minW, o.w * k);
      if (o.dash) g.setLineDash([o.dash[0] * k, o.dash[1] * k]); else g.setLineDash([]);
      g.beginPath();
      pts.forEach(([x, y], i) => {
        let dx = 0, dy = 0;
        if (o.off) { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)], tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty) || 1; dx = -ty / l * o.off; dy = tx / l * o.off; }
        i ? g.lineTo(X(x + dx), Y(y + dy)) : g.moveTo(X(x + dx), Y(y + dy));
      });
      g.stroke(); g.setLineDash([]);
    } else if (o.k === 'dot') {
      if (!inClip(o.x, o.y)) continue;
      g.fillStyle = `rgba(${o.c},${o.a})`; g.beginPath(); g.arc(X(o.x), Y(o.y), Math.max(0.6, o.rad * k), 0, 6.283); g.fill();
    } else if (o.k === 'houses') {
      for (const hs of o.list) {
        if (!inClip(hs.x, hs.y)) continue;
        g.save(); g.translate(X(hs.x), Y(hs.y)); g.rotate(hs.a);
        const w = hs.w * k, d = hs.d * k;
        // integration: a pitched roof in plan — the lee half filled dark, the lit half a light wash, a firm ridge and outline
        g.fillStyle = `rgba(${o.c},0.22)`; g.fillRect(-w / 2, -d / 2, w, d / 2);
        g.fillStyle = `rgba(${o.c},0.82)`; g.fillRect(-w / 2, 0, w, d / 2);
        g.strokeStyle = `rgba(${o.c},0.95)`; g.lineWidth = Math.max(minW, 0.03 * k); g.strokeRect(-w / 2, -d / 2, w, d);
        g.lineWidth = Math.max(minW * 0.8, 0.022 * k); g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.stroke();   // ridge line
        g.restore();
      }
    } else if (o.k === 'boats') {
      for (const b of o.list) {
        if (!inClip(b.x, b.y)) continue;
        g.save(); g.translate(X(b.x), Y(b.y)); g.rotate(b.a);
        const L = b.L * k, W = 0.3 * k;
        g.strokeStyle = `rgba(${o.c},0.95)`; g.lineWidth = Math.max(minW, 0.025 * k);
        g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -W, L / 2, 0); g.quadraticCurveTo(0, W, -L / 2, 0); g.stroke();
        g.lineWidth = Math.max(minW * 0.7, 0.012 * k); g.beginPath(); g.moveTo(-L * 0.3, 0); g.lineTo(L * 0.32, 0); g.stroke();
        g.restore();
      }
    } else if (o.k === 'mark') {
      if (!inClip(o.x, o.y, 2)) continue;
      // integration: a village that reads at S021's distance — pitched-roof blocks, a jetty and a firm harbour-light ring + dot
      for (const [dx, dy] of o.list) {
        const x = X(o.x + dx * 1.25), y = Y(o.y + dy * 1.25), w = 0.42 * k, d = 0.32 * k;
        g.fillStyle = `rgba(${o.c},0.35)`; g.fillRect(x - w / 2, y - d / 2, w, d / 2);
        g.fillStyle = `rgba(${o.c},0.95)`; g.fillRect(x - w / 2, y, w, d / 2);
        g.strokeStyle = `rgba(${o.c},0.95)`; g.lineWidth = Math.max(minW, 0.035 * k); g.strokeRect(x - w / 2, y - d / 2, w, d);
      }
      g.strokeStyle = `rgba(${o.c},0.95)`; g.lineWidth = Math.max(minW, 0.08 * k);
      const [rx, ry] = o.ring;
      g.beginPath(); g.moveTo(X(o.x - 0.05), Y(o.y + 0.3)); g.lineTo(X(o.x + rx * 0.72), Y(o.y + ry * 0.66)); g.stroke();      // jetty into the bay
      g.lineWidth = Math.max(minW, 0.06 * k); g.beginPath(); g.arc(X(o.x + rx), Y(o.y + ry), 0.3 * k, 0, 6.283); g.stroke();   // harbour light: ring + dot
      g.fillStyle = `rgba(${o.c},0.95)`; g.beginPath(); g.arc(X(o.x + rx), Y(o.y + ry), 0.11 * k, 0, 6.283); g.fill();
    } else if (o.k === 'rect') {
      g.strokeStyle = `rgba(${o.c},${o.a})`; g.lineWidth = Math.max(minW, o.w * k);
      g.strokeRect(X(o.x0), Y(o.y0), (o.x1 - o.x0) * k, (o.y1 - o.y0) * k);
    }
  }
}
function paperBase(g, W, H, k, ox, oy, seed, fibreCanvas = null) {
  // low-frequency mottle + slight edge toning, computed at low res and smoothed up
  const lw = Math.ceil(W / 8), lh = Math.ceil(H / 8), lc = canvas(lw, lh), lg = lc.getContext('2d'), li = lg.createImageData(lw, lh), ld = li.data;
  const Nn = TX.makeNoise(seed);
  const base = [226, 214, 184];
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const cx = ox + (x * 8) / k, cy = oy + (y * 8) / k;
    const m = Nn.fbm(cx / MAPW, cy / MAPH, 5, 5, 0.55) * 0.5 + 0.5;
    const e = Math.min(cx, MAPW - cx, cy, MAPH - cy);
    const tone = 0.035 * (m - 0.5) * 2 + 0.05 * smoothstep(2.0, 0.0, e);
    const i = (y * lw + x) * 4;
    ld[i] = base[0] * (1 - tone); ld[i + 1] = base[1] * (1 - tone * 1.15); ld[i + 2] = base[2] * (1 - tone * 1.5); ld[i + 3] = 255;
  }
  lg.putImageData(li, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(lc, 0, 0, lw * 8, lh * 8);
  if (fibreCanvas) {     // macro: visible fibres in the colour too
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.22;
    const tw = 6.4 * k; for (let y = -((oy * k) % tw); y < H; y += tw) for (let x = -((ox * k) % tw); x < W; x += tw) g.drawImage(fibreCanvas, x, y, tw, tw);
    g.restore();
  }
}

// ================================================================== MODULE
export default async function create(ctx) {
  const { cam } = ctx;
  const QS0 = new URLSearchParams(location.search);
  const scene = new THREE.Scene();
  scene.background = hex('#06080c');
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.01, 300);
  const envDesk = envTexture(ctx.renderer, 'candle_interior', { warmth: 1.3 });
  const envGate = envTexture(ctx.renderer, 'moon_exterior', {});

  // Integration pass: film grain comes from the engine only (integer-hash grain, engine/post.js). The old in-scene grain quad
  // is gone; the per-era amount is returned through post (map office 0.040, migrant threshold 0.044).
  const GRAIN_MAP = 0.040, GRAIN_MIG = 0.044;

  // ================================================================ DESK SET
  const desk = new THREE.Group(); desk.name = 'desk'; scene.add(desk);
  const fib = fibreTile(7);
  // ---- map texture (40 px/cm) + macro patch for S047 (100 px/cm)
  const drawing = mapDrawing();
  const KM = 40, MW = MAPW * KM, MH = MAPH * KM;
  const mapCanvas = canvas(MW, MH);
  { const g = mapCanvas.getContext('2d'); paperBase(g, MW, MH, KM, 0, 0, 31); drawOps(g, drawing.ops, KM); }
  const mapTex = ctex(mapCanvas);
  if (new URLSearchParams(location.search).has('mdump')) window.__MO = { mapCanvas, get patchCanvas() { return patchCanvas; } };
  const fibN = fib.normal.clone(); fibN.repeat.set(MAPW / 6.4, MAPH / 6.4); fibN.needsUpdate = true;
  const mapM = new THREE.MeshStandardMaterial({ map: mapTex, normalMap: fibN, normalScale: new THREE.Vector2(0.15, 0.15), roughness: 0.82, metalness: 0 });
  const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(MAPW / 100, MAPH / 100), mapM);
  mapMesh.rotation.x = -Math.PI / 2; mapMesh.position.set(0, TY + 0.0006, 0); mapMesh.receiveShadow = true; desk.add(mapMesh);
  // linen backing edge (2 mm proud of the paper, visible only at the map edge)
  const linen = new THREE.Mesh(new THREE.BoxGeometry(MAPW / 100 + 0.006, 0.0003, MAPH / 100 + 0.006), new THREE.MeshStandardMaterial({ color: hex('#cdbf9f'), roughness: 0.95 }));
  linen.position.set(0, TY + 0.00015, 0); linen.receiveShadow = true; desk.add(linen);
  const PATCH = { x0: S047.cx - 12, y0: S047.lineY - 7, w: 24, h: 14, k: 100 };
  const patchCanvas = canvas(PATCH.w * PATCH.k, PATCH.h * PATCH.k);
  { const g = patchCanvas.getContext('2d'); paperBase(g, patchCanvas.width, patchCanvas.height, PATCH.k, PATCH.x0, PATCH.y0, 31, fib.albedoCanvas);
    drawOps(g, drawing.ops, PATCH.k, PATCH.x0, PATCH.y0, [PATCH.x0, PATCH.y0, PATCH.x0 + PATCH.w, PATCH.y0 + PATCH.h]); }
  const patchTex = ctex(patchCanvas);
  const fibN2 = fib.normal.clone(); fibN2.repeat.set(PATCH.w / 6.4, PATCH.h / 6.4); fibN2.needsUpdate = true;
  const patchMesh = new THREE.Mesh(new THREE.PlaneGeometry(PATCH.w / 100, PATCH.h / 100),
    new THREE.MeshStandardMaterial({ map: patchTex, normalMap: fibN2, normalScale: new THREE.Vector2(0.1, 0.1), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));   // integration: fibre relief low (it read as fur)
  patchMesh.rotation.x = -Math.PI / 2; patchMesh.position.copy(mw(PATCH.x0 + PATCH.w / 2, PATCH.y0 + PATCH.h / 2, TY + 0.0007)); patchMesh.receiveShadow = true; desk.add(patchMesh);
  // ---- teak drafting table
  const teak = TX.mat('teak', { repeat: [1.6, 1], tex: { seed: 41, planks: 4 }, color: hex('#8a6a55') });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.045, 1.1), teak); table.position.set(0.05, TY - 0.0225, 0.0); table.receiveShadow = true; desk.add(table);

  // ---- ebony ruler with brass edges (drawing edge = its −Z long edge)
  const ruler = new THREE.Group(); ruler.name = 'ruler'; desk.add(ruler);
  const RL = 0.62;
  {
    // review: the ruler read as a dead black slab. Ebony keeps its near-black (#1E1A17) but with a visible figure — dark
    // brown streaks and fine pores — so the louvre stripes and the lamp read across it; the brass edges are flush with the top.
    const ebonyT = (() => { const W = 2048, Hh = 96, c = canvas(W, Hh), g = c.getContext('2d'), rr = rng(77); g.fillStyle = '#76604e'; g.fillRect(0, 0, W, Hh);
      for (let k = 0; k < 220; k++) { g.strokeStyle = `rgba(${rr() < 0.55 ? '74,58,46' : '6,5,4'},${0.18 + rr() * 0.35})`; g.lineWidth = 0.6 + rr() * 2.2; const y = rr() * Hh, ph = rr() * 6; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 24) g.lineTo(x, y + 3.5 * Math.sin(x * 0.004 + ph) + 1.2 * Math.sin(x * 0.03 + k)); g.stroke(); }
      for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(4,3,2,${0.3 + rr() * 0.4})`; g.fillRect(rr() * W, rr() * Hh, 2 + rr() * 6, 0.8); }
      return ctex(c); })();
    const ebony = new THREE.MeshStandardMaterial({ map: ebonyT, color: hex('#ffffff'), roughness: 0.28, metalness: 0, envMap: envDesk, envMapIntensity: 1.3 });
    // integration: the brass edges are lit by the lamp (mostly diffuse brass, low metalness) so the drawing edge reads as a bright gold line
    const brassM = new THREE.MeshStandardMaterial({ color: hex('#e8bf78'), roughness: 0.4, metalness: 0.25, envMap: envDesk, envMapIntensity: 1.2 });
    const bevelM = new THREE.MeshStandardMaterial({ color: hex('#f6dcaa'), roughness: 0.32, metalness: 0.35, envMap: envDesk, envMapIntensity: 1.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(RL, RULER.t, RULER.w - 2 * RULER.brass), ebony); body.position.set(0, RULER.t / 2, 0); body.castShadow = body.receiveShadow = true; ruler.add(body);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(RL, RULER.t * 1.0, RULER.brass), brassM);
      e.position.set(0, RULER.t * 0.5, s * (RULER.w / 2 - RULER.brass / 2)); e.castShadow = e.receiveShadow = true; ruler.add(e);
      // polished bevel along the top outer edge (15° toward the paper side): catches the moon stripes as bright dashes
      const bv = new THREE.Mesh(new THREE.BoxGeometry(RL, 0.0006, RULER.brass * 1.25), bevelM);
      bv.rotation.x = s * 0.27; bv.position.set(0, RULER.t - 0.0002, s * (RULER.w / 2 - RULER.brass * 0.55)); ruler.add(bv);
    }
  }
  // ruler placement: drawing (−Z) edge at world z = edgeZ, left end at world x = x0
  const setRuler = (x0, edgeZ) => { ruler.position.set(x0 + RL / 2, TY + 0.0008, edgeZ + RULER.w / 2); ruler.updateMatrixWorld(true); };

  // ---- brass weights (map corners), ink bottle, lamp (out of frame; motivates the warm key)
  {
    const brassW = TX.mat('brass', { tex: { tone: 'then', patina: 0.25, polish: 0.6 }, roughness: 1, metalness: 1, envMap: envDesk, envMapIntensity: 1.2 });
    for (const [mx, my] of [[1.2, 1.2], [MAPW - 1.2, 1.2], [1.2, MAPH - 1.2], [MAPW - 1.2, MAPH - 1.2]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.026, 28), brassW); w.position.copy(mw(mx, my, TY + 0.013)); w.castShadow = w.receiveShadow = true; desk.add(w);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 10), brassW); kn.position.copy(mw(mx, my, TY + 0.03)); desk.add(kn);
    }
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0x9fb0a8, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.35, envMap: envDesk, envMapIntensity: 1.5 });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.05, 24), glassM); bottle.position.set(0.56, TY + 0.025, 0.20); desk.add(bottle);
    const inkIn = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.029, 0.035, 24), new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.1 })); inkIn.position.set(0.56, TY + 0.018, 0.20); desk.add(inkIn);
  }
  // integration: the kerosene lamp is the KEY again (director: the map, the ruler and the wet line read first). It stands on the
  // desk at frame right beyond the map edge, flame ≈ 40 cm up, so it rakes the paper warm but evenly (decay 1, aimed left of
  // centre so the penumbra evens out the near side); the moon through the louvres is only a soft cool accent at upper right.
  const LAMP = V(+(QS0.get('mlx') || 0.78), TY + 0.40, -0.30);
  {
    const brassL = TX.mat('brass', { tex: { tone: 'then', patina: 0.2, polish: 0.7 }, roughness: 1, metalness: 1, envMap: envDesk });
    const font = new THREE.Mesh(new THREE.LatheGeometry([V(0.0, 0), V(0.07, 0.0), V(0.075, 0.02), V(0.05, 0.08), V(0.06, 0.13), V(0.055, 0.17), V(0.02, 0.19), V(0, 0.19)].map((p) => new THREE.Vector2(p.x, p.y)), 32), brassL);
    font.position.set(LAMP.x, TY, LAMP.z); font.castShadow = true; desk.add(font);
    const chim = new THREE.Mesh(new THREE.LatheGeometry([[0.022, 0], [0.034, 0.04], [0.03, 0.08], [0.018, 0.13], [0.018, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 24, 0, Math.PI * 2),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    chim.position.set(LAMP.x, TY + 0.19, LAMP.z); desk.add(chim);
  }

  // ---- moths round the lamp (bible: two or three). The moths stay just outside the desk frames, between the lamp and the
  //      map; only their soft shadows pass over the paper (S021 upper right). Review: the shadow is now a real LAMP shadow —
  //      a per-frame cookie (lampL.map, 256²) with the moths' silhouettes projected through the spot's own frustum — so it
  //      only removes kerosene light (the old multiply decal also darkened the moon stripes, and was too faint to read).
  //      Flame ≈ 2 cm, moth ≈ 44 % of the way to the paper → ×2.3 magnification and a ≈ 2.5 cm penumbra (blurred cookie).
  const MOTH_N = 256, mothCanvas = canvas(MOTH_N, MOTH_N), mothG = mothCanvas.getContext('2d');
  mothG.fillStyle = '#fff'; mothG.fillRect(0, 0, MOTH_N, MOTH_N);
  const mothTex = new THREE.CanvasTexture(mothCanvas); mothTex.colorSpace = THREE.SRGBColorSpace;
  const lampCam = new THREE.PerspectiveCamera(60, 1, 0.05, 3);
  const mothState = { drawn: false };
  function flyMoths(T, on = true) {
    mothG.fillStyle = '#fff'; mothG.fillRect(0, 0, MOTH_N, MOTH_N);
    mothTex.needsUpdate = true;
    if (!on) return;
    lampCam.fov = THREE.MathUtils.radToDeg(2 * lampL.angle) * lampL.shadow.focus; lampCam.position.copy(lampL.position);
    lampCam.lookAt(lampL.target.position); lampCam.updateMatrixWorld(true); lampCam.updateProjectionMatrix();
    const uvOf = (p) => { const q = p.clone().project(lampCam); return [(q.x + 1) / 2 * MOTH_N, (1 - (q.y + 1) / 2) * MOTH_N]; };
    for (let m = 0; m < 2; m++) {           // two moths: one wanders over the frame's upper right, one mostly off frame
      const t = T * (0.95 + 0.22 * m) + 3.1 + 5.7 * m;
      const hit = m === 0
        ? V(0.27 + 0.055 * Math.sin(t * 1.7) + 0.02 * noise1(t * 2.3, 4), TY, -0.06 + 0.06 * Math.cos(t * 1.3) + 0.02 * noise1(t * 3.1, 5))
        : V(0.42 + 0.08 * Math.sin(t * 1.3), TY, -0.16 + 0.07 * Math.cos(t * 1.9));
      const f = 0.3 + 0.04 * Math.sin(t * 2.9);                                      // close to the chimney: large, soft shadows
      const M = LAMP.clone().lerp(hit, f);                                           // the moth itself
      const ray = hit.clone().sub(LAMP).normalize(), side = V().crossVectors(ray, V(0, 1, 0)).normalize();
      const head = Math.atan2(ray.x, ray.z) + 0.6 * Math.sin(t * 3.7);
      const span = 0.016 * (0.55 + 0.45 * Math.abs(Math.sin(T * 2 * Math.PI * (9.3 + m))));   // half wingspan, flapping
      const c = uvOf(M), e = uvOf(M.clone().addScaledVector(side, span));
      let r = Math.hypot(e[0] - c[0], e[1] - c[1]);
      const blur = r * 0.5;                                                          // penumbra (2 cm flame × (1 − f) / f at the paper)
      const dark = QS.has('mothdbg') ? 1 : 0.42 * clamp(0.55 + 1.2 * noise1(T * 0.7, 9 + m), 0.25, 1);   // integration: a faint passing shadow, not a stain
      mothG.save(); mothG.filter = `blur(${blur.toFixed(1)}px)`; mothG.translate(c[0], c[1]); mothG.rotate(head);
      mothG.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
      mothG.beginPath(); mothG.ellipse(-r * 0.45, 0, r * 0.55, r * 0.42, -0.3, 0, 6.283); mothG.ellipse(r * 0.45, 0, r * 0.55, r * 0.42, 0.3, 0, 6.283); mothG.fill();
      mothG.beginPath(); mothG.ellipse(0, 0, r * 0.14, r * 0.6, 0, 0, 6.283); mothG.fill();
      mothG.restore();
      if (QS.has('mothdbg')) console.warn('moth', m, 'hit frame', toFrame(hit), 'uv', c.map((v) => v.toFixed(1)).join(','), 'r', r.toFixed(1));
    }
  }

  // ---- lights (desk)
  const lampL = new THREE.SpotLight(K2200, 2.0, 0, 0.95, 0.9, 1);
  lampL.position.copy(LAMP); lampL.target.position.set(0.0, TY, 0.02); lampL.map = mothTex;
  lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.camera.near = 0.05; lampL.shadow.camera.far = 2.5;
  lampL.shadow.bias = -0.0002; lampL.shadow.normalBias = 0.0035; lampL.shadow.radius = 3;
  scene.add(lampL, lampL.target);
  // moon through vertical louvre boards: bar cookie, light travelling toward frame lower-left (−X, +Z), 38° elevation
  const louvre = (() => {
    const W = 1024, c = canvas(W, W), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    const n = 13, per = W / n;                       // integration: ≈ 8 cm pitch (≈ 10 across S021), penumbra ≈ ⅓ pitch
    g.filter = 'blur(11px)';
    g.fillStyle = '#fff';
    for (let k = -1; k <= n; k++) g.fillRect(k * per + per * 0.28, -40, per * 0.44, W + 80);
    g.filter = 'none';
    const t = ctex(c, { srgb: true }); return t;
  })();
  const MOON_DIR = V(-0.70, -0.60, 0.40).normalize();
  const moonL = new THREE.SpotLight(MOON, 1.0, 0, 0.075, +(QS0.get('mpen') || 1.0), 0);   // integration: a soft accent pool at the frame's upper right
  moonL.map = louvre;
  moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024); moonL.shadow.camera.near = 4.0; moonL.shadow.camera.far = 7.5;
  moonL.shadow.bias = -0.0002; moonL.shadow.normalBias = 0.002; moonL.shadow.radius = 2;
  scene.add(moonL, moonL.target);
  const aimMoon = (target, I) => { moonL.target.position.copy(target); moonL.position.copy(target).addScaledVector(MOON_DIR, -6); moonL.intensity = I; moonL.target.updateMatrixWorld(); };
  const hemi = new THREE.HemisphereLight(hex('#5c6870'), hex('#2e2a24'), +(QS0.get('mhemi') || 0.55)); scene.add(hemi);   // moonlit lime-wash walls: cool grey fill (shadow side stays readable)
  const deskLights = [lampL, moonL];

  // ================================================================ INK LINES (procedural wet iron-gall strip)
  const noiseT = TX.noiseTexture();
  function makeInk(len, seed, width = LINE_W) {
    const halfW = width / 2, geoHalf = halfW * 2.2;
    const geo = new THREE.PlaneGeometry(len + 2 * geoHalf * (new URLSearchParams(location.search).has('inkdbg') ? 4 : 1), 2 * geoHalf * (new URLSearchParams(location.search).has('inkdbg') ? 4 : 1), 64, 1);
    const U = { uEnd: { value: 0 }, uLen: { value: len }, uHalfW: { value: halfW }, uGeo: { value: geoHalf }, uSeed: { value: seed * 0.137 }, uNoise: { value: noiseT },
      uBleed: { value: 0.35 }, uNib: { value: 1 }, uBump: { value: 0.4 },
      uWet: { value: 0 }, uWetLen: { value: 0.07 }, uGlintX: { value: -9 }, uGlintA: { value: 0 }, uGlintW: { value: 0.012 } };
    const INKDBG = new URLSearchParams(location.search).has('inkdbg');
    if (INKDBG) U.uHalfW.value *= 4, U.uGeo.value *= 4;
    const m = new THREE.MeshStandardMaterial({ color: INKDBG ? hex('#ff0000') : hex(C.ink), emissive: INKDBG ? hex('#ff0000') : hex('#000000'), roughness: 0.34, metalness: 0, envMap: envDesk, envMapIntensity: 0.8, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vInk;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvInk = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec2 vInk; uniform float uEnd, uLen, uHalfW, uGeo, uSeed, uBleed, uNib, uBump; uniform sampler2D uNoise;
        uniform float uWet, uWetLen, uGlintX, uGlintA, uGlintW;
        float inkA; vec2 inkD; float inkXm, inkS, inkEnd, inkN;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float xm = vInk.x * (uLen + 2.0 * uGeo) - uGeo;           // metres along the line (0 = start)
          float ym = (vInk.y - 0.5) * 2.0 * uGeo;                    // metres across (+ = frame up)
          float endm = uEnd * uLen;
          float nA = texture2D(uNoise, vec2(xm * 7.0 + uSeed, uSeed * 3.1)).r;      // slow width wander
          float nB = texture2D(uNoise, vec2(xm * 60.0, ym * 60.0 + uSeed)).b;          // fibre bleed (worley, ≈ 1 mm cells; ≤ 1 texel/px at macro)
          float nF = texture2D(uNoise, vec2(xm * 140.0 + 0.3, ym * 45.0 + uSeed * 2.0)).g;   // fibre runs (≈ 0.25 mm, a little elongated)
          float nC = texture2D(uNoise, vec2(xm * 23.0 + 0.5, uSeed + ym * 9.0)).g;
          float pool = uNib * exp(-max(endm - xm, 0.0) / (2.6 * uHalfW));           // ink pooled at the nib
          float hw = uHalfW * (0.92 + 0.16 * nA + 0.35 * pool);
          float dx = xm < 0.0 ? -xm : (xm > endm ? xm - endm : 0.0);
          float r = length(vec2(dx, ym)) / hw;                                      // 0 centre .. 1 edge (round caps)
          float spikes = smoothstep(0.57, 0.7, nF) * (0.6 + 0.8 * nB);   // noise channels sit at 0.5 ± 0.12
          float bleed = uBleed * (0.6 * nB + 0.4 * nC + 3.2 * spikes);
          inkA = 1.0 - smoothstep(0.8 + 0.1 * bleed, 1.0 + 0.65 * bleed, r);
          if (inkA < 0.02 || endm <= 0.0) discard;
          // iron-gall: darker rim, bluish wet centre
          float rim = smoothstep(0.55, 0.95, r);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.62, 0.7), rim * 0.6);
          diffuseColor.a = inkA * (0.9 + 0.1 * (1.0 - rim));
          // meniscus + beads → slope of the wet surface (for glints)
          float s = clamp(ym / hw, -1.0, 1.0);
          // review: a shallow wet dome (it read as a glossy rod), irregular pooling instead of periodic beads
          float nD = texture2D(uNoise, vec2(xm * 160.0 + uSeed, 0.37)).a;
          float bead = 0.75 + 0.6 * nD + 1.4 * pool;
          float dhdy = -2.0 * s * bead * 0.45;                                      // across (tangent-space y = frame up)
          float dhdx = 0.9 * (texture2D(uNoise, vec2(xm * 160.0 + uSeed + 0.004, 0.37)).a - nD) / 0.004 * 0.28 * (1.0 - s * s) - pool * 1.2 * sign(xm - endm) * (1.0 - s * s);
          inkD = vec2(uBump * 2.2 * dhdx, uBump * dhdy) * smoothstep(1.0, 0.7, r);   // shallow across, beads + pooled end along
          inkXm = xm; inkS = s; inkEnd = endm; inkN = nD;
        }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // integration: wet iron-gall sheen — a warm kerosene highlight strip on the lamp side of the dome, strongest at the
          // nib and fading over ≈ 0.8 s of travel behind it, plus one travelling glint (uGlintX, metres along the line)
          float behind = max(inkEnd - inkXm, 0.0);
          float nLow = texture2D(uNoise, vec2(inkXm * 26.0 + uSeed, 0.71)).a;            // ≈ 4 cm wet-pool variation along the line (non-periodic)
          float band = smoothstep(0.34, 0.02, abs(inkS - 0.32)) * (0.3 + 0.7 * smoothstep(0.42, 0.6, nLow));   // a wet sheen with irregular pooling, not a dotted rod highlight
          float wet = uWet * (0.05 + 0.95 * exp(-behind / uWetLen));
          float gl = uGlintA * exp(-pow((inkXm - uGlintX) / uGlintW, 2.0));
          totalEmissiveRadiance += vec3(1.0, 0.76, 0.5) * (wet + gl) * band * 0.9;
        }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 tX = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz), tY = normalize((viewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
          normal = normalize(normal - inkD.x * tX - inkD.y * tY);
        }`);
    };
    m.customProgramCacheKey = () => 'inkStrip7';
    const mesh = new THREE.Mesh(geo, m); mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true; mesh.renderOrder = 3;
    mesh.userData.U = U; mesh.userData.len = len; mesh.userData.geoHalf = geoHalf;
    return mesh;
  }
  // a line from world (x0, z) of length len; set progress via setInk(mesh, xEnd)
  const inkLine = (x0, z, len, seed, width = LINE_W) => { const m = makeInk(len, seed, width); m.position.set(x0 + len / 2, TY + 0.00085, z); desk.add(m); m.userData.x0 = x0; return m; };
  const setInk = (m, xEnd, nib = 1) => { m.userData.U.uEnd.value = clamp((xEnd - m.userData.x0) / m.userData.len, 0, 1); m.userData.U.uNib.value = nib; };
  const setGlint = (m, { wet = 1, wetLen = 0.07, glintX = -9, glint = 0, glintW = 0.012 } = {}) => { const U = m.userData.U;   // glintX: world x
    U.uWet.value = wet; U.uWetLen.value = wetLen; U.uGlintX.value = glintX - m.userData.x0; U.uGlintA.value = glint; U.uGlintW.value = glintW; };

  // ================================================================ RULING PEN
  const pen = new THREE.Group(); pen.name = 'pen';        // origin = nib tip, +Y = toward the handle top, ±X = the two blades
  {
    const steel = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: 0.95, roughness: 0.25, envMap: envDesk, envMapIntensity: 1.5 });   // integration: polished steel (it read as a white plastic tube)
    const ebonyH = new THREE.MeshStandardMaterial({ color: 0x141110, roughness: 0.3, envMap: envDesk, envMapIntensity: 0.7 });
    const blade = (s) => {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.0032, 0.010, 0.0028, 0.022); sh.lineTo(0.0022, 0.034); sh.lineTo(-0.0022, 0.034); sh.lineTo(-0.0028, 0.022); sh.quadraticCurveTo(-0.0032, 0.010, 0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.0006, bevelEnabled: false, curveSegments: 6 }); g.rotateY(Math.PI / 2); g.translate(s * 0.00025 + (s < 0 ? -0.0006 : 0), 0, 0);
      const m = new THREE.Mesh(g, steel); m.rotation.z = s * 0.035; m.castShadow = true; return m;
    };
    pen.add(blade(1), blade(-1));
    const inkBead = new THREE.Mesh(new THREE.SphereGeometry(0.0009, 10, 8), new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.08, envMap: envDesk })); inkBead.scale.set(0.6, 2.4, 1.6); inkBead.position.set(0, 0.0032, 0); pen.add(inkBead);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.009, 8), steel); screw.rotation.z = Math.PI / 2; screw.position.set(0, 0.017, 0); pen.add(screw);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0022, 16), steel); nut.rotation.z = Math.PI / 2; nut.position.set(0.0034, 0.017, 0); nut.castShadow = true; pen.add(nut);
    const fer = new THREE.Mesh(new THREE.CylinderGeometry(0.0033, 0.0029, 0.012, 16), steel); fer.position.set(0, 0.040, 0); fer.castShadow = true; pen.add(fer);
    const hdl = new THREE.Mesh(new THREE.LatheGeometry([[0.0033, 0], [0.0040, 0.03], [0.0042, 0.06], [0.0034, 0.088], [0.0012, 0.094]].map(([x, y]) => new THREE.Vector2(x, y)), 16), ebonyH);
    hdl.position.set(0, 0.046, 0); hdl.castShadow = true; pen.add(hdl);
  }
  desk.add(pen);
  const PEN_GRIP = 0.036;                 // pinch point (thumb/index pads) above the nib along the pen axis

  // ================================================================ MAPHAND hands (close-up) + frock-coat sleeves
  const handR = await loadCharacterHand('MAPHAND', 'R', { lod: 'close' });
  const handL = await loadCharacterHand('MAPHAND', 'L', { lod: QS0.get('mhl') || 'macro' });   // integration: macro sculpt — the close LOD's nail trenches read as black marks at S044's end
  desk.add(handR.root, handL.root);
  const woolM = TX.mat('wool_coat', { repeat: [2, 2], color: hex('#3a3634') });
  function addSleeve(h, seed) {           // tapered, softly creased frock-coat sleeve continuing the hand's cuff stub up to the elbow
    const g = new THREE.CylinderGeometry(0.066, 0.054, 0.42, 28, 24, true);
    const p = g.attributes.position, Nn = TX.makeNoise(seed);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y + 0.21) / 0.42;
      const k = 1 + 0.035 * Nn.n(a * 1.3 + 3, t * 5, 64, 64) + 0.02 * Math.sin(a * 5 + t * 9) * smoothstep(0.3, 1.0, t);
      p.setXYZ(i, x * k * 0.88, y, z * k);
    }
    g.computeVertexNormals(); g.translate(0, 0.21 + 0.125, 0);
    const m = new THREE.Mesh(g, woolM); m.castShadow = true; m.receiveShadow = true;
    (h.byName.forearm || h.root).add(m);
    return m;
  }
  addSleeve(handR, 3); addSleeve(handL, 4);
  for (const h of [handR, handL]) h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // generic hand placement: rotate the hand (root at identity first) so that reference directions a0→at, b0→bt (b orthogonalised),
  // then translate so the reference point p0 lands on pt. refs(h) returns { p, a, b } in world space for the current root.
  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  function basis(a, b) { const A = a.clone().normalize(), B = b.clone().addScaledVector(A, -b.dot(A)).normalize(), Cc = new THREE.Vector3().crossVectors(A, B); return new THREE.Matrix4().makeBasis(A, B, Cc); }
  function placeHand(h, refs, pt, at, bt) {
    h.root.position.set(0, 0, 0); h.root.quaternion.identity(); h.root.updateMatrixWorld(true);
    const r0 = refs(h);
    const R = basis(at, bt).multiply(basis(r0.a, r0.b).transpose());
    h.root.quaternion.setFromRotationMatrix(R); h.root.updateMatrixWorld(true);
    const r1 = refs(h);
    h.root.position.add(pt.clone().sub(r1.p)); h.root.updateMatrixWorld(true);
  }
  // pen hand: pen in the 'pen' socket, rolled by `roll` about its axis; place so the nib is at `nib` with pen axis `axis` and blades across `across`
  const penRefs = (h) => {
    h.root.updateMatrixWorld(true);
    const p = pen.localToWorld(V(0, 0, 0)), top = pen.localToWorld(V(0, 0.1, 0)), side = pen.localToWorld(V(0.01, 0, 0));
    return { p, a: top.sub(p), b: side.sub(p) };
  };
  let penGrip = PEN_GRIP;
  // Review: a ruling-pen tripod grip. The library 'write' preset + 'pen' socket put the pen through the midpoint of the
  // thumb and index pads, which sit ≈ 6 cm apart: the pen floated in the gap and, from above, the index lay over the nib.
  // Here the shaft runs from just beyond the index pad (pad on the shaft) back into the thumb web, and the thumb is
  // solved once so its pad meets the shaft 1.5 cm behind the index pad. The ring and little fingers tuck.
  const penSock = new THREE.Object3D(); penSock.name = 'socket_rulingpen'; handR.byName.wrist.add(penSock);
  const IDX = handR.dims.F.find((f) => f.name === 'index');
  function rulingFrame() {        // → { contact, dir } in wrist space for the current channels
    const wr = handR.byName.wrist; handR.root.updateMatrixWorld(true);
    const inv = wr.matrixWorld.clone().invert();
    const b3 = handR.fingerBones.index[2];
    const pad = handR.tip('index', V()).applyMatrix4(inv), ax = b3.localToWorld(V(0, -IDX.len[2] * 0.7, 0)).applyMatrix4(inv);
    const contact = pad.clone().addScaledVector(pad.clone().sub(ax).normalize(), 0.004);
    const D = handR.dims, web = V(0.03 * handR.mir * D.tf, -0.066 * D.s, 0.033 * D.wf);
    return { contact, dir: web.sub(contact).normalize() };
  }
  const RULE = (() => {
    const base = { wrist: [-0.15, 0.1], thumb: [0.45, 0.45, 0.22, 0.15, 0.3], index: [0.34, 0.36, 0.14, 0.02], middle: [0.5, 0.78, 0.38, 0.0], ring: [0.85, 1.15, 0.5, -0.02], little: [0.95, 1.2, 0.5, -0.05] };
    let best = base, bd = 1e9;
    handR.root.position.set(0, 0, 0); handR.root.quaternion.identity();
    for (const tf of [0.35, 0.5, 0.65, 0.8, 0.95]) for (const ta of [0.2, 0.35, 0.5, 0.65]) for (const tm of [0.1, 0.25, 0.4, 0.55]) {
      const ch = { ...base, thumb: [tf, ta, tm, 0.2, 0.3] };
      handR.setChannels(ch);
      const { contact, dir } = rulingFrame(), q = contact.clone().addScaledVector(dir, 0.015);
      const tp = handR.tip('thumb', V()).applyMatrix4(handR.byName.wrist.matrixWorld.clone().invert());
      const d = Math.abs(tp.distanceTo(q) - 0.007);
      if (d < bd) { bd = d; best = ch; }
    }
    if (QS0.has('mopts')) console.warn('[map_office] RULE thumb', best.thumb.join(','), 'err', bd.toFixed(4));
    return best;
  })();
  function penHand(nib, axis, across, roll = 0, pose = null) {
    if (pose) handR.pose(pose); else handR.setChannels(RULE);
    { const { contact, dir } = rulingFrame(); penSock.position.copy(contact); penSock.quaternion.setFromUnitVectors(V(0, 1, 0), dir); }
    if (pen.parent !== penSock) penSock.add(pen);
    pen.position.set(0, -penGrip, 0); pen.rotation.set(0, roll, 0); pen.updateMatrixWorld(true);
    placeHand(handR, penRefs, nib, axis, across);
  }
  // the roll of the pen in the fingers that puts the back of the hand up (palm toward `palmWant`) — solved once per set-up
  const rollCache = new Map();
  function bestRoll(key, axis, across, palmWant, pose = null) {
    if (rollCache.has(key)) return rollCache.get(key);
    let best = 0, bd = -2;
    for (let i = 0; i < 48; i++) {
      const th = (i / 48) * Math.PI * 2;
      penHand(V(0, TY, 0), axis, across, th, pose);
      const n = V(0, 1, 0).applyQuaternion(handR.sockets.palm.getWorldQuaternion(new THREE.Quaternion()));
      const d = n.dot(palmWant.clone().normalize());
      if (d > bd) { bd = d; best = th; }
    }
    rollCache.set(key, best); dbg('roll', key, best.toFixed(2), bd.toFixed(2));
    return best;
  }
  // free hand by the palm socket (+Y out of the palm) and the finger direction
  const palmRefs = (h) => {
    h.root.updateMatrixWorld(true);
    const s = h.sockets.palm; const p = s.getWorldPosition(V());
    const n = V(0, 1, 0).applyQuaternion(s.getWorldQuaternion(new THREE.Quaternion()));
    const f = h.tip('middle', V()).sub(h.root.getWorldPosition(V()));
    return { p, a: n, b: f };
  };
  const tipRefs = (name) => (h) => {
    h.root.updateMatrixWorld(true);
    const s = h.sockets.palm; const n = V(0, 1, 0).applyQuaternion(s.getWorldQuaternion(new THREE.Quaternion()));
    const p = h.tip(name, V()); const f = p.clone().sub(h.root.getWorldPosition(V()));
    return { p, a: n, b: f };
  };
  const PEN_PALM = V(-0.55, -0.8, 0.1);   // writing hand: palm faces the paper and the body's midline
  const PRESS = { wrist: [-0.30, 0], thumb: [-0.55, -0.3, -0.05, 0.02, 0.1], index: [0.0, 0.03, 0.01, 0.17], middle: [0.0, 0.03, 0.01, 0.02], ring: [0.0, 0.04, 0.02, -0.13], little: [0.02, 0.05, 0.03, -0.28] };
  // S021 press below the ruler: fingers spread but the thumb kept near the index so no digit reaches the wet line
  const PRESS21 = { wrist: [-0.28, 0], thumb: [-0.18, -0.12, -0.02, 0.02, 0.1], index: [0.0, 0.03, 0.01, 0.12], middle: [0.0, 0.03, 0.01, 0.02], ring: [0.0, 0.04, 0.02, -0.1], little: [0.02, 0.05, 0.03, -0.22] };
  const HOLD_RULER = { wrist: [-0.05, 0.05], thumb: [0.15, 0.1, 0.1, 0.12, 0.2], index: [0.28, 0.42, 0.22, 0.06], middle: [0.3, 0.46, 0.25, 0.0], ring: [0.36, 0.55, 0.3, -0.05], little: [0.45, 0.62, 0.33, -0.12] };
  const blendCh = (a, b, t) => { const o = {}; for (const k of Object.keys(a)) o[k] = a[k].map((x, i) => lerp(x, b[k][i], t)); return o; };
  // left hand: fingertips on the ruler (hold) → lift, travel over the wet line → spread and pressed flat on the map (press).
  // The move interpolates the PALM socket from where it sits in the hold placement to the press target (no reference jump).
  const HOLD_PALM = V(0.1, -1, 0.2), PRESS_PALM = V(0, -1, 0);
  function leftHand(k, pHold, holdFingers, pPress, pressFingers, press = 0, lift = 0.055, pressPose = PRESS) {
    handL.setChannels(HOLD_RULER);
    placeHand(handL, tipRefs('middle'), pHold, HOLD_PALM, holdFingers);
    if (k <= 0) return;
    const palm0 = handL.sockets.palm.getWorldPosition(V());
    handL.setChannels(blendCh(HOLD_RULER, pressPose, smoothstep(0.05, 0.85, k)));
    const e = ease.inOutCubic(k);
    const p = palm0.clone().lerp(pPress, e); p.y += Math.sin(Math.PI * k) * lift - press;
    placeHand(handL, palmRefs, p, HOLD_PALM.clone().lerp(PRESS_PALM, e), holdFingers.clone().lerp(pressFingers, e));
  }

  // ================================================================ THRESHOLD SET (S048) at O48 — built in its own group
  const O48 = V(40, 0, 0);
  const gate = new THREE.Group(); gate.name = 'gate'; gate.position.copy(O48); scene.add(gate);
  const G = (x, y, z) => V(x, y, z).add(O48);
  const SILL = { y: 0.045, z0: -0.05, z1: -0.42 };      // threshold block: near edge (iron strip) z0, far edge z1, top y
  {
    const flags = TX.mat('stone', { repeat: [2.5, 2.5], tex: { seed: 9 }, color: hex('#9a958e') });
    const floorN = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), flags); floorN.rotation.x = -Math.PI / 2; floorN.position.set(0, 0, 2.0 + SILL.z0); floorN.receiveShadow = true; gate.add(floorN);
    const floorF = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), flags); floorF.rotation.x = -Math.PI / 2; floorF.position.set(0, SILL.y, SILL.z1 - 1.6); floorF.receiveShadow = true; gate.add(floorF);
    const gran = TX.mat('granite', { repeat: [1.2, 0.25], tex: { seed: 4 }, color: hex('#b3aea6') });
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.6, SILL.y, SILL.z0 - SILL.z1), gran); sill.position.set(0, SILL.y / 2, (SILL.z0 + SILL.z1) / 2); sill.receiveShadow = sill.castShadow = true; gate.add(sill);
    // iron L-angle capping the outer edge: riser plate + top flat, the top worn bright by feet
    const iron = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, metalness: 0.75, roughness: 0.5, envMap: envGate, envMapIntensity: 0.6 });
    const worn = new THREE.MeshStandardMaterial({ color: 0x8c8f93, metalness: 0.9, roughness: 0.28, envMap: envGate, envMapIntensity: 1.0 });
    const riser = new THREE.Mesh(new THREE.BoxGeometry(2.6, SILL.y + 0.002, 0.005), iron); riser.position.set(0, SILL.y / 2, SILL.z0 + 0.0025); riser.castShadow = riser.receiveShadow = true; gate.add(riser);
    const flat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.005, 0.03), iron); flat.position.set(0, SILL.y + 0.0005, SILL.z0 - 0.0125); flat.receiveShadow = true; gate.add(flat);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.0016, 0.006), worn); edge.position.set(0, SILL.y + 0.0031, SILL.z0 - 0.0035); gate.add(edge);
    for (let k = -6; k <= 6; k++) { const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 10), worn); rv.position.set(k * 0.2 + 0.07, SILL.y + 0.0035, SILL.z0 - 0.016); gate.add(rv); }
    // gateway beyond her: rendered wall with the opening to the quay, blue-hour outside
    const wallM = TX.mat('brick_render', { repeat: [2, 1.2], color: hex('#7f7a73') });
    const WZ = -2.6, OW = 2.2, OH = 2.6;
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.5), wallM); w.position.set(s * (OW / 2 + 1.5), 2, WZ); w.receiveShadow = true; gate.add(w); }
    const lint = new THREE.Mesh(new THREE.BoxGeometry(OW, 1.4, 0.5), wallM); lint.position.set(0, OH + 0.7, WZ); gate.add(lint);
    // outside: quay setts, sea band and blue-hour sky (unlit gradient)
    const skyM = new THREE.ShaderMaterial({ uniforms: {}, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ vec3 lo = vec3(0.075, 0.105, 0.19), hi = vec3(0.018, 0.03, 0.07); float t = smoothstep(0.0, 0.6, vUv.y);
        vec3 c = mix(lo, hi, t) + vec3(0.06, 0.045, 0.05) * exp(-vUv.y * 12.0); c = mix(vec3(dot(c, vec3(0.3, 0.55, 0.15))), c, 0.7); gl_FragColor = vec4(c, 1.0); }` });
    const skyP = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), skyM); skyP.position.set(0, 4.6, -24); gate.add(skyP);
    const seaM = new THREE.MeshStandardMaterial({ color: 0x1b2638, roughness: 0.25, metalness: 0, envMap: envGate, envMapIntensity: 1.2 });
    const seaP = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), seaM); seaP.rotation.x = -Math.PI / 2; seaP.position.set(0, -0.6, -17); gate.add(seaP);
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), TX.mat('stone_dark', { repeat: [6, 4], tex: { seed: 3 } })); quay.rotation.x = -Math.PI / 2; quay.position.set(0, SILL.y - 0.02, -6.9); quay.receiveShadow = true; gate.add(quay);
  }
  // queue outside the gate (migrant era crowd, soft)
  const queue = await loadCrowd('migrant', [
    { pos: [-1.6, SILL.y, -4.1], rotY: Math.PI / 2, pose: 'stand', seed: 1 }, { pos: [-0.85, SILL.y, -4.3], rotY: Math.PI / 2 + 0.2, pose: 'stand', seed: 2 },
    { pos: [-0.1, SILL.y, -4.0], rotY: Math.PI / 2 - 0.1, pose: 'stand', seed: 3 }, { pos: [0.7, SILL.y, -4.4], rotY: Math.PI / 2, pose: 'stand', seed: 4 },
    { pos: [1.5, SILL.y, -4.2], rotY: Math.PI / 2 + 0.3, pose: 'stand', seed: 5 }, { pos: [2.6, SILL.y, -5.5], rotY: -Math.PI / 2, pose: 'stand', seed: 6 },
    { pos: [-2.4, SILL.y, -5.8], rotY: Math.PI / 2, pose: 'stand', seed: 2 },
  ]);
  queue.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.material && !Array.isArray(o.material) && o.material.color) o.material = new THREE.MeshLambertMaterial({ color: o.material.color }); } });
  gate.add(queue);
  // MIGRANT (hi) with the close-up right hand on her wrist
  const mig = await loadCharacter('MIGRANT', { lod: 'mid' });   // only legs, hem and arm are seen (soft); the hand is the close-up hand
  gate.add(mig.root);
  const migHandR = await loadCharacterHand('MIGRANT', 'R', { lod: 'close' });
  { const old = mig.hands.R, bone = old.root.parent; migHandR.root.position.copy(old.root.position); migHandR.root.quaternion.copy(old.root.quaternion); migHandR.root.scale.copy(old.root.scale); bone.remove(old.root); bone.add(migHandR.root); mig.hands.R = migHandR; }
  mig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const k of ['head', 'hair']) mig.setLayerVisible(k, false);   // review/perf: never in S048's frames (shoes → hand); their bulb shadow falls outside frame too
  const skinBase = migHandR.skinMat ? migHandR.skinMat.color.clone() : null;
  // PROP_CASE, new state, hanging: local X = long axis (her forward), Y up, Z = thickness (toward camera), origin = handle-bar centre
  const caseG = new THREE.Group(); caseG.name = 'case'; gate.add(caseG);
  const CASE = { L: 0.58, Hh: 0.38, D: 0.21, top: -0.028 };   // top = case top below the bar centre (finger clearance under the bar)
  {
    const ratt = TX.mat('rattan', { repeat: [3.2, 2.1], tex: { seed: 13, age: 0.25 } });
    const rattTop = TX.mat('rattan', { repeat: [3.2, 1.2], tex: { seed: 14, age: 0.25 } });
    const leather = new THREE.MeshStandardMaterial({ color: hex(C.strap), roughness: 0.55 });
    const leatherD = new THREE.MeshStandardMaterial({ color: hex('#4a3322'), roughness: 0.6 });
    const buckleM = TX.mat('brass', { tex: { tone: 'then', patina: 0.1, polish: 0.9 }, roughness: 1, metalness: 1, envMap: envGate, envMapIntensity: 1.6, color: hex('#f0d9a8') });
    const box = (w, h, d, m, x, y, z, p = caseG) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b; };
    const { L, Hh, D, top } = CASE, cy = top - Hh / 2;
    box(L, Hh, D, [ratt, ratt, rattTop, rattTop, ratt, ratt], 0, cy, 0);
    // lid seam (the lid = the camera-side 6 cm) + rim bindings
    box(L + 0.004, Hh + 0.004, 0.012, leatherD, 0, cy, D / 2 - 0.06);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(0.05, 0.05, D + 0.006, leatherD, sx * (L / 2 - 0.022), cy + sy * (Hh / 2 - 0.022), 0);
    // straps round the case (vertical), buckles on the camera face just below the top edge
    // review: straps moved in to ±13.5 cm and buckled just under the top edge, so strap + bright buckle read under the bar in the
    // end frame (shot list endframe); keeper loop below the buckle
    for (const sx of [-0.135, 0.135]) {
      box(0.032, Hh + 0.008, 0.004, leather, sx, cy, D / 2 + 0.002); box(0.032, 0.004, D + 0.008, leather, sx, top + 0.002, 0); box(0.032, Hh + 0.008, 0.004, leather, sx, cy, -D / 2 - 0.002);
      const bk = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0026, 8, 20), buckleM); bk.scale.set(1.15, 0.85, 1); bk.position.set(sx, top - 0.02, D / 2 + 0.006); bk.castShadow = true; caseG.add(bk);
      box(0.0035, 0.024, 0.003, buckleM, sx, top - 0.02, D / 2 + 0.008);
      box(0.038, 0.009, 0.006, leatherD, sx, top - 0.042, D / 2 + 0.005);
    }
    // handle (review): two leather loops at ±68 mm (the museum case's tab positions) pulled taut by the weight — straps from the
    // case top up both sides of the bar and over it, riveted with brass — and a cane bar Ø23 × 150 mm wrapped in a fresh honey
    // rattan strip (≈ 36 helical turns; the old texture ran its bands along the bar, so it read as a wooden dowel)
    const loopM = new THREE.MeshStandardMaterial({ color: hex('#5e3f27'), roughness: 0.5, side: THREE.DoubleSide });
    for (const sx of [-0.068, 0.068]) {
      for (const sz of [-1, 1]) box(0.022, -top - 0.002, 0.0028, loopM, sx, top / 2, sz * 0.0128);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0129, 0.0129, 0.022, 16, 1, true, 0, Math.PI), loopM);
      cap.rotation.z = Math.PI / 2; cap.position.set(sx, 0, 0); cap.castShadow = true; caseG.add(cap);
      for (const sz of [-1, 1]) { const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0015, 10), buckleM); rv.position.set(sx, top + 0.006, sz * 0.0145); rv.rotation.x = sz * Math.PI / 2; caseG.add(rv); }
      box(0.026, 0.0016, 0.036, buckleM, sx, top + 0.0008, 0);   // brass foot plate
    }
    const barT = (() => { const Wu = 256, Hv = 1024, c = canvas(Wu, Hv), g = c.getContext('2d'), rr = rng(66); g.fillStyle = '#6a4626'; g.fillRect(0, 0, Wu, Hv);
      const N = 36, bh = Hv / N;
      for (let k = -1; k <= N; k++) {
        const y0 = k * bh, sh = 0.86 + 0.14 * rr();
        const grd = g.createLinearGradient(0, y0, 0, y0 + bh);
        grd.addColorStop(0, `rgb(${Math.round(150 * sh)},${Math.round(104 * sh)},${Math.round(54 * sh)})`); grd.addColorStop(0.35, `rgb(${Math.round(190 * sh)},${Math.round(140 * sh)},${Math.round(80 * sh)})`);
        grd.addColorStop(0.7, `rgb(${Math.round(178 * sh)},${Math.round(128 * sh)},${Math.round(70 * sh)})`); grd.addColorStop(1, `rgb(${Math.round(140 * sh)},${Math.round(96 * sh)},${Math.round(50 * sh)})`);
        g.save(); g.transform(1, bh / Wu, 0, 1, 0, 0); g.fillStyle = grd; g.fillRect(0, y0 + 0.8, Wu, bh - 1.6);
        for (let f = 0; f < 6; f++) { g.strokeStyle = `rgba(${rr() < 0.5 ? '230,190,120' : '90,60,30'},${0.12 + rr() * 0.18})`; g.lineWidth = 0.8; const yy = y0 + 3 + rr() * (bh - 6); g.beginPath(); g.moveTo(0, yy); g.lineTo(Wu, yy); g.stroke(); }
        g.restore();
      }
      const t = ctex(c, { wrap: true }); return t; })();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.15, 32, 1), new THREE.MeshStandardMaterial({ map: barT, roughness: 0.46, envMap: envGate, envMapIntensity: 0.5 }));
    bar.rotation.z = Math.PI / 2; bar.castShadow = true; caseG.add(bar); caseG.userData.bar = bar;
  }
  // gate lights: enamel-shade bulb overhead (2400 K, shadowed) + cool blue-hour spill from the doorway
  const bulbL = new THREE.SpotLight(K2400, 8.0, 0, 0.95, 0.7, 2);
  bulbL.position.copy(G(0.62, 2.2, 0.32)); bulbL.target.position.copy(G(0.05, 0.35, -0.1));
  bulbL.castShadow = true; bulbL.shadow.mapSize.set(1024, 1024); bulbL.shadow.camera.near = 0.5; bulbL.shadow.camera.far = 4; bulbL.shadow.bias = -0.0002; bulbL.shadow.normalBias = 0.003;
  scene.add(bulbL, bulbL.target);
  const duskL = new THREE.DirectionalLight(DUSK, 0.35); duskL.position.copy(G(-0.5, 2.0, -6)); duskL.target.position.copy(G(0, 0.5, 0)); scene.add(duskL, duskL.target);
  const gateFill = new THREE.HemisphereLight(hex('#4a5a7a'), hex('#3a2c20'), 0.12); scene.add(gateFill);
  const bounceL = new THREE.PointLight(hex('#c79a6a'), 0.42, 1.6, 2); bounceL.position.copy(G(0.1, 0.06, 0.45)); scene.add(bounceL);   // warm floor bounce of the bulb pool
  const gateLights = [bulbL, duskL, gateFill, bounceL];

  // ---- visibility per set
  function useSet(which) {
    const d = which === 'desk';
    desk.visible = d; gate.visible = !d;
    table.visible = linen.visible = false;     // every desk frame lies inside the 90 × 70 cm map: never seen, don't shade it
    mapMesh.visible = true;
    for (const l of deskLights) l.visible = d; hemi.visible = d;
    for (const l of gateLights) l.visible = !d;
    scene.background = d ? hex('#06080c') : hex('#0a0e16');
  }

  // ---- frame helpers (current camera)
  const _ray = new THREE.Raycaster();
  const toPlane = (fx, fy, y = TY) => {
    camera.updateMatrixWorld(true);
    const p = V(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(camera), o = camera.position.clone(), d = p.sub(o).normalize();
    return o.addScaledVector(d, (y - o.y) / d.y);
  };
  const toFrame = (p) => { const q = p.clone().project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2]; };
  const QS = new URLSearchParams(location.search);
  const DBG = QS.has('mopts');
  const OFF = new Set((QS.get('moff') || '').split(',').filter(Boolean));
  const MCAM = QS.get('mcam') ? QS.get('mcam').split(',').map(Number) : null;   // debug: top-down x,z,h,mm override
  const dbg = (...a) => { if (DBG) console.warn('[map_office]', ...a); };

  // ---- lamp & moon levels (shared by the desk shots)
  // integration: lamp = key (aimed left of the frame centre so its penumbra evens out the near side); moon = a soft cool pool of
  // wide louvre bands parked at the frame's upper right (≤ 1.6:1 over the lamp in S021, ≤ 1.3:1 in S044/S047)
  function deskLight(T, { lamp = 1, moon = 1, aim = V(0, TY, 0), fw = 0.8, moonAt = [0.46, -0.36], moths = true } = {}) {
    const fl = flicker(T, 3);
    lampL.intensity = +(QS.get('mlamp') || 2.4) * lamp * (0.985 + 0.015 * (fl - 0.92) / 0.1);   // kerosene: steady (no candle flicker), a breath of life
    lampL.target.position.copy(aim).add(V(-0.45 * fw, 0, 0.06 * fw)); lampL.target.updateMatrixWorld();
    aimMoon(aim.clone().add(V(moonAt[0] * fw, 0, moonAt[1] * fw / 2.39)), +(QS.get('mmoon') || 1.0) * moon);
    flyMoths(T, moths && !OFF.has('moth'));
  }
  const EXP_MAP = +(QS0.get('mexp') || 1.0);
  const mapPost = (o = {}) => ({
    exposure: EXP_MAP, contrast: 1.14, saturation: +(QS0.get('msat') || 0.56), temp: +(QS0.get('mtemp') || -0.2), tint: -0.02,
    shadowTint: QS0.has('mst') ? QS0.get('mst').split(',').map(Number) : [0.44, 0.49, 0.54], highTint: [0.56, 0.52, 0.47], lift: [0.006, 0.008, 0.011],
    vignette: 0.36, grain: GRAIN_MAP, aberration: 0.4, bloom: { strength: 0.2, radius: 0.5, threshold: 0.92 }, ...o,
  });

  // ================================================================ SHOT SETUPS
  const setups = {
    // ---------------------------------------------------------------------------------------------------------- S021
    // INSERT 50 mm, 90° top-down, locked + 3 % push. Ruler edge at y 0.66; pen 0.2–2.9 s left→right from x 0.12, crossing the
    // coast (x 0.30) at 1.278 s (78.32 山河); left hand off the ruler ~2.0 s, spread flat on the land at 2.598 s (79.64 掌),
    // palm (0.62, 0.45); the harbour-village mark (0.30, 0.58) stays uncovered (→ S022 shore light).
    S021(tl, u, T) {
      useSet('desk'); patchMesh.visible = false; penGrip = 0.048;
      const W0 = 0.80, H0 = 50 / 36 * W0;                       // frame width at the paper → camera height for 50 mm
      const coastW = mw(coastAt(S021.lineY), S021.lineY);       // where the turning shore crosses the line row
      const cx = coastW.x + 0.2 * W0, cz = mw(0, S021.lineY).z - 0.16 * (W0 / 2.39);
      const h = H0 * lerp(1, 0.97, ease.inOutSine(clamp(u, 0, 1)));
      cam.lens(camera, 50); placeTop(camera, cx, cz, h);
      // the registered frame (at the start camera) defines the world positions
      const fw = W0, fh = W0 / 2.39, F = (fx, fy) => V(cx + (fx - 0.5) * fw, TY, cz + (fy - 0.5) * fh);
      const edgeZ = F(0, 0.66).z;
      setRuler(F(0.06, 0).x, edgeZ);
      // ink: from x 0.12 to 0.70 (integration: 3.2 mm wet line, reads 4–5 px at 960)
      const IW = 0.0032, x0 = F(0.12, 0).x, xe = F(0.70, 0).x, lz = edgeZ - IW / 2 - INK_GAP;
      if (!setups._ink21) setups._ink21 = inkLine(x0, lz, xe - x0, 21, IW);
      for (const m of inks()) m.visible = m === setups._ink21;
      const px = pchip([[0.2, 0.12], [1.278, 0.30], [2.9, 0.70]], tl);
      const nibX = F(px, 0).x;                                  // pen already on paper at frame 0
      setInk(setups._ink21, tl < 0.2 ? x0 + 0.0001 : nibX, tl < 2.95 ? 1 : 0.6);
      // wet sheen travels with the nib; in the last 0.3 s (80.0–80.29, the 3 % push turns the highlight) a kerosene glint runs
      // back along the wet line to the coast crossing (0.30, 0.65) — the eye arrives where S022's shore light appears
      const back = smoothstep(2.92, 3.24, tl);
      setGlint(setups._ink21, { wet: 1.0, glintX: lerp(xe, coastW.x, ease.inOutSine(back)), glint: 2.2 * smoothstep(2.88, 3.0, tl) });
      const nib = V(nibX, TY + 0.0009, lz);
      const lean = lerp(0.0, 0.1, smoothstep(0.2, 0.6, tl)) * (1 - smoothstep(2.8, 3.1, tl));    // pen leans into the stroke
      const axis = V(0.34 + lean, 0.70, 0.60).normalize();
      penHand(nib, axis, V(0, 0, 1), bestRoll('S021b', V(0.40, 0.70, 0.60).normalize(), V(0, 0, 1), PEN_PALM));
      // left hand (integration): fingertips on the ruler's left end → lift (1.98) → slides right BELOW the ruler → on 掌
      // (2.598) presses flat on the land under the fresh line, palm ≈ (0.46, 0.86), forearm from the bottom edge — it never
      // crosses the wet line or the pen hand, and the harbour-village mark (0.30, 0.58) stays clear
      const rulerTop = TY + 0.0008 + RULER.t;
      const pHold = F(0.05, 0.676).setY(rulerTop + 0.002), pPress = F(0.47, 0.93).setY(TY + 0.0013);
      leftHand(smoothstep(1.98, 2.598, tl), pHold, V(0.3, -0.4, -1), pPress, V(0.92, 0, -0.39), 0.0006 * smoothstep(2.6, 2.72, tl), 0.03, PRESS21);
      deskLight(T, { aim: V(cx, TY, cz), fw, moon: 1.0, moonAt: [0.6, -0.5] });
      if (DBG && Math.abs(tl - 1.278) < 0.03) { const f3 = (v) => v.toArray().map((x) => x.toFixed(3)).join(','); dbg('S021 pen', 'nib', f3(nib), 'penO', f3(pen.localToWorld(V())), 'penTop', f3(pen.localToWorld(V(0, 0.14, 0))), 'pinch', f3(handR.sockets.pinch.getWorldPosition(V())), 'idx', f3(handR.tip('index', V())), 'thumb', f3(handR.tip('thumb', V())), 'wrist', f3(handR.root.getWorldPosition(V()))); }
      if (DBG && (Math.abs(tl - 1.278) < 0.03 || tl > 3.2)) dbg('S021', tl.toFixed(2), 'nib frame', toFrame(nib), 'coast', toFrame(coastW), 'mark', toFrame(mw(drawing.hm.x, drawing.hm.y)), 'ring', toFrame(mw(drawing.hm.x + drawing.ring[0], drawing.hm.y + drawing.ring[1])), 'palm', toFrame(handL.sockets.palm.getWorldPosition(V())), 'tips', ['thumb', 'index', 'middle', 'little'].map((n) => toFrame(handL.tip(n, V())).map((v) => v.toFixed(3)).join(',')).join(' '));
      return mapPost({ dof: null });
    },

    // ---------------------------------------------------------------------------------------------------------- S044
    // INSERT 75 mm top-down, closer: slow push ~30 cm drifting up-frame (line y 0.66 → ~0.84); the line cuts the fishing
    // village's lowest houses (nib at the village on 142.92, tl 0.712); pen lifts 1.7 s; left hand rises over the wet line and
    // spreads above it at 2.272 s (144.48 掌), palm (0.45, 0.60) ≈ 45 % of frame height (→ S045 left hand).
    S044(tl, u, T) {
      useSet('desk'); patchMesh.visible = false; penGrip = 0.048;
      const W0 = 0.74, W1 = 0.62, h0 = 75 / 36 * W0, h1 = 75 / 36 * W1;   // integration: 1.19× push; the end hand is ≈ 38 % of frame height across the knuckles, fingertips well inside the frame (S045 register)
      const vx = coastX(S044.lineY) + 2.4;
      const villL = Math.min(...drawing.houses.filter((hs) => Math.abs(hs.y - (S044.lineY - 0.31)) < 0.3).map((hs) => hs.x - hs.w / 2));
      const lineZ = mw(0, S044.lineY).z;
      const cx0 = mw(vx + 5.3, 0).x, cz0 = lineZ - 0.16 * (W0 / 2.39);
      const cz1 = lineZ - 0.39 * (W1 / 2.39);           // line ends at y ≈ 0.89: the heel stays ≥ 1.5 cm clear of the wet ink
      const pu = ease.inOutSine(clamp(tl / 2.875, 0, 1));
      const W = lerp(W0, W1, pu), h = lerp(h0, h1, pu);
      // palm target (end frame (0.45, 0.60)) — the push drifts to put it there
      const cx1 = cx0;
      const cx = lerp(cx0, cx1, pu), cz = lerp(cz0, cz1, pu);
      cam.lens(camera, 75); placeTop(camera, cx, cz, h);
      const F0 = (fx, fy) => V(cx0 + (fx - 0.5) * W0, TY, cz0 + (fy - 0.5) * W0 / 2.39);
      const F1 = (fx, fy) => V(cx1 + (fx - 0.5) * W1, TY, cz1 + (fy - 0.5) * W1 / 2.39);
      const edgeZ = lineZ;
      setRuler(F0(0.10, 0).x, edgeZ);
      const x0 = F0(0.30, 0).x, xv = mw(villL, 0).x, xe = F0(0.80, 0).x;
      const IW = 0.0026, lz = edgeZ - IW / 2 - INK_GAP;
      if (!setups._ink44) setups._ink44 = inkLine(x0, lz, xe - x0, 44, IW);
      for (const m of inks()) m.visible = m === setups._ink44;
      const nx = pchip([[0.3, x0], [0.712, xv], [1.65, xe]], tl);
      setInk(setups._ink44, tl < 0.3 ? x0 + 0.0001 : nx, tl < 1.7 ? 1 : 0.6);
      setGlint(setups._ink44, { wet: 1.0 });
      // pen: lowers 0–0.3, draws, lifts 1.7 and leaves to frame right
      const lift = tl < 0.3 ? (1 - smoothstep(0.0, 0.3, tl)) * 0.012 : smoothstep(1.7, 2.05, tl) * 0.09;
      const away = smoothstep(1.72, 2.2, tl) * 0.28;
      const nib = V(nx + away, TY + 0.0009 + lift, lz);
      const lean = lerp(0.0, 0.1, smoothstep(0.3, 0.6, tl));
      penHand(nib, V(0.34 + lean, 0.70, 0.60).normalize(), V(0, 0, 1), bestRoll('S021b', V(0.40, 0.70, 0.60).normalize(), V(0, 0, 1), PEN_PALM));
      handR.root.visible = tl < 2.3;
      // left hand: on the ruler left of the pen → over the wet line → spread flat above it (heel ≥ 1 cm clear)
      const rulerTop = TY + 0.0008 + RULER.t;
      const pHold = F0(0.17, 0.676).setY(rulerTop + 0.002), pPress = F1(0.45, 0.60).setY(TY + 0.0013);
      leftHand(smoothstep(1.9, 2.272, tl), pHold, V(0.3, -0.4, -1), pPress, V(0.1, 0, -1), 0.0006 * smoothstep(2.28, 2.4, tl), 0.06);
      deskLight(T, { aim: V(cx, TY, cz), fw: W, moon: 0.55 });
      if (DBG && (Math.abs(tl - 0.712) < 0.03 || tl > 2.6)) dbg('S044', tl.toFixed(2), 'nib', toFrame(nib), 'palm', toFrame(handL.sockets.palm.getWorldPosition(V())), 'village', toFrame(mw(vx, S044.vY)), 'line', toFrame(V(x0, TY, lz)), 'tips', ['thumb', 'index', 'middle', 'little'].map((n) => toFrame(handL.tip(n, V())).map((v) => v.toFixed(3)).join(',')).join(' '));
      return mapPost({ dof: { focus: h - 0.018 * smoothstep(1.9, 2.3, tl), fstop: 8 }, exposure: EXP_MAP * 1.02 });
    },

    // ---------------------------------------------------------------------------------------------------------- S047
    // MACRO 100 mm top-down, locked. Nib down at (0.30, 0.66) on 151.64 (tl 0.015), one stroke to x 0.92, nib up on 152.6
    // (tl 0.975) and away to frame right; iron-gall ink bleeding into the fibres, wet sheen in the lamp. Line y 0.66 → S048.
    S047(tl, u, T) {
      useSet('desk'); patchMesh.visible = true; mapMesh.visible = false; penGrip = 0.072;   // the macro patch covers the whole frame
      const Wf = 0.18, h = 100 / 36 * Wf;
      const lineZ = mw(0, S047.lineY).z;
      const cx = mw(S047.cx, 0).x, cz = lineZ - 0.16 * (Wf / 2.39);
      cam.lens(camera, 100); placeTop(camera, cx, cz, h);
      const F = (fx, fy) => V(cx + (fx - 0.5) * Wf, TY, cz + (fy - 0.5) * Wf / 2.39);
      // integration: a 1.2 mm blue-black line centred on y 0.66; the slim ruler's brass edge just below it, its ebony body
      // ends at y ≈ 0.85 (paper below) — the lower third is no longer a dead black slab
      const IW = 0.0016, lz = lineZ;
      setRuler(F(-0.6, 0).x, lz + IW / 2 + 0.0011);
      const x0 = F(0.30, 0).x, xe = F(0.92, 0).x;
      if (!setups._ink47) { setups._ink47 = inkLine(x0, lz, xe - x0, 47, IW); setups._ink47.userData.U.uBleed.value = 0.45; }
      for (const m of inks()) m.visible = m === setups._ink47;
      const nx = pchip([[0.015, x0], [0.95, xe]], tl);
      setInk(setups._ink47, nx, tl < 0.975 ? 1 : 0.5);
      setGlint(setups._ink47, { wet: 1.0, wetLen: 0.05 });
      const lift = smoothstep(0.975, 1.1, tl) * 0.03, away = smoothstep(0.98, 1.2, tl) * 0.08;
      const nib = V(nx + away, TY + 0.0009 + lift, lz);
      penHand(nib, V(0.40, 0.70, 0.60).normalize(), V(0, 0, 1), bestRoll('S047', V(0.40, 0.70, 0.60).normalize(), V(0, 0, 1), PEN_PALM));
      handR.root.visible = true; handL.root.visible = false;
      deskLight(T, { aim: V(cx, TY, cz), fw: Wf, lamp: 1.0, moon: 0.45, moonAt: [0.55, -0.6] });
      return mapPost({ dof: { focus: h, fstop: 8 }, saturation: 0.58, temp: -0.16 });   // BR1: greyed, low saturation
    },

    // ---------------------------------------------------------------------------------------------------------- S048
    // CU 50 mm at the customs threshold (c. 1930s), side-on. MATCH CUT: the iron edge strip at y 0.66, held ≥ 12 frames; the
    // black cloth shoes stopped behind it (toes frame right); 153.4 (tl 0.567) pedestal rise + tilt up her side; 153.86 (tl 1.027)
    // lands on her RIGHT hand on the case handle (bar y 0.66, x 0.28–0.72 → S049); 154.4 (tl 1.567) the grip tightens.
    S048(tl, u, T) {
      useSet('gate');
      queue.position.set(0.06 * tl - 0.08, 0, 0);       // the queue shuffles on, soft beyond the doorway
      handR.root.visible = false; handL.root.visible = false;
      // her: standing on the sill just behind the strip, facing +X, weight forward a little; breathing
      mig.root.position.set(0.02, SILL.y, -0.22); mig.root.rotation.set(0, Math.PI / 2 - +(QS.get('mrot') || 0.56), 0);   // integration: opened to ≈ 32° so the two shoes read as a pair (≈ 9 cm apart on screen), still side-on to the line   // gate-local; review: turned 17° toward the gate opening → the far shoe steps out from behind the near one (a pair reads), soles stay registered
      // review: plain contrapposto stand — the extra leg/foot channels de-registered the library sole (skinned to the foot only)
      // from the shoe upper (a grey blade under the far shoe)
      mig.pose('stand', { weight: 0.25 }); mig.pose({ 'armL.upper.x': 0.3, 'armL.upper.z': 0.08, 'armL.lower.x': 1.35, 'armL.lower.y': 0.4, handL: 'relaxed' }, { add: true }); mig.breathe(T, 0.8);   // left forearm across her waist (out of the hand CU)
      mig.root.updateMatrixWorld(true);
      const tight = smoothstep(1.47, 1.64, tl);
      const grip = mig.root.localToWorld(V(-0.25, 0.71, 0.05));   // wrist: the case rides clear of her right thigh
      mig.reach('R', grip, { palm: V(0, 0.05, -1), fingers: V(0.05, -1, 0.06) });
      migHandR.pose('rattan', { radius: lerp(0.0112, 0.0086, tight), wrist: 0.14 * tight });   // integration: fingers wrap deeper round the Ø23 bar (tips under/behind it)
      if (skinBase) migHandR.skinMat.color.copy(skinBase).lerp(hex('#f2e4dc'), 0.72 * tight);   // blood pushed out of the grip
      mig.lookAt(G(2.5, 1.5, -0.5), 0.3);
      mig.root.updateMatrixWorld(true);
      const g = migHandR.sockets.grip.getWorldPosition(V());
      caseG.position.copy(g).sub(O48); caseG.rotation.set(0, 0, 0.0); caseG.updateMatrixWorld(true);
      // camera: low lock → rise + tilt + push → lock on the hand
      const barW = caseG.userData.bar.getWorldPosition(V());
      const A = { pos: G(0.05, 0.12, 0.78), target: G(0.05, 0.065, -0.2) };
      const B = { pos: barW.clone().add(V(+(QS.get('mbx') || 0.15), +(QS.get('mby') || 0.012), 0.45)), target: barW.clone().add(V(0, 0.0, 0)) };   // integration: from her front-quarter, near bar height — the curl of the fingers round the bar and the thumb over the index read
      const m = ease.inOutSine(clamp((tl - 0.567) / (1.027 - 0.567), 0, 1));
      cam.lens(camera, 50);
      cam.place(camera, A.pos.clone().lerp(B.pos, m), A.target.clone().lerp(B.target, m));
      // registration: aim so the strip (start) / the bar (end) sit at y 0.66
      camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
      const want = 0.66, strip = G(0.05, SILL.y + 0.003, SILL.z0 - 0.003);
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const corr = lerp(-(toFrame(strip)[1] - want), -(toFrame(barW)[1] - want), smoothstep(0.35, 0.75, m)) * vfov;
      camera.rotateX(corr);
      camera.updateMatrixWorld(true);
      const knuck = migHandR.fingerBones.middle[0].getWorldPosition(V()).lerp(barW, 0.5);   // between the knuckle row (the fingers hook over the bar from our side) and the bar
      // integration: focus follows the rise — strip → shoes → the case face as it passes (no unreadable blur band) → knuckles
      const dCase = camera.position.distanceTo(barW.clone().add(V(0, -0.16, 0.105)));
      const fLow = lerp(camera.position.distanceTo(strip), camera.position.distanceTo(G(0.08, 0.05, -0.18)), smoothstep(0.2, 0.55, tl));
      const focusD = lerp(lerp(fLow, dCase, smoothstep(0.58, 0.78, tl)), camera.position.distanceTo(knuck), smoothstep(0.84, 1.02, tl));
      if (DBG && tl > 2.3) { const cp = camera.position; dbg('S048 focus', focusD.toFixed(3), 'wrist', cp.distanceTo(migHandR.root.getWorldPosition(V())).toFixed(3), 'mcp', cp.distanceTo(migHandR.fingerBones.middle[0].getWorldPosition(V())).toFixed(3), 'pip', cp.distanceTo(migHandR.fingerBones.middle[1].getWorldPosition(V())).toFixed(3), 'bar', cp.distanceTo(barW).toFixed(3)); }
      if (DBG) dbg('S048 geo', 'hroot', migHandR.root.getWorldPosition(V()).toArray().map((v) => v.toFixed(3)), 'hvis', migHandR.root.visible, migHandR.root.parent && migHandR.root.parent.name, 'target', grip.toArray().map((v) => v.toFixed(3)), 'root', mig.root.getWorldPosition(V()).toArray().map((v) => v.toFixed(3)), 'eye', mig.eye().toArray().map((v) => v.toFixed(3)), 'toeL', mig.worldPos('footL').toArray().map((v) => v.toFixed(3)), 'grip', g.toArray().map((v) => v.toFixed(3)), 'handL', mig.worldPos('handL').toArray().map((v) => v.toFixed(3)), 'rotY', mig.root.rotation.y.toFixed(3), 'parent', mig.root.parent && mig.root.parent.name);
      if (DBG && tl < 0.05) dbg('S048 layers', Object.keys(mig.layers).join(' '), 'footR', mig.worldPos('footR').toArray().map((v) => v.toFixed(3)).join(','), 'footL', mig.worldPos('footL').toArray().map((v) => v.toFixed(3)).join(','));
      if (DBG && (tl < 0.05 || Math.abs(tl - 1.05) < 0.03 || tl > 2.3)) dbg('S048', tl.toFixed(2), 'strip', toFrame(strip), 'barL', toFrame(caseG.localToWorld(V(-0.075, 0, 0))), 'barR', toFrame(caseG.localToWorld(V(0.075, 0, 0))));
      return {
        dof: { focus: focusD, fstop: 5.6 }, exposure: 1.08, contrast: 1.0, saturation: 0.72, temp: -0.02,
        shadowTint: [0.47, 0.5, 0.56], highTint: [0.57, 0.53, 0.46], lift: [0.012, 0.012, 0.014],
        vignette: 0.38, grain: GRAIN_MIG, bloom: { strength: 0.42, radius: 0.6, threshold: 0.8 },
      };
    },
  };
  const inks = () => [setups._ink21, setups._ink44, setups._ink47].filter(Boolean);
  setups.default = setups.S021;

  return {
    scene, camera,
    post: { exposure: 1.0, grain: GRAIN_MAP },
    setShot(shot, tl, u, T) {
      handR.root.visible = true; handL.root.visible = true;
      const p = (setups[shot.id] || setups.default)(tl, u, T, shot);
      if (OFF.size) {     // perf probes (?moff=dof,hand,lshadow,mshadow,patch,ink)
        if (OFF.has('dof') && p) p.dof = null;
        if (OFF.has('hand')) { handR.root.visible = false; handL.root.visible = false; }
        if (OFF.has('lshadow')) lampL.castShadow = false;
        if (OFF.has('mshadow')) moonL.castShadow = false;
        if (OFF.has('patch')) patchMesh.visible = false;
        if (OFF.has('ink')) for (const m of inks()) m.visible = false;
        if (OFF.has('lamp')) lampL.visible = false;
        if (OFF.has('moon')) moonL.visible = false;
        if (OFF.has('nrm')) { mapM.normalScale.set(0, 0); patchMesh.material.normalScale.set(0, 0); }
      }
      if (MCAM) { cam.lens(camera, MCAM[3] || 50); if (MCAM.length > 4) cam.place(camera, V(MCAM[0], MCAM[2], MCAM[1]), V(MCAM[4], MCAM[5], MCAM[6])); else placeTop(camera, MCAM[0], MCAM[1], MCAM[2]); if (p) p.dof = null; }
      return p;
    },
  };
}
