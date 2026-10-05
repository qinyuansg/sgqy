# previz/lib — change log (character kit)

Newest first. Log every change a scene builder could notice: API (names, options, poses, bones, sockets) and
visible/behavioural differences that could move a framing or a prop.

## 2026-10-05 — character polish pass `fig-2` (figure.js · figure_garments.js · figure_mat.js · figure_sdf.js · figure_cache.js · hand.js)

**API: no changes.** Every exported function, option, pose preset, hand preset, bone name, alias, socket and cast
variant is the same (checked by diffing the module exports, `POSES` / `HAND_POSES` / `CAST_CODES` / `EXTRA_ERAS`, the
bone table and the socket names). The only new exports are internal helpers in `figure_sdf.js` (`loftTable`, `loftAt`,
`loftDist`, `loftPrim`, `smoothBoundary`). `cast.js` is unchanged; continuity details (RESTORER worn LEFT cuff spot,
NAVIGATOR patch inside the RIGHT cuff / `cuffTurned`, WIFE silver and MOTHER jade bangles, GUARD badge, glasses cord and
flashlight, hairpin, loupe) are unchanged.

What you may notice in existing shots (re-check tight framings and hand-placed props):
* **Proportions.** Adults are ≈ 7.5 heads (head a little smaller, `P.hu` 0.130 / 0.133 of H). The trunk is one lofted
  sculpt: narrower waist and hips, women's shoulders narrower (`P.shJX` 0.092 H). The shoulder joint is 0.009 H lower, the
  neck slightly slimmer, and the limbs taper (forearm, wrist, calf, ankle). Measured against fig-1 (RESTORER, GUARD, WIFE, CHILD), the head and
  `eye()` move ≤ 1.3 cm and the shoulder joints ≈ 2 cm. Wrists, and with them hand sockets and held props, move
  ≈ 2.5–3 cm in `apose` / `sit_chair` and ≈ 4.7 cm in `stand`. Poses are unchanged as channels, and `reach()` to explicit
  targets is unaffected.
* **Neutral stance.** `stand` (and the presets built on it) keeps the arms closer to the body with a slight elbow bend
  and relaxed hands. `apose` is unchanged (upper arms 0.66 rad). The internal skinning bind pose is now arms 0.45 rad out
  with a small elbow bend; this is not visible in any pose but is baked into the geometry.
* **New read-only dimension fields:** `fig.P.torso` holds the loft cross-sections and `fig.P.girth` the muscle-mass
  factor. Existing `P` fields keep their meaning; `P.rib`, `P.waist` and `P.pelvis` are now measured from the loft.
* **Garments.** Upper garments hang from a cloth loft: tailored jackets and coats have suppressed waists, sleeves taper
  and trousers hang straight. Shell edges at necklines, hems, lapels and cuffs are smoothed along the crease, so they no
  longer fray. Cloth over the shoulder top now follows the clavicle (no puffed shoulder tips when the arms move), and trouser legs
  below the knee follow the shin (a seated wide or rolled hem no longer swings forward into a loop). The
  seated-skirt weights use one rule per figure (keyed to its longest hem) and never take sleeves or cuffs, so seated
  figures no longer grow cuff spikes or let a skirt poke through the jacket. Collars sit on the neck column.
* **Materials.** Skin has a warm terminator, a hue lock to the bible range and soft colour zones on the face (lips,
  cheeks, nose, ears, lids, beard shadow). It no longer reads grey or white. Cloth sheen scales with the fabric's own
  colour, so dark cloth no longer blows out to white under close practicals (ISSUES.md [ship_cabin]). Hair has
  flow-aligned strand locks and a soft hairline. Gloves have seams and joint wrinkles, and bare hands have knuckles,
  tendons and nails. All existing `userData.fzUniforms` names are kept; new ones were added (`uFace`, `uHeadInv`, `uHu`, `uBeard`, `uSkin`, `uFlow*`, `uPulled`). Only the internal program cache keys changed (`skin2_`, `hair2`), and `?figmat=plain` still works.
* **Cache.** `FIGURE_LIB_VERSION` is now `'fig-2'`, so old bakes are stale and `load*` sculpts live until
  `node previz/tools/bake_cast.mjs` is run. `previz/lib/cache` has been re-baked (src 3478eee40fc1f620). Cache URLs are resolved relative to
  `figure_cache.js` (`import.meta.url`), so they work from any page path.
* **Cost** (paired, interleaved `tools/bench.mjs` runs on `_lab_polish` PERF0/1/2 against the old lib, 16 rounds, machine
  loaded at about 8 on 4 cores, so absolute numbers run about 2× idle):
  * Full-body hi RESTORER at 4.5 m adds +334 ms (median +346) over the empty studio frame; it was +343 (+326).
  * A close-up RESTORER adds +570 ms (median +537); it was +532 (+513), so +5–7 %.
  * Triangles: GUARD hi is 68.9k (body, head and garments), up from about 64k (+7 %).
  * The bake for 70 figures and 52 hands takes 6 min (58 MB).
  * Live sculpting (cache miss) is slower than before: 20–120 s per hi figure.
* **Lab:** `scenes/_lab_polish.js` (`out/lab/polish_shots.json`) holds the before/after shots used for this pass.
