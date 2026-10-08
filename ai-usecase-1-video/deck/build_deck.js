'use strict';
// AI Use Case 1 — CEO product review deck (editable .pptx), built from the v3 film storyboard.
//
//   npm install --prefix deck                                   (once: pptxgenjs, react-icons, sharp)
//   node deck/make_assets.mjs build/deck-assets                 (stills, backgrounds, 720p film)
//   node deck/build_deck.js build/deck-assets build/dist/AI-UseCase1_AGIL-Secure-ISMS_CEO-deck.pptx
//
// Structured deck: theme colours + fonts, two layouts with placeholders, sections, speaker notes.
// Every slide is native text and shapes over a few film stills, so it stays editable in PowerPoint.
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const Fi = require('react-icons/fi');

const ASSETS = path.resolve(process.argv[2] || 'build/deck-assets');
const OUT = path.resolve(process.argv[3] || 'build/dist/AI-UseCase1_AGIL-Secure-ISMS_CEO-deck.pptx');
const A = f => path.join(ASSETS, f);

// ---------- theme: the film's dark navy, electric blue and alarm colours ----------
// The slide master maps Background 1 to dk1 (navy) and Text 1 to lt1 (white), as dark PowerPoint
// themes do, so new text boxes and slides added in PowerPoint come out white on navy.
const THEME = {
  name: 'AI Use Case Navy',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '0A1428', lt1: 'FFFFFF', dk2: '12203D', lt2: 'A9B7CF',
    accent1: '2D5BFF', accent2: '4D8DFF', accent3: 'FF5A6E', accent4: '2ED47A', accent5: 'FFB020', accent6: '8FB4FF',
    hlink: '8FB4FF', folHlink: 'A9B7CF',
  },
};
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'AI Use Case 1: AI-powered AGIL® Secure ISMS for Airports';
pres.subject = 'CEO product review: concept film, product case and pilot proposal';
pres.author = 'Product Management, Smart Security & Automation';
pres.company = 'ST Engineering';

const C = pres.SchemeColor;
const BG = C.background1, CARD = C.background2, TXT = C.text1, MUTED = C.text2;
const BLUE = C.accent1, BLUE2 = C.accent2, RED = C.accent3, GREEN = C.accent4, AMBER = C.accent5, ICE = C.accent6;
// persona identity colours, as on the avatars in the film's screenshots
const PERSONA = {
  nurul: { name: 'Nurul', role: 'Control room operator', ini: 'NA', hex: '3B6BFF' },
  arjun: { name: 'Arjun', role: 'Patrol officer', ini: 'AR', hex: '13A38B' },
  daniel: { name: 'Daniel', role: 'Duty security manager', ini: 'DT', hex: '8A5CF6' },
  grace: { name: 'Grace', role: 'Head of security', ini: 'GL', hex: 'D9824A' },
};

const SW = 13.333, SH = 7.5, MX = 0.6, CW = SW - 2 * MX, RX = SW - MX;
const FOOTER = 'AI Use Case 1 · AI-powered AGIL® Secure ISMS for Airports';

// ---------- layouts ----------
pres.defineSlideMaster({
  title: 'AI_TITLE',
  background: { color: BG },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: MX, y: 4.8, w: CW, h: 0.32, fontSize: 12, bold: true, color: ICE, margin: 0, valign: 'top', align: 'left' }, text: 'KICKER' } },
    { placeholder: { options: { name: 'title', type: 'title', x: MX, y: 5.1, w: CW, h: 0.86, fontSize: 44, bold: true, color: TXT, margin: 0, valign: 'top', align: 'left' }, text: 'Title' } },
    { placeholder: { options: { name: 'subtitle', type: 'body', x: MX, y: 6.0, w: CW, h: 0.45, fontSize: 20, color: MUTED, margin: 0, valign: 'top', align: 'left' }, text: 'Subtitle' } },
    { placeholder: { options: { name: 'meta', type: 'body', x: MX, y: 6.72, w: CW, h: 0.3, fontSize: 12, color: MUTED, margin: 0, valign: 'top', align: 'left' }, text: 'Team · meeting · date' } },
  ],
});
pres.defineSlideMaster({
  title: 'AI_CONTENT',
  background: { color: BG },
  margin: [0.4, MX, 0.6, MX],
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: MX, y: 0.42, w: CW, h: 0.3, fontSize: 12, bold: true, color: ICE, margin: 0, valign: 'top', align: 'left' }, text: 'SECTION · TOPIC' } },
    { placeholder: { options: { name: 'title', type: 'title', x: MX, y: 0.74, w: CW, h: 0.95, fontSize: 28, bold: true, color: TXT, margin: 0, valign: 'top', align: 'left' }, text: 'Action title: the one message of this slide' } },
    { text: { text: FOOTER, options: { x: MX, y: 7.02, w: 8, h: 0.26, fontSize: 10, color: MUTED, margin: 0, valign: 'middle', isTextBox: true } } },
  ],
  slideNumber: { x: RX - 1.0, y: 7.02, w: 1.0, h: 0.26, fontSize: 10, color: MUTED, align: 'right', margin: 0, valign: 'middle' },
});

// ---------- helpers (fresh option objects on every call: pptxgenjs mutates them) ----------
function content(section, kicker, title, notes) {
  const s = pres.addSlide({ masterName: 'AI_CONTENT', sectionTitle: section });
  s.addText([{ text: kicker, options: { charSpacing: 2 } }], { placeholder: 'kicker' });
  s.addText(title, { placeholder: 'title' });
  s.addNotes(notes);
  return s;
}
function T(s, text, o) {
  s.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: 'top', fontSize: 14, color: TXT }, o));
}
function label(s, text, x, y, w, color, o = {}) {
  T(s, [{ text: text.toUpperCase(), options: { charSpacing: 1.5 } }], Object.assign({ x, y, w, h: 0.24, fontSize: 10.5, bold: true, color }, o));
}
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.r || 0.1,
    fill: { color: o.fill || CARD, transparency: o.ft || 0 },
    line: o.line ? { color: o.line, width: o.lw || 1.25 } : { color: MUTED, width: 0.75, transparency: 80 },
    objectName: o.name || 'Card',
  });
}
function chip(s, text, x, y, w, color, o = {}) {
  s.addText([{ text, options: { charSpacing: o.cs === undefined ? 1 : o.cs } }], {
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.06, isTextBox: true,
    x, y, w, h: o.h || 0.28, margin: 0, align: 'center', valign: 'middle',
    fontSize: o.fs || 10.5, bold: o.bold === undefined ? true : o.bold, color: o.tc || color,
    fill: { color: o.fill || color, transparency: o.ft === undefined ? 84 : o.ft },
    line: { color: o.lc || color, width: 0.75, transparency: o.lt === undefined ? 40 : o.lt },
    objectName: o.name || 'Tag ' + text,
  });
}
const chipW = (text, fs = 10.5) => 0.32 + text.length * fs * 0.0092;
function dot(s, x, y, d, img, fill, o = {}) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill, transparency: o.ft || 0 }, line: { type: 'none' }, objectName: (o.name || 'Icon') + ' circle' });
  const p = d * 0.25;
  s.addImage({ data: img, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: o.name || 'Icon', altText: o.alt || o.name || '' });
}
function avatar(s, who, x, y, d) {
  const p = PERSONA[who];
  s.addText(p.ini, { shape: pres.shapes.OVAL, isTextBox: true, x, y, w: d, h: d, margin: 0, align: 'center', valign: 'middle', fontSize: Math.round(d * 24), bold: true, color: 'FFFFFF', fill: { color: p.hex }, objectName: 'Avatar ' + p.name });
}
function picture(s, file, x, y, w, h, alt) {
  s.addImage({ path: A(file), x, y, w, h, objectName: 'Film still ' + file, altText: alt });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { type: 'none' }, line: { color: MUTED, width: 0.75, transparency: 70 }, objectName: 'Still frame' });
}
function caption(s, text, x, y, w, o = {}) {
  T(s, text, Object.assign({ x, y, w, h: 0.26, fontSize: 10, color: MUTED }, o));
}
async function icon(Comp, hex = 'FFFFFF') {
  const svg = renderToStaticMarkup(React.createElement(Comp, { size: 256 })).replace(/currentColor/g, '#' + hex);
  return 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
}

