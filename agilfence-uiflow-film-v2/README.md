# AgilFence UI-flow film v2

A 2:01 screen-flow film (1920×1080, 30 fps, no narration, no subtitles, no labels) of the **operator experience v2**
for an AgilFence alarm on the original AGIL Secure V11 screens (spec: `../isms-mvp-figma/DEMOFLOW-V2.md`). The Active Alarms
view opens itself on the Investigation tab with PTZ 7-02 live on the segment, and the AgilFence alarm card takes the top of
the left Real Time Alerts list (2 Critical). The operator makes four clicks (the SOP Flow tab · Confirm intrusion · Dispatch
Patrol 2 · Submit for sign-off), the duty manager closes the incident on his own Incident Management console (Close Incident ·
Sign and close, badge + PIN), the operator's console returns to quiet with the card gone from the list and the closure
notice, and a short alternative path shows another night with approved works: two clicks, no incident. On screen there is
only the product UI, a pointer clicking the real V11 controls, calm camera pushes, the scenario clock chip, an
operator-clicks counter, an opening slate, a short card and an end slate. Music and UI sounds only.

Same approach and engine as v1 (`../agilfence-uiflow-film`): the deterministic film engine (`engine.js`, `kit.js`,
`render.mjs`, `music.py`, `mix.py`, `deliver.sh`) and real V11 frames shown through a moving camera. The frames are the
20 clean (DEMO_CLEAN) V11-faithful AV frames from `../isms-mvp-figma/screens-v11/demo/av-autoview.mjs` (1400×1069, the
Incident Management frames 1600×1069; rendered at 2x).

| Scene | Seconds | Frame | On screen |
|---|---|---|---|
| slate | 0–3.5 | — | AgilFence × AGIL Secure V11 · operator experience v2 · see who is at the fence without a click · three decisions · evidence before closure · illustrative scenario, simulated data |
| quiet | 3.5–7 | AV-S1-quiet | the console at 02:14:50; push on the Real Time Alerts list: 1 Critical, Staff Door D-214 on top |
| alarm | 7–19 | AV-S2-auto-open-investigation | alarm tone; on the same framing the AgilFence card arrives at the top of the list (0.2 s change, a short red flash, 2 Critical; held on the list to 9.4 s) and the nearest cameras and the viewer open themselves (no pointer); wide on the Active Alarms panel; hero push on PTZ 7-02 live in the viewer, the person climbing (thumbnail 12.6 s); the three tiles; the panel |
| verify | 19–28.5 | AV-S2 → AV-S3-sop-tab-click | the Investigation tab: 3 alarms linked · one track (T-07) · Health OK, the authorised-activity check · 4 of 4 sources Clear; pointer clicks the **SOP Flow** tab (operator click 1, 28.3 s) |
| decide | 28.5–37 | AV-S3 → AV-S4-verify-step → AV-S5-confirm-click | step 1 Verify the alarm (Your decision); the live tile follows the track (auto-track T-07) as the pointer rests on Confirm intrusion; pointer clicks **Confirm intrusion** (operator click 2, 36.8 s) |
| raised | 37–50 | AV-S6-incident-raised-dispatch → AV-S7-dispatch-click | Confirmed · Nurul A. · 02:15:24; toast *Incident PER-005 raised from alarm AGF-5-14 · history inherited*; the list: the top card now reads *Incident PER-005 · AgilFence 5-14 · climb* (held 42.7–45.0 s); police requested, duty manager informed, tower notified; pointer clicks **Dispatch** on step 2 Dispatch Patrol 2 (operator click 3, 49.8 s) |
| running | 50–57 | AV-S8-police-tower-running | police chain (acknowledged, responding, ETA); tower decision *Runway 02L arrivals held* (ATC); the map: Patrol 2 en route, PTZ 7-02 tracking |
| handover | 57–62.5 | AV-S9-ptz-handover | PTZ 7-03 took over 02:16:42 on the live player; step 5 Keep target in view (PTZ 7-02 video lost, PTZ 7-03 took over automatically) |
| outcomes | 62.5–69.5 | AV-S10-contained-handed-over | patrol and police with the person on the live player; step 6 contained → intercepted → detained → handed to police (02:26:30) |
| closure | 69.5–78.5 | AV-S11-close-step-submit | step 7 (tab row to the Clear / Escalate / Acknowledge footer): *Closing is blocked until every item is complete*, six evidence items with source and time; pointer clicks **Submit for sign-off** (operator click 4, 78.3 s) |
| pending | 78.5–81.3 | AV-S11b-pending-signoff | the list: the top card now reads *Incident PER-005 · Pending sign-off* (held 79.7–81.2 s) |
| signoff | 81.3–90.8 | AV-S12-im-pending-signoff → AV-S13-im-sign-dialog | the duty manager's Incident Management (scan reveal): PER-005 · Pending sign-off · Nurul A. 02:43:50; the incident detail; pointer clicks **Close Incident** (86.9 s); the dialog: six items, badge + PIN, *Signed in as Daniel L. · Duty manager*; pointer clicks **Sign and close** (90.6 s) |
| closed | 90.8–97.3 | AV-S14-im-closed → AV-S15-operator-closed | *PER-005 closed · signed by Daniel L. · 02:44:20 · removed from Real Time Alerts*, the row Closed, the bar *Closed 02:44:20 · signed off by Daniel L. · badge + PIN*; then (94.0 s, scan reveal) Nurul A.'s operator console: the card has left the list (1 Critical again; Staff Door D-214 shows 02:14 am), the closure notice |
| card | 97.3–99.5 | — | Another night · approved works |
| alt | 99.5–110 | AV-A1-permit-found → AV-A1b-authorised-click | the list: the AgilFence alarm card on top, flashing red (held 101.0–102.9 s); the Investigation tab: Permit-to-work PTW-2231 · Found, gate badges, maintenance; pointer clicks the **SOP Flow** tab (107.2 s), then **Authorised activity** (109.8 s) |
| resolved | 110–117.6 | AV-A2-cleared-authorised | step 1 Authorised · 01:22:10 · no incident raised, the other steps Not required; the list: *Cleared · authorised activity · PTW-2231* (held 113.2–115.3 s); toast *Alarm AGF-5-14 cleared · authorised activity* |
| end | 117.6–121.1 | — | Three operator decisions · authority on every action · evidence before closure · illustrative scenario, simulated data |

