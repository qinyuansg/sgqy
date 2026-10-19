// Stylised CCTV "camera frames" for the evidence players. Each scene is a standalone SVG
// that render-cctv.mjs rasterises in Chromium with a video treatment (grain, softness,
// vignette, burned-in OSD) and then embeds as an image fill. Bounding boxes are NOT baked
// in: every scene returns `boxes` (in 1280×720 space) so the UI draws them as editable vectors.

const W = 1280, H = 720;
const n = x => Math.round(x * 10) / 10;

// ---------- people ----------
// x,y = feet (centre, ground contact); h = standing height in px
export function person(x, y, h, o = {}) {
  const s = h / 100;
  const coat = o.coat || '#4A5A78', pants = o.pants || '#22293A', skin = o.skin || '#C9A48A', hair = o.hair || '#1B1A1E';
  const pose = o.pose || 'stand', ph = o.phase || 0, back = !!o.back;
  const sw = Math.sin(ph * Math.PI * 2);
  // limb endpoints in unit space (h = 100)
  let lh = [-12, -49], rh = [12, -49], lf = [-5, 0], rf = [5, 0];
  if (pose === 'walk') { lh = [-11 - sw * 5, -50]; rh = [11 + sw * 5, -50]; lf = [-4 + sw * 9, 0]; rf = [4 - sw * 9, 0]; }
  if (pose === 'badge') { rh = [19, -64]; }
  if (pose === 'fight') { lh = [-17, -86]; rh = [20, -80]; lf = [-9, 0]; rf = [7, 0]; }
  if (pose === 'push') { lh = [-22, -70]; rh = [-20, -64]; lf = [-2, 0]; rf = [9, 0]; }
  if (pose === 'phone') { rh = [6, -84]; }
  if (pose === 'sit') { lf = [-10, 0]; rf = [8, 0]; }
  if (pose === 'climb') { lh = [-12, -112]; rh = [10, -117]; lf = [-9, -26]; rf = [5, 0]; }
  if (pose === 'run') { lh = [-16, -60]; rh = [15, -72]; lf = [-14, -6]; rf = [13, 0]; }
  if (pose === 'held') { lh = [-6, -54]; rh = [6, -54]; }
  const lean = o.lean || 0;
  const id = 'p' + Math.round(x) + '_' + Math.round(y) + '_' + Math.round(h);
  const vest = o.vest ? `<path d="M-9 -78 L9 -78 L8 -52 L-8 -52 Z" fill="${o.vest}" opacity=".95"/><path d="M-9 -64 H9 M-8.5 -58 H8.5" stroke="#E8EEF5" stroke-width="1.6" opacity=".85"/>` : '';
  const lanyard = o.lanyard ? `<path d="M-4 -80 L0 -70 L4 -80" stroke="${o.lanyard}" stroke-width="1.2" fill="none"/><rect x="-2.6" y="-70" width="5.2" height="6.5" rx="1" fill="#E9EEF6"/>` : '';
  const cap = o.cap ? `<path d="M-7 -95 Q0 -103 7 -95 L7 -93 L${back ? -7 : 11} -93 Z" fill="${o.cap}"/>` : '';
  const bag = o.backpack ? `<rect x="${back ? -8 : -10}" y="-80" width="${back ? 16 : 6}" height="22" rx="3" fill="${o.backpack}"/>` : '';
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s * 100) / 100}) skewX(${lean})">
    <ellipse cx="0" cy="0.5" rx="17" ry="3.6" fill="#000" opacity=".38"/>
    <path d="M-4.5 -50 L${lf[0]} ${lf[1] - 2}" stroke="${pants}" stroke-width="7.4" stroke-linecap="round"/>
    <path d="M4.5 -50 L${rf[0]} ${rf[1] - 2}" stroke="${pants}" stroke-width="7.4" stroke-linecap="round"/>
    <ellipse cx="${lf[0]}" cy="${lf[1] - 1}" rx="4.6" ry="2.2" fill="#0D0F14"/><ellipse cx="${rf[0]}" cy="${rf[1] - 1}" rx="4.6" ry="2.2" fill="#0D0F14"/>
    ${back ? bag : ''}
    <path d="M-11.5 -80 Q0 -84.5 11.5 -80 L10 -50 Q0 -47 -10 -50 Z" fill="url(#coat-${id})"/>
    ${vest}${lanyard}
    <path d="M-11 -78 L${lh[0]} ${lh[1]}" stroke="${coat}" stroke-width="5.6" stroke-linecap="round"/>
    <path d="M11 -78 L${rh[0]} ${rh[1]}" stroke="${coat}" stroke-width="5.6" stroke-linecap="round"/>
    <circle cx="${lh[0]}" cy="${lh[1]}" r="2.6" fill="${skin}"/><circle cx="${rh[0]}" cy="${rh[1]}" r="2.6" fill="${skin}"/>
    <rect x="-2.4" y="-86" width="4.8" height="6" fill="${skin}" opacity=".9"/>
    <ellipse cx="0" cy="-92.5" rx="6.3" ry="7.4" fill="${back ? hair : skin}"/>
    ${back ? '' : `<path d="M-6.3 -93 Q-6 -100.5 0 -100.4 Q6 -100.5 6.3 -93 Q4 -97 0 -97 Q-4 -97 -6.3 -93 Z" fill="${hair}"/>`}
    ${!back && !o.backpack ? '' : (back ? '' : bag)}
    ${cap}
    <path d="M-11.5 -80 Q0 -84.5 11.5 -80" stroke="#FFFFFF" stroke-opacity=".10" stroke-width="1.2" fill="none"/>
    <defs><linearGradient id="coat-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${o.coatHi || coat}"/><stop offset="1" stop-color="${coat}" stop-opacity=".82"/></linearGradient></defs>
  </g>`;
}
// bbox for a person drawn with person(x,y,h)
export const pbox = (x, y, h, pad = 0.08, wide = 0.36) => [n(x - h * wide / 2 - h * pad * 0.3), n(y - h * (1.03 + pad * 0.4)), n(h * wide + h * pad * 0.6), n(h * (1.06 + pad * 0.5))];

const defsCommon = `
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="dof" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>`;

function wrap(body, defs = '', bg = '#141B27') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsCommon}${defs}</defs><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
}
const lightPool = (cx, cy, rx, ry, op = 0.22, col = '#E8F0FF') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#glow)"/>`;
const ceilingLights = (y, xs, w = 120) => xs.map(x => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="8" rx="4" fill="#F4F7FF" opacity=".85"/><ellipse cx="${x}" cy="${y + 6}" rx="${w}" ry="26" fill="#DDE8FF" opacity=".16" filter="url(#glow)"/>`).join('');
// one-point perspective floor lines
const floorGrid = (vx, vy, y0, n2 = 14, spread = 260, op = 0.08) => {
  let s = '';
  for (let i = -n2; i <= n2; i++) s += `<line x1="${vx}" y1="${vy}" x2="${vx + i * spread}" y2="${H}" stroke="#B9CBE6" stroke-opacity="${op}" stroke-width="1.4"/>`;
  [0.05, 0.13, 0.25, 0.42, 0.66, 1].forEach(t => { const yy = y0 + (H - y0) * t; s += `<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" stroke="#B9CBE6" stroke-opacity="${op * 0.8}" stroke-width="1.2"/>`; });
  return s;
};

