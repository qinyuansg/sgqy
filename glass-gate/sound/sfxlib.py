"""CLEAR PASSAGE — sound effects, synthesised from scratch (numpy/scipy only).

No recordings are used: pixabay.com (the planned source) answers this machine with a bot challenge,
so every effect is built here: modal synthesis for glass and metal (inharmonic partials, fast decays,
detuned mode pairs), filtered noise for contact, air and friction, a transient + body + resonance
layer structure, micro-bounces, and per-`var` randomisation of pitch, decay and timing.

One generator per name in timeline.json -> sfx_vocabulary:

    gen(rng, var, dur, ctx) -> (y, anchor)

    y       mono (n,) or stereo (n, 2) float array at 48 kHz, any level (the mixer normalises loudness)
    anchor  index of the sample that must sit on the event time `t`:
              contact sounds      anchor = 0            (the hit starts on t)
              servo/power_up/...  anchor = 0            (the sound starts on t and lasts `dur`)
              whoosh/riser/slide  anchor = len(lead-in) (the sound ENDS on t)
              screw               anchor = tick         (driver whirr of length `dur` BEFORE t, tick on t;
                                                         matches director/anim_lib.fly_in: screws spin while
                                                         they travel and land on t)

Tonal effects are tuned to pitch classes C, D, G, A, which are consonant over every chord of the music
track (C - G - Bb - F, final chord G sus), see gg_music.py.
"""
import difflib
import zlib

import numpy as np
from scipy import signal

SR = 48000


# --------------------------------------------------------------------------------------- helpers
def hz(midi):
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


G1, G2, C3, G3, C4, G4, A4 = hz(31), hz(43), hz(48), hz(55), hz(60), hz(67), hz(69)
C5, D5, G5, A5 = hz(72), hz(74), hz(79), hz(81)
C6, D6, G6, A6 = hz(84), hz(86), hz(91), hz(93)
C7, D7, G7, A7 = hz(96), hz(98), hz(103), hz(105)
C8, D8, G8 = hz(108), hz(110), hz(115)


def make_rng(name, var):
    return np.random.default_rng(zlib.crc32(f'{name}:{int(var)}'.encode()))


def _t(n):
    return np.arange(n) / SR


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def fade_edges(y, t_in=0.0, t_out=0.004):
    """Raised-cosine fades so that no generator ever starts or stops with a step."""
    y = np.array(y, dtype=np.float64, copy=True)
    n = len(y)
    a = min(int(t_in * SR), n // 2)
    b = min(int(t_out * SR), n // 2)
    if a > 0:
        w = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
        y[:a] = (y[:a].T * w).T
    if b > 0:
        w = 0.5 + 0.5 * np.cos(np.pi * (np.arange(b) + 1) / b)
        y[-b:] = (y[-b:].T * w).T
    return y


def modal(n, freqs, taus, amps, rng=None, twin=0.0, attack=0.0):
    """Bank of struck resonators: sum of a_k * exp(-t/tau_k) * sin(2 pi f_k t).
    Sine phase = impulse response of a real resonator, so the sum starts at zero without a click.
    twin > 0 adds a slightly detuned partner to every partial (the degenerate mode pairs of real
    plates and rings, which is what makes struck glass and brass 'shimmer' instead of beep)."""
    t = _t(n)
    y = np.zeros(n)
    for f, tau, a in zip(freqs, taus, amps):
        if f <= 20.0 or f > 0.42 * SR:
            continue
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t)
        if twin and rng is not None:
            f2 = f * (1.0 + twin * rng.uniform(0.6, 1.6) * rng.choice([-1.0, 1.0]))
            y += 0.45 * a * np.exp(-t / (tau * rng.uniform(0.75, 1.0))) * np.sin(2 * np.pi * f2 * t)
    if attack > 0:
        y *= 1.0 - np.exp(-t / attack)
    return y


def nburst(rng, n, lo, hi, tau, attack=0.00015, order=2):
    """Band-passed noise burst with an exponential decay, peak-normalised. Causal filter: no pre-ring."""
    x = rng.standard_normal(n)
    hi = min(hi, 0.45 * SR)
    sos = signal.butter(order, [lo, hi], 'bp', fs=SR, output='sos')
    x = signal.sosfilt(sos, x)
    t = _t(n)
    x *= np.exp(-t / tau) * (1.0 - np.exp(-t / attack))
    return x / (np.max(np.abs(x)) + 1e-12)


def thump(n, f_start, f_end, t_drop, tau, attack=0.0008):
    """Sine body with a fast downward pitch settle (the 'weight' of an impact)."""
    t = _t(n)
    f = f_end + (f_start - f_end) * np.exp(-t / t_drop)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / tau) * (1.0 - np.exp(-t / attack))


def delayed(y, d_s, n=None):
    d = int(round(d_s * SR))
    n = len(y) if n is None else n
    out = np.zeros(n)
    m = min(len(y), n - d)
    if m > 0:
        out[d:d + m] = y[:m]
    return out


def lowpass(y, fc, order=2):
    sos = signal.butter(order, min(fc, 0.45 * SR), 'lp', fs=SR, output='sos')
    return signal.sosfilt(sos, y, axis=0)


def highpass(y, fc, order=2):
    sos = signal.butter(order, fc, 'hp', fs=SR, output='sos')
    return signal.sosfilt(sos, y, axis=0)


def shaped_noise(rng, n, fc_fn, bw_oct=1.4, stereo=True, common=0.5):
    """Noise through a time-varying log-gaussian band-pass (STFT mask). fc_fn(u) with u = 0..1.
    Returns (n, 2) (partly decorrelated channels) or (n,)."""
    nper, hop = 1024, 256
    pad = nper
    chans = []
    base = rng.standard_normal(n + 2 * pad)
    for _ in range(2 if stereo else 1):
        own = rng.standard_normal(n + 2 * pad)
        x = common * base + (1.0 - common) * own if stereo else base
        f, tt, Z = signal.stft(x, SR, nperseg=nper, noverlap=nper - hop)
        u = np.clip((tt * SR - pad) / max(1, n), 0.0, 1.0)
        fc = np.maximum(fc_fn(u), 20.0)
        ff = np.maximum(f, 1.0)[:, None]
        bw = bw_oct(u) if callable(bw_oct) else bw_oct
        sig = np.maximum(bw, 0.05) / 2.355
        mask = np.exp(-0.5 * (np.log2(ff / fc[None, :]) / sig) ** 2)
        _, y = signal.istft(Z * mask, SR, nperseg=nper, noverlap=nper - hop)
        y = y[pad:pad + n]
        if len(y) < n:
            y = np.pad(y, (0, n - len(y)))
        chans.append(y)
    out = np.stack(chans, axis=1) if stereo else chans[0]
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-12)


