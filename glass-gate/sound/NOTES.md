# Helper C — sound and music: notes

Nobody on this job can listen. Everything below was decided from metadata, measurements and spectrograms,
and the mix is checked by measurement on every build. Read the "Imperfect / not verified" list at the end.

## Rebuild

    /opt/blender-env/venv/bin/python sound/mix.py

Reads `shared/timeline.json` (nothing about timing is hard-coded), takes about 13 s on one core, writes

| file | what |
|---|---|
| `sound/out/mix.wav` | the soundtrack: 48 kHz, stereo, 24-bit, exactly `duration_s` long |
| `sound/out/sfx.wav`, `sound/out/music.wav` | stems, same master gain and limiter curve as the mix, so `sfx + music == mix` |
| `sound/out/report.json` | every measurement of this build (loudness, true peak, sync per event, edit points, levels per section) |
| `sound/out/spectrogram.png` | picture of the mix; green ticks = events, blue = music cuts, white = drop |

Options: `--timeline PATH`, `--out DIR`, `--no-verify`, `--strict` (exit status 2 if a check fails; without
it the build always exits 0 and prints `SOME CHECKS FAILED`). `python sound/verify.py` re-measures an existing build.
`python sound/gg_music.py` prints the edit plan for the current timeline, `--analyse` re-measures the track.

Code: `mix.py` (buses, ducking, master), `sfxlib.py` (the 21 effects, room, levels), `gg_music.py` (track
facts, edit plan, build automation), `verify.py` (checks).

## The track

**"Nowhere Land" — Kevin MacLeod (incompetech.com), CC BY 4.0.** Electronica; "Bright, Uplifting"; synths and
percussion; no vocals; 2:12. File: `music_src/Nowhere Land.mp3` (256 kbps, the only file in that folder).
Credit line: see `CREDITS_sound.txt`.

How it was chosen. The catalogue was read from the site's own data (`pieces.json`, 1,443 tracks with tempo,
genre, feel, instruments, length, description). Filter: 112–128 BPM in Electronica / Modern / Pop / Funk /
Disco / Soundtrack / Unclassifiable, then the descriptions. 14 candidates were downloaded and measured
(true tempo, grid stability, level and brightness per bar); 13 were deleted again.

| track | listed / measured BPM | finding |
|---|---|---|
| **Nowhere Land** | 120 / **120.000** | rock-steady grid; 8 bars of arpeggios with no drums, full drums + crash enter on bar 9, own final chord. **Chosen.** |
| Voltaic | 120 / 120.00 | runner-up: sparse 8-bar intro, big entry at 16 s; but the intro is percussion (it would fight the part sounds) and the feel is "action", ends abruptly |
| Digital Lemonade | 120 / 120.00 | same shape, but "bouncy, jaunty" — playful rather than premium |
| Inspired | 120 / 120.00 | almost nothing above 5 kHz, few onsets: too soft to carry a drop |
| Galactic Rap | 120 / 120.00 | flat: no build, no entry |
| Deep Haze | 120 / 119.99 | loose grid (beat phase wanders 20–80 ms), slow swell without an entry |
| Delightful D | 120 / no lock | the tempo fit did not settle on 120 (best fit 112.5, beat phase unstable): no grid to cut on with confidence |
| Screen Saver, Floating Cities, Destiny Day | 120 | calm beds: few onsets, very little above 5 kHz, no entry that could serve as a drop |
| Tech Live, Brain Dance | 124 / 124.00 | would need a 3.2 % stretch when exact-120 tracks exist; Tech Live is a flat bed by its own description |
| Rising Tide (faster), Special Spotlight | 122, 126 / 122.00, 126.00 | stretch needed; interview beds with a flat level curve, no drop |

Why Nowhere Land fits this film: before its drums come in, the track is a clean arpeggio bed with no
percussion at all, so during the build **the part sounds are the percussion**; the drums only arrive on
the drop. Its form (8 bars, then the full entry) is the form of the video (drop on bar 9).

Measured on the file (`gg_music.py --analyse`):

- Tempo **120.000 BPM**: bars 1–3 and their repeat 96 s later line up within 0.002 ms. Timeline tempo is
  120 BPM, so the **stretch is 0.000 %** — the track is not stretched or re-pitched. (If the timeline BPM
  ever changes, the source is stretched with ffmpeg's rubberband filter by `bpm / 120`; tested at 125 BPM:
  all checks pass, the entry lands 0.2 ms from the drop.)
