# previz/lib — shared assets

Each kit author appends their own section below. **Do not delete other sections.**

---

## Environment kit — `textures.js` · `fx.js` · `sky.js` · `sea.js` · `glass.js` · `env.js`

Deterministic (seeded PRNG + periodic noise, every effect a pure function of `T`), three r169, linear-HDR
lighting in "previz units" (a white surface at ~0.5–1.0 radiance reads as bright; README_previz light levels).
Colours follow `bible/bible.json` (palette P01–P30, props, locations). Reference renders: `bible/refs/previz_kit_*.jpg`.

```js
import * as TX from '../lib/textures.js';   // surfaces, cards, porcelain bowl kit, material presets
import * as FX from '../lib/fx.js';         // shafts, window light, dust, candle, steam, rain, lanterns …
import { createSky } from '../lib/sky.js';  import { createSea, createCoast } from '../lib/sea.js';
import { glassMaterial, vitrine } from '../lib/glass.js';  import { applyEnv } from '../lib/env.js';
```

### textures.js — procedural CanvasTextures (cached by params; same call ⇒ same Texture objects)

Every generator returns `{ map, normalMap?, roughnessMap?, metalnessMap?, aoMap? }`. `map` is sRGB; the ORM texture is
linear with **R = cavity, G = roughness, B = metalness** (assigned to both roughnessMap and metalnessMap; set
`roughness: 1, metalness: 1|0` when you use it). Tiling surfaces wrap; cards (chart, letter, compass, bowl, stained
glass) are clamped. `TX.withRepeat(set, rx, ry)` clones a set with a repeat (clones share the GPU upload).

**Fastest path: `TX.mat(kind, { repeat: [x, y], tex: {generator params}, ...materialProps })`** → ready material:

| kind | what / bible ref |
|---|---|
| `wood_ship` `teak` `camphor` `wood_smoke` `pew` `wood_home` `wood_beam` `wood_pale` `lacquer` | aged planks (cathedral grain, seams, butt joints, knots); teak = waxed gallery/corridor floor #5E4430, camphor = home table #3E2B1F, smoke = cabin #3A2A1E, pew #5A3E2A; `tex: { planks, salt: 0..1, wear, seed }` |
| `plaster` `plaster_museum` | lime wash: mottling, wash strokes, grime streaks, rising damp + tide line, hairline cracks, flakes; `tex: { tone:'lime'|'grey'|'warm'|'blue'|'museum', damp, flake, cracks }` |
| `brick` `brick_render` | red brick #7A4B3A partly lime-washed #A9A296 (gallery), rendered brick #8E8A84 (corridor north wall); `tex: { limewash }` |
| `granite` | rough-dressed granite blocks with lime pointing (old home) |
| `stone` `stone_dark` | flagstones in running bond |
| `tiles_clay` `tiles_terracotta` | square clay tiles #8C6F5A (home) / terracotta #A8654A (chapel floor) |
| `terrazzo` | polished museum floor (lab), brass divider strips |
| `brass` `bronze` | oxidised metal with verdigris in crevices, pits, scratches; `tex: { tone:'brass'|'then'|'museum'|'bronze'|'copper'|'iron', patina, polish, salt }` |
| `compass` | PROP_COMPASS face: 8 trigrams, 24-bearing ring, 28 star-mark asterisms + pole star, needle well. Use on a **CircleGeometry** (north/子 → −Z when laid flat with `rotation.x = −π/2`). `tex: { state:'museum'|'then', bearings:'glyph'|'text' }` — `glyph` (default) = illegible engraving per the previz no-text rule; `text` = the correct 24 characters 子癸丑艮… for when the bible's legibility is required |
| `chart` | 针路图: aged paper, ink coastline + waterlining, profile mountains, rhumb-line network, compass rose, dashed route with waypoints and a junk glyph, foxing, folds — no text |
| `letter` | PROP_LETTER: 8 faded vermilion columns on #E7DCC3 bamboo paper, illegible running-script brushwork right→left; `tex: { fill: 0..1 (stops mid-column), flower: true (pressed jasmine), folds }` |
| `oilpaper` | PROP_SWEETS tung-oil paper #D8B57A (transparent, twist creases) |
| `salt` | sea-salt crust overlay (transparent, polygonOffset) — put a copy of the surface geometry over hands/rope/wood |
| `cotton` `linen` `linen_coat` `shirt` `floral` `indigo` `indigo_patch` `wool_coat` `velvet` `rattan` | fabrics with real weave normals + creases: shirt = PROP_SHIRT #6F7F8F, floral = migrant blouse (faded print), indigo = navigator jacket (`tex: { salt }`), indigo_patch = PROP_PATCH #7D9CBB, wool_coat = restorer melton #3C4045, velvet = G1 deck #101A2A (sheen), rattan = PROP_CASE #A8783F |
| `porcelain_bowl` `porcelain_tile` | see bowl kit below |
| `stained_glass` | emissive `MeshBasicMaterial` (`intensity`) of `TX.stainedGlass()` |

