// ─────────────────────────────────────────────────────────────
// CUBE DASH — meta progression & economy  (G.meta)
//
// One data-driven spine (NetEase/Tencent live-ops style, but ethical):
//
//   STAT BUS      counters in scopes run · day · week · lifetime (+ per hero),
//                 fed by bus events during a run and reconciled with the
//                 authoritative run results in applyRun().
//   GOAL ENGINE   missions, achievement tiers, Cube-dex milestones, Galaxy Road
//                 nodes, world crown chests and rank tiers are all goal tables
//                 from data.js evaluated over those counters.
//   REWARD PIPE   grant(rewards, source) is THE single entry point. It credits
//                 the profile immediately (nothing can ever be lost) and pushes
//                 a claim record into `claimQueue` for ui.js to show as a 领取
//                 popup between runs.
//
// Claim-queue contract for ui.js
//   meta.claimQueue            array of {uid, source, items[], title}   (read-only)
//   meta.onClaim(fn) → unsub   fn(claim) whenever a claim is queued
//   meta.nextClaim()           shift the head (→ "showing"); null when empty
//   meta.ackClaim()            the popup's 领取 finished (counter fly-in done)
//   meta.claim(uid)            same, by uid — ui.js builds popups from meta:reward {id} and calls this
//   meta.displayCoins / displayTickets   balances minus anything still queued /
//                              showing — animate the top-bar counter from these
//   items: {kind:'coins'|'tickets'|'hero'|'skin'|'hat'|'trail'|'card'|'title',
//           id?, amount?, icon, name, rarity, color?, dup?, convert?}
//   Popups must never appear mid-run: ui checks `!G.run || G.run.state==='ended'`.
//
// Other events emitted: meta:reward {coins, gems:0, tickets, items, source} ·
//   meta:rankup {rank, before, tierUp, placement (first rank reveal → full ceremony)} ·
//   meta:unlock {kind: hero|skin|hat|trail|card|world|mode, id, source?} (world: id = world index) ·
//   meta:feature {id} (once, when a hidden system unlocks — also in featureQueue) ·
//   meta:claim {count} · meta:change {} (anything the lobby shows changed).
//
// Crowns 👑: internal fields are called `stars` (contract), every UI shows 👑.
// Daily refresh at 04:00 local with a silent clock-rollback guard.
//
// Public API (ARCHITECTURE §6 + extras). Claim-style calls return the claim record, or false.
//   balances   coins · tickets · trophies · freed · rank · bestWave · displayCoins · displayTickets
//   run        applyRun(results) → breakdown · lastBreakdown · stat(name, scope, heroId)
//   rewards    grant(rewards, source, opts) · claimQueue · nextClaim() · ackClaim() · claim(uid) · onClaim(fn) · describe(item)
//   stages     isStageUnlocked(w,s) · isStageCleared · stageStars (count) · stageCrowns ([clear, fewHits, challenge])
//              stageInfo · stageFails · nextStage() · worldInfo(w) · worldCrowns(w) · totalCrowns() · worldChests(w)
//              claimWorldChest(w,i) · hubWorld() (world index) · modeUnlocked(m) · dailyMutator() · dailyDone
//   heroes     heroUnlocked(id) · heroes() · selectedHero · selectHero(id)
//   cosmetics  owns(kind,id) · ownedSkins(hero) · ownedHats() · ownedTrails() · selectedSkin/Hat(hero) · selectedTrail()
//              equip(kind,id,hero) · buy(kind,id) · price(kind,id) · wardrobe(hero)
//   cards      unlockedCards() · cardInfo()
//   road       road() · roadNext() · claimRoad(i|'overflow') · claimAllRoad()
//   missions   missions() · claimMission(i) · claimAllMissions() · rerollMission(i) · rerollsLeft · claimDailyChest()
//   sign-in    signin() · claimSignin()
//   capsule    capsuleInfo() · capsule('ticket')        (coins → {ok:false, error:'ticketsOnly'})
//   dex        dex() · claimDex(id, n?) · claimAllDex()
//   achieve    achievements() · claimAchievement(id) · claimAllAchievements() · titleName(id) · titles() · setTitle(id)
//   profile    profile() · nameChoices(n) · setName(choice|text) · setPins(ids) · setProfile({name,title,pins}) · playDays
//   features   isUnlocked(f) · featureQueue · nextFeature() · redDots() · isNew(kind,id) · markSeen(kind,id)
//   guardian   tick(rdt) · pendingBreak · pendingToast · limitReached · isNight · restedRuns · firstWinAvailable
//              guardianPrompt() · resolveGuardian(kind, choice) · healthCheck() · takeBreak() · snoozeBreak()
//              parent · setParent('limit'|'dailyLimit'|'capsule'|'capsuleOn'|'breakMinutes', v) · parentExtend(min) / extendLimit(min)
//              playHistory(days) · todayMinutes()
// ─────────────────────────────────────────────────────────────
import { makeRng, dayKey, daysBetween, clamp } from './core.js';
import { t, tl, addStrings, getLang } from './i18n.js';
import {
  HEROES, ENEMIES, WORLDS, CARDS, EVOLUTIONS, ECONOMY, ROAD, ROAD_OVERFLOW, MISSIONS, SIGNIN,
  RANKS, RANK_PAR, RANK_REWARD, ACHIEVEMENTS, ACH_REWARD, DEX, TITLES, SKINS, HATS, TRAILS,
  CAPSULE, HEALTH, RARITY, MODES, heroById, stageOf,
} from './data.js';
import { dailyMutator as wavesDailyMutator } from './waves.js';

// ---------- module tuning (not design data) ----------
const TUNE = {
  dayStartHour: 4,            // daily refresh at 04:00 local
  clockGuardMs: 3600e3,       // clock moved back > 1 h → freeze daily refreshes
  dupHeroTickets: 3,          // duplicate hero → 3 tickets
  dupCardCoins: 50,           // duplicate card unlock (shouldn't happen) → coins
  claimQueueMax: 30,          // pull-queue cap (rewards are credited on grant; the queue is presentation only)
  rushPerBoss: 25,            // Boss Rush coins per boss beaten
  dailyRepeatCoins: 30,       // a 2nd+ Daily Challenge clear on the same day
  highTier: 5,                // tier-up from this tier index on grants tierUpHigh (Crystal+)
  missionBuckets: [2, 5],     // rank tier ≤ 2 → low targets · ≤ 5 → mid · else high
  missionsPerDay: 3,
  dailyChestAfter: 3,         // mission claims in a day that open the Daily Chest
  stampEvery: 15,             // s between lastSeen stamps
  historyDays: 14,
  restedAwayMin: ECONOMY.rested.awayMinutes,
};

const SLOTS = ['easy', 'skill', 'variety'];
const MAX_STATS = new Set(['bestComboRun', 'bestNovaRun', 'endlessWave', 'bestCombo', 'bestNova', 'endlessBest']);
const FEATURE_ORDER = ['map', 'signin', 'missions', 'road', 'heroes', 'dex', 'wardrobe', 'capsule', 'modes', 'achievements'];
// unlocked silently (no 新功能开启! card): sign-in simply appears with its own daily popup
const QUIET_FEATURES = new Set(['signin']);
// mission copy that §7 overrides (crowns not stars · 大招 not 新星)
const MISSION_VIEW = { star3: { key: 'meta.mis.star3', icon: '👑' }, novaMulti: { key: 'meta.mis.novaMulti', icon: '✦' } };
const DEFAULT_OWNED = {
  skin: SKINS.filter((s) => s.default).map((s) => s.id),
  hat: HATS.filter((h) => h.default).map((h) => h.id),
  trail: TRAILS.filter((x) => x.default).map((x) => x.id),
};
const COSMETIC = { skin: SKINS, hat: HATS, trail: TRAILS };
const STARTER_CARDS = CARDS.filter((c) => c.starter).map((c) => c.id);
const CURRENCY_ICON = { coins: '🪙', tickets: '🎟️' };

// ---------- persisted defaults (save.profile.meta) ----------
const DEFAULTS = {
  meta: {
    v: 1,
    coins: 0, tickets: 0, trophies: 0,
    life: {},                               // lifetime counters (stat → n)
    day: { key: '', c: {}, play: 0 },       // today's counters + active play seconds
    week: { key: '', c: {} },
    hero: {},                               // heroId → {runs, wins, freed}
    heroes: ['blu'], selHero: 'blu',
    stages: {},                             // '1-1' → {c:[0,0,0], cl:0, best:0, plays:0, fails:0}
    modes: { endlessBest: 0, endlessScore: 0, stormBest: 0, stormMedals: 0, rushBest: 0, dailyDay: '' },
    owned: { skin: [...DEFAULT_OWNED.skin], hat: [...DEFAULT_OWNED.hat], trail: [...DEFAULT_OWNED.trail] },
    equip: { skin: {}, hat: {}, trail: 'default' },
    fresh: [],                              // 'skin:blu_mint' · 'hero:zap' — NEW, unseen
    cards: [], cardsSeen: [],
    missions: { day: '', list: [], rerolls: 1, chestDay: '', uid: 0 },
    signin: { count: 0, last: '' },
    road: { claimed: [], overflow: 0 },
    capsule: { sinceEpic: 0, sinceLegend: 0, day: '', today: 0, free: ECONOMY.capsule.freeOnboarding, pulls: 0 },
    dex: { count: {}, claimed: {}, seen: [] },
    ach: {},                                // id → tiers claimed (0..3)
    chests: {},                             // world index → [0,0,0] claimed
    titles: [], title: '', name: null, pins: [],
    rankStep: 0,
    features: [],                           // announced features
    firstWinDay: '',
    rested: 0,                              // runs left with the rested bonus
    guard: { session: 0, nextBreak: HEALTH.breakCardMinutes, toast: 0, nightDay: '', lastSeen: 0, lastActive: 0, hist: {}, breakPending: 0 },
    parent: { limit: 0, capsule: true, extraDay: '', extra: 0, breakMinutes: null },
    clock: { max: 0 },
    lastDay: '',
    uid: 0,
  },
};

