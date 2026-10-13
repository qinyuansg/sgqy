import { Frame, T, SEV, rect, circle, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, pageHeader, surface, card, chip, chips, seg, iconBtn, overline, hair, vhair, aiMark, button } from '../lib/ui.mjs';
import { airport } from '../lib/twin.mjs';
import { INCIDENTS } from './data.mjs';

export function kpiStrip(F, x, y, w, items, o = {}) {
  const h = o.h || 100;
  let s = surface(F, x, y, w, h);
  const cw = w / items.length;
  items.forEach((it, i) => {
    const cx = x + i * cw + 24;
    let r = overline(cx, y + 30, it.k);
    r += text(cx, y + 68, it.v, { size: 30, weight: 600, fill: it.vcol || T.t1 });
    if (it.unit) r += text(cx + textWidth(it.v, 30, 600) + 6, y + 68, it.unit, { size: 15, weight: 500, fill: T.t3 });
    if (it.sub) r += rich(cx, y + 88, [{ t: it.sub, fill: it.subCol || T.t3 }], { size: 12 });
    if (i) r += vhair(x + i * cw, y + 20, y + h - 20);
    s += g(F, 'KPI ' + it.k, r);
  });
  return g(F, o.name || 'KPI strip', s);
}

export function incidentCard(F, x, y, w, inc, o = {}) {
  const h = o.h || 104, col = SEV[inc.sev];
  let s = surface(F, x, y, w, h, { r: 16, accent: o.selected ? T.blue : null, accentO: 0.9, fill: o.selected ? F.lin([[0, '#15233F'], [1, '#0F1A30']], 0, 0, 0, 1) : undefined });
  s += rect(x + 10, y + 16, 3, h - 32, { r: 1.5, fill: col });
  s += rect(x + 24, y + 18, 40, 40, { r: 12, fill: col, fo: 0.14 }) + icon(F, inc.icon, x + 33, y + 27, 22, col, 1.9);
  s += text(x + 78, y + 34, inc.short, { size: 14.5, weight: 600, fill: T.t1 });
  s += text(x + 78, y + 54, inc.loc, { size: 12, fill: T.t3 });
  s += text(x + w - 18, y + 34, inc.ago + ' ago', { size: 12, weight: 500, fill: T.t3, anchor: 'end' });
  const c = chips(F, x + 78, y + 66, [{ label: inc.sev, color: col, dot: true, h: 22, size: 11.5 }, { label: inc.conf + '% confidence', color: T.ice, icon: 'sparkle', h: 22, size: 11.5, bgo: 0.1 }, { label: inc.signals + ' signals', color: T.t2, icon: 'link', h: 22, size: 11.5, bgo: 0.07, weight: 500 }], 6);
  s += c.svg;
  if (o.selected) s += icon(F, 'chevR', x + w - 34, y + 64, 20, T.blue, 2.2);
  return g(F, 'Incident card ' + inc.id, s);
}

