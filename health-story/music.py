#!/usr/bin/env python3
"""
替代配乐生成器（纯 numpy 合成）。
原始要求的 YouTube 音乐在渲染环境里下载不到，因此用同一条“能量曲线”合成一首
96 BPM 的电子氛围曲，让画面节奏与音乐起伏一致。成片后可在 ffmpeg 里直接换成原曲。

能量曲线（秒）：
  0-8    冷开场    只有低音垫 + 心跳
  8-22   展开      加入轻鼓点
  22-40  上升      底鼓 + 贝斯 进入
  40-58  张力      踩镲密集，和弦变暗，58s 前 riser
  58-74  高潮      全编制 + 琶音
  74-90  框架      保持律动，和弦明亮
  90-104 收束      渐弱，回到垫音 + 心跳
"""
import math
import sys
import wave

import numpy as np

SR = 44100
BPM = 96
BEAT = 60.0 / BPM
DUR = 104.0
N = int(SR * DUR)
t = np.arange(N) / SR


def env_curve(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


# 总体能量包络 0..1
energy = env_curve([(0, 0.15), (8, 0.3), (22, 0.5), (40, 0.65), (57, 0.8), (58, 1.0),
                    (74, 0.95), (90, 0.7), (98, 0.3), (104, 0.0)])

# 和弦进行（A 小调系：Am - F - C - G），每 4 拍一换；高潮段升到 C 大调明亮排列
CHORDS_DARK = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0], [196.0, 246.94, 293.66]]
CHORDS_BRIGHT = [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]]


def chord_at(time):
    bar = int(time / (BEAT * 4))
    bright = 58 <= time < 90
    seq = CHORDS_BRIGHT if bright else CHORDS_DARK
    return seq[bar % 4]


def pad():
    out = np.zeros(N)
    bar_len = BEAT * 4
    nb = int(DUR / bar_len) + 1
    for b in range(nb):
        s = b * bar_len
        e = min(DUR, s + bar_len)
        i0, i1 = int(s * SR), int(e * SR)
        if i1 <= i0:
            continue
        tt = t[i0:i1] - s
        seg = np.zeros(i1 - i0)
        for f in chord_at(s + 0.01):
            for k, amp in ((1, 1.0), (2, 0.35), (3, 0.12)):
                seg += amp * np.sin(2 * math.pi * f * k * tt + 0.3 * np.sin(2 * math.pi * 0.2 * tt))
        # 软起止
        a = np.minimum(1, tt / 0.6) * np.minimum(1, (e - s - tt) / 0.6)
        out[i0:i1] += seg * a
    return out / out.max() * 0.22


def heartbeat():
    out = np.zeros(N)
    # 72 bpm 的双响心跳，只在开头与结尾出现
    hb_gain = env_curve([(0, 1), (8, 1), (14, 0), (88, 0), (92, 1), (104, 1)])
    period = 60 / 72
    k = 0
    while k * period < DUR:
        for off, g in ((0, 1.0), (0.18, 0.6)):
            s = k * period + off
            i0 = int(s * SR)
            L = int(0.18 * SR)
            if i0 + L >= N:
                continue
            tt = np.arange(L) / SR
            out[i0:i0 + L] += g * np.sin(2 * math.pi * 48 * tt) * np.exp(-tt * 22)
        k += 1
    return out * hb_gain * 0.9


def drum_hit(freq, decay, length, noise=0.0, pitch_drop=0.0):
    L = int(length * SR)
    tt = np.arange(L) / SR
    f = freq * np.exp(-tt * pitch_drop) if pitch_drop else freq
    x = np.sin(2 * math.pi * f * tt) * np.exp(-tt * decay)
    if noise:
        rng = np.random.default_rng(int(freq))
        x += noise * rng.standard_normal(L) * np.exp(-tt * decay * 2)
    return x


