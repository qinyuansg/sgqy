/* s02 · Alarm storm — 312 alarms an hour; the real ones look like the rest and sink. */
(function () {
  const TYPES = [
    ['DOOR HELD OPEN', 'ACS', () => `Staff Door D-${100 + Math.floor(R() * 260)}`],
    ['FENCE VIBRATION', 'PIDS', () => `Perimeter · Sector ${[3, 5, 9, 12, 14, 21][Math.floor(R() * 6)]}`],
    ['MOTION DETECTED', 'VA', () => `Apron Cam 4-${200 + Math.floor(R() * 60)}`],
    ['LINE CROSSING', 'VA', () => ['Pier B · Zone 2', 'Pier C · Zone 4', 'Baggage Hall · Z1'][Math.floor(R() * 3)]],
    ['CAMERA TAMPER', 'VMS', () => `Cam 2-0${10 + Math.floor(R() * 89)}`],
    ['VIDEO LOSS', 'VMS', () => `Cam 1-1${10 + Math.floor(R() * 89)}`],
    ['LOITERING', 'VA', () => ['Gate C4', 'Car Park P2', 'Arrival Hall', 'Gate A7'][Math.floor(R() * 4)]],
    ['INVALID BADGE', 'ACS', () => `Staff Door D-3${10 + Math.floor(R() * 89)}`],
    ['DOOR FORCED', 'ACS', () => `Service Door S-0${10 + Math.floor(R() * 89)}`],
  ];
  let R = E.rng(31);
  const SEV = () => { const r = R(); return r < 0.46 ? 'HIGH' : r < 0.86 ? 'MED' : 'LOW'; };

  // shared generator so m1 can reuse the same queue look
  window.ALARMQ = {
    rowH: 50,
    rowHTML(r) {
      const sevCls = r.sev === 'HIGH' ? 'high' : r.sev === 'MED' ? 'low' : 'low';
      return `<div class="aq-row" style="position:absolute;left:0;right:0;height:50px;display:grid;grid-template-columns:118px 92px 1fr 300px 84px;align-items:center;padding:0 22px;border-bottom:1px solid rgba(143,161,192,.09)">
        <span class="mono" style="font-size:15px;color:#7C8BA8">${r.time}</span>
        <span><span class="pill ${sevCls}" style="font-size:12px;padding:3px 9px">${r.sev}</span></span>
        <span style="font-weight:600;font-size:17px;letter-spacing:.01em;color:#E3EAF7;white-space:nowrap">${r.type}</span>
        <span style="font-size:16px;color:#A9B7CF;white-space:nowrap;overflow:hidden">${r.loc}</span>
        <span class="mono" style="font-size:12px;color:#8FA6CC;border:1px solid rgba(143,161,192,.25);border-radius:6px;padding:3px 7px;justify-self:start">${r.src}</span>
        <span class="aq-tag chip" style="position:absolute;left:452px;top:9px;height:31px;visibility:hidden;background:rgba(10,18,36,.92);color:#C9D5EA;border-color:rgba(143,161,192,.4)"></span>
        <span class="aq-flash" style="position:absolute;inset:0;background:rgba(77,141,255,.22);opacity:0"></span>
        <span class="aq-ring" style="position:absolute;inset:2px 6px;border-radius:10px;opacity:0"></span>
      </div>`;
    },
  };

  E.scene({
    id: 's02',
    build(el, s) {
      R = E.rng(31);
      const T0 = s.start, v3 = E.L('v03'), v4 = E.L('v04'), v5 = E.L('v05');
      const tDoor = E.at('v04', 'door'), tWind = E.at('v04', 'wind'), tGlare = E.at('v04', 'glare'), tReal = E.at('v05', 'real');
      // arrival schedule (accelerating); 13 older rows already on screen
      const rows = [];
      const clock0 = 2 * 3600 + 13 * 60 + 40; // 02:13:40 at scene start
      const mk = (T, o = {}) => {
        const ty = TYPES[Math.floor(R() * TYPES.length)];
        const r = { T, type: ty[0], src: ty[1], loc: ty[2](), sev: SEV(), ...o };
        r.time = E.clock(clock0 + Math.max(-40, (T - T0)) + 0).slice(0, 8);
        rows.push(r);
      };
      for (let i = 13; i > 0; i--) mk(T0 - i * 0.9);
      const special = [
        { T: tDoor - 0.55, type: 'DOOR HELD OPEN', src: 'ACS', loc: 'Staff Door D-118', sev: 'HIGH', tag: 'cleaning crew', tagT: tDoor },
        { T: tWind - 0.55, type: 'FENCE VIBRATION', src: 'PIDS', loc: 'Perimeter · Sector 7', sev: 'HIGH', tag: 'wind 32 km/h', tagT: tWind },
        { T: tGlare - 0.5, type: 'CAMERA TAMPER', src: 'VMS', loc: 'Cam 2-087 · Pier B', sev: 'MED', tag: 'lens glare', tagT: tGlare },
        { T: tReal - 0.75, type: 'UNATTENDED OBJECT', src: 'VA', loc: 'Gate B12', sev: 'HIGH', real: 'high' },
        { T: tReal - 0.35, type: 'TAILGATING', src: 'ACS+VA', loc: 'Staff Door D-214', sev: 'HIGH', real: 'crit' },
      ];
      let T = T0 + 0.4;
      while (T < s.end + 0.2) {
        const rate = 1.6 + 6.5 * E.ease.inOut(E.p(T, T0 + 0.5, v5.end));
        // keep clear space around specials so they stay readable
        const near = special.find(sp => Math.abs(sp.T - T) < 0.22);
        if (!near) mk(T);
        T += 1 / rate;
      }
      special.forEach(sp => mk(sp.T, sp));
      rows.sort((a, b) => a.T - b.T);
      rows.forEach(r => (r.time = E.clock(clock0 + (r.T - T0) * 1.0)));
      s.rows = rows;

      el.innerHTML = `
        <div class="abs left" style="left:120px;top:190px;width:520px">
          <div class="label">Terminal 2 · Security control room</div>
          <div class="mono clk" style="font-size:44px;font-weight:500;color:#EEF3FC;margin-top:18px;letter-spacing:.02em">02:13:40</div>
          <div class="big" style="font-family:var(--head);font-weight:800;font-size:220px;line-height:.9;letter-spacing:-.05em;margin-top:56px;color:#EEF3FC">238</div>
          <div class="lead" style="margin-top:18px">alarms in the past hour</div>
          <div class="q h-m" style="margin-top:64px;color:#8FB4FF">Which ones are real?</div>
        </div>
        <div class="abs panel con" style="left:700px;top:150px;width:1100px;height:740px;overflow:hidden">
          <div style="height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:14px">
              <span style="font-family:var(--head);font-weight:700;font-size:21px">AGIL<sup style="font-size:11px">®</sup> Secure ISMS</span>
              <span style="color:#6F80A0;font-size:18px">·</span><span style="color:#A9B7CF;font-size:18px">Alarm queue · all subsystems</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="pill crit newc" style="font-size:14px">● 0 NEW</span>
              <span style="color:#6F80A0">${C.icon('filter', 22)}</span>
            </div>
          </div>
          <div class="label" style="height:42px;display:grid;grid-template-columns:118px 92px 1fr 300px 84px;align-items:center;padding:0 22px;border-bottom:1px solid var(--line)">
            <span>Time</span><span>Sev</span><span>Alarm</span><span>Location</span><span>Source</span>
          </div>
          <div class="rows" style="position:absolute;left:0;right:0;top:110px;bottom:0;overflow:hidden"></div>
          <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(12,22,44,0),rgba(12,22,44,.95))"></div>
        </div>`;
      const box = E.q(el, '.rows');
      rows.forEach(r => {
        r.el = E.add(box, ALARMQ.rowHTML(r));
        r.tagEl = E.q(r.el, '.aq-tag'); r.flash = E.q(r.el, '.aq-flash'); r.ring = E.q(r.el, '.aq-ring');
        if (r.tag) { r.tagEl.innerHTML = `${C.icon('eye', 15)} ${r.tag}`; }
        if (r.real) {
          const col = r.real === 'crit' ? '255,59,92' : '255,176,32';
          r.ring.style.boxShadow = `0 0 0 2px rgba(${col},.9), 0 0 24px rgba(${col},.45)`;
          r.ring.style.background = `linear-gradient(90deg, rgba(${col},.16), rgba(${col},0) 70%)`;
        }
      });
      s.clk = E.q(el, '.clk'); s.big = E.q(el, '.big'); s.q = E.q(el, '.q'); s.newc = E.q(el, '.newc');
      s.left = E.q(el, '.left'); s.con = E.q(el, '.con');
      s.v3 = v3; s.v5 = v5; s.clock0 = clock0;
      rows.forEach(r => { if (r.T >= s.start) E.cue(r.T, r.real ? 'alert' : 'tick', r.real ? 0.7 : 0.22 + 0.12 * E.p(r.T, s.start, s.end)); if (r.tag) E.cue(r.tagT, 'blip', 0.35); });
      E.cue(v5.end - 0.2, 'boom', 0.55);
    },
    update(t, lt, s) {
      const H = ALARMQ.rowH;
      const rows = s.rows;
      // slot shift: each later arrival pushes a row down by one slot
      let arrived = 0;
      const sh = rows.map(r => E.ep(t, r.T, r.T + 0.2, 'out'));
      let acc = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const y = acc * H;
        acc += sh[i];
        if (t < r.T) { E.css(r.el, { visibility: 'hidden' }); continue; }
        arrived++;
        const k = E.ep(t, r.T, r.T + 0.25);
        E.css(r.el, { visibility: y > 700 ? 'hidden' : 'visible', transform: `translate3d(${E.f3((1 - k) * -30)}px,${y.toFixed(2)}px,0)`, opacity: E.f3(k) });
        E.css(r.flash, { opacity: E.f3(0.9 * (1 - E.p(t, r.T, r.T + 0.7))) });
        if (r.tag) E.fade(r.tagEl, E.ep(t, r.tagT - 0.05, r.tagT + 0.3), { dx: 10, dy: 0 });
        if (r.real) {
          const on = E.ep(t, r.T + 0.1, r.T + 0.4);
          const sink = E.p(y, 260, 640); // fades as it is buried
          E.css(r.ring, { opacity: E.f3(on * (1 - 0.8 * sink)) });
        }
      }
      // left column
      E.txt(s.clk, E.clock(s.clock0 + lt));
      const c = Math.round(E.lerp(238, 312, E.ep(t, s.v3.start + 0.6, s.v3.end - 0.2, 'out')));
      E.txt(s.big, String(c));
      E.txt(s.newc, `● ${arrived - 13 > 0 ? arrived - 13 : 0} NEW`);
      E.fade(s.left, E.ep(t, s.start + 0.1, s.start + 0.8), { dy: 16 });
      E.fade(s.con, E.ep(t, s.start, s.start + 0.7), { dy: 0, s: 0.97 });
      E.fade(s.q, E.ep(t, s.v5.start + 0.1, s.v5.start + 0.7), { dy: 12, blur: 6 });
      E.css(s.q, { opacity: E.f3(E.ep(t, s.v5.start + 0.1, s.v5.start + 0.7) * (0.8 + 0.2 * Math.sin(t * 4))) });
    },
  });
})();
