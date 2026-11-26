# Helper C — sound and music: notes

Nobody on this job can listen. Everything below was decided from metadata, measurements and spectrograms,
and the mix is checked by measurement on every build. Read the "Imperfect / not verified" list at the end.

State: **round 2**, built from `shared/timeline.json` **version 8** (80 events, picture-locked timing).

> **Director's note (final build).** The delivered mix is built by the same `mix.py` from timeline **version 10**
> (the hook now runs to 1.8 s, the light wave takes 1.5 s instead of 2.4 s; 80 events). I also raised the static
> music duck under busy waves from 3 dB to 5 dB (`DUCK_STATIC_DB` in `mix.py`) so the small part sounds sit further
> above the track. Every check still passes on that build; the numbers of the final build are in
> `sound/out/report.json` and in `out/REPORT.md`, and supersede the v8 figures quoted below.

## Rebuild

    /opt/blender-env/venv/bin/python sound/mix.py

Reads `shared/timeline.json` (nothing about timing is hard-coded), takes about 14 s on one core, is
deterministic (same timeline, same bytes), writes

| file | what |
|---|---|
| `sound/out/mix.wav` | the soundtrack: 48 kHz, stereo, 24-bit, exactly `duration_s` long |
| `sound/out/sfx.wav`, `sound/out/music.wav` | stems, same master gain and limiter curve as the mix, so `sfx + music == mix` |
| `sound/out/report.json` | every measurement of this build (loudness, true peak, sync per event, edit points, spectrum, story beats) |
| `sound/out/spectrogram.png` | picture of the mix; green ticks = events, blue = music cuts, white = drop |

Options: `--timeline PATH`, `--out DIR`, `--no-verify`, `--strict` (exit status 2 if a check fails; without
it the build always exits 0 and prints `SOME CHECKS FAILED` and which). `python sound/verify.py` re-measures
an existing build. `python sound/gg_music.py` prints the edit plan, `--analyse` re-measures the track.

Code: `mix.py` (buses, ducking, master), `sfxlib.py` (the 21 effects, room, levels), `gg_music.py` (track
facts, edit plan, build automation), `verify.py` (checks).

## Round 2: what changed

| asked | done | measured (v8) |
|---|---|---|
| re-sync to the picture | events stay on their frame-quantised `t`; `dur` rounded to 4 decimals (0.8999999999999986 -> 0.9) | all 80 events within 1.1 ms (check A) |
| hook 1.6 s, 0.4 s of music alone, then the slam | the gap needs no special case (whoosh ends on 1.6); the first part sound, if it is a heavy hit, is the "first slam": +2.5 dB and almost dry (room send -28 dB instead of -14) | effects in the 0.3 s before it: -66 dB; slam 2.1 dB louder (K-weighted loudest 50 ms) than the next loudest part hit up to 8 s |
| 1 brightness | glass, gear ticks, clicks, snaps, clacks, screw tick, spring: real partials up to 13-15.5 kHz and more level on the partials above 5 kHz; partials and contact noise thinned around 2.9 kHz; beep moved down (G6 -> C7); glass slide rebuilt as rub (1.1-1.5 kHz) + edge hiss (6.5 kHz) | effects stem against the target below: 5-12.5 kHz was 1 to 11 dB under, now +2.2 to -1.2 dB; 2.5-4 kHz was 1 to 3 dB over, now 2 dB under |
| 2 servo, screw, spring | all three rewritten, see Effects | - |
| 3 the build | music steps up in low-pass and level at every wave start; hook 1 LU under wave 3; held breath from 15.25 s | music 8.8 dB up from wave 1 to wave 6 (was 2.4), steps 2.0 / 2.2 / 1.5 / 1.6 / 1.5 dB; held breath: music -11 dB, its low end -34 dB |
| 4 the drop | impact rebuilt around 131 and 196 Hz (2nd and 3rd harmonic of a C2 boom) plus an 80-260 Hz knock; its polarity is chosen against the music's kick; `power_up` now rises for the whole of `dur` and lands | first 0.3 s of the mix: 80-200 Hz -17.0 dB against 30-80 Hz -18.9 dB, 4.2 dB above the rest of that bar; `power_up` loudest at 18.388 s (resolve point 18.4 s) |

