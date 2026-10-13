import { T, SEV, rect, circle, line, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, surface, chip, overline, hair } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';
import { evidenceCard } from './tailgate.mjs';

export default function overstay() {
  const B = boxes('baghall');
  return workspace('10 · Incident — Overstay in restricted zone', {
    id: 'INC-2411', sev: 'Medium', icon: 'timer', title: 'Overstay in restricted zone · Baggage hall B2', status: 'Awaiting your decision',
    tags: ['T4 · Baggage hall B2', 'In zone 3h 40m'], conf: 73, confNote: 'Medium · rules + behaviour', age: '18m 10s',
  }, {
    summary: 'K. Lim (baggage handler, contractor) badged into B2 at 22:36 and has not badged out. Their shift ended at 01:00 and B2 is not one of their usual duty zones. Last seen standing near ULD row 3 at 02:15, alone.',
    sources: ['Access control', 'Roster', 'CCTV', 'Behaviour baseline'],
    factors: [
      { label: 'Shift ended 01:00 · 1h 16m over', v: 0.24, color: T.med },
      { label: 'Zone outside scope of duty', v: 0.20, color: T.med },
      { label: 'Wee hours (00:00–05:00)', v: 0.14, color: T.med },
      { label: 'Dwell 3h 40m vs 45 min usual', v: 0.15, color: T.med },
    ],
    signals: [
      { t: '22:36', title: 'Badge in · B2 east door', sub: 'Access control · K. Lim', icon: 'key', color: T.ok },
      { t: '01:00', title: 'Shift ended', sub: 'Roster system', icon: 'clock', color: T.t2 },
      { t: '01:45', title: 'Dwell 3× usual', sub: 'Behaviour baseline (90 days)', icon: 'timer', color: T.med },
      { t: '02:15', title: 'Seen near ULD row 3', sub: 'CAM 4-018 · alone', icon: 'video', color: T.blue },
    ],
    signalGap: 62,
    center: (F, c) => {
      const ev = evidenceCard(F, c.x, c.y, c.w, 'baghall', {
        title: 'Evidence', sub: 'Person matched to badge holder', tabs: ['B2 · ULD rows', 'B2 east door', 'Conveyor 4', '+1'],
        player: { cam: 'CAM 4-018 · Baggage hall B2', boxes: [{ b: B.person, color: T.med, label: 'K. Lim · 3h 40m in zone' }], markers: [{ t: 0.9, color: T.med }], now: 0.98, tStart: '22:36', tEnd: '02:16' },
      });
      let s = ev.svg;
      const my = ev.y2 + 16, mh = c.y1 - my, w1 = 500, w2 = c.w - w1 - 16;
      // time in zone vs permitted window (single time axis 22:00 → 03:00)
      let m1 = text(c.x + 22, my + 36, 'Time in zone vs. permitted', { size: 15, weight: 600, fill: T.t1 });
      const gx = c.x + 96, gw = w1 - 120, t0 = 22, t1 = 27, X = h => gx + gw * (h - t0) / (t1 - t0);
      const row = (yy, lab, a, b, col, o = {}) => text(c.x + 22, yy + 13, lab, { size: 12.5, fill: T.t2 }) + rect(gx, yy, gw, 18, { r: 5, fill: '#FFFFFF', fo: 0.04 }) + rect(X(a), yy, X(b) - X(a), 18, { r: 5, fill: col, fo: o.fo ?? 0.85 });
      m1 += row(my + 62, 'Shift', 22, 25, T.ok, { fo: 0.55 });
      m1 += row(my + 96, 'In B2', 22.6, 26.27, T.med);
      m1 += rect(X(25), my + 96, X(26.27) - X(25), 18, { r: 5, fill: T.crit, fo: 0.9 });
      m1 += text(X(25) + 8, my + 109, 'Over 1h 16m', { size: 11, weight: 700, fill: '#0A0F1A' });
      const nx = X(26.27);
      m1 += line(nx, my + 54, nx, my + 124, { stroke: T.t1, sw: 1.5 }) + text(nx, my + 50, 'Now', { size: 11, weight: 600, fill: T.t1, anchor: 'middle' });
      ['22:00', '23:00', '00:00', '01:00', '02:00', '03:00'].forEach((lab, i) => { m1 += text(X(22 + i), my + 140, lab, { size: 11, fill: T.t3, anchor: 'middle' }); });
      m1 += hair(c.x + 22, my + 158, c.x + w1 - 22);
      m1 += rich(c.x + 22, my + 184, [{ t: 'Usual duty zones: ', fill: T.t3 }, { t: 'B1, B4 · Conveyor 1–3', fill: T.t1, weight: 600 }], { size: 12.5 });
      m1 += rich(c.x + 22, my + 206, [{ t: 'Overtime request tonight: ', fill: T.t3 }, { t: 'None', fill: T.med, weight: 600 }], { size: 12.5 });
      s += g(F, 'Module Time in zone', surface(F, c.x, my, w1, mh) + m1);
      // business-analytics rules (from the original airport AI requirement)
      const ax = c.x + w1 + 16;
      let m2 = text(ax + 22, my + 36, 'Rules triggered', { size: 15, weight: 600, fill: T.t1 }) + text(ax + w2 - 22, my + 36, '4 of 5', { size: 12.5, fill: T.t3, anchor: 'end' });
      [['Restricted area in wee hours', true], ['Zone outside scope of duty', true], ['Restricted zone in non-working hours', true], ['Time spent in area > baseline', true], ['Deviation from normal route', false]].forEach(([r, on], i) => {
        const yy = my + 58 + i * 32;
        m2 += circle(ax + 32, yy + 9, 9, { fill: on ? T.med : '#FFFFFF', fo: on ? 0.18 : 0.06 }) + icon(F, on ? 'check' : 'minus', ax + 25, yy + 2, 14, on ? T.med : T.t3, 2.2);
        m2 += text(ax + 50, yy + 14, r, { size: 13, weight: on ? 500 : 400, fill: on ? T.t1 : T.t3 });
      });
      s += g(F, 'Module Rules', surface(F, ax, my, w2, mh) + m2);
      return s;
    },
    sop: 'SOP-ACS-012',
    planSub: 'Overstay · welfare and authorisation check · SOP-ACS-012',
    dismiss: 'Authorised overtime',
    plan: [
      { title: 'Check in with K. Lim by radio', sub: 'Push-to-talk · auto-dial', state: 'approve' },
      { title: 'Notify contractor supervisor', sub: 'Apex Ground · on-duty lead', state: 'pending' },
      { title: 'Welfare check if no reply in 5 min', sub: 'Nearest patrol: Officer Siti', state: 'pending' },
      { title: 'Log overstay against badge', sub: 'Feeds access insights', state: 'auto' },
    ],
    copilot: {
      q: 'Has K. Lim done this before?',
      a: 'Two overstays in 90 days, both covered by approved overtime. Tonight there is no overtime request in the roster system.',
      chips: ['Show K. Lim’s route tonight', 'Who else is in B2?', 'Draft note to supervisor'],
    },
  });
}
