// ─────────────────────────────────────────────────────────────
// CUBE DASH — pickups: CYAN crystals (XP) · PINK hearts · GOLD coins · magnet
//
//   One InstancedMesh per pickup type + one shared additive ground-glow layer
//   (≤ 5 draw calls for up to 300 live pickups, zero per-frame allocations).
//   Pop-out arcs with bounce → bob & spin → magnet homing (accelerating) →
//   collect. Blink during the last 3 s of a 15 s life, then despawn.
//
//   Collection is announced on the bus (`pickup:crystal|heart|coin|magnet`);
//   Run listens and applies XP / heal / coins (so coins emitted by anyone count).
//
//   API (used by Run / enemies.js):
//     pickups.spawn(kind, x, z, {value, dirX, dirZ, y, speed})   kind: crystal|heart|coin|magnet
//     pickups.spawnCrystal(x, z, sizeKey|'S', opts)   value from TUNE.xp.crystal
//     pickups.spawnHeart(x, z) · spawnMagnet(x, z)
//     pickups.spawnCoins(x, z, n, amountEach = 1)     coin fountain (Coin Cube)
//     pickups.magnetAll()    every crystal & coin homes to the hero
//     pickups.collectAll()   victory vacuum (fast homing for everything)
//     pickups.count(kind), pickups.live, update(dt, rdt), clear(), dispose()
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TUNE } from './data.js';
import { clamp, rand, TAU, easeOutBack } from './core.js';

const TUNE_P = {
  cap: 300, life: 15, blinkLast: 3, blinkHz: 7,
  gravity: 30, bounce: 0.42, restVy: 1.7, groundFric: 5.5,
  popSpeed: [1.4, 3.4], popUp: [5.5, 8.2], spawnY: 0.6, spread: 1.1,
  homeDelay: 0.3,               // the pop arc plays before anything can be grabbed
  accel: 70, maxSpeed: 26, collectR: 0.62, vacuumAccel: 120,
  magnet: { heart: 1.5, coin: 3.2, magnet: 1.4 },     // crystals use run.cardMods.magnet
  restY: { crystal: 0.42, heart: 0.46, coin: 0.44, magnet: 0.46 },
  crystalScale: { S: 0.82, M: 1.0, L: 1.2, XL: 1.55 },
  caps: { crystal: 300, heart: 32, coin: 160, magnet: 4 },
  glow: { crystal: [0x39e8ff, 1.25], heart: [0xff5fa2, 1.35], coin: [0xffc629, 1.15], magnet: [0xff5f6d, 1.4] },
};
const KINDS = ['crystal', 'heart', 'coin', 'magnet'];

// ---------- geometry helpers ----------
/** merge geometries (non-indexed) into one, optional flat per-part colour → vertex colours */
function mergeGeos(parts) {
  let total = 0;
  const flat = parts.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    total += g.attributes.position.count;
    return { g, color: new THREE.Color(color ?? 0xffffff), src: geo };
  });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, color, src } of flat) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) { col[(o + i) * 3] = color.r; col[(o + i) * 3 + 1] = color.g; col[(o + i) * 3 + 2] = color.b; }
    o += n;
    if (g !== src) g.dispose();
    src.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

function crystalGeometry() {
  const g = new THREE.OctahedronGeometry(0.2, 0);
  g.scale(1, 1.5, 1);
  return g;
}

function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.95);
  s.bezierCurveTo(-0.25, -0.68, -1.05, -0.22, -1.05, 0.3);
  s.bezierCurveTo(-1.05, 0.86, -0.42, 1.08, 0, 0.62);
  s.bezierCurveTo(0.42, 1.08, 1.05, 0.86, 1.05, 0.3);
  s.bezierCurveTo(1.05, -0.22, 0.25, -0.68, 0, -0.95);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.24, bevelSize: 0.22, bevelSegments: 4, curveSegments: 12 });
  g.center();
  g.scale(0.22, 0.22, 0.22);
  return g;
}

function coinGeometry() {
  const face = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 22);
  face.rotateX(Math.PI / 2);
  const rim = new THREE.TorusGeometry(0.25, 0.045, 6, 22);
  const star = new THREE.CylinderGeometry(0.1, 0.1, 0.11, 5);
  star.rotateX(Math.PI / 2);
  return mergeGeos([{ geo: face, color: 0xffd23f }, { geo: rim, color: 0xf2a91c }, { geo: star, color: 0xfff1a6 }]);
}

