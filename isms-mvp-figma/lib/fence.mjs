// AgilFence end-to-end flow: components drawn in the V11 visual language (Roboto, V11 tokens).
// New elements carry "NEW" in their layer names, like the other V11-fit frames.
import { f, rect, circle, line, poly, pathEl, text, rich, icon, image, g, textWidth, wrap } from './svg.mjs';
import { C, pill } from './v11.mjs';
import { V } from './clay.mjs';

// ---------- the scenario (illustrative) ----------
export const AF = {
  sector: 'Fence Sector 5', seg: '5-14', id: 'AGF-5-14', code: 'PER-005', sev: 'Critical',
  t0: '02:14:58', target: [63, 1],
  // world positions on the clay twin (north fence runs along Y = 1)
  cams: [
    { id: 'PTZ 7-02', kind: 'PTZ · thermal + IR', X: 61.2, Y: 2.0, dist: '85 m', pref: true },
    { id: 'CAM 7-11', kind: 'Fixed · colour', X: 66.2, Y: 1.7, dist: '120 m' },
    { id: 'PTZ 7-03', kind: 'PTZ · thermal wide', X: 69.6, Y: 4.0, dist: '270 m' },
  ],
  patrol: { id: 'Patrol 2 · Arjun + 1', from: [51.5, 2.4], via: [], to: [62.4, 2.4], eta: 'ETA 02:18:30' },   // standby on the perimeter road
};
// segment k (5-k) spans X = 34 + 2k .. 36 + 2k on the north fence
export const segX = k => [34 + 2 * k, 36 + 2 * k];

