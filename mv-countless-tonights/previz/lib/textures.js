// Procedural, seeded, cached CanvasTexture generators for the previz environment kit.
// Every generator is deterministic (seeded PRNG + periodic gradient noise) and cached by its params,
// so calling it twice returns the same THREE.Texture objects (shared GPU upload).
//
//   import * as TX from '/previz/lib/textures.js';
//   const w = TX.wood({ tone: 'ship', planks: 6, seed: 3 });   // -> { map, normalMap, roughnessMap, metalnessMap, ... }
//   const m = TX.mat('wood_ship', { repeat: [2, 2] });          // -> ready MeshStandardMaterial
//
// Conventions: `map` is sRGB, normal/roughness/metalness are linear. Roughness is in G, metalness in B
// (the same "ORM" texture is assigned to roughnessMap + metalnessMap; R holds cavity/AO).
// All textures tile (RepeatWrapping) unless stated (chart/letter/compass/porcelain bowl/stained glass are "cards").
import * as THREE from 'three';
import { rng } from '../engine/util.js';

// ---------------------------------------------------------------- palette (bible fallbacks)
export const PAL = { // bible.json palette (P01..P30); hex sRGB
  duskDeepest: '#0E1B30', duskBlue: '#1A2D4A', duskMid: '#2E4A6E', moonSilver: '#C8D2DB', moonMid: '#8F9EAD',
  qinghuaWhite: '#EDF1EF', cobalt: '#2B4A8B', cobaltDeep: '#18294F', copperGold: '#B08D57', brassDark: '#6E5536', brassHi: '#D2B27E',
  verdigris: '#5E8C7E', candle: '#E2A458', flameOrange: '#C67A35', paper: '#D6C6A2', smallRed: '#A33A2E',
  dawnBlueGrey: '#5B6F8A', dawnPeach: '#EBB894', dawnCream: '#F5E4C8', sgRuby: '#9A4545', sgAmber: '#C9913F', sgCobalt: '#34548F',
  sgSea: '#4C7F68', sgRose: '#C98F8A', blackFloor: '#0A0F17', phone: '#C9D8E6', tea: '#C9A55A', ink: '#231c15', indigo: '#1e2b4b',
};

// ---------------------------------------------------------------- cache + canvas helpers
const CACHE = new Map();
function cached(name, o, fn) {
  const k = name + ':' + JSON.stringify(o);
  if (!CACHE.has(k)) CACHE.set(k, fn());
  return CACHE.get(k);
}
export function clearCache() { for (const v of CACHE.values()) for (const t of Object.values(v || {})) if (t && t.isTexture) t.dispose(); CACHE.clear(); }

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = true, wrap = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}
// Clone a texture set with a repeat (clones share the GPU upload).
export function withRepeat(set, rx = 1, ry = rx, offset = [0, 0]) {
  const out = {};
  for (const [k, v] of Object.entries(set)) {
    if (v && v.isTexture) { const t = v.clone(); t.repeat.set(rx, ry); t.offset.set(offset[0], offset[1]); t.needsUpdate = true; out[k] = t; }
    else out[k] = v;
  }
  return out;
}

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hexRGB = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------------------------------------------------------------- noise
// Periodic 2-D gradient noise: n(x, y, px, py) tiles with integer periods px, py (<= 512). Range ≈ [-1, 1].
export function makeNoise(seed = 1) {
  const r = rng(seed * 7919 + 13);
  const p = new Int32Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Int32Array(2048);
  for (let i = 0; i < 2048; i++) perm[i] = p[i & 255];
  const GX = new Float64Array(256), GY = new Float64Array(256);
  for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; GX[i] = Math.cos(a); GY[i] = Math.sin(a); }
  function n(x, y, px, py) {
    const fx0 = Math.floor(x), fy0 = Math.floor(y);
    const xf = x - fx0, yf = y - fy0;
    let xi = fx0 % px; if (xi < 0) xi += px;
    let yi = fy0 % py; if (yi < 0) yi += py;
    let xj = xi + 1; if (xj >= px) xj = 0;
    let yj = yi + 1; if (yj >= py) yj = 0;
    xi &= 1023; xj &= 1023; yi &= 1023; yj &= 1023;
    const pa = perm[xi], pb = perm[xj];
    const a = perm[pa + yi], b = perm[pb + yi], c = perm[pa + yj], d = perm[pb + yj];
    const n00 = GX[a] * xf + GY[a] * yf, n10 = GX[b] * (xf - 1) + GY[b] * yf;
    const n01 = GX[c] * xf + GY[c] * (yf - 1), n11 = GX[d] * (xf - 1) + GY[d] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const x0 = n00 + u * (n10 - n00), x1 = n01 + u * (n11 - n01);
    return (x0 + v * (x1 - x0)) * 1.42;
  }
  // fbm over unit square coords (x,y in [0,1)), base frequency f (integer), tiles.
  function fbm(x, y, f, oct, gain, fy) {
    if (oct === undefined) oct = 4; if (gain === undefined) gain = 0.5; if (fy === undefined) fy = f;
    let s = 0, a = 1, norm = 0, F = f, FY = fy;
    for (let o = 0; o < oct; o++) { s += a * n(x * F + o * 17.3, y * FY + o * 31.7, F, FY); norm += a; a *= gain; F *= 2; FY *= 2; }
    return s / norm;
  }
  function ridged(x, y, f, oct, fy) {
    if (oct === undefined) oct = 4; if (fy === undefined) fy = f;
    let s = 0, a = 1, norm = 0, F = f, FY = fy;
    for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(n(x * F + o * 9.1, y * FY + o * 5.3, F, FY))); norm += a; a *= 0.5; F *= 2; FY *= 2; }
    return s / norm;
  }
  return { n, fbm, ridged };
}

// Integer hash -> [0,1)
function hash2(ix, iy, s = 0) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Periodic Worley: writes F1, F2, id into WR (shared) for unit coords with integer cell counts fx, fy.
const WR = new Float64Array(3);
function worley(x, y, fx, fy, seed = 0, jitter = 0.9) {
  const X = x * fx, Y = y * fy;
  const cx = Math.floor(X), cy = Math.floor(Y);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) {
    const gy = cy + j; let wy = gy % fy; if (wy < 0) wy += fy;
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i; let wx = gx % fx; if (wx < 0) wx += fx;
      const px = gx + 0.5 + (hash2(wx, wy, seed) - 0.5) * jitter, py = gy + 0.5 + (hash2(wx, wy, seed + 1) - 0.5) * jitter;
      const dx = px - X, dy = py - Y, d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; id = wx + wy * fx; } else if (d < f2) f2 = d;
    }
  }
  WR[0] = Math.sqrt(f1); WR[1] = Math.sqrt(f2); WR[2] = id;
  return WR;
}

// ---------------------------------------------------------------- field -> canvas helpers
// Height field (Float32Array, row 0 = top of canvas) -> tangent-space normal map canvas (OpenGL +Y).
function normalFromHeight(h, w, hh, strength = 2) {
  const c = cv(w, hh), g = c.getContext('2d'), img = g.createImageData(w, hh), d = img.data;
  for (let y = 0; y < hh; y++) {
    const yu = ((y - 1 + hh) % hh) * w, yd = ((y + 1) % hh) * w, yr = y * w;
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w, xr = (x + 1) % w;
      const dx = (h[yr + xr] - h[yr + xl]) * 0.5 * strength;
      const dy = (h[yd + x] - h[yu + x]) * 0.5 * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz); nx *= l; ny *= l; nz *= l;
      const o = (yr + x) * 4;
      d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
// RGB(A) Float32/Uint8 buffers -> canvas
function rgbCanvas(buf, w, h, alpha = null) {
  const c = cv(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let i = 0, n = w * h; i < n; i++) { d[i * 4] = buf[i * 3]; d[i * 4 + 1] = buf[i * 3 + 1]; d[i * 4 + 2] = buf[i * 3 + 2]; d[i * 4 + 3] = alpha ? alpha[i] : 255; }
  g.putImageData(img, 0, 0);
  return c;
}
// ORM canvas: R = cavity/ao, G = roughness, B = metalness (all 0..1 Float32 or constants)
function ormCanvas(w, h, rough, metal = 0, ao = 1) {
  const c = cv(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let i = 0, n = w * h; i < n; i++) {
    d[i * 4] = (typeof ao === 'number' ? ao : ao[i]) * 255;
    d[i * 4 + 1] = (typeof rough === 'number' ? rough : rough[i]) * 255;
    d[i * 4 + 2] = (typeof metal === 'number' ? metal : metal[i]) * 255;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function readCanvas(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; }
function finish({ col, w, h, height, nStrength = 2, rough, metal = 0, ao = 1, alpha = null, srgbWrap = true }) {
  const out = {};
  out.map = tex(col instanceof HTMLCanvasElement ? col : rgbCanvas(col, w, h, alpha), { wrap: srgbWrap });
  if (height) { out.normalMap = tex(normalFromHeight(height, w, h, nStrength), { srgb: false, wrap: srgbWrap }); out.height = height; }
  if (rough !== undefined) { const o = tex(ormCanvas(w, h, rough, metal, ao), { srgb: false, wrap: srgbWrap }); out.roughnessMap = o; out.metalnessMap = o; out.aoMap = o; }
  delete out.height;
  return out;
}

// Brush stroke stamping (for ink, handwriting, cobalt painting). pts = [[x,y],...], widths w0->w1.
function brush(g, pts, w0, w1, color, alpha = 1, jitter = 0, r = null) {
  g.save(); g.fillStyle = color;
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = seg[i - 1];
    const step = Math.max(0.35, Math.min(w0, w1) * 0.25);
    for (let s = 0; s <= l; s += step) {
      const t = (acc + s) / (total || 1);
      const wd = lerp(w0, w1, t) * (1 - 0.35 * Math.pow(Math.abs(t - 0.5) * 2, 3));
      const x = lerp(ax, bx, s / (l || 1)), y = lerp(ay, by, s / (l || 1));
      g.globalAlpha = alpha * (r && jitter ? 1 - jitter * r() : 1);
      g.beginPath(); g.arc(x, y, Math.max(0.3, wd / 2), 0, Math.PI * 2); g.fill();
    }
    acc += l;
  }
  g.restore();
}
// Quadratic-bezier sampled polyline
function bez(p0, p1, p2, n = 12) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; o.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return o; }
function bez3(p0, p1, p2, p3, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3; o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); } return o; }

// ================================================================= shader noise texture
// 256² RGBA tileable noise for shaders: R = fbm (period 8), G = fbm (period 32, finer), B = worley F1 (16 cells),
// A = fbm offset (period 8). Linear, repeat, mipmapped. Shared by sky/sea/fx/glass.
export function noiseTexture(size = 256, seed = 7) {
  return cached('noiseTexture', { size, seed }, () => {
    const N = makeNoise(seed), N2 = makeNoise(seed + 101);
    const d = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, o = (y * size + x) * 4;
      d[o] = clamp(N.fbm(u, v, 8, 5) * 0.5 + 0.5) * 255;
      d[o + 1] = clamp(N.fbm(u, v, 32, 3) * 0.5 + 0.5) * 255;
      worley(u, v, 16, 16, seed); d[o + 2] = clamp(WR[0] / 0.9) * 255;
      d[o + 3] = clamp(N2.fbm(u, v, 8, 5) * 0.5 + 0.5) * 255;
    }
    const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    return t;
  });
}
// Tileable water detail normal map (linear), two-octave capillary/chop field. Sampled at 2 scrolling scales by sea.js.
export function waterNormalTexture(size = 256, seed = 21) {
  return cached('waterNormal', { size, seed }, () => {
    const N = makeNoise(seed), h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      h[y * size + x] = N.fbm(u, v, 6, 5, 0.55) * 0.7 + (1 - Math.abs(N.n(u * 12, v * 12, 12, 12))) * 0.3;
    }
    const c = normalFromHeight(h, size, size, 9);
    const t = tex(c, { srgb: false });
    return t;
  });
}
// Soft radial sprite (gaussian-ish), linear, for particles/glows. kind: 'soft' | 'disc' | 'wisp'
export function spriteTexture(kind = 'soft', size = 128, seed = 3) {
  return cached('sprite', { kind, size, seed }, () => {
    const N = makeNoise(seed);
    const d = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1, r = Math.sqrt(u * u + v * v);
      let a;
      if (kind === 'disc') a = sstep(1, 0.75, r);
      else if (kind === 'wisp') { const n = N.fbm(x / size, y / size, 3, 4) * 0.5 + 0.5; a = Math.pow(clamp(1 - r), 1.5) * (0.35 + 0.65 * sstep(0.25, 0.7, n * (1.2 - r * 0.4))); }
      else a = Math.exp(-r * r * 4.5) * sstep(1, 0.85, r);
      const o = (y * size + x) * 4; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = clamp(a) * 255;
    }
    const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  });
}

// ================================================================= WOOD
// Aged planks (ship deck / home floor / beams). tone: 'ship' | 'home' | 'beam' | 'pale' | 'lacquer'
// planks: count across (tiles horizontally); grain runs along V. salt: 0..1 crust in seams.
const WOOD_TONES = {
  ship:    { dark: [58, 46, 36], base: [112, 92, 70], light: [158, 136, 106], grey: 0.35 },
  home:    { dark: [44, 27, 17], base: [96, 62, 38], light: [138, 96, 60], grey: 0.05 },
  beam:    { dark: [32, 22, 15], base: [70, 50, 34], light: [104, 78, 54], grey: 0.15 },
  pale:    { dark: [104, 86, 64], base: [168, 146, 112], light: [204, 184, 150], grey: 0.15 },
  lacquer: { dark: [30, 12, 8], base: [70, 26, 16], light: [110, 50, 28], grey: 0 },
  teak:    { dark: [58, 38, 24], base: [94, 68, 48], light: [132, 98, 68], grey: 0.0 },     // LOC_GALLERY / corridor waxed teak #5E4430
  camphor: { dark: [36, 24, 17], base: [62, 43, 31], light: [92, 66, 46], grey: 0.0 },      // LOC_HOME table #3E2B1F
  smoke:   { dark: [30, 22, 16], base: [58, 42, 30], light: [84, 64, 46], grey: 0.1 },      // LOC_CABIN smoke-blackened fir #3A2A1E
  pew:     { dark: [52, 34, 22], base: [90, 62, 42], light: [124, 90, 62], grey: 0.0 },     // LOC_CHAPEL pews #5A3E2A
};
export function wood(o = {}) {
  const p = { size: 512, planks: 6, tone: 'ship', seed: 1, joints: 1, knots: 1, salt: 0, wear: 0.5, gap: 1, wax: null, ...o };
  if (p.wax === null) p.wax = ['teak', 'camphor', 'pew', 'lacquer'].includes(p.tone) ? 0.6 : 0;
  return cached('wood', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed * 31 + 5);
    const T = WOOD_TONES[p.tone] || WOOD_TONES.ship;
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const pw = W / p.planks;
    // per plank: joints (y positions in 0..1) and per-piece params
    const planks = [];
    for (let i = 0; i < p.planks; i++) {
      const nj = p.joints > 0 ? Math.floor(r() * (p.joints + 1)) + (r() < 0.6 ? 1 : 0) : 0;
      const js = []; for (let j = 0; j < nj; j++) js.push(r()); js.sort();
      const pieces = []; for (let j = 0; j <= js.length; j++) pieces.push({ tone: r() * 2 - 1, phase: r(), freq: 22 + r() * 16, pith: (r() - 0.5) * 4, d0: 0.8 + r() * 1.6, dv: (r() - 0.5) * 2.5, dk: 1 + Math.floor(r() * 2), dph: r() * 6.28, knot: r() < 0.35 * p.knots ? [0.2 + r() * 0.6, r(), 0.05 + r() * 0.05] : null, grey: r() });
      planks.push({ js, pieces, tone: r() * 2 - 1 });
    }
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W, pi = Math.floor(x / pw), lx = (x - pi * pw) / pw, PL = planks[pi];
        let k = 0; while (k < PL.js.length && v > PL.js[k]) k++;
        const pc = PL.pieces[k];
        // distance to joints
        let dj = 1; for (const j of PL.js) { const dd = Math.min(Math.abs(v - j), 1 - Math.abs(v - j)); if (dd < dj) dj = dd; }
        // flat-sawn board: the cut plane crosses conical growth rings -> long streaks + cathedral arches
        const wv = N.fbm(u, v, 2 * p.planks, 3, 0.5, 1);
        let ox = lx + wv * 0.12;
        if (pc.knot) { const [kx, ky, kr] = pc.knot; const dx = (lx - kx), dy = (v - ky) * 4; const d2 = dx * dx + dy * dy + 1e-4; ox += 0.6 * kr * kr * dx / (d2 + kr * kr * 0.5); }
        const depth = pc.d0 + 0.07 * Math.sin(v * 6.2832 * pc.dk + pc.dph) + 0.03 * N.n(u * 4, v * 3, 4, 3);
        const dx0 = ox - pc.pith;
        const rr = Math.sqrt(dx0 * dx0 * 0.12 + depth * depth) * pc.freq + pc.phase;
        const f = rr - Math.floor(rr);
        const late = sstep(0.62, 0.9, f) * sstep(1.0, 0.94, f);
        const ringsSharp = 0.5 - late - 0.25 * f;
        const fib = N.n(u * 192 * p.planks / 6, v * 5, (192 * p.planks / 6) | 0, 5) * 0.55 + N.n(u * 512, v * 10, 512, 10) * 0.35;
        let t = 0.6 - 0.26 * late - 0.08 * f + 0.16 * fib + 0.1 * pc.tone + 0.06 * PL.tone;
        // weathering: greyed / bleached patches, grime
        const weather = N.fbm(u, v, 3, 4) * 0.5 + 0.5;
        const grey = clamp(T.grey * (0.5 + weather) * (0.6 + 0.8 * pc.grey));
        let c = t < 0.5 ? mix3(T.dark, T.base, t * 2) : mix3(T.base, T.light, (t - 0.5) * 2);
        const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
        c = mix3(c, [lum * 1.04, lum * 1.03, lum], grey);
        // knot dark
        let knotD = 0;
        if (pc.knot) { const [kx, ky, kr] = pc.knot; const dx = (lx - kx) / kr, dy = (v - ky) / (kr * 0.35); const d = Math.sqrt(dx * dx + dy * dy); knotD = sstep(1.0, 0.2, d); c = mix3(c, T.dark, knotD * 0.75); }
        // seams / gaps
        const edge = Math.min(lx, 1 - lx) * pw; // px to long edge
        const gapW = 1.6 * p.gap * (W / 1024);
        const seam = sstep(gapW + 1.2, gapW * 0.4, edge);
        const jseam = sstep((gapW + 1.0) / H, (gapW * 0.4) / H, dj);
        const s = Math.max(seam, jseam);
        const nearSeam = sstep(gapW * 9, gapW, edge);
        // grime near seams, wear in the middle
        const grime = nearSeam * 0.35 + (N.fbm(u, v, 8, 3) * 0.5 + 0.5) * 0.12;
        c = mix3(c, [c[0] * 0.55, c[1] * 0.5, c[2] * 0.45], clamp(grime));
        const wearM = p.wear * sstep(0.55, 0.9, weather) * (1 - nearSeam);
        c = mix3(c, mix3(c, T.light, 0.6), wearM * 0.4);
        // salt crust in low areas
        let salt = 0;
        if (p.salt > 0) { const sn = N.fbm(u + 0.37, v + 0.11, 16, 3) * 0.5 + 0.5; salt = clamp((nearSeam * 0.9 + sstep(0.62, 0.8, sn) * 0.6 - (1 - p.salt) * 0.9) * p.salt * 1.6); c = mix3(c, [214, 210, 198], salt * 0.85); }
        c = mix3(c, [12, 9, 7], s * 0.92);
        const i = y * W + x;
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.55 - 0.12 * late * (0.4 + p.wear) + 0.1 * fib - 0.6 * s - 0.1 * knotD + salt * 0.15;
        rough[i] = clamp(0.62 + 0.18 * weather + 0.1 * s - wearM * 0.15 + salt * 0.15 - p.wax * (0.32 - 0.12 * weather) * (1 - s));
        ao[i] = 1 - s * 0.8 - nearSeam * 0.2;
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 6 * W / 1024, rough, metal: 0, ao });
  });
}

