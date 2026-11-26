#!/usr/bin/env python
"""CLEAR PASSAGE — the soundtrack. One command rebuilds everything from shared/timeline.json:

    /opt/blender-env/venv/bin/python sound/mix.py

    sound/out/mix.wav      48 kHz stereo 24-bit, exactly duration_s long, -16 LUFS, true peak <= -1 dBTP
    sound/out/sfx.wav      effects stem   } same master gain and limiter curve as the mix,
    sound/out/music.wav    music stem     } so sfx.wav + music.wav == mix.wav
    sound/out/report.json  measurements (loudness, true peak, sync check, edit points)   [skip: --no-verify]
    sound/out/spectrogram.png
    options: --timeline PATH  --out DIR  --no-verify  --strict (exit status 2 when a check fails)

Nothing about timing is hard-coded: bpm, duration_s, drop_t, sections (busy) and events are read from the
timeline; the music edit is planned from them (gg_music.plan) and every effect is placed from its event.

Event fields used:  t, sfx, gain (0..1, <= 0 is skipped), pan (-1..1), var, dur, part,
                    anchor ("start" | "end", optional: force the sound to start or to end on t).
Effects are synthesised (sfxlib.py). Drop-in recordings: put  sound/sfx_override/<name>.wav  or numbered
variations  <name>_<n>.wav  and they are used instead (see NOTES.md). Unknown names: a warning and the
nearest known sound.
"""
import argparse
import glob
import json
import os
import re
import sys
import time

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gg_music  # noqa: E402
import sfxlib    # noqa: E402

SR = 48000
TARGET_LUFS = -16.0
CEILING_DBTP = -1.2             # limiter ceiling (the delivery limit is -1.0 dBTP)

MUSIC_FULL_LUFS = -15.5         # loudness of the un-ducked full section (after the drop) on the mix bus, before mastering
SFX_BUS_DB = 0.0                # effects bus trim; effect-to-effect balance lives in sfxlib.LEVEL_DB
DUCK_STATIC_DB = 4.5            # music attenuation at busy = 1.0 (scaled by each section's `busy`)
DUCK_DYN_MAX_DB = 5.0           # extra, from the effects-bus sidechain: part sounds (sfxlib.DUCK_FULL) ...
DUCK_DYN_HALF_DB = 2.5          # ... and the softer in-use / UI sounds (sfxlib.DUCK_HALF)
DUCK_THRESHOLD_DB = -40.0       # sidechain threshold (effects-bus RMS, dBFS) and slope (dB of ducking per dB above it)
DUCK_SLOPE = 0.32
DUCK_LOW_FACTOR = 0.5           # below DUCK_XOVER_HZ the music is ducked only this much (keeps the floor steady)
DUCK_XOVER_HZ = 200.0
DUCK_LOOKAHEAD_S = 0.010
ROOM_RT60 = 0.32


def log(*a):
    print(*a, flush=True)


# --------------------------------------------------------------------------------------- timeline
def load_timeline(path):
    tl = json.load(open(path))
    fps = float(tl.get('fps', 60))
    tl['fps'] = fps
    tl['bpm'] = float(tl.get('bpm', 120))
    if not tl.get('duration_s'):
        tl['duration_s'] = float(tl.get('frames', 1560)) / fps
    tl['duration_s'] = float(tl['duration_s'])
    evs = []
    for i, e in enumerate(tl.get('events', [])):
        try:
            ev = dict(e)
            ev['t'] = float(e['t'])
            ev['sfx'] = str(e['sfx'])
            ev['gain'] = float(e.get('gain', 0.8))
            ev['pan'] = float(np.clip(e.get('pan', 0.0), -1.0, 1.0))
            ev['var'] = int(e.get('var', 0) or 0)
            ev['dur'] = float(e['dur']) if e.get('dur') else None
            ev['part'] = str(e.get('part', ''))
            evs.append(ev)
        except (KeyError, TypeError, ValueError) as ex:
            log(f'[warn] event {i} skipped ({ex!r}): {e}')
    tl['events'] = sorted(evs, key=lambda e: e['t'])
    if tl.get('drop_t') is None:
        cand = [e['t'] for e in tl['events'] if e['sfx'] in ('impact_drop', 'riser')] + \
               [s['t0'] for s in tl.get('sections', []) if 'drop' in str(s.get('name', ''))]
        tl['drop_t'] = cand[0] if cand else round(0.6 * tl['duration_s'], 3)
        log(f"[warn] timeline has no drop_t; using {tl['drop_t']}")
    tl['drop_t'] = float(tl['drop_t'])
    fh = [e['t'] for e in tl['events'] if e['sfx'] == 'final_hit' and e['gain'] > 0]
    tl['final_t'] = fh[-1] if fh else None
    secs = []
    for s in tl.get('sections', []) or []:
        try:
            secs.append(dict(name=str(s.get('name', '')), t0=float(s['t0']), t1=float(s['t1']), busy=float(s.get('busy', 0.5))))
        except (KeyError, TypeError, ValueError):
            pass
    tl['sections'] = sorted(secs, key=lambda s: s['t0'])
    return tl