// ---------- shared content ----------
const MOMENTS = [
  { id: 'm1', time: '02:14', cap: 'TRIAGE', concept: false, who: ['nurul'], film: '1:21–1:34',
    title: '02:14 · 312 alarms become three ranked incidents', short: '312 alarms become three ranked incidents',
    story: ['control room operator, ', 'alarms from every system fused, ranked and explained, ', 'I act on real threats first.'],
    before: '312 raw alarms an hour, triaged by hand.',
    after: 'Three incidents ranked by risk, each with its evidence. 309 nuisance alarms grouped by cause, never dropped.',
    measure: 'Alarms per actionable incident · time to first action · missed critical alarms (must stay at zero)',
    alt: 'AGIL Secure ISMS incident list: tailgating scored 94, unattended bag 71, fence vibration 08 closed as low risk; 309 nuisance alarms grouped by cause',
    notes: [
      'NARRATION (film 1:21): "02:14. Instead of 312 alarms, operator Nurul sees three incidents, ranked by risk, each with its evidence. Nuisance alarms are grouped and explained, never silently dropped."',
      '',
      'TALK TRACK',
      '- Triage fuses alarms from access control, video analytics and perimeter sensors into incidents, and scores each in context.',
      '- Tailgating at Staff Door D-214 scores 94: one badge, two people, door held 14 s, not on the roster, heading to Stand C3.',
      '- Unattended bag at Gate B12 scores 71. A fence vibration scores 08: thermal shows a small animal, so Nurul closes it.',
      '- The other 309 are grouped with reasons (214 cleaning-roster matches, 61 wind and rain, 34 lens glare), logged and reviewable.',
      '- Product point: explainability is the adoption lever. Operators accept a ranking they can check.',
      '- Pilot measure: alarms per actionable incident and time to first action, with zero missed critical alarms as the guardrail.',
    ] },
  { id: 'm2', time: '02:15', cap: 'RESPOND', concept: false, who: ['daniel'], film: '1:34–1:53',
    title: '02:15 · A tailgating response, approved step by step', short: 'A tailgating response, approved step by step',
    story: ['duty manager, ', 'responses recommended from our own SOPs, approved in one click, ', 'every shift gives the same, correct response.'],
    before: 'The response depends on who is on shift.',
    after: 'SOP AS-07 steps recommended; Daniel approves each action in one click. Subject intercepted in 3 min 46 s, every step logged.',
    measure: 'SOP adherence · detection-to-interception time · recommendations accepted vs overridden',
    alt: 'Incident view for Staff Door D-214: door camera replay, evidence list, AI-recommended response grounded in SOP AS-07 and audit trail',
    notes: [
      'NARRATION (film 1:35): "02:15. First, the critical one: someone tailgated through a staff door leading airside. The AI recommends the response from the airport\'s own procedures. Duty manager Daniel approves each action with one click. The subject is intercepted in under four minutes, and everything is logged."',
      '',
      'TALK TRACK',
      '- The recommendation is grounded in the airport\'s SOP AS-07: lock doors D-214 and D-216, track the person, dispatch patrols P-1 and P-5, notify Airport Police, intercept and verify identity.',
      '- Human in command: Daniel approves each of the four interventions; nothing is actioned without a person.',
      '- Every step lands in the audit trail (six entries in this incident), which feeds the 07:00 report.',
      '- Product point: SOP digitisation is a Phase 0 task and a dependency for Respond.',
      '- Pilot measure: SOP adherence, detection-to-interception time, and how often recommendations are accepted or overridden.',
    ] },
  { id: 'm3', time: '02:16', cap: 'INVESTIGATE *', concept: true, who: ['nurul', 'arjun'], film: '1:53–2:11',
    title: '02:16 · "Who left this bag?" answered in seconds', short: '"Who left this bag?" answered in seconds',
    story: ['operator, ', 'to search every camera in plain language, ', 'I find the right person in seconds, not hours.'],
    before: 'Hours of footage, camera by camera.',
    after: 'Owner traced across 38 cameras in 4 s; photo and location sent to the nearest patrol. Bag reclaimed in 4 min, no gate closure.',
    measure: 'Time to locate a person of interest · gate closures and delays avoided · search precision',
    alt: 'Investigation view for Gate B12: plain-language query, four sightings across cameras, floor route and patrol dispatch card accepted by Arjun',
    notes: [
      'NARRATION (film 1:53): "02:16. Meanwhile, an unattended bag at Gate B12. Nurul simply asks: who left this bag? In seconds, the AI traces the owner across 38 cameras to a café, and sends her photo to the nearest patrol. Bag reclaimed in four minutes. No gate closure."',
      '',
      'TALK TRACK',
      '- This links back to the cost of doubt: unattended-bag alerts caused 1,280 delays in a year at Paris airports.',
      '- Plain-language search plus cross-camera tracking turns hours of footage review into seconds; patrol officer Arjun gets the photo, last sighting and route.',
      '- Concept extension: not in the capabilities listed in the InnoChamp 2026 submission. Candidate building block: ST Engineering\'s AGIL® Vision (generative-AI video search), to be explored.',
      '- Needs a privacy impact assessment, role-based access and an audit log of every search before any deployment.',
      '- Pilot measure (Phase 3): time to locate a person of interest; gate closures and delays avoided.',
    ] },
  { id: 'm4', time: '05:10', cap: 'ANTICIPATE · MAINTAIN', concept: false, who: ['daniel'], film: '2:11–2:23',
    title: '05:10 · Queues and failing cameras, seen before the peak', short: 'Queues and faults, seen before the peak',
    story: ['duty manager, ', 'early warning of queues and failing devices, ', 'I act before the peak, not after it.'],
    before: 'Queues and faults found too late.',
    after: '20-min queue forecast at Checkpoint 3 (target 15): two extra lanes approved for 05:30 cut the forecast peak to 11 min. Fogging camera flagged; work order raised.',
    measure: 'Queue-forecast accuracy · service-level breaches · device downtime and blind-spot hours',
    alt: 'Operations outlook: Checkpoint 3 wait-time forecast with a 20-minute peak cut to 11 minutes, lane recommendation approved, camera CAM 4-221 health warning',
    notes: [
      'NARRATION (film 2:11): "05:10. The AI forecasts a 20-minute queue at Checkpoint 3 and recommends opening two more lanes. It also flags a failing camera, before it becomes a blind spot."',
      '',
      'TALK TRACK',
      '- Anticipate: traveller-flow forecasting by zone. Forecast peak 20 min against a 15-min service target; opening lanes 5 and 6 at 05:30 with four officers redeployed brings the forecast peak to 11 min. Daniel approves at 05:10.',
      '- Maintain: device-health prediction. CAM 4-221 (apron, Stands C4–C5) shows lens fogging and is likely unusable within 72 h; work order WO-5531 is raised to fix it before the departures peak.',
      '- Both are in the AI capabilities listed in the InnoChamp 2026 submission (traveller-flow analytics; device and network health with preventive maintenance).',
      '- Pilot measure (Phase 3): forecast accuracy, service-level breaches, device downtime.',
    ] },
  { id: 'm5', time: '07:00', cap: 'REPORT *', concept: true, who: ['grace'], film: '2:23–2:31',
    title: '07:00 · Reports drafted and audit-ready at handover', short: 'Reports drafted and audit-ready at handover',
    story: ['head of security, ', 'every incident documented automatically, ', 'we are always audit-ready.'],
    before: 'Reports and evidence assembled by hand.',
    after: 'Incident report drafted by AI: timeline, evidence and approvals, SOP 5 of 5 steps. Grace reviews and signs off at 07:04.',
    measure: 'Report preparation time · audit-trail completeness · audit findings',
    alt: 'AI-drafted incident report for Staff Door D-214 with timeline, evidence and approvals, beside a shift summary: 312 alarms to 3 incidents, 0 missed escalations',
    notes: [
      'NARRATION (film 2:23): "07:00. Handover. Every incident report is already drafted: timeline, evidence and approvals, ready for audit."',
      '',
      'TALK TRACK',
      '- The report is assembled from the audit trail captured during the night, so nothing is retyped.',
      '- Shift summary: 312 alarms to 3 incidents; 3 min 46 s detection to interception; bag reclaimed in 4 min with no gate closure; 1 queue breach averted; 1 work order raised; 0 missed escalations.',
      '- Concept extension: auto-drafted reports are proposed by this use case, beyond the capabilities in the InnoChamp 2026 submission.',
      '- Pilot measure (Phase 2): report preparation time and audit-trail completeness.',
    ] },
];

