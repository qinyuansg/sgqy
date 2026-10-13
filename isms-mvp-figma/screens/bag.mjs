import { T, SEV, rect, circle, line, pathEl, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, player, thumb, surface, chip, kv, overline, hair, aiMark } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';

// horizontal stepper (autonomous investigation)
export function stepper(F, x, y, w, steps, o = {}) {
  const n = steps.length, sw = w / n;
  let s = '';
  steps.forEach((st, i) => {
    const cx = x + i * sw + 18, col = st.state === 'done' ? T.ok : st.state === 'wait' ? T.high : T.t3;
    if (i < n - 1) s += line(cx + 22, y + 18, x + (i + 1) * sw + 18 - 22, y + 18, { stroke: i < (o.doneUpTo ?? n) - 1 ? T.ok : '#FFFFFF', so: i < (o.doneUpTo ?? n) - 1 ? 0.5 : 0.12, sw: 2 });
    s += circle(cx, y + 18, 16, { fill: col, fo: 0.16, stroke: col, so: 0.6 });
    s += icon(F, st.state === 'done' ? 'check' : st.icon || 'hand', cx - 9, y + 9, 18, col, 2.2);
    s += text(cx - 16, y + 56, st.title, { size: 13, weight: 600, fill: T.t1 });
    s += text(cx - 16, y + 74, st.sub, { size: 11.5, fill: st.state === 'wait' ? T.high : T.t3 });
  });
  return g(F, o.name || 'Stepper', s);
}

