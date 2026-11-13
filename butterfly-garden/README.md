# 🦋 The Butterfly Garden

A 2-minute animated story made **from a 3½-year-old's drawing**: every character on screen is cut out of the real photo of her drawing. They are lifted off the page like paper stickers, gently colored in, and animated with camera moves, particles, lighting, music and sound effects.

**Story:** a butterfly plays in a flower garden → a dark, scary dinosaur stomps in and breathes fire → Ice Man builds an ice wall that blocks the flames → the police car fires an ice net and catches the dinosaur → the dinosaur cries, says sorry and gets a butterfly kiss → hooray, rainbow party → everyone flies back into the drawing.

| | |
|---|---|
| ▶️ **Watch** | `The_Butterfly_Garden.mp4` (1080p, 30 fps, 2:02), or open `index.html` and tap play |
| ✍️ **Her name on screen** | open `index.html?name=Mia`, or re-render with a name (see below) |
| 🎬 **AI-video prompt pack** | [`PROMPTS.md`](PROMPTS.md): style bible, character bible, 15 shot prompts, music prompt, read-along narration |

## How it's made

- `tools/normalize.py` flattens the phone-photo lighting so the paper becomes clean white.
- `tools/extract_sprites.py` cuts out each character (dinosaur, butterfly in 3 flapping pieces, tree, Ice Man and his crescent, ice wall, police car, flames, flowers, hearts) as a sticker with a white paper border, and "colors in" the white areas with soft tints.
- `js/scene.js` is a deterministic canvas renderer: `render(t)` draws any moment of the film. It includes a parallax world, a camera with keyframes and shake, the dinosaur's opening jaw, stateless particle systems (fire, steam, snow, sparkles, tears, confetti, fireworks), and lighting moods (storm, fire glow, ice glow, siren).
- `js/audio.js` synthesizes the whole soundtrack with Web Audio: an original 8-bar *Butterfly Theme* that returns as music box, brass fanfare and party song, plus every sound effect (roar, fire, ice chimes, siren, net launch, sad trombone…).
- `tools/render_video.cjs` renders frames in headless Chromium, pipes them to ffmpeg and muxes the soundtrack.

## Re-render

```bash
python3 -m http.server 8765 &                                # from this folder
node tools/render_video.cjs "http://127.0.0.1:8765/index.html?name=Mia" The_Butterfly_Garden.mp4 3 30
```

Requirements: Python 3 with `opencv-python-headless` + `scipy` (only for re-extracting sprites), Node with Playwright/Chromium, and ffmpeg. To use a different drawing, re-run `tools/extract_sprites.py <photo> assets` and adjust the polygons and anchors at the top of each script.

## Credits

Drawing © the little artist. Fonts: [Chewy](https://fonts.google.com/specimen/Chewy) (Apache 2.0) and [Fredoka](https://fonts.google.com/specimen/Fredoka) (OFL), bundled from Fontsource. Music and sound are synthesized from code, so there are no samples.
