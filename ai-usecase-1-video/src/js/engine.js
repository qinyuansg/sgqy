/* Deterministic motion engine: every visual property is a pure function of t.
   No CSS animations, timers, rAF or Math.random — so any frame renders the same
   way twice, in any order. */
(function () {
  'use strict';
  const TL = window.TL;
  const E = (window.E = {});
  E.W = 1920; E.H = 1080; E.fps = TL.fps || 30; E.total = TL.total;

  const clamp = (E.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x));
  E.lerp = (a, b, k) => a + (b - a) * k;
  E.p = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
  const EZ = (E.ease = {
    lin: x => x,
    in: x => x * x * x,
    out: x => 1 - Math.pow(1 - x, 3),
    out5: x => 1 - Math.pow(1 - x, 5),
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
    expo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    back: x => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  });
  E.ep = (t, a, b, ez = 'out') => EZ[ez](E.p(t, a, b));
  // 0→1→0 envelope: rises over [a,a+r], holds, falls over [b-r,b]
  E.env = (t, a, b, r = 0.3) => Math.min(E.ep(t, a, a + r), 1 - E.ep(t, b - r, b, 'in'));

  // ---------- timeline lookups ----------
  const LINES = {};
  TL.lines.forEach(l => (LINES[l.id] = l));
  E.L = id => LINES[id];                        // a voiceover line {start,end,cues}
  E.C = (id, k = 0) => LINES[id].cues[k];       // a subtitle cue of a line
  E.S = id => TL.scenes[id];
  // time of a word inside a line, by character position (good to ~0.2 s)
  E.at = (id, word, nth = 0) => {
    const l = LINES[id];
    for (const c of l.cues) {
      let i = -1, from = 0;
      for (let n = 0; n <= nth; n++) { i = c.en.indexOf(word, from); from = i + 1; if (i < 0) break; }
      if (i >= 0) return c.start + (c.end - c.start) * (i / Math.max(1, c.en.length));
    }
    return l.start;
  };

  // ---------- deterministic randomness ----------
  E.rng = seed => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };

  // ---------- DOM ----------
  E.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  E.add = (parent, html) => { const n = E.el(html); parent.appendChild(n); return n; };
  E.q = (root, sel) => root.querySelector(sel);
  E.qa = (root, sel) => Array.from(root.querySelectorAll(sel));
  E.css = (el, st) => {
    const c = el.__c || (el.__c = {});
    for (const k in st) { const v = st[k]; if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
  };
  E.attr = (el, k, v) => { const c = el.__a || (el.__a = {}); if (c[k] !== v) { c[k] = v; el.setAttribute(k, v); } };
  E.txt = (el, s) => { s = String(s); if (el.__t !== s) { el.__t = s; el.textContent = s; } };
  E.cls = (el, name, on) => { const key = '__cl_' + name; if (el[key] !== on) { el[key] = on; el.classList.toggle(name, on); } };
  const f3 = x => (Math.abs(x) < 1e-4 ? '0' : x.toFixed(3));
  E.f3 = f3;

  // opacity + offset + optional blur, k in [0,1]
  E.fade = (el, k, o = {}) => {
    const dx = o.dx || 0, dy = o.dy === undefined ? 20 : o.dy, s0 = o.s === undefined ? 1 : o.s, blur = o.blur || 0;
    const kk = clamp(k);
    const sc = s0 === 1 ? 1 : s0 + (1 - s0) * kk;
    const st = {
      opacity: f3(kk),
      transform: `translate3d(${f3((1 - kk) * dx)}px,${f3((1 - kk) * dy)}px,0)` + (sc !== 1 ? ` scale(${f3(sc)})` : ''),
      visibility: kk <= 0.001 ? 'hidden' : 'visible',
    };
    if (blur) st.filter = kk < 1 ? `blur(${f3((1 - kk) * blur)}px)` : 'none';
    E.css(el, st);
  };
  E.vis = (el, k) => E.css(el, { opacity: f3(clamp(k)), visibility: k <= 0.001 ? 'hidden' : 'visible' });

  // headline full stops: Plus Jakarta's '.' has a wide left side-bearing; tuck it in
  E.kernStops = root => {
    const walk = n => {
      if (n.nodeType === 3) {
        if (!/\.(?=\s|$)/.test(n.nodeValue)) return;
        const frag = document.createDocumentFragment();
        n.nodeValue.split(/(\.)(?=\s|$)/).forEach(part => {
          if (part === '.') { const k = document.createElement('span'); k.className = 'kp'; k.textContent = '.'; frag.appendChild(k); }
          else if (part) frag.appendChild(document.createTextNode(part));
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && !n.classList.contains('kp')) Array.from(n.childNodes).forEach(walk);
    };
    walk(root);
  };
  const HEAD = '.h-xl,.h-l,.h-m';

  // split an element's text into word spans (once) for staggered reveals
  E.words = el => {
    if (el.__w) return el.__w;
    const parts = el.textContent.split(/(\s+)/);
    el.textContent = '';
    el.__w = [];
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(' ')); continue; }
      const s = document.createElement('span'); s.className = 'w'; s.textContent = p; el.appendChild(s); el.__w.push(s);
      if (el.matches && el.matches(HEAD)) E.kernStops(s);
    }
    return el.__w;
  };
  E.revealWords = (el, t, t0, o = {}) => {
    const per = o.per || 0.055, dur = o.dur || 0.5, dy = o.dy === undefined ? 16 : o.dy, blur = o.blur === undefined ? 8 : o.blur;
    E.words(el).forEach((w, i) => E.fade(w, E.ep(t, t0 + i * per, t0 + i * per + dur), { dy, blur }));
  };
  // typewriter
  E.type = (el, text, t, t0, cps = 26) => {
    const n = Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps)));
    E.txt(el, t < t0 ? '' : text.slice(0, n));
    return n >= text.length;
  };
  E.num = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  E.clock = (sec) => { sec = Math.floor(sec); const h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60, s = sec % 60; return [h, m, s].map(v => String(v).padStart(2, '0')).join(':'); };

  // ---------- sound cues (collected by tools/cues.mjs for the audio build) ----------
  E.sfx = [];
  E.cue = (t, type, gain = 1, extra = {}) => { if (isFinite(t)) E.sfx.push({ t: +t.toFixed(3), type, gain, ...extra }); };

  // ---------- scenes ----------
  const scenes = (E.scenes = []);
  E.scene = def => scenes.push(def);
  E.after = [];
  E.init = () => {
    const stage = document.getElementById('stage');
    for (const s of scenes) {
      const w = TL.scenes[s.id] || {};
      if (s.start === undefined) s.start = w.start;
      if (s.end === undefined) s.end = w.end;
      s.el = document.createElement('div');
      s.el.className = 'scene ' + (s.cls || '');
      s.el.dataset.id = s.id;
      if (s.z) s.el.style.zIndex = s.z;
      stage.appendChild(s.el);
      s.build(s.el, s);
    }
    stage.querySelectorAll(HEAD).forEach(E.kernStops);
    E.initHooks && E.initHooks.forEach(f => f(stage));
  };
  // Scenes fade in over [start-0.05, start+inDur] and out over [end-outDur, end+0.05].
  E.seek = t => {
    for (const s of scenes) {
      const inD = s.inDur === undefined ? 0.5 : s.inDur, outD = s.outDur === undefined ? 0.45 : s.outDur;
      const a = s.start - (inD ? 0.05 : 0), b = s.end + (outD ? 0.05 : 0);
      if (t < a || t > b) {
        if (s.vis) { s.el.style.display = 'none'; s.vis = false; }
        continue;
      }
      if (!s.vis) { s.el.style.display = 'block'; s.vis = true; }
      let o = 1;
      if (inD) o = Math.min(o, E.ep(t, a, s.start + inD, 'sine'));
      if (outD) o = Math.min(o, 1 - E.ep(t, s.end - outD, b, 'sine'));
      s.o = o;
      if (!s.ownFade) E.css(s.el, { opacity: f3(o) });
      s.update(t, t - s.start, s);
    }
    for (const f of E.after) f(t);
    E.t = t;
  };
  window.seek = E.seek;
})();
