# Strategic areas 2 · 4 · 5 — product brief, verdict, storyline and frame spec

Source of truth for two deliverables that answer the 16 October update (points 2, 4 and 5) for the
CMO, CSO and CCO, written from the Chief Product Officer's seat:

1. **C-level deck** (`build_deck.js` → `AGIL_Secure_V11_CAG_Strategic_Areas_2-4-5_CPO.pptx`): the demo use
   cases per point, the verdict on Weili's deck, what is in V11 today vs concept vs roadmap, and the
   release timeline (proposed, to be locked with R&D).
2. **Figma SVG, end-to-end user flows** (`../isms-mvp-figma/build-cpo-flows.mjs`): one master board plus
   per-point flow boards, and six new multi-site frames (MS-01…06) in the V11 design, packaged with the
   existing V11-fit (V11-01…12) and AgilFence (AF-00…09) frames.

Everything below is written so that an agent can build from it without re-deriving the thinking.

---

## 1. Context: what was asked on 16 October (Friday)

Meeting-summary table, column "Update as of 16 Oct, Friday". People: Zhang Qinyuan (Product, author of this
deck), Peter Yang YueXiang (CTO), Anuar Bin Abdul Razak (Solution Architect), Weili / TAY Wei Li (deck author,
AgilWatch). Sales demos to CAG on **22 October** (point 3, left-behind baggage via AgilWatch).

| # | Strategic area | Opportunity / value proposition (CAG's words) | Recommended action | **The ask (16 Oct)** | Success outcome |
|---|---|---|---|---|---|
| 2 | AI-Powered AGILSecure ISMS | Differentiate from traditional ISMS by showcasing **Alarm Correlation, AI Security Copilot, Incident Automation, Natural Language Investigation, Access Intelligence and Automated Reporting**. Supports future Airport Security Operating System vision. | Establish AI development roadmap prioritising production-ready use cases. Align Product, Engineering and AI teams. | **Please confirm if the deck/use cases provided by Weili is align and good to be committed to CAG? Any other supporting material from R&D on this aspect?** | Position AGILSecure as an AI-enabled security operating platform rather than a traditional ACS/VMS solution. Supported by existing ISMS digital workflow architecture. |
| 4 | AgilFence Unified Integration | Demonstrate **new AgilFence UI/UX, workflow enhancement and full integration into AGILSecure** for unified monitoring, alarm handling and reporting instead of maintaining separate platforms. | Prioritise common alarm handling, incident workflow, reporting and situational awareness dashboard. | **Do advise if there is a ready in-built module in V11 that we can present to CAG? If not, advise the roadmap, high level visuals and timeline of official launch.** | Improvement from the decade-old iPAM(S) from CAG's increasing platform stickiness. |
| 5 | Multi-Site, Multi-Brand Governance Platform | Demonstrate AGILSecure's capability to **manage multiple terminals, facilities and third-party security systems under a common governance framework and security baseline while maintaining local autonomy**. | Develop multi-site governance use case and management dashboard for demonstrations. | **Do advise if there is a ready in-built module in V11 that we can present to CAG? If not, advise the roadmap, high level visuals and timeline of official launch.** | AGILSecure positioned above subsystem level as the orchestration, governance and operational decision layer. Supported by open API, SDK and interoperability requirements. |

Wording: use **iPAMS** (the AgilFence alarm-management software) throughout; the update writes "iPAM".
Use **AGIL Secure V11** (registered mark as "AGIL® Secure" on covers only). The AI layer is **AI Co-pilot**.

---

## 2. Facts we may state, and the guardrails

### 2.1 What V11 has today (measured from the team's V11 Figma export; see `../isms-mvp-figma/lib/v11.mjs`)
- Header: Emergency Lockdown, **location selector "site › cluster"** (e.g. *Main Airport › T3*), search bar, Incident Management button.
- Real Time Alerts panel: severity counters, tabs *All / Open / On Hold*, alert cards with **Locate** and **Escalate**.
- Device Status (online / offline counts). 2D / 3D model toggle; a **3D viewer with Locate**.
- Active Alarms panel: event head (time, ID, code, title), three camera tiles, **Investigation** and **SOP Flow** tabs,
  Remarks, footer *Clear · Escalate · Acknowledge*. SOP Flow has numbered steps, checkboxes and **Critical Action**
  steps with action buttons (V10 door actions).
- Escalate Event dialog (Category, Severity, Remarks → Create Incident). **Incident Management** page: table, filters,
  export, detail pane with Remarks / SOP Flow, Close Incident.
- This workflow is **source-agnostic**: any alarm that reaches V11 goes alert card → Active Alarm → SOP → Escalate →
  Incident Management. That is the in-built part of points 2 and 4.
- V11 is operated **per site** (one site, many clusters/terminals). There is **no estate (multi-site) module** today.

