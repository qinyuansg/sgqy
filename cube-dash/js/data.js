// ─────────────────────────────────────────────────────────────
// CUBE DASH — design data. The single source of truth for every
// number, table and name in the game. Read-only for all modules.
//   names are bilingual records {zh, en}; use tl(rec) from i18n.js
// ─────────────────────────────────────────────────────────────

// ============ core feel (1 u = hero cube edge) ============
export const TUNE = {
  player: {
    speed: 6.5, accel: 60, decel: 40,
    size: 1.0, hurtRadius: 0.42,
    hearts: 5, assistHeartsBonus: 2, maxHearts: 10,
    iframes: 1.5, knockback: 1.6,   // every hit costs exactly 1 heart (kid rule); size shows as knockback
    skidAngle: 120, skidTime: 0.08,
  },
  dash: {
    time: 0.18, dist: 4.0, iframes: 0.24, cost: 25, cooldown: 0.2,
    buffer: 0.12, endLag: 0.06,
    pierceExtend: 0.05, pierceCap: 0.15, smashRefund: 8,
    aimAssistDeg: 25, aimAssistTouchDeg: 32, aimAssistRange: 5.5,
    recoil: 0.6,                // hero bounce-back after knocking a solid cube
  },
  sprint: { mult: 1.35, drain: 30 },     // hold dash after the burst (source game's Shift sprint)
  stamina: { max: 100, regen: 38, delay: 0.45, lockout: 1.3, assistLockout: 0, lockoutRefillTo: 0.4, lockoutWalk: 1.0 },
  perfect: { ttc: 0.3, assistTtc: 0.45, cueExtra: 0.2, gap: 0.5, hazardWindow: 0.12, slowScale: 0.3, slowTime: 0.5, radius: 3.5, dizzy: 2.5, refund: 40, nova: 8, slowCooldown: 1.0 },
  nearMiss: { margin: 0.6, cooldownPerEnemy: 1.5 },
  knock: { speed: 13, friction: 18, projectileTime: 0.6, chainFactor: 0.7, bonkMinSpeed: 4, maxHops: 4 },
  bonk: { dizzy: 3.0, rimDizzy: 2.5, headOnSpeed: 3.0, pairCooldown: 1.5, wakeWarn: 0.5, immunity: 1.5 },
  smash: { chainWindow: 1.5, heartDropBase: 0.04, heartDropLow: 0.10, heartDropCap: 0.25 },   // Low = at ≤ 2 hearts
  nova: {
    max: 100, radius: 8, heavyDizzy: 4, slowScale: 0.2, slowTime: 1.0,
    gain: { smash: 3, bonk: 1, perfect: 8, nearMiss: 1, crystal: 0.5, passivePerSec: 0.3 },
    lowHeartsMult: 1.5,          // comeback: ≤2 hearts → +50% charge
  },
  style: {                        // ONE combo counter ("STYLE")
    decay: 3.0,
    gain: { nearMiss: 1, bonk: 1, smash: 1, perfect: 3 },
    tiers: [
      { at: 10, word: { zh: '不错!', en: 'NICE!' }, mult: 1.25 },
      { at: 25, word: { zh: '漂亮!', en: 'GREAT!' }, mult: 1.5 },
      { at: 50, word: { zh: '帅呆了!', en: 'AWESOME!' }, mult: 1.75 },
      { at: 100, word: { zh: '银河传说!', en: 'GALACTIC!' }, mult: 2.0 },
    ],
  },
  xp: {
    // xp needed to go from level L to L+1
    next: (L) => Math.round(10 + L * 3 + L * L * 0.7),
    crystal: { S: 1, M: 2, L: 3, XL: 6 },
    magnetRadius: 2.2,
  },
  score: { smash: 100, bonk: 25, perfect: 250, nearMiss: 20, crystal: 5, waveClear: 500, heartLeft: 300, timeBonusPerSec: 10 },
  hitstop: { knock: 30, bonk: 50, smash: 65, smashL: 100, chainStep: 8, chainCap: 160, perfect: 80, hurt: 110, bossCrack: 180, lastCube: 130, capPerSec: 220 },
  shake: { knock: 0.08, bonk: 0.12, smash: 0.15, hurt: 0.45, nova: 0.7, bossSlam: 0.6, bossCrack: 0.5 },
  guardian: {                     // invisible dynamic difficulty (never harder than baseline)
    window: 40, stressPerHit: 2, lowHeartStress: 2, perfectRelief: 0.5,
    levels: [
      { at: 4, tokens: -1, spawnInterval: 1.15, heartDrop: 1.5, dizzy: 0, speed: 1 },
      { at: 7, tokens: -2, spawnInterval: 1.3, heartDrop: 1.8, dizzy: 0.5, speed: 0.9 },
    ],
    recoverEvery: 20,
  },
  assist: { enemySpeed: 0.8, telegraph: 1.3, dmgMult: 1, perfectTtc: 0.3 },
  spawn: { minDistFromPlayer: 4.5, portalTime: 1.1, portalTimeEarly: 1.4 },
  // FEVER finale (Clash Royale double-elixir): last 20% of a stage's cubes
  fever: { atProgress: 0.8, crystalMult: 2, novaMult: 1.5, spawnMult: 1.3, bpmAdd: 8 },
  stars: { maxHeartsLost: 2 },    // ★1 clear · ★2 lose ≤ 2 hearts · ★3 stage challenge
  levelUpInputGuard: 0.6,         // ignore card input for 0.6 s (mashing kids)
};

// ============ rarity ============
export const RARITY = {
  common: { color: '#dde6f0', name: { zh: '普通', en: 'Common' }, weight: 60, pips: 1 },
  rare: { color: '#3fa9ff', name: { zh: '稀有', en: 'Rare' }, weight: 30, pips: 2 },
  epic: { color: '#b26bff', name: { zh: '史诗', en: 'Epic' }, weight: 10, pips: 3 },
  legend: { color: '#ffb21e', name: { zh: '传说', en: 'Legendary' }, weight: 0, pips: 4 },
};

// ============ heroes ============
// dashKind: 'knock' (billiards cue) | 'bash' (heavy knock, moves Bruisers) | 'blink' (teleport + spark) | 'well' (gravity well)
// novaKind: 'bigbang' | 'mega' | 'storm' | 'blackhole'
export const HEROES = [
  {
    id: 'blu', color: 0x2f6bff, accent: 0x8fd3ff,
    name: { zh: '小蓝', en: 'Blu' }, role: { zh: '冲刺王牌', en: 'Dash Ace' },
    blurb: { zh: '刚刚好的冲刺，完美闪避更容易！', en: 'Perfect dashes come easier.' },
    hearts: 5, speed: 6.5, dashCost: 25, dashDist: 4.0, dashTime: 0.18, dashKind: 'knock',
    passive: { id: 'justRight', name: { zh: '刚刚好', en: 'Just Right' }, desc: { zh: '完美冲刺判定更宽，冲击波更大', en: 'Wider Perfect window, bigger shockwave' }, ttcBonus: 0.05, radiusBonus: 0.8 },
    nova: { kind: 'bigbang', cost: 100, name: { zh: '大爆炸', en: 'Big Bang' }, desc: { zh: '巨大冲击波，解救周围所有红方块', en: 'Huge shockwave frees every cube around you' } },
    unlock: [{ type: 'start' }], stars: 1,
  },
  {
    id: 'mochi', color: 0x2fd6a8, accent: 0xc8ffe9,
    name: { zh: '麻薯', en: 'Mochi' }, role: { zh: '弹弹坦克', en: 'Bumper Tank' },
    blurb: { zh: '又软又弹，能把大块头也撞飞！', en: 'Soft, bouncy, and can shove even Bruisers.' },
    hearts: 7, speed: 5.9, dashCost: 34, dashDist: 3.4, dashTime: 0.2, dashKind: 'bash',
    passive: { id: 'bouncyBelly', name: { zh: '弹弹肚', en: 'Bouncy Belly' }, desc: { zh: '走路碰到方块会把它弹开', en: 'Walking into cubes bounces them away' }, bumpSpeed: 6, bumpCooldown: 1.5 },
    nova: { kind: 'mega', cost: 110, name: { zh: '超大麻薯', en: 'Mega Mochi' }, desc: { zh: '变成巨大无敌麻薯，碾过一切！', en: 'Become giant and invincible — roll over everything!' }, duration: 6, scale: 2.5 },
    unlock: [{ type: 'boss', world: 0 }, { type: 'road' }], stars: 1,
  },
  {
    id: 'zap', color: 0xffc928, accent: 0x5ab8ff,
    name: { zh: '闪闪', en: 'Zap' }, role: { zh: '闪电瞬移', en: 'Blink Bolt' },
    blurb: { zh: '瞬间移动，留下电火花让方块眩晕！', en: 'Teleport and leave sparks that stun cubes.' },
    hearts: 4, speed: 6.8, dashCost: 22, dashDist: 5.5, dashTime: 0.08, dashKind: 'blink',
    passive: { id: 'static', name: { zh: '静电', en: 'Static' }, desc: { zh: '2秒内瞬移3次，闪电连锁解救眩晕方块', en: '3 blinks in 2s: chain lightning frees dizzy cubes' }, sparkRadius: 1.6, sparkDizzy: 1.2, chainCount: 3 },
    nova: { kind: 'storm', cost: 100, name: { zh: '雷暴', en: 'Thunderstorm' }, desc: { zh: '天降12道闪电，逐个解救！', en: '12 lightning bolts strike cube after cube!' }, bolts: 12, duration: 2.5 },
    unlock: [{ type: 'boss', world: 1 }, { type: 'signin', day: 7 }, { type: 'road' }], stars: 2,
  },
  {
    id: 'stella', color: 0xa77bff, accent: 0xffe27a,
    name: { zh: '星星', en: 'Stella' }, role: { zh: '引力之星', en: 'Gravity Star' },
    blurb: { zh: '冲刺留下引力井，把方块吸到一起相撞！', en: 'Dashes drop gravity wells that pull cubes into each other.' },
    hearts: 5, speed: 6.2, dashCost: 28, dashDist: 4.2, dashTime: 0.18, dashKind: 'well',
    passive: { id: 'starlight', name: { zh: '星光', en: 'Starlight' }, desc: { zh: '眩晕方块会慢慢飘向你，眩晕更久', en: 'Dizzy cubes drift toward you and stay dizzy longer' }, drift: 2, dizzyBonus: 0.5 },
    well: { time: 1.8, radius: 3.5, pull: 6, max: 2 },
    nova: { kind: 'blackhole', cost: 120, name: { zh: '黑洞', en: 'Black Hole' }, desc: { zh: '吸入一切，然后砰！全部解救', en: 'Sucks everything in… then POP!' }, radius: 11, duration: 3, implode: 4 },
    unlock: [{ type: 'boss', world: 2 }, { type: 'road' }], stars: 3,
  },
];

