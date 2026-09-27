// ─────────────────────────────────────────────────────────────
// CUBE DASH — in-run HUD  (G.hud)
//
// Stage mode shows ≤ 5 persistent elements (kid-UX rule):
//   ① hearts + ⚡ stamina pips (top-left)   ② objective bar 解救 18/25 + 👑 challenge
//   + timer + wave dots + thin XP strip (top-centre; boss bar on boss stages)
//   ③ 大招/NOVA ring (bottom-right; wraps the touch button on phones)   ④ pause
// Everything else is transient: world-anchored comic pops (pooled DOM, WAAPI
// animations, zero per-frame DOM creation), banners, the "!" Perfect cue, the
// NEW ENEMY spotlight card, tutorial prompts with device-aware key icons, hint
// whispers, off-screen edge arrows, 3-2-1-GO!, letterbox bars and the free
// Second Chance button. Score/multiplier/wave/warp gate only in Endless.
//
//   hud.show(on) · hud.update(rdt) · hud.pop(x, y, z, text, style) · hud.banner(key|text, style, seconds, sub)
// ─────────────────────────────────────────────────────────────
import { clamp, fmtTime } from './core.js';
import { t, tl, addStrings, onLangChange } from './i18n.js';
import { TUNE as DT, ENEMIES, BOSS, MODES } from './data.js';

// ---------- module tuning ----------
const TUNE = {
  pops: 28,                 // pooled pop nodes
  arrows: 6,                // pooled edge arrows (boss + portals + enemies)
  enemyArrows: 3,           // nearest off-screen threats shown
  arrowMargin: 38,          // px from the screen edge
  arrowScan: 0.15,          // s between off-screen scans
  bonkGap: 0.09,            // min s between two BONK pops
  smashBurst: 5,            // max smash pops per 0.35 s (nova clears)
  aggregate: 0.32,          // s to batch crystal / coin pickups into one pop
  hint: { every: 60, perStage: 3, noBonk: 45, tiredN: 3, tiredWin: 30, novaIdle: 20, dizzyMiss: 2, hurtSame: 3, dizzyWindow: 3.6 },
  countStep: 0.12,          // endless score count-up smoothing
};
const POP = {   // life (s), rise (px), keyframe set
  bonk: { life: 0.75, rise: 34, k: 'burst' }, smash: { life: 0.8, rise: 46, k: 'pop' }, perfect: { life: 1.15, rise: 30, k: 'stamp' },
  chain: { life: 0.8, rise: 40, k: 'pop' }, tier: { life: 1.2, rise: 50, k: 'stamp' }, crystal: { life: 0.7, rise: 40, k: 'soft' },
  coin: { life: 0.8, rise: 44, k: 'soft' }, heal: { life: 0.9, rise: 44, k: 'pop' }, boom: { life: 0.8, rise: 30, k: 'burst' },
  crack: { life: 0.9, rise: 40, k: 'burst' }, shield: { life: 0.8, rise: 36, k: 'pop' }, near: { life: 0.6, rise: 26, k: 'soft' },
  xp: { life: 1.0, rise: 50, k: 'pop' }, crit: { life: 0.9, rise: 40, k: 'stamp' }, core: { life: 1.3, rise: 20, k: 'pop' }, info: { life: 1.1, rise: 36, k: 'pop' },
};
const KF = {
  pop: [
    { transform: 'translate(-50%,-50%) scale(.2) rotate(-10deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.28) rotate(3deg)', opacity: 1, offset: 0.14 },
    { transform: 'translate(-50%,-50%) scale(.94) rotate(-1deg)', opacity: 1, offset: 0.26 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.72 },
    { transform: 'translate(-50%,-50%) scale(.85)', opacity: 0 },
  ],
  burst: [
    { transform: 'translate(-50%,-50%) scale(.3) rotate(-18deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.4) rotate(8deg)', opacity: 1, offset: 0.12 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%,-50%) scale(1.02) rotate(-4deg)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%,-50%) scale(.7) rotate(-4deg)', opacity: 0 },
  ],
  stamp: [
    { transform: 'translate(-50%,-50%) scale(2.6) rotate(-14deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(.9) rotate(-6deg)', opacity: 1, offset: 0.12 },
    { transform: 'translate(-50%,-50%) scale(1.08) rotate(-6deg)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-6deg)', opacity: 1, offset: 0.78 },
    { transform: 'translate(-50%,-50%) scale(1.15) rotate(-6deg)', opacity: 0 },
  ],
  soft: [
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.18 },
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%,-50%) scale(.9)', opacity: 0 },
  ],
};
const BANNER_PRI = { info: 1, wave: 1, checkpoint: 1, nova: 1, clear: 1, fever: 2, warp: 2, shrink: 2, boss: 3, phase: 3 };

// ---------- strings ----------
addStrings({
  zh: {
    'hud.dash': '冲刺', 'hud.nova': '大招', 'hud.freed': '解救', 'hud.lv': 'Lv', 'hud.score': '分数', 'hud.best': '最高',
    'hud.wave': '第 {n} 波', 'hud.waveSub': 'WAVE {n}', 'hud.finalWave': '最后一波!', 'hud.finalSub': 'FINAL WAVE',
    'hud.fever': '超载时刻!', 'hud.feverSub': 'FEVER', 'hud.phase': '第{n}阶段!', 'hud.phaseSub': 'PHASE {n}',
    'hud.checkpoint': '检查点!', 'hud.checkpointSub': '失败也能从这里继续',
    'hud.go': '开始!', 'hud.newEnemy': '新敌人!', 'hud.again': '再来一次!', 'hud.againSub': '带着3颗心回来',
    'hud.ready': '满啦!', 'hud.warp': '传送门', 'hud.warpOpen': '传送门开启!', 'hud.warpSub': '走进去 = 安全结算 ×1.25',
    'hud.shrink': '缩圈啦!', 'hud.shrinkSub': '快往中间跑!', 'hud.boss': '首领', 'hud.coreOpen': '核心打开! 冲!',
    'hud.p.bonk': '咚!', 'hud.p.smash': '解救!', 'hud.p.perfect': '完美!', 'hud.p.chain': '×{n} 连击!', 'hud.p.boom': '砰!',
    'hud.p.crack': '裂开!', 'hud.p.block': '挡住!', 'hud.p.near': '好险!', 'hud.p.levelup': '升级!', 'hud.p.revive': '复活!',
    'hud.p.magnet': '吸吸!', 'hud.p.objDone': '皇冠挑战完成!',
    'hud.t.move': '移动', 'hud.t.bonk': '引它们相撞!', 'hud.t.dizzy': '冲过去解救!', 'hud.t.knock': '撞过去!',
    'hud.t.blob': '引成一团再撞!', 'hud.t.nova': '放大招!', 'hud.t.tapRight': '点右边', 'hud.t.dragLeft': '左边拖动', 'hud.t.or': '或',
  },
  en: {
    'hud.dash': 'DASH', 'hud.nova': 'NOVA', 'hud.freed': 'Freed', 'hud.lv': 'Lv', 'hud.score': 'SCORE', 'hud.best': 'BEST',
    'hud.wave': 'WAVE {n}', 'hud.waveSub': '第 {n} 波', 'hud.finalWave': 'FINAL WAVE!', 'hud.finalSub': '最后一波',
    'hud.fever': 'FEVER TIME!', 'hud.feverSub': 'crystals ×2', 'hud.phase': 'PHASE {n}!', 'hud.phaseSub': 'watch out!',
    'hud.checkpoint': 'CHECKPOINT!', 'hud.checkpointSub': 'retry from here if you fall',
    'hud.go': 'GO!', 'hud.newEnemy': 'NEW ENEMY!', 'hud.again': 'TRY AGAIN!', 'hud.againSub': 'back with 3 hearts',
    'hud.ready': 'READY!', 'hud.warp': 'Warp', 'hud.warpOpen': 'WARP GATE OPEN!', 'hud.warpSub': 'step in = bank score ×1.25',
    'hud.shrink': 'SHRINK!', 'hud.shrinkSub': 'run to the middle!', 'hud.boss': 'Boss', 'hud.coreOpen': 'CORE OPEN — DASH!',
    'hud.p.bonk': 'BONK!', 'hud.p.smash': 'POP!', 'hud.p.perfect': 'PERFECT!', 'hud.p.chain': '×{n} CHAIN!', 'hud.p.boom': 'BOOM!',
    'hud.p.crack': 'CRACK!', 'hud.p.block': 'BLOCKED!', 'hud.p.near': 'CLOSE!', 'hud.p.levelup': 'LEVEL UP!', 'hud.p.revive': "I'M BACK!",
    'hud.p.magnet': 'ZOOM!', 'hud.p.objDone': 'Crown challenge done!',
    'hud.t.move': 'Move', 'hud.t.bonk': 'Make them crash!', 'hud.t.dizzy': 'Dash to free it!', 'hud.t.knock': 'Dash into them!',
    'hud.t.blob': 'Herd them, then crash!', 'hud.t.nova': 'Use your NOVA!', 'hud.t.tapRight': 'tap right', 'hud.t.dragLeft': 'drag left', 'hud.t.or': 'or',
  },
});