### 2.2 What the demo adds on top of V11 (the "delta map", `../isms-mvp-figma/screens-v11/spec.mjs`)
Eleven front-end deltas, each reusing an existing V11 part; indicative front-end effort XS (<1 day) · S (1–3 days) · M (1–2 weeks):
Co-pilot line on alert cards (XS) · airport 3D model, incident markers, Locate zoom (M) · "Search or ask Co-pilot" with answer dropdown (M) ·
camera-tile bounding boxes (S) · Co-pilot entry in Investigation (S) · linked alarms in the System entry (S) · SOP steps pre-filled, auto steps
ticked (S) · approvals as Critical Action steps (S) · Escalate dialog pre-filled (XS) · Co-pilot report draft in Remarks (XS) · Co-pilot colour
token #B69CFF (XS). **Behind the UI, not design work:** airport 3D model, recorded demo clips with analytics metadata, ACS / AgilFence / LiDAR
event feeds (recorded is fine), SOP library, a Co-pilot service (summary, linked alarms, SOP pre-fill, Q&A). **Whether a demo instance with
these deltas exists is an R&D question — never state it as done.**

### 2.3 AgilFence facts (as used in the AgilFence flow and film)
Fibre Bragg grating sensors in one optical cable feel a climb, cut or lift · pinpoints the segment to within a few metres · senses with light,
immune to electromagnetic and radio interference · adapts to wind, rain and jet blast to keep nuisance alarms low · iPAMS calls up the camera
preset · on Changi's airfield perimeter since 2011. Today at CAG: AgilFence + iPAMS do sensing, pinpointing and PTZ preset call-up; iPAMS
has its own UI and reports, separate from V11.

### 2.4 Materials already produced by Product (reuse, do not rebuild)
| Material | Where | Use in this deck |
|---|---|---|
| 12 V11-fit demo frames V11-01…12 (Figma SVG, 1400×1069; V11-12 is 1600 wide) | `../isms-mvp-figma/screens-v11/frames.mjs`; 2× PNGs in the deck assets `v11/` | point 2 visuals |
| Delta map + click paths (V11-00, V11-00b) | `spec.mjs` | "today vs demo adds" slide |
| Pitch deck v2 "From alarms to answers" (28 slides) and film (2:50) | `../cag-pitch-deck`, `../cag-demo-video` | supporting material slide |
| AgilFence end-to-end frames AF-00…09 + flow board AF-00b, film "First touch" (2:27) | `../isms-mvp-figma/screens-v11/agilfence*.mjs`, `../agilfence-film` | point 4 visuals |
| MVP concept frames (Inter, 1920×1080) incl. 15 Sites · federation and 16 CTO build map | `../isms-mvp-figma/screens/` | reference only (different design language) |

### 2.5 Guardrails (apply to every slide and frame)
- **Readiness is always labelled** with one of three grades (section 3). Never show a concept without its grade.
- **Dates are proposals.** Every roadmap date carries "proposed · confirm with R&D". No date goes to CAG before Peter confirms.
- **People decide.** No automatic closure of incidents, no autonomous consequential action. Co-pilot summarises, links, drafts and
  recommends; a person approves. Prefer "assisted" to "autonomous".
- **No invented performance numbers.** Clock times only inside scenarios; the only figures are demo-scenario figures, labelled as such.
  No percentages of accuracy, no response-time KPIs, no cost savings.
- **Privacy:** no facial recognition claims; bag-to-owner links by appearance; watchlist matching optional and always verified by a person.
- **No real vendor names** for third-party systems (use *Vendor A/B/C* + protocol). Sites, names, IDs and figures are illustrative and say so.
- **No model identifiers** anywhere in files. No "CMO/CTO" role labels on customer-facing frames (fine inside this internal deck).
- Simple product English: short sentences, no jargon without a plain explanation, headings that state the point.

---

## 3. Readiness grades and the verdict per point

| Grade | Meaning | Colour (deck) | Label text |
|---|---|---|---|
| **In V11 today** | Exists in the current V11 software; can be shown live | green `2ED47A` | IN V11 TODAY |
| **Concept on V11** | High-fidelity design on V11 screens (Figma frames, film); simulated data; not in the software | lavender `B69CFF` | CONCEPT · DESIGNED |
| **Roadmap** | Planned for a release train; date proposed by Product, to be confirmed against the R&D roadmap | blue `4D8DFF` | ROADMAP · V11.x |
| (R&D to confirm) | A fact Product cannot verify alone | amber `D4B741` | R&D TO CONFIRM |

### 3.1 Point 2 — AI-powered AGIL Secure ISMS
**Answer: the workflow is in V11 today; the AI layer is designed (12 frames + film) and goes to production in trains V11.1 and V11.2.
Weili's deck is aligned in direction — commit it to CAG with four edits (section 4).**

