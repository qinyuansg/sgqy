# Previz engine — authoring guide

The previz is a **stylised moving storyboard** of the final film: real camera language, real
lighting, real timing against the song; figures are faceless sculpted mannequins in costume.
It renders deterministically, frame by frame, in headless Chromium (SwiftShader, CPU only).

```
mv-countless-tonights/
  timing/timing.json        song sections + every sung line (start/end/char_times)
  shotlist/shots.json       the master shot list (falls back to skeleton.json)
  bible/bible.json          palette, characters, props, locations (ids CHAR_*, PROP_*, LOC_*)
  previz/
    index.html              entry (import map: 'three', 'three/addons/')
    engine/main.js          timeline, shot dispatch, dissolves, nested renders
    engine/post.js          DOF → bloom → ACES + grade + grain (DEFAULT_POST lists every knob)
    engine/cam.js           lens(mm), place, move, path, handheld, distTo
    engine/util.js          clamp/lerp/ease/keys/rng/noise1/fbm1/flicker (deterministic)
    lib/                    shared assets: figures, hands, textures, fx, sky/sea, glass (see lib/README.md)
    scenes/<scene_key>.js   one module per location (scene keys = shots.json "scene")
    render.mjs              headless renderer (stills / video)
```

## Scene module contract

```js
import * as THREE from 'three';
export const needs = ['ship_cabin'];            // optional: other modules this one renders nested
export default async function create(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 400);
  // ... build geometry, lights, materials once ...
  const setups = {
    S012(tl, u, T, shot) { ctx.cam.move(camera, A, B, u); return { dof: { focus: 1.2, fstop: 2 } }; },
    reflection_lantern(tl, u, T) { ... },        // named views for other modules' nested renders
  };
  return {
    scene, camera,
    post: { exposure: 1.0, temp: -0.2 },         // base grade for this location (merged under per-shot returns)
    setShot(shot, tl, u, T) { animate(T); return (setups[shot.id] || setups.default)(tl, u, T, shot); },
  };
}
```

* `tl` = seconds since the shot's first frame; `u` = tl / duration (0…1, **may exceed 1** while the
  shot is the outgoing half of a dissolve — clamp where needed); `T` = absolute song time (s).
* `setShot` must be a **pure function of its inputs** (no accumulated state, no `Math.random`, no
  `Date`) — frames are rendered out of order and in parallel processes. Use `ctx.util.rng(seed)`,
  `noise1`, `fbm1`, `flicker(T)`.
* Return per-shot post overrides: `dof:{focus (m), fstop}`, `aa` ('fxaa'|'msaa'|'none'), `exposure`, `temp` (+warm/−cool),
  `tint`, `saturation`, `contrast`, `lift/gamma/gain` (rgb arrays), `shadowTint/highTint`,
  `vignette`, `grain`, `bloom:{strength,radius,threshold}`, `fade`.
* Nested renders: `ctx.renderNested(key, viewName, tl, u, T, rt)` renders module `key`'s view into a
  render target you made with `ctx.makeRT(w, h)` and returns its linear-HDR texture (use it as
  `map`/`emissiveMap` on glass to show another era's night). List `key` in `needs`.
* Transitions are applied by the engine from `shot.transition_in` (`cut`, `match_cut`, `dissolve`,
  `light`, `reflection`, `fade_in`, each with `frames`) and `shot.fade_out_frames`. A **match cut** is a
  hard cut — *you* must make the compositions match (position/scale of the matched element in frame),
  so look at the neighbouring shots' setups.

## Conventions

* Units metres, Y up. A person is ~1.6–1.75 m. Lights use physical units (three r169):
  candle ≈ PointLight(0xffa85a, 1.5–3, 0, 2) plus emissive flame; moon ≈ DirectionalLight 0.3–1.2;
  set `scene.environment` from a PMREM of a tiny custom environment for metals/glass reflections.
* Colour textures (CanvasTexture etc.) → `tex.colorSpace = THREE.SRGBColorSpace`. Data textures
  (normal/roughness) stay linear. The engine renders linear HDR, then ACES + grade.
* Lens: `ctx.cam.lens(camera, mm)` — mm on a 36 mm-wide sensor, 2.39:1. Use the shot's `lens_mm`.
* Palette: take colours from `bible/bible.json` (暮色深蓝, 月光银, 青花白, 低饱和铜金 …); grade per
  era with the bible's `looks`.
* Performance budget at 1280×536: **≤ 1.0 s per frame** (check the timing printed by render.mjs).
  ≤ 2 shadow-casting lights, shadow maps ≤ 2048, nested RTs ≤ 960 px wide, instancing for crowds,
  no per-frame geometry rebuilds (animate transforms/uniforms only). Build heavy things once.
* No text, logos, real flags or insignia in picture.
* Half-res additive layer: unlit, additive, soft objects (volumetric shafts, light cones) can be drawn at half resolution
  with `obj.layers.set(LOWRES_LAYER)` (`import { LOWRES_LAYER } from '../engine/post.js'`; `FX.windowShaft` / `FX.beamCone`
  do it by default). They are depth-tested against the scene and added back before bloom; lights are not visible to that
  pass, so never put lit materials there. Nested renders draw that layer inline.
* Anti-aliasing is per shot: `post.aa` = `'fxaa'` (default) | `'msaa'` | `'none'`. FXAA runs in the grade pass and is
  nearly indistinguishable at 1280 px under grain; 4× MSAA keeps sub-pixel lines crisper (rain, distant glazing bars,
  hair strands, glass edges) but SwiftShader's multisampled rasterisation is expensive: ≈0.13 s fixed, ≈+0.35 s per
  close-up hi figure, +1.8 s for a 12-figure lineup. Use `aa:'msaa'` only for line-critical hero shots without figures.
  `?aa=msaa|fxaa|none` in the page URL (`tools/bench.mjs --q aa=msaa`) forces one mode for A/B tests.
* Cost reference (this machine): engine fixed cost ≈ 0.25–0.3 s per frame with FXAA (bloom ≈ 0.1 s of it), DOF ≈ +0.15 s
  (half-res gather). `render.mjs` prints a `timing:` line (first frame incl. scene build, then mean s/frame) at the end of
  every run.

## Testing your module

```
cd previz
node render.mjs --shots S012,S013 --u 0.05,0.5,0.95 --stills out/check/<scene_key>
node render.mjs --range 2400:2472 --out out/check/<scene_key>/clip.mp4     # motion check
```
Then **look at the JPGs** (Read tool) and judge them like a cinematographer: composition in 2.39:1,
readable subject, motivated light, depth, palette, matching the shot description and the
neighbouring shots for match cuts. Iterate until each shot reads clearly. A contact sheet:
`convert out/check/x/*.jpg -resize 640x -append sheet.jpg` (or `montage -tile 3x -geometry 640x+4+4`).