// ---------- inline SVG art ----------
const HEART = 'M12 21C5 15 1 11.2 1 6.6 1 3.5 3.4 1 6.4 1c2.2 0 4.2 1.3 5.6 3.2C13.4 2.3 15.4 1 17.6 1 20.6 1 23 3.5 23 6.6 23 11.2 19 15 12 21Z';
const HEART_L = 'M12 4.2C10.6 2.3 8.6 1 6.4 1 3.4 1 1 3.5 1 6.6 1 11.2 5 15 12 21L10.6 16.2 13.2 12.3 10.7 8.4Z';
const HEART_R = 'M12 4.2C13.4 2.3 15.4 1 17.6 1 20.6 1 23 3.5 23 6.6 23 11.2 19 15 12 21L10.6 16.2 13.2 12.3 10.7 8.4Z';
const SVG_HEART = `<svg viewBox="-1.5 -1.5 27 25" class="hh"><path class="hh-bg" d="${HEART}"/><g class="hh-l"><path d="${HEART_L}"/></g><g class="hh-r"><path d="${HEART_R}"/></g><ellipse class="hh-gl" cx="6.6" cy="5.6" rx="2.6" ry="1.7" transform="rotate(-28 6.6 5.6)"/></svg>`;
const SVG_BOLT = '<svg viewBox="0 0 24 24" class="ic-bolt"><path d="M13.5 1.5 4 13.6h6.2L9 22.5 19.8 9.6h-6.4z"/></svg>';
const SVG_CROWN = '<svg viewBox="0 0 28 22" class="ic-crown"><path d="M2.5 7.5 8 12.5 14 3l6 9.5 5.5-5-2.4 12.5H4.9z"/><circle cx="2.5" cy="7" r="2"/><circle cx="14" cy="2.6" r="2.2"/><circle cx="25.5" cy="7" r="2"/><rect x="4.9" y="17.2" width="18.2" height="3.2" rx="1.2"/></svg>';
const SVG_CLOCK = '<svg viewBox="0 0 24 24" class="ic-clock"><circle cx="12" cy="13" r="9"/><path d="M12 8v5l3.2 2"/><path d="M9.5 2.5h5"/></svg>';
const SVG_PAUSE = '<svg viewBox="0 0 24 24" class="ic-pause"><rect x="5.5" y="4" width="4.6" height="16" rx="2"/><rect x="13.9" y="4" width="4.6" height="16" rx="2"/></svg>';
const SVG_NOVA = '<svg viewBox="0 0 32 32" class="ic-nova"><path d="M16 2.5l3.3 9.2 9.2 3.3-9.2 3.3L16 27.5l-3.3-9.2L3.5 15l9.2-3.3z"/><circle cx="16" cy="15" r="3.2"/></svg>';
const SVG_STAR = '<svg viewBox="0 0 24 24" class="ic-star"><path d="M12 2.2l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.3 1.3-6.6-4.9-4.6 6.7-.8z"/></svg>';
const SVG_JOY = '<svg viewBox="0 0 48 48" class="ic-joy"><circle cx="24" cy="24" r="21" class="j-base"/><circle cx="24" cy="24" r="10" class="j-knob"/><path d="M24 5l3 4h-6zM24 43l3-4h-6zM5 24l4-3v6zM43 24l-4-3v6z" class="j-arr"/></svg>';
const SVG_TAP = '<svg viewBox="0 0 48 48" class="ic-tap"><circle cx="24" cy="18" r="12" class="t-ring"/><path d="M21 17a3 3 0 0 1 6 0v9l6.2 1.4c2 .5 3.2 2.4 2.8 4.4L34.4 40H20l-6-8.6c-1-1.5-.5-3.4 1-4.2 1.2-.6 2.6-.4 3.5.6l2.5 2.6z" class="t-hand"/></svg>';
const RING_R = 42, RING_C = 2 * Math.PI * RING_R;
const SVG_RING = `<svg viewBox="0 0 100 100" class="nv-svg"><defs><linearGradient id="hudNovaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient></defs><circle class="nv-track" cx="50" cy="50" r="${RING_R}"/><circle class="nv-arc" cx="50" cy="50" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${RING_C.toFixed(2)}" transform="rotate(-90 50 50)"/></svg>`;
const SVG_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="hudHeartG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8db2"/><stop offset=".55" stop-color="#ff4f86"/><stop offset="1" stop-color="#e8336f"/></linearGradient></defs></svg>';

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** tiny CSS cube with an angry (or happy) face in the enemy colour */
function cubeIcon(type, cls = '') {
  const def = ENEMIES[type];
  const col = type === 'king' ? hex(BOSS.color) : hex(def?.color ?? 0xef4b3c);
  const shape = type === 'king' ? 'king' : def?.shape || 'plain';
  return `<i class="ecube sh-${shape} ${cls}" style="--c:${col}"><b></b></i>`;
}
const keycap = (k, wide = false) => `<span class="kc${wide ? ' wide' : ''}">${esc(k)}</span>`;
const padBtn = (pos) => `<span class="pad pad-${pos}"><i></i><i></i><i></i><i></i></span>`;

// ═════════════════════════════════════════════════════════════
export class HUD {
  constructor(G) {
    this.G = G;
    this.visible = false;
    this._t = 0;
    this.v = {};                   // last rendered values (update only on change)
    this._portals = [];
    this._targets = [];
    this._scanT = 0;
    this._queue = [];
    this._bn = null;
    this._wave = { n: 0, total: 0 };
    this._agg = { crystal: 0, coin: 0, t: 0 };
    this._last = { bonk: -9, near: -9, smashT: -9, smashN: 0 };
    this._chainPop = null;
    this._device = null;
    /** CSS px from the viewport top down to the bottom of the lowest visible top-HUD panel over the play
     *  field (objective / boss bar · XP strip · mutator chip · a side panel when it reaches the centre).
     *  camera.js keeps the far rim below it. 0 while the HUD is hidden. */
    this.safeTopPx = 0;
    this._topDirty = true; this._topT = 0;
    this._tutResume = null;        // a prompt the dizzy "dash!" bubble interrupted — comes back once the cube is freed
    this._bubDx = { hint: 0, dizzy: 0 };
    this._build();
    this._wire();
    this._localise();
    onLangChange(() => this._localise());
    window.addEventListener('resize', () => { this._placeNova(); this._topDirty = true; });
  }