def pan_mono(y, pan):
    """Constant-power pan of a mono signal to stereo, pan -1..1."""
    th = (np.clip(pan, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.stack([y * np.cos(th), y * np.sin(th)], axis=1)


def harmonic_tone(phase, amps, rng=None):
    y = np.zeros_like(phase)
    for k, a in enumerate(amps, start=1):
        if a:
            y += a * np.sin(k * phase + (rng.uniform(0, 2 * np.pi) if rng is not None else 0.0))
    return y


def grains(rng, n, times, notes, taus, amps, pans, attack=0.003):
    """Tiny decaying sine pings (stereo): the 'sparkle' used by shimmer / power_up / final_hit."""
    out = np.zeros((n, 2))
    for t0, f, tau, a, p in zip(times, notes, taus, amps, pans):
        i0 = int(t0 * SR)
        m = min(n - i0, int(7 * tau * SR))
        if m <= 8:
            continue
        t = _t(m)
        g = np.exp(-t / tau) * (1.0 - np.exp(-t / attack))
        y = a * g * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 1.004 * t + 1.0))
        out[i0:i0 + m] += pan_mono(y, p)
    return out


# --------------------------------------------------------------------------------------- metal
THUNK_PRESETS = [
    # long aluminium extrusion / base rail: low, dry, weighty
    dict(fb=78, tb=0.085, modes=[196, 318, 467, 611, 842, 1190, 1580, 2210], tau0=0.070, tilt=1.10, rattle=0.0),
    # steel casting / ring gear / motor can: rings a little more
    dict(fb=104, tb=0.060, modes=[286, 431, 655, 1012, 1433, 1960, 2740, 3620], tau0=0.085, tilt=0.90, rattle=0.0),
    # sheet-metal box (power supply): boxy, a little rattle
    dict(fb=92, tb=0.070, modes=[171, 262, 388, 547, 728, 1010, 1420], tau0=0.045, tilt=1.20, rattle=1.0),
    dict(fb=118, tb=0.055, modes=[233, 352, 498, 705, 965, 1340, 1880], tau0=0.050, tilt=1.15, rattle=1.0),
]


def gen_thunk_metal(rng, var, dur, ctx):
    part = ctx.get('part', '').lower()
    if any(k in part for k in ('base', 'spine', 'rail')):
        p = THUNK_PRESETS[0]
    elif any(k in part for k in ('motor', 'ring', 'gear', 'brake')):
        p = THUNK_PRESETS[1]
    elif any(k in part for k in ('psu', 'supply', 'power')):
        p = THUNK_PRESETS[2 + var % 2]
    else:
        p = THUNK_PRESETS[var % 4]
    s = rng.uniform(0.95, 1.06)
    n = int(0.55 * SR)
    fb = p['fb'] * s
    body = thump(n, fb * 2.3, fb, 0.010, p['tb'] * rng.uniform(0.9, 1.1))
    fr = np.array(p['modes']) * s * rng.uniform(0.985, 1.015, len(p['modes']))
    ratio = fr / fr[0]
    amps = ratio ** (-p['tilt']) * rng.uniform(0.6, 1.0, len(fr))
    taus = p['tau0'] * ratio ** (-0.6) * rng.uniform(0.8, 1.2, len(fr))
    ring = modal(n, fr, taus, amps, rng, twin=0.006)
    ring /= np.max(np.abs(ring)) + 1e-12
    click = nburst(rng, n, 1200, 7000, 0.0018)
    clank = nburst(rng, n, 380, 2600, 0.008)
    y = 1.0 * body + 0.55 * ring + 0.30 * click + 0.30 * clank
    d = rng.uniform(0.030, 0.048)                       # the part settles: one small rebound
    y += delayed(0.20 * lowpass(ring, 2500) + 0.10 * click + 0.12 * thump(n, fb * 1.6, fb, 0.008, 0.03), d)
    if p['rattle']:
        rat = nburst(rng, n, 600, 3600, 0.022) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(80, 110) * _t(n)))
        y += 0.14 * rat
    y = np.tanh(1.15 * y) / np.tanh(1.15)
    return fade_edges(y, 0, 0.02), 0


def gen_lock_clunk(rng, var, dur, ctx):
    s = rng.uniform(0.93, 1.07)
    n = int(0.5 * SR)
    body = thump(n, 150 * s, 64 * s, 0.012, 0.075)
    fr = np.array([228, 395, 640, 980, 1450, 2100]) * s * rng.uniform(0.98, 1.02, 6)
    ratio = fr / fr[0]
    ring = modal(n, fr, 0.040 * ratio ** -0.6, ratio ** -1.2 * rng.uniform(0.6, 1.0, 6), rng, twin=0.005)
    ring /= np.max(np.abs(ring)) + 1e-12
    dull = nburst(rng, n, 150, 1400, 0.018)
    click = nburst(rng, n, 1500, 6000, 0.002)
    y = 1.0 * body + 0.5 * ring + 0.5 * dull + 0.28 * click
    d = rng.uniform(0.042, 0.058)                       # the latch drops in just after the stop
    latch = 0.6 * modal(n, np.array([900, 1500, 2600]) * s, [0.010, 0.008, 0.005], [1, 0.7, 0.4]) \
        + 0.8 * nburst(rng, n, 1000, 5000, 0.003)
    y += delayed(0.26 * latch, d)
    y = np.tanh(1.1 * y) / np.tanh(1.1)
    return fade_edges(y, 0, 0.02), 0


