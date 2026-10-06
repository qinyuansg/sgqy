# old_home — LOC_HOME, the navigator's granite house (17th c., era `home`, CT_HOME)

Module `scenes/old_home.js`. Shots **S016 S017 S019 S035 S041 S042**; named views for nested renders
**view_home_candle** (gallery G3b, S024/S025), **view_home_hand** (gallery S026), **view_home_rain** (corridor P2, S066).

This module was started by a colleague and finished in this session. The colleague's partial version is kept as
`out/check/old_home/old_home_colleague_backup.js`; its renders are in `out/check/old_home/t1…t7`, `sync/`, `dbg*/`.

Contact sheet (review: every shot at u 0.05 / 0.5 / 0.95 + the three views full-frame + DBG_PANES): `out/check/old_home/sheet.jpg`. Sync-point and cut-pair frames:
`out/check/old_home/sync2/` (`cuts.jpg`, `sync.jpg`). Timing runs + motion clips: `out/check/old_home/perf/`.
Debug setups (out/check/old_home/dbg_shots.json, `--shotsfile /previz/out/check/old_home/dbg_shots.json`): DBG_ROOM, DBG_TOP,
DBG_WIFE, DBG_HANDS, DBG_HEAD, DBG_EXT, DBG_PROBE, DBG_BOWL19 (S019 hand-on-rim close-up), DBG_HANDS35, DBG_S35TOP (S035
overview with a red cone at the camera), DBG_LAB, **DBG_PANES** (the three named views rendered into portrait RTs, linear HDR,
side by side — how a vitrine pane will see them).

## Set

