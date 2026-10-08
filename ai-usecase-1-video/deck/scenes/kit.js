/* Scene kit: cinematic illustrations of an airport security operations centre for the scenario deck.
   Everything is drawn in a 1920×1080 frame from SVG and HTML: the room, the video wall, people seen
   from behind, desk props and the lighting (bloom, depth of field, grain). Deterministic: no randomness
   except the seeded K.rng. */
(function () {
  'use strict';
  const K = (window.K = {});
  K.rng = seed => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const f = x => (+x).toFixed(1);
  let uid = 0;
  const id = p => `${p}${++uid}`;

  // ============================================================== screen contents (HTML)
  const SEV = { crit: ['#FF3B5C', 'CRIT'], high: ['#FFB020', 'HIGH'], med: ['#4D8DFF', 'MED'], low: ['#7C8BA8', 'LOW'], ok: ['#2ED47A', 'OK'] };
  const ALARMS = [
    ['02:13:52', 'crit', 'TAILGATING', 'Staff Door D-214'], ['02:13:41', 'med', 'LINE CROSSING', 'Pier C · Zone 4'],
    ['02:13:31', 'high', 'DOOR HELD OPEN', 'Staff Door D-342'], ['02:13:20', 'high', 'FENCE VIBRATION', 'Perimeter · Sector 7'],
    ['02:13:09', 'low', 'MOTION DETECTED', 'Apron Cam 4-231'], ['02:12:58', 'med', 'FENCE VIBRATION', 'Perimeter · Sector 12'],
    ['02:12:47', 'med', 'DOOR HELD OPEN', 'Staff Door D-207'], ['02:12:40', 'high', 'UNATTENDED OBJECT', 'Gate B12'],
    ['02:12:29', 'med', 'CAMERA TAMPER', 'Cam 2-087 · Pier B'], ['02:12:16', 'high', 'FENCE VIBRATION', 'Perimeter · Sector 9'],
    ['02:12:07', 'low', 'MOTION DETECTED', 'Apron Cam 4-228'], ['02:11:58', 'high', 'DOOR HELD OPEN', 'Staff Door D-118'],
    ['02:11:47', 'med', 'LINE CROSSING', 'Pier A · Zone 2'], ['02:11:33', 'high', 'DOOR HELD OPEN', 'Staff Door D-131'],
  ];
  K.ui = {};
  // generic app chrome: dark window with a title bar
  K.ui.win = (w, h, title, body, o = {}) => `
    <div style="position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;background:${o.bg || '#0A1428'};overflow:hidden;font-family:InterF,sans-serif;color:#DCE6F7">
      <div style="height:${Math.max(14, h * 0.075)}px;background:#101D38;display:flex;align-items:center;gap:${w * 0.012}px;padding:0 ${w * 0.02}px;font-size:${Math.max(7, h * 0.042)}px;font-weight:600;color:#A9C4FF;white-space:nowrap">
        <span style="width:${h * 0.03}px;height:${h * 0.03}px;border-radius:50%;background:#4D8DFF;display:inline-block"></span>${title}</div>
      <div style="position:absolute;left:0;right:0;bottom:0;top:${Math.max(14, h * 0.075)}px">${body}</div>
    </div>`;
  // alarm table rows; mood 'stress' paints most rows hot
  K.ui.alarms = (w, h, o = {}) => {
    const n = o.rows || 12, rh = h / (n + 1.4), fs = Math.max(6, rh * 0.42);
    const rows = Array.from({ length: n }, (_, i) => ALARMS[(i + (o.offset || 0)) % ALARMS.length]).map(([t, s, a, loc], i) => {
      const sev = o.mood === 'stress' && s !== 'crit' && i % 3 !== 2 ? (i % 2 ? 'high' : 'crit') : s;
      const [c, lb] = SEV[sev];
      const hot = sev === 'crit' && o.mood === 'stress';
      return `<div style="display:flex;align-items:center;height:${rh}px;gap:${w * 0.02}px;padding:0 ${w * 0.025}px;font-size:${fs}px;border-bottom:1px solid rgba(143,161,192,.10);background:${hot ? 'rgba(255,59,92,.18)' : i % 2 ? 'rgba(255,255,255,.015)' : 'transparent'}">
        <span style="font-family:Mono,monospace;color:#7C8BA8;width:${w * 0.15}px">${t}</span>
        <span style="background:${c}33;color:${c};font-family:Mono,monospace;font-weight:600;padding:0 ${fs * 0.4}px;border-radius:${fs * 0.3}px;font-size:${fs * 0.8}px">${lb}</span>
        <span style="font-weight:600;color:#E6EDF9;width:${w * 0.36}px;white-space:nowrap;overflow:hidden">${a}</span>
        <span style="color:#8FA0BF;white-space:nowrap;overflow:hidden">${loc}</span></div>`;
    }).join('');
    return `<div style="position:absolute;inset:0;background:#0A1428">
      <div style="display:flex;justify-content:space-between;align-items:center;height:${rh * 1.4}px;padding:0 ${w * 0.025}px;font-size:${fs * 1.1}px;font-weight:700;color:#EEF3FC;background:#0F1C36">
        <span>Alarm queue · all subsystems</span><span style="color:${o.mood === 'stress' ? '#FF6B81' : '#8FB4FF'};font-family:Mono,monospace">${o.count || 312}</span></div>${rows}</div>`;
  };
  // airport map: runway, terminal with piers, apron stands, camera dots, optional alert marker
  K.ui.map = (w, h, o = {}) => {
    const R = K.rng(o.seed || 3);
    const dots = Array.from({ length: 70 }, () => `<circle cx="${f(60 + R() * 880)}" cy="${f(120 + R() * 330)}" r="${f(2 + R() * 2)}" fill="${R() < 0.15 ? '#34C7C9' : '#4D8DFF'}" opacity=".85"/>`).join('');
    const alert = o.alert ? `<g transform="translate(${o.alert[0]} ${o.alert[1]})"><circle r="46" fill="rgba(255,59,92,.18)"/><circle r="26" fill="rgba(255,59,92,.35)"/><circle r="12" fill="#FF3B5C"/></g>` : '';
    return `<svg viewBox="0 0 1000 560" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;background:#081226">
      <rect x="60" y="40" width="880" height="34" rx="6" fill="none" stroke="#3A4F78" stroke-width="3"/>
      <line x1="80" y1="57" x2="920" y2="57" stroke="#5C76A8" stroke-width="2" stroke-dasharray="18 14"/>
      <path d="M120 112 H880 M300 112 V74 M500 112 V74 M700 112 V74 M500 112 V170" stroke="#2C4068" stroke-width="5" fill="none"/>
      <rect x="300" y="350" width="400" height="70" rx="16" fill="rgba(77,141,255,.08)" stroke="#5C76A8" stroke-width="3"/>
      ${[350, 480, 610].map(x => `<rect x="${x}" y="180" width="34" height="170" rx="10" fill="rgba(77,141,255,.06)" stroke="#5C76A8" stroke-width="2.5"/>`).join('')}
      <path d="M200 470 Q500 520 800 470" stroke="#2C4068" stroke-width="10" fill="none"/>
      ${dots}
      <path d="M40 30 H960 V520 H40 Z" fill="none" stroke="#34C7C9" stroke-width="2" stroke-dasharray="6 7" opacity=".7"/>
      ${alert}
    </svg>`;
  };
  K.ui.cctv = (kind, w, h) => {
    const nat = kind === 'gate' ? [580, 330] : [420, 236];
    let svg;
    if (kind === 'gate') svg = C.cctvGate(nat[0], nat[1], id('g'));
    else if (kind === 'door') svg = C.cctvDoor(nat[0], nat[1], id('d'));
    else if (kind === 'apron') svg = C.cctvApron(nat[0], nat[1], id('a'));
    else svg = C.cctvThumb(nat[0], nat[1], kind, id('t'));
    // C.cctvDoor/Apron position their people from scene code; park them sensibly for stills
    svg = svg.replace('<g class="p1">', `<g class="p1" transform="translate(${nat[0] * 0.58} ${nat[1] * 0.74})">`)
      .replace('<g class="p2">', `<g class="p2" transform="translate(${nat[0] * 0.66} ${nat[1] * 0.75})">`)
      .replace('<g class="tp">', `<g class="tp" transform="translate(${nat[0] * 0.5} ${nat[1] * 0.8})">`)
      .replace(/<g class="(b1|b2|tb)">[\s\S]*?<\/g>/g, '');
    return `<div style="position:absolute;inset:0;overflow:hidden;background:#111926"><div style="transform:scale(${w / nat[0]},${h / nat[1]});transform-origin:0 0;width:${nat[0]}px;height:${nat[1]}px">${svg}</div></div>`;
  };
  K.ui.chart = (w, h, o = {}) => {
    const R = K.rng(o.seed || 5), n = 24;
    const pts = Array.from({ length: n }, (_, i) => [i / (n - 1) * 100, 60 - Math.sin(i / 3.2 + (o.seed || 1)) * 18 - R() * 10 + (o.drop && i > n * 0.6 ? (i - n * 0.6) * 4 : 0)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join(' ');
    const c = o.color || '#4D8DFF';
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="${w}" height="${h}" style="position:absolute;inset:0;background:#0A1428">
      ${[25, 50, 75].map(y => `<line x1="0" x2="100" y1="${y}" y2="${y}" stroke="rgba(143,161,192,.12)" stroke-width=".6"/>`).join('')}
      <path d="${d} L100 100 L0 100 Z" fill="${c}" opacity=".18"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`;
  };
  K.ui.clock = (w, h, o = {}) => `<div style="position:absolute;inset:0;background:#0B1730;display:flex;flex-direction:column;justify-content:center;padding:0 ${w * 0.08}px;font-family:Jakarta,sans-serif;color:#EEF3FC">
      <div style="font-size:${h * 0.34}px;font-weight:700;letter-spacing:-.02em;line-height:1">${o.time || '02:14'}</div>
      <div style="font-size:${h * 0.12}px;color:#A9C4FF;margin-top:${h * 0.05}px;font-family:InterF">${o.date || 'Thu, 8 Oct 2026'}</div>
      <div style="font-size:${h * 0.12}px;color:#8FA0BF;margin-top:${h * 0.03}px;font-family:InterF">${o.wx || '27°C · Wind 32 km/h'}</div></div>`;
  K.ui.kpis = (w, h, o = {}) => {
    const items = o.items || [['312', 'alarms / hour', '#FF6B81'], ['3', 'incidents', '#FFCB6B'], ['14', 'departures', '#8FB4FF']];
    return `<div style="position:absolute;inset:0;background:#0B1730;display:grid;grid-template-columns:repeat(${items.length},1fr);align-items:center;font-family:Jakarta,sans-serif">
      ${items.map(([v, l, c]) => `<div style="text-align:center"><div style="font-size:${h * 0.3}px;font-weight:800;color:${c};line-height:1.1">${v}</div><div style="font-size:${Math.min(h * 0.085, w / items.length * 0.11)}px;color:#8FA0BF;font-family:InterF;white-space:nowrap">${l}</div></div>`).join('')}</div>`;
  };
  K.ui.list = (w, h, o = {}) => {
    const items = o.items || [['ECP', 'crit'], ['B12', 'high'], ['S7', 'low'], ['D-207', 'med']];
    const rh = h / (items.length + 1);
    return `<div style="position:absolute;inset:0;background:#0A1428;font-family:InterF">
      <div style="height:${rh}px;background:#101D38;color:#A9C4FF;font-size:${rh * 0.42}px;font-weight:600;display:flex;align-items:center;padding:0 ${w * 0.05}px">${o.title || 'Active incidents'}</div>
      ${items.map(([t, s]) => `<div style="height:${rh}px;display:flex;align-items:center;gap:${w * 0.04}px;padding:0 ${w * 0.05}px;border-bottom:1px solid rgba(143,161,192,.1);font-size:${rh * 0.38}px;color:#DCE6F7"><i style="width:${rh * 0.3}px;height:${rh * 0.3}px;border-radius:50%;background:${SEV[s][0]};display:inline-block"></i>${t}</div>`).join('')}</div>`;
  };
  // a screen showing one of the above, by name
  K.screen = (kind, w, h, o = {}) => {
    if (kind === 'alarms') return K.ui.alarms(w, h, o);
    if (kind === 'map') return K.ui.map(w, h, o);
    if (kind === 'chart') return K.ui.chart(w, h, o);
    if (kind === 'clock') return K.ui.clock(w, h, o);
    if (kind === 'kpis') return K.ui.kpis(w, h, o);
    if (kind === 'list') return K.ui.list(w, h, o);
    if (kind === 'grid') {
      const kinds = o.kinds || ['door', 'gate', 'apron', 'walk'];
      const cw = w / 2, ch = h / 2;
      return `<div style="position:absolute;inset:0;background:#05080F">${kinds.slice(0, 4).map((k, i) => `<div style="position:absolute;left:${(i % 2) * cw + 1}px;top:${Math.floor(i / 2) * ch + 1}px;width:${cw - 2}px;height:${ch - 2}px;overflow:hidden">${K.ui.cctv(k, cw - 2, ch - 2)}</div>`).join('')}</div>`;
    }
    if (kind === 'blank') return `<div style="position:absolute;inset:0;background:${o.bg || '#0A1428'}"></div>`;
    return K.ui.cctv(kind, w, h);
  };

  // ============================================================== video wall
  // tiles: [col, row, colSpan, rowSpan, kind, opts]
  K.videoWall = (x, y, w, h, cols, rows, tiles, o = {}) => {
    const tw = w / cols, th = h / rows, gap = o.gap || 3;
    const body = tiles.map(([c, r, cs, rs, kind, opts]) => {
      const W = tw * cs - gap, H = th * rs - gap;
      return `<div style="position:absolute;left:${f(c * tw)}px;top:${f(r * th)}px;width:${f(W)}px;height:${f(H)}px;overflow:hidden;background:#0A1428">${K.screen(kind, W, H, opts || {})}</div>`;
    }).join('');
    return `<div class="vw" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#020408;filter:${o.filter || 'blur(1.2px) brightness(1.05) saturate(1.1)'}">${body}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.18));"></div></div>`;
  };

  // ============================================================== monitors (screens facing the camera)
  // a monitor at (x,y) w×h with a thin bezel, a stand and an optional glow
  K.monitor = (x, y, w, h, kind, o = {}) => {
    const b = o.bezel || Math.max(3, w * 0.012);
    const content = typeof kind === 'string' && kind.startsWith('<') ? kind : K.screen(kind, w - 2 * b, h - 2 * b, o);
    const stand = o.stand === false ? '' : `<div style="position:absolute;left:${w / 2 - w * 0.06}px;top:${h - 1}px;width:${w * 0.12}px;height:${o.standH || h * 0.18}px;background:linear-gradient(90deg,#0B0F17,#1A2232,#0B0F17)"></div>
        <div style="position:absolute;left:${w / 2 - w * 0.16}px;top:${h - 1 + (o.standH || h * 0.18)}px;width:${w * 0.32}px;height:${Math.max(3, h * 0.03)}px;border-radius:3px;background:#121826"></div>`;
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${o.tf ? `transform:${o.tf};transform-origin:${o.tfo || '50% 50%'};` : ''}${o.filter ? `filter:${o.filter};` : ''}">
      ${stand}
      <div style="position:absolute;inset:0;background:#05070C;border-radius:${b * 0.8}px;box-shadow:0 0 ${w * 0.08}px ${o.glow || 'rgba(77,141,255,.35)'}"></div>
      <div style="position:absolute;left:${b}px;top:${b}px;right:${b}px;bottom:${b}px;overflow:hidden;border-radius:2px">${content}
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,0) 40%)"></div></div>
    </div>`;
  };
  // the back of a monitor (seen from behind)
  K.monitorBack = (x, y, w, h) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:linear-gradient(180deg,#151B28,#0B0F17);border-radius:4px;box-shadow:0 0 ${w * 0.15}px rgba(77,141,255,.35)"></div>`;

  // ============================================================== people
  // Figure seen from behind (3/4), drawn around the neck base (0,0); head ≈ 175 px wide at s=1.
  // o: {x, y, s, hair:'ponytail'|'short'|'bun'|'cap', top:'shirt'|'jacket'|'blazer', col:[dark,mid,lit], pose:'mouse'|'head'|'tablet'|'phone'|'idle',
  //     chair:false, epaulettes, back:'SECURITY', radio, broad (shoulder width factor), rim, seed}
  K.person = (o) => {
    const s = o.s || 1, P = id('p');
    const skin = o.skin || ['#5E3F34', '#B9836B', '#E3B497'];   // shadow, mid, lit
    const hairC = o.hairCol || ['#060608', '#14151B', '#46577E'];
    const top = o.col || ['#070B14', '#141E33', '#2E4470'];     // dark, mid, lit
    const rim = o.rim || '#9CC8FF';
    const B = o.broad || 1;                                     // shoulder width factor
    const male = o.hair === 'short' || o.hair === 'cap';
    const defs = `
      <linearGradient id="${P}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top[1]}"/><stop offset=".45" stop-color="${top[0]}"/><stop offset="1" stop-color="#030408"/></linearGradient>
      <radialGradient id="${P}shl" cx="78%" cy="8%" r="55%"><stop offset="0" stop-color="${top[2]}" stop-opacity=".9"/><stop offset="1" stop-color="${top[2]}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${P}shl2" cx="22%" cy="10%" r="40%"><stop offset="0" stop-color="${top[2]}" stop-opacity=".35"/><stop offset="1" stop-color="${top[2]}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${P}hr" cx="72%" cy="22%" r="80%"><stop offset="0" stop-color="${hairC[2]}"/><stop offset=".28" stop-color="${hairC[1]}"/><stop offset="1" stop-color="${hairC[0]}"/></radialGradient>
      <linearGradient id="${P}sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skin[0]}"/><stop offset=".55" stop-color="${skin[1]}"/><stop offset="1" stop-color="${skin[2]}"/></linearGradient>
      <linearGradient id="${P}nk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A1B17"/><stop offset=".7" stop-color="${skin[0]}"/><stop offset="1" stop-color="${skin[1]}"/></linearGradient>
      <linearGradient id="${P}rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${rim}" stop-opacity="0"/><stop offset=".5" stop-color="${rim}" stop-opacity=".12"/><stop offset="1" stop-color="${rim}" stop-opacity="1"/></linearGradient>
      <linearGradient id="${P}ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1F2A"/><stop offset=".18" stop-color="#0A0D13"/><stop offset="1" stop-color="#030406"/></linearGradient>
      <pattern id="${P}mesh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H6M0 0V6" stroke="#202838" stroke-width="1"/></pattern>
      <filter id="${P}b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
      <filter id="${P}b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="${P}b8" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>`;

    // ---------------- head
    const H = male
      ? 'M4 -258 C60 -260 96 -224 96 -170 C96 -132 90 -104 78 -84 C56 -74 -44 -74 -66 -84 C-80 -104 -88 -132 -88 -170 C-88 -224 -52 -256 4 -258Z'
      : 'M6 -262 C60 -262 96 -226 96 -172 C96 -130 88 -100 68 -78 C48 -64 24 -60 4 -66 C-16 -60 -40 -64 -60 -78 C-80 -100 -88 -130 -88 -172 C-88 -226 -48 -262 6 -262Z';
    const tie = male ? [4, -150] : (o.hair === 'bun' ? [0, -132] : [2, -72]);
    // strands: from points on the hair outline to the tie (pulled-back hair) or short combed strokes
    const R = K.rng(o.seed || 11);
    let strands = '';
    if (!male) {
      for (let i = 0; i < 26; i++) {
        const a = Math.PI * (1.08 + 0.84 * (i / 25)), rx = 90, ry = 104;
        const sx = 4 + Math.cos(a) * rx, sy = -166 + Math.sin(a) * ry;
        const cx = (sx + tie[0]) / 2 + (sx > 4 ? 14 : -14), cy = (sy + tie[1]) / 2 - 6;
        const lit = sx > 30 && sy < -150;
        strands += `<path d="M${f(sx)} ${f(sy)} Q${f(cx)} ${f(cy)} ${f(tie[0] + (R() - 0.5) * 10)} ${f(tie[1] - 4)}" fill="none" stroke="${lit ? hairC[2] : '#2A3043'}" stroke-width="${f(0.8 + R() * 1.4)}" opacity="${f(lit ? 0.35 + R() * 0.35 : 0.18 + R() * 0.2)}"/>`;
      }
    } else {
      for (let i = 0; i < 60; i++) {
        const x0 = -80 + R() * 170, y0 = -250 + R() * 160, L = 10 + R() * 14;
        const lit = x0 > 20 && y0 < -160;
        strands += `<path d="M${f(x0)} ${f(y0)} l${f(L * 0.35)} ${f(L)}" stroke="${lit ? hairC[2] : '#262B3A'}" stroke-width="1.4" opacity="${f(lit ? 0.4 : 0.22)}"/>`;
      }
    }
    const sheen = `<path d="M30 -250 C66 -238 88 -206 92 -168" fill="none" stroke="${hairC[2]}" stroke-width="7" opacity=".55" filter="url(#${P}b3)"/>`;
    const ponytail = o.hair === 'ponytail' ? `
      <path d="M-20 -80 C-34 -40 -38 4 -28 40 C-22 62 -12 76 -2 84 C8 70 18 44 22 8 C26 -30 22 -60 18 -80Z" fill="url(#${P}hr)"/>
      <path d="M-6 -74 C-12 -36 -14 14 -4 66" fill="none" stroke="${hairC[2]}" stroke-width="1.6" opacity=".4"/>
      <path d="M8 -72 C10 -30 8 20 0 70" fill="none" stroke="${hairC[2]}" stroke-width="1.2" opacity=".3"/>
      <path d="M14 -60 C20 -20 16 30 6 64" fill="none" stroke="${rim}" stroke-width="2.4" opacity=".45" filter="url(#${P}b1)"/>
      <ellipse cx="0" cy="-76" rx="21" ry="8" fill="#020203"/>` : '';
    const bun = o.hair === 'bun' ? `<ellipse cx="0" cy="-136" rx="40" ry="34" fill="url(#${P}hr)"/><path d="M-30 -146 C-14 -168 22 -166 34 -136" fill="none" stroke="${hairC[2]}" stroke-width="2" opacity=".5"/>` : '';
    const cap = o.hair === 'cap' ? `
      <path d="M-90 -150 C-96 -214 -54 -262 6 -264 C66 -264 104 -218 100 -152 C76 -164 -60 -164 -90 -150Z" fill="#0C111C"/>
      <path d="M-90 -150 C-60 -164 76 -164 100 -152" fill="none" stroke="#1E283C" stroke-width="7"/>
      <path d="M-20 -158 C-16 -140 22 -140 26 -158" fill="#0C111C" stroke="#2A3550" stroke-width="2"/>
      <path d="M6 -264 C4 -230 4 -190 4 -160" fill="none" stroke="#24304A" stroke-width="2"/>
      <path d="M40 -258 C70 -244 92 -214 98 -176" fill="none" stroke="${rim}" stroke-width="3" opacity=".55" filter="url(#${P}b1)"/>
      <path d="M90 -170 C122 -172 158 -166 180 -156 C152 -148 116 -148 92 -154Z" fill="#05080F"/>
      <path d="M92 -170 C122 -172 156 -166 178 -157" fill="none" stroke="${rim}" stroke-width="2" opacity=".45"/>` : '';
    const neck = male
      ? `<path d="M-56 -92 C-54 -60 -52 -26 -56 2 L62 2 C58 -26 58 -60 64 -92Z" fill="url(#${P}nk)"/>`
      : `<path d="M-46 -74 C-44 -48 -44 -22 -48 2 L52 2 C48 -22 48 -48 52 -74Z" fill="url(#${P}nk)"/>`;
    const ear = `<path d="M86 -158 C96 -164 106 -154 104 -136 C102 -120 96 -112 88 -112 C84 -124 84 -146 86 -158Z" fill="url(#${P}sk)"/><path d="M92 -152 C98 -146 99 -134 94 -124" fill="none" stroke="${skin[0]}" stroke-width="2" opacity=".8"/>`;
    const cheek = male ? `<path d="M92 -176 C102 -150 104 -116 94 -92 C88 -84 80 -80 74 -82 C86 -110 90 -146 92 -176Z" fill="url(#${P}sk)"/>`
      : `<path d="M90 -196 C104 -178 110 -150 106 -122 C102 -100 92 -86 80 -80 C76 -100 84 -150 90 -196Z" fill="url(#${P}sk)"/>
      <path d="M100 -186 C108 -164 110 -134 104 -110" fill="none" stroke="${skin[2]}" stroke-width="2.6" opacity=".9" filter="url(#${P}b1)"/>`;
    const head = `<g class="head">${neck}<path d="${H}" fill="url(#${P}hr)"/>${strands}${sheen}${bun}${ponytail}${cheek}${ear}${cap}
      <path d="${H}" fill="none" stroke="url(#${P}rim)" stroke-width="3.5" filter="url(#${P}b1)"/></g>`;

    // ---------------- torso
    const T = `M-64 -2 C-96 0 ${f(-150 * B)} 14 ${f(-192 * B)} 40 C${f(-226 * B)} 60 ${f(-246 * B)} 92 ${f(-252 * B)} 140 L${f(-264 * B)} 600 L${f(264 * B)} 600 L${f(256 * B)} 140 C${f(250 * B)} 92 ${f(230 * B)} 60 ${f(198 * B)} 40 C${f(154 * B)} 14 100 0 70 -2Z`;
    const collar = o.top === 'blazer'
      ? `<path d="M-60 -6 C-30 -18 40 -18 66 -6 L70 14 C40 4 -32 4 -64 14Z" fill="#DCE3EE"/>
         <path d="M-70 10 C-32 0 40 0 78 10 L92 44 C44 28 -38 28 -84 44Z" fill="${top[1]}"/>`
      : `<path d="M-66 -6 C-34 -22 44 -22 74 -8 L82 14 C46 0 -36 0 -74 12Z" fill="${top[1]}"/><path d="M-66 -6 C-34 -22 44 -22 74 -8" fill="none" stroke="${top[2]}" stroke-width="2.2" opacity=".75"/>`;
    const folds = `<path d="M${f(-150 * B)} 60 C${f(-136 * B)} 130 ${f(-142 * B)} 210 ${f(-156 * B)} 300" fill="none" stroke="#000" stroke-width="5" opacity=".28" filter="url(#${P}b3)"/>
      <path d="M${f(154 * B)} 60 C${f(140 * B)} 130 ${f(146 * B)} 210 ${f(160 * B)} 300" fill="none" stroke="#000" stroke-width="5" opacity=".28" filter="url(#${P}b3)"/>
      <path d="M-10 30 C0 110 -6 200 -18 300" fill="none" stroke="#000" stroke-width="4" opacity=".2" filter="url(#${P}b3)"/>`;
    const eps = o.epaulettes ? `<path d="M${f(-214 * B)} 52 L-120 24 L-114 40 L${f(-206 * B)} 70Z" fill="#1E2A44"/><path d="M${f(-200 * B)} 56 L-128 34" stroke="#C9A227" stroke-width="3.5"/>
      <path d="M${f(220 * B)} 52 L126 24 L120 40 L${f(212 * B)} 70Z" fill="#1E2A44"/><path d="M${f(206 * B)} 56 L134 34" stroke="#C9A227" stroke-width="3.5"/>` : '';
    const back = o.back ? `<text x="0" y="168" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="800" font-size="40" letter-spacing="7" fill="#C5CEDD" opacity=".5">${o.back}</text>` : '';
    const lanyard = o.lanyard ? `<path d="M-40 -2 C-60 40 -70 90 -74 140" fill="none" stroke="#2D5BFF" stroke-width="6" opacity=".7"/>` : '';
    const torso = `<g class="torso"><path d="${T}" fill="url(#${P}sh)"/><path d="${T}" fill="url(#${P}shl)"/><path d="${T}" fill="url(#${P}shl2)"/>${folds}${eps}${back}${lanyard}${collar}
      <path d="M70 -2 C100 0 ${f(154 * B)} 14 ${f(198 * B)} 40 C${f(230 * B)} 60 ${f(250 * B)} 92 ${f(256 * B)} 140 L${f(258 * B)} 240" fill="none" stroke="url(#${P}rim)" stroke-width="4.5" filter="url(#${P}b1)"/>
      <path d="M-64 -2 C-96 0 ${f(-150 * B)} 14 ${f(-192 * B)} 40 C${f(-226 * B)} 60 ${f(-246 * B)} 92 ${f(-252 * B)} 140" fill="none" stroke="${rim}" stroke-width="2.5" opacity=".3" filter="url(#${P}b1)"/></g>`;

    // ---------------- arms
    const hand = (x, y, r = 0, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})">
      <path d="M-20 -8 C-8 -22 22 -22 32 -8 C40 4 32 18 14 20 C-4 22 -20 14 -24 2Z" fill="url(#${P}sk)"/>
      <path d="M6 -18 C20 -18 30 -10 34 0" fill="none" stroke="${skin[2]}" stroke-width="2.4" opacity=".8"/></g>`;
    const sl = top[1];
    let arms = '';
    const pose = o.pose || 'mouse';
    if (pose === 'mouse') {
      arms = `<path d="M${f(206 * B)} 50 C${f(244 * B)} 68 ${f(266 * B)} 108 ${f(272 * B)} 160 C${f(280 * B)} 220 ${f(288 * B)} 270 ${f(298 * B)} 300 C312 330 340 342 380 346 C440 352 510 350 570 344 L578 386 C510 394 430 394 370 388 C320 382 ${f(286 * B)} 362 ${f(270 * B)} 322 C${f(256 * B)} 282 ${f(248 * B)} 222 ${f(240 * B)} 172 C${f(236 * B)} 132 ${f(226 * B)} 102 ${f(204 * B)} 78Z" fill="url(#${P}sh)"/>
        <path d="M${f(232 * B)} 74 C${f(258 * B)} 104 ${f(270 * B)} 150 ${f(276 * B)} 200 C${f(282 * B)} 250 ${f(290 * B)} 286 ${f(302 * B)} 306 C316 332 344 342 380 346 C440 352 510 350 570 344" fill="none" stroke="${rim}" stroke-width="3" opacity=".8" filter="url(#${P}b1)"/>
        <path d="M556 344 L562 388" stroke="#05070C" stroke-width="10"/>
        ${hand(594, 366, -6, 1.05)}`;
    } else if (pose === 'head') {
      arms = `<path d="M${f(204 * B)} 46 C${f(238 * B)} 30 ${f(266 * B)} 0 ${f(282 * B)} -36 C${f(294 * B)} -64 ${f(294 * B)} -90 280 -104 C258 -126 220 -146 182 -164 L160 -130 C196 -114 230 -98 250 -84 C${f(260 * B)} -64 ${f(252 * B)} -34 ${f(236 * B)} -8 C${f(226 * B)} 10 ${f(216 * B)} 26 ${f(210 * B)} 42Z" fill="url(#${P}sh)"/>
        <path d="M${f(210 * B)} 40 C${f(244 * B)} 22 ${f(270 * B)} -6 ${f(284 * B)} -40 C${f(294 * B)} -66 ${f(292 * B)} -90 278 -106" fill="none" stroke="${rim}" stroke-width="3.4" opacity=".85" filter="url(#${P}b1)"/>
        <path d="M278 -106 C256 -126 220 -146 184 -162" fill="none" stroke="${rim}" stroke-width="2.6" opacity=".6" filter="url(#${P}b1)"/>
        <g transform="translate(146 -166) rotate(-30)">
          <path d="M-34 -18 C-20 -32 18 -34 34 -22 C44 -12 42 8 30 18 C14 28 -18 28 -32 16 C-42 6 -42 -8 -34 -18Z" fill="url(#${P}sk)"/>
          <path d="M-30 -14 C-50 -26 -62 -40 -66 -54 M-18 -24 C-34 -44 -40 -62 -40 -78 M-2 -28 C-10 -50 -10 -70 -6 -86 M14 -26 C12 -46 16 -64 24 -78" stroke="${skin[1]}" stroke-width="13" stroke-linecap="round" fill="none"/>
          <path d="M-18 -24 C-34 -44 -40 -62 -40 -78 M-2 -28 C-10 -50 -10 -70 -6 -86 M14 -26 C12 -46 16 -64 24 -78" stroke="${skin[2]}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/></g>`;
    } else if (pose === 'tablet') {
      arms = `<path d="M${f(222 * B)} 58 C${f(270 * B)} 80 ${f(292 * B)} 150 ${f(296 * B)} 230 C298 270 290 300 262 318 L236 286 C252 266 254 238 250 206 C${f(246 * B)} 160 ${f(238 * B)} 130 ${f(212 * B)} 98Z" fill="url(#${P}sh)"/>
        <path d="M${f(262 * B)} 96 C${f(288 * B)} 140 ${f(296 * B)} 196 296 240" fill="none" stroke="${rim}" stroke-width="3" opacity=".7" filter="url(#${P}b1)"/>
        <g transform="translate(210 248) rotate(-16)"><rect x="0" y="-150" width="236" height="164" rx="12" fill="#0A0E16" stroke="#2C3548" stroke-width="3"/>
          <rect x="8" y="-142" width="220" height="148" rx="6" fill="#6FA8FF" opacity=".6" filter="url(#${P}b8)"/><rect x="8" y="-142" width="220" height="148" rx="6" fill="#CFE0FF" opacity=".28"/></g>
        ${hand(262, 300, 24, 1)}`;
    } else if (pose === 'phone') {
      arms = `<path d="M${f(222 * B)} 58 C${f(270 * B)} 80 ${f(296 * B)} 150 ${f(302 * B)} 230 C306 268 326 290 366 292 L374 326 C324 336 290 318 280 280 C${f(270 * B)} 214 ${f(258 * B)} 150 ${f(212 * B)} 98Z" fill="url(#${P}sh)"/>
        <path d="M${f(262 * B)} 96 C${f(290 * B)} 140 ${f(300 * B)} 196 302 240" fill="none" stroke="${rim}" stroke-width="3" opacity=".7" filter="url(#${P}b1)"/>
        <g transform="translate(366 226) rotate(-10)"><rect x="0" y="0" width="86" height="150" rx="14" fill="#090C13" stroke="#283043" stroke-width="3"/>
          <rect x="6" y="8" width="74" height="134" rx="8" fill="#6FA8FF" opacity=".65" filter="url(#${P}b8)"/><rect x="6" y="8" width="74" height="134" rx="8" fill="#D6E5FF" opacity=".32"/></g>
        ${hand(380, 312, 12, 1.05)}`;
    }
    const radio = o.radio ? `<g transform="translate(${f(-176 * B)} 36) rotate(-16)"><rect x="-20" y="-32" width="40" height="64" rx="8" fill="#08090E" stroke="#2A3142" stroke-width="2"/><rect x="-10" y="-56" width="8" height="26" rx="3" fill="#08090E"/><circle cx="8" cy="-16" r="4" fill="#2ED47A"/></g>` : '';

    // ---------------- chair back
    const chair = o.chair === false ? '' : `<g class="chair">
      <path d="M-222 214 C-218 180 -172 166 -112 164 L122 164 C182 166 228 180 232 214 L248 640 L-240 640Z" fill="url(#${P}ch)"/>
      <path d="M-200 232 C-196 200 -160 190 -110 188 L118 188 C166 190 204 200 208 232 L222 640 L-218 640Z" fill="url(#${P}mesh)" opacity=".75"/>
      <path d="M-222 214 C-218 180 -172 166 -112 164 L122 164 C182 166 228 180 232 214" fill="none" stroke="#3B4660" stroke-width="3"/>
      <path d="M60 165 C160 168 224 182 232 214 L246 520" fill="none" stroke="${rim}" stroke-width="2.5" opacity=".4" filter="url(#${P}b1)"/>
      <path d="M-190 352 C-80 324 90 324 200 352" fill="none" stroke="#161C28" stroke-width="12" opacity=".9"/></g>`;

    const glow = `<ellipse cx="60" cy="-140" rx="170" ry="150" fill="${rim}" opacity=".10" filter="url(#${P}b8)"/>`;
    const order = pose === 'head' ? `${torso}${chair}${head}${arms}` : `${torso}${radio}${head}${chair}${arms}`;
    return `<g class="person" transform="translate(${o.x} ${o.y}) scale(${s})"><defs>${defs}</defs>${glow}${order}</g>`;
  };

  // small background operator (head + shoulders) silhouetted against their own screens
  K.opSmall = (x, y, s, o = {}) => {
    const P = id('o'), long = o.hair === 'long';
    return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o.op || 1}">
      <defs><radialGradient id="${P}h" cx="70%" cy="25%" r="85%"><stop offset="0" stop-color="#2E3A55"/><stop offset=".5" stop-color="#0E121B"/><stop offset="1" stop-color="#04060A"/></radialGradient>
      <linearGradient id="${P}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2438"/><stop offset=".5" stop-color="#0A0E17"/><stop offset="1" stop-color="#04060A"/></linearGradient></defs>
      <path d="M-34 40 C-34 60 -30 70 -36 84 L36 84 C30 70 34 60 34 40Z" fill="#160F0D"/>
      <path d="M-150 220 C-146 140 -100 96 -40 82 C-20 78 20 78 40 82 C100 96 146 140 150 220 L156 330 L-156 330Z" fill="url(#${P}b)"/>
      <path d="M2 -78 C46 -78 70 -46 70 -6 C70 26 58 52 36 66 C20 74 -16 74 -32 66 C-56 52 -68 26 -68 -6 C-68 -46 -42 -78 2 -78Z" fill="url(#${P}h)"/>
      ${long ? '<path d="M-56 10 C-62 60 -50 100 -24 118 L26 118 C50 100 62 60 56 10Z" fill="url(#' + P + 'h)"/>' : ''}
      <path d="M30 -70 C58 -58 72 -30 70 4" fill="none" stroke="#8FB8FF" stroke-width="4" opacity=".55"/>
      <path d="M60 92 C108 108 140 150 146 214" fill="none" stroke="#8FB8FF" stroke-width="4" opacity=".4"/>
      <path d="M-60 92 C-108 108 -140 150 -146 214" fill="none" stroke="#8FB8FF" stroke-width="3" opacity=".18"/></g>`;
  };

  // ============================================================== props
  K.mug = (x, y, s = 1, label = 'AGIL<tspan font-size="10" dy="-9">®</tspan><tspan dy="9"> Secure</tspan>') => {
    const P = id('m');
    return `<g transform="translate(${x} ${y}) scale(${s})"><defs>
      <linearGradient id="${P}" x1="0" x2="1"><stop offset="0" stop-color="#05070B"/><stop offset=".35" stop-color="#20242E"/><stop offset=".55" stop-color="#3A404E"/><stop offset=".7" stop-color="#14171E"/><stop offset="1" stop-color="#05070B"/></linearGradient></defs>
      <ellipse cx="60" cy="236" rx="74" ry="14" fill="#000" opacity=".5"/>
      <path d="M0 12 L4 222 C4 236 116 236 116 222 L120 12Z" fill="url(#${P})"/>
      <ellipse cx="60" cy="12" rx="60" ry="12" fill="#1B1F28" stroke="#8A93A6" stroke-width="2.5"/>
      <ellipse cx="60" cy="14" rx="52" ry="8" fill="#0A0C10"/>
      <rect x="2" y="30" width="116" height="10" fill="#9AA3B5" opacity=".55"/>
      <rect x="2" y="196" width="116" height="10" fill="#9AA3B5" opacity=".45"/>
      <text x="60" y="122" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="800" font-size="20" fill="#E8EEF8">${label}</text>
      <path d="M86 30 L90 200" stroke="#fff" stroke-width="5" opacity=".08"/></g>`;
  };
  K.plant = (x, y, s = 1, seed = 2) => {
    const R = K.rng(seed);
    const leaves = Array.from({ length: 22 }, (_, i) => {
      const a = -160 + R() * 140, L = 70 + R() * 90, w = 16 + R() * 12;
      const rad = a * Math.PI / 180, ex = Math.cos(rad) * L, ey = Math.sin(rad) * L;
      const c = ['#1E4D34', '#2E6B45', '#3D8A57', '#24583B'][i % 4];
      return `<path d="M0 0 Q${f(ex * 0.5 - ey * w / L)} ${f(ey * 0.5 + ex * w / L)} ${f(ex)} ${f(ey)} Q${f(ex * 0.5 + ey * w / L)} ${f(ey * 0.5 - ex * w / L)} 0 0Z" fill="${c}" opacity=".95"/>`;
    }).join('');
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="150" rx="80" ry="12" fill="#000" opacity=".5"/>
      <path d="M-62 40 L-50 150 C-50 158 50 158 50 150 L62 40Z" fill="#E9ECF1"/><path d="M-62 40 L-50 150 C-50 158 0 158 0 150 L0 40Z" fill="#B9BFCA"/>
      <ellipse cx="0" cy="40" rx="62" ry="9" fill="#D6DAE2"/><g transform="translate(0 40)">${leaves}</g></g>`;
  };
  K.phone = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 60 L40 0 L230 0 L260 60 L260 150 L0 150Z" fill="#0E1118"/><path d="M40 0 L230 0 L260 60 L0 60Z" fill="#1A1F2A"/>
      <rect x="18" y="72" width="120" height="66" rx="6" fill="#151A24"/><rect x="28" y="80" width="100" height="26" rx="3" fill="#2B3A55"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${156 + (i % 3) * 30}" y="${72 + Math.floor(i / 3) * 18}" width="22" height="12" rx="3" fill="#232A38"/>`).join('')}
      <path d="M20 -6 C60 -40 200 -40 240 -6 L236 14 C200 -14 60 -14 24 14Z" fill="#0A0C12"/>
      ${o.blink ? '<circle cx="246" cy="74" r="7" fill="#FF3B5C"/><circle cx="246" cy="74" r="16" fill="#FF3B5C" opacity=".35"/>' : ''}</g>`;
  K.notebook = (x, y, s = 1, lines = []) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M30 0 L300 0 L330 150 L0 150Z" fill="#E9ECF2"/><path d="M30 0 L300 0 L330 150 L0 150Z" fill="url(#nbShade)"/>
      <path d="M8 120 L322 120" stroke="#C7CCD6"/>
      <path d="M34 4 L4 146" stroke="#1A2233" stroke-width="10"/>
      ${lines.map((t, i) => `<text x="${60 + i * -4}" y="${38 + i * 28}" transform="skewX(-12)" font-family="InterF,sans-serif" font-weight="600" font-size="20" fill="#25324F">${t}</text>`).join('')}
      <defs><linearGradient id="nbShade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs></g>`;
  K.binders = (x, y, s = 1, labels = ['INCIDENT LOGS', 'SOPs / RESPONSE PLANS', 'CONTACT DIRECTORY']) => `<g transform="translate(${x} ${y}) scale(${s})">
      ${labels.map((t, i) => `<g transform="translate(${i * 6} ${-i * 70})"><rect x="0" y="0" width="330" height="64" rx="6" fill="${['#DADDE3', '#E4E7EC', '#D2D6DE'][i % 3]}"/>
        <rect x="0" y="0" width="330" height="10" fill="#fff" opacity=".5"/><rect x="0" y="54" width="330" height="10" fill="#000" opacity=".15"/>
        <text x="165" y="42" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="800" font-size="${t.length > 18 ? 21 : 24}" fill="#2A3245" letter-spacing="1">${t}</text></g>`).join('')}</g>`;
  K.keyboard = (x, y, w, h) => `<g transform="translate(${x} ${y})">
      <path d="M${w * 0.06} 0 L${w * 0.94} 0 L${w} ${h} L0 ${h}Z" fill="#0C0F16" stroke="#2A3142" stroke-width="2"/>
      ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 16 }, (_, c) => {
        const t = r / 5, x0 = w * (0.06 - 0.06 * t) + 6, ww = w * (0.88 + 0.12 * t) - 12;
        return `<rect x="${f(x0 + c * ww / 16 + 1)}" y="${f(4 + r * (h - 8) / 5)}" width="${f(ww / 16 - 3)}" height="${f((h - 8) / 5 - 3)}" rx="1.5" fill="#1A1F2B"/>`;
      }).join('')).join('')}</g>`;
  K.mouse = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="22" rx="34" ry="10" fill="#000" opacity=".5"/><path d="M-26 0 C-26 -30 26 -30 26 0 L22 22 C14 34 -14 34 -22 22Z" fill="#11151E" stroke="#2C3446" stroke-width="2"/></g>`;
  K.radio = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-10)"><rect x="-26" y="-60" width="52" height="110" rx="10" fill="#0B0E15" stroke="#2A3142" stroke-width="2"/><rect x="-10" y="-100" width="10" height="44" rx="4" fill="#0B0E15"/><rect x="-16" y="-44" width="32" height="22" rx="3" fill="#1C2E4A"/><circle cx="12" cy="-70" r="5" fill="#2ED47A"/></g>`;

  // ============================================================== room shell & lighting
  K.ceilingLights = (vp, rows, o = {}) => {
    // rows of rectangular panels receding to the vanishing point
    let s = '';
    rows.forEach(([xTop, n]) => {
      for (let i = 0; i < n; i++) {
        const t0 = Math.pow((i + 0.0) / n, 1.8), t1 = Math.pow((i + 0.42) / n, 1.8); // 0 = near (top edge), 1 = far (vp)
        const p = t => [xTop + (vp[0] - xTop) * (0.35 + 0.65 * t), (o.top || -40) + (vp[1] - (o.top || -40)) * (0.35 + 0.65 * t)];
        const a = p(t0), b = p(t1), w0 = (o.w || 70) * (1 - t0 * 0.9), w1 = (o.w || 70) * (1 - t1 * 0.9);
        if (b[1] > (o.maxY || 120)) continue;
        s += `<path d="M${f(a[0] - w0 / 2)} ${f(a[1])} L${f(a[0] + w0 / 2)} ${f(a[1])} L${f(b[0] + w1 / 2)} ${f(b[1])} L${f(b[0] - w1 / 2)} ${f(b[1])}Z" fill="${o.col || '#EAF4FF'}"/>`;
      }
    });
    return `<g filter="url(#glowS)">${s}</g><g opacity=".9">${s}</g>`;
  };
  K.defs = () => `<defs>
      <filter id="glowS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="blur1"><feGaussianBlur stdDeviation="1"/></filter><filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="blur10" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
      <filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .55 0"/></filter>
    </defs>`;
  // full-frame finishing: vignette, colour grade, grain, optional bottom caption band
  K.finish = (o = {}) => `
    <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(1400px 900px at ${o.vx || '55%'} ${o.vy || '45%'},transparent 50%,rgba(0,0,0,.62) 100%)"></div>
    <div style="position:absolute;inset:0;pointer-events:none;background:${o.grade || 'linear-gradient(180deg,rgba(20,60,140,.10),rgba(0,10,30,.10))'};mix-blend-mode:soft-light"></div>
    ${o.band === false ? '' : `<div style="position:absolute;left:0;right:0;bottom:0;height:${o.bandH || 150}px;background:linear-gradient(180deg,rgba(2,4,9,0),rgba(2,4,9,.86) ${o.bandStop || 70}%,rgba(2,4,9,.92))"></div>`}
    <svg width="1920" height="1080" style="position:absolute;inset:0;mix-blend-mode:overlay;opacity:${o.grain || 0.35}"><rect width="1920" height="1080" filter="url(#grain)"/></svg>`;
})();
