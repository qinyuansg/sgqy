#!/usr/bin/env python3
"""Final mix: music + sound effects (+ an optional voiceover) → −14 LUFS, ≤ −3 dBTP.

Reads $BUILD/timeline.json and $BUILD/stems/{music,sfx}.wav. A voiceover is used only when
$BUILD/vo/<line id>.wav files exist for the timeline's lines; this film has none, so the voice
bus and the music ducking are skipped and the bed sits a little higher.
Writes $BUILD/mix.wav (48 kHz, 24-bit stereo) and prints loudness stats.
"""
import json, os
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy.signal import butter, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))
METER = pyln.Meter(SR)


def sos(kind, f, order=2):
    if kind == "bp":
        return butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    return butter(order, f / (SR / 2), btype=kind, output="sos")


def lufs(x):
    return METER.integrated_loudness(x if x.ndim == 2 else np.stack([x, x], 1))


def gain_to(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)


def follower(x, att=0.06, rel=0.45):
    """Peak-ish envelope follower on |x| (mono), separate attack/release."""
    a = np.exp(-1 / (att * SR)); r = np.exp(-1 / (rel * SR))
    rect = np.abs(x)
    hop = 48
    d = rect[: len(rect) // hop * hop].reshape(-1, hop).max(axis=1)
    env = np.zeros_like(d); e = 0.0
    a2, r2 = a ** hop, r ** hop
    for i, v in enumerate(d):
        e = a2 * e + (1 - a2) * v if v > e else r2 * e + (1 - r2) * v
        env[i] = e
    env = np.repeat(env, hop)
    return np.pad(env, (0, len(x) - len(env)), mode="edge")


def limiter(x, ceiling_db=-1.0, look=0.005, rel=0.12):
    """Look-ahead limiter driven by a 4× oversampled (true-peak) detector."""
    c = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = up[: len(up) // 4 * 4].reshape(-1, 4).max(axis=1)
    pk = np.pad(pk, (0, len(x) - len(pk)), mode="edge")
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    L = int(look * SR)
    g = -maximum_filter1d(-need, size=2 * L + 1, origin=0)
    out = np.empty_like(g); e = 1.0; rr = np.exp(-1 / (rel * SR))
    for i, v in enumerate(g):
        e = v if v < e else rr * e + (1 - rr) * v
        out[i] = e
    return x * out[:, None]


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    n = int(round(tl["total"] * SR))
    lines = tl.get("lines") or []
    vo_dir = os.path.join(BUILD, "vo")
    have_vo = bool(lines) and all(os.path.exists(os.path.join(vo_dir, ln["id"] + ".wav")) for ln in lines)

    vo = np.zeros(n)
    if have_vo:
        hp, pres = sos("hp", 85), sos("bp", (2500, 6000))
        for ln in lines:
            x, sr = sf.read(os.path.join(vo_dir, ln["id"] + ".wav"), dtype="float64")
            assert sr == SR
            x = sosfilt(hp, x)
            x = x + 0.18 * sosfilt(pres, x)
            x = gain_to(x, -18.0)
            x = np.tanh(x * 1.6) / 1.6
            i = int(round(ln["start"] * SR)); k = min(len(x), n - i)
            vo[i:i + k] += x[:k]
    vo_st = np.stack([vo, vo], axis=1)

    mus, _ = sf.read(os.path.join(BUILD, "stems", "music.wav"), dtype="float64")
    sfx, _ = sf.read(os.path.join(BUILD, "stems", "sfx.wav"), dtype="float64")
    mus, sfx = mus[:n], sfx[:n]
    mus = sosfilt(sos("hp", 32), mus, axis=0)
    mus = mus - 0.25 * sosfilt(sos("lp", 110), mus, axis=0)       # ~ -2.5 dB low shelf
    if have_vo:
        mus = mus - 0.35 * sosfilt(sos("bp", (1400, 4200)), mus, axis=0)  # voice pocket
        mus = gain_to(mus, -22.0)
        sfx = gain_to(sfx, -25.0)
        env = follower(vo, 0.05, 0.5)
        env = env / (np.max(env) + 1e-9)
        mus *= (10 ** ((-9.0 * np.clip(env / 0.12, 0, 1)) / 20))[:, None]
        sfx *= (10 ** ((-3.0 * np.clip(env / 0.12, 0, 1)) / 20))[:, None]
    else:                                                          # no narration: the bed carries the film
        mus = gain_to(mus, -17.0)
        sfx = gain_to(sfx, -23.0)

    mix = vo_st + mus + sfx
    # −3 dBTP ceiling leaves room for AAC overshoot (deliverables measure ≤ −1 dBTP)
    mix = gain_to(mix, -14.0)
    mix = limiter(mix, -3.0)
    mix = gain_to(mix, -14.0)
    mix = limiter(mix, -3.0)
    sf.write(os.path.join(BUILD, "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
    tp = 20 * np.log10(np.abs(resample_poly(mix, 4, 1, axis=0)).max() + 1e-12)
    print(f"mix: {lufs(mix):.1f} LUFS integrated, true peak {tp:.2f} dBTP, {n/SR:.2f}s, voice: {'yes' if have_vo else 'none'}")
    for name, x in (("music", mus), ("sfx", sfx)) + ((("vo", vo_st),) if have_vo else ()):
        print(f"  {name:8s} {lufs(x):6.1f} LUFS")


if __name__ == "__main__":
    main()
