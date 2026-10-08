/* Holographic product panels for the scenario deck (rendered as transparent PNGs).
   One function per panel; elements carrying data-mark are exported as boxes so the deck can
   place highlight frames, cursors and callouts exactly on them. Data follow the concept film. */
(function () {
  'use strict';
  const P = (window.P = {});
  const I = (n, s = 24, sw = 1.9) => C.icon(n, s, sw);
  const f = x => (+x).toFixed(1);

  const css = `
  .holo{position:relative;border-radius:26px;padding:26px 28px 28px;color:#EEF3FC;font-family:InterF,sans-serif;
    background:linear-gradient(180deg,rgba(17,36,76,.95),rgba(8,19,44,.95));border:1.6px solid rgba(125,195,255,.65);
    box-shadow:0 0 0 1px rgba(125,195,255,.16),0 0 48px rgba(60,150,255,.55),inset 0 1px 0 rgba(255,255,255,.12)}
  .holo .gl{position:absolute;inset:0;border-radius:26px;pointer-events:none;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,0) 35%)}
  .hd{display:flex;align-items:center;gap:18px}
  .brand{font-family:Jakarta,sans-serif;font-weight:800;font-size:27px;letter-spacing:-.01em;line-height:1;white-space:nowrap}
  .brand sup{font-size:13px;vertical-align:13px;margin-left:1px}
  .brand .sub{display:block;font-family:Mono,monospace;font-size:12px;letter-spacing:.32em;color:#78BEFF;font-weight:600;margin-top:7px}
  .vsep{width:1px;align-self:stretch;background:rgba(125,195,255,.28)}
  .dots{width:52px;height:36px;border-radius:10px;border:1px solid rgba(125,180,255,.4);display:grid;place-items:center;color:#A9C4FF;font-weight:700;letter-spacing:2px;flex:none}
  .card{background:rgba(24,48,98,.5);border:1px solid rgba(125,175,255,.24);border-radius:16px}
  .tile{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;flex:none;background:rgba(77,141,255,.22);color:#D6E4FF;border:1px solid rgba(125,175,255,.4)}
  .tile.red{background:rgba(255,59,92,.22);color:#FF9DAD;border-color:rgba(255,100,120,.55)}
  .tile.amb{background:rgba(255,176,32,.2);color:#FFD27A;border-color:rgba(255,190,70,.5)}
  .tile.grn{background:rgba(46,212,122,.2);color:#8BF0B8;border-color:rgba(70,220,140,.5)}
  .t1{font-size:21px;font-weight:600;line-height:1.2}
  .t2{font-size:16px;color:#A9BCDD;line-height:1.35;margin-top:4px}
  .lab{font-family:Mono,monospace;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:#86A6D8;font-weight:600}
  .btn{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:12px;border:1.5px solid #5B97FF;color:#DCE8FF;font-weight:600;font-size:18px;background:rgba(45,91,255,.22);box-shadow:0 0 18px rgba(77,141,255,.35);white-space:nowrap}
  .btn.solid{background:#2D5BFF;color:#fff;border-color:#6FA0FF}
  .btn.ok{background:rgba(46,212,122,.18);border-color:#2ED47A;color:#9BF2C2;box-shadow:0 0 16px rgba(46,212,122,.3)}
  .btn.sm{padding:8px 14px;font-size:15px;border-radius:10px}
  .pl{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:99px;font-family:Mono,monospace;font-size:13px;font-weight:600;letter-spacing:.06em;white-space:nowrap}
  .pl.red{background:rgba(255,59,92,.2);color:#FF9DAD;border:1px solid rgba(255,90,110,.5)}
  .pl.amb{background:rgba(255,176,32,.18);color:#FFD27A;border:1px solid rgba(255,190,70,.45)}
  .pl.grn{background:rgba(46,212,122,.16);color:#8BF0B8;border:1px solid rgba(70,220,140,.45)}
  .pl.blu{background:rgba(77,141,255,.18);color:#B8D2FF;border:1px solid rgba(110,160,255,.45)}
  .pl.gry{background:rgba(143,161,192,.14);color:#C3CEE2;border:1px solid rgba(143,161,192,.3)}
  .ev{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 11px;border-radius:9px;font-size:14px;font-weight:500;white-space:nowrap}
  .num{font-family:Jakarta,sans-serif;font-weight:800;letter-spacing:-.02em}
  .muted{color:#A9BCDD}
  `;
  const style = `<style>${css}</style>`;
  const brand = (sub = 'AI CO-PILOT') => `<div class="brand">AGIL<sup>®</sup> Secure ISMS<span class="sub">${sub}</span></div>`;
  const holo = (w, inner, extra = '') => `${style}<div class="holo" style="width:${w}px;${extra}"><div class="gl"></div>${inner}</div>`;
  const ring = (score, col, size = 74) => {
    const r = size / 2 - 6, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" style="flex:none"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${f(c * score / 100)} ${f(c)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="56%" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="800" font-size="${size * 0.34}" fill="#fff">${String(score).padStart(2, '0')}</text></svg>`;
  };
  const cctv = (kind, w, h, extra = '') => `<div style="position:relative;width:${w}px;height:${h}px;border-radius:12px;overflow:hidden;border:1px solid rgba(125,175,255,.3)">${K.ui.cctv(kind, w, h)}${extra}</div>`;
  const step = (name, time, sub, state) => {
    const col = state === 'done' ? '#2ED47A' : state === 'now' ? '#FFB020' : state === 'act' ? '#4D8DFF' : '#5D6B86';
    const icon = state === 'done' ? I('check', 22, 3) : state === 'now' ? I('pulse', 22, 2.4) : I('clock', 20, 2);
    return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;width:180px;position:relative;z-index:1">
      <div style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:${state === 'todo' ? '#1A2440' : col};color:${state === 'todo' ? '#8FA0BF' : '#06101F'};box-shadow:0 0 18px ${state === 'todo' ? 'transparent' : col + '88'}">${icon}</div>
      <div style="font-weight:700;font-size:19px;margin-top:9px;color:${state === 'todo' ? '#8FA0BF' : col}">${name}</div>
      <div class="mono" style="font-size:14px;color:#DCE6F7;margin-top:3px">${time}</div>
      <div style="font-size:13px;color:#A9BCDD;margin-top:2px;line-height:1.25">${sub}</div></div>`;
  };
  const stepper = (steps, markIdx) => `<div style="position:relative;display:flex;justify-content:space-between;padding:4px 10px 0">
      <div style="position:absolute;left:100px;right:100px;top:27px;height:4px;border-radius:2px;background:linear-gradient(90deg,#2ED47A ${steps.filter(s => s[3] === 'done').length / (steps.length - 1) * 100 - 6}%,#3A4A6C 0)"></div>
      ${steps.map((s, i) => i === markIdx ? `<div data-mark="step" style="position:relative;z-index:1">${step(...s)}</div>` : step(...s)).join('')}</div>`;

  // ------------------------------------------------------------------ AI assistant orb
  P.orb = () => `<div style="width:360px;height:400px;position:relative">
    <svg width="360" height="400" viewBox="0 0 360 400" style="overflow:visible">
      <defs>
        <radialGradient id="ob" cx="40%" cy="32%" r="72%"><stop offset="0" stop-color="#F2FBFF"/><stop offset=".22" stop-color="#9BD9FF"/><stop offset=".55" stop-color="#3F86FF"/><stop offset=".85" stop-color="#2346C8"/><stop offset="1" stop-color="#1A2F8A"/></radialGradient>
        <radialGradient id="oh" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#5FB8FF" stop-opacity=".55"/><stop offset="1" stop-color="#5FB8FF" stop-opacity="0"/></radialGradient>
        <filter id="ogl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
        <linearGradient id="oe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D6EEFF"/></linearGradient>
      </defs>
      <circle cx="180" cy="176" r="170" fill="url(#oh)"/>
      <path d="M118 286 C104 318 84 344 60 362 C102 356 140 338 166 310Z" fill="#3F7BFF" opacity=".9"/>
      <circle cx="180" cy="176" r="118" fill="url(#ob)"/>
      <circle cx="180" cy="176" r="118" fill="none" stroke="#BFE6FF" stroke-width="3" opacity=".7"/>
      <ellipse cx="148" cy="118" rx="54" ry="30" fill="#fff" opacity=".45" filter="url(#ogl)"/>
      <rect x="138" y="150" width="22" height="44" rx="11" fill="url(#oe)"/><rect x="200" y="150" width="22" height="44" rx="11" fill="url(#oe)"/>
      <path d="M148 218 C164 236 196 236 212 218" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <circle cx="180" cy="176" r="138" fill="none" stroke="#8FD3FF" stroke-width="2" opacity=".45" stroke-dasharray="4 10"/>
    </svg></div>`;

  // ------------------------------------------------------------------ 22:00 shift briefing
  P.briefing = () => {
    const row = (tile, ic, t, d, right, mark) => `<div class="card" ${mark ? `data-mark="${mark}"` : ''} style="display:flex;align-items:center;gap:18px;padding:14px 18px;margin-top:12px">
      <div class="tile ${tile}">${I(ic, 26)}</div>
      <div style="flex:1;min-width:0"><div class="t1">${t}</div><div class="t2">${d}</div></div>
      ${right ? `<div style="text-align:right;flex:none">${right}</div>` : ''}<div style="color:#7FA6E6;flex:none">${I('arrow', 22, 2)}</div></div>`;
    return holo(1120, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:24px">Night shift briefing</div><div class="t2" style="margin-top:3px">Terminal 2 Security Operations Centre</div></div>
        <span class="pl blu">22:00 – 07:00</span><div class="dots">···</div></div>
      ${row('grn', 'shieldCheck', 'Airport status', 'Normal operations · 14 departures and 9 arrivals overnight', '<span class="pl grn">Normal</span>')}
      ${row('amb', 'list', 'Open items from the day shift', '2 carried over: lost-property case at Gate B7 · CAM 2-044 reconnecting', '<span style="color:#FFB020;font-weight:700;font-size:18px">↑ +1</span><div class="t2" style="margin:0;font-size:13px">vs last night</div>')}
      ${row('', 'eye', 'On my watch list', 'Staff Door D-214 (repeated door-held alarms) · Fence Sector 7 (wind) · CAM 4-221 (image fading)', '<span style="color:#FFB020;font-weight:700;font-size:18px">3 items</span>', 'watch')}
      ${row('', 'users', 'Planned activity', 'Cleaning crews at Pier C 01:00–03:00 · runway-light works 23:30–04:00')}
      ${row('', 'signal', 'Weather', 'Gusts to 32 km/h after midnight: fence-sensor nuisance alarms likely')}
      ${row('', 'queue', 'Morning peak', 'Checkpoint 3 busiest 05:30–06:30 · about 4,800 passengers forecast')}
      <div data-mark="note" style="display:flex;align-items:center;gap:16px;margin-top:16px;padding:16px 20px;border-radius:14px;background:rgba(77,141,255,.14);border:1px solid rgba(125,180,255,.45)">
        <div style="color:#FFD27A">${I('sparkle', 28)}</div>
        <div style="font-size:18px;line-height:1.35"><b>No immediate action needed.</b> I'll set aside the expected nuisance alarms (cleaning, wind), keep watching, and alert you when something needs you.</div></div>`);
  };

  // ------------------------------------------------------------------ 02:14 triage
  P.triage = () => {
    const inc = (score, col, sev, t, src, evs, btn, mark, closed) => `<div class="card" ${mark ? `data-mark="${mark}"` : ''} style="display:flex;align-items:center;gap:18px;padding:16px 18px;margin-top:12px;${col === '#FF3B5C' ? 'border-color:rgba(255,90,110,.6);background:rgba(90,20,40,.35)' : ''}">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">${ring(score, col)}<span class="mono" style="font-size:11px;letter-spacing:.14em;color:${col};font-weight:700">${sev}</span></div>
      <div style="flex:1;min-width:0"><div class="t1" style="font-size:22px">${t}</div><div class="t2 mono" style="font-size:13.5px">${src}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${evs.map(([ic, e]) => `<span class="ev" style="background:${col}22;color:${col === '#7C8BA8' ? '#C3CEE2' : col};border:1px solid ${col}55">${I(ic, 16)}${e}</span>`).join('')}</div></div>
      ${closed ? `<span class="pl grn" style="align-self:center">${I('check', 15, 2.6)} Closed by Nurul · AI-verified low risk</span>` : `<span class="btn ${col === '#FF3B5C' ? 'solid' : ''}" ${btn[1] ? `data-mark="${btn[1]}"` : ''}>${btn[0]} ${I('arrow', 18, 2)}</span>`}</div>`;
    const seg = (n, col) => `<div style="flex:${n};height:14px;background:${col};border-radius:3px"></div>`;
    return holo(1160, `
      <div class="hd">${brand()}<div class="vsep"></div><div style="flex:1;font-family:Jakarta;font-weight:700;font-size:23px">Incidents · Terminal 2</div>
        <span class="pl blu">${I('sparkle', 15)} AI triage ON</span><span class="pl gry">312 alarms → 3 incidents</span><div class="dots">···</div></div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px;padding:13px 18px;border-radius:14px;background:rgba(255,176,32,.14);border:1.5px solid rgba(255,190,70,.6)">
        <div style="color:#FFB020">${I('alarm', 26)}</div><div style="font-size:19px"><b style="color:#FFD27A">Attention required · 02:14</b> &nbsp;312 alarms in the last hour — <b>3 need you</b>, ranked by risk.</div></div>
      ${inc(94, '#FF3B5C', 'CRITICAL', 'Tailgating · Staff Door D-214 → airside', '02:13:52 · access control + video analytics · fused', [['users', '1 badge · 2 people'], ['door', 'Door open 14 s'], ['person', 'Not on roster'], ['route', 'Heading to Stand C3']], ['Show me', 'showme'], 'top')}
      ${inc(71, '#FFB020', 'HIGH', 'Unattended bag · Gate B12', '02:12:40 · video analytics · CAM 2-031', [['bag', 'Static 6 min'], ['person', 'Owner left the area'], ['plane', 'Gate boards 02:55']], ['Investigate', ''])}
      ${inc(8, '#7C8BA8', 'LOW', 'Fence vibration · Sector 7', '02:13:20 · perimeter sensor · verified by thermal camera', [['thermo', 'Thermal: small animal'], ['signal', 'Wind 32 km/h']], null, '', true)}
      <div class="card" data-mark="nuisance" style="padding:16px 20px;margin-top:12px">
        <div style="display:flex;align-items:center;gap:12px"><span style="color:#8FB4FF">${I('layers', 22)}</span><span style="font-size:20px"><b class="num" style="font-size:24px">309</b> nuisance alarms — grouped and explained</span><span class="btn sm" style="margin-left:auto">Review all</span></div>
        <div style="display:flex;gap:4px;margin-top:12px">${seg(214, '#4D8DFF')}${seg(61, '#34C7C9')}${seg(34, '#8A7CFF')}</div>
        <div style="display:flex;gap:26px;margin-top:10px;font-size:15px;color:#C3D2EC">
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#4D8DFF;margin-right:7px"></i><b>214</b> cleaning-roster match (Pier C)</span>
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#34C7C9;margin-right:7px"></i><b>61</b> wind & rain</span>
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#8A7CFF;margin-right:7px"></i><b>34</b> lens glare</span></div>
        <div class="mono" style="font-size:13px;color:#7BE8AC;margin-top:10px;letter-spacing:.04em">✓ Never silently dropped — every reason logged and reviewable</div></div>`);
  };

  // door camera snapshot with the two people boxed
  const doorSnap = (w, h) => {
    const svg = C.cctvDoor(420, 236, 'pdoor')
      .replace('<g class="p1">', '<g class="p1" transform="translate(243 176)">')
      .replace('<g class="p2">', '<g class="p2" transform="translate(278 178)">')
      .replace(/<g class="b1">[\s\S]*?<\/g>/, '<g><rect x="222" y="104" width="42" height="76" fill="none" stroke="#2ED47A" stroke-width="2"/><rect x="222" y="90" width="88" height="14" fill="#2ED47A"/><text x="226" y="101" font-family="Mono,monospace" font-size="10" font-weight="600" fill="#05200F">BADGE B-55821</text></g>')
      .replace(/<g class="b2">[\s\S]*?<\/g>/, '<g><rect x="256" y="102" width="46" height="80" fill="none" stroke="#FF3B5C" stroke-width="2.5"/><rect x="256" y="182" width="84" height="15" fill="#FF3B5C"/><text x="260" y="194" font-family="Mono,monospace" font-size="10" font-weight="700" fill="#fff">UNIDENTIFIED</text></g>');
    return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:12px;overflow:hidden;border:1px solid rgba(125,175,255,.3)"><div style="transform:scale(${w / 420},${h / 236});transform-origin:0 0;width:420px;height:236px">${svg}</div></div>`;
  };
  // Pier C / apron mini-map with the subject's track
  const trackMap = (w, h, o = {}) => `<svg width="${w}" height="${h}" viewBox="${o.vb || '0 0 520 300'}" style="border-radius:12px;background:#081530;border:1px solid rgba(125,175,255,.3)">
      <path d="M40 60 H300 V120 H40Z" fill="rgba(77,141,255,.08)" stroke="#3E5A8E" stroke-width="2"/><text x="52" y="84" font-family="Mono" font-size="13" fill="#8FA6CC">PIER C · LEVEL 1</text>
      <path d="M300 90 H360" stroke="#3E5A8E" stroke-width="10"/><rect x="360" y="60" width="130" height="200" rx="8" fill="rgba(255,255,255,.03)" stroke="#2C3E62" stroke-width="2"/>
      ${[[380, 90, 'C2'], [380, 150, 'C3'], [380, 210, 'C4']].map(([x, y, t]) => `<rect x="${x}" y="${y}" width="90" height="40" rx="6" fill="none" stroke="#E5C14A" stroke-width="1.5" opacity=".6"/><text x="${x + 45}" y="${y + 26}" text-anchor="middle" font-family="Mono" font-size="15" fill="#E5C14A" opacity=".85">${t}</text>`).join('')}
      <path d="M150 120 C170 170 250 190 330 170 C360 162 390 168 410 170" fill="none" stroke="#FF5A6E" stroke-width="4" stroke-dasharray="8 7"/>
      <circle cx="150" cy="120" r="9" fill="#FFB020"/><text x="112" y="150" font-family="Mono" font-size="12" fill="#FFCB6B">D-214</text>
      ${[[150, 128, '3-118'], [262, 186, '4-203'], [360, 166, '4-207']].map(([x, y, t]) => `<g transform="translate(${x} ${y})"><circle r="5" fill="#4D8DFF"/><text x="8" y="-8" font-family="Mono" font-size="11" fill="#9CC0FF">CAM ${t}</text></g>`).join('')}
      <circle cx="${o.subj ? o.subj[0] : 352}" cy="${o.subj ? o.subj[1] : 166}" r="11" fill="#FF3B5C"/><circle cx="${o.subj ? o.subj[0] : 352}" cy="${o.subj ? o.subj[1] : 166}" r="22" fill="#FF3B5C" opacity=".3"/>
      ${(o.patrols || []).map(([x, y, t]) => `<g transform="translate(${x} ${y})"><circle r="10" fill="#2ED47A"/><circle r="20" fill="#2ED47A" opacity=".25"/><text x="14" y="5" font-family="Mono" font-size="13" font-weight="700" fill="#8BF0B8">${t}</text></g>`).join('')}
      ${(o.paths || []).map(d => `<path d="${d}" fill="none" stroke="#2ED47A" stroke-width="3" stroke-dasharray="5 6"/>`).join('')}
    </svg>`;

  // ------------------------------------------------------------------ 02:15 situation explained
  P.situation = () => {
    const fact = (ic, t, d, col) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid rgba(125,175,255,.14)">
      <div class="tile ${col || ''}" style="width:44px;height:44px;border-radius:11px">${I(ic, 22)}</div><div><div style="font-size:18px;font-weight:600">${t}</div><div class="t2" style="font-size:14.5px;margin-top:2px">${d}</div></div></div>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div class="tile red" style="width:46px;height:46px">${I('alarm', 24)}</div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:24px;color:#FF9DAD">Incident confirmed</div><div class="mono t2" style="font-size:13px;margin-top:3px">ID INC-0214-01 · Staff Door D-214 → airside</div></div>
        <span class="pl red" style="font-size:16px;padding:9px 16px">${I('alarm', 16)} CRITICAL 94</span><div class="dots">···</div></div>
      <div style="display:grid;grid-template-columns:330px 1fr 300px;gap:18px;margin-top:18px">
        <div class="card" style="padding:6px 18px 8px">
          ${fact('users', 'Tailgating', '1 badge used · 2 people passed · confirmed by AI and operator', 'red')}
          ${fact('clock', '02:13:52 detected', 'Confirmed 02:14:40 by Nurul')}
          ${fact('door', 'Door held open 14 s', 'Staff Door D-214 · Pier C, Level 1')}
          ${fact('person', 'Second person not on any roster', 'No badge, no shift booking', 'amb')}
          ${fact('route', 'Now at CAM 4-207', 'Heading to Stand C3 · about 2 min away', 'red')}
        </div>
        <div data-mark="evidence" style="display:flex;flex-direction:column;gap:12px">
          <div class="lab">CCTV · CAM 3-118 · 02:13:52</div>${doorSnap(500, 281)}
          <div class="lab" style="margin-top:2px">Live track · 3 cameras</div>${trackMap(500, 230, { vb: '24 44 492 226' })}
        </div>
        <div class="card" style="padding:16px 18px">
          <div class="lab">Why it is critical</div>
          ${[['door', 'Access control', 'Door held + one badge'], ['camera', 'Video analytics', 'Two people through'], ['list', 'Rosters', 'No match for person 2'], ['plane', 'Location', 'Airside · aircraft stands'], ['clock', 'History', '3 similar in 12 months']].map(([ic, a, b]) => `<div style="display:flex;gap:12px;align-items:center;margin-top:13px"><span style="color:#8FB4FF">${I(ic, 20)}</span><div><div style="font-size:16px;font-weight:600">${a}</div><div class="t2" style="font-size:14px;margin-top:1px">${b}</div></div></div>`).join('')}
          <div style="margin-top:16px;padding:10px 12px;border-radius:10px;background:rgba(255,59,92,.14);border:1px solid rgba(255,90,110,.45);font-size:14.5px;color:#FFC2CC">Risk rises as the person nears the aircraft stands.</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:18px;padding:14px 18px;border-radius:14px;background:rgba(77,141,255,.12);border:1px solid rgba(125,180,255,.4)">
        <div style="color:#8FD3FF">${I('sparkle', 26)}</div>
        <div style="flex:1"><div class="lab">Recommended first actions</div><div style="font-size:18px;margin-top:5px">Lock doors D-214 and D-216 &nbsp;·&nbsp; Track the person &nbsp;·&nbsp; Dispatch the nearest patrols</div></div>
        <span class="btn solid" data-mark="plan">View response plan ${I('arrow', 18, 2)}</span></div>`);
  };

  // ------------------------------------------------------------------ 02:15 response plan (duty manager)
  P.response = () => {
    const finding = (ic, t, d) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(125,175,255,.14)"><div class="tile" style="width:42px;height:42px;border-radius:10px">${I(ic, 21)}</div><div><div style="font-size:16.5px;font-weight:600">${t}</div><div class="t2" style="font-size:14px;margin-top:2px">${d}</div></div></div>`;
    const act = (n, t, d, btn, state, mark) => `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(125,175,255,.14)">
      <div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:16px;flex:none;background:${state === 'auto' ? '#2ED47A' : '#2D5BFF'};color:${state === 'auto' ? '#05200F' : '#fff'}">${n}</div>
      <div style="flex:1"><div style="font-size:18px;font-weight:600">${t}</div><div class="t2" style="font-size:14px;margin-top:2px">${d}</div></div>
      <span class="btn sm ${state === 'auto' ? 'ok' : n === 1 ? 'solid' : ''}" ${mark ? `data-mark="${mark}"` : ''}>${btn}</span></div>`;
    const kpi = (lab, val, sub, col) => `<div class="card" style="flex:1;padding:12px 16px"><div class="lab" style="font-size:11.5px">${lab}</div><div class="num" style="font-size:28px;color:${col};margin-top:5px">${val}</div><div class="t2" style="font-size:13.5px;margin-top:2px">${sub}</div></div>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:23px">Response plan · Tailgating to airside</div><div class="mono t2" style="font-size:13px;margin-top:3px">INC-0214-01 · Staff Door D-214 · CRITICAL 94</div></div>
        <span class="pl blu">${I('doc', 15)} Grounded in SOP AS-07 v3.2</span><div class="dots">···</div></div>
      <div style="display:grid;grid-template-columns:330px 1fr;gap:20px;margin-top:18px">
        <div class="card" style="padding:12px 18px 6px"><div class="lab">AI analysis · key findings</div>
          ${finding('camera', 'CCTV analysis', '2 people through D-214 on 1 badge')}
          ${finding('door', 'Access control', 'Door held open 14 s at 02:13:52')}
          ${finding('list', 'Roster check', 'Second person not on any roster')}
          ${finding('route', 'Live track', 'CAM 4-207, heading to Stand C3')}
          ${finding('doc', 'SOP AS-07', 'Unauthorised airside access: contain, locate, intercept, notify')}</div>
        <div>
          <div style="display:flex;gap:12px">${kpi('Predicted · if no action', 'Stand C3 · 02:17', 'person reaches the aircraft stands', '#FF8DA0')}${kpi('Predicted · with these actions', 'Intercept ~02:17', 'before the stand, doors contained', '#8BF0B8')}</div>
          <div class="card" data-mark="actions" style="padding:6px 18px;margin-top:12px">
            ${act(1, 'Lock staff doors D-214 and D-216', 'Access control · 2 doors', 'Approve', '', 'approve')}
            ${act(2, 'Track the person across cameras', 'Video analytics · started 02:15:01', '✓ Auto', 'auto')}
            ${act(3, 'Dispatch patrols P-1 and P-5', 'Nearest units · ETA 90 s', 'Approve', '')}
            ${act(4, 'Notify Airport Police', 'Message drafted by AI', 'Send', '')}
            ${act(5, 'Intercept and verify identity', 'Patrol P-1 on arrival', 'Confirm', '')}
          </div></div></div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px">
        <div class="t2" style="flex:1;font-size:15px;margin:0">${I('shieldCheck', 18)} Human in command: nothing is actioned until you approve. Every step is logged to the audit trail.</div>
        <span class="btn">Approve all</span><span class="btn solid">Approve step by step ${I('arrow', 18, 2)}</span></div>`);
  };

  // ------------------------------------------------------------------ 02:16 live monitoring
  P.monitor = () => {
    const st = (ic, t, d, pill) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(125,175,255,.14)"><div class="tile" style="width:40px;height:40px;border-radius:10px">${I(ic, 20)}</div><div style="flex:1"><div style="font-size:16.5px;font-weight:600">${t}</div><div class="t2" style="font-size:13.5px;margin-top:1px">${d}</div></div>${pill}</div>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div class="tile red" style="width:46px;height:46px">${I('users', 24)}</div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:23px">Incident in progress · Staff Door D-214</div><div class="mono t2" style="font-size:13px;margin-top:3px">INC-0214-01 · started 02:13:52</div></div>
        <span class="pl amb" style="font-size:15px;padding:8px 14px">IN PROGRESS</span><div class="dots">···</div></div>
      <div class="card" style="padding:16px 10px 14px;margin-top:16px">${stepper([
        ['Detect', '02:13:52', 'AI detection', 'done'], ['Validate', '02:14:40', 'Confirmed by Nurul', 'done'], ['Respond', '02:15:04', 'Doors locked · patrols sent', 'done'],
        ['Monitor', 'now', 'Tracking · P-1 40 s away', 'now'], ['Close', '—', 'Pending', 'todo']], 3)}</div>
      <div style="display:grid;grid-template-columns:330px 1fr 290px;gap:16px;margin-top:14px">
        <div class="card" data-mark="status" style="padding:10px 16px 4px"><div class="lab">Response status</div>
          ${st('lock', 'Doors D-214/216', 'Locked 02:15:04', '<span class="pl grn">Locked</span>')}
          ${st('route', 'Patrol P-1', 'Dispatched 02:15:12', '<span class="pl amb">40 s</span>')}
          ${st('route', 'Patrol P-5', 'Dispatched 02:15:12', '<span class="pl amb">1 min 20 s</span>')}
          ${st('send', 'Airport Police', 'Notified 02:15:19', '<span class="pl grn">Sent</span>')}
          ${st('camera', 'AI tracking', 'CAM 4-207 · live', '<span class="pl blu">Live</span>')}</div>
        <div><div class="lab" style="margin-bottom:8px">Live map · Pier C apron</div>${trackMap(520, 300, { subj: [360, 168], patrols: [[300, 230, 'P-1'], [470, 270, 'P-5']], paths: ['M300 230 C320 210 340 190 356 176', 'M470 270 C440 240 400 200 372 180'] })}</div>
        <div class="card" style="padding:14px 16px">
          <div class="lab">Intercept ETA</div>
          <div style="display:flex;gap:10px;margin-top:10px"><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,.04)"><div class="t2" style="font-size:12.5px;margin:0">Planned</div><div class="num" style="font-size:24px">02:17:30</div></div>
            <div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,176,32,.14);border:1px solid rgba(255,190,70,.5)"><div class="t2" style="font-size:12.5px;margin:0;color:#FFD27A">Updated</div><div class="num" style="font-size:24px;color:#FFD27A">02:17:40</div></div></div>
          <div style="font-size:14.5px;margin-top:12px;line-height:1.4;color:#FFD9A0">+10 s: P-1 rerouted around a refuelling truck.</div>
          <div class="t2" style="font-size:13.5px;margin-top:10px">${I('clock', 15)} Next update in 10 s</div>
          <span class="btn sm" style="margin-top:12px">View live feed ${I('arrow', 15, 2)}</span></div>
      </div>`);
  };

  // ------------------------------------------------------------------ 02:16 investigation (plain-language search)
  P.investigate = () => {
    const sight = (kind, t, place, cam, what, live) => `<div style="display:flex;gap:12px;align-items:center;padding:8px;border-radius:12px;${live ? 'background:rgba(46,212,122,.1);border:1px solid rgba(70,220,140,.45)' : 'border:1px solid transparent'}">
      <div style="width:120px;height:68px;border-radius:8px;overflow:hidden;flex:none;position:relative">${K.ui.cctv(kind, 120, 68)}</div>
      <div style="flex:1"><div class="mono" style="font-size:15px;color:${live ? '#8BF0B8' : '#DCE6F7'};font-weight:600">${t}${live ? ' · live' : ''}</div><div style="font-size:16px;font-weight:600;margin-top:2px">${place}</div><div class="t2" style="font-size:13px;margin-top:1px">${cam} · ${what}</div></div></div>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div class="tile amb" style="width:46px;height:46px">${I('bag', 24)}</div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:23px">Investigation · Unattended bag, Gate B12</div><div class="mono t2" style="font-size:13px;margin-top:3px">INC-0214-02 · HIGH 71 · gate boards 02:55</div></div>
        <span class="pl blu">${I('sparkle', 15)} Concept</span><div class="dots">···</div></div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px;padding:14px 18px;border-radius:14px;background:rgba(5,12,28,.75);border:1.5px solid #5B97FF;box-shadow:0 0 22px rgba(77,141,255,.35)">
        <span style="color:#8FB4FF">${I('search', 26)}</span><span style="font-size:21px;flex:1">Who left the black suitcase at Gate B12?<span style="display:inline-block;width:2px;height:24px;background:#8FD3FF;vertical-align:-4px;margin-left:3px"></span></span>
        <span class="btn solid sm">Search</span></div>
      <div style="display:grid;grid-template-columns:420px 1fr;gap:18px;margin-top:16px">
        <div><div class="lab" style="margin-bottom:8px">CAM 2-031 · Gate B12</div>${cctv('gate', 420, 239)}
          <div class="card" style="margin-top:14px;padding:14px 16px">
            <div style="display:flex;align-items:center;gap:10px"><span style="color:#8FD3FF">${I('sparkle', 22)}</span><span style="font-family:Jakarta;font-weight:700;font-size:21px">Owner traced in 4 s</span><span class="pl blu" style="margin-left:auto">Match 96%</span></div>
            <div class="t2" style="font-size:15px;margin-top:8px">Woman · red coat · grey backpack · 38 cameras searched</div></div></div>
        <div class="card" data-mark="trail" style="padding:12px 14px">
          <div class="lab" style="margin:2px 0 6px 4px">Trace · 4 sightings</div>
          ${sight('gate', '02:08:14', 'Gate B12', 'CAM 2-031', 'places suitcase, walks away')}
          ${sight('walk', '02:10:02', 'Pier B walkway', 'CAM 2-044', 'heading to main terminal')}
          ${sight('esc', '02:12:47', 'Escalator to Level 2', 'CAM 1-112', 'going up')}
          ${sight('cafe', '02:16:10', 'Café · Level 2', 'CAM 1-130', 'seated', true)}
        </div></div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:16px;padding:14px 18px;border-radius:14px;background:rgba(77,141,255,.12);border:1px solid rgba(125,180,255,.4)">
        <div style="width:46px;height:46px;border-radius:50%;background:#13A38B;display:grid;place-items:center;font-family:Jakarta;font-weight:700;font-size:17px">AR</div>
        <div style="flex:1"><div style="font-size:18px;font-weight:600">Nearest patrol: P-3 · Arjun · 2 min away</div><div class="t2" style="font-size:14.5px;margin-top:2px">Photo, last sighting and route go to his handheld</div></div>
        <span class="btn solid" data-mark="send">${I('send', 18)} Send to patrol</span></div>`);
  };

  // ------------------------------------------------------------------ 02:16 patrol handheld (portrait)
  P.dispatch = () => `${style}<div style="width:470px;padding:16px;border-radius:52px;background:linear-gradient(160deg,#1A2030,#07090F);border:2px solid #2E3850;box-shadow:0 0 50px rgba(60,150,255,.5)">
    <div style="border-radius:38px;overflow:hidden;background:linear-gradient(180deg,#0E1E40,#071026);color:#EEF3FC;font-family:InterF,sans-serif;padding:20px 22px 24px;position:relative">
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;color:#C9D6EE"><span>02:16</span><span style="width:110px;height:26px;border-radius:14px;background:#05070C;margin-top:-6px"></span><span>${I('signal', 16)} 5G</span></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:16px"><div style="width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 40% 32%,#E6F7FF,#3F86FF 60%,#2346C8);box-shadow:0 0 14px #5FB8FF"></div>
        <div><div style="font-family:Jakarta;font-weight:800;font-size:19px">AGIL<sup style="font-size:10px">®</sup> Secure · Patrol</div><div class="mono" style="font-size:11px;letter-spacing:.2em;color:#78BEFF">AI CO-PILOT</div></div></div>
      <div data-mark="card" style="margin-top:16px;border-radius:20px;background:rgba(24,48,98,.6);border:1.5px solid rgba(125,190,255,.6);padding:16px">
        <div style="display:flex;align-items:center;gap:8px"><span style="color:#8FD3FF">${I('send', 18)}</span><span class="mono" style="font-size:12.5px;letter-spacing:.14em;color:#A9C4FF;font-weight:600">DISPATCH · PATROL P-3</span><span class="pl amb" style="margin-left:auto;font-size:11px;padding:4px 9px">HIGH</span></div>
        <div style="font-family:Jakarta;font-weight:800;font-size:26px;margin-top:10px">Locate bag owner</div>
        <div style="position:relative;height:190px;border-radius:14px;overflow:hidden;margin-top:12px">${K.ui.cctv('cafe', 400, 190)}<div class="mono" style="position:absolute;left:10px;bottom:8px;background:rgba(5,10,22,.8);font-size:11px;padding:3px 7px;border-radius:5px">CAM 1-130 · 02:16:10</div></div>
        <div style="font-size:17px;margin-top:12px;line-height:1.4"><b>Last seen:</b> Café, Level 2 <span style="color:#8BF0B8">· live</span><br><span class="muted">Woman · red coat · grey backpack</span></div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)">${I('route', 20)}<span style="font-size:16px"><b>2 min</b> · 140 m · via Escalator 4</span></div>
        <div style="display:flex;gap:10px;margin-top:14px"><span class="btn ok" style="flex:1;justify-content:center">${I('check', 18, 2.6)} Accepted 02:16:24</span></div>
      </div>
      <div class="t2" style="font-size:14px;margin-top:12px">Bag left at Gate B12 · gate boards 02:55</div>
    </div></div>`;

  // ------------------------------------------------------------------ 05:10 forecast + device health
  P.forecast = () => {
    // forecast chart (05:00–07:00): actual, forecast peak 20, with-action peak 11, target 15
    const X = m => 60 + m * 5.2, Y = v => 270 - v * 10.5;
    const act = [[0, 6], [10, 7], [20, 9]], fc = [[20, 9], [30, 12], [40, 15], [50, 18], [55, 20], [65, 19], [80, 15], [95, 11], [120, 8]], wa = [[20, 9], [30, 10], [40, 10.5], [55, 11], [70, 10], [90, 9], [120, 7]];
    const pth = pts => pts.map((p, i) => (i ? 'L' : 'M') + f(X(p[0])) + ' ' + f(Y(p[1]))).join(' ');
    const chart = `<svg width="660" height="310" viewBox="0 0 700 310">
      ${[0, 5, 10, 15, 20].map(v => `<line x1="60" x2="690" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(143,161,192,.14)"/><text x="48" y="${Y(v) + 5}" text-anchor="end" font-family="Mono" font-size="13" fill="#8FA0BF">${v}</text>`).join('')}
      ${[0, 30, 60, 90, 120].map(m => `<text x="${X(m)}" y="298" text-anchor="middle" font-family="Mono" font-size="13" fill="#8FA0BF">${['05:00', '05:30', '06:00', '06:30', '07:00'][m / 30]}</text>`).join('')}
      <line x1="60" x2="690" y1="${Y(15)}" y2="${Y(15)}" stroke="#FFB020" stroke-width="2" stroke-dasharray="8 6"/><text x="688" y="${Y(15) - 8}" text-anchor="end" font-family="Mono" font-size="13" fill="#FFCB6B">target 15 min</text>
      <path d="${pth(fc)} L${X(120)} ${Y(0)} L${X(20)} ${Y(0)}Z" fill="#FF3B5C" opacity=".08"/>
      <path d="${pth(fc)}" fill="none" stroke="#FF5A6E" stroke-width="3.5" stroke-dasharray="10 7"/>
      <path d="${pth(wa)}" fill="none" stroke="#2ED47A" stroke-width="4"/>
      <path d="${pth(act)}" fill="none" stroke="#8FB4FF" stroke-width="4"/>
      <line x1="${X(10)}" x2="${X(10)}" y1="40" y2="${Y(0)}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 5"/><text x="${X(10) + 6}" y="52" font-family="Mono" font-size="12" fill="#C3CEE2">NOW 05:10</text>
      <g transform="translate(${X(55) - 70} ${Y(20) - 44})"><rect width="196" height="30" rx="7" fill="#3A1420" stroke="#FF3B5C"/><text x="12" y="20" font-family="Mono" font-size="14" font-weight="600" fill="#FF9DAD">Forecast peak 20 min</text></g>
      <g transform="translate(${X(62)} ${Y(11) + 14})"><rect width="174" height="30" rx="7" fill="#0F3321" stroke="#2ED47A"/><text x="12" y="20" font-family="Mono" font-size="14" font-weight="600" fill="#8BF0B8">With action: 11 min</text></g>
    </svg>`;
    const spark = `<svg width="240" height="70" viewBox="0 0 240 70"><path d="M0 18 L40 20 L80 22 L120 30 L150 40 L180 50 L210 58 L240 64" fill="none" stroke="#FFB020" stroke-width="3"/><line x1="0" x2="240" y1="46" y2="46" stroke="#FF5A6E" stroke-dasharray="5 5"/><text x="2" y="62" font-family="Mono" font-size="10" fill="#FF8DA0">usable threshold</text></svg>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div><div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:23px">Operations outlook · Terminal 2</div><div class="mono t2" style="font-size:13px;margin-top:3px">Forecast · next 2 h · 05:10</div></div>
        <span class="pl amb">${I('alarm', 15)} 1 breach predicted</span><div class="dots">···</div></div>
      <div style="display:grid;grid-template-columns:690px 1fr;gap:18px;margin-top:16px">
        <div class="card" data-mark="chart" style="padding:14px 14px 6px">
          <div style="display:flex;align-items:center;gap:10px;padding:0 6px"><span style="color:#8FB4FF">${I('queue', 22)}</span><span style="font-size:19px;font-weight:600">Security Checkpoint 3 · forecast wait time (min)</span></div>
          <div style="display:flex;gap:18px;font-size:13px;color:#C3CEE2;margin:8px 6px 0"><span><i style="display:inline-block;width:18px;height:3px;background:#8FB4FF;vertical-align:4px;margin-right:6px"></i>Actual</span><span><i style="display:inline-block;width:18px;border-top:3px dashed #FF5A6E;vertical-align:4px;margin-right:6px"></i>Forecast</span><span><i style="display:inline-block;width:18px;height:3px;background:#2ED47A;vertical-align:4px;margin-right:6px"></i>With recommended action</span></div>
          ${chart}</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card" data-mark="rec" style="padding:16px 18px;border-color:rgba(125,190,255,.55)">
            <div class="lab">${I('sparkle', 14)} AI recommendation</div>
            <div style="font-family:Jakarta;font-weight:700;font-size:22px;margin-top:8px">Open lanes 5 and 6 at 05:30</div>
            <div class="t2" style="font-size:15px">Redeploy 4 officers from Checkpoint 1 (quiet until 06:30). Peak 20 → 11 min.</div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:12px"><span class="btn ok sm">${I('check', 15, 2.6)} Approved</span><span class="mono t2" style="font-size:13px;margin:0">05:10:42 · Daniel</span></div></div>
          <div class="card" data-mark="device" style="padding:16px 18px">
            <div style="display:flex;align-items:center;gap:10px"><span class="lab">${I('wrench', 14)} Device health</span><span class="pl amb" style="margin-left:auto;font-size:11px;padding:4px 9px">AT RISK</span></div>
            <div style="font-size:18px;font-weight:600;margin-top:8px">CAM 4-221 · Apron Stands C4–C5</div>
            ${spark}
            <div style="font-size:14.5px;color:#FFD27A">Lens fogging · likely unusable within 72 h</div>
            <div class="mono" style="font-size:13px;color:#8BF0B8;margin-top:6px">✓ Work order WO-5531 raised · fix before the peak</div></div>
        </div></div>`);
  };

  // ------------------------------------------------------------------ 07:00 shift report + lessons learned
  P.report = () => {
    const tl = [['02:13:52', 'Tailgating detected · access control + video'], ['02:14:05', 'Ranked critical (94) by AI triage'], ['02:15:04', 'Doors D-214, D-216 locked'], ['02:15:12', 'Patrols P-1, P-5 dispatched'], ['02:17:38', 'Person intercepted at Stand C3']];
    const k = (v, l) => `<div style="padding:10px 0;border-bottom:1px solid rgba(125,175,255,.14)"><div class="num" style="font-size:26px">${v}</div><div class="t2" style="font-size:13px;margin:1px 0 0">${l}</div></div>`;
    return holo(1200, `
      <div class="hd">${brand()}<div class="vsep"></div>
        <div class="tile grn" style="width:46px;height:46px">${I('doc', 24)}</div>
        <div style="flex:1"><div style="font-family:Jakarta;font-weight:700;font-size:23px">Shift report ready · night shift</div><div class="mono t2" style="font-size:13px;margin-top:3px">22:00 – 07:00 · Terminal 2 · 3 reports drafted</div></div>
        <span class="pl grn" style="font-size:14px;padding:8px 14px">${I('check', 14, 2.6)} 3 incidents · all closed</span><div class="dots">···</div></div>
      <div class="card" style="padding:14px 10px 12px;margin-top:16px">${stepper([
        ['Detect', '02:13:52', 'AI detection', 'done'], ['Validate', '02:14:40', 'Nurul', 'done'], ['Respond', '02:15:04', 'Daniel approved', 'done'], ['Monitor', '02:16', 'Live tracking', 'done'], ['Close', '02:17:38', 'Intercepted', 'done']], -1)}</div>
      <div style="display:grid;grid-template-columns:1fr 200px 360px;gap:16px;margin-top:14px">
        <div style="border-radius:16px;background:#F3F6FB;color:#13203A;padding:16px 18px">
          <div style="display:flex;align-items:center;gap:10px"><span class="mono" style="font-size:12px;letter-spacing:.14em;color:#5B6B86">INCIDENT REPORT · IR-0214</span><span style="margin-left:auto;font-family:Mono;font-size:11.5px;font-weight:700;color:#0E7A43;background:#DDF6E8;border-radius:6px;padding:3px 8px">AI DRAFT · FOR REVIEW</span></div>
          <div style="font-family:Jakarta;font-weight:800;font-size:20px;margin-top:8px">Unauthorised airside access — Staff Door D-214</div>
          <div style="font-size:13.5px;line-height:1.45;color:#34425E;margin-top:6px">At 02:13:52 an unidentified person tailgated a badge holder through Staff Door D-214. SOP AS-07 was executed with duty-manager approval; the person was intercepted at Stand C3 at 02:17:38.</div>
          ${tl.map(([t, d]) => `<div style="display:flex;gap:10px;font-size:13px;margin-top:5px"><span style="font-family:Mono;color:#2D5BFF;font-weight:600">${t}</span><span>${d}</span></div>`).join('')}
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding:8px 10px;border-radius:8px;background:#E8EEFA;font-size:12.5px;color:#2A3A5C">${I('shieldCheck', 16)} 4 actions approved · Daniel · SOP AS-07 · 5/5 steps · 6 audit entries</div></div>
        <div class="card" style="padding:4px 14px">${k('312 → 3', 'alarms → incidents')}${k('3 m 46 s', 'detection to intercept')}${k('4 min', 'bag reclaimed, no gate closure')}${k('0', 'missed escalations')}</div>
        <div class="card" data-mark="lessons" style="padding:14px 16px;border-color:rgba(255,210,90,.55)">
          <div class="lab" style="color:#FFD27A">${I('doc', 14)} Lessons learned · for the knowledge base</div>
          ${['Door D-214: 6 door-held alarms during cleaning — schedule door-closer repair.', 'Fence Sector 7: 61 wind alarms — retune sensitivity above 30 km/h.', 'Stand C3 approach: add a camera angle (20 s blind spot).', 'SOP AS-07: add "notify airline duty officer" for stand incidents.'].map(t => `<div style="display:flex;gap:9px;font-size:14px;line-height:1.35;margin-top:9px"><span style="color:#FFD27A">•</span><span>${t}</span></div>`).join('')}
          <span class="btn sm" style="margin-top:12px">Save to knowledge base ${I('arrow', 15, 2)}</span></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:14px"><span class="btn">Export PDF</span><span class="btn solid" data-mark="approve">${I('check', 18, 2.6)} Approve and file</span></div>`);
  };

  // mouse pointer for "the operator clicks here"
  P.cursor = () => `<div style="width:64px;height:64px"><svg width="64" height="64" viewBox="0 0 30 30"><path d="M6 3.5 23.5 16l-7.6 1.4L20.4 26l-3.3 1.6-4.5-8.6-5.6 5.2z" fill="#fff" stroke="#0A1428" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`;
})();
