# AgilFence UI-flow film v2

A 1:50 screen-flow film (1920×1080, 30 fps, no narration, no subtitles, no labels) of the **operator experience v2**
for an AgilFence alarm on the AGIL Secure V11 front end (spec: `../isms-mvp-figma/DEMOFLOW-V2.md`). The alarm view
opens itself with PTZ 7-02 live on the segment, so the operator sees who is at the fence without a click. The operator
then makes three decisions (Confirm intrusion · Dispatch Patrol 2 · Submit for sign-off), the duty manager signs off on
his own authenticated console, the operator's console returns to quiet with the closure notice, and a short alternative
path shows another night with approved works: one click, no incident. On screen there is only the product UI, a pointer
making the clicks, calm camera pushes, the scenario clock chip, an operator-clicks counter, an opening slate, a short card
and an end slate. Music and UI sounds only.

Same approach and engine as v1 (`../agilfence-uiflow-film`): the deterministic film engine (`engine.js`, `kit.js`,
`render.mjs`, `music.py`, `mix.py`, `deliver.sh`) and real V11 frames shown through a moving camera. The frames are the
14 clean (DEMO_CLEAN) AV frames from `../isms-mvp-figma/screens-v11/demo/av-autoview.mjs` (1400×1069, rendered at 2x).

| Scene | Seconds | Frame | On screen |
|---|---|---|---|
| slate | 0–3.5 | — | AgilFence × AGIL Secure V11 · operator experience v2 · see who is at the fence without a click · three decisions · evidence before closure · illustrative scenario, simulated data |
| quiet | 3.5–7 | AV-S1-quiet | the console at 02:14:50; push on the header pill *Lockdown: not active* |
| alarm | 7–19.5 | AV-S2-alarm-view-auto | alarm tone, the alarm view opens itself (no pointer); hero push on PTZ 7-02 live, the person climbing; pull back to the pre-alarm replay strip and the map inset |
| verify | 19.5–31 | AV-S3-verification | push on corroboration (one track, three sensors, health OK), then the authorised-activity check (four sources, Clear); pointer clicks **Confirm intrusion** (operator click 1, 30.8 s) |
| confirmed | 31–34 | AV-S4-confirm-click | Recorded · Visually confirmed · Nurul A. (owner) · 02:15:24; the progress rail |
| response | 34–47.5 | AV-S5-incident-response-lanes | Incident PER-005 raised from alarm AGF-5-14 · history inherited; push across the Patrol, Police and Aviation-safety lanes (about 1.4 s held on each); pointer clicks **Dispatch Patrol 2** (operator click 2, 47.3 s) |
| dispatched | 47.5–49.5 | AV-S6-dispatch-click | dispatch recorded |
| running | 49.5–61.5 | AV-S7-response-running-ptz-handover | police chain (acknowledged, responding, ETA); tower decision *Runway 02L: arrivals held*; exception banner *PTZ 7-02 video lost · PTZ 7-03 took over* on the live tile |
| outcomes | 61.5–70 | AV-S8-on-scene-outcomes | the rail with the outcomes (on scene → contained → intercepted → detained → police on scene → handed to police); the live tile shows the patrol and police with the person; the clock chip steps to 02:26:30 at the crossfade (the latest time on screen) |
| closure | 70–80 | AV-S9-closure-checklist-submit | six evidence items with source and time, the gate rule *Closing is blocked until every item is complete*, Submit for sign-off right under the sign-off lines; pointer clicks **Submit for sign-off** (operator click 3, 79.8 s) |
| signoff | 80–86.5 | AV-S10a-signoff-dialog | the duty manager's console (scan reveal): sign-off dialog, six items, badge + PIN; pointer clicks **Sign and close** (86.3 s) |
| closed | 86.5–92.5 | AV-S10b-closed → AV-S10c-operator-quiet | PER-005 closed · signed by Daniel L. · badge + PIN · audit record locked; then (89.7 s, scan reveal) Nurul A.'s operator console back to quiet with the closure notice |
| card | 92.5–94.7 | — | Another night · approved works |
| alt | 94.7–101.2 | AV-A1-authorised-work-found | Permit-to-work PTW-2231 · Found; gate badge-in; pointer clicks **Authorised activity** (101.0 s) |
| resolved | 101.2–106.2 | AV-A2-resolved-authorised | Resolved as authorised activity · no incident raised · no patrol dispatched |
| end | 106.2–109.7 | — | Three operator decisions · authority on every action · evidence before closure · illustrative scenario, simulated data |