### The spectrum target (fix 1)

Long-term third-octave spectrum of the **effects stem**. Target: band level falling 3 dB per octave from
1 kHz to 12.5 kHz (that is -6 dB/octave in spectral density, the safe side of how finished mixes usually
measure), reference = mean of the 500 Hz - 2 kHz bands. Pass: no band from 5 to 12.5 kHz more than 3.5 dB
under the line (air), none of the 2.5 / 3.15 / 4 kHz bands more than 1 dB over it (harshness).

| band | 2.5k | 3.15k | 4k | 5k | 6.3k | 8k | 10k | 12.5k | 16k |
|---|---|---|---|---|---|---|---|---|---|
| round 1 code, v8 timeline (dB against the line) | +2.6 | +3.4 | +1.2 | -1.1 | -2.8 | -5.2 | -7.5 | -10.6 | -14.6 |
| now | -1.9 | -2.1 | -2.0 | +0.2 | +2.2 | +1.9 | +0.9 | -1.2 | -6.6 |

Whole mix, octave bands against total: 8 kHz -18.4 dB (was -23.4), 16 kHz -26.9 dB (was -33.0), everything
above 8 kHz -21.5 dB (was -27.6). Loudest single 50 ms anywhere: 2.2-4.5 kHz -25.2 dBFS, 5-12 kHz -23.8 dBFS,
12-20 kHz -32.1 dBFS (all three the glass post at 10.0 s, whose full-band level in that window is -13.5 dBFS).

How the top was opened: `sfxlib.voice()` weights the amplitudes of the **partials** (a 4 dB dip a good octave
wide at 2.9 kHz, up to +5.5 dB from 5 to 11 kHz) and `air_partials()` adds the high modes that were missing
(glass: twelve between 6 and 15.5 kHz, 10-40 ms; gear: six between 7 and 15 kHz). Contact noise was not
shelved up; it only got the same 2.9 kHz dip.

### The build (fix 3) and one reading to confirm

Steps (from `sections`, switched in 60 ms on each wave start):

| section | low-pass | level | music after ducking (K-weighted) |
|---|---|---|---|
| hook (0-2 s) | 1.1 kHz | trimmed by measurement | -25.9 dB |
| w1_base (2 s) | 400 Hz | -7.0 dB | -29.1 dB |
| w2_drive (4 s) | 750 Hz | -5.4 dB | -27.1 dB |
| w3_electronics (8 s) | 1.4 kHz | -3.8 dB, clap enters | -24.9 dB |
| w4_glass_body (10 s) | 2.6 kHz | -2.2 dB | -23.4 dB |
| w5_top_rail (12 s) | 4.8 kHz | -0.6 dB | -21.8 dB |
| w6_wings (14 s) | 9 kHz | +1.0 dB, fill | -20.3 dB (to 15.25 s) |
| drop (16 s) | open, bass back | full | -14.0 LUFS |

**Reading to confirm.** "Step the music up at each wave start (2, 4, 8, 10, 12, 14 s)" and "keep the hook a
little under where wave 3 ends up" cannot both hold at 2 s if every step is upward. I took the second as the
fixed point: the hook sits 1.0 LU under wave 3 (its low-pass is 0.8 x wave 3's; `mix.py` measures the ducked
music in both sections and trims the hook), so the music steps **down** 3.2 dB under the first slam at 2.0 s
and then up at 4, 8, 10, 12 and 14 s. If the hook should be the lowest step instead, set `HOOK_REF_WAVE = 1`
in `gg_music.py`.

Held breath: starts on the last part landing before the drop (the badge tap, 15.25 s; derived from the events,
or the riser start if that is earlier). The music is swapped (50 ms) for the bare arpeggio bar, band-passed
500 Hz - 4 kHz, sinking 6 dB; nothing at all for the last 30 ms; the full band returns on the downbeat.
Measured: music -11.0 dB against the second before (-20 -> -31 dB RMS), low end -34 dB; the riser (darker and
5.5 dB lower than in round 1) averages -30 dB under it and only overtakes the music in the last quarter second.

