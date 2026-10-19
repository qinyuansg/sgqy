'use strict';
// Strategic areas 2 · 4 · 5: the product answer deck (internal, C-level) for the 16 October asks.
// Reuses the deck v2 generator (../cag-pitch-deck/build_deck.js): theme, layouts, measuring and the
// card / brackets / device / lens / hl / marker / pill / label components, plus a readiness grade tag.
//
//   node build_deck.js <assetsDir> <out.pptx>
//   DRAFT=1       a missing image becomes a dark placeholder (listed at the end) instead of failing
//   DECK=client   leaves the appendix out (default: visible, this deck is internal)
//   PPTX_APPLY_THEME=<pptx skill>/scripts/apply_theme.js   use the skill's theme writer (else inline)
//
// Every roadmap date on every slide comes from TRAINS and carries "proposed · confirm with R&D"
// (or a footnote on that slide saying so). Readiness is always labelled with a grade tag (GRADES).
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
const OUT = path.resolve(process.argv[3] || 'dist/AGIL_Secure_V11_CAG_Strategic_Areas_2-4-5_CPO.pptx');
const DRAFT = !!process.env.DRAFT;
const CLIENT = process.env.DECK === 'client';
const A = f => path.join(ASSETS, f);
const ARIAL = JSON.parse(fs.readFileSync(path.join(__dirname, '../cag-pitch-deck/arial-widths.json'), 'utf8'));
const ROBOTO = JSON.parse(fs.readFileSync(path.join(__dirname, '../isms-mvp-figma/lib/roboto-widths.json'), 'utf8'));
const ANCHORS = JSON.parse(fs.readFileSync(A('anchors.json'), 'utf8'));

// ---------- the facts that change in one place ----------
const PROPOSED = 'proposed · confirm with R&D';
const CONFIRM_BY = '30 Oct 2026';
const DECK_DATE = '18 October 2026';
// Product's proposed release trains (BRIEF section 5). Peter and Anuar confirm them against the R&D roadmap.
const TRAINS = [
  { id: 'V11', name: 'V11', theme: 'In service today', ga: null,
    p2: ['Source-agnostic alarm → incident → SOP → report workflow', 'Alert cards, Active Alarms, Investigation, SOP Flow', 'Escalate dialog, Incident Management, export'],
    p4: ['Same workflow for fence alarms once connected', 'Camera tiles; iPAMS keeps the PTZ preset', '3D viewer with Locate'],
    p5: ['One site, many clusters (site › cluster selector)', 'Site-level roles', 'Integrations per site'],
    sum: { p2: 'Alarm → incident → SOP → report workflow, any alarm source', p4: 'Fence alarms can use the same workflow once connected; iPAMS keeps its own screens', p5: 'One site, many clusters; site-level roles; integrations per site' },
    see: { p2: 'Live V11 (plan A) or film + frames (plan B), 22 Oct', p4: 'Flow board and film, 22 Oct', p5: 'Design walkthrough, Q4 2026' } },
  { id: '11.1', name: 'V11.1', theme: 'Unified alarms, Co-pilot assist', ga: 'Q1 2027 (Mar)',
    p2: ['Co-pilot line on alert cards, linked alarms', 'Co-pilot summary in Investigation', 'SOP and Escalate pre-fill, auto-ticked steps', 'Report draft in Remarks'],
    p4: ['AgilFence connector: alarm, segment and camera preset into the V11 workflow', 'Fence alarms in Incident Management reports'],
    p5: ['Estate view (read-only)', 'Site switcher across sites', 'Per-site roles'],
    sum: { p2: 'Co-pilot lines, linked alarms, summary, SOP and Escalate pre-fill, report draft', p4: 'AgilFence connector: alarm, segment, camera preset in the V11 workflow; fence alarms in reports', p5: 'Estate view (read-only), site switcher, per-site roles' },
    see: { p2: 'Co-pilot assist in the pilot terminal', p4: 'Fence alarms inside V11 at the pilot terminal', p5: 'Estate view, read-only' } },
  { id: '11.2', name: 'V11.2', theme: 'AgilFence module, estate governance, Ask Co-pilot', ga: 'Q3 2027 (Sep)',
    p2: ['Ask Co-pilot (on premise)', 'Auto-investigation steps on live video analytics', 'Appearance check (clothing and build, no faces)'],
    p4: ['Fence line and segments on the map', 'Nearest cameras, pre-alarm replay, wall layout', 'Fence health view, fence reports'],
    p5: ['Security baseline with local overrides and approvals', 'Estate dashboard and estate reporting', 'Connector catalogue'],
    sum: { p2: 'Ask Co-pilot on premise, auto-investigation steps on live analytics, appearance check', p4: 'Fence module: map, nearest cameras, replay, wall layout, health view, fence reports', p5: 'Security baseline with local overrides, estate dashboard and reporting, connector catalogue' },
    see: { p2: 'Ask Co-pilot on premise', p4: 'Fence module: map, cameras, wall, health', p5: 'Baseline, dashboard, estate report' } },
  { id: '11.3', name: 'V11.3', theme: 'Open platform', ga: 'Q1 2028 (Mar)',
    p2: ['Co-pilot learns from feedback', 'Predictive insights (concept)'],
    p4: ['Zone and sensitivity configuration in V11', 'Calibration in V11', 'Nuisance analytics; iPAMS functions fully in V11'],
    p5: ['Public API and SDK', 'Connector certification', 'Partner sandbox'],
    sum: { p2: 'Co-pilot learns from feedback; predictive insights (concept)', p4: 'iPAMS functions fully in V11: configuration, calibration, nuisance analytics', p5: 'Public API and SDK, connector certification, partner sandbox' },
    see: { p2: 'A Co-pilot that learns from the team', p4: 'iPAMS functions fully in V11', p5: 'Open API, SDK, partner sandbox' } },
];
const PILOT = { name: 'CAG pilot', scope: 'one terminal, ~12 weeks, live feeds, joint KPIs', start: 'Q1 2027' };
// near-term calendar (fixed dates, not roadmap dates)
const CAL = [
  ['22 Oct 2026', 'Sales demo to CAG (video analytics, left-behind baggage); area 2 shown by film + frames, or live'],
  ['30 Oct 2026', 'Release trains confirmed against the R&D roadmap (Peter, Anuar)'],
  ['Q4 2026', 'Workshops with CAG: SOP mapping, data access'],
];
const train = id => { const t = TRAINS.find(t => t.id === id); if (!t) throw new Error('unknown train ' + id); return t; };
const ga = id => { const t = train(id); return t.ga ? `${t.ga} · ${PROPOSED}` : 'in service today'; };
const trainLine = id => `${train(id).name} · ${ga(id)}`;
const PROPOSAL_NOTE = `Train dates: ${TRAINS.filter(t => t.ga).map(t => `${t.name} ${t.ga}`).join(' · ')} · ${PROPOSED} by ${CONFIRM_BY}.`;

// readiness grades (BRIEF section 3)
const GRADES = {
  today: { hex: '2ED47A', ink: '05070D', label: 'IN V11 TODAY', meaning: 'Exists in the current V11 software. Can be shown live.' },
  concept: { hex: 'B69CFF', ink: '05070D', label: 'CONCEPT · DESIGNED', meaning: 'High-fidelity design on V11 screens (Figma frames, film), simulated data. Not in the software.' },
  roadmap: { hex: '4D8DFF', ink: 'FFFFFF', label: 'ROADMAP · V11.x', meaning: 'Planned for a release train. The date is proposed by Product and confirmed against the R&D roadmap.' },
  confirm: { hex: 'D4B741', ink: '05070D', label: 'R&D TO CONFIRM', meaning: 'A fact Product cannot verify alone.' },
  none: { hex: 'A9B4C8', ink: '05070D', label: 'NOT IN V11', meaning: '' },
};

// ---------- theme: night-shift navy, Co-pilot lavender, V11 severity colours (deck v2) ----------
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
const HEX = { lav: 'B69CFF', blue: '4D8DFF', red: 'D72D30', gold: 'D4B741', teal: '4DAFBE', green: '2ED47A', white: 'FFFFFF', muted: 'A9B4C8', navy: '05070D', card: '0E1628' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Strategic areas 2, 4 and 5: three product answers for Changi';
pres.subject = 'AGIL Secure V11: what is in V11 today, what is designed, what is on the roadmap, and what we commit to CAG';
pres.author = 'ST Engineering, Product';
pres.company = 'ST Engineering';

const C = pres.SchemeColor;
const NAVY = C.background1, CARD = C.background2, INK = C.text1, MUTED = C.text2;
const LAV = C.accent1, BLUE = C.accent2, RED = C.accent3, GOLD = C.accent4, TEAL = C.accent5, GREEN = C.accent6;
const RR = pres.shapes.ROUNDED_RECTANGLE, RECT = pres.shapes.RECTANGLE, OVAL = pres.shapes.OVAL, LINE = pres.shapes.LINE;
const SW = 13.333, SH = 7.5, MX = 0.6, RX = SW - MX, CW = SW - 2 * MX;
const TS = { display: 72, section: 52, title: 36, scene: 32, lead: 20, body: 16, small: 14, micro: 12 };
const SEC = { open: 'Opening', p2: 'Strategic area 2: AI-powered AGIL Secure ISMS', p4: 'Strategic area 4: AgilFence unified integration', p5: 'Strategic area 5: Multi-site governance', close: 'Roadmap, commitments, decisions', appx: 'Appendix' };

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
const WARN = [], MISSING = [], ESTIMATED = [];
function fit(id, str, pt, bold, w, h, ls = 1.17, cs = 0) {
  const n = nlines(str, pt, bold, w, cs), need = n * pt * ls / 72;
  if (need > h + 0.02) WARN.push(`${id}: needs ${need.toFixed(2)}in (${n} lines) in ${h.toFixed(2)}in`);
  return n;
}
// largest size in the list that fits the box
function sizeFor(str, sizes, bold, w, h, ls = 1.17, cs = 0) {
  for (const pt of sizes) if (nlines(str, pt, bold, w, cs) * pt * ls / 72 <= h + 0.02) return pt;
  return sizes[sizes.length - 1];
}
const plain = t => (typeof t === 'string' ? t : t.map(r => r.text).join(''));
// width of V11 UI text (Roboto) in frame px
function rw(str, px, wt = 500) { const t = ROBOTO[wt] || ROBOTO[500]; let w = 0; for (const ch of String(str)) w += t[ch] ?? 0.55; return w * px; }

// ---------- primitives ----------
const runs = str => { const p = String(str).split('\n'); return p.length === 1 ? str : p.map((t, i) => ({ text: t, options: i < p.length - 1 ? { breakLine: true } : {} })); };
function T(s, text, o) {
  if (!o.free && (o.x < MX - 0.01 || o.x + o.w > RX + 0.01)) WARN.push(`margin: "${plain(text).slice(0, 40)}" spans ${o.x.toFixed(2)}–${(o.x + o.w).toFixed(2)}`);
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
// signature motif: CCTV viewfinder corners around whatever the audience should look at
function brackets(s, x, y, w, h, o = {}) {
  const a = o.arm || 0.26, line = () => ({ color: o.col || LAV, width: o.lw || 1.75, transparency: o.tr ?? 10 });
  const L = (x1, y1, x2, y2) => s.addShape(LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: line(), objectName: 'Viewfinder corner' });
  L(x, y, x + a, y); L(x, y, x, y + a);
  L(x + w - a, y, x + w, y); L(x + w, y, x + w, y + a);
  L(x, y + h - a, x, y + h); L(x, y + h, x + a, y + h);
  L(x + w - a, y + h, x + w, y + h); L(x + w, y + h - a, x + w, y + h);
}
const full = (s, file, alt) => s.addImage({ path: A(file), x: 0, y: 0, w: SW, h: SH, altText: alt || 'Decorative background art', objectName: 'Visual ' + file.replace(/\.\w+$/, '') });
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
// readiness grade tag: small caps pill, 12 pt bold, 0.3 in tall; o.soft draws the outlined variant
function grade(s, x, y, kind, text, o = {}) {
  const g = GRADES[kind]; if (!g) throw new Error('unknown grade ' + kind);
  const lab = (text || g.label).toUpperCase(), pt = 12, cs = 1, h = 0.3, w = tw(lab, pt, true, cs) + 0.3;
  if (o.right) x -= w;
  s.addText(lab, {
    shape: RR, x, y, w, h, rectRadius: h / 2,
    fill: o.soft ? { color: g.hex, transparency: 84 } : { color: g.hex },
    line: o.soft ? { color: g.hex, width: 0.75, transparency: 20 } : { type: 'none' },
    color: o.soft ? g.hex : g.ink, fontSize: pt, bold: true, charSpacing: cs, align: 'center', valign: 'middle', margin: 0, objectName: 'Grade ' + lab,
  });
  return w;
}
const trainTags = (s, x, y, ids) => grade(s, x, y, 'roadmap', ids.map(id => train(id).name).join(' · '));
function marker(s, x, y, n, o = {}) {
  const d = o.d || 0.34;
  s.addShape(OVAL, { x: x - d / 2 - 0.08, y: y - d / 2 - 0.08, w: d + 0.16, h: d + 0.16, fill: { color: LAV, transparency: 60 }, line: { type: 'none' }, objectName: 'Marker halo ' + n });
  s.addText(String(n), { shape: OVAL, x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: LAV }, line: { color: INK, width: 1.5 }, color: NAVY, bold: true, fontSize: o.pt || 14, align: 'center', valign: 'middle', margin: 0, objectName: 'Marker ' + n });
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
  if (o.halo) s.addShape(OVAL, { x: x - 0.1, y: y - 0.1, w: d + 0.2, h: d + 0.2, fill: { color: o.ring || LAV, transparency: 82 }, line: { type: 'none' }, objectName: 'Icon halo ' + name });
  s.addShape(OVAL, { x, y, w: d, h: d, fill: { color: o.fill || CARD, transparency: o.tr ?? 0 }, line: { color: o.ring || LAV, width: o.lw || 1.25, transparency: o.ltr ?? 30 }, objectName: 'Icon disc ' + name });
  const k = o.k || 0.5;
  s.addImage({ data: await icon(name, o.hex || HEX.lav), x: x + d * (1 - k) / 2, y: y + d * (1 - k) / 2, w: d * k, h: d * k, altText: 'Icon ' + name.slice(2) });
}
// small caps label used above lists and inside panels
const label = (s, text, x, y, w, col = MUTED, o = {}) => T(s, text, Object.assign({ x, y, w, h: 0.26, fontSize: TS.micro, bold: true, color: col, charSpacing: 1.5, valign: 'middle' }, o));
async function graded(file) {
  const buf = await sharp(A(file)).modulate({ saturation: 0.72, brightness: 0.96 }).tint({ r: 150, g: 170, b: 230 }).jpeg({ quality: 88 }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
// a photo or art file fitted (cover) into a box
async function pic(s, file, x, y, w, h, alt, o = {}) {
  const f = A(file);
  if (!fs.existsSync(f)) { if (!DRAFT) throw new Error('missing image ' + f); MISSING.push(file); return placeholder(s, x, y, w, h, file); }
  const buf = await sharp(f).resize({ width: Math.round(w * 220), height: Math.round(h * 220), fit: 'cover' }).jpeg({ quality: 86 }).toBuffer();
  s.addImage({ data: 'image/jpeg;base64,' + buf.toString('base64'), x, y, w, h, altText: alt, objectName: o.name || 'Picture ' + file });
}
// bullets: one text box, breakLine on all but the last item
function bullets(s, items, x, y, w, h, o = {}) {
  const pt = o.pt || 14;
  for (const p of items) fit((o.id || 'bullets') + ' ' + p.slice(0, 24), p, pt, false, w - 0.25, h);
  s.addText(items.map((p, j) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: j < items.length - 1 } })), { x, y, w, h, fontSize: pt, color: o.color || MUTED, paraSpaceAfter: o.gap ?? 6, valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.0 });
}
// the proposal footnote: the one line that makes every date on the slide a proposal
const footnote = (s, text, y = 6.62, w = CW, h = 0.3) => { fit('footnote ' + text.slice(0, 20), text, 12, false, w, h, 1.1); T(s, runs(text), { x: MX, y, w, h, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 }); };
const proposalNote = (s, y = 6.62) => footnote(s, PROPOSAL_NOTE, y);