### Interior (main room 5 × 4 m, x −2.5…2.5, z −2…2, floor y 0)
- Granite shell, smoke-darkened inner skins, purlins, square clay-tile floor. Camphor table (#3E2B1F) at the centre and two
  benches: **she sits on the screen-left bench (x −0.6) facing +X; the screen-right bench stays empty** (review: the empty bench
  stands at x +0.68, 8 cm further out than hers, so a dark gap of floor separates it from the table edge). An invisible moon-
  shadow caster under the table top stops the low lattice beam from floodlighting her skirt and knees.
- Cracked-ice lattice window (#3A2A1E) in the east (screen-right) wall: `FX.windowLight` with the `crackedIce` cookie. Its
  real shadow casters put the lattice pattern on the table, the empty bench, her shoulder. The moon direction is set per shot
  (MOON_16 / MOON_IN_A / MOON_IN_C / MOON_S35, and the S017 dissolve moves it by one cell).
- Candle `FX.candle` on a brass stick (#8C7350), states B (11 cm) → C (6 cm) per the director's ruling; extra pooled wax for C.
  The wax body no longer casts a shadow onto its own drip pan (a point light 1.5 cm above the wick painted the dish black).
- The bowl of cold rice: canonical `TX.bowlGeometry` + `porcelain_bowl` (side A to −Z = frame top), rebuilt rice texture
  (1024², three layers of 6–7 mm grains with contact shadows; dry, no steam), untouched bamboo chopsticks across the rim.
- Low stool + rattan sewing basket under the window, a stand for the sewing candle, shelf jars, water jar, hat, broom.
- The S035 lamp is a staging cheat (flagged in the shot list). Review: it is now a small recess in the INNER face of the west
  wall just south of the door (NICHE_IN, x −2.68, z 1.72–1.92, y 0.62–0.88, soot back), seen frontally from S035's camera and
  lit by the lamp's own short-reach light, so it reads as a lamp in a niche. The old cut in the door's south reveal was seen
  edge-on and read as a slit.

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
for the in-reflection dissolve. The restorer's faint reflection (mid RESTORER) is rendered normally into its own 800 × 334 RT with
the shot camera and added onto the glass as `ghostPlate` at mirror depth 6.2 m (alpha-tested, so DOF sees her depth). Review: the
old additive materials let her cream knit show through the charcoal coat and the hair vanish.

### Figures
WIFE hi (close-up hands swapped in: `loadCharacterHand('WIFE', …, {lod:'close', hand:{forearmLen:0.03}})`; the default 12 cm
forearm stub rode with the hand bone and stuck out of the sleeve as a bare-skin plank. Silver bangle on the LEFT wrist from the
figure accessory) and WIFE mid; CHILD hi (barefoot, calf-length trousers, five toe digits per foot added by the module; only the
feet and ankles are in frame); RESTORER mid (reflection, via RT) and two RESTORER close gloves (S041). S042's shoe + skirt hem
are a prop (`shoeG`), not the figure. Figure shadow casting is a per-shot switch (`figShadows('all'|'hands'|'none')`).

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
- **Review:** the bench now stands 8 cm further out, so a dark gap separates its moonlit top from the table; her folded hands are
  real folded hands (the close-hand forearm fix) at the left edge, still cut by it.
- **Measured (review):** 1.09 s/frame (max 1.33) at load 3.5 (before the review: 2.71 at load 6.4).

### S017 — MS 75 mm, locked, the lab's arched window as a mirror; in-reflection dissolve B → C (67.0–70.54)
- **Reflection:** the restorer's faint reflection is a TRUE mirror image now (the colleague's figure faced away — we saw her back):
  facing the lens, bowed over the reflected bench, warm from the lamp, at (0.62, 0.38), darker than the candle (bible 8.3-6).
- **Depth:** focus racks 0–0.8 s from her reflection (6 m) to the home plate (12 m); the muntins go soft.
- **Home:** wife on the left bench by the candle (≈(0.32, 0.5)), the candle flame at ≈(0.44, 0.47) (S018's light anchor (0.42,0.46)),
  bowl at the right of the table; 1.0–2.0 s cross-fade of two plates (candle 11 → 6 cm, the lattice one cell on); her shoulders rise
  and fall once, peaking at 2.6 s (69.6). Her face stays soft (640 px plate, glass waviness, short focus).
- **Deviation:** the empty bench is behind the restorer's reflection and barely reads.
- **Review:** her reflection is rendered through an RT (coat over the cream knit, dark hair with a lamp rim — no longer a pale
  bald ghost), opacity 0.2; the wife's head is turned 0.34 rad away from the lens so the candle only rims the cheek.
- **Measured (review):** 0.99 s/frame (max 1.62) at load 3.8 (before: 1.39 at load 10.7).

### S019 — WS 32 mm, locked, eye level; the bowl set on the step (73.458–75.04)
- Composition: sky in the upper right with the veiled moon at (0.80, 0.14) (orientation lock), the facade at left with the warm
  half-open door (x ≈ 0.12–0.25) and the dark, unlit niche at the left edge, the house corner at x ≈ 0.48, then the yard, the low wall
  and the moonlit sea. She crouches right of the door, face hidden, and sets the bowl on the step's outer edge at (0.30, 0.78).
- **Review:** re-posed as a real squat (thighs above horizontal, knees forward of the ankles, back ≈ 65°, head bowed over the bowl);
  the old pose folded the trunk ≈ 107° (head between the knees, hair hanging to the step). IK still hits the rim at contact.
- **Action:** a deep crouch so her right hand really reaches the rim (IK target hit exactly; checked in DBG_BOWL19): lowered 0–0.72 s,
  foot touches at 74.18 '等' with a tiny settle, fingers on the rim to 1.14 s, palm lifts ~8 cm at 74.60 '场雨' and holds.
- **Deviations:** the registered eave line at y 0.36 and door width 0.08–0.26 cannot both hold at this distance; the eave is at the top
  edge and the door is ≈ 0.13 wide. The camera is 1.31 m above the yard ("eye level", slightly low).
- **Measured (review):** 1.19 s/frame (max 1.82) at load 4.7 (before: 1.65 at load 7.6).

### S035 — CU 75 mm, locked; mending the patch, the bite, the shy smile, the glance, focus to the door lamp (118.33–121.25)
- **Prop rebuilt:** the navigator's indigo sleeve with the cuff turned back; on the turned band the pale-blue patch (4.5 × 6 cm,
  #7D9CBB, running stitches #E9E4D6, one uneven corner with the double knot), a thread from the knot to the needle until the bite.
- **Staging (review re-stage):** she sits on the low stool beside the table's south-east corner (S35 x 0.62, z 0.55 — moved
  0.2 m west / 0.65 m south so the locked 75 mm can stand back ~1.7 m), near-profile from her left, head bowed. The work is held
  under her face; the sleeve runs across the frame (screen left = the cuff end) and the turned band is rolled so the pale-blue
  patch with its white running stitches faces the lens. Her LEFT hand holds the sleeve from below on the camera side, the RIGHT
  hand pinches the needle just above the band's far edge (fingers up, wrist and wide sleeve hidden behind the cuff), so nothing
  covers the patch. Camera solved on the work (cuff centre (0.53, 0.62) = the S034 → S035 gesture match), the mouth (0.66, 0.30),
  the lamp (0.22, 0.44) and the eyes held at the top edge (only the lower face — 只露下半张脸). The 'mouth' reference point had
  been ~4 cm low (under the chin), which is why the face used to sit at the top edge cut through the nose.
- **Light (review):** the candle (state C) is low in front of her on the CAMERA side, below frame (key on the work and the lower
  face from below, eyes in shadow); a warm bounce fill from her lap (sewFill, unshadowed, 1.1 m reach) lights the patch, needle
  and fingers; the candle's reach is limited to 2.2 m so the table and the far wall stay dark; the lattice moon is a cool accent
  over her shoulder (moonI 0.42, was 1.15 — the pale-blue jacket had been the brightest area of the frame); the niche lamp lights
  its own little recess (NICHE_IN, see Set).
- **Timing:** last pull of the thread 0–0.22 s; the cuff lifts to her mouth and she bites the thread 0.2–0.64 s (peak at '红'
  118.87); the smile (head lifts) from 0.62 s; 1.17 s head turns ~15° toward the door; focus racks 1.47–1.98 s, lamp sharp at
  '谁的' 120.31.
- **Deviation:** the "shy smile at the corner of the mouth" can only be carried by the head lift (faceless figures). The thimble
  and the bangle sit under/inside the sleeve at this angle (not readable).
- **Measured (review):** 1.54 s/frame (max 2.11) at load 5.0 (before: 2.91 at load 7.9–13).

### S041 — WS 32 mm: G3c glass hand-off → S019's composition, CH2 (135.417–138.167)
- 0–1.6 s: 15 cm push along S019's axis onto CAM19; a vitrine-glass plane 1.38 m ahead (dark velvet, the defocused warm case glow and
  violet stamp at ≈(0.60, 0.50), dust/smudges) fades out 0.3–1.6 s while focus racks from the glove's mirror plane to her. The
  gloved right hand (back to camera) at (0.36, 0.5), ≈ 25 % of frame height, self-lit warm by the case glow (no full-frame spotlight),
  fades by 1.2 s.
- Locked from 1.6 s ('无数' 137.04): S019's frame with heavy low cloud, the moon only a glow, damp stone, the niche lamp lit; she sits on
  the seat block turned toward the sea (screen right), face in shadow, the empty bowl on the step at her left (0.28, 0.80); one slow
  breath at 2.1 s.
- **Deviations:** no museum_gallery module exists yet, so S040's real end frame could not be compared; the glove's mirrored twin is
  barely visible. (The bright band of thin cloud above the horizon is fixed — see Review: module-local sky/sea shader patch
  `uLowCloud`, the CH2/CH3 deck runs to the horizon, the moon is a diffuse glow inside it, no disc.) Review also: the glove's coat
  sleeve is charcoal again (it shared the glove's warm emissive and read orange-brown) and the case glow is a soft round bokeh
  (it was a 3.6:1 horizontal streak that read as a lens flare).
- **Measured (review):** 1.05 s/frame (max 1.16) at load 5.3 (before: 2.88 at load 13.3).

### S042 — INSERT, 24 mm probe on the doorstep; the child's bare feet (138.167–139.875)
- **Review re-stage.** The probe sits ON the step, 4.5 cm up, beside the bowl at the outer edge (S42.pos (−3.645, −0.135, 2.24)),
  looking in at the dark doorway (yaw 30.2°, 4.2° down). Bowl large at left (≈ 0.0–0.42 of the width; side B's cracked-ice window
  and the plum rim band toward the lens), her mended cloth shoe (prop: black cloth upper with a darned patch, layered cotton sole)
  and the dark indigo skirt hem at right, damp stone between. The frame top cuts the child's legs ~12 cm above the step: only bare
  feet, ankles and a little shin (bible §10-8). The old probe (11 cm up, beyond the step edge, figure slid next to the bowl) showed
  the child's whole lower legs and trousers, the child standing in the doorway at frame 0, and the wife's seated figure hovering
  in front of the seat block with bare shin above the shoe.
- **Action:** the child stands just inside the door behind the jamb, steps onto the threshold 0.15–0.55 s, down onto the step
  0.55–0.73 s (the feet enter at the TOP of frame out of the doorway at ≈ 0.79–0.83 s, '等' 139.02), two trotting steps to the spot
  between bowl and shoe, settled facing the lens by 1.15 s (stance slightly pigeon-toed); 1.5 s ('雨' 139.68) the toes curl and
  wiggle — five sculpted toe digits per foot (the kit's barefoot feet are toe-less). Focus 0.37 m (between rim and feet), f/4.
- **Deviation:** the shoe is a cut-in cheat (in S041 her feet are ~0.3–0.6 m further south); the bowl's glazed centre is not
  visible from 4.5 cm (the keyframe's "glimpse of the blossom" and "4 cm above the step" exclude each other — the step height won).
- **Measured (review):** 1.46 s/frame (max 2.23) at load 4.0 (before: 1.64 at load 13.4).

## Named views (nested; no post — linear HDR straight into a pane; aspect-aware framing)
- **view_home_candle** — wife at the table by the candle (C), bowl before the empty bench; tall panes get a closer MS, wide ones the room.
  Lights a touch brighter than the graded shots (nested views get no exposure). Review: nested views get no DOF, so the face is
  kept unresolved by light — the candle sits on the far side of her profile (烛光侧逆), her head is turned 0.34 rad away from the
  lens, the lattice moon (MOON_16, moonI 5.5) falls on the bowl's half of the table and the empty bench instead of her face; the
  under-table blocker stops the beam lighting her skirt and knees (a bright blue blob in tall panes).
- **view_home_hand** — from the empty seat's eye height (S026: "the absent person's view"): candle soft upper left, the bowl of rice
  at right, her left hand with the bangle draws the crooked chopsticks straight across the bowl 0.3–0.9 s, a tiny nudge at 1.21 s, still
  from 2.70 s; her face a warm blur cut by the top edge (95 mm on tall panes). Loops every 3.67 s (S026's length). For this pane the bowl
  sits at the table centre so her arm can reach it. Review: the wrist is solved (3 iterations) so the index + middle finger PADS rest
  on top of the pair (≈ 1 cm); before, the curled fingers hung down the bowl's side below the chopsticks. The bare-forearm "plank"
  of the resting right arm is gone (close-hand forearm fix).
- **view_home_rain** — CH3 at the door in the rain. Review re-stage: the camera is low in the yard WEST of the facade, looking in at
  the door and the niche lamp, so the lamp is behind the eave drips and the drop into the bowl (forward scatter); she stands in front
  of the door (no longer between the lens and the lamp) and holds her LEFT palm (bangle) out to her side under the drip line,
  206.95–209.3 s (fingers across the view — pointing at the low lens they read as a wave); the bowl with the drop + crown + ripples
  (207.07 s, then every 1.35 s) on the step edge at right. Framings are SOLVED for a tall pane (aspect 0.85, 30 mm: lamp (0.24, 0.30),
  palm (0.52, 0.42), bowl (0.70, 0.78)) and a wide one (2.39, 26 mm). The old camera looked at the door from the south with the lamp
  out of frame on wide panes and the drops unlit. Song time is used directly inside 204–214 s, otherwise a 4 s loop. The bowl is
  small in the pane (lamp, woman, rain and bowl must share it).

## Performance
Review re-measure (after all review fixes), 1280x536, `render.mjs --range` 24 frames per shot (mean after the first frame, incl. the
mp4 encode), one shot after the other while one other agent was rendering (1-min load 3.5–5.3 on 4 cores, i.e. about 1–1.3 cores
busy besides ours). Script + clips: `out/check/old_home/review/perf/` (`run.sh`, `timing.txt`, `S0xx.mp4`). The in-page min-of-3
(`oh_perf2.mjs`, JPEG included, same load) is given as the second column; its "×EMPTY → est idle" column is NOT used any more —
the EMPTY reference now renders in 0.15 s instead of the 0.34 s it was calibrated for, which inflates the estimate.

| shot | render.mjs --range, 24 f: mean (max) s/frame | 1-min load | in-page min-of-3 incl. JPEG | before review (range, load) |
|------|-----------------------------------------------|------------|-----------------------------|-----------------------------|
| S016 | **1.09** (1.33) | 3.5 | 0.98 | 2.71 @ 6.4 |
| S017 | **0.99** (1.62) | 3.8 | 0.78 | 1.39 @ 10.7 |
| S019 | **1.19** (1.82) | 4.7 | 0.94 | 1.65 @ 7.6 |
| S035 | **1.54** (2.11) | 5.0 | 1.22 | 2.91 @ 7.9–13 |
| S041 | **1.05** (1.16) | 5.3 | 0.87 | 2.88 @ 13.3 |
| S042 | **1.46** (2.23) | 4.0 | 1.25 | 1.64 @ 13.4 |

Every shot is inside the 2.5 s worst case (max 2.23 s) and at or under the 1.5 s typical target even with another render running;
S035 (1.54) sits on it — its costs are the close hi figure, three small unshadowed point lights (candle, lap fill, niche lamp), the
shadowed lattice moon and the DOF gather. Review cost changes: S017 +1 RT render of the reflection (800 × 334, mid figure); S035
candle shadow already off, + sewFill + niche lamp light (short `distance`); S042 −1 figure (the seated wife replaced by the shoe/hem
prop), + 10 toe meshes. Scene build (first frame) 21–24 s.

## Known weaknesses
- Faceless figures: the "shy smile" (S035) and the "face never fully clear" locks are carried by head angle, shadow and focus only.
  In S035 the lower face (nose, lips, chin) is fully visible by design (只露下半张脸); the eyes sit at the top edge in shadow.
- S035: the thimble and the silver bangle are inside / under the wide sleeve at this angle and do not read; the patch reads as a
  muted grey-blue under the warm light (it is #7D9CBB, the jacket cloth).
- S041: the glove's mirror twin is faint (physically mostly hidden behind the glove at near-normal incidence); a thin bright line
  remains exactly at the sea horizon under the CH2 deck.
- S042: the shoe is a cut-in cheat (prop) and the skirt hem is a large dark mass top-right that hides most of the doorway; the
  bowl's glazed centre is not visible from a 4.5 cm probe.
- S016: the empty bench is still only a moonlit strip at the right edge at the end of the move, the folded hands are cut by the left
  edge and read warm-orange (candle 0.3 m away, out of focus).
- S017: the wife's moonlit profile is soft but readable at the 640 px plate; the restorer's reflection sits over the empty bench.
- view_home_rain: the bowl (with the drop, crown and ripples) is small in the pane — lamp, woman, rain and bowl share one framing.
- view_home_hand: her resting right forearm reads as a pale tube from the wide sleeve at the candle.
- DBG_PANES only: rendering two different old_home views with the hi wife in one frame can drop her from the later one (order the
  rain view first). No consumer renders two old_home views in the same frame.
- Exterior shots are fairly dark by design (moonlit WS); the bowl in S019/S041 is a small glint at WS.
- S019: the registered eave line and door width cannot both hold from the locked CAM19 position (eave at top edge, door ~0.13 wide).
- No museum_gallery or corridor module exists yet, so S040 → S041 and the nested panes could not be checked in their consumers.

## Review (art director + DP pass)
Reviewer pass over all six shots and three views: every shot re-rendered at u 0.05/0.5/0.95 and at every sync-point frame, the
neighbours' adjoining frames rendered beside them (S015|S016, S017|S018, S018|S019, S019|S020, S034|S035, S035|S036, S040(slate)|S041,
S042|S043), the views full-frame and as portrait panes (DBG_PANES), debug angles of every pose/prop contact, 6–7 consecutive frames
(S017 1650–1655, S035 2862–2867, S042 3330–3336: frame-to-frame MAE ≈ 0.8–1.3 % = grain only, mean luminance stable to ±0.3/255,
no flicker, no black frames, no NaNs), and `node --check`. Renders: `out/check/old_home/review/r1` (before) … `r6` + `final/`.
Harness: `out/check/old_home/review/rv.mjs` + `rv_shots.json` with the module's new `RV_CAM` setup (run any setup at any tl, then
re-aim the camera / add fill / change exposure via URL params) — debug only, no consumer uses it.

### Found and fixed
1. **Close-up hands: bare-skin "planks" (S016, S035, all three views).** The kit's close hand carries a 12 cm forearm stub that rides
   with the HAND bone; swapped onto the figure, any bent wrist pushed it out of the sleeve at the hand's angle (S016's folded hands
   read as an orange upright stick, view_home_hand had a plank across the candle). → `hand: { forearmLen: 0.03 }` (the figure's own
   stub). Logged in lib/ISSUES.md.
2. **view_home_hand: fingers not on the chopsticks.** The curled 'touch' fingers hung down the bowl's side below the pair. → the wrist
   is solved (3 iterations) so the index + middle pads rest on top of the chopsticks (≈ 1 cm).
3. **S035 re-staged and relit** (it was the weakest shot: the moonlit pale-blue jacket was the brightest, largest area; the patch
   sat dark under the right hand; a warm-lit table read as a glowing door frame; the lamp was a slit in the door reveal; the face
   was cut through the nose because the 'mouth' reference point was 4 cm low). → she sits 0.2 m west / 0.65 m south so the 75 mm can
   stand back; the patch is rolled to face the lens with its stitches; the needle hand pinches from behind the work; the candle is low
   on the camera side + a warm lap-bounce fill; candle reach 2.2 m; moon 1.15 → 0.42; a new frontal lamp niche in the inner west wall
   (lit by the lamp's own short light); camera solved on the work, mouth, lamp and eye line. Gesture match on S034's hands kept.
   Sync: bite at '红' 118.87, glance 119.5, rack 119.8 → lamp sharp at '谁的' 120.31 (all verified).
4. **S041 sky: bright band above the CH2 horizon + visible moon disc.** → module-local patch of the sky + sea shaders (`uLowCloud`, CH2/
   CH3 only; CH1 / the S018 → S019 plate untouched); cloudDensity 0.86 → 0.95, the moon a diffuse in-cloud glow. Logged in ISSUES.md.
5. **S041 frame 0: orange coat sleeve, horizontal "lens flare".** The charcoal sleeve shared the glove's warm emissive → neutral; the
   case glow / violet stamp are now soft round bokeh.
6. **S042 broke the child lock and showed a hovering figure.** → probe ON the step at 4.5 cm, tilted 4° down toward the dark doorway;
   only feet, ankles and a little shin in frame; the child comes out from behind the jamb and steps down into frame from the top at
   '等' (feet visible from ≈ 0.79 s), settles facing the lens by 1.15 s; sculpted toe digits curl and wiggle at '雨'; the wife's seated
   figure replaced by a shoe (darned toe, layered sole) + hem prop.
7. **S017 reflection: pale bald ghost.** Additive materials let the cream knit show through the coat and the dark hair add nothing. →
   she is rendered normally into an RT and added onto the glass (coat occludes knit, hair reads with a lamp rim), opacity 0.2,
   still darker than the candle (bible 8.3-6). The wife's head turns 0.34 rad away from the lens (face stays unresolved).
8. **S019: doubled-over pose.** Trunk folded ≈ 107°, head between the knees. → a real squat, head bowed over the bowl; rim contact at
   '等' and the lift at '场雨' re-verified with IK logs (target hit to < 3 mm).
9. **S016 '失' reveal: the empty bench read as part of the table.** → the empty bench stands 8 cm further out (dark gap of floor);
   the end framing re-solves itself from the posed figure.
10. **view_home_candle: face lit like a portrait, blue moon blob on her knees.** → candle on the far side of her profile, head turned,
   the lattice moon onto the empty bench / bowl side; an invisible moon-shadow caster under the table top.
11. **view_home_rain: lamp out of frame (wide), drops unlit, the wife between lens and lamp, the palm-out read as a wave.** → camera
   low in the yard west of the facade looking at the door + niche lamp (drops backlit), she stands in front of the door, palm held
   out to her side under the drip line; framings solved for a tall (0.85) and a wide (2.39) pane.

### Checked and kept
- S015 → S016 rim-circle match (same centre / size; the halo on the rim at frame 0 is the defocused candle-lit outer wall), S018 →
  S019 sky plate (CH1 unchanged by the sky patch), S017's last candle point (0.45, 0.48) → S018's lit lab window (0.43, 0.48), S019's
  lifted right hand → S020's descending hand (lower-middle region), S034's closing fingers → S035's work (0.53–0.55, 0.58–0.62).
- Candle states (B 11 cm in S016 and S017's first plate, C 6 cm after the in-reflection dissolve, C in view_home_candle/hand; never a
  fresh stub on the table), cold rice without steam, the bangle on the LEFT wrist, the bowl pattern (side A boat to 12 o'clock in
  S016; side B's cracked-ice window toward the S042 probe), weather locks CH1 dry / CH2 damp + heavy cloud / CH3 rain.
- Performance: see the table above (all ≤ 1.54 s mean, ≤ 2.23 s max under load).

## Integration fixes (whole-film QA, 2026-10-06)

Survey: `out/fix_restoration_lab_old_home_map_office/` (`shots/S016.jpg` …, `cuts/S015-S016.jpg` …); working renders in
`out/fix_rl_oh_mo_wip/oh1`–`oh5`. Director for this group: S016 must reveal the EMPTY bench across the table; in S017 the
restorer's reflection must NOT sit on the empty seat — the point is waiting.

| finding | fix |
|---|---|
| **S017 blocker** — the restorer's reflection sat exactly on the empty bench (a second person opposite her) | Her reflection moved to the **upper right (head ≈ (0.80, 0.30))**, nearer the glass (`GHOST_D` 6.2 → 4.4 m: head ≈ 25 % of frame height, larger than the home figures), just left of the right muntin; only **head + shoulder** read (the ghost plate gets an alpha gradient that fades her body out below the shoulder line), a warm 3500 K rim from behind-left (`ghostKey`), face dark; opacity 0.42, still under the candle; S017's exposure +0.2 stop (the S016 → S017 step was ≈ 1 stop). The home plate is pushed in (40 → 50 mm, `HOME17` solved: candle flame on S018's anchor (0.44, 0.47), the empty bench at (0.68, 0.70)) so the wife is large enough for the 69.6 s breath to read, and the lattice moon in the plate falls on the **empty bench + bowl** (MOON_16 / MOON_16C) instead of her. |
| **S016** — '失' never revealed the empty bench; the wife's hands read as an orange wooden manikin hand | The end framing is re-solved (`C16.b`, wider grid, ≈ 47° down as the shot list writes, was 60°): measured rim (0.57, 0.40), flame (0.32, 0.33), the **empty bench's moonlit seat from x ≈ 0.78 to 0.93** at the right with the lattice on it, her hands are solved just off the left edge (a sliver of the sleeve remains) — the QA's option "crop the hands out and let S017 introduce her". Focus now travels from the rim to the **empty bench** (shot list) at f/2.2, so her hands are soft; their skin is toned for this shot only (`handTone`: 45 % desaturated, −25 %). Frame 0 uses S015's new 24° tilt; bloom 0.28 / 0.98 so the rim glaze no longer blooms into a steel halo. |
| **S019** — the woman ≈ 12 % of frame height, bowl a speck, door jamb an orange neon outline | `CAM19` dollied in along the bowl's own ray (6.5 → 3.6 m; same orientation, so the moon/sky lock with S018 holds and the bowl stays at (0.30, 0.78)): she is ≈ 40 % of frame height, the bowl ≈ 4 % of the width with her hand on its rim at 74.18 and lifting at 74.6 in the lower-middle region (S020 hand-off). The door spill is a lower, softer candle light on the threshold and step (`doorGlow` 1.6 → 0.95 at y 0.42), the room card behind the door at half strength — no neon jambs. |
| **S035** — the cuff read as a black basket-weave purse, front-lit lower face, no glance | The cuff is soft indigo cotton (fine weave ×7, lighter dye, a sagging creased tube instead of a rigid cylinder), the patch with its white running stitches faces the lens, needle thicker with a warm glint, thimble brighter brass. The candle moved **side-back at frame right** (beyond her, toward the window): only the mouth corner, chin and cheek edge catch it, the camera-side face is in shadow; the lap fill keeps the work readable (0.15). At 119.5 the head turns ≈ 24° toward the door at frame left and lifts with it, then the rack to the niche lamp (sharp at 120.31) as before. |
| **S040→S041** (two findings) — 2.7–3.8× scale pop on the glove | S041 now **opens on S040's last framing**: the glove (back of the right hand, fingers up) ≈ 75 % of frame height at (0.38, 0.57), 0.55 m from the lens, the soft warm permit-card glow behind it; 0.5–1.3 s focus passes through it into the reflection while it drifts soft off the bottom-left and fades (the mirror twin is off); the case glow behind is 2 stops down and off-centre so the eaves read by 135.48. |
| **S041** — flat featureless grey cloud plane, bowl a speck, she sits on a dark block | CH2 deck has structure (cover 0.82, scale 0.1, darker bellies #0d111b, lit edges #74809c round the moon glow); the step is wet (roughness 0.34); the niche lamp's spill reaches the bowl (0.6); the bowl is larger via the new CAM19; she is turned toward the sea at screen right and a little away from the lens (yaw +0.2; was −0.45, which turned her face to the camera), so her face reads as a profile in shadow. |
| **S042** — a foot slides in at mid-height, shins like pillars, toes poke through the sole | The probe tilts 9.5° down (was 4.2°): only feet, ankles and a hand's width of shin. The step down is from ABOVE: the foot crosses the threshold out of frame, then drops and lands heel first ≈ (0.50, 0.70) on '等' 139.02. The toe digits sit +2 mm on the stone and the '雨' wiggle is a 3–4 mm curl **up**. |
| Grain | home **0.040** everywhere (S041 no longer ramps 0.035 → 0.04); nested views get no grain. |

**Not fixed / deviations**
- S042: the bowl's rim band is the library porcelain texture (`TX.porcelain`), whose 1 cm band reads as separate blossoms at the
  probe's distance — a lib-side fix (a continuous branch) is needed; logged here, not in my files.
- S041: the seat is still the granite block on the step (re-staging her on the step edge would break the S019/S041 composition
  lock and the S042 shoe cut-in); it now shares the wet step's sheen.
- S019: the sky is the module's own CH1 sky (moon locked to S018 via `CAM19_REF`); no extra −0.3 stop grade was applied because
  the S018 end frame changed in the harbor_eras pass — checked on the cut pair instead.
- S016: the bowl lands at (0.57, 0.40) rather than the QA's (0.65, 0.55) — the solver trades it for the bench reveal and the hands.

Debug knobs added: `ohdbg` (prints the solved S016 end framing), `ohd19` (CAM19 distance), `oh42p` (S042 probe pitch),
`oh35b`/`oh35r` (S035 candle offsets).

**Measured after the integration fixes** (1280×536, `out/check/map_office/mo_render.mjs`, 3 frames per shot at u ≈ 0.25/0.5/0.75, mean of the frames after each shot's first (shader compile), shared 4-core box, 1-min load ≈ 3–4):

| shot | s/frame |
|---|---|
| S016 | 1.65 |
| S017 | 1.00 |
| S019 | 2.00 |
| S035 | 1.70 |
| S041 | 1.45 |
| S042 | 1.57 |

All within the 2.5 s cap.
