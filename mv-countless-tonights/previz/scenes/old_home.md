# old_home — LOC_HOME, the navigator's granite house (17th c., era `home`, CT_HOME)

Module `scenes/old_home.js`. Shots **S016 S017 S019 S035 S041 S042**; named views for nested renders
**view_home_candle** (gallery G3b, S024/S025), **view_home_hand** (gallery S026), **view_home_rain** (corridor P2, S066).

This module was started by a colleague and finished in this session. The colleague's partial version is kept as
`out/check/old_home/old_home_colleague_backup.js`; its renders are in `out/check/old_home/t1…t7`, `sync/`, `dbg*/`.

Contact sheet (all shots at u = 0.5): `out/check/old_home/sheet.jpg`. Sync-point and cut-pair frames:
`out/check/old_home/sync2/` (`cuts.jpg`, `sync.jpg`). Timing runs + motion clips: `out/check/old_home/perf/`.
Debug setups (out/check/old_home/dbg_shots.json, `--shotsfile /previz/out/check/old_home/dbg_shots.json`): DBG_ROOM, DBG_TOP,
DBG_WIFE, DBG_HANDS, DBG_HEAD, DBG_EXT, DBG_PROBE, DBG_BOWL19 (S019 hand-on-rim close-up), DBG_HANDS35, DBG_S35TOP (S035
overview with a red cone at the camera), DBG_LAB, **DBG_PANES** (the three named views rendered into portrait RTs, linear HDR,
side by side — how a vitrine pane will see them).

## Set

