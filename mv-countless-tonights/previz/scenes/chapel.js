// chapel — LOC_CHAPEL: the 1950s chapel of a fictional Nanyang port (era 'chapel', CT_CHAPEL).
// Shots: S055 S056 (one continuous crane move) · S057 · S058 · S069; named view for nested renders: view_chapel (corridor P4).
//
// World (metres, Y up): X = EAST (altar end, deep & never featured), Z = SOUTH. Nave x −16…16, z −7…7, walls 10.5 m,
// pale-grey timber barrel vault to 15 m. Three west lancets (1.6 × 7 m, sill 4.2 m) above a shallow organ gallery are the
// key-light windows: the late sun (≈3200 K, cheated to 26° elevation so the petals land on the people) travels ESE through
// them. 14 rows of teak pews each side of a 1.9 m centre aisle, row 1 at the front (east). MOTHER sits at the AISLE
// (north = screen-left from behind) end of the 7th south pew facing east; LONELY at its WALL (south = screen-right) end
// (director ruling S056/S069). Low stained-glass windows in the side aisles, the one beside row 7 holds the GLASSPANEL.
// Two candle side tables (north aisle front, south aisle by row 4) give the blue-hour warm points.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter } from '../lib/cast.js';
import { Figure } from '../lib/figure.js';
const Figure_blend = (a, b, t) => Figure.blend(a, b, t);
import { handPose, blendHandChannels } from '../lib/hand.js';
import { rng, noise1, fbm1, clamp, lerp, smoothstep, ease } from '../engine/util.js';

const DBG = true;
const OFF = new Set(((typeof location !== 'undefined' && new URLSearchParams(location.search).get('chx')) || '').split(',').filter(Boolean)); // perf A/B switches
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- geography
export const CH = {
  west: -16, east: 16, north: -7, south: 7, wallH: 10.5, ridge: 15,
  vaultR: 7.6944, vaultCY: 7.3056,                          // segmental barrel: chord 14 m, rise 4.5 m
  rowX: (k) => 4.0 - (k - 1) * 0.95,                        // seat centre of row k (1 = front)
  pewZ: [0.95, 5.35],                                        // south block (north block mirrored)
  lancetZ: [-3.6, 0, 3.6], lancetW: 1.6, lancetH: 7.0, lancetSill: 4.2,
  aisleWinX: [-10, -6, -2, 2, 6, 10], aisleWin: { w: 1.1, h: 2.3, sill: 0.95 },
  motherZ: 1.28, lonelyZ: 4.95,
};
const ROW7 = CH.rowX(7);
const SUN_EL = 26 * D2R, SUN_AZ = 4.25 * D2R;                // light travels toward +x, a little toward +z (south)
const sunDir = (el = SUN_EL, az = SUN_AZ) => V3(Math.cos(el) * Math.cos(az), -Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();

// ---------------------------------------------------------------- stained glass (non-figurative: layered petals, waves, stars)
// sRGB colours = bible P23–P27 (+ pale opal / gold / pale blue quarries)
const SGC = { ruby: [154, 69, 69], amber: [201, 145, 63], cobalt: [52, 84, 143], sea: [76, 127, 104], rose: [201, 143, 138],
  gold: [222, 188, 112], opal: [214, 220, 204], pgold: [228, 212, 170], pblue: [178, 194, 212], deep: [44, 66, 112], violet: [118, 98, 140] };
const rgb = (a, k = 1) => `rgb(${Math.round(a[0] * k)},${Math.round(a[1] * k)},${Math.round(a[2] * k)})`;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }

// Paint one window design into a W×H canvas. shape: 'lancet' (equilateral pointed arch) | 'rect' | 'arch' (round head).
// Returns { glass (RGBA, transparent outside, leads dark), cookie (RGB light mask: leads/outside black, glass = transmission) }.
// opts.clear: [{u, v, w, h}] clear diamond quarries (unit coords of the canvas, v from the TOP) — painted near-white in the
// cookie and flagged (alpha 254) in the glass so a caller can find them; opts.oxidised (museum state: grey leads, cracks).
export function paintWindow(seed, W, H, opts = {}) {
  const { shape = 'lancet', variant = 0, clear = [], oxidised = false, rows = null } = opts;
  const r = rng(seed * 97 + 11), N = TX.makeNoise(seed + 3);
  const c = canvas(W, H), g = c.getContext('2d');
  const leads = [];
  const ys = shape === 'lancet' ? W * 0.866 : shape === 'arch' ? W * 0.5 : 0;
  const outline = (ctx, inset = 0) => {
    ctx.beginPath();
    if (shape === 'lancet') {
      const w = W - 2 * inset;
      ctx.moveTo(inset, H - inset); ctx.lineTo(inset, ys);
      ctx.arc(inset + w, ys, w, Math.PI, Math.PI * 4 / 3, false);
      ctx.arc(inset, ys, w, -Math.PI / 3, 0, false);
      ctx.lineTo(W - inset, H - inset); ctx.closePath();
    } else if (shape === 'arch') {
      ctx.moveTo(inset, H - inset); ctx.lineTo(inset, ys); ctx.arc(W / 2, ys, W / 2 - inset, Math.PI, 0, false); ctx.lineTo(W - inset, H - inset); ctx.closePath();
    } else ctx.rect(inset, inset, W - 2 * inset, H - 2 * inset);
  };
  const fillPath = (col, pathFn) => { g.fillStyle = rgb(col); pathFn(); g.fill(); leads.push(pathFn); };
  g.save(); outline(g); g.clip();
  // ground: overlapping petal scales ("层叠花瓣色块"), drawn top → bottom so each row overlaps the one above;
  // colour weights warm toward the head, cooler toward the waves; a few pale/opal pieces only
  const q = W / (shape === 'lancet' ? 6.5 : 5.0), qh = q * 1.25;   // real stained-glass scale: 15–25 cm pieces
  const pickCol = (v) => {
    const warm = clamp(1.15 - v * 1.3), x = r();
    const tab = [[SGC.rose, 0.16 + 0.06 * warm], [SGC.ruby, 0.12 + 0.08 * warm], [SGC.amber, 0.14 + 0.08 * warm], [SGC.gold, 0.07 + 0.05 * warm],
      [SGC.cobalt, 0.16 - 0.06 * warm], [SGC.sea, 0.13 - 0.04 * warm], [SGC.pblue, 0.07], [SGC.opal, 0.06], [SGC.violet, 0.04]];
    let acc = 0, tot = tab.reduce((a, b) => a + b[1], 0);
    for (const [c, w] of tab) { acc += w / tot; if (x < acc) return c; }
    return SGC.rose;
  };
  for (let j = -1; j < H / (qh * 0.62) + 2; j++) {
    const y = j * qh * 0.62, off = (j % 2) * q / 2;
    for (let i = -1; i < W / q + 2; i++) {
      const cx = i * q + off + (r() - 0.5) * q * 0.08, w2 = q * 0.52;
      const col = pickCol(y / H);
      fillPath(col, () => { g.beginPath(); g.moveTo(cx, y - qh * 0.1); g.quadraticCurveTo(cx + w2 * 1.05, y + qh * 0.12, cx + w2 * 0.15, y + qh * 0.9); g.quadraticCurveTo(cx, y + qh * 1.0, cx - w2 * 0.15, y + qh * 0.9); g.quadraticCurveTo(cx - w2 * 1.05, y + qh * 0.12, cx, y - qh * 0.1); g.closePath(); });
    }
  }
  // layered-petal rosette (three layers + centre), rotated
  const pals = [
    [SGC.rose, SGC.ruby, SGC.amber, SGC.gold, SGC.cobalt, SGC.sea],
    [SGC.ruby, SGC.rose, SGC.gold, SGC.amber, SGC.sea, SGC.cobalt],
    [SGC.amber, SGC.gold, SGC.rose, SGC.ruby, SGC.cobalt, SGC.deep],
  ];
  const petal = (cx, cy, a, L, w0) => () => {
    g.beginPath(); g.moveTo(cx, cy);
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    g.bezierCurveTo(cx + ca * L * 0.35 + px * w0, cy + sa * L * 0.35 + py * w0, cx + ca * L * 0.85 + px * w0 * 0.7, cy + sa * L * 0.85 + py * w0 * 0.7, cx + ca * L, cy + sa * L);
    g.bezierCurveTo(cx + ca * L * 0.85 - px * w0 * 0.7, cy + sa * L * 0.85 - py * w0 * 0.7, cx + ca * L * 0.35 - px * w0, cy + sa * L * 0.35 - py * w0, cx, cy);
    g.closePath();
  };
  const rosette = (cx, cy, R, pal, rot = 0, n1 = 8) => {
    fillPath(SGC.deep, () => { g.beginPath(); g.arc(cx, cy, R * 1.04, 0, Math.PI * 2); });
    for (let k = 0; k < n1; k++) fillPath(k % 2 ? pal[0] : pal[1], petal(cx, cy, rot + k / n1 * Math.PI * 2, R, R * 0.36));
    for (let k = 0; k < n1; k++) fillPath(k % 2 ? pal[2] : pal[3], petal(cx, cy, rot + (k + 0.5) / n1 * Math.PI * 2, R * 0.7, R * 0.27));
    for (let k = 0; k < 6; k++) fillPath(k % 2 ? pal[4] : pal[5], petal(cx, cy, rot + k / 6 * Math.PI * 2 + 0.2, R * 0.42, R * 0.17));
    fillPath(SGC.gold, () => { g.beginPath(); g.arc(cx, cy, R * 0.12, 0, Math.PI * 2); });
  };
  const star = (cx, cy, R, n, col, inner = 0.45, rot = -Math.PI / 2) => fillPath(col, () => {
    g.beginPath(); for (let k = 0; k < n * 2; k++) { const a = rot + k / (n * 2) * Math.PI * 2, rr = k % 2 ? R * inner : R; k ? g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath();
  });
  const leaf = (cx, cy, a, L, col) => fillPath(col, () => { g.beginPath(); g.ellipse(cx, cy, L, L * 0.38, a, 0, Math.PI * 2); });
  // waves band at the bottom (three scalloped rows)
  const waves = (y0, hh, cols) => {
    const n = shape === 'lancet' ? 6 : 5, wv = W / n;
    cols.forEach((col, row) => {
      const y = y0 + row * hh / cols.length;
      fillPath(col, () => {
        g.beginPath(); g.moveTo(-2, y + hh / cols.length + 2);
        for (let i = 0; i <= n; i++) { const x = i * wv; g.lineTo(x, y + hh / cols.length * 0.9); g.quadraticCurveTo(x + wv * 0.25, y - hh * 0.05, x + wv * 0.55, y + hh / cols.length * 0.3); g.quadraticCurveTo(x + wv * 0.8, y + hh / cols.length * 0.55, x + wv, y + hh / cols.length * 0.9); }
        g.lineTo(W + 2, y + hh / cols.length + 2); g.closePath();
      });
    });
  };
  if (shape === 'lancet') {
    const R = W * 0.33;
    const yc = rows || [0.3, 0.45, 0.6, 0.75];
    yc.forEach((v, i) => {
      rosette(W / 2, v * H, R, pals[(i + variant) % 3], (i + variant) * 0.2, 12);
      // small side rosettes in the spandrels
      for (const sx of [0.16, 0.84]) rosette(W * sx, v * H + R * 1.05, W * 0.12, pals[(i + variant + 1) % 3], 0.4, 8);
    });
    for (let i = 0; i < yc.length - 1; i++) {
      const y = (yc[i] + yc[i + 1]) / 2 * H;
      star(W * 0.5, y, W * 0.09, 4, i % 2 ? SGC.amber : SGC.cobalt, 0.4, 0);
      leaf(W * 0.3, y, 0.5, W * 0.08, SGC.sea); leaf(W * 0.7, y, -0.5, W * 0.08, SGC.sea);
    }
    // arch head: eight-point star over a cobalt roundel
    fillPath(SGC.cobalt, () => { g.beginPath(); g.arc(W / 2, ys * 0.72, W * 0.25, 0, Math.PI * 2); });
    star(W / 2, ys * 0.72, W * 0.23, 8, SGC.amber, 0.5);
    fillPath(SGC.ruby, () => { g.beginPath(); g.arc(W / 2, ys * 0.72, W * 0.065, 0, Math.PI * 2); });
    // upper petal cluster (the richest amber-ruby cluster just below the head)
    rosette(W / 2, H * 0.185, W * 0.27, [SGC.amber, SGC.ruby, SGC.rose, SGC.gold, SGC.cobalt, SGC.ruby], 0.3, 10);
    waves(H * 0.875, H * 0.1, [SGC.sea, SGC.cobalt, SGC.pblue]);
  } else {
    // panel / low window: two overlapping layered rosettes + petals scattered, waves at the bottom
    const R = Math.min(W, H) * 0.34;
    rosette(W * 0.58, H * 0.36, R, pals[variant % 3], 0.15, 8);
    rosette(W * 0.36, H * 0.62, R * 0.72, pals[(variant + 1) % 3], 0.5, 8);
    for (let k = 0; k < 9; k++) { const a = r() * 6.28, x = W * (0.15 + 0.7 * r()), y = H * (0.12 + 0.7 * r()); fillPath([SGC.rose, SGC.amber, SGC.cobalt, SGC.sea][k % 4], petal(x, y, a, W * 0.12, W * 0.045)); }
    star(W * 0.8, H * 0.74, W * 0.08, 5, SGC.amber, 0.45);
    waves(H * 0.86, H * 0.12, [SGC.sea, SGC.cobalt]);
  }
  // clear quarries (drawn last so they sit on top): pale, nearly colourless
  for (const qd of clear) {
    const cx = qd.u * W, cy = qd.v * H, hw = qd.w * W / 2, hh = qd.h * H / 2;
    fillPath([236, 240, 238], () => { g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx - hw, cy); g.closePath(); });
  }
  // border band of small jewels
  const bw = W * 0.06;
  g.lineWidth = bw; g.strokeStyle = rgb(SGC.cobalt); outline(g, bw * 0.5); g.stroke();
  g.restore();
  // ---- glass texture pass (streaks, seeds, paint shading near the leads) before the leads are drawn
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4; if (d[o + 3] < 8) continue;
    const u = x / W, v = y / H;
    const streak = N.n(u * 5, v * 36, 5, 36) * 0.55 + N.n(u * 23, v * 90, 23, 90) * 0.3 + N.fbm(u, v, 4, 3) * 0.35;
    const k = 0.9 + 0.13 * streak;
    d[o] = Math.min(255, d[o] * k); d[o + 1] = Math.min(255, d[o + 1] * k); d[o + 2] = Math.min(255, d[o + 2] * k);
  }
  g.putImageData(im, 0, 0);
  // ---- leads (came) + saddle bars
  const lw = Math.max(1.6, W * 0.0095);
  const leadCol = oxidised ? 'rgb(96,98,100)' : 'rgb(24,21,19)';
  g.save(); outline(g); g.clip();
  g.strokeStyle = leadCol; g.lineJoin = 'round'; g.lineWidth = lw;
  for (const f of leads) { f(); g.stroke(); }
  g.lineWidth = lw * 0.7; g.strokeStyle = 'rgb(18,16,15)';
  const nb = shape === 'lancet' ? 8 : 2;
  for (let i = 1; i <= nb; i++) { const y = ys + (H - ys) * i / (nb + 1); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  if (oxidised) { // two cracks
    g.strokeStyle = 'rgba(40,40,42,0.85)'; g.lineWidth = 1.2;
    for (const [x0, y0, a] of [[0.62, 0.3, 0.7], [0.3, 0.55, -0.4]]) { g.beginPath(); let x = x0 * W, y = y0 * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.cos(a + (r() - 0.5)) * W * 0.03; y += Math.sin(a + (r() - 0.5)) * W * 0.03; g.lineTo(x, y); } g.stroke(); }
  }
  g.restore();
  g.lineWidth = lw * 1.8; g.strokeStyle = leadCol; outline(g, lw * 0.6); g.stroke();
  // ---- cookie: transmission (glass colour), leads + outside black, slight blur; clear quarries near-white
  const ck = canvas(W, H), cg = ck.getContext('2d');
  cg.fillStyle = '#000'; cg.fillRect(0, 0, W, H);
  cg.filter = `blur(${Math.max(1, W / 320)}px)`; cg.drawImage(c, 0, 0); cg.filter = 'none';
  const cim = cg.getImageData(0, 0, W, H), cd = cim.data;
  // light through coloured glass is more saturated than the glass looks in reflection: boost chroma ×1.6, leads → dark gaps
  for (let i = 0; i < cd.length; i += 4) { const l = (cd[i] + cd[i + 1] + cd[i + 2]) / 765, k = l < 0.16 ? Math.pow(l / 0.16, 2) * 0.5 : 1.0, m = l * 255;
    for (let ch = 0; ch < 3; ch++) cd[i + ch] = clamp((m + (cd[i + ch] - m) * 1.6) * k * 1.04, 0, 255); cd[i + 3] = 255; }
  cg.putImageData(cim, 0, 0);
  return { glass: c, cookie: ck, ys };
}
// PROP_GLASSPANEL (60 × 90 cm): 'then' (chapel, crisp) | 'museum' (oxidised grey lead, two cracks). The 6 × 9 cm clear
// diamond quarry sits at the lower left: unit centre (0.17, 0.80) of the panel, size 0.10 × 0.10.
export const GLASSPANEL_QUARRY = { u: 0.17, v: 0.80, w: 0.10, h: 0.10 };
export function glassPanelCanvas(state = 'then') {
  return paintWindow(57, 360, 540, { shape: 'rect', variant: 1, clear: [GLASSPANEL_QUARRY, { u: 0.78, v: 0.18, w: 0.08, h: 0.08 }, { u: 0.86, v: 0.52, w: 0.07, h: 0.07 }], oxidised: state === 'museum' });
}

// ---------------------------------------------------------------- geometry helpers
function worldUV(geo, su = 1, sv = 1) { // planar UVs from (transformed) positions, chosen per face normal; grain along the long axis
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = y; v = z; } else { u = x; v = y; }
    uv[i * 2] = u / su; uv[i * 2 + 1] = v / sv;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const boxAt = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.BoxGeometry(w, h, d).applyMatrix4(new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(1, 1, 1)));