Chips (top right): **Fence Sector 5** + scenario clock (02:14:50 → 02:44:20 on the main path, 01:20:45 → 01:22:10 on the
alternative path; it never runs behind the latest time on screen); **Operator clicks** 0 → 4 at the four operator clicks
(the duty manager's two clicks do not count; the alternative path counts again, 0 → 2). The duty manager's authentication is
shown by the product itself (the dialog's *Signed in as Daniel L. · Duty manager* line and the closed notice), not by a chip.
Sounds: the alarm tone at the alarm view, a click per click, a tab switch, a notify on automatic or acknowledged events (alarm
view opened, incident raised, acknowledgements, handed to police, resolved), a soft warning at the PTZ hand-over, a pop at the
Close Incident dialog, success at the sign-off.

## What changed vs v1

- **Operator clicks 11 → 4.** v1: Open alarm · Locate · Open live · SOP Flow · Dispatch · Escalate · Create Incident ·
  Incident Management · the PER-005 row · Close Incident · Confirm close. v2: SOP Flow tab · Confirm intrusion · Dispatch
  Patrol 2 · Submit for sign-off (three decisions). The Active Alarms view opens itself with the nearest PTZ live on the
  segment (no Open alarm / Locate / Open live), and the AgilFence alarm card takes the top of the Real Time Alerts list.
- **Verification before action.** Corroboration on one track (AgilFence 5-14 → LiDAR L-5B track T-07 → PTZ 7-02 auto-track,
  each with sensor health) and an authorised-activity check (permit-to-work, patrol roster, gate access, maintenance) with
  Clear / Found / Unknown states. The operator's decision becomes the incident record.
- **One record.** The incident is raised at the confirmation from the alarm and inherits its history since 02:14:58 (no
  separate Escalate → Create Incident step).
- **Authority on every action** (SOP-PER-02, illustrative): patrol dispatch and police contact are pre-authorised for Critical
  (no approval wait); the runway restriction is decided and recorded by the control tower (ATC supervisor), not security;
  the duty manager is informed in parallel and acknowledges; the escalation rule (no acknowledgement within SOP time → head of
  security) is shown as a rule, not triggered. Lockdown has its own status pill, apart from the button.
- **Concurrent response steps** in the V11 SOP Flow (Patrol · Police · Aviation safety) with the full acknowledgement chain and times; tracking
  continues through an exception (PTZ 7-02 video lost, PTZ 7-03 took over automatically).
- **Outcomes, not only actions,** in the SOP steps: contained, intercepted, detained, handed to police, area secured, runway
  restored, fence made safe, evidence sealed.
- **Evidence before closure.** Close is blocked until six evidence items are complete; the operator submits, and the duty
  manager closes it from his own Incident Management (Close Incident, then Sign and close with badge + PIN); the audit
  record is locked and the card leaves the operator's Real Time Alerts list.
- **Alternative path:** an alarm during approved works is resolved as authorised activity (linked to PTW-2231) with two clicks
  (SOP Flow tab · Authorised activity); no incident, no patrol.
- Film: no video wall; the duty manager's Incident Management appears with a scan reveal; an operator-clicks counter
  joins the clock chip. Since the V11-faithful re-render the screens are the original V11 header, panels, tab names
  (Investigation / SOP Flow) and footer (Clear / Escalate / Acknowledge), with no added status pills or progress rail.

## Build

```bash
AV_FRAMES=/path/to/frames BUILD=/path/to/build ./build.sh     # AV_FRAMES defaults to $BUILD/../frames
CUT=highlight BUILD=/path/to/build-highlight ./build.sh       # another cut of the same film (one BUILD dir per cut)
```

### Cuts (variants)

`CUT` (default `operator`) selects the film; everything else (engine, kit, frames, render, mix, delivery) is shared.

| CUT | Timeline | Scene files | Score | Deliverables |
|---|---|---|---|---|
| `operator` (default) | `src/js/timeline.js` | `src/js/scenes/flow.js`, `src/js/chrome.js` | `score()` in `tools/music.py` | `AgilFence_UI_Flow_v2_1080p_*` |
| `<cut>` | `src/js/timeline-<cut>.js` | its `"scripts"` list, `src/js/scenes/<cut>/*.js` | `score(M, total, scenes, cues)` in `tools/music_<cut>.py` | `AgilFence_v2_<Cut>_1080p_*` |

- `src/index.html` reads `?cut=` (or a `window.CUT` set before its loader) and loads the cut's timeline, then `geo.js`,
  `engine.js`, `kit.js` and the scripts the timeline lists. `tools/render.mjs`, `cues.mjs` and `preview.mjs` read `$CUT`
  and pass it to the page URL; `render.mjs` reads fps/total from the cut's timeline.
- A cut's timeline may also carry `"thumb"` (thumbnail time, used by `build.sh` unless `THUMB_T` is set) and `"mix"`
  (`{"music": LUFS, "sfx": LUFS, "ceiling": dBTP}` bus levels and limiter ceiling for `tools/mix.py`; default −17 / −23 / −4;
  the operator cut sets a −4.5 dBTP ceiling so its AAC encodes stay under −3 dBTP at −14 LUFS without a gain trim).
- Extra assets for a cut: an executable `tools/assets-<cut>.sh`, run by `build.sh` after `tools/assets.sh`.
- `K.console` accepts a higher zoom ceiling per device (`c.zmax`, default 2.3).

**B · Highlight** (`CUT=highlight`, 45.5 s, music-led, 120 BPM; `src/js/timeline-highlight.js`, `src/js/scenes/highlight/`,
`tools/music_highlight.py`, `tools/assets-highlight.sh`), on the V11-faithful AV frames (AV-S1 … AV-S14): 1.0 s black →
*AgilFence × AGIL® Secure V11* (gone before the console enters, so no text over the UI) → quiet console, 2 s, on the airport model
(the alert list stays out of frame) → **the fence feels it** (4.5–6.5 s): the AF-01 fence bay, the climber, the strained
sensors pulsing on the cable, *Fence Sector 5 · Segment 5-14* → **the alarm card drops in at the top of the left Real Time
Alerts list** (6.7 s: the rows below slide down one card and the card fills only the gap they open, 1 → 2 Critical) as the
Active Alarms panel opens itself; the whole console holds with the card in place (to 8.0 s), then in on the card (red pulse: *Fence Sector 5 · AgilFence alarm · segment 5-14 · climb · Now*), then the hero push onto the climber on the
PTZ 7-02 live player → the Investigation tab (3 alarms linked · one track, health OK; authorised-activity check, 4 of 4 Clear)
→ the pointer clicks **SOP Flow** (14.5 s) → step 1 *Verify the alarm*, **Confirm intrusion** (16.5 s) → *Confirmed ·
Nurul A. · 02:15:24* → the whole console (the card now reads *Incident PER-005*, the *Incident PER-005 raised* toast, both
pulsed) → **Dispatch** (Patrol 2, 20.5 s) → the police and tower items tick, one a beat (contacted, acknowledged, responding,
duty manager acknowledged, ATC arrivals held, restriction active) → the PTZ 7-02 → 7-03 hand-over tile → handed to police
on the live player, then the step 6 outcomes → step 7 evidence (six items), **Submit for sign-off** (33.5 s) → the duty
manager's Incident Management: PER-005 *Pending sign-off*, **Close Incident** (36.0 s) → the Close Incident dialog (evidence
6 of 6, badge + PIN), **Sign and close** (38.5 s, where the score resolves) → PER-005 *Closed · Daniel L.*, pull back → end
card *AgilFence — the fence feels it. / AGIL Secure shows who is there. / Your team decides.* (the first line rises during
the last shot's fade) + *Illustrative scenario · simulated data*. Clicks: operator 4 (SOP Flow, Confirm intrusion, Dispatch,
Submit for sign-off), duty manager 2 (Close Incident, Sign and close). Shots cross-dissolve over 0.4 s and the outgoing shot
holds still through the dissolve; the clock chip (small) is the only chrome over the UI, no click counter. The fence plate
needs the AF-01 crop (`tools/assets-highlight.sh` runs `tools/assets-story.sh`). Thumbnail at 11.0 s (the climber). The clock chip holds 02:14:59 while the card
drops in ('Now') and steps to 02:15:06 as the camera leaves the card (9.5 s). The left card's *Pending sign-off* state is not
shown on the operator console in this cut (it does not use AV-S11b): the cut goes from **Submit for sign-off** to
the duty manager's Incident Management, where PER-005 reads *Pending sign-off*.

**C · Product story** (`CUT=story`, 67 s, 80 BPM; `src/js/timeline-story.js`, `src/js/scenes/story/`, `tools/music_story.py`,
`tools/assets-story.sh` + `tools/af-crops.py`): a cold open on the fence bay with *AgilFence × AGIL® Secure V11* laid over
it, then five chapters, each opened by a large headline card (1.5 s, a two-beat pickup; every headline sharp by 0.33 s;
every chapter starts on a downbeat, the first on the first frame):

| Chapter | Seconds | Picture |
|---|---|---|
| cold open | 0.0–4.5 | AF-01 fence bay (segment callout painted out): the climber and the strain ripple from 0.3 s (pulse rings, a signal running along the fibre), drift in, ease back to the whole climber; the product line over it (lower third, 1.8–4.5) |
| card 1 *Feels a climb* | 4.5–6.0 | — |
| 1 | 6.0–12.0 | AF-01 *What the fence feels*, near full frame: a dashed threshold across both traces, the wind trace (Seg 5-09) stays under it, the climb trace (Seg 5-14) crosses it at 8.1 s, the *Alarm* badge pulses; callout *Wind: no alarm · Climb: alarm* |
| card 2 *Pinpoints the segment* | 12.0–13.5 | — |
| 2 | 13.5–19.5 | AF-04 airfield map: a light runs along the fence line and stops on 5-14 (lit), push in, PTZ 7-02's view cone swings onto the segment and locks |
| card 3 *Shows who is there* | 19.5–21.0 | — |
| 3 | 21.0–34.5 | AV-S1 quiet (1 Critical) → at 22.4 s the AgilFence alarm card drops in at the top of the left Real Time Alerts list (the rows below slide down one card, 2 Critical) as AV-S2 opens itself (Active Alarms on the Investigation tab, nearest cameras, the PTZ 7-02 live player in the viewer; no pointer); in on the card (red pulse) and the nearest cameras, then the hero push onto the climber on the viewer player; the three tiles; the Investigation tab: 3 alarms linked · one track (T-07) · Health OK, the authorised-activity check · 4 of 4 sources Clear |
| card 4 *Coordinates the response* | 34.5–36.0 | — |
| 4 | 36.0–49.5 | the pointer clicks the **SOP Flow** tab (37.3 s) → AV-S3 step 1 *Verify the alarm* → AV-S4/S5 **Confirm intrusion** (39.4 s) → AV-S6 *Confirmed · Nurul A. · 02:15:24*, step 2 → **Dispatch** Patrol 2 (41.9 s, AV-S7) → AV-S8 police chain and tower decision (Runway 02L arrivals held) → AV-S9 PTZ 7-03 took over on the viewer player, still on the person → AV-S10 *Handed to police · AP-12* on the viewer player |
| card 5 *Closes with evidence* | 49.5–51.0 | — |
| 5 | 51.0–61.5 | AV-S11 step 7, six evidence items, **Submit for sign-off** (54.25 s) → the duty manager's Incident Management (scan reveal; under it the operator's list card reads *Incident PER-005*): AV-S12 PER-005 *Pending sign-off*, **Close Incident** (56.6 s) → AV-S13 the dialog (6 of 6, badge + PIN, signed in as Daniel L.), **Sign and close** (59.1 s) → AV-S14 PER-005 *Closed · Daniel L.*, pull back to the whole console |
| end | 61.5–67.0 | *AgilFence × AGIL® Secure V11* (104 px) / *On Changi’s airfield perimeter since 2013* (52 px) / *Illustrative scenario · simulated data* (23 px), held over 3 s |

