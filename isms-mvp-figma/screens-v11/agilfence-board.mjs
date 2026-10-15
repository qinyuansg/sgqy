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
const ROLES = { sensor: ['AgilFence', AMBER], system: ['AGIL Secure (auto)', BLUE], copilot: ['Co-pilot (concept)', LAV], operator: ['People decide', WHITE], patrol: ['Patrol', GREEN] };

export const STEPS = [
  { n: 1, frame: 'AF-01-perimeter-triggered', w: 1400, time: '02:14:58', title: 'Perimeter triggered', cap: 'Someone climbs segment 5-14. The strain rises above the wind and AgilFence pinpoints the segment.', who: ['sensor'], today: true },
  { n: 2, frame: 'AF-02-system-message-alarm', w: 1400, time: '02:14:59', title: 'System message and alarm', cap: 'A system message, an alarm tone, a Critical card and a pin on the airport model.', who: ['system'] },
  { n: 3, frame: 'AF-03-incident-list', w: 1600, time: '02:15:05', title: 'Alarm in the incident list', cap: 'PER-005 tops the incident list: the fence and LiDAR alarms and the camera call-up, linked.', who: ['system', 'copilot'] },
  { n: 4, frame: 'AF-04-locate-nearest-cameras', w: 1400, time: '02:15:08', title: 'Locate: nearest camera', cap: 'One click flies the map to 5-14 and lists the nearest cameras. iPAMS has PTZ 7-02 on preset.', who: ['operator', 'system'] },
  { n: 5, frame: 'AF-05-ptz-films-the-area', w: 1400, time: '02:15:12', title: 'PTZ films the area', cap: 'One more click takes PTZ 7-02 live: one person, 1.7 m, auto-tracked. The pre-alarm replay is kept.', who: ['operator', 'system', 'copilot'] },
  { n: 6, frame: 'AF-06-command-centre-video-wall', w: 1920, time: '02:15:18', title: 'Command-centre video wall', cap: 'Live, wide, replay, LiDAR, map and fence trace on the wall: one picture for the whole room.', who: ['system', 'operator'] },
  { n: 7, frame: 'AF-07-sop-approve-dispatch', w: 1400, time: '02:15:24 – 02:16:00', title: 'Operator runs the SOP', cap: 'Works check, verify, dispatch Patrol 2, inform Airside Ops and the tower; the duty manager approves the police call.', who: ['operator', 'system'] },
  { n: 8, frame: 'AF-08-patrol-on-scene', w: 1400, time: '02:18:08', title: 'Patrol on scene', cap: 'Patrol 2 (two officers) reaches the person inside the fence line, short of the runway, and holds for the police.', who: ['patrol', 'operator'] },
  { n: 9, frame: 'AF-09-close-and-report', w: 1600, time: '02:44:20', title: 'Close and report', cap: 'Closed by Nurul, signed off by Daniel: incident timeline, locked evidence and a report draft.', who: ['operator', 'copilot'] },
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
  // what CAG has today vs what AGIL Secure V11 adds
  s += g(F, 'Today vs added', rect(100, 272, 12, 12, { r: 3, fill: AMBER }) + text(122, 284, 'Today with AgilFence + iPAMS: sensing, pinpointing, PTZ preset call-up (step 1)', { size: 17, fill: C.t1 }) +
    rect(1000, 272, 12, 12, { r: 3, fill: BLUE }) + text(1022, 284, 'AGIL Secure V11 with proposed concept features: one incident, Locate, live view, video wall, SOP, record (steps 2–9)', { size: 17, fill: C.t1 }) +
    rect(2140, 270, 16, 16, { r: 3, stroke: '#8C96A6', dash: '4 3', sw: 1.5 }) + text(2166, 284, 'Concepts (NEW layers): auto-linking, nearest cameras, one-click live, wall layout, timeline, evidence pack, Co-pilot', { size: 17, fill: C.t2 }));
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
    c += text(x + 76, y + 38, st.time, { size: 18, weight: 600, fill: i === 0 ? AMBER : '#8FC4FF' }) + text(x + 76, y + 64, st.title, { size: 25, weight: 700, fill: '#FFFFFF' });
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
  // scenario clock (row 2, slot 5): clock times only, no durations
  {
    const x = x0 + 4 * (cw + gap), y = rowY[1];
    let o = rect(x, y, cw, 740, { r: 20, fill: '#0D1A14', stroke: GREEN, so: 0.7, sw: 1.5 });
    o += text(x + 32, y + 56, 'SCENARIO CLOCK · ILLUSTRATIVE', { size: 16, weight: 700, ls: 2, fill: GREEN }) + text(x + 32, y + 98, 'From a climb to a closed incident', { size: 28, weight: 700, fill: '#FFFFFF' });
    const kp = [['Climb on segment 5-14', '02:14:58'], ['Verified on video', '02:15:24'], ['Patrol 2 sent', '02:15:30'], ['Tower informed', '02:15:40'], ['Police call approved', '02:16:00'], ['Patrol on scene', '02:18:08'], ['Police custody', '02:26:30'], ['Closed and signed off', '02:44:20']];
    kp.forEach(([l, v], i) => { const yy = y + 160 + i * 52; o += line(x + 32, yy - 32, x + cw - 32, yy - 32, { stroke: '#22382C' }) + text(x + 32, yy, l, { size: 20, fill: C.t1 }) + text(x + cw - 32, yy, v, { size: 22, weight: 700, fill: '#FFFFFF', anchor: 'end' }); });
    o += text(x + 32, y + 664, 'AgilFence feels it. AGIL Secure shows it.', { size: 21, weight: 500, fill: AMBER }) + text(x + 32, y + 692, 'Your team acts on it.', { size: 21, weight: 500, fill: AMBER });
    s += g(F, 'Outcome', o);
  }
  s += text(100, 1972, 'Restricted: for CAG security and airside operations stakeholders · not for public display. Names, times, layout and distances are simulated and stylised.', { size: 19, fill: C.t2 });
  s += text(100, 2004, 'Next: a live AGIL Secure V11 walkthrough on your AgilFence alarms, and an SOP-mapping workshop with your team.', { size: 19, weight: 500, fill: '#FFFFFF' });
  s += text(3380, 2004, 'Frames AF-01 to AF-09 follow at full size', { size: 19, fill: C.t2, anchor: 'end' });
  return F.render(s);
}
