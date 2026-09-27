// ─────────────────────────────────────────────────────────────
// CUBE DASH — core utilities shared by every module
//   math helpers · seeded RNG · event bus · guarded storage
// ─────────────────────────────────────────────────────────────

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smooth = (t) => t * t * (3 - 2 * t);
/** frame-rate independent exponential smoothing: move a toward b with rate k (1/s) */
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const len2 = (x, z) => Math.sqrt(x * x + z * z);
export const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Small fast seeded RNG (mulberry32). rng() → [0,1) */
export function makeRng(seed = 1234567) {
  let a = seed >>> 0;
  const r = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r()); // inclusive
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.sign = () => (r() < 0.5 ? -1 : 1);
  /** weighted pick: items [{w, ...}] or (items, weightFn) */
  r.weighted = (items, wf = (x) => x.w) => {
    let tot = 0; for (const it of items) tot += Math.max(0, wf(it));
    let v = r() * tot;
    for (const it of items) { v -= Math.max(0, wf(it)); if (v <= 0) return it; }
    return items[items.length - 1];
  };
  return r;
}
/** shared non-seeded RNG for cosmetic randomness */
export const rand = makeRng((Math.random() * 2 ** 31) | 0);

/**
 * Event bus — gameplay emits, presentation (audio / fx / hud / camera) listens.
 * This keeps modules decoupled: see docs/ARCHITECTURE.md for the event catalog.
 */
export class Bus {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) { this.map.get(name)?.delete(fn); }
  emit(name, payload = {}) {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[bus] ${name} handler failed`, err); }
    }
  }
}

/** localStorage that never throws (sandboxed iframes, private mode, file://) */
export const storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

/** Local calendar date key YYYY-MM-DD (daily missions / sign-in) */
export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
/** whole days between two day keys (b - a) */
export function daysBetween(a, b) {
  const pa = new Date(a + 'T00:00:00'), pb = new Date(b + 'T00:00:00');
  return Math.round((pb - pa) / 86400000);
}

/** deep-merge defaults into target (only fills missing keys) */
export function fillDefaults(target, defaults) {
  for (const k of Object.keys(defaults)) {
    const dv = defaults[k];
    if (target[k] === undefined) target[k] = structuredClone(dv);
    else if (dv && typeof dv === 'object' && !Array.isArray(dv) && target[k] && typeof target[k] === 'object') fillDefaults(target[k], dv);
  }
  return target;
}

export const fmtInt = (n) => Math.floor(n).toLocaleString('en-US');
export const fmtTime = (s) => {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};
