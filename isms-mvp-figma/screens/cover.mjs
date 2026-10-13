import { Frame, T, rect, circle, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { backdrop, chips, aiMark, aiGrad, overline, hair } from '../lib/ui.mjs';
import { airport } from '../lib/twin.mjs';
import { INCIDENTS } from './data.mjs';

export const INDEX = [
  ['01', 'Design foundations'], ['02', 'MVP user journeys'], ['03', 'Operations overview'], ['04', 'Alarm correlation inbox'],
  ['05', 'Tailgating + anti-passback'], ['06', 'Identity spoofing'], ['07', 'Unattended bag'], ['08', 'Watchlist loitering'],
  ['09', 'Fight detection'], ['10', 'Overstay'], ['11', 'AGIL Fence + LiDAR'], ['12', 'Co-pilot · ask anything'],
  ['13', 'Resolution & report'], ['14', 'Access insights'], ['15', 'Sites · federation'], ['16', 'Build map (CTO)'],
];

export default function cover() {
  const F = new Frame('00 · Cover');
  let s = backdrop(F);
  s += rect(0, 0, F.w, F.h, { fill: F.rad([[0, '#2D5BFF', 0.22], [1, '#2D5BFF', 0]], 0.72, 0.45, 0.5) });
  // hero twin
  const pins = INCIDENTS.map(i => ({ id: i.id, X: i.X, Y: i.Y, sev: i.sev, icon: i.icon, label: i.short, selected: i.key === 'tailgate' }));
  s += g(F, 'Hero twin', airport(F, 640, 110, 1250, 660, { pins, headroom: 10, fill: 1.0, links: [{ a: [19, 36], b: [50, 27], sev: 'High' }] }).svg);
  s += rect(0, 0, 900, F.h, { fill: F.lin([[0, '#05070D', 0.96], [0.75, '#05070D', 0.7], [1, '#05070D', 0]], 0, 0, 1, 0) });
  // title block
  const x = 120;
  s += aiMark(F, x, 150, 56);
  s += text(x + 76, 176, 'AGIL Secure ISMS · Co-pilot', { size: 18, weight: 600, fill: T.t1 }) + text(x + 76, 200, 'Smart Security & Automation', { size: 14, fill: T.t3 });
  s += text(x, 330, 'From alerts to', { size: 68, weight: 600, fill: T.t1, ls: -1.2 });
  s += text(x, 410, 'AI-orchestrated', { size: 68, weight: 600, fill: aiGrad(F), ls: -1.2 });
  s += text(x, 490, 'airport security.', { size: 68, weight: 600, fill: T.t1, ls: -1.2 });
  s += text(x, 560, 'MVP front-end design for the airport demo. One calm console that', { size: 20, fill: T.t2 });
  s += text(x, 590, 'detects, explains and recommends, while people stay in charge.', { size: 20, fill: T.t2 });
  s += chips(F, x, 630, [{ label: '7 demo use cases', icon: 'layers' }, { label: 'Operator-first', icon: 'user' }, { label: 'Human decides', icon: 'hand' }, { label: 'Federated · 3D twin', icon: 'cube' }].map(c => ({ ...c, color: T.t1, bgo: 0.07, weight: 500, h: 34, size: 14 })), 10).svg;
  // index
  const iy = 760;
  s += overline(x, iy, 'In this file');
  s += hair(x, iy + 14, 1800, { so: 0.1 });
  INDEX.forEach(([n, t], i) => {
    const cx = x + Math.floor(i / 4) * 420, cy = iy + 50 + (i % 4) * 40;
    s += text(cx, cy, n, { size: 14, weight: 600, fill: T.blue }) + text(cx + 34, cy, t, { size: 15, weight: 500, fill: T.t1 });
  });
  s += text(x, 1040, 'Design v0.1 · 13 Oct 2026 · All names, people and data are illustrative', { size: 13, fill: T.t3 });
  s += text(1800, 1040, '1920 × 1080 · Inter', { size: 13, fill: T.t3, anchor: 'end' });
  return F.render(s);
}