async function build() {
  const I = {}; // icons, rendered once
  const ICONS = {
    alert: [Fi.FiAlertTriangle, 'FFFFFF'], cpu: [Fi.FiCpu, 'FFFFFF'], trend: [Fi.FiTrendingUp, 'FFFFFF'], flag: [Fi.FiFlag, 'FFFFFF'],
    bell: [Fi.FiBell, 'FFB3BF'], grid: [Fi.FiGrid, 'FFB3BF'], clock: [Fi.FiClock, 'FFB3BF'], shuffle: [Fi.FiShuffle, 'FFB3BF'], file: [Fi.FiFileText, 'FFB3BF'], warn: [Fi.FiAlertCircle, 'FFB3BF'],
    userCheck: [Fi.FiUserCheck, 'FFFFFF'], eye: [Fi.FiEye, 'FFFFFF'], book: [Fi.FiBookOpen, 'FFFFFF'], shield: [Fi.FiShield, 'FFFFFF'],
    target: [Fi.FiTarget, 'FFFFFF'], repeat: [Fi.FiRepeat, 'FFFFFF'], activity: [Fi.FiActivity, 'FFFFFF'], award: [Fi.FiAward, 'FFFFFF'],
    globe: [Fi.FiGlobe, 'FFFFFF'], users: [Fi.FiUsers, 'FFFFFF'], refresh: [Fi.FiRefreshCw, 'FFFFFF'], pin: [Fi.FiMapPin, 'FFFFFF'],
    layers: [Fi.FiLayers, 'FFFFFF'], link: [Fi.FiLink, 'FFFFFF'], lock: [Fi.FiLock, 'FFFFFF'], crosshair: [Fi.FiCrosshair, 'FFFFFF'],
    play: [Fi.FiPlayCircle, 'FFFFFF'],
  };
  for (const [k, [Comp, hex]] of Object.entries(ICONS)) I[k] = await icon(Comp, hex);

  // ===== 1 · Title =====
  pres.addSection({ title: 'Opening' });
  {
    const s = pres.addSlide({ masterName: 'AI_TITLE', sectionTitle: 'Opening' });
    s.addImage({ path: A('title_bg.png'), x: 0, y: 0, w: SW, h: SH, objectName: 'Background airport map', altText: 'Stylised airport map: cameras, doors and perimeter sensors report to one control room' });
    s.addText([{ text: 'AI USE CASE 1  ·  CONCEPT AND PILOT PROPOSAL', options: { charSpacing: 2 } }], { placeholder: 'kicker' });
    s.addText([
      { text: 'AI-powered ', options: { color: BLUE2 } },
      { text: 'AGIL' }, { text: '®', options: { superscript: true } }, { text: ' Secure ISMS' },
    ], { placeholder: 'title' });
    s.addText('An AI co-pilot for the airport security control room', { placeholder: 'subtitle' });
    s.addText('Product Management · Smart Security & Automation   |   CEO review · October 2026', { placeholder: 'meta' });
    s.addNotes([
      'OPENING (30 s)',
      'Purpose of this session: a decision. We are asking for endorsement to run discovery and a pilot of AI Use Case 1, an AI co-pilot built into AGIL® Secure ISMS (Integrated Security Management System) for airport security control rooms.',
      'Flow: the answer in one page, then a 3-minute concept film, then the product case (problem, users, solution, user scenarios, value) and finally the plan, the risks and the ask.',
      'Edit the meta line (team, meeting, date) and add the presenter name if needed.',
    ].join('\n'));
  }

  // ===== 2 · Executive summary =====
  {
    const s = content('Opening', 'EXECUTIVE SUMMARY', 'From alarm noise to decisive action: an AI co-pilot on our ISMS', [
      'EXECUTIVE SUMMARY (2 min). The whole case on one page; the rest of the deck is the evidence.',
      '- Problem: control rooms drown in alarms. In the film\'s illustrative hour, 312 alarms hide 3 real incidents. Investigation, response and reporting are manual and vary by shift.',
      '- Proposal: an AI co-pilot inside AGIL® Secure ISMS with seven capabilities (Detect, Triage, Investigate, Respond, Report, Anticipate, Maintain). AI recommends; people approve; every step is explained and logged.',
      '- Why us, why now: the platform is already operational at Dhoho Kediri International Airport; most regional airport projects are brownfield upgrades, which suits an add-on AI layer.',
      '- Ask: endorse discovery and a pilot, fund Phase 0–1, nominate a pilot site and an executive sponsor for data governance.',
      'Then: "Let me show you what this looks like in a control room."',
    ].join('\n'));
    const rows = [
      { k: 'Problem', c: RED, ic: 'alert', h: 'Control rooms drown in alarms',
        d: 'Real threats hide among hundreds of nuisance alarms an hour. Investigation, response and reporting are manual and vary by shift; queues and device faults are found too late.' },
      { k: 'Proposal', c: BLUE2, ic: 'cpu', h: 'An AI co-pilot in our ISMS',
        d: 'Seven capabilities from detection and triage to response and reporting, plus queue and device-fault forecasts. AI recommends; people approve; every step is explained and logged.' },
      { k: 'Why us, why now', c: GREEN, ic: 'trend', h: 'An upgrade, not a rebuild',
        d: 'Builds on our ISMS platform, operational at Dhoho Kediri International Airport. ~78% of anticipated MESEA airport projects are brownfield; ~US$67B sits in immigration and integrated-security programmes (2025–2035).' },
      { k: 'The ask', c: AMBER, ic: 'flag', h: 'Endorse discovery and a pilot',
        d: 'Fund Phase 0–1 [budget TBD], nominate a pilot airport [TBD] and appoint an executive sponsor for data access and governance. First go/no-go review in about 12 weeks.' },
    ];
    const rh = 1.1, gap = 0.12;
    rows.forEach((r, i) => {
      const y = 1.8 + i * (rh + gap);
      card(s, MX, y, CW, rh, { name: 'Summary row ' + r.k });
      dot(s, MX + 0.28, y + (rh - 0.62) / 2, 0.62, I[r.ic], r.c, { name: r.k + ' icon' });
      label(s, r.k, MX + 1.15, y + 0.22, 3.6, r.c);
      T(s, r.h, { x: MX + 1.15, y: y + 0.48, w: 3.75, h: 0.45, fontSize: 18, bold: true });
      T(s, r.d, { x: MX + 5.05, y: y + 0.1, w: CW - 5.35, h: rh - 0.2, fontSize: 14, color: MUTED, valign: 'middle' });
    });
  }

  // ===== 3 · The concept film =====
  {
    const s = content('Opening', 'CONCEPT FILM · 3:09', 'See it in action: one night shift in an airport control room', [
      'CONCEPT FILM (3 min 9 s). Click the video to play it in the slide (720p, English narration).',
      'Before playing: "Watch for three things: how 312 alarms become three incidents, how every recommendation shows its evidence, and how people stay in command."',
      'The full-quality 1080p film and a version with burned-in English/Chinese subtitles are delivered with this deck; SRT subtitle files are available in English, Chinese and bilingual.',
      'Scenario, names and data in the film are illustrative and labelled as such on screen.',
    ].join('\n'));
    const vw = 7.9, vh = vw * 9 / 16;
    s.addMedia({ type: 'video', path: A('film_720p.mp4'), x: MX, y: 1.8, w: vw, h: vh, objectName: 'Concept film (3:09)',
      cover: 'data:image/png;base64,' + fs.readFileSync(A('cover.png')).toString('base64') });
    caption(s, 'Click to play · 3:09 · English narration · scenario, names and data are illustrative', MX, 1.8 + vh + 0.1, vw);
    const px = MX + vw + 0.3, pw = RX - px;
    card(s, px, 1.8, pw, vh, { name: 'Chapters panel' });
    dot(s, px + 0.28, 2.02, 0.42, I.play, BLUE, { name: 'Play icon' });
    label(s, 'Chapters', px + 0.85, 2.11, 2.5, ICE);
    const CH = [['0:00', 'The challenge'], ['0:45', 'The solution'], ['1:08', 'Design principles'], ['1:17', 'User scenarios: one night shift'],
      ['2:31', 'Core capabilities'], ['2:39', 'Core value'], ['2:58', 'Close']];
    CH.forEach(([t, l], i) => {
      const y = 2.68 + i * 0.5;
      T(s, t, { x: px + 0.28, y, w: 0.62, h: 0.44, fontSize: 14, bold: true, color: BLUE2 });
      T(s, l, { x: px + 0.95, y, w: pw - 1.15, h: 0.44, fontSize: 14 });
    });
  }

  // ===== 4 · Problem =====
  pres.addSection({ title: 'The challenge' });
  {
    const s = content('The challenge', '01 · THE CHALLENGE', 'Real threats are buried in alarm noise, and doubt is costly', [
      'THE CHALLENGE (1.5 min)',
      '- The film opens at 2 a.m.: 312 alarms in the past hour. Most are nuisance alarms: a door propped open by cleaners, wind on the fence, glare on a lens. A few are real (a tailgating at a staff door, an unattended bag) and they are buried in the noise.',
      '- 312 / 3 / 309 are illustrative, not measured. Establishing the real baseline at the pilot site is a Phase 0 deliverable.',
      '- The cost of doubt is real and public: Paris airports recorded 1,280 delays in one year caused by unattended-bag alerts, and each alert can take up to about 45 minutes to resolve (Groupe ADP data for 2017, reported by Air Journal, January 2018).',
      'Transition: "Behind the noise sit six pain points, each felt by a specific role."',
    ].join('\n'));
    const lx = MX, lw = 4.75;
    label(s, 'One hour in the control room (illustrative)', lx, 1.8, lw, ICE);
    T(s, '312', { x: lx, y: 2.05, w: 1.75, h: 1.0, fontSize: 60, bold: true });
    T(s, 'alarms in the past hour', { x: lx + 1.8, y: 2.35, w: lw - 1.8, h: 0.6, fontSize: 16, color: MUTED, valign: 'middle' });
    T(s, '3', { x: lx, y: 3.1, w: 2.1, h: 0.7, fontSize: 40, bold: true, color: RED });
    T(s, 'real incidents', { x: lx, y: 3.8, w: 2.1, h: 0.5, fontSize: 14, color: MUTED });
    T(s, '309', { x: lx + 2.3, y: 3.1, w: 2.4, h: 0.7, fontSize: 40, bold: true, color: MUTED });
    T(s, 'nuisance: cleaners, wind, lens glare', { x: lx + 2.3, y: 3.8, w: 2.45, h: 0.5, fontSize: 14, color: MUTED });
    label(s, 'The cost of doubt', lx, 4.6, lw, AMBER);
    T(s, '1,280', { x: lx, y: 4.85, w: 2.0, h: 0.75, fontSize: 40, bold: true, color: AMBER });
    T(s, 'delays in one year at Paris airports, caused by unattended-bag alerts', { x: lx + 2.05, y: 4.88, w: lw - 2.05, h: 0.75, fontSize: 14, valign: 'middle' });
    T(s, 'Each alert can take up to ~45 minutes to resolve.', { x: lx, y: 5.7, w: lw, h: 0.3, fontSize: 14, color: MUTED });
    caption(s, 'Source: Groupe ADP data for 2017, reported by Air Journal (January 2018).', lx, 6.25, lw);
    const iw = 6.9, ih = iw * 1110 / 1650, ix = RX - iw;
    picture(s, 'storm.png', ix, 1.8, iw, ih, 'Alarm queue at 02:14: a tailgating alarm and an unattended-object alarm ringed among routine door, fence and motion alarms');
    caption(s, 'Concept film 0:08–0:22: the alarm queue at 02:14, two real alarms among the noise (simulated data)', ix, 1.8 + ih + 0.08, iw);
  }

  // ===== 5 · Six pain points =====
  {
    const s = content('The challenge', '01 · THE CHALLENGE', 'Six pain points, each felt by a specific role', [
      'SIX PAIN POINTS (1.5 min). Each pain point is owned by a role, and each maps to one AI capability later (slide 15).',
      '- Operators: alarm fatigue, a fragmented picture across siloed systems, and slow investigations.',
      '- Duty managers: inconsistent responses (SOPs live on paper) and reactive operations (queues and device faults found too late).',
      '- Head of security: patchy auditability; reports and evidence are compiled by hand.',
      'These come from the operator pain points in the InnoChamp 2026 submission (siloed systems, limited cross-zone visibility, operator fatigue, inconsistent auditability), extended to the full control-room team.',
    ].join('\n'));
    const P = [
      ['bell', 'Alarm fatigue', 'Real threats are buried among hundreds of nuisance alarms.', 'OPERATOR'],
      ['grid', 'Fragmented picture', 'Siloed systems and limited cross-zone view; every alarm is verified by hand.', 'OPERATOR'],
      ['clock', 'Slow investigation', 'Tracing one person means hours of footage across many cameras.', 'OPERATOR · PATROL'],
      ['shuffle', 'Inconsistent response', 'Outcomes depend on who is on shift; SOPs live on paper.', 'DUTY MANAGER'],
      ['file', 'Patchy auditability', 'Reports and evidence are assembled by hand, after the fact.', 'HEAD OF SECURITY'],
      ['warn', 'Reactive operations', 'Queues and device faults surface only after they cause trouble.', 'DUTY MANAGER'],
    ];
    const gw = 0.22, cw = (CW - 2 * gw) / 3, ch = 2.3;
    P.forEach(([ic, h, d, who], i) => {
      const x = MX + (i % 3) * (cw + gw), y = 1.8 + Math.floor(i / 3) * (ch + 0.22);
      card(s, x, y, cw, ch, { name: 'Pain point ' + h });
      dot(s, x + 0.28, y + 0.28, 0.6, I[ic], RED, { ft: 72, name: h + ' icon' });
      T(s, h, { x: x + 1.05, y: y + 0.28, w: cw - 1.3, h: 0.6, fontSize: 18, bold: true, valign: 'middle' });
      T(s, d, { x: x + 0.28, y: y + 1.04, w: cw - 0.56, h: 0.72, fontSize: 14, color: MUTED });
      chip(s, who, x + 0.28, y + 1.8, chipW(who), ICE);
    });
  }

  // ===== 6 · Personas =====
  {
    const s = content('The challenge', '01 · THE CHALLENGE · WHO WE DESIGN FOR', 'Four roles, four jobs to be done', [
      'PERSONAS (1.5 min). The film follows four roles; each has a job to be done, a pain today and a clear change with the AI co-pilot.',
      '- Nurul, control room operator: needs to spot real threats fast across every system.',
      '- Arjun, patrol officer: needs to reach the right person or place fast.',
      '- Daniel, duty security manager: needs the right call on every shift and smooth operations.',
      '- Grace, head of security: needs to prove compliance and keep improving.',
      'Names are illustrative. In Phase 0 we validate these personas with control-room staff at the pilot site.',
    ].join('\n'));
    const R = [
      ['nurul', 'Spot real threats fast across every system, all shift long.', 'Hundreds of alarms an hour across siloed screens.', 'Three ranked incidents with evidence; plain-language search.'],
      ['arjun', 'Reach the right person or place, fast.', 'Vague radio descriptions; searching on foot.', 'Photo, last sighting and location pushed to his device.'],
      ['daniel', 'Make the right call on every shift and keep operations flowing.', 'Response varies by shift; queues and faults spotted too late.', 'SOP-based steps approved in one click; early warnings.'],
      ['grace', 'Prove compliance and keep improving.', 'Reports and evidence compiled by hand, after the fact.', 'Reports drafted with timeline, evidence and approvals.'],
    ];
    const gw = 0.2, cw = (CW - 3 * gw) / 4, y = 1.8;
    R.forEach(([who, job, pain, gain], i) => {
      const x = MX + i * (cw + gw), p = PERSONA[who];
      card(s, x, y, cw, 4.82, { name: 'Persona ' + p.name });
      avatar(s, who, x + 0.25, y + 0.25, 0.7);
      T(s, p.name, { x: x + 1.08, y: y + 0.27, w: cw - 1.25, h: 0.36, fontSize: 18, bold: true });
      T(s, p.role, { x: x + 1.08, y: y + 0.63, w: cw - 1.25, h: 0.3, fontSize: 12, color: MUTED });
      [['Job to be done', ICE, job, TXT], ['Pain today', RED, pain, MUTED], ['With the AI co-pilot', GREEN, gain, TXT]].forEach(([k, c, t, tc], j) => {
        const yy = y + 1.25 + j * 1.18;
        label(s, k, x + 0.25, yy, cw - 0.5, c);
        T(s, t, { x: x + 0.25, y: yy + 0.27, w: cw - 0.5, h: 0.82, fontSize: 14, color: tc });
      });
    });
  }

  // ===== 7 · Solution architecture =====
  pres.addSection({ title: 'The solution' });
  {
    const s = content('The solution', '02 · THE SOLUTION', 'A new AI layer on the ISMS platform we already deploy', [
      'SOLUTION (2 min). Read the diagram bottom-up.',
      '- Existing subsystems: access control, CCTV/VMS, video analytics, intrusion detection, identity management. Airports keep what they have.',
      '- AGIL® Secure ISMS is the deployed platform: one operating picture across subsystems, vendor-neutral and able to work alongside legacy systems, cloud-native or on-premises, zero-trust architecture. Operational at Dhoho Kediri International Airport, Indonesia.',
      '- The AI co-pilot is the new layer proposed by this use case: five capabilities across the incident lifecycle plus two proactive ones.',
      '- People stay in command at the top: the AI recommends, people approve.',
      '- Accuracy: Investigate (plain-language video search) and Report (auto-drafted reports) are concept extensions beyond the AI capabilities listed in the InnoChamp 2026 submission; they are marked with an asterisk.',
    ].join('\n'));
    const cx = MX + 3.05, cwid = RX - cx - 0.25; // content area right of the tier labels
    const tier = (y, h, name, o = {}) => card(s, MX, y, CW, h, Object.assign({ name: 'Tier ' + name }, o));
    // people
    tier(1.8, 0.85, 'People in command');
    T(s, 'People in command', { x: MX + 0.3, y: 1.92, w: 2.65, h: 0.32, fontSize: 16, bold: true });
    T(s, 'AI recommends · people approve', { x: MX + 0.3, y: 2.25, w: 2.65, h: 0.28, fontSize: 11, color: MUTED });
    ['Operators', 'Patrol officers', 'Duty managers', 'Security leadership'].forEach((t, i) => chip(s, t, cx + i * 2.2, 2.05, 2.0, ICE, { h: 0.36, fs: 13, cs: 0, tc: TXT }));
    // AI co-pilot
    tier(2.8, 1.6, 'AI co-pilot', { fill: BLUE, ft: 86, line: BLUE2, lw: 1.5 });
    T(s, 'AI co-pilot', { x: MX + 0.3, y: 2.98, w: 2.65, h: 0.34, fontSize: 18, bold: true });
    chip(s, 'PROPOSED · AI USE CASE 1', MX + 0.3, 3.38, 2.35, BLUE2, { tc: TXT, ft: 60 });
    T(s, 'Assistive AI: recommends, explains, logs', { x: MX + 0.3, y: 3.78, w: 2.65, h: 0.5, fontSize: 11, color: MUTED });
    label(s, 'Incident lifecycle', cx, 2.9, 3, ICE);
    const steps = ['Detect', 'Triage', 'Investigate *', 'Respond', 'Report *'], sw = 1.48, sg = (cwid - 5 * sw) / 4;
    steps.forEach((t, i) => {
      const x = cx + i * (sw + sg);
      chip(s, t, x, 3.16, sw, BLUE, { h: 0.44, fs: 14, cs: 0, tc: 'FFFFFF', ft: 0, lt: 100 });
      if (i < 4) s.addShape(pres.shapes.LINE, { x: x + sw + 0.07, y: 3.38, w: sg - 0.14, h: 0, line: { color: ICE, width: 1.25, endArrowType: 'triangle' }, objectName: 'Flow arrow' });
    });
    label(s, 'Proactive', cx, 3.68, 3, ICE);
    ['Anticipate', 'Maintain'].forEach((t, i) => chip(s, t, cx + i * (sw + sg), 3.92, sw, BLUE, { h: 0.4, fs: 14, cs: 0, tc: TXT, ft: 55, lt: 0 }));
    T(s, 'Traveller-flow and queue forecasts · device and network health', { x: cx + 2 * (sw + sg), y: 3.92, w: cwid - 2 * (sw + sg), h: 0.4, fontSize: 12, color: MUTED, valign: 'middle' });
    // ISMS
    tier(4.55, 1.05, 'AGIL Secure ISMS', { line: GREEN, lw: 1 });
    T(s, [{ text: 'AGIL' }, { text: '®', options: { superscript: true } }, { text: ' Secure ISMS' }], { x: MX + 0.3, y: 4.68, w: 2.65, h: 0.34, fontSize: 18, bold: true });
    chip(s, 'DEPLOYED PLATFORM', MX + 0.3, 5.08, 2.0, GREEN, { tc: GREEN });
    const feats = ['One operating picture', 'Vendor-neutral', 'Integrates legacy systems', 'Cloud or on-premises', 'Zero-trust'];
    let fx = cx;
    feats.forEach(t => { const w = 0.36 + t.length * 0.073; chip(s, t, fx, 4.7, w, MUTED, { h: 0.34, fs: 11.5, cs: 0, bold: false, tc: TXT, ft: 88, lt: 60 }); fx += w + 0.1; });
    T(s, 'Operational at Dhoho Kediri International Airport, Indonesia', { x: cx, y: 5.16, w: cwid, h: 0.3, fontSize: 12, color: MUTED });
    // subsystems
    tier(5.75, 0.85, 'Existing security subsystems');
    T(s, 'Existing security subsystems', { x: MX + 0.3, y: 5.84, w: 2.65, h: 0.68, fontSize: 16, bold: true, valign: 'middle' });
    const subs = ['Access control', 'CCTV / VMS', 'Video analytics', 'Intrusion detection', 'Identity management'], bw = (cwid - 4 * 0.14) / 5;
    subs.forEach((t, i) => chip(s, t, cx + i * (bw + 0.14), 5.94, bw, MUTED, { h: 0.46, fs: 12, cs: 0, bold: false, tc: TXT, ft: 90, lt: 55 }));
    caption(s, '* Concept extension, beyond the AI capabilities described in the InnoChamp 2026 submission.', MX, 6.68, CW);
  }

  // ===== 8 · Design principles =====
  {
    const s = content('The solution', '03 · DESIGN PRINCIPLES', 'Four principles make the AI trustworthy in a control room', [
      'DESIGN PRINCIPLES (1.5 min). These are product requirements, not slogans; each shows up in the film.',
      '- Human in command: the AI only recommends. At 02:15 the duty manager approves each of four actions in one click, and every action is logged.',
      '- Explainable: every score shows its evidence; 309 nuisance alarms are grouped with reasons, never silently dropped.',
      '- Grounded in SOPs: recommendations follow the airport\'s own procedures; the 07:00 report shows SOP AS-07 completed 5 of 5 steps.',
      '- Secure by design: zero-trust architecture, and it can run on-premises so sensitive data stays at the airport.',
      'These principles also answer the main adoption risks (trust, accountability, privacy); see the risks slide.',
    ].join('\n'));
    const P = [
      ['userCheck', 'Human in command', 'AI recommends; people decide. Every intervention is approved and logged.', '02:15 · four actions, four one-click approvals'],
      ['eye', 'Explainable', 'Every score and recommendation shows its evidence. Nuisance alarms are grouped with reasons, never silently dropped.', '02:14 · 309 nuisance alarms grouped by cause'],
      ['book', 'Grounded in SOPs', "Recommendations follow the airport's own procedures and regulations.", '07:00 · SOP AS-07 completed, 5 of 5 steps'],
      ['shield', 'Secure by design', 'Zero-trust architecture. Can run on-premises, so sensitive data stays at the airport.', 'Deployment option: on-premises'],
    ];
    const gw = 0.2, cw = (CW - 3 * gw) / 4, y = 1.8, h = 4.8;
    P.forEach(([ic, t, d, proof], i) => {
      const x = MX + i * (cw + gw);
      card(s, x, y, cw, h, { name: 'Principle ' + t });
      dot(s, x + 0.3, y + 0.3, 0.72, I[ic], BLUE, { name: t + ' icon' });
      T(s, t, { x: x + 0.25, y: y + 1.25, w: cw - 0.5, h: 0.42, fontSize: 17, bold: true });
      T(s, d, { x: x + 0.3, y: y + 1.75, w: cw - 0.6, h: 1.85, fontSize: 14, color: MUTED });
      label(s, 'In the film', x + 0.3, y + 3.72, cw - 0.6, ICE);
      T(s, proof, { x: x + 0.3, y: y + 3.98, w: cw - 0.6, h: 0.6, fontSize: 12 });
    });
  }

  // ===== 9 · One night shift =====
  pres.addSection({ title: 'User scenarios' });
  {
    const s = content('User scenarios', '04 · USER SCENARIOS', 'One night shift: five moments, five user stories', [
      'ONE NIGHT SHIFT (1 min). The film follows one shift through five moments; each is a user story with a measurable outcome.',
      '02:14 triage (Nurul) · 02:15 respond (Daniel) · 02:16 investigate (Nurul and patrol officer Arjun) · 05:10 anticipate and maintain (Daniel) · 07:00 report (Grace).',
      'The next five slides take one moment each: persona, user story, before and with AI, and what we would measure in the pilot.',
    ].join('\n'));
    const gw = 0.2, cw = (CW - 4 * gw) / 5, th = cw * 1122 / 1710;
    s.addShape(pres.shapes.LINE, { x: MX, y: 3.63, w: CW, h: 0, line: { color: MUTED, width: 1.25, transparency: 55 }, objectName: 'Timeline' });
    MOMENTS.forEach((m, i) => {
      const x = MX + i * (cw + gw);
      picture(s, m.id + '.png', x, 1.8, cw, th, m.alt);
      s.addShape(pres.shapes.OVAL, { x: x + 0.02, y: 3.52, w: 0.22, h: 0.22, fill: { color: BLUE2 }, line: { color: BG, width: 2 }, objectName: 'Timeline node ' + m.time });
      T(s, m.time, { x, y: 3.86, w: cw, h: 0.46, fontSize: 24, bold: true });
      T(s, m.short, { x, y: 4.36, w: cw, h: 0.72, fontSize: 14, bold: true });
      T(s, m.who.map(w => PERSONA[w].name + ' · ' + PERSONA[w].role.toLowerCase()).join('\n'), { x, y: 5.12, w: cw, h: 0.48, fontSize: 11, color: MUTED });
      chip(s, m.cap, x, 5.7, Math.min(cw, chipW(m.cap)), m.concept ? AMBER : ICE);
    });
    caption(s, 'Scenario, names and data are illustrative.   * Concept extension.', MX, 6.68, CW);
  }

  // ===== 10–14 · The five moments =====
  MOMENTS.forEach((m, i) => {
    const s = content('User scenarios', `04 · USER SCENARIO ${i + 1} OF 5 · ${m.cap.replace(' *', ' (CONCEPT)')}`, m.title, m.notes.join('\n'));
    const lx = MX, lw = 4.72;
    // persona row
    m.who.forEach((w, j) => avatar(s, w, lx + j * 0.62, 1.8, 0.52));
    const names = m.who.map(w => PERSONA[w]);
    T(s, names.length === 1
      ? [{ text: names[0].name, options: { bold: true, fontSize: 16 } }, { text: '   ' + names[0].role, options: { fontSize: 12, color: MUTED } }]
      : names.map((p, j) => ({ text: (j ? ',  ' : '') + p.name + ' · ' + p.role.toLowerCase(), options: { fontSize: 12, color: MUTED } })),
    { x: lx + 0.62 * m.who.length + 0.08, y: 1.8, w: lw - 0.62 * m.who.length - 0.08, h: 0.52, valign: 'middle' });
    // user story
    card(s, lx, 2.48, lw, 1.5, { name: 'User story card' });
    label(s, 'User story', lx + 0.24, 2.62, 2, ICE);
    T(s, [
      { text: 'As a' + (/^[aeiou]/i.test(m.story[0]) ? 'n ' : ' '), options: { bold: true, color: ICE } }, { text: m.story[0] },
      { text: 'I want ', options: { bold: true, color: ICE } }, { text: m.story[1] },
      { text: 'so that ', options: { bold: true, color: ICE } }, { text: m.story[2] },
    ], { x: lx + 0.24, y: 2.88, w: lw - 0.48, h: 1.04, fontSize: 15 });
    // before / with AI / measure
    label(s, 'Before', lx, 4.12, 2, RED);
    T(s, m.before, { x: lx, y: 4.36, w: lw, h: 0.34, fontSize: 14, color: MUTED });
    label(s, 'With AI', lx, 4.8, 2, GREEN);
    T(s, m.after, { x: lx, y: 5.04, w: lw, h: 0.74, fontSize: 14 });
    label(s, 'Measure in the pilot', lx, 5.9, 3, AMBER);
    T(s, m.measure, { x: lx, y: 6.14, w: lw, h: 0.48, fontSize: 13, color: MUTED });
    // product screen from the film
    const iw = RX - 5.6, ih = iw * 1122 / 1710;
    picture(s, m.id + '.png', 5.6, 1.8, iw, ih, m.alt);
    caption(s, `Concept film ${m.film} · simulated data${m.concept ? ' · concept extension' : ''}`, 5.6, 1.8 + ih + 0.08, iw);
  });

  // ===== 15 · Capabilities =====
  pres.addSection({ title: 'Product and value' });
  {
    const s = content('Product and value', '05 · CORE CAPABILITIES', 'Seven capabilities across the security lifecycle', [
      'CORE CAPABILITIES (1.5 min). Five capabilities follow an incident from detection to report; two are proactive. Each answers one of the six pain points.',
      'Basis column: five capabilities are the AI functions listed for the AGIL® Secure platform in the InnoChamp 2026 submission (unusual-behaviour detection, context-aware alarm triage, AI-recommended responses, traveller-flow analytics, device and network health with preventive maintenance).',
      'Investigate and Report are concept extensions proposed by this use case; they need validation in discovery (feasibility, privacy, cost).',
      'Build, partner or reuse: Investigate could reuse ST Engineering\'s AGIL® Vision generative-AI video search (to be explored).',
    ].join('\n'));
    const head = ['Capability', 'What the AI does', 'Pain point addressed', 'Basis'];
    const R = [
      ['Detect', 'Spots unusual behaviour: tailgating, loitering, unattended items', 'Alarm fatigue', false],
      ['Triage', 'Fuses alarms across systems, scores risk in context and shows the evidence', 'Fragmented picture', false],
      ['Investigate', 'Plain-language video search and cross-camera tracking', 'Slow investigation', true],
      ['Respond', 'Recommends SOP-grounded steps; people approve in one click', 'Inconsistent response', false],
      ['Report', 'Drafts incident reports with timeline, evidence and audit trail', 'Patchy auditability', true],
      ['Anticipate', 'Forecasts passenger flow and congestion by zone', 'Reactive operations', false],
      ['Maintain', 'Monitors device and network health; predicts faults before failure', 'Reactive operations', false],
    ];
    const border = () => [{ type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }];
    const rows = [head.map(h => ({ text: h.toUpperCase(), options: { bold: true, fontSize: 11, color: 'FFFFFF', fill: { color: BLUE }, charSpacing: 1, border: border() } }))];
    R.forEach(([c, d, p, concept]) => rows.push([
      { text: c + (concept ? ' *' : ''), options: { bold: true, fontSize: 15, color: TXT, fill: { color: CARD }, border: border() } },
      { text: d, options: { fontSize: 14, color: TXT, fill: { color: CARD }, border: border() } },
      { text: p, options: { fontSize: 14, color: MUTED, fill: { color: CARD }, border: border() } },
      { text: concept ? 'Concept extension' : 'InnoChamp 2026', options: { fontSize: 12, bold: true, color: concept ? AMBER : GREEN, fill: { color: CARD }, border: border() } },
    ]));
    s.addTable(rows, { x: MX, y: 1.8, w: CW, colW: [1.85, 5.6, 2.45, 2.233], rowH: [0.42, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54], valign: 'middle', margin: [0.04, 0.14, 0.04, 0.14], objectName: 'Capabilities table' });
    caption(s, 'Basis: InnoChamp 2026 = among the AGIL® Secure platform\'s AI capabilities in the InnoChamp 2026 submission; concept extension (*) = proposed by this use case. Rows 1–5 follow an incident; Anticipate and Maintain are proactive.', MX, 6.12, CW, { h: 0.4 });
  }

  // ===== 16 · Value =====
  {
    const s = content('Product and value', '06 · CORE VALUE', 'Clear value for every stakeholder, and for our business', [
      'CORE VALUE (1.5 min).',
      '- Operators get focus: less noise, fewer screens, less fatigue (312 alarms become 3 incidents).',
      '- Duty managers get consistency: the right response on every shift (SOP steps approved in one click).',
      '- The airport gets continuity: fewer disruptions and smoother journeys (no gate closure; queue breach averted).',
      '- Security leadership gets compliance: audit-ready by default (every action logged).',
      'For ST Engineering, the bottom row is a set of hypotheses to validate in discovery, not claims: differentiation in integrated-security tenders, upgrade revenue on existing and brownfield sites, and reuse in other control rooms.',
    ].join('\n'));
    const V = [
      ['target', 'Operators', 'Focus', 'Less noise, fewer screens, less fatigue.', '312 alarms → 3 incidents'],
      ['repeat', 'Duty managers', 'Consistency', 'The right response, on every shift.', 'SOP steps, one-click approvals'],
      ['activity', 'The airport', 'Continuity', 'Fewer disruptions, smoother journeys.', 'No gate closure · queue breach averted'],
      ['award', 'Security leaders', 'Compliance', 'Audit-ready by default.', 'Every action logged'],
    ];
    const gw = 0.2, cw = (CW - 3 * gw) / 4, y = 1.8, h = 2.78;
    V.forEach(([ic, who, val, d, ev], i) => {
      const x = MX + i * (cw + gw);
      card(s, x, y, cw, h, { name: 'Value ' + who });
      dot(s, x + 0.25, y + 0.25, 0.56, I[ic], BLUE, { name: val + ' icon' });
      label(s, who, x + 0.95, y + 0.41, cw - 1.1, ICE);
      T(s, val, { x: x + 0.25, y: y + 0.95, w: cw - 0.5, h: 0.48, fontSize: 24, bold: true });
      T(s, d, { x: x + 0.25, y: y + 1.45, w: cw - 0.5, h: 0.62, fontSize: 14, color: MUTED });
      T(s, [{ text: 'In the film: ', options: { bold: true, color: ICE } }, { text: ev }], { x: x + 0.25, y: y + 2.12, w: cw - 0.5, h: 0.5, fontSize: 12 });
    });
    const by = 4.78, bh = 1.82;
    card(s, MX, by, CW, bh, { name: 'Business hypotheses', line: AMBER, lw: 1 });
    label(s, 'For ST Engineering: hypotheses to validate in discovery', MX + 0.3, by + 0.22, 7, AMBER);
    const H = [
      ['Differentiate', 'AGIL® Secure ISMS in integrated-security tenders with assistive, explainable AI.'],
      ['Upgrade revenue', 'from existing and brownfield sites, sold as add-on AI modules [pricing model TBD].'],
      ['Reuse', 'the co-pilot in other control rooms: smart city, critical infrastructure [to be validated].'],
    ];
    const hw = (CW - 0.6 - 2 * 0.3) / 3;
    H.forEach(([k, t], i) => T(s, [{ text: k + ' ', options: { bold: true, color: TXT } }, { text: t, options: { color: MUTED } }],
      { x: MX + 0.3 + i * (hw + 0.3), y: by + 0.58, w: hw, h: 1.05, fontSize: 14 }));
  }

  // ===== 17 · Why now, why us =====
  {
    const s = content('Product and value', 'WHY NOW · WHY US', 'A large brownfield market, and a deployed platform to build on', [
      'WHY NOW, WHY US (1.5 min)',
      'Why now: across the Middle East and Southeast Asia (MESEA), about US$278B of airport development is expected in 2025–2035, of which around US$67B sits in immigration and integrated-security programmes. Airports add about 4.1B passengers over the decade, and roughly 78% of anticipated projects are brownfield, which favours upgrades such as an AI layer over rip-and-replace.',
      'Why us: the platform is deployed (Dhoho Kediri International Airport is our first overseas airport reference), the architecture is zero-trust and refined over more than 35 years of government-grade deployments, and the Group has AI building blocks worth exploring: AGIL® Vision (generative-AI video search) and AGIL® SecureAI (protection for AI and generative-AI systems against attacks such as prompt injection and data leakage). No integration between these and AGIL® Secure exists today.',
      'Strategic fit: embeds AI in a core Urban Solutions product, in line with the priority of embedding AI across core solutions.',
      'Market figures are internal analysis quoted in the InnoChamp 2026 FastPass submission; verify before external use.',
    ].join('\n'));
    const lw = 5.0;
    label(s, 'Why now', MX, 1.8, 3, ICE);
    const S = [
      ['~US$67B', 'in immigration and integrated-security programmes across MESEA, 2025–2035'],
      ['+4.1B', 'additional passengers over the decade, adding load on security operations'],
      ['~78%', 'of anticipated MESEA airport projects are brownfield: upgrades, not new builds'],
    ];
    S.forEach(([n, t], i) => {
      const y = 2.12 + i * 1.45;
      card(s, MX, y, lw, 1.3, { name: 'Market stat ' + n });
      T(s, n, { x: MX + 0.25, y: y + 0.12, w: lw - 0.5, h: 0.62, fontSize: 32, bold: true, color: i === 2 ? GREEN : TXT });
      T(s, t, { x: MX + 0.25, y: y + 0.72, w: lw - 0.5, h: 0.52, fontSize: 14, color: MUTED });
    });
    const rx = MX + lw + 0.35, rw = RX - rx;
    label(s, 'Why us', rx, 1.8, 3, ICE);
    const W = [
      ['pin', 'Deployed platform', 'AGIL® Secure ISMS is operational at Dhoho Kediri International Airport, Indonesia.'],
      ['shield', 'Government-grade foundation', 'Zero-trust, multi-tier architecture refined over 35+ years of deployments.'],
      ['layers', 'Group AI building blocks', 'Explore AGIL® Vision (generative-AI video search) and AGIL® SecureAI (protects AI systems).'],
      ['trend', 'Strategic fit', 'Embeds AI in a core Urban Solutions product, in line with the AI-across-core-solutions priority.'],
    ];
    W.forEach(([ic, k, t], i) => {
      const y = 2.12 + i * 1.08;
      card(s, rx, y, rw, 0.98, { name: 'Why us ' + k });
      dot(s, rx + 0.22, y + 0.2, 0.56, I[ic], i === 2 ? AMBER : BLUE, { name: k + ' icon' });
      T(s, k, { x: rx + 0.95, y: y + 0.12, w: rw - 1.15, h: 0.32, fontSize: 15, bold: true });
      T(s, t, { x: rx + 0.95, y: y + 0.43, w: rw - 1.15, h: 0.5, fontSize: 14, color: MUTED });
    });
    caption(s, 'Market figures: internal analysis quoted in the InnoChamp 2026 AGIL® Secure FastPass submission (MESEA = Middle East and Southeast Asia); verify before external use.', MX, 6.5, CW, { h: 0.4 });
  }

  // ===== 18 · Roadmap =====
  pres.addSection({ title: 'Plan and ask' });
  {
    const s = content('Plan and ask', 'PLAN · ROADMAP', 'A phased path from discovery to scale, with go/no-go gates', [
      'ROADMAP (1.5 min). Start where the value is clearest and the risk lowest, and earn the right to scale at each gate.',
      '- Phase 0, discover and baseline: pick the pilot site, measure today\'s baseline, digitise priority SOPs, and complete privacy, security and data-access reviews.',
      '- Phase 1, pilot Detect + Triage: run in shadow mode first (AI ranks, operators work as usual, we compare), then assistive mode.',
      '- Phase 2, Respond + Report: SOP-grounded recommendations with one-click approval, and AI-drafted reports from the audit trail.',
      '- Phase 3, Investigate + Anticipate + Maintain, and scale to more terminals and airports.',
      'Durations in brackets are placeholders to confirm in Phase 0 with engineering and the pilot customer.',
    ].join('\n'));
    const PH = [
      ['PHASE 0', 'Discover and baseline', '[8–10 weeks]', ['Select pilot airport and control room', 'Measure baseline KPIs', 'Digitise priority SOPs', 'Privacy, security and data-access review'], 'Gate: baseline and site agreed'],
      ['PHASE 1', 'Pilot: Detect + Triage', '[3–4 months]', ['Shadow mode, then assistive mode', 'Fuse alarms from connected subsystems', 'Explainable risk scores', 'Operator feedback loop'], 'Gate: KPIs met, zero missed critical alarms'],
      ['PHASE 2', 'Respond + Report', '[3–4 months]', ['SOP-grounded response steps', 'One-click approvals with audit trail', 'AI-drafted incident reports'], 'Gate: adoption and audit sign-off'],
      ['PHASE 3', 'Investigate, Anticipate, Maintain', '[6+ months]', ['Plain-language video search and tracking *', 'Queue and flow forecasting', 'Device-health prediction', 'Scale to more terminals and airports'], 'Scale decision'],
    ];
    const gw = 0.2, cw = (CW - 3 * gw) / 4, y = 1.8;
    PH.forEach(([ph, t, dur, items, gate], i) => {
      const x = MX + i * (cw + gw);
      s.addText([{ text: ph, options: { bold: true, fontSize: 12, charSpacing: 1.5, breakLine: true } }, { text: dur, options: { fontSize: 12 } }], {
        shape: pres.shapes.PENTAGON, isTextBox: true, x, y, w: cw, h: 0.72, margin: [16, 6, 0, 0], valign: 'middle', color: 'FFFFFF',
        fill: { color: BLUE, transparency: i < 2 ? 0 : 45 }, line: { type: 'none' }, objectName: ph + ' header' });
      card(s, x, y + 0.86, cw, 3.42, { name: ph + ' scope' });
      T(s, t, { x: x + 0.22, y: y + 1.0, w: cw - 0.44, h: 0.62, fontSize: 16, bold: true });
      T(s, items.map((it, j) => ({ text: it, options: { bullet: { indent: 12 }, breakLine: j < items.length - 1 } })), { x: x + 0.22, y: y + 1.66, w: cw - 0.44, h: 2.5, fontSize: 14, color: MUTED, paraSpaceAfter: 6 });
      chip(s, gate, x, y + 4.42, cw, AMBER, { h: 0.42, fs: 11, cs: 0, tc: AMBER });
    });
    caption(s, 'Durations in brackets are indicative placeholders to confirm in Phase 0.   * Concept extension.', MX, 6.68, CW);
  }

  // ===== 19 · Pilot KPIs =====
  {
    const s = content('Plan and ask', 'PLAN · MEASURES OF SUCCESS', 'We will judge the pilot on outcomes, with a safety guardrail', [
      'MEASURES OF SUCCESS (1 min). Outcome metrics, not model metrics, plus one non-negotiable guardrail: no missed critical alarms.',
      'Baselines are measured at the pilot site in Phase 0; targets are set once the baseline is known, so the brackets are deliberate placeholders.',
      'Later phases add: time to locate a person of interest (Investigate), queue-forecast accuracy and service-level breaches (Anticipate), device downtime (Maintain).',
    ].join('\n'));
    const head = ['KPI', 'What it tells us', 'Baseline', 'Pilot target'];
    const R = [
      ['Alarms per actionable incident', 'Operator workload and noise', 'Measure in Phase 0', '[set after baseline]'],
      ['Time to first action on critical incidents', 'Speed of triage', 'Measure in Phase 0', '[set after baseline]'],
      ['Missed critical alarms (guardrail)', 'Safety of AI triage', 'Measure in Phase 0', 'Zero'],
      ['Recommendations accepted vs overridden', 'Operator trust and AI quality', 'New measure', '[set after baseline]'],
      ['SOP adherence per incident', 'Consistency across shifts', 'Measure in Phase 0', '[set after baseline]'],
      ['Report preparation time', 'Compliance effort', 'Measure in Phase 0', '[set after baseline]'],
      ['Operator workload score', 'Adoption and fatigue', 'Measure in Phase 0', '[set after baseline]'],
    ];
    const border = () => [{ type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }, { type: 'solid', pt: 2.5, color: BG }];
    const rows = [head.map(h => ({ text: h.toUpperCase(), options: { bold: true, fontSize: 11, color: 'FFFFFF', fill: { color: BLUE }, charSpacing: 1, border: border() } }))];
    R.forEach((r, i) => {
      const guard = i === 2;
      rows.push(r.map((t, j) => ({ text: t, options: {
        fontSize: j === 0 ? 15 : 14, bold: j === 0 || (guard && j === 3), border: border(),
        color: guard && (j === 0 || j === 3) ? RED : j === 2 || j === 3 ? MUTED : TXT,
        fill: { color: CARD } } })));
    });
    s.addTable(rows, { x: MX, y: 1.8, w: CW, colW: [4.4, 3.5, 2.1, 2.133], rowH: [0.42, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54], valign: 'middle', margin: [0.04, 0.14, 0.04, 0.14], objectName: 'Pilot KPI table' });
    caption(s, 'Later phases add: time to locate a person of interest, queue-forecast accuracy, service-level breaches and device downtime.', MX, 6.12, CW);
  }

  // ===== 20 · Risks =====
  {
    const s = content('Plan and ask', 'PLAN · RISKS', 'The main risks are known, and the mitigations are designed in', [
      'RISKS AND MITIGATIONS (1.5 min). The design principles were chosen to answer these risks.',
      '- Accuracy: shadow mode first; nothing is deleted, only grouped; a guardrail of zero missed critical alarms gates every phase.',
      '- Trust and adoption: explainability and one-click approve or override; co-design with control-room staff.',
      '- Privacy and regulation: video analytics and person search touch personal data. A privacy impact assessment under local law, role-based access, logging of every search, and an on-premises option.',
      '- Integration: start with subsystems already connected to the ISMS; its vendor-neutral integration layer is the asset.',
      '- Attacks on the AI itself: zero-trust architecture, red-teaming before go-live, and explore AGIL® SecureAI to protect the AI layer.',
    ].join('\n'));
    const R = [
      ['crosshair', 'AI misses or mis-ranks a real threat', 'Shadow mode first; humans review suppressed alarms during the pilot; nothing is deleted; guardrail of zero missed critical alarms.'],
      ['users', "Operators don't trust or adopt it", 'Evidence on every score; one-click approve or override; co-design with control-room staff; training and a feedback loop.'],
      ['lock', 'Privacy and regulation', 'Privacy impact assessment under local law; role-based access; every search logged; on-premises option keeps data at the airport.'],
      ['link', 'Integration with legacy subsystems', "Build on the ISMS's vendor-neutral integrations; pilot with subsystems already connected."],
      ['shield', 'Attacks on the AI itself', 'Zero-trust architecture; red-team before go-live; explore AGIL® SecureAI against prompt injection and data leakage.'],
    ];
    const rh = 0.86, gap = 0.12;
    R.forEach(([ic, r, m], i) => {
      const y = 1.8 + i * (rh + gap);
      card(s, MX, y, CW, rh, { name: 'Risk ' + r });
      dot(s, MX + 0.22, y + (rh - 0.5) / 2, 0.5, I[ic], RED, { ft: 72, name: r + ' icon' });
      T(s, r, { x: MX + 0.9, y, w: 3.6, h: rh, fontSize: 15, bold: true, valign: 'middle' });
      T(s, m, { x: MX + 4.7, y, w: CW - 4.95, h: rh, fontSize: 14, color: MUTED, valign: 'middle' });
    });
    label(s, 'Risk', MX + 0.9, 1.56, 2, MUTED);
    label(s, 'Mitigation', MX + 4.7, 1.56, 2, MUTED);
  }

  // ===== 21 · The ask =====
  {
    const s = content('Plan and ask', 'THE ASK', 'We ask for endorsement to start discovery and a pilot', [
      'THE ASK (2 min). Four decisions today.',
      '1. Endorse AI Use Case 1 as a priority AI initiative for AGIL® Secure ISMS.',
      '2. Fund Phase 0 and Phase 1 (discovery and pilot). Fill in the budget before the meeting.',
      '3. Nominate a pilot airport and control room; an existing AGIL® Secure deployment would shorten integration.',
      '4. Appoint an executive sponsor for data access and governance; the pilot depends on access to live alarm data and SOPs.',
      'Close with the next 90 days on the right, and the first go/no-go review at about week 12.',
      '',
      'LIKELY QUESTIONS',
      '- How is this different from AI features in camera or VMS products? Our hypothesis: vendor-neutral AI at the ISMS layer, across every subsystem, grounded in the airport\'s SOPs and fully logged. A competitive scan is a Phase 0 deliverable.',
      '- What will it cost, and how do we charge for it? Phase 0 produces the business case: build cost, reuse of Group assets, and the pricing model for add-on AI modules.',
      '- What if the AI misses a threat? Shadow mode first, nothing is deleted, people decide, and zero missed critical alarms gates every phase.',
      '- Which customer? An existing AGIL® Secure deployment shortens integration; we propose agreeing the site as part of today\'s decision.',
    ].join('\n'));
    const ASK = [
      ['Endorse', 'AI Use Case 1 as a priority AI initiative for AGIL® Secure ISMS.'],
      ['Fund', 'Phase 0–1: discovery and pilot [budget TBD].'],
      ['Nominate', 'a pilot airport and control room [site TBD], ideally an existing AGIL® Secure deployment.'],
      ['Appoint', 'an executive sponsor for data access and governance.'],
    ];
    const lw = 6.55;
    ASK.forEach(([k, t], i) => {
      const y = 1.8 + i * 1.2;
      card(s, MX, y, lw, 1.06, { name: 'Ask ' + k });
      s.addText(String(i + 1), { shape: pres.shapes.OVAL, isTextBox: true, x: MX + 0.24, y: y + 0.24, w: 0.58, h: 0.58, margin: 0, align: 'center', valign: 'middle', fontSize: 20, bold: true, color: 'FFFFFF', fill: { color: BLUE }, objectName: 'Ask number ' + (i + 1) });
      T(s, [{ text: k + ' ', options: { bold: true, color: TXT, fontSize: 18 } }, { text: t, options: { color: MUTED } }], { x: MX + 1.05, y: y + 0.1, w: lw - 1.3, h: 0.86, fontSize: 15, valign: 'middle' });
    });
    const rx = MX + lw + 0.3, rw = RX - rx;
    card(s, rx, 1.8, rw, 4.66, { name: 'Next 90 days', line: BLUE2, lw: 1 });
    label(s, 'Next 90 days [indicative]', rx + 0.3, 2.02, 4, ICE);
    const N = [
      ['Weeks 1–2', 'Core team formed: product, engineering, security-operations expert'],
      ['Weeks 3–6', 'Pilot site and data-access agreement; baseline KPIs measured'],
      ['Weeks 7–10', 'Priority SOPs digitised; privacy and security review complete'],
      ['Week 12', 'Phase 1 go/no-go review with the executive sponsor'],
    ];
    N.forEach(([w, t], i) => {
      const y = 2.48 + i * 0.96;
      s.addShape(pres.shapes.OVAL, { x: rx + 0.3, y: y + 0.06, w: 0.18, h: 0.18, fill: { color: i === 3 ? AMBER : BLUE2 }, line: { type: 'none' }, objectName: 'Milestone ' + w });
      if (i < 3) s.addShape(pres.shapes.LINE, { x: rx + 0.39, y: y + 0.3, w: 0, h: 0.7, line: { color: MUTED, width: 1, transparency: 55 }, objectName: 'Milestone link' });
      T(s, w, { x: rx + 0.65, y, w: rw - 0.9, h: 0.3, fontSize: 14, bold: true, color: i === 3 ? AMBER : TXT });
      T(s, t, { x: rx + 0.65, y: y + 0.3, w: rw - 0.9, h: 0.58, fontSize: 14, color: MUTED });
    });
  }

  // ===== 22 · Close =====
  {
    const s = pres.addSlide({ masterName: 'AI_TITLE', sectionTitle: 'Plan and ask' });
    s.addImage({ path: A('close_bg.png'), x: 0, y: 0, w: SW, h: SH, objectName: 'Background noise to signal', altText: 'Scattered alarm dots converging into one clear signal line' });
    s.addText([{ text: 'AI USE CASE 1', options: { charSpacing: 2 } }], { placeholder: 'kicker' });
    s.addText('From alarm noise to decisive action', { placeholder: 'title' });
    s.addText([{ text: 'AI-powered AGIL' }, { text: '®', options: { superscript: true } }, { text: ' Secure ISMS for Airports' }], { placeholder: 'subtitle' });
    s.addText('Thank you · Questions and discussion', { placeholder: 'meta' });
    s.addNotes([
      'CLOSE (15 s). "AI-powered AGIL® Secure ISMS: from alarm noise to decisive action."',
      'Restate the four decisions on the previous slide and open for discussion. Appendix A has the film storyboard; Appendix B has sources and accuracy notes.',
    ].join('\n'));
  }

  // ===== 23 · Appendix: storyboard =====
  pres.addSection({ title: 'Appendix' });
  {
    const s = content('Appendix', 'APPENDIX A · FILM STORYBOARD', 'The film in 15 scenes and 3 minutes 9 seconds', [
      'APPENDIX A. One key frame per scene and the timecodes, for jumping to a scene during Q&A or reusing the film in other settings.',
      'Chapters: 01 challenge (0:00), 02 solution (0:45), 03 design principles (1:08), 04 user scenarios (1:17), 05 capabilities (2:31), 06 value (2:39), close (2:58).',
    ].join('\n'));
    const ih = 4.86, iw = ih * 1920 / 1800;
    s.addImage({ path: A('storyboard.jpg'), x: MX, y: 1.8, w: iw, h: ih, objectName: 'Storyboard sheet', altText: 'Storyboard: one captioned key frame for each of the 15 scenes of the concept film' });
    const SC = [
      ['0:00', 'Cold open', 'An airport never sleeps; one control room'],
      ['0:08', 'Alarm storm', '312 alarms in an hour; real threats buried'],
      ['0:22', 'Six pain points', 'One pain point per role'],
      ['0:37', 'Cost of doubt', '1,280 delays from unattended-bag alerts'],
      ['0:45', 'Solution', 'AI co-pilot layer on AGIL® Secure ISMS'],
      ['1:08', 'Design principles', 'Human in command, explainable, SOPs, secure'],
      ['1:17', 'One night shift', 'Five moments, four roles'],
      ['1:21', '02:14 Triage', '312 alarms become 3 ranked incidents'],
      ['1:34', '02:15 Respond', 'SOP steps approved in one click'],
      ['1:53', '02:16 Investigate', 'Bag owner traced across 38 cameras'],
      ['2:11', '05:10 Anticipate', 'Queue and camera faults forecast'],
      ['2:23', '07:00 Report', 'Reports drafted, audit-ready'],
      ['2:31', 'Capabilities', 'Seven capabilities across the lifecycle'],
      ['2:39', 'Core value', 'Focus, consistency, continuity, compliance'],
      ['2:58', 'Close', 'From alarm noise to decisive action'],
    ];
    const tx = MX + iw + 0.3, tw = RX - tx;
    const cell = (t, o) => ({ text: t, options: Object.assign({ fontSize: 11, color: TXT, fill: { color: CARD }, border: [{ type: 'solid', pt: 1.5, color: BG }, { type: 'none' }, { type: 'solid', pt: 1.5, color: BG }, { type: 'none' }] }, o) });
    const rows = [['Time', 'Scene', 'On screen'].map(h => cell(h.toUpperCase(), { bold: true, fontSize: 10, color: 'FFFFFF', fill: { color: BLUE }, charSpacing: 1 }))]
      .concat(SC.map(([t, n, d]) => [cell(t, { bold: true, color: BLUE2 }), cell(n, { bold: true }), cell(d, { color: MUTED })]));
    s.addTable(rows, { x: tx, y: 1.8, w: tw, colW: [0.55, 1.75, tw - 2.3], rowH: 0.3, valign: 'middle', margin: [0, 0.08, 0, 0.08], objectName: 'Scene list' });
  }

  // ===== 24 · Appendix: sources =====
  {
    const s = content('Appendix', 'APPENDIX B · SOURCES AND ACCURACY', 'Sources and accuracy notes', [
      'APPENDIX B. Use this slide if asked "where does this number come from?" or "what exists today versus what is proposed?".',
    ].join('\n'));
    const cw = (CW - 0.3) / 2;
    const col = (x, title, items, color) => {
      card(s, x, 1.8, cw, 4.8, { name: title });
      label(s, title, x + 0.3, 2.02, cw - 0.6, color);
      T(s, items.map((it, j) => ({ text: it, options: { bullet: { indent: 12 }, breakLine: j < items.length - 1 } })), { x: x + 0.3, y: 2.38, w: cw - 0.6, h: 4.1, fontSize: 14, color: MUTED, paraSpaceAfter: 8 });
    };
    col(MX, 'Sources', [
      'Groupe ADP data for 2017, reported by Air Journal (January 2018): 1,280 delays from unattended-bag alerts at Paris airports; up to ~45 minutes per alert.',
      'InnoChamp 2026 AGIL® Secure FastPass submission: the AI capabilities of the AGIL® Secure platform; MESEA market figures (internal analysis); Dhoho Kediri reference; 35+ years of government-grade deployments.',
      'ST Engineering public materials: AGIL® Secure Integrated Security Management Platform (scope, vendor-neutral, legacy integration, cloud-native or on-premises, Dhoho Kediri deployment); AGIL® Vision; AGIL® SecureAI.',
    ], ICE);
    col(MX + cw + 0.3, 'Accuracy notes', [
      'The film\'s scenario, names, times, scores and IDs are illustrative (simulated data), as labelled on screen.',
      'AGIL® Secure ISMS is a deployed platform; the AI co-pilot layer is proposed by this use case.',
      'Investigate (plain-language video search) and Report (auto-drafted reports) are concept extensions.',
      'ISMS = Integrated Security Management System; ST Engineering materials also use ISMP (Integrated Security Management Platform).',
      'Market figures are internal analysis; verify before external use. AGIL® is a registered trademark of ST Engineering.',
    ], AMBER);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await finalize(OUT);
  console.log('deck →', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
}

// ---------- theme + post-processing ----------
// The pptx skill's apply_theme.js when available; otherwise the same edit done here.
let applyTheme;
try {
  ({ applyTheme } = require(process.env.PPTX_APPLY_THEME || 'apply_theme'));
} catch {
  applyTheme = async (file, theme) => {
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const part = 'ppt/theme/theme1.xml';
    const slots = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    const scheme = `<a:clrScheme name="${theme.name}">` + slots.map(k => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
    const xml = (await zip.file(part).async('string')).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
      .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${theme.name}"`);
    zip.file(part, xml);
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  };
}
// 1) dark colour mapping on the slide master (Background 1 = navy, Text 1 = white);
// 2) speaker notes: one paragraph per line, so PowerPoint shows the line breaks.
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const master = 'ppt/slideMasters/slideMaster1.xml';
  const mx = await zip.file(master).async('string');
  const swapped = mx.replace('<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"', '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2"');
  if (swapped === mx) throw new Error('slide master colour map not found');
  zip.file(master, swapped);
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async('string');
    const out = xml.replace(/<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/, (_, t) =>
      t.split(/\r?\n/).map(line => line.trim()
        ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${line.trim()}</a:t></a:r></a:p>`
        : '<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>').join(''));
    zip.file(name, out);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

build().catch(e => { console.error(e); process.exit(1); });