Generators (all take `seed`, most `size` 512): `wood plaster stone terrazzo brick granite tiles velvet wool brass
compassFace chart letter oilPaper saltCrust cotton floral indigo rattan stainedGlass glassSmudge windowCookie porcelain`,
plus shader helpers `noiseTexture()` (256² RGBA tileable: R fbm/8, G fbm/32, B worley, A fbm) ·
`waterNormalTexture()` · `spriteTexture('soft'|'disc'|'wisp')` · `makeNoise(seed)` (periodic gradient noise) · `PAL` (bible hex).

* `TX.stainedGlass({ style:'mixed'|'geometric'|'floral', shape:'lancet'|'rect'|'round' })` → `{ map, emissiveMap, cookie }` —
  non-figurative (petals, quatrefoils, quarries), bible P23–P27 colours; `cookie` = saturated light mask for shafts/projection.
* `TX.windowCookie({ pattern })` → `{ map }` light mask: `'grid'` (cols/rows), `'sash'` (arched 6-over-6 + fanlight: lab /
  map office), `'steel'` (corridor arch, slim bars), `'crackedIce'` (home lattice 冰裂纹), `'louvre'` (half-closed
  shutters → stripes), `'bars'` (cabin). White = light passes.

**Porcelain bowl kit (PROP_BOWL / PROP_SHARDS — the canonical pattern for every era).** `TX.BOWL` dims (rim Ø15.2,
h 6.6, foot Ø6.0 cm). `TX.bowlGeometry()` = lathe with arc-length UVs matched to `TX.porcelain()` (2048×1024): outside
1 cm rim band with one continuous plum branch (16 blossoms + buds), **side A faces +X** (single batten sail on three
wave rows, crescent moon upper-left), **side B faces −X** (fence, plum branch, cracked-ice window), plain white at ±Z,
inside rim line, centre double circle Ø4.5 cm with one plum blossom, unglazed foot with kiln flush. Rotate the bowl
`rotation.y = −π/2` to show side A to a camera on +Z.
`const K = TX.bowlShards()` → `{ geometry, pieces:[{id, name:'A'..'G'|'MISSING', center}], material(idOrName, { mode }) }`:
`mode:'shard'` draws one piece (grey-white break edge), `'cracked'` the whole bowl with hairline glue lines,
`'missing'` everything except `hide:['MISSING']` (the restored bowl). Layout follows the bible (A centre + foot,
B/C/D rim band, E side A intact, F side B intact, G waves, MISSING in the plain white zone at +Z). Animate a piece
about `pc.center` (object space) to assemble/disassemble — no geometry rebuilds.

Load cost (first use, per page): 0.2–0.6 s per 512² surface, chart 1.7 s, compass 2.3 s, bowl 1.3 s, letter 0.7 s.

### fx.js — each returns `{ object3D, update(T, opts?) }`

