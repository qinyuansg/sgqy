// CPO flow boards for strategic areas 2 · 4 · 5 (dark V11 board style, Roboto, same grammar as the
// AgilFence flow board): the point-2 flow board (AI-powered AGIL Secure ISMS), the point-5 flow board
// (multi-site, multi-brand governance) and the master board with one lane per point (2 · 4 · 5).
// Boards embed JPEG previews of the V11-*, AF-* and MS-* frames (thumb folder set with useThumbs).
// Every step carries its readiness grade (In V11 today · Concept · designed · Roadmap · R&D to confirm);
// every date is a proposal to confirm with R&D; people decide. Sites, names, IDs, times and figures
// are illustrative. Layout checks print "board-warn:" lines when a text would not fit its box.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, text, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C } from '../lib/v11.mjs';

let THUMBS = null;
export function useThumbs(dir) { THUMBS = dir; }
const thumbPath = name => path.join(THUMBS, name + '.jpg');
const thumb = name => 'data:image/jpeg;base64,' + fs.readFileSync(thumbPath(name)).toString('base64');

// ---------- frame sizes: read from the JPEG header (SOF marker); known sizes as the fallback ----------
const KNOWN = { 'AF-06-command-centre-video-wall': [1920, 1080], 'AF-00b-flow-board': [3480, 2040] };
const WIDE = /^(V11-12|V11-00|AF-03|AF-09|MS-0[3-6])/;
function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xFF) { i++; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
const SIZES = {};
function frameSize(name) {
  if (!SIZES[name]) {
    let s = null;
    try { s = jpegSize(fs.readFileSync(thumbPath(name))); } catch (e) { s = null; }
    SIZES[name] = s || KNOWN[name] || (WIDE.test(name) ? [1600, 1069] : [1400, 1069]);
  }
  return SIZES[name];
}

// ---------- palette (kit colours + the deck's readiness grades) ----------
const BG = '#05080D', CARD = '#11161E', STROKE = '#2B3442', GRID = '#2A62C9', ID = '#5C6675';
const GREEN = '#2ED47A', LAV = C.copilot, ROAD = '#4D8DFF', AMBER = '#D4B741', BLUE = '#3EA9FF', WHITE = '#FFFFFF', SITE = '#44AC0C', SKY = '#8FC4FF';
const GRADES = { today: ['IN V11 TODAY', GREEN], concept: ['CONCEPT · DESIGNED', LAV], roadmap: ['ROADMAP', ROAD], confirm: ['R&D TO CONFIRM', AMBER], fence: ['AGILFENCE + iPAMS · TODAY', AMBER] };
const PROPOSED = 'proposed · confirm with R&D';
const FRAMES = ['V11-01-home-real-time-alerts', 'V11-02-tailgating-investigation', 'V11-03-tailgating-sop-flow-door-control', 'V11-04-identity-spoofing-investigation', 'V11-05-unattended-bag-sop-flow',
  'V11-06-watchlist-loitering-sop-verify', 'V11-07-fight-detection-investigation', 'V11-08-overstay-investigation', 'V11-09-agil-fence-lidar-investigation', 'V11-10-escalate-event-copilot-prefill',
  'V11-11-search-ask-copilot', 'V11-12-incident-management-report', 'AF-01-perimeter-triggered', 'AF-02-system-message-alarm', 'AF-03-incident-list', 'AF-04-locate-nearest-cameras',
  'AF-05-ptz-films-the-area', 'AF-06-command-centre-video-wall', 'AF-07-sop-approve-dispatch', 'AF-08-patrol-on-scene', 'AF-09-close-and-report', 'MS-01-estate-overview',
  'MS-02-site-seletar-local-autonomy', 'MS-03-governance-security-baseline', 'MS-04-governance-roles-access', 'MS-05-governance-systems-connectors', 'MS-06-governance-estate-report'];
const FRAME_BY_ID = Object.fromEntries(FRAMES.map(n => [n.match(/^[A-Z0-9]+-\d\d/)[0], n]));
const TRAINS = 'V11.1 Mar 2027 · V11.2 Sep 2027 · V11.3 Mar 2028 — proposed, confirm with R&D';
const ILLUSTRATIVE = 'Illustrative scenario · simulated data';
const RESTRICTED = 'Restricted: internal product view · not for public display. Sites, people, IDs, times and figures are illustrative and simulated; Vendor A–E stand for third-party brands.';

// ---------- layout checks ----------
const warn = (...a) => console.warn('board-warn:', ...a);
const fits = (what, w, maxW) => { if (w > maxW + 0.5) warn(`${what}: ${Math.round(w)} px > ${Math.round(maxW)} px`); };

// ---------- shared pieces ----------
function board(F, BW, BH) {
  let gr = '';
  for (let x = 0; x <= BW; x += 80) gr += line(x, 0, x, BH, { stroke: GRID, so: 0.06 });
  for (let y = 0; y <= BH; y += 80) gr += line(0, y, BW, y, { stroke: GRID, so: 0.06 });
  return rect(0, 0, BW, BH, { fill: BG }) + g(F, 'Grid', gr);
}
const chipW = lab => textWidth(lab, 14, 500) + 30;
function chip(F, x, y, lab, col) {
  const w = chipW(lab);
  return { svg: g(F, 'Chip ' + lab, rect(x, y, w, 26, { r: 13, fill: '#1D232C', stroke: col, so: 0.75 }) + circle(x + 13, y + 13, 4.5, { fill: col }) + text(x + 23, y + 18, lab, { size: 14, weight: 500, fill: WHITE })), w };
}
const tagW = lab => textWidth(lab, 14, 700, 0.6) + 20;
function tag(F, x, y, kind, label) {
  const [def, col] = GRADES[kind], lab = label || def, w = tagW(lab);
  return { svg: g(F, 'Grade ' + lab, rect(x, y, w, 26, { r: 6, fill: col, fo: 0.13, stroke: col, so: 0.85 }) + text(x + 10, y + 18, lab, { size: 14, weight: 700, ls: 0.6, fill: col })), w };
}
// tags flowed left to right within maxW, wrapping to new rows; returns {svg, rows}
function tagRow(F, x, y, maxW, tags, rowH = 32) {
  let cx = x, cy = y, rows = 1, s = '';
  for (const [kind, label] of tags) {
    const w = tagW(label || GRADES[kind][0]);
    if (cx > x && cx + w > x + maxW) { cx = x; cy += rowH; rows++; }
    s += tag(F, cx, cy, kind, label).svg; cx += w + 8;
  }
  return { svg: s, rows };
}
const disc = (x, y, n, col = C.blue, r = 22, size = 22, ink = WHITE) => circle(x, y, r, { fill: col }) + text(x, y + size * 0.36, String(n), { size, weight: 700, fill: ink, anchor: 'middle' });
const arrowH = (x1, x2, y) => pathEl(`M${f(x1 + 8)} ${f(y)} L${f(x2 - 10)} ${f(y)} M${f(x2 - 22)} ${f(y - 10)} L${f(x2 - 10)} ${f(y)} L${f(x2 - 22)} ${f(y + 10)}`, { stroke: '#8C96A6', sw: 3, cap: 'round', join: 'round' });
// preview of a frame, sized by width, clipped to its card, 1px stroke
function preview(F, name, x, y, w) {
  const [fw, fh] = frameSize(name), h = w * fh / fw;
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`);
  return `<g clip-path="${clip}">${image(F, 'Preview ' + name, thumb(name), x, y, w, h)}</g>` + rect(x, y, w, h, { stroke: STROKE });
}
// preview centred in a box that has the 1400×1069 aspect (the 1600- and 1920-wide frames are shorter)
function previewBox(F, name, x, y, w) {
  const [fw, fh] = frameSize(name), boxH = w * 1069 / 1400, ph = w * fh / fw;
  return { svg: preview(F, name, x, y + (boxH - ph) / 2, w), boxH };
}
function pillTag(F, x, y, label) {
  const w = textWidth(label, 18, 500) + 60;
  return g(F, 'Tag ' + label, rect(x - w + 0.5, y + 0.5, w, 44, { r: 22, fill: '#1D232C', stroke: '#4A505B' }) + text(x - w / 2, y + 29, label, { size: 18, weight: 500, fill: C.t3, anchor: 'middle' }));
}
function heading(F, BW, o) {
  const size = o.titleSize || 64;
  let s = text(100, 120, o.kicker, { size: 20, weight: 700, ls: 2.5, fill: o.col });
  s += text(100, 196, o.title, { size, weight: 700, fill: WHITE });
  if (o.sub) s += text(100, 248, o.sub, { size: 26, fill: C.t2 });
  fits('heading title', textWidth(o.title, size, 700), o.maxW || BW - 1200);
  fits('heading sub', textWidth(o.sub || '', 26), o.maxW || BW - 1200);
  return g(F, 'Heading', s) + pillTag(F, BW - 100, 92, ILLUSTRATIVE);
}
function askAnswer(F, x, y, ask, answer, maxW, o = {}) {
  const lw = o.lw || 200, size = o.size || 20;
  let s = text(x, y, 'THE ASK · 16 OCT', { size: 15, weight: 700, ls: 1.5, fill: C.t2 }) + text(x + lw, y, ask, { size, fill: C.t1 });
  s += text(x, y + 36, 'THE ANSWER', { size: 15, weight: 700, ls: 1.5, fill: C.t2 }) + text(x + lw, y + 36, answer, { size, weight: 500, fill: WHITE });
  fits('ask', textWidth(ask, size), maxW - lw); fits('answer', textWidth(answer, size, 500), maxW - lw);
  return g(F, 'Ask and answer', s);
}
function whoActs(F, x, y, roles) {
  let s = text(x, y, 'WHO ACTS', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  let cx = x;
  for (const k of Object.keys(roles)) { const [lab, col] = roles[k]; const c = chip(F, cx, y + 16, lab, col); s += c.svg; cx += c.w + 10; }
  return { svg: g(F, 'Who acts', s), w: cx - x - 10 };
}
const LEGEND = [[['today', null, 'in the current software · can be shown live'], ['concept', null, 'designed on V11 screens · not in the software']],
  [['roadmap', 'ROADMAP · V11.x', 'planned for a release train · date proposed'], ['confirm', null, 'a fact Product cannot verify alone']]];
function legend(F, x, y, maxW) {
  let s = text(x, y, 'READINESS GRADES', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  LEGEND.forEach((row, i) => {
    let cx = x; const yy = y + 16 + i * 36;
    for (const [k, l, n] of row) { const t = tag(F, cx, yy, k, l); s += t.svg + text(cx + t.w + 8, yy + 18, n, { size: 15, fill: C.t2 }); cx += t.w + 8 + textWidth(n, 15) + 30; }
    fits('legend row ' + (i + 1), cx - 30 - x, maxW);
  });
  return g(F, 'Readiness legend', s);
}
function footer(F, BW, BH, o) {
  let s = text(100, BH - 68, RESTRICTED, { size: 19, fill: C.t2 });
  s += text(100, BH - 36, o.next, { size: 19, weight: 500, fill: WHITE });
  s += text(BW - 100, BH - 36, o.note, { size: 19, fill: C.t2, anchor: 'end' });
  fits('footer next', textWidth(o.next, 19, 500) + 40 + textWidth(o.note, 19), BW - 200);
  return g(F, 'Footer', s);
}
// a release-train box: grade tag, date (always proposed), title, wrapped text
function trainBox(F, x, y, w, h, o) {
  let s = rect(x, y, w, h, { r: 16, fill: CARD, stroke: o.col, so: 0.7, sw: 1.5 });
  const t = tag(F, x + 24, y + 22, o.kind, o.tag); s += t.svg;
  if (o.date) { s += text(x + 24 + t.w + 12, y + 40, o.date + ' · ' + PROPOSED, { size: 15, weight: 500, fill: o.col }); fits('train date ' + o.title, t.w + 12 + textWidth(o.date + ' · ' + PROPOSED, 15, 500), w - 48); }
  s += text(x + 24, y + 82, o.title, { size: 22, weight: 700, fill: WHITE });
  fits('train title ' + o.title, textWidth(o.title, 22, 700), w - 48);
  const lines = wrap(o.body, w - 48, 17);
  lines.forEach((l, i) => { s += text(x + 24, y + 114 + i * 25, l, { size: 17, fill: C.t1 }); });
  let bottom = y + 114 + (lines.length - 1) * 25 + 8;
  if (o.frames && o.frames.length) {   // small previews of the frames this train ships, with their ids
    const pw = 136, py = bottom + 16;
    let px = x + 24, ph = 0;
    for (const id of o.frames) {
      const name = FRAME_BY_ID[id], [fw, fh] = frameSize(name);
      ph = Math.max(ph, pw * fh / fw);
      s += preview(F, name, px, py, pw) + text(px, py + pw * 1069 / 1400 + 18, id, { size: 14, weight: 500, fill: ID });
      px += pw + 12;
    }
    fits(`train "${o.title}" frames`, px - 12 - (x + 24), w - 48);
    bottom = py + pw * 1069 / 1400 + 22;
  }
  if (o.chips) {   // a chip row at the foot of the box (boxes without frames)
    let cx = x + 24;
    for (const [lab, col] of o.chips) { const c = chip(F, cx, y + h - 62, lab, col); s += c.svg; cx += c.w + 8; }
    fits(`train "${o.title}" chips`, cx - 8 - (x + 24), w - 48);
    if (bottom > y + h - 74) warn(`train box "${o.title}": text runs into the chip row`);
  }
  if (bottom > y + h - 10) warn(`train box "${o.title}" content runs past its box (${Math.round(bottom - y)} > ${h - 10})`);
  return g(F, 'Train ' + o.title, s);
}

// ---------- step card (P2 / P5): number, kicker, title, preview, caption, grade rows, who acts ----------
function stepCard(F, st, x, y, cw, ch, roles) {
  const inner = cw - 48;
  let c = rect(x, y, cw, ch, { r: 20, fill: CARD, stroke: STROKE, sw: 1.2 });
  c += disc(x + 40, y + 44, st.n);
  c += text(x + 76, y + 36, st.kicker, { size: 15, weight: 700, ls: 1.2, fill: SKY });
  c += text(x + 76, y + 64, st.title, { size: 25, weight: 700, fill: WHITE });
  fits(`${st.id} kicker`, textWidth(st.kicker, 15, 700, 1.2), cw - 92); fits(`${st.id} title`, textWidth(st.title, 25, 700), cw - 92);
  const pv = previewBox(F, st.frame, x + 1, y + 90, cw - 2);
  c += pv.svg;
  // caption (19px, up to three lines)
  const cy = y + 90 + pv.boxH + 36, lines = wrap(st.cap, inner, 19);
  if (lines.length > 3) warn(`${st.id} caption has ${lines.length} lines: "${st.cap}"`);
  lines.slice(0, 3).forEach((l, j) => { c += text(x + 24, cy + j * 27, l, { size: 19, fill: C.t1 }); });
  // grade rows (tag + note), anchored above the chips
  const chipY = y + ch - 46, gy0 = chipY - 22 - st.grades.length * 30;
  if (cy + (Math.min(lines.length, 3) - 1) * 27 + 8 > gy0) warn(`${st.id}: caption runs into the grade rows`);
  st.grades.forEach(([k, l, n], j) => {
    const yy = gy0 + j * 30, t = tag(F, x + 24, yy, k, l); c += t.svg;
    if (n) { c += text(x + 24 + t.w + 10, yy + 18, n, { size: 14, fill: C.t2 }); fits(`${st.id} grade ${k} note`, t.w + 10 + textWidth(n, 14), inner); }
  });
  let ax = x + 24;
  for (const k of st.who) { const [lab, col] = roles[k]; const ch_ = chip(F, ax, chipY, lab, col); c += ch_.svg; ax += ch_.w + 8; }
  fits(`${st.id} chips`, ax - 8 - (x + 24), inner - 70);
  c += text(x + cw - 24, chipY + 18, st.id, { size: 14, weight: 500, fill: ID, anchor: 'end' });
  return g(F, `Step ${st.n} · ${st.title}`, c);
}
function cardRow(F, steps, x0, y, cw, gap, ch, roles) {
  let s = '', ar = '';
  const ay = y + 90 + (cw - 2) * 1069 / 1400 / 2;
  steps.forEach((st, i) => { const x = x0 + i * (cw + gap); s += stepCard(F, st, x, y, cw, ch, roles); if (i < steps.length - 1) ar += arrowH(x + cw, x + cw + gap, ay); });
  return s + g(F, 'Arrows', ar);
}

// =====================================================================================================
// P2 · AI-powered AGIL Secure ISMS
// =====================================================================================================
const P2_ROLES = { system: ['AGIL Secure (auto)', BLUE], copilot: ['Co-pilot (concept)', LAV], operator: ['People decide', WHITE] };
const R11 = ['Mar 2027 · ' + PROPOSED], R12 = ['Sep 2027 · ' + PROPOSED];
const P2_STEPS = [
  { n: 1, id: 'V11-01', frame: 'V11-01-home-real-time-alerts', kicker: 'ALARM CORRELATION', title: 'Every alert explained',
    cap: 'Each alert card carries one Co-pilot line: what happened and how many alarms are linked. Locate and Escalate work as today.',
    who: ['system', 'copilot'], grades: [['today', null, 'alert cards · Locate · Escalate'], ['concept', null, 'Co-pilot line on the card'], ['roadmap', 'ROADMAP · V11.1', R11[0]]] },
  { n: 2, id: 'V11-02', frame: 'V11-02-tailgating-investigation', kicker: 'ALARM CORRELATION · AI CO-PILOT', title: 'One incident, not five alarms',
    cap: 'Staff Door D-214: two people on one badge. Five alarms become one incident, with a Co-pilot summary and the linked alarms listed.',
    who: ['system', 'copilot'], grades: [['today', null, 'Active Alarms · Investigation tab'], ['concept', null, 'Co-pilot summary · linked alarms'], ['roadmap', 'ROADMAP · V11.1', R11[0]]] },
  { n: 3, id: 'V11-03', frame: 'V11-03-tailgating-sop-flow-door-control', kicker: 'AI SECURITY CO-PILOT', title: 'Co-pilot prepares, you approve',
    cap: 'The SOP steps are pre-filled and the automatic steps ticked. Locking the door is a Critical Action step: a person approves it.',
    who: ['copilot', 'operator'], grades: [['today', null, 'SOP Flow · Critical Action steps'], ['concept', null, 'pre-filled steps · approvals'], ['roadmap', 'ROADMAP · V11.1', R11[0]]] },
  { n: 4, id: 'V11-10', frame: 'V11-10-escalate-event-copilot-prefill', kicker: 'INCIDENT AUTOMATION · ASSISTED', title: 'Escalate, pre-filled',
    cap: 'Category, severity and remarks are pre-filled from the investigation. The operator checks them and creates the incident.',
    who: ['copilot', 'operator'], grades: [['today', null, 'Escalate Event dialog · Create Incident'], ['concept', null, 'fields pre-filled by Co-pilot'], ['roadmap', 'ROADMAP · V11.1', R11[0]]] },
  { n: 5, id: 'V11-11', frame: 'V11-11-search-ask-copilot', kicker: 'NATURAL-LANGUAGE INVESTIGATION', title: 'Ask in plain English',
    cap: '“Show critical incidents in T5 in the last hour.” The answer lists the matching alerts with their sources; open or Locate from there.',
    who: ['operator', 'copilot'], grades: [['today', null, 'search bar'], ['concept', null, 'Ask Co-pilot answer with sources'], ['roadmap', 'ROADMAP · V11.2', R12[0]]] },
  { n: 6, id: 'V11-12', frame: 'V11-12-incident-management-report', kicker: 'AUTOMATED REPORTING', title: 'The report drafts itself',
    cap: 'Incident TGT-214 in Incident Management: the Co-pilot report draft sits in Remarks, ready for a person to review and sign.',
    who: ['copilot', 'operator'], grades: [['today', null, 'Incident Management · Remarks · export'], ['concept', null, 'Co-pilot report draft'], ['roadmap', 'ROADMAP · V11.1', R11[0]]] },
];
const P2_MORE = [
  { id: 'V11-04', frame: 'V11-04-identity-spoofing-investigation', name: 'Access intelligence', line: 'T1 Door C2 · impossible presence · legacy SSID', train: 'ROADMAP · V11.1 / 11.2' },
  { id: 'V11-05', frame: 'V11-05-unattended-bag-sop-flow', name: 'Incident automation (assisted)', line: 'Gate B12 bag · steps 1–4 done · you approve step 5', train: 'ROADMAP · V11.1 / 11.2' },
  { id: 'V11-06', frame: 'V11-06-watchlist-loitering-sop-verify', name: 'Watchlist stays human', line: 'Row K · a person verifies the match first', train: 'ROADMAP · V11.1' },
  { id: 'V11-07', frame: 'V11-07-fight-detection-investigation', name: 'Fight detection', line: 'Belt 5 · video and audio · responders listed', train: 'ROADMAP · V11.1' },
  { id: 'V11-08', frame: 'V11-08-overstay-investigation', name: 'Overstay rules', line: 'Baggage Hall B2 · airport rules (i)–(v)', train: 'ROADMAP · V11.1' },
  { id: 'V11-09', frame: 'V11-09-agil-fence-lidar-investigation', name: 'AgilFence + LiDAR', line: 'Fence Sector 5 · fence, LiDAR and thermal', train: 'ROADMAP · V11.1' },
];
function miniCard(F, m, x, y, w, h) {
  const pw = 220, [fw, fh] = frameSize(m.frame), ph = pw * fh / fw, tx = x + 14 + pw + 16, tw = w - (14 + pw + 16) - 14;
  let c = rect(x, y, w, h, { r: 16, fill: CARD, stroke: STROKE, sw: 1.2 });
  c += preview(F, m.frame, x + 14, y + 14 + (168 - ph) / 2, pw);
  const nl = wrap(m.name, tw, 19, 700).slice(0, 2);
  nl.forEach((l, j) => { c += text(tx, y + 36 + j * 25, l, { size: 19, weight: 700, fill: WHITE }); });
  let yy = y + 36 + nl.length * 25 + 2;
  const ll = wrap(m.line, tw, 15).slice(0, 2);
  ll.forEach((l, j) => { c += text(tx, yy + j * 21, l, { size: 15, fill: C.t2 }); });
  yy += ll.length * 21 + 6;
  c += tag(F, tx, yy, 'concept').svg + tag(F, tx, yy + 32, 'roadmap', m.train).svg;
  fits(`${m.id} train tag`, tagW(m.train), tw);
  if (yy + 58 + 10 > y + h) warn(`${m.id} mini card overflows`);
  c += text(x + 14, y + h - 14, m.id, { size: 14, weight: 500, fill: ID });
  return g(F, 'Variant ' + m.name, c);
}

export function p2Board() {
  const BW = 3480, BH = 2040;
  const F = new Frame('P2 · AI-powered AGIL Secure ISMS · end-to-end flow board', BW, BH);
  let s = board(F, BW, BH);
  s += heading(F, BW, { col: LAV, kicker: 'END-TO-END FLOW · STRATEGIC AREA 2 · AI-POWERED AGIL SECURE ISMS', title: 'From five alarms to one signed report',
    sub: 'Staff Door D-214 · two people crossed on one badge · five alarms become one incident · the AI Co-pilot on the V11 workflow', maxW: 2200 });
  s += askAnswer(F, 100, 296, 'Is Weili’s deck, with its use cases, aligned and good to commit to CAG? Any other supporting material from R&D?',
    'The workflow is in V11 today. The AI layer is designed (12 frames + film) and ships in trains V11.1 and V11.2. Weili’s deck is aligned in direction — commit it with four edits.', 2240);
  // right block: who acts + readiness legend
  const lx = 2360;
  s += whoActs(F, lx, 170, P2_ROLES).svg;
  s += legend(F, lx, 246, 1020);
  // row 1: the six steps
  const x0 = 100, cw = 500, gap = 56, ch = 780, y1 = 372;
  s += g(F, 'Flow · six steps', cardRow(F, P2_STEPS, x0, y1, cw, gap, ch, P2_ROLES));
  // row 2: the other use cases, same workflow
  const y2 = 1250;
  s += text(x0, y2 - 22, 'SIX MORE USE CASES ON THE SAME WORKFLOW · SHOWN AS VARIANTS IN THE DEMO', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  s += text(BW - 100, y2 - 22, 'Same path every time: alert card › Active Alarm › Investigation / SOP Flow › Acknowledge or Escalate › Incident Management', { size: 15, fill: C.t2, anchor: 'end' });
  let strip = '';
  P2_MORE.forEach((m, i) => { strip += miniCard(F, m, x0 + i * (cw + gap), y2, cw, 220); });
  s += g(F, 'Variants · V11-04 to V11-09', strip);
  // row 3: release trains + the 22 October plan
  const y3 = 1562, bw = (BW - 200 - 3 * 40) / 4, bh = 320;
  s += text(x0, y3 - 22, 'RELEASE TRAINS · PRODUCT PROPOSAL · TO CONFIRM AGAINST THE R&D ROADMAP BY 30 OCT 2026 · NO DATE GOES TO CAG BEFORE THAT', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  const trains = [
    { kind: 'today', tag: 'IN V11 TODAY', col: GREEN, title: 'V11 · in service', chips: [['Alert cards', GREEN], ['Active Alarms', GREEN], ['SOP Flow', GREEN], ['Escalate', GREEN], ['Incident Management', GREEN]], body: 'One workflow for any alarm source: alert card › Active Alarm › Investigation / SOP Flow › Escalate › Incident Management. This is the part we can show live on 22 October. Operated per site.' },
    { kind: 'roadmap', tag: 'ROADMAP · V11.1', col: ROAD, date: 'Q1 2027 (Mar)', title: 'Unified alarms · Co-pilot assist', frames: ['V11-01', 'V11-02', 'V11-03', 'V11-10', 'V11-12'], body: 'Co-pilot lines on alert cards, linked alarms, Co-pilot summary, SOP and Escalate pre-fill, report draft (steps 1–4 and 6). Also the access rules, fight, overstay and AgilFence + LiDAR cases.' },
    { kind: 'roadmap', tag: 'ROADMAP · V11.2', col: ROAD, date: 'Q3 2027 (Sep)', title: 'Ask Co-pilot · live analytics', frames: ['V11-11', 'V11-05', 'V11-04'], body: 'Ask Co-pilot on-premise (step 5), automatic investigation steps on live video analytics, appearance check for access intelligence. Co-pilot still recommends; people decide.' },
    { kind: 'confirm', tag: 'R&D TO CONFIRM', col: AMBER, title: '22 October: plan A or plan B', chips: [['Plan A · live V11 + demo instance · R&D to confirm', AMBER], ['Plan B · film + 12 frames · ready now', GREEN]], body: 'Plan A: live V11 plus a demo instance with these deltas and recorded data — R&D to confirm it exists. Plan B: the film “From alarms to answers” and a click-through of the 12 frames — needs nothing from R&D. Both are honest.' },
  ];
  let tb = '';
  trains.forEach((t, i) => { tb += trainBox(F, x0 + i * (bw + 40), y3, bw, bh, t); });
  s += g(F, 'Release trains', tb);
  s += footer(F, BW, BH, { next: 'Next: the four edits to Weili’s deck (21 Oct) · plan A or plan B for 22 Oct · train dates locked with R&D by 30 Oct.', note: 'Frames V11-01 to V11-12 follow at full size' });
  return F.render(s);
}

// =====================================================================================================
// P5 · Multi-site, multi-brand governance
// =====================================================================================================
const P5_ROLES = { estate: ['Estate governance', WHITE], site: ['Site operator', SITE], soc: ['Central SOC', SKY], system: ['System', BLUE] };
const P5_STEPS = [
  { n: 1, id: 'MS-01', frame: 'MS-01-estate-overview', kicker: 'ESTATE OVERVIEW', title: 'Every site on one screen',
    cap: 'The location selector goes up one level, to the estate: five sites with health, open alarms and baseline compliance, linked to the Central SOC.',
    who: ['estate', 'soc'], grades: [['concept', null, 'estate selector · estate map · Sites panel'], ['roadmap', 'ROADMAP · V11.1 / 11.2', 'read-only view in 11.1 · full in 11.2']] },
  { n: 2, id: 'MS-02', frame: 'MS-02-site-seletar-local-autonomy', kicker: 'LOCAL AUTONOMY · 02:20:14 – 02:41:10', title: 'Seletar handles its own alarm',
    cap: 'Seletar runs the perimeter SOP under the estate baseline: locked estate steps plus one approved local step, while Central SOC watches.',
    who: ['site', 'soc'], grades: [['today', null, 'per-site console'], ['concept', null, 'autonomy chip · locked steps · local step'], ['roadmap', 'ROADMAP · V11.1'], ['confirm', null, 'edge / WAN behaviour of V11 today']] },
  { n: 3, id: 'MS-03', frame: 'MS-03-governance-security-baseline', kicker: 'ONE SECURITY BASELINE', title: 'Estate SOPs, local overrides',
    cap: 'Estate SOPs are locked at baseline v3. A site requests a local override; a person approves or returns it, and the audit line records it.',
    who: ['estate', 'site'], grades: [['today', null, 'SOP Flow per site'], ['concept', null, 'governance page · override approval'], ['roadmap', 'ROADMAP · V11.2'], ['confirm', null, 'SOP library data model']] },
  { n: 4, id: 'MS-04', frame: 'MS-04-governance-roles-access', kicker: 'ROLES PER SITE', title: 'Who sees what, per site',
    cap: 'Local guards see only their site; the estate sees everything and edits only the baseline. Auditors read, integrators get a sandbox.',
    who: ['estate', 'system'], grades: [['today', null, 'site-level roles · scope to confirm'], ['concept', null, 'role × site matrix'], ['roadmap', 'ROADMAP · V11.1'], ['confirm', null, 'current role model and its scope']] },
  { n: 5, id: 'MS-05', frame: 'MS-05-governance-systems-connectors', kicker: 'ANY BRAND, ONE ROOF', title: 'Connectors by site and protocol',
    cap: 'Every third-party system by site, vendor and protocol, with its status. A guided dialog adds a new system and runs certification checks.',
    who: ['estate', 'system'], grades: [['concept', null, 'connector catalogue · onboarding dialog'], ['roadmap', 'ROADMAP · V11.2 / 11.3', 'catalogue 11.2 · certification 11.3'], ['confirm', null, 'connector list V11 ships today']] },
  { n: 6, id: 'MS-06', frame: 'MS-06-governance-estate-report', kicker: 'ESTATE REPORTING', title: 'One report for the estate',
    cap: 'Open incidents by site, alarms by source system, baseline compliance, device health and fence coverage per site, with one export.',
    who: ['estate', 'soc'], grades: [['today', null, 'per-site export'], ['concept', null, 'report tiles · export · figures illustrative'], ['roadmap', 'ROADMAP · V11.2']] },
];
function clockCard(F, x, y, w, h) {
  let o = rect(x, y, w, h, { r: 20, fill: '#0D1A14', stroke: SITE, so: 0.7, sw: 1.5 });
  o += text(x + 32, y + 56, 'SCENARIO CLOCK · SELETAR · ILLUSTRATIVE', { size: 16, weight: 700, ls: 2, fill: SITE });
  o += text(x + 32, y + 98, 'Handled locally. Seen by the estate.', { size: 28, weight: 700, fill: WHITE });
  fits('clock title', textWidth('Handled locally. Seen by the estate.', 28, 700), w - 64);
  const kp = [['Fence Sector 2 · Seg 2-07 alarm', '02:20:14'], ['Faizal R. opens it (site operator)', '02:20:40'], ['Verified on PTZ 2-04', '02:21:05'], ['Seletar patrol sent', '02:21:30'], ['Seletar tower informed · local step', '02:22:00'], ['Closed by Faizal R. · Central SOC sees it', '02:41:10']];
  kp.forEach(([l, v], i) => { const yy = y + 160 + i * 52; o += line(x + 32, yy - 32, x + w - 32, yy - 32, { stroke: '#22382C' }) + text(x + 32, yy, l, { size: 20, fill: C.t1 }) + text(x + w - 32, yy, v, { size: 22, weight: 700, fill: WHITE, anchor: 'end' }); fits('clock row', textWidth(l, 20) + 20 + textWidth(v, 22, 700), w - 64); });
  o += text(x + 32, y + h - 78, 'One baseline for the estate.', { size: 21, weight: 500, fill: SITE }) + text(x + 32, y + h - 50, 'Local hands. Estate eyes. People decide.', { size: 21, weight: 500, fill: SITE });
  return g(F, 'Scenario clock', o);
}

export function p5Board() {
  const BW = 3480, BH = 2040;
  const F = new Frame('P5 · Multi-site, multi-brand governance · end-to-end flow board', BW, BH);
  let s = board(F, BW, BH);
  s += heading(F, BW, { col: BLUE, kicker: 'END-TO-END FLOW · STRATEGIC AREA 5 · MULTI-SITE, MULTI-BRAND GOVERNANCE', title: 'One estate, every site: one baseline, local autonomy',
    sub: 'CAG estate (illustrative) · five sites · Seletar handles its own fence alarm under the estate baseline while Central SOC watches', maxW: 2200 });
  s += askAnswer(F, 100, 296, 'Is there a ready in-built module in V11 that we can present to CAG? If not: the roadmap, high-level visuals and the launch timeline.',
    'Not in V11 today — designed here, ships in three trains (proposed). V11 runs one site with many clusters; roles and integrations are per site.', 2240);
  const lx = 2360;
  s += whoActs(F, lx, 170, P5_ROLES).svg;
  s += legend(F, lx, 246, 1020);
  const x0 = 100, cw = 500, gap = 56, ch = 780, y1 = 372;
  s += g(F, 'Flow · six steps', cardRow(F, P5_STEPS, x0, y1, cw, gap, ch, P5_ROLES));
  // row 2: scenario clock + release trains + what V11 has today + what R&D confirms
  const y2 = 1236, clockW = 600;
  s += clockCard(F, x0, y2, clockW, 600);
  const tx = x0 + clockW + 60, tw = BW - 100 - tx, bw = (tw - 2 * 40) / 3, bh = 320;
  s += text(tx, y2 - 22, 'RELEASE TRAINS · PRODUCT PROPOSAL · TO CONFIRM AGAINST THE R&D ROADMAP BY 30 OCT 2026 · NO DATE GOES TO CAG BEFORE THAT', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  const trains = [
    { kind: 'roadmap', tag: 'ROADMAP · V11.1', col: ROAD, date: 'Q1 2027 (Mar)', title: 'Foundation', frames: ['MS-01', 'MS-02', 'MS-04'], body: 'Estate view (read-only) · site switcher across sites · per-site roles. The per-site workflow stays as it is today.' },
    { kind: 'roadmap', tag: 'ROADMAP · V11.2', col: ROAD, date: 'Q3 2027 (Sep)', title: 'Governance', frames: ['MS-01', 'MS-03', 'MS-05', 'MS-06'], body: 'Security baseline with local overrides and approvals · estate dashboard (full) · estate reporting · connector catalogue.' },
    { kind: 'roadmap', tag: 'ROADMAP · V11.3', col: ROAD, date: 'Q1 2028 (Mar)', title: 'Open platform', frames: ['MS-05'], body: 'Public API and SDK · connector certification · partner sandbox (MS-05: certification checks, sandbox key). Third parties build against a published contract.' },
  ];
  let tb = '';
  trains.forEach((t, i) => { tb += trainBox(F, tx + i * (bw + 40), y2, bw, bh, t); });
  const y3 = y2 + bh + 36, hw = (tw - 40) / 2;
  tb += trainBox(F, tx, y3, hw, 600 - bh - 36, { kind: 'today', tag: 'IN V11 TODAY', col: GREEN, title: 'V11 today: one site, many clusters',
    body: 'Location selector site › cluster (e.g. Main Airport › T3) · roles per site · integrations per site · SOP Flow and export per site. There is no estate module, so there is nothing to show live for this point; we show the six frames as a labelled concept.' });
  tb += trainBox(F, tx + hw + 40, y3, hw, 600 - bh - 36, { kind: 'confirm', tag: 'R&D TO CONFIRM', col: AMBER, title: 'Before any date goes to CAG',
    body: 'Edge / WAN behaviour of V11 today · current role model · SOP library data model · the connector list V11 ships today (ONVIF, OSDP, AgilFence, LiDAR, intercom, others) · API status. Confirmation target: 30 October 2026.' });
  s += g(F, 'Release trains', tb);
  s += footer(F, BW, BH, { next: 'Next: name the CAG design partner for multi-site governance · confirm the connector list and role model with R&D · lock the train dates by 30 Oct.', note: 'Frames MS-01 to MS-06 follow at full size' });
  return F.render(s);
}

// =====================================================================================================
// CPO master board · three lanes (points 2 · 4 · 5)
// =====================================================================================================
const T = (...tags) => tags;   // readability: tags per step
const LANES = [
  { n: 2, col: LAV, title: 'Strategic area 2 · AI-powered AGIL Secure ISMS', tw: 530, titleSize: 24,
    ask: 'Is Weili’s deck, with its use cases, aligned and good to commit to CAG? Any other supporting material from R&D?',
    answer: 'The workflow is in V11 today. The AI layer is designed (12 frames + film) and ships in trains V11.1 and V11.2. Weili’s deck is aligned in direction — commit it with four edits.',
    steps: [
      { id: 'V11-01', frame: 'V11-01-home-real-time-alerts', title: 'Every alert explained', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'V11-02', frame: 'V11-02-tailgating-investigation', title: 'One incident, not five alarms', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'V11-03', frame: 'V11-03-tailgating-sop-flow-door-control', title: 'Co-pilot prepares, you approve', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'V11-10', frame: 'V11-10-escalate-event-copilot-prefill', title: 'Escalate, pre-filled', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'V11-11', frame: 'V11-11-search-ask-copilot', title: 'Ask in plain English', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.2']) },
      { id: 'V11-12', frame: 'V11-12-incident-management-report', title: 'The report drafts itself', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
    ],
    train: '11.1 Co-pilot lines, linked alarms, summary, SOP / Escalate pre-fill, report draft (steps 1–4, 6) · 11.2 Ask Co-pilot, automatic investigation steps on live video analytics (step 5) · also V11-04…09 as variants' },
  { n: 4, col: AMBER, title: 'Strategic area 4 · AgilFence unified integration', tw: 360, titleSize: 20,
    ask: 'Is there a ready in-built module in V11 that we can present to CAG? If not: the roadmap, high-level visuals and the launch timeline.',
    answer: 'Partly. The alarm › incident › SOP › report workflow is in V11 today and takes any alarm source. The AgilFence module (fence line, segments, health, configuration) is not in V11: designed (10 frames, board, film) and on the roadmap.',
    steps: [
      { id: 'AF-01', frame: 'AF-01-perimeter-triggered', title: 'Perimeter triggered', tags: T(['fence']) },
      { id: 'AF-02', frame: 'AF-02-system-message-alarm', title: 'System message, alarm', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1'], ['confirm']) },
      { id: 'AF-03', frame: 'AF-03-incident-list', title: 'In the incident list', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'AF-04', frame: 'AF-04-locate-nearest-cameras', title: 'Locate: nearest camera', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.2'], ['confirm']) },
      { id: 'AF-05', frame: 'AF-05-ptz-films-the-area', title: 'PTZ films the area', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1 / 11.2'], ['confirm']) },
      { id: 'AF-06', frame: 'AF-06-command-centre-video-wall', title: 'Command-centre wall', tags: T(['concept'], ['roadmap', 'ROADMAP · V11.2'], ['confirm']) },
      { id: 'AF-07', frame: 'AF-07-sop-approve-dispatch', title: 'Operator runs the SOP', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1']) },
      { id: 'AF-08', frame: 'AF-08-patrol-on-scene', title: 'Patrol on scene', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.2']) },
      { id: 'AF-09', frame: 'AF-09-close-and-report', title: 'Close and report', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1 / 11.2']) },
    ],
    train: '11.1 AgilFence connector: alarm, segment and camera preset into the V11 workflow; fence alarms in reports (steps 2, 3, 7, 9) · 11.2 fence on the map, nearest cameras, replay, wall layout, fence health (steps 4–6, 8) · 11.3 iPAMS functions fully in V11' },
  { n: 5, col: BLUE, title: 'Strategic area 5 · Multi-site, multi-brand governance', tw: 530, titleSize: 24,
    ask: 'Is there a ready in-built module in V11 that we can present to CAG? If not: the roadmap, high-level visuals and the launch timeline.',
    answer: 'Not in V11 today. V11 runs one site with many clusters; roles and integrations are per site. The estate layer is designed here (six frames + board) and ships in three trains.',
    steps: [
      { id: 'MS-01', frame: 'MS-01-estate-overview', title: 'Every site on one screen', tags: T(['concept'], ['roadmap', 'ROADMAP · V11.1 / 11.2']) },
      { id: 'MS-02', frame: 'MS-02-site-seletar-local-autonomy', title: 'Seletar handles its own alarm', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1'], ['confirm']) },
      { id: 'MS-03', frame: 'MS-03-governance-security-baseline', title: 'Estate SOPs, local overrides', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.2'], ['confirm']) },
      { id: 'MS-04', frame: 'MS-04-governance-roles-access', title: 'Who sees what, per site', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.1'], ['confirm']) },
      { id: 'MS-05', frame: 'MS-05-governance-systems-connectors', title: 'Connectors by site and protocol', tags: T(['concept'], ['roadmap', 'ROADMAP · V11.2 / 11.3'], ['confirm']) },
      { id: 'MS-06', frame: 'MS-06-governance-estate-report', title: 'One report for the estate', tags: T(['today'], ['concept'], ['roadmap', 'ROADMAP · V11.2']) },
    ],
    train: '11.1 estate view (read-only), site switcher, per-site roles · 11.2 baseline with overrides and approvals, estate dashboard and reporting, connector catalogue · 11.3 public API + SDK, connector certification, partner sandbox' },
];
function laneCard(F, st, n, x, y, w, boxH, rows, titleSize) {
  const h = 52 + boxH + 14 + (rows - 1) * 32 + 26 + 14;
  let c = rect(x, y, w, h, { r: 16, fill: CARD, stroke: STROKE, sw: 1.2 });
  c += disc(x + 26, y + 26, n, C.blue, 16, 17);
  c += text(x + 52, y + 26 + titleSize * 0.36, st.title, { size: titleSize, weight: 700, fill: WHITE });
  const idW = textWidth(st.id, 14, 500);
  c += text(x + w - 14, y + 31, st.id, { size: 14, weight: 500, fill: ID, anchor: 'end' });
  fits(`${st.id} lane title`, textWidth(st.title, titleSize, 700), w - 52 - 14 - idW - 10);
  c += previewBox(F, st.frame, x + 1, y + 52, w - 2).svg;
  const tr = tagRow(F, x + 14, y + 52 + boxH + 14, w - 28, st.tags);
  if (tr.rows > rows) warn(`${st.id}: ${tr.rows} tag rows, lane allows ${rows}`);
  c += tr.svg;
  return { svg: g(F, `Step ${n} · ${st.title}`, c), h };
}
function lane(F, L, y, W) {
  const x0 = 100, n = L.steps.length, tw = L.tw, gap = (W - n * tw) / (n - 1), boxH = (tw - 2) * 1069 / 1400;
  const rows = Math.max(...L.steps.map(st => { let cx = 0, r = 1; for (const [k, l] of st.tags) { const w = tagW(l || GRADES[k][0]); if (cx > 0 && cx + w > tw - 28) { cx = 0; r++; } cx += w + 8; } return r; }));
  let s = disc(x0 + 24, y + 30, L.n, L.col, 24, 24, L.col === AMBER ? '#111111' : '#0B1220');
  s += text(x0 + 66, y + 42, L.title, { size: 36, weight: 700, fill: WHITE });
  s += askAnswer(F, x0, y + 92, L.ask, L.answer, W);
  const cy = y + 150;
  let cards = '', ar = '', ch = 0;
  L.steps.forEach((st, i) => {
    const x = x0 + i * (tw + gap), c = laneCard(F, st, i + 1, x, cy, tw, boxH, rows, L.titleSize);
    cards += c.svg; ch = c.h;
    if (i < n - 1) ar += arrowH(x + tw, x + tw + gap, cy + 52 + boxH / 2);
  });
  s += g(F, 'Steps', cards) + g(F, 'Arrows', ar);
  const ty = cy + ch + 44;
  s += text(x0, ty, 'RELEASE TRAINS', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  s += text(x0 + 200, ty, TRAINS, { size: 19, weight: 700, fill: WHITE });
  const tx2 = x0 + 200 + textWidth(TRAINS, 19, 700) + 28;
  s += text(tx2, ty, L.train, { size: 19, fill: C.t1 });
  fits(`lane ${L.n} train line`, tx2 + textWidth(L.train, 19) - x0, W);
  return { svg: g(F, `Lane ${L.n} · ${L.title}`, s), h: ty + 10 - y };
}

export function masterBoard() {
  const BW = 4000, BH = 2600, W = BW - 200;
  const F = new Frame('Product master board · Strategic areas 2 · 4 · 5 · end-to-end user flows (AGIL Secure V11 design)', BW, BH);
  let s = board(F, BW, BH);
  s += heading(F, BW, { col: SKY, kicker: 'INTERNAL PRODUCT VIEW · 18 OCTOBER 2026 · ANSWERS TO THE 16 OCTOBER ASKS · FIGMA BOARD', titleSize: 58,
    title: 'Strategic areas 2 · 4 · 5 — end-to-end user flows (AGIL Secure V11 design)',
    sub: 'One board, three lanes: what CAG sees in each flow, what is in V11 today, what is designed, what is on the roadmap. Frames follow at full size in the package.', maxW: 2700 });
  s += legend(F, BW - 100 - 1020, 170, 1020);
  let y = 318;
  const laneGap = 26;
  const blocks = [];
  let seps = '';
  LANES.forEach((L, i) => { const r = lane(F, L, y, W); blocks.push(r.svg); y += r.h + laneGap; if (i < LANES.length - 1) seps += line(100, y - laneGap / 2 - 6, BW - 100, y - laneGap / 2 - 6, { stroke: STROKE, so: 0.9 }); });
  s += g(F, 'Lane separators', seps) + blocks.join('');
  if (y - laneGap > BH - 96) warn(`master board: lanes end at ${Math.round(y - laneGap)}, footer starts at ${BH - 96}`);
  s += footer(F, BW, BH, { next: 'Next: lock the train dates with R&D by 30 October 2026, then commit the list to CAG: what is in V11 today now, concepts labelled, dates after confirmation.', note: 'Frames follow at full size in the package · V11-01…12 · AF-01…09 · MS-01…06' });
  return F.render(s);
}

export const BOARDS = [
  ['P2-flow-board', p2Board],
  ['P5-flow-board', p5Board],
  ['CPO-master-board', masterBoard],
];
