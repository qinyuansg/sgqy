'use strict';
// CAG demo-day pitch deck: the CMO presents, the CTO drives AGIL Secure V11 live.
// Every live slide mirrors one V11 screen (frames from isms-mvp-figma/screens-v11) and carries
// numbered "watch for" markers that match the CTO's clicks; speaker notes hold the CMO talk track
// and the CTO click path. A hidden appendix holds the run sheet and Q&A prep.
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
const SW = 13.333, MX = 0.6, RX = SW - MX;
const FOOT = 'AGIL® Secure ISMS V11  ·  AI Co-pilot  ·  Live demonstration';
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
function T(s, text, o) { s.addText(text, Object.assign({ isTextBox: true, margin: 0, color: INK, fontSize: 14, valign: 'top' }, o)); }
const shadow = (blur = 18, op = 0.55, off = 6) => ({ type: 'outer', color: '000000', blur, offset: off, angle: 90, opacity: op });
function card(s, x, y, w, h, o = {}) {
  s.addShape(RR, {
    x, y, w, h, rectRadius: o.r ?? 0.12,
    fill: { color: o.fill || CARD, transparency: o.tr ?? 30 },
    line: { color: o.line || MUTED, width: o.lw || 0.75, transparency: o.ltr ?? 80 },
    shadow: o.shadow ? shadow(o.blur || 20, o.op || 0.5) : undefined, objectName: o.name || 'Card',
  });
}
function pill(s, x, y, label, fill, color, o = {}) {
  const pt = o.pt || 10, cs = o.cs ?? 1, h = o.h || 0.28;
  const w = tw(label, pt, true, cs) + (o.padX ?? 0.3);
  s.addText(label, {
    shape: RR, x, y, w, h, rectRadius: h / 2, fill: { color: fill, transparency: o.tr || 0 },
    line: o.line ? { color: o.line, width: 0.75, transparency: o.ltr || 0 } : { type: 'none' },
    color, fontSize: pt, bold: true, charSpacing: cs, align: 'center', valign: 'middle', margin: 0, objectName: 'Tag ' + label,
  });
  return w;
}
function marker(s, x, y, n, o = {}) {
  const d = o.d || 0.32;
  s.addShape(OVAL, { x: x - d / 2 - 0.07, y: y - d / 2 - 0.07, w: d + 0.14, h: d + 0.14, fill: { color: LAV, transparency: 62 }, line: { type: 'none' }, objectName: 'Marker halo ' + n });
  s.addText(String(n), { shape: OVAL, x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: LAV }, line: { color: INK, width: 1.25 }, color: NAVY, bold: true, fontSize: o.pt || 13, align: 'center', valign: 'middle', margin: 0, objectName: 'Marker ' + n });
}
const iconCache = {};
async function icon(name, hex = HEX.white) {
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = renderToStaticMarkup(React.createElement(Lu[name], { size: 256 })).replace(/currentColor/g, '#' + hex);
    iconCache[key] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
  return iconCache[key];
}
async function iconDisc(s, name, x, y, d, o = {}) {
  s.addShape(OVAL, { x, y, w: d, h: d, fill: { color: o.fill || CARD, transparency: o.tr ?? 0 }, line: { color: o.ring || LAV, width: o.lw || 1, transparency: o.ltr ?? 35 }, objectName: 'Icon disc ' + name });
  const k = o.k || 0.5;
  s.addImage({ data: await icon(name, o.hex || HEX.lav), x: x + d * (1 - k) / 2, y: y + d * (1 - k) / 2, w: d * k, h: d * k, altText: '' });
}
function live(s, x, y, where) {
  const lab = 'LIVE IN V11', w = 0.42 + tw(lab, 10, true, 1.5) + 0.22 + tw(where, 12, false) + 0.24;
  s.addShape(RR, { x, y, w, h: 0.42, rectRadius: 0.21, fill: { color: CARD, transparency: 5 }, line: { color: RED, width: 1, transparency: 20 }, objectName: 'Live demo cue' });
  s.addShape(OVAL, { x: x + 0.19, y: y + 0.155, w: 0.11, h: 0.11, fill: { color: RED }, line: { type: 'none' }, objectName: 'Live dot' });
  T(s, [{ text: lab, options: { bold: true, color: RED, charSpacing: 1.5, fontSize: 10 } }, { text: '    ' + where, options: { color: INK, fontSize: 12 } }],
    { x: x + 0.4, y, w: w - 0.45, h: 0.42, valign: 'middle', objectName: 'Live demo path' });
  return w;
}