Chips (top right): **Fence Sector 5** + scenario clock (02:14:50 → 02:44:20 on the main path, 01:21:05 → 01:22:10 on the
alternative path); **Operator clicks** 0 → 3 at the three operator clicks (the duty manager's click does not count; the
alternative path counts again, 0 → 1). The duty manager's authentication is shown by the product itself (the dialog's
*Signed in as Daniel L. · Duty manager* line and the closed notice), not by a chip.
Sounds: the alarm tone at the alarm view, a click per click, a notify on automatic or acknowledged events (alarm view opened,
incident raised, acknowledgements, outcomes, resolved), a soft warning at the PTZ exception, success at the sign-off.

## What changed vs v1

- **Operator clicks 11 → 3.** v1: Open alarm · Locate · Open live · SOP Flow · Dispatch · Escalate · Create Incident ·
  Incident Management · the PER-005 row · Close Incident · Confirm close. v2: Confirm intrusion · Dispatch Patrol 2 ·
  Submit for sign-off. The alarm view opens itself with the nearest PTZ live on the segment (no Open alarm / Locate / Open live).
- **Verification before action.** Corroboration on one track (AgilFence 5-14 → LiDAR L-5B track T-07 → PTZ 7-02 auto-track,
  each with sensor health) and an authorised-activity check (permit-to-work, patrol roster, gate access, maintenance) with
  Clear / Found / Unknown states. The operator's decision becomes the incident record.
- **One record.** The incident is raised at the confirmation from the alarm and inherits its history since 02:14:58 (no
  separate Escalate → Create Incident step).
- **Authority on every action** (SOP-PER-02, illustrative): patrol dispatch and police contact are pre-authorised for Critical
  (no approval wait); the runway restriction is decided and recorded by the control tower (ATC supervisor), not security;
  the duty manager is informed in parallel and acknowledges; the escalation rule (no acknowledgement within SOP time → head of
  security) is shown as a rule, not triggered. Lockdown has its own status pill, apart from the button.
- **Concurrent response lanes** (Patrol · Police · Aviation safety) with the full acknowledgement chain and times; tracking
  continues through an exception (PTZ 7-02 video lost, PTZ 7-03 took over automatically).
- **Outcomes, not only actions,** on an Incident progress rail: contained, intercepted, detained, handed to police, area
  secured, runway restored, fence made safe, evidence sealed.
- **Evidence before closure.** Close is blocked until six evidence items are complete; the operator submits, and the duty
  manager signs with his own authenticated session (badge + PIN) on his console; the audit record is locked.
- **Alternative path:** an alarm during approved works is resolved as authorised activity (linked to PTW-2231) with one click;
  no incident, no patrol.
- Film: no video wall and no Incident Management pages; the duty manager's console appears with a scan reveal; an
  operator-clicks counter joins the clock chip.

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
  (`{"music": LUFS, "sfx": LUFS}` bus levels for `tools/mix.py`; default −17 / −23).
- Extra assets for a cut: an executable `tools/assets-<cut>.sh`, run by `build.sh` after `tools/assets.sh`.
- `K.console` accepts a higher zoom ceiling per device (`c.zmax`, default 2.3).

