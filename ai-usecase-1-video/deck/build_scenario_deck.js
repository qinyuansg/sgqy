'use strict';
// AI Use Case 1 — scenario walkthrough deck (editable .pptx): one night in an airport security
// operations centre, told scene by scene. Each slide is a full-bleed illustrated scene with the
// product panel the person is using, the AI co-pilot speaking in a bubble, a yellow highlight on the
// feature that matters, and a one-line takeaway. Bubbles, captions, highlights and notes are native,
// editable PowerPoint objects; scenes and panels are images rendered by deck/scenes/.
//
//   NODE_PATH=deck/node_modules node deck/scenes/build_assets.mjs build/scenario-assets
//   node deck/build_scenario_deck.js build/scenario-assets build/dist/AI-UseCase1_Scenario-Walkthrough.pptx [film.mp4] [poster.png]
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));

const ASSETS = path.resolve(process.argv[2] || 'build/scenario-assets');
const OUT = path.resolve(process.argv[3] || 'build/dist/AI-UseCase1_Scenario-Walkthrough.pptx');
const FILM = process.argv[4] ? path.resolve(process.argv[4]) : path.join(ASSETS, 'film_540p.mp4');
const POSTER = process.argv[5] ? path.resolve(process.argv[5]) : path.join(ASSETS, 'cover.png');
const A = f => path.join(ASSETS, f);
const marks = f => JSON.parse(fs.readFileSync(A(f.replace(/\.(png|jpg)$/, '.json')), 'utf8'));

// same palette as the CEO deck; accent5 is a brighter gold for the takeaway captions and highlights
const THEME = {
  name: 'AI Use Case Night',
  headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: { dk1: '0A1428', lt1: 'FFFFFF', dk2: '12203D', lt2: 'A9B7CF', accent1: '2D5BFF', accent2: '4D8DFF', accent3: 'FF5A6E', accent4: '2ED47A', accent5: 'FFD23F', accent6: '8FB4FF', hlink: '8FB4FF', folHlink: 'A9B7CF' },
};
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'AI Use Case 1: one night in the airport security operations centre';
pres.subject = 'Scenario walkthrough of the AI co-pilot in AGIL® Secure ISMS';
pres.author = 'Product Management, Smart Security & Automation';
pres.company = 'ST Engineering';
const C = pres.SchemeColor;
const BG = C.background1, CARD = C.background2, TXT = C.text1, MUTED = C.text2;
const BLUE = C.accent1, BLUE2 = C.accent2, RED = C.accent3, GREEN = C.accent4, GOLD = C.accent5, ICE = C.accent6;
const SW = 13.333, SH = 7.5, MX = 0.6, CW = SW - 2 * MX;
const PX = 1 / 144;                       // 1920-px scene frame → inches

// ---------------------------------------------------------------- layouts
pres.defineSlideMaster({
  title: 'SCENE',
  background: { color: BG },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.42, y: 0.22, w: 9.5, h: 0.36, fontSize: 13, bold: true, color: ICE, margin: 0, valign: 'middle', align: 'left' }, text: 'TIME · STEP · what happens' } },
    { placeholder: { options: { name: 'caption', type: 'body', x: MX, y: 6.86, w: CW, h: 0.5, fontSize: 17, bold: true, color: GOLD, margin: 0, valign: 'middle', align: 'center' }, text: 'One-line takeaway for this scene' } },
    { text: { text: 'ILLUSTRATIVE SCENARIO · SIMULATED DATA', options: { x: SW - 4.42, y: 0.24, w: 4.0, h: 0.3, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5, align: 'right', valign: 'middle', margin: 0, isTextBox: true } } },
  ],
  slideNumber: { x: SW - 0.9, y: 7.12, w: 0.5, h: 0.24, fontSize: 9, color: MUTED, align: 'right', margin: 0 },
});
pres.defineSlideMaster({
  title: 'SCENE_TITLE',
  background: { color: BG },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: MX, y: 4.86, w: CW, h: 0.3, fontSize: 12, bold: true, color: ICE, margin: 0, align: 'left', valign: 'top' }, text: 'KICKER' } },
    { placeholder: { options: { name: 'title', type: 'title', x: MX, y: 5.2, w: CW, h: 0.72, fontSize: 32, bold: true, color: TXT, margin: 0, align: 'left', valign: 'top' }, text: 'Title' } },
    { placeholder: { options: { name: 'subtitle', type: 'body', x: MX, y: 5.98, w: CW, h: 0.42, fontSize: 18, color: MUTED, margin: 0, align: 'left', valign: 'top' }, text: 'Subtitle' } },
    { placeholder: { options: { name: 'meta', type: 'body', x: MX, y: 6.62, w: CW, h: 0.3, fontSize: 12, color: MUTED, margin: 0, align: 'left', valign: 'top' }, text: 'Team · meeting · date' } },
  ],
});
pres.defineSlideMaster({
  title: 'PLAIN',
  background: { color: BG },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: MX, y: 0.42, w: CW, h: 0.3, fontSize: 12, bold: true, color: ICE, margin: 0, align: 'left', valign: 'top' }, text: 'SECTION' } },
    { placeholder: { options: { name: 'title', type: 'title', x: MX, y: 0.74, w: CW, h: 0.7, fontSize: 28, bold: true, color: TXT, margin: 0, align: 'left', valign: 'top' }, text: 'Title' } },
  ],
  slideNumber: { x: SW - 0.9, y: 7.12, w: 0.5, h: 0.24, fontSize: 9, color: MUTED, align: 'right', margin: 0 },
});

