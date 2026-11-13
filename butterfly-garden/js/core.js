/* The Butterfly Garden — core: timeline, maths, assets, pre-rendered textures.
   Everything is a pure function of time t (seconds) so any frame can be rendered in any order. */
'use strict';

const W = 1920, H = 1080, FPS = 30;
const QS = new URLSearchParams(location.search);
const ARTIST = (QS.get('name') || '').slice(0, 24);

// ------------------------------------------------------------------ STORY TIMELINE (seconds)
// Music runs at 120 BPM (1 bar = 2 s), so scene boundaries sit on bar lines.
const C = {
  // 0 · the real drawing comes alive
  starA: 1.4, starB: 3.4,
  lift: { tree: 3.7, butterfly: 4.1, police: 4.5, iceman: 4.9, icewall: 5.3, dino: 5.7 },
  title: 6.0, diveA: 8.3, world: 10.0,
  // 1 · butterfly garden
  gardenA: 10.0, gardenB: 26.0, land: 23.0,
  // 2 · uh-oh … the dinosaur
  uhoh: 26.0, darkA: 26.6, darkB: 30.0,
  stomps: [26.8, 27.8, 28.8, 29.6, 30.4, 31.2, 32.0],
  walkA: 28.4, walkB: 32.0, lightning: 33.0, roarA: 34.0, roarB: 36.6,
  // 3 · fire!
  inhale1: [38.0, 39.4], fire1: [39.5, 44.0], huff: [44.6, 46.8],
  // 4 · Ice Man & the ice wall
  iceA: 47.6, skateA: 48.3, skateB: 50.8, heroA: 51.0, heroB: 53.0,
  inhale2: [52.6, 53.8], slam: 53.3, wallA: 53.35, wallRow: 0.08, fire2: [53.85, 60.4],
  // 5 · police car & the ice net
  sirenA: 61.4, carA: 62.2, carB: 64.4, turret: 65.4, aim: [66.0, 66.8],
  count: [67.6, 68.4, 69.2], fire3: [68.4, 74.6], launch: 70.0, netOpen: 72.5, netLand: 73.4,
  fizzle: [73.6, 74.7], smokeRing: 75.2,
  // 6 · the dinosaur cries & surrenders
  cryA: 80.0, flag: 84.2, sorry: 85.0, comfort: [86.6, 89.0], blush: 89.0, tearsEnd: 88.8, sunBack: 91.0,
  // 7 · hooray!
  partyA: 94.0, flyToCam: 108.4,
  // 8 · back into the drawing
  outroA: 112.0, theEnd: 114.2, fadeOut: 120.4, END: 122.0,
};
const DUR = C.END;