// ================================================================= PLASTER / LIME WASH
// tone: 'lime' (warm off-white) | 'grey' | 'warm' | 'blue' (old blue-grey wash) ; damp: rising damp 0..1 ; flake 0..1 ; cracks 0..1
const PLASTER_TONES = { lime: [222, 214, 196], grey: [176, 174, 166], warm: [206, 186, 156], blue: [150, 164, 172], museum: [196, 192, 184] };
export function plaster(o = {}) {
  const p = { size: 512, tone: 'lime', seed: 2, damp: 0.5, flake: 0.4, cracks: 0.5, strokes: 0.6, ...o };
  return cached('plaster', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), N2 = makeNoise(p.seed + 9);
    const base = PLASTER_TONES[p.tone] || PLASTER_TONES.lime;
    const under = [128, 112, 94];
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W, i = y * W + x;
        const low = N.fbm(u, v, 3, 5) * 0.5 + 0.5;
        const mid = N.fbm(u, v, 12, 3);
        const hi = N.n(u * 96, v * 96, 96, 96) * 0.6 + N.n(u * 220, v * 220, 220, 220) * 0.4;
        // wash strokes (anisotropic) + vertical grime streaks running down
        const st = (N2.n(u * 16, v * 90, 16, 90) * 0.6 + N2.n(u * 90, v * 20, 90, 20) * 0.4) * p.strokes;
        const streak = Math.max(0, N2.n(u * 48, v * 2, 48, 2)) * sstep(0.45, 0.8, N2.fbm(u, v, 4, 2) * 0.5 + 0.5);
        let c = base.map((b, k) => b * (0.8 + 0.26 * low + 0.06 * mid + 0.04 * st + 0.02 * hi) - (k === 2 ? 8 * low : 0));
        c = mix3(c, [c[0] * 0.78, c[1] * 0.76, c[2] * 0.72], streak * 0.45);
        // rising damp: darker, slightly green-brown toward the bottom with an irregular tide line
        const tide = 0.28 * p.damp + 0.06 * N.fbm(u, 0.5, 6, 3);
        const dm = p.damp > 0 ? clamp(sstep(1 - tide, 1 - tide + 0.1, v)) : 0;
        c = mix3(c, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.6], dm * 0.75 * (0.7 + 0.6 * low));
        const tideLine = p.damp > 0 ? Math.exp(-Math.pow((v - (1 - tide)) / 0.005, 2)) * 0.3 : 0;
        c = mix3(c, [118, 100, 76], tideLine);
        // hairline cracks
        const cr = N.ridged(u, v, 5, 4);
        const gate = sstep(0.5, 0.7, N2.fbm(u, v, 3, 2) * 0.5 + 0.5) * p.cracks;
        const crack = sstep(0.94, 0.975, cr) * gate;
        // flakes (exposed under-layer) with a lit/shadowed rim
        const fl = N.fbm(u + 0.3, v + 0.7, 8, 5) * 0.5 + 0.5;
        const fth = 1 - p.flake * (0.28 + 0.12 * dm);
        const flake = sstep(fth, fth + 0.01, fl);
        const rim = Math.exp(-Math.pow((fl - fth) / 0.01, 2)) * p.flake;
        if (flake > 0) c = mix3(c, under.map((b) => b * (0.8 + 0.4 * low + 0.1 * hi)), flake);
        c = mix3(c, [c[0] * 0.45, c[1] * 0.43, c[2] * 0.4], crack * 0.9 + rim * 0.2);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.5 + low * 0.25 + mid * 0.08 + st * 0.06 + hi * 0.035 + (1 - flake) * 0.12 - crack * 0.2;
        rough[i] = clamp(0.84 + 0.1 * low - 0.06 * dm + 0.04 * hi);
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 7 * W / 1024, rough });
  });
}

// ================================================================= STONE FLAGS
// Irregular rectangular flagstones in running bond. tone: 'granite' | 'warm' | 'dark'; rows across V.
const STONE_TONES = { granite: [128, 124, 116], warm: [146, 132, 112], dark: [78, 76, 74], blue: [104, 110, 116] };
export function stone(o = {}) {
  const p = { size: 512, rows: 4, tone: 'granite', seed: 3, wear: 0.5, grout: 1, ...o };
  return cached('stone', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed * 17 + 3);
    const base = STONE_TONES[p.tone] || STONE_TONES.granite;
    const rows = [];
    for (let j = 0; j < p.rows; j++) {
      const n = 2 + Math.floor(r() * 3); const ws = []; let s = 0; for (let k = 0; k < n; k++) { const w = 0.6 + r(); ws.push(w); s += w; }
      const off = r(); let acc = off; const cuts = []; for (const w of ws) { cuts.push(acc % 1); acc += w / s; }
      cuts.sort((a, b) => a - b);
      rows.push({ cuts, tones: Array.from({ length: n }, () => [r() * 2 - 1, r() * 2 - 1]) });
    }
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const rh = H / p.rows, gw = 2.2 * p.grout * W / 1024;
    for (let y = 0; y < H; y++) {
      const v = y / H, ri = Math.floor(y / rh), R = rows[ri], ly = y - ri * rh;
      for (let x = 0; x < W; x++) {
        const u = x / W, i = y * W + x;
        // which slab & distance to vertical joints (wrapping)
        let k = R.cuts.length - 1; for (let c = 0; c < R.cuts.length; c++) if (u >= R.cuts[c]) k = c;
        let dx = 1; for (const c of R.cuts) { const d = Math.abs(u - c); dx = Math.min(dx, d, 1 - d); }
        const wob = N.n(u * 40, v * 40, 40, 40) * 1.2 + N.n(u * 120, v * 120, 120, 120) * 0.5;
        const ex = dx * W + wob, ey = Math.min(ly, rh - ly) + wob;
        const e = Math.min(ex, ey);
        const groove = sstep(gw + 1.5, gw * 0.3, e);
        const bevel = sstep(gw + 10, gw, e);
        const [t1, t2] = R.tones[k];
        const speck = N.n(u * 400, v * 400, 400, 400), speck2 = N.n(u * 900 + 3, v * 900, 900, 900);
        const low = N.fbm(u, v, 4, 4) * 0.5 + 0.5;
        let c = base.map((b) => b * (0.86 + 0.1 * t1 + 0.18 * low));
        c = mix3(c, [c[0] * 1.12, c[1] * 1.04, c[2] * 0.95], 0.5 + 0.5 * t2);
        if (speck > 0.55) c = mix3(c, [40, 38, 36], 0.55);
        if (speck2 > 0.62) c = mix3(c, [210, 206, 198], 0.5);
        const wearM = p.wear * sstep(0.45, 0.8, low);
        c = mix3(c, [c[0] * 0.55, c[1] * 0.52, c[2] * 0.5], groove * 0.9 + bevel * 0.12);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.6 + 0.08 * low + 0.02 * speck - groove * 0.5 - bevel * 0.12;
        rough[i] = clamp(0.78 - wearM * 0.32 + groove * 0.15 + 0.06 * speck);
        ao[i] = 1 - groove * 0.7;
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 5 * W / 1024, rough, ao });
  });
}

// ================================================================= TERRAZZO (polished museum floor)
// Chips of marble in a cement matrix, polished, with thin brass divider strips at tile edges (tiles = tiles across).
export function terrazzo(o = {}) {
  const p = { size: 512, tone: 'warmgrey', seed: 4, tiles: 1, strips: true, ...o };
  return cached('terrazzo', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const matrix = p.tone === 'dark' ? [62, 62, 64] : p.tone === 'cool' ? [150, 154, 156] : [156, 150, 140];
    const chips = p.tone === 'dark'
      ? [[30, 30, 32], [96, 94, 92], [150, 146, 140], [44, 50, 58], [120, 104, 88]]
      : [[214, 210, 202], [188, 184, 176], [168, 162, 152], [112, 110, 108], [70, 70, 72], [176, 156, 132], [150, 140, 126]];
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), metal = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W, i = y * W + x;
        const low = N.fbm(u, v, 3, 4) * 0.5 + 0.5;
        let c = matrix.map((b) => b * (0.92 + 0.12 * low));
        // big chips
        worley(u + N.n(u * 30, v * 30, 30, 30) * 0.004, v, 56, 56, p.seed, 1); const a1 = WR[0], b1 = WR[1], id1 = WR[2];
        const chip1 = sstep(0.1, 0.16, b1 - a1) * (hash2(id1, 1, p.seed) < 0.32 ? 1 : 0);
        // small chips
        worley(u, v, 150, 150, p.seed + 5, 1); const a2 = WR[0], b2 = WR[1], id2 = WR[2];
        const chip2 = sstep(0.1, 0.2, b2 - a2) * (hash2(id2, 2, p.seed) < 0.5 ? 1 : 0);
        const fine = N.n(u * 700, v * 700, 700, 700);
        if (chip2 > 0) { const cc = chips[Math.floor(hash2(id2, 3, p.seed) * chips.length)]; c = mix3(c, cc.map((q) => q * (0.9 + 0.2 * hash2(id2, 4))), chip2); }
        if (chip1 > 0) { const cc = chips[Math.floor(hash2(id1, 5, p.seed) * chips.length)]; c = mix3(c, cc.map((q) => q * (0.88 + 0.24 * hash2(id1, 6) + 0.05 * fine)), chip1); }
        if (fine > 0.7) c = mix3(c, [70, 68, 66], 0.4);
        let strip = 0;
        if (p.strips) { const tu = (u * p.tiles) % 1, tv = (v * p.tiles) % 1; const d = Math.min(tu, 1 - tu, tv, 1 - tv) * W / p.tiles; strip = sstep(2.2, 1.2, d); }
        c = mix3(c, [150, 118, 72], strip);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.5 + 0.02 * low + 0.01 * fine;
        const scratch = Math.abs(N.n(u * 6, v * 300, 6, 300)) < 0.02 ? 0.12 : 0;
        rough[i] = clamp(0.16 + 0.12 * (1 - low) + scratch + strip * 0.1);
        metal[i] = strip;
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 1.5, rough, metal });
  });
}

// ================================================================= BRASS / BRONZE (oxidised, patina)
// tone: 'brass' | 'bronze' | 'copper' ; patina 0..1 (verdigris in crevices) ; polish 0..1 (rubbed highlights) ; scratches 0..1
const METAL_TONES = {
  brass:  { metal: [176, 141, 87], tarn: [110, 85, 54], dark: [58, 44, 28], hi: [210, 178, 126] },
  then:   { metal: [184, 146, 90], tarn: [130, 100, 62], dark: [74, 58, 40], hi: [210, 178, 126] },     // PROP_COMPASS then: warm brass, soot in grooves
  museum: { metal: [110, 85, 54], tarn: [86, 64, 42], dark: [50, 38, 26], hi: [176, 141, 87] },       // museum: chocolate patina, honey high points
  bronze: { metal: [146, 108, 70], tarn: [78, 56, 36], dark: [44, 32, 22], hi: [180, 140, 96] },
  copper: { metal: [176, 112, 80], tarn: [96, 56, 40], dark: [52, 30, 22], hi: [210, 150, 110] },
  iron:   { metal: [92, 90, 88], tarn: [70, 58, 50], dark: [36, 32, 30], hi: [130, 128, 124] },
};
function metalField(W, H, p, N, N2) {
  const T = METAL_TONES[p.tone] || METAL_TONES.brass;
  const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), metal = new Float32Array(W * H), ao = new Float32Array(W * H);
  // scratches drawn on a canvas
  const sc = cv(W, H), sg = sc.getContext('2d'), r = rng(p.seed * 13 + 1);
  sg.strokeStyle = '#fff'; sg.lineCap = 'round';
  const nS = Math.round(260 * (p.scratches ?? 0.5) * (W * H) / (512 * 512));
  for (let i = 0; i < nS; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = (4 + r() * 40) * W / 512;
    sg.globalAlpha = 0.15 + r() * 0.5; sg.lineWidth = 0.6 + r() * 0.8;
    sg.beginPath(); sg.moveTo(x, y); sg.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l); sg.stroke();
  }
  const sd = readCanvas(sc);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W, i = y * W + x;
      const low = N.fbm(u, v, 3, 4) * 0.5 + 0.5, mid = N.fbm(u, v, 12, 3) * 0.5 + 0.5;
      const cav = low * 0.7 + mid * 0.3; // high = exposed, low = crevice
      worley(u, v, 48, 48, p.seed, 0.9);
      const pit = WR[0] < 0.1 && hash2(WR[2], 7, p.seed) < 0.08 ? sstep(0.1, 0.03, WR[0]) * (0.4 + 0.6 * hash2(WR[2], 8, p.seed)) : 0;
      const scr = sd[i * 4] / 255;
      const tarn = sstep(0.62, 0.3, cav);
      const pn = N2.fbm(u, v, 6, 4) * 0.5 + 0.5;
      const pat = clamp((p.patina ?? 0.4) * 1.6 * sstep(0.5, 0.75, pn + (1 - cav) * 0.45 - 0.2) + pit * 0.6 * (p.patina ?? 0.4));
      const pol = (p.polish ?? 0.5) * sstep(0.6, 0.85, cav);
      let c = mix3(T.metal, T.tarn, tarn * 0.8);
      c = mix3(c, T.dark, tarn * tarn * 0.4 + pit * 0.5);
      c = mix3(c, T.hi || T.metal.map((q) => Math.min(255, q * 1.18)), pol * 0.6 + scr * 0.25);
      const vg = mix3([94, 140, 126], [140, 172, 150], sstep(0.4, 0.9, N2.n(u * 64, v * 64, 64, 64) * 0.5 + 0.5));
      c = mix3(c, vg, pat);
      if (p.salt) { const sn = N2.fbm(u + 0.4, v, 16, 3) * 0.5 + 0.5; const sm = clamp(sstep(0.6, 0.75, sn + (1 - cav) * 0.3) * p.salt); c = mix3(c, [206, 204, 196], sm * 0.8); }
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = 0.5 + 0.12 * low + 0.05 * mid - 0.25 * pit - 0.08 * scr + pat * 0.1;
      rough[i] = clamp(0.3 + 0.22 * tarn - 0.12 * pol + 0.1 * scr + pat * 0.55);
      metal[i] = clamp(1 - pat * 0.92);
      ao[i] = 1 - pit * 0.5;
    }
  }
  return { col, hgt, rough, metal, ao, T };
}
export function brass(o = {}) {
  const p = { size: 512, tone: 'brass', seed: 5, patina: 0.4, polish: 0.5, scratches: 0.5, salt: 0, ...o };
  return cached('brass', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), N2 = makeNoise(p.seed + 3);
    const f = metalField(W, H, p, N, N2);
    return finish({ col: f.col, w: W, h: H, height: f.hgt, nStrength: 4 * W / 512, rough: f.rough, metal: f.metal, ao: f.ao });
  });
}

