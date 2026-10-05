#!/usr/bin/env node
// Render the whole film (or a frame range) in N parallel Chromium processes, then concat.
//   node tools/render_parallel.mjs --jobs 3 --w 1280 --range 0:6164 --out out/film/previz_raw.mp4
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, x, i, arr) => { if (x.startsWith('--')) acc.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const jobs = +(a.jobs || 3), W = a.w || 1280;
const [A, B] = String(a.range || '0:6164').split(':').map(Number);
const out = path.resolve(a.out || 'out/film/previz_raw.mp4');
const dir = path.join(path.dirname(out), 'segs_' + path.basename(out, '.mp4'));
fs.mkdirSync(dir, { recursive: true });
// interleave in chunks so heavy sections are spread across workers
const CH = +(a.chunk || 240);
const chunks = []; for (let f = A; f < B; f += CH) chunks.push([f, Math.min(B, f + CH)]);
let next = 0; const t0 = Date.now();
async function worker(id) {
  while (next < chunks.length) {
    const [s, e] = chunks[next++];
    const seg = path.join(dir, `seg_${String(s).padStart(5, '0')}.mp4`);
    if (fs.existsSync(seg) && !a.force) continue;
    await new Promise((res, rej) => {
      const p = spawn('node', ['render.mjs', '--w', String(W), '--range', `${s}:${e}`, '--out', seg + '.tmp.mp4', ...(a.shotsfile ? ['--shotsfile', a.shotsfile] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
      let log = '';
      p.stdout.on('data', (d) => { log += d; });
      p.on('close', (c) => { if (c === 0) { fs.renameSync(seg + '.tmp.mp4', seg); const err = log.split('\n').filter((l) => /ERRORS|^\s{3}/.test(l)).slice(0, 6).join('\n'); console.log(`[w${id}] ${s}-${e} done (${((Date.now() - t0) / 60000).toFixed(1)} min)${err ? '\n' + err : ''}`); res(); } else rej(new Error(`chunk ${s}-${e} failed: ${log.slice(-800)}`)); });
    });
  }
}
await Promise.all(Array.from({ length: jobs }, (_, i) => worker(i)));
const list = chunks.map(([s]) => `file '${path.join(dir, `seg_${String(s).padStart(5, '0')}.mp4`)}'`).join('\n');
fs.writeFileSync(path.join(dir, 'list.txt'), list);
await new Promise((res) => spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', res));
console.log('wrote', out, `in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
