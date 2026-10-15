/* AgilFence film: accent is ice blue (#8FB4FF); lavender stays reserved for Co-pilot.
   Shared components: icons, viewfinder brackets, severity pills, Co-pilot card, numbered rows,
   and the V11 console (real V11 screens with a camera that pushes in, highlights and tags). */
(function () {
  'use strict';
  const K = (window.K = {});
  // add SVG markup to an SVG parent (parsed in the SVG namespace)
  K.sadd = (parent, html) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = html.trim(); const n = t.firstElementChild; parent.appendChild(n); return n; };

  // ---------- stroke icons (24×24) ----------
  const P = {
    alarm: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.8H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    camera: '<path d="M2.8 8.2 14.6 5l1.9 6.3-11.8 3.2z"/><path d="m16.2 7.4 4.4-1.3.9 3.1-4.4 1.3"/><path d="m8.3 13.6 1.2 4.6H4.6"/>',
    door: '<path d="M6.5 3.5h10v17h-10z"/><path d="M13.5 12.3h.01"/><path d="M3.5 20.5h17"/>',
    fence: '<path d="M4 20V8.5l2-2.5 2 2.5V20"/><path d="M10 20V8.5l2-2.5 2 2.5V20"/><path d="M16 20V8.5l2-2.5 2 2.5V20"/><path d="M3 11h18M3 16h18"/>',
    bag: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9.5 8V5.2h5V8"/><path d="M9 11.5v5M15 11.5v5"/>',
    person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.8-3.7 3.6-5.6 7-5.6s6.2 1.9 7 5.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3.3 3.1-5 6-5s5.3 1.7 6 5"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2"/><path d="M17.5 14.7c1.8.6 3.1 2.2 3.5 4.8"/>',
    shield: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/>',
    shieldCheck: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    list: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m3.8 6.5 1.4 1.4 2.4-2.6M3.8 12l1.4 1.4 2.4-2.6M3.8 17.5l1.4 1.4 2.4-2.6"/>',
    doc: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5"/><path d="M9 12.5h7M9 16.5h7"/>',
    sparkle: '<path d="M11 3.5 12.9 9l5.6 2-5.6 2L11 18.5 9.1 13l-5.6-2 5.6-2z"/><path d="M18.5 3v3.6M16.7 4.8h3.6"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeOff: '<path d="M2.5 12S6 5.8 12 5.8c1.6 0 3 .4 4.3 1M21.5 12s-3.5 6.2-9.5 6.2c-1.6 0-3-.4-4.3-1"/><path d="M9.9 14.1a2.8 2.8 0 0 1 4-4"/><path d="m3.5 20.5 17-17"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    server: '<rect x="4" y="4" width="16" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="16" height="6.5" rx="1.5"/><path d="M7.5 7.2h.01M7.5 16.8h.01"/>',
    check: '<path d="m5 12.5 4.6 4.6L19.2 7.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    hand: '<path d="M8 12.5V5.8a1.5 1.5 0 0 1 3 0v5.4M11 11V4.6a1.5 1.5 0 0 1 3 0V11M14 11V6.2a1.5 1.5 0 0 1 3 0v7.3a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.9-2.6L3.2 14.6a1.6 1.6 0 0 1 2.6-1.9L8 15"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    signal: '<path d="M4.5 12.5a10.5 10.5 0 0 1 15 0"/><path d="M7.8 15.6a6 6 0 0 1 8.4 0"/><path d="M12 19.2h.01"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    radar: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12 18 6"/><path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M6.5 14.5h4"/>',
    fire: '<path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8.5-1.5 2-2 3-2.5 4.5C11 9 10 7.5 10 5c-2.5 2-4 5-4 9a6 6 0 0 0 6 7z"/>',
    building: '<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 13.5h.01M12 13.5h.01M16 13.5h.01"/>',
    radio: '<rect x="5" y="8" width="14" height="13" rx="2"/><path d="M8 8 15 3"/><circle cx="12" cy="15" r="2.5"/>',
    arrow: '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
    up: '<path d="M12 20V5"/><path d="m6 11 6-6 6 6"/><path d="M5 20h14"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/>',
    userCheck: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.7 3.4-5.6 6.5-5.6 1.6 0 3 .5 4.1 1.4"/><path d="m15 17.5 2 2 4-4.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.6 3.5 5.5 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.5-3.5-8.5s1.1-5.9 3.5-8.5z"/>',
  };
  K.icon = (name, size = 24, sw = 1.75, extra = '') =>
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${P[name] || ''}</svg>`;
  K.ibox = (name, box = 64, size = 28, extra = '') => `<div class="ibox" style="width:${box}px;height:${box}px;${extra}">${K.icon(name, size)}</div>`;

  K.SEV = { crit: ['CRITICAL', '#D72D30', '#FF8E8F'], warn: ['WARNING', '#D4B741', '#F0D66E'], info: ['INFO', '#4DAFBE', '#8FDCE6'] };
  K.pill = (sev, text) => `<span class="pill ${sev}"><i></i>${text || K.SEV[sev][0]}</span>`;

  // CCTV viewfinder brackets around a box (stage px)
  K.brackets = (parent, x, y, w, h, o = {}) => {
    const g = o.gap ?? 16, a = o.arm ?? 44, col = o.col || 'rgba(182,156,255,.8)', lw = o.lw ?? 2.5;
    return ['tl', 'tr', 'bl', 'br'].map(k => {
      const L = k[1] === 'l' ? x - g : x + w + g - a, T = k[0] === 't' ? y - g : y + h + g - a;
      return E.add(parent, `<div class="brk ${k}" style="left:${L}px;top:${T}px;width:${a}px;height:${a}px;border-color:${col};--lw:${lw}px"></div>`);
    });
  };
  // corners spread outward as they appear (k 0..1)
  K.bracketsIn = (els, k, spread = 26) => els.forEach(e => {
    const c = e.className.split(' ')[1];
    const dx = (c[1] === 'l' ? -1 : 1) * spread * (1 - k), dy = (c[0] === 't' ? -1 : 1) * spread * (1 - k);
    E.css(e, { opacity: E.f3(k), transform: `translate(${E.f3(dx)}px,${E.f3(dy)}px)` });
  });

  // ---------- Co-pilot card: header (sparkle, label, meter) + typed quote ----------
  // meter: {kind:'gauge', v, label, col} | {kind:'steps', n, done, wait, label}
  K.copilot = (parent, o) => {
    const m = o.meter;
    let meter = '';
    if (m && m.kind === 'gauge') {
      const r = 19, C2 = 2 * Math.PI * r;
      meter = `<div style="display:flex;align-items:center;gap:12px">
        <span class="label" style="color:${m.col ? m.col : 'var(--muted)'};font-size:13px">${m.label || 'Confidence'}</span>
        <span class="mtxt mono" style="font-size:20px;font-weight:600;color:#fff;min-width:46px;text-align:right">0%</span>
        <svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="${r}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="5"/>
          <circle class="marc" cx="23" cy="23" r="${r}" fill="none" stroke="${m.col || '#B69CFF'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C2.toFixed(2)}" stroke-dashoffset="${C2.toFixed(2)}" transform="rotate(-90 23 23)"/></svg></div>`;
      m.C2 = C2;
    } else if (m && m.kind === 'steps') {
      meter = `<div style="display:flex;align-items:center;gap:12px"><span class="label mlab" style="color:var(--lav);font-size:13px">${m.label}</span>
        <span class="msteps" style="display:flex;gap:6px">${Array.from({ length: m.n }, () => '<i style="width:30px;height:9px;border-radius:3px;display:block"></i>').join('')}</span></div>`;
    }
    const el = E.add(parent, `
      <div class="abs cp" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;${o.h ? `height:${o.h}px;` : ''}padding:22px 26px 24px">
        <div style="display:flex;align-items:center;justify-content:space-between;height:46px">
          <div class="cp-h">${K.icon('sparkle', 24, 1.9)}<span>${o.label || 'CO-PILOT'}</span></div>${meter}
        </div>
        <div class="cp-q" style="margin-top:14px;${o.qstyle || ''}"><span class="qt"></span><span class="caret"></span></div>
      </div>`);
    const c = { el, o, qt: E.q(el, '.qt'), caret: E.q(el, '.caret'), arc: E.q(el, '.marc'), mtxt: E.q(el, '.mtxt'), steps: E.qa(el, '.msteps i'), mlab: E.q(el, '.mlab') };
    // reserve the final height so the card does not grow while typing
    c.qt.textContent = o.quote; const h = el.offsetHeight; c.qt.textContent = '';
    if (!o.h) el.style.height = h + 'px';
    return c;
  };
  // tq: typing start; tm: meter start
  K.copilotUpdate = (c, t, tq, tm, cps = 42) => {
    let done;
    if (c.o.pre && t < tq) { E.txt(c.qt, c.o.pre + '.'.repeat(1 + Math.floor(t * 3) % 3)); E.css(c.qt, { color: 'var(--muted)' }); done = false; }
    else { done = E.type(c.qt, c.o.quote, t, tq, cps); E.css(c.qt, { color: '' }); }
    E.vis(c.caret, t < tq - 0.3 ? 0 : done ? (Math.floor(t * 2.2) % 2 ? 0 : 1) * (1 - E.p(t, tq + c.o.quote.length / cps + 1.2, tq + c.o.quote.length / cps + 1.5)) : 1);
    const m = c.o.meter;
    if (m && m.kind === 'gauge') {
      const k = E.ep(t, tm, tm + 1.1, 'out');
      E.attr(c.arc, 'stroke-dashoffset', (m.C2 * (1 - k * m.v / 100)).toFixed(2));
      E.txt(c.mtxt, Math.round(k * m.v) + '%');
    } else if (m && m.kind === 'steps') {
      const st = m.after && t >= m.after.t ? { ...m, ...m.after } : m;
      if (c.mlab) E.txt(c.mlab, st.label);
      c.steps.forEach((s, i) => {
        const on = t >= tm + i * 0.18;
        const ss = i < st.done ? 'done' : i < st.done + (st.wait || 0) ? 'wait' : 'todo';
        E.css(s, on ? (ss === 'done' ? { background: '#B69CFF', border: '0', boxShadow: '0 0 10px rgba(182,156,255,.6)' }
          : ss === 'wait' ? { background: 'transparent', border: '1.5px solid #B69CFF', boxShadow: `0 0 ${Math.floor(t * 2) % 2 ? 0 : 10}px rgba(182,156,255,.7)` }
            : { background: 'transparent', border: '1.5px solid rgba(255,255,255,.4)', boxShadow: 'none' })
          : { background: 'rgba(255,255,255,.08)', border: '0', boxShadow: 'none' });
      });
    }
  };

  // numbered evidence rows (left column): [[n, bold, rest], ...]
  K.rows = (parent, x, y, w, rows, pitch = 58) => rows.map((r, i) => E.add(parent, `
    <div class="abs" style="left:${x}px;top:${y + i * pitch}px;width:${w}px;display:flex;align-items:center;gap:16px;white-space:nowrap">
      <span class="disc">${r[0]}</span><span style="font-size:23px;color:#fff;font-weight:600">${r[1]}</span><span style="font-size:23px;color:var(--muted)">${r[2] || ''}</span>
    </div>`));

  // ---------- cursor ----------
  K.cursorHTML = '<svg class="cursor" viewBox="0 0 30 30"><path d="M6 3.5 23.5 16l-7.6 1.4L20.4 26l-3.3 1.6-4.5-8.6-5.6 5.2z" fill="#fff" stroke="#0A1428" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  // ---------- text width of V11 UI text (Roboto metrics) ----------
  K.rw = (s, px, wt = 500) => { const T = window.ROBOTO[wt] || window.ROBOTO[500]; let w = 0; for (const ch of String(s)) w += T[ch] ?? 0.55; return w * px; };
  // box around an on-screen V11 text anchor (frame px)
  K.ab = (frame, needle, i = 0, o = {}) => {
    const hits = window.ANCH[frame].filter(a => a[3].includes(needle));
    if (!hits[i]) throw new Error(`anchor not found: ${frame} / ${needle}`);
    const [x, y, size, t] = hits[i], pad = o.pad ?? 6;
    return [x - pad, y - size * 0.95 - pad * 0.6, (o.w ?? K.rw(t, size)) + 2 * pad, size * 1.25 + pad * 1.2];
  };

  // ======================================================================
  // V11 console: a device that shows real V11 frames through a moving camera.
  //   K.console(parent, {x, y, w})  →  c
  //   c.frame(name)        add a screen layer
  //   c.plan = { screens: [[t, name]], shots: [[t, rect|null, dur]] }   rect in frame px (1400×1069)
  //   K.hl(c, {...})       highlight + numbered tag in frame coordinates
  // ======================================================================
  const FW = 1400, FH = 1069;   // the device shows 1400 × 1069 frame px at zoom 1
  const fwOf = name => (window.FRAMES && window.FRAMES[name] ? window.FRAMES[name][0] : FW);
  K.console = (parent, o) => {
    const VW = o.w, VH = Math.round(o.w * FH / FW);
    const root = E.add(parent, `<div class="abs con" style="left:${o.x}px;top:${o.y}px;width:${VW}px;height:${VH}px"></div>`);
    const dev = E.add(root, `<div class="abs dev" style="left:0;top:0;width:${VW}px;height:${VH}px"><div class="spec"></div></div>`);
    const scan = E.add(dev, '<div class="abs" style="left:0;right:0;height:2px;top:0;z-index:5;background:linear-gradient(90deg,transparent,#C6DAFF 20%,#fff 50%,#C6DAFF 80%,transparent);box-shadow:0 0 22px 6px rgba(143,180,255,.55);opacity:0"></div>');
    // when zoomed in on the right-hand panel, fade out the clipped map labels at the left edge
    const edge = E.add(dev, '<div class="abs" style="left:0;top:0;bottom:0;width:190px;z-index:3;background:linear-gradient(90deg,#05070D 42%,rgba(5,7,13,0));opacity:0"></div>');
    const edgeR = E.add(dev, '<div class="abs" style="right:0;top:0;bottom:0;width:190px;z-index:3;background:linear-gradient(270deg,#05070D 42%,rgba(5,7,13,0));opacity:0"></div>');
    const ov = E.add(root, `<svg class="abs" width="${VW}" height="${VH}" style="left:0;top:0;z-index:6;overflow:visible"></svg>`);
    const brk = K.brackets(root, 0, 0, VW, VH, { gap: 18, arm: 46 });
    const c = { root, dev, scan, edge, edgeR, ov, brk, VW, VH, s0: VH / FH, layers: {}, hls: [], plan: { screens: [], shots: [] }, cam: { k: VH / FH, ox: 0, oy: 0, z: 1 } };
    c.frame = name => {
      if (c.layers[name]) return c.layers[name];
      const w = fwOf(name);
      const L = E.add(dev, `<div class="scr" style="visibility:hidden;width:${w}px"><img src="assets/af/${name}.png" style="width:${w}px"></div>`);
      return (c.layers[name] = L);
    };
    return c;
  };
  // native width of the screen showing at time t
  const screenW = (c, t) => { let w = FW; for (const [ts, name] of c.plan.screens) if (t >= ts) w = fwOf(name); return w; };
  const camAt = (c, t) => {
    // interpolate (cx, cy, log z) between shots; a null rect is the whole screen
    // a wider-than-1400 screen may zoom out to fit (never below its fit-to-width zoom)
    const toP = (r, W) => { r = r || [0, 0, W, FH]; const z = E.clamp(Math.min(FW / r[2], FH / r[3]), Math.min(1, FW / W), 2.3); return [r[0] + r[2] / 2, r[1] + r[3] / 2, Math.log(z)]; };
    let p = toP(null, screenW(c, c.plan.shots.length ? c.plan.shots[0][0] : t));
    for (const [ts, r, d = 1.3] of c.plan.shots) {
      if (t < ts) break;
      const q = toP(r, screenW(c, ts + d)), k = E.ease.inOut(E.p(t, ts, ts + d));
      p = [E.lerp(p[0], q[0], k), E.lerp(p[1], q[1], k), E.lerp(p[2], q[2], k)];
    }
    const W = screenW(c, t), z = Math.exp(p[2]), k = c.s0 * z;
    const fit = (v, lo) => (lo > 0 ? lo / 2 : E.clamp(v, lo, 0));   // centre a screen smaller than the device
    const ox = fit(c.VW / 2 - p[0] * k, c.VW - W * k), oy = fit(c.VH / 2 - p[1] * k, c.VH - FH * k);
    return { k, ox, oy, z };
  };
  K.map = (c, fx, fy, cam = c.cam) => [cam.ox + fx * cam.k, cam.oy + fy * cam.k];

  K.consoleUpdate = (c, t) => {
    c.cam = camAt(c, t);
    const tr = `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)})`;
    // active screen + scan-line reveal of the next one
    const S = c.plan.screens;
    let cur = -1;
    for (let i = 0; i < S.length; i++) if (t >= S[i][0]) cur = i;
    let scanK = -1;
    Object.entries(c.layers).forEach(([name, L]) => {
      let vis = false, clip = 'none';
      if (cur >= 0 && S[cur][1] === name) {
        vis = true;
        const k = cur === 0 ? 1 : E.ep(t, S[cur][0], S[cur][0] + 0.55, 'inOut');
        if (k < 1) { clip = `inset(0 0 ${((1 - k) * 100).toFixed(2)}% 0)`; scanK = k; }
      } else if (cur > 0 && S[cur - 1][1] === name && t < S[cur][0] + 0.56) vis = true;
      E.css(L, { visibility: vis ? 'visible' : 'hidden', transform: tr, clipPath: clip, zIndex: cur >= 0 && S[cur][1] === name ? '2' : '1' });
    });
    E.css(c.scan, { opacity: scanK >= 0 ? E.f3(Math.sin(Math.PI * scanK)) : '0', top: (scanK * c.VH).toFixed(1) + 'px' });
    // only when the camera looks at the right-hand side of the screen (the clipped map labels sit at the left edge)
    const fcx = (c.VW / 2 - c.cam.ox) / c.cam.k;
    E.css(c.edge, { opacity: E.f3(E.clamp((c.cam.z - 1.35) / 0.5) * (c.cam.ox < -1 ? 1 : 0) * E.clamp((fcx - 640) / 160) * (screenW(c, t) === FW ? 1 : 0)) });
    // and the clipped side panel at the right edge when the camera looks at the map
    const fx1 = (c.VW - c.cam.ox) / c.cam.k;
    E.css(c.edgeR, { opacity: E.f3(E.clamp((c.cam.z - 1.35) / 0.5) * (fx1 < screenW(c, t) - 8 ? 1 : 0) * E.clamp((760 - fcx) / 160) * (screenW(c, t) === FW ? 1 : 0)) });
    c.hls.forEach(h => K.hlUpdate(c, h, t));
  };

  // highlight: {r:[x,y,w,h] frame px, n, label, side:'r'|'l'|'t'|'b', t0, t1, dist, dx, dy}
  K.hl = (c, o) => {
    const g = E.add(c.root, '<div class="abs" style="left:0;top:0;width:0;height:0;z-index:7"></div>');
    const box = E.add(c.dev, '<div class="hlb" style="z-index:4"></div>');
    const line = K.sadd(c.ov, '<line stroke="#8FB4FF" stroke-width="2.5" stroke-linecap="round"/>');
    const tag = E.add(g, `<div class="abs tag"${o.n == null ? ' style="padding-left:18px"' : ''}>${o.n == null ? '' : `<span class="disc">${o.n}</span>`}<span>${o.label}</span></div>`);
    const h = { ...o, g, box, line, tag, tw: 0 };
    c.hls.push(h);
    return h;
  };
  const TH = 46;
  // tag position for one side, given the box corners on the device
  const tagAt = (h, side, x0, y0, x1, y1) => {
    const d = h.dist ?? 56, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dx = h.dx || 0;
    let tx, ty, lx, ly;
    if (side === 'l') { tx = x0 - d - h.tw; ty = cy - TH / 2; lx = x0; ly = cy; }
    else if (side === 't') { tx = cx - h.tw / 2 + dx; ty = y0 - d - TH; lx = cx + dx * 0.3; ly = y0; }
    else if (side === 'b') { tx = cx - h.tw / 2 + dx; ty = y1 + d; lx = cx + dx * 0.3; ly = y1; }
    else { tx = x1 + d; ty = cy - TH / 2; lx = x1; ly = cy; }
    if (h.dy) ty += h.dy;
    return { tx, ty, lx, ly };
  };
  const fits = (c, q, tw) => q.tx >= -40 && q.tx + tw <= c.VW + 40 && q.ty >= -20 && q.ty + TH <= c.VH + 10;
  K.hlUpdate = (c, h, t) => {
    const k = E.ep(t, h.t0, h.t0 + 0.5, 'out') * (1 - E.ep(t, h.t1 - 0.3, h.t1, 'in'));
    if (k <= 0.001) { E.css(h.g, { visibility: 'hidden' }); E.css(h.box, { visibility: 'hidden' }); E.attr(h.line, 'opacity', '0'); return; }
    const [x0, y0] = K.map(c, h.r[0], h.r[1]), [x1, y1] = K.map(c, h.r[0] + h.r[2], h.r[1] + h.r[3]);
    if (!h.label) {  // box only
      E.css(h.g, { visibility: 'hidden' }); E.attr(h.line, 'opacity', '0');
      E.css(h.box, { visibility: 'visible', opacity: E.f3(k), left: x0.toFixed(1) + 'px', top: y0.toFixed(1) + 'px', width: (x1 - x0).toFixed(1) + 'px', height: (y1 - y0).toFixed(1) + 'px' });
      return;
    }
    if (!h.tw) h.tw = h.tag.offsetWidth || 200;
    // choose the side once, where the camera settles, so a tag never jumps mid-life:
    // the requested side, else the opposite one, else below or above the box
    if (!h.sideL) {
      const cam = camAt(c, h.t0 + 0.7);
      const [a0, b0] = K.map(c, h.r[0], h.r[1], cam), [a1, b1] = K.map(c, h.r[0] + h.r[2], h.r[1] + h.r[3], cam);
      const want = h.side || 'r', opp = { l: 'r', r: 'l', t: 'b', b: 't' }[want];
      h.sideL = [want, opp, 'b', 't'].find(sd => fits(c, tagAt(h, sd, a0, b0, a1, b1), h.tw)) || want;
      if (h.sideL !== want) console.warn(`tag ${h.n} "${h.label}" placed ${h.sideL} (wanted ${want})`);
    }
    const side = h.sideL;
    const kb = E.ep(t, h.t0, h.t0 + 0.45, 'back');
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, bw = (x1 - x0) * (0.92 + 0.08 * kb), bh = (y1 - y0) * (0.92 + 0.08 * kb);
    E.css(h.g, { visibility: 'visible', opacity: E.f3(k) });
    E.css(h.box, { visibility: 'visible', opacity: E.f3(k), left: (cx - bw / 2).toFixed(1) + 'px', top: (cy - bh / 2).toFixed(1) + 'px', width: bw.toFixed(1) + 'px', height: bh.toFixed(1) + 'px' });
    let { tx, ty, lx, ly } = tagAt(h, side, x0, y0, x1, y1);
    tx = E.clamp(tx, -40, c.VW + 40 - h.tw); ty = E.clamp(ty, -20, c.VH + 10 - TH);
    const kt = E.ep(t, h.t0 + 0.15, h.t0 + 0.6, 'out');
    E.css(h.tag, { left: tx.toFixed(1) + 'px', top: ty.toFixed(1) + 'px', opacity: E.f3(kt), transform: `translateX(${E.f3((1 - kt) * (side === 'l' ? 14 : -14))}px)` });
    // leader from the box edge to the nearest tag edge
    const ex = side === 'l' ? tx + h.tw : side === 'r' ? tx : E.clamp(lx, tx + 20, tx + h.tw - 20);
    const ey = side === 't' ? ty + TH : side === 'b' ? ty : ty + TH / 2;
    E.attr(h.line, 'x1', lx.toFixed(1)); E.attr(h.line, 'y1', ly.toFixed(1));
    E.attr(h.line, 'x2', E.lerp(lx, ex, kt).toFixed(1)); E.attr(h.line, 'y2', E.lerp(ly, ey, kt).toFixed(1));
    E.attr(h.line, 'opacity', E.f3(k));
  };

  // cursor on the console: path [[t, fx, fy]] in frame px, clicks [t]
  K.cursor = c => ({ c: E.add(c.root, K.cursorHTML), rp: E.add(c.root, '<div class="ripple"></div>') });
  K.cursorUpdate = (c, cur, t, path, clicks, vis) => {
    let fx = path[0][1], fy = path[0][2];
    for (let i = 0; i < path.length - 1; i++) {
      const [ta, xa, ya] = path[i], [tb, xb, yb] = path[i + 1];
      if (t >= ta && t <= tb) { const k = E.ease.inOut(E.p(t, ta, tb)); fx = E.lerp(xa, xb, k); fy = E.lerp(ya, yb, k); break; }
      if (t > tb) { fx = xb; fy = yb; }
    }
    const [x, y] = K.map(c, fx, fy);
    let press = 0, rk = -1;
    for (const ct of clicks) { if (t >= ct - 0.08 && t <= ct + 0.12) press = 1; if (t >= ct && t <= ct + 0.55) rk = E.p(t, ct, ct + 0.55); }
    E.css(cur.c, { transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${press ? 0.86 : 1})`, opacity: E.f3(vis), visibility: vis > 0.001 ? 'visible' : 'hidden' });
    if (rk >= 0) E.css(cur.rp, { left: (x + 6).toFixed(1) + 'px', top: (y + 4).toFixed(1) + 'px', opacity: E.f3((1 - rk) * vis), transform: `scale(${E.f3(0.3 + rk)})` });
    else E.css(cur.rp, { opacity: '0' });
  };
})();