// ---------- frames: V11 (2×), AgilFence (2×), multi-site (2×), boards (1×) ----------
// size and location of every frame the deck can show; the PNG decides the real size when present
const FRAMES = {};
for (const [id, w] of [['V11-01', 1400], ['V11-02', 1400], ['V11-03', 1400], ['V11-04', 1400], ['V11-05', 1400], ['V11-06', 1400], ['V11-07', 1400], ['V11-08', 1400], ['V11-09', 1400], ['V11-10', 1400], ['V11-11', 1400], ['V11-12', 1600]]) FRAMES[id] = { dir: 'v11', scale: 2, w, h: 1069 };
for (const [id, w, h] of [['AF-00', 1400], ['AF-01', 1400], ['AF-02', 1400], ['AF-02a', 1400], ['AF-02b', 1400], ['AF-03', 1600], ['AF-04', 1400], ['AF-05', 1400], ['AF-06', 1920, 1080], ['AF-07', 1400], ['AF-07a', 1400], ['AF-07b', 1400], ['AF-07c', 1400], ['AF-07d', 1400], ['AF-08', 1400], ['AF-09', 1600]]) FRAMES[id] = { dir: 'af', scale: 2, w, h: h || 1069 };
for (const [id, w] of [['MS-01', 1400], ['MS-02', 1400], ['MS-03', 1600], ['MS-04', 1600], ['MS-05', 1600], ['MS-06', 1600]]) FRAMES[id] = { dir: 'ms', scale: 2, w, h: 1069 };
FRAMES['AF-00b'] = { dir: 'boards', scale: 1, w: 3480, h: 2040 };
FRAMES['P2'] = { dir: 'boards', scale: 1, w: 3480, h: 2040 };
FRAMES['P5'] = { dir: 'boards', scale: 1, w: 3480, h: 2040 };
FRAMES['CPO'] = { dir: 'boards', scale: 1, w: 4000, h: 2600 };
FRAMES['MASTER'] = { dir: 'boards', scale: 1, w: 4000, h: 2600, file: 'CPO-master-board.png' }; // same file, an id without the role acronym (finalize() rejects it in slide XML)
const dirCache = {};
const listDir = d => dirCache[d] || (dirCache[d] = fs.existsSync(A(d)) ? fs.readdirSync(A(d)) : []);
function pngSize(file) { const b = Buffer.alloc(24); const fd = fs.openSync(file, 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
const infoCache = {};
// id → { file, key (anchor key), ok, w, h (frame px), pxW, pxH, scale }
function frame(id) {
  if (infoCache[id]) return infoCache[id];
  const spec = FRAMES[id]; if (!spec) throw new Error('unknown frame ' + id);
  const name = listDir(spec.dir).find(f => f.endsWith('.png') && (f === (spec.file || id + '.png') || f.startsWith(id + '-')));
  const file = name ? A(path.join(spec.dir, name)) : A(path.join(spec.dir, id + '.png'));
  const f = { file, rel: path.relative(ASSETS, file), key: name ? name.replace(/\.png$/, '') : id, ok: !!name, w: spec.w, h: spec.h, scale: spec.scale };
  if (f.ok) { const [pw, ph] = pngSize(file); f.pxW = pw; f.pxH = ph; f.w = pw / spec.scale; f.h = ph / spec.scale; }
  else if (!DRAFT) throw new Error('missing image ' + file);
  else MISSING.push(f.rel);
  return infoCache[id] = f;
}
// V11 text anchors (extract_anchors.py): [x, y, size, text] per frame
function anchor(id, needle, i = 0) {
  const key = frame(id).key, list = ANCHORS[key] || ANCHORS[id];
  if (!list) throw new Error('no anchors for ' + id);
  const hits = list.filter(a => a[3].includes(needle));
  if (!hits[i]) throw new Error(`anchor not found: ${id} / ${needle}`);
  const [x, y, size, t] = hits[i];
  return { x, y, size, t, end: x + rw(t, size), mid: y - size * 0.35 };
}
function ab(id, needle, i = 0, o = {}) {
  const a = anchor(id, needle, i), pad = o.pad ?? 5, px = o.px ?? pad;
  return [a.x - px, a.y - a.size * 0.95 - pad * 0.6, (o.w ?? rw(a.t, a.size)) + 2 * px, a.size * 1.25 + pad * 1.2];
}
// AgilFence element rects (frame px) from the AF build; af-anchors.json overrides when the integration step places it
const AF_DEFAULT = {
  'AF-02': { marker: [1045, 375, 234, 40], counter: [95, 134, 72, 20], card: [40, 296, 336, 137], toast: [930, 196, 430, 162] },
  'AF-03': { linked: [876, 589, 668, 243], row: [40, 296, 804, 56], locate: [884, 965, 320, 44], cams: [876, 333, 668, 200], note: [60, 870, 764, 64] },
  'AF-04': { nearest: [400, 590, 300, 220], openLive: [610, 652, 70, 24], ptzTile: [916, 296, 210, 248], locateLink: [52, 391, 82, 26], site: [578, 217, 190, 40], counter: [95, 134, 72, 20], card: [40, 296, 336, 137] },
  'AF-05': { site: [621, 624, 197, 40], player: [390, 140, 500, 420], pbox: [639, 236, 41, 96], clip: [392, 506, 460, 26], send: [684, 460, 200, 36], summary: [916, 604, 428, 116] },
  'AF-06': { hero: [40, 160, 1223, 563], replay: [1275, 160, 605, 275], wide: [1275, 447, 605, 275], lidar: [40, 735, 605, 275], map: [657, 735, 605, 275], strain: [1275, 735, 605, 275], strip: [40, 92, 1840, 52] },
  'AF-07': { site: [705, 369, 190, 40], vehicle: [375, 404, 36, 36], patrolLabel: [392, 462, 143, 28], card: [40, 296, 336, 137], auto: [916, 634, 428, 92], verify: [916, 726, 428, 172], crit: [916, 772, 428, 126], dispatch: [956, 852, 85, 32], sop: [916, 600, 428, 350] },
  'AF-08': { tile: [916, 296, 210, 248], radio: [916, 604, 428, 104], site: [495, 369, 251, 40], card: [40, 296, 336, 137] },
  'AF-09': { timeline: [870, 542, 680, 88], report: [876, 684, 668, 92], evidence: [876, 906, 668, 50], closed: [884, 965, 660, 44] },
};
function readAnchors(file, fallback, what) {
  const p = A(file);
  if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); const out = {}; for (const k of Object.keys(j)) out[k.slice(0, k.match(/^[A-Z]+-\d+[a-z]?/)[0].length)] = j[k]; return out; }
  ESTIMATED.push(`${what}: ${file} not found, using ${fallback === AF_DEFAULT ? 'the AF build values copied here' : 'estimates'}`);
  return fallback;
}
const AFA = readAnchors('af-anchors.json', AF_DEFAULT, 'AgilFence anchors');
// multi-site frames: estimates from the V11 layout idiom until ms-anchors.json arrives
const MS_DEFAULT = {
  'MS-01': { location: [438, 46, 232, 44], sitesPanel: [903, 126, 457, 900], siteRowSeletar: [916, 560, 428, 110], map: [380, 128, 520, 900], cardSeletar: [40, 296, 336, 137] },
  'MS-02': { autonomyChip: [700, 46, 400, 44], sopLocalStep: [916, 860, 428, 60], sopBaselineStep: [916, 634, 428, 60], caption: [916, 940, 428, 28], alarmHead: [916, 180, 428, 100] },
  'MS-03': { sopRow: [40, 296, 804, 56], detailSteps: [876, 333, 668, 300], overrideRequest: [876, 700, 668, 200] },
  'MS-04': { matrix: [40, 240, 804, 400], personCard: [876, 180, 668, 500] },
  'MS-05': { onboardingRows: [40, 600, 804, 150], dialog: [876, 180, 668, 760], protocolSelect: [900, 420, 620, 44] },
  'MS-06': { tileIncidents: [40, 240, 500, 260], tileCompliance: [560, 240, 500, 260], tileFence: [1080, 240, 480, 260], exportButton: [1360, 160, 200, 44] },
};
const MSA = readAnchors('ms-anchors.json', MS_DEFAULT, 'multi-site anchors');
const afr = (f, k) => { const r = (AFA[f] || {})[k]; if (!r) throw new Error(`no AF anchor ${f}.${k}`); return r; };
const msr = (f, k) => { const r = (MSA[f] || {})[k]; if (!r) throw new Error(`no MS anchor ${f}.${k}`); return r; };

