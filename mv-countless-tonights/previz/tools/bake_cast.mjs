#!/usr/bin/env node
// Bake every cast figure (and its hands, plus standard close-up hands) into previz/lib/cache/.
//   node previz/tools/bake_cast.mjs                 # all characters, 4 parallel jobs
//   node previz/tools/bake_cast.mjs RESTORER GUARD  # subset (merged into the existing cache)
//   options: --jobs N   --lod=hi[,mid]   --hands (also bake the standard close-up hands)
//   codes: cast codes and EXTRA_<ERA> (crowd variants: MIGRANT NAVIGATOR HOME MODERN CHAPEL MAPHAND FUTURE)
// Scenes then call  await loadCharacter(code)  /  await loadCharacterHand(code, side)  (cast.js),
// which fetch the baked geometry instead of sculpting it at start-up. The cache is keyed to the
// exact library sources; editing previz/lib/{figure,figure_garments,figure_sdf,hand,cast}.js makes
// it stale (scenes then build live and warn) until you re-run this tool.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(HERE, '../lib');
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(LIB, 'cache');
fs.mkdirSync(OUT, { recursive: true });
const fc = await import(path.join(LIB, 'figure_cache.js'));
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); if (a) return a.split('=')[1]; const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const lods = String(opt('lod', 'hi,mid')).split(',');
const src = fc.sourceHash(fc.SOURCE_FILES.map((f) => fs.readFileSync(path.join(LIB, f), 'utf8')));
const idxPath = path.join(OUT, 'index.json');
const ALL = ['RESTORER', 'GUARD', 'NAVIGATOR', 'WIFE', 'MIGRANT', 'MAPHAND', 'MOTHER', 'COMPANION', 'TRAVELLER', 'LONELY', 'FUTURE', 'CHILD',
  'EXTRA_MIGRANT', 'EXTRA_NAVIGATOR', 'EXTRA_HOME', 'EXTRA_MODERN', 'EXTRA_CHAPEL', 'EXTRA_MAPHAND', 'EXTRA_FUTURE'];

