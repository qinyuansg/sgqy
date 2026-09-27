// ─────────────────────────────────────────────────────────────
// CUBE DASH — hero controller (run.player === run.playerCtl.state)
//
//   Movement with weight (accel/decel, skid, ice, conveyors, bumpers, rim).
//   Kid-UX core promise (DESIGN_BRIEF §7): dashing is ALWAYS invulnerable,
//   dizzy cubes are ALWAYS harmless (walking into one nudges it), a dash into
//   a healthy cube ALWAYS knocks it and S/mini cubes are dizzied by the bump.
//   DASH = the cue stick: KNOCK solid cubes (billiards), SMASH (pierce) dizzy
//   ones, per-hero dash kinds (knock · bash · blink · well), aim assist,
//   0.12 s input buffer, hold for SPRINT, stamina + TIRED lockout (source DNA).
//   Perfect Dash detection (threat time-to-contact / hazards), near-misses,
//   contact damage & hazards → run.hurtPlayer, NOVA per hero
//   (bigbang · mega · storm · blackhole).
//
//   Visuals owned here: hero model (hero_model.js), blob shadow, the stamina
//   pip ring on the floor, Stella's gravity wells / black hole, Zap's bolts.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TUNE, DATA } from './data.js';
import { clamp, angleLerp, TAU, rand } from './core.js';
import { EXPR, BlobShadows, roundedBoxGeometry, createCubeMaterial } from './art.js';
import { createHeroModel } from './hero_model.js';

const TUNE_H = {
  dashHitR: 0.55,          // dash contact radius (a bit bigger than the hurtbox: generous)
  bodyR: 0.5,
  recoilSpeed: 7,          // → ~0.6 u bounce-back with decel 40
  hurtStun: 0.18, hurtKnockSpeed: 11.3,     // → ~1.6 u knockback
  shieldIframes: 0.6, shieldKnock: 5,
  turnRate: 16, iceAccel: 0.35,
  skidMinFrac: 0.7,
  sprintMinMove: 0.3,
  deniedEvery: 0.3,
  pip: { inner: 0.8, outer: 0.99, gap: 0.16, fadeIn: 10, fadeOut: 4, shake: 0.28 },
  groundRing: { inner: 0.6, outer: 0.68, color: 0x5ff2ff, opacity: 0.6 },   // permanent readability ring
  cueEvery: 0.45,          // min seconds between "!" cue events
  gapClosing: 0.6,         // gap-rule Perfect needs the cube to close in at ≥ this speed (u/s)
  nudge: 0.6,              // walking into a dizzy cube pushes it by this share of the overlap
  bubbleY: 0.9,
  nova: { rise: 0.45, riseH: 0.9, iframes: 1.1 },
  mega: { touchCd: 0.8, stompEvery: 0.5, stompR: 3, stompDizzy: 1, speedMult: 1.1, grow: 0.3, shrink: 0.4, knock: 12, heavyDizzy: 2 },
  storm: { range: 12, heavyDizzy: 4 },
  hole: { hurt: 1, push: 9 },
  stormZone: { tick: 1.5, push: 3.5, grace: 0.5 },
  lookRange: 7,
  starlightRange: 3, starlightStop: 1.2,
  bolts: 12, boltSegs: 5, boltLife: 0.26,
};
const COS_SKID = Math.cos((TUNE.player.skidAngle * Math.PI) / 180);
const DEG = Math.PI / 180;

let BOSS_REF = null;                       // em.boss (may or may not also live in em.list)
const bossy = (e) => !!e && (!!e.isBoss || (BOSS_REF !== null && e === BOSS_REF));
const isGone = (e) => !e || e.dead || e.portal === true || e.state === 'dying' || e.state === 'portal';
const smashableOf = (e) => e.smashable ?? e.coreOpen ?? false;
const harmfulOf = (e) => e.harmful ?? (!smashableOf(e) && !isGone(e) && !e.treasure);
const isHeavy = (e) => bossy(e) || e.type === 'bruiser' || e.type === 'beamer' || (e.mass ?? 1) >= 2.5;
const radiusOf = (e) => e.radius ?? (e.size ?? 1) * 0.5;

/** param (0..1) where segment P→Q first comes within r of C, or -1 */
function segHit(px, pz, qx, qz, cx, cz, r) {
  const dx = qx - px, dz = qz - pz;
  const L2 = dx * dx + dz * dz;
  const fx = cx - px, fz = cz - pz;
  if (fx * fx + fz * fz <= r * r) return 0;
  if (L2 < 1e-9) return -1;
  // solve |P + t·D − C| = r
  const b = -(fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r * r;
  const disc = b * b - L2 * c;
  if (disc < 0) return -1;
  const tt = (-b - Math.sqrt(disc)) / L2;
  return tt >= 0 && tt <= 1 ? tt : -1;
}
function segDist(px, pz, qx, qz, cx, cz) {
  const dx = qx - px, dz = qz - pz;
  const L2 = dx * dx + dz * dz;
  let tt = L2 > 1e-9 ? ((cx - px) * dx + (cz - pz) * dz) / L2 : 0;
  tt = clamp(tt, 0, 1);
  return Math.hypot(px + dx * tt - cx, pz + dz * tt - cz);
}

// ---------- swirl disc (gravity well / black hole) ----------
const SWIRL_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SWIRL_FRAG = /* glsl */`
uniform float uTime; uniform float uAlpha; uniform float uCore; uniform vec3 uA; uniform vec3 uB;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float arms = sin(a * 3.0 + log(r + 0.04) * 7.0 + uTime * 7.0) * 0.5 + 0.5;
  arms = smoothstep(0.35, 0.9, arms);
  float body = smoothstep(1.0, 0.45, r);
  float edge = smoothstep(0.8, 0.94, r) * smoothstep(1.0, 0.94, r);
  float core = smoothstep(0.3, 0.0, r);
  vec3 col = mix(uA, uB, arms) * (0.9 + edge * 1.3);
  float al = arms * body * 0.6 + edge * 0.85;
  col = mix(col, vec3(0.06, 0.0, 0.14), core * uCore);
  al = max(al, core * uCore);
  col += vec3(1.0, 0.95, 0.85) * core * (1.0 - uCore) * 0.9;
  al = max(al, core * (1.0 - uCore) * 0.75);
  gl_FragColor = vec4(col, al * uAlpha);
}`;

function fallbackModel(color) {
  const mat = createCubeMaterial({ color });
  const mesh = new THREE.Mesh(roundedBoxGeometry(0.22, 3), mat);
  mesh.position.y = 0.5;
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group, trailColors: null,
    update(dt, a) { mat.uniforms.uFace.value.x = a?.expr ?? (a?.dashing ? EXPR.FOCUS : EXPR.HAPPY); mat.uniforms.uFx.value.y = a?.glow ?? 0; },
    squash() {}, flash(s) { mat.uniforms.uFx.value.x = 1; setTimeout(() => { mat.uniforms.uFx.value.x = 0; }, s * 1000); },
    setBlink(on) { mesh.visible = true; this._blink = on; },
    dispose() { mat.dispose(); },
  };
}

export class Player {
  constructor(G, run, heroDef, skinId = null) {
    this.G = G;
    this.run = run;
    const hero = heroDef || DATA.heroes[0];
    this.hero = hero;
    const skin = (DATA.skins || []).find((s) => s.id === skinId && s.hero === hero.id);
    const color = skin?.color ?? hero.color;
    const mods = run.cardMods || {};
    let hearts = run.mutator?.hearts ?? hero.hearts;
    if (run.assist) hearts += TUNE.player.assistHeartsBonus;
    hearts = Math.min(TUNE.player.maxHearts, hearts);
    const maxSt = TUNE.stamina.max + (mods.staminaMax || 0);

    this.state = {
      x: 0, y: 0, z: 0, vx: 0, vz: 0, size: 1, rotY: 0,
      hp: hearts, maxHp: hearts, stamina: maxSt, maxStamina: maxSt,
      lockout: false, dashing: false, invuln: false, shield: 0,
      heroId: hero.id, color, object3d: null,
      // extras (read-only for other modules)
      radius: TUNE.player.hurtRadius, hurtRadius: TUNE.player.hurtRadius, perfectDash: false,
      dirX: 0, dirZ: 1, sprinting: false, tired: false,
      mega: false, nova: null, dashKind: hero.dashKind, iframes: 0, dead: false, bubbled: false,
    };

    // ---------- model ----------
    const meta = G.meta;
    let model = null;
    try {
      model = createHeroModel(hero.id, skinId, { hat: meta?.selectedHat?.(hero.id) ?? 'none', trail: meta?.selectedTrail?.() ?? 'default' });
    } catch (err) { console.error('[player] hero model failed, using fallback', err); }
    this.model = model?.group ? model : fallbackModel(color);
    this.state.object3d = this.model.group;
    G.scene?.add(this.model.group);
    this.shadows = new BlobShadows(2);
    G.scene?.add(this.shadows.mesh);

    // ---------- timers & dash state ----------
    this.time = 0;
    this.bufferT = 0; this.cooldownT = 0; this.hurtStunT = 0; this.skidT = 0; this.hurtBlinkT = 0;
    this.sinceSpend = 99; this.lockT = 0; this.lockDur = 1;
    this.pendingLockout = false; this.sprintArmed = false; this.deniedT = 0;
    this.dashAge = 0; this.dashDur = 0.18; this.dashV0 = 0; this.dashDirX = 0; this.dashDirZ = 1;
    this.dashExt = 0; this.dashSmashes = 0; this.dashPerfect = false; this.blinking = false;
    this.dashHit = new Set();
    this._hitE = []; this._hitT = [];
    this._snap = [];
    this.moved = 0;
    this.riseT = 0;
    this.spin = 0;
    this.celebrate = false;
    this.blinkTimes = [-9, -9, -9];
    this.novaBossHit = false;
    this._nm = new WeakMap(); this._nmGen = 0;
    this._bumped = new WeakMap();
    this._megaHit = new WeakMap();
    this._stormTick = 0;
    this._push = { x: 0, z: 0 };
    this._anim = { moving: false, speed: 0, dashing: false, sprinting: false, tired: false, hurt: false, airborne: false, lookX: 0, lookY: 0, expr: undefined, celebrate: false, glow: 0 };
    this._lookX = 0; this._lookY = 0;
    this._ttc = Infinity; this._cueOn = false; this._cueT = 0; this.pipShakeT = 0;

    this._buildPips();
    this._buildKit();
  }