| CAG's capability | Demo use case (frame) | In V11 today | Concept on V11 (designed) | Roadmap train |
|---|---|---|---|---|
| Alarm correlation | Staff Door D-214: five alarms, one incident (V11-01, 02) | alert cards, Active Alarms, Investigation tab | Co-pilot line, linked-alarm list, airport model + pins | 11.1 |
| AI Security Co-pilot | Co-pilot summary, SOP pre-filled, approvals (V11-03) | SOP Flow, Critical Action steps | Co-pilot entry, pre-fill, auto-ticked steps | 11.1 |
| Incident automation (assisted) | Gate B12 bag: steps 1–4 done, you approve step 5 (V11-05); Row K watchlist stays human (V11-06) | SOP Flow, Acknowledge / Escalate | auto-investigation steps, verify-first step | 11.1 (assist) · 11.2 (auto-steps on live VA) |
| Natural-language investigation | "Show critical incidents in T5 in the last hour" (V11-11) | search bar | Ask Co-pilot answer dropdown with sources | 11.2 |
| Access intelligence | T1 Door C2 impossible presence (V11-04); B2 overstay rules (V11-08) | ACS alarms in Active Alarms | travel-time check, legacy-SSID row, rules (i)–(v) | 11.1 (rules) · 11.2 (appearance check) |
| Automated reporting | TGT-214 report draft, ready to sign (V11-12) | Incident Management, Remarks | Co-pilot report draft | 11.1 |
| (also shown) Fight detection, AgilFence + LiDAR | V11-07, V11-09 | Active Alarms | video + audio entry; fence + LiDAR + thermal | 11.1 |

**22 October plan for point 2:** live V11 for the in-built workflow (plan A if R&D confirms a demo instance with the deltas and recorded
data; plan B: film "From alarms to answers" + click-through of the 12 frames). Both plans are honest; plan B needs nothing from R&D.

### 3.2 Point 4 — AgilFence unified integration
**Answer: partly. The alarm → incident → SOP → report workflow is in V11 today and takes any alarm source; the AgilFence-specific
module (fence line, segment status, health, configuration) is not in V11 — it is designed (10 frames, board, film) and is roadmap.**

| Capability | In V11 today | Concept on V11 (designed) | Roadmap train | R&D to confirm |
|---|---|---|---|---|
| Fence alarm as a V11 alarm (card, Active Alarm, SOP, Escalate, Incident Mgmt) | ✔ generic workflow | AgilFence-specific card text, system message | 11.1 | which iPAMS interface V11 can consume today (relay / OPC / API) |
| Camera call-up on alarm | ✔ camera tiles; iPAMS preset today | nearest-cameras list, one-click live, pre-alarm replay | 11.1 (preset handshake) · 11.2 (nearest cameras) | preset handshake between iPAMS and VMS/V11 |
| Fence on the map | ✔ 3D viewer + Locate | fence line with segments, alarm segment, LiDAR cone (AF-04) | 11.2 | airport 3D model availability |
| Command-centre video wall layout | — (VMS wall today) | one-click wall layout (AF-06) | 11.2 | wall controller integration |
| Fence health, diagnostics, nuisance analytics | — (iPAMS) | dashboard (not yet drawn; listed) | 11.2 (view) · 11.3 (full) | — |
| Zone / sensitivity configuration and calibration | — (iPAMS) | stays in iPAMS until 11.3 | 11.3 | — |
| Unified reporting | ✔ Incident Management export | fence alarms in the same report; evidence pack (AF-09) | 11.1 (incidents) · 11.2 (fence reports) | — |

### 3.3 Point 5 — Multi-site, multi-brand governance platform
**Answer: not in V11 today. V11 runs one site with many clusters; roles and integrations are per site. The estate layer is designed in
this deliverable (six frames + board) and ships in three trains.**

| Capability | In V11 today | Concept (this deliverable) | Roadmap train | R&D to confirm |
|---|---|---|---|---|
| Estate overview: all sites, health, open alarms, baseline compliance | — (site › cluster selector only) | MS-01 | 11.1 (read-only estate view) · 11.2 (full) | — |
| Site drill-down with local autonomy, Central SOC watching | per-site console ✔ | MS-02 | 11.1 | edge / WAN behaviour of V11 today |
| Security baseline: estate SOPs with local overrides and approval | SOP Flow per site ✔ | MS-03 | 11.2 | SOP library data model |
| Roles and access per site (estate admin, site manager, operator, auditor, integrator) | site-level roles ✔ (scope to confirm) | MS-04 | 11.1 | current role model |
| Any brand under one roof: connector catalogue and onboarding | integrations exist per site | MS-05 | 11.2 (catalogue) · 11.3 (certification, partner sandbox) | the connector list V11 ships today (ONVIF, OSDP, AgilFence, LiDAR, intercom, others) |
| Estate reporting across sites | per-site export ✔ | MS-06 | 11.2 | — |
| Open API and SDK for third parties | — | described (MS-05 dialog) | 11.3 | API status today |

