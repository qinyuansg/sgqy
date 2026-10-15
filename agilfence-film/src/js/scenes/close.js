/* f13–f14 · What it means, and the close: three plain promises over the nine steps, then
   "The fence feels it. The system shows it. Your team acts on it." */
(function () {
  'use strict';
  const L = E.L, at = E.at, S = E.S;
  const STEPS = [
    ['AF-01-perimeter-triggered', '02:14:58', 'Climb'], ['AF-02-system-message-alarm', '02:14:59', 'Alarm'], ['AF-03-incident-list', '02:15:05', 'Incident'],
    ['AF-04-locate-nearest-cameras', '02:15:08', 'Locate'], ['AF-05-ptz-films-the-area', '02:15:12', 'Live'], ['AF-06-command-centre-video-wall', '02:15:18', 'Wall'],
    ['AF-07-sop-approve-dispatch', '02:15:30', 'Dispatch'], ['AF-08-patrol-on-scene', '02:18:08', 'On scene'], ['AF-09-close-and-report', '02:44:20', 'Closed'],
  ];

  E.scene({
    id: 'f13',
    build(el, s) {
      // the nine steps as a strip of screens
      s.strip = STEPS.map(([f, tm, lab], i) => {
        const x = 120 + i * 190;
        return E.add(el, `<div class="abs" style="left:${x}px;top:150px;width:174px">
          <div style="width:174px;height:122px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.18);background:#05070D;box-shadow:0 14px 30px rgba(0,0,0,.5)">
            <img src="assets/af/${f}.png" style="width:174px;height:122px;object-fit:cover;object-position:50% 40%"></div>
          <div style="display:flex;justify-content:space-between;margin-top:10px"><span class="mono" style="font-size:15px;color:${i ? 'var(--acc)' : 'var(--amberT)'}">${tm}</span><span style="font-size:16px;color:var(--muted)">${lab}</span></div></div>`);
      });
      const rows = [['target', 'A location you can act on.', at('v15', 'location')], ['camera', 'A camera that’s already there.', at('v15', 'camera')], ['layers', 'One picture and one procedure, every shift.', at('v15', 'One')]];
      s.rows = rows.map(([ic, txt, t0], i) => ({ t0, el: E.add(el, `<div class="abs" style="left:120px;top:${430 + i * 150}px;display:flex;align-items:center;gap:30px">
        ${K.ibox(ic, 92, 40, 'color:var(--acc);border-color:rgba(143,180,255,.55)')}<div class="h-l" style="font-size:64px;white-space:nowrap">${txt}</div></div>`) }));
      s.rows.forEach(r => E.cue(r.t0 - 0.1, 'pop', 0.4));
      E.cue(s.start + 0.2, 'whoosh', 0.35);
    },
    update(t, lt, s) {
      s.strip.forEach((e, i) => E.fade(e, E.ep(t, s.start + 0.1 + i * 0.07, s.start + 0.6 + i * 0.07, 'out'), { dy: 24 }));
      s.rows.forEach(r => E.fade(r.el, E.ep(t, r.t0 - 0.2, r.t0 + 0.35), { dx: -24, dy: 0, blur: 6 }));
    },
  });

  E.scene({
    id: 'f14', outDur: 0,
    build(el, s) {
      s.since = E.add(el, `<div class="abs" style="left:0;right:0;top:250px;text-align:center">
        <div class="label" style="color:var(--amberT);font-size:16px">On Changi’s airfield perimeter</div>
        <div class="h-xl mono" style="font-family:var(--head);font-size:150px;margin-top:10px">Since 2011</div></div>`);
      const lines = [['AgilFence feels it.', '#E3B341', at('v17', 'feels')], ['AGIL Secure shows it.', '#3EA9FF', at('v17', 'shows')], ['Your team acts on it.', '#FFFFFF', at('v17', 'acts')]];
      s.lines = lines.map(([txt, col, t0], i) => ({ t0, el: E.add(el, `<div class="abs" style="left:0;right:0;top:${[290, 400, 560][i]}px;display:flex;justify-content:center;align-items:center;gap:26px">
        <i style="width:18px;height:18px;border-radius:50%;background:${col};box-shadow:0 0 22px ${col}"></i><span class="h-l" style="font-size:84px;white-space:nowrap">${txt}</span></div>`) }));
      s.sub = E.add(el, `<div class="abs" style="left:0;right:0;top:496px;text-align:center;font-size:24px;color:#9FC3FF">every sensor, camera and step, in one place</div>`);
      s.lock = E.add(el, `<div class="abs" style="left:0;right:0;top:752px;display:flex;justify-content:center;align-items:center;gap:22px">
        <img src="assets/logo_s.png" style="width:56px;height:52px"><span style="font-family:var(--head);font-weight:800;font-size:40px;color:#fff;letter-spacing:-.01em">AgilFence <span style="color:var(--muted);font-weight:500">×</span> AGIL Secure V11</span></div>`);
      s.disc = E.add(el, `<div class="abs" style="left:0;right:0;top:846px;text-align:center">
        <div style="font-size:21px;color:#fff;font-weight:500">Next: a live AGIL Secure V11 walkthrough on your AgilFence alarms, and an SOP-mapping workshop with your team.</div>
        <div class="label" style="margin:16px auto 0;width:1500px;font-size:13.5px;line-height:1.6;color:#8F9CB8;white-space:normal">Illustrative scenario · simulated data · names, times, layout and distances are stylised · NEW screens and Co-pilot are concepts · not a recording of a real event · restricted: for CAG security and airside operations stakeholders</div></div>`);
      s.tL = L('v16').start; s.tSwap = L('v17').start - 0.2;
      s.lines.forEach(l => E.cue(l.t0 - 0.05, 'hit', 0.5));
      E.cue(at('v17', 'acts') + 0.6, 'shimmer', 0.3, { dur: 2.2 });
    },
    update(t, lt, s) {
      E.fade(s.since, E.ep(t, s.tL - 0.2, s.tL + 0.5) * (1 - E.ep(t, s.tSwap - 0.3, s.tSwap, 'in')), { dy: 20, blur: 8 });
      s.lines.forEach(l => E.fade(l.el, E.ep(t, l.t0 - 0.25, l.t0 + 0.3), { dy: 22, blur: 8 }));
      E.fade(s.sub, E.ep(t, at('v17', 'every') - 0.2, at('v17', 'every') + 0.4), { dy: 10 });
      E.fade(s.lock, E.ep(t, at('v17', 'acts') + 0.9, at('v17', 'acts') + 1.5), { dy: 16 });
      E.fade(s.disc, E.ep(t, at('v17', 'acts') + 1.3, at('v17', 'acts') + 1.9), { dy: 0 });
    },
  });
})();
