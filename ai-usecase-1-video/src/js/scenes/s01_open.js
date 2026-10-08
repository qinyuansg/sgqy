/* s01 · Cold open — an airport draws itself; thousands of devices report to one control room. */
E.scene({
  id: 's01', inDur: 0, outDur: 0.5,
  build(el, s) {
    const rnd = E.rng(7);
    const HUB = [960, 600];
    s.hub = HUB;
    const fence = [[210, 150], [1710, 150], [1760, 250], [1760, 700], [1690, 760], [230, 760], [160, 690], [160, 230], [210, 150]];
    // ---- devices ----
    const dev = []; // {x,y,type}
    const push = (x, y, type) => dev.push({ x, y, type });
    for (let y = 372; y < 556; y += 22) for (const x of [760, 800, 940, 980, 1120, 1160]) push(x + (x % 40 === 0 ? -1 : 1) * 4, y + (rnd() * 6 - 3), 'cam');
    for (let x = 712; x < 1212; x += 26) { push(x, 556, 'cam'); push(x + 9, 644, 'door'); }
    for (let y = 380; y < 556; y += 34) for (const x of [764, 976, 1124]) push(x + (x === 976 ? 0 : 0), y + 11, 'door');
    for (let i = 0; i < 70; i++) push(560 + rnd() * 800, 300 + rnd() * 230, 'cam');
    for (let x = 320; x < 1610; x += 110) { push(x, 182, 'cam'); push(x + 40, 236, 'cam'); }
    for (let k = 0; k < fence.length - 1; k++) {
      const [ax, ay] = fence[k], [bx, by] = fence[k + 1];
      const len = Math.hypot(bx - ax, by - ay), n = Math.floor(len / 26);
      for (let i = 0; i < n; i++) push(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, i % 3 === 0 ? 'cam' : 'sens');
    }
    for (let i = 0; i < 26; i++) push(540 + rnd() * 160, 660 + rnd() * 70, 'cam');
    for (let i = 0; i < 26; i++) push(1220 + rnd() * 160, 660 + rnd() * 70, 'cam');
    dev.forEach(d => { d.r = Math.hypot(d.x - HUB[0], d.y - HUB[1]); d.j = rnd(); });
    const maxR = Math.max(...dev.map(d => d.r));
    s.dev = dev;

    // ---- streams to the hub ----
    const pick = dev.filter((d, i) => i % 9 === 0).slice(0, 44);
    s.streams = pick.map((d, i) => {
      const mx = (d.x + HUB[0]) / 2, my = Math.min(d.y, HUB[1]) - 60 - rnd() * 80;
      return { p0: [d.x, d.y], p1: [mx, my], p2: HUB, ph: rnd(), sp: 0.7 + rnd() * 0.5 };
    });

    const plane = (x, y, rot) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(1.1)" d="M0 -14 L2.2 -4 L13 2 L13 4.5 L2.2 1.5 L1.6 9 L5 11.5 L5 13 L0 11.8 L-5 13 L-5 11.5 L-1.6 9 L-2.2 1.5 L-13 4.5 L-13 2 L-2.2 -4 Z" fill="rgba(143,161,192,.22)"/>`;
    const planes = [[720, 400, 90], [840, 450, -90], [720, 500, 90], [900, 380, 90], [1020, 420, -90], [900, 500, 90], [1080, 400, 90], [1200, 460, -90], [1080, 520, 90], [1200, 380, -90]]
      .map(p => plane(...p)).join('');

    el.innerHTML = `
      <svg class="abs map" viewBox="0 0 1920 1080" width="1920" height="1080" style="left:0;top:0">
        <defs>
          <radialGradient id="hubg"><stop offset="0" stop-color="#7FB0FF" stop-opacity=".9"/><stop offset="1" stop-color="#2D5BFF" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="cam">
          <g class="draw" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect class="d d0" x="300" y="190" width="1320" height="36" rx="3" stroke="rgba(143,161,192,.42)" stroke-width="1.5" pathLength="1"/>
            <line class="d d1" x1="320" y1="208" x2="1600" y2="208" stroke="rgba(220,230,250,.35)" stroke-width="2" stroke-dasharray="14 18"/>
            <path class="d d2" d="M330 264 H1590 M420 264 V226 M760 264 V226 M1160 264 V226 M1500 264 V226 M960 264 V330" stroke="rgba(143,161,192,.30)" stroke-width="1.5" pathLength="1"/>
            <rect class="d d3" x="700" y="560" width="520" height="80" rx="18" stroke="rgba(143,161,192,.62)" stroke-width="1.8" fill="rgba(77,141,255,.05)" pathLength="1"/>
            <rect class="d d4" x="764" y="350" width="32" height="210" rx="10" stroke="rgba(143,161,192,.55)" stroke-width="1.6" fill="rgba(77,141,255,.04)" pathLength="1"/>
            <rect class="d d5" x="944" y="330" width="32" height="230" rx="10" stroke="rgba(143,161,192,.55)" stroke-width="1.6" fill="rgba(77,141,255,.04)" pathLength="1"/>
            <rect class="d d6" x="1124" y="350" width="32" height="210" rx="10" stroke="rgba(143,161,192,.55)" stroke-width="1.6" fill="rgba(77,141,255,.04)" pathLength="1"/>
            <path class="d d7" d="M520 712 Q960 770 1400 712" stroke="rgba(143,161,192,.28)" stroke-width="10" pathLength="1"/>
            <path class="d d8" d="M550 664 h130 v56 h-130z M1240 664 h130 v56 h-130z" stroke="rgba(143,161,192,.25)" stroke-width="1.2" pathLength="1"/>
          </g>
          <g class="planes">${planes}</g>
          <g class="fence" fill="none" stroke="rgba(143,161,192,.5)" stroke-width="1.6" stroke-dasharray="7 6">
            ${fence.slice(0, -1).map((p, i) => `<line class="fs" x1="${p[0]}" y1="${p[1]}" x2="${fence[i + 1][0]}" y2="${fence[i + 1][1]}"/>`).join('')}
          </g>
          <g class="labels" font-family="Mono, monospace" font-size="13" fill="#7486A8" letter-spacing="2" stroke="#07112A" stroke-width="5" paint-order="stroke" stroke-linejoin="round">
            <text x="300" y="178">RUNWAY 02L / 20R</text>
            <text x="806" y="346">PIER A</text><text x="986" y="326">PIER B</text><text x="1166" y="346">PIER C</text>
            <text x="1716" y="132" text-anchor="end">PERIMETER · 46 SECTORS</text>
          </g>
          <g class="streams" fill="none" stroke="rgba(77,141,255,.22)" stroke-width="1">
            ${s.streams.map(st => `<path d="M${st.p0[0]} ${st.p0[1]} Q${st.p1[0]} ${st.p1[1]} ${st.p2[0]} ${st.p2[1]}"/>`).join('')}
          </g>
          <g class="devs">
            ${dev.map(d => d.type === 'door'
              ? `<rect x="${d.x - 2.2}" y="${d.y - 2.2}" width="4.4" height="4.4" fill="#E6ECF7"/>`
              : d.type === 'sens'
                ? `<circle cx="${d.x}" cy="${d.y}" r="2" fill="#34C7C9"/>`
                : `<circle cx="${d.x}" cy="${d.y}" r="2.6" fill="#4D8DFF"/>`).join('')}
          </g>
          <g class="pulses" fill="#BFD5FF">${s.streams.map(() => '<circle r="2.6"/>').join('')}</g>
          <circle class="hubGlow" cx="${HUB[0]}" cy="${HUB[1]}" r="70" fill="url(#hubg)"/>
          <circle class="hubRing" cx="${HUB[0]}" cy="${HUB[1]}" r="16" fill="none" stroke="#8FB4FF" stroke-width="1.5"/>
          <circle class="hub" cx="${HUB[0]}" cy="${HUB[1]}" r="7" fill="#EEF3FC"/>
          <text class="hubLabel" x="${HUB[0]}" y="${HUB[1] + 34}" text-anchor="middle" font-family="Mono, monospace" font-size="12" fill="#A9C4FF" letter-spacing="2.5">CONTROL ROOM</text>
        </g>
      </svg>
      <div class="abs scrim" style="left:0;right:0;bottom:0;height:360px;background:linear-gradient(180deg,rgba(4,9,20,0),rgba(4,9,20,.85) 60%)"></div>
      <div class="abs copy" style="left:120px;top:792px;width:1400px">
        <div class="h-l t1">An airport never sleeps.</div>
        <div class="lead t2" style="margin-top:14px">Thousands of cameras, doors and sensors. <span style="color:#EEF3FC">One control room.</span></div>
      </div>
      <div class="abs legend" style="right:120px;top:818px;display:flex;gap:26px" >
        <span class="label" style="display:flex;align-items:center;gap:8px"><i style="width:8px;height:8px;border-radius:50%;background:#4D8DFF;display:inline-block"></i>Cameras</span>
        <span class="label" style="display:flex;align-items:center;gap:8px"><i style="width:7px;height:7px;background:#E6ECF7;display:inline-block"></i>Doors</span>
        <span class="label" style="display:flex;align-items:center;gap:8px"><i style="width:7px;height:7px;border-radius:50%;background:#34C7C9;display:inline-block"></i>Perimeter sensors</span>
      </div>`;
    s.map = E.q(el, '.map .cam');
    s.draw = E.qa(el, '.draw .d');
    s.fs = E.qa(el, '.fence .fs');
    s.devEls = Array.from(E.q(el, '.devs').children);
    s.pulseEls = Array.from(E.q(el, '.pulses').children);
    s.streamG = E.q(el, '.streams');
    s.planes = E.q(el, '.planes');
    s.labels = E.q(el, '.labels');
    s.hubGlow = E.q(el, '.hubGlow'); s.hubRing = E.q(el, '.hubRing'); s.hubDot = E.q(el, '.hub'); s.hubLabel = E.q(el, '.hubLabel');
    s.t1 = E.q(el, '.t1'); s.t2 = E.q(el, '.t2'); s.copy = E.q(el, '.copy'); s.legend = E.q(el, '.legend'); s.scrim = E.q(el, '.scrim');
    s.maxR = maxR;
    E.cue(0.3, 'ping', 0.55);
    E.cue(1.6, 'shimmer', 0.35, { dur: 3.4 });
    E.cue(E.L('v02').start - 0.2, 'swell', 0.4, { dur: 2.4 });
    E.cue(s.end - 0.75, 'whoosh', 0.7);
  },
  update(t, lt, s) {
    const v1 = E.L('v01'), v2 = E.L('v02');
    // camera: slow push, then dive into the hub at the cut
    const push = 1 + 0.05 * E.ep(t, 0, s.end, 'sine');
    const dive = E.ep(t, Math.max(E.L('v02').end + 0.05, s.end - 0.5), s.end + 0.05, 'in');
    const sc = push * (1 + 2.2 * dive);
    E.attr(s.map, 'transform', `translate(${s.hub[0]} ${s.hub[1]}) scale(${E.f3(sc)}) translate(${-s.hub[0]} ${-s.hub[1]})`);
    E.css(s.map, { opacity: E.f3(Math.max(0, 1 - dive * 1.6)) });

    // draw-on of airport geometry
    s.draw.forEach((d, i) => {
      const k = E.ep(t, 0.25 + i * 0.22, 1.35 + i * 0.22, 'inOut');
      if (d.getAttribute('pathLength')) { E.attr(d, 'stroke-dasharray', '1 1'); E.attr(d, 'stroke-dashoffset', E.f3(1 - k)); }
      E.attr(d, 'opacity', E.f3(Math.min(1, k * 3)));
    });
    s.fs.forEach((f, i) => E.attr(f, 'opacity', E.f3(E.ep(t, 1.2 + i * 0.16, 1.7 + i * 0.16))));
    E.attr(s.planes, 'opacity', E.f3(E.ep(t, 2.0, 3.2)));
    E.attr(s.labels, 'opacity', E.f3(E.ep(t, 2.2, 3.0)));

    // devices pop outward from the control room
    s.dev.forEach((d, i) => {
      const t0 = 1.7 + (d.r / s.maxR) * 2.6 + d.j * 0.25;
      const k = E.ep(t, t0, t0 + 0.35);
      E.attr(s.devEls[i], 'opacity', k <= 0 ? '0' : E.f3(k));
    });

    // data streams converge on the control room during v02
    const ks = E.ep(t, v2.start - 0.2, v2.start + 0.8);
    E.attr(s.streamG, 'opacity', E.f3(ks));
    s.streams.forEach((st, i) => {
      const u = ((t * st.sp * 0.55 + st.ph) % 1);
      const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      const x = a * st.p0[0] + b * st.p1[0] + c * st.p2[0], y = a * st.p0[1] + b * st.p1[1] + c * st.p2[1];
      const pe = s.pulseEls[i];
      E.attr(pe, 'cx', x.toFixed(1)); E.attr(pe, 'cy', y.toFixed(1));
      E.attr(pe, 'opacity', E.f3(ks * Math.sin(u * Math.PI)));
    });
    const hubK = E.ep(t, 0.2, 0.7);
    const beat = 0.5 + 0.5 * Math.sin(t * 5.2);
    E.attr(s.hubDot, 'opacity', E.f3(hubK));
    E.attr(s.hubRing, 'r', E.f3(16 + 5 * beat * ks));
    E.attr(s.hubRing, 'opacity', E.f3(hubK * (0.5 + 0.5 * ks)));
    E.attr(s.hubGlow, 'opacity', E.f3(hubK * (0.25 + 0.75 * ks) * (0.8 + 0.2 * beat)));
    E.attr(s.hubLabel, 'opacity', E.f3(E.ep(t, v2.start + 1.6, v2.start + 2.2)));

    // copy
    E.revealWords(s.t1, t, v1.start - 0.05, { per: 0.12, dur: 0.6 });
    E.fade(s.t2, E.ep(t, v2.start - 0.05, v2.start + 0.6), { dy: 14, blur: 6 });
    E.fade(s.legend, E.ep(t, 3.0, 3.8), { dy: 8 });
    E.vis(s.scrim, 1);
    // words leave before the dive
    const out = 1 - E.ep(t, s.end - 0.75, s.end - 0.25, 'in');
    E.css(s.copy, { opacity: E.f3(out) });
    E.css(s.legend, { opacity: E.f3(Math.min(E.ep(t, 3.0, 3.8), out)) });
  },
});