// ---------- perimeter helpers (night) ----------
const nightSky = (top = '#101010', bottom = '#1C1C1C') => `<rect width="${W}" height="${H}" fill="${top}"/><rect y="120" width="${W}" height="200" fill="${bottom}" opacity=".9"/>`;
// distant airfield: runway edge lights, taxiway lights, a floodlit apron glow
const airfieldLights = (y, op = 1, colour = false, mono = '#EDEDED') => {
  let s = `<rect y="${y - 6}" width="${W}" height="14" fill="#000" opacity=".25"/>`;
  for (let i = 0; i < 44; i++) s += `<circle cx="${12 + i * 29.5}" cy="${y}" r="2.2" fill="${colour ? (i % 6 === 0 ? '#FFB54A' : '#F4F1E6') : mono}" opacity="${op}"/>`;
  for (let i = 0; i < 30; i++) s += `<circle cx="${30 + i * 42}" cy="${y + 14}" r="1.6" fill="${colour ? '#4D9BFF' : mono}" opacity="${op * 0.7}"/>`;
  s += `<ellipse cx="1040" cy="${y - 20}" rx="220" ry="40" fill="${colour ? '#FFE2A8' : mono}" opacity=".10" filter="url(#glow)"/>`;
  return s;
};
// frontal chain-link fence with Y-arm barbed wire; the AgilFence sensing cable runs along the mesh
const fenceFront = (top, bottom, o = {}) => {
  const col = o.col || '#8A8A8A', mesh = o.mesh || '#5C5C5C', step = 160;
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * step;
    s += `<rect x="${x}" y="${top - 30}" width="10" height="${bottom - top + 30}" fill="${col}"/>`;
    s += `<path d="M${x + 5} ${top - 30} l-26 -26 M${x + 5} ${top - 30} l26 -26" stroke="${col}" stroke-width="4"/>`;
  }
  for (const dy of [-50, -40, -30]) s += `<path d="M0 ${top + dy} H${W}" stroke="${col}" stroke-width="1.6" stroke-dasharray="6 5" opacity=".8"/>`;
  s += `<path d="M0 ${top} H${W} M0 ${bottom} H${W}" stroke="${col}" stroke-width="4"/>`;
  for (let i = 0; i < 80; i++) s += `<line x1="${i * 18}" y1="${top}" x2="${i * 18 + 44}" y2="${bottom}" stroke="${mesh}" stroke-width="1.3"/><line x1="${i * 18 + 44}" y1="${top}" x2="${i * 18}" y2="${bottom}" stroke="${mesh}" stroke-width="1.3"/>`;
  if (o.cable) s += `<path d="M0 ${(top + bottom) / 2 + 12} H${W}" stroke="${col}" stroke-width="3" opacity=".9"/>`;
  return s;
};
// fence receding along the perimeter road (one-point perspective), with road lights
const fencePerspective = () => {
  const vx = 1180, vy = 300;
  let s = `<path d="M0 720 L${vx} ${vy} L1280 ${vy + 8} L1280 720 Z" fill="#1A2029"/><path d="M0 520 L${vx} ${vy} L0 ${vy - 10} Z" fill="#141A23"/>`;
  for (let i = 0; i < 16; i++) {
    const t = Math.pow(i / 16, 1.7), x = vx - (vx + 60) * (1 - t), yb = vy + (600 - vy) * (1 - t), h = 280 * (1 - t) + 14;
    s += `<rect x="${x}" y="${yb - h}" width="${Math.max(2, 10 * (1 - t))}" height="${h}" fill="#7C8798"/>`;
  }
  s += `<path d="M-60 600 L${vx} ${vy} M-60 320 L${vx} ${vy - 12}" stroke="#7C8798" stroke-width="3"/>`;
  for (let k = 0; k < 40; k++) { const t = k / 40; s += `<line x1="${-60 + (vx + 60) * t}" y1="${320 + (vy - 12 - 320) * t}" x2="${-60 + (vx + 60) * (t + 0.03)}" y2="${600 + (vy - 600) * (t + 0.03)}" stroke="#56616F" stroke-width="1"/>`; }
  s += `<path d="M-60 470 L${vx} ${vy - 4}" stroke="#7C8798" stroke-width="2.4" opacity=".9"/>`;
  for (let i = 0; i < 6; i++) { const t = Math.pow(i / 6, 1.5), x = 120 + (vx - 120) * t, y = 330 + (vy - 330) * t; s += `<ellipse cx="${x}" cy="${y + 120 * (1 - t)}" rx="${120 * (1 - t) + 20}" ry="${50 * (1 - t) + 8}" fill="#FFE2A8" opacity=".12" filter="url(#glow)"/>`; }
  return s;
};

