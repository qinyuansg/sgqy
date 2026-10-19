# Airport demo · V11 interfaces · five end-to-end click flows (Figma SVG)

Product brief for the demo-flow frames and boards in `screens-v11/demo/` (built by `build-demoflows.mjs`).
Audience: the demo team and CAG. Approach: chief product officer (what we promise, in which order, who decides)
and chief designer (every click, every state, in the current V11 design language).

## 1. The journey every flow follows

Weili's five stages, in this order, tag every step on every board and frame:

| Stage | Chip colour | What the software and hardware do | What the person does |
|---|---|---|---|
| **Detect** | severity colour | A sensor, camera or access event becomes an alert card (and a system message for Critical) | sees it in the ranked list |
| **Correlate** | blue `#3EA9FF` | Related alarms are linked into one event (System entries, facts only) | opens the alarm |
| **Contextualise** | teal `#55D6E6` | Location, cameras, roster, rules and travel time are attached | Locate, cameras, reads the context |
| **Orchestrate** | gold `#D4B741` | The SOP is loaded; Co-pilot briefs and pre-fills; auto steps are ticked | approves the critical action |
| **Assist & govern** | lavender `#B69CFF` | Co-pilot answers, drafts the escalation and the report, logs everything | asks, escalates, acknowledges, closes, signs |

Line for the boards: *the system detects, explains, recommends and coordinates; people keep the accountable decisions.*

## 2. The three improvements (apply everywhere in these flows)

1. **Co-pilot summary lives in the SOP Flow tab**, as a "Co-pilot briefing" block above the steps (lavender, sparkle,
   2–4 lines, a sources line). The **Investigation tab shows facts only**: System entries (linked alarms, rules, context) in
   white/grey — no lavender text there.
2. **Flow order = Detect → Correlate → Contextualise → Orchestrate → Assist & govern.** Every step card carries its stage chip.
3. **No Co-pilot text on the Real Time Alerts cards** (dashboard list): title, description, time, Locate, Escalate only.
   Lavender appears only in the SOP Flow briefing, the Ask Co-pilot answer and the Incident Management report draft.

## 3. Interaction states (the design system for clicks)

Drawn with `lib/demo.mjs`; all in layers named `… NEW` or `Annotation …` so they can be hidden in Figma.

| State | Visual |
|---|---|
| Hover on a card / row | fill white 6 % over the row, 1 px white 25 % outline; cursor arrow |
| Hover on a button | fill lightened, 1 px white 60 % outline; tooltip pill above (13 px) when the label is an icon |
| Hover on a tab | tab fill `C.tabOn` at 70 %, label white |
| Hover on a link (Locate, Escalate) | underline |
| Focus on the search bar | 1.5 px lavender ring, caret, suggestions dropdown |
| Click | cursor + blue ripple (two rings) |
| Pressed / active | button fill darker, inner 1 px line |
| Disabled | 40 % opacity |
| Dropdown / dialog open | dim backdrop 67 % behind dialogs; dropdowns have an 8 px shadow |
| Annotation (what the user does) | plum pill `#480448` on pink `#FDD8FD`: "Click · SOP Flow tab", "Hover · Locate", "Type · …" with a leader to the pointer |
| Result annotation (what appears) | white pill on `#1D232C`, lavender border: "Shows · Co-pilot briefing" |

## 4. The five use cases

Frames are 1400×1069 (console) or 1600×1069 (Incident Management). Names: `UC1-S1-…` etc. Each frame = one state.
Data: the demo night (02:14 scenario), names illustrative, clock times only, no percentages.

