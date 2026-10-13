// Hand-off frames for the product/dev team, in the style of the team's Figma annotation pages
// (white canvas, status tag, numbered callouts). They embed JPEG previews of the product frames.
import fs from 'fs';
import path from 'path';
import { Frame, rect, circle, line, text, rich, para, icon, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C } from '../lib/v11.mjs';

let THUMBS = null;
export function useThumbs(dir) { THUMBS = dir; }
const thumb = name => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(THUMBS, name + '.jpg')).toString('base64');
const INK = '#111111', MUTED = '#5B6270', LINE = '#E3E5EA', PINK = '#FDD8FD', PLUM = '#480448';
const EFF = { XS: '#2E7D32', S: '#1B55A6', M: '#B26A00', '0': '#6B7280' };

function tag(F, x, y, label) {
  const w = textWidth(label, 11, 500) + 18;
  return g(F, 'Status tag', rect(x + 0.5, y + 0.5, w, 18, { r: 9, fill: PINK, stroke: PLUM }) + text(x + 9.5, y + 13.5, label, { size: 11, weight: 500, fill: PLUM }));
}
function head(F, title, sub, desc) {
  let s = tag(F, 60, 48, 'FOR REVIEW');
  s += text(60, 104, title, { size: 30, weight: 700, fill: INK }) + text(60, 132, sub, { size: 16, fill: MUTED });
  if (desc) s += text(60, 158, desc, { size: 14, fill: MUTED });
  return g(F, 'Heading', s);
}
const badge = (F, x, y, n, col = '#D72D30') => g(F, 'Callout ' + n, circle(x, y, 13, { fill: col, stroke: '#FFFFFF', sw: 2 }) + text(x, y + 4.5, String(n), { size: 13, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));

// ---------- 00 · Delta map ----------
export function deltaMap() {
  const F = new Frame('V11-00 · AI demo · Delta to V11 (what changes)', 1600, 1069);
  let s = rect(0, 0, 1600, 1069, { fill: '#FFFFFF' });
  s += head(F, '2000 – AI Demo Use Cases · Delta to V11', 'Same screens, same layout, same buttons. Only the deltas below are new.', 'Effort: XS < 1 day · S 1–3 days · M 1–2 weeks (front end only, indicative; AI services and demo data are separate).');
  // main preview with callouts (V11-02 at 0.5 scale: 700×535)
  const px = 60, py = 190, k = 0.5;
  s += image(F, 'Preview V11-02', thumb('V11-02-tailgating-investigation'), px, py, 1400 * k, 1069 * k, 10);
  s += rect(px, py, 700, 534.5, { r: 10, stroke: LINE, sw: 1 });
  const P = (x, y) => [px + x * k, py + y * k];
  [[1, 330, 380], [2, 640, 420], [3, 740, 60], [4, 1010, 420], [5, 1300, 640], [6, 1300, 735]].forEach(([n, x, y]) => { s += badge(F, ...P(x, y), n); });
  // three small previews
  const sw = 220, sh = 168;
  [['V11-03-tailgating-sop-flow-door-control', [[7, 1300, 640], [8, 1100, 740]], 'SOP Flow · door actions'], ['V11-10-escalate-event-copilot-prefill', [[9, 700, 520]], 'Escalate · pre-filled'], ['V11-12-incident-management-report', [[10, 1250, 610]], 'Incident Mgmt · report']].forEach(([nm, cs, cap], i) => {
    const tx = px + i * (sw + 20), ty = py + 560, kk = sw / (nm.includes('12-incident') ? 1600 : 1400);
    s += image(F, 'Preview ' + nm.slice(0, 6), thumb(nm), tx, ty, sw, nm.includes('12-incident') ? 1069 * kk : 1069 * kk, 8) + rect(tx, ty, sw, 1069 * kk, { r: 8, stroke: LINE });
    for (const [n, x, y] of cs) s += badge(F, tx + x * kk, ty + y * kk, n);
    s += text(tx, ty + 1069 * kk + 18, cap, { size: 12.5, fill: MUTED });
  });
  s += text(px, 985, 'The Co-pilot answer dropdown (callout 3) is shown open in frame V11-11.', { size: 12.5, fill: MUTED });
  // table
  const tx = 810, ty = 190, tw = 730;
  const cols = [['#', 0], ['Change', 34], ['Reuses existing V11 part', 330], ['Effort', 590], ['Used by', 640]];
  cols.forEach(([h, dx]) => { s += text(tx + dx, ty + 14, h.toUpperCase(), { size: 11, weight: 700, ls: 0.6, fill: MUTED }); });
  s += line(tx, ty + 24, tx + tw, ty + 24, { stroke: INK, sw: 1.5 });
  const rows = [
    ['Alert card: one Co-pilot line (linked alarms · confidence)', 'Alert card (adds one text row)', 'XS', 'All'],
    ['3D viewer: airport model, incident markers, Locate zoom', '3D viewer + Locate', 'M', 'All'],
    ['Search bar: "Search or ask Co-pilot…" + answer dropdown', 'Search bar; results reuse alert cards', 'M', 'Co-pilot Q&A'],
    ['Camera tiles: bounding box + label overlay', 'Camera tile (overlay layer)', 'S', 'All video cases'],
    ['Investigation: "Co-pilot" entry with AI summary', 'Timeline entry (new author type)', 'S', 'All'],
    ['Investigation: linked alarms listed in System entry', 'System entry', 'S', 'All (correlation)'],
    ['SOP Flow: steps pre-filled; auto steps ticked', 'SOP steps + checkboxes', 'S', 'All'],
    ['SOP Flow: approvals as Critical Action steps with buttons', 'Critical step style + V10 door action buttons', 'S', 'Tailgate, bag, watchlist'],
    ['Escalate Event: Category, Severity, Remarks pre-filled', 'Escalate Event dialog', 'XS', 'All'],
    ['Incident Management: Co-pilot report draft in Remarks', 'Remarks timeline', 'XS', 'All'],
    ['Co-pilot colour token #B69CFF (AI content only)', 'Design tokens', 'XS', 'All'],
  ];
  rows.forEach(([chg, reuse, eff, used], i) => {
    const y = ty + 30 + i * 52;
    let r = badge(F, tx + 13, y + 22, i + 1, i === 10 ? '#7C5CFF' : '#D72D30');
    const cl = wrap(chg, 280, 13.5, 500), rl = wrap(reuse, 245, 13, 400);
    cl.forEach((l, j) => { r += text(tx + 34, y + 19 + j * 17, l, { size: 13.5, weight: 500, fill: INK }); });
    rl.forEach((l, j) => { r += text(tx + 330, y + 19 + j * 17, l, { size: 13, fill: MUTED }); });
    const ew = textWidth(eff, 12, 700) + 16;
    r += rect(tx + 590, y + 9, ew, 20, { r: 10, fill: EFF[eff], fo: 0.12 }) + text(tx + 598, y + 23, eff, { size: 12, weight: 700, fill: EFF[eff] });
    wrap(used, 90, 12.5).forEach((l, j) => { r += text(tx + 640, y + 19 + j * 16, l, { size: 12.5, fill: MUTED }); });
    r += line(tx, y + 48, tx + tw, y + 48, { stroke: LINE });
    s += g(F, 'Delta ' + (i + 1), r);
  });
  // unchanged + data needs
  const uy = ty + 30 + rows.length * 52 + 18;
  s += text(tx, uy, 'UNCHANGED', { size: 11, weight: 700, ls: 0.6, fill: MUTED });
  s += para(tx, uy + 20, 'Layout grid, header, Emergency Lockdown, Real Time Alerts panel, Device Status, Active Alarms panel, camera grid, tabs, footer buttons (Clear · Escalate · Acknowledge), Escalate dialog, Incident Management table and detail.', tw, { size: 13, lh: 18, fill: INK }).svg;
  s += text(tx, uy + 82, 'NEEDED BEHIND THE UI (NOT DESIGN WORK)', { size: 11, weight: 700, ls: 0.6, fill: MUTED });
  s += para(tx, uy + 102, 'Airport 3D model · recorded demo clips with analytics metadata · ACS, AGIL Fence and LiDAR event feeds (recorded is fine) · SOP library · Co-pilot service: summary, linked alarms, SOP pre-fill, Q&A.', tw, { size: 13, lh: 18, fill: INK }).svg;
  return F.render(s);
}

// ---------- 00b · Demo click paths ----------
export function clickPaths() {
  const F = new Frame('V11-00b · AI demo · Click paths per use case', 1600, 1069);
  let s = rect(0, 0, 1600, 1069, { fill: '#FFFFFF' });
  s += head(F, '2000 – AI Demo Use Cases · Click paths', 'Every demo uses the existing V11 path: alert card → Active Alarm → Investigation / SOP Flow → existing action → Incident Management.');
  // generic flow strip
  const steps = ['Alert card (Real Time Alerts)', 'Active Alarm · Investigation', 'SOP Flow', 'Acknowledge / Escalate', 'Incident Management → Close'];
  let fx = 60;
  steps.forEach((t, i) => {
    const w = textWidth(t, 14, 500) + 36;
    s += rect(fx, 186, w, 40, { r: 20, fill: i === 1 || i === 2 ? '#EEF3FF' : '#F3F4F6', stroke: i === 1 || i === 2 ? '#1B55A6' : '#D1D5DB' }) + text(fx + 18, 211, t, { size: 14, weight: 500, fill: INK });
    fx += w;
    if (i < steps.length - 1) { s += text(fx + 10, 212, '→', { size: 18, fill: MUTED }); fx += 36; }
  });
  s += text(60, 252, 'Blue steps carry the Co-pilot content. Everything else is today’s V11 behaviour.', { size: 13, fill: MUTED });
  // table
  const tx = 60, ty = 290;
  const cols = [['Use case', 0], ['1 · Alert card shows', 230], ['2 · Opens on', 520], ['3 · Operator decides with', 860], ['4 · Close', 1170], ['Frames', 1380]];
  cols.forEach(([h, dx]) => { s += text(tx + dx, ty, h.toUpperCase(), { size: 11, weight: 700, ls: 0.6, fill: MUTED }); });
  s += line(tx, ty + 12, 1540, ty + 12, { stroke: INK, sw: 1.5 });
  const rows = [
    ['Tailgating + anti-passback', 'Critical', 'Staff Door D-214 · 5 linked alarms', 'Investigation: AI summary, linked alarms → SOP Flow', 'Critical step: Lock / Secure door, hard anti-passback', 'Escalate (pre-filled) → Close', '02 · 03 · 10 · 12'],
    ['Identity spoofing', 'Warning', 'T1 Door C2 · impossible presence', 'Investigation: A17 vs C2 cameras, legacy SSID', 'Escalate → suspend card (both SSIDs)', 'Incident Management', '04'],
    ['Unattended bag', 'Warning', 'Gate B12 · owner located', 'SOP Flow: steps 1–4 done by Co-pilot', 'Critical step: Approve dispatch to owner', 'Acknowledge', '05'],
    ['Watchlist person loitering', 'Warning', 'Row K · verify match first', 'SOP Flow: verification step first', 'Critical step: Confirm match / Not a match', 'Escalate or Clear', '06'],
    ['Fight detection', 'Warning', 'Belt 5 · video + audio', 'Investigation: aggression, crowd, responders', 'Escalate → dispatch officers, medical standby', 'Incident Management', '07'],
    ['Overstay', 'Info', 'Baggage Hall B2 · 4 rules triggered', 'Investigation: airport rules (i)–(v)', 'Acknowledge after radio check', 'Acknowledge', '08'],
    ['AGIL Fence + LiDAR', 'Critical', 'Fence Sector 5 · LiDAR-verified', 'Investigation: fence + LiDAR + thermal', 'Escalate → vehicle patrol, ATC alert', 'Incident Management', '09'],
    ['Ask Co-pilot (natural language)', null, 'Search bar: "Show critical incidents in T5…"', 'Answer dropdown with result cards', 'Locate / open the alert from a result', '—', '11'],
  ];
  const SC = { Critical: '#D72D30', Warning: '#B89A1E', Info: '#2E8FA0' };
  rows.forEach(([uc, sev, card, open, dec, close, fr], i) => {
    const y = ty + 22 + i * 78;
    let r = text(tx, y + 24, uc, { size: 15, weight: 700, fill: INK });
    if (sev) r += rect(tx, y + 34, textWidth(sev, 11.5, 500) + 14, 18, { r: 6, fill: SC[sev] }) + text(tx + 7, y + 47, sev, { size: 11.5, weight: 500, fill: '#FFFFFF' });
    const cell = (dx, str, w) => wrap(str, w, 13.5).slice(0, 3).map((l, j) => text(tx + dx, y + 24 + j * 18, l, { size: 13.5, fill: INK })).join('');
    r += cell(230, card, 270) + cell(520, open, 320) + cell(860, dec, 290) + cell(1170, close, 190);
    r += text(tx + 1380, y + 24, fr, { size: 14, weight: 700, fill: '#1B55A6' });
    r += line(tx, y + 66, 1540, y + 66, { stroke: LINE });
    s += g(F, 'Path ' + uc, r);
  });
  s += text(60, 1040, 'Suggested live demo order: 01 Home → 02/03 Tailgating → 10 Escalate → 12 Incident Management → 11 Ask Co-pilot, then 04–09 as time allows.', { size: 13.5, weight: 500, fill: INK });
  return F.render(s);
}