---

## 4. Verdict on Weili's deck ("From alerts to AI-orchestrated security operations", 8 pages)

**Verdict: aligned in direction. Commit the storyline and the four use cases to CAG — after four edits, and together with the
V11 materials, so that CAG reads it as a journey, not as a list of shipped features.**

What is aligned: the four use cases map one-to-one onto our demo (UC1 Co-pilot ↔ D-214; UC2 intelligent access ↔ C2 / B2 / D-214;
UC3 incident management ↔ Gate B12 with human-in-the-loop; UC4 natural language ↔ Ask Co-pilot); the five-stage journey (Detect → Correlate →
Contextualise → Orchestrate → Assist & govern) matches our six steps (Detect → Correlate → Explain → Recommend → You decide → Report);
"human-in-the-loop control" and "correlation, not more alarms" are exactly our positioning; it names the Security Operating System vision.

The four edits before it leaves the building:
1. **Grade every page** (In V11 today / Concept / Roadmap). As written, pages 4–7 read as product; CAG may take them as committed.
2. **Replace concept art with V11 screens** where we have them (V11-02/03 for UC1, V11-04 for UC2, V11-05 for UC3, V11-11 for UC4), or keep the
   art and label it "concept illustration". Remove "High confidence" percentages from imagery.
3. **Rename UC3** "Autonomous incident management" → "Assisted incident management: AI gathers, people authorise", and keep the
   human-authorisation line on every use-case page. Keep "confidence" as a band, not a number.
4. **Cover CAG's five strategic areas**: add a perimeter page (AgilFence in the same workflow, our AF frames) and a multi-site governance page
   (MS frames), and one privacy line (no facial recognition needed; watchlist matching optional, person-verified).

Also to confirm with R&D before commitment: page 2 lists overstay, fight, fire and identity-spoofing detection as "today's AI" — confirm which
of these run in the current V11 / video-analytics stack at CAG.

Page-by-page map (for the appendix slide):
| Weili page | Says | Our matching material | Action |
|---|---|---|---|
| 1 Cover | From alerts to AI-orchestrated security operations | Pitch deck v2 cover "From alarms to answers" | Align one product name: AGIL Secure V11 with AI Co-pilot |
| 2 Starting point | Today's AI detects individual events (overstay, fight, fire, spoofing) | V11-07, V11-08, V11-04 | Confirm what is live today; grade |
| 3 Strategic shift | Correlation, not more alarms (ingest → correlate → interpret → recommend) | Deck v2 slide 5 "Six steps" | Keep; add "You decide" as an explicit step |
| 4 UC1 Co-pilot | Forced-door event becomes evidence-backed incident | V11-02, V11-03, V11-10 | Swap art for screens; grade Concept |
| 5 UC2 Intelligent access | Timing, location, repeated denial, impossible presence, abnormal sequence | V11-04, V11-08 | Keep; grade; link to point 1 (SSID) |
| 6 UC3 Autonomous incident mgmt | AI gathers and organises; humans authorise | V11-05, V11-06 | Rename "Assisted"; grade |
| 7 UC4 Natural language | Four example questions | V11-11 | Keep; note "answers cite sources" |
| 8 Recommended direction | Five controlled stages; north star | Deck v2 roadmap; this deck's trains | Attach the release trains once R&D confirms |

---

## 5. Proposed release trains (Product proposal — to confirm against the R&D roadmap)

Owner of the confirmation: Peter (CTO), with Anuar. Target: confirmed by **30 October 2026**, before any date is given to CAG.
All dates are stored in one table in `build_deck.js` (`TRAINS`) so they can be changed in one place.

| Train | Theme | Proposed GA | Point 2 | Point 4 | Point 5 |
|---|---|---|---|---|---|
| V11 (today) | In service | — | source-agnostic alarm → incident → SOP → report workflow | same workflow for fence alarms once connected | one site, many clusters; site roles |
| **V11.1** | Unified alarms, Co-pilot assist | **Q1 2027 (Mar)** | Co-pilot lines, linked alarms, Co-pilot summary, SOP / Escalate pre-fill, report draft | AgilFence connector: alarm + segment + camera preset into the V11 workflow; fence alarms in Incident Management reports | estate view (read-only), site switcher across sites, per-site roles |
| **V11.2** | AgilFence module, estate governance, Ask Co-pilot | **Q3 2027 (Sep)** | Ask Co-pilot (on-premise), auto-investigation steps on live video analytics, appearance check | fence line and segments on the map, nearest cameras, pre-alarm replay, wall layout, fence health view, fence reports | security baseline with local overrides and approvals, estate dashboard, estate reporting, connector catalogue |
| **V11.3** | Open platform | **Q1 2028 (Mar)** | Co-pilot learns from feedback; predictive insights (concept) | iPAMS functions fully in V11: zone / sensitivity configuration, calibration, nuisance analytics | public API + SDK, connector certification, partner sandbox |
| CAG pilot | One terminal, ~12 weeks, live feeds, joint KPIs | start Q1 2027 (proposed) | | | |

