/* f03–f04 · The fence is the sensor, then first touch. One fence bay in the V11 palette: the
   AgilFence cable with its FBG sensor beads, light pulses along the fibre, what it feels, what it
   ignores; then a climber (back view), the beads near the contact turn red, strain runs along the
   fibre, the trace spikes and segment 5-14 is pinpointed. */
(function () {
  'use strict';
  const L = E.L, at = E.at, S = E.S;
  const X = 150, Y = 250, WD = 1100, HT = 600;
  const TOP = Y + 70, BOT = Y + HT - 60, CY = TOP + (BOT - TOP) * 0.42, HOT = X + WD * 0.58;
  const POSTS = [X + 40, X + WD / 2, X + WD - 40];
  const CRIT = '#D72D30', TEAL = '#55D6E6', FIB = '#7FB2FF', AMB = '#E3B341', STEEL = '#8C96A6';

  function bay() {
    let s = `<defs><clipPath id="fbay"><rect x="${X + 40}" y="${TOP}" width="${WD - 80}" height="${BOT - TOP}"/></clipPath>
      <linearGradient id="fgnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A202A"/><stop offset="1" stop-color="#05070D" stop-opacity="0"/></linearGradient>
      <filter id="fglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
    s += `<rect x="${X - 60}" y="${BOT}" width="${WD + 120}" height="120" fill="url(#fgnd)"/>`;
    let m = '';
    for (let i = -24; i < WD / 26 + 24; i++) {
      const x0 = X + 40 + i * 26, d = (BOT - TOP) * 0.55;
      m += `<line x1="${x0}" y1="${TOP}" x2="${x0 + d}" y2="${BOT}"/><line x1="${x0 + d}" y1="${TOP}" x2="${x0}" y2="${BOT}"/>`;
    }
    s += `<g class="mesh" clip-path="url(#fbay)" stroke="#5C6675" stroke-width="1.4" opacity=".75">${m}</g>`;
    let fr = '';
    for (const px of POSTS) fr += `<rect x="${px - 7}" y="${TOP - 40}" width="14" height="${BOT - TOP + 40}" rx="3" fill="${STEEL}"/><path d="M${px} ${TOP - 40} L${px - 46} ${TOP - 86} M${px} ${TOP - 40} L${px + 46} ${TOP - 86}" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>`;
    fr += `<path d="M${X + 40} ${TOP} H${X + WD - 40} M${X + 40} ${BOT} H${X + WD - 40}" stroke="${STEEL}" stroke-width="6"/>`;
    for (const dy of [-56, -70, -84]) fr += `<path d="M${X + 20} ${TOP + dy} H${X + WD - 20}" stroke="${STEEL}" stroke-width="2" stroke-dasharray="7 6"/>`;
    s += fr;
    return s;
  }
  // climber, back view, hips at (0,0); arms reach the top rail
  function climber() {
    const c = '#2A2F38', e = '#9AA3B2';
    return `<g class="cl">
      <path d="M-14 0 L-30 46 L-18 78" stroke="${c}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M14 0 L20 70 L16 128" stroke="${c}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M-30 -118 L30 -118 L26 6 L-26 6Z" fill="#323844" stroke="${e}" stroke-opacity=".35" stroke-width="1.5"/>
      <rect x="-22" y="-104" width="44" height="62" rx="8" fill="#1E222A" stroke="${e}" stroke-opacity=".3"/>
      <g class="armL"><path d="M-26 -110 L-44 -168 L-40 -224" stroke="${c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="-40" cy="-226" r="9" fill="#1A1D22"/></g>
      <g class="armR"><path d="M26 -110 L46 -170 L44 -230" stroke="${c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="44" cy="-232" r="9" fill="#1A1D22"/></g>
      <circle cx="0" cy="-140" r="20" fill="#1A1C22"/><path d="M-21 -146 Q0 -170 21 -146 Z" fill="#121418"/></g>`;
  }

  E.scene({
    id: 'fence', start: S('f03').start, end: S('f04').end, inDur: 0.7, outDur: 0.5,
    build(el, s) {
      let sv = bay();
      // cable + beads + pulses + strain
      sv += `<path class="cab" d="M${X + 20} ${CY} H${X + WD - 20}" stroke="${FIB}" stroke-width="4" fill="none"/>`;
      s.nodes = [];
      for (let x = X + 34; x < X + WD - 20; x += 44) s.nodes.push({ x, hot: Math.abs(x - HOT) < 140 });
      sv += '<g class="halo">' + s.nodes.map(n => `<circle cx="${n.x}" cy="${CY}" r="18" fill="${CRIT}" opacity="0"/>`).join('') + '</g>';
      sv += '<g class="nodes">' + s.nodes.map(n => `<circle cx="${n.x}" cy="${CY}" r="5.5" fill="${TEAL}" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>`).join('') + '</g>';
      sv += `<g class="pulse"><circle r="14" fill="${FIB}" opacity=".55" filter="url(#fglow)"/><circle r="4.5" fill="#fff"/></g>`;
      sv += '<g class="waves"></g>';
      sv += `<g class="climb" transform="translate(${HOT} ${CY + 40})">${climber()}</g>`;
      // rain
      const R = E.rng(58);
      s.rain = Array.from({ length: 70 }, () => ({ x: X - 40 + R() * (WD + 80), y0: R() * 700, sp: 900 + R() * 500 }));
      sv += '<g class="rain" stroke="#9FB6D8" stroke-width="1.2" opacity="0">' + s.rain.map(() => '<line/>').join('') + '</g>';
      s.svg = E.add(el, `<svg class="abs" width="1920" height="1080" style="left:0;top:0">${sv}</svg>`);
      const q = sel => s.svg.querySelector(sel);
      s.mesh = q('.mesh'); s.cab = q('.cab'); s.pulse = q('.pulse'); s.climb = q('.climb'); s.armL = q('.armL'); s.armR = q('.armR');
      s.nodeEls = Array.from(q('.nodes').children); s.haloEls = Array.from(q('.halo').children);
      s.rainG = q('.rain'); s.rainEls = Array.from(s.rainG.children); s.wavesG = q('.waves');
      s.waveEls = Array.from({ length: 6 }, () => K.sadd(s.wavesG, `<path stroke="${CRIT}" stroke-width="2.5" fill="none"/>`));
      const len = WD - 40;
      E.attr(s.cab, 'stroke-dasharray', `${len} ${len}`); s.cabLen = len;
      // headlines
      s.h1 = E.add(el, '<div class="abs h-l" style="left:120px;top:120px;font-size:62px;white-space:nowrap">The fence is the sensor.</div>');
      s.h2 = E.add(el, '<div class="abs h-l" style="left:120px;top:120px;font-size:62px;white-space:nowrap">First touch.</div>');
      // FBG callout
      s.fbg = E.add(el, `<div class="abs" style="left:${X + 40 + 44 * 3 - 20}px;top:${CY - 150}px;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;background:rgba(8,12,24,.92);border:1.5px solid rgba(127,178,255,.7);white-space:nowrap">
        <span style="width:10px;height:10px;border-radius:50%;background:${TEAL};box-shadow:0 0 10px ${TEAL}"></span><span style="font-size:21px;font-weight:600;color:#fff">FBG sensors in one optical cable</span></div>`);
      s.fbgL = K.sadd(s.svg, `<line x1="${X + 40 + 44 * 3 + 10}" y1="${CY - 98}" x2="${X + 34 + 44 * 3}" y2="${CY - 8}" stroke="${FIB}" stroke-width="2"/>`);
      // right column: what it feels, what it ignores
      const RX = 1350, chip = (ic, a, b, col) => `<div class="abs" style="left:${RX}px;width:470px;display:flex;align-items:center;gap:18px">
          ${K.ibox(ic, 58, 26, `color:${col};border-color:${col}88`)}<div><div style="font-size:26px;font-weight:600;color:#fff;white-space:nowrap">${a}</div>${b ? `<div style="font-size:19px;color:var(--muted);margin-top:2px">${b}</div>` : ''}</div></div>`;
      s.lab1 = E.add(el, `<div class="abs label" style="left:${RX}px;top:300px;color:${AMB}">It feels</div>`);
      s.feel = [['hand', 'A climb'], ['fence', 'A cut'], ['pulse', 'A lift']].map(([ic, a], i) => { const e = E.add(el, chip(ic, a, '', AMB)); e.style.top = (334 + i * 78) + 'px'; return e; });
      s.lab2 = E.add(el, `<div class="abs label" style="left:${RX}px;top:600px">Built for an airfield</div>`);
      s.light = E.add(el, chip('signal', 'Senses with light', 'Immune to electromagnetic and radio interference', '#8FB4FF')); s.light.style.top = '634px';
      s.adapt = E.add(el, chip('pulse', 'Adapts to the weather', 'Wind · rain · jet blast: nuisance alarms kept low', '#8FB4FF')); s.adapt.style.top = '734px';
      // f04: trace inset, pin, segment strip, time code
      s.trace = E.add(el, `<div class="abs glass" style="left:${RX}px;top:300px;width:470px;height:330px;padding:22px 24px">
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:22px;font-weight:600;color:#fff">What the fence feels</span><span class="label">Illustrative</span></div>
        <svg width="422" height="230" style="margin-top:16px"><line x1="0" y1="64" x2="422" y2="64" stroke="rgba(255,255,255,.12)"/><line x1="0" y1="176" x2="422" y2="176" stroke="rgba(255,255,255,.12)"/>
          <path class="tw" stroke="#9AA6BA" stroke-width="2.5" fill="none"/><path class="tc" stroke="${CRIT}" stroke-width="2.5" fill="none"/>
          <text class="lw" x="0" y="22" fill="#A9B4C8" font-size="17" font-family="InterF">Seg 5-09 · wind 12 km/h · no alarm</text>
          <text class="lc" x="0" y="134" fill="#FF8E8F" font-size="17" font-weight="600" font-family="InterF">Seg 5-14 · strain above the wind · alarm</text></svg></div>`);
      s.tw = E.q(s.trace, '.tw'); s.tc = E.q(s.trace, '.tc'); s.lw = E.q(s.trace, '.lw'); s.lc = E.q(s.trace, '.lc');
      s.pin = E.add(el, `<div class="abs" style="left:${HOT - 200}px;top:180px;width:400px;display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:rgba(14,18,28,.95);border:2px solid ${CRIT};box-shadow:0 0 40px rgba(215,45,48,.35)">
        <span style="width:40px;height:40px;border-radius:50%;background:${CRIT};display:grid;place-items:center;color:#fff;flex:none">${K.icon('target', 24, 2)}</span>
        <div><div style="font-size:22px;font-weight:700;color:#fff;white-space:nowrap">Fence Sector 5 · Segment 5-14</div><div style="font-size:18px;color:#FF8E8F;margin-top:2px">Pinpointed to within a few metres</div></div></div>`);
      s.pinL = K.sadd(s.svg, `<line x1="${HOT}" y1="262" x2="${HOT}" y2="${CY - 10}" stroke="${CRIT}" stroke-width="2.5" stroke-dasharray="5 5"/>`);
      s.tc0 = E.add(el, `<div class="abs mono" style="left:${HOT + 220}px;top:196px;font-size:26px;font-weight:600;color:#FF8E8F">02:14:58</div>`);
      s.strip = E.add(el, `<div class="abs" style="left:${X + 40}px;top:870px;width:${WD - 80}px;display:flex;gap:8px">${[11, 12, 13, 14, 15, 16, 17].map(k =>
        `<div style="flex:1"><div class="sg" style="height:10px;border-radius:5px;background:#3A5A8C"></div><div class="mono" style="text-align:center;margin-top:10px;font-size:17px;color:${k === 14 ? '#fff' : 'var(--t3)'};font-weight:${k === 14 ? 600 : 400}">5-${k}</div></div>`).join('')}</div>`);
      s.seg = E.qa(s.strip, '.sg')[3];
      // timing
      s.tFbg = at('v03', 'Fibre') - 0.2;
      s.tFeel = [at('v03', 'climb'), at('v03', 'cut'), at('v03', 'lift')];
      s.tLight = at('v04', 'light') - 0.3; s.tAdapt = at('v04', 'wind') - 0.4;
      s.tClimb = at('v05', 'climbs') - 0.35; s.tContact = s.tClimb + 1.1;
      s.tReads = at('v05', 'strain') - 0.2; s.tPin = at('v05', 'pinpoints') - 0.2;
      E.cue(s.start + 0.3, 'whoosh', 0.35);
      E.cue(s.tFbg + 0.1, 'blip', 0.4);
      s.tFeel.forEach(tt => E.cue(tt - 0.05, 'pop', 0.38));
      E.cue(s.tLight, 'blip', 0.35); E.cue(s.tAdapt, 'blip', 0.35);
      E.cue(s.tClimb + 0.2, 'sweep', 0.18, { dur: 0.9 });
      E.cue(s.tContact, 'thud', 0.7); E.cue(s.tContact + 0.05, 'alertSoft', 0.4);
      E.cue(s.tPin + 0.1, 'stamp', 0.5); E.cue(s.tPin + 0.2, 'beep', 0.3);
    },
    update(t, lt, s) {
      const f4 = S('f04').start;
      // the cable draws in, then light pulses run along it
      const kc = E.ep(t, s.start + 0.4, s.start + 1.6, 'inOut');
      E.attr(s.cab, 'stroke-dashoffset', ((1 - kc) * s.cabLen).toFixed(1));
      const ph = ((t - s.start) * 0.45) % 1, px = X + 20 + ph * (WD - 40);
      s.pulse.setAttribute('transform', `translate(${px.toFixed(1)} ${CY})`);
      E.attr(s.pulse, 'opacity', E.f3(E.ep(t, s.start + 1.6, s.start + 2.0) * (1 - E.ep(t, s.tContact - 0.3, s.tContact))));
      // beads: pop in along the cable; brighten as the pulse passes; red near the contact
      const hot = E.ep(t, s.tContact, s.tContact + 0.35);
      s.nodeEls.forEach((e, i) => {
        const n = s.nodes[i], kin = E.ep(t, s.start + 0.6 + i * 0.04, s.start + 0.9 + i * 0.04, 'back');
        const near = Math.max(0, 1 - Math.abs(n.x - px) / 70) * E.ep(t, s.start + 1.6, s.start + 2.0);
        const red = n.hot ? hot : 0;
        E.attr(e, 'r', E.f3(5.5 * kin + (red ? 2 : 0) + near * 2));
        E.attr(e, 'fill', red > 0.5 ? '#D72D30' : '#55D6E6');
        E.attr(s.haloEls[i], 'opacity', E.f3(red * (0.22 + 0.12 * Math.sin(t * 6 + i))));
      });
      // strain waves running out from the contact point
      s.waveEls.forEach((w, i) => {
        const side = i % 2 ? 1 : -1, k = ((t - s.tContact) * 0.9 + (i >> 1) / 3) % 1;
        if (t < s.tContact) { E.attr(w, 'opacity', '0'); return; }
        const x0 = HOT + side * (30 + k * 260), a = 30 * (1 - k * 0.6);
        E.attr(w, 'd', `M${(x0 - 24).toFixed(1)} ${CY} q 12 ${(-a).toFixed(1)} 24 0 t 24 0`);
        E.attr(w, 'opacity', E.f3((1 - k) * E.ep(t, s.tContact, s.tContact + 0.3)));
      });
      // weather: mesh sways, rain falls (f03 'adapts' beat only)
      const kw = E.env(t, s.tAdapt, f4 - 0.3, 0.5);
      E.css(s.mesh, { transform: `translateX(${E.f3(Math.sin(t * 2.2) * 3 * kw)}px)` });
      E.attr(s.rainG, 'opacity', E.f3(0.5 * kw));
      if (kw > 0.001) s.rainEls.forEach((e, i) => { const r = s.rain[i], y = ((r.y0 + t * r.sp) % 760) + 180; E.attr(e, 'x1', r.x.toFixed(1)); E.attr(e, 'x2', (r.x - 8).toFixed(1)); E.attr(e, 'y1', y.toFixed(1)); E.attr(e, 'y2', (y + 22).toFixed(1)); });
      // climber rises into the climb, arms reaching
      const kcl = E.ep(t, s.tClimb, s.tContact, 'out');
      const reach = Math.sin(Math.max(0, t - s.tContact) * 2.4) * 4;
      s.climb.setAttribute('transform', `translate(${HOT} ${(CY + 40 + 300 * (1 - kcl)).toFixed(1)})`);
      E.attr(s.climb, 'opacity', E.f3(E.ep(t, s.tClimb, s.tClimb + 0.4)));
      s.armL.setAttribute('transform', `translate(0 ${E.f3(reach)})`); s.armR.setAttribute('transform', `translate(0 ${E.f3(-reach)})`);
      // headlines
      E.revealWords(s.h1, t, at('v03', 'AgilFence') - 0.1, { per: 0.07 });
      E.vis(s.h1, 1 - E.ep(t, f4 - 0.2, f4 + 0.2, 'in'));
      E.revealWords(s.h2, t, s.tClimb + 0.2, { per: 0.09 });
      // FBG callout
      const kf = E.env(t, s.tFbg, f4 - 0.1, 0.4);
      E.fade(s.fbg, kf, { dy: 10 }); E.attr(s.fbgL, 'opacity', E.f3(kf));
      // right column (f03)
      const out3 = 1 - E.ep(t, f4 - 0.4, f4, 'in');
      E.fade(s.lab1, E.ep(t, s.tFeel[0] - 0.4, s.tFeel[0]) * out3, { dy: 8 });
      s.feel.forEach((e, i) => E.fade(e, E.ep(t, s.tFeel[i] - 0.15, s.tFeel[i] + 0.35, 'back') * out3, { dx: 20, dy: 0 }));
      E.fade(s.lab2, E.ep(t, s.tLight - 0.3, s.tLight + 0.1) * out3, { dy: 8 });
      E.fade(s.light, E.ep(t, s.tLight, s.tLight + 0.45) * out3, { dx: 20, dy: 0 });
      E.fade(s.adapt, E.ep(t, s.tAdapt, s.tAdapt + 0.45) * out3, { dx: 20, dy: 0 });
      // f04: trace inset
      E.fade(s.trace, E.ep(t, f4 + 0.1, f4 + 0.6), { dx: 20, dy: 0 });
      const tr = (y0, amp, seed, spike) => {
        let d = '';
        for (let i = 0; i <= 84; i++) {
          const x = i * 5, ph2 = t * 3 + i * 0.35 + seed;
          let y = y0 + Math.sin(ph2) * amp + Math.sin(ph2 * 2.1) * amp * 0.5;
          if (spike) { const dd = (x - 300) / 26; y += Math.exp(-dd * dd) * Math.sin(x * 0.25) * spike; }
          d += (i ? ' L' : 'M') + x + ' ' + y.toFixed(1);
        }
        return d;
      };
      E.attr(s.tw, 'd', tr(64, 6, 0, 0));
      E.attr(s.tc, 'd', tr(176, 3, 2, 46 * E.ep(t, s.tContact, s.tContact + 0.4)));
      E.attr(s.lw, 'opacity', E.f3(E.ep(t, s.tReads, s.tReads + 0.4)));
      E.attr(s.lc, 'opacity', E.f3(E.ep(t, s.tReads + 0.3, s.tReads + 0.7)));
      // pin + segment + time code
      const kp = E.ep(t, s.tPin, s.tPin + 0.5, 'back');
      E.fade(s.pin, kp, { dy: -30 }); E.attr(s.pinL, 'opacity', E.f3(E.ep(t, s.tPin + 0.2, s.tPin + 0.6)));
      E.fade(s.tc0, E.ep(t, s.tContact, s.tContact + 0.3) * (Math.floor((t - s.tContact) * 3) % 2 || t > s.tContact + 1.5 ? 1 : 0.4), { dy: 0 });
      E.fade(s.strip, E.ep(t, f4 + 0.2, f4 + 0.7), { dy: 14 });
      E.css(s.seg, { background: t > s.tPin + 0.2 ? '#D72D30' : '#3A5A8C', boxShadow: t > s.tPin + 0.2 ? '0 0 16px rgba(215,45,48,.8)' : 'none' });
    },
  });
})();
