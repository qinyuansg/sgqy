// AgilFence flow board: the nine steps on one wide frame (dark V11 style), each with a preview
// of its frame, the time, a one-line caption and who acts. Embeds JPEG previews of the frames.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, text, rich, para, icon, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C } from '../lib/v11.mjs';

let THUMBS = null;
export function useThumbs(dir) { THUMBS = dir; }
const thumb = name => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(THUMBS, name + '.jpg')).toString('base64');

const AMBER = '#D4B741', BLUE = '#3EA9FF', LAV = C.copilot, WHITE = '#FFFFFF', GREEN = '#44AC0C';
const ROLES = { sensor: ['AgilFence', AMBER], system: ['System', BLUE], copilot: ['Co-pilot', LAV], operator: ['Operator', WHITE], patrol: ['Patrol', GREEN] };

export const STEPS = [
  { n: 1, frame: 'AF-01-perimeter-triggered', w: 1400, time: 'T+0 s · 02:14:58', title: 'Perimeter triggered', cap: 'Someone climbs segment 5-14. AgilFence feels the strain in the fibre and pinpoints the segment.', who: ['sensor'] },
  { n: 2, frame: 'AF-02-system-message-alarm', w: 1400, time: 'T+1 s · 02:14:59', title: 'System message and alarm', cap: 'A system message, an alarm tone and a Critical card. The pin drops on the airport model.', who: ['system'] },
  { n: 3, frame: 'AF-03-incident-list', w: 1600, time: 'T+7 s · 02:15:05', title: 'Alarm in the incident list', cap: 'PER-005 tops the incident list with fence, LiDAR and camera alarms linked into one.', who: ['system', 'copilot'] },
  { n: 4, frame: 'AF-04-locate-nearest-cameras', w: 1400, time: 'T+8 s · 02:15:06', title: 'Locate: nearest camera', cap: 'One click flies the model to 5-14 and ranks the nearest cameras. PTZ 7-02 is already on preset.', who: ['operator', 'system'] },
  { n: 5, frame: 'AF-05-ptz-films-the-area', w: 1400, time: 'T+14 s · 02:15:12', title: 'PTZ films the area', cap: 'Live thermal shows one person, 1.7 m. The clip from before the alarm is already saved.', who: ['system', 'copilot'] },
  { n: 6, frame: 'AF-06-command-centre-video-wall', w: 1920, time: 'T+20 s · 02:15:18', title: 'Command-centre video wall', cap: 'Live, wide, replay, LiDAR, map and fence trace on the wall: one picture for the whole room.', who: ['system', 'operator'] },
  { n: 7, frame: 'AF-07-sop-approve-dispatch', w: 1400, time: 'T+32 s · 02:15:30', title: 'Operator runs the SOP', cap: 'Verify, then approve the dispatch and inform Airside Ops and the tower. The system ticks the routine steps.', who: ['operator', 'system', 'copilot'] },
  { n: 8, frame: 'AF-08-patrol-on-scene', w: 1400, time: 'T+3 min 10 s · 02:18:08', title: 'Patrol on scene', cap: 'Patrol P-3 holds the person inside the fence line, 150 m short of runway 02L.', who: ['patrol', 'operator'] },
  { n: 9, frame: 'AF-09-close-and-report', w: 1600, time: 'T+17 min 42 s · 02:32:40', title: 'Close and report', cap: 'Closed with a response timeline, an evidence pack and a report drafted by Co-pilot.', who: ['operator', 'copilot'] },
];

function chip(F, x, y, k) {
  const [lab, col] = ROLES[k], w = textWidth(lab, 14, 500) + 30;
  return { svg: rect(x, y, w, 26, { r: 13, fill: '#1D232C', stroke: col, so: 0.75 }) + circle(x + 13, y + 13, 4.5, { fill: col }) + text(x + 23, y + 18, lab, { size: 14, weight: 500, fill: '#FFFFFF' }), w };
}