def gen_clack(rng, var, dur, ctx):
    s = rng.uniform(0.90, 1.12)
    n = int(0.25 * SR)
    fr = np.array([540, 910, 1380, 2140, 3050, 4200]) * s * rng.uniform(0.98, 1.02, 6)
    ratio = fr / fr[0]
    ring = modal(n, fr, 0.020 * ratio ** -0.5 * rng.uniform(0.8, 1.2, 6), ratio ** -0.8 * rng.uniform(0.6, 1.0, 6), rng, twin=0.006)
    ring /= np.max(np.abs(ring)) + 1e-12
    knock = thump(n, 300 * s, 185 * s, 0.004, 0.018)
    snapn = nburst(rng, n, 900, 6500, 0.0035)
    y = 0.8 * ring + 0.55 * knock + 0.5 * snapn
    d = rng.uniform(0.013, 0.021)                       # two-stage seat: "cl-ack"
    y += delayed(0.33 * (0.7 * modal(n, fr * 1.07, 0.012 * ratio ** -0.5, ratio ** -0.8) / 2.0 + 0.6 * nburst(rng, n, 1200, 6000, 0.002)), d)
    return fade_edges(y, 0, 0.01), 0


def gen_click(rng, var, dur, ctx):
    s = rng.uniform(0.85, 1.20)
    n = int(0.09 * SR)
    fr = np.array([1750, 2900, 4300, 5900]) * s * rng.uniform(0.97, 1.03, 4)
    ring = modal(n, fr, [0.006, 0.005, 0.004, 0.003], [1.0, 0.8, 0.55, 0.35], rng, twin=0.01)
    ring /= np.max(np.abs(ring)) + 1e-12
    tick = nburst(rng, n, 1800, 9000, 0.0009)
    tk = modal(n, [700 * s, 1050 * s], [0.005, 0.004], [1.0, 0.5])
    y = 0.7 * ring + 0.6 * tick + 0.4 * tk
    if rng.random() < 0.5:                              # connector-style double click on some variations
        y += delayed(0.25 * nburst(rng, n, 2200, 8000, 0.0008) + 0.12 * ring, rng.uniform(0.007, 0.012))
    return fade_edges(y, 0, 0.004), 0


def gen_snap(rng, var, dur, ctx):
    s = rng.uniform(0.88, 1.15)
    n = int(0.11 * SR)
    pop = thump(n, 1500 * s, 820 * s, 0.003, 0.006, attack=0.0003)
    fr = np.array([880, 1320, 2050]) * s * rng.uniform(0.97, 1.03, 3)
    ring = modal(n, fr, [0.009, 0.007, 0.005], [1.0, 0.7, 0.5], rng, twin=0.012)
    ring /= np.max(np.abs(ring)) + 1e-12
    sn = nburst(rng, n, 2200, 7000, 0.0016)
    y = 0.55 * pop + 0.6 * ring + 0.7 * sn
    y += delayed(0.38 * nburst(rng, n, 2800, 7500, 0.001) + 0.15 * ring, rng.uniform(0.005, 0.009))   # clip seats
    return fade_edges(y, 0, 0.004), 0


def gen_tap(rng, var, dur, ctx):
    s = rng.uniform(0.9, 1.12)
    n = int(0.22 * SR)
    soft = nburst(rng, n, 120, 900, 0.009, attack=0.0008)
    body = modal(n, [330 * s, 520 * s], [0.016, 0.012], [1.0, 0.6], attack=0.0006)
    top = nburst(rng, n, 900, 3500, 0.003, attack=0.0004)
    y = 0.8 * soft + 0.5 * body + 0.22 * top
    part = ctx.get('part', '').lower()
    if 'badge' in part or 'glass' in part or var % 2 == 1:       # a tap on glass leaves a faint ring
        y += 0.07 * modal(n, [G6 * rng.uniform(0.99, 1.01), D7], [0.05, 0.035], [1.0, 0.6], rng, twin=0.004)
    return fade_edges(y, 0, 0.01), 0


GEAR_NOTES = [C7, D7, G7, A7, D7 * 2 ** (1 / 1200 * 14), G6]


def gen_gear_tick(rng, var, dur, ctx):
    """Small brass gear dropping onto its pin: a tick and a short bright ring."""
    part = ctx.get('part', '').lower()
    f0 = GEAR_NOTES[var % len(GEAR_NOTES)]
    if 'sun' in part or 'carrier' in part:
        f0 = G6
    f0 *= 1.0 + rng.uniform(-0.004, 0.004)
    n = int(0.6 * SR)
    ratio = np.array([1.0, 1.58, 2.41, 3.27, 4.12, 5.40]) * rng.uniform(0.985, 1.015, 6)
    fr = f0 * ratio
    keep = fr < 10500
    tau0 = 0.11 * (C7 / f0) ** 0.5
    ring = modal(n, fr[keep], (tau0 * ratio ** -0.8 * rng.uniform(0.8, 1.2, 6))[keep],
                 (ratio ** -1.25 * rng.uniform(0.6, 1.0, 6))[keep], rng, twin=0.004)
    ring /= np.max(np.abs(ring)) + 1e-12
    tick = nburst(rng, n, 2500, 8000, 0.0012)
    pin = modal(n, [820 * rng.uniform(0.9, 1.1), 1340], [0.006, 0.004], [1.0, 0.5])
    y = 0.7 * ring + 0.5 * tick + 0.4 * pin
    d = rng.uniform(0.018, 0.030)
    y += delayed(0.22 * tick + 0.18 * ring, d)
    return fade_edges(y, 0, 0.02), 0


def gen_spring(rng, var, dur, ctx):
    """Small steel coil spring dropping into its seat: a bright metallic 'tsing' with a faint coil flutter
    (kept subtle on purpose: a deep flutter reads as a cartoon boing)."""
    s = rng.uniform(0.92, 1.1)
    n = int(0.40 * SR)
    t = _t(n)
    flut = rng.uniform(34, 42)
    y = np.zeros(n)
    for f, tau, a in zip(np.array([1180, 1930, 2760, 3690, 4850]) * s * rng.uniform(0.98, 1.02, 5),
                         [0.090, 0.080, 0.060, 0.050, 0.035], [1.0, 0.85, 0.6, 0.4, 0.25]):
        beta = 0.35 * np.exp(-t / 0.08) * (f / 1000.0)
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t + beta * np.sin(2 * np.pi * flut * t))
        y += 0.4 * a * np.exp(-t / (tau * 0.8)) * np.sin(2 * np.pi * f * 1.006 * t)
    y *= 1.0 + 0.20 * np.exp(-t / 0.10) * np.sin(2 * np.pi * flut * t)
    y /= np.max(np.abs(y)) + 1e-12
    chirp_f = 1200 + 2600 * np.exp(-t / 0.015)          # a trace of the coil's dispersive ring
    chirp = np.sin(2 * np.pi * np.cumsum(chirp_f) / SR) * np.exp(-t / 0.025)
    tick = nburst(rng, n, 2000, 7000, 0.0015)
    seat = modal(n, [640 * s, 980 * s], [0.008, 0.006], [1.0, 0.6])
    out = 0.7 * y + 0.12 * chirp + 0.45 * tick + 0.3 * seat
    return fade_edges(out, 0, 0.02), 0


