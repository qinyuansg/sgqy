/* f01–f02 · 02:14 on the north perimeter: a long fence receding into the dark, runway edge lights,
   wind across the airfield. Then the question every fence alarm asks: the wind, or someone? */
(function () {
  'use strict';
  const L = E.L, at = E.at, S = E.S;
  const VP = [1290, 520];                       // vanishing point
  const NS = 'http://www.w3.org/2000/svg';
  // project a point on a plane receding to VP: (X, Y) at depth z ≥ 1
  const pj = (X, Y, z) => [VP[0] + (X - VP[0]) / z, VP[1] + (Y - VP[1]) / z];

  E.scene({
    id: 'night', start: S('f01').start, end: S('f02').end, inDur: 0, outDur: 0.6,
    build(el, s) {
      const R = E.rng(214);
      let sv = '';
      // sky + stars
      sv += `<defs><linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02040A"/><stop offset=".62" stop-color="#0A1222"/><stop offset="1" stop-color="#0E1A30"/></linearGradient>
        <linearGradient id="ngnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B111C"/><stop offset="1" stop-color="#030508"/></linearGradient>
        <radialGradient id="nglow" cx=".67" cy=".5" r=".5"><stop offset="0" stop-color="#2D5BFF" stop-opacity=".22"/><stop offset="1" stop-color="#2D5BFF" stop-opacity="0"/></radialGradient>
        <filter id="nbl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
      sv += '<rect width="1920" height="1080" fill="url(#nsky)"/>';
      for (let i = 0; i < 160; i++) sv += `<circle cx="${(R() * 1920).toFixed(1)}" cy="${(R() * 470).toFixed(1)}" r="${(0.5 + R() * 1.2).toFixed(2)}" fill="#fff" opacity="${(0.15 + R() * 0.5).toFixed(2)}"/>`;
      sv += '<rect y="380" width="1920" height="300" fill="url(#nglow)"/>';
      // ground below the horizon
      sv += `<rect y="${VP[1]}" width="1920" height="${1080 - VP[1]}" fill="url(#ngnd)"/>`;
      // runway: two edge-light rows and a centreline receding to VP
      const lights = [];
      for (const [X, col] of [[2350, '#7FB2FF'], [3350, '#7FB2FF']]) {
        for (let k = 0; k < 34; k++) {
          const z = 1.2 + k * 0.55, [x, y] = pj(X, 1080, z);
          lights.push({ x, y, r: Math.max(0.8, 4.2 / z), col: k % 6 === 5 ? '#FF7A45' : col, z });
        }
      }
      sv += '<g id="nlights">' + lights.map(l => `<circle cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" r="${(l.r * 2.6).toFixed(2)}" fill="${l.col}" opacity=".16"/><circle cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" r="${l.r.toFixed(2)}" fill="${l.col}"/>`).join('') + '</g>';
      // far tower with a red beacon
      sv += '<rect x="1532" y="450" width="10" height="70" fill="#141B28"/><rect x="1520" y="436" width="34" height="16" rx="3" fill="#18202E"/>';
      s.beacon = null;
      // the fence: posts receding along the left, mesh, top wires and the (dormant) AgilFence cable
      const X0 = -520, TOP = 90, BOT = 1180, MID = 640;
      const posts = [];
      for (let k = 0; k < 64; k++) posts.push(Math.pow(1.075, k) + k * 0.12);   // spacing grows with depth, so the fence runs to the horizon
      let fe = '', mesh = '';
      for (let k = 0; k < posts.length - 1; k++) {
        const z0 = posts[k], z1 = posts[k + 1];
        const [a0, t0] = pj(X0, TOP, z0), [, b0] = pj(X0, BOT, z0), [a1, t1] = pj(X0, TOP, z1), [, b1] = pj(X0, BOT, z1);
        // diamond mesh in this bay
        const n = 7;
        for (let j = 0; j <= n; j++) {
          const u = j / n;
          const xa = E.lerp(a0, a1, u), ta = E.lerp(t0, t1, u), ba = E.lerp(b0, b1, u);
          const xb = E.lerp(a0, a1, Math.min(1, u + 0.5)), tb = E.lerp(t0, t1, Math.min(1, u + 0.5)), bb = E.lerp(b0, b1, Math.min(1, u + 0.5));
          mesh += `<line x1="${xa.toFixed(1)}" y1="${ta.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${bb.toFixed(1)}"/><line x1="${xa.toFixed(1)}" y1="${ba.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${tb.toFixed(1)}"/>`;
        }
      }
      posts.forEach(z => {
        const [x, t] = pj(X0, TOP, z), [, b] = pj(X0, BOT, z), w = Math.max(1.2, 22 / z);
        const [ax, ay] = pj(X0 - 120, TOP - 120, z), [bx, by] = pj(X0 + 120, TOP - 120, z);
        fe += `<rect x="${(x - w / 2).toFixed(1)}" y="${t.toFixed(1)}" width="${w.toFixed(1)}" height="${(b - t).toFixed(1)}" fill="#5D6878"/>`;
        fe += `<path d="M${x.toFixed(1)} ${t.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)} M${x.toFixed(1)} ${t.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}" stroke="#5D6878" stroke-width="${Math.max(1, 9 / z).toFixed(1)}"/>`;
      });
      const zF = posts[posts.length - 1];
      const wire = (Y, dx = 0) => { const [x0, y0] = pj(X0 + dx, Y, posts[0]), [x1, y1] = pj(X0 + dx, Y, zF); return `M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`; };
      fe += `<path d="${wire(TOP)} ${wire(BOT - 60)}" stroke="#6B7686" stroke-width="5"/>`;
      fe += `<path d="${wire(TOP - 100, -90)} ${wire(TOP - 112, 0)} ${wire(TOP - 100, 90)}" stroke="#6B7686" stroke-width="2" stroke-dasharray="9 7"/>`;
      sv += `<g stroke="#46505F" stroke-width="1.1" opacity=".55">${mesh}</g>${fe}`;
      // AgilFence cable along the mesh, with sensor beads (lit gently: the fence is on watch)
      sv += `<path id="ncable" d="${wire(MID)}" stroke="#7FB2FF" stroke-width="3" opacity=".55"/>`;
      s.beads = [];
      for (let k = 0; k < 90; k++) { const z = Math.pow(1.055, k) + k * 0.08; if (z > zF) break; const [x, y] = pj(X0, MID, z); s.beads.push({ x, y, z, k }); }
      sv += '<g id="nbeads">' + s.beads.map(b => `<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${Math.max(1, 7 / b.z).toFixed(2)}" fill="#55D6E6"/>`).join('') + '</g>';
      // wind streaks
      s.wind = Array.from({ length: 46 }, () => ({ y: 300 + R() * 640, x0: R() * 2400 - 300, sp: 140 + R() * 220, len: 40 + R() * 120, o: 0.05 + R() * 0.12, ph: R() * 6 }));
      sv += '<g id="nwind">' + s.wind.map(w => `<line y1="${w.y.toFixed(1)}" y2="${(w.y - 4).toFixed(1)}" stroke="#C6D4F0" stroke-width="1.2" opacity="${w.o.toFixed(2)}"/>`).join('') + '</g>';
      sv += '<circle id="nbeacon" cx="1537" cy="432" r="5" fill="#FF3B3B"/><circle id="nbeacon2" cx="1537" cy="432" r="16" fill="#FF3B3B" opacity=".3" filter="url(#nbl)"/>';
      s.world = E.add(el, '<div class="abs" style="left:0;top:0;width:1920px;height:1080px;transform-origin:1290px 520px"></div>');
      s.svg = E.add(s.world, `<svg class="abs" width="1920" height="1080" viewBox="0 0 1920 1080" style="left:0;top:0">${sv}</svg>`);
      s.beadEls = Array.from(s.svg.querySelectorAll('#nbeads circle'));
      s.windEls = Array.from(s.svg.querySelectorAll('#nwind line'));
      s.b1 = s.svg.querySelector('#nbeacon'); s.b2 = s.svg.querySelector('#nbeacon2');
      // opening slate: what this is, and who it is for
      s.slate = E.add(el, `<div class="abs" style="inset:0;background:#03050A;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center">
        <div style="font-family:var(--head);font-weight:800;font-size:46px;color:#fff;letter-spacing:-.01em">AgilFence <span style="color:var(--muted);font-weight:500">×</span> AGIL Secure V11</div>
        <div style="font-size:24px;color:#C9D3E6">Shows AGIL Secure V11 with proposed AgilFence workflow features (concept)</div>
        <div class="label" style="margin-top:18px;font-size:15px;color:#8F9CB8">Illustrative scenario · simulated data</div>
        <div class="label" style="font-size:15px;color:#8F9CB8">Restricted: for CAG security and airside operations stakeholders</div></div>`);
      s.shade = E.add(el, '<div class="abs" style="inset:0;background:radial-gradient(1200px 700px at 50% 55%, rgba(3,5,10,.25), rgba(3,5,10,.85));opacity:0"></div>');
      // f01 type
      s.tb = E.add(el, '<div class="abs" style="left:0;top:560px;width:1300px;height:520px;background:radial-gradient(760px 340px at 22% 70%, rgba(3,5,10,.86), rgba(3,5,10,0))"></div>');
      s.t1 = E.add(el, `<div class="abs" style="left:120px;top:742px;width:900px">
        <div class="kicker">02:14 · North perimeter</div>
        <div class="h-xl" style="margin-top:18px;font-size:96px"><span class="ln">Quiet.</span></div>
        <div class="lead" style="margin-top:14px;font-size:27px;color:#C9D3E6"><span class="sub">Fence Sector 5 · runway 02L beyond</span></div></div>`);
      s.k1 = E.q(s.t1, '.kicker'); s.h1 = E.q(s.t1, '.ln'); s.u1 = E.q(s.t1, '.sub');
      // f02: the question, over two live traces
      s.q = E.add(el, `<div class="abs" style="left:0;top:0;width:1920px;height:1080px">
        <div class="abs" style="left:240px;top:250px;width:1440px;height:560px">
          <svg class="abs" width="1440" height="560" style="left:0;top:0"><line x1="0" y1="160" x2="1440" y2="160" stroke="rgba(255,255,255,.1)"/><line x1="0" y1="420" x2="1440" y2="420" stroke="rgba(255,255,255,.1)"/>
            <line x1="0" y1="96" x2="1440" y2="96" stroke="rgba(255,255,255,.18)" stroke-dasharray="6 8"/><line x1="0" y1="356" x2="1440" y2="356" stroke="rgba(255,255,255,.18)" stroke-dasharray="6 8"/>
            <path class="tw" stroke="#9AA6BA" stroke-width="3" fill="none" stroke-linejoin="round"/><path class="tp" stroke="#E3B341" stroke-width="3" fill="none" stroke-linejoin="round"/></svg>
          <div class="abs label" style="left:0;top:66px">Threshold</div>
          <div class="abs qa h-l" style="left:0;top:190px;font-size:64px;color:#C9D3E6">Is it the wind?</div>
          <div class="abs qb h-l" style="left:0;top:450px;font-size:64px">Or someone at the fence?</div>
        </div></div>`);
      s.tw = E.q(s.q, '.tw'); s.tp = E.q(s.q, '.tp'); s.qa = E.q(s.q, '.qa'); s.qb = E.q(s.q, '.qb'); s.ql = E.q(s.q, '.label');
      E.cue(2.9, 'swell', 0.22, { dur: 3.0 });
      E.cue(at('v02', 'wind') - 0.1, 'blip', 0.35);
      E.cue(at('v02', 'someone') - 0.1, 'pop', 0.4);
    },
    update(t, lt, s) {
      const f2 = S('f02').start;
      // slow dolly toward the vanishing point
      const k = E.ep(t, 0, S('f02').end, 'sine');
      E.css(s.world, { transform: `scale(${E.f3(1 + 0.09 * k)}) translate3d(${E.f3(-30 * k)}px,0,0)` });
      E.vis(s.slate, 1 - E.ep(t, 2.7, 3.5, 'sine'));
      // beads breathe; a soft pulse runs down the cable (the fence on watch)
      const head = ((t * 9) % 70);
      s.beadEls.forEach((e, i) => { const d = Math.abs(i - head); E.attr(e, 'opacity', E.f3(0.35 + 0.65 * Math.max(0, 1 - d / 4))); });
      // wind
      s.windEls.forEach((e, i) => {
        const w = s.wind[i], x = ((w.x0 + t * w.sp) % 2300) - 200;
        E.attr(e, 'x1', x.toFixed(1)); E.attr(e, 'x2', (x + w.len).toFixed(1));
      });
      const bk = (Math.floor(t * 1.1) % 2) ? 0.15 : 1;
      E.attr(s.b1, 'opacity', E.f3(bk)); E.attr(s.b2, 'opacity', E.f3(bk * 0.4));
      // f01 type
      const t0 = L('v01').start, out1 = 1 - E.ep(t, f2 - 0.3, f2 + 0.2, 'in');
      E.vis(s.tb, E.ep(t, 3.4, 4.0) * out1);
      E.fade(s.k1, E.ep(t, 3.6, 4.1) * out1, { dy: 10 });
      E.revealWords(s.h1, t, at('v01', 'quiet') - 0.25, { per: 0.07 });
      E.vis(s.h1, out1);
      E.fade(s.u1, E.ep(t, E.C('v01', 1).start, E.C('v01', 1).start + 0.6) * out1, { dy: 12 });
      // f02: dim the world, draw the traces, ask
      E.vis(s.shade, E.ep(t, f2 - 0.2, f2 + 0.8));
      const kq = E.ep(t, f2 + 0.1, f2 + 0.7);
      E.vis(s.q, kq * (1 - E.ep(t, S('f02').end - 0.5, S('f02').end, 'in')));
      const tr = (y0, amp, seed, spike) => {
        let d = '';
        for (let i = 0; i <= 160; i++) {
          const x = i * 9, ph = t * 3.2 + i * 0.32 + seed;
          let y = y0 + Math.sin(ph) * amp + Math.sin(ph * 2.3 + 1) * amp * 0.45 + Math.sin(ph * 5.1) * amp * 0.2;
          if (spike) { const c = 1440 * spike.at, dd = (x - c) / 22; y += Math.exp(-dd * dd) * Math.sin(x * 0.2) * spike.a; }
          d += (i ? ' L' : 'M') + x + ' ' + y.toFixed(1);
        }
        return d;
      };
      const tq = at('v02', 'someone');
      E.attr(s.tw, 'd', tr(160, 9 + 5 * Math.sin(t * 0.8), 0, null));
      E.attr(s.tp, 'd', tr(420, 6, 2.2, { at: 0.72, a: 112 * E.ep(t, tq - 0.2, tq + 0.4) }));
      E.attr(s.tp, 'opacity', E.f3(E.ep(t, tq - 0.4, tq + 0.1)));
      E.fade(s.qa, E.ep(t, at('v02', 'Is') - 0.2, at('v02', 'Is') + 0.3), { dy: 14 });
      E.fade(s.qb, E.ep(t, tq - 0.3, tq + 0.2), { dy: 14 });
      E.vis(s.ql, kq);
    },
  });
})();
