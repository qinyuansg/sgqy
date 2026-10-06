# harbor_eras — LOC_HARBOR (customs house / museum, quay gate, harbour city)

Module: `previz/scenes/harbor_eras.js` · shots **S018 · S046 · S080** · no named views.
Check renders: review pass `out/check/harbor_eras/review/` (latest); earlier `out/check/harbor_eras/final/` (u 0.05/0.5/0.95 + every sync frame, `sheet_all.jpg`, `sync_sheet.jpg`),
contact sheet `out/check/harbor_eras/sheet.jpg` (review: all shots at u = 0.05 / 0.5 / 0.95). Round history r1–r32, rv1–rv3 in the same folder.

## Set space

Metres, +X east, −Z north, harbour to +Z. Customs house X 0…64, Z −22…0 (south facade on Z = 0), quay edge Z 28
(S046/S080) — S018 shifts the whole front-quay group to an 18 m apron (see deviations). Everything lives in `setRoot`,
rotated about Y by `THETA` (−108.8°) so S018's end frame puts the moon in the very same world direction as old_home's S019
(the moon direction is derived from old_home's `CAM19` and the sky params are identical to old_home `SKY_CH1`). Sky dome
and sea are world-space; `azW()` converts set azimuths.

## Per shot

### S018 — CH1 "千年啊／不过无数个今晚" (f1693–1762, 28 mm, heavy-lift rise + pull-back)
* **Start (frame 0):** lens 4 m above mean water (SEA_Y), level-ish (pitch +0.9°), 44 m south of the lab window. The lab's
  arched six-over-six sash is the only lit window of the building, centred at **(0.435, 0.47)** (review; shot list (0.42, 0.46),
  within ±3 %), **14 %** of frame height (solved at build time), SE corner at x ≈ 0.55; through it, small and soft, the
  RESTORER (mid LOD, lower body hidden — it is always below the sill) as a dark silhouette bent over the bench lamp at her
  left; the lamp head — the window's brightest point — sits at **(0.45, 0.51)** = S017's last-frame candle (0.45, 0.50). Upper glazed arcade faintly silver. Quay coping, iron bollards
  and black water with silver moon glitter + the window's warm reflection in the lower third; beyond the corner a small
  waterfront plaza and the lit waterfront district; only a thin band of cloudy navy sky at the top.
* **Move:** hold to 0.16 s (**70.7 "千年啊": rise begins**), 12-frame ease-in, then constant speed, no ease-out (cut on motion).
  Pull-back leads the rise slightly (`s^0.82` horizontal, `s^1.04` vertical) so the water keeps the lower frame longer; no
  yaw, no roll. Rise 28 m (to 30 m), pull-back 61 m, pitch +0.9° → −2.9°.
* **City (E5):** waterfront shophouse rows east/west with pitched roofs, warehouses, a few mid-rise blocks ≤ 40 m (stay below
  the end skyline), a plaza east of the customs house, a block behind it, and the hillside rising to ~130 m at 1.5 km with
  contour roads, lamps and trees. ~16 k instanced boxes with a procedural window shader (per-building style, lit fraction,
  shopfronts, warm/cool mix, distance-averaged glow), gable-roof prisms, street-lamp glow on lower walls, warm lamp pools.
  **73.1 "今" (f1754): lights fill the frame**; the lab window is one tiny warm point at **(0.44, 0.88)** at the end.
* **Moon:** hidden behind a mid-rise pair at first, then only its glow in the cloud (disc ×0, halo ×0.45: 时隐时现); the moon
  comes out from 2.58 s (f1755) and reaches old_home's S019 values by 2.86 s — **73.35 (f1760): moon and gathering clouds in
  the top third** (disc at 84 %), moon at **(0.80, 0.14)**. Last frame vs S019 frame 0: same moon position, same cloud field (same sky params, same T).
* **Light/grade:** moonlight key from the moon's azimuth (raised), sky/ground hemi with warm bounce from the lamp-lit quay;
  lab: baked lamp light (additive radial cards on the back wall, ceiling and bench + a dim warm wall emissive; no PointLight),
  window spill as a warm decal. Exposure 1.55, temp −0.12, sat 0.9.

### S046 — BR1 "换旗换誓言／旧梦换了衣冠" (f3568–3638, 40 mm, locked)
* **Camera (LOC_HARBOR lock):** lens 1.6 m on the quay road west of the customs house, 40 mm, looking east (yaw 95°: 5°
  toward the harbour mouth), horizon at y 0.46. Registered: **waiting spot (0.380, 0.700)**, threshold front edge **y 0.66**
  (x 0.31–0.45), **E1 lantern (0.400, 0.460)** = S045's last-frame shore-light bokeh (checked side by side, r14).
* **Era cuts (director ruling):** E1 f3568–3580 · E2 **f3581** (149.21 换) · E3 **f3592** (149.66 言, MIGRANT, 27 f) · E4
  **f3619** (150.80 衣); hard cuts, identical camera (checked on the boundary frames, r26). 148.88: E1 on screen.
* **Eras:** E1 timber godown, granite landing steps, palisade + stockade gate with a paper hand-lantern, torches, junks with
  plain madder/indigo pennants, earth ground; a woman with a bamboo basket (right hand). E2 new lime-rendered customs house,
  kerosene posts and pier lanterns, white-drill guards with soft caps, a porter with a carrying pole and two loads, early
  steamer + barque, invented flag F-B. E3 render greyed, rain awning over the gate, overhead wires on timber poles,
  enamel-shade bulbs, khaki-grey guards with peaked caps (invented ring badge), single-funnel steamer (ochre/slate funnel),
  F-C; **MIGRANT (braid, faded floral blouse) with the rattan case in her RIGHT hand**. E4 repainted buff, concrete sentry
  box with an iron-barred window, sodium cobra-head lamps (desaturated), pale-grey uniform, freighter + barge, F-D half
  furled; **a father holding the child's hand** (hands checked at 4×, r29). Flags are invented, ~12 px, limp, on the far
  corner pole; background crowds per era beyond the gate.
* **Unified dusk light:** visible east sky P02/P03 with a blue-grey earth-shadow band and a faint mauve anti-twilight (a
  pseudo-glow set below the eastern horizon), the warm-pink last light from behind camera (az 258°, el 7.5°, 1024 shadow
  map), a broad west-sky fill, hemi; reflections from a separate west-afterglow sky (`SKY46W`). Only practicals change by
  era. Damp setts with organic puddles in front of the gate catch the gate lamps and lead the eye to the spot.

### S080 — TAIL "叫作明天" (f5905–5982, 40 mm, the S046 camera, E5 dawn)
* Same camera data as S046 (same projections logged). Museum state: glazed arcade, bare flagpole, warm bay light at the east
  end as a small point at **(0.238, 0.323)**, ferry moored astern-on, container cranes far right with warm obstruction
  lights, a few 4000 K LED lamps still on (glow ×0.6, review), **four fishing lamps** on the sea at x ≈ 0.65 / 0.73 / 0.81 /
  0.92 (all clear of the ferry), each on a small dark boat silhouette with a soft warm halo and a shimmering reflection
  column, low mist.
* Pre-dawn sky P20 blue-grey over a mauve-grey horizon haze with **one thin P21 band** spread along the right half
  (sunrise azimuth, x ≈ 0.55–1.0 at the horizon y 0.46; review: warm share raised toward the bible's ≈ 35 % at 246–249 s,
  matching S079's mauve-peach) plus its warm reflection column on the water; the sun never in frame; the light comes up over
  the shot (exposure 1.32 → 1.46, temp +0.02 → +0.10, never orange); a little dew gives the setts a sky sheen.
* **248.1 (tl 2.04):** a soft band of brighter skylight slides from the water across the quay onto the **empty waiting spot**
  (1.96–2.86 s) and leaves a soft warm pool on it (into the 12-frame dissolve to S081). A gull crosses high frame-right
  0.55–1.9 s. No people.

## Deviations from the shot list (and why)
* **S018 camera numbers.** "~35 m rise, ~20 m pull-back, tilt up ~15°" cannot hold the end registration (window at (0.44,
  0.88) *and* moon at (0.80, 0.14) with S019's low moon, el 7.6°): the end camera is 30 m high, 103 m from the window,
  pitch −2.9°. Rise 28 m, pull-back 61 m.
* **S018 geography cheat.** In S018 only, the front-quay group (paving, wall, coping, bollards, LED lamps) is shifted to an
  18 m apron and the water is raised 0.75 m (high water), so the opening frame shows quay edge + bollards + black water in the
  lower third; S046/S080 keep the 28 m apron. Not readable across the cut.
* **S018 moon.** Ends crisp and large (moonSize 0.0105) because it must equal old_home's S019 first frame; it is veiled up to
  2.25 s and thins only in the last 0.6 s.
* **S046/S080 bay light** at x 0.238 instead of 0.30 (the gate's left pier covers 0.27–0.31).
* **S046 cut timing** follows the director ruling (E2 149.21, E3 149.66–150.80, E4 150.80), not the older gen notes.
* **E4 "iron window bars"** are carried by the sentry box beside the gate (facade grilles are sub-pixel at 60–120 m).
* **E5 passer-by** (bible table) omitted — S080 says "no people".
* **S080 skylight band** lights the ground only (shader term on the setts/earth + a sheen on the water); vertical surfaces
  do not brighten with it.

## Engine / library workarounds (logged in lib/ISSUES.md)
* Engine grain hash degenerates into stripes at these frame numbers → engine `grain: 0`, in-scene multiplicative grain quad.
* Draw-call and fill savings: static meshes merged per material per group (−428 draw calls); lights enabled per shot; env
  maps only on glazing / wet ground / metal (no `scene.environment`); dome and sea drawn after the opaque set; a cheap second
  sea (`NO_PPW`, `NO_VFOG`, 96×40) for the locked frame; S018 sea hidden once the quay edge leaves the frame; hillside terrain
  on the city's cheap ambient shader; facades Lambert (≥ 40 m from every lens); MIGRANT `mid` (24 % of frame height, from
  behind); lab window spill as a decal instead of a SpotLight.

## Performance (1280×536)
The machine was shared with other renders the whole session (load 7–13 on 4 cores), so wall-clock numbers are inflated.
* `render.mjs --every 1 --range` (24 frames each, under load ≈ 9): see the table below.
* Load-independent estimate: CPU seconds of the Chromium process tree per frame, calibrated on the lib README's idle lab
  frames (SEA 0.68 s, K_MAT 1.21 s, K_VIT 1.57 s, K_CHAPEL 1.08 s → idle wall ≈ 0.47 × CPU-s): S018 ≈ 1.2–1.5 s, S046 ≈
  1.0–1.1 s, S080 ≈ 0.85–1.0 s. Tools: `out/check/harbor_eras/he_cpuprof2.mjs` (with `window.__HX` component switches in
  the module: sea, sky, city, bldg, roofs, terrain, ch, ground, figs, shadow, lamps, envall, …), `he_cpubench.mjs`.

| shot / range (24 frames, `render.mjs --every 1`) | load (1 min) | mean s/frame | max |
|---|---|---|---|
| S018 f1705–1728 (water + facade + city) | 3.3 → 6.9 | **1.64** | 2.06 |
| S018 f1735–1758 (city + moon, sea off-frame) | 6.9 | **1.08** | 1.53 |
| S046 f3595–3618 (E3, MIGRANT) | 7.3 | **1.21** | 1.69 |
| S046 f3620–3638 (E4) | 8.3 | **0.91** | 1.32 |
| S080 f5930–5953 | 7.9 | **0.54** | 0.68 |

Before this pass (same method, load ≈ 5): S018 2.12, S046 1.66 (max 4.07), S080 1.12 s/frame.

## Known weaknesses (pre-review; see **Review → Still open** below for the current list)
* City buildings are boxes + gable prisms with a procedural window grid (no balconies, signage-free shopfronts only as lit
  bands); the hill's far rows become a uniform sparkle; near shophouses a little blocky.
* RESTORER in the lab window is ~16 px tall (head and shoulders above the sill) — a soft warm shape, not a readable pose.
* Ships are simple lofted hulls with box superstructures; the E4 freighter and E2 steamer houses are plain blocks.
* Guards and the E1/E2/E4 waiting people are recoloured crowd extras (lo LOD: no collars, buttons, badges at this size).
* Flags are ~12 px, so their invented designs read only as colours (by design: far, limp, half-furled).
* The S080 skylight band is subtle in stills (it reads in motion); the S018 → S019 cloud match is by shared sky params and
  moon direction — cloud scale differs by the 28/32 mm lens ratio away from the moon.
* ~~S017 → S018 "light point" offset~~ — fixed in the review (window (0.435, 0.47), lamp on S017's candle (0.45, 0.50)).

## Review (art director + DP pass, 2026-10-05)

Re-rendered every shot at u 0.05 / 0.5 / 0.95, every sync frame (f1697, 1754, 1757, 1760, 1762 · 3573, 3580/3581,
3591/3592, 3618/3619, 3638 · 5905, 5954, 5962, 5970, 5982) and the adjoining frame of every neighbour (S017 f1692, S019
f1763, S045 f3567, S047 f3639, S079 f5904, S081 f5983/5989 in the dissolve), plus 6 consecutive frames in each shot
(f1740–45, f3600–05, f5930–35: steady frame-to-frame MAE, no flicker spikes). Stills: `out/check/harbor_eras/review/`
(`cut_pairs.jpg` = every cut side by side, `sync_sheet.jpg`), contact sheet `out/check/harbor_eras/sheet.jpg` (3 × 3).

### Found → fixed
**S018**
* *Light-point match with S017 was 3–6 % off* (S017's candle sits at (0.45, 0.50), the lab window was centred at (0.42, 0.46)
  with its lamp at the window's left edge). → Window centre re-solved to (0.435, 0.47) and the bench lamp moved to her LEFT
  (east, screen right — also what restoration_lab shows: lamp at the conservator's upper left), its head above the sill: the
  window's brightest point now lands on (0.45, 0.51). Checked as a 50 % blend of f1692 / f1693.
* *The lab window read as a uniformly glowing light box with a 16-px blob at the sill; the city's near windows were brighter
  than it.* → Room walls a stop darker + a dim warm emissive, the lamp's light baked into additive radial cards (back wall,
  ceiling, bench), sash bars a darker paint so they read as muntins against the lit room, a standing-height bench with a sheet
  under the lamp, and the RESTORER more upright (bowed head and shoulders, turned toward the lamp) so head, shoulders and
  arms clear the sill as a dark silhouette. Verified close up (debug lens `?hecl=1`, via `tools/bench.mjs --q hecl=1`) and at
  4× in the real frame. Removing the lab PointLight also saved ≈ 0.2 CPU-s (it was evaluated by every lit fragment).
* *Moon visible as a disc from ≈ 1.1 s* (×0.04 still reads), against the shot list's "veiled moon enters the top third at
  2.81 s" and its "sharp moon" negative. → Disc fully hidden behind the cloud (only its glow in the cloud edges) until
  2.58 s; it comes out over f1755–1762 and is at S019's values on the cut (f1760 84 %). S019's frame 0 matches (same moon
  position, same cloud field).
* *The lower right of the second half was an empty 90 m plaza that read as a car park* ("lights fill the frame" only in the
  top two thirds). → A tree-lined plaza by the SE corner (x 64–96, lumpy lamp-lit crowns instead of faceted icosahedra),
  then two rows of 2–5-floor pitched-roof shophouses (fronts at z ≈ −2 and −21, low near the corner, stepping up eastward)
  with a lamp-lit apron and back street. Kept out of frame 0's right half so the lab window stays the focal warm point.
* *City windows read as light panels, buildings as boxes, the hill as a uniform sparkle.* → Resolved windows ×0.5 with an
  interior falloff (ceiling light), curtains on ~22 %, blinds on ~12 %, a mullion on wide ones (only lit, resolved pixels pay
  for it); sub-pixel windows keep their point value. Sills catch the street light, a cornice band + shadow line at each wall
  head, rooftop housings / tanks on flat roofs within 700 m, hillside neighbourhoods with 0.4–1.55 × lit fraction,
  street glow on near facades −25 %, city lamps steady (twinkle 0.15 → 0.03: "no flicker").
* *Quay LED heads glared beside the lab window* → glow 0.38 → 0.26. Hemi +½ stop for shadow detail on the dark facade.
* Perf: the cheap sea instance for S018 too (A/B identical glitter path and window reflection; ≈ 0.4 s wall less in the
  first second); city instances sorted front-to-back; occluders drawn before the paving / terrain (three sorts opaque by
  material id). Net cost ≈ the pre-review module (the city detail eats the savings; A/B below).

**S046**
* *Foreground "organic puddles" read as large dark stains (camouflage blobs)* → damp sheen: wet coverage 0.8 → 0.42,
  threshold 0.6 → 0.66, wet darkening 0.35 → 0.22, softer edges; the wet patch at the gate (lamp reflections leading to the
  spot) kept. E1's wet earth + lantern streak unchanged.
* *E3 awning a flat plank* → painted timber valance with a cut edge on the street side, side cheeks, battens under the sheet.
* *Steamer / freighter houses plain blocks* → dark window bands on every deck house, a wheelhouse (E2), boat deck with
  lifeboats + davits and a bridge (E3), bridge wings (E4).
* *E4 pale concrete lamp pole cut the right half like a white stripe* → weathered darker concrete.
* Verified: era cuts exact at f3581 / f3592 / f3619 (E3 = 27 f), camera identical, waiting spot (0.38, 0.70), threshold
  y 0.66 (= S047's ink line), E1 lantern (0.40, 0.46) = S045's shore-light bokeh, MIGRANT case in her RIGHT hand, father and
  child really holding hands (4× crops).

**S080**
* *Too cold for its place in the dawn table* (blue-grey ≈ 10–15 % warm while S079 just before is mauve-peach and the shot
  list asks ≈ 35–40 %) → warmer horizon haze, the P21 band spread along the right half (still thin), exposure 1.32 → 1.46,
  temp +0.02 → +0.10, a little dew on the setts. Never orange.
* *The fishing lamps — the shot's emotional point (有几盏灯，还舍不得熄) — were 2-px specks*, the nearest one sitting on the
  ferry's stern like a ferry light. → Four lamps clear of the ferry (x 0.65–0.92), bigger cores, a soft warm halo each
  (not clipped by the sea), a small dark boat silhouette under each, stronger reflection columns.
* LED quay heads glow 0.38 → 0.24 (they no longer compete with the sea lamps).
* Verified: 248.1 skylight band crosses the quay f5952–5974 and leaves the pool on the empty spot through f5982 into the
  S081 dissolve; gull 0.55–1.9 s; bare flagpole; bay light (0.238, 0.323).

### Performance after review
Shared machine at load 8–15 on 4 cores throughout (other agents rendering), so single runs swing ±30 %. Interleaved A/B in
one browser against the pre-review module (`out/check/harbor_eras/he_ab.mjs`; to rerun, copy
`out/check/harbor_eras/he_orig_baseline.js.txt` to `scenes/_he_orig.js` — `out/lab/he_orig_shots.json` points the three shots
at it): CPU ratio new/old f1700 0.93–1.03, f1712 1.01–1.09, f1730 0.94–0.99, f1754 1.06–1.10, f3600 1.04–1.06, f3625 0.98,
f5940 1.02, f5970 0.93 — **cost-neutral**. `render.mjs --every 1`, 24 frames, at load ≈ 10–11:

| range | mean s/frame | max |
|---|---|---|
| S018 f1705–1728 | 1.97–2.00 | 2.40–2.87 |
| S018 f1735–1758 | 1.58 | 2.04 |
| S046 f3595–3618 (E3) | 1.33 | 2.30 |
| S046 f3620–3638 (E4) | 1.45 | 2.35 |
| S080 f5930–5953 | 1.43 | 2.30 |

(The same ranges of the pre-review module at the same load measured 1.70–2.29 for S018 f1705–1728.) At the pass's earlier
load of 3–7 these ranges measured 1.64 / 1.08 / 1.21 / 0.91 / 0.54, so the idle numbers should sit near the 1.5 s typical
target; S018's first second remains the heaviest stretch of the module.

### Still open (documented, not fixed)
* S018 camera stays near-level (+0.9° → −2.9°) instead of the shot list's ~15° tilt-up — required to hold both end
  registrations with S019's low moon (see Deviations). The "high-angle looking down" beat is therefore a rise over the
  roofs, not a downward look.
* The S018 end moon is crisp and large (it must equal old_home S019's disc); it is veiled until f1755 only.
* RESTORER in the lab window is still tiny (≈ 13–16 px, by the shot's scale); she reads as a silhouette at a lamp, not a pose.
* City far rows are still procedural boxes; near shophouses have no balconies or signage geometry; ships remain simple.
* Guards / extras are lo-LOD crowd recolours (no collars or badges at this size); flags ≈ 12 px, colours only (by design).
* S080's skylight band brightens ground and water only (no vertical surfaces); in stills it reads as the light coming up.

## Integration fixes (2026-10-06, whole-film QA pass)

- **Grain:** the in-scene multiplicative grain quad and the `grain: 0` overrides are gone; per-era amounts go through post:
  S046 E1 navigator 0.042 · E2 map office 0.040 · E3 migrant 0.044 · E4 chapel era 0.038; S018 and S080 modern 0.035.
  S046 is otherwise untouched (director: the best shot of its section).
- **S018 (minor):** the city's lit windows are ≈ a third fewer (`uLit` 0.72) and the whole city is held ~40 % down for the
  first second (ramping up 0.55–1.5 s as the rise reveals it), so her lit lab window — S017's candle carried over — is the
  one anchor at frame 0; the rise and the moon end frame are unchanged. *Not done:* a closer start (her window ~25 % of frame
  height) — it would change the reviewed light-cut register with S017.
- **S080:** re-checked under the centred S080 → S081 dissolve (it now runs 6 frames past its out frame, u > 1).

### Timing (1280×536, 6 consecutive frames, load ≈ 10): S018 1.51 s/frame (max 1.75).
