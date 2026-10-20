# AgilFence alarm · operator experience v2 — fewer clicks, credible operational logic

Two goals, both from review:
1. **Fewer clicks.** When AgilFence is triggered the operator sees who is at the fence **without a click**: the alarm view
   opens itself with the nearest PTZ already live on the segment.
2. **Operationally credible.** Every critical transition is shown as **Trigger → Decision → Action → Evidence**: why the
   alarm is verified, who has the authority to act, what protects the runway, and what evidence allows closure.
   Principle: the system must give confidence that *the right action was taken, by the right authority, at the right time,
   with verifiable evidence of the outcome* — not just that actions were taken.

Same V11 design language and scenario (Fence Sector 5, segment 5-14, north perimeter, Runway 02L), no Co-pilot / AI,
clock times only, no percentages, people decide. Everything below is a design proposal on simulated data; authorities and
SOP clauses are illustrative and must be validated with airport security operations (see §6).

## 1. State model (shown in the UI as the **Incident progress** rail, NEW)

| Phase | States (each with time + who/what) |
|---|---|
| 1 Detection | Alarm raised (sensor) |
| 2 Verification | Corroborated (sensors on one track) → Authorised-activity check (clear / found / unknown) → **Visually confirmed by operator** (or *Resolved: authorised / false alarm*) |
| 3 Response (concurrent) | Patrol: dispatched → en route → on scene · Police: requested → contacted → acknowledged → responding → on scene · Aviation safety: tower notified → decision → restriction active → restored · Tracking: live, sensor hand-over |
| 4 Resolution & audit | Contained → Intercepted → Detained → Handed to police → Area secured → Runway restored → Fence made safe → Evidence sealed → Submitted → **Signed off (authenticated)** → Closed |

