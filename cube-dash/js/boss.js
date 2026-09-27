// ─────────────────────────────────────────────────────────────
// CUBE DASH — KING GLITCH 故障大王 (one modular boss rig, one new move per world)
//
// Created through em.spawnBoss(opts) (enemies.js). Lives in em.boss AND em.list
// (isBoss:true) so dash / aim-assist code sees it like any other cube.
//   read:  hp, maxHp, name, x, z, radius, coreOpen, stagger, staggerMax,
//          harmful, smashable, phase, weary, mode, dead, speedK
//   call:  hitCore({perfect})  → bool  (dash into the OPEN core: 1 crack — a perfect still counts 1, kid rule §7.13)
//          novaHit()           → bool  (1 crack + dizzy 3 s)
//          addStagger(v, src)  (knocked cube +34, bonk near +10, perfect near +15)
//          onKnock(...)        (dash into the shell: CLANG, no effect)
//          threatTTC(px, pz, r, pvx, pvz)  (Perfect detection)
// Moves: Hop Slam · Minion Call · Ram Charge (W2+) · Laser Spin (W3+) ·
//        Glitch Rain (W4+) · Double Slam (W5+) · W6 finale: Glitch Core chase.
// Telegraphs are drawn through em.decals (ORANGE stripes → white flash).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TAU, clamp, lerp, len2, rand } from './core.js';
import { roundedBoxGeometry, createCubeMaterial, EXPR } from './art.js';
import { DATA } from './data.js';
import { tl, t, addStrings } from './i18n.js';
import { crownGeometry, mergeGeos, rayToRim, angDiff, turnTo } from './enemies.js';

const BD = DATA.boss;
const D = DATA.TUNE;
const MV = BD.moves;
const DEG = Math.PI / 180;

const TUNE = {
  introTime: 2.2,
  walkSpeed: 1.3, keepDist: 3.0,
  hopHeight: 5.5,
  recoilTime: 0.75, recoilDist: 1.6,
  hitCd: 0.35,
  wearyColor: 0x9a2238,       // kid rule 13: fight ≤ 2.5 min → the king gets WEARY (easier), never enraged
  wearySlow: 0.85, wearyDizzy: 2.5,
  minionCap: 10,
  phaseRise: 1.6,
  crackMax: 12,
  chaseRadiusK: 0.8,
  chaseZig: 0.6, chaseZigDeg: 50, chaseHitSpeed: 18, coreSize: 1.0,
  chaseHeadStart: 1.2, chaseEaseAfter: 4, chaseEaseRate: 0.35, chaseMinSpeed: 4.2,   // the core tires if you can't catch it (never unwinnable)
  deathTime: 1.6,
  autoCoreHit: true,         // fallback when no player.js controller resolves the dash
  driveShake: false,         // run.js shakes / hit-stops on boss:hit, boss:slam, enemy:bonk
  laserGapStart: 2.0, laserGapLen: 1.7,   // guaranteed safe band along every beam (u past the body)
  rings: 6,
  slamPushSpeed: 9,
  laserStartR: 0.85,         // beams start at the body surface (× radius)
  slamTrack: 0.25,           // the landing circle follows the hero only this long, then LOCKS (walkable escape ≥ 0.9 s)
  phaseEps: 0.01,            // 2/3 cracks left counts as "66%" (a 3-crack king still gets all three phases)
};
const COL = {
  crown: 0xffc630, core: BD.coreColor, crack: 0xff3df2, metal: 0x3a3450, shutter: 0x6b6f8f,
  glitchA: 0xff3df2, glitchB: 0x3df2ff, beamGlow: 0xffa23a, beamCore: 0xfffbe8, flame: 0xffa531, aim: 0xfff4c2, safe: 0x62f4ff,
  tint: 0xffe8f2,
};

addStrings({
  zh: { 'boss.core': '故障核心', 'boss.coreSub': '追上去撞它!', 'boss.phase': '第{n}阶段', 'boss.weary': '大王累啦!', 'boss.stagger': '晕啦!' },
  en: { 'boss.core': 'GLITCH CORE', 'boss.coreSub': 'Catch it — DASH!', 'boss.phase': 'PHASE {n}', 'boss.weary': 'KING IS TIRED!', 'boss.stagger': 'STAGGERED!' },
});

export class Boss {
  constructor(G, run, em, opts = {}) {
    this.G = G; this.run = run; this.em = em; this.bus = G.bus;
    const wi = clamp(opts.worldIndex ?? run?.worldIndex ?? 0, 0, 5);
    this.worldIndex = wi;
    this.finale = opts.finale ?? (wi === 5 && (run?.mode ?? 'stage') === 'stage');
    this.final = opts.final ?? true;
    // em.list record shape
    this.id = opts.id ?? 0; this.type = 'boss'; this.sizeKey = 'XL'; this.isBoss = true;
    this.elite = null; this.treasure = false; this.stationary = true;
    this.bossId = BD.id; this.name = tl(BD.name);
    this.size = BD.size; this.radius = BD.size * 0.5 * 1.08; this.mass = 99;
    this.hearts = BD.contactHearts; this.color = BD.color;
    const R = em.R;
    this.x = opts.x ?? 0; this.z = opts.z ?? -R * 0.42; this.y = 0;
    this.vx = 0; this.vz = 0; this.rotY = 0;
    this.maxHp = Math.max(1, Math.round(BD.cracks[wi] * (opts.hpMult ?? 1)));
    this.hp = this.maxHp;
    this.phase = 1; this.stagger = 0; this.staggerMax = BD.stagger.max;
    const sp = clamp(Math.round(opts.startPhase ?? run?.bossPhase ?? 1), 1, 3);
    if (sp > 1 && !opts.noCheckpoint) {                     // 🚩 retry from phase N
      this.phase = sp;
      this.hp = Math.max(1, Math.min(this.maxHp - 1, Math.floor(this.maxHp * (BD.phaseAt[sp - 2] + TUNE.phaseEps) + 1e-6)));
    }
    this.state = 'portal'; this.coreOpen = false; this.smashable = false; this.harmful = false;
    this.dead = false; this.removeMe = false;
    this.mode = 'intro'; this.modeT = 0; this.gap = 0; this.fightT = 0; this.enraged = false; this.weary = false; this.invulnT = 0;
    // kid rule 13: each failed attempt slows attacks 10% (min 70%); retry from a phase checkpoint
    const attempt = Math.max(0, opts.attempt ?? run?.attempt ?? 0);
    this.slowK = Math.max(BD.failSlowMin ?? 0.7, 1 - (BD.failSlowStep ?? 0.1) * attempt);
    this.wearyAt = Math.min(BD.maxFightSeconds ?? 150, BD.enrageAt?.[wi] ?? 150);
    this.ringQ = [];
    this.act = null; this.rotIdx = 0; this.moveId = 0; this.charging = false; this.dirX = 0; this.dirZ = 1;
    this.dizzyT = 0; this.hitCd = 0; this.flashT = 0; this.sq = 1; this.sqV = 0; this.coreK = 0;
    this.pushT = 0; this.pushNx = 0; this.pushNz = 0; this.recX = 0; this.recZ = 0;
    this.slamHzT = 0; this.slamX = 0; this.slamZ = 0;
    this.introT = opts.introTime ?? TUNE.introTime;
    this.chaseHits = 0; this.kvx = 0; this.kvz = 0; this.zigT = 0; this.zigSign = 1; this.mineT = 0; this.sinceHit = 0;
    this.deathT = 0; this._ovF = 0; this._steamT = 0; this._glitchSeed = rand() * 100; this._bucket = 0;
    this.rotations = { 1: this._rotation(1), 2: this._rotation(2), 3: this._rotation(3) };
    // ----- hazards (run.hazards) -----
    const self = this;
    this.hzBody = em.makeHazard('boss', BD.contactHearts, (x, z, r) => len2(x - self.x, z - self.z) < self.radius * 0.95 + r, false, { boss: true });
    this.hzSlam = em.makeHazard('slam', MV.slam.hearts, (x, z, r) => len2(x - self.slamX, z - self.slamZ) < MV.slam.radius + r, false, { boss: true });
    this.rings = [];
    for (let i = 0; i < TUNE.rings; i++) {
      const ring = { x: 0, z: 0, r: 0, on: false };
      ring.hz = em.makeHazard('ring', MV.slam.ringHearts, (x, z, r) => Math.abs(len2(x - ring.x, z - ring.z) - ring.r) < MV.slam.ringWidth * 0.5 + r * 0.6, true, { boss: true });
      this.rings.push(ring);
    }
    this.lasers = [];
    for (let i = 0; i < 4; i++) {
      const L = { a: 0, len: 0, on: false, g0: 0, g1: 0 };
      L.hz = em.makeHazard('laser', MV.laser.hearts, (x, z, r) => {
        const dx = Math.sin(L.a), dz = Math.cos(L.a), px = x - self.x, pz = z - self.z;
        const along = px * dx + pz * dz;
        if (L.g1 > L.g0 && along > L.g0 + r && along < L.g1 - r) return false;   // guaranteed safe gap
        const tt = clamp(along, self.radius * TUNE.laserStartR, L.len);
        return len2(px - dx * tt, pz - dz * tt) < MV.laser.width * 0.5 + r;
      }, true, { boss: true });
      this.lasers.push(L);
    }
    this.mines = [];
    for (let i = 0; i < 4; i++) {
      const m = { x: 0, z: 0, t: 0, fuse: 1, on: false, boomT: 0 };
      m.hz = em.makeHazard('mine', 1, (x, z, r) => len2(x - m.x, z - m.z) < BD.coreChase.mineRadius + r * 0.5, true, { boss: true });
      this.mines.push(m);
    }
    this._buildRig();
    this._setRunBoss(this);
    this.bus.emit('boss:intro', { x: this.x, z: this.z, bossId: this.bossId, name: this.name, worldIndex: wi, maxHp: this.maxHp });
  }

