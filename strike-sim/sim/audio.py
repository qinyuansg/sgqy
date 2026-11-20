"""Synthesised soundtrack: dark ambient bed, distant air-raid siren, tension pulse
during the ballistic sequence, and impact booms panned/attenuated by where each
impact sits relative to the camera.  Output: work/soundtrack.wav"""
import math, os, sys, wave
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import scene as SC
import render as R

SR = 48000
N = int(SC.DURATION * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(5)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def env_keys(keys):
    k = np.array(keys, float)
    return np.interp(t, k[:, 0], k[:, 1])


def pad():
    """Low drone: detuned partials of an A-minor colour with slow breathing."""
    out = np.zeros((N, 2))
    for f, a in [(55.0, 1.0), (82.41, 0.55), (110.0, 0.45), (130.81, 0.22), (164.81, 0.12)]:
        for det, ch in [(-0.18, 0), (0.21, 1)]:
            ph = rng.uniform(0, 6.28)
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * t / rng.uniform(7, 13) + ph)
            out[:, ch] += a * lfo * np.sin(2 * np.pi * (f + det) * t + ph)
    air = lp(rng.standard_normal((N, 2)).T, 300).T * 0.9
    air *= (0.6 + 0.4 * np.sin(2 * np.pi * t / 9.0))[:, None]
    lvl = env_keys([(0, 0), (3, 0.5), (27, 0.55), (31, 0.8), (42, 0.9), (48, 1.0), (58, 0.85), (64, 0.55),
                    (70, 0.6), (SC.DURATION - 1.5, 0.45), (SC.DURATION, 0)])
    return (out * 0.12 + air * 0.075) * lvl[:, None]


def siren():
    """Distant civil-defence siren under the title (rising/falling wail)."""
    a, b = 0.6, 10.5
    m = (t >= a) & (t < b)
    tt = t[m] - a
    f = 430 + 210 * (0.5 - 0.5 * np.cos(2 * np.pi * tt / 4.6))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph) + 0.08 * np.sin(5 * ph)
    e = np.clip(tt / 1.8, 0, 1) * np.clip((b - a - tt) / 2.5, 0, 1)
    x = lp(x * e, 1400) * 0.13
    out = np.zeros((N, 2)); out[m, 0] = x * 0.9; out[m, 1] = x
    return out


def pulse():
    """Sub-bass heartbeat during the ballistic slow motion."""
    out = np.zeros(N)
    v = 41.6
    while v < 48.6:
        for dv, amp in ((0, 1.0), (0.24, 0.6)):
            i0 = int((v + dv) * SR); n = int(0.45 * SR)
            tt = np.arange(n) / SR
            out[i0:i0 + n] += amp * np.sin(2 * np.pi * (48 - 14 * tt) * tt) * np.exp(-tt / 0.11)
        v += 0.92
    return np.c_[out, out] * 0.30


def whoosh(at, dur, gain, pan=0.0, fc0=200, fc1=2500):
    n = int(dur * SR); i0 = int(at * SR)
    x = rng.standard_normal(n)
    tt = np.arange(n) / n
    # sweeping band via two passes with time-varying blend
    lo, hi = lp(x, fc0), lp(x, fc1)
    y = lo * (1 - tt) + hi * tt
    y *= np.sin(np.pi * tt) ** 2 * gain
    out = np.zeros((N, 2))
    m = min(n, N - i0)
    out[i0:i0 + m, 0] = y[:m] * (1 - pan) * 0.7; out[i0:i0 + m, 1] = y[:m] * (1 + pan) * 0.7
    return out


def boom(i0, gain, pan, big):
    n = int((3.2 if big else 1.8) * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (62 * tt - 9 * tt * tt)) * np.exp(-tt / (0.9 if big else 0.5))
    body = lp(rng.standard_normal(n), 420) * np.exp(-tt / (0.35 if big else 0.22)) * 2.2
    crack = hp(rng.standard_normal(n), 1800) * np.exp(-tt / 0.035) * 0.5
    rumble = lp(rng.standard_normal(n), 120) * np.exp(-tt / 1.4) * (1.6 if big else 0.6)
    y = (sub * 1.1 + body + crack + rumble) * gain
    out = np.zeros((N, 2)); m = min(n, N - i0)
    out[i0:i0 + m, 0] = y[:m] * (1 - pan * 0.8); out[i0:i0 + m, 1] = y[:m] * (1 + pan * 0.8)
    return out


def pop(i0, gain, pan):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    y = (lp(rng.standard_normal(n), 900) * np.exp(-tt / 0.06) + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt / 0.08)) * gain
    out = np.zeros((N, 2)); m = min(n, N - i0)
    out[i0:i0 + m, 0] = y[:m] * (1 - pan * 0.7); out[i0:i0 + m, 1] = y[:m] * (1 + pan * 0.7)
    return out


def where(v, x, y, z=0.0):
    cam = R.make_cam(v)
    sx, sy, sz = R.proj(cam, np.array([[x, y, z]]))
    on = sz[0] > 2 and 0 <= sx[0] < SC.W and SC.BAR <= sy[0] < SC.H - SC.BAR
    d = math.hypot(x - cam['tx'], y - cam['ty'])
    vis = math.exp(-d / (0.7 * cam['dist']))
    pan = float(np.clip((sx[0] - SC.W / 2) / (SC.W / 2), -1, 1)) if sz[0] > 2 else 0.0
    return (0.35 + 0.65 * vis) if on else 0.12 + 0.1 * vis, pan


def main():
    R.A = R.Assets()
    mix = pad() + siren() + pulse()
    mix += whoosh(29.0, 3.5, 0.10, 0.4, 150, 1800)       # Kh-101 entering
    mix += whoosh(41.8, 2.6, 0.12, 0.0, 120, 3000)       # ballistic launch
    for h in R.A.hits:
        g, pan = where(h['v'], h['x'], h['y'])
        mix += boom(int(h['v'] * SR), 0.40 * g * (1.0 if h['big'] else 0.6), pan, h['big'])
    for p in R.A.pops:
        g, pan = where(p['v'], p['x'], p['y'], p['z'])
        if g > 0.3:
            mix += pop(int(p['v'] * SR), 0.10 * g, pan)
    # room / distance: convolution reverb send
    n = int(2.8 * SR); tt = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-tt / 0.75)[:, None]
    ir = lp(ir.T, 3000).T; ir /= np.abs(ir).sum(axis=0).max() / 6
    wet = np.c_[fftconvolve(mix[:, 0], ir[:, 0])[:N], fftconvolve(mix[:, 1], ir[:, 1])[:N]]
    out = mix * 0.8 + wet * 0.35
    out = hp(out.T, 25).T
    fade = np.clip(t / 1.2, 0, 1) * np.clip((SC.DURATION - t) / 2.0, 0, 1)
    out *= fade[:, None]
    out = np.tanh(out * 2.4) / 2.4
    out *= 0.89 / np.abs(out).max()
    pcm = (out * 32767).astype(np.int16)
    with wave.open(os.path.join(R.ROOT, 'work', 'soundtrack.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('soundtrack written', pcm.shape)


if __name__ == '__main__':
    main()
