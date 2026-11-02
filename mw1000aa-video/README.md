# NUCTECH™ MW1000AA: product ecosystem explainer video

**▶ `NUCTECH_MW1000AA_Product_Ecosystem_Explainer.mp4`** (1080p, 30 fps, about 14 minutes, narrated, captions burned in)
plus `NUCTECH_MW1000AA_Product_Ecosystem_Explainer.srt` (the same captions as a subtitle file).

The video explains the millimeter-wave body inspection device end to end: why it exists, what it is,
how the technology works, who is involved, where and when it is used, the full value chain, the
know-how stack, KPIs, the competitive landscape and the main risks to manage.

## Chapters

| Time | # | Chapter | What you learn |
|---|---|---|---|
| 0:00 | 00 | Introduction | Product name and scope of the explainer |
| 0:25 | 01 | WHY · The problem | Limits of metal detectors, pat-downs and X-ray backscatter; what operators need |
| 1:22 | 02 | WHAT · The product | Portal anatomy, dimensions, 2 s scan / 4 s inspection, detection classes, ECAC SSc 2.1 Type A, CE |
| 2:26 | 03 | HOW · The technology | MMW physics, non-ionizing safety, clothing vs. skin reflection, active wide-band sweep, 3D holographic reconstruction, deep-learning ATR, cartoon privacy |
| 4:00 | 04 | WHO · The stakeholders | Passenger, officer, supervisor, checkpoint owner, regulators, data protection, NUCTECH, suppliers, integrators, service, the public |
| 5:08 | 05 | END-TO-END FLOW | Step-by-step passenger journey with the operator's screen at each step (clear and alarm paths) |
| 6:32 | 06 | WHERE · Deployment | Nine venue types plus site requirements (footprint, power, climate) |
| 7:23 | 07 | WHEN · The lifecycle | Need → procurement → deployment → training → operation → maintenance → end of life, and who is involved at each stage |
| 8:12 | 08 | VALUE CHAIN | R&D → components → manufacturing/QA → certification → go-to-market → deployment → operations → after-sales, and the value delivered back |
| 9:38 | 09 | KNOW-HOW | Six-layer capability stack, from RF hardware to operations and regulation |
| 10:38 | 10 | VALUE & KPIs | Pd, FAR, throughput (900/h theoretical vs. ~400/h reported), availability, TCO |
| 11:32 | 11 | ALTERNATIVES | Qualitative comparison with other screening technologies; active-MMW peers; buyer criteria |
| 12:26 | 12 | CONSIDERATIONS | False alarms, accommodation, privacy/cyber, supplier and geopolitical risk |
| 13:16 | 13 | RECAP | The 5W1H on one page |

## Sources and accuracy

- Specifications come from the NUCTECH MW1000AA datasheet (MW1000AA-EN V2.0). The product photo and airport render are taken from that datasheet.
- The ~400 people/hour throughput is from a third-party product listing; 900/h is simply 3,600 s ÷ 4 s.
- Company background (founded 1997 with Tsinghua University roots; US Entity List since 2020; EU Foreign Subsidies Regulation inspections in 2024) is from public reporting.
- The general MMW physics, value chain, lifecycle and KPI content is generic industry knowledge, presented qualitatively. Diagrams are illustrative and not to scale.
- This is an independent explainer. It was not produced or endorsed by NUCTECH.

## How it is built (to edit and re-render)

| File | Role |
|---|---|
| `script.json` | Narration, one entry per "beat": `cap` is the caption text, and the optional `say` is a pronunciation-friendly version for TTS |
| `tts.py` | Kokoro TTS (local, open-weights) → `build/narration.wav` + `timeline.js` (beat timings and caption chunks) |
| `scenes.html`, `style.css` | All 14 animated scenes. Elements appear via `data-in="beat[:keyword][+offset]"`, so visuals stay synced to the narration |
| `engine.js` | Deterministic timeline engine: `renderAt(t)` draws any frame; also handles captions, header and progress bar |
| `hooks.js` | Procedural animation: waves, sweep, point-cloud reconstruction, neural net, passenger journey |
| `render.js` | Playwright frame-stepper piping into ffmpeg |
| `make_video.sh` | Parallel render → concat → mux narration + music bed |
| `tools/` | Icon inliner (Tabler, MIT), music-bed synthesizer, SRT writer |

```bash
# 1) narration + timeline (needs: pip install kokoro-onnx soundfile, plus the kokoro-v1.0.onnx / voices-v1.0.bin model files)
python tts.py /path/to/kokoro-model-dir
python tools/make_music.py <total_seconds> build/music.wav
python tools/make_srt.py
# 2) preview in a browser: open scenes.html (click to play with narration; ?t=120 jumps to 2:00)
# 3) render (needs Node + Playwright Chromium + ffmpeg)
./make_video.sh 4 30
```