// Pseudo-glyph: 3..7 brush/engrave strokes inside a box (never a real character). Returns stroke list in [-0.5,0.5]².
function pseudoGlyph(r, nMin = 3, nMax = 7) {
  const out = [], n = nMin + Math.floor(r() * (nMax - nMin + 1));
  const split = r(); // component layout: 0..0.33 none, ..0.66 left|right, else top|bottom
  for (let k = 0; k < n; k++) {
    let x0 = -0.45, x1 = 0.45, y0 = -0.45, y1 = 0.45;
    if (split > 0.33 && split < 0.66) { if (k % 2) x0 = -0.02; else x1 = 0.02; }
    else if (split >= 0.66) { if (k % 2) y0 = -0.02; else y1 = 0.02; }
    const t = r(), cx = lerp(x0, x1, 0.2 + 0.6 * r()), cy = lerp(y0, y1, 0.2 + 0.6 * r());
    const w = (x1 - x0), h = (y1 - y0);
    if (t < 0.32) { const l = w * (0.4 + 0.5 * r()); out.push({ k: 'h', pts: [[cx - l / 2, cy + 0.02], [cx, cy - 0.01], [cx + l / 2, cy - 0.03]] }); }
    else if (t < 0.58) { const l = h * (0.45 + 0.5 * r()); out.push({ k: 'v', pts: [[cx, cy - l / 2], [cx + 0.01, cy], [cx - 0.005, cy + l / 2]] }); }
    else if (t < 0.72) { out.push({ k: 'd', pts: [[cx, cy], [cx + 0.04, cy + 0.06]] }); }
    else if (t < 0.86) { const l = 0.25 + 0.3 * r(); out.push({ k: 'p', pts: [[cx + l * 0.3, cy - l * 0.5], [cx + l * 0.1, cy], [cx - l * 0.45, cy + l * 0.45]] }); }
    else { const l = 0.25 + 0.3 * r(); out.push({ k: 'n', pts: [[cx - l * 0.35, cy - l * 0.5], [cx, cy + l * 0.05], [cx + l * 0.5, cy + l * 0.45]] }); }
    if (r() < 0.3) { const last = out[out.length - 1].pts, e = last[last.length - 1]; last.push([e[0] - 0.08 + r() * 0.04, e[1] - 0.06]); }
  }
  return out;
}

// Handwriting pseudo-glyph: block-structured strokes (component layouts) that read as brush writing but are not characters.
function handGlyph(r) {
  const boxes = [], L = r();
  if (L < 0.3) boxes.push([-0.45, -0.45, 0.45, 0.45]);
  else if (L < 0.62) { const m = -0.12 + r() * 0.2; boxes.push([-0.45, -0.42, m - 0.03, 0.45], [m + 0.03, -0.45, 0.45, 0.45]); }
  else if (L < 0.85) { const m = -0.08 + r() * 0.16; boxes.push([-0.42, -0.45, 0.42, m - 0.03], [-0.45, m + 0.03, 0.45, 0.45]); }
  else { boxes.push([-0.45, -0.4, -0.1, 0.45], [-0.05, -0.45, 0.45, -0.02], [-0.05, 0.03, 0.45, 0.45]); }
  const out = [];
  for (const [x0, y0, x1, y1] of boxes) {
    const w = x1 - x0, h = y1 - y0, nh = 1 + Math.floor(r() * 3), nv = Math.floor(r() * 2.4);
    if (r() < 0.35) out.push({ k: 'd', pts: [[x0 + w * (0.4 + r() * 0.2), y0 + h * 0.02], [x0 + w * (0.5 + r() * 0.2), y0 + h * 0.14]] });
    for (let k = 0; k < nh; k++) { const yy = y0 + h * (0.2 + 0.65 * (nh === 1 ? 0.4 + r() * 0.2 : k / (nh - 1))), l0 = x0 + w * (0.02 + r() * 0.15), l1 = x1 - w * (0.02 + r() * 0.15); out.push({ k: 'h', pts: [[l0, yy + h * 0.02], [lerp(l0, l1, 0.5), yy - h * 0.01], [l1, yy - h * 0.04]] }); }
    for (let k = 0; k < nv; k++) { const xx = x0 + w * (nv === 1 ? 0.42 + r() * 0.16 : 0.22 + 0.56 * k), t0 = y0 + h * (0.02 + r() * 0.12), t1 = y1 - h * (0.0 + r() * 0.2); out.push({ k: 'v', pts: [[xx, t0], [xx + w * 0.02, lerp(t0, t1, 0.5)], [xx - w * 0.01, t1]] }); if (r() < 0.3) out[out.length - 1].pts.push([xx - w * 0.12, t1 - h * 0.08]); }
    if (r() < 0.4) out.push({ k: 'p', pts: [[x0 + w * 0.55, y0 + h * 0.35], [x0 + w * 0.4, y0 + h * 0.65], [x0 + w * 0.02, y1 - h * 0.02]] });
    if (r() < 0.3) out.push({ k: 'n', pts: [[x0 + w * 0.45, y0 + h * 0.45], [x0 + w * 0.65, y0 + h * 0.75], [x1, y1 - h * 0.02]] });
  }
  return out;
}