function magnetGeometry() {
  const arc = new THREE.TorusGeometry(0.2, 0.08, 8, 18, Math.PI);
  const legL = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10); legL.translate(-0.2, -0.09, 0);
  const legR = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10); legR.translate(0.2, -0.09, 0);
  const tipL = new THREE.CylinderGeometry(0.082, 0.082, 0.1, 10); tipL.translate(-0.2, -0.23, 0);
  const tipR = new THREE.CylinderGeometry(0.082, 0.082, 0.1, 10); tipR.translate(0.2, -0.23, 0);
  const g = mergeGeos([
    { geo: arc, color: 0xff4b5c }, { geo: legL, color: 0xff4b5c }, { geo: legR, color: 0xff4b5c },
    { geo: tipL, color: 0xf4f7ff }, { geo: tipR, color: 0xf4f7ff },
  ]);
  g.translate(0, 0.08, 0);
  return g;
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

// ---------- pooled item ----------
class Item {
  constructor() {
    this.alive = false; this.kind = 'crystal';
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.t = 0; this.life = TUNE_P.life; this.value = 1; this.scale = 1;
    this.spin = 0; this.ph = 0; this.homing = false; this.vacuum = false; this.grounded = false; this.seq = 0;
  }
}

export class Pickups {
  constructor(G, run) {
    this.G = G;
    this.run = run;
    this.items = [];
    for (let i = 0; i < TUNE_P.cap; i++) this.items.push(new Item());
    this.live = 0;
    this.counts = { crystal: 0, heart: 0, coin: 0, magnet: 0 };
    this._seq = 0;
    this.group = new THREE.Group();
    this.group.name = 'pickups';
    G.scene?.add(this.group);

    const low = G.quality === 'low';
    const mats = {
      crystal: new THREE.MeshStandardMaterial({ color: 0x8ff7ff, emissive: 0x19d4ff, emissiveIntensity: 0.95, roughness: 0.12, metalness: 0.15, flatShading: true }),
      heart: new THREE.MeshStandardMaterial({ color: 0xff6fae, emissive: 0xff2f86, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.05 }),
      coin: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x8a5a00, emissiveIntensity: 0.55, roughness: 0.28, metalness: low ? 0.3 : 0.75 }),
      magnet: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x551018, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.2 }),
    };
    const geos = { crystal: crystalGeometry(), heart: heartGeometry(), coin: coinGeometry(), magnet: magnetGeometry() };
    this.meshes = {};
    for (const k of KINDS) {
      const m = new THREE.InstancedMesh(geos[k], mats[k], TUNE_P.caps[k]);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      m.name = 'pickup_' + k;
      this.meshes[k] = m;
      this.group.add(m);
    }
    // shared additive ground glow under every pickup
    const gg = new THREE.PlaneGeometry(1, 1);
    gg.rotateX(-Math.PI / 2);
    this.glow = new THREE.InstancedMesh(gg, new THREE.MeshBasicMaterial({
      map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }), TUNE_P.cap);
    this.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TUNE_P.cap * 3), 3);
    this.glow.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.glow.frustumCulled = false;
    this.glow.renderOrder = 2;
    this.glow.count = 0;
    this.group.add(this.glow);
    this._glowCol = {};
    for (const k of KINDS) this._glowCol[k] = new THREE.Color(TUNE_P.glow[k][0]);

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  // ---------- spawning ----------
  _alloc(kind) {
    if (this.counts[kind] >= TUNE_P.caps[kind] || this.live >= TUNE_P.cap) {
      // full: crystals never get lost — the oldest one is collected instantly
      if (kind !== 'crystal') return null;
      let oldest = null;
      for (const it of this.items) if (it.alive && it.kind === 'crystal' && (!oldest || it.seq < oldest.seq)) oldest = it;
      if (!oldest) return null;
      this._collect(oldest);
    }
    for (const it of this.items) if (!it.alive) return it;
    return null;
  }

  spawn(kind, x, z, opts = {}) {
    if (!KINDS.includes(kind)) return null;
    const it = this._alloc(kind);
    if (!it) return null;
    let ang;
    if (opts.dirX !== undefined && (opts.dirX || opts.dirZ)) ang = Math.atan2(opts.dirX, opts.dirZ) + (rand() - 0.5) * 2 * TUNE_P.spread;
    else ang = rand() * TAU;
    const sp = opts.speed ?? (TUNE_P.popSpeed[0] + rand() * (TUNE_P.popSpeed[1] - TUNE_P.popSpeed[0]));
    it.alive = true;
    it.kind = kind;
    it.x = x; it.z = z; it.y = opts.y ?? TUNE_P.spawnY;
    it.vx = Math.sin(ang) * sp; it.vz = Math.cos(ang) * sp;
    it.vy = TUNE_P.popUp[0] + rand() * (TUNE_P.popUp[1] - TUNE_P.popUp[0]);
    it.t = 0;
    it.life = opts.life ?? TUNE_P.life;
    it.value = opts.value ?? 1;
    it.scale = opts.scale ?? 1;
    it.spin = rand() * TAU;
    it.ph = rand() * TAU;
    it.homing = false; it.vacuum = false; it.grounded = false;
    it.seq = ++this._seq;
    this.live++;
    this.counts[kind]++;
    return it;
  }

  spawnCrystal(x, z, sizeKey = 'S', opts = {}) {
    const key = TUNE.xp.crystal[sizeKey] !== undefined ? sizeKey : 'S';
    return this.spawn('crystal', x, z, { ...opts, value: opts.value ?? TUNE.xp.crystal[key], scale: TUNE_P.crystalScale[key] ?? 1 });
  }
  spawnHeart(x, z, opts = {}) { return this.spawn('heart', x, z, opts); }
  spawnMagnet(x, z, opts = {}) { return this.spawn('magnet', x, z, { ...opts, life: 20 }); }
  spawnCoin(x, z, amount = 1, opts = {}) { return this.spawn('coin', x, z, { ...opts, value: amount }); }
  /** coin fountain: n coins bursting out over a wider arc */
  spawnCoins(x, z, n = 10, amountEach = 1) {
    for (let i = 0; i < n; i++) this.spawn('coin', x, z, { value: amountEach, speed: 1.5 + rand() * 4, y: 0.8 });
  }

  count(kind) { return kind ? this.counts[kind] || 0 : this.live; }

  magnetAll() {
    for (const it of this.items) if (it.alive && (it.kind === 'crystal' || it.kind === 'coin')) it.homing = true;
  }
  /** victory vacuum: everything flies to the hero fast */
  collectAll() {
    for (const it of this.items) if (it.alive) { it.homing = true; it.vacuum = true; it.life = Math.max(it.life, it.t + 6); }
  }

  // ---------- collection ----------
  _collect(it) {
    const bus = this.G.bus;
    const x = it.x, z = it.z;
    this._free(it);
    switch (it.kind) {
      case 'crystal': bus?.emit('pickup:crystal', { x, z, value: it.value }); break;
      case 'heart': bus?.emit('pickup:heart', { x, z }); break;
      case 'coin': bus?.emit('pickup:coin', { x, z, amount: it.value }); break;
      case 'magnet': bus?.emit('pickup:magnet', { x, z }); this.magnetAll(); break;
    }
  }
  _free(it) {
    if (!it.alive) return;
    it.alive = false;
    this.live--;
    this.counts[it.kind]--;
  }

  // ---------- simulation ----------
  update(dt, rdt = dt) {
    const run = this.run;
    const p = run?.player;
    const hx = p ? p.x : 0, hz = p ? p.z : 0;
    const R = Math.max(2, (run?.arenaRadius ?? 11) - 0.35);
    const crystalMag = run?.cardMods?.magnet ?? TUNE.xp.magnetRadius;
    const canGrab = !!p && p.hp > 0 && run?.state !== 'dying' && run?.state !== 'ended';
    const heroGrow = p?.size ?? 1;
    const counters = this._counters || (this._counters = { crystal: 0, heart: 0, coin: 0, magnet: 0 });
    for (const k of KINDS) counters[k] = 0;
    let gi = 0;
    const time = this.G.time?.real ?? 0;

    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      const rest = TUNE_P.restY[it.kind];
      const dx = hx - it.x, dz = hz - it.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      // start homing once the pop has played and the hero is inside the magnet radius
      if (!it.homing && canGrab && it.t > TUNE_P.homeDelay) {
        const mr = (it.kind === 'crystal' ? crystalMag : TUNE_P.magnet[it.kind]) + (heroGrow - 1) * 0.6;
        if (d < mr) it.homing = true;
      }

      if (it.homing && canGrab) {
        const acc = it.vacuum ? TUNE_P.vacuumAccel : TUNE_P.accel;
        const inv = d > 1e-4 ? 1 / d : 0;
        const ux = dx * inv, uz = dz * inv;
        it.vx += ux * acc * dt; it.vz += uz * acc * dt;
        // bleed sideways velocity so it doesn't orbit the hero
        const along = it.vx * ux + it.vz * uz;
        const k = Math.min(1, 7 * dt);
        it.vx += (ux * along - it.vx) * k; it.vz += (uz * along - it.vz) * k;
        const sp = Math.sqrt(it.vx * it.vx + it.vz * it.vz);
        const max = it.vacuum ? TUNE_P.maxSpeed * 1.4 : TUNE_P.maxSpeed;
        if (sp > max) { it.vx *= max / sp; it.vz *= max / sp; }
        it.x += it.vx * dt; it.z += it.vz * dt;
        it.y += (0.62 - it.y) * Math.min(1, 10 * dt);
        const d2 = Math.hypot(hx - it.x, hz - it.z);
        if (d2 < TUNE_P.collectR * heroGrow + sp * dt) { this._collect(it); continue; }
      } else {
        // pop-out arc with bounces
        if (!it.grounded) {
          it.vy -= TUNE_P.gravity * dt;
          it.y += it.vy * dt;
          if (it.y <= rest) {
            it.y = rest;
            if (Math.abs(it.vy) < TUNE_P.restVy) { it.vy = 0; it.grounded = true; }
            else { it.vy = -it.vy * TUNE_P.bounce; it.vx *= 0.7; it.vz *= 0.7; }
          }
        } else {
          const f = Math.exp(-TUNE_P.groundFric * dt);
          it.vx *= f; it.vz *= f;
        }
        it.x += it.vx * dt; it.z += it.vz * dt;
        // arena rim: bounce back in
        const r = Math.sqrt(it.x * it.x + it.z * it.z);
        if (r > R) {
          const nx = it.x / r, nz = it.z / r;
          it.x = nx * R; it.z = nz * R;
          const vn = it.vx * nx + it.vz * nz;
          if (vn > 0) { it.vx -= 2 * vn * nx; it.vz -= 2 * vn * nz; it.vx *= 0.5; it.vz *= 0.5; }
        }
        if (it.t >= it.life) { this._free(it); continue; }
      }
      if (it.homing && !canGrab && it.t >= it.life) { this._free(it); continue; }

      // ---------- render ----------
      const mesh = this.meshes[it.kind];
      const idx = counters[it.kind]++;
      const left = it.life - it.t;
      let vis = 1;
      if (!it.homing && left < TUNE_P.blinkLast) vis = Math.sin(it.t * TUNE_P.blinkHz * TAU) > -0.2 ? 1 : 0;
      const pop = it.t < 0.22 ? easeOutBack(clamp(it.t / 0.22, 0, 1)) : 1;
      const bob = it.grounded && !it.homing ? Math.sin(time * 3.2 + it.ph) * 0.09 + 0.06 : 0;
      const s = it.scale * pop * vis * (it.homing ? 0.9 : 1);
      let ry = it.spin + time * 2.4, rx = 0, rz = 0;
      if (it.kind === 'heart') { ry = Math.sin(time * 2.6 + it.ph) * 0.9; }
      else if (it.kind === 'coin') { ry = it.spin + time * 4.2; }
      else if (it.kind === 'magnet') { ry = time * 1.5; rz = Math.sin(time * 5 + it.ph) * 0.25; }
      else { rx = Math.sin(time * 1.7 + it.ph) * 0.2; }
      this._e.set(rx, ry, rz, 'YXZ');
      this._q.setFromEuler(this._e);
      this._p.set(it.x, it.y + bob, it.z);
      this._s.set(s, s, s);
      this._m.compose(this._p, this._q, this._s);
      mesh.setMatrixAt(idx, this._m);

      if (gi < TUNE_P.cap) {
        const [, gs] = TUNE_P.glow[it.kind];
        const h = it.y + bob;
        const g = gs * it.scale * pop * vis * Math.max(0.35, 1 - (h - rest) * 0.35) * (0.9 + 0.1 * Math.sin(time * 5 + it.ph));
        this._m.makeScale(g, 1, g);
        this._m.setPosition(it.x, 0.035, it.z);
        this.glow.setMatrixAt(gi, this._m);
        this._c.copy(this._glowCol[it.kind]).multiplyScalar(it.kind === 'crystal' ? 0.85 : 0.7);
        this.glow.setColorAt(gi, this._c);
        gi++;
      }
    }
    for (const k of KINDS) {
      const m = this.meshes[k];
      m.count = counters[k];
      m.instanceMatrix.needsUpdate = true;
    }
    this.glow.count = gi;
    this.glow.instanceMatrix.needsUpdate = true;
    if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true;
  }

  clear() {
    for (const it of this.items) if (it.alive) this._free(it);
    for (const k of KINDS) this.meshes[k].count = 0;
    this.glow.count = 0;
  }

  dispose() {
    this.clear();
    this.G.scene?.remove(this.group);
    for (const k of KINDS) {
      this.meshes[k].geometry.dispose();
      this.meshes[k].material.dispose();
      this.meshes[k].dispose?.();
    }
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    this.glow.dispose?.();
  }
}
