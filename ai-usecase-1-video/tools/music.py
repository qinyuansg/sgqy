#!/usr/bin/env python3
"""Original score + sound design, synthesised from scratch (numpy/scipy only).

Music follows the film's chapters (read from timeline.json): a tense D-minor
pulse for the problem, a lift to D major at the solution reveal, a steady
groove under the scenarios, a build on the capabilities and a resolve on the
end card. Sound effects are rendered from the picture-locked cues the scenes
register (cues.json).

Writes $BUILD/stems/music.wav and $BUILD/stems/sfx.wav (48 kHz, stereo, float).
"""
import json, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))
RNG = np.random.default_rng(2026)
BPM = 96.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT


# ---------------------------------------------------------------- helpers
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def filt(x, kind, f, order=2):
    if kind == "bp":
        sos = butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    else:
        sos = butter(order, min(f, SR / 2 - 100) / (SR / 2), btype=kind, output="sos")
    return sosfilt(sos, x, axis=0)


def env_adsr(n, a, d, s, r, sustain_n=None):
    """Simple ADSR envelope (seconds); total length n samples, release at the end."""
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    if nd and na < n:
        k = min(nd, n - na); e[na:na + k] = np.linspace(1, s, k, endpoint=False)
    if nr:
        k = min(nr, n); e[n - k:] *= np.linspace(1, 0, k) ** 1.5
    return e