def gen_screw(rng, var, dur, ctx):
    """Driver whirr of length `dur` leading INTO the event time, then the seat tick on the event time."""
    L = float(np.clip(dur if dur else 0.11, 0.04, 0.8))
    n_pre = int(round(L * SR))
    s = rng.uniform(0.94, 1.06)
    t = _t(n_pre)
    u = t / L
    f = 205.0 * s * (0.55 + 0.45 * smoothstep(u / 0.35))
    ph = 2 * np.pi * np.cumsum(f) / SR
    k = np.arange(1, 25)
    fk = k * 205.0 * s
    form = 0.3 + np.exp(-0.5 * (np.log2(fk / 1600.0) / 0.55) ** 2)
    motor = harmonic_tone(ph, form / k ** 0.6, rng)
    motor /= np.max(np.abs(motor)) + 1e-12
    hiss = signal.sosfilt(signal.butter(2, [1500, 5500], 'bp', fs=SR, output='sos'), rng.standard_normal(n_pre))
    hiss *= 0.6 + 0.4 * np.sin(4 * ph)
    hiss /= np.max(np.abs(hiss)) + 1e-12
    whirr = (0.75 * motor + 0.35 * hiss) * (0.7 + 0.3 * u)
    whirr = fade_edges(whirr, min(0.008, L / 4), 0.003)
    n_post = int(0.08 * SR)
    fr = np.array([2650, 4100, 5800]) * s * rng.uniform(0.96, 1.04, 3)
    tick = 0.6 * modal(n_post, fr, [0.006, 0.005, 0.004], [1.0, 0.7, 0.4], rng, twin=0.01) / 1.6 \
        + 0.6 * nburst(rng, n_post, 2500, 9000, 0.0008) + 0.5 * thump(n_post, 420 * s, 260 * s, 0.004, 0.009)
    tick = fade_edges(tick, 0, 0.004)
    whirr *= 10.0 ** ((loud50(tick) - 5.0 - loud50(whirr)) / 20.0)     # the whirr sits 5 dB under the tick
    y = np.concatenate([whirr, tick])
    return y, n_pre


# --------------------------------------------------------------------------------------- glass
CLINK_CLASSES = {
    'post':  dict(notes=[G5, A5, C6, D6], tau0=0.105, low=0.60, bright=1.00),
    'tube':  dict(notes=[G5, A5, C6], tau0=0.125, low=0.65, bright=1.00),
    'panel': dict(notes=[D5, G5, A5], tau0=0.145, low=0.75, bright=0.90),
    'lid':   dict(notes=[C5, D5, G5], tau0=0.155, low=0.70, bright=0.95),
    'wing':  dict(notes=[G4, A4, C5, D5], tau0=0.200, low=0.90, bright=0.85),
}
CLINK_BY_VAR = ['post', 'post', 'post', 'post', 'panel', 'panel', 'lid', 'lid', 'wing', 'wing', 'tube', 'tube']


def clink_class(part, var):
    p = part.lower()
    if 'wing' in p or 'leaf' in p:
        return 'wing'
    if 'lid' in p or 'tray' in p or 'rail' in p or 'top' in p:
        return 'lid'
    if 'panel' in p or 'side' in p:
        return 'panel'
    if 'post' in p:
        return 'post'
    if 'tube' in p or 'column' in p or 'col_' in p:
        return 'tube'
    return CLINK_BY_VAR[var % len(CLINK_BY_VAR)]


def gen_glass_clink(rng, var, dur, ctx):
    """Thick crystal block seating on metal: weighty knock, dense inharmonic partials with beating
    twins, damped ring (tau 0.1-0.2 s), low fundamental (392-1175 Hz). Deliberately not a wine glass."""
    c = CLINK_CLASSES[clink_class(ctx.get('part', ''), var)]
    f0 = c['notes'][var % len(c['notes'])] * (1.0 + rng.uniform(-0.003, 0.003))
    n = int(min(1.6, 7.0 * c['tau0']) * SR)
    ratio = np.array([1.0, 1.47, 2.09, 2.76, 3.41, 4.33, 5.40, 6.62, 8.05]) * rng.uniform(0.975, 1.025, 9)
    ratio[0] = 1.0
    fr = f0 * ratio
    keep = fr < 10500
    amps = ratio ** -0.85 * rng.uniform(0.55, 1.0, 9)
    amps[1:4] *= 1.2
    taus = c['tau0'] * ratio ** -0.7 * rng.uniform(0.8, 1.2, 9)
    ring = modal(n, fr[keep], taus[keep], amps[keep], rng, twin=0.0035)
    ring = lowpass(ring, 9500)
    ring /= np.max(np.abs(ring)) + 1e-12
    tick = nburst(rng, n, 3000, 10000, 0.0007)
    tok = nburst(rng, n, 350, 1600, 0.006)
    thud = thump(n, 190 * rng.uniform(0.9, 1.1), 120, 0.008, 0.030)
    y = 0.75 * c['bright'] * ring + 0.42 * tick + 0.5 * c['low'] * tok + 0.5 * c['low'] * thud
    d = rng.uniform(0.022, 0.034)                       # settle chatter: two tiny rebounds
    y += delayed(0.20 * tick + 0.10 * ring + 0.10 * tok, d)
    y += delayed(0.09 * tick + 0.04 * ring, d * 1.62)
    return fade_edges(y, 0, 0.03), 0


