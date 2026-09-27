// ─────────────────────────────────────────────────────────────
// CUBE DASH — CAMERA DIRECTOR (G.cam)
//
//   cam.update(rdt)                    once per frame (real time)
//   cam.follow(target)                 {x, z, vx?, vz?} (run.player) · null = arena centre
//   cam.setHub(on, target)             Brawl-Stars-style close hero framing for menus
//   cam.shake(intensity 0..1, seconds) trauma model (comfort-capped)
//   cam.kick(amount)                   zoom punch, + = in (≤ 5 % FOV)
//   cam.cinematic(name, opts) → Promise   'intro' | 'boss' | 'victory' | 'defeat' | 'nova' | 'phase'
//   cam.skipCinematic()   cam.inCinematic
//   cam.worldToScreen(x, y, z, out?) → {x, y, visible}   CSS px
//
// Gameplay framing: fixed 3/4 top-down (pitch 55°, camera on +Z looking −Z),
// NEVER rotated while the player has control. Distance is solved from the
// viewport so the whole arena fits on desktop; small screens zoom in to keep
// the 1-u hero ≥ TUNE.minPxPerU and follow with a dead-zone + look-ahead.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clamp, lerp, damp, easeInOutCubic, easeOutCubic, TAU } from './core.js';

const TUNE = {
  pitch: 55,                  // deg below horizontal
  fovWide: 40,                // vertical FOV on landscape screens
  fovTall: 46,                // … on portrait screens
  rimOut: 1.15,               // rim blocks outside arenaRadius
  fitMargin: 0.55,            // extra world units kept visible around the rim
  slack: 0.8,                 // desktop: focus may drift this far toward the hero (arena stays in view)
  minPxPerU: 26,              // phones: the hero never renders smaller than this (CSS px per unit)
  followK: 0.3,               // desktop drift factor (hero offset → focus)
  lookAhead: 0.22, lookAheadMax: 1.5,
  deadZone: 0.14,             // fraction of the visible half-span
  touchBias: 0.06,            // touch: hero sits below the centre by this fraction of the vertical span
  posRate: 6, posRateDash: 3,
  shake: { max: 0.35, amp: 0.5, pow: 1.6, roll: 1.2, decay: 1.8, freq: 17 },
  kick: { k: 180, c: 18, max: 0.05 },
  dashFov: { add: 3, up: 0.07, down: 0.32 },
  hub: { dist: 7.6, height: 1.2, lookY: 0.5, fov: 38, tallDist: 9.5, tallLookY: 0.1, yaw: 0.07, hz: 0.045 },   // height / lookY = offsets above the hub target
  skipAfter: 0.5,
  dur: { intro: 2.5, introShort: 1.4, boss: 3.0, bossShort: 1.5, victory: 3.8, defeat: 2.2, nova: 1.2, phase: 1.2 },
};

const D2R = Math.PI / 180;
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _proj = new THREE.Vector3();

function makePose() { return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, roll: 0 }; }
function copyPose(o, p) { o.pos.copy(p.pos); o.look.copy(p.look); o.fov = p.fov; o.roll = p.roll; return o; }
function lerpPose(o, a, b, t) {
  o.pos.lerpVectors(a.pos, b.pos, t); o.look.lerpVectors(a.look, b.look, t);
  o.fov = lerp(a.fov, b.fov, t); o.roll = lerp(a.roll, b.roll, t); return o;
}
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutPow = (t, p) => 1 - Math.pow(1 - clamp(t, 0, 1), p);

