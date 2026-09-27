# CUBE DASH — Engineering Architecture & Module Contract

Vanilla ES modules + three.js r160 (vendored). No build step, no asset files:
every mesh, texture, face, particle, sound and song is generated at runtime.
`index.html` uses an import map: `"three": "./js/vendor/three.module.js"` and
`"three/addons/": "./js/vendor/addons/"`.

This document is the **contract** between modules. Gameplay emits events on a
bus; presentation (audio, particles, HUD, camera) listens. Modules never reach
into each other's internals — only the APIs listed here.

---

## 1. World conventions

| Thing | Convention |
|---|---|
| Units | 1 unit ≈ hero cube edge (hero size = 1.0) |
| Ground | XZ plane at `y = 0`, arena centre at origin |
| Screen mapping | camera sits on **+Z looking toward −Z**, tilted down ~52°. `input.move.x` → world **+X**, `input.move.y` (down the screen) → world **+Z** |
| Facing | a character's **face is its local +Z side**. `rotY = Math.atan2(dirX, dirZ)` turns the face toward direction (dirX, dirZ) |
| Arena | circle of radius `world.arenaRadius` (from `DATA.worlds[i].arenaRadius`). Characters are clamped inside `radius − size/2`. Enemies may be knocked slightly outside only during a "fall off" (optional) |
| Time | `dt` = scaled game seconds (0 during hit-stop, <1 in slow-mo). `rdt` = real seconds. Both clamped to ≤ 1/20 |
| Colours | three.js ColorManagement is ON: hex values are sRGB and converted automatically |

## 2. File ownership

| File | Owner | Purpose |
|---|---|---|
| `js/core.js` | lead | math, RNG, Bus, guarded storage, date helpers |
| `js/input.js` | lead | keyboard / gamepad / touch → actions |
| `js/save.js` | lead | profile persistence |
| `js/i18n.js` | lead | `t()`, `tl()`, `addStrings()` |
| `js/art.js` | lead | rounded cube geometry, face shader, `CubeCrowd`, `BlobShadows` |
| `js/data.js` | lead | **all design data** (heroes, enemies, cards, worlds, stages, economy, meta tables). Read-only for everyone else |
| `js/main.js` | lead | boot, renderer, loop, time control, app states, hub diorama, wiring |
| `index.html` | lead | shell with mount points only |
| `js/run.js` `js/player.js` `js/upgrades.js` `js/pickups.js` | **gameplay-A** | run orchestration, hero control & kits, cards, crystals/hearts/coins |
| `js/enemies.js` `js/boss.js` `js/waves.js` | **gameplay-B** | enemy AI & physics (knock/bonk/dizzy/smash), King Glitch, stage/wave director, tutorial script |
| `js/world.js` `js/post.js` `js/camera.js` `js/fx.js` `js/hero_model.js` | **visuals** | environment + arena gimmicks, post-processing, camera director, particles, hero character model & cosmetics |
| `js/meta.js` `js/hud.js` `css/hud.css` | **ui-meta** | progression & economy (stat bus, goals, rewards), in-run HUD |
| `js/ui.js` `css/style.css` | **ui-screens** | every menu / popup / ceremony / results DOM screen |
| `js/audio.js` | **audio** | procedural SFX + adaptive music |

Rules: only edit files you own. Need a tuning constant that is not in `data.js`?
Put it at the top of your own module as `const TUNE = {...}`. Register UI strings
with `addStrings()` inside your own module.

## 3. The shared context `G`

Created in `main.js` and passed as the only constructor argument to every system.

