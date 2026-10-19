'use strict';
// AgilFence image flow: a picture-led deck for an airport audience, AgilFence features only.
// Every hero picture is a stand-in (rendered scene or V11 AgilFence frame crop) with a corner tag
// and a caption; speaker notes name the real source to swap in. Slides 6, 7, 11 and 12 carry
// native, editable diagrams (shapes and text). No assistant features, no lavender, anywhere:
// finalize() fails the build if they appear in the slide XML.
//
//   node build_deck.js <assetsDir> <out.pptx>
const fs = require('fs');
const path = require('path');
const req = require('module').createRequire(path.join(__dirname, '../cag-pitch-deck/package.json'));
const pptxgen = req('pptxgenjs');
const JSZip = req(req.resolve('jszip', { paths: [req.resolve('pptxgenjs')] }));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const sharp = req('sharp');
const Lu = req('react-icons/lu');

const ASSETS = path.resolve(process.argv[2] || 'assets');
const OUT = path.resolve(process.argv[3] || 'dist/AgilFence_Image_Flow.pptx');
const A = f => path.join(ASSETS, f);
const ARIAL = JSON.parse(fs.readFileSync(path.join(__dirname, '../cag-pitch-deck/arial-widths.json'), 'utf8'));

// ---------- theme: deck v2 navy, amber as the AgilFence accent (accent1) ----------
const THEME = {
  name: 'AgilFence Night',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '05070D', lt1: 'FFFFFF', dk2: '0E1628', lt2: 'A9B4C8',
    accent1: 'D4B741', accent2: '4D8DFF', accent3: 'D72D30', accent4: '4DAFBE', accent5: '2ED47A', accent6: '6F86B3',
    hlink: '8FB4FF', folHlink: 'D4B741',
  },
};
const HEX = { amber: 'D4B741', blue: '4D8DFF', red: 'D72D30', teal: '4DAFBE', green: '2ED47A', slate: '6F86B3', white: 'FFFFFF', muted: 'A9B4C8', navy: '05070D', card: '0E1628' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'AgilFence on the airfield perimeter';
pres.subject = 'From a touch on the fence to a confirmed response: AgilFence feature by feature';
pres.author = 'ST Engineering, Smart Security &amp; Automation';
pres.company = 'ST Engineering';

const C = pres.SchemeColor;
const NAVY = C.background1, CARD = C.background2, INK = C.text1, MUTED = C.text2;
const AMBER = C.accent1, BLUE = C.accent2, RED = C.accent3, TEAL = C.accent4, GREEN = C.accent5, SLATE = C.accent6;
const RR = pres.shapes.ROUNDED_RECTANGLE, RECT = pres.shapes.RECTANGLE, OVAL = pres.shapes.OVAL, LINE = pres.shapes.LINE;
const SW = 13.333, SH = 7.5, MX = 0.6, RX = SW - MX, CW = SW - 2 * MX;
const TS = { display: 72, section: 52, title: 36, scene: 32, lead: 20, body: 16, small: 14, micro: 12 };
const SEC = { open: 'Opening', sense: 'Sensing the fence', respond: 'Alarm to response', trust: 'Trust and next steps', appx: 'Appendix' };
const TAG = 'STAND-IN · REPLACE WITH APPROVED PHOTO';
const DECK_DATE = 'October 2026';

// ---------- measuring (Arial metrics via Liberation Sans) ----------
function tw(str, pt, bold, cs = 0) {
  const t = ARIAL[bold ? 700 : 400]; let w = 0;
  for (const ch of String(str)) w += t[ch] ?? 0.556;
  return (w * pt + cs * String(str).length) / 72;
}
function nlines(str, pt, bold, w, cs = 0) {
  let n = 0;
  for (const para of String(str).split('\n')) {
    let cur = '', k = 1;
    for (const word of para.split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (tw(t, pt, bold, cs) > w && cur) { k++; cur = word; } else cur = t;
    }
    n += k;
  }
  return n;
}
const WARN = [];
function fit(id, str, pt, bold, w, h, ls = 1.17, cs = 0) {
  const n = nlines(str, pt, bold, w, cs), need = n * pt * ls / 72;
  if (need > h + 0.02) WARN.push(`${id}: needs ${need.toFixed(2)}in (${n} lines) in ${h.toFixed(2)}in`);
  return n;
}
function sizeFor(str, sizes, bold, w, h, ls = 1.17, cs = 0) {
  for (const pt of sizes) if (nlines(str, pt, bold, w, cs) * pt * ls / 72 <= h + 0.02) return pt;
  return sizes[sizes.length - 1];
}
const plain = t => (typeof t === 'string' ? t : t.map(r => r.text).join(''));

// ---------- primitives ----------
const runs = str => { const p = String(str).split('\n'); return p.length === 1 ? str : p.map((t, i) => ({ text: t, options: i < p.length - 1 ? { breakLine: true } : {} })); };
function T(s, text, o) {
  if (!o.free && (o.x < MX - 0.01 || o.x + o.w > RX + 0.01)) WARN.push(`margin: "${plain(text).slice(0, 40)}" spans ${o.x.toFixed(2)}–${(o.x + o.w).toFixed(2)}`);
  if (o.fontSize && o.fontSize < 12) WARN.push(`type below 12 pt: "${plain(text).slice(0, 40)}"`);
  s.addText(text, Object.assign({ isTextBox: true, margin: 0, color: INK, fontSize: TS.body, valign: 'top' }, o));
}
const shadow = (blur = 18, op = 0.55, off = 6) => ({ type: 'outer', color: '000000', blur, offset: off, angle: 90, opacity: op });
// glass panel: translucent navy, hairline border, and a short "edge light" along the top-left edge
function card(s, x, y, w, h, o = {}) {
  const r = o.r ?? 0.12;
  s.addShape(RR, {
    x, y, w, h, rectRadius: r,
    fill: { color: o.fill || CARD, transparency: o.tr ?? 30 },
    line: { color: o.line || INK, width: o.lw || 0.75, transparency: o.ltr ?? 82 },
    shadow: o.shadow ? shadow(o.blur || 24, o.op || 0.45, 8) : undefined, objectName: o.name || 'Panel',
  });
  if (o.edge !== false) s.addShape(LINE, { x: x + r + 0.04, y, w: Math.min(w * 0.42, 1.9), h: 0, line: { color: o.edge || INK, width: 1.25, transparency: o.etr ?? (o.edge ? 15 : 45) }, objectName: 'Edge light' });
}
// signature motif: viewfinder corners around whatever the audience should look at
function brackets(s, x, y, w, h, o = {}) {
  const a = o.arm || 0.26, line = () => ({ color: o.col || AMBER, width: o.lw || 1.75, transparency: o.tr ?? 10 });
  const L = (x1, y1, x2, y2) => s.addShape(LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: line(), objectName: 'Viewfinder corner' });
  L(x, y, x + a, y); L(x, y, x, y + a);
  L(x + w - a, y, x + w, y); L(x + w, y, x + w, y + a);
  L(x, y + h - a, x, y + h); L(x, y + h, x + a, y + h);
  L(x + w - a, y + h, x + w, y + h); L(x + w, y + h - a, x + w, y + h);
}
function pill(s, x, y, label, fill, color, o = {}) {
  const pt = o.pt || TS.micro, cs = o.cs ?? 1, h = o.h || 0.3;
  const w = tw(label, pt, true, cs) + (o.padX ?? 0.32);
  if (o.right) x -= w;
  s.addText(label, {
    shape: RR, x, y, w, h, rectRadius: h / 2, fill: { color: fill, transparency: o.tr || 0 },
    line: o.line ? { color: o.line, width: 0.75, transparency: o.ltr || 0 } : { type: 'none' },
    color, fontSize: pt, bold: true, charSpacing: cs, align: 'center', valign: 'middle', margin: 0, objectName: 'Tag ' + label,
  });
  return w;
}
function marker(s, x, y, n, o = {}) {
  const d = o.d || 0.34;
  s.addShape(OVAL, { x: x - d / 2 - 0.08, y: y - d / 2 - 0.08, w: d + 0.16, h: d + 0.16, fill: { color: AMBER, transparency: 60 }, line: { type: 'none' }, objectName: 'Marker halo ' + n });
  s.addText(String(n), { shape: OVAL, x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: AMBER }, line: { color: INK, width: 1.5 }, color: NAVY, bold: true, fontSize: o.pt || 14, align: 'center', valign: 'middle', margin: 0, objectName: 'Marker ' + n });
}
const iconCache = {};
async function icon(name, hex = HEX.white) {
  if (!Lu[name]) throw new Error('no such icon: ' + name);
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = renderToStaticMarkup(React.createElement(Lu[name], { size: 256, strokeWidth: 1.75 })).replace(/currentColor/g, '#' + hex);
    iconCache[key] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
  return iconCache[key];
}
async function iconDisc(s, name, x, y, d, o = {}) {
  if (o.halo) s.addShape(OVAL, { x: x - 0.1, y: y - 0.1, w: d + 0.2, h: d + 0.2, fill: { color: o.ring || AMBER, transparency: 82 }, line: { type: 'none' }, objectName: 'Icon halo ' + name });
  s.addShape(OVAL, { x, y, w: d, h: d, fill: { color: o.fill || CARD, transparency: o.tr ?? 0 }, line: { color: o.ring || AMBER, width: o.lw || 1.25, transparency: o.ltr ?? 30 }, objectName: 'Icon disc ' + name });
  const k = o.k || 0.5;
  s.addImage({ data: await icon(name, o.hex || HEX.amber), x: x + d * (1 - k) / 2, y: y + d * (1 - k) / 2, w: d * k, h: d * k, altText: 'Icon ' + name.slice(2) });
}
// small caps label used above lists and inside panels
const label = (s, text, x, y, w, col = MUTED, o = {}) => T(s, text, Object.assign({ x, y, w, h: 0.26, fontSize: TS.micro, bold: true, color: col, charSpacing: 1.5, valign: 'middle' }, o));
// a muted one-line footnote at the foot of a slide
const footnote = (s, text, y = 6.72, w = CW) => { fit('footnote ' + text.slice(0, 24), text, 12, false, w, 0.3, 1.1); T(s, text, { x: MX, y, w, h: 0.3, fontSize: 12, color: MUTED }); };

