/* Persistent chrome: chapter kicker, use-case bug, scenario note, preview subtitles. */
(function () {
  'use strict';
  const CHAPTERS = [
    { scenes: ['s01', 's02', 's03', 's04'], label: '01 · The challenge' },
    { scenes: ['s05'], label: '02 · The solution' },
    { scenes: ['s06'], label: '03 · Design principles' },
    { scenes: ['s07', 'm1', 'm2', 'm3', 'm4', 'm5'], label: '04 · User scenarios' },
    { scenes: ['s13'], label: '05 · Core capabilities' },
    { scenes: ['s14'], label: '06 · Core value' },
  ].map(c => ({ ...c, start: E.S(c.scenes[0]).start, end: E.S(c.scenes[c.scenes.length - 1]).end }));
  CHAPTERS[0].start = 1.2;

  let kick, kickText, bug, note, subs, subEn, subZh;
  const showSubs = new URLSearchParams(location.search).get('subs') === '1';

  (E.initHooks = E.initHooks || []).push(stage => {
    const root = E.add(stage, '<div id="chrome"></div>');
    kick = E.add(root, '<div class="kick"><i></i><span class="kicker"></span></div>');
    kickText = E.q(kick, '.kicker');
    bug = E.add(root, '<div class="bug">AI Use Case 01 · <b>AGIL® Secure ISMS</b></div>');
    note = E.add(root, '<div class="note">Illustrative scenario · simulated data</div>');
    if (showSubs) {
      subs = E.add(stage, '<div id="subs"><div class="en"></div><div class="zh"></div></div>');
      subEn = E.q(subs, '.en'); subZh = E.q(subs, '.zh');
    }
  });

  E.after.push(t => {
    // chapter kicker: fade out at chapter end, in at chapter start
    let k = 0, label = '';
    for (const c of CHAPTERS) {
      if (t >= c.start - 0.1 && t <= c.end + 0.1) {
        label = c.label;
        k = Math.min(E.ep(t, c.start, c.start + 0.45), 1 - E.ep(t, c.end - 0.3, c.end + 0.05, 'in'));
        break;
      }
    }
    E.txt(kickText, label);
    E.fade(kick, k, { dx: -12, dy: 0 });

    const s02 = E.S('s02').start, s14 = E.S('s14').end;
    E.vis(bug, Math.min(E.ep(t, s02 + 0.3, s02 + 0.9), 1 - E.ep(t, s14 - 0.4, s14)) * 0.95);
    const s07 = E.S('s07').start, m5 = E.S('m5').end;
    E.vis(note, Math.min(E.ep(t, s07 + 0.3, s07 + 0.9), 1 - E.ep(t, m5 - 0.4, m5)));

    if (subs) {
      let cue = null;
      for (const l of window.TL.lines) for (const c of l.cues) if (t >= c.start && t < c.end + 0.25) cue = c;
      E.txt(subEn, cue ? cue.en : ''); E.txt(subZh, cue ? cue.zh.replace(/\//g, '') : '');
      E.vis(subs, cue ? 1 : 0);
    }
  });
})();
