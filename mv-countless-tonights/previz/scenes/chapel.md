# chapel — LOC_CHAPEL (era `chapel`, CT_CHAPEL)

Module `scenes/chapel.js` · shots **S055 S056 S057 S058 S069** · named view **`view_chapel`** (corridor pane P4, S066).
Exports for other modules: `CH` (geography), `paintWindow()`, `glassPanelCanvas('then'|'museum')` and `GLASSPANEL_QUARRY`
(PROP_GLASSPANEL; the corridor/P4 should use `glassPanelCanvas('museum')` so the S057 ↔ S061 quarry (T18) is the same glass).

## World
X = east (altar end, deep, never featured), Z = south, metres. Nave 32 × 14 m, walls 10.5 m, pale-grey timber barrel
vault to 15 m, tie beams + still ceiling fans, terracotta floor, 14 rows of teak pews each side of a 1.9 m aisle (row 1 =
front/east). Three west lancets (1.6 × 7 m, sill 4.2 m) above a shallow organ gallery are the key windows; low arched
aisle windows (sill 0.95 m) and upper louvres on both side walls. MOTHER sits at the **aisle (screen-left) end of the 7th
south pew** facing east, LONELY at its **wall (screen-right) end** (director ruling S056/S069), an empty stretch between.
Candle side tables in the north aisle + an iron votive stand in the south aisle (blue-hour warm points).

Light: one far SpotLight = the 3200 K sun (26° elevation, cheated low so the petals land on the people), its `map` the
lancet cookie warped into the light's view, 1 shadow map (1024²). Three ray-marched `FX.windowShaft` prisms, one per lancet (half-res layer; review — was one prism over
all three lancets) + two `FX.dustMotes` sets lit only inside the beam. Hemisphere (cool sky / warm floor bounce),
a below-floor warm bounce point, vault/beam emissive fake bounce (scaled by daylight), blue-hour DirectionalLight + a cool
window point for night, candle lights per shot. `daylight(k)` blends last sun (k 0) → blue hour (k 1): sun, shafts,
dust, glass intensity/tint, hemi, fog, vault bounce.

