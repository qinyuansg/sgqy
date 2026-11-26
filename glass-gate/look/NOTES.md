# Helper B — look notes

Everything here was tested on the **real gate** (`hardware/gate.blend`, 762 k triangles, the build of 18:57) in the
'test' preset. The proxy (`look/proxy_gate.py`) was only used until the real gate appeared; no delivered still shows it.
`look/gate_look.blend` (dark studio) was made from that build: re-run `apply_look.py` after any hardware rebuild (5 s).

## ROUND 2 (after the director's review) — read this first; it supersedes the rig, cost and alive-strength parts below

Tested on the director's animation (his baked `DIRECTOR_CAM`, 16 shots, alive and house keys) applied to the new gate
with `LED_DIFFUSER` bands and `PROP_card` (hardware/gate.blend of 19:31), with `look/director_frames.py`.
The A/B sheet and the alive stills in `look/tests/` from round 1 show the OLD rig; round-2 evidence is `look/tests/r2_*`.

### What the director calls, in order

    # stage 2 (unchanged):  look/apply_look.py --gate hardware/gate.blend --studio dark --out look/gate_look.blend
    # director/animate.py, after the camera bake and the alive keys:
    import studio                                   # sys.path has look/
    info = studio.aim_for_director(sc)              # keys STUDIO_RIG + the two rim cards per shot; softens DIR_* lamps;
                                                    # prints the shots and any card that reaches into a frame
    # director/render.py, after gg.setup_cycles(sc, preset):
    import settings
    settings.recommended(sc); settings.final(sc)    # bounces + glass guard; denoiser, light tree off, persistent data

`aim_for_director` reads the cuts from the scene's timeline markers if there are two or more, else from `cuts` in
shared/timeline.json (pass `timeline=<path>` for another file). Everything it writes is ordinary keys and drivers and
is saved with the .blend. The light-path settings and the bloom are also stored in look/gate_look.blend, so render.py
keeps them even without the two `settings` calls; the calls make it explicit.

### 1. Cost

Same frames, same machine, CPU seconds of the render (2 threads, 540×675, 16 spp), before = director/scene.blend as it was:

| frame | before | after | |
|---|---|---|---|
| 330–332 gear macro | 25.9–26.4 | 17.9–18.3 | −31 % |
| 650–651 glass body, wide | 24.9–26.5 | 18.6–20.1 | −25 % |
| 1190–1191 alive, lane | 36.1–36.9 | 28.2–30.4 | −20 % |
| 1285 alive drive macro | 48.2–51.4 (round-2 start) | 42.3–43.6 | |

Final preset (1080×1350, 16 spp, 4 threads, persistent data, second and later frames), wall seconds while two other
helpers were also using the box: **330–332: 18.5–20.0 · 650–651: 18.8–20.1 · 1190–1191: 29.0** (director's idle-box
baseline 26 / 26 / 36). At `--scale 80`: **11.3–12.0 · 12.5–12.6 · 18.7–19.9**.
Film average at 80 %, extrapolated from the relative cost of 48 frames (3 per shot): about 15–16 s.
The dearest shots are the alive macros 13_card and 14_drive (2.3–2.5× the gear macro, about 27 s at 80 %), then
08–10 and 12, 15, 16 (1.4–1.7×).

What was measured (frame 331 / 651 / 1191, CPU-s at test size):