export default function bag() {
  const G = boxes('gate');
  return workspace('07 · Incident — Unattended bag (autonomous investigation)', {
    id: 'INC-2412', sev: 'High', icon: 'bag', title: 'Unattended bag at Gate B12', status: 'Awaiting your decision',
    tags: ['T2 · Gate B12 holdroom', 'Unattended 12 min'], conf: 88, confNote: 'High · owner located', age: '12m 06s',
  }, {
    summary: 'A black hard-shell suitcase has been left at Gate B12 since 02:04. Co-pilot traced it back to its owner at 01:58 and followed them across 4 cameras. The owner is now at Food Court L3, on the phone. No other threat indicators nearby.',
    sources: ['CCTV × 4', 'Object analytics', 'Flight info', 'SOP library'],
    factors: [
      { label: 'Unattended 12 min (threshold 5)', v: 0.30, color: T.high },
      { label: 'Owner > 400 m away, other level', v: 0.24, color: T.high },
      { label: 'Holdroom for AG 318 · boards 06:40', v: 0.14, color: T.high },
      { label: 'Owner located · no threat cues', v: 0.12, color: T.ok, note: '−12' },
    ],
    signals: [
      { t: '01:58:41', title: 'Owner places bag', sub: 'CAM 2-031 · Gate B12', icon: 'video', color: T.blue },
      { t: '02:04:10', title: 'Owner walks away', sub: 'CAM 2-044 · Concourse B', icon: 'route', color: T.blue },
      { t: '02:09:10', title: 'Bag unattended > 5 min', sub: 'Object analytics', icon: 'bag', color: T.high },
      { t: '02:15:58', title: 'Owner located', sub: 'CAM 2-077 · Food Court L3', icon: 'pin', color: T.ok },
      { t: '02:16:02', title: 'SOP-SEC-021 retrieved', sub: 'Unattended item procedure', icon: 'doc', color: T.violet },
      { t: '02:16:04', title: 'Response drafted', sub: 'Waiting for operator', icon: 'sparkle', color: T.violet },
    ],
    signalGap: 52,
    center: (F, c) => {
      let s = '';
      // autonomous investigation stepper
      const h0 = 138;
      let a = aiMark(F, c.x + 20, c.y + 18, 24) + text(c.x + 54, c.y + 36, 'Autonomous investigation', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + c.w - 22, c.y + 36, 'Completed in 6.2 s · human decides next', { size: 12.5, fill: T.t3, anchor: 'end' });
      a += stepper(F, c.x + 24, c.y + 54, c.w - 40, [
        { title: 'Object & time', sub: 'Suitcase · 02:04', state: 'done' },
        { title: 'Owner & track', sub: '4 cameras · 0.9 s', state: 'done' },
        { title: 'Related events', sub: 'None nearby', state: 'done' },
        { title: 'SOP retrieved', sub: 'SOP-SEC-021', state: 'done' },
        { title: 'Your decision', sub: 'Awaiting operator', state: 'wait', icon: 'hand' },
      ], { doneUpTo: 5 });
      s += g(F, 'Autonomous investigation', surface(F, c.x, c.y, c.w, h0, { accent: T.violet, accentO: 0.3 }) + a);
      // evidence: player + object facts
      const ey = c.y + h0 + 16;
      const pl = player(F, 'Player', c.x + 24, ey + 60, 560, img('gate'), {
        cam: 'CAM 2-031 · Gate B12', boxes: [{ b: G.bag, color: T.high, label: 'Unattended · 12:06' }],
        markers: [{ t: 0.12, color: T.blue }, { t: 0.4, color: T.blue }, { t: 0.62, color: T.high }], now: 0.96, tStart: '01:58', tEnd: '02:16',
      });
      const eh = 60 + pl.h + 22;
      let e = text(c.x + 22, ey + 38, 'Evidence', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + 104, ey + 38, 'Object and owner', { size: 13, fill: T.t3 });
      const kx = c.x + 24 + 560 + 24, kw = c.w - 560 - 72;
      e += overline(kx, ey + 78, 'Object');
      e += kv(F, kx, ey + 106, kw, [['Type', 'Hard-shell suitcase'], ['Colour · size', 'Black · ~60 cm'], ['First seen', '01:58:41'], ['Unattended since', '02:04:10'], ['People within 5 m', '0'], ['Owner distance', '~410 m · L3']], { gap: 30, lines: true });
      e += chip(F, kx, ey + 290, 'No hand-off to another person', { color: T.ok, icon: 'check', size: 11.5, h: 24 }).svg;
      s += g(F, 'Evidence card', surface(F, c.x, ey, c.w, eh) + pl.svg + e);
      // owner trail
      const ty = ey + eh + 16, th = c.y1 - ty;
      let t = text(c.x + 22, ty + 36, 'Owner trail', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + 120, ty + 36, 'Re-identified by appearance across 4 cameras', { size: 13, fill: T.t3 });
      const trail = [['trail_gate', 'Gate B12', '01:58 · places bag'], ['trail_walk', 'Concourse B', '02:04 · walks away'], ['corridor', 'Restroom corridor', '02:09 · passes'], ['trail_food', 'Food Court L3', '02:15 · now · on phone']];
      const tw = (c.w - 48 - 3 * 20) / 4;
      trail.forEach(([im, lab, sub], i) => {
        const tx = c.x + 24 + i * (tw + 20);
        const bx = boxes(im).person;
        t += thumb(F, 'Trail ' + lab, tx, ty + 56, tw, img(im), { box: bx, color: i === 3 ? T.ok : T.blue, active: i === 3, label: lab, sub });
        if (i < 3) t += icon(F, 'chevR', tx + tw + 2, ty + 56 + tw * 9 / 32 - 8, 16, T.t3, 2);
      });
      s += g(F, 'Owner trail', surface(F, c.x, ty, c.w, th) + t);
      return s;
    },
    sop: 'SOP-SEC-021',
    planSub: 'Unattended item · owner located · SOP-SEC-021',
    approve: 'Approve response',
    plan: [
      { title: 'Send Officer Arjun to the owner', sub: 'Food Court L3 · ETA 2 min · photo to app', state: 'approve' },
      { title: 'Owner returns to B12 with officer', sub: 'Officer confirms ownership', state: 'pending' },
      { title: 'Hold watch on bag (no cordon yet)', sub: 'Camera lock-on · alert if touched', state: 'running' },
      { title: 'Escalate to EOD if owner not found', sub: 'Reminder set for 02:26', state: 'pending' },
    ],
    copilot: {
      q: 'Is anyone else near the bag?',
      a: 'No. Nobody has come within 5 m since 02:04, and the owner did not hand anything to anyone on the way to L3.',
      chips: ['What does SOP-SEC-021 say?', 'Replay owner trail', 'Show flight for B12'],
    },
  });
}