def gen_glass_slide(rng, var, dur, ctx):
    """Glass sliding home on its gasket: friction noise that ENDS on the event time."""
    L = float(np.clip(dur if dur else 0.3, 0.08, 1.5))
    n = int(round(L * SR))
    u = _t(n) / L
    noise = shaped_noise(rng, n, lambda v: 1800.0 * 2.0 ** (0.9 * v), 1.6, stereo=False)
    sing = np.zeros(n)
    for f in (D7 * rng.uniform(0.98, 1.02), A7 * rng.uniform(0.98, 1.02), 5270.0):
        b, a = signal.iirpeak(f, 40.0, fs=SR)
        sing += signal.lfilter(b, a, noise)
    sing /= np.sqrt(np.mean(sing ** 2)) + 1e-12
    rough = signal.sosfilt(signal.butter(2, 45, 'lp', fs=SR, output='sos'), rng.standard_normal(n))
    rough = 1.0 + 0.25 * rough / (np.max(np.abs(rough)) + 1e-12)
    env = smoothstep(u / 0.25) * (0.75 + 0.25 * u) * rough
    y = (noise + 0.25 * sing) * env
    return fade_edges(y, 0.0, min(0.010, L / 4)), n


# --------------------------------------------------------------------------------------- motion
def gen_servo(rng, var, dur, ctx):
    """Two small servo motors (one per wing, slightly detuned) with a planetary-gear mesh tone:
    a smooth whine that follows a trapezoidal speed profile. Starts on the event time, lasts `dur`."""
    L = float(np.clip(dur if dur else 0.8, 0.15, 4.0))
    n = int(round(L * SR))
    t = _t(n)
    u = t / L
    sp = smoothstep(u / 0.22) * smoothstep((1.0 - u) / 0.30)
    base = rng.uniform(0.95, 1.05) * (0.94 if var % 2 else 1.0)
    out = np.zeros((n, 2))
    for det, pan in ((0.985, -0.35), (1.015, 0.35)):
        fm = (210.0 + 560.0 * sp) * base * det
        ph = 2 * np.pi * np.cumsum(fm) / SR
        tone = harmonic_tone(ph, [1.0, 0.45, 0.30, 0.16, 0.10, 0.07])
        mesh = np.sin(4.37 * ph + 0.3 * np.sin(ph / 3.0)) * (0.5 + 0.5 * sp) * (1.0 + 0.35 * np.sin(ph / 3.0))
        fric = signal.sosfilt(signal.butter(2, [1200, 4500], 'bp', fs=SR, output='sos'), rng.standard_normal(n))
        fric = fric / (np.sqrt(np.mean(fric ** 2)) + 1e-12) * sp * (1.0 + 0.5 * np.sin(ph))
        y = (0.55 * tone + 0.40 * mesh + 0.10 * fric) * (0.12 + 0.88 * sp ** 0.8)
        out += pan_mono(y, pan)
    out = lowpass(out, 6500)
    return fade_edges(out, 0.012, 0.012), 0


def gen_whoosh(rng, var, dur, ctx):
    """Air whoosh that swells and ENDS on the event time."""
    L = float(np.clip(dur if dur else 0.6, 0.15, 3.0))
    n = int(round(L * SR))
    u = _t(n) / L
    air = shaped_noise(rng, n, lambda v: 350.0 * 2.0 ** (3.2 * v ** 1.5), 1.5, stereo=True, common=0.4)
    mass = shaped_noise(rng, n, lambda v: 140.0 + 120.0 * v, 1.2, stereo=True, common=0.8)
    env = u ** 2.4
    direction = -1.0 if var % 2 else 1.0
    pan = direction * (-0.7 + 1.4 * u)
    gl = np.cos((pan + 1.0) * np.pi / 4.0) * np.sqrt(2.0)
    gr = np.sin((pan + 1.0) * np.pi / 4.0) * np.sqrt(2.0)
    y = (air + 0.45 * mass) * env[:, None]
    y[:, 0] *= gl
    y[:, 1] *= gr
    return fade_edges(y, 0.0, min(0.030, L / 4)), n


def gen_riser(rng, var, dur, ctx):
    """Pre-drop riser: noise sweep + rising tone with an accelerating tremolo. ENDS on the event time."""
    L = float(np.clip(dur if dur else 0.75, 0.2, 4.0))
    n = int(round(L * SR))
    t = _t(n)
    u = t / L
    noise = shaped_noise(rng, n, lambda v: 600.0 * 2.0 ** (2.9 * v), 1.2, stereo=True, common=0.3)
    noise = lowpass(noise, 8000) * (u ** 1.7)[:, None]
    f = G4 * 2.0 ** u
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = harmonic_tone(ph, [1.0, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12]) + 0.4 * harmonic_tone(1.5 * ph, [1.0, 0.4, 0.2])
    tone = lowpass(tone, 5000)
    tone /= np.max(np.abs(tone)) + 1e-12
    rate = 8.0 + 22.0 * u ** 2
    trem = 1.0 - 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR))
    tone *= u ** 1.3 * trem
    sub = np.sin(2 * np.pi * np.cumsum(55.0 + 43.0 * u) / SR) * u ** 2
    sub = fade_edges(sub, 0.0, min(0.045, L / 4))
    y = 0.9 * noise + (0.55 * tone + 0.26 * sub)[:, None]
    return fade_edges(y, 0.0, 0.006), n


def gen_impact_drop(rng, var, dur, ctx):
    """The drop: sub boom with a pitch fall, mid punch, a short crack, an airy down-sweep tail and a faint glass ting."""
    n = int(2.4 * SR)
    t = _t(n)
    sub = thump(n, 120, 49, 0.05, 0.22, attack=0.002)
    punch = thump(n, 260, 95, 0.02, 0.07, attack=0.001)
    crack = nburst(rng, n, 700, 5500, 0.030)
    top = nburst(rng, n, 3000, 9000, 0.004)
    core = 1.0 * sub + 0.6 * punch + 0.45 * crack + 0.18 * top
    core = np.tanh(1.1 * core) / np.tanh(1.1)
    air = shaped_noise(rng, n, lambda v: 2600.0 * 2.0 ** (-2.2 * v), 2.0, stereo=True, common=0.3)
    air *= (np.exp(-t / 0.42) * (1.0 - np.exp(-t / 0.004)))[:, None]
    ting = modal(n, [C7, G7, C8], [0.5, 0.4, 0.3], [1.0, 0.7, 0.4], rng, twin=0.003, attack=0.002)
    y = pan_mono(core, 0.0) * np.sqrt(2.0) + 0.16 * air + (0.035 * ting)[:, None]
    return fade_edges(y, 0, 0.05), 0