// ---------- V11 screenshots ----------
const FRAME_W = f => (f.startsWith('V11-12') ? 1600 : 1400);
async function shot(frame, r, dispW) {
  const [x, y, w, h] = r.map(v => Math.round(v * 2));
  const width = Math.min(w, Math.round(dispW * 300));
  const buf = await sharp(A(`v11/${frame}.png`)).extract({ left: x, top: y, width: w, height: h }).resize({ width }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
// a V11 screen in a slim display bezel; returns a frame-px → slide-inch mapper
async function device(s, frame, x, y, w, alt) {
  const r = [0, 0, FRAME_W(frame), 1069], pad = 0.06, iw = w - 2 * pad, ih = iw * r[3] / r[2];
  s.addShape(RR, { x, y, w, h: ih + 2 * pad, rectRadius: 0.1, fill: { color: NAVY }, line: { color: MUTED, width: 0.75, transparency: 62 }, shadow: shadow(26, 0.6, 8), objectName: 'Display bezel' });
  s.addImage({ data: await shot(frame, r, iw), x: x + pad, y: y + pad, w: iw, h: ih, altText: alt, objectName: 'V11 screen ' + frame.slice(0, 6) });
  const map = (fx, fy) => [x + pad + fx / r[2] * iw, y + pad + fy / r[3] * ih];
  return { x, y, w, h: ih + 2 * pad, map };
}
// magnified crop of the same screen, with a dashed outline where it comes from
async function lens(s, dev, frame, r, x, y, w, o = {}) {
  const pad = 0.04, iw = w - 2 * pad, ih = iw * r[3] / r[2], h = ih + 2 * pad;
  if (dev) {
    const [a, b] = dev.map(r[0], r[1]), [c, d] = dev.map(r[0] + r[2], r[1] + r[3]);
    s.addShape(RECT, { x: a, y: b, w: c - a, h: d - b, fill: { type: 'none' }, line: { color: LAV, width: 1.25, dashType: 'dash' }, objectName: 'Zoom source' });
  }
  s.addShape(RR, { x, y, w, h, rectRadius: 0.07, fill: { color: NAVY }, line: { color: LAV, width: 1.5 }, shadow: shadow(28, 0.7, 8), objectName: 'Zoom lens' });
  s.addImage({ data: await shot(frame, r, iw), x: x + pad, y: y + pad, w: iw, h: ih, altText: o.alt || '', objectName: 'Zoom ' + (o.name || frame.slice(0, 6)) });
  if (o.n) marker(s, x + w - 0.06, y + 0.06, o.n);
  const map = (fx, fy) => [x + pad + (fx - r[0]) / r[2] * iw, y + pad + (fy - r[1]) / r[3] * ih];
  return { x, y, w, h, map };
}

// ---------- layouts ----------
const footer = [
  { text: { text: FOOT, options: { x: 1.05, y: 7.02, w: 7, h: 0.28, fontSize: 10, color: MUTED, margin: 0, valign: 'middle' } } },
  { image: { x: 11.73, y: 6.99, w: 1.0, h: 0.3, path: A('logo_white.png'), altText: 'ST Engineering' } },
];
const slideNumber = { x: 0.6, y: 7.02, w: 0.42, h: 0.28, fontSize: 10, color: MUTED, margin: 0, valign: 'middle' };
const ph = (name, type, x, y, w, h, o) => ({ placeholder: { options: Object.assign({ name, type, x, y, w, h, margin: 0, valign: 'top', align: 'left', color: INK }, o), text: '' } });
const KICK = { fontSize: 12, bold: true, color: LAV };
pres.defineSlideMaster({
  title: 'COVER', background: { path: A('bg_cover.jpg') },
  objects: [
    { image: { x: 0.6, y: 0.55, w: 1.6, h: 0.48, path: A('logo_white.png'), altText: 'ST Engineering' } },
    ph('kicker', 'body', 0.6, 2.0, 8.5, 0.4, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 2.45, 7.6, 2.3, { fontSize: 64, bold: true, lineSpacingMultiple: 0.9 }),
    ph('body', 'body', 0.6, 4.85, 6.8, 1.0, { fontSize: 19, color: MUTED }),
  ],
});
pres.defineSlideMaster({
  title: 'SECTION', background: { path: A('bg_section.jpg') },
  objects: [
    { image: { x: 11.73, y: 6.99, w: 1.0, h: 0.3, path: A('logo_white.png'), altText: 'ST Engineering' } },
    ph('kicker', 'body', 0.6, 2.3, 9, 0.4, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 2.75, 9.8, 1.8, { fontSize: 52, bold: true, lineSpacingMultiple: 0.92 }),
    ph('body', 'body', 0.6, 4.6, 7.6, 1.2, { fontSize: 19, color: MUTED }),
  ],
});
pres.defineSlideMaster({
  title: 'CONTENT', background: { path: A('bg_base.jpg') }, slideNumber,
  objects: [...footer, ph('kicker', 'body', 0.6, 0.42, 10.5, 0.3, KICK), ph('title', 'title', 0.6, 0.74, 11.6, 0.72, { fontSize: 34, bold: true })],
});
for (const [name, bg, x] of [['SCENE_R', 'bg_scene_r.jpg', 0.6], ['SCENE_L', 'bg_scene_l.jpg', 7.83]]) {
  pres.defineSlideMaster({
    title: name, background: { path: A(bg) }, slideNumber,
    objects: [...footer, ph('kicker', 'body', x, 0.55, 5.0, 0.3, KICK), ph('title', 'title', x, 1.36, 4.9, 1.05, { fontSize: 32, bold: true, lineSpacingMultiple: 0.95 })],
  });
}
pres.defineSlideMaster({
  title: 'MAP', background: { path: A('bg_map.jpg') }, slideNumber,
  objects: [...footer, ph('kicker', 'body', 0.6, 0.55, 6.5, 0.3, KICK), ph('title', 'title', 0.6, 0.9, 5.4, 1.05, { fontSize: 32, bold: true, lineSpacingMultiple: 0.95 })],
});
pres.defineSlideMaster({
  title: 'PHOTO', background: { path: A('bg_problem.jpg') }, slideNumber,
  objects: [...footer, ph('kicker', 'body', 0.6, 1.2, 7, 0.35, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 1.62, 6.3, 2.5, { fontSize: 48, bold: true, lineSpacingMultiple: 0.92 }), ph('body', 'body', 0.6, 4.3, 5.7, 1.3, { fontSize: 19, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'CLOSE', background: { path: A('bg_close.jpg') },
  objects: [{ image: { x: 11.73, y: 6.99, w: 1.0, h: 0.3, path: A('logo_white.png'), altText: 'ST Engineering' } },
    ph('kicker', 'body', 0.6, 3.75, 9, 0.35, Object.assign({}, KICK, { fontSize: 13 })),
    ph('title', 'title', 0.6, 4.17, 11.5, 1.45, { fontSize: 44, bold: true, lineSpacingMultiple: 0.95 }), ph('body', 'body', 0.6, 5.95, 9, 0.6, { fontSize: 19, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'APPENDIX', background: { color: INK }, slideNumber: Object.assign({}, slideNumber, { color: NAVY }),
  objects: [
    { text: { text: 'Presenter only  ·  hidden in the slide show  ·  delete before sending the deck to CAG', options: { x: 1.05, y: 7.02, w: 9, h: 0.28, fontSize: 10, color: NAVY, margin: 0, valign: 'middle' } } },
    ph('kicker', 'body', 0.6, 0.42, 10.5, 0.3, { fontSize: 12, bold: true, color: BLUE }), ph('title', 'title', 0.6, 0.74, 11.6, 0.72, { fontSize: 32, bold: true, color: NAVY }),
  ],
});

// ---------- scene slide (left/right mirrored) ----------
async function scene(d) {
  const right = d.side !== 'left';
  const s = pres.addSlide({ masterName: right ? 'SCENE_R' : 'SCENE_L', sectionTitle: SEC.demo });
  const tx = right ? 0.6 : 7.83, w = 4.9;
  s.addText(d.kicker, { placeholder: 'kicker', charSpacing: 2 });
  let px = tx;
  if (d.sev) px += pill(s, px, 0.92, d.sev.toUpperCase(), SEV[d.sev][0], SEV[d.sev][1]) + 0.1;
  if (d.ask) pill(s, px, 0.92, d.ask.toUpperCase(), LAV, LAV, { tr: 86, line: LAV, ltr: 45 });
  const tl = fit(d.kicker + ' title', d.title, 32, true, 4.9, 1.05, 1.0);
  s.addText(runs(d.title), { placeholder: 'title' });
  let y = 1.36 + tl * 0.46 + 0.3;
  // what Co-pilot says, readable (the same text is on the V11 screen)
  const qt = d.quote, qw = w - 0.5, qn = fit(d.kicker + ' quote', qt, 14, false, qw, 4 * 0.23, 1.15), qh = 0.52 + qn * 0.23 + 0.2;
  card(s, tx, y, w, qh, { fill: CARD, tr: 8, line: LAV, ltr: 50, lw: 1, name: 'Co-pilot quote' });
  s.addImage({ data: await icon('LuSparkles', HEX.lav), x: tx + 0.24, y: y + 0.19, w: 0.2, h: 0.2, altText: '' });
  T(s, d.quoteLabel || 'CO-PILOT', { x: tx + 0.52, y: y + 0.17, w: 3.5, h: 0.25, fontSize: 10, bold: true, color: LAV, charSpacing: 2 });
  T(s, qt, { x: tx + 0.25, y: y + 0.5, w: qw, h: qn * 0.23 + 0.06, fontSize: 14, italic: true, lineSpacingMultiple: 0.98 });
  y += qh + 0.3;
  // watch for: numbered like the markers on the screen
  T(s, 'WATCH FOR', { x: tx, y, w: 2, h: 0.24, fontSize: 10, bold: true, color: MUTED, charSpacing: 2 });
  y += 0.36;
  for (const [i, [lead, rest]] of d.watch.entries()) {
    marker(s, tx + 0.16, y + 0.15, i + 1, { d: 0.3, pt: 12 });
    const n = fit(d.kicker + ' watch ' + (i + 1), lead + ' ' + rest, 14, false, w - 0.5, 0.5);
    T(s, [{ text: lead + ' ', options: { bold: true } }, { text: rest, options: { color: MUTED } }], { x: tx + 0.48, y: y - 0.01, w: w - 0.48, h: n * 0.24 + 0.04, fontSize: 14 });
    y += Math.max(0.5, n * 0.24 + 0.14);
  }
  if (y > 6.35) WARN.push(`${d.kicker}: left column ends at ${y.toFixed(2)}`);
  live(s, tx, 6.42, d.live);
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
  s.addText('AGIL® SECURE ISMS V11  ·  AI CO-PILOT', { placeholder: 'kicker', charSpacing: 3 });
  s.addText(runs('From alarms\nto answers'), { placeholder: 'title' });
  s.addText('AI-orchestrated security operations for the airport, shown live on the system your teams already use.', { placeholder: 'body' });
  fit('cover body', 'AI-orchestrated security operations for the airport, shown live on the system your teams already use.', 19, false, 6.8, 1.0);
  live(s, 0.6, 6.0, 'Seven airport scenarios, one night shift');
  T(s, 'Prepared for Changi Airport Group  ·  October 2026', { x: 0.6, y: 6.6, w: 7, h: 0.3, fontSize: 12, color: MUTED });
  s.addNotes([
    'CMO (0:30): Good morning. Tonight at 02:14, somewhere in your airport, a staff door is tailgated, a fence is climbed and a bag is left behind, hidden among more than a thousand alarms.',
    'Today we show you how AGIL Secure V11 with an AI Co-pilot turns those alarms into answers, live, on the console your teams already know.',
    'CTO: V11 on the Home screen (Real Time Alerts), no alarm open. Projector on the slides, second screen on V11.',
  ].join('\n'));

  // 2 ── CAG priorities
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('YOUR PRIORITIES', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Your four priorities, shown live today', { placeholder: 'title' });
  const PRI = [
    ['LuSparkles', 'AI-powered AGIL® Secure ISMS', 'Correlation, a co-pilot, automation, plain-English search and reporting', 'Seven incidents explained, SOPs pre-filled, reports drafted', ['Scenes 1, 5, 6', 'Ask + Report']],
    ['LuLuggage', 'Advanced video analytics', 'Left-behind baggage via person–object links, without facial recognition', 'The Gate B12 bag linked to its owner across four cameras', ['Scenes 3, 4']],
    ['LuFence', 'AGIL Fence, fully unified', 'Fence alarms in one workflow, not on a separate legacy platform', 'A fence climb verified by LiDAR and thermal, in the same alert list', ['Scene 2']],
    ['LuNetwork', 'Multi-site governance', 'All terminals and vendors under one baseline, with local autonomy', 'Site context in V11 and the federated architecture behind it', ['Platform']],
  ];
  const cw = (SW - 2 * MX - 3 * 0.25) / 4;
  for (const [i, [ic, ttl, asked, see, tags]] of PRI.entries()) {
    const x = MX + i * (cw + 0.25), y = 1.78, h = 4.72;
    card(s, x, y, cw, h, { tr: 20, ltr: 75, shadow: true, name: 'Priority ' + (i + 1) });
    await iconDisc(s, ic, x + 0.25, y + 0.25, 0.6);
    T(s, '0' + (i + 1), { x: x + cw - 0.75, y: y + 0.33, w: 0.5, h: 0.4, fontSize: 18, bold: true, color: LAV, align: 'right' });
    fit('priority title ' + i, ttl, 17, true, cw - 0.5, 0.58);
    T(s, ttl, { x: x + 0.25, y: y + 1.0, w: cw - 0.5, h: 0.6, fontSize: 17, bold: true });
    T(s, 'YOU ASKED FOR', { x: x + 0.25, y: y + 1.75, w: cw - 0.5, h: 0.22, fontSize: 10, bold: true, color: MUTED, charSpacing: 2 });
    fit('priority asked ' + i, asked, 14, false, cw - 0.5, 0.72);
    T(s, asked, { x: x + 0.25, y: y + 2.0, w: cw - 0.5, h: 0.95, fontSize: 14, color: MUTED });
    T(s, 'YOU WILL SEE LIVE', { x: x + 0.25, y: y + 3.08, w: cw - 0.5, h: 0.22, fontSize: 10, bold: true, color: LAV, charSpacing: 2 });
    fit('priority see ' + i, see, 14, false, cw - 0.5, 0.72);
    T(s, see, { x: x + 0.25, y: y + 3.33, w: cw - 0.5, h: 0.72, fontSize: 14 });
    let tx2 = x + 0.25;
    for (const t of tags) tx2 += pill(s, tx2, y + h - 0.5, t, LAV, LAV, { tr: 86, line: LAV, ltr: 50, pt: 10, cs: 0.5 }) + 0.08;
  }
  T(s, 'Built around the priorities CAG shared with us. Each live scene carries a tag showing the priority it proves.', { x: MX, y: 6.62, w: 11, h: 0.28, fontSize: 12, color: MUTED });
  s.addNotes([
    'CMO (1:00): When we last met, you gave us four priorities: an AI-powered AGIL Secure, video analytics that respect privacy, AGIL Fence fully unified, and multi-site governance.',
    'Everything you see today maps to one of them. Each live scene carries a tag in the top-left corner showing which priority it proves.',
    'CTO: no action.',
  ].join('\n'));

  // 3 ── the problem
  s = pres.addSlide({ masterName: 'PHOTO', sectionTitle: SEC.open });
  s.addText('TODAY  ·  02:14  ·  WITHOUT AI', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText([{ text: '1,248 alarms.', options: { breakLine: true } }, { text: 'Nine systems.', options: { breakLine: true } }, { text: 'One operator.' }], { placeholder: 'title' });
  fit('problem title', '1,248 alarms. Nine systems. One operator.', 48, true, 6.3, 2.5, 0.95);
  s.addText('Operators stitch the story together by hand, screen by screen. Speed and quality depend on who is on shift.', { placeholder: 'body' });
  const Q = [['Real alarm, or another nuisance?', 7.45, 1.35], ['Is the fence alarm related?', 9.95, 2.1], ['Which camera covers D-214?', 7.2, 2.9],
    ['Who left the bag at B12?', 10.25, 3.65], ['Which SOP applies here?', 7.7, 4.45], ['Who do I call first?', 10.5, 5.2]];
  for (const [q, x, y] of Q) {
    const w = tw(q, 15, false) + 0.5;
    s.addText(q, { shape: RR, x, y, w, h: 0.52, rectRadius: 0.26, fill: { color: NAVY, transparency: 22 }, line: { color: INK, width: 0.75, transparency: 72 }, color: INK, fontSize: 15, align: 'center', valign: 'middle', margin: 0, shadow: shadow(14, 0.5, 4), objectName: 'Operator question' });
  }
  T(s, 'Figures from tonight’s demo scenario.', { x: MX, y: 6.6, w: 6, h: 0.28, fontSize: 11, color: MUTED });
  s.addNotes([
    'CMO (1:00): This is a night shift today. More than a thousand alarms in 24 hours, from nine systems, each on its own screen.',
    'The operator connects them by hand: is the fence alarm related to the door? Which camera covers D-214? Which SOP applies? Who do I call first?',
    'Speed and quality depend on who is on shift. (Figures are from the demo scenario, not CAG data.)',
    'CTO: no action.',
  ].join('\n'));

  // 4 ── same console, now with Co-pilot
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('THE ANSWER  ·  AGIL® SECURE ISMS V11 + AI CO-PILOT', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Same V11 console. Now it thinks with you', { placeholder: 'title' });
  fit('slide4 title', 'Same V11 console. Now it thinks with you', 34, true, 11.6, 0.72, 1.0);
  {
    const F = 'V11-01-home-real-time-alerts';
    const dv = await device(s, F, 6.2, 1.72, 6.53, 'AGIL Secure V11 home screen: Real Time Alerts with Co-pilot lines, the airport in 3D with incident pins, and the search bar');
    const a1 = anchor(F, 'Co-pilot · 5 linked'), a3 = anchor(F, 'Search or ask'), a4 = anchor(F, '2 Critical');
    marker(s, ...dv.map(a1.end + 20, a1.mid), 1);
    marker(s, ...dv.map(1062, 494), 2);
    marker(s, ...dv.map(a3.end + 22, a3.mid), 3);
    marker(s, ...dv.map(344, 144), 4);
    const F4 = [['Every alert explained.', 'A Co-pilot line on each card: linked alarms and confidence.'],
      ['Located in 3D.', 'Incidents pinned on the airport; Locate jumps straight there.'],
      ['Ask in plain English.', 'The search bar now answers questions, with sources.'],
      ['Ranked by risk.', 'Critical, Warning and Info, so the next click is obvious.']];
    let y = 1.85;
    for (const [i, [lead, rest]] of F4.entries()) {
      marker(s, MX + 0.16, y + 0.15, i + 1, { d: 0.3, pt: 12 });
      fit('slide4 f' + i, lead + ' ' + rest, 15, false, 4.9, 0.56);
      T(s, [{ text: lead + ' ', options: { bold: true } }, { text: rest, options: { color: MUTED } }], { x: MX + 0.5, y: y - 0.02, w: 4.9, h: 0.6, fontSize: 15 });
      y += 0.82;
    }
    card(s, MX, 5.25, 5.3, 1.45, { fill: CARD, tr: 8, line: LAV, ltr: 50, lw: 1, name: 'Inside every alarm' });
    T(s, 'INSIDE EVERY ALARM', { x: MX + 0.25, y: 5.42, w: 4, h: 0.24, fontSize: 10, bold: true, color: LAV, charSpacing: 2 });
    let cx = MX + 0.25, cy = 5.78;
    for (const t of ['AI summary', 'Linked alarms', 'Evidence', 'SOP pre-filled', 'Escalation pre-filled', 'Report draft']) {
      const pw = tw(t, 11, true, 0.5) + 0.3;
      if (cx + pw > MX + 5.1) { cx = MX + 0.25; cy += 0.38; }
      pill(s, cx, cy, t, CARD, INK, { pt: 11, cs: 0.5, line: MUTED, ltr: 65 });
      cx += pw + 0.08;
    }
  }
  T(s, 'No new system to learn: same layout, same buttons, same workflow.', { x: 6.2, y: 6.78, w: 6.53, h: 0.26, fontSize: 12, color: LAV, bold: true, align: 'right' });
  s.addNotes([
    'CMO (1:15): Our answer is not another screen. It is the V11 console your team already uses, with a Co-pilot built in.',
    '1) Every alert card now explains itself: how many alarms were linked and how confident Co-pilot is. 2) Incidents are pinned on the 3D airport. 3) The search bar answers questions. 4) Everything stays ranked by risk.',
    'Inside every alarm: an AI summary, the linked alarms, boxed camera evidence, the SOP pre-filled, the escalation pre-filled and the report drafted.',
    'No new system to learn: same layout, same buttons, same workflow.',
    'CTO: show Home. Point at a Co-pilot line, a 3D pin, the search bar and the severity counters as the CMO names them.',
  ].join('\n'));

  // 5 ── how it works
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('HOW CO-PILOT WORKS', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Co-pilot does the legwork. People decide', { placeholder: 'title' });
  const STEPS = [['LuRadar', 'Detect', 'Every sensor and system, every second'], ['LuGitMerge', 'Correlate', 'By time, place, person and credential'],
    ['LuSparkles', 'Explain', 'What happened, why it matters, sources'], ['LuListChecks', 'Recommend', 'Your own SOP, filled in for this case'],
    ['LuHand', 'You decide', 'Approve, adjust or dismiss. Every click logged'], ['LuFileCheck', 'Report and learn', 'Drafted report; your feedback improves it']];
  const sx0 = 1.25, sdx = (RX - 0.65 - sx0) / 5, sy = 2.15, sd = 1.15;
  s.addShape(LINE, { x: sx0, y: sy + sd / 2, w: sdx * 5, h: 0, line: { color: LAV, width: 1.5, transparency: 55, dashType: 'dash' }, objectName: 'Flow line' });
  for (const [i, [ic, lab, sub]] of STEPS.entries()) {
    const cx = sx0 + i * sdx, human = lab === 'You decide';
    if (human) s.addShape(OVAL, { x: cx - sd / 2 - 0.16, y: sy - 0.16, w: sd + 0.32, h: sd + 0.32, fill: { color: LAV, transparency: 72 }, line: { type: 'none' }, objectName: 'Human step halo' });
    await iconDisc(s, ic, cx - sd / 2, sy, sd, human ? { fill: LAV, tr: 0, ring: INK, ltr: 20, hex: HEX.navy, k: 0.46 } : { fill: CARD, tr: 0, ring: LAV, ltr: 45, k: 0.44 });
    T(s, lab, { x: cx - 1.0, y: sy + sd + 0.28, w: 2.0, h: 0.34, fontSize: 17, bold: true, align: 'center', color: human ? LAV : INK });
    fit('step ' + lab, sub, 14, false, 1.85, 0.72);
    T(s, sub, { x: cx - 0.95, y: sy + sd + 0.7, w: 1.9, h: 0.75, fontSize: 14, color: MUTED, align: 'center' });
    T(s, String(i + 1).padStart(2, '0'), { x: cx - 0.5, y: sy - 0.5, w: 1.0, h: 0.28, fontSize: 11, bold: true, color: MUTED, align: 'center', charSpacing: 2 });
  }
  T(s, 'FED BY THE SYSTEMS YOU ALREADY RUN', { x: MX, y: 5.05, w: 6, h: 0.24, fontSize: 10, bold: true, color: MUTED, charSpacing: 2 });
  {
    let cx = MX;
    for (const [ic, t] of [['LuCctv', 'CCTV and VMS, any brand'], ['LuKeyRound', 'Access control'], ['LuFence', 'AGIL Fence'], ['LuRadar', 'LiDAR'], ['LuMic', 'Intercom audio'], ['LuCalendarCheck', 'Rosters and flights']]) {
      const w = tw(t, 13, false) + 0.66;
      card(s, cx, 5.38, w, 0.46, { r: 0.23, tr: 15, ltr: 70, name: 'Source ' + t });
      s.addImage({ data: await icon(ic, HEX.muted), x: cx + 0.17, y: 5.49, w: 0.24, h: 0.24, altText: '' });
      T(s, t, { x: cx + 0.5, y: 5.38, w: w - 0.55, h: 0.46, fontSize: 13, valign: 'middle' });
      cx += w + 0.1;
    }
  }
  card(s, MX, 6.1, SW - 2 * MX, 0.62, { fill: LAV, tr: 88, line: LAV, ltr: 55, lw: 1, name: 'Principle' });
  s.addImage({ data: await icon('LuShieldCheck', HEX.lav), x: MX + 0.25, y: 6.24, w: 0.34, h: 0.34, altText: '' });
  T(s, [{ text: 'Co-pilot never acts alone. ', options: { bold: true, color: LAV } }, { text: 'Every intervention needs a person’s click, and every click is logged.', options: { color: INK } }], { x: MX + 0.75, y: 6.1, w: 11, h: 0.62, fontSize: 15, valign: 'middle' });
  s.addNotes([
    'CMO (1:00): Under the hood Co-pilot does five things for the operator: it detects; it correlates alarms by time, place, person and credential; it explains the incident in one sentence; it recommends the airport’s own SOP, pre-filled; and it drafts the report.',
    'Step five is always a person. Co-pilot never acts alone, and every click is logged.',
    'It runs on the systems CAG already has: cameras of any brand, access control, AGIL Fence, LiDAR, intercom audio, rosters and flight information.',
    'CTO: no action.',
  ].join('\n'));

  // 6 ── tonight's cast
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('TONIGHT’S NIGHT SHIFT', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Four people. One Co-pilot', { placeholder: 'title' });
  const CAST = [['nurul', 'Nurul', 'Control room operator', 'Works seven explained incidents instead of 1,248 raw alarms.', 'Scenes 1–7'],
    ['daniel', 'Daniel', 'Duty security manager', 'Asks Co-pilot questions in plain English, with sources in every answer.', 'Ask'],
    ['arjun', 'Arjun', 'Patrol officer', 'Gets the follower’s photo and the bag owner’s location on his phone.', 'Scenes 1, 3'],
    ['grace', 'Grace', 'Head of security', 'Signs off an AI-drafted, audit-ready report at the 07:00 handover.', 'Report']];
  for (const [i, [key, nm, role, line, tag]] of CAST.entries()) {
    const x = MX + i * (cw + 0.25), y = 1.78, h = 4.9;
    card(s, x, y, cw, h, { tr: 20, ltr: 75, shadow: true, name: 'Persona ' + nm });
    s.addImage({ path: A(`persona_${key}.jpg`), x: x + 0.08, y: y + 0.08, w: cw - 0.16, h: 2.35, sizing: { type: 'cover', w: cw - 0.16, h: 2.35 }, altText: `${nm}, ${role.toLowerCase()}, seen from behind at work`, objectName: 'Portrait ' + nm });
    T(s, nm, { x: x + 0.25, y: y + 2.62, w: cw - 0.5, h: 0.4, fontSize: 20, bold: true });
    T(s, role, { x: x + 0.25, y: y + 3.03, w: cw - 0.5, h: 0.28, fontSize: 13, color: LAV, bold: true });
    fit('cast ' + nm, line, 14, false, cw - 0.5, 0.95);
    T(s, line, { x: x + 0.25, y: y + 3.42, w: cw - 0.5, h: 0.95, fontSize: 14, color: MUTED });
    pill(s, x + 0.25, y + h - 0.48, tag, LAV, LAV, { tr: 86, line: LAV, ltr: 50, pt: 10, cs: 0.5 });
  }
  s.addNotes([
    'CMO (0:45): Four people you will meet tonight. Nurul runs the V11 console. Daniel, the duty manager, asks Co-pilot questions in plain English. Arjun is on patrol with the mobile app. Grace signs off the report at the 07:00 handover.',
    'CTO: no action.',
  ].join('\n'));

  // 7 ── divider: live demo
  pres.addSection({ title: SEC.demo });
  s = pres.addSlide({ masterName: 'SECTION', sectionTitle: SEC.demo });
  s.addText('LIVE DEMO  ·  AGIL® SECURE ISMS V11', { placeholder: 'kicker', charSpacing: 3 });
  s.addText('Let’s run a night shift, live', { placeholder: 'title' });
  s.addText('Seven scenarios, grouped by your four priorities. The numbered markers on each slide match the clicks on screen.', { placeholder: 'body' });
  live(s, 0.6, 5.95, 'Over to the system');
  s.addNotes([
    'CMO (0:20): Let’s run a night shift, live. Over to you. [Hand over to the CTO.]',
    'CTO: take control of V11 on Home. From here every slide matches one screen; the numbered markers on each slide are the things to point at or click, in order.',
  ].join('\n'));

  // 8 ── demo map
  s = pres.addSlide({ masterName: 'MAP', sectionTitle: SEC.demo });
  s.addText('02:14  ·  ONE NIGHT AT THE AIRPORT', { placeholder: 'kicker', charSpacing: 2 });
  s.addText(runs('Seven scenarios.\nAll live in V11.'), { placeholder: 'title' });
  const MAP = [['Tailgating + anti-passback', '02:14  ·  T3 Staff Door D-214', 'Critical'], ['Perimeter intrusion', '02:15  ·  Fence Sector 5, north', 'Critical'],
    ['Unattended bag', '02:04  ·  T2 Gate B12', 'Warning'], ['Fight detected', '02:11  ·  T2 Arrival Belt 5', 'Warning'],
    ['Identity spoofing', '02:13  ·  T1 Door C2', 'Warning'], ['Overstay in a restricted zone', '01:45  ·  T4 Baggage Hall B2', 'Info'],
    ['Watchlist person loitering', '02:12  ·  T1 Departure Row K', 'Warning']];
  for (const [i, [nm, sub, sev]] of MAP.entries()) {
    const y = 2.18 + i * 0.56;
    s.addText(String(i + 1), { shape: OVAL, x: MX, y: y + 0.03, w: 0.38, h: 0.38, fill: { color: SEV[sev][0] }, line: { color: INK, width: 1 }, color: SEV[sev][1], bold: true, fontSize: 13, align: 'center', valign: 'middle', margin: 0, objectName: 'Scene pin ' + (i + 1) });
    T(s, nm, { x: MX + 0.55, y: y - 0.02, w: 4.8, h: 0.27, fontSize: 15, bold: true });
    T(s, sub, { x: MX + 0.55, y: y + 0.24, w: 4.8, h: 0.22, fontSize: 12, color: MUTED });
  }
  T(s, [{ text: 'THEN  ', options: { bold: true, color: LAV, charSpacing: 2, fontSize: 10 } }, { text: '02:30 Ask Co-pilot   ·   07:00 Report and handover', options: { color: INK } }], { x: MX, y: 6.12, w: 5.6, h: 0.26, fontSize: 13 });
  live(s, MX, 6.48, 'Home  ›  Real Time Alerts');
  s.addNotes([
    'CMO (1:00): Seven scenarios across the airport, from a tailgated staff door in T3 to a fence climb on the north perimeter. Co-pilot has already ranked them: two Critical, four Warning, one Info.',
    'Then at 02:30 the duty manager asks Co-pilot a question, and at 07:00 the report is ready for handover.',
    'CTO: Home. Point at the counters (2 Critical, 4 Warnings, 1 Info), then at the pins in the 3D view. Do not open an alarm yet.',
  ].join('\n'));

  // 9–19 ── scenes
  const F02 = 'V11-02-tailgating-investigation', F03 = 'V11-03-tailgating-sop-flow-door-control', F04 = 'V11-04-identity-spoofing-investigation',
    F05 = 'V11-05-unattended-bag-sop-flow', F06 = 'V11-06-watchlist-loitering-sop-verify', F07 = 'V11-07-fight-detection-investigation',
    F08 = 'V11-08-overstay-investigation', F09 = 'V11-09-agil-fence-lidar-investigation', F10 = 'V11-10-escalate-event-copilot-prefill',
    F11 = 'V11-11-search-ask-copilot', F12 = 'V11-12-incident-management-report';
  const CAM1 = [916, 296, 210, 248], CAM2 = [1134, 296, 210, 120], CAM3 = [1134, 424, 210, 120];

  await scene({
    kicker: 'SCENE 1  ·  02:14  ·  T3 STAFF DOOR D-214', sev: 'Critical', ask: 'Priority 1 · Correlation',
    title: '5 alarms. 1 incident. Explained.',
    quote: 'Two people passed D-214 on one badge (J. Tan, Ground Ops). The follower has no credential and is heading airside to Pier C.',
    watch: [['Co-pilot line:', '5 linked alarms, 94%'], ['Evidence:', 'the follower boxed as “No badge”'], ['Linked alarms:', 'badge, door, LiDAR, video']],
    live: 'Real Time Alerts  ›  Staff Door D-214',
    visual: async (s, vx) => {
      const dv = await device(s, F02, vx, 1.0, 6.78, 'V11 Active Alarms for Staff Door D-214 on the Investigation tab: AI summary, linked alarms and camera evidence');
      const a1 = anchor(F02, 'Co-pilot · 5 linked');
      marker(s, ...dv.map(a1.end + 20, a1.mid), 1);
      await lens(s, dv, F02, CAM1, 7.9, 2.0, 2.3, { n: 2, alt: 'Camera 3-118 at Door D-214: badge holder and follower, the follower boxed in red as No badge' });
      marker(s, ...dv.map(898, 790), 3);
    },
    notes: [
      'CMO (2:00): 02:14, Staff Door D-214 in Terminal 3. Five separate alarms fire: a badge, the door opening, a LiDAR count of two people, video analytics, the door held open.',
      'Co-pilot links them into one incident and explains it in one sentence: one badge, two people, and the follower has no credential and is heading airside.',
      'CTO: 1) Click “Staff Door D-214” at the top of Real Time Alerts. 2) Active Alarms opens on Investigation: point at the camera tile with “No badge”. 3) Scroll the linked alarms and click “+2 more”.',
      'If asked how Co-pilot knows: LiDAR counts two crossings against one badge, and video analytics confirms.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 1  ·  02:17  ·  RESPOND', sev: 'Critical', ask: 'Priority 1 · Automation',
    title: 'Co-pilot prepares.\nYou approve.',
    quote: 'SOP-SEC-014 loaded and pre-filled. Step 1 is done: the follower is verified on three cameras. Step 2 needs your approval.',
    watch: [['Done by Co-pilot:', 'step 1, follower tracked'], ['Your approval:', 'lock D-214, anti-passback on'], ['Dispatch:', 'Arjun gets the follower’s photo']],
    live: 'SOP Flow  ›  Lock',
    visual: async (s, vx) => {
      const dv = await device(s, F03, vx, 1.0, 6.78, 'V11 SOP Flow for D-214 with the Critical Action step and door buttons; the 3D Locate view shows D-214 locked by the operator');
      const a1 = anchor(F03, 'Done by Co-pilot'), a3 = anchor(F03, 'Dispatch patrol');
      marker(s, ...dv.map(a1.x - 26, a1.mid), 1);
      await lens(s, dv, F03, [916, 698, 428, 126], 0.95, 4.72, 4.3, { n: 2, alt: 'Critical Action Required: lock D-214 and switch on hard anti-passback, with Lock, Secure and Normal buttons' });
      marker(s, ...dv.map(a3.end + 24, a3.mid), 3);
    },
    notes: [
      'CMO (1:30): Co-pilot has loaded the airport’s own SOP and done step one: the follower is verified and auto-followed on three cameras.',
      'Step two needs a person: lock D-214 and switch on hard anti-passback for two hours. One click. And Arjun gets the follower’s photo on his phone.',
      'CTO: 1) Click the “SOP Flow” tab. 2) In step 2 click “Lock”; the 3D view shows D-214 locked by the operator. 3) Point at the dispatch step (photo already sent).',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 1  ·  02:18  ·  ESCALATE', sev: 'Critical', ask: 'Priority 1 · Automation',
    title: 'Escalated in one click, pre-filled',
    quote: 'Category, severity and remarks are filled in from the investigation. Edit anything, then create the incident.',
    watch: [['Category:', '“Unauthorised airside entry”'], ['Severity:', 'Critical, from the evidence'], ['Remarks:', 'drafted by Co-pilot, editable']],
    live: 'Escalate  ›  Create Incident',
    visual: async (s, vx) => {
      const dv = await device(s, F10, vx, 1.0, 6.78, 'V11 Escalate Event dialog with Category, Severity and Remarks pre-filled by Co-pilot');
      const r = [391, 488, 618, 222];
      const ln = await lens(s, dv, F10, r, 6.2, 4.9, 4.6, { alt: 'Escalate Event form: Category Unauthorised airside entry, Severity Critical, Remarks drafted by Co-pilot' });
      marker(s, ...ln.map(668, 539), 1);
      marker(s, ...ln.map(980, 539), 2);
      marker(s, ...ln.map(980, 680), 3);
    },
    notes: [
      'CMO (1:00): Escalating used to mean retyping everything. Now the Escalate dialog your team already uses comes pre-filled: category, severity and remarks, straight from the investigation.',
      'The operator checks it, edits if needed, and creates the incident.',
      'CTO: 1) Click “Escalate”. 2) Point at Category, Severity and Remarks (the lavender outline means Co-pilot filled them). 3) Click “Create Incident”.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 2  ·  02:15  ·  FENCE SECTOR 5, NORTH', sev: 'Critical', ask: 'Priority 3 · AGIL Fence',
    title: 'A real intruder,\nnot the wind',
    quote: 'Climb signature on segment 5-14. LiDAR sees one 1.7 m object; thermal shows one person. Wind is 12 km/h, so not a nuisance.',
    watch: [['One alert list:', 'no separate fence platform'], ['LiDAR:', 'one object, 1.7 m tall, at the fence'], ['Thermal PTZ:', 'turned by itself; one person']],
    live: 'Fence Sector 5  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F09, vx, 1.0, 6.78, 'V11 Active Alarms for Fence Sector 5: LiDAR point cloud, thermal PTZ view and linked alarms');
      const a1 = anchor(F09, 'fence + LiDAR');
      marker(s, ...dv.map(a1.end + 20, a1.mid), 1);
      await lens(s, dv, F09, CAM2, 2.55, 1.35, 2.45, { n: 2, alt: 'LiDAR L-5B point cloud: one human-sized cluster at the fence' });
      await lens(s, dv, F09, CAM1, 2.7, 3.05, 2.05, { n: 3, alt: 'PTZ 7-02 thermal view: one person at the fence, boxed Person 1.7 m' });
    },
    notes: [
      'CMO (2:00): Your priority three: AGIL Fence, fully unified. At 02:15 the fence picks up a climb on segment 5-14, and it lands in the same alert list as everything else, not on a separate platform.',
      'LiDAR confirms one object, 1.7 metres tall. The PTZ camera turns by itself and thermal shows one person. Earlier tonight three fence alarms were wind and animals; Co-pilot closed them with reasons.',
      'CTO: 1) Click “Fence Sector 5”. 2) Point at the LiDAR tile. 3) Point at the thermal PTZ tile (“Person 1.7 m”), then the linked alarms.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 3  ·  02:04  ·  T2 GATE B12', sev: 'Warning', ask: 'Priority 2 · Video analytics',
    title: 'Bag and owner linked in 6 seconds',
    quote: 'Suitcase unattended since 02:04. Its owner left it at 01:58 and is now at Food Court L3. Steps 1–4 done in 6.2 s.',
    watch: [['Person–object link:', 'bag placed at 01:58'], ['Owner found:', 'by clothing, no face matching'], ['You decide:', 'approve sending Arjun']],
    live: 'Gate B12 Holdroom  ›  SOP Flow',
    visual: async (s, vx) => {
      const dv = await device(s, F05, vx, 1.0, 6.78, 'V11 SOP Flow for the unattended bag at Gate B12: steps 1 to 4 done by Co-pilot, step 5 awaiting approval; cameras show the bag and its owner');
      await lens(s, dv, F05, CAM2, 7.75, 1.45, 2.5, { n: 1, alt: 'Camera 2-031 at 01:58: the owner placing the bag' });
      await lens(s, dv, F05, CAM3, 7.75, 3.12, 2.5, { n: 2, alt: 'Camera 2-077 now: the owner at Food Court L3, boxed Owner' });
      const a3 = anchor(F05, 'Approve');
      marker(s, ...dv.map(a3.end + 34, a3.mid), 3);
    },
    notes: [
      'CMO (2:00): Your priority two: left-behind baggage, without facial recognition. A suitcase at Gate B12.',
      'Co-pilot links it to the person who placed it at 01:58, follows that person by clothing and bag across four cameras, and finds them at the Food Court. Steps one to four took 6.2 seconds. Step five, sending Arjun, is the operator’s decision.',
      'CTO: 1) Click “Gate B12 Holdroom” (it opens on SOP Flow). 2) Point at the owner tiles: 01:58 and now. 3) In step 5 click “Approve”.',
      'If asked about privacy: appearance attributes only (clothing, bags, movement); no face matching.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 4  ·  02:11  ·  T2 ARRIVAL BELT 5', sev: 'Warning', ask: 'Priority 2 · Video analytics',
    title: 'Seen and heard before it escalates',
    quote: 'Two passengers at Belt 5 went from arguing to pushing. Pose analytics and the intercom microphone agree. Nobody is on the ground.',
    watch: [['Pose analytics:', 'aggression score 0.89'], ['Intercom audio:', 'raised voices 30 s earlier'], ['Responders:', 'nearest officers 40 m, 90 m']],
    live: 'Arrival Hall Belt 5  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F07, vx, 1.0, 6.78, 'V11 Active Alarms for Arrival Hall Belt 5: camera with aggression box, linked audio and video alarms');
      await lens(s, dv, F07, CAM1, 2.6, 1.45, 2.3, { n: 1, alt: 'Camera 1-142 at Belt 5: two passengers boxed Aggression 0.89' });
      const a2 = anchor(F07, 'Raised voices'), a3 = anchor(F07, 'Nearest officers');
      marker(s, ...dv.map(a2.end + 26, a2.mid), 2);
      marker(s, ...dv.map(1300, a3.mid), 3);
    },
    notes: [
      'CMO (1:30): Arrival Belt 5. Pose analytics sees pushing, with an aggression score of 0.89, and the intercom microphone heard raised voices thirty seconds earlier.',
      'Two different sensors agree, so it is a real incident, and Co-pilot lists the nearest officers: 40 and 90 metres away.',
      'CTO: 1) Click “Arrival Hall Belt 5”. 2) Point at the camera tile (“Aggression 0.89”). 3) Point at “Raised voices” in the linked alarms and the officers in the header.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 5  ·  02:13  ·  T1 DOOR C2', sev: 'Warning', ask: 'Priority 1 · Access intelligence',
    title: 'One card, two doors, four minutes',
    quote: 'Card S-20931 opened A17 at 02:09 and C2 at 02:13. The fastest route takes 19 min, and the person at C2 is not the holder.',
    watch: [['Impossible travel:', '4 min against 19 min'], ['Not the holder:', 'C2 and A17 side by side'], ['Legacy card ID:', 'old SSID still active']],
    live: 'T1 Door C2  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F04, vx, 1.0, 6.78, 'V11 Active Alarms for T1 Door C2: cameras at C2 and A17, appearance check and linked access alarms');
      const a1 = anchor(F04, 'Same card used', 1), a3 = anchor(F04, 'legacy SSID', 1);
      marker(s, ...dv.map(1336, a1.mid - 2), 1);
      await lens(s, dv, F04, CAM1, 6.2, 1.55, 2.1, { n: 2, alt: 'Camera 1-204 at Door C2: the person is boxed Not the holder' });
      await lens(s, dv, F04, CAM2, 8.45, 1.55, 1.8, { alt: 'Camera 3-052 at Door A17 at 02:09: the cardholder' });
      await lens(s, dv, F04, CAM3, 8.45, 2.78, 1.8, { alt: 'Appearance check: the person at C2 against the cardholder, 31% similar' });
      marker(s, ...dv.map(a3.end + 24, a3.mid), 3);
    },
    notes: [
      'CMO (2:00): Access intelligence. Card S-20931 opened T3 Door A17 at 02:09 and T1 Door C2 four minutes later. The fastest route takes nineteen. And the person at C2 does not look like the holder.',
      'Co-pilot also shows why it happened: C2 was opened with the card’s old ID, which should have been revoked when the card was re-issued. Validate the context, not only the card.',
      'CTO: 1) Click “T1 Door C2”. 2) Point at the two camera tiles (C2 now, A17 at 02:09). 3) Point at the linked alarm “Granted · T1 C2 (legacy SSID)”.',
      'Note: “old and new SSID” means the legacy and re-issued credential IDs on the same access card.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: 'SCENE 6  ·  01:45  ·  T4 BAGGAGE HALL B2', sev: 'Info', ask: 'Priority 1 · Access intelligence',
    title: 'Your own rules, now running live',
    quote: 'K. Lim badged into B2 at 22:36 and has not left. The shift ended at 01:00, B2 is outside K. Lim’s duties, and there is no overtime request.',
    watch: [['Your rules:', '4 of 5 triggered, CAG’s spec'], ['Context:', 'roster checked, no overtime request'], ['Right urgency:', 'Info, a radio check']],
    live: 'Baggage Hall B2  ›  Investigation',
    visual: async (s, vx) => {
      const dv = await device(s, F08, vx, 1.0, 6.78, 'V11 Active Alarms for Baggage Hall B2: overstay with the airport rules that triggered');
      await lens(s, dv, F08, [916, 738, 428, 112], 0.95, 4.75, 4.3, { n: 1, alt: 'Airport rules triggered: restricted zone in wee hours, outside scope of duty, non-working hours, dwell 3h 40m against 45 min usual' });
      const a2 = anchor(F08, 'In zone since'), a3 = anchor(F08, 'Baggage Hall B2');
      marker(s, ...dv.map(a2.end + 24, a2.mid), 2);
      marker(s, ...dv.map(a3.end + 24, a3.mid), 3);
    },
    notes: [
      'CMO (1:30): Five years ago CAG specified business-analytics rules: restricted areas in the wee hours, zones outside someone’s duty, dwell beyond their usual pattern. They now run live in Co-pilot.',
      'K. Lim has been in Baggage Hall B2 for 3 hours 40 minutes, after the shift ended, with no overtime request. Co-pilot flags it as Info: a radio check, not an alarm storm.',
      'CTO: 1) Click “Baggage Hall B2” (bottom of the list). 2) Point at the rules in the linked list. 3) Point at the event header (in zone since 22:36) and the Info card.',
    ].join('\n'),
  });

  await scene({
    kicker: 'SCENE 7  ·  02:12  ·  T1 DEPARTURE ROW K', sev: 'Warning', ask: 'Governed AI',
    title: 'Sensitive calls\nstay human',
    quote: 'Possible watchlist match, loitering 23 min and three approaches to a staff door. Nothing is actioned until you confirm.',
    watch: [['Behaviour first:', '23 min, 3 door approaches'], ['Side by side:', 'live capture and reference'], ['Your call:', 'confirm or reject, logged']],
    live: 'Departure Hall Row K  ›  SOP Flow',
    visual: async (s, vx) => {
      const dv = await device(s, F06, vx, 1.0, 6.78, 'V11 SOP Flow for Departure Hall Row K: verification step first, with live capture and watchlist reference');
      const a1 = anchor(F06, 'Approached staff door');
      marker(s, ...dv.map(a1.end + 24, a1.mid), 1);
      await lens(s, dv, F06, [1134, 296, 210, 248], 7.85, 1.5, 2.2, { n: 2, alt: 'Live capture at 02:12 shown above the watchlist reference image' });
      await lens(s, dv, F06, [916, 634, 428, 126], 6.2, 4.55, 4.3, { n: 3, alt: 'Critical Action Required: verify first, with Confirm match and Not a match buttons' });
    },
    notes: [
      'CMO (2:00): The most sensitive one. Departure Row K: someone has loitered 23 minutes and approached a staff door three times, and may match a watchlist entry.',
      'Co-pilot shows the live capture next to the reference, and stops. Nothing happens until the operator confirms or rejects, and that decision is logged. Whether matching is used at all is set by airport policy.',
      'CTO: 1) Click “Departure Hall Row K” (it opens on SOP Flow). 2) Point at the live capture and the reference. 3) Point at “Confirm match” and “Not a match”; click “Not a match” to show a clean close.',
    ].join('\n'),
  });

  await scene({
    side: 'left', kicker: '02:30  ·  THE DUTY MANAGER ASKS', ask: 'Priority 1 · Natural language',
    title: 'Ask in plain English',
    quoteLabel: 'DANIEL ASKS  ·  CO-PILOT ANSWERS',
    quote: '“Show critical incidents in Terminal 5 in the last hour.” Two critical incidents: one open and awaiting a decision, one closed as wildlife.',
    watch: [['Ask:', 'type the question into the search bar'], ['Answer:', 'one line, plus the matching alerts'], ['Sources:', 'event log, SOP section and cameras']],
    live: 'Search bar  ›  ask in plain English',
    visual: async (s, vx) => {
      const dv = await device(s, F11, vx, 1.0, 6.78, 'V11 search bar with a Co-pilot question and the answer dropdown listing two critical incidents in Terminal 5 with sources');
      const a1 = anchor(F11, 'Show critical incidents'), a2 = anchor(F11, 'Two critical incidents'), a3 = anchor(F11, 'Sources:');
      marker(s, ...dv.map(a1.end + 24, 30), 1);
      marker(s, ...dv.map(a2.end + 24, a2.mid), 2);
      marker(s, ...dv.map(a3.end + 24, a3.mid), 3);
    },
    notes: [
      'CMO (2:00): 02:30. Daniel, the duty manager, does not want to click through screens. He asks: “Show critical incidents in Terminal 5 in the last hour.”',
      'Co-pilot answers in one line, shows the matching alerts and cites its sources. Follow-up questions are one click away.',
      'CTO: 1) Click the search bar and type the question. 2) Point at the answer and the two result cards. 3) Point at “Sources” and the suggested follow-ups.',
    ].join('\n'),
  });

  await scene({
    kicker: '07:00  ·  HANDOVER', ask: 'Priority 1 · Reporting',
    title: 'The report writes itself',
    quoteLabel: 'CO-PILOT REPORT DRAFT',
    quote: 'Follower entered airside behind badge B-55821 and was intercepted at L2-East at 02:21. Root cause: courtesy tailgating and a slow door closer.',
    watch: [['Incident list:', 'every escalation lands here'], ['Report draft:', 'written from the audit trail'], ['Close Incident:', 'a person signs it off']],
    live: 'Incident Management  ›  TGT-214',
    visual: async (s, vx) => {
      const dv = await device(s, F12, vx, 0.95, 6.78, 'V11 Incident Management: incident list and the TGT-214 detail with a Co-pilot report draft in Remarks');
      const a1 = anchor(F12, 'TGT-214'), a3 = anchor(F12, 'Close Incident');
      marker(s, ...dv.map(a1.end + 30, a1.mid), 1);
      await lens(s, dv, F12, [876, 596, 668, 120], 6.35, 5.72, 5.2, { n: 2, alt: 'Co-pilot report draft in the Remarks timeline' });
      marker(s, ...dv.map(a3.end + 40, a3.mid), 3);
    },
    notes: [
      'CMO (2:00): 07:00, handover. Every escalation is in Incident Management. Co-pilot has drafted the report from the audit trail: what happened, what was decided, the root cause and recommendations.',
      'Nurul adds a remark and Grace signs it off. From the first alarm to a report: about ten minutes.',
      'CTO: 1) Click “Incident Management”. 2) Select TGT-214 and point at the Co-pilot report draft in Remarks. 3) Click “Close Incident”. Then “Exit Incident Management” and return to Home.',
    ].join('\n'),
  });

  // 20 ── platform
  pres.addSection({ title: SEC.platform });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('PLATFORM  ·  UNIFIED AND MULTI-SITE', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('One platform above every system and site', { placeholder: 'title' });
  {
    const COLS = [
      ['ANY-BRAND SYSTEMS', [['LuCctv', 'CCTV and VMS'], ['LuKeyRound', 'Access control'], ['LuFence', 'AGIL Fence'], ['LuRadar', 'LiDAR'], ['LuMic', 'Intercom audio'], ['LuCalendarCheck', 'Rosters and flights']], MUTED, HEX.muted],
      ['SITE EDGE, PER TERMINAL', [['LuScanEye', 'Video analytics'], ['LuRadar', 'LiDAR fusion'], ['LuListChecks', 'Local rules'], ['LuServer', 'Store and forward']], TEAL, HEX.teal],
      ['AGIL® SECURE ISMS CORE', [['LuGitMerge', 'Correlation'], ['LuSparkles', 'Co-pilot, on premise'], ['LuMap', '3D digital twin'], ['LuFileCheck', 'Case and audit']], LAV, HEX.lav],
      ['WHERE PEOPLE WORK', [['LuMonitor', 'V11 console'], ['LuUserCheck', 'Responder app'], ['LuFileText', 'Reports, insights']], BLUE, HEX.blue],
    ];
    const colW = 2.62, gap = (SW - 2 * MX - 4 * colW) / 3, top = 1.8, ch = 3.25;
    for (const [i, [hd, items, col, hex]] of COLS.entries()) {
      const x = MX + i * (colW + gap);
      card(s, x, top, colW, ch, { tr: 18, line: col, ltr: 55, lw: 1, shadow: true, name: 'Layer ' + hd });
      T(s, hd, { x: x + 0.22, y: top + 0.2, w: colW - 0.3, h: 0.25, fontSize: 10, bold: true, color: col, charSpacing: 1.5 });
      for (const [j, [ic, t]] of items.entries()) {
        const yy = top + 0.62 + j * 0.42;
        s.addImage({ data: await icon(ic, hex), x: x + 0.22, y: yy + 0.04, w: 0.24, h: 0.24, altText: '' });
        T(s, t, { x: x + 0.56, y: yy, w: colW - 0.7, h: 0.32, fontSize: 14, valign: 'middle' });
      }
      if (i < 3) s.addImage({ data: await icon('LuChevronRight', HEX.lav), x: x + colW + gap / 2 - 0.15, y: top + ch / 2 - 0.15, w: 0.3, h: 0.3, altText: '' });
    }
    T(s, 'Keeps detecting if the network link drops', { x: MX + colW + gap + 0.22, y: top + 2.48, w: colW - 0.4, h: 0.5, fontSize: 12, color: TEAL, italic: true });
    // multi-site governance band
    const by = 5.3;
    card(s, MX, by, SW - 2 * MX, 1.42, { fill: CARD, tr: 10, line: LAV, ltr: 50, lw: 1, name: 'Multi-site governance' });
    s.addImage({ data: await icon('LuNetwork', HEX.lav), x: MX + 0.25, y: by + 0.22, w: 0.32, h: 0.32, altText: '' });
    T(s, [{ text: 'One security baseline across sites. ', options: { bold: true } }, { text: 'Shared playbooks and governance; each site keeps local autonomy. Open API and SDK for third-party systems.', options: { color: MUTED } }],
      { x: MX + 0.72, y: by + 0.18, w: 11.1, h: 0.42, fontSize: 14, valign: 'middle' });
    let cx = MX + 0.72;
    for (const t of ['Central SOC', 'T1', 'T2', 'T3', 'T4', 'T5', 'Cargo', 'Regional airfield']) {
      cx += pill(s, cx, by + 0.8, t, CARD, INK, { pt: 11, cs: 0.5, line: LAV, ltr: 55, h: 0.34, padX: 0.36 }) + 0.12;
    }
    pill(s, RX - 2.95, by + 0.8, 'PRIORITIES 3 + 4', LAV, LAV, { tr: 86, line: LAV, ltr: 45, h: 0.34 });
  }
  s.addNotes([
    'CMO (1:30): What you saw sits above the systems you already own. Cameras and access control from any vendor, AGIL Fence and LiDAR feed edge nodes at each site, which keep detecting even if the network link drops.',
    'The AGIL Secure core correlates, runs Co-pilot on premise and keeps the audit trail. Operators work in the V11 console, patrols in the responder app.',
    'For CAG that means one security baseline across terminals, cargo and remote sites, while each site keeps local autonomy: your priorities three and four.',
    'CTO (optional): show the location selector in the V11 header (Main Airport › T3).',
  ].join('\n'));

  // 21 ── trust
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('GOVERNANCE BY DESIGN', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('AI that shows its work. People decide', { placeholder: 'title' });
  {
    const TR = [['LuHand', 'Human in command', 'Co-pilot proposes; a person approves every intervention.'],
      ['LuFileText', 'Shows its sources', 'Every answer cites the events, cameras and SOP sections behind it.'],
      ['LuEyeOff', 'Privacy first', 'Object association needs no facial recognition. Watchlist matching is optional and operator-verified.'],
      ['LuServer', 'On-premise AI', 'Models run inside the airport network. Video stays on site.'],
      ['LuLockKeyhole', 'Role-based, per site', 'Staff see only the sites and data they are cleared for.'],
      ['LuListChecks', 'Complete audit trail', 'Every AI suggestion and every human decision is logged.']];
    const tw3 = (SW - 2 * MX - 2 * 0.3) / 3, th = 2.25;
    for (const [i, [ic, hd, tx]] of TR.entries()) {
      const x = MX + (i % 3) * (tw3 + 0.3), y = 1.8 + Math.floor(i / 3) * (th + 0.3);
      card(s, x, y, tw3, th, { tr: 20, ltr: 75, shadow: true, name: 'Trust ' + hd });
      await iconDisc(s, ic, x + 0.3, y + 0.3, 0.66);
      T(s, hd, { x: x + 1.15, y: y + 0.38, w: tw3 - 1.4, h: 0.5, fontSize: 18, bold: true, valign: 'middle' });
      fit('trust ' + hd, tx, 15, false, tw3 - 0.6, 1.05);
      T(s, tx, { x: x + 0.3, y: y + 1.12, w: tw3 - 0.6, h: 1.05, fontSize: 15, color: MUTED });
    }
  }
  s.addNotes([
    'CMO (1:00): Trust is designed in, not added later. A person approves every intervention. Every answer shows its sources.',
    'Object association needs no facial recognition; watchlist matching is optional, set by airport policy and always verified by a person. Models run on premise and video stays on site. Access is role-based per site, and every AI suggestion and human decision is logged.',
  ].join('\n'));

  // 22 ── value
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('WHAT CHANGES FOR CAG', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Fewer alarms to chase. Faster, steadier calls', { placeholder: 'title' });
  fit('value title', 'Fewer alarms to chase. Faster, steadier calls', 34, true, 11.6, 0.72, 1.0);
  {
    const ROWS = [['Alarms', 'Hundreds a shift, triaged by hand', 'Seven ranked, explained incidents'], ['Evidence', 'Nine screens, searched manually', 'Assembled in one panel'],
      ['Response', 'SOP binders; varies by shift', 'SOP filled in; one click to approve'], ['Investigation', 'Hours of footage', 'One plain-English question'],
      ['Reporting', 'Written after the shift', 'Drafted, ready to sign']];
    const x0 = MX, wA = 1.55, wB = 2.45, wC = 2.95, rh = 0.74, y0 = 1.85;
    T(s, 'TODAY', { x: x0 + wA + 0.2, y: y0, w: wB, h: 0.24, fontSize: 10, bold: true, color: MUTED, charSpacing: 2 });
    T(s, 'WITH CO-PILOT', { x: x0 + wA + wB + 0.45, y: y0, w: wC, h: 0.24, fontSize: 10, bold: true, color: LAV, charSpacing: 2 });
    for (const [i, [k, a, b]] of ROWS.entries()) {
      const y = y0 + 0.36 + i * (rh + 0.1);
      card(s, x0, y, wA + wB + wC + 0.65, rh, { tr: 25, ltr: 80, name: 'Change ' + k });
      T(s, k, { x: x0 + 0.2, y, w: wA, h: rh, fontSize: 15, bold: true, valign: 'middle' });
      T(s, a, { x: x0 + wA + 0.2, y, w: wB - 0.3, h: rh, fontSize: 14, color: MUTED, valign: 'middle' });
      s.addImage({ data: await icon('LuArrowRight', HEX.lav), x: x0 + wA + wB + 0.12, y: y + rh / 2 - 0.12, w: 0.24, h: 0.24, altText: '' });
      T(s, b, { x: x0 + wA + wB + 0.45, y, w: wC, h: rh, fontSize: 14, bold: true, valign: 'middle' });
      fit('value row ' + k, b, 14, true, wC, rh);
    }
    // stat rows: the demo scenario in numbers
    const sx = 8.5, sw2 = RX - sx, sh = 0.98;
    T(s, 'TONIGHT’S DEMO, IN NUMBERS', { x: sx, y: y0, w: 4, h: 0.24, fontSize: 10, bold: true, color: LAV, charSpacing: 2 });
    const ST = [['1,248 → 7', 'raw alarms to incidents'], ['6.2 s', 'to link a bag to its owner'], ['1 click', 'to escalate, pre-filled'], ['~10 min', 'from alarm to signed report']];
    for (const [i, [v, l]] of ST.entries()) {
      const y = y0 + 0.36 + i * (sh + 0.12);
      card(s, sx, y, sw2, sh, { tr: 15, line: LAV, ltr: 60, lw: 1, shadow: true, name: 'Stat ' + v });
      fit('stat ' + v, v, 30, true, 2.3, 0.6);
      T(s, v, { x: sx + 0.25, y, w: 2.3, h: sh, fontSize: 30, bold: true, valign: 'middle' });
      fit('stat label ' + v, l, 14, false, sw2 - 2.75, 0.6);
      T(s, l, { x: sx + 2.6, y, w: sw2 - 2.75, h: sh, fontSize: 14, color: MUTED, valign: 'middle' });
    }
    T(s, 'Demo scenario figures. A pilot measures them on CAG data.', { x: sx, y: 6.66, w: RX - sx, h: 0.26, fontSize: 11, color: MUTED });
  }
  s.addNotes([
    'CMO (1:30): What changes for CAG: fewer alarms to chase, evidence in one place, the SOP pre-filled, questions instead of footage hunts, and reports that write themselves.',
    'The numbers on the right come from tonight’s demo scenario. In a pilot we baseline CAG’s current figures and measure the same things on CAG data, together.',
  ].join('\n'));

  // 23 ── roadmap
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.platform });
  s.addText('ROADMAP', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('From today’s demo to an Airport Security OS', { placeholder: 'title' });
  fit('roadmap title', 'From today’s demo to an Airport Security OS', 34, true, 11.6, 0.72, 1.0);
  {
    const H4 = [['NOW', 'Demo', 'V11 + Co-pilot', ['Seven airport scenarios', 'Correlation and SOP steps', 'Ask Co-pilot, drafted reports'], GREEN],
      ['NEXT', 'Pilot', 'One terminal, ~12 weeks', ['Priority scenarios on CAG data', 'Joint KPIs and baseline', 'Privacy and watchlist policy agreed'], BLUE],
      ['THEN', 'Scale', 'All terminals', ['AGIL Fence off the legacy platform', 'Multi-site governance', 'Responder app for patrols'], TEAL],
      ['VISION', 'Security OS', 'Predictive and federated', [], LAV]];
    const colW = (SW - 2 * MX - 3 * 0.25) / 4, ly = 2.2;
    s.addShape(LINE, { x: MX + 0.3, y: ly, w: SW - 2 * MX - 0.6, h: 0, line: { color: LAV, width: 1.5, transparency: 50 }, objectName: 'Timeline' });
    for (const [i, [tag, ttl, sub, pts, col]] of H4.entries()) {
      const x = MX + i * (colW + 0.25);
      s.addShape(OVAL, { x: x + 0.22, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col }, line: { color: INK, width: 1.25 }, objectName: 'Milestone ' + tag });
      T(s, tag, { x: x + 0.12, y: ly - 0.5, w: 2, h: 0.26, fontSize: 11, bold: true, color: col, charSpacing: 2, valign: 'middle' });
      const y = 2.6, h = 3.95;
      card(s, x, y, colW, h, { tr: i === 3 ? 8 : 20, line: i === 3 ? LAV : MUTED, ltr: i === 3 ? 45 : 75, lw: i === 3 ? 1 : 0.75, shadow: true, name: 'Horizon ' + tag });
      fit('roadmap ' + ttl, ttl, 20, true, colW - 0.5, 0.42);
      T(s, ttl, { x: x + 0.25, y: y + 0.25, w: colW - 0.5, h: 0.4, fontSize: 20, bold: true });
      T(s, sub, { x: x + 0.25, y: y + 0.68, w: colW - 0.5, h: 0.3, fontSize: 13, color: col, bold: true });
      if (pts.length) {
        T(s, pts.map((p, j) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: j < pts.length - 1 } })), { x: x + 0.25, y: y + 1.15, w: colW - 0.45, h: 2.6, fontSize: 14, color: MUTED, paraSpaceAfter: 8 });
      } else {
        s.addImage({ path: A('concept_overview.jpg'), x: x + 0.2, y: y + 1.15, w: colW - 0.4, h: (colW - 0.4) * 9 / 16, altText: 'Concept design of a future operations overview with a 3D airport twin', objectName: 'Concept frame' });
        pill(s, x + 0.3, y + 1.25, 'CONCEPT', NAVY, LAV, { tr: 15, line: LAV, ltr: 40, pt: 9, h: 0.24 });
        T(s, 'Predictive operations, a live 3D twin and federated sites, built on the same Co-pilot.', { x: x + 0.25, y: y + 2.75, w: colW - 0.5, h: 1.1, fontSize: 14, color: MUTED });
      }
    }
    T(s, 'Phases and durations are indicative and will be agreed in the pilot plan.', { x: MX, y: 6.68, w: 9, h: 0.26, fontSize: 11, color: MUTED });
  }
  s.addNotes([
    'CMO (1:00): Today’s demo is step one. Next, a pilot in one terminal, about twelve weeks, on live feeds with joint KPIs and an agreed privacy and watchlist policy.',
    'Then scale: all terminals, AGIL Fence off the legacy platform and onto the same workflow, and multi-site governance. The destination is an Airport Security Operating System: predictive, federated and built on the same Co-pilot. The concept image is a design direction, not part of today’s demo.',
  ].join('\n'));

  // 24 ── next steps
  pres.addSection({ title: SEC.close });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.close });
  s.addText('NEXT STEPS', { placeholder: 'kicker', charSpacing: 2.5 });
  s.addText('Three decisions to start the pilot', { placeholder: 'title' });
  {
    const NS = [['Choose the pilot', 'Pick the terminal and the three or four scenarios that matter most to CAG.', 'Weeks 0–2', 'LuTarget'],
      ['Connect the data', 'Integration workshop: access control, VMS, AGIL Fence, LiDAR and the SOP library.', 'Weeks 2–4', 'LuPlug'],
      ['Define success', 'Pilot KPIs, governance and privacy policy, including watchlist use.', 'Weeks 4–6', 'LuFlag']];
    const w3 = (SW - 2 * MX - 2 * 0.3) / 3;
    for (const [i, [hd, tx, when, ic]] of NS.entries()) {
      const x = MX + i * (w3 + 0.3), y = 1.85, h = 3.45;
      card(s, x, y, w3, h, { tr: 20, ltr: 75, shadow: true, name: 'Decision ' + (i + 1) });
      T(s, String(i + 1), { x: x + 0.3, y: y + 0.22, w: 0.8, h: 0.85, fontSize: 48, bold: true, color: LAV });
      s.addImage({ data: await icon(ic, HEX.muted), x: x + w3 - 0.75, y: y + 0.4, w: 0.42, h: 0.42, altText: '' });
      fit('next title ' + hd, hd, 20, true, w3 - 0.6, 0.42);
      T(s, hd, { x: x + 0.3, y: y + 1.2, w: w3 - 0.6, h: 0.42, fontSize: 20, bold: true });
      fit('next ' + hd, tx, 15, false, w3 - 0.6, 1.1);
      T(s, tx, { x: x + 0.3, y: y + 1.72, w: w3 - 0.6, h: 1.1, fontSize: 15, color: MUTED });
      pill(s, x + 0.3, y + h - 0.55, when.toUpperCase(), LAV, LAV, { tr: 86, line: LAV, ltr: 45 });
    }
    card(s, MX, 5.6, SW - 2 * MX, 1.05, { fill: LAV, tr: 86, line: LAV, ltr: 40, lw: 1.25, name: 'Ask' });
    s.addImage({ data: await icon('LuHandshake', HEX.lav), x: MX + 0.3, y: 5.84, w: 0.56, h: 0.56, altText: '' });
    T(s, [{ text: 'Our ask today: ', options: { bold: true, color: LAV } }, { text: 'name a CAG working team. We return within two weeks with the pilot plan.', options: { bold: true } }],
      { x: MX + 1.1, y: 5.6, w: 10.8, h: 1.05, fontSize: 20, valign: 'middle' });
  }
  s.addNotes([
    'CMO (1:00): Three decisions get us started: choose the pilot terminal and scenarios, connect the data in an integration workshop, and agree what success means, including the policy for watchlist use.',
    'Our ask today is simple: name a CAG working team, and we will come back within two weeks with the pilot plan.',
  ].join('\n'));

  // 25 ── close
  s = pres.addSlide({ masterName: 'CLOSE', sectionTitle: SEC.close });
  s.addText('AGIL® SECURE ISMS V11  ·  AI CO-PILOT', { placeholder: 'kicker', charSpacing: 3 });
  s.addText(runs('People stay in command.\nAI does the legwork.'), { placeholder: 'title' });
  fit('close title', 'People stay in command.\nAI does the legwork.', 44, true, 11.5, 1.45, 0.95);
  s.addText('Thank you. Questions welcome, and the system is open for you to try.', { placeholder: 'body' });
  s.addNotes([
    'CMO (0:30): People stay in command; AI does the legwork. Thank you. We are happy to take questions, and the system is open for you to try.',
    'CTO: leave V11 on Home for hands-on questions.',
  ].join('\n'));

  // 26–28 ── appendix (hidden)
  pres.addSection({ title: SEC.appx });
  const RUN = [
    ['1–6', '0:00', 'Opening, priorities, problem, solution, cast', 'V11 on Home, idle', 'V11-01'],
    ['7–8', '7:00', '“Let’s run a night shift, live”', 'Home: counters (2 / 4 / 1), then pins in the 3D view', 'V11-01'],
    ['9', '9:00', '“5 alarms. 1 incident. Explained.”', 'Click Staff Door D-214 → Investigation → “+2 more”', 'V11-02'],
    ['10', '11:00', '“Co-pilot prepares. You approve.”', 'SOP Flow → step 2 “Lock” → 3D shows D-214 locked', 'V11-03'],
    ['11', '12:30', '“Escalated in one click”', 'Escalate → point at pre-filled fields → Create Incident', 'V11-10'],
    ['12', '13:30', '“A real intruder, not the wind”', 'Fence Sector 5 → Investigation → LiDAR, thermal tiles', 'V11-09'],
    ['13', '15:30', '“Bag and owner linked”', 'Gate B12 Holdroom → SOP Flow → step 5 “Approve”', 'V11-05'],
    ['14', '17:30', '“Seen and heard”', 'Arrival Hall Belt 5 → Investigation', 'V11-07'],
    ['15', '19:00', '“One card, two doors”', 'T1 Door C2 → Investigation → legacy SSID row', 'V11-04'],
    ['16', '21:00', '“Your own rules, live”', 'Baggage Hall B2 → Investigation → rules', 'V11-08'],
    ['17', '22:30', '“Sensitive calls stay human”', 'Departure Hall Row K → SOP Flow → “Not a match”', 'V11-06'],
    ['18', '24:30', '“Ask in plain English”', 'Search bar → type the question → result cards', 'V11-11'],
    ['19', '26:30', '“The report writes itself”', 'Incident Management → TGT-214 → Close Incident', 'V11-12'],
    ['20–25', '28:30', 'Platform, trust, value, roadmap, ask', 'Exit Incident Management → Home', 'V11-01'],
  ];
  const hdr = ['Slide', 'Clock', 'CMO says', 'CTO clicks in V11', 'Screen'];
  const colWs = [0.8, 0.8, 3.9, 5.2, 1.43];
  for (const [part, rows] of [[1, RUN.slice(0, 7)], [2, RUN.slice(7)]]) {
    s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
    s.hidden = !process.env.SHOW_HIDDEN;
    s.addText('APPENDIX  ·  PRESENTER ONLY', { placeholder: 'kicker', charSpacing: 2 });
    s.addText(`Demo run sheet (${part} of 2)`, { placeholder: 'title' });
    const head = hdr.map(h => ({ text: h, options: { bold: true, color: INK, fill: { color: NAVY }, fontSize: 12 } }));
    const body = rows.map((r, i) => r.map((c, j) => ({ text: c, options: { color: NAVY, fontSize: 13, bold: j === 3, fill: { color: i % 2 ? 'EEF1F7' : 'FFFFFF' } } })));
    s.addTable([head, ...body], { x: MX, y: 1.7, w: SW - 2 * MX, colW: colWs, rowH: 0.55, valign: 'middle', margin: [3, 6, 3, 6], border: { type: 'solid', pt: 0.5, color: 'D5DAE5' }, fontFace: 'Arial' });
    if (part === 2) T(s, 'If V11 stalls: stay on the slides. Every live slide shows the same screen, with the same numbered markers.', { x: MX, y: 6.5, w: 12, h: 0.3, fontSize: 13, color: NAVY, bold: true });
    s.addNotes('Presenter only. Hidden in the slide show. Delete the appendix before sending the deck to CAG.');
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
      T(s, q, { x: x + 0.25, y: y + 0.16, w: w2 - 0.5, h: 0.32, fontSize: 15, bold: true, color: NAVY });
      fit('qa ' + i, a, 13, false, w2 - 0.5, 0.82);
      T(s, a, { x: x + 0.25, y: y + 0.52, w: w2 - 0.5, h: 0.85, fontSize: 13, color: NAVY });
    }
  }
  s.addNotes('Presenter only. Hidden in the slide show. Delete the appendix before sending the deck to CAG.');

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
