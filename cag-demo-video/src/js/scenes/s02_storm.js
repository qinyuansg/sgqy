/* s02 · Tonight: 1,248 alarms from nine systems, one operator, and the questions that operator has to answer. */
(function () {
  'use strict';
  const SYS = [['camera', 'CCTV'], ['card', 'Access control'], ['eye', 'Video analytics'], ['radar', 'LiDAR'], ['fence', 'Fence'],
    ['mic', 'Intercom'], ['fire', 'Fire'], ['building', 'Building systems'], ['radio', 'Radio']];
  const Q = ['Is it real?', 'Is it related?', 'Which camera?', 'Which procedure?', 'Who do I call?'];
  const CX = 1240, CY = 520;

  E.scene({
    id: 's02',
    build(el, s) {
      const v3 = E.L('v03'), v4 = E.L('v04');
      s.tOp = E.C('v03', 1).start;
      // counter
      s.k = E.add(el, '<div class="abs kicker" style="left:120px;top:250px;color:var(--critT)">Alarms tonight</div>');
      s.n = E.add(el, '<div class="abs h-xl mono" style="left:112px;top:284px;font-family:var(--head);font-size:176px;color:#fff;letter-spacing:-.04em">0</div>');
      s.sub = E.add(el, `<div class="abs" style="left:120px;top:490px;width:520px">
        <div class="lead s1" style="color:#fff">Nine systems.</div><div class="lead s2" style="color:#fff;margin-top:4px">One operator.</div></div>`);
      s.s1 = E.q(s.sub, '.s1'); s.s2 = E.q(s.sub, '.s2');
      // nine systems on a ring around the operator
      s.sys = SYS.map((d, i) => {
        const a = -Math.PI / 2 + (i / SYS.length) * Math.PI * 2, x = CX + Math.cos(a) * 500, y = CY + Math.sin(a) * 340;
        const e = E.add(el, `<div class="abs" style="left:${x - 34}px;top:${y - 34}px;width:68px;height:68px">
          ${K.ibox(d[0], 68, 30, 'background:rgba(14,22,40,.92);color:#8FB4FF;border-color:rgba(143,180,255,.45)')}
          <div class="label" style="position:absolute;left:50%;top:78px;transform:translateX(-50%);color:var(--muted)">${d[1]}</div></div>`);
        return { e, x, y, t0: v3.start + 1.25 + i * 0.09 };
      });
      // the storm: alarm particles fired from the nine systems toward the centre
      const R = E.rng(1248), SEV = ['#D72D30', '#D4B741', '#D4B741', '#4DAFBE', '#7D8AA3', '#7D8AA3', '#7D8AA3'];
      s.p = Array.from({ length: 560 }, () => {
        const src = Math.floor(R() * SYS.length), a = R() * Math.PI * 2, r = 60 + R() * 300;
        return { src, tx: CX + Math.cos(a) * r * 1.15, ty: CY + Math.sin(a) * r * 0.85, t0: v3.start + 0.2 + R() * (v4.end - v3.start), col: SEV[Math.floor(R() * SEV.length)],
          ph: R() * 6.28, f: 0.6 + R() * 1.4, rad: 2 + R() * 2.4 };
      });
      s.svg = E.add(el, `<svg class="abs" width="1920" height="1080" style="left:0;top:0">${s.p.map(p => `<circle r="${p.rad.toFixed(1)}" fill="${p.col}"/>`).join('')}</svg>`);
      s.pe = Array.from(s.svg.children);
      // one operator
      s.op = E.add(el, `<div class="abs" style="left:${CX - 120}px;top:${CY - 140}px;width:240px;height:280px">
        <div style="position:absolute;inset:0;border-radius:18px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.6)"><img src="assets/persona_nurul.jpg" style="width:240px;height:280px;object-fit:cover;object-position:50% 35%;filter:brightness(.9)"></div>
        <div class="label" style="position:absolute;left:0;right:0;top:296px;text-align:center;color:#fff">Nurul · operator</div></div>`);
      s.opB = K.brackets(el, CX - 120, CY - 140, 240, 280, { gap: 14, arm: 34, col: 'rgba(255,255,255,.7)' });
      // her questions
      const QP = [[905, 372], [1390, 362], [860, 600], [1390, 560], [1140, 722]];
      s.q = Q.map((q, i) => {
        const e = E.add(el, `<div class="abs glass" style="left:${QP[i][0]}px;top:${QP[i][1]}px;padding:12px 22px;border-radius:24px 24px 24px 6px;font-size:26px;font-weight:600;color:#fff;white-space:nowrap;background:rgba(18,26,48,.92)">${q}</div>`);
        return { e, t0: E.at('v04', q.split(' ').slice(-1)[0].replace('?', '')) - 0.25 };
      });
      s.q[0].t0 = v4.start - 0.1;
      E.cue(v3.start + 0.1, 'tickrun', 0.4, { dur: 2.2 });
      E.cue(v3.start + 1.3, 'alertSoft', 0.35);
      s.sys.forEach(d => E.cue(d.t0, 'blip', 0.18));
      E.cue(s.tOp, 'thud', 0.5);
      s.q.forEach(q => E.cue(q.t0, 'pop', 0.45));
    },
    update(t, lt, s) {
      const v3 = E.L('v03');
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.7), { dy: 10 });
      const kn = E.ep(t, v3.start + 0.05, v3.start + 2.3, 'out');
      E.fade(s.n, E.ep(t, s.start + 0.3, s.start + 0.8), { dy: 18, blur: 8 });
      E.txt(s.n, E.num(Math.round(1248 * kn)));
      E.css(s.n, { color: kn > 0.98 ? '#FF8E8F' : '#FFFFFF' });
      E.fade(s.s1, E.ep(t, E.at('v03', 'Nine') - 0.1, E.at('v03', 'Nine') + 0.4), { dy: 12 });
      E.fade(s.s2, E.ep(t, s.tOp, s.tOp + 0.4), { dy: 12 });
      s.sys.forEach(d => E.fade(d.e, E.ep(t, d.t0, d.t0 + 0.4, 'back'), { s: 0.6, dy: 0 }));
      // particles: travel from their system to the swirl, then drift
      s.p.forEach((p, i) => {
        const src = s.sys[p.src], k = E.ep(t, p.t0, p.t0 + 1.0, 'out');
        if (t < p.t0) { E.attr(s.pe[i], 'opacity', '0'); return; }
        const sw = Math.sin(t * p.f + p.ph) * 14, sw2 = Math.cos(t * p.f * 0.7 + p.ph) * 10;
        const x = E.lerp(src.x, p.tx, k) + sw * k, y = E.lerp(src.y, p.ty, k) + sw2 * k;
        E.attr(s.pe[i], 'cx', x.toFixed(1)); E.attr(s.pe[i], 'cy', y.toFixed(1));
        E.attr(s.pe[i], 'opacity', E.f3(Math.min(1, k * 1.5) * (0.55 + 0.45 * Math.sin(t * 3 + p.ph))));
      });
      const ko = E.ep(t, s.tOp - 0.1, s.tOp + 0.5, 'out5');
      E.fade(s.op, ko, { s: 0.85, dy: 0, blur: 6 });
      K.bracketsIn(s.opB, ko);
      s.q.forEach(q => E.fade(q.e, E.ep(t, q.t0, q.t0 + 0.4, 'back'), { s: 0.7, dy: 12 }));
    },
  });
})();