Near-term calendar: 22 Oct 2026 Sales demo (VA, left-behind baggage) — point 2 shown by film + frames or live (plan A/B); Q4 2026 workshops
(SOP mapping, data access); 30 Oct roadmap confirmation.

---

## 6. Deck storyline (C-level, simple product English, CPO voice in the notes)

Theme and helpers: reuse the deck v2 generator (`../cag-pitch-deck/build_deck.js`) — same THEME, layouts (COVER, SECTION, CONTENT, SCENE_R/L,
MAP, PHOTO, CLOSE, APPENDIX), `card`, `brackets`, `device`, `lens`, `hl`, `marker`, `label`, `pill`, icons, `fit` warnings, `applyTheme`
and `finalize`. Assets dir = the deck v2 assets (backgrounds `bg2_*.jpg`, `bg3_*.jpg`, `viz_*.png`, `persona_*.jpg`, `v11/*.png` at 2×) plus
`af/` (AgilFence 2× PNGs), `ms/` (multi-site 2× PNGs) and `boards/` (flow boards). Add a small readiness **grade tag** component
(`grade(s, x, y, 'today'|'concept'|'roadmap'|'confirm', text)`) and use it on every visual.

Internal deck: the cover carries "Internal · Product view · 18 October 2026"; content slides carry no footer (as deck v2). Speaker notes =
spoken script only. Slide count target: 26 main + 3 appendix. Nothing below 12 pt.