// ================================================================= COMPASS FACE (24 bearings, star marks, trigrams)
// Square card (no tiling) for a disc (CylinderGeometry cap UVs / CircleGeometry). Engraved lines are recessed & dirt-filled.
export function compassFace(o = {}) {
  const p = { size: 1024, seed: 6, state: 'museum', patina: null, polish: 0.6, tone: null, well: 0.145, bearings: 'glyph', ...o };
  if (p.tone === null) p.tone = p.state === 'then' ? 'then' : 'museum';
  if (p.patina === null) p.patina = p.state === 'then' ? 0.08 : 0.3;
  return cached('compassFace', p, () => {
    const S = p.size, N = makeNoise(p.seed), N2 = makeNoise(p.seed + 3);
    const f = metalField(S, S, { ...p, patina: p.patina * 0.35, scratches: 0.35 }, N, N2);
    const ec = cv(S, S), g = ec.getContext('2d'), r = rng(p.seed * 7 + 2);
    const C = S / 2, lw = S * 0.0026;
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const ring = (rf, w = lw) => { g.lineWidth = w; g.beginPath(); g.arc(C, C, rf * S, 0, Math.PI * 2); g.stroke(); };
    [0.482, 0.462, 0.432, 0.338, 0.33, 0.252, 0.172, p.well + 0.008, p.well].forEach((rf, k) => ring(rf, k === 1 || k === 4 ? lw * 0.6 : lw));
    // tick ring: 120 ticks, long at bearing boundaries
    for (let k = 0; k < 120; k++) {
      const a = (k / 120) * Math.PI * 2, long = k % 5 === 0;
      const r0 = 0.432 * S, r1 = (long ? 0.462 : 0.448) * S;
      g.lineWidth = long ? lw : lw * 0.6; g.beginPath(); g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); g.stroke();
    }
    // 24 bearing cells with pseudo glyphs (illegible), boundaries offset by half a cell
    const BEAR = '子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬';
    for (let k = 0; k < 24; k++) {
      const a0 = ((k + 0.5) / 24) * Math.PI * 2 - Math.PI / 2;
      g.lineWidth = lw; g.beginPath(); g.moveTo(C + Math.cos(a0) * 0.338 * S, C + Math.sin(a0) * 0.338 * S); g.lineTo(C + Math.cos(a0) * 0.432 * S, C + Math.sin(a0) * 0.432 * S); g.stroke();
      const a = (k / 24) * Math.PI * 2 - Math.PI / 2, rr = 0.385 * S, gs = 0.06 * S;
      g.save(); g.translate(C + Math.cos(a) * rr, C + Math.sin(a) * rr); g.rotate(a + Math.PI / 2);
      if (k % 6 === 0) { g.beginPath(); g.arc(0, -gs * 0.62, gs * 0.07, 0, Math.PI * 2); g.fill(); }
      if (p.bearings === 'text') { g.font = `${Math.round(gs * 0.95)}px "WenQuanYi Zen Hei", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(BEAR[k], 0, gs * 0.05); }
      else for (const st of pseudoGlyph(r, 5, 8)) {
        g.lineWidth = lw * (st.k === 'd' ? 1.6 : 1.1);
        g.beginPath(); st.pts.forEach(([x, y], j) => (j ? g.lineTo(x * gs, y * gs) : g.moveTo(x * gs, y * gs))); g.stroke();
      }
      g.restore();
    }
    // 28 star-mark clusters (lunar mansions style): dots joined by hairlines
    const pole = [C, C - 0.296 * S];
    g.beginPath(); g.arc(pole[0], pole[1], S * 0.009, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 28; k++) {
      const a0 = ((k + 0.5) / 28) * Math.PI * 2 - Math.PI / 2, n = 2 + Math.floor(r() * 4), pts = [];
      for (let j = 0; j < n; j++) { const a = a0 + (r() - 0.5) * 0.16, rr = (0.262 + r() * 0.058) * S; pts.push([C + Math.cos(a) * rr, C + Math.sin(a) * rr]); }
      g.lineWidth = lw * 0.5; g.beginPath(); pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, S * (0.0035 + r() * 0.002), 0, Math.PI * 2); g.fill(); }
    }
    // 8 trigrams
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      g.save(); g.translate(C + Math.cos(a) * 0.212 * S, C + Math.sin(a) * 0.212 * S); g.rotate(a + Math.PI / 2);
      for (let b = 0; b < 3; b++) {
        const yb = (b - 1) * S * 0.014, L = S * 0.026, broken = ((k >> b) & 1) === 1;
        g.lineWidth = S * 0.0065; g.lineCap = 'butt';
        if (broken) { g.beginPath(); g.moveTo(-L, yb); g.lineTo(-L * 0.18, yb); g.moveTo(L * 0.18, yb); g.lineTo(L, yb); g.stroke(); }
        else { g.beginPath(); g.moveTo(-L, yb); g.lineTo(L, yb); g.stroke(); }
      }
      g.restore(); g.lineCap = 'round';
    }
    // needle line across the well (double line, N–S)
    g.lineWidth = lw * 0.8;
    for (const dx of [-0.006, 0.006]) { g.beginPath(); g.moveTo(C + dx * S, C - p.well * S); g.lineTo(C + dx * S, C + p.well * S); g.stroke(); }
    const ed = readCanvas(ec);
    const col = f.col, hgt = f.hgt, rough = f.rough, metal = f.metal, ao = f.ao;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, e = ed[i * 4 + 3] / 255 * (ed[i * 4] / 255);
      const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5, rr = Math.sqrt(dx * dx + dy * dy);
      let c = [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]];
      // centre well: recessed dark lacquer with a faint water stain ring
      const well = sstep(p.well + 0.002, p.well - 0.002, rr);
      const ang = Math.atan2(dy, dx); // +π/2 = south (午) at the bottom of the card
      const thumb = p.state === 'then' ? Math.exp(-Math.pow((ang - Math.PI / 2) / 0.35, 2)) : 0.25 * Math.exp(-Math.pow((ang - Math.PI / 2) / 0.35, 2));
      const rimPol = sstep(0.462, 0.47, rr) * sstep(0.5, 0.485, rr) * (0.5 + thumb);
      const poleD = Math.hypot((x + 0.5) - pole[0], (y + 0.5) - pole[1]) / S, poleM = sstep(0.0095, 0.006, poleD);
      c = mix3(c, METAL_TONES[p.tone].hi || c, rimPol * 0.8);
      const wellCol = [34, 30, 26].map((q) => q * (0.9 + 0.3 * (N.n(dx * 40, dy * 40, 256, 256) * 0.5 + 0.5)));
      c = mix3(c, wellCol, well * 0.92);
      const gp = e * p.patina * 2.2 * sstep(0.45, 0.7, N2.n(x / S * 24, y / S * 24, 24, 24) * 0.5 + 0.5);
      c = mix3(c, [24, 18, 12], e * 0.88);
      c = mix3(c, [96, 136, 118], clamp(gp));
      c = mix3(c, [200, 204, 206], poleM);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = hgt[i] - e * 0.45 - well * 0.5 + rimPol * 0.1;
      rough[i] = clamp(lerp(rough[i], 0.7, e) * (1 - well) + well * 0.35 - rimPol * 0.15 - poleM * 0.2);
      metal[i] = clamp(Math.max(lerp(metal[i], 0.15, e) * (1 - well), poleM));
      ao[i] = ao[i] * (1 - e * 0.6);
      if (rr > 0.5) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 40; }
    }
    return finish({ col, w: S, h: S, height: hgt, nStrength: 6 * S / 1024, rough, metal, ao, srgbWrap: false });
  });
}

// ================================================================= CHART (海图 / 针路图)
// Aged paper with ink coastline, waterlining, profile mountains, rhumb-line network, compass rose,
// dashed needle route with waypoints, tiny illegible annotation marks, foxing, folds. No text.
export function chart(o = {}) {
  const p = { w: 1024, h: 768, seed: 8, age: 0.7, folds: [2, 2], rose: [0.64, 0.6], route: true, ...o };
  return cached('chart', p, () => {
    const W = p.w, H = p.h, N = makeNoise(p.seed), N2 = makeNoise(p.seed + 11), r = rng(p.seed * 3 + 1);
    // land field
    const L = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      L[y * W + x] = N.fbm(u * 1.0, v * H / W, 3, 6) * 0.9 + 0.95 * (0.36 - v) + 0.35 * (0.25 - u) + 0.12 * N2.fbm(u, v, 9, 3) - 0.05;
    }
    const base = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    const paperA = hexRGB('#dcc79c'), paperB = hexRGB('#b89764'), wash = [196, 186, 140];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, u = x / W, v = y / H;
      const low = N2.fbm(u, v, 3, 4) * 0.5 + 0.5;
      const edge = Math.min(u, 1 - u, v * H / W, (1 - v) * H / W);
      const burn = sstep(0.09, 0.0, edge + 0.02 * N.n(u * 30, v * 30, 256, 256));
      let c = mix3(paperA, paperB, clamp(0.25 * low + 0.65 * burn * p.age + 0.1 * p.age));
      const fib = N.n(u * 300, v * 80, 300, 80) * 0.5 + N.n(u * 90, v * 400, 90, 400) * 0.5;
      c = c.map((q) => q * (0.97 + 0.04 * fib));
      // land wash + waterlining in the sea
      const l = L[i];
      const xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(H - 1, y + 1);
      const gx = (L[y * W + xr] - L[y * W + xl]) * 0.5, gy = (L[yd * W + x] - L[yu * W + x]) * 0.5;
      const d = Math.abs(l) / (Math.sqrt(gx * gx + gy * gy) + 1e-6);
      if (l > 0) { const inland = sstep(0, 60, d); c = mix3(c, mix3(c, wash, 0.5), 0.5 + 0.3 * (1 - inland)); c = c.map((q) => q * (0.97 - 0.04 * inland * low)); }
      let ink = sstep(1.7, 0.7, d);
      if (l < 0) for (let k = 1; k <= 3; k++) ink = Math.max(ink, sstep(0.75, 0.25, Math.abs(d - k * 6.5)) * (0.55 - k * 0.12));
      c = mix3(c, [52, 38, 26], ink * (0.85 - 0.15 * p.age));
      base[i * 3] = c[0]; base[i * 3 + 1] = c[1]; base[i * 3 + 2] = c[2];
      hgt[i] = 0.5 + 0.05 * fib + 0.1 * low;
      rough[i] = 0.86 - 0.08 * ink;
    }
    const c0 = rgbCanvas(base, W, H), g = c0.getContext('2d');
    g.lineCap = 'round'; g.lineJoin = 'round';
    // fibres
    for (let k = 0; k < 900 * W * H / (1024 * 768); k++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI * 2, l = 4 + r() * 14;
      g.strokeStyle = r() < 0.5 ? 'rgba(90,70,40,0.10)' : 'rgba(255,248,225,0.14)'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // rhumb-line network (sea only, faint)
    const rc = cv(W, H), rg = rc.getContext('2d');
    const RX = p.rose[0] * W, RY = p.rose[1] * H, big = Math.hypot(W, H);
    const roses = [[RX, RY]]; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; roses.push([RX + Math.cos(a) * W * 0.42, RY + Math.sin(a) * W * 0.42]); }
    roses.forEach(([cx, cy], ri) => {
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2;
        rg.strokeStyle = k % 4 === 0 ? 'rgba(60,44,30,0.42)' : k % 2 ? 'rgba(150,64,44,0.30)' : 'rgba(70,90,60,0.30)';
        rg.lineWidth = ri === 0 ? 0.9 : 0.7;
        rg.beginPath(); rg.moveTo(cx, cy); rg.lineTo(cx + Math.cos(a) * big, cy + Math.sin(a) * big); rg.stroke();
      }
    });
    // mask rhumbs out of land
    const rd = rg.getImageData(0, 0, W, H);
    for (let i = 0; i < W * H; i++) if (L[i] > 0) rd.data[i * 4 + 3] *= 0.15;
    rg.putImageData(rd, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.drawImage(rc, 0, 0); g.globalCompositeOperation = 'source-over';
    // profile mountains along the coast (needle-route chart style)
    const coastPts = [];
    for (let k = 0; k < 4000 && coastPts.length < 26; k++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H), l = L[y * W + x];
      if (l > 0.02 && l < 0.09 && coastPts.every(([a, b]) => Math.hypot(a - x, b - y) > 46)) coastPts.push([x, y]);
    }
    coastPts.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of coastPts) {
      const w = 26 + r() * 30, h = 14 + r() * 20, pk = 1 + Math.floor(r() * 3);
      const path = [[x - w / 2, y]];
      for (let j = 0; j < pk; j++) { const px = x - w / 2 + w * (j + 0.5) / pk + (r() - 0.5) * 6, ph = h * (0.7 + 0.5 * r()); path.push([px - w / pk * 0.3, y - ph * 0.6], [px, y - ph], [px + w / pk * 0.3, y - ph * 0.55]); }
      path.push([x + w / 2, y]);
      g.fillStyle = 'rgba(92,128,110,0.32)'; g.beginPath(); path.forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(44,32,22,0.8)'; g.lineWidth = 1.1; g.beginPath(); path.forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
      g.lineWidth = 0.6; g.strokeStyle = 'rgba(44,32,22,0.45)';
      for (let j = 0; j < 4; j++) { const sx = x - w / 3 + r() * w * 0.66; g.beginPath(); g.moveTo(sx, y - h * 0.5 * r() - 2); g.lineTo(sx - 3, y - 1); g.stroke(); }
    }
    // tiny annotation marks (illegible ink dots in short columns) near some coast points
    g.fillStyle = 'rgba(40,30,22,0.7)';
    for (const [x, y] of coastPts.filter((_, k) => k % 3 === 0)) {
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) { for (let q = 0; q < 3; q++) { g.fillRect(x + 22 + r() * 4, y + 6 + j * 7 + r() * 4, 1.2 + r() * 2.4, 0.9 + r() * 1.2); } }
    }
    // compass rose
    const R0 = Math.min(W, H) * 0.12;
    g.save(); g.translate(RX, RY);
    g.strokeStyle = 'rgba(52,38,26,0.85)'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, R0 * 0.62, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, R0 * 0.66, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * R0 * 0.62, Math.sin(a) * R0 * 0.62); g.lineTo(Math.cos(a) * R0 * (k % 4 ? 0.64 : 0.66), Math.sin(a) * R0 * (k % 4 ? 0.64 : 0.66)); g.stroke(); }
    const pts = [[16, 0.45, 0.04], [8, 0.72, 0.07], [4, 1.0, 0.1]];
    for (const [n, len, wid] of pts) for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + (n === 16 ? Math.PI / 16 : n === 8 ? Math.PI / 8 : 0) - Math.PI / 2;
      const tip = [Math.cos(a) * R0 * len, Math.sin(a) * R0 * len], l = [Math.cos(a - Math.PI / 2) * R0 * wid, Math.sin(a - Math.PI / 2) * R0 * wid], rr = [-l[0], -l[1]];
      g.fillStyle = n === 4 ? 'rgba(44,32,22,0.9)' : n === 8 ? 'rgba(140,60,42,0.75)' : 'rgba(80,96,70,0.6)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(l[0], l[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fill();
      g.fillStyle = 'rgba(232,214,176,0.85)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(rr[0], rr[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(tip[0], tip[1]); g.lineTo(rr[0], rr[1]); g.stroke();
    }
    g.fillStyle = 'rgba(140,60,42,0.85)'; g.beginPath(); g.arc(0, -R0 * 1.08, R0 * 0.06, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(0, 0, R0 * 0.05, 0, Math.PI * 2); g.fillStyle = 'rgba(44,32,22,0.9)'; g.fill();
    g.restore();
    // needle route: dashed line from a harbour across the sea, waypoint circles, small junk glyph
    if (p.route) {
      let hx = W * 0.3, hy = H * 0.3;
      for (let k = 0; k < 3000; k++) { const x = Math.floor(W * (0.15 + 0.5 * r())), y = Math.floor(H * (0.2 + 0.5 * r())); if (Math.abs(L[y * W + x]) < 0.004) { hx = x; hy = y; break; } }
      const route = bez3([hx, hy], [hx + W * 0.18, hy + H * 0.28], [W * 0.62, H * 0.95], [W * 1.02, H * 0.72], 80);
      g.strokeStyle = 'rgba(120,44,30,0.8)'; g.lineWidth = 1.3; g.setLineDash([7, 5]);
      g.beginPath(); route.forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); g.setLineDash([]);
      for (let j = 8; j < route.length; j += 16) { const [a, b] = route[j]; g.beginPath(); g.arc(a, b, 3.2, 0, Math.PI * 2); g.stroke(); }
      const [sx, sy] = route[40];
      g.save(); g.translate(sx + 10, sy - 12); g.strokeStyle = 'rgba(44,32,22,0.85)'; g.fillStyle = 'rgba(44,32,22,0.75)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(0, 5, 10, -1); g.lineTo(-9, 0); g.fill();
      g.beginPath(); g.moveTo(-1, -1); g.lineTo(-1, -15); g.moveTo(5, -1); g.lineTo(5, -11); g.stroke();
      g.fillStyle = 'rgba(160,120,80,0.55)'; g.fillRect(-6, -14, 5, 11); g.fillRect(1.5, -10, 4, 8);
      for (let q = -13; q < -3; q += 2.5) { g.beginPath(); g.moveTo(-6, q); g.lineTo(-1, q); g.stroke(); }
      g.restore();
    }
    // sea wave marks
    g.strokeStyle = 'rgba(52,38,26,0.35)'; g.lineWidth = 0.8;
    for (let k = 0; k < 40; k++) { const x = r() * W, y = r() * H; if (L[(y | 0) * W + (x | 0)] > -0.06) continue; g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x - 2.5, y - 3, x, y); g.quadraticCurveTo(x + 2.5, y - 3, x + 5, y); g.stroke(); }
    // ageing pass: foxing, water stains, folds, faded ink along folds
    const im = g.getImageData(0, 0, W, H), d = im.data;
    const [fx, fy] = p.folds;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, u = x / W, v = y / H, o4 = i * 4;
      worley(u, v * H / W, 40, 30, p.seed + 2, 1);
      const fsz = 0.06 + 0.14 * hash2(WR[2], 4, p.seed);
      const fox = WR[0] < fsz && hash2(WR[2], 3, p.seed) < 0.1 * p.age ? sstep(fsz, fsz * 0.1, WR[0]) * (0.4 + 0.6 * hash2(WR[2], 5, p.seed)) : 0;
      const st = N.fbm(u + 0.2, v, 4, 4) * 0.5 + 0.5;
      const ring = Math.exp(-Math.pow((st - 0.68) / 0.008, 2)) * p.age * 0.5;
      const stain = sstep(0.68, 0.75, st) * p.age * 0.25;
      let crease = 0, cside = 0;
      for (let k = 1; k < fx; k++) { const dd = (u - k / fx) * W; crease = Math.max(crease, Math.exp(-dd * dd / 3)); cside += Math.exp(-Math.pow(dd - 2, 2) / 4) - Math.exp(-Math.pow(dd + 2, 2) / 4); }
      for (let k = 1; k < fy; k++) { const dd = (v - k / fy) * H; crease = Math.max(crease, Math.exp(-dd * dd / 3)); cside += Math.exp(-Math.pow(dd - 2, 2) / 4) - Math.exp(-Math.pow(dd + 2, 2) / 4); }
      const dark = fox * 0.45 + ring + stain + crease * 0.25;
      for (let ch = 0; ch < 3; ch++) {
        const tint = [0.92, 0.82, 0.66][ch];
        let q = d[o4 + ch];
        q = q * (1 - dark * (1 - tint * 0.6)) ;
        q = lerp(q, 214 - ch * 22, crease * 0.25);
        d[o4 + ch] = q;
      }
      hgt[i] += -crease * 0.25 + cside * 0.04 + fox * 0.02;
      rough[i] = clamp(rough[i] + crease * 0.05);
    }
    g.putImageData(im, 0, 0);
    return finish({ col: c0, w: W, h: H, height: hgt, nStrength: 3, rough, srgbWrap: false });
  });
}

// ================================================================= PORCELAIN (青花) — bowl kit (bible PROP_BOWL / PROP_SHARDS)
// THE canonical folk-kiln flared-rim bowl, the same pattern in every era: rim Ø15.2 cm, h 6.6 cm, foot Ø6.0 cm.
// Outside: 1 cm rim band between thin double lines holding ONE continuous flowering plum branch (16 five-petal
// blossoms alternating with buds); side A (faces +X): a single-sail boat (three batten lines) on three rows of wave
// lines under a crescent moon at upper left; side B (faces −X): a low fence, a plum branch and a square window of
// cracked-ice lattice; large plain white space between (±Z). Inside: one fine line below the rim, centre double
// circle Ø4.5 cm with a single five-petal plum blossom. Unglazed foot ring with orange-brown kiln flush, no mark.
// Geometry and texture share one profile so bands land exactly on the rim/foot. Units: metres.
export const BOWL = { R: 0.076, H: 0.066, footR: 0.030, footH: 0.009, wall: 0.0034 };
function bowlProfile(dims = {}) {
  const { R, H, footR, footH, wall } = { ...BOWL, ...dims };
  const pts = [], mark = {};
  const push = (r, y) => pts.push([r, y]);
  const baseY = 0.0048;
  push(0, baseY); push(footR * 0.45, baseY); push(footR - 0.005, baseY * 0.92);
  mark.footIn = pts.length - 1;
  push(footR - 0.0046, 0.0013); push(footR - 0.0036, 0); mark.footBot0 = pts.length - 1;
  push(footR - 0.0008, 0); mark.footBot1 = pts.length - 1;
  push(footR, 0.0016); push(footR + 0.0005, footH * 0.6);
  const ob = bez3([footR + 0.0006, footH], [footR + 0.014, footH + 0.003], [R * 0.975, H * 0.5], [R, H], 30);
  mark.out0 = pts.length; ob.forEach(([r, y]) => push(r, y)); mark.rimOut = pts.length - 1;
  for (let k = 1; k < 8; k++) { const a = (k / 8) * Math.PI; push(R - wall / 2 + Math.cos(a) * wall / 2, H + Math.sin(a) * wall * 0.45); }
  const ib = bez3([R - wall, H], [R * 0.975 - wall * 1.15, H * 0.5], [footR + 0.013 - wall, footH + 0.004 + wall * 1.3], [footR * 0.8, footH + wall + 0.0022], 30);
  mark.rimIn = pts.length; ib.forEach(([r, y]) => push(r, y)); mark.floor0 = pts.length - 1;
  const fy = footH + wall + 0.0022;
  for (let k = 1; k <= 8; k++) { const t = k / 8; push(footR * 0.8 * (1 - t), fy - 0.0006 * Math.sin(t * Math.PI / 2)); }
  const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const S = s[s.length - 1];
  const at = (q) => { for (let i = 1; i < s.length; i++) if (s[i] >= q) { const t = (q - s[i - 1]) / (s[i] - s[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]; } return pts[pts.length - 1]; };
  return { pts, s, S, v: s.map((q) => q / S), mark, at, dims: { R, H, footR, footH, wall }, sec: Object.fromEntries(Object.entries(mark).map(([k, i]) => [k, s[i]])) };
}
// Lathe bowl with arc-length V (0 = base centre … 1 = inside centre). Side A (boat) faces +X, side B (window) −X.
export function bowlGeometry(dims = {}, segments = 96) {
  const P = bowlProfile(dims);
  const g = new THREE.LatheGeometry(P.pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  const uv = g.attributes.uv, n = P.pts.length;
  for (let i = 0; i <= segments; i++) for (let j = 0; j < n; j++) uv.setY(i * n + j, P.v[j]);
  uv.needsUpdate = true;
  g.userData.profile = { S: P.S, sec: P.sec, dims: P.dims };
  return g;
}

// --- loose folk brushwork helpers (canvas units = texture px; caller sets transform for undistorted motifs)
function blossom(g, x, y, s, line, washC, r, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + (r() - 0.5) * 0.2;
    g.beginPath(); g.arc(Math.cos(a) * s * 0.52, Math.sin(a) * s * 0.52, s * (0.4 + r() * 0.06), 0, Math.PI * 2);
    g.fillStyle = washC; g.fill(); g.lineWidth = Math.max(1.2, s * 0.09); g.strokeStyle = line; g.stroke();
  }
  g.fillStyle = line; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.6; g.beginPath(); g.arc(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22, Math.max(0.8, s * 0.06), 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(0, 0, Math.max(0.9, s * 0.1), 0, Math.PI * 2); g.fill();
  g.restore();
}
function bud(g, x, y, s, ang, line) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = line;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.5, 0, -s); g.quadraticCurveTo(-s * 0.5, -s * 0.5, 0, 0); g.fill();
  g.lineWidth = Math.max(1, s * 0.15); g.strokeStyle = line; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s * 0.45); g.stroke();
  g.restore();
}
function branch(g, pts, w0, w1, line, r) { brush(g, pts, w0, w1, line, 0.95, 0.15, r); }
function waveRows(g, x0, x1, y, amp, period, line, w, rows = 3, gap = 1) {
  g.strokeStyle = line; g.lineCap = 'round';
  for (let k = 0; k < rows; k++) {
    const yy = y + k * amp * 2.2 * gap, a = amp * (1 + k * 0.25), pp = period * (1 + k * 0.2);
    g.lineWidth = w * (1 + k * 0.15); g.beginPath();
    for (let x = x0 + (k % 2) * pp * 0.5; x <= x1; x += pp) { g.moveTo(x, yy); g.quadraticCurveTo(x + pp * 0.25, yy - a, x + pp * 0.5, yy); g.quadraticCurveTo(x + pp * 0.75, yy + a * 0.6, x + pp, yy); }
    g.stroke();
  }
}
function crescent(g, x, y, R, line, washC) {
  g.save(); g.fillStyle = washC; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + R * 0.45, y - R * 0.2, R * 0.92, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = line; g.lineWidth = Math.max(1.2, R * 0.12); g.beginPath(); g.arc(x, y, R, 1.0, 5.1); g.stroke(); g.restore();
}
// side A: single batten sail boat on three rows of waves, crescent moon upper-left. Box: centred at (0,0), width w, height h.
function sideA(g, w, h, line, washC, r) {
  const lw = h * 0.028;
  crescent(g, -w * 0.32, -h * 0.3, h * 0.1, line, washC);
  // hull
  g.fillStyle = line; g.beginPath(); g.moveTo(-w * 0.2, h * 0.08); g.quadraticCurveTo(0, h * 0.2, w * 0.24, h * 0.04); g.lineTo(w * 0.19, h * 0.1); g.quadraticCurveTo(0, h * 0.24, -w * 0.16, h * 0.13); g.closePath(); g.fill();
  // mast + single sail with three battens
  g.lineWidth = lw; g.strokeStyle = line; g.beginPath(); g.moveTo(-w * 0.01, h * 0.1); g.lineTo(-w * 0.01, -h * 0.36); g.stroke();
  g.beginPath(); g.moveTo(0, -h * 0.34); g.quadraticCurveTo(w * 0.2, -h * 0.12, w * 0.15, h * 0.06); g.lineTo(0, h * 0.06); g.closePath();
  g.fillStyle = washC; g.fill(); g.lineWidth = lw; g.stroke();
  for (let k = 1; k <= 3; k++) { const yy = -h * 0.34 + (h * 0.4) * k / 4; g.beginPath(); g.moveTo(0, yy); g.lineTo(w * (0.13 + 0.05 * Math.sin(k / 4 * Math.PI)), yy + h * 0.015); g.lineWidth = lw * 0.8; g.stroke(); }
  waveRows(g, -w * 0.48, w * 0.48, h * 0.22, h * 0.035, w * 0.12, line, lw * 0.9, 3, 1.15);
}
// side B: low fence, plum branch, square window of cracked-ice lattice.
function sideB(g, w, h, line, washC, r) {
  const lw = h * 0.026;
  // window
  const ws = h * 0.42, wx = w * 0.12, wy = -h * 0.12;
  g.fillStyle = washC; g.globalAlpha = 0.35; g.fillRect(wx - ws / 2, wy - ws / 2, ws, ws); g.globalAlpha = 1;
  g.strokeStyle = line; g.lineWidth = lw * 1.4; g.strokeRect(wx - ws / 2, wy - ws / 2, ws, ws);
  g.lineWidth = lw * 0.8; g.save(); g.beginPath(); g.rect(wx - ws / 2, wy - ws / 2, ws, ws); g.clip();
  const pts = []; for (let k = 0; k < 9; k++) pts.push([wx + (r() - 0.5) * ws, wy + (r() - 0.5) * ws]);
  for (const [x, y] of pts) { const nn = 3; for (let q = 0; q < nn; q++) { const a = r() * Math.PI * 2, L = ws * (0.3 + r() * 0.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }
  g.restore();
  // low fence
  g.lineWidth = lw; g.strokeStyle = line;
  const fy0 = h * 0.18, fy1 = h * 0.3;
  for (const yy of [fy0, fy0 + (fy1 - fy0) * 0.5]) { g.beginPath(); g.moveTo(-w * 0.45, yy); g.lineTo(w * 0.45, yy); g.stroke(); }
  for (let k = 0; k <= 8; k++) { const xx = -w * 0.45 + w * 0.9 * k / 8; g.beginPath(); g.moveTo(xx, fy0 - h * 0.05); g.lineTo(xx, fy1); g.stroke(); }
  // plum branch rising from behind the fence on the left
  const br = bez3([-w * 0.42, fy0], [-w * 0.32, -h * 0.05], [-w * 0.2, -h * 0.2], [-w * 0.02, -h * 0.36], 18);
  branch(g, br, lw * 2.2, lw * 0.8, line, r);
  branch(g, bez([-w * 0.3, -h * 0.04], [-w * 0.18, -h * 0.02], [-w * 0.1, h * 0.06], 10), lw * 1.3, lw * 0.5, line, r);
  for (const [t, s] of [[0.45, 0.075], [0.7, 0.065], [0.95, 0.06]]) { const q = br[Math.round(t * (br.length - 1))]; blossom(g, q[0] + h * 0.03, q[1], h * s, line, washC, r); }
  bud(g, -w * 0.1, h * 0.06, h * 0.04, 0.8, line);
  g.fillStyle = line; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-w * 0.45 + r() * w * 0.9, h * 0.34 + r() * h * 0.04, lw * 0.6, 0, Math.PI * 2); g.fill(); }
}
function medallion(M, centre, line, washC, r) {
  const c = cv(M, M), g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  const C = M / 2;
  g.strokeStyle = line; g.lineWidth = M * 0.012; g.beginPath(); g.arc(C, C, M * 0.47, 0, Math.PI * 2); g.stroke();
  g.lineWidth = M * 0.008; g.beginPath(); g.arc(C, C, M * 0.43, 0, Math.PI * 2); g.stroke();
  if (centre === 'sail') { g.save(); g.translate(C, C); sideA(g, M * 0.72, M * 0.62, line, washC, r); g.restore(); }
  else blossom(g, C, C, M * 0.2, line, washC, r, 0.3);
  return c;
}

export function porcelain(o = {}) {
  const p = { layout: 'bowl', centre: 'plum', seed: 9, W: 2048, H: 1024, dims: {}, blot: 0.7, ...o };
  return cached('porcelain', p, () => {
    const N = makeNoise(p.seed), r = rng(p.seed * 5 + 3);
    const line = 'rgb(28,48,104)', washC = 'rgba(58,92,160,0.72)';
    if (p.layout === 'tile' || p.layout === 'cup') {
      // flat swatch (rim band + side A) or teacup band (one cobalt line 6 mm below the rim; bible PROP_TEA)
      const W = 1024, H = 512, bl = cv(W, H), b = bl.getContext('2d'); b.lineCap = 'round'; b.lineJoin = 'round';
      if (p.layout === 'cup') { b.strokeStyle = line; b.lineWidth = 3; b.beginPath(); b.moveTo(0, H * (o.lineV ?? 0.12)); b.lineTo(W, H * (o.lineV ?? 0.12)); b.stroke(); return glazeComposite(W, H, bl, N, p, null); }
      const yb = H * 0.16, hb = H * 0.1;
      b.strokeStyle = line; for (const [yy, lw] of [[yb - hb, 3], [yb - hb - 7, 1.6], [yb + hb, 3], [yb + hb + 7, 1.6]]) { b.lineWidth = lw; b.beginPath(); b.moveTo(0, yy); b.lineTo(W, yy); b.stroke(); }
      plumBand(b, 0, W, yb, hb * 0.8, 8, line, washC, r, 1);
      b.save(); b.translate(W * 0.5, H * 0.6); sideA(b, W * 0.5, H * 0.5, line, washC, r); b.restore();
      return glazeComposite(W, H, bl, N, p, null);
    }
    const P = bowlProfile(p.dims), W = p.W, H = p.H, S = P.S, sec = P.sec;
    const rowOf = (s) => (1 - s / S) * H;
    const sxAt = (s) => (W / (2 * Math.PI * Math.max(0.004, P.at(s)[0]))) / (H / S);
    const bl = cv(W, H), b = bl.getContext('2d'); b.lineCap = 'round'; b.lineJoin = 'round';
    const hline = (s, w) => { const y = rowOf(s); b.strokeStyle = line; b.lineWidth = w; b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); };
    // ---- outside rim band (1 cm) between thin double lines: one continuous flowering plum branch, 16 blossoms + buds
    const top = sec.rimOut - 0.0022, bot = top - 0.010;
    hline(top, 2.2); hline(top - 0.0009, 1.3); hline(bot, 2.2); hline(bot - 0.0009, 1.3);
    const yb = (rowOf(top) + rowOf(bot)) / 2, hb = (rowOf(bot) - rowOf(top)) / 2 - 4;
    const sxb = sxAt((top + bot) / 2);
    b.save(); b.scale(sxb, 1); plumBand(b, -W / sxb * 0.02, W / sxb * 1.02, yb, hb, 16, line, washC, r, 1); b.restore();
    // ---- body: side A (u 0.25 → +X) and side B (u 0.75 → −X); plain white between
    const bodyTop = bot - 0.0035, bodyBot = sec.out0 + 0.006, sm = (bodyTop + bodyBot) / 2, sxm = sxAt(sm);
    const bh = rowOf(bodyBot) - rowOf(bodyTop);
    b.save(); b.translate(W * 0.25, rowOf(sm)); b.scale(sxm, 1); sideA(b, bh * 1.55, bh, line, washC, r); b.restore();
    b.save(); b.translate(W * 0.75, rowOf(sm)); b.scale(sxm, 1); sideB(b, bh * 1.55, bh, line, washC, r); b.restore();
    // ---- foot: double line at the foot/body junction; unglazed foot ring (flush applied in glaze pass)
    hline(sec.out0 + 0.0016, 2.0); hline(sec.out0 + 0.0028, 1.2);
    // ---- inside: one fine line below the rim
    hline(sec.rimIn + 0.0045, 1.6);
    // ---- inside centre: double circle Ø4.5 cm with a single five-petal plum blossom (polar-mapped)
    const rMed = 0.0225, M = 1024;
    const mc = medallion(M, p.centre, line, washC, r), md = readCanvas(mc);
    const bimg = b.getImageData(0, 0, W, H), bd = bimg.data;
    for (let y = 0; y < H; y++) {
      const sc = (y / H) * S; if (sc > rMed) break;
      for (let x = 0; x < W; x++) {
        const ph = (x + 0.5) / W * Math.PI * 2, rr = sc / rMed;
        const mx = Math.floor(M / 2 + Math.sin(ph) * rr * M / 2), my = Math.floor(M / 2 - Math.cos(ph) * rr * M / 2);
        if (mx < 0 || my < 0 || mx >= M || my >= M) continue;
        const mo = (my * M + mx) * 4, a = md[mo + 3] / 255; if (a <= 0) continue;
        const o4 = (y * W + x) * 4, ia = bd[o4 + 3] / 255, oa = a + ia * (1 - a);
        for (let ch = 0; ch < 3; ch++) bd[o4 + ch] = (md[mo + ch] * a + bd[o4 + ch] * ia * (1 - a)) / (oa || 1);
        bd[o4 + 3] = oa * 255;
      }
    }
    b.putImageData(bimg, 0, 0);
    return glazeComposite(W, H, bl, N, p, P);
  });
}
// one continuous plum branch along a band, n blossoms alternating with buds
function plumBand(b, x0, x1, yb, hb, n, line, washC, r, wscale = 1) {
  const L = x1 - x0, pts = [];
  for (let k = 0; k <= 160; k++) { const t = k / 160; pts.push([x0 + L * t, yb + hb * 0.28 * Math.sin(t * Math.PI * 2 * n / 2 + 0.6) + hb * 0.1 * Math.sin(t * 37)]); }
  brush(b, pts, hb * 0.2 * wscale, hb * 0.14 * wscale, line, 0.95, 0.2, r);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, i = Math.round(t * 160), [x, y] = pts[i], up = k % 2 ? -1 : 1;
    blossom(b, x, y - up * hb * 0.12, hb * 0.78, line, washC, r, r() * 6);
    const j = Math.round((k + 1) / n * 160) % 161, [bx, by] = pts[Math.min(160, j)];
    brush(b, bez([bx, by], [bx + hb * 0.2, by + up * hb * 0.4], [bx + hb * 0.45, by + up * hb * 0.6], 6), hb * 0.09, hb * 0.04, line, 0.95);
    bud(b, bx + hb * 0.45, by + up * hb * 0.62, hb * 0.28, up > 0 ? 2.6 : 0.5, line);
  }
}
function glazeComposite(W, H, bl, N, p, P) {
  const bb = cv(W, H), g2 = bb.getContext('2d'); g2.filter = 'blur(0.7px)'; g2.drawImage(bl, 0, 0); g2.filter = 'none';
  const bd = readCanvas(bb);
  const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
  const glaze = hexRGB('#EDF1EF'), pool = [214, 228, 230], biscuit = hexRGB('#C9A27A'), flush = hexRGB('#B9784A');
  const deep = hexRGB('#18294F');
  for (let y = 0; y < H; y++) {
    const v = 1 - y / H, sArc = P ? v * P.S : 0;
    const unglazed = P ? (sArc >= P.sec.footBot0 - 0.0012 && sArc <= P.sec.footBot1 + 0.0016) : false;
    const pooled = P ? Math.max(sstep(0.016, 0.0, (1 - v) * P.S), sstep(P.sec.out0 + 0.004, P.sec.out0, sArc) * (sArc > P.sec.footBot1 ? 1 : 0)) : 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, u = x / W, vv = y / H;
      const low = N.fbm(u, vv, 4, 3) * 0.5 + 0.5, fine = N.n(u * 300, vv * 150, 300, 150);
      let c = mix3(glaze, pool, pooled * 0.55 + 0.12 * low);
      const a = bd[i * 4 + 3] / 255;
      if (a > 0) {
        const cb = [bd[i * 4], bd[i * 4 + 1], bd[i * 4 + 2]];
        const blot = sstep(0.55, 0.85, N.n(u * 220, vv * 110, 220, 110) * 0.5 + 0.5 + 0.25 * fine) * p.blot;
        c = mix3(c, mix3(cb, deep, blot * 0.8 + 0.12), a * (0.86 + 0.12 * low));
      }
      if (unglazed) c = mix3(biscuit, flush, sstep(0.35, 0.75, low)).map((q) => q * (0.9 + 0.12 * fine));
      const pin = fine > 0.86 ? 0.4 : 0;
      c = c.map((q) => q * (1 - pin * 0.15));
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = 0.5 + 0.04 * low + 0.012 * fine - pin * 0.1 - a * 0.012;
      rough[i] = unglazed ? 0.78 : clamp(0.06 + 0.05 * low + pin * 0.2);
    }
  }
  return finish({ col, w: W, h: H, height: hgt, nStrength: 1.2, rough, srgbWrap: !P });
}

// Shards / cracks for the bowl: weighted Voronoi cells from explicit seed points (object space), jagged edges.
// Default layout follows bible PROP_SHARDS: A centre blossom + foot ring (largest), B/C/D rim band in three, E side A
// boat & moon intact, F side B window intact, G small piece of the waves, MISSING ~2.5×3 cm in the plain white zone (+Z).
// mode 'shard' → only cell `id` drawn with a grey-white break edge; 'cracked' → everything, hairline glue lines;
// 'missing' → everything except the cells in `hide` (e.g. the restored bowl with its one missing piece).
//   const K = bowlShards(); for (const pc of K.pieces) scene.add(new THREE.Mesh(K.geometry, K.material(pc.id)));
//   pc = { id, name: 'A'..'G'|'MISSING', center (object-space Vector3) } → animate pieces apart/together about pc.center.
export function bowlShards(o = {}) {
  const p = { dims: {}, segments: 96, edge: 0.0012, jag: 0.0022, layout: null, ...o };
  const geometry = bowlGeometry(p.dims, p.segments), P = bowlProfile(p.dims);
  const outAt = (phDeg, f) => { const s = lerp(P.sec.out0, P.sec.rimOut, f); const [rr, y] = P.at(s); const ph = THREE.MathUtils.degToRad(phDeg); return new THREE.Vector3(Math.sin(ph) * rr, y, Math.cos(ph) * rr); };
  const layout = p.layout || [
    { name: 'A', pos: new THREE.Vector3(0, 0.006, 0), w: 0.0011 },
    { name: 'B', pos: outAt(20, 0.98), w: 0.0 }, { name: 'C', pos: outAt(150, 0.98), w: 0.0 }, { name: 'D', pos: outAt(260, 0.98), w: 0.0 },
    { name: 'E', pos: outAt(90, 0.45), w: 0.0005 }, { name: 'F', pos: outAt(270, 0.45), w: 0.0005 },
    { name: 'G', pos: outAt(128, 0.22), w: -0.0001 }, { name: 'MISSING', pos: outAt(0, 0.5), w: -0.00028 },
  ];
  const pts = layout.map((l) => new THREE.Vector4(l.pos.x, l.pos.y, l.pos.z, l.w ?? 0));
  const pieces = layout.map((l, id) => ({ id, name: l.name, center: l.pos.clone() }));
  const mats = new Map();
  function material(id = -1, { mode = 'shard', base = null, hide = [] } = {}) {
    if (typeof id === 'string') id = pieces.findIndex((q) => q.name === id);
    const hid = hide.map((h) => (typeof h === 'string' ? pieces.findIndex((q) => q.name === h) : h));
    const key = id + mode + hid.join(',');
    if (mats.has(key)) return mats.get(key);
    const m = base ? base.clone() : mat('porcelain_bowl');
    m.side = THREE.DoubleSide;
    const hideMask = hid.reduce((a, h) => a | (1 << h), 0);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uPts = { value: pts.concat(Array(12 - pts.length).fill(new THREE.Vector4(99, 99, 99, 0))) };
      sh.uniforms.uId = { value: id }; sh.uniforms.uEdge = { value: p.edge }; sh.uniforms.uJag = { value: p.jag }; sh.uniforms.uHide = { value: hideMask };
      sh.vertexShader = 'varying vec3 vObjP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = transformed;');
      sh.fragmentShader = `varying vec3 vObjP; uniform vec4 uPts[12]; uniform int uId; uniform int uHide; uniform float uEdge, uJag;
float h3(vec3 q){ return fract(sin(dot(q, vec3(127.1,311.7,74.7))) * 43758.5453); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x), f.y), f.z); }
` + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 q = vObjP + uJag * (vec3(vn3(vObjP*300.0), vn3(vObjP*300.0+7.0), vn3(vObjP*300.0+13.0)) - 0.5) * 2.0
                 + uJag * 0.5 * (vec3(vn3(vObjP*1100.0), vn3(vObjP*1100.0+3.0), vn3(vObjP*1100.0+5.0)) - 0.5);
  float d1 = 1e9, d2 = 1e9; int i1 = 0; vec3 c1 = vec3(0.0), c2 = vec3(0.0);
  for (int k = 0; k < 12; k++) { vec3 c = uPts[k].xyz; float d = dot(q - c, q - c) - uPts[k].w; if (d < d1) { d2 = d1; c2 = c1; d1 = d; i1 = k; c1 = c; } else if (d < d2) { d2 = d; c2 = c; } }
  float edgeD = (d2 - d1) / (2.0 * max(distance(c1, c2), 1e-4));
  ${mode === 'shard' ? 'if (i1 != uId) discard;' : mode === 'missing' ? 'if (((uHide >> i1) & 1) == 1) discard;' : ''}
  float brk = ${mode === 'cracked' ? '0.0' : '1.0 - smoothstep(uEdge*0.6, uEdge, edgeD)'};
  ${mode === 'missing' ? 'brk *= float(((uHide >> (i1 == 0 ? 1 : 0)) & 0) == 0); { int other = -1; float bd = 1e9; for (int k = 0; k < 12; k++) { if (k == i1) continue; vec3 c = uPts[k].xyz; float d = dot(q - c, q - c) - uPts[k].w; if (d < bd) { bd = d; other = k; } } if (other < 0 || ((uHide >> other) & 1) == 0) brk = 0.0; }' : ''}
  float glue = ${mode === 'cracked' || mode === 'missing' ? '(1.0 - smoothstep(0.00012, 0.00035, edgeD))' : '0.0'};
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.56, 0.51), brk);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.27, 0.22), glue * 0.8 * (1.0 - brk));`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.85, max(brk, glue));');
    };
    m.customProgramCacheKey = () => 'bowlShard_' + mode;
    mats.set(key, m);
    return m;
  }
  return { geometry, pieces, points: pts, material, profile: geometry.userData.profile };
}

