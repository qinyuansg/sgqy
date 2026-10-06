# night_window — the east window bay (present day, ~04:00 → dawn)

Module: `scenes/night_window.js`. Shots: **S059 S060** (the guard alone, the phone) · **S062 S063 S064 S065** (the tea, the
two-shot, the hands, the nod) · **S072 S073 S074** (the call) · **S077** (the refill at first light) · **S079** (from behind,
dawn) · **S081** (the two cups — the last shot of the film). Named view for nested renders: **`view_bay_back`**.

Contact sheet (all shots at u=0.5 + view_bay_back at T 208 s; regenerated after the review): `out/check/night_window/sheet.jpg`. Other checks:
`out/check/night_window/r3/` (u 0.15/0.5/0.9), `sync/` (the exact sync-point frames), `cuts/` (S076→S077, S080→S081),
`view/` (view_bay_back at 640 px, four story times), `clips/` (24-frame motion clips + `timing.txt`).
The previous colleague's partial file is kept for reference at `out/check/night_window/backup_colleague_night_window.js`.

## Set (shared by all shots)

World: metres, Y up, +X east, +Z south (sky.js azimuths are compass bearings). The corridor's glazed screen is x = 0; a
2.4 m room, then the canted bay (bible: 1.6 m deep, 4.2 m wide, NE / E / SE at 45°) to the east pane at x = 4.0
(1.0 m wide, centre mullion at z = 0, corner posts at z = ±0.5).

- **Window bay:** old-white timber frames (`#E3DED3`), lower clear lites + upper wavy cylinder-glass lites with glazing
  bars, 24 cm painted sill (y 0.72) running around all three faces, plaster aprons and headers, coffered ceiling stub.
- **Bench:** built-in teak (`#6A4A32`) trapezoid following the canted walls, x 3.00–3.46, thin grey cushion, seat 0.45.
  It sits 0.40 m in front of the apron (leg room); the colleague's bench was 0.10 m from the sill, which put his lap — and
  the face-down phone — *under* the sill overhang.
- **Seating (bible lock):** GUARD on the south half (z +0.31, near the SE window, screen-right in BAY_3Q), RESTORER on the
  north half (z −0.31), both turned ~10–19° toward the SE window (where the dawn comes from).
- **Reading lamp:** 2700 K floor lamp in the bay's NE corner, arched arm, linen shade, emissive bulb + glow; it is the night
  key (a SpotLight, the one shadow caster at night).
- **Props:** two lathe cups (Ø 8.2 cm, h 6.8 cm, celadon-white glaze `#E6ECEC`, one complete cobalt line 6 mm below the
  rim, P30 jasmine tea + a leaf; his has a rim chip, turned per shot to the viewer's 2 o'clock); steam (`FX.steam`, two
  independent plumes, softened: 30 wisps, low opacity); the dented dull-steel thermos with a scuffed navy cup-lid
  (unscrews, pours a tea stream); the old phone in a worn navy flip case with a cracked corner, blurred unreadable UI,
  screen glow + a small 6500 K point light; the folded warm-white gloves; his reading glasses on the face (S059–S060) or
  hanging on the cord (library accessory, from 190.6 on).
- **Cup placement:** on the east sill between them, a little toward him — his at z +0.105, hers at z −0.037 (14.2 cm
  centre to centre = 6 cm gap; his screen-right in every angle). See *Deviations* for why they are not further north.
- **Exterior:** sky dome (night → predawn → dawn blend keyed to the bible §2.3 table), calm sea with lamp reflections,
  two coasts, breakwater with the harbour-mouth light (slow blink), four anchored ships, container cranes, a quay to the
  south, ~80 harbour light points; the four "fishing lamps" (P13) stay lit at dawn while the others go out (S079–S081).
- **Glass:** custom shader: Fresnel reflection of a static cube capture of the lamp-lit room (fades as the sky brightens),
  wavy normals in the upper lites; S081 adds the reflection layer (below).

### Performance architecture
- The exterior (dome, sea, coasts, silhouettes) is ≥ 400 m away, so a sub-metre camera move gives it no parallax. It is
  rendered **every frame with the shot camera** into a reduced-resolution HDR target (`extRT`: 0.5× by default, 0.75× for
  the wide/dawn shots S079/S081) and drawn as a full-screen background quad without depth write (the DOF treats it as
  infinitely far, which is what it is). The harbour light points stay in the main scene (crisp, depth-tested).
  This alone took the module from 2.5 s to ~1.0 s per frame.
- ~~Film grain is drawn by the module~~ — superseded: the engine's fixed integer-hash grain at 0.035 (see *Integration fixes*).
- **One shadow light per shot:** the lamp at night; the window light at dawn (S077, S079, S081). The cube reflection is
  captured once in `create()`.
- S064 hides the full figures and uses three `loadCharacterHand(...,{lod:'close'})` hands with added sleeves.
- S081 hides the figures in the direct view and renders them once per frame into a 512×384 reflection target
  (layer-filtered: figures + lights only, no shadow pass).

## Per shot

