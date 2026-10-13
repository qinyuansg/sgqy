/* Persistent chrome: chapter kicker, product bug, scenario note, HUD corner ticks, preview subtitles. */
(function () {
  'use strict';
  const S = E.S;
  const CHAPTERS = [
    { a: 's02', b: 's02', label: '01 · The night shift' },
    { a: 's03', b: 's04', label: '02 · Meet Co-pilot' },
    { a: 's05', b: 'm9', label: '03 · One night, seven incidents' },
    { a: 's06', b: 's07', label: '04 · One platform, governed' },
    { a: 's08', b: 's08', label: '05 · The difference' },
  ].map(c => ({ ...c, start: S(c.a).start, end: S(c.b).end }));

  let kick, kickText, bug, note, hud, subs, subEn;
  const showSubs = new URLSearchParams(location.search).get('subs') === '1';

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    kick = E.add(root, '<div class="kick"><i></i><span class="kicker"></span></div>');
    kickText = E.q(kick, '.kicker');
    bug = E.add(root, '<div class="bug">AGIL<sup style="font-size:9px">®</sup> Secure V11 · <b>AI Co-pilot</b></div>');
    note = E.add(root, '<div class="clk">Illustrative scenario · simulated data</div>');
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
    E.txt(kickText, label);
    E.fade(kick, k, { dx: -12, dy: 0 });
    const win = (a, b) => Math.min(E.ep(t, a + 0.3, a + 0.9), 1 - E.ep(t, b - 0.4, b));
    E.vis(bug, win(S('s02').start, S('s08').end) * 0.95);
    E.vis(note, win(S('s05').start, S('m9').end));
    hud.forEach(h => E.vis(h, win(0.6, E.total - 0.2)));
    if (subs) {
      let cue = null;
      for (const l of window.TL.lines) for (const c of l.cues) if (t >= c.start && t < c.end + 0.3) cue = c;
      E.txt(subEn, cue ? cue.en : '');
      E.vis(subs, cue ? 1 : 0);
    }
  });
})();
