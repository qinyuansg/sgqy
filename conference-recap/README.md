# Beijing Conference 2026 — recap videos

Two narrated recaps of the 3–4 November 2026 Beijing security conference, built for the Chief Product Officer and the C-suite.

## Customer-first motion video (current)

| File | What it is |
|---|---|
| `Beijing_2026_Customer_Recap.mp4` | Story-driven motion video: cold open, one chapter per customer (MINDEF/SAF, ICA, ROAMS, Police, DSTA, HTX, Airport, Data centre), synthesis. 26 scenes, 24.3 minutes, 1080p 25 fps, English voice-over, embedded soft subtitles |
| `Beijing_2026_Customer_Recap.srt` | The same subtitles as a separate file |
| `Beijing_2026_Customer_Recap_script.md` | Full narration, scene by scene |
| `build/scenes2.py`, `build/engine.js`, `build/build2.py` | Source: scene data, the animation engine (deterministic render at any time T, captured frame by frame through Playwright into ffmpeg), the builder |

Each customer chapter runs problem → what Beijing showed (animated flow) → how it fits and what we must prove.

## Product-centric slide recap (earlier version)

| File | What it is |
|---|---|
| `Beijing_Conference_2026_CPO_Recap.mp4` | The video: 31 scenes, 30.5 minutes, 1080p, English voice-over, embedded soft subtitles |
| `Beijing_Conference_2026_CPO_Recap.srt` | The same subtitles as a separate file |
| `Beijing_Conference_2026_CPO_Recap_script.md` | Full narration script, scene by scene, for reading or re-use in a deck |
| `slides/` | The 31 slide frames as PNG (use directly in a deck) |
| `build/` | Source: `scenes.py` (slide content + narration) and `build.py` (Playwright render, Piper TTS, ffmpeg assembly) |

Sources: six AI-generated transcripts (3–4 Nov 2026), two ST strategic infographics dated 2026-11-03, NUCTECH MW1000AA datasheet V2.0. Transcripts are noisy and unverified against audio; every vendor claim, price and figure in the video is a signal to validate, not a fact.