### UC1 · Overstay (Info) — `UC1-overstay`
**Product requirement.** Turn an access-control dwell rule into an Info alert that explains which airport rules fired, shows
the person on camera, offers the radio-check SOP and records the outcome, without an alarm storm.
**User story.** As a control-room operator (Nurul), when a contractor stays in a restricted zone after shift, I want one Info
alert that tells me which rules fired and who it is, so I can do a radio check and log it in under a minute.
**Acceptance criteria.**
1. Given K. Lim's card has been in B2 since 22:05 and the shift ended at 01:00, when rules (i), (ii), (iii) and (v) fire, then one Info card "Baggage Hall B2 · Overstay 3h 40m in restricted zone" appears (no Co-pilot text on the card).
2. When the operator opens the card, the Investigation tab lists the four rules as System entries with time, rule number and source, and the three cameras show the person.
3. When the operator clicks Locate, the map flies to B2 and the context rows show roster (shift ended 01:00), duty zones (B2 outside) and overtime (none).
4. When the operator opens the SOP Flow tab, the Co-pilot briefing (3 lines, sources) sits above SOP-OPS-003 with steps "Radio check" (critical action: *Call K. Lim* / *Send patrol*), "Confirm reason", "Log".
5. When the operator clicks Acknowledge after the radio check, a confirmation shows "Acknowledged · Nurul A. · 01:52" and the card moves to On Hold; the audit line records rule set, operator and time.
6. No step closes the alarm automatically.
**Steps.** S1 Detect: home, Info card at the bottom of the list, hover on the card (tooltip "Open alarm") · S2 Correlate: card selected, Investigation tab (System: rules (i)–(v), cameras) · S3 Contextualise: hover + click Locate, map on B2, context rows · S4 Orchestrate: hover SOP Flow tab → tab active, briefing + steps, hover on *Call K. Lim* · S5 Assist & govern: click Acknowledge → confirmation toast, card On Hold, audit line.

### UC2 · AgilFence (Critical) — `UC2-agilfence`
**Product requirement.** A fence climb becomes a Critical alert with a system message, linked LiDAR and thermal evidence,
nearest cameras on the map, one-click live view, the perimeter SOP with a dispatch approval, and a pre-filled escalation.
**User story.** As a control-room operator, when AgilFence senses a climb on segment 5-14, I want the alarm, the cameras and
the procedure in one place so I can verify and dispatch within a minute and keep the runway strip clear.
**Acceptance criteria.**
1. Given a climb signature on 5-14 at 02:14:58, then a Critical card and a system message ("AgilFence alarm · Segment 5-14", Open alarm / Locate / Silence) appear within seconds, with an alarm tone icon.
2. When the operator opens the alarm, the Investigation tab lists fence alarm, LiDAR object 1.7 m, PTZ 7-02 to preset and thermal "1 person" as System entries (no lavender), and the three tiles show PTZ thermal, LiDAR and wide.
3. When the operator clicks Locate, the map shows the fence line with segment 5-14 marked and a Nearest cameras list (PTZ 7-02 85 m preferred); hovering a camera row highlights it; clicking Open live opens the player with the pre-alarm replay marker.
4. When the operator opens SOP Flow, the Co-pilot briefing summarises the evidence; steps 1–2 are auto-ticked; step 3 "Dispatch Patrol 2" is a critical action (*Dispatch* / *Choose another*); clicking Dispatch records "Approved · Nurul A. · 02:15:30".
5. When the operator clicks Escalate, the dialog is pre-filled (Category "Perimeter intrusion", Severity Critical, remarks) and Create Incident makes PER-005 the top row of Incident Management.
6. The tower and police steps are logged with clock times; nothing is decided by the system alone.
**Steps.** S1 Detect: toast + Critical card (quiet dashboard before) · S2 Correlate: Investigation with the four linked System rows · S3 Contextualise: Locate view, nearest cameras, hover on PTZ row, click Open live → player · S4 Orchestrate: SOP Flow with briefing, hover Dispatch, click → approved state · S5 Assist & govern: hover Escalate → dialog pre-filled → Create Incident, confirmation.

### UC3 · Identity spoofing (Warning) — `UC3-spoofing`
**Product requirement.** Detect one credential used at two doors too far apart, show both doors side by side with the
holder's appearance, surface the legacy SSID, and offer the card-suspension SOP with a human approval.
**User story.** As a control-room operator, when card S-20931 opens T3 A17 and T1 C2 four minutes apart, I want to see both
doors, the travel time and who used the card, so I can suspend the right credential and escalate with evidence.
**Acceptance criteria.**
1. Given grants at A17 02:09:12 and C2 02:13:20 (fastest route 19 min), then a Warning card "T1 Door C2 · Same card used at T3 A17 4 min earlier" appears.
2. When opened, the Investigation tab lists both grants, the appearance difference, 3 denials at C3 and the off-roster access as System entries; camera tiles show C2 now and A17 at 02:09; hovering a tile enlarges it with "Compare" controls.
3. When the operator clicks Locate, the map shows A17 and C2 with the 19-minute route and the legacy-SSID note.
4. When the operator opens SOP Flow, the briefing explains the impossible presence and the legacy SSID; step "Suspend card S-20931 (both SSIDs)" is a critical action (*Suspend* / *Keep active*); step "Notify duty manager" follows.
5. When the operator clicks Escalate, the dialog is pre-filled (Category "Credential misuse", Severity Warning) and Create Incident records IDS-207.
**Steps.** S1 Detect · S2 Correlate (Investigation facts) · S3 Contextualise (hover tile → compare; Locate with route) · S4 Orchestrate (SOP Flow, hover Suspend, click → approved) · S5 Assist & govern (Escalate dialog → incident).