// ---------- pictures ----------
// scene renders (cctv/*.jpg, 1280x720) and backgrounds: cover-fitted to the slot and graded to the deck's night palette
async function graded(file, w, h, o = {}) {
  const px = o.dpi || 200;
  let img = sharp(A(file));
  if (o.crop) img = img.extract(o.crop);
  const buf = await img.resize({ width: Math.round(w * px), height: Math.round(h * px), fit: 'cover', position: o.position || 'centre' })
    .modulate({ saturation: o.sat ?? 0.72, brightness: o.bright ?? 0.96 }).tint({ r: 150, g: 170, b: 230 }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
// AgilFence frames: 2x PNGs under af/, the registry reads each PNG's real size; rects are in 1x frame px
const FRAMES = {};
for (const id of ['AF-00', 'AF-01', 'AF-02', 'AF-02a', 'AF-02b', 'AF-03', 'AF-04', 'AF-05', 'AF-06', 'AF-07', 'AF-08', 'AF-09']) FRAMES[id] = { dir: 'af', scale: 2 };
const dirCache = {};
const listDir = d => dirCache[d] || (dirCache[d] = fs.existsSync(A(d)) ? fs.readdirSync(A(d)) : []);
function pngSize(file) { const b = Buffer.alloc(24); const fd = fs.openSync(file, 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
const infoCache = {};
function frame(id) {
  if (infoCache[id]) return infoCache[id];
  const spec = FRAMES[id]; if (!spec) throw new Error('unknown frame ' + id);
  const name = listDir(spec.dir).find(f => f.endsWith('.png') && (f === id + '.png' || f.startsWith(id + '-')));
  if (!name) throw new Error(`missing frame ${id} under ${A(spec.dir)}`);
  const file = A(path.join(spec.dir, name)), [pxW, pxH] = pngSize(file);
  return infoCache[id] = { id, file, key: name.replace(/\.png$/, ''), pxW, pxH, scale: spec.scale, w: pxW / spec.scale, h: pxH / spec.scale };
}
// crop r (1x frame px) of a frame, cover-fitted to a w x h inch slot; o.head (in) adds a plain band
// above the crop so the stand-in tag sits on it and never hides the frame's own labels
async function shot(id, r, w, h, o = {}) {
  const f = frame(id), sc = f.scale, head = o.head || 0;
  const left = Math.max(0, Math.round(r[0] * sc)), top = Math.max(0, Math.round(r[1] * sc));
  const width = Math.min(Math.round(r[2] * sc), f.pxW - left), height = Math.min(Math.round(r[3] * sc), f.pxH - top);
  const px = o.dpi || 220, outW = Math.min(Math.round(w * px), width), outH = Math.round(outW * (h - head) / w), headPx = Math.round(outW * head / w);
  let img = sharp(f.file).extract({ left, top, width, height }).resize({ width: outW, height: outH, fit: 'cover', position: o.position || 'centre' });
  if (headPx) img = img.extend({ top: headPx, background: '#0B1222' });
  const buf = await img.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
const HEAD = 0.45;
// the stand-in tag: amber on navy, 12 pt; folds onto two or three lines when the slot is narrow
function standInTag(s, x, y, maxW) {
  const pt = 12, cs = 0.5, pad = 0.26;
  const variants = [[TAG], ['STAND-IN · REPLACE WITH', 'APPROVED PHOTO'], ['STAND-IN', 'REPLACE WITH', 'APPROVED PHOTO']];
  let lines = variants[variants.length - 1];
  for (const v of variants) { if (Math.max(...v.map(l => tw(l, pt, true, cs))) + pad <= maxW) { lines = v; break; } }
  const w = Math.max(...lines.map(l => tw(l, pt, true, cs))) + pad, h = 0.3 + (lines.length - 1) * 0.2;
  s.addText(lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } })), {
    shape: RR, x, y, w, h, rectRadius: 0.08, fill: { color: NAVY, transparency: 8 }, line: { color: AMBER, width: 0.75, transparency: 30 },
    color: AMBER, fontSize: pt, bold: true, charSpacing: cs, align: 'center', valign: 'middle', margin: 0, lineSpacingMultiple: 0.95, objectName: 'Stand-in tag',
  });
  return { w, h };
}
// a picture slot: cover-sized image, hairline, viewfinder corners, the stand-in tag and a caption line
function slot(s, data, x, y, w, h, caption, alt, o = {}) {
  s.addImage({ data, x, y, w, h, sizing: { type: 'cover', w, h }, altText: alt, objectName: o.name || 'Picture' });
  s.addShape(RECT, { x, y, w, h, fill: { type: 'none' }, line: { color: INK, width: 0.5, transparency: 78 }, objectName: 'Picture edge' });
  brackets(s, x - 0.1, y - 0.1, w + 0.2, h + 0.2, { tr: 20, arm: Math.min(0.26, w * 0.08) });
  if (o.tag !== false) {
    const pos = o.tagAt || 'tl', tg = standInTag(s, -9, -9, w - 0.5); // measure, then place
    const tx = pos.endsWith('r') ? x + w - 0.14 - tg.w : x + 0.14, ty = pos.startsWith('b') ? y + h - 0.14 - tg.h : y + 0.14;
    standInTag(s, tx, ty, w - 0.5);
  }
  if (caption) {
    const cy = o.captionY ?? y + h + 0.1, cw = o.captionW || w;
    fit('caption ' + caption.slice(0, 24), caption, 12, false, cw, 0.3, 1.1);
    T(s, caption, { x, y: cy, w: cw, h: 0.3, fontSize: 12, color: MUTED, free: o.free });
  }
  return y + h + 0.42;
}
// a full-bleed scene behind the slide's own objects, with the corner tag and a caption
async function bleed(s, file, alt, caption, o = {}) {
  s.addImage({ data: await graded(file, SW, SH, { bright: o.bright ?? 0.6, sat: 0.6, dpi: 180, position: o.position, crop: o.crop }), x: 0, y: 0, w: SW, h: SH, sizing: { type: 'cover', w: SW, h: SH }, altText: alt, objectName: 'Scene ' + file });
  brackets(s, 0.3, 0.3, SW - 0.6, SH - 0.6, { tr: 45, arm: 0.34 });
  const tg = standInTag(s, -9, -9, 6);
  standInTag(s, RX - tg.w, o.tagY ?? 0.5, 6);
  if (caption) T(s, caption, { x: o.captionX ?? MX, y: o.captionY ?? 6.95, w: 8, h: 0.3, fontSize: 12, color: MUTED, align: o.captionAlign || 'left' });
}

// ---------- native drawing helpers ----------
// a polyline from unit samples (-1..1) as short LINE segments inside a w x h box
function wave(s, x, y, w, h, pts, col, lw = 1.5, name = 'Signature') {
  const n = pts.length, dx = w / (n - 1);
  for (let i = 0; i < n - 1; i++) {
    const x1 = x + i * dx, y1 = y + h / 2 - pts[i] * h / 2, y2 = y + h / 2 - pts[i + 1] * h / 2;
    s.addShape(LINE, { x: x1, y: Math.min(y1, y2), w: dx, h: Math.abs(y2 - y1), flipH: y2 < y1, line: { color: col, width: lw }, objectName: name + ' segment' });
  }
}
// deterministic noise so the deck builds the same every time
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 - 0.5; }; }
const N = 56;
function signature(kind) {
  const r = rng({ climb: 11, cut: 23, lift: 37, wind: 41, animal: 53 }[kind]), p = [];
  for (let i = 0; i < N; i++) {
    let v = r() * 0.12;
    if (kind === 'wind') v = r() * 0.42 + 0.14 * Math.sin(i / 4.5) + 0.08 * Math.sin(i / 1.7);
    if (kind === 'climb') for (const b of [12, 26, 40]) if (i >= b && i < b + 10) v += 0.9 * Math.sin((i - b) * 1.25) * Math.exp(-(i - b) / 7);
    if (kind === 'cut') { if (i === 24) v = -0.98; if (i === 25) v = 0.78; if (i === 26) v = -0.42; if (i === 27) v = 0.22; if (i > 27) v += 0.05; }
    if (kind === 'lift') { if (i >= 12 && i <= 42) v += 0.72 * Math.sin(Math.PI * (i - 12) / 30); }
    if (kind === 'animal') { if (i >= 20 && i <= 28) v += 0.34 * Math.sin((i - 20) * 2.1) * (i % 2 ? 1 : 0.6); }
    p.push(Math.max(-1, Math.min(1, v)));
  }
  return p;
}
// the fence strip used on slides 7 and 11: eleven segments 5-09 … 5-19 as bars with posts and labels; returns per-segment x
function fenceStrip(s, x, y, w, segs, style) {
  const gap = 0.08, bw = (w - gap * (segs.length - 1)) / segs.length, xs = [];
  s.addShape(LINE, { x: x - 0.1, y: y + 0.11, w: w + 0.2, h: 0, line: { color: INK, width: 0.75, transparency: 70 }, objectName: 'Fence line' });
  for (const [i, seg] of segs.entries()) {
    const bx = x + i * (bw + gap), st = style(seg, i);
    xs.push([bx, bw]);
    s.addShape(RR, { x: bx, y, w: bw, h: 0.22, rectRadius: 0.11, fill: st.fill, line: st.line || { type: 'none' }, objectName: 'Segment ' + seg });
    T(s, seg, { x: bx, y: y + 0.32, w: bw, h: 0.26, fontSize: 12, bold: st.bold, color: st.text || MUTED, align: 'center', free: true });
    if (i < segs.length - 1) s.addShape(LINE, { x: bx + bw + gap / 2, y: y - 0.1, w: 0, h: 0.42, line: { color: INK, width: 0.75, transparency: 60 }, objectName: 'Fence post' });
  }
  return xs;
}
const SEGS = ['5-09', '5-10', '5-11', '5-12', '5-13', '5-14', '5-15', '5-16', '5-17', '5-18', '5-19'];
// a connector arrow between two boxes
const arrow = (s, x1, y, x2, col = AMBER) => s.addShape(LINE, { x: x1, y, w: x2 - x1, h: 0, line: { color: col, width: 1.5, endArrowType: 'triangle', transparency: 10 }, objectName: 'Arrow' });