The alarm and the incident share one record: the incident `PER-005` is **raised at the operator's confirmation from alarm
`AGF-5-14`, and everything since 02:14:58 is inherited** (shown on the incident header: "Raised from alarm AGF-5-14 ·
history since 02:14:58").

## 2. Authority matrix shown in the SOP (SOP-PER-02 · Critical perimeter intrusion, illustrative)

| Action | Authority | Approval |
|---|---|---|
| Dispatch nearest patrol | Operator | **Pre-authorised for Critical** — no approval wait |
| Contact Airport Police | Operator | **Pre-authorised for Critical**; duty manager informed in parallel |
| Runway / aviation restriction | **Control tower (ATC supervisor)** — not security | Tower decides and records; security sees the decision and its status |
| Emergency lockdown | Duty manager or above, with confirmation | not used in this scenario; header shows *Lockdown status: not active* separately from the button |
| Close a Critical incident | Operator submits · **Duty manager signs with his own authenticated session** (badge + PIN) | Close is blocked until every required evidence item is complete |
| Escalation timeout | If the duty manager does not acknowledge within the SOP time, the head of security is notified (shown as a rule, not triggered tonight) | |

## 3. The flow — states AV-S1 … AV-S10c (frames 1400×1069 unless noted, `DEMO_CLEAN=1`)

**Operator clicks: 3 (Confirm intrusion · Dispatch Patrol 2 · Submit for sign-off). Duty manager: 1 authenticated sign-off on his own console.** Police contact and tower notification are SOP actions the operator triggers with the confirmation (pre-authorised), shown with their full acknowledgement chain.

1. **AV-S1 · quiet** 02:14:50 — console; header shows the Emergency Lockdown button **and** a separate status pill
   "Lockdown: not active".
2. **AV-S2 · alarm view opens itself** 02:14:59 (Trigger: AgilFence 5-14 climb signature). No click. Centre = **Alarm view (NEW)**:
   big live tile *PTZ 7-02 · Live · on preset 5-14* with the person boxed, strip *Replay 02:14:41 (CAM 7-11, pre-alarm)* + *Thermal*,
   map inset (fence line, 5-14 lit, cameras, Runway 02L 130 m). Chip "Opened automatically · 02:14:59". Toast offers **Mute tone**
   (not "Silence"): the alarm stays Critical and visible until resolved. Incident progress rail: *Detection ✓ 02:14:58*.
3. **AV-S3 · verification panel** 02:15:20 — right panel **Verification (NEW)**:
   - **Corroboration: same track** — AgilFence 5-14 climb 02:14:58 → LiDAR L-5B track T-07 (1 object, 1.7 m) 02:15:01 → PTZ 7-02
     auto-track locked on T-07 02:15:12; each row with the sensor and its **health: OK**; status "**Corroborated · 3 sensors, one track**".
   - **Authorised-activity check** with sources: Permit-to-work (no permit for Sector 5 tonight) · Patrol roster (no patrol in Sector 5) ·
     Gate access (no badge at G-5 since 23:40) · Maintenance schedule (none) — each **Clear**, with an **Unknown** state style defined
     (none tonight).
   - Decision bar: **Confirm intrusion** (red) · **Authorised activity** · **False alarm** · "Your decision — becomes the incident record".
4. **AV-S4 · click 1: Confirm intrusion** 02:15:24 (pressed). Decision recorded: *Visually confirmed · Nurul A. (owner) · 02:15:24*.
5. **AV-S5 · incident raised, response opens in parallel** 02:15:26 — toast "Incident PER-005 raised from alarm AGF-5-14 · history
   inherited · owner Nurul A.". Right panel switches to **Response (NEW)**, three concurrent lanes:
   - **Patrol** — Patrol 2 (Arjun + 1) nearest · ETA 02:18:30 · *Pre-authorised (SOP-PER-02 §3.1)* · buttons **Dispatch Patrol 2** / Choose another.
   - **Police** — *Requested 02:15:25 (pre-authorised §3.2)* → *Contacted · Airport Police ops room · 02:15:38* → (pending ack). Duty manager
     Daniel L. *informed 02:15:25 · reviewing*.
   - **Aviation safety** — *Tower notified 02:15:25 · person 130 m from Runway 02L* → awaiting tower decision (authority: ATC).
6. **AV-S6 · click 2: Dispatch Patrol 2** 02:15:30 (pressed).
7. **AV-S7 · response running** 02:16:40 — Patrol *Dispatched · Nurul A. · 02:15:30 → En route*. Police *Acknowledged · Sgt. Lim (APD) ·
   02:15:52 → Responding · unit AP-12 · 02:16:05 · ETA 02:24:00*. Duty manager Daniel L. *acknowledged 02:15:41* (S7 on); the Response
   tab shows the matrix rule "no duty-manager acknowledgement within SOP time → head of security notified · not triggered" (S5–S8). Aviation *Tower decision · Runway 02L: arrivals held, no movements on 02L ·
   ATC supervisor Tan · 02:15:58 · restriction **active***. **Exception:** "PTZ 7-02 video lost 02:16:40 · LiDAR T-07 still tracking ·
   PTZ 7-03 took over automatically 02:16:42" — the live tile switches to PTZ 7-03 with a small amber banner; map shows T-07 moving
   inside the fence line toward the runway strip, LiDAR trail.
8. **AV-S8 · on scene and outcomes** (condensed sequence, each with time on the Incident progress rail) — *Patrol on scene 02:18:08* →
   *Contained 02:18:08 (person stationary inside fence line)* → *Intercepted 02:19:30* → *Detained 02:20:05* → *Police on scene AP-12
   02:24:10* → *Handed to police · custody AP-12 · 02:26:30*. Live tile shows patrol with the person (fence_patrol scene).
9. **AV-S9 · closure checklist** 02:43:50 — **Close (NEW)** card, each item with evidence and source: Handed to police (custody
   record AP-12, 02:26:30) ✓ · Area secured (sweep of Sector 5 by Patrol 2, 02:38:40) ✓ · Runway 02L restored (tower, ATC Tan, 02:31:10) ✓ ·
   Fence 5-14 made safe (mesh bent, no cut; guard posted; FM ticket FM-90412, 02:40:15) ✓ · SOP 7 of 7 steps (02:43:30) ✓ · Evidence pack sealed
   (3 clips + fence trace + LiDAR track, sealed 02:43:40) ✓. Button **Submit for sign-off** (enabled only because all six are ✓; the
   frame shows the rule "Closing is blocked until every item is complete"). Pointer clicks it (**click 3**).
10. **AV-S10a · duty manager sign-off dialog** 02:44:14 — the **duty manager's console** (same V11 shell and header grid, user chip
    "Daniel L. · Duty manager"): sign-off dialog with the six evidence items, "Sign with badge + PIN" filled (masked), button
    **Sign and close** not yet pressed; behind it the incident is still Critical, Submitted.
    **AV-S10b · closed** 02:44:20 — dialog gone, header pill *Closed*, toast "PER-005 closed · signed by Daniel L. · badge + PIN ·
    audit record locked", counters down. **AV-S10c · operator console back to quiet** — Nurul A.'s console, counters down, closure notice.

## 4. Alternative path (short vignette, frames AV-A1, AV-A2)

Same alarm on another night: **AV-A1** — verification shows *Permit-to-work PTW-2231 · fence repair Sector 5 · 01:00–04:00 · contractor
crew of 2 · badge-in at G-5 01:05* → **Found**; corroboration shows 2 people at the works location. Decision bar highlights
**Authorised activity**. **AV-A2** — after the click: "Resolved as authorised activity · Nurul A. · 01:22:10 · linked to PTW-2231 ·
alarm kept in the record"; no incident raised, no patrol dispatched; a note "Works supervisor called to confirm crew · 01:21:40".

