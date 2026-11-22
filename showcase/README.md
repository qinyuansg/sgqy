# Product Showcase — Kiosk · APICS · Nova Readers

An interactive, touch-friendly product display:

1. **Home screen** — the three products side by side; tap one to inspect it.
2. **Viewer** — the product in 3D (drag to rotate, pinch/scroll to zoom) with
   glowing hotspots on its features. Tap a hotspot or a feature button and the
   camera flies to that part and a description card slides up. Arrows/dots step
   through features, **NEXT** goes to the next product, **RESET VIEW** returns
   to the full view.

Everything shown — names, descriptions, features, hotspot positions, images and
3D models — comes from one file, [`content.json`](content.json). No build step,
no backend, no internet needed at runtime (three.js is bundled in `js/vendor`).

> The products currently use **stand-in 3D shapes and sample text**. Replace
> them as described below.

## Run it

It must be served over HTTP (browsers block this when opened as a file):

```bash
cd showcase
python3 -m http.server 8000     # then open http://localhost:8000
```

It also works as-is on GitHub Pages or any static host.

## Add your real products

Put files in `assets/` and point to them from `content.json`. Each product is
shown using the first of these that is set:

| Field | What it gives you |
|---|---|
| `"model3dUrl": "assets/kiosk.glb"` | Full 3D: rotate all the way round, zoom into parts. Best result. Optional `"model3dUrlMobile"` for a lighter file on phones. |
| `"imageUrl": "assets/kiosk.png"` | Photo mode: the picture tilts slightly and zooms into each hotspot. Use a PNG with a transparent background. |
| `"placeholder": "kiosk"` | Built-in stand-in shape (`kiosk`, `cabinet`, `reader`). |

If both `model3dUrl` and `imageUrl` are set, the model is used in the viewer and
the image on the home screen. With no `imageUrl`, the home-screen picture is
rendered automatically from the 3D model.

**3D files:** `.glb` (glTF binary), ideally under ~10 MB. Meshopt-compressed
files work; Draco-compressed files do not (re-export without Draco). Any size
or origin is fine — models are automatically scaled to 1.7 units tall, centred,
and stood on the floor. If a model faces the wrong way add
`"modelRotationY": 180` (degrees).

### Placing hotspots

Open the page with `?edit` added, e.g. `http://localhost:8000/?edit&product=kiosk`.
Click any point on the product and a panel shows the coordinates to paste into
that feature's `"hotspot"` in `content.json`:

```json
"hotspot": { "position": [0.17, 0.92, 0.28] }
```

Only `position` is required — the camera angle is worked out automatically.
To fine-tune a close-up, rotate/zoom to the view you want and also copy the
`cameraPos` and `target` lines from the panel. `defaultCameraPos` /
`defaultTarget` (on the product) do the same for the opening view.

### Text, icons, branding

- Descriptions accept `<b>`, `<i>` and line breaks (`\n`).
- Feature `icon` names: `screen`, `camera`, `card`, `printer`, `cpu`, `shield`,
  `signal`, `light`, `scan`, `fingerprint`, `speaker`, `plug`, `lock`, `dot`.
- `branding.title` / `titleAccent` / `subtitle` set the home heading;
  `branding.logos` (`[{ "imageUrl": "assets/logo.svg", "alt": "…" }]`) and
  `footerText` fill the footer.
- `background.imageUrl` puts your own picture behind everything.
- `homeScale` on a product (e.g. `0.6`) shrinks it on the home screen so the
  line-up shows true relative sizes.
- `ui.idleResetSeconds` returns an unattended display to the home screen
  (set `0` to disable).

## Files

```
index.html         page shell (both screens)
content.json       ALL content — edit this
css/style.css      look and layout
js/app.js          screens, navigation, feature card
js/viewer.js       3D stage, hotspots, camera moves, edit mode
js/placeholders.js stand-in models
js/vendor/three    three.js r174 (MIT)
assets/            your models, photos and logos
```
