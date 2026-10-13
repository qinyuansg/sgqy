import { Frame, T, SEV, f, rect, circle, line, text, rich, para, icon, g, textWidth } from '../lib/svg.mjs';
import { L, AI, backdrop, shell, surface, card, chip, chips, button, iconBtn, overline, hair, aiMark, aiGrad, keycap, thumb, img, boxes, bubbleUser, factors } from '../lib/ui.mjs';
import { airport } from '../lib/twin.mjs';
import { INCIDENTS } from './data.mjs';

export default function copilot() {
  const F = new Frame('12 · Co-pilot — Natural-language operations');
  // dimmed overview behind a Spotlight-style sheet
  let s = backdrop(F) + shell(F, { active: 4, ask: 'Show all critical incidents in Terminal 5 during the last hour', askCol: T.t1 });
  s += g(F, 'Dimmed overview', airport(F, 112, 90, 1784, 980, { pins: INCIDENTS.map(i => ({ id: i.id, X: i.X, Y: i.Y, sev: i.sev, icon: i.icon, label: i.short })), headroom: 20 }).svg);
  s += rect(L.rail, L.top, F.w - L.rail, F.h - L.top, { fill: '#05070D', fo: 0.72 });

  const x = 300, y = 96, w = 1320, h = 936;
  let p = surface(F, x, y, w, h, { r: 26, fill: F.lin([[0, '#131C30', 0.97], [1, '#0B111E', 0.97]], 0, 0, 0, 1), shadow: true, so: 0.1 });
  p += rect(x, y, w, h, { r: 26, stroke: aiGrad(F), sw: 1.5, so: 0.55 });
  // query bar
  p += aiMark(F, x + 28, y + 26, 36);
  p += text(x + 80, y + 52, 'Show all critical incidents in Terminal 5 during the last hour', { size: 20, weight: 500, fill: T.t1 });
  p += keycap(F, x + w - 108, y + 34, 'esc') + icon(F, 'mic', x + w - 56, y + 33, 24, T.t2);
  p += hair(x, y + 88, x + w, { so: 0.08 });

  // left: conversation thread
  const cx = x + 32, cw = 560;
  let c = '';
  let cy = y + 116;
  c += overline(cx, cy, 'Answer'); cy += 22;
  c += para(cx, cy, 'Two critical incidents in T5 in the last hour. One is closed; one still needs a decision.', cw, { size: 15, lh: 22, fill: T.t1 }).svg; cy += 56;
  const res = [
    ['INC-2409', 'Door forced · T5 Pier B service door', 'Critical', 'Open · awaiting decision', T.high, '01:47'],
    ['INC-2405', 'Fence alarm · Sector 15, near T5 apron', 'Critical', 'Closed · LiDAR: wildlife', T.ok, '01:22'],
  ];
  res.forEach(([id, t, sev, st, col, tm], i) => {
    const yy = cy + i * 74;
    c += rect(cx, yy, cw, 64, { r: 14, fill: '#FFFFFF', fo: 0.04, stroke: i === 0 ? T.blue : '#FFFFFF', so: i === 0 ? 0.5 : 0.08 });
    c += rect(cx + 14, yy + 14, 36, 36, { r: 10, fill: T.crit, fo: 0.14 }) + icon(F, i ? 'fence' : 'door', cx + 22, yy + 22, 20, T.crit, 1.9);
    c += text(cx + 62, yy + 28, t, { size: 14, weight: 600, fill: T.t1 }) + rich(cx + 62, yy + 47, [{ t: id + ' · ' + tm + ' · ', fill: T.t3 }, { t: st, fill: col, weight: 600 }], { size: 12 });
    c += icon(F, 'chevR', cx + cw - 32, yy + 22, 20, T.t3, 2);
  });
  cy += 160;
  // follow-up: why high priority
  const u = bubbleUser(F, cx, cy, cw, 'Why is the Pier B door alarm considered high priority?'); c += u.svg; cy += u.h + 18;
  c += aiMark(F, cx, cy, 24);
  c += para(cx + 36, cy + 16, 'Because three things line up, not because of the door alone:', cw - 36, { size: 14, lh: 21, fill: T.t1 }).svg; cy += 34;
  c += factors(F, cx + 36, cy + 4, cw - 36, [
    { label: 'Door leads directly airside (Pier B)', v: 0.34, color: T.crit },
    { label: 'No badge 30 s before or after', v: 0.28, color: T.crit },
    { label: 'Person seen on CAM 5-212 moving away', v: 0.22, color: T.high },
  ], { gap: 38 });
  cy += 124;
  c += text(cx + 36, cy, 'Sources', { size: 12, weight: 600, fill: T.t3 });
  c += chips(F, cx + 96, cy - 16, [{ label: 'SOP-SEC-014 §3.2', icon: 'doc' }, { label: 'Event log · 6 events', icon: 'list' }, { label: 'CAM 5-212', icon: 'video' }].map(o => ({ ...o, color: T.ice, bgo: 0.1, h: 24, size: 11.5 })), 6).svg;
  cy += 40;
  c += button(F, cx + 36, cy, 170, 40, 'Open INC-2409', { kind: 'primary', size: 14, icon: 'chevR' }) + button(F, cx + 216, cy, 150, 40, 'Track person', { kind: 'secondary', size: 14, icon: 'route' }) + button(F, cx + 376, cy, 150, 40, 'Share summary', { kind: 'secondary', size: 14, icon: 'send' });
  cy += 64;
  c += rect(cx + 36, cy, cw - 36, 58, { r: 12, fill: '#FFFFFF', fo: 0.03, stroke: '#FFFFFF', so: 0.06 }) + icon(F, 'shieldCheck', cx + 50, cy + 17, 22, T.ok, 1.8);
  c += text(cx + 84, cy + 25, 'Every answer cites its sources.', { size: 12.5, weight: 600, fill: T.t1 }) + text(cx + 84, cy + 43, 'Co-pilot only reads data you are cleared for and never acts on its own.', { size: 12, fill: T.t3 });
  // ask input
  c += rect(cx, y + h - 140, cw, 50, { r: 25, fill: '#FFFFFF', fo: 0.05, stroke: aiGrad(F), sw: 1.2, so: 0.6 }) + text(cx + 20, y + h - 109, 'Ask a follow-up…', { size: 14, fill: T.t3 }) + circle(cx + cw - 25, y + h - 115, 18, { fill: T.blue2 }) + icon(F, 'send', cx + cw - 35, y + h - 125, 20, '#FFFFFF', 2);
  c += text(cx, y + h - 64, 'Try asking', { size: 12, weight: 600, fill: T.t3 });
  c += chips(F, cx, y + h - 52, ['Where was this person last detected?', 'Show cameras around the incident'].map(t => ({ label: t, color: T.t2, bgo: 0.06, weight: 500, h: 28, size: 12.5 })), 8).svg;
  p += g(F, 'Conversation', c);
  p += line(x + 624, y + 108, x + 624, y + h - 24, { stroke: '#FFFFFF', so: 0.07 });

  // right: results canvas
  const rx = x + 652, rw = w - 652 - 32;
  let r = text(rx, y + 126, 'INC-2409 · Door forced · T5 Pier B service door', { size: 16, weight: 600, fill: T.t1 });
  r += chips(F, rx, y + 140, [{ label: 'Critical', color: T.crit, dot: true }, { label: 'Awaiting decision', color: T.high, icon: 'hand' }, { label: 'T5 · Pier B · Level 1', color: T.t2, bgo: 0.07, weight: 500 }], 8).svg;
  // cameras around the incident
  r += overline(rx, y + 202, 'Cameras around the incident · 4');
  const tw = (rw - 16) / 2;
  const cams = [['door', 'CAM 5-210 · Service door', boxes('door').tail], ['corridor', 'CAM 5-212 · Pier B corridor', boxes('corridor').person], ['trail_walk', 'CAM 5-215 · Gate B30', null], ['gate', 'CAM 5-219 · Holdroom B32', null]];
  cams.forEach(([im, lab, bx], i) => {
    const tx = rx + (i % 2) * (tw + 16), ty = y + 216 + Math.floor(i / 2) * (tw * 9 / 16 + 46);
    r += thumb(F, lab, tx, ty, tw, img(im + '_clean'), { box: bx, color: T.crit, active: i === 1, tag: lab, label: i === 1 ? 'Last detected here · 01:49:30' : '', sub: i === 1 ? 'Heading to Gate B30 · tracking' : '' });
  });
  // person track
  const py = y + 640;
  r += overline(rx, py, 'Where was this person last detected?');
  const trk = [['01:47:12', 'CAM 5-210', 'Service door', T.crit], ['01:48:05', 'CAM 5-211', 'Stairwell B', T.high], ['01:49:30', 'CAM 5-212', 'Pier B corridor', T.high], ['predicted', 'Gate B30', 'in ~2 min', T.t3]];
  const step = (rw - 40) / (trk.length - 1);
  trk.forEach(([t, cam, where, col], i) => {
    const xx = rx + 20 + i * step;
    if (i < trk.length - 1) r += line(xx + 10, py + 32, xx + step - 10, py + 32, { stroke: i === 2 ? T.t3 : T.high, sw: 1.5, dash: i === 2 ? '4 4' : undefined, so: 0.8 });
    r += circle(xx, py + 32, 8, { fill: i === 3 ? '#0B111E' : col, stroke: col, sw: 2 });
    const anc = i === 0 ? 'start' : i === trk.length - 1 ? 'end' : 'middle', ax = i === 0 ? xx - 8 : i === trk.length - 1 ? xx + 8 : xx;
    r += text(ax, py + 62, cam, { size: 12.5, weight: 600, fill: T.t1, anchor: anc }) + text(ax, py + 79, where + ' · ' + t, { size: 11.5, fill: T.t3, anchor: anc });
  });
  // mini timeline strip
  const sy = y + h - 150;
  r += overline(rx, sy, 'Last hour in T5');
  const sx0 = rx, sx1 = rx + rw;
  r += rect(sx0, sy + 22, rw, 6, { r: 3, fill: '#FFFFFF', fo: 0.07 });
  [[0.38, T.crit, '01:22'], [0.78, T.crit, '01:47'], [0.15, T.t4], [0.27, T.t4], [0.5, T.t4], [0.55, T.t4], [0.62, T.t4], [0.9, T.t4]].forEach(([t, col, lab]) => {
    const xx = sx0 + rw * t;
    r += circle(xx, sy + 25, lab ? 7 : 4, { fill: col, stroke: '#0B111E', sw: 2 });
    if (lab) r += text(xx, sy + 52, lab, { size: 11.5, weight: 600, fill: T.t1, anchor: 'middle' });
  });
  r += text(sx0, sy + 74, '01:16', { size: 11, fill: T.t3 }) + text(sx1, sy + 74, '02:16', { size: 11, fill: T.t3, anchor: 'end' });
  r += rich(sx0, sy + 104, [{ t: '2 critical', fill: T.t1, weight: 600 }, { t: '  ·  6 lower-priority alarms auto-closed  ·  ', fill: T.t3 }, { t: 'Less navigation, faster answers, clear reasons.', fill: T.t2 }], { size: 12.5 });
  p += g(F, 'Results canvas', r);
  s += g(F, 'Co-pilot sheet', p);
  return F.render(s);
}