// ---------------------------------------------------------------- helpers
function T(s, text, o) { s.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: 'top', fontSize: 14, color: TXT }, o)); }
function scene(bg, kicker, caption, notes) {
  const s = pres.addSlide({ masterName: 'SCENE', sectionTitle: SECTION });
  s.addImage({ path: A(bg), x: 0, y: 0, w: SW, h: SH, objectName: 'Scene ' + bg.replace(/\.jpg$/, ''), altText: SCENE_ALT[bg] || 'Illustrated scene in the airport security operations centre' });
  s.addText(kicker, { placeholder: 'title' });
  s.addText(caption, { placeholder: 'caption' });
  s.addNotes(notes.join('\n'));
  return s;
}
// product panel image; returns a mapper from its mark boxes to slide inches
function panel(s, file, x, y, w, alt) {
  const m = marks(file), ar = m.h / m.w, h = w * ar;
  s.addImage({ path: A(file), x, y, w, h, objectName: 'Product panel ' + file.replace(/^p_|\.png$/g, ''), altText: alt });
  const box = id => { const k = m.marks.find(q => q.id === id); if (!k) throw new Error(`${file}: no mark ${id}`); return { x: x + k.x * w, y: y + k.y * h, w: k.w * w, h: k.h * h }; };
  return { x, y, w, h, box };
}
// yellow highlight frame around a panel element (the feature to look at)
function highlight(s, b, pad = 0.05) {
  s.addShape(pres.shapes.RECTANGLE, { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad, fill: { type: 'none' }, line: { color: GOLD, width: 2.5 }, objectName: 'Highlight' });
}
// the operator clicks here: pointer + ripple
function click(s, b, fx = 0.62, fy = 0.6) {
  const cx = b.x + b.w * fx, cy = b.y + b.h * fy;
  s.addShape(pres.shapes.OVAL, { x: cx - 0.2, y: cy - 0.2, w: 0.4, h: 0.4, fill: { color: ICE, transparency: 80 }, line: { color: ICE, width: 2 }, objectName: 'Click ripple' });
  s.addImage({ path: A('p_cursor.png'), x: cx - 0.1, y: cy - 0.08, w: 0.46, h: 0.46, objectName: 'Pointer', altText: 'Mouse pointer clicking' });
}
function orb(s, x, y, d = 1.0) {
  const m = marks('p_orb.png'), h = d * m.h / m.w;
  s.addImage({ path: A('p_orb.png'), x, y, w: d, h, objectName: 'AI co-pilot', altText: 'AI co-pilot assistant' });
}
// speech bubble whose tail tip lands on (tx, ty): AI (glass) or person (label + quote) or thought (white)
function bubble(s, kind, text, x, y, w, h, tx, ty, o = {}) {
  if (o.short) {   // short pointer toward (tx, ty) instead of reaching it
    const cx = x + w / 2, cy = y + h / 2, dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const te = Math.min(Math.abs(ux) > 1e-6 ? (w / 2) / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? (h / 2) / Math.abs(uy) : 1e9);
    tx = cx + ux * (te + o.short); ty = cy + uy * (te + o.short);
  }
  const adj1 = Math.round(((tx - (x + w / 2)) / w) * 100000), adj2 = Math.round(((ty - (y + h / 2)) / h) * 100000);
  const name = `${o.name || (kind === 'ai' ? 'AI bubble' : kind === 'thought' ? 'Thought bubble' : 'Speech bubble')} ~tail:${adj1},${adj2}`;
  const base = { shape: pres.shapes.ROUNDED_RECTANGULAR_CALLOUT, isTextBox: true, x, y, w, h, valign: 'middle', objectName: name };
  if (kind === 'ai') {
    s.addText(text, Object.assign(base, { margin: [12, 10, 6, 6], fontSize: o.fs || 14.5, color: TXT, fill: { color: CARD, transparency: 6 }, line: { color: ICE, width: 1.5 },
      shadow: { type: 'outer', color: '5FB8FF', blur: 12, offset: 0, angle: 0, opacity: 0.55 } }));
  } else if (kind === 'person') {
    s.addText([{ text: o.who.toUpperCase(), options: { fontSize: 9.5, bold: true, color: ICE, charSpacing: 1.5, breakLine: true } }, { text: `“${text}”`, options: { fontSize: o.fs || 16, bold: true, color: TXT } }],
      Object.assign(base, { margin: [10, 8, 5, 5], fill: { color: '0B1730', transparency: 10 }, line: { color: ICE, width: 1, transparency: 30 } }));
  } else {
    s.addText(text, Object.assign(base, { margin: [9, 8, 4, 4], align: 'center', fontSize: o.fs || 13, bold: true, color: BG, fill: { color: TXT, transparency: 4 }, line: { color: TXT, width: 0.75 } }));
  }
}
function tag(s, text, x, y, w, color) {
  s.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.06, isTextBox: true, x, y, w, h: 0.3, margin: 0, align: 'center', valign: 'middle', fontSize: 11, bold: true, color: BG, fill: { color }, line: { type: 'none' }, objectName: 'Tag ' + text });
}