# --------------------------------------------------------------------------------------- effects
class Overrides:
    """sound/sfx_override/<name>.wav or <name>_<n>.wav replace the synthesised effect of that name."""

    def __init__(self, folder):
        self.files = {}
        for p in sorted(glob.glob(os.path.join(folder, '*.wav'))):
            base = os.path.splitext(os.path.basename(p))[0]
            m = re.fullmatch(r'(.+?)_(\d+)', base)
            if m and m.group(1) in sfxlib.GENERATORS:
                self.files.setdefault(m.group(1), {})[int(m.group(2))] = p
            else:
                self.files.setdefault(base, {})[-1] = p
        self.cache = {}

    def get(self, name, var):
        d = self.files.get(name)
        if not d:
            return None
        nums = sorted(k for k in d if k >= 0)
        path = d[nums[var % len(nums)]] if nums else d[-1]
        if path not in self.cache:
            y, sr = sf.read(path, dtype='float64', always_2d=True)
            if y.shape[1] > 2:
                y = y[:, :2]
            if sr != SR:
                g = np.gcd(int(sr), SR)
                y = signal.resample_poly(y, SR // g, int(sr) // g, axis=0)
            pk = np.max(np.abs(y)) + 1e-12
            loud = np.nonzero(np.abs(y).max(axis=1) > 0.01 * pk)[0]
            gname = sfxlib.resolve(name)[0]
            mode = sfxlib.ANCHOR.get(gname, 'start')
            if mode == 'end':
                anchor = int(loud[-1]) + 1               # last audible sample sits on t
            elif mode == 'lead':
                anchor = int(np.argmax(np.abs(y).max(axis=1)))   # loudest transient sits on t
            else:
                anchor = int(loud[0])                    # first audible sample sits on t
            y = sfxlib.finish(y if y.shape[1] == 2 else y[:, 0], gname)
            self.cache[path] = (y, anchor)
        return self.cache[path]


def room_send(bus, ir):
    """Stereo convolution with the shared room (a little cross-feed keeps panned sources from sounding split)."""
    feed = np.stack([0.8 * bus[:, 0] + 0.2 * bus[:, 1], 0.8 * bus[:, 1] + 0.2 * bus[:, 0]], axis=1)
    wet = np.stack([signal.fftconvolve(feed[:, c], ir[:, c])[:len(bus)] for c in (0, 1)], axis=1)
    return wet


def render_event(e, duration, overrides=None):
    """One event as (stereo array, first sample index on the programme, resolved name, send gain).
    The index may be negative (the caller clips); this is the only place where an event time becomes samples."""
    name = e['sfx']
    gname, exact = sfxlib.resolve(name)
    ov = overrides.get(name, e['var']) if overrides is not None else None
    if ov is not None:
        y, anchor = ov
        gname = name if name in sfxlib.GENERATORS else gname
    else:
        y, anchor, gname = sfxlib.render(name, e['var'], e['dur'], e['part'], room_s=max(0.2, duration - e['t']))
    forced = e.get('anchor')
    if forced == 'start':
        anchor = 0
    elif forced == 'end':
        anchor = len(y)
    g = float(np.clip(e['gain'], 0.0, 1.5)) * 10.0 ** (SFX_BUS_DB / 20.0)
    pan = e['pan']
    if y.ndim == 1:
        st = sfxlib.pan_mono(y, pan)
    else:                                                # stereo effect: balance
        st = y * np.array([min(1.0, 1.0 - pan), min(1.0, 1.0 + pan)])[None, :]
    i0 = int(round(e['t'] * SR)) - anchor
    send = 10.0 ** (sfxlib.ROOM_SEND_DB.get(gname, -15.0) / 20.0)
    return st * g, i0, gname, send


def build_sfx(tl, overrides):
    n = int(round(tl['duration_s'] * SR))
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))
    key = np.zeros((n, 2))                               # what the music ducks under: part sounds
    key2 = np.zeros((n, 2))                              # ... and, half as deep, in-use / UI sounds
    warned = set()
    used = {}
    for e in tl['events']:
        if e['gain'] <= 0.0:
            continue
        if not (-1.0 <= e['t'] <= tl['duration_s'] + 1.0):
            log(f"[warn] event outside the programme skipped: {e['sfx']} at {e['t']}")
            continue
        gname, exact = sfxlib.resolve(e['sfx'])
        if not exact and e['sfx'] not in warned and (overrides is None or overrides.get(e['sfx'], 0) is None):
            warned.add(e['sfx'])
            log(f"[warn] unknown sfx '{e['sfx']}' -> using '{gname}'")
        y, i0, gname, sg = render_event(e, tl['duration_s'], overrides)
        a, b = max(i0, 0), min(i0 + len(y), n)
        if b <= a:
            continue
        seg = y[a - i0:b - i0]
        dry[a:b] += seg
        send[a:b] += seg * sg
        if gname in sfxlib.DUCK_FULL:
            key[a:b] += seg
        elif gname in sfxlib.DUCK_HALF:
            key2[a:b] += seg
        used[gname] = used.get(gname, 0) + 1
    wet = room_send(send, sfxlib.room_ir(ROOM_RT60))
    bus = dry + wet
    bus = signal.sosfiltfilt(signal.butter(2, 25.0, 'hp', fs=SR, output='sos'), bus, axis=0)
    return bus, (key, key2), used


