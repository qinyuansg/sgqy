import { Frame, T, SEV, rect, circle, line, text, rich, icon, g, textWidth, ICONS } from '../lib/svg.mjs';
import { AI, backdrop, surface, card, chip, chips, sevChip, button, iconBtn, seg, toggle, ring, keycap, aiMark, aiGrad, overline, hair, plan } from '../lib/ui.mjs';
import { incidentCard } from './overview.mjs';
import { INCIDENTS } from './data.mjs';

export default function foundations() {
  const F = new Frame('01 · Design foundations');
  let s = backdrop(F);
  const X0 = 72, X1 = 1848;
  s += text(X0, 92, 'Design foundations', { size: 34, weight: 600, fill: T.t1 }) + text(X0 + 330, 92, 'Dark, calm, operator-first. Colour only when it means something.', { size: 18, fill: T.t3 });

  // principles
  const P = [
    ['link', 'One story, not five alarms', 'Correlate signals by time, place, person and credential into one incident.'],
    ['sparkle', 'Explain every alert', 'Each incident shows what happened, why it matters and the sources behind it.'],
    ['hand', 'People decide', 'Co-pilot proposes; operators approve, adjust or dismiss. Every action is logged.'],
    ['eye', 'Calm by default', 'Low noise until it matters. Three clicks: overview, incident, decision.'],
  ];
  const pw = (X1 - X0 - 3 * 24) / 4;
  P.forEach(([ic, t, d], i) => {
    const x = X0 + i * (pw + 24), y = 124;
    let c = rect(x + 22, y + 22, 40, 40, { r: 12, fill: T.blue, fo: 0.14 }) + icon(F, ic, x + 31, y + 31, 22, T.blue, 1.9);
    c += text(x + 22, y + 88, t, { size: 17, weight: 600, fill: T.t1 });
    const lines = d.match(/.{1,52}(\s|$)/g) || [d];
    lines.forEach((l, k) => { c += text(x + 22, y + 110 + k * 20, l.trim(), { size: 13.5, fill: T.t2 }); });
    s += g(F, 'Principle ' + t, surface(F, x, y, pw, 150) + c);
  });

  // colour tokens
  const cy = 294, cw = 860, ch = 300;
  let col = text(X0 + 22, cy + 36, 'Colour', { size: 15, weight: 600, fill: T.t1 });
  const groups = [
    ['Surfaces', [['bg', T.bg], ['surface-1', T.s1], ['surface-2', T.s2], ['line', T.line2]]],
    ['Text', [['primary', T.t1], ['secondary', T.t2], ['tertiary', T.t3]]],
    ['Brand', [['blue', T.blue], ['blue-strong', T.blue2], ['ice', T.ice], ['teal', T.teal], ['violet', T.violet]]],
    ['Status (reserved)', [['critical', T.crit], ['high', T.high], ['medium', T.med], ['resolved', T.ok]]],
  ];
  let gy = cy + 66;
  groups.forEach(([gname, sw]) => {
    col += overline(X0 + 22, gy + 4, gname);
    sw.forEach(([n, hex], i) => {
      const x = X0 + 180 + i * 132;
      col += rect(x, gy - 18, 36, 36, { r: 10, fill: hex, stroke: '#FFFFFF', so: 0.12 }) + text(x + 46, gy - 2, n, { size: 12.5, weight: 600, fill: T.t1 }) + text(x + 46, gy + 14, hex, { size: 11, fill: T.t3 });
    });
    gy += 52;
  });
  col += overline(X0 + 22, gy + 4, 'AI accent') + rect(X0 + 180, gy - 14, 380, 28, { r: 14, fill: aiGrad(F) }) + text(X0 + 576, gy + 5, 'Only for Co-pilot surfaces', { size: 12.5, fill: T.t3 });
  s += card(F, 'Colour tokens', X0, cy, cw, ch, {}, col);

  // type scale
  const tx = X0 + cw + 24, tw = X1 - tx;
  let ty = text(tx + 22, cy + 36, 'Type · Inter', { size: 15, weight: 600, fill: T.t1 });
  const scale = [['Display', 34, 600, 'Operations overview'], ['Title', 26, 600, 'Tailgating at Staff Door D-214'], ['Headline', 18, 600, 'Needs attention'], ['Body', 14, 400, 'Two people crossed but only one badge was presented.'], ['Caption', 12, 500, 'T3 · Level 2 · Airside boundary'], ['Overline', 11, 600, 'CORRELATED SIGNALS']];
  scale.forEach(([n, sz, wt, sample], i) => {
    const yy = cy + 74 + i * 38;
    ty += text(tx + 22, yy, n, { size: 12, weight: 500, fill: T.t3 }) + text(tx + 22, yy + 14, `${sz} / ${wt}`, { size: 11, fill: T.t4 });
    ty += text(tx + 140, yy + 6, sample, { size: sz, weight: wt, fill: T.t1, ls: n === 'Overline' ? 0.9 : 0 });
  });
  s += card(F, 'Type scale', tx, cy, tw, ch, {}, ty);

  // components
  const ky = cy + ch + 24, kh = 1040 - ky, kw = 1180;
  let k = text(X0 + 22, ky + 36, 'Components', { size: 15, weight: 600, fill: T.t1 });
  const r1 = ky + 64;
  k += button(F, X0 + 22, r1, 214, 46, 'Approve response', { kind: 'primary', icon: 'check' });
  k += button(F, X0 + 248, r1, 170, 46, 'Request more info', { kind: 'secondary', size: 14 });
  k += button(F, X0 + 430, r1, 112, 46, 'Dismiss', { kind: 'danger', size: 14 });
  k += iconBtn(F, X0 + 556, r1 + 4, 38, 'users') + iconBtn(F, X0 + 604, r1 + 4, 38, 'dots');
  k += seg(F, X0 + 660, r1 + 7, ['Live', '1 h', '24 h'], 0).svg + toggle(F, X0 + 860, r1 + 13, true, T.blue) + toggle(F, X0 + 906, r1 + 13, false);
  k += keycap(F, X0 + 960, r1 + 12, '⌘K');
  k += ring(F, X0 + 1080, r1 + 40, 30, 0.94, T.crit, { size: 18, sw: 5, label: 'CONFIDENCE' });
  const r2 = r1 + 76;
  let cx = X0 + 22;
  for (const sv of ['Critical', 'High', 'Medium']) { const c = sevChip(F, cx, r2, sv); k += c.svg; cx += c.w + 8; }
  k += chips(F, cx, r2, [{ label: 'Awaiting your decision', color: T.high, icon: 'hand' }, { label: 'Resolved', color: T.ok, icon: 'check' }, { label: '94% confidence', color: T.ice, icon: 'sparkle', bgo: 0.1 }, { label: 'CCTV', color: T.t2, bgo: 0.07, weight: 500 }], 8).svg;
  const r3 = r2 + 52;
  k += incidentCard(F, X0 + 22, r3, 430, INCIDENTS[0], { selected: true });
  k += plan(F, X0 + 480, r3 + 10, 330, [
    { title: 'Track follower across cameras', sub: 'Auto-follow · 3 cameras', state: 'running' },
    { title: 'Lock D-214', sub: 'Reversible', state: 'approve' },
    { title: 'Create evidence pack', sub: 'Automatic', state: 'auto' },
  ], { gap: 50 });
  k += g(F, 'Command bar', rect(X0 + 22, r3 + 150, 788, 44, { r: 22, fill: '#FFFFFF', fo: 0.05 }) + rect(X0 + 22, r3 + 150, 788, 44, { r: 22, stroke: aiGrad(F), sw: 1.2, so: 0.75 }) + aiMark(F, X0 + 31, r3 + 158, 28) + text(X0 + 70, r3 + 177, 'Ask Co-pilot or search people, doors, cameras, incidents…', { size: 14, fill: T.t3 }) + keycap(F, X0 + 730, r3 + 161, '⌘K'));
  k += overline(X0 + 840, r3 + 18, 'Plan step states');
  [['Running', T.blue], ['Needs approval', T.high], ['Auto', T.ice], ['Done', T.ok], ['Queued', T.t3]].forEach(([n, c], i) => { k += circle(X0 + 846, r3 + 42 + i * 26, 5, { fill: c }) + text(X0 + 860, r3 + 46 + i * 26, n, { size: 12.5, fill: T.t2 }); });
  s += card(F, 'Components', X0, ky, kw, kh, {}, k);

  // icons + spacing
  const ix = X0 + kw + 24, iw = X1 - ix;
  let ic = text(ix + 22, ky + 36, 'Icons · 24 px, 1.75 stroke', { size: 15, weight: 600, fill: T.t1 });
  const per = 10, cell = (iw - 44) / per;
  ICONS.slice(0, 50).forEach((n, i) => { ic += icon(F, n, ix + 22 + (i % per) * cell + (cell - 24) / 2, ky + 60 + Math.floor(i / per) * 42, 24, T.t2, 1.75); });
  const sy = ky + 270;
  ic += overline(ix + 22, sy, 'Spacing · 4 pt grid');
  [4, 8, 12, 16, 24, 32].forEach((v, i) => { ic += rect(ix + 22 + i * 80, sy + 16, v * 1.5, v * 1.5, { r: 3, fill: T.blue, fo: 0.5 }) + text(ix + 22 + i * 80, sy + 76, v + ' px', { size: 11.5, fill: T.t3 }); });
  ic += overline(ix + 22, sy + 104, 'Radius');
  [[6, 'Tags'], [12, 'Buttons'], [18, 'Cards'], [26, 'Sheets']].forEach(([r, n], i) => { ic += rect(ix + 22 + i * 130, sy + 116, 48, 36, { r, stroke: T.ice, so: 0.7, sw: 1.5 }) + text(ix + 78 + i * 130, sy + 138, r + ' · ' + n, { size: 11.5, fill: T.t3 }); });
  s += card(F, 'Icons and spacing', ix, ky, iw, kh, {}, ic);
  return F.render(s);
}
