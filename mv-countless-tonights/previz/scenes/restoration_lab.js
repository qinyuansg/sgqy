// restoration_lab — LOC_LAB: present-day conservation lab, ground-floor SE corner of the old customs house.
// Shots: S012 S013 S014 S015 (PRE1: shards, foot ring, sand tray) · S049 S050 S051 S052 S053 S054 (BR1: rattan case, letter).
//
// World: metres, Y up, +X = east, +Z = south. South wall (arched sash window to the harbour) is the plane z = 0, the
// room is z < 0. Bench (oak, 3.0 × 0.9) along the window; the restorer sits on its north side facing the window
// (+Z): in the profile MCUs (camera west of her, looking east) the window is frame right, the room frame left
// (bible §7.2). Task lamp (3500 K) on her right / west, high over the work → "upper left" in the coverage used here.
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const hex = (h) => new THREE.Color(h);

// ---- bible colours (bible.json palette / props)
const C = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P06: '#EDF1EF', P07: '#2B4A8B', P09: '#B08D57',
  P10: '#6E5536', P13: '#E2A458', P15: '#D6C6A2', P28: '#0A0F17',
  wall: '#D9D4CA', sash: '#E3DED3', terrazzo: '#9A958C', steel: '#4A4E52', ledger: '#2F4A3E', letter: '#E7DCC3', rule: '#B4533F',
  jasmine: '#A88A5A', rattan: '#A8783F', rattanDark: '#7A5530', strap: '#6A4A30', buckle: '#9A7D4E', lining: '#3B5578', liningFlower: '#E6E0D2',
  comb: '#C9A46A', combCloth: '#8E4A3C', shirtMuseum: '#8392A0', glove: '#F1EFE8', coat: '#3C4045', wear: '#5A5E62',
};
// colour temperatures (linear-ish multipliers; the grade does the rest)
const K3500 = hex('#ffd2a1'), K2700 = hex('#ffb46b'), K4000 = hex('#ffe2c0'), MOON = hex('#b9c9e6');

// ---- canonical shard layout (PROP_SHARDS): weighted-Voronoi seeds, object space of TX.bowlGeometry().
// Rim pieces B/C/D are seeded near the axis above the rim so their mutual cracks are radial planes that cross the
// plum band exactly at bud positions (63.0°, 180.0°, 320.4° — never through one of the 16 blossoms); E = side A (boat +
// moon) whole, F = side B (window) whole, A = centre blossom + foot ring, G = a plain sliver, MISSING ≈ 1.5 × 3 cm in the
// plain white zone at +Z (between side A and side B). The library default layout makes MISSING a 6 × 5 cm hole that
// includes the rim band and lets cracks cut three blossoms (logged in lib/ISSUES.md).
const SHARD_LAYOUT = [
  ['A', [0, 0.006, 0], 0.00128], ['B', [0.01369, 0.11613, 0.03163], 0.00594], ['C', [0.03363, 0.11613, -0.00752], 0.00594],
  ['D', [-0.03363, 0.11613, -0.00752], 0.00594], ['E', [0.05515, 0.02383, 0.00021], 0.0015], ['F', [-0.05515, 0.02383, 0.00021], 0.0015],
  ['G', [0.02227, 0.01546, -0.03857], -0.00007], ['MISSING', [0.0, 0.03773, 0.06667], -0.0015],   // (review: −0.002 gave a 1.5 cm-high strip that read as a sliver from above; now ≈2.4 cm high, still ≥1.6 cm below the band)
];
// bowl profile samples (arc length s → [r, y]) used to place things on the bowl surface
const PROFILE = [[0.042, 0.0308, 0.009], [0.06, 0.0468, 0.017], [0.0758, 0.0587, 0.0274], [0.085, 0.0645, 0.0345], [0.095, 0.0697, 0.043],
  [0.1, 0.0718, 0.0476], [0.105, 0.0735, 0.0523], [0.11, 0.0748, 0.0571], [0.115, 0.0756, 0.062], [0.119, 0.076, 0.066]];
function profileAt(s) {
  for (let i = 1; i < PROFILE.length; i++) if (s <= PROFILE[i][0]) { const a = PROFILE[i - 1], b = PROFILE[i], t = (s - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  return [0.076, 0.066];
}
// point on the bowl's outer surface (object space) at azimuth phi (deg; 0 = +Z, 90 = +X) and arc length s
function bowlPt(phiDeg, s, out = new THREE.Vector3()) { const [r, y] = profileAt(s); const p = phiDeg * D2R; return out.set(Math.sin(p) * r, y, Math.cos(p) * r); }

// ------------------------------------------------------------------------------------------ canvas helpers
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb = true, wrap = false) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t;
}


