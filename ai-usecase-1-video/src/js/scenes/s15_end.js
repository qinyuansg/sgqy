/* s15 · Close — noise resolves into one clear signal; soft-white end card. */
E.scene({
  id: 's15', outDur: 0,
  build(el, s) {
    const R = E.rng(99);
    s.dots = Array.from({ length: 240 }, (_, i) => ({
      x0: 180 + R() * 1560, y0: 250 + R() * 560, x1: 560 + (800 * i) / 239, ph: R() * 6.28, f: 1.5 + R() * 2.5, r: 1.6 + R() * 1.8,
      d: R() * 0.35, red: R() < 0.06,
    }));
    el.innerHTML = `
      <svg class="abs" width="1920" height="1080" style="left:0;top:0">
        <g class="dots">${s.dots.map(d => `<circle r="${d.r.toFixed(1)}" fill="${d.red ? '#FF6B81' : '#7C8BA8'}"/>`).join('')}</g>
        <line class="sig" x1="560" x2="1360" y1="540" y2="540" stroke="#8FB4FF" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <div class="abs ti h-l" style="left:0;right:0;top:420px;text-align:center;font-size:66px">AI-powered AGIL<sup style="font-size:28px;vertical-align:30px">®</sup> Secure ISMS</div>
      <div class="abs tg lead" style="left:0;right:0;top:578px;text-align:center;font-size:36px;color:#C9D5EA">From alarm noise to decisive action.</div>
      <div class="abs card" style="left:0;top:540px;width:1920px;height:0;background:#F4F7FD;overflow:hidden">
        <div class="cc" style="position:absolute;left:0;right:0;top:0;height:1080px">
          <div style="position:absolute;left:0;right:0;top:330px;text-align:center">
            <div class="mono" style="font-size:19px;letter-spacing:.24em;color:#2D5BFF;font-weight:600">AI USE CASE 01</div>
            <div style="font-family:var(--head);font-weight:800;font-size:86px;letter-spacing:-.035em;color:#0A1428;margin-top:20px;line-height:1.04">AI-powered AGIL<sup style="font-size:36px;vertical-align:44px">®</sup> Secure ISMS</div>
            <div style="font-size:30px;color:#4A5873;margin-top:20px">for Airports · From alarm noise to decisive action.</div>
          </div>
          <div style="position:absolute;left:0;right:0;top:830px;text-align:center;font-family:var(--head);font-weight:700;font-size:28px;letter-spacing:.02em;color:#0A1428">ST Engineering</div>
          <div style="position:absolute;left:0;right:0;top:1000px;text-align:center;font-family:var(--mono);font-size:15px;letter-spacing:.1em;color:#56657F">CONCEPT VIDEO · SCENARIO, NAMES AND DATA ARE ILLUSTRATIVE</div>
        </div>
      </div>`;
    s.dotEls = Array.from(E.q(el, '.dots').children);
    s.sig = E.q(el, '.sig'); s.ti = E.q(el, '.ti'); s.tg = E.q(el, '.tg'); s.card = E.q(el, '.card'); s.cc = E.q(el, '.cc');
    const v29 = E.L('v29');
    s.tConv = v29.start - 0.2;
    s.tTitle = v29.start + 0.5;
    s.tTag = v29.cues[1].start;
    s.tWhite = v29.end + 0.35;
    E.cue(s.tConv, 'riser', 0.55, { dur: 1.2 }); E.cue(s.tConv + 1.25, 'impactSoft', 0.7);
    E.cue(s.tWhite, 'shimmer', 0.55, { dur: 3.0 }); E.cue(s.tWhite + 0.05, 'swell', 0.45, { dur: 2.0 });
  },
  update(t, lt, s) {
    const conv = s.dots.map(d => E.ep(t, s.tConv + d.d, s.tConv + d.d + 1.1, 'inOut'));
    s.dots.forEach((d, i) => {
      const k = conv[i];
      const jx = Math.sin(t * d.f + d.ph) * 6 * (1 - k), jy = Math.cos(t * d.f * 0.8 + d.ph) * 6 * (1 - k);
      E.attr(s.dotEls[i], 'cx', (E.lerp(d.x0, d.x1, k) + jx).toFixed(1));
      E.attr(s.dotEls[i], 'cy', (E.lerp(d.y0, 540, k) + jy).toFixed(1));
      E.attr(s.dotEls[i], 'opacity', E.f3(E.ep(t, s.start, s.start + 0.6) * (1 - E.ep(t, s.tConv + 1.0, s.tConv + 1.5))));
    });
    E.attr(s.sig, 'opacity', E.f3(E.ep(t, s.tConv + 0.9, s.tConv + 1.4)));
    E.fade(s.ti, E.ep(t, s.tTitle, s.tTitle + 0.7, 'out5'), { dy: 20, blur: 8 });
    E.fade(s.tg, E.ep(t, s.tTag, s.tTag + 0.6), { dy: 14, blur: 6 });
    // the signal opens into the end card
    const w = E.ep(t, s.tWhite, s.tWhite + 0.7, 'inOut');
    E.css(s.card, { top: (540 - 540 * w).toFixed(1) + 'px', height: (1080 * w).toFixed(1) + 'px' });
    E.css(s.cc, { top: (-540 + 540 * w).toFixed(1) + 'px', opacity: E.f3(E.ep(t, s.tWhite + 0.45, s.tWhite + 1.0)) });
  },
});