(Pre-review numbers below; the current table is in **Review → Timing** at the end.) Timing = `render.mjs --range` over 24 frames, mean s/frame after the first (scene build), with the machine load at the
time (other agents render on the same 4 cores; at load ~10 the same frames are 2–3× slower than idle). Where the run
happened under load, the standalone `tools/bench.mjs` figure (lower load) is given too.

| shot | frames measured | load (1-min) | mean s/frame | max s/frame | notes |
|---|---|---|---|---|---|
| S059 | 4480–4503 | 6.0 | 1.23 | 2.25 | hi GUARD, lamp shadow, DOF |
| S060 | 4540–4563 | 7.4 | 0.82 | 0.98 | 100 mm CU, phone light |
| S062 | 4700–4723 | 5.2 | 1.32 | 1.63 | 2 hi figures walking/leaning, dolly |
| S063 | 4777–4800 | 6.4 | 1.81 | 2.59 | 2 hi figures, lamp shadow, DOF f/5.6; `tools/bench.mjs` at lower load: 0.8–1.0 |
| S064 | 4830–4853 | 8.6 | 1.63 | 1.86 | 3 close-up hands + sleeves, lamp shadow, DOF |
| S065 | 4875–4898 | 8.5 | 1.33 | 2.22 | 2 hi figures at MCU |
| S072 | 5450–5473 | 8.0 | 0.88 | 0.96 | |
| S073 | 5505–5528 | 5.6 | 1.03 | 1.44 | |
| S074 | 5560–5583 | 5.5 | 1.28 | 1.75 | |
| S077 | 5715–5738 | 6.2 | 1.22 | 1.86 | window-light shadow, thermos + stream |
| S079 | 5850–5873 | 7.4 | 1.14 | 1.54 | exterior at 0.75×, no DOF |
| S081 | 6080–6103 | 8.8 | 1.36 | 2.33 | reflection pass (2 hi figures at 512×384), ray shaft, DOF |
| view_bay_back | nested at 640 px | — | 0.89 (as a 640-px still) | 1.70 | no shadow pass, exterior 0.5× |

Mean of the twelve under load 5–9: **≈1.25 s/frame**. Feature costs measured with `?nw=` probes on S063/S060 (standalone,
lower load): the two figures ≈0.3 s, the glass panes ≈0.15 s, FXAA ≈0.2 s, the lamp shadow ≈0 (within noise). Before the
exterior split the colleague's version ran at 2.47 s/frame mean (max 5.3 s) on the same frames.

### S059 — MCU 75 mm, MATCH CUT from S058 (186.09), phone glow at 187.3
- Camera from his right rear 45° (bearing 244°, he faces ~109°), 3.1 m, slightly high; the **shoulder midpoint is
  registered at (0.665, 0.50)**, shoulder width ≈ 0.27–0.30 of frame (S058 end: back at (0.66,0.50), shoulder top
  y≈0.33, width ≈0.31 — re-checked side by side in review, `out/check/night_window/rvz/cuts2.jpg`).
- The cool blue-hour light on his navy back (a moon-from-the-corridor spot behind the camera) rhymes with the cool
  light on the mother's shoulders at the end of S058; the coloured petals there → the phone's cold glow here.
- 0.42–1.02 s the left hand goes to the glasses; 1.21 s the phone wakes (6 frames) on his lap, he leans in a little.
- (review) Two warm points in the panes ahead: moored-boat lamps 60–80 m out to the NE (this lens looks ENE, ~10° down,
  so the horizon lights are above the frame); a second cluster toward the harbour mouth serves the other night angles.
- Deviation: the thermos at his right hip is out of the MCU frame (it is in S062/S077/S079 and view_bay_back).

### S060 — CU 100 mm over his right shoulder, thumb hovers / withdraws, phone face down, the light dies at 190.6
- (review rebuild) He holds the phone up at reading height (reading glasses on), in **portrait** in his right hand: the
  phone's long axis along the thumb axis, the fingers wrapping its far long edge, the screen toward his eyes, the thumb free
  above it. (The old hold laid his fingers across the screen.) Camera root-space (−0.42, 1.50, −0.62) behind/above his right
  shoulder, ~20 cm push over 2.0 s; that sightline clears the sill, so the dark window is behind the phone instead of the
  lamp-lit apron; his head/shoulder soft in the left foreground, the glasses' rim at the edge.
- 0.30–0.50 s the thumb rises over the screen (188.71) with a tremor; 1.82 s it draws back (190.03); 2.0–2.36 s the phone
  turns face down onto his right thigh — it leaves the frame at the bottom — and the glow dies at 2.31–2.39 (190.6); he
  sits back a little (lean 0.46 → 0.24); 2.38–2.85 his left hand rises for the glasses (they reappear on the cord).
- The frame holds on the darkness: the dark window, the warm sill line, his shoulder edge. (Following the phone down onto the
  thigh was tried at several camera heights: from behind, under the lamp in front of him, his lap is a black silhouette and
  his shoulder/forearm covers it; the end frames rendered black.)