// ============ enemies (red family — danger colours only) ============
// hearts = contact damage. mass: knock/bonk resistance. smashable only while dizzy/tired/overheated.
export const ENEMIES = {
  grumpy: {
    name: { zh: '怒怒方', en: 'Grumpy' }, color: 0xef4b3c, mass: 1,
    tip: { zh: '引它们相撞，看到星星就冲！', en: 'Make them crash. See stars? DASH!' },
    sizes: {
      S: { size: 0.7, speed: 3.8, turn: 220, hearts: 1, xp: 'S' },
      M: { size: 1.0, speed: 3.0, turn: 160, hearts: 1, xp: 'M' },
      L: { size: 1.4, speed: 2.3, turn: 110, hearts: 1, xp: 'L', knockback: 2.4 },
    },
    accel: 7, world: 0,
  },
  zippy: {
    name: { zh: '冲冲方', en: 'Zippy' }, color: 0xff7a2e, mass: 1, shape: 'wedge',
    tip: { zh: '看地上的箭头！冲过来的瞬间闪开，它会累晕', en: 'Watch the arrows. Dodge the charge — it gets tired!' },
    size: 0.85, speed: 3.2, turn: 180, accel: 8, hearts: 1, xp: 'M',
    windup: 1.1, windupLate: 0.9, chargeSpeed: 14, chargeDist: 13, tired: 1.8, rimDizzy: 3.0, bigBonk: 3.5, cooldown: 3.5, triggerRange: 9,
    world: 1,
  },
  splitter: {
    name: { zh: '分分方', en: 'Splitter' }, color: 0xe8384f, mass: 1.2, shape: 'seam',
    tip: { zh: '解救后会分成两个小方块', en: 'Splits into two minis when freed' },
    size: 1.2, speed: 2.7, turn: 140, accel: 6, hearts: 1, xp: 'L', splitInto: 2, miniSize: 0.65, splitOnKnock: true, miniDizzy: 2.0,   // split = jackpot, never punishment
    world: 2,
  },
  popper: {
    name: { zh: '爆爆方', en: 'Popper' }, color: 0xff5a36, mass: 0.9, shape: 'fuse',
    tip: { zh: '把它撞进人群里——砰！', en: 'Knock it into the crowd — BOOM!' },
    size: 0.9, speed: 2.6, turn: 150, accel: 6, hearts: 1, xp: 'M',
    fuse: 2.0, knockedFuse: 0.9, armRange: 2.8, blastRadius: 3.0, blastHearts: 1, blastDizzy: 3.0,   // beep… beep… beep-beep-BOOM + exact-radius striped ring
    world: 3,
  },
  beamer: {
    name: { zh: '激光方', en: 'Beamer' }, color: 0xd9304a, mass: 2.5, shape: 'pylon', stationary: true,
    tip: { zh: '激光也能晕倒红方块！扫完会过热', en: 'Its laser dizzies cubes too! Overheats after a sweep' },
    size: 1.1, hearts: 1, xp: 'L',
    telegraph: 1.2, sweepDeg: 80, sweepTime: 2.0, overheat: 2.5, cooldown: 2.0, beamLength: 14, beamWidth: 0.6,   // ≤ 40°/s, dashable (i-frames)
    world: 4,
  },
  bruiser: {
    name: { zh: '铁头方', en: 'Bruiser' }, color: 0xb3202e, mass: 3, shape: 'helmet',
    tip: { zh: '撞三下才会晕！炸弹和激光也管用', en: 'Three knocks to daze! Bombs & lasers work too' },
    size: 2.0, speed: 1.9, turn: 90, accel: 4, hearts: 1, xp: 'XL', armor: 3, dizzy: 3.0, knockback: 3.0,
    world: 5,
  },
  coin: {
    name: { zh: '金币方', en: 'Coin Cube' }, color: 0xffcf3a, mass: 0.8, shape: 'tophat', treasure: true,
    tip: { zh: '撞它三下，金币喷泉！', en: 'Knock it 3 times for a coin fountain!' },
    size: 0.8, speed: 5.5, turn: 260, accel: 12, hearts: 0, xp: 'S', knocksNeeded: 3, window: 12, lifetime: 16, coins: 30,
    world: 0,
  },
};
// mini splitter cubes & sleeping cubes are grumpy variants: spawn opts {size:'S', mini:true} / {sleep:true}

// ============ boss: King Glitch (one modular rig, one new move per world) ============
export const BOSS = {
  id: 'king',
  name: { zh: '故障大王', en: 'KING GLITCH' },
  size: 3.6, contactHearts: 1, color: 0xd82f3f, coreColor: 0xff3df2, maxFightSeconds: 150,
  // cracks = boss HP (kid-sized: 3 / 4 / 4 / 4 / 5 / 5). Dash the open core (only when DIZZY) = 1 crack; nova = dizzy 3 s.
  // Phase checkpoints: a failed attempt can retry from the current phase; each failed attempt slows attacks 10% (min 70%).
  cracks: [3, 4, 4, 4, 5, 5],
  failSlowStep: 0.1, failSlowMin: 0.7,
  phaseAt: [0.66, 0.33],           // fraction of cracks remaining that triggers phase 2 / 3
  enrageAt: [180, 150, 150, 150, 150, 150],
  stagger: { max: 100, knockedCube: 34, bonkNear: 10, perfectNear: 15, decay: 5, dizzy: 4 },
  moves: {
    slam: { name: { zh: '跳跳砸', en: 'Hop Slam' }, crouch: 0.4, fill: 1.2, air: 0.6, radius: 3.5, hearts: 1, ringSpeed: 6, ringMax: 16, ringWidth: 0.6, ringHearts: 1, rings: [1, 2, 3], ringGap: 1.2, dizzy: [4.0, 3.5, 3.0] },
    summon: { name: { zh: '召唤小弟', en: 'Minion Call' }, roar: 0.8, portals: 3, count: [4, 6, 6], idle: 1.5 },
    charge: { name: { zh: '横冲直撞', en: 'Ram Charge' }, world: 1, fill: 1.2, lockAt: 0.9, width: 2.5, speed: 16, wallDizzy: 3.5, hearts: 1 },
    laser: { name: { zh: '旋转激光', en: 'Laser Spin' }, world: 2, fill: 1.5, beams: [1, 2, 3], speed: [30, 35, 40], time: 4.0, width: 0.6, hearts: 1, safeGap: true },
    rain: { name: { zh: '方块雨', en: 'Glitch Rain' }, world: 3, count: [8, 8, 12], gap: 0.1, fall: 1.2, radius: 1.0, hearts: 1, landDizzy: 2.0 },
    double: { name: { zh: '双重砸', en: 'Double Slam' }, world: 4, secondFill: 0.7, gap: 0.8 },
  },
  rotations: {
    1: ['slam', 'summon', 'slam', 'charge'],
    2: ['slam', 'laser', 'summon', 'rain', 'charge'],
    3: ['double', 'laser', 'rain', 'charge', 'charge', 'summon'],
  },
  moveGap: 1.0,
  phaseShift: { time: 2.5, push: 4 },
  coreChase: { speed: 7, hits: 3, mineEvery: 2, mineFuse: 1.5, mineRadius: 1.5 }, // world 6 finale
};

// ============ upgrade cards (roguelite, pick 1 of 3 on level-up) ============
// tag: dash ⚡ · bonk 💥 · guard 🛡 · star ✦   — 3 cards of one tag = set bonus
export const TAGS = {
  dash: { icon: '⚡', color: '#5fd0ff', name: { zh: '冲刺', en: 'Dash' }, bonus: { zh: '+1 冲刺格', en: '+1 dash pip' } },
  bonk: { icon: '💥', color: '#ff9a3c', name: { zh: '碰撞', en: 'Bonk' }, bonus: { zh: '眩晕 +1秒', en: 'Dizzy +1s' } },
  guard: { icon: '🛡', color: '#4ee08a', name: { zh: '守护', en: 'Guard' }, bonus: { zh: '+1 爱心并回满', en: '+1 heart & heal' } },
  star: { icon: '✦', color: '#ffd84a', name: { zh: '星能', en: 'Star' }, bonus: { zh: '新星充能 +20%', en: 'Nova charge +20%' } },
};