| # | Layout | Title (what the slide says) | Content | Visual |
|---|---|---|---|---|
| 1 | COVER | **Three questions from Friday. Three product answers.** | Kicker: STRATEGIC AREAS 2 · 4 · 5 · AGIL® SECURE V11 FOR CHANGI. Body: what is in V11 today, what is designed, what is on the roadmap — and what we commit to CAG. | viz_cover |
| 2 | CONTENT | **Executive summary** | Three columns (point 2 / 4 / 5): the ask in one line; the answer (Ready: workflow yes, AI layer designed · Partly · Not yet); what CAG sees (22 Oct, Q4); release train. Band: three decisions needed today. | grade tags |
| 3 | CONTENT | **What the team asked on 16 October** | The three asks quoted, each with its strategic area and success outcome, and who is on it. | three cards |
| 4 | CONTENT | **How we grade readiness** | The three grades + "R&D to confirm"; the commitment rule: commit what is in V11 today; show concepts labelled; promise dates only after R&D confirms. | legend |
| 5 | SECTION | **Strategic area 2 · AI-powered AGIL Secure ISMS** | One-line answer. | — |
| 6 | CONTENT | **Six capabilities CAG named, one demo use case each** | Table from 3.1 (capability → use case → in V11 today → concept → train) with thumbnails. | V11 thumbs |
| 7 | SCENE | **One incident, not five alarms** | V11-02 device, lens on the linked alarms; three "watch for" points; grade tags: chrome = today, Co-pilot = concept. | V11-02 |
| 8 | SCENE | **Co-pilot prepares. People approve.** | V11-03 device, lens on the Critical Action step; V11-10 pre-filled escalation as small lens. | V11-03, V11-10 |
| 9 | SCENE | **Ask in plain English. The report writes itself.** | V11-11 device + V11-12 lens on the report draft. | V11-11, V11-12 |
| 10 | CONTENT | **Weili's deck: aligned — commit it with four edits** | Left: what is aligned (4 bullets). Right: the four edits (numbered). Footer: the R&D confirmation on page 2. | two columns |
| 11 | CONTENT | **Page by page** | The 8-row map from section 4. | table |
| 12 | CONTENT | **What is in V11 today, and what the demo adds** | Three columns: In V11 today (unchanged list) · Demo adds (11 deltas, XS/S/M) · Behind the UI. Band: 22 Oct plan A / plan B. | delta thumbnail V11-00 optional |
| 13 | CONTENT | **Supporting material already in hand** | Cards: 12 V11 frames · film 2:50 · pitch deck v2 · AgilFence flow + film 2:27 · six multi-site frames (new). Right: what we need from R&D (AI roadmap by train, VA catalogue status, Co-pilot service plan, pilot data access). | thumbnails |
| 14 | SECTION | **Strategic area 4 · AgilFence unified integration** | Answer: partly in V11 today; the fence module is roadmap. | — |
| 15 | CONTENT | **Today two platforms. Target one workflow.** | Left: AgilFence + iPAMS today (sense, pinpoint, preset, own UI, own reports). Right: V11 (alarm → incident → SOP → report). Middle: what moves, what stays until 11.3. | diagram with icons |
| 16 | CONTENT | **Is there a ready in-built module? Partly.** | Table from 3.2 with grade tags. | table |
| 17 | MAP/CONTENT | **What CAG will see: the fence alarm, end to end** | AF flow board image (boards/AF-00b) + three key frames (AF-02, AF-04, AF-07) small; note: film 2:27 available. | board |
| 18 | SCENE | **Locate: the fence, the segment, the nearest camera** | AF-04 device, lens on nearest cameras; grade tags. | AF-04 |
| 19 | CONTENT | **AgilFence roadmap in V11** | Three trains (11.1 connector · 11.2 module · 11.3 iPAMS retired) with contents and proposed dates; "confirm with R&D" marker. | timeline |
| 20 | SECTION | **Strategic area 5 · Multi-site, multi-brand governance** | Answer: not in V11 today; designed; three trains. | — |
| 21 | CONTENT | **What CAG asked for, in product terms** | Four jobs (estate overview; one baseline, local autonomy; any brand under one roof; open API/SDK) vs V11 today (one site, many clusters; site roles; site integrations — connector list to confirm). | four cards |
| 22 | SCENE | **The concept: one estate, every site** | MS-01 device, lens on the Sites panel; "estate" location selector highlighted. | MS-01 |
| 23 | SCENE | **Local autonomy under one baseline** | MS-02 device (Seletar handles its fence alarm; Central SOC watching), lens on the SOP step tagged Local; MS-03 small lens (baseline with override approval). | MS-02, MS-03 |
| 24 | SCENE | **Any brand, one governance** | MS-05 device (connectors by site and protocol), MS-04 lens (roles × sites). | MS-05, MS-04 |
| 25 | SCENE | **One report for the estate** | MS-06 device; figures labelled illustrative. | MS-06 |
| 26 | CONTENT | **Multi-site roadmap in V11** | Three trains (11.1 foundation · 11.2 governance · 11.3 open platform). | timeline |
| 27 | CONTENT | **One roadmap, three strategic areas** | Timeline Q4 2026 → Q1 2028: trains, pilot, CAG milestones (22 Oct, Q4 workshops, 30 Oct confirmation); every date "proposed". | viz_timeline + native |
| 28 | CONTENT | **What we commit to CAG, and when** | Ladder: Commit now (in V11 today) · Show as concept (labelled) · Promise after R&D confirms (dates) · Do not promise (autonomous closure, facial recognition, performance numbers). | four rows |
| 29 | CONTENT | **Risks, dependencies, owners** | 5 rows: R&D roadmap alignment (Peter, 30 Oct); iPAMS interface (Anuar); demo instance for plan A (R&D); pilot data access and privacy policy (CAG + Sales); Weili deck edits (Weili + Product, 21 Oct). | table |
| 30 | CONTENT | **Decisions needed today** | 1 Approve the commitment list for 22 Oct and Q4. 2 Approve the four edits to Weili's deck. 3 Mandate Product + R&D to lock the train dates by 30 Oct. 4 Name the CAG design partner for multi-site governance (pilot scope). | numbered cards |
| 31 | CLOSE | **Commit what we can show. Show what we will build.** | Next step line. | — |
| A1 | APPENDIX | R&D confirmation checklist | every "R&D to confirm" item from section 3, with owner and date | table |
| A2 | APPENDIX | Figma frame index | all frame IDs and titles in the package, grouped by point | table |
| A3 | APPENDIX | Demo click paths (22 Oct) | plan A / plan B steps per use case | table |

Speaker notes (every slide): 2–4 short paragraphs, spoken, first person plural, no role labels, no durations claimed.

---

## 7. Figma deliverable: frames and boards (V11 design, Roboto, dark)

Design rules (chief designer): reuse the V11 kit (`../isms-mvp-figma/lib/v11.mjs`: `header`, `alertsPanel`, `alertCard`, `deviceStatus`,
`activeAlarms`, `camTile`, `timeline`, `remarksBox`, `sopFlow`, `scene`, `pill`, colours `C`) and the clay twin (`lib/clay.mjs`). Anything new
carries **"NEW" in its layer name**. Console frames are 1400×1069; management pages follow the Incident Management idiom at **1600×1069**
(full-width panel at 40,118 → 1520×911, "Exit …" button top right, title row, filters, table left, detail pane right). Text sizes as the kit
(20/16/14/13/12). Severity colours as V11; Co-pilot lavender only for AI content; **AgilFence amber `#D4B741` only for fence-sensor content**.
Every frame has a `<title>` "MS-0x · …" and Figma-readable layer names. No cursors on these frames. Illustrative data; one "Illustrative"
tag per board, not per frame.

