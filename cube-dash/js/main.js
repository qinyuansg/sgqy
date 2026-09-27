// ─────────────────────────────────────────────────────────────
// CUBE DASH — boot · renderer · frame loop · time control · app states
// See docs/ARCHITECTURE.md for the module contract.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Bus, clamp, damp, rand } from './core.js';
import { Input } from './input.js';
import { Save } from './save.js';
import { setLang, detectLang, onLangChange } from './i18n.js';
import { tickArt, CubeCrowd, BlobShadows, EXPR } from './art.js';
import { DATA } from './data.js';
import { World } from './world.js';
import { Post } from './post.js';
import { CameraDirector } from './camera.js';
import { FX } from './fx.js';
import { AudioSys } from './audio.js';
import { Meta } from './meta.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { Run } from './run.js';
import { createHeroModel } from './hero_model.js';

const params = new URLSearchParams(location.search);

// ---------- quality ----------
const save = new Save();
const coarse = matchMedia('(pointer: coarse)').matches;
function pickQuality() {
  const q = params.get('quality') || save.profile.settings.quality;
  if (q === 'high' || q === 'low') return q;
  const weak = (navigator.hardwareConcurrency || 4) <= 4 || Math.min(screen.width, screen.height) < 500;
  return coarse && weak ? 'low' : 'high';
}
const quality = pickQuality();

// ---------- renderer / scene ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 16, 14);
camera.lookAt(0, 0, 0);
scene.add(camera);

// ---------- shared context ----------
const bus = new Bus();
const input = new Input();
input.hapticsOff = !save.profile.settings.haptics;

const G = {
  THREE, renderer, scene, camera, bus, input, save, data: DATA, quality,
  time: { now: 0, real: 0, dt: 0, rdt: 0, scale: 1 },
  world: null, post: null, cam: null, fx: null, audio: null, hud: null, ui: null, meta: null,
  run: null, app: null,
  params,
  hitStop(ms) { timeCtl.stop = Math.max(timeCtl.stop, ms / 1000); },
  slowMo(scale, seconds) {
    timeCtl.slow = Math.min(timeCtl.slow, clamp(scale, 0.02, 1));
    timeCtl.slowHold = Math.max(timeCtl.slowHold, seconds * 0.45);
    timeCtl.slowEase = Math.max(0.05, seconds * 0.55);
  },
};
const timeCtl = { stop: 0, slow: 1, slowHold: 0, slowEase: 0.3 };
window.__cd = G; // debug / automated playtests

// language
if (params.get('lang')) save.profile.settings.lang = params.get('lang');
if (!save.profile.settings.lang) save.profile.settings.lang = detectLang();
setLang(save.profile.settings.lang);

// ---------- systems (order matters: see ARCHITECTURE §3) ----------
G.world = new World(G);
G.post = new Post(G);
G.cam = new CameraDirector(G);
G.fx = new FX(G);
G.audio = new AudioSys(G);
G.meta = new Meta(G);
G.hud = new HUD(G);

// ---------- hub diorama: Cube Village ----------
// The hero idles centre stage between runs, surrounded by the happy cubes the
// player has rescued: one villager per 25 cubes freed (min 3, max 120). They
// wander, hop, look at the hero and cheer — progress you can SEE (relatedness).
const VILLAGE = { perVillager: 25, min: 3, max: 120, inner: 3.2, colors: [0xffffff, 0xb8f2e6, 0xfff3b0, 0xd9c8ff, 0xffd3b6, 0xffe0ec] };
const hub = {
  hero: null, heroId: null, skinId: null, key: '',
  crowd: new CubeCrowd(VILLAGE.max), shadows: new BlobShadows(VILLAGE.max + 4),
  folk: [], t: 0, jumpT: 0, visible: false, cheerT: 0,
};
hub.crowd.mesh.renderOrder = 2;
scene.add(hub.crowd.mesh, hub.shadows.mesh);

