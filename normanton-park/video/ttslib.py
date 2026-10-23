import sherpa_onnx, wave, numpy as np, os
D = os.environ.get("KOKORO_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ttsmodels/kokoro-multi-lang-v1_1"))
_tts = None
def get_tts():
    global _tts
    if _tts is None:
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=f"{D}/model.onnx", voices=f"{D}/voices.bin", tokens=f"{D}/tokens.txt",
                    data_dir=f"{D}/espeak-ng-data", dict_dir=f"{D}/dict",
                    lexicon=f"{os.path.dirname(os.path.abspath(__file__))}/custom-lexicon.txt,{D}/lexicon-us-en.txt,{D}/lexicon-zh.txt"),
                provider="cpu", num_threads=4, debug=False),
            rule_fsts=f"{D}/phone-zh.fst,{D}/date-zh.fst,{D}/number-zh.fst", max_num_sentences=1)
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts
def synth(text, sid, speed=1.0):
    a = get_tts().generate(text, sid=sid, speed=speed)
    return np.array(a.samples, dtype=np.float32), a.sample_rate
def save_wav(path, samples, sr):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
def pitch_hz(samples, sr):
    # crude median f0 via autocorrelation on voiced 40ms frames
    f0s = []
    n = int(0.04 * sr)
    for i in range(0, len(samples) - n, n):
        fr = samples[i:i+n]
        if np.sqrt((fr**2).mean()) < 0.03: continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, 'full')[n-1:]
        lo, hi = int(sr/400), int(sr/70)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.4 * ac[0]: f0s.append(sr / k)
    return float(np.median(f0s)) if f0s else 0.0