// ------------------------------------------------------------------ MATHS
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, p) => a + (b - a) * p;
const inv = (a, b, x) => clamp((x - a) / (b - a));            // progress of x through [a,b]
const mixv = (a, b, p) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * p) : a + (b - a) * p);
const TAU = Math.PI * 2;
const E = {
  lin: p => p,
  io: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  in: p => p * p * p,
  out: p => 1 - Math.pow(1 - p, 3),
  sine: p => 0.5 - 0.5 * Math.cos(Math.PI * p),
  back: p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  elastic: p => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -9 * p) * Math.sin((p * 9 - 0.75) * TAU / 3) + 1),
  bounce: p => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  },
};
// deterministic hash noise
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
function hash2(a, b) { return hash(a * 17.17 + b * 91.31); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// keyframes: [[t, value, easeName?], …] (ease applies to the segment ending at that key)
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      return mixv(v0, v1, E[e || 'io']((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}
// smooth Catmull-Rom flight path: [[t, x, y], …]
function path(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  if (t >= keys[n - 1][0]) return [keys[n - 1][1], keys[n - 1][2]];
  let i = 0; while (keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(i - 1, 0)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(i + 2, n - 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
}
// envelope: 0 before a, rises over `rin`, holds, falls over `rout` ending at b
function env(t, a, b, rin = 0.3, rout = 0.3) { return Math.min(inv(a, a + rin, t), 1 - inv(b - rout, b, t)); }
// one-shot pop: 0→1 with elastic overshoot starting at t0
function pop(t, t0, d = 0.6, e = 'elastic') { return t < t0 ? 0 : E[e](clamp((t - t0) / d)); }

// ------------------------------------------------------------------ CANVAS HELPERS
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function tint(src, color, alpha = 1) {            // same silhouette, filled with colour
  const c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function blurred(src, px, color = '#000', pad = 40) {   // soft shadow / glow of a silhouette
  const c = mk(src.width + pad * 2, src.height + pad * 2), g = c.getContext('2d');
  g.filter = `blur(${px}px)`; g.drawImage(tint(src, color), pad, pad); g.filter = 'none';
  c.pad = pad; return c;
}
function radial(r, stops) {
  const c = mk(r * 2, r * 2), g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
}
// wobbly crayon line through points (drawn 3x with jitter, like a real crayon)
function crayon(g, pts, color, width, seed = 1, alpha = 1, closed = false) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  for (let pass = 0; pass < 3; pass++) {
    g.globalAlpha = alpha * (pass === 0 ? 0.9 : 0.45);
    g.lineWidth = width * (pass === 0 ? 1 : 0.55);
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const j = (hash2(seed + pass * 13, i) - 0.5) * width * 0.5, k = (hash2(seed + pass * 7, i + 99) - 0.5) * width * 0.5;
      const x = pts[i][0] + j, y = pts[i][1] + k;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    if (closed) g.closePath();
    g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ ASSETS
const IMG = {};
const S = {};        // prepared sprites: {c: canvas, w, h, ox, oy, sh: shadow}
const TEX = {};      // textures & particle stamps
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; });
}
async function loadAll() {
  const names = ['dino', 'dino_raw', 'tree_raw', 'butterfly_raw', 'icewall', 'butterfly', 'bfly_left', 'bfly_right', 'bfly_body', 'tree', 'iceman_body', 'iceman_wand',
    'police', 'fire_fill', 'fire_lines', 'flower_pink', 'flower_red', 'flower_orange', 'flower_orange2', 'heart', 'heart2'];
  await Promise.all([
    ...names.map(n => loadImage(`assets/${n}.png`).then(i => (IMG[n] = i))),
    ...['page', 'page_blank', 'photo'].map(n => loadImage(`assets/${n}.jpg`).then(i => (IMG[n] = i))),
  ]);
  const ff = [new FontFace('Chewy', 'url(assets/fonts/chewy.woff2)'), new FontFace('Fredoka', 'url(assets/fonts/fredoka.woff2)', { weight: '600' })];
  await Promise.all(ff.map(f => f.load().then(x => document.fonts.add(x))));
  prepare();
}

// local anchors inside each sprite (pixels in the sprite image)
const A = {
  dino: { foot: [365, 838], pivot: [650, 170], eye: [732, 100], nostril: [882, 150], blush: [792, 136], claw: [584, 452],
    mouth: [898, 205], cut: [[640, 168], [665, 181], [761, 174], [896, 172]],
    head: [[630, 0], [1008, 0], [1008, 176], [761, 174], [665, 181], [640, 168], [630, 140]] },
  wall: { base: [134, 820], top: 26, rows: 11 },
  bfly: { c: [220, 210], hl: 190, hr: 252 },
  ice: { foot: [140, 240], pivot: [103, 178], tip: [48, 18], face: [138, 46] },
  car: { base: [170, 188], siren: [134, 38], wheels: [[103, 152], [222, 149]], wr: 25, turret: [92, 60] },
  tree: { base: [222, 578] },
  fire: { o: [8, 88] },
};

function prepare() {
  const man = window.SPRITES;
  for (const n in IMG) {
    if (!man[n]) continue;
    const c = mk(IMG[n].width, IMG[n].height); c.getContext('2d').drawImage(IMG[n], 0, 0);
    S[n] = { c, w: c.width, h: c.height, ox: man[n].x, oy: man[n].y };
  }
  for (const n of ['dino', 'icewall', 'butterfly', 'tree', 'police', 'bfly_left', 'bfly_right', 'bfly_body']) S[n].sh = blurred(S[n].c, 9, '#1a0f2e', 30);
  S.iceman_body.sh = blurred(S.iceman_body.c, 7, '#1a0f2e', 30);

  // dinosaur split into body + head (so the jaw can open), plus scary / frozen tints
  const d = S.dino.c;
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const body = mk(d.width, d.height), bg = body.getContext('2d');
  bg.drawImage(d, 0, 0); bg.globalCompositeOperation = 'destination-out'; poly(bg, A.dino.head); bg.fill();
  const head = mk(d.width, d.height), hg = head.getContext('2d');
  poly(hg, A.dino.head); hg.clip(); hg.drawImage(d, 0, 0);
  S.dinoBody = body; S.dinoHead = head;
  S.dinoBodyDark = tint(body, '#1d0b2b', 0.88); S.dinoHeadDark = tint(head, '#1d0b2b', 0.88);
  S.dinoBodyIce = tint(body, '#9fe6ff', 0.45); S.dinoHeadIce = tint(head, '#9fe6ff', 0.45);

  // fire: her red flame outlines over a hot gradient fill
  const ff = S.fire_fill.c, fc = mk(ff.width, ff.height), fg = fc.getContext('2d');
  fg.drawImage(ff, 0, 0); fg.globalCompositeOperation = 'source-atop';
  const gr = fg.createLinearGradient(0, 0, ff.width, 0);
  gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.25, '#ffd23a'); gr.addColorStop(0.6, '#ff8a1c'); gr.addColorStop(1, '#ff3b1c');
  fg.fillStyle = gr; fg.fillRect(0, 0, ff.width, ff.height);
  fg.globalCompositeOperation = 'source-over'; fg.drawImage(S.fire_lines.c, 0, 0);
  S.fire = fc; S.fireGlow = blurred(fc, 14, '#ff7a00', 40);

  // ice wall glow + frozen highlights
  S.wallGlow = blurred(S.icewall.c, 26, '#7fdcff', 60);
  S.treeHaze = tint(S.tree.c, '#cfe9ff', 0.42);
  S.treeDry = tint(S.tree.c, '#6b4a2a', 0.25);
  S.policeGlow = blurred(S.police.c, 16, '#ffffff', 40);
  S.iceGlow = blurred(S.iceman_body.c, 18, '#8fe8ff', 40);

  // particle stamps
  TEX.dotW = radial(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  TEX.dotY = radial(64, [[0, 'rgba(255,250,210,1)'], [0.35, 'rgba(255,200,60,0.75)'], [1, 'rgba(255,120,0,0)']]);
  TEX.dotO = radial(64, [[0, 'rgba(255,190,80,1)'], [0.4, 'rgba(255,110,20,0.65)'], [1, 'rgba(220,40,0,0)']]);
  TEX.dotR = radial(64, [[0, 'rgba(255,90,40,0.9)'], [0.45, 'rgba(200,30,10,0.45)'], [1, 'rgba(120,0,0,0)']]);
  TEX.dotC = radial(64, [[0, 'rgba(235,255,255,1)'], [0.35, 'rgba(140,225,255,0.65)'], [1, 'rgba(60,160,255,0)']]);
  TEX.dotP = radial(64, [[0, 'rgba(255,235,250,1)'], [0.35, 'rgba(255,140,210,0.6)'], [1, 'rgba(255,80,180,0)']]);
  TEX.smoke = radial(64, [[0, 'rgba(90,80,100,0.55)'], [0.6, 'rgba(90,80,100,0.25)'], [1, 'rgba(90,80,100,0)']]);
  TEX.steam = radial(64, [[0, 'rgba(255,255,255,0.85)'], [0.55, 'rgba(235,248,255,0.45)'], [1, 'rgba(235,248,255,0)']]);
  TEX.dust = radial(64, [[0, 'rgba(214,190,150,0.7)'], [0.6, 'rgba(214,190,150,0.3)'], [1, 'rgba(214,190,150,0)']]);
  TEX.star = {};
  for (const [k, col] of Object.entries({ w: '#ffffff', y: '#fff0a0', c: '#bff4ff', p: '#ffc4ee' })) TEX.star[k] = makeStar(col);
  TEX.flake = makeFlake();
  TEX.tear = makeTear();

  // textures
  TEX.crayon = makeCrayonTile(256, 1);
  TEX.grain = makeGrain();
  TEX.vignette = makeVignette();
  TEX.clouds = [0, 1, 2, 3].map(i => makeCloud(520 + i * 60, 210 + (i % 2) * 40, 11 + i, ['#ffffff', '#eaf4ff'], '#c7dcf5'));
  TEX.storm = [0, 1, 2, 3].map(i => makeCloud(760 + i * 80, 300 + (i % 2) * 50, 51 + i, ['#6c5a8e', '#3e2f5c'], '#2a1f40'));
  TEX.sun = makeSun();
}

function makeStar(col) {
  const r = 48, c = mk(r * 2, r * 2), g = c.getContext('2d');
  g.drawImage(radial(r, [[0, col], [0.25, col + '88'], [1, col + '00']]), 0, 0);
  g.translate(r, r); g.fillStyle = col;
  for (const [a, l, w] of [[0, r, 5], [Math.PI / 2, r, 5], [Math.PI / 4, r * 0.55, 3], [-Math.PI / 4, r * 0.55, 3]]) {
    g.save(); g.rotate(a); g.beginPath(); g.moveTo(-l, 0); g.quadraticCurveTo(0, -w, l, 0); g.quadraticCurveTo(0, w, -l, 0); g.fill(); g.restore();
  }
  return c;
}
function makeFlake() {
  const c = mk(64, 64), g = c.getContext('2d'); g.translate(32, 32); g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  g.drawImage(radial(30, [[0, 'rgba(200,240,255,0.7)'], [1, 'rgba(200,240,255,0)']]), -30, -30);
  for (let i = 0; i < 6; i++) {
    g.save(); g.rotate(i * Math.PI / 3); g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.stroke();
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -14); g.lineTo(-7, -20); g.moveTo(0, -14); g.lineTo(7, -20); g.stroke(); g.restore();
  }
  return c;
}
function makeTear() {
  const c = mk(60, 84), g = c.getContext('2d');
  g.beginPath(); g.moveTo(30, 4); g.bezierCurveTo(44, 30, 56, 46, 56, 58); g.arc(30, 58, 26, 0, Math.PI); g.bezierCurveTo(4, 46, 16, 30, 30, 4);
  const gr = g.createLinearGradient(0, 0, 60, 84); gr.addColorStop(0, '#d8f6ff'); gr.addColorStop(0.5, '#5cc8ff'); gr.addColorStop(1, '#2a7fe0');
  g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = '#1f5fb8'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(22, 52, 6, 10, -0.4, 0, TAU); g.fill();
  return c;
}
function makeCrayonTile(n, seed) {
  const c = mk(n, n), g = c.getContext('2d'), r = rng(seed);
  g.lineCap = 'round';
  for (let i = 0; i < 1500; i++) {
    const x = r() * n, y = r() * n, a = 1.0 + (r() - 0.5) * 0.5, l = 5 + r() * 16;
    const light = r() < 0.55;
    g.strokeStyle = light ? `rgba(255,255,255,${0.05 + r() * 0.12})` : `rgba(0,0,0,${0.03 + r() * 0.07})`;
    g.lineWidth = 0.8 + r() * 1.6;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  return c;
}
function makeGrain() {
  const w = 960, h = 540, c = mk(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), r = rng(7);
  for (let i = 0; i < w * h; i++) {
    const v = 236 + r() * 19 + (r() < 0.02 ? -25 : 0);
    id.data[i * 4] = v; id.data[i * 4 + 1] = v - 2; id.data[i * 4 + 2] = v - 6; id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const big = mk(W, H), bg = big.getContext('2d'); bg.imageSmoothingEnabled = true; bg.drawImage(c, 0, 0, W, H);
  return big;
}
function makeVignette() {
  const c = mk(W, H), g = c.getContext('2d'), gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  gr.addColorStop(0, 'rgba(20,8,40,0)'); gr.addColorStop(1, 'rgba(20,8,40,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return c;
}
function makeCloud(w, h, seed, cols, edge) {
  const c = mk(w + 40, h + 40), g = c.getContext('2d'), r = rng(seed);
  const blobs = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), rr = h * (0.28 + 0.22 * Math.sin(Math.PI * u)) * (0.85 + r() * 0.3);
    blobs.push([20 + rr + u * (w - 2 * rr), 20 + h - rr - h * 0.12 * Math.sin(Math.PI * u) * r(), rr]);
  }
  blobs.push([20 + w * 0.5, 20 + h * 0.75, h * 0.3]);
  const fill = (dx, dy, style) => { g.fillStyle = style; g.beginPath(); blobs.forEach(([x, y, rr]) => { g.moveTo(x + dx + rr, y + dy); g.arc(x + dx, y + dy, rr, 0, TAU); }); g.fill(); };
  fill(0, 6, edge);
  const gr = g.createLinearGradient(0, 0, 0, h + 40); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
  fill(0, 0, gr);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = g.createPattern(TEX.crayon || makeCrayonTile(256, 1), 'repeat'); g.fillRect(0, 0, c.width, c.height);
  return c;
}
function makeSun() {
  const R = 120, c = mk(R * 2 + 20, R * 2 + 20), g = c.getContext('2d'), o = R + 10;
  const gr = g.createRadialGradient(o - 30, o - 30, 10, o, o, R);
  gr.addColorStop(0, '#fff7b0'); gr.addColorStop(0.7, '#ffd84a'); gr.addColorStop(1, '#ffb52e');
  g.fillStyle = gr; g.beginPath(); g.arc(o, o, R, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = g.createPattern(TEX.crayon, 'repeat'); g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; ring.push([o + Math.cos(a) * R, o + Math.sin(a) * R]); }
  crayon(g, ring, '#f08a1c', 7, 3);
  // happy face
  g.fillStyle = '#5a3218';
  g.beginPath(); g.ellipse(o - 38, o - 18, 9, 14, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(o + 38, o - 18, 9, 14, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(o - 35, o - 23, 4, 0, TAU); g.arc(o + 41, o - 23, 4, 0, TAU); g.fill();
  const smile = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.15 + 0.7 * i / 16); smile.push([o + Math.cos(a) * 46, o + 6 + Math.sin(a) * 34]); }
  crayon(g, smile, '#5a3218', 7, 5);
  g.fillStyle = 'rgba(255,110,140,0.55)'; g.beginPath(); g.ellipse(o - 66, o + 18, 20, 11, 0, 0, TAU); g.ellipse(o + 66, o + 18, 20, 11, 0, 0, TAU); g.fill();
  return c;
}
