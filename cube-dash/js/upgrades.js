// ─────────────────────────────────────────────────────────────
// CUBE DASH — upgrade cards (roguelite level-ups)
//
//   19 cards + 6 evolutions + 4 tag set bonuses (data.js CARDS / EVOLUTIONS /
//   TAGS / CARD_RULES). Every card visibly changes a verb (Nintendo toy rule).
//
//   Offer logic: pool = meta.unlockedCards() (fallback: starter cards) that are
//   not maxed (6 slots, level III max). Weighted by rarity (common 60 / rare 30 /
//   epic 10 + 2 per world), epic pity after 4 offers without an epic, an
//   eligible evolution (A at III + B owned, either way round) is forced into
//   slot 1 (gold beam in the UI), 1 free reroll per stage.
//
//   run.cardMods — numbers derived from owned cards, mutated IN PLACE so other
//   modules can keep a reference (enemies.js reads knockMult, extraHops,
//   maxHops, rimBounce, rimDizzyBonus, dizzyBonus, pinball …; see defaultMods()).
//
//   Visuals owned here (small, instanced): Buddy Sats (CubeCrowd with faces),
//   comet/meteor trail (instanced additive quads), friend cubes, bubble shield,
//   supernova star field, time-magic zone.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TUNE, CARDS, EVOLUTIONS, CARD_RULES, TAGS, RARITY } from './data.js';
import { clamp, TAU, rand } from './core.js';
import { t, tl, addStrings } from './i18n.js';
import { CubeCrowd, BlobShadows, EXPR } from './art.js';

const DEG = Math.PI / 180;
const TUNE_U = {
  sat: { radius: 2.0, guardRadius: 2.35, speed: 200, size: 0.36, hitR: 0.34, cd: 1.2, knock: 7, dizzy: 1.0, blastR: 5.4, blastTime: 0.9, color: 0x5fb4ff },
  comet: { gap: 0.3, life: 1.1, meteorLife: 1.6, radius: 0.5, perEnemyCd: 0.9, cap: 160, meteorDizzy: 2.5 },
  pop: { knock: 8 },
  reaction: { radius: 3, delay: 0.075, capPerSec: 30, popAfter: 0.7 },
  friends: { speed: 15, range: 7, knock: 9, cap: 10 },
  mini: { radius: 3.5, dizzy: 1.5, supernovaEvery: 5 },
  time: { slowR: 6, keep: 0.6, slowTime: 2, stop: 1.5 },
  field: { radius: 6, time: 5, dizzy: 2, perEnemyCd: 1.5 },
  bubble: { radius: 0.92 },
  setIcons: { dash: '⚡', bonk: '💥', guard: '🛡', star: '✦' },
};

addStrings({
  zh: { 'card.set': '套装奖励!', 'card.reaction': '×{n} 连爆!', 'card.mini': '小新星!', 'card.timestop': '时间停止!', 'card.shield': '泡泡盾!' },
  en: { 'card.set': 'SET BONUS!', 'card.reaction': '×{n} CHAIN!', 'card.mini': 'MINI NOVA!', 'card.timestop': 'TIME STOP!', 'card.shield': 'BUBBLE!' },
});

const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const EVO_BY_ID = new Map(EVOLUTIONS.map((e) => [e.id, e]));
const isGone = (e) => !e || e.dead || e.portal === true || e.state === 'dying' || e.state === 'portal';
const smashableOf = (e) => e.smashable ?? e.coreOpen ?? false;
const harmfulOf = (e) => e.harmful ?? (!smashableOf(e) && !isGone(e));
const isHeavy = (e) => e.isBoss || e.type === 'bruiser' || e.type === 'beamer' || (e.mass ?? 1) >= 2.5;

let softTex = null;
function softTexture() {
  if (softTex) return softTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  softTex = new THREE.CanvasTexture(c);
  softTex.colorSpace = THREE.SRGBColorSpace;
  return softTex;
}

function starGeometry(r1 = 0.26, r2 = 0.11) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + Math.PI / 2, r = i % 2 ? r2 : r1;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