  _setRunBoss(v) { try { if (this.run && (v || this.run.boss === this)) this.run.boss = v; } catch { /* run.boss may be a getter */ } }

  /** move rotation for a phase, filtered by world availability, padded to ≥ 3 moves */
  _rotation(ph) {
    const ok = (m) => (MV[m]?.world ?? 0) <= this.worldIndex;
    const rot = (BD.rotations[ph] || BD.rotations[1]).filter(ok);
    const pool = ['slam', 'summon', 'charge', 'laser', 'rain'].filter(ok);
    let i = 0;
    while (rot.length < 3) rot.push(pool[i++ % pool.length]);
    return rot;
  }

  /** rotation index a new phase opens with: this world's signature move (a king never falls without showing it),
   *  else the first move that isn't a Hop Slam (a slam opener = a free 4 s dizzy → W1 was only ever slams) */
  _phaseOpener(ph) {
    const rot = this.rotations[ph] || this.rotations[1];
    const sig = Object.keys(MV).find((m) => MV[m].world === this.worldIndex);
    let i = sig ? rot.indexOf(sig) : -1;
    if (i < 0) i = rot.findIndex((m) => m !== 'slam' && m !== 'double');
    return Math.max(0, i);
  }

  get solid() { return !this.removeMe && !this.dead && this.y < 1.0; }
  get R() { return this.em.R; }
  /** telegraph time: assist ×1.3, failed attempts / weary → longer (never shorter than data) */
  tele(base) { return base * (this.run?.assist ? D.assist.telegraph : 1) / this.speedK; }
  /** attack speed factor (≤ 1): failed-attempt slowdown × weary */
  get speedK() { return this.slowK * (this.weary ? TUNE.wearySlow : 1); }