- Deviation: the end frame does not show the phone lying on the thigh (shot list end frame) — it shows the darkness it leaves.

### S062 — "伸出": she enters from screen-left with two cups and sets his on the sill (195.57 / 197.15)
- BAY_3Q camera from the bay mouth's south-west looking NNE along the bench, **40 mm** (see Deviations), dolly ~0.36 m
  L→R over 2.0 s with an ease-out; she walks in from screen-left under a cool edge from the moonlit corridor behind her
  (last strides, the folded gloves wrapped round the left cup under her thumb, a cup in each hand).
- (review) She puts her right knee on HER OWN seat, faces the window (not him) and leans ~36°; her extended right arm takes
  his cup forward at shoulder height on her side of him (195.57) and sets it down gently on the sill (197.15), then eases
  off. (Before: a 56° lean across him, turned toward him, the cup arcing high over his head — it read as reaching for him.)
  He turns his head a little toward her at 1.5–2.1 s. Steam continuous, backlit by the lamp. The frame is tilted up a touch
  so the lamp shade sits inside the top edge.
- Knee-on-bench: from behind a backless bench the sill is out of reach standing; the kneel brings her shoulder within reach
  (shoulder → grip 0.68 m at the placement: a fully extended arm).

### S063 — the quiet two-shot: her cup (197.45), she sits on the band entry (198.22), button (199.3), shoulders (200.15)
- Same set-up as S062's end, locked. Frame 0 = S062's last pose (shared `restKneel()`), her right hand travels back from
  his cup to her lap. 0.03–0.33 s her cup goes down 6 cm left of his; 0.33–0.55 the gloves go to the bench's north corner;
  0.55–0.80 she steps over the low bench and sits — seated on 198.22; 1.62–1.88 her right hand goes to the coat's middle
  button; 2.1 his eyes go to the cup; 2.62–2.95 both shoulders drop with an out-breath. Cups and steam read right of him.
- Weakness: the coat cannot actually open (garments are built closed); the button is the hand gesture only. The step-over
  sit is a fast blend (6 frames) with one twisted in-between frame.

### S064 — INSERT 100 mm: his hands lift the chipped cup; her bare left hand and the worn left cuff (registered)
- (review rebuild) Camera from the NW between/behind them (bearing 312° from the cups' midpoint, 1.75 m, 0.36 m above the
  sill: slightly high), the dark E pane and its flagged-dark centre mullion behind the cups. **The worn spot is aimed at
  exactly (0.42, 0.62)**; her cup lands at (0.56, 0.40), his at (0.72, 0.33) — close to the keyframe (0.52 / 0.70).
- Her bare LEFT hand rests **palm up** beside her cup, the forearm laid along the sill from her side (north), fingers
  softly curled toward the cup. Palm up is what turns the little-finger side of the cuff — the worn spot — toward a camera
  on their side; palm down it faces north, away from any lens on the room side. The cuff is lit by the lamp's light off
  the white sill (a low warm kick) so the dark melton and the lighter worn spot separate.
- His two hands cradle the chipped cup from his side (palms on either side, fingers wrapping forward; no hand under a cup
  that stands on the sill — the old left palm lay flat on the sill under it), close 0–0.42 s (200.67), lift a little and
  travel back toward his lap, out of frame low right, 0.42–1.95 s; a steam trail lingers (202.29 steam over the top edge).
  The focus breathes from his hands to her cuff at 0.6–0.93 s (201.6).
- The sleeve tubes added to the library close-up hands now start inside the cuff stub and share its elliptical section
  (the round tube cut visible notches through the stub).

### S065 — close two-shot, no glass: he looks up (202.9), she nods (203.5), both exhale (203.9)
- 75 mm from his right rear (camera 8° more frontal than before), eyes ≈ (0.72,0.51) and (0.31,0.39): she is turned to him,
  her face 3/4 to the lens, and her nod is the face the lens gets.
- (review) His look up is now a **chin lift** (head from bowed to upright, lean 0.40 → 0.30) with a small turn toward her:
  the full turn took his face entirely away from this lens. Nod ~0.4 s real speed; joint out-breath at 1.19; stillness.
  His cup's steam (in his lap, close to the lens) is a thin wisp instead of a bright cloud.
- With the bench lock (both face the window, he screen-right) his face can only turn *away* from a camera on his side; a
  camera behind them would make S065 the same angle as S066's reverse (the cut S065 → S066 is front → back).

### S072 — the call (cold tea, no steam): phone rises (226.32), thumb press (226.98), at the right ear (227.46)
- 75 mm, locked with a 2 % push from (2.32, 1.30, 2.0) (she is now fully in frame at the left, soft, in profile to the
  window); his eye at (0.64, 0.45). The phone comes up from his thigh to in front of him (screen glow on his lower face,
  unreadable), a breath, the thumb press, then to his right ear.
