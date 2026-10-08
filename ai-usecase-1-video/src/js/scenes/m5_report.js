/* m5 · 07:00 Handover — incident reports drafted automatically, audit-ready. */
E.scene({
  id: 'm5',
  build(el, s) {
    const v24 = E.L('v24');
    s.rail = MOMENT.rail(el, {
      n: 5, time: '07:00', title: 'Handover — audit-ready', who: ['grace'],
      story: { as: 'head of security', want: 'every incident documented automatically', so: 'we are always audit-ready' },
      before: 'Reports and evidence assembled by hand', after: 'Drafted automatically, ready for review', gainAt: v24.start + 0.9,
    });
    const st = MOMENT.stage(el, 'Shift handover · 22:00 – 07:00', `<span class="chip blue" style="height:32px">${C.icon('doc', 15)} 3 reports drafted</span>`);
    const body = E.q(st, '.st-body');
    const TLN = [['02:13:52', 'Tailgating detected · access control + video'], ['02:14:05', 'Ranked critical (94) by AI triage'], ['02:15:04', 'Doors D-214, D-216 locked'],
      ['02:15:12', 'Patrols P-1, P-5 dispatched'], ['02:17:38', 'Subject intercepted at Stand C3']];
    s.summary = 'At 02:13:52 an unidentified person tailgated a badge holder through Staff Door D-214. AI triage ranked the incident critical. SOP AS-07 was executed with duty-manager approval; the subject was intercepted at Stand C3 at 02:17:38.';
    s.doc = E.add(body, `<div class="abs" style="left:22px;top:20px;width:720px;height:642px;border-radius:14px;background:#F4F6FA;color:#0A1428;padding:24px 28px;box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="mono" style="font-size:13px;letter-spacing:.14em;color:#5B6B86">INCIDENT REPORT · IR-0214</span>
        <span class="stamp mono" style="font-size:12px;font-weight:600;letter-spacing:.08em;padding:5px 10px;border-radius:6px;background:#E3EAFF;color:#2D5BFF">AI DRAFT · READY FOR REVIEW</span>
      </div>
      <div style="font-family:var(--head);font-weight:700;font-size:25px;margin-top:12px;letter-spacing:-.01em">Unauthorised airside access — Staff Door D-214</div>
      <div class="sec s0" style="margin-top:14px;border-radius:10px;padding:10px 12px;margin-left:-12px;margin-right:-12px">
        <div class="mono" style="font-size:12px;letter-spacing:.14em;color:#5B6B86;display:flex;align-items:center;gap:8px"><span style="color:#2D5BFF">${C.icon('sparkle', 14)}</span>SUMMARY · AI-DRAFTED</div>
        <div class="sum" style="font-size:16px;line-height:1.5;margin-top:6px;color:#1C2A44;min-height:72px"></div>
      </div>
      <div class="sec s1" style="margin-top:4px;border-radius:10px;padding:10px 12px;margin-left:-12px;margin-right:-12px">
        <div class="mono" style="font-size:12px;letter-spacing:.14em;color:#5B6B86">TIMELINE</div>
        ${TLN.map(r => `<div style="display:grid;grid-template-columns:96px 1fr;font-size:15px;margin-top:6px"><span class="mono" style="color:#2D5BFF">${r[0]}</span><span>${r[1]}</span></div>`).join('')}
      </div>
      <div class="sec s2" style="margin-top:4px;border-radius:10px;padding:10px 12px;margin-left:-12px;margin-right:-12px">
        <div class="mono" style="font-size:12px;letter-spacing:.14em;color:#5B6B86">EVIDENCE · 3 ITEMS</div>
        <div style="display:flex;gap:10px;margin-top:8px">
          ${[['CAM 3-118 · replay', 'door'], ['CAM 4-207 · track', 'apron'], ['Access log · D-214', null]].map(e => `<div style="flex:1;height:58px;border-radius:8px;background:#1A2232;color:#C9D5EA;display:flex;align-items:flex-end;padding:6px 8px;font-family:var(--mono);font-size:11px;position:relative;overflow:hidden">
            <span style="position:absolute;left:8px;top:6px;color:#8FB4FF">${C.icon(e[1] ? 'play' : 'doc', 16)}</span>${e[0]}</div>`).join('')}
        </div>
      </div>
      <div class="sec s3" style="margin-top:4px;border-radius:10px;padding:10px 12px;margin-left:-12px;margin-right:-12px;display:flex;justify-content:space-between;align-items:center">
        <div><div class="mono" style="font-size:12px;letter-spacing:.14em;color:#5B6B86">APPROVALS</div><div style="font-size:15px;margin-top:4px">4 actions approved · Daniel, Duty Security Manager</div></div>
        <span class="mono" style="font-size:13px;font-weight:600;padding:5px 10px;border-radius:6px;background:#D3F5E2;color:#137A45">SOP AS-07 · 5/5 STEPS</span>
      </div>
      <div style="position:absolute;left:28px;right:28px;bottom:20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #DCE3EF;padding-top:14px">
        <span class="mono" style="font-size:12px;letter-spacing:.06em;color:#5B6B86">Drafted 02:23 by AI · 6 audit-trail entries attached</span>
        <span style="display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:8px;border:1px solid #C9D3E6;font-size:14px;font-weight:600;color:#1C2A44">${C.icon('doc', 15)} Export PDF</span>
      </div>
    </div>`);
    s.sum = E.q(s.doc, '.sum'); s.stamp = E.q(s.doc, '.stamp'); s.secs = [0, 1, 2, 3].map(i => E.q(s.doc, '.s' + i));
    const ROWS = [['312 → 3', 'alarms → incidents · 01:14–02:14'], ['3 m 46 s', 'detection to interception'], ['4 min', 'bag reclaimed · no gate closure'],
      ['1', 'queue breach averted · Checkpoint 3'], ['1', 'work order raised · CAM 4-221'], ['0', 'missed escalations']];
    s.sumCard = E.add(body, `<div class="abs panel flat" style="left:762px;top:20px;width:356px;height:642px;padding:22px 24px;border-radius:14px">
      <div class="label" style="color:#8FB4FF">Shift summary</div>
      ${ROWS.map(r => `<div class="srow" style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="font-family:var(--head);font-weight:800;font-size:32px;letter-spacing:-.02em">${r[0]}</div><div style="font-size:15px;color:#A9B7CF;margin-top:2px">${r[1]}</div></div>`).join('')}
    </div>`);
    s.srows = E.qa(s.sumCard, '.srow');
    s.tSum = v24.start + 0.2;
    s.tSec = [v24.start, E.at('v24', 'timeline') - 0.1, E.at('v24', 'evidence') - 0.1, E.at('v24', 'approvals') - 0.1];
    s.tStamp = v24.end - 0.3;
    E.cue(s.start + 0.05, 'pop', 0.4); E.cue(s.tSum, 'typerun', 0.3, { dur: 2.5 });
    s.tSec.slice(1).forEach(t => E.cue(t, 'blip', 0.3)); E.cue(s.tStamp, 'stamp', 0.75);
  },
  update(t, lt, s) {
    MOMENT.updateRail(s.rail, t, s);
    E.fade(s.doc, E.ep(t, s.start, s.start + 0.5), { dy: 18 });
    E.type(s.sum, s.summary, t, s.tSum, 95);
    s.secs.forEach((x, i) => {
      const hot = i === 0 ? E.env(t, s.tSec[0], s.tSec[1], 0.2) : E.env(t, s.tSec[i], (s.tSec[i + 1] || s.tStamp) + 0.1, 0.2);
      E.css(x, { background: `rgba(45,91,255,${E.f3(0.09 * hot)})`, boxShadow: `inset 3px 0 0 rgba(45,91,255,${E.f3(hot)})` });
    });
    const rev = t >= s.tStamp;
    E.txt(s.stamp, rev ? '✓ REVIEWED · GRACE · 07:04' : 'AI DRAFT · READY FOR REVIEW');
    E.css(s.stamp, { background: rev ? '#D3F5E2' : '#E3EAFF', color: rev ? '#137A45' : '#2D5BFF', transform: `scale(${E.f3(rev ? 1 + 0.15 * (1 - E.ep(t, s.tStamp, s.tStamp + 0.3)) : 1)})` });
    E.fade(s.sumCard, E.ep(t, s.start + 0.2, s.start + 0.7), { dx: 20, dy: 0 });
    s.srows.forEach((r, i) => E.fade(r, E.ep(t, s.start + 0.4 + i * 0.22, s.start + 0.8 + i * 0.22), { dy: 10 }));
  },
});
