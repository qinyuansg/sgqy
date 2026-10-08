/* Scene compositions for the scenario deck (1920×1080). Each returns HTML for #scene.
   pov       : over the shoulder of control-room operator Nurul at her console
   overlook  : from the duty manager's raised desk across the room to the video wall
   terminal  : airside, Level 2 of the terminal at night (patrol officer Arjun) */
(function () {
  'use strict';
  const S = (window.S = {});
  const f = x => (+x).toFixed(1);

  // ---------------------------------------------------------------- shared: the operations room shell
  const VP = [1150, 330];
  function shell(o) {
    const stress = o.mood === 'stress';
    const seams = (x0, x1, yT0, yT1, yB0, yB1, n) => Array.from({ length: n }, (_, i) => {
      const t = Math.pow(i / n, 0.7), x = x0 + (x1 - x0) * t;
      return `<line x1="${f(x)}" y1="${f(yT0 + (yT1 - yT0) * t)}" x2="${f(x)}" y2="${f(yB0 + (yB1 - yB0) * t)}" stroke="#16203A" stroke-width="${f(3 - 2 * t)}"/>`;
    }).join('');
    return `<svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}
      <defs>
        <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050A"/><stop offset="1" stop-color="#0A1222"/></linearGradient>
        <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#03060C"/><stop offset="1" stop-color="#0C1630"/></linearGradient>
        <linearGradient id="wallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#03060C"/><stop offset="1" stop-color="#0C1630"/></linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="#05080F"/>
      <path d="M0 0 H1920 V30 L1720 ${o.wallTop} H600 L0 -143Z" fill="url(#ceil)"/>
      ${ceiling(o.wallTop)}
      <path d="M0 -143 L600 ${o.wallTop} L600 ${o.wallBot} L0 640Z" fill="url(#wallL)"/>
      ${seams(0, 600, -143, o.wallTop, 640, o.wallBot, 7)}
      <path d="M1720 ${o.wallTop} L1920 30 L1920 520 L1720 ${o.wallBot}Z" fill="url(#wallR)"/>
      <rect x="600" y="${o.wallTop - 8}" width="1120" height="${o.wallBot - o.wallTop + 16}" fill="#020306"/>
      ${stress ? `<ellipse cx="960" cy="40" rx="900" ry="260" fill="#FF2A45" opacity=".14" filter="url(#blur30)"/>` : ''}
      ${slogans(o, stress)}
    </svg>`;
  }


  // ceiling: rows of light panels receding to the vanishing point, plus beams
  function ceiling(wallTop) {
    let lights = '', beams = '';
    const xs = [-1500, -760, -60, 640, 1340, 2040, 2740, 3440];
    xs.forEach(xt => {
      const p = t => [xt + (VP[0] - xt) * t, -140 + (VP[1] + 140) * t];
      [0.02, 0.14, 0.24, 0.32, 0.385, 0.435].forEach((t, i) => {
        const a = p(t), b = p(t + 0.045 * (1 - t * 1.2));
        if (b[1] > wallTop - 4 || a[1] < -30) return;
        const w0 = 120 * (1 - t * 1.6), w1 = 120 * (1 - (t + 0.045) * 1.6);
        lights += `<path d="M${f(a[0] - w0 / 2)} ${f(a[1])} L${f(a[0] + w0 / 2)} ${f(a[1])} L${f(b[0] + w1 / 2)} ${f(b[1])} L${f(b[0] - w1 / 2)} ${f(b[1])}Z"/>`;
      });
      const a = p(0), b = p(0.45);
      beams += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#101A30" stroke-width="3"/>`;
    });
    return `${beams}<g fill="#CFE4FF" filter="url(#glowS)" opacity=".85">${lights}</g><g fill="#F4F9FF">${lights}</g>`;
  }
  function slogans(o, stress) {
    if (stress) return '';
    const L = o.sloganL || ['DETECT', 'TRIAGE', 'RESPOND', 'REPORT'], Rr = o.sloganR || ['SAFE', 'SECURE', 'SEAMLESS', 'AIRPORTS'];
    const txt = (fill, extra) => `<g font-family="Jakarta,sans-serif" font-weight="700" fill="${fill}" ${extra}>
        <g transform="translate(64 196) skewY(4)">${L.map((t, i) => `<text x="0" y="${i * 46}" font-size="34" letter-spacing="4">${t}</text>`).join('')}</g>
        <g transform="translate(1748 170) skewY(-7)">${Rr.map((t, i) => `<text x="0" y="${i * 38}" font-size="25" letter-spacing="3">${t}</text>`).join('')}</g></g>`;
    return txt(stress ? '#FF5A6E' : '#4D8DFF', 'filter="url(#blur10)" opacity=".6"') + txt(stress ? '#FF9DAD' : '#9CCBFF', 'opacity=".82"');
  }

  // video-wall tile layouts
  function wallTiles(o) {
    const stress = o.mood === 'stress';
    const t = [
      [0, 0, 1, 1, 'door'], [1, 0, 1, 1, 'gate'], [2, 0, 1, 1, 'apron'], [3, 0, 3, 2, 'map', { alert: o.mapAlert, seed: 3 }],
      [6, 0, 1, 1, 'walk'], [7, 0, 2, 1, 'clock', { time: o.time, date: o.date, wx: o.wx }],
      [0, 1, 1, 1, 'esc'], [1, 1, 1, 1, 'cafe'], [2, 1, 1, 1, 'chart', { seed: 2 }], [6, 1, 1, 1, 'door'], [7, 1, 1, 1, 'gate'], [8, 1, 1, 1, 'apron'],
      [0, 2, 2, 2, 'alarms', { mood: o.mood, rows: 9 }], [2, 2, 1, 1, 'walk'], [3, 2, 1, 1, 'gate'], [4, 2, 1, 1, 'esc'], [5, 2, 1, 1, 'door'],
      [6, 2, 1, 1, 'chart', { seed: 4, color: stress ? '#FF5A6E' : '#2ED47A', drop: stress }], [7, 2, 2, 2, 'kpis', { items: o.kpis }],
      [2, 3, 1, 1, 'apron'], [3, 3, 1, 1, 'cafe'], [4, 3, 1, 1, 'walk'], [5, 3, 1, 1, 'gate'], [6, 3, 1, 1, 'esc'],
    ];
    return t;
  }

  // midground: two rows of consoles with operators facing the wall
  function midground(o) {
    const stress = o.mood === 'stress';
    const scr = (i) => ['alarms', 'map', 'grid', 'chart', 'list', 'alarms', 'grid', 'map'][i % 8];
    let html = '';
    // far row
    const farY = 418, farMonW = 96, farMonH = 58;
    for (let i = 0; i < 12; i++) {
      const x = 470 + i * 118;
      html += K.monitor(x, farY, farMonW, farMonH, scr(i), { stand: true, standH: 10, glow: stress && i % 3 === 0 ? 'rgba(255,59,92,.5)' : 'rgba(77,141,255,.45)', mood: o.mood, rows: 6 });
    }
    // near row
    const nearY = 470, nmw = 150, nmh = 88;
    for (let i = 0; i < 9; i++) {
      const x = 560 + i * 158;
      html += K.monitor(x, nearY, nmw, nmh, scr(i + 3), { stand: true, standH: 14, glow: stress && i % 2 === 0 ? 'rgba(255,59,92,.55)' : 'rgba(77,141,255,.5)', mood: o.mood, rows: 7 });
    }
    const ops = [];
    for (let i = 0; i < 6; i++) ops.push(K.opSmall(540 + i * 236 + (i % 2) * 30, 470, 0.34, { hair: i % 3 === 1 ? 'long' : 'short', op: 0.95 }));
    for (let i = 0; i < 5; i++) ops.push(K.opSmall(650 + i * 300, 548, 0.5, { hair: i % 2 ? 'long' : 'short' }));
    return `<div style="position:absolute;inset:0;filter:blur(1.1px)">
      <svg width="1920" height="1080" style="position:absolute;inset:0"><rect x="380" y="474" width="1540" height="30" fill="#0B111D"/><rect x="380" y="474" width="1540" height="3" fill="#24324F"/>
        <rect x="430" y="556" width="1490" height="40" fill="#0B111D"/><rect x="430" y="556" width="1490" height="3" fill="#2A3A5C"/></svg>
      ${html}
      <svg width="1920" height="1080" style="position:absolute;inset:0">${ops.join('')}</svg></div>`;
  }

  // the operator's own desk and screens (foreground)
  function desk(o) {
    const stress = o.mood === 'stress';
    const glowR = stress ? 'rgba(255,59,92,.55)' : 'rgba(77,141,255,.5)';
    const mons = (o.monitors || [
      [520, 640, 290, 180, 'grid', { kinds: ['door', 'apron', 'gate', 'walk'] }],
      [820, 628, 330, 200, 'map', { alert: stress ? [500, 215] : null, seed: 8 }],
      [1160, 612, 380, 224, 'alarms', { mood: o.mood, rows: 10 }],
      [1550, 626, 330, 200, 'list', { items: stress ? [['D-214 · Tailgating?', 'crit'], ['Gate B12 · Bag?', 'high'], ['Sector 7 · Fence', 'high'], ['D-342 · Door held', 'high'], ['Cam 2-087 · Tamper', 'med']] : undefined }],
    ]).map(([x, y, w, h, kind, oo]) => K.monitor(x, y, w, h, kind, Object.assign({ glow: glowR, mood: o.mood, standH: 22 }, oo))).join('');
    return `
      <svg width="1920" height="1080" style="position:absolute;inset:0">
        <defs><linearGradient id="deskTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151C2B"/><stop offset="1" stop-color="#090C13"/></linearGradient></defs>
        <path d="M0 820 L1920 830 L1920 1080 L0 1080Z" fill="url(#deskTop)"/>
        <path d="M0 820 L1920 830" stroke="#3A4A6C" stroke-width="2" opacity=".7"/>
        <g filter="url(#blur30)" opacity="${stress ? 0.5 : 0.42}">
          ${[[660, 880, 300], [980, 880, 330], [1350, 880, 380], [1720, 880, 300]].map(([x, y, w]) => `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="34" fill="${stress ? '#FF3B5C' : '#4D8DFF'}"/>`).join('')}
        </g>
      </svg>
      ${mons}`;
  }

  function props(o) {
    const stress = o.mood === 'stress';
    let s = K.keyboard(640, 902, 400, 58) + K.mouse(1046, 972, 1);
    if (stress) {
      s += K.binders(1500, 980, 0.95, ['INCIDENT LOGS', 'SOPs / RESPONSE PLANS', 'CONTACT DIRECTORY']);
      s += K.notebook(1110, 930, 0.95, ['☐ Check CCTV', '☐ Call patrol', '☐ Lock door?', '☐ Inform police']);
      s += K.phone(1420, 880, 0.6, { blink: true });
      s += K.radio(1880, 960, 0.9);
    } else {
      s += K.notebook(1110, 936, 0.9, o.note || ['Detect · Triage', 'Respond · Report', '— together']);
      s += K.mug(1452, 818, 0.8);
      s += K.plant(1790, 700, 1.05, 3);
      s += K.phone(1680, 956, 0.6);
      s += K.radio(1590, 1010, 0.8);
    }
    return `<svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}${s}</svg>`;
  }

  // floating "chaos" windows for the pain scene
  function chaos() {
    const win = (x, y, w, h, title, body, hot) => `
      <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:12px;overflow:hidden;
        background:linear-gradient(180deg,rgba(16,28,56,.94),rgba(9,17,36,.94));border:1.5px solid ${hot ? 'rgba(255,90,110,.85)' : 'rgba(120,170,255,.55)'};
        box-shadow:0 0 28px ${hot ? 'rgba(255,59,92,.45)' : 'rgba(60,130,255,.35)'};font-family:InterF,sans-serif;color:#E8EEF8">
        <div style="height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;font-weight:600;font-size:18px;background:rgba(255,255,255,.04)">${title}</div>
        <div style="position:absolute;left:0;right:0;top:40px;bottom:0">${body}</div></div>`;
    const row = (t, a, c, hl) => `<div style="display:flex;gap:10px;align-items:center;padding:7px 14px;font-size:15px;border-bottom:1px solid rgba(143,161,192,.12);${hl ? 'background:rgba(255,59,92,.18);outline:2px solid #FF5A6E;outline-offset:-2px' : ''}"><span style="font-family:Mono,monospace;color:#8FA0BF;font-size:13px">${t}</span><span style="color:${c};font-weight:600">${a}</span></div>`;
    const msg = (who, t, txt, col) => `<div style="margin:8px 12px;padding:8px 12px;border-radius:9px;background:rgba(255,255,255,.92);color:#1B2436;font-size:14px;line-height:1.3"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;color:${col}"><span>${who}</span><span style="color:#6A768C;font-weight:500">${t}</span></div>${txt}</div>`;
    return [
      win(36, 96, 400, 268, `${C.icon('camera', 20)} CCTV · CAM 3-118 · Staff Door D-214`, `<div style="position:absolute;inset:0">${K.ui.cctv('door', 400, 228)}</div>
        <div style="position:absolute;left:226px;top:60px;width:70px;height:120px;border:3px solid #FF3B5C"></div>`, true),
      win(470, 96, 360, 230, `${C.icon('door', 20)} Access control events`, row('02:13:52', 'Door D-214 held open 14 s', '#FF8DA0', true) + row('02:13:31', 'Door D-342 held open', '#FFCB6B') + row('02:12:47', 'Door D-207 held open', '#FFCB6B') + row('02:11:58', 'Door D-118 held open', '#FFCB6B'), true),
      win(864, 96, 330, 230, `${C.icon('fence', 20)} Perimeter · Sector 7`, `<div style="position:absolute;left:0;right:0;top:0;bottom:56px">${K.ui.chart(330, 134, { seed: 9, color: '#FF5A6E', drop: true })}</div>
        <div style="position:absolute;left:14px;right:14px;bottom:12px;height:36px;border-radius:8px;background:rgba(255,59,92,.16);border:2px solid #FF5A6E;color:#FF9DAD;font-weight:600;font-size:15px;display:flex;align-items:center;justify-content:center">⚠ Fence vibration · intrusion or wind?</div>`, true),
      win(1228, 96, 340, 300, `${C.icon('alarm', 20)} Alarm queue <span style="margin-left:auto;color:#FF6B81;font-family:Mono,monospace">312</span>`, `<div style="position:absolute;inset:0">${K.ui.alarms(340, 260, { mood: 'stress', rows: 9 })}</div>`, true),
      win(1600, 96, 290, 370, `${C.icon('send', 20)} Messages`, msg('Airline ops', '02:12', 'Gate B12 boards 02:55. Is the gate area OK?', '#2D5BFF') + msg('Airport Police', '02:13', 'Report of a person airside, Pier C. Any CCTV?', '#C0392B') + msg('Cleaning supervisor', '02:01', 'Pier C staff doors propped for cleaning 01:00–03:00.', '#13A38B')),
      win(36, 392, 330, 210, `${C.icon('signal', 20)} Radio / phone <span style="margin-left:auto;background:#FF3B5C;border-radius:12px;padding:0 9px;font-size:14px">3</span>`, row('02:13', 'Patrol P-1 · missed call', '#FF8DA0') + row('02:12', 'Terminal duty office · missed', '#FFCB6B') + row('02:10', 'Cleaner: bag left at Gate B12', '#FFCB6B'), true),
    ].join('');
  }

  // ---------------------------------------------------------------- POV scene
  S.pov = (o = {}) => {
    const stress = o.mood === 'stress';
    const wallTop = 112, wallBot = 452;
    const wall = K.videoWall(600, wallTop, 1120, wallBot - wallTop, 9, 4, wallTiles(o), {});
    const bloom = K.videoWall(600, wallTop, 1120, wallBot - wallTop, 9, 4, wallTiles(o), { filter: 'blur(22px) brightness(1.5)' });
    const nurul = K.person(Object.assign({ x: o.px || 440, y: o.py || 640, s: o.ps || 1.0, hair: 'ponytail', pose: stress ? 'head' : 'mouse' }, o.person || {}));
    return `
      ${shell({ mood: o.mood, wallTop, wallBot })}
      ${wall}
      <div style="position:absolute;inset:0;mix-blend-mode:screen;opacity:${stress ? 0.55 : 0.4}">${bloom}</div>
      ${stress ? `<div style="position:absolute;left:600px;top:${wallTop}px;width:1120px;height:${wallBot - wallTop}px;background:rgba(255,40,70,.16);mix-blend-mode:screen"></div>` : ''}
      <div style="position:absolute;inset:0;background:radial-gradient(900px 300px at 1160px 330px,${stress ? 'rgba(255,60,90,.22)' : 'rgba(80,140,255,.20)'},transparent 70%);mix-blend-mode:screen"></div>
      ${midground(o)}
      ${desk(o)}
      ${props(o)}
      ${stress ? chaos() : ''}
      <svg width="1920" height="1080" style="position:absolute;inset:0">${nurul}</svg>
      ${K.finish({ grade: stress ? 'linear-gradient(180deg,rgba(160,20,40,.18),rgba(40,0,10,.12))' : undefined, vx: '50%', band: o.band })}`;
  };

  // ---------------------------------------------------------------- overlook: from the duty manager's raised desk
  S.overlook = (o = {}) => {
    const VPo = [960, 250], wx0 = 300, wx1 = 1620, wt = 64, wb = 392;
    const morning = o.time === '07:00';
    const tiles = [
      [0, 0, 1, 1, 'door'], [1, 0, 1, 1, 'gate'], [2, 0, 1, 1, 'apron'], [3, 0, 4, 2, 'map', { seed: 6 }], [7, 0, 1, 1, 'walk'], [8, 0, 2, 1, 'clock', { time: o.time || '02:15', date: o.date, wx: o.wx }],
      [0, 1, 1, 1, 'esc'], [1, 1, 2, 2, 'alarms', { rows: 8, mood: o.mood }], [7, 1, 1, 1, 'cafe'], [8, 1, 1, 1, 'door'], [9, 1, 1, 1, 'chart', { seed: 3 }],
      [0, 2, 1, 1, 'gate'], [3, 2, 1, 1, 'walk'], [4, 2, 1, 1, 'apron'], [5, 2, 1, 1, 'esc'], [6, 2, 1, 1, 'gate'], [7, 2, 3, 2, 'kpis', { items: o.kpis }],
      [0, 3, 1, 1, 'apron'], [1, 3, 1, 1, 'cafe'], [2, 3, 1, 1, 'door'], [3, 3, 1, 1, 'gate'], [4, 3, 1, 1, 'walk'], [5, 3, 1, 1, 'esc'], [6, 3, 1, 1, 'chart', { seed: 8, color: '#2ED47A' }],
    ];
    const wall = K.videoWall(wx0, wt, wx1 - wx0, wb - wt, 10, 4, tiles, { filter: 'blur(1.4px) brightness(1.08) saturate(1.1)' });
    const bloom = K.videoWall(wx0, wt, wx1 - wx0, wb - wt, 10, 4, tiles, { filter: 'blur(26px) brightness(1.6)' });
    // ceiling lights
    let lights = '';
    [-1400, -700, 0, 960, 1920, 2620, 3320].forEach(xt => {
      const p = t => [xt + (VPo[0] - xt) * t, -160 + (VPo[1] + 160) * t];
      [0.02, 0.15, 0.26, 0.34, 0.4].forEach(t => {
        const a = p(t), b = p(t + 0.04 * (1 - t));
        if (b[1] > wt - 4 || a[1] < -30) return;
        const w0 = 120 * (1 - t * 1.7), w1 = 120 * (1 - (t + 0.04) * 1.7);
        lights += `<path d="M${f(a[0] - w0 / 2)} ${f(a[1])} L${f(a[0] + w0 / 2)} ${f(a[1])} L${f(b[0] + w1 / 2)} ${f(b[1])} L${f(b[0] - w1 / 2)} ${f(b[1])}Z"/>`;
      });
    });
    const shellSvg = `<svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}
      <defs><linearGradient id="oc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020408"/><stop offset="1" stop-color="#0A1222"/></linearGradient>
        <linearGradient id="ofl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset="1" stop-color="#05080F"/></linearGradient>
        <linearGradient id="owl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#03060C"/><stop offset="1" stop-color="#0D1730"/></linearGradient>
        <linearGradient id="owr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#03060C"/><stop offset="1" stop-color="#0D1730"/></linearGradient></defs>
      <rect width="1920" height="1080" fill="#05080F"/>
      <path d="M0 0 H1920 V-40 L${wx1} ${wt} H${wx0} L0 -40Z" fill="url(#oc)"/><rect x="0" y="0" width="1920" height="${wt}" fill="url(#oc)"/>
      <g fill="#CFE4FF" filter="url(#glowS)" opacity=".8">${lights}</g><g fill="#F4F9FF">${lights}</g>
      <path d="M0 -40 L${wx0} ${wt} L${wx0} ${wb} L0 760Z" fill="url(#owl)"/>
      <path d="M1920 -40 L${wx1} ${wt} L${wx1} ${wb} L1920 760Z" fill="url(#owr)"/>
      <path d="M0 760 L${wx0} ${wb} L${wx1} ${wb} L1920 760 L1920 1080 L0 1080Z" fill="url(#ofl)"/>
      <rect x="${wx0 - 10}" y="${wt - 10}" width="${wx1 - wx0 + 20}" height="${wb - wt + 20}" fill="#020306"/>
      <g font-family="Jakarta,sans-serif" font-weight="700" fill="#9CCBFF" opacity=".8">
        <g transform="translate(70 170) skewY(16)">${['MONITOR', 'TRIAGE', 'RESPOND', 'LEARN'].map((t, i) => `<text x="0" y="${i * 44}" font-size="30" letter-spacing="4">${t}</text>`).join('')}</g>
        <g transform="translate(1690 200) skewY(-16)">${['PEOPLE', 'IN', 'COMMAND'].map((t, i) => `<text x="0" y="${i * 44}" font-size="30" letter-spacing="4">${t}</text>`).join('')}</g></g>
      <g filter="url(#blur10)" opacity=".55" font-family="Jakarta,sans-serif" font-weight="700" fill="#4D8DFF">
        <g transform="translate(70 170) skewY(16)">${['MONITOR', 'TRIAGE', 'RESPOND', 'LEARN'].map((t, i) => `<text x="0" y="${i * 44}" font-size="30" letter-spacing="4">${t}</text>`).join('')}</g>
        <g transform="translate(1690 200) skewY(-16)">${['PEOPLE', 'IN', 'COMMAND'].map((t, i) => `<text x="0" y="${i * 44}" font-size="30" letter-spacing="4">${t}</text>`).join('')}</g></g>
      <ellipse cx="960" cy="${wb + 40}" rx="760" ry="90" fill="#3C78FF" opacity=".16" filter="url(#blur30)"/>
    </svg>`;
    // three rows of consoles, operators facing the wall
    const rowsDef = [
      { y: 452, n: 7, x0: 470, dx: 168, mw: 84, mh: 50, s: 0.3, op: 0.9 },
      { y: 562, n: 6, x0: 330, dx: 250, mw: 120, mh: 72, s: 0.45, op: 1 },
      { y: 735, n: 5, x0: 250, dx: 352, mw: 176, mh: 104, s: 0.66, op: 1 },
    ];
    let rowsHtml = '', marks = '';
    rowsDef.forEach((r, ri) => {
      const blur = [1.6, 1.1, 0.6][ri];
      let mons = '', ops = '';
      for (let i = 0; i < r.n; i++) {
        const cx = r.x0 + i * r.dx + (ri === 2 ? 0 : (ri % 2) * 40);
        const kinds = ['alarms', 'map', 'grid', 'chart', 'list', 'grid', 'alarms'];
        mons += K.monitor(cx - r.mw * 1.05, r.y - r.mh - 24 * r.s, r.mw, r.mh, kinds[(i + ri) % 7], { standH: 10 * r.s + 4, rows: 6, kinds: ['door', 'gate', 'apron', 'esc'] });
        mons += K.monitor(cx + r.mw * 0.05, r.y - r.mh - 24 * r.s, r.mw, r.mh, kinds[(i + ri + 3) % 7], { standH: 10 * r.s + 4, rows: 6, kinds: ['walk', 'cafe', 'door', 'gate'] });
        const hy = r.y + 40 * r.s;
        if (ri === 2) {
          const st = [['ponytail', ['#060608', '#14151B', '#46577E']], ['short', ['#050506', '#15161C', '#4A5878']], ['bun', ['#0A0706', '#2A1C16', '#6A5040']], ['short', ['#0B0B0D', '#222226', '#5A6070']], ['ponytail', ['#0A0605', '#24170F', '#6A4A36']]][i % 5];
          ops += K.person({ x: cx - 10, y: r.y + 64, s: 0.4, hair: st[0], hairCol: st[1], pose: 'idle', seed: 40 + i, rim: '#8FB8FF' });
        } else ops += K.opSmall(cx, hy, r.s, { hair: (i + ri) % 3 === 1 ? 'long' : 'short', op: r.op });
        marks += `<rect data-mark="op${ri}${i}" x="${f(cx - 60 * r.s)}" y="${f(hy - 80 * r.s)}" width="${f(120 * r.s)}" height="${f(120 * r.s)}" fill="none"/>`;
      }
      rowsHtml += `<div style="position:absolute;inset:0;filter:blur(${blur}px)">
        <svg width="1920" height="1080" style="position:absolute;inset:0"><path d="M${r.x0 - 200} ${r.y} H${r.x0 + r.n * r.dx + 120}" stroke="#121A2C" stroke-width="${f(36 * r.s + 10)}"/><path d="M${r.x0 - 200} ${f(r.y - 18 * r.s - 4)} H${r.x0 + r.n * r.dx + 120}" stroke="#2A3A5C" stroke-width="2"/>
          <ellipse cx="960" cy="${r.y + 30}" rx="900" ry="${40 * r.s + 10}" fill="#2D5BFF" opacity=".08" filter="url(#blur30)"/></svg>
        ${mons}<svg width="1920" height="1080" style="position:absolute;inset:0">${ops}</svg></div>`;
    });
    // foreground: the duty manager's desk
    const fg = o.who === 'none' ? '' : `
      ${K.monitor(40, 640, 360, 212, 'alarms', { rows: 10, glow: 'rgba(77,141,255,.55)', standH: 26 })}
      ${K.monitor(760, 662, 320, 196, 'grid', { kinds: ['door', 'apron', 'gate', 'cafe'], glow: 'rgba(77,141,255,.5)', standH: 22 })}
      <svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}
        <defs><linearGradient id="odk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#161D2C"/><stop offset="1" stop-color="#07090F"/></linearGradient></defs>
        <path d="M0 880 L1180 892 L1260 1080 L0 1080Z" fill="url(#odk)"/><path d="M0 880 L1180 892" stroke="#3A4A6C" stroke-width="2"/>
        <ellipse cx="380" cy="920" rx="380" ry="40" fill="#4D8DFF" opacity=".3" filter="url(#blur30)"/>
        <path d="M1180 892 L1920 900 L1920 1080 L1260 1080Z" fill="#05070C" opacity=".55"/>
        <rect x="0" y="866" width="1920" height="6" fill="#0D1424"/>
        ${K.mug(1150, 860, 0.6)}${K.keyboard(700, 938, 330, 50)}${K.mouse(1066, 1006, 0.9)}${K.phone(1260, 950, 0.5)}
      </svg>`;
    let person = '';
    if (o.who === 'daniel') person = K.person({ x: 560, y: 704, s: 0.85, hair: 'short', pose: 'mouse', epaulettes: true, broad: 1.1, col: ['#060A12', '#162038', '#30477A'], hairCol: ['#050506', '#15161C', '#4A5878'], skin: ['#4A3128', '#9C6B55', '#D29E82'], seed: 21 });
    if (o.who === 'grace') person = K.person({ x: 620, y: 700, s: 0.95, hair: 'bun', pose: 'tablet', chair: false, top: 'blazer', col: ['#0B0F18', '#1C2436', '#3C4C70'], hairCol: ['#0A0706', '#2A1C16', '#7A5A48'], skin: ['#6A4536', '#C99278', '#EDC1A6'], seed: 31 });
    return `${shellSvg}${wall}<div style="position:absolute;inset:0;mix-blend-mode:screen;opacity:${morning ? 0.5 : 0.42}">${bloom}</div>
      ${rowsHtml}
      <div style="position:absolute;inset:0;background:radial-gradient(1000px 340px at 960px 300px,rgba(80,140,255,.18),transparent 70%);mix-blend-mode:screen"></div>
      ${fg}
      <svg width="1920" height="1080" style="position:absolute;inset:0">${person}${marks}</svg>
      ${morning ? '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,190,120,.06),rgba(255,170,90,.08));mix-blend-mode:screen"></div>' : ''}
      ${K.finish({ vx: '50%', vy: '40%', band: o.band, bandH: o.bandH, bandStop: o.bandStop })}`;
  };

  // ---------------------------------------------------------------- terminal: airside concourse, Level 2, night
  S.terminal = (o = {}) => {
    const V = [980, 470];
    const L = (x, y, t) => [x + (V[0] - x) * t, y + (V[1] - y) * t];           // point toward the vanishing point
    const R = K.rng(17);
    // windows on the left: night apron
    const winTop = t => L(0, -120, t), winBot = t => L(0, 980, t);
    const mullions = [0, 0.18, 0.33, 0.45, 0.55, 0.63, 0.7, 0.76, 0.81].map(t => { const a = winTop(t), b = winBot(t); return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#0B0F18" stroke-width="${f(16 * (1 - t))}"/>`; }).join('');
    const transom = [0.3, 0.62].map(k => { const a = L(0, -120 + 1100 * k, 0), b = L(0, -120 + 1100 * k, 0.86); return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#0B0F18" stroke-width="8"/>`; }).join('');
    const apron = `
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060E"/><stop offset=".55" stop-color="#0A1838"/><stop offset=".7" stop-color="#1A2D58"/><stop offset="1" stop-color="#0B1222"/></linearGradient>
        <clipPath id="winclip"><path d="M0 -120 L${f(L(0, -120, 0.86)[0])} ${f(L(0, -120, 0.86)[1])} L${f(L(0, 980, 0.86)[0])} ${f(L(0, 980, 0.86)[1])} L0 980Z"/></clipPath></defs>
      <g clip-path="url(#winclip)">
        <rect x="0" y="-120" width="1000" height="1100" fill="url(#sky)"/>
        <rect x="0" y="560" width="1000" height="420" fill="#0A0F1A"/>
        ${[[120, 520, 1], [520, 512, 0.62], [760, 506, 0.42]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#05080E">
            <path d="M-260 20 C-200 6 120 4 260 14 C280 16 286 30 266 34 C120 44 -200 44 -260 34Z"/><path d="M150 14 L210 -110 L250 -110 L232 14Z"/><path d="M-40 28 L-160 90 L-110 90 L40 30Z"/>
            <circle cx="236" cy="-100" r="6" fill="#FF3B3B"/><circle cx="-250" cy="26" r="5" fill="#2ED47A"/><circle cx="268" cy="24" r="4" fill="#fff"/></g>`).join('')}
        ${Array.from({ length: 9 }, (_, i) => { const x = 40 + i * 110 + R() * 30, y = 380 + R() * 60; return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="580" stroke="#141A26" stroke-width="3"/><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="#FFF3D6"/><circle cx="${f(x)}" cy="${f(y)}" r="26" fill="#FFE7B0" opacity=".35" filter="url(#blur10)"/>`; }).join('')}
        <path d="M0 640 L600 600 L620 612 L0 670Z" fill="#141B28"/>
        ${mullions}${transom}
      </g>`;
    // ceiling slots
    const slots = [-700, -150, 400, 960, 1520, 2100, 2700].map(x => {
      let s2 = '';
      [0, 0.16, 0.3, 0.42, 0.52, 0.6, 0.67].forEach(t => {
        const a = L(x, -60, t), b = L(x, -60, t + 0.05 * (1 - t)); const w0 = 26 * (1 - t), w1 = 26 * (1 - t - 0.05);
        if (b[1] > 330) return;
        s2 += `<path d="M${f(a[0] - w0)} ${f(a[1])} L${f(a[0] + w0)} ${f(a[1])} L${f(b[0] + w1)} ${f(b[1])} L${f(b[0] - w1)} ${f(b[1])}Z"/>`;
      });
      return s2;
    }).join('');
    // shop fronts on the right: fascia + glass front with interior light; the café is warm
    const front = (t0, t1, label, warm) => {
      const p = (y, t) => L(1920, y, t);
      const a1 = p(150, t0), b1 = p(150, t1), a2 = p(230, t0), b2 = p(230, t1), a3 = p(700, t0), b3 = p(700, t1);
      const poly = (q) => q.map(v => f(v[0]) + ' ' + f(v[1])).join(' L');
      const ang = Math.atan2(b1[1] - a1[1], b1[0] - a1[0]) * 180 / Math.PI + 180;
      const mid = [(a1[0] + b1[0]) / 2, (a1[1] + a2[1] + b1[1] + b2[1]) / 4];
      const fs = 46 * (1 - (t0 + t1) / 2);
      const mull = [0.25, 0.5, 0.75].map(k => { const u = L(1920, 230, t0 + (t1 - t0) * k), v = L(1920, 700, t0 + (t1 - t0) * k); return `<line x1="${f(u[0])}" y1="${f(u[1])}" x2="${f(v[0])}" y2="${f(v[1])}" stroke="#0A0E16" stroke-width="${f(5 * (1 - t0))}"/>`; }).join('');
      return `<path d="M${poly([a1, b1, b2, a2])}Z" fill="#0A0D14"/>
        <path d="M${poly([a2, b2, b3, a3])}Z" fill="${warm ? '#3B2412' : '#0F1726'}"/>
        <path d="M${poly([a2, b2, b3, a3])}Z" fill="${warm ? '#FFB45E' : '#5C7DB8'}" opacity="${warm ? 0.32 : 0.12}" filter="url(#blur10)"/>
        ${mull}
        <text transform="translate(${f(mid[0])} ${f(mid[1] + fs * 0.35)}) rotate(${f(ang)}) skewX(${f(-(ang) * 0.6)})" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="700" font-size="${f(fs)}" letter-spacing="3" fill="${warm ? '#FFD49A' : '#9FB0CC'}">${label}</text>
        ${warm ? `<text transform="translate(${f(mid[0])} ${f(mid[1] + fs * 0.35)}) rotate(${f(ang)}) skewX(${f(-(ang) * 0.6)})" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="700" font-size="${f(fs)}" letter-spacing="3" fill="#FFB45E" filter="url(#blur10)" opacity=".8">${label}</text>` : ''}`;
    };
    const shops = front(0.02, 0.2, 'DUTY FREE', false) + front(0.22, 0.42, 'CAFÉ', true) + front(0.44, 0.56, 'BOOKS', false) + front(0.58, 0.66, '', false);
    // café seating in front of the café, the woman in the red coat at a table
    const cafe = `
      <g>
        ${[[1290, 640, 1], [1480, 680, 1.1], [1660, 720, 1.2]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="46" ry="11" fill="#2A1B12"/><path d="M-46 0 A46 11 0 0 0 46 0" fill="none" stroke="#E8B47A" stroke-width="2" opacity=".6"/><rect x="-3" y="0" width="6" height="60" fill="#140E0A"/><ellipse cx="0" cy="60" rx="20" ry="5" fill="#140E0A"/></g>`).join('')}
        <g transform="translate(1500 660)"><path d="M-28 -8 C-28 -62 28 -62 28 -8 L32 46 L-32 46Z" fill="#C8372D"/><path d="M-28 -8 C-28 -62 28 -62 28 -8" fill="none" stroke="#FF7A6A" stroke-width="2" opacity=".6"/>
          <circle cx="0" cy="-78" r="16" fill="#2A1A14"/><path d="M-4 -94 C6 -98 16 -90 16 -80" fill="none" stroke="#7A5A48" stroke-width="3"/>
          <path d="M20 -36 L46 -10" stroke="#C8372D" stroke-width="12" stroke-linecap="round"/>
          <rect x="36" y="10" width="28" height="36" rx="7" fill="#6B7280"/></g>
        <ellipse cx="1500" cy="640" rx="120" ry="70" fill="#FFB766" opacity=".14" filter="url(#blur30)"/>
      </g>`;
    // overhead wayfinding sign
    const sign = `<g transform="translate(980 196)"><rect x="-300" y="-40" width="600" height="80" rx="6" fill="#111318" stroke="#2A2E38" stroke-width="3"/>
        <text x="-270" y="16" font-family="Jakarta,sans-serif" font-weight="700" font-size="40" fill="#FFCC00">Gates B10–B14</text>
        <path d="M200 0 h60 m-24 -22 l24 22 l-24 22" stroke="#FFCC00" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="-200" y1="-40" x2="-200" y2="-240" stroke="#1A1D24" stroke-width="5"/><line x1="200" y1="-40" x2="200" y2="-240" stroke="#1A1D24" stroke-width="5"/></g>`;
    // floor with reflections
    const floorLines = Array.from({ length: 14 }, (_, i) => { const x = -1600 + i * 380, a = L(x, 1080, 0), b = L(x, 1080, 0.86); return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#1A2234" stroke-width="2"/>`; }).join('')
      + [0.1, 0.3, 0.48, 0.62, 0.73, 0.81].map(t => { const y = 1080 + (V[1] - 1080) * t; return `<line x1="0" y1="${f(y)}" x2="1920" y2="${f(y)}" stroke="#151C2C" stroke-width="2"/>`; }).join('');
    const svg = `<svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}
      <defs><linearGradient id="tceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070C"/><stop offset="1" stop-color="#121A2A"/></linearGradient>
        <linearGradient id="tfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2233"/><stop offset="1" stop-color="#090C14"/></linearGradient></defs>
      <rect width="1920" height="1080" fill="#0B0F18"/>
      <path d="M0 -120 L1920 -120 L1920 160 L${f(L(1920, 160, 0.86)[0])} ${f(L(1920, 160, 0.86)[1])} L${f(L(0, -120, 0.86)[0])} ${f(L(0, -120, 0.86)[1])}Z" fill="url(#tceil)"/>
      <g fill="#EAF3FF" filter="url(#glowS)" opacity=".7">${slots}</g><g fill="#FFFFFF">${slots}</g>
      <path d="M0 980 L${f(L(0, 980, 0.86)[0])} ${f(L(0, 980, 0.86)[1])} L${f(L(1920, 700, 0.86)[0])} ${f(L(1920, 700, 0.86)[1])} L1920 700 L1920 1080 L0 1080Z" fill="url(#tfl)"/>
      ${floorLines}
      <rect x="${f(L(0, -120, 0.86)[0])}" y="${f(L(0, -120, 0.86)[1])}" width="${f(L(1920, 160, 0.86)[0] - L(0, -120, 0.86)[0])}" height="${f(L(1920, 700, 0.86)[1] - L(0, -120, 0.86)[1])}" fill="#0E1626"/>
      <text x="980" y="440" text-anchor="middle" font-family="Jakarta,sans-serif" font-weight="700" font-size="34" fill="#FFCC00" opacity=".8">B14</text>
      ${apron}${shops}${cafe}${sign}
      <g opacity=".35" filter="url(#blur10)">${apron.replace(/clip-path="url\(#winclip\)"/, 'transform="translate(0 1640) scale(1 -1)" clip-path="url(#winclip)"')}</g>
      <ellipse cx="1500" cy="760" rx="260" ry="40" fill="#FFB766" opacity=".18" filter="url(#blur30)"/>
      ${[[700, 640, 0.22], [880, 560, 0.12]].map(([x, y, k]) => C.person(x, y, 1000 * k * 0.4, '#3A4A66')).join('')}
    </svg>`;
    const arjun = K.person({ x: o.px || 400, y: o.py || 640, s: o.ps || 0.98, hair: 'cap', pose: 'phone', chair: false, top: 'jacket', back: 'SECURITY', radio: true, broad: 1.08,
      col: ['#05080F', '#121B2F', '#2C4068'], skin: ['#4A3026', '#9A684F', '#CF9A7C'], hairCol: ['#050506', '#15161C', '#4A5878'], rim: '#A8CCFF', seed: 51 });
    return `${svg}<div style="position:absolute;inset:0;filter:blur(.6px)"></div>
      <svg width="1920" height="1080" style="position:absolute;inset:0">${arjun}<rect data-mark="phone" x="${f((o.px || 400) + 366 * (o.ps || 0.98))}" y="${f((o.py || 640) + 226 * (o.ps || 0.98))}" width="${f(90 * (o.ps || 0.98))}" height="${f(150 * (o.ps || 0.98))}" fill="none"/>
        <rect data-mark="owner" x="1462" y="560" width="80" height="150" fill="none"/></svg>
      ${K.finish({ vx: '55%', vy: '45%', grade: 'linear-gradient(180deg,rgba(30,60,130,.12),rgba(60,30,10,.08))', band: o.band })}`;
  };

  // ---------------------------------------------------------------- split: noise (left) → clarity (right), from two rendered frames
  S.split = (o = {}) => {
    const cx = 960, d = 110;
    const left = `polygon(0 0, ${cx - d}px 0, ${cx + d}px 540px, ${cx - d}px 1080px, 0 1080px)`;
    return `<img src="${o.right}" style="position:absolute;inset:0;width:1920px;height:1080px">
      <img src="${o.left}" style="position:absolute;inset:0;width:1920px;height:1080px;clip-path:${left}">
      <svg width="1920" height="1080" style="position:absolute;inset:0">${K.defs()}
        <path d="M${cx - d} -10 L${cx + d} 540 L${cx - d} 1090" fill="none" stroke="#8FD3FF" stroke-width="10" opacity=".55" filter="url(#blur10)"/>
        <path d="M${cx - d} -10 L${cx + d} 540 L${cx - d} 1090" fill="none" stroke="#CFE9FF" stroke-width="3"/></svg>`;
  };
})();
