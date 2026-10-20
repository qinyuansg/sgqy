/* Cut B · Highlight chrome: 1.0 s of black, the product line (it has faded before the quiet console enters),
   the small scenario clock chip (top right, the only chrome over the product UI; no click counter), the end card
   with the three-line message (the first line rises during the last shot's fade) and the illustrative line, and the
   fade to black. */
(function () {
  'use strict';
  const S = E.S, B = window.BEATS;
  // the scenario clock steps with the shots; it holds 02:14:59 while the alarm card drops in ('Now') and steps to
  // 02:15:06 (the authorised-activity check) when the camera leaves the card for the PTZ 7-02 player
  const CLOCK = [
    [S('quiet').start - 0.3, '02:14:50'], [S('fence').start, '02:14:58'], [S('alarm').start, '02:14:59'], [B.ptz, '02:15:06'],
    [B.tab, '02:15:20'], [B.c1, '02:15:24'], [B.c1 + 0.15, '02:15:25'], [B.c2, '02:15:30'],
    [B.ticks, '02:15:38'], [B.ticks + 0.5, '02:15:52'], [B.ticks + 1.0, '02:16:05'],
    [S('handover').start, '02:16:42'], [S('handed').start, '02:26:30'], [S('evidence').start, '02:43:40'], [B.submit, '02:43:50'],
    [B.sign, '02:44:20'],
  ];
  const clockAt = t => { let txt = CLOCK[0][1]; for (const [tc, s] of CLOCK) if (t >= tc) txt = s; return txt; };
  let chip, clk, open, product, endCard, black;

  (E.initHooks = E.initHooks || []).push(stage => {
    E.add(document.head, `<style>
      #chrome .chip.sm { top: 30px; right: 30px; padding: 7px 12px 8px; border-radius: 11px; gap: 1px; }
      #chrome .chip.sm .lab { font-size: 11.5px; letter-spacing: .18em; }
      #chrome .chip.sm .clk { font-size: 23px; }
      #chrome .slate .pl { font-family: var(--head); font-weight: 800; font-size: 72px; letter-spacing: -.03em; color: var(--ink); line-height: 1.05; }
      #chrome .slate .pl sup { font-size: .42em; vertical-align: .9em; margin-left: 2px; font-weight: 600; }
      #chrome .slate.endc { gap: 14px; }
      #chrome .slate .m { font-family: var(--head); font-weight: 800; font-size: 60px; letter-spacing: -.028em; line-height: 1.12; color: var(--ink); }
      #chrome .slate .m.a { color: var(--acc); }
      #chrome .slate .disc-l { margin-top: 30px; font-family: var(--mono); font-weight: 500; font-size: 26px; letter-spacing: .12em;
        text-transform: uppercase; color: #B8C2D8; white-space: nowrap; }
    </style>`);
    const root = E.add(stage, '<div id="chrome"></div>');
    open = E.add(root, '<div style="position:absolute;inset:0;background:#000"></div>');
    chip = E.add(root, '<div class="chip sm"><span class="lab">Fence Sector 5</span><b class="clk mono">02:14:50</b></div>');
    clk = E.q(chip, '.clk');
    product = E.add(root, '<div class="slate"><div class="pl">AgilFence × AGIL<sup>®</sup> Secure V11</div></div>');
    endCard = E.add(root, `<div class="slate endc">
      <div class="m">AgilFence — the fence feels it.</div>
      <div class="m">AGIL Secure shows who is there.</div>
      <div class="m a">Your team decides.</div>
      <div class="disc-l">Illustrative scenario · simulated data</div></div>`);
    black = E.add(root, '<div style="position:absolute;inset:0;background:#000;z-index:80;opacity:0"></div>');
  });

  // a slate whose lines rise in at the given times and fade out over [b - 0.5, b]
  const slateK = (el, t, times, b) => {
    E.css(el, { display: t > times[0] - 0.1 && t < b + 0.1 ? 'flex' : 'none' });
    let any = 0;
    Array.from(el.children).forEach((ln, i) => {
      const a = times[Math.min(i, times.length - 1)];
      const k = Math.min(E.ep(t, a, a + 0.7), 1 - E.ep(t, b - 0.5, b, 'in'));
      E.fade(ln, k, { dy: 16, blur: 6 }); any = Math.max(any, k);
    });
    E.vis(el, any > 0 ? 1 : 0);
  };

  E.after.push(t => {
    // 1.0 s of black, then the night background comes up under the product line; the line has faded out before
    // the quiet console enters, so no text sits over the product UI
    E.vis(open, 1 - E.ep(t, 0.9, 2.0, 'sine'));
    slateK(product, t, [1.0], S('quiet').start + 0.1);   // gone before the first shot enters (quiet.start + 0.1)
    // the clock chip: on with the console, off before the end card
    const on = Math.min(E.ep(t, S('quiet').start + 0.5, S('quiet').start + 1.0), 1 - E.ep(t, S('closed').end - 0.6, S('closed').end - 0.1, 'in'));
    E.txt(clk, clockAt(t));
    E.fade(chip, on, { dy: -8 });
    // end card: the first line rises during the last shot's fade, the next two on the beat, the illustrative line
    // with the third
    const e = S('end').start;
    slateK(endCard, t, [e - 0.4, e + 0.1, e + 0.6, e + 0.6], E.total - 0.5);
    E.vis(black, E.ep(t, E.total - 0.8, E.total - 0.05, 'sine'));
  });
})();