export class CameraDirector {
  constructor(G) {
    this.G = G;
    this.cam = G.camera;
    this.target = null;
    this.hub = false;
    this.hubTarget = new THREE.Vector3(0, 0.8, 0);
    this.inCinematic = false;
    this.mode = 'game';           // 'game' | 'hub' | 'hold' (after victory/defeat)

    this.focus = new THREE.Vector3();         // smoothed gameplay focus on the ground
    this._la = new THREE.Vector2();           // smoothed look-ahead
    this._rig = null;
    this._rigKey = '';

    this.pose = makePose();                   // base pose this frame (before shake / kicks)
    this._game = makePose();
    this._tmp = makePose();
    this._last = makePose();                  // last applied base pose (blend source)
    this._blend = { t: 1, dur: 0, from: makePose() };
    this._hold = { center: new THREE.Vector3(), radius: 7, height: 3.2, angle: 0, speed: 0.1, fov: 40, lookY: 0.9, pushT: 0 };

    this._cine = null;
    this.trauma = 0;
    this._sustain = 0;
    this._shakeT = 0;
    this._kick = { x: 0, v: 0 };
    this._dashT = 99;
    this._looseT = 0;
    this._tap = false;
    this._hubT = 0;
    this._inited = false;
    this._shakeOff = new THREE.Vector3();
    this._shakeRoll = 0;

    const bus = G.bus;
    this._offs = [
      bus.on('player:dash', () => { this._dashT = 0; this._looseT = 0.15; }),
      bus.on('nova', () => { this.cinematic('nova'); }),
      bus.on('boss:intro', (p) => { this.cinematic('boss', p || {}); }),
      bus.on('boss:phase', () => { this.cinematic('phase'); }),
    ];
    this._onTap = () => { this._tap = true; };
    window.addEventListener('pointerdown', this._onTap, { passive: true });
  }

  // ============================================================
  // public API
  // ============================================================
  follow(target) {
    const wasGame = this.mode === 'game' && !this.hub;
    this.target = target || null;
    if (this.mode === 'hold' || this.hub) { this.hub = false; this.mode = 'game'; }
    if (!wasGame) this._startBlend(0.8);
    if (target) this._snapFocusIfFar();
  }

  setHub(on, target) {
    if (target) this.hubTarget.set(target.x ?? 0, target.y ?? 0.8, target.z ?? 0);
    const was = this.hub;
    this.hub = !!on;
    this.mode = on ? 'hub' : 'game';
    if (was !== this.hub) this._startBlend(on ? 1.0 : 0.8);
  }

  shake(intensity = 0.3, seconds = 0) {
    this.trauma = clamp(this.trauma + Math.max(0, intensity), 0, 1);
    if (seconds > 0) { this._sustain = Math.max(this._sustain, seconds); this._sustainLvl = Math.max(this._sustainLvl || 0, intensity * 0.6); }
  }

  kick(amount = 0.03) {
    this._kick.v += clamp(amount, -0.1, 0.1) * 28;
  }

  /** @returns {Promise<void>} resolves when the shot ends (or is skipped) */
  cinematic(name, opts = {}) {
    // de-dupe: e.g. boss.js awaits cinematic('boss') while the bus listener also fires it
    if (this._cine && this._cine.name === name && this._cine.t < 0.35) return this._cine.promise;
    if (this._cine) this._endCine(false);
    const G = this.G;
    const short = !!opts.short;
    const c = { name, opts, t: 0, dur: 1, overlay: false, endMode: 'game', skipAt: TUNE.skipAfter, start: makePose(), promise: null, resolve: null };
    copyPose(c.start, this._current());
    switch (name) {
      case 'intro': c.dur = short ? TUNE.dur.introShort : TUNE.dur.intro; c.short = short; this._buildIntro(c); break;
      case 'boss': c.dur = short ? TUNE.dur.bossShort : TUNE.dur.boss; c.short = short; c.bx = opts.x ?? G.run?.boss?.x ?? 0; c.bz = opts.z ?? G.run?.boss?.z ?? -3; break;
      case 'victory': c.dur = TUNE.dur.victory; c.endMode = 'hold'; c.skipAt = 1.2; this._buildOrbit(c, opts); break;
      case 'defeat': c.dur = TUNE.dur.defeat; c.endMode = 'hold'; this._buildDefeat(c, opts); break;
      case 'nova': c.dur = TUNE.dur.nova; c.overlay = true; break;
      case 'phase': c.dur = TUNE.dur.phase; c.overlay = true; c.bx = opts.x ?? G.run?.boss?.x ?? 0; c.bz = opts.z ?? G.run?.boss?.z ?? 0; break;
      default: c.dur = 0.01;
    }
    c.promise = new Promise((res) => { c.resolve = res; });
    this._cine = c;
    this.inCinematic = true;
    if (!c.overlay) { this.hub = false; this._blend.t = 1; }   // the shot defines its own start
    G.bus.emit('cine:start', { name, overlay: c.overlay });   // overlay: short in-play shot (nova / phase) — HUD may stay
    return c.promise;
  }

