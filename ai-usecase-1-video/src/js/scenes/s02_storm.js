/* s02 · Alarm storm — the past hour as a time-lapse (~1 alarm every 11 s, 312 in total);
   the real incidents look like everything else and sink into the noise. */
(function () {
  const TYPES = [
    ['DOOR HELD OPEN', 'ACS', () => `Staff Door D-${100 + Math.floor(R() * 260)}`],
    ['FENCE VIBRATION', 'PIDS', () => `Perimeter · Sector ${[3, 5, 11, 14, 18, 21][Math.floor(R() * 6)]}`],
    ['MOTION DETECTED', 'VA', () => `Apron Cam 4-${200 + Math.floor(R() * 60)}`],
    ['LINE CROSSING', 'VA', () => ['Pier B · Zone 2', 'Pier A · Zone 1', 'Baggage Hall · Z1'][Math.floor(R() * 3)]],
    ['CAMERA TAMPER', 'VMS', () => `Cam 2-0${10 + Math.floor(R() * 89)}`],
    ['VIDEO LOSS', 'VMS', () => `Cam 1-1${10 + Math.floor(R() * 89)}`],
    ['LOITERING', 'VA', () => ['Gate C4', 'Car Park P2', 'Arrival Hall', 'Gate A7'][Math.floor(R() * 4)]],
    ['DOOR FORCED', 'ACS', () => `Service Door S-0${10 + Math.floor(R() * 89)}`],
  ];
  let R = E.rng(31);
  const SEV = () => { const r = R(); return r < 0.46 ? 'HIGH' : r < 0.86 ? 'MED' : 'LOW'; };
  const hms = (h, m, s) => h * 3600 + m * 60 + s;

  // The 12 most recent alarms at 02:14 — shared with m1 so both scenes show the same queue.
  // [time, type, source, location, sev, reason-or-incident]
  const RECENT = [
    [hms(2, 14, 3), 'MOTION DETECTED', 'VA', 'Apron Cam 4-219', 'MED', 'rain'],
    [hms(2, 13, 58), 'DOOR HELD OPEN', 'ACS', 'Staff Door D-131', 'MED', 'cleaning roster'],
    [hms(2, 13, 52), 'TAILGATING', 'ACS+VA', 'Staff Door D-214', 'HIGH', 'crit'],
    [hms(2, 13, 41), 'LINE CROSSING', 'VA', 'Pier C · Zone 4', 'MED', 'cleaning roster'],
    [hms(2, 13, 31), 'DOOR HELD OPEN', 'ACS', 'Staff Door D-342', 'HIGH', 'cleaning roster'],
    [hms(2, 13, 20), 'FENCE VIBRATION', 'PIDS', 'Perimeter · Sector 7', 'HIGH', 'low'],
    [hms(2, 13, 9), 'MOTION DETECTED', 'VA', 'Apron Cam 4-231', 'LOW', 'rain'],
    [hms(2, 12, 58), 'FENCE VIBRATION', 'PIDS', 'Perimeter · Sector 12', 'MED', 'wind 32 km/h'],
    [hms(2, 12, 47), 'DOOR HELD OPEN', 'ACS', 'Staff Door D-207', 'MED', 'cleaning roster'],
    [hms(2, 12, 40), 'UNATTENDED OBJECT', 'VA', 'Gate B12', 'HIGH', 'high'],
    [hms(2, 12, 29), 'CAMERA TAMPER', 'VMS', 'Cam 2-087 · Pier B', 'MED', 'lens glare'],
    [hms(2, 12, 16), 'FENCE VIBRATION', 'PIDS', 'Perimeter · Sector 9', 'HIGH', 'wind 32 km/h'],
  ];

  window.ALARMQ = {
    rowH: 50,
    RECENT,
    rowHTML(r) {
      const sevCls = r.sev === 'HIGH' ? 'high' : 'low';
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
      const T0 = s.start, v3 = E.L('v03'), v5 = E.L('v05');
      const tDoor = E.at('v04', 'door'), tWind = E.at('v04', 'wind'), tGlare = E.at('v04', 'glare'), tReal = E.at('v05', 'real');
      const rows = [];
      const mk = (T, clock, o = {}) => {
        const ty = TYPES[Math.floor(R() * TYPES.length)];
        rows.push({ T, clock, type: ty[0], src: ty[1], loc: ty[2](), sev: SEV(), ...o });
      };
      // 13 older rows already on screen (01:59–02:02)
      for (let i = 13; i > 0; i--) mk(T0 - i * 0.9, hms(2, 2, 20) - i * 11.4);
      // the flood: accelerating arrivals, clock spaced evenly up to the door example (02:11:58)
      const floodEnd = tDoor - 0.75, clockA = hms(2, 2, 31), clockB = hms(2, 11, 47);
      const Ts = [];
      for (let T = T0 + 0.5; T < floodEnd;) { Ts.push(T); T += 1 / (1.8 + 11 * E.ease.inOut(E.p(T, T0 + 0.5, v3.end))); }
      Ts.forEach((T, i) => mk(T, clockA + (clockB - clockA) * i / Math.max(1, Ts.length - 1)));
      // the named examples and the recent queue, in clock order, pinned to the narration
      const add = (T, rr, extra = {}) => rows.push({ T, clock: rr[0], type: rr[1], src: rr[2], loc: rr[3], sev: rr[4], ...extra });
      add(tDoor - 0.55, [hms(2, 11, 58), 'DOOR HELD OPEN', 'ACS', 'Staff Door D-118', 'HIGH'], { tag: 'cleaning roster', tagT: tDoor });
      add((tDoor + tWind) / 2 - 0.4, [hms(2, 12, 7), 'MOTION DETECTED', 'VA', 'Apron Cam 4-226', 'LOW']);
      const rec = RECENT.slice().reverse(); // oldest first
      add(tWind - 0.55, rec[0], { tag: 'wind 32 km/h', tagT: tWind });
      add(tGlare - 0.5, rec[1], { tag: 'lens glare', tagT: tGlare });
      const tail = [-0.85, -0.7, -0.58, -0.46, -0.34, -0.22, -0.1, 0.05, 0.35, 0.6];
      rec.slice(2).forEach((r, i) => add(tReal + tail[i], r, r[5] === 'high' ? { real: 'high' } : r[5] === 'crit' ? { real: 'crit' } : {}));
      rows.sort((a, b) => a.T - b.T);
      rows.forEach(r => (r.time = E.clock(r.clock)));
      s.rows = rows;
      s.tBuried = E.at('v05', 'buried');
      s.tLapseEnd = floodEnd;

      el.innerHTML = `
        <div class="abs left" style="left:120px;top:190px;width:520px">
          <div class="label">Terminal 2 · Security control room</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:18px">
            <div class="mono clk" style="font-size:44px;font-weight:500;color:#EEF3FC;letter-spacing:.02em">02:00:00</div>
            <span class="chip lapse" style="height:30px;font-size:12px;letter-spacing:.12em">${C.icon('play', 14)} TIME-LAPSE</span>
          </div>
          <div class="big tnum" style="font-family:var(--head);font-weight:800;font-size:220px;line-height:.9;letter-spacing:-.05em;margin-top:56px;color:#EEF3FC">0</div>
          <div class="lead" style="margin-top:18px">alarms in the past hour</div>
          <div class="q h-m" style="margin-top:64px;color:#8FB4FF">Which ones are real?</div>
        </div>
        <div class="abs panel con" style="left:700px;top:150px;width:1100px;height:740px;overflow:hidden">
          <div style="height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:14px">
              <span style="font-family:var(--head);font-weight:700;font-size:21px">AGIL<sup style="font-size:14px">®</sup> Secure ISMS</span>
              <span style="color:#6F80A0;font-size:18px">·</span><span style="color:#A9B7CF;font-size:18px">Alarm queue · all subsystems</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="pill crit live" style="font-size:13px">● LIVE</span>
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
        if (r.tag) r.tagEl.innerHTML = `${C.icon('eye', 15)} ${r.tag}`;
        if (r.real) {
          const col = r.real === 'crit' ? '255,59,92' : '255,176,32';
          r.ring.style.boxShadow = `0 0 0 2px rgba(${col},.9), 0 0 24px rgba(${col},.45)`;
          r.ring.style.background = `linear-gradient(90deg, rgba(${col},.16), rgba(${col},0) 70%)`;
        }
      });
      s.clk = E.q(el, '.clk'); s.big = E.q(el, '.big'); s.q = E.q(el, '.q'); s.lapse = E.q(el, '.lapse');
      s.left = E.q(el, '.left'); s.con = E.q(el, '.con'); s.live = E.q(el, '.live');
      s.tCaught = rows[rows.length - 1].T + 0.2;
      s.v3 = v3; s.v5 = v5;
      rows.forEach(r => { if (r.T >= s.start) E.cue(r.T, r.real ? 'alert' : 'tick', r.real ? 0.7 : 0.18 + 0.1 * E.p(r.T, s.start, s.end)); if (r.tag) E.cue(r.tagT, 'blip', 0.35); });
      E.cue(v5.end - 0.2, 'boom', 0.55);
    },
    update(t, lt, s) {
      const H = ALARMQ.rowH, rows = s.rows;
      // each arrival slides in from above and pushes the stack down one slot
      let acc = 0, last = -1;
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const sh = E.ep(t, r.T, r.T + 0.2, 'out');
        if (t < r.T) { E.css(r.el, { visibility: 'hidden' }); continue; }
        if (last < 0) last = i;
        const y = acc * H - (1 - sh) * H;
        acc += sh;
        E.css(r.el, { visibility: y > 700 ? 'hidden' : 'visible', transform: `translate3d(0,${y.toFixed(2)}px,0)`, opacity: E.f3(Math.min(1, sh * 1.4)) });
        E.css(r.flash, { opacity: E.f3(0.9 * (1 - E.p(t, r.T, r.T + 0.7))) });
        if (r.tag) E.fade(r.tagEl, E.ep(t, r.tagT - 0.05, r.tagT + 0.3), { dx: 10, dy: 0 });
        if (r.real) {
          const on = E.ep(t, r.T + 0.1, r.T + 0.4);
          const sink = E.ep(t, s.tBuried - 0.1, s.tBuried + 0.8, 'inOut'); // highlight fades: indistinguishable again
          E.css(r.ring, { opacity: E.f3(on * (1 - 0.9 * sink)) });
        }
      }
      // time-lapse clock: interpolates between the newest and next alarm; real time after the last one
      let clock;
      const nxt = rows.find(r => r.T > t);
      const cur = last >= 0 ? rows[last] : null;
      if (cur && nxt) clock = cur.clock + (nxt.clock - cur.clock) * E.p(t, cur.T, nxt.T);
      else if (cur) clock = cur.clock + (t - cur.T);
      else clock = rows[0].clock;
      E.txt(s.clk, E.clock(clock));
      E.fade(s.lapse, Math.min(E.ep(t, s.start + 0.3, s.start + 0.7), 1 - E.ep(t, s.tCaught - 0.2, s.tCaught + 0.2)), { dx: -6, dy: 0 });
      E.vis(s.live, E.ep(t, s.tCaught, s.tCaught + 0.3));
      // headline number counts up with the narration ("312 alarms in the past hour")
      E.txt(s.big, String(Math.round(312 * E.ep(t, s.v3.start + 0.2, s.v3.end - 0.3, 'out'))));
      E.fade(s.left, E.ep(t, s.start + 0.1, s.start + 0.8), { dy: 16 });
      E.fade(s.con, E.ep(t, s.start, s.start + 0.7), { dy: 0, s: 0.97 });
      E.css(s.q, { opacity: E.f3(E.ep(t, s.v5.start + 0.1, s.v5.start + 0.7) * (0.8 + 0.2 * Math.sin(t * 4))), visibility: t > s.v5.start ? 'visible' : 'hidden' });
    },
  });
})();