def gen_power_up(rng, var, dur, ctx):
    """The light wave travelling through the gate: a rising, opening hum with energy noise and sparkle.
    Starts on the event time and has faded out by `dur`."""
    L = float(np.clip(dur if dur else 2.5, 0.5, 8.0))
    n = int(round((L + 0.25) * SR))
    t = _t(n)
    u = np.clip(t / L, 0.0, 1.25)
    bell = smoothstep(u / 0.55) * smoothstep((1.0 - u) / 0.45)
    bell *= 1.0 - np.exp(-t / 0.004)
    gl = np.minimum(u / 0.6, 1.0)
    f = C3 * 2.0 ** (2.0 * gl)                          # C3 -> C5 glide, then held
    out = np.zeros((n, 2))
    for det, pan in ((0.997, -0.5), (1.003, 0.5)):
        ph = 2 * np.pi * np.cumsum(f * det) / SR
        k = np.arange(1, 11)
        tone = harmonic_tone(ph, 1.0 / k ** 1.2) + 0.4 * harmonic_tone(1.5 * ph, 1.0 / np.arange(1, 7) ** 1.3)
        out += pan_mono(tone, pan)
    # the tone "opens": blend from a dark to a brighter copy while it rises
    dark = lowpass(out, 700)
    bright = lowpass(out, 5000)
    mix = smoothstep(u / 0.7)[:, None]
    tone = dark * (1.0 - mix) + bright * mix
    tone /= np.max(np.abs(tone)) + 1e-12
    energy = shaped_noise(rng, n, lambda v: 500.0 * 2.0 ** (3.3 * np.minimum(v * 1.25, 1.0)), 1.3, stereo=True, common=0.3)
    m = int(26 * L)
    times = np.sort(rng.beta(2.0, 2.2, m)) * L * 0.95
    notes = rng.choice([C7, D7, G7, A7, C8], m, p=[0.28, 0.24, 0.24, 0.14, 0.10])
    sp = grains(rng, n, times, notes, rng.uniform(0.04, 0.12, m), rng.uniform(0.3, 1.0, m), rng.uniform(-0.8, 0.8, m))
    sp /= np.max(np.abs(sp)) + 1e-12
    ignite = nburst(rng, n, 1500, 6000, 0.015)           # the spark as the light switches on: defines the onset
    y = (0.75 * tone + 0.10 * energy) * bell[:, None] + 0.22 * sp + (0.10 * ignite)[:, None]
    return fade_edges(y, 0.0, 0.05), 0


SHIMMER_NOTES = [C7, D7, G7, A7, C8, D8, G8]
SHIMMER_P = [0.22, 0.20, 0.20, 0.14, 0.12, 0.08, 0.04]


def gen_shimmer(rng, var, dur, ctx):
    """Glass sparkle: a cloud of tiny tuned pings with a little air. Starts on the event time."""
    L = float(np.clip(dur if dur else 1.0, 0.15, 6.0))
    n = int(round((L + 0.30) * SR))
    m = max(6, int(34 * L))
    times = np.sort(rng.beta(1.15, 2.1, m)) * L          # denser at the start: the sparkle is there from frame one
    times[0] = 0.0                                      # first ping exactly on the event
    notes = rng.choice(SHIMMER_NOTES, m, p=SHIMMER_P) * rng.uniform(0.997, 1.003, m)
    bell = np.sin(np.pi * np.clip(times / L, 0, 1)) ** 0.6 * 0.8 + 0.2
    bell[0] = 0.8
    y = grains(rng, n, times, notes, rng.uniform(0.035, 0.14, m), rng.uniform(0.3, 1.0, m) * bell, rng.uniform(-0.8, 0.8, m))
    y /= np.max(np.abs(y)) + 1e-12
    air = shaped_noise(rng, n, lambda v: 6000.0 + 0 * v, 1.0, stereo=True, common=0.2)
    u = np.clip(_t(n) / L, 0, 1)
    y += 0.025 * air * (np.sin(np.pi * u) ** 1.5)[:, None]
    return fade_edges(y, 0.0, 0.05), 0


# --------------------------------------------------------------------------------------- in use
def gen_ui_boot(rng, var, dur, ctx):
    """Screens waking up: a soft three-note rising chime (G5 - D6 - G6)."""
    n = int(0.9 * SR)
    y = np.zeros(n)
    for f, d, tau, a in ((G5, 0.0, 0.10, 0.8), (D6, 0.075, 0.12, 0.9), (G6, 0.150, 0.26, 1.0)):
        m = n - int(d * SR)
        t = _t(m)
        note = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
        note += 0.35 * np.sin(2 * np.pi * f * 1.003 * t + 0.7)
        note *= np.exp(-t / tau) * (1.0 - np.exp(-t / 0.002))
        y[int(d * SR):] += a * note
    y /= np.max(np.abs(y)) + 1e-12
    y += 0.12 * nburst(rng, n, 2000, 6000, 0.001)
    return fade_edges(y, 0, 0.03), 0


def gen_card_tap(rng, var, dur, ctx):
    """A plastic card tapped flat on the glass reader: dull 'tok', a second lighter contact, faint glass."""
    s = rng.uniform(0.95, 1.05)
    n = int(0.3 * SR)
    slap = nburst(rng, n, 800, 4800, 0.0035)
    body = modal(n, [1250 * s, 2100 * s], [0.006, 0.004], [1.0, 0.5])
    low = thump(n, 480 * s, 330 * s, 0.004, 0.011)
    y = 0.8 * slap + 0.45 * body + 0.6 * low
    d = rng.uniform(0.034, 0.046)
    y += delayed(0.38 * nburst(rng, n, 900, 4000, 0.0025) + 0.2 * thump(n, 420, 300, 0.004, 0.008), d)
    y += 0.06 * modal(n, [1870 * s, 3140 * s], [0.035, 0.025], [1.0, 0.6], rng, twin=0.004)
    return fade_edges(y, 0, 0.01), 0


