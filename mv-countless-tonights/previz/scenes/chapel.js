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

const DBG = !!(typeof location !== 'undefined' && new URLSearchParams(location.search).get('chdbg'));
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
    if (qd.halo) { // the quarry is set in a lozenge of pale amber / opal pieces (so the clear diamond reads at any blur)
      const k = qd.halo;
      fillPath([214, 184, 128], () => { g.beginPath(); g.moveTo(cx, cy - hh * k); g.lineTo(cx + hw * k, cy); g.lineTo(cx, cy + hh * k); g.lineTo(cx - hw * k, cy); g.closePath(); });
      for (const [sx, sy, c] of [[0, -1, [226, 214, 186]], [1, 0, [206, 160, 108]], [0, 1, [222, 204, 166]], [-1, 0, [200, 150, 112]]]) {
        const px = cx + sx * hw * (k + 1) / 2, py = cy + sy * hh * (k + 1) / 2, s2 = (k - 1) / 2;
        fillPath(c, () => { g.beginPath(); g.moveTo(px, py - hh * s2); g.lineTo(px + hw * s2, py); g.lineTo(px, py + hh * s2); g.lineTo(px - hw * s2, py); g.closePath(); });
      }
    }
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
export const GLASSPANEL_QUARRY = { u: 0.17, v: 0.80, w: 0.10, h: 0.10, halo: 2.2 };
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

  const LOOK_URL = (() => { try { return JSON.parse((typeof location !== 'undefined' && new URLSearchParams(location.search).get('chlook')) || '{}'); } catch (e) { return {}; } })();   // look-dev (?chlook=)
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const add = (geo, mat, cast = true, recv = true, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };

  // film grain: the engine's integer-hash grain (engine/post.js) at the CT_CHAPEL amount (post.grain 0.038); the old
  // module-side half-res grain quad (a workaround for the float-hash stripes) is gone (integration pass).

  // ================================================================ materials
  const lam = (m, color) => new THREE.MeshLambertMaterial({ map: m.map, normalMap: m.normalMap, normalScale: m.normalScale, color: color ?? m.color, side: m.side });
  const plasterM = lam(TX.mat('plaster', { repeat: [0.22, 0.22], tex: { tone: 'lime', damp: 0.0, flake: 0.14, cracks: 0.25, seed: 41 } }), new THREE.Color(0xf4efe4));
  const floorM = TX.mat('tiles_terracotta', { repeat: [32 / 1.2, 14 / 1.2], tex: { wear: 0.5, seed: 33 } });
  floorM.color = new THREE.Color(0xfff2ea);
  // review fix: the vault is painted timber ("木构拱顶漆浅灰", bible §7.9) — the library's raw wood_pale/wood_beam grain read as
  // cartoon yellow planks at 9 m. Painted boards: pale grey paint, thin dark seams along the nave, butt joints, faint brush
  // streaks and age mottling (seams run along canvas-y = the vault's v = nave axis)
  const paintedBoards = (seed, base, boards = 8) => {
    const W = 512, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rng(seed), N = TX.makeNoise(seed + 9);
    for (let i = 0; i < boards; i++) {
      const x0 = i * W / boards, bw = W / boards, k = 0.95 + 0.08 * r();
      g.fillStyle = rgb(base, k); g.fillRect(x0, 0, bw, H);
      for (let q = 0; q < 60; q++) { const a = 0.03 + 0.04 * r(); g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(60,55,50,${a})`; g.fillRect(x0 + r() * bw, r() * H, 1 + r() * 2, 30 + r() * 160); }
      g.fillStyle = 'rgba(38,34,30,0.6)'; g.fillRect(x0, 0, 2, H); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x0 + 2, 0, 1, H);
      const nj = 1 + Math.floor(r() * 2); for (let j = 0; j < nj; j++) { const y = r() * H; g.fillStyle = 'rgba(38,34,30,0.45)'; g.fillRect(x0, y, bw, 2); }
    }
    const im = g.getImageData(0, 0, W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, m = 0.93 + 0.1 * N.fbm(x / W, y / H, 4, 4); d[o] *= m; d[o + 1] *= m; d[o + 2] *= m * 0.99; }
    g.putImageData(im, 0, 0);
    const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const vaultTex = paintedBoards(45, [190, 190, 185]); vaultTex.repeat.set(0.5, 0.18);
  const beamTex = paintedBoards(46, [150, 146, 138], 3); beamTex.repeat.set(1, 0.4);
  const vaultM = new THREE.MeshLambertMaterial({ map: vaultTex, color: 0xffffff });
  const beamM = new THREE.MeshLambertMaterial({ map: beamTex, color: 0xffffff });
  const pewM = TX.mat('pew', { repeat: [1 / 0.6, 1 / 1.6], tex: { planks: 3, joints: 0, wear: 0.6, seed: 47 } });
  pewM.roughness = 0.62; pewM.normalMap = null;
  const darkWoodM = lam(TX.mat('pew', { repeat: [1, 1], tex: { planks: 3, joints: 0, seed: 48 } }), new THREE.Color(0x8a7a6c));
  const galleryM = lam(TX.mat('pew', { repeat: [1, 1], tex: { planks: 3, joints: 0, seed: 49 } }), new THREE.Color(0xb3a596));
  // fake first bounce from the sunlit floor/pews onto the pale-grey vault and tie beams (emissive, scaled by daylight)
  for (const [m, k] of [[vaultM, 0.16], [beamM, 0.11], [galleryM, 0.06]]) { m.emissive = new THREE.Color(1.0, 0.82, 0.68).multiplyScalar(k); m.emissiveMap = m.map; m.userData.em = k; }
  const ironM = std({ color: 0x24221f, roughness: 0.5, metalness: 0.6 });
  const clothM = std({ color: 0x8c877e, roughness: 0.95 });   // review: the white altar cloth read as a white board behind her head

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
    add(worldUV(mergeGeometries(gal.map((r) => r.toNonIndexed())), 0.6, 1.6), galleryM, true, true);
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
      // (review: the mid-length support board under the seat was dropped — 1 m from the view_chapel lens it read as a pale block)
    }
    const g = worldUV(mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p)), 0.6, 1.6);
    const pm = add(g, pewM, true, true); if (OFF.has('nopews')) pm.visible = false;
  }

  // ================================================================ stained glass: west lancets (sun), aisle windows, east window
  const LW = 288, LH = Math.round(288 * CH.lancetH / CH.lancetW);
  const lancets = CH.lancetZ.map((z, i) => ({ z, ...paintWindow(70 + i, LW, LH, { shape: 'lancet', variant: i }) }));
  const glassMat = (map, k) => new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uInt: { value: k }, uTint: { value: new THREE.Color(1, 1, 1) }, uSun: { value: sunDir() }, uHot: { value: 0 }, uHotPow: { value: 10 }, uSat: { value: 1 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; uniform float uInt, uHot, uHotPow, uSat; uniform vec3 uTint, uSun; varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard;
        vec3 V = normalize(vW - cameraPosition); float hot = pow(max(dot(V, uSun), 0.0), uHotPow);
        vec3 g = mix(vec3(dot(c.rgb, vec3(0.3, 0.55, 0.15))), c.rgb, uSat);
        gl_FragColor = vec4(g * uTint * uInt * (1.0 + uHot * hot), 1.0); }`,
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
  // projected-light cookie (cheat, director ruling 2): each lancet's body tiled 3 × 3 at reduced scale, so the petals that land
  // on the floor, pews and her shoulders are 10–14 cm ("光分成千万瓣") instead of the real 25 cm glass pieces; the visible
  // glass and the volumetric shafts keep the real design
  const petalC = canvas(ckW, ckH);
  {
    const g = petalC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, ckW, ckH);
    const NX = 3, NY = 3;
    lancets.forEach((L, li) => {
      const x0 = (L.z - CH.lancetW / 2 + 4.5) / 9 * ckW, w = CH.lancetW / 9 * ckW, y0 = (11.3 - (CH.lancetSill + CH.lancetH)) / 7.2 * ckH, h = CH.lancetH / 7.2 * ckH;
      const sw = L.cookie.width, sh = L.cookie.height, hf = L.ys / sh;      // pointed head = top hf of the lancet (springing line)
      // keep the pointed head as is, so the pool keeps a lancet silhouette; tile the straight-sided body below it with
      // reduced-scale crops of the lancet's own interior (no border band, no outside black)
      g.drawImage(L.cookie, 0, 0, sw, sh * hf, x0, y0, w, h * hf);
      const by = y0 + h * hf, bh = h * (1 - hf);
      g.save(); g.beginPath(); g.rect(x0, by, w, bh); g.clip();
      for (let i = -1; i < NX; i++) for (let j = -1; j < NY; j++) {      // grid shifted by half a tile
        const k = (i + 1) * 5 + (j + 1) * 3 + li;
        const sx = sw * (0.1 + 0.12 * (k % 3)), sy = sh * (0.24 + 0.17 * ((k >> 1) % 3));
        g.drawImage(L.cookie, sx, sy, sw * 0.56, sh * 0.32, x0 + w * (i + 0.5) / NX, by + bh * (j + 0.5) / NY, w / NX + 0.6, bh / NY + 0.6);
      }
      g.restore();
    });
    // art-directed petals (a DP's gobo): where the sun rays through MOTHER's shoulders / LONELY meet the window, a cluster of
    // 9–12 cm petals in the window's colours, so the light lands on them ("让光瓣恰好落在她肩上", bible §3.4)
    const sd = sunDir(), R2 = rng(77);
    const toCk = (p) => { const t = (p.x - CH.west) / sd.x; const zw = p.z - sd.z * t, yw = p.y - sd.y * t; return [(zw + 4.5) / 9 * ckW, (11.3 - yw) / 7.2 * ckH]; };
    // review: the first version painted round, evenly spaced, saturated blobs (green / pink / yellow) on a dark ground — on
    // her pale qipao they read as a polka-dot T-shirt. Now: a dim amber ground (light still passes between the pieces),
    // overlapping pointed petals, warm-dominant (amber / gold / rose / ruby, a little cobalt, rare sea-green), muted ~30 %.
    const PC = { amber: [232, 160, 84], gold: [236, 200, 132], rose: [222, 140, 128], ruby: [196, 92, 84], cobalt: [104, 128, 196], sea: [112, 160, 130], pale: [240, 222, 196] };
    const PW = [['amber', 0.24], ['gold', 0.14], ['rose', 0.2], ['ruby', 0.17], ['cobalt', 0.15], ['sea', 0.04], ['pale', 0.06]];
    const pick = () => { let x = R2(), acc = 0; for (const [k, w] of PW) { acc += w; if (x < acc) return PC[k]; } return PC.amber; };
    const cluster = (p0, p1, n, sz, ground = [46, 33, 26]) => {   // dim ground: an all-amber wash made the pale qipao read as bare skin
      const [ax, ay] = toCk(p0), [bx, by2] = toCk(p1), pxm = ckW / 9;                  // px per metre
      g.fillStyle = rgb(ground); g.fillRect(Math.min(ax, bx), Math.min(ay, by2), Math.abs(bx - ax), Math.abs(by2 - ay));
      for (let q = 0; q < n; q++) {
        const cx = lerp(ax, bx, R2()), cy = lerp(ay, by2, R2()), L = sz * pxm * (0.7 + 0.7 * R2()), wd = L * (0.36 + 0.2 * R2()), a = R2() * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
        g.fillStyle = rgb(pick(), 0.92 + 0.12 * R2());
        g.beginPath(); g.moveTo(cx - ca * L, cy - sa * L);                  // pointed petal (vesica)
        g.quadraticCurveTo(cx + px * wd * 2, cy + py * wd * 2, cx + ca * L, cy + sa * L);
        g.quadraticCurveTo(cx - px * wd * 2, cy - py * wd * 2, cx - ca * L, cy - sa * L); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(20,14,10,0.75)'; g.lineWidth = 1; g.stroke();
      }
    };
    const mz = CH.motherZ, mx = ROW7 - 0.06;
    cluster(V3(mx, 1.26, mz - 0.27), V3(mx, 0.74, mz + 0.27), 150, 0.036);
    cluster(V3(ROW7 - 0.1, 1.2, CH.lonelyZ - 0.3), V3(ROW7 - 0.1, 0.5, CH.lonelyZ + 0.3), 60, 0.05);
  }
  // the sun: one far spot aimed at the window rectangle, colour map = the cookie warped into the spot's view (1 shadow light)
  const SUN_DIST = 70;
  const sun = new THREE.SpotLight(0xffe0c0, 1, 0, 0.1, 0.02, 2);
  sun.castShadow = !OFF.has('noshadow'); sun.shadow.mapSize.set(OFF.has('sh2k') ? 2048 : 1024, OFF.has('sh2k') ? 2048 : 1024);   // 1 cm texels over the window's cross-section: enough for soft petals
  sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.004;   // review: these sat inside the comment above (never applied)
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
    const bl2 = canvas(ckW, ckH), bg2 = bl2.getContext('2d'); bg2.filter = 'blur(1.2px)'; bg2.drawImage(OFF.has('realck') ? cookieC : petalC, 0, 0);
    g.setTransform((tr[0] - tl[0]) / ckW, (tr[1] - tl[1]) / ckW, (bl[0] - tl[0]) / ckH, (bl[1] - tl[1]) / ckH, tl[0], tl[1]); g.drawImage(bl2, 0, 0);
    sun.map = ctex(sunMapC); if (OFF.has('nomip')) { sun.map.generateMipmaps = false; sun.map.minFilter = THREE.LinearFilter; }
  }
  // volumetric shafts. Review: ONE prism over the whole 9 m window rectangle (53 % of it black between the lancets) made every
  // ray spend most samples in the dark gaps: high variance (a regular IGN weave, or speckle with white jitter). Now one prism
  // per lancet (its own cookie), so all samples land in lit glass; the combined prism is kept only as the dust's beam mask.
  const shaftDust = FX.windowShaft({ center: WR.c, right: WR.r, up: WR.u, dir: sunDir(), length: 30, cookie: cookieTex, color: 0xffd6a6, intensity: 0.2, floorY: 0, noise: 0.75, penumbra: 0.012, steps: 12 });
  const SHARED = ['uCol', 'uInt', 'uT', 'uNoiseAmt', 'uSeed', 'uLodK', 'uSoft', 'uFloorY'];
  const lancetCk = lancets.map((L) => { const t = ctex(L.cookie); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; });
  function triShaft(steps) {
    const grp = new THREE.Group();
    const parts = lancets.map((L, i) => FX.windowShaft({ center: V3(CH.west + 0.02, CH.lancetSill + CH.lancetH / 2, L.z), right: V3(0, 0, CH.lancetW / 2), up: V3(0, CH.lancetH / 2, 0),
      dir: sunDir(), length: 30, cookie: lancetCk[i], color: 0xffd6a6, intensity: 0.2, floorY: 0, noise: 0.75, penumbra: 0.012, steps, seed: i * 3 }));
    for (const pt of parts) {
      // lib workaround (ISSUES.md [chapel]): fx.windowShaft's per-frame FrontSide/BackSide switch loses the shaft whenever the
      // camera is inside the prism (the crane descends through the beams); rasterise both sides, the shader's inside test
      // discards the wrong one
      pt.object3D.onBeforeRender = () => {}; pt.material.side = THREE.DoubleSide;
      for (const k of SHARED) pt.material.uniforms[k] = parts[0].material.uniforms[k];   // one set of look uniforms
      // review fix: IGN jitter is static per pixel (a visible diagonal weave at half res): integer-hash jitter re-seeded per frame
      const m = pt.material, from = 'float j = ign(gl_FragCoord.xy + uSeed * 17.0);';
      if (m.fragmentShader.includes(from)) {
        m.fragmentShader = m.fragmentShader.replace(from, 'uvec2 q_ = uvec2(gl_FragCoord.xy); uint h_ = q_.x * 1973u + q_.y * 9277u + uint(uSeed) * 26699u; h_ ^= h_ >> 15; h_ *= 0x2c1b3c6du; h_ ^= h_ >> 12; h_ *= 0x297a2d39u; h_ ^= h_ >> 15; float j = float(h_ & 0xffffu) / 65536.0;');
        m.needsUpdate = true;
      } else console.warn('chapel: windowShaft jitter patch did not apply (fx.js changed)');
      grp.add(pt.object3D);
    }
    scene.add(grp);
    return { object3D: grp, material: parts[0].material, parts, userData: { lodK0: parts[0].material.uniforms.uLodK.value }, update: (T, o) => parts[0].update(T, o) };
  }
  const shaftHi = triShaft(LOOK_URL.steps ?? 14), shaftLo = triShaft(LOOK_URL.stepsLo ?? 8);   // S056 copy: the camera is inside the beams
  shaftLo.object3D.visible = false;
  let shaft = shaftHi;
  const dustWide = FX.dustMotes({ center: [-7, 5.5, 0.5], size: [16, 9, 12], count: 2600, moteSize: 0.005, intensity: 2.6, beam: { shaft: shaftDust }, ambient: 0.0, seed: 3 });
  const dustNear = FX.dustMotes({ center: [-2.6, 1.4, 2.4], size: [3.5, 1.6, 4.5], count: 1400, moteSize: 0.0028, intensity: 2.0, beam: { shaft: shaftDust }, ambient: 0.0, seed: 5 });
  scene.add(dustWide.object3D, dustNear.object3D);
  // first-bounce fill from the sunlit floor/pews (unshadowed, warm, a little coloured)
  const bounceA = new THREE.PointLight(0xffc4a0, 0, 14, 2); bounceA.position.set(-0.5, -0.15, 1.4);  // below the floor: lights pews, people, walls — not the floor
  const bounceB = new THREE.PointLight(0xe8b0a8, 0, 14, 2); bounceB.position.set(1.5, -0.15, 4.4);
  scene.add(bounceA, bounceB);
  // ambient: sky through every window (cool) + warm floor
  const hemi = new THREE.HemisphereLight(0x8a96b0, 0x6a4a38, 0.3); scene.add(hemi);
  const skyFill = new THREE.PointLight(0xc2cfe2, 0.0, 9, 2); scene.add(skyFill);
  const winGlow = new THREE.PointLight(0x8a9cc0, 0.0, 8, 2); winGlow.position.set(-2.0, 1.9, 6.7); scene.add(winGlow);
  // review: blue hour toned down (P03 #2E4A6E is a deep, muted blue — the qipao read periwinkle and her hair as a navy cap)
  const blueKey = new THREE.DirectionalLight(0x7d8fae, 0); blueKey.position.set(-12, 9, -3); blueKey.target.position.set(0, 0, 2); scene.add(blueKey, blueKey.target);
  // review: the glowing west lancets are big area sources; without them the pew backs and her back sat in near-black between
  // the petal stripes (bible: 4:1, floor bounce as fill). Unshadowed warm directional from the west, fades with the sun.
  // blue-hour candle rim (S058): the candles ahead-left of her are too far to light her; a faint warm rim from that side
  // separates her dove-grey back and hair from the blue (face stays hidden; off in every other shot)
  const rimWarm = new THREE.PointLight(0xffb070, 0, 3.2, 2); rimWarm.position.set(ROW7 + 1.25, 1.35, CH.motherZ - 0.75); rimWarm.visible = false; scene.add(rimWarm);
  const westFill = new THREE.DirectionalLight(0xd2b4a4, 0); westFill.position.set(-16, 6.5, 0.5); westFill.target.position.set(0, 0.6, 1.5); scene.add(westFill, westFill.target);

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
    return new THREE.MeshBasicMaterial({ map: ctex(c), color: new THREE.Color(0.022, 0.026, 0.038), side: THREE.DoubleSide, fog: false });
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
  // LONELY is never closer than ~3.6 m (S056 pass, S069 MS): the 'mid' sculpt is enough (≤ 1 'hi' figure per frame)
  const [M, Lm] = await Promise.all([loadCharacter('MOTHER', { lod: 'hi' }), loadCharacter('LONELY', { lod: 'mid' })]);
  for (const f of [M, Lm]) { scene.add(f.root); f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  if (DBG) console.warn('DBG mats', Object.keys(M.materials).join(','), '|', Object.keys(Lm.materials).join(','));
  // ---- review fixes on the figures (library weaknesses worked around here; lib/ISSUES.md [chapel review]):
  // (1) hair coverage — the pulled-back / short hair shells stop at the occiput and the lower back of the head stays bare
  //     skin (from behind MOTHER read as a bald head with a bun on top; LONELY's short white shell read as a white skull cap);
  // (2) MOTHER's mandarin collar sits at the neckline base and the bowed neck column (head layer) swallows it, so from behind
  //     the qipao read as a T-shirt.
  // Overlay = the skin triangles of a region (same skin weights → follows the neck/head exactly), pushed out along the
  // normal, drawn with the figure's hair material (aux.w feathers the edge into the skin colour like the real hairline) or a
  // linen material for the collar. region(phi, el, pHead, hu, pBind) > 0 inside (phi/el around the head centre, bind pose).
  function skinOverlay(fig, region, { offset = 0.0025, name = 'ovl', layer = 'head', mat = fig.materials.hair, aux = null } = {}) {
    const src = fig.layers[layer]; if (!src || !mat) return null;
    const g = src.geometry, pos = g.attributes.position;
    const inv = fig.skeleton.boneInverses[fig.bi.head];                  // bind: figure space → head-local
    const hu = fig.P.hu, c0 = V3(0, 0.40 * hu, -0.05 * hu), p = V3(), pb = V3();
    const n = pos.count, w = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pb.fromBufferAttribute(pos, i); p.copy(pb).applyMatrix4(inv).sub(c0);
      const r = p.length() || 1;
      w[i] = region(Math.abs(Math.atan2(p.x, p.z)), Math.asin(clamp(p.y / r, -1, 1)), p, hu, pb);
    }
    const idx = g.index ? g.index.array : null, nt = idx ? idx.length / 3 : n / 3, keep = [], map = new Map(), ni = [];
    for (let t = 0; t < nt; t++) {
      const v = idx ? [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2];
      if (aux ? Math.min(w[v[0]], w[v[1]], w[v[2]]) <= 0 : Math.max(w[v[0]], w[v[1]], w[v[2]]) <= 0) continue;   // collar: hard edge
      for (const a of v) { let k = map.get(a); if (k === undefined) { k = keep.length; map.set(a, k); keep.push(a); } ni.push(k); }
    }
    if (!keep.length) return null;
    const ng = new THREE.BufferGeometry();
    for (const [an, att] of Object.entries(g.attributes)) {
      const it = att.itemSize, sa = att.array, dst = new sa.constructor(keep.length * it);
      keep.forEach((v, j) => { for (let c = 0; c < it; c++) dst[j * it + c] = sa[v * it + c]; });
      ng.setAttribute(an, new THREE.BufferAttribute(dst, it, att.normalized));
    }
    const P2 = ng.attributes.position, N2 = ng.attributes.normal, A2 = ng.attributes.aux;
    keep.forEach((v, j) => {
      const o = typeof offset === 'function' ? offset(w[v]) : offset;
      P2.setXYZ(j, P2.getX(j) + N2.getX(j) * o, P2.getY(j) + N2.getY(j) * o, P2.getZ(j) + N2.getZ(j) * o);
      if (A2) { if (aux) A2.setXYZW(j, ...aux(w[v])); else A2.setXYZW(j, 0, 0, 0, clamp(w[v], 0, 1)); }
    });
    ng.setIndex(ni);
    const m = new THREE.SkinnedMesh(ng, OFF.has('hxdbg') ? new THREE.MeshBasicMaterial({ color: 0xff0000 }) : mat); m.name = name; m.castShadow = m.receiveShadow = true;
    m.bind(fig.skeleton, new THREE.Matrix4()); m.frustumCulled = false; fig.root.add(m); fig.layers[name] = m;
    return m;
  }
  const sst = (a, b, x) => smoothstep(a, b, x);
  // MOTHER's 'low_bun' sits at mid-back of the head; with the head bowed it read as the peak of a cap from her right rear (S058).
  // Soft-select the bun in head space and slide it down to the nape (≈3.4 cm) and in (≈1.2 cm): a low chignon over the overlay.
  if (M.layers.hair) {
    const g = M.layers.hair.geometry, pos = g.attributes.position, HB = M.skeleton.boneInverses[M.bi.head].clone().invert(), inv = M.skeleton.boneInverses[M.bi.head];
    const hu = M.P.hu, cb = V3(0, 0.2 * hu, -0.55 * hu), dl = V3(0, -0.165 * hu, 0.06 * hu), p = V3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(inv);
      const w = (1 - smoothstep(0.16 * hu, 0.34 * hu, p.distanceTo(cb))) * smoothstep(-0.2 * hu, -0.4 * hu, p.z);
      if (w <= 0) continue;
      p.addScaledVector(dl, w).applyMatrix4(HB); pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true; g.computeBoundingSphere();
  }
  // MOTHER: fill the back of the head from behind the ears down to a soft nape line just under the low chignon
  const motherHair = (phi, el) => Math.min((phi - 1.9) / 0.22, (el - lerp(-0.3, -1.0, sst(1.95, 2.8, phi))) / 0.1);
  for (const layer of ['head', 'body']) skinOverlay(M, motherHair, { layer, name: 'hairX_' + layer });
  // LONELY: an old man's sparse white fringe — above the ears and round the back, thin crown (his white shell is hidden)
  const lonelyHair = (phi, el) => {
    const lo = phi < 2.0 ? lerp(0.04, 0.12, sst(1.25, 1.6, phi)) : lerp(0.12, -0.95, sst(2.0, 2.75, phi));
    const hi = lerp(0.02, 0.14, sst(1.3, 2.7, phi));                  // bald above the widest part of the skull
    return Math.min((phi - 1.18) / 0.3, (el - lo) / 0.26, (hi - el) / 0.45);
  };
  for (const layer of ['head', 'body']) skinOverlay(Lm, lonelyHair, { offset: 0.002, layer, name: 'hairX_' + layer });   // mid LOD: the occiput is body layer
  if (Lm.layers.hair) Lm.layers.hair.visible = false;
  // sparse: the scalp shows between the white locks (hair shader patch: per-lock coverage mixed toward the skin colour)
  if (Lm.materials.hair) {
    const hm = Lm.materials.hair, ob = hm.onBeforeCompile;
    hm.userData.fzUniforms.uSparse = { value: OFF.has('sparse1') ? 1.0 : 0.85 };
    hm.onBeforeCompile = (sh, r) => {
      ob(sh, r);
      sh.uniforms.uSparse = hm.userData.fzUniforms.uSparse;
      sh.fragmentShader = 'uniform float uSparse;\n' + sh.fragmentShader.replace('diffuseColor.rgb = mix(uSkin * 0.85, hc, edge);',
        'diffuseColor.rgb = mix(uSkin * 0.85, hc, edge);\n  { float cov = uSparse > 0.99 ? 0.0 : clamp(0.44 + 0.3 * n1, 0.0, 1.0) * smoothstep(0.0, 1.0, vAux.w);   // fine mottled coverage, soft fringe edge, no lock stripes\n    diffuseColor.rgb = mix(uSkin * 0.8, vec3(0.58, 0.566, 0.545) * (0.94 + 0.1 * n1), mix(edge, cov, uSparse)); fzH = n1 * 0.00015 * edge; fzR = mix(1.25, 1.1, edge); }');
    };
    hm.customProgramCacheKey = () => 'hair2_sparse_chapel'; hm.needsUpdate = true;
  }
  // MOTHER's stand collar (3.6 cm, small front opening): a clean band ring sampled on the bind-pose neck surface, 4.5 mm proud
  // of the skin, each ring vertex skinned with the weights of its nearest neck-skin vertex (head ∪ body layers)
  {
    const nk = V3().setFromMatrixPosition(M.skeleton.boneInverses[M.bi.neck].clone().invert());
    const cm = M.materials.qipao;
    const collarM = new THREE.MeshPhysicalMaterial({ color: cm ? cm.color.clone() : new THREE.Color(0xadaeae), roughness: 0.88, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.75, 0.74, 0.72), side: THREE.FrontSide });   // front only: the inner face caught the sun / rim as an orange ring
    M.materials.collarX = collarM;
    const y0 = nk.y - 0.002, Hc = 0.062, NA = 64, out = 0.0062, gap = 0.17;   // bottom tucks under the qipao neckline (no skin gap)
    // the library's own collar ring (qipao.trim, sitting low on the neckline shelf) caught the sun as an orange band under
    // the new collar: fold those ring vertices into the neck (the 大襟 closure trim lower down is untouched)
    { const L = M.layers['qipao.trim'], lp = L && L.geometry.attributes.position;
      if (lp) { for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), r = Math.hypot(x - nk.x, z - nk.z); if (y > nk.y - 0.03 && r < 0.09) { const k = 0.72; lp.setXYZ(i, nk.x + (x - nk.x) * k, y, nk.z + (z - nk.z) * k); } } lp.needsUpdate = true; } }
    const pts = [];
    for (const L of [M.layers.head, M.layers.body]) {
      const pa = L.geometry.attributes.position, si = L.geometry.attributes.skinIndex, sw = L.geometry.attributes.skinWeight;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); if (y > y0 - 0.03 && y < y0 + Hc + 0.02 && Math.hypot(x - nk.x, z - nk.z) < 0.09) pts.push({ x, y, z, a: Math.atan2(x - nk.x, z - nk.z), r: Math.hypot(x - nk.x, z - nk.z), si: [0, 1, 2, 3].map((c) => si.getComponent(i, c)), sw: [0, 1, 2, 3].map((c) => sw.getComponent(i, c)) }); }
    }
    const P = [], Nn = [], SI = [], SW = [], I = [];
    // a stand collar is a cylinder hugging the neck: radius from the skin at the band's TOP height (the neck flares into the
    // shoulders below), smoothed around the ring; the lower edge tucks under the qipao's own neckline
    const ang = (k) => gap + (Math.PI * 2 - 2 * gap) * k / NA, yAt = (k, row) => { const af = Math.abs(Math.atan2(Math.sin(ang(k)), Math.cos(ang(k)))); return y0 - 0.011 * sst(1.3, 0.2, af) + (row ? Hc - 0.004 * sst(1.0, 0.2, af) : 0); };
    const ringR = (row, dy) => {
      const raw = [];
      for (let k = 0; k <= NA; k++) {
        const a = ang(k), yt = yAt(k, row) + dy; let R = 0;
        for (const q of pts) { let da = Math.abs(q.a - a); da = Math.min(da, Math.PI * 2 - da); if (da < 0.14 && Math.abs(q.y - yt) < 0.006) R = Math.max(R, q.r); }
        raw.push(R);
      }
      return raw.map((_, k) => { let sum = 0, n = 0; for (let d = -3; d <= 3; d++) { const v = raw[clamp(k + d, 0, NA)]; if (v) { sum += v; n++; } } return n ? sum / n : 0.05; });
    };
    const Rtop = ringR(1, -0.006), Rbot = ringR(0, 0.004);                 // top hugs the neck; bottom covers the flare at the neckline
    for (let row = 0; row < 2; row++) for (let k = 0; k <= NA; k++) {
      const a = ang(k), y = yAt(k, row);
      let best = null, bd = 1e9;
      for (const q of pts) { let da = Math.abs(q.a - a); da = Math.min(da, Math.PI * 2 - da); const d = (q.y - y) ** 2 + 0.004 * da * da + 0.5 * (q.r - (row ? Rtop[k] : Rbot[k])) ** 2; if (d < bd) { bd = d; best = q; } }
      const rr = (row ? Math.min(Rtop[k], Rbot[k]) : Math.max(Rtop[k], Rbot[k])) + out + (row ? 0.0018 : 0.001);
      P.push(nk.x + Math.sin(a) * rr, y, nk.z + Math.cos(a) * rr); Nn.push(Math.sin(a), 0.1, Math.cos(a));
      SI.push(...best.si); SW.push(...best.sw);
    }
    for (let k = 0; k < NA; k++) { const a0 = k, b0 = k + 1, a1 = NA + 1 + k, b1 = NA + 2 + k; I.push(a0, b0, a1, b0, b1, a1); }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); cg.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    cg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); cg.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); cg.setIndex(I);
    const cmh = new THREE.SkinnedMesh(cg, OFF.has('hxdbg') ? new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }) : collarM);
    cmh.castShadow = cmh.receiveShadow = true; cmh.bind(M.skeleton, new THREE.Matrix4()); cmh.frustumCulled = false; M.root.add(cmh); M.layers.collarX = cmh;
  }
  if (OFF.has('nobody')) for (const f of [M, Lm]) f.layers.body.visible = false;
  if (OFF.has('nohead')) for (const f of [M, Lm]) f.layers.head.visible = false;
  if (DBG) for (const f of [M, Lm]) console.warn('DBG layers', f.name || '', Object.entries(f.layers).map(([k, v]) => k + (v.visible ? '' : '(off)') + ':' + (v.geometry ? v.geometry.attributes.position.count : '-')).join(' '));
  if (OFF.has('trimred')) for (const k of ['qipao.trim', 'qipao.buttons']) if (M.materials[k]) { M.materials[k].emissive = new THREE.Color(k === 'qipao.trim' ? 1 : 0, k === 'qipao.trim' ? 0 : 1, 0); M.materials[k].emissiveIntensity = 2; }
  if (OFF.has('trimonly')) for (const k of Object.keys(M.layers)) if (!/trim/.test(k) && M.layers[k].isMesh) M.layers[k].visible = false;
  // review fix: the fitted garment shells follow the sculpted back muscles; under the low sun from behind the qipao's back
  // (and LONELY's thin shirt) read as a bare, muscular back. Diffuse the SHADING normals (positions untouched, so no clipping)
  // over ~6–8 cm: the cloth reads as hanging linen; the procedural weave/fold bump of the cloth shader is unaffected.
  function smoothShading(mesh, iters = 40) {
    const g = mesh && mesh.geometry; if (!g || !g.index) return;
    const pos = g.attributes.position, nrm = g.attributes.normal, n = pos.count, idx = g.index.array;
    const key = new Map(), weld = new Int32Array(n);                 // weld split vertices by position (seams)
    for (let i = 0; i < n; i++) { const k = `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`; let w = key.get(k); if (w === undefined) { w = key.size; key.set(k, w); } weld[i] = w; }
    const m = key.size, nb = Array.from({ length: m }, () => new Set());
    for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = weld[idx[t + e]], b = weld[idx[t + (e + 1) % 3]]; if (a !== b) { nb[a].add(b); nb[b].add(a); } }
    let N = new Float32Array(m * 3), N2 = new Float32Array(m * 3); const cnt = new Float32Array(m);
    for (let i = 0; i < n; i++) { const w = weld[i]; N[w * 3] += nrm.getX(i); N[w * 3 + 1] += nrm.getY(i); N[w * 3 + 2] += nrm.getZ(i); cnt[w]++; }
    const nl = (A, w) => { const l = Math.hypot(A[w * 3], A[w * 3 + 1], A[w * 3 + 2]) || 1; A[w * 3] /= l; A[w * 3 + 1] /= l; A[w * 3 + 2] /= l; };
    for (let w = 0; w < m; w++) nl(N, w);
    const nbA = nb.map((st) => Int32Array.from(st));
    for (let it = 0; it < iters; it++) {
      for (let w = 0; w < m; w++) { let x = N[w * 3], y = N[w * 3 + 1], z = N[w * 3 + 2]; for (const j of nbA[w]) { x += N[j * 3]; y += N[j * 3 + 1]; z += N[j * 3 + 2]; } N2[w * 3] = x; N2[w * 3 + 1] = y; N2[w * 3 + 2] = z; nl(N2, w); }
      [N, N2] = [N2, N];
    }
    for (let i = 0; i < n; i++) { const w = weld[i], o = nrm.getX(i) * N[w * 3] + nrm.getY(i) * N[w * 3 + 1] + nrm.getZ(i) * N[w * 3 + 2]; const sg = o < 0 ? -1 : 1; nrm.setXYZ(i, sg * N[w * 3], sg * N[w * 3 + 1], sg * N[w * 3 + 2]); }
    nrm.needsUpdate = true;
  }
  if (!OFF.has('nosmooth')) { smoothShading(M.layers.qipao, LOOK_URL.smoothM ?? 40); smoothShading(Lm.layers.shirt, LOOK_URL.smoothL ?? 30); }
  // the pale dove-grey linen must not read as bare skin under the 3200 K sun: a touch cooler than #BDB6AB, visible folds + slub
  for (const k of Object.keys(M.materials)) if (/^qipao$/.test(k)) { const m = M.materials[k], U = m.userData.fzUniforms || {};
    m.color.set(0xadaeae); if (U.uFold) U.uFold.value *= 2.6; if (U.uMottle) U.uMottle.value = 0.13; }
  // LONELY: sparse silver-white hair, not a white cap
  for (const f of [Lm]) for (const k of Object.keys(f.materials)) if (/^hair/.test(k) && f.materials[k].color) { const m = f.materials[k], U = m.userData.fzUniforms || {}; m.color.multiplyScalar(0.6); if (U.uGrey) U.uGrey.value = Math.min(U.uGrey.value, 0.78); }
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
  { const box = new THREE.PointLight(0xd8e2f0, LOOK_URL.reflBox ?? 1.3, 0, 2); box.position.set(-0.25, 1.45, 0.55); refl.scene.add(box);   // review: brighter soft key so the face reads in the dark quarry
    const moon = new THREE.DirectionalLight(0x9fb2d8, 0.6); moon.position.set(-2, 2.5, 1); refl.scene.add(moon);
    refl.scene.add(new THREE.HemisphereLight(0x3a4a66, 0x0a0a0c, 0.4)); }
  // the restorer looking into the corridor pane P4 (S061), seen as the pane would mirror her: drawn into refl.rt
  function renderReflection(T, drift = 0) {
    R.root.position.set(0, 0, 0); R.root.rotation.set(0, 0, 0);
    R.pose('stand', { weight: 0.2 }); R.pose({ 'neck.x': 0.16, 'head.x': 0.1, 'head.y': 0.22 + 0.04 * drift, 'head.z': -0.03 }, { add: true }); R.breathe(T, 0.6);
    const e = R.eye();
    refl.cam.position.set(e.x - 0.26, e.y + 0.01, e.z + 0.98); refl.cam.lookAt(e.x - 0.02, e.y - 0.035, e.z); refl.cam.updateMatrixWorld();   // review: face centred in the diamond
    const r = ctx.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(refl.rt); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(refl.scene, refl.cam); r.setRenderTarget(prev);
  }

  // ================================================================ foreground plate for S057: the low window's bottom tier with the GLASSPANEL
  const panelPw = glassPanelCanvas('then');
  const plate = new THREE.Group(); scene.add(plate);
  const plateGlassMat = glassMat(ctex(panelPw.glass), 0.3); plateGlassMat.uniforms.uSat.value = 0.62; plateGlassMat.uniforms.uTint.value.setRGB(1.0, 0.9, 0.82);
  const PLATE_S = 0.44;                        // plate scale (cheat, ruling 2): the 6 × 9 cm quarry reads ~9 % of frame height
  {
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), plateGlassMat); plate.add(pg);
    // neighbouring panels of the same window (continue the glass beyond the frame edge)
    const nb = paintWindow(58, 360, 540, { shape: 'rect', variant: 2 });
    const nbm = glassMat(ctex(nb.glass), 0.24); nbm.uniforms.uSat.value = 0.6; nbm.uniforms.uTint.value.setRGB(1.0, 0.9, 0.82); plate.userData.nbm = nbm;
    for (const [dx, dy] of [[0.6, 0], [0, 0.9], [0.6, 0.9], [0, -0.9], [0.6, -0.9]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), nbm); m.position.set(dx, dy, 0); plate.add(m); }
    // the stone reveal (left edge of the window) — dark, soft
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.8, 0.04), new THREE.MeshBasicMaterial({ color: 0x0c0b0a, fog: false })); rev.position.set(-0.3 - 0.012, 0.4, 0.01); plate.add(rev);
    // the clear quarry: dark (the shade behind it) + the reflected face (true mirror: u flipped)
    const q = GLASSPANEL_QUARRY, qw = q.w * 0.6, qh = q.h * 0.9, qx = (q.u - 0.5) * 0.6, qy = (0.5 - q.v) * 0.9;
    const dia = new THREE.Shape(); dia.moveTo(0, -qh / 2); dia.lineTo(qw / 2, 0); dia.lineTo(0, qh / 2); dia.lineTo(-qw / 2, 0); dia.closePath();
    const dg = new THREE.ShapeGeometry(dia); const uvs = dg.attributes.uv, pp = dg.attributes.position;
    for (let i = 0; i < pp.count; i++) uvs.setXY(i, 0.5 - pp.getX(i) / qw, 0.5 + pp.getY(i) / qh);
    const rim = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.11, 0.1, 0.09), fog: false })); rim.scale.setScalar(1.13); rim.position.set(qx, qy, 0.0006); plate.add(rim);
    const dark = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.008, 0.009, 0.013), fog: false })); dark.position.set(qx, qy, 0.001); plate.add(dark);
    const face = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: refl.rt.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
    face.position.set(qx, qy, 0.002); plate.add(face); plate.userData.face = face; plate.userData.quarry = V3(qx, qy, 0);
  }
  plate.scale.setScalar(PLATE_S); plate.visible = false;

  // ================================================================ light sets (fewer lights per frame = cheaper shading)
  const candleLights = candles.filter((c) => c.light).map((c) => c.light);
  let shaftOn = true, dustOn = true;             // per shot: the volumetric shaft costs a full-screen march when the camera is inside it
  function lightSet({ sun: sOn = true, bounce = true, night = false, candles: cOn = false, fill = false, shaft: shOn = true, dust = true, win = night } = {}) {
    skyFill.visible = fill; shaftOn = !!shOn; dustOn = dust; rimWarm.visible = false;
    shaft = shOn === 'lo' ? shaftLo : shaftHi; (shOn === 'lo' ? shaftHi : shaftLo).object3D.visible = false;
    sun.visible = sOn && !OFF.has('nosun'); bounceA.visible = bounce; bounceB.visible = false; blueKey.visible = night; winGlow.visible = win;
    candleLights.forEach((l, i) => { l.visible = Array.isArray(cOn) ? cOn.includes(i) : !!cOn; });   // 0/1 north aisle tables, 2 south iron stand
  }
  // ================================================================ time of day: k = 0 last sun … 1 blue hour
  const SUN_I = 12.0;
  const C_SUN0 = new THREE.Color(0xffe0c0), C_SUN1 = new THREE.Color(0xffa070);
  const fogDay = new THREE.Color(0x4a4038), fogNight = new THREE.Color(0x141c2a);
  // look tunables (DBG shots may override: shot.dbg.look)
  // review look: cool blue-grey shadow fill (dusk sky through every window) against the warm/coloured sun — the walls read as
  // lime-white in shadow, not brown; shafts keep their glass colours (white beam tint, 1/3 the cookie blur, wispier haze)
  const LOOK0 = { lancetI: 2.2, hemiI: 1.35, hemiSky: 0x6a7896, hemiGround: 0x6e5444, shaft: 0.13, bounce: 3.6, sun: 12.0,
    shaft55: 0.24, shaft56: 0.075, shaftCol: 0xffffff, shaftNoise: 0.85, shaftPen: 0.35, fog: 0x2c3242, fogD: 0.009, wall: 0xf2f0ea,
    pewRough: 0.5, pewEnv: 0.8, shaftSoft: 0.22, lancetSat: 0.84,   // glass hues softened (bible: P23–P27 −30 %, never neon)
    pewCol: 0xffffff, westFill: 0.32, blueKey: 0.6, rimWarm: 0.5, nightSky: 0x48587a,
    ...LOOK_URL };
  let LOOK = { ...LOOK0 };
  function daylight(k, { slide = 0 } = {}) {
    const s = 1 - smoothstep(0, 1, k);
    aimSun(sunDir(SUN_EL - slide * 3.5 * D2R, SUN_AZ + slide * 1.2 * D2R));
    sun.intensity = LOOK.sun * s * SUN_DIST * SUN_DIST; sun.color.copy(C_SUN0).lerp(C_SUN1, smoothstep(0, 0.8, k));
    shaft.update(ctx.T, { intensity: LOOK.shaft * s }); shaft.material.uniforms.uSeed.value = Math.round(ctx.T * 24) % 61; shaft.object3D.visible = s > 0.01 && shaftOn && !OFF.has('noshaft');
    shaft.material.uniforms.uCol.value.set(LOOK.shaftCol).lerp(new THREE.Color(0xff9a70), smoothstep(0, 0.8, k));
    shaft.material.uniforms.uSoft.value = LOOK.shaftSoft; shaft.material.uniforms.uNoiseAmt.value = LOOK.shaftNoise; shaft.material.uniforms.uLodK.value = shaft.userData.lodK0 * LOOK.shaftPen;
    plasterM.color.set(LOOK.wall); fog.density = LOOK.fogD; fogDay.set(LOOK.fog);
    pewM.roughness = LOOK.pewRough; pewM.envMapIntensity = LOOK.pewEnv; pewM.color.set(LOOK.pewCol);
    dustWide.object3D.visible = dustNear.object3D.visible = s > 0.01 && dustOn && !OFF.has('nodust');
    dustWide.material.uniforms.uInt.value = 2.2 * s; dustNear.material.uniforms.uInt.value = 2.0 * s;
    bounceA.intensity = LOOK.bounce * s;
    hemi.color.set(LOOK.hemiSky).lerp(new THREE.Color(LOOK.nightSky), k); hemi.groundColor.set(LOOK.hemiGround).lerp(new THREE.Color(0x221a18), k);
    hemi.intensity = lerp(LOOK.hemiI, 0.75, k);
    blueKey.intensity = LOOK.blueKey * smoothstep(0.3, 1, k); winGlow.intensity = 0.65 * smoothstep(0.4, 1, k);
    westFill.intensity = LOOK.westFill * s; westFill.visible = sun.visible && !OFF.has('nowest');   // switches with the sun (one recompile)
    for (const m of lancetMats) { m.uniforms.uInt.value = lerp(LOOK.lancetI, 0.35, smoothstep(0, 0.9, k)); m.uniforms.uTint.value.setRGB(1, 1, 1).lerp(new THREE.Color(0.55, 0.62, 1.0), smoothstep(0.3, 1, k)); m.uniforms.uHot.value = 0.7 * s; m.uniforms.uSun.value.copy(sunDir()); m.uniforms.uSat.value = LOOK.lancetSat; }
    for (const m of aisleMats) { m.uniforms.uInt.value = lerp(0.55, 0.22, k); m.uniforms.uTint.value.setRGB(1, 0.95, 0.92).lerp(new THREE.Color(0.55, 0.65, 1.0), k); }
    eastMat.uniforms.uInt.value = lerp(0.35, 0.16, k);
    louvreMat.color.setRGB(0.022, 0.026, 0.038).lerp(new THREE.Color(0.02, 0.03, 0.055), k);
    fog.color.copy(fogDay).lerp(fogNight, k);
    for (const m of [vaultM, beamM, galleryM]) m.emissiveIntensity = s;
  }

  // ================================================================ figures: poses (pure functions of time)
  const F = V3(1, 0, 0), RT = V3(0, 0, 1), UP = V3(0, 1, 0);   // facing east: forward +x, her right = +z (south)
  // MOTHER seated at the aisle end of row 7, letter held to her chest with both hands, head bowed
  function letterHold(fig, T, { rub = 0, grip = 0, lift = 0, yaw = 0.45, drop = 0, out = 0, press = false, fwd = null, right = null } = {}) {
    const ry = fig.root.rotation.y; fwd = fwd || V3(Math.sin(ry), 0, Math.cos(ry)); right = right || V3(-Math.cos(ry), 0, Math.sin(ry));
    const n = fig.worldPos('neck');
    // the letter pressed to the sternum, its face turned a little toward her right (so it shows past the right hand in
    // the S057 profile); both hands lie flat across it, fingers angled across the chest (never pointing up: no praying hands)
    const Lc = n.clone().addScaledVector(fwd, 0.118 - 0.02 * lift + out).addScaledVector(UP, -0.2 + 0.06 * lift).addScaledVector(right, 0.015);
    letter.position.copy(Lc);
    const zL = fwd.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(right, Math.sin(yaw)).addScaledVector(UP, 0.28).normalize(); // outward face
    const xL = UP.clone().cross(zL).normalize(), yL = zL.clone().cross(xL);     // xL → her left, yL ≈ up
    letter.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xL, yL, zL));
    letter.position.addScaledVector(zL, -0.004);
    if (press) {
      // S057 profile (review): both hands pressed flat on the letter against the sternum, fingers along her body's left/right
      // (not the letter's tilted axes, which pointed the right hand's fingers forward-up like a half prayer); the right hand
      // crosses the letter's lower half, its pale-blue top edge and fold show above the fingers
      const L0 = right.clone().negate();                                         // her left
      const wr = Lc.clone().addScaledVector(right, 0.075).addScaledVector(UP, -0.045 - drop).addScaledVector(fwd, 0.012);
      fig.reach('R', wr, { palm: fwd.clone().negate().addScaledVector(right, 0.25).normalize(), fingers: L0.clone().multiplyScalar(0.9).addScaledVector(UP, 0.3).addScaledVector(fwd, 0.12).normalize() });
      const wl = Lc.clone().addScaledVector(right, -0.08).addScaledVector(UP, -0.075 - drop).addScaledVector(fwd, -0.004);
      fig.reach('L', wl, { palm: fwd.clone().negate().addScaledVector(right, -0.25).normalize(), fingers: right.clone().multiplyScalar(0.9).addScaledVector(UP, 0.22).normalize() });
    } else {
    const wr = Lc.clone().addScaledVector(xL, -0.078).addScaledVector(yL, -0.085 - drop).addScaledVector(zL, 0.016);
    fig.reach('R', wr, { palm: zL.clone().negate().addScaledVector(xL, 0.15).normalize(), fingers: xL.clone().multiplyScalar(0.9).addScaledVector(yL, 0.28).normalize() });
    const wl = Lc.clone().addScaledVector(xL, 0.075).addScaledVector(yL, -0.11 - drop).addScaledVector(zL, 0.004);
    fig.reach('L', wl, { palm: zL.clone().negate().addScaledVector(xL, -0.15).normalize(), fingers: xL.clone().multiplyScalar(-0.9).addScaledVector(yL, 0.2).normalize() });
    }
    const hR = handPose('relaxed', { curl: 0.3 + 0.3 * grip }, fig.hands.R.dims), hL = handPose('relaxed', { curl: 0.36 + 0.3 * grip }, fig.hands.L.dims);
    hR.thumb = [0.2 + 0.14 * rub, 0.25 + 0.1 * rub, 0.08 + 0.22 * rub, 0.1 + 0.12 * rub, 0.2];
    fig.hands.R.setChannels(hR); fig.hands.L.setChannels(hL);
  }
  function seatMother(T, { tremble = 0, rub = 0, grip = 0, bow = 1, lift = 0, z = CH.motherZ, nod = 0, yaw, drop, out = 0, press = false } = {}) {
    M.root.position.set(ROW7 + 0.05, 0, z); M.root.rotation.set(0, Math.PI / 2, 0);
    M.pose('sit_chair', { seat: 0.447, feet: 0.03, lean: 0.04, hands: 'none' });
    M.pose({ 'armL.clav.y': 0.1, 'armR.clav.y': 0.1, 'neck.x': 0.26 * bow, 'head.x': 0.2 * bow, 'chest.x': 0.03 }, { add: true });
    M.breathe(T, 0.9, 0.22);
    if (tremble > 0) {
      M.tremble(T, tremble);
      // suppressed, irregular shoulder shudders on top of the library's slow heave (≈ 3–5 Hz bursts, ≤ 1 cm at the shoulder)
      const sh = (ph, sd) => 0.55 * noise1(T * 4.1 + ph, sd) + 0.3 * noise1(T * 7.3 + ph, sd + 1) + 0.15 * Math.sin(T * 11.0 + ph * 3);
      M.bone('armL.clav').rotateZ(0.075 * tremble * Math.max(-0.3, sh(0, 21)));
      M.bone('armR.clav').rotateZ(-0.075 * tremble * Math.max(-0.3, sh(0.37, 23)));
      M.bone('chest').rotateX(0.014 * tremble * noise1(T * 2.3, 25));
      M.root.updateMatrixWorld(true);
    }
    if (nod) M.bone('head').rotateX(nod);
    letterHold(M, T, { rub, grip, lift, yaw, drop, out, press });
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
  const show = (o) => { if (OFF.has('nofig')) o = { ...o, M: false, Lm: false }; M.root.visible = !!o.M; Lm.root.visible = !!o.Lm; letter.visible = !!o.M; cap.visible = !!o.Lm; bag.visible = o.bag ?? !!o.M; plate.visible = !!o.plate; };

  const dbgP = (label, p) => { if (!DBG) return; camera.updateMatrixWorld(); const v = p.clone().project(camera); console.warn('DBG', label, ((v.x + 1) / 2).toFixed(3), ((1 - v.y) / 2).toFixed(3), 'd', camera.position.distanceTo(p).toFixed(2)); };
  // camera from heading (deg: 0 = east, 90 = south) and pitch (deg, + up)
  const aim = (pos, hDeg, pDeg, mm) => {
    const h = hDeg * D2R, p = pDeg * D2R;
    cam.place(camera, pos, [pos[0] + Math.cos(h) * Math.cos(p), pos[1] + Math.sin(p), pos[2] + Math.sin(h) * Math.cos(p)]); cam.lens(camera, mm);
  };

  // ================================================================ the S055–S056 crane move (one continuous plate)
  const CR_T0 = 175.36, CR_T1 = 180.917;              // descent begins on '下' (175.36) … end of S056
  const crPts = [V3(-10.8, 9.0, -1.7), V3(-10.4, 8.4, -1.5), V3(-9.6, 6.6, -1.1), V3(-8.6, 4.4, -0.2), V3(-7.4, 2.5, 0.9), V3(-6.1, 1.5, 1.6), V3(-4.9, 1.34, 1.65), V3(-3.9, 1.31, 1.5), V3(-3.15, 1.30, 1.45)];
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
  // heading (deg, 0 = east, 90 = south) / pitch keys: open on the south lancet (frame right), pan ~40° left by the S055 cut,
  // reveal LONELY (row 7 wall end) while MOTHER is still out of frame left, he leaves frame right at 179.4, settle on her back
  const crHead = [[174.5, 122], [CR_T0, 122], [176.3, 113], [176.9, 99], [177.42, 78], [177.82, 72], [178.42, 50], [179.0, 30], [179.4, 18], [180.3, 2], [180.917, -3.5]];
  const crPitch = [[174.5, 3.5], [CR_T0, 3.5], [176.3, -9], [176.9, -21], [177.42, -34], [177.82, -31], [178.42, -22], [179.0, -12], [179.4, -9.5], [180.3, -8.5], [180.917, -9]];
  function crane(T) {
    const p = crCurve.getPointAt(crS(T));
    aim([p.x, p.y, p.z], spline1(crHead, T), spline1(crPitch, T), 32);
    if (DBG) console.warn('DBG crane', T.toFixed(2), p.toArray().map((x) => x.toFixed(2)).join(','), 'h', spline1(crHead, T).toFixed(1), 'p', spline1(crPitch, T).toFixed(1));
    return p;
  }

  // ================================================================ setups
  const POST_DAY = { exposure: 1.0, temp: 0.12, saturation: 1.0, contrast: 1.05 };
  const POST_NIGHT = { exposure: 1.3, temp: -0.16, saturation: 0.84, contrast: 1.04, shadowTint: [0.44, 0.49, 0.6], highTint: [0.56, 0.52, 0.46], bloom: { strength: 0.5, radius: 0.6, threshold: 0.8 } };
  const setups = {
    // ---- S055 BR2 174.58–177.42 '彩窗下': high at the west end, the south lancet blazing at frame right, shafts slanting
    //      down-left, dust only in the light; richest at 0.18 s; the crane descent (pan left) begins at 0.78 s ('下')
    S055(tl, u, T) {
      lightSet({ sun: true, bounce: true }); daylight(0); show({ M: true, Lm: true });
      seatMother(T); seatLonely(Lm, T);
      const swell = 1 + 0.15 * Math.exp(-(((tl - 0.18) / 0.35) ** 2));     // richest at 0.18 s ('彩窗下')
      shaft.update(T, { intensity: LOOK.shaft55 * swell * lerp(1, 0.3, smoothstep(0.25, 0.62, u)) });   // camera sinks into the beams: thinner veils
      crane(T);
      dbgP('lancetS top', V3(CH.west, CH.lancetSill + CH.lancetH, 3.6)); dbgP('lancetS mid', V3(CH.west, 9.5, 3.6));
      return { ...POST_DAY, dof: null, bloom: { strength: 0.5, radius: 0.65, threshold: 0.95 } };
    },
    // ---- S056 177.42–180.92 '光分成千万瓣': the crane continues to seated height over the pews, LONELY passes out of frame
    //      right (179.4), ends behind MOTHER's back at (0.45, 0.56); follow focus onto her back
    S056(tl, u, T) {
      lightSet({ sun: true, bounce: true, shaft: 'lo' }); daylight(0); show({ M: true, Lm: true });
      shaft.update(T, { intensity: LOOK.shaft56 * lerp(1, 1.4, smoothstep(1.5, 3.0, tl)) });   // continues S055's thinned veils, a touch more behind her
      seatMother(T); seatLonely(Lm, T);
      const p = crane(T);
      const back = M.worldPos('chest');
      const fd = Math.max(1.0, p.distanceTo(back));
      dbgP('mother back', back); dbgP('lonely', Lm.worldPos('chest'));
      const lk = smoothstep(0, 1.2, tl);                                      // continuous with S055 at the cut, then lifts the pew shadows
      return { ...POST_DAY, exposure: lerp(1.0, 1.12, lk), lift: [lerp(0.008, 0.014, lk), lerp(0.01, 0.015, lk), lerp(0.018, 0.022, lk)], dof: { focus: lerp(12, fd, smoothstep(0.8, 2.6, tl)), fstop: 4 } };
    },
    // ---- S057 BR2 180.92–182.92 '我听不懂你的祈祷': CU 100 mm locked, MOTHER's right profile at the left third facing right, eyes
    //      closed; soft foreground at right: the low window's bottom tier (the GLASSPANEL in situ) with the clear diamond quarry
    //      at (0.70, 0.45) holding the RESTORER's faint mirrored face (fades up 0–0.3 s, strongest ~15 % at 2 s); thumb rubs the
    //      fold at 1.0 s; lips move on '祷' (182.44 = 1.52 s) — a tiny jaw/head motion on a faceless sculpt
    S057(tl, u, T) {
      lightSet({ sun: true, bounce: true, fill: true, shaft: false, dust: false }); daylight(0); show({ M: true, Lm: false, plate: true, bag: false });
      bounceA.intensity = 1.3; skyFill.intensity = 0.5; skyFill.color.set(0xd9d2c8);   // soft skylight from the south aisle windows
      const rub = Math.sin(clamp((tl - 0.95) / 0.5) * Math.PI);
      const lips = Math.sin(clamp((tl - 1.5) / 0.32) * Math.PI) * 0.6 + Math.sin(clamp((tl - 1.62) / 0.22) * Math.PI) * 0.4;
      seatMother(T, { rub, lift: LOOK.letterLift ?? 1.95, bow: 1.15, nod: 0.012 * lips, yaw: LOOK.letterYaw ?? 0.62, drop: LOOK.letterDrop ?? 0.0, out: LOOK.letterOut ?? 0.045, press: true });
      const e = M.eye();
      const D = 3.5, W = D * 36 / 100, Hh = W / ctx.aspect;
      const cpos = V3(e.x + 0.2 * W, e.y - 0.06 * Hh, e.z + D);
      cam.place(camera, cpos, cpos.clone().add(V3(0, 0, -1))); cam.lens(camera, 100);
      // foreground plate (cheat, ruling 2): quarry centre at screen (0.70, 0.45), 2.95 m from the lens → CoC ≈ 5 px
      const dq = 2.95, Wq = dq * 36 / 100, Hq = Wq / ctx.aspect;
      const qW = cpos.clone().add(V3((0.70 - 0.5) * Wq, (0.5 - 0.45) * Hq, -dq));
      plate.position.copy(qW).sub(plate.userData.quarry.clone().multiplyScalar(PLATE_S)); plate.rotation.set(0, 0, 0);
      skyFill.position.set(e.x + 0.5, e.y + 0.25, e.z + 2.0);
      // the restorer's reflection: fades up with the light shift 0–0.3 s ('我听不懂' 180.94), strongest ~15 % by 2 s
      plate.userData.face.material.opacity = smoothstep(0.0, 0.32, tl) * (0.22 + 0.14 * smoothstep(0.3, 2.0, tl));
      renderReflection(T, Math.sin(tl * 0.9));
      { const fm = plate.userData.face; const big = OFF.has('faceq'); fm.scale.setScalar(big ? 3 : 1); fm.material.blending = big ? THREE.NormalBlending : THREE.AdditiveBlending; if (big) fm.material.opacity = 1; }
      plate.updateMatrixWorld(true); dbgP('eye', e); dbgP('letter', letter.position); dbgP('quarry', qW);
      for (const m of aisleMats) m.uniforms.uInt.value = 0.22;            // the north aisle window behind her head stays a soft glow
      return { ...POST_DAY, temp: 0.04, saturation: 0.95, dof: { focus: D, fstop: 2.8, maxCoc: 1.8 }, exposure: 1.05 };
    },
    // ---- S058 BR2 182.92–186.08 '却懂你颤抖的双肩': MCU 75 mm from her right rear 45°, slightly high, barely perceptible push;
    //      shoulder line at (0.66, 0.50) ~28→30 % of frame width (T19 A-frame for S059); tremble starts 0.85 s ('颤抖'), peaks
    //      2.2 s ('肩'), real time; fingers tighten, thumb rubs the fold; 2.2–2.9 s the petals slide off and fade (the sun drops),
    //      blue hour (P03) comes in; two tiny candle points ahead of her at (0.52, 0.38)
    S058(tl, u, T) {
      const k = smoothstep(2.15, 2.95, tl);                                   // last sun → blue hour (petals gone by 2.9 s)
      lightSet({ sun: k < 0.999, bounce: true, night: k > 0.01, win: false, candles: false, shaft: false, dust: false }); daylight(k, { slide: smoothstep(2.0, 3.0, tl) });
      show({ M: true, Lm: false });
      rimWarm.visible = k > 0.01 && !OFF.has('norim'); rimWarm.intensity = LOOK.rimWarm * smoothstep(0.05, 1, k);   // same switch frame as the night set (one recompile)
      // camera reference from the untrembled pose at the head of the shot (the camera must not shake with her shoulders)
      seatMother(T - tl, { bow: 1.08 });
      const S = M.worldPos('armL.upper').lerp(M.worldPos('armR.upper'), 0.5);
      // tremble: starts on '颤抖' (183.76 = 0.84 s), most visible on '肩' (185.14 = 2.22 s), real time, small and irregular
      const tr = smoothstep(0.8, 1.15, tl) * (0.55 + 0.6 * Math.exp(-(((tl - 2.22) / 0.55) ** 2))) * (1 - 0.6 * smoothstep(2.9, 3.4, tl)) * (0.85 + 0.3 * noise1(tl * 3.1, 7));
      const grip = smoothstep(0.9, 1.6, tl) * (1 - 0.3 * smoothstep(2.6, 3.2, tl));
      const rub = 0.5 + 0.5 * Math.sin(tl * 5.2) * smoothstep(1.0, 1.5, tl);
      seatMother(T, { tremble: 1.35 * tr, grip, rub, bow: 1.08 });
      // right rear 45°, slightly high, 75 mm; barely perceptible push (12 cm) so the shoulders go 28 % → 30 % of frame width;
      // shoulders at (0.66, 0.53) with the bowed head in frame (T19 register with S059's bent back)
      const push = 0.12 * ease.inOutSine(clamp(tl / 3.17));
      const dir = V3(-0.707, 0, 0.707), D = 2.45 - push;
      const cpos = S.clone().addScaledVector(dir, D).add(V3(0, 0.17, 0));
      const W = D * 36 / 75, Hh = W / ctx.aspect, side = V3(0.707, 0, 0.707);   // screen-right direction for this view
      const tgt = S.clone().addScaledVector(side, -(0.66 - 0.5) * W).add(V3(0, 0.12 * Hh, 0));
      cam.place(camera, cpos, tgt); cam.lens(camera, 75);
      dbgP('shoulderL', M.worldPos('armL.upper')); dbgP('shoulderR', M.worldPos('armR.upper')); dbgP('head', M.worldPos('head')); dbgP('candle', candles[1].object3D.position.clone().add(V3(0, 0.12, 0)));
      return { ...POST_DAY, temp: lerp(0.08, -0.14, k), saturation: lerp(0.98, 0.84, k), exposure: lerp(1.0, 1.3, k), dof: { focus: cpos.distanceTo(S), fstop: 2.4 } };
    },
    // ---- S069 CH4 217.71–219.71 '不过无数个今晚': MS 50 mm, eye level, locked with a ≤2 % push; blue hour, candles; opens on
    //      her last step along row 7 (T21: left → right, downward), she sits beside LONELY at 0.81 s ('数'), his hands loosen
    //      at 1.1 s; holds on the two sleeves side by side at (0.42, 0.62) = A-frame of the 12-frame dissolve into S070
    S069(tl, u, T) {
      lightSet({ sun: false, bounce: false, night: true, candles: [2] }); daylight(1);
      show({ M: true, Lm: true, bag: false });
      const t = clamp(tl, 0, 3);
      // the last step along row 7 in the legroom (facing south, +z = screen left → right), turn to face east, sit down
      // (seated contact on '数' 218.52 = 0.81 s); his hands loosen on the cap at 1.1 s; 1.53–2.0 s stillness on the sleeves
      const zSeat = CH.lonelyZ - 0.42, xWalk = ROW7 + 0.44, xSeat = ROW7 + 0.05;
      const walkT = clamp(t / 0.6), sitT = ease.inOutSine(clamp((t - 0.3) / 0.51)), turnT = ease.inOutSine(clamp((t - 0.14) / 0.6));
      const zz = lerp(zSeat - 0.28, zSeat, ease.outSine(walkT));
      M.root.position.set(lerp(xWalk, xSeat, sitT), 0, zz); M.root.rotation.set(0, lerp(0, Math.PI / 2, turnT), 0);
      const chW = M.preset('walk', { phase: 0.3 + 0.45 * walkT, stride: lerp(0.7, 0.15, walkT) }), chS = M.preset('sit_chair', { seat: 0.447, feet: 0.03, lean: 0.06, hands: 'none' });
      M.pose(Figure_blend(chW, chS, sitT));
      M.pose({ 'armL.clav.y': 0.08, 'armR.clav.y': 0.08, 'neck.x': lerp(0.12, 0.2, sitT), 'head.x': lerp(0.05, 0.12, sitT) }, { add: true });
      M.breathe(T, 0.8, 0.22);
      letterHold(M, T, { grip: 0.3 });
      M.lookAt(V3(12, 1.2, zSeat - 0.3), 0.4 * sitT);
      seatLonely(Lm, T, { loosen: smoothstep(1.02, 1.5, t) });
      // camera: rear three-quarter from the aisle side behind row 8, a little above seated eye level, locked with a ≤2 % push;
      // the two sleeves' contact (her right short sleeve / his left cotton sleeve) registered at (0.42, 0.62) for the S070 dissolve
      const Cw = V3(ROW7 + 0.02, 0.98, (zSeat + CH.lonelyZ) / 2);
      const cpos = V3(-5.2, 1.36, 4.12).lerp(Cw, 0.015 * ease.inOutSine(clamp(t / 2.0)));
      const fwd = Cw.clone().sub(cpos), D = fwd.length(); fwd.normalize();
      const right = V3(-fwd.z, 0, fwd.x).normalize(), W = D * 36 / 50, Hh = W / ctx.aspect;
      const tgt = Cw.clone().addScaledVector(right, (0.5 - 0.42) * W).add(V3(0, (0.62 - 0.5) * Hh, 0));
      cam.place(camera, cpos, tgt); cam.lens(camera, 50);
      dbgP('contact', Cw); dbgP('sleeveM', M.worldPos('armR.lower')); dbgP('sleeveL', Lm.worldPos('armL.lower')); dbgP('lonely', Lm.worldPos('chest')); dbgP('mother', M.worldPos('chest')); dbgP('candle S', candles[candles.length - 1].object3D.position.clone().add(V3(0, 0.12, 0)));
      return { ...POST_NIGHT, dof: { focus: D, fstop: 3.2 } };
    },
    // ---- view_chapel (corridor pane P4, S066): the mother on the pew from her right rear, residual coloured light at blue
    //      hour, shoulders trembling softly; self-contained, reads at 480–640 px
    view_chapel(tl, u, T, shot) {
      // the last of the sun: residual petals on her shoulders, blue hour coming in; she trembles softly, breathes
      const k = 0.5;
      lightSet({ sun: true, bounce: true, night: true, win: false, candles: false, shaft: false, dust: false }); daylight(k, { slide: 0.06 });
      show({ M: true, Lm: false, bag: false });
      bounceA.intensity *= 0.35;   // review: the under-floor bounce lit the north block's aisle-end panel into a pale defocused block at lower left
      seatMother(0, { bow: 1.06 });                                            // stable camera reference (no tremble)
      const S = M.worldPos('armL.upper').lerp(M.worldPos('armR.upper'), 0.5);
      const tr = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(T * 0.83)) * (0.8 + 0.2 * noise1(T * 1.7, 3));
      seatMother(T, { tremble: tr, grip: 0.5, rub: 0.5 + 0.5 * Math.sin(T * 4.1), bow: 1.06 });
      // right rear ~40°, slightly high; fixed vertical FOV so the framing holds for any pane aspect (nested renders set it)
      const dir = V3(-0.62, 0, 0.78).normalize(), D = 2.65 + 0.04 * Math.sin(T * 0.21);
      const cpos = S.clone().addScaledVector(dir, D).add(V3(0, 0.28, 0));
      cam.place(camera, cpos, S.clone().add(V3(0.02, 0.04, -0.02)));
      camera.fov = 16; camera.updateProjectionMatrix();
      return { ...POST_NIGHT, exposure: 1.15, dof: { focus: D, fstop: 3.5 } };
    },
    default(tl, u, T) { lightSet(); daylight(0); show({ M: true, Lm: true }); seatMother(T); seatLonely(Lm, T); crane(T); return { ...POST_DAY }; },
  };
  // debug views (out/check/chapel/dbg_shots.json): shot.dbg = { pos, target, mm, k, fig }
  const dbgPlane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: sun.map, side: THREE.DoubleSide })); dbgPlane.position.set(0, 3, 0); dbgPlane.visible = false; scene.add(dbgPlane);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshLambertMaterial({ color: 0xffffff })); tp.position.set(-2.05, 1.05, 1.28); tp.lookAt(tp.position.clone().sub(sunDir())); tp.visible = false; scene.add(tp);
  setups.DBG = (tl, u, T, shot) => {
    const d = shot.dbg || {}; LOOK = { ...LOOK0, ...(d.look || {}) }; lightSet({ sun: (d.k ?? 0) < 1, night: (d.k ?? 0) > 0.5, candles: (d.k ?? 0) > 0.5 }); dbgPlane.visible = !!d.map; if (d.map) console.warn('DBG sun', sun.intensity, sun.visible, sun.castShadow, sun.angle, sun.position.toArray().map((x) => x.toFixed(2)).join(','), sun.map && sun.map.image.width); daylight(d.k ?? 0); show({ M: true, Lm: true, plate: !!d.plate });
    seatMother(T); seatLonely(Lm, T); console.warn('DBG after', sun.intensity, sun.visible, sun.castShadow, sun.color.getHexString(), sun.map && sun.map.uuid);
    if (d.test === 1) { sun.position.set(-2, 10, 1.25); sun.target.position.set(-1.9, 0, 1.25); sun.target.updateMatrixWorld(); sun.angle = 0.6; sun.intensity = 300; }
    if (d.test === 2) { sun.intensity = 300 * 70 * 70; }
    if (d.test === 3) { tp.visible = true; } else tp.visible = false;
    if (d.h !== undefined) aim(d.pos, d.h, d.p || 0, d.mm || 32);
    else { cam.place(camera, d.pos || [-6, 4, 2], d.target || [0, 0.5, 1]); cam.lens(camera, d.mm || 24); }
    return { ...POST_DAY, dof: null, ...(d.post || {}) };
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
      LOOK = LOOK0;
      for (const c of candles) c.update(T);
      const r = (setups[shot.dbg ? 'DBG' : shot.id] || setups.default)(tl, u, T, shot) || {};
      if (DBG && LOOK_URL.ray) { camera.updateMatrixWorld(); scene.updateMatrixWorld(true); const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(LOOK_URL.ray[0] * 2 - 1, 1 - LOOK_URL.ray[1] * 2), camera);
        const hits = rc.intersectObjects(scene.children, true).filter((h) => h.object.visible && h.object.isMesh && !h.object.isSkinnedMesh).slice(0, 3);
        console.warn('DBG ray', hits.map((h) => `${h.object.name || h.object.type}:${h.object.material && h.object.material.type} d=${h.distance.toFixed(2)} p=${h.point.toArray().map((v) => v.toFixed(2)).join(',')} n=${h.face && h.face.normal.toArray().map((v) => v.toFixed(2)).join(',')}`).join(' | ')); }
      if (OFF.has('nodof')) r.dof = null;
      if (LOOK0.post && LOOK0.post[shot.id]) Object.assign(r, LOOK0.post[shot.id]);   // look-dev overrides (?chlook=)
      const d = r.dof;
      dustWide.update(T, { camera, focus: d ? d.focus : null, fstop: d ? d.fstop : 8 });
      dustNear.update(T, { camera, focus: d ? d.focus : null, fstop: d ? d.fstop : 8 });
      return r;
    },
  };
}
