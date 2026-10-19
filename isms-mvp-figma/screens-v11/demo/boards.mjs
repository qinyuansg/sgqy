// Boards for the five airport demo click flows (dark V11 board style, same grammar as the AgilFence
// and CPO flow boards): one 3480×2040 board per use case (product requirement, user story and
// acceptance criteria verbatim from DEMOFLOWS.md §4 on the left; the steps as cards with a preview,
// the journey stage chip, "User does" / "System shows" lines and who acts; the interaction legend;
// footer) and the DEMO-master-board (~4200×3000) with the journey strip, the three improvements and
// one lane per use case. Previews are the frame thumbs (JPEG) at their own aspect; nothing under 14 px.
// Names, IDs and times are illustrative (demo night, clock times only); people decide.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, text, icon, image, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C } from '../../lib/v11.mjs';
import { STAGES, cursor, hover, btnState, tabHover, focusRing, caret, note, stageChip } from '../../lib/demo.mjs';

let THUMBS = null;
export function useThumbs(dir) { THUMBS = dir; }
const thumbPath = name => path.join(THUMBS, name + '.jpg');
const thumb = name => 'data:image/jpeg;base64,' + fs.readFileSync(thumbPath(name)).toString('base64');

// ---------- frame sizes from the JPEG header (SOF marker); 1400×1069 as the fallback ----------
function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xFF) { i++; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
const SIZES = {};
function frameSize(name) {
  if (!SIZES[name]) { let s = null; try { s = jpegSize(fs.readFileSync(thumbPath(name))); } catch (e) { s = null; } SIZES[name] = s || [1400, 1069]; }
  return SIZES[name];
}

// ---------- palette ----------
const BG = '#05080D', CARD = '#11161E', STROKE = '#2B3442', GRID = '#2A62C9', ID = '#5C6675', WHITE = '#FFFFFF';
const LAV = C.copilot, BLUE = '#3EA9FF', PINK = '#FDD8FD', PLUM = '#480448';
const ROLES = { system: ['System', BLUE], copilot: ['Co-pilot (concept)', LAV], people: ['People decide', WHITE] };
const ILLUSTRATIVE = 'Illustrative scenario · simulated data · clock times only · people decide';
const RESTRICTED = 'Restricted: for CAG security and airside operations stakeholders · not for public display. Names, IDs, times, layout and distances are simulated and stylised.';
const LINE = 'The system detects, explains, recommends and coordinates; people keep the accountable decisions.';

const warn = (...a) => console.warn('board-warn:', ...a);
const fits = (what, w, maxW) => { if (w > maxW + 0.5) warn(`${what}: ${Math.round(w)} px > ${Math.round(maxW)} px`); };

// ---------- the five use cases: requirement / story / acceptance criteria (DEMOFLOWS.md §4) + steps ----------
export const UCS = [
  {
    id: 'UC1', slug: 'overstay', col: C.info, sev: 'Info', kicker: 'UC1 · OVERSTAY (INFO) · DETECT → CORRELATE → CONTEXTUALISE → ORCHESTRATE → ASSIST & GOVERN',
    title: 'Overstay · from a dwell rule to a logged radio check',
    answer: 'One Info alert says which rules fired and who it is; Nurul does the radio check and logs it in under a minute.',
    req: 'Turn an access-control dwell rule into an Info alert that explains which airport rules fired, shows the person on camera, offers the radio-check SOP and records the outcome, without an alarm storm.',
    story: 'As a control-room operator (Nurul), when a contractor stays in a restricted zone after shift, I want one Info alert that tells me which rules fired and who it is, so I can do a radio check and log it in under a minute.',
    ac: [
      'Given K. Lim\'s card has been in B2 since 22:05 and the shift ended at 01:00, when rules (i), (ii), (iii) and (v) fire, then one Info card "Baggage Hall B2 · Overstay 3h 40m in restricted zone" appears (no Co-pilot text on the card).',
      'When the operator opens the card, the Investigation tab lists the four rules as System entries with time, rule number and source, and the three cameras show the person.',
      'When the operator clicks Locate, the map flies to B2 and the context rows show roster (shift ended 01:00), duty zones (B2 outside) and overtime (none).',
      'When the operator opens the SOP Flow tab, the Co-pilot briefing (3 lines, sources) sits above SOP-OPS-003 with steps "Radio check" (critical action: Call K. Lim / Send patrol), "Confirm reason", "Log".',
      'When the operator clicks Acknowledge after the radio check, a confirmation shows "Acknowledged · Nurul A. · 01:52" and the card moves to On Hold; the audit line records rule set, operator and time.',
      'No step closes the alarm automatically.',
    ],
    steps: [
      { frame: 'UC1-S1-detect-info-card-hover', stage: 'detect', title: 'Info card in Real Time Alerts', user: 'Hover · the "Baggage Hall B2 · Overstay 3h 40m in restricted zone" card (last of 7, no Co-pilot line)', shows: 'Card hover state, tooltip "Open alarm", B2 marker on the airport map; rules (i)(ii)(iii)(v) fired', who: ['system'] },
      { frame: 'UC1-S2-correlate-investigation-facts', stage: 'correlate', title: 'Alarm opened · Investigation facts', user: 'Click · the B2 card (ripple, card selected)', shows: 'Active Alarms (Info) with the three B2 cameras on K. Lim; Investigation tab with System rows only: badge in 22:05, shift ended 01:00, rules (i)–(v) with time, rule and source', who: ['system'] },
      { frame: 'UC1-S3-contextualise-locate-b2', stage: 'context', title: 'Locate · map on B2 + context', user: 'Click · Locate', shows: 'Map flies to Baggage Hall B2; context rows: roster (shift ended 01:00), duty zones (B2 outside), overtime (none)', who: ['people', 'system'] },
      { frame: 'UC1-S4-orchestrate-sop-flow-briefing', stage: 'orchestrate', title: 'SOP Flow · briefing + radio-check SOP', user: 'Hover · SOP Flow tab, then Hover · Call K. Lim (the critical action)', shows: 'Co-pilot briefing (3 lines, sources) above SOP-OPS-003: Radio check (Call K. Lim / Send patrol), Confirm reason, Log', who: ['copilot', 'people'] },
      { frame: 'UC1-S5-govern-acknowledge-on-hold', stage: 'govern', title: 'Acknowledge · audit line · On Hold', user: 'Click · Acknowledge after the radio check', shows: 'Toast "Acknowledged · Nurul A. · 01:52 · Logged: rules (i)(ii)(iii)(v) · radio check done"; the card moves to On Hold; nothing closes automatically', who: ['people', 'system'] },
    ],
    decisions: [['Open the alarm, read the facts', 'Nurul A.'], ['Radio check · Call K. Lim', 'Nurul A. · SOP-OPS-003'], ['Acknowledge', 'Nurul A. · 01:52'], ['Close the alarm', 'never automatic']],
  },
  {
    id: 'UC2', slug: 'agilfence', col: C.crit, sev: 'Critical', kicker: 'UC2 · AGILFENCE (CRITICAL) · DETECT → CORRELATE → CONTEXTUALISE → ORCHESTRATE → ASSIST & GOVERN',
    title: 'AgilFence · from a climb on 5-14 to Patrol 2 and PER-005',
    answer: 'Alarm, cameras and the procedure in one place; the operator verifies and dispatches within a minute and the runway strip stays clear.',
    req: 'A fence climb becomes a Critical alert with a system message, linked LiDAR and thermal evidence, nearest cameras on the map, one-click live view, the perimeter SOP with a dispatch approval, and a pre-filled escalation.',
    story: 'As a control-room operator, when AgilFence senses a climb on segment 5-14, I want the alarm, the cameras and the procedure in one place so I can verify and dispatch within a minute and keep the runway strip clear.',
    ac: [
      'Given a climb signature on 5-14 at 02:14:58, then a Critical card and a system message ("AgilFence alarm · Segment 5-14", Open alarm / Locate / Silence) appear within seconds, with an alarm tone icon.',
      'When the operator opens the alarm, the Investigation tab lists fence alarm, LiDAR object 1.7 m, PTZ 7-02 to preset and thermal "1 person" as System entries (no lavender), and the three tiles show PTZ thermal, LiDAR and wide.',
      'When the operator clicks Locate, the map shows the fence line with segment 5-14 marked and a Nearest cameras list (PTZ 7-02 85 m preferred); hovering a camera row highlights it; clicking Open live opens the player with the pre-alarm replay marker.',
      'When the operator opens SOP Flow, the Co-pilot briefing summarises the evidence; steps 1–2 are auto-ticked; step 3 "Dispatch Patrol 2" is a critical action (Dispatch / Choose another); clicking Dispatch records "Approved · Nurul A. · 02:15:30".',
      'When the operator clicks Escalate, the dialog is pre-filled (Category "Perimeter intrusion", Severity Critical, remarks) and Create Incident makes PER-005 the top row of Incident Management.',
      'The tower and police steps are logged with clock times; nothing is decided by the system alone.',
    ],
    steps: [
      { frame: 'UC2-S1-detect-toast', stage: 'detect', title: 'System message + Critical card', user: 'Hover · Open alarm on the system message', shows: 'Toast "AgilFence alarm · Segment 5-14" (Open alarm / Locate / Silence, alarm tone, 02:14:59) and the Critical "Fence Sector 5" card at the top of the list', who: ['system'] },
      { frame: 'UC2-S2-correlate-investigation', stage: 'correlate', title: 'Investigation · four linked entries', user: 'Click · Investigation tab', shows: 'System rows only: fence alarm 5-14 02:14:58, LiDAR object 1.7 m, PTZ 7-02 to preset, thermal "1 person"; tiles PTZ thermal, LiDAR, wide', who: ['system'] },
      { frame: 'UC2-S3-contextualise-locate-live', stage: 'context', title: 'Locate · nearest cameras · Open live', user: 'Click · Open live on the PTZ 7-02 row (85 m, hovered)', shows: 'Fence line with segment 5-14 marked, Nearest cameras list, player with PTZ 7-02 live and the pre-alarm replay marker', who: ['people', 'system'] },
      { frame: 'UC2-S4-sop-hover', stage: 'orchestrate', title: 'SOP Flow · briefing · hover Dispatch', user: 'Hover · Dispatch (step 3 "Dispatch Patrol 2", the critical action)', shows: 'Co-pilot briefing (sources AgilFence 5-14 · LiDAR L-5B · PTZ 7-02) above the perimeter SOP; steps 1–2 auto-ticked; Dispatch / Choose another', who: ['copilot', 'people'] },
      { frame: 'UC2-S5-sop-approved', stage: 'orchestrate', title: 'Dispatch clicked · approved', user: 'Click · Dispatch', shows: 'Step 3 reads "Approved · Nurul A. · 02:15:30"; toast "Patrol 2 dispatched · ETA 02:18:30"', who: ['people', 'system'] },
      { frame: 'UC2-S6-escalate-hover', stage: 'govern', title: 'Hover Escalate · steps logged', user: 'Hover · Escalate', shows: 'Button hover state; tower and police steps logged with clock times — nothing decided by the system alone', who: ['people', 'system'] },
      { frame: 'UC2-S7-escalate-dialog', stage: 'govern', title: 'Escalate dialog pre-filled', user: 'Click · Create Incident', shows: 'Dialog pre-filled by Co-pilot: Category "Perimeter intrusion", Severity Critical, remarks (grey hint); the operator edits before creating', who: ['copilot', 'people'] },
      { frame: 'UC2-S8-incident-created', stage: 'govern', title: 'Incident PER-005 created', user: 'Hover · Incident Management (header)', shows: 'Toast "Incident PER-005 created · 02:16:10 · Perimeter intrusion · Critical · now the top row of Incident Management"', who: ['system', 'people'] },
    ],
    decisions: [['Verify on video (Open live)', 'operator · 02:15:12'], ['Dispatch Patrol 2', 'Approved · Nurul A. · 02:15:30'], ['Create Incident PER-005', 'Nurul A. · 02:16:10'], ['Tower and police steps', 'logged with clock times']],
  },
  {
    id: 'UC3', slug: 'spoofing', col: C.warn, sev: 'Warning', kicker: 'UC3 · IDENTITY SPOOFING (WARNING) · DETECT → CORRELATE → CONTEXTUALISE → ORCHESTRATE → ASSIST & GOVERN',
    title: 'Identity spoofing · one card, two doors, four minutes',
    answer: 'Both doors side by side, the travel time and the legacy SSID; the operator suspends the right credential and escalates with evidence.',
    req: 'Detect one credential used at two doors too far apart, show both doors side by side with the holder\'s appearance, surface the legacy SSID, and offer the card-suspension SOP with a human approval.',
    story: 'As a control-room operator, when card S-20931 opens T3 A17 and T1 C2 four minutes apart, I want to see both doors, the travel time and who used the card, so I can suspend the right credential and escalate with evidence.',
    ac: [
      'Given grants at A17 02:09:12 and C2 02:13:20 (fastest route 19 min), then a Warning card "T1 Door C2 · Same card used at T3 A17 4 min earlier" appears.',
      'When opened, the Investigation tab lists both grants, the appearance difference, 3 denials at C3 and the off-roster access as System entries; camera tiles show C2 now and A17 at 02:09; hovering a tile enlarges it with "Compare" controls.',
      'When the operator clicks Locate, the map shows A17 and C2 with the 19-minute route and the legacy-SSID note.',
      'When the operator opens SOP Flow, the briefing explains the impossible presence and the legacy SSID; step "Suspend card S-20931 (both SSIDs)" is a critical action (Suspend / Keep active); step "Notify duty manager" follows.',
      'When the operator clicks Escalate, the dialog is pre-filled (Category "Credential misuse", Severity Warning) and Create Incident records IDS-207.',
    ],
    steps: [
      { frame: 'UC3-S1-detect-warning-card-hover', stage: 'detect', title: 'Warning card · same card, two doors', user: 'Hover · the "T1 Door C2 · Same card used at T3 A17 4 min earlier" card', shows: 'Card hover state and tooltip "Open alarm": one card, two doors, 4 min apart (fastest route 19 min)', who: ['system'] },
      { frame: 'UC3-S2-correlate-investigation-facts', stage: 'correlate', title: 'Alarm opened · five linked entries', user: 'Click · the T1 Door C2 card', shows: 'Investigation, System rows only: grants A17 02:09:12 and C2 02:13:20, appearance difference, 3 denials at C3, off-roster access; tiles C2 now and A17 at 02:09', who: ['system'] },
      { frame: 'UC3-S3-contextualise-compare-hover', stage: 'context', title: 'Hover A17 tile → Compare', user: 'Hover · the A17 tile', shows: 'Tile enlarges with "Compare with C2 (now)": C2 now vs A17 02:09, 19-min route, 4 min elapsed', who: ['people', 'system'] },
      { frame: 'UC3-S4-contextualise-locate-route', stage: 'context', title: 'Locate · both doors on the twin', user: 'Click · Locate', shows: 'A17 and C2 on the map with the 19-minute route and the legacy-SSID note (S-20931-L)', who: ['people', 'system'] },
      { frame: 'UC3-S5-orchestrate-sop-hover-suspend', stage: 'orchestrate', title: 'SOP Flow · briefing · hover Suspend', user: 'Hover · Suspend (both SSIDs)', shows: 'Co-pilot briefing (impossible presence, legacy SSID) above SOP-ACS-007; "Suspend card S-20931 (both SSIDs)" is the critical action: Suspend / Keep active', who: ['copilot', 'people'] },
      { frame: 'UC3-S6-orchestrate-suspend-approved', stage: 'orchestrate', title: 'Suspend clicked · approved', user: 'Click · Suspend', shows: '"Approved · Nurul A. · 02:16:05"; toast "Card S-20931 suspended · both SSIDs · ACS confirmed 02:16:06"; next step "Notify duty manager"', who: ['people', 'system'] },
      { frame: 'UC3-S7-govern-escalate-dialog', stage: 'govern', title: 'Escalate dialog pre-filled', user: 'Click · Create Incident', shows: 'Dialog pre-filled: Category "Credential misuse", Severity Warning, remarks with the evidence; the operator checks before creating', who: ['copilot', 'people'] },
      { frame: 'UC3-S8-govern-incident-created', stage: 'govern', title: 'Incident IDS-207 created', user: 'Hover · Incident Management (header)', shows: 'Toast "Incident IDS-207 created · 02:17:10 · Credential misuse · Warning · listed in Incident Management"', who: ['system', 'people'] },
    ],
    decisions: [['Compare the two doors', 'operator · 02:14'], ['Suspend card S-20931 (both SSIDs)', 'Approved · Nurul A. · 02:16:05'], ['Notify duty manager', 'next SOP step · people'], ['Create Incident IDS-207', 'Nurul A. · 02:17:10']],
  },
  {
    id: 'UC4', slug: 'ask', col: LAV, sev: 'Ask', kicker: 'UC4 · SEARCH / ASK CO-PILOT · ASSIST & GOVERN → CORRELATE → CONTEXTUALISE → ASSIST & GOVERN',
    title: 'Search / Ask Co-pilot · one question instead of five screens',
    answer: 'The search bar answers in one sentence with sources and result cards that open or locate the alarm; every answer is logged.',
    req: 'The existing search bar accepts plain-English questions; answers come with sources and result cards that open the alarm or Locate it; recent questions and follow-ups are one click away; every answer is logged.',
    story: 'As a duty manager (Daniel), at 02:30 I want to ask "Show critical incidents in Terminal 5 in the last hour" and get a one-line answer with the incidents and their sources, so I do not have to search five screens.',
    ac: [
      'Given the search bar reads "Search or ask Co-pilot…", when it gains focus, then a lavender ring and a dropdown with three recent questions appear.',
      'When the user types "Show crit", then suggestions complete the question; Enter runs it.',
      'When the answer returns, then one headline sentence, the result cards (severity, title, time), a Sources line and three follow-up chips are shown; the dropdown says "From live events · 02:30".',
      'When the user hovers a result card, then Locate and Open alarm are underlined and a tooltip names the camera; clicking Locate flies the map to the pin and selects the card.',
      'When the user clicks a follow-up chip, then the next answer replaces the first and the previous question stays available in Recent.',
      'Every question and answer is logged with user, time and the sources used.',
    ],
    steps: [
      { frame: 'UC4-S1-search-idle-hover', stage: 'govern', title: 'Search bar idle · hover', user: 'Hover · the search bar ("Search or ask Co-pilot…")', shows: 'Hover state and tooltip "Search, or ask a question"; home view with Real Time Alerts (no Co-pilot lines on the cards)', who: ['system'] },
      { frame: 'UC4-S2-search-focus-recent', stage: 'govern', title: 'Focused · recent questions', user: 'Click · the search bar', shows: 'Lavender focus ring, caret, dropdown with three recent questions', who: ['system'] },
      { frame: 'UC4-S3-typing-suggestions', stage: 'govern', title: 'Typing "Show crit" · suggestions', user: 'Type · Show crit', shows: 'Suggestions complete the question ("Show critical incidents in Terminal 5 in the last hour"), first highlighted; Enter runs it', who: ['copilot'] },
      { frame: 'UC4-S4-answer-hover-result', stage: 'correlate', title: 'Answer · results, sources, follow-ups', user: 'Hover · the T5 Pier B result card', shows: 'One headline sentence, result cards (severity, title, time), Sources line, three follow-up chips, "From live events · 02:30"; Locate and Open alarm underlined, tooltip names the camera', who: ['copilot', 'people'] },
      { frame: 'UC4-S5-locate-map-collapsed', stage: 'context', title: 'Locate clicked · map flies', user: 'Click · Locate', shows: 'Map flies to the T5 Pier B door pin, the card is selected, the answer collapses to a one-line summary', who: ['people', 'system'] },
      { frame: 'UC4-S6-followup-second-answer', stage: 'govern', title: 'Follow-up · second answer', user: 'Click · the follow-up chip "Where was this person last detected?"', shows: 'The second answer replaces the first; question 1 stays in Recent; every question and answer is logged with user, time and sources', who: ['copilot', 'people'] },
    ],
    decisions: [['Ask the question', 'Daniel L. · 02:30'], ['Open alarm / Locate from a result', 'one click · people'], ['Follow-up question', 'Daniel L.'], ['Every answer logged', 'user · time · sources']],
  },
  {
    id: 'UC5', slug: 'incidents', col: BLUE, sev: 'Report', kicker: 'UC5 · INCIDENT MANAGEMENT · OVERALL LIST AND REPORT · DETECT → CORRELATE → CONTEXTUALISE → ORCHESTRATE → ASSIST & GOVERN',
    title: 'Incident Management · the overall list and a drafted report',
    answer: 'Grace reviews, signs off and exports the night at the 07:00 handover without rebuilding it from logs.',
    req: 'One list of every incident across the night with filters, search, export and a detail pane that holds the Co-pilot report draft, the SOP record and a governed close (reason, sign-off, audit).',
    story: 'As head of security (Grace) at the 07:00 handover, I want the overall incident list and a drafted report per incident, so I can review, sign off and export without rebuilding the night from logs.',
    ac: [
      'When the user clicks Incident Management in the header (hover state shown), then the list opens with Status, Severity, Location, Date & Time, Code, Closed By, Device ID and the count "(24) · 5 Open".',
      'When the user opens the Status filter, then All / Open / Closed are selectable; when the user types "PER-005" in the search, the list filters to the row.',
      'When the user hovers a row it highlights; when the user clicks it, the detail pane shows the event, cameras, Remarks (Co-pilot report draft tagged, with the operator\'s remark) and the SOP Flow tab with the completed steps and approvals.',
      'When the user clicks Close Incident, then a dialog asks for the closing reason and sign-off; Confirm sets the row to Closed with "Closed By · Grace T. · 07:02" and writes the audit line.',
      'When the user hovers Export, then the choices PDF / CSV appear; the export carries the filters applied.',
    ],
    steps: [
      { frame: 'UC5-S1-detect-open-incident-management', stage: 'detect', title: 'Header · Incident Management', user: 'Hover + click · Incident Management (header button)', shows: 'Button hover and click ripple on the console (plain alert cards); it opens the overall incident list "(24) · 5 Open"', who: ['people', 'system'] },
      { frame: 'UC5-S2-correlate-status-filter', stage: 'correlate', title: 'Overall list · Status filter', user: 'Hover · Status › Open in the filter menu', shows: 'List of 24 with Status, Severity, Location, Date & Time, Code, Closed By, Device ID; menu All ✓ / Open / Closed; PER-005 row hovered', who: ['system', 'people'] },
      { frame: 'UC5-S3-contextualise-search-per-005', stage: 'context', title: 'Search PER-005 · filtered', user: 'Type · PER-005 in the search', shows: '"Showing 1 of 24", filtered to PER-005, row highlighted on hover', who: ['system'] },
      { frame: 'UC5-S4-contextualise-detail-report-draft', stage: 'context', title: 'Row clicked · detail · report draft', user: 'Click · the PER-005 row', shows: 'Detail pane: event, cameras, Remarks with the Co-pilot report draft (tagged) and the operator\'s remark', who: ['copilot', 'people'] },
      { frame: 'UC5-S5-orchestrate-sop-record-approvals', stage: 'orchestrate', title: 'SOP Flow tab · record of approvals', user: 'Click · SOP Flow tab', shows: 'Co-pilot briefing and the completed steps with their approvals: names and clock times', who: ['copilot', 'system'] },
      { frame: 'UC5-S6-govern-close-dialog', stage: 'govern', title: 'Close Incident · dialog', user: 'Click · Confirm close', shows: 'Dialog asks for the closing reason and the sign-off (Grace T. · Head of Security) before the audit line is written', who: ['people'] },
      { frame: 'UC5-S7-govern-closed-export', stage: 'govern', title: 'Closed · Export menu', user: 'Hover · Export', shows: 'Row Closed · "Closed By · Grace T. · 07:02"; toast "Incident PER-005 closed · audit line written"; Export PDF / CSV carry the filters', who: ['system', 'people'] },
    ],
    decisions: [['Review the report draft', 'Grace T. · 07:00'], ['Close Incident · reason + sign-off', 'Grace T. · 07:02'], ['Export PDF / CSV', 'carries the filters'], ['Audit line', 'written by the system, signed by people']],
  },
];

// ---------- shared pieces ----------
function board(F, BW, BH) {
  let gr = '';
  for (let x = 0; x <= BW; x += 80) gr += line(x, 0, x, BH, { stroke: GRID, so: 0.06 });
  for (let y = 0; y <= BH; y += 80) gr += line(0, y, BW, y, { stroke: GRID, so: 0.06 });
  return rect(0, 0, BW, BH, { fill: BG }) + g(F, 'Grid', gr);
}
function chip(F, x, y, lab, col) {
  const w = textWidth(lab, 14, 500) + 30;
  return { svg: g(F, 'Chip ' + lab, rect(x, y, w, 26, { r: 13, fill: '#1D232C', stroke: col, so: 0.75 }) + circle(x + 13, y + 13, 4.5, { fill: col }) + text(x + 23, y + 18, lab, { size: 14, weight: 500, fill: WHITE })), w };
}
const disc = (x, y, n, col = C.blue, r = 22, size = 22, ink = WHITE) => circle(x, y, r, { fill: col }) + text(x, y + size * 0.36, String(n), { size, weight: 700, fill: ink, anchor: 'middle' });
const arrowH = (x1, x2, y) => pathEl(`M${f(x1 + 8)} ${f(y)} L${f(x2 - 10)} ${f(y)} M${f(x2 - 22)} ${f(y - 10)} L${f(x2 - 10)} ${f(y)} L${f(x2 - 22)} ${f(y + 10)}`, { stroke: '#8C96A6', sw: 3, cap: 'round', join: 'round' });
// preview of a frame, sized by width at the thumb's own aspect, clipped, 1 px stroke
function preview(F, name, x, y, w) {
  const [fw, fh] = frameSize(name), h = w * fh / fw;
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`);
  return `<g clip-path="${clip}">${image(F, 'Preview ' + name, thumb(name), x, y, w, h)}</g>` + rect(x, y, w, h, { stroke: STROKE });
}
// preview centred in a box with the 1400×1069 aspect (the 1600-wide Incident Management frames are shorter)
function previewBox(F, name, x, y, w) {
  const [fw, fh] = frameSize(name), boxH = w * 1069 / 1400, ph = w * fh / fw;
  return { svg: preview(F, name, x, y + (boxH - ph) / 2, w), boxH };
}
function pillTag(F, x, y, label) {
  const w = textWidth(label, 18, 500) + 60;
  return g(F, 'Tag ' + label, rect(x - w + 0.5, y + 0.5, w, 44, { r: 22, fill: '#1D232C', stroke: '#4A505B' }) + text(x - w / 2, y + 29, label, { size: 18, weight: 500, fill: C.t3, anchor: 'middle' }));
}
function heading(F, BW, o) {
  const size = o.titleSize || 64, maxW = o.maxW || BW - 1200;
  let s = text(100, 120, o.kicker, { size: 20, weight: 700, ls: 2.5, fill: o.col });
  s += text(100, 196, o.title, { size, weight: 700, fill: WHITE });
  if (o.sub) s += text(100, 248, o.sub, { size: 26, fill: C.t2 });
  fits('heading title', textWidth(o.title, size, 700), maxW); fits('heading sub', textWidth(o.sub || '', 26), o.subMaxW || maxW + 600);
  return g(F, 'Heading', s) + pillTag(F, BW - 100, 92, 'Illustrative scenario · simulated data');
}
function whoActs(F, x, y) {
  let s = text(x, y, 'WHO ACTS', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  let cx = x;
  for (const k of Object.keys(ROLES)) { const [lab, col] = ROLES[k]; const c = chip(F, cx, y + 16, lab, col); s += c.svg; cx += c.w + 10; }
  return { svg: g(F, 'Who acts', s), w: cx - x - 10 };
}
function footer(F, BW, BH, o) {
  let s = text(100, BH - 68, RESTRICTED, { size: 19, fill: C.t2 });
  s += text(100, BH - 36, ILLUSTRATIVE, { size: 19, weight: 500, fill: WHITE });
  s += text(BW - 100, BH - 36, o.note, { size: 19, fill: C.t2, anchor: 'end' });
  fits('footer', textWidth(ILLUSTRATIVE, 19, 500) + 40 + textWidth(o.note, 19), BW - 200);
  return g(F, 'Footer', s);
}

// ---------- the interaction legend (the states of lib/demo.mjs, drawn with the kit itself) ----------
const LEGEND_ITEMS = [
  ['Hover on a card / row', (F, x, y) => { const w = 92; return rect(x, y, w, 30, { fill: C.panel }) + rect(x, y, 4, 30, { fill: C.info }) + rect(x + 14, y + 10, 46, 4, { r: 2, fill: C.t2 }) + rect(x + 14, y + 19, 60, 3, { r: 1.5, fill: '#5C6675' }) + hover(F, x, y, w, 30, { name: 'legend' }) + cursor(F, x + 70, y + 12); }, 92],
  ['Hover on a button', (F, x, y) => { const w = 84; return rect(x, y, w, 30, { r: 8, fill: C.tabOn }) + text(x + w / 2, y + 20, 'Locate', { size: 14, weight: 500, fill: WHITE, anchor: 'middle' }) + btnState(F, x, y, w, 30, 'hover'); }, 84],
  ['Hover on a tab', (F, x, y) => { const w = 110; return rect(x, y, w, 30, { fill: C.tabOff }) + tabHover(F, x, y, w, 30) + text(x + w / 2, y + 20, 'SOP Flow', { size: 14, weight: 500, fill: WHITE, anchor: 'middle' }); }, 110],
  ['Focus on the search bar', (F, x, y) => { const w = 120; return rect(x, y, w, 30, { r: 8, fill: '#3A3F48' }) + focusRing(F, x, y, w, 30) + text(x + 12, y + 20, 'Show crit', { size: 14, fill: WHITE }) + caret(F, x + 12 + textWidth('Show crit', 14) + 2, y + 6, 18); }, 124],
  ['Click (ripple)', (F, x, y) => cursor(F, x + 36, y + 6, { click: true }), 74],
  ['Pressed / active', (F, x, y) => { const w = 92; return rect(x, y, w, 30, { r: 8, fill: C.tabOn }) + text(x + w / 2, y + 20, 'Dispatch', { size: 14, weight: 500, fill: WHITE, anchor: 'middle' }) + btnState(F, x, y, w, 30, 'pressed'); }, 92],
  ['What the user does', (F, x, y) => note(F, x, y + 1, 'Click · SOP Flow tab', { size: 14 }).svg, textWidth('Click · SOP Flow tab', 14, 700) + 24],
  ['What appears', (F, x, y) => note(F, x, y + 1, 'Shows · Co-pilot briefing', { kind: 'shows', size: 14 }).svg, textWidth('Shows · Co-pilot briefing', 14, 700) + 24],
];
// flows the items left to right within maxW; returns {svg, h}
function legend(F, x, y, maxW, o = {}) {
  let s = text(x, y, 'INTERACTION STATES · THE CLICK DESIGN SYSTEM', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  s += text(x, y + 22, 'Drawn with lib/demo.mjs · layers "… NEW" and "Annotation …" can be hidden in Figma', { size: 14, fill: ID });
  let cx = x, cy = y + 44, rowH = o.rowH || 52;
  const place = (w, draw) => { if (cx > x && cx + w > x + maxW) { cx = x; cy += rowH; } const r = draw(cx, cy); cx += w + (o.gap || 36); return r; };
  for (const [lab, draw, sw] of LEGEND_ITEMS) {
    const lw = textWidth(lab, 15), w = sw + 12 + lw;
    s += place(w, (px, py) => draw(F, px, py) + text(px + sw + 12, py + 20, lab, { size: 15, fill: C.t2 }));
  }
  // stage chips
  {
    const keys = Object.keys(STAGES), lab = 'Journey stage';
    let w = textWidth(lab, 15) + 12; for (const k of keys) w += textWidth(STAGES[k][0].toUpperCase(), 14, 700, 1) + 30 + 8;
    s += place(w, (px, py) => { let r = '', ax = px; for (const k of keys) { const c = stageChip(F, ax, py + 2, k, { size: 14, h: 26 }); r += c.svg; ax += c.w + 8; } return r + text(ax + 4, py + 20, lab, { size: 15, fill: C.t2 }); });
  }
  return { svg: g(F, 'Interaction legend', s), h: cy + 34 - y };
}

// ---------- left column: requirement, story, acceptance criteria ----------
function brief(F, x, y, w, uc) {
  let s = '', yy = y;
  const section = (label, col) => { s += text(x, yy, label, { size: 15, weight: 700, ls: 1.5, fill: col || C.t2 }); yy += 30; };
  const paragraph = (str, size, lh, weight, fill) => { const lines = wrap(str, w, size, weight || 400); lines.forEach((l, i) => { s += text(x, yy + i * lh, l, { size, weight: weight || 400, fill: fill || C.t1 }); }); yy += lines.length * lh; };
  section('PRODUCT REQUIREMENT', uc.col); paragraph(uc.req, 18, 26); yy += 30;
  section('USER STORY', uc.col); paragraph(uc.story, 18, 26, 400, WHITE); yy += 30;
  section('ACCEPTANCE CRITERIA', uc.col);
  uc.ac.forEach((a, i) => {
    const ind = 34, lines = wrap(a, w - ind, 17);
    s += circle(x + 11, yy - 6, 11, { fill: uc.col, fo: 0.2, stroke: uc.col, so: 0.9 }) + text(x + 11, yy - 1, String(i + 1), { size: 14, weight: 700, fill: WHITE, anchor: 'middle' });
    lines.forEach((l, j) => { s += text(x + ind, yy + j * 24, l, { size: 17, fill: C.t1 }); });
    yy += lines.length * 24 + 10;
  });
  return { svg: g(F, 'Brief · requirement, story, acceptance criteria', s), h: yy - y };
}
// "people decide" box: the accountable moments of the flow
function decisions(F, x, y, w, uc, h) {
  const rows = uc.decisions, H = h || 150 + rows.length * 50;
  let s = rect(x, y, w, H, { r: 16, fill: '#0D1A14', stroke: C.green, so: 0.7, sw: 1.5 });
  s += text(x + 28, y + 44, 'PEOPLE DECIDE · THE ACCOUNTABLE MOMENTS', { size: 15, weight: 700, ls: 1.5, fill: C.green });
  rows.forEach(([l, v], i) => {
    const yy = y + 96 + i * 50;
    s += line(x + 28, yy - 30, x + w - 28, yy - 30, { stroke: '#22382C' }) + text(x + 28, yy, l, { size: 18, fill: C.t1 }) + text(x + w - 28, yy, v, { size: 18, weight: 700, fill: WHITE, anchor: 'end' });
    fits(`decision ${l}`, textWidth(l, 18) + 24 + textWidth(v, 18, 700), w - 56);
  });
  const tail = wrap(LINE, w - 56, 17, 500);
  tail.forEach((l, i) => { s += text(x + 28, y + H - 18 - (tail.length - 1 - i) * 24, l, { size: 17, weight: 500, fill: C.green }); });
  return { svg: g(F, 'People decide', s), h: H };
}

// ---------- step card ----------
const CW = 572, LINE_W = CW - 48;
function cardLayout(st) {
  const title = wrap(st.title, CW - 100, 23, 700), user = wrap(st.user, LINE_W - 60, 17), shows = wrap(st.shows, LINE_W - 60, 17);
  if (user.length > 3) warn(`${st.frame}: user line ${user.length} lines`);
  if (shows.length > 4) warn(`${st.frame}: shows line ${shows.length} lines`);
  const headH = 92 + (title.length - 1) * 28, ph = CW * 1069 / 1400;
  return { title, user, shows, headH, ph, h: headH + ph + 18 + user.length * 23 + 12 + shows.length * 23 + 20 + 26 + 22 };
}
function card(F, x, y, h, st, n, col) {
  const L = cardLayout(st);
  let c = rect(x, y, CW, h, { r: 20, fill: CARD, stroke: n === 1 ? col : STROKE, sw: n === 1 ? 2 : 1.2 });
  c += disc(x + 40, y + 44, n, n === 1 ? col : C.blue, 22, 22, n === 1 && col !== LAV && col !== WHITE ? WHITE : '#111111');
  const sc = stageChip(F, x + 76, y + 30, st.stage, { size: 14, h: 26 }); c += sc.svg;
  c += text(x + CW - 24, y + 49, st.frame.slice(0, 6), { size: 14, weight: 500, fill: ID, anchor: 'end' });
  L.title.forEach((l, i) => { c += text(x + 24, y + 86 + i * 28, l, { size: 23, weight: 700, fill: WHITE }); });
  fits(`${st.frame} title`, textWidth(L.title[0], 23, 700), CW - 48);
  const py = y + L.headH;
  const clip = F.clip(`<rect x="${f(x + 1)}" y="${f(py)}" width="${f(CW - 2)}" height="${f(L.ph)}"/>`);
  const pv = previewBox(F, st.frame, x + 1, py, CW - 2);
  c += `<g clip-path="${clip}">${pv.svg}</g>`;
  let yy = py + L.ph + 18 + 17;
  // User does · (plum on pink marker) / System shows · (lavender marker)
  const mark = (yy0, lab, fill, stroke, ink, lines) => {
    const w = textWidth(lab, 14, 700) + 16;
    let r = rect(x + 24, yy0 - 16, w, 23, { r: 11.5, fill, stroke, sw: 1 }) + text(x + 32, yy0, lab, { size: 14, weight: 700, fill: ink });
    lines.forEach((l, i) => { r += text(x + 24 + 60, yy0 + i * 23, l, { size: 17, fill: C.t1 }); });
    return r;
  };
  c += mark(yy, 'USER', PINK, PLUM, PLUM, L.user); yy += L.user.length * 23 + 12;
  c += mark(yy, 'SHOWS', '#1D232C', LAV, LAV, L.shows);
  let ax = x + 16;
  for (const k of st.who) { const ch = chip(F, ax, y + h - 48, ROLES[k][0], ROLES[k][1]); c += ch.svg; ax += ch.w + 6; }
  c += text(x + CW - 16, y + h - 29, st.frame, { size: 14, weight: 500, fill: ID, anchor: 'end' });
  fits(`${st.frame} foot`, ax - 6 - (x + 16) + 14 + textWidth(st.frame, 14, 500), CW - 32);
  return g(F, `Step ${n} · ${st.title}`, c);
}

// ---------- one board per use case ----------
const ROWS = { 5: [3, 2], 6: [4, 2], 7: [4, 3], 8: [4, 4] };
export function ucBoard(uc) {
  const BW = 3480, BH = 2040;
  const F = new Frame(`${uc.id}-board · ${uc.title} · demo flow board`, BW, BH);
  let s = board(F, BW, BH);
  s += heading(F, BW, { kicker: uc.kicker, title: uc.title, sub: uc.answer, col: uc.col, maxW: 2200, subMaxW: 2800 });
  s += whoActs(F, 2360 + 20, 196).svg;
  // left column
  const LX = 100, LW = 760, TOP = 320;
  const b = brief(F, LX, TOP + 12, LW, uc); s += b.svg;
  // step cards
  const X0 = 940, GAP = 50, rows = ROWS[uc.steps.length] || [uc.steps.length];
  const layouts = uc.steps.map(cardLayout), H = Math.ceil(Math.max(...layouts.map(l => l.h)));
  const pos = []; let i = 0;
  rows.forEach((n, r) => { for (let j = 0; j < n; j++) pos[i++] = [X0 + j * (CW + GAP), TOP + r * (H + 44)]; });
  uc.steps.forEach((st, k) => { s += card(F, pos[k][0], pos[k][1], H, st, k + 1, uc.col); });
  // arrows
  let ar = ''; i = 0;
  rows.forEach((n, r) => { for (let j = 0; j < n - 1; j++) { const [x, y] = pos[i + j]; ar += arrowH(x + CW, x + CW + GAP, y + H / 2); } i += n; });
  if (rows.length > 1) { // last of row 1 down and back to the first of row 2
    const [x1, y1] = pos[rows[0] - 1], [x2, y2] = pos[rows[0]], yy = y1 + H + 22;
    ar += pathEl(`M${f(x1 + CW / 2)} ${f(y1 + H + 8)} L${f(x1 + CW / 2)} ${f(yy - 10)} Q${f(x1 + CW / 2)} ${f(yy)} ${f(x1 + CW / 2 - 10)} ${f(yy)} L${f(x2 + CW / 2 + 10)} ${f(yy)} Q${f(x2 + CW / 2)} ${f(yy)} ${f(x2 + CW / 2)} ${f(yy + 10)} L${f(x2 + CW / 2)} ${f(y2 - 10)} M${f(x2 + CW / 2 - 10)} ${f(y2 - 22)} L${f(x2 + CW / 2)} ${f(y2 - 10)} L${f(x2 + CW / 2 + 10)} ${f(y2 - 22)}`, { stroke: '#8C96A6', sw: 3, cap: 'round', join: 'round' });
  }
  s += g(F, 'Arrows', ar);
  const cardsBottom = TOP + rows.length * (H + 44) - 44;
  fits(`${uc.id} cards bottom`, cardsBottom, BH - 110);
  // people-decide box: in the spare card slot of the last row, else under the brief if it fits
  const spare = rows.length > 1 && rows[rows.length - 1] < 4 ? [X0 + rows[rows.length - 1] * (CW + GAP), pos[pos.length - 1][1]] : null;
  const legendTop = BH - 112 - legend(new Frame('m'), LX, 0, LW).h;  // legend rows in the left column, above the footer
  let legendY = legendTop;
  if (spare) s += decisions(F, spare[0], spare[1], CW, uc).svg;
  else {
    const dh = 150 + uc.decisions.length * 50, dy = TOP + 12 + b.h + 24;
    if (dy + dh + 30 <= legendTop) s += decisions(F, LX, dy, LW, uc, dh).svg; else warn(`${uc.id}: no room for the people-decide box`);
  }
  fits(`${uc.id} brief bottom`, TOP + 12 + b.h + 24, legendTop);
  const lg = legend(F, LX, legendY, LW); s += lg.svg;
  fits(`${uc.id} legend bottom`, legendY + lg.h, BH - 96);
  s += footer(F, BW, BH, { note: `Frames ${uc.id}-S1 to ${uc.id}-S${uc.steps.length} follow at full size · each frame is one state` });
  return F.render(s);
}

// ---------- the master board: journey strip, three improvements, five lanes ----------
const JOURNEY = [
  ['detect', 'A sensor, camera or access event becomes an alert card (and a system message for Critical).', 'Person: sees it in the ranked list.'],
  ['correlate', 'Related alarms are linked into one event: System entries, facts only.', 'Person: opens the alarm.'],
  ['context', 'Location, cameras, roster, rules and travel time are attached.', 'Person: Locate, cameras, reads the context.'],
  ['orchestrate', 'The SOP is loaded; Co-pilot briefs and pre-fills; auto steps are ticked.', 'Person: approves the critical action.'],
  ['govern', 'Co-pilot answers, drafts the escalation and the report, logs everything.', 'Person: asks, escalates, acknowledges, closes, signs.'],
];
const IMPROVEMENTS = [
  ['Co-pilot summary lives in the SOP Flow tab', 'A "Co-pilot briefing" block (lavender, sparkle, 2–4 lines, sources) sits above the steps. The Investigation tab shows facts only: System entries in white and grey, no lavender text there.'],
  ['Flow order = the journey', 'Detect → Correlate → Contextualise → Orchestrate → Assist & govern. Every step card and every frame carries its stage chip, so the demo tells the same story five times.'],
  ['No Co-pilot text on the Real Time Alerts cards', 'The dashboard list shows title, description, time, Locate and Escalate only. Lavender appears only in the SOP Flow briefing, the Ask Co-pilot answer and the Incident Management report draft.'],
];
const STORY = {
  UC1: 'Nurul sees one Info card for K. Lim in Baggage Hall B2, reads the rules that fired, locates him, follows the radio-check SOP and acknowledges at 01:52. The card goes On Hold; nothing closes by itself.',
  UC2: 'AgilFence senses a climb on 5-14 at 02:14:58. The operator opens the alarm, takes PTZ 7-02 live, approves Dispatch Patrol 2 at 02:15:30 and creates PER-005 from a pre-filled dialog at 02:16:10.',
  UC3: 'Card S-20931 opens A17 and C2 four minutes apart on a 19-minute route. The operator compares both doors, sees the legacy SSID, approves the suspension at 02:16:05 and records IDS-207.',
  UC4: 'Daniel asks "Show critical incidents in Terminal 5 in the last hour" at 02:30, gets one sentence with sources and result cards, locates the T5 Pier B door and asks a follow-up. Every answer is logged.',
  UC5: 'At the 07:00 handover Grace filters the overall list to PER-005, reads the Co-pilot report draft and the approvals, closes the incident with a reason and sign-off at 07:02 and exports it.',
};
export function masterBoard() {
  const BW = 4200, BH = 3000;
  const F = new Frame('DEMO-master-board · Airport demo · V11 interfaces · five end-to-end flows', BW, BH);
  let s = board(F, BW, BH);
  s += heading(F, BW, { kicker: 'AIRPORT DEMO · V11 INTERFACES · FIVE END-TO-END FLOWS · FIGMA SVG FOR THE DEMO TEAM', title: 'Airport demo · V11 interfaces · five end-to-end flows', sub: LINE, col: LAV, maxW: 2600, subMaxW: 2600 });
  s += whoActs(F, 3200, 196).svg;
  // journey strip
  const JY = 300, JW = (BW - 200 - 4 * 20) / 5;
  let j = text(100, JY, 'THE JOURNEY · EVERY FLOW FOLLOWS IT · EVERY STEP CARRIES ITS STAGE CHIP', { size: 15, weight: 700, ls: 1.5, fill: C.t2 });
  JOURNEY.forEach(([k, sys, per], i) => {
    const x = 100 + i * (JW + 20), y = JY + 16, [, col] = STAGES[k];
    j += rect(x, y, JW, 104, { r: 14, fill: CARD, stroke: col, so: 0.55, sw: 1.2 });
    j += stageChip(F, x + 20, y + 14, k, { size: 14, h: 26 }).svg;
    const l1 = wrap(sys, JW - 40, 16); l1.forEach((l, n) => { j += text(x + 20, y + 64 + n * 22, l, { size: 16, fill: C.t1 }); });
    j += text(x + 20, y + 64 + l1.length * 22 + 2, per, { size: 16, weight: 500, fill: col });
    if (l1.length > 1) warn('journey text ' + k + ' is ' + l1.length + ' lines');
    if (i < 4) j += arrowH(x + JW - 2, x + JW + 22, y + 52);
  });
  s += g(F, 'Journey strip', j);
  // three improvements
  const IY = JY + 16 + 104 + 36, IW = (BW - 200 - 2 * 20) / 3;
  let im = text(100, IY, 'THREE IMPROVEMENTS · APPLIED IN EVERY FLOW', { size: 15, weight: 700, ls: 1.5, fill: LAV });
  IMPROVEMENTS.forEach(([t, body], i) => {
    const x = 100 + i * (IW + 20), y = IY + 16;
    im += rect(x, y, IW, 124, { r: 14, fill: LAV, fo: 0.06, stroke: LAV, so: 0.5, sw: 1.2 });
    im += disc(x + 36, y + 36, i + 1, LAV, 18, 18, '#111111') + text(x + 66, y + 43, t, { size: 21, weight: 700, fill: WHITE });
    wrap(body, IW - 90, 16).forEach((l, n) => { im += text(x + 66, y + 74 + n * 22, l, { size: 16, fill: C.t1 }); });
  });
  s += g(F, 'Three improvements', im);
  // lanes
  const LY0 = IY + 16 + 124 + 48, PITCH = 428, LBX = 100, LBW = 440, PX0 = 580, PGAP = 18, PW = (BW - 100 - PX0 - 7 * PGAP) / 8, PH = PW * 1069 / 1400;
  UCS.forEach((uc, li) => {
    const y = LY0 + li * PITCH;
    let l = line(100, y - 18, BW - 100, y - 18, { stroke: STROKE });
    // label block
    l += text(LBX, y + 30, uc.id, { size: 20, weight: 700, ls: 2, fill: uc.col });
    l += chip(F, LBX + textWidth(uc.id, 20, 700, 2) + 14, y + 10, uc.sev === 'Ask' ? 'Ask Co-pilot' : uc.sev === 'Report' ? 'Incident list' : uc.sev, uc.col).svg;
    const tl = wrap(uc.title, LBW, 24, 700);
    tl.forEach((t, n) => { l += text(LBX, y + 68 + n * 30, t, { size: 24, weight: 700, fill: WHITE }); });
    let ty = y + 68 + tl.length * 30 + 4;
    const st = wrap(STORY[uc.id], LBW, 16); st.forEach((t, n) => { l += text(LBX, ty + n * 22, t, { size: 16, fill: C.t1 }); });
    ty += st.length * 22 + 8;
    l += text(LBX, ty + 4, `${uc.steps.length} frames · ${uc.id}-S1 … S${uc.steps.length} · board ${uc.id}-board`, { size: 14, weight: 500, fill: ID });
    fits(`${uc.id} lane label`, ty + 8, y + PITCH - 30);
    // previews
    uc.steps.forEach((stp, k) => {
      const x = PX0 + k * (PW + PGAP), py = y + 32;
      l += stageChip(F, x, y, stp.stage, { size: 14, h: 24 }).svg + text(x + PW, y + 17, `S${k + 1}`, { size: 14, weight: 700, fill: ID, anchor: 'end' });
      l += previewBox(F, stp.frame, x, py, PW).svg;
      const u = wrap(stp.user, PW - 8, 15, 500).slice(0, 2);
      u.forEach((t, n) => { l += text(x, py + PH + 22 + n * 20, t, { size: 15, weight: 500, fill: PINK }); });
      if (k < uc.steps.length - 1) l += arrowH(x + PW - 4, x + PW + PGAP + 6, py + PH / 2);
    });
    s += g(F, `Lane ${uc.id} · ${uc.title}`, l);
  });
  const lanesBottom = LY0 + 5 * PITCH - 20;
  fits('lanes bottom', lanesBottom, BH - 220);
  const lg = legend(F, 100, lanesBottom + 30, BW - 200, { gap: 44 }); s += lg.svg;
  fits('master legend bottom', lanesBottom + 30 + lg.h, BH - 90);
  s += footer(F, BW, BH, { note: 'Boards UC1-board … UC5-board and frames UC1-S1 … UC5-S7 follow at full size' });
  return F.render(s);
}

export const BOARDS = [...UCS.map(uc => [`${uc.id}-board`, () => ucBoard(uc)]), ['DEMO-master-board', masterBoard]];
