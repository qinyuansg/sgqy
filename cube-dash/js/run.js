// ─────────────────────────────────────────────────────────────
// CUBE DASH — Run: one play session (stage / endless / daily / storm / rush)
//
//   Orchestrates the core loop (docs/ARCHITECTURE.md §6 Run, §7 results):
//     intro cinematic → 3-2-1-GO → play (waves · enemies · hero · cards ·
//     pickups) → victory / defeat → results (+ one revive).
//   Kid-UX overrides (DESIGN_BRIEF §7): every hit costs exactly 1 heart (size =
//   knockback), a free Second Chance the first time hearts hit 0, a 🚩
//   checkpoint at the middle wave, crowns (internally `stars`) are independent.
//   Owns the "rules" layer: STYLE combo & tiers, score, XP & level-ups, NOVA
//   charge, hearts / i-frames / shields, guardian DDA, FEVER finale, the
//   objective bar (freed / total), ★ rules and every ★3 challenge counter,
//   the 1-1 tutorial prompts, and the juice budget (hit-stop / shake / rumble).
//
//   Subsystems (created in the contract order, each gets (G, run)):
//     run.enemies (enemies.js) · run.waves (waves.js) · run.pickups ·
//     run.upgrades · run.playerCtl (run.player === run.playerCtl.state)
// ─────────────────────────────────────────────────────────────
import { TUNE, WORLDS, MODES, MUTATORS, ENEMIES, BOSS, heroById } from './data.js';
import { clamp, makeRng, dayKey } from './core.js';
import { t, tl, addStrings } from './i18n.js';
import { EnemyManager } from './enemies.js';
import { WaveDirector } from './waves.js';
import { Pickups } from './pickups.js';
import { Upgrades } from './upgrades.js';
import { Player } from './player.js';

const TUNE_R = {
  countdownStep: 0.72,
  introMax: 4.5, introShortMax: 2.0, introSkipAfter: 0.25,
  bossIntroMax: 3.6, bossIntroMin: 0.4,
  victoryHold: 0.9, victoryCineMax: 5, victoryMinEnd: 2.4, freeRestAfter: 0.25,
  dyingTime: 1.1, defeatCineMax: 2.6,
  milestones: [5, 10, 20, 25, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000],
  parPerWave: 30,
  resumeIframes: 0.5, levelUpIframes: 0.4, reviveIframes: 2, levelUpGap: 0.35,
  reviveClear: { radius: 6, knock: 12, dizzy: 2 },
  magnetDrop: { chance: 0.012, minCrystals: 12 },
  intensityEvery: 0.25,
  bombWindow: 0.25, novaTail: 0.35, novaGrace: 0.3,
  tutorial: { moveDist: 1.5, blobBonks: 3, firstSmashStop: 200, dizzySlow: [0.6, 1.0] },
  shakeFalloff: 14,
  fullHeartScore: 100,
  maxedLevelScore: 500,
  shieldStop: 60,
  secondChance: { hearts: 3, iframes: 2, radius: 6, knock: 14, dizzy: 1.5, guard: 0.6 },
  knockbackPerHeart: 0.45,        // contact 'hearts' now scale knockback, not damage
  bossKnockback: 3.0,             // King Glitch shoves like a Bruiser (data has no boss knockback)
};

const TUT = {
  move: { icon: '🕹️', textKey: 'tut.move', action: 'move' },
  bonk: { icon: '💥', textKey: 'tut.bonk', action: 'move' },
  dash: { icon: '⚡', textKey: 'tut.dash', action: 'dash' },
  knock: { icon: '👊', textKey: 'tut.knock', action: 'dash' },
  blob: { icon: '🌀', textKey: 'tut.blob', action: 'move' },
  nova: { icon: '✦', textKey: 'tut.nova', action: 'nova' },
};

addStrings({
  zh: {
    'tut.move': '移动一下!', 'tut.bonk': '引它们相撞!', 'tut.dash': '冲过去解救!', 'tut.knock': '撞过去!',
    'tut.blob': '把它们引到一起!', 'tut.nova': '放大招!', 'tut.freed': '解救!',
    'run.maxed': '全满级!', 'run.fullHeart': '爱心满满!',
  },
  en: {
    'tut.move': 'Move around!', 'tut.bonk': 'Make them BONK!', 'tut.dash': 'Dash to free it!', 'tut.knock': 'Knock it!',
    'tut.blob': 'Lure them together!', 'tut.nova': 'Use NOVA!', 'tut.freed': 'FREED!',
    'run.maxed': 'ALL MAXED!', 'run.fullHeart': 'FULL HEARTS!',
  },
});

// ---------- helpers ----------
const isGone = (e) => !e || e.dead || e.portal === true || e.state === 'dying' || e.state === 'portal';
const smashableOf = (e) => e.smashable ?? e.coreOpen ?? false;
const RIM_SOURCES = new Set(['rim', 'wall', 'edge']);
const LASER_SOURCES = new Set(['laser', 'beam', 'beamer']);
const BOWL_SOURCES = new Set(['knock', 'knocked', 'bowl', 'cube', 'bonk', 'collision', 'hit']);

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function worldIndexOf(id) {
  if (typeof id === 'number' && WORLDS[id]) return id;
  const n = Number(id);
  if (id !== '' && id !== null && Number.isInteger(n) && WORLDS[n]) return n;
  const i = WORLDS.findIndex((w) => w.id === id);
  return i >= 0 ? i : 0;
}
function stageIndexOf(world, id) {
  const max = world.stages.length - 1;
  if (typeof id === 'number') return clamp(Math.floor(id), 0, max);
  if (typeof id === 'string') {
    const i = world.stages.findIndex((s) => s.id === id);
    if (i >= 0) return i;
    const n = Number(id);
    if (Number.isInteger(n)) return clamp(n, 0, max);
  }
  return 0;
}
function sizeKeyOf(size) { return size >= 1.8 ? 'XL' : size >= 1.25 ? 'L' : size >= 0.9 ? 'M' : 'S'; }

