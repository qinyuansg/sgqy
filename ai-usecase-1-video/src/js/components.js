/* Shared visual components: icons, personas, CCTV-style illustrations. */
(function () {
  'use strict';
  const C = (window.C = {});

  // ---------- stroke icons (24×24) ----------
  const P = {
    alarm: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.8H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    camera: '<path d="M2.8 8.2 14.6 5l1.9 6.3-11.8 3.2z"/><path d="m16.2 7.4 4.4-1.3.9 3.1-4.4 1.3"/><path d="m8.3 13.6 1.2 4.6H4.6"/>',
    door: '<path d="M6.5 3.5h10v17h-10z"/><path d="M13.5 12.3h.01"/><path d="M3.5 20.5h17"/>',
    fence: '<path d="M5 20V8.5l2-2.5 2 2.5V20"/><path d="M11 20V8.5l2-2.5 2 2.5V20" transform="translate(-1 0)"/><path d="M17 20V8.5l2-2.5 2 2.5V20" transform="translate(-2 0)"/><path d="M3 11h18M3 16h18"/>',
    bag: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9.5 8V5.2h5V8"/><path d="M9 11.5v5M15 11.5v5"/>',
    person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.8-3.7 3.6-5.6 7-5.6s6.2 1.9 7 5.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3.3 3.1-5 6-5s5.3 1.7 6 5"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2"/><path d="M17.5 14.7c1.8.6 3.1 2.2 3.5 4.8"/>',
    shield: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/>',
    shieldCheck: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    list: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m3.8 6.5 1.4 1.4 2.4-2.6M3.8 12l1.4 1.4 2.4-2.6M3.8 17.5l1.4 1.4 2.4-2.6"/>',
    doc: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5"/><path d="M9 12.5h7M9 16.5h7"/>',
    chart: '<path d="M4 20h16"/><path d="m5 15.5 4.2-4.2 3.2 3.2L18 8.9"/><path d="M14.6 8.6H18v3.4"/>',
    wrench: '<path d="M14.8 4.2a4.6 4.6 0 0 0 5 5.9L11 19a2.3 2.3 0 0 1-3.3-3.3l8.8-8.8a4.6 4.6 0 0 0-1.7-2.7z"/>',
    sparkle: '<path d="M11 3.5 12.9 9l5.6 2-5.6 2L11 18.5 9.1 13l-5.6-2 5.6-2z"/><path d="M18.5 3v3.6M16.7 4.8h3.6"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    server: '<rect x="4" y="4" width="16" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="16" height="6.5" rx="1.5"/><path d="M7.5 7.2h.01M7.5 16.8h.01"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="m21 3-6.5 18-4-7.5L3 9.5z"/>',
    check: '<path d="m5 12.5 4.6 4.6L19.2 7.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    grid: '<rect x="3.5" y="4" width="7.5" height="7" rx="1.2"/><rect x="13" y="4" width="7.5" height="7" rx="1.2"/><rect x="3.5" y="13" width="7.5" height="7" rx="1.2"/><rect x="13" y="13" width="7.5" height="7" rx="1.2"/>',
    queue: '<circle cx="5.5" cy="8" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="18.5" cy="8" r="2"/><path d="M2.8 18.5c.3-3 1.3-5 2.7-5s2.4 2 2.7 5M9.3 18.5c.3-3 1.3-5 2.7-5s2.4 2 2.7 5M15.8 18.5c.3-3 1.3-5 2.7-5s2.4 2 2.7 5"/>',
    hand: '<path d="M8 12.5V5.8a1.5 1.5 0 0 1 3 0v5.4M11 11V4.6a1.5 1.5 0 0 1 3 0V11M14 11V6.2a1.5 1.5 0 0 1 3 0v7.3a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.9-2.6L3.2 14.6a1.6 1.6 0 0 1 2.6-1.9L8 15"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01"/>',
    filter: '<path d="M4 5h16l-6.2 7.6v6.2L10.2 20.5v-7.9z"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    signal: '<path d="M4.5 12.5a10.5 10.5 0 0 1 15 0"/><path d="M7.8 15.6a6 6 0 0 1 8.4 0"/><path d="M12 19.2h.01"/>',
    plane: '<path d="M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-7 5v2l7-2.2V18l-2.2 1.6V21l3.7-1 3.7 1v-1.4L13 18v-4.7z"/>',
    badge: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/><path d="m12 8.2 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z"/>',
    thermo: '<path d="M14 14.6V5.2a2 2 0 0 0-4 0v9.4a4 4 0 1 0 4 0z"/><path d="M12 15.5v-5"/>',
    arrow: '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5z"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    coffee: '<path d="M5 9h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5v2.5M12 3.5v2.5"/>',
  };
  C.icon = (name, size = 24, sw = 1.75, cls = '') =>
    `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  C.ibox = (name, box = 56, size = 28, extra = '') =>
    `<div class="ibox" style="width:${box}px;height:${box}px;${extra}">${C.icon(name, size)}</div>`;

  // ---------- personas ----------
  C.PERSONAS = {
    nurul: { name: 'Nurul', role: 'Control Room Operator', ini: 'NA', col: '#3B6BFF' },
    arjun: { name: 'Arjun', role: 'Patrol Officer', ini: 'AR', col: '#13A38B' },
    daniel: { name: 'Daniel', role: 'Duty Security Manager', ini: 'DT', col: '#8A5CF6' },
    grace: { name: 'Grace', role: 'Head of Security', ini: 'GL', col: '#D9824A' },
  };
  C.avatar = (key, size = 48) => {
    const p = C.PERSONAS[key];
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;background:${p.col};box-shadow:0 0 0 3px rgba(255,255,255,.08)">${p.ini}</div>`;
  };

  // ---------- pointer cursor ----------
  C.cursor = () => `<svg class="cursor" viewBox="0 0 30 30"><path d="M6 3.5 23.5 16l-7.6 1.4L20.4 26l-3.3 1.6-4.5-8.6-5.6 5.2z" fill="#fff" stroke="#0A1428" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  // ---------- silhouettes for stylised CCTV ----------
  // x,y = feet position; h = height px; coat colour; walk phase 0..1 swings legs
  C.person = (x, y, h, coat = '#5B6B86', cls = '', phase = 0) => {
    const s = h / 100;
    const sw = Math.sin(phase * Math.PI * 2) * 6;
    return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="20" ry="4" fill="rgba(0,0,0,.35)"/>
      <path class="legs" d="M-6 -40 L${-8 + sw} 0 L${-2 + sw} 0 L0 -26 L${2 - sw} 0 L${8 - sw} 0 L6 -40 Z" fill="#2A3346"/>
      <path d="M-15 -76 Q0 -82 15 -76 L17 -38 L-17 -38 Z" fill="${coat}"/>
      <circle cx="0" cy="-88" r="10.5" fill="#B9C3D6"/>
    </g>`;
  };

  // CCTV frame chrome (overlays): camera id, timestamp, REC dot, scanlines
  C.cctvChrome = (w, h, camId, cls = 'cc') => `
    <defs>
      <pattern id="scan-${cls}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="rgba(255,255,255,.035)"/></pattern>
      <radialGradient id="vig-${cls}" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,.55)"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#scan-${cls})"/>
    <rect width="${w}" height="${h}" fill="url(#vig-${cls})"/>
    <g font-family="Mono, monospace" font-size="13" fill="rgba(235,242,255,.85)" letter-spacing="1">
      <text x="14" y="24">${camId}</text>
      <circle cx="${w - 128}" cy="19" r="5" fill="#FF3B5C" class="rec"/>
      <text x="${w - 116}" y="24" class="ts">02:16:04</text>
    </g>`;

  // Gate seating area with an unattended suitcase (viewBox w×h)
  C.cctvGate = (w = 580, h = 330, cls = 'gate') => `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}">
      <defs><linearGradient id="g-${cls}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26344A"/><stop offset="1" stop-color="#111926"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g-${cls})"/>
      <!-- window band with apron outside -->
      <rect x="0" y="22" width="${w}" height="96" fill="#0B1220"/>
      <g stroke="#2C3A52" stroke-width="3">${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${i * w / 6}" y1="22" x2="${i * w / 6}" y2="118"/>`).join('')}</g>
      <path d="M${w * 0.55} 92 l60 -6 l40 -2 l18 4 l-18 4 l-40 -2 z" fill="#1E2A40"/>
      <path d="M${w * 0.62} 86 l14 -12 h8 l-6 12 z M${w * 0.62} 92 l10 10 h8 l-4 -10z" fill="#1E2A40"/>
      <!-- floor perspective -->
      <g stroke="rgba(160,180,210,.10)" stroke-width="1.2">${[-3, -2, -1, 0, 1, 2, 3, 4].map(i => `<line x1="${w / 2 + i * 40}" y1="118" x2="${w / 2 + i * 190}" y2="${h}"/>`).join('')}
        <line x1="0" y1="170" x2="${w}" y2="170"/><line x1="0" y1="240" x2="${w}" y2="240"/></g>
      <!-- seat rows -->
      ${[0, 1, 2, 3].map(i => `<rect x="${40 + i * 52}" y="168" width="44" height="34" rx="7" fill="#33435E"/><rect x="${40 + i * 52}" y="158" width="44" height="14" rx="5" fill="#3B4D6B"/>`).join('')}
      ${[0, 1, 2, 3].map(i => `<rect x="${w - 250 + i * 54}" y="196" width="46" height="38" rx="8" fill="#33435E"/><rect x="${w - 250 + i * 54}" y="184" width="46" height="15" rx="5" fill="#3B4D6B"/>`).join('')}
      <!-- gate sign -->
      <rect x="${w / 2 - 34}" y="128" width="68" height="26" rx="4" fill="#0B1220" stroke="#3A4B66"/>
      <text x="${w / 2}" y="146" text-anchor="middle" font-family="Mono, monospace" font-size="14" fill="#FFCB6B">B12</text>
      <!-- suitcase -->
      <g class="bag" transform="translate(${w * 0.43} 228)">
        <rect x="-22" y="-56" width="44" height="58" rx="7" fill="#0A0D13" stroke="#3A4560" stroke-width="1.5"/>
        <path d="M-9 -56 v-14 h18 v14" fill="none" stroke="#3A4560" stroke-width="3"/>
        <path d="M-10 -46 v40 M10 -46 v40" stroke="#1E2534" stroke-width="3"/>
        <circle cx="-15" cy="4" r="3" fill="#222"/><circle cx="15" cy="4" r="3" fill="#222"/>
      </g>
      <g class="bbox">
        <rect x="${w * 0.43 - 40}" y="154" width="80" height="88" fill="none" stroke="#FFB020" stroke-width="2.5" rx="3"/>
        <rect x="${w * 0.43 - 40}" y="130" width="176" height="22" fill="#FFB020"/>
        <text x="${w * 0.43 - 33}" y="146" font-family="Mono, monospace" font-size="13" font-weight="600" fill="#1A1206" class="bboxLabel">UNATTENDED 06:12</text>
      </g>
      ${C.cctvChrome(w, h, 'CAM 2-031 · GATE B12', cls)}
    </svg>`;

  // corridor-like thumbnail with a person in a red coat (for the trace list)
  C.cctvThumb = (w, h, kind, cls) => {
    const floor = kind === 'cafe' ? '#2B2620' : '#1F2A3B';
    let props = '';
    if (kind === 'gate') props = `<rect x="10" y="${h * 0.52}" width="60" height="20" rx="4" fill="#33435E"/><rect x="${w * 0.42}" y="${h * 0.56}" width="16" height="22" rx="3" fill="#0A0D13"/>`;
    if (kind === 'walk') props = `<g stroke="rgba(160,180,210,.18)">${[0, 1, 2, 3].map(i => `<line x1="${w / 2}" y1="${h * 0.35}" x2="${i * w / 3}" y2="${h}"/>`).join('')}</g><rect x="${w * 0.7}" y="${h * 0.18}" width="40" height="14" rx="2" fill="#1B5E3A"/>`;
    if (kind === 'esc') props = `<path d="M${w * 0.25} ${h} L${w * 0.6} ${h * 0.2} L${w * 0.75} ${h * 0.2} L${w * 0.42} ${h}z" fill="#2A3549"/><g stroke="#3B4A63">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${w * 0.27 + i * 12}" y1="${h - i * 16}" x2="${w * 0.44 + i * 12}" y2="${h - i * 16}"/>`).join('')}</g>`;
    if (kind === 'cafe') props = `<rect x="12" y="${h * 0.28}" width="${w * 0.38}" height="16" rx="3" fill="#4A3A2A"/><circle cx="${w * 0.66}" cy="${h * 0.78}" r="16" fill="#3A2F25"/><circle cx="${w * 0.86}" cy="${h * 0.8}" r="14" fill="#3A2F25"/>`;
    const px = kind === 'gate' ? w * 0.6 : kind === 'walk' ? w * 0.52 : kind === 'esc' ? w * 0.55 : w * 0.72;
    const py = kind === 'esc' ? h * 0.62 : h * 0.86;
    const ph = kind === 'esc' ? h * 0.42 : h * 0.6;
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}">
      <rect width="${w}" height="${h}" fill="${floor}"/>
      <rect width="${w}" height="${h * 0.35}" fill="rgba(0,0,0,.25)"/>
      ${props}
      ${C.person(px, py, ph, '#D1453B')}
      <rect x="${px - ph * 0.22}" y="${py - ph * 1.04}" width="${ph * 0.44}" height="${ph * 1.06}" fill="none" stroke="#4D8DFF" stroke-width="2"/>
      <rect width="${w}" height="${h}" fill="url(#scan-${cls})"/>
      <defs><pattern id="scan-${cls}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="rgba(255,255,255,.04)"/></pattern></defs>
    </svg>`;
  };

  // staff door with card reader; two people (badge holder + tailgater)
  C.cctvDoor = (w = 420, h = 236, cls = 'door') => `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}">
      <defs><linearGradient id="g-${cls}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232F42"/><stop offset="1" stop-color="#121A27"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g-${cls})"/>
      <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#18202D"/>
      <rect x="${w * 0.55}" y="${h * 0.12}" width="${w * 0.22}" height="${h * 0.62}" fill="#0A0F18" stroke="#3B4A63" stroke-width="3"/>
      <path class="doorLeaf" d="M${w * 0.55} ${h * 0.12} L${w * 0.66} ${h * 0.18} L${w * 0.66} ${h * 0.68} L${w * 0.55} ${h * 0.74}z" fill="#2C3A52"/>
      <rect x="${w * 0.8}" y="${h * 0.38}" width="12" height="18" rx="2" fill="#11161F" stroke="#4D5D78"/>
      <circle class="reader" cx="${w * 0.8 + 6}" cy="${h * 0.38 + 6}" r="2.6" fill="#2ED47A"/>
      <rect x="${w * 0.8 - 22}" y="${h * 0.2}" width="58" height="18" rx="2" fill="#C9A227"/>
      <text x="${w * 0.8 + 7}" y="${h * 0.2 + 13}" text-anchor="middle" font-family="Mono, monospace" font-size="10" font-weight="600" fill="#1A1406">STAFF ONLY</text>
      <g class="p1">${C.person(0, 0, h * 0.5, '#3E5D8C')}</g>
      <g class="p2">${C.person(0, 0, h * 0.52, '#6B4E3D')}</g>
      <g class="b1"><rect width="10" height="10" fill="none" stroke="#2ED47A" stroke-width="2"/><text class="b1t" font-family="Mono, monospace" font-size="11" fill="#7BE8AC">BADGE B-55821</text></g>
      <g class="b2"><rect width="10" height="10" fill="none" stroke="#FF3B5C" stroke-width="2.5"/><text class="b2t" font-family="Mono, monospace" font-size="11" fill="#FF8DA0" font-weight="600">UNIDENTIFIED</text></g>
      ${C.cctvChrome(w, h, 'CAM 3-118 · STAFF DOOR D-214', cls)}
    </svg>`;

  // apron view (stand C3) with a tracked person
  C.cctvApron = (w = 420, h = 236, cls = 'apron') => `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}">
      <rect width="${w}" height="${h}" fill="#141C28"/>
      <rect width="${w}" height="${h * 0.38}" fill="#0B111B"/>
      <g stroke="#E5C14A" stroke-width="2" opacity=".55"><line x1="${w * 0.1}" y1="${h}" x2="${w * 0.45}" y2="${h * 0.38}"/><line x1="${w * 0.9}" y1="${h}" x2="${w * 0.6}" y2="${h * 0.38}"/></g>
      <text x="${w * 0.47}" y="${h * 0.62}" font-family="Mono, monospace" font-size="20" fill="rgba(229,193,74,.5)" font-weight="600">C3</text>
      <path d="M${w * 0.18} ${h * 0.34} l120 -10 l60 0 l30 6 l-30 6 l-60 0z" fill="#26324A"/>
      <path d="M${w * 0.42} ${h * 0.26} l26 -24 h12 l-10 24z" fill="#26324A"/>
      <g class="tp">${C.person(0, 0, h * 0.34, '#6B4E3D')}</g>
      <g class="tb"><rect width="10" height="10" fill="none" stroke="#FF3B5C" stroke-width="2.5"/></g>
      ${C.cctvChrome(w, h, 'CAM 4-207 · APRON STAND C3', cls)}
    </svg>`;
})();