function villageTarget() {
  const freed = G.meta?.freed ?? 0;
  return Math.max(VILLAGE.min, Math.min(VILLAGE.max, Math.floor(freed / VILLAGE.perVillager)));
}
function makeVillager(i) {
  const R = (G.world?.arenaRadius ?? 11) - 1.2;
  let a = 0, r = 0;
  do { a = rand() * Math.PI * 2; r = VILLAGE.inner + rand() * (R - VILLAGE.inner); } while (inCameraLane(Math.cos(a) * r, Math.sin(a) * r));
  return {
    x: Math.cos(a) * r, z: Math.sin(a) * r, tx: 0, tz: 0, rotY: rand() * 6,
    s: 0.45 + rand() * 0.3, color: VILLAGE.colors[i % VILLAGE.colors.length],
    hop: 0, hopT: rand() * 2, wait: rand() * 3, speed: 1.2 + rand() * 1.2,
    blinkT: rand() * 4, cheer: 0, ph: rand() * 6,
  };
}
// the hub camera sits in front of the hero (+Z); keep that lane clear so nobody walks into the lens
const inCameraLane = (x, z) => Math.abs(x) < 2.6 && z > 2.8;
function pickTarget(v) {
  const R = (G.world?.arenaRadius ?? 11) - 1.2;
  for (let tries = 0; tries < 8; tries++) {
    const a = rand() * Math.PI * 2, r = VILLAGE.inner + rand() * (R - VILLAGE.inner);
    v.tx = Math.cos(a) * r; v.tz = Math.sin(a) * r;
    if (!inCameraLane(v.tx, v.tz)) return;
  }
  v.tx = Math.sign(v.tx || 1) * 4; v.tz = -3;
}
function hubSyncVillage() {
  const n = villageTarget();
  while (hub.folk.length < n) { const v = makeVillager(hub.folk.length); pickTarget(v); hub.folk.push(v); }
  if (hub.folk.length > n) hub.folk.length = n;
}
function hubShow(on) {
  hub.visible = on;
  hub.crowd.mesh.visible = on;
  hub.shadows.mesh.visible = on;
  if (hub.hero) hub.hero.group.visible = on;
  if (on) { hubSyncVillage(); hub.cheerT = 0.01; }
}
function hubSetHero(heroId, skinId) {
  const hat = G.meta.selectedHat?.(heroId) ?? 'none';
  const trail = G.meta.selectedTrail?.() ?? 'default';
  const key = heroId + '|' + skinId + '|' + hat + '|' + trail;
  if (hub.hero && hub.key === key) return;
  if (hub.hero) { scene.remove(hub.hero.group); hub.hero.dispose?.(); }
  hub.hero = createHeroModel(heroId, skinId, { hat, trail });
  hub.hero.setRing?.(false);
  hub.heroId = heroId; hub.skinId = skinId; hub.key = key;
  hub.hero.group.position.set(0, 0, 0);
  hub.hero.group.visible = hub.visible;
  scene.add(hub.hero.group);
  hub.jumpT = 0.001;   // happy hop when switching
  hub.cheerT = 0.01;   // and the village cheers
}
/** tap / click the hero in the lobby → squash bounce (called by ui.js via G.app.pokeHero) */
function hubPoke() {
  if (!hub.hero) return;
  hub.jumpT = 0.001;
  hub.hero.squash?.(1.3, 0.7, 1.3);
  G.audio?.sfx?.('babble', { hero: hub.heroId, mood: 'happy' });
}
function hubUpdate(dt) {
  if (!hub.visible) return;
  hub.t += dt;
  const t = hub.t;
  if (hub.hero) {
    let y = 0;
    if (hub.jumpT > 0) {
      hub.jumpT += dt;
      const k = hub.jumpT / 0.55;
      y = Math.sin(Math.min(1, k) * Math.PI) * 0.6;   // small hop: stays clear of the title logo
      if (k >= 1) { hub.jumpT = 0; hub.hero.squash?.(1.25, 0.75, 1.25); }
    } else if (Math.random() < dt * 0.08) hub.jumpT = 0.001;
    hub.hero.group.position.y = y;
    hub.hero.group.rotation.y = Math.sin(t * 0.5) * 0.25;
    hub.hero.update(dt, {
      moving: false, speed: 0, airborne: y > 0.05,
      lookX: Math.sin(t * 0.7) * 0.6, lookY: Math.sin(t * 0.43) * 0.3,
      celebrate: hub.jumpT > 0,
    });
  }
  // village cheers every so often (and whenever the hero changes)
  if (hub.cheerT > 0) {
    hub.cheerT = 0;
    for (const v of hub.folk) if (rand() < 0.7) v.cheer = 0.9 + rand() * 0.6;
  } else if (Math.random() < dt * 0.05) {
    const v = hub.folk[Math.floor(rand() * hub.folk.length)];
    if (v) v.cheer = 1.0;
  }
  hub.shadows.begin();
  if (hub.hero) hub.shadows.add(0, 0, 1.25, hub.hero.group.position.y);
  hub.crowd.count = hub.folk.length;
  for (let i = 0; i < hub.folk.length; i++) {
    const v = hub.folk[i];
    let hopY = 0, walking = false;
    if (v.cheer > 0) {
      v.cheer -= dt;
      hopY = Math.abs(Math.sin(v.cheer * 9)) * 0.55;
      v.rotY = damp(v.rotY, Math.atan2(-v.x, -v.z), 8, dt);      // face the hero
    } else if (v.wait > 0) {
      v.wait -= dt;
    } else {
      const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { v.wait = 1 + rand() * 4; pickTarget(v); }
      else {
        walking = true;
        const step = Math.min(d, v.speed * dt);
        v.x += (dx / d) * step; v.z += (dz / d) * step;
        v.rotY = damp(v.rotY, Math.atan2(dx, dz), 10, dt);
        v.hopT += dt * v.speed * 2.2;
        hopY = Math.abs(Math.sin(v.hopT * Math.PI)) * 0.22;
      }
    }
    // never block the camera: slide out of the lane in front of the lens
    if (inCameraLane(v.x, v.z)) { v.x += Math.sign(v.x || 1) * 3 * dt; }
    // keep villagers out of the hero's personal space
    const hr = Math.hypot(v.x, v.z);
    if (hr < VILLAGE.inner * 0.8) { v.x *= (VILLAGE.inner * 0.8) / Math.max(hr, 0.01); v.z *= (VILLAGE.inner * 0.8) / Math.max(hr, 0.01); }
    v.blinkT -= dt;
    let blink = 0;
    if (v.blinkT < 0) { blink = 1; if (v.blinkT < -0.12) v.blinkT = 2 + rand() * 4; }
    const land = walking || v.cheer > 0 ? 1 - Math.max(0, 0.12 - hopY) * 1.2 : 1 + Math.sin(t * 2 + v.ph) * 0.03;
    hub.crowd.set(i, {
      x: v.x, y: v.s * 0.5 * land + hopY, z: v.z,
      sx: v.s * (2 - land), sy: v.s * land, sz: v.s * (2 - land),
      rotY: v.rotY, color: v.color,
      expr: v.cheer > 0 ? EXPR.JOY : EXPR.HAPPY, blink,
      lookX: Math.sin(t * 0.9 + v.ph) * 0.5, lookY: 0,
    });
    hub.shadows.add(v.x, v.z, v.s, hopY);
  }
  hub.crowd.commit();
  hub.shadows.end();
}

