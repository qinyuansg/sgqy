/* s03 · Meet AGIL Secure V11 with AI Co-pilot: the name, then the console the team already knows,
   with Co-pilot's answers built into the alert list. */
(function () {
  'use strict';
  const F01 = 'V11-01-home-real-time-alerts';
  E.scene({
    id: 's03',
    build(el, s) {
      const v5 = E.L('v05'), v6 = E.L('v06');
      s.tUp = v6.start - 0.45;
      s.em = E.add(el, `<div class="abs" style="left:900px;top:190px;width:120px;height:120px">
        <div class="r1" style="position:absolute;inset:-30px;border-radius:50%;border:1.5px solid rgba(182,156,255,.45)"></div>
        <div class="r2" style="position:absolute;inset:-70px;border-radius:50%;border:1px solid rgba(182,156,255,.22)"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(182,156,255,.45),rgba(124,92,255,.08) 70%);box-shadow:0 0 90px 20px rgba(124,92,255,.35);display:grid;place-items:center;color:#fff">${K.icon('sparkle', 64, 1.6)}</div></div>`);
      s.r1 = E.q(s.em, '.r1'); s.r2 = E.q(s.em, '.r2');
      s.k = E.add(el, '<div class="abs kicker" style="left:0;right:0;top:372px;text-align:center">Introducing</div>');
      s.t1 = E.add(el, '<div class="abs h-xl" style="left:0;right:0;top:410px;text-align:center;font-size:112px">AGIL<sup style="font-size:40px;vertical-align:58px;margin-left:4px">®</sup> Secure V11</div>');
      s.t2 = E.add(el, '<div class="abs h-l" style="left:0;right:0;top:540px;text-align:center;font-size:76px;color:var(--lav)">with AI Co-pilot</div>');
      // the console
      s.con = K.console(el, { x: 440, y: 150, w: 1040 });
      s.con.frame(F01);
      s.con.plan = { screens: [[s.start, F01]], shots: [[s.start, null, 0.1], [E.C('v06', 1).start - 0.3, [10, 170, 900, 690], 1.4]] };
      const tB = E.C('v06', 1).start + 0.15;
      ['Co-pilot · 5 linked', 'Co-pilot · fence', 'Co-pilot · verify', 'Co-pilot · impossible'].forEach((n, i) =>
        K.hl(s.con, { r: K.ab(F01, n, 0, { pad: 6 }), n: 1, label: i === 0 ? 'Answers, built in' : null, side: 'r', dist: 70, t0: tB + i * 0.16, t1: s.end + 0.2 }));
      E.cue(v5.start - 0.2, 'riser', 0.45, { dur: 1.2 });
      E.cue(E.at('v05', 'AGIL') - 0.05, 'impactSoft', 0.6);
      E.cue(E.at('v05', 'Co-pilot') - 0.05, 'shimmer', 0.5, { dur: 1.6 });
      E.cue(s.tUp + 0.1, 'whoosh', 0.45);
      E.cue(tB, 'chime', 0.4);
    },
    update(t, lt, s) {
      const kUp = E.ep(t, s.tUp, s.tUp + 0.9, 'inOut');
      const kE = E.ep(t, s.start + 0.2, s.start + 1.0, 'out5');
      E.css(s.em, { opacity: E.f3(kE * (1 - kUp)), transform: `scale(${E.f3(0.7 + 0.3 * kE)}) translateY(${E.f3(-60 * kUp)}px)` });
      E.css(s.r1, { transform: `rotate(${E.f3(t * 20)}deg) scale(${E.f3(1 + 0.04 * Math.sin(t * 2))})` });
      E.css(s.r2, { transform: `scale(${E.f3(1 + 0.06 * Math.sin(t * 1.4 + 1))})` });
      const out = 1 - kUp;
      E.fade(s.k, E.ep(t, s.start + 0.6, s.start + 1.1) * out, { dy: 10 });
      E.fade(s.t1, E.ep(t, E.at('v05', 'AGIL') - 0.15, E.at('v05', 'AGIL') + 0.6, 'out5') * out, { dy: 26, blur: 12, s: 0.96 });
      E.fade(s.t2, E.ep(t, E.at('v05', 'Co-pilot') - 0.2, E.at('v05', 'Co-pilot') + 0.5, 'out5') * out, { dy: 20, blur: 10 });
      // the console rises from below, tilted back, and settles flat
      const kd = E.ep(t, s.tUp + 0.1, s.tUp + 1.3, 'out5');
      E.css(s.con.root, { opacity: E.f3(kd), visibility: kd > 0.001 ? 'visible' : 'hidden', transform: `perspective(2200px) translate3d(0,${E.f3(220 * (1 - kd))}px,0) rotateX(${E.f3(28 * (1 - kd))}deg)`, transformOrigin: '50% 100%' });
      K.bracketsIn(s.con.brk, E.ep(t, s.tUp + 0.9, s.tUp + 1.5));
      K.consoleUpdate(s.con, t);
    },
  });
})();
