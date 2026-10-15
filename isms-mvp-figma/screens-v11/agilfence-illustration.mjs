// AgilFence flow · step 1: the physical trigger, as an editable vector illustration in the V11 palette.
// A fence bay with the AgilFence sensing cable (fibre Bragg grating sensors), a climber on the
// landside face, the strain the climb puts into the fibre, and the segment it is pinned to.
import { f, rect, circle, line, poly, pathEl, text, rich, icon, g, textWidth, wrap } from '../lib/svg.mjs';
import { C } from '../lib/v11.mjs';

const TEAL = '#55D6E6', FIB = '#7FB2FF';

// vector climber (back view), feet on the mesh; x,y = hips
function climber(F, x, y, k = 1) {
  const S = (a, b) => [x + a * k, y + b * k];
  const col = '#2A2F38', edge = '#9AA3B2';
  let s = '';
  // legs: left knee up, right leg down
  s += pathEl(`M${S(-14, 0)} L${S(-30, 46)} L${S(-18, 78)}`, { stroke: col, sw: 20 * k, cap: 'round', join: 'round' });
  s += pathEl(`M${S(14, 0)} L${S(20, 70)} L${S(16, 128)}`, { stroke: col, sw: 20 * k, cap: 'round', join: 'round' });
  // torso
  s += poly([S(-30, -118), S(30, -118), S(26, 6), S(-26, 6)], { fill: '#323844', stroke: edge, so: 0.35, sw: 1.5 });
  // backpack
  s += rect(...S(-22, -104), 44 * k, 62 * k, { r: 8 * k, fill: '#1E222A', stroke: edge, so: 0.3, sw: 1.2 });
  // arms up to the top rail
  s += pathEl(`M${S(-26, -110)} L${S(-44, -168)} L${S(-40, -224)}`, { stroke: col, sw: 16 * k, cap: 'round', join: 'round' });
  s += pathEl(`M${S(26, -110)} L${S(46, -170)} L${S(44, -230)}`, { stroke: col, sw: 16 * k, cap: 'round', join: 'round' });
  s += circle(...S(-40, -226), 9 * k, { fill: '#1A1D22' }) + circle(...S(44, -232), 9 * k, { fill: '#1A1D22' });   // dark gloves
  // head + cap
  s += circle(...S(0, -140), 20 * k, { fill: '#1A1C22' }) + pathEl(`M${S(-21, -146)} Q${S(0, -170)} ${S(21, -146)} Z`, { fill: '#121418' });
  return g(F, 'Climber (illustrative)', s);
}

// fence bay: posts, rails, chain-link mesh, Y-arm barbed wire, the AgilFence cable with sensors
export function fenceIllustration(F, X, Y, Wd, Ht, o = {}) {
  let s = '';
  const top = Y + 70, bot = Y + Ht - 60, posts = [X + 40, X + Wd / 2, X + Wd - 40];
  // ground
  s += rect(X, bot, Wd, Y + Ht - bot, { fill: F.lin([[0, '#1A202A'], [1, '#0B0E13']]) });
  // mesh (clipped to the bay)
  const clip = F.clip(`<rect x="${f(X + 40)}" y="${f(top)}" width="${f(Wd - 80)}" height="${f(bot - top)}"/>`);
  let mesh = '';
  for (let i = -20; i < (Wd / 26) + 20; i++) {
    const x0 = X + 40 + i * 26;
    mesh += line(x0, top, x0 + (bot - top) * 0.55, bot, { stroke: '#5C6675', sw: 1.4, so: 0.75 }) + line(x0 + (bot - top) * 0.55, top, x0, bot, { stroke: '#5C6675', sw: 1.4, so: 0.75 });
  }
  s += g(F, 'Chain-link mesh', `<g clip-path="${clip}">${mesh}</g>`);
  // posts, rails, Y-arms, barbed wire
  let fr = '';
  for (const px of posts) {
    fr += rect(px - 7, top - 40, 14, bot - top + 40, { r: 3, fill: '#8C96A6' });
    fr += line(px, top - 40, px - 46, top - 86, { stroke: '#8C96A6', sw: 6, cap: 'round' }) + line(px, top - 40, px + 46, top - 86, { stroke: '#8C96A6', sw: 6, cap: 'round' });
  }
  fr += line(X + 40, top, X + Wd - 40, top, { stroke: '#8C96A6', sw: 6 }) + line(X + 40, bot, X + Wd - 40, bot, { stroke: '#8C96A6', sw: 6 });
  for (const dy of [-56, -70, -84]) fr += line(X + 20, top + dy, X + Wd - 20, top + dy, { stroke: '#8C96A6', sw: 2, dash: '7 6' });
  s += g(F, 'Posts, rails and barbed wire', fr);
  // AgilFence sensing cable along the mesh, with FBG sensors
  const cy = o.cableY ?? (top + (bot - top) * 0.42);
  let cab = line(X + 20, cy, X + Wd - 20, cy, { stroke: FIB, sw: 4, so: 0.9 });
  const hot = o.hotX ?? (X + Wd * 0.55);
  for (let x = X + 34; x < X + Wd - 20; x += 44) {
    const d = Math.abs(x - hot), on = o.strain !== false && d < 140;
    cab += circle(x, cy, on ? 7 : 5, { fill: on ? C.crit : TEAL, stroke: '#FFFFFF', so: on ? 0.9 : 0.4, sw: 1.5 });
    if (on) cab += circle(x, cy, 16, { fill: C.crit, fo: 0.18 });
  }
  s += g(F, 'AgilFence cable · FBG sensors NEW', cab);
  // strain waves travelling along the fibre from the contact point
  if (o.strain !== false) {
    let w = '';
    for (let i = 1; i <= 3; i++) w += pathEl(`M${f(hot - 40 * i - 30)} ${f(cy)} q ${f(10 + 8 * i)} ${f(-26 - 6 * i)} ${f(20 + 16 * i)} 0 t ${f(20 + 16 * i)} 0`, { stroke: C.crit, sw: 2.5, so: 1 - i * 0.25 }) +
      pathEl(`M${f(hot + 40 * i - 10)} ${f(cy)} q ${f(10 + 8 * i)} ${f(-26 - 6 * i)} ${f(20 + 16 * i)} 0 t ${f(20 + 16 * i)} 0`, { stroke: C.crit, sw: 2.5, so: 1 - i * 0.25 });
    s += g(F, 'Strain in the fibre NEW', w);
  }
  if (o.climber !== false) s += climber(F, hot, cy + 40, o.k || 1);
  return g(F, 'AgilFence bay', s);
}

// perimeter strip: north fence of Sector 5 with segments 5-11 … 5-17, the alarm segment in red
export function segmentStrip(F, x, y, w, o = {}) {
  let s = rect(x, y, w, 64, { r: 10, fill: '#1D232C', fo: 0.9, stroke: '#3E4655' });
  const n = 7, sw = (w - 40) / n;
  for (let i = 0; i < n; i++) {
    const k = 11 + i, sx = x + 20 + i * sw, hot = k === 14;
    s += rect(sx + 2, y + 18, sw - 4, 10, { r: 5, fill: hot ? C.crit : '#3A5A8C', fo: hot ? 1 : 0.8 });
    s += text(sx + sw / 2, y + 50, '5-' + k, { size: 13, weight: hot ? 700 : 400, fill: hot ? '#FFFFFF' : C.t2, anchor: 'middle' });
    if (hot) s += circle(sx + sw / 2, y + 23, 10, { fill: C.crit, fo: 0.25 });
  }
  return g(F, 'Sector 5 segments NEW', s);
}
