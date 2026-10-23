"""Mix narration with a soft generated ambient pad -> audio/mix.m4a (AAC)."""
import numpy as np, wave, subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
def read_wav(p):
    with wave.open(p) as w:
        sr = w.getframerate(); n = w.getnframes(); d = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32767
    return d, sr
nar, sr = read_wav(os.path.join(HERE, 'audio', 'narration.wav'))
N = len(nar); t = np.arange(N) / sr
# chord progression (Hz), 8 s per chord, gentle crossfade
chords = [[220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [130.81, 196.0, 246.94, 329.63], [196.0, 246.94, 293.66, 392.0]]
seg = 8.0; pad = np.zeros(N, dtype=np.float32)
nseg = int(np.ceil(N / sr / seg))
for i in range(nseg):
    s0 = int(i * seg * sr); s1 = min(N, int((i + 1) * seg * sr + sr))  # 1 s overlap
    tt = np.arange(s1 - s0) / sr
    env = np.minimum(1, tt / 1.0) * np.minimum(1, (s1 - s0 - np.arange(s1 - s0)) / sr / 1.0)
    ch = chords[i % len(chords)]
    v = np.zeros(s1 - s0, dtype=np.float32)
    for f in ch:
        v += 0.5 * np.sin(2 * np.pi * f * tt) + 0.15 * np.sin(2 * np.pi * 2 * f * tt + 0.3) + 0.08 * np.sin(2 * np.pi * 0.5 * f * tt)
    v *= env * (1 + 0.08 * np.sin(2 * np.pi * 0.11 * tt))
    pad[s0:s1] += v
pad /= np.abs(pad).max() + 1e-9
# soften highs with a short moving-average low-pass
win = 48; pad = np.convolve(pad, np.ones(win) / win, mode='same').astype(np.float32)
fade = np.minimum(1, t / 3.0) * np.minimum(1, (N - np.arange(N)) / sr / 4.0)
pad *= fade
# ducking: lower pad slightly while narration is active
act = np.convolve(np.abs(nar), np.ones(int(0.3 * sr)) / int(0.3 * sr), mode='same') > 0.01
duck = np.where(act, 0.55, 1.0).astype(np.float32)
duck = np.convolve(duck, np.ones(int(0.4 * sr)) / int(0.4 * sr), mode='same')
pad_gain = 10 ** (-26 / 20)
mix = nar * 0.95 + pad * pad_gain * duck
mix = np.clip(mix, -1, 1)
tmp = os.path.join(HERE, 'audio', 'mix.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '160k', os.path.join(HERE, 'audio', 'mix.m4a')])
print('mix ok', N / sr, 's')
