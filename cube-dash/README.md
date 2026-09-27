# 方块大逃跑 · CUBE DASH

> **躲得漂亮，冲得刚好** — dodge with style, dash just right.

A cinematic, candy-coloured sci-fi arena game for kids (designed for ~10-year-olds, fun for everyone), grown from a tiny prototype: a **blue cube** running from **angry red cubes**. It runs in any modern browser, built with **three.js + vanilla JavaScript**. There is no engine and no asset files: every mesh, face, particle, sound effect and song is generated at runtime.

**The one-sentence game:** *lure the angry red cubes into each other (BONK!), then dash through the dizzy ones to free them.*

## Play

```bash
cd cube-dash
python3 -m http.server 8080        # or: npx serve .
# open http://localhost:8080
```

For a single file that works offline and can be shared (double-click it, send it over chat or USB):

```bash
cd cube-dash && npm install && npm run build   # → ../CubeDash.html
```

## Controls

| | Keyboard | Gamepad (Switch / Xbox / PS) | Touch |
|---|---|---|---|
| Move | `WASD` / arrows | left stick / d-pad | floating joystick, left half |
| **Dash** (hold = sprint) | `Shift` / `Space` / `J` | A / B / RB / RT | tap anywhere on the right half, or ⚡ |
| **大招 NOVA** | `E` / `Enter` / `K` / `Q` | X / Y / LB / LT | ✦ button (pulses when ready) |
| Pause | `Esc` / `P` | Start | ❚❚ |
| Retry | `R` | Select | — |
| Mute | `M` | — | — |

## The four rules (the whole game)

1. A red cube that touches you costs **1 ♥**, unless you're dashing.
2. Cubes that **crash** into each other, the rim, a knocked cube or a blast get **⭐ dizzy**.
3. **Dash into a ⭐ cube** to free it: it pops out as a happy cube and flies home.
4. **Dash just before a hit** for a **完美 PERFECT**: slow motion plus a shockwave that makes everything around you dizzy.

Your dash works like a **billiards cue**. Knock a healthy cube into its friends and they bonk. Dash through a dizzy clump and they pop one after another on a rising melody.

## What's inside

- **6 worlds × 5 stages.** Each world adds one new enemy and one arena twist (Nintendo's kishōtenketsu): Cloud Harbor, Neon Ring (bumpers), Crystal Moon (ice), Bomb Nebula, Laser Foundry (conveyors) and Glitch Core (vanishing tiles).
- **King Glitch**, a modular boss that learns one new move per world. It has telegraphed slams, shockwave rings to perfect-dash through, a dizzy core to smash and phase checkpoints.
- **4 heroes, each changing one rule.** Blu (billiards dash), Mochi (heavy bash, giant Nova), Zap (blink teleport, thunderstorm) and Stella (gravity wells, black hole).
- **Roguelite cards.** 19 cards and 6 evolutions, with tag set bonuses, level pips and no reading required.
- **Modes:** Adventure, Galaxy Survival (endless with a warp-gate exit and challenge codes), Daily Challenge (date-seeded mutators), Shrink Storm and Boss Rush.
- **Kind meta.** Galaxy Road (driven by cubes you free), a cumulative sign-in with no streak loss, banked daily missions, rank tiers that never go down, a Cube-dex, a Wardrobe with fixed prices, and a capsule machine that uses earned tickets only, shows its odds and never gives duplicates. Plus a Cube Village where rescued cubes live on your home island.
- **Healthy by design.** No purchases, no ads, no internet. Break reminders appear only between runs, breaks earn a rested bonus, and a gated Parent Corner holds the settings. Helper mode and invisible dynamic difficulty only ever make things easier.
- **Cinematic juice.** Hit-stop, squash and stretch, trauma camera shake, bloom, slow-mo, stage fly-ins, boss intros, and an adaptive procedural "candy synthwave" soundtrack whose smash chimes climb the scale.

## Documents

- [`docs/GDD.md`](docs/GDD.md): the full game design document (中文), covering the design pillars, the five studios' philosophies mapped to mechanics, the core loops, systems, economy, onboarding, the psychology of engagement and the roadmap.
- [`docs/DESIGN_BRIEF.md`](docs/DESIGN_BRIEF.md): the engineer-facing behaviour spec, per system.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): the module contract, including the event bus catalog, APIs and performance budget.

## Project structure

```
cube-dash/
├── index.html            shell + import map (three.js vendored)
├── css/                  style.css (screens) · hud.css (in-run HUD)
├── js/
│   ├── main.js           boot, renderer, frame loop, hit-stop/slow-mo, app states, Cube Village hub
│   ├── core.js           math, seeded RNG, event bus, safe storage
│   ├── data.js           ALL design data & tuning (single source of truth)
│   ├── art.js            rounded-cube geometry, procedural face shader, instanced crowds, blob shadows
│   ├── input.js          keyboard · gamepad (rumble) · touch
│   ├── save.js / i18n.js profile persistence (+backup, export codes) · 中文/English
│   ├── run.js player.js upgrades.js pickups.js     core loop, hero kits, cards, pickups
│   ├── enemies.js boss.js waves.js                 enemy AI & physics, King Glitch, stages & modes
│   ├── world.js post.js camera.js fx.js hero_model.js   worlds, post-FX, camera director, particles, hero
│   ├── hud.js ui.js meta.js                        HUD, screens, progression & economy
│   ├── audio.js          procedural adaptive music + SFX
│   └── vendor/           three.js r160 + postprocessing addons
└── tools/build.mjs       single-file offline build
```