def gen_beep_ok(rng, var, dur, ctx):
    """Reader confirmation: two short rising tones (G6 -> D7), small-speaker character."""
    segs = ((G6, 0.0, 0.075), (D7, 0.105, 0.130))
    n = int(0.26 * SR)
    y = np.zeros(n)
    for f, t0, L in segs:
        m = int(L * SR)
        t = _t(m)
        tone = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 3 * f * t) + 0.08 * np.sin(2 * np.pi * 5 * f * t)
        tone = fade_edges(tone, 0.003, 0.014)
        i0 = int(t0 * SR)
        y[i0:i0 + m] += tone
    y = highpass(lowpass(y, 7000), 700)
    return fade_edges(y, 0.0, 0.005), 0


def gen_final_hit(rng, var, dur, ctx):
    """Closing hit: soft deep boom plus a struck-glass G sus chord whose decay is fitted to the time
    left in the programme (ctx['room_s']), so the tail has rung out by the last frame."""
    room = float(ctx.get('room_s', 2.0))
    tau_max = float(np.clip(room / 5.5, 0.10, 0.50))
    n = int(max(0.3, min(room, 6.5 * tau_max + 0.2)) * SR)
    t = _t(n)
    sub = thump(n, 110, G1, 0.04, min(0.40, tau_max), attack=0.002) + 0.4 * np.sin(2 * np.pi * G2 * t) * np.exp(-t / (0.8 * tau_max)) * (1 - np.exp(-t / 0.004))
    thud = nburst(rng, n, 60, 400, 0.05, attack=0.002)
    notes = [G4, D5, G5, C6, D6, G6, A6]
    chord = modal(n, notes, tau_max * np.array([1.0, 0.95, 0.9, 0.8, 0.75, 0.6, 0.55]),
                  [0.5, 0.45, 0.5, 0.35, 0.3, 0.22, 0.15], rng, twin=0.003, attack=0.004)
    chord /= np.max(np.abs(chord)) + 1e-12
    m = 14
    sp = grains(rng, n, np.sort(rng.uniform(0.0, min(0.5, room * 0.3), m)), rng.choice([G7, D7, C8, D8], m),
                rng.uniform(0.05, 0.14, m), rng.uniform(0.3, 1.0, m), rng.uniform(-0.8, 0.8, m))
    sp /= np.max(np.abs(sp)) + 1e-12
    air = shaped_noise(rng, n, lambda v: 3000.0 * 2.0 ** (-1.6 * v), 1.8, stereo=True, common=0.3)
    air *= (np.exp(-t / (0.6 * tau_max)) * (1 - np.exp(-t / 0.004)))[:, None]
    mono = 1.0 * sub + 0.45 * thud + 0.55 * chord
    y = pan_mono(mono, 0.0) * np.sqrt(2.0) + 0.10 * sp + 0.07 * air
    return fade_edges(y, 0, min(0.25, room * 0.2)), 0


# --------------------------------------------------------------------------------------- registry
GENERATORS = {
    'thunk_metal': gen_thunk_metal, 'lock_clunk': gen_lock_clunk, 'clack': gen_clack, 'click': gen_click,
    'snap': gen_snap, 'tap': gen_tap, 'gear_tick': gen_gear_tick, 'spring': gen_spring, 'screw': gen_screw,
    'glass_clink': gen_glass_clink, 'glass_slide': gen_glass_slide, 'servo': gen_servo, 'whoosh': gen_whoosh,
    'riser': gen_riser, 'impact_drop': gen_impact_drop, 'power_up': gen_power_up, 'shimmer': gen_shimmer,
    'ui_boot': gen_ui_boot, 'card_tap': gen_card_tap, 'beep_ok': gen_beep_ok, 'final_hit': gen_final_hit,
}

# How the event time relates to the sound (used for override files and for the sync check):
#   start   first audible sample on t        end    last audible sample on t
#   lead    lead-in before t, main transient on t
ANCHOR = {name: 'start' for name in GENERATORS}
ANCHOR.update(whoosh='end', riser='end', glass_slide='end', screw='lead')

# Sounds whose perceived onset is a sharp transient (used by the independent stem-based sync check).
TRANSIENT = {'thunk_metal', 'lock_clunk', 'clack', 'click', 'snap', 'tap', 'gear_tick', 'spring', 'screw',
             'glass_clink', 'impact_drop', 'card_tap', 'final_hit', 'ui_boot', 'beep_ok'}

# Effects that key the music's sidechain ducking. Part sounds duck it fully; the softer in-use and UI sounds
# only half as deep (they play over the full groove, which should not pump). Transitional effects that are
# meant to sit WITH the music (riser, impact, power-up, shimmer, whoosh, final hit) do not duck it at all.
DUCK_FULL = {'thunk_metal', 'lock_clunk', 'clack', 'click', 'snap', 'tap', 'gear_tick', 'spring', 'screw', 'glass_clink'}
DUCK_HALF = {'glass_slide', 'servo', 'card_tap', 'beep_ok', 'ui_boot'}

# Loudness targets: K-weighted RMS of the loudest 50 ms of each effect at gain 1.0, in dB re full scale
# before the bus gain. This is the balance between effect types (the event `gain` then scales linearly).
LEVEL_DB = {
    'impact_drop': -10.5, 'final_hit': -11.0,
    'thunk_metal': -12.0, 'lock_clunk': -13.0, 'glass_clink': -12.0,
    'clack': -14.0, 'gear_tick': -15.0, 'snap': -15.0, 'click': -15.5, 'tap': -16.0, 'spring': -16.0,
    'screw': -15.0, 'card_tap': -13.5, 'beep_ok': -14.0, 'ui_boot': -12.0,
    'servo': -15.0, 'whoosh': -15.0, 'riser': -14.0, 'glass_slide': -21.0, 'power_up': -13.0, 'shimmer': -14.0,
}

