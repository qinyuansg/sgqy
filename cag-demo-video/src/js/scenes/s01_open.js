/* s01 · 02:14 a.m. The control room at night, then the airport as thousands of connected devices
   that all report to one control room. */
(function () {
  'use strict';
  // airport twin slab (normalised image coords): a parallelogram from its top, right and left corners
  const TW = { top: [0.4216, 0.2417], right: [0.97, 0.485], left: [0.28, 0.559] };
  K.slab = (u, v) => [TW.top[0] + u * (TW.right[0] - TW.top[0]) + v * (TW.left[0] - TW.top[0]), TW.top[1] + u * (TW.right[1] - TW.top[1]) + v * (TW.left[1] - TW.top[1])];
  K.slabUV = (x, y) => { // inverse of K.slab
    const ax = TW.right[0] - TW.top[0], ay = TW.right[1] - TW.top[1], bx = TW.left[0] - TW.top[0], by = TW.left[1] - TW.top[1];
    const dx = x - TW.top[0], dy = y - TW.top[1], det = ax * by - ay * bx;
    return [(dx * by - dy * bx) / det, (ax * dy - ay * dx) / det];
  };
  // device field: clustered around the five terminals, plus the perimeter fence line
  K.devices = (n, seed) => {
    const R = E.rng(seed), T = GEO.twin.labels.map(l => K.slabUV(l.at[0], l.at[1] + 0.05));
    const g = () => (R() + R() + R() - 1.5) / 1.5;
    return Array.from({ length: n }, (_, i) => {
      let u, v, kind;
      const r = R();
      if (r < 0.62) { const c = T[Math.floor(R() * T.length)]; u = c[0] + g() * 0.09; v = c[1] + g() * 0.16; kind = R() < 0.62 ? 'cam' : 'door'; }
      else if (r < 0.82) { const e = Math.floor(R() * 4), s = R(); [u, v] = e === 0 ? [s, 0.02] : e === 1 ? [s, 0.98] : e === 2 ? [0.01, s] : [0.99, s]; kind = 'sensor'; }
      else { u = R(); v = R(); kind = R() < 0.5 ? 'cam' : 'sensor'; }
      u = E.clamp(u, 0.01, 0.99); v = E.clamp(v, 0.02, 0.98);
      return { uv: [u, v], kind, d: R(), ph: R() * 6.28, f: 1.2 + R() * 2.2 };
    });
  };

  E.scene({
    id: 's01', inDur: 0, outDur: 0.5,
    build(el, s) {
      const v1 = E.L('v01'), v2 = E.L('v02');
      s.tB = v2.start - 0.35;                                   // photo → airport
      // ---- part A: the control room ----
      s.ph = E.add(el, `<div class="abs" style="inset:0;overflow:hidden"><img src="assets/bg_cover.jpg" style="position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover;filter:brightness(.62) saturate(.92)"></div>`);
      s.phI = E.q(s.ph, 'img');
      E.add(s.ph, '<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(5,7,13,.94) 0%,rgba(5,7,13,.7) 38%,rgba(5,7,13,.18) 75%,rgba(5,7,13,.35) 100%)"></div>');
      E.add(s.ph, '<div class="abs" style="inset:0;background:linear-gradient(0deg,rgba(5,7,13,.85) 0%,transparent 35%)"></div>');
      s.kA = E.add(el, '<div class="abs kicker" style="left:120px;top:300px">The night shift</div>');
      s.clk = E.add(el, `<div class="abs" style="left:112px;top:332px;display:flex;align-items:flex-start;gap:16px">
        <span class="h-xl" style="font-size:200px;letter-spacing:-.04em">02:14</span>
        <span style="display:flex;flex-direction:column;gap:6px;margin-top:40px"><span class="mono sec" style="font-size:40px;color:var(--lav);font-weight:500">:07</span><span class="label" style="font-size:16px;color:var(--muted)">a.m.</span></span></div>`);
      s.sec = E.q(s.clk, '.sec');
      s.h1 = E.add(el, '<div class="abs h-l" style="left:120px;top:570px;width:900px">The airport never sleeps.</div>');
      s.h2 = E.add(el, '<div class="abs lead" style="left:122px;top:660px;width:900px;color:#C9D1E3">Neither does its security.</div>');
      // ---- part B: the connected airport ----
      s.tw = E.add(el, '<div class="abs" style="left:150px;top:40px;width:1700px;height:956px"></div>');
      E.add(s.tw, '<img src="assets/viz_twin.png" style="position:absolute;inset:0;width:1700px;height:956px">');
      s.dev = K.devices(520, 214);
      const P = d => { const p = K.slab(d.uv[0], d.uv[1]); return [p[0] * 1700, p[1] * 956]; };
      s.dev.forEach(d => (d.p = P(d)));
      const COL = { cam: '#8FB4FF', door: '#B69CFF', sensor: '#4DAFBE' };
      s.svg = E.add(s.tw, `<svg class="abs" width="1700" height="956" style="left:0;top:0">
        <defs><radialGradient id="s01g"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        <g class="links"></g>
        <g class="dots">${s.dev.map(d => `<circle cx="${d.p[0].toFixed(1)}" cy="${d.p[1].toFixed(1)}" r="${d.kind === 'sensor' ? 2.6 : 3.2}" fill="${COL[d.kind]}"/>`).join('')}</g>
      </svg>`);
      s.dotEls = E.qa(s.svg, '.dots circle');
      // one control room: a node above the airport, every device reports to it
      s.hub = [330, 150];
      const R = E.rng(77);
      s.links = s.dev.filter(() => R() < 0.16).map(d => {
        const mx = (d.p[0] + s.hub[0]) / 2, my = Math.min(d.p[1], s.hub[1]) - 80 - R() * 120;
        const path = K.sadd(E.q(s.svg, '.links'), `<path d="M${d.p[0].toFixed(1)} ${d.p[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${s.hub[0]} ${s.hub[1]}" fill="none" stroke="#8FB4FF" stroke-width="1.2" stroke-opacity=".55"/>`);
        const L = path.getTotalLength();
        path.setAttribute('stroke-dasharray', `${L.toFixed(1)} ${L.toFixed(1)}`);
        return { path, L, d: R() * 0.5 };
      });
      s.hubEl = E.add(s.tw, `<div class="abs" style="left:${s.hub[0] - 40}px;top:${s.hub[1] - 40}px;width:80px;height:80px">
        <div class="ring" style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(182,156,255,.8);box-shadow:0 0 40px rgba(182,156,255,.6)"></div>
        <div style="position:absolute;inset:16px;border-radius:50%;background:#B69CFF;box-shadow:0 0 30px 8px rgba(182,156,255,.7);display:grid;place-items:center;color:#120B2E">${K.icon('building', 26, 2)}</div>
        <div class="label" style="position:absolute;left:50%;top:100px;transform:translateX(-50%);color:#fff;font-size:17px;letter-spacing:.18em;white-space:nowrap;background:rgba(5,7,13,.85);padding:7px 14px;border-radius:8px">One control room</div></div>`);
      s.hubRing = E.q(s.hubEl, '.ring');
      // counters
      const CNT = [['cameras', 'Cameras', 2960, '#8FB4FF'], ['doors', 'Doors', 1240, '#B69CFF'], ['sensors', 'Sensors', 612, '#4DAFBE']];
      s.cnt = CNT.map((c, i) => {
        const e = E.add(el, `<div class="abs glass" style="left:${120 + i * 250}px;top:780px;width:230px;height:104px;padding:16px 22px;border-radius:16px">
          <div class="label" style="display:flex;align-items:center;gap:8px;color:${c[3]}"><i style="width:8px;height:8px;border-radius:50%;background:${c[3]};display:block"></i>${c[1]}</div>
          <div class="mono n" style="font-size:42px;font-weight:600;color:#fff;margin-top:6px">0</div></div>`);
        return { e, n: E.q(e, '.n'), v: c[2], t0: E.at('v02', c[0]) - 0.25 };
      });
      E.cue(0.2, 'swell', 0.5, { dur: 3 });
      E.cue(v1.start - 0.1, 'tick', 0.35);
      E.cue(s.tB, 'whoosh', 0.5);
      s.cnt.forEach(c => E.cue(c.t0, 'tickrun', 0.25, { dur: 0.9 }));
      E.cue(E.C('v02', 1).start, 'sweep', 0.45, { dur: 1.2 });
      E.cue(E.C('v02', 1).start + 1.0, 'chime', 0.35);
    },
    update(t, lt, s) {
      const v1 = E.L('v01'), c2 = E.C('v02', 1).start;
      // part A
      const kA = 1 - E.ep(t, s.tB - 0.1, s.tB + 0.6, 'inOut');
      E.vis(s.ph, Math.min(E.ep(t, 0, 1.4, 'sine'), kA));
      E.css(s.phI, { transform: `scale(${E.f3(1.04 + 0.05 * E.p(t, 0, 7))}) translate(${E.f3(-14 * E.p(t, 0, 7))}px,0)` });
      E.fade(s.kA, E.ep(t, 0.9, 1.5) * kA, { dy: 10 });
      E.fade(s.clk, E.ep(t, v1.start - 0.2, v1.start + 0.5, 'out5') * kA, { dy: 26, blur: 10 });
      E.txt(s.sec, ':' + String(7 + Math.max(0, Math.floor(t - v1.start))).padStart(2, '0'));
      E.revealWords(s.h1, t, E.at('v01', 'airport') - 0.25, { per: 0.07 });
      E.vis(s.h1, kA);
      E.fade(s.h2, E.ep(t, E.C('v01', 1).start, E.C('v01', 1).start + 0.6) * kA, { dy: 12, blur: 6 });
      // part B
      const kB = E.ep(t, s.tB, s.tB + 0.9, 'out');
      E.css(s.tw, { opacity: E.f3(kB), transform: `scale(${E.f3(1.08 - 0.08 * kB + 0.02 * E.p(t, s.tB, 10.2))})`, visibility: kB > 0.001 ? 'visible' : 'hidden' });
      const last = E.at('v02', 'sensors') + 0.4;
      s.dev.forEach((d, i) => {
        const a = s.tB + 0.3 + d.d * (last - s.tB - 0.3);
        const k = E.ep(t, a, a + 0.35);
        const tw = 0.65 + 0.35 * Math.sin(t * d.f + d.ph);
        E.attr(s.dotEls[i], 'opacity', E.f3(k * tw));
      });
      s.links.forEach(l => {
        const k = E.ep(t, c2 + l.d * 0.6, c2 + l.d * 0.6 + 0.8, 'inOut');
        E.attr(l.path, 'stroke-dashoffset', (l.L * (1 - k)).toFixed(1));
        E.attr(l.path, 'opacity', E.f3(k > 0 ? 1 : 0));
      });
      const kh = E.ep(t, c2 + 0.5, c2 + 1.0, 'back');
      E.css(s.hubEl, { opacity: E.f3(E.ep(t, c2 + 0.4, c2 + 0.8)), transform: `scale(${E.f3(0.6 + 0.4 * kh)})` });
      const pr = ((t - c2 - 0.9) % 1.4 + 1.4) % 1.4 / 1.4;
      E.css(s.hubRing, { transform: `scale(${E.f3(1 + pr * 0.9)})`, opacity: E.f3(t > c2 + 0.9 ? 1 - pr : 0.9) });
      s.cnt.forEach((c, i) => {
        const k = E.ep(t, c.t0, c.t0 + 0.9, 'out');
        E.fade(c.e, E.ep(t, c.t0 - 0.15, c.t0 + 0.3), { dy: 16 });
        E.txt(c.n, E.num(Math.round(c.v * k)));
      });
    },
  });
})();
