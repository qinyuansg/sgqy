# CUBE DASH 方块大逃跑 — Final Design Brief (for engineers)

> **One sentence:** *Lure the angry red cubes into each other — BONK! — then dash through the dizzy ones to free them.*
> Tagline: **躲得漂亮，冲得刚好** — dodge with style, dash just right.

This brief is the lead designer's final call after a six-studio design panel
(Nintendo · Blizzard · Supercell · NetEase/Tencent · Cinematic VFX/Audio · Child UX).
All numbers live in `js/data.js` (`TUNE`, tables). This brief explains **behaviour
and feel**. Where this brief and data.js disagree, data.js wins for numbers.

## 0. Pillars

1. **Fun in 10 seconds, no words.** The first stage teaches itself. Icons > text.
2. **One verb, deep mastery.** DASH is a billiards cue: knock → bonk → dizzy → smash chain. Easy to learn, hard to master (Blizzard).
3. **Every action feels different.** Each action has its own hit-stop, shake, particles, sound and rumble (Nintendo/Blizzard feedback matrix).
4. **Kind to kids.** Hearts you can count, never shaming failure (哎呀! Oops!), invisible help when struggling, no losable ranks, no streaks, no real money, odds always shown.
5. **Bright sci-fi.** The poster's candy-pastel clay-toy look + holograms, neon rims, portals and planets. Never dark or gritty on the play field.

**Colour law (never break):** RED = cube that hurts · ORANGE striped ground decal = incoming attack · YELLOW stars + pink-white tint = smash me now · WHITE/CYAN = freed friends · CYAN gems = crystals · PINK = hearts · GOLD = treasure/legendary · BLUE family = you.

---

## 1. Core loop & hero feel — `gameplay-A` (run.js, player.js, upgrades.js, pickups.js)

### 1.1 Movement (`TUNE.player`)
- Analog, max 6.5 u/s (hero-specific), accel 60, decel 40 (tiny slide = weight). World friction (ice) multiplies decel; conveyors add velocity.
- Reversing >120° above 70% speed → 0.08 s skid + dust puff + squash.
- Walk animation via hero model (hop cycle, lean into velocity). Clamp inside `arenaRadius − 0.5`.
- Hurtbox radius 0.42 (smaller than the visual: generous).