# Send level (dB) of each effect into the shared room.
ROOM_SEND_DB = {
    'impact_drop': -16.0, 'final_hit': -13.0, 'thunk_metal': -14.0, 'lock_clunk': -14.0, 'glass_clink': -12.0,
    'clack': -14.0, 'gear_tick': -13.0, 'snap': -15.0, 'click': -15.0, 'tap': -14.0, 'spring': -14.0,
    'screw': -16.0, 'card_tap': -14.0, 'beep_ok': -16.0, 'ui_boot': -15.0, 'servo': -20.0, 'whoosh': -24.0,
    'riser': -30.0, 'glass_slide': -18.0, 'power_up': -22.0, 'shimmer': -16.0,
}

KEYWORDS = [  # substring -> generator, tried in order for names that are not in the vocabulary
    ('glass_s', 'glass_slide'), ('slide', 'glass_slide'), ('glass', 'glass_clink'), ('clink', 'glass_clink'),
    ('crystal', 'glass_clink'), ('beep', 'beep_ok'), ('chime', 'ui_boot'), ('boot', 'ui_boot'), ('ui', 'ui_boot'),
    ('whoosh', 'whoosh'), ('swoosh', 'whoosh'), ('swish', 'whoosh'), ('air', 'whoosh'), ('rise', 'riser'),
    ('servo', 'servo'), ('motor', 'servo'), ('whir', 'servo'), ('screw', 'screw'), ('bolt', 'screw'),
    ('gear', 'gear_tick'), ('tick', 'gear_tick'), ('spring', 'spring'), ('boing', 'spring'),
    ('impact', 'impact_drop'), ('boom', 'impact_drop'), ('drop', 'impact_drop'), ('final', 'final_hit'),
    ('power', 'power_up'), ('shimmer', 'shimmer'), ('sparkle', 'shimmer'), ('glitter', 'shimmer'),
    ('lock', 'lock_clunk'), ('latch', 'lock_clunk'), ('clunk', 'lock_clunk'), ('thunk', 'thunk_metal'),
    ('thud', 'thunk_metal'), ('metal', 'thunk_metal'), ('clack', 'clack'), ('snap', 'snap'), ('pop', 'snap'),
    ('card', 'card_tap'), ('tap', 'tap'), ('click', 'click'),
]


def resolve(name):
    """Return (generator_name, exact). Unknown names fall back to the nearest known sound."""
    if name in GENERATORS:
        return name, True
    low = str(name).lower()
    for key, target in KEYWORDS:
        if key in low:
            return target, False
    close = difflib.get_close_matches(low, list(GENERATORS), n=1, cutoff=0.6)
    return (close[0] if close else 'click'), False            # nothing similar: a neutral small click


# --------------------------------------------------------------------------------------- loudness
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def k_weight(y):
    y = signal.lfilter(_K1[0], _K1[1], y, axis=0)
    return signal.lfilter(_K2[0], _K2[1], y, axis=0)


def loud50(y):
    """K-weighted RMS (dB) of the loudest 50 ms: a loudness proxy that works for very short sounds."""
    k = k_weight(np.asarray(y, dtype=np.float64))
    p = (k ** 2).sum(axis=1) if k.ndim == 2 else k ** 2
    w = int(0.050 * SR)
    if len(p) < w:
        p = np.pad(p, (0, w - len(p)))
    c = np.cumsum(np.concatenate([[0.0], p]))
    return 10.0 * np.log10(np.max(c[w:] - c[:-w]) / w + 1e-20)


MAX_CREST_DB = 9.5      # peak above loud50; taller spikes are rounded off (tape-style), like a recorded hit


def finish(y, gname):
    """Bring an effect to its reference loudness and round off needle-thin peaks."""
    y = y * 10.0 ** ((LEVEL_DB[gname] - loud50(y)) / 20.0)
    for _ in range(2):
        thr = 10.0 ** ((LEVEL_DB[gname] + MAX_CREST_DB) / 20.0)
        if np.max(np.abs(y)) > thr:
            knee = 0.7 * thr                            # linear below the knee, tanh above it
            a = np.abs(y)
            over = a > knee
            shaped = knee + (thr - knee) * np.tanh((a - knee) / (thr - knee))
            y = np.where(over, np.sign(y) * shaped, y)
        y = y * 10.0 ** ((LEVEL_DB[gname] - loud50(y)) / 20.0)
    return y


def render(name, var=0, dur=None, part='', room_s=2.0):
    """Render one effect at its reference loudness. Returns (stereo-or-mono array, anchor, resolved_name)."""
    gname, _ = resolve(name)
    rng = make_rng(gname, var)
    y, anchor = GENERATORS[gname](rng, int(var), dur, dict(part=part or '', room_s=room_s))
    y = finish(np.asarray(y, dtype=np.float64), gname)
    return y, int(anchor), gname


def room_ir(rt60=0.32, seed=7):
    """The one short room every effect shares: a few early reflections and a 0.3 s diffuse tail,
    band-limited, nothing in the first 3 ms so the direct transient stays clean."""
    rng = np.random.default_rng(seed)
    n = int(0.50 * SR)
    t = _t(n)
    ir = np.zeros((n, 2))
    for k in range(10):
        d = rng.uniform(0.0045, 0.038)
        g = 0.55 * 10.0 ** (-(d * 1000.0) / 45.0) * rng.choice([-1.0, 1.0])
        i = int(d * SR)
        ir[i, k % 2] += g
        ir[i + int(rng.integers(8, 60)), 1 - k % 2] += 0.55 * g
    tail = rng.standard_normal((n, 2)) * (np.exp(-6.91 * t / rt60) * (1.0 - np.exp(-np.maximum(t - 0.006, 0) / 0.010)))[:, None]
    tail = signal.sosfilt(signal.butter(2, [250, 5200], 'bp', fs=SR, output='sos'), tail, axis=0)
    dark = signal.sosfilt(signal.butter(1, 2200, 'lp', fs=SR, output='sos'), tail, axis=0)
    w = np.clip(t / 0.15, 0, 1)[:, None]                # the tail gets darker as it decays
    tail = tail * (1 - w) + dark * w
    ir += 0.9 * tail / (np.sqrt(np.sum(tail ** 2, axis=0)) + 1e-12) * np.sqrt(np.sum(ir ** 2, axis=0) + 1e-12) * 1.6
    ir[: int(0.003 * SR)] = 0.0
    ir /= np.sqrt(np.mean(np.sum(ir ** 2, axis=0))) + 1e-12
    return fade_edges(ir, 0, 0.02)