const BUBBLE_VERT = /* glsl */`
varying vec3 vN; varying vec3 vV;
void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BUBBLE_FRAG = /* glsl */`
uniform float uAlpha; uniform float uTime;
varying vec3 vN; varying vec3 vV;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  vec3 a = vec3(0.55, 0.95, 1.0), b = vec3(1.0, 0.6, 0.95);
  vec3 col = mix(a, b, 0.5 + 0.5 * sin(uTime * 2.0 + vN.y * 4.0 + vN.x * 3.0));
  float spec = smoothstep(0.93, 1.0, dot(normalize(vN), normalize(vec3(-0.4, 0.8, 0.45))));
  gl_FragColor = vec4(col * (0.6 + f * 1.4) + spec, (0.08 + f * 0.8 + spec * 0.6) * uAlpha);
}`;

export class Upgrades {
  /** the neutral card-mod record (also used by Run before Upgrades exists) */
  static defaultMods() {
    return {
      // dash ⚡
      dashDistMult: 1, staminaMax: 0, regenMult: 1, regenDelay: TUNE.stamina.delay,
      comet: 0, meteor: false, perfectTtcBonus: 0, perfectRadiusBonus: 0, staminaPips: 0,
      // bonk 💥 (read by enemies.js)
      knockMult: 1, extraHops: 0, maxHops: TUNE.knock.maxHops, rimBounce: 0, rimDizzyBonus: 0,
      dizzyBonus: 0, pop: 0, reaction: false, pinball: false,
      // guard 🛡
      sats: 0, satSmash: false, maxShield: 0, shieldRecharge: 0, friends: 0, dodgeheal: 0,
      // star ✦
      magnet: TUNE.xp.magnetRadius, novaMult: 1, novaRadiusMult: 1, mininova: 0, supernova: false,
      timemagic: 0, timestop: false,
    };
  }

  constructor(G, run) {
    this.G = G;
    this.run = run;
    this.owned = new Map();      // cardId → level (1..3)
    this.evos = new Set();       // evolution ids
    this.sets = new Set();       // granted tag set bonuses
    this.offersSinceEpic = 0;
    this.rerolls = CARD_RULES.freeRerolls;
    this.lastOffer = [];
    run.cards = run.cards || [];
    if (!run.cardMods) run.cardMods = Upgrades.defaultMods();

    // effect state
    this.satAngle = 0;
    this.satCd = new Float32Array(8);
    this.satBlastT = 0;
    this.shieldT = 0;
    this.trail = [];             // comet segments {x, z, t, life, rot, alive}
    for (let i = 0; i < TUNE_U.comet.cap; i++) this.trail.push({ x: 0, z: 0, t: 0, life: 1, rot: 0, s: 1, alive: false });
    this._trailLast = null;
    this._trailOn = false;
    this._trailHit = new WeakMap();
    this.reactQ = [];            // pending chain-reaction bursts {x, z, t}
    this._reactBudget = TUNE_U.reaction.capPerSec;
    this._reactChain = 0; this._reactT = 0; this._reactX = 0; this._reactZ = 0;
    this.miniCount = 0;
    this._inMini = false;
    this.nearMissCount = 0;
    this.friends = [];
    for (let i = 0; i < TUNE_U.friends.cap; i++) this.friends.push({ alive: false, x: 0, y: 0, z: 0, fx: 0, fz: 0, e: null, t: 0, dur: 0.3 });
    this.slowZone = { x: 0, z: 0, t: 0 };
    this.freezeT = 0;
    this.field = { x: 0, z: 0, t: 0 };
    this._fieldHit = new WeakMap();
    this._snap = [];
    this._time = 0;

    this._buildVisuals();
    this.recompute();
  }

  // ============ visuals ============
  _buildVisuals() {
    const G = this.G;
    this.group = new THREE.Group();
    this.group.name = 'upgrades';
    G.scene?.add(this.group);
    // buddy sats + friend cubes: tiny face-cubes (one instanced draw each)
    this.satCrowd = new CubeCrowd(8, { radius: 0.24, segments: 2 });
    this.friendCrowd = new CubeCrowd(TUNE_U.friends.cap, { radius: 0.24, segments: 2 });
    this.shadows = new BlobShadows(20);
    this.group.add(this.satCrowd.mesh, this.friendCrowd.mesh, this.shadows.mesh);
    // comet trail
    const qg = new THREE.PlaneGeometry(1, 1); qg.rotateX(-Math.PI / 2);
    // normal blending: stays saturated cyan / fire-orange on the bright pastel floors
    this.trailMesh = new THREE.InstancedMesh(qg, new THREE.MeshBasicMaterial({
      map: softTexture(), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false,
    }), TUNE_U.comet.cap);
    this.trailMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TUNE_U.comet.cap * 3), 3);
    this.trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trailMesh.frustumCulled = false; this.trailMesh.count = 0; this.trailMesh.renderOrder = 3;
    this.group.add(this.trailMesh);
    // bubble shield
    this.bubbleMat = new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 } }, vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(TUNE_U.bubble.radius, 28, 18), this.bubbleMat);
    this.bubble.visible = false; this.bubble.renderOrder = 5;
    this.bubblePop = 0;
    this.group.add(this.bubble);
    // zones (time magic slow zone / supernova star field): flat rings + orbiting stars
    const ring = new THREE.RingGeometry(0.9, 1, 72); ring.rotateX(-Math.PI / 2);
    this.zoneMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.zone = new THREE.Mesh(ring, this.zoneMat); this.zone.visible = false; this.zone.position.y = 0.05;
    this.fieldMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.fieldRing = new THREE.Mesh(ring, this.fieldMat); this.fieldRing.visible = false; this.fieldRing.position.y = 0.05;
    this.fieldStars = new THREE.InstancedMesh(starGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff08a, transparent: true, depthWrite: false, toneMapped: false }), 14);
    this.fieldStars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fieldStars.frustumCulled = false; this.fieldStars.count = 0;
    this.group.add(this.zone, this.fieldRing, this.fieldStars);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    this._cCyan = new THREE.Color(0x19c6ff); this._cWhite = new THREE.Color(0xb8f6ff);
    this._cFire = new THREE.Color(0xff5a1a); this._cGold = new THREE.Color(0xffd23a);
    this._o = { x: 0, y: 0, z: 0, s: 1, sx: undefined, sy: undefined, sz: undefined, rotX: 0, rotY: 0, rotZ: 0, color: 0, expr: 0, blink: 0, lookX: 0, lookY: 0, flash: 0, glow: 0, opacity: 1 };
  }

  /** CubeCrowd.set through one reused scratch record (no per-frame allocations) */
  _crowd(crowd, i, x, y, z, s, rotX, rotY, color, expr, glow) {
    const o = this._o;
    o.x = x; o.y = y; o.z = z; o.s = s; o.rotX = rotX; o.rotY = rotY; o.color = color; o.expr = expr; o.glow = glow;
    crowd.set(i, o);
  }

  // ============ queries ============
  level(id) { return this.owned.get(id) || 0; }
  has(id) { return this.owned.has(id) || this.evos.has(id); }
  value(id) { const l = this.level(id); return l ? CARD_BY_ID.get(id).values[l - 1] : 0; }
  get slotsUsed() { return this.owned.size; }
  get rerollsLeft() { return this.rerolls; }

  _unlockedSet() {
    let ids = null;
    try { ids = this.G.meta?.unlockedCards?.(); } catch { ids = null; }
    if (!Array.isArray(ids) || !ids.length) ids = CARDS.filter((c) => c.starter).map((c) => c.id);
    const s = new Set(ids);
    for (const id of this.owned.keys()) s.add(id);
    return s;
  }
  _evoReady(e) {
    const [a, b] = e.from;
    return (this.level(a) >= CARD_RULES.maxLevel && this.has(b)) || (this.level(b) >= CARD_RULES.maxLevel && this.has(a));
  }

  // ============ offers ============
  _choice(card, isEvo = false) {
    const lvl = isEvo ? 1 : this.level(card.id) + 1;
    const partnerEvo = isEvo ? null : EVOLUTIONS.find((e) => e.from.includes(card.id));
    const withId = partnerEvo ? partnerEvo.from.find((f) => f !== card.id) : null;
    return {
      id: card.id,
      rarity: isEvo ? 'legend' : card.rarity,
      level: lvl,
      maxLevel: isEvo ? 1 : CARD_RULES.maxLevel,
      icon: card.icon,
      tag: card.tag || null,
      tagIcon: card.tag ? TAGS[card.tag]?.icon : null,
      name: card.name,
      desc: card.desc,
      values: card.values || null,
      value: card.values ? card.values[lvl - 1] : null,
      isEvo, evolution: isEvo,
      from: isEvo ? card.from.map((id) => ({ id, icon: CARD_BY_ID.get(id)?.icon })) : null,
      partner: partnerEvo ? { evoId: partnerEvo.id, evoIcon: partnerEvo.icon, withId, withIcon: CARD_BY_ID.get(withId)?.icon, owned: this.has(withId) } : null,
      isNew: lvl === 1,
    };
  }

  /** 3 choices for a level-up (evolution forced into slot 1 when eligible) */
  offer({ exclude = null, count, recommend = false } = {}) {
    const run = this.run;
    const rng = run.rng || rand;
    const unlocked = this._unlockedSet();
    const slotsFull = this.owned.size >= CARD_RULES.slots;
    const pool = [];
    for (const c of CARDS) {
      const lvl = this.level(c.id);
      if (lvl >= CARD_RULES.maxLevel) continue;
      if (!lvl && (slotsFull || !unlocked.has(c.id))) continue;
      pool.push(c);
    }
    const want = clamp(count || CARD_RULES.offer, 1, CARD_RULES.offer);
    const picks = [];
    const evo = EVOLUTIONS.find((e) => !this.evos.has(e.id) && this._evoReady(e));
    if (evo) picks.push(this._choice(evo, true));
    // prefer fresh cards on a reroll, but never leave a slot empty because of it
    let src = pool;
    if (exclude && exclude.size) {
      const fresh = pool.filter((c) => !exclude.has(c.id));
      if (fresh.length >= want - picks.length) src = fresh;
    }
    src = src.slice();
    const epicW = RARITY.epic.weight + CARD_RULES.epicPerWorld * (run.worldIndex || 0);
    const weightOf = (c) => (c.rarity === 'epic' ? epicW : RARITY[c.rarity]?.weight ?? 10);
    if (this.offersSinceEpic >= CARD_RULES.epicPity && picks.length < want) {
      const epics = src.filter((c) => c.rarity === 'epic');
      if (epics.length) {
        const c = epics[Math.floor(rng() * epics.length)];
        picks.push(this._choice(c));
        src.splice(src.indexOf(c), 1);
      }
    }
    while (picks.length < want && src.length) {
      const c = rng.weighted ? rng.weighted(src, weightOf) : src[Math.floor(rng() * src.length)];
      picks.push(this._choice(c));
      src.splice(src.indexOf(c), 1);
    }
    const hadEpic = picks.some((p) => p.rarity === 'epic' || p.isEvo);
    this.offersSinceEpic = hadEpic ? 0 : this.offersSinceEpic + 1;
    // first stages: one friendly card gets a "recommended" bounce (UI)
    if (recommend) {
      const pref = ['boots', 'punch', 'stars', 'snack', 'magnet', 'sats', 'battery', 'quick', 'rim', 'core'];
      const rank = (c) => (pref.includes(c.id) ? pref.indexOf(c.id) : pref.length);
      let best = null;
      for (const c of picks) if (!c.isEvo && (!best || rank(c) < rank(best))) best = c;
      if (best) best.recommended = true;
    }
    this._lastArgs = { count, recommend };
    this.lastOffer = picks;
    return picks;
  }

  reroll() {
    if (this.rerolls <= 0) return null;
    this.rerolls--;
    const ex = new Set(this.lastOffer.filter((c) => !c.isEvo).map((c) => c.id));
    return this.offer({ ...(this._lastArgs || {}), exclude: ex });
  }

  // ============ taking a card ============
  take(id) {
    const run = this.run;
    let info = null;
    if (EVO_BY_ID.has(id)) {
      if (this.evos.has(id)) return null;
      this.evos.add(id);
      if (run.stats) run.stats.evolutions = (run.stats.evolutions || 0) + 1;
      info = { id, rarity: 'legend', level: 1, evo: true };
    } else {
      const card = CARD_BY_ID.get(id);
      if (!card) return null;
      const lvl = Math.min(CARD_RULES.maxLevel, this.level(id) + 1);
      if (lvl === this.level(id)) return null;
      this.owned.set(id, lvl);
      info = { id, rarity: card.rarity, level: lvl };
    }
    this._syncCards();
    this.recompute();
    // immediate effects
    const p = run.player;
    if (id === 'snack') run.addMaxHearts?.(1, 1);
    if ((id === 'bubble' || id === 'guard') && p) { p.shield = Math.max(p.shield | 0, 1); this.shieldT = 0; }
    if (id === 'battery' && p) p.stamina = Math.min(p.maxStamina, p.stamina + this.value('battery'));
    this._checkSets();
    return info;
  }

  _syncCards() {
    const list = this.run.cards;
    list.length = 0;
    for (const [id, level] of this.owned) list.push({ id, level });
    for (const id of this.evos) list.push({ id, level: 1, evo: true });
  }

  _checkSets() {
    const counts = { dash: 0, bonk: 0, guard: 0, star: 0 };
    for (const id of this.owned.keys()) { const tg = CARD_BY_ID.get(id)?.tag; if (tg) counts[tg]++; }
    for (const tag of Object.keys(counts)) {
      if (counts[tag] < 3 || this.sets.has(tag)) continue;
      this.sets.add(tag);
      this.recompute();
      const run = this.run, p = run.player;
      if (tag === 'guard') run.addMaxHearts?.(1, 'full');
      if (tag === 'dash' && p) p.stamina = p.maxStamina;
      if (this._silent) continue;
      this.G.bus?.emit('card:setBonus', { tag, icon: TAGS[tag].icon, bonus: TAGS[tag].bonus });
      this.G.hud?.banner?.(`${TAGS[tag].icon} ${t('card.set')} ${tl(TAGS[tag].bonus)}`, 'set', 2.2);
    }
  }

  /** derive run.cardMods from owned cards (in place) */
  recompute() {
    const run = this.run;
    const m = run.cardMods;
    Object.assign(m, Upgrades.defaultMods());
    const v = (id) => this.value(id);
    const L = (id) => this.level(id);
    const hero = run.heroDef;
    // ⚡
    m.dashDistMult = 1 + v('boots');
    m.staminaPips = this.sets.has('dash') ? 1 : 0;
    m.staminaMax = v('battery') + m.staminaPips * (hero?.dashCost ?? TUNE.dash.cost);
    m.regenMult = 1 + v('quick');
    m.regenDelay = L('quick') >= 3 ? 0.2 : TUNE.stamina.delay;
    m.meteor = this.evos.has('meteor');
    m.comet = m.meteor ? Math.max(v('comet'), TUNE_U.comet.meteorDizzy) : v('comet');
    m.perfectTtcBonus = v('justright');
    m.perfectRadiusBonus = L('justright');
    // 💥
    m.knockMult = 1 + v('punch');                    // the Bouncy-Floor mutator is applied inside em.knock()
    m.extraHops = v('chain');
    m.pinball = this.evos.has('pinball');
    m.maxHops = m.pinball ? 6 : TUNE.knock.maxHops + m.extraHops;
    m.rimBounce = v('rim') || (m.pinball ? 1.4 : 0);
    m.rimDizzyBonus = L('rim') || m.pinball ? 1 : 0;
    m.dizzyBonus = v('stars') + (this.sets.has('bonk') ? 1 : 0);   // hero passives (Starlight) are enemies.js' job
    m.pop = v('pop');
    m.reaction = this.evos.has('reaction');
    if (m.reaction && !m.pop) m.pop = TUNE_U.reaction.radius;
    // 🛡
    const guard = this.evos.has('guard');
    m.sats = guard ? 4 : v('sats');
    m.satSmash = guard;
    m.shieldRecharge = v('bubble') || (guard ? 6 : 0);
    m.maxShield = m.shieldRecharge ? 1 : 0;
    m.friends = v('friends');
    m.dodgeheal = v('dodgeheal');
    // ✦
    m.magnet = L('magnet') ? v('magnet') : TUNE.xp.magnetRadius;
    m.novaMult = (1 + v('core')) * (this.sets.has('star') ? 1.2 : 1);
    m.supernova = this.evos.has('supernova');
    m.novaRadiusMult = m.supernova ? 1.5 : 1;
    m.mininova = v('mininova');
    if (m.supernova) m.mininova = m.mininova ? Math.min(m.mininova, TUNE_U.mini.supernovaEvery) : TUNE_U.mini.supernovaEvery;
    m.timemagic = v('timemagic');
    m.timestop = this.evos.has('timestop');
    run.playerCtl?.refreshStats?.();
  }

  // ============ hooks (called by Run / Player) ============
  onSmash(p) {
    const m = this.run.cardMods;
    const em = this.run.enemies;
    if (m.pop > 0 && !p.byReaction) {
      em?.pushRadius?.(p.x, p.z, m.pop, TUNE_U.pop.knock * (m.knockMult || 1));
      this.G.fx?.burst?.('ring', p.x, 0.15, p.z, { radius: m.pop, color: 0xff8ad8 });
    }
    if (m.reaction && this.reactQ.length < 64) this.reactQ.push({ x: p.x, z: p.z, t: TUNE_U.reaction.delay });
    if (m.mininova > 0 && !this._inMini) {
      this.miniCount++;
      if (this.miniCount >= m.mininova) { this.miniCount = 0; this.miniNova(); }
    }
  }

  onFreed(p) {
    const m = this.run.cardMods;
    if (m.friends > 0 && (this.run.rng ? this.run.rng() : rand()) < m.friends) this._sendFriend(p.x, p.z);
  }

  onNearMiss() {
    const m = this.run.cardMods;
    if (!(m.dodgeheal > 0)) return;
    this.nearMissCount++;
    if (this.nearMissCount >= m.dodgeheal) { this.nearMissCount = 0; this.run.healPlayer?.(1); }
  }

  onPerfect(x, z) {
    const m = this.run.cardMods;
    const em = this.run.enemies;
    if (m.timemagic > 0) {
      this.slowZone.x = x; this.slowZone.z = z; this.slowZone.t = TUNE_U.time.slowTime;
      // prefer the EnemyManager's own slow (it scales AI + physics); else revert displacement ourselves
      this.slowZone.native = typeof em?.slowRadius === 'function';
      if (this.slowZone.native) { try { em.slowRadius(x, z, TUNE_U.time.slowR, TUNE_U.time.keep, TUNE_U.time.slowTime); } catch { this.slowZone.native = false; } }
    }
    if (m.timestop) {
      this.freezeT = TUNE_U.time.stop;
      this.freezeNative = typeof em?.freezeAll === 'function';
      if (this.freezeNative) { try { em.freezeAll(TUNE_U.time.stop); } catch { this.freezeNative = false; } }
      const snap = this._snapshot();
      if (!this.freezeNative) for (const e of snap) if (!isGone(e) && !e.isBoss && !smashableOf(e)) em?.dizzy?.(e, TUNE_U.time.stop, 'timestop');
      this.G.post?.pulse?.({ flash: 0.18, flashColor: 0x9fe8ff, chroma: 0.3, duration: 0.35 });
      this.G.hud?.pop?.(x, 2.2, z, t('card.timestop'), 'crit');
    }
  }

  onNova(x, z) {
    if (!this.run.cardMods.supernova) return;
    this.field.x = x; this.field.z = z; this.field.t = TUNE_U.field.time;
  }

  onShieldBlocked(x, z) {
    this.shieldT = 0;
    this.bubblePop = 0.3;
    if (this.evos.has('guard')) this.satBlastT = TUNE_U.sat.blastTime;
    this.G.fx?.burst?.('sparks', x, 0.8, z, { count: 18, color: 0x9ff4ff });
  }

  onDashStart(x, z) {
    if (!(this.run.cardMods.comet > 0)) { this._trailOn = false; return; }
    this._trailOn = true;
    this._trailLast = this._trailLast || { x: 0, z: 0 };
    this._trailLast.x = x; this._trailLast.z = z;
    this._addSeg(x, z);
  }
  onDashMove(x, z) {
    if (!this._trailOn) return;
    const L = this._trailLast;
    let dx = x - L.x, dz = z - L.z;
    let d = Math.hypot(dx, dz);
    const gap = TUNE_U.comet.gap * (this.G.quality === 'low' ? 1.6 : 1);
    let guard = 40;
    while (d >= gap && guard-- > 0) {
      L.x += (dx / d) * gap; L.z += (dz / d) * gap;
      this._addSeg(L.x, L.z);
      dx = x - L.x; dz = z - L.z; d = Math.hypot(dx, dz);
    }
  }
  onDashEnd(x, z) { if (this._trailOn) { this.onDashMove(x, z); this._trailOn = false; } }

  _addSeg(x, z) {
    let slot = null, oldest = null;
    for (const s of this.trail) {
      if (!s.alive) { slot = s; break; }
      if (!oldest || s.t > oldest.t) oldest = s;
    }
    slot = slot || oldest;
    slot.alive = true; slot.x = x; slot.z = z; slot.t = 0;
    slot.life = this.run.cardMods.meteor ? TUNE_U.comet.meteorLife : TUNE_U.comet.life;
    slot.rot = rand() * TAU; slot.s = 0.85 + rand() * 0.35;
  }

  // ============ effects ============
  _snapshot(out = this._snap) {
    out.length = 0;
    const list = this.run.enemies?.list;
    if (list) for (const e of list) out.push(e);
    return out;
  }

  /** auto mini-nova around the hero: smash dizzy cubes, dizzy the rest */
  miniNova() {
    const run = this.run, em = run.enemies, p = run.player;
    if (!em || !p) return;
    const R = TUNE_U.mini.radius;
    this._inMini = true;
    const snap = this._snapshot(this._miniSnap || (this._miniSnap = []));
    for (const e of snap) {
      if (isGone(e) || e.isBoss) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > R + (e.radius ?? 0.5)) continue;
      if (smashableOf(e)) em.smash?.(e, { dirX: dx / (d || 1), dirZ: dz / (d || 1), mini: true });
      else if (!e.treasure) em.dizzy?.(e, TUNE_U.mini.dizzy, 'mininova');
    }
    this._inMini = false;
    this.G.fx?.burst?.('ring', p.x, 0.2, p.z, { radius: R, color: 0xffe27a });
    this.G.fx?.burst?.('stars', p.x, 1, p.z, { count: 10 });
    this.G.bus?.emit('card:mininova', { x: p.x, z: p.z, radius: R });
    run.shake?.(0.18, 0.25);
  }

  _sendFriend(x, z) {
    const em = this.run.enemies;
    if (!em?.list) return;
    let best = null, bd = TUNE_U.friends.range;
    for (const e of em.list) {
      if (isGone(e) || e.isBoss || smashableOf(e) || !harmfulOf(e)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    const f = this.friends.find((q) => !q.alive);
    if (!f) return;
    f.alive = true; f.x = x; f.z = z; f.fx = x; f.fz = z; f.y = 1.1; f.e = best; f.t = 0;
    f.dur = Math.max(0.18, bd / TUNE_U.friends.speed);
  }

  _burst(q) {
    const run = this.run, em = run.enemies;
    if (!em) return;
    const R = TUNE_U.reaction.radius;
    let n = 0;
    const snap = this._snapshot(this._reactSnap || (this._reactSnap = []));
    for (const e of snap) {
      if (this._reactBudget < 1) break;
      if (isGone(e) || e.isBoss || !smashableOf(e)) continue;
      const dx = e.x - q.x, dz = e.z - q.z, d = Math.hypot(dx, dz);
      if (d > R + (e.radius ?? 0.5)) continue;
      this._reactBudget -= 1;
      n++;
      em.smash?.(e, { dirX: dx / (d || 1), dirZ: dz / (d || 1), byReaction: true });
    }
    this.G.fx?.burst?.('ring', q.x, 0.2, q.z, { radius: R, color: 0xffb13b });
    if (n) {
      this._reactChain += n;
      this._reactT = TUNE_U.reaction.popAfter;
      this._reactX = q.x; this._reactZ = q.z;
    }
  }

  preEnemies() {
    const slow = this.slowZone.t > 0 && !this.slowZone.native, freeze = this.freezeT > 0 && !this.freezeNative;
    if (!slow && !freeze) return;
    const list = this.run.enemies?.list;
    if (!list) return;
    for (const e of list) { e._gaPx = e.x; e._gaPz = e.z; }
  }

  postEnemies(dt) {
    const list = this.run.enemies?.list;
    const slow = this.slowZone.t > 0 && !this.slowZone.native, freeze = this.freezeT > 0 && !this.freezeNative;
    if (list && (slow || freeze)) {
      const R = TUNE_U.time.slowR, keep = TUNE_U.time.keep;
      for (const e of list) {
        if (e._gaPx === undefined) continue;
        if (!isGone(e)) {
          if (freeze && !e.isBoss) {
            e.x = e._gaPx; e.z = e._gaPz;
            if (e.vx !== undefined) { e.vx = 0; e.vz = 0; }
          } else if (slow && Math.hypot(e.x - this.slowZone.x, e.z - this.slowZone.z) < R) {
            e.x = e._gaPx + (e.x - e._gaPx) * keep;
            e.z = e._gaPz + (e.z - e._gaPz) * keep;
          }
        }
        e._gaPx = undefined; e._gaPz = undefined;
      }
    }
    if (this.slowZone.t > 0) this.slowZone.t -= dt;
    if (this.freezeT > 0) this.freezeT -= dt;
  }

  update(dt) {
    const run = this.run, p = run.player, em = run.enemies, m = run.cardMods;
    const live = dt > 0;          // frozen frames (hit-stop, Second Chance bubble) only redraw
    this._time += dt;
    const time = this._time;
    this._reactBudget = Math.min(TUNE_U.reaction.capPerSec, this._reactBudget + TUNE_U.reaction.capPerSec * dt);
    this.shadows.begin();

    // ---------- bubble shield recharge ----------
    if (p && m.maxShield > 0 && (p.shield | 0) < m.maxShield) {
      this.shieldT += dt;
      if (this.shieldT >= m.shieldRecharge) {
        p.shield = m.maxShield; this.shieldT = 0;
        this.G.bus?.emit('player:shieldReady', { x: p.x, z: p.z });
      }
    }

    // ---------- buddy sats ----------
    const nSat = Math.min(8, m.sats | 0);
    if (p && nSat > 0 && em?.list) {
      this.satAngle += TUNE_U.sat.speed * DEG * dt;
      if (this.satBlastT > 0) this.satBlastT = Math.max(0, this.satBlastT - dt);
      const base = m.satSmash ? TUNE_U.sat.guardRadius : TUNE_U.sat.radius;
      const bk = this.satBlastT > 0 ? Math.sin(Math.PI * (1 - this.satBlastT / TUNE_U.sat.blastTime)) : 0;
      const r = base + (TUNE_U.sat.blastR - base) * bk;
      const snap = live ? this._snapshot() : null;
      for (let i = 0; i < nSat; i++) {
        this.satCd[i] = Math.max(0, this.satCd[i] - dt);
        const a = this.satAngle + (i / nSat) * TAU;
        const sx = p.x + Math.sin(a) * r, sz = p.z + Math.cos(a) * r;
        const sy = 0.62 + Math.sin(time * 6 + i) * 0.1;
        if (snap) for (const e of snap) {
          if (isGone(e) || e.isBoss || e.treasure) continue;
          const d = Math.hypot(e.x - sx, e.z - sz);
          if (d > TUNE_U.sat.hitR + (e.radius ?? 0.5)) continue;
          const ox = e.x - p.x, oz = e.z - p.z, od = Math.hypot(ox, oz) || 1;
          if (smashableOf(e)) {
            if (m.satSmash) em.smash?.(e, { dirX: ox / od, dirZ: oz / od, bySat: true });
          } else if (this.satCd[i] <= 0 || bk > 0) {
            em.knock?.(e, ox / od, oz / od, TUNE_U.sat.knock * (bk > 0 ? 1.6 : 1), { bySat: true });
            em.dizzy?.(e, TUNE_U.sat.dizzy, 'sat');
            this.satCd[i] = TUNE_U.sat.cd;
            this.G.fx?.burst?.('sparks', sx, sy, sz, { count: 8, color: 0x8fd3ff });
          }
          break;
        }
        const hit = this.satCd[i] > TUNE_U.sat.cd - 0.25;
        this._crowd(this.satCrowd, i, sx, sy, sz, TUNE_U.sat.size * (hit ? 1.25 : 1), 0, a + Math.PI / 2,
          m.satSmash ? 0x8f7bff : TUNE_U.sat.color, hit || bk > 0 ? EXPR.FOCUS : EXPR.HAPPY, m.satSmash ? 0.35 : 0.15);
        this.shadows.add(sx, sz, TUNE_U.sat.size, sy);
      }
      this.satCrowd.count = nSat;
    } else this.satCrowd.count = 0;
    this.satCrowd.commit();

    // ---------- comet / meteor trail ----------
    const cometDizzy = m.comet;
    let ti = 0;
    const fire = m.meteor;
    const snapT = cometDizzy > 0 && live ? this._snapshot() : null;
    for (const s of this.trail) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t >= s.life) { s.alive = false; continue; }
      if (snapT) {
        for (const e of snapT) {
          if (isGone(e) || e.isBoss || smashableOf(e) || e.type === 'bruiser' || e.treasure) continue;
          if (Math.hypot(e.x - s.x, e.z - s.z) > TUNE_U.comet.radius + (e.radius ?? 0.5)) continue;
          const last = this._trailHit.get(e);
          if (last !== undefined && time - last < TUNE_U.comet.perEnemyCd) continue;
          this._trailHit.set(e, time);
          em?.dizzy?.(e, cometDizzy, fire ? 'meteor' : 'comet');
        }
      }
      const k = 1 - s.t / s.life;
      const sc = (fire ? 1.25 : 1.0) * s.s * (0.45 + 0.55 * k);
      this._e.set(0, s.rot + time * 2, 0);
      this._q.setFromEuler(this._e);
      this._p.set(s.x, 0.06 + ti * 0.0004, s.z);
      this._s.set(sc, 1, sc);
      this._m.compose(this._p, this._q, this._s);
      this.trailMesh.setMatrixAt(ti, this._m);
      if (fire) this._c.copy(this._cFire).lerp(this._cGold, k * 0.7).multiplyScalar(0.9 + k * 0.5);
      else this._c.copy(this._cCyan).lerp(this._cWhite, k * 0.6).multiplyScalar(0.9 + k * 0.4);
      this.trailMesh.setColorAt(ti, this._c);
      ti++;
    }
    this.trailMesh.count = ti;
    this.trailMesh.instanceMatrix.needsUpdate = true;
    if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;

    // ---------- chain reaction queue ----------
    for (let i = this.reactQ.length - 1; i >= 0; i--) {
      const q = this.reactQ[i];
      q.t -= dt;
      if (q.t <= 0) { this.reactQ.splice(i, 1); this._burst(q); }
    }
    if (this._reactT > 0) {
      this._reactT -= dt;
      if (this._reactT <= 0) {
        if (this._reactChain >= 2) {
          this.G.hud?.pop?.(this._reactX, 1.8, this._reactZ, t('card.reaction', { n: this._reactChain }), 'crit');
          this.G.bus?.emit('card:reaction', { x: this._reactX, z: this._reactZ, count: this._reactChain });
        }
        this._reactChain = 0;
      }
    }

    // ---------- friend cubes ----------
    let fi = 0;
    for (const f of this.friends) {
      if (!f.alive) continue;
      f.t += dt;
      const e = f.e;
      const alive = e && !isGone(e);
      const tx = alive ? e.x : f.x, tz = alive ? e.z : f.z;
      const k = clamp(f.t / f.dur, 0, 1);
      f.x = f.fx + (tx - f.fx) * k;
      f.z = f.fz + (tz - f.fz) * k;
      f.y = 0.4 + Math.sin(k * Math.PI) * 1.4;
      if (k >= 1) {
        f.alive = false;
        if (alive) {
          const dx = e.x - f.fx, dz = e.z - f.fz, d = Math.hypot(dx, dz) || 1;
          em?.knock?.(e, dx / d, dz / d, TUNE_U.friends.knock * (m.knockMult || 1), { byFriend: true });
          this.G.fx?.burst?.('sparks', e.x, 0.6, e.z, { count: 10, color: 0xffffff });
        }
        continue;
      }
      this._crowd(this.friendCrowd, fi++, f.x, f.y, f.z, 0.5, -0.3, Math.atan2(tx - f.fx, tz - f.fz), 0xf4fbff, EXPR.JOY, 0.35);
      this.shadows.add(f.x, f.z, 0.5, f.y);
    }
    this.friendCrowd.count = fi;
    this.friendCrowd.commit();

    // ---------- supernova star field ----------
    if (this.field.t > 0) {
      this.field.t -= dt;
      const F = this.field, R = TUNE_U.field.radius;
      if (em?.list && live) {
        for (const e of em.list) {
          if (isGone(e) || e.isBoss || smashableOf(e) || !harmfulOf(e)) continue;
          if (Math.hypot(e.x - F.x, e.z - F.z) > R) continue;
          const last = this._fieldHit.get(e);
          if (last !== undefined && time - last < TUNE_U.field.perEnemyCd) continue;
          this._fieldHit.set(e, time);
          em.dizzy?.(e, TUNE_U.field.dizzy, 'starfield');
        }
      }
      const a = clamp(F.t / 0.4, 0, 1) * clamp((TUNE_U.field.time - F.t) / 0.3, 0, 1);
      this.fieldRing.visible = true;
      this.fieldRing.position.set(F.x, 0.05, F.z);
      this.fieldRing.scale.setScalar(R);
      this.fieldMat.opacity = 0.55 * a;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const ang = time * 0.9 + (i / n) * TAU;
        const rr = R * (0.94 + 0.04 * Math.sin(time * 3 + i));
        const sc = a * (0.9 + 0.3 * Math.sin(time * 6 + i * 1.7));
        this._e.set(0, -ang * 2, 0);
        this._q.setFromEuler(this._e);
        this._p.set(F.x + Math.sin(ang) * rr, 0.25 + 0.15 * Math.sin(time * 4 + i), F.z + Math.cos(ang) * rr);
        this._s.set(sc, sc, sc);
        this._m.compose(this._p, this._q, this._s);
        this.fieldStars.setMatrixAt(i, this._m);
      }
      this.fieldStars.count = n;
      this.fieldStars.instanceMatrix.needsUpdate = true;
    } else { this.fieldRing.visible = false; this.fieldStars.count = 0; }

    // ---------- time magic zone ----------
    if (this.slowZone.t > 0) {
      this.zone.visible = true;
      this.zone.position.set(this.slowZone.x, 0.05, this.slowZone.z);
      const k = clamp(this.slowZone.t / 0.4, 0, 1);
      this.zone.scale.setScalar(TUNE_U.time.slowR * (1 + 0.03 * Math.sin(time * 8)));
      this.zoneMat.opacity = 0.5 * k;
    } else this.zone.visible = false;

    // ---------- bubble visual ----------
    if (p) {
      const on = (p.shield | 0) > 0 || !!p.bubbled;
      if (this.bubblePop > 0) this.bubblePop = Math.max(0, this.bubblePop - dt);
      const vis = on || this.bubblePop > 0;
      this.bubble.visible = vis;
      if (vis) {
        const size = p.size ?? 1;
        const pop = this.bubblePop > 0 ? 1 + (0.3 - this.bubblePop) * 3 : 1 + Math.sin(time * 3) * 0.03;
        this.bubble.position.set(p.x, 0.55 * size + (p.y || 0), p.z);
        this.bubble.scale.setScalar(size * pop * (p.bubbled ? 1.25 : 1));
        this.bubbleMat.uniforms.uAlpha.value = on ? 1 : this.bubblePop / 0.3;
        this.bubbleMat.uniforms.uTime.value = time;
      }
    }
    this.shadows.end();
  }

  clear() {
    for (const s of this.trail) s.alive = false;
    for (const f of this.friends) { f.alive = false; f.e = null; }
    this.reactQ.length = 0;
    this.trailMesh.count = 0;
    this.satCrowd.count = 0; this.friendCrowd.count = 0;
  }

  dispose() {
    this.clear();
    this.G.scene?.remove(this.group);
    this.shadows.mesh.material.map?.dispose();       // BlobShadows makes its own canvas texture
    this.group.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
        if (o.material) o.material.dispose();
        o.dispose?.();
      }
    });
  }
}