### UC4 · Search / Ask Co-pilot — `UC4-ask`
**Product requirement.** The existing search bar accepts plain-English questions; answers come with sources and result cards
that open the alarm or Locate it; recent questions and follow-ups are one click away; every answer is logged.
**User story.** As a duty manager (Daniel), at 02:30 I want to ask "Show critical incidents in Terminal 5 in the last hour" and
get a one-line answer with the incidents and their sources, so I do not have to search five screens.
**Acceptance criteria.**
1. Given the search bar reads "Search or ask Co-pilot…", when it gains focus, then a lavender ring and a dropdown with three recent questions appear.
2. When the user types "Show crit", then suggestions complete the question; Enter runs it.
3. When the answer returns, then one headline sentence, the result cards (severity, title, time), a Sources line and three follow-up chips are shown; the dropdown says "From live events · 02:30".
4. When the user hovers a result card, then Locate and Open alarm are underlined and a tooltip names the camera; clicking Locate flies the map to the pin and selects the card.
5. When the user clicks a follow-up chip, then the next answer replaces the first and the previous question stays available in Recent.
6. Every question and answer is logged with user, time and the sources used.
**Steps.** S1 idle + hover on the search bar · S2 focus: ring, caret, Recent questions dropdown · S3 typing "Show crit", suggestions · S4 answer dropdown (cards, sources, chips), hover on a result card · S5 click Locate → map flies, card selected, dropdown collapsed to a one-line summary · S6 follow-up chip clicked → second answer "Where was this person last detected?".

### UC5 · Incident Management · overall list and report — `UC5-incidents`
**Product requirement.** One list of every incident across the night with filters, search, export and a detail pane that
holds the Co-pilot report draft, the SOP record and a governed close (reason, sign-off, audit).
**User story.** As head of security (Grace) at the 07:00 handover, I want the overall incident list and a drafted report per
incident, so I can review, sign off and export without rebuilding the night from logs.
**Acceptance criteria.**
1. When the user clicks Incident Management in the header (hover state shown), then the list opens with Status, Severity, Location, Date & Time, Code, Closed By, Device ID and the count "(24) · 5 Open".
2. When the user opens the Status filter, then All / Open / Closed are selectable; when the user types "PER-005" in the search, the list filters to the row.
3. When the user hovers a row it highlights; when the user clicks it, the detail pane shows the event, cameras, Remarks (Co-pilot report draft tagged, with the operator's remark) and the SOP Flow tab with the completed steps and approvals.
4. When the user clicks Close Incident, then a dialog asks for the closing reason and sign-off; Confirm sets the row to Closed with "Closed By · Grace T. · 07:02" and writes the audit line.
5. When the user hovers Export, then the choices PDF / CSV appear; the export carries the filters applied.
**Steps.** S1 header: hover + click Incident Management · S2 list with Status dropdown open, hover on a row · S3 search "PER-005" typed, filtered list, row hover · S4 row clicked: detail pane, Remarks with the report draft · S5 SOP Flow tab in the detail (completed steps, approvals) · S6 Close Incident dialog (reason, sign-off) · S7 closed state + Export menu open.

## 5. Boards

- One board per use case (3480×2040, AF-board style): left column with Product requirement / User story / Acceptance criteria;
  the steps as cards (preview, stage chip, "User does" and "System shows" lines, who acts); the interaction legend; footer.
- `DEMO-master-board` (~4200×3000): five lanes in the journey order with step previews and stage chips, the improvements box,
  the legend, the restricted footer. This is the single Figma SVG for the demo team.

## 6. Build

```bash
A=/path/to/assets; OUT=/path/to/out            # same assets as the other V11 builds
node build-demoflows.mjs $OUT $A               # frames (svg, png, png2x, thumb) + boards
node make-pdf.mjs $OUT Airport_Demo_Flows_V11_frames.pdf
```
