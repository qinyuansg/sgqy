# 🥷 The Ninja Team — Product Operating System (teaching video)

A ~14-minute, keynote-style explainer video that teaches the **Ninja Team Product Operating System**: a
4-person strike team (PM, Solution Architect, Front-End Dev, Back-End Dev) that turns unclear opportunities
into evidence, customer pull, and product decisions.

**▶ Watch:** [`NinjaTeam_Product_OS.mp4`](NinjaTeam_Product_OS.mp4) (1080p, 30 fps, English subtitles built in;
also [`NinjaTeam_Product_OS.srt`](NinjaTeam_Product_OS.srt)). Full transcript: [`NARRATION.md`](NARRATION.md).

## Chapters

| # | Chapter | What you'll learn |
|---|---|---|
| — | Opening | Why the ninja team exists: evidence, not meetings or slides |
| 01 | The Mission | Validated signals, customer pull, product decisions. The goal is *evidence*. |
| 02 | The Team | The four roles, and why the PM is the *product captain*, not a project secretary |
| 03 | First Principles | Speed to signal, demo before bureaucracy, one journey end-to-end, learning > assumptions, reuse > rebuild |
| 04 | Plugging Into the Org | Find the wedge → define the hypothesis → thin-slice POC → demo with intent → convert signal |
| 05 | The Loop | Pain → hypothesis → POC → demo → reaction → decision (kill / refine / pilot / productize), and the 3 demo questions |
| 06 | The Task Filter | The value-vs-effort 2×2: prime zone, delay, and the two "avoid" traps |
| 07 | What Great Demos Prove | Five proofs, plus the enterprise & government bar (trust, integration fit, practicality, policy) |
| 08 | The PM Playbook | Seven moves; "maximize learning per unit of effort" |
| 09 | The Weekly Rhythm | Monday hypothesis → build → Friday demo → learn & decide |
| 10 | A Worked Example | An illustrative maintenance work-order wedge, run through the whole loop |
| 11 | Leadership Style | Jobs, Jensen Huang, and Musk lessons, and your synthesis as the calm product captain |
| 12 | Metrics That Matter | Eight signal-quality metrics (and the activity metrics to ignore) |
| — | Recap & Core Truth | 4 · 5 · 1 · 4 · 3 · 7, and *ideas → evidence → product decisions* |

## How it's made

Everything is generated from source in this folder. No stock footage and no licensed audio.

| File | Role |
|---|---|
| `script.py` | The narration, split into *beats*. Each beat id is also an animation cue. |
| `tts.py` | Synthesizes each beat with **Kokoro** (open-weight neural TTS, voice `am_michael`, runs locally), then lays out the timeline with deliberate pauses, captions (`.srt`), and `NARRATION.md`. |
| `music.py` | Synthesizes a quiet ambient pad (sine chords in D major) and mixes it ~24 dB under the voice. |
| `scenes.html` | All 15 scenes as one HTML page. Elements animate on beat cues via `data-k="beat:state"` attributes. |
| `render.cjs` | Drives headless Chromium frame by frame (deterministic time, not screen capture) and pipes the frames to ffmpeg. |
| `build.sh` | Full pipeline: narration → music → loudness mastering (−16 LUFS) → 4 parallel renderers → mux with subtitles. |
| `icons/` | The [Lucide](https://lucide.dev) icons used (ISC license, see `icons/LICENSE`). |

### Rebuild

```bash
pip install kokoro-onnx soundfile numpy
# model files from https://huggingface.co/fastrtc/kokoro-onnx
KOKORO_DIR=/path/to/models ./build.sh          # needs ffmpeg, node, playwright + chromium
node render.cjs --stills 's6.q3$+0.5,120'       # preview frames at a beat (or seconds) -> build/stills/
```

To change the wording, edit `script.py` and rebuild. Only the changed lines are re-synthesized, and every
animation re-times itself to the new audio.

> The narration borrows the *style* of a product keynote (short sentences, contrast, a reveal, "one more thing"). It is an
> ordinary synthetic narrator voice, not an imitation of any real person's voice.