Effects are not buried by the louder music: sidechain depth is now 7 dB (was 5), applied 1.5 x as deep above
1.5 kHz, and static ducking is 3 dB x `busy` (was 4.5). Each part hit against the music in the same 50 ms
(K-weighted): median +10.7 dB, least +3.6 dB (a snap at 14.25 s, gain 0.66), per wave least / median:
w1 10.9 / 13.5, w2 8.6 / 12.6, w3 5.6 / 7.5, w4 9.9 / 13.1, w5 4.6 / 6.8, w6 3.6 / 8.4.

## The track

**"Nowhere Land" — Kevin MacLeod (incompetech.com), CC BY 4.0.** Electronica; "Bright, Uplifting"; synths and
percussion; no vocals; 2:12. File: `music_src/Nowhere Land.mp3` (256 kbps, the only file in that folder).
Credit line: see `CREDITS_sound.txt`.

How it was chosen. The catalogue was read from the site's own data (`pieces.json`, 1,443 tracks with tempo,
genre, feel, instruments, length, description). Filter: 112-128 BPM in Electronica / Modern / Pop / Funk /
Disco / Soundtrack / Unclassifiable, then the descriptions. 14 candidates were downloaded and measured
(true tempo, grid stability, level and brightness per bar); 13 were deleted again.

| track | listed / measured BPM | finding |
|---|---|---|
| **Nowhere Land** | 120 / **120.000** | rock-steady grid; 8 bars of arpeggios with no drums, full drums + crash enter on bar 9, own final chord. **Chosen.** |
| Voltaic | 120 / 120.00 | runner-up: sparse 8-bar intro, big entry at 16 s; but the intro is percussion (it would fight the part sounds) and the feel is "action", ends abruptly |
| Digital Lemonade | 120 / 120.00 | same shape, but "bouncy, jaunty" — playful rather than premium |
| Inspired | 120 / 120.00 | almost nothing above 5 kHz, few onsets: too soft to carry a drop |
| Galactic Rap | 120 / 120.00 | flat: no build, no entry |
| Deep Haze | 120 / 119.99 | loose grid (beat phase wanders 20-80 ms), slow swell without an entry |
| Delightful D | 120 / no lock | the tempo fit did not settle on 120 (best fit 112.5, beat phase unstable): no grid to cut on with confidence |
| Screen Saver, Floating Cities, Destiny Day | 120 | calm beds: few onsets, very little above 5 kHz, no entry that could serve as a drop |
| Tech Live, Brain Dance | 124 / 124.00 | would need a 3.2 % stretch when exact-120 tracks exist; Tech Live is a flat bed by its own description |
| Rising Tide (faster), Special Spotlight | 122, 126 / 122.00, 126.00 | stretch needed; interview beds with a flat level curve, no drop |

Why it fits this film: before its drums come in, the track is a clean arpeggio bed with no percussion at
all, so during the build **the part sounds are the percussion**; the drums only arrive on the drop.

Measured on the file (`gg_music.py --analyse`):