| call | notes |
|---|---|
| `windowShaft({ center, right, up, dir, length, cookie, color, intensity≈0.1–0.35, floorY, noise, soft, steps=10 })` | volumetric light shaft through a window (oblique prism, ray-marched, cookie in window space → glazing bars / stained-glass colours *inside* the beam). `right`/`up` are half-extent vectors of the window, `dir` the travel direction of the light. Works with the camera inside the beam. Cost ∝ screen coverage. |
| `windowLight({ same window, cookie, intensity (≈ lux at the window, 1–3 moon), colored })` | the matching floor/wall pool: a far SpotLight through the opening + **real shadow casters** (alpha-tested lattice from the cookie, invisible blocker plane with a hole) so bars and figures shadow correctly. `colored:true` projects the cookie as colour (stained-glass petals), pre-warped to the oblique window. 1 shadow light. (`cookieSpot` = old alias.) |
| `dustMotes({ center, size, count, moteSize, intensity, beam: { shaft } | { cone } , ambient })` + `update(T, { camera, focus, fstop })` | brownian motes lit only inside the beam (tinted by stained-glass cookie), twinkle, physically sized bokeh. Keep `intensity ≲ 1.5`: very bright tiny points get the engine DOF's sample pattern. |
| `beamCone({ origin, dir, angle, length })` | soft flashlight / lantern spill cone; `update(T, { dir, origin, intensity })` |
| `candle({ state:'A'|'B'|'C'|'D', intensity≈0.3–1, holder:true, castShadow:false })` | PROP_CANDLE burn states 18/11/6/2.5 cm, shader flame (core/blue base/flicker/lean), halo, wax glow, flickering PointLight. `setState()`, `setBurn(0..1)`, `flameY`. Point-light shadows cost 6 shadow passes — leave off unless essential. |
| `oilLamp()` | PROP_LAMP stoneware dish + 2 cm flame + light (door niche) |
| `lantern({ style:'horn'|'ship'|'paper'|'glass', size, period=7, pendulum })` | PROP_SHIPLAMP horn lantern (size 1 = 55 cm stern lamp, 0.45 = cabin lamp). Origin = hook. `update(T, { swing: rad | [z, x] })` (e.g. from ship roll), `flameWorld()` for `sea.setLamps`. |
| `flameMesh()` · `glow({ color, size, intensity })` | bare flame billboard / round additive halo |
| `steam({ position, count, height, width, opacity, light })` | curling tea steam (backlight it); `update(T, { wind:[x,z], light })` |
| `rain({ center, size, count, speed, wind, intensity≈0.25, lamp:{position,color,intensity} })` | camera-facing streaks, brighter near a lamp, near-camera fade |
| `drips({ points, toY })` + `ripples({ radius, sources: drips.sources(center, r), rainRate })` | eave drips and the rain bowl's water: ripples perturb a standard material's normal (reflects env/lights) |
| `seaSpray({ center, area, burst:{ origin, dir, period } })` · `fogCards({ center, size, count, color, opacity })` | low sea mist / bow bursts; soft Y-billboard fog planes with near fade |

### sky.js

`const sky = createSky({ preset:'dusk'|'night'|'predawn'|'dawn', ...overrides })` — far-plane dome (never clips,
needn't follow the camera). Presets are bible-tuned (dusk: zenith P01, faint warm line; night: the same waning moon
P04, stars, soft clouds; predawn P20; dawn P21/P22). Override any field: `sunAz/sunElev, moonAz/moonElev (deg; az 0 =
−Z, 90 = +X), moonSize, moonIntensity, moonHalo, stars, cloudCover, cloudScale, wind, exposure…`.
`sky.update(T)` · `sky.set({...})` · `sky.blend('night','predawn', t)` (the dawn transition) · `sky.horizonColor(dir?)`
(for `scene.fog`) · `sky.makeLights({ castShadow })` → `{ moon, hemi }` matched to the preset · `moonSprite()` for window
views without the dome. `SKY_GLSL` + `sky.uniforms` are shared by sea.js / env.js so reflections match the dome.

### sea.js