export function flowBoard() {
  const BW = 3480, BH = 2040;
  const F = new Frame('AF-FLOW · AgilFence end to end · flow board', BW, BH);
  let s = rect(0, 0, BW, BH, { fill: '#05080D' });
  // faint grid
  let gr = '';
  for (let x = 0; x <= BW; x += 80) gr += line(x, 0, x, BH, { stroke: '#2A62C9', so: 0.06 });
  for (let y = 0; y <= BH; y += 80) gr += line(0, y, BW, y, { stroke: '#2A62C9', so: 0.06 });
  s += g(F, 'Grid', gr);
  // heading
  s += text(100, 120, 'END-TO-END FLOW · AGILFENCE × AGIL SECURE V11', { size: 20, weight: 700, ls: 2.5, fill: AMBER });
  s += text(100, 196, 'From a climb on the fence to a confirmed response', { size: 64, weight: 700, fill: '#FFFFFF' });
  s += text(100, 248, 'Fence Sector 5 · Segment 5-14 · north perimeter, 150 m from runway 02L · 02:14:58', { size: 26, fill: C.t2 });
  s += rect(2960.5, 92.5, 420, 44, { r: 22, fill: '#1D232C', stroke: '#4A505B' }) + text(3170.5, 121, 'Illustrative scenario · simulated data', { size: 18, weight: 500, fill: C.t3, anchor: 'middle' });
  let lx = 2360;
  s += text(lx, 196, 'WHO ACTS', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  for (const k of Object.keys(ROLES)) { const c = chip(F, lx, 212, k); s += c.svg; lx += c.w + 10; }
  // two rows of cards: 1–5, 6–9 (+ outcome)
  const cw = 600, gap = 70, th = 458, x0 = 100;
  const rows = [[0, 1, 2, 3, 4], [5, 6, 7, 8]];
  const rowY = [320, 1160];
  const pos = [];
  rows.forEach((idx, r) => idx.forEach((i, j) => pos[i] = [x0 + j * (cw + gap), rowY[r]]));
  STEPS.forEach((st, i) => {
    const [x, y] = pos[i];
    const tw = cw, tk = tw / st.w, tH = Math.min(th, 1069 * tk * (st.w === 1920 ? 1069 / 1080 : 1));
    let c = rect(x, y, cw, 740, { r: 20, fill: '#11161E', stroke: i === 0 ? AMBER : '#2B3442', sw: i === 0 ? 2 : 1.2 });
    // number + time + title
    c += circle(x + 40, y + 44, 22, { fill: i === 0 ? AMBER : C.blue }) + text(x + 40, y + 52, String(st.n), { size: 22, weight: 700, fill: i === 0 ? '#111111' : '#FFFFFF', anchor: 'middle' });
    c += text(x + 76, y + 38, st.time, { size: 17, weight: 500, fill: i === 0 ? AMBER : '#8FC4FF' }) + text(x + 76, y + 64, st.title, { size: 25, weight: 700, fill: '#FFFFFF' });
    // preview
    const py = y + 90, ph = st.w === 1920 ? cw * 1080 / 1920 : cw * 1069 / st.w;
    const clip = F.clip(`<rect x="${x + 1}" y="${py}" width="${cw - 2}" height="${f(Math.min(ph, th))}"/>`);
    c += `<g clip-path="${clip}">${image(F, 'Preview ' + st.frame, thumb(st.frame), x + 1, py, cw - 2, ph)}</g>`;
    c += rect(x + 1, py, cw - 2, Math.min(ph, th), { stroke: '#2B3442' });
    // caption + actors
    const cy = py + Math.min(ph, th) + 36;
    wrap(st.cap, cw - 48, 19).slice(0, 3).forEach((l, j) => { c += text(x + 24, cy + j * 27, l, { size: 19, fill: C.t1 }); });
    let ax = x + 24;
    for (const k of st.who) { const ch = chip(F, ax, y + 740 - 46, k); c += ch.svg; ax += ch.w + 8; }
    c += text(x + cw - 24, y + 740 - 27, st.frame.slice(0, 5), { size: 14, weight: 500, fill: '#5C6675', anchor: 'end' });
    s += g(F, `Step ${st.n} · ${st.title}`, c);
  });
  // arrows between cards
  let ar = '';
  const arrowH = (x1, x2, y) => pathEl(`M${x1 + 8} ${y} L${x2 - 10} ${y} M${x2 - 22} ${y - 10} L${x2 - 10} ${y} L${x2 - 22} ${y + 10}`, { stroke: '#8C96A6', sw: 3, cap: 'round', join: 'round' });
  rows.forEach(idx => idx.slice(0, -1).forEach(i => { const [x, y] = pos[i]; ar += arrowH(x + cw, x + cw + gap, y + 320); }));
  // row 1 → row 2: from card 5 down and back to card 6
  {
    const [x5, y5] = pos[4], [x6, y6] = pos[5], yy = y5 + 740 + 40;
    ar += pathEl(`M${x5 + cw / 2} ${y5 + 748} L${x5 + cw / 2} ${yy - 14} Q${x5 + cw / 2} ${yy} ${x5 + cw / 2 - 14} ${yy} L${x6 + cw / 2 + 14} ${yy} Q${x6 + cw / 2} ${yy} ${x6 + cw / 2} ${yy + 14} L${x6 + cw / 2} ${y6 - 10} M${x6 + cw / 2 - 10} ${y6 - 22} L${x6 + cw / 2} ${y6 - 10} L${x6 + cw / 2 + 10} ${y6 - 22}`, { stroke: '#8C96A6', sw: 3, cap: 'round', join: 'round' });
  }
  s += g(F, 'Arrows', ar);
  // outcome card (row 2, slot 5)
  {
    const x = x0 + 4 * (cw + gap), y = rowY[1];
    let o = rect(x, y, cw, 740, { r: 20, fill: '#0D1A14', stroke: GREEN, so: 0.7, sw: 1.5 });
    o += text(x + 32, y + 56, 'OUTCOME', { size: 16, weight: 700, ls: 2, fill: GREEN }) + text(x + 32, y + 98, 'Climb to patrol on scene', { size: 30, weight: 700, fill: '#FFFFFF' });
    o += text(x + 32, y + 196, '3 min 10 s', { size: 92, weight: 700, fill: '#FFFFFF' });
    o += text(x + 32, y + 236, 'Person held 150 m short of runway 02L', { size: 20, fill: C.t1 });
    const kp = [['Alert on screen', '1 s'], ['Camera on target', '5 s'], ['Verified on video', '26 s'], ['Patrol dispatched', '32 s'], ['Airside Ops / tower told', '40 s'], ['Incident closed', '17 min 42 s']];
    kp.forEach(([l, v], i) => { const yy = y + 296 + i * 54; o += line(x + 32, yy - 32, x + cw - 32, yy - 32, { stroke: '#22382C' }) + text(x + 32, yy, l, { size: 20, fill: C.t1 }) + text(x + cw - 32, yy, v, { size: 22, weight: 700, fill: '#FFFFFF', anchor: 'end' }); });
    o += text(x + 32, y + 640, 'Illustrative scenario timings.', { size: 16, fill: C.t2 });
    o += text(x + 32, y + 690, 'The fence feels it. The system shows it.', { size: 21, weight: 500, fill: AMBER }) + text(x + 32, y + 718, 'Your team acts on it.', { size: 21, weight: 500, fill: AMBER });
    s += g(F, 'Outcome', o);
  }
  s += text(100, 1980, 'Frames AF-01 to AF-09 are in the same file, at full size. Elements marked NEW in layer names are additions to the current V11 UI; everything else is today’s V11.', { size: 20, fill: C.t2 });
  return F.render(s);
}
