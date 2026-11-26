"""CLEAR PASSAGE — the one music track, cut to the timeline.

Track: "Nowhere Land" by Kevin MacLeod (incompetech.com), CC BY 4.0.

What was measured on the file (python gg_music.py --analyse repeats it):
  * tempo exactly 120.000 BPM (bars 1-3 and their repeat 96 s later line up to within 0.01 ms),
  * the first downbeat sits 1057 samples (44.1 kHz) into the decoded mp3 = encoder + decoder delay,
    so after trimming that, bar k starts at exactly (k - 1) * 2.000 s,
  * harmony: a 4-bar loop  C | G | Bb | F  (one chord per bar), final chord G sus on bar 65,
  * arrangement (bars, 1-based):
        1-7    arpeggios only                      8      arpeggios + drum fill into the entry
        9-16   FULL: kick, snare, hats; crash on bar 9  (the strongest entry of the track)
        17-24  B section, light                    25-32  full
        33-39  arpeggios + back-beat clap           40     same + snare fill
        41-48  B section, full                     49-56  arpeggios only (56 fill)
        57-64  full, leads into the ending         65     final chord (G3 held 2 s) and reverb tail

How it is cut (every cut is on a bar line of the grid that is anchored on `drop_t`):
        bars before the drop, counted back from it:
            the last 4      <- source 37-40   arpeggios + clap, snare fill in the last bar
            the 4 before    <- source 1-4     arpeggios only         (more bars: 1-4 repeats)
        from the drop       <- source 9, 10.. the full entry with the crash
        the last 2 bars before the final hit  <- source 63-64 (when the drop-to-end length is a multiple
                               of 4 bars, so the chord loop stays intact), which run on, uncut, into
        the final hit       <- source 65      the track's own final chord, tail shaped to end with the video

On top of the cut, before the drop: a low-pass that opens one step per timeline section (wave) through the
range where the arpeggios live (550 Hz -> 8 kHz), a level step per section, the lowest octave held back
(high-pass) until the drop, and a short dip right before it. A first section called hook/intro is kept
fairly open (the teaser); the filter shuts as the build starts and then opens wave by wave.
"""
import os
import re
import subprocess

import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))

TRACK = dict(
    title='Nowhere Land',
    artist='Kevin MacLeod',
    file=os.path.join(HERE, 'music_src', 'Nowhere Land.mp3'),
    url='https://incompetech.com/music/royalty-free/mp3-royaltyfree/Nowhere%20Land.mp3',
    page='https://incompetech.com/music/royalty-free/music.html',
    isrc='USUAN1600051',
    licence='Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licence_url='https://creativecommons.org/licenses/by/4.0/',
    bpm=120.0,                  # measured
    lead_in_44k1=1057,          # samples before the first downbeat in the decoded mp3
    beats_per_bar=4,
    intro=(1, 4),               # arpeggios only, one full chord loop
    build=(37, 40),             # arpeggios + clap, fill in the last bar
    entry=9,                    # first bar of the full section (crash)
    entry_len=8,                # bars 9-16 are one full 8-bar phrase
    ending=(63, 64),            # the two bars that lead into the final chord
    final=65,                   # final chord
    loop=4,                     # chord loop length in bars
)

XFADE_S = 0.010                 # equal-power crossfade, placed just BEFORE each cut so downbeats stay intact
LP_START_HZ = 550.0             # low-pass in the first build section ...
LP_END_HZ = 8000.0              # ... and in the last section before the drop (fully open from the drop)
TRIM_START_DB = -2.0            # level in the first build section relative to the last one before the drop
HOOK_LP_HZ = 2500.0             # a leading section named hook/intro: fairly open, slightly under full level
HOOK_TRIM_DB = -4.0
HP_PRE_DROP_HZ = 85.0           # the lowest octave is held back until the drop
DIP_S = 0.19                    # pre-drop dip: starts this long before the drop
DIP_DB = -20.0


