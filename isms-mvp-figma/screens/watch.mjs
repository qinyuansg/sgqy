import { T, SEV, rect, circle, line, pathEl, poly, text, rich, icon, image, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, surface, chip, ring, button, overline, hair } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';
import { evidenceCard } from './tailgate.mjs';

export default function watch() {
  const B = boxes('hall');
  return workspace('08 · Incident — Watchlist person loitering', {
    id: 'INC-2415', sev: 'High', icon: 'eye', title: 'Watchlist person loitering at Row K', status: 'Verification required', statusIcon: 'eye',
    tags: ['T1 · Departure hall · Row K', 'Dwell 23 min'], conf: 86, confNote: 'Match 87% · needs your check', age: '3m 20s',
  }, {
    summary: 'A person who may match a watchlist entry (trespass notice, 2025) has stayed around check-in Row K for 23 min without checking in, and walked up to staff door K-Service three times. Nothing is actioned until an operator verifies the match.',
    sources: ['CCTV · face match', 'Loitering analytics', 'Watchlist'],
    factors: [
      { label: 'Possible watchlist match (87%)', v: 0.30, color: T.high },
      { label: 'Loitering 23 min (threshold 10)', v: 0.22, color: T.high },
      { label: '3 approaches to staff door K-Service', v: 0.18, color: T.high },
      { label: 'No check-in or boarding pass scan', v: 0.10, color: T.med },
    ],
    signals: [
      { t: '01:52', title: 'Entered departure hall', sub: 'CAM 1-301 · East entrance', icon: 'video', color: T.blue },
      { t: '02:02', title: 'Loitering > 10 min', sub: 'Behaviour analytics · Row K', icon: 'timer', color: T.high },
      { t: '02:08', title: 'Staff door approached ×3', sub: 'Door K-Service · no badge', icon: 'door', color: T.high },
      { t: '02:12', title: 'Possible watchlist match', sub: 'Face match · on-premise', icon: 'eye', color: T.high },
    ],
    signalGap: 62,
    center: (F, c) => {
      const ev = evidenceCard(F, c.x, c.y, c.w, 'hall', {
        title: 'Evidence', sub: 'Auto-follow on', tabs: ['Row K', 'Row J', 'K-Service door', '+3'],
        player: { cam: 'CAM 1-311 · Departure hall Row K', boxes: [{ b: B.person, color: T.high, label: 'Possible match · 87%', sub: 'Dwell 23:04' }], markers: [{ t: 0.2, color: T.high }, { t: 0.52, color: T.high }, { t: 0.78, color: T.high }], now: 0.98, tStart: '01:52', tEnd: '02:16' },
      });
      let s = ev.svg;
      const my = ev.y2 + 16, mh = c.y1 - my, w1 = 470, w2 = c.w - w1 - 16;
      // verify identity
      let m1 = text(c.x + 22, my + 36, 'Verify identity', { size: 15, weight: 600, fill: T.t1 }) + chip(F, c.x + w1 - 22 - 138, my + 20, 'Operator decides', { color: T.high, icon: 'hand' }).svg;
      const fs = 96;
      m1 += image(F, 'Live capture', img('face_live'), c.x + 22, my + 56, fs, fs, 14) + image(F, 'Watchlist reference', img('face_ref'), c.x + 22 + fs + 12, my + 56, fs, fs, 14);
      m1 += text(c.x + 22, my + 170, 'Live · 02:12', { size: 11.5, fill: T.t3 }) + text(c.x + 34 + fs, my + 170, 'Watchlist · 2025', { size: 11.5, fill: T.t3 });
      m1 += ring(F, c.x + 22 + 2 * fs + 12 + 62, my + 98, 34, 0.87, T.high, { size: 20, sw: 6, label: 'MATCH' });
      m1 += button(F, c.x + w1 - 22 - 120, my + 70, 120, 34, 'Confirm', { kind: 'secondary', size: 13, icon: 'check' }) + button(F, c.x + w1 - 22 - 120, my + 112, 120, 34, 'Not a match', { kind: 'secondary', size: 13, icon: 'x' });
      m1 += text(c.x + w1 - 22, my + 170, 'Decision is logged', { size: 11.5, fill: T.t3, anchor: 'end' });
      s += g(F, 'Module Verify identity', surface(F, c.x, my, w1, mh, { accent: T.high, accentO: 0.3 }) + m1);
      // movement map
      const ax = c.x + w1 + 16;
      let m2 = text(ax + 22, my + 36, 'Movement · last 23 min', { size: 15, weight: 600, fill: T.t1 });
      const px = ax + 22, py = my + 54, pw = w2 - 44, ph = mh - 74;
      m2 += rect(px, py, pw, ph, { r: 12, fill: '#FFFFFF', fo: 0.03, stroke: '#FFFFFF', so: 0.06 });
      for (let i = 0; i < 6; i++) m2 += rect(px + 18 + i * ((pw - 36) / 6), py + 14, (pw - 36) / 6 - 6, 18, { r: 4, fill: '#FFFFFF', fo: 0.08 });
      m2 += text(px + 18, py + 48, 'Check-in Row K', { size: 10.5, fill: T.t3 });
      m2 += rect(px + pw - 54, py + 14, 40, 24, { r: 4, fill: T.high, fo: 0.18, stroke: T.high, so: 0.6 }) + text(px + pw - 34, py + 52, 'K-Service', { size: 10.5, fill: T.high, anchor: 'middle' });
      const path = [[0.1, 0.85], [0.25, 0.7], [0.4, 0.75], [0.55, 0.6], [0.7, 0.68], [0.86, 0.42], [0.72, 0.62], [0.58, 0.72], [0.74, 0.55], [0.88, 0.4], [0.7, 0.66], [0.6, 0.78], [0.78, 0.6], [0.9, 0.38]];
      m2 += poly(path.map(([a, b]) => [px + a * pw, py + b * ph]), { open: true, stroke: T.high, sw: 2, so: 0.85, join: 'round', cap: 'round' });
      for (const [a, b, r] of [[0.58, 0.72, 16], [0.72, 0.62, 20], [0.88, 0.4, 12]]) m2 += circle(px + a * pw, py + b * ph, r, { fill: T.high, fo: 0.14 });
      m2 += circle(px + 0.9 * pw, py + 0.38 * ph, 6, { fill: T.high, stroke: '#0A0F1A', sw: 2 });
      m2 += text(px + 14, py + ph - 12, 'Dwell hot-spots · 3 loops to staff door', { size: 11.5, fill: T.t3 });
      s += g(F, 'Module Movement', surface(F, ax, my, w2, mh) + m2);
      return s;
    },
    sop: 'SOP-SEC-033',
    planSub: 'Watchlist candidate · verification first · SOP-SEC-033',
    approve: 'Confirm match & approve',
    dismiss: 'Not a match',
    plan: [
      { title: 'Verify the match (you)', sub: 'Required before any action', state: 'approve', tag: 'Your check' },
      { title: 'Discreet approach by 2 officers', sub: 'Plain-clothes team · ETA 4 min', state: 'pending' },
      { title: 'Notify police liaison if confirmed', sub: 'Pre-filled report', state: 'pending' },
      { title: 'Keep auto-follow on person', sub: '3 cameras · Row K, J, K-Service', state: 'running' },
    ],
    copilot: {
      q: 'Why is this flagged?',
      a: 'Possible match to a 2025 trespass notice, plus 23 min of loitering and three approaches to a staff door. Each signal alone would be low priority.',
      chips: ['Show the watchlist entry', 'Where else today?', 'Cameras around Row K'],
    },
  });
}