// a crop of a frame (r in frame px) rendered at up to 300 dpi for its display width; null when the file is missing
async function shot(id, r, dispW) {
  const f = frame(id); if (!f.ok) return null;
  const sc = f.scale, W = f.pxW, H = f.pxH;
  const left = Math.max(0, Math.min(W - 1, Math.round(r[0] * sc))), top = Math.max(0, Math.min(H - 1, Math.round(r[1] * sc)));
  const width = Math.max(1, Math.min(Math.round(r[2] * sc), W - left)), height = Math.max(1, Math.min(Math.round(r[3] * sc), H - top));
  const outW = Math.min(width, Math.round(dispW * 300));
  const buf = await sharp(f.file).extract({ left, top, width, height }).resize({ width: outW }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}
// DRAFT stand-in for a missing image: dark rectangle with the file name
function placeholder(s, x, y, w, h, name) {
  s.addShape(RECT, { x, y, w, h, fill: { color: '0B1222' }, line: { color: HEX.muted, width: 0.75, dashType: 'dash', transparency: 40 }, objectName: 'Placeholder ' + name });
  s.addText(name, { x, y, w, h, fontSize: 12, color: HEX.muted, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Placeholder name' });
}
async function image(s, id, r, x, y, w, h, alt, name) {
  const data = await shot(id, r, w);
  if (data) s.addImage({ data, x, y, w, h, altText: alt, objectName: name });
  else placeholder(s, x, y, w, h, frame(id).rel);
}
// a screen in a slim glass bezel inside viewfinder corners; returns a frame-px → slide-inch mapper
async function device(s, id, x, y, w, alt, o = {}) {
  const f = frame(id), r = [0, 0, f.w, f.h], pad = 0.06, iw = w - 2 * pad, ih = iw * f.h / f.w, h = ih + 2 * pad;
  if (o.brackets !== false) brackets(s, x - 0.14, y - 0.14, w + 0.28, (o.bh ?? h) + 0.28, { tr: 25 });
  s.addShape(RR, { x, y, w, h, rectRadius: 0.1, fill: { color: NAVY }, line: { color: INK, width: 0.75, transparency: 80 }, shadow: shadow(30, 0.65, 10), objectName: 'Display bezel' });
  s.addShape(LINE, { x: x + 0.2, y, w: w - 0.4, h: 0, line: { color: INK, width: 1, transparency: 60 }, objectName: 'Bezel highlight' });
  await image(s, id, r, x + pad, y + pad, iw, ih, alt, 'Screen ' + id);
  const map = (fx, fy) => [x + pad + fx / r[2] * iw, y + pad + fy / r[3] * ih];
  return { x, y, w, h, map, id };
}
// magnified crop of a screen, with a dashed outline where it comes from (when dev is given)
async function lens(s, dev, id, r, x, y, w, o = {}) {
  const pad = 0.04, iw = w - 2 * pad, ih = iw * r[3] / r[2], h = ih + 2 * pad;
  if (dev) {
    const [a, b] = dev.map(r[0], r[1]), [c, d] = dev.map(r[0] + r[2], r[1] + r[3]);
    s.addShape(RECT, { x: a, y: b, w: c - a, h: d - b, fill: { type: 'none' }, line: { color: LAV, width: 1.25, transparency: 25 }, objectName: 'Zoom source' });
    const sc = [[a, b], [c, b], [a, d], [c, d]], lc = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    let best = null;
    for (const p of sc) for (const q of lc) { const dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || dd < best[0]) best = [dd, p, q]; }
    if (best[0] > 0.12) s.addShape(LINE, { x: Math.min(best[1][0], best[2][0]), y: Math.min(best[1][1], best[2][1]), w: Math.abs(best[2][0] - best[1][0]), h: Math.abs(best[2][1] - best[1][1]), flipH: (best[2][0] - best[1][0]) * (best[2][1] - best[1][1]) < 0, line: { color: LAV, width: 0.75, transparency: 45 }, objectName: 'Zoom connector' });
  }
  s.addShape(RR, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, rectRadius: 0.1, fill: { color: LAV, transparency: 80 }, line: { type: 'none' }, objectName: 'Zoom glow' });
  s.addShape(RR, { x, y, w, h, rectRadius: 0.07, fill: { color: NAVY }, line: { color: LAV, width: 1.75 }, shadow: shadow(30, 0.75, 10), objectName: 'Zoom lens' });
  await image(s, id, r, x + pad, y + pad, iw, ih, o.alt || '', 'Zoom ' + id);
  if (o.n) marker(s, o.nAt === 'tl' || o.nAt === 'bl' ? x : x + w, o.nAt === 'br' || o.nAt === 'bl' ? y + h : y, o.n);
  const map = (fx, fy) => [x + pad + (fx - r[0]) / r[2] * iw, y + pad + (fy - r[1]) / r[3] * ih];
  return { x, y, w, h, map, id };
}
// a flow board: full-width image inside viewfinder corners with a caption, no bezel
async function board(s, id, x, y, w, caption, o = {}) {
  const f = frame(id), h = w * f.h / f.w;
  brackets(s, x - 0.12, y - 0.12, w + 0.24, h + 0.24, { tr: 25, arm: 0.3 });
  s.addShape(RECT, { x, y, w, h, fill: { color: NAVY }, line: { color: INK, width: 0.5, transparency: 80 }, shadow: shadow(24, 0.6, 8), objectName: 'Board ' + id });
  await image(s, id, [0, 0, f.w, f.h], x, y, w, h, o.alt || caption, 'Board image ' + id);
  if (caption) { fit('board caption ' + id, caption, 12, false, w, 0.3); T(s, caption, { x, y: y + h + 0.12, w, h: 0.3, fontSize: 12, color: MUTED }); }
  const map = (fx, fy) => [x + fx / f.w * w, y + fy / f.h * h];
  return { x, y, w, h, map, id };
}
// a small whole-frame thumbnail with a hairline border; returns its height
async function thumb(s, id, x, y, w, o = {}) {
  const f = frame(id), h = o.h || w * f.h / f.w;
  s.addShape(RECT, { x: x - 0.03, y: y - 0.03, w: w + 0.06, h: h + 0.06, fill: { color: NAVY }, line: { color: o.line || INK, width: 0.75, transparency: o.ltr ?? 65 }, objectName: 'Thumb frame ' + id });
  await image(s, id, [0, 0, f.w, f.h], x, y, w, h, o.alt || id, 'Thumb ' + id);
  return h;
}
// highlight an element and tag it with its number; the tag sits beside the element (side l/r/t/b)
// or, with edge, on the bezel with a short leader, so it never hides the UI
function hl(s, dv, box, n, o = {}) {
  const [fx, fy, fw, fh] = box, p = o.p ?? 0.025, d = 0.34, g = 0.07;
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

// ---------- layouts (deck v2): only a background and placeholders, no footer, logo or slide number ----------
const ph = (name, type, x, y, w, h, o) => ({ placeholder: { options: Object.assign({ name, type, x, y, w, h, margin: 0, valign: 'top', align: 'left', color: INK }, o), text: '' } });
const KICK = { fontSize: 13, bold: true, color: LAV };
pres.defineSlideMaster({
  title: 'COVER', background: { path: A('bg3_cover.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 1.6, 8.5, 0.4, KICK),
    ph('title', 'title', 0.6, 2.05, 7.2, 2.6, { fontSize: 48, bold: true, lineSpacingMultiple: 0.9 }),
    ph('body', 'body', 0.6, 4.9, 6.2, 0.9, { fontSize: TS.lead, color: MUTED, lineSpacingMultiple: 1.1 }),
  ],
});
pres.defineSlideMaster({
  title: 'SECTION', background: { path: A('bg3_section.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 2.0, 9, 0.4, KICK),
    ph('title', 'title', 0.6, 2.4, 9.8, 1.9, { fontSize: TS.section, bold: true, lineSpacingMultiple: 0.92 }),
    ph('body', 'body', 0.6, 4.4, 7.6, 1.3, { fontSize: TS.lead, color: MUTED, lineSpacingMultiple: 1.1 }),
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
  objects: [ph('kicker', 'body', 0.6, 0.55, 6.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 5.6, 1.1, { fontSize: TS.title, bold: true, lineSpacingMultiple: 0.95 })],
});
pres.defineSlideMaster({
  title: 'PHOTO', background: { path: A('bg2_problem.jpg') },
  objects: [ph('kicker', 'body', 0.6, 1.2, 7, 0.35, KICK),
    ph('title', 'title', 0.6, 1.65, 6.4, 2.6, { fontSize: 52, bold: true, lineSpacingMultiple: 0.92 }), ph('body', 'body', 0.6, 4.45, 5.6, 1.3, { fontSize: TS.lead, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'CLOSE', background: { path: A('bg2_close.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 3.4, 9, 0.35, KICK),
    ph('title', 'title', 0.6, 3.85, 11.5, 1.65, { fontSize: 52, bold: true, lineSpacingMultiple: 0.92 }), ph('body', 'body', 0.6, 5.7, 10, 0.95, { fontSize: TS.lead, color: MUTED })],
});
pres.defineSlideMaster({
  title: 'APPENDIX', background: { path: A('bg2_content.jpg') },
  objects: [
    ph('kicker', 'body', 0.6, 0.55, 10.5, 0.3, KICK), ph('title', 'title', 0.6, 0.88, 11.6, 0.72, { fontSize: 32, bold: true }),
  ],
});

// content slide header: kicker + title (the title shrinks in steps when it would not fit one line)
function content(kicker, title, sec, o = {}) {
  const s = pres.addSlide({ masterName: o.master || 'CONTENT', sectionTitle: sec });
  s.addText(kicker, { placeholder: 'kicker', charSpacing: 1.5 });
  fit('kicker ' + kicker, kicker, 13, true, 10.5, 0.3, 1.17, 1.5);
  const pt = sizeFor(title, [36, 34, 32, 30, 28], true, (o.tw || 12.1) - 0.1, 0.72, 1.0, -0.5);
  s.addText([{ text: title, options: { fontSize: pt } }], { placeholder: 'title', charSpacing: -0.5 });
  return s;
}
function section(kicker, title, body, sec, n) {
  const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: sec });
  s.addText(kicker, { placeholder: 'kicker', charSpacing: 1.5 });
  T(s, String(n), { x: 7.9, y: 0.4, w: 4.83, h: 2.6, fontSize: 200, bold: true, color: LAV, transparency: 86, charSpacing: -4, align: 'right', objectName: 'Area number' });
  fit('section title ' + title, title, TS.section, true, 9.7, 1.9, 0.92, -1);
  s.addText(title, { placeholder: 'title', charSpacing: -1 });
  fit('section body ' + title, body, TS.lead, false, 7.6, 1.3, 1.1);
  s.addText(body, { placeholder: 'body' });
  return s;
}

// ---------- scene slide: one frame, numbered "watch for" markers, the readiness block ----------
const DY = 1.12, DW = 6.78;
const CAM1 = [916, 296, 210, 248], CAM2 = [1134, 296, 210, 120], CAM3 = [1134, 424, 210, 120];
async function scene(d) {
  const right = d.side !== 'left';
  const s = pres.addSlide({ masterName: right ? 'SCENE_R' : 'SCENE_L', sectionTitle: d.section });
  const tx = right ? MX : 7.83, w = 4.9;
  s.addText(d.kicker, { placeholder: 'kicker', charSpacing: 1.5 });
  fit(d.kicker + ' kicker', d.kicker, 13, true, 4.9, 0.3, 1.17, 1.5);
  // the frame's own grade, then its id
  let px = tx;
  px += grade(s, px, 0.95, d.grade[0], d.grade[1]) + 0.12;
  if (d.frame) {
    // the frame id keeps its letter spacing when the room beside the grade pill allows it, else it drops to 0 (never wraps)
    const lab = d.frame.toUpperCase(), bw = tx + w - px, cs = tw(lab, 12, true, 0.5) <= bw ? 0.5 : 0;
    fit(d.kicker + ' frame', lab, 12, true, bw, 0.3, 1.17, cs);
    T(s, lab, { x: px, y: 0.95, w: bw, h: 0.3, fontSize: 12, bold: true, color: MUTED, charSpacing: cs, valign: 'middle' });
  }
  const tpt = sizeFor(d.title, [32, 30, 28, 26], true, 4.8, 1.0, 0.95, -0.5);
  s.addText(d.title.split('\n').map((t, i, a) => ({ text: t, options: { fontSize: tpt, breakLine: i < a.length - 1 } })), { placeholder: 'title', charSpacing: -0.5 });
  let y = 2.48;
  label(s, 'WATCH FOR', tx, y, 2); y += 0.32;
  const wp = d.extra ? 0.44 : 0.5;
  for (const [i, [lead, rest]] of d.watch.entries()) {
    marker(s, tx + 0.17, y + 0.16, i + 1, { d: 0.34, pt: 14 });
    fit(d.kicker + ' watch ' + (i + 1), lead + ' ' + rest, 16, false, w - 0.54, 0.3);
    T(s, [{ text: lead + ' ', options: { bold: true } }, { text: rest, options: { color: MUTED } }], { x: tx + 0.54, y: y - 0.02, w: w - 0.54, h: 0.34, fontSize: 16 });
    y += wp;
  }
  y += 0.06;
  label(s, 'READINESS', tx, y, 2); y += 0.32;
  // ledger: a fixed pill column, 12 pt text beside it; roadmap rows end in "proposed", the footnote under the screen carries the rest
  const PW = 1.62, SHORT = { today: 'IN V11 TODAY', concept: 'CONCEPT', roadmap: 'ROADMAP', confirm: 'TO CONFIRM', none: 'NOT IN V11' };
  for (const r of d.ready) {
    const kind = r[0], isTrain = kind === 'roadmap' && TRAINS.some(t => t.id === r[1]), text = isTrain ? `${train(r[1]).name} · ${train(r[1]).ga} · proposed` : r[r.length - 1];
    const pw = grade(s, tx, y, kind, SHORT[kind]);
    if (pw > PW + 0.02) WARN.push(`${d.kicker}: pill ${SHORT[kind]} wider than the ledger column`);
    const aw = w - PW - 0.1, n = nlines(text, 12, false, aw), h = Math.max(0.3, n * 0.2 + 0.1);
    fit(d.kicker + ' ready ' + kind, text, 12, false, aw, h, 1.1);
    T(s, text, { x: tx + PW + 0.1, y: n === 1 ? y : y - 0.02, w: aw, h, fontSize: 12, color: MUTED, valign: n === 1 ? 'middle' : 'top', lineSpacingMultiple: 1.05 });
    y += h + 0.08;
  }
  if (process.env.DEBUG) console.log('scene', d.frame, 'column ends at', y.toFixed(2));
  if (d.extra) {
    const e = d.extra, top = y + 0.08, hAvail = 6.88 - top, asp = e.r[2] / e.r[3];
    // a caption under the lens takes its measured height out of the lens budget, so the column still ends at 6.88
    const capH = e.caption ? nlines(e.caption, 12, false, w) * 0.2 + 0.1 : 0, budget = e.caption ? 0.14 + capH : 0;
    let lw, lh, below;
    if (w / asp + budget <= hAvail) { lw = w; lh = w / asp; below = true; }
    else {
      lh = hAvail; lw = lh * asp; if (lw > w) { lw = w; lh = w / asp; }
      below = (w - lw) < 1.1;
      if (below) { lh = hAvail - budget; lw = lh * asp; }
    }
    if (lh < 0.75) WARN.push(`${d.kicker}: extra lens only ${lh.toFixed(2)}in tall`);
    const ln = await lens(s, null, e.id, e.r, tx, top + 0.04, lw, { n: e.n, nAt: e.nAt || 'tl', alt: e.alt });
    if (e.caption) {
      const cx = below ? tx : tx + lw + 0.2, cy = below ? top + lh + 0.14 : top + 0.04, cw = below ? w : w - lw - 0.2, ch = below ? capH : lh;
      fit(d.kicker + ' extra caption', e.caption, 12, false, cw, ch, 1.05);
      T(s, e.caption, { x: cx, y: cy, w: cw, h: ch, fontSize: 12, color: MUTED, valign: 'top', lineSpacingMultiple: 1.05 });
    }
    if (e.after) e.after(s, ln);
  }
  // every proposed date on this slide points here
  if (d.ready.some(r => r[0] === 'roadmap')) {
    const vx = right ? 5.95 : MX, nx = vx + (d.noteDx || 0), nw = DW - (d.noteDx || 0);
    const long = `Proposed dates: confirm with R&D by ${CONFIRM_BY}.`, note = nlines(long, 12, false, nw) === 1 ? long : `Dates: proposed · confirm with R&D by ${CONFIRM_BY}`;
    fit(d.kicker + ' note', note, 12, false, nw, 0.3);
    T(s, note, { x: nx, y: d.noteY || 6.6, w: DW - (d.noteDx || 0), h: 0.3, fontSize: 12, color: MUTED });
  }
  await d.visual(s, right ? 5.95 : MX);
  s.addNotes(d.notes.join('\n'));
  return s;
}

// ---------- release trains for one strategic area: four columns, every date a proposal ----------
async function trainBoard(s, key, o = {}) {
  const colW = (CW - 3 * 0.25) / 4, ly = 2.12, y0 = 2.6, h = 3.9;
  s.addShape(LINE, { x: MX + 0.35, y: ly, w: CW - 0.7, h: 0, line: { color: INK, width: 1, transparency: 70 }, objectName: 'Train line' });
  for (const [i, t] of TRAINS.entries()) {
    const x = MX + i * (colW + 0.25), col = i ? BLUE : GREEN;
    s.addShape(OVAL, { x: x + 0.15, y: ly - 0.2, w: 0.4, h: 0.4, fill: { color: col, transparency: 70 }, line: { type: 'none' }, objectName: 'Milestone halo ' + t.name });
    s.addShape(OVAL, { x: x + 0.22, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col }, line: { color: INK, width: 1.5 }, objectName: 'Milestone ' + t.name });
    T(s, t.ga ? `${t.name.toUpperCase()}  ·  ${t.ga.toUpperCase()}` : `${t.name.toUpperCase()}  ·  TODAY`, { x: x + 0.15, y: ly - 0.6, w: colW - 0.15, h: 0.28, fontSize: 12, bold: true, color: col, charSpacing: 1.5, valign: 'middle' });
    card(s, x, y0, colW, h, { tr: 25, edge: col, name: 'Train ' + t.name });
    grade(s, x + 0.22, y0 + 0.22, i ? 'roadmap' : 'today', i ? 'ROADMAP · ' + t.name : undefined);
    const ttl = o.titles ? o.titles[i] : t.theme;
    const n = fit('train title ' + t.name, ttl, 18, true, colW - 0.44, 0.62, 1.0);
    T(s, ttl, { x: x + 0.22, y: y0 + 0.64, w: colW - 0.44, h: 0.62, fontSize: 18, bold: true, lineSpacingMultiple: 1.0 });
    // the one-line kicker follows the measured title height (one or two lines); the footnote carries the full "confirm with R&D" rule
    const ky = y0 + 0.64 + n * 0.29 + 0.08, kick = t.ga ? 'PROPOSED · TO CONFIRM' : 'IN SERVICE';
    fit('train kicker ' + t.name, kick, 12, true, colW - 0.44, 0.26, 1.17, 0.5);
    T(s, kick, { x: x + 0.22, y: ky, w: colW - 0.44, h: 0.26, fontSize: 12, bold: true, color: t.ga ? GOLD : GREEN, charSpacing: 0.5, valign: 'middle' });
    bullets(s, t[key], x + 0.18, y0 + 1.64, colW - 0.36, 1.42, { pt: 13, id: 'train ' + t.name + ' ' + key, gap: 3 });
    s.addShape(LINE, { x: x + 0.22, y: y0 + 3.1, w: colW - 0.44, h: 0, line: { color: INK, width: 0.5, transparency: 80 }, objectName: 'Card rule' });
    label(s, 'WHAT CAG SEES', x + 0.22, y0 + 3.16, colW - 0.44, LAV);
    fit('train see ' + t.name, t.see[key], 12, false, colW - 0.44, 0.44, 1.05);
    T(s, t.see[key], { x: x + 0.22, y: y0 + 3.42, w: colW - 0.44, h: 0.44, fontSize: 12, lineSpacingMultiple: 1.05 });
  }
  footnote(s, `Dates are Product proposals. Peter and Anuar confirm them against the R&D roadmap by ${CONFIRM_BY}; no date goes to CAG before that.`, 6.62);
}

// ---------- slides ----------
function checkDates(src) { for (const m of src.matchAll(/V11\.(\d) · (Q\d 20\d\d(?: \(\w+\))?)/g)) { const t = train('11.' + m[1]); if (!t.ga.startsWith(m[2])) throw new Error(`date ${m[2]} for ${t.name} disagrees with TRAINS (${t.ga})`); } }
checkDates(fs.readFileSync(__filename, 'utf8'));
async function build() {
  let s;
  const F02 = 'V11-02', F03 = 'V11-03', F10 = 'V11-10', F11 = 'V11-11', F12 = 'V11-12';

  // 1 ── cover
  pres.addSection({ title: SEC.open });
  s = pres.addSlide({ masterName: 'COVER', sectionTitle: SEC.open });
  full(s, 'viz_cover.png', 'Hundreds of alarm dots narrowing into a single bright answer');
  s.addText('STRATEGIC AREAS 2 · 4 · 5  ·  AGIL® SECURE V11 FOR CHANGI', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText([{ text: 'Three questions', options: { breakLine: true } }, { text: 'from Friday.', options: { breakLine: true } }, { text: 'Three product', options: { color: LAV, breakLine: true } }, { text: 'answers.', options: { color: LAV } }], { placeholder: 'title', charSpacing: -1.5 });
  fit('cover title', 'Three questions\nfrom Friday.\nThree product\nanswers.', 48, true, 7.2, 2.6, 0.9);
  const coverBody = 'What is in V11 today, what is designed, what is on the roadmap. And what we commit to CAG.';
  s.addText(coverBody, { placeholder: 'body' });
  fit('cover body', coverBody, TS.lead, false, 6.2, 0.9, 1.1);
  s.addShape(LINE, { x: 0.6, y: 6.28, w: 0.5, h: 0, line: { color: LAV, width: 2 }, objectName: 'Rule' });
  T(s, `Internal  ·  Product view  ·  ${DECK_DATE}`, { x: 0.6, y: 6.45, w: 8, h: 0.3, fontSize: TS.small, color: MUTED });
  s.addNotes([
    'Good morning. On Friday the team asked us three questions about strategic areas two, four and five. Is Weili’s AI deck aligned and good to commit to Changi? And is there a ready module in V11 for AgilFence integration, and for multi-site governance?',
    'This deck gives the product answers. For each area we say what is in V11 today, what is designed, and what sits on the roadmap. Every date in here is a proposal until R&D confirms it.',
    'We close with what we commit to CAG, and the decisions we need from you today.',
  ].join('\n'));

  // 2 ── executive summary
  s = content('THE ANSWER ON ONE PAGE', 'Executive summary', SEC.open);
  {
    const cw = (CW - 2 * 0.25) / 3, y = 1.8, h = 4.5;
    const COLS = [
      { n: 2, name: 'AI-powered AGIL Secure ISMS', ask: 'Is Weili’s deck aligned and good to commit? Any other supporting material?', head: 'Yes, with four edits.',
        tags: [['today', 'WORKFLOW'], ['concept', 'AI LAYER']],
        answer: 'The alarm → incident → SOP → report workflow is in V11 today. The AI layer is designed (12 frames, film) and ships in V11.1 and V11.2.',
        sees: '22 Oct: film + frames, or live V11 if R&D confirms. Supporting material: in hand.' },
      { n: 4, name: 'AgilFence unified integration', ask: 'Is there a ready in-built module in V11 to present to CAG?', head: 'Partly.',
        tags: [['today', 'WORKFLOW'], ['roadmap', 'FENCE MODULE']],
        answer: 'V11’s workflow takes any alarm source today; the fence feed joins once connected (interface: R&D to confirm). The AgilFence module is designed and ships in three trains.',
        sees: '22 Oct: AgilFence flow board + film. Q4: SOP-mapping workshop.' },
      { n: 5, name: 'Multi-site, multi-brand governance', ask: 'Is there a ready in-built module in V11 to present to CAG?', head: 'Not yet.',
        tags: [['concept', 'SIX FRAMES'], ['roadmap', 'THREE TRAINS']],
        answer: 'V11 runs one site with many clusters. The estate layer (overview, baseline, roles, connectors, report) is designed in six frames and ships in V11.1–V11.3.',
        sees: 'Q4: design walkthrough with a CAG design partner.' },
    ];
    for (const [i, c] of COLS.entries()) {
      const x = MX + i * (cw + 0.25), iw = cw - 0.44, ix = x + 0.22;
      card(s, x, y, cw, h, { tr: 25, name: 'Area ' + c.n });
      label(s, 'STRATEGIC AREA ' + c.n, ix, y + 0.16, iw, LAV);
      fit('sum name ' + c.n, c.name, 18, true, iw, 0.56, 1.0);
      T(s, c.name, { x: ix, y: y + 0.42, w: iw, h: 0.56, fontSize: 18, bold: true, lineSpacingMultiple: 1.0 });
      label(s, 'THE ASK', ix, y + 1.08, iw);
      fit('sum ask ' + c.n, c.ask, 13, false, iw, 0.44, 1.1);
      T(s, c.ask, { x: ix, y: y + 1.32, w: iw, h: 0.46, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.05 });
      label(s, 'OUR ANSWER', ix, y + 1.84, iw);
      T(s, c.head, { x: ix, y: y + 2.08, w: iw, h: 0.3, fontSize: 16, bold: true, valign: 'middle' });
      let px = ix; for (const [k, t] of c.tags) px += grade(s, px, y + 2.42, k, t) + 0.08;
      if (px > x + cw - 0.1) WARN.push('summary tags overflow ' + c.n);
      fit('sum answer ' + c.n, c.answer, 12, false, iw, 0.84, 1.1);
      T(s, c.answer, { x: ix, y: y + 2.8, w: iw, h: 0.86, fontSize: 12, lineSpacingMultiple: 1.05 });
      label(s, 'WHAT CAG SEES', ix, y + 3.7, iw);
      fit('sum sees ' + c.n, c.sees, 12, false, iw, 0.44, 1.1);
      T(s, c.sees, { x: ix, y: y + 3.94, w: iw, h: 0.46, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
    }
    const by = 6.42;
    card(s, MX, by, CW, 0.48, { fill: LAV, tr: 86, line: LAV, ltr: 55, lw: 1, name: 'Decisions band' });
    label(s, 'DECISIONS TODAY', MX + 0.25, by + 0.11, 2.1, LAV);
    const dec = [{ text: '1  ', options: { bold: true, color: LAV } }, { text: 'Approve the commitment list   ' }, { text: '2  ', options: { bold: true, color: LAV } }, { text: 'Approve the four edits   ' }, { text: '3  ', options: { bold: true, color: LAV } }, { text: 'Lock train dates by 30 Oct   ' }, { text: '4  ', options: { bold: true, color: LAV } }, { text: 'Name the design partner' }];
    fit('decisions band', plain(dec), 13, false, CW - 2.55, 0.3);
    T(s, dec, { x: MX + 2.35, y: by, w: CW - 2.55, h: 0.48, fontSize: 13, valign: 'middle' });
  }
  s.addNotes([
    'Here is the summary on one page. Area two: the alarm-to-incident workflow, with its standard operating procedures, is in V11 today and the AI layer is designed. Weili’s deck is aligned and we commit it with four edits.',
    'Area four: partly. V11’s workflow takes any alarm source today; the fence feed still has to be connected, and R&D confirms the interface. The AgilFence module itself is designed and on the roadmap. Area five: not yet. V11 runs one site; the estate layer is designed in six new frames and ships in three trains, on proposed dates.',
    'We need four decisions today: approve the commitment list, approve the four edits, mandate us to lock the train dates with R&D by the thirtieth of October, and name the CAG design partner for multi-site governance.',
  ].join('\n'));

  // 3 ── the asks
  s = content('16 OCTOBER  ·  UPDATE ON THE STRATEGIC AREAS', 'What the team asked on 16 October', SEC.open);
  {
    const cw = (CW - 2 * 0.25) / 3, y = 1.8, h = 5.1;
    const ASKS = [
      { n: 2, name: 'AI-powered AGIL Secure ISMS', ask: '“Please confirm if the deck and use cases provided by Weili are aligned and good to be committed to CAG. Any other supporting material from R&D on this aspect?”',
        out: 'Position AGIL Secure as an AI-enabled security operating platform rather than a traditional ACS / VMS solution, supported by the existing ISMS digital workflow architecture.', who: 'Qinyuan (Product) · Weili (deck) · Peter and Anuar (R&D view)' },
      { n: 4, name: 'AgilFence unified integration', ask: '“Do advise if there is a ready in-built module in V11 that we can present to CAG. If not, advise the roadmap, high-level visuals and timeline of official launch.”',
        out: 'Improvement from the decade-old iPAMS, the AgilFence alarm-management software; CAG’s increasing platform stickiness.', who: 'Qinyuan (Product) · Anuar (iPAMS interface) · Peter (roadmap)' },
      { n: 5, name: 'Multi-site, multi-brand governance', ask: '“Do advise if there is a ready in-built module in V11 that we can present to CAG. If not, advise the roadmap, high-level visuals and timeline of official launch.”',
        out: 'AGIL Secure positioned above subsystem level as the orchestration, governance and operational decision layer, supported by open API, SDK and interoperability.', who: 'Qinyuan (Product) · Peter (API, roles) · Anuar (connectors)' },
    ];
    for (const [i, a] of ASKS.entries()) {
      const x = MX + i * (cw + 0.25), iw = cw - 0.44, ix = x + 0.22;
      card(s, x, y, cw, h, { tr: 25, name: 'Ask ' + a.n });
      label(s, 'STRATEGIC AREA ' + a.n, ix, y + 0.16, iw, LAV);
      fit('ask name ' + a.n, a.name, 20, true, iw, 0.62, 1.0);
      T(s, a.name, { x: ix, y: y + 0.42, w: iw, h: 0.62, fontSize: 20, bold: true, lineSpacingMultiple: 1.0 });
      label(s, 'THE ASK', ix, y + 1.1, iw);
      fit('ask text ' + a.n, a.ask, 15, false, iw, 1.3, 1.1);
      T(s, a.ask, { x: ix, y: y + 1.36, w: iw, h: 1.32, fontSize: 15, lineSpacingMultiple: 1.05 });
      label(s, 'SUCCESS OUTCOME', ix, y + 2.78, iw);
      fit('ask out ' + a.n, a.out, 13, false, iw, 1.1, 1.1);
      T(s, a.out, { x: ix, y: y + 3.02, w: iw, h: 1.12, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.05 });
      label(s, 'WHO IS ON IT', ix, y + 4.22, iw);
      fit('ask who ' + a.n, a.who, 13, false, iw, 0.46, 1.1);
      T(s, a.who, { x: ix, y: y + 4.46, w: iw, h: 0.5, fontSize: 13, lineSpacingMultiple: 1.05 });
    }
  }
  s.addNotes([
    'These are the three asks as they were written on Friday, lightly edited for grammar, next to the strategic area and the success outcome each one serves. Area two is about positioning AGIL Secure as an AI-enabled security operating platform. Area four is about bringing the separate AgilFence platform into one workflow. Area five is about running many terminals, facilities and third-party systems under one governance framework.',
    'We own the product answer in this deck. Peter and Anuar own the technical confirmation, and Weili owns the AI deck we are reviewing.',
  ].join('\n'));

  // 4 ── how we grade readiness
  s = content('ONE RULE FOR EVERY SLIDE AND EVERY FRAME', 'How we grade readiness', SEC.open);
  {
    const EX = { today: 'Alert cards, Active Alarms, SOP Flow, Escalate, Incident Management, 3D viewer with Locate.', concept: 'The 12 V11 frames and film, the AgilFence flow and film, the six multi-site frames.', roadmap: `V11.1, V11.2, V11.3 with ${PROPOSED}.`, confirm: 'Which iPAMS interface V11 can consume today; the connector list V11 ships; a demo instance for 22 Oct.' };
    const lw = 7.5, y0 = 1.85, rh = 1.05;
    for (const [i, k] of ['today', 'concept', 'roadmap', 'confirm'].entries()) {
      const g = GRADES[k], y = y0 + i * (rh + 0.1);
      card(s, MX, y, lw, rh, { tr: 25, edge: g.hex, name: 'Grade ' + k });
      grade(s, MX + 0.25, y + 0.2, k);
      fit('grade meaning ' + k, g.meaning, 14, false, lw - 2.9, 0.5, 1.1);
      T(s, g.meaning, { x: MX + 2.65, y: y + 0.1, w: lw - 2.9, h: 0.52, fontSize: 14, lineSpacingMultiple: 1.05 });
      fit('grade example ' + k, 'In this deck: ' + EX[k], 12, false, lw - 2.9, 0.38, 1.1);
      T(s, [{ text: 'In this deck: ', options: { bold: true, color: g.hex } }, { text: EX[k] }], { x: MX + 2.65, y: y + 0.64, w: lw - 2.9, h: 0.38, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
    }
    const rx0 = MX + lw + 0.3, rw2 = RX - rx0;
    card(s, rx0, y0, rw2, 4 * rh + 0.3, { fill: LAV, tr: 88, line: LAV, ltr: 55, lw: 1, name: 'Commitment rule' });
    label(s, 'THE COMMITMENT RULE', rx0 + 0.3, y0 + 0.25, rw2 - 0.6, LAV);
    const RULES = [['Commit', 'what is in V11 today.'], ['Show', 'concepts, always labelled.'], ['Promise dates', `only after R&D confirms (by ${CONFIRM_BY}).`], ['Never promise', 'autonomous closure, facial recognition or performance numbers.']];
    for (const [i, [a, b]] of RULES.entries()) {
      const y = y0 + 0.7 + i * 0.92;
      s.addShape(OVAL, { x: rx0 + 0.3, y: y + 0.12, w: 0.14, h: 0.14, fill: { color: LAV }, line: { type: 'none' }, objectName: 'Rule dot' });
      fit('rule ' + a, a + ' ' + b, 17, false, rw2 - 1.0, 0.8, 1.1);
      T(s, [{ text: a + ' ', options: { bold: true, color: LAV } }, { text: b }], { x: rx0 + 0.6, y: y - 0.02, w: rw2 - 0.9, h: 0.84, fontSize: 17, lineSpacingMultiple: 1.05 });
    }
  }
  s.addNotes([
    'Before the answers, one rule. Everything we show CAG carries a grade. Green means it exists in V11 today and we can show it live. Lavender means a high-fidelity design on V11 screens with simulated data, not in the software. Blue means it is planned for a release train, and the date is our proposal until R&D confirms it. Amber marks the facts we cannot verify on our own.',
    'The commitment rule follows from that. We commit what is in V11 today. We show concepts, always labelled. We promise dates only after R&D confirms them, which we have asked for by the thirtieth of October. And we never promise autonomous closure, facial recognition or performance numbers.',
  ].join('\n'));

  // 5 ── three flows on one board: the master board from the Figma package
  s = content('STRATEGIC AREAS 2 · 4 · 5  ·  END-TO-END USER FLOWS', 'Three flows on one board', SEC.open);
  {
    const bw = 7.2, by = 1.78;
    await board(s, 'MASTER', MX, by, bw, 'Master board · illustrative scenario, simulated data · Figma SVG and PDF in the package (A2)', { alt: 'Master board with three lanes, one per strategic area: the ask, the one-line answer and the flow as V11 screens, each step with its grade tag and release train' });
    const rx0 = MX + bw + 0.3, rw2 = RX - rx0, ch = 1.48;
    const LANES = [
      ['2', 'AI-powered AGIL Secure ISMS', 'Workflow in V11 today; the AI layer is designed and ships in V11.1 and V11.2.', '6 steps', 'V11-01 → V11-12'],
      ['4', 'AgilFence unified integration', 'Partly: the workflow takes any alarm source; the fence module is designed and on the roadmap.', '9 steps', 'AF-01 → AF-09'],
      ['5', 'Multi-site, multi-brand governance', 'Not yet: one site today; the estate layer is designed and ships in three trains.', '6 steps', 'MS-01 → MS-06'],
    ];
    for (const [i, [n, name, ans, steps, ids]] of LANES.entries()) {
      const y = by + i * (ch + 0.1), ix = rx0 + 0.22, iw = rw2 - 0.44;
      card(s, rx0, y, rw2, ch, { tr: 25, name: 'Lane ' + n });
      label(s, 'LANE ' + (i + 1) + '  ·  STRATEGIC AREA ' + n, ix, y + 0.14, iw, LAV);
      fit('lane name ' + n, name, 15, true, iw, 0.3);
      T(s, name, { x: ix, y: y + 0.42, w: iw, h: 0.3, fontSize: 15, bold: true });
      fit('lane answer ' + n, ans, 12, false, iw, 0.44, 1.05);
      T(s, ans, { x: ix, y: y + 0.74, w: iw, h: 0.44, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
      T(s, [{ text: steps + '  ', options: { bold: true } }, { text: ids, options: { color: LAV, bold: true } }], { x: ix, y: y + 1.16, w: iw, h: 0.26, fontSize: 12, color: MUTED, valign: 'middle' });
    }
    T(s, 'Each step carries its grade and release train.', { x: rx0, y: 6.58, w: rw2, h: 0.3, fontSize: 12, color: MUTED });
  }
  s.addNotes([
    'Before the three answers, the whole picture on one board. Three lanes, one per strategic area: the ask from Friday, our one-line answer, and the flow CAG would see, screen by screen, each step with its readiness grade and its release train.',
    'This board is the one Figma file the team can open; the frames follow at full size in the package. Everything on it is an illustrative scenario with simulated data, and every date on it is a proposal until R&D confirms.',
  ].join('\n'));

  // 6 ── section: area 2
  pres.addSection({ title: SEC.p2 });
  s = section('STRATEGIC AREA 2', 'AI-powered AGIL Secure ISMS', 'The workflow is in V11 today. The AI layer is designed and ships in V11.1 and V11.2, on proposed dates. Weili’s deck is aligned: commit it with four edits.', SEC.p2, 2);
  s.addNotes([
    'Strategic area two. Our answer in one line: the workflow is in V11 today, the AI layer is designed, and it goes into production in trains eleven point one and eleven point two, on proposed dates. Weili’s deck is aligned in direction and we recommend committing it with four edits.',
    'Three use cases on V11 screens come first. Then the verdict on Weili’s deck, the split between what exists and what the demo adds, and the material we already have.',
  ].join('\n'));

  // 6 ── six capabilities, one use case each
  s = content('STRATEGIC AREA 2  ·  DEMO USE CASES', 'Six capabilities CAG named, one demo use case each', SEC.p2);
  {
    const CAP = [
      ['Alarm correlation', 'Staff Door D-214: five alarms, one incident', 'V11-02', 'Alert cards, Active Alarms, Investigation tab', 'Co-pilot line, linked-alarm list, airport model and pins', ['11.1']],
      ['AI Security Co-pilot', 'Co-pilot summary, SOP pre-filled, approvals', 'V11-03', 'SOP Flow, Critical Action steps', 'Co-pilot entry, pre-fill, auto-ticked steps', ['11.1']],
      ['Incident automation (assisted)', 'Gate B12 bag: steps 1–4 done, a person approves step 5; Row K watchlist stays human', 'V11-05', 'SOP Flow, Acknowledge and Escalate', 'Auto-investigation steps, verify-first step', ['11.1', '11.2']],
      ['Natural-language investigation', '“Show critical incidents in T5 in the last hour”', 'V11-11', 'Search bar', 'Ask Co-pilot answer with sources', ['11.2']],
      ['Access intelligence', 'T1 Door C2 impossible presence; B2 overstay rules', 'V11-04', 'ACS alarms in Active Alarms', 'Travel-time check, legacy-SSID row, rules (i)–(v)', ['11.1', '11.2']],
      ['Automated reporting', 'TGT-214 report draft, ready to sign', 'V11-12', 'Incident Management, Remarks', 'Co-pilot report draft', ['11.1']],
    ];
    const cols = [1.30, 1.95, 2.95, 1.90, 2.55, 1.45], xs = []; let cx = MX; for (const w of cols) { xs.push(cx); cx += w + 0.0; }
    const y0 = 1.78, rh = 0.76;
    // header: the grade of each column (the frame thumbnails are concept frames, so their column is headed by the concept pill)
    grade(s, xs[0], y0 - 0.02, 'concept', 'CONCEPT');
    label(s, 'CAG NAMED', xs[1], y0, cols[1]);
    label(s, 'DEMO USE CASE', xs[2], y0, cols[2]);
    grade(s, xs[3], y0 - 0.02, 'today'); grade(s, xs[4], y0 - 0.02, 'concept'); grade(s, xs[5], y0 - 0.02, 'roadmap', 'TRAIN');
    for (const [i, [cap, use, fr, today, concept, trains]] of CAP.entries()) {
      const y = y0 + 0.4 + i * rh;
      s.addShape(LINE, { x: MX, y: y - 0.04, w: CW, h: 0, line: { color: INK, width: 0.5, transparency: 85 }, objectName: 'Row rule' });
      const th = await thumb(s, fr, xs[0] + 0.02, y + 0.03, 0.86);
      fit('cap ' + cap, cap, 13, true, cols[1] - 0.15, 0.62, 1.05);
      T(s, cap, { x: xs[1], y: y + 0.02, w: cols[1] - 0.15, h: 0.64, fontSize: 13, bold: true, lineSpacingMultiple: 1.0 });
      fit('use ' + cap, use, 12, false, cols[2] - 0.15, 0.66, 1.05);
      T(s, [{ text: use + '  ', options: {} }, { text: fr, options: { color: LAV, bold: true } }], { x: xs[2], y: y + 0.02, w: cols[2] - 0.15, h: 0.68, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.0 });
      fit('today ' + cap, today, 12, false, cols[3] - 0.15, 0.66, 1.05);
      T(s, today, { x: xs[3], y: y + 0.02, w: cols[3] - 0.15, h: 0.68, fontSize: 12, lineSpacingMultiple: 1.0 });
      fit('concept ' + cap, concept, 12, false, cols[4] - 0.15, 0.66, 1.05);
      T(s, concept, { x: xs[4], y: y + 0.02, w: cols[4] - 0.15, h: 0.68, fontSize: 12, lineSpacingMultiple: 1.0 });
      const px = xs[5] + trainTags(s, xs[5], y + 0.04, trains);
      if (px > RX + 0.02) WARN.push('train tags overflow ' + cap);
      if (th > rh) WARN.push('thumb too tall ' + fr);
    }
    footnote(s, `Also shown: fight detection (V11-07), AgilFence + LiDAR (V11-09) in V11.1. ${TRAINS.filter(t => t.ga).slice(0, 2).map(t => `${t.name} ${t.ga}`).join(' · ')} · ${PROPOSED}.`, 6.62);
  }
  s.addNotes([
    'CAG named six AI capabilities. For each one we have a demo use case on real V11 screens. The green column is what V11 does today: the alert cards, the Active Alarms panel, SOP Flow, the Escalate dialog and Incident Management. The lavender column is what the Co-pilot adds on top, as designed in our frames. The last column is the train we propose for it.',
    'Notice the pattern. Nothing here is a new screen. Every use case reuses a V11 part and adds a Co-pilot line, a pre-filled step or a draft.',
  ].join('\n'));

  // 7 ── one incident, not five alarms
  await scene({
    section: SEC.p2, kicker: 'ALARM CORRELATION  ·  D-214  ·  02:14', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'V11-02',
    title: 'One incident,\nnot five alarms',
    watch: [['Co-pilot line:', '5 linked alarms, one sentence'], ['Evidence:', 'follower boxed “No badge”'], ['Linked alarms:', 'badge, door, LiDAR, video']],
    ready: [['today', 'Alert cards, Active Alarms, Investigation tab, camera tiles'], ['concept', 'Co-pilot line, summary, linked-alarm list, airport model and pins'], ['roadmap', '11.1']],
    visual: async (s, vx) => {
      const dv = await device(s, F02, vx, DY, DW, 'V11 Active Alarms for Staff Door D-214 on the Investigation tab: Co-pilot summary, linked alarms and camera evidence');
      hl(s, dv, ab(F02, 'Co-pilot · 5 linked'), 1, { side: 'l', edge: true });
      await lens(s, dv, F02, CAM1, 7.78, 1.72, 2.3, { n: 2, alt: 'Camera 3-118 at Door D-214: badge holder and follower, the follower boxed as No badge' });
      hl(s, dv, [950, 743, 378, 106], 3, { side: 'r', edge: true });
    },
    notes: [
      'The first use case: alarm correlation. Staff Door D-214 raises five alarms, one after another. In V11 today they appear as alert cards and in Active Alarms with the Investigation tab and camera tiles. What the Co-pilot adds is the line on the card, the one-sentence summary and the list of linked alarms behind it.',
      'The screen itself is V11 today. What you see in lavender is the designed concept, proposed for train eleven point one.',
    ],
  });

  // 8 ── Co-pilot prepares, people approve
  await scene({
    side: 'left', section: SEC.p2, kicker: 'CO-PILOT, ASSISTED RESPONSE  ·  02:17', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'V11-03 + V11-10',
    title: 'Co-pilot prepares.\nPeople approve.',
    watch: [['Done by Co-pilot:', 'follower tracked'], ['Your approval:', 'lock D-214']],
    ready: [['today', 'SOP Flow, Critical Action steps, Escalate'], ['concept', 'Pre-filled SOP and dialog, auto-ticked steps'], ['roadmap', '11.1']],
    extra: { id: F10, r: [372, 488, 637, 215], n: 3, nAt: 'tr', caption: 'Pre-filled Escalate dialog: edit anything, then create the incident.', alt: 'Escalate Event dialog with Category, Severity and Remarks pre-filled by Co-pilot' },
    visual: async (s, vx) => {
      const dv = await device(s, F03, vx, DY, DW, 'V11 SOP Flow for D-214 with the Critical Action step and door buttons; the 3D Locate view shows D-214');
      hl(s, dv, ab(F03, 'Done by Co-pilot', 0, { pad: 8 }), 1, { side: 'r', edge: true });
      await lens(s, dv, F03, [916, 698, 428, 126], 0.66, 4.85, 4.25, { n: 2, alt: 'Critical Action Required: lock D-214 and switch on hard anti-passback, with Lock, Secure and Normal buttons' });
    },
    notes: [
      'Second use case: the Co-pilot prepares and people approve. V11 already has SOP Flow with Critical Action steps. The concept pre-fills the SOP for this incident, ticks the steps the system did on its own, and stops at the step that needs a person: locking the door.',
      'The same applies to the Escalate dialog, where category, severity and remarks arrive pre-filled and editable. This is the human-in-the-loop model we want CAG to see on every page: assisted, never autonomous.',
    ],
  });

  // 9 ── ask in plain English, the report writes itself
  await scene({
    section: SEC.p2, kicker: 'ASK CO-PILOT  ·  AUTOMATED REPORTING', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'V11-11 + V11-12',
    title: 'Ask in plain English.\nThe report drafts itself.',
    watch: [['Ask:', 'a plain question in the search bar'], ['Answer:', 'one line, with its sources'], ['Report draft:', 'from the audit trail']],
    ready: [['today', 'Search bar, Incident Management, Remarks'], ['concept', 'Ask Co-pilot answer with sources; Co-pilot report draft'], ['roadmap', 'Ask: V11.2 · Q3 2027 (Sep) · report draft: V11.1 · Q1 2027 (Mar) · proposed']],
    visual: async (s, vx) => {
      const dv = await device(s, F11, vx, DY, DW, 'V11 search bar with a Co-pilot question and the answer dropdown: two critical incidents in Terminal 5, both closed, with sources');
      hl(s, dv, ab(F11, 'Show critical incidents', 0, { pad: 10 }), 1, { side: 't', edge: true });
      await lens(s, dv, F11, [440, 100, 655, 100], vx + 0.35, 4.08, 6.0, { n: 2, nAt: 'tl', alt: 'Co-pilot answer: two critical incidents in Terminal 5 in the last hour, both closed' });
      await lens(s, null, F12, [884, 598, 648, 110], vx + 0.35, 5.22, 5.6, { n: 3, nAt: 'tl', alt: 'Co-pilot report draft in the Remarks timeline of Incident Management (V11-12)' });
      T(s, 'Lens 3 is from Incident Management (V11-12).', { x: vx + 0.35, y: 5.22 + 5.6 * 110 / 648 + 0.16, w: 5.6, h: 0.26, fontSize: 12, color: MUTED });
    },
    notes: [
      'Two more use cases on one slide. Natural-language investigation: a duty manager types a plain question into the V11 search bar and gets a one-line answer with its sources. Automated reporting: in Incident Management the Co-pilot drafts the report from the audit trail, and a person signs it off.',
      'The search bar and Incident Management are V11 today. The answer and the draft are concept, proposed for trains eleven point two and eleven point one.',
    ],
  });

  // 10 ── verdict on Weili's deck
  s = content('FRIDAY’S FIRST QUESTION  ·  WEILI’S DECK, 8 PAGES', 'Weili’s deck: aligned — commit it with four edits', SEC.p2);
  {
    const w2 = (CW - 0.3) / 2, y = 1.8, h = 4.05;
    card(s, MX, y, w2, h, { tr: 25, edge: GREEN, name: 'Aligned' });
    grade(s, MX + 0.25, y + 0.22, 'today', 'VERDICT · ALIGNED IN DIRECTION');
    const OK = [
      'The four use cases map one-to-one onto our demo: Co-pilot ↔ D-214; intelligent access ↔ C2, B2, D-214; incident management ↔ Gate B12 with a person in the loop; natural language ↔ Ask Co-pilot.',
      'Its five-stage journey (Detect → Correlate → Contextualise → Orchestrate → Assist and govern) matches our six steps (Detect → Correlate → Explain → Recommend → You decide → Report).',
      '“Human-in-the-loop control” and “correlation, not more alarms” are exactly our positioning.',
      'It names the Security Operating System vision CAG wants to hear.',
    ];
    label(s, 'WHAT IS ALIGNED', MX + 0.25, y + 0.66, w2 - 0.5);
    bullets(s, OK, MX + 0.22, y + 0.98, w2 - 0.44, h - 1.1, { pt: 13, id: 'aligned', gap: 7, color: INK });
    const rx0 = MX + w2 + 0.3;
    card(s, rx0, y, w2, h, { tr: 25, edge: LAV, name: 'Edits' });
    label(s, 'FOUR EDITS BEFORE IT LEAVES THE BUILDING', rx0 + 0.25, y + 0.24, w2 - 0.5, LAV);
    const ED = [
      ['Grade every page.', 'Pages 4–7 read as product today; CAG may take them as committed.'],
      ['Replace concept art with V11 screens', 'where we have them (V11-02/03, 04, 05, 11), or label it “concept illustration”. Remove the “high confidence” percentages from imagery.'],
      ['Rename UC3', 'from “Autonomous incident management” to “Assisted incident management: AI gathers, people authorise”. Keep the human-authorisation line on every use-case page; show confidence as a band, never a number.'],
      ['Cover all five strategic areas:', 'add a perimeter page (AgilFence, AF frames), a multi-site governance page (MS frames) and one privacy line: no facial recognition needed; watchlist matching optional, person-verified.'],
    ];
    let ey = y + 0.6;
    for (const [i, [a, b]] of ED.entries()) {
      const n = nlines(a + ' ' + b, 12, false, w2 - 1.0), hh = n * 0.19 + 0.08;
      marker(s, rx0 + 0.42, ey + 0.15, i + 1, { d: 0.3, pt: 12 });
      fit('edit ' + i, a + ' ' + b, 12, false, w2 - 1.0, hh, 1.1);
      T(s, [{ text: a + ' ', options: { bold: true } }, { text: b, options: { color: MUTED } }], { x: rx0 + 0.75, y: ey, w: w2 - 1.0, h: hh, fontSize: 12, lineSpacingMultiple: 1.05 });
      ey += hh + 0.12;
    }
    if (ey > y + h) WARN.push('edits overflow ' + ey.toFixed(2));
    const by = 6.0;
    card(s, MX, by, CW, 0.85, { fill: GOLD, tr: 88, line: GOLD, ltr: 55, lw: 1, name: 'Confirm band' });
    const pw = grade(s, MX + 0.25, by + 0.28, 'confirm');
    const cf = 'Page 2 lists overstay, fight, fire and identity-spoofing detection as “today’s AI”. Before commitment, R&D confirms which of these run in the current V11 / video-analytics stack at CAG.';
    const cx0 = MX + 0.25 + pw + 0.12, cw0 = RX - 0.25 - cx0;
    fit('confirm band', cf, 13, false, cw0, 0.7, 1.1);
    T(s, cf, { x: cx0, y: by + 0.06, w: cw0, h: 0.72, fontSize: 13, valign: 'middle', lineSpacingMultiple: 1.05 });
  }
  s.addNotes([
    'Now to Friday’s first question: is Weili’s deck aligned and good to commit? Yes, in direction. Its four use cases map one-to-one onto our demo, its five-stage journey matches our six steps, and its human-in-the-loop message is exactly our positioning.',
    'We ask for four edits before it leaves the building. Grade every page. Replace concept art with V11 screens where we have them, or label it as illustration. Rename use case three to assisted incident management. And cover all five strategic areas with a perimeter page, a multi-site page and one privacy line.',
    'One item needs R&D first: page two lists four detections as today’s AI, and we need to confirm which of them run at CAG today.',
  ].join('\n'));

  // 11 ── page by page (native table)
  s = content('WEILI’S DECK  ·  THE EDIT MAP FOR THE TEAM', 'Page by page', SEC.p2);
  {
    const ROWS = [
      ['1 Cover', 'From alerts to AI-orchestrated security operations', 'Pitch deck v2 cover “From alarms to answers”', 'Align one product name: AGIL Secure V11 with AI Co-pilot'],
      ['2 Starting point', 'Today’s AI detects individual events (overstay, fight, fire, spoofing)', 'V11-07, V11-08, V11-04', 'Confirm what is live today; grade'],
      ['3 Strategic shift', 'Correlation, not more alarms (ingest → correlate → interpret → recommend)', 'Deck v2 slide 5 “Six steps”', 'Keep; add “You decide” as an explicit step'],
      ['4 UC1 Co-pilot', 'Forced-door event becomes an evidence-backed incident', 'V11-02, V11-03, V11-10', 'Swap art for screens; grade Concept'],
      ['5 UC2 Intelligent access', 'Timing, location, repeated denial, impossible presence, abnormal sequence', 'V11-04, V11-08', 'Keep; grade; link to area 1 (SSID)'],
      ['6 UC3 Autonomous incident mgmt', 'AI gathers and organises; humans authorise', 'V11-05, V11-06', 'Rename “Assisted”; grade'],
      ['7 UC4 Natural language', 'Four example questions', 'V11-11', 'Keep; note “answers cite sources”'],
      ['8 Recommended direction', 'Five controlled stages; north star', 'Deck v2 roadmap; this deck’s trains', 'Attach the release trains once R&D confirms'],
    ];
    const hdr = ['Weili page', 'Says', 'Our matching material', 'Action'];
    const head = hdr.map(h => ({ text: h.toUpperCase(), options: { bold: true, color: HEX.lav, fill: { color: THEME.colors.dk2 }, fontSize: 12, charSpacing: 1 } }));
    const body = ROWS.map((r, i) => r.map((c, j) => ({ text: c, options: { color: j === 3 ? HEX.white : j === 0 ? HEX.white : HEX.muted, fontSize: 12, bold: j === 0, fill: { color: i % 2 ? '111A2E' : '0B1222' } } })));
    s.addTable([head, ...body], { x: MX, y: 1.75, w: CW, colW: [2.2, 3.9, 2.9, 3.133], rowH: 0.5, valign: 'middle', margin: [3, 6, 3, 6], border: { type: 'solid', pt: 0.5, color: '2A3346' }, fontFace: 'Arial' });
    footnote(s, 'Actions for Weili and Product by 21 Oct 2026; the page-2 confirmation and the page-8 trains wait for R&D.', 6.62);
  }
  s.addNotes([
    'This is the page-by-page map for Weili and the team: what each page says, which of our materials matches it, and the action. Most actions are small: swap an illustration for a screen, add a grade, rename a title.',
    'Page two needs the R&D confirmation first, and page eight should carry the release trains once R&D confirms them.',
  ].join('\n'));

  // 12 ── what is in V11 today, and what the demo adds
  s = content('STRATEGIC AREA 2  ·  TODAY VERSUS THE DEMO', 'What is in V11 today, and what the demo adds', SEC.p2);
  {
    const cw = (CW - 2 * 0.3) / 3, y = 1.8, h = 4.3;
    const TODAY = ['Header: lockdown, site › cluster selector, search, Incident Management', 'Real Time Alerts: counters, tabs, Locate and Escalate on every card', 'Device Status; 2D / 3D toggle; 3D viewer with Locate', 'Active Alarms: event head, camera tiles, Investigation, SOP Flow, Remarks', 'SOP Flow: numbered steps, checkboxes, Critical Action steps', 'Escalate dialog → Incident Management: table, filters, export, Close Incident'];
    const DELTA = [['Co-pilot line on alert cards', 'XS'], ['3D airport model, pins, Locate zoom', 'M'], ['Ask Co-pilot search with answers', 'M'], ['Outline boxes on camera tiles', 'S'], ['Co-pilot entry in Investigation', 'S'], ['Linked alarms in the System entry', 'S'], ['SOP steps pre-filled, auto steps ticked', 'S'], ['Approvals as Critical Action steps', 'S'], ['Escalate dialog pre-filled', 'XS'], ['Co-pilot report draft in Remarks', 'XS'], ['Co-pilot colour token', 'XS']];
    const BEHIND = ['Airport 3D model', 'Recorded demo clips with analytics metadata', 'ACS, AgilFence and LiDAR event feeds (recorded is fine)', 'SOP library', 'Co-pilot service: summary, linked alarms, SOP pre-fill, Q&A'];
    for (const [i, [tag, kind, head]] of [[null, 'today', 'In V11 today, unchanged'], [null, 'concept', 'The demo adds (front end)'], [null, 'confirm', 'Behind the UI, not design work']].entries()) {
      const x = MX + i * (cw + 0.3);
      card(s, x, y, cw, h, { tr: 25, edge: GRADES[kind].hex, name: 'Column ' + kind });
      grade(s, x + 0.22, y + 0.2, kind, kind === 'confirm' ? 'R&D QUESTION' : undefined);
      T(s, head, { x: x + 0.22, y: y + 0.56, w: cw - 0.44, h: 0.32, fontSize: 15, bold: true });
      if (kind === 'today') bullets(s, TODAY, x + 0.18, y + 0.98, cw - 0.36, h - 1.1, { pt: 12, id: 'today col', gap: 5 });
      if (kind === 'concept') {
        for (const [j, [d, sz]] of DELTA.entries()) {
          const yy = y + 0.96 + j * 0.25;
          pill(s, x + 0.22, yy + 0.02, sz, GRADES.concept.hex, HEX.navy, { pt: 12, h: 0.22, padX: 0.16, cs: 0.5 });
          fit('delta ' + d, d, 12, false, cw - 1.0, 0.26);
          T(s, d, { x: x + 0.74, y: yy, w: cw - 0.96, h: 0.26, fontSize: 12, valign: 'middle' });
        }
        T(s, 'XS < 1 day · S 1–3 days · M 1–2 weeks of front-end effort, indicative.', { x: x + 0.22, y: y + h - 0.5, w: cw - 0.44, h: 0.44, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
        fit('delta note', 'XS < 1 day · S 1–3 days · M 1–2 weeks of front-end effort, indicative.', 12, false, cw - 0.44, 0.44, 1.05);
      }
      if (kind === 'confirm') {
        bullets(s, BEHIND, x + 0.18, y + 0.98, cw - 0.36, 2.0, { pt: 12, id: 'behind col', gap: 5 });
        const nt = 'Whether a demo instance with these additions exists is an R&D question. We never state it as done.';
        fit('behind note', nt, 13, true, cw - 0.44, 0.7, 1.1);
        T(s, nt, { x: x + 0.22, y: y + h - 0.9, w: cw - 0.44, h: 0.75, fontSize: 13, bold: true, color: GOLD, lineSpacingMultiple: 1.05 });
      }
    }
    const by = 6.22;
    card(s, MX, by, CW, 0.68, { fill: CARD, tr: 15, line: LAV, ltr: 55, lw: 1, name: '22 Oct plans' });
    label(s, '22 OCT', MX + 0.25, by + 0.21, 0.9, LAV);
    const planA = 'live V11 with these additions and recorded data, if R&D confirms a demo instance.', planB = 'film “From alarms to answers” + click-through of the 12 frames; needs nothing from R&D.';
    const plans = [{ text: 'Plan A  ', options: { bold: true, color: LAV } }, { text: planA, options: { breakLine: true } }, { text: 'Plan B  ', options: { bold: true, color: LAV } }, { text: planB }];
    fit('plans', `Plan A  ${planA}\nPlan B  ${planB}`, 12, false, CW - 1.5, 0.6, 1.1);
    T(s, plans, { x: MX + 1.15, y: by + 0.04, w: CW - 1.4, h: 0.6, fontSize: 12, valign: 'middle', lineSpacingMultiple: 1.05 });
  }
  s.addNotes([
    'Here is the split behind area two. The left column is V11 today, unchanged. The middle column is the eleven front-end additions the demo needs, each reusing an existing V11 part; the sizes are indicative front-end effort. The right column is what sits behind the user interface and is not design work.',
    'For the twenty-second we have two plans. Plan A runs live V11 with these additions and recorded data, if R&D confirms a demo instance exists. Plan B uses the film and a click-through of the twelve frames, and needs nothing from R&D. Both are safe to show.',
  ].join('\n'));

  // 13 ── supporting material already in hand
  s = content('STRATEGIC AREA 2  ·  “ANY OTHER SUPPORTING MATERIAL?”', 'Supporting material already in hand', SEC.p2);
  {
    const lw = 7.6, y0 = 1.8, rh = 0.98;
    const MAT = [
      { id: 'V11-01', t: '12 V11-fit demo frames', d: 'V11-01…12, Figma SVG in the V11 design; use cases for all six capabilities', g: 'concept' },
      { id: 'V11-05', t: 'Film “From alarms to answers”', d: 'The night shift on V11 screens, narrated (2:50); plan B for 22 Oct', g: 'concept', play: true },
      { file: 'viz_cover.png', t: 'Pitch deck v2 (28 slides)', d: 'Live-demo deck with speaker script and presenter appendix', g: 'concept' },
      { id: 'AF-00b', t: 'AgilFence flow, board and film', d: 'AF-00…09 + flow board, film “First touch” (2:27): from a climb on the fence to a closed incident', g: 'concept', play: true },
      { id: 'MS-01', t: 'Six multi-site frames (new)', d: 'MS-01…06: estate overview, site drill-down, baseline, roles, connectors, estate report; flow boards', g: 'concept' },
    ];
    for (const [i, m] of MAT.entries()) {
      const y = y0 + i * rh, tw2 = 1.2;
      card(s, MX, y, lw, rh - 0.1, { tr: 25, edge: false, name: 'Material ' + i });
      const th = m.id ? Math.min(rh - 0.26, tw2 * frame(m.id).h / frame(m.id).w) : rh - 0.3;
      const tw3 = m.id ? th * frame(m.id).w / frame(m.id).h : tw2;
      if (m.id) await thumb(s, m.id, MX + 0.12, y + (rh - 0.1 - th) / 2, Math.min(tw3, 1.5), { h: th });
      else await pic(s, m.file, MX + 0.12, y + (rh - 0.1 - th) / 2, tw2, th, 'Pitch deck cover art');
      if (m.play) await iconDisc(s, 'LuPlay', MX + 0.12 + Math.min(tw3, 1.5) / 2 - 0.2, y + (rh - 0.1) / 2 - 0.2, 0.4, { fill: NAVY, tr: 20, k: 0.5, lw: 1 });
      const tx0 = MX + 1.8;
      // a two-line description lifts the row by 0.04 in so it keeps its padding above the card edge
      const n = fit('mat desc ' + i, m.d, 12, false, lw - 1.95, 0.40, 1.05), ty = y + (n > 1 ? 0.10 : 0.14);
      fit('mat title ' + i, m.t, 15, true, lw - 1.95 - 2.0, 0.3);
      T(s, m.t, { x: tx0, y: ty, w: lw - 1.95 - 2.0, h: 0.3, fontSize: 15, bold: true });
      T(s, m.d, { x: tx0, y: ty + 0.32, w: lw - 1.95, h: 0.40, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
      grade(s, MX + lw - 0.2, ty, m.g, undefined, { right: true });
    }
    const rx0 = MX + lw + 0.3, rw2 = RX - rx0;
    card(s, rx0, y0, rw2, 5 * rh - 0.1, { fill: GOLD, tr: 90, line: GOLD, ltr: 55, lw: 1, name: 'From R&D' });
    grade(s, rx0 + 0.25, y0 + 0.22, 'confirm', 'WHAT WE NEED FROM R&D');
    const NEED = [['AI roadmap by train', 'which Co-pilot features R&D can build for V11.1 and V11.2'], ['Video-analytics catalogue', 'what runs at CAG today: overstay, fight, fire, spoofing'], ['Co-pilot service plan', 'summary, linked alarms, SOP pre-fill, Q&A, on premise'], ['Pilot data access', 'ACS, VMS, AgilFence, LiDAR feeds and SOP library for one terminal']];
    for (const [i, [a, b]] of NEED.entries()) {
      const y = y0 + 0.72 + i * 1.0;
      marker(s, rx0 + 0.42, y + 0.17, i + 1, { d: 0.32, pt: 13 });
      T(s, a, { x: rx0 + 0.75, y: y - 0.02, w: rw2 - 1.0, h: 0.32, fontSize: 15, bold: true });
      fit('need ' + a, b, 12, false, rw2 - 1.0, 0.5, 1.05);
      T(s, b, { x: rx0 + 0.75, y: y + 0.32, w: rw2 - 1.0, h: 0.5, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
    }
    footnote(s, `Items 1, 3 and 4 by ${CONFIRM_BY}, with the train dates. Item 2 by 21 Oct 2026, before Weili’s deck goes to CAG.`, 6.62);
  }
  s.addNotes([
    'We are not starting from zero. We already have twelve V11-fit frames, the film, the pitch deck, the AgilFence flow with its film, and six new multi-site frames in this deliverable. All of it is concept on V11 screens, and labelled as such.',
    'What we still need from R&D is on the right: the AI roadmap by train, the status of the video-analytics catalogue, the plan for the Co-pilot service, and data access for a pilot. We have asked for the video-analytics answer by the twenty-first, before Weili’s deck goes out, and the other three by the thirtieth, together with the train dates.',
  ].join('\n'));

  // 15 ── section: area 4
  pres.addSection({ title: SEC.p4 });
  s = section('STRATEGIC AREA 4', 'AgilFence unified integration', 'Partly in V11 today: the alarm → incident → SOP → report workflow takes any alarm source. The AgilFence module itself is designed and on the roadmap.', SEC.p4, 4);
  s.addNotes([
    'Strategic area four, AgilFence unified integration. The answer is partly. The alarm-to-report workflow is in V11 today and takes any alarm source. The AgilFence-specific module is designed and on the roadmap, on proposed dates.',
    'We start with what CAG runs today and what moves into V11. Then the question row by row, the fence alarm end to end, and the three trains.',
  ].join('\n'));

  // 15 ── today two platforms, target one workflow
  s = content('STRATEGIC AREA 4  ·  WHAT CAG RUNS TODAY, WHAT CHANGES', 'Today two platforms. Target one workflow.', SEC.p4);
  {
    const cw = 3.9, y = 1.8, h = 4.7, mx0 = MX + cw + 0.2, mw = CW - 2 * cw - 0.4, rx0 = RX - cw;
    // left: AgilFence + iPAMS today (fence-sensor content: amber)
    card(s, MX, y, cw, h, { tr: 25, edge: GOLD, name: 'AgilFence today' });
    label(s, 'AGILFENCE + iPAMS TODAY', MX + 0.25, y + 0.2, cw - 0.5, GOLD);
    grade(s, MX + 0.25, y + 0.5, 'today', 'IN SERVICE AT CAG SINCE 2011');
    const LEFT = [['LuRadar', 'Sense', 'Fibre sensors feel a climb, cut or lift'], ['LuCrosshair', 'Pinpoint', 'The segment, to within a few metres'], ['LuVideo', 'Preset', 'iPAMS calls up the camera preset'], ['LuMonitor', 'Own screens', 'iPAMS UI, separate from V11'], ['LuFileText', 'Own reports', 'Fence reports outside V11']];
    for (const [i, [ic, a, b]] of LEFT.entries()) {
      const yy = y + 1.0 + i * 0.7;
      await iconDisc(s, ic, MX + 0.25, yy, 0.46, { k: 0.5, ring: GOLD, hex: HEX.gold, lw: 1 });
      T(s, a, { x: MX + 0.85, y: yy - 0.04, w: cw - 1.1, h: 0.28, fontSize: 15, bold: true });
      fit('left ' + a, b, 12, false, cw - 1.1, 0.28);
      T(s, b, { x: MX + 0.85, y: yy + 0.23, w: cw - 1.1, h: 0.28, fontSize: 12, color: MUTED });
    }
    // right: V11 today
    card(s, rx0, y, cw, h, { tr: 25, edge: GREEN, name: 'V11 today' });
    label(s, 'AGIL SECURE V11 TODAY', rx0 + 0.25, y + 0.2, cw - 0.5, GREEN);
    grade(s, rx0 + 0.25, y + 0.5, 'today', 'ANY ALARM SOURCE');
    const STEPS = [['LuBell', 'Alert card', 'Real Time Alerts, Locate and Escalate'], ['LuLayers', 'Active Alarm', 'Event head, camera tiles, Investigation'], ['LuListChecks', 'SOP Flow', 'Numbered steps, Critical Action steps'], ['LuArrowUpRight', 'Escalate', 'Category, severity, remarks → incident'], ['LuClipboardCheck', 'Incident Management', 'Table, detail pane, Close Incident'], ['LuFileCheck', 'Report', 'Export, Remarks']];
    for (const [i, [ic, a, b]] of STEPS.entries()) {
      const yy = y + 1.0 + i * 0.58;
      if (i) s.addShape(LINE, { x: rx0 + 0.48, y: yy - 0.14, w: 0, h: 0.14, line: { color: GREEN, width: 1, transparency: 40 }, objectName: 'Step link' });
      await iconDisc(s, ic, rx0 + 0.25, yy, 0.46, { k: 0.5, ring: GREEN, hex: HEX.green, lw: 1 });
      T(s, [{ text: a + '  ', options: { bold: true } }, { text: b, options: { color: MUTED, fontSize: 12 } }], { x: rx0 + 0.85, y: yy, w: cw - 1.1, h: 0.46, fontSize: 15, valign: 'middle' });
      fit('step ' + a, a + '  ' + b, 12.5, false, cw - 1.1, 0.46, 1.05);
    }
    // middle: what moves, what stays
    label(s, 'WHAT MOVES INTO V11', mx0, y + 0.2, mw, LAV);
    const MOVES = [['11.1', 'Alarm, segment, camera preset in the V11 workflow; fence alarms in reports'], ['11.2', 'Fence line on the map, nearest cameras, replay, wall, health view, fence reports'], ['11.3', 'Zone and sensitivity configuration, calibration, nuisance analytics']];
    for (const [i, [t, txt]] of MOVES.entries()) {
      const yy = y + 0.52 + i * 1.12;
      card(s, mx0, yy, mw, 1.04, { tr: 15, edge: false, line: LAV, ltr: 65, name: 'Move ' + t });
      s.addImage({ data: await icon('LuArrowRight', HEX.lav), x: mx0 + mw - 0.42, y: yy + 0.38, w: 0.28, h: 0.28, altText: 'Arrow' });
      grade(s, mx0 + 0.18, yy + 0.12, 'roadmap', 'ROADMAP · ' + train(t).name);
      T(s, train(t).ga.toUpperCase(), { x: mx0 + 2.22, y: yy + 0.12, w: mw - 2.6, h: 0.3, fontSize: 12, bold: true, color: GOLD, valign: 'middle' });
      fit('move ' + t, txt, 12, false, mw - 0.7, 0.58, 1.05);
      T(s, txt, { x: mx0 + 0.18, y: yy + 0.44, w: mw - 0.7, h: 0.58, fontSize: 12, lineSpacingMultiple: 1.05 });
    }
    const sy = y + 0.52 + 3 * 1.12;
    card(s, mx0, sy, mw, y + h - sy, { fill: GOLD, tr: 88, line: GOLD, ltr: 60, lw: 1, edge: false, name: 'Stays' });
    label(s, 'WHAT STAYS', mx0 + 0.18, sy + 0.08, mw - 0.36, GOLD);
    const stay = 'Sensing: the AgilFence hardware. Configuration and calibration: iPAMS until V11.3.';
    fit('stays', stay, 12, false, mw - 0.36, y + h - sy - 0.4, 1.05);
    T(s, stay, { x: mx0 + 0.18, y: sy + 0.34, w: mw - 0.36, h: y + h - sy - 0.4, fontSize: 12, lineSpacingMultiple: 1.05 });
    proposalNote(s, 6.64);
  }
  s.addNotes([
    'Today CAG runs two platforms. AgilFence with iPAMS senses the fence, pinpoints the segment and calls up the camera preset, with its own screens and its own reports. V11 runs the alarm-to-incident-to-report workflow. The target is one workflow.',
    'What moves first is the alarm, the segment and the camera preset, into V11 in train eleven point one. The fence on the map, nearest cameras, replay, wall layout and health view follow in eleven point two. Zone and sensitivity configuration, calibration and nuisance analytics stay in iPAMS until eleven point three. All dates are proposals.',
  ].join('\n'));

  // 16 ── is there a ready in-built module? partly
  s = content('STRATEGIC AREA 4  ·  FRIDAY’S QUESTION, ROW BY ROW', 'Is there a ready in-built module? Partly.', SEC.p4);
  {
    const ROWS = [
      ['Fence alarm as a V11 alarm (card, Active Alarm, SOP, Escalate, Incident Management)', ['today', 'generic workflow'], ['concept', 'AgilFence card text, system message'], ['11.1'], 'iPAMS interface V11 can consume (relay / OPC / API)'],
      ['Camera call-up on alarm', ['today', 'camera tiles; iPAMS preset'], ['concept', 'nearest cameras, one-click live, pre-alarm replay'], ['11.1', '11.2'], 'Preset handshake iPAMS ↔ VMS / V11'],
      ['Fence on the map', ['today', '3D viewer + Locate'], ['concept', 'fence line with segments, alarm segment, LiDAR cone'], ['11.2'], 'Airport 3D model availability'],
      ['Command-centre video wall layout', ['none', 'VMS wall today'], ['concept', 'one-click wall layout (AF-06)'], ['11.2'], 'Wall controller integration'],
      ['Fence health, diagnostics, nuisance analytics', ['none', 'in iPAMS'], ['concept', 'dashboard, listed; not yet drawn'], ['11.2', '11.3'], null],
      ['Zone / sensitivity configuration, calibration', ['none', 'in iPAMS'], ['none', 'stays in iPAMS until V11.3'], ['11.3'], null],
      ['Unified reporting', ['today', 'Incident Mgmt export'], ['concept', 'fence alarms in one report; evidence pack (AF-09)'], ['11.1', '11.2'], null],
    ];
    const cols = [2.9, 2.2, 3.1, 1.55, 2.383], xs = []; let cx = MX; for (const w of cols) { xs.push(cx); cx += w; }
    const y0 = 1.78, rh = 0.64;
    label(s, 'CAPABILITY', xs[0], y0, cols[0]);
    grade(s, xs[1], y0 - 0.02, 'today'); grade(s, xs[2], y0 - 0.02, 'concept'); grade(s, xs[3], y0 - 0.02, 'roadmap', 'TRAIN'); grade(s, xs[4], y0 - 0.02, 'confirm');
    for (const [i, [cap, td, cp, trains, cf]] of ROWS.entries()) {
      const y = y0 + 0.42 + i * rh;
      s.addShape(LINE, { x: MX, y: y - 0.05, w: CW, h: 0, line: { color: INK, width: 0.5, transparency: 85 }, objectName: 'Row rule' });
      fit('p4 cap ' + i, cap, 12, true, cols[0] - 0.2, 0.56, 1.05);
      T(s, cap, { x: xs[0], y: y - 0.02, w: cols[0] - 0.2, h: 0.58, fontSize: 12, bold: true, lineSpacingMultiple: 1.0, valign: 'middle' });
      for (const [j, [k, txt]] of [[1, td], [2, cp]]) {
        const pw = grade(s, xs[j], y + 0.12, k, k === 'none' ? 'NO' : 'YES', { soft: k === 'none' });
        fit('p4 cell ' + i + j, txt, 12, false, cols[j] - pw - 0.25, 0.56, 1.05);
        T(s, txt, { x: xs[j] + pw + 0.08, y: y - 0.02, w: cols[j] - pw - 0.25, h: 0.58, fontSize: 12, color: MUTED, valign: 'middle', lineSpacingMultiple: 1.0 });
      }
      const px = xs[3] + trainTags(s, xs[3], y + 0.12, trains);
      if (px > xs[4] - 0.05) WARN.push('p4 train tags overflow ' + i);
      if (cf) { const pw = grade(s, xs[4], y + 0.12, 'confirm', '?'); fit('p4 confirm ' + i, cf, 12, false, cols[4] - pw - 0.1, 0.56, 1.05); T(s, cf, { x: xs[4] + pw + 0.08, y: y - 0.02, w: cols[4] - pw - 0.1, h: 0.58, fontSize: 12, color: MUTED, valign: 'middle', lineSpacingMultiple: 1.0 }); }
      else T(s, '—', { x: xs[4], y: y, w: 0.5, h: 0.54, fontSize: 12, color: MUTED, valign: 'middle' });
    }
    proposalNote(s, 6.62);
  }
  s.addNotes([
    'Friday’s question was: is there a ready in-built module in V11 for AgilFence? Partly. Row by row: the fence alarm as a V11 alarm, yes, through the generic workflow. Camera call-up, yes with camera tiles, while iPAMS keeps the preset. Fence on the map: the 3D viewer and Locate exist, the fence line itself is designed. The video wall, fence health and configuration are not in V11.',
    'The last column lists what Anuar and R&D need to confirm, starting with which iPAMS interface V11 can consume today. The trains are proposed dates.',
  ].join('\n'));

  // 17 ── what CAG will see: the fence alarm, end to end
  s = content('STRATEGIC AREA 4  ·  THE DEMO FOR 22 OCTOBER', 'What CAG will see: the fence alarm, end to end', SEC.p4);
  {
    const bw = 8.0, by = 1.78;
    const bd = await board(s, 'AF-00b', MX, by, bw, '', { alt: 'AgilFence end-to-end flow board: nine V11 screens from the climb on the fence to the closed incident' });
    const cy = bd.y + bd.h + 0.14;
    let px = MX + grade(s, MX, cy, 'today', 'STEP 1 · TODAY') + 0.1;
    px += grade(s, px, cy, 'concept', 'STEPS 2–9 · CONCEPT') + 0.14;
    const cap = 'AF-00b · film \u201CFirst touch\u201D (2:27) · illustrative';
    fit('board caption', cap, 12, false, MX + bw - px, 0.3);
    T(s, cap, { x: px, y: cy, w: MX + bw - px, h: 0.3, fontSize: 12, color: MUTED, valign: 'middle' });
    const kx = MX + bw + 0.3, kw = RX - kx - 0.1;
    // the third key frame is the whole Critical Action card (header, text and both buttons); AF-04 is trimmed to the panel header and the PTZ 7-02 row
    const KEYS = [
      { id: 'AF-02', r: afr('AF-02', 'toast'), t: '02:14:59 · alarm lands in V11', g: ['concept', 'CONCEPT'] },
      { id: 'AF-04', r: [400, 598, 300, 96], t: '02:15:08 · nearest cameras', g: ['concept', 'CONCEPT'] },
      { id: 'AF-07', r: afr('AF-07', 'crit'), t: '02:15:24 · a person approves', g: ['concept', 'CONCEPT'] },
    ];
    let ky = by;
    for (const [i, k] of KEYS.entries()) {
      const kh = kw * k.r[3] / k.r[2];
      s.addShape(RECT, { x: kx - 0.03, y: ky - 0.03, w: kw + 0.06, h: kh + 0.06, fill: { color: NAVY }, line: { color: LAV, width: 1, transparency: 40 }, objectName: 'Key frame border ' + k.id });
      await image(s, k.id, k.r, kx, ky, kw, kh, k.t, 'Key frame ' + k.id);
      marker(s, kx, ky, i + 1, { d: 0.3, pt: 12 });
      const gw = grade(s, kx + kw, ky + kh + 0.08, k.g[0], k.g[1], { right: true });
      fit('key ' + k.id, k.t, 12, false, kw - gw - 0.1, 0.3);
      T(s, k.t, { x: kx, y: ky + kh + 0.08, w: kw - gw - 0.1, h: 0.3, fontSize: 12, color: MUTED, valign: 'middle' });
      ky += kh + 0.5;
    }
    if (ky - 0.2 > 6.95) WARN.push(`key frames end at ${ky.toFixed(2)}`);
    if (cy + 0.3 > 7.0) WARN.push('board too tall');
  }
  s.addNotes([
    'This is what CAG will see on the twenty-second for AgilFence: a flow board with nine steps, from a climb on segment five-fourteen to a closed incident, all on V11 screens. The three key moments are the system message when the fence alarm lands in V11, the Locate view with the nearest cameras, and the SOP step where the operator approves the dispatch.',
    'Step one is AgilFence and iPAMS as they work today. Steps two to nine are concept on V11, labelled as such, and the film walks through them. The SOP Flow panel in the third moment is V11 today; the fence steps inside it are concept.',
  ].join('\n'));

  // 18 ── locate: the fence, the segment, the nearest camera
  await scene({
    section: SEC.p4, noteDx: 2.7, kicker: 'AGILFENCE  ·  02:15:08  ·  LOCATE', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'AF-04 · Locate',
    title: 'Locate: fence, segment,\nnearest camera',
    watch: [['Segment 5-14:', 'alarm pin on the fence line'], ['Nearest cameras:', 'ranked by distance'], ['Open live:', 'one click to the PTZ']],
    ready: [['today', 'Locate, 3D viewer, camera tiles'], ['concept', 'Fence line, LiDAR cone, nearest cameras, live'], ['roadmap', 'V11.2 · Q3 2027 (Sep) · proposed (handshake in V11.1)'], ['confirm', '3D model; iPAMS ↔ VMS preset handshake']],
    visual: async (s, vx) => {
      const dv = await device(s, 'AF-04', vx, DY, DW, 'V11 Locate view for Fence Sector 5: fence line with segments, alarm segment 5-14, LiDAR cone, nearest cameras and the Active Alarm');
      hl(s, dv, afr('AF-04', 'site'), 1, { side: 't', edge: true });
      const ln = await lens(s, dv, 'AF-04', afr('AF-04', 'nearest'), vx + 0.1, 5.05, 2.3, { n: 2, nAt: 'tl', alt: 'Nearest cameras for segment 5-14: PTZ 7-02 on preset with Open live, CAM 7-11 and PTZ 7-03' });
      hl(s, ln, afr('AF-04', 'openLive'), 3, { side: 'r', box: false, p: 0.02 });
    },
    notes: [
      'One frame in detail: Locate. One click flies the map to segment five-fourteen and shows the fence line, the alarm segment, the LiDAR cone and the nearest cameras, with one click to go live. The 3D viewer and Locate exist in V11 today. The fence line, the camera list and one-click live are designed, proposed for eleven point two; the camera preset handshake comes earlier, in eleven point one.',
      'Two facts need R&D: the availability of the airport 3D model, and the preset handshake between iPAMS and the video system.',
    ],
  });

  // 19 ── AgilFence roadmap in V11
  s = content('STRATEGIC AREA 4  ·  ROADMAP', 'AgilFence roadmap in V11', SEC.p4);
  await trainBoard(s, 'p4', { titles: ['Any alarm source', 'The connector', 'AgilFence module', 'iPAMS functions in V11'] });
  s.addNotes([
    'The AgilFence roadmap in V11 in three trains. Eleven point one is the connector: alarm, segment and camera preset flow into the V11 workflow, and fence alarms appear in reports. Eleven point two is the module: fence on the map, nearest cameras, replay, wall layout, health view and fence reports. Eleven point three brings the remaining iPAMS functions into V11: configuration, calibration and nuisance analytics.',
    'The dates are our proposal: March, September, and March again. Peter and Anuar confirm them against the R&D roadmap by the thirtieth of October.',
  ].join('\n'));

  // 20 ── section: area 5
  pres.addSection({ title: SEC.p5 });
  s = section('STRATEGIC AREA 5', 'Multi-site, multi-brand governance', 'Not in V11 today: V11 runs one site with many clusters. The estate layer is designed in six new frames and ships in three trains, on proposed dates.', SEC.p5, 5);
  s.addNotes([
    'Strategic area five, multi-site and multi-brand governance. Not in V11 today. V11 runs one site with many clusters. The estate layer is designed in six new frames in this deliverable and ships in three trains, on proposed dates.',
    'We turn the ask into four jobs, walk through the concept on the new screens, and close with the three trains.',
  ].join('\n'));

  // 21 ── what CAG asked for, in product terms
  s = content('STRATEGIC AREA 5  ·  FOUR JOBS', 'What CAG asked for, in product terms', SEC.p5);
  {
    const cw = (CW - 3 * 0.25) / 4, y = 1.8, h = 4.66;
    const JOBS = [
      ['LuBuilding2', 'Estate overview', 'Every terminal and facility on one screen: health, open alarms, baseline compliance.', ['none', 'Site › cluster selector only; one site per console'], 'MS-01', ['11.1', '11.2']],
      ['LuScale', 'One baseline, local autonomy', 'A common security baseline and SOPs; each site keeps local control with approved overrides.', ['today', 'SOP Flow per site; per-site console'], 'MS-02 · MS-03', ['11.1', '11.2']],
      ['LuPlug', 'Any brand under one roof', 'Any vendor\u2019s cameras, access control, fences and intercoms, onboarded by protocol.', ['today', 'Integrations per site; connector list to confirm'], 'MS-04 · MS-05', ['11.1', '11.2', '11.3']],
      ['LuCode', 'Open API and SDK', 'Partners build on AGIL Secure: API, SDK, certification and a sandbox.', ['none', 'Not in V11; API status to confirm with R&D'], 'MS-05 dialog', ['11.3']],
    ];
    for (const [i, [ic, ttl, asked, [tk, ttxt], fr, trains]] of JOBS.entries()) {
      const x = MX + i * (cw + 0.25), iw = cw - 0.4, ix = x + 0.2;
      card(s, x, y, cw, h, { tr: 25, name: 'Job ' + (i + 1) });
      await iconDisc(s, ic, ix, y + 0.18, 0.50, { k: 0.5 });
      T(s, 'JOB ' + (i + 1), { x: x + cw - 1.3, y: y + 0.28, w: 1.1, h: 0.3, fontSize: 12, bold: true, color: MUTED, charSpacing: 1.5, align: 'right', valign: 'middle' });
      fit('job title ' + i, ttl, 18, true, iw, 0.6, 1.0);
      T(s, ttl, { x: ix, y: y + 0.78, w: iw, h: 0.6, fontSize: 18, bold: true, lineSpacingMultiple: 1.0 });
      label(s, 'CAG ASKED FOR', ix, y + 1.4, iw);
      fit('job asked ' + i, asked, 12, false, iw, 0.62, 1.1);
      T(s, asked, { x: ix, y: y + 1.64, w: iw, h: 0.64, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
      s.addShape(LINE, { x: ix, y: y + 2.36, w: iw, h: 0, line: { color: INK, width: 0.75, transparency: 85 }, objectName: 'Divider' });
      label(s, 'V11 TODAY', ix, y + 2.46, iw);
      grade(s, ix, y + 2.72, tk, tk === 'none' ? 'NOT IN V11' : 'PARTLY', { soft: tk === 'none' });
      fit('job today ' + i, ttxt, 12, false, iw, 0.42, 1.05);
      T(s, ttxt, { x: ix, y: y + 3.06, w: iw, h: 0.44, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.05 });
      label(s, 'CONCEPT  ·  TRAIN', ix, y + 3.58, iw);
      const pw = grade(s, ix, y + 3.84, 'concept', fr);
      if (pw > iw) WARN.push('job concept tag overflow ' + i);
      const px = ix + trainTags(s, ix, y + 4.2, trains);
      if (px > x + cw - 0.1) WARN.push('job tags overflow ' + i);
    }
    proposalNote(s);
  }
  s.addNotes([
    'In product terms CAG asked for four jobs. An estate overview of every site. One security baseline with local autonomy. Any brand under one roof. And an open API and SDK.',
    'V11 today runs one site with many clusters, has site-level roles and integrations per site; the exact connector list is one of the facts we need from R&D. For each job we now have a designed concept and a proposed train.',
  ].join('\n'));

  // 22 ── the concept: one estate, every site
  await scene({
    section: SEC.p5, kicker: 'MULTI-SITE  ·  ESTATE OVERVIEW', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'MS-01 · illustrative',
    title: 'The concept:\none estate, every site',
    watch: [['Location:', '“CAG Estate › All sites”'], ['Sites panel:', 'devices, alarms, baseline'], ['Alerts:', 'every site, one list']],
    ready: [['none', 'Site › cluster selector only; no estate module'], ['concept', 'Estate selector, estate map, Sites panel, estate report'], ['roadmap', 'Read-only: V11.1 · Q1 2027 (Mar) · full: V11.2 · Q3 2027 (Sep) · proposed']],
    visual: async (s, vx) => {
      const dv = await device(s, 'MS-01', vx, DY, DW, 'V11 console at estate level: location CAG Estate, Real Time Alerts across sites, estate map with five sites, Sites panel');
      hl(s, dv, msr('MS-01', 'location'), 1, { side: 't', edge: true });
      await lens(s, dv, 'MS-01', msr('MS-01', 'siteRowSeletar'), vx + 0.1, 5.0, 4.4, { n: 2, nAt: 'tl', alt: 'Sites panel row for Seletar Airport: devices online, open alarms, baseline v3 with an approved override, local autonomous mode' });
      hl(s, dv, msr('MS-01', 'cardSeletar'), 3, { side: 'l', edge: true });
    },
    notes: [
      'The estate overview. The location selector now goes one level up, from site and cluster to the whole estate. Real Time Alerts span all sites, the map shows five sites with their status, and the Sites panel lists devices, open alarms, baseline compliance and mode for each one. The estate is illustrative; the sites and figures are not real CAG data.',
      'A read-only estate view is proposed for eleven point one, the full version for eleven point two.',
    ],
  });

  // 23 ── local autonomy under one baseline
  await scene({
    side: 'left', section: SEC.p5, kicker: 'MULTI-SITE  ·  02:20  ·  SELETAR, LOCAL', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'MS-02 + MS-03',
    title: 'Local autonomy\nunder one baseline',
    watch: [['Mode chip:', 'local autonomous'], ['SOP:', 'baseline locked + 1 local step']],
    ready: [['today', 'Per-site console and SOP Flow'], ['concept', 'Autonomy chip, locked baseline, local step, approvals'], ['roadmap', 'MS-02: V11.1 · Q1 2027 (Mar) · MS-03: V11.2 · Q3 2027 (Sep) · proposed']],
    extra: { id: 'MS-03', r: msr('MS-03', 'overrideRequest'), n: 3, caption: 'MS-03: a person approves or returns the override request.', alt: 'Estate Governance: a pending override request with Approve and Return buttons' },
    visual: async (s, vx) => {
      const dv = await device(s, 'MS-02', vx, DY, DW, 'V11 console for Seletar Airport in local autonomous mode: fence alarm on Sector 2, SOP Flow with locked estate baseline steps and one approved local step');
      hl(s, dv, msr('MS-02', 'autonomyChip'), 1, { side: 't', edge: true });
      const st = msr('MS-02', 'sopBaselineStep'), lo = msr('MS-02', 'sopLocalStep');
      await lens(s, dv, 'MS-02', [st[0], st[1], st[2], lo[1] + lo[3] - st[1]], vx + 0.1, 4.05, 3.0, { n: 2, nAt: 'tl', alt: 'SOP Flow: estate baseline steps with lock glyphs and the local step Notify Seletar tower, approved by Grace T.' });
    },
    notes: [
      'Local autonomy under one baseline. Seletar handles its own fence alarm at twenty past two in the morning while the Central SOC watches. The SOP is the estate baseline, locked, plus one local step, notify the Seletar tower, approved by the head of security. In the governance page an override request from another site waits for a person to approve or return it.',
      'Per-site operation exists in V11 today. The baseline with overrides and approvals is designed, proposed for eleven point two.',
    ],
  });

  // 24 ── any brand, one governance
  await scene({
    section: SEC.p5, kicker: 'MULTI-SITE  ·  CONNECTORS AND ROLES', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'MS-05 + MS-04',
    title: 'Any brand,\none governance',
    watch: [['Catalogue:', 'site, vendor, protocol, status'], ['Onboarding:', 'certification checks first']],
    ready: [['today', 'Integrations and roles per site'], ['concept', 'Connector catalogue, onboarding, role matrix'], ['roadmap', 'MS-05: V11.2 · Q3 2027 (Sep) · MS-04: V11.1 · Q1 2027 (Mar) · proposed']],
    // the lens ends on cell boundaries (header + three roles, Role + three sites) and starts 40 px into the page gutter so the marker sits off the Role header
    extra: { id: 'MS-04', r: (() => { const m = msr('MS-04', 'matrix'); return [m[0] - 40, m[1], 596 + 40, 228]; })(), n: 3, caption: 'MS-04, roles × sites: local guards see only their site; the estate edits only the baseline.', alt: 'Role by site matrix: estate admin, Central SOC operator, site security manager, auditor, integrator' },
    visual: async (s, vx) => {
      const dv = await device(s, 'MS-05', vx, DY, DW, 'Estate Governance, Systems and connectors: systems by site, vendor and protocol with status, and the Add third-party system dialog');
      hl(s, dv, msr('MS-05', 'onboardingRows'), 1, { side: 'l', edge: true });
      // marker 2 = the "Run certification checks" block (header + five rows); ms-anchors.json may carry it as certChecks, else the measured rect
      hl(s, dv, (MSA['MS-05'] || {}).certChecks || [906, 508, 608, 200], 2, { side: 'r', edge: true });
    },
    notes: [
      'Any brand under one governance. The connector page lists every system by site, vendor and protocol, with its certification status; third-party systems appear as vendor A to E with their protocol, never as named brands. Adding a system is a guided dialog with certification checks. The roles page shows who can do what at which site: local guards see only their site, the estate sees everything and edits only the baseline.',
      'Integrations and site roles exist per site in V11 today. Roles per site are proposed for eleven point one, the catalogue for eleven point two, certification and the partner sandbox for eleven point three.',
    ],
  });

  // 25 ── one report for the estate
  await scene({
    side: 'left', section: SEC.p5, kicker: 'MULTI-SITE  ·  ESTATE REPORT', grade: ['concept', 'CONCEPT ON V11 SCREENS'], frame: 'MS-06 · illustrative',
    title: 'One report\nfor the estate',
    watch: [['Incidents:', 'by site and by severity'],['Fence coverage:', 'km, segments in alarm'], ['Export:', 'one estate report']],
    ready: [['today', 'Per-site export in Incident Management'], ['concept', 'Estate report: incidents, alarms, compliance, health, fence'], ['roadmap', '11.2']],
    visual: async (s, vx) => {
      const dv = await device(s, 'MS-06', vx, DY, DW, 'Estate Governance, Estate report: tiles for open incidents by site, alarms by source system, baseline compliance, device health and AgilFence coverage');
      hl(s, dv, msr('MS-06', 'tileIncidents'), 1, { side: 'l', edge: true });
      hl(s, dv, msr('MS-06', 'tileFence'), 2, { side: 'r', edge: true });
      hl(s, dv, msr('MS-06', 'exportButton'), 3, { side: 't', edge: true });
      T(s, 'All sites, names and figures are illustrative. Charts show counts only.', { x: vx, y: dv.y + dv.h + 0.3, w: DW, h: 0.3, fontSize: 12, color: MUTED });
    },
    notes: [
      'One report for the estate: open incidents by site, alarms by source system, baseline compliance, device health and AgilFence coverage, with an export button. All figures are illustrative.',
      'Per-site export exists today; the estate report is proposed for eleven point two.',
    ],
  });

  // 26 ── multi-site roadmap in V11
  s = content('STRATEGIC AREA 5  ·  ROADMAP', 'Multi-site roadmap in V11', SEC.p5);
  await trainBoard(s, 'p5', { titles: ['One site, many clusters', 'Foundation', 'Governance', 'Open platform'] });
  s.addNotes([
    'The multi-site roadmap in three trains. Eleven point one is the foundation: a read-only estate view, a site switcher and per-site roles. Eleven point two is governance: the security baseline with local overrides and approvals, the estate dashboard, estate reporting and the connector catalogue. Eleven point three is the open platform: public API and SDK, connector certification and a partner sandbox.',
    'Same rule: proposed dates, confirmed with R&D by the thirtieth of October.',
  ].join('\n'));

  // 27 ── one roadmap, three strategic areas
  pres.addSection({ title: SEC.close });
  s = content('ONE ROADMAP  ·  Q4 2026 → Q1 2028', 'One roadmap, three strategic areas', SEC.close);
  full(s, 'viz_timeline.png');
  {
    const colW = (CW - 3 * 0.2) / 4, ly = 2.2, colX = i => MX + i * (colW + 0.2);
    const HEAD = [['Q4 2026', 'NOW', null], ...TRAINS.filter(t => t.ga).map(t => [t.ga.split(' (')[0], t.name, t.ga])];
    for (const [i, [q, name, g]] of HEAD.entries()) {
      const x = colX(i), col = i ? BLUE : GREEN;
      s.addShape(OVAL, { x: x + 0.1, y: ly - 0.2, w: 0.4, h: 0.4, fill: { color: col, transparency: 70 }, line: { type: 'none' }, objectName: 'Milestone halo ' + name });
      s.addShape(OVAL, { x: x + 0.17, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col }, line: { color: INK, width: 1.5 }, objectName: 'Milestone ' + name });
      T(s, [{ text: name + '  ', options: { bold: true, color: col } }, { text: g || q, options: { color: INK } }], { x: x + 0.1, y: ly - 0.62, w: colW - 0.1, h: 0.32, fontSize: 15, valign: 'middle' });
      // one line under the milestone, on a navy plate so the timeline art (dot cloud, NOW rings) stays behind it
      const lab = g ? PROPOSED.toUpperCase() : '22 OCT DEMO · 30 OCT R&D', lw2 = tw(lab, 12, true, 0) + 0.1;
      if (x + lw2 > x + colW) WARN.push('roadmap label wider than its column: ' + lab);
      s.addText(lab, { shape: RR, x: x + 0.02, y: ly + 0.2, w: lw2, h: 0.24, rectRadius: 0.06, fill: { color: NAVY, transparency: 35 }, line: { type: 'none' }, color: g ? GOLD : GREEN, fontSize: 12, bold: true, charSpacing: 0, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Label ' + lab });
    }
    // lanes
    const LANES = [['2', 'AI ISMS', 'p2'], ['4', 'AgilFence', 'p4'], ['5', 'Multi-site', 'p5']];
    const ly0 = 2.66, lh = 1.02;
    for (const [j, [n, nm, key]] of LANES.entries()) {
      const y = ly0 + j * (lh + 0.1);
      for (const [i, t] of TRAINS.entries()) {
        const x = colX(i);
        card(s, x, y, colW, lh, { tr: i ? 30 : 20, edge: i === 0 ? GREEN : false, line: i ? INK : GREEN, ltr: i ? 82 : 55, name: `Lane ${n} ${t.name}` });
        if (i === 0) { label(s, 'AREA ' + n + '  ·  ' + nm.toUpperCase(), x + 0.18, y + 0.1, colW - 0.3, LAV); }
        const txt = t.sum[key];
        fit(`lane ${n} ${t.name}`, txt, 12, false, colW - 0.36, i ? lh - 0.2 : lh - 0.46, 1.05);
        T(s, txt, { x: x + 0.18, y: y + (i ? 0.1 : 0.38), w: colW - 0.36, h: i ? lh - 0.2 : lh - 0.46, fontSize: 12, color: i ? INK : MUTED, lineSpacingMultiple: 1.05 });
      }
    }
    // the near-term calendar in the NOW column header band, and the pilot bar across V11.1–V11.2
    const py = ly0 + 3 * (lh + 0.1) + 0.02;
    card(s, colX(1), py, 3 * colW + 0.4, 0.44, { fill: LAV, tr: 84, line: LAV, ltr: 40, lw: 1, edge: false, name: 'Pilot bar' });
    const pt = `CAG PILOT  ${PILOT.scope} · start ${PILOT.start} · ${PROPOSED}`;
    fit('pilot bar', pt, 12, false, 3 * colW, 0.3);
    T(s, [{ text: 'CAG PILOT  ', options: { bold: true, color: LAV } }, { text: `${PILOT.scope} · start ${PILOT.start} · ${PROPOSED}` }], { x: colX(1) + 0.2, y: py, w: 3 * colW, h: 0.44, fontSize: 12, valign: 'middle' });
    const nt = '22 Oct demo · 30 Oct R&D confirmation · Q4 workshops';
    fit('calendar', nt, 12, false, colW - 0.1, 0.44, 1.05);
    T(s, nt, { x: colX(0), y: py, w: colW - 0.1, h: 0.44, fontSize: 12, color: MUTED, valign: 'middle', lineSpacingMultiple: 1.0 });
    if (py + 0.44 > 6.5) WARN.push(`pilot bar ends at ${(py + 0.44).toFixed(2)}`);
    proposalNote(s);
  }
  s.addNotes([
    'All three areas on one timeline. In the next two weeks: the sales demo on the twenty-second and the roadmap confirmation on the thirtieth, then workshops in the fourth quarter. Eleven point one in March, eleven point two in September, eleven point three in March of twenty twenty-eight, all proposed. The pilot would start with eleven point one in one terminal.',
    'Each lane shows what the train brings to that area. One roadmap, so the three answers stay consistent in front of CAG.',
  ].join('\n'));

  // 28 ── what we commit to CAG, and when
  s = content('THE COMMITMENT LIST', 'What we commit to CAG, and when', SEC.close);
  {
    const LAD = [
      ['today', 'COMMIT NOW', '22 Oct', 'Everything in V11 today: the alarm → incident → SOP → report workflow for any alarm source, the per-site console, Incident Management and its reports.'],
      ['concept', 'SHOW AS CONCEPT, LABELLED', '22 Oct · Q4 2026', 'The 12 V11 frames and the film, the AgilFence flow board and film, the six multi-site frames and boards. Simulated data, said so on every page.'],
      ['roadmap', 'PROMISE AFTER R&D CONFIRMS', `after ${CONFIRM_BY}`, `The train dates (${TRAINS.filter(t => t.ga).map(t => `${t.name} ${t.ga}`).join(', ')}) and the pilot start (${PILOT.start}). Until then: ${PROPOSED}.`],
      [null, 'DO NOT PROMISE', 'ever', 'Automatic closure of incidents or any autonomous consequential action. Facial recognition. Performance numbers: accuracy, response times, savings. Any date before R&D confirms.'],
    ];
    const y0 = 1.85, rh = 1.02;
    // one body column for all rows, placed after the widest pill (grade() pads 0.3, pill() 0.32)
    const pwMax = Math.max(...LAD.map(([k, lab]) => tw(lab, 12, true, 1) + (k ? 0.3 : 0.32))), tx0 = MX + 0.3 + pwMax + 0.2, tw0 = RX - 0.3 - tx0;
    for (const [i, [k, lab, when, txt]] of LAD.entries()) {
      const y = y0 + i * (rh + 0.12), col = k ? GRADES[k].hex : HEX.red;
      card(s, MX, y, CW, rh, { tr: 25, edge: col, name: 'Ladder ' + lab });
      s.addShape(RECT, { x: MX, y: y + 0.12, w: 0.06, h: rh - 0.24, fill: { color: col }, line: { type: 'none' }, objectName: 'Ladder rule' });
      if (k) grade(s, MX + 0.3, y + 0.2, k, lab); else pill(s, MX + 0.3, y + 0.2, lab, HEX.red, HEX.white, { pt: 12 });
      T(s, when.toUpperCase(), { x: MX + 0.3, y: y + 0.58, w: 3.0, h: 0.28, fontSize: 13, bold: true, color: MUTED, charSpacing: 1, valign: 'middle' });
      fit('ladder ' + lab, txt, 15, false, tw0, rh - 0.2, 1.1);
      T(s, txt, { x: tx0, y: y, w: tw0, h: rh, fontSize: 15, valign: 'middle', lineSpacingMultiple: 1.05 });
    }
  }
  s.addNotes([
    'What we commit to CAG, and when. Now: everything in V11 today, the workflow, the per-site console and Incident Management reports. As concept, clearly labelled: the twelve V11 frames and film, the AgilFence flow and film, and the six multi-site frames. After R&D confirms: the train dates and the pilot start.',
    'And what we do not promise: automatic closure of incidents, facial recognition, performance numbers, and any date before R&D confirms.',
  ].join('\n'));

  // 29 ── risks, dependencies, owners (native table)
  s = content('WHAT COULD GO WRONG, AND WHO HOLDS IT', 'Risks, dependencies, owners', SEC.close);
  {
    const ROWS = [
      ['R&D roadmap alignment', 'If the trains move, every date we show CAG moves with them; nothing is promised before confirmation.', 'Peter, with Anuar', CONFIRM_BY],
      ['iPAMS interface (relay contact, OPC data link or API)', 'Decides how soon fence alarms flow into V11 and what the V11.1 connector can carry.', 'Anuar', CONFIRM_BY],
      ['Demo instance for plan A', 'Live V11 with the demo additions and recorded data; without it we run plan B (film + frames).', 'R&D', '21 Oct 2026'],
      ['Pilot data access and privacy policy', 'ACS, VMS, AgilFence and LiDAR feeds for one terminal; watchlist and privacy policy agreed with CAG.', 'CAG with Sales', 'Q4 2026'],
      ['Edits to Weili’s deck', 'The four edits and the page-2 confirmation before the deck goes to CAG.', 'Weili with Product', '21 Oct 2026'],
    ];
    const hdr = ['Risk / dependency', 'Why it matters', 'Owner', 'By when'];
    const head = hdr.map(h => ({ text: h.toUpperCase(), options: { bold: true, color: HEX.lav, fill: { color: THEME.colors.dk2 }, fontSize: 12, charSpacing: 1 } }));
    const body = ROWS.map((r, i) => r.map((c, j) => ({ text: c, options: { color: j === 1 ? HEX.muted : HEX.white, fontSize: 13, bold: j === 0 || j === 3, fill: { color: i % 2 ? '111A2E' : '0B1222' } } })));
    s.addTable([head, ...body], { x: MX, y: 1.8, w: CW, colW: [3.1, 5.3, 2.1, 1.633], rowH: 0.74, valign: 'middle', margin: [3, 8, 3, 8], border: { type: 'solid', pt: 0.5, color: '2A3346' }, fontFace: 'Arial' });
    footnote(s, `Dates in this table are working dates for the team; release-train dates stay ${PROPOSED}.`, 6.62);
  }
  s.addNotes([
    'Five dependencies, each with an owner and a date. Roadmap alignment with Peter by the thirtieth. The iPAMS interface with Anuar. A demo instance for plan A from R&D before the twenty-second. Pilot data access and the privacy policy with CAG and Sales. And the edits to Weili’s deck with Weili and Product by the twenty-first.',
    'None of these blocks the twenty-second. Plan B needs nothing from R&D, and every concept we show is labelled.',
  ].join('\n'));

  // 30 ── decisions needed today
  s = content('FOUR DECISIONS', 'Decisions needed today', SEC.close);
  {
    const DEC = [
      ['Approve the commitment list', 'for 22 Oct and Q4 2026: commit what is in V11 today, show concepts labelled, promise dates only after R&D confirms. Owner: Product.'],
      ['Approve the four edits to Weili’s deck', 'grade every page, V11 screens instead of concept art, “Assisted” instead of “Autonomous”, all five strategic areas plus one privacy line. Weili with Product, by 21 Oct 2026.'],
      [`Mandate Product and R&D to lock the train dates by ${CONFIRM_BY}`, 'V11.1, V11.2 and V11.3 confirmed against the R&D roadmap before any date reaches CAG. Peter, with Anuar.'],
      ['Name the CAG design partner for multi-site governance', 'one terminal or facility that shapes the estate concept with us, and sets the pilot scope. With CAG and Sales, Q4 2026.'],
    ];
    const w2 = (CW - 0.3) / 2, h = 2.25;
    for (const [i, [hd, tx]] of DEC.entries()) {
      const x = MX + (i % 2) * (w2 + 0.3), y = 1.85 + Math.floor(i / 2) * (h + 0.25);
      card(s, x, y, w2, h, { tr: 25, name: 'Decision ' + (i + 1) });
      T(s, '0' + (i + 1), { x: x + 0.3, y: y + 0.2, w: 1.0, h: 0.6, fontSize: 36, bold: true, color: LAV, charSpacing: -1 });
      // the body follows the measured heading height, so a one-line and a two-line heading leave the same gap
      const n = fit('decision ' + i, hd, 19, true, w2 - 1.6, 0.9, 1.0), ty = y + 0.24 + n * 0.3 + 0.16;
      T(s, hd, { x: x + 1.3, y: y + 0.24, w: w2 - 1.6, h: n * 0.3 + 0.04, fontSize: 19, bold: true, lineSpacingMultiple: 1.0 });
      fit('decision text ' + i, tx, 14, false, w2 - 1.6, 0.9, 1.1);
      T(s, tx, { x: x + 1.3, y: ty, w: w2 - 1.6, h: 0.95, fontSize: 14, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }
  s.addNotes([
    'Four decisions today. Approve the commitment list for the twenty-second and the fourth quarter. Approve the four edits to Weili’s deck. Mandate Product and R&D to lock the train dates by the thirtieth. And name the CAG design partner for multi-site governance, which sets the pilot scope.',
    'The first three protect what we say on the twenty-second; the fourth starts the multi-site work with a real site behind it.',
  ].join('\n'));

  // 31 ── close
  s = pres.addSlide({ masterName: 'CLOSE', sectionTitle: SEC.close });
  s.addText('THANK YOU', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText([{ text: 'Commit what we can show.', options: { breakLine: true } }, { text: 'Show what we will build.', options: { color: LAV } }], { placeholder: 'title', charSpacing: -1 });
  fit('close title', 'Commit what we can show.\nShow what we will build.', 52, true, 11.5, 1.65, 0.92);
  const closeBody = `Next step: 22 Oct, show what is in V11 today and the labelled concepts. ${CONFIRM_BY}, R&D confirms the train dates; only then do dates go to CAG.`;
  fit('close body', closeBody, TS.lead, false, 10, 0.68);
  s.addText([{ text: closeBody, options: { breakLine: true } }, { text: 'Every date in this deck is a proposal until then.', options: { fontSize: 16 } }], { placeholder: 'body' });
  s.addNotes([
    'Commit what we can show. Show what we will build. Thank you.',
    'The next steps: on the twenty-second we show what is in V11 today and the labelled concepts. By the thirtieth of October R&D confirms the train dates, and only then do dates go to CAG.',
  ].join('\n'));

  // A1–A3 ── appendix (left out with DECK=client)
  if (CLIENT) return write();
  pres.addSection({ title: SEC.appx });
  const tableOpts = (colW, rowH, extra = {}) => Object.assign({ x: MX, y: 1.7, w: CW, colW, rowH, valign: 'middle', margin: [2, 6, 2, 6], border: { type: 'solid', pt: 0.5, color: '2A3346' }, fontFace: 'Arial' }, extra);
  const thead = hdr => hdr.map(h => ({ text: h.toUpperCase(), options: { bold: true, color: HEX.lav, fill: { color: THEME.colors.dk2 }, fontSize: 12, charSpacing: 1 } }));
  const tbody = (rows, boldCols = [0], pt = 12) => rows.map((r, i) => r.map((c, j) => ({ text: c, options: { color: boldCols.includes(j) ? HEX.white : HEX.muted, fontSize: pt, bold: boldCols.includes(j), fill: { color: i % 2 ? '111A2E' : '0B1222' } } })));

  s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
  s.addText('APPENDIX A1  ·  FOR PETER AND ANUAR', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('R&D confirmation checklist', { placeholder: 'title' });
  {
    const ROWS = [
      ['Demo instance with the 11 front-end additions and recorded data (plan A for 22 Oct)', '2', 'R&D', '21 Oct 2026'],
      ['Video analytics live at CAG today: overstay, fight, fire, identity spoofing (Weili page 2)', '2', 'R&D', '21 Oct 2026'],
      ['AI roadmap by train: Co-pilot features for V11.1 and V11.2; Co-pilot service plan (on premise)', '2', 'Peter', CONFIRM_BY],
      ['Which iPAMS interface V11 can consume today (relay contact, OPC data link or API)', '4', 'Anuar', CONFIRM_BY],
      ['Preset handshake between iPAMS and VMS / V11', '4', 'Anuar', CONFIRM_BY],
      ['Airport 3D model availability for the map and Locate', '2 · 4', 'R&D', CONFIRM_BY],
      ['Wall controller integration for the one-click wall layout', '4', 'R&D', CONFIRM_BY],
      ['Edge / WAN behaviour of V11 today (site autonomy when the link drops)', '5', 'Peter', CONFIRM_BY],
      ['SOP library data model (estate baseline, local overrides)', '5', 'R&D', CONFIRM_BY],
      ['Current role model: scope of site-level roles', '5', 'Peter', CONFIRM_BY],
      ['Connector list V11 ships today (ONVIF cameras, OSDP access readers, AgilFence, LiDAR, intercom, others)', '5', 'Anuar', CONFIRM_BY],
      ['Open API status today', '5', 'Peter', CONFIRM_BY],
      ['Release train dates V11.1 / V11.2 / V11.3 against the R&D roadmap', '2 · 4 · 5', 'Peter, Anuar', CONFIRM_BY],
    ];
    s.addTable([thead(['Fact to confirm', 'Area', 'Owner', 'By when']), ...tbody(ROWS, [0, 3])], tableOpts([7.4, 1.0, 1.9, 1.833], 0.34));
    footnote(s, 'Every amber tag in the deck points to one of these rows.', 6.62);
  }
  s.addNotes([
    'Reference for the team: every fact Product cannot verify alone, with its owner and date.',
    'Two rows are due on the twenty-first, before Weili’s deck and the demo; the rest by the thirtieth, together with the train dates.',
  ].join('\n'));

  s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
  s.addText('APPENDIX A2  ·  THE FIGMA PACKAGE', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Figma frame index', { placeholder: 'title' });
  {
    const P2 = [['V11-01', 'Home · Real Time Alerts'], ['V11-02', 'Tailgating · Investigation'], ['V11-03', 'Tailgating · SOP Flow, door control'], ['V11-04', 'Identity spoofing · Investigation'], ['V11-05', 'Unattended bag · SOP Flow'], ['V11-06', 'Watchlist, loitering · SOP verify'], ['V11-07', 'Fight detection · Investigation'], ['V11-08', 'Overstay · Investigation'], ['V11-09', 'AgilFence + LiDAR · Investigation'], ['V11-10', 'Escalate Event · Co-pilot pre-fill'], ['V11-11', 'Search · Ask Co-pilot'], ['V11-12', 'Incident Management · report'], ['P2 board', 'Point 2 end-to-end flow board']];
    const P4 = [['AF-00', 'Cover'], ['AF-00b', 'End-to-end flow board'], ['AF-01', 'Perimeter triggered'], ['AF-02', 'System message and alarm'], ['AF-03', 'Alarm in the incident list'], ['AF-04', 'Locate: nearest camera'], ['AF-05', 'PTZ films the area'], ['AF-06', 'Command-centre video wall'], ['AF-07', 'Operator runs the SOP'], ['AF-08', 'Patrol on scene'], ['AF-09', 'Close and report']];
    const P5 = [['MS-01', 'Estate overview'], ['MS-02', 'Site drill-down · Seletar'], ['MS-03', 'Governance · Security baseline'], ['MS-04', 'Governance · Roles and access'], ['MS-05', 'Governance · Systems and connectors'], ['MS-06', 'Governance · Estate report'], ['P5 board', 'Point 5 end-to-end flow board'], ['Master board', 'Three lanes, one per area, with legend']];
    const tw3 = (CW - 2 * 0.2) / 3;
    for (const [i, [title, rows]] of [['Area 2 · V11 frames (1400 / 1600 wide)', P2], ['Area 4 · AgilFence (1400–1920 wide)', P4], ['Area 5 · multi-site (1400 / 1600)', P5]].entries()) {
      const x = MX + i * (tw3 + 0.2);
      fit('a2 title ' + i, title, 12, true, tw3, 0.3);
      T(s, title.toUpperCase(), { x, y: 1.7, w: tw3, h: 0.3, fontSize: 12, bold: true, color: LAV, charSpacing: 0.5, valign: 'middle' });
      s.addTable([thead(['ID', 'Frame']), ...tbody(rows)], tableOpts([1.05, tw3 - 1.05], 0.3, { x, y: 2.05, w: tw3 }));
    }
    footnote(s, 'Plus V11-00 (delta map) and V11-00b (click paths). All frames are concept on V11 screens with illustrative data.\nPackaged as CAG_Strategic_Areas_2-4-5_Figma_SVG.zip with the master board PNG and a PDF.', 6.5, CW, 0.44);
  }
  s.addNotes([
    'Reference: every frame in the Figma package, grouped by strategic area.',
    'The master board is the one file to open first; the frames follow at full size in the SVG package and the PDF.',
  ].join('\n'));

  s = pres.addSlide({ masterName: 'APPENDIX', sectionTitle: SEC.appx });
  s.addText('APPENDIX A3  ·  22 OCTOBER', { placeholder: 'kicker', charSpacing: 1.5 });
  s.addText('Demo click paths (22 Oct)', { placeholder: 'title' });
  {
    const ROWS = [
      // film timecodes from cag-demo-video/SCRIPT.md (narration table; the film runs 2:50)
      ['Alarm correlation · D-214', 'Real Time Alerts → Staff Door D-214 → Investigation → linked alarms “+2 more”', 'Film 0:46–1:00 (D-214); frames V11-01, V11-02'],
      ['Co-pilot and assisted response', 'SOP Flow → step 2 Lock (Critical Action) → Escalate → pre-filled dialog → Create Incident', 'Film 0:29–0:38 (Co-pilot) and 0:53–1:00 (lock, escalation); frames V11-03, V11-10'],
      ['Assisted incident automation · B12, Row K', 'Gate B12 → SOP Flow → steps 1–4 done → Approve step 5; Row K → verify first', 'Film 1:10–1:16 (B12) and 1:46–1:56 (Row K); frames V11-05, V11-06'],
      ['Access intelligence · C2, B2', 'T1 Door C2 → Investigation → legacy SSID row; Baggage Hall B2 → rules', 'Film 1:27–1:36 (C2) and 1:37–1:46 (B2); frames V11-04, V11-08'],
      ['Natural language · Ask Co-pilot', 'Search bar → type the question → answer and sources', 'Film 1:56–2:04; frame V11-11'],
      ['Automated reporting · TGT-214', 'Incident Management → TGT-214 → report draft → Close Incident', 'Film 2:05–2:10; frame V11-12'],
      ['AgilFence (area 4)', 'Not live on 22 Oct: flow board AF-00b and film “First touch”', 'Board + film; frames AF-01…09'],
    ];
    s.addTable([thead(['Use case', 'Plan A · live V11 with the demo additions (if R&D confirms)', 'Plan B · film + frames (needs nothing from R&D)']), ...tbody(ROWS, [0])], tableOpts([3.0, 5.4, 3.733], 0.58));
    footnote(s, 'Plan A needs the demo instance confirmed by R&D on 21 Oct. Plan B is ready today.', 6.62);
  }
  s.addNotes([
    'Reference for the demo team: plan A clicks and plan B material per use case.',
    'Plan A waits for the demo instance on the twenty-first; plan B, the film with its timecodes and the frames, is ready today.',
  ].join('\n'));

  return write();
}

async function write() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await finalize(OUT);
  if (WARN.length) console.log('FIT WARNINGS:\n  ' + WARN.join('\n  ')); else console.log('FIT WARNINGS: none');
  if (MISSING.length) console.log('WARN draft placeholders (missing images):\n  ' + [...new Set(MISSING)].join('\n  '));
  if (ESTIMATED.length) console.log('WARN estimates:\n  ' + ESTIMATED.join('\n  '));
  console.log('deck →', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
}

// ---------- theme + post-processing ----------
// The pptx skill's apply_theme.js when PPTX_APPLY_THEME names it; otherwise the same edit done here.
const inlineTheme = async (file, theme) => {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = 'ppt/theme/theme1.xml';
  const slots = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  const scheme = `<a:clrScheme name="${theme.name}">` + slots.map(k => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
  const xml = (await zip.file(part).async('string')).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${theme.name}"`);
  zip.file(part, xml);
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
};
let applyTheme = inlineTheme;
if (process.env.PPTX_APPLY_THEME) {
  try {
    // the skill script resolves jszip from beside pptxgenjs, which lives in the sibling project
    process.env.NODE_PATH = path.join(__dirname, '../cag-pitch-deck/node_modules') + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : '');
    require('module').Module._initPaths();
    const skill = require(process.env.PPTX_APPLY_THEME).applyTheme;
    applyTheme = async (file, theme) => { try { await skill(file, theme); } catch (e) { console.log('skill apply_theme failed, using inline:', e.message); await inlineTheme(file, theme); } };
  } catch (e) { console.log('PPTX_APPLY_THEME not usable, using inline:', e.message); }
}
// 1) dark colour map on the slide master (Background 1 = navy, Text 1 = white);
// 2) guardrails: no role labels, no "iPAM" without the S, no model identifiers;
// 3) speaker notes: one paragraph per line, so PowerPoint shows the line breaks.
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const master = 'ppt/slideMasters/slideMaster1.xml';
  const mx = await zip.file(master).async('string');
  const swapped = mx.replace('<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"', '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2"');
  if (swapped === mx) throw new Error('slide master colour map not found');
  zip.file(master, swapped);
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/(slides|slideLayouts|notesSlides)\/[^/]+\.xml$/.test(n))) {
    const hit = (await zip.file(name).async('string')).match(/\b(CMO|CTO|CSO|CCO|CPO)\b|iPAM(?!S)|claude|gpt-|sonnet|opus|haiku/i);
    if (hit) throw new Error(`${name} contains "${hit[0]}"`);
  }
  // docProps/app.xml: pptxgenjs lists Calibri under "Fonts Used" although nothing references it; drop it
  const appPart = 'docProps/app.xml';
  if (zip.file(appPart)) {
    const app = await zip.file(appPart).async('string');
    if (app.includes('<vt:lpstr>Calibri</vt:lpstr>')) zip.file(appPart, app.replace('<vt:lpstr>Calibri</vt:lpstr>', '')
      .replace(/(<vt:lpstr>Fonts Used<\/vt:lpstr><\/vt:variant>\s*<vt:variant><vt:i4>)(\d+)/, (_, h, n) => h + (n - 1))
      .replace(/(<TitlesOfParts>\s*<vt:vector size=")(\d+)/, (_, h, n) => h + (n - 1)));
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
