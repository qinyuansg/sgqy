// ─────────────────────────────────────────────────────────────
// CUBE DASH — unified input: keyboard · gamepad (Switch/Xbox/PS) · touch
//
//   input.move            {x, y}  analog, |v| ≤ 1   (x → right, y → DOWN the screen)
//   input.held(action)    bool    action currently down
//   input.pressed(action) bool    went down this frame (edge)
//   input.device          'kb' | 'pad' | 'touch'   last used — for button prompts
//   input.rumble(strong, weak, ms)
//   input.setTouchControls(visible)   show/hide the on-screen stick + buttons
//
// Actions: dash · nova · pause · restart · mute · confirm · back · up · down · left · right
// ─────────────────────────────────────────────────────────────
import { clamp } from './core.js';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'dash', ShiftRight: 'dash', Space: 'dash', KeyJ: 'dash',
  KeyE: 'nova', KeyK: 'nova', KeyQ: 'nova', Enter: 'nova', NumpadEnter: 'nova',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart', KeyM: 'mute',
  Backspace: 'back',
};

// Standard Gamepad mapping (Switch Pro / Xbox / DualSense in browsers)
//  0 bottom · 1 right · 2 left · 3 top · 4 LB · 5 RB · 6 LT · 7 RT · 8 select · 9 start
//  12 up · 13 down · 14 left · 15 right
const PADMAP = [
  [0, 'dash'], [1, 'dash'], [5, 'dash'], [7, 'dash'],
  [2, 'nova'], [3, 'nova'], [4, 'nova'], [6, 'nova'],
  [9, 'pause'], [8, 'restart'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
];
const PAD_CONFIRM = 0, PAD_BACK = 1;
const DEAD = 0.18;

const CSS = `
#touchUI{position:fixed;inset:0;pointer-events:none;z-index:30;display:none}
#touchUI.on{display:block}
#touchUI .zone{position:absolute;left:0;top:0;bottom:0;width:50%;pointer-events:auto;touch-action:none}
#touchUI .rzone{position:absolute;right:0;top:0;bottom:0;width:50%;pointer-events:auto;touch-action:none}
#touchUI .stick{position:absolute;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.28),rgba(120,170,255,.16) 60%,rgba(255,255,255,.08));
  border:3px solid rgba(255,255,255,.55);box-shadow:0 0 24px rgba(80,160,255,.45);opacity:.0;transition:opacity .15s}
#touchUI .stick.on{opacity:1}
#touchUI .knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff,#9cc4ff 55%,#3d7bff);box-shadow:0 4px 14px rgba(20,60,160,.45)}
#touchUI .btn{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;align-items:center;
  justify-content:center;flex-direction:column;font:900 15px/1 system-ui,sans-serif;color:#fff;letter-spacing:.04em;
  text-shadow:0 2px 4px rgba(0,0,40,.4);user-select:none;-webkit-user-select:none;transition:transform .08s}
#touchUI .btn i{font-style:normal;font-size:28px;margin-bottom:2px}
#touchUI .btn b{font-weight:900}
#touchUI .btn.down{transform:scale(.9)}
#touchUI.cine .btn{opacity:0;pointer-events:none;transition:opacity .2s}
#touchUI .dash{right:calc(28px + env(safe-area-inset-right));bottom:calc(34px + env(safe-area-inset-bottom));width:108px;height:108px;
  background:radial-gradient(circle at 35% 30%,#8fe9ff,#2f8bff 60%,#1b4fd8);border:4px solid rgba(255,255,255,.8);
  box-shadow:0 6px 22px rgba(30,90,255,.55)}
#touchUI .nova{right:calc(146px + env(safe-area-inset-right));bottom:calc(44px + env(safe-area-inset-bottom));width:78px;height:78px;
  background:radial-gradient(circle at 35% 30%,#ffe9a8,#ffae2b 60%,#ff6a00);border:4px solid rgba(255,255,255,.8);
  box-shadow:0 6px 22px rgba(255,140,0,.5);opacity:.45;filter:saturate(.4)}
#touchUI .nova.ready{opacity:1;filter:none;animation:novaPulse 1s ease-in-out infinite}
#touchUI .pause{right:calc(14px + env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));width:48px;height:48px;
  background:rgba(255,255,255,.35);border:3px solid rgba(255,255,255,.8);font-size:20px}
@keyframes novaPulse{0%,100%{box-shadow:0 0 14px rgba(255,170,0,.6)}50%{box-shadow:0 0 36px rgba(255,220,80,1)}}
`;

export class Input {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.device = matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'kb';
    this._keys = new Set();      // physical key codes held
    this._down = new Set();      // actions held from keyboard
    this._padDown = new Set();   // actions held from gamepad
    this._touchPtrs = new Map(); // action → Set<pointerId> held on touch buttons (per finger, so a resting thumb never eats taps)
    this._pressed = new Set();   // edges collected since last update()
    this._frame = new Set();     // edges visible during this frame
    this._kbAxis = { up: 0, down: 0, left: 0, right: 0 };
    this._padAxis = { x: 0, y: 0 };
    this._touchAxis = { x: 0, y: 0 };
    this._padPrev = [];
    this._padStickLatch = { x: 0, y: 0 };
    this.pad = null;
    this.enabled = true;
    this._bindKeyboard();
    this._buildTouch();
    window.addEventListener('gamepadconnected', (e) => { this.pad = e.gamepad; this.device = 'pad'; this._notify(); });
    window.addEventListener('blur', () => this.releaseAll());
    this.onDeviceChange = null;
  }

  _notify() { this.onDeviceChange?.(this.device); }
  _setDevice(d) { if (this.device !== d) { this.device = d; this._notify(); } }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this._setDevice('kb');
      if (!this._down.has(a)) this._pressed.add(a);
      this._keys.add(e.code);
      this._syncKeys();
      // Space / Enter also confirm in menus; Esc also backs out
      if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) this._pressed.add('confirm');
      if (e.code === 'Escape' && !e.repeat) this._pressed.add('back');
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      this._keys.delete(e.code);
      this._syncKeys();
    });
  }

  // derive held actions from the set of physical keys (W + ↑ can overlap safely)
  _syncKeys() {
    this._down.clear();
    for (const code of this._keys) this._down.add(KEYMAP[code]);
    for (const k in this._kbAxis) this._kbAxis[k] = this._down.has(k) ? 1 : 0;
  }

  _buildTouch() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'touchUI';
    root.innerHTML = `
      <div class="zone"></div>
      <div class="rzone" data-a="dash"></div>
      <div class="stick"><div class="knob"></div></div>
      <div class="btn nova" data-a="nova"><i>✦</i><b class="lbl-nova">NOVA</b></div>
      <div class="btn dash" data-a="dash"><i>⚡</i><b class="lbl-dash">DASH</b></div>
      <div class="btn pause" data-a="pause">❚❚</div>`;
    document.body.appendChild(root);
    this.touchRoot = root;
    const zone = root.querySelector('.zone');
    const stick = root.querySelector('.stick');
    const knob = root.querySelector('.knob');
    this.novaBtn = root.querySelector('.nova');
    let stickId = null, cx = 0, cy = 0;
    const R = 56;
    const moveStick = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const m = Math.min(1, d / R);
      const k = d > 1e-3 ? m / Math.max(d, 1e-3) : 0;
      const ux = (x - cx) * k, uy = (y - cy) * k;
      this._touchAxis.x = Math.abs(m) < 0.12 ? 0 : ux;
      this._touchAxis.y = Math.abs(m) < 0.12 ? 0 : uy;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (stickId !== null) return;
      e.preventDefault();
      this._setDevice('touch');
      stickId = e.pointerId; cx = e.clientX; cy = e.clientY;
      stick.style.left = cx + 'px'; stick.style.top = cy + 'px';
      stick.classList.add('on');
      zone.setPointerCapture?.(e.pointerId);
      moveStick(cx, cy);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e.clientX, e.clientY); });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null; stick.classList.remove('on');
      knob.style.transform = ''; this._touchAxis.x = 0; this._touchAxis.y = 0;
    };
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);
    // the whole right half is a forgiving DASH target (kids miss small buttons)
    for (const btn of root.querySelectorAll('.btn, .rzone')) {
      const a = btn.dataset.a;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); this._setDevice('touch');
        btn.classList.add('down');
        this._pressed.add(a);                       // every new finger is a press edge
        if (!this._touchPtrs.has(a)) this._touchPtrs.set(a, new Set());
        this._touchPtrs.get(a).add(e.pointerId);
        btn.setPointerCapture?.(e.pointerId);
      });
      const up = (e) => {
        const set = this._touchPtrs.get(a);
        set?.delete(e.pointerId);
        if (!set || set.size === 0) btn.classList.remove('down');
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    }
    // any touch anywhere marks device as touch (menus)
    window.addEventListener('touchstart', () => this._setDevice('touch'), { passive: true });
  }

  setTouchControls(visible) {
    if (!visible) this._touchPtrs.clear();      // no stuck "held" fingers across screens
    this.touchRoot.classList.toggle('on', !!visible && this.device === 'touch');
    this._touchWanted = !!visible;
  }
  setNovaReady(ready) { this.novaBtn.classList.toggle('ready', !!ready); }
  /** localise the on-screen button labels, e.g. setTouchLabels('冲刺', '大招') */
  setTouchLabels(dash, nova) {
    this.touchRoot.querySelector('.lbl-dash').textContent = dash;
    this.touchRoot.querySelector('.lbl-nova').textContent = nova;
  }

  _pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    this.pad = pad;
    this._padDown.clear();
    this._padAxis.x = 0; this._padAxis.y = 0;
    if (!pad) return;
    let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const m = Math.hypot(ax, ay);
    if (m < DEAD) { ax = 0; ay = 0; } else {
      const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
      ax *= k; ay *= k;
    }
    let active = m > 0.5;
    for (const [i, a] of PADMAP) {
      const b = pad.buttons[i];
      const down = !!b && (b.pressed || b.value > 0.5);
      if (down) {
        this._padDown.add(a); active = true;
        if (!this._padPrev[i]) this._pressed.add(a);
      }
    }
    // confirm/back edges for menus
    const btn = (i) => !!pad.buttons[i] && pad.buttons[i].pressed;
    if (btn(PAD_CONFIRM) && !this._padPrev[PAD_CONFIRM]) this._pressed.add('confirm');
    if (btn(PAD_BACK) && !this._padPrev[PAD_BACK]) this._pressed.add('back');
    // stick → menu nav edges (latched)
    const lx = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0, ly = ay > 0.6 ? 1 : ay < -0.6 ? -1 : 0;
    if (lx !== this._padStickLatch.x) { if (lx > 0) this._pressed.add('right'); if (lx < 0) this._pressed.add('left'); this._padStickLatch.x = lx; }
    if (ly !== this._padStickLatch.y) { if (ly > 0) this._pressed.add('down'); if (ly < 0) this._pressed.add('up'); this._padStickLatch.y = ly; }
    this._padPrev = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    this._padAxis.x = ax; this._padAxis.y = ay;
    if (this._padDown.has('left')) this._padAxis.x = -1;
    if (this._padDown.has('right')) this._padAxis.x = 1;
    if (this._padDown.has('up')) this._padAxis.y = -1;
    if (this._padDown.has('down')) this._padAxis.y = 1;
    if (active) this._setDevice('pad');
  }

  /** call once per frame BEFORE game logic */
  update() {
    this._pollPad();
    this._frame = this._pressed;
    this._pressed = new Set();
    let x = this._kbAxis.right - this._kbAxis.left;
    let y = this._kbAxis.down - this._kbAxis.up;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    if (Math.abs(this._padAxis.x) + Math.abs(this._padAxis.y) > Math.abs(x) + Math.abs(y)) { x = this._padAxis.x; y = this._padAxis.y; }
    if (Math.abs(this._touchAxis.x) + Math.abs(this._touchAxis.y) > Math.abs(x) + Math.abs(y)) { x = this._touchAxis.x; y = this._touchAxis.y; }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.move.x = this.enabled ? clamp(x, -1, 1) : 0;
    this.move.y = this.enabled ? clamp(y, -1, 1) : 0;
    if (this._touchWanted !== undefined) this.touchRoot.classList.toggle('on', this._touchWanted && this.device === 'touch');
  }

  held(a) { return this.enabled && (this._down.has(a) || this._padDown.has(a) || (this._touchPtrs.get(a)?.size ?? 0) > 0); }
  pressed(a) { return this._frame.has(a) && (this.enabled || !['dash', 'nova'].includes(a)); }
  /** swallow an edge so two systems don't both react to it */
  consume(a) { this._frame.delete(a); }
  releaseAll() {
    this._keys.clear(); this._down.clear(); this._touchPtrs.clear();
    for (const k in this._kbAxis) this._kbAxis[k] = 0;
    this._touchAxis.x = this._touchAxis.y = 0;
  }

  /** HD-rumble-ish haptics: gamepad dual-rumble, or phone vibration fallback */
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (this.hapticsOff) return;
    try {
      const act = this.pad?.vibrationActuator;
      if (act && this.device === 'pad') {
        act.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) });
        return;
      }
      if (this.device === 'touch' && navigator.vibrate) navigator.vibrate(Math.round(ms * Math.max(strong, weak)));
    } catch { /* haptics unsupported */ }
  }
}
