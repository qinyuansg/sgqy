# AgilFence end-to-end film: "First touch"

A 2:24 film (1920×1080, 30 fps, English narration, burned-in English subtitles) showing what happens
when someone climbs an AgilFence-protected airfield fence, and what the operator sees on the
AGIL Secure V11 dashboard and command-centre video wall. It uses the AgilFence V11 frames from
`../isms-mvp-figma` (`build-agilfence.mjs`) and the same film engine as `../cag-demo-video`.

| Chapter | Scenes |
|---|---|
| Slate | What the film shows (V11 with proposed AgilFence workflow features, concept), illustrative scenario, restricted audience |
| 01 · The fence | 02:14 on the north perimeter; "is it the wind, or someone?"; the fence is the sensor (FBG sensors in one cable, senses with light, adapts to weather); first touch: the strain rises above the wind and segment 5-14 is pinpointed |
| 02 · The alarm | System message, alarm tone, Critical card and pin; one incident at the top of the list; Locate and the nearest cameras; one more click takes PTZ 7-02 live |
| 03 · The response | Command-centre video wall; the SOP (works check, verify, dispatch, Airside Ops and tower, duty manager approves the police call); patrol on scene short of the runway; closed and signed off |
| Close | Three promises over the nine steps; "AgilFence feels it. AGIL Secure shows it. Your team acts on it."; next step for CAG |

Clock times only (no durations or performance figures), people make every decision, concept screens are
labelled on screen. Scenario, names, times, layout and distances are illustrative.

```bash
V11_ASSETS=/path/to/v11/assets DECK_ASSETS=/path/to/deck/assets KOKORO_DIR=/path/to/kokoro BUILD=/path/to/build ./build.sh
```

- `script/vo.json`: narration and subtitle text (`en` is shown, `say` is spoken; `|` splits subtitle cues)
- `tools/assets.sh`: builds the AgilFence frames at 2x without baked pointers (`AF_FILM=1`), copies the camera scenes
  and writes `src/js/geo.js` (frame sizes, callout anchors exported by the frame builder, camera boxes)
- `src/js/scenes/`: `night.js` (slate, perimeter, the question), `fence.js` (the sensing fence and the climb),
  `console.js` (V11 console, steps 2–9), `wall.js` (video wall), `close.js` (promises and end card)
- `tools/render.mjs`, `tools/music.py`, `tools/mix.py`, `tools/srt.py`, `tools/subs.mjs`, `tools/deliver.sh`: as in `../cag-demo-video`

Deliverables in `$BUILD/dist`: subtitled and clean masters, subtitled and clean share copies under 28 MiB,
`EN.srt` and a thumbnail. Audio: −14 LUFS integrated, −3 dBTP.