```js
G = {
  THREE, renderer, scene, camera,          // camera = THREE.PerspectiveCamera
  bus,      // Bus: on(name, fn) → unsubscribe, emit(name, payload)
  input,    // Input (see input.js header)
  save,     // Save: profile, ensure(), commit(), flush()
  data,     // DATA from data.js
  time: { now, real, dt, rdt, scale },     // updated by main each frame
  quality,  // 'high' | 'low'   (low = phones / weak GPUs: fewer particles, no bloom mips)
  world, post, cam, fx, audio, hud, ui, meta,   // systems (may be null during construction order)
  run,      // current Run or null
  app,      // App controller (main.js) — see §8
  hitStop(ms),                    // freeze game time for ms of REAL time (Nintendo hit-stop)
  slowMo(scale, seconds),         // time scale (e.g. 0.25) that eases back to 1 over `seconds`
}
```

Construction order in `main.js`: world → post → cam → fx → audio → meta → hud → ui.
Systems must not call other systems inside their constructor; wire listeners
there and look up `G.x` lazily at call time.

## 4. Frame loop (main.js)

```
rdt = min(realDelta, 1/20)
input.update()
time: hit-stop / slow-mo → dt = rdt * scale
if G.run: G.run.update(dt, rdt)          // gameplay (skips itself while paused / level-up)
else:     hub diorama update
world.update(dt, rdt)
fx.update(dt, rdt)
cam.update(rdt)
hud.update(rdt)       ui.update(rdt)       audio.update(rdt)
art.tickArt(time.now)
post.render(rdt)
```

## 5. Event catalog (bus)

Positions are world `x, z` (and `y` when relevant). Payload fields listed are
guaranteed; listeners must tolerate extra fields.

### Run lifecycle
| Event | Payload | Typical listeners |
|---|---|---|
| `run:start` | `{mode, worldId, stageId, heroId, stageName}` | hud, audio (music), ui |
| `run:countdown` | `{n}` (3,2,1,0=GO) | hud, audio |
| `run:go` | `{}` | hud, audio |
| `run:pause` / `run:resume` | `{}` | ui, audio |
| `run:end` | `{win, results}` (see §7) | ui (results), meta, audio |
| `wave:start` | `{index, total, isBoss}` (index 0-based) | hud banner, audio |
| `wave:clear` | `{index}` | hud, audio |
| `tutorial:step` | `{id, icon, textKey}` | hud prompt |
| `tutorial:done` | `{}` | hud |
| `objective:progress` | `{cur, target}` | hud |
| `fever` | `{}` — FEVER finale begins (last 20% of the stage) | hud banner, world rim rainbow, audio layer |
| `progress` | `{freed, total}` — objective bar changed | hud |

### Player
| Event | Payload |
|---|---|
| `player:spawn` | `{x, z, heroId}` |
| `player:dash` | `{x, z, dirX, dirZ, heroId, color}` |
| `player:dashEnd` | `{x, z}` |
| `player:perfect` | `{x, z}` — dash started within the perfect window of an incoming hit |
| `player:nearMiss` | `{x, z, count}` |
| `player:hurt` | `{x, z, dmg, hp, maxHp, srcX, srcZ}` |
| `player:shieldBlock` | `{x, z}` |
| `player:heal` | `{x, z, amount, hp, maxHp}` |
| `player:staminaEmpty` | `{x, z}` — lockout begins |
| `player:staminaBack` | `{}` |
| `player:lowHp` | `{hp, maxHp}` (fires once when entering danger) |
| `player:death` | `{x, z}` |
| `player:revive` | `{x, z}` |
| `player:secondChance` | `{x, z}` — hearts hit 0 the first time: frozen bubble + big revive button (run state 'secondChance') |
| `checkpoint` | `{wave}` — 🚩 reached (mid-stage) |
| `player:levelup` | `{level, choices}` — run pauses; ui shows cards; ui calls `G.run.chooseCard(id)` |
| `card:chosen` | `{id, rarity, level}` |

### Nova / combo / pickups
| Event | Payload |
|---|---|
| `nova:ready` | `{}` |
| `nova` | `{x, z, radius, heroId, color}` |
| `combo` | `{count}` — every increment (hud shows counter; audio pitch) |
| `combo:milestone` | `{count}` — 5, 10, 20, 30, 50, 75, 100… |
| `combo:break` | `{count}` |
| `pickup:crystal` | `{x, z, value}` |
| `pickup:heart` | `{x, z}` |
| `pickup:coin` | `{x, z, amount}` |
| `pickup:magnet` | `{x, z}` |