- (review) The phone now really sits at the ear: it is placed from the head sculpt's landmarks (ear (±0.33, 0.285, −0.06)·hu,
  outer rim 0.356·hu), speaker at the ear canal, long axis down along the jaw, screen to the cheek; his palm on the case
  back, fingers wrapping up-back, elbow down. The travel blends the phone's offset in the palm socket from the in-hand pose
  to the ear pose. (Before, the wrist target sat under the skull and the phone stood up behind his head like a slab.)
  From BAY_3Q a right-ear call always puts hand and phone on the near side — it reads as a silhouette against the window.

### S073 — CU 100 mm, his eyes, the full-band silence (229.1), held breath (229.82)
- From her side of the bench (NNE of him; she is out of frame), so the phone at his right ear is on the far side — only
  its lower end and his fingers show at the jaw — and his face is 3/4 toward camera-left as the shot list describes;
  the SE window (deep blue, harbour bokeh) behind him; the lamp to the camera's right (warm key from screen-right). Eyes
  registered at (0.52, 0.42); head lifted (not bowed) so the eyes read.
- (review) Fixed: at 229.82 the held-breath `pose({…}, {add:true})` ran after the reach and reset the arm — the phone
  dropped off his ear for the rest of the shot.
- Deviation: the axis is crossed for this one CU (he faces screen-left here, screen-right in S072/S074). The shot list
  asks for exactly this framing; it reads as her point of view during the silence. (Tried in review: keeping the SW side
  with him turned toward the lens — the right-ear hand/elbow then covers his face in all three call shots.)

### S074 — answered on 这人间 (230.63), her smile (232.27), she looks out (233.07)
- 50 mm two-shot from the BAY_3Q side, closer than S063, ~2 % push: the phone at his ear (as S072); his head lifts and eases
  over 1.2 s (bow 0.14 → −0.02, a little turn), a murmur, her small smile (head tilt) at 1.5–1.9, then her eyes and head turn
  to the window at 2.44–3.0. The sky is just paling (dawn progress 0.36). A warm bounce off the SE frames lights his cheek.

### S077 — first light: cap off (237.54), pour hers (238.26), his (238.97), heads to the window (239.6)
- 50 mm, ~3 % push, **her eye registered at (0.33, 0.40)** = S076's profile eye (match cut re-checked), light from
  screen-right. He lifts the thermos, unscrews the navy cup-lid into his left hand, pours into her cup then his (tea
  stream), caps it, sets it down; new steam begins where the tea lands; both turn their profiles to the window. Window light
  now the key (shadowed), the lamp still on. The cups sit low (y ≈ 0.88); a higher camera lifted them but lost the dawn sky
  above the horizon, which this shot is about — kept low.

### S079 — from behind, WS 32 mm, pull back ~0.8 m (12-frame ease-in), dawn warms from 243.56
- Camera on the bay axis at 1.43 m (heads just below the horizon), x 1.35 → 0.55; the three panes NE / E / SE fill the
  frame, the cups and thin steam between them at the centre, three-four sea lamps still lit; deep focus (no DOF). The
  lamp shade is dimmed (daylight now leads); the grade warms −0.08 → +0.02 from 1.52 s.
- The dissolve in (from S078, museum_gallery) renders the slate until that module exists.

### S081 — FINAL: the two cups, fresh steam, the brightening window, the pair reflected; the ray on the last chord
- Tripod-locked 75 mm at 1.06 m, the camera 7 cm above the cups' centre, ~12° south of the east pane's normal: **her cup
  (0.37,0.64), his (0.64,0.64), each 32 % of frame height**, lines level, his chip toward 2 o'clock; the horizon at ≈0.32.
- (review) The background was a uniform beige wall: at sill height a 75 mm sees only ±6° around the horizon, where the
  generic dawn preset is one peach + haze colour, and the sea mirrors it. S081 now blends to its own dawn (`SKY_D81`):
  a P20 blue-grey horizon, the P21 peach glow gathered toward the SE (frame right; sun-glow sharpness 140 keeps the left lite
  blue-grey instead of mauve), continuing S080's lavender morning;
  the sea's sky reflection is halved so a darker sea band sits under the bright sky behind the cup rims; f/4.5.
- The centre mullion behind her steam is flagged dark (backlit frames read dark against the morning), so her steam reads
  against it; his steam reads against the sea band.