`const sea = createSea({ sky, swell:'calm'|'moderate'|'heavy'|'storm', windDir, level, foam, glitter })` — Gerstner
waves (deep-water dispersion: a 120 m swell takes ~9 s), **projected screen-space grid** (call `sea.update(T, camera)`
every frame *after* placing the camera, also inside nested views), long waves per vertex, short waves + detail normals
per pixel (footprint-faded, variance-broadened glitter), fresnel sky reflection, moon/low-sun glitter path, crest foam,
horizon fog to the sky's own horizon. `sea.setLamps([{ position, color, intensity }])` (≤4 warm reflections) ·
`sea.heightAt(x, z, T)` · `sea.normalAt()` · `sea.poseAt(x, z, heading, T, { length, beam, damp })` → `{ y, pitch, roll }`
for bobbing hulls/cameras. Keep the camera ≥ ~3 m above the mean level on 'heavy' (crests reach ~2 m).
Cheap-mode switches for wide/background use: `createSea({ cols: 96, rows: 64, defines: { NO_REFL: '', NO_PPW: '', NO_LAMP: '', NO_VFOG: '' } })`
(skip per-pixel sky reflection / short waves / lamp reflections / per-vertex fog colour).
`createCoast({ sky, az0, az1, distance, lights })` = the bible's low black shore on screen-left with 1–3 warm lights.

### glass.js — the central device

`glassMaterial({ nested, nestedMode:'screen'|'plane', nestedStrength, nestedScale, nestedOffset, parallax, wipe, mask,
haze, dust, hazeLevel, edge, envMapIntensity, res:[ctx.W, ctx.H], aspect })` → `{ material, setNested(tex, strength),
setWipe(wipe | progress, progress?) }`. Real env/light reflections (scene.environment) + the nested texture
(`ctx.renderNested(...)`) composited premultiplied over what's behind. `'screen'` maps the nested frame to the screen
(nested camera ≈ main framing); `'plane'` maps it to the pane UV (render the RT with the pane aspect:
`ctx.renderNested(key, view, tl, u, T, rt, paneW / paneH)`). `wipe: { points:[[u,v]…≤6], width, soft, progress }`
reveals the past only where the glove has wiped (and cleans haze there); animate `setWipe(progress)`.
`vitrine({ w:0.6, d:0.6, h:0.5, plinthH:0.95, frame:0 (frameless, bible G1), deck:'velvet', light:'spot'|'strip'|'none',
front:{ …glassMaterial opts for the front pane } })` → `{ object3D, deckY, frontGlass, panes, light, setNested, setWipe }`.
Origin = floor centre, front pane faces +Z. `'spot'` = one 3000 K pin spot (a real SpotLight); `'strip'` = emissive
strip + light-pool decal only (cheap — use it for background cases).

### env.js

`applyEnv(scene, ctx.renderer, 'night_museum'|'candle_interior'|'moon_exterior'|'dawn_window'|'chapel_coloured', { intensity })`
or `envTexture(renderer, preset, opts)` (cached; opts `moon`, `warmth`, `sky`, `rotation`). Tiny procedural rooms →
PMREM, for metal/glass/porcelain reflections (`bible/refs/previz_kit_env.jpg`).

### Performance (1280×536, SwiftShader, 4 cores; measured with other renders running, so ±30 %)

Engine baseline ≈ 0.3–0.45 s (+≈0.5 s with DOF). Sky dome ≈ 0.09 s full screen · sea ≈ 0.3 s (half screen,
128×96 grid; `cols/rows` lower it) · windowShaft 0.1–0.4 s by coverage (`steps` 6–10) · dust/steam/rain/glows cheap ·
each extra real light costs on every lit pixel (prefer vitrine `'strip'`, `glow()` halos) · point-light shadows =
6 passes · nested RT costs its scene at RT resolution (≤ 960 px wide). Lab frames: sea wide ≈ 0.7 s, candle CU ≈ 1.8 s
(with candle shadows + DOF), vitrine ≈ 2.9 s (nested sea + DOF + shadowed moon + 4 cases) — trim per shot.

### Lab / tools