Clicks: operator 4 (SOP Flow tab, Confirm intrusion, Dispatch, Submit for sign-off), duty manager 2 (Close Incident, Sign and close), all on real V11 controls of the V11-faithful AV frames (AV-S1 … AV-S14). The clock chip (Fence Sector 5, 02:14:50 → 02:44:20; never behind the latest time on screen) shows only over the chapter 3–5 consoles; no click counter. The AF-01/AF-04
illustrations (2x renders, `AF_ILLUS`, default `$BUILD/../../sa245/assets/af`) are cropped into `src/assets/af/AF-01-fence.png`
(highlight cut), `AF-01-fence-clean.png` (story: the segment callout painted out, so pinpointing first shows in chapter 2),
`AF-01-trace.png` and `AF-04-map.png`; `tools/af-crops.py` scans each crop and fails on violet (lavender) pixels beyond a few
anti-aliased ones, so the AF-04 alert list with its concept line and its right panel stay out of the film. Thumbnail at 27.2 s (the climber on the viewer's PTZ 7-02 live player).

- `src/js/timeline.js`: hand-written scene windows (`lines` is empty: no voiceover)
- `tools/assets.sh`: copies `png2x/AV-*.png` into `src/assets/af/` and writes `src/js/geo.js` (frame sizes of the frames in the frames dir only, AV anchors from `demo-anchors.json`); it leaves the AF-* illustration crops alone
- `src/js/scenes/flow.js`: the two console scenes (main path, alternative path): screens, camera shots (by centre and zoom; framings whose edges fall in the gaps between the V11 columns need no edge fade), pointer, sound cues
- `src/js/chrome.js`: slates, the card, the clock chip and the operator-clicks counter
- `tools/music.py`: the score follows the v2 scenes; `tools/mix.py` skips the voice bus when `$BUILD/vo` is absent and limits at −4 dBTP (or the timeline's `mix.ceiling`)
- `tools/truepeak.sh`: EBU R128 integrated loudness and true peak of a file; `build.sh` and `tools/deliver.sh` re-measure each
  encoded MP4 and trim the AAC gain until it is at or below −3.0 dBTP
- `tools/preview.mjs --out dir t1 t2 …`: stills at given times

Deliverables in `$BUILD/dist`: `AgilFence_UI_Flow_v2_1080p_clean_MASTER.mp4`, `AgilFence_UI_Flow_v2_1080p_share.mp4`
(≤ 28 MiB) and `AgilFence_UI_Flow_v2_1080p_thumbnail.jpg` (the hero moment, 12.6 s). Audio: about −14 LUFS integrated, at or below −3.0 dBTP measured on the encoded MP4s.
Illustrative scenario, simulated data; authorities and SOP clauses must be validated with airport security operations.