| change | effect |
|---|---|
| light tree OFF | −19 % / −18 % / −10 %. Seed stability unchanged (RMS 0.0158→0.0162, 0.0295→0.0282, 0.0331→0.0311) |
| OIDN quality BALANCED instead of HIGH | about −10 % (measured together with the prefilter: 26.6→21.5) |
| OIDN prefilter FAST | another −1.4 s per final frame, but it leaves speckle in the fluted posts (noisy albedo/normal behind glass): NOT used. ACCURATE is the default of `settings.final()` |
| denoise on RGB only (no albedo/normal) | as cheap as FAST, no speckle, but the PCB, the "G1" on the badge and the card print smear: NOT used |
| glow lights 40 → 16 | −0.5 % (they were never the cost; hiding all of them saves 2 %) |
| edge-lit glass glow, first version | +14 % on every frame. Now it hangs on a Mix Shader with factor gg_power, so it costs nothing while unlit and +5 % when alive |
| view-layer attribute nodes in the glass (guard depth, wave axis) → Value nodes | part of the above |
| two noise textures on the floor's base roughness (invisible under the coat) | −7 % on floor-heavy frames, removed |
| bloom (compositor, CPU) | < 0.1 s per final frame (1 spp frame with and without: 1.61 vs 1.61 s) |
| glass bounce guard 8/4 → 6/3 → 4/2 | nothing (27.5–29.0 in all three): paths are short, depth is not the cost |
| adaptive sampling threshold 0.1–0.15, min 4 | 0–3 %: at 16 spp the glass never converges, the black already stops at 4 |
| static BVH | +2 % (rebuild) |
| glass casts no shadows | −4 %, and the gate floats: not used |
| diffuse bounces 1 | nothing |
| hiding ALL glass on the alive macros | nothing (46.4 → 43.5): there the cost is 16 full samples on every pixel of a dense, lit frame |

So the remaining lever is samples × pixels. If the average is still too high: 12 spp on shots 13 and 14 (see boiling).

### 2. The rig

- Every lamp except the spark is now a **soft card**: an area lamp whose emission falls to zero over the outer 45–96 %
  of each half side (`studio.soft_light`). What a pane mirrors of it is a gradient.