# --------------------------------------------------------------------------------------- ducking
def busy_curve(tl, n):
    """Per-sample `busy` from the sections: 200 ms ramps centred on section changes, but the change
    on the drop is instantaneous (the music must be fully up on the downbeat)."""
    busy = np.full(n, 0.5)
    for s in tl['sections']:
        busy[int(max(0, s['t0']) * SR):int(min(tl['duration_s'], s['t1']) * SR)] = s['busy']
    k = int(0.2 * SR)
    smooth = uniform_filter1d(busy, size=k, mode='nearest')
    d = int(round(tl['drop_t'] * SR))
    if 0 < d < n:
        smooth[max(0, d - k):d] = busy[max(0, d - k):d]
        smooth[d:min(n, d + k)] = busy[d:min(n, d + k)]
    return smooth


def sidechain_db(sfx, n, max_db):
    """Envelope follower on the effects bus -> dB of extra ducking (fast attack, 220 ms release, 10 ms look-ahead)."""
    p = np.maximum(uniform_filter1d((sfx ** 2).sum(axis=1), size=int(0.010 * SR), mode='nearest'), 0.0)
    step = 48                                            # 1 kHz control rate
    m = n // step
    blk = np.sqrt(p[:m * step].reshape(m, step).max(axis=1) + 1e-20)
    env = np.empty(m)
    y = 0.0
    k_rel = np.exp(-1.0 / (0.250 * SR / step))
    k_att = np.exp(-1.0 / (0.004 * SR / step))
    for i, v in enumerate(blk.tolist()):
        y = v + (y - v) * (k_att if v > y else k_rel)
        env[i] = y
    env_db = 20.0 * np.log10(env + 1e-10)
    duck = np.clip((env_db - DUCK_THRESHOLD_DB) * DUCK_SLOPE, 0.0, max_db)
    full = np.interp(np.arange(n), (np.arange(m) + 0.5) * step, duck)
    la = int(DUCK_LOOKAHEAD_S * SR)
    full = np.concatenate([full[la:], np.full(la, full[-1])])
    return uniform_filter1d(full, size=int(0.006 * SR), mode='nearest')