### Enemies & boss
| Event | Payload |
|---|---|
| `enemy:spawnWarn` | `{x, z, type, size, delay}` — portal telegraph opens |
| `enemy:spawn` | `{x, z, type, size, color}` |
| `enemy:bonk` | `{x, z, strength}` — two enemies collided hard → dizzy |
| `enemy:dizzy` | `{x, z, size}` |
| `enemy:windup` | `{x, z, type, dirX, dirZ}` — charge / laser / explosion wind-up |
| `enemy:smash` | `{x, z, y, type, size, color, dirX, dirZ, combo, byNova}` |
| `enemy:freed` | `{x, z, size}` — a happy white "freed" cube pops out |
| `enemy:explode` | `{x, z, radius}` |
| `enemy:split` | `{x, z}` |
| `boss:intro` | `{x, z, bossId, name}` — camera director runs the intro shot |
| `boss:phase` | `{phase}` (1-based) |
| `boss:slam` | `{x, z, radius}` |
| `boss:vulnerable` | `{x, z, seconds}` |
| `boss:hit` | `{x, z, hp, maxHp}` |
| `boss:defeat` | `{x, z, bossId}` |

### Presentation / meta
| Event | Payload |
|---|---|
| `cine:start` / `cine:end` | `{name}` — letterbox bars, hide HUD |
| `ui:click` `ui:back` `ui:claim` `ui:buy` `ui:error` `ui:open` | `{}` — audio blips |
| `meta:reward` | `{coins, gems, items[]}` |
| `meta:rankup` | `{rank}` |
| `meta:unlock` | `{kind, id}` (hero / skin / mode / world) |
| `settings:change` | `{key, value}` |

## 6. System APIs

### Run (`js/run.js`, gameplay)
```js
new Run(G, { mode, worldId, stageId, heroId, skinId, assist, checkpoint?, bossPhase?, attempt?, seed?, mutatorId? })
run.start()                  // intro cinematic → countdown → run:go
run.update(dt, rdt)
run.pause() / run.resume() / run.togglePause()
run.chooseCard(cardId)       // resolves a level-up
run.revive()                 // one per run when offered (results 'continue')
run.dispose()                // removes everything it added to the scene
// read-only state for HUD / camera / fx:
run.state        // 'intro'|'countdown'|'playing'|'levelup'|'paused'|'bossIntro'|'secondChance'|'dying'|'victory'|'ended'
run.player       // {x, y, z, vx, vz, size, rotY, hp, maxHp, stamina, maxStamina, lockout (bool),
                 //  dashing (bool), invuln (bool), shield (int), heroId, color, object3d}
run.nova         // 0..1 charge
run.level, run.xp, run.xpNext
run.wave, run.waveTotal, run.score, run.combo, run.comboT (0..1 remaining), run.maxCombo
run.time         // seconds since run:go
run.boss         // null | {hp, maxHp, name, x, z}
run.objective    // null | {kind, icon, cur, target, done}   (★3 challenge)
run.freedCount, run.totalCubes, run.progress (0..1), run.fever (bool)
run.stageDef, run.worldIndex, run.mode, run.mutator, run.heroDef
run.tired (bool), run.hitsTaken (hearts lost)
run.perfectCue   // bool — a threat is within the Perfect window + 0.2 s → HUD/hero shows "!"
run.checkpoint   // null | {wave, hearts, cards, level, xp} once the 🚩 middle wave is reached
run.secondChanceUsed
run.coinsEarned, run.crystals
run.enemies      // EnemyManager (fx/camera may read .list for positions)
run.cards        // [{id, level}] owned upgrades
```

