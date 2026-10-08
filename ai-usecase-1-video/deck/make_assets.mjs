// Deck assets, rendered straight from the film source so UI text stays crisp:
// stills and crops from src/index.html (Playwright), a "noise → signal" closing background,
// the storyboard sheet, and a 720p copy of the film to embed in the deck.
//
//   node deck/make_assets.mjs [outDir]        (default: build/deck-assets)
//
// Needs the film build ($BUILD, default build/) for master.mp4 and the storyboard JPG.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = process.env.BUILD || path.join(ROOT, 'build');
const OUT = path.resolve(process.argv[2] || path.join(BUILD, 'deck-assets'));
const SCALE = 1.5; // crops are shown ~7" wide on the slide: 1.5× keeps them at ~240 dpi
fs.mkdirSync(OUT, { recursive: true });

const HIDE_CHROME = '#chrome, #subs { opacity: 0 !important; }';
const STILLS = [
  // title background: the cold-open map without copy, lifted and scaled to leave the lower third free
  { name: 'title_bg', t: () => 7.0, full: true,
    css: `${HIDE_CHROME} .scene[data-id="s01"] .copy, .scene[data-id="s01"] .legend { opacity: 0 !important; }
          .scene[data-id="s01"] svg.map { transform: translateY(-62px) scale(0.9); transform-origin: 50% 0%; }` },
  // video poster: the solution title card
  { name: 'cover', t: () => 48.4, full: true },
  // the alarm queue at 02:14, both real alarms ringed
  { name: 'storm', t: () => 20.2, clip: [700, 150, 1100, 740] },
  // the five moments: the product panel just before each scene ends
  ...['m1', 'm2', 'm3', 'm4', 'm5'].map(id => ({ name: id, t: TL => +(TL.scenes[id].end - 0.6).toFixed(2), clip: [660, 142, 1140, 748] })),
];

// Noise resolving into one clear signal, over the film's own background (for the closing slide).
function signalSvg() {
  let a = 7; const R = () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648);
  const Y = 430, dots = [];
  const ss = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const mix = (c0, c1, k) => '#' + [0, 2, 4].map(i => Math.round(parseInt(c0.slice(1 + i, 3 + i), 16) * (1 - k) + parseInt(c1.slice(1 + i, 3 + i), 16) * k).toString(16).padStart(2, '0')).join('');
  for (let i = 0; i < 340; i++) {
    const u = R(), c = ss(0.2, 1.0, u), spread = 235 * (1 - c);
    const x = 150 + u * 1130, y = Y + (R() * 2 - 1) * spread * (0.35 + 0.65 * R());
    const red = R() < 0.08 * (1 - c);
    const col = red ? '#FF6B81' : mix('#7C8BA8', '#8FB4FF', c);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + R() * 1.9).toFixed(2)}" fill="${col}" opacity="${(0.45 + 0.5 * R()).toFixed(2)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" style="position:absolute;left:0;top:0;z-index:30">
    <defs>
      <linearGradient id="sg" x1="1150" x2="1330" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8FB4FF" stop-opacity="0"/><stop offset="1" stop-color="#8FB4FF"/></linearGradient>
      <radialGradient id="ng"><stop offset="0" stop-color="#8FB4FF" stop-opacity=".55"/><stop offset="1" stop-color="#8FB4FF" stop-opacity="0"/></radialGradient>
      <filter id="bl" x="-20%" y="-400%" width="140%" height="900%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <g>${dots.join('')}</g>
    <line x1="1150" x2="1770" y1="${Y}" y2="${Y}" stroke="url(#sg)" stroke-width="14" opacity=".35" filter="url(#bl)"/>
    <line x1="1150" x2="1770" y1="${Y}" y2="${Y}" stroke="url(#sg)" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="1770" cy="${Y}" r="34" fill="url(#ng)"/>
    <circle cx="1770" cy="${Y}" r="7" fill="#EEF3FC"/>
  </svg>`;
}

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
await page.goto('file://' + path.join(ROOT, 'src', 'index.html'));
await page.evaluate(() => document.fonts.ready);
const TL = await page.evaluate(() => window.TL);
for (const s of STILLS) {
  const style = s.css ? await page.addStyleTag({ content: s.css }) : null;
  const t = s.t(TL);
  await page.evaluate(tt => window.seek(tt), t);
  const file = path.join(OUT, s.name + '.png');
  if (s.full) await page.screenshot({ path: file, scale: 'css' });
  else await page.screenshot({ path: file, clip: { x: s.clip[0], y: s.clip[1], width: s.clip[2], height: s.clip[3] } });
  if (style) await style.evaluate(n => n.remove());
  console.log(`${s.name.padEnd(9)} t=${t}s → ${path.relative(ROOT, file)}`);
}
// closing background: background only, every scene hidden, plus the signal graphic
await page.addStyleTag({ content: `${HIDE_CHROME} .scene { opacity: 0 !important; }` });
await page.evaluate(svg => document.getElementById('stage').insertAdjacentHTML('beforeend', svg), signalSvg());
await page.screenshot({ path: path.join(OUT, 'close_bg.png'), scale: 'css' });
console.log('close_bg  → ' + path.relative(ROOT, path.join(OUT, 'close_bg.png')));
await browser.close();

// storyboard sheet and the embedded film copy come from the film build
const sb = path.join(BUILD, 'dist', 'AI-UseCase1_AGIL-Secure-ISMS_storyboard.jpg');
if (fs.existsSync(sb)) fs.copyFileSync(sb, path.join(OUT, 'storyboard.jpg'));
else console.warn('! no storyboard sheet — run ./build.sh first');
const master = path.join(BUILD, 'master.mp4'), video = path.join(OUT, 'film_720p.mp4');
if (!fs.existsSync(video) && fs.existsSync(master)) {
  // 2-pass 720p (~15 MB) keeps the deck comfortably under 30 MB with the film embedded
  const v = ['-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', '520k',
    '-maxrate', '1300k', '-bufsize', '2600k', '-pix_fmt', 'yuv420p', '-passlogfile', path.join(OUT, 'x264')];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, ...v, '-pass', '1', '-an', '-f', 'null', '/dev/null']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, ...v, '-pass', '2', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', video]);
  for (const f of fs.readdirSync(OUT)) if (f.startsWith('x264')) fs.rmSync(path.join(OUT, f));
}
console.log(fs.existsSync(video) ? 'film_720p → ' + path.relative(ROOT, video) : '! no master.mp4 — run ./build.sh first');