def duck_music(music, key, tl):
    n = len(music)
    static = busy_curve(tl, n) * DUCK_STATIC_DB
    dyn = np.maximum(sidechain_db(key[0], n, DUCK_DYN_MAX_DB), sidechain_db(key[1], n, DUCK_DYN_HALF_DB))
    total = static + dyn
    low = signal.sosfiltfilt(signal.butter(2, DUCK_XOVER_HZ, 'lp', fs=SR, output='sos'), music, axis=0)
    high = music - low
    out = high * (10.0 ** (-total / 20.0))[:, None] + low * (10.0 ** (-total * DUCK_LOW_FACTOR / 20.0))[:, None]
    return out, total


# --------------------------------------------------------------------------------------- master
def true_peak_env(x, os_=4):
    """Per-sample inter-sample peak estimate (max of the 4x oversampled signal around each sample)."""
    up = np.abs(signal.resample_poly(x, os_, 1, axis=0)).max(axis=1)
    up = maximum_filter1d(up, size=2 * os_ - 1, mode='nearest')
    return up[::os_][:len(x)]


def true_peak_db(x, os_=8):
    up = signal.resample_poly(x, os_, 1, axis=0)
    return 20.0 * np.log10(np.max(np.abs(up)) + 1e-12)


def limiter_gain(x, ceiling_db, lookahead_ms=3.0, release_ms=90.0):
    """Look-ahead true-peak limiter; returns the gain curve (<= 1)."""
    c = 10.0 ** (ceiling_db / 20.0)
    req = np.minimum(1.0, c / np.maximum(true_peak_env(x), 1e-9))
    if req.min() >= 1.0:
        return np.ones(len(x))
    la = max(2, int(lookahead_ms * SR / 1000.0))
    hold_db = 20.0 * np.log10(minimum_filter1d(req, size=2 * la + 1, mode='nearest'))
    k = np.exp(-1.0 / (release_ms * SR / 1000.0))
    rel = np.empty(len(x))
    y = 0.0
    for i, v in enumerate(hold_db.tolist()):             # instant attack (already looked ahead), exponential release
        y = v if v < y * k else y * k
        rel[i] = y
    g = 10.0 ** (uniform_filter1d(rel, size=la, mode='nearest') / 20.0)
    return np.minimum(g, 1.0)


def master(sfx, music, target=TARGET_LUFS, ceiling=CEILING_DBTP):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    mix = sfx + music
    gain = 10.0 ** ((target - meter.integrated_loudness(mix)) / 20.0)
    g = np.ones(len(mix))
    ceil = ceiling
    for _ in range(8):
        g = limiter_gain(mix * gain, ceil)
        out = mix * (gain * g)[:, None]
        lufs = meter.integrated_loudness(out)
        tp = true_peak_db(out)
        if tp > ceiling + 0.05:
            ceil -= (tp - ceiling) + 0.02
            continue
        if abs(lufs - target) < 0.02:
            break
        gain *= 10.0 ** ((target - lufs) / 20.0)
    curve = gain * g
    gr = -20.0 * np.log10(g)
    hits = []
    blk = int(0.05 * SR)
    for i in range(0, len(gr), blk):                     # deepest gain reduction per 50 ms, for the report
        j = i + int(np.argmax(gr[i:i + blk]))
        if gr[j] > 0.5:
            hits.append((round(j / SR, 3), round(float(gr[j]), 2)))
    hits = sorted(hits, key=lambda h: -h[1])[:16]
    stats = dict(pre_gain_db=20 * np.log10(gain), limiter_max_reduction_db=float(-20 * np.log10(g.min())),
                 limiter_deepest=[dict(t=t_, db=d_) for t_, d_ in hits],
                 limiter_active_percent=float(100.0 * np.mean(g < 0.999)),
                 limiter_over_1db_percent=float(100.0 * np.mean(g < 10 ** (-1 / 20.0))))
    return curve, stats


