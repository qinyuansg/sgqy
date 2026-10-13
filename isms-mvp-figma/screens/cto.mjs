// CTO view: what powers each screen, and how ready it is. A hand-off frame, not product UI.
import { Frame, T, f, rect, circle, line, pathEl, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { backdrop, surface, chip, chips, overline, hair, vhair, aiMark, aiGrad } from '../lib/ui.mjs';

const READY = { 'Demo-ready': T.ok, Pilot: T.high, 'R&D': T.violet };

export default function cto() {
  const F = new Frame('16 · CTO — Architecture & feasibility');
  let s = backdrop(F);
  const X0 = 72, X1 = 1848;
  s += text(X0, 92, 'Build map', { size: 34, weight: 600, fill: T.t1 }) + text(X0 + 190, 92, 'What powers each screen, and how ready it is', { size: 18, fill: T.t3 });
  s += chips(F, X1 - 330, 70, Object.entries(READY).map(([k, c]) => ({ label: k, color: c, dot: true, h: 28, size: 12.5 })), 8).svg;

  // ---- architecture (left) ----
  const ax = X0, aw = 860, ay = 136;
  let a = text(ax + 24, ay + 40, 'Reference architecture', { size: 16, weight: 600, fill: T.t1 }) + text(ax + aw - 24, ay + 40, 'On-premise · federated', { size: 13, fill: T.t3, anchor: 'end' });
  const layer = (y, h, title, sub, items, col, o = {}) => {
    let l = rect(ax + 24, y, aw - 48, h, { r: 16, fill: col, fo: 0.06, stroke: col, so: 0.35 });
    l += text(ax + 44, y + 28, title, { size: 14, weight: 600, fill: T.t1 }) + text(ax + 44, y + 46, sub, { size: 12, fill: T.t3 });
    const bw = (aw - 48 - 40 - (items.length - 1) * 10) / items.length;
    items.forEach(([ic, t1, t2], i) => {
      const bx = ax + 44 + i * (bw + 10), by = y + 60;
      l += rect(bx, by, bw, h - 76, { r: 12, fill: '#0A0F1A', fo: 0.8, stroke: '#FFFFFF', so: 0.08 });
      l += icon(F, ic, bx + 12, by + 12, 18, col, 1.9) + text(bx + 12, by + 48, t1, { size: 12.5, weight: 600, fill: T.t1 });
      if (t2) l += text(bx + 12, by + 64, t2, { size: 11, fill: T.t3 });
    });
    return g(F, 'Layer ' + title, l);
  };
  let ly = ay + 64;
  a += layer(ly, 172, 'Experience', 'This design · operator first', [['grid', 'Operator console', 'Overview, incidents'], ['sparkle', 'Co-pilot', 'Ask, explain, draft'], ['phone', 'Responder app', 'Dispatch, photos'], ['chart', 'Insights', 'Reports, analytics']], T.ice); ly += 188;
  a += layer(ly, 172, 'Central ISMS', 'Correlate · contextualise · orchestrate', [['layers', 'Event bus', 'Streams all signals'], ['link', 'Correlation', 'Rules + graph + ML'], ['cube', 'Digital twin', 'GIS / BIM, devices'], ['cpu', 'Co-pilot', 'On-prem LLM + RAG'], ['doc', 'Case & audit', 'Evidence, sign-off']], T.blue); ly += 188;
  a += layer(ly, 172, 'Site edge (per site)', 'Detect locally · keep running if WAN drops', [['video', 'Video analytics', 'GPU, pose, re-ID'], ['radar', 'LiDAR fusion', 'Count, classify'], ['filter', 'Local rules', 'Anti-passback, dwell'], ['server', 'Store & forward', 'Buffer, sync']], T.teal); ly += 188;
  a += layer(ly, 172, 'Sources', 'Existing systems · open protocols', [['video', 'CCTV / VMS', 'ONVIF'], ['key', 'Access control', 'OSDP, API'], ['fence', 'AGIL Fence', 'Native'], ['radar', 'LiDAR', 'SDK'], ['phone', 'Intercom', 'SIP / audio'], ['clock', 'Roster · AODB', 'HR, flights']], T.t2);
  ly += 192;
  // guardrails
  a += overline(ax + 24, ly + 8, 'Guardrails built in');
  const gr = [['hand', 'Human approves actions'], ['doc', 'Answers cite sources'], ['lock', 'Role-based, per site'], ['eye', 'Face match: watchlist only']];
  gr.forEach(([ic, t], i) => {
    const gx = ax + 24 + i * ((aw - 48) / 4);
    a += icon(F, ic, gx, ly + 22, 18, T.ok, 1.9) + text(gx + 26, ly + 36, t, { size: 12.5, weight: 500, fill: T.t1 });
  });
  s += g(F, 'Architecture', surface(F, ax, ay, aw, 1040 - ay) + a);

  // ---- feasibility matrix (right) ----
  const mx = ax + aw + 24, mw = X1 - mx;
  let m = text(mx + 24, ay + 40, 'Feature feasibility', { size: 16, weight: 600, fill: T.t1 }) + text(mx + mw - 24, ay + 40, 'Indicative · to confirm in technical workshop', { size: 13, fill: T.t3, anchor: 'end' });
  const cols = [['Capability', 24], ['Frame', 272], ['Key data', 330], ['Readiness', 536], ['Note', 648]];
  cols.forEach(([h, dx]) => { m += overline(mx + dx, ay + 80, h); });
  m += hair(mx + 24, ay + 92, mx + mw - 24);
  const rows = [
    ['Alarm correlation inbox', '04', 'ACS, VMS, sensor events', 'Demo-ready', 'Time · place · person keys'],
    ['Tailgating + anti-passback', '05', 'ACS, LiDAR count, video', 'Demo-ready', 'Anti-passback is ACS-native'],
    ['Identity spoofing', '06', 'ACS, travel-time graph', 'Demo-ready', 'Appearance check: pilot'],
    ['Unattended bag investigation', '07', 'Object analytics, re-ID', 'Pilot', 'Depends on camera overlap'],
    ['Watchlist loitering', '08', 'Face match, dwell', 'Pilot', 'Needs policy / legal sign-off'],
    ['Fight detection', '09', 'Pose, intercom audio', 'Pilot', 'Site tuning for false alarms'],
    ['Overstay (BA rules)', '10', 'ACS, roster', 'Demo-ready', 'Rules from airport BA spec'],
    ['AGIL Fence + LiDAR', '11', 'AGIL Fence, LiDAR, PTZ', 'Demo-ready', 'Existing product integration'],
    ['Natural-language Co-pilot', '12', 'Event store, SOP library', 'Demo-ready', 'Curated data; live = pilot'],
    ['3D digital twin', '03', 'GIS / BIM, device registry', 'Pilot', 'Stylised twin for demo'],
    ['Federation · small site', '15', 'Edge nodes, WAN', 'Pilot', 'Store-and-forward sync'],
    ['Access insights', '14', 'ACS history (12 mo)', 'Demo-ready', 'Batch analytics'],
    ['Autonomous response (no human)', '—', 'All of the above', 'R&D', 'Out of MVP scope by design'],
  ];
  rows.forEach(([cap, fr, data, rd, note], i) => {
    const yy = ay + 96 + i * 54, col = READY[rd];
    let r = text(mx + 24, yy + 32, cap, { size: 13.5, weight: 600, fill: T.t1 });
    r += text(mx + 272, yy + 32, fr, { size: 13, weight: 600, fill: T.t2 }) + text(mx + 330, yy + 32, data, { size: 12.5, fill: T.t2 });
    r += chip(F, mx + 536, yy + 18, rd, { color: col, dot: true, size: 11.5, h: 24 }).svg;
    r += text(mx + 648, yy + 32, note, { size: 12.5, fill: T.t3 });
    if (i < rows.length - 1) r += hair(mx + 24, yy + 53, mx + mw - 24, { so: 0.05 });
    m += g(F, 'Row ' + cap, r);
  });
  const fy = ay + 96 + rows.length * 54 + 22;
  m += hair(mx + 24, fy - 8, mx + mw - 24);
  m += overline(mx + 24, fy + 14, 'Non-functional targets for the demo build');
  [['Event → incident', '< 2 s'], ['Co-pilot answer', '< 5 s, with sources'], ['Deployment', 'On-prem / air-gapped'], ['Audit', 'Every AI and human action']].forEach(([k, v], i) => {
    const xx = mx + 24 + i * ((mw - 48) / 4);
    m += text(xx, fy + 42, k, { size: 12, fill: T.t3 }) + text(xx, fy + 62, v, { size: 13.5, weight: 600, fill: T.t1 });
  });
  s += g(F, 'Feasibility', surface(F, mx, ay, mw, 1040 - ay) + m);
  return F.render(s);
}