// ---------- strings ----------
addStrings({
  zh: {
    'meta.src.default': '初始', 'meta.src.shop': '商店', 'meta.src.capsule': '扭蛋',
    'meta.src.road': '银河之路 {n}', 'meta.src.signin': '签到第{n}天', 'meta.src.chest': '第{n}世界宝箱',
    'meta.src.boss': '打败第{n}世界大王', 'meta.src.start': '初始英雄',
    'meta.cb.clear': '通关奖励', 'meta.cb.firstClear': '首次通关', 'meta.cb.crowns': '新皇冠 ×{n}', 'meta.cb.boss': '打败大王',
    'meta.cb.fail': '努力奖', 'meta.cb.endless': '生存 {n} 波', 'meta.cb.medal': '新奖牌', 'meta.cb.daily': '每日挑战',
    'meta.cb.rush': '首领连战', 'meta.cb.pickups': '捡到金币', 'meta.cb.firstWin': '今日首胜', 'meta.cb.rested': '休息奖励',
    'meta.mis.star3': '把一关集齐3顶皇冠', 'meta.mis.novaMulti': '一次大招解救 {n} 个',
    'meta.claim.title': '恭喜获得', 'meta.claim.welcome': '欢迎回来!', 'meta.claim.rank': '段位提升!', 'meta.claim.placement': '段位定级!',
    'meta.claim.signin': '签到奖励', 'meta.claim.missions': '任务奖励', 'meta.claim.chest': '每日宝箱', 'meta.claim.road': '银河之路',
    'meta.claim.dex': '图鉴奖励', 'meta.claim.ach': '成就达成!', 'meta.claim.worldChest': '皇冠宝箱',
    'meta.dup': '已拥有 → 换成奖励', 'meta.tickets': '扭蛋券',
    'meta.guard.toast': '已经玩了30分钟啦，眨眨眼休息一下吧',
    'meta.guard.break': '休息一下吧!', 'meta.guard.breakSub': '看看远处，数到20',
    'meta.guard.rest': '休息一下', 'meta.guard.more': '再玩一会',
    'meta.guard.night': '夜深啦，明天再来冒险吧',
    'meta.guard.limit': '今天的冒险完成啦!',
    'meta.feature.map': '星图', 'meta.feature.signin': '签到', 'meta.feature.missions': '每日任务', 'meta.feature.road': '银河之路',
    'meta.feature.heroes': '英雄', 'meta.feature.dex': '方块图鉴', 'meta.feature.wardrobe': '衣橱', 'meta.feature.capsule': '扭蛋机',
    'meta.feature.modes': '模式与段位', 'meta.feature.achievements': '成就',
    'meta.hint.map': '选一颗星球，去冒险!', 'meta.hint.signin': '每天来点一下，就有礼物!', 'meta.hint.missions': '每天3个小任务，做完领金币!',
    'meta.hint.road': '解救越多方块，走得越远，奖励越多!', 'meta.hint.heroes': '看看还有哪些英雄等你解救!',
    'meta.hint.dex': '被你解救的方块都住在这里!', 'meta.hint.wardrobe': '给你的英雄换新衣服!',
    'meta.hint.capsule': '用扭蛋券扭出惊喜装扮! 先送你3次!', 'meta.hint.modes': '新模式来啦，看看你是什么段位!',
    'meta.hint.achievements': '完成挑战，赢取称号!',
  },
  en: {
    'meta.src.default': 'Starter', 'meta.src.shop': 'Shop', 'meta.src.capsule': 'Capsule',
    'meta.src.road': 'Galaxy Road {n}', 'meta.src.signin': 'Sign-in day {n}', 'meta.src.chest': 'World {n} chest',
    'meta.src.boss': 'Beat the World {n} boss', 'meta.src.start': 'Starter hero',
    'meta.cb.clear': 'Stage clear', 'meta.cb.firstClear': 'First clear', 'meta.cb.crowns': 'New crowns ×{n}', 'meta.cb.boss': 'Boss beaten',
    'meta.cb.fail': 'Nice try', 'meta.cb.endless': 'Survived {n} waves', 'meta.cb.medal': 'New medal', 'meta.cb.daily': 'Daily challenge',
    'meta.cb.rush': 'Boss Rush', 'meta.cb.pickups': 'Coins found', 'meta.cb.firstWin': 'First win', 'meta.cb.rested': 'Rested',
    'meta.mis.star3': 'Get all 3 crowns on a stage', 'meta.mis.novaMulti': 'Free {n} with one NOVA',
    'meta.claim.title': 'You got!', 'meta.claim.welcome': 'Welcome back!', 'meta.claim.rank': 'Rank up!', 'meta.claim.placement': 'Your rank!',
    'meta.claim.signin': 'Sign-in gift', 'meta.claim.missions': 'Mission rewards', 'meta.claim.chest': 'Daily chest', 'meta.claim.road': 'Galaxy Road',
    'meta.claim.dex': 'Dex reward', 'meta.claim.ach': 'Achievement!', 'meta.claim.worldChest': 'Crown chest',
    'meta.dup': 'Already owned → swapped', 'meta.tickets': 'Tickets',
    'meta.guard.toast': "30 minutes of play! Blink and rest your eyes a little.",
    'meta.guard.break': 'Break time!', 'meta.guard.breakSub': 'Look far away and count to 20',
    'meta.guard.rest': 'Take a break', 'meta.guard.more': 'Play a bit more',
    'meta.guard.night': "It's late — adventure again tomorrow!",
    'meta.guard.limit': "Today's adventure is done!",
    'meta.feature.map': 'Star Map', 'meta.feature.signin': 'Sign-in', 'meta.feature.missions': 'Missions', 'meta.feature.road': 'Galaxy Road',
    'meta.feature.heroes': 'Heroes', 'meta.feature.dex': 'Cube-dex', 'meta.feature.wardrobe': 'Wardrobe', 'meta.feature.capsule': 'Capsules',
    'meta.feature.modes': 'Modes & Rank', 'meta.feature.achievements': 'Achievements',
    'meta.hint.map': 'Pick a planet and go!', 'meta.hint.signin': 'Tap once a day for a gift!', 'meta.hint.missions': '3 little missions a day for coins!',
    'meta.hint.road': 'Free more cubes to travel the road and win prizes!', 'meta.hint.heroes': 'See which heroes are waiting to be rescued!',
    'meta.hint.dex': 'Every cube you free lives here!', 'meta.hint.wardrobe': 'Dress up your hero!',
    'meta.hint.capsule': 'Turn tickets into surprise outfits! 3 free spins!', 'meta.hint.modes': 'New modes — and your very own rank!',
    'meta.hint.achievements': 'Finish challenges to win titles!',
  },
});

// generated nicknames (pick-list: no free text needed)
const NAME_A = [
  { zh: '勇敢的', en: 'Brave' }, { zh: '闪亮的', en: 'Shiny' }, { zh: '快乐的', en: 'Happy' }, { zh: '超快的', en: 'Speedy' },
  { zh: '机灵的', en: 'Clever' }, { zh: '酷酷的', en: 'Cool' }, { zh: '银河', en: 'Galaxy' }, { zh: '彩虹', en: 'Rainbow' },
  { zh: '无敌的', en: 'Mighty' }, { zh: '星光', en: 'Starlit' }, { zh: '弹弹的', en: 'Bouncy' }, { zh: '云朵', en: 'Cloudy' },
];
const NAME_B = [
  { zh: '小蓝队长', en: 'Captain Blu' }, { zh: '冲刺王', en: 'Dash King' }, { zh: '方块侠', en: 'Cube Hero' }, { zh: '探险家', en: 'Explorer' },
  { zh: '救援员', en: 'Rescuer' }, { zh: '星星猎人', en: 'Star Hunter' }, { zh: '闪电手', en: 'Zapper' }, { zh: '小勇士', en: 'Champ' },
  { zh: '宇航员', en: 'Astronaut' }, { zh: '麻薯大王', en: 'Mochi Boss' },
];