## 5. What the film shows on screen (besides the UI)
Clock chip (scenario time) · operator-clicks counter (0 → 3) · opening slate and end slate. No subtitles, no captions.

## 6. Open questions for the workflow validation session (Product, airport security operations, systems engineering, software)
1. What corroboration makes a sensor alarm a confirmed intrusion (sensors on one track, operator visual, both)?
2. If the intruder nears the runway before the patrol arrives: who decides the aviation restriction (ATC), and how is it recorded?
3. Which actions are pre-authorised for Critical, which need approval, and what happens when the approver is unavailable?
4. What evidence proves resolution: containment, police handover, area sweep, runway restoration, fence made safe?
5. What stops premature closure or signing on someone else's behalf (evidence gate, authenticated sign-off, locked audit)?

## 7. V11 fidelity (supersedes the layout in §3 — product owner, 20 Oct)

The flow must live inside the **original V11 screens**; no invented tabs, rails or header parts.

| v2 concept | Where it lives in V11 |
|---|---|
| Alarm view opens itself | The **Active Alarms panel opens automatically** on the Critical fence alarm (event head, the **three camera tiles**: PTZ 7-02 live big, CAM 7-11 pre-alarm replay, LiDAR L-5B), and the **3D viewer Locates automatically** to segment 5-14 with the nearest-cameras list and the PTZ 7-02 live player floating in the viewer (the AF-04/AF-05 pattern). |
| Verification (corroboration, authorised-activity check) | **Investigation tab** (default tab): *System* entries — "3 alarms linked · one track" with time, sensor and *Health OK* per row; "Authorised-activity check" with its sources (permit-to-work, patrol roster, gate access, maintenance) and Clear / Found / Unknown. |
| Decision: Confirm intrusion / Authorised activity / False alarm | **SOP Flow tab**, step 1 *Verify the alarm* as a **Critical Action** step with those three buttons (the V11 critical-step style with action buttons). |
| Incident raised from the alarm | On confirm: toast "Incident PER-005 raised from alarm AGF-5-14 · history inherited"; the header's **Incident Management** button shows "1 new". |
| Response lanes | **SOP Flow steps**: 2 *Dispatch Patrol 2* (Critical Action, Dispatch / Choose another, tag "Pre-authorised · SOP-PER-02 §3.1"); 3 *Airport Police* with checklist items requested → contacted → acknowledged (Sgt. Lim) → responding (AP-12) → on scene, tag "Pre-authorised §3.2"; 4 *Tower / aviation safety* items notified → ATC decision "Runway 02L arrivals held · ATC supervisor Tan" → restriction active → restored, tag "Authority: ATC"; 5 *Keep target in view* (Auto); each item with its time. Duty manager informed/acknowledged as an item. |
| Exception | Camera tile 1 shows "PTZ 7-02 · video lost 02:16:40" and swaps to **PTZ 7-03**; Investigation gets a *System* entry "PTZ 7-02 video lost · PTZ 7-03 took over 02:16:42 · LiDAR T-07 tracking". |
| Outcomes | SOP step 6 *Contain and hand over* items: contained 02:18:08 → intercepted 02:19:30 → detained 02:20:05 → police on scene 02:24:10 → handed to police 02:26:30; patrol radio entries (*Arjun (radio)*) in the Investigation timeline. |
| Evidence-gated close | SOP step 7 *Secure, close and report*: the six evidence items as checked items with sources, the rule "Closing is blocked until every item is complete", Critical Action **Submit for sign-off**. |
| Authenticated sign-off | The duty manager's **Incident Management page** (V11 1600-wide page): PER-005 row "Pending sign-off", detail pane with **Remarks / SOP Flow** tabs (V11), **Close Incident** → sign dialog (evidence list, badge + PIN) → row *Closed · Daniel L.*. |
| Alternative path | Investigation shows "Permit-to-work PTW-2231 · Found"; SOP step 1 **Authorised activity** → alarm cleared with reason, "no incident raised". |

Header, Real Time Alerts, Device Status and footer buttons stay exactly as V11 (`lib/v11.mjs`); the search placeholder reads "Search…".
The lockdown-status pill and user chip are dropped to stay true to V11 (kept as proposals in §2).
**Operator clicks: 4** — SOP Flow tab · Confirm intrusion · Dispatch Patrol 2 · Submit for sign-off (v1: 11). Duty manager: Close Incident + Sign and close on his own Incident Management page.
