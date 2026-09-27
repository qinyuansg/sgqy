// ─────────────────────────────────────────────────────────────
// CUBE DASH — wave director: stage waves & spawn patterns, maxAlive queue,
// wave events, objective totals, coin cube, 1-1 tutorial hooks, boss flow,
// Galaxy Survival (endless + warp gate), Daily Challenge, Shrink Storm,
// Boss Rush, mutators.
//
//   run.waves = new WaveDirector(G, run, stageDef, mode)
//   waves.update(dt) · waves.wave · waves.waveTotal · waves.done
//   waves.tutorialStep (current wave's tutorial id | null)
//   waves.hold = true  → pause spawning / wave advance (tutorial pacing hook)
//   waves.gate {x, z, open, t, radius}   (endless warp gate)
//   waves.timeLeft · waves.medal         (Shrink Storm)
//   export dailyMutator(date) · daySeed(date)
// Events: wave:start {index,total,isBoss,tutorial,novaFill} · wave:clear {index}
//         gate:open {x,z,seconds,bank} · gate:close {x,z,entered} · gate:enter {x,z,bank}
//         storm:shrink {radius,index} · coin:appear {x,z} · endless:theme {worldIndex}
// ─────────────────────────────────────────────────────────────
import { TAU, clamp, lerp, len2, smooth, makeRng, dayKey } from './core.js';
import { DATA } from './data.js';
import { addStrings, t } from './i18n.js';

const D = DATA.TUNE;
const EN = DATA.enemies;
const MODES = DATA.modes;

const TUNE = {
  firstWaveDelay: 0.8,
  breather: 1.2,                // pause after a wave is fully freed
  momentumLeft: 2, momentumTime: 3,   // ≤ 2 cubes left for 3 s → next wave anyway
  maxAliveRetry: 0.35,
  hardMaxAlive: 88,
  bossSpawnZ: -0.42,            // × arena radius (far side, facing the camera)
  eliteFromWorld: 4,            // stage mode: W5+ gets one elite per wave
  endless: {
    unlockAt: { grumpy: 1, zippy: 3, splitter: 5, popper: 7, beamer: 9, bruiser: 12 },
    weights: { grumpy: 5, zippy: 2, splitter: 2, popper: 2, beamer: 0.6, bruiser: 0.8 },
    maxBeamers: 3, maxBruisers: 4,
    waveTimeout: 40, nextAtFrac: 0.25,
    gateMinDist: 4, gateRadius: 1.3,
    speedGrowth: 0.012, speedCap: 1.3,
    bossHpGrowth: 0.15,
  },
  daily: { waveScale: 1.25 },   // 8 waves ≈ 170 cubes (a 3–4 min daily, not a marathon)
  storm: { spawnStart: 1.6, spawnEnd: 0.65, maxAliveStart: 26, maxAliveEnd: 12, shrinkTime: 3.0, grace: 0.5 },
  rush: { breather: 3.0, min: 2 },
  themeCycle: true,
};

addStrings({
  zh: { 'wave.gate': '传送门开启!', 'wave.gateHint': '进门保存分数', 'storm.shrink': '风暴缩圈!', 'wave.endless': '第{n}波', 'wave.rushNext': '下一个大王!', 'wave.coin': '金币方出现!' },
  en: { 'wave.gate': 'Warp Gate!', 'wave.gateHint': 'Step in to bank', 'storm.shrink': 'Storm closing in!', 'wave.endless': 'Wave {n}', 'wave.rushNext': 'Next King!', 'wave.coin': 'Coin Cube!' },
});

