'use strict';
// CAG demo-day pitch deck: one presenter on the slides, one colleague driving AGIL Secure V11 live.
// Every live slide mirrors one V11 screen (frames from isms-mvp-figma/screens-v11) and carries
// numbered "watch for" markers that match the clicks on screen; speaker notes hold the spoken script.
// A hidden appendix holds the run sheet (script cue + clicks) and Q&A prep.
//
//   node make_assets.mjs <old.pptx> <v11SvgDir> <mvpSvgDir> <assetsDir>
//   python3 extract_anchors.py <v11SvgDir> <assetsDir>/anchors.json
//   node build_deck.js <assetsDir> <out.pptx>
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const Lu = require('react-icons/lu');

const ASSETS = path.resolve(process.argv[2] || 'assets');
const OUT = path.resolve(process.argv[3] || 'dist/CAG_AI_CoPilot_Live_Demo.pptx');
// DECK=client leaves the presenter appendix out entirely, so nothing presenter-only can be sent by mistake
const CLIENT = process.env.DECK === 'client';
const A = f => path.join(ASSETS, f);
const ARIAL = JSON.parse(fs.readFileSync(path.join(__dirname, 'arial-widths.json'), 'utf8'));
const ROBOTO = JSON.parse(fs.readFileSync(path.join(__dirname, '../isms-mvp-figma/lib/roboto-widths.json'), 'utf8'));
const ANCHORS = JSON.parse(fs.readFileSync(A('anchors.json'), 'utf8'));

// ---------- theme: night-shift navy, Co-pilot lavender, V11 severity colours ----------
// The master's colour map is switched to dark after writing (finalize): Background 1 = dk1 (navy),
// Text 1 = lt1 (white), so slides and text boxes added later in PowerPoint come out dark-on-light-correct.
const THEME = {
  name: 'AGIL Co-pilot Night',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '05070D', lt1: 'FFFFFF', dk2: '0E1628', lt2: 'A9B4C8',
    accent1: 'B69CFF', accent2: '4D8DFF', accent3: 'D72D30', accent4: 'D4B741', accent5: '4DAFBE', accent6: '2ED47A',
    hlink: '8FB4FF', folHlink: 'B69CFF',
  },
};
const HEX = { lav: 'B69CFF', blue: '4D8DFF', red: 'D72D30', gold: 'D4B741', teal: '4DAFBE', green: '2ED47A', white: 'FFFFFF', muted: 'A9B4C8', navy: '05070D' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'From alarms to answers: AGIL Secure ISMS V11 with AI Co-pilot';
pres.subject = 'Live demonstration for Changi Airport Group: seven airport security scenarios';
pres.author = 'ST Engineering, Smart Security & Automation';
pres.company = 'ST Engineering';

const C = pres.SchemeColor;
const NAVY = C.background1, CARD = C.background2, INK = C.text1, MUTED = C.text2;
const LAV = C.accent1, BLUE = C.accent2, RED = C.accent3, GOLD = C.accent4, TEAL = C.accent5, GREEN = C.accent6;
const SEV = { Critical: [RED, INK], Warning: [GOLD, NAVY], Info: [TEAL, NAVY] };
const RR = pres.shapes.ROUNDED_RECTANGLE, RECT = pres.shapes.RECTANGLE, OVAL = pres.shapes.OVAL, LINE = pres.shapes.LINE;
const SW = 13.333, SH = 7.5, MX = 0.6, RX = SW - MX;
// type scale (pt): nothing on a visible slide goes below TS.micro
const TS = { display: 66, section: 54, title: 34, scene: 32, lead: 20, body: 16, small: 14, micro: 11 };
const GEO = JSON.parse(fs.readFileSync(A('visuals.json'), 'utf8'));
const SEC = { open: 'Opening', demo: 'Live demo: one night, seven scenarios', platform: 'Platform, trust and value', close: 'Next steps', appx: 'Appendix: presenter only' };

// ---------- measuring (Arial metrics via Liberation Sans) ----------
function tw(str, pt, bold, cs = 0) {
  const t = ARIAL[bold ? 700 : 400]; let w = 0;
  for (const ch of String(str)) w += t[ch] ?? 0.556;
  return (w * pt + cs * String(str).length) / 72;
}
function nlines(str, pt, bold, w) {
  let n = 0;
  for (const para of String(str).split('\n')) {
    let cur = '', k = 1;
    for (const word of para.split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (tw(t, pt, bold) > w && cur) { k++; cur = word; } else cur = t;
    }
    n += k;
  }
  return n;
}
const WARN = [];
function fit(id, str, pt, bold, w, h, ls = 1.17) {
  const n = nlines(str, pt, bold, w), need = n * pt * ls / 72;
  if (need > h + 0.02) WARN.push(`${id}: needs ${need.toFixed(2)}in (${n} lines) in ${h.toFixed(2)}in`);
  return n;
}
// width of V11 UI text (Roboto) in frame px
function rw(str, px, wt = 500) { const t = ROBOTO[wt] || ROBOTO[500]; let w = 0; for (const ch of String(str)) w += t[ch] ?? 0.55; return w * px; }
function anchor(frame, needle, i = 0) {
  const hits = ANCHORS[frame].filter(a => a[3].includes(needle));
  if (!hits[i]) throw new Error(`anchor not found: ${frame} / ${needle}`);
  const [x, y, size, t] = hits[i];
  return { x, y, size, t, end: x + rw(t, size), mid: y - size * 0.35 };
}

// ---------- primitives ----------
const runs = str => { const p = String(str).split('\n'); return p.length === 1 ? str : p.map((t, i) => ({ text: t, options: i < p.length - 1 ? { breakLine: true } : {} })); };
function T(s, text, o) {
  if (!o.free && (o.x < MX - 0.01 || o.x + o.w > RX + 0.01)) WARN.push(`margin: "${String(typeof text === 'string' ? text : text.map(r => r.text).join('')).slice(0, 40)}" spans ${o.x.toFixed(2)}–${(o.x + o.w).toFixed(2)}`);
  s.addText(text, Object.assign({ isTextBox: true, margin: 0, color: INK, fontSize: TS.body, valign: 'top' }, o));
}
const shadow = (blur = 18, op = 0.55, off = 6) => ({ type: 'outer', color: '000000', blur, offset: off, angle: 90, opacity: op });
// glass panel: translucent navy, hairline border, and a short "edge light" along the top-left edge
function card(s, x, y, w, h, o = {}) {
  const r = o.r ?? 0.14;
  s.addShape(RR, {
    x, y, w, h, rectRadius: r,
    fill: { color: o.fill || CARD, transparency: o.tr ?? 30 },
    line: { color: o.line || INK, width: o.lw || 0.75, transparency: o.ltr ?? 82 },
    shadow: o.shadow ? shadow(o.blur || 24, o.op || 0.45, 8) : undefined, objectName: o.name || 'Panel',
  });
  if (o.edge !== false) s.addShape(LINE, { x: x + r + 0.04, y, w: Math.min(w * 0.42, 1.9), h: 0, line: { color: o.edge || INK, width: 1.25, transparency: o.etr ?? (o.edge ? 15 : 45) }, objectName: 'Edge light' });
}
// signature motif: CCTV viewfinder corners around whatever the audience should look at
function brackets(s, x, y, w, h, o = {}) {
  const a = o.arm || 0.26, line = () => ({ color: o.col || LAV, width: o.lw || 1.75, transparency: o.tr ?? 10 });
  const L = (x1, y1, x2, y2) => s.addShape(LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: line(), objectName: 'Viewfinder corner' });
  L(x, y, x + a, y); L(x, y, x, y + a);
  L(x + w - a, y, x + w, y); L(x + w, y, x + w, y + a);
  L(x, y + h - a, x, y + h); L(x, y + h, x + a, y + h);
  L(x + w - a, y + h, x + w, y + h); L(x + w, y + h - a, x + w, y + h);
}
// a full-slide decorative overlay (rendered art, no text), behind the slide's own objects
const full = (s, file, alt = '') => s.addImage({ path: A(file), x: 0, y: 0, w: SW, h: SH, altText: alt, objectName: 'Visual ' + file.replace(/\.\w+$/, '') });
function pill(s, x, y, label, fill, color, o = {}) {
  const pt = o.pt || TS.micro, cs = o.cs ?? 1, h = o.h || 0.3;
  const w = tw(label, pt, true, cs) + (o.padX ?? 0.32);
  s.addText(label, {
    shape: RR, x, y, w, h, rectRadius: h / 2, fill: { color: fill, transparency: o.tr || 0 },
    line: o.line ? { color: o.line, width: 0.75, transparency: o.ltr || 0 } : { type: 'none' },
    color, fontSize: pt, bold: true, charSpacing: cs, align: 'center', valign: 'middle', margin: 0, objectName: 'Tag ' + label,
  });
  return w;
}
function marker(s, x, y, n, o = {}) {
  const d = o.d || 0.34;
  s.addShape(OVAL, { x: x - d / 2 - 0.08, y: y - d / 2 - 0.08, w: d + 0.16, h: d + 0.16, fill: { color: LAV, transparency: 60 }, line: { type: 'none' }, objectName: 'Marker halo ' + n });
  s.addText(String(n), { shape: OVAL, x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: LAV }, line: { color: INK, width: 1.5 }, color: NAVY, bold: true, fontSize: o.pt || 14, align: 'center', valign: 'middle', margin: 0, objectName: 'Marker ' + n });
}
const iconCache = {};
async function icon(name, hex = HEX.white) {
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = renderToStaticMarkup(React.createElement(Lu[name], { size: 256, strokeWidth: 1.75 })).replace(/currentColor/g, '#' + hex);
    iconCache[key] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
  return iconCache[key];
}
async function iconDisc(s, name, x, y, d, o = {}) {
  if (o.halo) s.addShape(OVAL, { x: x - 0.1, y: y - 0.1, w: d + 0.2, h: d + 0.2, fill: { color: o.ring || LAV, transparency: 82 }, line: { type: 'none' }, objectName: 'Icon halo ' + name });
  s.addShape(OVAL, { x, y, w: d, h: d, fill: { color: o.fill || CARD, transparency: o.tr ?? 0 }, line: { color: o.ring || LAV, width: o.lw || 1.25, transparency: o.ltr ?? 30 }, objectName: 'Icon disc ' + name });
  const k = o.k || 0.5;
  s.addImage({ data: await icon(name, o.hex || HEX.lav), x: x + d * (1 - k) / 2, y: y + d * (1 - k) / 2, w: d * k, h: d * k, altText: '' });
}
// the live-demo cue: names the V11 screen the audience is about to see
function live(s, x, y, where) {
  const h = 0.44, seg = 0.42 + tw('LIVE', 12, true, 1) + 0.2, w = seg + 0.22 + tw(where, 14, false) + 0.26;
  s.addShape(RR, { x, y, w, h, rectRadius: h / 2, fill: { color: CARD, transparency: 5 }, line: { color: RED, width: 1, transparency: 20 }, objectName: 'Live demo cue' });
  s.addShape(RR, { x, y, w: seg, h, rectRadius: h / 2, fill: { color: RED }, line: { type: 'none' }, objectName: 'Live badge' });
  s.addShape(OVAL, { x: x + 0.18, y: y + h / 2 - 0.055, w: 0.11, h: 0.11, fill: { color: INK }, line: { type: 'none' }, objectName: 'Live dot' });
  T(s, 'LIVE', { x: x + 0.36, y, w: seg - 0.36, h, fontSize: 12, bold: true, charSpacing: 1, valign: 'middle', objectName: 'Live label' });
  T(s, where, { x: x + seg + 0.2, y, w: w - seg - 0.24, h, fontSize: 14, valign: 'middle', objectName: 'Live demo path' });
  return w;
}
// small caps label used above lists and inside panels
const label = (s, text, x, y, w, col = MUTED, o = {}) => T(s, text, Object.assign({ x, y, w, h: 0.26, fontSize: TS.micro, bold: true, color: col, charSpacing: 1.5, valign: 'middle' }, o));

