/* Shared layout for the five scenario moments: a left rail (moment, time,
   persona, user story, before → with AI) and a product stage on the right. */
(function () {
  'use strict';
  const M = (window.MOMENT = {});
  const storyHTML = st =>
    `<b style="color:#8FB4FF;font-weight:600">${/^[aeiou]/i.test(st.as) ? 'As an' : 'As a'}</b> ${st.as}, <b style="color:#8FB4FF;font-weight:600">I want</b> ${st.want}, <b style="color:#8FB4FF;font-weight:600">so that</b> ${st.so}.`;

  // o = {n, time, title, who:[keys], story:{as,want,so}, before, after}
  M.rail = (el, o) => {
    const who = o.who.map(k => {
      const p = C.PERSONAS[k];
      return `<div style="display:flex;align-items:center;gap:14px">${C.avatar(k, 46)}<div><div style="font-weight:600;font-size:20px">${p.name}</div><div style="color:#8D9BB8;font-size:16px">${p.role}</div></div></div>`;
    }).join('');
    const r = E.add(el, `
      <div class="abs rail" style="left:120px;top:142px;width:488px">
        <div class="r-n" style="display:flex;align-items:center;gap:14px">
          <span class="label" style="color:#8FB4FF">Moment ${o.n} of 5</span>
          <span style="display:flex;gap:6px">${[1, 2, 3, 4, 5].map(i => `<i style="width:${i === o.n ? 22 : 8}px;height:8px;border-radius:4px;background:${i === o.n ? '#4D8DFF' : i < o.n ? 'rgba(77,141,255,.45)' : 'rgba(143,161,192,.25)'}"></i>`).join('')}</span>
        </div>
        <div class="r-t mono" style="font-size:80px;font-weight:600;letter-spacing:-.02em;margin-top:12px;line-height:1">${o.time}</div>
        <div class="r-h h-s" style="margin-top:16px;font-size:31px;line-height:1.18">${o.title}</div>
        <div class="r-w" style="display:flex;flex-direction:column;gap:12px;margin-top:22px">${who}</div>
        <div class="r-s panel flat" style="margin-top:24px;padding:22px 24px;border-color:rgba(77,141,255,.35);background:linear-gradient(180deg,rgba(26,46,90,.55),rgba(14,26,52,.75))">
          <div class="label" style="color:#8FB4FF;display:flex;align-items:center;gap:8px">${C.icon('person', 15)} User story</div>
          <div class="r-st" style="margin-top:12px;font-size:22px;line-height:1.45;color:#E3EAF7">${storyHTML(o.story)}</div>
        </div>
        <div class="r-b" style="margin-top:22px;display:grid;grid-template-columns:104px 1fr;row-gap:12px;align-items:center">
          <span class="pill crit r-b1" style="justify-self:start">BEFORE</span><span class="r-b2" style="color:#B4C1D8;font-size:19px">${o.before}</span>
          <span class="pill blue r-a1" style="justify-self:start">WITH AI</span><span class="r-a2" style="color:#EEF3FC;font-size:19px;font-weight:500">${o.after}</span>
        </div>
      </div>`);
    return { root: r, n: E.q(r, '.r-n'), t: E.q(r, '.r-t'), h: E.q(r, '.r-h'), w: E.q(r, '.r-w'), s: E.q(r, '.r-s'),
      b: [E.q(r, '.r-b1'), E.q(r, '.r-b2')], a: [E.q(r, '.r-a1'), E.q(r, '.r-a2')], gainAt: o.gainAt };
  };

  M.updateRail = (r, t, s) => {
    const t0 = s.start;
    E.fade(r.n, E.ep(t, t0, t0 + 0.4), { dy: 8 });
    E.fade(r.t, E.ep(t, t0 + 0.05, t0 + 0.55, 'out5'), { dy: 18, blur: 6 });
    E.fade(r.h, E.ep(t, t0 + 0.2, t0 + 0.7), { dy: 14 });
    E.fade(r.w, E.ep(t, t0 + 0.35, t0 + 0.85), { dy: 12 });
    E.fade(r.s, E.ep(t, t0 + 0.5, t0 + 1.05), { dy: 18, blur: 4 });
    E.fade(r.b[0], E.ep(t, t0 + 1.0, t0 + 1.4), { dx: -10, dy: 0 });
    E.fade(r.b[1], E.ep(t, t0 + 1.05, t0 + 1.45), { dx: -10, dy: 0 });
    const g = r.gainAt || t0 + 2;
    E.fade(r.a[0], E.ep(t, g, g + 0.4), { dx: -10, dy: 0 });
    E.fade(r.a[1], E.ep(t, g + 0.05, g + 0.45), { dx: -10, dy: 0 });
    // the "before" line greys out once the gain lands
    const k = E.ep(t, g, g + 0.6);
    E.css(r.b[1], { color: k > 0.5 ? '#6F80A0' : '#B4C1D8', textDecoration: k > 0.5 ? 'line-through rgba(111,128,160,.7)' : 'none' });
  };

  // stage panel with a product header
  M.stage = (el, title, right = '') => E.add(el, `
    <div class="abs panel stage" style="left:660px;top:142px;width:1140px;height:748px;overflow:hidden">
      <div style="height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line)">
        <div style="display:flex;align-items:center;gap:12px;white-space:nowrap">
          <span style="font-family:var(--head);font-weight:700;font-size:20px">AGIL<sup style="font-size:10px">®</sup> Secure ISMS</span>
          <span style="color:#6F80A0">·</span><span style="color:#A9B7CF;font-size:17px">${title}</span>
        </div>
        <div class="st-right" style="display:flex;align-items:center;gap:12px">${right}</div>
      </div>
      <div class="st-body" style="position:absolute;left:0;right:0;top:66px;bottom:0"></div>
    </div>`);

  // animated pointer: path = [[t,x,y],...], clicks = [t,...]  (stage-local coordinates)
  M.cursor = (parent) => {
    const c = E.add(parent, C.cursor());
    const rp = E.add(parent, '<div class="ripple"></div>');
    return { c, rp };
  };
  M.updateCursor = (cur, t, path, clicks, vis) => {
    let x = path[0][1], y = path[0][2];
    for (let i = 0; i < path.length - 1; i++) {
      const [ta, xa, ya] = path[i], [tb, xb, yb] = path[i + 1];
      if (t >= ta && t <= tb) { const k = E.ease.inOut(E.p(t, ta, tb)); x = E.lerp(xa, xb, k); y = E.lerp(ya, yb, k); break; }
      if (t > tb) { x = xb; y = yb; }
    }
    let press = 0, rk = -1;
    for (const ct of clicks) { if (t >= ct - 0.08 && t <= ct + 0.12) press = 1; if (t >= ct && t <= ct + 0.5) rk = E.p(t, ct, ct + 0.5); }
    E.css(cur.c, { transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${press ? 0.86 : 1})`, opacity: E.f3(vis) });
    if (rk >= 0) E.css(cur.rp, { left: (x + 6).toFixed(1) + 'px', top: (y + 4).toFixed(1) + 'px', opacity: E.f3((1 - rk) * vis), transform: `scale(${E.f3(0.3 + rk)})` });
    else E.css(cur.rp, { opacity: '0' });
  };
})();