### 1.2 Dash — the cue stick (`TUNE.dash`, hero `dashKind`)
- Active on frame 0. 0.18 s, ~4 u, ease-out velocity `v(t)=v0·(1−t/T)^0.6`. i-frames 0.24 s. Cost = hero `dashCost` stamina. 0.2 s cooldown. **0.12 s input buffer** (presses during end-lag/hit-stop are queued).
- Direction = stick; neutral stick = facing. **Aim assist:** if a *smashable* cube is within `aimAssistRange` and within ±25° (touch ±32°) of the input direction, snap to it; with neutral stick, target the nearest smashable within 5 u. Healthy cubes are never assisted.
- **Hold dash after the burst = SPRINT** (the source game's Shift sprint): ×1.35 speed, drains 30 stamina/s.
- **Hitting a NON-smashable cube = KNOCK**: `em.knock(e, dir, TUNE.knock.speed × cardMods.knockMult)`. The dash ends, hero recoils 0.6 u, no damage (i-frames). Knocked cubes fly like billiard balls; if they hit another cube or the rim they BONK (handled in enemies.js).
- **Hitting a SMASHABLE cube = SMASH** (pierce): the dash continues, +0.05 s per smash (cap +0.15), refund 8 stamina per smash. Chained smashes within one dash / within `chainWindow` climb the pentatonic ladder (emit `combo` and include `combo` in `enemy:smash`).
- Hero dash kinds:
  - `knock` (Blu): as above.
  - `bash` (Mochi): shorter, heavier; knock speed ×1.4 and can knock **Bruisers**; bash also dizzies healthy S cubes directly.
  - `blink` (Zap): instant teleport `dashDist` (stop at the rim), sparks radius 1.6 at departure AND arrival dizzy cubes 1.2 s (Bruisers immune). Passing through dizzy cubes along the blink line smashes them. Passive Static: 3 blinks within 2 s → chain lightning smashes the 3 nearest dizzy cubes.
  - `well` (Stella): normal knock dash, plus drops a Gravity Well at the dash start (1.8 s, r 3.5, pulls cubes 6 u/s toward centre; max 2). Pulled cubes that collide bonk. Passive Starlight: dizzy cubes within 3 u drift toward her; dizzy +0.5 s.
  - Mochi passive Bouncy Belly: walking into a healthy cube bumps it at 6 u/s (1.5 s cooldown per cube) — no damage while bumping from the front.

### 1.3 Stamina (`TUNE.stamina`) — source DNA
- Max 100 (+cards). Regen 38/s after a 0.45 s delay since the last spend.
- Hitting 0 → **TIRED** for 1.6 s (assist 1.0): can't dash, walk ×0.85, stamina visibly refills to 40% during it, sweat drops + panting (hero model `tired`), puff sound on dash presses (`player:staminaEmpty`, `player:staminaBack`).
- Shown as a pip ring on the floor under the hero (pips = floor(stamina / dashCost)) — visible only when not full — plus the poster's ⚡ bar in the HUD.

### 1.4 Perfect Dash — 冲得刚好 (`TUNE.perfect`)
- At dash press: PERFECT if `em.threatTTC(...) ≤ ttc` (0.2 s; assist 0.3; Blu +0.05; card Just Right adds) **or** an active hazard in `run.hazards` overlaps the hero within the first 0.12 s of the dash.
- Effect: `G.slowMo(0.3, 0.45)` (slow-mo at most once per second; the rest always happens), shockwave `em.dizzyRadius(x, z, 3.5(+bonuses), 2.0)`, refund 40 stamina, +8 nova, +3 style, big gold **PERFECT!** stamp, zoom punch. Emit `player:perfect`.

### 1.5 Near-miss — 躲得漂亮
- A harmful cube passes within `radiusSum + 0.6` while closing and the hero isn't hit → `player:nearMiss`, +1 style, +1 nova; at most once per cube per 1.5 s. Flavour only, never required.

### 1.6 STYLE combo (one counter)
- +1 near-miss, +1 bonk (any bonk while the run is live), +1 smash, +3 perfect. Resets after 3 s without a gain (`combo:break`). Tier words at 10/25/50/100 (`TUNE.style.tiers`) → `combo:milestone`; tier = score multiplier and music layer.

### 1.7 Hearts (`TUNE.player`)
- Hero `hearts` (+2 in assist). Contact with a `harmful` cube costs its `hearts` (1 or 2). Hazards cost their `hearts`.
- After a hit: 1.2 s i-frames (hero blinks 8 Hz alpha), knockback 1.6 u away from the source, 110 ms hit-stop, shake 0.45, `player:hurt`. Shield (Bubble card / Galaxy Guard) blocks first → `player:shieldBlock`.
- Heart drops from smashes: p = 0.03 + 0.05 × missing hearts (cap 0.25), ×guardian. Heal pickups `player:heal`.
- Death → state `dying`: hero spins dizzy 1 s, then `run:end {win:false}`. **1-1 is unloseable** (hearts can't drop below 1).

### 1.8 NOVA (Space / B / right button) (`TUNE.nova`)
- Charge 0..100 from actions (smash 3, bonk 1, perfect 8, near-miss 1, crystal 0.5, passive 0.3/s); ×1.5 when ≤ 2 hearts; ×FEVER; ×cards. When full: `nova:ready`, hero glows gold (`anim.glow`), touch NOVA button pulses (`input.setNovaReady`).
- Cast: `G.slowMo(0.2, 1.0)`, hero rises + flash, `nova` event, then the hero's effect:
  - `bigbang` (Blu): `em.nova(x, z, 8)` — smashes light types, dizzies heavy ones (Bruiser/Beamer) 4 s, boss +1 crack & dizzy.
  - `mega` (Mochi): 6 s giant (×2.5), invulnerable; touching cubes smashes light / dizzies heavy; stomp every 0.5 s dizzies r 3 for 1 s.
  - `storm` (Zap): 12 bolts over 2.5 s, dizzy targets first then nearest; each smashes (or dizzies heavy).
  - `blackhole` (Stella): 3 s pull r 11 (cubes orbit & bonk), then implode: smash everything within 4, dizzy the rest 3 s.
- Stage 1-1's last wave pre-fills Nova (`novaFill: true`).

### 1.9 XP, level-ups & cards (`TUNE.xp`, `CARDS`, `EVOLUTIONS`, `CARD_RULES`)
- Smashes drop CYAN crystals (value by size) that pop out, bounce, then magnet to the hero within 2.2 u (cards extend). Crystals give XP; level-up → run state `levelup` (game frozen, world blurred via UI), emit `player:levelup {level, choices}`.
- Offer 3 cards from `meta.unlockedCards()` (+ evolutions), weighted by rarity (common 60/rare 30/epic 10, +2 epic per world), epic pity after 4 offers without one. 6 slots, max level III. If an evolution is eligible (card A at III + card B owned) it is forced into slot 1 (gold beam). 1 free reroll per stage.
- **Tag set bonus:** owning 3 cards of one tag (⚡💥🛡✦) grants `TAGS[tag].bonus` once.
- Every card must *visibly* change a verb (Nintendo toy rule). Effects (implement all 19 + 6 in upgrades.js):
  boots dash dist ×(1+v) · battery max stamina +v · quick regen ×(1+v), delay 0.2 at III · comet: dash leaves a trail (instanced glowing segments) that dizzies cubes v s · justright: perfect ttc +v, shockwave +1 u/level · punch knock speed/distance ×(1+v) · chain knocked cubes get +v extra hops · rim: the rim bounces cubes back at v× speed, rim-bonk dizzy +1 s · stars dizzy +v s · pop: smashed cubes burst radius v knocking neighbours (`em.pushRadius`) · sats: v orbiting mini blue cubes (r 2, 200°/s) knock+dizzy 1 s on touch (1.2 s cd each) · bubble: shield recharging in v s · snack +1 max heart & heal · friends: freed cubes ram the nearest red cube (knock) with chance v · dodgeheal: every v near-misses heal 1 heart · magnet pickup radius v · core nova gain ×(1+v) · mininova: every v smashes an auto mini-nova r 3.5 (smash dizzy, dizzy others 1.5 s) · timemagic perfect slow-mo +v s and cubes within 6 u slowed 40% for 2 s.
  Evolutions: meteor (dash smashes non-heavy cubes outright; fire trail dizzies 2.5 s) · pinball (knocked cubes ricochet up to 6 times; impacts smash dizzy cubes; rim flashes) · guard (4 sats that smash dizzy cubes; shield pop blasts sats outward) · supernova (nova ×1.5 radius + 5 s star field r 6 that dizzies entrants; mini-nova every 5 smashes) · reaction (bursts r 3 smash dizzy cubes they touch, which burst again; cap 30 links/s; "×N 连爆!") · timestop (a perfect freezes all enemies 1.5 s, frozen = smashable).
- Expose derived numbers as `run.cardMods` (knockMult, extraHops, rimBounce, dizzyBonus, novaMult, magnet, perfectTtcBonus, perfectRadiusBonus, dashDistMult, staminaMax, regenMult, …) so enemies.js can read them.

### 1.10 Pickups (pickups.js)
- One instanced mesh per pickup type: crystal (cyan octahedron with glow, bob/spin), heart (pink rounded heart shape or pink cube with ♥), coin (gold coin), magnet (rare: pulls every crystal on the map). Pop-out arc with bounce, magnet acceleration, collect sparkle (`pickup:*` events). Despawn after 15 s (blink last 3 s). Cap 300 live.

### 1.11 Run flow & objective (run.js)
- `start()`: world is loaded by main. Spawn hero at centre (`player:spawn`), `run:start`, then intro: `await G.cam.cinematic('intro', {...})` — the camera flies in from space (≤ 2.5 s first visit per world; replays skip to a 0.8 s swoop; any button skips). Then countdown 3-2-1-GO (`run:countdown`, `run:go`) — 1-1 skips the countdown.
- **Objective bar:** a stage = its waves, but the HUD shows ONE bar: *freed / total cubes in the stage* (`run.progress`, `run.freedCount`, `run.totalCubes`). Boss stages show the boss bar instead.
- **FEVER finale** when progress ≥ 80% (`TUNE.fever`): banner 超载时刻 FEVER!, crystals ×2, nova ×1.5, spawn pacing ×1.3, rim goes rainbow, music +layer (emit `fever {}`).
- Stage clear (all waves done & all cubes freed, or boss defeated): last smash → `G.hitStop(130)` then `G.slowMo(0.2, 1.0)`, `G.cam.cinematic('victory')`, freed cubes rain, then `run:end {win:true, results}`.
- ★ rules: ★1 clear · ★2 lost ≤ 2 hearts in total · ★3 stage challenge `stageDef.objective` (`kind`/`target`; track counts: chain = max smashes in one dash; rimBonk; perfect; bombMulti = max cubes freed/dizzied by one popper blast; bumperBonk; laserDizzy; bruiserBowl = bruisers dizzied by knocked cubes; novaMulti = max cubes freed by one nova; iceBonk = bonks on ice; fastClear = clear under N s; coinCube). Show the ★3 pictogram before the stage and progress in the HUD (`objective:progress`).
- **Guardian (hidden DDA, `TUNE.guardian`)**: stress from recent hits → easier pacing (fewer tokens, slower spawns, more heart drops, longer dizzy). Never harder than baseline. Expose `run.guardian`.
- **Assist (Helper mode)**: +2 hearts, enemy speed ×0.8, telegraphs ×1.3, perfect ttc 0.3, strong aim assist. Stars still count.
- Pause: `run.pause()` freezes the simulation; `resume()` continues instantly and grants 0.5 s i-frames.
- `run:end` results per ARCHITECTURE §7. `run.revive()` (P1): one continue per run from the results screen: full hearts, 2 s i-frames, `player:revive`.
- Scoring: `TUNE.score` × style tier multiplier × mutator.
- Tutorial (1-1, `stageDef.tutorial`): waves carry `tutorial: 'move'|'bonk'|'knock'|'blob'|'nova'` → emit `tutorial:step {id, icon, textKey}` when that wave starts; the HUD shows an icon prompt matching the input device. Steps: move (until moved 1.5 u) → bonk ("引它们相撞!" arrow; waves.js steers the pair toward each other) → first DIZZY: `G.slowMo(0.6, 1.0)` and a dash prompt bobbing over the dizzy cube → first SMASH: 12-frame hit-stop, huge 解救! stamp → knock (sleeping pair: "撞过去!") → blob → nova ("按空格!" when full). Each prompt shows until satisfied, max twice ever (`save.profile.tutorialDone`).

## 2. Enemies, boss, waves — `gameplay-B` (enemies.js, boss.js, waves.js)

### 2.1 AI & physics (enemies.js)
- **Steering with inertia** (not the source's perfect homing): accel `accel` u/s², turn-rate cap `turn` °/s, max `speed`. A hard juke makes them overshoot — and overshooting cubes bonk into each other.
- **Aggression tokens** (`world.tokens` ± guardian): only N cubes chase at full speed; the rest *circle* at 4–6 u at 60% speed and swap in when a chaser becomes dizzy/dies. Prevents unreadable dogpiles.
- Separation: soft push so cubes jostle (the source's clumping) without bonking. **BONK** only when closing speed ≥ `bonk.headOnSpeed` between chasers, or when a *knocked* cube hits another cube at ≥ `knock.bonkMinSpeed`, or hits the rim/bumper (rim bonk). Both cubes → DIZZY `bonk.dizzy` (+cardMods.dizzyBonus +guardian). A knocked cube that bonks passes on 0.7× speed (billiards chain, max hops `knock.maxHops + cardMods.extraHops`). 1.5 s bonk immunity after recovering. Emit `enemy:bonk` (once per pair), `enemy:dizzy`.
- Visual cue for "fast enough to bonk": knocked cubes get speed streaks (fx) and a '!' face.
- **Smashable state** (ONE look for everything): dizzy / tired Zippy / overheated Beamer / armour-broken Bruiser / boss core → EXPR.DIZZY spiral eyes, colour lerps 40% toward pink-white, 3 yellow stars orbit above (instanced), 6 Hz wobble, pulsing outline/glow. Smashable cubes are harmless; walking into one nudges it.
- `harmful` = not smashable, not in portal/dying, not treasure, not sleeping-asleep? (sleeping cubes are harmless until they wake — they wake when the hero is within 3 u or gets bonked).
- Rendering: all red cubes in ONE `CubeCrowd` (capacity ≥ 128) + instanced accessories (stars, Zippy thruster flame, Popper fuse spark, Beamer lens/pylon, Bruiser helmet, Splitter seam, elite crown) + `BlobShadows`. Faces: ANGRY chasing, CHARGE (glowing eyes) in wind-up, DIZZY when smashable, SLEEP asleep, HURT when knocked. Squash & stretch on landing/turning; enemies bob on the beat (optional: read `G.audio.beat` if present).
- Portal spawns: `enemy:spawnWarn` opens a portal ring + sky beam at the spot for `TUNE.spawn.portalTime` (W1 1.5 s), never within 3.5 u of the hero; the cube drops in from above with a squash landing (`enemy:spawn`). Enemies in portal state are not harmful.
- Knocked out of the arena? No — the rim is a wall (bounce + rim bonk). Glitch-tile holes (W6): cubes over a vanished tile fall and are freed (counts as smash without crystals? — counts as freed, drops 1 crystal).

### 2.2 Enemy types (`ENEMIES`)
- **Grumpy** S/M/L — the source cubes (size ↔ speed ↔ damage).
- **Zippy** (orange wedge with thruster): when the hero is within `triggerRange` and it has line of sight, it stops, faces the hero and winds up for `windup` s (W1–2 1.0 s, later 0.7) with floor CHEVRONS filling base→tip (orange striped decal, white flash for the last 0.15 s) and a rising rev sound (`enemy:windup`); then charges `chargeDist` at `chargeSpeed` in a straight line (hazard for Perfect detection). Anything it hits is knocked (cubes bonk); at the end (or hitting the rim) it is TIRED (smashable) for `tired` s. Cooldown 3.5 s.
- **Splitter** (seam glowing): on smash spawns 2 mini S grumpies (0.65) that pop out and are briefly dizzy 0.6 s (so a pierce can chain them).
- **Popper** (rounded, sparking fuse): arms when within `armRange` of the hero → fuse `fuse` s blinking 2→8 Hz with a ticking sound + orange radius decal; when KNOCKED it ignites with a short fuse `knockedFuse`. Explodes: `enemy:explode`, radius `blastRadius` — smashes dizzy cubes, dizzies+knocks others, hurts the hero (1 heart) if inside. Using poppers as weapons is the lesson. Popper itself is freed by its explosion (drops crystals).
- **Beamer** (pylon + lens eye, stationary): cycle: telegraph `telegraph` s (thin line decal on the floor + a thin aiming beam in the air, pulsing) → sweep `sweepDeg` over `sweepTime` s (beam 0.45 wide, `beamLength` long; hazard 1 heart; dizzies red cubes it touches = `dizzies:true`) → OVERHEATED (smashable, steaming) `overheat` s → cooldown. Knocking an overheated... (it's smashable, so dash smashes it). Knocking a non-overheated Beamer rotates it 90° (it's heavy; `mass` 2.5).
- **Bruiser** (2 u, steel helmet with horns, dark crimson): slow; bowls lighter cubes aside (knocks them — which can bonk!). Knocks from the hero don't move it (except Mochi) but add a crack pip (3 pips = dizzy `dizzy` s). Popper blasts, lasers, Zippy charges and cubes knocked into it also add pips; a Nova dizzies it. Metallic CLANG + helmet sparkle when hit without effect.
- **Coin Cube** (gold, top hat, treasure): appears once per normal stage at a random time 40–110 s (`stageDef.coinCube`), 'ding-ding'; flees at 5.5 u/s, never harms; each knock = +1 (3 within 12 s → coin fountain `pickup:coin` ×30 total, `enemy:freed`); escapes through a portal laughing after `lifetime` s. Not counted in the objective.
- **Elites (P1)**: from W5 / endless: gold crown + outline; affixes shielded (first knock pops a bubble) / speedy (+40%). Drop a big crystal (XL).

### 2.3 King Glitch (boss.js, `BOSS`)
- One rig: 3.6 u red cube with a floating crown, a magenta **core crystal** on its face that opens only when DIZZY; angry face; glitch scanline flicker. Lives in `em.boss`; rendered with its own meshes (not the crowd).
- **HP = cracks** (`BOSS.cracks[world]`). Dashing the open core = 1 crack, a perfect dash into it = 2, a nova = 1 + dizzy 3 s. Each crack: 180 ms hit-stop, core shards, crack decal on the body, `boss:hit`.
- **Stagger bar** (0–100): knocked cube hits boss +34, bonk within 3 u +10, perfect near boss +15, decays 5/s; full → DIZZY 4 s (expert opener).
- Moves (telegraph → active → punish), availability by world (`BOSS.moves[m].world`), rotations by phase (`BOSS.rotations`), 1 s between moves:
  1. **Hop Slam**: crouch 0.4 s + red circle under the HERO filling over 1.0 s → arc 0.6 s → lands exactly when full (2 hearts in the circle) → shockwave ring expanding 3.5→16 u at 7 u/s (0.6 band, 1 heart; dashing through it = PERFECT) → boss DIZZY 2.5/2.0/1.5 s (by phase) = punish window. `boss:slam`.
  2. **Minion Call**: roar 0.8 s, 3 rim portals, 4/6 grumpies, idle 1.5 s (knock minions into the boss to fill stagger).
  3. **Ram Charge** (W2+): lane decal 2.5 u wide fills 1.2 s (aim locks at 0.9 s) → charges at 16 u/s to the rim → WALL-BONK DIZZY 3 s.
  4. **Laser Spin** (W3+): 2/2/4 beams from the faces, line decals 1.0 s, rotate 50/50/70 °/s for 4 s (1 heart per 0.5 s; dizzies cubes). No punish (dodge move).
  5. **Glitch Rain** (W4+): 8/8/12 shadow circles (r 1) 0.1 s apart, cubes fall 1.2 s later (1 heart), landed cubes are DIZZY 2 s (free smash buffet).
  6. **Double Slam** (W5+, phase 3): two slams, second fill 0.7 s, rings 0.8 s apart.
  - **Phase shift** at 66%/33% cracks remaining: invulnerable 2.5 s, rises, pushes the hero back 4 u (no damage), remaining minions are freed, rim recolours, music layer, banner 第二阶段 / PHASE 2 (`boss:phase`).
  - **Enrage** after `enrageAt` s: darker red + steam, speed +20%, telegraphs −15% (floor 0.7 s). Never an instant kill.
  - **W6 finale — Glitch Core chase**: when cracks reach 0 in world 6 the shell bursts; a 1 u core flees zig-zag at 7 u/s dropping mines (1.5 s fuse, r 1.5) every 2 s; 3 dash hits (each knocks it to the rim, 1 s dizzy). Final hit → 0.1× time, orbit cam, white flash, sky turns blue.
- Intro: `boss:intro` (camera shot + name card 故障大王 KING GLITCH + roar), ≤ 3 s, skippable. Defeat: `boss:defeat` → run victory. The boss rescue unlocks a hero (`WORLDS[i].boss.rescue`): results include `rescued: heroId`.

### 2.4 Wave director (waves.js)
- Plays `stageDef.waves` in order. A wave starts when the previous wave's cubes are all freed (or ≤ 2 remain and 3 s passed — keeps momentum). Groups spawn after `delay`, one cube every `gap` s, at positions by `pattern` (portal = random ring point ≥ 3.5 u from the hero; ring = evenly around radius 0.8R; sides = left/right; corners = 4 diagonals; center = near centre but ≥ 3.5 u from the hero; line = a row). Respect `world.maxAlive` (queue the rest). `speedMult`, `opts.sleep`, `size` pass through. `steerTogether` (1-1) biases the pair toward each other.
- Emits `wave:start`/`wave:clear`, feeds `run.totalCubes` (sum of all group counts + splitter minis) at construction, `run.onStageCleared()` when all waves are done and no enemies remain.
- Boss stages: spawn the boss (`em.boss = new Boss(...)` via enemies API) after the intro.
- **Endless (Galaxy Survival)**: arena radius 14; world theme cycles every 5 waves; wave n count = 8 + 2.2n, enemy roster grows with n (introduce types in world order), elites every 3 waves, a boss every 10 waves; `DATA.modes.endless.warpGate`: every 60 s a warp gate opens for 10 s — stepping in ends the run safely banking score ×1.25. Daily mutator (date-seeded from `MUTATORS`) applies.
- **Daily Challenge**: a seeded 8-wave mix + today's mutator.
- **Shrink Storm**: 150 s, radius shrinks at the listed times (`run.arenaRadius`, `world.setPlayRadius(r)`), outside = 1 heart every 1.5 s, spawns from the edge; score = freed; medals.
- **Boss Rush**: King Glitch with each world's module back to back; +1 heart between bosses.

## 3. Visuals — `visuals` (world.js, post.js, camera.js, fx.js, hero_model.js)

### 3.1 Worlds (`WORLDS[i].palette`)
Every world = floating round arena + sky + set pieces, all procedural:
- **Arena floor**: a disc (radius `arenaRadius`) of soft sandy/pastel colour (`floor`) with a subtle hologram grid (`grid`) and concentric rings, very matte and bright (readability!). A thin inner glow line near the edge. Underside: a floating-island rock/tech base with glowing underlights, visible from the fly-in.
- **Rim**: chunky rounded blocks (poster's green block rim) in `rim` colour with an emissive neon strip (`rimGlow`) that can pulse (`pulseRim`) and cycle rainbow in FEVER (listen to `fever`).
- **Sky**: gradient dome shader (`skyTop` → `skyBottom`) with soft stars/nebula for dark worlds, a big planet with rings (`planet`) and a sun glow, a rainbow arc in W1, drifting cloud sea below the arena (instanced soft puff spheres or billboard sprites), floating cube islands in the distance (instanced), sparkles.
- Set pieces per world: W1 Cloud Harbor — pastel clouds, rainbow, floating cube houses & a harbor tower, blimps. W2 Neon Ring — planetary ring road with neon posts, holographic billboards, **3 bumper pillars** (glowing, bounce animation when hit). W3 Crystal Moon — crystal spires, aurora, **ice patches** (glossy light-blue decals). W4 Bomb Nebula — candy nebula clouds, floating fireworks bursts in the distance. W5 Laser Foundry — factory towers, rotating gears/rings, **2 conveyor belts** (animated chevron texture). W6 Glitch Core — dark violet void with a pulsing core star, glitch shards, **glitch tiles** that flicker then vanish (holes to the void) on a timer.
- Gimmick query API (ARCHITECTURE "World gimmick queries"), `world.setPlayRadius(r)` for Shrink Storm / W6 (animated storm wall at r), `world.pulseRim(color)`.
- Lighting: hemisphere + directional (for world meshes), and call `setCharacterLighting` from art.js per world so cube shading matches.

### 3.2 Camera (camera.js)
- Gameplay: fixed 3/4 top-down, pitch ~55°, FOV ~42°, never rotated by the player. Fit the whole arena on desktop 16:9 (distance so the arena diameter fills ~92% of the short axis on phones, zoom ×1.2 when height < 500 px); follow the hero with a lead toward movement (≤ 1.5 u, lerp), dead-zone on phones. `worldToScreen` for HUD.
- Trauma shake (offset = trauma² × 0.35 u, roll 1.2°, decay 1.8/s; settings multiplier; cap), zoom punch `kick`, FOV kick +3° on dash (listen `player:dash`).
- Cinematics (return Promises; emit `cine:start/end`; any `confirm`/`dash` skips): `intro` fly-in from space through clouds to the gameplay framing (≤ 2.5 s, 0.8 s swoop on replays via opts.short), `boss` (push-in on the boss while it roars, name card is DOM), `victory` (slow 120° orbit around the hero), `defeat` (slow push-in on the dizzy hero), `nova` (quick pull-out and back).
- Hub mode: framing the hero on the arena centre from the front at close range (Brawl Stars home-screen style), gentle sway, idle.

### 3.3 Post (post.js)
- EffectComposer: RenderPass → UnrealBloomPass (threshold high ~0.85 so only emissive/glow blooms; strength ~0.6; half-res on low quality) → custom ShaderPass (radial chromatic aberration pulse, vignette incl. red danger vignette, flash, subtle colour grade/saturation per world) → OutputPass. Pulses: hurt (CA 0.6 → 0 over 300 ms + red vignette), perfect (white flash ≤ 0.2 alpha + CA 0.4), nova (bloom spike). `reduceFlash` setting disables CA and caps flashes. Always keep the play field readable.

### 3.4 FX (fx.js) — listens to the bus
Instanced/pooled systems: cube shards (small rounded cubes in the enemy colour, gravity, bounce on floor, fade), sparks, dust puffs (soft white spheres), confetti (victory), rings (flat expanding shockwave rings), stars (yellow star sprites for bonks), crystal sparkles, heal hearts, dash afterimages (4 ghost copies of the hero colour, 150 ms fade) + dash ribbon trail (hero trail colours), speed streaks on knocked cubes, portal (ring on the ground + sky beam + swirl, for `enemy:spawnWarn`), freed cubes (white happy cube with cyan glow pops up 1.2 u, spins, waves, then rockets up on a sparkle trail within ~1.2 s — can't collide), comic text is DOM (HUD) not fx. Event map: `enemy:smash` → shards + ring + freed (`enemy:freed`); `enemy:bonk` → star burst + impact ring; `player:perfect` → gold ring + sparkles; `nova` → huge ring + light pillar; `player:hurt` → red sparks; `enemy:explode` → orange blast + ring; `boss:slam` → dust ring; `pickup:*` → sparkle; `player:dash` → trail/afterimages; `run:end win` → confetti.

### 3.5 Hero model (hero_model.js)
- The poster hero: rounded clay cube (use `roundedBoxGeometry` + `createCubeMaterial` from art.js — face via uniforms `uFace` = expr, blink, lookX, lookY; `uFx` flash/glow), tiny round hands and feet (spheres/capsules in a slightly darker tint), blush — animated: idle breathing, blink every 2–5 s, walk hop cycle (feet alternate, hands swing), lean into velocity, squash/stretch spring (k≈320, damping≈16), dash stretch 1.35 along / 0.8 across, landing squash, tired (sweat drop meshes + panting), hurt (HURT face + flash), celebrate (jump + JOY face), nova glow.
- Per hero silhouette touches: Blu (small antenna), Mochi (rounder/softer, bandage), Zap (lightning-bolt hair spikes, blue outline accent), Stella (star tiara). Skins = body colour (+ 'galaxy' or 'shine' pattern variants via material params), hats (`HATS` ids) as small meshes on top, trail colours from `TRAILS`.

## 4. UI, HUD & meta — `ui/meta` (css/style.css, ui.js, hud.js, meta.js)

### 4.1 Look
Poster style: chunky rounded white/sky-blue panels with soft shadows, thick outlined bubbly display font (use a CSS stack: `"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui` with heavy weight + text-stroke/shadow for the 3D-ish title look), big icon buttons, keycap-style control hints (like the poster's bottom strip). Bright, friendly, 44 px+ touch targets, spring animations (`cubic-bezier(.34,1.56,.64,1)`), `prefers-reduced-motion` respected. Glass panels over the 3D scene. Chinese primary; English toggle; layout must survive English strings 1.6× longer.

### 4.2 HUD (≤ 5 elements, hud.js)
Top-left: hearts row (♥ icons; colour state green→yellow→red per source DNA as a thin bar under them) + ⚡ stamina bar (poster). Top-centre: objective bar "解救 18/25" (or boss bar with cracks + stagger sub-bar) + ★3 pictogram progress + small timer. Under it: thin XP bar with level. Bottom-right/centre: NOVA meter ring (keyboard/gamepad users see a key hint "空格/Space" when ready). Combo counter near the hero only when ≥ 5 (world-anchored via `cam.worldToScreen`), tier words pop. Banners: wave/FEVER/boss/phase/NEW ENEMY cards (`stageDef.newEnemy` → 2 s spotlight card with the enemy tip). Comic pop texts: BONK! 💫, SMASH/解救!, PERFECT! (huge gold), +crystal, ♥. Tutorial prompts: device-aware key icons (WASD/stick/joystick, Shift/A/DASH, Space/B/NOVA). Off-screen threat arrows at the screen edge for portals/boss (if outside view). Letterbox bars on `cine:start`. Pause button (touch).

### 4.3 Reward pipeline & red dots (Chinese-market conventions, ethical)
- **One entry point** `meta.grant(rewards[], source)` → queues a **领取 claim popup**: 70% dim, rotating light rays, "恭喜获得 You got!" title (0.25 s scale 0.6→1 overshoot), items stagger in 80 ms apart with rarity borders, big 领取 button pulsing 1.0→1.06 at 1.2 Hz; on claim up to 12 coin/ticket icons fly along a bezier into the top-bar counter (0.5 s) and the counter ticks up (0.6 s, rising blips). Popups **never appear mid-run** (queued for results/lobby), max 3 chained, the rest go to a 待领取 tray icon with a count badge. List screens have 一键领取 Claim All.
- **Red dots (红点)** only for *claimable rewards* or *new owned items* — never for buying or "come play". One dot per top-level icon; number badge when ≥ 2; clears when the screen is opened / item seen.
- **Stat bus + goal engine** (meta.js): counters in scopes run / day (refresh at 04:00 local) / week / lifetime (+ per-hero keys), fed by bus events. Missions, achievements, dex milestones, Star Road, world chests and rank are all *goal tables* over those counters (data.js). Completed goals push into the claim queue and the red-dot tree.

### 4.4 Screens (ui.js)
- **Title**: big chunky 3D-styled logo 方块大逃跑 + CUBE DASH + tagline over the live 3D diorama, "点击任意处开始 / Press any key". First ever launch → straight into 1-1 (no menus, no naming). Afterwards → Home.
- **Home / Cube Island lobby** (Honor-of-Kings layout, ≤ 9 icons): the 3D hero stands centre (tap it: squash bounce + random emote face). Top-left: profile card (hero face, name, title, rank badge with ★). Top-right: coins 🪙, tickets 🎟️, 中/EN, settings ⚙. Left column (daily): 签到 Sign-in, 任务 Missions. Right column (collection): 星途 Star Road, 图鉴 Dex, 衣橱 Wardrobe, 扭蛋 Capsule, 成就 Achievements. Bottom-right: giant **开始冒险 PLAY** (→ next uncleared stage; "首胜 x2" tag when first win of the day is available; moon icon when rested bonus is active) + secondary **模式 Modes** button (Galaxy Survival shows the rank badge; Daily Challenge; Shrink Storm; Boss Rush) + 地图 Map + 英雄 Heroes.
- **Progressive disclosure**: locked systems are **hidden**, not greyed. Unlock order: Missions after 1-2 · Star Road after 1-3 · Dex after the first freed cube (post 1-1) · Wardrobe when the first cosmetic is owned · Capsule after the W1 boss (3 free pulls) · Modes/Rank after W1 (placement ceremony) · Achievements after W2. Each unlock → "新功能开启!" popup where the guide **Pixel** (a tiny white freed cube with an antenna) explains it in one sentence + icon, then an arrow points at the new button.
- **World map**: 6 planets along a galaxy path, 5 stage pads each (stars shown, ★3 pictogram, locks), uncleared planets look glitchy/grey, cleared ones colourful; world **star chests** at 5/10/15★ (shaking + red dot when claimable). Stage card → name, new-enemy icon, ★ requirements as pictograms, PLAY.
- **Heroes**: roster (locked = silhouette + how to get: "打败第2世界大王 / 签到第7天 / 星途 300"), icon stat bars, passive + nova, mastery ring (P2), select; try-on of owned skins/hats/trails.
- **Star Road 星途**: a winding horizontal road of cube nodes (freed-count thresholds), the hero standing on the current node, next 3 nodes large, claimable ones bounce + red dot; overflow chest after the end.
- **Missions**: 3 new each day (easy / skill / variety slots, targets by rank bucket), unfinished ones bank up to 9, completed-unclaimed auto-grant at refresh; icon + "× N" + progress bar (long-press shows a 3-frame demo of the verb); 1 free reroll per day; all 3 of a day → Daily Chest; "明天刷新 refreshes tomorrow". Sign-in strip (cumulative 7-day novice → loop; claimed stamped 已领取; today glows; copy never mentions missed days).
- **Wardrobe 衣橱**: skins / hats / trails; every item always listed with its source ("星途 1220", "扭蛋", "第3世界宝箱"); shop items buyable at fixed prices (`ECONOMY.prices`) — no timers, no discounts; try-on applies instantly to the 3D hero.
- **Capsule 扭蛋机**: toy gashapon (big crank, capsule drops & bounces, shell colour hints rarity, legend = rainbow shell + sky beam), 1 ticket or 200 coins, odds panel (i) as coloured bars + "约每100次出3次", pity bars ("距离必出史诗: 3次"), only unowned items drop, completed rarity → coin refund, 20/day cap, hidden when the parent toggle is off.
- **Dex 图鉴**: 8 entries (7 types + King); undiscovered = silhouette "?" + "出没: 第3世界"; discovered = happy freed form + freed name + kid fact + count + milestone frames (x1/x25/x100/x300 rewards); cards tab (seen cards with rarity frames, evolution recipes after discovery).
- **Achievements**: 16 × bronze/silver/gold, gold grants a title; profile card with name (pick-list like 勇敢的小蓝队长, or ≤ 8 chars typed), title, rank badge, 3 pinned badges, stats.
- **Rank 段位**: material tier + ★ (never decreases). Rank-up ceremony (4 s, skippable after 1 s): old badge cube cracks → shatters → reforms into the new material with bloom → name slams in → confetti + hero jump → rewards 领取.
- **Settings**: 中文/English, music & SFX, screen shake (off/low/normal), reduce flashing, haptics, Helper mode, quality (auto/high/low), controls help (keyboard / gamepad / touch diagrams), **Parent zone** behind a math gate ("37 × 4 = ?"): daily play limit off/30/45/60/90, capsule on/off, 7-day play-time history; save export/import code; reset progress (double confirm).
- **Level-up cards**: game frozen, world dimmed + blur, 3 big cards fan in (rarity frame, icon, name ≤ 6 chars, one-line desc, level pips, tag icon, evolution-partner icon); **0.6 s input guard**; pick by click/tap, ←/→ + confirm, or 1/2/3; reroll button; evolution card drops in a gold beam.
- **Pause**: resume, restart, home, settings, shows the ★3 challenge.
- **Results cascade 结算** (≤ 5 s, tap to speed up, Skip; replays of the same stage compress to 2.5 s): ① stars stamp one by one (rising notes, thud) ② score count-up + personal best ③ trophies bar (+N, inline ★-up pop; tier-up queues the ceremony) ④ Star Road bar fills with freed cubes ("还差 12 → 🎁") ⑤ mission chips tick ⑥ Dex "NEW!" cards ⑦ reward row (coins, first-win ×2, rested ×1.5). Buttons: **再来一局 Retry** / **下一关 Next** (default focus on win) / 分享 Share / 大厅 Home. Fail → **哎呀! Oops!** with "差一点！18/25", a tip keyed to what hit you (e.g. "冲冲方只走直线：往旁边闪!"), Retry default, partial coins; after 2 fails on a stage Pip offers Helper mode. Rescued hero → full-screen reveal. Break reminders and rank ceremonies only here / in the lobby.
- **Share poster** (P1): 1080×1350 canvas in the style of the game poster (pastel sky, clouds, rainbow, chunky outlined logo, a hero drawn with 2D canvas shapes, rank badge, title, 2×3 stats grid, date, **挑战码 challenge code**: 6 chars encoding an endless seed + hero; entering a code in Modes starts the same seeded endless run). Download PNG / `navigator.share` when available. No personal info.
- **Play-time guardian**: only active time counts; after a run at 30 min → soft toast "已经玩了30分钟啦，眨眨眼休息一下吧"; at 45 min (then every 20) → break card with Blu stretching + 20 s "look far away" eye-rest animation: 休息一下 (grants **rested bonus**) / 再玩一会. Never mid-run. Rested bonus: ≥ 15 min away → next 3 runs ×1.5 coins (moon icon on PLAY). Night (21:30–06:30): lobby sky turns night, Blu yawns, one-time "夜深啦，明天再来冒险吧" (nothing blocked). Parent daily limit → after the current run a "今天的冒险完成啦!" screen with Blu asleep (parent can add +15 via the gate). Welcome-back gift after ≥ 7 days away (never mentions missed rewards).
- Toasts, reward popups, rescue ceremony, achievement pop, "NEW ENEMY" spotlight card before a stage that introduces one.

### 4.5 Meta (meta.js) — persisted in `save.profile`
Coins + tickets (only spendables), 解救数 (drives Star Road), trophies (rank; +10 per first-time star, +25 per boss first clear, endless par-based per `ECONOMY.trophies`, assist ×0.5), stars per stage, best scores, unlocks (stage n+1 when n cleared; world w+1 when w's boss is beaten), heroes (any path in `HEROES[i].unlock`; duplicate → 3 tickets), cosmetics owned/equipped per hero, cards unlocked (starter + Star Road), missions bank + daily refresh + reroll + daily chest, sign-in, capsule counters (epic/legend pity, daily count, onboarding free pulls), achievements tiers, dex counts & milestones, world chests, first-win-of-day, rested bonus, play-time accounting, parent settings, profile (name/title/pins). `applyRun(results)` updates stats & goals and returns a breakdown for the results cascade: `{coins, coinsBreakdown[], tickets, trophies, trophiesBefore, rankBefore, rankAfter, freedBefore, freedAfter, roadNext, missionsProgress[], newDex[], unlocks[], rescued, newBest, starsNew[]}`. Clock guard: if the clock moves back > 1 h, freeze daily refreshes until real time catches up (silently).

## 5. Audio — `audio` (audio.js)
- 100% WebAudio synthesis. Master → music bus + sfx bus (+ compressor). Unlock on first gesture.
- **Music**: a step sequencer (look-ahead scheduling) per track: title/hub (gentle, bouncy), w1..w6 (key/BPM from `WORLDS[i].music`: pentatonic melodies, chiptune-meets-synthpop: square/triangle lead, saw pad, sub bass, noise drums), boss (minor, driving), endless, victory jingle, defeat ("oops" descending). **Adaptive layers** switching on bar lines: L0 pad+bass always; L1 drums during play; L2 arpeggio when style ≥ 10; L3 lead hook when NOVA ready; FEVER +8 BPM + 16th hats; ≤ 1 heart → low-pass 1.2 kHz + heartbeat kick; slow-mo → music low-pass 450 Hz −6 dB. Count-in drum fill at `run:countdown`. Expose `audio.beat` (0..1 phase) for things that bob on the beat.
- **SFX** (never quantised; pitch snaps to the current key): dash whoosh (band-passed noise sweep), knock "boing" (square 300→150 Hz), bonk (woodblock + clang 880/1320 Hz + boing), smash crunch (noise burst + pentatonic chime that climbs one step per chained smash, up to 2 octaves, resets after 1.2 s), freed cheer (tiny rising chirp), perfect (bell chord Cmaj9 + whoosh-in), near-miss whoosh panned by side, crystal pickup ping up the scale, heart pickup, coin, hurt "oof" squeak, tired puff/wheeze, nova (riser → boom + shimmer), level-up fanfare, card rarity chimes (1/2/3-note, legend choir), portal warp-in, zippy rev (rising), popper tick (accelerating) + explosion, beamer hum + zap, bruiser clang, boss roar (low detuned saws + noise), boss slam boom, phase shift, victory, defeat oops, UI click/back/claim/buy/error/capsule crank/unlock/rankup/star stamp. Hero motifs (3 notes) on nova ready & victory.

---

## 6. Health & ethics checklist (everyone)
No real money, no ads, no loot boxes for money, odds displayed, pity, no duplicates, no timers on rewards, missing days never punished, ranks never go down, break reminder only between runs, reduce-motion/flash options, readable text sizes, colour-blind safe (shapes + icons back up every colour cue), failing is funny not shameful.

---

## 7. FINAL Kid-UX revisions — these OVERRIDE anything above (numbers are already in data.js)

The child-UX designer audited everything for a 10-year-old. Implement these exactly:

1. **Four-Rule Core Promise** (engine invariants, never broken by any enemy or mode):
   ① a red cube touching you = −1 ♥ unless you are dashing · ② cubes that crash (into each other, the rim, a knocked cube, a Zippy or a blast) → ⭐ dizzy · ③ dash into a ⭐ cube → 解救! POP · ④ dash just before a hit → 完美! PERFECT.
   Corollaries: dashing is ALWAYS invulnerable; dizzy cubes are ALWAYS harmless. The pause menu shows these as 4 wordless icon panels ("How to play").
2. **Every hit costs exactly 1 heart** — cubes, lasers, boss, explosions alike. Bigger cubes = bigger knockback instead. After a hit: 1.5 s i-frames, hero pulses 6 Hz (not a grey swap), heart-shatter anim top-left. At 1 heart: heartbeat + soft **pink** vignette (never a red flash).
3. **Perfect Dash**: window 0.30 s (assist 0.45) on time-to-contact, or gap ≤ 0.5 u. **"!" cue**: a white "!" pops above the hero + soft "ting" when any threat's TTC ≤ window + 0.2 s — expose `run.perfectCue` (bool, per frame) and let the HUD/hero draw it. A too-early press is just a normal safe dash.
4. **TIRED**: 1.3 s, move speed NOT reduced, sweat drop + grey pips + "puff" and a pip shake on every failed dash press. **No TIRED in assist.**
5. **BONK**: closing speed along the contact normal ≥ 3.0 u/s, or either cube knocked/charging; 1.5 s cooldown per pair; slow clumps only get soft separation (never bonk).
6. **DIZZY 3.0 s**: 3 stars orbit and **one fades each second** (countdown without numbers); the cube tilts ~15° and wobbles; last 0.5 s it shakes and the brows return (wake-up warning). Walking into a dizzy cube nudges it gently.
7. **Billiard bump is mandatory**: a dash into a healthy cube always knocks it (Bruisers: the hero bounces off, +1 crack pip); **S-size / mini cubes are dizzied directly by a bump** so the very first dash always pays off.
8. **Splitter**: when KNOCKED or smashed it splits into **2 minis that are already dizzy for 2 s** (a jackpot, never a punishment).
9. **Zippy**: striped arrow decal, backs up 0.3 u while winding up; hitting a cube = BIG BONK (both dizzy 3.5 s); hitting the rim = Zippy dizzy 3 s; charge ends with nothing hit = tired (smashable) 1.8 s.
10. **Popper**: beep… beep… beep-beep-BOOM over 2.0 s with an exact-radius (3.0 u) striped ground ring; blast dizzies healthy cubes (incl. Bruisers), smashes dizzy ones, costs the hero 1 ♥ inside the ring.
11. **Beamer**: 1.2 s telegraph (thick dashed yellow-white line + rising whine), sweep ≤ 40°/s, beam 0.6 u, max 150° arc, dashing through is safe.
12. **Telegraph colour**: ALL danger zones are **yellow-white / orange stripes or dashes with a "!"** — never plain red (red = enemies only).
13. **King Glitch is kid-sized**: 3 / 4 / 4 / 4 / 5 / 5 core hits by world (`BOSS.cracks`), slam = growing shadow 1.2 s → shockwave rings at 6 u/s (1/2/3 rings by phase, ≥ 1.2 s apart, dashing through = PERFECT chance) → boss DIZZY 4 s with the glowing core. Laser spin only from the W3 boss: 1 beam at 30°/s with a 1.5 s telegraph and a guaranteed safe gap. Fight ≤ 2.5 min. **Phase checkpoints**: a failed boss attempt can "Retry from 🚩 phase N" (`cfg.bossPhase`), and each failed attempt on the same boss slows its attacks 10% (min 70%) (`cfg.attempt`).
14. **Second Chance (free, no ads)**: the first time hearts hit 0 in a stage, time freezes, the hero floats in a bubble, and a big button (再来一次! / dash / confirm) revives with 3 ♥, 2 s i-frames and a 6 u knockback wave. Run state `secondChance`; emits `player:secondChance` then `player:revive`.
15. **Checkpoint flag 🚩** at the middle wave of normal stages: on failure, "Retry from 🚩" restores the hearts/cards/level you had there (`cfg.checkpoint = {wave, hearts, cards, level, xp}`; run exposes `run.checkpoint` when reached and emits `checkpoint {}`).
16. **Stage ratings are 👑 crowns** (皇冠), NOT stars — ⭐ means dizzy only. Crowns are **independent and permanent** (any crown can be earned on any run and is kept). Internal field names may stay `stars`, but every UI shows 👑. The progress track is **银河之路 Galaxy Road** 🚀 (not "Star Road").
17. **Nova** is labelled **大招** in Chinese UI (EN: NOVA). Keyboard: **Space or Shift = dash**, **E / Enter / K / Q = 大招**. Touch: floating joystick on the left half, **the whole right half = dash**, plus the visible ⚡ button; 大招 button grey until full, then pulses. Pressing 大招 before full = soft "not yet" wobble.
18. **Cards**: names ≤ 4 Chinese chars, one icon line, power as level pips ●●○ — never percentages. The very first level-up ever offers only 2 cards; in the first 2 stages one card gets a "recommended" bounce. Game fully paused, no timer.
19. **HUD in stage mode**: no persistent score or combo counter. Chain callouts ("×3 连击!") pop in the world for 0.8 s. Score + multiplier appear only in Endless / results.
20. **Readability**: a permanent cyan ground ring (≈ 1.2 u) under the hero; enemies render above particles; particles within 3 u of the hero at 50% opacity; freed cubes are WHITE (never blue), non-colliding, gone upward within ~0.8–1.2 s. Spawn portals ≥ 4.5 u from the hero. Off-screen enemies/portals → edge arrow with the enemy icon.
21. **Hint whispers** (P1, HUD): wordless icon bubbles near the hero, max 1 per 60 s / 3 per stage, only in W1–2 or assist: no bonk in 45 s → "two cubes crash" icon; missed dizzy cubes twice → ⚡→⭐ icon; TIRED 3× in 30 s → pip-counting icon; 大招 full 20 s unused → button bounces; same enemy type hits you 3× → its "how to beat" card.
22. **Cube Village**: the home diorama shows one happy white villager cube per 25 freed (max 120, instanced), hopping and cheering (lead implements in main.js).
23. **Blu-speak** (audio P1): gibberish syllable blips per hero (Blu mid, Mochi low, Zap high & fast, Stella vibrato) for cheers, perfect, hero select, villagers, break reminder — paired with emoji bubbles, not text.
24. **Capsules use tickets only** (tickets are only ever earned) — no coin gacha at all; the full pool grid is visible before opening; no duplicates.
25. **Comfort caps**: shake ≤ 0.35 u with fast decay, zoom punch ≤ 5% FOV, chromatic aberration ≤ 0.003 UV for ≤ 0.25 s on heart loss and 大招 only, no full-screen flash > 3 Hz; "Reduce flashing & shake" → shake ×0.3, CA 0, bloom ×0.6, hit flashes become outline pulses.
26. **Parent Corner 家长中心**: hold the gear 3 s + a 2-digit multiplication gate; pledge "No purchases • No ads • No internet • Nothing leaves this device"; weekly play-time bars; break reminder interval; optional daily soft limit ("goodnight Blu" at the next stage end); capsule toggle; reset save.
