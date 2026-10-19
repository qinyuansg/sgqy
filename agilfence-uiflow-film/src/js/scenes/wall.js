/* The command-centre video wall: the V11 wall page grows from a screen into the full frame and the
   camera drifts slowly towards the live thermal tile. No labels. */
(function () {
  'use strict';
  const S = E.S;
  const IMG = 'AF-06-command-centre-video-wall';
  const A = k => window.ANCH[IMG][k];
  const WW = 1920, WH = 1080;

  E.scene({
    id: 'wall', start: S('wall').start, end: S('wall').end, inDur: 0.5, outDur: 0.5, z: 5,
    build(el, s) {
      el.style.background = '#03050A';
      s.box = E.add(el, `<div class="abs" style="left:0;top:0;width:${WW}px;height:${WH}px;overflow:hidden;transform-origin:960px 540px;border-radius:0">
        <div class="abs cam" style="left:0;top:0;width:${WW}px;height:${WH}px;transform-origin:0 0"><img src="assets/af/${IMG}.png" style="width:${WW}px;height:${WH}px"></div></div>`);
      s.cam = E.q(s.box, '.cam');
      s.brk = K.brackets(el, 120, 90, 1680, 900, { gap: 0, arm: 56 });
      E.cue(s.start + 0.1, 'whoosh', 0.45); E.cue(s.start + 0.4, 'switch', 0.4);
    },
    update(t, lt, s) {
      // a slow push towards the hero tile across the whole scene
      const h = A('hero'), k = E.ep(t, s.start + 0.8, s.end, 'sine');
      const z = 1 + 0.11 * k, cx = E.lerp(960, h[0] + h[2] / 2 + 120, k), cy = E.lerp(540, h[1] + h[3] / 2 + 40, k);
      const ox = E.clamp(WW / 2 - cx * z, WW - WW * z, 0), oy = E.clamp(WH / 2 - cy * z, WH - WH * z, 0);
      E.css(s.cam, { transform: `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0) scale(${z.toFixed(4)})` });
      // the wall grows from a screen to the full frame
      const kg = E.ep(t, s.start + 0.1, s.start + 1.3, 'inOut');
      E.css(s.box, { transform: `scale(${E.f3(0.86 + 0.14 * kg)})`, borderRadius: `${E.f3(18 * (1 - kg))}px`, boxShadow: kg < 1 ? '0 40px 90px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.22)' : 'none' });
      K.bracketsIn(s.brk, E.ep(t, s.start + 0.2, s.start + 0.8) * (1 - E.ep(t, s.start + 1.0, s.start + 1.4)));
    },
  });
})();