// ================================================================= BRICK (red brick, partly lime-washed) — LOC_GALLERY / corridor
export function brick(o = {}) {
  const p = { size: 512, rows: 12, perRow: 4, tone: 'red', limewash: 0.45, seed: 30, ...o };
  return cached('brick', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), N2 = makeNoise(p.seed + 5);
    const base = p.tone === 'render' ? [142, 138, 132] : [122, 75, 58], mortar = [172, 164, 150], wash = hexRGB('#A9A296');
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const rh = H / p.rows, bw = W / p.perRow, mw = 0.11 * rh;
    for (let y = 0; y < H; y++) {
      const v = y / H, ri = Math.floor(y / rh), ly = y - ri * rh;
      for (let x = 0; x < W; x++) {
        const u = x / W, i = y * W + x, xo = (x + (ri % 2) * bw * 0.5) % W, bi = Math.floor(xo / bw), lx = xo - bi * bw;
        const id = ri * 31 + bi;
        const wob = N.n(u * 64, v * 64, 64, 64) * 1.2;
        const e = Math.min(lx, bw - lx, ly, rh - ly) + wob;
        const joint = sstep(mw + 1.2, mw * 0.5, e);
        const tone = hash2(id, 1, p.seed) * 0.35 - 0.15, burnt = hash2(id, 2, p.seed) < 0.15 ? 0.6 : 0;
        const fine = N.n(u * 260, v * 260, 260, 260), low = N.fbm(u, v, 4, 3) * 0.5 + 0.5;
        let c = base.map((q, k) => q * (0.9 + tone + 0.08 * fine) * (1 - burnt * 0.35) + (k === 0 ? 10 * tone : 0));
        c = mix3(c, mortar.map((q) => q * (0.9 + 0.12 * low)), joint);
        const wm = clamp(sstep(1 - p.limewash, 1 - p.limewash + 0.12, N2.fbm(u, v, 3, 5) * 0.5 + 0.5 + 0.1 * N2.n(u * 30, v * 120, 30, 120)));
        c = mix3(c, wash.map((q) => q * (0.9 + 0.1 * low)), wm * (0.75 + 0.2 * joint));
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.6 + 0.05 * fine + 0.06 * low - 0.4 * joint + wm * 0.04;
        rough[i] = clamp(0.82 + 0.1 * fine - 0.05 * wm);
        ao[i] = 1 - joint * 0.5;
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 5, rough, ao });
  });
}
// ================================================================= GRANITE BLOCK WALL with lime pointing — LOC_HOME
export function granite(o = {}) {
  const p = { size: 512, rows: 5, seed: 31, pointing: 1, ...o };
  return cached('granite', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed * 7);
    const rows = []; for (let j = 0; j < p.rows; j++) { const n = 2 + Math.floor(r() * 2); const cuts = []; let acc = r(); for (let k = 0; k < n; k++) { cuts.push(acc % 1); acc += (0.7 + r() * 0.6) / n; } cuts.sort((a, b) => a - b); rows.push({ cuts }); }
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const rh = H / p.rows, jw = 5 * W / 512 * p.pointing;
    for (let y = 0; y < H; y++) {
      const v = y / H, ri = Math.floor(y / rh), R = rows[ri], ly = y - ri * rh;
      for (let x = 0; x < W; x++) {
        const u = x / W, i = y * W + x;
        let k = R.cuts.length - 1; for (let c = 0; c < R.cuts.length; c++) if (u >= R.cuts[c]) k = c;
        let dx = 1; for (const c of R.cuts) { const d = Math.abs(u - c); dx = Math.min(dx, d, 1 - d); }
        const wob = N.n(u * 24, v * 24, 24, 24) * 4 + N.n(u * 90, v * 90, 90, 90) * 1.5;
        const e = Math.min(dx * W, ly, rh - ly) + wob;
        const joint = sstep(jw + 2, jw * 0.4, e), dome = sstep(0, rh * 0.35, e);
        const id = ri * 17 + k, tone = hash2(id, 3, p.seed) * 0.25 - 0.1;
        const sp = N.n(u * 500, v * 500, 500, 500), sp2 = N.n(u * 700 + 9, v * 700, 700, 700), low = N.fbm(u, v, 3, 4) * 0.5 + 0.5, rough2 = N.fbm(u, v, 16, 3);
        let c = [138, 134, 126].map((q) => q * (0.85 + tone + 0.12 * low));
        if (sp > 0.5) c = mix3(c, [46, 44, 42], 0.6); if (sp2 > 0.6) c = mix3(c, [214, 210, 202], 0.45);
        c = mix3(c, [c[0] * 0.75, c[1] * 0.78, c[2] * 0.72], sstep(0.6, 0.9, N.fbm(u + 0.5, v, 5, 3) * 0.5 + 0.5) * 0.5); // lichen/damp stains
        c = mix3(c, [206, 198, 182].map((q) => q * (0.85 + 0.15 * low)), joint);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        hgt[i] = 0.3 + 0.35 * dome + 0.12 * rough2 + 0.02 * sp - 0.2 * joint;
        rough[i] = clamp(0.85 + 0.08 * rough2);
        ao[i] = 1 - joint * 0.4 - (1 - dome) * 0.2;
      }
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 8, rough, ao });
  });
}
// ================================================================= SQUARE CLAY / TERRACOTTA TILES — LOC_HOME #8C6F5A, LOC_CHAPEL #A8654A
export function tiles(o = {}) {
  const p = { size: 512, count: 4, tone: 'clay', seed: 32, wear: 0.6, ...o };
  return cached('tiles', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const base = p.tone === 'terracotta' ? hexRGB('#A8654A') : hexRGB('#8C6F5A');
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const ts = W / p.count, gw = 2.2 * W / 512;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x, tx = Math.floor(x / ts), ty = Math.floor(y / ts), lx = x - tx * ts, ly = y - ty * ts;
      const wob = N.n(u * 50, v * 50, 50, 50) * 1.4;
      const e = Math.min(lx, ts - lx, ly, ts - ly) + wob;
      const groove = sstep(gw + 1.2, gw * 0.3, e), bevel = sstep(gw + 9, gw, e);
      const id = ty * 13 + tx, tone = hash2(id, 1, p.seed) * 0.24 - 0.12;
      const low = N.fbm(u, v, 3, 4) * 0.5 + 0.5, fine = N.n(u * 300, v * 300, 300, 300), pits = N.n(u * 120, v * 120, 120, 120) > 0.75 ? 1 : 0;
      let c = base.map((q, k) => q * (0.9 + tone + 0.12 * low + 0.04 * fine) - pits * 18);
      const wear = p.wear * sstep(0.5, 0.85, low);
      c = mix3(c, c.map((q) => q * 1.12), wear * (1 - bevel));
      c = mix3(c, [70, 62, 54], groove * 0.85 + bevel * 0.1);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = 0.6 + 0.06 * low + 0.02 * fine - groove * 0.5 - bevel * 0.12 - pits * 0.08;
      rough[i] = clamp(0.8 - wear * 0.25 + groove * 0.1);
      ao[i] = 1 - groove * 0.6;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 5, rough, ao });
  });
}
// ================================================================= VELVET / WOOL (felted, no visible weave)
// velvet: G1 vitrine navy #101A2A; wool: restorer's charcoal melton coat #3C4045 (tone hex or [r,g,b])
export function velvet(o = {}) {
  const p = { size: 256, tone: '#101A2A', seed: 33, crush: 0.5, ...o };
  return cached('velvet', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), base = Array.isArray(p.tone) ? p.tone : hexRGB(p.tone);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const cr = N.fbm(u, v, 3, 4) * 0.5 + 0.5, f = N.n(u * 200, v * 200, 200, 200);
      const k = 0.85 + 0.3 * p.crush * (cr - 0.5) + 0.05 * f;
      col[i * 3] = base[0] * k; col[i * 3 + 1] = base[1] * k; col[i * 3 + 2] = base[2] * k;
      hgt[i] = cr * 0.3 + f * 0.05; rough[i] = 0.92;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 2, rough });
  });
}
export function wool(o = {}) {
  const p = { size: 512, tone: '#3C4045', seed: 34, pill: 0.4, ...o };
  return cached('wool', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), base = Array.isArray(p.tone) ? p.tone : hexRGB(p.tone);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const fz = N.n(u * 320, v * 320, 320, 320) * 0.5 + N.n(u * 140, v * 140, 140, 140) * 0.5, low = N.fbm(u, v, 3, 4) * 0.5 + 0.5;
      worley(u, v, 60, 60, p.seed, 1); const pill = WR[0] < 0.12 && hash2(WR[2], 4, p.seed) < p.pill * 0.4 ? sstep(0.12, 0.03, WR[0]) : 0;
      const k = 0.88 + 0.08 * fz + 0.08 * low + pill * 0.12;
      col[i * 3] = base[0] * k; col[i * 3 + 1] = base[1] * k; col[i * 3 + 2] = base[2] * k;
      hgt[i] = 0.4 + 0.12 * fz + 0.2 * low + pill * 0.2; rough[i] = 0.95;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 2.5, rough });
  });
}

