# AgilFence UI-flow film

A 1:30 screen-flow film (1920×1080, 30 fps, no narration, no subtitles, no labels) that shows the
AgilFence alarm flow on the AGIL Secure V11 front end exactly as the operator sees it: the quiet console,
the system message and Critical card, Open alarm → Investigation, Locate → nearest cameras → Open live,
the command-centre video wall, the SOP Flow (Dispatch approved), Escalate → Create Incident, the patrol
on scene, then Incident Management: PER-005, the SOP record, Close Incident → Confirm close → Closed.
On screen there is only the product UI, a pointer making the clicks, calm camera pushes, a small
scenario clock chip, an opening slate and an end slate. Music and UI sounds only.

It reuses the deterministic film engine of `../agilfence-film` (`engine.js`, `kit.js`, `render.mjs`,
`music.py`, `mix.py`, `deliver.sh`). Frames are the clean (DEMO_CLEAN) UC2 / UC5 flow frames from
`../isms-mvp-figma` plus three AgilFence V11 frames (quiet console, video wall, patrol on scene).

| Scene | Seconds | Frame | On screen |
|---|---|---|---|
| slate | 0–3 | — | AgilFence × AGIL Secure V11 · from a touch on the fence to a closed incident |
| quiet | 3–6.4 | AF-02a-quiet | the console at 02:14:58 |
| toast | 6.4–11.7 | UC2-S1 | system message slides in, Critical card; pointer clicks Open alarm |
| inv | 11.7–18.9 | UC2-S2 | Investigation: linked System entries; pointer clicks Locate |
| locate | 18.9–22.6 | UC2-S3 | nearest cameras; pointer clicks Open live |
| live | 22.6–28 | UC2-S3 | push on the PTZ 7-02 live player |
| wall | 28–34 | AF-06 | command-centre video wall (full bleed) |
| sop | 34–41.2 | UC2-S3 → S4 | pointer clicks SOP Flow; steps; pointer clicks Dispatch |
| dispatched | 41.2–47.8 | UC2-S5 → S6 | Patrol 2 dispatched · approved; pointer to Escalate |
| escalate | 47.8–53.3 | UC2-S7 | camera pushes on the click, Escalate Event dialog opens; pointer clicks Create Incident |
| created | 53.3–59 | UC2-S8 | Incident PER-005 created |
| patrol | 59–65.2 | AF-08 | patrol on scene; pointer clicks Incident Management |
| im | 65.2–74.4 | UC5-S3 → S5 | PER-005 search, the filtered row; SOP record with approvals; pointer clicks Close Incident |
| close | 74.4–86 | UC5-S6 → S7 (clean) | Close Incident dialog, Confirm close; Closed 07:02 · signed off by Grace T. |
| end | 86–89.5 | — | Illustrative scenario · simulated data · people decide |

```bash
UIFLOW_FRAMES=/path/to/uiflow/frames AF_FRAMES=/path/to/afbuild/frames FIGMA_ASSETS=/path/to/v11/assets BUILD=/path/to/build ./build.sh
```

- `src/js/timeline.js`: hand-written scene windows (`lines` is empty: no voiceover)
- `tools/assets.sh`: copies the 2x frames into `src/assets/af/` and writes `src/js/geo.js` (frame sizes, anchors);
  `tools/anchors.mjs` regenerates the UC2/UC5 anchors from the frame modules when the export lacks them;
  `tools/closed-frame.mjs` renders `UC5-S7-govern-closed` (the closed state without the Export menu, which the film never opens)
- `src/js/scenes/flow.js`: the console flow (screens, camera shots, pointer, cues); `wall.js`: the video wall
- `src/js/chrome.js`: slates and the clock chip; `tools/mix.py` skips the voice bus when `$BUILD/vo` is absent

Deliverables in `$BUILD/dist`: `AgilFence_UI_Flow_1080p_clean_MASTER.mp4`, `AgilFence_UI_Flow_1080p_share.mp4`
(≤ 28 MiB) and a thumbnail. Audio: −14 LUFS integrated, −3 dBTP.
