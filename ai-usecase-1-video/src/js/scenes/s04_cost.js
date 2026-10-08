/* s04 · The cost of doubt — a sourced data point (Groupe ADP via Air Journal). */
E.scene({
  id: 's04',
  build(el, s) {
    const FL = [
      ['08:05', 'XA 311', 'LONDON', 'D4'], ['08:10', 'XB 520', 'DUBAI', 'D6'], ['08:15', 'XC 108', 'TOKYO', 'E2'],
      ['08:20', 'XD 762', 'SYDNEY', 'D8'], ['08:30', 'XE 245', 'MUMBAI', 'E5'], ['08:35', 'XF 903', 'JAKARTA', 'D10'],
      ['08:45', 'XG 417', 'FRANKFURT', 'E9'], ['08:50', 'XH 636', 'SEOUL', 'E1'],
    ];
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#FFCB6B">The cost of doubt</div>
        <div class="h-l" style="margin-top:14px">Doubt is costly.</div>
      </div>
      <div class="abs stat" style="left:120px;top:318px;width:820px">
        <div class="num" style="font-family:var(--head);font-weight:800;font-size:212px;line-height:.92;letter-spacing:-.05em;color:#FFCB6B">0</div>
        <div class="h-s" style="margin-top:26px;font-size:34px;line-height:1.25">delays caused by unattended-bag alerts</div>
        <div class="lead" style="margin-top:8px;font-size:24px">Paris airports · in a single year (2017)</div>
      </div>
      <div class="abs mini" style="left:120px;top:690px;display:flex;align-items:center;gap:16px">
        <div class="ibox" style="width:52px;height:52px;background:rgba(255,176,32,.12);color:#FFCB6B;border-color:rgba(255,176,32,.3)">${C.icon('clock', 26)}</div>
        <div class="body" style="font-size:22px;color:#C9D5EA">Each alert can take <b style="color:#EEF3FC">~45 minutes</b> to clear.</div>
      </div>
      <div class="abs src label" style="left:120px;top:796px;letter-spacing:.04em;text-transform:none;font-size:15px;color:#8A9BC0">Source: Groupe ADP figures, reported by Air Journal (January 2018)</div>
      <div class="abs panel board" style="left:1010px;top:300px;width:790px;height:520px;overflow:hidden">
        <div style="height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;border-bottom:1px solid var(--line)">
          <div style="display:flex;align-items:center;gap:12px;font-family:var(--head);font-weight:700;font-size:22px;letter-spacing:.06em">${C.icon('plane', 24)} DEPARTURES</div>
          <span class="chip" style="height:28px;font-size:12px;letter-spacing:.12em">ILLUSTRATIVE</span>
        </div>
        <div class="label" style="display:grid;grid-template-columns:96px 118px 1fr 82px 150px;padding:12px 26px;border-bottom:1px solid var(--line)"><span>Time</span><span>Flight</span><span>Destination</span><span>Gate</span><span>Status</span></div>
        ${FL.map(f => `
          <div class="fr mono" style="display:grid;grid-template-columns:96px 118px 1fr 82px 150px;align-items:center;height:51px;padding:0 26px;border-bottom:1px solid rgba(143,161,192,.08);font-size:19px;color:#DCE4F2">
            <span>${f[0]}</span><span style="color:#A9B7CF">${f[1]}</span><span style="font-weight:600;letter-spacing:.04em">${f[2]}</span><span style="color:#A9B7CF">${f[3]}</span>
            <span class="st" style="display:inline-block;font-weight:600;letter-spacing:.06em;transform-origin:50% 50%"></span>
          </div>`).join('')}
      </div>`;
    s.hd = E.q(el, '.hd'); s.stat = E.q(el, '.stat'); s.num = E.q(el, '.num'); s.mini = E.q(el, '.mini'); s.src = E.q(el, '.src'); s.board = E.q(el, '.board');
    s.st = E.qa(el, '.st');
    const v9 = E.L('v09');
    s.tNum = E.at('v09', '1,280') - 0.35;
    const DEL = [0, 1, 3, 5];  // gates near the alert (D-pier) — not the whole board
    s.flip = s.st.map((_, i) => (DEL.includes(i) ? v9.start + 0.7 + DEL.indexOf(i) * 0.75 : Infinity));
    s.flip.filter(isFinite).forEach(t => E.cue(t, 'flip', 0.5));
    E.cue(s.tNum, 'tickrun', 0.35, { dur: 1.25 });
    E.cue(s.tNum + 1.3, 'boom', 0.75);
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    E.fade(s.board, E.ep(t, s.start + 0.2, s.start + 0.9), { dx: 30, dy: 0 });
    E.fade(s.stat, E.ep(t, s.tNum - 0.2, s.tNum + 0.4), { dy: 20 });
    const k = E.ep(t, s.tNum, s.tNum + 1.3, 'out');
    E.txt(s.num, E.num(Math.round(1280 * k)));
    E.vis(s.num, E.ep(t, s.tNum - 0.1, s.tNum + 0.25));
    E.fade(s.mini, E.ep(t, s.tNum + 1.2, s.tNum + 1.8), { dy: 12 });
    E.fade(s.src, E.ep(t, s.tNum + 0.4, s.tNum + 1.0), { dy: 0 });
    s.st.forEach((el, i) => {
      const tf = s.flip[i];
      const delayed = t >= tf + 0.12;
      const sq = 1 - 2 * Math.abs(E.p(t, tf, tf + 0.24) - 0.5); // 0→1→0 squash
      const flipping = t >= tf && t <= tf + 0.24;
      E.txt(el, delayed ? 'DELAYED' : i % 3 === 0 ? 'BOARDING' : 'ON TIME');
      E.css(el, { color: delayed ? '#FFB020' : '#7BE8AC', transform: `scaleY(${E.f3(flipping ? 1 - sq : 1)})` });
    });
  },
});
