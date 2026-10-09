#!/usr/bin/env python3
"""Room audio from the recording, old 1.56 kHz beep removed, new chime on the match and a tick on 'Look here'."""
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import iirnotch, filtfilt

SRC, OUT = sys.argv[1], sys.argv[2]
SR = 48000
DUR = 311 / 30

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-vn", "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float64).reshape(-1, 2) / 32768
n = int(round(DUR * SR))
x = np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]

for f0 in (1562.5, 3125.0, 4687.5):            # the old success beep and its harmonics
    b, a = iirnotch(f0, Q=9, fs=SR)
    x = filtfilt(b, a, x, axis=0)

t = np.arange(n) / SR


def tone(start, freq, amp, decay, attack=0.006, partials=((1, 1.0), (2, 0.16), (3, 0.05))):
    s = np.zeros(n)
    tt = t - start
    env = np.where(tt < 0, 0, np.where(tt < attack, tt / attack, np.exp(-(tt - attack) / decay)))
    for mult, g in partials:
        s += g * np.sin(2 * np.pi * freq * mult * tt)
    return amp * env * s


def chime(start):
    # rising fifth E6 → B6, glassy and short: bloom, chime and status light land together
    return tone(start, 1318.5, 0.11, 0.30) + tone(start + 0.085, 1975.5, 0.10, 0.42)


def tick(start):
    return tone(start, 2400.0, 0.025, 0.035, attack=0.002, partials=((1, 1.0),))


MATCH = [(51 - 1) / 30, (254 - 1) / 30]       # frames 51 and 254
LOOK = [(38 - 1) / 30, (220 - 1) / 30]         # 'Look here' lights up
fx = sum(chime(s) for s in MATCH) + sum(tick(s) for s in LOOK)
y = x + np.stack([fx * 0.96, fx], 1)          # a touch of width
peak = np.max(np.abs(y))
if peak > 0.89:
    y *= 0.89 / peak
pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}: {n / SR:.3f}s, peak {20 * np.log10(np.max(np.abs(pcm)) / 32767 + 1e-9):.1f} dBFS")