- The first downbeat is 1057 samples (44.1 kHz) into the decoded mp3 (codec delay). After trimming, bar *k*
  starts at exactly (*k* − 1) × 2.000 s; the kick of bar 9 rises within the first 5 ms after its grid time.
- Tuning A = 440 Hz (final G3 at 196.01 Hz). Harmony: a 4-bar loop C | G | Bb | F, final chord G sus.
- Sections (bars): 1–7 arpeggios · 8 fill · **9–16 full, crash on 9 (strongest entry: most 2–8 kHz energy
  on its first beat)** · 17–24 B light · 25–32 full · 33–39 arpeggios + back-beat clap · 40 snare fill ·
  41–48 B full · 49–56 arpeggios · 57–64 full · 65 final chord (hit, G3 held 2 s, reverb).

## The edit (v1 timeline)

All cuts are on bar lines of a grid anchored on `drop_t`; 10 ms equal-power crossfade placed just before
each cut so the downbeat after it is untouched.

| timeline | source bars | what you hear |
|---|---|---|
| 0–8 s (bars 1–4: hook, waves 1–2) | 1–4 | arpeggios only, present from sample 0 (first frame −16.6 dB RMS) |
| 8–16 s (bars 5–8: waves 3–6) | 37–40 | arpeggios + back-beat clap, snare fill in the last bar |
| **16.000 s — the drop** | **9**–10 | full drums, bass and crash. Measured: the entry lands **−0.4 ms** from `drop_t`; the impact effect starts on the sample |
| 20–24 s (bars 11–12) | 63–64 | same full section, the two bars that lead into the track's own ending |
| 24–26 s (final hit) | 65 | the track's own final chord, uncut from bar 64; tail shaped to reach silence at 26.0 s |

Build, wave by wave (before the drop, from the `sections` list):

| section | low-pass | level step |
|---|---|---|
| hook | 2.5 kHz | −4.0 dB |
| w1_base | 550 Hz | −2.0 dB |
| w2_drive | 940 Hz | −1.6 dB |
| w3_electronics | 1.6 kHz | −1.2 dB (clap enters) |
| w4_glass_body | 2.7 kHz | −0.8 dB |
| w5_top_rail | 4.7 kHz | −0.4 dB |
| w6_wings | 8 kHz | 0 dB (fill + riser) |
| drop | open | full, bass restored |

Also: the lowest octave of the music is held back (85 Hz high-pass) until the drop, which leaves the low end
to the metal thunks and makes the drop bigger; in the last 190 ms before the drop the music dips by 20 dB
under the riser and returns on the downbeat. Music loudness per wave: −23.4, −22.9, −22.7, −21.9, −21.9,
−21.0 LUFS, then −14.2 at the drop.

For other timelines the same rules apply (`gg_music.plan`): the 4 bars before the drop are always 37–40,
bars before that are 1–4 (repeated if needed), the drop is always bar 9, and when the drop-to-final-hit
length is a multiple of 4 bars the last two bars are 63–64 so the ending is the composer's. Tested with the
drop on bar 7, an off-grid drop, no `final_hit`, no `sections`, no `drop_t`.

## Effects

All 21 names of `sfx_vocabulary` have a generator in `sfxlib.py`; all are synthesised (see
`CREDITS_sound.txt` for why). Structure: contact transient + body + modal resonance (inharmonic partials
with detuned twins so they beat like real plates), micro-rebounds, per-`var` randomisation of pitch, decay
and timing (seeded: the same timeline always gives the same mix), one shared room (0.32 s, a few early
reflections, nothing in the first 3 ms). Glass is thick crystal: fundamental 392–1175 Hz, a knock and a
thud under it, ring time constant 0.1–0.2 s. Tonal effects are tuned to C, D, G, A, which fit every chord
of the track.

How `t` is used (the anchor is part of each generator):

