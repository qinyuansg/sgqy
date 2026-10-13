import { T, SEV, f, rect, circle, line, pathEl, poly, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, surface, chip, overline, hair } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';
import { evidenceCard } from './tailgate.mjs';

export default function fence() {
  const B = boxes('thermal');
  return workspace('11 · Incident — Perimeter intrusion (AGIL Fence + LiDAR)', {
    id: 'INC-2416', sev: 'Critical', icon: 'fence', title: 'Perimeter intrusion at Fence Sector 5', status: 'Awaiting your decision',
    tags: ['North perimeter · Segment 5-14', 'LiDAR-verified'], conf: 91, confNote: 'High · fence + LiDAR + thermal', age: '2m 05s',
  }, {
    summary: 'AGIL Fence picked up a climb signature on segment 5-14 at 02:14:58. LiDAR confirms one human-sized object (1.7 m) at the fence line, and PTZ 7-02 turned to it automatically: thermal shows one person. Runway 02L is 150 m away.',
    sources: ['AGIL Fence', 'LiDAR', 'PTZ thermal', 'Weather'],
    factors: [
      { label: 'Climb signature on segment 5-14', v: 0.30, color: T.crit },
      { label: 'LiDAR: human-sized object, 1.7 m', v: 0.28, color: T.crit },
      { label: 'Active runway 02L · 150 m', v: 0.18, color: T.high },
      { label: 'Wind 12 km/h · below nuisance level', v: 0.06, color: T.t3 },
    ],
    signals: [
      { t: '02:14:58', title: 'Climb signature', sub: 'AGIL Fence · segment 5-14', icon: 'fence', color: T.crit },
      { t: '02:15:01', title: 'Object 1.7 m at fence', sub: 'LiDAR L-5B', icon: 'radar', color: T.crit },
      { t: '02:15:03', title: 'PTZ 7-02 slewed to target', sub: 'Automatic camera control', icon: 'camera', color: T.blue },
      { t: '02:15:12', title: 'Thermal: 1 person', sub: 'Video analytics', icon: 'thermo', color: T.crit },
    ],
    signalGap: 62,
    center: (F, c) => {
      const ev = evidenceCard(F, c.x, c.y, c.w, 'thermal', {
        title: 'Evidence', sub: 'Camera turned automatically', tabs: ['PTZ 7-02 thermal', 'PTZ 7-02 visible', 'LiDAR 3D'],
        player: { cam: 'PTZ 7-02 · Thermal · Sector 5', boxes: [{ b: B.person, color: T.crit, label: 'Person · 1.7 m', sub: 'At fence' }], markers: [{ t: 0.45, color: T.crit }, { t: 0.5, color: T.crit }, { t: 0.56, color: T.blue }], now: 0.9, tStart: '02:14:20', tEnd: '02:15:40' },
      });
      let s = ev.svg;
      const my = ev.y2 + 16, mh = c.y1 - my, w1 = 470, w2 = c.w - w1 - 16;
      // sector schematic: fence segments, LiDAR points, PTZ fov, runway
      let m1 = text(c.x + 22, my + 36, 'Sector 5 · north perimeter', { size: 15, weight: 600, fill: T.t1 });
      const px = c.x + 22, py = my + 52, pw = w1 - 44, ph = mh - 70;
      m1 += rect(px, py, pw, ph, { r: 12, fill: '#FFFFFF', fo: 0.03, stroke: '#FFFFFF', so: 0.06 });
      m1 += rect(px + 12, py + ph - 34, pw - 24, 18, { r: 3, fill: '#FFFFFF', fo: 0.07 }) + text(px + 20, py + ph - 21, 'Runway 02L', { size: 10.5, fill: T.t3 });
      const fy = py + 38, n = 9, sw = (pw - 24) / n;
      for (let i = 0; i < n; i++) {
        const al = i === 4;
        m1 += rect(px + 12 + i * sw + 1, fy, sw - 2, 6, { r: 2, fill: al ? T.crit : T.teal, fo: al ? 1 : 0.55 });
        m1 += text(px + 12 + i * sw + sw / 2, fy - 8, '5-' + (10 + i), { size: 10, fill: al ? T.crit : T.t3, anchor: 'middle' });
      }
      const ax_ = px + 12 + 4.5 * sw, ay = fy + 3;
      let pts = '';
      for (let k = 0; k < 26; k++) { const a = (k * 137.5) % 360 * Math.PI / 180, r = 3 + (k % 7) * 1.6; pts += circle(ax_ + Math.cos(a) * r, ay + 10 + Math.sin(a) * r * 1.6, 1.6, { fill: T.teal }); }
      m1 += pathEl(`M${f(ax_ + 70)} ${f(fy + 70)} L${f(ax_ - 20)} ${f(ay + 4)} L${f(ax_ + 30)} ${f(ay - 2)} Z`, { fill: T.blue, fo: 0.14, stroke: T.blue, so: 0.4 });
      m1 += circle(ax_ + 70, fy + 70, 6, { fill: T.blue }) + text(ax_ + 82, fy + 74, 'PTZ 7-02', { size: 10.5, fill: T.t2 });
      m1 += g(F, 'LiDAR points', pts) + text(ax_ - 60, fy + 50, 'LiDAR L-5B', { size: 10.5, fill: T.teal });
      s += g(F, 'Module Sector map', surface(F, c.x, my, w1, mh) + m1);
      // nuisance filtered
      const ax = c.x + w1 + 16;
      let m2 = text(ax + 22, my + 36, 'Filtered tonight', { size: 15, weight: 600, fill: T.t1 }) + text(ax + w2 - 22, my + 36, 'Not shown to you', { size: 12.5, fill: T.t3, anchor: 'end' });
      [['23:12', 'Segment 3-07', 'Wind gust 41 km/h · LiDAR: no object'], ['00:47', 'Segment 9-02', 'Animal, 0.4 m · LiDAR classified'], ['01:33', 'Segment 2-11', 'Planned maintenance window']].forEach(([t, seg, why], i) => {
        const yy = my + 56 + i * 50;
        m2 += text(ax + 22, yy + 16, t, { size: 12, weight: 600, fill: T.t2 }) + text(ax + 72, yy + 16, seg, { size: 13, weight: 600, fill: T.t1 }) + text(ax + 72, yy + 34, why, { size: 11.5, fill: T.t3 });
        m2 += chip(F, ax + w2 - 22 - 92, yy + 4, 'Auto-closed', { color: T.ok, size: 11, h: 22 }).svg;
        if (i < 2) m2 += hair(ax + 22, yy + 44, ax + w2 - 22);
      });
      s += g(F, 'Module Nuisance filtered', surface(F, ax, my, w2, mh) + m2);
      return s;
    },
    sop: 'SOP-PER-003',
    planSub: 'Perimeter breach near active runway · SOP-PER-003',
    plan: [
      { title: 'Dispatch vehicle patrol V-3', sub: 'Gate G5 · ETA 2 min', state: 'approve' },
      { title: 'Alert ATC: runway 02L risk', sub: 'Tower hotline · pre-filled', state: 'approve' },
      { title: 'PTZ auto-track target', sub: 'Hand-off between PTZ 7-02 / 7-03', state: 'running' },
      { title: 'Lock airside gate G5', sub: 'Reversible', state: 'pending' },
      { title: 'Create evidence pack & log', sub: 'Fence, LiDAR, thermal clips', state: 'auto' },
    ],
    copilot: {
      q: 'Is this a real intrusion or the wind?',
      a: 'Real. The vibration matches a climb, LiDAR sees a 1.7 m object and thermal shows one person. Wind is only 12 km/h.',
      chips: ['Show LiDAR point cloud', 'Nearest patrol vehicle?', 'Earlier alarms here'],
    },
  });
}
