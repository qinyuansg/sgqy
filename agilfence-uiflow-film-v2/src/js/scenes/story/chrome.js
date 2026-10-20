/* Cut C (story) chrome: the product line laid over the cold open (lower third, on a soft scrim), the five chapter
   headline cards (large type, 1.5 s each, between the chapters; not subtitles), the scenario clock chip (chapters 3–5
   only, over the console), the two-line end card with its disclaimer, and the fade to black. Nothing else is drawn over
   the product UI or the illustrations. */
(function () {
  'use strict';
  const S = E.S, B = window.BEATS, TL = window.TL;
  const css = document.createElement('style');
  css.textContent = `
    /* this cut keeps every hue off violet: the background glow bottom right is blue, not the shared violet */
    #bg .aur { background: radial-gradient(900px 520px at 88% 96%, rgba(45, 120, 255, .15), transparent 70%),
      radial-gradient(800px 480px at 8% 0%, rgba(45, 91, 255, .16), transparent 70%); }
    #chrome .ccard { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; text-align: center; }
    #chrome .ccard .ix { display: flex; align-items: center; gap: 18px; font-family: var(--mono); font-weight: 500; font-size: 24px; letter-spacing: .3em; color: var(--acc); }
    #chrome .ccard .ix i { display: block; width: 72px; height: 2px; background: linear-gradient(90deg, rgba(143,180,255,0), var(--acc)); transform-origin: 100% 50%; }
    #chrome .ccard .ix i.r { background: linear-gradient(270deg, rgba(143,180,255,0), var(--acc)); transform-origin: 0 50%; }
    #chrome .ccard .hd { font-family: var(--head); font-weight: 800; font-size: 128px; line-height: 1.0; letter-spacing: -.035em; color: var(--ink); white-space: nowrap; }
    #chrome .ttl { position: absolute; left: 0; right: 0; bottom: 0; height: 470px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 118px;
      background: linear-gradient(180deg, rgba(5,7,13,0), rgba(5,7,13,.62) 55%, rgba(5,7,13,.86)); }
    #chrome .ttl .s1.p { font-family: var(--head); font-weight: 800; font-size: 76px; line-height: 1.0; letter-spacing: -.03em; color: var(--ink); white-space: nowrap; text-shadow: 0 2px 24px rgba(0,0,0,.6); }
    #chrome .ttl .s1.p sup, #chrome .slate .end1 sup { font-size: .42em; vertical-align: .95em; margin-left: 2px; font-weight: 700; }
    #chrome .slate.endc { gap: 0; }
    #chrome .slate .end1 { font-family: var(--head); font-weight: 800; font-size: 104px; line-height: 1.04; letter-spacing: -.035em; color: var(--ink); white-space: nowrap; }
    #chrome .slate .end2 { margin-top: 26px; font-family: var(--head); font-weight: 600; font-size: 52px; line-height: 1.15; letter-spacing: -.015em; color: #C9D3E6; white-space: nowrap; }
    #chrome .slate .end3 { margin-top: 58px; font-family: var(--mono); font-weight: 500; font-size: 23px; letter-spacing: .16em; text-transform: uppercase; color: #B8BFD6; white-space: nowrap; }
  `;
  document.head.appendChild(css);

  // the scenario clock steps through the states of the flow (never behind the latest time on screen)
  const CLOCK = [
    [S('alarm').start, '02:14:50'], [B.alarm, '02:15:06'], [S('respond').start, '02:15:20'], [B.c1, '02:15:25'],
    [B.c2, '02:15:30'], [B.running, '02:16:05'], [B.handover, '02:16:42'], [B.outcomes, '02:26:30'],
    [S('closure').start, '02:43:40'], [B.c3, '02:43:50'], [B.close, '02:44:14'], [B.dm + 0.12, '02:44:20'],
  ];
  const clockAt = t => { let s = CLOCK[0][1]; for (const [tc, v] of CLOCK) if (t >= tc) s = v; return s; };
  // chapters 3–5: the chip rides with each console (off over the chapter cards)
  const CONS = [[S('alarm').start, S('verify').end], [S('respond').start, S('respond').end], [S('closure').start, S('signoff').end]];
  let chip, clk, title, cards, endCard, black;

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    chip = E.add(root, '<div class="chip"><span class="lab">Fence Sector 5</span><b class="clk mono">02:14:50</b></div>');
    clk = E.q(chip, '.clk');
    title = E.add(root, '<div class="ttl"><div class="s1 p">AgilFence × AGIL<sup>®</sup> Secure V11</div></div>');
    cards = TL.chapters.map(c => {
      const el = E.add(root, `<div class="ccard"><div class="ix"><i></i><span>${String(c.n).padStart(2, '0')}</span><i class="r"></i></div><div class="hd">${c.title}</div></div>`);
      return { el, ix: E.q(el, '.ix'), bars: E.qa(el, '.ix i'), hd: E.q(el, '.hd'), win: S(c.card) };
    });
    endCard = E.add(root, `<div class="slate endc">
      <div class="end1">AgilFence × AGIL<sup>®</sup> Secure V11</div>
      <div class="end2">On Changi’s airfield perimeter since 2013</div>
      <div class="end3">Illustrative scenario · simulated data</div></div>`);
    black = E.add(root, '<div style="position:absolute;inset:0;background:#000;z-index:80;opacity:0"></div>');
  });

  // a slate whose lines rise in one by one and fade out at the end of its window
  const slateK = (el, t, a, b, stag = 0.22) => {
    E.css(el, { display: t > a - 0.1 && t < b + 0.1 ? 'flex' : 'none' });
    let any = 0;
    Array.from(el.children).forEach((ln, i) => {
      const k = Math.min(E.ep(t, a + 0.1 + i * stag, a + 0.8 + i * stag), 1 - E.ep(t, b - 0.5, b, 'in'));
      E.fade(ln, k, { dy: 14, blur: 6 }); any = Math.max(any, k);
    });
    E.vis(el, any > 0 ? 1 : 0);
  };
  // a chapter card: the index and its rules, then the headline word by word (sharp by 0.33 s); all of it out from
  // 0.1 s before the cut to 0.15 s after it, as the next picture comes up: each headline holds sharp for ~1.1 s
  const cardK = (c, t) => {
    const { start: a, end: b } = c.win;
    const on = t > a - 0.05 && t < b + 0.2;
    E.css(c.el, { display: on ? 'flex' : 'none' });
    if (!on) return;
    const out = 1 - E.ep(t, b - 0.1, b + 0.15, 'in');
    E.fade(c.ix, Math.min(E.ep(t, a, a + 0.3), out), { dy: 10, blur: 4 });
    c.bars.forEach(i => E.css(i, { transform: `scaleX(${E.f3(E.ep(t, a + 0.02, a + 0.5, 'out5'))})` }));
    E.revealWords(c.hd, t, a + 0.02, { per: 0.035, dur: 0.2, dy: 22, blur: 8 });   // every headline sharp by 0.33 s
    E.css(c.hd, { opacity: E.f3(out), transform: `scale(${E.f3(1 + 0.025 * E.ep(t, a, b, 'lin'))})` });
  };

  E.after.push(t => {
    let on = 0;
    for (const [a, b] of CONS) on = Math.max(on, Math.min(E.ep(t, a + 0.6, a + 1.1), 1 - E.ep(t, b - 0.6, b - 0.1, 'in')));
    E.txt(clk, clockAt(t));
    E.fade(chip, on, { dy: -8 });
    slateK(title, t, S('title').start, S('title').end - 0.05);
    E.css(title, { opacity: E.f3(Math.min(E.ep(t, S('title').start, S('title').start + 0.5), 1 - E.ep(t, S('title').end - 0.55, S('title').end - 0.05, 'in'))) });
    cards.forEach(c => cardK(c, t));
    const b = S('end');
    slateK(endCard, t, b.start + 0.1, E.total - 0.4, 0.3);   // all three lines up by +1.5 s, held to the fade (> 3 s)
    E.vis(black, Math.max(1 - E.ep(t, 0, 0.25, 'sine'), E.ep(t, E.total - 0.9, E.total - 0.1, 'sine')));
  });
})();