const SCENE_ALT = {
  'bg_title.jpg': 'Airport security operations centre at night: rows of operators facing a large video wall',
  'bg_pain.jpg': 'Operator Nurul, hand to her head, surrounded by alarm windows, missed calls and messages; red alarm light',
  'bg_split.jpg': 'Split scene: the overwhelmed control room on the left, a calm operator on the right',
  'bg_brief.jpg': 'Operator Nurul at her console at the start of the night shift',
  'bg_0214.jpg': 'Operator Nurul at her console at 02:14', 'bg_0215.jpg': 'Operator Nurul at her console at 02:15', 'bg_0216.jpg': 'Operator Nurul at her console at 02:16',
  'bg_daniel.jpg': 'Duty security manager Daniel at the raised supervisor desk overlooking the room', 'bg_daniel510.jpg': 'Duty manager Daniel at the supervisor desk at 05:10',
  'bg_grace.jpg': 'Head of security Grace standing with a tablet at the 07:00 handover', 'bg_vision.jpg': 'The operations room at the end of the shift',
  'bg_terminal.jpg': 'Patrol officer Arjun in the airside concourse at night, holding his handheld; a woman in a red coat sits at the café',
};
let SECTION = '';
const section = t => { SECTION = t; pres.addSection({ title: t }); };