### Camera director (`js/camera.js`, visuals) — `G.cam`
```js
cam.update(rdt)
cam.follow(target)           // target has x, z (e.g. run.player); null = hub orbit
cam.setHub(on)               // slow orbit around arena centre for menus
cam.shake(intensity 0..1, seconds)
cam.kick(amount)             // zoom punch (+ = in)
cam.cinematic(name, opts) → Promise   // 'intro' | 'boss' | 'victory' | 'defeat' | 'nova'
cam.skipCinematic()
cam.inCinematic              // bool
cam.worldToScreen(x, y, z) → {x, y, visible}  // CSS pixels (for HUD pop text)
```

### World (`js/world.js`, visuals) — `G.world`
```js
world.load(worldId)          // build / swap the themed environment (sky, arena, décor, lighting)
world.arenaRadius            // gameplay boundary (= DATA world arenaRadius)
world.theme                  // the DATA world record currently loaded
world.update(dt, rdt)
world.pulseRim(color)        // flash the arena rim (wave start, boss)
world.setPlayRadius(r)       // Shrink Storm / W6 finale: animate a storm wall at radius r (r = arenaRadius → none)
world.setFever(on)           // rainbow rim cycling
```

### Post (`js/post.js`, visuals) — `G.post`
```js
post.render(rdt)
post.setSize(w, h)
post.setQuality('high' | 'low')
post.pulse({ chroma, flash, flashColor, vignette, duration })
post.setGrade({ saturation, contrast, tint, bloom })   // per world
post.setDanger(0..1)         // red edge vignette when HP low
```

### FX (`js/fx.js`, visuals) — `G.fx`
Listens to the bus and spawns effects on its own. Direct API (optional use):
```js
fx.update(dt, rdt)
fx.burst(kind, x, y, z, opts)   // 'shards' | 'sparks' | 'dust' | 'confetti' | 'ring' | 'stars' | 'heal' | 'crystal'
fx.clear()                      // on run dispose
```

### Audio (`js/audio.js`) — `G.audio`
```js
audio.unlock()                  // call on first user gesture (main does this)
audio.update(rdt)
audio.music(track)              // 'title' | 'hub' | 'w1'..'w6' | 'boss' | 'victory' | 'defeat' | 'endless' | null
audio.intensity(0..1)           // run sets from danger level; music layers follow
audio.setVolumes({ music, sfx })
audio.toggleMute() → muted
audio.sfx(name, opts)           // direct one-shots for UI: 'click','back','claim','buy','error','whoosh','capsule','rankup','unlock','star'
audio.beat                      // 0..1 phase within the current beat (things may bob on the beat)
```

### HUD (`js/hud.js`, ui) — `G.hud`
```js
hud.show(on)
hud.update(rdt)                 // reads G.run every frame
hud.pop(x, y, z, text, style)   // world-anchored comic text ('perfect','bonk','smash','heal','crit','xp')
hud.banner(textKey|string, style, seconds)
```

### UI (`js/ui.js`, ui) — `G.ui`
Owns every DOM screen. Uses `G.app` to start/stop runs and `G.meta` for data.
```js
ui.update(rdt)
ui.go(screen, params)          // 'title'|'home'|'map'|'heroes'|'road'|'missions'|'shop'|'dex'|'settings'
ui.showLevelUp(choices)        // on player:levelup
ui.showPause() / ui.hidePause()
ui.showResults(results, rewards)
ui.toast(text, icon)
```