export const CARDS = [
  // ⚡ DASH
  { id: 'boots', tag: 'dash', rarity: 'common', icon: '👟', starter: true, name: { zh: '疾风鞋', en: 'Turbo Boots' }, desc: { zh: '冲刺更远', en: 'Dash farther' }, values: [0.12, 0.24, 0.36] },
  { id: 'battery', tag: 'dash', rarity: 'rare', icon: '🔋', starter: true, name: { zh: '大电池', en: 'Big Battery' }, desc: { zh: '体力上限提高', en: 'More max stamina' }, values: [30, 60, 90] },
  { id: 'quick', tag: 'dash', rarity: 'common', icon: '⏩', starter: true, name: { zh: '快充', en: 'Quick Charge' }, desc: { zh: '体力恢复更快', en: 'Stamina refills faster' }, values: [0.25, 0.5, 0.75] },
  { id: 'comet', tag: 'dash', rarity: 'rare', icon: '☄️', name: { zh: '彗星尾迹', en: 'Comet Trail' }, desc: { zh: '冲刺留下尾迹，碰到的方块眩晕', en: 'Dash trail makes cubes dizzy' }, values: [1.0, 1.5, 2.0] },
  { id: 'justright', tag: 'dash', rarity: 'epic', icon: '🎯', name: { zh: '刚刚好', en: 'Just Right' }, desc: { zh: '完美冲刺更容易，冲击波更大', en: 'Easier Perfects, bigger shockwave' }, values: [0.04, 0.08, 0.12] },
  // 💥 BONK
  { id: 'punch', tag: 'bonk', rarity: 'common', icon: '🥊', starter: true, name: { zh: '弹弹拳', en: 'Boing Punch' }, desc: { zh: '撞飞得更远', en: 'Knock cubes farther' }, values: [0.25, 0.5, 0.75] },
  { id: 'chain', tag: 'bonk', rarity: 'rare', icon: '🎱', name: { zh: '连环碰', en: 'Chain Bonk' }, desc: { zh: '被撞的方块多弹几次', en: 'Knocked cubes bounce more' }, values: [1, 2, 3] },
  { id: 'rim', tag: 'bonk', rarity: 'rare', icon: '🧱', starter: true, name: { zh: '弹力墙', en: 'Bumper Rim' }, desc: { zh: '场地边缘把方块弹回来', en: 'Arena rim bounces cubes back' }, values: [1.0, 1.2, 1.4] },
  { id: 'stars', tag: 'bonk', rarity: 'common', icon: '💫', starter: true, name: { zh: '眼冒金星', en: 'Super Stars' }, desc: { zh: '眩晕时间更长', en: 'Dizzy lasts longer' }, values: [0.4, 0.8, 1.2] },
  { id: 'pop', tag: 'bonk', rarity: 'epic', icon: '🍬', name: { zh: '爆爆糖', en: 'Pop Rocks' }, desc: { zh: '解救时炸开，推开周围方块', en: 'Freed cubes burst and shove neighbours' }, values: [1.5, 2.0, 2.5] },
  // 🛡 GUARD
  { id: 'sats', tag: 'guard', rarity: 'rare', icon: '🛰️', starter: true, name: { zh: '卫星小方', en: 'Buddy Sats' }, desc: { zh: '小卫星环绕你，撞晕方块', en: 'Orbiting buddies bonk cubes' }, values: [1, 2, 3] },
  { id: 'bubble', tag: 'guard', rarity: 'rare', icon: '🫧', name: { zh: '泡泡盾', en: 'Bubble Shield' }, desc: { zh: '挡住一次伤害，会自动恢复', en: 'Blocks a hit, then recharges' }, values: [12, 9, 6] },
  { id: 'snack', tag: 'guard', rarity: 'common', icon: '🍓', starter: true, name: { zh: '爱心零食', en: 'Heart Snack' }, desc: { zh: '+1 爱心上限并回复', en: '+1 max heart and heal' }, values: [1, 1, 1] },
  { id: 'friends', tag: 'guard', rarity: 'common', icon: '🤝', name: { zh: '朋友帮忙', en: 'Friend Help' }, desc: { zh: '被解救的方块帮你撞红方块', en: 'Freed cubes ram red cubes for you' }, values: [0.25, 0.5, 0.75] },
  { id: 'dodgeheal', tag: 'guard', rarity: 'rare', icon: '💚', name: { zh: '闪避达人', en: 'Dodge Heal' }, desc: { zh: '擦边闪避会回血', en: 'Near-misses heal you' }, values: [12, 9, 6] },
  // ✦ STAR
  { id: 'magnet', tag: 'star', rarity: 'common', icon: '🧲', starter: true, name: { zh: '水晶磁铁', en: 'Crystal Magnet' }, desc: { zh: '更远就能吸到水晶', en: 'Grab crystals from farther' }, values: [3.5, 5, 6.5] },
  { id: 'core', tag: 'star', rarity: 'rare', icon: '🔆', starter: true, name: { zh: '能量核心', en: 'Nova Core' }, desc: { zh: '新星充能更快', en: 'Nova charges faster' }, values: [0.15, 0.3, 0.45] },
  { id: 'mininova', tag: 'star', rarity: 'epic', icon: '🌟', name: { zh: '小新星', en: 'Mini Nova' }, desc: { zh: '解救几个方块就自动小爆炸', en: 'Auto mini-nova every few smashes' }, values: [12, 9, 6] },
  { id: 'timemagic', tag: 'star', rarity: 'epic', icon: '⏳', name: { zh: '时间魔法', en: 'Time Magic' }, desc: { zh: '完美冲刺慢动作更久，附近方块变慢', en: 'Longer Perfect slow-mo; nearby cubes slow down' }, values: [0.2, 0.4, 0.6] },
];

// Evolutions: card A at level III + card B owned → forced into the next offer, gold beam
export const EVOLUTIONS = [
  { id: 'meteor', from: ['boots', 'comet'], icon: '🌠', name: { zh: '流星冲刺', en: 'Meteor Dash' }, desc: { zh: '冲刺直接解救中小方块！尾迹变成火焰', en: 'Dash smashes small & medium cubes outright!' } },
  { id: 'pinball', from: ['chain', 'rim'], icon: '🕹️', name: { zh: '弹球风暴', en: 'Pinball Storm' }, desc: { zh: '方块弹来弹去，撞到眩晕的就解救', en: 'Cubes ricochet and smash dizzy ones' } },
  { id: 'guard', from: ['sats', 'bubble'], icon: '🌌', name: { zh: '银河卫队', en: 'Galaxy Guard' }, desc: { zh: '4颗卫星，碰到眩晕方块直接解救', en: '4 sats that smash dizzy cubes on touch' } },
  { id: 'supernova', from: ['core', 'mininova'], icon: '💥', name: { zh: '超新星', en: 'Supernova' }, desc: { zh: '新星范围x1.5，留下星星力场', en: 'Nova ×1.5 size, leaves a star field' } },
  { id: 'reaction', from: ['pop', 'stars'], icon: '🎆', name: { zh: '连锁反应', en: 'Chain Reaction' }, desc: { zh: '爆炸会引发更多爆炸！', en: 'Bursts set off more bursts!' } },
  { id: 'timestop', from: ['timemagic', 'justright'], icon: '⏱️', name: { zh: '时间停止', en: 'Time Stop' }, desc: { zh: '完美冲刺让所有方块定住1.5秒', en: 'Perfects freeze every cube for 1.5s' } },
];
export const CARD_RULES = { slots: 6, maxLevel: 3, offer: 3, epicPity: 4, epicPerWorld: 2, freeRerolls: 1 };

// ============ worlds ============
// Each world: one new enemy + one arena gimmick (kishōtenketsu), themed palette, music key.
// features: arena gimmicks built by world.js and queried by gameplay (see ARCHITECTURE §6 World)
export const WORLDS = [
  {
    id: 'cloud', index: 0, name: { zh: '云端港', en: 'Cloud Harbor' },
    desc: { zh: '漂浮在云海上的方块港口', en: 'A floating cube harbor above the clouds' },
    arenaRadius: 11, newEnemy: 'grumpy', gimmick: 'none', tokens: 3, maxAlive: 10,
    palette: { skyTop: 0x6fb6ff, skyBottom: 0xfbe7ff, fog: 0xdbeaff, floor: 0xf6e7c8, floorAlt: 0xefd9b0, grid: 0x8fc8ff, rim: 0x57d18a, rimGlow: 0x7dffc0, accent: 0xffffff, planet: 0xffb7d5, sun: 0xfff3c4 },
    enemyColor: 0xef4b3c, music: { bpm: 120, key: 'C', scale: 'majorPent' },
    boss: { module: 'base', rescue: 'mochi' },
  },
  {
    id: 'neon', index: 1, name: { zh: '霓虹星环', en: 'Neon Ring' },
    desc: { zh: '行星光环上的霓虹竞技场', en: 'A neon arena on a planetary ring' },
    arenaRadius: 12, newEnemy: 'zippy', gimmick: 'bumpers', tokens: 4, maxAlive: 16,
    features: { bumpers: [{ x: -5.5, z: -3, r: 0.9 }, { x: 5.5, z: -3, r: 0.9 }, { x: 0, z: 5.5, r: 0.9 }] },
    palette: { skyTop: 0x2a1b6e, skyBottom: 0xff7ad9, fog: 0x7a5cc8, floor: 0xe9e4ff, floorAlt: 0xd7cffc, grid: 0xff5fd2, rim: 0x39e6ff, rimGlow: 0x7ff6ff, accent: 0xff8af2, planet: 0x7ce7ff, sun: 0xffc6f2 },
    enemyColor: 0xf0453a, music: { bpm: 124, key: 'D', scale: 'majorPent' },
    boss: { module: 'charge', rescue: 'zap' },
  },
  {
    id: 'crystal', index: 2, name: { zh: '水晶月', en: 'Crystal Moon' },
    desc: { zh: '冰晶闪闪的月面，地板会打滑！', en: 'An icy crystal moon — slippery floors!' },
    arenaRadius: 12, newEnemy: 'splitter', gimmick: 'ice', tokens: 4, maxAlive: 20,
    features: { ice: [{ x: -4, z: 0, r: 3.2 }, { x: 4.5, z: -2.5, r: 2.6 }, { x: 1, z: 5, r: 2.4 }] },
    palette: { skyTop: 0x173a78, skyBottom: 0x9fe6ff, fog: 0xa9d8ff, floor: 0xeaf6ff, floorAlt: 0xd3ecff, grid: 0x7fd8ff, rim: 0x9d8cff, rimGlow: 0xd2c8ff, accent: 0xb9f3ff, planet: 0xd9f2ff, sun: 0xe8fbff },
    enemyColor: 0xee4150, music: { bpm: 128, key: 'E', scale: 'majorPent' },
    boss: { module: 'laser', rescue: 'stella' },
  },
  {
    id: 'nebula', index: 3, name: { zh: '爆爆星云', en: 'Bomb Nebula' },
    desc: { zh: '彩色星云里到处是会爆炸的方块', en: 'A candy nebula full of explosive cubes' },
    arenaRadius: 12.5, newEnemy: 'popper', gimmick: 'none', tokens: 5, maxAlive: 24,
    palette: { skyTop: 0x2b0d4f, skyBottom: 0xff9a5c, fog: 0x8a4a9a, floor: 0xfbe3f0, floorAlt: 0xf4cde3, grid: 0xffa24c, rim: 0xffd24a, rimGlow: 0xfff08a, accent: 0xff7ab8, planet: 0xff9cf0, sun: 0xffd9a0 },
    enemyColor: 0xf04a3a, music: { bpm: 132, key: 'F', scale: 'majorPent' },
    boss: { module: 'rain' },
  },
  {
    id: 'foundry', index: 4, name: { zh: '激光工厂', en: 'Laser Foundry' },
    desc: { zh: '太空工厂：传送带和激光！', en: 'A space factory of conveyors and lasers' },
    arenaRadius: 12.5, newEnemy: 'beamer', gimmick: 'conveyors', tokens: 5, maxAlive: 28,
    features: { conveyors: [{ x: 0, z: -4.5, w: 14, d: 2.2, dirX: 1, dirZ: 0, speed: 2.4 }, { x: 0, z: 4.5, w: 14, d: 2.2, dirX: -1, dirZ: 0, speed: 2.4 }] },
    palette: { skyTop: 0x0b1f3a, skyBottom: 0x36d1c4, fog: 0x2a6f8a, floor: 0xe6f1f5, floorAlt: 0xcfe2ea, grid: 0x3cffd1, rim: 0xff9f1c, rimGlow: 0xffd08a, accent: 0x3cffd1, planet: 0x9effe8, sun: 0xd6fff6 },
    enemyColor: 0xee3f3f, music: { bpm: 136, key: 'G', scale: 'majorPent' },
    boss: { module: 'double' },
  },
  {
    id: 'core', index: 5, name: { zh: '故障核心', en: 'Glitch Core' },
    desc: { zh: '一切故障的源头。地板会消失！', en: 'The source of the Glitch. Tiles vanish!' },
    arenaRadius: 13, newEnemy: 'bruiser', gimmick: 'glitchTiles', tokens: 6, maxAlive: 34,
    features: { glitchTiles: { count: 6, radius: 2.2, flicker: 1.0, gone: 3.0, every: 7 } },
    palette: { skyTop: 0x05030f, skyBottom: 0x4a1a8a, fog: 0x2a1450, floor: 0xece6ff, floorAlt: 0xd6cbff, grid: 0xff3df2, rim: 0x39e6ff, rimGlow: 0xa6f8ff, accent: 0xff3df2, planet: 0xff3df2, sun: 0xb6a6ff },
    enemyColor: 0xf03a4a, music: { bpm: 140, key: 'A', scale: 'minorPent' },
    boss: { module: 'final' },
  },
];

