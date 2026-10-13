import { T, SEV, rect, circle, line, pathEl, text, rich, icon, image, g, textWidth } from '../lib/svg.mjs';
import { img, boxes, thumb, surface, chip, chips, ring, overline, hair, vhair, kv } from '../lib/ui.mjs';
import { workspace } from './workspace.mjs';

export default function spoof() {
  const A = boxes('doorA17'), C = boxes('doorC2');
  return workspace('06 · Incident — Identity spoofing (impossible presence)', {
    id: 'INC-2414', sev: 'High', icon: 'idcard', title: 'Identity spoofing · impossible presence', status: 'Awaiting your decision',
    tags: ['Credential S-20931', 'T3 A17 → T1 C2'], conf: 82, confNote: 'High · 5 signals agree', age: '5m 03s',
  }, {
    summary: 'Credential S-20931 (M. Rahman, Apex FM contractor) opened T3 Door A17 at 02:09:12 and T1 Door C2 at 02:13:20, only 4 min apart. The fastest airside route takes 19 min, and the person at C2 does not look like the A17 holder.',
    sources: ['Access control', 'CCTV', 'Roster', 'Card registry'],
    factors: [
      { label: 'Impossible travel · 4 min vs 19 min', v: 0.34, color: T.crit },
      { label: 'Appearance differs at C2', v: 0.22, color: T.high },
      { label: 'Legacy SSID used after re-issue', v: 0.16, color: T.high },
      { label: 'Outside roster (08:00–17:00)', v: 0.10, color: T.high },
    ],
    signals: [
      { t: '02:09:12', title: 'Granted · T3 Door A17', sub: 'Access control · new SSID', icon: 'key', color: T.ok },
      { t: '02:12:05', title: 'Denied ×3 · T1 Door C3', sub: 'Zone not permitted · legacy SSID', icon: 'lock', color: T.high },
      { t: '02:13:20', title: 'Granted · T1 Door C2', sub: 'Legacy SSID 0x4F21', icon: 'idcard', color: T.crit },
      { t: '02:13:21', title: 'Appearance differs', sub: 'Video analytics · CAM 1-204', icon: 'eye', color: T.crit },
      { t: '02:13:22', title: 'Off-roster access', sub: 'Roster system · shift 08–17', icon: 'clock', color: T.high },
    ],
    center: (F, c) => {
      let s = '';
      // impossible presence
      const h1 = 500;
      let a = text(c.x + 22, c.y + 38, 'Impossible presence', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + 184, c.y + 38, 'Same credential · two doors · 4 min apart', { size: 13, fill: T.t3 });
      const tw = 380, tx1 = c.x + 24, tx2 = c.x + c.w - 24 - tw, ty = c.y + 64;
      a += thumb(F, 'Door A17', tx1, ty, tw, img('doorA17'), { box: A.person, color: T.ok, tag: 'CAM 3-052 · 02:09:12' });
      a += thumb(F, 'Door C2', tx2, ty, tw, img('doorC2'), { box: C.person, color: T.crit, tag: 'CAM 1-204 · 02:13:20', active: true });
      const th = Math.round(tw * 9 / 16);
      a += text(tx1, ty + th + 24, 'T3 · Door A17', { size: 14, weight: 600, fill: T.t1 }) + text(tx1, ty + th + 42, 'Granted · new SSID · holder matches', { size: 12, fill: T.t3 });
      a += text(tx2, ty + th + 24, 'T1 · Door C2', { size: 14, weight: 600, fill: T.t1 }) + text(tx2, ty + th + 42, 'Granted · legacy SSID · different appearance', { size: 12, fill: T.crit });
      // connector
      const mx = c.x + c.w / 2, my = ty + th / 2;
      a += line(tx1 + tw + 8, my, tx2 - 8, my, { stroke: T.high, sw: 1.5, dash: '4 5' });
      a += rect(mx - 30, my - 30, 60, 60, { r: 30, fill: '#0A0F1A', stroke: T.high, sw: 1.5 }) + text(mx, my - 2, '4m', { size: 17, weight: 700, fill: T.t1, anchor: 'middle' }) + text(mx, my + 15, '08s', { size: 11, weight: 600, fill: T.t2, anchor: 'middle' });
      // travel comparison bars (single axis, minutes)
      const by = ty + th + 86, bx = c.x + 24, bw = c.w - 120, maxM = 20;
      a += overline(bx, by, 'Travel time · T3 A17 → T1 C2 (minutes)');
      const bar = (yy, v, col, lab, val) => rect(bx + 150, yy, (bw - 230) * v / maxM, 14, { r: 4, fill: col }) + text(bx, yy + 12, lab, { size: 13, weight: 500, fill: T.t1 }) + text(bx + 150 + (bw - 230) * v / maxM + 10, yy + 12, val, { size: 13, weight: 600, fill: T.t1 });
      a += bar(by + 20, 4.13, T.crit, 'Observed', '4m 08s');
      a += bar(by + 50, 19, T.t3, 'Fastest possible', '19 min');
      for (const m of [0, 5, 10, 15, 20]) { const xx = bx + 150 + (bw - 230) * m / maxM; a += line(xx, by + 74, xx, by + 78, { stroke: T.t4 }) + text(xx, by + 92, String(m), { size: 11, fill: T.t3, anchor: 'middle' }); }
      s += g(F, 'Impossible presence', surface(F, c.x, c.y, c.w, h1) + a);
      // credential (SSID old & new) + appearance check
      const my2 = c.y + h1 + 16, mh = c.y1 - my2, w1 = 500, w2 = c.w - w1 - 16;
      let m1 = text(c.x + 22, my2 + 36, 'Credential S-20931', { size: 15, weight: 600, fill: T.t1 }) + text(c.x + w1 - 22, my2 + 36, 'M. Rahman · Apex FM', { size: 12.5, fill: T.t3, anchor: 'end' });
      const rows = [
        ['New SSID · 0x9C7A21', 'DESFire EV3 · issued 12 Sep 2026', 'Active', T.ok, 'Used at A17'],
        ['Legacy SSID · 0x4F21', '125 kHz prox · should be revoked', 'Still active', T.crit, 'Used at C2'],
      ];
      rows.forEach(([t1, t2, st, col, used], i) => {
        const ry = my2 + 58 + i * 64;
        m1 += rect(c.x + 22, ry, w1 - 44, 54, { r: 12, fill: col, fo: i ? 0.08 : 0.04, stroke: col, so: i ? 0.4 : 0.12 });
        m1 += icon(F, 'idcard', c.x + 38, ry + 15, 24, col) + text(c.x + 74, ry + 23, t1, { size: 13.5, weight: 600, fill: T.t1 }) + text(c.x + 74, ry + 41, t2, { size: 11.5, fill: T.t3 });
        m1 += text(c.x + w1 - 38, ry + 23, st, { size: 12.5, weight: 600, fill: col, anchor: 'end' }) + text(c.x + w1 - 38, ry + 41, used, { size: 11.5, fill: T.t3, anchor: 'end' });
      });
      m1 += kv(F, c.x + 22, my2 + 210, w1 - 44, [['Permitted zones', 'T3 landside · T3 L1 service'], ['Roster', 'Day shift 08:00–17:00']], { gap: 28 });
      m1 += hair(c.x + 22, my2 + 254, c.x + w1 - 22);
      m1 += text(c.x + 22, my2 + 282, 'Legacy SSIDs left active after re-issue are easy to clone.', { size: 12.5, fill: T.t2 });
      m1 += rich(c.x + 22, my2 + 304, [{ t: '37 more ', fill: T.high, weight: 600 }, { t: 're-issued cards still have an active legacy SSID.', fill: T.t3 }], { size: 12.5 });
      s += g(F, 'Module Credential SSIDs', surface(F, c.x, my2, w1, mh) + m1);
      const ax = c.x + w1 + 16;
      let m2 = text(ax + 22, my2 + 36, 'Appearance check', { size: 15, weight: 600, fill: T.t1 });
      const fs = 116;
      m2 += image(F, 'Face A17', img('face_a17'), ax + 22, my2 + 58, fs, fs, 14) + image(F, 'Face C2', img('face_c2'), ax + 22 + fs + 12, my2 + 58, fs, fs, 14);
      m2 += text(ax + 22, my2 + 194, 'A17 holder', { size: 11.5, fill: T.t3 }) + text(ax + 34 + fs, my2 + 194, 'C2 person', { size: 11.5, fill: T.t3 });
      m2 += ring(F, ax + w2 - 62, my2 + 112, 34, 0.31, T.crit, { size: 20, sw: 6, label: 'SIMILARITY' });
      const attrs = [['Height', '1.71 m', '1.78 m'], ['Clothing', 'Green jacket', 'Black jacket, cap'], ['Gait', 'Baseline', 'Differs']];
      m2 += text(ax + 22, my2 + 222, 'Attribute', { size: 11.5, fill: T.t3 }) + text(ax + 120, my2 + 222, 'A17', { size: 11.5, fill: T.t3 }) + text(ax + 240, my2 + 222, 'C2', { size: 11.5, fill: T.t3 });
      attrs.forEach(([k, v1, v2], i) => { const yy = my2 + 244 + i * 23; m2 += text(ax + 22, yy, k, { size: 12.5, fill: T.t2 }) + text(ax + 120, yy, v1, { size: 12.5, weight: 500, fill: T.t1 }) + text(ax + 240, yy, v2, { size: 12.5, weight: 600, fill: T.high }); });
      m2 += text(ax + 22, my2 + 312, 'Likely a different person · operator confirms', { size: 12, fill: T.t3 });
      s += g(F, 'Module Appearance check', surface(F, ax, my2, w2, mh) + m2);
      return s;
    },
    sop: 'SOP-ACS-007',
    planSub: 'Suspected cloned / shared credential · SOP-ACS-007',
    plan: [
      { title: 'Suspend S-20931 (both SSIDs)', sub: 'Reversible · supervisor co-sign', state: 'approve' },
      { title: 'Dispatch patrol to T1 Door C2', sub: 'ETA 4 min · photo sent to app', state: 'approve' },
      { title: 'Call holder to confirm whereabouts', sub: 'Apex FM on-call number', state: 'pending' },
      { title: 'Revoke 37 stale legacy SSIDs', sub: 'Bulk action · Access admin', state: 'pending' },
      { title: 'Create evidence pack & log', sub: 'Both clips, access trail, roster', state: 'auto' },
    ],
    copilot: {
      q: 'Why is this door alarm considered high priority?',
      a: 'Nobody can reach C2 from A17 in 4 min (fastest is 19). C2 was opened with a legacy SSID that should have been revoked, by someone who does not match the holder.',
      chips: ['Show active legacy SSIDs', 'Where is the C2 person now?', 'Holder’s last 7 days'],
    },
  });
}