// ---------- layouts ----------
// Layouts carry only a background and placeholders: no footer text, logo or slide number.
const ph = (name, type, x, y, w, h, o) => ({ placeholder: { options: Object.assign({ name, type, x, y, w, h, margin: 0, valign: 'top', align: 'left', color: INK }, o), text: '' } });
const KICK = { fontSize: 13, bold: true, color: AMBER };
pres.defineSlideMaster({
  title: 'COVER', background: { path: A('bg3_cover.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 1.95, 8.5, 0.4, KICK),
    ph('title', 'title', 0.6, 2.4, 7.3, 2.4, { fontSize: 60, bold: true, lineSpacingMultiple: 0.9 }),
    ph('body', 'body', 0.6, 4.95, 6.4, 0.9, { fontSize: TS.lead, color: MUTED, lineSpacingMultiple: 1.1 }),
  ],
});
pres.defineSlideMaster({
  title: 'CONTENT', background: { path: A('bg2_content.jpg') },
  objects: [ph('kicker', 'body', 0.6, 0.55, 10.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 12.1, 0.72, { fontSize: TS.title, bold: true })],
});
pres.defineSlideMaster({
  title: 'CLOSE', background: { path: A('bg2_close.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 2.2, 6, 0.35, KICK),
    ph('title', 'title', 0.6, 2.65, 5.9, 2.4, { fontSize: 48, bold: true, lineSpacingMultiple: 0.92 }),
    ph('body', 'body', 0.6, 5.2, 5.6, 1.1, { fontSize: TS.lead, color: MUTED, lineSpacingMultiple: 1.1 }),
  ],
});
pres.defineSlideMaster({
  title: 'APPENDIX', background: { path: A('bg2_content.jpg') },
  objects: [ph('kicker', 'body', 0.6, 0.55, 10.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 11.6, 0.72, { fontSize: 32, bold: true })],
});
// content slide header: kicker + title (the title shrinks in steps when it would not fit one line)
function content(kicker, title, sec, o = {}) {
  const s = pres.addSlide({ masterName: o.master || 'CONTENT', sectionTitle: sec });
  s.addText(kicker, { placeholder: 'kicker', charSpacing: 1.5 });
  fit('kicker ' + kicker, kicker, 13, true, 10.5, 0.3, 1.17, 1.5);
  const pt = sizeFor(title, [36, 34, 32, 30, 28], true, 12.0, 0.72, 1.0, -0.5);
  s.addText([{ text: title, options: { fontSize: pt } }], { placeholder: 'title', charSpacing: -0.5 });
  return s;
}
// a bold lead with a muted line under it, optionally with a numbered marker or an icon disc at the left
async function row(s, x, y, w, lead, rest, o = {}) {
  let tx = x;
  if (o.n) { marker(s, x + 0.17, y + 0.19, o.n, { d: 0.34, pt: 14 }); tx = x + 0.56; }
  if (o.icon) { await iconDisc(s, o.icon, x, y - 0.02, 0.52, { k: 0.5 }); tx = x + 0.74; }
  const lw = w - (tx - x), lpt = o.pt || 18, rpt = o.rpt || 15;
  fit('row lead ' + lead, lead, lpt, true, lw, 0.34);
  T(s, lead, { x: tx, y, w: lw, h: 0.36, fontSize: lpt, bold: true, color: o.leadColor || INK });
  if (rest) {
    const rh = o.rh || 0.5;
    fit('row rest ' + lead, rest, rpt, false, lw, rh, 1.12);
    T(s, rest, { x: tx, y: y + 0.36, w: lw, h: rh, fontSize: rpt, color: MUTED, lineSpacingMultiple: 1.05 });
  }
}
const notes = (s, paras) => s.addNotes(paras.join('\n'));
const REPLACE = src => 'Replace the stand-in with: ' + src;
const SRC = {
  stPhoto: 'ST Engineering Annual Report 2018, p. 46 (AgilFence publicity photo; installation location unverified), labelled "AgilFence (publicity photo)".',
  astar: 'A*STAR 2013 engineering-award announcement image (promotional, not verified as an airport), labelled "AgilFence (publicity photo)".',
  cag: 'CAG Annual Report 2011/12, p. 58 (3 Aug 2011 joint announcement photo; it shows the announcement, not the fence).',
  product: 'a photo supplied by the AgilFence product team (ask for the Changi case-study PDF), or an approved CAG airside photo.',
};

// ---------- slides ----------
async function build() {
  let s;
  // 1 ── cover
  pres.addSection({ title: SEC.open });
  s = pres.addSlide({ masterName: 'COVER', sectionTitle: SEC.open });
  await bleed(s, 'cctv/fence_pre_clean.jpg', 'Perimeter road at night before the alarm: fence line, lights and a figure in the distance', 'Rendered scene · perimeter road before the alarm (illustration)', { bright: 0.55, captionY: 6.98 });
  s.addText('AGILFENCE  ·  PERIMETER INTRUSION DETECTION', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText(runs('AgilFence on the\nairfield perimeter'), { placeholder: 'title', charSpacing: -1.5 });
  fit('cover title', 'AgilFence on the\nairfield perimeter', 60, true, 7.3, 2.4, 0.9, -1.5);
  s.addText('From a touch on the fence to a confirmed response.', { placeholder: 'body' });
  s.addShape(LINE, { x: 0.6, y: 6.28, w: 0.5, h: 0, line: { color: AMBER, width: 2 }, objectName: 'Rule' });
  T(s, `Prepared for Changi Airport Group  ·  ${DECK_DATE}  ·  Pictures: AgilFence publicity / illustration`, { x: 0.6, y: 6.45, w: 9, h: 0.3, fontSize: TS.small, color: MUTED });
  notes(s, [
    'Good morning, and thank you for having us. This is a short walk along your perimeter fence: what AgilFence feels, how it finds the spot, and how the alarm reaches the people who act on it.',
    'Every picture in this deck is a stand-in: a rendered scene or an illustration. Each one carries a tag and a caption, and the notes on each slide name the photo to put in its place.',
    REPLACE(SRC.stPhoto),
  ]);

  // 2 ── the perimeter challenge
  s = content('THE PERIMETER CHALLENGE', 'The fence is the first sensor', SEC.open);
  {
    const px = 6.55, pw = RX - px, phh = pw * 9 / 16;
    slot(s, await graded('cctv/fence_wide_clean.jpg', pw, phh), px, 1.85, pw, phh, 'Rendered scene · Sector 5, the fence line at night (illustration)', 'Sector 5 wide: the fence line running into the dark, one figure near a post');
    const rows = [['LuRuler', 'Kilometres of fence', 'Every metre of it exposed, all night.'],
      ['LuCloudRain', 'Weather', 'Wind and rain move the fabric too.'],
      ['LuWind', 'Jet blast', 'Aircraft shake the fence near the taxiways.'],
      ['LuBird', 'Wildlife', 'Birds and animals touch the mesh.'],
      ['LuMoon', 'Night', 'Cameras alone cannot watch it all.']];
    for (const [i, [ic, lead, rest]] of rows.entries()) await row(s, MX, 1.9 + i * 0.68, 5.6, lead, rest, { icon: ic, pt: 17, rpt: 14, rh: 0.3 });
    const cy = 5.85, cw2 = (CW - 0.3) / 2;
    for (const [i, [ttl, body]] of [['A missed touch', 'Someone is on the airfield before anyone knows. Runway, aircraft and people are at risk.'],
      ['A nuisance alarm', 'A patrol is sent for the wind. Often enough, and the team stops trusting the fence.']].entries()) {
      const x = MX + i * (cw2 + 0.3);
      card(s, x, cy, cw2, 1.0, { tr: 20, edge: i ? RED : AMBER, name: ttl });
      T(s, ttl, { x: x + 0.25, y: cy + 0.1, w: cw2 - 0.5, h: 0.32, fontSize: 17, bold: true, color: i ? RED : AMBER });
      fit('challenge ' + ttl, body, 14, false, cw2 - 0.5, 0.5, 1.12);
      T(s, body, { x: x + 0.25, y: cy + 0.44, w: cw2 - 0.5, h: 0.54, fontSize: 14, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }
  notes(s, [
    'The airfield perimeter is kilometres of fence, exposed all night to wind, rain, jet blast and wildlife. Cameras alone cannot watch every metre of it.',
    'Two things go wrong. A missed touch means someone is on the airfield before anyone knows. A nuisance alarm means a patrol sent for the wind; do that often enough and the team stops trusting the fence.',
    'AgilFence turns the fence itself into the first sensor, and the rest of this deck shows how.',
    REPLACE(SRC.stPhoto),
  ]);

  // 3 ── FBG sensing
  pres.addSection({ title: SEC.sense });
  s = content('FBG SENSING', 'One cable feels the fence', SEC.sense);
  {
    const pw = 6.95, phh = pw * 585 / 960 + HEAD;
    slot(s, await shot('AF-01', [40, 125, 960, 585], pw, phh, { head: HEAD }), MX, 1.85, pw, phh, 'Illustration · fence bay with the sensing cable, the strain ripple and a climber', 'Illustration of a fence bay: the optical sensing cable runs along the mesh, a climber on the right bay sets off a red ripple of strain around segment 5-14');
    const rx0 = 7.9, rw = RX - rx0;
    for (const [i, [ic, lead, rest]] of [['LuMountain', 'Climb', 'Weight and rhythm on the mesh.'], ['LuScissors', 'Cut', 'A sharp, local snap in the fabric.'], ['LuArrowUpFromLine', 'Lift', 'The fabric pulled up from the ground.']].entries())
      await row(s, rx0, 1.9 + i * 0.82, rw, lead, rest, { icon: ic, pt: 18, rpt: 15, rh: 0.3 });
    card(s, rx0, 4.5, rw, 1.6, { tr: 15, edge: AMBER, name: 'Light not electricity' });
    s.addImage({ data: await icon('LuLightbulb', HEX.amber), x: rx0 + 0.25, y: 4.72, w: 0.3, h: 0.3, altText: 'Icon light' });
    T(s, 'Light, not electricity', { x: rx0 + 0.68, y: 4.68, w: rw - 0.9, h: 0.36, fontSize: 18, bold: true, color: AMBER });
    const lt = 'Fibre Bragg grating sensors sit in one optical cable on the fence. They sense with light, so the cable carries no power and no electronics on the fence line.';
    fit('fbg light', lt, 14, false, rw - 0.5, 0.95, 1.12);
    T(s, lt, { x: rx0 + 0.25, y: 5.1, w: rw - 0.5, h: 0.95, fontSize: 14, color: MUTED, lineSpacingMultiple: 1.05 });
  }
  notes(s, [
    'One optical cable runs along the fence. Inside it are fibre Bragg grating sensors, and they feel the strain in the fabric: a climb, a cut, or a lift from the ground.',
    'The cable senses with light. There is no power and no electronics on the fence line, which is why it suits a long, exposed perimeter.',
    REPLACE(SRC.astar),
  ]);

  // 4 ── pinpoint the segment
  s = content('LOCATION', 'Pinpoint the segment', SEC.sense);
  {
    const pw = 3.6, phh = pw * 630 / 515 + 0.65;
    slot(s, await shot('AF-04', [385, 200, 515, 630], pw, phh, { head: 0.65 }), MX, 1.8, pw, phh, 'Illustration · site map and nearest cameras (V11 frame)', 'Site map: the fence line with segments 5-11 to 5-17, segment 5-14 lit red, PTZ 7-02 and CAM 7-11 marked with their distances; below it the nearest cameras panel with PTZ 7-02 on preset at 85 m, CAM 7-11 at 120 m and PTZ 7-03 at 270 m', { captionW: 5.2 });
    const rx0 = 4.85, rw = RX - rx0;
    T(s, 'Within a few metres', { x: rx0, y: 1.82, w: rw, h: 0.5, fontSize: 28, bold: true, color: AMBER, charSpacing: -0.5 });
    for (const [i, [lead, rest]] of [['The alarm names the segment', 'Segment 5-14, Fence Sector 5, north perimeter.'], ['The site map lights it', 'The disturbance is pinpointed to the segment, within a few metres.'], ['The nearest cameras are listed', 'PTZ 7-02 is already turning to its preset for 5-14; CAM 7-11 and PTZ 7-03 are one click away.']].entries())
      await row(s, rx0, 2.55 + i * 0.9, rw, lead, rest, { n: i + 1, pt: 18, rpt: 15, rh: 0.5 });
    card(s, rx0, 5.5, rw, 0.95, { tr: 15, edge: AMBER, name: 'Where to look' });
    T(s, 'The operator knows where to look before the first click.', { x: rx0 + 0.25, y: 5.5, w: rw - 0.5, h: 0.95, fontSize: 18, bold: true, valign: 'middle' });
  }
  notes(s, [
    'When the fence is touched, AgilFence does not just say "alarm". It names the segment, and the site map lights that segment, pinpointed to within a few metres.',
    'The same map lists the nearest cameras, and the PTZ is already turning to its preset for that segment. The operator knows where to look before the first click.',
    REPLACE(SRC.product),
  ]);

  // 5 ── built for an airfield
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.sense });
  await bleed(s, 'cctv/fence_wide_clean.jpg', 'Sector 5 wide at night: the fence line running into the dark', 'Rendered scene · Sector 5 wide (illustration)', { bright: 0.8, captionY: 6.95, tagY: 3.5 });
  s.addText('BUILT FOR AN AIRFIELD', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Passive at the fence, calm in the weather', { placeholder: 'title', charSpacing: -0.5 });
  {
    const cw3 = (CW - 0.5) / 3, cy = 3.95, ch = 2.55;
    const cards = [['LuCable', 'Passive optical at the fence', 'The cable senses with light. No power and no electronics on the fence line.'],
      ['LuRadio', 'Immune to EMI and RF', 'Light is not disturbed by electromagnetic or radio interference around the airfield.'],
      ['LuWind', 'Wind, rain and jet blast rejected', 'It adapts to the weather and to jet blast, so nuisance alarms stay low.']];
    for (const [i, [ic, ttl, body]] of cards.entries()) {
      const x = MX + i * (cw3 + 0.25);
      card(s, x, cy, cw3, ch, { tr: 12, edge: AMBER, shadow: true, name: ttl });
      await iconDisc(s, ic, x + 0.28, cy + 0.3, 0.62, { k: 0.5 });
      fit('airfield ttl ' + i, ttl, 19, true, cw3 - 0.56, 0.72, 1.05);
      T(s, ttl, { x: x + 0.28, y: cy + 1.08, w: cw3 - 0.56, h: 0.72, fontSize: 19, bold: true, lineSpacingMultiple: 1.0 });
      fit('airfield body ' + i, body, 14, false, cw3 - 0.56, 0.7, 1.12);
      T(s, body, { x: x + 0.28, y: cy + 1.8, w: cw3 - 0.56, h: 0.7, fontSize: 14, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }
  notes(s, [
    'Three reasons this belongs on an airfield. First, it is passive at the fence: light in a cable, no power, no electronics out on the line.',
    'Second, light is immune to electromagnetic and radio interference, so radar and radios around the airfield do not disturb it.',
    'Third, it adapts to wind, rain and jet blast, so the nuisance alarms that wear a team down stay low.',
    REPLACE(SRC.stPhoto),
  ]);

  // 6 ── signature classification (native waveform cards)
  s = content('SIGNATURE CLASSIFICATION', 'Knows a climb from the wind', SEC.sense);
  {
    const pw = 4.2, phh = pw * 262 / 348 + 0.7;
    slot(s, await shot('AF-01', [1012, 192, 348, 262], pw, phh, { head: 0.7 }), MX, 1.85, pw, phh, 'Illustration · wind trace and climb trace (V11 frame)', 'Two strain traces from the illustration: segment 5-09 in 12 km/h wind stays flat and raises no alarm; segment 5-14 shows the sharp strain of a climb at 02:14:58 and raises the alarm');
    card(s, MX, 6.2, pw, 0.78, { tr: 15, edge: AMBER, name: 'Nuisance alarms' });
    T(s, 'Nuisance alarms stay low', { x: MX + 0.22, y: 6.26, w: pw - 0.44, h: 0.3, fontSize: 15, bold: true, color: AMBER });
    fit('nuisance line', 'Wind stays below the threshold. A climb rises above it.', 12, false, pw - 0.44, 0.36, 1.1);
    T(s, 'Wind stays below the threshold. A climb rises above it.', { x: MX + 0.22, y: 6.56, w: pw - 0.44, h: 0.36, fontSize: 12, color: MUTED });
    const rx0 = 5.45, rw = RX - rx0, ch = 0.82, gap = 0.1;
    const SIG = [['climb', 'Climb', 'weight and rhythm', true], ['cut', 'Cut', 'one sharp local snap', true], ['lift', 'Lift', 'slow pull on the fabric', true],
      ['wind', 'Wind', 'low and steady', false], ['animal', 'Animal', 'brief and light', false]];
    label(s, 'FIVE SIGNATURES  ·  DRAWN FOR ILLUSTRATION', rx0, 1.55, rw);
    for (const [i, [kind, nm, sub, alarm]] of SIG.entries()) {
      const y = 1.85 + i * (ch + gap);
      card(s, rx0, y, rw, ch, { tr: 20, edge: false, name: 'Signature ' + nm });
      T(s, nm, { x: rx0 + 0.22, y: y + 0.12, w: 1.7, h: 0.32, fontSize: 17, bold: true });
      fit('sig sub ' + nm, sub, 12, false, 1.7, 0.3, 1.1);
      T(s, sub, { x: rx0 + 0.22, y: y + 0.44, w: 1.7, h: 0.3, fontSize: 12, color: MUTED });
      const wx = rx0 + 2.05, ww = rw - 2.05 - 1.45, wy = y + 0.12, wh = ch - 0.24;
      for (const k of [-1, 1]) s.addShape(LINE, { x: wx, y: wy + wh / 2 - k * 0.5 * wh / 2, w: ww, h: 0, line: { color: AMBER, width: 0.75, dashType: 'dash', transparency: 55 }, objectName: 'Threshold' });
      wave(s, wx, wy, ww, wh, signature(kind), alarm ? INK : MUTED, alarm ? 1.75 : 1.5, nm);
      if (alarm) pill(s, rx0 + rw - 0.2, y + ch / 2 - 0.15, 'ALARM', RED, INK, { right: true });
      else pill(s, rx0 + rw - 0.2, y + ch / 2 - 0.15, 'NO ALARM', CARD, MUTED, { right: true, line: MUTED, ltr: 50 });
    }
    T(s, 'Dashed line: alarm threshold', { x: rx0, y: 6.5, w: rw, h: 0.26, fontSize: 12, color: MUTED });
  }
  notes(s, [
    'The strain of a climb, a cut and a lift each look different in the cable, and they look different from wind and from an animal brushing the mesh.',
    'On the left, the same fence on the same night: segment 5-09 in the wind stays below the threshold and raises nothing. Segment 5-14 shows the sharp strain of a climb and raises the alarm.',
    'The five traces on the right are drawn for illustration, not recorded data. The point is simple: because the signatures differ, nuisance alarms stay low.',
    REPLACE(SRC.product),
  ]);

  // 7 ── zones, sensitivity, maintenance mode (native diagram)
  s = content('CONFIGURATION', 'Zones, sensitivity, maintenance mode', SEC.sense);
  {
    label(s, 'FENCE SECTOR 5  ·  SEGMENTS 5-09 TO 5-19  ·  ILLUSTRATIVE SETTINGS', MX, 1.72, CW);
    const by = 3.0;
    const zone = seg => { const n = +seg.slice(2); return n <= 12 ? 'A' : n <= 15 ? 'B' : n === 16 ? 'M' : 'C'; };
    const xs = fenceStrip(s, MX, by, CW, SEGS, seg => {
      const z = zone(seg);
      if (z === 'M') return { fill: { type: 'none' }, line: { color: MUTED, width: 1.25, dashType: 'dash' }, text: MUTED };
      if (z === 'B') return { fill: { color: AMBER, transparency: 10 }, text: INK, bold: true };
      return { fill: { color: BLUE, transparency: 25 }, text: INK };
    });
    // sensitivity bands above the segments they cover
    const bands = [['A', 0, 3, 'ZONE A  ·  STANDARD PROFILE', BLUE], ['B', 4, 6, 'ZONE B  ·  JET-BLAST PROFILE', AMBER], ['M', 7, 7, 'WORKS', MUTED], ['C', 8, 10, 'ZONE C  ·  STANDARD PROFILE', BLUE]];
    for (const [z, a, b, txt, col] of bands) {
      const x = xs[a][0], w = xs[b][0] + xs[b][1] - x, dashed = z === 'M';
      s.addShape(RR, { x, y: by - 0.8, w, h: 0.5, rectRadius: 0.08, fill: dashed ? { type: 'none' } : { color: col, transparency: 86 }, line: { color: col, width: 1, dashType: dashed ? 'dash' : 'solid', transparency: dashed ? 20 : 35 }, objectName: 'Band ' + txt });
      const pt = tw(txt, 12, true, 1) + 0.2 <= w ? 12 : 12;
      if (tw(txt, pt, true, 1) + 0.16 > w) WARN.push('band label too wide: ' + txt);
      T(s, txt, { x, y: by - 0.8, w, h: 0.5, fontSize: pt, bold: true, color: col, charSpacing: 1, align: 'center', valign: 'middle', free: true });
      s.addShape(LINE, { x: x + w / 2, y: by - 0.3, w: 0, h: 0.3, line: { color: col, width: 1, transparency: 40 }, objectName: 'Band tie' });
    }
    // the maintenance call-out and the jet-blast note sit under the strip
    const mx0 = xs[7][0] + xs[7][1] / 2;
    s.addShape(LINE, { x: mx0, y: by + 0.6, w: 0, h: 0.3, line: { color: MUTED, width: 1 }, objectName: 'Call-out tie' });
    const mt = '5-16 in maintenance mode: planned works, alarms suppressed for the booked window and logged.';
    const mw = 4.6, mxx = Math.min(RX - mw, mx0 - mw / 2);
    s.addImage({ data: await icon('LuWrench', HEX.muted), x: mxx, y: by + 0.98, w: 0.26, h: 0.26, altText: 'Icon wrench' });
    fit('maintenance callout', mt, 12, false, mw - 0.4, 0.5, 1.1);
    T(s, mt, { x: mxx + 0.38, y: by + 0.95, w: mw - 0.4, h: 0.5, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
    // three cards: what each setting is for
    const cy = 4.75, ch = 1.95, cw3 = (CW - 0.5) / 3;
    const cards = [['LuMapPin', 'Per-segment zones', 'Each segment belongs to a zone with its own camera preset and alarm handling.'],
      ['LuSlidersHorizontal', 'Sensitivity profiles', 'A profile per zone, chosen for its exposure: standard along the open fence, a jet-blast profile near the taxiway.'],
      ['LuCalendarClock', 'Maintenance mode and schedules', 'Planned works put a segment in maintenance for the booked window. Profiles can follow a schedule.']];
    for (const [i, [ic, ttl, body]] of cards.entries()) {
      const x = MX + i * (cw3 + 0.25);
      card(s, x, cy, cw3, ch, { tr: 18, name: ttl });
      await iconDisc(s, ic, x + 0.25, cy + 0.25, 0.5, { k: 0.5 });
      fit('cfg ttl ' + i, ttl, 17, true, cw3 - 1.1, 0.62, 1.05);
      T(s, ttl, { x: x + 0.9, y: cy + 0.2, w: cw3 - 1.1, h: 0.62, fontSize: 17, bold: true, valign: 'middle', lineSpacingMultiple: 1.0 });
      fit('cfg body ' + i, body, 14, false, cw3 - 0.5, 0.9, 1.12);
      T(s, body, { x: x + 0.25, y: cy + 0.95, w: cw3 - 0.5, h: 0.9, fontSize: 14, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }
  notes(s, [
    'The fence is not one setting. Every segment belongs to a zone, and every zone has a sensitivity profile chosen for its exposure: standard along the open fence, a jet-blast profile where aircraft shake the mesh.',
    'Planned works go into maintenance mode: the segment is booked out for the window, the alarms are suppressed and the booking is logged. Profiles can follow a schedule as well.',
    'The settings on this slide are illustrative. The real zones and profiles come out of commissioning on your fence.',
  ]);

  // 8 ── alarm to picture
  pres.addSection({ title: SEC.respond });
  s = content('IPAMS CALLS THE CAMERA PRESET', 'Alarm to picture in seconds', SEC.respond);
  {
    const pw = 7.15, phh = pw * 9 / 16;
    slot(s, await graded('cctv/fence_ptz_clean.jpg', pw, phh), MX, 1.85, pw, phh, 'Rendered scene · PTZ 7-02 on preset 5-14: the climber on the fence (illustration)', 'PTZ camera view: a person climbing the fence at segment 5-14 under the floodlight');
    const rx0 = 8.05, rw = RX - rx0, th = rw * 162 / 430 + 0.7;
    slot(s, await shot('AF-02', [930, 196, 430, 162], rw, th, { head: 0.7 }), rx0, 1.85, rw, th, 'Illustration · the system message (V11 frame)', 'System message: AgilFence alarm on segment 5-14, Fence Sector 5, Critical, north perimeter; disturbance consistent with a climb; PTZ 7-02 is moving to preset 5-14');
    for (const [i, [lead, rest]] of [['Alarm raised', 'Segment 5-14 · 02:14:58'], ['Segment shown on the site map', 'iPAMS, the AgilFence alarm manager'], ['PTZ 7-02 slews to preset 5-14', 'Thermal and visible views']].entries())
      await row(s, rx0, 4.85 + i * 0.72, rw, lead, rest, { n: i + 1, pt: 17, rpt: 14, rh: 0.3 });
  }
  notes(s, [
    'At 02:14:58 the fence is touched at segment 5-14. iPAMS, the AgilFence alarm-management software, raises the alarm, shows the segment on the site map and calls up the camera preset for that segment.',
    'PTZ 7-02 slews to preset 5-14 and the operator has a picture within seconds, in thermal and in visible light. Nobody has typed a camera number.',
    REPLACE(SRC.product),
  ]);

  // 9 ── thermal and visible
  s = content('THERMAL AND VISIBLE', 'See the person, day or night', SEC.respond);
  {
    const pw = (CW - 0.3) / 2, phh = pw * 9 / 16;
    slot(s, await graded('cctv/thermal_clean.jpg', pw, phh, { sat: 0.5 }), MX, 1.85, pw, phh, 'Rendered scene · PTZ 7-02 thermal: one person at segment 5-14 (illustration)', 'Thermal camera view: one bright human figure at the fence, the mesh and posts in grey');
    slot(s, await graded('cctv/fence_ptz_clean.jpg', pw, phh), MX + pw + 0.3, 1.85, pw, phh, 'Rendered scene · PTZ 7-02 visible: the climber on the fence (illustration)', 'Visible-light camera view: the same person climbing the fence under the floodlight');
    T(s, 'Verify on video before anyone moves.', { x: MX, y: 5.72, w: CW, h: 0.5, fontSize: 26, bold: true, align: 'center', charSpacing: -0.5 });
    const sub = 'The preset carries a thermal and a visible view. The operator confirms a person, not the wind, before the patrol is sent.';
    fit('verify sub', sub, 16, false, CW, 0.36);
    T(s, sub, { x: MX, y: 6.28, w: CW, h: 0.36, fontSize: 16, color: MUTED, align: 'center' });
  }
  notes(s, [
    'The camera preset gives the operator two views of the same spot: thermal on the left, visible light on the right. At night the thermal view shows a person immediately; by day the visible view carries the detail.',
    'That is the moment of truth. The operator verifies a person on video before anyone moves, so patrols go out for people, not for the wind.',
    REPLACE(SRC.product),
  ]);

  // 10 ── map and video wall
  s = content('MAP AND VIDEO WALL', 'The whole room sees one picture', SEC.respond);
  {
    const pw = 8.55, phh = pw * 852 / 1840 + HEAD;
    slot(s, await shot('AF-06', [40, 160, 1840, 852], pw, phh, { head: HEAD }), MX, 1.85, pw, phh, 'Illustration · command-centre video wall on the perimeter alarm layout (V11 frame)', 'Video wall with six tiles: PTZ 7-02 thermal auto-track of the person, replay of CAM 7-11 before the alarm, the Sector 5 wide view, the LiDAR point cloud, the sector map with cameras and patrol, and the AgilFence strain trace for segment 5-14');
    const rx0 = 9.45, rw = RX - rx0;
    label(s, 'ON THE WALL', rx0, 1.85, rw, AMBER);
    const tiles = [['Live', 'PTZ 7-02, auto-track'], ['Replay', 'CAM 7-11, before the alarm'], ['Wide', 'CAM 7-11, Sector 5'], ['LiDAR', 'point cloud, one track'], ['Map', 'cameras and patrol'], ['Strain', 'segment 5-14']];
    for (const [i, [lead, rest]] of tiles.entries()) {
      const y = 2.22 + i * 0.56;
      s.addShape(OVAL, { x: rx0, y: y + 0.11, w: 0.12, h: 0.12, fill: { color: AMBER }, line: { type: 'none' }, objectName: 'Dot' });
      T(s, [{ text: lead + '  ', options: { bold: true } }, { text: rest, options: { color: MUTED, fontSize: 14 } }], { x: rx0 + 0.26, y, w: rw - 0.26, h: 0.34, fontSize: 16, valign: 'middle' });
    }
    const st = 'The wall takes the same alarm layout as the map, so the duty manager sees what the operator sees.';
    fit('wall statement', st, 15, false, rw, 1.0, 1.12);
    T(s, st, { x: rx0, y: 5.7, w: rw, h: 1.0, fontSize: 15, color: MUTED, lineSpacingMultiple: 1.05 });
  }
  notes(s, [
    'The same alarm drives the command-centre wall. Live, the PTZ tracks the person. Beside it, the replay from the wide camera shows the minutes before the alarm, with the wide view, the LiDAR track, the map and the strain trace.',
    'One layout for the whole room: the operator, the duty manager and anyone they call in look at the same picture.',
    REPLACE(SRC.product),
  ]);

  // 11 ── self-diagnostics (native diagram)
  s = content('SELF-DIAGNOSTICS', 'Health you can see', SEC.respond);
  {
    label(s, 'FENCE SECTOR 5  ·  HEALTH VIEW  ·  ILLUSTRATIVE', MX, 1.72, CW);
    const by = 2.95;
    const xs = fenceStrip(s, MX, by, CW, SEGS, seg => seg === '5-12' ? { fill: { color: AMBER }, text: INK, bold: true } : seg === '5-17' ? { fill: { color: RED }, text: INK, bold: true } : { fill: { color: GREEN, transparency: 45 }, text: MUTED });
    // call-outs above the two unhealthy segments
    for (const [i, col, ttl, sub] of [[3, AMBER, 'Segment fault', 'cable loss on 5-12'], [8, RED, 'Tamper', 'enclosure opened at 5-17']]) {
      const cx = xs[i][0] + xs[i][1] / 2, w = 2.4, x = Math.max(MX, Math.min(RX - w, cx - w / 2));
      s.addShape(RR, { x, y: by - 0.95, w, h: 0.62, rectRadius: 0.08, fill: { color: CARD, transparency: 10 }, line: { color: col, width: 1.25 }, objectName: 'Call-out ' + ttl });
      s.addShape(LINE, { x: cx, y: by - 0.33, w: 0, h: 0.33, line: { color: col, width: 1.25 }, objectName: 'Call-out tie' });
      T(s, ttl, { x: x + 0.18, y: by - 0.9, w: w - 0.36, h: 0.3, fontSize: 15, bold: true, color: col });
      T(s, sub, { x: x + 0.18, y: by - 0.62, w: w - 0.36, h: 0.26, fontSize: 12, color: MUTED });
    }
    // controllers under the segments they serve
    for (const [a, b, nm] of [[0, 5, 'Controller A  ·  5-09 to 5-14'], [6, 10, 'Controller B  ·  5-15 to 5-19']]) {
      const x = xs[a][0], w = xs[b][0] + xs[b][1] - x;
      s.addShape(RR, { x, y: by + 0.78, w, h: 0.42, rectRadius: 0.08, fill: { color: CARD, transparency: 15 }, line: { color: GREEN, width: 1, transparency: 30 }, objectName: nm });
      s.addShape(OVAL, { x: x + 0.2, y: by + 0.93, w: 0.12, h: 0.12, fill: { color: GREEN }, line: { type: 'none' }, objectName: 'Status dot' });
      T(s, [{ text: nm + '   ' }, { text: 'OK', options: { bold: true, color: GREEN } }], { x: x + 0.42, y: by + 0.78, w: w - 0.5, h: 0.42, fontSize: 14, valign: 'middle', free: true });
      s.addShape(LINE, { x: x + w / 2, y: by + 0.6, w: 0, h: 0.18, line: { color: GREEN, width: 1, transparency: 40 }, objectName: 'Controller tie' });
    }
    // health list and what the operator does
    const cy = 4.6, ch = 2.1, lw = 6.6, rw = CW - lw - 0.3;
    card(s, MX, cy, lw, ch, { tr: 18, name: 'Health list' });
    label(s, 'HEALTH LIST', MX + 0.25, cy + 0.18, 3, AMBER);
    const H = [['Sensing cable', 'continuous', GREEN, 'OK'], ['Controller A, Controller B', 'self-test passed', GREEN, 'OK'], ['Segment 5-12', 'cable loss, splice to check', AMBER, 'FAULT'],
      ['Segment 5-17', 'enclosure opened', RED, 'TAMPER'], ['Test alarm, segment 5-10', 'walk test, logged', TEAL, 'LOGGED']];
    for (const [i, [nm, sub, col, st]] of H.entries()) {
      const y = cy + 0.5 + i * 0.3;
      s.addShape(OVAL, { x: MX + 0.27, y: y + 0.08, w: 0.11, h: 0.11, fill: { color: col }, line: { type: 'none' }, objectName: 'Health dot' });
      T(s, [{ text: nm + '  ', options: { bold: true } }, { text: sub, options: { color: MUTED } }], { x: MX + 0.5, y, w: lw - 1.8, h: 0.28, fontSize: 13, valign: 'middle' });
      T(s, st, { x: MX + lw - 1.3, y, w: 1.05, h: 0.28, fontSize: 12, bold: true, color: col, charSpacing: 1, align: 'right', valign: 'middle' });
    }
    const rx0 = MX + lw + 0.3;
    card(s, rx0, cy, rw, ch, { tr: 18, name: 'What the operator does' });
    label(s, 'WHAT THE OPERATOR SEES', rx0 + 0.25, cy + 0.18, rw - 0.5, AMBER);
    const items = ['Faults and tamper appear on the same map as alarms, by segment.', 'Cable and controller health is checked by the system itself.', 'Test alarms from a walk test are logged like any other alarm.'];
    for (const [i, t] of items.entries()) {
      fit('health item ' + i, t, 13, false, rw - 0.75, 0.46, 1.1);
      s.addShape(OVAL, { x: rx0 + 0.27, y: cy + 0.6 + i * 0.5, w: 0.1, h: 0.1, fill: { color: AMBER }, line: { type: 'none' }, objectName: 'Bullet' });
      T(s, t, { x: rx0 + 0.5, y: cy + 0.5 + i * 0.5, w: rw - 0.75, h: 0.46, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }
  notes(s, [
    'A perimeter system has to tell you when it is not well. AgilFence checks its own sensing cable and controllers, and shows segment faults and tamper on the same map as the alarms.',
    'Here segment 5-12 has a cable fault to splice, and the enclosure at 5-17 has been opened. Both show by segment, so maintenance goes to the right post. A test alarm from a walk test is logged like any other alarm.',
    'The health view here is illustrative; the real one comes with the product.',
  ]);

  // 12 ── into the same workflow (picture + chain diagram)
  s = content('AGIL SECURE, PATROL, TOWER', 'Into the same workflow', SEC.respond);
  {
    const pw = 5.2, phh = pw * 600 / 975 + HEAD;
    slot(s, await shot('AF-08', [385, 120, 975, 600], pw, phh, { head: HEAD }), MX, 1.85, pw, phh, 'Illustration · patrol on scene at segment 5-14 (V11 frame)', 'Operator view: the sector map with Patrol 2 on scene at segment 5-14 at 02:18:08 and the person 130 m from runway 02L; the alarm panel with the PTZ, wide and LiDAR tiles');
    const rx0 = 6.15, rw = RX - rx0;
    for (const [i, [lead, rest]] of [['Alarm → incident → SOP → report', 'The fence alarm runs through the AGIL Secure workflow like any other alarm.'], ['Patrol radio and app', 'The patrol gets the segment and the picture, and reports back from the scene.'], ['Tower informed', 'Airside operations know before anyone crosses the strip.']].entries())
      await row(s, rx0, 1.88 + i * 0.92, rw, lead, rest, { n: i + 1, pt: 17, rpt: 14, rh: 0.5 });
    // chain: AgilFence → iPAMS → AGIL Secure → operator → patrol, with the scenario clock under it
    const cy = 5.95, nodes = [['LuFence', 'AgilFence', 'alarm on 5-14'], ['LuMapPin', 'iPAMS', 'map, preset'], ['LuNetwork', 'AGIL Secure', 'incident, SOP'], ['LuUser', 'Operator', 'decides'], ['LuRadio', 'Patrol', 'on scene']];
    const nw = 2.1, step = (CW - nw) / (nodes.length - 1);
    for (const [i, [ic, nm, sub]] of nodes.entries()) {
      const x = MX + i * step, d = 0.56;
      await iconDisc(s, ic, x, cy, d, { k: 0.5, fill: i === 0 ? AMBER : CARD, hex: i === 0 ? HEX.navy : HEX.amber, ring: AMBER, ltr: i === 0 ? 0 : 40 });
      T(s, nm, { x: x + d + 0.12, y: cy - 0.02, w: nw - d - 0.12, h: 0.3, fontSize: 15, bold: true });
      fit('chain sub ' + nm, sub, 12, false, nw - d - 0.12, 0.28);
      T(s, sub, { x: x + d + 0.12, y: cy + 0.28, w: nw - d - 0.12, h: 0.28, fontSize: 12, color: MUTED });
      if (i < nodes.length - 1) arrow(s, x + nw - 0.08, cy + d / 2, x + step - 0.12);
    }
    const clock = [['02:14:58', 'climb on segment 5-14'], ['02:18:08', 'patrol on scene'], ['02:44:20', 'incident closed, report done']];
    const cwid = CW / 3;
    for (const [i, [t, what]] of clock.entries()) {
      T(s, [{ text: t + '  ', options: { bold: true, color: AMBER } }, { text: what, options: { color: MUTED } }], { x: MX + i * cwid, y: 6.78, w: cwid, h: 0.3, fontSize: 14, align: i === 0 ? 'left' : i === 1 ? 'center' : 'right', valign: 'middle' });
      if (i) s.addShape(LINE, { x: MX + i * cwid - 0.05, y: 6.84, w: 0, h: 0.18, line: { color: INK, width: 0.75, transparency: 70 }, objectName: 'Clock divider' });
    }
    s.addShape(LINE, { x: MX, y: 6.68, w: CW, h: 0, line: { color: INK, width: 0.75, transparency: 80 }, objectName: 'Rule' });
  }
  notes(s, [
    'AgilFence does not live on a separate screen. iPAMS passes the alarm, the segment and the time to AGIL Secure, and from there the fence alarm runs through the same workflow as any other: alarm, incident, SOP, report.',
    'The patrol gets the segment and the picture on the radio and the app, and reports back from the scene. The tower is informed before anyone crosses the strip.',
    'In our scenario: the climb at 02:14:58, the patrol on scene at 02:18:08, the incident closed and reported at 02:44:20. Those are scenario clock times, not a performance promise.',
    REPLACE(SRC.product),
  ]);

  // 13 ── proven at Changi
  pres.addSection({ title: SEC.trust });
  s = content('TRACK RECORD', 'Proven at Changi', SEC.trust);
  {
    const pw = 6.4, phh = pw * 9 / 16;
    slot(s, await graded('bg2_section.jpg', pw, phh, { bright: 0.9, sat: 0.6 }), MX, 1.85, pw, phh, 'Stand-in · slot for the 3 Aug 2011 joint announcement photo', 'Blurred control-room render holding the place of the announcement photograph');
    const rx0 = 7.45, rw = RX - rx0;
    for (const [i, [date, what]] of [['3 Aug 2011', 'Joint announcement by Changi Airport Group and ST Engineering'], ['28 Feb 2013', 'The Changi system officially commissioned']].entries()) {
      const y = 1.85 + i * 1.5;
      T(s, date, { x: rx0, y, w: rw, h: 0.6, fontSize: 36, bold: true, color: AMBER, charSpacing: -1 });
      fit('changi ' + i, what, 16, false, rw, 0.62, 1.12);
      T(s, what, { x: rx0, y: y + 0.64, w: rw, h: 0.62, fontSize: 16, color: MUTED, lineSpacingMultiple: 1.05 });
    }
    card(s, rx0, 4.95, rw, 0.95, { tr: 15, edge: AMBER, name: 'Since then' });
    T(s, 'On the airfield perimeter since.', { x: rx0 + 0.25, y: 4.95, w: rw - 0.5, h: 0.95, fontSize: 18, bold: true, valign: 'middle' });
    footnote(s, 'Dates from the public record. No picture is labelled a Changi deployment unless CAG or the AgilFence product team confirms it.', 6.62);
  }
  notes(s, [
    'This is not a new idea for Changi. The joint announcement with Changi Airport Group was made on 3 August 2011, and the Changi system was officially commissioned on 28 February 2013. It has been on the airfield perimeter since.',
    'The picture slot here is a stand-in for the announcement photograph. We do not label any generic AgilFence photo as a Changi deployment unless CAG or the product team confirms it.',
    REPLACE(SRC.cag),
  ]);

  // 14 ── the flow on one page: nine thumbnails, no lavender crops
  s = content('WHAT YOU SAW', 'The flow on one page', SEC.trust);
  {
    const steps = [['AF-01', [40, 120, 960, 590], 'Perimeter triggered'], ['AF-02', [560, 180, 820, 560], 'System message'], ['AF-03', [35, 215, 705, 440], 'Alarm in the incident list'],
      ['AF-04', [385, 150, 515, 420], 'Locate: nearest cameras'], ['AF-05', [390, 140, 500, 312], 'PTZ films the area'], ['AF-06', [40, 160, 1840, 852], 'Command-centre wall'],
      ['AF-07', [902, 642, 458, 290], 'Operator runs the SOP'], ['AF-08', [385, 330, 560, 350], 'Patrol on scene'], ['AF-09', [862, 200, 696, 340], 'Close and report']];
    const gap = 0.12, tw0 = (CW - gap * 8) / 9, th = tw0 * 1.0, ty = 2.25;
    brackets(s, MX - 0.12, ty - 0.12, CW + 0.24, th + 0.24, { tr: 20, arm: 0.3 });
    for (const [i, [id, r, nm]] of steps.entries()) {
      const x = MX + i * (tw0 + gap);
      s.addImage({ data: await shot(id, r, tw0, th, { dpi: 260 }), x, y: ty, w: tw0, h: th, sizing: { type: 'cover', w: tw0, h: th }, altText: `Step ${i + 1}: ${nm}`, objectName: 'Step ' + (i + 1) });
      s.addShape(RECT, { x, y: ty, w: tw0, h: th, fill: { type: 'none' }, line: { color: INK, width: 0.5, transparency: 75 }, objectName: 'Thumb edge' });
      marker(s, x + 0.22, ty + th - 0.22, i + 1, { d: 0.3, pt: 12 });
      fit('step name ' + i, nm, 12, true, tw0, 0.5, 1.1);
      T(s, nm, { x, y: ty + th + 0.1, w: tw0, h: 0.5, fontSize: 12, bold: true, lineSpacingMultiple: 1.0 });
    }
    const tg = standInTag(s, -9, -9, 6);
    standInTag(s, RX - tg.w, 1.75, 6);
    T(s, 'Illustration · nine V11 frames of the AgilFence flow, cropped to the AgilFence content', { x: MX, y: 1.78, w: 8, h: 0.3, fontSize: 12, color: MUTED });
    // the scenario clock, a line with the first and last step pinned
    const ly = 5.05;
    s.addShape(LINE, { x: MX + 0.2, y: ly, w: CW - 0.4, h: 0, line: { color: AMBER, width: 2, transparency: 20 }, objectName: 'Clock line' });
    for (const [i, [t, what, align]] of [['02:14:58', 'climb on segment 5-14', 'left'], ['02:18:08', 'patrol on scene', 'center'], ['02:44:20', 'incident closed, report done', 'right']].entries()) {
      const cx = i === 0 ? MX + 0.2 : i === 1 ? SW / 2 : RX - 0.2;
      s.addShape(OVAL, { x: cx - 0.1, y: ly - 0.1, w: 0.2, h: 0.2, fill: { color: AMBER }, line: { color: NAVY, width: 1.5 }, objectName: 'Clock dot' });
      const x = i === 0 ? MX : i === 1 ? SW / 2 - 2 : RX - 4;
      T(s, t, { x, y: ly + 0.25, w: 4, h: 0.45, fontSize: 26, bold: true, align, charSpacing: -0.5 });
      T(s, what, { x, y: ly + 0.72, w: 4, h: 0.3, fontSize: 14, color: MUTED, align });
    }
    footnote(s, 'Scenario clock times from the illustrative flow, not a performance figure.', 6.72);
  }
  notes(s, [
    'Here is the whole flow on one page. The fence feels the climb, the system message names the segment, the alarm lands in the incident list, the nearest cameras are called, the PTZ films the area, the wall shows the room one picture, the operator runs the SOP, the patrol is on scene, and the incident is closed and reported.',
    'From the climb at 02:14:58 to the closed incident at 02:44:20, with the patrol on scene at 02:18:08. Scenario clock times, from the illustrative flow.',
    REPLACE('a photo sequence from a real exercise on the perimeter, if CAG can approve one; otherwise keep the frames and the label.'),
  ]);

  // 15 ── close
  s = pres.addSlide({ masterName: 'CLOSE', sectionTitle: SEC.trust });
  await bleed(s, 'cctv/fence_patrol_clean.jpg', 'A patrol vehicle and two officers with the person at the fence, under the floodlight', 'Rendered scene · patrol on scene at the fence (illustration)', { bright: 0.6, captionY: 6.98, crop: { left: 0, top: 0, width: 1100, height: 720 } });
  card(s, 0.3, 1.85, 6.5, 4.75, { tr: 22, edge: false, ltr: 90, r: 0.16, shadow: true, name: 'Text panel' });
  s.addText('NEXT STEPS', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText(runs('The fence feels it.\nYour team acts on it.'), { placeholder: 'title', charSpacing: -1 });
  fit('close title', 'The fence feels it.\nYour team acts on it.', 48, true, 5.9, 2.4, 0.92, -1);
  const closeBody = 'Next: a site walk on the perimeter, then an SOP-mapping workshop with your control room.';
  fit('close body', closeBody, TS.lead, false, 5.6, 1.1, 1.1);
  s.addText(closeBody, { placeholder: 'body' });
  notes(s, [
    'The fence feels it, and your team acts on it. That is the whole story: a touch on the fence becomes a located, verified alarm in the workflow your control room already runs.',
    'Two next steps. A site walk on the perimeter with your airside and security teams, and an SOP-mapping workshop with the control room to agree what happens at each step. Thank you.',
    REPLACE(SRC.product),
  ]);

  // A1 ── picture sources and the labelling rule
  pres.addSection({ title: SEC.appx });
  s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
  s.addText('APPENDIX A1', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Picture sources and labelling rule', { placeholder: 'title' });
  {
    const rows = [
      ['ST Engineering Annual Report 2018, p. 46', 'AgilFence publicity photo; installation location unverified', 'AgilFence (publicity photo)'],
      ['A*STAR 2013 engineering-award announcement', 'Promotional image; not verified as an airport', 'AgilFence (publicity photo)'],
      ['CAG Annual Report 2011/12, p. 58', '3 Aug 2011 joint announcement photo; not the fence', 'Joint announcement, 3 Aug 2011'],
      ['ST Engineering "Engineering with Passion" coverage', 'AgilFence feature; check rights before use', 'As captioned by the source'],
      ['Changi Connections, Oct 2011', 'Announcement coverage; check rights before use', 'As captioned by the source'],
      ['AgilFence Changi case-study PDF', 'Not accessible at the time of writing; request from the product team', 'Only with product-team confirmation'],
    ];
    const head = ['Owner-verified source', 'What it shows', 'Label to use'].map(h => ({ text: h.toUpperCase(), options: { bold: true, color: HEX.amber, fill: { color: HEX.card }, fontSize: 12, charSpacing: 1 } }));
    const body = rows.map((r, i) => r.map((c, j) => ({ text: c, options: { color: j === 2 ? HEX.amber : HEX.white, fontSize: 12, bold: j === 0, fill: { color: i % 2 ? '111A2E' : '0B1222' } } })));
    s.addTable([head, ...body], { x: MX, y: 1.72, w: CW, colW: [3.9, 5.03, 3.2], rowH: 0.42, valign: 'middle', margin: [3, 6, 3, 6], border: { type: 'solid', pt: 0.5, color: '2A3346' }, fontFace: 'Arial' });
    const ry = 4.85;
    card(s, MX, ry, 7.4, 1.55, { tr: 15, edge: AMBER, name: 'Labelling rule' });
    label(s, 'THE RULE', MX + 0.25, ry + 0.16, 3, AMBER);
    const rule = 'Never label a generic AgilFence photo as an actual deployment at Changi Airport unless CAG or the AgilFence product team confirms it. Each picture says "AgilFence (publicity photo)", "Illustration" or "Rendered scene".';
    fit('rule', rule, 14, false, 6.9, 0.95, 1.12);
    T(s, rule, { x: MX + 0.25, y: ry + 0.46, w: 6.9, h: 0.95, fontSize: 14, lineSpacingMultiple: 1.05 });
    const sx = MX + 7.7, sw2 = RX - sx;
    card(s, sx, ry, sw2, 1.55, { tr: 15, name: 'Stand-ins' });
    label(s, 'STAND-INS IN THIS DECK', sx + 0.25, ry + 0.16, sw2 - 0.5, AMBER);
    const si = 'Slides 1 to 6, 8 to 10 and 12 to 15 hold stand-in pictures, each tagged. Slides 7 and 11 are native diagrams. Dates we state: announcement 3 Aug 2011, commissioning 28 Feb 2013.';
    fit('standins', si, 13, false, sw2 - 0.5, 1.0, 1.12);
    T(s, si, { x: sx + 0.25, y: ry + 0.46, w: sw2 - 0.5, h: 1.0, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.05 });
    footnote(s, 'Real photographs could not be downloaded in the build environment; the notes on each picture slide name the source to swap in.', 6.65);
  }
  notes(s, [
    'For the team preparing the final deck: these are the owner-verified picture sources, what each one shows, and the label to use.',
    'The one rule: never call a generic AgilFence photo a Changi deployment unless CAG or the AgilFence product team confirms it. Every stand-in in the deck is tagged, and the notes on each slide say what to replace it with.',
  ]);

  return write();
}

async function write() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await finalize(OUT);
  console.log('FIT WARNINGS:' + (WARN.length ? '\n  ' + WARN.join('\n  ') : ' none'));
  console.log('deck →', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
}

// ---------- theme + post-processing ----------
// The pptx skill's apply_theme.js when available; otherwise the same edit done here.
let applyTheme;
try {
  ({ applyTheme } = require(process.env.PPTX_APPLY_THEME || 'apply_theme'));
} catch {
  applyTheme = async (file, theme) => {
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const part = 'ppt/theme/theme1.xml';
    const slots = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    const scheme = `<a:clrScheme name="${theme.name}">` + slots.map(k => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
    const xml = (await zip.file(part).async('string')).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
      .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${theme.name}"`);
    zip.file(part, xml);
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  };
}
// 1) dark colour map on the slide master (Background 1 = navy, Text 1 = white);
// 2) no assistant words, no lavender, anywhere in slides, layouts, notes or theme;
// 3) speaker notes: one paragraph per line, so PowerPoint shows the line breaks.
const BANNED = [/Co-pilot/, /co-?pilot/i, /B69CFF/i, /AI /, /\bAI\b/];
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const master = 'ppt/slideMasters/slideMaster1.xml';
  const mx = await zip.file(master).async('string');
  const swapped = mx.replace('<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"', '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2"');
  if (swapped === mx) throw new Error('slide master colour map not found');
  zip.file(master, swapped);
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|theme)\/[^/]+\.xml$/.test(n) || n === 'docProps/core.xml')) {
    const xml = await zip.file(name).async('string');
    for (const re of BANNED) { const hit = xml.match(re); if (hit) throw new Error(`${name} contains "${hit[0]}"`); }
  }
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async('string');
    const out = xml.replace(/<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/, (_, t) =>
      t.split(/\r?\n/).map(line => line.trim()
        ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${line.trim()}</a:t></a:r></a:p>`
        : '<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>').join(''));
    zip.file(name, out);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

build().catch(e => { console.error(e); process.exit(1); });
