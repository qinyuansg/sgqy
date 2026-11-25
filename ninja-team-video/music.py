"""Generate a soft ambient pad and mix it under the narration.

The pad is synthesized from scratch (slow, detuned sine chords in D major), so
there is no licensed audio in the video. It sits ~24 dB under the voice while
someone is speaking, and comes up for the opening and the closing.

Writes build/mix.wav (48 kHz stereo).
"""
import json, os, subprocess
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SR = 48000

CHORDS = [  # Dmaj9, Bm9, Gmaj9, Asus
    [146.83, 220.00, 277.18, 329.63, 369.99],
    [123.47, 185.00, 220.00, 277.18, 293.66],
    [98.00, 146.83, 185.00, 220.00, 246.94],
    [110.00, 164.81, 220.00, 246.94, 293.66],
]
CHORD_LEN = 10.0   # seconds per chord
XFADE = 4.0        # crossfade between chords


def load_narration():
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", os.path.join(BUILD, "narration.wav"),
                          "-af", "aresample=48000:resampler=soxr", "-f", "f32le", "-ac", "1", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def pad(duration, rng):
    n = int(duration * SR)
    out = np.zeros((n, 2), np.float32)
    step = CHORD_LEN
    k = 0
    t0 = -XFADE / 2
    while t0 < duration:
        a = max(0, int(t0 * SR))
        b = min(n, int((t0 + step + XFADE) * SR))
        if b <= a:
            break
        t = np.arange(a, b) / SR
        local = t - t0
        L = step + XFADE
        # raised-cosine window: XFADE in, flat, XFADE out
        w = np.ones_like(local)
        up = local < XFADE
        w[up] = 0.5 - 0.5 * np.cos(np.pi * local[up] / XFADE)
        dn = local > L - XFADE
        w[dn] = 0.5 + 0.5 * np.cos(np.pi * (local[dn] - (L - XFADE)) / XFADE)
        chord = CHORDS[k % len(CHORDS)]
        seg = np.zeros((len(t), 2), np.float32)
        for i, f in enumerate(chord):
            amp = 1.0 / (1 + 0.35 * i)
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * (0.05 + 0.02 * rng.random()) * t + rng.random() * 6.28)
            for det, pan in ((-0.0012, 0.25), (0.0, 0.5), (0.0013, 0.75)):
                ph = rng.random() * 6.28
                v = np.sin(2 * np.pi * f * (1 + det) * t + ph) + 0.16 * np.sin(4 * np.pi * f * (1 + det) * t + ph)
                v = (v * amp * lfo).astype(np.float32)
                seg[:, 0] += v * np.sqrt(1 - pan)
                seg[:, 1] += v * np.sqrt(pan)
        out[a:b] += seg * w[:, None].astype(np.float32)
        t0 += step
        k += 1
    return out


def smooth_env(points, n):
    """points: list of (time, level) -> per-sample envelope with linear ramps."""
    ts = np.array([p[0] for p in points]) * SR
    ls = np.array([p[1] for p in points])
    return np.interp(np.arange(n), ts, ls).astype(np.float32)


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    D = tl["duration"]
    voice = load_narration()
    n = int(D * SR)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]

    speech = np.abs(voice) > 1e-3
    v_rms = float(np.sqrt(np.mean(voice[speech] ** 2)))

    rng = np.random.default_rng(7)
    music = pad(D, rng)
    m_rms = float(np.sqrt(np.mean(music ** 2)))
    music /= m_rms  # unit RMS

    first = min(b["start"] for b in tl["beats"].values())
    last = max(b["end"] for b in tl["beats"].values())
    under = v_rms * 10 ** (-24 / 20)
    up = v_rms * 10 ** (-7 / 20)
    env = smooth_env([
        (0, 0), (2.2, up), (first - 0.2, up), (first + 1.8, under),
        (last - 0.5, under), (last + 1.8, up * 0.9), (D - 2.4, up * 0.9), (D, 0),
    ], n)
    mix = music * env[:, None] + voice[:, None]
    peak = float(np.max(np.abs(mix)))
    if peak > 0.98:
        mix *= 0.98 / peak
    sf.write(os.path.join(BUILD, "mix.wav"), mix, SR, subtype="PCM_24")
    print(f"mix.wav: {D:.1f}s, voice rms {20*np.log10(v_rms):.1f} dBFS, peak {20*np.log10(peak):.1f} dBFS")


if __name__ == "__main__":
    main()