### 7.1 Multi-site scenario (illustrative estate)
Estate: **"CAG estate (illustrative)"**, five sites — do not use other real CAG asset names.
| Site | Devices (online/offline) | Systems | Mode | Tonight |
|---|---|---|---|---|
| Changi Airport · Main (T1–T4, airfield) | 4,812 / 6 | V11 native, AgilFence, LiDAR, VMS, ACS | Central SOC | 2 Critical · 4 Warnings · 1 Info (the demo night) |
| Changi Airfreight Centre (cargo) | 1,204 / 2 | CCTV Vendor B (ONVIF), ACS Vendor C (OSDP), AgilFence | Central SOC | no open alarms |
| Seletar Airport | 486 / 1 | VMS Vendor A, ACS Vendor C, AgilFence 6.2 km | **Local autonomous** (site operator Faizal R.) | 1 Warning: Fence Sector 2 · Seg 2-07, 02:20:14 |
| Changi East (T5 construction site) | 318 / 4 | CCTV Vendor D (ONVIF), gate ACS Vendor E | Onboarding | 2 systems pending certification |
| Fuel farm (off-site) | 212 / 0 | AgilFence, ACS Vendor C | Central SOC | no open alarms |
People: Grace T. (Head of Security, estate governance), Nurul A. (Central SOC operator), Faizal R. (Site security manager, Seletar), an auditor
role (read-only), an integrator role (sandbox API). Seletar clock: 02:20:14 alarm · 02:20:40 Faizal opens it · 02:21:05 verified on PTZ 2-04 ·
02:21:30 Seletar patrol sent · 02:22:00 Seletar tower informed (local step) · 02:41:10 closed by Faizal, visible to Central SOC. Baseline SOP:
**SOP-PER-02 Perimeter intrusion · estate baseline v3** (steps locked) + **one local step "Notify Seletar tower"** (approved override).

### 7.2 Frames
| ID | Size | What it shows | Key NEW elements |
|---|---|---|---|
| **MS-01 Estate overview** | 1400×1069 | Console at estate level: header location **"CAG Estate › All sites"**; Real Time Alerts across sites (card titles prefixed by site, e.g. "Seletar · Fence Sector 2"; counters 2 Critical · 5 Warnings · 1 Info); centre: **estate map** in the clay/grid style — five site tiles on the blue grid with status ring, device count and open-alarm pills, lines to the Central SOC node; right: **Sites panel** (in the Active Alarms slot) listing the five sites: devices online/offline, open alarms by severity, baseline compliance (e.g. "Baseline v3 · compliant" / "override approved" / "onboarding"), link, mode; footer buttons *Open site* · *Estate report*. | estate level in location selector; estate map; Sites panel |
| **MS-02 Site drill-down · Seletar** | 1400×1069 | Header location **"Seletar Airport › Apron"** with a chip "Estate baseline v3 · Local autonomous · Central SOC watching"; Real Time Alerts for Seletar (the fence Warning selected, two Info cards); centre: clay site close-up with fence marker "Seg 2-07 · Alarm"; right: Active Alarms "Fence Sector 2" (time 02:20:14, ID AGF-S2-07, code PER-S02), three fence camera tiles (reuse `cctv/fence_*`), **SOP Flow** tab: baseline steps with a lock glyph and tag "Estate baseline v3", step "Notify Seletar tower" tagged **"Local · approved by Grace T."**, step 2 done "Verified on PTZ 2-04 · 02:21:05", critical step "Dispatch Seletar patrol" approved by Faizal 02:21:30; caption "Handled locally · Central SOC watching". | autonomy chip; locked baseline steps; local step tag |
| **MS-03 Governance · Security baseline** | 1600×1069 | Page "Estate Governance" (Exit button). Tabs: *Security baseline* (active) · Roles & access · Systems & connectors · Estate report. Left table: SOP code · name · baseline version · sites compliant (n/5) · local overrides (count) · last review. Rows: SOP-PER-02 Perimeter intrusion v3 (5/5, 1 override) · SOP-SEC-014 Tailgating v5 · SOP-SEC-021 Unattended item v2 · SOP-ACS-007 Credential misuse v1 · SOP-OPS-003 Overstay in restricted zone v2 · SOP-EMG-001 Emergency lockdown v4. Right detail SOP-PER-02: estate steps (locked), site steps per site (Seletar: "Notify Seletar tower" — Approved · Grace T. · 12 Oct; Cargo: none), a pending override request from Changi East ("Add construction-gate check") with **Approve / Return** critical-action buttons (people decide), audit line. | governance page; override approval |
| **MS-04 Governance · Roles & access** | 1600×1069 | Same page, tab *Roles & access*. Left: role × site matrix (Estate admin · Central SOC operator · Site security manager · Auditor · Integrator) × five sites, cells: Full / Operate / View / — ; right: "Faizal R. · Site security manager · Seletar" — what they can do (operate Seletar, view estate status, cannot edit baseline), last sign-in, MFA on; principle line "Local guards see only their site; the estate sees everything, edits only the baseline". | role matrix |
| **MS-05 Governance · Systems & connectors** | 1600×1069 | Tab *Systems & connectors*. Left table grouped by site: system type (CCTV/VMS, Access control, AgilFence, LiDAR, Intercom, Fire panel) · vendor (Vendor A/B/C/D/E or "AGIL") · protocol (ONVIF Profile S/T, OSDP v2, AgilFence native, LiDAR SDK, SIP, REST API) · status pill (Connected · Certified · Onboarding · Fault) · devices. Changi East rows "Onboarding". Right: **"Add third-party system" dialog** (Escalate-dialog idiom): Site, System type, Protocol (dropdown), Vendor, Credentials/sandbox key, "Run certification checks" (checklist: discovery, events, video, time sync, audit), button *Add system*. Caption: open API and SDK for partners. | connector catalogue; onboarding dialog |
| **MS-06 Governance · Estate report** | 1600×1069 | Tab *Estate report*; period selector "This week"; tiles: open incidents by site and severity (horizontal stacked bars, severity colours, counts labelled), alarms by source system (bars: CCTV/VA, Access control, AgilFence, LiDAR, Intercom, Other), SOP baseline compliance by site (5 rows with status pills), device health by site (online/offline), AgilFence coverage by site (km monitored, segments in alarm/fault), recent estate incidents table (6 rows incl. Seletar PER-S02 closed 02:41:10). Button *Export estate report*. Footnote "Illustrative figures". Charts: thin marks, one hue per job, labels on the marks, no dual axis, counts only. | report tiles |

