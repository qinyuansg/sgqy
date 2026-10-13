#!/usr/bin/env python3
"""Final mix: voiceover + ducked music + sound effects → −14 LUFS, ≤ −3 dBTP (≤ −1 dBTP after AAC).

Reads $BUILD/timeline.json, $BUILD/vo/*.wav, $BUILD/stems/{music,sfx}.wav.
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
    # decimate for speed, then upsample the envelope
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
    g = -maximum_filter1d(-need, size=2 * L + 1, origin=0)  # min over the look-ahead window
    out = np.empty_like(g); e = 1.0; rr = np.exp(-1 / (rel * SR))
    for i, v in enumerate(g):  # instant attack (already looked ahead), smooth release
        e = v if v < e else rr * e + (1 - rr) * v
        out[i] = e
    return x * out[:, None]


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    n = int(round(tl["total"] * SR))
    # ---- voice: clean, level-matched per line, placed on the timeline
    vo = np.zeros(n)
    hp, pres = sos("hp", 85), sos("bp", (2500, 6000))
    for ln in tl["lines"]:
        x, sr = sf.read(os.path.join(BUILD, "vo", ln["id"] + ".wav"), dtype="float64")
        assert sr == SR
        x = sosfilt(hp, x)
        x = x + 0.18 * sosfilt(pres, x)                 # gentle presence lift
        x = gain_to(x, -18.0)                           # consistent level line to line
        x = np.tanh(x * 1.6) / 1.6                      # soft-clip the odd hot peak
        i = int(round(ln["start"] * SR)); k = min(len(x), n - i)
        vo[i:i + k] += x[:k]
    vo_st = np.stack([vo, vo], axis=1)

    # ---- music: tidy low end, carve room for the voice, duck under narration
    mus, _ = sf.read(os.path.join(BUILD, "stems", "music.wav"), dtype="float64")
    sfx, _ = sf.read(os.path.join(BUILD, "stems", "sfx.wav"), dtype="float64")
    mus, sfx = mus[:n], sfx[:n]
    mus = sosfilt(sos("hp", 32), mus, axis=0)
    mus = mus - 0.25 * sosfilt(sos("lp", 110), mus, axis=0)       # ~ -2.5 dB low shelf
    mus = mus - 0.35 * sosfilt(sos("bp", (1400, 4200)), mus, axis=0)  # voice pocket
    mus = gain_to(mus, -22.0)
    sfx = gain_to(sfx, -25.0)

    env = follower(vo, 0.05, 0.5)
    env = env / (np.max(env) + 1e-9)
    duck_db = -9.0 * np.clip(env / 0.12, 0, 1)                  # full duck once speech is present
    duck_sfx = -3.0 * np.clip(env / 0.12, 0, 1)
    mus *= (10 ** (duck_db / 20))[:, None]
    sfx *= (10 ** (duck_sfx / 20))[:, None]

    mix = vo_st + mus + sfx
    # −3 dBTP ceiling leaves room for AAC overshoot (deliverables measure ≤ −1 dBTP)
    mix = gain_to(mix, -14.0)
    mix = limiter(mix, -3.0)
    mix = gain_to(mix, -14.0)
    mix = limiter(mix, -3.0)
    sf.write(os.path.join(BUILD, "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
    tp = 20 * np.log10(np.abs(resample_poly(mix, 4, 1, axis=0)).max() + 1e-12)
    print(f"mix: {lufs(mix):.1f} LUFS integrated, true peak {tp:.2f} dBTP, {n/SR:.2f}s")
    # stems for reference
    for name, x in (("vo", vo_st), ("music_ducked", mus), ("sfx_ducked", sfx)):
        print(f"  {name:13s} {lufs(x):6.1f} LUFS")


if __name__ == "__main__":
    main()
