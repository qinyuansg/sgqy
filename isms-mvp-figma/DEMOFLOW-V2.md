# AgilFence alarm · operator experience v2 (fewer clicks)

Goal: when AgilFence is triggered, the operator sees **who is at the fence without a single click**, and the whole
response takes **three clicks**, each one a decision only a person should make. Same V11 design language, same scenario
(Fence Sector 5, segment 5-14, 02:14:58), no Co-pilot, clock times only, people decide.

## Clicks: v1 vs v2

| | v1 (today's demo) | v2 |
|---|---|---|
| See the alarm | toast → click *Open alarm* | **auto**: the alarm view opens itself (Critical, fence segment) |
| See the person | click *Locate* → click *Open live* | **auto**: PTZ 7-02 is already on preset; its live video and the pre-alarm replay play in the alarm view; map flies to 5-14 |
| Verify | (read the tiles) | **click 1 · Confirm intrusion** (or *False alarm*) under the live video |
| Raise the incident | click *Escalate* → dialog → click *Create Incident* | **auto on confirm**: incident PER-005 is raised with the alarm, clips and segment attached |
| Dispatch | click *SOP Flow* tab → click *Dispatch* | SOP opens itself on confirm with the nearest patrol pre-selected · **click 2 · Dispatch Patrol 2** |
| Inform tower / Airside Ops | SOP step | **auto** on dispatch (logged with time) |
| Police call | SOP step | sent to the duty manager for approval (Daniel approves on his console; shown as a status) |
| Follow the person | (static) | **auto**: PTZ auto-track keeps the person in view; patrol position on the map |
| Close | *Incident Management* → search → row → *Close Incident* → dialog → *Confirm* | close card appears in the alarm view when police custody is logged; reason and evidence pre-filled · **click 3 · Close & sign** |
| **Operator clicks** | **11** | **3** |

## States (frames `AV-S1` … `AV-S8`, 1400×1069, rendered with `DEMO_CLEAN=1`)

1. **AV-S1 quiet** — the console before the alarm (02:14:50).
2. **AV-S2 auto alarm view** (02:14:59) — no pointer needed. The Critical card tops Real Time Alerts; the centre switches to
   an **Alarm view** (NEW): a large live video tile *PTZ 7-02 · Live · on preset 5-14* with the person boxed "Person · climbing",
   a strip under it with *Replay 02:14:41* (pre-alarm, CAM 7-11) and *Thermal*, and a small map inset with segment 5-14 lit
   and the nearest cameras. Chip: "Opened automatically · AgilFence segment 5-14". Active Alarms on the right shows the event
   head and the linked facts (fence 02:14:58, LiDAR 1.7 m 02:15:01, PTZ preset 02:15:03). Under the video: two buttons
   **Confirm intrusion** (red) and **False alarm** (grey) and "Your decision".
3. **AV-S3 confirm hover → clicked** (02:15:24) — pointer on *Confirm intrusion*, pressed state.
4. **AV-S4 confirmed** (02:15:25) — toast "Intrusion confirmed · Nurul A. · 02:15:24 · Incident PER-005 raised"; the right
   panel switches to **SOP Flow** on its own: steps 1–2 ticked Auto, step 3 *Dispatch Patrol 2 · nearest · ETA 02:18:30*
   pre-selected (critical, buttons *Dispatch* / *Choose another*); video keeps playing (now "Auto-track").
5. **AV-S5 dispatch clicked** (02:15:30) — pressed Dispatch.
6. **AV-S6 dispatched** (02:15:40) — step 3 "Approved · Nurul A. · 02:15:30"; step 4 "Airside Ops and tower informed ·
   Auto · 02:15:40"; step 5 "Police call · sent to duty manager" then "Approved · Daniel L. · 02:16:00"; map inset shows Patrol 2
   moving; video auto-tracking the person inside the fence line.
7. **AV-S7 patrol on scene** (02:18:08) — video shows the patrol with the person (fence_patrol scene), map inset patrol at
   5-14; step 6 *Secure, close and report* ready; at 02:26:30 "Police custody logged" and a **Close card** appears under the
   video: reason "Intruder detained · handed to Airport Police" (pre-filled), evidence "3 clips · fence trace · SOP record",
   button **Close & sign** with "Nurul A. · operator".
8. **AV-S8 closed** (02:44:20) — pressed then closed: toast "PER-005 closed · signed Nurul A. · 02:44:20 · report filed";
   the alert card leaves the list; counters drop to 1 Critical; the console returns to quiet with the map normal.

Rules: reuse the UC2 module's building blocks (`screens-v11/demo/uc2-agilfence.mjs`, `lib/fence.mjs` player / nearestCams /
fenceSite, `lib/v11.mjs` kit, `lib/demo.mjs` cursor/btnState/confirmToast); new parts carry `NEW` in layer names; no
lavender, no "Co-pilot" text (header placeholder reads "Search…"); every automatic event says *Auto* with a time; every
decision shows the person and the time.