// ---------- scenes ----------
export const SCENES = {
  // Staff door D-214 — badge holder + tailgater
  door() {
    const p1 = [742, 610, 330], p2 = [590, 650, 352];
    const body = `
      <rect width="${W}" height="380" fill="url(#wall)"/>
      <rect y="380" width="${W}" height="340" fill="url(#floor)"/>
      ${floorGrid(700, 300, 380, 12, 300, 0.06)}
      ${ceilingLights(26, [220, 640, 1060], 160)}
      <!-- corridor wall panels -->
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="${i * 170}" y1="60" x2="${i * 170}" y2="380" stroke="#33405A" stroke-width="2" opacity=".5"/>`).join('')}
      <rect x="0" y="360" width="${W}" height="20" fill="#2A3346"/>
      <!-- door frame + leaf (open) -->
      <rect x="760" y="92" width="250" height="300" fill="#0A0F18" stroke="#56657F" stroke-width="7"/>
      <path d="M763 95 L866 118 L866 366 L763 389 Z" fill="#2E3B54"/>
      <path d="M866 118 L866 366" stroke="#71809A" stroke-width="3"/>
      <rect x="868" y="98" width="138" height="290" fill="url(#beyond)"/>
      <!-- reader + sign -->
      <rect x="1050" y="210" width="34" height="52" rx="5" fill="#11161F" stroke="#5B6B86" stroke-width="2"/>
      <circle cx="1067" cy="228" r="6" fill="#2ED47A"/><circle cx="1067" cy="228" r="16" fill="#2ED47A" opacity=".25" filter="url(#soft)"/>
      <rect x="1020" y="120" width="230" height="44" rx="4" fill="#D6AE2E"/>
      <text x="1135" y="149" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700" fill="#1A1406">STAFF ONLY · AIRSIDE</text>
      <text x="885" y="85" font-family="DejaVu Sans Mono, monospace" font-size="18" fill="#9FB0CC">D-214</text>
      <!-- fire extinguisher / props -->
      <rect x="190" y="248" width="26" height="70" rx="8" fill="#8E2A2A"/><rect x="186" y="236" width="34" height="14" rx="3" fill="#2A3346"/>
      <rect x="300" y="190" width="200" height="120" rx="6" fill="#1E2738" stroke="#3B4862" stroke-width="2"/>
      <path d="M320 220 H480 M320 245 H450 M320 270 H470" stroke="#3E4C66" stroke-width="5" stroke-linecap="round"/>
      ${lightPool(820, 520, 420, 110, 0.10)}
      ${person(p1[0], p1[1], p1[2], { coat: '#2F4C7E', coatHi: '#40639C', pants: '#1E2433', pose: 'badge', lanyard: '#4D8DFF', hair: '#18161A' })}
      ${person(p2[0], p2[1], p2[2], { coat: '#5C4433', coatHi: '#76583F', pants: '#262423', pose: 'walk', phase: 0.15, cap: '#202226', backpack: '#1D2028' })}
    `;
    const defs = `
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2637"/><stop offset="1" stop-color="#283246"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3243"/><stop offset="1" stop-color="#161B26"/></linearGradient>
      <linearGradient id="beyond" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3A4A66"/><stop offset="1" stop-color="#1A2233"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 3-118  D-214 STAFF DOOR', ts: '2026-10-13  02:14:52', boxes: { badge: pbox(...p1), tail: pbox(...p2), door: [760, 92, 250, 300], reader: [1044, 204, 46, 64] } };
  },

  // Door A17 (T3) — legitimate holder
  doorA17() {
    const p = [560, 640, 360];
    const body = `
      <rect width="${W}" height="400" fill="url(#w)"/><rect y="400" width="${W}" height="320" fill="url(#f)"/>
      ${floorGrid(560, 320, 400, 10, 280, 0.06)}
      ${ceilingLights(20, [300, 900], 220)}
      <rect x="640" y="80" width="300" height="330" fill="#0B1019" stroke="#5A6A86" stroke-width="7"/>
      <rect x="652" y="92" width="276" height="306" fill="#26324A"/>
      <path d="M790 92 V398" stroke="#3E4C66" stroke-width="3"/>
      <rect x="980" y="220" width="36" height="54" rx="5" fill="#11161F" stroke="#5B6B86" stroke-width="2"/><circle cx="998" cy="238" r="6" fill="#2ED47A"/>
      <text x="660" y="66" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#9FB0CC">A17</text>
      <rect x="120" y="150" width="280" height="160" rx="6" fill="#1D2638" stroke="#394761" stroke-width="2"/>
      <path d="M150 190 H360 M150 220 H330 M150 250 H350" stroke="#3E4C66" stroke-width="6" stroke-linecap="round"/>
      ${lightPool(600, 560, 420, 110, 0.10)}
      ${person(p[0], p[1], p[2], { coat: '#4E6A5A', coatHi: '#628571', pants: '#232A2F', pose: 'badge', lanyard: '#2ED47A', hair: '#2A211B', skin: '#B88E72' })}`;
    const defs = `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2435"/><stop offset="1" stop-color="#273145"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3142"/><stop offset="1" stop-color="#151A25"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 3-052  T3 DOOR A17', ts: '2026-10-13  02:09:12', boxes: { person: pbox(...p), face: [p[0] - 34, p[1] - p[2] * 1.02, 68, 70] } };
  },

  // Door C2 (T1) — different person, same credential
  doorC2() {
    const p = [700, 650, 372];
    const body = `
      <rect width="${W}" height="420" fill="url(#w)"/><rect y="420" width="${W}" height="300" fill="url(#f)"/>
      ${floorGrid(760, 330, 420, 10, 280, 0.06)}
      ${ceilingLights(18, [200, 640, 1080], 150)}
      <rect x="250" y="96" width="290" height="330" fill="#0B1019" stroke="#5A6A86" stroke-width="7"/>
      <rect x="262" y="108" width="266" height="306" fill="#222D42"/>
      <rect x="580" y="230" width="36" height="54" rx="5" fill="#11161F" stroke="#5B6B86" stroke-width="2"/><circle cx="598" cy="248" r="6" fill="#2ED47A"/>
      <text x="262" y="82" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#9FB0CC">C2</text>
      <rect x="900" y="120" width="260" height="230" rx="8" fill="#152033" stroke="#33415C" stroke-width="2"/>
      <rect x="920" y="140" width="220" height="40" rx="4" fill="#24406E"/><text x="1030" y="167" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#D8E4FF">TRANSIT  C1–C10</text>
      ${lightPool(700, 570, 440, 120, 0.10)}
      ${person(p[0], p[1], p[2], { coat: '#26282E', coatHi: '#383B43', pants: '#1A1C22', pose: 'badge', hair: '#121114', skin: '#C59C80', cap: '#15161A' })}`;
    const defs = `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2233"/><stop offset="1" stop-color="#252F42"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#293041"/><stop offset="1" stop-color="#141923"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 1-204  T1 DOOR C2', ts: '2026-10-13  02:13:20', boxes: { person: pbox(...p), face: [p[0] - 34, p[1] - p[2] * 1.02, 68, 70] } };
  },

  // Gate B12 — unattended bag
  gate() {
    const bag = [520, 586];
    const body = `
      <rect width="${W}" height="${H}" fill="url(#fl)"/>
      <rect y="0" width="${W}" height="250" fill="#0A111C"/>
      <!-- window band: apron + aircraft at night -->
      <rect y="60" width="${W}" height="190" fill="url(#sky)"/>
      <path d="M560 190 L900 172 L1020 170 L1080 178 L1020 186 L900 186 Z" fill="#2B3850"/>
      <path d="M800 176 L870 120 L900 120 L870 178 Z M820 186 L880 220 L905 220 L870 184 Z" fill="#26324A"/>
      <path d="M1030 172 L1060 140 L1072 140 L1060 174 Z" fill="#26324A"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect x="${i * 160 - 4}" y="56" width="10" height="200" fill="#1E2738"/>`).join('')}
      <rect y="246" width="${W}" height="12" fill="#2A3448"/>
      ${floorGrid(640, 250, 258, 12, 260, 0.07)}
      ${ceilingLights(14, [160, 480, 800, 1120], 140)}
      <!-- seat rows -->
      ${[0, 1, 2, 3, 4].map(i => `<rect x="${70 + i * 66}" y="388" width="58" height="46" rx="10" fill="#33435E"/><rect x="${70 + i * 66}" y="368" width="58" height="22" rx="7" fill="#3E5070"/>`).join('')}
      ${[0, 1, 2, 3, 4].map(i => `<rect x="${820 + i * 70}" y="420" width="62" height="52" rx="10" fill="#33435E"/><rect x="${820 + i * 70}" y="398" width="62" height="24" rx="8" fill="#3E5070"/>`).join('')}
      <rect x="60" y="282" width="120" height="48" rx="6" fill="#0B1220" stroke="#3A4B66" stroke-width="2"/>
      <text x="120" y="316" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="700" fill="#FFCB6B">B12</text>
      ${lightPool(560, 560, 380, 120, 0.12)}
      <!-- suitcase -->
      <g transform="translate(${bag[0]} ${bag[1]})">
        <ellipse cx="0" cy="6" rx="64" ry="10" fill="#000" opacity=".45"/>
        <rect x="-46" y="-118" width="92" height="122" rx="14" fill="#0D1118" stroke="#3A4560" stroke-width="2.5"/>
        <path d="M-18 -118 v-30 h36 v30" fill="none" stroke="#46526C" stroke-width="6"/>
        <path d="M-20 -98 v86 M20 -98 v86" stroke="#232B3B" stroke-width="6"/>
        <circle cx="-32" cy="6" r="6" fill="#1A1D24"/><circle cx="32" cy="6" r="6" fill="#1A1D24"/>
      </g>
      ${person(1010, 560, 250, { coat: '#3D4A60', pants: '#22293A', pose: 'sit', hair: '#1E1B1A' })}
      <g filter="url(#dof)">${person(250, 470, 170, { coat: '#5B4F6E', pants: '#2A2833', pose: 'walk', phase: .3, back: true })}</g>`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3446"/><stop offset="1" stop-color="#151B27"/></linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1626"/><stop offset="1" stop-color="#1A2436"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 2-031  GATE B12 HOLDROOM', ts: '2026-10-13  02:16:04', boxes: { bag: [bag[0] - 62, bag[1] - 160, 124, 172] } };
  },

  // owner trail thumbnails — red coat
  trail_gate() {
    const p = [690, 560, 300];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="250" fill="#0B121D"/>
      ${floorGrid(640, 250, 258, 12, 260, 0.07)}${ceilingLights(14, [300, 900], 160)}
      ${[0, 1, 2, 3].map(i => `<rect x="${380 + i * 66}" y="388" width="58" height="46" rx="10" fill="#33435E"/><rect x="${380 + i * 66}" y="368" width="58" height="22" rx="7" fill="#3E5070"/>`).join('')}
      <g transform="translate(520 586)"><rect x="-46" y="-118" width="92" height="122" rx="14" fill="#0D1118" stroke="#3A4560" stroke-width="2.5"/><path d="M-18 -118 v-30 h36 v30" fill="none" stroke="#46526C" stroke-width="6"/></g>
      ${person(p[0], p[1], p[2], { coat: '#B43A33', coatHi: '#D04B42', pants: '#2A2833', pose: 'walk', phase: .2, hair: '#2B2018' })}`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3446"/><stop offset="1" stop-color="#151B27"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 2-031  GATE B12', ts: '2026-10-13  01:58:41', boxes: { person: pbox(...p) } };
  },
  trail_walk() {
    const p = [700, 520, 250];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="260" fill="#101827"/>
      ${floorGrid(640, 230, 260, 14, 220, 0.09)}${ceilingLights(10, [640], 300)}
      <rect x="900" y="110" width="240" height="60" rx="6" fill="#1B5E3A"/><text x="1020" y="150" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="24" font-weight="700" fill="#E9FFF2">B10 ›  B1</text>
      <rect x="80" y="140" width="220" height="140" rx="8" fill="#2A2238"/><rect x="96" y="156" width="188" height="108" rx="4" fill="#4A3B66" opacity=".7"/>
      ${person(p[0], p[1], p[2], { coat: '#B43A33', coatHi: '#D04B42', pants: '#2A2833', pose: 'walk', phase: .6, back: true, hair: '#2B2018' })}
      <g filter="url(#dof)">${person(380, 600, 300, { coat: '#3E4E66', pants: '#22293A', pose: 'walk', phase: .1 })}</g>`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C3547"/><stop offset="1" stop-color="#171C28"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 2-044  CONCOURSE B', ts: '2026-10-13  02:01:15', boxes: { person: pbox(...p) } };
  },
  trail_food() {
    const p = [820, 600, 290];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="280" fill="#1B1712"/>
      ${ceilingLights(10, [240, 640, 1040], 120)}
      <rect x="60" y="120" width="520" height="170" rx="8" fill="#3A2C1F"/><rect x="80" y="140" width="480" height="40" rx="4" fill="#E0A458" opacity=".75"/>
      <text x="320" y="168" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#2B1C0C">FOOD COURT · L3</text>
      ${[[300, 520], [520, 600], [1080, 560]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="70" ry="20" fill="#4A3A2A"/><rect x="${x - 6}" y="${y}" width="12" height="60" fill="#2E241A"/>`).join('')}
      ${person(p[0], p[1], p[2], { coat: '#B43A33', coatHi: '#D04B42', pants: '#2A2833', pose: 'phone', hair: '#2B2018' })}
      <g filter="url(#dof)">${person(260, 660, 330, { coat: '#4B5A43', pants: '#22293A', pose: 'stand', back: true })}</g>`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3127"/><stop offset="1" stop-color="#1E1913"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 2-077  FOOD COURT L3', ts: '2026-10-13  02:15:58', boxes: { person: pbox(...p) } };
  },

  // Departure hall row K — watchlist loitering
  hall() {
    const p = [770, 600, 300];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="300" fill="url(#cl)"/>
      ${floorGrid(640, 260, 300, 14, 240, 0.07)}
      ${ceilingLights(12, [140, 400, 660, 920, 1180], 110)}
      <!-- check-in row K -->
      <rect x="120" y="200" width="1040" height="120" fill="#1A2233"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${140 + i * 128}" y="236" width="112" height="84" rx="4" fill="#2A3549"/><rect x="${160 + i * 128}" y="212" width="72" height="20" rx="3" fill="#0E1626"/><text x="${196 + i * 128}" y="228" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="13" fill="#7FA8E8">K${String(i + 1).padStart(2, '0')}</text>`).join('')}
      <rect x="560" y="120" width="160" height="64" rx="8" fill="#F2C230"/><text x="640" y="166" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="40" font-weight="800" fill="#1A1406">K</text>
      <!-- queue barriers -->
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${200 + i * 150}" y="400" width="6" height="70" fill="#5B6B86"/><circle cx="${203 + i * 150}" cy="400" r="7" fill="#7E8CA6"/>`).join('')}
      <path d="M203 418 H953" stroke="#2D5BFF" stroke-width="5" opacity=".7"/>
      ${lightPool(700, 580, 460, 120, 0.10)}
      <g filter="url(#dof)">${person(300, 560, 220, { coat: '#4D5A72', pants: '#22293A', pose: 'stand', back: true })}${person(1040, 520, 190, { coat: '#6A5A44', pants: '#262423', pose: 'walk', phase: .4 })}</g>
      ${person(p[0], p[1], p[2], { coat: '#3B3F4A', coatHi: '#4C5260', pants: '#1F2128', pose: 'phone', hair: '#141215', cap: '#2A2D35', backpack: '#20232B' })}`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D3445"/><stop offset="1" stop-color="#171C27"/></linearGradient><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1420"/><stop offset="1" stop-color="#1C2433"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 1-311  DEPARTURE HALL ROW K', ts: '2026-10-13  02:15:31', boxes: { person: pbox(...p), face: [p[0] - 30, p[1] - p[2] * 1.03, 60, 62] } };
  },

  // Arrival hall belt 5 — fight
  belt() {
    const a = [600, 560, 300], b = [700, 566, 306];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="280" fill="#0F1521"/>
      ${ceilingLights(10, [200, 640, 1080], 160)}
      <!-- carousel -->
      <path d="M80 440 Q80 360 260 360 H1020 Q1200 360 1200 440 Q1200 520 1020 520 H260 Q80 520 80 440 Z" fill="#1B2232" stroke="#4A5874" stroke-width="5"/>
      <path d="M140 440 Q140 395 270 395 H1010 Q1140 395 1140 440 Q1140 485 1010 485 H270 Q140 485 140 440 Z" fill="#2A3346"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${240 + i * 150}" y="${400 + (i % 2) * 22}" width="${60 + (i % 3) * 14}" height="40" rx="7" fill="${['#3A2E4E', '#1E3B3A', '#4B3B26', '#2B2F3D', '#5A2B2B', '#253A55'][i]}"/>`).join('')}
      <rect x="560" y="120" width="160" height="70" rx="8" fill="#0E1626" stroke="#3E5174" stroke-width="2"/><text x="640" y="168" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="36" font-weight="800" fill="#FFCB6B">5</text>
      ${lightPool(650, 600, 420, 100, 0.12)}
      <g filter="url(#soft)">${[[230, 640, 300, '#4E5D78'], [350, 670, 320, '#5D4E3E'], [960, 650, 310, '#3F5A50'], [1080, 670, 330, '#4B4A63'], [470, 690, 330, '#2F3B55'], [860, 700, 340, '#5A3E44']].map(([x, y, h, c]) => person(x, y, h, { coat: c, pants: '#22293A', pose: 'stand', back: x < 500 })).join('')}</g>
      ${person(a[0], a[1], a[2], { coat: '#2E5A7A', coatHi: '#3B7099', pants: '#1F2430', pose: 'fight', hair: '#151313' })}
      ${person(b[0], b[1], b[2], { coat: '#7A3A2E', coatHi: '#94493A', pants: '#262423', pose: 'push', hair: '#1D1715' })}`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3243"/><stop offset="1" stop-color="#151A25"/></linearGradient>`;
    const ab = pbox(...a), bb = pbox(...b);
    const x1 = Math.min(ab[0], bb[0]) - 6, y1 = Math.min(ab[1], bb[1]) - 6, x2 = Math.max(ab[0] + ab[2], bb[0] + bb[2]) + 10, y2 = Math.max(ab[1] + ab[3], bb[1] + bb[3]) + 4;
    return { svg: wrap(body, defs), osd: 'CAM 1-142  ARRIVAL HALL BELT 5', ts: '2026-10-13  02:11:09', boxes: { pair: [x1, y1, x2 - x1, y2 - y1], crowd: [180, 330, 960, 380] } };
  },

  // Baggage hall B2 — overstay
  baghall() {
    const p = [820, 590, 270];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/><rect width="${W}" height="260" fill="#0D121B"/>
      ${floorGrid(560, 240, 260, 12, 260, 0.06)}
      ${[60, 420, 780, 1140].map(x => `<rect x="${x - 50}" y="18" width="100" height="8" rx="4" fill="#F4F7FF" opacity=".7"/>`).join('')}
      <!-- conveyors -->
      <path d="M0 330 L700 290 L700 316 L0 360 Z" fill="#3A4558"/><path d="M0 360 L700 316 L700 330 L0 376 Z" fill="#232B39"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${i * 100}" y1="${360 - i * 6.3}" x2="${i * 100}" y2="${420 - i * 6.3}" stroke="#4A566C" stroke-width="5"/>`).join('')}
      ${[[120, 312, '#5B3A2A'], [330, 300, '#2C3B57'], [520, 290, '#3A3A3A']].map(([x, y, c]) => `<rect x="${x}" y="${y - 30}" width="70" height="36" rx="5" fill="${c}"/>`).join('')}
      <!-- ULD containers -->
      ${[0, 1, 2].map(i => `<path d="M${900 + i * 120} 300 h100 v120 h-100 l-20 -30 z" fill="#4C5566" stroke="#6E7A8F" stroke-width="2"/><text x="${930 + i * 120}" y="350" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#C9D3E3">AKE ${120 + i * 7}</text>`).join('')}
      <rect x="40" y="160" width="250" height="56" rx="6" fill="#B8231D"/><text x="165" y="196" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="800" fill="#FFF">RESTRICTED · B2</text>
      ${lightPool(800, 600, 360, 100, 0.10)}
      ${person(p[0], p[1], p[2], { coat: '#2A3240', pants: '#232831', pose: 'stand', vest: '#E8A425', hair: '#171516' })}`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262D3A"/><stop offset="1" stop-color="#12161F"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 4-018  BAGGAGE HALL B2', ts: '2026-10-13  01:45:20', boxes: { person: pbox(...p) } };
  },

  // Perimeter Sector 7 — thermal PTZ (white-hot)
  thermal() {
    const p = [690, 470, 210];
    const body = `<rect width="${W}" height="${H}" fill="url(#th)"/>
      <!-- tree line / horizon -->
      <path d="M0 250 Q120 200 240 236 T480 222 T720 240 T960 210 T1280 236 V300 H0 Z" fill="#3A3A3A"/>
      <!-- fence: posts + mesh -->
      ${Array.from({ length: 15 }, (_, i) => `<rect x="${i * 92 + 10}" y="300" width="9" height="210" fill="#5E5E5E"/>`).join('')}
      <path d="M0 305 H1280 M0 505 H1280" stroke="#6E6E6E" stroke-width="4"/>
      ${Array.from({ length: 70 }, (_, i) => `<line x1="${i * 20}" y1="305" x2="${i * 20 + 40}" y2="505" stroke="#555" stroke-width="1.4"/><line x1="${i * 20 + 40}" y1="305" x2="${i * 20}" y2="505" stroke="#555" stroke-width="1.4"/>`).join('')}
      <path d="M0 296 L1280 296" stroke="#707070" stroke-width="2" stroke-dasharray="10 8"/>
      <rect y="510" width="${W}" height="210" fill="url(#gr)"/>
      <!-- hot target (white-hot) -->
      <g filter="url(#soft)">
        <ellipse cx="${p[0]}" cy="${p[1] - p[2] * 0.5}" rx="${p[2] * 0.3}" ry="${p[2] * 0.62}" fill="#FFFFFF" opacity=".12" filter="url(#glow)"/>
        ${person(p[0], p[1], p[2], { coat: '#F2F2F2', coatHi: '#FFFFFF', pants: '#D6D6D6', skin: '#FFFFFF', hair: '#E6E6E6', pose: 'push' })}
      </g>
      <!-- reticle -->
      <path d="M640 330 v-40 M640 410 v40 M600 370 h-40 M680 370 h40" stroke="#F0F0F0" stroke-width="2" opacity=".55"/>`;
    const defs = `<linearGradient id="th" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1E1E"/><stop offset="1" stop-color="#2E2E2E"/></linearGradient>
      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C3C3C"/><stop offset="1" stop-color="#262626"/></linearGradient>`;
    return { svg: wrap(body, defs, '#202020'), osd: 'PTZ 7-02 THERMAL  SECTOR 5', ts: '2026-10-13  02:15:12', mono: true, boxes: { person: pbox(...p) } };
  },

  // ---------- AgilFence end-to-end flow: north perimeter, Sector 5, segment 5-14 (night) ----------
  // PTZ 7-02 zoomed on the fence (IR, mono): intruder climbing from the landside
  fence_ptz() {
    const p = [640, 430, 250];
    // the climber is on the far (landside) face of the fence, so the mesh is drawn over the figure
    const body = `${nightSky()}${airfieldLights(196, 0.8)}
      <rect y="540" width="${W}" height="180" fill="url(#gr2)"/>
      ${lightPool(640, 420, 520, 230, 0.16, '#F2F2F2')}
      <g filter="url(#soft)">${person(p[0], p[1], p[2], { coat: '#9A9A9A', coatHi: '#C4C4C4', pants: '#6A6A6A', skin: '#DADADA', hair: '#3A3A3A', pose: 'climb', back: true, cap: '#4A4A4A' })}</g>
      ${fenceFront(232, 540, { cable: true })}
      <path d="M640 300 v-34 M640 390 v34 M590 345 h-34 M690 345 h34" stroke="#F0F0F0" stroke-width="2" opacity=".5"/>`;
    const defs = `<linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3A3A"/><stop offset="1" stop-color="#1E1E1E"/></linearGradient>`;
    return { svg: wrap(body, defs, '#151515'), osd: 'PTZ 7-02  SECTOR 5  SEG 5-14  IR', ts: '2026-10-13  02:15:04', mono: true, boxes: { person: pbox(p[0], p[1], p[2], 0.1, 0.42) } };
  },
  // Recorded pre-alarm clip (fixed camera 7-11, colour night): the person walks up to the fence on the perimeter road
  fence_pre() {
    const p = [820, 560, 190];
    const body = `${nightSky('#0B1322', '#18233A')}${airfieldLights(212, 0.9, true)}
      ${fenceFront(250, 500, { cable: true, col: '#7C8798', mesh: '#56616F' })}
      <rect y="500" width="${W}" height="220" fill="url(#rd)"/>
      <path d="M0 610 H1280" stroke="#C9B36A" stroke-width="3" stroke-dasharray="40 30" opacity=".35"/>
      ${lightPool(300, 470, 330, 160, 0.18, '#FFE2A8')}${lightPool(1080, 470, 300, 150, 0.14, '#FFE2A8')}
      ${person(p[0], p[1], p[2], { coat: '#3A3F48', coatHi: '#4B515C', pants: '#202329', pose: 'walk', phase: 0.3, cap: '#2A2D33', backpack: '#22252B' })}`;
    const defs = `<linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262B33"/><stop offset="1" stop-color="#14171C"/></linearGradient>`;
    return { svg: wrap(body, defs, '#0E141F'), osd: 'CAM 7-11  PERIMETER RD  SEG 5-14', ts: '2026-10-13  02:14:41', boxes: { person: pbox(...p) } };
  },
  // Fixed camera 7-11 wide along the fence line (colour night): the climber is small, far down the fence
  fence_wide() {
    const p = [835, 418, 96];
    const body = `${nightSky('#0B1322', '#18233A')}${airfieldLights(236, 0.7, true)}
      ${fencePerspective()}
      ${lightPool(860, 420, 220, 110, 0.18, '#FFE2A8')}
      <g filter="url(#soft)">${person(p[0], p[1], p[2], { coat: '#3A3F48', pants: '#202329', pose: 'climb', back: true, cap: '#2A2D33' })}</g>`;
    return { svg: wrap(body, '', '#0E141F'), osd: 'CAM 7-11  SECTOR 5  WIDE', ts: '2026-10-13  02:15:02', boxes: { person: pbox(p[0], p[1], p[2], 0.14, 0.46) } };
  },
  // PTZ 7-02 auto-track (IR, mono): the intruder is inside the fence, running across the grass towards runway 02L
  fence_inside() {
    const p = [700, 560, 200];
    const body = `${nightSky('#141414', '#202020')}${airfieldLights(250, 1, false, '#F2F2F2')}
      <rect y="262" width="${W}" height="458" fill="url(#gs)"/>
      ${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${300 + i * 30}" x2="${W}" y2="${296 + i * 31}" stroke="#4A4A4A" stroke-width="1" opacity=".35"/>`).join('')}
      ${lightPool(700, 470, 420, 200, 0.14, '#F2F2F2')}
      <g filter="url(#soft)">${person(p[0], p[1], p[2], { coat: '#9A9A9A', coatHi: '#C0C0C0', pants: '#5E5E5E', skin: '#D6D6D6', hair: '#3A3A3A', pose: 'run', cap: '#4A4A4A' })}</g>
      <rect x="560" y="300" width="280" height="300" fill="none" stroke="#F0F0F0" stroke-width="2" stroke-dasharray="14 10" opacity=".45"/>
      <text x="566" y="292" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#F0F0F0" opacity=".7">AUTO-TRACK</text>`;
    const defs = `<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E2E2E"/><stop offset="1" stop-color="#1A1A1A"/></linearGradient>`;
    return { svg: wrap(body, defs, '#141414'), osd: 'PTZ 7-02  AUTO-TRACK  ZOOM 18X', ts: '2026-10-13  02:15:26', mono: true, boxes: { person: pbox(p[0], p[1], p[2], 0.1, 0.44) } };
  },
  // PTZ 7-02 (colour night): patrol vehicle at the fence, the intruder detained
  fence_patrol() {
    const pi = [760, 560, 220], po1 = [650, 566, 232], po2 = [880, 572, 230];
    const body = `${nightSky('#0B1322', '#18233A')}${airfieldLights(220, 0.8, true)}
      ${fenceFront(240, 470, { col: '#7C8798', mesh: '#56616F' })}
      <rect y="470" width="${W}" height="250" fill="url(#gr3)"/>
      <!-- patrol vehicle with light bar -->
      <g transform="translate(130 560)">
        <path d="M0 -40 L30 -110 L250 -110 L300 -50 L330 -40 L330 0 L0 0 Z" fill="#D9DEE6"/>
        <path d="M44 -100 L70 -100 L70 -58 L22 -58 Z M80 -100 L190 -100 L190 -58 L80 -58 Z M200 -100 L240 -100 L276 -58 L200 -58 Z" fill="#1E2735"/>
        <rect x="0" y="-32" width="330" height="10" fill="#E8A21B"/><rect x="0" y="-22" width="330" height="8" fill="#2D5BD8"/>
        <circle cx="70" cy="0" r="26" fill="#111"/><circle cx="262" cy="0" r="26" fill="#111"/>
        <rect x="96" y="-122" width="110" height="12" rx="4" fill="#2C3546"/>
        <rect x="100" y="-121" width="48" height="9" rx="3" fill="#FFB020"/><rect x="154" y="-121" width="48" height="9" rx="3" fill="#3E7BFF"/>
        <text x="160" y="-70" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#1A2233">AIRPORT SECURITY</text>
      </g>
      <ellipse cx="254" cy="440" rx="190" ry="80" fill="#FFB020" opacity=".16" filter="url(#glow)"/><ellipse cx="320" cy="430" rx="160" ry="70" fill="#3E7BFF" opacity=".16" filter="url(#glow)"/>
      ${lightPool(780, 520, 460, 160, 0.16, '#FFF3D6')}
      ${person(po1[0], po1[1], po1[2], { coat: '#1F2A3A', pants: '#151B26', pose: 'stand', vest: '#D9E021', cap: '#121722' })}
      ${person(pi[0], pi[1], pi[2], { coat: '#3A3F48', coatHi: '#4B515C', pants: '#202329', pose: 'held', cap: '#2A2D33' })}
      ${person(po2[0], po2[1], po2[2], { coat: '#1F2A3A', pants: '#151B26', pose: 'phone', vest: '#D9E021', cap: '#121722' })}`;
    const defs = `<linearGradient id="gr3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28303A"/><stop offset="1" stop-color="#15191F"/></linearGradient>`;
    return { svg: wrap(body, defs, '#0E141F'), osd: 'PTZ 7-02  SECTOR 5  SEG 5-14', ts: '2026-10-13  02:18:47', boxes: { person: pbox(...pi), officer1: pbox(...po1), officer2: pbox(...po2), vehicle: [130, 438, 330, 148] } };
  },
  // PTZ 7-03 (colour night): hand-over to Airport Police unit AP-12 — patrol officer, the person, police officer, police car
  fence_handover() {
    const pi = [760, 560, 220], po1 = [640, 566, 232], pp = [880, 570, 236];
    const body = `${nightSky('#0B1322', '#18233A')}${airfieldLights(220, 0.8, true)}
      ${fenceFront(240, 470, { col: '#7C8798', mesh: '#56616F' })}
      <rect y="470" width="${W}" height="250" fill="url(#gr5)"/>
      <!-- Airport Police car AP-12 with light bar -->
      <g transform="translate(110 560)">
        <path d="M0 -40 L30 -110 L250 -110 L300 -50 L330 -40 L330 0 L0 0 Z" fill="#E6EAF0"/>
        <path d="M44 -100 L70 -100 L70 -58 L22 -58 Z M80 -100 L190 -100 L190 -58 L80 -58 Z M200 -100 L240 -100 L276 -58 L200 -58 Z" fill="#1E2735"/>
        ${Array.from({ length: 22 }, (_, i) => `<rect x="${i * 15}" y="-34" width="15" height="9" fill="${i % 2 ? '#F2F2F2' : '#1F3F9E'}"/><rect x="${i * 15}" y="-25" width="15" height="9" fill="${i % 2 ? '#1F3F9E' : '#F2F2F2'}"/>`).join('')}
        <circle cx="70" cy="0" r="26" fill="#111"/><circle cx="262" cy="0" r="26" fill="#111"/>
        <rect x="96" y="-122" width="110" height="12" rx="4" fill="#2C3546"/>
        <rect x="100" y="-121" width="48" height="9" rx="3" fill="#3E7BFF"/><rect x="154" y="-121" width="48" height="9" rx="3" fill="#3E7BFF"/>
        <text x="165" y="-40" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#1A2233">AIRPORT POLICE · AP-12</text>
      </g>
      <ellipse cx="270" cy="430" rx="220" ry="85" fill="#3E7BFF" opacity=".2" filter="url(#glow)"/>
      ${lightPool(780, 520, 460, 160, 0.16, '#FFF3D6')}
      ${person(po1[0], po1[1], po1[2], { coat: '#1F2A3A', pants: '#151B26', pose: 'stand', vest: '#D9E021', cap: '#121722' })}
      ${person(pi[0], pi[1], pi[2], { coat: '#3A3F48', coatHi: '#4B515C', pants: '#202329', pose: 'held', cap: '#2A2D33' })}
      ${person(pp[0], pp[1], pp[2], { coat: '#16213A', pants: '#111827', pose: 'stand', vest: '#2A3550', cap: '#0F1626' })}`;
    const defs = `<linearGradient id="gr5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28303A"/><stop offset="1" stop-color="#15191F"/></linearGradient>`;
    return { svg: wrap(body, defs, '#0E141F'), osd: 'PTZ 7-03  SECTOR 5  SEG 5-14', ts: '2026-10-13  02:26:30', boxes: { person: pbox(...pi), officer1: pbox(...po1), police: pbox(...pp), vehicle: [110, 438, 330, 148] } };
  },
  // PTZ 7-02 (colour night), another night: permitted contractor crew of 2 repairing the fence at 5-14 (one continuous scene)
  fence_crew() {
    const c1 = [610, 566, 232], c2 = [800, 572, 230];
    const cone = x => `<g transform="translate(${x} 600)"><path d="M-18 0 L-5 -58 L5 -58 L18 0 Z" fill="#E8741B"/><rect x="-11" y="-36" width="22" height="8" fill="#F2F2F2" opacity=".85"/><rect x="-24" y="0" width="48" height="7" rx="2" fill="#2A2F37"/></g>`;
    const body = `${nightSky('#0B1322', '#18233A')}${airfieldLights(220, 0.8, true)}
      ${fenceFront(240, 470, { col: '#7C8798', mesh: '#56616F' })}
      <rect y="470" width="${W}" height="250" fill="url(#gr4)"/>
      ${lightPool(700, 520, 520, 170, 0.18, '#FFF3D6')}
      <!-- work light on a tripod and a tool case at the repair -->
      <g transform="translate(470 590)"><path d="M0 0 L22 -150 L44 0 M22 -150 V0" stroke="#3A414C" stroke-width="5" fill="none"/><rect x="2" y="-178" width="40" height="28" rx="4" fill="#2C3546"/><rect x="6" y="-174" width="32" height="20" rx="3" fill="#FFF6D8"/></g>
      <ellipse cx="510" cy="420" rx="170" ry="90" fill="#FFF3D6" opacity=".12" filter="url(#glow)"/>
      <rect x="680" y="548" width="70" height="34" rx="4" fill="#B5471B"/><rect x="700" y="540" width="30" height="9" rx="3" fill="#2A2F37"/>
      ${cone(330)}${cone(1010)}
      ${person(c1[0], c1[1], c1[2], { coat: '#2B2F36', pants: '#151B26', pose: 'push', vest: '#D9E021', cap: '#E8E8E8' })}
      ${person(c2[0], c2[1], c2[2], { coat: '#2B2F36', pants: '#151B26', pose: 'phone', vest: '#D9E021', cap: '#E8E8E8' })}`;
    const defs = `<linearGradient id="gr4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28303A"/><stop offset="1" stop-color="#15191F"/></linearGradient>`;
    return { svg: wrap(body, defs, '#0E141F'), osd: 'PTZ 7-02  SECTOR 5  SEG 5-14', ts: '2026-10-11  01:21:05', boxes: { crew1: pbox(...c1), crew2: pbox(...c2) } };
  },

  // Corridor L2-East — tailgater walking away (co-pilot "where now")
  corridor() {
    const p = [660, 520, 240];
    const body = `<rect width="${W}" height="${H}" fill="url(#fl)"/>
      <path d="M0 0 L520 230 L520 420 L0 720 Z" fill="#202A3B"/><path d="M1280 0 L780 230 L780 420 L1280 720 Z" fill="#1C2535"/>
      <rect x="520" y="230" width="260" height="190" fill="#2C3850"/>
      <path d="M0 0 H1280 L780 230 H520 Z" fill="#121A27"/>
      ${[0.2, 0.45, 0.7].map(t => `<rect x="${640 - 260 * (1 - t) }" y="${230 * t - 6}" width="${520 * (1 - t)}" height="10" rx="5" fill="#F4F7FF" opacity="${0.5 + t * 0.3}"/>`).join('')}
      ${[0, 1, 2].map(i => `<path d="M${120 + i * 140} ${60 + i * 62} L${200 + i * 120} ${96 + i * 54} L${200 + i * 120} ${520 - i * 70} L${120 + i * 140} ${560 - i * 80} Z" fill="#141C2A" stroke="#3A4762"/>`).join('')}
      <rect x="980" y="180" width="140" height="44" rx="6" fill="#1B5E3A" transform="skewY(-12)"/>
      ${lightPool(650, 520, 300, 80, 0.12)}
      ${person(p[0], p[1], p[2], { coat: '#5C4433', coatHi: '#76583F', pants: '#262423', pose: 'walk', phase: .55, cap: '#202226', backpack: '#1D2028', back: true })}`;
    const defs = `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3243"/><stop offset="1" stop-color="#171C27"/></linearGradient>`;
    return { svg: wrap(body, defs), osd: 'CAM 3-121  CORRIDOR L2-EAST', ts: '2026-10-13  02:15:40', boxes: { person: pbox(...p) } };
  },
};