- **No lamp can appear in the floor.** Each lamp is excluded from the floor by light linking and has a twin
  `STUDIO_<name>_FLOOR` (same place, diffuse only, floor only, `["gg_floor_gain"]` × the parent's energy). The floor
  still gets its pool and the glass shadows; it mirrors the gate and nothing else.
- Cards (positions relative to the lens axis): `KEY` 3.4 m box overhead (peak radiance 5.5), `FRONT` wall behind and
  above the camera (1.3), `RIM_L/R` 1.2 × 3.2 m strips 5 m behind the subject, 40° or more off the axis (11),
  `GEAR` over the drive, linked to `DRV_*` objects only (6), `BACK` a 5 m dim glow far behind (0.30, all gradient),
  `SPARK` the hard spot, low behind.
- `BACK` is deliberate: lamps are invisible to the lens but not through glass, so every pane, tube and leaf shows a
  faint gradient of it and separates from the black. It is why the wings and the side panels now read as slabs.
  It is 1/20 to 1/35 of a card's brightness. To switch it off: `bpy.data.objects["STUDIO_BACK"]["gg_energy"] = 0`.
- `aim_for_director`: the rig is put on the SUBJECT (lens axis at the focus distance, clamped to the gate's footprint)
  and turned to the lens axis, so the cards keep their place in the frame whatever the camera looks at. A shot whose
  axis turns less than 12° and whose subject moves less than 0.6 m gets one held pose; otherwise the rig is tracked
  through the shot (linear keys): with the current camera, shots 07_glass and 11_wave. Per shot the two rims are
  opened just far enough (40–52°) to stay out of frame from the first to the last frame.
- Check (`studio.check_cards`): no STUDIO card reaches into the frame on first / middle / last frame of all 16 shots,
  nor on every 6th frame of the film (260 frames). `DIR_sweep` (frames 42–96) and `DIR_pass_L/R` (1326–1350) are
  in frame: they are the director's own lamps and meant to be. `aim_for_director` gives them soft edges and a floor
  twin too (`others=False` leaves them alone).
- The camera has sensor fit HORIZONTAL (wider than a 36 mm-high frame); the rim opening accounts for it.

### 3. The alive moment

- `LED_DIFFUSER` is shaded: frosted clear plastic when dark; lit, a solid saturated band (2.4, tone-maps to a
  saturated blue-violet / green instead of white), white-blue head ×9 as the front passes. Same `wave_u` law as the
  chips. The gate without the bands still works (the chips alone).
- Edge-lit glass: `GLASS_BODY` glows in the LED colour near the height of the LED seam once the front has passed its
  place along the lane (wave_u estimated from world Y; `alive.setup_alive` fits the axis to the rail LEDs), strongest
  on rims, bevels and flutes. `GLASS_WING`: the edge band of the leaf glows when the wing's edge light is on.
- Floor: 16 glow lights, 340 W together, under the spine on the lane side, diffuse only. A clear coloured pool.
- Bloom is on by default (`alive.setup_glare`, fog glow, threshold 4, strength 0.30, highlights clamped at 14),
  looked at on 1010, 1190, 1400, 1500. Cost < 0.1 s per frame.
- **House values** (tested on the director's frames): before the drop 1.0, dipping to 0.5 on the last frame before it
  (as keyed now); **the drop and the first wave 0.30**; **alive idle 0.45**; **granted 0.45**; **final hero 0.80**.
  At 0.30 the posts and rails are still readable while the band carries the frame; below 0.2 the room is gone.
- Shot 11 (960–1080): the band was looked at from the grazing start position (frames 960, 965, 1010, 1019) and after
  the pull-back (1070, 1079): a continuous band with the hot head, no stepping.

### 4. Wings

Edge band of the leaf: a faint cool catch-light that is always there (× house), found from the object-space normal, so
the outline is drawn whatever is behind it. Face: the soft lower edge of `FRONT` gives a sheen that is brightest at the
top; `BACK` shows through as a gradient. Looked at on 863, 870, 895, 899 and on the leaves hovering in frame 0.

### 5. Smaller things

- Gear macro: `GEAR` card + the rims now behind: brass teeth, steel ring and carrier separate (250–377, 1285).
  No bar behind.
- `PROP_card`: reads on 1215–1230 (clear body, white print, gold pad); it uses contract names, nothing to do.
- **Boiling.** Seed-to-seed RMS at 16 spp, before → after: frame 331 0.0205 → 0.0154, 651 0.0374 → 0.0235,
  1191 0.0376 → 0.0239 (pixels differing by more than 0.1: 1.2 → 0.4 %, 3.9 → 1.2 %, 4.7 → 1.8 %).
  In motion (mean |f − median of 3 frames|, 8 consecutive frames): 330–337 0.00069 → 0.00050
  (worst 1 % of 8×8 blocks 0.0105 → 0.0056), 650–657 0.0053 → 0.0031 (0.039 → 0.018); map in `look/tests/r2_motion_crawl.png`.
  Where it still crawls: inside the fluted posts, on brass gear teeth behind the column glass, and where the
  floor mirrors the flutes. Flat panes, metal, PCB, floor pool, LEDs and screens are quiet.
  12 spp instead of 16: seed RMS 0.0241 / 0.0250 / 0.0180 on 651 / 1191 / 1285 (16 spp: 0.0235 / 0.0239 / 0.0170),
  for −18 / −23 / −19 % render time. So 12 spp with this look is still a third steadier than 16 spp was before, and
  takes the cost to −38 % against the baseline. Recommended if the budget needs it, first on shots 13 and 14.
  Set: `settings.final()` as it is (prefilter ACCURATE is the part that matters for the flutes); keep the seed fixed.

### Still imperfect (round 2)

- Cost is −19 to −31 % at equal settings, not a flat −30 %; the alive lane and macro shots are the weak end.
- `BACK` is a cheat that only exists behind glass. It is dim, but it is not what a real room would do.
- A tracked shot moves the light with the camera: floor shadows slide a little during 07_glass and 11_wave.
- The glass glow is a shader estimate from height and world Y, not light transport: it does not know about parts in
  the way, and it shows on glass that is not near an LED if that glass is at rail height.
- Frame 0: the director's sweep lamp is still the brightest thing in frame (softened, not dimmed: his to key).
- violet / highkey / hdri were not re-tuned with the new cards (highkey keeps only its key and spark).

## Files and how to run them

    look/apply_look.py        pipeline stage 2:  gate .blend -> look/gate_look.blend
    look/materials.py         apply_materials(): every contract material, fallback for unknown names
    look/studio.py            build_studio(variant): 'dark' | 'violet' | 'highkey' | 'hdri';  aim_for_director(), aim_rig(), get_studio()
    look/alive.py             key_alive(), set_alive(), key_first_wave(), key_grant_wave(), setup_alive(), setup_glare()
    look/settings.py          recommended(scene, quality): Cycles bounces + the glass bounce guard, kept in step
    look/make_textures.py     UI / badge / PCB art with pillow -> look/tex/*.png   (look at look/tex/_contact.png)
    look/proxy_gate.py        the stand-in gate (spec envelope, contract names, wave_u)
    look/render_tests.py      one test still: --gate --studio --cam hero|macro|reader|entry|low|back|floor --alive k=v,..
    look/make_ab.py           the background A/B  -> look/tests/ab_*.png + ab_backgrounds.png
    look/make_alive_stills.py the alive stills    -> look/tests/alive_*.png + alive_sheet.png
    look/make_measure.py      cost / noise numbers -> look/tests/measure.json, seeds_macro.png, seeds_alive.png
    look/tests/test_alive_persist.py   keys the alive values, saves, re-opens in a second plain-bpy process, prints what it finds

    /opt/blender-env/venv/bin/python look/apply_look.py --gate hardware/gate.blend --studio dark --out look/gate_look.blend
    /opt/blender-env/venv/bin/python look/make_ab.py            (8 stills, about 5 min)
    /opt/blender-env/venv/bin/python look/make_alive_stills.py  (8 stills, about 4 min)

From the director's script (after opening `look/gate_look.blend`):

    import sys; sys.path.insert(0, 'look')          # materials.py, studio.py, alive.py, settings.py import each other by name
    import alive, studio, settings
    st = studio.get_studio(scene)                   # {'rig','floor','world','lights':{KEY,FRONT,RIM_L,RIM_R,GEAR,BACK,SPARK,*_FLOOR},'key','spark'}
    gg.setup_cycles(scene, 'final'); settings.recommended(scene)     # ALWAYS call recommended() after setup_cycles()

`apply_look.apply(scene, studio_variant)` does the same on an already open scene. Rebuilding a studio
(`studio.build_studio('violet')`) replaces the old one and keeps the alive keys.

## The background decision (director picks from `look/tests/ab_backgrounds.png`)

Same gate, same two cameras (3/4 hero; macro on the R column / gearbox), light rig aimed per camera, 'test' preset.
CPU-s = CPU seconds summed over the 2 render threads at 24 spp (the box was shared, so wall time was not
reproducible; wall was 24–49 s per still).

| | hero CPU-s | macro CPU-s | glass edges | inner parts | LEDs / alive |
|---|---|---|---|---|---|
| **A dark** | 45 | 68 | strongest: every bevel and flute white on black, blue-violet in the thick edges | readable, gears and copper stand out against the dark | best: idle blue-violet and green both read, floor takes the colour |
| B violet | 62 | 89 | good, but the edges sit on a mid-bright blue, less snap | readable, everything picks up a violet cast (brass goes cooler) | weak for idle: blue-violet LEDs on a blue-violet set; green pops |
| C highkey | 65 | 95 | weakest: white on white, the glass reads as light acrylic | the most readable of all (PCB, cables, gears like a catalogue shot) | worst: emissives are swamped unless `house` goes very low, which greys the white cyc |
| D hdri | 49 | 71 | natural softbox reflections, but no rim, edges are grey not white | readable, neutral colours | fine on the dark floor, but no polished-floor reflection of the gate |

**Recommendation: A, the dark studio.** It is the only one where the glass looks heavy: black body, burning edges,
tint visible. It is also the only one where the alive moment can be the payoff, and it is the cheapest of the four
(B and C cost about 35–40 % more: their glowing walls are one more big light and more bounce light).
Critical points against it: the polished floor mirrors whatever is high above it, so from elevations above about 40°
the KEY softbox can show up as a soft bright rectangle in the floor (raise the coat roughness in `STUDIO_FLOOR_dark`
or lower `KEY["gg_energy"]` for such a shot); and with nothing behind it, flat glass faces can go completely black
when they refract only darkness — the rim strips and the floor pool are what keep them alive, so keep the rig aimed.

- B hides nothing but drowns the product colourway and the idle LED colour in its own violet. Second choice if black
  is judged too "tech demo".
- C is the cheapest way to make the glass look like plastic. Kept as an honest counter-example; it is also the one
  where the hidden parts are easiest to read.
- D is the most "photographic" and costs about the same as A, but the matt floor (a glossy one would mirror the photographed
  room) and the missing rims make it the flattest of the dark options. The only variant that uses a download.

### Rig rules (all variants) — rewritten in round 2, see "Round 2" at the top

- Every lamp is a child of the empty `STUDIO_RIG`. `studio.aim_for_director(scene)` places and keys the rig for
  every shot; `studio.aim_rig(rig, camera)` does it once for a still.
- Light power: change `obj["gg_energy"]`, never `light.energy` (driven as gg_energy × scene["gg_house"]).
- No lamp is mirrored by the floor: each has a diffuse-only twin `STUDIO_<name>_FLOOR` that lights only the floor.
- In `hdri`, aiming turns the spark only; the HDRI turns with `world.node_tree.nodes["HDRI_Mapping"]`.
- Grade: `settings.recommended()` sets AgX with the look "AgX - Punchy". All stills use it.

## Materials

- Glass (`GLASS_BODY`, `GLASS_WING`): Glass BSDF, IOR 1.52, roughness 0. Absorption without a volume: on a
  back-facing hit the ray has just crossed `Ray Length` of glass, so the BSDF is tinted by tint^(length / 7 cm).
  8 mm walls stay clear; light that runs inside a sheet or a tube wall goes blue-violet. Shadow rays and bounce
  rays see a tinted Transparent BSDF, so lamps reach the parts inside and the floor behind. `GLASS_LENS` is a
  coated Principled glass (thin-film sheen).
- **No black faces**: past 8 transmission bounces or 4 glossy bounces (`materials.set_glass_guard`; internal
  reflection counts as glossy) a glass surface becomes plain Transparent; the path stops refracting instead of dying.
  `settings.recommended()` keeps the Cycles limits above the guard. shared `setup_cycles()` (16/16/6) is also above
  the default guard (8/4), so nothing goes black if recommended() is forgotten.
- Metals: brushed aluminium (anisotropy 0.7, streak roughness), polished steel, brass, copper with wound-wire
  ridges and enamel coat, blued spring steel; all with object-space micro-roughness noise (costs 3 %).
- PCB: tex/pcb_traces.png box-projected in object space at a real 85 mm tile: lighter raised traces under the mask,
  gold pads, silkscreen, bump, lacquer coat. Works on every PCB part whatever its UVs. Deep green mask.
- Screens: LCD = black glass + emissive UI (idle "LOOK HERE" face target / granted check + WELCOME), opens from
  the centre line. Wing display = Transparent + emission, perfectly clear when off, wipes up with a scan line.
  Badge = brushed steel, black-filled HYALO G1, letters glow faintly when alive. All text invented.
- UVs of screens and badge in hardware/gate.blend read the right way round on both sides (checked numerically and
  in the stills); `apply_look.fix_screen_uvs` exists but is off.
- Unknown material names: guessed from keywords (GLASS, STEEL, BRASS, LED, CABLE, …), else a neutral satin plastic in
  the modeller's viewport colour; each is printed. The real gate has none (27 of 27 contract names filled).

## The alive moment — exactly what to key

Five (+1) custom properties on the **scene**: `gg_power, gg_wave, gg_grant, gg_screens, gg_ir, gg_house`. Shaders read
them with Attribute nodes (type View Layer), the glow lights with drivers. `alive.key_alive()` writes ordinary
keyframes on them (LINEAR by default; `interp='BEZIER'` for eased ones). Nothing else needs keys.

    f = lambda t: round(t * 60)
    # build: everything dark
    alive.key_alive(scene, 0, power=0, wave=-0.1, grant=0, screens=0, ir=0, house=1)
    # THE DROP at td: first wave, 1.5 s end to end
    alive.key_alive(scene, f(td) - 1, power=0, house=1)
    alive.key_alive(scene, f(td) + 4, power=1, house=0.12)     # studio dips so the LEDs carry the frame (optional)
    alive.key_alive(scene, f(td), wave=-0.1)
    alive.key_alive(scene, f(td + 1.5), wave=1.1)
    alive.key_alive(scene, f(td + 1.0), screens=0); alive.key_alive(scene, f(td + 2.0), screens=1)
    alive.key_alive(scene, f(td + 1.6), ir=0);      alive.key_alive(scene, f(td + 1.7), ir=1)
    alive.key_alive(scene, f(td + 2.0), house=0.12); alive.key_alive(scene, f(td + 3.5), house=0.35)
    # ACCESS GRANTED at tg: green wave over the idle gate (helper writes the 3 keys)
    alive.key_grant_wave(scene, f(tg), f(tg + 0.7))
    # back to idle later: alive.key_back_to_idle(scene, f0, f1)

- `wave` runs in `wave_u` space. On the real gate: rail 0.02 → 0.88 along +Y, entry accent 0.03–0.06, column ring
  0.47, exit accent 0.89–0.92, wing edge lights 0.92 → 1.0. Key −0.1 → 1.1 for a full pass.
- Green as a wave: LEDs ahead of the front show `grant` × idle. So (grant 0, wave 1.1) and (grant 1, wave −0.1) are the
  same picture; jump between them from one frame to the next, then run the wave again. `key_grant_wave` does it.
  For a plain cross-fade keep wave at 1.1 and blend grant. Screens and badge switch as grant crosses 0.5.
- `house` is my addition: it dims every studio light, the world and the backdrop glow. Measured need: at house 1 the
  rim reflections on the rail (radiance about 30) bury the LED line; the stills use 0.12 for the wave and 0.3 after.
- For a still: `alive.set_alive(scene, power=1, wave=1.1, screens=1, ir=1, house=0.3)`.
- The LEDs light the scene through **glow lights** (collection `GG_ALIVE_GLOW`, 40 small sphere lights on the real
  gate): LED_STRIP polygons are clustered, each cluster gets a light parented to its LED object (the wing ones follow
  the wing), driven by the same wave formula. They are diffuse-only; the LED meshes themselves are what the camera,
  reflections and refractions see (no double counting). `alive.GLOW_WATTS` (340 W in total, round 2) scales them; `materials.LED_STRENGTH`
  (30) is the chip brightness, `materials.DIFFUSER_STRENGTH` (2.4) the band's. After changing LED objects or constants call `alive.setup_alive(scene)` again.
- Optional bloom: `alive.setup_glare(scene)` (compositor, forced to CPU: the GPU compositor kills a headless bpy).
  Subtle at the default strength; not used in the stills.
- Persistence: `look/tests/test_alive_persist.py` keys both waves, saves, re-opens the file in a second process with
  plain bpy and prints properties, glow-light energies/colours and render means per frame (result in
  `look/tests/alive_persist_result.txt`). `look/tests/reopen_gate_look_granted.png` is rendered from the saved
  `look/gate_look.blend`.

## Floor caustics — how, and what they cost

Chosen: **coloured transparent shadows with a facing-dependent gain**, inside the glass shader, free.
A shadow ray that crosses a glass surface is multiplied by a colour that depends on how the surface faces the lamp:
(1.12, 1.14, 1.26) when it faces it, falling to (0.10, 0.11, 0.30) at grazing incidence. Flat sheets come out about
neutral; flutes, tubes and bevels throw bright blue-white streaks with dark rims. No noise, no extra rays, follows
every moving part. It is not physical (energy is not conserved, there is no real focusing).

Measured alternatives:
- Cycles shadow caustics (MNEE) on the hard light: `studio.set_caustics(scene, 'mnee')`. On the proxy it gave a
  slightly more structured shadow for +10–14 % on floor pixels. On the real gate with the final rig it cost +9 % CPU
  (35.4 vs 32.6 CPU-s) and the image was **identical** at the same seed: the solver finds no path through the
  fluted, nested shells (or does not run with the light-linked floor lamp). Not used; left as an option.
- No caustics at all (glass casts no shadow): −7 to −9 % render time, the gate floats. Not worth it.
- A baked photon map or a light gobo: not built. They would be right only for one spark position and for the
  assembled gate, and the rig is meant to be turned per shot.

The floor has a lighter patch under the gate (`pool`, albedo 0.024 against 0.012) so that pool, shadows, streaks and
LED colour show; beyond 9 m the floor dissolves into the world colour, so there is no horizon line.

## Render cost (measured) and recommended settings

All at 540×675, 2 threads, dark studio, **16 spp** + OIDN, real gate. CPU-s over all threads; wall time at load 3–4.
(Measured with clamp 6 / filter glossy 1; the recommended clamp 3 / filter 2 cost the same: 48.6 vs 48.2 CPU-s.)

| frame | CPU-s | wall s |
|---|---|---|
| hero, not alive | 32.6 | 16.8 |
| macro on the gearbox (glass fills the frame) | 51.3 | 26.5 |
| alive, lane view, glow lights ('hybrid') | 33.5 | 17.3 |
| alive, LED meshes as the only lights ('mesh') | 27.9 | 14.4 |
| 1 spp (scene sync + BVH + denoise) | 9.9 | 5.3 |
| macro without denoising | 42.2 | 21.5 |

Extrapolated to the final preset (4× the pixels, 4 threads, ideal scaling): **about 30 s for a wide frame, about
45–50 s for a glass-filling macro frame.** That is above the 20 s target, and it is not a bounce problem:

- bounce presets `fast` / `default` / `macro` (guards 6/3, 8/4, 10/5): 49.7 / 51.3 / 49.2 CPU-s. Use `default`.
- without any glass the macro frame still costs 29.4 CPU-s; clay parts −3 %; no roughness noise −3 %;
  adaptive sampling saves 2 %; shadow linking (glass out of the shadow blockers) made it 30 % SLOWER.
- what does help: OIDN `denoising_quality='BALANCED'` −8 % (image difference RMS 0.013), `denoising_prefilter='FAST'`
  −9 %, fewer samples (cost is linear above the 9.9 CPU-s floor), `render.use_persistent_data` for the BVH.

Recommended: `settings.recommended(scene)` = max 14 / transmission 9 / glossy 5 / diffuse 2 / transparent 24,
caustics off, clamp indirect 3, filter glossy 2, glass guard 8/4. Clamp 3 + filter 2 instead of the shared 6 / 1
cut the seed-to-seed difference by 18 % (RMS 0.0294 → 0.0242, pixels differing by more than 0.1: 2.6 % → 1.5 %)
at no cost; the inside of the glass gets slightly darker.

**16 spp does boil.** Two seeds of the same frame differ by RMS 0.029 (macro) and 0.035 (alive, lane view), see
`look/tests/seeds_macro.png` and `seeds_alive.png` (left, right, difference ×8). The difference sits in the
fluted posts and on the brass gears behind glass; floor, screens and glow are stable. At final resolution the flutes
are twice as many pixels wide, which should help, but I could not test an animation. Options for the director:
a fixed seed (`cycles.use_animated_seed = False`) for locked-off shots, 24–32 spp on macro shots, or both.

## Decisions I took (nobody to ask)

- Scene custom properties + View Layer attribute nodes for the alive values (verified animated, saved, re-opened).
- Added `house` to `key_alive` (optional, default untouched) because the LEDs cannot beat full studio light.
- Glow lights rather than relying on the emissive chips: same noise, 15–20 % dearer on alive frames, but the amount
  of light on floor and parts is then a free artistic gain. `materials.LED_MODE = 'mesh'` switches back.
- Camera-relative rig + `aim_rig` instead of a symmetric ring of lights (a ring always puts a strip in frame).
- Idle LED colour (0.14, 0.11, 1.0), granted (0, 1, 0.2), IR dots (1, 0.04, 0.22), scene-linear.
- Solder mask stays green: it is what says "PCB" at a glance, and it separates from the blue-violet light.
- 2k HDRI (6.3 MB) rather than 1k: softbox edges in mirror-sharp glass.

## Imperfect / not done

- Render time is above the 20 s target (see above); I found no shading-side fix.
- 16 spp boils in fluted glass and on the gears (see above); not tested in motion.
- In wide shots the LED chips are thinner than a pixel and tone-map to a near-white hairline; the colour is carried
  by the glow on the floor and in the glass. The bloom helper is the fix if more colour is wanted in the line itself.
- The first wave is hard to see from the hero angle while `house` is above about 0.15 (rail-top reflections).
  The lane view (`--cam entry`) reads better.
- Caustics are a shader trick, not refraction. Shadow rays crossing many surfaces at near-normal incidence gain
  light (1.12 per surface); nothing blew out in the stills, but it is unphysical.
- Dark studio: softbox mirror images in the floor from steep camera angles; a rim strip can show through the glass
  if the rig is not aimed for the shot.
- `violet`, `highkey` and `hdri` got less tuning than `dark` (one or two passes each).
- The A/B macro stills show a dark vertical line through the column: it is the bevelled edge of the side panel
  seen through the tube (real geometry, not a seam).
- Screens cross-fade idle → granted; they do not follow the wave front. No per-LED flicker or sparkle.
- The proxy gate is crude and is not used for any delivered still.
