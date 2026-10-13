# CAG demo film: "From alarms to answers"

A 2:48 film (1920×1080, 30 fps, English narration, burned-in English subtitles) to play at the CAG
demo. It follows the same storyline and design language as the pitch deck in `../cag-pitch-deck`,
and uses the same real V11 screens (`../isms-mvp-figma/screens-v11`):

| Chapter | Scenes |
|---|---|
| 01 · The night shift | 02:14 a.m. in the control room; 4,812 devices reporting to one control room; 1,248 alarms from nine systems, one operator |
| 02 · Meet Co-pilot | AGIL® Secure V11 with AI Co-pilot; the console the team already knows; detect → correlate → explain → recommend → pre-fill, then a person decides |
| 03 · One night, seven incidents | Ranked on the airport twin, then each on the V11 console: tailgating at D-214 (investigate, SOP, one-click lock, pre-filled escalation), fence + LiDAR + thermal, bag and owner linked by clothing, fight seen and heard, one card at two doors, overstay rules, possible watchlist match (stays human), a plain-English question, the self-drafting handover report |
| 04 · One platform, governed | Four layers above the systems the airport owns, every terminal to the central operations centre; on premise, role based, everything logged, no facial recognition needed |
| 05 · The difference | 1,248 alarms become seven ranked incidents; people stay in command |

Scenario, names and data are illustrative, and the film says so on screen.

```bash
# deck art first (see ../cag-pitch-deck/README.md), then:
DECK_ASSETS=/path/to/deck/assets KOKORO_DIR=/path/to/kokoro BUILD=/path/to/build ./build.sh
```

- `script/vo.json`: narration and subtitle text (`en` is shown, `say` is spoken; `|` splits subtitle cues)
- `tools/tts.py`: Kokoro voice (bf_emma), measured timeline → `src/js/timeline.js`
- `src/`: the film as a deterministic web page (`index.html?t=42` shows any frame, `?play=1&subs=1` previews)
  - `js/kit.js`: device/camera on real V11 frames, highlight tags, Co-pilot card, brackets
  - `js/scenes/console.js`: the seven incidents, the question and the report on the V11 console
- `tools/render.mjs`: frame-accurate Chromium render → H.264; `tools/preview.mjs`: stills and contact sheets
- `tools/music.py`, `tools/mix.py`: original synthesised score and SFX, mixed to −14 LUFS, −3 dBTP
- `tools/srt.py`, `tools/subs.mjs`: English SRT and the burned-in subtitle track

Deliverables in `$BUILD/dist`: the subtitled master to play at the demo, a clean master, a share
copy under 28 MiB, `EN.srt` and a thumbnail.