  // ─────────────── rig ───────────────
  _buildRig() {
    const S = BD.size;
    const g = this.group = new THREE.Group(); g.name = 'kingGlitch';
    this.G.scene.add(g);
    this._geos = []; this._mats = [];
    const own = (x) => { (x.isMaterial ? this._mats : this._geos).push(x); return x; };
    this.pivot = new THREE.Group(); g.add(this.pivot);
    this.bodyGeo = own(roundedBoxGeometry(0.2, 4).clone());
    this.bodyMat = own(createCubeMaterial({ color: BD.color }));
    this.body = new THREE.Mesh(this.bodyGeo, this.bodyMat);
    this.body.scale.setScalar(S); this.body.position.y = S / 2;
    this.pivot.add(this.body);
    this.baseColor = new THREE.Color(BD.color); this.wearyCol = new THREE.Color(TUNE.wearyColor);
    this.tint = new THREE.Color(COL.tint); this._c = new THREE.Color();
    // core socket on the forehead (body-local unit coords, face = +Z)
    const metal = own(new THREE.MeshStandardMaterial({ color: COL.metal, metalness: 0.6, roughness: 0.35 }));
    const sock = new THREE.Mesh(own(new THREE.TorusGeometry(0.1, 0.025, 8, 20)), metal);
    sock.position.set(0, 0.345, 0.5); this.body.add(sock);
    this.coreMat = own(new THREE.MeshBasicMaterial({ color: COL.core, toneMapped: false }));
    this.core = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.085, 0)), this.coreMat);
    this.core.position.set(0, 0.345, 0.5); this.core.scale.set(1, 1.3, 0.6);
    this.body.add(this.core);
    const shMat = own(new THREE.MeshStandardMaterial({ color: COL.shutter, metalness: 0.7, roughness: 0.3 }));
    const shGeo = own(new THREE.BoxGeometry(0.1, 0.19, 0.035));
    this.shutL = new THREE.Mesh(shGeo, shMat); this.shutR = new THREE.Mesh(shGeo, shMat);
    this.shutL.position.set(-0.05, 0.345, 0.515); this.shutR.position.set(0.05, 0.345, 0.515);
    this.body.add(this.shutL, this.shutR);
    // floating crown
    this.crownMat = own(new THREE.MeshStandardMaterial({ color: COL.crown, metalness: 0.65, roughness: 0.28, emissive: 0x6a4300, side: THREE.DoubleSide }));
    this.crown = new THREE.Mesh(own(crownGeometry(0.42, 0.3, 5)), this.crownMat);
    this.crown.scale.setScalar(2.1);
    g.add(this.crown);
    const gem = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.12, 0)), this.coreMat);
    gem.position.set(0, 0.2, 0.43); this.crown.add(gem);
    // glowing cracks (= lost HP), pre-generated, revealed one by one
    this.crackMat = own(new THREE.MeshBasicMaterial({ color: COL.crack, toneMapped: false }));
    this.cracks = [];
    const faces = [[0, 1], [1, 0], [-1, 0], [0, 2], [1, 2], [-1, 2]];   // top, +x, -x, front-low, back…
    for (let i = 0; i < TUNE.crackMax; i++) {
      const geo = this._crackGeo(i, faces[i % faces.length]);
      const m = new THREE.Mesh(own(geo), this.crackMat);
      m.visible = false; this.body.add(m); this.cracks.push(m);
    }
    // glitch slabs (scanline flicker)
    this.slabMatA = own(new THREE.MeshBasicMaterial({ color: COL.glitchA, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.slabMatB = own(new THREE.MeshBasicMaterial({ color: COL.glitchB, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const slabGeo = own(new THREE.BoxGeometry(1, 1, 1));
    this.slabs = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(slabGeo, i % 2 ? this.slabMatB : this.slabMatA);
      m.visible = false; this.pivot.add(m); this.slabs.push(m);
    }
    // W6 finale: the fleeing core
    this.bigCore = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.55, 0)), this.coreMat);
    this.bigCore.visible = false; g.add(this.bigCore);
    const halo = new THREE.Mesh(own(new THREE.TorusGeometry(0.75, 0.05, 8, 32)), this.slabMatB);
    halo.rotation.x = Math.PI / 2; this.bigCore.add(halo); this.bigHalo = halo;
    this._buildModule(this.worldIndex, own, metal);
  }

  _crackGeo(i, [axis, side]) {
    // zig-zag polyline of thin boxes lying on one body face (unit cube coords)
    const parts = [];
    let u = (rand() - 0.5) * 0.5, v = (rand() - 0.5) * 0.5;
    if (side === 2) v = -0.3 + rand() * 0.1;                          // front face: below the mouth only
    let ang = rand() * TAU;
    for (let s = 0; s < 4; s++) {
      const L = 0.09 + rand() * 0.08;
      ang += (rand() - 0.5) * 1.6;
      const du = Math.cos(ang) * L, dv = Math.sin(ang) * L;
      const b = new THREE.BoxGeometry(L, 0.018, 0.018);
      b.rotateZ(Math.atan2(dv, du));
      b.translate(u + du / 2, v + dv / 2, 0);
      // place onto the face
      if (side === 1 && axis === 0) { b.rotateX(-Math.PI / 2); b.translate(0, 0.505, 0); }
      else if (side === 0) { b.rotateY(axis * Math.PI / 2); b.translate(axis * 0.505, 0, 0); }
      else if (side === 2 && axis === 0) { b.translate(0, 0, 0.505); }
      else { b.rotateY(Math.PI); b.translate(0, 0, -0.505); }
      parts.push(b);
      u = clamp(u + du, -0.42, 0.42); v = clamp(v + dv, -0.42, side === 2 && axis === 0 ? -0.2 : 0.42);
    }
    return mergeGeos(parts);
  }

  _buildModule(wi, own, metal) {
    const S = BD.size;
    this.mod = new THREE.Group(); this.pivot.add(this.mod);
    this.modFlames = [];
    const flameMat = own(new THREE.MeshBasicMaterial({ color: COL.flame, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const glowMat = own(new THREE.MeshBasicMaterial({ color: COL.beamGlow, toneMapped: false }));
    if (wi === 1) {           // Ram Charge: twin rocket boosters on the back
      for (const sx of [-0.8, 0.8]) {
        const b = new THREE.Mesh(own(new THREE.CylinderGeometry(0.34, 0.42, 1.1, 14)), metal);
        b.rotation.x = Math.PI / 2; b.position.set(sx, S * 0.45, -S / 2 - 0.35); this.mod.add(b);
        const f = new THREE.Mesh(own(new THREE.ConeGeometry(0.3, 1.2, 12)), flameMat);
        f.rotation.x = -Math.PI / 2; f.position.set(sx, S * 0.45, -S / 2 - 1.3); this.mod.add(f); this.modFlames.push(f);
      }
    } else if (wi === 2) {    // Laser Spin: four emitter lenses
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        const l = new THREE.Mesh(own(new THREE.CylinderGeometry(0.22, 0.26, 0.24, 14)), glowMat);
        l.rotation.z = Math.PI / 2; l.rotation.y = a;
        l.position.set(Math.sin(a) * S * 0.72, S * 0.5, Math.cos(a) * S * 0.72); this.mod.add(l);
      }
    } else if (wi === 3) {    // Glitch Rain: cannon hatch on top
      const h = new THREE.Mesh(own(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 16)), metal);
      h.position.set(0, S + 0.2, -0.6); this.mod.add(h);
      const r = new THREE.Mesh(own(new THREE.TorusGeometry(0.55, 0.07, 8, 20)), glowMat);
      r.rotation.x = Math.PI / 2; r.position.set(0, S + 0.46, -0.6); this.mod.add(r);
    } else if (wi === 4) {    // Double Slam: spring coils under the body
      for (let k = 0; k < 4; k++) {
        const c = new THREE.Mesh(own(new THREE.TorusGeometry(0.45, 0.08, 6, 18)), metal);
        c.rotation.x = Math.PI / 2; c.position.set(k % 2 ? 0.9 : -0.9, 0.08, k < 2 ? 0.9 : -0.9);
        this.mod.add(c); this.modFlames.push(c);
      }
    } else if (wi === 5) {    // Glitch Core: orbiting glitch halo
      const h = new THREE.Mesh(own(new THREE.TorusGeometry(S * 0.85, 0.08, 8, 40)), this.slabMatA);
      h.position.y = S * 0.55; h.rotation.x = Math.PI / 2 + 0.3; this.mod.add(h); this.halo = h;
    }
  }

  // ─────────────── update ───────────────
  update(dt) {
    if (this.removeMe) return;
    const p = this.run?.player || null;
    this.flashT = Math.max(0, this.flashT - dt * 3);
    this.sqV += ((1 - this.sq) * 260 - this.sqV * 14) * dt;
    this.sq = clamp(this.sq + this.sqV * dt, 0.55, 1.5);
    if (this.hitCd > 0) this.hitCd -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.slamHzT > 0) { this.slamHzT -= dt; if (this.slamHzT <= 0) this.hzSlam.active = false; }
    this._updateRingQueue(dt);
    this._updateRings(dt);
    this._updateMines(dt);
    if (this.pushT > 0 && p) {
      this.pushT -= dt;
      const sp = BD.phaseShift.push / 0.35;
      p.x += this.pushNx * sp * dt; p.z += this.pushNz * sp * dt;
      const d = len2(p.x, p.z), lim = this.R - 0.6;
      if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
    }
    if (this.dead) { this._updateDeath(dt); this._publish(); return; }
    this.modeT += dt;
    if (this.mode !== 'intro') {
      this.fightT += dt;
      this.stagger = Math.max(0, this.stagger - BD.stagger.decay * dt);
      if (!this.weary && this.mode !== 'chase' && this.fightT >= this.wearyAt) this._makeWeary();
      if (this.weary && (this._steamT -= dt) <= 0) {
        this._steamT = 0.35;
        this._fx('dust', this.x + (rand() - 0.5) * 2, this.size + 0.3, this.z + (rand() - 0.5) * 2, { color: 0xffffff, count: 2, size: 0.8 });
      }
    }
    switch (this.mode) {
      case 'intro':
        this.rotY = turnTo(this.rotY, 0, 3 * dt);
        if (this.modeT > 0.5 && this.modeT < 0.6) this.sq = 1.25;
        if (this.modeT >= this.introT && this.run?.state !== 'bossIntro') this._toIdle(0.6);   // hero is frozen during the intro shot
        break;
      case 'idle': this._idle(dt, p); if (this.modeT >= this.gap) this._nextMove(p); break;
      case 'move': this._tickMove(dt, p); break;
      case 'dizzy':
        this.dizzyT -= dt;
        this.y = Math.max(0, this.y - 12 * dt);
        this.vx *= Math.max(0, 1 - 6 * dt); this.vz *= Math.max(0, 1 - 6 * dt);
        this.x += this.vx * dt; this.z += this.vz * dt;
        if (this.dizzyT <= 0) { this.coreOpen = false; this.sq = 1.25; this._toIdle(BD.moveGap * 0.6); }
        break;
      case 'recoil': {
        const k = clamp(this.modeT / TUNE.recoilTime, 0, 1);
        this.y = Math.sin(Math.PI * k) * 1.2;
        this.x += this.recX * (TUNE.recoilDist / TUNE.recoilTime) * dt;
        this.z += this.recZ * (TUNE.recoilDist / TUNE.recoilTime) * dt;
        if (k >= 1) { this.y = 0; this.sq = 0.75; this._toIdle(BD.moveGap); }
        break;
      }
      case 'phase': {
        const T = BD.phaseShift.time, k = clamp(this.modeT / T, 0, 1);
        this.y = Math.sin(Math.PI * k) * TUNE.phaseRise;
        this.rotY += dt * (k < 0.7 ? 8 : 2);
        if (k >= 1) { this.y = 0; this.sq = 0.65; this._toIdle(0.5); }
        break;
      }
      case 'chase': this._tickChase(dt, p); break;
    }
    // keep inside the arena
    const d = len2(this.x, this.z), lim = this.R - this.radius;
    if (d > lim) { this.x *= lim / d; this.z *= lim / d; }
    this._publish();
    this._playerContact(p);
  }

  _fx(kind, x, y, z, opts) { try { this.G.fx?.burst?.(kind, x, y, z, opts); } catch { /* */ } }
  _shake(k, s) { if (!TUNE.driveShake) return; try { this.G.cam?.shake?.(k, s); } catch { /* */ } }

  _publish() {
    const m = this.mode;
    this.smashable = !this.dead && (this.coreOpen || m === 'chase');
    this.harmful = !this.dead && !this.smashable && m !== 'intro' && m !== 'phase' && m !== 'recoil' && this.y < 1.0;
    this.state = this.dead ? 'dying' : m === 'intro' ? 'portal' : m === 'dizzy' ? 'dizzy' : m === 'recoil' ? 'knocked'
      : m === 'chase' ? 'chase' : m === 'move' ? (this.charging || this.act?.active ? 'charge' : 'windup') : m === 'phase' ? 'windup' : 'chase';
    this.hzBody.active = this.harmful;
    this.hzBody.hearts = this.charging ? MV.charge.hearts : BD.contactHearts;
    this.hearts = 2.2;                    // run.hurtPlayer: 1 heart, 'hearts' only scales knockback (big king = big bump)
    this.hzBody.srcX = this.x; this.hzBody.srcZ = this.z;
  }

  _playerContact(p) {
    if (!p || this.dead) return;
    const dx = p.x - this.x, dz = p.z - this.z, d = len2(dx, dz) || 1e-4;
    const rr = this.radius + (p.hurtRadius ?? D.player.hurtRadius);
    if (d >= rr + 0.05 || this.y > 1.0) { this._ovF = 0; return; }
    const ctl = typeof this.run?.playerCtl?.resolve === 'function';     // player.js owns contact damage + dash hits
    if (this.smashable && p.dashing) {                        // dash into the open core
      this._ovF++;
      if (TUNE.autoCoreHit && !ctl && this._ovF >= 2) this.hitCore({ perfect: !!(p.perfect || p.perfectDash || p.lastPerfect) });
      return;
    }
    this._ovF = 0;
    if (!ctl && this.harmful && !p.invuln && !p.dashing && this.run?.hurtPlayer) {
      try { this.run.hurtPlayer(this.hearts, this.x, this.z, 'boss'); } catch { /* */ }
    }
    if (this.mode !== 'chase') {                              // the king is a solid wall
      const push = this.radius + 0.45;
      if (d < push) { p.x = this.x + dx / d * push; p.z = this.z + dz / d * push; }
    }
  }

  _toIdle(gap) { this.mode = 'idle'; this.modeT = 0; this.gap = gap; this.act = null; this.charging = false; this._lasersOff(); }
  /** end of a move without its own punish window: weary kings flop over anyway */
  _endMove(gap) { if (this.weary) this._dizzy(TUNE.wearyDizzy, 'weary'); else this._toIdle(gap); }

  _idle(dt, p) {
    if (!p) return;
    const dx = p.x - this.x, dz = p.z - this.z, d = len2(dx, dz) || 1;
    this.rotY = turnTo(this.rotY, Math.atan2(dx, dz), 3 * dt);
    if (d > this.radius + TUNE.keepDist) {
      const sp = TUNE.walkSpeed * this.speedK;
      this.x += dx / d * sp * dt; this.z += dz / d * sp * dt;
      this.y = Math.abs(Math.sin(this.fightT * 5)) * 0.25;       // heavy stomp-walk
      if (Math.floor(this.fightT * 5 / Math.PI) !== Math.floor((this.fightT - dt) * 5 / Math.PI)) this.sq = 0.9;
    } else this.y = Math.max(0, this.y - 4 * dt);
  }

  _makeWeary() {
    this.weary = true;
    this.bus.emit('boss:weary', { x: this.x, z: this.z, textKey: 'boss.weary', text: t('boss.weary') });
  }

  // ─────────────── moves ───────────────
  _nextMove(p) {
    const rot = this.rotations[this.phase] || this.rotations[1];
    let name = rot[this.rotIdx % rot.length];
    this.rotIdx++;
    if (name === 'summon' && this.em.minionCount >= TUNE.minionCap) name = 'slam';
    this.moveId++;
    this.mode = 'move'; this.modeT = 0;
    const a = this.act = { name, t: 0, stage: 'start', active: false };
    const px = p ? p.x : 0, pz = p ? p.z : 0;
    switch (name) {
      case 'double': a.slams = 2; this._slamInit(a, MV.slam.fill, px, pz, TUNE.slamTrack); break;
      case 'slam': a.slams = 1; this._slamInit(a, MV.slam.fill, px, pz, TUNE.slamTrack); break;
      case 'charge': {
        a.fill = this.tele(MV.charge.fill); a.lock = a.fill * (MV.charge.lockAt / MV.charge.fill); a.stage = 'aim';
        const dx = px - this.x, dz = pz - this.z, d = len2(dx, dz) || 1;
        this.dirX = dx / d; this.dirZ = dz / d;
        this.bus.emit('enemy:windup', { x: this.x, z: this.z, type: 'boss', move: 'charge', dirX: this.dirX, dirZ: this.dirZ, time: a.fill });
        break;
      }
      case 'laser': {
        const ph = this.phase - 1;
        a.n = MV.laser.beams[ph] ?? 1;
        a.speed = (MV.laser.speed[ph] ?? 30) * DEG * this.speedK;
        a.dir = rand() < 0.5 ? -1 : 1;
        a.ang = Math.atan2(px - this.x, pz - this.z) + Math.PI / a.n;
        a.fill = this.tele(MV.laser.fill); a.stage = 'tele';
        this.bus.emit('enemy:windup', { x: this.x, z: this.z, type: 'boss', move: 'laser', dirX: 0, dirZ: 0, time: a.fill });
        break;
      }
      case 'rain': {
        a.n = MV.rain.count[this.phase - 1] ?? 8; a.i = 0; a.stage = 'drop'; a.fall = this.tele(MV.rain.fall); a.pts = [];
        this.bus.emit('boss:roar', { x: this.x, z: this.z, move: 'rain' });
        break;
      }
      case 'summon':
        a.stage = 'roar'; a.roar = MV.summon.roar;
        this.bus.emit('boss:roar', { x: this.x, z: this.z, move: 'summon' });
        this._shake(0.2, 0.5);
        break;
      default: this._toIdle(0.5);
    }
  }

  _slamInit(a, fill, px, pz, track = 0) {
    a.fill = this.tele(fill);
    a.track = Math.min(track, a.fill * 0.3);
    a.air = Math.min(MV.slam.air, a.fill * 0.8);
    a.crouch = a.fill - a.air;
    a.t = 0; a.stage = 'crouch';
    const lim = this.R - this.radius;
    const d = len2(px, pz);
    a.tx = d > lim ? px / d * lim : px; a.tz = d > lim ? pz / d * lim : pz;
    a.sx = this.x; a.sz = this.z;
    this.bus.emit('enemy:windup', { x: this.x, z: this.z, type: 'boss', move: 'slam', dirX: 0, dirZ: 0, time: a.fill });
  }

  _tickMove(dt, p) {
    const a = this.act;
    if (!a) { this._toIdle(0.5); return; }
    a.t += dt;
    switch (a.name) {
      case 'slam': case 'double': this._tickSlam(a, dt, p); break;
      case 'charge': this._tickCharge(a, dt, p); break;
      case 'laser': this._tickLaser(a, dt); break;
      case 'rain': this._tickRain(a, dt, p); break;
      case 'summon': this._tickSummon(a, dt, p); break;
    }
  }

  _tickSlam(a, dt, p) {
    if (a.stage === 'crouch') {
      if (p && a.t < a.track) {                               // circle follows the hero briefly, then locks (walk out = safe)
        const lim = this.R - this.radius, d = len2(p.x, p.z);
        a.tx = d > lim ? p.x / d * lim : p.x; a.tz = d > lim ? p.z / d * lim : p.z;
      }
      this.rotY = turnTo(this.rotY, Math.atan2(a.tx - this.x, a.tz - this.z), 6 * dt);
      this.sq = Math.min(this.sq, 0.8);
      if (a.t >= a.crouch) { a.stage = 'air'; a.sx = this.x; a.sz = this.z; this.sq = 1.35; this.bus.emit('boss:jump', { x: this.x, z: this.z }); }
    } else if (a.stage === 'air') {
      const k = clamp((a.t - a.crouch) / a.air, 0, 1);
      this.x = lerp(a.sx, a.tx, k); this.z = lerp(a.sz, a.tz, k);
      this.y = Math.sin(Math.PI * k) * TUNE.hopHeight;
      if (k >= 1) this._slamLand(a);
    } else if (a.stage === 'gap') {
      if (a.t >= 0.1) this._slamInit(a, MV.double.secondFill, p ? p.x : this.x, p ? p.z : this.z);
    }
  }

  _slamLand(a) {
    this.y = 0; this.x = a.tx; this.z = a.tz; this.sq = 0.6;
    const R = MV.slam.radius;
    this.slamX = this.x; this.slamZ = this.z; this.slamHzT = 0.12;
    this.hzSlam.active = true; this.hzSlam.srcX = this.x; this.hzSlam.srcZ = this.z;
    const nRings = MV.slam.rings?.[this.phase - 1] ?? 1;          // kid rule 13: 1/2/3 rings ≥ 1.2 s apart
    for (let k = 0; k < nRings; k++) this.ringQ.push({ t: k * (MV.slam.ringGap ?? 1.2) / this.speedK, x: this.x, z: this.z });
    this.bus.emit('boss:slam', { x: this.x, z: this.z, radius: R, rings: nRings });
    this.em.dizzyRadius(this.x, this.z, R, 2.0, 'slam');
    this.em.pushRadius(this.x, this.z, R + 2.5, TUNE.slamPushSpeed, { hops: 1 });
    this._shake(D.shake.bossSlam, 0.4);
    a.slams--;
    if (a.slams > 0) { a.stage = 'gap'; a.t = 0; }
    else this._dizzy(MV.slam.dizzy[this.phase - 1] ?? 2, 'slam');
  }

  _spawnRing(x, z) {
    let ring = this.rings.find((r) => !r.on) || this.rings[0];
    ring.x = x; ring.z = z; ring.r = MV.slam.radius; ring.on = true;
    ring.hz.active = true; ring.hz.srcX = x; ring.hz.srcZ = z;
  }
  _updateRingQueue(dt) {
    for (let i = this.ringQ.length - 1; i >= 0; i--) {
      const q = this.ringQ[i];
      q.t -= dt;
      if (q.t <= 0) { this._spawnRing(q.x, q.z); this.ringQ.splice(i, 1); }
    }
  }
  _updateRings(dt) {
    for (const r of this.rings) {
      if (!r.on) continue;
      r.r += MV.slam.ringSpeed * this.speedK * dt;
      if (r.r > MV.slam.ringMax || r.r > this.R + 1) { r.on = false; r.hz.active = false; }
    }
  }

  _tickCharge(a, dt, p) {
    if (a.stage === 'aim') {
      if (p && a.t < a.lock) {
        const dx = p.x - this.x, dz = p.z - this.z, d = len2(dx, dz) || 1;
        this.dirX = dx / d; this.dirZ = dz / d;
      }
      this.rotY = turnTo(this.rotY, Math.atan2(this.dirX, this.dirZ), 8 * dt);
      this.sq = Math.min(this.sq, 0.85);
      if (a.t >= a.fill) {
        a.stage = 'run'; a.t = 0; a.active = true; this.charging = true; this.sq = 1.2;
        this.bus.emit('boss:charge', { x: this.x, z: this.z, dirX: this.dirX, dirZ: this.dirZ });
      }
    } else if (a.stage === 'run') {
      const sp = MV.charge.speed * this.speedK;
      this.vx = this.dirX * sp; this.vz = this.dirZ * sp;
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.rotY = Math.atan2(this.dirX, this.dirZ);
      this.y = Math.abs(Math.sin(a.t * 18)) * 0.25;
      if (len2(this.x, this.z) + this.radius >= this.R - 0.05 || a.t > 2.5) {
        this.charging = false; a.active = false; this.y = 0; this.vx = this.vz = 0;
        const d = len2(this.x, this.z) || 1;
        this.bus.emit('enemy:bonk', { x: this.x / d * this.R, z: this.z / d * this.R, strength: sp, rim: true, boss: true });
        try { this.G.world?.pulseRim?.(0xffd84a); } catch { /* */ }
        this._dizzy(MV.charge.wallDizzy, 'wall');
      }
    }
  }

  _tickLaser(a, dt) {
    const T = MV.laser.time;
    if (a.stage === 'tele') {
      this.rotY = turnTo(this.rotY, a.ang, 4 * dt);
      if (a.t >= a.fill) {
        a.stage = 'fire'; a.t = 0; a.active = true;
        this.bus.emit('boss:laser', { x: this.x, z: this.z, beams: a.n });
      }
      this._setLasers(a, false);
    } else {
      a.ang += a.speed * a.dir * dt;
      this.rotY = a.ang;
      this._setLasers(a, true);
      if (a.t >= T) { this._lasersOff(); this._endMove(BD.moveGap); }
    }
  }
  _setLasers(a, on) {
    for (let i = 0; i < this.lasers.length; i++) {
      const L = this.lasers[i];
      L.on = i < a.n;
      L.a = a.ang + (i * TAU) / a.n;
      L.len = rayToRim(this.x, this.z, Math.sin(L.a), Math.cos(L.a), this.R);
      if (MV.laser.safeGap !== false) {
        L.g0 = this.radius + TUNE.laserGapStart; L.g1 = Math.min(L.len - 0.5, L.g0 + TUNE.laserGapLen);
      } else L.g0 = L.g1 = 0;
      L.hz.active = on && L.on;
      L.hz.srcX = this.x; L.hz.srcZ = this.z;
    }
  }
  _lasersOff() { for (const L of this.lasers) { L.on = false; L.hz.active = false; } }

  _tickRain(a, dt, p) {
    const gap = MV.rain.gap;
    this.y = Math.abs(Math.sin(a.t * 9)) * 0.35;
    while (a.i < a.n && a.t >= a.i * gap) {
      const pt = this._rainPoint(a, p);
      this.em.spawnFalling('grumpy', pt.x, pt.z, {
        size: rand() < 0.5 ? 'S' : 'M', fall: a.fall, radius: MV.rain.radius, hearts: MV.rain.hearts, landDizzy: MV.rain.landDizzy, minion: true,
      });
      a.i++;
    }
    if (a.i >= a.n && a.t >= a.n * gap + a.fall + 0.3) { this.y = 0; this._endMove(BD.moveGap); }
  }
  _rainPoint(a, p) {
    const R = this.R - 1.4;
    let best = null;
    for (let tries = 0; tries < 10; tries++) {
      let x, z;
      if (p && a.i < 3) { const ang = rand() * TAU, r = rand() * 2.5; x = p.x + Math.sin(ang) * r; z = p.z + Math.cos(ang) * r; }
      else { const ang = rand() * TAU, r = Math.sqrt(rand()) * R; x = Math.sin(ang) * r; z = Math.cos(ang) * r; }
      const d = len2(x, z); if (d > R) { x *= R / d; z *= R / d; }
      if (len2(x - this.x, z - this.z) < this.radius + 1) continue;
      let ok = true;
      for (const q of a.pts) if (len2(q.x - x, q.z - z) < 1.8) { ok = false; break; }
      best = { x, z };
      if (ok) break;
    }
    if (!best) best = { x: 0, z: 0 };
    a.pts.push(best);
    return best;
  }

  _tickSummon(a, dt, p) {
    if (a.stage === 'roar') {
      this.sq = 1 + Math.sin(a.t * 30) * 0.06;
      if (a.t >= a.roar) {
        const R = this.R * 0.82;
        const base = p ? Math.atan2(p.x, p.z) + Math.PI : rand() * TAU;
        const n = MV.summon.count[this.phase - 1] ?? 4;
        const portals = MV.summon.portals;
        for (let i = 0; i < n; i++) {
          const k = i % portals, ang = base + (k - (portals - 1) / 2) * 1.2 + (rand() - 0.5) * 0.25;
          const r = R - Math.floor(i / portals) * 1.3;
          this.em.spawnWithPortal('grumpy', Math.sin(ang) * r, Math.cos(ang) * r, {
            size: i % 3 === 0 ? 'M' : 'S', minion: true, delay: D.spawn.portalTime + Math.floor(i / portals) * 0.25,
          });
        }
        a.stage = 'idle'; a.t = 0;
      }
    } else if (a.t >= MV.summon.idle) this._endMove(BD.moveGap * 0.5);
  }

  // ─────────────── vulnerability · damage · phases ───────────────
  _dizzy(sec, source) {
    if (this.dead || this.mode === 'phase' || this.mode === 'intro' || this.mode === 'chase') return false;
    this.mode = 'dizzy'; this.modeT = 0; this.dizzyT = sec; this.coreOpen = true;
    this.act = null; this.charging = false; this._lasersOff();
    this.stagger = 0; this.sq = 0.7;
    this.bus.emit('boss:vulnerable', { x: this.x, z: this.z, seconds: sec, source });
    this.bus.emit('enemy:dizzy', { x: this.x, z: this.z, size: this.size, type: 'boss', source });
    this._publish();
    return true;
  }
  /** em.dizzy(boss, …) lands here: only strong sources stun the king */
  applyDizzy(seconds, source) {
    if (source === 'nova' || source === 'timestop' || source === 'stagger') return this._dizzy(seconds, source);
    return false;
  }

  addStagger(v, src) {
    if (this.dead || this.invulnT > 0 || this.mode === 'intro' || this.mode === 'dizzy' || this.mode === 'phase' || this.mode === 'chase' || this.mode === 'recoil') return;
    this.stagger = Math.min(this.staggerMax, this.stagger + v);
    this.flashT = Math.max(this.flashT, 0.3);
    if (this.stagger >= this.staggerMax) {
      this.stagger = 0;
      this.y = 0;
      this.bus.emit('boss:stagger', { x: this.x, z: this.z, textKey: 'boss.stagger', text: t('boss.stagger'), src });
      this._dizzy(BD.stagger.dizzy, 'stagger');
    }
  }

  /** dash into the OPEN core. Returns true when a crack landed. */
  hitCore({ perfect = false } = {}) {
    if (this.dead || this.mode === 'intro' || this.mode === 'phase') return false;
    if (this.mode === 'chase') return this._chaseHit();
    if (!this.coreOpen || this.hitCd > 0 || this.invulnT > 0) return false;
    // Kid-UX §7.13: every core dash is exactly 1 crack (a perfect gets the bigger stamp/slow-mo, not double damage)
    this._crack(1, perfect);
    if (!this.dead && this.mode === 'dizzy') {
      this.coreOpen = false; this.mode = 'recoil'; this.modeT = 0;
      const p = this.run?.player;
      const dx = p ? this.x - p.x : 0, dz = p ? this.z - p.z : -1, d = len2(dx, dz) || 1;
      this.recX = dx / d; this.recZ = dz / d;
    }
    this._publish();
    return true;
  }
  /** hero NOVA: 1 crack + dizzy 3 s */
  novaHit() {
    if (this.dead || this.mode === 'intro' || this.mode === 'phase' || this.invulnT > 0) return false;
    if (this.mode === 'chase') return this._chaseHit(true);
    this._crack(1, false, true);
    if (!this.dead && this.mode !== 'phase' && this.mode !== 'chase') {
      if (this.mode === 'dizzy') this.dizzyT = Math.max(this.dizzyT, 3); else this._dizzy(3, 'nova');
    }
    return true;
  }
  onKnock() {
    if (this.mode === 'chase') return this._chaseHit();
    this.flashT = 0.6; this.sq = 0.92;
    this.bus.emit('enemy:clang', { x: this.x, z: this.z, type: 'boss' });
    this._fx('sparks', this.x, this.size * 0.5, this.z, { color: 0xffffff, count: 10 });
    return true;
  }
  flashHit() { this.flashT = Math.max(this.flashT, 0.5); this.sq = 0.9; }

  _crack(dmg, perfect, byNova = false) {
    this.hp = Math.max(0, this.hp - dmg);
    this.hitCd = TUNE.hitCd; this.flashT = 1; this.sq = 0.68;
    this._shake(D.shake.bossCrack, 0.35);
    const cy = this.y + this.size * 0.85;
    this._fx('shards', this.x + Math.sin(this.rotY) * this.size * 0.5, cy, this.z + Math.cos(this.rotY) * this.size * 0.5, { color: COL.core, count: 18 });
    this.bus.emit('boss:hit', { x: this.x, z: this.z, hp: this.hp, maxHp: this.maxHp, perfect: !!perfect, byNova, dmg });
    if (this.hp <= 0) { if (this.finale) this._startChase(); else this._defeat(); }
    else this._checkPhase();
  }

  _checkPhase() {
    const f = this.hp / this.maxHp, e = TUNE.phaseEps;
    const np = f <= BD.phaseAt[1] + e ? 3 : f <= BD.phaseAt[0] + e ? 2 : 1;
    if (np > this.phase) this._phaseShift(np);
  }

  _phaseShift(np) {
    this.phase = np;
    this.mode = 'phase'; this.modeT = 0; this.act = null; this.charging = false; this.coreOpen = false;
    this.invulnT = BD.phaseShift.time; this.rotIdx = this._phaseOpener(np); this.stagger = 0;
    this._lasersOff();
    this.em.freeMinions();
    const p = this.run?.player;
    if (p) {
      const dx = p.x - this.x, dz = p.z - this.z, d = len2(dx, dz) || 1;
      this.pushNx = dx / d; this.pushNz = dz / d; this.pushT = 0.35;
    }
    try { this.G.world?.pulseRim?.(COL.crack); } catch { /* */ }
    this._shake(0.4, 0.6);
    this.bus.emit('boss:phase', { phase: np, x: this.x, z: this.z, textKey: 'boss.phase', text: t('boss.phase', { n: np }) });
  }

  // ─────────────── W6 finale: Glitch Core chase ───────────────
  _startChase() {
    this.mode = 'chase'; this.modeT = 0; this.act = null; this.charging = false; this._lasersOff();
    this.coreOpen = true; this.dizzyT = 0; this.kvx = this.kvz = 0;
    this.chaseHits = 0; this.maxHp = BD.coreChase.hits; this.hp = this.maxHp;
    this.name = t('boss.core');
    this.size = TUNE.coreSize; this.radius = 0.55; this.y = 0;
    this.zigT = TUNE.chaseZig; this.mineT = BD.coreChase.mineEvery; this.sinceHit = 0;
    this.hitCd = TUNE.chaseHeadStart;                          // bursts out of the shell and flees before it can be hit
    { const p = this.run?.player; const dx = p ? this.x - p.x : 0, dz = p ? this.z - p.z : 1, d = len2(dx, dz) || 1; this.vx = dx / d * 10; this.vz = dz / d * 10; }
    this.body.visible = false; this.crown.visible = false; this.mod.visible = false;
    for (const s of this.slabs) s.visible = false;
    this.bigCore.visible = true;
    this.em.freeMinions();
    this._fx('shards', this.x, 1.8, this.z, { color: BD.color, count: 40 });
    this._fx('ring', this.x, 0.2, this.z, { color: COL.crack, radius: 6 });
    try { this.G.hitStop?.(200); this.G.slowMo?.(0.3, 0.8); } catch { /* */ }
    this._shake(0.7, 0.6);
    const R0 = this.run?.arenaRadius ?? this.R;
    this._chaseR0 = R0;
    const r = R0 * TUNE.chaseRadiusK;
    try { this.run.arenaRadius = r; } catch { /* */ }
    try { this.G.world?.setPlayRadius?.(r); } catch { /* */ }
    this.bus.emit('boss:shell', { x: this.x, z: this.z, textKey: 'boss.core', text: this.name });
    // the finale is not a "PHASE 4": drive the phase-shift presentation directly with the core's own name card
    try { this.G.hud?.banner?.(this.name, 'boss', 2.2, 'boss.coreSub'); } catch { /* hud optional */ }
    try { this.G.cam?.cinematic?.('phase', { x: this.x, z: this.z }); } catch { /* cam optional */ }
    try { this.G.world?.pulseRim?.(COL.crack); } catch { /* world optional */ }
    try { this.G.audio?.sfx?.('phase', { phase: 4 }); } catch { /* audio optional */ }
    this.bus.emit('boss:hit', { x: this.x, z: this.z, hp: this.hp, maxHp: this.maxHp });
  }

  _tickChase(dt, p) {
    const C = BD.coreChase, R = this.R;
    this.coreOpen = true;
    if (this.dizzyT > 0) {                                     // knocked flight → rim bonk → 1 s dizzy
      this.x += this.kvx * dt; this.z += this.kvz * dt;
      const d = len2(this.x, this.z), lim = R - this.radius;
      if (d >= lim && (this.kvx || this.kvz)) {
        this.kvx = this.kvz = 0; this.dizzyT = 1.0;
        this.bus.emit('enemy:bonk', { x: this.x, z: this.z, strength: TUNE.chaseHitSpeed, rim: true, boss: true });
        this._shake(0.3, 0.3);
      }
      if (!this.kvx && !this.kvz) this.dizzyT -= dt;
      return;
    }
    this.zigT -= dt;
    if (this.zigT <= 0) { this.zigT = TUNE.chaseZig; this.zigSign = -this.zigSign; }
    let ax, az;
    if (p) { const dx = this.x - p.x, dz = this.z - p.z, d = len2(dx, dz) || 1; ax = dx / d; az = dz / d; }
    else { ax = Math.sin(this.fightT); az = Math.cos(this.fightT); }
    const zig = this.zigSign * TUNE.chaseZigDeg * DEG;
    let fx = ax * Math.cos(zig) + az * Math.sin(zig), fz = -ax * Math.sin(zig) + az * Math.cos(zig);
    const r = len2(this.x, this.z);
    if (r > R * 0.6 && r > 0.01) {
      const tx = -this.z / r, tz = this.x / r, s = (tx * fx + tz * fz) >= 0 ? 1 : -1;
      const k = clamp((r - R * 0.6) / (R * 0.3), 0, 1);
      fx += (tx * s * 1.5 - this.x / r * 1.3) * k; fz += (tz * s * 1.5 - this.z / r * 1.3) * k;
    }
    const fl = len2(fx, fz) || 1;
    this.sinceHit += dt;
    const ease = Math.max(0, this.sinceHit - TUNE.chaseEaseAfter) * TUNE.chaseEaseRate;
    const sp = Math.max(TUNE.chaseMinSpeed, C.speed * this.speedK - ease);
    this.vx += (fx / fl * sp - this.vx) * Math.min(1, 6 * dt);
    this.vz += (fz / fl * sp - this.vz) * Math.min(1, 6 * dt);
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.y = 0.35 + Math.sin(this.fightT * 6) * 0.15;
    this.mineT -= dt;
    if (this.mineT <= 0) { this.mineT = C.mineEvery; this._dropMine(this.x, this.z); }
  }

  _chaseHit(byNova = false) {
    if (this.dead || this.hitCd > 0 || this.kvx || this.kvz) return false;
    this.chaseHits++; this.sinceHit = 0;
    this.hp = Math.max(0, this.maxHp - this.chaseHits);
    this.hitCd = 0.6; this.flashT = 1;
    const p = this.run?.player;
    let dx = p ? this.x - p.x : 0, dz = p ? this.z - p.z : 1;
    const d = len2(dx, dz) || 1; dx /= d; dz /= d;
    this.kvx = dx * TUNE.chaseHitSpeed; this.kvz = dz * TUNE.chaseHitSpeed; this.dizzyT = 5;
    try { this.G.hitStop?.(120); } catch { /* */ }
    this._shake(0.35, 0.3);
    this._fx('shards', this.x, 0.8, this.z, { color: COL.core, count: 16 });
    this.bus.emit('boss:hit', { x: this.x, z: this.z, hp: this.hp, maxHp: this.maxHp, byNova, chase: true });
    if (this.chaseHits >= BD.coreChase.hits) {
      try { this.G.slowMo?.(0.1, 2.0); } catch { /* */ }
      this._defeat(true);
    }
    return true;
  }

  _dropMine(x, z) {
    const m = this.mines.find((q) => !q.on && q.boomT <= 0);
    if (!m) return;
    m.x = x; m.z = z; m.t = m.fuse = BD.coreChase.mineFuse * (this.run?.assist ? D.assist.telegraph : 1); m.on = true;
  }
  _updateMines(dt) {
    for (const m of this.mines) {
      if (m.boomT > 0) { m.boomT -= dt; if (m.boomT <= 0) m.hz.active = false; continue; }
      if (!m.on) continue;
      m.t -= dt;
      if (m.t <= 0) {
        m.on = false; m.boomT = 0.15;
        m.hz.active = true; m.hz.srcX = m.x; m.hz.srcZ = m.z;
        this.bus.emit('enemy:explode', { x: m.x, z: m.z, radius: BD.coreChase.mineRadius, mine: true, count: 0 });
      }
    }
  }

  // ─────────────── defeat ───────────────
  _defeat(finale = false) {
    if (this.dead) return;
    this.dead = true; this.mode = 'dead'; this.modeT = 0; this.deathT = 0;
    this.coreOpen = false; this.charging = false; this.act = null; this.hp = 0;
    this._allHazardsOff();
    this.em.freeMinions();
    if (this._chaseR0) {
      try { this.run.arenaRadius = this._chaseR0; } catch { /* */ }
      try { this.G.world?.setPlayRadius?.(this.G.world?.arenaRadius ?? this._chaseR0); } catch { /* */ }
    }
    this._fx('shards', this.x, 2, this.z, { color: BD.color, count: 50 });
    this._fx('confetti', this.x, 3, this.z, { count: 60 });
    this._shake(0.8, 0.8);
    this.bus.emit('boss:defeat', { x: this.x, z: this.z, bossId: this.bossId, worldIndex: this.worldIndex, final: this.final, finale });
    this._publish();
  }
  _updateDeath(dt) {
    this.deathT += dt;
    if (this.deathT >= TUNE.deathTime) { this.removeMe = true; this.group.visible = false; }
  }
  _allHazardsOff() {
    this.hzBody.active = false; this.hzSlam.active = false;
    for (const r of this.rings) { r.on = false; r.hz.active = false; }
    this._lasersOff();
    for (const m of this.mines) { m.on = false; m.boomT = 0; m.hz.active = false; }
  }

  /** time-to-contact for Perfect detection (slam circle · rings · charge · lasers · body · mines) */
  threatTTC(px, pz, r = D.player.hurtRadius, pvx = 0, pvz = 0) {
    if (this.dead) return Infinity;
    let best = Infinity;
    const a = this.act;
    if (a && (a.name === 'slam' || a.name === 'double') && (a.stage === 'crouch' || a.stage === 'air')) {
      if (len2(px - a.tx, pz - a.tz) < MV.slam.radius + r) best = Math.min(best, Math.max(0, a.fill - a.t));
    }
    for (const ring of this.rings) {
      if (!ring.on) continue;
      const gap = len2(px - ring.x, pz - ring.z) - r - (ring.r + MV.slam.ringWidth * 0.5);
      if (gap >= -MV.slam.ringWidth) best = Math.min(best, Math.max(0, gap / (MV.slam.ringSpeed * this.speedK)));
    }
    for (const q of this.ringQ) {
      const gap = len2(px - q.x, pz - q.z) - r - MV.slam.radius;
      if (gap >= 0) best = Math.min(best, q.t + gap / (MV.slam.ringSpeed * this.speedK));
    }
    if (a && a.name === 'laser' && a.stage === 'fire') {
      const pa = Math.atan2(px - this.x, pz - this.z), dist = len2(px - this.x, pz - this.z);
      for (const L of this.lasers) {
        if (!L.on || dist > L.len + r) continue;
        let da = angDiff(L.a, pa) * a.dir;
        if (da < 0) da += TAU;
        const tt = da / Math.max(0.01, a.speed) - (r / Math.max(dist, 0.5)) / Math.max(0.01, a.speed);
        best = Math.min(best, Math.max(0, tt));
      }
    }
    for (const m of this.mines) if (m.on && len2(px - m.x, pz - m.z) < BD.coreChase.mineRadius + r) best = Math.min(best, m.t);
    if (this.harmful) {
      const rx = this.x - px, rz = this.z - pz, RR = this.radius + r;
      const c = rx * rx + rz * rz - RR * RR;
      if (c <= 0) return 0;
      const vx = this.vx * (this.charging ? 1 : 0) - pvx, vz = this.vz * (this.charging ? 1 : 0) - pvz;
      const b = rx * vx + rz * vz, aa = vx * vx + vz * vz, disc = b * b - aa * c;
      if (b < 0 && disc >= 0 && aa > 1e-6) best = Math.min(best, (-b - Math.sqrt(disc)) / aa);
    }
    return best;
  }

  // ─────────────── rendering (called from em._render) ───────────────
  /** stable per-bucket pseudo-random 0..1 (glitch flicker) — a method, not a per-frame closure */
  _hash(k) { const v = Math.sin(this._bucket * 12.9898 + k * 78.233 + this._glitchSeed) * 43758.5453; return v - Math.floor(v); }

  render(dt, dec, sh, em) {
    if (this.removeMe) return;
    const tr = this.G.time?.real ?? this.fightT;
    const chase = this.mode === 'chase';
    const S = BD.size;
    // glitch intensity: phase, hits, enrage
    const gi = (this.phase >= 3 ? 0.32 : this.phase === 2 ? 0.2 : 0.1) + (this.flashT > 0.5 ? 0.4 : 0) + (this.weary ? 0.08 : 0) + (this.mode === 'phase' ? 0.5 : 0);
    this._bucket = Math.floor(tr * 14);
    const glitch = this._hash(0) < gi * 0.6;
    const jit = glitch && !this.dead ? (this._hash(1) - 0.5) * 0.3 : 0;
    const g = this.group;
    g.position.set(this.x + jit, this.y, this.z);
    g.rotation.y = this.rotY + (this.mode === 'dizzy' ? Math.sin(tr * 6 * TAU) * 0.07 : 0);
    const sq = this.sq, sxz = 1 / Math.sqrt(Math.max(0.3, sq));
    this.pivot.scale.set(sxz, sq, sxz);
    this.pivot.position.y = 0;
    if (this.dead) {
      const k = clamp(this.deathT / TUNE.deathTime, 0, 1);
      const s = Math.max(0.001, 1 - k * k);
      this.pivot.scale.multiplyScalar(s);
      g.rotation.y += k * k * 12;
      this.pivot.position.y = k * 2.5;
    }
    // body: colour · face · flash
    const u = this.bodyMat.uniforms;
    this._c.copy(this.weary ? this.wearyCol : this.baseColor);
    if (this.coreOpen && !chase) this._c.lerp(this.tint, 0.4);
    u.uColor.value.copy(this._c);
    const p = this.run?.player;
    const expr = this.dead ? EXPR.HURT : this.mode === 'dizzy' ? EXPR.DIZZY : (this.mode === 'recoil' || this.flashT > 0.7) ? EXPR.HURT
      : (this.mode === 'move' || this.mode === 'phase' || (this.mode === 'intro' && this.modeT > 0.5)) ? EXPR.CHARGE : EXPR.ANGRY;
    const lookX = p ? clamp(Math.sin(angDiff(this.rotY, Math.atan2(p.x - this.x, p.z - this.z))) * 1.3, -1, 1) : 0;
    const blink = expr === EXPR.ANGRY && ((tr + this._glitchSeed) % 4.1) < 0.1 ? 1 : 0;
    u.uFace.value.set(expr, blink, lookX, -0.2);
    const glow = this.coreOpen ? 0.15 + 0.1 * Math.sin(tr * 8) : 0;
    u.uFx.value.set(Math.max(this.flashT * 0.85, glitch ? 0.25 : 0), glow, 1, 0);
    // core shutters
    this.coreK += ((this.coreOpen ? 1 : 0) - this.coreK) * Math.min(1, dt * 10 || 0);
    this.shutL.position.x = -0.05 - 0.11 * this.coreK;
    this.shutR.position.x = 0.05 + 0.11 * this.coreK;
    const cs = 1 + this.coreK * (0.45 + 0.15 * Math.sin(tr * 10));
    this.core.scale.set(cs, cs * 1.3, 0.6 * cs);
    this.coreMat.color.setHex(COL.core).multiplyScalar(0.55 + this.coreK * 1.3 + (chase ? 1 : 0));
    // crown
    const rise = this.mode === 'phase' ? Math.sin(Math.PI * clamp(this.modeT / BD.phaseShift.time, 0, 1)) * 2.5 : 0;
    this.crown.position.set(0, S * sq + 0.55 + Math.sin(tr * 2) * 0.12 + rise, 0);
    this.crown.rotation.set(0, tr * 0.6, this.mode === 'dizzy' ? Math.sin(tr * 5) * 0.35 : 0);
    // cracks = lost HP
    const shellMax = this._shellMax ?? (this._shellMax = this.maxHp);
    const lost = chase || this.dead ? shellMax : shellMax - this.hp;
    const nShow = Math.round((lost / shellMax) * TUNE.crackMax);
    for (let i = 0; i < this.cracks.length; i++) this.cracks[i].visible = i < nShow;
    this.crackMat.color.setHex(COL.crack).multiplyScalar(1 + Math.sin(tr * 7) * 0.3);
    // glitch scanline slabs
    for (let i = 0; i < this.slabs.length; i++) {
      const m = this.slabs[i];
      m.visible = !chase && !this.dead && this._hash(i + 2) < gi * 0.8;
      if (!m.visible) continue;
      // thin scanline bands on the front / side faces (never a flat plate seen from the top camera)
      const side = this._hash(i + 60) < 0.6 ? 0 : (this._hash(i + 61) < 0.5 ? -1 : 1);
      const w = S * (0.35 + this._hash(i + 40) * 0.6), h = 0.05 + this._hash(i + 50) * 0.14, off = (this._hash(i + 9) - 0.5) * S * 0.5;
      const y = S * (0.12 + this._hash(i + 20) * 0.8);
      if (side === 0) { m.position.set(off, y, S * 0.5 + 0.03); m.scale.set(w, h, 0.05); }
      else { m.position.set(side * (S * 0.5 + 0.03), y, off); m.scale.set(0.05, h, w); }
    }
    for (const f of this.modFlames) f.scale.setScalar(this.charging ? 1.4 + Math.sin(tr * 50) * 0.2 : (this.worldIndex === 4 ? 1 : 0.35 + Math.sin(tr * 30) * 0.05));
    if (this.halo) this.halo.rotation.z = tr * 1.5;
    // W6 fleeing core
    if (chase) {
      this.bigCore.position.set(0, 0.35, 0);
      this.bigCore.rotation.set(0, tr * 3, 0);
      this.bigCore.scale.setScalar(1 + Math.sin(tr * 12) * 0.08);
      this.bigHalo.rotation.z = tr * 4;
    }
    // shadow + dizzy stars
    sh.add(this.x, this.z, chase ? 1.1 : S * 0.95 * (this.dead ? Math.max(0, 1 - this.deathT / TUNE.deathTime) : 1), this.y);
    if (this.mode === 'dizzy') em.stars(this.x, this.z, this.y + S * sq + 1.35, 1.5, 5, 0.55, 0, this.dizzyT);
    if (chase && this.dizzyT > 0 && !this.kvx && !this.kvz) em.stars(this.x, this.z, this.y + 1.2, 0.7, 3, 0.3, 0, this.dizzyT);
    this._drawTelegraphs(dec, tr, em);
  }

  _drawTelegraphs(dec, tr, em) {
    const a = this.act;
    if (a && (a.name === 'slam' || a.name === 'double') && (a.stage === 'crouch' || a.stage === 'air')) {
      dec.disc(a.tx, a.tz, MV.slam.radius, clamp(a.t / a.fill, 0, 1), a.fill - a.t < 0.15 ? 1 : 0, 1, 0);
    }
    for (const q of this.ringQ) dec.disc(q.x, q.z, MV.slam.radius, 1, 0, 0.35 + 0.3 * Math.sin(tr * 12), 2, 0, 0, 0);   // next ring warming up
    if (this.slamHzT > 0) dec.disc(this.slamX, this.slamZ, MV.slam.radius, 1, 0, clamp(this.slamHzT / 0.12, 0, 1), 3);
    const w = MV.slam.ringWidth;
    for (const r of this.rings) {
      if (!r.on) continue;
      const outer = r.r + w * 0.5;
      dec.disc(r.x, r.z, outer, 1, 0, clamp((MV.slam.ringMax - r.r) / 3, 0.25, 1), 1, (r.r - w * 0.5) / outer);
    }
    if (a && a.name === 'charge' && a.stage === 'aim') {
      const len = rayToRim(this.x, this.z, this.dirX, this.dirZ, this.R);
      const fl = a.fill - a.t < 0.15 ? 1 : 0;
      dec.rect(this.x, this.z, Math.atan2(this.dirX, this.dirZ), len, MV.charge.width, clamp(a.t / a.fill, 0, 1), fl, 1, 0);
      const bd = this.radius + 1.3;
      dec.bang(this.x + this.dirX * bd, this.z + this.dirZ * bd, 0.6, fl);
    }
    if (a && a.name === 'laser') {
      const by = this.y + this.size * 0.5, r0 = this.radius * TUNE.laserStartR;
      let gapR = 0;
      for (const L of this.lasers) {
        if (!L.on) continue;
        const dx = Math.sin(L.a), dz = Math.cos(L.a);
        // beam segments: [r0, g0] and [g1, len] — the gap between them is always safe
        const hasGap = L.g1 > L.g0;
        gapR = hasGap ? (L.g0 + L.g1) * 0.5 : 0;
        for (let seg = 0; seg < (hasGap ? 2 : 1); seg++) {
          const from = seg === 0 ? r0 : L.g1, to = hasGap && seg === 0 ? L.g0 : L.len;
          const len = Math.max(0.1, to - from), sx = this.x + dx * from, sz = this.z + dz * from;
          if (a.stage === 'tele') {
            dec.rect(sx, sz, L.a, len, MV.laser.width + 0.25, clamp(a.t / a.fill, 0, 1), a.fill - a.t < 0.15 ? 1 : 0, 1, 4);
            dec.beam(sx, by, sz, L.a, len, 0.06, COL.aim, 0.5 + 0.4 * Math.sin(tr * 24));
          } else {
            dec.rect(sx, sz, L.a, len, MV.laser.width * 1.2, 1, 0, 1, 3);
            dec.beam(sx, by, sz, L.a, len, MV.laser.width * 1.1, COL.beamGlow, 1);
            dec.beam(sx, by, sz, L.a, len, MV.laser.width * 0.4, COL.beamCore, 1.1);
          }
        }
        if (a.stage === 'tele') dec.bang(this.x + dx * (r0 + 0.9), this.z + dz * (r0 + 0.9), 0.5, a.fill - a.t < 0.15 ? 1 : 0);
      }
      if (gapR > 0) dec.disc(this.x, this.z, gapR + TUNE.laserGapLen * 0.5, 1, 0, 0.8, 2, 0, 0.3, 1);   // cyan = safe band
    }
    const mr = BD.coreChase.mineRadius;
    for (const m of this.mines) {
      if (m.on) {
        dec.disc(m.x, m.z, mr, 1 - clamp(m.t / m.fuse, 0, 1), m.t < 0.15 ? 1 : 0, 1, 0);
        const s = Math.sin(tr * lerp(3, 10, 1 - m.t / m.fuse) * TAU) > 0 ? 1.6 : 1.0;
        em._put(em.acc.spark, m.x, 0.25, m.z, 0, tr * 4, 0, s, s, s);
      } else if (m.boomT > 0) dec.disc(m.x, m.z, mr, 1, 0, m.boomT / 0.15, 3);
    }
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._allHazardsOff();
    const hz = [this.hzBody, this.hzSlam, ...this.rings.map((r) => r.hz), ...this.lasers.map((l) => l.hz), ...this.mines.map((m) => m.hz)];
    for (const h of hz) this.em.removeHazard(h);
    this.G.scene.remove(this.group);
    for (const g of this._geos) g.dispose();
    for (const m of this._mats) m.dispose();
    this._setRunBoss(null);
    this.removeMe = true;
  }
}