# --------------------------------------------------------------------------------------- source
def _ffmpeg_pcm(args, stdin=None):
    p = subprocess.run(['ffmpeg', '-v', 'error'] + args, input=stdin, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError('ffmpeg failed: ' + p.stderr.decode(errors='replace')[:400])
    return np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def load_source(tempo_ratio=1.0, path=None):
    """Decode the track to 48 kHz stereo with the first downbeat on sample 0 and, if needed,
    time-stretched (pitch kept) by `tempo_ratio` = timeline bpm / source bpm."""
    path = path or TRACK['file']
    if not os.path.exists(path):
        raise FileNotFoundError(f'music source missing: {path}')
    x = _ffmpeg_pcm(['-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'])
    x = x[TRACK['lead_in_44k1']:]
    if abs(tempo_ratio - 1.0) < 1e-6:
        return signal.resample_poly(x, 160, 147, axis=0)
    y = _ffmpeg_pcm(['-f', 'f32le', '-ar', '44100', '-ac', '2', '-i', '-',
                     '-af', f'rubberband=tempo={tempo_ratio:.9f}:pitch=1:transients=crisp:detector=compound:window=standard',
                     '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], stdin=x.astype(np.float32).tobytes())
    return y


# --------------------------------------------------------------------------------------- plan
def plan(tl):
    """Decide which source bar plays in which timeline bar. Returns a dict with the bar length, the
    list of segments [(t0, t1, src_t0, label)], the cut times and the final-hit time."""
    bpm = float(tl['bpm'])
    bar = 60.0 / bpm * TRACK['beats_per_bar']
    dur = float(tl['duration_s'])
    drop = float(np.clip(tl['drop_t'], 0.0, dur))
    final_t = tl.get('final_t')
    notes = []
    if final_t is None or not (drop < final_t < dur):
        k = int(np.floor((dur - 1.5 - drop) / bar + 1e-6))
        final_t = drop + max(k, 1) * bar if drop + bar < dur else None
        notes.append(f'no usable final_hit event: final chord placed at {final_t}')
    bars = []                                            # (t0, t1, source bar)
    n_pre = int(np.ceil(drop / bar - 1e-6))
    for j in range(n_pre, 0, -1):
        if j <= 4:
            sb = TRACK['build'][1] + 1 - j
        else:
            sb = TRACK['intro'][1] - ((j - 5) % TRACK['loop'])
        bars.append((drop - j * bar, drop - (j - 1) * bar, sb))
    end_of_groove = final_t if final_t is not None else dur
    m_exact = (end_of_groove - drop) / bar
    on_grid = abs(m_exact - round(m_exact)) < 0.002 and round(m_exact) >= 1
    m = int(round(m_exact)) if on_grid else int(np.ceil(m_exact - 1e-6))
    natural_end = on_grid and final_t is not None and m % TRACK['loop'] == 0 and m >= 4
    if final_t is not None and not on_grid:
        notes.append('final hit is not a whole number of bars after the drop: the last bar is cut short')
    for k in range(m):
        r = m - k
        sb = TRACK['ending'][1] + 1 - r if (natural_end and r <= 2) else TRACK['entry'] + (k % TRACK['entry_len'])
        bars.append((drop + k * bar, min(drop + (k + 1) * bar, end_of_groove), sb))
    if final_t is not None:
        bars.append((final_t, dur, TRACK['final']))
    segs = []
    for t0, t1, sb in bars:
        s0 = (sb - 1) * bar
        if t0 < 0:
            s0 -= t0
            t0 = 0.0
        if t1 - t0 <= 1e-9:
            continue
        if segs and abs(segs[-1][2] + (segs[-1][1] - segs[-1][0]) - s0) < 1e-6 and abs(segs[-1][1] - t0) < 1e-9:
            segs[-1] = (segs[-1][0], t1, segs[-1][2], segs[-1][3], sb)
        else:
            segs.append((t0, t1, s0, sb, sb))
    segments = [dict(t0=round(a, 6), t1=round(b, 6), src_t0=round(c, 6), src_bars=f'{d}-{e}' if e != d else f'{d}')
                for a, b, c, d, e in segs]
    return dict(bar=bar, bpm=bpm, drop_t=drop, final_t=final_t, duration=dur, segments=segments,
                cuts=[s['t0'] for s in segments[1:]], notes=notes, natural_end=bool(natural_end))


# --------------------------------------------------------------------------------------- render
def _smooth(x, seconds):
    n = max(1, int(seconds * SR))
    if n <= 1:
        return x
    w = np.hanning(n + 2)[1:-1]
    w /= w.sum()
    pad = np.concatenate([np.full(n, x[0]), x, np.full(n, x[-1])])
    return np.convolve(pad, w, 'same')[n:-n]


def render(tl, verbose=True):
    """Returns (music, info): the edited, automated (not yet ducked) music at programme length."""
    P = plan(tl)
    ratio = P['bpm'] / TRACK['bpm']
    src = load_source(ratio)
    n = int(round(P['duration'] * SR))
    out = np.zeros((n, 2))
    xf = int(XFADE_S * SR)

    def src_slice(i0, m):
        y = np.zeros((m, 2))
        a, b = max(i0, 0), min(i0 + m, len(src))
        if b > a:
            y[a - i0:b - i0] = src[a:b]
        return y

    for k, s in enumerate(P['segments']):
        i0, i1 = int(round(s['t0'] * SR)), min(int(round(s['t1'] * SR)), n)
        j0 = int(round(s['src_t0'] * SR))
        out[i0:i1] = src_slice(j0, i1 - i0)
        if k > 0 and i0 >= xf:                           # equal-power crossfade into the pre-roll of the new bar
            w = np.sin(0.5 * np.pi * (np.arange(xf) + 0.5) / xf)[:, None]
            out[i0 - xf:i0] = out[i0 - xf:i0] * np.sqrt(1.0 - w ** 2) + src_slice(j0 - xf, xf) * w

    t = np.arange(n) / SR
    drop_i = int(round(P['drop_t'] * SR))
    info = dict(P)
    info.update(track=TRACK['title'], source_bpm=TRACK['bpm'], tempo_ratio=ratio, stretch_percent=(ratio - 1.0) * 100.0)

    # ---- build automation before the drop: low-pass opening + level step per section (wave)
    if drop_i > 0:
        secs = sorted([s for s in tl.get('sections', []) if s.get('t0', 0) < P['drop_t'] - 1e-6], key=lambda s: s['t0'])
        if len(secs) < 2:                                # no section list: a plain 2-second staircase
            k = max(2, int(np.ceil(P['drop_t'] / 2.0)))
            secs = [dict(name=f'step{i}', t0=i * P['drop_t'] / k, t1=(i + 1) * P['drop_t'] / k) for i in range(k)]
        hook = None
        if len(secs) >= 3 and re.search(r'hook|intro|open|tease', str(secs[0].get('name', '')), re.I):
            hook, secs = secs[0], secs[1:]
        fc = np.full(drop_i, HOOK_LP_HZ if hook else LP_START_HZ)
        trim = np.full(drop_i, HOOK_TRIM_DB if hook else TRIM_START_DB)
        steps = []
        if hook:
            steps.append(dict(section=hook.get('name', 'hook'), t0=hook['t0'], lowpass_hz=round(HOOK_LP_HZ), trim_db=HOOK_TRIM_DB))
        for i, s in enumerate(secs):
            a = i / max(1, len(secs) - 1)
            f_i = LP_START_HZ * (LP_END_HZ / LP_START_HZ) ** a
            g_i = TRIM_START_DB * (1.0 - a)
            j0 = int(round(max(s['t0'], 0.0) * SR))
            fc[j0:] = f_i
            trim[j0:] = g_i
            steps.append(dict(section=s.get('name', f'section{i}'), t0=s['t0'], lowpass_hz=round(f_i), trim_db=round(g_i, 2)))
        info['build_steps'] = steps
        logf = _smooth(np.log2(fc), 0.15)
        trim = _smooth(trim, 0.15)
        pre = out[:drop_i + SR // 2].copy()              # filter a little past the drop, then cut: no edge effects
        hp = signal.butter(2, HP_PRE_DROP_HZ, 'hp', fs=SR, output='sos')
        pre = signal.sosfiltfilt(hp, pre, axis=0)
        cuts_hz = 250.0 * 2.0 ** (np.arange(0, 13) / 2.0)   # 250 Hz .. 16 kHz in half octaves
        bank = [signal.sosfiltfilt(signal.butter(2, f, 'lp', fs=SR, output='sos'), pre, axis=0)[:drop_i] for f in cuts_hz]
        pos = np.clip((logf - np.log2(cuts_hz[0])) * 2.0, 0.0, len(cuts_hz) - 1.000001)
        lo = np.floor(pos).astype(int)
        fr = (pos - lo)[:, None]
        acc = np.zeros((drop_i, 2))
        for b in range(len(cuts_hz)):                    # zero-phase filters: blending neighbours is artefact-free
            wsel = np.where(lo == b, 1.0 - fr[:, 0], 0.0) + np.where(lo + 1 == b, fr[:, 0], 0.0)
            if wsel.any():
                acc += bank[b] * wsel[:, None]
        g = 10.0 ** (trim / 20.0)
        # the dip: the last moments before the drop almost empty, so the drop lands on a clean slate
        dip = np.ones(drop_i)
        d0 = max(0, drop_i - int(DIP_S * SR))
        d1 = max(d0 + 1, drop_i - int(0.03 * SR))
        ramp = 0.5 + 0.5 * np.cos(np.pi * np.arange(d1 - d0) / (d1 - d0))
        floor = 10.0 ** (DIP_DB / 20.0)
        dip[d0:d1] = floor + (1.0 - floor) * ramp
        dip[d1:] = floor
        rel = min(int(0.004 * SR), drop_i - d1)          # 4 ms back up, complete exactly on the drop
        if rel > 0:
            dip[drop_i - rel:] = floor + (1.0 - floor) * (0.5 - 0.5 * np.cos(np.pi * (np.arange(rel) + 1) / rel))
        out[:drop_i] = acc * (g * dip)[:, None]

    # ---- the ending: the track's own final chord, tail shaped so that it has rung out by the last frame
    if P['final_t'] is not None:
        fi = int(round(P['final_t'] * SR))
        room = n - fi
        hold = int(min(0.35 * SR, room * 0.3))
        end = n - int(0.03 * SR)
        if end > fi + hold:
            m = end - (fi + hold)
            env = np.ones(n - fi)
            env[hold:hold + m] = (0.5 + 0.5 * np.cos(np.pi * np.arange(m) / m)) ** 1.5
            env[hold + m:] = 0.0
            out[fi:] *= env[:, None]
    # ---- programme edges: 2 ms in (the track starts on its first note, this only removes the mp3 pre-echo step)
    a = int(0.002 * SR)
    out[:a] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a))[:, None]
    if verbose:
        for s in P['segments']:
            print(f"[music] {s['t0']:7.3f}-{s['t1']:7.3f} s  <- source bars {s['src_bars']:>6s} (from {s['src_t0']:.3f} s)")
        for nt in P['notes']:
            print('[music] note:', nt)
    return out, info


# --------------------------------------------------------------------------------------- analysis
def analyse():
    """Re-measure the facts the edit relies on: tempo, lead-in, where the full section enters."""
    x = _ffmpeg_pcm(['-i', TRACK['file'], '-f', 'f32le', '-ac', '2', '-ar', '44100', '-']).mean(axis=1)
    sr = 44100
    off = TRACK['lead_in_44k1']
    print(f'file: {TRACK["file"]}  {len(x) / sr:.2f} s')

    def lag(t1, t2, L=6.0, maxlag=0.05):
        a = x[int(t1 * sr) + off:int((t1 + L) * sr) + off]
        m = int(maxlag * sr)
        b = x[int(t2 * sr) + off - m:int((t2 + L) * sr) + off + m]
        c = signal.correlate(b, a, 'valid')
        i = int(np.argmax(c))
        d = 0.5 * (c[i - 1] - c[i + 1]) / (c[i - 1] - 2 * c[i] + c[i + 1]) if 0 < i < len(c) - 1 else 0.0
        return (i + d - m) / sr

    for t1, t2 in ((0.5, 96.5), (16.5, 112.5)):
        e = lag(t1, t2)
        print(f'repeat {t1:5.1f} s -> {t2:5.1f} s: off by {e * 1000:+.3f} ms over {t2 - t1:.0f} s  => {TRACK["bpm"] * (t2 - t1) / (t2 - t1 + e):.4f} BPM')
    sos = signal.butter(4, [30, 150], 'bp', fs=sr, output='sos')
    low = signal.sosfiltfilt(sos, x)
    for bar in (9, 61, 65):
        t0 = (bar - 1) * 2.0
        rows = []
        for ms in (-10, -5, 0, 5):
            a = int((t0 + ms / 1000) * sr) + off
            rows.append(10 * np.log10(np.mean(low[a:a + int(0.005 * sr)] ** 2) + 1e-12))
        print(f'bar {bar:2d} downbeat, low-band level in 5 ms steps from -10 ms: ' + ' '.join(f'{v:6.1f}' for v in rows) + ' dB  (jump at 0 = on the grid)')
    f, tt, S = signal.stft(x[off:], sr, nperseg=2048, noverlap=1024)
    P = np.abs(S) ** 2
    hi = P[(f >= 5000)].sum(0)
    tot = P.sum(0)
    print('bar: level dB / share above 5 kHz dB')
    for b0 in range(0, 66, 8):
        row = []
        for b in range(b0, min(b0 + 8, 66)):
            sel = (tt >= b * 2.0) & (tt < b * 2.0 + 2.0)
            if sel.any():
                row.append(f'{b + 1:2d}:{10 * np.log10(tot[sel].mean() + 1e-12):5.1f}/{10 * np.log10(hi[sel].mean() / (tot[sel].mean() + 1e-12) + 1e-12):5.1f}')
        print('  ' + '  '.join(row))


if __name__ == '__main__':
    import sys
    if '--analyse' in sys.argv:
        analyse()
    else:
        import json
        tl = json.load(open(os.path.join(HERE, '..', 'shared', 'timeline.json')))
        fh = [e['t'] for e in tl.get('events', []) if e.get('sfx') == 'final_hit']
        tl['final_t'] = fh[-1] if fh else None
        print(json.dumps(plan(tl), indent=1))
