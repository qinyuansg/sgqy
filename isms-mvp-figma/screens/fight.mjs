import { T, SEV, f, rect, circle, line, pathEl, poly, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, surface, chip, avatar, button, overline, hair } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';
import { evidenceCard } from './tailgate.mjs';

export default function fight() {
  const B = boxes('belt');
  return workspace('09 · Incident — Fight detection', {
    id: 'INC-2413', sev: 'High', icon: 'fight', title: 'Fight detected at Arrival Belt 5', status: 'Awaiting your decision',
    tags: ['T2 · Arrival hall · Belt 5', 'Crowd ~14'], conf: 78, confNote: 'Medium-high · 3 sources', age: '1m 48s',
  }, {
    summary: 'Two passengers at Belt 5 went from arguing to pushing at 02:11:09. Pose analytics flags aggressive motion and the intercom microphone picked up shouting at the same moment. About 14 people are gathering; bags from AG 207 are still arriving.',
    sources: ['CCTV · pose', 'Audio · intercom', 'Flight info'],
    factors: [
      { label: 'Aggressive motion (pose score 0.89)', v: 0.30, color: T.crit },
      { label: 'Shouting detected (intercom IC-B5)', v: 0.18, color: T.high },
      { label: 'Crowd forming · ~14 people', v: 0.16, color: T.high },
      { label: 'Arrival peak · AG 207, 280 pax', v: 0.14, color: T.med },
    ],
    signals: [
      { t: '02:10:40', title: 'Raised voices', sub: 'Audio analytics · intercom IC-B5', icon: 'wave', color: T.high },
      { t: '02:11:09', title: 'Aggression detected', sub: 'Pose analytics · CAM 1-142', icon: 'fight', color: T.crit },
      { t: '02:11:30', title: 'Crowd density rising', sub: 'Video analytics · 14 people', icon: 'users', color: T.high },
    ],
    signalGap: 64,
    center: (F, c) => {
      const ev = evidenceCard(F, c.x, c.y, c.w, 'belt', {
        title: 'Evidence', sub: 'Pose overlay on', tabs: ['Belt 5', 'Belt 4–6 wide', 'Exit doors', '+2'],
        player: { cam: 'CAM 1-142 · Arrival Belt 5', boxes: [{ b: B.pair, color: T.crit, label: 'Aggression · 0.89', sub: '2 people' }], markers: [{ t: 0.3, color: T.high }, { t: 0.52, color: T.crit }, { t: 0.66, color: T.high }], now: 0.82, tStart: '02:09:30', tEnd: '02:12:40' },
      });
      let s = ev.svg;
      const my = ev.y2 + 16, mh = c.y1 - my, w1 = 470, w2 = c.w - w1 - 16;
      // escalation chart: single series, threshold line
      let m1 = text(c.x + 22, my + 36, 'Escalation', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + w1 - 22, my + 36, 'Aggression score · last 3 min', { size: 12.5, fill: T.t3, anchor: 'end' });
      const gx = c.x + 52, gy = my + 60, gw = w1 - 80, gh = mh - 110;
      for (const v of [0, 0.5, 1]) { const yy = gy + gh - v * gh; m1 += line(gx, yy, gx + gw, yy, { stroke: '#FFFFFF', so: v === 0 ? 0.14 : 0.06 }) + text(gx - 10, yy + 4, v.toFixed(1), { size: 11, fill: T.t3, anchor: 'end' }); }
      const vals = [0.08, 0.1, 0.09, 0.12, 0.15, 0.14, 0.2, 0.28, 0.33, 0.41, 0.55, 0.72, 0.89, 0.86, 0.81, 0.84];
      const pts = vals.map((v, i) => [gx + gw * i / (vals.length - 1), gy + gh - v * gh]);
      m1 += poly([[gx, gy + gh], ...pts, [gx + gw, gy + gh]], { fill: F.lin([[0, T.crit, 0.28], [1, T.crit, 0]], 0, 0, 0, 1) });
      m1 += poly(pts, { open: true, stroke: T.crit, sw: 2, join: 'round', cap: 'round' });
      const ty = gy + gh - 0.7 * gh;
      m1 += line(gx, ty, gx + gw, ty, { stroke: T.t2, dash: '4 4', so: 0.6 }) + text(gx + 6, ty - 6, 'Alert threshold 0.70', { size: 11, fill: T.t2 });
      m1 += circle(...pts[12], 5, { fill: T.crit, stroke: '#0A0F1A', sw: 2 }) + text(pts[12][0] - 8, pts[12][1] - 10, '0.89', { size: 12, weight: 600, fill: T.t1, anchor: 'end' });
      m1 += text(gx, gy + gh + 20, '02:09:40', { size: 11, fill: T.t3 }) + text(gx + gw, gy + gh + 20, '02:12:40', { size: 11, fill: T.t3, anchor: 'end' });
      s += g(F, 'Module Escalation chart', surface(F, c.x, my, w1, mh) + m1);
      // nearby responders
      const ax = c.x + w1 + 16;
      let m2 = text(ax + 22, my + 36, 'Nearest responders', { size: 15, weight: 600, fill: T.t1 });
      [['DL', 'Officer Lee', 'Arrival hall · 40 m', 'Available', T.ok, '#13A38B'], ['RV', 'Officer Ravi', 'Belt 3 · 90 m', 'Available', T.ok, '#8A5CF6'], ['MS', 'Medical standby', 'T2 L1 · 3 min', 'Standby', T.high, '#D9824A']].forEach(([ini, n, sub, st, col, ac], i) => {
        const ry = my + 56 + i * 58;
        m2 += avatar(F, ax + 42, ry + 22, 18, ini, ac) + text(ax + 72, ry + 18, n, { size: 13.5, weight: 600, fill: T.t1 }) + text(ax + 72, ry + 36, sub, { size: 11.5, fill: T.t3 });
        m2 += text(ax + w2 - 22, ry + 27, st, { size: 12, weight: 600, fill: col, anchor: 'end' });
        if (i < 2) m2 += hair(ax + 22, ry + 50, ax + w2 - 22);
      });
      s += g(F, 'Module Responders', surface(F, ax, my, w2, mh) + m2);
      return s;
    },
    sop: 'SOP-SEC-040',
    planSub: 'Disorderly behaviour in public area · SOP-SEC-040',
    plan: [
      { title: 'Dispatch Officers Lee and Ravi', sub: 'Nearest two · ETA under 1 min', state: 'approve' },
      { title: 'Put medical team on standby', sub: 'Not dispatched yet', state: 'approve' },
      { title: 'PA announcement at Belt 5', sub: 'Pre-drafted calm-down message', state: 'pending' },
      { title: 'Preserve clips (−5 / +15 min)', sub: '3 cameras + audio', state: 'auto' },
    ],
    copilot: {
      q: 'Is anyone injured?',
      a: 'No fall or lying-down pose so far. One person stepped back holding their arm at 02:11:20, so medical standby is recommended.',
      chips: ['Replay last 60 s', 'Flight AG 207 status', 'Cameras around Belt 5'],
    },
  });
}