function lancetOutline(cx, y0, w, h, n = 14) { // pointed arch, in (s, y) coords
  const pts = [], ys = y0 + h - w * 0.866, R = w;
  pts.push(new THREE.Vector2(cx - w / 2, y0), new THREE.Vector2(cx + w / 2, y0), new THREE.Vector2(cx + w / 2, ys));
  for (let i = 1; i <= n; i++) { const a = Math.PI * (i / n) / 3; pts.push(new THREE.Vector2(cx - w / 2 + R * Math.cos(a), ys + R * Math.sin(a))); }
  for (let i = 1; i < n; i++) { const a = Math.PI * 2 / 3 + Math.PI * (i / n) / 3; pts.push(new THREE.Vector2(cx + w / 2 + R * Math.cos(a), ys + R * Math.sin(a))); }
  pts.push(new THREE.Vector2(cx - w / 2, ys));
  return pts;
}
function archOutline(cx, y0, w, h, n = 12) { // round-headed window
  const pts = [], ys = y0 + h - w / 2;
  pts.push(new THREE.Vector2(cx - w / 2, y0), new THREE.Vector2(cx + w / 2, y0), new THREE.Vector2(cx + w / 2, ys));
  for (let i = 1; i < n; i++) { const a = Math.PI * i / n; pts.push(new THREE.Vector2(cx + Math.cos(a) * w / 2, ys + Math.sin(a) * w / 2)); }
  pts.push(new THREE.Vector2(cx - w / 2, ys));
  return pts;
}
function rectOutline(cx, y0, w, h) { return [new THREE.Vector2(cx - w / 2, y0), new THREE.Vector2(cx + w / 2, y0), new THREE.Vector2(cx + w / 2, y0 + h), new THREE.Vector2(cx - w / 2, y0 + h)]; }
// 1-D C1 interpolation through [t, v] keys (Catmull-Rom tangents, flat ends)
function spline1(k, t) {
  if (t <= k[0][0]) return k[0][1];
  const n = k.length; if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 0; while (i < n - 2 && t > k[i + 1][0]) i++;
  const [t0, v0] = k[i], [t1, v1] = k[i + 1];
  const m = (j) => (j <= 0 || j >= n - 1) ? 0 : (k[j + 1][1] - k[j - 1][1]) / (k[j + 1][0] - k[j - 1][0]);
  const h = t1 - t0, s = (t - t0) / h, m0 = m(i) * h, m1 = m(i + 1) * h;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1;
}

