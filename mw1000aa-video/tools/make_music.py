#!/usr/bin/env python3
"""Synthesize a quiet ambient pad (original, procedurally generated) as the music bed.
Usage: python tools/make_music.py <duration_seconds> <out.wav>"""
import sys
import numpy as np
import soundfile as sf

SR = 48000
dur = float(sys.argv[1]); out = sys.argv[2]
n = int(dur * SR) + SR
L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
A3 = 220.0
semi = lambda s: A3 * 2 ** (s / 12)
# Am(add9) - Fmaj7 - C(add9) - G6, voiced low and open
chords = [[-12, -5, 0, 2, 7], [-16, -9, -4, 0, 3], [-21, -14, -9, -5, 2], [-14, -7, -2, 2, 4]]
CH = 9.0          # seconds per chord
XF = 3.0          # crossfade
t_seg = np.arange(int((CH + XF) * SR)) / SR
env = np.minimum(1, t_seg / XF) * np.minimum(1, (CH + XF - t_seg) / XF)
env = (env ** 1.5).astype(np.float32)
k = 0; start = 0.0
rng = np.random.default_rng(7)
while start < dur:
    notes = chords[k % len(chords)]
    segL = np.zeros_like(t_seg); segR = np.zeros_like(t_seg)
    for j, s in enumerate(notes):
        f = semi(s)
        ph = rng.uniform(0, 2 * np.pi)
        trem = 0.75 + 0.25 * np.sin(2 * np.pi * (0.07 + 0.02 * j) * t_seg + ph)
        amp = 0.22 / (1 + 0.35 * j)
        v = np.sin(2 * np.pi * f * t_seg + ph) + 0.18 * np.sin(2 * np.pi * 2 * f * t_seg + ph * 1.3)
        segL += amp * trem * v
        segR += amp * trem * (np.sin(2 * np.pi * f * 1.0018 * t_seg + ph) + 0.18 * np.sin(2 * np.pi * 2 * f * 1.0018 * t_seg))
    shimmer = 0.035 * np.sin(2 * np.pi * semi(notes[-1] + 24) * t_seg) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t_seg))
    i0 = int(start * SR); i1 = min(n, i0 + len(t_seg))
    L[i0:i1] += ((segL + shimmer) * env)[: i1 - i0]
    R[i0:i1] += ((segR + shimmer) * env)[: i1 - i0]
    start += CH; k += 1
# pure sines with soft tremolo: no filtering needed
st = np.stack([L, R], 1)[: int(dur * SR)]
fade_in, fade_out = int(3 * SR), int(5 * SR)
st[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
st[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
st = st / np.max(np.abs(st)) * 0.07   # about -23 dBFS peak: a bed under the voice
sf.write(out, st.astype(np.float32), SR)
print("music", st.shape[0] / SR, "s")
