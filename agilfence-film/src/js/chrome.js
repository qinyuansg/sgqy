/* Persistent chrome: chapter kicker, product bug, scenario note, HUD corner ticks, preview subtitles. */
(function () {
  'use strict';
  const S = E.S;
  const CHAPTERS = [
    { a: 'f01', b: 'f04', label: '01 · The fence', from: 3.4 },
    { a: 'f05', b: 'f08', label: '02 · The alarm' },
    { a: 'f09', b: 'f12', label: '03 · The response' },
  ].map(c => ({ ...c, start: c.from ?? S(c.a).start, end: S(c.b).end }));

  let kick, kickText, bug, note, hud, black, subs, subEn;
  const showSubs = new URLSearchParams(location.search).get('subs') === '1';

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    kick = E.add(root, '<div class="kick"><i></i><span class="kicker"></span></div>');
    kickText = E.q(kick, '.kicker');
    bug = E.add(root, '<div class="bug">AgilFence × <b>AGIL<sup style="font-size:9px">®</sup> Secure V11</b></div>');
    note = E.add(root, '<div class="clk">Illustrative scenario · simulated data</div>');
    black = E.add(root, '<div style="position:absolute;inset:0;background:#000;z-index:80;opacity:0"></div>');
    hud = ['tl', 'tr', 'bl', 'br'].map(k => E.add(root, `<div class="hud" style="${k[0] === 't' ? 'top:28px' : 'bottom:28px'};${k[1] === 'l' ? 'left:28px' : 'right:28px'};border-${k[0] === 't' ? 'top' : 'bottom'}-width:1.5px;border-${k[1] === 'l' ? 'left' : 'right'}-width:1.5px"></div>`));
    if (showSubs) {
      subs = E.add(stage, '<div id="subs"><div class="en"></div></div>');
      subEn = E.q(subs, '.en');
    }
  });

  E.after.push(t => {
    let k = 0, label = '';
    for (const c of CHAPTERS) {
      if (t >= c.start - 0.1 && t <= c.end + 0.1) {
        label = c.label;
        k = Math.min(E.ep(t, c.start + 0.2, c.start + 0.7), 1 - E.ep(t, c.end - 0.35, c.end + 0.05, 'in'));
        break;
      }
    }
    // the full-bleed video wall carries its own header: the chrome steps aside
    const wall = Math.min(E.ep(t, S('f09').start - 0.1, S('f09').start + 0.4), 1 - E.ep(t, S('f09').end - 0.4, S('f09').end + 0.1));
    E.txt(kickText, label);
    E.fade(kick, k * (1 - wall), { dx: -12, dy: 0 });
    const win = (a, b) => Math.min(E.ep(t, a + 0.3, a + 0.9), 1 - E.ep(t, b - 0.4, b));
    E.vis(bug, win(3.4, S('f13').end) * 0.95 * (1 - wall));
    E.vis(note, win(3.4, S('f13').end) * (1 - wall));
    hud.forEach(h => E.vis(h, win(3.2, S('f13').end)));
    E.vis(black, E.ep(t, E.total - 1.3, E.total - 0.15, 'sine'));
    if (subs) {
      let cue = null;
      for (const l of window.TL.lines) for (const c of l.cues) if (t >= c.start && t < c.end + 0.3) cue = c;
      E.txt(subEn, cue ? cue.en : '');
      E.vis(subs, cue ? 1 : 0);
    }
  });
})();