`scenes/_lab_kit.js` (K_MAT swatch board, K_VIT vitrine, K_CANDLE), `scenes/_lab_kit_sea.js` (dusk/night deck + nested
'reflection' view), `scenes/_lab_kit2.js` (K_CHAPEL, K_RAIN, K_ENV, SKY_*) with shots in `out/lab/*_shots.json`.
`node tools/texdump.mjs --out <dir> --calls 'wood({tone:"teak"})' 'chart()'` dumps textures to PNG;
`node tools/bench.mjs --shotsfile /previz/out/lab/kit_shots.json --frames 100,101 [--out dir] [--q url&params]` times frames;
`node tools/kit_smoke.mjs` constructs/compiles every helper (should print 0 errors).

---

## Character kit — `cast.js` · `figure.js` · `hand.js` (+ `figure_garments.js` · `figure_mat.js` · `figure_sdf.js` · `figure_cache.js`)

Faceless sculpted "clay & cloth" figures for every character in `brief/directors_notes.md`, costumed from
`bible/bible.json` (colour_hex by costume item, skin from the look text; fetched at import, embedded v1.0 fallback).
Bodies, heads, hair and garments are signed-distance sculpts meshed with surface nets, QEM-decimated, and skinned
to a 20-bone rig; garments are separate open cloth shells (clean hems/cuffs/necklines with a thickness rim) that
follow the rig; trims (collars, cuff bands, plackets, lapels, 交领/大襟 bands, knot/horn buttons, sashes) are swept
ribbons. Hands are detailed 16-bone hands (`hand.js`) used both on figures and alone for close-ups/macro.
Everything is deterministic. Reference renders: `bible/refs/previz_cast_lineup.jpg`, `bible/refs/previz_hands.jpg`.

```js
import { loadCharacter, loadCharacterHand, loadCrowd, makeCharacter, makeCharacterHand, makeExtra, makeCrowd,
         preloadCharacters, CAST_CODES } from '../lib/cast.js';
import { makeFigure, POSES, Figure } from '../lib/figure.js';
import { makeHand, pairHands, handPose, blendHandChannels, HAND_POSES } from '../lib/hand.js';

export default async function create(ctx) {
  const guard = await loadCharacter('GUARD');              // baked geometry -> instant (see "Cache")
  const rest  = await loadCharacter('RESTORER', { gloves: false });
  const glove = await loadCharacterHand('RESTORER', 'R');   // close-up hand + coat-cuff stub
  scene.add(guard.root, rest.root, glove.root);
  ...
  setShot(shot, tl, u, T) {                                 // pose = pure function of (tl, u, T)
    guard.root.position.set(1.2, 0, 0); guard.root.rotation.y = -0.3;
    guard.pose('sit_bench', { seat: 0.45, lean: 0.3, hands: 'none' }).breathe(T);
    guard.hold('R', phone, { socket: 'palm', grip: ['cupped'] });
    guard.reach('R', phoneHere, { palm: up, fingers: fwd });  guard.lookAt(phoneWorldPos);
  }
}
```

