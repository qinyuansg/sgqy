// ─────────────────────────────────────────────────────────────
// CUBE DASH — persistent player profile (localStorage, never throws)
//
//   save.profile            the live profile object (mutate freely)
//   save.ensure(defaults)   modules add their own default fields
//   save.commit()           debounced write (call after any change)
//   save.flush()            immediate write (page hide / results)
//   save.reset()            wipe progress (settings kept)
//   save.exportCode()       portable text code (copy to another device)
//   save.importCode(code)   → {ok, profile?} validate + apply
// ─────────────────────────────────────────────────────────────
import { storage, fillDefaults, dayKey } from './core.js';

export const SAVE_KEY = 'cubedash.profile.v1';
const BAK_KEY = SAVE_KEY + '.bak';

// tiny checksum so a corrupted slot is detected and the backup is used instead
function checksum(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
function wrap(profile) { const data = JSON.stringify(profile); return JSON.stringify({ c: checksum(data), t: Date.now(), data }); }
function unwrap(raw) {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (o && typeof o.data === 'string') {
      if (checksum(o.data) !== o.c) return null;
      return { t: o.t || 0, profile: JSON.parse(o.data) };
    }
    if (o && typeof o === 'object') return { t: 0, profile: o };   // legacy plain JSON
  } catch { /* corrupted */ }
  return null;
}
const b64e = (str) => btoa(unescape(encodeURIComponent(str)));
const b64d = (str) => decodeURIComponent(escape(atob(str)));

const CORE_DEFAULTS = {
  v: 1,
  created: '',
  settings: {
    lang: '',          // '' = auto-detect on first boot
    music: 0.7,
    sfx: 0.9,
    shake: 1,          // camera shake multiplier (0 = off)
    haptics: true,
    assist: false,     // Helper mode: +50% hearts, slower enemies, auto-aim dash
    reduceFlash: false,
    breakReminder: true,
    quality: 'auto',   // 'auto' | 'high' | 'low'
  },
  stats: {
    runs: 0, wins: 0, playSeconds: 0,
    smashes: 0, perfects: 0, nearMisses: 0, bonks: 0, novas: 0,
    bossKills: 0, deaths: 0, bestCombo: 0, crystals: 0, freed: 0,
  },
  tutorialDone: false,
};

export class Save {
  constructor() {
    // newest valid of main / backup slot
    const a = unwrap(storage.get(SAVE_KEY, null)), b = unwrap(storage.get(BAK_KEY, null));
    const best = a && b ? (b.t > a.t ? b : a) : a || b;
    let p = best?.profile;
    if (!p || typeof p !== 'object') p = {};
    this._writes = 0;
    this.profile = fillDefaults(p, CORE_DEFAULTS);
    if (!this.profile.created) this.profile.created = dayKey();
    this._t = null;
    this.persistent = storage.set(SAVE_KEY + '.probe', '1');
    storage.remove(SAVE_KEY + '.probe');
    window.addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
  }
  ensure(defaults) { fillDefaults(this.profile, defaults); return this.profile; }
  commit() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 250);
  }
  flush() {
    clearTimeout(this._t);
    const w = wrap(this.profile);
    storage.set(SAVE_KEY, w);
    if (this._writes++ % 4 === 0) storage.set(BAK_KEY, w);   // rolling backup slot
  }
  exportCode() {
    const data = JSON.stringify(this.profile);
    return 'CD1.' + checksum(data) + '.' + b64e(data);
  }
  importCode(code) {
    try {
      const [tag, c, body] = String(code).trim().split('.');
      if (tag !== 'CD1') return { ok: false };
      const data = b64d(body);
      if (checksum(data) !== c) return { ok: false };
      const p = JSON.parse(data);
      if (!p || typeof p !== 'object') return { ok: false };
      this.profile = fillDefaults(p, CORE_DEFAULTS);
      this._resetHooks?.forEach((fn) => fn(this.profile));
      this.flush(); storage.set(BAK_KEY, wrap(this.profile));
      return { ok: true, profile: this.profile };
    } catch { return { ok: false }; }
  }
  reset() {
    const settings = this.profile.settings;
    storage.remove(SAVE_KEY); storage.remove(BAK_KEY);
    this.profile = fillDefaults({ settings }, CORE_DEFAULTS);
    this.profile.created = dayKey();
    this._resetHooks?.forEach((fn) => fn(this.profile));
    this.flush();
  }
  /** modules that ensure() defaults should re-run them after reset */
  onReset(fn) { (this._resetHooks ||= []).push(fn); }
}
