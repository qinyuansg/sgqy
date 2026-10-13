/* s04 · How Co-pilot works: detect, correlate, explain, recommend, pre-fill, and then it stops.
   A person always makes the call. */
(function () {
  'use strict';
  const N = [
    ['radar', 'Detect', 'Every system, one view', 'detects'],
    ['layers', 'Correlate', 'Related alarms, one incident', 'correlates'],
    ['chat', 'Explain', 'What, why, and evidence', 'explains'],
    ['list', 'Recommend', 'Your own procedure', 'recommends'],
    ['doc', 'Pre-fill', 'Steps and forms drafted', 'filled'],
    ['userCheck', 'You decide', 'Approve, adjust or dismiss', null],
  ];
  const Y = 520, X0 = 250, DXN = 284;
  E.scene({
    id: 's04',
    build(el, s) {
      const v8 = E.L('v08');
      s.k = E.add(el, '<div class="abs kicker" style="left:0;right:0;top:282px;text-align:center">How Co-pilot works</div>');
      s.h = E.add(el, '<div class="abs h-m" style="left:0;right:0;top:320px;text-align:center;font-size:52px">Co-pilot does the legwork. A person decides.</div>');
      E.add(el, `<div class="abs" style="left:${X0}px;top:${Y - 1}px;width:${DXN * 5}px;height:2px;background:rgba(255,255,255,.12)"></div>`);
      s.bar = E.add(el, `<div class="abs" style="left:${X0}px;top:${Y - 2}px;width:0;height:4px;border-radius:2px;background:linear-gradient(90deg,rgba(77,141,255,.4),#B69CFF);box-shadow:0 0 18px rgba(182,156,255,.7)"></div>`);
      s.head = E.add(el, `<div class="abs" style="left:0;top:${Y - 9}px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff;box-shadow:0 0 22px 8px rgba(182,156,255,.85)"></div>`);
      s.n = N.map((d, i) => {
        const x = X0 + i * DXN, last = i === N.length - 1;
        const e = E.add(el, `<div class="abs" style="left:${x - 60}px;top:${Y - 60}px;width:120px">
          <div class="c" style="width:120px;height:120px;border-radius:50%;display:grid;place-items:center;background:rgba(14,22,40,.92);border:1.5px solid rgba(255,255,255,.18);color:#7D8AA3">${K.icon(d[0], 46, 1.6)}</div>
          <div class="h-s" style="position:absolute;left:-70px;right:-70px;top:146px;text-align:center;font-size:30px">${d[1]}</div>
          <div style="position:absolute;left:-80px;right:-80px;top:190px;text-align:center;font-size:20px;color:var(--muted)">${d[2]}</div></div>`);
        return { e, c: E.q(e, '.c'), x, last, t0: d[3] ? E.at('v07', d[3]) - 0.15 : E.at('v08', 'person') - 0.1 };
      });
      // the stop: Co-pilot's work ends before the last step
      const gx = X0 + 4.5 * DXN;
      s.tStop = E.at('v08', 'stops') - 0.1;
      s.gate = E.add(el, `<div class="abs" style="left:${gx - 3}px;top:${Y - 90}px;width:6px;height:180px;border-radius:3px;background:#B69CFF;box-shadow:0 0 24px 6px rgba(182,156,255,.6)"></div>`);
      s.gateL = E.add(el, `<div class="abs label" style="left:${gx - 150}px;width:300px;top:${Y - 126}px;text-align:center;color:var(--lav);font-size:15px">Co-pilot stops here</div>`);
      const L6 = s.n[5];
      s.br = K.brackets(el, L6.x - 60, Y - 60, 120, 120, { gap: 18, arm: 30, col: 'rgba(255,255,255,.85)' });
      s.n.forEach(n => E.cue(n.t0 + 0.05, n.last ? 'confirm' : 'blip', n.last ? 0.6 : 0.45));
      E.cue(s.tStop, 'stamp', 0.55);
    },
    update(t, lt, s) {
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.7), { dy: 10 });
      E.revealWords(s.h, t, s.start + 0.35, { per: 0.05 });
      // progress runs node to node, then halts at the gate
      let px = s.n[0].x;
      s.n.forEach((n, i) => {
        const k = E.ep(t, n.t0, n.t0 + 0.45, 'out');
        E.fade(n.e, E.ep(t, s.start + 0.5 + i * 0.08, s.start + 1.0 + i * 0.08), { dy: 18 });
        if (i > 0 && i < 5) px = E.lerp(px, n.x, E.ep(t, n.t0 - 0.35, n.t0, 'inOut'));
        if (n.last) {
          E.css(n.c, k > 0 ? { background: `rgba(182,156,255,${E.f3(k)})`, color: k > 0.5 ? '#120B2E' : '#7D8AA3', borderColor: '#fff', boxShadow: `0 0 0 ${E.f3(6 * k)}px rgba(182,156,255,.25), 0 0 ${E.f3(60 * k)}px rgba(182,156,255,.7)` }
            : { background: 'rgba(14,22,40,.92)', color: '#7D8AA3', borderColor: 'rgba(255,255,255,.18)', boxShadow: 'none' });
        } else {
          E.css(n.c, k > 0 ? { borderColor: `rgba(182,156,255,${E.f3(0.2 + 0.8 * k)})`, color: k > 0.5 ? '#FFFFFF' : '#7D8AA3', boxShadow: `0 0 ${E.f3(40 * k)}px rgba(182,156,255,.45)` }
            : { borderColor: 'rgba(255,255,255,.18)', color: '#7D8AA3', boxShadow: 'none' });
        }
      });
      if (t > s.n[4].t0) px = E.lerp(px, s.n[4].x + DXN * 0.5 - 10, E.ep(t, s.tStop - 0.6, s.tStop, 'out'));
      const vis = E.ep(t, s.n[0].t0 - 0.2, s.n[0].t0 + 0.2);
      E.css(s.bar, { width: Math.max(0, px - s.n[0].x).toFixed(1) + 'px', opacity: E.f3(vis) });
      E.css(s.head, { left: px.toFixed(1) + 'px', opacity: E.f3(vis) });
      const kg = E.ep(t, s.tStop, s.tStop + 0.35, 'back');
      E.css(s.gate, { opacity: E.f3(E.ep(t, s.tStop, s.tStop + 0.2)), transform: `scaleY(${E.f3(0.2 + 0.8 * kg)})` });
      E.fade(s.gateL, E.ep(t, s.tStop + 0.15, s.tStop + 0.5), { dy: 8 });
      K.bracketsIn(s.br, E.ep(t, s.n[5].t0 + 0.1, s.n[5].t0 + 0.6));
    },
  });
})();