async function graded(file) {
  const buf = await sharp(A(file)).modulate({ saturation: 0.72, brightness: 0.96 }).tint({ r: 150, g: 170, b: 230 }).jpeg({ quality: 88 }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}

// ---------- V11 screenshots ----------
const FRAME_W = f => (f.startsWith('V11-12') ? 1600 : 1400);
async function shot(frame, r, dispW) {
  const [x, y, w, h] = r.map(v => Math.round(v * 2));
  const width = Math.min(w, Math.round(dispW * 300));
  const buf = await sharp(A(`v11/${frame}.png`)).extract({ left: x, top: y, width: w, height: h }).resize({ width }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
// a V11 screen in a slim glass bezel inside viewfinder corners; returns a frame-px → slide-inch mapper
async function device(s, frame, x, y, w, alt, o = {}) {
  const r = [0, 0, FRAME_W(frame), 1069], pad = 0.06, iw = w - 2 * pad, ih = iw * r[3] / r[2], h = ih + 2 * pad;
  if (o.brackets !== false) brackets(s, x - 0.14, y - 0.14, w + 0.28, h + 0.28, { tr: 25 });
  s.addShape(RR, { x, y, w, h, rectRadius: 0.1, fill: { color: NAVY }, line: { color: LAV, width: 1, transparency: 55 }, shadow: shadow(30, 0.65, 10), objectName: 'Display bezel' });
  s.addImage({ data: await shot(frame, r, iw), x: x + pad, y: y + pad, w: iw, h: ih, altText: alt, objectName: 'V11 screen ' + frame.slice(0, 6) });
  const map = (fx, fy) => [x + pad + fx / r[2] * iw, y + pad + fy / r[3] * ih];
  return { x, y, w, h, map };
}
// magnified crop of the same screen, with a dashed outline where it comes from
async function lens(s, dev, frame, r, x, y, w, o = {}) {
  const pad = 0.04, iw = w - 2 * pad, ih = iw * r[3] / r[2], h = ih + 2 * pad;
  if (dev) {
    const [a, b] = dev.map(r[0], r[1]), [c, d] = dev.map(r[0] + r[2], r[1] + r[3]);
    s.addShape(RECT, { x: a, y: b, w: c - a, h: d - b, fill: { type: 'none' }, line: { color: LAV, width: 1.25, transparency: 25 }, objectName: 'Zoom source' });
  }
  s.addShape(RR, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, rectRadius: 0.1, fill: { color: LAV, transparency: 80 }, line: { type: 'none' }, objectName: 'Zoom glow' });
  s.addShape(RR, { x, y, w, h, rectRadius: 0.07, fill: { color: NAVY }, line: { color: LAV, width: 1.75 }, shadow: shadow(30, 0.75, 10), objectName: 'Zoom lens' });
  s.addImage({ data: await shot(frame, r, iw), x: x + pad, y: y + pad, w: iw, h: ih, altText: o.alt || '', objectName: 'Zoom ' + (o.name || frame.slice(0, 6)) });
  if (o.n) marker(s, o.nAt === 'tl' ? x + 0.06 : x + w - 0.06, y + 0.06, o.n);
  const map = (fx, fy) => [x + pad + (fx - r[0]) / r[2] * iw, y + pad + (fy - r[1]) / r[3] * ih];
  return { x, y, w, h, map };
}

// highlight a V11 element and tag it with its number; the tag sits beside the element
// (side l/r/t/b) or, with edge, on the bezel with a short leader, so it never hides the UI
function hl(s, dv, box, n, o = {}) {
  const [fx, fy, fw, fh] = box, p = 0.025, d = 0.34, g = 0.07;
  let [x1, y1] = dv.map(fx, fy), [x2, y2] = dv.map(fx + fw, fy + fh);
  x1 -= p; y1 -= p; x2 += p; y2 += p;
  if (o.box !== false) s.addShape(RR, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, rectRadius: 0.04, fill: { color: LAV, transparency: 84 }, line: { color: LAV, width: 1.5 }, objectName: 'Highlight ' + n });
  else s.addShape(RR, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, rectRadius: 0.04, fill: { type: 'none' }, line: { color: LAV, width: 1.5, dashType: 'dash' }, objectName: 'Highlight ' + n });
  const side = o.side || 'r', cx = o.at ?? (x1 + x2) / 2, cy = (y1 + y2) / 2;
  let mx, my;
  if (o.edge) {
    mx = side === 'l' ? dv.x : side === 'r' ? dv.x + dv.w : cx;
    my = side === 't' ? dv.y : side === 'b' ? dv.y + dv.h : cy;
    const ln = (ax, ay, bx, by) => s.addShape(LINE, { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay), line: { color: LAV, width: 1.5 }, objectName: 'Leader ' + n });
    if (side === 'l') ln(mx + d / 2, cy, x1, cy);
    if (side === 'r') ln(x2, cy, mx - d / 2, cy);
    if (side === 't') ln(mx, my + d / 2, mx, y1);
    if (side === 'b') ln(mx, y2, mx, my - d / 2);
  } else {
    mx = side === 'l' ? x1 - g - d / 2 : side === 'r' ? x2 + g + d / 2 : cx;
    my = side === 't' ? y1 - g - d / 2 : side === 'b' ? y2 + g + d / 2 : cy;
  }
  marker(s, mx, my, n, { d, pt: 14 });
}
// highlight box around a piece of V11 text, from its position in the frame
function ab(frame, needle, i = 0, o = {}) {
  const a = anchor(frame, needle, i), pad = o.pad ?? 5;
  return [a.x - pad, a.y - a.size * 0.95 - pad * 0.6, (o.w ?? rw(a.t, a.size)) + 2 * pad, a.size * 1.25 + pad * 1.2];
}

