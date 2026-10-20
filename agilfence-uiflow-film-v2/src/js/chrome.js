/* Persistent chrome: the opening slate, the 'Another night' card, the end slate, the scenario clock
   chip and the operator-clicks counter (top right), and the fade to black.
   Nothing else is drawn over the product UI. */
(function () {
  'use strict';
  const S = E.S, B = window.BEATS;
  // the scenario clock steps through the states of the flow (never behind the latest time on screen):
  // AV-S2 already lists the checks up to 02:15:06, AV-S8 the police response at 02:16:05, AV-S10 the hand-over
  // to police at 02:26:30 and AV-S11 the evidence sealed at 02:43:40, so the clock steps there at their crossfades
  const CLOCK = [
    [S('quiet').start, '02:14:50'], [S('alarm').start, '02:14:58'], [S('alarm').start + 2.0, '02:15:06'], [B.c1, '02:15:20'],
    [B.c2, '02:15:24'], [B.raised, '02:15:25'], [B.c3, '02:15:30'], [S('running').start, '02:16:05'],
    [S('handover').start, '02:16:42'], [S('outcomes').start, '02:26:30'], [S('closure').start, '02:43:40'], [B.c4, '02:43:50'],
    [B.dm1, '02:44:14'], [B.dm2 + 0.15, '02:44:20'],
    [S('alt').start, '01:20:45'], [B.a1, '01:21:05'], [B.a2, '01:22:10'],
  ];
  const clockAt = t => {
    let txt = CLOCK[0][1];
    for (const [tc, s] of CLOCK) if (t >= tc) txt = s;
    return txt;
  };
  // operator clicks: four on the main path (SOP Flow tab · Confirm intrusion · Dispatch · Submit for sign-off; the
  // duty manager's clicks do not count); the alternative path counts again from zero (SOP Flow tab · Authorised activity)
  const MAIN = [B.c1, B.c2, B.c3, B.c4], ALT = [B.a1, B.a2];
  const opClicks = t => (t >= S('card').start ? ALT : MAIN).filter(c => t >= c).length;
  const lastClick = t => [...MAIN, ...ALT].filter(c => t >= c).pop();
  let chip, clk, cnt, cntN, slate, card, endSlate, black;

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    chip = E.add(root, '<div class="chip"><span class="lab">Fence Sector 5</span><b class="clk mono">02:14:50</b></div>');
    clk = E.q(chip, '.clk');
    cnt = E.add(root, '<div class="chip c2"><span class="lab">Operator clicks</span><b class="clk mono n">0</b></div>');
    cntN = E.q(cnt, '.n');
    slate = E.add(root, `<div class="slate">
      <div class="s1">AgilFence × AGIL<sup>®</sup> Secure V11</div>
      <div class="s2 v">Operator experience v2</div>
      <div class="s2">See who is at the fence without a click · three decisions · evidence before closure</div>
      <div class="s3 label">Illustrative scenario · simulated data</div></div>`);
    card = E.add(root, '<div class="slate"><div class="s2 c">Another night · approved works</div></div>');
    endSlate = E.add(root, `<div class="slate">
      <div class="s2 e">Three operator decisions · authority on every action · evidence before closure</div>
      <div class="s3 label">Illustrative scenario · simulated data</div></div>`);
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

  E.after.push(t => {
    // chips: on with each console, off during the slates and the card
    const main = Math.min(E.ep(t, S('quiet').start + 0.6, S('quiet').start + 1.1), 1 - E.ep(t, S('closed').end - 0.5, S('closed').end, 'in'));
    const alt = Math.min(E.ep(t, S('alt').start + 0.6, S('alt').start + 1.1), 1 - E.ep(t, S('resolved').end - 0.5, S('resolved').end, 'in'));
    const on = Math.max(t < S('card').start ? main : 0, t >= S('card').start ? alt : 0);
    E.txt(clk, clockAt(t));
    E.fade(chip, on, { dy: -8 });
    E.txt(cntN, String(opClicks(t)));
    E.fade(cnt, on, { dy: -8 });
    // the counter pops at each operator click
    const lc = lastClick(t), pk = lc === undefined ? 0 : 1 - E.ep(t, lc, lc + 0.7, 'out');
    E.css(cntN, { transform: `scale(${E.f3(1 + 0.4 * pk)})`, color: pk > 0.02 ? `rgba(143,180,255,${E.f3(0.4 + 0.6 * pk)})` : '' });
    E.css(cnt, { borderColor: `rgba(143,180,255,${E.f3(0.16 + 0.6 * pk)})` });
    // slates and card
    slateK(slate, t, S('slate').start, S('slate').end);
    slateK(card, t, S('card').start, S('card').end);
    const b = S('end');
    slateK(endSlate, t, b.start + 0.1, E.total - 0.4, 0.3);
    E.vis(black, E.ep(t, E.total - 0.9, E.total - 0.1, 'sine'));
  });
})();
