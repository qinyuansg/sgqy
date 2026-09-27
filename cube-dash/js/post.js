// ─────────────────────────────────────────────────────────────
// CUBE DASH — POST-PROCESSING (G.post)
//
//   post.render(rdt)            replaces renderer.render() (main loop)
//   post.setSize(w, h)          CSS px (main calls on resize)
//   post.setQuality(q)          'high' | 'low' | 'auto'
//   post.pulse({chroma, flash, flashColor, vignette, duration, edge, edgeColor, desat, bloom})
//   post.setGrade({saturation, contrast, tint, bloom})    per world (world.load calls it)
//   post.setDanger(0..1)        soft PINK heartbeat edge when on the last heart (never red)
//
// Pipeline: RenderPass → UnrealBloomPass (threshold 1.0 on the HDR buffer, so
// only emissive strips / glows bloom — the light play floor never does) →
// ONE "FinalGrade" ShaderPass (tint · saturation · contrast · vignette ·
// danger edge · edge pulses · flash · capped chromatic aberration) → OutputPass
// (ACES tone mapping + sRGB).
//
// Comfort caps (DESIGN_BRIEF §7.25): CA ≤ 0.003 UV for ≤ 0.25 s and only on
// heart loss / nova; ≤ 3 full-screen flashes per second (extra ones become edge
// pulses); "reduceFlash" → CA 0, bloom ×0.6, flashes become edge pulses.
//
// Quality: 4 tiers (min / low / med / high). G.quality 'low' starts on 'low'.
// With settings.quality 'auto' an auto-scaler drops a tier when the median
// frame time of two consecutive 90-frame windows is slower than 45 fps.
// 'min' renders without a composer (CSS overlay for vignette / danger / flash).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, damp } from './core.js';