export default async function create(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 200);
  camera.userData.H = ctx.H;
  scene.background = new THREE.Color(0x06070a);
  const fog = new THREE.FogExp2(0x4a4038, 0.009); scene.fog = fog;
  scene.environment = envTexture(ctx.renderer, 'chapel_coloured'); scene.environmentIntensity = 0.35;

  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const add = (geo, mat, cast = true, recv = true, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };

  // ================================================================ materials
  const lam = (m, color) => new THREE.MeshLambertMaterial({ map: m.map, normalMap: m.normalMap, normalScale: m.normalScale, color: color ?? m.color, side: m.side });
  const plasterM = lam(TX.mat('plaster', { repeat: [0.22, 0.22], tex: { tone: 'lime', damp: 0.35, flake: 0.18, cracks: 0.3, seed: 41 } }), new THREE.Color(0xf4efe4));
  const floorM = TX.mat('tiles_terracotta', { repeat: [32 / 1.2, 14 / 1.2], tex: { wear: 0.5, seed: 33 } });
  floorM.color = new THREE.Color(0xfff2ea);
  const vaultM = lam(TX.mat('wood_pale', { repeat: [0.5, 0.18], tex: { planks: 8, joints: 1, knots: 0.3, seed: 45 } }), new THREE.Color(0xb4b5b2));
  const beamM = lam(TX.mat('wood_beam', { repeat: [1, 0.4], tex: { seed: 46 } }), new THREE.Color(0xc4c2bc));
  const pewM = TX.mat('pew', { repeat: [1 / 0.6, 1 / 1.6], tex: { planks: 3, joints: 0, wear: 0.6, seed: 47 } });
  pewM.roughness = 0.62; pewM.normalMap = null;
  const darkWoodM = lam(TX.mat('pew', { repeat: [1, 1], tex: { planks: 3, joints: 0, seed: 48 } }), new THREE.Color(0x8a7a6c));
  const ironM = std({ color: 0x24221f, roughness: 0.5, metalness: 0.6 });
  const clothM = std({ color: 0xe8e2d4, roughness: 0.95 });

  // ================================================================ floor, chancel
  const floor = add(new THREE.PlaneGeometry(32, 14), floorM, false, true); floor.rotation.x = -Math.PI / 2; if (OFF.has('nofloor')) floor.visible = false;
  {
    const plat = boxAt(7, 0.3, 14, 12.5, 0.15, 0); worldUV(plat, 1.2, 1.2);
    add(plat, floorM);
    const step = boxAt(0.4, 0.15, 6, 8.8, 0.075, 0); worldUV(step, 1.2, 1.2); add(step, floorM);
    // plain communion rail (no symbols) + table with a white cloth (altar end: deep, soft, never featured)
    const rail = [boxAt(0.08, 0.06, 12, 9.2, 0.95, 0), ...Array.from({ length: 13 }, (_, i) => boxAt(0.05, 0.62, 0.05, 9.2, 0.62, -6 + i))];
    add(worldUV(mergeGeometries(rail), 0.6, 1.6), darkWoodM);
    add(boxAt(1.0, 0.95, 2.4, 13.6, 0.775, 0), clothM);
  }

  // ================================================================ walls (extruded with window reveals)
  const westHoles = CH.lancetZ.map((z) => lancetOutline(z, CH.lancetSill, CH.lancetW, CH.lancetH));
  const gablePts = (s0, s1) => { const pts = [new THREE.Vector2(s0, 0), new THREE.Vector2(s1, 0)]; for (let i = 0; i <= 24; i++) { const z = s1 - (s1 - s0) * i / 24; pts.push(new THREE.Vector2(z, CH.vaultCY + Math.sqrt(CH.vaultR ** 2 - z * z) + 0.05)); } return pts; };
  const wallMesh = (outer, holes, depth) => {
    const sh = new THREE.Shape(outer); for (const h of holes) sh.holes.push(new THREE.Path(h));
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 8 });
    return geo;
  };
  {
    // west gable (s = world z), extruding west
    const w = add(wallMesh(gablePts(-7, 7), westHoles, 0.7), plasterM, false, false); w.rotation.y = -Math.PI / 2; w.position.x = CH.west;
    // east gable with one tall round-headed window
    const e = add(wallMesh(gablePts(-7, 7), [archOutline(0, 4.0, 2.4, 7.0)], 0.7), plasterM, false, true); e.rotation.y = Math.PI / 2; e.position.x = CH.east;
    // side walls: low aisle windows + upper louvred openings
    const holes = [];
    for (const x of CH.aisleWinX) { holes.push(archOutline(x, CH.aisleWin.sill, CH.aisleWin.w, CH.aisleWin.h)); holes.push(rectOutline(x, 6.0, 1.4, 3.0)); }
    const outer = [new THREE.Vector2(-16, 0), new THREE.Vector2(16, 0), new THREE.Vector2(16, CH.wallH), new THREE.Vector2(-16, CH.wallH)];
    const s = add(wallMesh(outer, holes, 0.6), plasterM, true, true); s.position.z = CH.south;
    const nWall = add(wallMesh(outer.map((p) => new THREE.Vector2(-p.x, p.y)), holes.map((h) => h.map((p) => new THREE.Vector2(-p.x, p.y)).reverse()), 0.6), plasterM, false, false);
    nWall.rotation.y = Math.PI; nWall.position.z = CH.north;
    // dado band (darker lime wash, rising damp) along the side walls
    const dado = std({ color: 0x8f877a, roughness: 0.9 });
    for (const z of [CH.south - 0.01, CH.north + 0.01]) { const d = add(new THREE.PlaneGeometry(32, 0.9), dado, false, true); d.position.set(0, 0.45, z); d.rotation.y = z > 0 ? Math.PI : 0; }
  }
  // ================================================================ vault, ribs, tie beams, still fans
  {
    const nx = 32, na = 40, a0 = -Math.asin(7 / CH.vaultR), a1 = -a0;
    const pos = [], nrm = [], uv = [], idx = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= na; j++) {
      const x = -16 + 32 * i / nx, a = a0 + (a1 - a0) * j / na;
      const z = CH.vaultR * Math.sin(a), y = CH.vaultCY + CH.vaultR * Math.cos(a);
      pos.push(x, y, z); nrm.push(0, -Math.cos(a), -Math.sin(a)); uv.push(a * CH.vaultR, x);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + na + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const vm = add(g, vaultM, false, false); if (OFF.has('novault')) vm.visible = false;
    const ribs = [];
    for (let x = -14; x <= 14; x += 4) {
      const rib = new THREE.TorusGeometry(CH.vaultR - 0.12, 0.13, 6, 40, a1 - a0);
      rib.rotateZ(Math.PI / 2 + a0); rib.rotateY(Math.PI / 2); rib.translate(x, CH.vaultCY, 0); ribs.push(rib);
      ribs.push(boxAt(0.22, 0.3, 14, x, CH.wallH - 0.15, 0));
      ribs.push(boxAt(0.14, 0.9, 0.14, x, CH.wallH + 0.45, 0)); // king post stub
    }
    add(worldUV(mergeGeometries(ribs.map((r) => r.index ? r.toNonIndexed() : r)), 1, 1.5), beamM, false, false);
    // still ceiling fans hanging from the tie beams
    const fan = [];
    for (const [x, z] of [[-10, -3.5], [-10, 3.5], [-2, -3.5], [-2, 3.5], [6, -3.5], [6, 3.5]]) {
      const y = 7.4;
      fan.push(new THREE.CylinderGeometry(0.012, 0.012, CH.wallH - 0.3 - y, 6).translate(x, (CH.wallH - 0.3 + y) / 2, z));
      fan.push(new THREE.CylinderGeometry(0.13, 0.11, 0.16, 16).translate(x, y - 0.05, z));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4 + x * 0.1; fan.push(boxAt(0.62, 0.012, 0.13, x + Math.cos(a) * 0.42, y - 0.1, z + Math.sin(a) * 0.42, 0.06, -a, 0)); }
    }
    add(mergeGeometries(fan.map((r) => r.index ? r.toNonIndexed() : r)), std({ color: 0x3a3632, roughness: 0.5, metalness: 0.3 }), true, true);
  }
  // ================================================================ organ gallery (shallow, below the lancets)
  {
    const gal = [boxAt(2.0, 0.28, 14, -15.0, 3.0, 0), boxAt(0.08, 1.0, 14, -13.98, 3.64, 0), boxAt(0.14, 0.08, 14, -13.98, 4.16, 0)];
    for (const z of [-5.5, -2, 2, 5.5]) gal.push(boxAt(0.22, 3.0, 0.22, -14.1, 1.5, z));
    add(worldUV(mergeGeometries(gal.map((r) => r.toNonIndexed())), 0.6, 1.6), darkWoodM, true, true);
  }
  // ================================================================ pews (merged, teak)
  {
    const parts = [];
    const endPanel = (() => {
      const s = new THREE.Shape(); s.moveTo(-0.33, 0); s.lineTo(0.23, 0); s.lineTo(0.23, 0.6); s.quadraticCurveTo(0.24, 0.68, 0.14, 0.69); s.lineTo(-0.12, 0.7);
      s.quadraticCurveTo(-0.2, 0.92, -0.3, 0.93); s.quadraticCurveTo(-0.35, 0.92, -0.33, 0.85); s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.025);
    })();
    for (const side of [1, -1]) for (let k = 14; k >= 1; k--) {
      const x = CH.rowX(k), z0 = side > 0 ? CH.pewZ[0] : -CH.pewZ[1], z1 = side > 0 ? CH.pewZ[1] : -CH.pewZ[0], L = z1 - z0, zc = (z0 + z1) / 2;
      parts.push(boxAt(0.42, 0.045, L, x, 0.425, zc));                               // seat
      parts.push(boxAt(0.035, 0.4, L, x - 0.235, 0.66, zc, 0, 0, -0.12));              // back board, reclined
      parts.push(boxAt(0.07, 0.045, L, x - 0.262, 0.865, zc));                         // top rail
      parts.push(boxAt(0.13, 0.02, L, x - 0.32, 0.77, zc));                            // book ledge for the row behind
      parts.push(boxAt(0.035, 0.12, L, x + 0.19, 0.36, zc));                           // seat apron
      parts.push(boxAt(0.04, 0.04, L, x - 0.05, 0.1, zc));                             // stretcher
      for (const ez of [z0, z1]) parts.push(endPanel.clone().translate(x, 0, ez));
      parts.push(boxAt(0.36, 0.38, 0.04, x - 0.02, 0.21, zc));                         // middle support
    }
    const g = worldUV(mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p)), 0.6, 1.6);
    const pm = add(g, pewM, true, true); if (OFF.has('nopews')) pm.visible = false;
  }

  // ================================================================ stained glass: west lancets (sun), aisle windows, east window
  const LW = 288, LH = Math.round(288 * CH.lancetH / CH.lancetW);
  const lancets = CH.lancetZ.map((z, i) => ({ z, ...paintWindow(70 + i, LW, LH, { shape: 'lancet', variant: i }) }));
  const glassMat = (map, k) => new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uInt: { value: k }, uTint: { value: new THREE.Color(1, 1, 1) }, uSun: { value: sunDir() }, uHot: { value: 0 }, uHotPow: { value: 10 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; uniform float uInt, uHot, uHotPow; uniform vec3 uTint, uSun; varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard;
        vec3 V = normalize(vW - cameraPosition); float hot = pow(max(dot(V, uSun), 0.0), uHotPow);
        gl_FragColor = vec4(c.rgb * uTint * uInt * (1.0 + uHot * hot), 1.0); }`,
  });
  const lancetMats = [];
  for (const L of lancets) {
    const m = glassMat(ctex(L.glass), 5.0); lancetMats.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CH.lancetW, CH.lancetH), m);
    mesh.rotation.y = -Math.PI / 2; mesh.position.set(CH.west - 0.3, CH.lancetSill + CH.lancetH / 2, L.z);
    scene.add(mesh);
  }
  // combined cookie of the three lancets over the west-wall rectangle z −4.5…4.5, y 4.1…11.3 (u → +z, v → +y)
  const WR = { c: V3(CH.west + 0.02, 7.7, 0), r: V3(0, 0, 4.5), u: V3(0, 3.6, 0) };
  const ckW = 1024, ckH = Math.round(1024 * 7.2 / 9);
  const cookieC = canvas(ckW, ckH);
  {
    const g = cookieC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, ckW, ckH);
    for (const L of lancets) { const x0 = (L.z - CH.lancetW / 2 + 4.5) / 9 * ckW, w = CH.lancetW / 9 * ckW, y0 = (11.3 - (CH.lancetSill + CH.lancetH)) / 7.2 * ckH, h = CH.lancetH / 7.2 * ckH; g.drawImage(L.cookie, x0, y0, w, h); }
  }
  const cookieTex = ctex(cookieC); cookieTex.generateMipmaps = true; cookieTex.minFilter = THREE.LinearMipmapLinearFilter;
  // the sun: one far spot aimed at the window rectangle, colour map = the cookie warped into the spot's view (1 shadow light)
  const SUN_DIST = 70;
  const sun = new THREE.SpotLight(0xffe0c0, 1, 0, 0.1, 0.02, 2);
  sun.castShadow = !OFF.has('noshadow'); sun.shadow.mapSize.set(OFF.has('sh1k') ? 1024 : 2048, OFF.has('sh1k') ? 1024 : 2048); sun.shadow.bias = -0.00015; sun.shadow.normalBias = 0.006;
  scene.add(sun, sun.target);
  let sunMapC = null;
  const aimSun = (dir) => {
    const half = WR.r.clone().add(WR.u).length();
    sun.position.copy(WR.c).addScaledVector(dir, -SUN_DIST); sun.target.position.copy(WR.c); sun.target.updateMatrixWorld();
    sun.angle = Math.atan(half * 1.06 / SUN_DIST);
    sun.shadow.camera.near = SUN_DIST - 2; sun.shadow.camera.far = SUN_DIST + 34; sun.shadow.camera.updateProjectionMatrix();
  };
  aimSun(sunDir());
  { // warp the cookie into the spot's square map (corners land where the window corners project in the light's view)
    const S = 1024, lc = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(sun.angle) * 2, 1, 1, 500);
    lc.position.copy(sun.position); lc.lookAt(WR.c); lc.updateMatrixWorld(); lc.updateProjectionMatrix();
    const P = (v) => { const q = v.clone().project(lc); return [(q.x * 0.5 + 0.5) * S, (1 - (q.y * 0.5 + 0.5)) * S]; };
    const tl = P(WR.c.clone().sub(WR.r).add(WR.u)), tr = P(WR.c.clone().add(WR.r).add(WR.u)), bl = P(WR.c.clone().sub(WR.r).sub(WR.u));
    sunMapC = canvas(S, S); const g = sunMapC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    // sun's penumbra at 8–15 m from the window: lead lines melt, petals of colour stay (blur first, then warp)
    const bl2 = canvas(ckW, ckH), bg2 = bl2.getContext('2d'); bg2.filter = 'blur(1.6px)'; bg2.drawImage(cookieC, 0, 0);
    g.setTransform((tr[0] - tl[0]) / ckW, (tr[1] - tl[1]) / ckW, (bl[0] - tl[0]) / ckH, (bl[1] - tl[1]) / ckH, tl[0], tl[1]); g.drawImage(bl2, 0, 0);
    sun.map = ctex(sunMapC); if (OFF.has('nomip')) { sun.map.generateMipmaps = false; sun.map.minFilter = THREE.LinearFilter; }
  }
  // volumetric shafts (one ray-marched prism over the three lancets, half-res layer) + dust only inside it
  const shaft = FX.windowShaft({ center: WR.c, right: WR.r, up: WR.u, dir: sunDir(), length: 30, cookie: cookieTex, color: 0xffd6a6, intensity: 0.2, floorY: 0, noise: 0.75, penumbra: 0.012, steps: 12 });
  scene.add(shaft.object3D);
  const dustWide = FX.dustMotes({ center: [-7, 5.5, 0.5], size: [16, 9, 12], count: 2600, moteSize: 0.005, intensity: 2.6, beam: { shaft }, ambient: 0.0, seed: 3 });
  const dustNear = FX.dustMotes({ center: [-2.6, 1.4, 2.4], size: [3.5, 1.6, 4.5], count: 1400, moteSize: 0.0028, intensity: 2.0, beam: { shaft }, ambient: 0.0, seed: 5 });
  scene.add(dustWide.object3D, dustNear.object3D);
  // first-bounce fill from the sunlit floor/pews (unshadowed, warm, a little coloured)
  const bounceA = new THREE.PointLight(0xffc4a0, 0, 14, 2); bounceA.position.set(-0.5, -0.15, 1.4);  // below the floor: lights pews, people, walls — not the floor
  const bounceB = new THREE.PointLight(0xe8b0a8, 0, 14, 2); bounceB.position.set(1.5, -0.15, 4.4);
  scene.add(bounceA, bounceB);
  // ambient: sky through every window (cool) + warm floor
  const hemi = new THREE.HemisphereLight(0x8a96b0, 0x6a4a38, 0.3); scene.add(hemi);
  const skyFill = new THREE.PointLight(0xc2cfe2, 0.0, 9, 2); scene.add(skyFill);
  const winGlow = new THREE.PointLight(0x7f9cd0, 0.0, 8, 2); winGlow.position.set(-2.0, 1.9, 6.7); scene.add(winGlow);
  const blueKey = new THREE.DirectionalLight(0x6f8ab8, 0); blueKey.position.set(-12, 9, -3); blueKey.target.position.set(0, 0, 2); scene.add(blueKey, blueKey.target);

  // aisle windows: lower tier at seated eye level (south one beside row 7 holds the GLASSPANEL), lit by the evening sky
  const aisleMats = [];
  {
    const AW = 200, AH = Math.round(200 * CH.aisleWin.h / CH.aisleWin.w);
    CH.aisleWinX.forEach((x, i) => {
      for (const side of [1, -1]) {
        const pw = paintWindow(120 + i * 2 + (side > 0 ? 0 : 1), AW, AH, { shape: 'arch', variant: i + (side > 0 ? 0 : 1) });
        const m = glassMat(ctex(pw.glass), 0.6); aisleMats.push(m);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CH.aisleWin.w, CH.aisleWin.h), m);
        mesh.position.set(x, CH.aisleWin.sill + CH.aisleWin.h / 2, side * (CH.south + 0.3)); mesh.rotation.y = side > 0 ? Math.PI : 0;
        scene.add(mesh);
      }
    });
  }
  // upper louvred openings: dark timber slats with the sky between
  const louvreMat = (() => {
    const c = canvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 256);
    g.fillStyle = '#000'; for (let k = 0; k < 14; k++) g.fillRect(0, k * 256 / 14, 64, 256 / 14 * 0.62); g.fillRect(29, 0, 6, 256);
    return new THREE.MeshBasicMaterial({ map: ctex(c), color: new THREE.Color(0.25, 0.3, 0.42), side: THREE.DoubleSide, fog: false });
  })();
  for (const x of CH.aisleWinX) for (const side of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.0), louvreMat); m.position.set(x, 7.5, side * (CH.south + 0.3)); scene.add(m); }
  // east window (dim; the east sky at sunset)
  const eastPw = paintWindow(90, 300, 875, { shape: 'arch', variant: 2 });
  const eastMat = glassMat(ctex(eastPw.glass), 0.35);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.0), eastMat); m.position.set(CH.east + 0.35, 4.0 + 3.5, 0); m.rotation.y = -Math.PI / 2; scene.add(m); }

  // ================================================================ candle side tables (blue-hour warm points)
  const candles = [];
  const tables = [{ x: 4.6, z: -6.55, n: 2 }, { x: -0.6, z: -6.55, n: 3 }, { x: 0.1, z: 6.55, n: 3, h: 1.32 }];
  for (const [ti, t] of tables.entries()) {
    const th = t.h || 0.87;
    if (t.h) { add(boxAt(0.05, th, 0.05, t.x, th / 2, t.z), ironM); add(boxAt(0.7, 0.02, 0.22, t.x, th, t.z), ironM); add(boxAt(0.4, 0.03, 0.3, t.x, 0.015, t.z), ironM); }
    else { add(boxAt(1.1, 0.86, 0.42, t.x, 0.43, t.z), darkWoodM); add(boxAt(1.16, 0.02, 0.46, t.x, 0.87, t.z), clothM); }
    for (let i = 0; i < t.n; i++) {
      const c = FX.candle({ state: ['B', 'C', 'B', 'D', 'C'][i % 5], seed: 30 + ti * 7 + i, light: i === 1, intensity: 0.9 });
      c.object3D.position.set(t.x - (t.h ? 0.28 : 0.38) + i * (t.h ? 0.56 : 0.76) / Math.max(1, t.n - 1), th + 0.01, t.z + (i % 2 ? 0.06 : -0.05));
      scene.add(c.object3D); candles.push(c);
    }
  }

  // ================================================================ characters
  const [M, Lh, Lm] = await Promise.all([loadCharacter('MOTHER', { lod: 'hi' }), loadCharacter('LONELY', { lod: 'hi' }), loadCharacter('LONELY', { lod: 'mid' })]);
  for (const f of [M, Lh, Lm]) { scene.add(f.root); f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  // airmail letter: pale-blue onionskin, folded in thirds then in half (8.5 × 9 cm), fold softened
  const letterMap = (() => {
    const c = canvas(256, 272), g = c.getContext('2d'), r = rng(9);
    g.fillStyle = '#C9D6E2'; g.fillRect(0, 0, 256, 272);
    g.strokeStyle = 'rgba(42,53,80,0.16)'; g.lineWidth = 1.4;
    for (let k = 0; k < 12; k++) { const y = 20 + k * 20; g.beginPath(); let x = 18; g.moveTo(x, y); while (x < 236) { x += 3 + r() * 5; g.lineTo(x, y + (r() - 0.5) * 5); } g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, 256, 6); g.fillStyle = 'rgba(60,70,90,0.2)'; g.fillRect(126, 0, 3, 272);
    return ctex(c);
  })();
  const letter = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.0035), std({ map: letterMap, roughness: 0.75, color: 0xffffff }));
  letter.castShadow = true; scene.add(letter);
  // her small brown leather handbag on the pew beside her
  const bag = add(new THREE.BoxGeometry(0.22, 0.15, 0.08), std({ color: 0x6a4a33, roughness: 0.55 }));
  { const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 18, Math.PI), std({ color: 0x4a3222, roughness: 0.5 })); h.position.y = 0.075; bag.add(h); }
  bag.position.set(ROW7 - 0.02, 0.447 + 0.075, CH.motherZ + 0.38); bag.rotation.y = Math.PI / 2;
  // LONELY's old cloth cap (on his knees under his folded hands)
  const cap = new THREE.Group();
  { const capM = std({ color: 0x5a544c, roughness: 0.95 });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM); crown.scale.set(1.05, 0.38, 1.15); cap.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.008, 18, 1, false, -Math.PI / 2, Math.PI), capM); brim.position.set(0, 0.002, 0.09); brim.scale.set(1, 1, 0.55); cap.add(brim);
    cap.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  scene.add(cap);

  // ---------------------------------------------------------------- RESTORER reflection plate (S057: the clear diamond quarry)
  const refl = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(17, 0.68, 0.05, 20), rt: ctx.makeRT(204, 300) };
  refl.scene.background = new THREE.Color(0x000000);
  refl.scene.environment = envTexture(ctx.renderer, 'night_museum'); refl.scene.environmentIntensity = 0.25;
  const R = await loadCharacter('RESTORER', { lod: 'mid' });
  refl.scene.add(R.root);
  { const box = new THREE.PointLight(0xd8e2f0, 0.35, 0, 2); box.position.set(-0.1, 1.3, 0.5); refl.scene.add(box);
    const moon = new THREE.DirectionalLight(0x9fb2d8, 0.6); moon.position.set(-2, 2.5, 1); refl.scene.add(moon);
    refl.scene.add(new THREE.HemisphereLight(0x3a4a66, 0x0a0a0c, 0.4)); }
  // the restorer looking into the corridor pane P4 (S061), seen as the pane would mirror her: drawn into refl.rt
  function renderReflection(T, drift = 0) {
    R.root.position.set(0, 0, 0); R.root.rotation.set(0, 0, 0);
    R.pose('stand', { weight: 0.2 }); R.pose({ 'neck.x': 0.16, 'head.x': 0.1, 'head.y': 0.22 + 0.04 * drift, 'head.z': -0.03 }, { add: true }); R.breathe(T, 0.6);
    const e = R.eye();
    refl.cam.position.set(e.x - 0.3, e.y + 0.02, e.z + 1.12); refl.cam.lookAt(e.x - 0.02, e.y - 0.07, e.z); refl.cam.updateMatrixWorld();
    const r = ctx.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(refl.rt); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(refl.scene, refl.cam); r.setRenderTarget(prev);
  }

  // ================================================================ foreground plate for S057: the low window's bottom tier with the GLASSPANEL
  const panelPw = glassPanelCanvas('then');
  const plate = new THREE.Group(); scene.add(plate);
  const plateGlassMat = glassMat(ctex(panelPw.glass), 0.5);
  const PLATE_S = 0.44;                        // plate scale (cheat, ruling 2): the 6 × 9 cm quarry reads ~9 % of frame height
  {
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), plateGlassMat); plate.add(pg);
    // neighbouring panels of the same window (continue the glass beyond the frame edge)
    const nb = paintWindow(58, 360, 540, { shape: 'rect', variant: 2 });
    const nbm = glassMat(ctex(nb.glass), 0.42); plate.userData.nbm = nbm;
    for (const [dx, dy] of [[0.6, 0], [0, 0.9], [0.6, 0.9], [0, -0.9], [0.6, -0.9]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), nbm); m.position.set(dx, dy, 0); plate.add(m); }
    // the stone reveal (left edge of the window) — dark, soft
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.8, 0.04), new THREE.MeshBasicMaterial({ color: 0x0c0b0a, fog: false })); rev.position.set(-0.3 - 0.012, 0.4, 0.01); plate.add(rev);
    // the clear quarry: dark (the shade behind it) + the reflected face (true mirror: u flipped)
    const q = GLASSPANEL_QUARRY, qw = q.w * 0.6, qh = q.h * 0.9, qx = (q.u - 0.5) * 0.6, qy = (0.5 - q.v) * 0.9;
    const dia = new THREE.Shape(); dia.moveTo(0, -qh / 2); dia.lineTo(qw / 2, 0); dia.lineTo(0, qh / 2); dia.lineTo(-qw / 2, 0); dia.closePath();
    const dg = new THREE.ShapeGeometry(dia); const uvs = dg.attributes.uv, pp = dg.attributes.position;
    for (let i = 0; i < pp.count; i++) uvs.setXY(i, 0.5 - pp.getX(i) / qw, 0.5 + pp.getY(i) / qh);
    const rim = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.3, 0.28), fog: false })); rim.scale.setScalar(1.12); rim.position.set(qx, qy, 0.0006); plate.add(rim);
    const dark = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.008, 0.009, 0.013), fog: false })); dark.position.set(qx, qy, 0.001); plate.add(dark);
    const face = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: refl.rt.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
    face.position.set(qx, qy, 0.002); plate.add(face); plate.userData.face = face; plate.userData.quarry = V3(qx, qy, 0);
  }
  plate.scale.setScalar(PLATE_S); plate.visible = false;

  // ================================================================ light sets (fewer lights per frame = cheaper shading)
  const candleLights = candles.filter((c) => c.light).map((c) => c.light);
  function lightSet({ sun: sOn = true, bounce = true, night = false, candles: cOn = false, fill = false } = {}) {
    skyFill.visible = fill;
    sun.visible = sOn && !OFF.has('nosun'); bounceA.visible = bounce; bounceB.visible = false; blueKey.visible = night; winGlow.visible = night;
    for (const l of candleLights) l.visible = cOn;
  }
  // ================================================================ time of day: k = 0 last sun … 1 blue hour
  const SUN_I = 12.0;
  const C_SUN0 = new THREE.Color(0xffe0c0), C_SUN1 = new THREE.Color(0xffa070);
  const fogDay = new THREE.Color(0x4a4038), fogNight = new THREE.Color(0x141c2a);
  function daylight(k, { slide = 0 } = {}) {
    const s = 1 - smoothstep(0, 1, k);
    aimSun(sunDir(SUN_EL - slide * 3.5 * D2R, SUN_AZ + slide * 1.2 * D2R));
    sun.intensity = SUN_I * s * SUN_DIST * SUN_DIST; sun.color.copy(C_SUN0).lerp(C_SUN1, smoothstep(0, 0.8, k));
    shaft.update(ctx.T, { intensity: 0.13 * s }); shaft.object3D.visible = s > 0.01 && !OFF.has('noshaft');
    shaft.material.uniforms.uCol.value.set(0xffd6a6).lerp(new THREE.Color(0xff9a70), smoothstep(0, 0.8, k));
    dustWide.object3D.visible = dustNear.object3D.visible = s > 0.01 && !OFF.has('nodust');
    dustWide.material.uniforms.uInt.value = 2.2 * s; dustNear.material.uniforms.uInt.value = 2.0 * s;
    bounceA.intensity = 3.2 * s;
    hemi.color.set(0x9aa8c4).lerp(new THREE.Color(0x4a6898), k); hemi.groundColor.set(0x8a6248).lerp(new THREE.Color(0x221a18), k);
    hemi.intensity = lerp(1.0, 0.75, k);
    blueKey.intensity = 1.1 * smoothstep(0.3, 1, k); winGlow.intensity = 0.9 * smoothstep(0.4, 1, k);
    for (const m of lancetMats) { m.uniforms.uInt.value = lerp(3.6, 0.35, smoothstep(0, 0.9, k)); m.uniforms.uTint.value.setRGB(1, 1, 1).lerp(new THREE.Color(0.55, 0.62, 1.0), smoothstep(0.3, 1, k)); m.uniforms.uHot.value = 0.7 * s; m.uniforms.uSun.value.copy(sunDir()); }
    for (const m of aisleMats) { m.uniforms.uInt.value = lerp(0.55, 0.22, k); m.uniforms.uTint.value.setRGB(1, 0.95, 0.92).lerp(new THREE.Color(0.55, 0.65, 1.0), k); }
    eastMat.uniforms.uInt.value = lerp(0.35, 0.16, k);
    louvreMat.color.setRGB(0.25, 0.3, 0.42).lerp(new THREE.Color(0.08, 0.12, 0.22), k);
    fog.color.copy(fogDay).lerp(fogNight, k);
  }

  // ================================================================ figures: poses (pure functions of time)
  const F = V3(1, 0, 0), RT = V3(0, 0, 1), UP = V3(0, 1, 0);   // facing east: forward +x, her right = +z (south)
  // MOTHER seated at the aisle end of row 7, letter held to her chest with both hands, head bowed
  function letterHold(fig, T, { rub = 0, grip = 0, lift = 0, fwd = null, right = null } = {}) {
    const ry = fig.root.rotation.y; fwd = fwd || V3(Math.sin(ry), 0, Math.cos(ry)); right = right || V3(-Math.cos(ry), 0, Math.sin(ry));
    const n = fig.worldPos('neck');
    const Lc = n.clone().addScaledVector(fwd, 0.135 - 0.02 * lift).addScaledVector(UP, -0.17 + 0.06 * lift);
    letter.position.copy(Lc);
    const zAx = fwd.clone().multiplyScalar(-1).addScaledVector(UP, -0.35).normalize(); // letter normal: toward her chest, tilted
    const m = new THREE.Matrix4().lookAt(V3(0, 0, 0), zAx.clone().negate(), UP); letter.quaternion.setFromRotationMatrix(m);
    const wr = Lc.clone().addScaledVector(right, 0.062).addScaledVector(UP, -0.06).addScaledVector(fwd, 0.012);
    fig.reach('R', wr, { palm: fwd.clone().multiplyScalar(-1).addScaledVector(right, -0.5).normalize(), fingers: UP.clone().multiplyScalar(0.8).addScaledVector(right, -0.6).normalize() });
    const wl = Lc.clone().addScaledVector(right, -0.066).addScaledVector(UP, -0.07).addScaledVector(fwd, -0.004);
    fig.reach('L', wl, { palm: fwd.clone().multiplyScalar(-1).addScaledVector(right, 0.5).normalize(), fingers: UP.clone().multiplyScalar(0.8).addScaledVector(right, 0.6).normalize() });
    const hR = handPose('relaxed', { curl: 0.55 + 0.25 * grip }, fig.hands.R.dims), hL = handPose('relaxed', { curl: 0.6 + 0.25 * grip }, fig.hands.L.dims);
    hR.thumb = [0.25 + 0.12 * rub, 0.3 + 0.1 * rub, 0.1 + 0.2 * rub, 0.12 + 0.1 * rub, 0.2];
    fig.hands.R.setChannels(hR); fig.hands.L.setChannels(hL);
  }
  function seatMother(T, { tremble = 0, rub = 0, grip = 0, bow = 1, lift = 0, z = CH.motherZ, nod = 0 } = {}) {
    M.root.position.set(ROW7 + 0.05, 0, z); M.root.rotation.set(0, Math.PI / 2, 0);
    M.pose('sit_chair', { seat: 0.447, feet: 0.03, lean: 0.04, hands: 'none' });
    M.pose({ 'armL.clav.y': 0.1, 'armR.clav.y': 0.1, 'neck.x': 0.26 * bow, 'head.x': 0.2 * bow, 'chest.x': 0.03 }, { add: true });
    M.breathe(T, 0.9, 0.22);
    if (tremble > 0) M.tremble(T, tremble);
    if (nod) M.bone('head').rotateX(nod);
    letterHold(M, T, { rub, grip, lift });
  }
  function seatLonely(fig, T, { loosen = 0 } = {}) {
    fig.root.position.set(ROW7 + 0.05, 0, CH.lonelyZ); fig.root.rotation.set(0, Math.PI / 2, 0);
    fig.pose('sit_chair', { seat: 0.447, feet: 0.07, lean: 0.12, hands: 'none' });
    fig.pose({ 'neck.x': 0.08, 'head.x': 0.06 }, { add: true });
    fig.breathe(T + 1.3, 0.7, 0.2);
    const kl = fig.worldPos('legL.lower'), kr = fig.worldPos('legR.lower');
    const k = kl.clone().lerp(kr, 0.5);
    cap.position.copy(k).addScaledVector(F, -0.07).addScaledVector(UP, 0.075); cap.rotation.set(0, Math.PI / 2, 0.05);
    const top = cap.position.clone().addScaledVector(UP, 0.04);
    fig.reach('R', top.clone().addScaledVector(F, -0.1).addScaledVector(RT, 0.05).addScaledVector(UP, 0.01), { palm: V3(0.15, -1, -0.1).normalize(), fingers: V3(0.7, -0.15, -0.7).normalize() });
    fig.reach('L', top.clone().addScaledVector(F, -0.08).addScaledVector(RT, -0.03).addScaledVector(UP, 0.035), { palm: V3(0.1, -1, 0.1).normalize(), fingers: V3(0.7, -0.15, 0.7).normalize() });
    const h = handPose('relaxed', { curl: lerp(0.95, 0.6, loosen) }, fig.hands.R.dims);
    fig.hands.R.setChannels(h); fig.hands.L.setChannels(handPose('relaxed', { curl: lerp(0.9, 0.55, loosen) }, fig.hands.L.dims));
    fig.lookAt(V3(12, 1.2, CH.lonelyZ - 0.5), 0.5);
  }
  const show = (o) => { if (OFF.has('nofig')) o = { ...o, M: false, Lh: false, Lm: false }; M.root.visible = !!o.M; Lh.root.visible = !!o.Lh; Lm.root.visible = !!o.Lm; letter.visible = !!o.M; cap.visible = !!(o.Lh || o.Lm); bag.visible = o.bag ?? !!o.M; plate.visible = !!o.plate; };

  const dbgP = (label, p) => { if (!DBG) return; camera.updateMatrixWorld(); const v = p.clone().project(camera); console.warn('DBG', label, ((v.x + 1) / 2).toFixed(3), ((1 - v.y) / 2).toFixed(3), 'd', camera.position.distanceTo(p).toFixed(2)); };
  // camera from heading (deg: 0 = east, 90 = south) and pitch (deg, + up)
  const aim = (pos, hDeg, pDeg, mm) => {
    const h = hDeg * D2R, p = pDeg * D2R;
    cam.place(camera, pos, [pos[0] + Math.cos(h) * Math.cos(p), pos[1] + Math.sin(p), pos[2] + Math.sin(h) * Math.cos(p)]); cam.lens(camera, mm);
  };

  // ================================================================ the S055–S056 crane move (one continuous plate)
  const CR_T0 = 175.36, CR_T1 = 180.917;              // descent begins on '下' (175.36) … end of S056
  const crPts = [V3(-10.6, 9.0, -1.6), V3(-9.9, 7.9, -1.75), V3(-8.7, 5.9, -1.8), V3(-7.4, 3.7, -1.3), V3(-6.2, 2.05, -0.2), V3(-5.0, 1.4, 0.95), V3(-4.0, 1.31, 1.42), V3(-3.32, 1.3, 1.55)];
  const crCurve = new THREE.CatmullRomCurve3(crPts, false, 'centripetal');
  const RAMP_IN = 0.75, RAMP_OUT = 2.0;             // 18-frame ease-in; long ease-out to a near stop behind her
  const crS = (T) => { // arc-length fraction for a sine-ramped constant-speed profile
    const D = CR_T1 - CR_T0, t = clamp(T - CR_T0, 0, D), cruise = D - RAMP_IN - RAMP_OUT, tot = RAMP_IN / 2 + cruise + RAMP_OUT * 2 / Math.PI;
    let s;
    if (t < RAMP_IN) s = (t - RAMP_IN / Math.PI * Math.sin(Math.PI * t / RAMP_IN)) / 2;
    else if (t < RAMP_IN + cruise) s = RAMP_IN / 2 + (t - RAMP_IN);
    else { const x = t - RAMP_IN - cruise; s = RAMP_IN / 2 + cruise + RAMP_OUT * 2 / Math.PI * Math.sin(Math.PI / 2 * x / RAMP_OUT); }
    return s / tot;
  };
  const crHead = [[174.5, 146], [CR_T0, 146], [176.3, 124], [177.42, 66], [177.82, 50], [178.42, 36], [179.4, 20], [180.3, 0], [180.917, -7]];   // LONELY leaves frame right on 179.4
  const crPitch = [[174.5, 5], [CR_T0, 5], [176.3, -8], [177.42, -30], [177.82, -28], [178.42, -18], [179.4, -10], [180.3, -7], [180.917, -6]];
  function crane(T) {
    const p = crCurve.getPointAt(crS(T));
    aim([p.x, p.y, p.z], spline1(crHead, T), spline1(crPitch, T), 32);
    return p;
  }

  // ================================================================ setups
  const POST_DAY = { exposure: 1.0, temp: 0.12, saturation: 1.0, contrast: 1.05 };
  const POST_NIGHT = { exposure: 1.3, temp: -0.25, saturation: 0.9, contrast: 1.04, shadowTint: [0.44, 0.49, 0.6], highTint: [0.56, 0.52, 0.46], bloom: { strength: 0.5, radius: 0.6, threshold: 0.8 } };
  const setups = {
    // ---- S055 BR2 174.58–177.42 '彩窗下': high at the west end, the south lancet blazing at frame right, shafts slanting
    //      down-left, dust only in the light; richest at 0.18 s; the crane descent (pan left) begins at 0.78 s ('下')
    S055(tl, u, T) {
      lightSet({ sun: true, bounce: true }); daylight(0); show({ M: true, Lh: false, Lm: true });
      seatMother(T); seatLonely(Lm, T);
      const swell = 1 + 0.15 * Math.exp(-(((tl - 0.18) / 0.35) ** 2));     // richest at 0.18 s ('彩窗下')
      shaft.update(T, { intensity: 0.24 * swell * lerp(1, 0.55, smoothstep(0.5, 1, u)) });
      crane(T);
      dbgP('lancetS top', V3(CH.west, CH.lancetSill + CH.lancetH, 3.6)); dbgP('lancetS mid', V3(CH.west, 9.5, 3.6));
      return { ...POST_DAY, dof: null, bloom: { strength: 0.5, radius: 0.65, threshold: 0.95 } };
    },
    // ---- S056 177.42–180.92 '光分成千万瓣': the crane continues to seated height over the pews, LONELY passes out of frame
    //      right (179.4), ends behind MOTHER's back at (0.45, 0.56); follow focus onto her back
    S056(tl, u, T) {
      lightSet({ sun: true, bounce: true }); daylight(0); show({ M: true, Lh: false, Lm: true });
      seatMother(T); seatLonely(Lm, T);
      const p = crane(T);
      const back = M.worldPos('chest');
      const fd = Math.max(1.0, p.distanceTo(back));
      dbgP('mother back', back); dbgP('lonely', Lm.worldPos('chest'));
      return { ...POST_DAY, dof: { focus: lerp(12, fd, smoothstep(0.8, 2.6, tl)), fstop: 4 } };
    },
    // ---- S057 BR2 180.92–182.92 '我听不懂你的祈祷': CU 100 mm locked, MOTHER's right profile at the left third facing right, eyes
    //      closed; soft foreground at right: the low window's bottom tier (the GLASSPANEL in situ) with the clear diamond quarry
    //      at (0.70, 0.45) holding the RESTORER's faint mirrored face (fades up 0–0.3 s, strongest ~15 % at 2 s); thumb rubs the
    //      fold at 1.0 s; lips move on '祷' (182.44 = 1.52 s) — a tiny jaw/head motion on a faceless sculpt
    S057(tl, u, T) {
      lightSet({ sun: true, bounce: true, fill: true }); daylight(0); show({ M: true, Lm: false, plate: true, bag: false });
      bounceA.intensity = 1.5; skyFill.intensity = 0.55;
      const rub = Math.sin(clamp((tl - 0.95) / 0.5) * Math.PI);
      const lips = Math.sin(clamp((tl - 1.5) / 0.32) * Math.PI) * 0.6 + Math.sin(clamp((tl - 1.62) / 0.22) * Math.PI) * 0.4;
      seatMother(T, { rub, lift: 1.9, nod: 0.012 * lips });
      const e = M.eye();
      const D = 3.4, W = D * 36 / 100, Hh = W / ctx.aspect;
      const cpos = V3(e.x + 0.2 * W, e.y - 0.03 * Hh, e.z + D);
      cam.place(camera, cpos, cpos.clone().add(V3(0, 0, -1))); cam.lens(camera, 100);
      // foreground plate: quarry centre at screen (0.70, 0.45), 2.6 m from the lens
      const dq = 2.85, Wq = dq * 36 / 100, Hq = Wq / ctx.aspect;
      const qW = cpos.clone().add(V3((0.70 - 0.5) * Wq, (0.5 - 0.45) * Hq, -dq));
      plate.position.copy(qW).sub(plate.userData.quarry.clone().multiplyScalar(PLATE_S)); plate.rotation.set(0, 0, 0);
      skyFill.position.set(e.x + 0.4, e.y + 0.3, e.z + 2.2);
      const fade = smoothstep(0.0, 0.32, tl) * (0.1 + 0.05 * smoothstep(0.3, 2.0, tl));
      plate.userData.face.material.opacity = fade;
      renderReflection(T, Math.sin(tl * 0.9));
      plate.updateMatrixWorld(true); dbgP('eye', e); dbgP('letter', letter.position); dbgP('quarry', qW); dbgP('darkMesh', plate.userData.face.getWorldPosition(V3())); dbgP('plateC', plate.getWorldPosition(V3())); if (OFF.has('faceq')) { plate.userData.face.material.opacity = 1; plate.userData.face.scale.setScalar(3); plate.userData.face.material.blending = THREE.NormalBlending; plate.userData.face.material.transparent = false; } if (OFF.has('redq')) { const dk = plate.children.filter((c) => c.material && c.material.isMeshBasicMaterial && !c.material.map)[2]; dk.material.color.set(0xff0000); dk.scale.setScalar(OFF.has('big') ? 3 : 1); plate.children[0].visible = !OFF.has('nopg'); } if (DBG) console.warn('DBG plate vis', plate.visible, plate.children.length, plate.scale.x, plate.userData.face.material.opacity);
      for (const m of aisleMats) m.uniforms.uInt.value = 0.22;            // the north aisle window behind her head stays a soft glow
      return { ...POST_DAY, dof: { focus: D, fstop: 2.8, maxCoc: 1.8 }, exposure: 1.05 };
    },
    // ---- S058 BR2 182.92–186.08 '却懂你颤抖的双肩': MCU 75 mm from her right rear 45°, slightly high, barely perceptible push;
    //      shoulder line at (0.66, 0.50) ~28→30 % of frame width (T19 A-frame for S059); tremble starts 0.85 s ('颤抖'), peaks
    //      2.2 s ('肩'), real time; fingers tighten, thumb rubs the fold; 2.2–2.9 s the petals slide off and fade (the sun drops),
    //      blue hour (P03) comes in; two tiny candle points ahead of her at (0.52, 0.38)
    S058(tl, u, T) {
      const k = smoothstep(2.15, 2.95, tl);
      lightSet({ sun: k < 0.999, bounce: true, night: true, candles: true }); daylight(k, { slide: smoothstep(2.0, 3.0, tl) });
      show({ M: true, Lm: false });
      const tr = smoothstep(0.82, 1.2, tl) * (0.55 + 0.6 * Math.exp(-(((tl - 2.2) / 0.55) ** 2))) * (1 - 0.6 * smoothstep(2.9, 3.4, tl)) * (0.85 + 0.3 * noise1(tl * 3.1, 7));
      const grip = smoothstep(0.9, 1.6, tl) * (1 - 0.3 * smoothstep(2.6, 3.2, tl));
      const rub = 0.5 + 0.5 * Math.sin(tl * 5.2) * smoothstep(1.0, 1.5, tl);
      seatMother(T, { tremble: 1.35 * tr, grip, rub, bow: 1.08 });
      const sL = M.worldPos('armL.upper'), sR = M.worldPos('armR.upper'), S = sL.clone().lerp(sR, 0.5);
      const push = 0.1 * ease.inOutSine(smoothstep(0, 0.5, tl) * 0 + clamp(tl / 3.17)) ;
      const dir = V3(-0.707, 0, 0.707), D = 2.42 - push;
      const cpos = S.clone().addScaledVector(dir, D).add(V3(0, 0.13, 0));
      const W = D * 36 / 75, side = V3(0.707, 0, 0.707);           // screen-right direction for this view
      const tgt = S.clone().addScaledVector(side, -(0.66 - 0.5) * W).add(V3(0, 0.13 - D * Math.tan(3 * D2R), 0));
      cam.place(camera, cpos, tgt); cam.lens(camera, 75);
      dbgP('shoulderL', sL); dbgP('shoulderR', sR); dbgP('candle', candles[1].object3D.position.clone().add(V3(0, 0.12, 0)));
      return { ...POST_DAY, temp: lerp(0.12, -0.22, k), saturation: lerp(1.0, 0.9, k), exposure: lerp(1.0, 1.25, k), dof: { focus: cpos.distanceTo(S), fstop: 2.4 } };
    },
    // ---- S069 CH4 217.71–219.71 '不过无数个今晚': MS 50 mm, eye level, locked with a ≤2 % push; blue hour, candles; opens on
    //      her last step along row 7 (T21: left → right, downward), she sits beside LONELY at 0.81 s ('数'), his hands loosen
    //      at 1.1 s; holds on the two sleeves side by side at (0.42, 0.62) = A-frame of the 12-frame dissolve into S070
    S069(tl, u, T) {
      lightSet({ sun: false, bounce: false, night: true, candles: true }); daylight(1);
      show({ M: true, Lh: true, Lm: false, bag: false });
      const t = clamp(tl, 0, 3);
      // walk: last step along the row (facing south, +z), turn left to face east, sit (seated contact on 0.81 s)
      const zSeat = CH.lonelyZ - 0.42, xWalk = ROW7 + 0.44, xSeat = ROW7 + 0.05;
      const walkT = clamp(t / 0.62), sitT = ease.inOutSine(clamp((t - 0.3) / 0.51)), turnT = ease.inOutSine(clamp((t - 0.16) / 0.6));
      const zz = lerp(zSeat - 0.42, zSeat, ease.outSine(walkT));
      M.root.position.set(lerp(xWalk, xSeat, sitT), 0, zz); M.root.rotation.set(0, lerp(0, Math.PI / 2, turnT), 0);
      const chW = M.preset('walk', { phase: 0.25 + 0.5 * walkT, stride: lerp(0.8, 0.2, walkT) }), chS = M.preset('sit_chair', { seat: 0.447, feet: 0.03, lean: 0.06, hands: 'none' });
      M.pose(Figure_blend(chW, chS, sitT));
      M.pose({ 'armL.clav.y': 0.08, 'armR.clav.y': 0.08, 'neck.x': lerp(0.12, 0.2, sitT), 'head.x': lerp(0.05, 0.12, sitT) }, { add: true });
      M.breathe(T, 0.8, 0.22);
      letterHold(M, T, { grip: 0.3 });
      M.lookAt(V3(12, 1.2, zSeat - 0.3), 0.4 * sitT);
      seatLonely(Lh, T, { loosen: smoothstep(1.02, 1.5, t) });
      // camera: rear three-quarter from the aisle side, behind row 8, eye level
      const C = V3(ROW7 - 0.08, 0.93, (zSeat + CH.lonelyZ) / 2);
      const hd = 24 * D2R, dir = V3(Math.cos(hd), 0, Math.sin(hd)), D = 1.95 - 0.035 * ease.inOutSine(clamp(t / 2.0));
      const W = D * 36 / 50, Hh = W / ctx.aspect;
      const cpos = C.clone().addScaledVector(dir, -D).add(V3(0, 0.26, 0));
      const side = V3(-Math.sin(hd), 0, Math.cos(hd));
      const tgt = C.clone().addScaledVector(side, (0.5 - 0.42) * W).add(V3(0, (0.62 - 0.5) * Hh, 0));
      cam.place(camera, cpos, tgt); cam.lens(camera, 50);
      dbgP('sleeves', C); dbgP('lonely', Lh.worldPos('chest')); dbgP('mother', M.worldPos('chest')); dbgP('candle S', candles[candles.length - 1].object3D.position.clone().add(V3(0, 0.12, 0)));
      return { ...POST_NIGHT, grain: 0.024, dof: { focus: cpos.distanceTo(C), fstop: 3.2 } };   // grain lowered: engine grain hash stripes at f5200+ (lib/ISSUES.md)
    },
    // ---- view_chapel (corridor pane P4, S066): the mother on the pew from her right rear, residual coloured light at blue
    //      hour, shoulders trembling softly; self-contained, reads at 480–640 px
    view_chapel(tl, u, T) {
      const k = 0.72;
      lightSet({ sun: true, bounce: true, night: true, candles: true }); daylight(k, { slide: 0.5 });
      show({ M: true, Lm: false });
      seatMother(T, { tremble: 0.6 + 0.25 * Math.sin(T * 0.7), grip: 0.5, rub: 0.5 + 0.5 * Math.sin(T * 4.1), bow: 1.05 });
      const S = M.worldPos('chest');
      const dir = V3(-0.6, 0, 0.8).normalize(), D = 3.2 + 0.05 * Math.sin(T * 0.21);
      const cpos = S.clone().addScaledVector(dir, D).add(V3(0, 0.45, 0));
      cam.place(camera, cpos, S.clone().add(V3(0.15, 0.05, -0.18))); cam.lens(camera, 50);
      return { ...POST_NIGHT, dof: { focus: D, fstop: 4 } };
    },
    default(tl, u, T) { lightSet(); daylight(0); show({ M: true, Lm: true }); seatMother(T); seatLonely(Lm, T); crane(T); return { ...POST_DAY }; },
  };
  // debug views (out/check/chapel/dbg_shots.json): shot.dbg = { pos, target, mm, k, fig }
  const dbgPlane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: sun.map, side: THREE.DoubleSide })); dbgPlane.position.set(0, 3, 0); dbgPlane.visible = false; scene.add(dbgPlane);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshLambertMaterial({ color: 0xffffff })); tp.position.set(-2.05, 1.05, 1.28); tp.lookAt(tp.position.clone().sub(sunDir())); tp.visible = false; scene.add(tp);
  setups.DBG = (tl, u, T, shot) => {
    const d = shot.dbg || {}; lightSet({ sun: (d.k ?? 0) < 1, night: (d.k ?? 0) > 0.5, candles: (d.k ?? 0) > 0.5 }); dbgPlane.visible = !!d.map; if (d.map) console.warn('DBG sun', sun.intensity, sun.visible, sun.castShadow, sun.angle, sun.position.toArray().map((x) => x.toFixed(2)).join(','), sun.map && sun.map.image.width); daylight(d.k ?? 0); show({ M: true, Lm: true, plate: !!d.plate });
    seatMother(T); seatLonely(Lm, T); console.warn('DBG after', sun.intensity, sun.visible, sun.castShadow, sun.color.getHexString(), sun.map && sun.map.uuid);
    if (d.test === 1) { sun.position.set(-2, 10, 1.25); sun.target.position.set(-1.9, 0, 1.25); sun.target.updateMatrixWorld(); sun.angle = 0.6; sun.intensity = 300; }
    if (d.test === 2) { sun.intensity = 300 * 70 * 70; }
    if (d.test === 3) { tp.visible = true; } else tp.visible = false;
    cam.place(camera, d.pos || [-6, 4, 2], d.target || [0, 0.5, 1]); cam.lens(camera, d.mm || 24);
    return { ...POST_DAY, dof: null };
  };

  if (OFF.has('lambert')) scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.isSkinnedMesh) { const m = o.material; o.material = new THREE.MeshLambertMaterial({ map: m.map, normalMap: m.normalMap, color: m.color, side: m.side }); } });
  if (OFF.has('prepass')) { const pre = new THREE.MeshBasicMaterial({ colorWrite: false }); const list = []; scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && o.material && (o.material.isMeshStandardMaterial || o.material.isMeshLambertMaterial) && !o.material.transparent) list.push(o); });
    for (const o of list) { const d = new THREE.Mesh(o.geometry, pre); d.renderOrder = -10; d.matrixAutoUpdate = false; o.updateMatrixWorld(); d.matrix.copy(o.matrixWorld); d.matrixWorld.copy(o.matrixWorld); scene.add(d); } }
  scene.traverse((o) => { if (o.isMesh && o.material && !o.isSkinnedMesh) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) { const t = o.material[k]; const A = o === floor ? 4 : 2; if (t && t.anisotropy > A) { t.anisotropy = A; t.needsUpdate = true; } } });
  if (OFF.has('noaniso') || OFF.has('aniso2')) { const A = OFF.has('aniso2') ? 2 : 1; scene.traverse((o) => { if (o.isMesh && o.material) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) { const t = o.material[k]; if (t && t.anisotropy !== A) { t.anisotropy = A; t.needsUpdate = true; } } }); }
  if (OFF.has('nonormal')) scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.isSkinnedMesh) { o.material.normalMap = null; o.material.roughnessMap = null; o.material.metalnessMap = null; o.material.needsUpdate = true; } });
  if (OFF.has('basic')) scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material = new THREE.MeshBasicMaterial({ color: 0x777777 }); });
  if (OFF.has('nolights')) { bounceA.visible = bounceB.visible = blueKey.visible = false; for (const c of candles) if (c.light) c.light.visible = false; }
  if (OFF.has('nofog')) scene.fog = null;
  if (OFF.has('noenv')) scene.environment = null;
  return {
    scene, camera,
    post: { exposure: 1.0, temp: 0.08, saturation: 0.98, contrast: 1.05, grain: 0.038, vignette: 0.34,
      shadowTint: [0.46, 0.49, 0.58], highTint: [0.56, 0.52, 0.46], lift: [0.008, 0.01, 0.018], bloom: { strength: 0.42, radius: 0.6, threshold: 0.92 } },
    setShot(shot, tl, u, T) {
      for (const c of candles) c.update(T);
      const r = (setups[shot.dbg ? 'DBG' : shot.id] || setups.default)(tl, u, T, shot) || {};
      if (OFF.has('nodof')) r.dof = null;
      const d = r.dof;
      dustWide.update(T, { camera, focus: d ? d.focus : null, fstop: d ? d.fstop : 8 });
      dustNear.update(T, { camera, focus: d ? d.focus : null, fstop: d ? d.fstop : 8 });
      return r;
    },
  };
}