// ---------- helpers ----------
const hashStr = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const worldIndex = (w) => {
  if (typeof w === 'number' && Number.isFinite(w)) return w;
  const i = WORLDS.findIndex((x) => x.id === w);
  if (i >= 0) return i;
  const n = Number(w); return Number.isFinite(n) ? n : 0;
};
const stageIndex = (s) => {
  if (typeof s === 'number' && Number.isFinite(s)) return s;
  if (typeof s === 'string' && s.includes('-')) return (Number(s.split('-')[1]) || 1) - 1;
  const n = Number(s); return Number.isFinite(n) ? n : 0;
};
const sumVals = (o) => { let n = 0; if (o) for (const k in o) n += +o[k] || 0; return n; };
function isoWeekKey(key) {
  const d = new Date(key + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;             // Monday = 0
  d.setDate(d.getDate() - day + 3);             // Thursday of this week
  const y = d.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const wk = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
const minutesOf = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return (h || 0) * 60 + (m || 0); };

// ═════════════════════════════════════════════════════════════
export class Meta {
  constructor(G) {
    this.G = G;
    G.save.ensure(DEFAULTS);
    G.save.onReset?.(() => { G.save.ensure(DEFAULTS); this._afterLoad(true); });
    this.claimQueue = [];
    this.featureQueue = [];
    this._showing = null;
    this._claimFns = new Set();
    this._t = 0; this._clockT = 0; this._stampT = 0;
    this._all = !!(G.params?.has?.('unlockall'));
    this.live = this._freshLive();
    this.lastBreakdown = null;
    this.pendingToast = null;
    this.pendingBreak = false;
    this._wire();
    this._afterLoad(false);
  }

  /** the live meta record (save.reset/import replace the profile object — never cache it) */
  get P() { return this.G.save.profile.meta; }
  _commit() { this.G.save.commit(); }
  _emit(name, payload) { this.G.bus?.emit(name, payload); }
  _changed() { this._emit('meta:change', {}); }

  _afterLoad(isReset) {
    const P = this.P;
    if (isReset) { this.claimQueue.length = 0; this.featureQueue.length = 0; this._showing = null; this.live = this._freshLive(); }
    if (!P.name) P.name = { a: (Math.random() * NAME_A.length) | 0, b: (Math.random() * NAME_B.length) | 0 };
    for (const k of Object.keys(DEFAULT_OWNED)) for (const id of DEFAULT_OWNED[k]) if (!P.owned[k].includes(id)) P.owned[k].push(id);
    if (!P.heroes.includes('blu')) P.heroes.unshift('blu');
    if (!P.heroes.includes(P.selHero)) P.selHero = P.heroes[0];
    const now = this._now();
    const today = this._dayKey(now);
    // features already unlocked by an older/imported save are known — mark them silently
    this._checkFeatures(true);
    // welcome-back gift (≥ 7 days away) — never mentions missed rewards. Granted on the next tick:
    // meta is constructed before ui.js, so an event fired now would reach no listener and the
    // 欢迎回来! popup would silently never show.
    if (!isReset && P.lastDay && daysBetween(P.lastDay, today) >= ECONOMY.welcomeBack.days) {
      P.lastDay = today;            // once per return, even if the tab closes before the timer fires
      setTimeout(() => this.grant([{ coins: ECONOMY.welcomeBack.coins, tickets: ECONOMY.welcomeBack.tickets }], 'welcome'), 0);
    }
    // rested bonus after ≥ 15 min away (only once the child has actually played)
    if (!isReset) this._checkAway(now);
    this._refreshDay();
    this._commit();
  }

  // ═══════════════ clock (04:00 refresh + rollback guard) ═══════════════
  _now() {
    const real = Date.now();
    const c = this.P.clock;
    if (real >= c.max) { c.max = real; return real; }
    if (c.max - real > TUNE.clockGuardMs) return c.max;   // frozen until real time catches up (silently)
    return real;
  }
  _dayKey(ms = this._now()) { return dayKey(new Date(ms - TUNE.dayStartHour * 3600e3)); }
  get today() { return this.P.day.key || this._dayKey(); }

  _refreshDay() {
    const P = this.P;
    const key = this._dayKey();
    if (!P.day.key) P.day.key = key;
    if (key > P.day.key) {
      const prevClaims = P.day.c.missionClaims || 0;
      const prevKey = P.day.key;
      // auto-grant anything completed but unclaimed — a child never loses what they earned
      this._missionsRollover(prevKey, prevClaims);
      P.day = { key, c: {}, play: 0 };
      P.capsule.today = 0; P.capsule.day = key;
    }
    const wk = isoWeekKey(P.day.key);
    if (P.week.key !== wk) P.week = { key: wk, c: {} };
    if (!P.lastDay || P.day.key > P.lastDay) P.lastDay = P.day.key;
    this._ensureMissions();
  }

  // ═══════════════ STAT BUS ═══════════════
  _freshLive() {
    return {
      active: false, heroId: null, mode: 'stage', worldId: 0, stageId: 0,
      smashes: 0, freed: 0, freedBy: {}, bonks: 0, perfects: 0, nearMisses: 0, novas: 0,
      crystals: 0, coins: 0, bestComboRun: 0, bestNovaRun: 0, evolutions: 0, bossKills: 0,
      _nova: 0,
    };
  }
  _wire() {
    const bus = this.G.bus;
    if (!bus) return;
    const L = () => this.live;
    bus.on('run:start', (p) => this._runStart(p || {}));
    bus.on('enemy:smash', (p) => {
      const l = L(); l.smashes++;
      if (p?.type) l.freedBy[p.type] = (l.freedBy[p.type] || 0) + 1;
      if (p?.byNova) { l._nova++; if (l._nova > l.bestNovaRun) l.bestNovaRun = l._nova; }
    });
    bus.on('enemy:freed', () => { L().freed++; });
    bus.on('enemy:bonk', () => { L().bonks++; });
    bus.on('player:perfect', () => { L().perfects++; });
    bus.on('player:nearMiss', () => { L().nearMisses++; });
    bus.on('nova', () => { const l = L(); l.novas++; l._nova = 0; });
    bus.on('pickup:crystal', () => { L().crystals++; });
    bus.on('pickup:coin', (p) => { L().coins += Math.max(0, +p?.amount || 1); });
    bus.on('combo', (p) => { const l = L(); if ((p?.count || 0) > l.bestComboRun) l.bestComboRun = p.count; });
    bus.on('boss:defeat', () => { L().bossKills++; });
    bus.on('card:chosen', (p) => {
      if (!p?.id) return;
      const P = this.P;
      if (!P.cardsSeen.includes(p.id)) P.cardsSeen.push(p.id);
      if (EVOLUTIONS.some((e) => e.id === p.id)) L().evolutions++;
    });
    // red dots for NEW items clear when their screen is opened (ui.js emits ui:open {screen})
    bus.on('ui:open', (p) => {
      const s = p?.screen;
      if (s === 'shop' || s === 'wardrobe') this.markSeen('wardrobe');
      else if (s === 'heroes') this.markSeen('heroes');
      else if (s === 'dex') this.markSeen('dex');
    });
    document.addEventListener?.('visibilitychange', () => {
      if (document.hidden) { this._stamp(); this.G.save.flush?.(); }
      else if (this._checkAway(this._now())) this._changed();
    });
  }
  _runStart(p) {
    if (this.live.active) this._commitPartial();   // restarted mid-run: keep the progress
    const now = this._now();
    this._checkAway(now);
    this.live = this._freshLive();
    Object.assign(this.live, { active: true, heroId: p.heroId || this.P.selHero, mode: p.mode || 'stage', worldId: p.worldId ?? 0, stageId: p.stageId ?? 0 });
    this._refreshDay();
  }

  /** read a counter. scope: 'run'|'day'|'week'|'life'; heroId → per-hero (runs/wins/freed) */
  stat(name, scope = 'life', heroId = null) {
    const P = this.P;
    if (heroId) return P.hero[heroId]?.[name] || 0;
    if (scope === 'run') return name === 'freed' ? (this.live.freed || sumVals(this.live.freedBy)) : (+this.live[name] || 0);
    if (name === 'totalStars') return this.totalCrowns();
    if (name === 'dexFound') return DEX.entries.filter((e) => (P.dex.count[e] || 0) > 0).length;
    if (name === 'cosmetics') return this._cosmeticCount();
    const src = scope === 'day' ? P.day.c : scope === 'week' ? P.week.c : P.life;
    return src[name] || 0;
  }
  _bump(name, v) {
    if (!v) return;
    const P = this.P;
    for (const sc of [P.life, P.day.c, P.week.c]) sc[name] = MAX_STATS.has(name) ? Math.max(sc[name] || 0, v) : (sc[name] || 0) + v;
  }

  /** commit one run's values into every scope + goals. Returns mission progress snapshots. */
  _commitVals(v) {
    const P = this.P, core = this.G.save.profile.stats || {};
    for (const k of Object.keys(v)) if (typeof v[k] === 'number') this._bump(k, v[k]);
    // per hero
    const h = (P.hero[v.heroId] ||= { runs: 0, wins: 0, freed: 0 });
    h.runs += v.runs || 0; h.wins += v.wins || 0; h.freed += v.freed || 0;
    // Cube-dex
    for (const type of Object.keys(v.freedBy || {})) {
      if (!DEX.entries.includes(type)) continue;
      P.dex.count[type] = (P.dex.count[type] || 0) + (v.freedBy[type] || 0);
    }
    // legacy core stats (save.js) kept in sync for ui screens that read them
    const add = (k, n) => { core[k] = (core[k] || 0) + (n || 0); };
    add('runs', v.runs); add('wins', v.wins); add('smashes', v.smashes); add('perfects', v.perfects); add('nearMisses', v.nearMisses);
    add('bonks', v.bonks); add('novas', v.novas); add('bossKills', v.bossKills); add('deaths', v.deaths); add('crystals', v.crystals); add('freed', v.freed);
    core.bestCombo = Math.max(core.bestCombo || 0, v.bestComboRun || 0);
    return this._missionProgress(v);
  }
  _commitPartial() {
    // quit / restart mid-run: stats, freed cubes (Galaxy Road, dex) and missions still count — no coins, no crowns
    const l = this.live;
    this.live = this._freshLive();
    if (!l.active) return;
    const freed = l.freed || sumVals(l.freedBy) || l.smashes;
    this._commitVals({
      heroId: l.heroId, freedBy: l.freedBy, freed, smashes: l.smashes, bonks: l.bonks, perfects: l.perfects,
      nearMisses: l.nearMisses, novas: l.novas, crystals: l.crystals, bestComboRun: l.bestComboRun, bestCombo: l.bestComboRun,
      bestNovaRun: l.bestNovaRun, bestNova: l.bestNovaRun, evolutions: l.evolutions, popperFreed: l.freedBy.popper || 0,
    });
    this._checkFeatures(false);
    this._commit();
    this._changed();
  }

  // ═══════════════ getters ═══════════════
  get coins() { return this.P.coins; }
  get tickets() { return this.P.tickets; }
  get trophies() { return this.P.trophies; }
  get freed() { return this.P.life.freed || 0; }
  get rank() { return this.rankOf(this.P.trophies); }
  get selectedHero() { return this.P.selHero; }
  get displayCoins() { return Math.max(0, this.P.coins - this._pending('coins')); }
  get displayTickets() { return Math.max(0, this.P.tickets - this._pending('tickets')); }
  _pending(kind) {
    let n = 0;
    const count = (c) => { for (const it of c.items) { if (it.kind === kind) n += it.amount || 0; if (it.convert?.kind === kind) n += it.convert.amount || 0; } };
    for (const c of this.claimQueue) count(c);
    if (this._showing) count(this._showing);
    return n;
  }

  // ═══════════════ REWARD PIPELINE ═══════════════
  /**
   * THE single reward entry point. Credits the profile now; queues a 领取 popup unless opts.popup === false.
   * rewards: data.js reward records ({coins, tickets, hat, skin, trail, card, hero, title, worldHat}) or items.
   * opts: {popup=true, world (for worldHat), titleId (for title:true), title (popup heading key)}
   */
  grant(rewards, source = 'misc', opts = {}) {
    const items = this._items(rewards, opts);
    if (!items.length) return null;
    const P = this.P;
    let coins = 0, tickets = 0;
    for (const it of items) {
      this._applyItem(it, source);
      if (it.kind === 'coins') coins += it.amount;
      if (it.kind === 'tickets') tickets += it.amount;
      if (it.convert?.kind === 'coins') coins += it.convert.amount;
      if (it.convert?.kind === 'tickets') tickets += it.convert.amount;
    }
    const claim = { uid: ++P.uid, source, items, title: opts.title || this._claimTitle(source) };
    // what the child actually received (duplicates shown as their conversion) — ready for a 领取 popup
    claim.rewards = items.map((it) => (it.dup && it.convert ? it.convert : it));
    const popup = opts.popup !== false;
    if (popup) this._queue(claim);
    // listeners that build popups from events: source 'silent' = no popup (shop, capsule reveal, rescue ceremony)
    this._emit('meta:reward', { coins, gems: 0, tickets, items, rewards: claim.rewards, source: popup ? source : 'silent', origin: source,
      popup, id: claim.uid, title: t(claim.title), applied: true });
    this._checkFeatures(false);
    this._commit();
    this._changed();
    return claim;
  }
  _queue(claim) {
    this.claimQueue.push(claim);
    if (this.claimQueue.length > TUNE.claimQueueMax) this.claimQueue.shift();   // everything is already credited
    this._emit('meta:claim', { count: this.claimQueue.length });
    for (const fn of this._claimFns) { try { fn(claim); } catch (e) { console.error('[meta] onClaim', e); } }
  }
  onClaim(fn) { this._claimFns.add(fn); return () => this._claimFns.delete(fn); }
  nextClaim() { this._showing = this.claimQueue.shift() || null; if (this._showing) this._changed(); return this._showing; }
  ackClaim() { if (this._showing) { this._showing = null; this._changed(); } }
  /** the 领取 popup for claim `uid` was confirmed (ui.js builds popups from meta:reward and calls this) */
  claim(uid) {
    if (this._showing?.uid === uid) { this._showing = null; this._changed(); return true; }
    const i = this.claimQueue.findIndex((c) => c.uid === uid);
    if (i < 0) return false;
    this.claimQueue.splice(i, 1);
    this._emit('meta:claim', { count: this.claimQueue.length });
    this._changed();
    return true;
  }
  peekClaim() { return this.claimQueue[0] || null; }
  _claimTitle(source) {
    const map = { welcome: 'meta.claim.welcome', rank: 'meta.claim.rank', placement: 'meta.claim.placement', signin: 'meta.claim.signin',
      missions: 'meta.claim.missions', chest: 'meta.claim.chest', road: 'meta.claim.road', dex: 'meta.claim.dex', ach: 'meta.claim.ach',
      worldChest: 'meta.claim.worldChest' };
    return map[source] || 'meta.claim.title';
  }

  /** normalise reward records → display items */
  _items(rewards, ctx = {}) {
    const out = [];
    let coins = 0, tickets = 0;
    for (const r of [].concat(rewards || [])) {
      if (!r || typeof r !== 'object') continue;
      if (r.kind) { if (r.kind === 'coins') coins += r.amount || 0; else if (r.kind === 'tickets') tickets += r.amount || 0; else out.push({ ...r }); continue; }
      for (const k of Object.keys(r)) {
        const v = r[k];
        if (k === 'coins') coins += +v || 0;
        else if (k === 'tickets') tickets += +v || 0;
        else if (k === 'hero' || k === 'skin' || k === 'hat' || k === 'trail' || k === 'card') out.push({ kind: k, id: v });
        else if (k === 'title') { const id = v === true ? ctx.titleId : v; if (id) out.push({ kind: 'title', id }); }
        else if (k === 'worldHat') { const h = HATS.find((x) => x.source === 'chest' && x.world === ctx.world); if (h) out.push({ kind: 'hat', id: h.id }); }
      }
    }
    if (tickets > 0) out.unshift({ kind: 'tickets', amount: Math.round(tickets) });
    if (coins > 0) out.unshift({ kind: 'coins', amount: Math.round(coins) });
    return out.map((it) => this.describe(it));
  }
  /** add display info (icon, name, rarity, color) to an item — ui can call this too */
  describe(it) {
    const d = { ...it };
    switch (it.kind) {
      case 'coins': case 'tickets': d.icon = CURRENCY_ICON[it.kind]; d.rarity = it.kind === 'tickets' ? 'rare' : 'common';
        d.name = t(it.kind === 'coins' ? 'common.coins' : 'meta.tickets'); break;
      case 'hero': { const h = heroById(it.id); d.icon = '🦸'; d.rarity = 'epic'; d.name = tl(h.name); d.color = '#' + h.color.toString(16).padStart(6, '0'); break; }
      case 'skin': case 'hat': case 'trail': {
        const rec = COSMETIC[it.kind].find((x) => x.id === it.id);
        d.icon = it.kind === 'skin' ? '🎨' : it.kind === 'hat' ? '🎩' : '✨'; d.rarity = rec?.rarity || 'common'; d.name = tl(rec?.name) || it.id;
        if (rec?.color != null) d.color = '#' + rec.color.toString(16).padStart(6, '0');
        if (rec?.colors) d.colors = rec.colors.map((c) => '#' + c.toString(16).padStart(6, '0'));
        if (rec?.hero) d.hero = rec.hero;
        break;
      }
      case 'card': { const c = CARDS.find((x) => x.id === it.id) || EVOLUTIONS.find((x) => x.id === it.id); d.icon = c?.icon || '🃏'; d.rarity = c?.rarity || 'epic'; d.name = tl(c?.name) || it.id; break; }
      case 'title': d.icon = '🏷️'; d.rarity = 'rare'; d.name = this.titleName(it.id); break;
      default: d.icon = d.icon || '🎁'; d.rarity = d.rarity || 'common';
    }
    d.rarityColor = RARITY[d.rarity]?.color;
    return d;
  }
  _applyItem(it, source) {
    const P = this.P;
    switch (it.kind) {
      case 'coins': P.coins += it.amount; break;
      case 'tickets': P.tickets += it.amount; break;
      case 'hero':
        if (P.heroes.includes(it.id)) { it.dup = true; it.convert = this.describe({ kind: 'tickets', amount: TUNE.dupHeroTickets }); P.tickets += TUNE.dupHeroTickets; }
        else { P.heroes.push(it.id); this._fresh('hero', it.id); this._emit('meta:unlock', { kind: 'hero', id: it.id, source }); }
        break;
      case 'skin': case 'hat': case 'trail': {
        const own = P.owned[it.kind];
        if (own.includes(it.id)) {
          const refund = ECONOMY.refund[it.rarity] || ECONOMY.refund.common;
          it.dup = true; it.convert = this.describe({ kind: 'coins', amount: refund }); P.coins += refund;
        } else { own.push(it.id); this._fresh(it.kind, it.id); this._emit('meta:unlock', { kind: it.kind, id: it.id, source }); }
        break;
      }
      case 'card':
        if (STARTER_CARDS.includes(it.id) || P.cards.includes(it.id)) { it.dup = true; it.convert = this.describe({ kind: 'coins', amount: TUNE.dupCardCoins }); P.coins += TUNE.dupCardCoins; }
        else { P.cards.push(it.id); this._emit('meta:unlock', { kind: 'card', id: it.id, source }); }
        break;
      case 'title':
        if (!P.titles.includes(it.id)) P.titles.push(it.id);
        if (!P.title) P.title = it.id;
        break;
      default: break;
    }
  }
  _fresh(kind, id) { const k = kind + ':' + id; if (!this.P.fresh.includes(k)) this.P.fresh.push(k); }
  isNew(kind, id) { return this.P.fresh.includes(kind + ':' + id); }
  /** clear NEW flags: markSeen('wardrobe'|'heroes'|'dex') or markSeen(kind, id) */
  markSeen(kind, id) {
    const P = this.P;
    const before = P.fresh.length + P.dex.seen.length;
    if (kind === 'wardrobe') P.fresh = P.fresh.filter((k) => !/^(skin|hat|trail):/.test(k));
    else if (kind === 'heroes') P.fresh = P.fresh.filter((k) => !k.startsWith('hero:'));
    else if (kind === 'dex') { for (const e of DEX.entries) if ((P.dex.count[e] || 0) > 0 && !P.dex.seen.includes(e)) P.dex.seen.push(e); }
    else if (kind === 'dexEntry') { if (!P.dex.seen.includes(id)) P.dex.seen.push(id); }
    else P.fresh = P.fresh.filter((k) => k !== kind + ':' + id);
    if (P.fresh.length + P.dex.seen.length !== before) { this._commit(); this._changed(); }
  }

  // ═══════════════ rank 段位 (never decreases) ═══════════════
  rankOf(trophies = 0) {
    const T = Math.max(0, trophies | 0);
    let tier = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) if (T >= RANKS[i].stars[0]) { tier = i; break; }
    const R = RANKS[tier];
    let stars, next, prev;
    if (R.legendEvery) {
      stars = 1 + Math.floor((T - R.stars[0]) / R.legendEvery);
      prev = R.stars[0] + (stars - 1) * R.legendEvery; next = prev + R.legendEvery;
    } else {
      stars = R.stars.filter((s) => T >= s).length;
      prev = R.stars[stars - 1];
      next = stars < R.stars.length ? R.stars[stars] : RANKS[tier + 1].stars[0];
    }
    const step = tier * 3 + (stars - 1);
    return {
      tier, stars, id: R.id, name: tl(R.name), nameRec: R.name, icon: R.icon, color: R.color, legend: !!R.legendEvery,
      trophies: T, prev, next, progress: clamp((T - prev) / Math.max(1, next - prev), 0, 1), step,
      label: R.legendEvery ? `${tl(R.name)} ★${stars}` : `${tl(R.name)} ${'★'.repeat(stars)}`,
    };
  }
  endlessPar(rank = this.rank) {
    const base = RANK_PAR[Math.min(rank.tier, RANK_PAR.length - 1)];
    return rank.legend ? base + Math.floor((rank.stars - 1) / 2) : base;
  }
  _checkRank(placement = false) {
    if (!this.isUnlocked('modes')) return null;
    const P = this.P;
    const after = this.rank;
    if (after.step <= P.rankStep && !placement) return null;
    const beforeStep = P.rankStep;
    if (after.step <= beforeStep) { if (placement) this._emit('meta:rankup', { rank: after, before: after, tierUp: false, placement: true }); return null; }
    let coins = 0, tickets = 0, tierUp = false;
    for (let s = beforeStep + 1; s <= after.step; s++) {
      coins += RANK_REWARD.starUp.coins || 0;
      if (s % 3 === 0 && s < 27) {            // first star of a new material tier
        tierUp = true;
        const tier = s / 3;
        tickets += (tier >= TUNE.highTier ? RANK_REWARD.tierUpHigh.tickets : RANK_REWARD.tierUp.tickets) || 0;
      }
    }
    const before = this._rankAtStep(beforeStep);
    P.rankStep = after.step;
    this._emit('meta:rankup', { rank: after, before, tierUp, placement });
    this.grant([{ coins, tickets }], placement ? 'placement' : 'rank');
    return { before, after, tierUp, placement };
  }
  _rankAtStep(step) {
    const tier = Math.min(Math.floor(step / 3), RANKS.length - 1);
    const R = RANKS[tier];
    const trophies = R.legendEvery ? R.stars[0] + (step - tier * 3) * R.legendEvery : R.stars[Math.min(2, step - tier * 3)];
    return this.rankOf(trophies);
  }

  // ═══════════════ stages · crowns 👑 · worlds ═══════════════
  _stageKey(w, s) { return `${w + 1}-${s + 1}`; }
  _srec(w, s, create = false) {
    const k = this._stageKey(w, s);
    let r = this.P.stages[k];
    if (!r && create) r = this.P.stages[k] = { c: [0, 0, 0], cl: 0, best: 0, plays: 0, fails: 0 };
    return r;
  }
  _cleared(w, s) { return !!this._srec(w, s)?.cl; }
  isStageUnlocked(worldId, stageId) {
    const w = worldIndex(worldId), s = stageIndex(stageId);
    const W = WORLDS[w];
    if (!W || !W.stages[s]) return false;
    if (this._all) return true;
    if (s > 0) return this._cleared(w, s - 1);
    if (w === 0) return true;
    return this._cleared(w - 1, WORLDS[w - 1].stages.length - 1);
  }
  isStageCleared(worldId, stageId) { return this._cleared(worldIndex(worldId), stageIndex(stageId)); }
  _crownCount(w, s) { const r = this._srec(w, s); return r ? r.c.reduce((a, b) => a + (b ? 1 : 0), 0) : 0; }
  /** crowns earned on a stage (0..3) — shown as 👑 in every UI. Crowns are independent (the challenge
   *  crown can come before the clear crown): use stageCrowns() for WHICH ones. */
  stageStars(worldId, stageId) { return this._crownCount(worldIndex(worldId), stageIndex(stageId)); }
  stageCrowns(worldId, stageId) { const r = this._srec(worldIndex(worldId), stageIndex(stageId)); return r ? r.c.map(Boolean) : [false, false, false]; }
  stageInfo(worldId, stageId) {
    const w = worldIndex(worldId), s = stageIndex(stageId);
    const def = stageOf(w, s);
    const r = this._srec(w, s);
    return {
      worldId: w, stageId: s, id: def?.id, def, unlocked: this.isStageUnlocked(w, s), cleared: !!r?.cl,
      crowns: r ? r.c.map(Boolean) : [false, false, false], stars: this._crownCount(w, s), best: r?.best || 0,
      plays: r?.plays || 0, fails: r?.fails || 0, objective: def?.objective, newEnemy: def?.newEnemy || null, boss: !!def?.boss,
    };
  }
  /** consecutive failed attempts on a stage (boss attempt slow-down, Helper offer) */
  stageFails(worldId, stageId) { return this._srec(worldIndex(worldId), stageIndex(stageId))?.fails || 0; }
  worldCrowns(worldId) { const w = worldIndex(worldId); return (WORLDS[w]?.stages || []).reduce((n, _, s) => n + this._crownCount(w, s), 0); }
  totalCrowns() { let n = 0; for (const k in this.P.stages) n += this.P.stages[k].c.reduce((a, b) => a + (b ? 1 : 0), 0); return n; }
  worldInfo(worldId) {
    const w = worldIndex(worldId), W = WORLDS[w];
    if (!W) return null;
    return {
      index: w, id: W.id, name: tl(W.name), unlocked: this.isStageUnlocked(w, 0),
      cleared: this._cleared(w, W.stages.length - 1), crowns: this.worldCrowns(w), maxCrowns: W.stages.length * 3,
      stages: W.stages.map((_, s) => this.stageInfo(w, s)), chests: this.worldChests(w),
    };
  }
  /** next stage for the big PLAY button: first unlocked, uncleared stage */
  nextStage() {
    let last = { worldId: 0, stageId: 0 };
    for (let w = 0; w < WORLDS.length; w++) for (let s = 0; s < WORLDS[w].stages.length; s++) {
      if (!this.isStageUnlocked(w, s)) return last;
      last = { worldId: w, stageId: s };
      if (!this._cleared(w, s)) return last;
    }
    return last;
  }
  /** world shown behind the menus (highest unlocked) → world INDEX: run cfg.worldId is numeric,
   *  world.load() accepts an index, and ui.js reads it as a number (Shrink Storm arena) */
  hubWorld() {
    let top = 0;
    for (let w = 0; w < WORLDS.length; w++) if (this.isStageUnlocked(w, 0)) top = w;
    return top;
  }
  /** today's Daily Challenge / Galaxy Survival mutator — the same pick as waves.js, so the Modes card and the run agree */
  dailyMutator() { try { return wavesDailyMutator(); } catch { return null; } }
  get dailyDone() { return this.P.modes.dailyDay === this.today; }
  modeUnlocked(mode) {
    if (!mode || mode === 'stage') return true;
    const M = MODES[mode];
    if (!M) return false;
    if (this._all) return true;
    const w = M.unlock?.world ?? 0;
    return this.isUnlocked('modes') && this._cleared(w, WORLDS[w].stages.length - 1);
  }

  // world crown chests (5 / 10 / 15 👑)
  worldChests(worldId) {
    const w = worldIndex(worldId);
    const got = this.worldCrowns(w);
    const cl = this.P.chests[w] || [0, 0, 0];
    return ECONOMY.worldChests.map((c, i) => {
      const reached = got >= c.stars, claimed = !!cl[i];
      const reward = c.reward.worldHat ? { hat: HATS.find((h) => h.source === 'chest' && h.world === w)?.id } : c.reward;
      return { index: i, stars: c.stars, have: got, reached, claimed, claimable: reached && !claimed, reward, items: this._items([c.reward], { world: w }) };
    });
  }
  claimWorldChest(worldId, i) {
    const w = worldIndex(worldId);
    const c = this.worldChests(w)[i];
    if (!c?.claimable) return false;
    (this.P.chests[w] ||= [0, 0, 0])[i] = 1;
    return this.grant([ECONOMY.worldChests[i].reward], 'worldChest', { world: w });
  }

  // ═══════════════ heroes ═══════════════
  heroUnlocked(id) { return this._all || this.P.heroes.includes(id); }
  selectHero(id) {
    if (!this.heroUnlocked(id) || !HEROES.some((h) => h.id === id)) return false;
    this.P.selHero = id; this.markSeen('hero', id); this._commit(); this._changed();
    return true;
  }
  /** roster for the Heroes screen: every hero with owned state and how to get it */
  heroes() {
    return HEROES.map((h) => ({
      id: h.id, def: h, name: tl(h.name), owned: this.heroUnlocked(h.id), selected: this.P.selHero === h.id,
      isNew: this.isNew('hero', h.id), runs: this.P.hero[h.id]?.runs || 0, freed: this.P.hero[h.id]?.freed || 0,
      how: (h.unlock || []).map((u) => this._heroHow(h.id, u)),
    }));
  }
  _heroHow(id, u) {
    if (u.type === 'start') return { type: 'start', label: t('meta.src.start') };
    if (u.type === 'boss') return { type: 'boss', world: u.world, label: t('meta.src.boss', { n: u.world + 1 }), done: this._cleared(u.world, WORLDS[u.world].stages.length - 1) };
    if (u.type === 'signin') return { type: 'signin', day: u.day, label: t('meta.src.signin', { n: u.day }), done: this.P.signin.count >= u.day };
    if (u.type === 'road') { const node = ROAD.find((r) => r.reward.hero === id); return { type: 'road', at: node?.at, label: t('meta.src.road', { n: node?.at ?? '?' }), done: this.freed >= (node?.at ?? Infinity) }; }
    return { type: u.type, label: '' };
  }

  // ═══════════════ cosmetics ═══════════════
  owns(kind, id) { return !!this.P.owned[kind]?.includes(id); }
  ownedSkins(heroId) { return this.P.owned.skin.filter((id) => !heroId || SKINS.find((s) => s.id === id)?.hero === heroId); }
  ownedHats() { return [...this.P.owned.hat]; }
  ownedTrails() { return [...this.P.owned.trail]; }
  selectedSkin(heroId = this.P.selHero) {
    const id = this.P.equip.skin[heroId];
    return id && this.owns('skin', id) ? id : `${heroId}_default`;
  }
  selectedHat(heroId = this.P.selHero) { const id = this.P.equip.hat[heroId]; return id && this.owns('hat', id) ? id : 'none'; }
  selectedTrail() { const id = this.P.equip.trail; return id && this.owns('trail', id) ? id : 'default'; }
  equip(kind, id, heroId = this.P.selHero) {
    const P = this.P;
    if (!this.owns(kind, id)) return false;
    if (kind === 'skin') {
      const rec = SKINS.find((s) => s.id === id);
      if (!rec) return false;
      P.equip.skin[rec.hero] = id;
    } else if (kind === 'hat') P.equip.hat[heroId] = id;
    else if (kind === 'trail') P.equip.trail = id;
    else return false;
    this.markSeen(kind, id);
    this._commit(); this._changed();
    return true;
  }
  price(kind, id) { const rec = COSMETIC[kind]?.find((x) => x.id === id); return rec?.shop ? ECONOMY.prices[rec.rarity] : null; }
  /** direct purchase with coins at fixed prices (no timers, no discounts) → {ok, error?, item?} */
  buy(kind, id) {
    const rec = COSMETIC[kind]?.find((x) => x.id === id);
    if (!rec || !rec.shop) return { ok: false, error: 'notForSale' };
    if (this.owns(kind, id)) return { ok: false, error: 'owned' };
    const cost = ECONOMY.prices[rec.rarity];
    if (this.P.coins < cost) return { ok: false, error: 'coins', need: cost - this.P.coins };
    this.P.coins -= cost;
    const claim = this.grant([{ [kind]: id }], 'shop', { popup: false });
    return { ok: true, cost, item: claim?.items[0] };
  }
  _cosmeticCount() {
    const P = this.P;
    return ['skin', 'hat', 'trail'].reduce((n, k) => n + P.owned[k].filter((id) => !DEFAULT_OWNED[k].includes(id)).length, 0);
  }
  /** full wardrobe catalogue: every item listed with owned/equipped/price/sources */
  wardrobe(heroId = this.P.selHero) {
    const mk = (kind, rec) => ({
      kind, id: rec.id, name: tl(rec.name), rarity: rec.rarity, rarityColor: RARITY[rec.rarity]?.color,
      color: rec.color != null ? '#' + rec.color.toString(16).padStart(6, '0') : null,
      colors: rec.colors ? rec.colors.map((c) => '#' + c.toString(16).padStart(6, '0')) : null, pattern: rec.pattern || null,
      hero: rec.hero || null, owned: this.owns(kind, rec.id),
      equipped: kind === 'skin' ? this.selectedSkin(rec.hero) === rec.id : kind === 'hat' ? this.selectedHat(heroId) === rec.id : this.selectedTrail() === rec.id,
      price: rec.shop ? ECONOMY.prices[rec.rarity] : null, buyable: !!rec.shop && !this.owns(kind, rec.id),
      isNew: this.isNew(kind, rec.id), sources: this._sources(kind, rec),
    });
    return {
      skins: SKINS.filter((s) => !heroId || s.hero === heroId).map((s) => mk('skin', s)),
      hats: HATS.map((h) => mk('hat', h)),
      trails: TRAILS.map((x) => mk('trail', x)),
    };
  }
  _sources(kind, rec) {
    const out = [];
    if (rec.default) out.push({ type: 'default', label: t('meta.src.default') });
    ROAD.forEach((n) => { if (n.reward[kind] === rec.id) out.push({ type: 'road', at: n.at, label: t('meta.src.road', { n: n.at }) }); });
    SIGNIN.novice.forEach((r, i) => { if (r[kind] === rec.id) out.push({ type: 'signin', day: i + 1, label: t('meta.src.signin', { n: i + 1 }) }); });
    if (rec.source === 'chest') out.push({ type: 'chest', world: rec.world, label: t('meta.src.chest', { n: rec.world + 1 }) });
    if (rec.shop) { out.push({ type: 'shop', price: ECONOMY.prices[rec.rarity], label: t('meta.src.shop') }); out.push({ type: 'capsule', label: t('meta.src.capsule') }); }
    return out;
  }

  // ═══════════════ cards ═══════════════
  unlockedCards() {
    if (this._all) return CARDS.map((c) => c.id);
    const set = new Set(STARTER_CARDS);
    for (const id of this.P.cards) set.add(id);
    return CARDS.filter((c) => set.has(c.id)).map((c) => c.id);
  }
  cardInfo() {
    const un = new Set(this.unlockedCards());
    return {
      cards: CARDS.map((c) => ({ id: c.id, def: c, unlocked: un.has(c.id), seen: this.P.cardsSeen.includes(c.id),
        road: ROAD.find((n) => n.reward.card === c.id)?.at ?? null })),
      evolutions: EVOLUTIONS.map((e) => ({ id: e.id, def: e, seen: this.P.cardsSeen.includes(e.id) })),
    };
  }

  // ═══════════════ Galaxy Road 银河之路 (freed-count track) ═══════════════
  road() {
    const P = this.P, freed = this.freed;
    const nodes = ROAD.map((n, i) => {
      const reached = freed >= n.at, claimed = P.road.claimed.includes(i);
      return { index: i, at: n.at, reached, claimed, claimable: reached && !claimed, reward: n.reward, items: this._items([n.reward], { titleId: n.reward.title }) };
    });
    const last = ROAD[ROAD.length - 1].at;
    const earned = freed > last ? Math.floor((freed - last) / ROAD_OVERFLOW.every) : 0;
    const nextI = nodes.findIndex((n) => !n.reached);
    nodes.freed = freed;
    nodes.current = nextI < 0 ? nodes.length - 1 : Math.max(0, nextI - 1);
    nodes.next = nextI;   // -1 when the road is complete
    nodes.claimable = nodes.filter((n) => n.claimable).length + Math.max(0, earned - P.road.overflow);
    nodes.overflow = {
      every: ROAD_OVERFLOW.every, earned, claimed: P.road.overflow, claimable: Math.max(0, earned - P.road.overflow),
      nextAt: last + (earned + 1) * ROAD_OVERFLOW.every,
      items: this._items([ROAD_OVERFLOW.rewards[P.road.overflow % ROAD_OVERFLOW.rewards.length]]),
    };
    return nodes;
  }
  /** next unreached node summary (results cascade: "还差 12 → 🎁") */
  roadNext() {
    const freed = this.freed;
    const i = ROAD.findIndex((n) => freed < n.at);
    if (i < 0) {
      const o = this.road().overflow;
      const prev = o.nextAt - ROAD_OVERFLOW.every;
      return { index: 'overflow', at: o.nextAt, prevAt: prev, remaining: o.nextAt - freed, progress: clamp((freed - prev) / ROAD_OVERFLOW.every, 0, 1),
        reward: ROAD_OVERFLOW.rewards[this.P.road.overflow % ROAD_OVERFLOW.rewards.length], items: o.items };
    }
    const prev = i > 0 ? ROAD[i - 1].at : 0;
    return { index: i, at: ROAD[i].at, prevAt: prev, remaining: ROAD[i].at - freed, progress: clamp((freed - prev) / (ROAD[i].at - prev), 0, 1),
      reward: ROAD[i].reward, items: this._items([ROAD[i].reward], { titleId: ROAD[i].reward.title }) };
  }
  claimRoad(index) {
    const P = this.P;
    if (index === 'overflow' || index === ROAD.length) {
      const o = this.road().overflow;
      if (o.claimable <= 0) return false;
      const r = ROAD_OVERFLOW.rewards[P.road.overflow % ROAD_OVERFLOW.rewards.length];
      P.road.overflow++;
      return this.grant([r], 'road');
    }
    const n = ROAD[index];
    if (!n || this.freed < n.at || P.road.claimed.includes(index)) return false;
    P.road.claimed.push(index);
    return this.grant([n.reward], 'road', { titleId: n.reward.title });
  }
  /** overflow chests have no node on the road screen, so they arrive as a 领取 popup after the run */
  _grantOverflow() {
    const P = this.P, rewards = [];
    let o = this.road().overflow.claimable;
    while (o-- > 0) { rewards.push(ROAD_OVERFLOW.rewards[P.road.overflow % ROAD_OVERFLOW.rewards.length]); P.road.overflow++; }
    return rewards.length ? this.grant(rewards, 'road') : null;
  }
  claimAllRoad() {
    const P = this.P, rewards = [];
    ROAD.forEach((n, i) => { if (this.freed >= n.at && !P.road.claimed.includes(i)) { P.road.claimed.push(i); rewards.push(n.reward); } });
    let o = this.road().overflow.claimable;
    while (o-- > 0) { rewards.push(ROAD_OVERFLOW.rewards[P.road.overflow % ROAD_OVERFLOW.rewards.length]); P.road.overflow++; }
    return rewards.length ? this.grant(rewards, 'road', { titleId: 'roadLegend' }) : false;
  }

  // ═══════════════ daily missions 每日任务 ═══════════════
  _bucket() { const tier = this.rank.tier; return tier <= TUNE.missionBuckets[0] ? 0 : tier <= TUNE.missionBuckets[1] ? 1 : 2; }
  _missionOk(tpl, list) {
    if (tpl.needs === 'endless' && !this.modeUnlocked('endless')) return false;
    if (tpl.id === 'boss' && !this.isStageUnlocked(0, WORLDS[0].stages.length - 1)) return false;
    if (tpl.id === 'star3') {
      let any = false;
      for (let w = 0; w < WORLDS.length && !any; w++) for (let s = 0; s < WORLDS[w].stages.length; s++) if (this.isStageUnlocked(w, s) && this._crownCount(w, s) < 3) { any = true; break; }
      if (!any) return false;
    }
    return !list.some((m) => m.id === tpl.id && !m.done);
  }
  _makeMission(tpl, rng) {
    const P = this.P;
    const m = { uid: ++P.missions.uid, id: tpl.id, slot: tpl.slot, n: tpl.n[this._bucket()], prog: 0, done: 0, claimed: 0, day: this.today };
    if (tpl.hero) {
      const owned = HEROES.filter((h) => this.heroUnlocked(h.id));
      owned.sort((a, b) => (P.hero[a.id]?.runs || 0) - (P.hero[b.id]?.runs || 0) || rng() - 0.5);
      m.hero = (owned[0] || HEROES[0]).id;
    }
    return m;
  }
  _pickTemplate(slot, rng, list, exclude = null) {
    const pool = MISSIONS.filter((x) => x.slot === slot && x.id !== exclude && this._missionOk(x, list));
    const any = pool.length ? pool : MISSIONS.filter((x) => x.slot === slot && x.id !== exclude && (x.needs !== 'endless' || this.modeUnlocked('endless')));
    return any.length ? rng.pick(any) : null;
  }
  _ensureMissions() {
    const P = this.P, M = P.missions;
    if (!this.isUnlocked('missions') || M.day === P.day.key) return;
    const rng = makeRng(hashStr('missions:' + P.day.key));
    for (const slot of SLOTS) {
      const tpl = this._pickTemplate(slot, rng, M.list);
      if (tpl) M.list.push(this._makeMission(tpl, rng));
    }
    // bank ≤ 9: drop the oldest unfinished ones
    while (M.list.length > ECONOMY.missionBank) {
      const i = M.list.findIndex((m) => !m.done && !m.claimed);
      M.list.splice(i >= 0 ? i : 0, 1);
    }
    M.day = P.day.key; M.rerolls = 1;
    this._commit();
  }
  _missionsRollover(prevKey, prevClaims) {
    const P = this.P, M = P.missions;
    const rewards = [];
    for (const m of M.list) if (m.done && !m.claimed) { m.claimed = 1; rewards.push(this._missionReward(m)); }
    const chestUnclaimed = prevClaims + rewards.length >= TUNE.dailyChestAfter && M.chestDay !== prevKey;
    if (chestUnclaimed) { rewards.push(ECONOMY.dailyChest); M.chestDay = prevKey; }
    M.list = M.list.filter((m) => !m.claimed);
    if (rewards.length) this.grant(rewards, 'missions');
  }
  _missionReward(m) { return ECONOMY.missionReward[m.slot] || { coins: 60 }; }
  _missionView(m, i) {
    const tpl = MISSIONS.find((x) => x.id === m.id) || MISSIONS[0];
    const heroName = m.hero ? tl(heroById(m.hero).name) : '';
    // Kid-UX §7.16/§7.17: ratings are 👑 crowns (⭐ means dizzy) and Nova is 大招 in Chinese
    const over = MISSION_VIEW[m.id];
    const text = over ? t(over.key) : tl(tpl.text);
    return {
      i, uid: m.uid, id: m.id, slot: m.slot, icon: over?.icon || tpl.icon, hero: m.hero || null,
      text: text.split('{n}').join(String(m.n)).split('{hero}').join(heroName),
      target: m.n, prog: Math.min(m.prog, m.n), cur: Math.min(m.prog, m.n), done: !!m.done, claimed: !!m.claimed, claimable: !!m.done && !m.claimed,
      today: m.day === this.today, reward: this._missionReward(m), items: this._items([this._missionReward(m)]),
    };
  }
  /** mission list (array) + .rerolls .chest {progress, target, claimable, claimed} .refresh ('tomorrow') */
  missions() {
    this._refreshDay();
    const P = this.P, M = P.missions;
    const list = M.list.map((m, i) => this._missionView(m, i));
    const claims = P.day.c.missionClaims || 0;
    list.rerolls = M.rerolls;
    list.chest = {
      progress: Math.min(claims, TUNE.dailyChestAfter), target: TUNE.dailyChestAfter, need: TUNE.dailyChestAfter, reward: ECONOMY.dailyChest,
      claimed: M.chestDay === P.day.key, claimable: claims >= TUNE.dailyChestAfter && M.chestDay !== P.day.key,
      items: this._items([ECONOMY.dailyChest]),
    };
    list.unlocked = this.isUnlocked('missions');
    return list;
  }
  claimMission(i) {
    const m = this.P.missions.list[i];
    if (!m || !m.done || m.claimed) return false;
    m.claimed = 1;
    this._bump('missionClaims', 1);
    return this.grant([this._missionReward(m)], 'missions');
  }
  claimAllMissions() {
    const rewards = [];
    for (const m of this.P.missions.list) if (m.done && !m.claimed) { m.claimed = 1; this._bump('missionClaims', 1); rewards.push(this._missionReward(m)); }
    const chest = this.missions().chest;
    if (chest.claimable) { this.P.missions.chestDay = this.P.day.key; rewards.push(ECONOMY.dailyChest); }
    return rewards.length ? this.grant(rewards, 'missions') : false;
  }
  claimDailyChest() {
    const chest = this.missions().chest;
    if (!chest.claimable) return false;
    this.P.missions.chestDay = this.P.day.key;
    return this.grant([ECONOMY.dailyChest], 'chest');
  }
  /** 1 free reroll per day: swap an unfinished mission for a different one of the same slot */
  rerollMission(i) {
    const M = this.P.missions, m = M.list[i];
    if (!m || m.done || m.claimed || M.rerolls <= 0) return false;
    const rng = makeRng(hashStr('reroll:' + this.today + ':' + m.uid));
    const tpl = this._pickTemplate(m.slot, rng, M.list.filter((x) => x !== m), m.id);
    if (!tpl) return false;
    M.list[i] = this._makeMission(tpl, rng);
    M.rerolls--;
    this._commit(); this._changed();
    return this._missionView(M.list[i], i);
  }
  /** apply one run's values to active missions → [{i, id, icon, text, target, before, after, done, justDone}] */
  _missionProgress(v) {
    const out = [];
    const list = this.P.missions.list;
    list.forEach((m, i) => {
      if (m.claimed) return;
      const tpl = MISSIONS.find((x) => x.id === m.id);
      if (!tpl) return;
      const before = m.prog;
      if (!m.done) {
        let val = 0;
        if (tpl.hero) val = v.heroId === m.hero ? (v.runs || 0) : 0;
        else val = v[tpl.stat] || 0;
        m.prog = tpl.max ? Math.max(m.prog, val) : m.prog + val;
        if (m.prog >= m.n) { m.prog = m.n; m.done = 1; }
      }
      const view = this._missionView(m, i);
      out.push({ ...view, before: Math.min(before, m.n), after: Math.min(m.prog, m.n), justDone: !!m.done && before < m.n });
    });
    return out;
  }

  // ═══════════════ sign-in 签到 (cumulative, never a streak) ═══════════════
  _signinReward(n) { return n < SIGNIN.novice.length ? SIGNIN.novice[n] : SIGNIN.loop[(n - SIGNIN.novice.length) % SIGNIN.loop.length]; }
  signin() {
    this._refreshDay();
    const S = this.P.signin;
    const canClaim = S.last !== this.today;
    const novice = S.count < SIGNIN.novice.length;
    const blockStart = novice ? 0 : SIGNIN.novice.length + Math.floor((S.count - SIGNIN.novice.length) / 7) * 7;
    const cur = S.count;   // index of the reward the next claim gives
    const days = [];
    for (let i = 0; i < 7; i++) {
      const n = blockStart + i;
      const state = n < cur ? 'claimed' : n === cur ? (canClaim ? 'today' : 'next') : 'future';
      days.push({ day: i + 1, n, state, items: this._items([this._signinReward(n)], { titleId: this._signinReward(n).title }) });
    }
    return { days, count: S.count, canClaim, novice, unlocked: this.isUnlocked('signin') };
  }
  claimSignin() {
    this._refreshDay();
    const S = this.P.signin;
    if (S.last === this.today) return false;
    const r = this._signinReward(S.count);
    S.count++; S.last = this.today;
    return this.grant([r], 'signin', { titleId: r.title });
  }

  // ═══════════════ capsule 扭蛋 (tickets only, no dupes, pity, cap, parent toggle) ═══════════════
  capsuleInfo() {
    this._refreshDay();
    const P = this.P, C = P.capsule;
    const pool = CAPSULE.pool().map((it) => ({ ...this.describe(it), owned: this.owns(it.kind, it.id) }));
    const left = {};
    for (const r of Object.keys(CAPSULE.odds)) left[r] = pool.filter((x) => x.rarity === r && !x.owned).length;
    return {
      enabled: this.isUnlocked('capsule'), parentOn: P.parent.capsule !== false,
      tickets: P.tickets, free: C.free, freePulls: C.free, cost: ECONOMY.capsule.tickets, today: C.today, dailyCap: ECONOMY.capsule.dailyCap, cap: ECONOMY.capsule.dailyCap,
      sinceEpic: C.sinceEpic, sinceLegend: C.sinceLegend,
      odds: { ...CAPSULE.odds }, per100: Object.fromEntries(Object.entries(CAPSULE.odds).map(([k, v]) => [k, Math.round(v * 100)])),
      pity: {
        epicIn: Math.max(1, CAPSULE.epicPity - C.sinceEpic), epicEvery: CAPSULE.epicPity,
        legendIn: Math.max(1, CAPSULE.legendHardPity - C.sinceLegend), legendEvery: CAPSULE.legendHardPity,
        legendBoost: C.sinceLegend + 1 >= CAPSULE.legendSoftPity,
      },
      pool, left, allOwned: pool.every((x) => x.owned), pulls: C.pulls,
      canPull: this._capsuleBlock() === null,
    };
  }
  _capsuleBlock(payWith = 'ticket') {
    const P = this.P, C = P.capsule;
    if (payWith === 'coins') return 'ticketsOnly';                      // kid-UX: no coin gacha at all
    if (P.parent.capsule === false) return 'off';
    if (!this.isUnlocked('capsule')) return 'locked';
    if (CAPSULE.pool().every((it) => this.owns(it.kind, it.id))) return 'all';
    if (C.today >= ECONOMY.capsule.dailyCap) return 'cap';
    if (C.free <= 0 && P.tickets < ECONOMY.capsule.tickets) return 'tickets';
    return null;
  }
  /** one pull → {ok, prize:{kind,id,rarity,name,…} (also spread on the result), rarity, refund?, free, pity}
   *  | {ok:false, error: 'ticketsOnly'|'off'|'locked'|'all'|'cap'|'tickets'} */
  capsule(payWith = 'ticket', rng = Math.random) {
    this._refreshDay();
    const err = this._capsuleBlock(payWith);
    if (err) return { ok: false, error: err, reason: err };
    const P = this.P, C = P.capsule;
    const free = C.free > 0;
    if (free) C.free--; else P.tickets -= ECONOMY.capsule.tickets;
    C.today++; C.pulls++;
    // rarity roll with pity
    const nL = C.sinceLegend + 1, nE = C.sinceEpic + 1;
    let pL = CAPSULE.odds.legend;
    if (nL >= CAPSULE.legendHardPity) pL = 1;
    else if (nL >= CAPSULE.legendSoftPity) pL = Math.min(1, pL + (nL - CAPSULE.legendSoftPity + 1) * CAPSULE.legendSoftStep);
    let rarity;
    const r = rng();
    if (r < pL) rarity = 'legend';
    else if (nE >= CAPSULE.epicPity) rarity = 'epic';
    else {
      const rest = CAPSULE.odds.common + CAPSULE.odds.rare + CAPSULE.odds.epic;
      const u = ((r - pL) / (1 - pL)) * rest;
      rarity = u < CAPSULE.odds.common ? 'common' : u < CAPSULE.odds.common + CAPSULE.odds.rare ? 'rare' : 'epic';
    }
    if (rarity === 'legend') { C.sinceLegend = 0; C.sinceEpic = 0; }
    else if (rarity === 'epic') { C.sinceEpic = 0; C.sinceLegend++; }
    else { C.sinceEpic++; C.sinceLegend++; }
    // only UNOWNED items of that rarity; a completed rarity refunds coins
    const cands = CAPSULE.pool().filter((it) => it.rarity === rarity && !this.owns(it.kind, it.id));
    let prize, refund = 0;
    if (cands.length) {
      const pick = cands[Math.floor(rng() * cands.length) % cands.length];
      prize = this.grant([{ [pick.kind]: pick.id }], 'capsule', { popup: false })?.items[0];
    } else {
      refund = ECONOMY.refund[rarity];
      prize = this.grant([{ coins: refund }], 'capsule', { popup: false })?.items[0];
    }
    this._commit(); this._changed();
    // the prize's own fields are spread on top so `capsule().kind/.id/.name` work as well as `.prize`
    return { ...prize, ok: true, prize, rarity, refund, rarityComplete: !cands.length, free, pity: this.capsuleInfo().pity };
  }

  // ═══════════════ Cube-dex 图鉴 ═══════════════
  dex() {
    const P = this.P;
    const list = DEX.entries.map((id) => {
      const count = P.dex.count[id] || 0;
      const claimed = P.dex.claimed[id] || [];
      const def = ENEMIES[id];
      return {
        id, found: count > 0, count, isNew: count > 0 && !P.dex.seen.includes(id),
        name: tl(DEX.freedName[id]), enemyName: id === 'king' ? tl({ zh: '故障大王', en: 'King Glitch' }) : tl(def?.name),
        fact: tl(DEX.fact[id]), world: id === 'king' ? 0 : (def?.world ?? 0),
        color: '#' + ((id === 'king' ? 0xd82f3f : def?.color ?? 0xef4b3c)).toString(16).padStart(6, '0'),
        milestones: DEX.milestones.map((ms, i) => ({ n: ms.n, reached: count >= ms.n, claimed: claimed.includes(i), claimable: count >= ms.n && !claimed.includes(i), items: this._items([ms.reward]) })),
      };
    });
    list.found = list.filter((e) => e.found).length;
    list.claimable = list.reduce((n, e) => n + e.milestones.filter((m) => m.claimable).length, 0);
    list.cards = this.cardInfo();
    // callers that probe `d.entries || d.list` would otherwise hit Array.prototype.entries (a function)
    // and see an empty dex — expose the entries under both names as well
    Object.defineProperty(list, 'entries', { value: list, enumerable: false });
    Object.defineProperty(list, 'list', { value: list, enumerable: false });
    return list;
  }
  /** claimDex(id) claims every reached milestone of an entry; claimDex(id, n) only the one with threshold n (1/25/100/300) */
  claimDex(id, n = null) {
    const P = this.P;
    const count = P.dex.count[id] || 0;
    const cl = (P.dex.claimed[id] ||= []);
    const rewards = [];
    DEX.milestones.forEach((ms, i) => { if ((n == null || ms.n === +n) && count >= ms.n && !cl.includes(i)) { cl.push(i); rewards.push(ms.reward); } });
    return rewards.length ? this.grant(rewards, 'dex') : false;
  }
  claimAllDex() {
    const P = this.P, rewards = [];
    for (const id of DEX.entries) {
      const count = P.dex.count[id] || 0, cl = (P.dex.claimed[id] ||= []);
      DEX.milestones.forEach((ms, i) => { if (count >= ms.n && !cl.includes(i)) { cl.push(i); rewards.push(ms.reward); } });
    }
    return rewards.length ? this.grant(rewards, 'dex') : false;
  }

  // ═══════════════ achievements 成就 & titles ═══════════════
  achievements() {
    const P = this.P;
    const list = ACHIEVEMENTS.map((a) => {
      const value = this.stat(a.stat);
      const claimedN = P.ach[a.id] || 0;
      const tiers = a.tiers.map((target, i) => ({ tier: i, target, reached: value >= target, claimed: i < claimedN, claimable: value >= target && i === claimedN,
        items: this._items([ACH_REWARD[i]], { titleId: a.id }) }));
      const next = tiers.find((x) => !x.reached);
      return { id: a.id, icon: a.icon, name: tl(a.name), stat: a.stat, value, cur: value, tier: claimedN, tiers, claimable: tiers.some((x) => x.claimable),
        next: next ? next.target : null, progress: next ? clamp(value / next.target, 0, 1) : 1 };
    });
    list.claimable = list.filter((a) => a.claimable).length;
    return list;
  }
  claimAchievement(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return false;
    const P = this.P, i = P.ach[id] || 0;
    if (i >= a.tiers.length || this.stat(a.stat) < a.tiers[i]) return false;
    P.ach[id] = i + 1;
    return this.grant([ACH_REWARD[i]], 'ach', { titleId: id });
  }
  claimAllAchievements() {
    const P = this.P, rewards = [];
    for (const a of ACHIEVEMENTS) {
      let i = P.ach[a.id] || 0;
      while (i < a.tiers.length && this.stat(a.stat) >= a.tiers[i]) {
        const r = { ...ACH_REWARD[i] };
        if (r.title === true) r.title = a.id;
        rewards.push(r); i++;
      }
      P.ach[a.id] = i;
    }
    return rewards.length ? this.grant(rewards, 'ach') : false;
  }
  titleName(id) {
    if (!id) return '';
    if (TITLES[id]) return tl(TITLES[id]);
    const a = ACHIEVEMENTS.find((x) => x.id === id || 'ach_' + x.id === id);   // gold achievement tiers grant their name as a title
    return a ? tl(a.name) : String(id);
  }
  setTitle(id) { if (id && !this.P.titles.includes(id)) return false; this.P.title = id || ''; this._commit(); this._changed(); return true; }

  // ═══════════════ profile 名片 ═══════════════
  nameChoices(n = 6) {
    const out = [];
    const used = new Set();
    while (out.length < n && used.size < NAME_A.length * NAME_B.length) {
      const a = (Math.random() * NAME_A.length) | 0, b = (Math.random() * NAME_B.length) | 0;
      if (used.has(a + ':' + b)) continue;
      used.add(a + ':' + b);
      out.push({ a, b, text: this._nameText({ a, b }) });
    }
    return out;
  }
  _nameText(nm) {
    if (!nm) return '';
    if (typeof nm === 'string') return nm;
    if (nm.text) return nm.text;
    const A = NAME_A[nm.a] || NAME_A[0], B = NAME_B[nm.b] || NAME_B[0];
    return getLang() === 'en' ? `${A.en} ${B.en}` : `${A.zh}${B.zh}`;
  }
  /** choice from nameChoices() ({a,b}) or a typed string (≤ 8 chars, trimmed, no markup) */
  setName(choice) {
    if (choice && typeof choice === 'object' && Number.isInteger(choice.a)) this.P.name = { a: choice.a, b: choice.b };
    else if (typeof choice === 'string') {
      const s = choice.replace(/[<>&"'`]/g, '').trim().slice(0, 8);
      if (!s) return false;
      this.P.name = { text: s };
    } else return false;
    this._commit(); this._changed();
    return true;
  }
  titles() { return [...this.P.titles]; }
  /** patch {name?, title?, pins?} — ui convenience over setName / setTitle / setPins */
  setProfile(patch = {}) {
    if (patch.name != null) this.setName(patch.name);
    if ('title' in patch) this.setTitle(patch.title || '');
    if (Array.isArray(patch.pins)) this.setPins(patch.pins);
    return true;
  }
  setPins(ids) { this.P.pins = (ids || []).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).slice(0, 3); this._commit(); this._changed(); }
  profile() {
    const P = this.P;
    return {
      name: this._nameText(P.name), title: P.title || null, titleName: this.titleName(P.title), titles: [...P.titles],
      titlesInfo: P.titles.map((id) => ({ id, name: this.titleName(id) })), pins: [...P.pins],
      rank: this.rank, rankVisible: this.isUnlocked('modes'), heroId: P.selHero, skinId: this.selectedSkin(), hatId: this.selectedHat(),
      pinsInfo: (() => { const all = P.pins.length ? this.achievements() : []; return P.pins.map((id) => { const a = all.find((x) => x.id === id); return a ? { id, icon: a.icon, name: a.name, tier: a.tier } : null; }).filter(Boolean); })(),
      stats: {
        freed: this.freed, crowns: this.totalCrowns(), bestWave: P.modes.endlessBest, perfects: P.life.perfects || 0,
        bonks: P.life.bonks || 0, bestCombo: P.life.bestCombo || 0, runs: P.life.runs || 0, wins: P.life.wins || 0,
        playDays: Object.keys(P.guard.hist).length, heroes: P.heroes.length, cosmetics: this._cosmeticCount(), endlessScore: P.modes.endlessScore,
      },
    };
  }

  // ═══════════════ progressive disclosure ═══════════════
  isUnlocked(feature) {
    if (this._all) return feature !== 'capsule' || this.P.parent.capsule !== false;
    const c = (w, s) => this._cleared(w, s);
    switch (feature) {
      case 'map': case 'signin': return c(0, 0);
      case 'missions': return c(0, 1);
      case 'road': return c(0, 2);
      case 'heroes': return this.P.heroes.length > 1;          // ui.js announces it as "a new hero joined!"
      case 'dex': return (this.P.life.freed || 0) > 0;
      case 'wardrobe': return this._cosmeticCount() > 0;
      case 'capsule': return c(0, 4) && this.P.parent.capsule !== false;
      case 'modes': case 'rank': return c(0, 4);
      case 'achievements': return c(1, 4);
      default: return true;
    }
  }
  /** pop the next "新功能开启!" announcement for the lobby: {id, name, hint} */
  nextFeature() {
    const id = this.featureQueue.shift();
    return id ? { id, name: t('meta.feature.' + id), hint: t('meta.hint.' + id) } : null;
  }
  _checkFeatures(silent) {
    const P = this.P;
    const newly = [];
    for (const id of FEATURE_ORDER) {
      if (P.features.includes(id) || !this.isUnlocked(id)) continue;
      P.features.push(id);
      newly.push(id);
      if (!silent && !QUIET_FEATURES.has(id)) {
        this.featureQueue.push(id);
        this._emit('meta:feature', { id });      // (no meta:unlock too: audio plays an unlock sting per event)
      }
      if (id === 'missions' && !silent) this._ensureMissions();
      if (id === 'modes') {
        if (!silent) this._checkRank(true); else P.rankStep = Math.max(P.rankStep, this.rank.step);
      }
    }
    // each mode announces itself once when it opens (Galaxy Survival after W1, Shrink Storm / Boss Rush after W2)
    const seen = (P.modesSeen ||= []);
    for (const m of Object.keys(MODES)) {
      if (m === 'stage' || seen.includes(m) || !this.modeUnlocked(m)) continue;
      seen.push(m);
      if (!silent) this._emit('meta:unlock', { kind: 'mode', id: m });
    }
    return newly;
  }

  // ═══════════════ red dots 红点 (claimables / new owned items only) ═══════════════
  redDots() {
    const on = (f) => this.isUnlocked(f);
    const P = this.P;
    const d = { road: 0, missions: 0, signin: 0, wardrobe: 0, capsule: 0, dex: 0, achievements: 0, map: 0, heroes: 0, claims: this.claimQueue.length };
    if (on('road')) d.road = this.road().claimable;
    if (on('missions')) { const m = this.missions(); d.missions = m.filter((x) => x.claimable).length + (m.chest.claimable ? 1 : 0); }
    if (on('signin')) d.signin = this.P.signin.last !== this.today ? 1 : 0;
    if (on('wardrobe')) d.wardrobe = P.fresh.filter((k) => /^(skin|hat|trail):/.test(k)).length;
    if (on('capsule')) d.capsule = P.capsule.free > 0 && this._capsuleBlock() === null ? P.capsule.free : 0;
    if (on('dex')) { const x = this.dex(); d.dex = x.claimable + x.filter((e) => e.isNew).length; }
    if (on('achievements')) d.achievements = this.achievements().claimable;
    if (on('map')) for (let w = 0; w < WORLDS.length; w++) d.map += this.worldChests(w).filter((c) => c.claimable).length;
    if (on('heroes')) d.heroes = P.fresh.filter((k) => k.startsWith('hero:')).length;
    d.total = Object.keys(d).reduce((n, k) => n + (k === 'claims' ? 0 : d[k]), 0);
    return d;
  }

  // ═══════════════ applyRun → results cascade breakdown ═══════════════
  applyRun(results) {
    if (!results || typeof results !== 'object') return this.lastBreakdown;
    if (this._applied?.has(results)) return this.lastBreakdown;
    (this._applied ||= new WeakSet()).add(results);
    this._refreshDay();
    const P = this.P, L = this.live;
    const mode = results.mode || L.mode || 'stage';
    const w = worldIndex(results.worldId ?? L.worldId), s = stageIndex(results.stageId ?? L.stageId);
    const stage = (mode === 'stage') ? stageOf(w, s) : null;
    const win = !!results.win;
    const heroId = results.heroId || L.heroId || P.selHero;
    const assist = !!(results.assist ?? this.G.save.profile.settings?.assist);
    const today = this.today;

    const rankBefore = this.rank, trophiesBefore = P.trophies, freedBefore = this.freed, coinsBefore = P.coins;
    const rankShown = this.isUnlocked('modes');          // before placement the rank is a secret (no rank-up ceremonies)
    const featBefore = P.features.length, rankStepBefore = P.rankStep, roadNextBefore = this.roadNext();
    const dexBefore = new Set(DEX.entries.filter((e) => (P.dex.count[e] || 0) > 0));

    // ---- authoritative run values (results) with bus fallbacks
    const freedBy = { ...(results.freed && typeof results.freed === 'object' ? results.freed : L.freedBy) };
    const bossDefeated = !!results.bossDefeated || (stage?.boss && win);
    if (bossDefeated && !freedBy.king) freedBy.king = 1;
    const freedRun = sumVals(results.freed) || L.freed || sumVals(L.freedBy) || (results.smashes | 0);
    // wave REACHED as the HUD shows it: run.wave is the 0-based index of the current wave
    const wave = Number.isFinite(+results.wave) ? (results.wave | 0) + 1 : (results.wavesCleared | 0);
    const hitsTaken = results.hitsTaken ?? 0;

    // ---- crowns 👑 (independent & permanent)
    let starsNew = [], firstClear = false, crownsBefore = [false, false, false], rec = null, newThree = 0;
    if (stage) {
      rec = this._srec(w, s, true);
      crownsBefore = rec.c.map(Boolean);
      let flags = Array.isArray(results.starFlags) ? results.starFlags.map(Boolean) : [0, 1, 2].map((i) => i < (results.stars | 0));
      if (!win) { flags[0] = false; flags[1] = false; }   // clear & few-hits need a clear; the challenge crown is independent
      flags.forEach((f, i) => { if (f && !rec.c[i]) { rec.c[i] = 1; starsNew.push(i); } });
      if (crownsBefore.filter(Boolean).length < 3 && rec.c.every(Boolean)) newThree = 1;
      firstClear = win && !rec.cl;
      if (win) rec.cl = 1;
      rec.plays++;
      rec.fails = win ? 0 : rec.fails + 1;
    }
    let newBest = false, best = 0;
    const score = results.score | 0;
    if (rec) { newBest = score > rec.best && rec.plays > 1; if (score > rec.best) rec.best = score; best = rec.best; }

    // ---- mode bests / medals
    let medalsNew = 0, endlessPB = false, medalRange = [0, 0], medalBest = null;
    if (mode === 'endless') {
      endlessPB = wave > P.modes.endlessBest;
      if (endlessPB) P.modes.endlessBest = wave;
      if (score > P.modes.endlessScore) { newBest = P.modes.endlessScore > 0; P.modes.endlessScore = score; }
      best = P.modes.endlessScore;
    } else if (mode === 'storm') {
      const medals = MODES.storm.medals.filter((m) => freedRun >= m).length;
      medalBest = medals > 0 ? medals - 1 : null;
      if (medals > P.modes.stormMedals) { medalsNew = medals - P.modes.stormMedals; }
      const oldMedals = P.modes.stormMedals;
      P.modes.stormMedals = Math.max(oldMedals, medals);
      newBest = freedRun > P.modes.stormBest && P.modes.stormBest > 0;
      P.modes.stormBest = Math.max(P.modes.stormBest, freedRun); best = P.modes.stormBest;
      medalRange = [oldMedals, P.modes.stormMedals];
    } else if (mode === 'rush') {
      const beaten = results.bossKills ?? results.wavesCleared ?? L.bossKills ?? 0;
      newBest = beaten > P.modes.rushBest && P.modes.rushBest > 0;
      P.modes.rushBest = Math.max(P.modes.rushBest, beaten); best = P.modes.rushBest;
    }

    // ---- stats → scopes, hero, dex, missions
    const clears = (win && mode !== 'endless') || (mode === 'endless' && wave >= 5) ? 1 : 0;
    const vals = {
      heroId, freedBy, freed: freedRun, runs: 1, wins: win ? 1 : 0, deaths: win || mode === 'endless' ? 0 : 1,
      smashes: results.smashes ?? L.smashes, bonks: results.bonks ?? L.bonks, perfects: results.perfects ?? L.perfects,
      nearMisses: results.nearMisses ?? L.nearMisses, novas: results.novas ?? L.novas, crystals: results.crystals ?? L.crystals,
      bestComboRun: results.maxCombo ?? L.bestComboRun, bestCombo: results.maxCombo ?? L.bestComboRun,
      bestNovaRun: results.bestNova ?? L.bestNovaRun, bestNova: results.bestNova ?? L.bestNovaRun,
      clears, endlessWave: mode === 'endless' ? wave : 0, endlessBest: mode === 'endless' ? wave : 0,
      newThreeStar: newThree, bossKills: mode === 'rush' ? (results.bossKills ?? L.bossKills ?? 0) : (bossDefeated ? 1 : 0),
      popperFreed: freedBy.popper || 0, coinCubes: results.coinCubes ?? (freedBy.coin || 0),
      noHitClears: win && mode === 'stage' && hitsTaken === 0 ? 1 : 0, evolutions: results.evolutions ?? L.evolutions,
    };
    this.live = this._freshLive();   // consumed
    const missionsProgress = this._commitVals(vals);

    // ---- trophies
    const TR = ECONOMY.trophies;
    let trophies = 0;
    if (stage) trophies += starsNew.length * TR.firstStar + (stage.boss && firstClear ? TR.bossFirst : 0);
    let par = null;
    if (mode === 'endless') {
      par = this.endlessPar(rankBefore);
      let T = clamp(TR.endlessPar.base + TR.endlessPar.perWave * (wave - par), 1, TR.endlessPar.max) + (endlessPB ? TR.endlessPar.pbBonus : 0);
      if (assist) T = Math.max(1, Math.ceil(T * TR.assistMult));
      trophies += T;
    }
    if (mode === 'storm' && medalsNew) {
      const [a, b] = medalRange;
      let T = 0; for (let i = a; i < b; i++) T += TR.modeMedal[i] || 0;
      if (assist) T = Math.max(1, Math.ceil(T * TR.assistMult));
      trophies += T;
    }
    P.trophies += trophies;

    // ---- unlocks: stage / world / hero rescue
    const unlocks = [];
    if (stage && firstClear) {
      const W = WORLDS[w];
      if (s + 1 < W.stages.length) unlocks.push({ kind: 'stage', worldId: w, stageId: s + 1, id: W.stages[s + 1].id });
      else if (w + 1 < WORLDS.length) { unlocks.push({ kind: 'world', worldId: w + 1, id: WORLDS[w + 1].id }); this._emit('meta:unlock', { kind: 'world', id: w + 1, worldId: w + 1, key: WORLDS[w + 1].id }); }
    }
    let rescued = null, rescuedDup = false, rescuedId = null;
    const rescueId = stage?.boss && firstClear ? (results.rescued || WORLDS[w].boss?.rescue || null) : null;
    if (rescueId && HEROES.some((h) => h.id === rescueId)) {
      rescuedDup = P.heroes.includes(rescueId);
      // new hero → full-screen rescue ceremony (meta:unlock); already owned → the 3 tickets get a 领取 popup
      this.grant([{ hero: rescueId }], 'rescue', { popup: rescuedDup });
      rescuedId = rescueId;
      // `rescued` drives ui.js's full-screen NEW HERO reveal → only for a hero the child did not own yet
      if (!rescuedDup) { rescued = rescueId; unlocks.push({ kind: 'hero', id: rescueId }); }
    }

    // ---- coins
    const E = ECONOMY, lines = [];
    const line = (id, amount, extra = {}) => { if (amount > 0) lines.push({ id, icon: '🪙', amount: Math.round(amount), label: t('meta.cb.' + id, extra), ...extra }); };
    if (mode === 'stage') {
      if (win) {
        line('clear', E.stageClear.base + E.stageClear.perWorld * w);
        if (firstClear) line('firstClear', E.stageClear.firstBonus);
        if (firstClear && stage?.boss) line('boss', E.stageClear.bossFirst);
      } else line('fail', E.fail.base + Math.floor(freedRun / 2) * E.fail.perTwoFreed);
      if (starsNew.length) line('crowns', starsNew.length * E.stageClear.perNewStar, { n: starsNew.length });
    } else if (mode === 'endless') {
      line('endless', Math.max(E.fail.base, E.endless.perWave * wave + E.endless.perThousandScore * Math.floor(score / 1000)), { n: wave });
    } else if (mode === 'daily') {
      if (win) { const first = P.modes.dailyDay !== today; line('daily', first ? E.daily.clear : TUNE.dailyRepeatCoins); P.modes.dailyDay = today; }
      else line('fail', E.fail.base + Math.floor(freedRun / 2) * E.fail.perTwoFreed);
    } else if (mode === 'storm') {
      line('fail', E.fail.base + Math.floor(freedRun / 2) * E.fail.perTwoFreed);
      if (medalsNew) { const [a, b] = medalRange; let c = 0; for (let i = a; i < b; i++) c += E.modeMedal[i] || 0; line('medal', c); }
    } else if (mode === 'rush') {
      line('rush', E.stageClear.base + TUNE.rushPerBoss * (vals.bossKills || 0));
    } else line('fail', E.fail.base);
    let runCoins = lines.reduce((n, l) => n + l.amount, 0);
    // first win of the day ×2 (first stage/daily clear, or endless wave ≥ 5)
    let firstWin = false;
    const counts = (win && (mode === 'stage' || mode === 'daily')) || (mode === 'endless' && wave >= 5);
    if (counts && P.firstWinDay !== today) {
      firstWin = true; P.firstWinDay = today;
      const bonus = runCoins * (E.firstWinOfDayMult - 1);
      line('firstWin', bonus, { mult: E.firstWinOfDayMult });
      runCoins += bonus;
    }
    // rested bonus ×1.5 for the next 3 runs after a real break
    let rested = false;
    if (P.rested > 0) {
      rested = true; P.rested--;
      const bonus = Math.round(runCoins * (E.rested.mult - 1));
      line('rested', bonus, { mult: E.rested.mult });
      runCoins += bonus;
    }
    const pickups = Math.max(0, results.coins ?? L.coins ?? 0) | 0;
    if (pickups) lines.push({ id: 'pickups', icon: '🪙', amount: pickups, label: t('meta.cb.pickups') });
    const coins = lines.reduce((n, l) => n + l.amount, 0);
    P.coins += coins;
    this._emit('meta:reward', { coins, gems: 0, tickets: 0, items: [this.describe({ kind: 'coins', amount: coins })], source: 'run' });

    // ---- dex news, features, rank
    const newDex = DEX.entries.filter((e) => !dexBefore.has(e) && (P.dex.count[e] || 0) > 0);
    this._checkFeatures(false);
    this._checkRank(false);
    const feats = P.features.slice(featBefore);          // incl. features unlocked inside grants above
    for (const f of feats) unlocks.push({ kind: 'feature', id: f });
    const rankAfter = this.rank;
    const rankUp = P.rankStep > rankStepBefore;
    const tierUp = rankUp && Math.floor(P.rankStep / 3) > Math.floor(rankStepBefore / 3);
    const placement = feats.includes('modes');

    // ---- Galaxy Road overflow chests (every 400 cubes past the end) are auto-granted: they have no node to tap
    this._grantOverflow();
    if (P.lastPlayDay !== today) { P.lastPlayDay = today; P.playDays = (P.playDays || 0) + 1; }

    // ---- guardian (between runs only)
    this._guardAfterRun();

    const breakdown = {
      mode, win, worldId: w, stageId: s, stageKey: stage?.id || null, heroId, assist,
      coins, coinsBreakdown: lines, coinsBefore, coinsAfter: P.coins, tickets: 0,
      trophies, trophiesBefore, trophiesAfter: P.trophies,
      rankBefore: rankShown ? rankBefore : null, rankAfter: rankShown || placement ? rankAfter : null,
      rankUp, tierUp, placement,                          // rankStep only moves once ranks are visible
      rankVisible: this.isUnlocked('modes'), par,
      freedRun, freedBefore, freedAfter: this.freed, roadNextBefore, roadNext: this.roadNext(), roadClaimable: this.road().claimable,
      missionsProgress, newDex, unlocks, rescued, rescuedDup, rescuedId,
      newBest, best, score, starsNew, crownsBefore, crowns: rec ? rec.c.map(Boolean) : null,
      firstClear, firstWin, rested, restedLeft: P.rested, fails: rec?.fails || 0,
      helperOffer: !!rec && !win && rec.fails >= 2 && !assist,
      // medal = index of the best medal this run (0 🥉 · 1 🥈 · 2 🥇), null when none (ui indexes a medal icon list)
      medalsNew, medal: mode === 'storm' ? medalBest : undefined,
      endlessBest: P.modes.endlessBest, wave,
      nextStage: this.nextStage(),
      replay: !!rec && rec.plays > 1,
    };
    this.lastBreakdown = breakdown;
    this._commit();
    this.G.save.flush?.();
    this._changed();
    return breakdown;
  }

  // ═══════════════ play-time guardian ═══════════════
  get isNight() {
    const d = new Date();
    const m = d.getHours() * 60 + d.getMinutes();
    const a = minutesOf(HEALTH.nightStart), b = minutesOf(HEALTH.nightEnd);
    return a > b ? (m >= a || m < b) : (m >= a && m < b);
  }
  get limitReached() {
    const p = this.P.parent;
    if (!p.limit) return false;
    const extra = p.extraDay === this.today ? p.extra : 0;
    return this.P.day.play / 60 >= p.limit + extra;
  }
  get restedRuns() { return this.P.rested; }
  get firstWinAvailable() { return this.P.firstWinDay !== this.today; }
  get sessionMinutes() { return this.P.guard.session / 60; }
  /** play-time accounting (active = a run exists and isn't paused; lobby idling doesn't count) */
  tick(rdt = 0) {
    rdt = Math.min(Math.max(rdt, 0), 0.25);
    this._t += rdt;
    const run = this.G.run;
    if (this.live.active && !run) this._commitPartial();
    if (run && run.state !== 'paused' && run.state !== 'ended') {      // results screen / pause don't count
      const P = this.P, g = P.guard;
      g.session += rdt; P.day.play += rdt;
      const k = P.day.key;
      g.hist[k] = (g.hist[k] || 0) + rdt;
      const st = this.G.save.profile.stats; if (st) st.playSeconds = (st.playSeconds || 0) + rdt;
      this._activeT = (this._activeT || 0) + rdt;
      if (this._activeT > 5) { this._activeT = 0; g.lastActive = this._now(); }
    }
    if (this._t - this._clockT >= 1) { this._clockT = this._t; const before = this.P.day.key; this._refreshDay(); if (this.P.day.key !== before) this._changed(); }
    if (this._t - this._stampT >= TUNE.stampEvery) { this._stampT = this._t; this._stamp(); }
  }
  _stamp() {
    const g = this.P.guard;
    g.lastSeen = this._now();
    const keys = Object.keys(g.hist).sort();
    while (keys.length > TUNE.historyDays) delete g.hist[keys.shift()];
    this._commit();
  }
  /** ≥ 15 min away (closed, hidden or idle in menus) → rested bonus + fresh session */
  _checkAway(now) {
    // lastActive only advances while a run is live, so this gap covers a closed tab,
    // a hidden tab and idling in the lobby alike
    const g = this.P.guard;
    g.lastSeen = now;
    if (!g.lastActive || now - g.lastActive < TUNE.restedAwayMin * 60e3) return false;
    g.lastActive = now;
    g.session = 0; g.nextBreak = this._breakEvery() || HEALTH.breakCardMinutes; g.toast = 0;
    const had = this.P.rested;
    this.P.rested = ECONOMY.rested.runs;
    if (g.breakPending) { g.breakPending = 0; }
    this._commit();
    return had !== this.P.rested;
  }
  /** break-card interval in minutes (parent zone: settings.breakMinutes 30/45/60, 0 = off); null = reminders off */
  _breakEvery() {
    const st = this.G.save.profile.settings || {};
    if (st.breakReminder === false || st.breakMinutes === 0 || this.P.parent.breakMinutes === 0) return null;
    return +st.breakMinutes || +this.P.parent.breakMinutes || HEALTH.breakCardMinutes;
  }
  _guardAfterRun() {
    const g = this.P.guard;
    const min = g.session / 60;
    const every = this._breakEvery();
    if (every) {
      if (min >= g.nextBreak) {
        this.pendingBreak = true;
        // default: 45 min, then every 20 · a parent-chosen interval repeats at that interval
        g.nextBreak = min + (every !== HEALTH.breakCardMinutes ? every : HEALTH.repeatMinutes);
      } else if (min >= HEALTH.toastMinutes && min < every && !g.toast) { this.pendingToast = t('meta.guard.toast'); g.toast = 1; }
    }
    this.P.guard.lastActive = this._now();
    if (this.pendingBreak || this.pendingToast || this.limitReached) this._emit('meta:guardian', this.guardianPrompt(true) || {});
  }
  /** the prompt ui.js should show between runs (never mid-run), highest priority first */
  guardianPrompt(force = false) {
    const run = this.G.run;
    if (!force && run && run.state !== 'ended') return null;
    if (this.limitReached) return { kind: 'limit', icon: '😴', text: t('meta.guard.limit') };
    if (this.pendingBreak) return { kind: 'break', icon: '🧘', text: t('meta.guard.break'), sub: t('meta.guard.breakSub'), rest: t('meta.guard.rest'), more: t('meta.guard.more'), seconds: 20 };
    if (this.pendingToast) return { kind: 'toast', icon: '👀', text: this.pendingToast };
    if (this.isNight && this.P.guard.nightDay !== this.today && (this.P.life.runs || 0) > 0) return { kind: 'night', icon: '🌙', text: t('meta.guard.night') };
    return null;
  }
  /** kind: 'break' + choice 'rest'|'more' · 'toast' · 'night' · 'limit' */
  resolveGuardian(kind, choice) {
    const g = this.P.guard;
    if (kind === 'break') {
      this.pendingBreak = false;
      // 休息一下 grants the rested bonus (next 3 runs ×1.5 coins) — breaks are rewarded, never punished
      if (choice === 'rest') { this._bump('breaks', 1); g.breakPending = 1; this.P.rested = Math.max(this.P.rested, ECONOMY.rested.runs); }
    } else if (kind === 'toast') this.pendingToast = null;
    else if (kind === 'night') g.nightDay = this.today;
    this._commit(); this._changed();
  }
  takeBreak() { this.resolveGuardian('break', 'rest'); return true; }
  keepPlaying() { this.resolveGuardian('break', 'more'); return true; }
  snoozeBreak() { return this.keepPlaying(); }
  /** after-run check for ui.js: {card, toast, limit, night} — consumes the one-shot prompts */
  healthCheck() {
    const r = { card: !!this.pendingBreak, toast: !!this.pendingToast, limit: this.limitReached, night: false, minutes: Math.round(this.sessionMinutes) };
    if (this.isNight && this.P.guard.nightDay !== this.today && (this.P.life.runs || 0) > 0) { r.night = true; this.P.guard.nightDay = this.today; }
    this.pendingToast = null;
    this.pendingBreak = false;          // the card is on screen now; takeBreak()/snoozeBreak() record the choice
    this._commit();
    return r;
  }
  todayMinutes() { return this.P.day.play / 60; }
  get bestWave() { return this.P.modes.endlessBest; }
  /** days the child has played at all (profile card stat; never a streak) */
  get playDays() { return Math.max(this.P.playDays || 0, Object.keys(this.P.guard.hist).length); }
  get rerollsLeft() { return this.P.missions.rerolls; }

  // ---- parent zone (the math gate lives in ui.js) ----
  get parent() { const p = this.P.parent; return { limit: p.limit, capsule: p.capsule !== false, extraToday: p.extraDay === this.today ? p.extra : 0 }; }
  setParent(key, value) {
    const p = this.P.parent;
    if (key === 'limit' || key === 'dailyLimit') p.limit = HEALTH.parentLimits.includes(+value) ? +value : 0;
    else if (key === 'capsule' || key === 'capsuleOn') p.capsule = !!value;          // ui.js sends 'capsuleOn'
    else if (key === 'breakMinutes' || key === 'breakEvery') {
      p.breakMinutes = Math.max(0, +value || 0);
      const g = this.P.guard;
      if (p.breakMinutes) g.nextBreak = p.breakMinutes;                             // the new interval applies from now
    } else return false;
    this._commit(); this._changed();
    return true;
  }
  extendLimit(minutes = 15) { return this.parentExtend(minutes); }
  parentExtend(minutes = 15) {
    const p = this.P.parent;
    if (p.extraDay !== this.today) { p.extraDay = this.today; p.extra = 0; }
    p.extra += minutes; this._commit(); this._changed();
    return true;
  }
  /** last N days of active play (parent zone chart): [{day, minutes}] oldest → newest */
  playHistory(days = 7) {
    const out = [];
    const base = new Date(this.today + 'T12:00:00');
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(base); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ day: k, minutes: Math.round((this.P.guard.hist[k] || 0) / 60) });
    }
    return out;
  }
}