// ------------------------------------------------------------------------------------------ PROP_LETTER (八行笺)
// 17 × 25 cm bamboo paper, 8 faded vermilion column rules, brush columns right → left. Strokes are generated once in
// cm space (abstract running-script marks: dots, hooks, sweeps — never real characters) and rasterised at any scale,
// so the macro patch (S051) is the same writing as the full sheet. The LAST (leftmost) column stops ≈62 % down
// with a broken final stroke whose dry-brush tail fades into bare paper.
const LET = { w: 17, h: 25, mx: 1.36, my: 1.75, cols: 8 };
LET.cw = (LET.w - 2 * LET.mx) / LET.cols;
LET.colX = (k) => LET.w - LET.mx - (k + 0.5) * LET.cw;   // k = 0 rightmost … 7 leftmost (last)
function smoothPts(p) {   // Chaikin ×2
  let a = p; for (let k = 0; k < 2; k++) { const o = [a[0]]; for (let i = 0; i < a.length - 1; i++) { const [x0, y0] = a[i], [x1, y1] = a[i + 1]; o.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]); } o.push(a[a.length - 1]); a = o; } return a;
}
function letterStrokes(rng) {
  const S = [], r = rng;
  const gs = 1.32, step = 1.5;
  const mark = (cx, cy, s, kind) => {
    const P = (x, y) => [cx + x * s, cy + y * s];
    const jit = () => (r() - 0.5) * 0.12;
    switch (kind) {
      case 'dot': S.push({ pts: [P(-0.08 + jit(), -0.1), P(0.06, 0.08)], w0: 0.16 * s, w1: 0.09 * s }); break;
      case 'h': S.push({ pts: [P(-0.36 + jit(), 0.02 + jit()), P(0.0, -0.04), P(0.36 + jit(), -0.08)], w0: 0.11 * s, w1: 0.08 * s }); break;
      case 'v': S.push({ pts: [P(0.0 + jit(), -0.4), P(0.02, 0.0), P(-0.01 + jit(), 0.4)], w0: 0.12 * s, w1: 0.05 * s }); break;
      case 'pie': S.push({ pts: [P(0.12, -0.32), P(0.0, 0.05), P(-0.34 + jit(), 0.34)], w0: 0.12 * s, w1: 0.02 * s }); break;
      case 'na': S.push({ pts: [P(-0.1, -0.2), P(0.1, 0.12), P(0.38 + jit(), 0.32)], w0: 0.05 * s, w1: 0.13 * s }); break;
      case 'hook': S.push({ pts: [P(-0.3, -0.05), P(0.28, -0.12), P(0.18 + jit(), 0.3), P(0.06, 0.22)], w0: 0.1 * s, w1: 0.04 * s }); break;
      case 'loop': S.push({ pts: [P(-0.2, -0.25), P(0.25, -0.15), P(-0.1, 0.12), P(0.28, 0.3)], w0: 0.07 * s, w1: 0.05 * s }); break;
    }
  };
  // review: small-regular-script-like (小楷) glyph structure instead of free cursive loops (which read as squiggles / birds):
  // each glyph = 1–2 components (left|right or top|bottom) of 2–4 brush strokes from a fixed vocabulary, slightly
  // compressed, so a column reads as dense, structured, faded brushwork — still abstract (no real characters).
  const comp = (x0, y0, w, h, n) => {
    const voc = ['h', 'h', 'v', 'dot', 'pie', 'na', 'hook', 'h', 'v', 'dot'];
    for (let i = 0; i < n; i++) {
      const kd = voc[Math.floor(r() * voc.length)], jx = (r() - 0.5) * 0.22, jy = (i + 0.5) / n - 0.5 + (r() - 0.5) * 0.12;
      const cxx = x0 + w * (0.5 + (kd === 'v' || kd === 'hook' ? jx * 1.6 : jx)), cyy = y0 + h * (0.5 + jy * (kd === 'v' ? 0.3 : 0.9));
      const ss = Math.min(w, h) * (kd === 'dot' ? 0.75 : 1.0);
      const first = S.length; mark(cxx, cyy, ss, kd);
      for (let q = first; q < S.length; q++) {   // stretch horizontals across the component, verticals down it; thin, brush pressure
        const st = S[q]; if (kd === 'h') st.pts = st.pts.map(([px, py]) => [cxx + (px - cxx) * (w / ss) * 1.15, py]);
        if (kd === 'v') st.pts = st.pts.map(([px, py]) => [px, cyy + (py - cyy) * (h / ss) * 1.1]);
        st.w0 *= 0.72; st.w1 *= 0.72; st.a = 0.66 + r() * 0.2;
      }
    }
  };
  const glyph = (cx, cy, s) => {
    const first = S.length, L = r(), x0 = cx - s * 0.42, y0 = cy - s * 0.42, W = s * 0.84, H = s * 0.84;
    if (L < 0.42) { const sp = 0.36 + r() * 0.12; comp(x0, y0, W * sp, H, 2 + Math.floor(r() * 2)); comp(x0 + W * (sp + 0.06), y0, W * (0.94 - sp), H, 2 + Math.floor(r() * 3)); }
    else if (L < 0.74) { const sp = 0.38 + r() * 0.2; comp(x0, y0, W, H * sp, 1 + Math.floor(r() * 2)); comp(x0, y0 + H * (sp + 0.05), W, H * (0.95 - sp), 2 + Math.floor(r() * 3)); }
    else comp(x0, y0, W, H, 3 + Math.floor(r() * 3));
    return first;
  };
  const per = Math.floor((LET.h - 2 * LET.my) / step);
  for (let k = 0; k < LET.cols; k++) {
    const cx = LET.colX(k), last = k === LET.cols - 1;
    const n = last ? 9 : per - (r() < 0.35 ? 1 + Math.floor(r() * 3) : 0);
    for (let j = 0; j < n; j++) {
      const cy = LET.my + gs * 0.62 + j * step + (r() - 0.5) * 0.08;
      if (last && j === n - 1) {
        // the broken last mark: a firm entry, then the brush runs dry mid-stroke (飞白) and lifts away
        glyph(cx, cy - 0.35, gs * 0.7);
        S.push({ pts: [[cx - 0.32, cy + 0.12], [cx - 0.05, cy + 0.2], [cx + 0.22, cy + 0.36], [cx + 0.34, cy + 0.62], [cx + 0.38, cy + 1.05]], w0: 0.16, w1: 0.05, dry: true, broken: true });
        LET.broken = [cx + 0.34, cy + 0.62];
      } else glyph(cx, cy, gs * (0.9 + r() * 0.2));
    }
  }
  return S;
}
// rasterise strokes: px/cm scale k, offset (ox, oy) in cm, alpha mul a
function drawStrokes(g, S, k, ox = 0, oy = 0, a = 1, rng = null, ink = [30, 25, 22]) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const r = rng || (() => 0.5);
  for (const st of S) {
    const pts = st.pts.map(([x, y]) => [(x - ox) * k, (y - oy) * k]);
    // resample along a quadratic-ish polyline
    const P = []; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5)); for (let t = 0; t < n; t++) P.push([x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n]); } P.push(pts[pts.length - 1]);
    const N = P.length;
    for (let i = 0; i < N - 1; i++) {
      const t = i / (N - 1), w = Math.max(0.6, (st.w0 + (st.w1 - st.w0) * t) * k) * (1 + 0.15 * Math.sin(t * 9 + st.w0 * 50));
      const al = (st.a ?? 0.88) * a * (st.broken ? Math.max(0, 1 - Math.max(0, t - 0.35) * 1.35) : 1);
      if (st.dry && t > 0.3) {
        // dry brush: bristle tracks with gaps, thinning toward the tail
        const bn = 7, nx = -(P[i + 1][1] - P[i][1]), ny = P[i + 1][0] - P[i][0], nl = Math.hypot(nx, ny) || 1;
        for (let b = 0; b < bn; b++) {
          const off = (b / (bn - 1) - 0.5) * w * 0.95, keep = Math.sin(b * 12.9898 + i * 0.07 * (b + 1)) * 0.5 + 0.5;
          if (keep < (t - 0.3) * 1.25) continue;
          g.strokeStyle = `rgba(${ink},${al * (0.55 + 0.45 * keep)})`; g.lineWidth = Math.max(0.5, w / bn * 0.9);
          g.beginPath(); g.moveTo(P[i][0] + nx / nl * off, P[i][1] + ny / nl * off); g.lineTo(P[i + 1][0] + nx / nl * off, P[i + 1][1] + ny / nl * off); g.stroke();
        }
      } else {
        g.strokeStyle = `rgba(${ink},${al})`; g.lineWidth = w; g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 1][0], P[i + 1][1]); g.stroke();
      }
    }
  }
}
// paper base (cm space → px), deterministic: tone, foxing, fibres, rules, fold shading
function drawPaper(g, W, H, k, ox, oy, rng, { rules = true, mirror = false, foxing = 1 } = {}) {
  const r = rng;
  g.fillStyle = '#E7DCC3'; g.fillRect(0, 0, W, H);
  // low-frequency tone (aged toward the edges)
  const cx = (LET.w / 2 - ox) * k, cy = (LET.h / 2 - oy) * k;
  const gr = g.createRadialGradient(cx, cy, 2 * k, cx, cy, 15 * k); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,90,50,0.16)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // foxing spots (seeded in cm space so every raster agrees)
  const rr = (() => { let a = 7331; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  for (let i = 0; i < 70 * foxing; i++) { let x = rr() * LET.w, y = rr() * LET.h; const s = 0.05 + rr() * 0.35, al = 0.05 + rr() * 0.12; if (mirror) x = LET.w - x; g.fillStyle = `rgba(150,105,60,${al})`; g.beginPath(); g.ellipse((x - ox) * k, (y - oy) * k, s * k, s * k * (0.6 + rr() * 0.5), rr() * 3, 0, 6.283); g.fill(); }
  // fibres (raster-local density)
  const nf = Math.min(9000, Math.floor(W * H / 900));
  for (let i = 0; i < nf; i++) { const x = r() * W, y = r() * H, l = (0.05 + r() * 0.3) * k, a = r() * 6.283; g.strokeStyle = r() < 0.5 ? `rgba(255,250,235,${0.05 + r() * 0.08})` : `rgba(140,120,90,${0.03 + r() * 0.05})`; g.lineWidth = Math.max(0.4, 0.012 * k); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * l * 0.3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  if (rules) {
    g.strokeStyle = 'rgba(180,83,63,0.5)'; g.lineWidth = Math.max(1, 0.03 * k);
    const X = (x) => ((mirror ? LET.w - x : x) - ox) * k;
    g.strokeRect(Math.min(X(LET.mx), X(LET.w - LET.mx)), (LET.my - oy) * k, (LET.w - 2 * LET.mx) * k, (LET.h - 2 * LET.my) * k);
    for (let c = 1; c < LET.cols; c++) { const x = X(LET.mx + c * LET.cw); g.beginPath(); g.moveTo(x, (LET.my - oy) * k); g.lineTo(x, (LET.h - LET.my - oy) * k); g.stroke(); }
  }
  // fold valleys (three-fold, then half-fold): slight shading lines
  for (const y of [LET.h / 3, LET.h * 2 / 3]) { const gy = g.createLinearGradient(0, (y - 0.25 - oy) * k, 0, (y + 0.25 - oy) * k); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.5, 'rgba(90,70,40,0.12)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, (y - 0.25 - oy) * k, W, 0.5 * k); }
  { const x = LET.w / 2; const gx = g.createLinearGradient((x - 0.25 - ox) * k, 0, (x + 0.25 - ox) * k, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.5, 'rgba(90,70,40,0.1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect((x - 0.25 - ox) * k, 0, 0.5 * k, H); }
}

export default async function create(ctx) {
  const { cam, util } = ctx;
  const { clamp, lerp, smoothstep, ease } = util;
  const ks = (k, t, e = ease.inOutSine) => util.keys(k, t, e);
  const DBG = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => ['camd', 'camf', 'camy'].includes(k)).map(([k, v]) => [k, +v]));
  const OFF = new Set((new URLSearchParams(location.search).get('off') || '').split(','));   // perf probes only
  const scene = new THREE.Scene();
  scene.background = hex('#05070b');
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.01, 200);
  const envMain = envTexture(ctx.renderer, 'night_museum', { moon: 1.1, warmth: 1.2 });
  scene.environment = null;   // per-material envMap only (glaze, glass, metal): full-screen IBL on every surface cost ≈ 1 cpu-s/frame

  const BY = 0.86;                       // bench top
  const ROOM = { x0: -4.5, x1: 4.5, z0: -7.0, z1: 0, h: 4.2 };
  const WIN = { w: 2.4, sill: 0.9, spring: 2.9, top: 4.1, depth: 0.5 };
  // east-wall door to the stair hall (review: moved south so it sits behind her in the profile MCUs, S050 pane ≈ (0.15, 0.38))
  const DOOR = { z: -0.86, w: 0.95, h: 2.2, x: ROOM.x1 - 0.02 };

  // ============================================================ ROOM
  const plaster = TX.mat('plaster_museum', { repeat: [3, 1.5], tex: { tone: 'museum' }, color: hex('#e8e4dc') });
  const terr = TX.mat('terrazzo', { repeat: [4, 3] });
  {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), terr); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -3.5); floor.receiveShadow = true; scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ROOM.h, -3.5); scene.add(ceil);
    // south wall with the arched window opening, extruded to the reveal depth (old customs house: thick masonry)
    const s = new THREE.Shape(); s.moveTo(ROOM.x0, 0); s.lineTo(ROOM.x1, 0); s.lineTo(ROOM.x1, ROOM.h); s.lineTo(ROOM.x0, ROOM.h); s.lineTo(ROOM.x0, 0);
    const hw = WIN.w / 2, hole = new THREE.Path();
    hole.moveTo(-hw, WIN.sill); hole.lineTo(hw, WIN.sill); hole.lineTo(hw, WIN.spring); hole.absarc(0, WIN.spring, hw, 0, Math.PI, false); hole.lineTo(-hw, WIN.sill);
    s.holes.push(hole);
    const wg = new THREE.ExtrudeGeometry(s, { depth: WIN.depth, bevelEnabled: false, curveSegments: 32 });
    wg.translate(0, 0, -WIN.depth * 0.0); // extrude goes +Z: interior face at z = 0 is the cap at depth 0
    const wall = new THREE.Mesh(wg, plaster); wall.receiveShadow = true; scene.add(wall);
    // deep sill (painted wood)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.06, 0.04, WIN.depth + 0.06), new THREE.MeshStandardMaterial({ color: hex(C.sash), roughness: 0.6 }));
    sill.position.set(0, WIN.sill - 0.02, WIN.depth / 2 - 0.03); sill.receiveShadow = true; scene.add(sill);
    // other walls
    const north = new THREE.Mesh(new THREE.PlaneGeometry(9, ROOM.h), plaster); north.position.set(0, ROOM.h / 2, ROOM.z0); north.receiveShadow = true; scene.add(north);
    const west = new THREE.Mesh(new THREE.PlaneGeometry(7, ROOM.h), plaster); west.rotation.y = Math.PI / 2; west.position.set(ROOM.x0, ROOM.h / 2, -3.5); west.receiveShadow = true; scene.add(west);
    { // east wall with the door opening (door centre z = −2.26, 0.95 × 2.2 m); shape in wall-local (u = −z, v = y)
      // wall-local u = world z (rotation −90° maps local +X → +Z and the face normal → −X, into the room)
      const es = new THREE.Shape(); es.moveTo(-7, 0); es.lineTo(0, 0); es.lineTo(0, ROOM.h); es.lineTo(-7, ROOM.h); es.lineTo(-7, 0);
      const dh = new THREE.Path(), u0 = DOOR.z - 0.475, u1 = DOOR.z + 0.475; dh.moveTo(u0, 0); dh.lineTo(u0, 2.2); dh.lineTo(u1, 2.2); dh.lineTo(u1, 0); dh.lineTo(u0, 0); es.holes.push(dh);
      const eg = new THREE.ShapeGeometry(es); const east = new THREE.Mesh(eg, plaster);
      east.rotation.y = -Math.PI / 2; east.position.set(ROOM.x1, 0, 0); east.receiveShadow = true; scene.add(east);
      // the stair-hall corridor beyond: a dark box the torch beam lights (see doorBeam)
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3, 3), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.9, side: THREE.BackSide }));
      hall.position.set(ROOM.x1 + 1.0, 1.5, DOOR.z); scene.add(hall);
    }
    // skirting
    const sk = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.7 });
    const sk1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 7), sk); sk1.position.set(ROOM.x1 - 0.01, 0.06, -3.5); scene.add(sk1);
  }

  // ============================================================ WINDOW (six-over-six arched sash + fanlight) + harbour beyond
  const winZ = 0.24;                       // glazing plane inside the reveal
  const winCookie = TX.windowCookie({ pattern: 'sash', size: 1024, blur: 0.6, glass: 0.0 });
  const winH = WIN.top - WIN.sill;         // 3.2
  {
    // painted glazing bars: inverse of the cookie as alpha (the cookie is white where light passes)
    const inv = (() => { const img = winCookie.map.image, c = canvas(img.width, img.height), g = c.getContext('2d'); g.filter = 'invert(1)'; g.drawImage(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; })();
    const bars = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, winH), new THREE.MeshStandardMaterial({ color: hex(C.sash), roughness: 0.55, alphaMap: inv, alphaTest: 0.5, side: THREE.DoubleSide }));
    bars.position.set(0, WIN.sill + winH / 2, winZ); bars.castShadow = true; bars.name = 'bars'; scene.add(bars);
    // glass: faint reflections of the room (env) + very slight tint; seen from inside
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, winH), new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, depthWrite: false, alphaMap: winCookie.map }));
    glass.position.set(0, WIN.sill + winH / 2, winZ + 0.01); glass.rotation.y = Math.PI; scene.add(glass);
  }
  // harbour night backdrop (painted, emissive; always far out of focus): sky P01→P03, low far shore with warm lights,
  // anchored ships, water with light streaks, quay lamps. HDR lights are added as glow sprites on top.
  const harbourLights = [];
  {
    const W = 2048, H = 1024, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(812);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.56);
    sky.addColorStop(0, C.P01); sky.addColorStop(0.7, C.P02); sky.addColorStop(1, '#30496b');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.56);
    // thin cloud bands
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(120,140,170,${0.03 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * W, H * (0.12 + r() * 0.36), 120 + r() * 380, 6 + r() * 16, 0, 0, Math.PI * 2); g.fill(); }
    // far shore (low hills)
    g.fillStyle = '#0b1220'; g.beginPath(); g.moveTo(0, H * 0.56);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, H * (0.53 - 0.03 * Math.sin(x / 300) - 0.015 * Math.sin(x / 90 + 1) - (x > W * 0.6 && x < W * 0.85 ? 0.04 * Math.sin((x - W * 0.6) / (W * 0.25) * Math.PI) : 0)));
    g.lineTo(W, H * 0.56); g.closePath(); g.fill();
    // water
    const wat = g.createLinearGradient(0, H * 0.56, 0, H); wat.addColorStop(0, '#1d3150'); wat.addColorStop(1, '#0a1220');
    g.fillStyle = wat; g.fillRect(0, H * 0.56, W, H * 0.44);
    // far shore lights + their reflections (streaks)
    for (let k = 0; k < 90; k++) {
      const x = r() * W, y = H * (0.52 + r() * 0.035), warm = r() < 0.8, s = 1 + r() * 2.2;
      const col = warm ? [226, 164, 88] : [200, 214, 230];
      g.fillStyle = `rgba(${col},${0.7 + r() * 0.3})`; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      if (r() < 0.6) for (let j = 0; j < 14; j++) { g.fillStyle = `rgba(${col},${0.18 * (1 - j / 14)})`; g.fillRect(x - s * (1 + r()), H * 0.565 + j * (6 + r() * 6), s * 2.2, 2 + r() * 3); }
      if (k < 26) harbourLights.push({ u: x / W, v: y / H, warm, s });
    }
    // two anchored ships: dark hulls + a few lights
    for (const [sx, sw] of [[0.3, 0.12], [0.7, 0.09]]) {
      g.fillStyle = '#070b13'; g.fillRect(W * sx, H * 0.58, W * sw, H * 0.018); g.fillRect(W * (sx + sw * 0.6), H * 0.555, W * sw * 0.2, H * 0.03);
      for (let j = 0; j < 6; j++) { const x = W * (sx + r() * sw), y = H * (0.575 + r() * 0.01); g.fillStyle = 'rgba(230,180,110,0.95)'; g.fillRect(x, y, 3, 3); harbourLights.push({ u: x / W, v: y / H, warm: true, s: 1.5 }); }
    }
    // water glitter (moon high, out of frame: a soft silver sheen on the near water)
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(170,190,215,${0.04 + r() * 0.08})`; g.fillRect(W * (0.35 + r() * 0.4), H * (0.62 + r() * 0.36), 6 + r() * 26, 1.5); }
    const t = ctex(c);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.55, 0.55, 0.6), fog: false }));
    bd.position.set(4, 10, 60); bd.rotation.y = Math.PI; scene.add(bd);
    // second panel for the oblique views through the window's east half (S014 / S050 profile MCUs look ESE): the harbour
    // mouth to the south-east (bible §3.3), same painting, far out of focus
    const bd2 = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), bd.material);
    bd2.position.set(52, 6, 26); bd2.lookAt(0, 6, -2); scene.add(bd2);
    // a quay with two lamp posts just outside (bokeh at the window)
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.9 }));
    quay.rotation.x = -Math.PI / 2; quay.position.set(0, -0.6, 6); scene.add(quay);
    for (const [lx, lz] of [[-3.2, 7], [5.5, 9]]) {
      const gl = FX.glow({ color: K2700, size: 0.9, intensity: 2.2, core: 0.6 }); gl.object3D.position.set(lx, 3.4, lz); scene.add(gl.object3D);
    }
    { const r = util.rng(4242);
      for (let k = 0; k < 16; k++) { const gl = FX.glow({ color: r() < 0.75 ? hex(C.P13) : hex('#c8d6e8'), size: 0.25 + r() * 0.5, intensity: 1.2 + r() * 1.2, core: 0.5 });
        gl.object3D.position.set(3 + r() * 30, 0.6 + r() * 4.5, 4 + r() * 14); scene.add(gl.object3D); } }
    for (const L of harbourLights.slice(0, 30)) {
      const gl = FX.glow({ color: L.warm ? hex(C.P13) : hex('#c8d6e8'), size: 0.35 + L.s * 0.25, intensity: 1.4, core: 0.5 });
      gl.object3D.position.set(4 - (L.u - 0.5) * 120, 10 + (0.5 - L.v) * 60, 59.5); scene.add(gl.object3D);
    }
  }

  // ============================================================ BENCH, STOOL, SHELVES, DOOR
  const oak = (() => {
    const W = 2048, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(404);
    g.fillStyle = '#9c8b72'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 900; k++) {                       // straight grain lines with slow waviness
      const y0 = r() * H, a = 0.4 + r() * 2.5, ph = r() * 6.28, w = 0.6 + r() * 1.8, l = 0.06 + r() * 0.16;
      g.strokeStyle = r() < 0.5 ? `rgba(70,56,40,${l})` : `rgba(190,172,140,${l * 0.8})`; g.lineWidth = w; g.beginPath();
      for (let x = -10; x <= W + 10; x += 32) g.lineTo(x, y0 + a * Math.sin(x / 260 + ph) + 1.5 * Math.sin(x / 47 + ph * 2)); g.stroke();
    }
    for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(200,182,150,${0.08 + r() * 0.12})`; g.fillRect(r() * W, r() * H, 6 + r() * 22, 1 + r() * 2); } // medullary flecks
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(40,30,20,0.18)'; g.fillRect(0, (k + 1) * H / 6.5 + r() * 6, W, 1.2); }      // board joints
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(60,48,35,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * W, r() * H, 30 + r() * 120, 8 + r() * 30, 0, 0, 6.28); g.fill(); } // use stains
    const t = ctex(c, true, true); t.repeat.set(1.5, 1.8);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.62, color: hex('#c4c2bd') });
  })();
  const steelM = new THREE.MeshStandardMaterial({ color: hex(C.steel), roughness: 0.45, metalness: 0.6 });
  const bench = new THREE.Group(); scene.add(bench);
  {
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 0.9), oak); top.position.set(0, BY - 0.02, -0.70); top.castShadow = top.receiveShadow = true; bench.add(top);
    for (const x of [-1.42, 1.42]) for (const z of [-1.1, -0.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, BY - 0.04, 0.04), steelM); l.position.set(x, (BY - 0.04) / 2, z); l.castShadow = true; bench.add(l); }
    for (const z of [-1.1, -0.3]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.04, 0.03), steelM); rl.position.set(0, 0.22, z); bench.add(rl); }
    // stool (lab stool, round seat)
    const st = new THREE.Group(); st.position.set(0.02, 0, -1.44); bench.add(st);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.6 })); seat.position.y = 0.6; seat.castShadow = true; st.add(seat);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.58, 12), steelM); col.position.y = 0.29; st.add(col);
  }
  // archive shelving + small 2700 K shelf lamp on the east wall (north end) → the far warm point in the profile MCUs
  const shelfLampPos = V(4.22, 1.86, -1.75); let shelfLight;
  {
    const sh = new THREE.Group(); sh.position.set(4.3, 0, -2.45); scene.add(sh);
    const wd = new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.55, metalness: 0.4 });
    for (const y of [0.4, 0.85, 1.3, 1.75, 2.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 1.6), wd); b.position.set(0, y, 0); sh.add(b); }
    for (const z of [-0.79, 0.79]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.3, 0.025), wd); p.position.set(0, 1.15, z); sh.add(p); }
    const r = util.rng(55), boxM = [0x6f6a60, 0x5c5850, 0x7c766a, 0x2f4a3e, 0x46423c].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    for (const y of [0.4, 0.85, 1.3, 1.75]) { let z = -0.75; while (z < 0.72) { const w = 0.06 + r() * 0.2, hgt = 0.25 + r() * 0.15; const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, hgt, w * 0.95), boxM[Math.floor(r() * boxM.length)]); b.position.set(0.0, y + 0.0125 + hgt / 2, z + w / 2); sh.add(b); z += w; } }
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d2a8, emissive: K2700, emissiveIntensity: 1.2, side: THREE.DoubleSide, roughness: 0.8 }));
    lampShade.position.copy(shelfLampPos); scene.add(lampShade);
    const gl = FX.glow({ color: K2700, size: 0.32, intensity: 1.1, core: 0.3 }); gl.object3D.position.copy(shelfLampPos).add(V(-0.05, -0.02, 0)); scene.add(gl.object3D);
    const pl = new THREE.PointLight(K2700, 0.35, 3.5, 2); pl.position.copy(shelfLampPos).add(V(-0.12, -0.05, 0)); scene.add(pl); shelfLight = pl;
  }
  // door with a glass pane in the east wall (to the stair hall): the guard's torch sweeps across it once in S050
  let doorBeam;
  {
    const dg = new THREE.Group(); dg.position.set(DOOR.x, 0, DOOR.z); dg.rotation.y = -Math.PI / 2; scene.add(dg);
    const wood = new THREE.MeshStandardMaterial({ color: 0x3b3430, roughness: 0.6 });
    { const am = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.7 });   // architrave: two jambs + head (the opening stays open)
      for (const sx of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.08, DOOR.h + 0.08, 0.04), am); j.position.set(sx * (DOOR.w / 2 + 0.04), (DOOR.h + 0.08) / 2, 0.03); dg.add(j); }
      const hd = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w + 0.16, 0.08, 0.04), am); hd.position.set(0, DOOR.h + 0.04, 0.03); dg.add(hd); }
    const leafS = new THREE.Shape(); const lw = DOOR.w / 2; leafS.moveTo(-lw, 0); leafS.lineTo(lw, 0); leafS.lineTo(lw, DOOR.h); leafS.lineTo(-lw, DOOR.h); leafS.lineTo(-lw, 0);
    const ph = new THREE.Path(); ph.moveTo(-0.3, 0.98); ph.lineTo(0.3, 0.98); ph.lineTo(0.3, 1.8); ph.lineTo(-0.3, 1.8); ph.lineTo(-0.3, 0.98); leafS.holes.push(ph);
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(leafS, { depth: 0.045, bevelEnabled: false }), wood); leaf.position.z = 0.012; dg.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.8, roughness: 0.35 })); knob.position.set(0.36, 1.0, 0.08); dg.add(knob);
    // the pane: dark wired glass with reflections; the corridor beyond is a dark wall that the torch beam lights
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.82), new THREE.MeshPhysicalMaterial({ color: 0x05070a, roughness: 0.08, transparent: true, opacity: 0.35, envMapIntensity: 1.2, depthWrite: false }));
    pane.position.set(0, 1.39, 0.035); dg.add(pane);
    // corridor wall 1.6 m beyond the door, lit only by the sweeping torch (shader spot moving right → left in frame)
    const corr = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.ShaderMaterial({
      uniforms: { uX: { value: 9 }, uI: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vP; uniform float uX, uI;
        void main(){ vec2 d = vP - vec2(uX, 0.05 - 0.15 * uX); float s = exp(-dot(d * vec2(1.0, 0.75), d * vec2(1.0, 0.75)) * 34.0); float halo = exp(-dot(d, d) * 3.0) * 0.12;
          // corridor night base light (bible §3.1: 4000 K, very low, at floor level) → the pane reads faintly before the torch passes
          vec3 base = vec3(0.004, 0.006, 0.01) + vec3(0.020, 0.022, 0.026) * (0.45 + exp(-(vP.y + 1.3) * 1.1));
          gl_FragColor = vec4(base + vec3(1.0, 0.9, 0.78) * uI * (s * 2.2 + halo), 1.0); }`,
    }));
    corr.position.set(0, 1.3, -1.6); dg.add(corr);
    doorBeam = { mat: corr.material, group: dg };
  }

  // ============================================================ TASK LAMP (adjustable arm, 3500 K, CRI≥97)
  const lamp = { base: V(-0.88, BY, -0.30), head: V(-0.26, BY + 0.70, -0.50), aim: V(0.10, BY, -0.72) };
  const lampG = new THREE.Group(); scene.add(lampG);
  const lampM = new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.4, metalness: 0.5 });
  const lampParts = {};
  {
    const clamp1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), lampM); clamp1.position.copy(lamp.base).add(V(0, 0.025, 0)); lampG.add(clamp1);
    lampParts.arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), lampM); lampG.add(lampParts.arm1);
    lampParts.arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 8), lampM); lampG.add(lampParts.arm2);
    lampParts.elbow = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), lampM); lampG.add(lampParts.elbow);
    const head = new THREE.Group(); lampG.add(head); lampParts.head = head;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.085, 0.11, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }));
    shade.position.y = -0.03; shade.castShadow = true; head.add(shade);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 24), lampM); cap.position.y = 0.025; head.add(cap);
    const diff = new THREE.Mesh(new THREE.CircleGeometry(0.08, 32), new THREE.MeshBasicMaterial({ color: K3500.clone().multiplyScalar(9) })); diff.rotation.x = Math.PI / 2; diff.position.y = -0.08; head.add(diff);
    lampParts.diffuser = diff;
  }
  const lampLight = new THREE.SpotLight(K3500, 6, 0, 0.75, 0.75, 2);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.00008; lampLight.shadow.normalBias = 0.0025; lampLight.shadow.radius = 2;
  lampLight.shadow.camera.near = 0.05; lampLight.shadow.camera.far = 4;
  scene.add(lampLight, lampLight.target);
  // lamp pose: head position, aim point, cone angle → arm geometry + light
  // illuminance-normalised variant: E = illuminance on the beam axis at the aim point (I = E·d²)
  function setLampE(head, aim, angle, E, penumbra = 0.85) { setLamp(head, aim, angle, E * head.distanceToSquared(aim), penumbra); }
  function setLamp(head, aim, angle = 0.75, intensity = 6, penumbra = 0.75) {
    const b = lamp.base.clone().add(V(0, 0.05, 0));
    const mid = b.clone().lerp(head, 0.5).add(V(-0.12, 0.30, 0.10));          // elbow above, toward the window
    const seg = (m, p, q) => { const d = q.clone().sub(p); m.position.copy(p).addScaledVector(d, 0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
    seg(lampParts.arm1, b, mid); seg(lampParts.arm2, mid, head); lampParts.elbow.position.copy(mid);
    lampParts.head.position.copy(head);
    lampParts.head.quaternion.setFromUnitVectors(V(0, -1, 0), aim.clone().sub(head).normalize());
    lampParts.head.updateMatrixWorld(true);
    lampLight.position.copy(lampParts.diffuser.getWorldPosition(new THREE.Vector3()));
    lampLight.target.position.copy(aim); lampLight.angle = angle; lampLight.intensity = intensity; lampLight.penumbra = penumbra;
    lampLight.target.updateMatrixWorld(true);
    benchBounce.position.copy(aim).add(V(0, 0.05, 0)); benchBounce.intensity = intensity * 0.06;
  }

  // ============================================================ MOONLIGHT through the window (PRE1: SE high; BR1 late: SW)
  const moonWL = FX.windowLight({ center: [0, WIN.sill + winH / 2, winZ], right: [WIN.w / 2, 0, 0], up: [0, winH / 2, 0], dir: [-0.32, -0.78, -0.53], cookie: winCookie.map,
    color: MOON, intensity: 1.4, mapSize: 1024, frameVisible: false, bounce: 0, floorY: 0, blocker: 0 });
  scene.add(moonWL.object3D);
  const setMoon = (dir) => { const d = V(...dir).normalize(); moonWL.light.position.copy(moonWL.light.target.position).addScaledVector(d, -25); moonWL.light.updateMatrixWorld(); };
  const hemi = new THREE.HemisphereLight(0x5a6c8c, 0x1c1814, 0.15); scene.add(hemi);
  // first bounce of the lamp pool off the pale bench / paper (warm, unshadowed): the 4:1 fill
  const benchBounce = new THREE.PointLight(K3500, 0.05, 1.6, 2); scene.add(benchBounce);
  // face fill for the MCUs: the lamp pool bouncing off the ledger / blotter up into her face (warm, soft, unshadowed)
  const faceFill = new THREE.SpotLight(hex('#ffd9b8'), 0.0, 3, 0.55, 1.0, 2); scene.add(faceFill, faceFill.target); faceFill.visible = false;
  // soft cool window fill on the bench (sky + harbour glow through the big window, no shadows)
  const winFill = new THREE.RectAreaLight ? null : null; void winFill;
  const coolFill = new THREE.SpotLight(hex('#8aa0c8'), 0.25, 0, 0.9, 1.0, 2); coolFill.position.set(0.6, 2.4, 0.4); coolFill.visible = false; coolFill.target.position.set(0, BY, -0.8); scene.add(coolFill, coolFill.target);
  // review: the moonlit window bay bouncing onto the room's east side (wall, door, SE corner) — keeps the profile MCUs
  // (S014 / S050) out of a black void: P02 air with the door architrave and plaster just readable (unshadowed, cool)
  const wallWash = new THREE.SpotLight(MOON.clone().lerp(hex('#6f86b0'), 0.4), 2.4, 0, 0.9, 1.0, 2);
  wallWash.position.set(0.6, 2.9, -2.2); wallWash.target.position.set(3.7, 1.2, -0.55); wallWash.visible = false; scene.add(wallWash, wallWash.target);

  // ============================================================ PROPS: foam, sand tray, shards, tools
  const props = new THREE.Group(); scene.add(props);
  const foamM = new THREE.MeshStandardMaterial({ color: 0x6b6e72, roughness: 0.95 });
  {
    // a bumpy normal for foam / sand
    const c = canvas(256, 256), g = c.getContext('2d'), r = util.rng(91); g.fillStyle = '#8080ff'; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 2600; k++) { const x = r() * 256, y = r() * 256, a = r() * 6.28; g.fillStyle = `rgba(${128 + Math.cos(a) * 60 | 0},${128 + Math.sin(a) * 60 | 0},255,0.5)`; g.beginPath(); g.arc(x, y, 0.8 + r() * 1.6, 0, 6.28); g.fill(); }
    const nt = ctex(c, false, true); nt.repeat.set(6, 6); foamM.normalMap = nt; foamM.normalScale = new THREE.Vector2(0.5, 0.5);
  }
  const FOAM = V(0.10, BY, -0.70);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.014, 0.24), foamM); foam.position.copy(FOAM).add(V(0, 0.007, 0)); foam.rotation.y = 0.12; foam.receiveShadow = true; foam.castShadow = true; props.add(foam);
  const FOAM_TOP = BY + 0.014;
  // sand tray (east of the foam, her left)
  const TRAY = V(0.52, BY, -0.60);
  const sandM = (() => {
    const c = canvas(512, 512), g = c.getContext('2d'), r = util.rng(17); g.fillStyle = '#cfc8ba'; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 26000; k++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 22},0.55)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5); }
    const t = ctex(c, true, true); t.repeat.set(2, 2);
    const n = foamM.normalMap.clone(); n.repeat.set(14, 14); n.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, normalMap: n, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.97 });
  })();
  const tray = new THREE.Group(); tray.name = 'tray'; tray.position.copy(TRAY); tray.rotation.y = -0.08; props.add(tray);
  {
    const wd = TX.mat('wood_pale', { repeat: [0.4, 0.2], color: hex('#c9b391') });
    const tw = 0.36, td = 0.30, th = 0.065, t = 0.012;
    const parts = [[tw, th, t, 0, th / 2, td / 2 - t / 2], [tw, th, t, 0, th / 2, -td / 2 + t / 2], [t, th, td, tw / 2 - t / 2, th / 2, 0], [t, th, td, -tw / 2 + t / 2, th / 2, 0], [tw, 0.01, td, 0, 0.005, 0]];
    for (const [a, b, c2, x, y, z] of parts) { const m = new THREE.Mesh(new THREE.BoxGeometry(a, b, c2), wd); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; tray.add(m); }
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(tw - 2 * t, td - 2 * t, 24, 20), sandM); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.05; sand.receiveShadow = true; tray.add(sand);
    // shallow heap of sand round the bowl foot
    const heap = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.022, 10, 40), sandM); heap.rotation.x = Math.PI / 2; heap.scale.set(1, 1, 0.45); heap.position.y = 0.05; heap.receiveShadow = true; tray.add(heap);
  }
  // shards (canonical layout)
  const K = TX.bowlShards({ layout: SHARD_LAYOUT.map(([name, p, w]) => ({ name, pos: V(...p), w })) });
  const bowlBase = TX.mat('porcelain_bowl', { envMapIntensity: 1.0 });
  const shardMat = (names) => K.material(-1, { mode: 'missing', base: bowlBase, hide: K.pieces.map((p) => p.name).filter((n) => !names.includes(n)) });
  // per-piece geometry subsets (CPU Voronoi on the lathe vertices, generous margin for the shader's jagged edges): each
  // shard mesh rasterises only its own triangles instead of the whole bowl with discard (8× less fragment work)
  const subGeo = (() => {
    const g = K.geometry, pos = g.attributes.position, idx = g.index.array, nv = pos.count, seeds = SHARD_LAYOUT.map(([n, p, w]) => [n, p, w]);
    const sets = new Array(nv); const q = new THREE.Vector3();
    for (let i = 0; i < nv; i++) {
      q.fromBufferAttribute(pos, i); const d = seeds.map(([, c, w]) => (q.x - c[0]) ** 2 + (q.y - c[1]) ** 2 + (q.z - c[2]) ** 2 - w);
      const m = Math.min(...d); let mask = 0; d.forEach((x, k) => { if (x - m < 0.0009) mask |= 1 << k; }); sets[i] = mask;
    }
    const cache = new Map();
    return (names) => {
      const key = names.join(','); if (cache.has(key)) return cache.get(key);
      const want = names.reduce((a, n) => a | (1 << seeds.findIndex((x) => x[0] === n)), 0), out = [];
      for (let t = 0; t < idx.length; t += 3) if ((sets[idx[t]] | sets[idx[t + 1]] | sets[idx[t + 2]]) & want) out.push(idx[t], idx[t + 1], idx[t + 2]);
      const ng = new THREE.BufferGeometry(); for (const [k, a] of Object.entries(g.attributes)) ng.setAttribute(k, a);
      ng.setIndex(out); ng.computeBoundingSphere(); ng.computeBoundingBox(); cache.set(key, ng); return ng;
    };
  })();
  const mkShard = (names) => { const m = new THREE.Mesh(subGeo(names), names.length === 1 ? K.material(names[0], { base: bowlBase }) : shardMat(names)); m.castShadow = true; m.receiveShadow = true; return m; };
  // S012/S013: virtual upright bowl whose B piece stands on the foam like a curved fence, band outward, joint B|C (φ 63°)
  // facing south-east (the coverage side); C (in her fingers) continues the circle toward the north-east (her side).
  const joinBowl = new THREE.Group(); joinBowl.name = 'join'; props.add(joinBowl);
  const shardB = mkShard(['B', 'E']); joinBowl.add(shardB); const shardB0 = shardB;   // B + E glued earlier (rim + side A)
  { // world basis at the joint (φ 63°): outer normal n → up/south-east, tangent t (toward C) → north-north-east, axis a = n × t
    const n = V(0.30, 0.855, 0.42).normalize(), t0 = V(0.3, 0, -1); const t = t0.sub(n.clone().multiplyScalar(t0.dot(n))).normalize(), a = new THREE.Vector3().crossVectors(n, t);
    const ph = 63 * D2R, nl = V(Math.sin(ph), 0, Math.cos(ph)), tl = V(Math.cos(ph), 0, -Math.sin(ph)), al = V(0, 1, 0);
    const Mw = new THREE.Matrix4().makeBasis(t, a, n), Ml = new THREE.Matrix4().makeBasis(tl, al, nl);
    joinBowl.quaternion.setFromRotationMatrix(Mw.multiply(Ml.transpose()));
    joinBowl.position.set(0, 0, 0); joinBowl.updateMatrixWorld(true);
    // rest B's lowest point on the foam, joint near the foam centre
    const bb = new THREE.Box3().setFromObject(shardB0 || joinBowl);
    const jp = joinBowl.localToWorld(bowlPt(63, 0.108));
    joinBowl.position.set(FOAM.x + 0.01 - jp.x, FOAM_TOP + 0.0005 - bb.min.y, FOAM.z + 0.02 - jp.z);
  }

  const shardCpivot = new THREE.Group(); joinBowl.add(shardCpivot);
  const shardC = mkShard(['C']); shardCpivot.add(shardC);
  // other loose shards on the foam (out of focus context): D, F, G, A (A is lifted in S014)
  const loose = new THREE.Group(); loose.name = 'loose'; props.add(loose);
  // a piece's surface centroid + mean outward normal (object space of the bowl), from its own subset geometry
  const pieceFrame = (name) => {
    const g = subGeo([name]), pos = g.attributes.position, nrm = g.attributes.normal, idx = g.index.array, c = V(0, 0, 0), n = V(0, 0, 0), q = V(0, 0, 0);
    const seeds = SHARD_LAYOUT, k0 = seeds.findIndex((x) => x[0] === name); let cnt = 0;
    for (let t = 0; t < idx.length; t++) { const i = idx[t]; q.fromBufferAttribute(pos, i);
      const d = seeds.map(([, cc, w]) => (q.x - cc[0]) ** 2 + (q.y - cc[1]) ** 2 + (q.z - cc[2]) ** 2 - w); if (d.indexOf(Math.min(...d)) !== k0) continue;
      const rr = Math.hypot(q.x, q.z), outer = nrm.getX(i) * q.x + nrm.getZ(i) * q.z > 0; if (!outer && rr > 0.01) continue;
      c.add(q); n.add(V(nrm.getX(i), nrm.getY(i), nrm.getZ(i))); cnt++; }
    return { c: c.multiplyScalar(1 / Math.max(1, cnt)), n: n.normalize() };
  };
  // lay a piece on a surface (outer face up, convex side up) at world xz, spun by yaw
  const layPiece = (name, x, z, yaw, topY) => {
    const holder = new THREE.Group(), inner = new THREE.Group(), m = mkShard([name]), f = pieceFrame(name);
    m.position.copy(f.c).negate(); inner.add(m); inner.quaternion.setFromUnitVectors(f.n, V(0, 1, 0));
    holder.add(inner); holder.rotation.y = yaw; holder.position.set(x, 0, z); holder.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m); holder.position.y = topY - bb.min.y + 0.0003; return holder;
  };
  for (const [n, x, z, yaw] of [['D', 0.02, -0.80, 0.4], ['F', -0.10, -0.74, 2.2], ['G', 0.235, -0.79, -0.8], ['E', 0.13, -0.81, 1.1]]) loose.add(layPiece(n, x, z, yaw, FOAM_TOP));
  // piece A (centre blossom + foot ring), loose: lies foot-down on the foam until S014
  const shardA = mkShard(['A']);
  const shardAholder = new THREE.Group(); shardAholder.name = 'shardA'; shardAholder.add(shardA); props.add(shardAholder);
  shardAholder.position.set(-0.08, FOAM_TOP, -0.64);
  // S015: the restored bowl (all but MISSING) standing in the sand tray
  const trayMats = { full: K.material(-1, { mode: 'missing', base: bowlBase, hide: ['MISSING'] }), noA: K.material(-1, { mode: 'missing', base: bowlBase, hide: ['MISSING', 'A'] }) };
  const restored = new THREE.Mesh(K.geometry, trayMats.full); restored.castShadow = restored.receiveShadow = true;
  const trayBowl = new THREE.Group(); trayBowl.name = 'trayBowl'; trayBowl.add(restored); tray.add(trayBowl);
  trayBowl.position.set(0.0, 0.05 - 0.012, 0.0);
  // tools: bamboo spatula, scalpel, brush, swabs, glue tube (no label), washi, glove box
  {
    const bamboo = new THREE.MeshStandardMaterial({ color: 0xc8a86a, roughness: 0.6 });
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.012), bamboo); sp.position.set(-0.13, BY + 0.0015, -0.52); sp.rotation.y = 0.5; sp.castShadow = true; props.add(sp);
    const sc = new THREE.Group(); sc.position.set(-0.17, BY + 0.004, -0.58); sc.rotation.y = 0.3; props.add(sc);
    const sch = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.3 })); sch.rotation.z = Math.PI / 2; sch.castShadow = true; sc.add(sch);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0008, 0.007), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 0.9, roughness: 0.15 })); bl.position.x = 0.074; sc.add(bl);
    const br = new THREE.Group(); br.position.set(0.30, BY + 0.005, -0.88); br.rotation.y = -0.4; props.add(br);
    const brh = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.004, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.5 })); brh.rotation.z = Math.PI / 2; brh.castShadow = true; br.add(brh);
    const brb = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9 })); brb.rotation.z = Math.PI / 2; brb.position.x = -0.095; br.add(brb);
    for (let k = 0; k < 4; k++) { const sw = new THREE.Group(); sw.position.set(0.36 + k * 0.012, BY + 0.003, -0.80 + k * 0.004); sw.rotation.y = 0.2 + k * 0.05; props.add(sw);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.075, 6), new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.8 })); st.rotation.z = Math.PI / 2; sw.add(st);
      for (const e of [-1, 1]) { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), st.material); tip.scale.set(1.6, 1, 1); tip.position.x = e * 0.038; sw.add(tip); } }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 16), new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.4 })); tube.rotation.z = Math.PI / 2; tube.position.set(0.40, BY + 0.009, -0.42); tube.rotation.y = 0.9; tube.castShadow = true; tube.name = 'tube'; props.add(tube);
    const washi = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9, transparent: true, opacity: 0.85 })); washi.rotation.x = -Math.PI / 2; washi.rotation.z = 0.2; washi.position.set(-0.30, BY + 0.0008, -0.40); props.add(washi);
    const gbox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.1), new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.7 })); gbox.position.set(0.95, BY + 0.035, -0.45); gbox.castShadow = true; props.add(gbox);
  }

  // ============================================================ HANDS (close-up, gloved) with coat sleeves
  const woolM = TX.mat('wool_coat', { repeat: [1.2, 1.2] });
  const handR = await loadCharacterHand('RESTORER', 'R', { lod: 'close' });
  const handL = await loadCharacterHand('RESTORER', 'L', { lod: 'close' });
  const toned = new Set();   // materials may be shared between cached hands: tone each once
  for (const h of [handR, handL]) {
    // coat sleeve continuing the library cuff stub up the forearm (hand space: forearm along +Y). Review: 0.36 m long and
    // capped, so the far end never shows as an open tube in frame (S012), slight taper wrist → elbow
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, 0.36, 28, 1, false), woolM);
    sl.position.y = 0.04 + 0.18; sl.castShadow = true; sl.receiveShadow = true; h.root.add(sl); h.root.userData.sleeve = sl;
    // warm-white cotton (#F1EFE8) sat just under the bloom threshold under the 3500 K key: ×0.74 keeps the weave and seams
    if (h.meshes.glove && h.meshes.glove.material.color && !toned.has(h.meshes.glove.material)) { toned.add(h.meshes.glove.material); h.meshes.glove.material.color.multiplyScalar(0.74); }
    h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    h.root.visible = false; scene.add(h.root);
  }
  // place a hand so that its pinch / index-pad point lands on `pt`
  const _v = new THREE.Vector3();
  function placeHandAt(h, pt, fingerDir, palmN, socket = 'pinch') {
    h.placeWrist([0, 0, 0], fingerDir, palmN);
    h.root.updateMatrixWorld(true);
    const p = socket === 'index' ? h.tip('index', _v) : socket === 'thumb' ? h.tip('thumb', _v) : h.sockets[socket].getWorldPosition(_v);
    h.root.position.add(pt.clone().sub(p)); h.root.updateMatrixWorld(true);
  }
  // review: anatomical variant — the forearm points back toward her (seated at the stool, leaning in), so the close-up
  // hands enter frame from her side instead of floating with arbitrary forearm directions. palmHint is orthogonalised.
  const SHO = { R: V(-0.17, 1.22, -1.20), L: V(0.21, 1.22, -1.20) };
  function placeArm(h, pt, palmHint, socket = 'pinch', o = {}) {
    const S = o.sho || SHO[h.side];
    const toPt = pt.clone().sub(S), hz = V(toPt.x, 0, toPt.z);
    const elbow = S.clone().add(V(0, -(o.drop ?? 0.26), 0)).addScaledVector(hz, o.reach ?? 0.3).add(V(h.side === 'R' ? -0.05 : 0.05, 0, 0));
    const fingers = pt.clone().sub(elbow).normalize();
    if (o.bend) fingers.addScaledVector(o.bend, 1).normalize();
    const pn = palmHint.clone().normalize(); pn.sub(fingers.clone().multiplyScalar(pn.dot(fingers))).normalize();
    placeHandAt(h, pt, fingers, pn, socket);
    return fingers;
  }

  // ============================================================ LEDGER (PROP_LEDGER: green buckram, ruled pages, dates & numbers only — illegible)
  const ledger = new THREE.Group(); ledger.name = 'ledger'; scene.add(ledger);
  const LEDGER = V(-0.30, BY, -0.93);
  ledger.position.copy(LEDGER).add(V(0, 0.075, 0)); ledger.rotation.set(-0.30, 0.12, 0, 'YXZ');
  { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.09, 0.26), new THREE.MeshStandardMaterial({ color: 0x5d6064, roughness: 0.95 }));   // grey foam book cradle
    cr.position.copy(LEDGER).add(V(0, 0.045, 0.01)); cr.rotation.y = 0.12; cr.castShadow = cr.receiveShadow = true; scene.add(cr); cr.name = 'cradle'; }
  // review: the foam cradle is a slab tilted with the book, just under its cover (its lower part sinks into the bench like a
  // wedge) — the upright box's top face used to swallow the near half of the tilted ledger
  function placeCradle(cr) { ledger.updateMatrixWorld(true); cr.quaternion.copy(ledger.quaternion);
    cr.position.copy(ledger.position).add(V(0, -0.046, 0).applyQuaternion(ledger.quaternion)); cr.updateMatrixWorld(true); }
  const ledgerPage = (seed, tickRow = -1) => {
    const W = 1024, H = 1448, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(seed);
    g.fillStyle = '#e6dcc4'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(150,120,80,${0.02 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 90, 10 + r() * 60, r() * 3, 0, 6.28); g.fill(); }
    const top = 150, rowH = 46; g.strokeStyle = 'rgba(70,110,140,0.45)'; g.lineWidth = 1.4;
    for (let y = top; y < H - 60; y += rowH) { g.beginPath(); g.moveTo(40, y); g.lineTo(W - 40, y); g.stroke(); }
    g.strokeStyle = 'rgba(170,60,50,0.45)'; for (const x of [140, 330, 520, 760]) { g.beginPath(); g.moveTo(x, 90); g.lineTo(x, H - 60); g.stroke(); }
    // pencil entries: short soft scribble clusters (number-shaped, never legible)
    g.strokeStyle = 'rgba(60,60,64,0.75)'; g.lineCap = 'round';
    const scrib = (x, y, n) => { for (let i = 0; i < n; i++) { const cx = x + i * (14 + r() * 4); g.lineWidth = 1.6 + r(); g.beginPath(); g.moveTo(cx, y - 6 - r() * 8); for (let j = 0; j < 3; j++) g.quadraticCurveTo(cx + (r() - 0.5) * 16, y - r() * 16, cx + (r() - 0.5) * 10, y - r() * 4); g.stroke(); } };
    let row = 0;
    for (let y = top + rowH * 0.8; y < H - 80; y += rowH, row++) { if (r() < 0.12) continue; scrib(60, y, 3); scrib(165, y, 6); scrib(350, y, 4 + (r() * 3 | 0)); if (r() < 0.7) scrib(540, y, 5); if (r() < 0.4) scrib(780, y, 3);
      if (row === tickRow) { g.lineWidth = 3; g.strokeStyle = 'rgba(50,50,55,0.9)'; g.beginPath(); g.moveTo(462, y - 12); g.lineTo(472, y - 2); g.lineTo(496, y - 30); g.stroke(); g.strokeStyle = 'rgba(60,60,64,0.75)'; } }
    const t = ctex(c); return t;
  };
  const ledgerPages = { plain: ledgerPage(301), ticked: ledgerPage(301, 13) };
  const pageM = new THREE.MeshStandardMaterial({ map: ledgerPages.plain, roughness: 0.85, side: THREE.DoubleSide });
  {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.006, 0.31), new THREE.MeshStandardMaterial({ color: hex(C.ledger), roughness: 0.8 }));
    cover.position.y = 0.003; cover.castShadow = cover.receiveShadow = true; ledger.add(cover);
    for (const sgn of [-1, 1]) {   // two pages curving up to the gutter
      const pg = new THREE.PlaneGeometry(0.205, 0.29, 16, 1); const pa = pg.attributes.position;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), t = (x + 0.1025) / 0.205, xg = sgn < 0 ? 1 - t : t; pa.setZ(i, 0.012 * Math.pow(1 - xg, 3) + 0.004 * Math.sin(xg * Math.PI)); }
      pg.computeVertexNormals();
      const m = new THREE.Mesh(pg, sgn < 0 ? pageM : new THREE.MeshStandardMaterial({ map: ledgerPage(302), roughness: 0.85, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.set(sgn * 0.1035, 0.0065, 0); m.receiveShadow = true; m.castShadow = true; ledger.add(m);
    }
  }
  // pencil (unlabelled graphite pencil, natural lacquer)
  const mkPencil = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 0.45 })); body.position.y = 0.09; g.add(body);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0006, 0.016, 6), new THREE.MeshStandardMaterial({ color: 0xd2b48a, roughness: 0.8 })); cone.position.y = 0.008; g.add(cone);
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0009, 0.004, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.3, roughness: 0.4 })); lead.rotation.x = Math.PI; lead.position.y = -0.0005; g.add(lead);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
  const pencilFig = mkPencil(), pencilHand = mkPencil(), pencilLoose = mkPencil(); scene.add(pencilLoose); pencilLoose.visible = false;

  // ============================================================ RESTORER (hi, gloves, coat) + head magnifier
  const R = await loadCharacter('RESTORER', { lod: 'hi' });
  scene.add(R.root);
  R.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const side of ['L', 'R']) { const g = R.hands[side] && R.hands[side].meshes.glove; if (g && g.material.color && !toned.has(g.material)) { toned.add(g.material); g.material.color.multiplyScalar(0.72); } }
  const hu = R.P.hu;
  const loupe = new THREE.Group(); loupe.name = 'loupe';
  {
    const black = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.5, metalness: 0.2 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.43 * hu, 0.022 * hu, 8, 48), black); band.rotation.x = Math.PI / 2 - 0.35; band.position.set(0, 0.62 * hu, -0.08 * hu); band.scale.set(0.84, 1.0, 1); loupe.add(band);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.32 * hu, 0.09 * hu, 0.05 * hu), black); pad.position.set(0, 0.70 * hu, 0.30 * hu); pad.rotation.x = -0.3; loupe.add(pad);
    // visor hinged at the temples, swung down in front of the eyes
    const visor = new THREE.Group(); visor.position.set(0, 0.58 * hu, 0.33 * hu); loupe.add(visor); loupe.userData.visor = visor;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62 * hu, 0.035 * hu, 0.035 * hu), black); arm.position.set(0, -0.02 * hu, 0.06 * hu); visor.add(arm);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.03 * hu, 0.2 * hu, 0.03 * hu), black); st.position.set(sx * 0.31 * hu, -0.1 * hu, 0.02 * hu); visor.add(st); }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58 * hu, 0.15 * hu, 0.06 * hu), black); plate.position.set(0, -0.2 * hu, 0.22 * hu); visor.add(plate);
    const lensM = new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: 0.02, metalness: 0.1, clearcoat: 1, envMapIntensity: 2.2 });
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * hu, 0.075 * hu, 0.07 * hu, 24), lensM); l.rotation.x = Math.PI / 2; l.position.set(sx * 0.15 * hu, -0.2 * hu, 0.255 * hu); visor.add(l); }
    loupe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    R.bone('head').add(loupe);
  }
  const STOOL = V(0.02, 0, -1.44);
  // seated at the bench, leaning in (pure function of the params)
  function poseSeated(o = {}) {
    R.root.position.copy(STOOL).add(V(o.dx || 0, 0, o.dz || 0)); R.root.rotation.set(0, o.yaw || 0, 0);
    R.pose('sit_chair', { seat: 0.625, lean: o.lean ?? 0.55, feet: 0.12, hands: 'none' });
    const hb = o.hipBend || 0;
    R.pose({ 'hips.x': hb, 'legL.upper.x': -hb, 'legR.upper.x': -hb, 'spine.x': o.spine ?? 0.10, 'chest.x': o.chest ?? 0.12, 'neck.x': o.neck ?? 0.18, 'head.x': o.head ?? 0.16, 'head.y': o.headY || 0, 'armL.clav.z': 0.05, 'armR.clav.z': 0.05 }, { add: true });
    R.root.updateMatrixWorld(true);
  }

    // ============================================================ SHOT SETUPS
  const show = (o, v) => { if (o) o.visible = v; };
  const cheapTray = bowlBase;

  // ============================================================ BR1 PROPS: rattan case (museum state), lining, comb, shirt, sleeve,
  // letter (front / back / macro patch), blotter, bamboo tweezers, handheld magnifier
  const br1 = new THREE.Group(); br1.name = 'br1'; scene.add(br1);
  // --- rattan case 58 × 38 × 21 cm (base 15 + lid 6), lying flat, handle face toward her (−Z)
  const CASE = { L: 0.58, D: 0.38, hb: 0.15, hl: 0.06, t: 0.012 };
  const caseG = new THREE.Group(); caseG.name = 'case'; br1.add(caseG);
  const caseLid = new THREE.Group(); caseG.add(caseLid);
  const handleG = new THREE.Group(); caseG.add(handleG);
  const caseInner = new THREE.Group(); caseG.add(caseInner);
  {
    const ratt = TX.mat('rattan', { repeat: [5, 3.5], tex: { tone: 'honey', age: 0.9 }, color: hex('#b4a796') });
    const rattDark = TX.mat('rattan', { repeat: [3, 0.6], tex: { tone: 'dark', age: 1.0 }, color: hex('#8a7058') });
    const liningT = (() => { const W = 512, c = canvas(W, W), g = c.getContext('2d'), r = util.rng(77); g.fillStyle = C.lining; g.fillRect(0, 0, W, W);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(20,30,50,${0.04 + r() * 0.05})`; g.fillRect(r() * W, r() * W, 2, 6 + r() * 20); }
      for (let y = 16; y < W; y += 32) for (let x = (y / 32 % 2) * 16 + 8; x < W; x += 32) { const xx = x + (r() - 0.5) * 4, yy = y + (r() - 0.5) * 4; g.fillStyle = `rgba(230,224,210,${0.75 + r() * 0.2})`;
        for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + 0.4; g.beginPath(); g.ellipse(xx + Math.cos(a) * 3.2, yy + Math.sin(a) * 3.2, 2.6, 1.5, a, 0, 6.283); g.fill(); } g.beginPath(); g.arc(xx, yy, 1.1, 0, 6.283); g.fill(); }
      const t = ctex(c, true, true); t.repeat.set(5, 4); return t; })();
    const lining = new THREE.MeshStandardMaterial({ map: liningT, roughness: 0.9 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.75 });
    const box = (w, h, d, m, x, y, z, parent = caseG) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
    const { L, D, hb, hl, t } = CASE;
    // base: bottom + 4 walls (rattan outside, lining inside as thin inner panels)
    box(L, t, D, ratt, 0, t / 2, 0);
    box(L, hb, t, ratt, 0, hb / 2, -D / 2 + t / 2); box(L, hb, t, ratt, 0, hb / 2, D / 2 - t / 2);
    box(t, hb, D, ratt, -L / 2 + t / 2, hb / 2, 0); box(t, hb, D, ratt, L / 2 - t / 2, hb / 2, 0);
    box(L - 2 * t - 0.002, 0.002, D - 2 * t - 0.002, lining, 0, t + 0.001, 0, caseInner);
    box(L - 2 * t, hb - t, 0.002, lining, 0, t + (hb - t) / 2, -D / 2 + t + 0.001, caseInner); box(L - 2 * t, hb - t, 0.002, lining, 0, t + (hb - t) / 2, D / 2 - t - 0.001, caseInner);
    box(0.002, hb - t, D - 2 * t, lining, -L / 2 + t + 0.001, t + (hb - t) / 2, 0, caseInner); box(0.002, hb - t, D - 2 * t, lining, L / 2 - t - 0.001, t + (hb - t) / 2, 0, caseInner);
    // lid (pivot at the back top edge, +Z side = hinge, away from her)
    caseLid.position.set(0, hb, D / 2);
    box(L, t, D, ratt, 0, hl - t / 2, -D / 2, caseLid);
    box(L, hl, t, ratt, 0, hl / 2, -D + t / 2, caseLid); box(L, hl, t, ratt, 0, hl / 2, -t / 2, caseLid);
    box(t, hl, D, ratt, -L / 2 + t / 2, hl / 2, -D / 2, caseLid); box(t, hl, D, ratt, L / 2 - t / 2, hl / 2, -D / 2, caseLid);
    box(L - 2 * t, 0.002, D - 2 * t, lining, 0, hl - t - 0.001, -D / 2, caseLid);
    // leather corner caps (base + lid)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(0.05, 0.05, 0.05, leather, sx * (L / 2 - 0.022), 0.022, sz * (D / 2 - 0.022));
      box(0.05, 0.04, 0.05, leather, sx * (L / 2 - 0.022), hl - 0.018, -D / 2 + sz * (D / 2 - 0.022), caseLid);
    }
    // broken corner (front right of the lid): split rattan strips lifting
    for (let k = 0; k < 5; k++) { const st = box(0.004, 0.0015, 0.05 + k * 0.006, rattDark, L / 2 - 0.05 - k * 0.006, hl + 0.004 + k * 0.002, -D + 0.04, caseLid); st.rotation.x = -0.25 - k * 0.07; st.rotation.y = 0.2 * (k - 2); }
    // leather hinge straps at the back
    for (const sx of [-0.18, 0.18]) box(0.05, 0.03, 0.004, leather, sx, hb - 0.005, D / 2 + 0.002);
    // two straps over the lid, unbuckled: lying on the lid and hanging down the front, cracked and dark
    const strapM = new THREE.MeshStandardMaterial({ color: hex(C.strap).multiplyScalar(0.7), roughness: 0.8 });
    const buckleM = new THREE.MeshStandardMaterial({ color: hex(C.buckle).multiplyScalar(0.7), metalness: 0.8, roughness: 0.45 });
    for (const sx of [-0.17, 0.17]) {
      box(0.032, 0.003, D + 0.004, strapM, sx, hl + 0.0015, -D / 2, caseLid);
      const hang = box(0.032, 0.07, 0.003, strapM, sx, hl - 0.032, -D - 0.003, caseLid); hang.rotation.x = 0.12;
      const bk = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0022, 6, 16), buckleM); bk.scale.set(1.15, 0.8, 1); bk.position.set(sx, 0.05, -D / 2 - 0.004); bk.castShadow = true; caseG.add(bk);
      box(0.032, 0.05, 0.003, strapM, sx, 0.075, -D / 2 - 0.0025);
    }
    // handle (front face of the base): two leather tabs + rattan-wrapped cane bar, hand-sweat dark, frayed
    handleG.position.set(0, 0.085, -D / 2 - 0.012);
    for (const sx of [-0.068, 0.068]) { const tab = box(0.022, 0.05, 0.012, leather, sx, 0.0, 0.006, handleG); }
    // integration: the SAME helical rattan wrap as map_office S048's new handle (≈ 36 turns ROUND the bar — the old texture
    // ran its bands along the bar and read as a smooth wooden dowel, newer than the new one), now sweat-darkened, polished
    // where the fingers sat, frayed strip ends and one broken binding near the right tab
    const barT = (() => { const Wu = 256, Hv = 1024, c = canvas(Wu, Hv), g = c.getContext('2d'), r = util.rng(66); g.fillStyle = '#2e1e12'; g.fillRect(0, 0, Wu, Hv);
      const N = 36, bh = Hv / N;
      for (let k = -1; k <= N; k++) {
        const y0 = k * bh, worn = Math.exp(-(((k - N * 0.5) / (N * 0.28)) ** 2)), sh = (0.7 + 0.18 * r()) * (1 - 0.35 * worn);
        const grd = g.createLinearGradient(0, y0, 0, y0 + bh);
        grd.addColorStop(0, `rgb(${Math.round(92 * sh)},${Math.round(62 * sh)},${Math.round(36 * sh)})`); grd.addColorStop(0.4, `rgb(${Math.round(128 * sh + 30 * worn)},${Math.round(90 * sh + 20 * worn)},${Math.round(52 * sh + 10 * worn)})`);
        grd.addColorStop(1, `rgb(${Math.round(78 * sh)},${Math.round(52 * sh)},${Math.round(30 * sh)})`);
        g.save(); g.transform(1, bh / Wu, 0, 1, 0, 0); g.fillStyle = grd; g.fillRect(0, y0 + 1.0, Wu, bh - 2.0);
        for (let f = 0; f < 7; f++) { g.strokeStyle = `rgba(${r() < 0.5 ? '170,128,80' : '30,18,10'},${0.15 + r() * 0.25})`; g.lineWidth = 0.8; const yy = y0 + 3 + r() * (bh - 6); g.beginPath(); g.moveTo(0, yy); g.lineTo(Wu, yy); g.stroke(); }
        g.restore();
      }
      // the broken binding (two strips lifted near one end) + frayed fibre ends
      g.fillStyle = '#1a1009'; g.fillRect(0, Hv * 0.86, Wu, bh * 0.7);
      for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(160,120,74,${0.35 + r() * 0.4})`; g.lineWidth = 0.9; const x = r() * Wu, y = Hv * (0.85 + r() * 0.05); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 10, y + 6 + r() * 14); g.stroke(); }
      const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.15, 32, 1), new THREE.MeshStandardMaterial({ map: barT, roughness: 0.42, color: hex('#ffffff') }));
    bar.rotation.z = Math.PI / 2; bar.position.set(0, -0.012, -0.008); bar.castShadow = true; handleG.add(bar);
    caseG.userData.bar = bar;
    // contents: folded shirt (museum colour, hem corner cut), comb on its unwrapped red-brown cloth, sleeve + letter under the shirt
    const shirtM = TX.mat('shirt', { repeat: [1.2, 1.2], tex: { tone: 'shirtMuseum', creases: 0.8 }, color: hex('#b4bfcc') });
    const shirt = new THREE.Group(); shirt.position.set(0.04, t + 0.02, 0.01); caseInner.add(shirt); caseG.userData.shirt = shirt;
    { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.03, 0.22), shirtM); sb.castShadow = sb.receiveShadow = true; shirt.add(sb);
      // integration: it read as a flat grey board — a folded collar (two soft flaps) and one horn button on the top fold
      const colM = shirtM.clone(); colM.color = hex('#a7b2be');
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.045), colM); f.position.set(-0.11 + sx * 0.03, 0.018, -0.06); f.rotation.set(0.08, sx * 0.55, sx * 0.06); f.castShadow = true; shirt.add(f); }
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.002, 16), new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.35 })); btn.position.set(-0.08, 0.0165, -0.01); shirt.add(btn);
      for (const z of [-0.035, 0.04]) { const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.29, 8), shirtM); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 0.015, z); shirt.add(ridge); }
      const cut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.032, 3), lining); cut.rotation.y = 0.5; cut.position.set(0.15, 0.0, 0.11); shirt.add(cut); }
    const comb = new THREE.Group(); caseInner.add(comb); caseG.userData.comb = comb;
    { const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15, 6, 6), new THREE.MeshStandardMaterial({ color: hex(C.combCloth).lerp(hex('#5e5450'), 0.62).multiplyScalar(0.72), roughness: 0.92, side: THREE.DoubleSide }));
      const pa = cl.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, 0.002 * Math.sin(pa.getX(i) * 60) * Math.cos(pa.getY(i) * 40)); cl.geometry.computeVertexNormals();
      cl.rotation.x = -Math.PI / 2; cl.receiveShadow = true; comb.add(cl);
      const sh = new THREE.Shape(); const cw = 0.095, ch = 0.05; sh.moveTo(-cw / 2, 0); sh.quadraticCurveTo(0, ch * 0.62, cw / 2, 0);
      for (let k = 34; k >= 0; k--) { const x = -cw / 2 + cw * k / 34; sh.lineTo(x, -ch * 0.38 + (k === 9 || k === 22 ? 0.006 : 0)); sh.lineTo(x - cw / 34 * 0.5, -ch * 0.38); sh.lineTo(x - cw / 34 * 0.5, -0.004); }
      sh.lineTo(-cw / 2, 0);
      const cm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.005, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: hex(C.comb).multiplyScalar(0.8), roughness: 0.45 }));
      cm.rotation.x = -Math.PI / 2; cm.position.set(0, 0.002, 0.012); cm.castShadow = true; comb.add(cm);
      cm.material.color.set('#c9a36a'); cm.material.roughness = 0.38; }   // integration: boxwood (it read as a yellow half-disc)
  }
  // --- letter textures
  const letterS = letterStrokes(util.rng(1907));
  const letterTex = (() => {
    const k = 150, W = Math.round(LET.w * k), H = Math.round(LET.h * k), c = canvas(W, H), g = c.getContext('2d');
    drawPaper(g, W, H, k, 0, 0, util.rng(5)); drawStrokes(g, letterS, k, 0, 0, 1);
    return ctex(c);
  })();
  // integration (S052): the front's brushwork blurred and at half contrast — crisp pseudo-hanzi read as real-but-wrong characters
  const letterTexSoft = (() => { const src = letterTex.image, c = canvas(src.width, src.height), g = c.getContext('2d');
    g.filter = 'blur(16px)'; g.drawImage(src, 0, 0); g.filter = 'none'; g.globalAlpha = 0.5; g.fillStyle = '#e4d9c0'; g.fillRect(0, 0, c.width, c.height); return ctex(c); })();
  const letterBackTex = (() => {    // back: blank paper, mirrored show-through of the brushwork, pressed jasmine in the margin fold
    const k = 90, W = Math.round(LET.w * k), H = Math.round(LET.h * k), c = canvas(W, H), g = c.getContext('2d');
    drawPaper(g, W, H, k, 0, 0, util.rng(6), { rules: false, mirror: true, foxing: 0.8 });
    const st = canvas(W, H), sg = st.getContext('2d'); sg.translate(W, 0); sg.scale(-1, 1); drawStrokes(sg, letterS, k, 0, 0, 1, null, [40, 34, 28]);
    g.save(); g.globalAlpha = 0.13; g.filter = 'blur(1.6px)'; g.drawImage(st, 0, 0); g.restore();
    // the unfinished last column reads a little stronger (ink soaked through where the brush pressed)
    g.save(); g.globalAlpha = 0.12; g.filter = 'blur(1px)'; g.beginPath(); g.rect((LET.w - LET.colX(7) - LET.cw * 0.6) * k, 0, LET.cw * 1.2 * k, H); g.clip(); g.drawImage(st, 0, 0); g.restore();
    return ctex(c);
  })();
  // S051 macro patch around the broken stroke (300 px/cm, same strokes): 6 × 4 cm
  // (review: clamped inside the sheet — it used to start 1.6 cm beyond the left page edge and hung over the blotter)
  const PATCH = { x0: Math.max(0.02, LET.broken[0] - 2.4), y0: LET.broken[1] - 2.2, w: 6, h: 4.4 };
  const letterPatchTex = (() => {
    const k = 300, W = PATCH.w * k, H = PATCH.h * k, c = canvas(W, H), g = c.getContext('2d');
    drawPaper(g, W, H, k, PATCH.x0, PATCH.y0, util.rng(9)); drawStrokes(g, letterS, k, PATCH.x0, PATCH.y0, 1);
    return ctex(c);
  })();
  // review: fibre relief for the S051 raking light ("纸纤维像细小的河流"): a height field of long, slightly wavy bamboo fibres
  // (mostly along the sheet's grain = page vertical) + fine felt, Sobel → tangent-space normal map (linear), 150 px/cm
  const letterPatchNrm = (() => {
    const k = 150, W = PATCH.w * k, H = Math.round(PATCH.h * k), c = canvas(W, H), g = c.getContext('2d'), r = util.rng(31);
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) { const x = r() * W, y = r() * H, L = (0.2 + r() * 0.9) * k, a = Math.PI / 2 + (r() - 0.5) * 0.7, w = 0.6 + r() * 1.6;
      g.strokeStyle = r() < 0.6 ? `rgba(255,255,255,${0.05 + r() * 0.1})` : `rgba(0,0,0,${0.04 + r() * 0.08})`; g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
    const img = g.getImageData(0, 0, W, H), d = img.data, out = g.createImageData(W, H), o = out.data, hgt = (x, y) => d[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * 2.2, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * 2.2, n = 1 / Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
      o[i] = (-dx * n * 0.5 + 0.5) * 255; o[i + 1] = (dy * n * 0.5 + 0.5) * 255; o[i + 2] = (n * 0.5 + 0.5) * 255; o[i + 3] = 255; }
    g.putImageData(out, 0, 0); return ctex(c, false);
  })();
  // --- letter mesh (17 × 25 cm, fold valleys modelled), front + back sharing one geometry; uCurl bends it for the flip
  const foldZ = (x, y) => {   // cm → cm: fold valleys (three-fold, then half-fold) + the soft panels between them
    let z = 0;
    for (const fy of [LET.h / 3, LET.h * 2 / 3]) z -= 0.05 * Math.exp(-Math.pow((y - fy) / 0.35, 2));
    z -= 0.035 * Math.exp(-Math.pow((x - LET.w / 2) / 0.35, 2));
    z += 0.04 * Math.sin(Math.PI * (((y % (LET.h / 3)) + LET.h / 3) % (LET.h / 3)) / (LET.h / 3)) * 0.5;
    return z;
  };
  const letterGeo = (() => {
    const g = new THREE.PlaneGeometry(LET.w / 100, LET.h / 100, 34, 50), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i) * 100 + LET.w / 2, y = LET.h / 2 - pa.getY(i) * 100;     // cm, y down from the top
      pa.setZ(i, foldZ(x, y) / 100);
    }
    g.computeVertexNormals(); return g;
  })();
  const curlU = { value: 0 };
  const letterM = new THREE.MeshStandardMaterial({ map: letterTex, roughness: 0.88, side: THREE.DoubleSide });
  letterM.onBeforeCompile = (sh) => {
    sh.uniforms.uCurl = curlU; sh.uniforms.backMap = { value: letterBackTex };
    sh.vertexShader = 'uniform float uCurl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += uCurl * (1.0 - cos(3.14159 * transformed.x / 0.17)) * 0.5;');
    sh.fragmentShader = 'uniform sampler2D backMap;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      '#ifdef USE_MAP\n vec4 sampledDiffuseColor = gl_FrontFacing ? texture2D(map, vMapUv) : texture2D(backMap, vec2(1.0 - vMapUv.x, vMapUv.y));\n diffuseColor *= sampledDiffuseColor;\n#endif');
  };
  letterM.customProgramCacheKey = () => 'letter2side';
  const letter = new THREE.Group(); letter.name = 'letter'; br1.add(letter);
  const letterInner = new THREE.Group(); letter.add(letterInner);          // flip about the long axis happens here
  const lf = new THREE.Mesh(letterGeo, letterM);
  lf.rotation.x = -Math.PI / 2; lf.castShadow = true; lf.receiveShadow = true; letterInner.add(lf);
  const patchGeo = (() => {   // follows the sheet's fold relief (a flat patch floated over the 2/3 fold valley at grazing angles)
    const g = new THREE.PlaneGeometry(PATCH.w / 100, PATCH.h / 100, 30, 44), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = PATCH.x0 + PATCH.w / 2 + pa.getX(i) * 100, y = PATCH.y0 + PATCH.h / 2 - pa.getY(i) * 100; pa.setZ(i, (foldZ(x, y) + 0.006) / 100); }
    g.computeVertexNormals(); return g;
  })();
  const patchMesh = new THREE.Mesh(patchGeo, new THREE.MeshStandardMaterial({ map: letterPatchTex, normalMap: letterPatchNrm, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.86, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  patchMesh.rotation.x = -Math.PI / 2; patchMesh.position.set((PATCH.x0 + PATCH.w / 2 - LET.w / 2) / 100, 0, (PATCH.y0 + PATCH.h / 2 - LET.h / 2) / 100); patchMesh.visible = false; letterInner.add(patchMesh);
  // pressed jasmine on the back, in the 2/3 fold beside the show-through of the broken column (back space: x mirrored)
  const JAS = { x: LET.w - LET.broken[0] + 0.85, y: LET.h * 2 / 3 + 0.15 };
  const jasmine = (() => {
    // pressed Jasminum sambac, browned (#A88A5A): two whorls of thin overlapping oval petals, translucent where single,
    // darker where they overlap, fine veins, a dark calyx and a short stem (review: was a 6-point star)
    const W = 512, c = canvas(W, W), g = c.getContext('2d'), r = util.rng(88), cx = W / 2, cy = W / 2;
    const petal = (a, L, wd, al, tone) => {
      g.save(); g.translate(cx, cy); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, `rgba(${tone[0] - 40},${tone[1] - 36},${tone[2] - 26},${al})`); gr.addColorStop(0.55, `rgba(${tone},${al * 0.8})`); gr.addColorStop(1, `rgba(${tone[0] + 18},${tone[1] + 18},${tone[2] + 14},${al * 0.45})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(L * 0.5, 0, L * 0.5, wd, 0, 0, 6.283); g.fill();
      g.strokeStyle = `rgba(110,82,48,${al * 0.5})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L * 0.08, 0); g.quadraticCurveTo(L * 0.5, wd * 0.12 * (r() - 0.5), L * 0.92, 0); g.stroke();
      for (let k = 0; k < 3; k++) { g.lineWidth = 0.8; g.beginPath(); g.moveTo(L * (0.2 + k * 0.15), 0); g.lineTo(L * (0.45 + k * 0.15), (k % 2 ? 1 : -1) * wd * 0.55); g.stroke(); }
      g.restore();
    };
    // integration: a soft drop shadow under the petals (raking lamp) + more opaque, lighter-edged petals — it read as a burn stain
    g.save(); g.filter = 'blur(6px)'; g.globalAlpha = 0.35; g.fillStyle = 'rgb(70,52,30)'; g.beginPath(); g.arc(cx + 10, cy + 12, 160, 0, 6.283); g.fill(); g.restore();
    for (let q = 0; q < 8; q++) petal(q / 8 * Math.PI * 2 + 0.2 + (r() - 0.5) * 0.25, 150 + r() * 30, 46 + r() * 10, 0.86, [170, 138, 90]);
    for (let q = 0; q < 6; q++) petal(q / 6 * Math.PI * 2 + 0.55 + (r() - 0.5) * 0.3, 105 + r() * 20, 38 + r() * 8, 0.9, [146, 114, 70]);
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, 34); cg.addColorStop(0, 'rgba(78,58,34,0.95)'); cg.addColorStop(1, 'rgba(110,84,50,0)');
    g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 34, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(88,68,40,0.8)'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 6, cy + 10); g.quadraticCurveTo(cx + 34, cy + 110, cx + 18, cy + 236); g.stroke();
    const t = ctex(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.042), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.x = Math.PI / 2; m.rotation.z = 0.5;
    // back face of the sheet is local −Y after the −90° X rotation: place just below
    m.position.set((LET.w / 2 - JAS.x) / 100, -0.0006, (JAS.y - LET.h / 2) / 100);
    m.renderOrder = 2; letterInner.add(m); return m;
  })();
  // clear polyester sleeve (S049/S050)
  const sleeveM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.12, depthWrite: false, side: THREE.DoubleSide });   // (review: a softer glint; the mirror-flat sleeve washed the sheet white)
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(LET.w / 100 + 0.02, 0.0012, LET.h / 100 + 0.02), sleeveM); sleeve.renderOrder = 3; br1.add(sleeve);
  // grey conservation blotter
  const BLOT = V(0.02, BY, -0.80);
  const blotter = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.003, 0.34), new THREE.MeshStandardMaterial({ color: 0x7c7f82, roughness: 0.97, normalMap: foamM.normalMap, normalScale: new THREE.Vector2(0.25, 0.25) }));
  blotter.position.copy(BLOT).add(V(0, 0.0015, 0)); blotter.receiveShadow = true; br1.add(blotter);
  // bamboo tweezers (two slats joined at the top)
  const tweezers = new THREE.Group();
  { const bm = new THREE.MeshStandardMaterial({ color: 0xcdb27a, roughness: 0.55 });
    for (const sgn of [-1, 1]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.15, 0.0016), bm); sl.position.set(sgn * 0.0028, 0.07, 0); sl.rotation.z = -sgn * 0.022; sl.castShadow = true; tweezers.add(sl); } }
  // handheld magnifier: Ø 7.5 cm lens in a black rim, black handle. The lens shows a magnified render of what is behind
  // it (main camera with a zoomed view offset into an RT); it writes the depth of what it shows, so the DOF treats the
  // magnified eye at the eye's distance (focus pull flower → eye works through the glass).
  const magRT = ctx.makeRT(512, 512);
  const magCam = new THREE.PerspectiveCamera(20, 1, 0.005, 5); magCam.layers.set(2);   // S054 glass view: sheet + flower + lights only
  const magU = { tMag: { value: magRT.texture }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uR: { value: new THREE.Vector2(0.1, 0.2) }, uDepth: { value: 0.5 }, uHalo: { value: 0 }, uRes: { value: new THREE.Vector2(ctx.W, ctx.H) }, uTint: { value: new THREE.Color(0.93, 0.95, 0.97) } };
  const magnifier = new THREE.Group(); magnifier.name = 'magnifier';
  const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.0375, 48), new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: magU, transparent: false,
    vertexShader: 'out vec3 vN; out vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `precision highp float; in vec3 vN; in vec3 vV; out vec4 oc; uniform sampler2D tMag; uniform vec2 uC, uR, uRes; uniform float uDepth, uHalo; uniform vec3 uTint;
      void main(){ vec2 s = gl_FragCoord.xy / uRes; vec2 q = (s - uC) / uR; float rr = length(q);
        vec2 uv = q * 0.5 + 0.5; vec3 c = texture(tMag, uv).rgb * uTint;
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        c += vec3(0.06, 0.07, 0.09) * fr + vec3(0.02) * smoothstep(0.75, 1.0, rr);
        c *= 1.0 - 0.35 * smoothstep(0.82, 1.0, rr);                 // edge darkening of a thick lens
        oc = vec4(c, 1.0); gl_FragDepth = uDepth; }`,
  }));
  magnifier.add(lensMesh);
  const rimM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.4 });
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0035, 10, 64), rimM); rimMesh.castShadow = true; magnifier.add(rimMesh);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0075, 0.11, 16), rimM); handle.position.set(0, -0.039 - 0.055, 0); handle.castShadow = true; magnifier.add(handle);
  // spectral halo where the tilted rim breaks the lamp light (soft, pastel, short — never a streak flare)
  const haloU = { uI: { value: 0 }, uA: { value: 0.6 } };
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.06, 64, 1), new THREE.ShaderMaterial({ uniforms: haloU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vP; uniform float uI, uA;
      vec3 spec(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){ float r = length(vP); float t = (r - 0.03) / 0.03; float a = atan(vP.y, vP.x);
        float band = exp(-pow((t - 0.58) / 0.2, 2.0));
        float arc = exp(-pow(mod(a - uA + 3.14159, 6.28318) - 3.14159, 2.0) / 0.28);      // brightest on the upper-right arc
        vec3 sp = t < 0.5 ? mix(vec3(0.60, 0.27, 0.27), vec3(0.79, 0.57, 0.25), t * 2.0) : mix(vec3(0.79, 0.57, 0.25), vec3(0.20, 0.33, 0.56), t * 2.0 - 1.0);
        vec3 col = sp * 1.6;  // muted ruby → amber → cobalt (P23 / P24 / P25)
        gl_FragColor = vec4(col * band * arc * uI, 1.0); }` }));
  halo.renderOrder = 30; magnifier.add(halo);
  // the lens's caustic on the paper (S054 end, "落在信纸上"): a warm focused core with a soft prismatic fringe — muted ruby
  // outside, amber, cobalt inside (P23/P24/P25); additive on the sheet
  const caustic = new THREE.Mesh(new THREE.CircleGeometry(0.05, 64), new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 }, uA: { value: 0 } }, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy / 0.05; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vP; uniform float uI;
      void main(){ float r = length(vP);
        float core = exp(-r * r / 0.03) * 0.6 + exp(-r * r / 0.3) * 0.08;
        vec3 ring = vec3(0.62, 0.10, 0.14) * exp(-pow((r - 0.88) / 0.05, 2.0)) + vec3(0.66, 0.42, 0.04) * exp(-pow((r - 0.76) / 0.05, 2.0))
                  + vec3(0.06, 0.20, 0.66) * exp(-pow((r - 0.62) / 0.05, 2.0));
        vec3 c = core * vec3(1.0, 0.78, 0.5) + ring * 1.1; c = max(c - 0.12 * dot(ring, vec3(0.33)), 0.0);
        gl_FragColor = vec4(c * uI * smoothstep(1.0, 0.9, r), 1.0); }` }));
  caustic.rotation.x = -Math.PI / 2; caustic.renderOrder = 29; br1.add(caustic);
  // S054 (integration): the pastel ring parked in screen space for the light cut into S055 (muted ruby → amber → cobalt)
  const haloRingU = { uI: { value: 0 } };
  const haloRing = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.ShaderMaterial({ uniforms: haloRingU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy / 0.1; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vP; uniform float uI;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x);
        vec3 ring = vec3(0.62, 0.20, 0.22) * exp(-pow((r - 0.62) / 0.07, 2.0)) + vec3(0.72, 0.52, 0.18) * exp(-pow((r - 0.52) / 0.07, 2.0)) + vec3(0.18, 0.30, 0.62) * exp(-pow((r - 0.42) / 0.07, 2.0));
        float arc = 0.55 + 0.45 * cos(a - 0.8);                                   // brighter toward the upper right
        vec3 c = ring * arc + vec3(1.0, 0.85, 0.65) * 0.12 * exp(-r * r / 0.05);
        gl_FragColor = vec4(c * uI * smoothstep(1.0, 0.85, r), 1.0); }` }));
  haloRing.renderOrder = 31; haloRing.visible = false; br1.add(haloRing);
  br1.add(magnifier);
  for (const o of [lf, jasmine, blotter, lampLight, hemi, benchBounce, moonWL.light]) o.layers.enable(2);   // visible to magCam (S054)

  // look from pos so that world point p lands at frame (fx, fy) (y from the top)
  const frameAt = (pos, p, fx, fy, mm, roll = 0) => {
    cam.lens(camera, mm); cam.place(camera, pos, p);
    const vf = camera.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    camera.rotateY((fx - 0.5) * hf); camera.rotateX(-(0.5 - fy) * vf); if (roll) camera.rotateZ(roll);
    camera.updateMatrixWorld();
  };
  const scr = (p) => { const q = p.clone().project(camera); return [+(q.x * 0.5 + 0.5).toFixed(3), +(0.5 - q.y * 0.5).toFixed(3)]; };
  const DBGP = {};   // name → world point, printed with ?off=pts
  // per-shot visibility / prop state (pure function of the shot's flags)
  const state = (s) => {
    faceFill.visible = false; faceFill.color.set('#ffd9b8'); faceFill.angle = 0.55; letterM.map = letterTex; lampG.visible = !s.noLampBody; shelfLight.visible = !!s.fig;
    wallWash.visible = !!s.wash; coolFill.visible = !!s.cool; if (s.cool) coolFill.intensity = s.cool;
    for (const m of [shardB.material, shardC.material]) { m.envMapIntensity = 0.7; m.clearcoatRoughness = 0.08; }
    setMoon(s.br1 ? [0.3, -0.8, -0.52] : [-0.32, -0.78, -0.53]);   // PRE1 moon SE high, BR1 late SW (was only set by BR1 shots: impure)
    moonWL.light.visible = !s.noMoon; hemi.intensity = s.hemi ?? 0.15; lampLight.castShadow = !s.noLampShadow; benchBounce.visible = !s.noBounce;
    { const tb = props.getObjectByName('tube'); if (tb) tb.visible = !s.noTube; }
    moonWL.light.castShadow = !!s.moonShadow;                 // sash-bar shadows only where they read (cost: a 2nd shadow pass)
    show(handR.root, !!s.handR); show(handL.root, !!s.handL); show(R.root, !!s.fig); show(loupe, !!s.fig && !!s.loupe);
    show(props, s.pre !== false);
    show(joinBowl, s.join !== false); show(loose, s.loose !== false); show(shardAholder, s.A !== false);
    show(trayBowl, s.tray !== false); restored.material = s.cheapTray ? cheapTray : s.trayNoA ? trayMats.noA : trayMats.full;
    show(br1, !!s.br1); show(caseG, s.case !== false); show(letter, s.letter !== false); show(sleeve, !!s.sleeve);
    show(magnifier, !!s.mag); show(caustic, !!s.mag); haloRing.visible = false; show(tweezers, !!s.tweezers); show(pencilHand, !!s.pencilHand); show(pencilLoose, !!s.pencilLoose);
    show(pencilFig, !!s.pencilFig); patchMesh.visible = !!s.patch;
    pageM.map = s.ticked ? ledgerPages.ticked : ledgerPages.plain; ledger.visible = !s.noLedger; const cr = scene.getObjectByName('cradle'); if (cr) cr.visible = !s.noLedger;
    // defaults for every shared prop a shot may move (setShot is pure: frames render out of order)
    ledger.position.copy(LEDGER).add(V(0, 0.075, 0)); ledger.rotation.set(-0.30, 0.12, 0, 'YXZ'); ledger.updateMatrixWorld(true);
    if (cr) placeCradle(cr);
    caseG.userData.shirt.position.set(0.04, CASE.t + 0.02, 0.01); caseG.userData.shirt.rotation.set(0, 0, 0);
    caseG.userData.comb.rotation.set(0, 0, 0); letterInner.position.set(0, 0, 0); letterInner.rotation.set(0, 0, 0); curlU.value = 0;
  };
  // BR1 layout after S049: case pushed to the east (lid open), letter out of its sleeve on the blotter, page top → window
  const layBR1 = () => {
    caseG.position.set(0.62, BY, -0.52); caseG.rotation.set(0, -0.35, 0); caseLid.rotation.x = 1.92;
    caseG.userData.comb.position.set(0.16, CASE.t + 0.003, -0.03);
    blotter.position.copy(BLOT).add(V(0, 0.0015, 0));
    letter.position.copy(BLOT).add(V(0, 0.0042, 0)); letter.rotation.set(0, Math.PI, 0);   // above the blotter even in the fold valleys
    letterInner.position.set(0, 0, 0); letterInner.rotation.set(0, 0, 0); curlU.value = 0;
    letter.updateMatrixWorld(true);
  };
  // reflective materials get the PMREM explicitly
  scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) {
    if (m && (m.isMeshPhysicalMaterial || (m.isMeshStandardMaterial && m.metalness > 0.3))) { m.envMap = envMain; if (m.envMapIntensity === 1) m.envMapIntensity = 0.7; m.needsUpdate = true; } } });
  for (const m of [bowlBase, ...Object.values(trayMats)]) { m.envMap = envMain; m.envMapIntensity = 0.8; }
  const setups = {
    // S012 — CU, 45° high angle, 75 mm, slow push (~4 %): gloved R thumb + index ease rim shard C onto B; "碎" 57.2 s
    // (tl 1.20) the break edges meet. Registered A→B: fingertip contact (0.50, 0.52), fingers upper-right → lower-left
    // ~30° below horizontal, fingertip ≈12 % of frame height (S011 end frame).
    S012(tl, u, T) {
      state({ handR: true, handL: false, tray: false, loose: false, A: false, cool: 0.35 });
      setLamp(lamp.head, lamp.aim, 0.42, 2.2, 0.85);
      const k = ks([[0, 0], [0.55, 0.55], [1.15, 0.97], [1.2, 1.0]], tl, ease.inOutCubic);           // approach progress
      const twist = 0.04 * Math.sin(clamp((tl - 0.5) / 0.55) * Math.PI);               // one tiny corrective twist
      shardCpivot.rotation.set(0, (1 - k) * 26 * D2R, 0);                                // integration: C held ≈ 3.5 cm off along the rim, lifted, so the join reads
      shardCpivot.position.set(0, (1 - k) * 0.012 - (tl > 1.2 ? 0.0008 * Math.exp(-(tl - 1.2) * 30) : 0), 0);   // 2-frame settle on 碎
      shardC.rotation.set(0, 0, twist);
      joinBowl.updateMatrixWorld(true);
      const GP = 86;                                                                     // grip on C's lip, 22° (≈3 cm) from the joint
      const grip = shardC.localToWorld(bowlPt(GP, 0.1189));
      const gn = shardC.localToWorld(bowlPt(GP, 0.1189).multiplyScalar(1.3).setY(bowlPt(GP, 0.1189).y)).sub(shardC.localToWorld(bowlPt(GP, 0.1189))).normalize(); // outer normal at the grip
      const th = gn.clone();                                                   // thumb on the outer (glazed) face
      const f0 = V(-0.10, -0.15, 0.98); const fd = f0.sub(th.clone().multiplyScalar(f0.dot(th))).normalize();   // ≈30° below horizontal on screen (S011 registry)
      handR.pose('pinch');                                                      // pose BEFORE placing (socket depends on the pose)
      // swing the hand about the thumb axis (the pinch stays valid) so wrist → pinch reads ≈30° below horizontal on screen,
      // fingers from upper right to lower left (S011 registry). β is solved once from the static geometry (pure).
      const placeB = (b) => { const q = new THREE.Quaternion().setFromAxisAngle(th, b), f2 = fd.clone().applyQuaternion(q);
        placeHandAt(handR, grip.clone().addScaledVector(gn, 0.001), f2, new THREE.Vector3().crossVectors(f2.clone().negate(), th), 'pinch'); };
      if (setups._s012beta === undefined) {
        const fwc = V(-0.549, -0.707, -0.445).normalize(), tgt0 = grip.clone();
        cam.place(camera, tgt0.clone().addScaledVector(fwc, -0.86), tgt0); cam.lens(camera, 75); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        let best = 1e9, bb = 0;
        for (let k = -18; k <= 18; k++) { const b = k * 5 * D2R; placeB(b); const w = scr(handR.root.getWorldPosition(new THREE.Vector3())), p0 = scr(handR.sockets.pinch.getWorldPosition(new THREE.Vector3()));
          const dx = (w[0] - p0[0]) * 2.39, dy = p0[1] - w[1]; const ang = Math.atan2(dy, dx); const err = Math.abs(ang - 30 * D2R) + (dx < 0 ? 9 : 0); if (err < best) { best = err; bb = b; } }
        setups._s012beta = bb;
      }
      placeB(setups._s012beta);
      const joint = joinBowl.localToWorld(bowlPt(63, 0.11));
      const fw = V(-0.549, -0.707, -0.445).normalize();                                 // 45° down, looking north-west
      const d = lerp(1.32, 0.84, ease.outCubic(clamp(tl / 1.1)));   // integration: frame 0 on S011's scale (fingertip ≈ 12 % of frame height), easing in to the CU
      const upv = V(0, 1, 0).sub(fw.clone().multiplyScalar(fw.y)).normalize();
      const tgt = grip.clone().addScaledVector(upv, 0.004);
      cam.place(camera, tgt.clone().addScaledVector(fw, -d), tgt); cam.lens(camera, 75);
      cam.handheld(camera, T, 0.1, 12);
      DBGP.pinch = handR.sockets.pinch.getWorldPosition(new THREE.Vector3()); DBGP.idx = handR.tip('index', new THREE.Vector3()); DBGP.wrist = handR.root.getWorldPosition(new THREE.Vector3()); DBGP.joint = joint;
      return { dof: { focus: cam.distTo(camera, joint), fstop: 4.5 }, exposure: 0.85 };
    },
    // S013 — ECU macro, 100 mm, low grazing slider along the crack B|C to the intact rim band (≤ 2 cm/s), focus tracking
    S013(tl, u, T) {
      // the moon spot (a point-like source) glinted dead-centre on the crescent motif → off; the same cool window air comes
      // from the hemisphere fill instead (diffuse only: no glint)
      state({ tray: false, noMoon: true, hemi: 1.1, noLampShadow: true, noBounce: true });   // perf: full-screen glaze × soft-shadow taps ≈ 60 % of the frame; nothing here casts
      shardCpivot.rotation.set(0, 0, 0); shardCpivot.position.set(0, 0, 0); shardC.rotation.set(0, 0, 0);
      joinBowl.updateMatrixWorld(true);
      // 0 → 0.22 s: up the crack (B|C, φ 63°) into the band; 0.22 → 1.84 s: along the band past the blossoms; then hold
      const sv = ks([[0, 0.090], [0.22, 0.1095], [1.84, 0.1125]], tl, ease.inOutSine);
      const ph = ks([[0, 63], [0.22, 62], [1.84, 30.5]], tl, ease.inOutSine);
      const pl = bowlPt(ph, sv), p = joinBowl.localToWorld(pl.clone());
      const n = joinBowl.localToWorld(pl.clone().setX(pl.x * 1.5).setZ(pl.z * 1.5)).sub(p).normalize();   // outer normal
      const ax = joinBowl.localToWorld(V(0, 1, 0)).sub(joinBowl.localToWorld(V(0, 0, 0))).normalize();       // toward the lip
      const camAt = (pp, nn) => { const e2 = pp.clone().addScaledVector(nn, 0.135).addScaledVector(ax, -0.205);
        camera.up.copy(nn); camera.position.copy(e2); camera.lookAt(pp.clone().addScaledVector(ax, -0.0063)); camera.up.set(0, 1, 0); cam.lens(camera, 100); camera.updateMatrixWorld(); };
      // review: the lamp is solved once so that, at the end pose, its reflection sits at frame upper left (0.30, 0.28) —
      // it used to land on the crescent moon mid-frame and read as an eye; during the move the specular travels
      if (!setups._s013lamp) {
        // review: the builder's raking lamp, moved up-left in the START camera's own frame so the glint sits on the upper-left
        // glaze instead of dead-centre on the crescent moon (where it read as an eye); it travels with the move from there
        const p0 = joinBowl.localToWorld(bowlPt(63, 0.090)), n0 = joinBowl.localToWorld(bowlPt(63, 0.090).setX(bowlPt(63, 0.090).x * 1.5).setZ(bowlPt(63, 0.090).z * 1.5)).sub(p0).normalize();
        camAt(p0, n0);
        const cR = V(1, 0, 0).applyQuaternion(camera.quaternion), cU = V(0, 1, 0).applyQuaternion(camera.quaternion);
        setups._s013lamp = V(-0.30, BY + 0.20, -0.56).addScaledVector(cR, -0.16).addScaledVector(cU, 0.10); setups._s013aim = V(0.08, BY + 0.03, -0.66);
      }
      // integration: the slider starts inside the lamp's warm raking pool (frame 0 within ≈ 0.3 stop of S012's end, it was a
      // full stop down and blue-grey); the cool window stays as fill on the far side
      setLamp(setups._s013lamp, setups._s013aim, 0.6, lerp(2.3, 1.6, smoothstep(0.3, 1.6, tl)), 0.9); benchBounce.intensity = 0;   // (the bounce point light made a 2nd glint)
      hemi.intensity = 0.55;
      { // the warm raking pool at the start of the slide (the crack's first ≈ 0.6 s), fading as the move climbs into the lamp's own light
        const p0 = joinBowl.localToWorld(bowlPt(63, 0.092)), n0 = joinBowl.localToWorld(bowlPt(63, 0.092).setX(bowlPt(63, 0.092).x * 1.5).setZ(bowlPt(63, 0.092).z * 1.5)).sub(p0).normalize();
        faceFill.visible = true; faceFill.color.set('#ffc890'); faceFill.angle = 0.5; faceFill.position.copy(p0).addScaledVector(n0, 0.35).add(V(0, 0.22, 0)); faceFill.target.position.copy(p0); faceFill.target.updateMatrixWorld();
        faceFill.intensity = 1.1 * (1 - smoothstep(0.5, 1.3, tl)); }
      for (const m of [shardB.material, shardC.material]) { m.envMapIntensity = 0.22; m.clearcoatRoughness = 0.32; }   // the env's bright patch sat on the moon disc as a fixed 'eye' glint; integration: a broader, softer glaze highlight (no hot 'eye' / flare blob)
      camAt(p, n);
      // perf: no DOF pass — at f/14 with maxCoc 0.6 it added ≈0.2 s for ≤ 1 px of blur; the glaze falls off with the light instead
      return { dof: null, exposure: 1.0, temp: -0.06, bloom: { strength: 0.22, threshold: 1.25, radius: 0.4 } };   // highlight, not a flare
    },
    // S014 — MCU 75 mm, eye level slightly to the side (profile from her right, window frame right), locked + ~2 % push.
    // Reads the LOOSE foot-ring shard A under the head magnifier (director ruling), 1.03 s turns it to show the foot ring,
    // 1.57 s the pencil lands on the ledger and writes the date in two quick strokes.
    S014(tl, u, T) {
      state({ fig: true, loupe: true, A: false, join: false, loose: false, cheapTray: true, noLampBody: true, pencilFig: true, wash: true });
      // review: key moved west of her face and a little north (the articulated arm pulled in): frame upper left, lights the
      // camera side of her face 4:1 instead of rim-lighting a mask; the shard and ledger stay in the pool
      // integration: the 3500 K lamp is BEHIND the shard toward frame right (south-east of her face): the porcelain glows, the
      // face is lost profile with only a warm edge (it was a fully lit pink profile mask)
      setLampE(V(0.42, BY + 0.62, -0.62), V(0.0, BY + 0.30, -1.0), 0.6, 2.0, 0.9);
      loupe.visible = true; loupe.userData.visor.rotation.x = 0;
      poseSeated({ lean: 0.55, neck: 0.22, head: 0.2, yaw: -0.45 });   // (review) turned toward the ledger / lamp: a true profile from the 18° camera
      R.breathe(T, 0.6);
      // left hand: lift A toward the loupe (0–1.0), 1.03 turn the foot ring to the lens, hold
      const lift = ks([[0, 0], [1.0, 1]], tl), turn = ks([[0.85, 0], [1.2, 1]], tl, ease.inOutCubic);
      const eye = R.eye();
      const fwdR = V(0, 0, 1).applyQuaternion(R.root.quaternion); fwdR.y = 0; fwdR.normalize();
      const aPos = V(0.06, BY + 0.10, -0.95).lerp(eye.clone().addScaledVector(fwdR, 0.20).add(V(0, -0.07, 0)), lift);
      R.reach('L', aPos.clone().add(V(0.07, -0.05, -0.05)), { palm: V(-0.2, 0.3, 0.9).normalize(), fingers: V(-0.5, 0.35, 0.6).normalize() });
      R.hands.L.pose('pinch');
      shardAholder.visible = true; shardAholder.position.copy(aPos);
      // A's foot ring faces down on the bench; turned 1.03 s so the foot ring faces her eyes (→ −Z, up a little)
      shardAholder.quaternion.setFromEuler(new THREE.Euler(lerp(-0.4, -1.75, turn), 0, lerp(0.2, 0.05, turn)));
      // right hand with the pencil: hovering over the ledger, 1.57 s lands, two quick strokes
      const land = ks([[1.35, 0], [1.57, 1]], tl, ease.inOutCubic), stroke = clamp((tl - 1.57) / 0.4);
      const nib = ledger.localToWorld(V(0.06 + 0.02 * Math.sin(stroke * Math.PI * 2) * (stroke < 1 ? 1 : 0) + 0.03 * stroke, lerp(0.05, 0.012, land), 0.0));
      R.reach('R', nib.clone().add(V(-0.05, 0.07, -0.08)), { palm: V(0.3, -0.85, 0.2).normalize(), fingers: V(0.25, -0.55, 0.75).normalize() });
      R.hold('R', pencilFig, { socket: 'pen', grip: ['write'] }); pencilFig.position.set(0, -0.012, 0);
      R.lookAt(tl < 1.42 ? aPos : nib, 0.85);
      faceFill.visible = false;
      // integration: the ledger sits close by her right side (the reach crossed 70 % of the frame as a grey tube)
      ledger.position.set(-0.36, BY + 0.075, -1.22); ledger.rotation.set(-0.30, 0.5, 0, 'YXZ'); ledger.updateMatrixWorld(true); placeCradle(scene.getObjectByName('cradle'));
      // camera: west of her, looking east and a little south (window at frame right), slight push
      // eye at frame ≈ (0.40, 0.33); 2.0 m → 1.96 m push
      // review: yawed 18° toward the SE corner (was 8°, which faced a blank stretch of wall → black void): the east-wall
      // door + wall wash at frame left, the window's east jamb + harbour glints at the right edge
      const yaw = 18 * D2R, f = V(Math.cos(yaw), -0.02, Math.sin(yaw)).normalize(), right = V(-Math.sin(yaw), 0, Math.cos(yaw));
      const eye2 = R.eye(), tgt = eye2.clone().addScaledVector(right, 0.11).add(V(0, -0.065, 0));
      const dist = lerp(2.45, 2.4, ease.inOutSine(clamp(u)));
      cam.place(camera, tgt.clone().addScaledVector(f, -dist), tgt); cam.lens(camera, 75);
      return { dof: { focus: cam.distTo(camera, aPos), fstop: 2.8 }, exposure: 1.15 };   // focus on the shard under the loupe
    },
    // S015 — 90°-ish overhead INSERT, 100 mm, locked. T07 A-frame for S016: bowl centre (0.50, 0.52), rim Ø ≈ 80 % of frame
    // height, ~15° from vertical tilted from the 6 o'clock side, side A (boat) toward 12 o'clock, MISSING at 3 o'clock.
    S015(tl, u, T) {
      state({ join: false, noTube: true, cool: 0.18 });
      // west of the tray: key from frame upper left; review: tighter pool so the sand falls off into the dark bench
      setLampE(V(-0.02, BY + 0.50, -0.70), TRAY.clone().add(V(0, 0.05, 0)), 0.30, 1.05, 0.9);
      trayMats.full.envMapIntensity = 0.25;
      // frame up = NW, frame right = NE: bowl +X (side A) → NW, +Z (MISSING) → NE
      trayBowl.rotation.set(0, 135 * D2R + 0.08, 0);   // (+0.08 cancels the tray's own yaw)
      tray.updateMatrixWorld(true);
      const c = trayBowl.localToWorld(V(0, 0.066, 0));    // rim circle centre
      const upW = V(-0.7071, 0, -0.7071);                  // frame up (NW)
      const tilt = 24 * D2R, dist = 1.30;   // integration: 15° hid the outer plum band; at 24° it reads along the near (6 o'clock) lip
      const dir = V(0, -Math.cos(tilt), 0).addScaledVector(upW, Math.sin(tilt)).normalize();   // looks down and toward 12 o'clock
      camera.up.copy(upW); camera.position.copy(c).addScaledVector(dir, -dist); camera.lookAt(c); camera.up.set(0, 1, 0);
      cam.lens(camera, 100);
      return { dof: { focus: dist, fstop: 8 }, exposure: 0.84, vignette: 0.46 };
    },

    // ======================================================================================== BR1
    // S049 — INSERT 75 mm, high angle → tilt up. MATCH CUT from S048: the same handle bar (museum state now) horizontal at
    // y = 0.66 spanning x 0.28–0.72, unobstructed at the cut; her open gloved right hand arrives from lower right and closes
    // gently on it 0.09–0.45 s (155.34 "你的明天"); 0.4–1.1 her left hand raises the lid; 1.1–1.6 the right hand lifts comb +
    // cloth aside to frame left as one; 1.6–2.75 both hands draw the sleeved letter out from under the shirt and lift it
    // toward the lamp (157.02 "我的从前"), ending at (0.52, 0.42). Review: forearms point back to her (placeArm), the tilt
    // carries a slight crane back (0.71 → 0.95 m) so the open case reads; lamp upper left (her left, near side).
    S049(tl, u, T) {
      state({ pre: false, br1: true, handR: true, handL: true, sleeve: true, letter: true, noLampBody: true });
      setMoon([0.3, -0.8, -0.52]);
      caseG.position.set(0.05, BY, -0.60); caseG.rotation.set(0, 0, 0);
      blotter.position.set(0.0, BY + 0.0015, -1.02);
      setLampE(V(0.62, BY + 0.58, -1.0), V(0.05, BY + 0.10, -0.66), 0.62, lerp(2.2, 0.95, smoothstep(1.45, 2.0, tl)), 0.9);   // eased as the pale sheet rises into the pool (it blew out)
      const lidA = ks([[0.45, 0], [1.1, 1.92]], tl, ease.inOutCubic);
      caseLid.rotation.x = lidA;
      const shirt = caseG.userData.shirt, comb = caseG.userData.comb;
      // comb + cloth: from the top of the shirt to the lining at frame left (east), lifted ~3 cm on the way
      const cmv = ks([[1.15, 0], [1.6, 1]], tl, ease.inOutCubic);
      comb.position.set(lerp(0.04, 0.205, cmv), CASE.t + 0.036 * (1 - cmv) + 0.003 + 0.03 * Math.sin(cmv * Math.PI), lerp(0.0, -0.035, cmv)); comb.rotation.set(0, 0.25 * cmv, 0);
      // the sleeve lies under the shirt's north half; 1.6–2.15 drawn out north (the shirt's near edge lifts a little), then lifted
      const sv = ks([[1.55, 0], [1.82, 0.45], [2.75, 1]], tl, ease.inOutSine);   // 157.02 (tl 1.77) the sleeve is visibly coming out
      { const th = 0.17 * Math.sin(clamp(sv / 0.45) * Math.PI * 0.5) * (1 - smoothstep(0.45, 0.8, sv));   // near (north) edge lifts, hinged on the far edge
        shirt.rotation.set(th, 0, 0); shirt.position.set(0.04, CASE.t + 0.02 + 0.11 * Math.sin(th), 0.01); }
      caseG.updateMatrixWorld(true);
      const IC = caseG.localToWorld(V(0.0, CASE.t + 0.02, 0.0));
      const sIn = caseG.localToWorld(V(-0.02, CASE.t + 0.0035, -0.035)), sMid = caseG.localToWorld(V(-0.02, CASE.t + 0.075, -0.13));
      const sOut = IC.clone().add(V(-0.03, 0.135, -0.06));
      const sPos = sv < 0.45 ? sIn.clone().lerp(sMid, sv / 0.45) : sMid.clone().lerp(sOut, ease.inOutSine((sv - 0.45) / 0.55));
      sleeve.position.copy(sPos); sleeve.rotation.set(0.42 * smoothstep(0.45, 1, sv), 0.04, 0.05 * smoothstep(0.45, 1, sv));
      letter.position.copy(sPos).add(V(0, 0.0004, 0)); letter.rotation.copy(sleeve.rotation); letterInner.rotation.set(0, 0, 0); curlU.value = 0;
      sleeve.updateMatrixWorld(true);
      const bar = caseG.userData.bar; const barW = bar.getWorldPosition(new THREE.Vector3());
      const sEdge = (sx, sz = 0.06) => sleeve.localToWorld(V(sx * (LET.w / 200 + 0.006), 0.002, sz));
      const clothC = comb.localToWorld(V(-0.06, 0.004, 0.055));   // the cloth's near corner (she lifts cloth + comb as one)
      // --- right hand: arrives open from lower right → closes on the bar → (lid) → cloth corner → sleeve's right (west) edge
      if (tl < 1.1) {
        const close = ks([[0.09, 0], [0.45, 1]], tl, ease.inOutSine);
        const rp = barW.clone().add(V(lerp(-0.10, -0.012, close), lerp(0.035, 0.004, close), lerp(-0.12, -0.004, close)));
        handR.pose('grip', { radius: lerp(0.05, 0.0125, close) });
        placeArm(handR, rp, V(0.05, -1, 0.45), 'grip');
      } else if (tl < 1.62) {
        const k1 = ks([[1.1, 0], [1.22, 1]], tl), k2 = ks([[1.22, 0], [1.6, 1]], tl);
        const rp = barW.clone().add(V(-0.012, 0.03, 0.0)).lerp(clothC, k1).lerp(clothC, k2);
        handR.pose(k1 < 0.85 ? 'relaxed' : 'pinch');
        placeArm(handR, rp, V(0.2, -1, 0.1), 'pinch');
      } else {
        const k = ks([[1.62, 0], [1.85, 1]], tl);
        handR.pose('pinch');
        placeArm(handR, clothC.clone().lerp(sEdge(-1), k), V(0.6, -0.8, 0.0), 'pinch');
      }
      // --- left hand: lower left (out of frame) → lid front edge (0.4–1.1) → back toward her → sleeve's left (east) edge
      const lidFront = caseLid.localToWorld(V(0.13, CASE.hl * 0.45, -CASE.D - 0.006));
      const restL = V(0.36, BY + 0.20, -1.06);
      let lp;
      if (tl < 0.32) lp = restL.clone();
      else if (tl < 1.3) lp = restL.clone().lerp(lidFront, ks([[0.32, 0], [0.47, 1]], tl));
      else if (tl < 1.62) lp = lidFront.clone().lerp(restL, ks([[1.3, 0], [1.6, 1]], tl));
      else lp = restL.clone().lerp(sEdge(1), ks([[1.62, 0], [1.85, 1]], tl));
      handL.pose(tl > 0.4 && tl < 1.25 ? 'pinch' : tl > 1.8 ? 'pinch' : 'relaxed');
      placeArm(handL, lp, V(-0.5, -0.85, 0.2), 'pinch');
      // camera: A = registration (bar at y 0.66, 62° elevation, 0.71 m); B = into the open case (0.95 m), tilt + crane 0.5–1.6
      const EL = 62 * D2R, dA = 0.71;
      frameAt(barW.clone().add(V(0, Math.sin(EL) * dA, -Math.cos(EL) * dA)), barW, 0.5, 0.66, 75);
      const pA = camera.position.clone(), qA = camera.quaternion.clone();
      const EB = 57 * D2R, dB = 0.95, aimB = IC.clone().add(V(0, 0.06, -0.02));
      frameAt(aimB.clone().add(V(0.02, Math.sin(EB) * dB, -Math.cos(EB) * dB)), aimB, 0.5, 0.5, 75);
      const pB = camera.position.clone(), qB = camera.quaternion.clone();
      const kc = ks([[0.5, 0], [1.6, 1]], tl, ease.inOutSine);
      camera.position.lerpVectors(pA, pB, kc); camera.quaternion.slerpQuaternions(qA, qB, kc); camera.updateMatrixWorld();
      DBGP.barL = bar.localToWorld(V(0, 0.075, 0)); DBGP.barR = bar.localToWorld(V(0, -0.075, 0)); DBGP.sleeve = sleeve.position.clone();
      DBGP.handR = handR.root.getWorldPosition(new THREE.Vector3()); DBGP.handL = handL.root.getWorldPosition(new THREE.Vector3()); DBGP.comb = clothC.clone();
      return { dof: { focus: lerp(cam.distTo(camera, barW), cam.distTo(camera, sleeve.position), smoothstep(1.6, 2.5, tl)), fstop: 4 }, exposure: 1.0 };
    },
  
    // S050 — MCU 75 mm, profile from her right (window frame right), very slow push (~20 cm). 0.52 s pencil tick in the
    // ledger; 0.6–1.9 eyes + pencil track down the letter; 1.96 pencil stops mid-air; 2.1–2.4 re-reads; 2.5–2.9 the guard's
    // torch sweeps once across the door pane behind her (right → left), she does not look up; 2.92 an inward lift of the eyes.
    S050(tl, u, T) {
      state({ pre: true, join: false, loose: false, A: false, cheapTray: true, br1: true, case: true, letter: true, fig: true, pencilFig: true, noLampBody: true, ticked: tl > 0.52, wash: true });
      setMoon([0.3, -0.8, -0.52]);
      layBR1();
      setLampE(lamp.head, BLOT.clone(), 0.75, 3.6, 0.85);
      poseSeated({ lean: 0.6, neck: 0.32, head: 0.22, yaw: -0.45 });
      R.breathe(T, 0.5);
      // gaze: letter top → down the columns → re-read → inward lift (2.92)
      const lp = letterInner.localToWorld(V(0, 0, 0));
      const read = ks([[0.6, 0], [1.9, 1], [2.1, 1], [2.25, 0.55], [2.45, 0.9]], tl);
      const gazeAt = lp.clone().add(V(lerp(-0.05, 0.04, read), 0, lerp(0.07, -0.06, read)));
      // integration: 160.92 → 161.6 the inward lift of the eyes — the head rises ≈ 14° and turns ≈ 10° toward the window (frame
      // right, past the lamp), held to the end; the pencil stays frozen mid-air
      const lift = ks([[2.92, 0], [3.6, 1]], tl, ease.inOutSine);
      const far = gazeAt.clone().add(V(0.07, 0.13, 0.09));   // ≈ 14° above her reading line, a little toward the window
      R.lookAt(gazeAt.clone().lerp(far, lift), 0.95);
      // right hand + pencil: tick at 0.52 on the ledger row, then follows the reading, stops mid-air at 1.96
      const tick = ks([[0.3, 0], [0.52, 1], [0.62, 0]], tl, ease.inOutSine);
      // integration: the ledger lies beside her right hand (the reach to it was a straight 70 cm plank of an arm)
      ledger.position.set(-0.44, BY + 0.075, -1.08); ledger.rotation.set(-0.30, 0.35, 0, 'YXZ'); ledger.updateMatrixWorld(true); placeCradle(scene.getObjectByName('cradle'));
      const rowP = ledger.localToWorld(V(0.11, 0.012, -0.012));
      const follow = rowP.clone().add(V(0.05, 0.06, 0.03));
      const hov = tl < 0.62 ? rowP.clone().add(V(0, 0.03 * (1 - tick), 0)) : rowP.clone().add(V(0, 0.03, 0)).lerp(follow, ks([[0.62, 0], [1.0, 1]], tl));
      const stopT = Math.min(tl, 1.96);
      const nib = tl < 1.0 ? hov : follow.clone().add(V(0, 0, -0.03 * ks([[1.0, 0], [1.96, 1]], stopT)));
      R.reach('R', nib.clone().add(V(-0.05, 0.07, -0.08)), { palm: V(0.3, -0.85, 0.2).normalize(), fingers: V(0.25, -0.55, 0.75).normalize() });
      R.hold('R', pencilFig, { socket: 'pen', grip: ['write'] }); pencilFig.position.set(0, -0.012, 0);
      // left forearm on the bench edge, hand resting by the letter
      R.reach('L', V(0.10, BY + 0.03, -1.02), { palm: V(-0.2, -0.95, 0.1).normalize(), fingers: V(-0.4, -0.15, 0.9).normalize() });
      R.hands.L.pose('relaxed', { curl: 0.6 });
      // torch beam behind her: crosses the pane right → left (local +X → −X of the door group), 2.5–2.9 s
      const bt = (tl - 2.5) / 0.4;
      doorBeam.mat.uniforms.uX.value = lerp(0.9, -0.9, clamp(bt)); doorBeam.mat.uniforms.uI.value = bt > -0.1 && bt < 1.1 ? 0.75 * Math.sin(clamp(bt) * Math.PI) ** 0.5 : 0;
      // camera: she at ≈(0.44, 0.48); push 2.30 → 2.10 m with a 12-frame ease-in
      const eye = R.eye();
      const yaw = 18 * D2R, f = V(Math.cos(yaw), -0.015, Math.sin(yaw)).normalize(), right = V(-Math.sin(yaw), 0, Math.cos(yaw));   // (review: was 4°)
      const tgt = eye.clone().addScaledVector(right, 0.09).add(V(0, -0.075, 0));   // integration: framed a little lower so the letter in the lamp pool reads at the bottom
      const pushK = clamp((tl - 0.5) / (4.58 - 0.5)) * 0.95 + 0.05 * smoothstep(0, 0.5, tl) * clamp(tl / 0.5);
      const dist = lerp(2.95, 2.75, pushK);
      cam.place(camera, tgt.clone().addScaledVector(f, -dist), tgt); cam.lens(camera, 75);
      DBGP.eye = eye; DBGP.door = doorBeam.group.localToWorld(V(0, 1.39, 0)); DBGP.nib = nib.clone(); DBGP.ledger = rowP;
      return { dof: { focus: cam.distTo(camera, eye), fstop: 2.4 }, exposure: 1.12 };
    },
    // S051 — ECU 100 mm macro, low grazing over the letter: the lamp is lowered (0–0.4 s, pool shrinks to the sheet, raking);
    // slider left → right parallel to the last column (≈1 cm/s, 0.17 → 1.72 s), lands on the broken final stroke (0.62, 0.50).
    S051(tl, u, T) {
      state({ pre: false, br1: true, case: false, letter: true, patch: true, noLampBody: true });
      setMoon([0.3, -0.8, -0.52]);
      layBR1();
      const lower = ks([[0, 0.72], [0.3, 1]], tl, ease.inOutSine);   // integration: opens already near the contracted pool (it flashed 3 stops after S050)
      const bw = letterInner.localToWorld(V((LET.broken[0] - LET.w / 2) / 100, 0, (LET.broken[1] - LET.h / 2) / 100));
      setLampE(lamp.head.clone().lerp(bw.clone().add(V(-0.22, 0.06, 0.16)), lower), bw.clone().add(V(0.0, 0, -0.012)), lerp(0.75, 0.15, lower), lerp(1.0, 1.5, lower), 0.7);
      // column direction on the bench (page "down" = world −Z after the 180° yaw): camera looks west, right = north
      const down = letterInner.localToWorld(V(0, 0, 1)).sub(letterInner.localToWorld(V(0, 0, 0))).normalize();
      const slide = ks([[0.17, 0], [1.72, 1]], tl, ease.inOutSine);
      const focusP = bw.clone().addScaledVector(down, lerp(-0.016, 0, slide));       // focus follows the line, lands on the break
      const side = new THREE.Vector3().crossVectors(V(0, 1, 0), down).normalize();   // across the columns
      const eye = focusP.clone().addScaledVector(side, -0.205).add(V(0, 0.07, 0)).addScaledVector(down, -0.012);
      // broken stroke at (0.62, 0.50): aim slightly left of it
      const aim = focusP.clone().addScaledVector(down, -0.0085);
      cam.place(camera, eye, aim); cam.lens(camera, 100);
      DBGP.broken = bw.clone();
      return { dof: { focus: cam.distTo(camera, focusP), fstop: 5.6 }, exposure: lerp(0.74, 0.7, lower), temp: -0.04, contrast: 1.16, vignette: 0.5 };
    },
    // S052 — CU 75 mm high angle (her side, 16° off vertical, frame-up = south), locked. Bamboo tweezers in her gloved right
    // hand slip under the sheet's right (west) edge; 0.2–0.9 the sheet lifts on them and turns over right → left, flexing,
    // her left fingertips steadying the far edge; flat by 1.0 s; 1.0–1.4 the tweezers withdraw to the right edge. The back:
    // mirrored show-through, the pressed jasmine in the 2/3 fold at (0.58, 0.46) by 167.2 ("这段"). Review: tight on the
    // sheet, ledger out of frame, tweezer tips solved onto the edge (they used to hover over the sheet).
    S052(tl, u, T) {
      state({ pre: false, br1: true, case: false, letter: true, handR: true, handL: true, tweezers: true, noLampBody: true, noLedger: true });
      setMoon([0.3, -0.8, -0.52]);
      layBR1();
      letterInner.rotation.set(0, 0, Math.PI); letter.updateMatrixWorld(true);
      const jEnd = jasmine.getWorldPosition(new THREE.Vector3());
      const fl = ks([[0.2, 0], [0.9, 1]], tl, ease.inOutSine);
      letterInner.rotation.set(0, 0, Math.PI * fl);
      letterInner.position.set(0, (LET.w / 200) * Math.sin(fl * Math.PI) + 0.002 * Math.sin(fl * Math.PI), 0);   // rolls over its low edge (never through the table)
      curlU.value = -0.036 * Math.sin(fl * Math.PI);   // integration: the sheet bends as it turns (≥ 20°), not a rigid board
      letterM.map = letterTexSoft;                       // the front's brushwork soft and low-contrast (illegible, ruling 4)
      letter.updateMatrixWorld(true);
      setLampE(BLOT.clone().add(V(0.20, 0.34, 0.20)), BLOT.clone().add(V(-0.03, 0, 0)), 0.42, 1.7, 0.9);
      // (the warm 2800 K glove bounce is aimed at the right glove after it is placed, below)
      // tweezers: tips under the west edge (local +x), follow it up to ~70° while it lifts, release, withdraw to the right
      const edgeAt = (ang) => { const q = V(LET.w / 200 - 0.004, -0.0012, 0.035); const c = Math.cos(ang), sn = Math.sin(ang);
        return letter.localToWorld(V(q.x * c - q.y * sn, q.x * sn + q.y * c + (LET.w / 200 + 0.002) * Math.sin(ang), q.z)); };
      const follow = Math.min(fl, 0.38) * Math.PI;
      const wd = ks([[0.62, 0], [1.4, 1]], tl, ease.inOutSine);
      const tipT = edgeAt(follow).add(V(-0.09 * wd, 0.04 * Math.sin(wd * Math.PI) + 0.01 * wd, -0.015 * wd));
      handR.pose('write'); handR.hold(tweezers, 'pen'); tweezers.position.set(0, -0.075, 0); tweezers.rotation.set(0, 0, 0);
      placeArm(handR, tipT.clone().add(V(-0.06, 0.035, -0.02)), V(0.25, -0.9, 0.1), 'pen');
      { const tw = handR.sockets.pen.localToWorld(V(0, -0.075, 0)); handR.root.position.add(tipT.clone().sub(tw)); handR.root.updateMatrixWorld(true); }
      { const gp = handR.root.getWorldPosition(new THREE.Vector3());   // warm 2800 K bounce on the right glove only (it dropped to blue-grey in shadow)
        faceFill.visible = true; faceFill.color.set('#ffcf9e'); faceFill.position.copy(gp).add(V(0.0, 0.22, 0.12)); faceFill.target.position.copy(gp); faceFill.target.updateMatrixWorld(); faceFill.angle = 0.32; faceFill.intensity = 0.62; }
      // left fingertips rest on the blotter just beyond the sheet's left (east) edge, ready to receive it (an arm to the far
      // edge lay across the whole sheet from her POV)
      const far = letter.localToWorld(V(-LET.w / 200 - 0.018, 0.0, 0.045));
      handL.pose('touch');
      placeArm(handL, far.clone().add(V(0, 0.004, 0)), V(0.0, -0.95, 0.3), 'index');
      // camera: from her side, 16° off vertical, 0.82 m; the jasmine's final position registered at (0.58, 0.46)
      const tilt = 16 * D2R, dC = 0.66;
      frameAt(jEnd.clone().add(V(0, Math.cos(tilt) * dC, -Math.sin(tilt) * dC)), jEnd, 0.58, 0.46, 75);
      DBGP.jasmine = jasmine.getWorldPosition(new THREE.Vector3()); DBGP.tip = tipT; DBGP.far = far;
      return { dof: { focus: cam.distTo(camera, jEnd), fstop: 5.6 }, exposure: 1.0 };
    },
    // S053 — INSERT 75 mm, her POV high angle (frame-up = south, she is at the bottom), locked. The ledger has been slid to her
    // left for the letter work, so the shot-list layout holds: ledger frame left, the letter's soft edge frame right. Her
    // gloved right hand enters from lower right, lays the pencil flat beside the ticked year at 0.14 s (168.72 "别只读"), tip
    // toward upper right; fingers rest on it, open at 0.8 s (169.38 "年份") and lift away out of frame lower right.
    S053(tl, u, T) {
      state({ pre: false, br1: true, case: false, letter: true, handR: true, pencilLoose: true, noLampBody: true, ticked: true });
      setMoon([0.3, -0.8, -0.52]);
      layBR1(); letterInner.rotation.set(0, 0, Math.PI);
      const LG = BLOT.clone().add(V(0.36, 0, -0.10));
      ledger.position.copy(LG).add(V(0, 0.075, 0)); ledger.rotation.set(-0.30, 0.10, 0, 'YXZ');
      ledger.updateMatrixWorld(true); placeCradle(scene.getObjectByName('cradle'));
      setLampE(LG.clone().add(V(0.12, 0.55, 0.22)), LG.clone().add(V(-0.06, 0.06, 0)), 0.42, 1.6, 0.9);
      const rowP = ledger.localToWorld(V(0.115, 0.0125, -0.012));      // the ticked row, beside the year column
      const down = ks([[0, 0], [0.14, 1]], tl, ease.outCubic), rel = ks([[0.8, 0], [1.45, 1]], tl, ease.inOutSine);
      const pdir = V(-0.68, 0, 0.73).normalize();                     // tip toward frame upper right (south-west)
      const pn = ledger.localToWorld(V(0, 1, 0)).sub(ledger.localToWorld(V(0, 0, 0))).normalize();   // page normal (cradle tilt)
      const pTip = rowP.clone().add(V(-0.012, 0, 0.004)).addScaledVector(pn, 0.0036 + 0.03 * (1 - down));
      pencilLoose.position.copy(pTip).addScaledVector(pdir, -0.008); pencilLoose.quaternion.setFromUnitVectors(V(0, -1, 0), pdir);
      pencilLoose.updateMatrixWorld(true);
      // pinch the pencil 6 cm from the tip until 0.8 s, then the hand opens and withdraws toward her (frame lower right)
      const pinchP = pTip.clone().addScaledVector(pdir, -0.105).addScaledVector(pn, 0.004);   // held near the top: the tip shows beyond her fingers
      handR.pose(tl < 0.8 ? 'pinch' : 'relaxed', tl < 0.8 ? {} : { curl: 0.35 });
      const hp = pinchP.clone().add(V(-0.08 * rel, 0.16 * rel, -0.24 * rel));
      placeArm(handR, hp, V(0.1, -1, 0.15), 'pinch');
      // camera: from her side (north), 14° off vertical; the tick at (0.48, 0.52)
      const tilt = 14 * D2R, dC = 0.78;
      frameAt(rowP.clone().add(V(0.02, Math.cos(tilt) * dC, -Math.sin(tilt) * dC)), rowP, 0.48, 0.52, 75);
      DBGP.tick = rowP; DBGP.pencilTip = pTip; DBGP.hand = handR.root.getWorldPosition(new THREE.Vector3());
      return { dof: { focus: cam.distTo(camera, rowP), fstop: 4 }, exposure: 1.0 };
    },
    // S054 — 100 mm CU (review restage). The written frame — lens on the paper plane, jasmine soft at the bottom AND her eye
    // through the glass in one 100 mm 2.39:1 frame — cannot exist: the VFOV is 8.6°, so a flat flower and an eye 15–20 cm
    // above it only share a frame from ≥ 1.4 m, where a paper-level lens sees the sheet as a line. Restaged: from her
    // front-right (WSW, 13° above the paper, ~1.4 m), her bowed face upper centre-right facing frame right (window side, as
    // S014/S050), the magnifier in her LEFT hand tilted toward us between her eye and the flower; the glass shows the
    // magnified jasmine + the faint show-through of the broken line (what she reads). 0.3–0.6 the glass settles over the
    // flower (170.82 "没说完"); 1.93–2.71 rack flower (in the glass) → her eye (172.92 "欢"); 4.09 she tilts it 15°: the rim
    // breaks the lamp into a soft pastel ring at upper right (174.3) = the light anchor into S055's lancet (0.72, 0.30).
    S054(tl, u, T) {
      // Integration rebuild (BR1's turn: she stops identifying and starts READING). Low across the sheet from its far side,
      // 100 mm, ~1.7 m: the magnifier in her LEFT hand fills ≈ 35 % of the frame height at the lower centre, showing the
      // magnified pressed jasmine + the broken stroke (what she reads), her gloved fingers on the handle lower right; her face
      // bowed just beyond it, three-quarter, keyed only from above/behind by the lowered lamp (no frontal fill — the mask never
      // reads), her eye-line down into the glass. 170.82 the glass settles over the flower; 172.14 → 172.92 a real rack from
      // the glass to her eye (f/2.2); 174.3 she tilts it 15° and the rim throws a soft pastel ring at frame (0.72, 0.30) —
      // the light anchor into S055's lancet.
      state({ pre: false, br1: true, case: false, letter: true, fig: true, mag: true, noLampBody: true, noLedger: true, hemi: 0.42, wash: true, cool: 0.3 });
      setMoon([0.3, -0.8, -0.52]);
      layBR1(); letterInner.rotation.set(0, 0, Math.PI);
      letter.updateMatrixWorld(true);
      const jw = jasmine.getWorldPosition(new THREE.Vector3());
      poseSeated({ lean: 0.7, hipBend: 0.22, spine: 0.22, chest: 0.26, neck: 0.36, head: 0.28, dz: 0.08, yaw: 0.0 });
      R.breathe(T, 0.3);
      R.root.updateMatrixWorld(true);
      const eye0 = R.eye();
      // the glass: held low over the flower, 70 % of the way up to her eye; it slides in 0.3–0.6 s from frame left (170.82)
      const dsc = ks([[0.3, 0], [0.6, 1]], tl, ease.outCubic), tilt = ks([[4.09, 0], [4.3, 1]], tl, ease.inOutSine);
      const Lc = jw.clone().lerp(eye0, 0.7).add(V(0.0, 0.2 * (1 - dsc), -0.05 * (1 - dsc)));   // lowered into place from above frame on 170.82
      R.lookAt(jw, 0.9); R.root.updateMatrixWorld(true);
      const eye = R.eye();
      // camera: from her LEFT (east), near paper height, 100 mm at ≈ 1.4 m — an ECU of her bowed profile and the glass: she
      // faces frame left, the lens lower left of her eye, the dark room behind her head (frame right) for the ring
      const az = 10 * D2R, el = 3 * D2R;
      const back = V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      const Mid = Lc.clone().lerp(eye, 0.5);
      const dist = lerp(1.95, 1.9, ease.inOutSine(clamp(u)));
      frameAt(Mid.clone().addScaledVector(back, dist), eye, 0.56, 0.31, 100);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      // the glass faces the camera (a full disc), rolled so the handle points down-right to her left hand
      const toC = camera.position.clone().sub(Lc).normalize();
      magnifier.position.copy(Lc); magnifier.quaternion.setFromUnitVectors(V(0, 0, 1), toC);
      { const want = V(0.25, -1, 0.35); want.sub(toC.clone().multiplyScalar(want.dot(toC))).normalize();
        const cur = V(0, -1, 0).applyQuaternion(magnifier.quaternion);
        const ang = Math.atan2(cur.clone().cross(want).dot(toC), cur.dot(want));
        magnifier.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(toC, ang)); }
      magnifier.rotateY(15 * D2R * tilt);
      magnifier.updateMatrixWorld(true);
      // her LEFT hand round the handle (two IK passes put the grip socket on it)
      const hA = handle.localToWorld(V(0, 1, 0)).sub(handle.localToWorld(V(0, 0, 0))).normalize();
      const gripW = handle.localToWorld(V(0, -0.02, 0));
      let fL = Lc.clone().sub(SHO.L); fL.sub(hA.clone().multiplyScalar(fL.dot(hA))).normalize();
      const pL = new THREE.Vector3().crossVectors(fL, hA).normalize();
      R.hands.L.pose('grip', { radius: 0.0072 });
      let wT = gripW.clone().addScaledVector(fL, -0.05).addScaledVector(pL, -0.03);
      for (let k = 0; k < 2; k++) { R.reach('L', wT, { palm: pL, fingers: fL }); R.root.updateMatrixWorld(true); const sg = R.hands.L.sockets.grip.getWorldPosition(new THREE.Vector3()); wT.add(gripW.clone().sub(sg)); }
      R.reach('L', wT, { palm: pL, fingers: fL });
      // right gloved fingertips hover 5 mm above the sheet beside the flower, never touching (below frame mostly)
      R.hands.R.pose('relaxed', { curl: 0.35 });
      R.reach('R', jw.clone().add(V(-0.07, 0.03, -0.05)), { palm: V(0.1, -1, 0), fingers: V(0.35, -0.2, 0.9).normalize() });
      R.root.updateMatrixWorld(true);
      // the lowered lamp: above and BEHIND her head (north), raking the sheet; top / edge light on her hair, brow and the rim of
      // the glass; the camera-side face stays dark
      setLampE(eye.clone().add(V(-0.38, 0.30, -0.16)), jw.clone().add(V(0.0, 0, 0.02)), 0.55, 1.7, 0.95);
      faceFill.visible = false; benchBounce.intensity *= 0.25;   // no warm up-light into the face from the sheet
      // in the glass: the magnified flower + the broken stroke, seen from above (what her eye sees), oriented like the frame
      const lc = scr(magnifier.position), rr = 0.0375;
      let ru = 0; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, q = scr(magnifier.localToWorld(V(Math.cos(a) * rr, Math.sin(a) * rr, 0))); ru = Math.max(ru, Math.abs(q[0] - lc[0]), Math.abs(q[1] - lc[1]) * ctx.H / ctx.W); }
      magU.uC.value.set(lc[0], 1 - lc[1]); magU.uR.value.set(ru, ru * ctx.W / ctx.H);
      const fwdC = camera.getWorldDirection(new THREE.Vector3()); fwdC.y = 0; fwdC.normalize();
      magCam.position.copy(jw).add(V(0, 0.075, 0)).addScaledVector(fwdC, -0.03);
      magCam.up.copy(fwdC); magCam.lookAt(jw.clone().add(V(0.004, 0, 0)).addScaledVector(fwdC, 0.006));
      magCam.fov = 2 * Math.atan(0.018 / 0.075) / D2R; magCam.aspect = 1; magCam.updateProjectionMatrix(); magCam.updateMatrixWorld();
      const prevRT = ctx.renderer.getRenderTarget();
      ctx.renderer.setRenderTarget(magRT); ctx.renderer.setClearColor(0x05070b, 1); ctx.renderer.clear(); ctx.renderer.render(scene, magCam);
      ctx.renderer.setRenderTarget(prevRT);
      { const ndc = magnifier.position.clone().project(camera); magU.uDepth.value = 0.5 * ndc.z + 0.5; }
      // the pastel ring (174.3): parked at frame (0.72, 0.30), at her eye's depth so it is crisp-soft in the rack's focus
      const hI = smoothstep(4.09, 4.3, tl) * (0.92 + 0.08 * Math.sin(T * 3.0));
      { const dEye = cam.distTo(camera, eye), ray = V(0.72 * 2 - 1, 1 - 0.30 * 2, 0.5).unproject(camera).sub(camera.position).normalize();
        haloRing.position.copy(camera.position).addScaledVector(ray, dEye / ray.dot(camera.getWorldDirection(new THREE.Vector3())));
        haloRing.quaternion.copy(camera.quaternion); haloRing.scale.setScalar(dEye * 0.24); haloRing.visible = hI > 0.002; }
      haloU.uI.value = 0; haloRingU.uI.value = 0.42 * hI;
      caustic.visible = false;
      const rack = ks([[1.93, 0], [2.71, 1]], tl, ease.inOutSine);
      DBGP.eye = eye; DBGP.jasmine = jw; DBGP.lens = magnifier.position.clone(); DBGP.ring = haloRing.position.clone();
      DBGP.gripL = R.hands.L.sockets.grip.getWorldPosition(new THREE.Vector3()); DBGP.handle = gripW;
      return { dof: { focus: lerp(cam.distTo(camera, magnifier.position), cam.distTo(camera, eye), rack), fstop: 2.2 }, exposure: 1.3, bloom: { strength: 0.35, threshold: 0.85 } };
    },
    };
  setups.default = setups.S012;

  return {
    scene, camera,
    post: { exposure: 1.0, temp: -0.14, saturation: 0.86, contrast: 1.05, grain: 0.035, vignette: 0.3, bloom: { strength: 0.3, threshold: 0.9, radius: 0.5 },
      lift: [0.028, 0.042, 0.07], shadowTint: [0.45, 0.5, 0.6], highTint: [0.54, 0.52, 0.48] },
    setShot(shot, tl, u, T) {
      const f = setups[shot.id] || setups.default;
      const r = f(tl, u, T, shot) || {};
      if (OFF.has('tris')) { const L = []; scene.traverseVisible((o) => { if (o.isMesh || o.isPoints) { const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; L.push([n | 0, o.name || o.parent?.name || '?', o.type, o.material?.type, o.castShadow]); } }); L.sort((a, b) => b[0] - a[0]); console.log('TRIS', JSON.stringify(L.slice(0, 14)), 'total', L.reduce((a, b) => a + b[0], 0)); }
      if (OFF.has('door')) { const g = doorBeam.group; g.updateMatrixWorld(true); const L = []; g.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); L.push([o.geometry.type, o.visible, b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2)), o.material.type, o.material.side]); } }); let v = true, p = g; while (p) { v = v && p.visible; p = p.parent; } console.log('DOOR', v, JSON.stringify(L)); }
      if (OFF.has('pts')) { camera.updateMatrixWorld(); camera.updateProjectionMatrix(); console.log('PTS', shot.id, tl.toFixed(2), JSON.stringify(Object.fromEntries(Object.entries(DBGP).map(([k, v]) => [k, scr(v)])))); }
      if (DBG.camd) { const t = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(DBG.camf || 0.9)); camera.position.sub(t).multiplyScalar(DBG.camd).add(t); if (DBG.camy) camera.position.y += DBG.camy; camera.lookAt(t); r.dof = null; }
      if (OFF.has('info')) { const i = ctx.renderer.info; i.autoReset = false; console.log('INFO programs', i.programs.length, 'calls', i.render.calls, 'tris', i.render.triangles, 'tex', i.memory.textures, 'geo', i.memory.geometries, 'pts', i.render.points, 'lines', i.render.lines); i.reset(); }
      if (OFF.size > 1 || OFF.has('dof') || OFF.has('lshadow')) {
        if (OFF.has('dof')) r.dof = null;
        lampLight.castShadow = !OFF.has('lshadow'); if (OFF.has('mshadow')) moonWL.light.castShadow = false;
        moonWL.object3D.visible = !OFF.has('moon'); coolFill.visible = !OFF.has('cool'); hemi.visible = !OFF.has('hemi');
        if (OFF.has('bloom')) r.bloom = { strength: 0 };
        if (OFF.has('env')) scene.environment = null;
        if (OFF.has('hands')) { handR.root.visible = handL.root.visible = false; }
        if (OFF.has('props')) props.visible = false;
        if (OFF.has('plainbowl')) { restored.material = bowlBase; shardB.material = bowlBase; shardC.material = bowlBase; }
        if (OFF.has('noclear')) { for (const m of [bowlBase, ...Object.values(trayMats), shardB.material, shardC.material]) { m.clearcoat = 0; } }
        for (const n of OFF) { const o = scene.getObjectByName(n); if (o) o.visible = false; }
        if (OFF.has('lamp')) lampLight.visible = false;
        if (OFF.has('basic') && !scene.userData.basic) { scene.userData.basic = 1; scene.traverse((o) => { if (o.isMesh && !o.material.isShaderMaterial) o.material = new THREE.MeshBasicMaterial({ color: 0x888888, map: o.material.map || null }); }); }
        if (OFF.has('lambert') && !scene.userData.basic) { scene.userData.basic = 1; scene.traverse((o) => { if (o.isMesh && !o.material.isShaderMaterial) o.material = new THREE.MeshLambertMaterial({ color: 0x888888, map: o.material.map || null }); }); }
        if (OFF.has('noshadowmap')) ctx.renderer.shadowMap.enabled = false;
        if (OFF.has('room')) for (const o of scene.children) if (o.isMesh && !o.material.isShaderMaterial) o.visible = false;
      }
      return r;
    },
  };
}