### cast.js
* `CAST_CODES` = RESTORER GUARD NAVIGATOR WIFE MIGRANT MAPHAND MOTHER COMPANION TRAVELLER LONELY FUTURE CHILD
  (CHILD = the wife's child, CH2 "孩子的小脚").
* `await loadCharacter(code, opts)` → `Figure` (uses the bake if present, else sculpts live: 5–25 s).
  `makeCharacter(code, opts)` is the synchronous version; `await preloadCharacters([codes], opts)` warms the cache.
  opts: `lod:'hi'|'mid'|'lo'` (default hi) · RESTORER `gloves` (default true), `coat:false`, `loupe:true` (head-band
  magnifier) · NAVIGATOR `cuffTurned:true` (right cuff rolled back → patch visible), `outerCoat:true` (brown padded
  night coat), `barefoot:true` (deck) · MIGRANT `overJacket:true` · `figure:{…}` any makeFigure override.
  Baked variants: every code at hi & mid, RESTORER gloves:false, NAVIGATOR cuffTurned / outerCoat.
* `await loadCharacterHand(code, side, opts)` / `makeCharacterHand(code, side, opts)` → `Hand` for close-ups with the
  character's skin, age, variant and sleeve cuff(s): RESTORER white cotton glove (+ grey-brown smudge on R index/thumb
  tips, coat cuff with the LEFT worn spot 18×8 mm, 1 cm above the edge, little-finger side), NAVIGATOR salt-crusted
  (`cuffTurned` shows the pale-blue patch with running stitches on the RIGHT cuff; otherwise it is on the inner wall),
  GUARD old hands + shirt/jacket cuffs, MAPHAND white shirt cuff + frock-coat sleeve + plain brass cufflink, WIFE silver
  bangle / MOTHER jade bangle on the LEFT wrist, … opts: `lod:'close'|'macro'` (default close), `gloves`, `noCuff`,
  `noBangle`, `hand:{…makeHand overrides}`. `characterHandOptions(code, side, opts)` returns the makeHand options.
* Crowds: `makeExtra(era, seed, opts)` → cheap Figure (lod 'lo', mitten hands, no trims; ~15k tris).
  `await loadCrowd(era, people, opts)` / `makeCrowd(era, people, opts)` → `THREE.Group` of InstancedMeshes (static
  baked poses), `people = [{pos:[x,y,z], rotY, pose:'stand'|'walk'|'sit_bench'…, phase, seed|variant, scale}]`,
  `opts.variants` (default 6, all baked for seed 1). Eras: migrant (pier, default) navigator home modern chapel maphand
  future. Move instances per frame via `setMatrixAt` if a crowd must drift; swap pose buckets for walk phases.
* `castSpec(code, opts)` (makeFigure options), `CAST_COLORS`, `applyBible(json)`, `addAccessory(fig, kind, code)`
  (`glasses_cord`, `badge`, `flashlight`, `hairpin`, `bangle_silver_L`, `bangle_jade_L`, `loupe`). Accessories of a
  character are in `fig.accessories[kind]` (GUARD: glasses on a black cord on the chest, invented ring-and-waves badge,
  flashlight on the belt; WIFE hairpin + silver bangle; MOTHER jade bangle).

### Figure (figure.js)
`makeFigure({ sex:'f'|'m'|0..1, height, age, build 0..1, stoop 0..1, skin, hair:{style,color,…}, costume:[…],
hands:{glove, variant:'bare'|'salt', L:{…}, R:{smudge:[…]}}, lod, barefoot })`. Coordinates: metres, Y up, **faces +Z,
its LEFT is +X**, `fig.root` origin = floor between the feet (move/rotate `root` to place it).
Members: `root`, `bones[]`, `bone(name)`, `layers{body, head, hair, <garment names>, <garment>.trim|binding|buttons|band|sole}`,
`materials{…}` (change `.color`, `.userData.fzUniforms` live), `hands.L/.R` (Hand), `accessories`, `P` (dimensions,
e.g. `P.H`, `P.hipJY`), `eye()` (world point between the eyes), `worldPos(bone)`, `socket(side,name)`.

**Pose channels** — `fig.pose({ 'spine.x': 0.1, 'head.y': -0.3, 'armL.upper.z': 0.4 }, { add:true })`; radians relative
to the neutral pose (standing straight, arms hanging, palms toward the thighs); L/R mirrored so + means the same motion:

| bones | .x | .y | .z | position |
|---|---|---|---|---|
| root hips spine chest neck head | bend forward / nod down | turn to own left | lean to own left | `root.px/py/pz`, `hips.px/py/pz` (m) |
| armL/R.clav | – | shoulder forward | shrug up | |
| armL/R.upper | raise forward | inward twist | raise sideways | |
| armL/R.lower | bend elbow | pronate | – | |
| armL/R.hand | flex toward palm | twist | bend toward thumb | |
| legL/R.upper | thigh forward | toe-out | leg out sideways | |
| legL/R.lower | bend knee | – | – | |
| legL/R.foot | point toes down | toe-out | – | |