if (!args.includes('--child')) {
  // ---------------- parent: reset stale cache, fan out, merge ----------------
  const codes = args.filter((a) => /^[A-Z_]+$/.test(a));
  const list = codes.length ? codes : ALL;
  let index = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : null;
  if (!index || index.src !== src) {
    for (const f of fs.readdirSync(OUT)) if (f.endsWith('.bin') || f.startsWith('index')) fs.unlinkSync(path.join(OUT, f));
    index = { src, figures: {}, hands: {} };
  }
  const jobs = Math.max(1, Math.min(+opt('jobs', 4), list.length));
  const parts = Array.from({ length: jobs }, () => []);
  // heavy characters first, round-robin
  list.forEach((c, i) => parts[i % jobs].push(c));
  const t0 = Date.now();
  await Promise.all(parts.map((p, i) => new Promise((res) => {
    const ch = spawn(process.execPath, [path.join(HERE, 'bake_cast.mjs'), '--child', '--part', String(i), '--lod=' + lods.join(','), ...(args.includes('--hands') ? ['--hands'] : []), ...p], { stdio: ['ignore', 'pipe', 'pipe'] });
    ch.stdout.on('data', (d) => process.stdout.write(d));
    ch.stderr.on('data', (d) => { const s = String(d); if (!/MODULE_TYPELESS|Reparsing|trace-warnings|eliminate this/.test(s)) process.stderr.write(s); });
    ch.on('close', res);
  })));
  for (let i = 0; i < jobs; i++) {
    const pf = path.join(OUT, `index.part${i}.json`);
    if (!fs.existsSync(pf)) continue;
    const part = JSON.parse(fs.readFileSync(pf, 'utf8'));
    for (const [h, e] of Object.entries(part.figures)) { const prev = index.figures[h]; index.figures[h] = { ...e, hands: [...new Set([...(prev?.hands || []), ...e.hands])] }; }
    Object.assign(index.hands, part.hands);
    fs.unlinkSync(pf);
  }
  fs.writeFileSync(idxPath, JSON.stringify(index, null, 1));
  const mb = fs.readdirSync(OUT).filter((f) => f.endsWith('.bin')).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0) / 1e6;
  console.log(`baked ${Object.keys(index.figures).length} figures, ${Object.keys(index.hands).length} hands, ${mb.toFixed(0)} MB in ${((Date.now() - t0) / 1000).toFixed(0)} s (src ${src})`);
} else {
  // ---------------- child: build a subset ----------------
  const cast = await import(path.join(LIB, 'cast.js'));
  const { FIGURE_CACHE } = await import(path.join(LIB, 'figure.js'));
  const { HAND_CACHE } = await import(path.join(LIB, 'hand.js'));
  try { cast.applyBible(JSON.parse(fs.readFileSync(path.join(ROOT, 'bible/bible.json'), 'utf8'))); } catch (e) { console.warn('bible not applied', e.message); }
  const part = opt('part', '0');
  const list = args.filter((a) => /^[A-Z_]+$/.test(a));
  const index = { figures: {}, hands: {} };
  const writeHand = (key) => {
    const h = fc.hashKey(key);
    const G = HAND_CACHE.get(key);
    if (!G || index.hands[h]) return h;
    const file = `hand_${h}.bin`;
    fs.writeFileSync(path.join(OUT, file), Buffer.from(fc.serializeHand(key, G)));
    index.hands[h] = { file, bytes: fs.statSync(path.join(OUT, file)).size };
    return h;
  };
  const variants = (code) => [{}, ...(code === 'RESTORER' ? [{ gloves: false }] : []), ...(code === 'NAVIGATOR' ? [{ cuffTurned: true }, { outerCoat: true }] : [])];
  for (const code of list.filter((c) => !c.startsWith('EXTRA_'))) for (const lod of lods) for (const vo of variants(code)) {
    const t0 = Date.now();
    const fig = cast.makeCharacter(code, { lod, ...vo });
    const key = fig.cacheKey;
    const h = fc.hashKey(key);
    const file = `fig_${code}_${lod}_${h}.bin`;
    let bytes = 0;
    if (!fs.existsSync(path.join(OUT, file))) { const buf = fc.serializeFigure(key, FIGURE_CACHE.get(key)); fs.writeFileSync(path.join(OUT, file), Buffer.from(buf)); bytes = buf.byteLength; }
    const hands = (fig.handKeys || []).map(writeHand);
    const prev = index.figures[h];
    index.figures[h] = { code, lod, opts: vo, file, hands: [...new Set([...(prev?.hands || []), ...hands])], tris: fig.G.tris };
    console.log(`  ${code} ${lod} ${JSON.stringify(vo)}  ${((Date.now() - t0) / 1000).toFixed(1)} s  ${(bytes / 1e6).toFixed(1)} MB`);
  }
  // crowd extras: default makeCrowd variants (seed 1, 6 variants) for each era
  for (const era of list.filter((c) => c.startsWith('EXTRA_')).map((c) => c.slice(6).toLowerCase())) {
    const t0 = Date.now();
    for (let v = 0; v < 6; v++) {
      const sd = 101 + v;
      const fig = cast.makeExtra(era, sd, { lod: 'lo' });
      const key = fig.cacheKey, h = fc.hashKey(key);
      const file = `extra_${era}_${sd}_${h}.bin`;
      if (!fs.existsSync(path.join(OUT, file))) fs.writeFileSync(path.join(OUT, file), Buffer.from(fc.serializeFigure(key, FIGURE_CACHE.get(key))));
      index.figures[h] = { code: 'EXTRA', era, seed: sd, lod: 'lo', file, hands: [] };
    }
    console.log(`  extras ${era}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  if (args.includes('--hands')) {
    for (const code of list.filter((c) => !c.startsWith('EXTRA_'))) for (const side of ['L', 'R']) for (const o of [{}, ...(code === 'NAVIGATOR' ? [{ cuffTurned: true }] : []), ...(code === 'RESTORER' ? [{ gloves: false }] : [])]) {
      const hd = cast.makeCharacterHand(code, side, { lod: 'close', ...o });
      writeHand(hd.cacheKey);
    }
  }
  fs.writeFileSync(path.join(OUT, `index.part${part}.json`), JSON.stringify(index));
}