// head-and-shoulders crops (privacy-safe stylised faces) for the match panels — 512×512
export function portrait(kind) {
  const P = {
    a17: { bg: '#2A3445', coat: '#4E6A5A', skin: '#B88E72', hair: '#2A211B', cap: null },
    c2: { bg: '#232C3C', coat: '#26282E', skin: '#C59C80', hair: '#121114', cap: '#15161A' },
    live: { bg: '#2B3243', coat: '#3B3F4A', skin: '#B9937B', hair: '#141215', cap: '#2A2D35' },
    ref: { bg: '#C9CED8', coat: '#3E4452', skin: '#B48C74', hair: '#1A1718', cap: null },
  }[kind];
  const cap = P.cap ? `<path d="M168 178 Q256 92 344 178 L346 196 L392 204 L340 214 L168 210 Z" fill="${P.cap}"/>` : `<path d="M172 214 Q170 120 256 116 Q342 120 340 214 Q318 160 256 158 Q194 160 172 214 Z" fill="${P.hair}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>
    <radialGradient id="lt" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
    <filter id="b"><feGaussianBlur stdDeviation="${kind === 'ref' ? 1.2 : 3.2}"/></filter></defs>
    <rect width="512" height="512" fill="${P.bg}"/>
    <g filter="url(#b)">
      <path d="M60 512 Q80 380 256 360 Q432 380 452 512 Z" fill="${P.coat}"/>
      <rect x="226" y="300" width="60" height="70" fill="${P.skin}"/>
      <ellipse cx="170" cy="246" rx="16" ry="26" fill="${P.skin}"/><ellipse cx="342" cy="246" rx="16" ry="26" fill="${P.skin}"/>
      <ellipse cx="256" cy="236" rx="86" ry="106" fill="${P.skin}"/>
      <path d="M176 270 Q190 336 256 344 Q322 336 336 270 Q330 330 256 336 Q182 330 176 270 Z" fill="#000" opacity=".14"/>
      <path d="M204 214 Q222 206 240 213 M272 213 Q290 206 308 214" stroke="${P.hair}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>
      <ellipse cx="222" cy="232" rx="10" ry="6" fill="#2A2020" opacity=".7"/><ellipse cx="290" cy="232" rx="10" ry="6" fill="#2A2020" opacity=".7"/>
      <path d="M256 240 L248 282 H266" stroke="#8C6A56" stroke-width="5" fill="none" opacity=".6"/>
      <path d="M234 306 Q256 309 278 306" stroke="#6E4A3C" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>
      ${cap}
    </g>
    <rect width="512" height="512" fill="url(#lt)"/></svg>`;
  return { svg, mono: false, osd: '', ts: '' };
}