KICK = drum_hit(120, 18, 0.4, pitch_drop=12)
SNARE = drum_hit(190, 20, 0.3, noise=0.9)
HAT = drum_hit(6000, 60, 0.08, noise=1.0)


def place(out, sample, time, gain):
    i0 = int(time * SR)
    L = min(len(sample), N - i0)
    if L > 0:
        out[i0:i0 + L] += sample[:L] * gain


def drums():
    out = np.zeros(N)
    nbeats = int(DUR / BEAT)
    for b in range(nbeats):
        tm = b * BEAT
        # 各段落的鼓组开关
        kick_on = 22 <= tm < 98 and not (56 <= tm < 58)
        snare_on = 40 <= tm < 98 and not (56 <= tm < 58)
        hat_on = 8 <= tm < 96
        g = energy[int(tm * SR)]
        if kick_on and (b % 4 in (0, 2) or (tm >= 58 and b % 4 == 3 and b % 8 == 7)):
            place(out, KICK, tm, 0.9 * g)
        if snare_on and b % 4 == 2:
            place(out, SNARE, tm, 0.5 * g)
        if hat_on:
            sub = 4 if tm >= 40 else 2
            for s in range(sub):
                place(out, HAT, tm + s * BEAT / sub, (0.18 if s % 2 == 0 else 0.1) * g)
    # 58s 前的 riser：白噪音扫频 + 密集军鼓
    i0, i1 = int(54 * SR), int(58 * SR)
    tt = t[i0:i1] - 54
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(i1 - i0)
    # 简易低通→高通扫频：用一阶滤波模拟
    alpha = np.interp(tt, [0, 4], [0.02, 0.6])
    y = np.zeros_like(noise)
    acc = 0.0
    for i in range(len(noise)):
        acc += alpha[i] * (noise[i] - acc)
        y[i] = acc
    out[i0:i1] += y * np.interp(tt, [0, 4], [0.0, 0.5])
    for k in range(16):
        place(out, SNARE, 56 + k * BEAT / 4, 0.25 + 0.03 * k)
    return out


def bass():
    out = np.zeros(N)
    nbeats = int(DUR / BEAT)
    for b in range(nbeats):
        tm = b * BEAT
        if not (22 <= tm < 96) or (56 <= tm < 58):
            continue
        root = chord_at(tm)[0] / 2
        for s in range(2):
            st = tm + s * BEAT / 2
            L = int(BEAT / 2 * SR * 0.9)
            i0 = int(st * SR)
            if i0 + L >= N:
                break
            tt = np.arange(L) / SR
            x = (np.sign(np.sin(2 * math.pi * root * tt)) * 0.3 + np.sin(2 * math.pi * root * tt) * 0.7)
            x *= np.minimum(1, tt / 0.01) * np.exp(-tt * 4)
            out[i0:i0 + L] += x * (0.35 if s == 0 else 0.22) * energy[i0]
    return out


def arp():
    out = np.zeros(N)
    step = BEAT / 4
    k = 0
    while k * step < DUR:
        tm = k * step
        if 58 <= tm < 90:
            ch = chord_at(tm)
            f = ch[k % 3] * 2
            L = int(step * SR * 0.8)
            i0 = int(tm * SR)
            if i0 + L < N:
                tt = np.arange(L) / SR
                x = np.sin(2 * math.pi * f * tt) * np.exp(-tt * 9)
                out[i0:i0 + L] += x * 0.18 * np.interp(tm, [58, 60, 86, 90], [0.4, 1, 1, 0])
        k += 1
    return out


def main(path):
    mix = pad() * env_curve([(0, 0.8), (22, 1.0), (98, 1.0), (104, 0.0)]) + heartbeat() + drums() + bass() + arp()
    # 淡入淡出 + 限幅
    mix *= np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 3)
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.6) * 0.9
    pcm = (mix * 32767).astype(np.int16)
    stereo = np.column_stack([pcm, pcm]).ravel()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())
    print("wrote", path, f"{DUR:.0f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav")
