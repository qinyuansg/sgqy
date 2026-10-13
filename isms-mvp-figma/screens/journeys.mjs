import { Frame, T, SEV, rect, circle, line, text, rich, para, icon, g, textWidth } from '../lib/svg.mjs';
import { backdrop, surface, card, chip, chips, avatar, aiMark, overline, hair, vhair, keycap } from '../lib/ui.mjs';

export default function journeys() {
  const F = new Frame('02 · MVP user journeys');
  let s = backdrop(F);
  const X0 = 72, X1 = 1848;
  s += text(X0, 92, 'MVP user journeys', { size: 34, weight: 600, fill: T.t1 }) + text(X0 + 318, 92, 'Every use case runs the same three steps: spot it, understand it, decide.', { size: 18, fill: T.t3 });

  // persona
  const py = 128, ph = 300, pw = 520;
  let p = avatar(F, X0 + 52, py + 56, 28, 'NA', '#3B6BFF') + text(X0 + 94, py + 50, 'Nurul A.', { size: 18, weight: 600, fill: T.t1 }) + text(X0 + 94, py + 70, 'Airport control-room operator · night shift', { size: 13, fill: T.t3 });
  p += overline(X0 + 24, py + 116, 'Today');
  ['1,000+ alarms a shift across 9 systems', '8 screens; checks each alarm by hand', 'Looks up SOPs in binders and PDFs', 'Cannot tell quickly which alarm matters'].forEach((t, i) => { p += icon(F, 'x', X0 + 24, py + 128 + i * 26, 16, T.crit, 2) + text(X0 + 48, py + 141 + i * 26, t, { size: 13.5, fill: T.t2 }); });
  p += overline(X0 + 24, py + 250, 'With Co-pilot');
  p += text(X0 + 24, py + 274, '7 incidents instead of 1,248 alarms, each with evidence and a plan.', { size: 13.5, weight: 500, fill: T.t1 });
  s += g(F, 'Persona', surface(F, X0, py, pw, ph) + p);

  // universal flow
  const fx = X0 + pw + 24, fw = X1 - fx;
  let fl = text(fx + 24, py + 40, 'One flow for every use case', { size: 16, weight: 600, fill: T.t1 }) + text(fx + fw - 24, py + 40, 'Three clicks from alert to decision', { size: 13, fill: T.t3, anchor: 'end' });
  const steps = [
    ['1', 'Spot', 'Operations overview', '03', 'A correlated incident rises to the top of "Needs attention", pinned on the 3D twin.', 'grid'],
    ['2', 'Understand', 'Incident workspace', '05–11', 'What happened, why it matters, all evidence in one place, plus a ready response plan.', 'sparkle'],
    ['3', 'Decide', 'Approve & resolve', '13', 'Approve, adjust or dismiss. Co-pilot drafts the report and logs every action.', 'hand'],
  ];
  const sw = (fw - 48 - 2 * 56) / 3;
  steps.forEach(([n, verb, scr, fr, d, ic], i) => {
    const x = fx + 24 + i * (sw + 56), y = py + 64;
    let c = rect(x, y, sw, 200, { r: 16, fill: '#FFFFFF', fo: 0.035, stroke: '#FFFFFF', so: 0.08 });
    c += circle(x + 30, y + 32, 16, { fill: T.blue }) + text(x + 30, y + 37.5, n, { size: 14, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
    c += text(x + 58, y + 30, verb, { size: 18, weight: 600, fill: T.t1 }) + text(x + 58, y + 48, scr + ' · frame ' + fr, { size: 12.5, fill: T.t3 });
    c += para(x + 20, y + 86, d, sw - 40, { size: 14, lh: 21, fill: T.t2 }).svg;
    c += icon(F, ic, x + sw - 40, y + 18, 22, T.blue, 1.8);
    if (i < 2) c += icon(F, 'chevR', x + sw + 16, y + 88, 24, T.t3, 2.2);
    fl += g(F, 'Step ' + verb, c);
  });
  fl += rich(fx + 24, py + 286, [{ t: 'Anytime: ', fill: T.t3 }, { t: 'press ⌘K and ask Co-pilot', fill: T.t1, weight: 600 }, { t: ' (frame 12). Platform views: correlation inbox (04), insights (14), sites (15).', fill: T.t3 }], { size: 13.5 });
  s += g(F, 'Universal flow', surface(F, fx, py, fw, ph) + fl);

  // use-case table
  const ty = py + ph + 24, th = 1040 - ty;
  let t = text(X0 + 24, ty + 40, 'Demo use cases', { size: 16, weight: 600, fill: T.t1 }) + text(X1 - 24, ty + 40, 'As an airport operator, I want…', { size: 13, fill: T.t3, anchor: 'end' });
  const cols = [['Use case', 24], ['User story', 300], ['Signals fused', 900], ['Operator decides', 1200], ['Frame', 1700]];
  cols.forEach(([h, dx]) => { t += overline(X0 + dx, ty + 78, h); });
  t += hair(X0 + 24, ty + 90, X1 - 24);
  const rows = [
    ['door', 'Tailgating + anti-passback', '…to know when two people pass on one badge, so the follower is stopped before reaching airside.', 'Badge · door contact · LiDAR count · video', 'Lock door, dispatch patrol', '05', 'Critical'],
    ['idcard', 'Identity spoofing', '…to catch one credential used in two places too far apart, so cloned or shared cards are blocked.', 'Access events · travel time · appearance', 'Suspend card, send patrol', '06', 'High'],
    ['bag', 'Unattended bag', '…the system to find the owner and track them for me, so I clear the bag in minutes, not an hour.', 'Object analytics · re-ID trail · SOP', 'Approve response', '07', 'High'],
    ['eye', 'Watchlist person loitering', '…to be alerted to a possible watchlist match with context, and confirm it myself before any action.', 'Face match · dwell · staff-door approaches', 'Verify match first', '08', 'High'],
    ['fight', 'Fight detection', '…to see aggression early with nearby responders listed, so officers arrive before it escalates.', 'Pose · intercom audio · crowd density', 'Dispatch officers, medical', '09', 'High'],
    ['timer', 'Overstay', '…to know who stays in a restricted zone past their shift, so I can check on them or close access.', 'Access · roster · behaviour baseline', 'Radio check, supervisor', '10', 'Medium'],
    ['fence', 'AGIL Fence alarm', '…fence alarms verified by LiDAR and thermal, so I only respond to real intrusions, not wind.', 'AGIL Fence · LiDAR · PTZ thermal · weather', 'Dispatch vehicle, alert ATC', '11', 'Critical'],
  ];
  const rh = (th - 110) / rows.length;
  rows.forEach(([ic, uc, story, sig, dec, fr, sev], i) => {
    const yy = ty + 96 + i * rh, col = SEV[sev];
    let r = rect(X0 + 24, yy + rh / 2 - 16, 32, 32, { r: 10, fill: col, fo: 0.14 }) + icon(F, ic, X0 + 31, yy + rh / 2 - 9, 18, col, 1.9);
    r += text(X0 + 68, yy + rh / 2 + 5, uc, { size: 14, weight: 600, fill: T.t1 });
    const pr = para(X0 + 300, yy + rh / 2 - 4, story, 560, { size: 13, lh: 18, fill: T.t2, max: 2 });
    r += pr.n === 1 ? text(X0 + 300, yy + rh / 2 + 5, story, { size: 13, fill: T.t2 }) : pr.svg;
    r += text(X0 + 900, yy + rh / 2 + 5, sig, { size: 12.5, fill: T.t2 });
    r += chip(F, X0 + 1200, yy + rh / 2 - 12, dec, { color: T.high, icon: 'hand', size: 12, h: 24 }).svg;
    r += text(X0 + 1700, yy + rh / 2 + 5, fr, { size: 14, weight: 600, fill: T.blue });
    if (i < rows.length - 1) r += hair(X0 + 24, yy + rh, X1 - 24, { so: 0.05 });
    t += g(F, 'Use case ' + uc, r);
  });
  s += g(F, 'Use case table', surface(F, X0, ty, X1 - X0, th) + t);
  return F.render(s);
}