/** stable 32-bit hash of the local date */
export function daySeed(date = new Date()) {
  const k = dayKey(date);
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** today's mutator (date-seeded from MUTATORS) — endless & daily */
export function dailyMutator(date = new Date()) {
  const M = DATA.mutators;
  return M[daySeed(date) % M.length];
}

const splitExtra = (type, count) => (type === 'splitter' ? count * (EN.splitter.splitInto ?? 2) : 0);

export class WaveDirector {
  constructor(G, run, stageDef, mode) {
    this.G = G; this.run = run; this.bus = G.bus;
    this.mode = mode || run?.mode || 'stage';
    this.stageDef = stageDef || null;
    this.rng = run?.rng || makeRng(Date.now() & 0xffffff);
    this.worldIndex = run?.worldIndex ?? stageDef?.world ?? 0;
    this.mutator = run?.mutator ?? ((this.mode === 'daily' || this.mode === 'endless') ? dailyMutator() : null);
    if (this.mutator && run && run.mutator == null) this._setRun('mutator', this.mutator);
    this.t = 0; this.started = false; this.done = false;
    this.wave = 0; this.waveTotal = 0; this.waves = []; this.ws = []; this.pending = [];
    this.tutorialStep = null; this.hold = false;
    this.gate = { x: 0, z: 0, open: false, t: 0, radius: TUNE.endless.gateRadius, next: MODES.endless.warpGate.every };
    this.coinAt = -1; this.coinSpawned = false;
    this.boss = null; this.rushNext = 0;
    this.freed = 0; this.medal = 0; this.timeLeft = 0;
    this.stormIdx = 0; this.stormAnim = null; this.stormTick = 0; this.spawnT = 0; this.stormRadii = null;
    this.endlessN = 0; this.themeIdx = -1; this.themeBase = this.worldIndex;
    this.totalCubes = 0;
    this._pairSeq = 0;
    this._pos = { x: 0, z: 0 };
    this._unsub = [
      this.bus.on('boss:defeat', (p) => this._onBossDefeat(p)),
      this.bus.on('enemy:freed', (p) => { if (!p?.treasure) this.freed++; }),
    ];
    this._build();
    this._setRun('totalCubes', this.totalCubes);
    // 🚩 checkpoint retry: run.startWave > 0 → earlier waves count as cleared (run restores freedCount)
    this.startWave = this.mode === 'stage' ? clamp(run?.startWave | 0, 0, Math.max(0, this.waveTotal - 1)) : 0;
    for (let i = 0; i < this.startWave; i++) this.ws[i] = { started: true, t0: 0, cleared: true, clearT: -9, lowT: 0, total: 0 };
  }

  get em() { return this.run?.enemies || null; }
  get R() { return this.run?.arenaRadius ?? this.G.world?.arenaRadius ?? 11; }
  _setRun(k, v) { try { if (this.run) this.run[k] = v; } catch { /* read-only on Run */ } }
  _call(fn, ...args) { try { const f = this.run?.[fn]; if (typeof f === 'function') { f.apply(this.run, args); return true; } } catch (err) { console.error(`[waves] run.${fn}`, err); } return false; }

  // ─────────────── build per mode ───────────────
  _build() {
    switch (this.mode) {
      case 'daily':
        this.waves = this._genDaily();
        this.waveTotal = this.waves.length;
        break;
      case 'endless':
        this.waves = []; this.waveTotal = 0;
        break;
      case 'storm':
        this.waveTotal = MODES.storm.radii.length;
        this.timeLeft = MODES.storm.time;
        break;
      case 'rush': {
        // only kings the kid has already reached (their boss stage is unlocked) — never an unseen W6 laser on day 2
        const n = this._rushCount();
        this.waves = [];
        for (let i = 0; i < n; i++) this.waves.push({ groups: [], boss: true, bossWorld: i });
        this.waveTotal = this.waves.length;
        break;
      }
      default: {
        const sd = this.stageDef;
        this.waves = (sd?.waves || []).map((w) => this._applyMut(w));
        this.waveTotal = this.waves.length;
        if (sd?.coinCube && !sd.boss && this.mode === 'stage') this.coinAt = this.rng.range(40, 110);
        if (this.worldIndex >= TUNE.eliteFromWorld && !sd?.boss) this._seedElites();
      }
    }
    this.totalCubes = this.waves.reduce((s, w) => s + this._countWave(w), 0);
  }

  /** deep-enough clone of a wave with the mutator applied (never mutates DATA) */
  _applyMut(w) {
    const M = this.mutator;
    const groups = (w.groups || []).map((g) => {
      const c = { ...g, opts: g.opts ? { ...g.opts } : undefined };
      if (M?.forceSize && c.type === 'grumpy') c.size = M.forceSize;
      if (M?.countMult) c.count = Math.max(1, Math.round(c.count * M.countMult));
      return c;
    });
    if (M?.extraType && groups.length) {
      const tot = groups.reduce((s, g) => s + g.count, 0);
      groups.push({ type: M.extraType, count: Math.max(1, Math.round(tot * 0.2)), pattern: 'portal', delay: 2, gap: 0.8 });
    }
    return { ...w, groups };
  }
  _countWave(w) { return (w.groups || []).reduce((s, g) => s + g.count + splitExtra(g.type, g.count), 0); }

  /** W5+ stages: the first grumpy/splitter group of each wave leads with one elite */
  _seedElites() {
    for (const w of this.waves) {
      const g = (w.groups || []).find((q) => q.type === 'grumpy' || q.type === 'splitter');
      if (g) g.eliteFirst = true;
    }
  }

  // ─────────────── update ───────────────
  update(dt) {
    if (!(dt > 0) || this.done) return;
    this.t += dt;
    try {
      switch (this.mode) {
        case 'storm': this._updateStorm(dt); break;
        case 'rush': this._updateRush(dt); break;
        case 'endless': this._updateEndless(dt); break;
        default: this._updateStage(dt);
      }
    } catch (err) { console.error('[waves] update', err); }
  }

  _updateStage(dt) {
    if (!this.started) {
      if (this.t >= TUNE.firstWaveDelay || this.stageDef?.boss) { this.started = true; this._startWave(this.startWave || 0); }
      return;
    }
    this._processPending();
    this._checkClears();
    this._updateCoin();
    const cw = this.wave, ws = this.ws[cw], w = this.waves[cw];
    if (!ws || !w || w.boss) return;                    // boss wave ends on boss:defeat
    if (cw < this.waveTotal - 1) {
      if (this.hold) return;
      const pend = this._pendingIn(cw), alive = this.em?.countWave(cw) ?? 0;
      if (ws.cleared) { if (this.t - ws.clearT >= TUNE.breather) this._startWave(cw + 1); }
      else if (pend === 0 && alive <= TUNE.momentumLeft) { ws.lowT += dt; if (ws.lowT >= TUNE.momentumTime) this._startWave(cw + 1); }
      else ws.lowT = 0;
    } else if (!this.pending.length && (this.em?.aliveCount ?? 0) === 0) {
      this._finish();
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this._call('onStageCleared');
  }
  /** end the run from outside: run.finish(win, {scoreMult}) (storm time-up, warp gate, boss rush) */
  _endRun(win = true, scoreMult = 1) {
    this.done = true;
    if (this._call('finish', win, { scoreMult })) return;
    if (scoreMult !== 1) this._setRun('warpBank', scoreMult);
    this._call('onStageCleared');
  }

  _paceMult() {
    const g = Math.max(1, this.run?.guardian?.spawnMult ?? 1);        // guardian: slower spawns only
    return g / (this.run?.fever ? D.fever.spawnMult : 1);
  }

  _startWave(i) {
    const w = this.waves[i];
    if (!w) return;
    this.wave = i;
    const ws = this.ws[i] = { started: true, t0: this.t, cleared: false, clearT: 0, lowT: 0, total: this._countWave(w) };
    this.tutorialStep = w.tutorial || null;
    const pace = this._paceMult();
    const pairId = w.steerTogether ? 'pair' + (++this._pairSeq) : null;
    for (const g of w.groups || []) {
      const base = this.rng() * TAU;
      for (let k = 0; k < g.count; k++) {
        let elite = g.elite === true ? (this.rng() < 0.5 ? 'shielded' : 'speedy') : (g.elite || g.opts?.elite || null);
        if (g.eliteFirst && k === 0) elite = this.rng() < 0.5 ? 'shielded' : 'speedy';
        this.pending.push({
          at: this.t + ((g.delay || 0) + k * (g.gap ?? 0.7)) * pace,
          type: g.type, size: g.size, opts: g.opts || null, pattern: g.pattern || 'portal', k, count: g.count, base,
          speedMult: g.speedMult ?? 1, wave: i, elite,
          pairId: pairId && g.type === 'grumpy' ? pairId : null, steer: w.steerTogether || 0,
        });
      }
    }
    this._setRun('wave', i);
    // the Coin Cube visits every normal stage once: a fast clear still meets it in the last wave
    if (this.mode === 'stage' && i === this.waveTotal - 1 && this.coinAt >= 0 && !this.coinSpawned) {
      this.coinAt = Math.min(this.coinAt, (this.run?.time ?? this.t) + this.rng.range(3, 6));
    }
    this.bus.emit('wave:start', {
      index: i, total: this.waveTotal, isBoss: !!w.boss, tutorial: w.tutorial || null, novaFill: !!w.novaFill,
      mode: this.mode, number: this.mode === 'endless' ? this.endlessN : i + 1, cubes: ws.total,
    });
    try { this.G.world?.pulseRim?.(w.boss ? 0xff3df2 : undefined); } catch { /* */ }
    if (w.boss) {
      const last = this.mode !== 'rush' || i >= this.waveTotal - 1;
      this._spawnBoss(w.bossWorld ?? this.worldIndex, {
        final: this.mode === 'endless' ? false : last,
        finale: this.mode === 'stage' && (w.bossWorld ?? this.worldIndex) === 5,
        hpMult: w.hpMult ?? 1,
      });
    }
  }

  _spawnBoss(worldIndex, { final = true, finale = false, hpMult = 1 } = {}) {
    const em = this.em;
    if (!em?.spawnBoss) return null;
    const fresh = this.mode !== 'stage';                 // checkpoints & failed-attempt slowdown only for stage bosses
    this.boss = em.spawnBoss({ worldIndex, x: 0, z: this.R * TUNE.bossSpawnZ, final, finale, hpMult, ...(fresh ? { attempt: 0, noCheckpoint: true } : {}) });
    return this.boss;
  }

  _maxAlive() {
    let m = this.mode === 'endless' ? MODES.endless.wave.maxAlive
      : (this.G.world?.theme?.maxAlive ?? DATA.worlds[this.worldIndex]?.maxAlive ?? 20);
    return Math.min(TUNE.hardMaxAlive, m);
  }

  _processPending() {
    if (!this.pending.length || this.hold) return;
    const em = this.em;
    if (!em) return;
    const maxAlive = this._maxAlive();
    let alive = em.aliveCount;
    for (let i = 0; i < this.pending.length; i++) {
      const p = this.pending[i];
      if (p.at > this.t) continue;
      if (alive >= maxAlive) { p.at = this.t + TUNE.maxAliveRetry; continue; }
      this._spawnEntry(p);
      this.pending.splice(i, 1); i--; alive++;
    }
  }

  _spawnEntry(p) {
    const pos = this._patternPos(p.pattern, p.k, p.count, p.base);
    const opts = { size: p.size, speedMult: p.speedMult, wave: p.wave, ...(p.opts || {}) };
    if (p.elite) opts.elite = p.elite;
    if (p.pairId) { opts.pairId = p.pairId; opts.steerTogether = p.steer || 0.4; }
    if (this.mutator?.forceSize && p.type === 'grumpy') opts.size = this.mutator.forceSize;
    return this.em.spawnWithPortal(p.type, pos.x, pos.z, opts);
  }

  _pendingIn(i) { let n = 0; for (const p of this.pending) if (p.wave === i) n++; return n; }

  /** spawn positions by pattern (portal · ring · sides · corners · center · line · edge) */
  _patternPos(pattern, k, count, base = 0) {
    const R = this.R, pl = this.run?.player, out = this._pos, rng = this.rng;
    const hx = pl?.x ?? 0, hz = pl?.z ?? 0;
    const minD = D.spawn.minDistFromPlayer;
    let x = 0, z = 0;
    switch (pattern) {
      case 'ring': { const a = base + (k / Math.max(1, count)) * TAU; x = Math.sin(a) * R * 0.8; z = Math.cos(a) * R * 0.8; break; }
      case 'sides': {
        const side = k % 2 ? 1 : -1, row = Math.floor(k / 2), rows = Math.ceil(count / 2);
        x = side * R * 0.74; z = rows > 1 ? lerp(-0.45, 0.45, row / (rows - 1)) * R : 0;
        break;
      }
      case 'corners': {
        const a = Math.PI / 4 + (k % 4) * Math.PI / 2, r = R * Math.max(0.35, 0.72 - Math.floor(k / 4) * 0.12);
        x = Math.sin(a) * r; z = Math.cos(a) * r;
        break;
      }
      case 'center': {
        const a = base + k * 2.4, r = count > 1 ? 1.2 + (k % 3) * 0.9 : 0;
        x = Math.sin(a) * r; z = Math.cos(a) * r;
        const d = len2(x - hx, z - hz);
        if (d < minD) {
          let ux = -hx, uz = -hz, ul = len2(ux, uz);
          if (ul < 0.5) { ux = 0; uz = -1; ul = 1; }
          x += ux / ul * (minD - d + 0.6); z += uz / ul * (minD - d + 0.6);
        }
        break;
      }
      case 'line': { x = lerp(-0.6, 0.6, count > 1 ? k / (count - 1) : 0.5) * R; z = (hz > 0 ? -1 : 1) * R * 0.5; break; }
      case 'edge': { const a = rng() * TAU; x = Math.sin(a) * R * 0.85; z = Math.cos(a) * R * 0.85; break; }
      default: {                                          // 'portal': random point ≥ 3.5 u from the hero
        for (let tries = 0; tries < 12; tries++) {
          const a = rng() * TAU, r = R * (0.35 + 0.5 * rng());
          x = Math.sin(a) * r; z = Math.cos(a) * r;
          if (len2(x - hx, z - hz) >= minD + 0.5) break;
        }
      }
    }
    const d = len2(x, z), lim = R - 1.0;
    if (d > lim) { x *= lim / d; z *= lim / d; }
    const w = this.G.world;
    // keep portals off bumper pillars (plain geometry: world.bumperHit() would also play the bumper's bounce animation)
    const bumpers = w?.features?.bumpers ?? DATA.worlds[this.worldIndex]?.features?.bumpers;
    if (bumpers) for (const b of bumpers) {
      const dx = x - b.x, dz = z - b.z, d = len2(dx, dz), need = (b.r ?? 0.9) + 0.9;
      if (d < need) { const k = d > 1e-3 ? 1 / d : 0; x = b.x + (k ? dx * k : 1) * (need + 0.9); z = b.z + (k ? dz * k : 0) * (need + 0.9); }
    }
    try { if (w?.solidAt && w.solidAt(x, z) === false) { x *= 0.55; z *= 0.55; } } catch { /* */ }
    out.x = x; out.z = z;
    return out;
  }

  _checkClears() {
    for (let i = 0; i <= this.wave; i++) {
      const ws = this.ws[i];
      if (!ws || ws.cleared || this.waves[i]?.boss) continue;
      if (this._pendingIn(i) === 0 && (this.em?.countWave(i) ?? 0) === 0) {
        ws.cleared = true; ws.clearT = this.t;
        this.bus.emit('wave:clear', { index: i });
        this._call('onWaveCleared', i);
      }
    }
  }

  _updateCoin(ownClock = false) {
    if (this.coinAt < 0 || this.coinSpawned || this.done) return;
    const rt = ownClock ? this.t : (this.run?.time ?? this.t);
    if (rt < this.coinAt) return;
    this.coinSpawned = true;
    const pos = this._patternPos('portal', 0, 1, 0);
    this.em?.spawnWithPortal('coin', pos.x, pos.z, {});
    this.bus.emit('coin:appear', { x: pos.x, z: pos.z, textKey: 'wave.coin', text: t('wave.coin') });
  }

  // ─────────────── boss flow ───────────────
  _onBossDefeat(p) {
    const i = this.wave, ws = this.ws[i];
    if (ws && !ws.cleared) {
      ws.cleared = true; ws.clearT = this.t;
      this.bus.emit('wave:clear', { index: i, boss: true });
      this._call('onWaveCleared', i);
    }
    if (this.mode === 'rush') {
      if (i >= this.waveTotal - 1) this._endRun(true);
      else {
        this.rushNext = this.t + TUNE.rush.breather;
        this._heal(MODES.rush.heartsRefill ?? 1);
        this.bus.emit('rush:next', { index: i + 1, textKey: 'wave.rushNext', text: t('wave.rushNext') });
      }
    } else if (this.mode === 'endless') {
      // keep going: _updateEndless starts the next wave after a breather
    } else {
      this.done = true;
      this._call('onBossDefeated');
    }
  }

  /** Boss Rush length: worlds whose boss stage is unlocked (min TUNE.rush.min, all 6 without a meta system) */
  _rushCount() {
    const W = DATA.worlds.length, meta = this.G.meta;
    if (typeof meta?.isStageUnlocked !== 'function') return W;
    let n = 0;
    try { for (let i = 0; i < W; i++) if (meta.isStageUnlocked(i, 4)) n = i + 1; } catch { return W; }
    return clamp(n, Math.min(W, TUNE.rush.min), W);
  }

  _heal(n) {
    const r = this.run;
    if (!r) return;
    if (this._call('healPlayer', n)) return;
    if (this._call('heal', n)) return;
    const p = r.player;
    if (p && typeof p.hp === 'number') {
      p.hp = Math.min(p.maxHp ?? p.hp + n, p.hp + n);
      this.bus.emit('player:heal', { x: p.x, z: p.z, amount: n, hp: p.hp, maxHp: p.maxHp });
    }
  }

  _updateRush() {
    if (!this.started) { this.started = true; this._startWave(0); return; }
    if (this.rushNext > 0 && this.t >= this.rushNext) { this.rushNext = 0; this._startWave(this.wave + 1); }
  }

  // ─────────────── Galaxy Survival (endless) ───────────────
  _updateEndless(dt) {
    if (!this.started) {
      if (this.t >= TUNE.firstWaveDelay) { this.started = true; this._nextEndless(); }
      return;
    }
    this._processPending();
    this._checkClears();
    this._updateGate(dt);
    if (this.done) return;
    // boss minions (summons / rain) are extra cubes: keep freed ≤ total for the objective counters
    const need = (this.run?.freedCount | 0) + (this.em?.aliveCount ?? 0);
    if (need > this.totalCubes) { this.totalCubes = need; this._setRun('totalCubes', need); }
    if (this.coinAt < 0 && this.stageDef?.coinCube !== false) this.coinAt = this.t + this.rng.range(40, 110);
    this._updateCoin(true);
    if (this.coinSpawned && this.coinAt >= 0 && this.t > this.coinAt + 20) { this.coinSpawned = false; this.coinAt = this.t + this.rng.range(70, 130); }
    const cw = this.wave, ws = this.ws[cw], w = this.waves[cw];
    if (!ws || !w) return;
    if (w.boss) { if (ws.cleared && this.t - ws.clearT >= TUNE.breather + 1) this._nextEndless(); return; }
    if (this.hold) return;
    const pend = this._pendingIn(cw), alive = this.em?.countWave(cw) ?? 0;
    const frac = (pend + alive) / Math.max(1, ws.total);
    const next = ws.cleared ? this.t - ws.clearT >= TUNE.breather
      : (pend === 0 && (frac <= TUNE.endless.nextAtFrac || alive <= TUNE.momentumLeft)) || this.t - ws.t0 > TUNE.endless.waveTimeout;
    if (next) this._nextEndless();
  }

  _nextEndless() {
    const n = ++this.endlessN;
    const cyc = MODES.endless.worldCycleEvery;
    const ti = (this.themeBase + Math.floor((n - 1) / cyc)) % DATA.worlds.length;
    if (ti !== this.themeIdx) {
      const first = this.themeIdx < 0;
      this.themeIdx = ti; this.worldIndex = ti;
      if (!first && TUNE.themeCycle) {
        try { this.G.world?.load?.(DATA.worlds[ti].id); } catch (err) { console.error('[waves] theme', err); }
        this.bus.emit('endless:theme', { worldIndex: ti, worldId: DATA.worlds[ti].id });
      }
    }
    const w = this._genEndlessWave(n, this.rng, true);
    this.waves.push(w);
    if (this.em) this.em.tokenBonus = Math.min(4, Math.floor(n / 4));
    const add = this._countWave(w);
    this.totalCubes += add;
    this._setRun('totalCubes', this.totalCubes);
    this._startWave(this.waves.length - 1);
  }

  /** endless / daily wave n: count = 8 + 2.2n, roster grows in world order, elites every 3, boss every 10 */
  _genEndlessWave(n, rng = this.rng, allowBoss = true) {
    const E = MODES.endless.wave, T = TUNE.endless, M = this.mutator;
    if (allowBoss && n % E.bossEvery === 0) {
      const k = n / E.bossEvery;
      return { groups: [], boss: true, bossWorld: Math.min(5, k - 1), hpMult: 1 + Math.max(0, k - 1) * T.bossHpGrowth };
    }
    const count = Math.max(3, Math.round((E.baseCount + E.countGrowth * n) * (M?.countMult ?? 1)));
    const roster = Object.keys(T.unlockAt).filter((k) => n >= T.unlockAt[k]);
    const items = roster.map((k) => ({ k, w: T.weights[k] }));
    const speed = Math.min(T.speedCap, 1 + n * T.speedGrowth);
    const counts = {};
    for (let i = 0; i < count; i++) {
      let type = rng.weighted(items).k;
      if (type === 'beamer' && (counts.beamer || 0) >= T.maxBeamers) type = 'grumpy';
      if (type === 'bruiser' && (counts.bruiser || 0) >= T.maxBruisers) type = 'grumpy';
      counts[type] = (counts[type] || 0) + 1;
    }
    if (M?.extraType) counts[M.extraType] = (counts[M.extraType] || 0) + Math.max(1, Math.round(count * 0.25));
    const patterns = ['ring', 'portal', 'sides', 'corners'];
    const groups = [];
    let delay = 0;
    for (const type of Object.keys(counts)) {
      const c = counts[type];
      if (!c) continue;
      if (type === 'grumpy') {
        const chunks = M?.forceSize ? [[M.forceSize, c]]
          : [['S', Math.ceil(c * 0.5)], ['M', Math.ceil(c * 0.35)], ['L', 0]];
        if (!M?.forceSize) chunks[2][1] = Math.max(0, c - chunks[0][1] - chunks[1][1]);
        for (const [size, cc] of chunks) {
          if (cc <= 0) continue;
          groups.push({ type, size, count: cc, pattern: rng.pick(patterns), delay, gap: 0.4, speedMult: speed });
          delay += 1.4;
        }
      } else {
        const pat = type === 'beamer' ? rng.pick(['sides', 'ring', 'center']) : rng.pick(patterns);
        groups.push({ type, count: c, pattern: pat, delay, gap: 0.55, speedMult: speed });
        delay += 1.2;
      }
    }
    if (n % E.eliteEvery === 0) {
      const pool = roster.filter((k) => k !== 'beamer');
      groups.push({ type: rng.pick(pool), size: 'M', count: 1 + Math.floor(n / 9), pattern: 'portal', delay: delay + 1, gap: 1, speedMult: speed, elite: true });
    }
    return { groups, endless: n };
  }

  _updateGate(dt) {
    const WG = MODES.endless.warpGate, g = this.gate, p = this.run?.player;
    if (!g.open) {
      g.next -= dt;
      if (g.next > 0) return;
      const R = this.R;
      for (let tries = 0; tries < 12; tries++) {
        const a = this.rng() * TAU, r = R * (0.3 + 0.4 * this.rng());
        g.x = Math.sin(a) * r; g.z = Math.cos(a) * r;
        if (!p || len2(g.x - p.x, g.z - p.z) >= TUNE.endless.gateMinDist) break;
      }
      g.open = true; g.t = WG.open;
      this.bus.emit('gate:open', { x: g.x, z: g.z, seconds: WG.open, bank: WG.bank, textKey: 'wave.gate', text: t('wave.gate') });
      return;
    }
    g.t -= dt;
    if (p && len2(p.x - g.x, p.z - g.z) < g.radius) {
      g.open = false; g.next = WG.every;
      this.bus.emit('gate:close', { x: g.x, z: g.z, entered: true });
      this.bus.emit('gate:enter', { x: g.x, z: g.z, bank: WG.bank });
      this._setRun('warpBank', WG.bank);
      this._endRun(true, WG.bank);
      return;
    }
    if (g.t <= 0) {
      g.open = false; g.next = WG.every;
      this.bus.emit('gate:close', { x: g.x, z: g.z, entered: false });
    }
  }

  // ─────────────── Daily Challenge ───────────────
  _genDaily() {
    const rng = makeRng(daySeed());
    const waves = [];
    for (let i = 1; i <= MODES.daily.waves; i++) {
      let n = Math.round(i * TUNE.daily.waveScale);
      if (n % MODES.endless.wave.bossEvery === 0) n++;
      waves.push(this._genEndlessWave(n, rng, false));
    }
    return waves;
  }

  // ─────────────── Shrink Storm ───────────────
  _updateStorm(dt) {
    const S = MODES.storm;
    if (!this.started) { this.started = true; this._stormInit(); }
    this.timeLeft = Math.max(0, S.time - this.t);
    if (this.stormIdx < S.at.length && this.t >= S.at[this.stormIdx]) { this.stormIdx++; this._stormShrink(this.stormIdx); }
    if (this.stormAnim) {
      const a = this.stormAnim;
      a.t += dt;
      const k = clamp(a.t / TUNE.storm.shrinkTime, 0, 1);
      this._setRun('arenaRadius', lerp(a.from, a.to, smooth(k)));
      if (k >= 1) this.stormAnim = null;
    }
    // outside the storm wall: 1 heart every stormTick seconds (short grace)
    const p = this.run?.player;
    if (p) {
      if (len2(p.x, p.z) > this.R + 0.15) {
        this.stormTick += dt;
        if (this.stormTick >= S.stormTick) { this.stormTick = 0; try { this.run.hurtPlayer?.(1, 0, 0, 'storm'); } catch { /* */ } }
      } else this.stormTick = S.stormTick - TUNE.storm.grace;
    }
    // continuous spawns from the storm edge
    const em = this.em;
    this.spawnT -= dt;
    if (em && this.spawnT <= 0) {
      const k = clamp(this.t / S.time, 0, 1);
      this.spawnT = lerp(TUNE.storm.spawnStart, TUNE.storm.spawnEnd, k) * Math.max(1, this.run?.guardian?.spawnMult ?? 1);
      const cap = Math.round(lerp(TUNE.storm.maxAliveStart, TUNE.storm.maxAliveEnd, this.stormIdx / Math.max(1, S.at.length)));
      if (em.aliveCount < cap) {
        const pos = this._patternPos('edge', 0, 1, 0);
        const size = this.mutator?.forceSize || this.rng.pick(['S', 'S', 'M']);
        const type = this._stormType();
        em.spawnWithPortal(type, pos.x, pos.z, { size, wave: this.stormIdx, delay: 0.9 });
        this.totalCubes += 1 + splitExtra(type, 1);
        this._setRun('totalCubes', this.totalCubes);
      }
    }
    const freed = this.run?.freedCount ?? this.freed;
    let medal = 0; for (let i = 0; i < S.medals.length; i++) if (freed >= S.medals[i]) medal++;   // (per frame: no array)
    this.medal = medal;
    if (this.t >= S.time) {
      this._setRun('stormMedal', this.medal);
      this.bus.emit('wave:clear', { index: this.stormIdx, storm: true });
      this._endRun(true);
    }
  }

  _stormInit() {
    const S = MODES.storm;
    const baseR = this.G.world?.arenaRadius ?? this.R;
    const k = Math.min(1, baseR / S.radii[0]);
    this.stormRadii = S.radii.map((r) => r * k);
    this._setRun('arenaRadius', this.stormRadii[0]);
    try { this.G.world?.setPlayRadius?.(this.stormRadii[0]); } catch { /* */ }
    this.spawnT = 0.5;
    this.bus.emit('wave:start', { index: 0, total: this.waveTotal, isBoss: false, mode: 'storm', radius: this.stormRadii[0] });
  }

  _stormShrink(i) {
    const to = this.stormRadii[Math.min(i, this.stormRadii.length - 1)];
    this.stormAnim = { from: this.R, to, t: 0 };
    this.wave = i;
    this._setRun('wave', i);
    try { this.G.world?.setPlayRadius?.(to); this.G.world?.pulseRim?.(0xff5fd2); } catch { /* */ }
    this.bus.emit('wave:clear', { index: i - 1, storm: true });
    this.bus.emit('wave:start', { index: i, total: this.waveTotal, isBoss: false, mode: 'storm', radius: to });
    this.bus.emit('storm:shrink', { radius: to, index: i, textKey: 'storm.shrink', text: t('storm.shrink') });
  }

  _stormType() {
    const tt = this.t, r = this.rng();
    if (tt > 90 && r < 0.12) return 'splitter';
    if (tt > 60 && r < 0.27) return 'popper';
    if (tt > 30 && r < 0.42) return 'zippy';
    return 'grumpy';
  }

  // ─────────────── lifecycle ───────────────
  dispose() {
    for (const u of this._unsub) u();
    this._unsub.length = 0;
    this.pending.length = 0;
    if (this.mode === 'storm') { try { this.G.world?.setPlayRadius?.(this.G.world?.arenaRadius ?? this.R); } catch { /* */ } }
    if (this.gate.open) { this.gate.open = false; this.bus.emit('gate:close', { x: this.gate.x, z: this.gate.z, entered: false }); }
  }
}
