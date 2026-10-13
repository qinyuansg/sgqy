import { Frame, T, SEV, rect, circle, line, text, rich, para, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, surface, card, chip, chips, button, iconBtn, overline, hair, vhair, aiMark, avatar, incidentHeader, thumb, img, boxes } from '../lib/ui.mjs';
import { stepper } from './bag.mjs';

export default function resolution() {
  const F = new Frame('13 · Resolution & report');
  let s = backdrop(F) + shell(F, { active: 1, badge: 6, time: '02:24:30' });
  s += incidentHeader(F, {
    id: 'INC-2417', sev: 'Critical', icon: 'door', title: 'Tailgating at Staff Door D-214', status: 'Resolved 02:24', statusCol: T.ok, statusIcon: 'check',
    tags: ['T3 · Level 2 · Airside boundary', 'Contractor, expired pass'], conf: 94, confNote: 'Confirmed by operator', age: '9m 18s', ageLabel: 'Time to resolve',
  });
  const y = 208;
  // lifecycle
  const lh = 146;
  let lc = text(L.x0 + 22, y + 36, 'Lifecycle', { size: 15, weight: 600, fill: T.t1 });
  lc += rich(L.x1 - 22, y + 36, [{ t: 'Time to decision ', fill: T.t3 }, { t: '2m 41s', fill: T.t1, weight: 600 }, { t: '   ·   typical before: ~11 min', fill: T.t3 }], { size: 13, anchor: 'end' });
  lc += stepper(F, L.x0 + 28, y + 56, L.x1 - L.x0 - 40, [
    { title: 'Detected', sub: '02:14:52 · 5 alarms', state: 'done' },
    { title: 'Correlated', sub: '02:14:53 · +1 s', state: 'done' },
    { title: 'Decided', sub: '02:17:33 · Nurul A.', state: 'done' },
    { title: 'Dispatched', sub: '02:17:35 · Arjun R.', state: 'done' },
    { title: 'Contained', sub: '02:21:02 · L2-East', state: 'done' },
    { title: 'Resolved', sub: '02:24:10 · report signed', state: 'done' },
  ]);
  s += g(F, 'Lifecycle', surface(F, L.x0, y, L.x1 - L.x0, lh) + lc);
  const by = y + lh + 16, y1 = L.y1;
  // report (left)
  const rx = L.x0, rw = 720;
  let r = text(rx + 22 + 34, by + 36, 'Incident report', { size: 15, weight: 600, fill: T.t1 });
  r = aiMark(F, rx + 20, by + 18, 24) + r + text(rx + rw - 22, by + 36, 'Drafted by Co-pilot · edited by Nurul A.', { size: 12.5, fill: T.t3, anchor: 'end' });
  let ry = by + 72;
  const sec = (title, body) => {
    let o = overline(rx + 22, ry, title); ry += 20;
    const p = para(rx + 22, ry, body, rw - 44, { size: 13.5, lh: 20, fill: T.t1 }); o += p.svg; ry += p.h + 16;
    return o;
  };
  r += sec('Summary', 'At 02:14:52 a person without a valid credential followed badge holder J. Tan (Ground Ops) through Staff Door D-214 into the airside corridor. The recommended response was approved at 02:17:33. Officer Arjun intercepted the person in Corridor L2-East at 02:21:02.');
  r += sec('Finding', 'Contractor travelling to a Pier C shift; temporary pass expired on 11 Oct. No prohibited items. Escorted landside and referred to the pass office.');
  r += sec('Root cause', 'Courtesy tailgating by the badge holder, made easier by a slow door closer (door held 9 s, limit 5 s).');
  r += sec('Recommendations', '1. Brief Ground Ops on tailgating.  2. Service the D-214 door closer.  3. Keep hard anti-passback at D-214 for 7 days, then review.');
  r += overline(rx + 22, ry, 'Key moments'); ry += 12;
  [['02:14:52', 'Follower crosses D-214 behind badge B-55821', T.crit], ['02:17:33', 'Response approved · door locked, anti-passback hard', T.blue], ['02:21:02', 'Person intercepted in Corridor L2-East', T.ok]].forEach(([t, w, col]) => {
    r += circle(rx + 28, ry + 10, 4, { fill: col }) + text(rx + 42, ry + 14, t, { size: 12.5, weight: 600, fill: T.t2 }) + text(rx + 112, ry + 14, w, { size: 13, fill: T.t1 }); ry += 26;
  });
  r += hair(rx + 22, y1 - 80, rx + rw - 22);
  r += button(F, rx + 22, y1 - 62, 190, 42, 'Sign & close', { kind: 'primary', size: 14, icon: 'check' }) + button(F, rx + 222, y1 - 62, 150, 42, 'Export PDF', { kind: 'secondary', size: 14, icon: 'doc' }) + button(F, rx + 382, y1 - 62, 220, 42, 'Send to Duty Manager', { kind: 'secondary', size: 14, icon: 'send' });
  s += g(F, 'Incident report', surface(F, rx, by, rw, y1 - by) + r);

  // evidence pack + audit trail (middle)
  const mx = 856, mw = 560;
  const eh = 268;
  let e = text(mx + 22, by + 36, 'Evidence pack', { size: 15, weight: 600, fill: T.t1 }) + chip(F, mx + mw - 22 - 150, by + 20, 'Sealed · tamper-evident', { color: T.ok, icon: 'lock', size: 11, h: 24 }).svg;
  const tw = (mw - 44 - 24) / 3;
  [['door', 'CAM 3-118 · 1:34', boxes('door').tail], ['corridor', 'CAM 3-121 · 5:50', boxes('corridor').person], ['trail_walk_clean', 'CAM 3-125 · 2:10', null]].forEach(([im, lab, bx], i) => {
    e += thumb(F, 'Clip ' + lab, mx + 22 + i * (tw + 12), by + 58, tw, img(im), { box: bx, color: T.crit, tag: lab });
  });
  const fy = by + 58 + tw * 9 / 16 + 18;
  [['list', 'Access log · D-214 · 02:00–02:30', 'CSV · 48 events'], ['radar', 'LiDAR crossing counts', 'JSON · 2 tracks'], ['door', 'Door contact log', 'CSV · 6 events']].forEach(([ic, a, b], i) => {
    const yy = fy + i * 30;
    e += icon(F, ic, mx + 22, yy, 18, T.t2) + text(mx + 50, yy + 14, a, { size: 13, weight: 500, fill: T.t1 }) + text(mx + mw - 22, yy + 14, b, { size: 12, fill: T.t3, anchor: 'end' });
  });
  s += g(F, 'Evidence pack', surface(F, mx, by, mw, eh) + e);
  const ay = by + eh + 16;
  let a = text(mx + 22, ay + 36, 'Audit trail', { size: 15, weight: 600, fill: T.t1 }) + text(mx + mw - 22, ay + 36, 'AI and human actions', { size: 12.5, fill: T.t3, anchor: 'end' });
  [['02:14:53', 'Co-pilot', 'Correlated 5 alarms into INC-2417', 'ai'], ['02:15:10', 'Co-pilot', 'Started auto-follow on 3 cameras', 'ai'], ['02:17:33', 'Nurul A.', 'Approved lock + hard anti-passback', 'NA'], ['02:17:35', 'Nurul A.', 'Approved dispatch of Officer Arjun', 'NA'], ['02:21:02', 'Arjun R.', 'Intercepted at L2-East (mobile app)', 'AR'], ['02:24:10', 'Nurul A.', 'Resolved · report signed', 'NA']].forEach(([t, who, what, k], i) => {
    const yy = ay + 62 + i * 46;
    a += text(mx + 22, yy + 17, t, { size: 12, weight: 500, fill: T.t3 });
    a += k === 'ai' ? aiMark(F, mx + 90, yy + 2, 24) : avatar(F, mx + 102, yy + 14, 12, k, k === 'AR' ? '#13A38B' : '#3B6BFF');
    a += text(mx + 126, yy + 11, who, { size: 12, weight: 600, fill: T.t2 }) + text(mx + 126, yy + 28, what, { size: 13, fill: T.t1 });
  });
  s += g(F, 'Audit trail', surface(F, mx, ay, mw, y1 - ay) + a);

  // feedback + follow-ups (right)
  const fx = 1440, fw = 456;
  const fh = 300;
  let fb = text(fx + 22, by + 36, 'Was the AI assessment right?', { size: 15, weight: 600, fill: T.t1 });
  fb += text(fx + 22, by + 60, 'Your answer tunes correlation for this door.', { size: 12.5, fill: T.t3 });
  fb += button(F, fx + 22, by + 82, (fw - 54) / 2, 48, 'Correct', { kind: 'secondary', icon: 'thumbUp' }) + rect(fx + 22, by + 82, (fw - 54) / 2, 48, { r: 12, stroke: T.ok, sw: 1.5 });
  fb += button(F, fx + 32 + (fw - 54) / 2, by + 82, (fw - 54) / 2, 48, 'Not right', { kind: 'secondary', icon: 'thumbDown' });
  fb += overline(fx + 22, by + 162, 'What helped most');
  fb += chips(F, fx + 22, by + 176, [{ label: 'LiDAR count', color: T.ice, icon: 'check' }, { label: 'Auto-follow', color: T.ice, icon: 'check' }, { label: 'SOP steps', color: T.t2, bgo: 0.06, weight: 500 }].map(c => ({ ...c, h: 28, size: 12 })), 8).svg;
  fb += chips(F, fx + 22, by + 212, [{ label: 'Summary text', color: T.t2, bgo: 0.06, weight: 500, h: 28, size: 12 }, { label: 'Confidence', color: T.t2, bgo: 0.06, weight: 500, h: 28, size: 12 }], 8).svg;
  fb += text(fx + 22, by + 272, 'Thanks — logged against model v2.3 and D-214.', { size: 12, fill: T.t3 });
  s += g(F, 'Feedback', surface(F, fx, by, fw, fh, { accent: T.ok, accentO: 0.25 }) + fb);
  const uy = by + fh + 16;
  let fu = text(fx + 22, uy + 36, 'Follow-ups', { size: 15, weight: 600, fill: T.t1 }) + text(fx + fw - 22, uy + 36, '3 assigned', { size: 12.5, fill: T.t3, anchor: 'end' });
  [['Ground Ops', 'Brief badge holder on tailgating', 'Due 15 Oct', T.t2], ['Facilities', 'Service D-214 door closer', 'Ticket FM-88213', T.t2], ['Access admin', 'Review hard anti-passback (7 days)', 'Due 20 Oct', T.high]].forEach(([who, what, due, col], i) => {
    const yy = uy + 60 + i * 62;
    fu += rect(fx + 22, yy, fw - 44, 52, { r: 12, fill: '#FFFFFF', fo: 0.035 });
    fu += text(fx + 38, yy + 21, what, { size: 13.5, weight: 600, fill: T.t1 }) + text(fx + 38, yy + 39, who, { size: 12, fill: T.t3 }) + text(fx + fw - 38, yy + 30, due, { size: 12, weight: 500, fill: col, anchor: 'end' });
  });
  s += g(F, 'Follow-ups', surface(F, fx, uy, fw, y1 - uy) + fu);
  return F.render(s);
}