export default function overview() {
  const F = new Frame('03 · Operations overview');
  let s = backdrop(F) + shell(F, { active: 0 });
  const segm = seg(F, 0, 0, ['Live', '1 h', '24 h', '7 d'], 0);
  s += pageHeader(F, 'Operations overview', 'All sites · Live', {
    right: g(F, 'Range', seg(F, 1440 - segm.w, L.y0 + 8, ['Live', '1 h', '24 h', '7 d'], 0).svg),
  });
  s += kpiStrip(F, L.x0, 150, 1328, [
    { k: 'Raw alarms · 24 h', v: '1,248', sub: 'Ingested from 9 subsystems' },
    { k: 'Correlated incidents', v: '7', sub: '99.4% of alarm noise absorbed', subCol: T.ok },
    { k: 'Awaiting your decision', v: '3', vcol: T.high, sub: 'Oldest 1m 12s' },
    { k: 'Median time to decision', v: '2m 41s', sub: '▼ 76% vs. last month', subCol: T.ok },
    { k: 'Sensor health', v: '99.2', unit: '%', sub: '2 cameras degraded · T4' },
  ]);
  // twin card
  const tx = L.x0, ty = 270, tw = 1328, th = 786;
  let tc = surface(F, tx, ty, tw, th, { fill: F.rad([[0, '#13254A', 0.9], [1, '#080D18', 0.95]], 0.5, 0.55, 0.75) });
  tc += text(tx + 24, ty + 38, 'Digital twin', { size: 16, weight: 600, fill: T.t1 }) + text(tx + 128, ty + 38, 'Main airport · 5 terminals · 22 fence sectors', { size: 13, fill: T.t3 });
  const LAYERS = [
    { label: 'Incidents', color: T.crit, icon: 'alert', h: 30, size: 12.5 },
    { label: 'Cameras', color: T.ice, icon: 'video', h: 30, size: 12.5 },
    { label: 'AGIL Fence', color: T.teal, icon: 'fence', h: 30, size: 12.5 },
    { label: 'LiDAR', color: T.teal, icon: 'radar', h: 30, size: 12.5 },
    { label: 'Access', color: T.t3, icon: 'key', h: 30, size: 12.5, bgo: 0.05, weight: 500 },
  ];
  const sg = seg(F, 0, 0, ['3D', '2D'], 0, { h: 30 });
  const lw = chips(F, 0, 0, LAYERS, 8).w;
  tc += g(F, 'Layer toggles', chips(F, tx + tw - 24 - sg.w - 16 - lw, ty + 18, LAYERS, 8).svg);
  tc += seg(F, tx + tw - 24 - sg.w, ty + 18, ['3D', '2D'], 0, { h: 30 }).svg;
  const pins = INCIDENTS.map(i => ({ id: i.id, X: i.X, Y: i.Y, sev: i.sev, icon: i.icon, label: i.short, sub: i.loc, selected: i.key === 'tailgate' }));
  pins.find(p => p.id === 'INC-2416').h = 4;
  const tw_ = airport(F, tx + 10, ty + 40, tw - 20, th - 90, { pins, links: [{ a: [19, 36], b: [50, 27], sev: 'High' }], headroom: 40 });
  tc += tw_.svg;
  // legend
  let lg = '';
  let lgx = tx + 24;
  const ly = ty + th - 30;
  for (const [lab, col] of [['Critical', T.crit], ['High', T.high], ['Medium', T.med]]) { lg += circle(lgx + 5, ly - 4, 5, { fill: col }) + text(lgx + 16, ly, lab, { size: 12, fill: T.t2 }); lgx += textWidth(lab, 12) + 34; }
  lg += rect(lgx, ly - 8, 18, 6, { r: 2, fill: T.teal, fo: 0.6 }) + text(lgx + 26, ly, 'Fence normal', { size: 12, fill: T.t2 }); lgx += 120;
  lg += rect(lgx, ly - 8, 18, 6, { r: 2, fill: T.crit }) + text(lgx + 26, ly, 'Fence alarm', { size: 12, fill: T.t2 }); lgx += 112;
  lg += rect(lgx, ly - 10, 14, 10, { r: 2, fill: T.teal, fo: 0.2, stroke: T.teal, so: 0.6 }) + text(lgx + 22, ly, 'LiDAR coverage', { size: 12, fill: T.t2 }); lgx += 128;
  lg += circle(lgx + 5, ly - 4, 4, { fill: T.ice }) + text(lgx + 16, ly, 'Camera', { size: 12, fill: T.t2 });
  tc += g(F, 'Legend', lg);
  tc += g(F, 'Map controls', iconBtn(F, tx + tw - 60, ty + th - 150, 36, 'plus') + iconBtn(F, tx + tw - 60, ty + th - 108, 36, 'minus') + iconBtn(F, tx + tw - 60, ty + th - 66, 36, 'layers'));
  s += g(F, 'Digital twin card', tc);

  // right rail — needs attention
  const rx = 1464, rw = 432;
  let rr = text(rx, 176, 'Needs attention', { size: 18, weight: 600, fill: T.t1 }) + text(rx + 148, 176, '7', { size: 18, weight: 500, fill: T.t3 });
  rr += text(rx + rw, 176, 'By priority', { size: 13, weight: 500, fill: T.t3, anchor: 'end' });
  rr += text(rx, 198, 'Correlated by AI from 1,248 alarms', { size: 12.5, fill: T.t3 });
  INCIDENTS.forEach((inc, i) => { rr += incidentCard(F, rx, 216 + i * 114, rw, inc, { selected: i === 0 }); });
  s += g(F, 'Needs attention', rr);
  return F.render(s);
}
