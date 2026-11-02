/* Deterministic timeline engine: window.renderAt(t) draws the frame at time t (seconds).
   Elements declare entrances with data-in / data-out:
     "s+0.2"        seconds after the chapter starts
     "3" / "3+0.5"  start of beat 3 (+ offset)
     "3:keyword"    estimated moment the keyword is spoken in beat 3 (char-proportional)
   data-a: up|down|left|right|fade|pop|scale|draw|wipe|grow|growy   data-d: duration (s) */
(function () {
  const TL = window.TIMELINE;
  const CH = TL.chapters;
  const last = CH[CH.length - 1];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeInOut = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  window.EZ = { clamp, easeOut, easeInOut, easeBack };

  function beatRel(ch, i) { const b = ch.beats[Math.min(i, ch.beats.length - 1)]; return b.start - ch.start; }
  function parseT(s, ch) {
    if (s == null || s === "") return null;
    s = String(s).trim();
    let m = s.match(/^(\d+):(.+?)(?:\s*([+-]\d*\.?\d+))?$/);
    if (m) {
      const b = ch.beats[Math.min(+m[1], ch.beats.length - 1)];
      const cap = b.cap.toLowerCase(), k = m[2].trim().toLowerCase();
      let idx = cap.indexOf(k);
      if (idx < 0) { console.warn("keyword not found", ch.id, s); idx = 0; }
      return b.start - ch.start + b.dur * idx / cap.length + (m[3] ? parseFloat(m[3]) : 0);
    }
    m = s.match(/^(s|e|\d+)\s*([+-]\d*\.?\d+)?$/);
    if (!m) { console.warn("bad time", s); return 0; }
    const base = m[1] === "s" ? 0 : m[1] === "e" ? (ch.end - ch.start) : beatRel(ch, +m[1]);
    return base + (m[2] ? parseFloat(m[2]) : 0);
  }
  window.parseT = parseT;

  const scenes = [];
  function init() {
    // icons
    document.querySelectorAll("[data-i]").forEach(el => {
      const n = el.getAttribute("data-i");
      if (!window.ICONS[n]) console.warn("missing icon", n);
      el.classList.add("ic");
      el.innerHTML = `<svg viewBox="0 0 24 24">${window.ICONS[n] || ""}</svg>`;
    });
    CH.forEach((ch, ci) => {
      const el = document.getElementById("sc-" + ch.id);
      if (!el) { console.warn("no scene for", ch.id); return; }
      const items = [];
      el.querySelectorAll("[data-in],[data-out]").forEach(n => {
        const it = { el: n, a: n.dataset.a || "up", d: parseFloat(n.dataset.d || "0.65"),
          tin: parseT(n.dataset.in, ch), tout: parseT(n.dataset.out, ch) };
        if (it.a === "draw" && n.getTotalLength) { it.len = n.getTotalLength(); n.style.strokeDasharray = it.len; }
        if (it.a === "count") { it.target = parseFloat(n.dataset.count); it.fmt = n.dataset.fmt || ""; }
        items.push(it);
      });
      scenes.push({ ch, ci, el, items, t0: ch.start, t1: ch === last ? TL.total + 10 : ch.end });
    });
    // progress bar
    const prog = document.getElementById("prog");
    CH.forEach(ch => {
      const s = document.createElement("div"); s.className = "seg"; s.style.flex = (ch.end - ch.start).toFixed(2);
      s.appendChild(document.createElement("i")); prog.appendChild(s); ch._seg = s.firstChild;
    });
    // caption chunks
    caps = [];
    CH.forEach(ch => ch.beats.forEach(b => b.chunks.forEach(c => caps.push(c))));
  }
  let caps = [];

  function applyItem(it, lt) {
    let p = it.tin == null ? 1 : clamp((lt - it.tin) / it.d, 0, 1);
    let q = it.tout == null ? 0 : clamp((lt - it.tout) / 0.45, 0, 1);
    const e = it.a === "pop" ? easeBack(p) : easeOut(p);
    const vis = clamp(p * 1.6, 0, 1) * (1 - q);
    const s = it.el.style;
    switch (it.a) {
      case "up": s.translate = `0 ${(1 - e) * 36}px`; break;
      case "down": s.translate = `0 ${-(1 - e) * 36}px`; break;
      case "left": s.translate = `${(1 - e) * 60}px 0`; break;
      case "right": s.translate = `${-(1 - e) * 60}px 0`; break;
      case "pop": case "scale": s.scale = `${0.6 + 0.4 * e}`; break;
      case "draw": s.strokeDashoffset = it.len * (1 - e); break;
      case "wipe": s.clipPath = `inset(-20px ${(1 - e) * 100}% -20px -20px)`; break;
      case "grow": s.scale = `${Math.max(e, 0.0001)} 1`; s.transformOrigin = "left center"; break;
      case "growy": s.scale = `1 ${Math.max(e, 0.0001)}`; s.transformOrigin = "center bottom"; break;
      case "count": it.el.textContent = Math.round(it.target * e).toLocaleString("en-US") + it.fmt; break;
    }
    const o = it.a === "draw" ? (1 - q) * (p > 0 ? 1 : 0) : vis;
    s.opacity = o.toFixed(3);
    s.visibility = o <= 0.002 ? "hidden" : "visible";
  }

  let lastCap = null, lastHdr = null;
  window.renderAt = function (t) {
    // scenes
    let cur = null;
    for (const sc of scenes) {
      const fin = clamp((t - sc.t0) / 0.5, 0, 1), fout = clamp((sc.t1 - t) / 0.45, 0, 1);
      const on = t >= sc.t0 - 0.01 && t <= sc.t1;
      if (!on) { sc.el.style.display = "none"; continue; }
      sc.el.style.display = "block";
      sc.el.style.opacity = Math.min(fin, fout).toFixed(3);
      cur = sc;
      const lt = t - sc.t0;
      for (const it of sc.items) applyItem(it, lt);
      const hook = window.HOOKS && window.HOOKS[sc.ch.id];
      if (hook) hook(lt, sc.ch, i => beatRel(sc.ch, i), sc.el);
    }
    // header
    const ch = cur ? cur.ch : CH[0];
    if (lastHdr !== ch.id) {
      lastHdr = ch.id;
      const [a, b] = ch.title.split(" · ");
      document.getElementById("hdrNum").textContent = ch.num;
      document.getElementById("hdrTitle").innerHTML = b ? `${a} <span>· ${b}</span>` : a;
    }
    const hdr = document.getElementById("hdr");
    hdr.style.opacity = ch.id === "intro" ? 0 : (cur ? cur.el.style.opacity : 1);
    // progress
    CH.forEach(c => { c._seg.style.width = (clamp((t - c.start) / (c.end - c.start), 0, 1) * 100).toFixed(2) + "%"; });
    // captions
    let k = -1;
    for (let i = 0; i < caps.length; i++) { if (caps[i].t0 <= t) k = i; else break; }
    const box = document.getElementById("capbox");
    let show = null;
    if (k >= 0) {
      const c = caps[k], nxt = caps[k + 1];
      const until = nxt && nxt.t0 - c.t1 < 0.8 ? nxt.t0 : c.t1 + 0.35;
      if (t < until) show = c;
    }
    if (show) {
      if (lastCap !== show) { box.textContent = show.text; lastCap = show; }
      box.style.opacity = clamp((t - show.t0) / 0.12, 0, 1).toFixed(3);
      box.style.visibility = "visible";
    } else { box.style.visibility = "hidden"; lastCap = null; }
  };

  window.addEventListener("DOMContentLoaded", () => {
    init();
    const q = new URLSearchParams(location.search);
    const fit = () => {
      if (q.has("render")) return;
      const s = Math.min(innerWidth / 1920, innerHeight / 1080);
      document.getElementById("stage").style.transform = `scale(${s})`;
    };
    fit(); addEventListener("resize", fit);
    window.renderAt(parseFloat(q.get("t") || "0"));
    if (!q.has("render")) {
      // simple preview player: click to play with narration (if build/narration.wav exists)
      const audio = new Audio("build/narration.wav");
      let playing = false, t0 = 0, start = 0;
      const tick = () => {
        if (!playing) return;
        const t = audio.readyState >= 2 && !audio.paused ? audio.currentTime : (performance.now() - start) / 1000 + t0;
        window.renderAt(t);
        if (t < TL.total) requestAnimationFrame(tick);
      };
      document.addEventListener("click", () => {
        playing = !playing;
        if (playing) { t0 = parseFloat(q.get("t") || "0"); audio.currentTime = t0; start = performance.now(); audio.play().catch(() => {}); tick(); }
        else audio.pause();
      });
    }
    window.__ready = document.fonts.ready.then(() => true);
  });
})();
