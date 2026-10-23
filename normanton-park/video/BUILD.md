# Rebuilding the video

Everything is generated from `scenes.js` (visual content + Chinese narration) with no cloud services.

| Step | Command | Notes |
|---|---|---|
| 1. Fonts | `assets/fonts/fetch_fonts.sh` | Repo ships glyph subsets only; fetch full Noto Sans SC / Inter before editing text. |
| 2. Narration | `TTSLIB_DIR=<dir with ttslib.py + Kokoro model> python3 build_audio.py 59 0.92` | Offline TTS via `sherpa-onnx` + Kokoro v1.1-zh (`kokoro-multi-lang-v1_1`, speaker 59 = zm_010). Writes `audio/narration.wav` + `timing.js` (scene durations + caption timings). |
| 3. Mix | `python3 build_mix.py` | Adds a soft generated ambient pad under the narration → `audio/mix.m4a`. |
| 4. Frames | `NODE_PATH=/opt/node-tools/node_modules node render.js index.html out/video_silent.mp4 30` | Playwright seeks the paused GSAP timeline frame by frame and pipes JPEGs to ffmpeg (1920×1080, 30 fps). |
| 5. Mux | `ffmpeg -i out/video_silent.mp4 -i audio/mix.m4a -map 0:v -map 1:a -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 160k -shortest -movflags +faststart normanton-park-05-20.mp4` | Final deliverable. |
| Preview | `node snap.js index.html <dir>` | One JPEG per scene in its fully built state. |
| Subset fonts | `python3 subset_fonts.py` | Shrinks the TTFs to the glyphs used (run before committing). |

`ttslib.py` (sherpa-onnx wrapper; `custom-lexicon.txt` adds Normanton / HDB / CPF / URA / SORA / psf pronunciations) is in this folder; point `KOKORO_DIR` at the model folder. The model files (~400 MB) are downloaded from the sherpa-onnx GitHub releases (`kokoro-multi-lang-v1_1.tar.bz2`).