plus `handL` / `handR`: a hand preset name, `[name, params]` or a channel object; `ik:{L|R:{target:[x,y,z] (root space,
wrist), pole, palm, fingers}}`; `look:[x,y,z]` (root space). Aliases: thighL, shinL, forearmL, upperArmL, shoulderL…

**Presets** `fig.pose(name, params)` (all pure functions; params in brackets):
`stand {weight -1..1 contrapposto}` · `stand_hands_front` · `walk {phase 0..1, stride}` (one phase cycle ≈ 1.15·H/1.7 m;
translate `root` yourself) · `sit_chair {seat 0.46, feet, lean, hands:'lap'|'knees'|'desk'|'none'}` · `sit_bench {seat 0.44}`
· `sit_desk` · `kneel {sitBack 0..1}` · `pray_kneel {handsHigh, handsFwd}` (palms together at the chest via IK, head bowed) ·
`pray_sit {seat}` · `lean_forward` · `look_down` · `neutral` · `apose`. Stoop (age ≥ 45 or `stoop`) is added automatically.
`fig.blend(a, b, t)` / `Figure.blend` lerps two channel dicts (preset names allowed) for transitions.

**After posing** (each call is additive and deterministic; call in this order every frame):
`reach(side, worldWristPos, { pole, palm, fingers, elbowOut })` 2-bone IK (palm/fingers = world directions to orient the
hand) · `lookAt(worldPoint, weight)` (neck+head) · `breathe(T, amp=1, rate=0.24)` · `tremble(T, k)` (shoulders, MOTHER CH2) ·
`hold(side, object3D, { socket:'grip'|'cup'|'pen'|'pinch'|'palm', grip:['hold_cup'] })` attaches a prop to the hand ·
`setGloves(bool)` (RESTORER ch.8) · `setLayerVisible(name, bool)` (e.g. hide body/head to lay the COAT flat in the future
vitrine: `for (const k of ['body','head','hair','knit','trousers','shoes']) fig.setLayerVisible(k,false)` + pose the root) ·
`bake()` → static Group of the current pose (cheap; used by crowds). Hands are separate: `fig.hands.L.root.visible = false`.

### Hand (hand.js)
`makeHand({ side:'L'|'R', lod:'macro'(0.85 mm)|'close'(1.3 mm)|'figure'|'crowd', sex, length, width, thick, slender, age 0..1,
skin, variant:'bare'|'glove'|'salt', salt, gloveColor, smudge:['index','thumb'], cuffs:[{ style:'plain'|'band'|'rolled',
color, fabric, radius, edge, len, detail:[{type:'worn', angle, w, h, at}|{type:'patch', color, stitch, inside, width, height}] }],
forearmLen })`. Canonical frame (LEFT): wrist joint at the origin, forearm +Y, fingers −Y, palm faces −X, thumb +Z
(RIGHT = mirror in X). Members: `root` (place it, or `placeWrist(pos, fingerDir, palmNormal)`), `bones`, `byName`,
`fingerBones.index[0..2]`, `meshes{skin, glove, skinArm, cuffs[]}`, `sockets{grip, cup, pen, pinch, palm}`, `tip(name)`
(world pad position), `setGlove(on)`, `pose(name, params)`, `setChannels(ch)`.
Socket frames (prop local axes): **grip/cup** origin = centre of the gripped cylinder, +Y = cylinder axis across the palm
(toward the thumb), +Z = toward the fingertips (a hanging case/bag body goes at +Z, a cup is upright when the thumb points
up); **pen** origin = thumb/index pinch, +Y = from the nib toward the pen's top end (offset a 15 cm pen by +0.05);
**palm** +Y = out of the palm.
Presets `HAND_POSES`: relaxed {curl} · flat · flat_on_glass {spread} · wipe (fingers together, thumb alongside) ·
grip {radius} · hold_cup {radius 0.038} · rattan (handle r 1.2 cm) · fist · pinch · write · point · pray · cupped ·
hold_hand {radius} · touch (fingertips resting on a surface) · spread. Channels: `{wrist:[flex, radialDev],
thumb:[cmcFlex(across palm), cmcAdd(+toward index/−abduct), mcp, ip, twist], index|middle|ring|little:[mcp, pip, dip, spread]}`.
`pairHands(A, B, { mode:'hold'|'palm', t: 0 holding … 1 released })` poses two hands holding each other and places B
relative to A (same parent). `blendHandChannels(a, b, t)`, `handPose(name, params, dims)`.

