/* Mini scene engine on top of GSAP. Content is data (scenes.js); this file builds DOM + timeline.
   window.__seek(t) / window.__duration() are used by render.js. */
(function () {
  const W = 1920, H = 1080;
  const root = document.getElementById('root');
  const fmt = {
    money: v => 'S$' + Math.round(v).toLocaleString('en-US'),
    moneyM: v => 'S$' + (v / 1e6).toFixed(2) + 'M',
    moneyK: v => (v < 0 ? '−' : '+') + 'S$' + Math.round(Math.abs(v) / 1000) + 'K',
    pct: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%',
    psf: v => 'S$' + Math.round(v).toLocaleString('en-US') + ' psf',
    int: v => Math.round(v).toLocaleString('en-US'),
    raw: v => v
  };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  // ---------- components: each returns {node, enter(tl, at)} ----------
  const C = {};

  C.kicker = ({ text }) => {
    const n = el('div', 'kicker', text);
    return { node: n, enter: (tl, at) => tl.from(n, { y: 20, opacity: 0, duration: .6, ease: 'power3.out' }, at) };
  };
  C.title = ({ text, size, color }) => {
    const n = el('h1', 'title', text); if (size) n.style.fontSize = size + 'px'; if (color) n.style.color = color;
    return { node: n, enter: (tl, at) => tl.from(n, { y: 40, opacity: 0, duration: .8, ease: 'power3.out' }, at) };
  };
  C.sub = ({ text, size }) => {
    const n = el('p', 'sub', text); if (size) n.style.fontSize = size + 'px';
    return { node: n, enter: (tl, at) => tl.from(n, { y: 20, opacity: 0, duration: .7, ease: 'power3.out' }, at + .15) };
  };
  C.lines = ({ items, size, gap, at: stagger = .35, marker }) => {
    const n = el('div', 'lines'); if (gap) n.style.gap = gap + 'px';
    const rows = items.map(t => { const r = el('div', 'line'); if (size) r.style.fontSize = size + 'px'; r.innerHTML = (marker ? `<span class="dot"></span>` : '') + `<span>${t}</span>`; n.appendChild(r); return r; });
    return { node: n, enter: (tl, at) => tl.from(rows, { x: -30, opacity: 0, duration: .6, stagger, ease: 'power3.out' }, at) };
  };
  C.stat = ({ label, value, format = 'raw', suffix = '', note, color, from = 0, big }) => {
    const n = el('div', 'stat' + (big ? ' big' : ''));
    n.appendChild(el('div', 'stat-label', label));
    const finalText = typeof value === 'number' ? fmt[format](value) + suffix : String(value);
    const v = el('div', 'stat-value', typeof value === 'number' ? fmt[format](from) + suffix : value); if (color) v.style.color = color; n.appendChild(v);
    const L = finalText.replace(/<[^>]+>/g, '').length; const base = big ? 84 : 64; v.style.fontSize = (L > 13 ? base * .62 : L > 10 ? base * .74 : L > 8 ? base * .86 : base) + 'px';
    if (note) n.appendChild(el('div', 'stat-note', note));
    return {
      node: n, enter: (tl, at) => {
        tl.from(n, { y: 30, opacity: 0, duration: .6, ease: 'power3.out' }, at);
        if (typeof value === 'number') { const o = { v: from }; tl.to(o, { v: value, duration: 1.2, ease: 'power2.out', onUpdate: () => { v.textContent = fmt[format](o.v) + suffix; } }, at + .2); }
      }
    };
  };
  C.statRow = ({ items, cols }) => {
    const n = el('div', 'stat-row'); if (cols) n.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    const kids = items.map(i => { const k = C.stat(i); n.appendChild(k.node); return k; });
    return { node: n, enter: (tl, at) => kids.forEach((k, i) => k.enter(tl, at + i * .18)) };
  };
  C.card = ({ title, body, accent, width }) => {
    const n = el('div', 'card'); if (accent) n.style.borderTopColor = accent; if (width) n.style.width = width + 'px';
    if (title) n.appendChild(el('div', 'card-title', title));
    const b = el('div', 'card-body'); if (typeof body === 'string') b.innerHTML = body; else body.forEach(x => b.appendChild(el('div', 'card-line', x))); n.appendChild(b);
    return { node: n, enter: (tl, at) => { tl.from(n, { y: 30, opacity: 0, duration: .6, ease: 'power3.out' }, at); if (Array.isArray(body)) tl.from(b.children, { x: -16, opacity: 0, duration: .45, stagger: .25, ease: 'power3.out' }, at + .3); } };
  };
  C.row = ({ items, gap = 24, align }) => {
    const n = el('div', 'row'); n.style.gap = gap + 'px'; if (align) n.style.alignItems = align;
    const kids = items.map(spec => { const k = build(spec); n.appendChild(k.node); return k; });
    return { node: n, enter: (tl, at) => kids.forEach((k, i) => k.enter(tl, at + i * .22)) };
  };
  C.col = ({ items, gap = 20, width, flex }) => {
    const n = el('div', 'col'); n.style.gap = gap + 'px'; if (width) n.style.width = width + 'px'; if (flex) n.style.flex = flex;
    const kids = items.map(spec => { const k = build(spec); n.appendChild(k.node); return k; });
    return { node: n, enter: (tl, at) => kids.forEach((k, i) => k.enter(tl, at + i * .22)) };
  };
  C.table = ({ head, rows, highlight, colw, size }) => {
    const n = el('table', 'tbl'); if (size) n.style.fontSize = size + 'px';
    const th = el('tr'); head.forEach((h, i) => { const c = el('th', null, h); if (colw && colw[i]) c.style.width = colw[i] + 'px'; th.appendChild(c); }); n.appendChild(th);
    const trs = rows.map((r, ri) => { const tr = el('tr', highlight === ri ? 'hl' : null); r.forEach(c => tr.appendChild(el('td', null, c))); n.appendChild(tr); return tr; });
    return { node: n, enter: (tl, at) => { tl.from(th, { opacity: 0, duration: .4 }, at); tl.from(trs, { x: -24, opacity: 0, duration: .5, stagger: .3, ease: 'power3.out' }, at + .2); } };
  };
  // horizontal bars
  C.hbars = ({ items, max, format = 'raw', height = 54, labelw = 260, valw = 170, zero }) => {
    const n = el('div', 'hbars');
    const mx = max || Math.max(...items.map(i => Math.abs(i.value)));
    const fills = [], vals = [], rows = [];
    items.forEach(i => {
      const r = el('div', 'hbar'); r.style.height = height + 'px';
      const l = el('div', 'hbar-label', i.label); l.style.width = labelw + 'px'; r.appendChild(l);
      const track = el('div', 'hbar-track'); const f = el('div', 'hbar-fill'); f.style.background = i.color || 'var(--blue)';
      const pct = Math.abs(i.value) / mx * 100; f.style.width = pct + '%'; track.appendChild(f); r.appendChild(track);
      const v = el('div', 'hbar-val', ''); v.style.width = valw + 'px'; if (i.color) v.style.color = i.color; r.appendChild(v);
      fills.push(f); vals.push([v, i]); rows.push(r); n.appendChild(r);
    });
    return {
      node: n, enter: (tl, at) => {
        tl.from(rows, { opacity: 0, x: -20, duration: .5, stagger: .25, ease: 'power3.out' }, at);
        fills.forEach((f, k) => tl.from(f, { scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'power3.out' }, at + .3 + k * .25));
        vals.forEach(([v, i], k) => { const o = { v: 0 }; tl.to(o, { v: i.value, duration: 1, ease: 'power3.out', onUpdate: () => { v.textContent = i.text || fmt[format](o.v); } }, at + .3 + k * .25); });
      }
    };
  };
  // vertical bars (e.g. psf comparison)
  C.vbars = ({ items, max, format = 'psf', height = 420, width = 1200, barw = 130 }) => {
    const n = el('div', 'vbars'); n.style.height = (height + 110) + 'px'; n.style.width = width + 'px';
    const mx = max || Math.max(...items.map(i => i.value)) * 1.12;
    const groups = items.map(i => {
      const g = el('div', 'vbar'); g.style.width = barw + 'px';
      const v = el('div', 'vbar-val', ''); g.appendChild(v);
      const b = el('div', 'vbar-fill'); b.style.height = (i.value / mx * height) + 'px'; b.style.background = i.color || 'var(--blue)'; g.appendChild(b);
      const l = el('div', 'vbar-label', i.label); g.appendChild(l); n.appendChild(g); return { g, v, b, i };
    });
    return {
      node: n, enter: (tl, at) => groups.forEach((x, k) => {
        tl.from(x.l || x.g, { opacity: 0, duration: .4 }, at + k * .2);
        tl.from(x.b, { scaleY: 0, transformOrigin: 'bottom center', duration: .9, ease: 'power3.out' }, at + k * .2);
        const o = { v: 0 }; tl.to(o, { v: x.i.value, duration: .9, ease: 'power3.out', onUpdate: () => { x.v.textContent = x.i.text || fmt[format](o.v); } }, at + k * .2);
      })
    };
  };
  // line chart (SVG path draw)
  C.line = ({ series, width = 1100, height = 380, ymin, ymax, xlabels, yfmt = v => v, bands, legend }) => {
    const n = el('div', 'linechart');
    if (legend) { const lg = el('div', 'legend'); legend.forEach(([txt, col]) => { const i = el('span', 'legend-item'); i.innerHTML = `<i style="background:${col}"></i>${txt}`; lg.appendChild(i); }); n.appendChild(lg); }
    const s = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}` }); n.appendChild(s);
    const padL = 110, padR = 70, padT = 30, padB = 50; const iw = width - padL - padR, ih = height - padT - padB;
    const all = series.flatMap(sr => sr.points.map(p => p[1]));
    const lo = ymin ?? Math.min(...all), hi = ymax ?? Math.max(...all);
    const xs = series.flatMap(sr => sr.points.map(p => p[0])); const xlo = Math.min(...xs), xhi = Math.max(...xs);
    const X = x => padL + (x - xlo) / (xhi - xlo) * iw, Y = y => padT + (1 - (y - lo) / (hi - lo)) * ih;
    (bands || []).forEach(b => { s.appendChild(svg('rect', { x: X(b.from), y: padT, width: X(b.to) - X(b.from), height: ih, fill: b.color, opacity: .18 })); });
    for (let g = 0; g <= 4; g++) { const y = padT + ih * g / 4; s.appendChild(svg('line', { x1: padL, x2: width - padR, y1: y, y2: y, stroke: '#1f2a44', 'stroke-width': 1 })); const t = svg('text', { x: padL - 12, y: y + 6, 'text-anchor': 'end', fill: '#8b9bb4', 'font-size': 18, 'font-family': 'Inter' }); t.textContent = yfmt(hi - (hi - lo) * g / 4); s.appendChild(t); }
    (xlabels || []).forEach(([x, lab]) => { const t = svg('text', { x: X(x), y: height - 14, 'text-anchor': 'middle', fill: '#8b9bb4', 'font-size': 18, 'font-family': 'Inter' }); t.textContent = lab; s.appendChild(t); });
    const paths = series.map(sr => {
      const d = sr.points.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
      const p = svg('path', { d, fill: 'none', stroke: sr.color || '#60A5FA', 'stroke-width': sr.width || 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': sr.dash || 'none' }); s.appendChild(p);
      const lab = svg('text', { x: X(sr.points[sr.points.length - 1][0]) + 10, y: Y(sr.points[sr.points.length - 1][1]) + 7, fill: sr.color || '#60A5FA', 'font-size': 22, 'font-weight': 700, 'font-family': 'Noto Sans SC' }); lab.textContent = sr.label || ''; s.appendChild(lab);
      return { p, lab };
    });
    return {
      node: n, enter: (tl, at) => {
        tl.from(n, { opacity: 0, duration: .5 }, at);
        paths.forEach((x, k) => { const len = x.p.getTotalLength ? x.p.getTotalLength() : 3000; x.p.style.strokeDasharray = len; x.p.style.strokeDashoffset = len; tl.to(x.p, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, at + .3 + k * .5); tl.from(x.lab, { opacity: 0, duration: .4 }, at + 1.9 + k * .5); });
      }
    };
  };
  // waterfall: list of {label, value, color, total?}
  C.waterfall = ({ steps, width = 1500, height = 430, format = 'moneyK' }) => {
    const n = el('div', 'waterfall'); const s = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}` }); n.appendChild(s);
    const padL = 20, padT = 40, padB = 90; const iw = width - 40, ih = height - padT - padB;
    let run = 0; const pts = []; steps.forEach(st => { if (st.total) { pts.push({ ...st, from: 0, to: run }); } else { pts.push({ ...st, from: run, to: run + st.value }); run += st.value; } });
    const lo = Math.min(0, ...pts.flatMap(p => [p.from, p.to])), hi = Math.max(...pts.flatMap(p => [p.from, p.to]));
    const Y = v => padT + (1 - (v - lo) / (hi - lo)) * ih; const bw = iw / pts.length;
    s.appendChild(svg('line', { x1: padL, x2: width - 20, y1: Y(0), y2: Y(0), stroke: '#334155', 'stroke-width': 2 }));
    const items = pts.map((p, i) => {
      const x = padL + i * bw + bw * .18, w = bw * .64; const y1 = Y(Math.max(p.from, p.to)), y2 = Y(Math.min(p.from, p.to));
      const r = svg('rect', { x, y: y1, width: w, height: Math.max(2, y2 - y1), rx: 8, fill: p.color || (p.total ? '#60A5FA' : p.value >= 0 ? '#10B981' : '#EF4444') }); s.appendChild(r);
      const lab = svg('text', { x: x + w / 2, y: height - 50, 'text-anchor': 'middle', fill: '#cbd5e1', 'font-size': 22, 'font-family': 'Noto Sans SC' }); lab.textContent = p.label; s.appendChild(lab);
      const val = svg('text', { x: x + w / 2, y: y1 - 12, 'text-anchor': 'middle', fill: '#fff', 'font-size': 26, 'font-weight': 800, 'font-family': 'Inter' }); val.textContent = p.text || (p.total ? fmt.money(p.to) : fmt[format](p.value)); s.appendChild(val);
      if (p.sub) { const sb = svg('text', { x: x + w / 2, y: height - 22, 'text-anchor': 'middle', fill: '#8b9bb4', 'font-size': 18, 'font-family': 'Noto Sans SC' }); sb.textContent = p.sub; s.appendChild(sb); }
      return { r, lab, val, origin: p.value >= 0 && !p.total ? 'bottom' : 'top' };
    });
    return { node: n, enter: (tl, at) => { tl.from(n, { opacity: 0, duration: .4 }, at); items.forEach((it, k) => { tl.from(it.r, { scaleY: 0, transformOrigin: `center ${it.origin}`, duration: .7, ease: 'power3.out' }, at + .2 + k * .45); tl.from([it.lab, it.val], { opacity: 0, duration: .4 }, at + .4 + k * .45); }); } };
  };
  // timeline / process steps
  C.steps = ({ items, color }) => {
    const n = el('div', 'steps');
    const rows = items.map((it, i) => { const r = el('div', 'step'); r.innerHTML = `<div class="step-num" style="${color ? 'background:' + color : ''}">${it.num || (i + 1)}</div><div class="step-body"><div class="step-title">${it.title}</div>${it.text ? `<div class="step-text">${it.text}</div>` : ''}</div>`; n.appendChild(r); return r; });
    return { node: n, enter: (tl, at) => tl.from(rows, { x: -40, opacity: 0, duration: .6, stagger: .45, ease: 'power3.out' }, at) };
  };
  C.bigquote = ({ text, size = 72, color }) => {
    const n = el('div', 'bigquote', text); n.style.fontSize = size + 'px'; if (color) n.style.color = color;
    return { node: n, enter: (tl, at) => tl.from(n, { scale: .92, opacity: 0, duration: .9, ease: 'power3.out' }, at) };
  };
  C.spacer = ({ h = 20 }) => { const n = el('div'); n.style.height = h + 'px'; return { node: n, enter: () => {} }; };
  C.pill = ({ text, color }) => { const n = el('span', 'pill', text); if (color) { n.style.background = color + '22'; n.style.color = color; n.style.borderColor = color + '66'; } return { node: n, enter: (tl, at) => tl.from(n, { scale: .8, opacity: 0, duration: .5, ease: 'back.out(1.6)' }, at) }; };
  C.pills = ({ items }) => { const n = el('div', 'pills'); const kids = items.map(i => { const k = C.pill(i); n.appendChild(k.node); return k; }); return { node: n, enter: (tl, at) => kids.forEach((k, i) => k.enter(tl, at + i * .15)) }; };
  C.html = ({ html }) => { const n = el('div', 'htmlblock', html); return { node: n, enter: (tl, at) => tl.from(n, { opacity: 0, y: 20, duration: .6 }, at) }; };
  // scenario fan: three outcome cards
  C.scenarios = ({ items }) => {
    const n = el('div', 'scen');
    const kids = items.map(it => { const c = el('div', 'scen-card'); c.style.borderColor = it.color + '88'; c.innerHTML = `<div class="scen-name" style="color:${it.color}">${it.name}</div><div class="scen-val">${it.value}</div><div class="scen-sub">${it.sub || ''}</div>${(it.points || []).map(p => `<div class="scen-pt">· ${p}</div>`).join('')}`; n.appendChild(c); return c; });
    return { node: n, enter: (tl, at) => tl.from(kids, { y: 40, opacity: 0, duration: .7, stagger: .3, ease: 'power3.out' }, at) };
  };

  function build(spec) { const f = C[spec.type]; if (!f) throw new Error('unknown component ' + spec.type); return f(spec); }

  // ---------- scene assembly ----------
  const tl = gsap.timeline({ paused: true });
  const captionBox = document.getElementById('caption');
  const progress = document.getElementById('progress');
  const chapterBox = document.getElementById('chapter');
  let cursor = 0;
  const SCENES = window.SCENES, TIMING = window.TIMING || {};
  const sceneStart = {};
  SCENES.forEach((sc, idx) => {
    const dur = TIMING[sc.id] ? TIMING[sc.id].duration : (sc.duration || 8);
    const node = el('section', 'scene ' + (sc.layout || 'std')); node.id = 'scene-' + sc.id;
    if (sc.bg) node.style.background = sc.bg;
    const inner = el('div', 'inner'); node.appendChild(inner);
    const comps = (sc.items || []).map(spec => { const k = build(spec); inner.appendChild(k.node); return k; });
    root.appendChild(node);
    const at = cursor; sceneStart[sc.id] = at;
    tl.set(node, { opacity: 1, visibility: 'visible' }, at);
    tl.fromTo(node, { opacity: 0 }, { opacity: 1, duration: .5 }, at);
    let t = at + .3; comps.forEach((k, i) => { k.enter(tl, t + (sc.stagger != null ? i * sc.stagger : i * .5)); });
    // slow drift for life
    tl.fromTo(inner, { y: 0 }, { y: -6, duration: dur, ease: 'none' }, at);
    tl.to(node, { opacity: 0, duration: .45 }, at + dur - .45);
    tl.set(node, { visibility: 'hidden' }, at + dur);
    // captions
    const caps = (TIMING[sc.id] && TIMING[sc.id].captions) || [];
    caps.forEach(cp => { tl.call(() => { captionBox.textContent = cp.text; }, null, at + cp.start); });
    tl.call(() => { captionBox.textContent = ''; }, null, at + dur - .05);
    if (sc.chapter) tl.call(() => { chapterBox.textContent = sc.chapter; }, null, at);
    cursor += dur;
  });
  const total = cursor;
  tl.to(progress, { scaleX: 1, duration: total, ease: 'none' }, 0);
  window.__seek = t => { tl.seek(t, false); };
  window.__duration = () => total;
  window.__sceneStart = sceneStart;
  document.fonts.ready.then(() => { window.__ready = true; });
})();