- Approved cheat (ruling 2, "through-view + reflection layering"): the people sit beside/behind the camera and are hidden
  in the direct view; they are rendered each frame from the window side (2.2 m out, RT at the lite's aspect) into the left
  lite only (screen x 0 → the mullion, the glass bottom → top), mirrored, at 0.2 strength: two small soft warm figures.
- Light: daylight leads (lamp low), cool sky fill on the cups, 4300 K window key from the right; grade warm ramp
  −0.06 → +0.04 across the 7.54 s (never above ~45 % warm). **252.55 (last chord):** a narrow soft ray (half-res
  windowShaft 6 × 4 cm, 0.72 m) enters from the SE side at the upper right and slants down through both steam columns,
  fading in over 3.2–3.95 s and staying; the steam's own light rises with it. (The old ray prism sat above the frame top and
  was broad enough to fog half the frame when it was visible at all.) Hold to the end (the fade is the engine's).

### view_bay_back — the pair from behind facing the east window (corridor S061 / S066)
- 40 mm from x = 0.35 (just inside the glazed screen), 1.45 m high; time-aware by song time T: before 190.6 the guard
  alone with the phone glowing in his lap and the glasses on; 190.6–197 the unlit bent back; from 197 both seated with
  cups and steam (no steam 224–237.6: the tea has gone cold; the refill brings it back); the dawn sky follows T. No shadow
  pass in the nested render; the exterior target is 0.5× and the light points are scaled for small panes. Reads at 640 px
  (`out/check/night_window/view/sheet.jpg`).

## Debug probes (URL query parameters; inert in production renders)
- `?pts=1` logs the projected screen positions of each shot's registered points (eyes, cups, cuff, shoulder line …) and
  the camera position — `node tools/bench.mjs --shotsfile /shotlist/shots.json --frames N --q pts=1 --verbose`. S062 also
  logs her shoulder-to-cup distance (the reach check).
- `?nw=noshadow,noglass,nofig,noext` switches features off for cost bisection; `?cam=x,y,z,tx,ty,tz,mm` overrides the camera.
- Per-shot tuning knobs that were used while iterating (defaults are the final values): `c60x/c60y/c60z` (S060 camera),
  `pox/poy/poz/por/pgr` (phone in the palm), `b64/d64/h64`, `wx/wz/hfx/hfz/hroll` (S064 camera and her hand),
  `b81/d81/h81/e81/f81/sx81/rk81/hm81/ry81` (S081 camera, exposure, fill, sky, reflection, hemi, ray).
- Debug set-ups `DBG_PLAN`, `DBG_WIDE`, `DBG_BACK`, `DBG_SW`, `DBG_N` (`out/check/night_window/dbg_shots.json`).

## Deviations from the shot list (and why)
- **BAY_3Q geometry.** With the bench parallel to the east pane and the guard screen-right, any camera from the
  south-west sees the east sill *between* them hidden behind his torso (only a camera due west sees that gap). Two fixes:
  the bench was moved 20 cm west (also fixing the lap-under-sill problem), and the cups sit a little toward him (z +0.105 /
  −0.037) so they read just right of his body from BAY_3Q while staying "between them" in the back views and S081.
- **S062/S063 lens 40 mm instead of 50 mm.** The room is 2.4 m deep; a 50 mm MS that holds her standing head and his cup
  needs ~3.3 m. S074/S077 keep 50 mm (seated framings).
- **S062:** she kneels one knee on her own seat of the backless bench to reach the sill (out of reach from behind it).
- **S060:** the end frame holds on the darkness the phone leaves instead of showing it face down on his thigh (see S060).
- **S064:** close-up hands (full figures hidden); her left hand rests palm-up so the worn spot can face a lens on their side.
- **S065:** his look up is a chin lift + small turn (a lost profile from BAY_3Q); her nod carries the face.
- **S072/S074:** the phone is on the near ear — a silhouette of hand and phone against the window, not his eyes.
- **S073:** crosses the axis (her-side CU) to honour "phone on the far side, face 3/4 toward camera-left".
- **S081:** the camera is 12° (not 30°) off the pane's normal so the cups are 0.26 apart at 32 % height and the sunrise
  glow stays off the steam; the figures appear only in the reflection layer (approved cheat); the dark muntin is behind
  her steam only (his steam reads against the darker sea band).
- **S059:** the thermos is not in the MCU frame.

## Known weaknesses (after review)
- Faceless mannequins: the "looks" read as head movements; S065's look up is a lost profile from his side.
- The coat button (S063) is a gesture only; the coat stays closed (garments are built closed).
- S063's step-over sit has one twisted in-between frame (fast blend); the knee-on-bench in S062 is approximate.
- S064: the worn spot reads as a small lighter mark at the cuff end (18 × 8 mm at 100 mm, f/4) rather than a crisp patch;
  her fingertips rest against her cup's side.
- S073: the far-side phone's lower end shows at his jaw; his fingers at the chin read as holding it to the mouth a little.
- S081: the reflected pair are small warm blurs (DOF on the glass plane); the left lite is a cooler, slightly mauve grey.
- S077: the cups and the pour sit low in frame (y ≈ 0.88) to keep the dawn sky in the top of the frame.
- Steam is a sprite effect; in S065 (his cup near the lens) it is a soft wisp, at 100 mm slightly blobby at the base.
- S079's dissolve-in from S078 and S072's match cut from S071 can only be checked once museum_gallery.js exists; S061/S066
  (corridor) will read view_bay_back — checked as a nested proxy at 640 px (`out/check/night_window/rvz/rvview.jpg`).

## Review (art direction + DP pass, 2026-10-05)
Reviewed against the brief, the shot list (action, sync points, gen key/end frames), the bible (§2.3 dawn table, §3.4 window
lighting, §4.5 screen direction, §6.16 tea, §6.17 phone, continuity table) and director_rulings (BAY_3Q, S064, S081 cheat).
Every shot was rendered at u 0.05/0.5/0.95 and on every sync-point frame; the neighbours' adjoining frames were rendered
(S058 end, S076 end, S080 end, S074→S075) and compared side by side; 6 consecutive frames of S063 and S081 checked for
flicker. Backups of the reviewed version: `out/check/night_window/backup_pre_review_night_window.{js,md}`.
Review renders: `out/check/night_window/rv0` (baseline) … `final_rv` (u 0.05/0.5/0.95), `final_sync` (every sync-point frame,
`final_sync/sheet.jpg`); side-by-side and iteration sheets in `rvz/` (`cuts2.jpg` = the neighbour cuts, `flick63/81.jpg`,
`rvview.jpg` = view_bay_back); timing logs in `perf/`.

### Found and fixed
1. **Film grain was a vertical stripe pattern on every frame** (engine hash precision past f ≈ 2100; all night_window frames
   are f4466+). Now a module grain in the engine's half-res additive layer (pier_waiting recipe), engine `grain: 0`.
2. **S072–S074: the phone stood up behind his skull like a black slab** (wrist target under the head, phone long axis along
   the fingers). The ear pose is now built from the head sculpt's landmarks (phone in head space, speaker at the ear, long
   axis down the jaw, palm on the case back, elbow down); the in-hand → ear travel blends the socket offset.