// ============ stages ============
// 5 per world: Ki (introduce) · Shō (develop) · Ten (twist) · Ketsu (exam) · Boss
// A stage = list of waves. Each wave = spawn groups; the wave clears when every
// cube is freed (or `time` elapses for timed waves). Cards come from XP level-ups.
// spawn group: { type, size?, count, pattern: 'portal'|'ring'|'line'|'sides'|'corners'|'center', delay, gap, opts }
//   opts: { sleep: true } sleeping cubes (wake within 3 u), { elite: 'shielded'|'speedy' }
// objective (★★★): { kind, target, icon }  kinds: chain, rimBonk, perfect, bombMulti, bumperBonk,
//   laserDizzy, bruiserBowl, noNova, coinCube, fastClear(seconds), novaMulti, iceBonk
const OBJ_ICONS = {
  chain: '⛓️', rimBonk: '🧱', perfect: '🎯', bombMulti: '💣', bumperBonk: '🔵', laserDizzy: '🔦',
  bruiserBowl: '🎳', coinCube: '🪙', fastClear: '⏱️', novaMulti: '✦', iceBonk: '🧊', freeAll: '🕊️',
};
const obj = (kind, target) => ({ kind, target, icon: OBJ_ICONS[kind] });

function G_(type, count, pattern = 'portal', extra = {}) { return { type, count, pattern, delay: 0, gap: 0.7, ...extra }; }