### Garments & hair (spec reference: header of figure_garments.js)
`costume:[{ type, name, color, fabric, length, sleeve, sleeveWidth, ease, flare, drape, folds, collar, collarColor, closure,
buttons, buttonColor, trimColor, open, vDepth, slit, cuff:{style, color, width, detail}, wide, rolled, print:{colors,…},
shoe, soleColor, faded, wearZones:['elbows','shoulders','knees'], wearColor, underCollar, ragged }]`.
Types: shirt blouse jacket coat lab_coat dress cheongsam robe vest sailor (cross-collar junk jacket) side_jacket (大襟)
trousers skirt apron shoes (leather|cloth|boot|sandal|slipper) sash/belt shawl. Layers are ordered inner→outer by type;
each outer garment wraps the hulls of the ones beneath it, and hidden inner faces / skin are culled.
Hair `style`: ponytail (+`strands:'R'`) low_bun bun braid short cropped bob loose perm topknot thin headcloth (cloth over
a topknot) headscarf cap; `color, grey, thickness, hairline, bangs, volume, part:false, partX`.
Materials (`figure_mat.js`): `clothMaterial` (sheen; procedural weave/fold relief, dye mottling, fading, prints, wear, patch
with stitched border, seams, hem stitch; detail stays fixed to the cloth in rest space), `skinMaterial` (pores, knuckle
wrinkles, palmar creases & palm lines, nails, age spots, salt crust), `hairMaterial` (strand grooves, grey), `leatherMaterial`,
`floralPrint`, `materialFromDesc`. `?figmat=plain` in the page URL disables the procedural detail (perf A/B).

### Cache (bake) — run after editing any of figure.js figure_garments.js figure_sdf.js hand.js cast.js
`node previz/tools/bake_cast.mjs` (4 jobs, ~2.5 min) → `previz/lib/cache/*.bin` + `index.json` (~60 MB: 12 characters ×
hi/mid + variants, 42 crowd extras, their figure hands; add `--hands` for the standard close-up hands, `RESTORER GUARD …`
or `EXTRA_MIGRANT EXTRA_CHAPEL …` to bake a subset). The cache is keyed to the exact library sources: if they changed, `load*` warn
"figure cache is stale" and sculpt live (correct, just slow).

### Performance (1280×536, SwiftShader; low load)
Engine baseline ≈ 0.34 s. One `hi` figure ≈ +0.25 s (≈ 60–90k tris incl. hands), `mid` ≈ +0.18 s, a crowd extra ≈ +0.05 s.
Close-up hand: close ≈ 25k tris, macro ≈ 50k. Keep ≤ 2 hi figures per frame within the 1 s budget; use `lod:'mid'` for
figures smaller than ~1/3 of frame height and crowds for groups. Figure cloth is front-sided (DoubleSide only where a
patch is on the inside of a cuff).

### Lab
`scenes/_lab_figures.js` with `out/lab/fig_shots.json`: CAST, FIG<n>, MID<n>, FACE<n>, BACK<n> (n = CAST_CODES index),
POSES (sit / pray_kneel / reach), POSES2·BENCH·TEA·PATCH·SIT (walk with case, pray_sit on a pew, phone, tea, patch touch,
long-skirt & qipao sitting), HEADS/APOSE (hair styles), REF_CAST, REF_H1…H6 (macro hands), PENTEST.
`scenes/_lab_hands.js` (hand variants), `scenes/_lab_one.js?probe=…&n=…&lod=…` (perf probe; `node tools/bench.mjs`).