3. **S073: the phone fell off his ear at 229.82** — a held-breath `pose({…},{add:true})` after the reach reset the arm. The
   head is also lifted (eyes read) and the eyes are registered at (0.52, 0.42). (A same-side variant with him turned to the
   lens was built and rejected: the right-ear arm covers his face; the shot list's her-side CU stays.)
4. **S064 was broken:** his left palm lay flat on the sill under a cup that stood on it (read as a severed hand), her cuff
   and the worn spot were invisible (end-on, unlit), his sleeves were huge black tubes toward the lens, notched cuff/sleeve
   joints. Rebuilt: two-hand cradle and lift out low right; her palm-up left hand along the sill turns the worn spot to the
   lens, **registered at exactly (0.42, 0.62)** for S069→S070, cuff lit by the sill bounce; camera from the NW (312°) puts her
   cup at 0.56 and his at 0.72 (keyframe 0.52 / 0.70); sleeve tubes elliptical, starting inside the stub; muntin flagged dark.
5. **S081 (the last image of the film) was a beige wall:** at sill height the generic dawn preset is one peach + haze colour
   and the sea mirrors it. Own dawn sky (P20 blue-grey away from the sun, P21 peach gathered at the SE/right, continuing
   S080's lavender), the sea's reflection halved (darker sea band behind the rims), f/4.5, dark backlit muntin behind her
   steam, the reflected pair small and soft inside the left lite only (RT at the lite's aspect), thinner steam. **The last-
   chord ray was invisible** (prism above the frame top; too broad to read): a narrow beam from the upper right now slants
   down through both steam columns from 252.55 and stays.
6. **S060:** fingers lay across the screen (landscape hold) against a bright beige apron; the follow-down end frames were
   black (his shoulder). Now a portrait hold at reading height (thumb hovering 188.71, withdrawn 190.03), the dark window
   behind; the phone drops out of frame and its glow dies at 190.6; he sits back; the frame holds on that darkness.
7. **S062:** she leaned 56° across him with his cup arcing over his head (read as reaching for him). Now she kneels on her own
   seat facing the window and sets the cup down with an extended arm at shoulder height; the carried gloves were a tall
   white slab (now a small folded pair round the cup); a cool corridor edge reads her entry; the lamp is inside the frame.
8. **S065:** his look up turned his face out of the lens — now a chin lift + small turn (the lift reads); the steam of his
   cup in the foreground was a bright cotton ball (now a wisp); camera 8° more frontal.
9. **S059:** no harbour points in the panes (horizon lights are above this high frame): moored-boat lamps 60–130 m out
   (NE and toward the harbour mouth) give the two warm points; they go out at dawn with the other non-fishing lamps.
10. **S072:** she was half out of frame at the left (camera moved 20 cm east; she now sits soft in profile at the left).
11. **S064 lift / S077:** the cup now lifts a little and leaves low right; S077's camera height was tested higher and kept
   (the cups sit low so the dawn sky stays in frame).

### Checked and kept
S059 ↔ S058 match (shoulder line and position, cool light on the back), S076 → S077 (left-third profile, light from the
right), S080 → S081 dissolve (same lavender morning), S063 (two-shot, cups his right / hers left 6 cm apart, gloves on the
bench corner), S074, S077 (eye at (0.33, 0.40)), S079, view_bay_back as a nested 640 px proxy at six song times (alone
with/without glow, the pair with steam, cold tea without, the dawn refill) — `rvz/rvview.jpg`. No flicker across 6
consecutive frames (S063 4790–4795, S081 6100–6105).

### Timing (1280×536, after the review)
`render.mjs --frame-list` over 13 consecutive frames per shot (stills mode, JPEG only), mean after the first frame; the
machine was shared with other agents' renders (1-min load in the table). `--range` runs (piped to x264) read 1.5–3× higher
under load 9–10 because the encoder's back-pressure is included — `perf/timing.txt` vs `perf/timing_stills.txt`.

| shot | load | mean s/frame | max |
|---|---|---|---|
| S059 | 2.3 (burst) | 1.74 | 2.10 (0.78 in the `--range` run at load 6.7) |
| S060 | 7.1 | 0.90 | 1.22 |
| S062 | 5.6 | 0.73 | 0.91 |
| S063 | 5.8 | 1.19 | 1.39 |
| S064 | 5.5 | 1.40 | 1.71 |
| S065 | 5.1 | 0.70 | 0.82 |
| S072 | 5.0 | 1.24 | 1.53 |
| S073 | 4.6 | 0.70 | 0.76 |
| S074 | 4.0 | 0.95 | 1.30 |
| S077 | 4.8 | 1.54 | 1.83 |
| S079 | 7.3 | 0.79 | 0.99 |
| S081 | 7.1 | 0.70 | 0.79 |
| view_bay_back (640 px, nested proxy) | 5.9 | 0.32 | 1.20 |

### Debug parameters added in review
`?pts=1` also logs `FACE <shot> toCam/right/down` (face direction vs the lens) for S072–S074; `?nw=nograin,nodof`;
S060 `c60x/c60y/c60z/pox/poy/poz/por/pgr`; S064 `b64/d64/h64/hx64/hz64/fa64`; S072 `c72x/c72z`; S073/S074 `ct/cy`
(call head turn/yaw); S077 `c77y`; S081 `hz81/sg81/ss81/sr81/fs81/rk81/ry81/sx81` (horizon colour, sun glow, sharpness,
sea reflection, f-stop, reflection strength, ray, sky exposure).

## Integration fixes (2026-10-06, whole-film QA pass)

Findings from `previz/qa/findings_by_module.json` (night_window + the shared grain findings), reviewed against the brief
("让人记住一个人终于坐到了另一个人身旁"), the director's direction for this group and the survey `out/survey_v2`. This pass
continued a colleague's partial commit (a7b2a26: grain, seats, S060 case, S062–S065 restage); everything was re-verified.
Verification renders: `out/fix_night_window_chapel_harbor_eras/` (`s1/` = survey of these shots + neighbours: `shots/`,
`cuts/`; `it*/` = iteration frames; `tools/rq.mjs` = render.mjs + `--qs` query switches + `--logs`).

### Global
- **Grain:** the module-side half-res grain quad/probe and `grain: 0` are gone; the engine's integer-hash grain at CT_MODERN
  0.035 (base post). Nested views (`view_bay_back`) get none (engine).
- **Seats (colleague, kept):** bench x 3.00–3.38, seats z ±0.34 (68 cm apart: a small gap between the shoulders), a 36 cm
  leg room between bench and sill, cups 14.2 cm apart on the sill in front of the gap (his south = screen-right).
- **GUARD hair:** salt-and-pepper, darker base, less sheen (`uGrey` 0.3) — it read as a pale cap.
- **Dawn table:** the paling starts visibly in S074 (DAWN 0.55 at 233.9) and is P20 (1.0) by the S077 cut (237.1).

### Per shot
- **S059 (major):** 65 mm from 3.3 m (shoulders ≈ S058's width at (0.665, 0.50)); window frames flagged to dark timber;
  187.3–187.7 the phone's cold light rims his right cheek, ear and glasses (a short-range 6500 K source under the jaw; the
  screen never faces the lens; the screen's own spill no longer lights the SE sill). Exposure 1.3: f0 mean 16.9/255 =
  S058's corrected end (16.9). *Not done:* the thermos is still below this MCU frame (it is in S062/S063/S077).
- **S060 (blocker):** worn navy flip case (no chrome), the thumb hovers over the dial key (188.71) and draws back (190.03);
  the camera tilts down with the phone (it never leaves frame); the cover closes and the glow dies over 4 frames ending
  exactly 190.6; the phone lies face down on his right thigh under his resting hand, case back visible beside the hand;
  the lamp is a narrow pool on hand and case, the SE sill/apron beside his knee flagged (they read as a bright plane). End
  frame mean ≈ 3.5/255: the scripted darkness S061 sees.
- **S062 / S063 (blocker):** coverage from the room side behind them (≈ 87° to the window): she enters from screen-left with
  the two cups (moon edge from the corridor), steps over the low bench into the leg room in front of HER seat, sets his cup
  down on '手' (197.15) in front of the gap, then hers, and **sits down beside him** on the band entry (198.22) — side by
  side, same depth, shoulders level, a gap; button 199.3, shoulders drop 200.15; then stillness with the steam rising
  between them against the dark mullion. Window frames ×0.62, framing tilted up so the lamp shade sits inside the frame.
  Faces never frontal (backs + lost profiles against the harbour). Mean ≈ 28/255 (11 %).
- **S064 (major):** her left hand rests on its side, loosely closed (rolled −0.8 rad, curl 1.5, thumb along the index) ~6 cm
  from her cup — not palm-up/begging; the worn spot faces the lens and reads lighter than the melton at (0.42, 0.62) with
  the focus breath at 201.6; his hands are whole at f0 and carry the cup down and back out of frame low right; cobalt line
  2.1 mm; FXAA (MSAA cost ≈ 1 s/frame here for no visible gain); the close-up hands receive but no longer cast the lamp
  shadow (the cups keep their contact shadows).
- **S065 (blocker):** from behind them at eye level, 75 mm: he lifts his head from the cup and turns to her (202.9) — his face
  turns into the lamp, a warm side light on his profile; she is turned to him in lost profile and nods (0.4 s down to 203.5,
  0.5 s up); both exhale (203.9, shoulders drop); stillness over '千年啊'. No frontal faces.
- **S072–S074 (blocker): the call.** A right-ear call seen from his right always puts the hand across his face, so the call is
  covered from his LEFT and the phone is on the far side of his head:
  - S072 (40 mm, from her end of the bay in front of her knees): the match-cut hand is already rising with the phone at f0
    (from S071's raised hand), he dials with the screen's cold light on his face (screen away from us), the phone goes to
    the far ear (227.46), the screen stays lit a moment (a cold halo behind the jaw); she is out of frame (deviation: the
    shot list's soft profile at left cannot be in this angle).
  - S073 (50 mm, her point of view, she hidden): his face three-quarter toward camera-left, eyes down, the head ≈ half the
    frame height (not a giant head), lamp flagged to an edge, a cool edge from the E pane along brow/nose/lips; held breath
    229.82.
  - S074 (50 mm, room side north-west, the S063 geometry): answered on 230.63 — his head lifts and he turns to her, his
    profile coming round into the lamp light (the easing reads in the profile and the shoulders); her smile on the cheek
    line in lost profile (232.27); she turns to the window (233.07). The raised hand at his far ear reads beside his head.
  - The ear pose: elbow out to his right side (a "down" pole folded the forearm across his chest — it read as a fist under
    the chin), fingers up the phone's back (they stuck out behind his head), the phone steeper along the jaw.
- **S077 (major):** camera from the room's south corner (2.62, 1.38, 1.83), 40 mm, her eye at (0.33, 0.40) (T25); the thermos is
  carried in his grip socket with explicit poses: lifted, the cap twisted off into his left hand (237.54), she lifts her cup
  off the sill and holds it out within his reach, he tilts the thermos (mouth 25° below horizontal, 5 cm above her rim) and
  the tea stream runs on 238.26, then his own cup on the sill (238.97), cap on, back by his hip; both profiles to the
  window by 239.6. Window light ×1.7 as the key, lamp down to an accent; pale P20 sky.
- **S081 (minor):** camera 3 cm higher (rims open to an ellipse, his chip at 2 o'clock); the reflected pair cooler, darker and
  desaturated (head-and-shoulder silhouettes, not orange smudges); a tighter sun glow (sharpness 400) so his steam rises
  against a darker sky. *Not done:* putting the centre muntin behind his steam needs ≈ 0.6 m of camera shift at this
  framing (the QA's 4 cm moves it < 1 cm) — kept the T26 framing.
- **S079:** unchanged (re-checked in the survey with the centred S078 dissolve).

### Deviations added by this pass
- S072/S073 are covered from her end of the bay (the axis is crossed for the two call singles; S074 restores the two-shot
  geometry); she is out of frame in S072.
- S077: she holds her cup out to receive the tea (from any room-side angle his body hides a pour onto the sill in front of
  the gap); she keeps it in both hands to the end of the shot (back on the sill by S079, after the S078 time cut).
- S059: thermos not in frame.

### Debug added
`?ray=x,y` logs the first meshes under a screen point; `?ct ?cb ?b72 ?b73 ?b74 ?pex ?pey ?pez ?fy ?phz` (call), `?ox77 ?oy77
?oz77 ?lh77 ?mm77 ?c77x/y/z ?wl77` (S077), `?pz60 ?ty60 ?lk60 ?dk60 ?hm60` (S060), `?kg59 ?e59` (S059), `?hg` (hair grey).

### Timing (1280×536, `tools/rq.mjs --frame-list`, 6 consecutive frames per shot, mean after the first; machine shared with
three other fixers' renders, 1-min load 7–11 on 4 cores — roughly 2–2.5× the idle cost)

| shot | mean s/frame | max |
|---|---|---|
| S059 | 2.09 | 2.25 |
| S060 | 2.29 | 2.38 |
| S062 | 1.97 | 2.60 |
| S063 | 1.41 | 1.60 |
| S064 | 2.6 (load 10.4; 1.7 when he is out of frame) | 2.97 |
| S065 | 1.55 | 1.69 |
| S072 | 1.87 | 2.00 |
| S073 | 1.75 | 1.96 |
| S074 | 1.49 | 1.62 |
| S077 | 2.12 | 2.50 |
| S079 | 1.19 | 1.33 |
| S081 | 1.95 | 2.48 |

All within the 2.5 s/frame budget except S064's first second under this load (three close-up hands + DOF + the lamp shadow;
≈ 1.7 without the shadow pass).
