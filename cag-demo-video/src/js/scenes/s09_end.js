/* s09 · People stay in command; AI does the legwork. End card: AGIL Secure V11 with AI Co-pilot,
   from alarms to answers. */
(function () {
  'use strict';
  E.scene({
    id: 's09', outDur: 0,
    build(el, s) {
      const v29 = E.L('v29'), v30 = E.L('v30');
      s.tCard = v30.start - 0.5;
      // closing photo; a copy of four wall tiles covers a blurred patch on the video wall
      s.ph = E.add(el, `<div class="abs" style="inset:0;overflow:hidden"><div class="kb" style="position:absolute;inset:0;filter:brightness(.6) saturate(.9)">
        <img src="assets/bg_close.jpg" style="position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover">
        <div style="position:absolute;left:1213px;top:238px;width:418px;height:162px;background:url(assets/bg_close.jpg) -697px -238px / 1920px 1080px"></div></div></div>`);
      s.phI = E.q(s.ph, '.kb');
      E.add(s.ph, '<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(5,7,13,.92) 0%,rgba(5,7,13,.6) 45%,rgba(5,7,13,.2) 100%)"></div>');
      s.h1 = E.add(el, '<div class="abs h-l" style="left:120px;top:400px;width:1000px;font-size:80px">People stay in command.</div>');
      s.h2 = E.add(el, '<div class="abs h-l" style="left:120px;top:500px;width:1000px;font-size:80px;color:var(--lav)">AI does the legwork.</div>');
      // end card
      s.card = E.add(el, `<div class="abs" style="inset:0">
        <img src="assets/bg3_cover.jpg" style="position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover">
        <div class="em" style="position:absolute;left:900px;top:230px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(182,156,255,.45),rgba(124,92,255,.06) 70%);box-shadow:0 0 90px 20px rgba(124,92,255,.35);display:grid;place-items:center;color:#fff">${K.icon('sparkle', 60, 1.6)}</div>
        <div class="t1 h-xl" style="position:absolute;left:0;right:0;top:400px;text-align:center;font-size:104px">AGIL<sup style="font-size:38px;vertical-align:54px;margin-left:4px">®</sup> Secure V11</div>
        <div class="t2 h-l" style="position:absolute;left:0;right:0;top:522px;text-align:center;font-size:66px;color:var(--lav)">with AI Co-pilot</div>
        <div class="t3 lead" style="position:absolute;left:0;right:0;top:632px;text-align:center;font-size:34px;color:#fff">From alarms to answers.</div>
        <div class="t4" style="position:absolute;left:0;right:0;top:858px;text-align:center;font-family:var(--head);font-weight:700;font-size:26px;letter-spacing:.02em;color:#fff">ST Engineering</div>
        <div class="t5 label" style="position:absolute;left:0;right:0;top:904px;text-align:center;font-size:14px;color:var(--t3)">Prepared for Changi Airport Group · Scenario, names and data are illustrative</div>
      </div>`);
      s.cq = ['.em', '.t1', '.t2', '.t3', '.t4', '.t5'].map(q => E.q(s.card, q));
      E.cue(v29.start - 0.3, 'swell', 0.5, { dur: 2.5 });
      E.cue(s.tCard, 'shimmer', 0.55, { dur: 3 });
      E.cue(E.at('v30', 'AGIL') - 0.05, 'impactSoft', 0.55);
    },
    update(t, lt, s) {
      const v29 = E.L('v29');
      const kc = E.ep(t, s.tCard, s.tCard + 0.9, 'inOut');
      E.vis(s.ph, 1 - kc);
      E.css(s.phI, { transform: `scale(${E.f3(1.03 + 0.05 * E.p(t, s.start, s.tCard + 1))})` });
      E.revealWords(s.h1, t, v29.start - 0.1, { per: 0.07 });
      E.revealWords(s.h2, t, E.at('v29', 'AI') - 0.15, { per: 0.07 });
      E.vis(s.h1, 1 - kc); E.vis(s.h2, 1 - kc);
      E.vis(s.card, kc);
      const a = E.at('v30', 'AGIL'), b = E.at('v30', 'Co-pilot'), c = E.C('v30', 1).start;
      const ks = [E.ep(t, s.tCard + 0.3, s.tCard + 1.0, 'back'), E.ep(t, a - 0.2, a + 0.5, 'out5'), E.ep(t, b - 0.2, b + 0.5, 'out5'), E.ep(t, c - 0.1, c + 0.6), E.ep(t, c + 0.9, c + 1.5), E.ep(t, c + 1.1, c + 1.7)];
      s.cq.forEach((e, i) => E.fade(e, ks[i], i === 0 ? { s: 0.6, dy: 0 } : { dy: 18, blur: i < 3 ? 10 : 4 }));
      // fade to black over the final second
    },
  });
})();