const TUNE = {
  bloom: { strength: 0.55, radius: 0.28, threshold: 1.0 },
  vignette: 0.2,
  caMax: 0.003, caTime: 0.25,
  flashMax: 0.35, flashPerSec: 3,
  danger: { color: 0xff6b9a, amount: 0.42, hz: 1.2 },
  levels: [
    { name: 'min', dpr: 1.0, composer: false, bloomRes: 0, msaa: 0 },
    { name: 'low', dpr: 1.0, composer: true, bloomRes: 0.5, msaa: 0 },
    { name: 'med', dpr: 1.5, composer: true, bloomRes: 0.75, msaa: 0 },
    { name: 'high', dpr: 2.0, composer: true, bloomRes: 1, msaa: 4 },
  ],
  auto: { window: 90, slowMs: 22.2, strikes: 2, warmup: 2.5 },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCA: { value: 0 }, uVig: { value: TUNE.vignette }, uEdge: { value: 0 }, uFlash: { value: 0 },
    uSat: { value: 1.1 }, uContrast: { value: 1.04 }, uDesat: { value: 0 }, uDanger: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) }, uEdgeCol: { value: new THREE.Color(1, 1, 1) },
    uFlashCol: { value: new THREE.Color(1, 1, 1) }, uDangerCol: { value: new THREE.Color(TUNE.danger.color) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uCA, uVig, uEdge, uFlash, uSat, uContrast, uDesat, uDanger;
    uniform vec3 uTint, uEdgeCol, uFlashCol, uDangerCol;
    varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      if (uCA > 0.0) {                       // radial, max offset uCA at the corners
        vec2 off = d * (uCA * 1.4142);
        c.r = texture2D(tDiffuse, vUv + off).r;
        c.b = texture2D(tDiffuse, vUv - off).b;
      }
      vec3 col = c.rgb * uTint;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(l), col, uSat * (1.0 - uDesat)), 0.0);
      col = 0.18 * pow(col / 0.18 + 1e-5, vec3(uContrast));     // contrast around linear mid-grey
      float r = length(d) * 1.41421;                             // 0 centre … 1 corners
      col *= 1.0 - uVig * smoothstep(0.35, 1.15, r);
      float edge = smoothstep(0.42, 1.05, r);
      col = mix(col, uDangerCol, edge * uDanger);
      col = mix(col, uEdgeCol, edge * uEdge);
      col = mix(col, uFlashCol, uFlash);
      gl_FragColor = vec4(col, c.a);
    }`,
};

/** one decaying pulse channel (peak · (1 − t/dur)²) */
class Pulse {
  constructor() { this.peak = 0; this.t = 0; this.dur = 1; this.color = new THREE.Color(1, 1, 1); }
  get value() { const k = clamp(this.t / this.dur, 0, 1); return this.peak * (1 - k) * (1 - k); }
  fire(peak, dur, color) {
    if (!(peak > 0)) return;
    if (peak >= this.value) { this.peak = peak; this.t = 0; this.dur = Math.max(0.03, dur); if (color !== undefined) this.color.set(color); }
  }
  tick(dt) { this.t += dt; }
  reset() { this.peak = 0; this.t = 0; }
}

export class Post {
  constructor(G) {
    this.G = G;
    this.renderer = G.renderer;
    this.scene = G.scene;
    this.camera = G.camera;
    const q = G.save?.profile?.settings?.quality;
    this.autoScale = !q || q === 'auto';
    this.tier = G.quality === 'low' ? 1 : 3;
    if (q === 'high') this.tier = 3;
    if (q === 'low') this.tier = 1;
    this.composer = null;
    this.bloom = null;
    this.grade = null;
    this._bloomRes = 1;
    this._w = window.innerWidth; this._h = window.innerHeight;

    // grade state
    this._gradeBase = { saturation: 1.1, contrast: 1.04, tint: new THREE.Color(1, 1, 1), bloom: 1 };
    this._feverSat = 0; this._fever = false;
    this._dangerExt = 0; this._dangerAuto = 0; this._danger = 0; this._hb = 0;
    this.ca = new Pulse(); this.flash = new Pulse(); this.edge = new Pulse();
    this.vig = new Pulse(); this.desat = new Pulse(); this.bloomP = new Pulse();
    this._pulses = [this.ca, this.flash, this.edge, this.vig, this.desat, this.bloomP];
    this._flashTimes = [-9, -9, -9];
    this._now = 0;

    // auto-scaler
    this._ft = new Float32Array(TUNE.auto.window);
    this._fi = 0; this._strikes = 0; this._warm = TUNE.auto.warmup;

    this._applyTier(true);

    // ---- bus
    const bus = G.bus;
    this._offs = [
      bus.on('player:hurt', (p) => {
        this.pulse({ chroma: TUNE.caMax, duration: 0.22 });
        this.edge.fire(0.42, 0.5, 0xff6b9a);
        if (p && p.hp !== undefined) this._dangerAuto = p.hp <= 1 && p.hp > 0 ? 1 : 0;
      }),
      bus.on('player:perfect', () => {
        this.pulse({ flash: 0.09, flashColor: 0xfff4d6, duration: 0.16 });
        this.desat.fire(0.3, 0.5);                                // brief "witch-time" beat
        this.edge.fire(0.24, 0.45, 0x7ff6ff);
      }),
      bus.on('nova', (p) => {
        this.pulse({ chroma: TUNE.caMax, duration: 0.25 });
        this.pulse({ flash: 0.22, flashColor: p?.color ?? 0xbff3ff, duration: 0.3 });
        this.bloomP.fire(0.9, 0.9);
      }),
      bus.on('player:shieldBlock', () => this.edge.fire(0.3, 0.4, 0x7ff6ff)),
      bus.on('boss:defeat', () => { this.pulse({ flash: 0.25, flashColor: 0xffffff, duration: 0.35 }); this.bloomP.fire(0.6, 1.2); }),
      bus.on('player:lowHp', () => { this._dangerAuto = 1; }),
      bus.on('player:heal', (p) => { if (p && p.hp !== undefined) this._dangerAuto = p.hp <= 1 ? 1 : 0; }),
      bus.on('player:revive', () => { this._dangerAuto = 0; }),
      bus.on('player:death', () => { this._dangerAuto = 0; }),
      bus.on('run:start', () => { this._dangerAuto = 0; this._dangerExt = 0; this._fever = false; }),
      bus.on('run:end', () => { this._dangerAuto = 0; this._dangerExt = 0; this._fever = false; }),
      bus.on('fever', () => { this._fever = true; }),
      bus.on('settings:change', (p) => {
        if (p?.key === 'quality') this.setQuality(p.value);
      }),
    ];
  }

  // ============================================================
  // public API
  // ============================================================
  render(rdt = 1 / 60) {
    this._now += rdt;
    this._tick(rdt);
    this._autoScale(rdt);
    if (this.composer) this.composer.render(rdt);
    else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      this._overlayUpdate();
    }
  }

  setSize(w, h) {
    this._w = w; this._h = h;
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
  }

  setQuality(q) {
    if (q === 'auto') { this.autoScale = true; return; }
    this.autoScale = false;
    const t = q === 'low' ? 1 : q === 'min' ? 0 : q === 'med' ? 2 : 3;
    if (t !== this.tier) { this.tier = t; this._applyTier(); }
  }

  /** flash / chroma / vignette pulse. All values are capped (comfort) and reduceFlash-aware. */
  pulse(o = {}) {
    const reduce = !!this.G.save?.profile?.settings?.reduceFlash;
    const dur = o.duration ?? 0.3;
    // chroma: UV offset (≤ caMax) — values > 0.01 are read as a 0..1 intensity. Always capped (§7.25).
    if (o.chroma && !reduce) this.ca.fire(o.chroma > 0.01 ? Math.min(1, o.chroma) * TUNE.caMax : Math.min(o.chroma, TUNE.caMax), Math.min(dur, TUNE.caTime));
    if (o.flash) {
      const a = Math.min(o.flash, TUNE.flashMax);
      const now = this._now;
      const tooMany = now - this._flashTimes[0] < 1;      // governor: ≤ 3 full-screen flashes / s
      if (reduce || tooMany) this.edge.fire(a * 1.4, Math.max(dur, 0.3), o.flashColor ?? 0xffffff);
      else {
        this.flash.fire(a, dur, o.flashColor ?? 0xffffff);
        this._flashTimes.shift(); this._flashTimes.push(now);
      }
    }
    if (o.vignette) this.vig.fire(clamp(o.vignette, 0, 0.6), dur);
    if (o.edge) this.edge.fire(clamp(o.edge, 0, 0.6), dur, o.edgeColor ?? o.flashColor ?? 0xffffff);
    if (o.desat) this.desat.fire(clamp(o.desat, 0, 0.8), dur);
    if (o.bloom) this.bloomP.fire(clamp(o.bloom, 0, 1.5), dur);
  }

  setGrade(g = {}) {
    const b = this._gradeBase;
    if (g.saturation !== undefined) b.saturation = g.saturation;
    if (g.contrast !== undefined) b.contrast = g.contrast;
    if (g.tint !== undefined) b.tint.set(g.tint);
    if (g.bloom !== undefined) b.bloom = g.bloom;
  }

  setDanger(v) { this._dangerExt = clamp(v || 0, 0, 1); }

  dispose() {
    this._offs?.forEach((f) => f());
    this._disposeComposer();
    this._overlay?.remove();
  }

  // ============================================================
  // internals
  // ============================================================
  _tick(rdt) {
    for (let i = 0; i < this._pulses.length; i++) this._pulses[i].tick(rdt);
    const reduce = !!this.G.save?.profile?.settings?.reduceFlash;
    if (!this.G.run) this._dangerAuto = 0;
    const want = Math.max(this._dangerExt, this._dangerAuto);
    this._danger = damp(this._danger, want, 3, rdt);
    // heartbeat: lub-dub at ~1.2 Hz (slow, low amplitude — never a strobe)
    this._hb += rdt * TUNE.danger.hz;
    const ph = this._hb % 1;
    const beat = Math.max(Math.exp(-(((ph - 0.05) / 0.09) ** 2)), 0.65 * Math.exp(-(((ph - 0.3) / 0.09) ** 2)));
    this._dangerOut = this._danger * TUNE.danger.amount * (0.55 + 0.45 * beat);
    this._feverSat = damp(this._feverSat, this._fever ? 0.08 : 0, 2, rdt);

    if (!this.grade) return;
    const u = this.grade.uniforms, b = this._gradeBase;
    u.uCA.value = reduce ? 0 : this.ca.value;
    u.uFlash.value = this.flash.value;
    u.uFlashCol.value.copy(this.flash.color);
    u.uEdge.value = this.edge.value;
    u.uEdgeCol.value.copy(this.edge.color);
    u.uVig.value = TUNE.vignette + this.vig.value;
    u.uDesat.value = this.desat.value;
    u.uDanger.value = this._dangerOut;
    u.uSat.value = b.saturation + this._feverSat;
    u.uContrast.value = b.contrast;
    u.uTint.value.copy(b.tint);
    if (this.bloom) {
      const s = TUNE.bloom.strength * b.bloom * (reduce ? 0.6 : 1) * (1 + this.bloomP.value);
      this.bloom.strength = s;
      this.bloom.enabled = s > 0.01;
    }
  }

  _applyTier(first = false) {
    const L = TUNE.levels[this.tier];
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, L.dpr));
    r.setSize(this._w, this._h, false);
    this._disposeComposer();
    if (L.composer) {
      this._buildComposer(L);
      if (this._overlay) this._overlay.style.display = 'none';
    } else {
      this._ensureOverlay();
      this._overlay.style.display = 'block';
    }
    this._fi = 0; this._strikes = 0; this._warm = TUNE.auto.warmup;
    if (!first) this.G.bus.emit('post:quality', { tier: this.tier, name: L.name });
    this.levelName = L.name;
  }

  _buildComposer(L) {
    const r = this.renderer;
    const pr = r.getPixelRatio();
    const w = this._w, h = this._h;
    const samples = L.msaa && r.capabilities.isWebGL2 ? L.msaa : 0;
    const rt = new THREE.WebGLRenderTarget(Math.max(1, w * pr), Math.max(1, h * pr), { type: THREE.HalfFloatType, samples });
    rt.texture.name = 'Post.rt1';
    const composer = new EffectComposer(r, rt);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this._bloomRes = L.bloomRes;
    const bloom = new UnrealBloomPass(new THREE.Vector2(Math.max(1, w * L.bloomRes), Math.max(1, h * L.bloomRes)), TUNE.bloom.strength, TUNE.bloom.radius, TUNE.bloom.threshold);
    const baseSetSize = bloom.setSize.bind(bloom);
    bloom.setSize = (x, y) => baseSetSize(Math.max(1, Math.round(x * this._bloomRes)), Math.max(1, Math.round(y * this._bloomRes)));
    composer.addPass(bloom);
    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    composer.addPass(new OutputPass());
    composer.setSize(w, h);
    this.composer = composer; this.bloom = bloom; this.grade = grade;
  }

  _disposeComposer() {
    if (!this.composer) return;
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.composer = null; this.bloom = null; this.grade = null;
  }

  _autoScale(rdt) {
    if (!this.autoScale || this.tier <= 0 || document.hidden || !(rdt > 0)) return;
    if (this._warm > 0) { this._warm -= rdt; return; }
    this._ft[this._fi++] = rdt * 1000;
    if (this._fi < this._ft.length) return;
    this._fi = 0;
    const med = Float32Array.from(this._ft).sort()[this._ft.length >> 1];
    this.lastMedianMs = med;
    if (med > TUNE.auto.slowMs) {
      if (++this._strikes >= TUNE.auto.strikes) {
        this.tier--;
        this._applyTier();
      }
    } else this._strikes = 0;
  }

  // ---------- 'min' tier: DOM overlay instead of the grade pass ----------
  _ensureOverlay() {
    if (this._overlay) return;
    const el = document.createElement('div');
    el.id = 'postOverlay';
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
    const layer = (bg) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;inset:0;opacity:0;background:${bg};`; el.appendChild(d); return d; };
    this._ovVig = layer('radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(30,20,60,0.32) 100%)');
    this._ovVig.style.opacity = '1';
    this._ovDanger = layer('radial-gradient(ellipse at center, rgba(255,107,154,0) 45%, rgba(255,107,154,0.85) 100%)');
    this._ovEdge = layer('radial-gradient(ellipse at center, rgba(255,255,255,0) 45%, rgba(255,255,255,0.9) 100%)');
    this._ovFlash = layer('#fff');
    const canvas = this.renderer.domElement;
    if (canvas.parentNode) canvas.after(el); else document.body.appendChild(el);
    this._overlay = el;
    this._ovCache = {};
  }

  _overlayUpdate() {
    if (!this._overlay) return;
    const c = this._ovCache;
    const set = (key, el, v, color) => {
      const q = Math.round(v * 100);
      if (c[key] !== q) { el.style.opacity = String(q / 100); c[key] = q; }
      if (color !== undefined && c[key + 'c'] !== color) {
        const css = '#' + color.toString(16).padStart(6, '0');
        el.style.background = key === 'flash' ? css : `radial-gradient(ellipse at center, rgba(255,255,255,0) 45%, ${css} 100%)`;
        c[key + 'c'] = color;
      }
    };
    set('danger', this._ovDanger, this._dangerOut || 0);
    set('edge', this._ovEdge, this.edge.value, this.edge.color.getHex());
    set('flash', this._ovFlash, this.flash.value, this.flash.color.getHex());
  }
}