### Meta (`js/meta.js`, ui) — `G.meta`
Economy + long-term progression, persisted in `G.save.profile`.
```js
meta.coins, meta.tickets, meta.trophies, meta.freed, meta.rank   // getters (rank = {tier, stars, id, name, icon, color})
meta.grant(rewards[], source)                      // THE single reward entry point → claim-popup queue (never shown mid-run)
meta.applyRun(results) → rewards                  // called by main on run:end
meta.isStageUnlocked(worldId, stageId), meta.stageStars(worldId, stageId)
meta.heroUnlocked(id), meta.ownedSkins(heroId), meta.selectedHero, meta.selectHero(id)
meta.selectedSkin(heroId) → skinId, meta.selectedHat(heroId) → hatId, meta.selectedTrail() → trailId
meta.unlockedCards() → [cardIds]                   // starter pool + Star Road unlocks (run offers only these)
meta.hubWorld() → worldId                          // world shown behind menus (highest unlocked)
meta.missions(), meta.claimMission(i)
meta.signin(), meta.claimSignin()
meta.road(), meta.claimRoad(index)
meta.capsule(payWith: 'ticket'|'coins') → prize   // earned currency only, no dupes, pity, daily cap, parent toggle
meta.buy(kind, id) / meta.equip(kind, id, heroId)
meta.dex()
meta.redDots()                                     // {road, missions, signin, wardrobe, capsule, dex, achievements, map} for badges
meta.isUnlocked(feature)                           // progressive disclosure: 'missions'|'road'|'dex'|'wardrobe'|'capsule'|'modes'|'achievements'|'heroes'|'map'
meta.tick(rdt)                                     // play-time accounting / break reminder
```

Save extras (lead, `js/save.js`): `save.exportCode()` → text code, `save.importCode(code)` → `{ok}`; `save.onReset(fn)` / import re-run the hook so modules can `ensure()` their defaults again.

### Hero model (`js/hero_model.js`, visuals)
Used by `player.js` in runs and by `main.js` for the hub diorama.
```js
createHeroModel(heroId, skinId = null, { hat = 'none', trail = 'default' } = {}) → HeroModel
model.group                     // THREE.Group; origin at the FEET centre; face = local +Z
model.update(dt, anim)          // anim: {moving, speed(0..1), dashing, sprinting, tired, hurt, airborne,
                                //        lookX, lookY (-1..1 pupils), expr (EXPR override|undefined), celebrate, glow (0..1 nova ready)}
model.squash(sx, sy, sz)        // impulse into the squash/stretch spring (1 = rest)
model.flash(seconds)            // white hit flash
model.setBlink(on)              // hurt i-frame blinking
model.trailColors               // array of hex colours for fx dash trail (null = hero colour)
model.dispose()
```

### World gimmick queries (`G.world`, visuals) — used by gameplay physics
```js
world.frictionAt(x, z) → 1 (normal) | 0.25 (ice)          // multiply decel / knock friction
world.pushAt(x, z, out) → out {x, z} velocity to add (conveyors), zero elsewhere
world.bumperHit(x, z, r) → null | {nx, nz, bumper}         // circle overlaps a bumper; normal points away from it
world.solidAt(x, z) → bool                                  // false over a vanished glitch tile (things there fall)
world.features                                              // the DATA features of the loaded world (may be undefined)
```