  // ═══════════════ DOM ═══════════════
  _build() {
    let root = document.getElementById('hud');
    if (!root) { root = document.createElement('div'); root.id = 'hud'; root.className = 'hidden'; document.body.appendChild(root); }
    this.root = root;
    root.innerHTML = `${SVG_DEFS}
<div class="hud-vig"></div>
<div class="hud-lb top"></div><div class="hud-lb bot"></div>
<div class="hud-core">
  <div class="hud-vitals hud-panel">
    <div class="hv-row"><div class="hv-hearts"></div><span class="hv-shield"></span><span class="hv-assist">🧸</span></div>
    <div class="hv-hp"><b></b></div>
    <div class="hv-stam">${SVG_BOLT}<div class="hv-pips"></div><span class="hv-sweat">💦</span></div>
  </div>
  <div class="hud-top">
    <div class="hud-obj hud-panel">
      <div class="ho-main">
        <span class="ho-lbl"><i class="fcube"></i><em></em></span>
        <div class="ho-bar"><b></b><span class="ho-num"></span></div>
        <span class="ho-crown">${SVG_CROWN}<span class="ho-oico"></span><span class="ho-onum"></span></span>
        <span class="ho-time">${SVG_CLOCK}<em></em></span>
      </div>
      <div class="ho-waves"></div>
    </div>
    <div class="hud-boss hud-panel">
      <div class="hb-name">${cubeIcon('king', 'mini')}<em></em></div>
      <div class="hb-pips"></div>
      <div class="hb-stag"><b></b></div>
    </div>
    <div class="hud-xp"><span class="hx-lv"></span><div class="hx-bar"><b></b></div></div>
    <div class="hud-mut"></div>
  </div>
  <div class="hud-endless hud-panel">
    <div class="he-score"><small></small><b>0</b><span class="he-mult"></span></div>
    <div class="he-row"><span class="he-wave"></span><span class="he-warp"><i class="warp-ico"></i><em></em></span></div>
  </div>
  <button class="hud-pause" type="button" aria-label="pause">${SVG_PAUSE}<span class="hp-key"></span></button>
  <div class="hud-nova"><div class="nv-wrap">${SVG_RING}<div class="nv-disc">${SVG_NOVA}<em></em></div></div><span class="nv-key"></span><span class="nv-ready"></span></div>
</div>
<div class="hud-arrows"></div>
<div class="hud-pops"></div>
<div class="hud-cue">!</div>
<div class="hud-combo"><b></b><small></small></div>
<div class="hud-hint"><div class="hh-bub"></div></div>
<div class="hud-dizzy"><div class="hd-bub"></div></div>
<div class="hud-banner"><div class="bn-main"></div><div class="bn-sub"></div></div>
<div class="hud-count"></div>
<div class="hud-newenemy"><div class="ne-rays"></div><div class="ne-card hud-panel"><div class="ne-tag"></div><div class="ne-icon"></div><div class="ne-name"></div><div class="ne-tip"></div></div></div>
<div class="hud-tut"><div class="ht-card hud-panel"><div class="ht-keys"></div><div class="ht-text"></div></div></div>
<div class="hud-second"><div class="hs-bubble"></div><button class="hs-btn" type="button"><span class="hs-hearts">${SVG_HEART}${SVG_HEART}${SVG_HEART}</span><b></b><small></small></button><div class="hs-key"></div></div>`;
    const $ = (s) => root.querySelector(s);
    this.el = {
      core: $('.hud-core'), vit: $('.hud-vitals'), hearts: $('.hv-hearts'), shield: $('.hv-shield'), assist: $('.hv-assist'),
      hp: $('.hv-hp'), hpFill: $('.hv-hp b'), stam: $('.hv-stam'), pips: $('.hv-pips'),
      top: $('.hud-top'), obj: $('.hud-obj'), objLbl: $('.ho-lbl em'), objBar: $('.ho-bar b'), objNum: $('.ho-num'),
      crown: $('.ho-crown'), oIco: $('.ho-oico'), oNum: $('.ho-onum'), time: $('.ho-time'), timeTxt: $('.ho-time em'), waves: $('.ho-waves'),
      boss: $('.hud-boss'), bossName: $('.hb-name em'), bossPips: $('.hb-pips'), stag: $('.hb-stag'), stagFill: $('.hb-stag b'),
      xp: $('.hud-xp'), xpLv: $('.hx-lv'), xpFill: $('.hx-bar b'), mut: $('.hud-mut'),
      end: $('.hud-endless'), score: $('.he-score b'), scoreLbl: $('.he-score small'), mult: $('.he-mult'), eWave: $('.he-wave'), warp: $('.he-warp'), warpTxt: $('.he-warp em'),
      pause: $('.hud-pause'), pauseKey: $('.hp-key'),
      nova: $('.hud-nova'), novaArc: $('.nv-arc'), novaLbl: $('.nv-disc em'), novaKey: $('.nv-key'), novaReady: $('.nv-ready'),
      arrows: $('.hud-arrows'), pops: $('.hud-pops'), cue: $('.hud-cue'), combo: $('.hud-combo'), comboN: $('.hud-combo b'), comboW: $('.hud-combo small'),
      hint: $('.hud-hint'), hintBub: $('.hh-bub'), dizzy: $('.hud-dizzy'), dizzyBub: $('.hd-bub'),
      banner: $('.hud-banner'), bnMain: $('.bn-main'), bnSub: $('.bn-sub'), count: $('.hud-count'),
      ne: $('.hud-newenemy'), neTag: $('.ne-tag'), neIcon: $('.ne-icon'), neName: $('.ne-name'), neTip: $('.ne-tip'),
      tut: $('.hud-tut'), tutKeys: $('.ht-keys'), tutText: $('.ht-text'),
      second: $('.hud-second'), secBtn: $('.hs-btn'), secTxt: $('.hs-btn b'), secSub: $('.hs-btn small'), secKey: $('.hs-key'),
    };
    // pools
    this.heartEls = [];
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span'); s.className = 'hv-h'; s.innerHTML = SVG_HEART; s.style.display = 'none';
      this.el.hearts.appendChild(s);
      this.heartEls.push({ el: s, l: s.querySelector('.hh-l'), r: s.querySelector('.hh-r') });
    }
    this.pipEls = [];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('i'); p.className = 'pip'; p.innerHTML = '<b></b>'; p.style.display = 'none';
      this.el.pips.appendChild(p); this.pipEls.push({ el: p, fill: p.firstChild, v: -1 });
    }
    this.crackEls = [];
    for (let i = 0; i < 8; i++) { const c = document.createElement('i'); c.className = 'bp'; c.style.display = 'none'; this.el.bossPips.appendChild(c); this.crackEls.push(c); }
    this.waveEls = [];
    for (let i = 0; i < 10; i++) { const d = document.createElement('i'); d.style.display = 'none'; this.el.waves.appendChild(d); this.waveEls.push(d); }
    this.popPool = [];
    for (let i = 0; i < TUNE.pops; i++) {
      const o = document.createElement('div'); o.className = 'hud-pop'; o.style.display = 'none';
      const inner = document.createElement('span'); inner.className = 'pp'; o.appendChild(inner);
      this.el.pops.appendChild(o);
      this.popPool.push({ el: o, inner, on: false, x: 0, y: 0, z: 0, t: 0, life: 1, rise: 30, anim: null, born: 0, style: '' });
    }
    this.arrowPool = [];
    for (let i = 0; i < TUNE.arrows; i++) {
      const a = document.createElement('div'); a.className = 'hud-arrow'; a.style.display = 'none';
      a.innerHTML = '<i class="ar-tip"></i><span class="ar-chip"></span>';
      this.el.arrows.appendChild(a);
      this.arrowPool.push({ el: a, tip: a.firstChild, chip: a.lastChild, key: '', on: false });
    }
    // buttons
    this.el.pause.addEventListener('click', (e) => { e.stopPropagation(); this.G.app?.pause?.(); });
    this.el.secBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this._revive(); });
  }

  _localise() {
    const e = this.el;
    e.objLbl.textContent = t('hud.freed');
    e.novaLbl.textContent = t('hud.nova');
    e.novaReady.textContent = t('hud.ready');
    e.secTxt.textContent = t('hud.again');
    e.secSub.textContent = t('hud.againSub');
    e.scoreLbl.textContent = t('hud.score');
    try { this.G.input?.setTouchLabels?.(t('hud.dash'), t('hud.nova')); } catch { /* input not ready */ }
    this.v = {};                  // force a full re-render
    this._device = null;
    this._topDirty = true;
    if (this._tutId) this._showTutorial(this._tutId);
    if (this._dizzyTarget) this._renderDizzy();
  }

  // ═══════════════ public API ═══════════════
  show(on) {
    on = !!on;
    this.visible = on;
    this.root.classList.toggle('hidden', !on);
    this._topDirty = true;
    if (!on) {
      this.safeTopPx = 0;
      this._reset();
      try { this.G.input?.setNovaReady?.(false); } catch { /* */ }
    }
  }

  /** world-anchored comic text. style: perfect | bonk | smash | chain | tier | heal | crystal | coin | boom | crack | shield | near | xp | crit | core | info */
  pop(x, y, z, text, style = 'info') {
    const cfg = POP[style] || POP.info;
    let p = null, oldest = null;
    for (const q of this.popPool) { if (!q.on) { p = q; break; } if (!oldest || q.born < oldest.born) oldest = q; }
    if (!p) p = oldest;
    p.on = true; p.x = +x || 0; p.y = +y || 0; p.z = +z || 0; p.t = 0; p.life = cfg.life; p.rise = cfg.rise; p.born = this._t; p.style = style;
    p.jx = (Math.random() - 0.5) * 18;
    p.el.className = 'hud-pop s-' + style;
    p.inner.textContent = text;
    p.el.style.display = 'block';
    p.anim?.cancel?.();
    p.anim = this._popAnim(p.inner, KF[cfg.k] || KF.pop, cfg.life);
    this._placePop(p);
    return p;
  }

  /** banner(textKey|string, style, seconds, sub) — styles: wave fever boss phase checkpoint nova warp shrink clear info */
  banner(textKey, style = 'info', seconds = 1.6, sub = '') {
    const text = this._tr(textKey);
    const item = { text, sub: sub ? this._tr(sub) : '', style, seconds: Math.max(0.6, +seconds || 1.6) };
    const pri = BANNER_PRI[style] || 1;
    if (this._bn && pri > (BANNER_PRI[this._bn.style] || 1)) { this._queue.unshift(item); this._bn.t = Math.max(this._bn.t, this._bn.seconds - 0.18); return; }
    if (this._queue.length >= 3) this._queue.shift();
    this._queue.push(item);
  }
  _tr(k) { if (typeof k !== 'string') return String(k ?? ''); const s = t(k); return s; }

  // ═══════════════ bus wiring ═══════════════
  _wire() {
    const bus = this.G.bus;
    if (!bus) return;
    const on = (n, fn) => bus.on(n, (p) => { try { fn(p || {}); } catch (e) { console.error('[hud]', n, e); } });
    on('run:start', (p) => this._onRunStart(p));
    on('run:countdown', (p) => this._countdown(p.n));
    on('run:go', () => this._onGo());
    on('run:end', () => this._onRunEnd());
    on('wave:start', (p) => this._onWave(p));
    on('tutorial:step', (p) => this._showTutorial(p.id, p));
    on('tutorial:done', (p) => this._onTutDone(p));
    on('objective:progress', (p) => this._onObjective(p));
    on('fever', () => this.banner('hud.fever', 'fever', 2.2, 'hud.feverSub'));
    on('checkpoint', () => this.banner('🚩 ' + t('hud.checkpoint'), 'checkpoint', 1.8, 'hud.checkpointSub'));
    on('player:perfect', (p) => {
      const h = this._hero();
      // the gold stamp owns the moment: a wave/info banner gets out of the way, a boss/phase banner pushes the stamp lower
      const bn = this._bn;
      if (bn && (BANNER_PRI[bn.style] || 1) <= 1) bn.t = Math.max(bn.t, bn.seconds - 0.05);
      const y = bn && (BANNER_PRI[bn.style] || 1) > 1 ? 1.9 : 3.3;
      this.pop(p.x ?? h.x, y, p.z ?? h.z, t('hud.p.perfect'), 'perfect');
      this._cueMute = this._t + 0.7;
      this._stampUntil = this._t + 0.85;            // a wave/info banner waits for the stamp to land and fade
    });
    on('player:nearMiss', (p) => { if (this._t - this._last.near > 0.7) { this._last.near = this._t; this.pop(p.x, 1.5, p.z, t('hud.p.near'), 'near'); } });
    on('player:shieldBlock', (p) => this.pop(p.x, 1.8, p.z, '🫧 ' + t('hud.p.block'), 'shield'));
    on('player:heal', (p) => this.pop(p.x, 1.7, p.z, `+${p.amount || 1} ♥`, 'heal'));
    on('player:revive', (p) => { this.pop(p.x ?? 0, 1.9, p.z ?? 0, t('hud.p.revive'), 'xp'); this.v.hp = -1; });
    on('player:hurt', (p) => this._onHurt(p));
    on('player:staminaEmpty', () => { this._shakePips(); this._hintTired(); });
    on('player:levelup', () => { const h = this._hero(); this.pop(h.x, 2.2, h.z, t('hud.p.levelup'), 'xp'); this.el.xp.animate?.([{ filter: 'brightness(2)' }, { filter: 'brightness(1)' }], { duration: 500 }); });
    on('nova', (p) => this._onNova(p));
    on('combo', (p) => { this._comboN = p.count || 0; });
    on('combo:break', () => { this._comboN = 0; });
    on('combo:milestone', (p) => this._onMilestone(p));
    on('pickup:crystal', (p) => { this._agg.crystal += Math.max(1, p.value || 1); });
    on('pickup:coin', (p) => { this._agg.coin += Math.max(1, p.amount || 1); });
    on('pickup:magnet', (p) => this.pop(p.x, 1.6, p.z, '🧲 ' + t('hud.p.magnet'), 'info'));
    on('enemy:spawnWarn', (p) => { if (this._portals.length < 12) this._portals.push({ x: p.x, z: p.z, type: p.type || 'grumpy', until: this._t + (p.delay ?? 1.2) + 0.4 }); });
    on('enemy:spawn', (p) => { const i = this._portals.findIndex((q) => Math.abs(q.x - p.x) < 0.8 && Math.abs(q.z - p.z) < 0.8); if (i >= 0) this._portals.splice(i, 1); });
    on('enemy:bonk', (p) => this._onBonk(p));
    on('enemy:knock', (p) => { if (p.byPlayer) this._tutEvent('knock'); });
    on('enemy:dizzy', (p) => this._onDizzy(p));
    on('enemy:smash', (p) => this._onSmash(p));
    on('enemy:explode', (p) => this.pop(p.x, 1.4, p.z, t('hud.p.boom'), 'boom'));
    on('boss:intro', (p) => { this.banner(tl(BOSS.name), 'boss', 2.6, tl({ zh: BOSS.name.en, en: BOSS.name.zh })); this.el.boss.animate?.([{ transform: 'translateY(-30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' }); });
    on('boss:phase', (p) => { if ((p.phase || 1) >= 2) this.banner(t('hud.phase', { n: p.phase }), 'phase', 1.8, t('hud.phaseSub', { n: p.phase })); });
    on('boss:vulnerable', (p) => { this.pop(p.x, 3.6, p.z, '⭐ ' + t('hud.coreOpen'), 'core'); this._bossOpenUntil = this._t + (p.seconds || 3); });
    on('boss:hit', (p) => { this.pop(p.x, 3.2, p.z, t('hud.p.crack'), 'crack'); this._bossHitT = this._t; });
    on('gate:open', (p) => { this._gateEvt = true; this.banner('🌀 ' + (p.text || t('hud.warpOpen')), 'warp', 2.0, 'hud.warpSub'); });
    on('coin:appear', (p) => { this.pop(p.x, 1.8, p.z, '🪙 ' + (p.text || tl(ENEMIES.coin.name)), 'coin'); });
    on('storm:shrink', (p) => this.banner('⚠️ ' + (p.text || t('hud.shrink')), 'shrink', 2.0, 'hud.shrinkSub'));
    on('rush:next', (p) => this.banner(p.text || tl(BOSS.name), 'boss', 2.0));
    // camera.js flags short in-play shots (大招 / boss phase) as overlay: the HUD stays, no letterbox
    on('cine:start', (p) => { if (!p.overlay) this.root.classList.add('cine'); });
    on('cine:end', (p) => { if (!p.overlay) this.root.classList.remove('cine'); });
    on('settings:change', (p) => { if (p.key === 'reduceFlash') this.root.classList.toggle('calm', !!p.value); });
  }

  _reset() {
    for (const p of this.popPool) { p.on = false; p.anim?.cancel?.(); p.el.style.display = 'none'; }
    for (const a of this.arrowPool) { a.on = false; a.el.style.display = 'none'; }
    this._portals.length = 0; this._targets.length = 0;
    this._queue.length = 0; this._bn = null; this._stampUntil = 0; this.el.banner.classList.remove('on');
    this.el.count.classList.remove('on');
    this.el.ne.classList.remove('on');
    this._hideTutorial(); this._tutResume = null;
    this.el.hint.classList.remove('on'); this.el.dizzy.classList.remove('on'); this._dizzyTarget = null;
    this.el.second.classList.remove('on'); this.el.cue.classList.remove('on'); this.el.combo.classList.remove('on');
    this.root.classList.remove('cine', 'ended', 'danger', 'bn-on');
    this.v = {};
    this._agg.crystal = 0; this._agg.coin = 0;
    this._chainPop = null; this._comboN = 0; this._shown = null;
  }

  _onRunStart(p) {
    this._reset();
    this._mode = p.mode || 'stage';
    this._wave = { n: 0, total: 0 };
    this._runT0 = this._t;
    this._warpWasOpen = false; this._gateEvt = false;
    this._objDone = false;
    this._firstDizzyShown = false;
    this._dizzyTarget = null;
    this._neShown = false;
    this._secondShownAt = 0;
    const h = this._hints = { last: -999, count: 0, lastBonk: 0, tired: [], pend: [], miss: 0, novaFullT: 0, hurtBy: {} };
    h.lastBonk = 0;
    this.root.dataset.mode = this._mode;
    this.root.classList.toggle('calm', !!this.G.save?.profile?.settings?.reduceFlash);
  }
  _onGo() {
    const run = this.G.run;
    const ne = run?.stageDef?.newEnemy;
    // once per session per enemy: a retry gets the child back into the action without the 2.6 s card
    const seen = (this._neSeen ||= new Set());
    if (ne && ENEMIES[ne] && !this._neShown && !seen.has(ne)) { this._neShown = true; seen.add(ne); this._showNewEnemy(ne); }
  }
  _onRunEnd() {
    this.root.classList.add('ended');
    this._queue.length = 0;
    clearTimeout(this._neTimer); this.el.ne.classList.remove('on');
    this.el.second.classList.remove('on'); this.el.cue.classList.remove('on'); this.el.combo.classList.remove('on');
    this._hideTutorial(); this._tutResume = null;
    this.el.hint.classList.remove('on'); this.el.dizzy.classList.remove('on'); this._dizzyTarget = null;
    this._hideArrows();
    try { this.G.input?.setNovaReady?.(false); } catch { /* */ }
    this.v.novaReady = false;
  }
  _onWave(p) {
    this._wave = { n: (p.index ?? 0) + 1, total: p.total || this._wave.total };
    if (p.isBoss || p.mode === 'storm' || this._mode === 'storm') return;     // storm steps get their own ⚠️ 缩圈啦! banner
    const n = this._wave.n, tot = this._wave.total;
    if (this._mode === 'endless') { this.banner(t('hud.wave', { n }), 'wave', 1.4, t('hud.waveSub', { n })); return; }
    if (n <= 1) return;
    if (tot > 1 && n === tot) this.banner('hud.finalWave', 'wave', 1.5, 'hud.finalSub');
    else this.banner(t('hud.wave', { n }), 'wave', 1.2, t('hud.waveSub', { n }));
  }
  _onObjective(p) {
    // fastClear ticks every second and noNova only ever fails — only real progress bumps the 👑 chip
    const timed = p.kind === 'fastClear' || p.kind === 'noNova';
    if (!timed && !p.failed) this.el.crown.animate?.([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    const done = p.done != null ? !!p.done : (!timed && p.target > 0 && p.cur >= p.target);
    if (!this._objDone && done) {
      this._objDone = true;
      const h = this._hero();
      this.pop(h.x, 2.4, h.z, '👑 ' + t('hud.p.objDone'), 'tier');
    }
  }
  _onHurt(p) {
    this.el.vit.animate?.([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 260 });
    // hint: same enemy type hurts you 3×
    const run = this.G.run, h = this._hints;
    const list = run?.enemies?.list;
    if (!h || !Array.isArray(list) || p.srcX == null) return;
    let best = null, bd = 9;
    for (const e of list) { if (!e) continue; const d = Math.hypot(e.x - p.srcX, e.z - p.srcZ); if (d < bd) { bd = d; best = e; } }
    if (best?.type) {
      h.hurtBy[best.type] = (h.hurtBy[best.type] || 0) + 1;
      if (h.hurtBy[best.type] >= TUNE.hint.hurtSame) { h.hurtBy[best.type] = -99; this._hint('enemy', best.type); }
    }
  }
  _onNova(p) {
    const run = this.G.run;
    const name = run?.heroDef?.nova?.name;
    this.banner(name ? tl(name) + '!' : t('hud.nova') + '!', 'nova', 1.1);
    this._last.smashT = this._t; this._last.smashN = 0;
    if (this._tutId === 'nova') this._hideTutorial();
    if (this._tutResume?.id === 'nova') this._tutResume = null;
    if (this._hints) this._hints.novaFullT = 0;
  }
  _onMilestone(p) {
    const tier = DT.style.tiers.find((x) => x.at === p.count);
    const h = this._hero();
    if (tier) this.pop(h.x, 2.6, h.z, tl(tier.word), 'tier');
    else if (this._mode === 'endless') this.pop(h.x, 2.4, h.z, '×' + p.count, 'chain');
  }
  _onBonk(p) {
    if (this._hints) this._hints.lastBonk = this._runTime();
    this._tutEvent('bonk');
    if (this._t - this._last.bonk < TUNE.bonkGap) return;
    this._last.bonk = this._t;
    this.pop(p.x, 1.6, p.z, t('hud.p.bonk') + '💫', 'bonk');
  }
  _onDizzy(p) {
    const h = this._hints;
    if (h) h.pend.push(this._runTime() + TUNE.hint.dizzyWindow);
    const run = this.G.run;
    if (run?.stageDef?.tutorial && !this._firstDizzyShown && !(this.G.save?.profile?.tutorialDone)) this._showDizzyPrompt(p.x, p.z);
  }
  /** "⚡ dash to free it!" bubble bobbing over the (nearest) dizzy cube. It stays until the child frees a
   *  cube (enemy:smash / tutorial:done 'dash') — while no cube is dizzy it waits, hidden, for the next one */
  _showDizzyPrompt(x, z) {
    const h = this._hero();
    this._firstDizzyShown = true;
    this._dizzyTarget = { x: x ?? h.x, z: z ?? h.z, seek: x == null };
    this._renderDizzy();
    this._updDizzyPrompt(this.G.run || {});
  }
  _renderDizzy() {
    this.el.dizzyBub.innerHTML = this._dashKeys() + `<span class="hd-t">${esc(t('hud.t.dizzy'))}</span>`;
    this._measureBubble(this.el.dizzyBub, 'dizzy', true);
  }
  _hideDizzyPrompt() {
    if (!this._dizzyTarget) return;
    this._dizzyTarget = null;
    this.el.dizzy.classList.remove('on');
    this._tutResumeAt = this._t + 0.7;          // the interrupted prompt returns after the 解救! moment
  }
  _onSmash(p) {
    const h = this._hints;
    if (h && h.pend.length) h.pend.shift();
    if (this._dizzyTarget) this._hideDizzyPrompt();
    if ((p.combo || 0) >= 2) this._tutEvent('blob');
    // limit pop spam during nova clears
    if (this._t - this._last.smashT > 0.35) { this._last.smashT = this._t; this._last.smashN = 0; }
    // chain callout: one node, re-used while the chain grows (×3 连击!) — replaces the per-cube 解救! pops
    const c = p.combo || 0;
    const chained = c >= 2 && !p.byNova;
    if (!chained && this._last.smashN++ < TUNE.smashBurst) this.pop(p.x, (p.y ?? 0) + 1.3, p.z, t('hud.p.smash'), 'smash');
    if (chained) {
      const txt = t('hud.p.chain', { n: c });
      const cp = this._chainPop;
      if (cp && cp.on && cp.style === 'chain' && this._t - cp.born < 0.8) {
        cp.inner.textContent = txt; cp.x = p.x; cp.z = p.z; cp.t = 0; cp.born = this._t;
        cp.anim?.cancel?.(); cp.anim = this._popAnim(cp.inner, KF.pop, POP.chain.life);
      } else {
        // the chain callout takes over from the last single 解救! pop of this dash
        for (const q of this.popPool) if (q.on && q.style === 'smash' && this._t - q.born < 0.8) { q.on = false; q.el.style.display = 'none'; }
        this._chainPop = this.pop(p.x, 2.3, p.z, txt, 'chain');
      }
    }
  }

  // ═══════════════ frame update ═══════════════
  update(rdt = 0) {
    if (!this.visible) return;
    rdt = Math.min(Math.max(+rdt || 0, 0), 0.1);
    this._t += rdt;
    try {
      this._checkDevice();
      this._updBanner(rdt);
      const run = this.G.run;
      if (run) this._updRun(run, rdt);
      if (this._topDirty || (this._topT -= rdt) <= 0) this._measureTop();
      this._updPops(rdt);
    } catch (e) {
      if (!this._warned) { this._warned = true; console.error('[hud] update', e); }
    }
  }

  _updRun(run, rdt) {
    const p = run.player || {};
    const e = this.el, v = this.v;
    const G = this.G;
    // ---- hearts
    const maxHp = clamp(Math.round(p.maxHp ?? 5), 1, 12), hp = clamp(Math.ceil(p.hp ?? maxHp), 0, maxHp);
    if (v.hp !== hp || v.maxHp !== maxHp) {
      const lost = v.hp != null && v.hp > hp && v.maxHp === maxHp;
      if (v.maxHp !== maxHp) { e.hearts.classList.toggle('many', maxHp > 6); this._topDirty = true; }   // 7+ hearts: smaller, one row where it fits
      for (let i = 0; i < 12; i++) {
        const H = this.heartEls[i];
        H.el.style.display = i < maxHp ? '' : 'none';
        const full = i < hp;
        H.full = full;
        if (lost && i >= hp && i < v.hp) this._shatter(H);
        else if (!full) H.el.classList.add('empty');
        if (full) {
          if (H.el.classList.contains('empty') && v.hp != null) H.el.animate?.([{ transform: 'scale(.3)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
          H.el.classList.remove('empty');
        }
      }
      const r = hp / maxHp;
      e.hpFill.style.transform = `scaleX(${r.toFixed(3)})`;
      e.hp.dataset.s = r > 0.6 ? 'ok' : r > 0.3 ? 'mid' : 'low';
      const danger = hp <= 1 && hp > 0;
      this.root.classList.toggle('danger', danger);       // hearts heartbeat + soft pink edge (post vignette is driven by run.js)
      v.hp = hp; v.maxHp = maxHp;
    }
    const sh = p.shield | 0;
    if (v.shield !== sh) { e.shield.textContent = sh > 0 ? (sh > 1 ? `🫧×${sh}` : '🫧') : ''; v.shield = sh; }
    const assist = !!(run.assist ?? run.cfg?.assist);
    if (v.assist !== assist) { e.assist.style.display = assist ? '' : 'none'; v.assist = assist; }

    // ---- stamina pips (floor(stamina / dashCost))
    const cost = Math.max(1, run.heroDef?.dashCost ?? DT.dash.cost);
    const maxSt = Math.max(cost, p.maxStamina ?? DT.stamina.max);
    const st = clamp(p.stamina ?? maxSt, 0, maxSt);
    const nP = clamp(Math.floor(maxSt / cost + 1e-6), 1, 8);
    if (v.nP !== nP) { this.pipEls.forEach((q, i) => { q.el.style.display = i < nP ? '' : 'none'; q.v = -1; }); v.nP = nP; }
    for (let i = 0; i < nP; i++) {
      const q = this.pipEls[i];
      const f = Math.round(clamp((st - i * cost) / cost, 0, 1) * 40) / 40;
      if (q.v !== f) { q.fill.style.transform = `scaleX(${f})`; q.el.classList.toggle('full', f >= 1); q.v = f; }
    }
    const tired = !!(p.lockout || run.tired);
    if (v.tired !== tired) { e.stam.classList.toggle('tired', tired); v.tired = tired; }
    const inp = G.input;
    if (tired && inp?.pressed?.('dash')) this._shakePips();

    // ---- nova ring
    const nova = clamp(+run.nova || 0, 0, 1);
    const nq = Math.round(nova * 400) / 400;
    if (v.nova !== nq) { e.novaArc.setAttribute('stroke-dashoffset', (RING_C * (1 - nq)).toFixed(2)); v.nova = nq; }
    const ready = nova >= 0.999 && run.state !== 'ended';
    if (v.novaReady !== ready) {
      e.nova.classList.toggle('ready', ready);
      try { G.input?.setNovaReady?.(ready); } catch { /* */ }
      if (ready) { e.nova.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }); if (this._tutId === 'nova') this._showTutorial('nova'); }
      v.novaReady = ready;
    }
    if (!ready && inp?.pressed?.('nova') && run.state === 'playing') e.nova.animate?.([{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], { duration: 360 });

    // ---- objective / boss
    const boss = run.boss && (run.boss.maxHp > 0) ? run.boss : null;
    const mode = run.mode || this._mode || 'stage';
    if (v.bossOn !== !!boss) {
      e.boss.classList.toggle('on', !!boss); e.obj.classList.toggle('off', !!boss);
      if (boss) e.bossName.parentNode.appendChild(e.crown);            // 👑 chip follows the active panel
      else e.time.parentNode.insertBefore(e.crown, e.time);
      v.bossOn = !!boss;
      this._topDirty = true;
    }
    if (boss) this._updBoss(boss, run);
    else this._updObjective(run, mode);
    this._updCrown(run);

    // ---- xp strip
    const lvl = run.level | 0 || 1;
    if (v.lvl !== lvl) { e.xpLv.textContent = `${t('hud.lv')}${lvl}`; v.lvl = lvl; }
    const xpR = clamp((+run.xp || 0) / Math.max(1, +run.xpNext || 1), 0, 1);
    const xq = Math.round(xpR * 200) / 200;
    if (v.xp !== xq) { e.xpFill.style.transform = `scaleX(${xq})`; v.xp = xq; }

    // ---- mutator chip (daily / endless)
    const mut = run.mutator;
    const mk = mut ? mut.id || tl(mut.name) : '';
    if (v.mut !== mk) { e.mut.innerHTML = mut ? `<span>${esc(mut.icon || '✦')}</span><em>${esc(tl(mut.name))}</em>` : ''; e.mut.classList.toggle('on', !!mut); v.mut = mk; this._topDirty = true; }

    // ---- endless panel
    const endless = mode === 'endless';
    if (v.endless !== endless) { e.end.classList.toggle('on', endless); v.endless = endless; this._topDirty = true; }
    if (endless) this._updEndless(run, rdt);

    // ---- world-anchored bits
    this._updCue(run, p);
    this._updCombo(run, p, endless);
    this._updAggregate(p);
    this._updDizzyPrompt(run);
    this._updHints(run, rdt, ready);
    if (e.hint.classList.contains('on')) {
      const s = this._w2s((p.x ?? 0) + 0.6, (p.y ?? 0) + 2.9, p.z ?? 0);
      e.hint.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
      this._clampBubble(e.hintBub, 'hint', s.x);
    }
    if (this._device === 'touch' && (this._novaPlaceT = (this._novaPlaceT || 0) - rdt) <= 0) { this._novaPlaceT = 1; this._placeNova(); }
    if (run.state === 'ended' || run.state === 'victory' || run.state === 'dying') this._hideArrows();
    else this._updArrows(run, p, rdt);

    // ---- second chance
    const sc = run.state === 'secondChance';
    if (v.second !== sc) {
      e.second.classList.toggle('on', sc);
      if (sc) { this._secondShownAt = performance.now(); e.secKey.innerHTML = this._confirmKeys(); }
      v.second = sc;
    }
    // keys: run.js accepts dash/confirm itself after its own guard; this is only a fallback for runs without it
    if (sc && typeof run.acceptSecondChance !== 'function' && performance.now() - this._secondShownAt > 450 && (inp?.pressed?.('confirm') || inp?.pressed?.('dash'))) this._revive();

    // tutorial 'move' satisfied when the hero has walked 1.5 u (also while the dizzy bubble has it parked)
    const walked = (o) => !!o && Math.hypot((p.x ?? 0) - o.x, (p.z ?? 0) - o.z) > 1.5;
    if (this._tutId === 'move' && walked(this._tutOrigin)) this._tutSatisfied();
    const r = this._tutResume;
    if (r?.id === 'move' && walked(r.origin)) this._tutResume = null;
    // the prompt the dizzy bubble interrupted comes back once that bubble is done (never over another prompt)
    if (this._tutResume && !this._dizzyTarget && this._t >= (this._tutResumeAt || 0) && run.state === 'playing') {
      const q = this._tutResume; this._tutResume = null;
      if (!this._tutId) { this._showTutorial(q.id, q.payload || { id: q.id }); if (q.id === 'move' && q.origin) this._tutOrigin = q.origin; }
    }
  }

  _updObjective(run, mode) {
    const e = this.el, v = this.v;
    let cur = run.freedCount | 0, total = run.totalCubes | 0;
    const storm = mode === 'storm';
    if (storm) { const medals = MODES.storm.medals; total = medals.find((m) => m > cur) ?? medals[medals.length - 1]; }
    const key = cur + '/' + total;
    if (v.obj !== key) {
      if ((total > 0) !== v.objBar) { e.obj.classList.toggle('count', !(total > 0)); v.objBar = total > 0; }   // Endless: no target → a plain counter
      const r = total > 0 ? clamp(cur / total, 0, 1) : 0;
      e.objBar.style.transform = `scaleX(${r.toFixed(3)})`;
      e.objNum.textContent = total > 0 ? `${cur}/${total}` : `${cur}`;
      const ty = total > 0 ? 'translateY(-50%) ' : '';
      if (v.obj != null && cur > (v.objCur ?? 0)) e.objNum.animate?.([{ transform: ty + 'scale(1.3)' }, { transform: ty + 'scale(1)' }], { duration: 220 });
      v.obj = key; v.objCur = cur;
    }
    const fever = !!run.fever;
    if (v.fever !== fever) { e.obj.classList.toggle('fever', fever); v.fever = fever; }
    // timer
    const time = storm ? Math.max(0, (MODES.storm.time || 150) - (run.time || 0)) : (run.time || 0);
    const ts = Math.floor(time);
    if (v.time !== ts) { e.timeTxt.textContent = fmtTime(ts); v.time = ts; e.time.classList.toggle('warn', storm && ts <= 10); }
    // wave dots
    const wn = this._wave.n || (run.wave | 0), wt = this._wave.total || (run.waveTotal | 0);
    const wk = wn + '/' + wt;
    if (v.waves !== wk) {
      const show = wt > 1 && wt <= 10 && mode !== 'endless';
      if ((e.waves.style.display !== 'none') !== show) { e.waves.style.display = show ? '' : 'none'; this._topDirty = true; }
      if (show) this.waveEls.forEach((d, i) => { d.style.display = i < wt ? '' : 'none'; d.className = i < wn - 1 ? 'done' : i === wn - 1 ? 'cur' : ''; });
      v.waves = wk;
    }
  }

  /** 👑 challenge chip — lives in the objective panel, or in the boss panel on boss stages */
  _updCrown(run) {
    const e = this.el, v = this.v;
    const o = run.objective;
    const ok = o ? `${o.icon}|${o.cur}|${o.target}|${o.done}|${o.failed}` : '';
    if (v.crown === ok) return;
    e.crown.style.display = o ? '' : 'none';
    if (o) {
      e.oIco.textContent = o.icon || '✦';
      const fast = o.kind === 'fastClear', noNova = o.kind === 'noNova';
      // noNova: "no 大招" pictogram that stays happy until a nova is used · fastClear: the time to beat
      e.oNum.textContent = o.done ? '✓' : noNova ? (o.failed ? '' : '🚫') : fast ? fmtTime(o.target) : `${Math.min(o.cur | 0, o.target | 0)}/${o.target | 0}`;
      e.crown.classList.toggle('done', !!o.done);
      e.crown.classList.toggle('missed', !o.done && !!o.failed);     // soft grey — never a red ✗ (never shaming)
    }
    v.crown = ok;
  }

  _updBoss(boss, run) {
    const e = this.el, v = this.v;
    const max = clamp(boss.maxHp | 0, 1, 8), hp = clamp(Math.ceil(boss.hp), 0, max);
    const nm = boss.name ? tl(boss.name) : tl(BOSS.name);
    if (v.bossName !== nm) { e.bossName.textContent = nm; v.bossName = nm; }
    const key = hp + '/' + max;
    if (v.boss !== key) {
      this.crackEls.forEach((c, i) => {
        c.style.display = i < max ? '' : 'none';
        const was = c.classList.contains('full');
        const full = i < hp;
        c.classList.toggle('full', full);
        if (was && !full) c.animate?.([{ transform: 'scale(1.7) rotate(18deg)', opacity: 0.4 }, { transform: 'scale(.85) rotate(-6deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      });
      v.boss = key;
    }
    const stag = clamp(+(run.enemies?.boss?.stagger ?? boss.stagger ?? 0) / (BOSS.stagger.max || 100), 0, 1);
    const sq = Math.round(stag * 100) / 100;
    if (v.stag !== sq) { e.stagFill.style.transform = `scaleX(${sq})`; e.stag.classList.toggle('hot', sq > 0.75); v.stag = sq; }
    const open = (this._bossOpenUntil || 0) > this._t || !!run.enemies?.boss?.coreOpen;
    if (v.bossOpen !== open) { e.boss.classList.toggle('open', open); v.bossOpen = open; }
  }

  _updEndless(run, rdt) {
    const e = this.el, v = this.v;
    const target = Math.max(0, +run.score || 0);
    this._shown = this._shown == null || target < this._shown ? target : this._shown + (target - this._shown) * Math.min(1, rdt / TUNE.countStep);
    if (target - this._shown < 1) this._shown = target;
    const s = Math.floor(this._shown);
    if (v.score !== s) { e.score.textContent = s.toLocaleString('en-US'); v.score = s; }
    // style multiplier (tier words ladder)
    let style = +run.styleMult || 0;
    if (!style) { style = 1; for (const tr of DT.style.tiers) if ((run.combo | 0) >= tr.at) style = tr.mult; }
    const mult = style * (+run.scoreMult || 1);
    const mk = mult > 1 ? '×' + String(+mult.toFixed(2)) : '';
    if (v.mult !== mk) { e.mult.textContent = mk; e.mult.classList.toggle('on', !!mk); if (mk) e.mult.animate?.([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 300 }); v.mult = mk; }
    const wn = this._wave.n || (run.wave | 0);
    if (v.eWave !== wn) { e.eWave.textContent = t('hud.wave', { n: Math.max(1, wn) }); v.eWave = wn; }
    // warp gate: run.warpGate {open, t, x, z} when provided; otherwise follow the data cadence
    const wg = run.waves?.gate ?? run.warpGate ?? null;      // waves.gate {x, z, open, t (s left while open), next (s until open)}
    const W = MODES.endless.warpGate;
    let open, left;
    if (wg && typeof wg === 'object') { open = !!wg.open; left = Math.max(0, +(open ? wg.t : wg.next ?? 0) || 0); }
    else {
      const tt = +run.time || 0;
      const ph = tt % W.every;
      open = tt >= W.every && ph < W.open;
      left = open ? W.open - ph : W.every - ph;
    }
    const wk = (open ? 'o' : 'c') + Math.ceil(left);
    if (v.warp !== wk) { e.warpTxt.textContent = fmtTime(Math.ceil(left)); e.warp.classList.toggle('open', open); v.warp = wk; }
    if (open && !this._warpWasOpen && !this._gateEvt) this.banner('🌀 ' + t('hud.warpOpen'), 'warp', 2.0, 'hud.warpSub');
    this._warpWasOpen = open;
    this._warp = open && wg && wg.x != null ? { x: wg.x, z: wg.z } : null;
  }

  // ---- "!" Perfect cue above the hero
  _updCue(run, p) {
    const cue = !!run.perfectCue && run.state === 'playing' && this._t > (this._cueMute || 0);
    const e = this.el;
    if (this.v.cue !== cue) { e.cue.classList.toggle('on', cue); this.v.cue = cue; }
    if (cue) { const s = this._w2s(p.x ?? 0, (p.y ?? 0) + (p.size ?? 1) + 1.15, p.z ?? 0); e.cue.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`; }
  }
  // ---- endless combo counter near the hero (only ≥ 5; stage mode never shows a counter)
  _updCombo(run, p, endless) {
    const n = endless ? (run.combo | 0) || this._comboN || 0 : 0;
    const show = n >= 5 && run.state === 'playing';
    const e = this.el;
    if (this.v.comboOn !== show) { e.combo.classList.toggle('on', show); this.v.comboOn = show; }
    if (!show) return;
    if (this.v.comboN !== n) {
      e.comboN.textContent = '×' + n;
      let word = ''; for (const tr of DT.style.tiers) if (n >= tr.at) word = tl(tr.word);
      e.comboW.textContent = word;
      this.v.comboN = n;
    }
    const s = this._w2s((p.x ?? 0) + 1.2, (p.y ?? 0) + 1.6, p.z ?? 0);
    e.combo.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
  }
  // ---- batch crystal / coin pickups into one small pop near the hero
  _updAggregate(p) {
    const a = this._agg;
    if (!a.crystal && !a.coin) { a.t = this._t; return; }
    if (this._t - a.t < TUNE.aggregate) return;
    a.t = this._t;
    const x = p.x ?? 0, z = p.z ?? 0;
    if (a.crystal) { this.pop(x - 1.1, 1.0, z, `+${a.crystal}◆`, 'crystal'); a.crystal = 0; }
    if (a.coin) { this.pop(x + 1.1, 1.0, z, `+${a.coin}🪙`, 'coin'); a.coin = 0; }
  }
  // ---- tutorial: dash prompt bobbing over a dizzy cube (follows it; hops to the nearest other dizzy cube;
  //      hidden while none is dizzy, back as soon as one is)
  _updDizzyPrompt(run) {
    const d = this._dizzyTarget;
    if (!d) return;
    const list = run.enemies?.list;
    let on = true;
    if (Array.isArray(list)) {
      const near = (x, z, max) => { let best = null, bd = max; for (const e of list) { if (!e?.smashable || e.dead) continue; const dd = Math.hypot(e.x - x, e.z - z); if (dd < bd) { bd = dd; best = e; } } return best; };
      const h = this._hero();
      const best = near(d.x, d.z, d.seek ? 1e9 : 3.5) || near(h.x, h.z, 1e9);
      if (best) { d.x = best.x; d.z = best.z; d.seek = false; }
      on = !!best;
    }
    if (this.el.dizzy.classList.contains('on') !== on) this.el.dizzy.classList.toggle('on', on);
    if (!on) return;
    const s = this._w2s(d.x, 2.4, d.z);
    this.el.dizzy.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
    this._clampBubble(this.el.dizzyBub, 'dizzy', s.x);
  }

  // ---- world-anchored bubbles stay on screen: slide sideways, the tail keeps pointing at the anchor
  /** cache a bubble's width and its left edge relative to the anchor (after its content changes) */
  _measureBubble(bub, key, centred) {
    bub.style.marginLeft = '';                       // measure un-shifted; _clampBubble re-applies the shift + tail
    this._bubDx[key] = NaN;
    const w = bub.offsetWidth;
    (this._bubBox ||= {})[key] = { w, off: centred ? -w / 2 : bub.offsetLeft, centred };
  }
  _clampBubble(bub, key, ax) {
    const b = this._bubBox?.[key];
    if (!b || !b.w) return;
    const W = window.innerWidth, M = 8;
    const l = ax + b.off, r = l + b.w;
    let dx = r > W - M ? W - M - r : 0;
    if (l + dx < M) dx = M - l;                    // wider than the screen: the left edge wins
    dx = Math.round(dx);
    if (dx === this._bubDx[key]) return;
    this._bubDx[key] = dx;
    bub.style.marginLeft = dx ? dx + 'px' : '';
    // tail position inside the bubble (px from its left edge), kept on the bubble's body
    const base = b.centred ? b.w / 2 - 10 : 18;    // (padding-box px: 3 px border, 14 px tail)
    bub.style.setProperty('--tail', clamp(base - dx, 12, b.w - 26).toFixed(0) + 'px');
  }

  // ---- top-HUD geometry (T5/T8): re-measured when panels show/hide/resize and every 0.5 s
  _measureTop() {
    this._topDirty = false; this._topT = 0.5;
    if (!this.visible) { this.safeTopPx = 0; return; }
    const e = this.el, W = window.innerWidth;
    // portrait phones: the objective panel sits under the hearts panel — push it down when the hearts wrap
    const vb = Math.ceil(e.vit.getBoundingClientRect().bottom);
    if (vb > 0 && vb !== this._vitB) { this._vitB = vb; this.root.style.setProperty('--vit-b', vb + 'px'); }
    // .hud-top's own box ends at its lowest visible child (objective / boss bar, XP strip, mutator chip);
    // child transforms (intro slides, pulses) don't move it
    let bot = 0;
    const tr = e.top.getBoundingClientRect();
    if (tr.height > 0) bot = tr.bottom;
    // side panels only count where they reach over the arena's central column (portrait phones)
    for (const el of [e.vit, e.end]) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.left < W * 0.7 && r.right > W * 0.3) bot = Math.max(bot, r.bottom);
    }
    this.safeTopPx = Math.ceil(bot);
  }

  // ---- off-screen edge arrows (boss · portals · warp gate · nearest threats)
  _updArrows(run, p, rdt) {
    // cached viewport (camera keeps it up to date on resize) — no forced layout every frame
    const W = this.G.cam?._vw || window.innerWidth, H = this.G.cam?._vh || window.innerHeight, M = TUNE.arrowMargin;
    for (let i = this._portals.length - 1; i >= 0; i--) if (this._portals[i].until <= this._t) this._portals.splice(i, 1);
    this._scanT -= rdt;
    if (this._scanT <= 0) {
      this._scanT = TUNE.arrowScan;
      const T = this._targets; T.length = 0;
      if (run.boss && run.boss.x != null) T.push({ kind: 'boss', type: 'king', x: run.boss.x, z: run.boss.z, y: 1.8 });
      if (this._warp) T.push({ kind: 'warp', type: 'warp', x: this._warp.x, z: this._warp.z, y: 0.5 });
      for (const q of this._portals) if (T.length < TUNE.arrows) T.push({ kind: 'portal', type: q.type, x: q.x, z: q.z, y: 0.5, ref: q });
      const list = run.enemies?.list;
      if (Array.isArray(list) && T.length < TUNE.arrows) {
        const px = p.x ?? 0, pz = p.z ?? 0;
        const cand = [];
        for (const e of list) {
          const coin = e?.type === 'coin';
          if (!e || e.isBoss || e.state === 'dying' || e.state === 'portal' || (e.harmful === false && !coin)) continue;
          const s = this._w2s(e.x, (e.size ?? 1) * 0.5, e.z);
          if (s.visible !== false && s.x > -4 && s.x < W + 4 && s.y > -4 && s.y < H + 4) continue;
          cand.push({ kind: coin ? 'coin' : 'enemy', type: e.type || 'grumpy', x: e.x, z: e.z, y: 0.5, d: coin ? -1 : Math.hypot(e.x - px, e.z - pz), ref: e });
        }
        cand.sort((a, b) => a.d - b.d);
        for (let i = 0; i < cand.length && i < TUNE.enemyArrows && T.length < TUNE.arrows; i++) T.push(cand[i]);
      }
    }
    // arrows live in the play-field rect below the top HUD panels (re-measured ~1×/s, layout is stable)
    if ((this._insetT = (this._insetT || 0) - rdt) <= 0) {
      this._insetT = 1;
      let top = 0;
      for (const el of [this.el.top, this.el.vit, this.el.end]) { const r = el.offsetParent ? el.getBoundingClientRect() : null; if (r && r.width && r.left < W * 0.8 && r.right > W * 0.2) top = Math.max(top, r.bottom); }
      this._topInset = Math.max(M, Math.min(H * 0.4, top + 30));
    }
    const x0 = M, x1 = W - M, y0 = this._topInset || M, y1 = H - M;
    const cx = W / 2, cy = H / 2;
    let used = 0;
    for (const tg of this._targets) {
      if (used >= this.arrowPool.length) break;
      if (tg.ref && (tg.kind === 'enemy' || tg.kind === 'coin')) { tg.x = tg.ref.x; tg.z = tg.ref.z; }
      const s = this._w2s(tg.x, tg.y, tg.z);
      const inside = s.visible !== false && s.x > M * 0.5 && s.x < W - M * 0.5 && s.y > y0 - M * 0.5 && s.y < H - M * 0.5;
      if (inside) continue;
      let dx = s.x - cx, dy = s.y - cy;
      // camera.js reports visible:false for anything outside the frustum — only a point BEHIND the
      // camera projects mirrored (never in the 3/4 top-down view, but cinematics can swing around)
      if (this._behind(tg.x, tg.y, tg.z)) { dx = -dx; dy = -dy; }
      if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = 1;
      const kx = dx > 0 ? (x1 - cx) / dx : dx < 0 ? (x0 - cx) / dx : Infinity;
      const ky = dy > 0 ? (y1 - cy) / dy : dy < 0 ? (y0 - cy) / dy : Infinity;
      const k = Math.max(0, Math.min(kx, ky));
      const ax = cx + dx * k, ay = cy + dy * k;
      const ang = Math.atan2(dy, dx);
      const dist = Math.hypot(tg.x - (p.x ?? 0), tg.z - (p.z ?? 0));
      const sc = tg.kind === 'boss' ? 1.2 : clamp(1.25 - dist / 22, 0.75, 1.15);
      const A = this.arrowPool[used++];
      const key = tg.kind + ':' + tg.type;
      if (A.key !== key) {
        A.key = key;
        A.el.className = 'hud-arrow k-' + tg.kind;
        A.chip.innerHTML = tg.kind === 'warp' ? '<i class="warp-ico"></i>' : tg.kind === 'portal' ? '<b class="ar-warn">!</b>' + cubeIcon(tg.type, 'mini') : cubeIcon(tg.type, 'mini');
      }
      if (!A.on) { A.on = true; A.el.style.display = ''; }
      A.el.style.transform = `translate3d(${ax.toFixed(1)}px,${ay.toFixed(1)}px,0) scale(${sc.toFixed(2)})`;
      A.tip.style.transform = `rotate(${ang.toFixed(3)}rad)`;
    }
    for (let i = used; i < this.arrowPool.length; i++) { const A = this.arrowPool[i]; if (A.on) { A.on = false; A.el.style.display = 'none'; } }
  }

  _hideArrows() { for (const A of this.arrowPool) if (A.on) { A.on = false; A.el.style.display = 'none'; } }

  // ---- pops follow their world anchor
  _updPops(rdt) {
    for (const p of this.popPool) {
      if (!p.on) continue;
      p.t += rdt;
      if (p.t >= p.life) { p.on = false; p.el.style.display = 'none'; if (this._chainPop === p) this._chainPop = null; continue; }
      this._placePop(p);
    }
  }
  /** pop keyframes are scrubbed by HUD time (not the wall clock), so the scale/fade stays in step
   *  with the world-anchored rise even when frames drop (rdt is clamped) */
  _popAnim(el, kf, life) {
    const a = el.animate?.(kf, { duration: life * 1000, easing: 'linear', fill: 'forwards' });
    if (!a) return null;
    try { a.pause(); a.currentTime = 0; } catch { /* old WAAPI */ }
    return a;
  }
  _placePop(p) {
    if (p.anim) { try { p.anim.currentTime = Math.min(p.t, p.life) * 1000; } catch { /* */ } }
    const s = this._w2s(p.x, p.y, p.z);
    const k = p.t / p.life;
    const rise = p.rise * (1 - (1 - k) * (1 - k));
    p.el.style.transform = `translate3d(${(s.x + p.jx).toFixed(1)}px,${(s.y - rise).toFixed(1)}px,0)`;
  }
  /** true when a world point is behind the camera (its projection is mirrored) */
  _behind(x, y, z) {
    const m = this.G.camera?.matrixWorldInverse?.elements;
    if (!m) return false;
    return m[2] * x + m[6] * y + m[10] * z + m[14] > 0;      // view space looks down −Z
  }
  /** world → CSS px via the camera director (fallback: project with G.camera). Returns a shared
   *  scratch object: read it right away, never keep it. */
  _w2s(x, y, z) {
    const cam = this.G.cam;
    if (cam?.worldToScreen) { const s = cam.worldToScreen(x, y, z, this._s2 ||= { x: 0, y: 0, visible: true }); if (s) return s; }
    const c = this.G.camera, THREE = this.G.THREE;
    if (c && THREE) {
      const v = (this._v3 ||= new THREE.Vector3());
      v.set(x, y, z).project(c);
      return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, visible: v.z < 1 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: true };
  }
  _hero() { const p = this.G.run?.player; return { x: p?.x ?? 0, z: p?.z ?? 0 }; }
  _runTime() { return +this.G.run?.time || (this._t - (this._runT0 || 0)); }

  // ═══════════════ banners · countdown · new enemy ═══════════════
  _updBanner(rdt) {
    const e = this.el;
    if (this._bn) {
      this._bn.t += rdt;
      if (this._bn.t >= this._bn.seconds) {
        const b = this._bn; this._bn = null;
        e.banner.classList.remove('on');
        this.root.classList.remove('bn-on');
        e.banner.animate?.([{ opacity: 1, transform: 'translate(-50%,0) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-14px) scale(.92)' }], { duration: 220, fill: 'forwards' });
        b.done = true;
      }
      return;
    }
    if (!this._queue.length) return;
    if (this._t < (this._stampUntil || 0) && (BANNER_PRI[this._queue[0].style] || 1) <= 1) return;
    const next = this._queue.shift();
    this._bn = { ...next, t: 0 };
    e.banner.className = 'hud-banner on b-' + next.style;
    this.root.classList.add('bn-on');           // portrait: the tutorial card shares the banner's spot — it waits
    e.bnMain.textContent = next.text;
    e.bnSub.textContent = next.sub || '';
    e.bnSub.style.display = next.sub ? '' : 'none';
    e.banner.animate?.([
      { opacity: 0, transform: 'translate(-50%,0) scale(2.2) rotate(-6deg)' },
      { opacity: 1, transform: 'translate(-50%,0) scale(.92) rotate(1deg)', offset: 0.6 },
      { opacity: 1, transform: 'translate(-50%,0) scale(1) rotate(0deg)' },
    ], { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' });
  }
  _countdown(n) {
    const e = this.el.count;
    e.textContent = n > 0 ? String(n) : t('hud.go');
    e.className = 'hud-count on' + (n > 0 ? '' : ' go');
    e.animate?.([
      { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(.9)', opacity: 1, offset: 0.22 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    ], { duration: n > 0 ? 900 : 800, fill: 'forwards' });
    this.root.classList.remove('cine');
  }
  _showNewEnemy(type) {
    const d = ENEMIES[type];
    const e = this.el;
    e.neTag.textContent = t('hud.newEnemy');
    e.neIcon.innerHTML = cubeIcon(type, 'big');
    e.neName.textContent = tl(d.name);
    e.neTip.textContent = tl(d.tip);
    e.ne.classList.add('on');
    e.ne.animate?.([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.05)', offset: 0.7 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' });
    clearTimeout(this._neTimer);
    this._neTimer = setTimeout(() => {
      e.ne.animate?.([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-60%) scale(.9)' }], { duration: 300, fill: 'forwards' });
      setTimeout(() => e.ne.classList.remove('on'), 300);
    }, 2600);
  }

  // ═══════════════ tutorial prompts (device-aware) ═══════════════
  _moveKeys() {
    const d = this._dev();
    if (d === 'touch') return `<span class="ti">${SVG_JOY}</span><small>${esc(t('hud.t.dragLeft'))}</small>`;
    if (d === 'pad') return `<span class="ti stick">L</span>`;
    return `<span class="wasd">${keycap('W')}<span>${keycap('A')}${keycap('S')}${keycap('D')}</span></span><small>${esc(t('hud.t.or'))}</small><span class="wasd arrows">${keycap('↑')}<span>${keycap('←')}${keycap('↓')}${keycap('→')}</span></span>`;
  }
  _dashKeys() {
    const d = this._dev();
    if (d === 'touch') return `<span class="ti">${SVG_TAP}</span><small>${esc(t('hud.t.tapRight'))}</small>`;
    if (d === 'pad') return padBtn('s');
    return `${keycap('Shift', true)}<small>/</small>${keycap('Space', true)}`;
  }
  _novaKeys() {
    const d = this._dev();
    if (d === 'touch') return `<span class="ti nova-ti">${SVG_NOVA}</span>`;
    if (d === 'pad') return padBtn('w');
    return `${keycap('E')}<small>/</small>${keycap('Enter', true)}`;
  }
  _confirmKeys() {
    const d = this._dev();
    if (d === 'touch') return '';
    if (d === 'pad') return padBtn('s');
    return `${keycap('Space', true)}<small>/</small>${keycap('Enter', true)}`;
  }
  _showTutorial(id, payload = null) {
    const e = this.el;
    if (id === 'dash') {
      // the dizzy-cube bubble takes over; an unsatisfied prompt it interrupts comes back once the cube is freed
      if (this._tutId && this._tutId !== 'dash' && this._tutSat !== this._tutId) this._tutResume = { id: this._tutId, payload: this._tutPayload, origin: this._tutOrigin };
      this._hideTutorial();
      this._showDizzyPrompt(payload?.x, payload?.z);
      return;
    }
    if (payload) {                                // a new step: supersedes a parked one and any pending "satisfied" fade
      this._tutPayload = payload; this._tutResume = null;
      this._tutSeq = (this._tutSeq || 0) + 1; this._tutSat = null;
      e.tut.getAnimations?.().forEach((a) => a.cancel());
    } else if (id === this._tutId) payload = this._tutPayload || null;
    const known = ['move', 'bonk', 'knock', 'blob', 'nova'];
    if (!known.includes(id)) {
      if (payload?.textKey && t(payload.textKey) !== payload.textKey) { this._tutId = id; e.tutKeys.innerHTML = payload.icon ? `<span class="ti emo">${esc(payload.icon)}</span>` : ''; e.tutText.textContent = t(payload.textKey); e.tut.classList.add('on'); }
      return;
    }
    this._tutId = id;
    const run = this.G.run;
    if (id === 'move') this._tutOrigin = { x: run?.player?.x ?? 0, z: run?.player?.z ?? 0 };
    if (id === 'nova' && run && (+run.nova || 0) < 0.999) { e.tut.classList.remove('on'); return; }   // wait until full
    let keys = '';
    if (id === 'move') keys = this._moveKeys();
    else if (id === 'bonk') keys = `<span class="crash">${cubeIcon('grumpy', 'mini')}<b>→</b><b class="boom">💥</b><b>←</b>${cubeIcon('grumpy', 'mini')}</span>`;
    else if (id === 'knock') keys = this._dashKeys() + `<b class="arrow">→</b>${cubeIcon('grumpy', 'mini')}`;
    else if (id === 'blob') keys = `<span class="crash">${cubeIcon('grumpy', 'mini')}${cubeIcon('grumpy', 'mini')}${cubeIcon('grumpy', 'mini')}</span><b class="arrow">+</b>` + this._dashKeys();
    else if (id === 'nova') keys = this._novaKeys();
    const key = payload?.textKey && t(payload.textKey) !== payload.textKey ? payload.textKey : 'hud.t.' + id;
    e.tutKeys.innerHTML = keys;
    e.tutText.textContent = t(key);
    e.tut.className = 'hud-tut on t-' + id;
  }
  _tutSatisfied() {
    const e = this.el.tut, id = this._tutId, seq = this._tutSeq;
    if (!e.classList.contains('on') || this._tutSat === id) return;
    this._tutSat = id;
    e.animate?.([{ transform: 'translate(-50%,0) scale(1)' }, { transform: 'translate(-50%,0) scale(1.12)' }, { transform: 'translate(-50%,0) scale(.8)', opacity: 0 }], { duration: 380 });
    setTimeout(() => { if (this._tutId === id && this._tutSeq === seq) this._hideTutorial(); }, 360);     // never hide a newer prompt
  }
  /** a tutorial action happened: satisfy the matching prompt — on screen, or parked under the dizzy bubble.
   *  Same rules as run.js: bonk = any crash, knock = the hero's dash knocking a cube, blob = a 2+ chain. */
  _tutEvent(kind) {
    if (this._tutId === kind) this._tutSatisfied();
    if (this._tutResume?.id === kind) this._tutResume = null;
  }
  _onTutDone(p) {
    const id = p.id;
    if (!id || id === 'dash') this._hideDizzyPrompt();
    if (!id || id === this._tutId) { if (this.el.tut.classList.contains('on')) this._tutSatisfied(); else this._hideTutorial(); }
    if (this._tutResume && (!id || id === this._tutResume.id)) this._tutResume = null;
  }
  _hideTutorial() { this._tutId = null; this._tutOrigin = null; this._tutPayload = null; this._tutSat = null; this.el.tut.classList.remove('on'); }

  // ═══════════════ hint whispers (W1–2 or Helper mode) ═══════════════
  _updHints(run, rdt, novaReady) {
    const h = this._hints;
    if (!h || run.state !== 'playing') return;
    const eligible = (run.mode || 'stage') === 'stage' && ((run.worldIndex ?? 0) <= 1 || run.assist);
    const rt = this._runTime();
    h.novaFullT = novaReady ? h.novaFullT + rdt : 0;
    // expired dizzy windows without a smash → a miss
    while (h.pend.length && h.pend[0] < rt) { h.pend.shift(); h.miss++; }
    if (!eligible || h.count >= TUNE.hint.perStage || rt - h.last < TUNE.hint.every) return;
    const H = TUNE.hint;
    if (h.novaFullT > H.novaIdle) { h.novaFullT = -999; this._hint('nova'); this.el.nova.animate?.([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 900 }); }
    else if (h.miss >= H.dizzyMiss) { h.miss = -99; this._hint('dizzy'); }
    else if (rt - h.lastBonk > H.noBonk && rt > H.noBonk) { h.lastBonk = rt; this._hint('bonk'); }
  }
  _hintTired() {
    const h = this._hints;
    if (!h) return;
    const rt = this._runTime();
    h.tired.push(rt);
    while (h.tired.length && h.tired[0] < rt - TUNE.hint.tiredWin) h.tired.shift();
    if (h.tired.length >= TUNE.hint.tiredN) { h.tired.length = 0; this._hint('pips'); }
  }
  _hint(kind, type) {
    const h = this._hints, run = this.G.run;
    if (!h || !run) return;
    const eligible = (run.mode || 'stage') === 'stage' && ((run.worldIndex ?? 0) <= 1 || run.assist);
    const rt = this._runTime();
    if (!eligible || h.count >= TUNE.hint.perStage || rt - h.last < TUNE.hint.every) return;
    h.last = rt; h.count++;
    const e = this.el;
    let html = '';
    if (kind === 'bonk') html = `${cubeIcon('grumpy', 'mini')}<b>→</b><b class="boom">💥</b><b>←</b>${cubeIcon('grumpy', 'mini')}`;
    else if (kind === 'dizzy') html = `<span class="ti bolt">${SVG_BOLT}</span><b>→</b><span class="ti star">${SVG_STAR}</span>`;
    else if (kind === 'pips') html = `<span class="mini-pips"><i class="f"></i><i class="f"></i><i></i></span><b>=</b><span class="ti bolt">${SVG_BOLT}</span>`;
    else if (kind === 'nova') html = `<span class="ti nova-ti">${SVG_NOVA}</span>${this._dev() === 'touch' ? '' : this._novaKeys()}`;
    else if (kind === 'enemy') { const d = ENEMIES[type]; html = `${cubeIcon(type, 'mini')}<span class="hint-tip">${esc(tl(d?.tip))}</span>`; }
    e.hintBub.innerHTML = html;
    this._measureBubble(e.hintBub, 'hint', false);
    e.hint.classList.add('on');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => e.hint.classList.remove('on'), kind === 'enemy' ? 4500 : 3200);
  }

  // ═══════════════ misc ═══════════════
  _shatter(H) {
    H.el.classList.remove('empty');
    const opts = { duration: 520, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' };
    const done = () => { if (!H.full) H.el.classList.add('empty'); H.l.getAnimations?.().forEach((a) => a.cancel()); H.r.getAnimations?.().forEach((a) => a.cancel()); };
    const a = H.l.animate?.([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(-5px,7px) rotate(-28deg)', opacity: 0 }], opts);
    H.r.animate?.([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(5px,7px) rotate(28deg)', opacity: 0 }], opts);
    H.el.animate?.([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260 });
    if (a) a.onfinish = done; else done();
  }
  _shakePips() {
    this.el.stam.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 320 });
  }
  _revive() {
    const run = this.G.run;
    if (!run || run.state !== 'secondChance') return;
    // run.js: acceptSecondChance() is the free in-run revive; revive() is the results-screen continue
    try { if (typeof run.acceptSecondChance === 'function') run.acceptSecondChance(); else run.revive?.(); } catch (e) { console.error('[hud] revive', e); }
    this.el.second.classList.remove('on'); this.v.second = false;
  }
  _dev() { return this.G.input?.device || 'kb'; }
  _checkDevice() {
    const d = this._dev();
    if (d === this._device) return;
    this._device = d;
    this.root.dataset.device = d;
    const e = this.el;
    e.novaKey.innerHTML = d === 'touch' ? '' : this._novaKeys().replace(/<small>.*?<\/small>.*$/, '');
    e.pauseKey.innerHTML = d === 'pad' ? '<span class="kc">≡</span>' : d === 'kb' ? keycap('Esc') : '';
    if (this.v.second) e.secKey.innerHTML = this._confirmKeys();
    if (this._tutId) this._showTutorial(this._tutId);
    if (this._dizzyTarget) this._renderDizzy();
    this._topDirty = true;
    this._placeNova();
  }
  /** on phones the ring wraps input.js's touch 大招 button */
  _placeNova() {
    const e = this.el.nova;
    e.style.left = e.style.top = e.style.right = e.style.bottom = '';
    if (this._device !== 'touch') return;
    const b = this.G.input?.novaBtn;
    const r = b?.getBoundingClientRect?.();
    if (!r || !r.width) return;
    e.style.left = (r.left + r.width / 2 - e.offsetWidth / 2) + 'px';
    e.style.top = (r.top + r.height / 2 - e.offsetHeight / 2) + 'px';
    e.style.right = 'auto'; e.style.bottom = 'auto';
  }
}