const STAGES = [
  // ---------------- World 1 · Cloud Harbor (Grumpy + BONK) ----------------
  [
    {
      name: { zh: '第一次相撞', en: 'First Bonk' }, tutorial: true, objective: obj('chain', 2), coinCube: false,
      waves: [
        { groups: [G_('grumpy', 1, 'portal', { size: 'M', speedMult: 0.66 })], tutorial: 'move' },
        { groups: [G_('grumpy', 1, 'portal', { size: 'M', speedMult: 0.66 }), G_('grumpy', 1, 'portal', { size: 'M', speedMult: 0.66, delay: 1.5 })], tutorial: 'bonk', steerTogether: 0.4 },
        { groups: [G_('grumpy', 2, 'center', { size: 'M', opts: { sleep: true } })], tutorial: 'knock' },
        { groups: [G_('grumpy', 6, 'ring', { size: 'S', speedMult: 0.8 })] },
        { groups: [G_('grumpy', 10, 'ring', { size: 'M', speedMult: 0.85 })], tutorial: 'blob' },
        { groups: [G_('grumpy', 12, 'ring', { size: 'S' }), G_('grumpy', 2, 'portal', { size: 'L', delay: 2 })], tutorial: 'nova', novaFill: true },
      ],
    },
    {
      name: { zh: '弹弹台球', en: 'Bonk Billiards' }, objective: obj('chain', 3),
      waves: [
        { groups: [G_('grumpy', 5, 'portal', { size: 'M' })] },
        { groups: [G_('grumpy', 4, 'center', { size: 'M', opts: { sleep: true } }), G_('grumpy', 3, 'portal', { size: 'S', delay: 2 })] },
        { groups: [G_('grumpy', 8, 'ring', { size: 'S' }), G_('grumpy', 2, 'portal', { size: 'L', delay: 3 })] },
        { groups: [G_('grumpy', 10, 'sides', { size: 'M' })] },
      ],
    },
    {
      name: { zh: '贪睡台球', en: 'Sleepy Billiards' }, objective: obj('rimBonk', 3),
      waves: [
        { groups: [G_('grumpy', 8, 'ring', { size: 'M', opts: { sleep: true } })] },
        { groups: [G_('grumpy', 10, 'ring', { size: 'S', opts: { sleep: true } }), G_('grumpy', 2, 'portal', { size: 'L', delay: 4 })] },
        { groups: [G_('grumpy', 12, 'ring', { size: 'M' })] },
        { groups: [G_('grumpy', 6, 'corners', { size: 'S' }), G_('grumpy', 6, 'portal', { size: 'M', delay: 3 })] },
      ],
    },
    {
      name: { zh: '方块大团子', en: 'The Big Blob' }, objective: obj('novaMulti', 8),
      waves: [
        { groups: [G_('grumpy', 12, 'ring', { size: 'S' })] },
        { groups: [G_('grumpy', 8, 'sides', { size: 'M' }), G_('grumpy', 3, 'portal', { size: 'L', delay: 3 })] },
        { groups: [G_('grumpy', 16, 'ring', { size: 'S' }), G_('grumpy', 4, 'portal', { size: 'M', delay: 4 })] },
        { groups: [G_('grumpy', 12, 'ring', { size: 'M' }), G_('grumpy', 4, 'portal', { size: 'L', delay: 5 })] },
        { groups: [G_('grumpy', 20, 'ring', { size: 'S' })] },
      ],
    },
    { name: { zh: '故障大王', en: 'King Glitch' }, boss: true, objective: obj('perfect', 2), waves: [{ groups: [], boss: true }] },
  ],
  // ---------------- World 2 · Neon Ring (Zippy + bumpers) ----------------
  [
    {
      name: { zh: '冲冲来了', en: 'Here Comes Zippy' }, objective: obj('perfect', 2), newEnemy: 'zippy',
      waves: [
        { groups: [G_('zippy', 1, 'portal')] },
        { groups: [G_('zippy', 2, 'sides'), G_('grumpy', 4, 'portal', { size: 'M', delay: 2 })] },
        { groups: [G_('grumpy', 8, 'ring', { size: 'S' }), G_('zippy', 2, 'portal', { delay: 3 })] },
        { groups: [G_('zippy', 3, 'portal'), G_('grumpy', 6, 'portal', { size: 'M', delay: 2 })] },
      ],
    },
    {
      name: { zh: '弹珠台', en: 'Pinball Table' }, objective: obj('bumperBonk', 4),
      waves: [
        { groups: [G_('grumpy', 8, 'portal', { size: 'M' })] },
        { groups: [G_('grumpy', 6, 'ring', { size: 'S', opts: { sleep: true } }), G_('zippy', 2, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 10, 'sides', { size: 'M' }), G_('zippy', 2, 'portal', { delay: 4 })] },
        { groups: [G_('grumpy', 12, 'ring', { size: 'S' }), G_('grumpy', 3, 'portal', { size: 'L', delay: 3 })] },
      ],
    },
    {
      name: { zh: '十字冲锋', en: 'Cross Charge' }, objective: obj('perfect', 4),
      waves: [
        { groups: [G_('zippy', 4, 'corners')] },
        { groups: [G_('zippy', 4, 'sides'), G_('grumpy', 6, 'ring', { size: 'S', delay: 2 })] },
        { groups: [G_('zippy', 6, 'ring'), G_('grumpy', 4, 'portal', { size: 'M', delay: 3 })] },
        { groups: [G_('grumpy', 12, 'ring', { size: 'M' }), G_('zippy', 4, 'corners', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '霓虹考验', en: 'Neon Trial' }, objective: obj('chain', 4),
      waves: [
        { groups: [G_('grumpy', 12, 'ring', { size: 'S' }), G_('zippy', 2, 'portal', { delay: 2 })] },
        { groups: [G_('grumpy', 10, 'sides', { size: 'M' }), G_('zippy', 3, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 16, 'ring', { size: 'S' }), G_('grumpy', 4, 'portal', { size: 'L', delay: 3 }), G_('zippy', 3, 'corners', { delay: 6 })] },
        { groups: [G_('grumpy', 14, 'ring', { size: 'M' }), G_('zippy', 4, 'portal', { delay: 4 })] },
      ],
    },
    { name: { zh: '冲撞大王', en: 'Rocket King' }, boss: true, objective: obj('perfect', 3), waves: [{ groups: [], boss: true }] },
  ],
  // ---------------- World 3 · Crystal Moon (Splitter + ice) ----------------
  [
    {
      name: { zh: '一分为二', en: 'Split in Two' }, objective: obj('chain', 4), newEnemy: 'splitter',
      waves: [
        { groups: [G_('splitter', 2, 'portal')] },
        { groups: [G_('splitter', 3, 'sides'), G_('grumpy', 4, 'portal', { size: 'M', delay: 2 })] },
        { groups: [G_('grumpy', 10, 'ring', { size: 'S' }), G_('splitter', 3, 'portal', { delay: 3 })] },
        { groups: [G_('splitter', 5, 'ring'), G_('zippy', 2, 'portal', { delay: 4 })] },
      ],
    },
    {
      name: { zh: '溜冰场', en: 'Ice Rink' }, objective: obj('iceBonk', 5),
      waves: [
        { groups: [G_('grumpy', 10, 'ring', { size: 'M' })] },
        { groups: [G_('splitter', 4, 'corners'), G_('grumpy', 6, 'portal', { size: 'S', delay: 2 })] },
        { groups: [G_('grumpy', 14, 'ring', { size: 'S' }), G_('zippy', 3, 'portal', { delay: 3 })] },
        { groups: [G_('splitter', 6, 'ring'), G_('grumpy', 3, 'portal', { size: 'L', delay: 4 })] },
      ],
    },
    {
      name: { zh: '水晶雪崩', en: 'Crystal Avalanche' }, objective: obj('chain', 6),
      waves: [
        { groups: [G_('splitter', 6, 'ring')] },
        { groups: [G_('splitter', 6, 'ring'), G_('zippy', 2, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 18, 'ring', { size: 'S' }), G_('splitter', 4, 'portal', { delay: 4 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('grumpy', 4, 'portal', { size: 'L', delay: 5 })] },
      ],
    },
    {
      name: { zh: '月面考验', en: 'Moon Trial' }, objective: obj('fastClear', 150),
      waves: [
        { groups: [G_('grumpy', 14, 'ring', { size: 'S' }), G_('splitter', 3, 'portal', { delay: 2 })] },
        { groups: [G_('splitter', 6, 'sides'), G_('zippy', 3, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 16, 'ring', { size: 'M' }), G_('splitter', 4, 'corners', { delay: 4 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('zippy', 4, 'corners', { delay: 3 }), G_('grumpy', 4, 'portal', { size: 'L', delay: 6 })] },
      ],
    },
    { name: { zh: '激光大王', en: 'Laser King' }, boss: true, objective: obj('perfect', 3), waves: [{ groups: [], boss: true }] },
  ],
  // ---------------- World 4 · Bomb Nebula (Popper) ----------------
  [
    {
      name: { zh: '砰砰方', en: 'Boom Boom' }, objective: obj('bombMulti', 3), newEnemy: 'popper',
      waves: [
        { groups: [G_('popper', 1, 'portal'), G_('grumpy', 5, 'ring', { size: 'M', delay: 1 })] },
        { groups: [G_('grumpy', 8, 'ring', { size: 'S' }), G_('popper', 2, 'portal', { delay: 2 })] },
        { groups: [G_('grumpy', 10, 'sides', { size: 'M' }), G_('popper', 3, 'portal', { delay: 3 })] },
        { groups: [G_('splitter', 4, 'ring'), G_('popper', 3, 'portal', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '烟花派对', en: 'Firework Party' }, objective: obj('bombMulti', 5),
      waves: [
        { groups: [G_('grumpy', 12, 'ring', { size: 'S' }), G_('popper', 3, 'corners', { delay: 1 })] },
        { groups: [G_('zippy', 3, 'portal'), G_('popper', 3, 'portal', { delay: 2 })] },
        { groups: [G_('grumpy', 16, 'ring', { size: 'M' }), G_('popper', 4, 'portal', { delay: 3 })] },
        { groups: [G_('splitter', 6, 'ring'), G_('popper', 4, 'corners', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '爆炸台球', en: 'Bomb Billiards' }, objective: obj('bombMulti', 6),
      waves: [
        { groups: [G_('grumpy', 12, 'ring', { size: 'M', opts: { sleep: true } }), G_('popper', 4, 'center', { opts: { sleep: true } })] },
        { groups: [G_('grumpy', 16, 'ring', { size: 'S' }), G_('popper', 4, 'portal', { delay: 2 })] },
        { groups: [G_('splitter', 6, 'sides'), G_('popper', 5, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 18, 'ring', { size: 'M' }), G_('popper', 6, 'corners', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '星云考验', en: 'Nebula Trial' }, objective: obj('chain', 6),
      waves: [
        { groups: [G_('grumpy', 16, 'ring', { size: 'S' }), G_('popper', 3, 'portal', { delay: 2 })] },
        { groups: [G_('zippy', 4, 'corners'), G_('splitter', 4, 'portal', { delay: 3 })] },
        { groups: [G_('grumpy', 18, 'ring', { size: 'M' }), G_('popper', 4, 'portal', { delay: 3 }), G_('grumpy', 3, 'portal', { size: 'L', delay: 6 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('popper', 5, 'corners', { delay: 3 }), G_('zippy', 3, 'portal', { delay: 6 })] },
      ],
    },
    { name: { zh: '方块雨大王', en: 'Raining King' }, boss: true, objective: obj('perfect', 3), waves: [{ groups: [], boss: true }] },
  ],
  // ---------------- World 5 · Laser Foundry (Beamer + conveyors) ----------------
  [
    {
      name: { zh: '激光警报', en: 'Laser Alert' }, objective: obj('laserDizzy', 5), newEnemy: 'beamer',
      waves: [
        { groups: [G_('beamer', 1, 'center'), G_('grumpy', 6, 'ring', { size: 'M', delay: 1 })] },
        { groups: [G_('beamer', 2, 'sides'), G_('grumpy', 10, 'ring', { size: 'S', delay: 1 })] },
        { groups: [G_('beamer', 2, 'sides'), G_('zippy', 3, 'portal', { delay: 2 }), G_('grumpy', 8, 'ring', { size: 'M', delay: 3 })] },
        { groups: [G_('beamer', 3, 'ring'), G_('popper', 3, 'portal', { delay: 2 }), G_('grumpy', 10, 'ring', { size: 'S', delay: 3 })] },
      ],
    },
    {
      name: { zh: '传送带', en: 'Conveyor Chaos' }, objective: obj('chain', 6),
      waves: [
        { groups: [G_('grumpy', 14, 'ring', { size: 'M' })] },
        { groups: [G_('beamer', 2, 'sides'), G_('splitter', 5, 'ring', { delay: 2 })] },
        { groups: [G_('grumpy', 18, 'ring', { size: 'S' }), G_('popper', 3, 'portal', { delay: 3 }), G_('beamer', 1, 'center', { delay: 1 })] },
        { groups: [G_('zippy', 4, 'corners'), G_('grumpy', 12, 'ring', { size: 'M', delay: 2 }), G_('beamer', 2, 'sides', { delay: 1 })] },
      ],
    },
    {
      name: { zh: '借光打光', en: 'Borrowed Beams' }, objective: obj('laserDizzy', 10),
      waves: [
        { groups: [G_('beamer', 3, 'ring'), G_('grumpy', 12, 'ring', { size: 'S', delay: 1 })] },
        { groups: [G_('beamer', 2, 'sides'), G_('grumpy', 16, 'ring', { size: 'M', delay: 1 })] },
        { groups: [G_('beamer', 3, 'ring'), G_('splitter', 6, 'portal', { delay: 2 }), G_('popper', 3, 'portal', { delay: 4 })] },
        { groups: [G_('beamer', 4, 'ring'), G_('grumpy', 20, 'ring', { size: 'S', delay: 2 })] },
      ],
    },
    {
      name: { zh: '工厂考验', en: 'Foundry Trial' }, objective: obj('fastClear', 170),
      waves: [
        { groups: [G_('grumpy', 18, 'ring', { size: 'S' }), G_('beamer', 2, 'sides', { delay: 1 })] },
        { groups: [G_('zippy', 4, 'corners'), G_('popper', 4, 'portal', { delay: 2 }), G_('splitter', 4, 'portal', { delay: 4 })] },
        { groups: [G_('grumpy', 20, 'ring', { size: 'M' }), G_('beamer', 3, 'ring', { delay: 1 }), G_('grumpy', 3, 'portal', { size: 'L', delay: 5 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('zippy', 4, 'corners', { delay: 3 }), G_('popper', 4, 'portal', { delay: 5 }), G_('beamer', 2, 'sides', { delay: 1 })] },
      ],
    },
    { name: { zh: '双砸大王', en: 'Double King' }, boss: true, objective: obj('perfect', 4), waves: [{ groups: [], boss: true }] },
  ],
  // ---------------- World 6 · Glitch Core (Bruiser + glitch tiles) ----------------
  [
    {
      name: { zh: '铁头来了', en: 'Iron Heads' }, objective: obj('bruiserBowl', 3), newEnemy: 'bruiser',
      waves: [
        { groups: [G_('bruiser', 1, 'portal'), G_('grumpy', 8, 'ring', { size: 'S', delay: 1 })] },
        { groups: [G_('bruiser', 2, 'sides'), G_('grumpy', 10, 'ring', { size: 'M', delay: 1 })] },
        { groups: [G_('bruiser', 2, 'portal'), G_('popper', 4, 'portal', { delay: 2 }), G_('grumpy', 10, 'ring', { size: 'S', delay: 3 })] },
        { groups: [G_('bruiser', 3, 'ring'), G_('zippy', 4, 'corners', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '保龄球', en: 'Cube Bowling' }, objective: obj('bruiserBowl', 5),
      waves: [
        { groups: [G_('bruiser', 2, 'sides'), G_('grumpy', 14, 'ring', { size: 'S', delay: 1 })] },
        { groups: [G_('bruiser', 3, 'ring'), G_('splitter', 5, 'portal', { delay: 2 })] },
        { groups: [G_('bruiser', 2, 'portal'), G_('beamer', 2, 'sides', { delay: 1 }), G_('grumpy', 16, 'ring', { size: 'M', delay: 3 })] },
        { groups: [G_('bruiser', 4, 'ring'), G_('popper', 5, 'portal', { delay: 3 })] },
      ],
    },
    {
      name: { zh: '故障风暴', en: 'Glitch Storm' }, objective: obj('chain', 8),
      waves: [
        { groups: [G_('grumpy', 20, 'ring', { size: 'S' }), G_('bruiser', 2, 'portal', { delay: 2 })] },
        { groups: [G_('zippy', 6, 'ring'), G_('popper', 4, 'portal', { delay: 3 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('beamer', 3, 'ring', { delay: 1 }), G_('bruiser', 2, 'portal', { delay: 4 })] },
        { groups: [G_('grumpy', 24, 'ring', { size: 'M' }), G_('bruiser', 3, 'portal', { delay: 4 }), G_('popper', 4, 'corners', { delay: 6 })] },
      ],
    },
    {
      name: { zh: '最终考验', en: 'Final Trial' }, objective: obj('novaMulti', 15),
      waves: [
        { groups: [G_('grumpy', 20, 'ring', { size: 'S' }), G_('zippy', 4, 'corners', { delay: 2 })] },
        { groups: [G_('splitter', 8, 'ring'), G_('popper', 5, 'portal', { delay: 2 }), G_('beamer', 2, 'sides', { delay: 1 })] },
        { groups: [G_('bruiser', 4, 'ring'), G_('grumpy', 20, 'ring', { size: 'M', delay: 3 })] },
        { groups: [G_('grumpy', 26, 'ring', { size: 'S' }), G_('bruiser', 3, 'portal', { delay: 3 }), G_('zippy', 4, 'corners', { delay: 5 }), G_('popper', 4, 'portal', { delay: 7 })] },
      ],
    },
    { name: { zh: '故障核心', en: 'The Glitch Core' }, boss: true, objective: obj('perfect', 5), waves: [{ groups: [], boss: true }] },
  ],
];

// attach stages to worlds
WORLDS.forEach((w, wi) => {
  w.stages = STAGES[wi].map((s, si) => ({
    id: `${wi + 1}-${si + 1}`, world: wi, index: si, kind: s.boss ? 'boss' : s.tutorial ? 'tutorial' : 'normal',
    coinCube: s.coinCube !== false && !s.boss,
    ...s,
  }));
});

// ============ modes ============
export const MODES = {
  stage: { name: { zh: '冒险', en: 'Adventure' } },
  endless: {
    name: { zh: '银河生存', en: 'Galaxy Survival' }, desc: { zh: '无尽方块，挑战最高分！', en: 'Endless cubes — chase your best!' },
    unlock: { world: 0 }, arenaRadius: 14, worldCycleEvery: 5,
    wave: { baseCount: 8, countGrowth: 2.2, maxAlive: 80, bossEvery: 10, eliteEvery: 3 },
    warpGate: { every: 60, open: 10, bank: 1.25 },   // push-your-luck safe exit
  },
  storm: {
    name: { zh: '风暴缩圈', en: 'Shrink Storm' }, desc: { zh: '场地越来越小，坚持住！', en: 'The arena shrinks — hold on!' },
    unlock: { world: 1 }, time: 150, radii: [14, 11, 8.5, 6.5, 5], at: [30, 60, 90, 120], stormTick: 1.5, medals: [25, 40, 55],
  },
  rush: {
    name: { zh: '首领连战', en: 'Boss Rush' }, desc: { zh: '连续挑战故障大王', en: 'King Glitch, back to back' },
    unlock: { world: 1 }, heartsRefill: 1,
  },
  daily: {
    name: { zh: '每日挑战', en: 'Daily Challenge' }, desc: { zh: '每天一个新花样', en: 'A new twist every day' },
    unlock: { world: 0 }, waves: 8,
  },
};

// Daily mutators (date-seeded) — used by endless and daily challenge
export const MUTATORS = [
  { id: 'bouncy', icon: '🏀', name: { zh: '弹弹地板', en: 'Bouncy Floor' }, desc: { zh: '所有方块都会弹跳', en: 'Everything bounces' }, knockMult: 1.4 },
  { id: 'tiny', icon: '🐜', name: { zh: '小不点', en: 'Tiny Town' }, desc: { zh: '全是小方块，但数量翻倍', en: 'All tiny cubes, twice as many' }, forceSize: 'S', countMult: 1.8 },
  { id: 'bombs', icon: '💣', name: { zh: '炸弹狂欢', en: 'Bomb Party' }, desc: { zh: '到处是爆爆方', en: 'Poppers everywhere' }, extraType: 'popper' },
  { id: 'zippy', icon: '🚀', name: { zh: '全员冲刺', en: 'Zippy Rush' }, desc: { zh: '冲冲方大集合', en: 'All Zippies' }, extraType: 'zippy' },
  { id: 'giant', icon: '🦣', name: { zh: '巨人模式', en: 'Giant Mode' }, desc: { zh: '方块更大更慢', en: 'Bigger, slower cubes' }, forceSize: 'L', countMult: 0.6 },
  { id: 'star', icon: '⭐', name: { zh: '星星雨', en: 'Star Shower' }, desc: { zh: '新星充能翻倍', en: 'Double Nova charge' }, novaMult: 2 },
  { id: 'glass', icon: '🫙', name: { zh: '玻璃大炮', en: 'Glass Cannon' }, desc: { zh: '只有3颗心，但分数x2', en: '3 hearts, double score' }, hearts: 3, scoreMult: 2 },
  { id: 'speed', icon: '💨', name: { zh: '加速星期', en: 'Speed Day' }, desc: { zh: '大家都更快！', en: 'Everyone is faster!' }, speedMult: 1.2 },
];

// ============ economy & meta ============
// Spendable: coins 金币 + capsule tickets 扭蛋券. Progress-only (never spent, never lost):
// 解救数 freed cubes (drives Star Road), 奖杯 trophies (drive Rank), stage stars.
export const ECONOMY = {
  stageClear: { base: 30, perWorld: 5, firstBonus: 50, perNewStar: 20, bossFirst: 150 },
  fail: { base: 10, perTwoFreed: 1 },
  endless: { perWave: 6, perThousandScore: 3 },
  modeMedal: [25, 40, 60],
  daily: { clear: 80 },
  firstWinOfDayMult: 2,
  rested: { awayMinutes: 15, runs: 3, mult: 1.5 },     // breaks earn a bonus (never punish)
  capsule: { tickets: 1, dailyCap: 20, freeOnboarding: 3 },   // tickets are ONLY earned; no coin gacha
  prices: { common: 400, rare: 900, epic: 2000, legend: 5000 },
  refund: { common: 80, rare: 200, epic: 500, legend: 1200 },
  missionBank: 9,
  missionReward: { easy: { coins: 60 }, skill: { coins: 90 }, variety: { coins: 90 } },
  dailyChest: { coins: 100, tickets: 1 },
  worldChests: [{ stars: 5, reward: { coins: 150 } }, { stars: 10, reward: { tickets: 1 } }, { stars: 15, reward: { worldHat: true } }],
  trophies: { firstStar: 10, bossFirst: 25, modeMedal: [4, 7, 10], endlessPar: { base: 4, perWave: 3, max: 30, pbBonus: 5 }, assistMult: 0.5 },
  welcomeBack: { days: 7, coins: 300, tickets: 1 },
};

// Star Road 星途 — free, permanent, driven by total cubes freed (解救数). Never paywalled.
export const ROAD = [
  { at: 15, reward: { coins: 100 } },
  { at: 40, reward: { hat: 'antenna' } },
  { at: 75, reward: { card: 'comet' } },
  { at: 120, reward: { tickets: 1 } },
  { at: 170, reward: { skin: 'blu_mint' } },
  { at: 230, reward: { card: 'chain' } },
  { at: 300, reward: { hero: 'zap' } },
  { at: 380, reward: { coins: 200 } },
  { at: 470, reward: { card: 'bubble' } },
  { at: 570, reward: { trail: 'lightning' } },
  { at: 680, reward: { tickets: 2 } },
  { at: 800, reward: { card: 'pop' } },
  { at: 930, reward: { hero: 'mochi' } },
  { at: 1070, reward: { card: 'friends' } },
  { at: 1220, reward: { hat: 'headphones' } },
  { at: 1380, reward: { card: 'mininova' } },
  { at: 1550, reward: { tickets: 2 } },
  { at: 1730, reward: { card: 'justright' } },
  { at: 1920, reward: { hero: 'stella' } },
  { at: 2120, reward: { trail: 'rainbow' } },
  { at: 2330, reward: { card: 'timemagic' } },
  { at: 2550, reward: { skin: 'blu_galaxy' } },
  { at: 2780, reward: { card: 'dodgeheal' } },
  { at: 3020, reward: { tickets: 3 } },
  { at: 3300, reward: { hat: 'crown' } },
  { at: 3600, reward: { coins: 800 } },
  { at: 4000, reward: { skin: 'blu_gold' } },
  { at: 4500, reward: { hat: 'halo' } },
  { at: 5000, reward: { title: 'roadLegend', tickets: 5 } },
];
export const ROAD_OVERFLOW = { every: 400, rewards: [{ coins: 150 }, { tickets: 1 }] };

// Daily missions — 3 slots per day (easy / skill / variety); unfinished ones bank up to 9,
// completed-but-unclaimed ones are auto-granted at the daily refresh. n = [low, mid, high] by rank bucket.
export const MISSIONS = [
  { id: 'free', slot: 'easy', icon: '🕊️', text: { zh: '解救 {n} 个方块', en: 'Free {n} cubes' }, stat: 'freed', n: [60, 120, 200] },
  { id: 'crystal', slot: 'easy', icon: '💎', text: { zh: '收集 {n} 个水晶', en: 'Collect {n} crystals' }, stat: 'crystals', n: [150, 300, 500] },
  { id: 'clears', slot: 'easy', icon: '🏁', text: { zh: '通关 {n} 次', en: 'Clear {n} stages' }, stat: 'clears', n: [2, 3, 4] },
  { id: 'bonk', slot: 'skill', icon: '💫', text: { zh: '让方块相撞 {n} 次', en: 'Make {n} BONKs' }, stat: 'bonks', n: [8, 15, 25] },
  { id: 'perfect', slot: 'skill', icon: '🎯', text: { zh: '完美冲刺 {n} 次', en: '{n} Perfect Dashes' }, stat: 'perfects', n: [3, 6, 12] },
  { id: 'near', slot: 'skill', icon: '🌬️', text: { zh: '擦边闪避 {n} 次', en: '{n} near-misses' }, stat: 'nearMisses', n: [20, 40, 70] },
  { id: 'combo', slot: 'skill', icon: '🔥', text: { zh: '一局连击 {n}', en: 'Reach a {n} combo' }, stat: 'bestComboRun', n: [10, 20, 35], max: true },
  { id: 'novaMulti', slot: 'skill', icon: '✦', text: { zh: '一次新星解救 {n} 个', en: 'Free {n} with one Nova' }, stat: 'bestNovaRun', n: [5, 10, 15], max: true },
  { id: 'hero', slot: 'variety', icon: '🦸', text: { zh: '用{hero}完成一局', en: 'Finish a run as {hero}' }, stat: 'runsAsHero', n: [1, 1, 1], hero: true },
  { id: 'endless', slot: 'variety', icon: '🌌', text: { zh: '银河生存到第 {n} 波', en: 'Reach wave {n} in Survival' }, stat: 'endlessWave', n: [4, 7, 10], max: true, needs: 'endless' },
  { id: 'star3', slot: 'variety', icon: '⭐', text: { zh: '把一关拿到三星', en: 'Get 3 stars on a stage' }, stat: 'newThreeStar', n: [1, 1, 1] },
  { id: 'boss', slot: 'variety', icon: '👑', text: { zh: '打败故障大王', en: 'Beat King Glitch' }, stat: 'bossKills', n: [1, 1, 1] },
];

// Sign-in 签到 — cumulative days (累计, never a streak). Novice 7 days, then a gentle loop.
export const SIGNIN = {
  novice: [{ coins: 200 }, { hat: 'flower' }, { tickets: 2 }, { trail: 'hearts' }, { coins: 500 }, { skin: 'blu_berry' }, { hero: 'zap', title: 'newStar' }],
  loop: [{ coins: 100 }, { tickets: 1 }, { coins: 150 }, { coins: 200 }, { tickets: 1 }, { coins: 250 }, { tickets: 2, coins: 300 }],
};

// Rank 段位 — material tiers × ★★★ (stars = trophy thresholds). Trophies never decrease; no demotion; no opponents.
export const RANKS = [
  { id: 'wood', icon: '🪵', color: '#c89a6a', name: { zh: '木块', en: 'Wood' }, stars: [0, 20, 45] },
  { id: 'stone', icon: '🪨', color: '#a9b4c2', name: { zh: '石块', en: 'Stone' }, stars: [75, 110, 150] },
  { id: 'bronze', icon: '🥉', color: '#d9905a', name: { zh: '铜块', en: 'Bronze' }, stars: [195, 245, 300] },
  { id: 'silver', icon: '🥈', color: '#cfd8e6', name: { zh: '银块', en: 'Silver' }, stars: [360, 425, 495] },
  { id: 'gold', icon: '🥇', color: '#ffd24a', name: { zh: '金块', en: 'Gold' }, stars: [570, 650, 735] },
  { id: 'crystal', icon: '🔷', color: '#7fe3ff', name: { zh: '水晶', en: 'Crystal' }, stars: [825, 920, 1020] },
  { id: 'diamond', icon: '💎', color: '#8fb8ff', name: { zh: '钻石', en: 'Diamond' }, stars: [1125, 1235, 1350] },
  { id: 'rainbow', icon: '🌈', color: '#ff8ad8', name: { zh: '彩虹', en: 'Rainbow' }, stars: [1470, 1600, 1740] },
  { id: 'legend', icon: '👑', color: '#ffb21e', name: { zh: '银河传说', en: 'Galaxy Legend' }, stars: [1900], legendEvery: 150 },
];
export const RANK_PAR = [3, 4, 5, 6, 7, 8, 10, 12, 14];   // endless par wave per tier
export const RANK_REWARD = { starUp: { coins: 100 }, tierUp: { tickets: 1 }, tierUpHigh: { tickets: 2 } };

// Achievements — 3 tiers (bronze/silver/gold); gold grants a title
export const ACHIEVEMENTS = [
  { id: 'perfect', icon: '🎯', name: { zh: '完美冲刺者', en: 'Perfect Dasher' }, stat: 'perfects', tiers: [10, 100, 1000] },
  { id: 'bonk', icon: '💫', name: { zh: 'BONK大王', en: 'BONK King' }, stat: 'bonks', tiers: [20, 200, 2000] },
  { id: 'near', icon: '🌬️', name: { zh: '擦边高手', en: 'Close Call' }, stat: 'nearMisses', tiers: [50, 500, 5000] },
  { id: 'freed', icon: '🕊️', name: { zh: '救援队长', en: 'Rescuer' }, stat: 'freed', tiers: [100, 1000, 10000] },
  { id: 'combo', icon: '🔥', name: { zh: '连击之星', en: 'Combo Star' }, stat: 'bestCombo', tiers: [20, 50, 100] },
  { id: 'popper', icon: '💣', name: { zh: '爆破专家', en: 'Demolition' }, stat: 'popperFreed', tiers: [5, 50, 500] },
  { id: 'stars', icon: '⭐', name: { zh: '摘星星', en: 'Star Collector' }, stat: 'totalStars', tiers: [15, 45, 90] },
  { id: 'nohit', icon: '🛡️', name: { zh: '不败小蓝', en: 'Untouchable' }, stat: 'noHitClears', tiers: [1, 10, 30] },
  { id: 'survivor', icon: '🌌', name: { zh: '银河幸存者', en: 'Galaxy Survivor' }, stat: 'endlessBest', tiers: [10, 20, 30] },
  { id: 'supernova', icon: '✦', name: { zh: '超新星', en: 'Supernova' }, stat: 'bestNova', tiers: [8, 15, 25] },
  { id: 'coin', icon: '🪙', name: { zh: '金币猎人', en: 'Coin Hunter' }, stat: 'coinCubes', tiers: [1, 5, 20] },
  { id: 'dex', icon: '📖', name: { zh: '图鉴学者', en: 'Dex Scholar' }, stat: 'dexFound', tiers: [3, 6, 8] },
  { id: 'fashion', icon: '🎀', name: { zh: '时尚达人', en: 'Fashionista' }, stat: 'cosmetics', tiers: [3, 10, 20] },
  { id: 'boss', icon: '👑', name: { zh: '拯救银河', en: 'Galaxy Saver' }, stat: 'bossKills', tiers: [1, 3, 6] },
  { id: 'evolve', icon: '🧬', name: { zh: '进化大师', en: 'Evolver' }, stat: 'evolutions', tiers: [1, 10, 50] },
  { id: 'rest', icon: '😴', name: { zh: '休息好孩子', en: 'Well Rested' }, stat: 'breaks', tiers: [1, 5, 20] },
];
export const ACH_REWARD = [{ coins: 50 }, { coins: 150 }, { tickets: 1, title: true }];

// Cube-dex 方块图鉴 — enemies turn happy when freed. Milestones per entry.
export const DEX = {
  entries: ['grumpy', 'zippy', 'splitter', 'popper', 'beamer', 'bruiser', 'coin', 'king'],
  freedName: {
    grumpy: { zh: '开心方', en: 'Smiley' }, zippy: { zh: '慢慢方', en: 'Chill Zippy' }, splitter: { zh: '双胞方', en: 'Twinny' },
    popper: { zh: '烟花方', en: 'Sparkle' }, beamer: { zh: '灯塔方', en: 'Lighthouse' }, bruiser: { zh: '抱抱方', en: 'Hugger' },
    coin: { zh: '财宝方', en: 'Treasure' }, king: { zh: '好心大王', en: 'Kind King' },
  },
  fact: {
    grumpy: { zh: '怒怒方最爱挤在一起——所以才会撞晕！', en: 'Grumpies love to crowd together — that’s why they bonk!' },
    zippy: { zh: '冲冲方只会直线冲刺，转弯可不行。', en: 'Zippy only runs in straight lines. Turning is hard!' },
    splitter: { zh: '分分方其实是两个好朋友粘在一起。', en: 'A Splitter is really two best friends stuck together.' },
    popper: { zh: '爆爆方的引线越闪越快，快跑！', en: 'The faster the fuse blinks, the sooner it pops!' },
    beamer: { zh: '激光方扫完一圈会热得冒烟。', en: 'Beamers overheat after every sweep.' },
    bruiser: { zh: '铁头方的头盔要撞三下才会晃。', en: 'Bruiser helmets need three knocks to wobble.' },
    coin: { zh: '金币方超级胆小，看到你就跑。', en: 'Coin Cubes are super shy — they run away!' },
    king: { zh: '故障大王其实只是想要一个拥抱。', en: 'King Glitch just wanted a hug all along.' },
  },
  milestones: [{ n: 1, reward: { coins: 20 } }, { n: 25, reward: { coins: 50 } }, { n: 100, reward: { coins: 100 } }, { n: 300, reward: { tickets: 1 } }],
};

// Titles 称号 (profile card)
export const TITLES = {
  newStar: { zh: '星际新星', en: 'Rising Star' },
  roadLegend: { zh: '星途传奇', en: 'Road Legend' },
};

// ============ cosmetics ============
// Every item is always listed with its source; shop:true items are buyable at ECONOMY.prices[rarity]
// forever (no timers, no rotation) and can drop from the capsule. default:true items are owned from the start.
export const SKINS = [
  { id: 'blu_default', hero: 'blu', color: 0x2f6bff, name: { zh: '经典蓝', en: 'Classic' }, rarity: 'common', default: true },
  { id: 'blu_mint', hero: 'blu', color: 0x35d6c0, name: { zh: '薄荷糖', en: 'Mint' }, rarity: 'common', shop: true },
  { id: 'blu_berry', hero: 'blu', color: 0x7a5cff, name: { zh: '蓝莓', en: 'Blueberry' }, rarity: 'rare', shop: true },
  { id: 'blu_astro', hero: 'blu', color: 0xf2f6ff, pattern: 'shine', name: { zh: '宇航员', en: 'Astronaut' }, rarity: 'epic', shop: true },
  { id: 'blu_galaxy', hero: 'blu', color: 0x3a2b8f, pattern: 'galaxy', name: { zh: '银河', en: 'Galaxy' }, rarity: 'legend', shop: true },
  { id: 'blu_gold', hero: 'blu', color: 0xffc23a, pattern: 'shine', name: { zh: '黄金小蓝', en: 'Golden Blu' }, rarity: 'legend', source: 'road' },
  { id: 'mochi_default', hero: 'mochi', color: 0x2fd6a8, name: { zh: '经典', en: 'Classic' }, rarity: 'common', default: true },
  { id: 'mochi_matcha', hero: 'mochi', color: 0x8fcf5a, name: { zh: '抹茶', en: 'Matcha' }, rarity: 'common', shop: true },
  { id: 'mochi_sakura', hero: 'mochi', color: 0xffa3c7, name: { zh: '樱花麻薯', en: 'Sakura' }, rarity: 'rare', shop: true },
  { id: 'mochi_pudding', hero: 'mochi', color: 0xffd66b, pattern: 'shine', name: { zh: '布丁', en: 'Pudding' }, rarity: 'epic', shop: true },
  { id: 'zap_default', hero: 'zap', color: 0xffc928, name: { zh: '经典', en: 'Classic' }, rarity: 'common', default: true },
  { id: 'zap_lemon', hero: 'zap', color: 0xf4ff5a, name: { zh: '柠檬', en: 'Lemon' }, rarity: 'common', shop: true },
  { id: 'zap_neon', hero: 'zap', color: 0x39f0ff, pattern: 'shine', name: { zh: '霓虹闪', en: 'Neon' }, rarity: 'epic', shop: true },
  { id: 'stella_default', hero: 'stella', color: 0xa77bff, name: { zh: '经典', en: 'Classic' }, rarity: 'common', default: true },
  { id: 'stella_moon', hero: 'stella', color: 0xe6ecff, name: { zh: '月光', en: 'Moonlight' }, rarity: 'rare', shop: true },
  { id: 'stella_nova', hero: 'stella', color: 0xff7ad9, pattern: 'galaxy', name: { zh: '星云', en: 'Nebula' }, rarity: 'legend', shop: true },
];
export const HATS = [
  { id: 'none', name: { zh: '无', en: 'None' }, rarity: 'common', default: true },
  { id: 'antenna', name: { zh: '小天线', en: 'Antenna' }, rarity: 'common', shop: true },
  { id: 'flower', name: { zh: '小花', en: 'Flower' }, rarity: 'common', shop: true },
  { id: 'propeller', name: { zh: '竹蜻蜓', en: 'Propeller' }, rarity: 'common', shop: true },
  { id: 'cat', name: { zh: '猫耳朵', en: 'Cat Ears' }, rarity: 'rare', shop: true },
  { id: 'headphones', name: { zh: '耳机', en: 'Headphones' }, rarity: 'rare', shop: true },
  { id: 'bunny', name: { zh: '兔耳朵', en: 'Moon Bunny' }, rarity: 'rare', shop: true },
  { id: 'astro', name: { zh: '宇航头盔', en: 'Astro Helmet' }, rarity: 'epic', shop: true },
  { id: 'wizard', name: { zh: '魔法帽', en: 'Wizard Hat' }, rarity: 'epic', shop: true },
  { id: 'crown', name: { zh: '小皇冠', en: 'Crown' }, rarity: 'legend', source: 'road' },
  { id: 'halo', name: { zh: '光环', en: 'Halo' }, rarity: 'legend', source: 'road' },
  // world chest hats (15★ in a world)
  { id: 'w_cloud', name: { zh: '云朵帽', en: 'Cloud Puff' }, rarity: 'rare', source: 'chest', world: 0 },
  { id: 'w_neon', name: { zh: '霓虹护目镜', en: 'Neon Visor' }, rarity: 'rare', source: 'chest', world: 1 },
  { id: 'w_crystal', name: { zh: '水晶角', en: 'Crystal Horn' }, rarity: 'rare', source: 'chest', world: 2 },
  { id: 'w_nebula', name: { zh: '星云头盔', en: 'Nebula Helm' }, rarity: 'rare', source: 'chest', world: 3 },
  { id: 'w_foundry', name: { zh: '齿轮帽', en: 'Gear Cap' }, rarity: 'rare', source: 'chest', world: 4 },
  { id: 'w_core', name: { zh: '故障光环', en: 'Glitch Halo' }, rarity: 'epic', source: 'chest', world: 5 },
];
export const TRAILS = [
  { id: 'default', name: { zh: '默认', en: 'Default' }, colors: null, rarity: 'common', default: true },
  { id: 'bubbles', name: { zh: '泡泡', en: 'Bubbles' }, colors: [0xbff6ff, 0x8fd3ff], rarity: 'common', shop: true },
  { id: 'hearts', name: { zh: '爱心', en: 'Hearts' }, colors: [0xff7ab8, 0xffc1dc], rarity: 'rare', shop: true },
  { id: 'lightning', name: { zh: '闪电', en: 'Lightning' }, colors: [0x9ff0ff, 0xffffff], rarity: 'rare', shop: true },
  { id: 'rainbow', name: { zh: '彩虹', en: 'Rainbow' }, colors: [0xff5a5a, 0xffb13b, 0xfff05a, 0x5affa0, 0x5ac8ff, 0xb05aff], rarity: 'epic', shop: true },
  { id: 'stars', name: { zh: '星尘', en: 'Stardust' }, colors: [0xfff3a0, 0xffd84a], rarity: 'epic', shop: true },
  { id: 'comet', name: { zh: '银河彗星', en: 'Galaxy Comet' }, colors: [0xb38bff, 0x5ac8ff, 0xffffff], rarity: 'legend', shop: true },
];

// Capsule machine 扭蛋机 — a toy gashapon: earned tickets only (never coins, never money), full pool visible, odds as bars + "about 3 in 100",
// pity counters shown as filling bars, only UNOWNED items of the rolled rarity drop (a completed rarity
// refunds ECONOMY.refund coins), daily cap, parent toggle. Every item is also directly buyable.
export const CAPSULE = {
  odds: { common: 0.55, rare: 0.3, epic: 0.12, legend: 0.03 },
  epicPity: 10,                                  // the 10th pull without Epic+ is forced Epic
  legendSoftPity: 36, legendSoftStep: 0.06, legendHardPity: 50,
  pool: () => [
    ...SKINS.filter((s) => s.shop).map((s) => ({ kind: 'skin', id: s.id, rarity: s.rarity })),
    ...HATS.filter((h) => h.shop).map((h) => ({ kind: 'hat', id: h.id, rarity: h.rarity })),
    ...TRAILS.filter((t) => t.shop).map((t) => ({ kind: 'trail', id: t.id, rarity: t.rarity })),
  ],
};

export const HEALTH = {
  toastMinutes: 30,             // soft toast after a run
  breakCardMinutes: 45,         // full break card between runs (eye-rest animation), then every 20 min
  repeatMinutes: 20,
  nightStart: '21:30', nightEnd: '06:30',   // lobby turns to night, Blu yawns (nothing is blocked)
  parentLimits: [0, 30, 45, 60, 90],        // behind a math gate; 0 = off
};

export const DATA = {
  TUNE, RARITY, heroes: HEROES, enemies: ENEMIES, boss: BOSS, tags: TAGS, cards: CARDS, evolutions: EVOLUTIONS,
  cardRules: CARD_RULES, worlds: WORLDS, modes: MODES, mutators: MUTATORS, economy: ECONOMY, road: ROAD,
  roadOverflow: ROAD_OVERFLOW, missions: MISSIONS, signin: SIGNIN, ranks: RANKS, rankPar: RANK_PAR, rankReward: RANK_REWARD,
  achievements: ACHIEVEMENTS, achReward: ACH_REWARD, dex: DEX, titles: TITLES,
  skins: SKINS, hats: HATS, trails: TRAILS, capsule: CAPSULE, health: HEALTH, objIcons: OBJ_ICONS,
};
export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];
export const cardById = (id) => CARDS.find((c) => c.id === id) || EVOLUTIONS.find((e) => e.id === id);
export const stageOf = (worldIndex, stageIndex) => WORLDS[worldIndex]?.stages[stageIndex];