// ---------- fence close-up overlay for the 3D viewer (Locate) ----------
export function fenceSite(F, P, o = {}) {
  let s = '';
  const y = 1, [a0, a1] = segX(14);
  // segments: ticks + labels
  let seg = '';
  for (let k = 9; k <= 19; k++) {
    const [x0] = segX(k);
    const [tx, ty] = P(x0, y, 0.6), [bx, by] = P(x0, y, 0);
    seg += line(tx, ty - 10, bx, by + 6, { stroke: '#9FC3FF', so: 0.7, sw: 1.2 });
    const [lx, ly] = P(x0 + 1, y - 0.55, 0);
    const underPin = (o.cams || []).some(c => { const [px, py] = P(c.X, c.Y, 1.6); return Math.hypot(px - lx, py - ly) < 22; });
    if (o.segLabels !== false && k >= 11 && k <= 17 && !(k === 14 && o.alarm !== false) && !underPin) {
      seg += text(lx, ly, '5-' + k, { size: 12, weight: k === 14 ? 700 : 500, fill: k === 14 ? '#FFFFFF' : '#9FC3FF', anchor: 'middle' });
    }
  }
  s += g(F, 'Fence segments NEW', seg);
  // AgilFence sensing cable: fibre Bragg grating sensors along the fence
  if (o.sensors !== false) {
    let dots = '';
    for (let X = 46; X <= 80; X += 0.5) { const [dx, dy] = P(X, y, 0.35); const hot = X >= a0 - 0.2 && X <= a1 + 0.2; dots += circle(dx, dy, hot ? 2.6 : 1.7, { fill: hot ? V.crit : '#7FB2FF', fo: hot ? 1 : 0.8 }); }
    s += g(F, 'AgilFence sensors NEW', dots);
  }
  // alarm segment glow
  if (o.alarm !== false) {
    const [p0x, p0y] = P(a0, y, 0.6), [p1x, p1y] = P(a1, y, 0.6);
    s += g(F, 'Alarm segment 5-14 NEW', line(p0x, p0y, p1x, p1y, { stroke: V.crit, sw: 12, so: 0.25 }) + line(p0x, p0y, p1x, p1y, { stroke: V.crit, sw: 4 }) +
      [1.4, 2.4, 3.4].map((r, i) => { const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; pts.push(P(63 + r * Math.cos(a), y + r * 0.7 * Math.sin(a), 0.05)); } return poly(pts, { stroke: V.crit, so: 0.7 - i * 0.2, sw: 1.5 }); }).join(''));
  }
  // camera view cones towards the target, then camera pins
  for (const c of o.cams || []) {
    const [tx, ty] = o.target || AF.target, ang = Math.atan2(ty - c.Y, tx - c.X), d = Math.hypot(tx - c.X, ty - c.Y) * 1.25, hw = c.pref ? 0.32 : 0.24;
    const col = c.pref ? '#55D6E6' : '#7FB2FF';
    if (c.cone !== false) {
      const pts = [[c.X, c.Y]];
      for (let i = 0; i <= 10; i++) { const a = ang - hw + 2 * hw * i / 10; pts.push([c.X + d * Math.cos(a), c.Y + d * Math.sin(a)]); }
      s += g(F, `View cone ${c.id} NEW`, poly(pts.map(([a, b]) => P(a, b, 0.08)), { fill: col, fo: c.pref ? 0.24 : 0.12, stroke: col, so: 0.8, sw: 1.2 }));
    }
  }
  for (const c of o.cams || []) {
    const [cx, cy] = P(c.X, c.Y, 0), [hx, hy] = P(c.X, c.Y, 1.6), col = c.pref ? '#55D6E6' : '#7FB2FF';
    let m = line(cx, cy, hx, hy, { stroke: col, sw: 2 }) + circle(hx, hy, 14, { fill: '#1D232C', stroke: col, sw: 2 }) + icon(F, 'cctv', hx - 9, hy - 9, 18, '#FFFFFF', 1.8);
    if (c.label !== false) {
      const lab = c.text || `${c.id} · ${c.dist}`, lw = textWidth(lab, 13, 500) + 20, pl = c.place || (c.left ? 'left' : 'right');
      const lx = pl === 'above' ? hx - lw / 2 : hx + (pl === 'left' ? -20 - lw : 20), ly = pl === 'above' ? hy - 50 : hy - 14;
      m += rect(lx, ly, lw, 28, { r: 7, fill: '#1D232C', stroke: col, sw: 1.2 }) + text(lx + 10, ly + 19, lab, { size: 13, weight: 500, fill: '#FFFFFF' });
    }
    s += g(F, `Camera ${c.id} NEW`, m);
  }
  // patrol vehicle and route
  if (o.patrol) {
    const p = o.patrol, pts = [p.from, ...(p.via || []), p.to];
    s += g(F, 'Patrol route NEW', pathEl('M' + pts.map(([a, b]) => P(a, b, 0.1).map(f).join(' ')).join(' L'), { stroke: '#44AC0C', sw: 3, dash: '8 6' }));
    const at = p.at || p.from, [vx, vy] = P(at[0], at[1], 0.2);
    let v = circle(vx, vy, 15, { fill: '#44AC0C', stroke: '#FFFFFF', sw: 2 }) + icon(F, 'route', vx - 9, vy - 9, 18, '#FFFFFF', 2);
    const lab = `${p.id} · ${p.eta}`, lw = textWidth(lab, 13, 500) + 20;
    let lx = vx + 20, ly = vy - 14;
    if (p.place === 'below') { lx = Math.max(p.minX ?? -1e9, vx - lw / 2); ly = vy + (p.dy ?? 30); }
    v += rect(lx, ly, lw, 28, { r: 7, fill: '#1D232C', stroke: '#44AC0C', sw: 1.2 }) + text(lx + 10, ly + 19, lab, { size: 13, weight: 500, fill: '#FFFFFF' });
    s += g(F, 'Patrol vehicle NEW', v);
  }
  // runway hold label
  if (o.runway) {
    const [rx, ry] = P(o.runway.X ?? 75, o.runway.Y ?? 5, 0);
    const lab = o.runway.label, lw = textWidth(lab, 13, 500) + 20, col = o.runway.col || C.warn;
    s += g(F, 'Runway note NEW', rect(rx, ry - 14, lw, 28, { r: 7, fill: '#1D232C', stroke: col, sw: 1.2 }) + text(rx + 10, ry + 5, lab, { size: 13, weight: 500, fill: '#FFFFFF' }));
  }
  return g(F, 'AgilFence site overlay', s);
}