// ================================================================= FABRICS
// Plain-weave height & warp/weft mask at unit coords. threads = threads across the tile.
function weaveAt(u, v, threads, N, slub = 0.5) {
  const X = u * threads, Y = v * threads, ix = Math.floor(X), iy = Math.floor(Y);
  const ax = X - ix, ay = Y - iy;
  const sl = slub * (N.n(ix * 0.37 + 0.5, Y * 0.08, 256, Math.max(1, Math.round(threads * 0.08))) * 0.5);
  const sl2 = slub * (N.n(X * 0.08, iy * 0.37 + 0.5, Math.max(1, Math.round(threads * 0.08)), 256) * 0.5);
  const wp = Math.sin(Math.PI * clamp(ax * (1 + sl * 0.3)));
  const wf = Math.sin(Math.PI * clamp(ay * (1 + sl2 * 0.3)));
  const over = ((ix + iy) & 1) === 0;
  const warpH = wp * (over ? 1 : 0.55) * (0.8 + 0.2 * Math.cos(Math.PI * (ay - 0.5)));
  const weftH = wf * (over ? 0.55 : 1) * (0.8 + 0.2 * Math.cos(Math.PI * (ax - 0.5)));
  const warpTop = warpH >= weftH;
  return { h: Math.max(warpH, weftH), warpTop, sl: warpTop ? sl : sl2 };
}
const CLOTH_TONES = { natural: [206, 196, 174], white: [228, 226, 216], grey: [150, 148, 142], blue: [120, 140, 160], charcoal: [64, 64, 66], coat: [60, 64, 69], navy: [36, 42, 60], rose: [180, 130, 126],
  shirt: [111, 127, 143], shirtMuseum: [131, 146, 160], linen: [216, 209, 194], guard: [34, 42, 64] }; // bible: PROP_SHIRT #6F7F8F, coat #3C4045, linen #D8D1C2
// cotton / linen with creases. tone (CLOTH_TONES key or [r,g,b]), threads, creases 0..1
export function cotton(o = {}) {
  const p = { size: 512, tone: 'natural', threads: 110, creases: 0.6, slub: 0.6, seed: 10, fade: 0.3, ...o };
  return cached('cotton', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const base = Array.isArray(p.tone) ? p.tone : (CLOTH_TONES[p.tone] || CLOTH_TONES.natural);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const wv = weaveAt(u, v, p.threads, N, p.slub);
      const wr = N.ridged(u, v, 3, 4, 7), wr2 = N.ridged(u + 0.3, v, 5, 3, 2);
      const cr = p.creases * (sstep(0.7, 0.95, wr) * 0.7 + sstep(0.75, 0.97, wr2) * 0.5);
      const low = N.fbm(u, v, 3, 3) * 0.5 + 0.5;
      const k = (0.8 + 0.22 * wv.h + 0.06 * wv.sl) * (1 - p.fade * 0.1 + p.fade * 0.16 * low) * (1 - cr * 0.12);
      col[i * 3] = base[0] * k; col[i * 3 + 1] = base[1] * k; col[i * 3 + 2] = base[2] * k;
      hgt[i] = wv.h * 0.35 + cr * 0.9 + low * 0.2;
      rough[i] = 0.9 - 0.06 * wv.h;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 3, rough });
  });
}
// faded floral print cotton (migrant's blouse). ground: 'cream' | 'blue' | [r,g,b]
export function floral(o = {}) {
  const p = { size: 512, ground: 'cream', threads: 120, seed: 11, fade: 0.45, motifs: 4, creases: 0.4, ...o };
  return cached('floral', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed * 9 + 1);
    const ground = Array.isArray(p.ground) ? p.ground : p.ground === 'blue' ? [168, 184, 198] : [224, 214, 192];
    const pc = cv(W, H), g = pc.getContext('2d');
    const cell = W / p.motifs;
    const petalCols = ['rgb(196,118,118)', 'rgb(98,118,162)', 'rgb(206,150,110)'];
    const draw = (fn) => { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
    for (let j = 0; j < p.motifs; j++) for (let i = 0; i < p.motifs; i++) {
      const cx = (i + 0.5 + (j % 2) * 0.5) * cell + (r() - 0.5) * cell * 0.15, cy = (j + 0.5) * cell + (r() - 0.5) * cell * 0.15;
      const pcol = petalCols[(i + j * 2) % petalCols.length], rot = r() * Math.PI, s = cell * (0.17 + r() * 0.05);
      draw(() => {
        // leaves
        g.fillStyle = 'rgb(128,148,112)';
        for (const a of [rot + 2.2, rot + 4.1]) { g.save(); g.translate(cx + Math.cos(a) * s * 1.25, cy + Math.sin(a) * s * 1.25); g.rotate(a); g.beginPath(); g.ellipse(0, 0, s * 0.75, s * 0.28, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
        g.strokeStyle = 'rgb(128,148,112)'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + s * 1.4, cy + s * 0.2, cx + s * 1.7, cy + s * 1.2); g.stroke();
        // 5-petal blossom (slightly off-register)
        g.fillStyle = pcol;
        for (let k = 0; k < 5; k++) { const a = rot + k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55, s * 0.5, s * 0.36, a, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgb(214,176,96)'; g.beginPath(); g.arc(cx + s * 0.06, cy + s * 0.05, s * 0.22, 0, Math.PI * 2); g.fill();
        // sprig dots
        g.fillStyle = pcol; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + s * (1.9 + k * 0.35), cy - s * (0.9 - k * 0.5), s * 0.12, 0, Math.PI * 2); g.fill(); }
      });
    }
    const pd = readCanvas(pc);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const wv = weaveAt(u, v, p.threads, N, 0.4);
      const low = N.fbm(u, v, 3, 4) * 0.5 + 0.5;
      const pa = pd[i * 4 + 3] / 255 * (1 - p.fade * (0.45 + 0.5 * low)) * (0.75 + 0.25 * wv.h);
      let c = mix3(ground, [pd[i * 4], pd[i * 4 + 1], pd[i * 4 + 2]], pa);
      const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      c = mix3(c, [lum, lum, lum * 0.97], p.fade * 0.35);
      const wr = N.ridged(u, v, 3, 4, 6), cr = p.creases * sstep(0.72, 0.96, wr);
      const k = (0.84 + 0.18 * wv.h) * (1 - cr * 0.1);
      col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
      hgt[i] = wv.h * 0.35 + cr * 0.8 + low * 0.15;
      rough[i] = 0.9;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 3, rough });
  });
}
// indigo cloth: tone 'indigo' (navigator's jacket) | 'patch' (the different blue sewn inside the right cuff) | 'faded'
export function indigo(o = {}) {
  const p = { size: 512, tone: 'indigo', threads: 96, wear: 0.5, salt: 0, seed: 12, ...o };
  return cached('indigo', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const T = p.tone === 'patch' ? { warp: [112, 142, 176], weft: [150, 170, 196] } : p.tone === 'faded' ? { warp: [62, 76, 104], weft: [130, 136, 146] } : { warp: [26, 36, 64], weft: [70, 80, 104] };
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const wv = weaveAt(u, v, p.threads, N, 0.7);
      const dye = N.n(u * p.threads, v * 3, p.threads, 3) * 0.5 + N.fbm(u, v, 4, 3) * 0.5;
      let c = wv.warpTop ? T.warp.map((q) => q * (0.85 + 0.25 * dye + 0.1 * wv.sl)) : T.weft.map((q) => q * (0.85 + 0.15 * dye));
      
      const low = N.fbm(u + 0.5, v, 3, 4) * 0.5 + 0.5;
      const wear = p.wear * sstep(0.55, 0.85, low);
      c = mix3(c, [116, 128, 148], wear * 0.45 * (0.6 + 0.4 * wv.h));
      if (p.salt > 0) { const sn = N.fbm(u, v + 0.3, 6, 4) * 0.5 + 0.5; const tl = Math.exp(-Math.pow((sn - 0.62) / 0.012, 2)) + sstep(0.66, 0.75, sn) * 0.4; c = mix3(c, [208, 206, 198], clamp(tl * p.salt)); }
      const k = 0.82 + 0.24 * wv.h;
      const wr = N.ridged(u, v, 3, 4, 6), cr = sstep(0.75, 0.97, wr) * 0.5;
      col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
      hgt[i] = wv.h * 0.4 + cr + low * 0.15;
      rough[i] = 0.88;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 3, rough });
  });
}
// rattan (藤) weave for the suitcase: flat cane strips over/under with gaps; honey lacquer.
export function rattan(o = {}) {
  const p = { size: 512, strips: 22, seed: 13, tone: 'honey', age: 0.5, ...o };
  return cached('rattan', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const base = p.tone === 'dark' ? hexRGB('#7A5530') : hexRGB('#A8783F');
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), ao = new Float32Array(W * H);
    const n = p.strips;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const X = u * n, Y = v * n, ix = Math.floor(X), iy = Math.floor(Y), ax = X - ix, ay = Y - iy;
      const prof = (t) => sstep(0.0, 0.16, t) * sstep(1.0, 0.84, t);
      const over = ((ix + iy) & 1) === 0;
      const pv = prof(ax), ph = prof(ay);
      const vH = pv * (over ? 1 : 0.6) * (0.85 + 0.15 * Math.cos((ay - 0.5) * Math.PI));
      const hH = ph * (over ? 0.6 : 1) * (0.85 + 0.15 * Math.cos((ax - 0.5) * Math.PI));
      const vertTop = vH >= hH, h = Math.max(vH, hH);
      const sid = vertTop ? ix * 7 + 1 : iy * 13 + 5;
      const tone = hash2(sid, 1, p.seed) * 0.3 - 0.15;
      const fib = vertTop ? N.n(u * 900, v * 20, 900, 20) : N.n(u * 20, v * 900, 20, 900);
      const node = vertTop ? Math.exp(-Math.pow(((v * 3 + hash2(ix, 2, p.seed)) % 1 - 0.5) / 0.02, 2)) : Math.exp(-Math.pow(((u * 3 + hash2(iy, 3, p.seed)) % 1 - 0.5) / 0.02, 2));
      const low = N.fbm(u, v, 3, 3) * 0.5 + 0.5;
      let c = base.map((q) => q * (0.86 + tone + 0.08 * fib - 0.12 * node));
      c = mix3(c, [c[0] * 0.62, c[1] * 0.55, c[2] * 0.45], p.age * (0.4 * low + 0.3 * (1 - h)));
      const gap = h < 0.12 ? 1 - h / 0.12 : 0;
      c = mix3(c, [26, 18, 10], gap);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = h * 0.8 + fib * 0.03;
      rough[i] = clamp(0.38 + 0.25 * (1 - h) + 0.1 * low);
      ao[i] = 0.4 + 0.6 * h;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 5, rough, ao });
  });
}

