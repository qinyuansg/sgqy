import { T, SEV, rect, circle, line, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { player, img, boxes, seg, surface, card, chip, chips, toggle, overline, hair, vhair } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';

// evidence card with camera tabs + player; returns {svg, y2}
export function evidenceCard(F, x, y, w, scene, o) {
  const pl = player(F, 'Player', x + 24, y + 64, w - 48, img(scene), o.player);
  const h = 64 + pl.h + 22;
  let s = text(x + 22, y + 38, o.title || 'Evidence', { size: 15, weight: 600, fill: T.t1 });
  s += text(x + 22 + textWidth(o.title || 'Evidence', 15, 600) + 10, y + 38, o.sub || '', { size: 13, fill: T.t3 });
  const tabs = seg(F, 0, 0, o.tabs, 0, { h: 30, size: 12 });
  s += seg(F, x + w - 22 - tabs.w, y + 16, o.tabs, 0, { h: 30, size: 12 }).svg;
  return { svg: g(F, 'Evidence card', surface(F, x, y, w, h) + s + pl.svg), y2: y + h };
}

export default function tailgate() {
  const B = boxes('door');
  return workspace('05 · Incident — Tailgating + anti-passback', {
    id: 'INC-2417', sev: 'Critical', icon: 'door', title: 'Tailgating at Staff Door D-214', status: 'Awaiting your decision',
    tags: ['T3 · Level 2 · Airside boundary', 'Detected 02:14:52'], conf: 94, confNote: 'High · 4 sources agree', age: '1m 12s',
  }, {
    summary: 'At 02:14:48 badge B-55821 (Ground Ops) opened Staff Door D-214. Two people crossed but only one credential was presented. The follower carries no badge and is now walking airside along Corridor L2-East.',
    sources: ['CCTV', 'Access control', 'LiDAR', 'Door sensor'],
    factors: [
      { label: 'Airside boundary door', v: 0.32, color: T.crit },
      { label: '2 people crossed, 1 badge presented', v: 0.28, color: T.crit },
      { label: 'Follower not matched to any credential', v: 0.20, color: T.high },
      { label: 'Night shift · low staffing in zone', v: 0.14, color: T.high },
    ],
    signals: [
      { t: '02:14:48', title: 'Badge granted · B-55821', sub: 'Access control · D-214', icon: 'key', color: T.ok },
      { t: '02:14:50', title: 'Door opened', sub: 'Door contact sensor', icon: 'door', color: T.blue },
      { t: '02:14:52', title: '2 crossings, 1 badge', sub: 'LiDAR people counter', icon: 'radar', color: T.crit },
      { t: '02:14:52', title: 'Tailgating detected', sub: 'Video analytics · CAM 3-118', icon: 'video', color: T.crit },
      { t: '02:14:59', title: 'Door held open 9 s', sub: 'Door contact · limit 5 s', icon: 'clock', color: T.high },
    ],
    center: (F, c) => {
      const ev = evidenceCard(F, c.x, c.y, c.w, 'door', {
        title: 'Evidence', sub: '5 cameras near D-214', tabs: ['Door D-214', 'Corridor L2-E', 'Airside side', '+2'],
        player: {
          cam: 'CAM 3-118 · Staff Door D-214', liveLabel: 'REPLAY  02:14:52', liveCol: T.high,
          boxes: [{ b: B.badge, color: T.ok, label: 'B-55821 · Granted', below: true }, { b: B.tail, color: T.crit, label: 'No credential · Follower' }],
          markers: [{ t: 0.33, color: T.ok }, { t: 0.4, color: T.blue }, { t: 0.47, color: T.crit }, { t: 0.66, color: T.high }], now: 0.47,
          tStart: '02:14:30', tEnd: '02:16:04',
        },
      });
      let s = ev.svg;
      const my = ev.y2 + 16, mh = c.y1 - my, mw = (c.w - 16) / 2;
      // module 1 — badge vs people
      let m1 = text(c.x + 22, my + 36, 'Door transaction', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + mw - 22, my + 36, 'D-214 · 02:14:48–02:14:59', { size: 12.5, fill: T.t3, anchor: 'end' });
      const bx = c.x + 22, by = my + 62;
      m1 += rect(bx, by, 170, 104, { r: 14, fill: T.ok, fo: 0.08, stroke: T.ok, so: 0.3 }) + overline(bx + 16, by + 26, 'Badges presented') + text(bx + 16, by + 78, '1', { size: 44, weight: 600, fill: T.t1 }) + icon(F, 'idcard', bx + 128, by + 54, 26, T.ok);
      m1 += circle(bx + 200, by + 52, 18, { fill: T.crit, fo: 0.16 }) + text(bx + 200, by + 59, '≠', { size: 20, weight: 700, fill: T.crit, anchor: 'middle' });
      m1 += rect(bx + 230, by, 170, 104, { r: 14, fill: T.crit, fo: 0.1, stroke: T.crit, so: 0.45 }) + overline(bx + 246, by + 26, 'People crossed') + text(bx + 246, by + 78, '2', { size: 44, weight: 600, fill: T.t1 }) + icon(F, 'users', bx + 358, by + 54, 26, T.crit);
      m1 += text(bx, by + 136, 'Counted by LiDAR + video analytics; door held 9 s (limit 5 s).', { size: 12.5, fill: T.t3 });
      s += g(F, 'Module Door transaction', surface(F, c.x, my, mw, mh) + m1);
      // module 2 — anti-passback
      const ax = c.x + mw + 16;
      let m2 = text(ax + 22, my + 36, 'Anti-passback', { size: 15, weight: 600, fill: T.t1 }) + chip(F, ax + mw - 22 - 84, my + 20, 'Armed', { color: T.ok, dot: true }).svg;
      const rows = [
        ['B-55821 · J. Tan', 'Ground Ops', 'Airside', T.ok, 'Entry logged'],
        ['Follower', 'Unknown', 'Airside', T.crit, 'No entry record'],
      ];
      rows.forEach(([a, b, z, col, st], i) => {
        const ry = my + 62 + i * 52;
        m2 += rect(ax + 22, ry, mw - 44, 44, { r: 12, fill: '#FFFFFF', fo: 0.035 });
        m2 += circle(ax + 42, ry + 22, 5, { fill: col }) + text(ax + 56, ry + 19, a, { size: 13.5, weight: 600, fill: T.t1 }) + text(ax + 56, ry + 35, b + ' · now in ' + z, { size: 11.5, fill: T.t3 });
        m2 += text(ax + mw - 38, ry + 27, st, { size: 12.5, weight: 600, fill: col, anchor: 'end' });
      });
      m2 += text(ax + 22, my + 196, 'Any exit attempt without a matching entry is denied and raised.', { size: 12.5, fill: T.t3 });
      m2 += toggle(F, ax + mw - 56, my + 208, true, T.blue) + text(ax + 22, my + 223, 'Hard anti-passback at D-214 (proposed)', { size: 13, weight: 500, fill: T.t2 });
      s += g(F, 'Module Anti-passback', surface(F, ax, my, mw, mh) + m2);
      return s;
    },
    sop: 'SOP-SEC-014',
    planSub: 'Tailgating at airside boundary · SOP-SEC-014 §3',
    plan: [
      { title: 'Track follower across cameras', sub: 'Auto-follow active · 3 cameras', state: 'running' },
      { title: 'Lock D-214 + hard anti-passback', sub: 'Reversible · expires in 2 h', state: 'approve' },
      { title: 'Dispatch Patrol Arjun to L2-East', sub: 'ETA 3 min · radio + mobile app', state: 'approve' },
      { title: 'Notify Ground Ops duty manager', sub: 'Badge holder’s supervisor', state: 'pending' },
      { title: 'Create evidence pack & log', sub: 'Clips, access logs, audit trail', state: 'auto' },
    ],
    copilot: {
      q: 'Where is the unbadged person now?',
      a: 'Last seen on CAM 3-121, Corridor L2-East at 02:15:40, walking towards Pier C. No match to any active credential. Arjun is 3 min away.',
      chips: ['Why is this critical?', 'Show cameras around D-214', 'Who is B-55821?'],
    },
  });
}