export class Run {
  constructor(G, cfg = {}) {
    this.G = G;
    this.cfg = cfg;
    this.disposed = false;
    this._offs = [];
    this._errs = new Set();

    // ---------- identity ----------
    this.mode = cfg.mode || 'stage';
    this.worldIndex = worldIndexOf(cfg.worldId ?? 0);
    this.worldDef = WORLDS[this.worldIndex];
    this.worldId = cfg.worldId ?? this.worldIndex;
    this.stageIndex = stageIndexOf(this.worldDef, cfg.stageId ?? 0);
    this.stageId = cfg.stageId ?? this.stageIndex;
    this.modeDef = MODES[this.mode] || MODES.stage;
    if (this.mode === 'stage') this.stageDef = this.worldDef.stages[this.stageIndex];
    else {
      this.stageDef = {
        id: this.mode, world: this.worldIndex, index: 0, kind: this.mode, mode: this.mode,
        name: this.modeDef.name, waves: [], objective: null, coinCube: this.mode === 'endless', boss: this.mode === 'rush',
      };
    }
    this.stageName = tl(this.stageDef.name);
    this.isBossStage = !!this.stageDef.boss || this.stageDef.kind === 'boss';
    this.tutorial = this.stageDef.kind === 'tutorial' || this.stageDef.tutorial === true;
    this.unloseable = this.tutorial;                    // 1-1: hearts never drop below 1
    this.heroDef = heroById(cfg.heroId);
    this.heroId = this.heroDef.id;
    this.skinId = cfg.skinId ?? null;
    this.assist = !!cfg.assist;
    this.mutator = this._pickMutator(cfg);
    this.attempt = cfg.attempt | 0;                     // failed attempts on this stage (boss slows 10% each)
    this.bossPhase = cfg.bossPhase ?? 1;                // retry a boss from phase N
    this.startWave = 0;                                 // waves.js starts here (🚩 checkpoint retry)
    if (this.mode === 'stage' && cfg.checkpoint && !this.isBossStage) this.startWave = Math.max(0, cfg.checkpoint.wave | 0);
    const seed = cfg.seed ?? (this.mode === 'daily' || this.mode === 'endless'
      ? hashStr(dayKey() + ':' + this.mode)
      : (Math.random() * 2 ** 31) | 0);
    this.seed = seed;
    this.rng = makeRng(seed);
    this.scoreMult = this.mutator?.scoreMult ?? 1;

    // ---------- arena ----------
    // endless / storm play on the bigger mode arena (world.js grows its floor to the same radius)
    let R = this.worldDef.arenaRadius || G.world?.arenaRadius || 11;
    if (this.mode === 'endless' && this.modeDef.arenaRadius) R = this.modeDef.arenaRadius;
    if (this.mode === 'storm' && this.modeDef.radii) R = this.modeDef.radii[0];
    this.arenaRadius = R;
    this.baseArenaRadius = R;

    // ---------- run state (read by HUD / camera / fx) ----------
    this.state = 'intro';
    this.time = 0;
    this.level = 1; this.xp = 0; this.xpNext = TUNE.xp.next(1); this.pendingLevels = 0;
    this.levelChoices = null;
    this.score = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0; this.styleTier = -1;
    this.smashChain = 0; this.chainT = 0;
    this.novaCost = this.heroDef.nova?.cost ?? TUNE.nova.max;
    this.novaCharge = 0; this.novaReady = false;
    this.freedCount = 0; this.totalCubes = 0;
    this.fever = false;
    this.hitsTaken = 0; this.damageTaken = 0;
    this.coinsEarned = 0; this.crystals = 0; this.crystalXp = 0; this.bestNova = 0;
    this.bossDefeated = false; this.bossesDefeated = 0;
    this.won = false; this.revived = false; this.results = null;
    this.secondChanceUsed = false;
    this.lastHitBy = null;
    this.checkpoint = null;
    this.perfectCue = false;
    this.freed = {};
    this.stats = { smashes: 0, perfects: 0, nearMisses: 0, bonks: 0, novas: 0, knocks: 0, dashes: 0, evolutions: 0, coinCubes: 0, hits: 0 };
    this.cards = [];
    this.hazards = [];
    this.guardian = { level: 0, stress: 0, tokensDelta: 0, spawnMult: 1, spawnInterval: 1, dizzyBonus: 0, speedMult: 1, heartDrop: 1 };
    this.cardMods = Upgrades.defaultMods();
    this.objective = null;
    const od = this.stageDef.objective;
    if (od && this.mode === 'stage') {
      this.objective = { kind: od.kind, icon: od.icon, cur: 0, target: od.target, done: false, failed: false };
      if (od.kind === 'noNova') this.objective.target = 0;
    }
    this._wavesCleared = new Set();
    this._tut = { active: null, flags: {}, moved0: 0, bonks0: 0 };
    this._hsBudget = TUNE.hitstop.capPerSec;
    this._lastPerfectSlow = -9;
    this._levelGapT = 0;
    this._intensityT = 0;
    this._novaWin = null;
    this._bombWins = [];
    this._lowHpArmed = true;
    this._cine = null;
    this._ending = false;
    this._snap = [];

    // ---------- subsystems (contract order) ----------
    this.enemies = this._make(EnemyManager, 'EnemyManager', G, this);
    this.waves = this._make(WaveDirector, 'WaveDirector', G, this, this.stageDef, this.mode);
    if (!(this.totalCubes > 0)) this.totalCubes = this._countCubes();
    this.pickups = new Pickups(G, this);
    this.upgrades = new Upgrades(G, this);
    this.playerCtl = new Player(G, this, this.heroDef, this.skinId);
    this.player = this.playerCtl.state;
    this.upgrades.recompute();
    if (this.objective?.kind === 'freeAll') this.objective.target = this.totalCubes;
    if (this.startWave > 0) this._restoreCheckpoint(cfg.checkpoint);

    try { G.save?.ensure?.({ tutorialSeen: {}, introSeen: {} }); } catch { /* optional */ }
    this._wire();
  }

  _make(Cls, name, ...args) {
    try { return new Cls(...args); } catch (err) {
      console.error(`[run] ${name} failed to construct`, err);
      return null;
    }
  }

  _pickMutator(cfg) {
    const want = cfg.mutatorId ?? cfg.mutator;
    if (want) {
      if (typeof want === 'object') return want;
      return MUTATORS.find((m) => m.id === want) || null;
    }
    if (this.mode === 'endless' || this.mode === 'daily') return MUTATORS[hashStr(dayKey()) % MUTATORS.length];
    return null;
  }

  /** 🚩 retry: restore cards / level / hearts and pre-count the freed cubes of earlier waves */
  _restoreCheckpoint(cp) {
    const up = this.upgrades;
    up._silent = true;
    for (const c of cp.cards || []) {
      const n = c.evo ? 1 : clamp(c.level | 0 || 1, 1, 3);
      for (let i = 0; i < n; i++) this._call(up, 'take', c.id);
    }
    up._silent = false;
    this.level = Math.max(1, cp.level | 0 || 1);
    this.xp = Math.max(0, cp.xp || 0);
    this.xpNext = TUNE.xp.next(this.level);
    const p = this.player;
    this.playerCtl.setMaxHp(cp.maxHearts ?? p.maxHp, Math.max(1, cp.hearts ?? p.hp));
    let before = 0;
    (this.stageDef.waves || []).forEach((w, i) => {
      if (i >= this.startWave) return;
      for (const g of w.groups || []) before += (g.count || 0) * (g.type === 'splitter' ? 1 + (ENEMIES.splitter.splitInto || 2) : 1);
    });
    this.freedCount = Math.min(before, this.totalCubes);
    this.checkpoint = { ...cp, restored: true };
    for (let i = 0; i < this.startWave; i++) this._wavesCleared.add(i);
  }

  _snapshotCheckpoint(wave) {
    const p = this.player;
    return {
      wave, stageKey: this.stageDef.id, hearts: p.hp, maxHearts: p.maxHp,
      cards: this.cards.map((c) => ({ id: c.id, level: c.level, evo: !!c.evo })),
      level: this.level, xp: this.xp,
    };
  }

  _countCubes() {
    let n = 0;
    for (const w of this.stageDef.waves || []) for (const g of w.groups || []) {
      const c = g.count || 0;
      n += c;
      if (g.type === 'splitter') n += c * (ENEMIES.splitter.splitInto || 2);
    }
    return n;
  }

  // ============ read-only views ============
  get nova() { return clamp(this.novaCharge / this.novaCost, 0, 1); }
  get comboT() { return this.combo > 0 ? clamp(this.comboTimer / TUNE.style.decay, 0, 1) : 0; }
  get styleMult() { return this.styleTier >= 0 ? TUNE.style.tiers[this.styleTier].mult : 1; }
  get tired() { return !!this.player?.lockout; }
  get wave() { return this.waves?.wave ?? this._waveSet ?? 0; }
  /** waves.js mirrors its index here (run.wave = i); the director stays the source of truth */
  set wave(v) { this._waveSet = v; }
  get waveTotal() { return this.waves?.waveTotal ?? (this.stageDef.waves?.length || 0); }
  get boss() { return this.enemies ? this.enemies.boss || null : this._bossSet || null; }
  /** boss.js registers itself (run.boss = this) and clears it on removal */
  set boss(v) { this._bossSet = v || null; }
  get progress() {
    const b = this.enemies?.boss;
    if (this.isBossStage && b && b.maxHp) return clamp(1 - b.hp / b.maxHp, 0, 1);
    return this.totalCubes > 0 ? clamp(this.freedCount / this.totalCubes, 0, 1) : 0;
  }
  get heroColor() { return this.player?.color; }

  // ============ bus wiring ============
  _wire() {
    const bus = this.G.bus;
    if (!bus) return;
    const on = (ev, fn) => this._offs.push(bus.on(ev, fn));
    on('enemy:smash', (p) => this._onSmash(p || {}));
    on('enemy:freed', (p) => this._onFreed(p || {}));
    on('enemy:bonk', (p) => this._onBonk(p || {}));
    on('enemy:dizzy', (p) => this._onDizzy(p || {}));
    on('enemy:explode', (p) => this._onExplode(p || {}));
    on('wave:start', (p) => this._onWaveStart(p || {}));
    on('wave:clear', (p) => this._waveCleared(p?.index));
    on('boss:intro', (p) => this._onBossIntro(p || {}));
    on('boss:hit', () => {
      if (this.state !== 'playing' && this.state !== 'victory') return;
      this.hitStop(TUNE.hitstop.bossCrack, true);
      this.shake(TUNE.shake.bossCrack, 0.45);
      this.rumble(0.9, 0.7, 200);
    });
    on('boss:slam', () => { if (this.state === 'playing') { this.shake(TUNE.shake.bossSlam, 0.5); this.rumble(0.8, 0.5, 220); } });
    on('boss:defeat', () => {
      this._countBoss();
      // stage / daily: the boss IS the stage (waves.js also calls onBossDefeated; either path ends it once)
      if (this.mode === 'stage' || this.mode === 'daily') this.onStageCleared();
    });
    on('endless:theme', (p) => this._onTheme(p || {}));
    on('pickup:crystal', (p) => this._onCrystal(p || {}));
    on('pickup:heart', (p) => this._onHeart(p || {}));
    on('pickup:coin', (p) => { if (!this._isOver()) this.coinsEarned += p?.amount ?? 1; });
  }