  skipCinematic() {
    const c = this._cine;
    if (!c) return;
    this._endCine(true);
  }

  worldToScreen(x, y, z, out) {
    const o = out || { x: 0, y: 0, visible: false };
    const el = this.G.renderer.domElement;
    const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
    _proj.set(x, y, z).project(this.cam);
    o.x = (_proj.x * 0.5 + 0.5) * w;
    o.y = (-_proj.y * 0.5 + 0.5) * h;
    o.visible = _proj.z > -1 && _proj.z < 1 && Math.abs(_proj.x) <= 1.02 && Math.abs(_proj.y) <= 1.02;
    return o;
  }

  /** visible arena framing info (for HUD edge arrows etc.) */
  get framing() { return this._rig; }

  // ============================================================
  // frame update
  // ============================================================
  update(rdt) {
    const G = this.G;
    this._syncAspect();
    this._solveRig();
    const settings = G.save?.profile?.settings || {};
    const reduce = !!settings.reduceFlash;

    // --- skip input
    const c = this._cine;
    if (c && c.t >= c.skipAt) {
      const inp = G.input;
      if (this._tap || inp?.pressed?.('confirm') || inp?.pressed?.('dash')) this.skipCinematic();
    }
    this._tap = false;

    // --- gameplay focus (always tracked so cinematics can end on it)
    this._updateFocus(rdt);
    this._gamePose(this._game);

    // --- base pose by mode
    const P = this.pose;
    if (this._cine) {
      const cc = this._cine;
      cc.t += rdt;
      const k = clamp(cc.t / cc.dur, 0, 1);
      this._cinePose(cc, k, P);
      if (cc.t >= cc.dur) this._endCine(false);
    } else if (this.mode === 'hub') {
      this._hubPose(P, rdt);
    } else if (this.mode === 'hold') {
      this._holdPose(P, rdt);
    } else {
      copyPose(P, this._game);
    }
    // blend from the previous shot after a mode change / skip
    if (this._blend.t < 1) {
      this._blend.t = Math.min(1, this._blend.t + rdt / Math.max(0.01, this._blend.dur));
      lerpPose(P, this._blend.from, P, easeInOutCubic(this._blend.t));
    }
    copyPose(this._last, P);
    this._everUpdated = true;

    // --- juice: dash FOV kick, zoom punch, trauma shake (comfort caps)
    this._dashT += rdt;
    let fovAdd = 0;
    if (this.mode === 'game' && !this._cine) {
      const d = TUNE.dashFov, t = this._dashT;
      const amp = Math.min(d.add, P.fov * 0.05) * (reduce ? 0.5 : 1);
      if (t < d.up) fovAdd = amp * easeOutCubic(t / d.up);
      else if (t < d.up + d.down) fovAdd = amp * (1 - easeOutCubic((t - d.up) / d.down));
    }
    const K = TUNE.kick;
    const ka = -K.k * this._kick.x - K.c * this._kick.v;
    this._kick.v += ka * rdt;
    this._kick.x = clamp(this._kick.x + this._kick.v * rdt, -K.max, K.max);
    let fov = P.fov * (1 - this._kick.x) + fovAdd;
    fov = clamp(fov, P.fov * 0.95, P.fov * 1.05 + 0.001);

    // trauma
    if (this._sustain > 0) { this._sustain -= rdt; this.trauma = Math.max(this.trauma, this._sustainLvl || 0); }
    else this._sustainLvl = 0;
    this.trauma = Math.max(0, this.trauma - TUNE.shake.decay * rdt);
    const mult = (settings.shake ?? 1) * (reduce ? 0.3 : 1);
    this._shakeT += rdt;
    const S = TUNE.shake;
    const amt = Math.min(S.max, S.amp * Math.pow(this.trauma, S.pow)) * mult;

    // --- apply
    const cam = this.cam;
    cam.position.copy(P.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(P.look);
    if (amt > 1e-4) {
      const t = this._shakeT * S.freq;
      const nx = Math.sin(t * 1.0 + 1.3) * 0.55 + Math.sin(t * 2.31 + 0.2) * 0.3 + Math.sin(t * 4.13 + 2.9) * 0.15;
      const ny = Math.sin(t * 1.17 + 4.1) * 0.55 + Math.sin(t * 2.07 + 1.7) * 0.3 + Math.sin(t * 3.91 + 0.6) * 0.15;
      _right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      _up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      cam.position.addScaledVector(_right, nx * amt).addScaledVector(_up, ny * amt);
    }
    const roll = P.roll + (reduce ? 0 : Math.sin(this._shakeT * S.freq * 0.9 + 0.7) * S.roll * D2R * Math.pow(this.trauma, 2) * mult);
    if (roll) cam.rotateZ(roll);
    if (Math.abs(cam.fov - fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }

  // ============================================================
  // framing solve (on resize / arena radius change)
  // ============================================================
  _syncAspect() {
    const el = this.G.renderer.domElement;
    const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
    const a = w / Math.max(1, h);
    if (Math.abs(this.cam.aspect - a) > 1e-4) { this.cam.aspect = a; this.cam.updateProjectionMatrix(); }
    this._vw = w; this._vh = h;
  }

  _solveRig() {
    const W = this._vw, H = this._vh;
    const R = this.G.world?.arenaRadius ?? 11;
    const touch = this.G.input?.device === 'touch';
    const key = `${W}x${H}|${R.toFixed(2)}|${touch}`;
    if (key === this._rigKey) return;
    this._rigKey = key;
    const aspect = W / Math.max(1, H);
    const p = TUNE.pitch * D2R;
    const fov = aspect >= 1 ? TUNE.fovWide : lerp(TUNE.fovTall, TUNE.fovWide, clamp((aspect - 0.5) / 0.5, 0, 1));
    const f = (fov * D2R) / 2, tf = Math.tan(f);
    const sp = Math.sin(p), cp = Math.cos(p);
    // ground span per unit distance (camera looking at the focus point)
    const kNear = cp - sp / Math.tan(p + f);
    const kFar = p - f > 0.05 ? sp / Math.tan(p - f) - cp : 50;
    const kX = tf * aspect;
    const RfFit = R + TUNE.rimOut + TUNE.fitMargin + TUNE.slack;
    // focus offset that centres the ground span [−Rf, Rf] symmetrically ON SCREEN (perspective-aware):
    // ndcY(w) = −w·sinp / ((d − w·cosp)·tanf) with w = z − fz  ⇒  cosp·fz² + d·fz − cosp·Rf² = 0
    const fzSym = (d, rf) => (-d + Math.sqrt(d * d + 4 * cp * cp * rf * rf)) / (2 * cp);
    let dFit = (2 * RfFit) / (kNear + kFar);
    for (let i = 0; i < 12; i++) {
      const fz = fzSym(dFit, RfFit);
      const dz = (RfFit - fz) * (sp / tf + cp);                 // near rim touches the bottom edge
      const dx = RfFit / kX - fz * cp;                          // widest row (arena centre) fits the width
      dFit = Math.max(dz, dx);
    }
    const pxAt = (d) => H / (2 * d * tf);
    let dist = dFit, fit = true;
    if (pxAt(dFit) < TUNE.minPxPerU) { dist = H / (2 * tf * TUNE.minPxPerU); fit = false; }
    const Rf = R + TUNE.rimOut + TUNE.fitMargin;
    this._rig = {
      dist, fov, fit, aspect, pitch: p,
      near: kNear * dist, far: kFar * dist, halfX: kX * dist,
      centreZ: fzSym(dist, Rf),
      Rf, R, touch, pxPerU: pxAt(dist),
    };
    if (!this._inited) { this._inited = true; this._snapFocus(); }
  }

  _updateFocus(rdt) {
    const rig = this._rig;
    if (!rig) return;
    const G = this.G;
    const tgt = this.target || (G.run?.player && !this.hub ? G.run.player : null);
    const hx = tgt ? (tgt.x || 0) : 0, hz = tgt ? (tgt.z || 0) : 0;
    // look-ahead toward movement
    const vx = tgt?.vx || 0, vz = tgt?.vz || 0;
    let lx = vx * TUNE.lookAhead, lz = vz * TUNE.lookAhead;
    const ll = Math.hypot(lx, lz);
    if (ll > TUNE.lookAheadMax) { lx *= TUNE.lookAheadMax / ll; lz *= TUNE.lookAheadMax / ll; }
    this._la.x = damp(this._la.x, lx, 4, rdt);
    this._la.y = damp(this._la.y, lz, 4, rdt);
    const ax = hx + this._la.x, az = hz + this._la.y;
    const F = this.focus;
    const Rf = rig.Rf;
    // --- X axis
    let fx;
    if (rig.halfX >= Rf) {
      const room = Math.min(TUNE.slack, rig.halfX - Rf + TUNE.slack * (rig.fit ? 1 : 0));
      fx = clamp(ax * TUNE.followK, -room, room);
    } else {
      const dz = TUNE.deadZone * rig.halfX;
      fx = F.x;
      if (ax > fx + dz) fx = ax - dz; else if (ax < fx - dz) fx = ax + dz;
      const lim = Rf - rig.halfX;
      fx = clamp(fx, -lim, lim);
    }
    // --- Z axis (asymmetric: 'far' up the screen, 'near' down)
    const span = rig.near + rig.far;
    const bias = rig.touch ? TUNE.touchBias * span : 0;
    let fz;
    if (span >= 2 * Rf) {
      const centre = rig.centreZ;                         // arena centred on screen
      const room = Math.min(TUNE.slack, (span - 2 * Rf) / 2 + TUNE.slack * (rig.fit ? 1 : 0));
      fz = centre + clamp(az * TUNE.followK - bias, -room, room);
    } else {
      const up = TUNE.deadZone * rig.far, down = TUNE.deadZone * rig.near;
      fz = F.z;
      const want = az - bias;
      if (want > fz + down) fz = want - down; else if (want < fz - up) fz = want + up;
      fz = clamp(fz, -Rf + rig.far, Rf - rig.near);
    }
    const rate = this._looseT > 0 ? TUNE.posRateDash : TUNE.posRate;
    this._looseT -= rdt;
    F.x = damp(F.x, fx, rate, rdt);
    F.z = damp(F.z, fz, rate, rdt);
    F.y = 0;
  }

  _snapFocus() {
    this.focus.set(0, 0, 0);
    const rig = this._rig;
    if (rig && rig.near + rig.far >= 2 * rig.Rf) this.focus.z = rig.centreZ;
  }

  _snapFocusIfFar() {
    const t = this.target, rig = this._rig;
    if (!t || !rig) return;
    if (Math.abs(t.x - this.focus.x) > rig.halfX || Math.abs(t.z - this.focus.z) > rig.far) {
      this.focus.x = clamp(t.x, -rig.Rf, rig.Rf); this.focus.z = clamp(t.z, -rig.Rf, rig.Rf);
    }
  }

  _gamePose(o) {
    const rig = this._rig;
    const F = this.focus;
    const d = rig ? rig.dist : 30, p = rig ? rig.pitch : TUNE.pitch * D2R;
    o.look.copy(F);
    o.pos.set(F.x, F.y + d * Math.sin(p), F.z + d * Math.cos(p));
    o.fov = rig ? rig.fov : TUNE.fovWide;
    o.roll = 0;
    return o;
  }

  _hubPose(o, rdt) {
    this._hubT += rdt;
    const t = this._hubT, H = TUNE.hub;
    const tall = (this._rig?.aspect ?? 1.6) < 1;
    const dist = tall ? H.tallDist : H.dist;
    const yaw = Math.sin(t * TAU * H.hz) * H.yaw;
    const T = this.hubTarget;
    o.pos.set(T.x + Math.sin(yaw) * dist, T.y + H.height + Math.sin(t * 0.37) * 0.08, T.z + Math.cos(yaw) * dist);
    o.look.set(T.x, T.y + (tall ? H.tallLookY : H.lookY) + Math.sin(t * 0.29) * 0.05, T.z);
    o.fov = tall ? H.fov + 10 : H.fov;
    o.roll = Math.sin(t * 0.23) * 0.004;
    return o;
  }

  _holdPose(o, rdt) {
    const h = this._hold;
    h.angle += h.speed * rdt;
    const c = h.center;
    o.pos.set(c.x + Math.sin(h.angle) * h.radius, h.height, c.z + Math.cos(h.angle) * h.radius);
    o.look.set(c.x, h.lookY, c.z);
    o.fov = h.fov; o.roll = 0;
    return o;
  }

  _current() {
    // the pose the camera shows right now (for blends / cinematic starts)
    if (!this._everUpdated) this._gamePose(this._last);
    return this._last;
  }

  _startBlend(dur) {
    if (!this._everUpdated) return;           // first frame after boot: snap, nothing to blend from
    copyPose(this._blend.from, this._current());
    this._blend.t = 0; this._blend.dur = dur;
  }

  _endCine(skipped) {
    const c = this._cine;
    if (!c) return;
    this._cine = null;
    this.inCinematic = false;
    if (c.endMode === 'hold') {
      this.mode = 'hold';
      if (skipped && c.name === 'victory') this._hold.angle = c.a0 + c.sweep;   // jump to the end of the orbit
    } else this.mode = this.hub ? 'hub' : 'game';
    if (skipped) this._startBlend(0.35);
    this.G.bus.emit('cine:end', { name: c.name, skipped: !!skipped, overlay: c.overlay });
    c.resolve?.();
  }

  // ============================================================
  // cinematic shots
  // ============================================================
  _cinePose(c, k, o) {
    const G = this._game;
    switch (c.name) {
      case 'intro': return this._introPose(c, k, o);
      case 'boss': return this._bossPose(c, k, o);
      case 'victory': return this._orbitPose(c, k, o);
      case 'defeat': return this._defeatPose(c, k, o);
      case 'nova': {
        // quick pull-out and punch back in (overlay on gameplay, no rotation)
        const t = c.t;
        let m;
        if (t < 0.3) m = 1 + 0.18 * easeOutCubic(t / 0.3);
        else if (t < 0.55) m = 1.18 - 0.24 * easeInOutCubic((t - 0.3) / 0.25);
        else m = 0.94 + 0.06 * easeInOutCubic(clamp((t - 0.55) / 0.65, 0, 1));
        copyPose(o, G);
        o.pos.sub(o.look).multiplyScalar(m).add(o.look);
        return o;
      }
      case 'phase': {
        const b = Math.sin(Math.PI * k);
        copyPose(o, G);
        _v.set(c.bx, 1.2, c.bz);
        o.look.lerp(_v, 0.3 * b);
        o.pos.sub(G.look).multiplyScalar(1 - 0.16 * b).add(o.look);
        return o;
      }
      default: return copyPose(o, G);
    }
  }

  _buildIntro(c) {
    const R = this.G.world?.arenaRadius ?? 11;
    const g = this._gamePose(makePose());
    if (c.short) {
      // swoop from wherever we are (hub close-up, results orbit …) to the gameplay framing
      const s = c.start;
      const mid = new THREE.Vector3().lerpVectors(s.pos, g.pos, 0.5).add(new THREE.Vector3(3, 5, 4));
      c.posCurve = new THREE.CatmullRomCurve3([s.pos.clone(), mid, g.pos.clone()], false, 'centripetal');
      c.lookCurve = new THREE.CatmullRomCurve3([s.look.clone(), new THREE.Vector3().lerpVectors(s.look, g.look, 0.6), g.look.clone()], false, 'centripetal');
      c.fovKeys = [s.fov, g.fov + 6, g.fov];
      c.rollKeys = [0, -5 * D2R, 0];
      return;
    }
    // full fly-in: look up at the sky (planet / rainbow) → tilt down and dive through the
    // high wisp layer → swoop into the gameplay framing (TUNE.dur.intro)
    c.posCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(26, 128, 175),
      new THREE.Vector3(16, 92, 118),
      new THREE.Vector3(6, 54, 62),
      new THREE.Vector3(g.pos.x + 3, g.pos.y + 9, g.pos.z + 12),
      g.pos.clone(),
    ], false, 'centripetal');
    c.lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-60, 190, -420),
      new THREE.Vector3(-8, 36, -80),
      new THREE.Vector3(0, 2, -6),
      new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), g.look, 0.7),
      g.look.clone(),
    ], false, 'centripetal');
    c.fovKeys = [50, 56, 64, g.fov + 5, g.fov];
    c.rollKeys = [-7 * D2R, -4 * D2R, 3 * D2R, -1.5 * D2R, 0];
  }

  _introPose(c, k, o) {
    const s = c.short ? easeOutPow(k, 2.2) : easeOutPow(k, 1.55);
    c.posCurve.getPoint(s, o.pos);        // per-control-point timing (not arc length): each beat of the shot gets equal time
    c.lookCurve.getPoint(s, o.look);
    o.fov = keys(c.fovKeys, s);
    o.roll = keys(c.rollKeys, s);
    // land exactly on the live gameplay framing
    if (k > 0.8) lerpPose(o, o, this._game, easeInOutCubic((k - 0.8) / 0.2));
    return o;
  }

  _bossPose(c, k, o) {
    const t = c.t, d = c.dur;
    const tA = c.short ? 0.3 : 0.5, tC = c.short ? 0.4 : 0.55;
    const bx = c.bx, bz = c.bz;
    // low-angle hero shot of the boss (3/4 from the camera side)
    _v.set(0.35, 0, 1).normalize();
    const shot = this._tmp;
    const push = clamp((t - tA) / Math.max(0.01, d - tA - tC), 0, 1);
    const dist = lerp(10.5, 7.2, easeInOutSine(push));
    shot.pos.set(bx + _v.x * dist, lerp(3.4, 2.8, push), bz + _v.z * dist);
    shot.look.set(bx, 2.3, bz);
    shot.fov = lerp(40, 33, push);
    shot.roll = lerp(0, 2.5 * D2R, push);
    if (t < tA) return lerpPose(o, c.start, shot, easeInOutCubic(t / tA));
    if (t > d - tC) return lerpPose(o, shot, this._game, easeInOutCubic((t - (d - tC)) / tC));
    return copyPose(o, shot);
  }

  _buildOrbit(c, opts) {
    const p = this.G.run?.player || this.target || { x: 0, z: 0 };
    c.cx = opts.x ?? p.x ?? 0; c.cz = opts.z ?? p.z ?? 0;
    const s = c.start;
    c.a0 = Math.atan2(s.pos.x - c.cx, s.pos.z - c.cz);
    c.sweep = 150 * D2R * (c.cx > 0 ? -1 : 1);
    Object.assign(this._hold, { radius: 7, height: 3.2, lookY: 0.9, fov: 38, speed: 0.1 * Math.sign(c.sweep) });
    this._hold.center.set(c.cx, 0, c.cz);
  }

  _orbitPose(c, k, o) {
    const h = this._hold;
    const a = c.a0 + c.sweep * easeInOutSine(k);
    h.angle = a;
    o.pos.set(c.cx + Math.sin(a) * h.radius, h.height, c.cz + Math.cos(a) * h.radius);
    o.look.set(c.cx, h.lookY, c.cz);
    o.fov = h.fov; o.roll = 0;
    const b = clamp(c.t / 0.8, 0, 1);
    if (b < 1) lerpPose(o, c.start, o, easeInOutCubic(b));
    return o;
  }

  _buildDefeat(c, opts) {
    const p = this.G.run?.player || this.target || { x: 0, z: 0 };
    c.cx = opts.x ?? p.x ?? 0; c.cz = opts.z ?? p.z ?? 0;
    Object.assign(this._hold, { radius: 7.5, height: 5.2, lookY: 0.5, fov: 36, speed: 0.04 });
    this._hold.center.set(c.cx, 0, c.cz);
    c.ang0 = Math.atan2(c.start.pos.x - c.cx, c.start.pos.z - c.cz) * 0.3;
    this._hold.angle = c.ang0;
  }

  _defeatPose(c, k, o) {
    const h = this._hold;
    const e = easeInOutSine(k);
    h.angle = c.ang0 + h.speed * c.t;
    const target = this._tmp;
    target.pos.set(h.center.x + Math.sin(h.angle) * h.radius, h.height, h.center.z + Math.cos(h.angle) * h.radius);
    target.look.set(h.center.x, h.lookY, h.center.z);
    target.fov = h.fov; target.roll = 0;
    return lerpPose(o, c.start, target, e);
  }

  dispose() {
    this._offs?.forEach((f) => f());
    window.removeEventListener('pointerdown', this._onTap);
  }
}

function keys(arr, s) {
  const n = arr.length - 1;
  const x = clamp(s, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return lerp(arr[i], arr[i + 1], easeInOutSine(x - i));
}