| effect | anchor |
|---|---|
| contact sounds (thunk, clack, click, snap, tap, gear tick, spring, clink, clunk, card tap, impact, final hit), beep, UI chime | the hit starts on `t` |
| `servo`, `power_up`, `shimmer` | start on `t`, last `dur` |
| `whoosh`, `riser`, `glass_slide` | **end** on `t`, start `dur` earlier |
| `screw` | driver whirr during the `dur` **before** `t`, seat tick on `t` |

Decision on `screw` and `glass_slide`: the brief names only whoosh and riser as "ends at t", but
`director/anim_lib.fly_in` lands every part on `t` and spins screws *while they travel*, and `dur` in the
exported events is that travel time. So the whirr/slide lead in and the contact is on `t`. To flip one
event, add `"anchor": "start"` (or `"end"`) to it; to flip a whole effect, change `sfxlib.ANCHOR` and the
generator's return value.

Other decisions:

- `gain` scales linearly from each effect's reference loudness (`sfxlib.LEVEL_DB`, K-weighted loudest 50 ms).
  `gain <= 0` is skipped. `pan` is constant-power.
- `var` picks the variation. Because `animate.py` derives `var` from Python's `hash()`, it can change from
  one export to the next; where size matters (glass, heavy metal) the generator also reads hints from the
  `part` name (`wing`, `lid`, `panel`, `post`, `tube`, `base`, `motor`, `psu` …).
- Unknown effect names never stop the build: a warning, then keyword match (`glass…` → `glass_clink`,
  `…motor` → `servo` …), else the nearest name, else a neutral `click`. Malformed events are skipped with a warning.
- **Drop-in recordings**: put `sound/sfx_override/<name>.wav` (used for every variation) or numbered
  `<name>_<n>.wav` (picked by `var` modulo the number of files) and re-run. Any sample rate, mono or
  stereo. The file is aligned by its content: first audible sample on `t` for start-type effects, last
  audible sample on `t` for whoosh/riser/glass_slide, loudest transient on `t` for screw. It is brought to
  the same reference loudness as the synthesised effect; it is not stretched to `dur`. Tested.

## Mix

- Music level: the full section after the drop is set to −15.5 LUFS on the mix bus before mastering; everything else follows.
- Ducking: `busy` × 4.5 dB (static, per section, switched exactly on the drop) plus a sidechain from the
  effects: up to 5 dB under part sounds, 2.5 dB under the softer in-use sounds (servo, beep, card, chime,
  slide), 4 ms attack with 10 ms look-ahead, 250 ms release. Riser, impact, power-up, shimmer, whoosh and
  final hit do not duck the music (they belong to it). Below 200 Hz the music is ducked half as much.
- Master: gain to −16 LUFS, look-ahead true-peak limiter at −1.2 dBTP, applied identically to both stems.

Measured on the v1 timeline (`out/report.json`):

| | |
|---|---|
| integrated loudness | **−16.01 LUFS** (pyloudnorm), −16.0 LUFS (ffmpeg ebur128), LRA 5.9 LU |
| true peak | **−1.19 dBTP** (8× oversampled), −1.2 dBTP (ffmpeg); sample peak −1.21 dBFS; 0 samples at full scale |
| after AAC 256 k (as in `director/finish.sh`) | −16.0 LUFS, −1.2 dBTP |
| length / format | 1,248,000 frames = 26.0000 s, 48 kHz, stereo, PCM 24 |
| limiter | deepest 2.1 dB (the drop), 1.9 dB (wing landing at 14.5 s); more than 1 dB for 0.6 % of the time |
| stems | `sfx + music − mix` = −142 dB; sfx −19.1 LUFS, music −18.6 LUFS |
| mono fold-down | −0.8 dB (−16.8 LUFS): no cancellation problem on phone speakers |
| spectrum (octaves, dB re total) | 63: −7.7, 125: −6.0, 250: −6.5, 500: −8.1, 1k: −10.4, 2k: −12.3, 4k: −15.0, 8k: −23.4, 16k: −32.8 |
| loudest 50 ms in 5–12 kHz | −29.7 dBFS (end of the riser): nothing piercing |