  // ============ lifecycle ============
  start() {
    if (this._started || this.disposed) return;
    this._started = true;
    const G = this.G, p = this.player;
    G.cam?.follow?.(p);
    G.world?.setFever?.(false);
    G.bus?.emit('player:spawn', { x: p.x, z: p.z, heroId: this.heroId });
    G.bus?.emit('run:start', { mode: this.mode, worldId: this.worldId, stageId: this.stageId, heroId: this.heroId, stageName: this.stageName });
    this.state = 'intro';
    const seen = this._introSeen();
    this._cine = this._startCine('intro', { short: seen, worldId: this.worldDef.id, worldIndex: this.worldIndex, x: p.x, z: p.z }, seen ? TUNE_R.introShortMax : TUNE_R.introMax);
    this._markIntroSeen();
  }

  _introSeen() {
    const prof = this.G.save?.profile;
    if (Run._seenThisSession.has(this.worldIndex)) return true;
    return !!prof?.introSeen?.[this.worldDef.id];
  }
  _markIntroSeen() {
    Run._seenThisSession.add(this.worldIndex);
    const prof = this.G.save?.profile;
    if (prof) { prof.introSeen = prof.introSeen || {}; prof.introSeen[this.worldDef.id] = 1; this.G.save.commit?.(); }
  }

  /** start a camera cinematic; the returned record is polled from update() */
  _startCine(name, opts, max) {
    const c = { name, done: false, t: 0, max };
    try {
      const pr = this.G.cam?.cinematic?.(name, opts);
      if (pr && typeof pr.then === 'function') pr.then(() => { c.done = true; }, () => { c.done = true; });
      else c.done = true;
    } catch (err) {
      c.done = true;
      console.warn('[run] cinematic failed', name, err);
    }
    return c;
  }

  _afterIntro() {
    this._cine = null;
    if (this.tutorial || this.cfg.skipCountdown) { this._go(); return; }
    this.state = 'countdown';
    this._cdN = 3;
    this._cdT = TUNE_R.countdownStep;
    this.G.bus?.emit('run:countdown', { n: 3 });
  }

  _go() {
    this.state = 'playing';
    this.time = 0;
    this.G.bus?.emit('run:go', {});
    this._applyStartWave();
    if (this.objective) this.G.bus?.emit('objective:progress', { cur: this.objective.cur, target: this.objective.target, kind: this.objective.kind, done: false });
    this.G.bus?.emit('progress', { freed: this.freedCount, total: this.totalCubes });
  }

  // ============ frame ============
  update(dt, rdt = dt) {
    if (this.disposed) return;
    this._hsBudget = Math.min(TUNE.hitstop.capPerSec, this._hsBudget + TUNE.hitstop.capPerSec * rdt);
    switch (this.state) {
      case 'intro': this._updateIntro(dt, rdt); break;
      case 'countdown': this._updateCountdown(dt, rdt); break;
      case 'playing': this._updatePlaying(dt, rdt); break;
      case 'bossIntro': this._updateBossIntro(dt, rdt); break;
      case 'secondChance': this._updateSecondChance(dt, rdt); break;
      case 'victory': this._updateVictory(dt, rdt); break;
      case 'dying': this._updateDying(dt, rdt); break;
      case 'ended': this._updateEnded(dt, rdt); break;
      default: break;                                  // 'levelup' / 'paused': simulation frozen
    }
  }

  /** guarded call into another system (never throws, logs once per method) */
  _call(obj, fn, a, b, c, d) {
    if (!obj || typeof obj[fn] !== 'function') return undefined;
    try { return obj[fn](a, b, c, d); } catch (err) {
      const k = (obj.constructor?.name || 'obj') + '.' + fn;
      if (!this._errs.has(k)) { this._errs.add(k); console.error(`[run] ${k} threw`, err); }
      return undefined;
    }
  }

  _updateIntro(dt, rdt) {
    const c = this._cine;
    const inp = this.G.input;
    if (c) {
      c.t += rdt;
      if (c.t > TUNE_R.introSkipAfter && (inp?.pressed?.('confirm') || inp?.pressed?.('dash') || inp?.pressed?.('nova'))) {
        this._call(this.G.cam, 'skipCinematic');
        c.done = true;
      }
    }
    this._call(this.playerCtl, 'render', dt, rdt, 'idle');
    if (!c || c.done || c.t >= c.max) this._afterIntro();
  }

  _updateCountdown(dt, rdt) {
    this._call(this.playerCtl, 'render', dt, rdt, 'idle');
    this._cdT -= rdt;
    if (this._cdT > 0) return;
    this._cdN--;
    if (this._cdN > 0) {
      this._cdT = TUNE_R.countdownStep;
      this.G.bus?.emit('run:countdown', { n: this._cdN });
    } else {
      this.G.bus?.emit('run:countdown', { n: 0 });
      this._go();
    }
  }

  _updatePlaying(dt, rdt) {
    this.time += dt;
    this._tickRules(dt, rdt);
    this._call(this.waves, 'update', dt);
    if (this.state === 'playing') this._call(this.playerCtl, 'update', dt, rdt);
    this._call(this.upgrades, 'preEnemies', dt);
    this._call(this.enemies, 'update', dt);
    this._call(this.upgrades, 'postEnemies', dt);
    if (this.state !== 'playing') { this._call(this.playerCtl, 'render', dt, rdt, 'play'); return; }
    this._call(this.playerCtl, 'resolve', dt);
    this._call(this.upgrades, 'update', dt);
    this._call(this.pickups, 'update', dt, rdt);
    this._call(this.playerCtl, 'render', dt, rdt, 'play');
    if (this.state !== 'playing') return;
    this._tutorialTick();
    this._checkFever();
    this._intensity(rdt);
    this._levelGapT -= rdt;
    if (this.pendingLevels > 0 && this._levelGapT <= 0 && !this.player.dashing) this._openLevelUp();
  }

  _updateBossIntro(dt, rdt) {
    const c = this._cine;
    if (c) {
      c.t += rdt;
      if (c.poll && c.t > TUNE_R.bossIntroMin && !this.G.cam?.inCinematic) c.done = true;
    }
    this._call(this.enemies, 'update', dt);
    this._call(this.pickups, 'update', dt, rdt);
    this._call(this.upgrades, 'update', dt);
    this._call(this.playerCtl, 'render', dt, rdt, 'idle');
    if (!c || ((c.done || c.t >= c.max) && c.t >= TUNE_R.bossIntroMin)) {
      this._cine = null;
      this.state = 'playing';
      this.playerCtl?.grantIframes?.(0.6);
      this.G.cam?.follow?.(this.player);
    }
  }

  _updateSecondChance(dt, rdt) {
    this._scT += rdt;
    // time is frozen: only the hero floats in its bubble (animated on real time)
    this._call(this.playerCtl, 'render', rdt, rdt, 'bubble');
    this._call(this.upgrades, 'update', 0);
    const inp = this.G.input;
    if (this._scT >= TUNE_R.secondChance.guard && (inp?.pressed?.('dash') || inp?.pressed?.('confirm') || inp?.pressed?.('nova'))) this.acceptSecondChance();
  }

  _updateVictory(dt, rdt) {
    this._vt += rdt;
    this._call(this.enemies, 'update', dt);
    this._call(this.upgrades, 'update', dt);
    this._call(this.pickups, 'update', dt, rdt);
    this._call(this.playerCtl, 'render', dt, rdt, 'victory');
    if (!this._freedRest && this._vt >= TUNE_R.freeRestAfter) { this._freedRest = true; this._freeRemaining(); }
    if (!this._cine && this._vt >= TUNE_R.victoryHold) this._cine = this._startCine('victory', { x: this.player.x, z: this.player.z }, TUNE_R.victoryCineMax);
    const c = this._cine;
    if (c) {
      c.t += rdt;
      if ((c.done || c.t >= c.max) && this._vt >= TUNE_R.victoryMinEnd) this._end(true);
    }
  }

  _updateDying(dt, rdt) {
    this._dyT += rdt;
    this._call(this.enemies, 'update', dt);
    this._call(this.pickups, 'update', dt, rdt);
    this._call(this.upgrades, 'update', dt);
    this._call(this.playerCtl, 'render', dt, rdt, 'dying');
    const c = this._cine;
    if (c) c.t += rdt;
    if (this._dyT >= TUNE_R.dyingTime && (!c || c.done || c.t >= c.max)) this._end(false);
  }

  _updateEnded(dt, rdt) {
    this._call(this.enemies, 'update', dt);
    this._call(this.pickups, 'update', dt, rdt);
    this._call(this.upgrades, 'update', dt);
    this._call(this.playerCtl, 'render', dt, rdt, this.won ? 'victory' : 'dying');
  }