### Gameplay-internal interfaces (gameplay-A ↔ gameplay-B)
`Run` creates the subsystems in this order and passes itself:
```js
run.enemies = new EnemyManager(G, run)        // enemies.js
run.waves   = new WaveDirector(G, run, stageDef, mode)   // waves.js (creates Boss via enemies when needed)
run.pickups = new Pickups(G, run)             // pickups.js
run.upgrades= new Upgrades(G, run)            // upgrades.js
run.playerCtl = new Player(G, run, heroDef, skinId)      // player.js  (run.player === run.playerCtl.state)
```
EnemyManager (enemies.js) — owns every red cube incl. the boss object:
```js
em.list                // active enemies: {id, type, sizeKey, x, z, y, vx, vz, size, radius, rotY, mass, hearts,
                       //   state:'portal'|'chase'|'circle'|'sleep'|'windup'|'charge'|'knocked'|'dizzy'|'tired'|'dying',
                       //   smashable (bool), harmful (bool: contact hurts player), elite, isBoss, color}
em.spawnWithPortal(type, x, z, opts) // opts {size:'S'|'M'|'L', sleep, elite, speedMult, delay}; emits enemy:spawnWarn then enemy:spawn
em.knock(e, dirX, dirZ, speed, {byPlayer})   // billiards: launch a non-smashable enemy (bruiser armour handled inside)
em.smash(e, {dirX, dirZ, byNova, bySat})     // frees a smashable enemy → emits enemy:smash + enemy:freed; returns crystal size key or null
em.dizzy(e, seconds, source)                 // make smashable
em.dizzyRadius(x, z, r, seconds)             // perfect shockwave etc.
em.pushRadius(x, z, r, speed)                // radial knock (pop rocks, blasts)
em.nova(x, z, r, heroId)                     // smash light types, dizzy heavy ones, boss crack
em.threatTTC(px, pz, pvx, pvz, radius) → seconds   // min time-to-contact of any harmful enemy/hazard (Perfect detection)
em.nearestSmashable(x, z, maxDist, dirX, dirZ, coneDeg) → enemy|null   // dash aim assist
em.aliveCount           // enemies that still need freeing (excludes dying/treasure)
em.boss                 // Boss or null (boss.js): {hp, maxHp, name, x, z, radius, coreOpen, stagger}
em.update(dt)           // AI, steering (inertia + turn rate + aggression tokens), enemy↔enemy collisions → BONK,
                        // rim bonks, world gimmicks, hazards, rendering (CubeCrowd + accessories + blob shadows)
em.clear(), em.dispose()
```
Hazards registry (shared): `run.hazards` is an array of `{kind, active, hearts, srcX, srcZ, test(x, z, r) → bool, dizzies}`.
Enemies/boss push objects in and flip `active`; `Run` hurts the player on overlap (unless invulnerable) and
uses active hazards for Perfect detection. Hazards with `dizzies:true` (lasers, blasts) also dizzy red cubes
(handled inside enemies.js).

Run services used by enemies/boss/waves:
```js
run.player                      // see §6 Run
run.hurtPlayer(hearts, srcX, srcZ, kind) → bool   // applies i-frames / shields / assist; false if ignored
run.arenaRadius                 // current gameplay radius (may shrink in W6 finale)
run.stageDef, run.mode, run.mutator, run.worldIndex, run.assist, run.guardian  // {tokensDelta, spawnMult, dizzyBonus, speedMult}
run.rng                         // seeded rng for this run
run.cardMods                    // numbers derived from owned cards (dizzyBonus, knockMult, rimBounce, extraHops …)
run.onWaveCleared(index), run.onStageCleared(), run.onBossDefeated()
```
WaveDirector (waves.js): `update(dt)`, `wave`, `waveTotal`, `done`, `tutorialStep`, `objective` tracking helpers are in Run.

## 7. Run results object

```js
{
  win, mode, worldId, stageId, heroId,
  score, time, wavesCleared, waveTotal,
  smashes, perfects, nearMisses, bonks, novas, maxCombo,
  hitsTaken, damageTaken, crystals, coins,
  stars,              // 0..3
  starFlags: [clear, fewHits, objective],
  freed: { grumpy: n, ... },     // per enemy type (Cube-dex)
  bossDefeated,
  level,              // in-run level reached
  cards: [ids],
}
```

## 8. App controller (`G.app`, main.js)

```js
app.startRun({ mode, worldId, stageId })    // hero / skin / assist come from meta + settings
app.restartRun()
app.quitRun()                                // back to hub
app.pause() / app.resume()
app.selectHero(id)                           // refresh the hub diorama
app.refreshHub()                             // re-read selected hero/skin/hat/trail + village size (after wardrobe changes / claims)
app.pokeHero()                               // lobby: tap the 3D hero → hop + babble
app.state                                    // 'boot'|'title'|'hub'|'run'
```

## 9. Performance budget

- ≤ 150 draw calls in a busy wave. All enemies of every type share **one**
  `CubeCrowd` (instanced); particles are instanced/points; blob shadows instanced.
- ≤ 90 active enemies, ≤ 2 000 live particles (≤ 700 on `quality = 'low'`).
- No per-frame allocations in hot loops (reuse vectors / arrays).
- `quality: 'low'` → pixel ratio 1, half-res bloom, fewer décor objects.