// ---------- system notification (NEW): appears top-right of the 3D viewer when the alarm lands ----------
export function toast(F, x, y, o) {
  const w = o.w || 420, lines = wrap(o.text, w - 72, 15, 400).slice(0, 3), h = 74 + lines.length * 21 + (o.actions ? 46 : 0);
  let s = rect(x, y, w, h, { r: 12, fill: '#1D232C', fo: 0.97, stroke: C.crit, sw: 1.5, filter: F.shadow(10, 18, 0.5) });
  s += rect(x, y, 6, h, { r: 3, fill: C.crit });
  s += circle(x + 34, y + 34, 16, { fill: C.crit }) + icon(F, o.icon || 'fence', x + 24, y + 24, 20, '#FFFFFF', 2);
  s += text(x + 62, y + 30, o.title, { size: 16, weight: 700, fill: '#FFFFFF' }) + text(x + w - 16, y + 30, o.time, { size: 13, fill: C.t2, anchor: 'end' });
  if (o.sound) s += g(F, 'Alarm tone on', icon(F, 'volume', x + w - 40 - textWidth(o.time, 13), y + 16, 18, '#FF8E8F', 1.8));
  s += text(x + 62, y + 50, o.sub, { size: 13, weight: 500, fill: '#FF8E8F' });
  lines.forEach((l, i) => { s += text(x + 62, y + 76 + i * 21, l, { size: 15, fill: C.t1 }); });
  if (o.actions) {
    let ax = x + 62; const ay = y + h - 44;
    for (const [lab, kind] of o.actions) {
      const bw = textWidth(lab, 14, 700) + 24, fill = kind === 'primary' ? C.blue : kind === 'danger' ? C.red : '#3A404B';
      s += rect(ax, ay, bw, 30, { r: 6, fill }) + text(ax + bw / 2, ay + 20, lab, { size: 14, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      ax += bw + 8;
    }
  }
  return { svg: g(F, 'System notification NEW', s), h };
}

// ---------- nearest-camera list (NEW): floats in the 3D viewer after Locate ----------
export function nearestCams(F, x, y, cams, o = {}) {
  const w = o.w || 300, rh = 54, h = 50 + cams.length * rh + 8;
  let s = rect(x, y, w, h, { r: 12, fill: '#1D232C', fo: 0.95, stroke: '#3E4655', sw: 1, filter: F.shadow(8, 14, 0.45) });
  s += icon(F, 'cctv', x + 16, y + 15, 18, '#55D6E6', 1.9) + text(x + 42, y + 30, o.title || 'Nearest cameras', { size: 16, weight: 700, fill: '#FFFFFF' }) + text(x + w - 16, y + 30, o.note || 'Seg 5-14', { size: 13, fill: C.t2, anchor: 'end' });
  cams.forEach((c, i) => {
    const ry = y + 50 + i * rh;
    if (c.pref) s += rect(x + 8, ry, w - 16, rh - 6, { r: 8, fill: '#55D6E6', fo: 0.12, stroke: '#55D6E6', so: 0.6, sw: 1 });
    s += text(x + 20, ry + 21, c.id, { size: 15, weight: 500, fill: '#FFFFFF' }) + text(x + 20, ry + 40, `${c.kind} · ${c.dist}`, { size: 12.5, fill: C.t2 });
    if (c.action) {   // the preferred camera offers one-click live view
      const bw = textWidth(c.action, 12, 700) + 20;
      s += g(F, 'Open live NEW', rect(x + w - 20 - bw, ry + 12, bw, 24, { r: 6, fill: C.blue }) + text(x + w - 20 - bw / 2, ry + 28, c.action, { size: 12, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    } else {
      const st = c.state || (c.pref ? 'Live · on target' : 'Live');
      const sw = textWidth(st, 12, 500) + 18;
      s += rect(x + w - 20 - sw, ry + 13, sw, 22, { r: 11, fill: c.pref ? '#0E5E68' : '#2C3036', stroke: c.pref ? '#55D6E6' : '#4A505B', sw: 1 }) + circle(x + w - 20 - sw + 10, ry + 24, 3.5, { fill: c.pref ? '#55D6E6' : C.online }) + text(x + w - 20 - sw + 18, ry + 28, st, { size: 12, weight: 500, fill: '#FFFFFF' });
    }
  });
  return { svg: g(F, 'Nearest cameras NEW', s), h };
}

// ---------- a video player with a clip scrubber (pre-alarm recording + live) ----------
// cam: {href, label, focus, box, boxCol, boxLabel, zoom}; clip: {from, alarm, to, now (0..1), live}
export function player(F, x, y, w, h, cam, o = {}) {
  const ih = h - (o.scrub === false ? 0 : 34);
  const [sw0, sh0] = cam.dims || [1280, 720];
  const sc = Math.max(w / sw0, ih / sh0) * (cam.zoom || 1), iw = sw0 * sc, ihh = sh0 * sc;
  const [fx, fy] = cam.focus || [0.5, 0.5];
  let ox = x + w / 2 - fx * iw, oy = y + ih / 2 - fy * ihh;
  ox = Math.min(x, Math.max(x + w - iw, ox)); oy = Math.min(y, Math.max(y + ih - ihh, oy));
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(ih)}" rx="6"/>`);
  let inner = `<image x="${f(ox)}" y="${f(oy)}" width="${f(iw)}" height="${f(ihh)}" preserveAspectRatio="none" href="${cam.href}" xlink:href="${cam.href}"/>`;
  if (cam.box) {
    const [bx, by, bw, bh] = cam.box, X = ox + bx * sc, Y = oy + by * sc, col = cam.boxCol || C.crit;
    const lw = cam.boxLabel ? textWidth(cam.boxLabel, 12, 500) + 12 : 0, ly = Math.min(Y + bh * sc + 3, y + ih - 22), lx = Math.max(x + 3, Math.min(X, x + w - lw - 3));
    inner += g(F, 'BBox NEW', rect(X, Y, bw * sc, bh * sc, { r: 3, stroke: col, sw: 2 }) + (cam.boxLabel ? rect(lx, ly, lw, 19, { r: 3, fill: col }) + text(lx + 6, ly + 14, cam.boxLabel, { size: 12, weight: 500, fill: '#FFFFFF' }) : ''));
  }
  inner += rect(x, y, w, 30, { fill: '#000000', fo: 0.45 }) + icon(F, 'cctv', x + 10, y + 7, 16, '#FFFFFF', 1.7) + text(x + 32, y + 20, cam.label, { size: 13, weight: 500, fill: '#FFFFFF' });
  if (o.badge) {
    const bw = textWidth(o.badge, 11, 700) + 22, bx = x + w - bw - 8, live = /LIVE/.test(o.badge);
    inner += rect(bx, y + 6, bw, 18, { r: 9, fill: live ? C.crit : '#3A404B' }) + circle(bx + 9, y + 15, 3, { fill: '#FFFFFF' }) + text(bx + 16, y + 19, o.badge, { size: 11, weight: 700, fill: '#FFFFFF' });
  }
  let s = rect(x, y, w, h, { r: 6, fill: '#000000' }) + `<g clip-path="${clip}">${inner}</g>`;
  if (o.scrub !== false && o.clip) {
    const c = o.clip, by = y + ih + 8, bx0 = x + 34, bw = w - 44 - textWidth(c.to, 12) - 10;
    s += icon(F, c.live ? 'pause' : 'play', x + 8, by - 1, 18, '#FFFFFF', 2);
    s += rect(bx0, by + 6, bw, 6, { r: 3, fill: '#3A404B' }) + rect(bx0, by + 6, bw * (c.now ?? 1), 6, { r: 3, fill: C.blue });
    if (c.alarm != null) s += rect(bx0 + bw * c.alarm - 1.5, by + 1, 3, 16, { fill: C.crit }) + text(bx0 + bw * c.alarm, by + 30, 'Alarm', { size: 10.5, weight: 500, fill: '#FF8E8F', anchor: 'middle' });
    s += circle(bx0 + bw * (c.now ?? 1), by + 9, 6, { fill: '#FFFFFF' });
    s += text(bx0 - 2, by + 30, c.from, { size: 10.5, fill: C.t2 }) + text(x + w - 8, by + 14, c.to, { size: 12, fill: C.t1, anchor: 'end' });
  }
  return g(F, 'Player ' + cam.label, s);
}