  // ============ rules tick ============
  _tickRules(dt, rdt) {
    // style decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        const count = this.combo;
        this.combo = 0; this.comboTimer = 0; this.styleTier = -1;
        this.G.bus?.emit('combo:break', { count });
      }
    }
    // smash chain ladder window
    if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) this.smashChain = 0; }
    // passive nova
    this.gainNova(TUNE.nova.gain.passivePerSec * dt);
    // guardian (hidden DDA): stress bleeds away; never harder than baseline
    const Gd = TUNE.guardian, g = this.guardian;
    if (g.stress > 0) g.stress = Math.max(0, g.stress - (Gd.stressPerHit / Gd.recoverEvery) * dt);
    let lvl = 0;
    for (let i = 0; i < Gd.levels.length; i++) if (g.stress >= Gd.levels[i].at) lvl = i + 1;
    if (lvl !== g.level) {
      g.level = lvl;
      const L = lvl ? Gd.levels[lvl - 1] : null;
      g.tokensDelta = L ? L.tokens : 0;
      g.spawnMult = L ? L.spawnInterval : 1;
      g.spawnInterval = g.spawnMult;
      g.heartDrop = L ? L.heartDrop : 1;
      g.dizzyBonus = L ? L.dizzy : 0;
      g.speedMult = L ? L.speed : 1;
    }
    // nova ★3 window (novaMulti)
    const nw = this._novaWin;
    if (nw) {
      nw.t += dt;
      if (nw.closing !== undefined) {
        nw.closing -= dt;
        if (nw.closing <= 0) {
          this.bestNova = Math.max(this.bestNova, nw.count);
          this._obj('novaMulti', nw.count, 'max');
          this._novaWin = null;
        }
      }
    }
    // popper blast windows (bombMulti)
    for (let i = this._bombWins.length - 1; i >= 0; i--) {
      const w = this._bombWins[i];
      w.t -= dt;
      if (w.t <= 0) { this._obj('bombMulti', w.count, 'max'); this._bombWins.splice(i, 1); }
    }
    // fastClear shows elapsed seconds
    const o = this.objective;
    if (o && o.kind === 'fastClear' && !o.done) {
      const sec = Math.floor(this.time);
      if (sec !== o.cur) {
        o.cur = sec;
        if (sec > o.target && !o.failed) o.failed = true;
        this.G.bus?.emit('objective:progress', { cur: o.cur, target: o.target, kind: o.kind, done: false, failed: o.failed });
      }
    }
  }

  // ============ juice ============
  /** hit-stop with a per-second budget (TUNE.hitstop.capPerSec); force = always full */
  hitStop(ms, force = false) {
    if (!(ms > 0)) return;
    if (!force) {
      ms = Math.min(ms, this._hsBudget);
      if (ms < 12) return;
    }
    this._hsBudget = Math.max(0, this._hsBudget - ms);
    this._call(this.G, 'hitStop', ms);
  }
  shake(intensity, seconds) {
    if (!(intensity > 0)) return;
    this._call(this.G.cam, 'shake', clamp(intensity, 0, 1), seconds ?? 0.18 + intensity * 0.6);
  }
  kick(amount) { this._call(this.G.cam, 'kick', amount); }
  rumble(strong, weak, ms) { this._call(this.G.input, 'rumble', strong, weak, ms); }
  _falloff(x, z) {
    const p = this.player;
    const d = Math.hypot((x ?? p.x) - p.x, (z ?? p.z) - p.z);
    return clamp(1 - d / TUNE_R.shakeFalloff, 0.35, 1);
  }

  // ============ scoring / style / nova / xp ============
  addScore(base) {
    if (!(base > 0)) return;
    this.score += base * this.styleMult * this.scoreMult;
  }

  addStyle(n) {
    if (!(n > 0) || this.state !== 'playing') return;
    const prev = this.combo;
    this.combo += n;
    this.comboTimer = TUNE.style.decay;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const tiers = TUNE.style.tiers;
    let tier = -1;
    for (let i = 0; i < tiers.length; i++) if (this.combo >= tiers[i].at) tier = i;
    const tierUp = tier > this.styleTier;
    this.styleTier = tier;
    const bus = this.G.bus;
    bus?.emit('combo', { count: this.combo });
    for (const m of TUNE_R.milestones) {
      if (prev < m && this.combo >= m) {
        const ti = tiers.findIndex((x) => x.at === m);
        bus?.emit('combo:milestone', { count: m, tier: ti, word: ti >= 0 ? tiers[ti].word : null, mult: ti >= 0 ? tiers[ti].mult : this.styleMult });
      }
    }
    if (tierUp && tier >= 0 && !TUNE_R.milestones.includes(tiers[tier].at)) {
      bus?.emit('combo:milestone', { count: this.combo, tier, word: tiers[tier].word, mult: tiers[tier].mult });
    }
  }

  gainNova(base) {
    if (!(base > 0) || this.novaReady || this.player?.nova || this.state !== 'playing') return;
    let m = this.cardMods.novaMult || 1;
    if (this.player && this.player.hp <= 2) m *= TUNE.nova.lowHeartsMult;
    if (this.fever) m *= TUNE.fever.novaMult;
    m *= this.mutator?.novaMult ?? 1;
    this.novaCharge = Math.min(this.novaCost, this.novaCharge + base * m);
    if (this.novaCharge >= this.novaCost - 1e-6) this._setNovaReady();
  }
  _setNovaReady() {
    if (this.novaReady) return;
    this.novaCharge = this.novaCost;
    this.novaReady = true;
    this._call(this.G.input, 'setNovaReady', true);
    this.G.bus?.emit('nova:ready', {});
    if (this.tutorial && this._tut.pendingNova) { this._tut.pendingNova = false; this._tutShow('nova'); }
  }
  /** called by Player when casting */
  consumeNova() {
    if (!this.novaReady || this.state !== 'playing') return false;
    this.novaReady = false;
    this.novaCharge = 0;
    this._call(this.G.input, 'setNovaReady', false);
    this.stats.novas++;
    this._novaWin = { t: 0, count: 0 };
    if (this.objective?.kind === 'noNova') { this.objective.cur++; this.objective.failed = true; this._emitObj(); }
    this._tutDone('nova');
    return true;
  }
  onNovaEnd() { if (this._novaWin && this._novaWin.closing === undefined) this._novaWin.closing = TUNE_R.novaTail; }

  addXp(v) {
    if (!(v > 0) || this._isOver()) return;
    this.xp += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = TUNE.xp.next(this.level);
      this.pendingLevels++;
    }
  }

  _openLevelUp() {
    const prof = this.G.save?.profile;
    const firstEver = !!prof && !prof.firstLevelUpSeen;
    const recommend = this.mode === 'stage' && this.worldIndex === 0 && this.stageIndex <= 1;
    const choices = this._call(this.upgrades, 'offer', { count: firstEver ? 2 : undefined, recommend }) || [];
    if (firstEver && choices.length) { prof.firstLevelUpSeen = true; this.G.save.commit?.(); }
    this.pendingLevels--;
    const shownLevel = this.level - this.pendingLevels;
    if (!choices.length) {
      // everything maxed: a sweet consolation instead of an empty screen
      this.healPlayer(1);
      this.addScore(TUNE_R.maxedLevelScore);
      this.G.hud?.pop?.(this.player.x, 1.8, this.player.z, t('run.maxed'), 'xp');
      return;
    }
    this.levelChoices = choices;
    this.state = 'levelup';
    this.G.bus?.emit('player:levelup', { level: shownLevel, choices, rerolls: this.upgrades.rerolls });
  }

  /** resolve a level-up (ui calls this). Accepts a card id or a choice index. */
  chooseCard(cardId) {
    if (this.state !== 'levelup' || !this.levelChoices) return false;
    const pool = this.levelChoices.concat(this.upgrades?.lastOffer || []);
    const ch = typeof cardId === 'number' ? this.levelChoices[cardId] : pool.find((c) => c.id === cardId);
    if (!ch) return false;
    const info = this.upgrades.take(ch.id);
    if (!info) return false;
    this.levelChoices = null;
    this.state = 'playing';
    this._levelGapT = TUNE_R.levelUpGap;
    this.playerCtl.grantIframes(TUNE_R.levelUpIframes);
    this.G.bus?.emit('card:chosen', { id: info.id, rarity: info.rarity, level: info.level, evo: !!info.evo });
    return true;
  }

  /** free reroll(s) per stage → new choices (also emitted as `card:reroll`) */
  reroll() {
    if (this.state !== 'levelup') return null;
    const choices = this.upgrades.reroll();
    if (!choices || !choices.length) return null;
    this.levelChoices = choices;
    this.G.bus?.emit('card:reroll', { choices, rerolls: this.upgrades.rerolls });
    return choices;
  }
  rerollCards() { return this.reroll(); }
  get rerolls() { return this.upgrades?.rerolls ?? 0; }
  get rerollsLeft() { return this.rerolls; }

  // ============ hearts ============
  _isOver() { return this.state === 'ended' || this.state === 'dying' || this.disposed; }

  /** enemies / boss / hazards call this. false = ignored (i-frames, not live) */
  hurtPlayer(hearts = 1, srcX, srcZ, kind = 'contact') {
    const p = this.player, pc = this.playerCtl;
    if (this.state !== 'playing' || !p || p.dead || !(hearts > 0)) return false;
    if (p.iframes > 0 || p.mega || p.dashing) return false;
    srcX = srcX ?? p.x; srcZ = srcZ ?? p.z;
    // zone damage (storm wall / glitch hole) always knocks the hero back INTO the arena
    if (kind === 'storm' || kind === 'fall') {
      const d = Math.hypot(p.x, p.z) || 1;
      srcX = p.x + (p.x / d) * 2; srcZ = p.z + (p.z / d) * 2;
    }
    const bus = this.G.bus;
    if ((p.shield | 0) > 0) {
      p.shield--;
      pc.onShieldBlock(srcX, srcZ);
      this.upgrades?.onShieldBlocked?.(p.x, p.z);
      this.hitStop(TUNE_R.shieldStop);
      this.shake(0.22, 0.25);
      this.rumble(0.4, 0.6, 120);
      bus?.emit('player:shieldBlock', { x: p.x, z: p.z });
      return true;
    }
    // kid rule: every hit costs exactly 1 heart — bigger sources hit harder via knockback
    let dmg = Math.min(1, p.hp);
    if (this.unloseable) dmg = Math.min(dmg, Math.max(0, p.hp - 1));
    // enemies.js encodes size knockback into `hearts` (1 + 0.45 per extra); plain 1-heart sources
    // (boss body, hazards, older callers) get their knockback looked up here instead — never both
    const kbMult = hearts > 1 ? 1 + TUNE_R.knockbackPerHeart * (hearts - 1)
      : this._knockbackDist(kind, srcX, srcZ) / TUNE.player.knockback;
    p.hp -= dmg;
    this.hitsTaken += dmg;
    this.damageTaken += dmg;
    this.stats.hits++;
    this.lastHitBy = kind;                              // results tip ("冲冲方只走直线…")
    pc.onHurt(srcX, srcZ, kbMult);
    this.hitStop(TUNE.hitstop.hurt, true);
    this.shake(TUNE.shake.hurt, 0.4);
    this.rumble(0.9, 0.6, 220);
    // guardian stress
    const g = this.guardian, Gd = TUNE.guardian;
    g.stress = Math.min(Gd.window / 4, g.stress + Gd.stressPerHit + (p.hp <= 2 ? Gd.lowHeartStress : 0));
    bus?.emit('player:hurt', { x: p.x, z: p.z, dmg, hp: p.hp, maxHp: p.maxHp, srcX, srcZ, kind });
    this._updateDanger();
    if (p.hp <= 0) this._die();
    return true;
  }

  /** knockback distance for a hit (data: TUNE.player.knockback, L grumpy 2.4, Bruiser 3.0; the king is the biggest) */
  _knockbackDist(kind, srcX, srcZ) {
    const base = TUNE.player.knockback;
    if (kind === 'boss' || kind === 'king') return TUNE_R.bossKnockback;
    const def = ENEMIES[kind];
    if (!def) return base;
    // find the cube that hit us (enemies.js / player.js pass its type + position)
    let hit = null, bd = 2.5;
    const list = this.enemies?.list;
    if (list && def.sizes) {
      for (const e of list) {
        if (!e || e.dead || e.type !== kind) continue;
        const d = Math.hypot(e.x - srcX, e.z - srcZ);
        if (d < bd) { bd = d; hit = e; }
      }
    }
    const sz = hit ? def.sizes?.[hit.sizeKey] : null;
    return sz?.knockback ?? def.knockback ?? base;
  }

  healPlayer(n = 1, x, z) {
    const p = this.player;
    if (!p || p.dead || this._isOver()) return 0;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(0, n));
    const amount = p.hp - before;
    if (amount > 0) this.G.bus?.emit('player:heal', { x: x ?? p.x, z: z ?? p.z, amount, hp: p.hp, maxHp: p.maxHp });
    this._updateDanger();
    return amount;
  }

  /** +max hearts (Heart Snack, 🛡 set bonus). heal: number or 'full' */
  addMaxHearts(n = 1, heal = 1) {
    const p = this.player;
    if (!p) return;
    const maxHp = Math.min(TUNE.player.maxHearts, p.maxHp + n);
    const hp = heal === 'full' ? maxHp : Math.min(maxHp, p.hp + (heal || 0));
    const amount = hp - p.hp;
    this.playerCtl.setMaxHp(maxHp, hp);
    if (amount > 0 && this._started) this.G.bus?.emit('player:heal', { x: p.x, z: p.z, amount, hp: p.hp, maxHp: p.maxHp });
    this._updateDanger();
  }

  _updateDanger() {
    const p = this.player;
    const th = Math.min(2, p.maxHp - 1);
    const danger = p.hp <= th;
    if (danger && this._lowHpArmed && p.hp > 0) {
      this._lowHpArmed = false;
      this.G.bus?.emit('player:lowHp', { hp: p.hp, maxHp: p.maxHp });
    } else if (!danger) this._lowHpArmed = true;
    this._call(this.G.post, 'setDanger', p.hp <= 0 ? 0 : p.hp <= 1 ? 1 : danger ? 0.5 : 0);
  }

  // ============ callbacks from Player ============
  onPlayerKnock(e, opts = {}) {
    if (opts.boss) {
      this.shake(0.12, 0.2);
      this.rumble(0.4, 0.2, 80);
      this.G.bus?.emit('player:clang', { x: e?.x ?? this.player.x, z: e?.z ?? this.player.z });
      return;
    }
    this.stats.knocks++;
    this.hitStop(TUNE.hitstop.knock);
    this.shake(TUNE.shake.knock, 0.15);
    this.rumble(0.35, 0.45, 60);
    this._tutDone('knock');
  }

  onDashSmash(n) { this._obj('chain', n, 'max'); }
  onDashEnd() { /* per-dash chain already tracked */ }

  onPerfect(x, z, radius) {
    this.stats.perfects++;
    this.addStyle(TUNE.style.gain.perfect);
    this.gainNova(TUNE.perfect.nova);
    this.addScore(TUNE.score.perfect);
    const g = this.guardian;
    g.stress = Math.max(0, g.stress - TUNE.guardian.perfectRelief);
    const now = this.G.time?.real ?? this.time;
    if (now - this._lastPerfectSlow >= TUNE.perfect.slowCooldown) {
      this._lastPerfectSlow = now;
      this._call(this.G, 'slowMo', TUNE.perfect.slowScale, TUNE.perfect.slowTime + (this.cardMods.timemagic || 0));
    }
    this.hitStop(TUNE.hitstop.perfect);
    this.kick(0.06);                                   // camera.kick is a small zoom punch (±0.1 max, ≤ 5% FOV)
    this.shake(0.2, 0.2);
    this.rumble(0.6, 0.9, 130);
    this._obj('perfect', 1);
    this.G.bus?.emit('player:perfect', { x, z, radius });
    this.upgrades?.onPerfect?.(x, z);
  }

  onNearMiss(e, x, z) {
    if (this.state !== 'playing') return;
    this.stats.nearMisses++;
    this.addStyle(TUNE.style.gain.nearMiss);
    this.gainNova(TUNE.nova.gain.nearMiss);
    this.addScore(TUNE.score.nearMiss);
    this.G.bus?.emit('player:nearMiss', { x, z, count: this.stats.nearMisses, ex: e?.x, ez: e?.z });
    this.upgrades?.onNearMiss?.();
  }

  // ============ enemy events ============
  _crystalKey(p) {
    if (p.crystal && TUNE.xp.crystal[p.crystal] !== undefined) return p.crystal;
    if (p.xp && TUNE.xp.crystal[p.xp] !== undefined) return p.xp;
    if (p.elite) return 'XL';
    const def = ENEMIES[p.type];
    if (def?.sizes) {
      const sk = def.sizes[p.sizeKey] ? p.sizeKey : sizeKeyOf(p.size ?? 1);
      return def.sizes[sk]?.xp ?? (sk === 'XL' ? 'L' : sk);
    }
    if (def?.xp) return def.xp;
    return sizeKeyOf(p.size ?? 1);
  }

  _onSmash(p) {
    if (this.disposed || this.state === 'ended' || this.state === 'intro') return;
    const st = this.state;
    const playing = st === 'playing';
    this.stats.smashes++;
    const type = p.type || 'grumpy';
    if (!p.isBoss && type !== 'boss' && type !== 'king') this.freed[type] = (this.freed[type] || 0) + 1;
    this.smashChain = this.chainT > 0 ? this.smashChain + 1 : 1;
    this.chainT = TUNE.smash.chainWindow;
    const x = p.x ?? 0, z = p.z ?? 0;
    if (playing) {
      this.addStyle(TUNE.style.gain.smash);
      if (!p.byNova) this.gainNova(TUNE.nova.gain.smash);
      this.addScore(TUNE.score.smash);
    }
    // crystals (FEVER ×2)
    if (!p.isBoss && this.pickups) {
      const key = this._crystalKey(p);
      const n = this.fever ? TUNE.fever.crystalMult : 1;
      for (let i = 0; i < n; i++) this.pickups.spawnCrystal(x, z, key, { dirX: p.dirX, dirZ: p.dirZ });
    }
    if (playing) this._drops(x, z);
    // juice
    if (playing || st === 'bossIntro') {
      const big = (p.size ?? 1) >= 1.3;
      const hs = TUNE.hitstop;
      let ms = Math.min(hs.chainCap, (big ? hs.smashL : hs.smash) + hs.chainStep * Math.max(0, this.smashChain - 1));
      if (p.byNova) ms = Math.min(ms, 40);
      let force = false;
      if (this.tutorial && !this._tut.flags.firstSmash) {
        this._tut.flags.firstSmash = true;
        ms = TUNE_R.tutorial.firstSmashStop; force = true;
        this.G.hud?.pop?.(x, 1.6, z, t('tut.freed'), 'crit');
        this._tutDone('dash');
      }
      this.hitStop(ms, force);
      this.shake(TUNE.shake.smash * (big ? 1.5 : 1) * this._falloff(x, z), 0.2);
      this.rumble(0.3, 0.55, 70);
    }
    // ★3 windows
    const nw = this._novaWin;
    if (nw && (p.byNova || nw.t < TUNE_R.novaGrace)) nw.count++;
    this._bombCount(x, z);
    this.upgrades?.onSmash?.(p);
  }

  _drops(x, z) {
    const p = this.player, S = TUNE.smash;
    const missing = p.maxHp - p.hp;
    if (missing > 0) {
      const base = S.heartDropLow !== undefined
        ? (p.hp <= 2 ? S.heartDropLow : S.heartDropBase)
        : S.heartDropBase + (S.heartDropPerMissing || 0) * missing;
      const chance = Math.min(S.heartDropCap, base * (this.guardian.heartDrop || 1));
      if (this.rng() < chance) this.pickups.spawnHeart(x, z);
    }
    const md = TUNE_R.magnetDrop;
    if (this.pickups.count('crystal') >= md.minCrystals && this.pickups.count('magnet') === 0 && this.rng() < md.chance) this.pickups.spawnMagnet(x, z);
  }

  _onFreed(p) {
    if (this.disposed || this.state === 'ended') return;
    if (p.treasure || p.type === 'coin') {
      this.stats.coinCubes++;
      this.freed.coin = (this.freed.coin || 0) + 1;          // Cube-dex: 金币方
      this._obj('coinCube', 1);
      return;
    }
    if (p.isBoss) return;
    this.freedCount++;
    this.G.bus?.emit('progress', { freed: this.freedCount, total: this.totalCubes });
    if (this.objective?.kind === 'freeAll') this._obj('freeAll', this.freedCount, 'set');
    if ((p.fell || p.dropCrystal) && this.pickups) this.pickups.spawnCrystal(p.x ?? 0, p.z ?? 0, p.crystal || 'S');
    this.upgrades?.onFreed?.(p);
  }

  _onBonk(p) {
    if (this.state !== 'playing' && this.state !== 'bossIntro') return;
    this.stats.bonks++;
    this.addStyle(TUNE.style.gain.bonk);
    this.gainNova(TUNE.nova.gain.bonk);
    this.addScore(TUNE.score.bonk);
    const x = p.x ?? 0, z = p.z ?? 0;
    const f = this._falloff(x, z);
    this.hitStop(TUNE.hitstop.bonk * f);
    this.shake(TUNE.shake.bonk * f, 0.2);
    this.rumble(0.25 * f, 0.4 * f, 60);
    // ★3 counters — prefer explicit payload flags, fall back to geometry
    const w = this.G.world;
    const kind = p.kind || p.target || p.with || '';
    // enemies.js flags every bonk (rim / bumper / headOn / byKnock); geometry is only a fallback
    const flagged = kind || 'rim' in p || 'bumper' in p || 'headOn' in p || 'byKnock' in p || p.cube;
    const isRim = !!(p.rim || p.wall || RIM_SOURCES.has(kind)) || (!flagged && Math.hypot(x, z) >= this.arenaRadius - 1.3);
    let isBumper = !!(p.bumper || kind === 'bumper');
    if (!isBumper && !flagged && w?.bumperHit) { try { isBumper = !!w.bumperHit(x, z, 1.2); } catch { /* optional */ } }
    if (isRim && !isBumper) this._obj('rimBonk', 1);          // (Pinball rim flash is enemies.js')
    if (isBumper) this._obj('bumperBonk', 1);
    let onIce = !!p.ice;
    if (!onIce && !('ice' in p) && w?.frictionAt) { try { onIce = w.frictionAt(x, z) < 1; } catch { /* optional */ } }
    if (onIce) this._obj('iceBonk', 1);
    // tutorial
    this._tutDone('bonk');
  }

  _onDizzy(p) {
    if (this.state !== 'playing' && this.state !== 'bossIntro') return;
    const src = String(p.source || p.by || '');
    const cause = String(p.cause || '');
    if (LASER_SOURCES.has(src) || p.byLaser) this._obj('laserDizzy', 1);
    // bruiser bowling: armour broken by a KNOCKED CUBE (enemies.js: source 'armor', cause 'knock')
    if (p.type === 'bruiser' && (cause === 'knock' || cause === 'bowl' || p.byCube || p.byKnocked || (src !== 'armor' && BOWL_SOURCES.has(src)))) this._obj('bruiserBowl', 1);
    this._bombCount(p.x ?? 0, p.z ?? 0);
    // tutorial: the very first dizzy cube → slow-mo + "dash through it!"
    if (this.tutorial && !this._tut.flags.firstDizzy && !this._tut.flags.firstSmash) {
      this._tut.flags.firstDizzy = true;
      this._call(this.G, 'slowMo', TUNE_R.tutorial.dizzySlow[0], TUNE_R.tutorial.dizzySlow[1]);
      this._tutShow('dash', { x: p.x, z: p.z });
    }
  }

  _onExplode(p) {
    if (this.state !== 'playing') return;
    // enemies.js reports how many cubes one blast freed/dizzied; otherwise count events in a short window
    if (typeof p.count === 'number') { this._obj('bombMulti', p.count, 'max'); return; }
    this._bombWins.push({ x: p.x ?? 0, z: p.z ?? 0, r: (p.radius ?? 2.8) + 1, t: TUNE_R.bombWindow, count: 0 });
  }
  _bombCount(x, z) {
    for (const w of this._bombWins) if (Math.hypot(x - w.x, z - w.z) <= w.r) w.count++;
  }

  _onWaveStart(p) {
    const w = this.stageDef.waves?.[p.index ?? -1];
    if (!w) return;
    // 🚩 checkpoint at the middle wave of normal stages
    const total = this.stageDef.waves.length;
    if (this.mode === 'stage' && this.stageDef.kind === 'normal' && !this.checkpoint && total >= 3 && p.index === Math.floor(total / 2)) {
      this.checkpoint = this._snapshotCheckpoint(p.index);
      this.G.bus?.emit('checkpoint', { wave: p.index });
    }
    if (w.novaFill && this.state === 'playing') this._setNovaReady();
    if (this.tutorial && w.tutorial) {
      if (w.tutorial === 'nova') { if (this.novaReady) this._tutShow('nova'); else this._tut.pendingNova = true; }
      else this._tutShow(w.tutorial);
    }
  }

  _waveCleared(index) {
    if (index === undefined || index === null || this._wavesCleared.has(index)) return;
    this._wavesCleared.add(index);
    if (this.state === 'playing') this.addScore(TUNE.score.waveClear);
  }
  /** WaveDirector → Run */
  onWaveCleared(index) { this._waveCleared(index); }
  onStageCleared() {
    if (this.state === 'playing' || this.state === 'bossIntro') this._victory();
  }
  /**
   * WaveDirector → Run: the boss wave that ENDS the run is done (stage / daily boss, the last
   * Boss-Rush king). Endless keeps going, so waves.js never calls this there.
   * The `boss:defeat` bus event only counts bosses (Rush beats several).
   */
  onBossDefeated() {
    this._countBoss();
    if (this.mode !== 'endless') this.onStageCleared();
  }
  /** boss.js may emit boss:defeat and waves.js call onBossDefeated in the same frame → count once */
  _countBoss() {
    const now = this.G.time?.real ?? performance.now() / 1000;
    if (now - (this._bossDoneT ?? -9) < 0.1) return;
    this._bossDoneT = now;
    this.bossDefeated = true;
    this.bossesDefeated++;
  }
  /** waves.js (Boss Rush breather) → +hearts */
  heal(n = 1) { return this.healPlayer(n); }
  /** waves.js: the hero stepped into the endless warp gate → bank the score ×bank */
  onWarpGate(bank = 1) {
    this.warpBank = bank;
    this.finish(true, { scoreMult: bank });
  }

  _onBossIntro(p) {
    this._applyBossPhase();
    if (this.state !== 'playing') return;
    this.state = 'bossIntro';
    if (this.G.cam?.inCinematic) this._cine = { name: 'boss', done: false, t: 0, max: TUNE_R.bossIntroMax, poll: true };
    else this._cine = this._startCine('boss', p, TUNE_R.bossIntroMax);
  }

  /**
   * 🚩 phase checkpoint (Kid-UX §7.13): "Retry from phase N" starts the king with the cracks
   * he had at that phase. Uses boss.startAtPhase() when boss.js provides it.
   */
  _applyBossPhase() {
    const ph = Math.min(3, this.bossPhase | 0);
    if (this._bossPhaseDone || !(ph > 1) || this.mode !== 'stage') return;
    const b = this.enemies?.boss || this._bossSet;
    if (!b || b.dead || !(b.maxHp > 0)) return;
    this._bossPhaseDone = true;
    if ((b.phase | 0) >= ph) return;                  // boss.js already started at the checkpoint phase
    if (typeof b.startAtPhase === 'function') { this._call(b, 'startAtPhase', ph); return; }
    const pa = BOSS.phaseAt;
    const hp = Math.max(1, Math.floor(b.maxHp * pa[ph - 2] + 1e-6));
    if (!(hp < b.hp)) return;
    const f = hp / b.maxHp;
    b.hp = hp;
    b.phase = Math.max(b.phase | 0, f <= pa[1] ? 3 : f <= pa[0] ? 2 : 1);
  }

  /** Endless world cycling reloads the environment: keep the gameplay radius in sync */
  _onTheme() {
    if (this.mode !== 'endless') return;
    const r = this.modeDef.arenaRadius || this.G.world?.arenaRadius;
    if (r > 3) { this.arenaRadius = r; this.baseArenaRadius = r; }
  }

  /**
   * 🚩 checkpoint retry: waves.js has no native `startWave` support yet — start the director at
   * the flag wave ourselves (earlier waves are pre-counted as freed in _restoreCheckpoint).
   */
  _applyStartWave() {
    const wv = this.waves;
    if (this._startWaveDone || !(this.startWave > 0) || !wv) return;
    this._startWaveDone = true;
    if (wv.startWave !== undefined || wv.started || typeof wv._startWave !== 'function') return;
    const i = Math.min(this.startWave, Math.max(0, (wv.waveTotal | 0) - 1));
    wv.started = true;
    try { wv._startWave(i); } catch (err) { console.error('[run] checkpoint start wave failed', err); }
  }

  _onCrystal(p) {
    if (this.disposed || this.state === 'ended') return;
    const v = p.value ?? 1;
    this.crystals++;
    this.crystalXp += v;
    this.addXp(v);
    this.gainNova(TUNE.nova.gain.crystal);
    if (this.state === 'playing') this.addScore(TUNE.score.crystal * v);
  }

  _onHeart(p) {
    const healed = this.healPlayer(1, p.x, p.z);
    if (!healed && this.state === 'playing') {
      this.addScore(TUNE_R.fullHeartScore);
      this.G.hud?.pop?.(this.player.x, 1.8, this.player.z, t('run.fullHeart'), 'heal');
    }
  }

  // ============ ★3 objective ============
  _obj(kind, value, mode = 'add') {
    const o = this.objective;
    if (!o || o.kind !== kind || o.failed) return;
    const prev = o.cur;
    if (mode === 'max') o.cur = Math.max(o.cur, value);
    else if (mode === 'set') o.cur = value;
    else o.cur += value;
    if (!o.done && o.target > 0 && o.cur >= o.target && kind !== 'fastClear' && kind !== 'noNova' && kind !== 'freeAll') {
      o.done = true;
      this.G.bus?.emit('objective:done', { kind, icon: o.icon });
    }
    if (o.cur !== prev) this._emitObj();
  }
  _emitObj() {
    const o = this.objective;
    if (o) this.G.bus?.emit('objective:progress', { cur: o.cur, target: o.target, kind: o.kind, done: o.done, failed: o.failed });
  }
  _finalizeObjective() {
    const o = this.objective;
    if (!o || o.done) return;
    if (o.kind === 'fastClear') o.done = this.time <= o.target;
    else if (o.kind === 'noNova') o.done = this.stats.novas === 0;
    else if (o.kind === 'freeAll') o.done = this.freedCount >= this.totalCubes;
    if (o.done) { o.failed = false; this._emitObj(); }
  }

  // ============ FEVER · audio intensity ============
  _checkFever() {
    if (this.fever || this.isBossStage || !(this.totalCubes > 0) || (this.mode !== 'stage' && this.mode !== 'daily')) return;
    if (this.progress < TUNE.fever.atProgress) return;
    this.fever = true;
    this.G.bus?.emit('fever', {});
    this._call(this.G.world, 'setFever', true);
  }

  _intensity(rdt) {
    this._intensityT -= rdt;
    if (this._intensityT > 0) return;
    this._intensityT = TUNE_R.intensityEvery;
    const p = this.player, list = this.enemies?.list;
    let near = 0;
    if (list) for (const e of list) if (!isGone(e) && (e.harmful ?? !smashableOf(e)) && Math.hypot(e.x - p.x, e.z - p.z) < 4.5) near++;
    const v = clamp(0.3 + Math.max(0, this.styleTier + 1) * 0.12 + Math.min(1, near / 4) * 0.3 + (this.fever ? 0.2 : 0) + (this.enemies?.boss ? 0.2 : 0) + (p.hp <= 1 ? 0.15 : 0), 0, 1);
    this._call(this.G.audio, 'intensity', v);
  }

  // ============ tutorial (1-1) ============
  _tutShow(id, extra = {}) {
    if (!this.tutorial || !TUT[id] || this._tut.flags['done_' + id]) return;
    const prof = this.G.save?.profile;
    if (prof) {
      prof.tutorialSeen = prof.tutorialSeen || {};
      if ((prof.tutorialSeen[id] || 0) >= 2) { this._tut.flags['done_' + id] = true; return; }
      prof.tutorialSeen[id] = (prof.tutorialSeen[id] || 0) + 1;
      this.G.save.commit?.();
    }
    this._tut.active = id;
    this._tut.moved0 = this.playerCtl.moved;
    this._tut.bonks0 = this.stats.bonks;
    this.G.bus?.emit('tutorial:step', { id, ...TUT[id], ...extra });
  }
  _tutDone(id) {
    if (!this.tutorial) return;
    this._tut.flags['done_' + id] = true;
    if (this._tut.active === id) {
      this._tut.active = null;
      this.G.bus?.emit('tutorial:done', { id });
    }
  }
  _tutorialTick() {
    const a = this._tut.active;
    if (!a) return;
    if (a === 'move' && this.playerCtl.moved - this._tut.moved0 >= TUNE_R.tutorial.moveDist) this._tutDone('move');
    else if (a === 'blob' && this.stats.bonks - this._tut.bonks0 >= TUNE_R.tutorial.blobBonks) this._tutDone('blob');
  }

  // ============ pause ============
  pause() {
    if (this.state !== 'playing' && this.state !== 'countdown') return false;
    this._pausedFrom = this.state;
    this.state = 'paused';
    this.G.bus?.emit('run:pause', {});
    return true;
  }
  resume() {
    if (this.state !== 'paused') return false;
    this.state = this._pausedFrom || 'playing';
    this.playerCtl.grantIframes(TUNE_R.resumeIframes);
    this.G.bus?.emit('run:resume', {});
    return true;
  }
  togglePause() { return this.state === 'paused' ? this.resume() : this.pause(); }

  // ============ endings ============
  /** end the run from outside (waves.js: storm time-up, endless warp gate) */
  finish(win = true, { scoreMult = 1 } = {}) {
    if (this._isOver() || this.state === 'victory') return;
    if (scoreMult !== 1) this.score *= scoreMult;
    if (win) this._victory(); else this._end(false);
  }

  _victory() {
    if (this._ending || this._isOver()) return;
    this._ending = true;
    this.won = true;
    this.state = 'victory';
    this._vt = 0;
    this._freedRest = false;
    this._cine = null;
    this.levelChoices = null;
    this.hitStop(TUNE.hitstop.lastCube, true);
    this._call(this.G, 'slowMo', 0.2, 1.0);
    this.playerCtl.grantIframes(99);
    this._call(this.playerCtl, 'settle');           // no frozen mid-dash / giant pose in the celebration
    this._flushWindows();
    this.pickups?.collectAll();
    this._call(this.G.input, 'setNovaReady', false);
    // clear bonuses
    const S = TUNE.score;
    this.score += this.player.hp * S.heartLeft * this.scoreMult;
    const par = Math.max(1, this.waveTotal) * TUNE_R.parPerWave;
    this.score += Math.max(0, par - this.time) * S.timeBonusPerSec * this.scoreMult;
    this._finalizeObjective();
    if (this.tutorial) {
      const prof = this.G.save?.profile;
      if (prof) { prof.tutorialDone = true; this.G.save.commit?.(); }
    }
  }

  _freeRemaining() {
    const em = this.enemies;
    if (!em?.list) return;
    if (typeof em.freeAll === 'function') { this._call(em, 'freeAll'); return; }
    const snap = this._snap;
    snap.length = 0;
    for (const e of em.list) snap.push(e);
    for (const e of snap) {
      if (isGone(e) || e.isBoss || e.treasure) continue;
      if (!smashableOf(e)) this._call(em, 'dizzy', e, 3, 'victory');
      if (smashableOf(e)) this._call(em, 'smash', e, { dirX: 0, dirZ: 1, byNova: true, victory: true });
    }
  }

  /** close the ★3 measuring windows (nova / popper blast) when the run stops ticking rules */
  _flushWindows() {
    const nw = this._novaWin;
    if (nw) { this.bestNova = Math.max(this.bestNova, nw.count); this._obj('novaMulti', nw.count, 'max'); this._novaWin = null; }
    for (const w of this._bombWins) this._obj('bombMulti', w.count, 'max');
    this._bombWins.length = 0;
  }

  _die() {
    if (this.state !== 'playing') return;
    if (!this.secondChanceUsed && (this.mode === 'stage' || this.mode === 'daily')) { this._enterSecondChance(); return; }
    this._flushWindows();
    this.state = 'dying';
    this._dyT = 0;
    this.won = false;
    this.levelChoices = null;
    const p = this.player;
    this.playerCtl.onDeath();
    this.G.bus?.emit('player:death', { x: p.x, z: p.z });
    this._call(this.G, 'slowMo', 0.35, 0.8);
    this._call(this.G.input, 'setNovaReady', false);
    this._cine = this._startCine('defeat', { x: p.x, z: p.z }, TUNE_R.defeatCineMax);
  }

  /** Second Chance (free): time freezes, the hero floats in a bubble, one button revives */
  _enterSecondChance() {
    this.secondChanceUsed = true;
    this.state = 'secondChance';
    this._scT = 0;
    this.levelChoices = null;
    const p = this.player;
    this.playerCtl.onSecondChance();
    this._call(this.G.post, 'setDanger', 0.3);
    this.G.bus?.emit('player:secondChance', { x: p.x, z: p.z });
  }

  /** the big 再来一次! button (ui/hud may call this; dash / confirm also work) */
  acceptSecondChance() {
    if (this.state !== 'secondChance') return false;
    const p = this.player, em = this.enemies, C = TUNE_R.secondChance;
    this.playerCtl.onRevive(C.iframes, C.hearts);
    this._call(em, 'pushRadius', p.x, p.z, C.radius, C.knock);
    this._call(em, 'dizzyRadius', p.x, p.z, C.radius, C.dizzy);
    this.guardian.stress = Math.max(this.guardian.stress, TUNE.guardian.levels[0].at);
    this.state = 'playing';
    this._lowHpArmed = true;
    this.G.fx?.burst?.('ring', p.x, 0.15, p.z, { radius: C.radius, color: 0x9ff4ff });
    this.shake(0.3, 0.35);
    this.rumble(0.6, 0.8, 200);
    this._updateDanger();
    this.G.bus?.emit('player:revive', { x: p.x, z: p.z, secondChance: true });
    this.G.bus?.emit('player:heal', { x: p.x, z: p.z, amount: p.hp, hp: p.hp, maxHp: p.maxHp });
    return true;
  }

  _end(win) {
    if (this.state === 'ended' || this.disposed) return;
    this.state = 'ended';
    this.won = !!win;
    this._cine = null;
    this.results = this._results(!!win);
    this.G.bus?.emit('run:end', { win: !!win, results: this.results });
  }

  /** one continue per run from the results screen */
  revive() {
    if (this.state !== 'ended' || this.won || this.revived || this.disposed) return false;
    this.revived = true;
    this._ending = false;
    const p = this.player, em = this.enemies, C = TUNE_R.reviveClear;
    this.playerCtl.onRevive(TUNE_R.reviveIframes);
    this._call(em, 'pushRadius', p.x, p.z, C.radius, C.knock);
    this._call(em, 'dizzyRadius', p.x, p.z, C.radius, C.dizzy);
    this.guardian.stress = Math.max(this.guardian.stress, TUNE.guardian.levels[0].at);
    this.state = 'playing';
    this._lowHpArmed = true;
    this._call(this.G.cam, 'skipCinematic');
    this._call(this.G.cam, 'follow', p);
    this._call(this.G.input, 'setTouchControls', true);
    this._updateDanger();
    this.G.bus?.emit('player:revive', { x: p.x, z: p.z });
    this.G.bus?.emit('player:heal', { x: p.x, z: p.z, amount: p.maxHp, hp: p.hp, maxHp: p.maxHp });
    return true;
  }

  _results(win) {
    const o = this.objective;
    const stageMode = this.mode === 'stage';
    const fewHits = this.hitsTaken <= TUNE.stars.maxHeartsLost;
    // crowns 👑 are independent: the challenge crown counts even on a failed run
    const starFlags = [win, win && fewHits, !!o?.done];
    const stars = stageMode ? starFlags.filter(Boolean).length : 0;
    const rescue = this.bossDefeated && stageMode ? this.worldDef.boss?.rescue ?? null : null;
    return {
      win, mode: this.mode, worldId: this.worldId, stageId: this.stageId, heroId: this.heroId,
      worldIndex: this.worldIndex, stageIndex: this.stageIndex, stageKey: this.stageDef.id, stageName: this.stageName,
      score: Math.round(this.score), time: Math.round(this.time * 10) / 10,
      wavesCleared: win && stageMode ? Math.max(this._wavesCleared.size, this.waveTotal) : this._wavesCleared.size,
      waveTotal: this.waveTotal,
      smashes: this.stats.smashes, perfects: this.stats.perfects, nearMisses: this.stats.nearMisses,
      bonks: this.stats.bonks, novas: this.stats.novas, maxCombo: this.maxCombo,
      hitsTaken: this.hitsTaken, damageTaken: this.damageTaken, hits: this.stats.hits,
      crystals: this.crystals, coins: Math.round(this.coinsEarned),
      stars, starFlags,
      freed: { ...this.freed }, freedCount: this.freedCount, totalCubes: this.totalCubes,
      bossDefeated: this.bossDefeated, rescued: rescue,
      level: this.level, cards: this.cards.map((c) => c.id),
      objective: o ? { ...o } : null,
      knocks: this.stats.knocks, dashes: this.stats.dashes, evolutions: this.stats.evolutions, coinCubes: this.stats.coinCubes,
      hitBy: this.lastHitBy ?? null,
      bestNova: Math.max(this.bestNova, this._novaWin?.count ?? 0),
      bossKills: this.bossesDefeated,
      bossPhase: this.isBossStage ? Math.max(this.bossPhase | 0 || 1, this.boss?.phase | 0 || 1) : 1,
      warpBank: this.warpBank ?? null,
      // Shrink Storm medals by cubes freed (results UI: medal = index 0 🥉 · 1 🥈 · 2 🥇, −1 none)
      ...(this.mode === 'storm' ? (() => { const n = (MODES.storm.medals || []).filter((m) => this.freedCount >= m).length; return { stormMedal: n, medal: n - 1 }; })() : {}),
      revived: this.revived, secondChanceUsed: this.secondChanceUsed, checkpoint: this.checkpoint, attempt: this.attempt,
      assist: this.assist, mutator: this.mutator?.id ?? null,
      // 1-based wave reached (Galaxy Survival counts its own endless waves)
      wave: this.mode === 'endless' ? (this.waves?.endlessN ?? this.wave + 1) : this.wave + 1,
    };
  }

  // ============ teardown ============
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const off of this._offs) { try { off(); } catch { /* ignore */ } }
    this._offs.length = 0;
    this._call(this.playerCtl, 'dispose');
    this._call(this.upgrades, 'dispose');
    this._call(this.pickups, 'dispose');
    this._call(this.waves, 'dispose');
    this._call(this.enemies, 'dispose');
    this.hazards.length = 0;
    const G = this.G;
    this._call(G.input, 'setNovaReady', false);
    this._call(G.world, 'setFever', false);
    if (this.arenaRadius !== this.baseArenaRadius || this.mode === 'storm') this._call(G.world, 'setPlayRadius', G.world?.arenaRadius ?? this.baseArenaRadius);
    this._call(G.post, 'setDanger', 0);
    this._call(G.audio, 'intensity', 0);
    if (G.cam?.follow) this._call(G.cam, 'follow', null);
    this.state = 'ended';
  }
}
Run._seenThisSession = new Set();