// ---------------------------------------------------------------- slides
async function build() {
  // ===== 1 · Title
  section('Opening');
  {
    const s = pres.addSlide({ masterName: 'SCENE_TITLE', sectionTitle: SECTION });
    s.addImage({ path: A('bg_title.jpg'), x: 0, y: 0, w: SW, h: SH, objectName: 'Scene operations room', altText: SCENE_ALT['bg_title.jpg'] });
    orb(s, 10.55, 2.95, 0.95);
    bubble(s, 'ai', 'I’m the AI co-pilot in AGIL® Secure ISMS. Let me show you one night shift.', 8.0, 1.95, 3.1, 0.92, 10.75, 3.05);
    s.addText([{ text: 'AI USE CASE 1  ·  SCENARIO WALKTHROUGH', options: { charSpacing: 2 } }], { placeholder: 'kicker' });
    s.addText('One night in the Airport Security Operations Centre', { placeholder: 'title' });
    s.addText([{ text: 'AI-powered AGIL' }, { text: '®', options: { superscript: true } }, { text: ' Secure ISMS: what changes for the people on shift' }], { placeholder: 'subtitle' });
    s.addText('Product Management · Smart Security & Automation   |   October 2026', { placeholder: 'meta' });
    s.addNotes([
      'OPENING (30 s)',
      'This walkthrough shows AI Use Case 1 the way the people in the control room will live it: one night shift, scene by scene, in real operating context.',
      'Each scene has the same building blocks: who is involved and where, what they see on the AGIL® Secure ISMS screen, what the AI co-pilot says, the feature that matters (yellow frame), and the takeaway (gold line at the bottom).',
      'Scenario, names, times and data are illustrative and match the 3-minute concept film at the end.',
    ].join('\n'));
  }

  // ===== 2 · The people on shift
  {
    const s = pres.addSlide({ masterName: 'PLAIN', sectionTitle: SECTION });
    s.addText([{ text: 'THE ROLES', options: { charSpacing: 2 } }], { placeholder: 'kicker' });
    s.addText('Four people, four places, one night shift', { placeholder: 'title' });
    s.addNotes([
      'THE PEOPLE ON SHIFT (1 min)',
      'Nurul watches every alarm, camera and sensor from console 3. Daniel, the duty security manager, makes the call on every response from the raised supervisor desk. Arjun patrols Terminal 2 airside on foot. Grace, head of security, arrives for the 07:00 handover and owns compliance.',
      'The co-pilot helps each of them differently; the next scenes follow them through the night. Names are illustrative.',
    ].join('\n'));
    const P = [
      ['t_nurul.jpg', 'Nurul', 'Control room operator', 'Console 3 · 22:00–07:00', 'Watches every alarm, camera and sensor', 'Triage and plain-language search', '3B6BFF'],
      ['t_daniel.jpg', 'Daniel', 'Duty security manager', 'Supervisor desk', 'Makes the call on every response', 'SOP-based response plans, forecasts', '8A5CF6'],
      ['t_arjun.jpg', 'Arjun', 'Patrol officer', 'Terminal 2 · airside, on foot', 'First on scene', 'Dispatches with photo and route', '13A38B'],
      ['t_grace.jpg', 'Grace', 'Head of security', 'Arrives for the 07:00 handover', 'Accountable for compliance', 'Drafted reports, lessons learned', 'D9824A'],
    ];
    const gw = 0.22, cw = (CW - 3 * gw) / 4, ih = 2.95;
    P.forEach(([img, name, role, where, job, ai, col], i) => {
      const x = MX + i * (cw + gw), y = 1.55;
      s.addImage({ path: A(img), x, y, w: cw, h: ih, sizing: { type: 'cover', w: cw, h: ih }, objectName: 'Portrait ' + name, altText: `${name}, ${role}, seen from behind in their work setting` });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ih, fill: { type: 'none' }, line: { color: MUTED, width: 0.75, transparency: 60 }, objectName: 'Portrait frame' });
      const ty = y + ih + 0.16;
      s.addShape(pres.shapes.RECTANGLE, { x, y: ty, w: 0.08, h: 0.62, fill: { color: col }, line: { type: 'none' }, objectName: 'Persona colour' });
      T(s, name, { x: x + 0.2, y: ty - 0.02, w: cw - 0.2, h: 0.36, fontSize: 18, bold: true });
      T(s, role, { x: x + 0.2, y: ty + 0.34, w: cw - 0.2, h: 0.28, fontSize: 12.5, color: MUTED });
      T(s, [{ text: 'Where  ', options: { bold: true, color: ICE } }, { text: where }], { x, y: ty + 0.76, w: cw, h: 0.42, fontSize: 12.5 });
      T(s, [{ text: 'Job  ', options: { bold: true, color: ICE } }, { text: job }], { x, y: ty + 1.2, w: cw, h: 0.42, fontSize: 12.5 });
      T(s, [{ text: 'Co-pilot  ', options: { bold: true, color: GOLD } }, { text: ai }], { x, y: ty + 1.64, w: cw, h: 0.42, fontSize: 12.5 });
    });
  }

  // ===== 3 · Today, without AI
  section('Today');
  {
    const s = scene('bg_pain.jpg', 'TODAY · 02:14 · WITHOUT AI', 'Operators connect fragmented alarms by hand — speed and quality depend on who is on shift', [
      'THE PAIN, AS IT IS LIVED (1.5 min)',
      '2 a.m. Nurul has 312 alarms in the last hour across separate systems: the alarm queue, access-control events, a perimeter sensor, CCTV, missed radio calls and messages from the airline and the police.',
      'Two of them are real (a tailgating at Staff Door D-214 and an unattended bag at Gate B12) but they look like everything else. She has to connect the dots by hand, flip through the SOP binder and decide who to call first.',
      'The questions in the bubbles are the ones an operator has to answer by hand today. How fast and how well they are answered depends on experience: that is the problem this use case solves. (Validate these with control-room staff in discovery.)',
    ]);
    const Q = [
      ['Real alarm — or another nuisance?', 3.55, 2.5, 2.7, 0.5], ['Is the fence alarm related?', 6.45, 2.5, 2.35, 0.5],
      ['Who left that bag at B12?', 4.15, 3.3, 2.25, 0.5], ['Close Gate B12 or not?', 6.6, 3.3, 2.15, 0.5],
      ['Which SOP applies here?', 9.0, 2.98, 2.15, 0.5], ['Who do I call first?', 9.1, 3.75, 1.95, 0.5],
      ['The airline wants an update…', 11.2, 3.45, 1.95, 0.72], ['Which camera covers D-214?', 0.3, 4.42, 2.3, 0.5],
    ];
    Q.forEach(([t, x, y, w, h]) => bubble(s, 'thought', t, x, y, w, h, 3.05, 3.35, { short: 0.26 }));
  }

  // ===== 4 · From noise to clarity
  {
    const s = scene('bg_split.jpg', 'THE SHIFT · FROM NOISE TO CLARITY', 'AI-powered AGIL® Secure ISMS — from alarm noise to decisive action', [
      'FROM NOISE TO CLARITY (45 s)',
      'Left: today. Right: the same console with the AI co-pilot built into AGIL® Secure ISMS.',
      'The co-pilot watches every alarm, camera and sensor in real time, fuses them into incidents, explains why each one matters and recommends the response from the airport’s own procedures. People stay in command: it recommends, they decide.',
    ]);
    s.addText('From alarm noise', { shape: pres.shapes.CHEVRON, isTextBox: true, x: 3.95, y: 3.48, w: 3.15, h: 0.62, margin: [22, 18, 0, 0], align: 'center', valign: 'middle', fontSize: 16, bold: true, color: TXT, fill: { color: '5A1020', transparency: 8 }, line: { color: RED, width: 1 }, objectName: 'From noise' });
    s.addText('to clarity', { shape: pres.shapes.CHEVRON, isTextBox: true, x: 6.95, y: 3.48, w: 2.2, h: 0.62, margin: [22, 18, 0, 0], align: 'center', valign: 'middle', fontSize: 16, bold: true, color: TXT, fill: { color: BLUE, transparency: 8 }, line: { color: ICE, width: 1 }, objectName: 'To clarity' });
    orb(s, 10.1, 1.25, 1.0);
    bubble(s, 'ai', 'I watch every alarm, camera and sensor — and tell you what matters, and why.', 10.0, 0.42, 3.05, 0.78, 10.45, 1.32);
  }

  // ===== 5 · 22:00 briefing
  section('The night shift');
  {
    const s = scene('bg_brief.jpg', '22:00 · SHIFT START · Briefing', 'Proactive briefing — a clear picture from the first minute of the shift', [
      'NARRATIVE: 22:00, Nurul sits down for the night shift. Before she opens a single alarm, the co-pilot briefs her.',
      'FEATURE: shift briefing. Airport status, items carried over from the day shift, the co-pilot’s watch list, planned activity, weather and the morning peak, in one view.',
      'WHY IT MATTERS: the briefing sets expectations. Knowing that cleaners work Pier C 01:00–03:00 and that wind gusts reach 32 km/h is exactly what lets the co-pilot later explain 214 door alarms and 61 fence alarms as nuisance, with reasons.',
      'ROLE: operator (Nurul). PAIN SOLVED: fragmented picture at shift start; handover knowledge lost between shifts.',
    ]);
    const p = panel(s, 'p_briefing.png', 4.95, 1.0, 7.95, 'Shift briefing panel: airport status, open items, watch list, planned activity, weather, morning peak');
    highlight(s, p.box('watch'));
    orb(s, 2.55, 2.0, 1.0);
    bubble(s, 'ai', 'Good evening, Nurul. Here’s your briefing for tonight.', 1.95, 0.76, 2.85, 0.86, 2.95, 2.1);
  }

  // ===== 6 · 02:14 attention required
  {
    const s = scene('bg_0214.jpg', '02:14 · TRIAGE · Attention required', 'Every system’s alarms fused, ranked by risk and explained — nothing silently dropped', [
      'NARRATIVE: 02:14. Instead of 312 alarms, Nurul sees three incidents ranked by risk, each with its evidence. She says: "Show me."',
      'FEATURE: context-aware triage. Alarms from access control, video analytics and perimeter sensors are fused into incidents and scored: tailgating at Staff Door D-214 is 94 (one badge, two people, door held 14 s, not on roster, heading to Stand C3); the bag at Gate B12 is 71; a fence vibration is 08, verified by thermal camera as a small animal and closed.',
      'HIGHLIGHT: the 309 nuisance alarms are grouped with reasons (214 cleaning-roster matches, 61 wind and rain, 34 lens glare), logged and reviewable. Never silently dropped: that is what makes operators trust the ranking.',
      'ROLE: operator. PAIN SOLVED: alarm fatigue, fragmented picture.',
    ]);
    const p = panel(s, 'p_triage.png', 4.95, 1.0, 7.95, 'Triage panel: three ranked incidents and 309 nuisance alarms grouped by cause');
    highlight(s, p.box('nuisance'));
    click(s, p.box('showme'));
    orb(s, 2.6, 2.2, 0.95);
    bubble(s, 'ai', '312 alarms in the last hour. Three need you — the top one is a tailgating at Staff Door D-214.', 0.35, 0.74, 2.95, 1.2, 2.95, 2.32);
    bubble(s, 'person', 'Show me.', 0.45, 2.66, 1.7, 0.64, 2.45, 3.25, { who: 'Nurul' });
  }

  // ===== 7 · 02:15 situation explained
  {
    const s = scene('bg_0215.jpg', '02:15 · DETECT & VALIDATE · Situation explained', 'Explains what happened, why it matters and where it is heading — with the evidence', [
      'NARRATIVE: the co-pilot explains the incident in plain words and shows the evidence: the door camera with the badge holder and the unidentified second person, and the live track across three cameras toward Stand C3.',
      'FEATURE: incident explanation. What happened (tailgating, 1 badge, 2 people), when (02:13:52, confirmed 02:14:40), where it is heading, and why it is critical (access control, video analytics, rosters, location, history).',
      'WHY IT MATTERS: the operator validates in seconds instead of hunting through screens, and the duty manager gets a clear, evidenced picture to decide on.',
      'ROLE: operator validates; duty manager is alerted. PAIN SOLVED: fragmented picture, slow verification.',
    ]);
    const p = panel(s, 'p_situation.png', 4.85, 0.85, 8.1, 'Incident panel: tailgating confirmed with door camera evidence, live track map and reasons it is critical');
    highlight(s, p.box('evidence'));
    orb(s, 2.6, 2.2, 0.95);
    bubble(s, 'ai', 'Tailgating confirmed: one badge, two people. The second person isn’t on any roster and is heading airside to Stand C3.', 0.35, 0.72, 3.05, 1.38, 2.95, 2.32, { fs: 14 });
  }

  // ===== 8 · 02:15 response approved (duty manager)
  {
    const s = scene('bg_daniel.jpg', '02:15 · RESPOND · Duty manager approves', 'Turns analysis into action — the airport’s own SOPs, and a person approves every step', [
      'NARRATIVE: at the supervisor desk, Daniel sees the response plan the co-pilot drafted from SOP AS-07, with the predicted outcome with and without action. He approves the first step: lock doors D-214 and D-216.',
      'FEATURE: SOP-grounded response. Five steps (lock doors, track across cameras, dispatch patrols P-1 and P-5, notify Airport Police, intercept and verify). Tracking runs automatically; every intervention needs a one-click approval and is logged.',
      'WHY IT MATTERS: every shift gives the same, correct response, and accountability is clear.',
      'ROLE: duty security manager. PAIN SOLVED: inconsistent response; SOPs on paper.',
    ]);
    const p = panel(s, 'p_response.png', 4.7, 0.95, 8.25, 'Response plan panel grounded in SOP AS-07 with five steps and approval buttons');
    highlight(s, p.box('actions'));
    click(s, p.box('approve'));
    orb(s, 2.75, 2.05, 1.0);
    bubble(s, 'ai', 'Here’s the response from SOP AS-07. Nothing is actioned until you approve.', 0.4, 0.62, 3.15, 0.92, 3.15, 2.12);
    bubble(s, 'person', 'Approve — lock the doors.', 0.45, 3.0, 2.35, 0.66, 3.25, 3.6, { who: 'Daniel', fs: 15 });
  }

  // ===== 9 · 02:16 live monitoring
  {
    const s = scene('bg_0216.jpg', '02:16 · MONITOR · Live tracking', 'Keeps tracking as the response unfolds — no chasing updates over the radio', [
      'NARRATIVE: doors are locked, two patrols are on the way and the police are notified. The co-pilot keeps tracking the person and the patrols and updates the intercept ETA by itself.',
      'FEATURE: live incident lifecycle (Detect → Validate → Respond → Monitor → Close) with response status, live map and ETA. When P-1 is rerouted around a refuelling truck, the ETA moves by 10 seconds and the reason is shown.',
      'OUTCOME: the person is intercepted at Stand C3 at 02:17:38, 3 min 46 s after detection.',
      'ROLE: operator and duty manager. PAIN SOLVED: chasing updates by radio and phone.',
    ]);
    const p = panel(s, 'p_monitor.png', 4.7, 1.0, 8.25, 'Live incident panel: lifecycle stepper, response status, live map and intercept ETA');
    highlight(s, p.box('step'), 0.03);
    orb(s, 2.6, 2.2, 0.95);
    bubble(s, 'ai', 'Doors locked. Patrol P-1 is 40 seconds away — I’ll keep you posted.', 0.35, 0.74, 2.95, 0.98, 2.95, 2.32);
  }

  // ===== 10 · 02:16 who left this bag?
  {
    const s = scene('bg_0216.jpg', '02:16 · INVESTIGATE · “Who left this bag?”', 'Plain-language search across every camera — answers in seconds, not hours of footage', [
      'NARRATIVE: meanwhile, the unattended bag at Gate B12 (gate boards at 02:55). Nurul simply asks: "Who left the black suitcase at Gate B12?"',
      'FEATURE: plain-language video search with cross-camera tracking. In 4 seconds, across 38 cameras: a woman in a red coat with a grey backpack, traced from Gate B12 through the Pier B walkway and the escalator to the Level 2 café, live. One click sends it to the nearest patrol.',
      'NOTE: concept extension, beyond the capabilities in the InnoChamp 2026 submission. Candidate building block: ST Engineering’s AGIL® Vision (to be explored). Needs a privacy impact assessment, role-based access and an audit log of every search.',
      'ROLE: operator. PAIN SOLVED: slow investigation; flights delayed by unattended-bag alerts.',
    ]);
    const p = panel(s, 'p_investigate.png', 4.7, 0.95, 8.25, 'Investigation panel: plain-language query, four sightings across cameras and send-to-patrol button');
    highlight(s, p.box('trail'));
    click(s, p.box('send'));
    orb(s, 2.6, 2.2, 0.95);
    bubble(s, 'ai', 'Found her in 4 seconds across 38 cameras: red coat, grey backpack — now at the Level 2 café.', 0.35, 0.72, 3.0, 1.2, 2.95, 2.32);
    bubble(s, 'person', 'Who left the black suitcase at Gate B12?', 0.35, 2.7, 2.2, 0.98, 2.5, 3.35, { who: 'Nurul', fs: 14 });
  }

  // ===== 11 · 02:17 patrol on the ground
  {
    const s = scene('bg_terminal.jpg', '02:17 · RESPOND ON THE GROUND · Patrol officer', 'The right information reaches the officer on the ground — bag reclaimed, no gate closure', [
      'NARRATIVE: Arjun, patrol P-3, is two minutes away. His handheld shows the dispatch: who to find, the live photo, where she was last seen and the route. He accepts and walks over.',
      'OUTCOME: the owner reclaims the bag at 02:20, four minutes after the question. No gate closure, no delayed departure.',
      'WHY IT MATTERS: the patrol officer gets exactly what he needs, without a long radio description. Compare the cost of doubt: 1,280 delays in a year at Paris airports from unattended-bag alerts.',
      'ROLE: patrol officer. PAIN SOLVED: vague radio descriptions, searching on foot.',
    ]);
    const tm = marks('bg_terminal.jpg').marks, ph = tm.find(m => m.id === 'phone'), ow = tm.find(m => m.id === 'owner');
    const phx = ph.x * SW, phy = ph.y * SH;
    const p = panel(s, 'p_dispatch.png', 6.0, 0.62, 3.7, 'Patrol handheld: dispatch to locate the bag owner with photo, last sighting and route; accepted');
    s.addShape(pres.shapes.LINE, { x: phx + 0.45, y: phy + 0.1, w: p.x + 0.3 - (phx + 0.45), h: p.y + p.h - 0.4 - (phy + 0.1), line: { color: ICE, width: 1.5, dashType: 'dash', transparency: 20 }, objectName: 'Handheld link' });
    highlight(s, p.box('card'), 0.03);
    const ox = ow.x * SW, oy = ow.y * SH;
    s.addShape(pres.shapes.OVAL, { x: ox - 0.12, y: oy - 0.1, w: ow.w * SW + 0.24, h: ow.h * SH + 0.2, fill: { type: 'none' }, line: { color: GOLD, width: 2 }, objectName: 'Bag owner marker' });
    tag(s, 'Bag owner · live', ox - 0.45, oy - 0.48, 1.5, GOLD);
    orb(s, 10.0, 1.15, 0.85);
    bubble(s, 'ai', 'Bag owner at the Level 2 café: red coat, grey backpack. Two minutes from you.', 9.95, 2.1, 3.1, 1.12, 10.35, 1.9);
    bubble(s, 'person', 'On my way.', 0.5, 2.2, 1.75, 0.66, 2.55, 2.9, { who: 'Arjun' });
  }

  // ===== 12 · 05:10 before the morning peak
  {
    const s = scene('bg_daniel510.jpg', '05:10 · ANTICIPATE & MAINTAIN · Before the morning peak', 'Anticipates queues and failing devices — act before the peak, not after it', [
      'NARRATIVE: 05:10, before the departures peak. The co-pilot forecasts that Checkpoint 3 will breach its 15-minute target around 05:45 (peak 20 minutes) and recommends opening lanes 5 and 6 at 05:30 with four officers from Checkpoint 1, which is quiet until 06:30. Daniel approves: forecast peak 11 minutes.',
      'It also flags CAM 4-221 on the apron (Stands C4–C5): lens fogging, likely unusable within 72 hours. A work order (WO-5531) is raised so it is fixed before it becomes a blind spot.',
      'FEATURES: traveller-flow forecasting (Anticipate) and device-health prediction (Maintain), both in the AI capabilities listed in the InnoChamp 2026 submission.',
      'ROLE: duty security manager. PAIN SOLVED: reactive operations.',
    ]);
    const p = panel(s, 'p_forecast.png', 4.55, 1.35, 8.4, 'Operations outlook: Checkpoint 3 wait-time forecast with and without action, lane recommendation approved, camera health warning');
    highlight(s, p.box('chart'));
    highlight(s, p.box('device'));
    orb(s, 2.75, 2.05, 1.0);
    bubble(s, 'ai', 'Checkpoint 3 will breach its 15-minute target around 05:45. Open lanes 5 and 6 at 05:30?', 0.4, 0.6, 3.3, 0.98, 3.15, 2.12);
    bubble(s, 'person', 'Do it.', 0.55, 3.05, 1.5, 0.64, 3.25, 3.6, { who: 'Daniel' });
  }

  // ===== 13 · 07:00 handover
  {
    const s = scene('bg_grace.jpg', '07:00 · REPORT & LEARN · Handover', 'From resolution to learning — audit-ready reports and lessons for the next shift', [
      'NARRATIVE: 07:00 handover. Grace, head of security, opens the shift report on her tablet: three incidents, all closed. The incident report for Staff Door D-214 is already drafted from the audit trail (timeline, evidence, four approvals, SOP AS-07 completed 5 of 5).',
      'FEATURE: auto-drafted reports and lessons learned. The co-pilot proposes four lessons for the knowledge base: repair the door closer on D-214, retune Fence Sector 7 above 30 km/h, add a camera angle at the Stand C3 approach, and add "notify the airline duty officer" to SOP AS-07.',
      'NOTE: report drafting is a concept extension proposed by this use case.',
      'ROLE: head of security. PAIN SOLVED: patchy auditability; lessons lost between shifts.',
    ]);
    const p = panel(s, 'p_report.png', 5.55, 1.0, 7.45, 'Shift report: incident lifecycle complete, AI-drafted incident report, shift summary and lessons learned');
    highlight(s, p.box('lessons'));
    click(s, p.box('approve'));
    orb(s, 3.0, 1.75, 1.0);
    bubble(s, 'ai', 'Your shift report is ready: three incidents, all closed, every action logged — plus four lessons to keep.', 0.38, 0.72, 3.9, 1.12, 3.4, 1.85);
    bubble(s, 'person', 'Approve and file.', 0.5, 2.95, 2.0, 0.66, 3.6, 3.65, { who: 'Grace' });
  }

  // ===== 14 · Every role, one co-pilot
  section('The vision');
  {
    const s = scene('bg_vision.jpg', 'THE VISION · Every role, one co-pilot', 'People stay in command — AI helps every role see sooner, act faster and learn', [
      'THE VISION (1 min)',
      'One co-pilot across the whole security operation, each role getting the help it needs: operators see three incidents instead of 312 alarms; duty managers respond from the SOP with one-click approvals; patrols get photo and route; operations anticipate queues; maintenance fixes cameras before they fail; security leadership is audit-ready by default.',
      'It builds on AGIL® Secure ISMS and the systems airports already run, so AI arrives as an upgrade, not a rip-and-replace.',
    ]);
    const vm = marks('bg_vision.jpg').marks;
    const at = id => { const m = vm.find(q => q.id === id); return [m.x * SW + m.w * SW / 2, m.y * SH + m.h * SH / 2]; };
    const B = [
      ['op20', 'Operator', '312 alarms → 3 incidents', 0.35, 2.9], ['op21', 'Duty manager', 'SOP AS-07 · 5/5 steps', 2.6, 2.05], ['op22', 'Patrol', 'Dispatch accepted · 2 min', 5.2, 2.9],
      ['op23', 'Operations', 'Queue breach averted', 7.75, 2.05], ['op24', 'Maintenance', 'WO-5531 raised', 10.35, 2.9],
    ];
    B.forEach(([id, role, msg, bx, by]) => {
      const [cx, cy] = at(id);
      orb(s, cx - 0.27, cy - 0.95, 0.52);
      s.addText([{ text: role.toUpperCase(), options: { fontSize: 9.5, bold: true, color: ICE, charSpacing: 1.2, breakLine: true } }, { text: msg, options: { fontSize: 13, bold: true, color: TXT } }],
        { shape: pres.shapes.ROUNDED_RECTANGULAR_CALLOUT, isTextBox: true, x: bx, y: by, w: 2.35, h: 0.68, margin: [10, 8, 4, 4], valign: 'middle', fill: { color: CARD, transparency: 6 }, line: { color: ICE, width: 1.25 },
          shadow: { type: 'outer', color: '5FB8FF', blur: 10, offset: 0, angle: 0, opacity: 0.5 },
          objectName: `Role bubble ${role} ~tail:${Math.round(((cx - 0.05 - (bx + 1.175)) / 2.35) * 100000)},${Math.round(((cy - 0.95 - (by + 0.34)) / 0.68) * 100000)}` });
    });
    tag(s, 'Head of security · audit-ready by default', 4.85, 0.75, 3.65, GOLD);
  }

  // ===== 15 · See it in action
  {
    const s = pres.addSlide({ masterName: 'PLAIN', sectionTitle: SECTION });
    s.addText([{ text: 'SEE IT IN ACTION · CONCEPT FILM · 3:09', options: { charSpacing: 2 } }], { placeholder: 'kicker' });
    s.addText('The whole night shift, end to end', { placeholder: 'title' });
    const vw = 9.6, vh = vw * 9 / 16, vx = (SW - vw) / 2;
    if (fs.existsSync(FILM)) {
      s.addMedia({ type: 'video', path: FILM, x: vx, y: 1.6, w: vw, h: vh, objectName: 'Concept film (3:09)', cover: 'data:image/png;base64,' + fs.readFileSync(POSTER).toString('base64') });
    }
    T(s, 'Click to play · English narration · scenario, names and data are illustrative', { x: vx, y: 1.6 + vh + 0.08, w: vw, h: 0.26, fontSize: 10, color: MUTED, align: 'center' });
    s.addNotes([
      'CONCEPT FILM (3 min 9 s). The same night shift as these scenes, in motion with narration.',
      'Embedded at 540p to keep this file light; the 1080p film and the version with English/Chinese subtitles are delivered separately.',
    ].join('\n'));
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await finalize(OUT);
  console.log('deck →', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
}

// ---------------------------------------------------------------- theme + post-processing
let applyTheme;
try {
  ({ applyTheme } = require(process.env.PPTX_APPLY_THEME || 'apply_theme'));
} catch {
  applyTheme = async (file, theme) => {
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const part = 'ppt/theme/theme1.xml';
    const slots = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    const scheme = `<a:clrScheme name="${theme.name}">` + slots.map(k => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
    zip.file(part, (await zip.file(part).async('string')).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme).replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${theme.name}"`));
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  };
}
// 1) dark colour mapping on the master; 2) one notes paragraph per line;
// 3) speech-bubble tails: names carrying "~tail:adj1,adj2" set the callout's pointer, then the tag is dropped.
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const master = 'ppt/slideMasters/slideMaster1.xml';
  const mx = await zip.file(master).async('string');
  const swapped = mx.replace('<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"', '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2"');
  if (swapped === mx) throw new Error('slide master colour map not found');
  zip.file(master, swapped);
  for (const name of Object.keys(zip.files)) {
    if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)) {
      const xml = await zip.file(name).async('string');
      zip.file(name, xml.replace(/<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/, (_, t) =>
        t.split(/\r?\n/).map(l => l.trim() ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${l.trim()}</a:t></a:r></a:p>` : '<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>').join('')));
    }
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
      const xml = await zip.file(name).async('string');
      const out = xml.replace(/<p:sp>([\s\S]*?)<\/p:sp>/g, (sp, inner) => {
        const m = inner.match(/name="([^"]*?) ~tail:(-?\d+),(-?\d+)"/);
        if (!m) return sp;
        const av = `<a:avLst><a:gd name="adj1" fmla="val ${m[2]}"/><a:gd name="adj2" fmla="val ${m[3]}"/><a:gd name="adj3" fmla="val 16667"/></a:avLst>`;
        return sp.replace(m[0], `name="${m[1]}"`).replace(/<a:prstGeom prst="wedgeRoundRectCallout"><a:avLst>[\s\S]*?<\/a:avLst><\/a:prstGeom>|<a:prstGeom prst="wedgeRoundRectCallout"><a:avLst\/><\/a:prstGeom>/, `<a:prstGeom prst="wedgeRoundRectCallout">${av}</a:prstGeom>`);
      });
      zip.file(name, out);
    }
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

build().catch(e => { console.error(e); process.exit(1); });