### Interior (main room 5 × 4 m, x −2.5…2.5, z −2…2, floor y 0)
- Granite shell, smoke-darkened inner skins, purlins, square clay-tile floor. Camphor table (#3E2B1F) at the centre and two
  benches: **she sits on the screen-left bench (x −0.6) facing +X; the screen-right bench stays empty.**
- Cracked-ice lattice window (#3A2A1E) in the east (screen-right) wall: `FX.windowLight` with the `crackedIce` cookie. Its
  real shadow casters put the lattice pattern on the table, the empty bench, her shoulder. The moon direction is set per shot
  (MOON_16 / MOON_IN_A / MOON_IN_C / MOON_S35, and the S017 dissolve moves it by one cell).
- Candle `FX.candle` on a brass stick (#8C7350), states B (11 cm) → C (6 cm) per the director's ruling; extra pooled wax for C.
  The wax body no longer casts a shadow onto its own drip pan (a point light 1.5 cm above the wick painted the dish black).
- The bowl of cold rice: canonical `TX.bowlGeometry` + `porcelain_bowl` (side A to −Z = frame top), rebuilt rice texture
  (1024², three layers of 6–7 mm grains with contact shadows; dry, no steam), untouched bamboo chopsticks across the rim.
- Low stool + rattan sewing basket under the window, a stand for the sewing candle, shelf jars, water jar, hat, broom.
- The S035 lamp is a staging cheat (flagged in the shot list): a small niche in the door's south reveal, lowered to 0.62–0.88 m
  so it can sit between her face and hands in frame; it has its own halo so it reads as a 2 cm point at 5 m.

### Exterior
- West facade with the door (granite jambs and lintel), the lamp niche left of the door (`FX.oilLamp`, PROP_LAMP), a shuttered
  side room, the house ends at z 3.6 (shortened from the colleague's 4.6 so the sea opens right of the corner in S019/S041).
- New grey clay-tile roof texture (cover tiles over pan tiles, per-tile tone, overlap lips, lime bedding), round tile ends.
- The long granite doorstep: its **outer edge is the eaves' drip line**; the bowl stands there just south (screen right) of the
  door at BOWL_S (−3.60, −0.18, 1.95). A granite seat block on the step south of the door (S041).
- Flagstone yard, a knee-high rubble wall (so the sea reads above it), water urn, bucket, firewood. Sky `createSky` night with
  the moon locked to S018 (see below), `createSea` calm.
- Moonlight cheat (director: moon cheats approved for the night): the visible moon is low at upper right (az ≈ 130°, 7.6°) =
  backlight; the light is swung to az 200° / 26°. It still comes "from the right" in frame, rakes the facade (granite reads,
  the eave throws a dark band over the upper wall) and puts the step's outer edge and the bowl in moonlight.
- Weather per chorus: CH1 dry, gathering clouds, the moon dips ~½ stop 0.3–1.3 s; CH2 heavy low cloud, moon only a glow, damp
  stone (roughness/colour), more fog; CH3 rain (`FX.rain` backlit by the niche lamp, eave `FX.drips`, `FX.ripples` in the bowl,
  a falling drop + crown splash into the centre blossom at 207.07 s and every 1.35 s).

### Lab rig (S017)
A separate group at x +60: two white muntins + the meeting rail of the arched six-over-six sash, glass smudges, dim harbour
lights; a plate at 12 m showing the old home rendered by a second camera into two 640 × 268 RTs (candle B / C) cross-faded
for the in-reflection dissolve; the restorer's faint reflection (mid RESTORER, additive) at mirror depth 6.2 m.

### Figures
WIFE hi (close-up hands swapped in: `loadCharacterHand('WIFE', …, {lod:'close'})`, silver bangle on the LEFT wrist from the
figure accessory) and WIFE mid; CHILD hi (barefoot, calf-length trousers; only the lower legs are ever in frame); RESTORER mid
(reflection) and two RESTORER close gloves (S041). Figure shadow casting is a per-shot switch (`figShadows('all'|'hands'|'none')`).

## Camera lock shared with harbor_eras (S018 → S019 sky match)
`harbor_eras.js` copies **CAM19_REF** = { pos (−13.0, 1.15, 0.4), target (−3.2, 0.85, 4.2), 32 mm } to aim S018's end on the same
moon and clouds. The sky is direction-only, so old_home keeps exactly that view direction but moves the camera in: **CAM19** sits
6.5 m from the bowl so the bowl lands at (0.30, 0.78) and the bending woman reads at a WS. Never re-aim CAM19; moving it is free.

## Per shot

Each shot ends with a **Measured** line: the `render.mjs --range` mean over 24 frames (after the first, incl. JPEG/mp4 encode) on
this shared 4-core box with the 1-min load at the time, then the idle estimate. Other agents were rendering throughout, so the raw
numbers run high; see "Performance" below for the method.

### S016 — CU 50 mm, MATCH CUT from S015 (T07), rise + pull-back to the empty bench (65.25–67.0)
- **Match:** frame 0 rim circle centred ≈ (0.505, 0.515), Ø ≈ 77–80 % of frame height, 15° from vertical tilted from the 6 o'clock
  side, side A at 12 o'clock — measured against S015's last frame (same centre, same size; the cut lands).
- **Move:** 6-frame ease-in, near-constant rise and pull-back; the end framing is solved from the posed figure: bowl (0.68, 0.60),
  candle flame (0.46, 0.40), her folded hands with the bangle at the left edge, the empty bench's top in moonlight at frame right.
  The move is front-loaded so the bench edge is in by '失' (66.32 s), then settles to 60° down at 1.75 s.
- **Light:** candle B low and warm from frame left; the lattice moon (MOON_16, raised so it also lights the empty bench) lays the
  cracked-ice shadow across the right half of the table and the rice. Focus slides from the rim to the table plane. No steam.
- **Deviation:** the empty bench shows as a moonlit strip at the right edge (at 60° down the table edge hides most of it).
- **Measured:** 2.71 s/frame at load 6.4 (max 4.08); ~1.3 s idle estimate.

### S017 — MS 75 mm, locked, the lab's arched window as a mirror; in-reflection dissolve B → C (67.0–70.54)
- **Reflection:** the restorer's faint reflection is a TRUE mirror image now (the colleague's figure faced away — we saw her back):
  facing the lens, bowed over the reflected bench, warm from the lamp, at (0.62, 0.38), darker than the candle (bible 8.3-6).
- **Depth:** focus racks 0–0.8 s from her reflection (6 m) to the home plate (12 m); the muntins go soft.
- **Home:** wife on the left bench by the candle (≈(0.32, 0.5)), the candle flame at ≈(0.44, 0.47) (S018's light anchor (0.42,0.46)),
  bowl at the right of the table; 1.0–2.0 s cross-fade of two plates (candle 11 → 6 cm, the lattice one cell on); her shoulders rise
  and fall once, peaking at 2.6 s (69.6). Her face stays soft (640 px plate, glass waviness, short focus).
- **Deviation:** the empty bench is behind the restorer's reflection and barely reads.
- **Measured:** 1.39 s/frame at load 10.7 (max 2.36); ~1.05 s idle estimate.

### S019 — WS 32 mm, locked, eye level; the bowl set on the step (73.458–75.04)
- Composition: sky in the upper right with the veiled moon at (0.80, 0.14) (orientation lock), the facade at left with the warm
  half-open door (x ≈ 0.12–0.25) and the dark, unlit niche at the left edge, the house corner at x ≈ 0.48, then the yard, the low wall
  and the moonlit sea. She crouches right of the door, face hidden, and sets the bowl on the step's outer edge at (0.30, 0.78).
- **Action:** a deep crouch so her right hand really reaches the rim (IK target hit exactly; checked in DBG_BOWL19): lowered 0–0.72 s,
  foot touches at 74.18 '等' with a tiny settle, fingers on the rim to 1.14 s, palm lifts ~8 cm at 74.60 '场雨' and holds.
- **Deviations:** the registered eave line at y 0.36 and door width 0.08–0.26 cannot both hold at this distance; the eave is at the top
  edge and the door is ≈ 0.13 wide. The camera is 1.31 m above the yard ("eye level", slightly low).
- **Measured:** 1.65 s/frame at load 7.6 (max 2.71); ~1.2 s idle estimate.

### S035 — CU 75 mm, locked; mending the patch, the bite, the shy smile, the glance, focus to the door lamp (118.33–121.25)
- **Prop rebuilt:** the navigator's indigo sleeve with the cuff turned back; on the turned band the pale-blue patch (4.5 × 6 cm,
  #7D9CBB, running stitches #E9E4D6, one uneven corner with the double knot), a thread from the knot to the needle until the bite.
- **Staging:** near-profile from her left (window side), head bowed, the work held up under her face (sewing close to the light),
  elbows down. Solved at frame 0: mouth (0.66, 0.30), needle-pinching fingers **(0.54, 0.58) = the S034 → S035 gesture match**,
  lamp (0.22, 0.43). Eyes at the top edge, in shadow.
- **Light:** the candle (state C) low in front of her and slightly beyond → lights the work and the lower face from below, the
  camera-side cheek in shadow; the lattice moon from the window behind the camera breaks over her shoulder; the warm open doorway
  glows soft in the background.
- **Timing:** last pull of the thread 0–0.22 s; the cuff lifts to her mouth and she bites the thread 0.2–0.64 s (peak at '红'
  118.87); the smile (head lifts) from 0.62 s; 1.17 s head turns ~15° toward the door; focus racks 1.47–1.98 s, lamp sharp at
  '谁的' 120.31.
- **Deviation:** the "shy smile at the corner of the mouth" can only be carried by the head lift (faceless figures).
- **Measured:** 2.91 s/frame at load 7.9 rising to 13 (max 6.11); ~1.6 s idle estimate.

### S041 — WS 32 mm: G3c glass hand-off → S019's composition, CH2 (135.417–138.167)
- 0–1.6 s: 15 cm push along S019's axis onto CAM19; a vitrine-glass plane 1.38 m ahead (dark velvet, the defocused warm case glow and
  violet stamp at ≈(0.60, 0.50), dust/smudges) fades out 0.3–1.6 s while focus racks from the glove's mirror plane to her. The
  gloved right hand (back to camera) at (0.36, 0.5), ≈ 25 % of frame height, self-lit warm by the case glow (no full-frame spotlight),
  fades by 1.2 s.
- Locked from 1.6 s ('无数' 137.04): S019's frame with heavy low cloud, the moon only a glow, damp stone, the niche lamp lit; she sits on
  the seat block turned toward the sea (screen right), face in shadow, the empty bowl on the step at her left (0.28, 0.80); one slow
  breath at 2.1 s.
- **Deviations:** no museum_gallery module exists yet, so S040's real end frame could not be compared; the glove's mirrored twin is
  barely visible. A bright band of thin cloud near the horizon remains (sky.js thins clouds below ~6° elevation).
- **Measured:** 2.88 s/frame at load 13.3 (max 4.87); ~1.2 s idle estimate.

### S042 — INSERT, 24 mm probe on the doorstep; the child's bare feet (138.167–139.875)
- Probe lens 11 cm above the step (4 cm above the rim, so it glimpses the glazed centre), solved: bowl rim large at left
  (≈(0.2, 0.65)), her mended shoe at right, damp stone between; dark doorway/wall behind with the door's warm spill.
- 139.02 '等': the child walks out of the doorway and settles between bowl and shoe by 1.12 s; 139.68 '雨' the toes wiggle. Focus between
  the rim and the feet, f/4.
- **Deviations:** (1) a cut-in cheat: her near shoe is placed beside the bowl (in S041 her feet are ~0.6 m further south); (2) at a probe
  height the child's lower legs are in frame up to the calf-length trousers (no hands, faces or bodies) — "nothing above the ankles"
  is not physically possible at this lens height.
- **Measured:** 1.64 s/frame at load 13.4 (max 3.44); ~1.55 s idle estimate.

## Named views (nested; no post — linear HDR straight into a pane; aspect-aware framing)
- **view_home_candle** — wife at the table by the candle (C), bowl before the empty bench; tall panes get a closer MS, wide ones the room.
  Lights a touch brighter than the graded shots (nested views get no exposure).
- **view_home_hand** — from the empty seat's eye height (S026: "the absent person's view"): candle soft upper left, the bowl of rice
  at right, her left hand with the bangle draws the crooked chopsticks straight across the bowl 0.3–0.9 s, a tiny nudge at 1.21 s, still
  from 2.70 s; her face a warm blur cut by the top edge (95 mm on tall panes). Loops every 3.67 s (S026's length). For this pane the bowl
  sits at the table centre so her arm can reach it.
- **view_home_rain** — CH3 under the eaves: low camera outside the drip line looking back at the niche lamp, so the drops are backlit
  (forward scattering); bowl large in the lower frame with the drop + crown + ripples into the centre blossom (207.07 s, then every
  1.35 s); she stands at the door and puts her LEFT palm (bangle) out under the drip line beside the bowl 206.95–209.3 s. Song time is
  used directly inside 204–214 s, otherwise a 4 s loop. Designed for a tall pane (wide panes get a wider lens).

## Performance
Measured at 1280x536. The box was shared with several other render agents for the whole session (1-min load 6-13 on 4 cores), so
the raw `render.mjs --range` numbers below are inflated. To get a fair figure, `out/check/old_home/oh_perf2.mjs` renders each shot
in-page (min of 3, JPEG encode included) against an empty-scene reference frame; render.mjs adds about 0.2 s/frame of readback and
transfer on top of that, which gives the "est. idle render.mjs" column. Clips from the range runs are in `out/check/old_home/perf/`.
Savings made: per-shot figure shadow casting (S016 hands only, because her body was in six candle cube-map passes while off frame; S035
hands only), no point-light shadows in S017's 640 px plates, exterior lights per shot (yard bounce only in CH1, lamp light off where it
is only a bokeh, no interior through the door in S042), and the S041 glove spotlight removed (it was evaluated on every pixel).

| shot | render.mjs --range, 24 f (s/frame, max) | 1-min load | in-page min-of-3 incl. JPEG | est. idle render.mjs |
|------|------------------------------------------|------------|-----------------------------|----------------------|
| S016 | 2.71 (max 4.08) | 6.4 | 1.00-1.16 | ~1.3 |
| S017 | 1.39 (max 2.36) | 10.7 | 0.83 | ~1.05 |
| S019 | 1.65 (max 2.71) | 7.6 | 0.98 | ~1.2 |
| S035 | 2.91 (max 6.11) | 7.9, rising to 13 | 1.34-1.41 | ~1.6 |
| S041 | 2.88 (max 4.87) | 13.3 | 0.93-1.00 | ~1.2 |
| S042 | 1.64 (max 3.44) | 13.4 | 1.36-1.37 | ~1.55 |

Scene build (first frame) took 21-52 s under that load. The estimates put every shot inside the 2.5 s worst case. S035 (~1.6 s) and
S042 (~1.55 s) sit just over the 1.5 s typical target; the main costs are the candle and lamp point-light shadows and the DOF gather.
Re-measure on an idle box before treating these as final.

## Known weaknesses
- Faceless figures: the "shy smile" (S035) and the "face never fully clear" locks are carried by head angle, shadow and focus only.
- S035's light-blue jacket under the lattice moon is the brightest area of the frame (the cloth is the patch cloth, #7D9CBB, by design).
- S041: the glove's mirror twin is faint; a bright thin-cloud band sits above the CH2 horizon.
- S042: the wife's shoe/skirt placement is a cut-in cheat; the child's shins are in frame.
- The restorer's reflection (S017) is additive, so her dark hair and coat vanish and the head reads a little bald.
- DBG_PANES only: rendering two different old_home views with the hi wife in one frame can drop her from the later one (order the rain
  view first). No consumer renders two old_home views in the same frame.
- Exterior shots are fairly dark by design (moonlit WS); the bowl in S019/S041 is a small glint at WS.
- S016: the empty bench is only a moonlit strip at frame right at the end of the move.
- S019: the registered eave line and door width cannot both hold from the locked CAM19 position (eave at top edge, door ~0.13 wide).
- All timings were taken under heavy shared load; S035 and S042 are estimated just over the 1.5 s typical target.

## Review (art director + DP pass) — IN PROGRESS
(Work log; the final Review section below supersedes this list.) Done so far: close-hand forearm stub 0.03 (bare "planks"),
view_home_hand finger pads on the chopsticks, S035 re-stage (inner-wall lamp niche, light, patch facing lens, needle hand
behind the work, camera registered on the work), S041 low-cloud sky patch + glove sleeve colour + round case glow, S042 probe
on the step + shoe/hem prop + child path + toes, S017 ghost via RT (coat occludes knit, hair), S019 squat pose.
Review harness: out/check/old_home/review/rv.mjs + rv_shots.json (RV_CAM setup), renders in out/check/old_home/review/r*/.
