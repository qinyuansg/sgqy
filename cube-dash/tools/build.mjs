#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// CUBE DASH — single-file build.
// Bundles every ES module (+ vendored three.js) with esbuild and inlines the
// CSS, producing ONE self-contained HTML file that runs offline — even when
// opened straight from disk (file://), shared over chat/USB, or embedded.
//
//   cd cube-dash && npm install && npm run build      →  ../CubeDash.html
// ─────────────────────────────────────────────────────────────
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] || '../CubeDash.html');

// resolve the import-map specifiers the same way index.html does
const importMap = {
  name: 'import-map',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: resolve(root, 'js/vendor/three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: resolve(root, 'js/vendor/addons', a.path.slice('three/addons/'.length)) }));
  },
};

const res = await build({
  entryPoints: [resolve(root, 'js/main.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2020'],
  legalComments: 'none',
  write: false,
  plugins: [importMap],
  logLevel: 'warning',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = ['css/style.css', 'css/hud.css']
  .map((f) => { try { return readFileSync(resolve(root, f), 'utf8'); } catch { return ''; } })
  .join('\n');

html = html
  .replace(/<link rel="stylesheet" href="css\/style\.css"\/>\s*/, '')
  .replace(/<link rel="stylesheet" href="css\/hud\.css"\/>\s*/, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '')
  .replace('</head>', `<style>\n${css}\n</style>\n</head>`)
  .replace(/<script type="module" src="js\/main\.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);

if (html.includes('js/main.js') || html.includes('importmap')) throw new Error('inlining failed');
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