// ================================================================= STAINED GLASS
// Abstract/geometric + floral panes (no figures). shape 'lancet' | 'rect' | 'round'. Returns { map (RGBA, alpha=shape),
// emissiveMap (same), cookie (for SpotLight.map: saturated, lead black, opaque) }.
const SG_COLS = { ruby: [154, 69, 69], rose: [201, 143, 138], cobalt: [52, 84, 143], sky: [104, 138, 180], amber: [201, 145, 63], gold: [222, 188, 112], emerald: [76, 127, 104], sage: [128, 160, 120], violet: [104, 84, 140], pale: [214, 222, 204], palegold: [226, 214, 170] }; // bible P23–P27 (softened)
export function stainedGlass(o = {}) {
  const p = { w: 512, h: 1024, style: 'mixed', shape: 'lancet', seed: 14, lead: 1, ...o };
  return cached('stainedGlass', p, () => {
    const W = p.w, H = p.h, N = makeNoise(p.seed), r = rng(p.seed * 3 + 9), C = SG_COLS;
    const c = cv(W, H), g = c.getContext('2d');
    const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
    const lw = 5 * p.lead * W / 512;
    const leads = []; // paths to stroke at the end
    const shapePath = (ctx, inset = 0) => {
      ctx.beginPath();
      if (p.shape === 'rect') ctx.rect(inset, inset, W - 2 * inset, H - 2 * inset);
      else if (p.shape === 'round') { ctx.moveTo(inset, H - inset); ctx.lineTo(inset, W / 2); ctx.arc(W / 2, W / 2, W / 2 - inset, Math.PI, 0); ctx.lineTo(W - inset, H - inset); ctx.closePath(); }
      else { const a = W - 2 * inset; ctx.moveTo(inset, H - inset); ctx.lineTo(inset, W * 0.85); ctx.arc(W - inset, W * 0.85, a, Math.PI, Math.PI * 1.335, false); ctx.arc(inset, W * 0.85, a, Math.PI * 1.665, 0, false); ctx.lineTo(W - inset, H - inset); ctx.closePath(); }
    };
    // ground: diamond quarries in pale glass of slightly varied tints
    g.save(); shapePath(g); g.clip();
    const q = W / 6;
    for (let j = -2; j < H / q * 2 + 2; j++) for (let i = -2; i < W / q + 2; i++) {
      const cx = i * q + (j % 2 ? q / 2 : 0), cy = j * q / 2;
      const tints = [C.pale, C.palegold, [200, 214, 206], [206, 214, 222]];
      g.fillStyle = rgb(tints[Math.floor(r() * tints.length)]);
      g.beginPath(); g.moveTo(cx, cy - q / 2); g.lineTo(cx + q / 2, cy); g.lineTo(cx, cy + q / 2); g.lineTo(cx - q / 2, cy); g.closePath(); g.fill();
      leads.push(() => { g.beginPath(); g.moveTo(cx, cy - q / 2); g.lineTo(cx + q / 2, cy); g.lineTo(cx, cy + q / 2); g.lineTo(cx - q / 2, cy); g.closePath(); g.stroke(); });
    }
    // border band
    const bw = W * 0.085;
    const borderCols = [C.ruby, C.cobalt, C.amber, C.cobalt];
    const bandPath = () => { shapePath(g, bw * 0.5); };
    g.lineWidth = bw; g.strokeStyle = rgb(C.cobalt); shapePath(g, bw * 0.5); g.stroke();
    for (let k = 0, y = H - bw; y > W * 0.6; y -= bw * 1.6, k++) {
      for (const x of [bw * 0.5, W - bw * 0.5]) { g.fillStyle = rgb(borderCols[k % 4]); g.beginPath(); g.arc(x, y, bw * 0.34, 0, Math.PI * 2); g.fill(); const yy = y, xx = x; leads.push(() => { g.beginPath(); g.arc(xx, yy, bw * 0.34, 0, Math.PI * 2); g.stroke(); }); }
    }
    leads.push(() => { shapePath(g, bw); g.stroke(); });
    // medallions
    const rose = (cx, cy, R, petals, cA, cB, cC) => {
      g.fillStyle = rgb(cC); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      leads.push(() => { g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); });
      for (let k = 0; k < petals; k++) {
        const a = k / petals * Math.PI * 2;
        const pth = () => { g.beginPath(); g.moveTo(cx, cy); g.bezierCurveTo(cx + Math.cos(a - 0.45) * R * 0.75, cy + Math.sin(a - 0.45) * R * 0.75, cx + Math.cos(a - 0.12) * R * 0.95, cy + Math.sin(a - 0.12) * R * 0.95, cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92); g.bezierCurveTo(cx + Math.cos(a + 0.12) * R * 0.95, cy + Math.sin(a + 0.12) * R * 0.95, cx + Math.cos(a + 0.45) * R * 0.75, cy + Math.sin(a + 0.45) * R * 0.75, cx, cy); };
        g.fillStyle = rgb(k % 2 ? cA : cB); pth(); g.fill(); leads.push(() => { pth(); g.stroke(); });
        // leaf between petals
        const b = a + Math.PI / petals;
        const lp = () => { g.beginPath(); g.ellipse(cx + Math.cos(b) * R * 0.72, cy + Math.sin(b) * R * 0.72, R * 0.17, R * 0.08, b, 0, Math.PI * 2); };
        g.fillStyle = rgb(C.emerald); lp(); g.fill(); leads.push(() => { lp(); g.stroke(); });
      }
      g.fillStyle = rgb(C.gold); g.beginPath(); g.arc(cx, cy, R * 0.2, 0, Math.PI * 2); g.fill(); leads.push(() => { g.beginPath(); g.arc(cx, cy, R * 0.2, 0, Math.PI * 2); g.stroke(); });
    };
    const geo = (cx, cy, R) => {
      // quatrefoil in a square
      g.fillStyle = rgb(C.violet); g.fillRect(cx - R, cy - R, 2 * R, 2 * R); leads.push(() => g.strokeRect(cx - R, cy - R, 2 * R, 2 * R));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const x = cx + Math.cos(a) * R * 0.45, y = cy + Math.sin(a) * R * 0.45; g.fillStyle = rgb(k % 2 ? C.sky : C.rose); g.beginPath(); g.arc(x, y, R * 0.45, 0, Math.PI * 2); g.fill(); leads.push(() => { g.beginPath(); g.arc(x, y, R * 0.45, 0, Math.PI * 2); g.stroke(); }); }
      g.fillStyle = rgb(C.amber); g.beginPath(); g.arc(cx, cy, R * 0.25, 0, Math.PI * 2); g.fill(); leads.push(() => { g.beginPath(); g.arc(cx, cy, R * 0.25, 0, Math.PI * 2); g.stroke(); });
    };
    if (p.style === 'geometric') { geo(W / 2, H * 0.3, W * 0.28); geo(W / 2, H * 0.62, W * 0.24); }
    else if (p.style === 'floral') { rose(W / 2, H * 0.3, W * 0.32, 8, C.ruby, C.rose, C.cobalt); rose(W / 2, H * 0.66, W * 0.26, 6, C.amber, C.gold, C.cobalt); }
    else { rose(W / 2, H * 0.28, W * 0.33, 8, C.ruby, C.rose, C.cobalt); geo(W / 2, H * 0.6, W * 0.22); rose(W / 2, H * 0.84, W * 0.18, 6, C.amber, C.gold, C.emerald); }
    g.restore();
    // lead came
    g.strokeStyle = 'rgb(22,20,18)'; g.lineWidth = lw; g.lineJoin = 'round';
    g.save(); shapePath(g); g.clip(); for (const f of leads) f(); g.restore();
    g.lineWidth = lw * 1.6; shapePath(g, lw * 0.5); g.stroke();
    // glass texture pass: streaks, seeds (bubbles), paint shading near leads
    const im = g.getImageData(0, 0, W, H), d = im.data;
    const cook = new Uint8ClampedArray(W * H * 4);
    const blurLead = cv(W, H), bg = blurLead.getContext('2d'); bg.filter = `blur(${lw * 0.9}px)`; bg.drawImage(c, 0, 0);
    const bd = readCanvas(blurLead);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o4 = i * 4, u = x / W, v = y / H;
      const a = d[o4 + 3];
      const streak = N.n(u * 6, v * 40, 6, 40) * 0.6 + N.n(u * 30, v * 120, 30, 120) * 0.4;
      worley(u, v, 40, 80, p.seed, 1);
      const seed = WR[0] < 0.07 && hash2(WR[2], 1, p.seed) < 0.4 ? 1 : 0;
      const lum = (d[o4] + d[o4 + 1] + d[o4 + 2]) / 765;
      const isLead = lum < 0.1 ? 1 : 0;
      const nearLead = clamp(1 - ((bd[o4] + bd[o4 + 1] + bd[o4 + 2]) / 765) / Math.max(0.05, lum)) * (1 - isLead);
      const k = (0.86 + 0.18 * streak + seed * 0.12) * (1 - nearLead * 0.35);
      for (let ch = 0; ch < 3; ch++) { const val = d[o4 + ch] * k; d[o4 + ch] = val; cook[o4 + ch] = isLead ? 0 : Math.min(255, val * 1.15); }
      d[o4 + 3] = a; cook[o4 + 3] = 255;
      if (a < 10) { cook[o4] = cook[o4 + 1] = cook[o4 + 2] = 0; }
    }
    g.putImageData(im, 0, 0);
    const cc = cv(W, H), cg = cc.getContext('2d'); const cim = cg.createImageData(W, H); cim.data.set(cook); cg.putImageData(cim, 0, 0);
    const cc2 = cv(W, H), cg2 = cc2.getContext('2d'); cg2.filter = 'blur(2px)'; cg2.drawImage(cc, 0, 0);
    const map = tex(c, { wrap: false });
    return { map, emissiveMap: map, cookie: tex(cc2, { wrap: false }) };
  });
}

// ================================================================= LETTER (信) — illegible handwriting
// Ruled letter paper (faded red columns) with vertical columns of brush pseudo-glyphs, right→left.
// fill 0..1 = fraction written (unfinished letters stop mid-column); folds: [cols, rows]; flower: pressed flower in margin.
export function letter(o = {}) {
  const p = { w: 704, h: 1024, cols: 8, fill: 1, seed: 15, ruled: true, folds: [1, 2], age: 0.5, flower: false, ink: '#1e1a17', paper: '#E7DCC3', rule: 'rgba(180,83,63,0.55)', ...o };
  return cached('letter', p, () => {
    const W = p.w, H = p.h, N = makeNoise(p.seed), r = rng(p.seed * 11 + 3);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H);
    const paper = hexRGB(p.paper);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const low = N.fbm(u, v, 3, 4) * 0.5 + 0.5, fib = N.n(u * 260, v * 60, 260, 60) * 0.5 + N.n(u * 70, v * 300, 70, 300) * 0.5;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const k = (0.94 + 0.06 * low + 0.03 * fib) * (1 - p.age * 0.18 * sstep(0.06, 0, edge));
      const c = mix3(paper, [206, 186, 150], p.age * (0.25 * low + 0.35 * sstep(0.08, 0, edge)));
      col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
      hgt[i] = 0.5 + 0.05 * fib + 0.1 * low;
      rough[i] = 0.9;
    }
    const c = rgbCanvas(col, W, H), g = c.getContext('2d');
    const mx = W * 0.08, my = H * 0.07, cw = (W - 2 * mx) / p.cols;
    if (p.ruled) {
      g.strokeStyle = p.rule; g.lineWidth = 1.6; g.strokeRect(mx, my, W - 2 * mx, H - 2 * my);
      g.lineWidth = 0.9; g.strokeRect(mx - 5, my - 5, W - 2 * mx + 10, H - 2 * my + 10);
      for (let k = 1; k < p.cols; k++) { g.beginPath(); g.moveTo(mx + k * cw, my); g.lineTo(mx + k * cw, H - my); g.stroke(); }
    }
    const gs = cw * 0.72, per = Math.floor((H - 2 * my) / (gs * 1.12));
    let total = Math.round(p.cols * per * p.fill), n = 0;
    g.lineCap = 'round';
    for (let k = p.cols - 1; k >= 0 && n < total; k--) {
      const cx = mx + (k + 0.5) * cw;
      const lineLen = k === 0 ? Math.floor(per * 0.6) : per - (r() < 0.25 ? Math.floor(r() * 4) : 0);
      for (let j = 0; j < lineLen && n < total; j++, n++) {
        const cy = my + gs * 0.62 + j * gs * 1.12 + (r() - 0.5) * 2;
        const s = gs * (0.82 + r() * 0.3);
        const bw = s * 0.08;
        let strokes = handGlyph(r);
        while (strokes.length < 6) strokes = strokes.concat(handGlyph(r).slice(0, 3)).map((st) => ({ ...st, pts: st.pts.map(([x, y]) => [x * 0.92, y * 0.92]) }));
        // running-script feel: shear, writing order (top→bottom), thin connecting hairlines between strokes
        const sh = 0.12 + r() * 0.1;
        strokes.forEach((st) => { st.pts = st.pts.map(([x, y]) => [x + y * sh * 0.5, y]); st.y = Math.min(...st.pts.map((q) => q[1])); });
        strokes.sort((a, b) => a.y - b.y);
        let prev = null;
        for (const st of strokes) {
          const w0 = st.k === 'd' ? bw * 1.5 : bw * (1.05 + r() * 0.3), w1 = st.k === 'p' || st.k === 'n' ? bw * 0.35 : st.k === 'h' ? bw * 1.1 : bw * 0.7;
          const pts = st.pts.map(([x, y]) => [cx + x * s + (r() - 0.5), cy + y * s + (r() - 0.5)]);
          if (prev && r() < 0.55) { const a = prev, b2 = pts[0]; brush(g, bez(a, [(a[0] + b2[0]) / 2 + (r() - 0.5) * s * 0.3, (a[1] + b2[1]) / 2 - s * 0.05], b2, 8), bw * 0.18, bw * 0.3, p.ink, 0.7, 0.3, r); }
          prev = pts[pts.length - 1];
          const curve = pts.length === 3 ? bez(pts[0], pts[1], pts[2], 10) : pts;
          brush(g, curve, w0, w1, p.ink, 0.88, 0.2, r);
        }
      }
    }
    if (p.flower) {
      const fx = mx * 0.5, fy = H * 0.78;
      g.strokeStyle = 'rgba(120,104,70,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, fy + 60); g.quadraticCurveTo(fx + 6, fy + 20, fx, fy); g.stroke();
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.fillStyle = 'rgba(190,120,124,0.6)'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8, 8, 5, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(200,170,90,0.8)'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
    }
    // folds: darken + crease height
    const im = g.getImageData(0, 0, W, H), d = im.data, [fc, fr] = p.folds;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let cr = 0, side = 0;
      for (let k = 1; k <= fc; k++) { const dd = x - W * k / (fc + 1); cr = Math.max(cr, Math.exp(-dd * dd / 4)); side += Math.exp(-Math.pow(dd - 3, 2) / 6) - Math.exp(-Math.pow(dd + 3, 2) / 6); }
      for (let k = 1; k <= fr; k++) { const dd = y - H * k / (fr + 1); cr = Math.max(cr, Math.exp(-dd * dd / 4)); side += Math.exp(-Math.pow(dd - 3, 2) / 6) - Math.exp(-Math.pow(dd + 3, 2) / 6); }
      for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] *= 1 - cr * 0.12 * (1 + p.age);
      hgt[i] += -cr * 0.3 + side * 0.05;
      rough[i] = 0.9 - (d[i * 4] < 90 ? 0.15 : 0);
    }
    g.putImageData(im, 0, 0);
    return finish({ col: c, w: W, h: H, height: hgt, nStrength: 3, rough, srgbWrap: false });
  });
}