// ---------- app controller ----------
const app = {
  state: 'boot',
  lastRunCfg: null,
  startRun(cfg) {
    const prof = save.profile;
    const heroId = G.meta.selectedHero;
    const full = {
      mode: cfg.mode || 'stage',
      worldId: cfg.worldId ?? 0,
      stageId: cfg.stageId ?? 0,
      heroId,
      skinId: G.meta.selectedSkin?.(heroId) ?? null,
      assist: !!prof.settings.assist,
      ...cfg,
    };
    app.lastRunCfg = full;
    app._disposeRun();
    hubShow(false);
    const world = DATA.worlds[full.worldId] || DATA.worlds[0];
    G.world.load(world.id);
    G.cam.setHub(false);
    G.run = new Run(G, full);
    app.state = 'run';
    G.hud.show(true);
    input.setTouchControls(true);
    G.run.start();
  },
  restartRun() { if (app.lastRunCfg) app.startRun(app.lastRunCfg); },
  quitRun() {
    app._disposeRun();
    app.toHub();
  },
  toHub() {
    app.state = 'hub';
    G.hud.show(false);
    input.setTouchControls(false);
    G.world.load(G.meta.hubWorld?.() ?? DATA.worlds[0].id);
    hubSetHero(G.meta.selectedHero, G.meta.selectedSkin?.(G.meta.selectedHero) ?? null);
    hubShow(true);
    G.cam.follow(null);
    G.cam.setHub(true, { x: 0, y: 0.8, z: 0 });
    G.audio.music('hub');
  },
  _disposeRun() {
    if (G.run) { G.run.dispose(); G.run = null; }
    G.fx.clear?.();
    timeCtl.stop = 0; timeCtl.slow = 1; timeCtl.slowHold = 0;
  },
  pause() {
    // the game is already frozen behind these overlays (cards, second-chance bubble, results)
    const noPause = ['ended', 'paused', 'levelup', 'secondChance', 'victory', 'dying'];
    if (!G.run || noPause.includes(G.run.state)) return;
    G.run.pause();
    if (G.run.state === 'paused') G.ui.showPause();
  },
  resume() {
    if (!G.run) return;
    G.ui.hidePause();
    G.run.resume();
  },
  selectHero(id) {
    G.meta.selectHero(id);
    hubSetHero(id, G.meta.selectedSkin?.(id) ?? null);
  },
  refreshHub() {
    if (app.state === 'run') return;
    hubSetHero(G.meta.selectedHero, G.meta.selectedSkin?.(G.meta.selectedHero) ?? null);
    hubSyncVillage();
  },
  pokeHero() { hubPoke(); },
};
G.app = app;
G.ui = new UI(G);