**B · Highlight** (`CUT=highlight`, 45.5 s, music-led, 120 BPM; `src/js/timeline-highlight.js`, `src/js/scenes/highlight/`,
`tools/music_highlight.py`, `tools/assets-highlight.sh`): 1.0 s black → *AgilFence × AGIL® Secure V11* (it holds over the
first moments of the console) → quiet console, 2 s, on the airport model (the alert list stays out of frame) → **the fence
feels it** (4.5–6.5 s): the AF-01 fence bay, the climber, the strained sensors pulsing on the cable, *Fence Sector 5 ·
Segment 5-14* → the alarm view opens itself (6.5 s), hero push onto the climber on PTZ 7-02 live → corroboration, then a
highlight pulse on the *AgilFence 5-14 · Climb signature* row → **Confirm intrusion** (18.5 s; the recorded state holds
1.2 s) → three response lanes → **Dispatch Patrol 2** (24.0 s) → tower decision and the PTZ 7-02 → 7-03 hand-over (the whole
live tile, 2.5 s) → patrol and police with the person on the live tile → the evidence checklist (3 s) → signed and closed
(3 s, a short pull back) → end card *AgilFence — the fence feels it. / AGIL Secure shows who is there. / Your team decides.*
(the first line rises during the last shot's fade) + *Illustrative scenario · simulated data*. Shots cross-dissolve over
0.4 s and the outgoing shot holds still through the dissolve; the clock chip (small) is the only chrome over the UI, no
click counter. The fence plate needs the AF-01 crop (`tools/assets-highlight.sh` runs `tools/assets-story.sh`). Thumbnail at 10.8 s.

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
| 3 | 21.0–34.5 | AV-S1 quiet → AV-S2 the alarm view opens itself (22.4 s), hero push on PTZ 7-02 live, the climber; AV-S3 corroboration and the authorised-activity check |
| card 4 *Coordinates the response* | 34.5–36.0 | — |
| 4 | 36.0–49.5 | **Confirm intrusion** (38.2 s) → AV-S4 → dip → AV-S5 straight onto Patrol → **Dispatch Patrol 2** (41.6 s) → AV-S6 → dip → AV-S7 tower decision → PTZ 7-02 → 7-03 hand-over → AV-S8 patrol and police with the person |
| card 5 *Closes with evidence* | 49.5–51.0 | — |
| 5 | 51.0–61.5 | AV-S9 six evidence items, **Submit for sign-off** (55.8 s) → AV-S10a the duty manager's authenticated sign-off, **Sign and close** (59.9 s) → AV-S10b closed, pull back to the whole console |
| end | 61.5–67.0 | *AgilFence × AGIL® Secure V11* (104 px) / *On Changi’s airfield perimeter since 2013* (52 px) / *Illustrative scenario · simulated data* (23 px), held over 3 s |

The clock chip (Fence Sector 5, 02:14:50 → 02:44:20) shows only over the chapter 3–5 consoles; no click counter. The AF-01/AF-04
illustrations (2x renders, `AF_ILLUS`, default `$BUILD/../../sa245/assets/af`) are cropped into `src/assets/af/AF-01-fence.png`
(highlight cut), `AF-01-fence-clean.png` (story: the segment callout painted out, so pinpointing first shows in chapter 2),
`AF-01-trace.png` and `AF-04-map.png`; `tools/af-crops.py` scans each crop and fails on violet (lavender) pixels beyond a few
anti-aliased ones, so the AF-04 alert list with its concept line and its right panel stay out of the film. Thumbnail at 25.5 s.

- `src/js/timeline.js`: hand-written scene windows (`lines` is empty: no voiceover)
- `tools/assets.sh`: copies `png2x/AV-*.png` into `src/assets/af/` and writes `src/js/geo.js` (frame sizes from the PNGs, AV anchors from `demo-anchors.json`)
- `src/js/scenes/flow.js`: the two console scenes (main path, alternative path): screens, camera shots, pointer, sound cues
- `src/js/chrome.js`: slates, the card, the clock chip and the operator-clicks counter
- `tools/music.py`: the score follows the v2 scenes; `tools/mix.py` skips the voice bus when `$BUILD/vo` is absent and limits at −4 dBTP
- `tools/truepeak.sh`: EBU R128 integrated loudness and true peak of a file; `build.sh` and `tools/deliver.sh` re-measure each
  encoded MP4 and trim the AAC gain until it is at or below −3.0 dBTP
- `tools/preview.mjs --out dir t1 t2 …`: stills at given times

Deliverables in `$BUILD/dist`: `AgilFence_UI_Flow_v2_1080p_clean_MASTER.mp4`, `AgilFence_UI_Flow_v2_1080p_share.mp4`
(≤ 28 MiB) and `AgilFence_UI_Flow_v2_1080p_thumbnail.jpg` (the hero moment, 13.0 s). Audio: about −14 LUFS integrated, at or below −3.0 dBTP measured on the encoded MP4s.
Illustrative scenario, simulated data; authorities and SOP clauses must be validated with airport security operations.