  // ============ visuals: pip ring, wells, bolts ============
  _buildPips() {
    this.pipN = 0;
    this.pipAlpha = 0;
    this.pipMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
    this.pipMesh = new THREE.InstancedMesh(new THREE.BufferGeometry(), this.pipMat, 16);
    this.pipMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(16 * 3), 3);
    this.pipMesh.frustumCulled = false;
    this.pipMesh.renderOrder = 4;
    this.pipMesh.count = 0;
    const track = new THREE.RingGeometry(TUNE_H.pip.inner - 0.04, TUNE_H.pip.outer + 0.04, 48);
    track.rotateX(-Math.PI / 2);
    this.pipTrackMat = new THREE.MeshBasicMaterial({ color: 0x0b1a3a, transparent: true, opacity: 0, depthWrite: false });
    this.pipTrack = new THREE.Mesh(track, this.pipTrackMat);
    this.pipTrack.renderOrder = 3;
    const GR = TUNE_H.groundRing;
    const gr = new THREE.RingGeometry(GR.inner, GR.outer, 56);
    gr.rotateX(-Math.PI / 2);
    this.groundMat = new THREE.MeshBasicMaterial({ color: GR.color, transparent: true, opacity: GR.opacity, depthWrite: false, toneMapped: false });
    this.groundRing = new THREE.Mesh(gr, this.groundMat);
    this.groundRing.renderOrder = 3;
    this.G.scene?.add(this.pipTrack, this.pipMesh, this.groundRing);
    this._pc = new THREE.Color(); this._cFull = new THREE.Color(0x8ff8ff); this._cPart = new THREE.Color(0x3d7bff);
    this._cEmpty = new THREE.Color(0x24345e); this._cTired = new THREE.Color(0xa7b0c4);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._s = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
  }

  _rebuildPips(n) {
    this.pipN = n;
    const seg = TAU / n;
    const gap = Math.min(TUNE_H.pip.gap, seg * 0.3);
    const g = new THREE.RingGeometry(TUNE_H.pip.inner, TUNE_H.pip.outer, Math.max(4, Math.round(24 / n)), 1, Math.PI / 2 - seg + gap / 2, seg - gap);
    g.rotateX(-Math.PI / 2);
    this.pipMesh.geometry.dispose();
    this.pipMesh.geometry = g;
  }

  _buildKit() {
    const G = this.G;
    this.kit = new THREE.Group();
    this.kit.name = 'heroKit';
    G.scene?.add(this.kit);
    const disc = new THREE.PlaneGeometry(2, 2);
    disc.rotateX(-Math.PI / 2);
    this._discGeo = disc;
    const mkSwirl = (a, b, core) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uCore: { value: core }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) } },
        vertexShader: SWIRL_VERT, fragmentShader: SWIRL_FRAG, transparent: true, depthWrite: false,
      });
      const m = new THREE.Mesh(disc, mat);
      m.visible = false; m.renderOrder = 3;
      this.kit.add(m);
      return m;
    };
    // Stella gravity wells (max 2) + black hole
    const wl = this.hero.well || { time: 1.8, radius: 3.5, pull: 6, max: 2 };
    this.wells = [];
    for (let i = 0; i < (wl.max || 2); i++) this.wells.push({ on: false, x: 0, z: 0, t: 0, dur: wl.time, r: wl.radius, pull: wl.pull, mesh: mkSwirl(0xa77bff, 0xffe27a, 0) });
    this.holeMesh = mkSwirl(0x7a3cff, 0xff7ad9, 1);
    // lightning bolts (Zap storm + static)
    const bg = new THREE.BoxGeometry(1, 1, 1);
    bg.translate(0, 0.5, 0);
    this.boltMesh = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0xfff7b0, toneMapped: false }), TUNE_H.bolts * TUNE_H.boltSegs);
    this.boltMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.boltMesh.frustumCulled = false;
    this.boltMesh.count = 0;
    this.kit.add(this.boltMesh);
    this.bolts = [];
    for (let i = 0; i < TUNE_H.bolts; i++) this.bolts.push({ on: false, t: 0, pts: new Float32Array((TUNE_H.boltSegs + 1) * 3) });
  }

  // ============ stats ============
  get em() { return this.run.enemies; }
  get mods() { return this.run.cardMods || {}; }

  /** re-read card mods (max stamina etc.) */
  refreshStats() {
    const s = this.state;
    const maxSt = TUNE.stamina.max + (this.mods.staminaMax || 0);
    if (maxSt !== s.maxStamina) {
      const gain = Math.max(0, maxSt - s.maxStamina);
      s.maxStamina = maxSt;
      s.stamina = Math.min(maxSt, s.stamina + gain);
    }
  }
  setMaxHp(maxHp, hp) {
    const s = this.state;
    s.maxHp = clamp(Math.round(maxHp), 1, TUNE.player.maxHearts);
    s.hp = clamp(hp ?? s.hp, 0, s.maxHp);
  }
  grantIframes(sec) { this.state.iframes = Math.max(this.state.iframes, sec); }

  // ============ per-frame (state 'playing') ============
  /** input, movement, dash, nova — BEFORE enemies move */
  update(dt, rdt) {
    const s = this.state, run = this.run;
    const inp = this.G.input;
    this.time += dt;
    s.iframes = Math.max(0, s.iframes - dt);
    this.cooldownT -= dt; this.hurtStunT -= dt; this.skidT -= dt; this.deniedT -= rdt;
    if (this.hurtBlinkT > 0) { this.hurtBlinkT -= dt; if (this.hurtBlinkT <= 0) this.model.setBlink?.(false); }
    if (this.riseT > 0) this.riseT = Math.max(0, this.riseT - dt);

    let ix = inp?.move?.x || 0, iz = inp?.move?.y || 0;
    if (this.hurtStunT > 0 || s.dead) { ix = 0; iz = 0; }
    const mag = Math.min(1, Math.hypot(ix, iz));

    // ---------- dash input buffer (game time: survives hit-stop) ----------
    const pressed = !!inp?.pressed?.('dash');
    if (pressed) this.bufferT = TUNE.dash.buffer;
    else if (this.bufferT > 0) this.bufferT -= dt;
    if (!inp?.held?.('dash')) this.sprintArmed = false;

    // ---------- Perfect "!" cue: any threat inside the window + cueExtra ----------
    this._updateCue(rdt);

    // ---------- nova ----------
    if (inp?.pressed?.('nova') && !this.tryNova() && !run.novaReady && !s.nova && !s.dead) {
      this.model.squash?.(1.08, 0.94, 1.08);                     // soft "not yet" wobble
      this.G.bus?.emit('nova:notReady', { x: s.x, z: s.z, charge: run.nova });
    }

    // ---------- dash start ----------
    if (this.bufferT > 0 && this.canDash()) {
      this.bufferT = 0;
      this.startDash(ix, iz, mag);
    } else if (pressed && s.lockout && this.deniedT <= 0) {
      this.deniedT = TUNE_H.deniedEvery;
      this.pipShakeT = TUNE_H.pip.shake;
      this.G.bus?.emit('player:dashDenied', { x: s.x, z: s.z });
      this.model.squash?.(1.12, 0.88, 1.12);
      this.G.fx?.burst?.('dust', s.x, 0.4, s.z, { count: 4, color: 0xffffff });
    }

    this._updateStamina(dt, mag);

    // ---------- movement ----------
    const px = s.x, pz = s.z;
    if (s.dashing) {
      if (this.blinking) { this.dashAge += dt; if (this.dashAge >= this.dashDur) this.endDash(false); }
      else this._updateDash(dt);
    } else this._move(dt, ix, iz, mag);
    this.moved += Math.hypot(s.x - px, s.z - pz);
    // Mochi's Bouncy Belly runs BEFORE enemies.js' own contact pass so a frontal bump never hurts
    if (this.hero.passive?.id === 'bouncyBelly' && !s.dashing && this.em?.list) {
      for (const e of this.em.list) {
        if (isGone(e) || !harmfulOf(e)) continue;
        const dx = e.x - s.x, dz = e.z - s.z, d = Math.hypot(dx, dz);
        if (d < s.radius + radiusOf(e) + 0.12) this._bellyBump(e, dx, dz, d);
      }
    }

    // perfect via hazard overlap during the first frames of a dash
    if (s.dashing && !this.dashPerfect && this.dashAge <= TUNE.perfect.hazardWindow) this._hazardPerfect();

    // ---------- facing ----------
    if (s.dashing) s.rotY = Math.atan2(this.dashDirX, this.dashDirZ);
    else {
      const sp = Math.hypot(s.vx, s.vz);
      if (sp > 0.4) s.rotY = angleLerp(s.rotY, Math.atan2(s.vx, s.vz), Math.min(1, TUNE_H.turnRate * dt));
    }
    s.dirX = Math.sin(s.rotY); s.dirZ = Math.cos(s.rotY);

    // ---------- hero kit ----------
    this._updateWells(dt);
    this._updateStarlight(dt);
    this._updateNova(dt);
  }

  /** contacts, hazards, near-misses, world — AFTER enemies moved */
  resolve(dt) {
    const s = this.state, run = this.run, em = this.em;
    const list = em?.list;
    if (list && !s.dead) {
      const snap = this._snapshot();
      for (const e of snap) {
        if (isGone(e)) continue;
        const rr = radiusOf(e);
        const dx = e.x - s.x, dz = e.z - s.z;
        const d = Math.hypot(dx, dz);
        if (s.mega) { if (d < TUNE_H.bodyR * s.size + rr) this._megaTouch(e, dx, dz, d); continue; }
        if (harmfulOf(e)) {
          if (d < s.radius + rr * 0.92) {
            if (this._bellyBump(e, dx, dz, d)) continue;
            run.hurtPlayer(e.hearts ?? e.contactHearts ?? 1, e.x, e.z, bossy(e) ? 'boss' : e.type || 'contact');
          }
        } else if (!s.dashing && d > 1e-4 && d < TUNE_H.bodyR + rr) {
          const ov = TUNE_H.bodyR + rr - d;
          if (smashableOf(e) && !bossy(e)) {
            // walking into a dizzy cube nudges it gently
            e.x += (dx / d) * ov * TUNE_H.nudge; e.z += (dz / d) * ov * TUNE_H.nudge;
          } else {
            // soft push-out from other harmless cubes (sleeping / treasure / boss core)
            s.x -= (dx / d) * ov * 0.5; s.z -= (dz / d) * ov * 0.5;
          }
        }
      }
      this._nearMiss(list);
    }
    // hazards registry (lasers, blasts, slam rings, mines …)
    const hz = run.hazards;
    if (hz && !s.dead) for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      if (!h || !h.active) continue;
      let hit = false;
      try { hit = !!h.test?.(s.x, s.z, s.radius); } catch { hit = false; }
      if (hit) run.hurtPlayer(h.hearts ?? 1, h.srcX ?? s.x, h.srcZ ?? s.z, h.kind || 'hazard');
    }
    this._worldGimmicks(dt);
    this._clampArena(dt);
  }

  _snapshot() {
    const out = this._snap;
    out.length = 0;
    const em = this.em;
    if (em?.list) for (const e of em.list) out.push(e);
    const b = em?.boss || null;
    BOSS_REF = b;
    if (b && !out.includes(b)) out.push(b);
    return out;
  }

  canDash() {
    const s = this.state;
    return !s.dashing && this.cooldownT <= 0 && !s.lockout && !s.mega && !s.dead && s.stamina > 0.01;
  }

  // ---------- movement ----------
  _move(dt, ix, iz, mag) {
    const s = this.state, w = this.G.world;
    let fric = 1;
    try { fric = w?.frictionAt ? w.frictionAt(s.x, s.z) ?? 1 : 1; } catch { fric = 1; }
    const maxSp = this.hero.speed * (s.lockout ? TUNE.stamina.lockoutWalk : 1) * (s.sprinting ? TUNE.sprint.mult : 1) * (s.mega ? TUNE_H.mega.speedMult : 1);
    const sp = Math.hypot(s.vx, s.vz);
    if (mag > 0.08) {
      // skid: hard reversal at speed
      if (this.skidT <= 0 && sp > TUNE_H.skidMinFrac * this.hero.speed) {
        const dot = (s.vx * ix + s.vz * iz) / (sp * mag);
        if (dot < COS_SKID) {
          this.skidT = TUNE.player.skidTime;
          this.model.squash?.(1.25, 0.78, 1.2);
          this.G.fx?.burst?.('dust', s.x, 0.15, s.z, { count: 7, color: 0xffffff });
        }
      }
      const tx = ix * maxSp, tz = iz * maxSp;
      const acc = TUNE.player.accel * (fric < 1 ? TUNE_H.iceAccel : 1) * (this.skidT > 0 ? 0.35 : 1) * dt;
      const dvx = tx - s.vx, dvz = tz - s.vz, dl = Math.hypot(dvx, dvz);
      if (dl <= acc) { s.vx = tx; s.vz = tz; } else { s.vx += (dvx / dl) * acc; s.vz += (dvz / dl) * acc; }
    } else if (sp > 0) {
      const dec = TUNE.player.decel * fric * dt;
      const k = Math.max(0, sp - dec) / sp;
      s.vx *= k; s.vz *= k;
    }
    // over-speed (after recoil/knockback/dash) bleeds with decel
    const sp2 = Math.hypot(s.vx, s.vz);
    if (sp2 > maxSp * 1.02 && mag > 0.08) {
      const k = Math.max(maxSp, sp2 - TUNE.player.decel * fric * dt) / sp2;
      s.vx *= k; s.vz *= k;
    }
    s.x += s.vx * dt; s.z += s.vz * dt;
    // conveyors
    if (w?.pushAt) {
      this._push.x = 0; this._push.z = 0;
      try { const o = w.pushAt(s.x, s.z, this._push); if (o) { s.x += (o.x || 0) * dt; s.z += (o.z || 0) * dt; } } catch { /* optional */ }
    }
  }

  _updateStamina(dt, mag) {
    const s = this.state, inp = this.G.input;
    s.tired = s.lockout;
    // sprint: hold dash after the burst
    const wantSprint = this.sprintArmed && !s.dashing && !s.lockout && !s.mega && inp?.held?.('dash') && mag > TUNE_H.sprintMinMove;
    s.sprinting = !!wantSprint && s.stamina > 0;
    if (s.lockout) {
      this.lockT -= dt;
      const k = clamp(1 - this.lockT / this.lockDur, 0, 1);
      s.stamina = s.maxStamina * TUNE.stamina.lockoutRefillTo * k;
      if (this.lockT <= 0) {
        s.lockout = false; s.tired = false;
        s.stamina = Math.max(s.stamina, s.maxStamina * TUNE.stamina.lockoutRefillTo);
        this.sinceSpend = 0;
        this.G.bus?.emit('player:staminaBack', {});
      }
      return;
    }
    if (s.sprinting) {
      s.stamina -= TUNE.sprint.drain * dt;
      this.sinceSpend = 0;
      if (s.stamina <= 0) { s.stamina = 0; s.sprinting = false; this.startLockout(); }
      return;
    }
    if (s.dashing) return;
    this.sinceSpend += dt;
    if (this.sinceSpend >= (this.mods.regenDelay ?? TUNE.stamina.delay)) {
      s.stamina = Math.min(s.maxStamina, s.stamina + TUNE.stamina.regen * (this.mods.regenMult || 1) * dt);
    }
  }

  startLockout() {
    const s = this.state;
    if (s.lockout) return;
    if (this.run.assist && !(TUNE.stamina.assistLockout > 0)) {
      // Helper mode: no TIRED — the bar is just empty and refills normally
      s.stamina = 0; s.sprinting = false; this.pendingLockout = false; this.sinceSpend = 0;
      return;
    }
    s.lockout = true; s.tired = true; s.sprinting = false;
    this.pendingLockout = false;
    this.lockDur = this.run.assist ? TUNE.stamina.assistLockout : TUNE.stamina.lockout;
    this.lockT = this.lockDur;
    s.stamina = 0;
    this.G.bus?.emit('player:staminaEmpty', { x: s.x, z: s.z });
    this.G.input?.rumble?.(0.15, 0.3, 90);
  }

  // ---------- dash ----------
  startDash(ix, iz, mag) {
    const s = this.state, run = this.run, em = this.em, inp = this.G.input;
    let dx, dz;
    if (mag > 0.25) { dx = ix / mag; dz = iz / mag; } else { dx = Math.sin(s.rotY); dz = Math.cos(s.rotY); }
    // aim assist (smashable cubes only)
    if (em?.nearestSmashable) {
      const strong = run.assist ? 1.5 : 1;
      let tgt = null;
      try {
        if (mag > 0.25) {
          const cone = (inp?.device === 'touch' ? TUNE.dash.aimAssistTouchDeg : TUNE.dash.aimAssistDeg) * strong;
          tgt = em.nearestSmashable(s.x, s.z, TUNE.dash.aimAssistRange * (run.assist ? 1.3 : 1), dx, dz, cone);
        } else tgt = em.nearestSmashable(s.x, s.z, 5 * (run.assist ? 1.3 : 1), dx, dz, 360);
      } catch { tgt = null; }
      if (tgt && !isGone(tgt)) {
        const ax = tgt.x - s.x, az = tgt.z - s.z, al = Math.hypot(ax, az);
        if (al > 0.05) { dx = ax / al; dz = az / al; }
      }
    }
    // perfect: threat time-to-contact at the press (pre-dash velocity), or gap ≤ 0.5 u
    let perfect = this._ttc <= this.perfectWindow() || this._gapPerfect();
    // stamina (a dash is never refused while not tired: overspending → TIRED after it)
    const cost = this.hero.dashCost ?? TUNE.dash.cost;
    s.stamina -= cost;
    this.sinceSpend = 0;
    if (s.stamina <= 0) { s.stamina = 0; this.pendingLockout = true; }

    this.dashDirX = dx; this.dashDirZ = dz;
    this.dashAge = 0; this.dashExt = 0; this.dashSmashes = 0; this.dashPerfect = false; s.perfectDash = false;
    this.dashHit.clear();
    s.dashing = true; s.sprinting = false;
    s.iframes = Math.max(s.iframes, TUNE.dash.iframes);
    s.rotY = Math.atan2(dx, dz);
    const kind = this.hero.dashKind;
    const fromX = s.x, fromZ = s.z;
    run.stats && run.stats.dashes++;
    this.model.squash?.(0.8, 0.85, 1.35);
    this.G.input?.rumble?.(0.15, 0.35, 60);
    this.run.upgrades?.onDashStart?.(fromX, fromZ);
    if (!perfect) perfect = this._hazardPerfect(true);

    if (kind === 'blink') {
      this.blinking = true;
      this.dashDur = this.hero.dashTime ?? 0.08;
      this._blink(dx, dz);
    } else {
      this.blinking = false;
      this.dashDur = this.hero.dashTime ?? TUNE.dash.time;
      const dist = (this.hero.dashDist ?? TUNE.dash.dist) * (this.mods.dashDistMult || 1);
      this.dashV0 = (1.6 * dist) / this.dashDur;
      if (kind === 'well') this.dropWell(fromX, fromZ);
    }
    this.G.bus?.emit('player:dash', {
      x: fromX, z: fromZ, dirX: dx, dirZ: dz, heroId: this.hero.id, color: s.color, kind,
      toX: s.x, toZ: s.z, blink: kind === 'blink', trail: this.model.trailColors ?? null,
    });
    if (perfect) this.perfect();
  }

  _updateDash(dt) {
    const s = this.state, run = this.run, em = this.em;
    this.dashAge += dt;
    const k = clamp(this.dashAge / this.dashDur, 0, 1);
    const spd = this.dashV0 * Math.pow(1 - k, 0.6);
    s.vx = this.dashDirX * spd; s.vz = this.dashDirZ * spd;
    const px = s.x, pz = s.z;
    let nx = px + s.vx * dt, nz = pz + s.vz * dt;
    // keep inside the arena (slide along the rim)
    const R = this._maxR();
    const r = Math.hypot(nx, nz);
    if (r > R) { nx *= R / r; nz *= R / r; }
    // swept collision vs cubes, nearest first
    if (em?.list && dt > 0) {
      const snap = this._snapshot();
      const E = this._hitE, T = this._hitT;
      E.length = 0; T.length = 0;
      const hr = TUNE_H.dashHitR * s.size;
      for (const e of snap) {
        if (isGone(e) || this.dashHit.has(e)) continue;
        const tt = segHit(px, pz, nx, nz, e.x, e.z, hr + radiusOf(e));
        if (tt < 0) continue;
        let j = E.length;
        E.push(e); T.push(tt);
        while (j > 0 && T[j - 1] > tt) { E[j] = E[j - 1]; T[j] = T[j - 1]; j--; }
        E[j] = e; T[j] = tt;
      }
      for (let i = 0; i < E.length; i++) {
        const e = E[i];
        if (isGone(e)) continue;
        this.dashHit.add(e);
        if (this._dashContact(e)) continue;          // smashed → pierce on
        // solid: stop at the contact point and bounce back
        const tt = T[i];
        s.x = px + (nx - px) * tt; s.z = pz + (nz - pz) * tt;
        this.run.upgrades?.onDashMove?.(s.x, s.z);
        this.endDash(true);
        return;
      }
    }
    s.x = nx; s.z = nz;
    this.run.upgrades?.onDashMove?.(s.x, s.z);
    if (this.dashAge >= this.dashDur) this.endDash(false);
  }

  /** @returns true when the dash pierces on (smash), false when it stops (knock/solid) */
  _dashContact(e) {
    const s = this.state, run = this.run, em = this.em, mods = this.mods;
    const dx = this.dashDirX, dz = this.dashDirZ;
    if (smashableOf(e)) {
      this._smash(e, dx, dz);
      return true;
    }
    if (bossy(e)) {
      run.onPlayerKnock?.(e, { boss: true });
      return false;
    }
    if (mods.meteor && !isHeavy(e) && !e.treasure) {
      em.dizzy?.(e, 0.3, 'meteor');
      if (smashableOf(e)) { this._smash(e, dx, dz); return true; }
    }
    // KNOCK: billiards cue (dash dir blended with the contact normal)
    let cx = e.x - s.x, cz = e.z - s.z;
    const cl = Math.hypot(cx, cz) || 1;
    cx /= cl; cz /= cl;
    let kx = dx * 0.6 + cx * 0.4, kz = dz * 0.6 + cz * 0.4;
    const kl = Math.hypot(kx, kz) || 1;
    kx /= kl; kz /= kl;
    const bash = this.hero.dashKind === 'bash';
    const speed = TUNE.knock.speed * (mods.knockMult || 1) * (bash ? 1.4 : 1);
    // kid rule: S / mini cubes are dizzied directly by the bump (Mochi's bash: up to M)
    const sz = e.size ?? 1;
    const small = !e.treasure && !isHeavy(e) && (e.sizeKey === 'S' || e.mini || sz <= 0.75 || (bash && sz <= 1.05));
    em.knock?.(e, kx, kz, speed, { byPlayer: true, bash, heroId: this.hero.id, dizzy: small ? TUNE.bonk.dizzy : 0 });
    if (small) em.dizzy?.(e, TUNE.bonk.dizzy, bash ? 'bash' : 'bump');
    run.onPlayerKnock?.(e, { bash });
    return false;
  }

  _smash(e, dx, dz) {
    const s = this.state, run = this.run;
    this.dashSmashes++;
    this.run.onDashSmash?.(this.dashSmashes);
    this.em.smash?.(e, { dirX: dx, dirZ: dz, perfect: this.dashPerfect, byPlayer: true });
    // pierce: extend the dash a little, refund stamina
    const ext = Math.min(TUNE.dash.pierceExtend, TUNE.dash.pierceCap - this.dashExt);
    if (ext > 0 && !this.blinking) { this.dashExt += ext; this.dashDur += ext; }
    s.stamina = Math.min(s.maxStamina, s.stamina + TUNE.dash.smashRefund);
    if (this.pendingLockout && s.stamina > 0) this.pendingLockout = false;
    this.model.squash?.(0.85, 0.9, 1.25);
  }

  endDash(recoil) {
    const s = this.state, run = this.run;
    if (!s.dashing) return;
    s.dashing = false;
    s.perfectDash = false;
    const wasBlink = this.blinking;
    this.blinking = false;
    this.cooldownT = TUNE.dash.cooldown;
    if (recoil) {
      s.vx = -this.dashDirX * TUNE_H.recoilSpeed;
      s.vz = -this.dashDirZ * TUNE_H.recoilSpeed;
      this.model.squash?.(1.3, 0.75, 0.8);
    } else if (!wasBlink) {
      const keep = Math.min(this.hero.speed, Math.hypot(s.vx, s.vz));
      s.vx = this.dashDirX * keep; s.vz = this.dashDirZ * keep;
      this.model.squash?.(1.1, 0.92, 0.95);
    }
    this.G.bus?.emit('player:dashEnd', { x: s.x, z: s.z, smashes: this.dashSmashes, perfect: this.dashPerfect });
    run.onDashEnd?.(this.dashSmashes);
    run.upgrades?.onDashEnd?.(s.x, s.z);
    if (this.pendingLockout) this.startLockout();
    this.sprintArmed = !!this.G.input?.held?.('dash');
  }

  /** Perfect window in seconds (assist / Blu passive / Just Right card) */
  perfectWindow() {
    const run = this.run;
    const base = run.assist ? (TUNE.perfect.assistTtc ?? TUNE.assist.perfectTtc) : TUNE.perfect.ttc;
    return base + (this.hero.passive?.ttcBonus ?? 0) + (this.mods.perfectTtcBonus || 0);
  }

  _updateCue(rdt) {
    const s = this.state, run = this.run, em = this.em;
    let ttc = Infinity;
    if (em?.threatTTC && !s.dead) {
      try { const v = em.threatTTC(s.x, s.z, s.vx, s.vz, s.radius); if (typeof v === 'number' && v >= 0) ttc = v; } catch { ttc = Infinity; }
    }
    this._ttc = ttc;
    const cue = !s.dead && this.canDash() && (ttc <= this.perfectWindow() + (TUNE.perfect.cueExtra ?? 0.2) || this._gapPerfect());
    run.perfectCue = cue;
    this._cueT -= rdt;
    if (cue && !this._cueOn && this._cueT <= 0) {
      this._cueT = TUNE_H.cueEvery;
      this.G.bus?.emit('player:cue', { x: s.x, z: s.z, ttc });
    }
    this._cueOn = cue;
  }

  /**
   * gap rule: a harmful cube within TUNE.perfect.gap (surface to surface) that is CLOSING in.
   * (A cube merely standing next to you — a Beamer pylon, a jostling crowd — is not "about to hit",
   * otherwise Perfects could be farmed for free.)
   */
  _gapPerfect() {
    const s = this.state, list = this.em?.list;
    if (!list) return false;
    const gap = TUNE.perfect.gap ?? 0.5;
    for (const e of list) {
      if (isGone(e) || !harmfulOf(e) || bossy(e)) continue;
      const dx = e.x - s.x, dz = e.z - s.z, d = Math.hypot(dx, dz);
      if (d < 1e-4 || d - radiusOf(e) - s.radius > gap) continue;
      const rvx = (e.vx || 0) - s.vx, rvz = (e.vz || 0) - s.vz;
      if (dx * rvx + dz * rvz <= -TUNE_H.gapClosing * d) return true;
    }
    return false;
  }

  _hazardPerfect(atPress = false) {
    const s = this.state, hz = this.run.hazards;
    if (!hz || !hz.length) return false;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      // dashing THROUGH an attack (laser, ring, charge, blast) — not merely into the king's body
      if (!h?.active || h.kind === 'boss' || h.kind === 'body') continue;
      let hit = false;
      try { hit = !!h.test?.(s.x, s.z, s.radius + 0.15); } catch { hit = false; }
      if (hit) {
        if (!atPress) this.perfect();
        return true;
      }
    }
    return false;
  }

  /** PERFECT DASH — 冲得刚好 */
  perfect() {
    if (this.dashPerfect) return;
    this.dashPerfect = true;
    const s = this.state, em = this.em, mods = this.mods;
    s.perfectDash = true;                          // boss.js reads this for the 2-crack core hit
    const R = TUNE.perfect.radius + (this.hero.passive?.radiusBonus ?? 0) + (mods.perfectRadiusBonus || 0);
    em?.dizzyRadius?.(s.x, s.z, R, TUNE.perfect.dizzy);
    s.stamina = Math.min(s.maxStamina, s.stamina + TUNE.perfect.refund);
    if (s.stamina > 0) this.pendingLockout = false;
    this.run.onPerfect?.(s.x, s.z, R);
  }

  // ---------- Zap: blink ----------
  _blink(dx, dz) {
    const s = this.state, em = this.em;
    const dist = (this.hero.dashDist ?? 5.5) * (this.mods.dashDistMult || 1);
    const fx = s.x, fz = s.z;
    // stop at the rim: largest t with |F + D t| ≤ R
    const R = this._maxR();
    const b = fx * dx + fz * dz, c = fx * fx + fz * fz - R * R;
    const disc = b * b - c;
    let tMax = disc > 0 ? -b + Math.sqrt(disc) : 0;
    tMax = clamp(tMax, 0, dist);
    const tx = fx + dx * tMax, tz = fz + dz * tMax;
    const pas = this.hero.passive || {};
    this._sparks(fx, fz, pas.sparkRadius ?? 1.6, pas.sparkDizzy ?? 1.2);
    // smash dizzy cubes along the line
    if (em?.list) {
      const snap = this._snapshot();
      for (const e of snap) {
        if (isGone(e) || !smashableOf(e)) continue;
        if (segDist(fx, fz, tx, tz, e.x, e.z) < TUNE_H.dashHitR + radiusOf(e)) { this.dashHit.add(e); this._smash(e, dx, dz); }
      }
    }
    s.x = tx; s.z = tz;
    const keep = Math.min(this.hero.speed, Math.hypot(s.vx, s.vz) + 2);
    s.vx = dx * keep; s.vz = dz * keep;
    this._sparks(tx, tz, pas.sparkRadius ?? 1.6, pas.sparkDizzy ?? 1.2);
    this.run.upgrades?.onDashMove?.(tx, tz);
    this.G.fx?.burst?.('sparks', fx, 0.6, fz, { count: 16, color: 0xfff27a });
    this.G.fx?.burst?.('sparks', tx, 0.6, tz, { count: 20, color: 0x8fe8ff });
    this.G.fx?.burst?.('ring', tx, 0.1, tz, { radius: pas.sparkRadius ?? 1.6, color: 0xfff27a });
    // passive Static: 3 blinks within 2 s → chain lightning
    const now = this.time;
    this.blinkTimes.shift(); this.blinkTimes.push(now);
    if (now - this.blinkTimes[0] <= 2) {
      this.blinkTimes.fill(-9);
      this._chainLightning(pas.chainCount ?? 3);
    }
  }

  _sparks(x, z, r, sec) {
    const em = this.em;
    if (!em?.list) return;
    const snap = this._snapshot();
    for (const e of snap) {
      if (isGone(e) || bossy(e) || e.type === 'bruiser' || e.treasure || smashableOf(e)) continue;
      if (Math.hypot(e.x - x, e.z - z) < r + radiusOf(e) * 0.5) em.dizzy?.(e, sec, 'spark');
    }
  }

  _chainLightning(n) {
    const s = this.state, em = this.em;
    if (!em?.list) return;
    const snap = this._snapshot();
    let hits = 0;
    for (let k = 0; k < n; k++) {
      let best = null, bd = 1e9;
      for (const e of snap) {
        if (isGone(e) || bossy(e) || !smashableOf(e) || this.dashHit.has(e)) continue;
        const d = Math.hypot(e.x - s.x, e.z - s.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      this.dashHit.add(best);
      this._bolt(best.x, best.z, s.x, 1.2, s.z);
      this.em.smash?.(best, { dirX: (best.x - s.x) / (bd || 1), dirZ: (best.z - s.z) / (bd || 1), byStatic: true });
      hits++;
    }
    if (hits) { this.run.shake?.(0.2, 0.25); this.G.bus?.emit('player:static', { x: s.x, z: s.z, count: hits }); }
  }

  // ---------- Stella: gravity wells + starlight ----------
  dropWell(x, z) {
    let w = this.wells.find((q) => !q.on);
    if (!w) w = this.wells.reduce((a, b) => (a.t > b.t ? a : b));
    w.on = true; w.x = x; w.z = z; w.t = 0;
    this.G.fx?.burst?.('ring', x, 0.1, z, { radius: w.r, color: 0xa77bff });
    this.G.bus?.emit('player:well', { x, z, radius: w.r, time: w.dur });
  }

  _pull(cx, cz, r, pull, orbit, dt, stopAt = 0.35) {
    const em = this.em;
    if (!em?.list) return;
    // enemies.js owns cube physics: its pull() applies the force (and bonks) this frame
    if (typeof em.pull === 'function') { try { em.pull(cx, cz, r, pull, orbit); return; } catch { /* fall back */ } }
    for (const e of em.list) {
      if (isGone(e) || bossy(e) || e.treasure) continue;
      const dx = cx - e.x, dz = cz - e.z, d = Math.hypot(dx, dz);
      if (d > r || d < stopAt) continue;
      const ux = dx / d, uz = dz / d;
      const heavy = isHeavy(e) ? 0.35 : 1;
      const step = Math.min(d - stopAt, pull * heavy * dt);
      e.x += ux * step - uz * orbit * heavy * dt;
      e.z += uz * step + ux * orbit * heavy * dt;
      if (e.vx !== undefined) {
        // make sure their velocity points inward too, so pulled cubes BONK each other
        const vt = e.vx * ux + e.vz * uz;
        if (vt < pull * heavy) { const add = (pull * heavy - vt) * Math.min(1, 8 * dt); e.vx += ux * add; e.vz += uz * add; }
      }
    }
  }

  _updateWells(dt) {
    for (const w of this.wells) {
      if (!w.on) continue;
      w.t += dt;
      if (w.t >= w.dur) { w.on = false; continue; }
      this._pull(w.x, w.z, w.r, w.pull, 0.6, dt);
    }
  }

  /** Stella's Starlight drift — only when the EnemyManager doesn't do it itself (enemies.js has heroPassives) */
  _updateStarlight(dt) {
    if (this.hero.passive?.id !== 'starlight' || typeof this.em?.pull === 'function') return;
    const s = this.state, em = this.em;
    if (!em?.list) return;
    const drift = this.hero.passive.drift ?? 2;
    for (const e of em.list) {
      if (isGone(e) || bossy(e) || !smashableOf(e)) continue;
      const dx = s.x - e.x, dz = s.z - e.z, d = Math.hypot(dx, dz);
      if (d > TUNE_H.starlightRange || d < TUNE_H.starlightStop) continue;
      const step = Math.min(d - TUNE_H.starlightStop, drift * dt);
      e.x += (dx / d) * step; e.z += (dz / d) * step;
    }
  }

  // ---------- NOVA ----------
  tryNova() {
    const s = this.state, run = this.run;
    if (s.nova || s.dead || this.blinking || run.state !== 'playing') return false;
    if (!run.novaReady) return false;
    return this.castNova();
  }

  castNova() {
    const s = this.state, run = this.run, em = this.em, mods = this.mods;
    if (!run.consumeNova?.()) return false;
    const nv = this.hero.nova || { kind: 'bigbang' };
    const kind = nv.kind || 'bigbang';
    this.G.slowMo?.(TUNE.nova.slowScale, TUNE.nova.slowTime);
    s.iframes = Math.max(s.iframes, TUNE_H.nova.iframes);
    this.riseT = TUNE_H.nova.rise;
    this.model.flash?.(0.25);
    this.model.squash?.(0.8, 1.35, 0.8);
    run.shake?.(TUNE.shake.nova, 0.7);
    run.kick?.(0.1);
    this.G.input?.rumble?.(1, 0.8, 380);
    this.novaBossHit = false;
    const rm = mods.novaRadiusMult || 1;
    let radius = TUNE.nova.radius * rm;
    const n = { kind, t: 0, dur: 0.6, x: s.x, z: s.z, r: radius, bolts: 0, fired: 0, stompT: 0 };
    if (kind === 'mega') { n.dur = nv.duration ?? 6; radius = TUNE_H.mega.stompR; s.mega = true; }
    else if (kind === 'storm') { n.dur = nv.duration ?? 2.5; n.bolts = Math.round((nv.bolts ?? 12) * rm); radius = TUNE_H.storm.range; }
    else if (kind === 'blackhole') { n.dur = nv.duration ?? 3; n.r = (nv.radius ?? 11) * rm; radius = n.r; }
    s.nova = n;
    // (camera.js runs its 'nova' pull-out shot from this event)
    this.G.bus?.emit('nova', { x: s.x, z: s.z, radius, heroId: this.hero.id, color: s.color, kind });
    if (kind === 'bigbang') em?.nova?.(s.x, s.z, radius, this.hero.id);
    run.upgrades?.onNova?.(s.x, s.z, radius);
    return true;
  }

  _updateNova(dt) {
    const s = this.state, n = s.nova, em = this.em;
    if (!n) return;
    n.t += dt;
    switch (n.kind) {
      case 'mega': {
        const M = TUNE_H.mega, scale = this.hero.nova?.scale ?? 2.5;
        const grow = clamp(n.t / M.grow, 0, 1), shrink = clamp((n.dur - n.t) / M.shrink, 0, 1);
        s.size = 1 + (scale - 1) * Math.min(grow, shrink);
        n.stompT -= dt;
        if (n.stompT <= 0 && n.t > M.grow) {
          n.stompT = M.stompEvery;
          em?.dizzyRadius?.(s.x, s.z, M.stompR, M.stompDizzy);
          this.G.fx?.burst?.('ring', s.x, 0.1, s.z, { radius: M.stompR, color: 0x7dffc0 });
          this.G.fx?.burst?.('dust', s.x, 0.2, s.z, { count: 10 });
          this.run.shake?.(0.22, 0.2);
          this.model.squash?.(1.2, 0.8, 1.2);
          this.G.bus?.emit('player:stomp', { x: s.x, z: s.z, radius: M.stompR });
        }
        break;
      }
      case 'storm': {
        const want = Math.min(n.bolts, Math.floor((n.t / n.dur) * n.bolts) + 1);
        while (n.fired < want) { n.fired++; this._stormBolt(); }
        break;
      }
      case 'blackhole': {
        const k = clamp(n.t / n.dur, 0, 1);
        this._pull(n.x, n.z, n.r, 3 + 7 * k, 3.5, dt, 0.6);
        if (n.t >= n.dur) this._implode(n);
        break;
      }
      default: break;
    }
    if (n.t >= n.dur) this._endNova();
  }

  _endNova() {
    const s = this.state;
    if (!s.nova) return;
    s.nova = null;
    s.mega = false;
    s.size = 1;
    this.run.onNovaEnd?.();
  }

  _stormBolt() {
    const s = this.state, em = this.em;
    const R = TUNE_H.storm.range;
    let target = null;
    const snap = this._snapshot();
    // boss first (one crack), then dizzy cubes, then the nearest threat
    const boss = snap.find((e) => bossy(e) && !isGone(e));
    if (boss && !this.novaBossHit && Math.hypot(boss.x - s.x, boss.z - s.z) < R + 3) {
      this.novaBossHit = true;
      em?.nova?.(boss.x, boss.z, 0.5, this.hero.id);
      this._bolt(boss.x, boss.z);
      return;
    }
    let bd = R;
    for (const e of snap) {
      if (isGone(e) || bossy(e) || !smashableOf(e)) continue;
      const d = Math.hypot(e.x - s.x, e.z - s.z);
      if (d < bd) { bd = d; target = e; }
    }
    if (!target) {
      bd = R;
      for (const e of snap) {
        if (isGone(e) || bossy(e) || e.treasure || !harmfulOf(e)) continue;
        const d = Math.hypot(e.x - s.x, e.z - s.z);
        if (d < bd) { bd = d; target = e; }
      }
    }
    if (!target) {
      const a = rand() * TAU, r = 2 + rand() * 5;
      this._bolt(s.x + Math.sin(a) * r, s.z + Math.cos(a) * r);
      return;
    }
    this._bolt(target.x, target.z);
    this._novaHit(target, 0, 0, TUNE_H.storm.heavyDizzy);
    this.run.shake?.(0.14, 0.15);
  }

  /** nova touch on one cube: smash dizzy · dizzy heavy · smash light */
  _novaHit(e, dx, dz, heavyDizzy) {
    const em = this.em;
    if (!dx && !dz) { dx = e.x - this.state.x; dz = e.z - this.state.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    if (smashableOf(e)) { em.smash?.(e, { dirX: dx, dirZ: dz, byNova: true }); return; }
    if (e.treasure) return;
    if (isHeavy(e)) { em.dizzy?.(e, heavyDizzy, 'nova'); return; }
    em.dizzy?.(e, 0.4, 'nova');
    if (smashableOf(e)) em.smash?.(e, { dirX: dx, dirZ: dz, byNova: true });
    else em.knock?.(e, dx, dz, TUNE_H.mega.knock, { byPlayer: true, byNova: true });
  }

  _megaTouch(e, dx, dz, d) {
    const last = this._megaHit.get(e);
    if (last !== undefined && this.time - last < TUNE_H.mega.touchCd) return;
    this._megaHit.set(e, this.time);
    if (bossy(e)) {
      if (!this.novaBossHit) { this.novaBossHit = true; this.em?.nova?.(e.x, e.z, 0.5, this.hero.id); this.run.shake?.(0.3, 0.3); }
      return;
    }
    const l = d || 1;
    this._novaHit(e, dx / l, dz / l, TUNE_H.mega.heavyDizzy);
    this.run.shake?.(0.1, 0.12);
  }

  _implode(n) {
    const em = this.em;
    const inner = (this.hero.nova?.implode ?? 4) * (this.mods.novaRadiusMult || 1);
    em?.nova?.(n.x, n.z, inner, this.hero.id);
    const snap = this._snapshot();
    for (const e of snap) {
      if (isGone(e) || bossy(e)) continue;
      if (Math.hypot(e.x - n.x, e.z - n.z) < inner + radiusOf(e) && smashableOf(e)) em.smash?.(e, { dirX: 0, dirZ: 1, byNova: true });
    }
    em?.dizzyRadius?.(n.x, n.z, n.r, 3);
    this.G.fx?.burst?.('ring', n.x, 0.2, n.z, { radius: n.r, color: 0xff7ad9 });
    this.G.fx?.burst?.('stars', n.x, 1, n.z, { count: 16 });
    this.run.shake?.(0.6, 0.5);
    this.run.hitStop?.(90);
    this.G.bus?.emit('player:implode', { x: n.x, z: n.z, radius: inner });
  }

  // ---------- lightning visuals ----------
  _bolt(tx, tz, fromX, fromY, fromZ) {
    const b = this.bolts.find((q) => !q.on) || this.bolts[0];
    b.on = true; b.t = 0;
    const segs = TUNE_H.boltSegs;
    const sx = fromX ?? tx + (rand() - 0.5) * 2, sy = fromY ?? 14, sz = fromZ ?? tz - 3;
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const j = i === 0 || i === segs ? 0 : 0.55;
      b.pts[i * 3] = sx + (tx - sx) * k + (rand() - 0.5) * j;
      b.pts[i * 3 + 1] = sy + (0.1 - sy) * k;
      b.pts[i * 3 + 2] = sz + (tz - sz) * k + (rand() - 0.5) * j;
    }
    this.G.fx?.burst?.('sparks', tx, 0.3, tz, { count: 14, color: 0xfff27a });
    this.G.bus?.emit('player:bolt', { x: tx, z: tz });
  }

  // ---------- damage response (called by Run.hurtPlayer) ----------
  onHurt(srcX, srcZ, kbMult = 1) {
    const s = this.state;
    s.iframes = TUNE.player.iframes;
    this.hurtBlinkT = TUNE.player.iframes;
    this.model.setBlink?.(true);
    this.model.flash?.(0.14);
    this.model.squash?.(1.3, 0.72, 1.3);
    if (s.dashing) { this.blinking = false; s.dashing = false; this.cooldownT = TUNE.dash.cooldown; }
    s.sprinting = false;
    let dx = s.x - srcX, dz = s.z - srcZ, d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = -Math.sin(s.rotY); dz = -Math.cos(s.rotY); d = 1; }
    const kb = TUNE_H.hurtKnockSpeed * Math.sqrt(clamp(kbMult, 0.6, 2.2));   // distance ∝ v²
    s.vx = (dx / d) * kb; s.vz = (dz / d) * kb;
    this.hurtStunT = TUNE_H.hurtStun;
    this._nmGen++;
  }
  onShieldBlock(srcX, srcZ) {
    const s = this.state;
    s.iframes = Math.max(s.iframes, TUNE_H.shieldIframes);
    this.model.flash?.(0.1);
    let dx = s.x - srcX, dz = s.z - srcZ, d = Math.hypot(dx, dz) || 1;
    s.vx = (dx / d) * TUNE_H.shieldKnock; s.vz = (dz / d) * TUNE_H.shieldKnock;
    this._nmGen++;
  }
  /** hearts hit 0 the first time: float in a bubble, frozen, waiting for the button */
  onSecondChance() {
    const s = this.state;
    s.dashing = false; s.sprinting = false; this.blinking = false;
    if (s.nova) this._endNova();
    s.vx = 0; s.vz = 0;
    s.bubbled = true;
    this.hurtBlinkT = 0;
    this.model.setBlink?.(false);
  }

  onDeath() {
    const s = this.state;
    s.dead = true; s.dashing = false; s.sprinting = false; this.blinking = false;
    if (s.nova) this._endNova();
    s.vx = 0; s.vz = 0;
    this.spin = 16;
    this.model.setBlink?.(false);
    this.hurtBlinkT = 0;
  }
  onRevive(iframes = 2, hearts = null) {
    const s = this.state;
    s.dead = false; s.bubbled = false; s.hp = hearts ? Math.min(s.maxHp, hearts) : s.maxHp;
    s.iframes = iframes; this.hurtBlinkT = iframes;
    this.model.setBlink?.(true);
    s.lockout = false; s.tired = false; s.stamina = s.maxStamina;
    this.spin = 0; this.riseT = 0.5;
    this.model.squash?.(0.8, 1.3, 0.8);
  }

  // ---------- Mochi passive: Bouncy Belly ----------
  _bellyBump(e, dx, dz, d) {
    const pas = this.hero.passive;
    if (pas?.id !== 'bouncyBelly' || bossy(e)) return false;
    const s = this.state;
    if (Math.hypot(s.vx, s.vz) < 1) return false;
    const fx = Math.sin(s.rotY), fz = Math.cos(s.rotY);
    if ((dx * fx + dz * fz) / (d || 1) < 0.5) return false;           // only from the front
    const l = d || 1;
    const last = this._bumped.get(e);
    if (last !== undefined && this.time - last < (pas.bumpCooldown ?? 1.5)) {
      // on cooldown: the belly just shoves it along (still no damage from the front)
      const ov = s.radius + radiusOf(e) - d + 0.03;
      if (ov > 0) { e.x += (dx / l) * ov; e.z += (dz / l) * ov; }
      return true;
    }
    this._bumped.set(e, this.time);
    this.em?.knock?.(e, dx / l, dz / l, pas.bumpSpeed ?? 6, { byPlayer: true, bump: true });
    this.model.squash?.(1.25, 0.8, 0.85);
    this.G.bus?.emit('player:bump', { x: e.x, z: e.z });
    return true;
  }

  // ---------- near-miss — 躲得漂亮 ----------
  _nearMiss(list) {
    const s = this.state;
    const margin = TUNE.nearMiss.margin;
    const hurtRecently = this.hurtBlinkT > 0 && s.hp < s.maxHp;
    for (const e of list) {
      if (isGone(e) || !harmfulOf(e)) continue;
      let rec = this._nm.get(e);
      if (!rec) { rec = { cand: false, gen: 0, last: -9 }; this._nm.set(e, rec); }
      if (rec.gen !== this._nmGen) { rec.cand = false; rec.gen = this._nmGen; }
      const dx = e.x - s.x, dz = e.z - s.z, d = Math.hypot(dx, dz);
      const zone = s.radius + radiusOf(e) + margin;
      if (d < zone) {
        const rvx = (e.vx || 0) - s.vx, rvz = (e.vz || 0) - s.vz;
        const closing = dx * rvx + dz * rvz < 0;
        if (closing && Math.hypot(rvx, rvz) > 1.2) rec.cand = true;
        else if (!closing && rec.cand) this._fireNearMiss(e, rec, hurtRecently);
      } else if (rec.cand) this._fireNearMiss(e, rec, hurtRecently);
    }
  }
  _fireNearMiss(e, rec, hurtRecently) {
    rec.cand = false;
    if (hurtRecently || this.time - rec.last < TUNE.nearMiss.cooldownPerEnemy) return;
    rec.last = this.time;
    this.run.onNearMiss?.(e, this.state.x, this.state.z);
  }

  // ---------- world gimmicks & arena ----------
  _worldGimmicks(dt) {
    const s = this.state, w = this.G.world, run = this.run;
    if (!w || s.dead) return;
    try {
      const hit = w.bumperHit?.(s.x, s.z, TUNE_H.bodyR * s.size);
      if (hit) {
        const nx = hit.nx ?? 0, nz = hit.nz ?? 0;
        for (let i = 0; i < 8 && w.bumperHit(s.x, s.z, TUNE_H.bodyR * s.size); i++) { s.x += nx * 0.08; s.z += nz * 0.08; }
        const vn = s.vx * nx + s.vz * nz;
        if (vn < 0) { s.vx -= 2 * vn * nx; s.vz -= 2 * vn * nz; }
        s.vx += nx * 3; s.vz += nz * 3;
        if (s.dashing && !this.blinking) this.endDash(true);
      }
      if (w.solidAt && !s.dashing && !s.mega && this.riseT <= 0 && !w.solidAt(s.x, s.z)) {
        // fell into a glitch hole: oof, hop back toward the centre
        run.hurtPlayer(TUNE_H.hole.hurt, s.x * 1.1, s.z * 1.1, 'fall');
        const d = Math.hypot(s.x, s.z) || 1;
        s.vx = (-s.x / d) * TUNE_H.hole.push; s.vz = (-s.z / d) * TUNE_H.hole.push;
        this.hurtStunT = 0.3; this.riseT = 0.4;
      }
    } catch { /* world gimmicks are optional */ }
    // Shrink Storm: outside the play radius pushes the hero back in; the 1♥ / 1.5 s tick is
    // waves.js' (it owns the storm) — only if the director doesn't tick do we hurt here
    if (run.mode === 'storm') {
      const d = Math.hypot(s.x, s.z);
      const R = run.arenaRadius - TUNE_H.bodyR;
      if (d > R && d > 0.01) {
        s.x -= (s.x / d) * TUNE_H.stormZone.push * dt; s.z -= (s.z / d) * TUNE_H.stormZone.push * dt;
        if (!(run.waves && 'stormTick' in run.waves)) {
          this._stormTick -= dt;
          if (this._stormTick <= 0) { this._stormTick = DATA.modes?.storm?.stormTick ?? TUNE_H.stormZone.tick; run.hurtPlayer(1, s.x * 1.2, s.z * 1.2, 'storm'); }
        }
      } else this._stormTick = TUNE_H.stormZone.grace;
    }
  }

  _maxR() {
    const run = this.run;
    const R = run.mode === 'storm' ? run.baseArenaRadius ?? run.arenaRadius : run.arenaRadius;
    return Math.max(1, (R ?? 11) - TUNE_H.bodyR * this.state.size);
  }

  _clampArena() {
    const s = this.state;
    const R = this._maxR();
    const d = Math.hypot(s.x, s.z);
    if (d > R) {
      const nx = s.x / d, nz = s.z / d;
      s.x = nx * R; s.z = nz * R;
      const vn = s.vx * nx + s.vz * nz;
      if (vn > 0) { s.vx -= vn * nx; s.vz -= vn * nz; }
    }
  }

  // ============ render (every state) ============
  /** mode: 'play' | 'idle' | 'victory' | 'dying' */
  render(dt, rdt, mode = 'play') {
    const s = this.state, run = this.run;
    const time = this.G.time?.real ?? this.time;
    // --- pose ---
    let y = 0;
    if (this.riseT > 0) y += Math.sin((1 - this.riseT / TUNE_H.nova.rise) * Math.PI) * TUNE_H.nova.riseH;
    if (mode === 'victory') {
      this.celebrate = true;
      s.rotY = angleLerp(s.rotY, 0, Math.min(1, 4 * rdt));
    } else if (mode === 'idle' && !s.dashing) {
      s.rotY = angleLerp(s.rotY, 0, Math.min(1, 3 * dt));
    }
    if (mode === 'bubble' || s.bubbled) {
      y += TUNE_H.bubbleY + Math.sin(time * 2.4) * 0.12;
      s.rotY = angleLerp(s.rotY, 0, Math.min(1, 3 * rdt));
    } else if (mode === 'dying' || s.dead) {
      this.spin = Math.max(2.5, this.spin - 10 * dt);
      s.rotY += this.spin * dt;
    }
    s.y = y;
    s.invuln = s.iframes > 0 || s.dashing || s.mega || s.dead || !!s.bubbled || run.state !== 'playing';
    const g = this.model.group;
    g.position.set(s.x, y, s.z);
    g.rotation.y = s.rotY;
    g.scale.setScalar(s.size);

    // --- look at the nearest threat ---
    let lx = 0, ly = 0;
    const em = this.em;
    if (em?.list && !s.dead) {
      let best = null, bd = TUNE_H.lookRange;
      for (const e of em.list) {
        if (isGone(e)) continue;
        const d = Math.hypot(e.x - s.x, e.z - s.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const dx = (best.x - s.x) / (bd || 1), dz = (best.z - s.z) / (bd || 1);
        const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        lx = clamp(dx * c - dz * sn, -1, 1);
        ly = clamp(-(dx * sn + dz * c) * 0.4, -1, 1) * 0.5;
      }
    }
    this._lookX += (lx - this._lookX) * Math.min(1, 8 * rdt);
    this._lookY += (ly - this._lookY) * Math.min(1, 8 * rdt);

    const a = this._anim;
    const sp = Math.hypot(s.vx, s.vz);
    a.moving = mode === 'play' && sp > 0.3 && !s.dashing;
    a.speed = clamp(sp / (this.hero.speed || 6.5), 0, 1);
    a.dashing = s.dashing;
    a.sprinting = s.sprinting;
    a.tired = s.lockout;
    a.hurt = this.hurtStunT > 0;
    a.airborne = y > 0.05;
    a.lookX = this._lookX; a.lookY = this._lookY;
    a.celebrate = mode === 'victory';
    a.glow = run.novaReady ? 0.55 + 0.45 * Math.sin(time * 6) : s.nova ? 1 : 0;
    a.expr = s.bubbled ? EXPR.HURT : s.dead || mode === 'dying' ? EXPR.DIZZY
      : mode === 'victory' ? EXPR.JOY
        : this.hurtStunT > 0 ? EXPR.HURT
          : s.dashing || s.nova ? EXPR.FOCUS : undefined;
    try { this.model.update(dt, a); } catch (err) { if (!this._warned) { this._warned = true; console.error('[player] model.update failed', err); } }

    // --- shadow ---
    this.shadows.begin();
    this.shadows.add(s.x, s.z, 1.05 * s.size, y);
    this.shadows.end();
    this.groundRing.visible = !this.model.ring && !s.dead && mode !== 'victory';
    this.groundRing.position.set(s.x, 0.03, s.z);
    this.groundRing.scale.setScalar(s.size);
    this.groundMat.opacity = TUNE_H.groundRing.opacity * (s.bubbled ? 0.4 : 1) * (0.85 + 0.15 * Math.sin(time * 3));

    this._renderPips(rdt, mode, time);
    this._renderKit(dt, rdt, time);
  }

  _renderPips(rdt, mode, time) {
    const s = this.state;
    const cost = this.hero.dashCost ?? TUNE.dash.cost;
    const n = clamp(Math.floor(s.maxStamina / cost + 1e-6), 1, 16);
    if (n !== this.pipN) this._rebuildPips(n);
    const want = mode === 'play' && !s.dead && (s.stamina < s.maxStamina - 0.5 || s.lockout) ? 1 : 0;
    const rate = want ? TUNE_H.pip.fadeIn : TUNE_H.pip.fadeOut;
    this.pipAlpha += (want - this.pipAlpha) * Math.min(1, rate * rdt);
    const vis = this.pipAlpha > 0.02;
    this.pipMesh.visible = vis; this.pipTrack.visible = vis;
    if (!vis) return;
    this.pipMat.opacity = 0.95 * this.pipAlpha;
    this.pipTrackMat.opacity = 0.28 * this.pipAlpha;
    const filled = s.stamina / cost;
    const seg = TAU / n;
    const sc = s.size;
    const pulse = s.lockout ? 0.75 + 0.25 * Math.sin(time * 6) : 1;
    if (this.pipShakeT > 0) this.pipShakeT -= rdt;
    const shake = this.pipShakeT > 0 ? Math.sin(time * 70) * 0.09 * (this.pipShakeT / TUNE_H.pip.shake) : 0;
    for (let i = 0; i < n; i++) {
      const f = clamp(filled - i, 0, 1);
      if (s.lockout) this._pc.copy(this._cTired).multiplyScalar(f > 0 ? pulse : 0.35 * pulse);
      else if (f >= 1) this._pc.copy(this._cFull);
      else if (f > 0) this._pc.copy(this._cEmpty).lerp(this._cPart, 0.4 + f * 0.6);
      else this._pc.copy(this._cEmpty);
      this.pipMesh.setColorAt(i, this._pc);
      this._e.set(0, -i * seg, 0);
      this._q.setFromEuler(this._e);
      this._v.set(s.x + shake, 0.04, s.z);
      const pop = f >= 1 && !s.lockout ? 1 : 0.94;
      this._s.set(sc * pop, 1, sc * pop);
      this._m.compose(this._v, this._q, this._s);
      this.pipMesh.setMatrixAt(i, this._m);
    }
    this.pipMesh.count = n;
    this.pipMesh.instanceMatrix.needsUpdate = true;
    if (this.pipMesh.instanceColor) this.pipMesh.instanceColor.needsUpdate = true;
    this.pipTrack.position.set(s.x + shake, 0.035, s.z);
    this.pipTrack.scale.setScalar(sc);
  }

  _renderKit(dt, rdt, time) {
    const s = this.state;
    // wells
    for (const w of this.wells) {
      const m = w.mesh;
      if (!w.on) { m.visible = false; continue; }
      m.visible = true;
      const k = w.t / w.dur;
      const a = clamp(w.t / 0.15, 0, 1) * clamp((w.dur - w.t) / 0.3, 0, 1);
      m.position.set(w.x, 0.06, w.z);
      m.scale.setScalar(w.r * (0.9 + 0.1 * Math.sin(time * 10)) * (1 - k * 0.15));
      m.material.uniforms.uAlpha.value = a;
      m.material.uniforms.uTime.value = time;
    }
    // black hole
    const n = s.nova;
    if (n && n.kind === 'blackhole') {
      const k = clamp(n.t / n.dur, 0, 1);
      const m = this.holeMesh;
      m.visible = true;
      m.position.set(n.x, 0.08, n.z);
      // the pull radius is huge (r 11): draw the vortex smaller and lighter so the field stays readable
      m.scale.setScalar(n.r * 0.62 * (0.35 + 0.65 * Math.min(1, n.t / 0.35)) * (1 - 0.35 * k));
      m.material.uniforms.uAlpha.value = 0.8 * clamp(n.t / 0.2, 0, 1);
      m.material.uniforms.uTime.value = time * (1 + k * 2);
    } else this.holeMesh.visible = false;
    // bolts
    let bi = 0;
    const segs = TUNE_H.boltSegs;
    for (const b of this.bolts) {
      if (!b.on) continue;
      b.t += rdt;
      if (b.t >= TUNE_H.boltLife) { b.on = false; continue; }
      const wdt = 0.36 * (1 - b.t / TUNE_H.boltLife) + 0.06;
      for (let i = 0; i < segs; i++) {
        this._v.set(b.pts[i * 3], b.pts[i * 3 + 1], b.pts[i * 3 + 2]);
        this._v2.set(b.pts[i * 3 + 3], b.pts[i * 3 + 4], b.pts[i * 3 + 5]).sub(this._v);
        const len = this._v2.length() || 0.001;
        this._v2.multiplyScalar(1 / len);
        this._q.setFromUnitVectors(this._up, this._v2);
        this._s.set(wdt, len, wdt);
        this._m.compose(this._v, this._q, this._s);
        this.boltMesh.setMatrixAt(bi++, this._m);
      }
    }
    this.boltMesh.count = bi;
    this.boltMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    const sc = this.G.scene;
    sc?.remove(this.model.group);
    try { this.model.dispose?.(); } catch { /* ignore */ }
    sc?.remove(this.shadows.mesh);
    this.shadows.mesh.geometry.dispose();
    this.shadows.mesh.material.map?.dispose();
    this.shadows.mesh.material.dispose();
    this.shadows.mesh.dispose?.();
    sc?.remove(this.pipMesh, this.pipTrack);
    this.pipMesh.geometry.dispose(); this.pipMat.dispose(); this.pipMesh.dispose?.();
    this.pipTrack.geometry.dispose(); this.pipTrackMat.dispose();
    sc?.remove(this.groundRing); this.groundRing.geometry.dispose(); this.groundMat.dispose();
    sc?.remove(this.kit);
    for (const w of this.wells) w.mesh.material.dispose();
    this.holeMesh.material.dispose();
    this._discGeo.dispose();
    this.boltMesh.geometry.dispose(); this.boltMesh.material.dispose(); this.boltMesh.dispose?.();
  }
}
