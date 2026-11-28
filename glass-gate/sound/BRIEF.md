# Helper C — sound and music

You make the whole soundtrack: the part sounds (the star of the mix) and ONE music track under them.
Read `../shared/SPEC.md` and `../shared/timeline.json` first.

The picture: a glass speed gate (access-control lane) assembles itself in macro, part by part — metal base, motor and brass gears,
circuit boards, thick glass shells, screws, glass wings — every landing snappy and on the beat grid (120 BPM, 60 fps). At `drop_t` a wave of
light runs through the whole gate (the payoff), then a card is tapped, it beeps, the wings swing open and close, and the video ends on a slow orbit.

## Sound effects

The brief asked for real Pixabay sounds. pixabay.com answers this machine with a Cloudflare bot challenge, and we do not work round that.
So: **build every effect from scratch** (numpy/scipy), and make them sound recorded, not like beeps:
layered transient + body + resonance, modal synthesis for glass and metal (inharmonic partials, fast decays), filtered noise for air and friction,
tiny pitch/timing randomisation per `var`, a shared short room so everything sits in one space. Glass must sound like heavy crystal, not a wine glass.
The screw is a short driver whirr ending in a tick; the servo is a smooth precise whine with gear texture; the gear ticks are small bright brass rings.

- One generator per name in `timeline.json → sfx_vocabulary`, with variations selected by the event's `var`.
- Event fields: `t` = the moment of contact in seconds (for `whoosh` and `riser` the sound must **end** at `t`; `dur` is its length),
  `gain` 0…1, `pan` −1…1, optional `dur`.
- Drop-in overrides: if `sound/sfx_override/<name>.wav` or `<name>_<n>.wav` exists, use it instead of the synthesised one (so real
  recordings can be dropped in later without touching code). Say so in the notes.
- Unknown sfx names in a future timeline must not crash the mix: warn and fall back to the nearest sound.

## Music

- **One** instrumental track, no vocals, from incompetech.com (Kevin MacLeod, CC BY 4.0 — free to use on X with credit). Mood: clean, modern,
  rhythmic, premium tech; electronic/minimal rather than cinematic-orchestral. Prefer a track near 120 BPM with a clear grid.
- Fit it to the timeline: stretch to exactly the timeline BPM, cut on bar lines. Present from the very first frame (no fade-in, no silence),
  builds with each wave (edit the arrangement and/or automate a filter so the energy rises wave by wave), **a real drop exactly on `drop_t`**,
  and a clean ending with the video (a final hit on the `final_hit` event with its tail ringing out by `duration_s`, not a fade-out of a loop).
- The riser, impact and shimmer around the drop are sound effects and may be synthesised; no second music track.

## Mix

- The part sounds are the star. Duck the music under the busy waves (sidechain from the effects bus, plus the per-section `busy` value).
- 48 kHz stereo, exactly `duration_s` long. About **−16 LUFS** integrated (±0.5), true peak ≤ −1 dBTP. No clipping, no clicks at edits.

## Deliver

- `sound/mix.py` — one command regenerates everything from `shared/timeline.json` (the director will change the timing and add events, then re-run it):
  `sound/out/mix.wav` (24-bit), plus stems `sound/out/sfx.wav` and `sound/out/music.wav`.
- `sound/CREDITS_sound.txt` — the track title, artist, URL, licence and the exact attribution line; a plain statement of how the effects were made.
- `sound/NOTES.md` — track chosen and why, its original BPM and the stretch, how the edit was built, where the drop lands, measured LUFS / true peak,
  a check that effect onsets sit within ±5 ms of their event times, anything imperfect.
- Put the downloaded track in `sound/music_src/` (one file only in the end).

Check your own work by measurement (pyloudnorm or `ffmpeg -af ebur128`, onset detection, a spectrogram image you look at). You cannot listen,
so be rigorous about what you can measure, and conservative about anything harsh (no piercing highs, no long reverb mud).