Loudness per section (mix / effects / music, LUFS): hook −17.8 / −23.4 / −19.0 · w1 −18.4 / −19.9 / −23.4 ·
w2 −19.1 / −21.3 / −22.9 · w3 −19.0 / −21.5 / −22.7 · w4 −16.8 / −18.4 / −21.9 · w5 −17.3 / −19.0 / −21.9 ·
w6 −16.7 / −18.6 / −21.0 · drop −12.9 / −16.9 / −14.2 · in use −15.0 / −18.8 / −16.9 · hero −22.0 / −23.6 / −25.7.
In the build the effects bus is 1–3.5 LU above the music as a section average, and each part hit (its
loudest 50 ms, K-weighted) stands 2–12 dB above the music bed around it, median 6.6 dB: thunks, clinks and
clunks 10–12 dB, clacks, ticks and snaps 6–8 dB, the quietest cable clicks (gain 0.45) 2–4 dB. At the drop
the music leads.

## Sync check (limit ±5 ms)

- **A — every event alone**, rendered exactly as the mixer places it, anchor measured on the samples
  (first audible / last audible / loudest transient): 76 events, **worst error 0.81 ms** (screw ticks peak up to
  0.8 ms after `t`; whoosh, slide and riser are down by 60 dB 0.2–0.7 ms before `t`; the servo fades in over
  the first 0.3 ms; every other event within 0.07 ms).
- **B — independent of the generator code**: onset found in the finished effects stem (first time the
  high-passed 0.5 ms energy climbs half-way from the level before the event to its peak): 62 transients,
  **worst error 1.92 ms, mean −0.35 ms**. 3 more events cannot be separated in the stem because another
  effect is as loud at that moment (thunk at 2.0 s under the end of the whoosh, impact at 16.0 s under the
  end of the riser, UI chime at 18.0 s under the power-up); they are covered by check A.
- Mix against stems: null test −142 dB, so the master adds no delay.

Edit points: no isolated sample step anywhere in mix or music stem; second difference at the cuts
0.5–2.3 × the 99.9th percentile of the surrounding 400 ms (a splice click would stand far above that).
Ending: last 100 ms at −76 dB RMS, last sample 0.

## Imperfect / not verified

1. **Not listened to.** Balance, tone and how "recorded" the effects feel are judged from numbers and
   pictures only. A human pass on a phone speaker and on headphones is still needed.
2. The effects are synthetic. Thunks, clinks, clicks should pass; the **servo whine, the screwdriver whirr and
   the spring** are the most likely to sound designed rather than recorded. `sfx_override/` exists for that.
3. The music's own build is subtle: the arpeggios have little energy above 2 kHz, so the filter staircase
   mostly changes colour; music loudness rises only 2.4 LU across the six waves (the mix rises through the
   effects). The hook is deliberately brighter and louder than wave 1 (−19.0 → −23.4 LUFS): the filter shuts
   as the parts lift away, then opens wave by wave. If a strictly rising line is wanted, set
   `HOOK_LP_HZ`/`HOOK_TRIM_DB` in `gg_music.py` to the first-step values.
4. The drop is 4–6 LU louder than the build (mix −12.9 vs −16.7 to −19.1 LUFS). That is the intent, but it
   is a big step; `MUSIC_FULL_LUFS` in `mix.py` is the one knob.
5. The limiter does work: up to 2.1 dB here, about 4 dB on a dense test timeline (149 events) and when the
   drop was moved. Coinciding loud hits are held by it, not by a per-effect rule.
6. The track's own final chord is quiet (it ends softly); most of the weight of the ending is the
   synthesised `final_hit`. The music tail is faded faster than the recording's own 4 s decay to finish at 26.0 s.
7. The mix is on the dark side above 8 kHz (−27.4 dB of the total). Chosen for safety; it may want a little air.
8. Left is 0.6 dB louder than right over the whole programme, because the timeline pans more parts left.
9. Music cut at 20.0 s (bar 10 → 63) is in an exposed place; it measures clean (ratio 2.3) but is the edit
   most worth a listen. With a stretched source (other BPM) the same cut measured 3.1.
10. The source is a 256 kbps mp3 (the site's free download); decoded peaks reach +0.6 dBFS and are handled in float.
11. Sync check B cannot see events buried under a louder effect (3 here); they rely on check A.
12. `var` changing between exports of the same animation (see above) changes pitches of clinks and ticks.
13. The edit rule is fixed to this track's bars: the four bars before the drop are always the clap section
    (37–40). If a future timeline puts the drop less than four bars from the start, the hook plays it too.