// ================================================================= OIL-PAPER SWEETS WRAPPER (油纸)
// Translucent amber oiled paper; twist creases radiate from the centre. map has alpha (use transparent material).
export function oilPaper(o = {}) {
  const p = { size: 512, seed: 16, tone: 'amber', twist: 14, ...o };
  return cached('oilPaper', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed);
    const base = p.tone === 'red' ? [184, 72, 54] : p.tone === 'pale' ? [222, 196, 150] : hexRGB('#D8B57A');
    const angs = Array.from({ length: p.twist }, () => r() * Math.PI * 2);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), alpha = new Uint8ClampedArray(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x, dx = u - 0.5, dy = v - 0.5, rr = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      let cr = 0;
      for (const b of angs) { let d = Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI); cr += Math.exp(-Math.pow(d * rr * 40, 2)) * sstep(0.02, 0.15, rr); }
      const crumple = N.ridged(u, v, 6, 4);
      const oil = sstep(0.55, 0.75, N.fbm(u, v, 4, 4) * 0.5 + 0.5);
      const fib = N.n(u * 200, v * 200, 200, 200);
      const c = mix3(base, [base[0] * 0.66, base[1] * 0.58, base[2] * 0.5], oil * 0.6 + cr * 0.2).map((q) => q * (0.94 + 0.06 * fib));
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      hgt[i] = cr * 0.6 + crumple * 0.35;
      rough[i] = clamp(0.45 - oil * 0.2 + 0.1 * crumple);
      alpha[i] = (0.72 + 0.2 * oil + 0.06 * cr) * 255;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 4, rough, alpha });
  });
}

// ================================================================= SEA-SALT CRUST overlay (alpha)
// White crystalline crust + dried tide rings. Use as a transparent overlay layer (decal / shell mesh) or alphaMap.
export function saltCrust(o = {}) {
  const p = { size: 512, density: 0.5, seed: 17, ...o };
  return cached('saltCrust', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const col = new Uint8ClampedArray(W * H * 3), hgt = new Float32Array(W * H), rough = new Float32Array(W * H), alpha = new Uint8ClampedArray(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = y * W + x;
      const f = N.fbm(u, v, 4, 5) * 0.5 + 0.5;
      worley(u, v, 90, 90, p.seed, 1); const crys = sstep(0.2, 0.05, WR[1] - WR[0]);
      const sp = N.n(u * 400, v * 400, 400, 400);
      const ring = Math.exp(-Math.pow((f - 0.58) / 0.01, 2));
      const m = clamp(sstep(1 - p.density * 0.75, 1 - p.density * 0.55, f) * (0.7 + 0.3 * crys) + ring * 0.6 * p.density + (sp > 0.7 ? 0.5 * p.density : 0));
      const k = 0.86 + 0.14 * crys;
      col[i * 3] = 232 * k; col[i * 3 + 1] = 230 * k; col[i * 3 + 2] = 222 * k;
      hgt[i] = m * (0.5 + 0.5 * crys);
      rough[i] = 0.75 - 0.2 * crys;
      alpha[i] = m * 255;
    }
    return finish({ col, w: W, h: H, height: hgt, nStrength: 3, rough, alpha });
  });
}

// ================================================================= GLASS SMUDGE (for glass.js)
// Linear RGBA: R = haze (smudges/fingerprints), G = roughness (0.03..0.3), B = dust specks.
export function glassSmudge(o = {}) {
  const p = { size: 512, seed: 18, prints: 6, wipes: 3, dust: 0.5, ...o };
  return cached('glassSmudge', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed), r = rng(p.seed * 3);
    const c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // fingerprints: concentric ridges
    for (let k = 0; k < p.prints; k++) {
      const x = r() * W, y = r() * H, s = 10 + r() * 10, a = r() * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
      for (let q = 1; q < 9; q++) { g.beginPath(); g.ellipse(0, 0, s * q / 9, s * 1.35 * q / 9, 0, r() * 0.5, Math.PI * 2 - r() * 0.8); g.stroke(); }
      g.restore();
    }
    // wipe arcs (streaky)
    for (let k = 0; k < p.wipes; k++) {
      const x = r() * W, y = r() * H, R = 60 + r() * 120, a0 = r() * Math.PI * 2;
      for (let q = 0; q < 14; q++) { g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.arc(x, y, R + q * 2.2, a0, a0 + 1.2 + r() * 0.5); g.stroke(); }
    }
    const sm = readCanvas(c);
    const out = cv(W, H), og = out.getContext('2d'), im = og.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, u = x / W, v = y / H;
      const haze = clamp(sm[i * 4] / 255 + 0.12 * sstep(0.55, 0.85, N.fbm(u, v, 4, 4) * 0.5 + 0.5));
      const dust = N.n(u * 300, v * 300, 300, 300) > 0.82 ? p.dust : 0;
      d[i * 4] = haze * 255; d[i * 4 + 1] = clamp(0.03 + haze * 0.5 + dust * 0.2) * 255; d[i * 4 + 2] = dust * 255; d[i * 4 + 3] = 255;
    }
    og.putImageData(im, 0, 0);
    return { map: tex(out, { srgb: false }) };
  });
}

// ================================================================= WINDOW COOKIE (light mask for shafts / SpotLight.map)
// White panes, dark glazing bars. shape 'rect' | 'arch'. glass: old-glass waviness (subtle brightness variation).
export function windowCookie(o = {}) {
  // pattern: 'grid' (cols×rows panes) | 'sash' (arched six-over-six + fanlight, LOC_LAB / map office) | 'crackedIce' (LOC_HOME lattice)
  //          | 'louvre' (half-closed shutters → parallel stripes, LOC_MAPOFFICE) | 'bars' (vertical wooden bars, LOC_CABIN) | 'steel' (corridor arch, slim bars)
  const p = { size: 512, pattern: 'grid', cols: 3, rows: 4, bar: 0.035, frame: 0.06, shape: 'rect', glass: 0.15, seed: 19, blur: 2, slats: 14, open: 0.45, ...o };
  if ((p.pattern === 'sash' || p.pattern === 'steel') && o.shape === undefined) p.shape = 'arch';
  return cached('windowCookie', p, () => {
    const W = p.size, H = p.size, N = makeNoise(p.seed);
    const c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const f = p.frame * W, b = p.bar * W;
    const archPath = (begin = true) => { if (begin) g.beginPath(); g.moveTo(f, H - f); g.lineTo(f, W / 2); g.arc(W / 2, W / 2, W / 2 - f, Math.PI, 0); g.lineTo(W - f, H - f); g.closePath(); };
    g.save();
    if (p.shape === 'arch') { archPath(); g.clip(); }
    g.fillStyle = '#fff'; g.fillRect(f, f, W - 2 * f, H - 2 * f);
    g.fillStyle = '#000'; g.strokeStyle = '#000';
    if (p.pattern === 'grid' || p.pattern === 'sash' || p.pattern === 'steel') {
      const cols = p.pattern === 'sash' ? 3 : p.pattern === 'steel' ? 2 : p.cols, rows = p.pattern === 'sash' ? 4 : p.pattern === 'steel' ? 5 : p.rows;
      const bb = p.pattern === 'steel' ? b * 0.45 : b, y0 = p.shape === 'arch' ? W / 2 : f;
      for (let i = 1; i < cols; i++) g.fillRect(f + (W - 2 * f) * i / cols - bb / 2, f, bb, H - 2 * f);
      for (let j = 1; j < rows; j++) g.fillRect(f, y0 + (H - f - y0) * j / rows - bb / 2, W - 2 * f, bb);
      if (p.pattern === 'sash') g.fillRect(f, H * 0.62 - bb, W - 2 * f, bb * 2); // meeting rail
      if (p.shape === 'arch') { g.fillRect(f, y0 - bb / 2, W - 2 * f, bb); g.lineWidth = bb; for (let k = 1; k < 4; k++) { const a = Math.PI + Math.PI * k / 4; g.beginPath(); g.moveTo(W / 2, W / 2); g.lineTo(W / 2 + Math.cos(a) * W, W / 2 + Math.sin(a) * W); g.stroke(); } }
    } else if (p.pattern === 'crackedIce') {
      const im = g.getImageData(0, 0, W, H), d = im.data, th = 0.06;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { worley(x / W, y / H, 6, 7, p.seed, 1); if (WR[1] - WR[0] < th) { const o4 = (y * W + x) * 4; d[o4] = d[o4 + 1] = d[o4 + 2] = 0; } }
      g.putImageData(im, 0, 0);
    } else if (p.pattern === 'louvre') {
      const sh = (H - 2 * f) / p.slats;
      for (let k = 0; k < p.slats; k++) g.fillRect(f, f + k * sh, W - 2 * f, sh * (1 - p.open));
      g.fillRect(W / 2 - b / 2, f, b, H - 2 * f);
    } else if (p.pattern === 'bars') {
      for (let k = 1; k < p.cols + 4; k++) g.fillRect(f + (W - 2 * f) * k / (p.cols + 4) - b * 0.6, f, b * 1.2, H - 2 * f);
    }
    g.restore();
    if (p.shape === 'arch') { g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); archPath(false); g.fill('evenodd'); g.restore(); }
    const c2 = cv(W, H), g2 = c2.getContext('2d'); g2.filter = `blur(${p.blur}px)`; g2.drawImage(c, 0, 0);
    if (p.glass > 0) {
      const im = g2.getImageData(0, 0, W, H), d = im.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, k = 1 - p.glass * (0.5 + 0.5 * N.fbm(x / W, y / H, 6, 3)); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      g2.putImageData(im, 0, 0);
    }
    return { map: tex(c2, { wrap: false }) };
  });
}

// ================================================================= MATERIAL PRESETS
// mat(kind, { repeat:[x,y], color, ...materialProps, tex:{...generator params} }) -> MeshStandardMaterial / MeshPhysicalMaterial
// kinds: wood_ship wood_home wood_beam wood_pale lacquer plaster plaster_museum stone stone_dark terrazzo chart brass bronze
//        compass porcelain_bowl porcelain_tile cotton linen_coat floral indigo indigo_patch rattan letter oilpaper salt
//        stained_glass teak camphor wood_smoke pew brick brick_render granite tiles_clay tiles_terracotta velvet wool_coat shirt linen
export function mat(kind, o = {}) {
  const { repeat, tex: tp = {}, ...props } = o;
  const S = (set, extra = {}) => {
    const s = repeat ? withRepeat(set, repeat[0], repeat[1] ?? repeat[0]) : set;
    const { _ns = 1, ...ex } = extra;
    const m = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap || null, roughnessMap: s.roughnessMap || null, metalnessMap: s.metalnessMap || null, roughness: 1, metalness: 0, ...ex, ...props });
    if (s.normalMap && !props.normalScale) m.normalScale = new THREE.Vector2(_ns, _ns);
    return m;
  };
  switch (kind) {
    case 'wood_ship': return S(wood({ tone: 'ship', ...tp }));
    case 'wood_home': return S(wood({ tone: 'home', ...tp }));
    case 'wood_beam': return S(wood({ tone: 'beam', planks: 2, joints: 0, ...tp }));
    case 'wood_pale': return S(wood({ tone: 'pale', ...tp }));
    case 'teak': return S(wood({ tone: 'teak', planks: 5, ...tp }));
    case 'camphor': return S(wood({ tone: 'camphor', planks: 3, joints: 0, ...tp }));
    case 'wood_smoke': return S(wood({ tone: 'smoke', ...tp }));
    case 'pew': return S(wood({ tone: 'pew', planks: 3, joints: 0, ...tp }), { _ns: 0.5 });
    case 'brick': return S(brick(tp));
    case 'brick_render': return S(brick({ tone: 'render', limewash: 0.2, ...tp }), { _ns: 0.6 });
    case 'granite': return S(granite(tp));
    case 'tiles_clay': return S(tiles({ tone: 'clay', ...tp }));
    case 'tiles_terracotta': return S(tiles({ tone: 'terracotta', ...tp }));
    case 'velvet': { const s = velvet(tp); return new THREE.MeshPhysicalMaterial({ map: s.map, normalMap: s.normalMap, roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x5a6a8a), ...props }); }
    case 'wool_coat': return S(wool(tp), { _ns: 0.6 });
    case 'shirt': return S(cotton({ tone: 'shirt', threads: 120, ...tp }), { _ns: 0.8 });
    case 'linen': return S(cotton({ tone: 'linen', threads: 90, creases: 0.15, ...tp }), { _ns: 0.6 });
    case 'lacquer': return S(wood({ tone: 'lacquer', planks: 3, joints: 0, ...tp }), { _ns: 0.4 });
    case 'plaster': return S(plaster(tp));
    case 'plaster_museum': return S(plaster({ tone: 'museum', damp: 0, flake: 0.05, cracks: 0.15, ...tp }), { _ns: 0.5 });
    case 'stone': return S(stone(tp));
    case 'stone_dark': return S(stone({ tone: 'dark', ...tp }));
    case 'terrazzo': return S(terrazzo(tp), { _ns: 0.3 });
    case 'chart': return S(chart(tp), { side: THREE.DoubleSide, _ns: 0.6 });
    case 'brass': return S(brass(tp), { metalness: 1 });
    case 'bronze': return S(brass({ tone: 'bronze', patina: 0.3, ...tp }), { metalness: 1 });
    case 'compass': return S(compassFace(tp), { metalness: 1 });               // tex: { state: 'then'|'museum', bearings: 'glyph'|'text' } — use on a CircleGeometry (north/子 → −Z when laid flat)
    case 'porcelain_bowl': { const s = porcelain({ layout: 'bowl', ...tp }); return new THREE.MeshPhysicalMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.08, side: THREE.DoubleSide, ...props }); }
    case 'porcelain_tile': { const s = porcelain({ layout: 'tile', ...tp }); return new THREE.MeshPhysicalMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.08, ...props }); }
    case 'cotton': return S(cotton(tp), { _ns: 0.8 });
    case 'linen_coat': return S(cotton({ tone: 'coat', threads: 150, creases: 0.3, ...tp }), { _ns: 0.8 });
    case 'floral': return S(floral(tp), { _ns: 0.8 });
    case 'indigo': return S(indigo(tp), { _ns: 0.8 });
    case 'indigo_patch': return S(indigo({ tone: 'patch', ...tp }), { _ns: 0.8 });
    case 'rattan': return S(rattan(tp), { _ns: 1.2 });
    case 'letter': return S(letter(tp), { side: THREE.DoubleSide, _ns: 0.6 });
    case 'oilpaper': return S(oilPaper(tp), { transparent: true, side: THREE.DoubleSide, depthWrite: false });
    case 'salt': return S(saltCrust(tp), { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    case 'stained_glass': { const s = stainedGlass(tp); const { intensity = 2.5, ...rest } = props; return new THREE.MeshBasicMaterial({ map: s.map, transparent: true, side: THREE.DoubleSide, color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), ...rest }); }
    default: throw new Error('textures.mat: unknown kind ' + kind);
  }
}