### 7.3 Boards
| ID | Size | Content |
|---|---|---|
| **P2-flow-board** | 3480×2040, AF-board style | Point 2 end-to-end: 6 steps with previews — V11-01 alert explained · V11-02 investigation (linked alarms) · V11-03 SOP pre-filled, approve · V11-10 escalate pre-filled · V11-11 ask Co-pilot · V11-12 report; strip of the other use cases (V11-04…09) as variants; readiness legend; who acts (AGIL Secure (auto) · Co-pilot (concept) · People decide); release trains per step. |
| **AF-00b-flow-board** | existing | reuse as built by `build-agilfence.mjs` (point 4) |
| **P5-flow-board** | 3480×2040 | Point 5: 6 steps MS-01…06 with previews, captions, who acts (Estate governance · Site operator · Central SOC · System); the Seletar scenario clock; readiness legend + trains. |
| **CPO-master-board** | ~4000×2600 | "Strategic areas 2 · 4 · 5 — end-to-end user flows (V11 design)": three lanes, one per point: the ask, the one-line answer, the flow as thumbnails (6–9 per lane), grade tags, the release train; shared legend; restricted footer. This is the single Figma SVG the C-suite can open. |

### 7.4 Build and packaging
```
A=<V11 assets dir>   # logo_s.png, stars.jpg, cctv/*.jpg + meta.json (incl. fence_* scenes)
OUT=<out dir>
node build-v11.mjs $OUT $A            # V11-01…12 (+ V11-00, V11-00b)
node build-agilfence.mjs $OUT $A      # AF-00…09 + AF-00b
node build-cpo-flows.mjs $OUT $A      # MS-01…06, P2 / P5 boards, CPO master board (reads thumbs of the above)
node make-pdf.mjs $OUT CAG_Strategic_Areas_2-4-5_Figma_frames.pdf
```
`build-cpo-flows.mjs` writes `svg/`, `png/` (1×), `png2x/` (2×, frames only) and `thumb/`; it fails loudly if a referenced thumb is missing.
Package for the user: `CAG_Strategic_Areas_2-4-5_Figma_SVG.zip` (all SVGs), the master board PNG, the PDF.

---

## 8. QA checklist (used by the review agents)
- Every visual has a grade tag; every date says "proposed · confirm with R&D"; no autonomous action; no facial recognition; no vendor names;
  no invented performance numbers; names/sites labelled illustrative; iPAMS spelling; AgilFence amber only on sensor content.
- Deck: validate.py passes; no text below 12 pt; no `fit` warnings; nothing outside margins; notes present on every slide; appendix hidden only if
  `DECK=client` (default: visible, this is internal).
- Frames: no text overlap or clipping; layer names readable; "NEW" on new elements; colours from the kit; charts follow the dataviz rules.
- Files committed: generators and docs only; outputs stay in the scratchpad.
