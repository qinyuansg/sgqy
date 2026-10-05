// Previz engine: deterministic frame renderer driven by shotlist/shots.json.
//
// Scene module contract (previz/scenes/<scene_key>.js):
//   export const needs = ['other_scene_key'];        // optional: modules rendered nested via ctx.renderNested
//   export default async function create(ctx) {      // build once, reused for every shot of this scene
//     ... return {
//       scene, camera,                               // THREE.Scene + THREE.PerspectiveCamera (engine sets aspect)
//       post: {...},                                 // optional base post params for this scene (see post.js DEFAULT_POST)
//       setShot(shot, tl, u, T) { ... return {dof:{focus, fstop}, exposure, ...} }  // per-frame setup
//     };
//   }
//   shot = entry of shots.json (shot.id 'S012' ...) or {id:'<view name>'} for nested renders;
//   tl = seconds since shot start, u = tl / duration (may exceed 1 during an outgoing dissolve), T = song time in s.
import * as THREE from 'three';
import * as util from './util.js';
import * as cam from './cam.js';
import { Chain, Display, mergePost } from './post.js';

const q = new URLSearchParams(location.search);
const FPS = 24;
const W = +(q.get('w') || 1280);
const ASPECT = 2.39;
const H = Math.round(W / ASPECT / 2) * 2;

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = true;
document.body.appendChild(renderer.domElement);

async function loadJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
let shots;
for (const u of [q.get('shots'), '/shotlist/shots.json', '/shotlist/skeleton.json'].filter(Boolean)) {
  try { shots = await loadJSON(u); console.log('shots from', u, shots.length); break; } catch (e) { /* try next */ }
}
const timing = await loadJSON('/timing/timing.json');
const TOTAL = shots[shots.length - 1].out_frame;

const chainA = new Chain(renderer, W, H);
const chainB = new Chain(renderer, W, H);
const display = new Display(renderer);

const instances = new Map();
const loading = new Map();
const errors = [];

const ctx = {
  THREE, renderer, W, H, aspect: W / H, fps: FPS, shots, timing, util, cam,
  frame: 0, T: 0,
  shotById: (id) => shots.find((s) => s.id === id),
  lineAt: (T) => timing.lines.find((l) => T >= l.start && T < l.end) || null,
  makeRT: (w, h, opts = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: opts.samples ?? 0, ...opts }),
  // Render another scene module (already listed in `needs`) into rt with its own camera, no post.
  // Returns rt.texture (linear HDR) — use as map/emissiveMap of glass, screens, reflections.
  renderNested(key, view, tl, u, T, rt, aspect) {
    const inst = instances.get(key);
    if (!inst) throw new Error('renderNested: module not loaded (add to needs): ' + key);
    const c = inst.camera, oldAspect = c.aspect;
    c.aspect = aspect || rt.width / rt.height;
    const shot = typeof view === 'string' ? { id: view, nested: true } : view;
    inst.setShot(shot, tl, u, T);
    c.updateProjectionMatrix();
    const prevRT = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    renderer.render(inst.scene, c);
    renderer.setRenderTarget(prevRT);
    c.aspect = oldAspect; c.updateProjectionMatrix();
    return rt.texture;
  },
};

async function getInst(key) {
  if (instances.has(key)) return instances.get(key);
  if (loading.has(key)) return loading.get(key);
  const p = (async () => {
    let mod;
    try { mod = await import(`/previz/scenes/${key}.js`); }
    catch (e) { console.warn('scene module missing, using slate:', key, String(e).slice(0, 200)); mod = await import('/previz/scenes/_slate.js'); }
    for (const n of mod.needs || []) await getInst(n);
    const inst = await mod.default(ctx);
    inst.key = key;
    inst.camera.aspect = W / H; inst.camera.updateProjectionMatrix();
    instances.set(key, inst);
    return inst;
  })();
  loading.set(key, p);
  return p;
}
let slate = null;
async function getSlate() { if (!slate) { const m = await import('/previz/scenes/_slate.js'); slate = await m.default(ctx); slate.key = '_slate'; } return slate; }

function findShot(f) {
  let lo = 0, hi = shots.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (shots[mid].in_frame <= f) lo = mid; else hi = mid - 1; }
  return lo;
}

async function renderShotInto(shot, f, chain) {
  const dur = (shot.out_frame - shot.in_frame) / FPS;
  const tl = (f - shot.in_frame) / FPS, u = tl / dur, T = f / FPS;
  ctx.frame = f; ctx.T = T;
  let inst;
  try {
    inst = await getInst(shot.scene);
    inst.camera.aspect = W / H;
    const p = inst.setShot(shot, tl, u, T) || {};
    inst.camera.updateProjectionMatrix();
    return chain.render(inst.scene, inst.camera, mergePost(inst.post, p), f);
  } catch (e) {
    const msg = `${shot.id} ${shot.scene}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`;
    if (errors.length < 200) errors.push(msg);
    console.error('render error', msg);
    const s = await getSlate();
    s.setShot({ ...shot, _error: msg }, tl, u, T);
    return chain.render(s.scene, s.camera, mergePost(s.post), f);
  }
}

const DISSOLVES = new Set(['dissolve', 'light', 'reflection', 'match_dissolve']);

async function renderFrame(f) {
  f = Math.max(0, Math.min(TOTAL - 1, f | 0));
  const i = findShot(f), shot = shots[i];
  const local = f - shot.in_frame;
  const tr = shot.transition_in || { type: 'cut' };
  const n = tr.frames | 0;
  let fade = 0;
  if (tr.type === 'fade_in' && n > 0 && local < n) fade = 1 - util.ease.inOutSine((local + 1) / (n + 1));
  const fo = shot.fade_out_frames | 0;
  if (fo > 0 && f >= shot.out_frame - fo) fade = Math.max(fade, util.ease.inOutSine((f - (shot.out_frame - fo) + 1) / fo));
  if (DISSOLVES.has(tr.type) && n > 0 && local < n && i > 0) {
    const texPrev = await renderShotInto(shots[i - 1], f, chainA);
    const texCur = await renderShotInto(shot, f, chainB);
    const a = util.ease.inOutSine((local + 1) / (n + 1));
    display.show(texPrev, texCur, a, { fade, mode: tr.type === 'light' ? 1 : 0 });
  } else {
    const tex = await renderShotInto(shot, f, chainA);
    display.show(tex, null, 0, { fade });
  }
  return { shot: shot.id, scene: shot.scene, local };
}

window.PREVIZ = {
  W, H, FPS, TOTAL, shots,
  renderFrame,
  frameOf: (id, u) => { const s = ctx.shotById(id); return Math.min(s.out_frame - 1, s.in_frame + Math.round(u * (s.out_frame - s.in_frame - 1))); },
  errors: () => errors.splice(0),
  preload: async (keys) => { for (const k of keys) await getInst(k); return true; },
  ready: true,
};
console.log(`previz ready ${W}x${H}, ${shots.length} shots, ${TOTAL} frames`);
