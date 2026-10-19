/* Persistent chrome: the opening and end slates, the scenario clock chip (top right) and the
   fade to black. Nothing else is drawn over the product UI. */
(function () {
  'use strict';
  const S = E.S;
  // the scenario clock steps at each state of the flow (never behind the latest System entry on screen: 02:15:12 in the Investigation tab)
  const CLOCK = [
    [S('quiet').start, '02:14:58'], [S('toast').start, '02:14:59'], [S('inv').start, '02:15:12'], [S('locate').start, '02:15:14'],
    [S('live').start, '02:15:16'], [S('wall').start, '02:15:18'], [36.6, '02:15:24'], [S('dispatched').start, '02:15:30'],
    [46.6, '02:15:40'], [S('escalate').start, '02:16:05'], [S('created').start, '02:16:10'], [S('patrol').start, '02:18:08'],
    [S('im').start, '02:44:20'], [S('close').start, '07:01:50'], [79.3, '07:02:00'],
  ];
  let chip, clk, slate, endSlate, black;

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    chip = E.add(root, '<div class="chip"><span class="lab">Fence Sector 5</span><b class="clk mono">02:14:58</b></div>');
    clk = E.q(chip, '.clk');
    slate = E.add(root, `<div class="slate">
      <div class="s1">AgilFence × AGIL<sup>®</sup> Secure V11</div>
      <div class="s2">From a touch on the fence to a closed incident</div>
      <div class="s3 label">Illustrative scenario · simulated data</div></div>`);
    endSlate = E.add(root, '<div class="slate"><div class="s2 e">Illustrative scenario · simulated data · people decide</div></div>');
    black = E.add(root, '<div style="position:absolute;inset:0;background:#000;z-index:80;opacity:0"></div>');
  });

  E.after.push(t => {
    // clock chip: on with the console, off during the full-bleed video wall (it carries its own clock) and the slates
    let txt = CLOCK[0][1];
    for (const [tc, s] of CLOCK) if (t >= tc) txt = s;
    E.txt(clk, txt);
    const w = S('wall');
    const wall = Math.min(E.ep(t, w.start - 0.1, w.start + 0.5), 1 - E.ep(t, w.end - 0.5, w.end + 0.1));
    const on = Math.min(E.ep(t, S('quiet').start + 0.6, S('quiet').start + 1.1), 1 - E.ep(t, S('close').end - 0.5, S('close').end, 'in'));
    E.fade(chip, on * (1 - wall), { dy: -8 });
    // slates
    const a = S('slate'), b = S('end');
    const k1 = Math.min(E.ep(t, a.start + 0.1, a.start + 0.9), 1 - E.ep(t, a.end - 0.5, a.end, 'in'));
    E.css(slate, { display: t < a.end + 0.1 ? 'flex' : 'none' });   // flex: film.css centres the slate lines
    Array.from(slate.children).forEach((ln, i) => E.fade(ln, Math.min(E.ep(t, a.start + 0.1 + i * 0.22, a.start + 0.8 + i * 0.22), 1 - E.ep(t, a.end - 0.5, a.end, 'in')), { dy: 14, blur: 6 }));
    E.vis(slate, k1 > 0 ? 1 : 0);
    const k2 = Math.min(E.ep(t, b.start + 0.2, b.start + 0.9), 1 - E.ep(t, E.total - 1.1, E.total - 0.4, 'in'));
    E.css(endSlate, { display: t > b.start - 0.1 ? 'flex' : 'none' });
    E.fade(endSlate.firstElementChild, k2, { dy: 12, blur: 6 });
    E.vis(endSlate, k2 > 0 ? 1 : 0);
    E.vis(black, E.ep(t, E.total - 0.9, E.total - 0.1, 'sine'));
  });
})();
