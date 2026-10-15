/* f09 · The command-centre video wall: the V11 wall page grows from a screen into the full frame,
   then the camera moves across the tiles the narration names (live thermal, the wide view, the
   replay of the seconds before the alarm). */
(function () {
  'use strict';
  const L = E.L, at = E.at, S = E.S;
  const IMG = 'AF-06-command-centre-video-wall';
  const A = k => window.ANCH[IMG][k];
  const WW = 1920, WH = 1080;

  E.scene({
    id: 'wall', start: S('f09').start, end: S('f09').end, inDur: 0.5, outDur: 0.5, z: 5,
    build(el, s) {
      el.style.background = '#03050A';
      s.box = E.add(el, `<div class="abs" style="left:0;top:0;width:${WW}px;height:${WH}px;overflow:hidden;transform-origin:960px 540px;border-radius:0">
        <div class="abs cam" style="left:0;top:0;width:${WW}px;height:${WH}px;transform-origin:0 0"><img src="assets/af/${IMG}.png" style="width:${WW}px;height:${WH}px"></div></div>`);
      s.cam = E.q(s.box, '.cam');
      s.brk = K.brackets(el, 120, 90, 1680, 900, { gap: 0, arm: 56 });
      const tags = [
        ['hero', 'Live camera · auto-track', at('v10', 'live') - 0.1],
        ['wide', 'The wide view', at('v10', 'wide') - 0.3],
        ['replay', 'Replay from before the alarm', at('v10', 'replay') + 0.3],
      ];
      s.tags = tags.map(([k, label, t0], i) => ({ k, t0, r: A(k), box: E.add(el, '<div class="hlb" style="z-index:4"></div>'), tag: E.add(el, `<div class="abs tag" style="z-index:5"><span class="disc">${i + 1}</span><span>${label}</span></div>`) }));
      s.cap = E.add(el, `<div class="abs glass" style="left:60px;top:1080px;width:500px;padding:20px 24px;z-index:6">
        <div class="label" style="color:var(--acc)">Step 6 of 9 · 02:15:18</div>
        <div class="h-s" style="margin-top:10px;font-size:32px">One picture for the whole room.</div>
        <div style="margin-top:12px;display:inline-flex;height:28px;align-items:center;padding:0 12px;border-radius:14px;border:1.5px dashed rgba(201,211,230,.6);font-size:15px;color:#C9D3E6">Concept: video wall layout</div></div>`);
      // camera plan in wall px: [t, rect, dur]
      s.shots = [[s.start, null, 0.1], [at('v10', 'replay') + 0.1, [1170, 130, 750, 420], 1.1]];
      s.tags.forEach(g => E.cue(g.t0 + 0.05, 'blip', 0.45));
      E.cue(s.start + 0.1, 'whoosh', 0.45); E.cue(s.start + 0.4, 'switch', 0.4);
    },
    update(t, lt, s) {
      // camera
      const toP = r => { r = r || [0, 0, WW, WH]; const z = E.clamp(Math.min(WW / r[2], WH / r[3]), 1, 2); return [r[0] + r[2] / 2, r[1] + r[3] / 2, Math.log(z)]; };
      let p = toP(null);
      for (const [ts, r, d] of s.shots) { if (t < ts) break; const q = toP(r), k = E.ease.inOut(E.p(t, ts, ts + d)); p = [E.lerp(p[0], q[0], k), E.lerp(p[1], q[1], k), E.lerp(p[2], q[2], k)]; }
      const z = Math.exp(p[2]), ox = E.clamp(WW / 2 - p[0] * z, WW - WW * z, 0), oy = E.clamp(WH / 2 - p[1] * z, WH - WH * z, 0);
      E.css(s.cam, { transform: `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0) scale(${z.toFixed(4)})` });
      // the wall grows from a screen to full frame
      const kg = E.ep(t, s.start + 0.1, s.start + 1.3, 'inOut');
      E.css(s.box, { transform: `scale(${E.f3(0.86 + 0.14 * kg)})`, borderRadius: `${E.f3(18 * (1 - kg))}px`, boxShadow: kg < 1 ? '0 40px 90px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.22)' : 'none' });
      K.bracketsIn(s.brk, E.ep(t, s.start + 0.2, s.start + 0.8) * (1 - E.ep(t, s.start + 1.0, s.start + 1.4)));
      // tags (one at a time; each holds until the next)
      s.tags.forEach((g, i) => {
        const t1 = i < 2 ? at('v10', 'replay') + 0.5 : s.end - 0.4;   // live + wide hold together, fading as the replay push begins
        const k = E.ep(t, g.t0, g.t0 + 0.45) * (1 - E.ep(t, t1 - 0.3, t1, 'in'));
        const [x, y, w, h] = g.r, X0 = ox + x * z, Y0 = oy + y * z, X1 = ox + (x + w) * z, Y1 = oy + (y + h) * z;
        E.css(g.box, { left: (X0 + 6).toFixed(1) + 'px', top: (Y0 + 6).toFixed(1) + 'px', width: (X1 - X0 - 12).toFixed(1) + 'px', height: (Y1 - Y0 - 12).toFixed(1) + 'px', opacity: E.f3(k), visibility: k > 0.001 ? 'visible' : 'hidden' });
        const tw = g.tag.offsetWidth || 300, tx = E.clamp(X0 + 26, 30, 1890 - tw), ty = E.clamp(Y1 - 74 - (g.k === 'replay' ? 34 * z + 12 : 0), 100, 1000);   // the replay tag sits above the scrubber
        E.css(g.tag, { left: tx.toFixed(1) + 'px', top: ty.toFixed(1) + 'px', opacity: E.f3(k), visibility: k > 0.001 ? 'visible' : 'hidden', transform: `translateY(${E.f3((1 - k) * 12)}px)` });
      });
      E.fade(s.cap, E.ep(t, s.start + 0.8, s.start + 1.3) * (1 - E.ep(t, at('v10', 'replay') + 0.1, at('v10', 'replay') + 0.5)), { dy: 20 });   // out before the replay push
      E.css(s.cap, { top: '440px' });   // in the dark left of the hero tile, clear of the LiDAR tile and the subtitles
    },
  });
})();