def edecay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def add(buf, start_s, sig, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal into buf at start_s with constant-power pan."""
    i = int(round(start_s * SR))
    if i >= len(buf):
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.4142, sig * r * 1.4142], axis=1)
    j0 = max(0, -i); i = max(0, i)
    n = min(len(sig) - j0, len(buf) - i)
    if n > 0:
        buf[i:i + n] += sig[j0:j0 + n] * gain


# band-limited saw wavetables
TABLE_N = 4096
_ph = np.arange(TABLE_N) / TABLE_N
TABLES = {H: sum(np.sin(2 * np.pi * k * _ph) / k for k in range(1, H + 1)) * (2 / np.pi) for H in (4, 8, 16, 32, 64)}


def saw(f, n, phase0=0.0):
    H = 64
    for h in (4, 8, 16, 32, 64):
        if f * h < 14000:
            H = h
    ph = (phase0 + f * np.arange(n) / SR) % 1.0
    idx = ph * TABLE_N
    i0 = idx.astype(int); fr = idx - i0
    tb = TABLES[H]
    return tb[i0] * (1 - fr) + tb[(i0 + 1) % TABLE_N] * fr


def sine(f, n, phase0=0.0):
    return np.sin(2 * np.pi * (phase0 + f * np.arange(n) / SR))


def sweep(f0, f1, n, curve=1.0):
    k = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def noise(n):
    return RNG.standard_normal(n)


def bell(f, dur, partials=((1, 1, 1.0), (2.0, 0.5, 0.55), (3.01, 0.28, 0.35), (4.17, 0.18, 0.22))):
    n = int(dur * SR)
    out = np.zeros(n)
    for ratio, amp, tau in partials:
        out += amp * sine(f * ratio, n) * edecay(n, tau * dur)
    att = np.minimum(1, np.arange(n) / (0.003 * SR))
    return out * att


def reverb_ir(dur=2.2, damp=4200, seed=7):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], axis=1) * np.exp(-t / (dur / 6.5))[:, None]
    ir = filt(ir, "lp", damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt(np.sum(ir ** 2)) * 0.9


def apply_reverb(x, wet=0.25, ir=None):
    ir = reverb_ir() if ir is None else ir
    yl = fftconvolve(x[:, 0], ir[:, 0])[: len(x)]
    yr = fftconvolve(x[:, 1], ir[:, 1])[: len(x)]
    return x * (1 - wet * 0.35) + np.stack([yl, yr], axis=1) * wet


# ---------------------------------------------------------------- instruments
def pad(chord, dur, fc=1400, detune=0.07, att=1.2, rel=1.6):
    n = int((dur + rel) * SR)
    L = np.zeros(n); R = np.zeros(n)
    for m in chord:
        f = mtof(m)
        for d, side in ((-detune, 0), (0.0, 2), (detune, 1)):
            ff = f * 2 ** (d / 12)
            v = saw(ff, n, RNG.random())
            if side == 0:
                L += v
            elif side == 1:
                R += v
            else:
                L += v * 0.7; R += v * 0.7
    x = np.stack([L, R], axis=1) / (len(chord) * 2.4)
    x = filt(x, "lp", fc)
    e = env_adsr(n, att, 0.4, 0.85, rel)
    return x * e[:, None]


def bass(m, dur, kind="pluck"):
    f = mtof(m)
    n = int((dur + 0.08) * SR)
    x = sine(f, n) + 0.35 * sine(2 * f, n) + 0.12 * np.tanh(3 * sine(f, n))
    if kind == "pluck":
        e = edecay(n, 0.22) * np.minimum(1, np.arange(n) / (0.004 * SR))
    else:
        e = env_adsr(n, 0.02, 0.2, 0.75, 0.08)
    return filt(x * e, "lp", 900)


def pluck(m, dur=0.42):
    f = mtof(m)
    n = int(dur * SR)
    x = sine(f, n) + 0.42 * sine(3 * f, n) * edecay(n, 0.05) + 0.25 * sine(2 * f, n) * edecay(n, 0.09)
    e = edecay(n, 0.16) * np.minimum(1, np.arange(n) / (0.002 * SR))
    return filt(x * e, "lp", 5200)


def kick(g=1.0):
    n = int(0.42 * SR)
    x = sweep(125, 46, n, 0.35) * edecay(n, 0.13)
    x += 0.25 * filt(noise(n) * edecay(n, 0.004), "hp", 2500)
    return x * g


def hat(g=1.0, tau=0.035):
    n = int(0.12 * SR)
    return filt(noise(n), "hp", 7500) * edecay(n, tau) * g


def clap(g=1.0):
    n = int(0.3 * SR)
    x = filt(noise(n), "bp", (900, 3200))
    e = edecay(n, 0.09)
    for k in (0.0, 0.011, 0.022):
        i = int(k * SR)
        e[i:i + int(0.006 * SR)] += 0.8
    return x * e * g


# ---------------------------------------------------------------- score
CH = {
    "Dm9": [50, 57, 62, 64, 65], "Bbmaj7": [46, 53, 57, 62, 65], "Gm9": [43, 50, 57, 58, 62], "Asus": [45, 52, 57, 62, 64],
    "D": [50, 57, 62, 66, 69], "A/C#": [49, 57, 61, 64, 69], "Bm": [47, 54, 59, 62, 66], "Gmaj7": [43, 50, 54, 59, 62],
    "A": [45, 52, 57, 61, 64], "Em7": [40, 52, 55, 59, 62], "Dadd9": [50, 57, 62, 64, 66, 69],
}
ROOTS = {"Dm9": 38, "Bbmaj7": 34, "Gm9": 31, "Asus": 33, "D": 38, "A/C#": 37, "Bm": 35, "Gmaj7": 31, "A": 33, "Em7": 28, "Dadd9": 38}


def section(buf, t0, t1, prog, bars_per_chord=2, pad_fc=1400, pad_g=0.5, bass_mode=None, bass_g=0.3,
            arp_g=0.0, kick_mode=None, kick_g=0.35, hat_mode=None, hat_g=0.08, clap_g=0.0, arp_from=None, drums_from=None):
    """Render one musical section on its own bar grid starting at t0."""
    span = bars_per_chord * BAR
    k = 0
    t = t0
    while t < t1 - 0.05:
        name = prog[k % len(prog)]
        dur = min(span, t1 - t)
        add(buf, t, pad(CH[name], dur + 0.25, fc=pad_fc), pad_g)
        # bass
        root = ROOTS[name]
        if bass_mode == "eighths":
            for j in range(int(dur / (BEAT / 2) + 1e-6)):
                add(buf, t + j * BEAT / 2, bass(root, BEAT / 2, "pluck"), bass_g * (1.0 if j % 2 == 0 else 0.7))
        elif bass_mode == "quarters":
            for j in range(int(dur / BEAT + 1e-6)):
                add(buf, t + j * BEAT, bass(root, BEAT * 0.9, "pluck"), bass_g)
        elif bass_mode == "sync":
            pattern = [0, 0.75, 1.5, 2.0, 2.75, 3.5]
            for b in range(int(dur / BAR + 1e-6) + 1):
                for p in pattern:
                    tt = t + b * BAR + p * BEAT
                    if tt < t + dur - 0.05:
                        add(buf, tt, bass(root + (12 if p in (1.5, 3.5) else 0), BEAT * 0.5, "pluck"), bass_g)
        elif bass_mode == "hold":
            add(buf, t, bass(root, dur, "hold"), bass_g)
        # arpeggio (16ths) over the chord's upper tones
        if arp_g > 0:
            tones = sorted(CH[name])[1:] + [sorted(CH[name])[2] + 12]
            seq = [tones[i] + 12 for i in (0, 1, 2, 3, 2, 1, 3, 4)]
            n16 = int(dur / (BEAT / 4) + 1e-6)
            for j in range(n16):
                tt = t + j * BEAT / 4
                if arp_from is not None and tt < arp_from:
                    continue
                acc = 1.0 if j % 4 == 0 else 0.62
                add(buf, tt, pluck(seq[j % len(seq)]), arp_g * acc, pan=0.35 * np.sin(j * 0.9))
        t += span
        k += 1
    # drums on the section grid
    nb = int((t1 - t0) / BEAT + 1e-6)
    for j in range(nb):
        tt = t0 + j * BEAT
        if drums_from is not None and tt < drums_from:
            continue
        if kick_mode == "four":
            add(buf, tt, kick(), kick_g)
        elif kick_mode == "half" and j % 2 == 0:
            add(buf, tt, kick(), kick_g)
        elif kick_mode == "one" and j % 4 == 0:
            add(buf, tt, kick(), kick_g)
        if clap_g and j % 4 in (1, 3):
            add(buf, tt, clap(), clap_g, pan=0.05)
        if hat_mode == "off":
            add(buf, tt + BEAT / 2, hat(), hat_g, pan=0.25)
        elif hat_mode == "8ths":
            add(buf, tt, hat(), hat_g * 0.6, pan=-0.2); add(buf, tt + BEAT / 2, hat(), hat_g, pan=0.25)
        elif hat_mode == "16ths":
            for q in range(4):
                add(buf, tt + q * BEAT / 4, hat(tau=0.025), hat_g * (1.0 if q == 2 else 0.55), pan=0.3 * np.sin(q))


def riser(dur, f0=200, f1=2400):
    n = int(dur * SR)
    k = np.linspace(0, 1, n)
    x = filt(noise(n), "bp", (300, 6000)) * 0.35 + 0.25 * sweep(f0, f1, n, 1.6)
    return x * k ** 2.2


def score(total, S):
    buf = np.zeros((int((total + 3) * SR), 2))
    s = lambda k: S[k]["start"]
    e = lambda k: S[k]["end"]
    # A · intro: ambient Dm9, low drone
    add(buf, 0.0, pad(CH["Dm9"], s("s02") + 0.6, fc=650, att=2.4), 0.55)
    n = int((s("s02") + 1.2) * SR)
    drone = (sine(mtof(26), n) + 0.4 * sine(mtof(38), n)) * env_adsr(n, 3.0, 0.1, 1.0, 1.2)
    add(buf, 0.0, drone, 0.16)
    # B · tension: pulse builds under the alarm storm
    section(buf, s("s02"), e("s02") - 0.35, ["Dm9", "Bbmaj7", "Gm9", "Asus"], 2, pad_fc=1100, pad_g=0.42,
            bass_mode="eighths", bass_g=0.22, hat_mode="16ths", hat_g=0.06, kick_mode="one", kick_g=0.32, drums_from=s("s02") + 2.5)
    add(buf, e("s02") - 2.2, riser(1.9, 150, 1800), 0.18)
    # B2 · pain: heartbeat quarters
    section(buf, s("s03"), e("s03"), ["Bbmaj7", "Gm9", "Dm9", "Asus"], 2, pad_fc=1250, pad_g=0.4, bass_mode="quarters", bass_g=0.19,
            hat_mode="off", hat_g=0.035, kick_mode="one", kick_g=0.26)
    # B3 · cost: suspense, then riser into the reveal
    section(buf, s("s04"), e("s04"), ["Gm9", "Asus"], 2, pad_fc=900, pad_g=0.42, bass_mode="hold", bass_g=0.16)
    add(buf, e("s04") - 2.6, riser(2.6, 180, 3000), 0.26)
    # C · lift: D major I–V–vi–IV
    lift0 = s("s05")
    section(buf, lift0, e("s06"), ["D", "A/C#", "Bm", "Gmaj7"], 2, pad_fc=2800, pad_g=0.44, bass_mode="sync", bass_g=0.2,
            arp_g=0.16, arp_from=lift0 + 4.6, kick_mode="four", kick_g=0.26, drums_from=lift0 + 4.6, hat_mode="off", hat_g=0.06, clap_g=0.0)
    # D · scenarios: steady, lighter groove under dense narration
    g0 = s("s07")
    section(buf, g0, e("m5"), ["Bm", "Gmaj7", "D", "A"], 2, pad_fc=2200, pad_g=0.36, bass_mode="sync", bass_g=0.17,
            arp_g=0.11, kick_mode="half", kick_g=0.22, hat_mode="off", hat_g=0.045, clap_g=0.05)
    # E · build on the capabilities
    section(buf, s("s13"), e("s13"), ["Gmaj7", "A", "Bm", "A"], 1, pad_fc=2900, pad_g=0.42, bass_mode="eighths", bass_g=0.2,
            arp_g=0.15, kick_mode="four", kick_g=0.3, hat_mode="16ths", hat_g=0.06, clap_g=0.08)
    add(buf, e("s13") - 1.6, riser(1.6, 300, 4200), 0.2)
    # F · full value statement
    section(buf, s("s14"), e("s14"), ["D", "A/C#", "Bm", "Gmaj7"], 2, pad_fc=3000, pad_g=0.44, bass_mode="sync", bass_g=0.21,
            arp_g=0.15, kick_mode="four", kick_g=0.32, hat_mode="8ths", hat_g=0.06, clap_g=0.09)
    # G · outro: IV – V – I, final chord rings out on the end card
    o0 = s("s15")
    add(buf, o0, pad(CH["Gmaj7"], 2.0, fc=2000), 0.42)
    add(buf, o0 + 2.0, pad(CH["A"], 2.0, fc=2200), 0.42)
    res = E_white = None
    for c in json.load(open(os.path.join(BUILD, "cues.json"))):
        if c["type"] == "shimmer" and c["t"] > o0:
            E_white = c["t"]
    tres = E_white if E_white else o0 + 4.0
    add(buf, o0 + 4.0, pad(CH["Dadd9"], total - (o0 + 4.0), fc=2600, att=0.8, rel=2.5), 0.5)
    add(buf, o0 + 4.0, bass(26, total - (o0 + 4.0), "hold"), 0.18)
    for i, m in enumerate([74, 78, 81, 86]):
        add(buf, tres + i * 0.09, bell(mtof(m), 3.2), 0.12, pan=(-0.4 + i * 0.27))
    # gentle fade at the very end
    nfade = int(2.2 * SR); iend = int(total * SR)
    buf[iend - nfade:iend] *= np.linspace(1, 0, nfade)[:, None] ** 1.3
    buf[iend:] = 0
    return buf


# ---------------------------------------------------------------- sound effects
def sfx_sig(c):
    t, g = c["type"], c["gain"]
    dur = c.get("dur", 1.0)
    if t == "tick":
        n = int(0.05 * SR); return (0.6 * sine(2300 + RNG.random() * 300, n) + 0.3 * noise(n)) * edecay(n, 0.008)
    if t == "blip":
        n = int(0.09 * SR); return sweep(1100, 1500, n) * edecay(n, 0.03)
    if t == "blipHi":
        n = int(0.16 * SR); return (sweep(1700, 2300, n) + 0.4 * sine(3400, n)) * edecay(n, 0.045)
    if t == "pop":
        n = int(0.12 * SR); return (sweep(380, 640, n, 0.6) + 0.15 * filt(noise(n), "bp", (1500, 4000))) * edecay(n, 0.035)
    if t == "thud":
        n = int(0.5 * SR); return (sweep(95, 52, n, 0.5) + 0.3 * filt(noise(n), "lp", 300)) * edecay(n, 0.12)
    if t == "flip":
        n = int(0.28 * SR); x = np.zeros(n)
        for k in range(7):
            i = int(k * 0.034 * SR); m = int(0.012 * SR)
            x[i:i + m] += filt(noise(m), "bp", (1800, 5200)) * np.linspace(1, 0, m)
        return x
    if t in ("tickrun", "typerun"):
        n = int(dur * SR); x = np.zeros(n); rate = 22 if t == "tickrun" else 17
        for k in range(int(dur * rate)):
            i = int(k / rate * SR); m = int(0.012 * SR)
            if i + m < n:
                f = 2000 + 900 * k / max(1, dur * rate) if t == "tickrun" else 3500 + RNG.random() * 1500
                x[i:i + m] += (sine(f, m) * 0.5 + 0.5 * filt(noise(m), "hp", 2500)) * np.linspace(1, 0, m) * (0.7 + 0.3 * RNG.random())
        return x
    if t == "boom":
        n = int(1.8 * SR); return (sweep(70, 38, n, 0.4) * edecay(n, 0.45) + 0.35 * filt(noise(n), "lp", 220) * edecay(n, 0.2))
    if t in ("impact", "impactSoft"):
        n = int(2.2 * SR)
        x = sweep(90, 40, n, 0.4) * edecay(n, 0.5) + 0.5 * filt(noise(n), "lp", 400) * edecay(n, 0.22)
        if t == "impact":
            x += 0.35 * filt(noise(n), "hp", 3000) * edecay(n, 0.06)
        return x * (1.0 if t == "impact" else 0.6)
    if t == "whoosh":
        n = int(0.75 * SR); k = np.linspace(0, 1, n)
        x = noise(n)
        # sweeping band: approximate with three overlapping bands
        y = filt(x, "bp", (300, 900)) * (1 - k) + filt(x, "bp", (900, 2600)) * np.sin(np.pi * k) + filt(x, "bp", (2600, 6000)) * k * 0.6
        return y * np.sin(np.pi * k) ** 1.6
    if t == "swell":
        n = int(dur * SR); k = np.linspace(0, 1, n)
        x = sum(sine(mtof(m), n) for m in (74, 78, 81, 86)) / 4
        return x * (k ** 2) * np.minimum(1, (1 - k) * 12)
    if t == "shimmer":
        n = int(dur * SR); x = np.zeros(n)
        for _ in range(int(dur * 26)):
            i = int(RNG.random() * (n - int(0.4 * SR))); m = int(0.4 * SR)
            x[i:i + m] += sine(2000 + RNG.random() * 4500, m) * edecay(m, 0.08) * 0.35
        return x * np.minimum(1, np.linspace(0, 1, n) * 3) * np.minimum(1, (1 - np.linspace(0, 1, n)) * 3)
    if t == "sweep":
        n = int(dur * SR); k = np.linspace(0, 1, n)
        return (filt(noise(n), "bp", (1200, 5000)) * 0.4 + 0.3 * sweep(500, 1800, n)) * np.sin(np.pi * k) ** 2
    if t == "scan":
        n = int(dur * SR); k = np.linspace(0, 1, n)
        return sweep(620, 980, n) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * k * dur)) * np.sin(np.pi * k) ** 0.8 * 0.6
    if t == "switch":
        n = int(0.16 * SR); x = np.zeros(n); m = int(0.01 * SR)
        x[:m] += filt(noise(m), "hp", 3000); x[int(0.05 * SR):int(0.05 * SR) + m] += filt(noise(m), "hp", 3000) * 0.7
        return x + 0.5 * sweep(900, 1400, n) * edecay(n, 0.03)
    if t == "alert":
        a = bell(880, 0.5); b = bell(659.3, 0.6)
        x = np.zeros(int(0.9 * SR)); x[:len(a)] += a; x[int(0.16 * SR):int(0.16 * SR) + len(b)] += b
        return x * 0.6
    if t == "alertSoft":
        return bell(659.3, 0.7) * 0.6
    if t == "beep":
        n = int(0.09 * SR); return sine(1450, n) * np.minimum(1, (1 - np.linspace(0, 1, n)) * 6) * 0.6
    if t == "click":
        n = int(0.06 * SR); return (filt(noise(n), "hp", 2500) * edecay(n, 0.004) + 0.4 * sine(3000, n) * edecay(n, 0.006))
    if t == "confirm":
        a = bell(1318.5, 0.35); b = bell(1975.5, 0.45)
        x = np.zeros(int(0.6 * SR)); x[:len(a)] += a * 0.6; x[int(0.07 * SR):int(0.07 * SR) + len(b)] += b * 0.5
        return x
    if t == "success":
        x = np.zeros(int(1.2 * SR))
        for i, m in enumerate((74, 78, 81)):
            b = bell(mtof(m), 0.8); j = int(i * 0.075 * SR); x[j:j + len(b)] += b * 0.5
        return x
    if t == "chime":
        return bell(1568, 1.0) * 0.6
    if t == "notify":
        x = np.zeros(int(0.8 * SR)); a = bell(880, 0.4); b = bell(1174.7, 0.6)
        x[:len(a)] += a * 0.6; x[int(0.12 * SR):int(0.12 * SR) + len(b)] += b * 0.6
        return x
    if t == "type":
        n = int(0.03 * SR); return filt(noise(n), "bp", (2500, 7000)) * edecay(n, 0.005) * (0.7 + 0.3 * RNG.random())
    if t == "stamp":
        n = int(0.4 * SR); return (sweep(140, 60, n, 0.5) * edecay(n, 0.06) + 0.6 * filt(noise(n), "bp", (700, 2600)) * edecay(n, 0.03))
    if t == "hit":
        idx = c.get("i", 0); m = [62, 64, 66, 69, 71, 74, 76][idx % 7] + 12
        x = pluck(m, 0.6) * 0.8 + 0.6 * pluck(m - 12, 0.6)
        k = kick(0.6)
        y = np.zeros(max(len(x), len(k))); y[:len(x)] += x; y[:len(k)] += k
        return y
    if t == "riser":
        return riser(dur, 250, 3800)
    if t == "ping":
        return bell(1174.7, 2.8) * 0.7
    return np.zeros(10)


def sfx(total, cues):
    buf = np.zeros((int((total + 3) * SR), 2))
    hits = 0
    for c in cues:
        if c["type"] == "hit":
            c = dict(c, i=hits); hits += 1
        sig = sfx_sig(c)
        pan = 0.0
        if c["type"] in ("tick", "type", "blip"):
            pan = (RNG.random() - 0.5) * 0.5
        add(buf, c["t"], sig.astype(np.float64), c["gain"], pan)
    return buf


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    cues = json.load(open(os.path.join(BUILD, "cues.json")))
    total = tl["total"]
    os.makedirs(os.path.join(BUILD, "stems"), exist_ok=True)
    m = score(total, tl["scenes"])
    m = apply_reverb(m, 0.22, reverb_ir(2.6, 3800, 1))
    s = sfx(total, cues)
    s = apply_reverb(s, 0.18, reverb_ir(1.4, 5200, 2))
    n = int(total * SR)
    for name, x in (("music", m[:n]), ("sfx", s[:n])):
        peak = np.max(np.abs(x)) + 1e-9
        x = x / peak * 0.89  # headroom; the mix sets final levels
        sf.write(os.path.join(BUILD, "stems", name + ".wav"), x.astype(np.float32), SR, subtype="FLOAT")
        print(f"{name}: {len(x)/SR:.2f}s peak-normalised from {peak:.2f}")


if __name__ == "__main__":
    main()