// ---------- global wiring ----------
bus.on('player:levelup', (p) => G.ui.showLevelUp(p.choices));
bus.on('run:end', ({ win, results }) => {
  const rewards = G.meta.applyRun(results);
  save.flush();
  G.ui.showResults(results, rewards);
  input.setTouchControls(false);
});
bus.on('settings:change', ({ key, value }) => {
  if (key === 'haptics') input.hapticsOff = !value;
  if (key === 'lang') setLang(value);
  if (key === 'music' || key === 'sfx') G.audio.setVolumes({ music: save.profile.settings.music, sfx: save.profile.settings.sfx });
});
onLangChange(() => G.ui.refresh?.());

// audio needs a user gesture
const unlock = () => { G.audio.unlock(); };
window.addEventListener('pointerdown', unlock, { once: false, passive: true });
window.addEventListener('keydown', unlock, { once: false });

// auto-pause when the tab is hidden / window loses focus (kids get called for dinner)
document.addEventListener('visibilitychange', () => { if (document.hidden) app.pause(); });
window.addEventListener('blur', () => app.pause());

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  G.post.setSize(w, h);
});

// ---------- frame loop ----------
let last = performance.now();
function frame(nowMs) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, Math.max(0, (nowMs - last) / 1000));
  last = nowMs;
  input.update();

  // global hotkeys
  if (G.run) {
    const st = G.run.state;
    if (input.pressed('pause')) {
      if (st === 'paused') app.resume(); else app.pause();
    }
    if (input.pressed('restart') && (st === 'ended' || st === 'paused' || st === 'dying')) { G.ui.hidePause(); app.restartRun(); }
  }
  if (input.pressed('mute')) G.audio.toggleMute();

  // time control: hit-stop (freeze) → slow-mo (hold, then ease back)
  let scale = 1;
  if (timeCtl.stop > 0) { timeCtl.stop -= rdt; scale = 0; }
  else if (timeCtl.slow < 1) {
    if (timeCtl.slowHold > 0) timeCtl.slowHold -= rdt;
    else timeCtl.slow = Math.min(1, timeCtl.slow + rdt / timeCtl.slowEase * (1 - timeCtl.slow + 0.05));
    scale = timeCtl.slow;
  }
  const dt = rdt * scale;
  G.time.rdt = rdt; G.time.dt = dt; G.time.scale = scale;
  G.time.now += dt; G.time.real += rdt;

  if (G.run) G.run.update(dt, rdt);
  else hubUpdate(rdt);
  G.world.update(dt, rdt);
  G.fx.update(dt, rdt);
  G.cam.update(rdt);
  G.hud.update(rdt);
  G.ui.update(rdt);
  G.audio.update(rdt);
  G.meta.tick?.(rdt);
  tickArt(G.time.real);
  // behind an opaque full-panel menu the 3D scene is hidden: render at a trickle to save battery
  if (!G.run && G.ui.coversScene) { if ((coveredFrame = (coveredFrame + 1) % 6) !== 0) return; }
  G.post.render(rdt);
}
let coveredFrame = 0;

// ---------- boot ----------
G.world.load(DATA.worlds[0].id);
hubSetHero(G.meta.selectedHero, G.meta.selectedSkin?.(G.meta.selectedHero) ?? null);
hubShow(true);
// title framing: the hero sits in the band between the logo and the "press any key" pill
G.cam.setHub(true, { x: 0, y: 1.15, z: 0 });
app.state = 'title';
G.ui.go('title');
document.getElementById('boot')?.remove();
requestAnimationFrame(frame);

// dev shortcuts: ?play=w,s  (e.g. ?play=0,0) jumps straight into a stage; ?mode=endless
if (params.has('play') || params.has('mode')) {
  const [w, s] = (params.get('play') || '0,0').split(',').map(Number);
  setTimeout(() => app.startRun({ mode: params.get('mode') || 'stage', worldId: w || 0, stageId: s || 0 }), 50);
}