# --------------------------------------------------------------------------------------- main
def build(tl, verbose=True):
    """Returns dict(mix, sfx, music, info). Everything at 48 kHz stereo, programme length."""
    import pyloudnorm as pyln
    t0 = time.time()
    n = int(round(tl['duration_s'] * SR))
    overrides = Overrides(os.path.join(HERE, 'sfx_override'))
    if overrides.files and verbose:
        log('[sfx] override files in use:', {k: len(v) for k, v in overrides.files.items()})
    sfx, key, used = build_sfx(tl, overrides)
    if verbose:
        log(f'[sfx] {sum(used.values())} events placed:', ', '.join(f'{k} x{v}' for k, v in sorted(used.items())))
    music, minfo = gg_music.render(tl, verbose=verbose)
    # level: the full section after the drop defines the music level
    meter = pyln.Meter(SR)
    d = int(round(tl['drop_t'] * SR))
    f = int(round((tl['final_t'] if tl['final_t'] is not None else tl['duration_s']) * SR))
    ref = music[d:f] if f - d > int(0.8 * SR) else music
    ref_l = meter.integrated_loudness(ref) if len(ref) > int(0.5 * SR) else -20.0
    if not np.isfinite(ref_l):
        ref_l = -20.0
    music = music * 10.0 ** ((MUSIC_FULL_LUFS - ref_l) / 20.0)
    music, duck_db = duck_music(music, key, tl)
    # programme end: everything is at zero on the last sample
    k = int(0.03 * SR)
    w = (0.5 + 0.5 * np.cos(np.pi * (np.arange(k) + 1) / k))[:, None]
    sfx[-k:] *= w
    music[-k:] *= w
    if not (np.isfinite(sfx).all() and np.isfinite(music).all()):
        raise FloatingPointError('non-finite samples on a bus before mastering')
    curve, mstats = master(sfx, music)
    sfx_m = sfx * curve[:, None]
    music_m = music * curve[:, None]
    mix = sfx_m + music_m
    info = dict(music=minfo, master=mstats, events_placed=used, duck_db_max=float(duck_db.max()),
                duck_db_mean_pre_drop=float(duck_db[:max(1, d)].mean()), render_seconds=round(time.time() - t0, 2),
                overrides={k_: [os.path.basename(p) for p in v.values()] for k_, v in overrides.files.items()})
    return dict(mix=mix, sfx=sfx_m, music=music_m, info=info, n=n)


def main():
    ap = argparse.ArgumentParser(description='Build the CLEAR PASSAGE soundtrack from the timeline.')
    ap.add_argument('--timeline', default=os.path.join(HERE, '..', 'shared', 'timeline.json'))
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--no-verify', action='store_true', help='skip the measurement report and the spectrogram')
    ap.add_argument('--strict', action='store_true', help='exit with status 2 if a verification check fails')
    a = ap.parse_args()
    tl = load_timeline(a.timeline)
    log(f"[timeline] v{tl.get('version', '?')}  {tl['duration_s']} s  {tl['bpm']:g} BPM  drop {tl['drop_t']} s  "
        f"final hit {tl['final_t']}  {len(tl['events'])} events")
    r = build(tl)
    os.makedirs(a.out, exist_ok=True)
    for name in ('mix', 'sfx', 'music'):
        x = r[name]
        pk = np.max(np.abs(x))
        subtype = 'PCM_24'
        if pk > 0.999:                                   # cannot happen to the mix (limiter); a stem alone can overshoot
            if name == 'mix':
                raise FloatingPointError(f'mix peaks at {20 * np.log10(pk):.2f} dBFS after limiting')
            log(f'[warn] the {name} stem alone peaks at {20 * np.log10(pk):+.2f} dBFS: written as 32-bit float so that the stems still sum to the mix')
            subtype = 'FLOAT'
        sf.write(os.path.join(a.out, f'{name}.wav'), x, SR, subtype=subtype)
    log(f"[master] gain {r['info']['master']['pre_gain_db']:+.2f} dB, limiter max {r['info']['master']['limiter_max_reduction_db']:.2f} dB, "
        f"active {r['info']['master']['limiter_active_percent']:.2f} % of the time")
    log(f"[out] {os.path.join(a.out, 'mix.wav')}  ({r['n'] / SR:.3f} s, {r['info']['render_seconds']} s to build)")
    if not a.no_verify:
        import verify
        ok = verify.run(tl, a.out, r['info'])
        if not ok and a.strict:
            sys.exit(2)


if __name__ == '__main__':
    main()