- Tempo **120.000 BPM**: bars 1-3 and their repeat 96 s later line up within 0.002 ms. Timeline tempo is
  120 BPM, so the **stretch is 0.000 %** — the track is not stretched or re-pitched. (Other tempos go through
  ffmpeg's rubberband filter by `bpm / 120`; tested at 125 BPM: all checks pass.)
- The first downbeat is 1057 samples (44.1 kHz) into the decoded mp3 (codec delay). After trimming, bar *k*
  starts at exactly (*k* - 1) x 2.000 s.
- Tuning A = 440 Hz (final G3 at 196.01 Hz). Harmony: a 4-bar loop C | G | Bb | F, final chord G sus.
- Sections (bars): 1-7 arpeggios · 8 fill · **9-16 full, crash on 9 (strongest entry)** · 17-24 B light ·
  25-32 full · 33-39 arpeggios + back-beat clap · 40 snare fill · 41-48 B full · 49-56 arpeggios ·
  57-64 full · 65 final chord (hit, G3 held 2 s, reverb).

## The edit (unchanged in round 2)

All cuts are on bar lines of a grid anchored on `drop_t`; 10 ms equal-power crossfade just before each cut.

| timeline | source bars | what you hear |
|---|---|---|
| 0-8 s (bars 1-4: hook, waves 1-2) | 1-4 | arpeggios only, present from sample 0 (first frame -24 dB RMS) |
| 8-16 s (bars 5-8: waves 3-6) | 37-40 | arpeggios + back-beat clap, snare fill; from 15.25 s the bare bar 4, thinned (held breath) |
| **16.000 s — the drop** | **9**-10 | full drums, bass and crash. Measured: the entry lands **-0.6 ms** from `drop_t`; the impact effect starts on the sample |
| 20-24 s (bars 11-12) | 63-64 | same full section, the two bars that lead into the track's own ending |
| 24-26 s (final hit) | 65 | the track's own final chord, uncut from bar 64; tail shaped to reach silence at 26.0 s |

The lowest octave of the music is held back (85 Hz high-pass) until the drop. For other timelines the same
rules apply (`gg_music.plan`): the 4 bars before the drop are 37-40, bars before that 1-4 (repeated if
needed), the drop is bar 9, and when the drop-to-final-hit length is a multiple of 4 bars the last two bars
are 63-64. Tested with the drop on bar 7, an off-grid drop, no `final_hit`, no `sections`, no `drop_t`.
The picture `cuts` are not used for the music edit (they lead the downbeats by 0.2 s; the music cuts stay on
the downbeats at 8, 16 and 20 s).

## Effects

All 21 names of `sfx_vocabulary` have a generator in `sfxlib.py`; all are synthesised (see
`CREDITS_sound.txt` for why). Structure: contact transient + body + modal resonance (inharmonic partials
with detuned twins so they beat like real plates), micro-rebounds, per-`var` randomisation of pitch, decay
and timing (seeded), one shared room (0.32 s, a few early reflections, nothing in the first 3 ms). Glass is
thick crystal: fundamental 392-1175 Hz, a knock and a thud under it, ring time constant 0.1-0.2 s, high modes
to 15.5 kHz. Tonal effects are tuned to C, D, G, A, which fit every chord of the track.

The three reworked in round 2:

- **servo** — two small brushless gearmotors (one per wing, 0.6 % apart). Speed goes up in 85 ms, holds, and
  comes down in 110 ms to a soft stop, so the pitch is steady for most of the move instead of sweeping. Layers
  locked to the rotor angle: commutation whine (12 per revolution), first-stage gear mesh (8 per revolution, a
  fifth below, with sidebands from the planet carrier), tooth chatter (band noise pulsed at the second-stage
  tooth rate, about 180 per second, and at planet pass), a faint rotor hum, a tiny backlash settle at the stop.
  The running speed puts whine / mesh on D6 / G5 (opening) and C6 / F5 (closing), inside the music's chords.
- **screw** — a jittered pulse train (motor commutation and gear teeth, about 170 per second at speed) ringing
  four housing resonances, plus tooth rattle; spins up in 35 ms, bogs down by a third in the last 28 ms as the
  screw seats; then the seating tick on `t` (partials to 13 kHz). The burst sits 4 dB under the tick.
- **spring** — a torsion spring's stiff-wire modes (inharmonic, 1.2-15 kHz, 15-55 ms) struck once and then
  re-struck by the coil turns chattering at shrinking intervals (8.5, 6.3, 4.7, 3.5, 2.6, 1.9 ms): a shiver of
  about 30 ms followed by a short ring. No pitch bend, no flutter LFO.

Also changed: `impact_drop` and `power_up` (see the table above; the two voices of `power_up` beat on the way
up and are phase-aligned to meet on arrival, where a soft G/D bell marks it, just after `ui_boot`'s G-D-G);
`riser` (lower, darker, G3 -> G4); `beep_ok` (G6 -> C7); `shimmer` (higher sparkle, thin around 3 kHz);
gear ticks numbered in the part name ring C7, D7, G7 in turn, the sun gear G6.

How `t` is used (the anchor is part of each generator):

| effect | anchor |
|---|---|
| contact sounds (thunk, clack, click, snap, tap, gear tick, spring, clink, clunk, card tap, impact, final hit), beep, UI chime | the hit starts on `t` |
| `servo`, `power_up`, `shimmer` | start on `t`, last `dur` |
| `whoosh`, `riser`, `glass_slide` | **end** on `t`, start `dur` earlier |
| `screw` | driver burst during the `dur` **before** `t`, seating tick on `t` |

`screw` and `glass_slide` lead in because `director/anim_lib.fly_in` lands every part on `t` and spins screws
while they travel. To flip one event add `"anchor": "start"` (or `"end"`): the first (last) audible sample is
then put on `t`.

Other rules:

- `gain` scales linearly from each effect's reference loudness (`sfxlib.LEVEL_DB`, K-weighted loudest 50 ms).
  `gain <= 0` is skipped. `pan` is constant-power.
- `var` picks the variation; where size matters the generator also reads the `part` name (`wing`, `leaf`,
  `lid`, `panel`, `post`, `sleeve`, `column`, `base`, `spine`, `motor`, `ring`, `psu`, `sun`, `planet_<n>` ...).
  Merged parts (`a+b`) work the same way.
- A small room change per picture shot, from words in the `shots` names (`mix.SHOT_ROOM`): close-ups (gear,
  drive, pcb, psu, stack, badge, card) send 3 dB less to the room, wide shots (lane, hero, alive) 2 dB more.
- The drop impact is added with the polarity that gives more 60-220 Hz energy against the music (here that is
  inverted, worth 0.7 dB).
- Unknown effect names never stop the build: a warning, then keyword match, else the nearest name, else a
  neutral `click`. Malformed events are skipped with a warning.
- **Drop-in recordings**: put `sound/sfx_override/<name>.wav` (used for every variation) or numbered
  `<name>_<n>.wav` (picked by `var` modulo the number of files) and re-run. Any sample rate, mono or
  stereo. The file is aligned by its content (first audible sample on `t`; last audible sample for
  whoosh/riser/glass_slide; loudest transient for screw), brought to the reference loudness, not stretched.

## Mix

- Music level: the full section after the drop is set to -15.5 LUFS on the mix bus before mastering.
- Ducking: `busy` x 3 dB (static, switched exactly on the drop) plus a sidechain from the effects: up to 7 dB
  under part sounds, 2.5 dB under the softer in-use sounds (servo, beep, card, chime, slide); 4 ms attack with
  10 ms look-ahead, 250 ms release. Three bands: below 200 Hz half as deep, above 1.5 kHz the sidechain part
  1.5 x as deep. Riser, impact, power-up, shimmer, whoosh and final hit do not duck the music.
- Master: gain to -16 LUFS, look-ahead true-peak limiter at -1.7 dBTP (margin for the AAC encode), applied
  identically to both stems.

Measured on the v8 timeline (`out/report.json`):

| | |
|---|---|
| integrated loudness | **-16.02 LUFS** (pyloudnorm), -16.0 LUFS (ffmpeg ebur128), LRA 6.7 LU |
| true peak | **-1.66 dBTP** (8x oversampled), -1.7 dBTP (ffmpeg); sample peak -1.71 dBFS; 0 samples at full scale |
| after AAC 256 k (as in `director/finish.sh`) | -16.0 LUFS, -1.6 dBTP |
| length / format | 1,248,000 frames = 26.0000 s, 48 kHz, stereo, PCM 24 |
| limiter | deepest 3.1 dB (wing landing, 14.5 s), 2.6 dB (14.75 s), 2.2 dB on the drop; more than 1 dB for 2.1 % of the time |
| stems | `sfx + music - mix` = -142 dB; sfx -18.7 LUFS, music -18.9 LUFS |
| mono fold-down | -0.7 dB (-16.7 LUFS); left and right within 0.14 dB |
| mix spectrum (octaves, dB re total) | 63: -7.6, 125: -5.9, 250: -6.8, 500: -8.9, 1k: -8.6, 2k: -13.0, 4k: -18.4, 8k: -18.4, 16k: -26.9 |

Loudness per section (mix / effects / music, LUFS): hook -22.1 / -23.1 / -26.7 · w1 -19.5 / -19.5 / -30.0 ·
w2 -19.4 / -19.9 / -27.9 · w3 -20.3 / -21.0 / -25.8 · w4 -15.0 / -15.6 / -24.1 · w5 -15.9 / -16.7 / -22.6 ·
w6 -17.4 / -19.3 / -22.7 (includes the held breath) · drop -12.9 / -18.3 / -14.0 · in use -15.1 / -19.7 / -16.8 ·
hero -22.2 / -23.5 / -26.7.

## Checks on the v8 build (all pass)

- **Sync A — every event alone**, rendered exactly as the mixer places it, anchor measured on the samples:
  80 of 80 events, **worst error 1.10 ms** (a whoosh is down by 60 dB 1.1 ms before `t`; screw ticks peak up
  to 0.6 ms after `t`; glass slides end 0.4 ms early; servo and riser within 0.3 ms; every contact sound
  within 0.07 ms). Limit 5 ms.
- **Sync B — independent of the generator code**: onset found in the finished effects stem: 60 transients,
  **worst 1.44 ms, mean -0.22 ms**. 6 more cannot be separated because another effect is as loud at that
  moment (clacks at 7.0 and 7.37 s inside the glass landings, clinks at 11.25 and 11.37 s inside the run of
  panels, the impact under the end of the riser, the UI chime under the power-up); check A covers them.
- Edit points: no isolated sample step in mix or music stem; second difference at the cuts 0.3-2.4 x the
  99.9th percentile of the surrounding 400 ms. Stems null against the mix at -142 dB (no delay in the master).
- Ends: signal in the first frame (-24 dB RMS), last 100 ms at -76 dB RMS, last sample 0.
- Spectrum and story beats: the numbers in the round-2 table above.

## Imperfect / not verified

1. **Not listened to.** Balance, tone and realism are judged from numbers and pictures only. A human pass on
   a phone speaker and on headphones is still needed, above all for the three reworked effects.
2. Servo, screw and spring are built from how such things work, not matched to a recording. The servo's two
   tones are tuned to the music's chords, which a real motor is not; if that reads as too musical, change
   `f_run` in `gen_servo`. `sfx_override/` takes recordings.
3. The hook is quiet: music -25.9 dB (K-weighted), mix -22.1 LUFS for the first two seconds, because it is
   tied to 1 LU under wave 3 and wave 3 sits low so that the rise has room. And the music steps down at 2.0 s
   (see "Reading to confirm").
4. Small parts in the last two waves have the least room: +3.6 dB over the music in the same 50 ms at worst
   (median +10.7 dB). `TRIM_END_DB` in `gg_music.py` trades this against the size of the rise.
5. The limiter works harder than in round 1: up to 3.1 dB on the wing landing, over 1 dB for 2.1 % of the
   time; about 6 dB at worst on a dense 149-event test timeline. Coinciding loud hits are held by it.
6. The top octave is still 6.6 dB under the target line at 16 kHz (partials stop at 15.5 kHz), and the glass
   slide and the screw burst still get part of their top from shaped noise.
7. The first slam is the loudest hit of the first eight seconds by loudness (+2.1 dB), not by peak: its peak
   is -3.2 dBFS in the effects stem, the glass landings at 7.25 and 7.5 s peak at -1.8 and -2.0 dBFS.
8. The drop is 2-7 LU louder than the build waves (mix -12.9 against -15.0 to -20.3 LUFS) and 9 LU louder
   than the hook.
9. The track's own final chord is quiet; most of the weight of the ending is the synthesised `final_hit`.
10. The music itself has little above 5 kHz before the drums enter (the recording is like that); the air in
    the build comes from the effects.
11. Music cut at 20.0 s (bar 10 -> 63) is exposed; it measures clean (ratio 2.4) but is the edit most worth
    a listen.
12. The room change per shot depends on words in the shot names; unknown names simply get no change.
13. Sync check B cannot see events buried under a louder effect (6 here); they rely on check A.
14. The edit rule is fixed to this track's bars: the four bars before the drop are always the clap section.
15. The source is a 256 kbps mp3 (the site's free download).