// ---------- layouts ----------
// Layouts carry only a background and placeholders: no footer text, logo or slide number.
const ph = (name, type, x, y, w, h, o) => ({ placeholder: { options: Object.assign({ name, type, x, y, w, h, margin: 0, valign: 'top', align: 'left', color: INK }, o), text: '' } });
const KICK = { fontSize: 12, bold: true, color: LAV };
pres.defineSlideMaster({
  title: 'COVER', background: { path: A('bg2_cover.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 2.0, 8.5, 0.4, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 2.5, 7.9, 2.4, { fontSize: TS.display, bold: true, lineSpacingMultiple: 0.9 }),
    ph('body', 'body', 0.6, 5.0, 6.6, 0.95, { fontSize: TS.lead, color: MUTED }),
  ],
});
pres.defineSlideMaster({
  title: 'SECTION', background: { path: A('bg2_section.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 2.3, 9, 0.4, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 2.78, 9.8, 1.0, { fontSize: TS.section, bold: true, lineSpacingMultiple: 0.92 }),
    ph('body', 'body', 0.6, 4.0, 7.2, 1.0, { fontSize: TS.lead, color: MUTED }),
  ],
});
pres.defineSlideMaster({
  title: 'CONTENT', background: { path: A('bg2_content.jpg') },
  objects: [ph('kicker', 'body', 0.6, 0.55, 10.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 12.1, 0.72, { fontSize: TS.title, bold: true })],
});
for (const [name, bg, x] of [['SCENE_R', 'bg2_scene_r.jpg', 0.6], ['SCENE_L', 'bg2_scene_l.jpg', 7.83]]) {
  pres.defineSlideMaster({
    title: name, background: { path: A(bg) },
    objects: [ph('kicker', 'body', x, 0.55, 4.9, 0.3, KICK), ph('title', 'title', x, 1.38, 4.9, 1.0, { fontSize: TS.scene, bold: true, lineSpacingMultiple: 0.95 })],
  });
}
pres.defineSlideMaster({
  title: 'MAP', background: { path: A('bg2_map.jpg') },
  objects: [ph('kicker', 'body', 0.6, 0.55, 6.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 5.6, 1.05, { fontSize: TS.title, bold: true, lineSpacingMultiple: 0.95 })],
});
pres.defineSlideMaster({
  title: 'PHOTO', background: { path: A('bg2_problem.jpg') },
  objects: [ph('kicker', 'body', 0.6, 1.2, 7, 0.35, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 1.65, 6.4, 2.6, { fontSize: 52, bold: true, lineSpacingMultiple: 0.92 }), ph('body', 'body', 0.6, 4.45, 5.6, 1.3, { fontSize: TS.lead, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'CLOSE', background: { path: A('bg2_close.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 3.4, 9, 0.35, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 3.85, 11.5, 1.65, { fontSize: 50, bold: true, lineSpacingMultiple: 0.95 }), ph('body', 'body', 0.6, 5.7, 10, 0.95, { fontSize: TS.lead, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'APPENDIX', background: { color: INK },
  objects: [
    ph('kicker', 'body', 0.6, 0.42, 10.5, 0.3, { fontSize: 12, bold: true, color: BLUE }), ph('title', 'title', 0.6, 0.74, 11.6, 0.72, { fontSize: 32, bold: true, color: NAVY }),
  ],
});

// ---------- scene slide (left/right mirrored) ----------
const TRACK = ['1', '2', '3', '4', '5', '6', '7', 'Ask', 'Report'];
async function scene(d) {
  const right = d.side !== 'left';
  const s = pres.addSlide({ masterName: right ? 'SCENE_R' : 'SCENE_L', sectionTitle: SEC.demo });
  const tx = right ? 0.6 : 7.83, w = 4.9;
  // where we are in the night: one segment per scene, the current one lit
  const sg = (w - 8 * 0.06) / 9, cur = TRACK.indexOf(d.step);
  for (const [i, k] of TRACK.entries()) {
    s.addShape(LINE, { x: tx + i * (sg + 0.06), y: 0.36, w: sg, h: 0, line: { color: i === cur ? LAV : INK, width: i === cur ? 3 : 2, transparency: i === cur ? 0 : i < cur ? 55 : 85 }, objectName: 'Night progress ' + k });
  }
  s.addText(d.kicker, { placeholder: 'kicker', charSpacing: 1.5 });
  fit(d.kicker + ' kicker', d.kicker, 12, true, 4.9, 0.3);
  let px = tx;
  if (d.sev) px += pill(s, px, 0.95, d.sev.toUpperCase(), SEV[d.sev][0], SEV[d.sev][1]) + 0.1;
  if (d.ask) pill(s, px, 0.95, d.ask.toUpperCase(), LAV, LAV, { tr: 86, line: LAV, ltr: 45 });
  fit(d.kicker + ' title', d.title, TS.scene, true, 4.9, 0.95, 1.0);
  s.addText(runs(d.title), { placeholder: 'title', charSpacing: -0.5 });
  // what Co-pilot says (the same words are on the V11 screen): fixed card, 3 lines max
  const cy = 2.45, qw = w - 0.5, plain = typeof d.quote === 'string' ? d.quote : d.quote.map(r => r.text).join('');
  fit(d.kicker + ' quote', plain, 16, false, qw, 3 * 0.27, 1.2);
  card(s, tx, cy, w, 1.5, { fill: CARD, tr: 12, line: LAV, ltr: 62, lw: 1, name: 'Co-pilot insight' });
  s.addImage({ data: await icon('LuSparkles', HEX.lav), x: tx + 0.25, y: cy + 0.2, w: 0.22, h: 0.22, altText: '' });
  label(s, d.quoteLabel || (d.conf ? `CO-PILOT  ·  ${d.conf}` : 'CO-PILOT'), tx + 0.56, cy + 0.18, 4.2, LAV);
  T(s, d.quote, { x: tx + 0.25, y: cy + 0.54, w: qw, h: 0.86, fontSize: 16, lineSpacingMultiple: 1.0 });
  // watch for: numbered like the tags on the screen, one line each
  label(s, 'WATCH FOR', tx, 4.16, 2);
  for (const [i, [lead, rest]] of d.watch.entries()) {
    const y = 4.55 + i * 0.47;
    marker(s, tx + 0.17, y + 0.15, i + 1, { d: 0.32, pt: 13 });
    fit(d.kicker + ' watch ' + (i + 1), lead + ' ' + rest, 16, false, w - 0.52, 0.3);
    T(s, [{ text: lead + ' ', options: { bold: true } }, { text: rest, options: { color: MUTED } }], { x: tx + 0.52, y: y - 0.01, w: w - 0.52, h: 0.32, fontSize: 16 });
  }
  live(s, tx, 6.02, d.live);
  await d.visual(s, right ? 5.95 : 0.6);
  s.addNotes(d.notes);
  return s;
}

// ---------- slides ----------
async function build() {
  let s;
  // 1 ── cover
  pres.addSection({ title: SEC.open });
  s = pres.addSlide({ masterName: 'COVER', sectionTitle: SEC.open });
  full(s, 'viz_cover.png', 'Hundreds of alarm dots narrowing into a single bright answer');
  s.addText('AGIL® SECURE ISMS V11  ·  AI CO-PILOT', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText([{ text: 'From alarms', options: { breakLine: true } }, { text: 'to answers', options: { color: LAV } }], { placeholder: 'title', charSpacing: -1.5 });
  s.addText('AI-orchestrated airport security, shown live on the system your teams already use.', { placeholder: 'body' });
  fit('cover body', 'AI-orchestrated airport security, shown live on the system your teams already use.', TS.lead, false, 6.6, 0.95);
  s.addShape(LINE, { x: 0.6, y: 6.28, w: 0.5, h: 0, line: { color: LAV, width: 2 }, objectName: 'Rule' });
  T(s, 'Live demonstration for Changi Airport Group  ·  October 2026', { x: 0.6, y: 6.45, w: 8, h: 0.3, fontSize: TS.small, color: MUTED });
  s.addNotes([
    'Good morning, and thank you for having us.',
    'Picture 2:14 in the morning at Changi. A staff door is tailgated, a fence is climbed and a bag is left at a gate, and each one is buried in more than a thousand alarms.',
    'Today we will show you how AGIL Secure V11, with an AI Co-pilot built in, turns those alarms into answers. Live, on the console your teams already use.',
  ].join('\n'));

  // 2 ── CAG priorities
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('WHY WE ARE HERE', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Built on your four priorities', { placeholder: 'title', charSpacing: -0.5 });
  const PRI = [
    ['LuSparkles', 'AI-powered\nAGIL® Secure', 'Correlation, co-pilot, automation, search, reports', 'Incidents explained, SOPs filled in', ['SCENES 1, 5–7\nASK · REPORT']],
    ['LuLuggage', 'Advanced\nvideo analytics', 'Left-behind bags linked to owners, no face recognition', 'A Gate B12 bag linked to its owner', ['SCENES 3, 4']],
    ['LuFence', 'AGIL Fence,\nfully unified', 'Fence alarms in one workflow, off the legacy platform', 'A fence climb verified by LiDAR and thermal', ['SCENE 2']],
    ['LuNetwork', 'Multi-site\ngovernance', 'One baseline across every site and vendor', 'Site context in V11, federated platform', ['PLATFORM']],
  ];
  const cw = (SW - 2 * MX - 3 * 0.25) / 4;
  for (const [i, [ic, ttl, asked, see, tags]] of PRI.entries()) {
    const x = MX + i * (cw + 0.25), y = 1.85, h = 4.95, iw = cw - 0.56;
    card(s, x, y, cw, h, { tr: 25, shadow: true, name: 'Priority ' + (i + 1) });
    T(s, '0' + (i + 1), { x: x + 0.28, y: y + 0.26, w: 1, h: 0.5, fontSize: 28, bold: true, color: LAV });
    s.addImage({ data: await icon(ic, HEX.lav), x: x + cw - 0.74, y: y + 0.32, w: 0.42, h: 0.42, altText: '' });
    fit('priority title ' + i, ttl, 20, true, iw, 0.68);
    T(s, runs(ttl), { x: x + 0.28, y: y + 0.98, w: iw, h: 0.7, fontSize: 20, bold: true, lineSpacingMultiple: 0.98 });
    label(s, 'YOU ASKED FOR', x + 0.28, y + 1.86, iw);
    fit('priority asked ' + i, asked, 16, false, iw, 0.82);
    T(s, asked, { x: x + 0.28, y: y + 2.16, w: iw, h: 0.84, fontSize: 16, color: MUTED });
    s.addShape(LINE, { x: x + 0.28, y: y + 3.1, w: iw, h: 0, line: { color: INK, width: 0.75, transparency: 85 }, objectName: 'Divider' });
    label(s, 'LIVE TODAY', x + 0.28, y + 3.22, iw, LAV);
    fit('priority see ' + i, see, 16, false, iw, 0.56);
    T(s, see, { x: x + 0.28, y: y + 3.52, w: iw, h: 0.84, fontSize: 16 });
    s.addShape(LINE, { x: x + 0.28, y: y + h - 0.6, w: iw, h: 0, line: { color: INK, width: 0.75, transparency: 85 }, objectName: 'Divider' });
    for (const t of tags) { const tl = nlines(t, 12.6, true, iw); label(s, runs(t), x + 0.28, y + h - 0.47 - (tl - 1) * 0.13, iw, LAV, { fontSize: 12, charSpacing: 1, h: 0.26 * tl }); }
  }
  s.addNotes([
    'When we last met, you shared four priorities. An AI-powered AGIL Secure. Video analytics that respect privacy. AGIL Fence, fully unified. And one governance model across all your sites.',
    'We built today around them. Each live scene carries a tag that shows which priority it answers, so you can hold us to it.',
  ].join('\n'));

  // 3 ── the problem
  s = pres.addSlide({ masterName: 'PHOTO', sectionTitle: SEC.open });
  s.addText('ONE NIGHT SHIFT, WITHOUT AI', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText([{ text: '1,248', options: { color: RED } }, { text: ' alarms.', options: { breakLine: true } }, { text: 'Nine systems.', options: { breakLine: true } }, { text: 'One operator.' }], { placeholder: 'title', charSpacing: -1 });
  fit('problem title', '1,248 alarms. Nine systems. One operator.', 52, true, 6.4, 2.6, 0.95);
  s.addText('Operators join the dots by hand. Speed and quality depend on who is on shift.', { placeholder: 'body' });
  fit('problem body', 'Operators join the dots by hand. Speed and quality depend on who is on shift.', TS.lead, false, 5.6, 1.3);
  // two staggered columns: A from x 6.9, B right-aligned to the margin
  const Q = [['Real alarm, or another nuisance?', 'A', 1.35], ['Is the fence alarm related?', 'B', 2.13], ['Which camera covers D-214?', 'A', 2.91],
    ['Who left the bag at B12?', 'B', 3.69], ['Which SOP applies here?', 'A', 4.47], ['Who do I call first?', 'B', 5.25]];
  for (const [q, col, y] of Q) {
    const w = tw(q, 16, false) + 0.84, x = col === 'A' ? 6.9 : RX - 0.1 - w;
    s.addShape(RR, { x, y, w, h: 0.56, rectRadius: 0.28, fill: { color: NAVY, transparency: 18 }, line: { color: INK, width: 0.75, transparency: 70 }, shadow: shadow(16, 0.55, 5), objectName: 'Operator question' });
    s.addShape(OVAL, { x: x + 0.24, y: y + 0.22, w: 0.12, h: 0.12, fill: { color: RED }, line: { type: 'none' }, objectName: 'Alarm dot' });
    T(s, q, { x: x + 0.5, y, w: w - 0.6, h: 0.56, fontSize: 16, valign: 'middle', objectName: 'Operator question text' });
  }
  T(s, 'Figures from tonight’s demo scenario.', { x: MX, y: 6.62, w: 6, h: 0.28, fontSize: 12, color: MUTED });
  s.addNotes([
    'Here is a night shift as it runs today. More than twelve hundred alarms in one night, from nine separate systems, each on its own screen. And one operator in the middle.',
    'That operator joins the dots by hand. Is this a real alarm, or another nuisance? Is the fence alarm related to the door? Which camera covers D-214? Which SOP applies? Who do I call first?',
    'So the outcome depends on who happens to be on shift. These figures come from our demo scenario, but the pattern will be familiar.',
  ].join('\n'));

  // 4 ── same console, now with Co-pilot
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('THE ANSWER', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('The same V11 console. Now it thinks with you', { placeholder: 'title', charSpacing: -0.5 });
  fit('slide4 title', 'The same V11 console. Now it thinks with you', TS.title, true, 12.1, 0.72, 1.0);
  {
    const F = 'V11-01-home-real-time-alerts';
    const dv = await device(s, F, 6.53, 1.95, 6.2, 'AGIL Secure V11 home screen: Real Time Alerts with Co-pilot lines, the airport in 3D with incident pins, and the search bar');
    await lens(s, dv, F, [44, 312, 300, 104], 6.76, 5.2, 3.3, { n: 1, alt: 'The Staff Door D-214 alert card with its Co-pilot line: 5 linked alarms, 94%' });
    marker(s, ...dv.map(1110, 455), 2);
    hl(s, dv, ab(F, 'Search or ask', 0, { pad: 8 }), 3, { side: 't', edge: true });
    hl(s, dv, [94, 132, 236, 24], 4, { side: 'l', edge: true });
    const F4 = [['Every alert explained', 'Linked alarms and confidence on each card.'],
      ['Located in 3D', 'Incidents pinned on the airport.'],
      ['Ask in plain English', 'The search bar answers, with sources.'],
      ['Ranked by risk', 'Critical, Warning, Info: the next click is obvious.']];
    let y = 2.0;
    for (const [i, [lead, rest]] of F4.entries()) {
      marker(s, MX + 0.17, y + 0.17, i + 1, { d: 0.34, pt: 14 });
      T(s, lead, { x: MX + 0.56, y: y - 0.02, w: 5.0, h: 0.38, fontSize: 20, bold: true });
      fit('slide4 f' + i, rest, 16, false, 5.0, 0.3);
      T(s, rest, { x: MX + 0.56, y: y + 0.38, w: 5.0, h: 0.32, fontSize: 16, color: MUTED });
      y += 0.92;
    }
    card(s, MX, 5.8, 5.5, 0.88, { fill: LAV, tr: 88, line: LAV, ltr: 60, lw: 1, name: 'No new system' });
    s.addImage({ data: await icon('LuCircleCheck', HEX.lav), x: MX + 0.24, y: 6.06, w: 0.36, h: 0.36, altText: '' });
    T(s, [{ text: 'Nothing new to learn', options: { bold: true, color: LAV, breakLine: true } }, { text: 'Same screens, same buttons, same workflow.', options: { fontSize: 15 } }], { x: MX + 0.76, y: 5.8, w: 4.66, h: 0.88, fontSize: 17, valign: 'middle' });
  }
  s.addNotes([
    'Our answer is not another screen. It is the V11 console your teams already know, now with answers built in.',
    'Every alert card explains itself: how many alarms were linked, and how confident Co-pilot is. Incidents are pinned on the 3D airport. The search bar answers questions in plain English. And everything stays ranked by risk.',
    'Same layout, same buttons, same workflow. There is nothing new to learn.',
  ].join('\n'));

  // 5 ── how it works
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('HOW CO-PILOT WORKS', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Six steps. Co-pilot runs five. You make the call', { placeholder: 'title', charSpacing: -0.5 });
  full(s, 'viz_flow.png');
  const STEPS = [['LuRadar', 'Detect', 'Every sensor, every second'], ['LuGitMerge', 'Correlate', 'Time, place, person, badge'],
    ['LuSparkles', 'Explain', 'What, why, and the sources'], ['LuListChecks', 'Recommend', 'Your own SOP, pre-filled'],
    ['LuHand', 'You decide', 'Approve, adjust or dismiss'], ['LuFileCheck', 'Report', 'Drafted, and learns from you']];
  const sx0 = 1.55, sdx = 2.0466, scy = 2.75, sd = 1.15;
  for (const [i, [ic, lab, sub]] of STEPS.entries()) {
    const cx = sx0 + i * sdx, human = lab === 'You decide';
    await iconDisc(s, ic, cx - sd / 2, scy - sd / 2, sd, human ? { fill: LAV, tr: 0, ring: INK, ltr: 10, hex: HEX.navy, k: 0.46 } : { fill: NAVY, tr: 0, ring: LAV, ltr: 40, k: 0.44 });
    T(s, lab, { x: cx - 0.95, y: scy + sd / 2 + 0.26, w: 1.9, h: 0.4, fontSize: 20, bold: true, align: 'center', color: human ? LAV : INK });
    fit('step ' + lab, sub, 16, false, 1.9, 0.56);
    T(s, sub, { x: cx - 0.95, y: scy + sd / 2 + 0.7, w: 1.9, h: 0.58, fontSize: 16, color: MUTED, align: 'center' });
  }
  s.addShape(LINE, { x: SW / 2 - 0.4, y: 5.38, w: 0.8, h: 0, line: { color: LAV, width: 2 }, objectName: 'Rule' });
  T(s, [{ text: 'Steps 1–4 take seconds. ' }, { text: 'Step 5 is always a person.', options: { color: LAV, bold: true } }], { x: MX, y: 5.6, w: SW - 2 * MX, h: 0.5, fontSize: 24, align: 'center', valign: 'middle' });
  T(s, 'Every decision is logged, and every answer shows its sources.', { x: MX, y: 6.15, w: SW - 2 * MX, h: 0.36, fontSize: 16, color: MUTED, align: 'center' });
  s.addNotes([
    'Here is how it works. Co-pilot detects across every sensor. It correlates alarms by time, place, person and credential. It explains what happened, with its sources. And it recommends your own SOP, filled in for this case.',
    'Then it stops. Step five is always a person: approve, adjust or dismiss, and every decision is logged.',
    'Afterwards Co-pilot drafts the report and learns from your team’s feedback. Steps one to four take seconds. Step five stays with your people.',
  ].join('\n'));

  // 6 ── tonight's cast
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('TONIGHT’S NIGHT SHIFT', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Four people. One Co-pilot', { placeholder: 'title', charSpacing: -0.5 });
  const CAST = [['nurul', 'Nurul', 'Control room operator', 'Works 7 incidents, not 1,248 raw alarms.', 'Every scene'],
    ['daniel', 'Daniel', 'Duty security manager', 'Asks in plain English; answers cite sources.', '02:30 · Ask'],
    ['arjun', 'Arjun', 'Patrol officer', 'Gets the follower’s photo on his phone.', 'Scenes 1, 3'],
    ['grace', 'Grace', 'Head of security', 'Signs off the AI-drafted report at 07:00.', '07:00 · Handover']];
  for (const [i, [key, nm, role, line, tag]] of CAST.entries()) {
    const x = MX + i * (cw + 0.25), y = 1.85, h = 4.95, iw = cw - 0.56;
    card(s, x, y, cw, h, { tr: 25, shadow: true, name: 'Persona ' + nm });
    s.addImage({ data: await graded(`persona_${key}.jpg`), x: x + 0.08, y: y + 0.08, w: cw - 0.16, h: 2.3, sizing: { type: 'cover', w: cw - 0.16, h: 2.3 }, altText: `${nm}, ${role.toLowerCase()}, seen from behind at work`, objectName: 'Portrait ' + nm });
    brackets(s, x + 0.2, y + 0.2, cw - 0.4, 2.06, { col: INK, tr: 35, arm: 0.18, lw: 1.25 });
    T(s, nm, { x: x + 0.28, y: y + 2.6, w: iw, h: 0.42, fontSize: 22, bold: true });
    T(s, role, { x: x + 0.28, y: y + 3.04, w: iw, h: 0.3, fontSize: 15, color: LAV, bold: true });
    fit('cast ' + nm, line, 16, false, iw, 0.56);
    T(s, line, { x: x + 0.28, y: y + 3.45, w: iw, h: 0.86, fontSize: 16, color: MUTED });
    label(s, tag.toUpperCase(), x + 0.28, y + h - 0.47, iw, LAV, { fontSize: 12, charSpacing: 1 });
  }
  s.addNotes([
    'Tonight you will meet four people. Nurul runs the V11 console. Daniel, the duty manager, asks Co-pilot questions in plain English. Arjun is on patrol with the responder app. And Grace, head of security, signs off the report at the seven o’clock handover.',
    'Watch how each of their jobs gets easier.',
  ].join('\n'));

  // 7 ── divider: live demo
  pres.addSection({ title: SEC.demo });
  s = pres.addSlide({ masterName: 'SECTION', sectionTitle: SEC.demo });
  s.addText('LIVE DEMO', { placeholder: 'kicker', charSpacing: 1.5 });
  T(s, '02:14', { x: 5.73, y: 0.35, w: 7.0, h: 2.4, fontSize: 160, bold: true, color: LAV, transparency: 86, charSpacing: -4, align: 'right', objectName: 'Night clock' });
  s.addText('Let’s run a night shift, live', { placeholder: 'title', charSpacing: -1 });
  s.addText('Seven scenarios on the real V11 system. The numbered tags on each slide match the screen, in order.', { placeholder: 'body' });
  fit('divider body', 'Seven scenarios on the real V11 system. The numbered tags on each slide match the screen, in order.', TS.lead, false, 7.2, 1.0);
  pill(s, 0.6, 5.75, '●  OVER TO THE LIVE SYSTEM', LAV, LAV, { tr: 86, line: LAV, ltr: 40, pt: 12, h: 0.44, padX: 0.5, cs: 1.5 });
  s.addNotes([
    'Now let us see it on the real system. My colleague is at the V11 console, and every slide that follows shows the screen you are about to see.',
    'The numbered tags on each slide match what happens on screen, in the same order.',
  ].join('\n'));

  // 8 ── demo map: the airport twin is a picture; every pin, number and label on it is native
  s = pres.addSlide({ masterName: 'MAP', sectionTitle: SEC.demo });
  s.addText('02:14  ·  ONE NIGHT AT THE AIRPORT', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText(runs('Seven incidents.\nAlready ranked.'), { placeholder: 'title', charSpacing: -0.5 });
  label(s, 'RANKED BY CO-PILOT', MX, 2.02, 2.2);
  { let cx2 = MX + 2.15; for (const [t, sv] of [['2 CRITICAL', 'Critical'], ['4 WARNING', 'Warning'], ['1 INFO', 'Info']]) cx2 += pill(s, cx2, 2.0, t, SEV[sv][0], SEV[sv][1], { h: 0.3 }) + 0.08; }
  {
    const mw = 12.4, mh = mw / GEO.twin.aspect, mx0 = SW - mw + 0.35, my0 = 0.45;
    s.addImage({ path: A('viz_twin.png'), x: mx0, y: my0, w: mw, h: mh, altText: 'The airport as a 3D digital twin: five terminals, two runways and the north perimeter fence', objectName: 'Airport twin' });
    const at = ([fx, fy]) => [mx0 + fx * mw, my0 + fy * mh];
    for (const l of GEO.twin.labels) {
      const [lx, ly] = at(l.at);
      s.addText(l.id, { shape: RR, x: lx - 0.22, y: ly - 0.15, w: 0.44, h: 0.3, rectRadius: 0.08, fill: { color: CARD, transparency: 10 }, line: { color: INK, width: 0.5, transparency: 70 }, color: INK, fontSize: TS.micro, bold: true, align: 'center', valign: 'middle', margin: 0, objectName: 'Terminal ' + l.id });
    }
    const rx = GEO.twin.ring.rx * mw, ry = GEO.twin.ring.ry * mh;
    for (const p of [...GEO.twin.pins].sort((a, b) => a.base[1] - b.base[1])) {
      const col = SEV[p.sev][0], [bx, by] = at(p.base), [hx, hy] = at(p.head), d = 0.36, lift = p.n === 7 ? 0.75 : p.n === 4 ? 0.5 : 0.32;
      s.addShape(OVAL, { x: bx - rx * 1.6, y: by - ry * 1.6, w: rx * 3.2, h: ry * 3.2, fill: { color: col, transparency: 70 }, line: { color: col, width: 1.25 }, objectName: 'Pin ring ' + p.n });
      s.addShape(LINE, { x: bx, y: hy - lift + d / 2, w: 0, h: by - (hy - lift + d / 2), line: { color: col, width: 1.5 }, objectName: 'Pin stem ' + p.n });
      s.addShape(OVAL, { x: hx - d / 2 - 0.08, y: hy - lift - d / 2 - 0.08, w: d + 0.16, h: d + 0.16, fill: { color: col, transparency: 65 }, line: { type: 'none' }, objectName: 'Pin halo ' + p.n });
      s.addText(String(p.n), { shape: OVAL, x: hx - d / 2, y: hy - lift - d / 2, w: d, h: d, fill: { color: col }, line: { color: INK, width: 1.5 }, color: SEV[p.sev][1], bold: true, fontSize: 14, align: 'center', valign: 'middle', margin: 0, objectName: 'Pin ' + p.n });
    }
  }
  const MAP = [['Tailgating + anti-passback', '02:14  ·  T3 Staff Door D-214', 'Critical'], ['Perimeter intrusion', '02:15  ·  Fence Sector 5, north', 'Critical'],
    ['Unattended bag', '02:04  ·  T2 Gate B12', 'Warning'], ['Fight detected', '02:11  ·  T2 Arrival Belt 5', 'Warning'],
    ['Identity spoofing', '02:13  ·  T1 Door C2', 'Warning'], ['Overstay in a restricted zone', '01:45  ·  T4 Baggage Hall B2', 'Info'],
    ['Watchlist person loitering', '02:12  ·  T1 Departure Row K', 'Warning']];
  for (const [i, [nm, sub, sev]] of MAP.entries()) {
    const y = 2.55 + i * 0.54;
    s.addText(String(i + 1), { shape: OVAL, x: MX, y: y + 0.03, w: 0.38, h: 0.38, fill: { color: SEV[sev][0] }, line: { color: INK, width: 1 }, color: SEV[sev][1], bold: true, fontSize: 14, align: 'center', valign: 'middle', margin: 0, objectName: 'Scene pin ' + (i + 1) });
    T(s, nm, { x: MX + 0.56, y: y - 0.04, w: 4.6, h: 0.3, fontSize: 17, bold: true });
    T(s, sub, { x: MX + 0.56, y: y + 0.27, w: 4.6, h: 0.24, fontSize: 13, color: MUTED });
  }
  live(s, MX, 6.45, 'Home  ›  Real Time Alerts');
  s.addNotes([
    'It is 2:14 in the morning, and seven situations are unfolding across the airport, from a tailgated staff door in Terminal 3 to a fence climb on the north perimeter.',
    'Before anyone touches a button, Co-pilot has ranked them: two Critical, four Warning and one Info. At 2:30 the duty manager asks a question, and by seven o’clock the report is ready for handover.',
    'We start with the most urgent.',
  ].join('\n'));

  // 9–19 ── scenes: device at y DY; markers sit beside or on the bezel, never on the UI they point at
  const F02 = 'V11-02-tailgating-investigation', F03 = 'V11-03-tailgating-sop-flow-door-control', F04 = 'V11-04-identity-spoofing-investigation',
    F05 = 'V11-05-unattended-bag-sop-flow', F06 = 'V11-06-watchlist-loitering-sop-verify', F07 = 'V11-07-fight-detection-investigation',
    F08 = 'V11-08-overstay-investigation', F09 = 'V11-09-agil-fence-lidar-investigation', F10 = 'V11-10-escalate-event-copilot-prefill',
    F11 = 'V11-11-search-ask-copilot', F12 = 'V11-12-incident-management-report';
  const CAM1 = [916, 296, 210, 248], CAM2 = [1134, 296, 210, 120], CAM3 = [1134, 424, 210, 120];
  const DY = 1.12, DW = 6.78;

  await scene({
    kicker: 'SCENE 1  ·  02:14  ·  T3 STAFF DOOR D-214', step: '1', sev: 'Critical', ask: 'Priority 1 · Correlation', conf: '94% CONFIDENCE',
    title: '5 alarms. 1 incident.\nExplained.',
    quote: 'Two people, one badge at D-214. The follower has no credential and is heading airside to Pier C.',
    watch: [['Co-pilot line:', '5 linked alarms, 94%'], ['Evidence:', 'follower boxed “No badge”'], ['Linked alarms:', 'badge, door, LiDAR, video']],
    live: 'Real Time Alerts  ›  Staff Door D-214',
    visual: async (s, vx) => {
      const dv = await device(s, F02, vx, DY, DW, 'V11 Active Alarms for Staff Door D-214 on the Investigation tab: AI summary, linked alarms and camera evidence');
      hl(s, dv, ab(F02, 'Co-pilot · 5 linked'), 1, { side: 'l', edge: true });
      await lens(s, dv, F02, CAM1, 7.78, 1.72, 2.3, { n: 2, alt: 'Camera 3-118 at Door D-214: badge holder and follower, the follower boxed in red as No badge' });
      hl(s, dv, ab(F02, '+2 more'), 3, { side: 'r', edge: true });
    },
    notes: [
      'Staff Door D-214, Terminal 3. Five separate alarms fire within seconds: a badge read, the door opening, a LiDAR count of two people, a video alert and the door held open.',
      'Co-pilot links all five into one incident and explains it in a single sentence: one badge, two people, and the follower has no credential and is heading airside.',
      'Here is the evidence: the follower, boxed on camera as No badge. And here are the linked alarms behind that conclusion. Seconds, not minutes.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 1  ·  02:17  ·  RESPOND', step: '1', sev: 'Critical', ask: 'Priority 1 · Automation',
    title: 'Co-pilot prepares.\nYou approve.',
    quote: 'SOP-SEC-014 pre-filled. Step 1 done: the follower is verified on three cameras. Step 2 needs your approval.',
    watch: [['Done by Co-pilot:', 'step 1, follower tracked'], ['Your approval:', 'lock D-214'], ['Dispatch:', 'Arjun gets the photo']],
    live: 'SOP Flow  ›  Lock',
    visual: async (s, vx) => {
      const dv = await device(s, F03, vx, DY, DW, 'V11 SOP Flow for D-214 with the Critical Action step and door buttons; the 3D Locate view shows D-214 locked by the operator');
      hl(s, dv, ab(F03, 'Done by Co-pilot', 0, { pad: 8 }), 1, { side: 'r', edge: true });
      await lens(s, dv, F03, [916, 698, 428, 126], 0.78, 4.95, 4.1, { n: 2, alt: 'Critical Action Required: lock D-214 and switch on hard anti-passback, with Lock, Secure and Normal buttons' });
      hl(s, dv, ab(F03, 'Dispatch patrol'), 3, { side: 'r', edge: true });
    },
    notes: [
      'Now the response. Co-pilot has loaded your own SOP and already completed step one: the follower is verified and tracked across three cameras.',
      'Step two needs a person: lock D-214 and switch on hard anti-passback. One click, and the operator makes it.',
      'At the same moment, Arjun on patrol receives the follower’s photo on his phone. Co-pilot prepares. The operator decides.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 1  ·  02:18  ·  ESCALATE', step: '1', sev: 'Critical', ask: 'Priority 1 · Automation',
    title: 'Escalated in one click,\nalready filled in',
    quote: 'Category, severity and remarks are pre-filled from the investigation. Edit anything, then create the incident.',
    watch: [['Category:', 'unauthorised airside entry'], ['Severity:', 'Critical, from the evidence'], ['Remarks:', 'drafted, and editable']],
    live: 'Escalate  ›  Create Incident',
    visual: async (s, vx) => {
      const dv = await device(s, F10, vx, DY, DW, 'V11 Escalate Event dialog with Category, Severity and Remarks pre-filled by Co-pilot');
      const ln = await lens(s, dv, F10, [391, 488, 618, 222], 6.55, 4.62, 5.6, { alt: 'Escalate Event form: Category Unauthorised airside entry, Severity Critical, Remarks drafted by Co-pilot' });
      hl(s, ln, [397, 492, 296, 70], 1, { side: 'l', box: false });
      hl(s, ln, [706, 492, 296, 70], 2, { side: 'r', box: false });
      hl(s, ln, [397, 596, 608, 106], 3, { side: 'r', box: false });
    },
    notes: [
      'Escalating used to mean retyping everything into another form. Now the Escalate dialog your team already uses comes pre-filled: the category, the severity and the remarks, all drafted from the investigation.',
      'The operator checks it, edits anything they want, and creates the incident. One click.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 2  ·  02:15  ·  FENCE SECTOR 5', step: '2', sev: 'Critical', ask: 'Priority 3 · AGIL Fence', conf: '91% CONFIDENCE',
    title: 'A real intruder,\nnot the wind',
    quote: 'Climb on segment 5-14. LiDAR: one 1.7 m object. Thermal: one person. Wind is 12 km/h, so not a nuisance.',
    watch: [['One alert list:', 'no separate fence platform'], ['LiDAR:', 'one object, 1.7 m tall'], ['Thermal PTZ:', 'one person at the fence']],
    live: 'Fence Sector 5  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F09, vx, DY, DW, 'V11 Active Alarms for Fence Sector 5: LiDAR point cloud, thermal PTZ view and linked alarms');
      hl(s, dv, ab(F09, 'fence + LiDAR'), 1, { side: 'l', edge: true });
      await lens(s, dv, F09, [1150, 300, 180, 104], 2.35, 1.72, 2.45, { n: 2, alt: 'LiDAR L-5B point cloud: one human-sized cluster at the fence' });
      await lens(s, dv, F09, CAM1, 2.35, 3.3, 2.45, { n: 3, alt: 'PTZ 7-02 thermal view: one person at the fence, boxed Person 1.7 m' });
    },
    notes: [
      'Your third priority: AGIL Fence, fully unified. At 2:15 the fence detects a climb on segment 5-14, and it lands in the same alert list as everything else, not on a separate platform.',
      'Is it real? LiDAR sees one object, 1.7 metres tall, right at the fence. The PTZ camera turns by itself, and thermal shows one person. With the wind at 12 kilometres an hour, Co-pilot rules out a nuisance alarm.',
      'Earlier tonight three fence alarms turned out to be wind and wildlife. Co-pilot closed those with reasons, so the operator acts only on the real intruder.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 3  ·  02:04  ·  T2 GATE B12', step: '3', sev: 'Warning', ask: 'Priority 2 · Video analytics', conf: '88% CONFIDENCE',
    title: 'Bag and owner linked\nin 6 seconds',
    quote: 'Suitcase unattended since 02:04. Its owner left it at 01:58 and is now at Food Court L3. Found in 6.2 s.',
    watch: [['Person–object link:', 'placed at 01:58'], ['Owner found:', 'by clothing, not face'], ['You decide:', 'approve sending Arjun']],
    live: 'Gate B12 Holdroom  ›  SOP Flow',
    visual: async (s, vx) => {
      const dv = await device(s, F05, vx, DY, DW, 'V11 SOP Flow for the unattended bag at Gate B12: steps 1 to 4 done by Co-pilot, step 5 awaiting approval; cameras show the bag and its owner');
      await lens(s, dv, F05, CAM2, 7.75, 1.72, 2.5, { n: 1, alt: 'Camera 2-031 at 01:58: the owner placing the bag' });
      await lens(s, dv, F05, CAM3, 7.75, 3.33, 2.5, { n: 2, alt: 'Camera 2-077 now: the owner at Food Court L3, boxed Owner' });
      hl(s, dv, ab(F05, 'Approve', 0, { pad: 14 }), 3, { side: 'b', edge: true });
    },
    notes: [
      'Your second priority: video analytics that respect privacy. A suitcase has been left at Gate B12.',
      'Co-pilot links the bag to the person who placed it at 1:58, follows that person by clothing and belongings across four cameras, with no face matching, and finds them at the Food Court on Level 3.',
      'Steps one to four took 6.2 seconds. Step five, sending Arjun to speak to the owner, is the operator’s decision.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 4  ·  02:11  ·  T2 ARRIVAL BELT 5', step: '4', sev: 'Warning', ask: 'Priority 2 · Video analytics', conf: '78% CONFIDENCE',
    title: 'Seen and heard\nbefore it escalates',
    quote: 'Arguing turned to pushing at Belt 5. Pose analytics and the intercom microphone agree. Nobody is on the ground.',
    watch: [['Pose analytics:', 'aggression 0.89'], ['Intercom audio:', 'raised voices, 30 s earlier'], ['Responders:', 'officers at 40 m and 90 m']],
    live: 'Arrival Hall Belt 5  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F07, vx, DY, DW, 'V11 Active Alarms for Arrival Hall Belt 5: camera with aggression box, linked audio and video alarms');
      await lens(s, dv, F07, CAM1, 2.6, 1.72, 2.3, { n: 1, alt: 'Camera 1-142 at Belt 5: two passengers boxed Aggression 0.89' });
      hl(s, dv, ab(F07, 'Raised voices'), 2, { side: 'r', edge: true });
      hl(s, dv, ab(F07, 'Nearest officers'), 3, { side: 'r', edge: true });
    },
    notes: [
      'Arrival Hall, Belt 5. Pose analytics sees two passengers go from arguing to pushing, with an aggression score of 0.89. The intercom microphone picked up raised voices thirty seconds earlier.',
      'Two independent sensors agree, so this is a real incident, not a false alarm. And Co-pilot already shows the nearest officers, 40 and 90 metres away, so the team can step in before anyone gets hurt.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 5  ·  02:13  ·  T1 DOOR C2', step: '5', sev: 'Warning', ask: 'Priority 1 · Access intelligence', conf: '82% CONFIDENCE',
    title: 'One card, two doors,\nfour minutes',
    quote: 'Card S-20931 opened A17 at 02:09 and C2 at 02:13: a 19-minute route. The person at C2 is not the holder.',
    watch: [['Impossible travel:', '4 min vs 19 min'], ['Not the holder:', 'C2 and A17 compared'], ['Legacy card ID:', 'old SSID still active']],
    live: 'T1 Door C2  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F04, vx, DY, DW, 'V11 Active Alarms for T1 Door C2: cameras at C2 and A17, appearance check and linked access alarms');
      hl(s, dv, ab(F04, 'Same card used', 1), 1, { side: 'r', edge: true });
      await lens(s, dv, F04, CAM1, 6.15, 1.72, 2.0, { n: 2, alt: 'Camera 1-204 at Door C2: the person is boxed Not the holder' });
      await lens(s, dv, F04, CAM2, 8.35, 1.72, 1.8, { alt: 'Camera 3-052 at Door A17 at 02:09: the cardholder' });
      await lens(s, dv, F04, CAM3, 8.35, 2.98, 1.8, { alt: 'Appearance check: the person at C2 against the cardholder, 31% similar' });
      hl(s, dv, ab(F04, 'legacy SSID', 1), 3, { side: 'r', edge: true });
    },
    notes: [
      'Now, access intelligence. Card S-20931 opened Door A17 in Terminal 3 at 2:09, and Door C2 in Terminal 1 just four minutes later. The fastest route between them takes nineteen.',
      'The cameras at both doors, side by side, show that it is not the same person.',
      'And Co-pilot shows why it happened: C2 was opened with the card’s old ID, which should have been revoked when the card was re-issued. Validate the context, not only the card.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 6  ·  01:45  ·  T4 BAGGAGE HALL B2', step: '6', sev: 'Info', ask: 'Priority 1 · Access intelligence', conf: '73% CONFIDENCE',
    title: 'Your own rules,\nnow running live',
    quote: 'K. Lim has been in B2 since 22:36. The shift ended at 01:00, B2 is outside K. Lim’s duties, and there is no overtime.',
    watch: [['Your rules:', '4 of 5 triggered'], ['Context:', 'roster checked, no overtime'], ['Right urgency:', 'Info, a radio check']],
    live: 'Baggage Hall B2  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F08, vx, DY, DW, 'V11 Active Alarms for Baggage Hall B2: overstay with the airport rules that triggered');
      await lens(s, dv, F08, [916, 738, 428, 112], 0.78, 5.0, 4.1, { n: 1, alt: 'Airport rules triggered: restricted zone in wee hours, outside scope of duty, non-working hours, dwell 3h 40m against 45 min usual' });
      hl(s, dv, ab(F08, 'In zone since'), 2, { side: 'r', edge: true });
      hl(s, dv, ab(F08, 'Baggage Hall B2'), 3, { side: 'l', edge: true });
    },
    notes: [
      'Five years ago, CAG specified business-analytics rules: restricted areas in the small hours, zones outside someone’s duties, and dwell time beyond their usual pattern. Those rules now run live in Co-pilot.',
      'K. Lim has been in Baggage Hall B2 for three hours and forty minutes, after the shift ended, with no overtime request. Four of your rules have triggered.',
      'Co-pilot rates it Info: a radio check, not an alarm storm. The right urgency for the right event.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 7  ·  02:12  ·  T1 DEPARTURE ROW K', step: '7', sev: 'Warning', ask: 'Priority 1 · Governed AI', conf: 'VERIFY MATCH FIRST',
    title: 'Sensitive calls\nstay human',
    quote: 'Possible watchlist match: 23 min loitering, three staff-door approaches. Nothing happens until you confirm.',
    watch: [['Behaviour first:', '23 min, 3 approaches'], ['Side by side:', 'live capture, reference'], ['Your call:', 'confirm or reject, logged']],
    live: 'Departure Hall Row K  ›  SOP Flow',
    visual: async (s, vx) => {
      const dv = await device(s, F06, vx, DY, DW, 'V11 SOP Flow for Departure Hall Row K: verification step first, with live capture and watchlist reference');
      hl(s, dv, ab(F06, 'Approached staff door'), 1, { side: 'r', edge: true });
      await lens(s, dv, F06, [1134, 296, 210, 248], 7.85, 1.72, 2.2, { n: 2, alt: 'Live capture at 02:12 shown above the watchlist reference image' });
      await lens(s, dv, F06, [916, 634, 428, 126], 6.15, 4.6, 4.0, { n: 3, alt: 'Critical Action Required: verify first, with Confirm match and Not a match buttons' });
    },
    notes: [
      'The most sensitive case. At Departure Row K, someone has loitered for 23 minutes, approached a staff door three times, and may match a watchlist entry.',
      'Co-pilot puts the live capture next to the reference image, and then it stops. Nothing happens until the operator confirms or rejects the match, and that decision is logged.',
      'Whether watchlist matching is used at all is your policy. Sensitive calls stay human.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: '02:30  ·  THE DUTY MANAGER ASKS', step: 'Ask', ask: 'Priority 1 · Natural language',
    title: 'Ask in\nplain English',
    quoteLabel: 'DANIEL ASKS  ·  CO-PILOT ANSWERS',
    quote: [{ text: '“Show critical incidents in Terminal 5 in the last hour.” ', options: { bold: true } }, { text: 'Two: one open and awaiting a decision, one closed as wildlife.', options: { color: MUTED } }],
    watch: [['Ask:', 'type into the search bar'], ['Answer:', 'one line, plus the alerts'], ['Sources:', 'event log, SOP, cameras']],
    live: 'Search bar  ›  ask in plain English',
    visual: async (s, vx) => {
      const dv = await device(s, F11, vx, DY, DW, 'V11 search bar with a Co-pilot question and the answer dropdown listing two critical incidents in Terminal 5 with sources');
      hl(s, dv, ab(F11, 'Show critical incidents', 0, { pad: 10 }), 1, { side: 't', edge: true });
      await lens(s, dv, F11, [440, 92, 655, 108], 1.0, 4.95, 5.6, { n: 2, alt: 'Co-pilot answer: two critical incidents in Terminal 5 in the last hour; one open, one closed as wildlife' });
      hl(s, dv, ab(F11, 'Sources:'), 3, { side: 'r', edge: true });
    },
    notes: [
      '2:30. Daniel, the duty manager, does not want to click through screens. He simply asks: show critical incidents in Terminal 5 in the last hour.',
      'Co-pilot answers in one line, lists the matching alerts, and cites its sources: the event log, the SOP section and the cameras. Follow-up questions are one click away.',
    ].join('\n'),
  });

  await scene({
    kicker: '07:00  ·  HANDOVER', step: 'Report', ask: 'Priority 1 · Reporting',
    title: 'The report\nwrites itself',
    quoteLabel: 'CO-PILOT REPORT DRAFT',
    quote: 'Follower entered airside on badge B-55821, intercepted at L2-East at 02:21. Root cause: courtesy tailgating.',
    watch: [['Incident list:', 'every escalation lands here'], ['Report draft:', 'from the audit trail'], ['Close Incident:', 'a person signs off']],
    live: 'Incident Management  ›  TGT-214',
    visual: async (s) => {
      const dv = await device(s, F12, 6.53, DY, 6.2, 'V11 Incident Management: incident list and the TGT-214 detail with a Co-pilot report draft in Remarks');
      hl(s, dv, ab(F12, 'TGT-214'), 1, { side: 'l', edge: true });
      await lens(s, dv, F12, [876, 596, 668, 120], 6.53, 5.62, 6.2, { n: 2, nAt: 'tl', alt: 'Co-pilot report draft in the Remarks timeline' });
      hl(s, dv, ab(F12, 'Close Incident', 0, { pad: 12 }), 3, { side: 'r', edge: true });
    },
    notes: [
      'Seven o’clock, shift handover. Every escalation from the night is in Incident Management.',
      'Co-pilot has drafted the report from the audit trail: what happened, what was decided, the root cause and the recommendations. Nurul adds a remark, and Grace signs it off.',
      'Within minutes of the first alarm, the draft was already taking shape. Nobody spends the end of their shift writing it.',
    ].join('\n'),
  });

  // 20 ── platform: four layers as an isometric stack (rendered art), labels native
  pres.addSection({ title: SEC.platform });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('PLATFORM  ·  UNIFIED AND MULTI-SITE', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('One platform above every system and site', { placeholder: 'title', charSpacing: -0.5 });
  s.addImage({ path: A('viz_stack.png'), x: 0, y: 0, w: SW, h: SH, altText: 'Four stacked layers: any-brand systems, site edge, AGIL Secure core, and where people work', objectName: 'Platform stack' });
  {
    const { cx, a, layers } = GEO.stack, lx = 6.1;
    const ROWS = [
      ['WHERE PEOPLE WORK', 'V11 console  ·  Responder app  ·  Reports and insights', null, BLUE],
      ['AGIL® SECURE ISMS CORE', 'Correlation  ·  On-premise Co-pilot  ·  3D twin  ·  Case and audit', null, LAV],
      ['SITE EDGE, PER TERMINAL  ·  KEEPS WORKING IF THE LINK DROPS', 'Video analytics  ·  LiDAR fusion  ·  Local rules  ·  Buffering', null, '8FB4FF'],
      ['ANY-BRAND SYSTEMS', 'CCTV  ·  Access control  ·  AGIL Fence  ·  LiDAR  ·  Audio  ·  Rosters', null, MUTED],
    ];
    for (const [i, [hd, items, note, col]] of ROWS.entries()) {
      const y = layers[i];
      s.addShape(LINE, { x: cx + a + 0.06, y, w: lx - 0.2 - (cx + a + 0.06), h: 0, line: { color: col, width: 1, transparency: 35, dashType: 'dash' }, objectName: 'Leader ' + hd });
      s.addShape(OVAL, { x: lx - 0.26, y: y - 0.06, w: 0.12, h: 0.12, fill: { color: col }, line: { type: 'none' }, objectName: 'Leader dot' });
      label(s, hd, lx, y - 0.5, RX - lx, col);
      fit('platform row ' + i, items, 16, false, RX - lx, i === 3 ? 0.56 : 0.3);
      T(s, items, { x: lx, y: y - 0.2, w: RX - lx, h: i === 3 ? 0.6 : 0.34, fontSize: 16 });
      if (note) T(s, note, { x: lx, y: y + 0.17, w: RX - lx, h: 0.28, fontSize: 14, color: '8FB4FF' });
    }
    // multi-site governance band
    const by = 5.95;
    card(s, MX, by, SW - 2 * MX, 0.9, { fill: CARD, tr: 15, line: LAV, ltr: 55, lw: 1, name: 'Multi-site governance' });
    s.addImage({ data: await icon('LuNetwork', HEX.lav), x: MX + 0.25, y: by + 0.25, w: 0.4, h: 0.4, altText: '' });
    T(s, [{ text: 'One security baseline across sites', options: { bold: true, breakLine: true } }, { text: 'Shared playbooks, local autonomy, open API', options: { color: MUTED, fontSize: 14 } }],
      { x: MX + 0.85, y: by + 0.12, w: 4.4, h: 0.66, fontSize: 16, valign: 'middle' });
    // the sites as nodes on one network line, Central SOC first
    const SITES = ['SOC', 'T1', 'T2', 'T3', 'T4', 'T5', 'Cargo', 'Regional'], nx0 = 5.75, nx1 = RX - 0.45, ny = by + 0.36;
    s.addShape(LINE, { x: nx0, y: ny, w: nx1 - nx0, h: 0, line: { color: LAV, width: 1.25, transparency: 45 }, objectName: 'Site network' });
    for (const [i, t] of SITES.entries()) {
      const nx = nx0 + i * (nx1 - nx0) / (SITES.length - 1), d = i ? 0.16 : 0.24;
      if (!i) s.addShape(OVAL, { x: nx - 0.2, y: ny - 0.2, w: 0.4, h: 0.4, fill: { color: LAV, transparency: 70 }, line: { type: 'none' }, objectName: 'SOC halo' });
      s.addShape(OVAL, { x: nx - d / 2, y: ny - d / 2, w: d, h: d, fill: { color: i ? INK : LAV }, line: { type: 'none' }, objectName: 'Site ' + t });
      T(s, t, { x: nx - 0.5, y: ny + 0.15, w: 1.0, h: 0.26, fontSize: 12, bold: !i, color: i ? MUTED : LAV, align: 'center', free: true });
    }
  }
  s.addNotes([
    'Everything you have seen sits on one platform, above the systems you already own.',
    'Cameras and access control from any vendor, AGIL Fence and LiDAR feed an edge node at each site, which keeps detecting even if the network link drops. The AGIL Secure core correlates events, runs Co-pilot on premise and keeps the audit trail. Operators work in the V11 console, and patrols use the responder app.',
    'For CAG, that means one security baseline across terminals, cargo and remote sites, while each site keeps its local autonomy. That answers your third and fourth priorities.',
  ].join('\n'));

  // 21 ── trust: a governed core with six guarantees around it
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('GOVERNANCE BY DESIGN', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Trust built in, not bolted on', { placeholder: 'title', charSpacing: -0.5 });
  full(s, 'viz_trust.png');
  {
    const { cx, cy, rows } = GEO.trust;
    await iconDisc(s, 'LuShieldCheck', cx - 0.62, cy - 0.85, 1.24, { fill: NAVY, ring: LAV, ltr: 10, lw: 1.75, k: 0.5, halo: true });
    T(s, 'GOVERNED AI', { x: cx - 1.0, y: cy + 0.55, w: 2.0, h: 0.28, fontSize: TS.micro, bold: true, color: LAV, charSpacing: 2.5, align: 'center' });
    const TR = [['LuHand', 'Human in command', 'Co-pilot proposes; a person approves every intervention.'],
      ['LuServer', 'On-premise AI', 'Models run inside the airport network. Video stays on site.'],
      ['LuFileText', 'Shows its sources', 'Every answer cites its events, cameras and SOP steps.'],
      ['LuLockKeyhole', 'Role-based, per site', 'Staff see only the sites and data they are cleared for.'],
      ['LuEyeOff', 'Privacy first', 'No facial recognition needed. Watchlist matching is optional.'],
      ['LuListChecks', 'Complete audit trail', 'Every AI suggestion and human decision is logged.']];
    for (const [i, [ic, hd, tx]] of TR.entries()) {
      const leftCol = i % 2 === 0, y = rows[Math.floor(i / 2)] - 0.3, x = leftCol ? MX : 8.6, w = 4.13;
      await iconDisc(s, ic, x, y, 0.62, { k: 0.48 });
      T(s, hd, { x: x + 0.82, y: y - 0.03, w: w - 0.82, h: 0.38, fontSize: 20, bold: true });
      fit('trust ' + hd, tx, 16, false, w - 0.82, 0.82);
      T(s, tx, { x: x + 0.82, y: y + 0.4, w: w - 0.82, h: 0.84, fontSize: 16, color: MUTED });
    }
  }
  s.addNotes([
    'Trust is designed in from the start. A person approves every intervention, and every answer shows its sources.',
    'Linking bags to people needs no facial recognition. Watchlist matching is optional, set by your policy, and always verified by a person. The AI runs on premise, so video stays on site. Access is role-based per site, and every AI suggestion and every human decision is logged.',
  ].join('\n'));

  // 22 ── value: the funnel from raw alarms to incidents, then what changes
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('WHAT CHANGES FOR CAG', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Fewer alarms to chase. Faster, steadier calls', { placeholder: 'title', charSpacing: -0.5 });
  fit('value title', 'Fewer alarms to chase. Faster, steadier calls', TS.title, true, 12.1, 0.72, 1.0);
  {
    // hero: 1,248 raw alarms condensing into 7 ranked incidents
    const vx = MX, vy = 2.45, vw = 6.4, vh = vw / GEO.alarms.aspect, nx = vx + GEO.alarms.nodes[0][0] * vw;
    T(s, '1,248', { x: vx, y: 1.72, w: 1.9, h: 0.7, fontSize: 40, bold: true, charSpacing: -1, valign: 'middle' });
    T(s, runs('RAW ALARMS\nIN ONE SHIFT'), { x: vx + 1.92, y: 1.8, w: 1.8, h: 0.55, fontSize: TS.micro, bold: true, color: MUTED, charSpacing: 2, valign: 'middle' });
    T(s, runs('RANKED\nINCIDENTS'), { x: nx - 2.15, y: 1.8, w: 1.6, h: 0.55, fontSize: TS.micro, bold: true, color: LAV, charSpacing: 2, valign: 'middle', align: 'right' });
    T(s, '7', { x: nx - 0.45, y: 1.72, w: 0.9, h: 0.7, fontSize: 40, bold: true, color: LAV, align: 'center', valign: 'middle' });
    s.addImage({ path: A('viz_alarms.png'), x: vx, y: vy, w: vw, h: vh, altText: 'A cloud of 1,248 alarm dots flowing into seven glowing incident nodes', objectName: 'Alarms to incidents' });
    // three proof points
    const ST = [['6.2 s', 'bag linked to owner'], ['1 click', 'to escalate'], ['~10 min', 'to a drafted report']];
    const sw3 = (vw - 0.3) / 3, sy = 5.62, sh = 1.15;
    for (const [i, [v, l]] of ST.entries()) {
      const x = vx + i * (sw3 + 0.15);
      card(s, x, sy, sw3, sh, { tr: 25, name: 'Stat ' + v });
      T(s, v, { x: x + 0.22, y: sy + 0.12, w: sw3 - 0.3, h: 0.52, fontSize: 28, bold: true, charSpacing: -0.5 });
      fit('stat label ' + v, l, 13, false, sw3 - 0.36, 0.22);
      T(s, l, { x: x + 0.22, y: sy + 0.64, w: sw3 - 0.36, h: 0.44, fontSize: 13, color: MUTED });
    }
    // what changes: today → with Co-pilot
    const ROWS = [['Alarms', '1,248, by hand', 'Seven ranked incidents'], ['Evidence', 'Nine screens', 'One evidence panel'],
      ['Response', 'SOP binders', 'SOP pre-filled, one click'], ['Investigation', 'Hours of footage', 'One plain-English question'],
      ['Reporting', 'After the shift', 'Drafted, ready to sign']];
    const rx0 = 7.3, rw = RX - rx0, rh = 0.84;
    label(s, 'BEFORE', rx0 + 0.25, 1.82, 2);
    label(s, 'WITH CO-PILOT', rx0 + 2.45, 1.82, 2.0, LAV);
    for (const [i, [k, a, b]] of ROWS.entries()) {
      const y = 2.16 + i * (rh + 0.09);
      card(s, rx0, y, rw, rh, { tr: 30, edge: false, name: 'Change ' + k });
      label(s, k.toUpperCase(), rx0 + 0.25, y + 0.08, 2.2, MUTED);
      fit('value today ' + k, a, 15, false, 1.85, 0.3);
      T(s, a, { x: rx0 + 0.25, y: y + 0.38, w: 1.85, h: 0.32, fontSize: 15, color: MUTED });
      s.addImage({ data: await icon('LuArrowRight', HEX.lav), x: rx0 + 2.13, y: y + 0.44, w: 0.2, h: 0.2, altText: '' });
      fit('value with ' + k, b, 16, true, rw - 2.55, 0.3);
      T(s, b, { x: rx0 + 2.45, y: y + 0.36, w: rw - 2.5, h: 0.34, fontSize: 16, bold: true });
    }
    T(s, 'Demo scenario figures. A pilot measures them on CAG data.', { x: rx0, y: 6.82, w: rw, h: 0.26, fontSize: 12, color: MUTED });
  }
  s.addNotes([
    'So what changes for CAG? Seven ranked, explained incidents instead of twelve hundred raw alarms. Evidence assembled in one place. Your SOP filled in and ready to approve. One plain-English question instead of hours of footage. And reports drafted, ready to sign.',
    'These numbers come from our demo scenario. In a pilot, we baseline your current figures and measure the same things on your data, together.',
  ].join('\n'));

  // 23 ── roadmap
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('ROADMAP', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('From today’s demo to an Airport Security OS', { placeholder: 'title', charSpacing: -0.5 });
  fit('roadmap title', 'From today’s demo to an Airport Security OS', TS.title, true, 12.1, 0.72, 1.0);
  full(s, 'viz_timeline.png');
  {
    const H4 = [['NOW', 'Proven live', 'V11 + Co-pilot', ['Seven airport scenarios', 'Correlation and SOPs', 'Ask Co-pilot, reports'], INK],
      ['NEXT', 'Pilot', 'One terminal, ~12 weeks', ['Scenarios on CAG data', 'Joint KPIs and baseline', 'Privacy policy agreed'], BLUE],
      ['THEN', 'Scale', 'All terminals', ['AGIL Fence migrated', 'Multi-site governance', 'Responder app'], BLUE],
      ['VISION', 'Security OS', 'Predictive, federated', [], LAV]];
    const colW = (SW - 2 * MX - 3 * 0.25) / 4, ly = 2.2;
    for (const [i, [tag, ttl, sub, pts, col]] of H4.entries()) {
      const x = MX + i * (colW + 0.25);
      s.addShape(OVAL, { x: x + 0.15, y: ly - 0.2, w: 0.4, h: 0.4, fill: { color: col, transparency: 70 }, line: { type: 'none' }, objectName: 'Milestone halo ' + tag });
      s.addShape(OVAL, { x: x + 0.22, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col }, line: { color: INK, width: 1.5 }, objectName: 'Milestone ' + tag });
      T(s, tag, { x: x + 0.15, y: ly - 0.58, w: 2, h: 0.28, fontSize: 12, bold: true, color: col, charSpacing: 2.5, valign: 'middle' });
      const y = 2.62, h = 3.75, pilot = i === 1;
      card(s, x, y, colW, h, { fill: pilot ? LAV : CARD, tr: pilot ? 88 : 25, line: pilot ? LAV : INK, ltr: pilot ? 35 : 82, lw: pilot ? 1.25 : 0.75, edge: col, shadow: true, name: 'Horizon ' + tag });
      if (pilot) { s.addShape(LINE, { x: x + 0.25, y: y + h - 0.6, w: colW - 0.5, h: 0, line: { color: LAV, width: 0.75, transparency: 50 }, objectName: 'Divider' }); label(s, 'YOUR DECISION TODAY', x + 0.25, y + h - 0.47, colW - 0.5, LAV, { fontSize: 12, charSpacing: 1 }); }
      if (pts.length) {
        fit('roadmap ' + ttl, ttl, 24, true, colW - 0.5, 0.45);
        T(s, ttl, { x: x + 0.25, y: y + 0.25, w: colW - 0.5, h: 0.45, fontSize: 24, bold: true });
        fit('roadmap sub ' + sub, sub, 14, true, colW - 0.5, 0.3);
        T(s, sub, { x: x + 0.25, y: y + 0.74, w: colW - 0.5, h: 0.3, fontSize: 14, color: col, bold: true });
        for (const p of pts) fit('roadmap pt ' + p, p, 16, false, colW - 0.75, 0.56);
        T(s, pts.map((p, j) => ({ text: p, options: { bullet: { indent: 16 }, breakLine: j < pts.length - 1 } })), { x: x + 0.25, y: y + 1.3, w: colW - 0.45, h: 2.2, fontSize: 16, color: MUTED, paraSpaceAfter: 9 });
      } else {
        const iw2 = colW - 0.16, ih2 = iw2 * 9 / 16;
        s.addImage({ path: A('concept_overview.jpg'), x: x + 0.08, y: y + 0.08, w: iw2, h: ih2, altText: 'Concept design of a future operations overview with a 3D airport twin', objectName: 'Concept frame' });
        pill(s, x + 0.2, y + ih2 - 0.26, 'CONCEPT', NAVY, LAV, { tr: 10, line: LAV, ltr: 40, h: 0.28 });
        T(s, ttl, { x: x + 0.25, y: y + ih2 + 0.25, w: colW - 0.5, h: 0.45, fontSize: 24, bold: true });
        T(s, sub, { x: x + 0.25, y: y + ih2 + 0.72, w: colW - 0.5, h: 0.3, fontSize: 14, color: col, bold: true });
        fit('vision text', 'Live 3D twin, federated sites, same Co-pilot.', 16, false, colW - 0.5, 0.56);
        T(s, 'Live 3D twin, federated sites, same Co-pilot.', { x: x + 0.25, y: y + ih2 + 1.12, w: colW - 0.5, h: 0.6, fontSize: 16, color: MUTED });
      }
    }
    T(s, 'Phases and durations are indicative and will be agreed in the pilot plan.', { x: MX, y: 6.6, w: 9, h: 0.26, fontSize: 12, color: MUTED });
  }
  s.addNotes([
    'Today’s demo is step one, and the decision in front of us is the next one: a pilot in one terminal, for about twelve weeks, on live feeds, with joint KPIs and an agreed privacy and watchlist policy.',
    'Then we scale to all terminals, move AGIL Fence onto the same workflow, and bring in multi-site governance and the responder app.',
    'The destination is an airport security operating system: predictive, federated, and built on the same Co-pilot. The image shows the design direction; it is not part of today’s demo.',
  ].join('\n'));

  // 24 ── next steps
  pres.addSection({ title: SEC.close });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.close });
  s.addText('NEXT STEPS', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('One decision starts the pilot', { placeholder: 'title', charSpacing: -0.5 });
  {
    card(s, MX, 1.95, SW - 2 * MX, 1.3, { fill: LAV, tr: 84, line: LAV, ltr: 35, lw: 1.25, name: 'Ask' });
    brackets(s, MX - 0.12, 1.83, SW - 2 * MX + 0.24, 1.54, { tr: 15, arm: 0.3, lw: 2 });
    s.addImage({ data: await icon('LuHandshake', HEX.lav), x: MX + 0.4, y: 2.27, w: 0.66, h: 0.66, altText: '' });
    T(s, [{ text: 'Our ask: ', options: { color: LAV } }, { text: 'name a CAG working team today.', options: { breakLine: true } }, { text: 'We return within two weeks with your pilot plan.', options: { bold: false, color: MUTED, fontSize: 18 } }],
      { x: MX + 1.3, y: 1.95, w: 10.6, h: 1.3, fontSize: 26, bold: true, valign: 'middle' });
    label(s, 'WHAT HAPPENS NEXT', MX, 3.62, 4, MUTED, { fontSize: 12 });
    const NS = [['Choose the pilot', 'Terminal and the 3–4 scenarios that matter most.', 'Weeks 0–2'],
      ['Connect the data', 'Workshop: access control, VMS, Fence, LiDAR, SOPs.', 'Weeks 2–4'],
      ['Define success', 'Pilot KPIs, governance, privacy and watchlist policy.', 'Weeks 4–6']];
    const w3 = (SW - 2 * MX - 2 * 0.3) / 3;
    for (const [i, [hd, tx, when]] of NS.entries()) {
      const x = MX + i * (w3 + 0.3), y = 4.0, h = 2.75;
      card(s, x, y, w3, h, { tr: 25, shadow: true, name: 'Step ' + (i + 1) });
      T(s, '0' + (i + 1), { x: x + 0.3, y: y + 0.22, w: 1.0, h: 0.6, fontSize: 36, bold: true, color: LAV, charSpacing: -1 });
      T(s, when.toUpperCase(), { x: x + w3 - 1.9, y: y + 0.36, w: 1.6, h: 0.3, fontSize: 12, bold: true, color: MUTED, charSpacing: 1, align: 'right' });
      fit('next title ' + hd, hd, 22, true, w3 - 0.6, 0.42);
      T(s, hd, { x: x + 0.3, y: y + 0.98, w: w3 - 0.6, h: 0.42, fontSize: 22, bold: true });
      fit('next ' + hd, tx, 16, false, w3 - 0.6, 0.56);
      T(s, tx, { x: x + 0.3, y: y + 1.5, w: w3 - 0.6, h: 0.9, fontSize: 16, color: MUTED });
    }
  }
  s.addNotes([
    'Our ask today is simple: name a CAG working team, and we will come back within two weeks with your pilot plan.',
    'From there it is three steps. Choose the pilot terminal and the scenarios that matter most to you. Connect the data in an integration workshop. And agree what success looks like, including your policy on watchlist use.',
  ].join('\n'));

  // 25 ── close
  s = pres.addSlide({ masterName: 'CLOSE', sectionTitle: SEC.close });
  s.addText('THANK YOU', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText([{ text: 'People stay in command.', options: { breakLine: true } }, { text: 'AI does the legwork.', options: { color: LAV } }], { placeholder: 'title', charSpacing: -1 });
  fit('close title', 'People stay in command.\nAI does the legwork.', 50, true, 11.5, 1.65, 0.95);
  s.addText([{ text: 'Next step: a CAG working team, and your pilot plan within two weeks.', options: { breakLine: true } }, { text: 'Questions welcome. The system is open for you to try.', options: { fontSize: 16 } }], { placeholder: 'body' });
  s.addNotes([
    'People stay in command. AI does the legwork.',
    'Thank you. The next step is a CAG working team, and your pilot plan within two weeks. We would welcome your questions, and the system is open for you to try.',
  ].join('\n'));

  // 26–28 ── appendix (presenter deck only, hidden in the slide show)
  if (CLIENT) return write();
  pres.addSection({ title: SEC.appx });
  const RUN = [
    ['1–6', '0:00', 'Opening, priorities, problem, answer, how it works, cast', 'V11 on Home, idle', 'V11-01'],
    ['7–8', '7:00', '“Let’s run a night shift, live” · “Seven incidents. Already ranked.”', 'Home: counters (2 / 4 / 1), then pins in the 3D view', 'V11-01'],
    ['9', '9:00', '“5 alarms. 1 incident. Explained.”', 'Click Staff Door D-214 → Investigation → “+2 more”', 'V11-02'],
    ['10', '11:00', '“Co-pilot prepares. You approve.”', 'SOP Flow → step 2 “Lock” → 3D shows D-214 locked', 'V11-03'],
    ['11', '12:30', '“Escalated in one click, already filled in”', 'Escalate → point at pre-filled fields → Create Incident', 'V11-10'],
    ['12', '13:30', '“A real intruder, not the wind”', 'Fence Sector 5 → Investigation → LiDAR, thermal tiles', 'V11-09'],
    ['13', '15:30', '“Bag and owner linked in 6 seconds”', 'Gate B12 Holdroom → SOP Flow → step 5 “Approve”', 'V11-05'],
    ['14', '17:30', '“Seen and heard before it escalates”', 'Arrival Hall Belt 5 → Investigation', 'V11-07'],
    ['15', '19:00', '“One card, two doors, four minutes”', 'T1 Door C2 → Investigation → legacy SSID row', 'V11-04'],
    ['16', '21:00', '“Your own rules, now running live”', 'Baggage Hall B2 → Investigation → rules', 'V11-08'],
    ['17', '22:30', '“Sensitive calls stay human”', 'Departure Hall Row K → SOP Flow → “Not a match”', 'V11-06'],
    ['18', '24:30', '“Ask in plain English”', 'Search bar → type the question → result cards', 'V11-11'],
    ['19', '26:30', '“The report writes itself”', 'Incident Management → TGT-214 → Close Incident', 'V11-12'],
    ['20–25', '28:30', 'Platform, trust, value, roadmap, the ask, close', 'Exit Incident Management → Home', 'V11-01'],
  ];
  const hdr = ['Slide', 'Clock', 'Script cue', 'Clicks in V11', 'Screen'];
  const colWs = [0.8, 0.8, 3.9, 5.2, 1.43];
  for (const [part, rows] of [[1, RUN.slice(0, 7)], [2, RUN.slice(7)]]) {
    s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
    s.hidden = !process.env.SHOW_HIDDEN;
    s.addText('APPENDIX  ·  PRESENTER ONLY', { placeholder: 'kicker', charSpacing: 2 });
    s.addText(`Demo run sheet (${part} of 2)`, { placeholder: 'title' });
    const head = hdr.map(h => ({ text: h, options: { bold: true, color: INK, fill: { color: NAVY }, fontSize: 12 } }));
    const body = rows.map((r, i) => r.map((c, j) => ({ text: c, options: { color: NAVY, fontSize: 13, bold: j === 3, fill: { color: i % 2 ? 'EEF1F7' : 'FFFFFF' } } })));
    s.addTable([head, ...body], { x: MX, y: 1.7, w: SW - 2 * MX, colW: colWs, rowH: 0.55, valign: 'middle', margin: [3, 6, 3, 6], border: { type: 'solid', pt: 0.5, color: 'D5DAE5' }, fontFace: 'Arial' });
    if (part === 2) T(s, 'If V11 stalls: stay on the slides. Every live slide shows the same screen, with the same numbered tags.', { x: MX, y: 6.4, w: 12, h: 0.3, fontSize: 13, color: NAVY, bold: true });
    T(s, 'Hidden in the slide show. Delete the appendix before sending the deck to CAG.', { x: MX, y: 6.85, w: 9, h: 0.28, fontSize: 12, color: BLUE });
    s.addNotes('Presenter reference. This slide is hidden in the slide show; delete the appendix before sending the deck to CAG.');
  }
  s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
  s.hidden = !process.env.SHOW_HIDDEN;
  s.addText('APPENDIX  ·  PRESENTER ONLY', { placeholder: 'kicker', charSpacing: 2 });
  s.addText('Likely questions, short answers', { placeholder: 'title' });
  {
    const QA = [
      ['Does it need facial recognition?', 'No. Bags and people are linked by appearance: clothing, bags and movement. Watchlist matching is optional, policy-controlled and always verified by an operator.'],
      ['Where does the AI run?', 'On premise, inside the airport network. Video stays on site; sites share events and incidents, not raw footage.'],
      ['What if Co-pilot is wrong?', 'It never acts alone. Critical steps need a person, every closure is logged and reversible, and operator feedback tunes it.'],
      ['Do we replace our VMS, access control or iPAM?', 'No rip-and-replace. AGIL Secure sits above them, and AGIL Fence alarms move into the same workflow as everything else.'],
      ['How long does a pilot take?', 'About 12 weeks for one terminal once data access is agreed (indicative, confirmed in the pilot plan).'],
      ['Is today’s demo live data?', 'It runs on the V11 system with simulated demo data. The pilot runs on CAG feeds.'],
    ];
    const w2 = (SW - 2 * MX - 0.4) / 2;
    for (const [i, [q, a]] of QA.entries()) {
      const x = MX + (i % 2) * (w2 + 0.4), y = 1.7 + Math.floor(i / 2) * 1.62;
      s.addShape(RR, { x, y, w: w2, h: 1.45, rectRadius: 0.1, fill: { color: 'F2F4F9' }, line: { color: 'D5DAE5', width: 0.75 }, objectName: 'QA ' + (i + 1) });
      T(s, q, { x: x + 0.25, y: y + 0.16, w: w2 - 0.5, h: 0.32, fontSize: 16, bold: true, color: NAVY });
      fit('qa ' + i, a, 14, false, w2 - 0.5, 0.82);
      T(s, a, { x: x + 0.25, y: y + 0.52, w: w2 - 0.5, h: 0.85, fontSize: 14, color: NAVY });
    }
    T(s, 'Hidden in the slide show. Delete the appendix before sending the deck to CAG.', { x: MX, y: 6.85, w: 9, h: 0.28, fontSize: 12, color: BLUE });
  }
  s.addNotes('Presenter reference. This slide is hidden in the slide show; delete the appendix before sending the deck to CAG.');

  return write();
}
async function write() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await finalize(OUT);
  if (WARN.length) console.log('FIT WARNINGS:\n  ' + WARN.join('\n  '));
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
// 2) speaker notes: one paragraph per line, so PowerPoint shows the line breaks.
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const master = 'ppt/slideMasters/slideMaster1.xml';
  const mx = await zip.file(master).async('string');
  const swapped = mx.replace('<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"', '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2"');
  if (swapped === mx) throw new Error('slide master colour map not found');
  zip.file(master, swapped);
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/(slides|slideLayouts|notesSlides)\/[^/]+\.xml$/.test(n))) {
    const hit = (await zip.file(name).async('string')).match(/\b(CMO|CTO)\b|Co-pilot\s+·\s+Live demonstration|logo_white|\(\d:\d\d\)/);
    if (hit) throw new Error(`${name} contains "${hit[0]}"`);
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
