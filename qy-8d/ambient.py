"""合成一段 150 秒的氛围占位配乐（无版权问题），用法：python3 ambient.py out.wav
慢速和弦铺底 + 场景切换处的轻铃声 + 中段低频心跳。想换成自己的音乐，用 add_music.sh。"""
import sys, wave
import numpy as np

SR, DUR = 44100, 150.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

def hz(m):  # MIDI → Hz
    return 440.0 * 2 ** ((m - 69) / 12)

# Am9 – Fmaj7 – C – G(add9)，每个和弦 9.375 秒，铺满全片
CHORDS = [[45, 57, 60, 64, 71], [41, 53, 57, 64, 67], [48, 55, 60, 64, 67], [43, 55, 59, 62, 69]]
CH = 9.375
pad = np.zeros(N)
k = 0
while k * CH < DUR:
    t0 = k * CH
    s, e = int(max(0, t0 - 1.5) * SR), int(min(DUR, t0 + CH + 1.5) * SR)
    tt = t[s:e] - t0
    env = np.clip((tt + 1.5) / 3.0, 0, 1) * np.clip((CH + 1.5 - tt) / 3.0, 0, 1)
    env = np.sin(env * np.pi / 2) ** 2
    for j, m in enumerate(CHORDS[k % 4]):
        f = hz(m)
        amp = 0.16 if j == 0 else 0.09
        for det in (-0.12, 0.12):  # 轻微失谐，温暖一些
            ph = rng.uniform(0, 2 * np.pi)
            w = 2 * np.pi * (f + det) * t[s:e] + ph
            pad[s:e] += amp * env * (np.sin(w) + 0.25 * np.sin(2 * w) + 0.08 * np.sin(3 * w))
    k += 1
pad *= 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 23))  # 缓慢呼吸

# 场景切换铃声
SCENE_STARTS = [0.4, 8, 17, 29] + [29 + 9.5 * i for i in range(1, 8)] + [105, 118, 129, 139]
BELL_NOTES = [76, 81, 79, 84, 83, 81, 79, 76, 79, 81, 83, 84, 88, 86, 84, 88]
bells = np.zeros(N)
for i, ts in enumerate(SCENE_STARTS):
    s = int(ts * SR); L = min(N - s, int(4 * SR)); tt = np.arange(L) / SR
    f = hz(BELL_NOTES[i % len(BELL_NOTES)])
    env = np.exp(-tt * 1.6) * np.clip(tt / 0.005, 0, 1)
    bells[s:s + L] += 0.10 * env * (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.01 * tt) * np.exp(-tt * 3))

# 低频心跳：从“引擎”到“目标”段
pulse = np.zeros(N)
for b in np.arange(17, 139, 1.875):  # 64 BPM 左右
    s = int(b * SR); L = int(0.5 * SR); tt = np.arange(L) / SR
    f = 52 * (1 + 0.6 * np.exp(-tt * 30))
    pulse[s:s + L] += 0.16 * np.exp(-tt * 9) * np.sin(2 * np.pi * np.cumsum(f) / SR)

def reverb(x, seconds=2.4, mix=0.35):
    L = int(seconds * SR)
    ir = rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 3.2)
    ir[0] = 0
    n = 1 << int(np.ceil(np.log2(len(x) + L)))
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[:len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x / (np.max(np.abs(x)) + 1e-9) * (1 - mix) + wet * mix

dry = pad + bells * 1.4
left = reverb(dry + 0.02 * rng.standard_normal(N) * 0, 2.6, 0.4) + pulse * 2
right = reverb(np.roll(dry, int(0.011 * SR)), 2.6, 0.4) + pulse * 2
mix = np.stack([left, right], 1)
fade = np.clip(t / 2.5, 0, 1) * np.clip((DUR - t) / 3.5, 0, 1)
mix *= fade[:, None]
mix = mix / np.max(np.abs(mix)) * 0.6

out = sys.argv[1] if len(sys.argv) > 1 else 'ambient.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