**Projected-petal cheat (director ruling 2, "chapel light"):** the sun's cookie is not the real lancet design but a denser
"petal" version (each lancet's body tiled 3 × 3 from its own interior, pointed head kept) so floor/pew petals are 10–14 cm
("光分成千万瓣"), plus **art-directed petal clusters** painted where the sun rays through MOTHER's shoulders and through
LONELY meet the window (bible §3.4: "让光瓣恰好落在她肩上"). The visible glass and the volumetric shafts keep the real
design. Without this her back carried 2–3 huge soft blobs and the pale qipao read as bare skin.

## Shots

### S055 · 174.58–177.42 · WS 32 mm · "彩窗下" (crane, part 1)
- Opens at ~9 m near the west end, looking SSW: the south lancet at frame right, its bright amber-ruby head cluster at
  ≈ (0.72, 0.30) (light-to-light register from S054), coloured shafts slanting down-left through the dark upper volume,
  pale timber vault + tie beam top-left. Locked until **175.36 ('下', f4209)**, then the descent with an 18-frame ease-in
  (arc-length speed profile), pan left ~44° by the cut, tilt down so pews + floor petals fill the lower part at the cut.
- Shafts swell to their richest at **174.76 (f4194)**, thin to veils as the camera sinks into the beams (no "fog
  everywhere"). No figure resolved (LONELY/MOTHER out of frame at the cut).
- Deviations: the shot list's "~6.5 m at the cut" → ≈ 5.0 m (the continuous move must reach seated height by S056 1.6 s
  without a swoop; the uniform-speed profile lands lower); the lancet is ~11 % of frame width, not 30 % (that framing puts
  the camera inside the beams where the shafts no longer read); "lancet at the right edge" at the cut is read as the
  south aisle windows (a 40° pan cannot keep a west window in frame).

### S056 · 177.42–180.92 · WS 32 mm · "光分成千万瓣" (crane, part 2)
- Continuous with S055 (same path/speed/orientation splines; exposure ramps 1.0 → 1.12 over 1.2 s so the cut is seamless).
  **177.82** petals across the floor and pews; **178.42** gliding over the pew backs; LONELY revealed first (in his pool of
  coloured petals at the row's right end) while MOTHER is still out of frame left; he drifts out frame right at
  **179.4 (f4306)**; seated height by ≈ 179.1; **180.3** approaching her back; near-stop at 1.3 m behind and slightly right
  of her, her back at ≈ (0.45, 0.6), shoulders ≈ 24 % of frame width, petals on her shoulders; follow focus onto her back.
- Deviation: the shot-list pan is ~130° in total (window → nave axis), faster than "slow" in the middle; kept smooth.

### S057 · 180.92–182.92 · CU 100 mm locked · "我听不懂你的祈祷"
- Right profile, eye registered at (0.30, 0.44), head ≈ 45 % of frame height, eyes closed, head bowed; the letter pressed to
  her sternum, its pale-blue edge showing above her right hand (hands flat across the chest, fingers angled across — no
  praying hands, no ritual gesture), jade bangle on the LEFT wrist (beyond the letter, mostly hidden in this profile).
- Soft foreground plate (approved cheat, ruling 2): the lowest tier of the low window = PROP_GLASSPANEL 'then' (muted, 60 %
  saturation, ≈ 5 px CoC), the 6 × 9 cm clear diamond quarry at **(0.70, 0.45)**, ≈ 9.5 % of frame height, set in a lozenge
  of pale amber/opal glass so it reads at any blur; inside it, dark, the RESTORER's face (separate RT, true mirror, `mid`
  figure lit like the corridor) fades up 0–0.3 s from **180.94** and reaches its strongest (~32 % additive, still
  unresolved) by 2 s. Thumb rubs the fold at 1.0 s; the "lips" on **182.44** = a tiny nod (faceless sculpt).
- Deviation: reflection opacity ≈ 36 % at its strongest (shot list: 15 %), because at 15 % it vanished completely under the ~5 px
  plate blur. See the Review section for the brighter key on the face and the reframing.

### S058 · 182.92–186.08 · MCU 75 mm · "却懂你颤抖的双肩"
- Right rear 45°, slightly high, 12 cm push (shoulders 28 → 30 % of frame width), shoulder line at the right third
  **(0.66, ≈0.60)** with the bowed head and chignon fully in frame (T19 register with S059's bent back at the same place);
  the camera reference comes from an un-trembled pose, so the camera never shakes with her.
- Tremble: starts on **183.76 (f4410)**, most visible on **185.14 (f4443)**, real speed: the library's slow heave plus an
  irregular 3–5 Hz shrug shudder (≈ 1 cm at the shoulder, ~11 px); fingers tighten, thumb rubs the fold.
- Light: petals on shoulders/collar; 2.15–2.95 s the sun drops (cookie slides up the window, petals slide off and fade),
  blue hour (P03) by **185.8 (f4459)**; two tiny candle points ahead at ≈ (0.42–0.53, 0.32) (target (0.52, 0.38)); dark
  pew back across the lower frame. Candle point lights off here (the flames still glow).
- Deviation: shoulder line at y ≈ 0.6 instead of 0.5 — at 0.5 the bowed head/chignon is cut by the top of frame.

### S069 · 217.71–219.71 · MS 50 mm, ≤ 2 % push · "不过无数个今晚"
- Blue hour, glass dark, only the iron votive stand's candles warm (upper right ≈ (0.74, 0.22), warm pool on the wall; one
  candle point light, the north-aisle candle lights off). Rear three-quarter from the aisle side behind row 8 so T21 holds
  (she moves screen-left → right and down; LONELY at the pew's screen-right end).
- Opens mid-action on her last step in the row's legroom (letter at her chest), turns, sits beside him — seated contact on
  **218.52 (f5245)**; his hands loosen on the cap at 1.1 s (hidden from this angle by his body); stillness from 1.53 s.
- **End register: the two sleeves' contact at (0.420, 0.621)** (her short dove-grey sleeve / his thin white sleeve) = the
  A frame of the 12-frame dissolve into S070 (aged cuff at (0.42, 0.62)).
- Deviations: at frame 0 she is at x ≈ 0.21 (not 0.36) and LONELY at ≈ 0.5 (not 0.66): with the end register fixed and a
  50 mm lens the keyframe positions cannot all hold; camera pulled back to ~3.6 m so her standing head stays in frame.
  Grain lowered to 0.012 (engine grain hash degenerates into stripes at f5200+, lib/ISSUES.md [sea_deck]).

### view_chapel (corridor pane P4, S066)
- Self-contained: MOTHER from her right rear ~40°, slightly high, residual petals on her shoulders at k = 0.5 (sun half
  gone, blue hour coming), soft trembling + breathing from T, slow 4 cm camera drift. **Fixed vertical FOV 16°** (not a
  focal length), so the framing holds for whatever pane aspect the corridor's RT has; subject centred. Shaft, dust and
  candle lights off (cheap). Lit to read at exposure ≈ 1 (nested renders have no post).

## Library workarounds (see lib/ISSUES.md)
- `FX.windowShaft` vanished whenever the camera was inside the prism (the crane descends through it): forced DoubleSide,
  no-op `onBeforeRender` ([chapel] entry).
- Figure: MOTHER's qipao cooled slightly (#ADAEAE vs #BDB6AB), fold relief ×2.6 + slub mottling so it reads as linen;
  LONELY's hair toned (grey mix ≤ 0.78) — still reads rather like a white cap from behind.
- Seated qipao lap flap (known weakness): never in frame — S056/S058/S069/view from behind with the pew back hiding the
  lap, S057 framed above the lap.

## Timing (render.mjs, 1280×536, 24-frame ranges)
The machine was shared with 3–4 other agents for the whole session (load average 7–14 on 4 cores), so absolute numbers are
inflated ≈ 2–3× (the same S055 frames ran 0.47 s/frame at load 0.5 at the start of the session; an alternating A/B bench,
`out/check/chapel/ab.mjs`, could not resolve < 20 % differences under this load).

| shot | measured, load 7–10 | measured, load 12–14 | est. idle | what it carries |
|---|---|---|---|---|
| S055 | 0.88 s (max 1.33) | – | ≈ 0.45 s | 12-step shaft, 2 dust sets, shadowed sun (1024²) |
| S056 | 2.70 s (max 4.40) | 3.82 s (max 5.50) | ≈ 1.2 s | 6-step shaft copy (camera inside the beams), dust, sun shadow, MOTHER hi + LONELY mid, DOF |
| S057 | 1.48 s (max 2.38) | – | ≈ 0.75 s | hi CU + restorer RT (204×300) + glass plate, no shaft/dust |
| S058 | 1.95 s (max 4.72) | 2.22 s (max 4.67) | ≈ 0.95 s | hi MCU, sun shadow until 2.95 s; max = shader compile at the light-set switch |
| S069 | 2.25 s (max 3.28) | 1.71 s (max 2.82) | ≈ 0.8 s | MOTHER hi + LONELY mid, 1 candle light, DOF |

Before this pass (colleague's version, measured idle at the session start): S055 0.47, S056 1.03, S057 0.83, S058 2.19,
S069 2.53 s/frame. Savings: shadow map 2048 → 1024, per-shot candle point lights (FX.candle lights have infinite range),
shaft/dust off in S057/S058/view, winGlow off in S058, LONELY `mid` only (≤ 1 hi figure per frame), a 6-step shaft copy in
S056. S056 is the costliest because the shaft now really renders there (the colleague's version lost it silently).

## Known weaknesses
- S055's middle (≈ 176.3–177.0) passes the south-west corner: plain lime wall, a louvre and the organ-gallery parapet;
  in motion it is a transitional half second, as a still it is the weakest frame of the crane.
- The shafts are haze veils more than crisp bars while the camera is inside the beams (physically right for three 1.6 m
  lancets; deliberately thinned).
- Floor/pew petals are mostly warm (terracotta and teak swallow cobalt/sea-green); the cooler hues show on the qipao and
  LONELY's white shirt.
- Faceless sculpts: the S057 "lips" and the eyelid tremble are not readable; the reflection in the quarry is a soft face
  shape only. S069's hand loosening on the cap is not visible from the rear angle.
- LONELY's white hair reads like a white cap from behind (library hair shell).
- S054 (restoration_lab) currently ends with the magnifier halo near (0.47, 0.45), not at its registered (0.72, 0.30); S055
  follows the shot-list register.

## Test files
`out/check/chapel/r11*` (latest full round), `tests/` (composition and debug probes), `ab.mjs` (alternating A/B bench,
unreliable under the session's load). Debug: `?chdbg=1` prints projected positions; `?chx=<switch,…>` A/B switches
(noshaft, nodust, noshadow, sh2k, nofig, nodof, realck = real cookie instead of petals, faceq = big opaque reflection).

## Review (art direction + DP pass, 2026-10-05)

A full re-render and look at every shot (u 0/0.05/0.5/0.95/1, every sync frame, the view, the S054/S059 neighbours, 6
consecutive frames in S055 and S058, and the S069 walk every 2 frames). Shots that looked acceptable as thumbnails failed
at full size. The figures did not read as the characters, there was a pattern artefact over every frame, and the S055 crane
was muddy. All fixes are in `scenes/chapel.js`. Library notes are in `lib/ISSUES.md` under [chapel review].

### What was wrong → what changed
1. **Screen-door / stripe pattern over every frame.** The engine's film-grain hash runs out of float precision at f4190+.
   S069's lowered grain did not remove it. Fix: module grain in the engine's half-res additive layer, using the
   pier_waiting recipe (integer pixel hash, frame seed mod 977, luminance-weighted, after the DOF), with engine `grain: 0`.
   It is hidden in nested renders.
2. **A regular diagonal weave and speckle inside the light shafts.** `fx.windowShaft` uses a static IGN jitter, and one
   prism over the 9 m window rectangle (53 % black) wasted its samples between the lancets. Fixes:
   - one prism per lancet with its own cookie;
   - the shader patched to an integer-hash jitter re-seeded every frame (it now reads as fine grain in the light);
   - 14 steps for S055 and 8 for the S056 copy (camera inside the beams);
   - shared look uniforms across the three prisms;
   - the old combined prism is kept only as the dust motes' beam mask.
3. **S055 was a muddy orange-brown wash.** Fixes:
   - shafts: white beam tint, so the glass colours survive; one-third the cookie blur (penumbra ×0.35); wispier haze
     (noise 0.85); softer prism edges;
   - room: cooler blue-grey dusk-sky fill (hemi `#6A7896` / `#6E5444`, 1.35) and a cool dark fog;
   - glass saturation 0.84 (bible: P23–P27 −30 %, never neon).
   S055 now reads as distinct ruby, amber, cobalt and violet shafts slanting down-left through a dark, lime-white volume,
   with the lancet blazing at frame right.
4. **The vault read as cartoon yellow planks, the tie beams as cartoon brown.** The bible says "木构拱顶漆浅灰" (painted
   pale-grey timber vault). Fix: procedural painted boards (pale grey paint, dark seams along the nave, butt joints, brush
   streaks, age mottling). The tie beams use a darker warm grey.
5. **Pews were black slabs and the key:fill ratio was far beyond the bible's 4:1.** Fixes:
   - an unshadowed warm directional fill from the glowing west lancets (`westFill`, 0.32 × sun; it switches with the sun,
     so there is one recompile);
   - glossier pews (roughness 0.5, env 0.8);
   - the mid-length support boards under the seats removed (never seen; only a distraction near the lens).
6. **MOTHER from behind read as a bald man in a polka-dot T-shirt** (S056 end, S058, view). This was the most serious
   problem. Fixes:
   - **Hair:** the lower back of the head was bare skin under the library shell. Added a hair overlay copied from the
     head-layer skin (same weights, 2.5 mm proud, her own hair material, feathered edge). The `low_bun` is soft-selected
     and slid 3.4 cm down to the nape, so it reads as a low chignon.
   - **Collar:** the mandarin collar was swallowed by the bowed neck column. Added a skinned 4–6 cm stand-collar ring
     sampled on the neck, top hugging the neck, bottom covering the flare. The library ring is folded into the neck, and
     the front-only material removed an orange inner-face ring.
   - **Back:** the fitted shell showed sculpted back muscles. Its *shading* normals are diffused over ~6–8 cm (positions
     untouched); LONELY's shirt gets the same treatment.
   - **Petals:** the art-directed cluster is now overlapping pointed petals on a dim ground, warm-dominant with cobalt and
     ruby. The old round saturated blobs read as polka dots, and an all-amber ground made the pale qipao read as bare skin.
   - **Light:** the west fill is desaturated (`#D2B4A4`).
7. **LONELY's white hair read as a white skull cap.** That is an ethnic/religious marker the bible explicitly avoids (§5.10:
   "族裔不刻意标注"). Fix: his shell is hidden. An overlay fringe runs above the ears and round the back to the nape, with
   a bald crown. The hair shader is patched to sparse mottled coverage over the scalp: no lock stripes, soft edges.
8. **S057: the letter sat inside her chest** and printed through the qipao as an orange stain, and the right hand's fingers
   pointed forward-up like a half prayer. Fix: a `press` hold. The letter is 4.5 cm in front of the sternum (yaw 0.62),
   both hands lie flat on it with the fingers along her body's left/right, and the pale-blue top edge and fold show above
   the right hand.
9. **S057: the restorer's face in the quarry was invisible.** Fix: the reflection RT is reframed (face centred in the
   diamond, camera 0.98 m), the key in the reflection scene goes 0.35 → 1.3, and the opacity ramps to 0.36. It is now a
   faint pale face shape in the dark diamond, still unresolved.
10. **S058 blue hour was saturated periwinkle, and her hair read as a navy cap.** Fixes: a muted P03 key (`#7D8FAE`, 0.6),
    a desaturated night sky (`#48587A`) and a softer night grade (temp −0.16, sat 0.84). A faint warm "candle" rim (3 m
    point light ahead-left of her, S058 only, switching with the night set) separates her back from the blue.
11. **The white altar cloth read as a white board right behind her head** (S056 end). Fix: a muted cloth (`#8C877E`).
12. **The sun shadow `bias` / `normalBias` were written inside a code comment** and never applied. They are now
    −0.0002 / 0.004.
13. **view_chapel:** the under-floor bounce lit the north block's aisle-end panel into a pale defocused block at lower
    left. Fix: the bounce is ×0.35 in the view, and her bag is hidden there.
14. **Look-dev hooks:** `?chlook={json}` overrides any `LOOK0` field (incl. `post:{S055:{…}}`, `steps`, `letterOut`,
    `reflBox`, `ray:[x,y]` with `chdbg=1` raycasts a screen point). `?chx=` adds `trimred`, `trimonly`, `hxdbg` (overlays
    in flat red/green), `nobody`, `nohead`, `nosmooth`, `nowest`, `norim`, `nograin`, `sparse1`.

### Neighbours and sync points (checked frame-exact)
- **S054 → S055 (light, 0 frames).** S054's halo is at (0.71, 0.70) and the S055 lancet at x 0.66–0.78. The horizontal
  register holds; the vertical does not, because S054's halo sits low (restoration_lab).
- **S055 / S056.** Continuous: f4257 and f4258 are identical in framing and exposure.
- **S058 end → S059.** S058's back is at x 0.52–0.81 with the shoulder line at y ≈ 0.45 and ~29 % width. S059's GUARD is
  at 0.53–0.88, line ≈ 0.30. Close; the guard reads a little bigger and higher (night_window owns that side).
- **S069 → S070 (12-frame dissolve).** The sleeve contact is held at (0.42, 0.62). `museum_gallery` does not exist yet, so
  the dissolve shows the slate.
- **Sync points.** All land on their frames: 174.76 shafts richest, 175.36 descent, 179.4 LONELY leaves frame right, 180.94
  reflection fades up, 183.76 / 185.14 tremble, 185.8 colour gone, 218.52 seated, 219.24 stillness. Six consecutive frames
  in S055 and S058 show no flicker; the shaft grain changes per frame like film grain.

### Performance (render.mjs `--range`, 24 frames, 1280×536; machine shared, load 7–10)
| shot | s/frame (max) | vs the pre-review module (A/B in one browser, `ab.mjs`) |
|---|---|---|
| S055 | 1.07 (1.66) | – |
| S056 | 2.53 (3.36) | +11 % (f4300) |
| S057 | 1.78 (2.58) | +11 % (f4366) |
| S058 | 2.65 (6.49 = shader compile at the night-set switch) | +7 % (f4440) |
| S069 | 1.63 (1.95) | – |

The review costs about 7–11 % per frame: the extra shaft prisms, the west fill, the module grain and the overlays. The
light-set switches were merged so S058 compiles twice instead of three times. At this load the absolute numbers run about
2× idle, so the idle estimate is ≈ 0.5–1.3 s/frame.

### Still weak (accepted or out of scope)
- **S055 framing and speed.** The lancet is about 12 % of frame width, not 30 %; the colleague's reasoning stands (that
  framing puts the camera inside the beams). The crane cruises at about 2.8 m/s, because the path is ~12 m in 5.6 s from
  the west end to row 8. That is faster than "slow" in the middle, but a smooth, constant-speed move. 176.3 s (the
  south-west corner with a louvre) is still the plainest frame, now crossed by coloured shafts.
- **Floor petals.** At 177.82 they cover the pews more than the floor: the near-west floor lies under the beams' lowest ray,
  and the 26° sun is the approved cheat that lands the petals on her shoulders.
- **Figures** (library):
  - LONELY's mid sculpt is still broad-backed for a thin 75-year-old (softened by the shading pass);
  - faces and lips are faceless (the S057 "lips" are a tiny nod);
  - the collar's top edge has a slight waver;
  - S069's hands loosening on the cap are hidden from the rear angle;
  - the seated qipao lap flap is kept out of frame everywhere; view_chapel would show it without the pews.
- **S069 frame 0.** The mother is at x ≈ 0.21, not 0.36: the end register is held exactly.
- **S056 shaft edge.** At ~179.2–179.4 the camera grazes the centre beam's side, which shows as a soft vertical veil; it is
  physically right.

### Files
`out/check/chapel/rv/` holds all review renders:
- `final2/` — the latest round: shots, `sync/`, `view/`, `seq/`;
- `final2_*.jpg` — contact sheets;
- `t*/` and `look_*` — look A/B renders;
- `head*/` and `lon*/` — figure debug views;
- `perf.txt` — timing;
- `rq.mjs` — render.mjs plus `--qs` for query switches;
- `look.sh` — renders a `?chlook=` variant;
- `crane.mjs` — projects key points through the crane path without rendering.

The contact sheet is `out/check/chapel/sheet.jpg`.
