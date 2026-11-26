"""CLEAR PASSAGE — measurements on the finished soundtrack (nobody on this job can listen, so we measure).

Run by mix.py after every build; also stand-alone:   python sound/verify.py

Checks (results in sound/out/report.json, picture in sound/out/spectrogram.png):
  format        48 kHz, stereo, 24-bit, exactly duration_s long
  loudness      integrated LUFS (pyloudnorm, cross-checked with ffmpeg ebur128), target -16 +/- 0.5
  true peak     8x oversampled peak and ffmpeg's true-peak meter, limit -1 dBTP
  stems         sfx.wav + music.wav == mix.wav (null test)
  sync A        every event rendered alone exactly as the mixer places it; the anchor is then MEASURED on the
                audio (first audible sample / last audible sample / loudest transient) and compared with t
  sync B        independent of the generator code: steepest energy rise in the finished effects stem near each
                transient event, compared with t. Limit for both: +/- 5 ms.
  edits         at every music cut: no isolated sample step (second difference against its neighbourhood)
  ends          programme starts with signal in the first frame and ends on digital silence
  balance       loudness of each stem per timeline section; spectrum in octave bands (harshness watch)
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sfxlib  # noqa: E402

SR = 48000
SYNC_LIMIT_MS = 5.0


def log(*a):
    print(*a, flush=True)


def db(x):
    return 20.0 * np.log10(np.maximum(np.abs(x), 1e-12))


def ffmpeg_ebur128(path):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    tail = p.stderr[p.stderr.rfind('Summary:'):]
    out = {}
    m = re.search(r'I:\s*(-?[\d.]+) LUFS', tail)
    out['integrated_lufs'] = float(m.group(1)) if m else None
    m = re.search(r'LRA:\s*(-?[\d.]+) LU', tail)
    out['lra_lu'] = float(m.group(1)) if m else None
    m = re.search(r'Peak:\s*(-?[\d.]+) dBFS', tail)
    out['true_peak_dbtp'] = float(m.group(1)) if m else None
    return out


# --------------------------------------------------------------------------------------- sync
def measure_anchor(y, i0, mode):
    """Where, on the programme clock, does this rendered event put its anchor? Measured on the samples."""
    a = np.abs(y).max(axis=1)
    pk = a.max()
    if pk <= 0:
        return None
    if mode == 'end':
        return (i0 + int(np.nonzero(a > 1e-3 * pk)[0][-1]) + 1) / SR
    if mode == 'lead':
        return (i0 + int(np.argmax(a))) / SR
    return (i0 + int(np.nonzero(a > 1e-4 * pk)[0][0])) / SR


def sync_solo(tl):
    import mix as mixer
    rows = []
    overrides = mixer.Overrides(os.path.join(HERE, 'sfx_override'))
    for e in tl['events']:
        if e['gain'] <= 0 or not (0 <= e['t'] <= tl['duration_s']):
            continue
        y, i0, gname, _ = mixer.render_event(e, tl['duration_s'], overrides)
        mode = e.get('anchor') or sfxlib.ANCHOR.get(gname, 'start')
        tm = measure_anchor(y, i0, mode)
        if tm is None:
            continue
        err = (tm - e['t']) * 1000.0
        rows.append(dict(t=e['t'], sfx=e['sfx'], part=e['part'], mode=mode, err_ms=round(err, 3)))
    return rows


def sync_stem(tl, sfx_stem):
    """Onset of each transient event as found in the finished effects stem, without using the generator code:
    the high-passed 0.5 ms energy envelope must climb from the level before the event (loudest value in
    t-25..t-10 ms) at least half-way (in dB) to its peak inside t +/- 10 ms; the first such crossing is the
    onset. Events that do not stand 6 dB clear of what is already sounding are reported as masked."""
    x = sfx_stem.mean(axis=1)
    x = signal.sosfiltfilt(signal.butter(2, 800.0, 'hp', fs=SR, output='sos'), x)
    e = 10.0 * np.log10(np.maximum(uniform_filter1d(x ** 2, size=24, mode='nearest'), 0.0) + 1e-14)
    rows, masked = [], []
    for ev in tl['events']:
        gname, _ = sfxlib.resolve(ev['sfx'])
        if ev['gain'] <= 0 or gname not in sfxlib.TRANSIENT or ev.get('anchor'):
            continue
        c = int(round(ev['t'] * SR))
        a, b = c - int(0.010 * SR), c + int(0.010 * SR)
        p0 = c - int(0.025 * SR)
        if p0 < 0 or b >= len(e):
            continue
        pre = float(e[p0:a].max())
        peak = float(e[a:b].max())
        if peak - pre < 6.0:
            masked.append(dict(t=ev['t'], sfx=ev['sfx'], part=ev['part'], clear_db=round(peak - pre, 1)))
            continue
        thr = pre + max(3.0, 0.5 * (peak - pre))
        k = int(np.argmax(e[a:b] > thr))
        rows.append(dict(t=ev['t'], sfx=ev['sfx'], part=ev['part'], err_ms=round((a + k - c) / SR * 1000.0, 3),
                         clear_db=round(peak - pre, 1)))
    return rows, masked


def drop_onset_ms(music, drop_t):
    """Where the music's entry lands: the first sample within +/- 10 ms of drop_t that exceeds a quarter of
    the peak found in that window (the kick and crash of the full section). 0 = exactly on drop_t."""
    c = int(round(drop_t * SR))
    k = int(0.010 * SR)
    if c - k < 0 or c + k > len(music):
        return None
    a = np.abs(music[c - k:c + k]).max(axis=1)
    if a.max() <= 0:
        return None
    return round((int(np.argmax(a > 0.25 * a.max())) - k) / SR * 1000.0, 2)


# --------------------------------------------------------------------------------------- edits
def click_ratio(x, t, pre=0.012, post=0.002):
    """Largest second difference around an edit point relative to the 99.9th percentile of its neighbourhood.
    A bad splice shows up as an isolated spike (ratio well above 1); musical transients do not."""
    d2 = np.abs(np.diff(x, n=2, axis=0)).max(axis=1)
    c = int(round(t * SR))
    a, b = max(0, c - int(pre * SR)), min(len(d2), c + int(post * SR))
    na, nb = max(0, c - int(0.2 * SR)), min(len(d2), c + int(0.2 * SR))
    if b <= a or nb - na < 100:
        return 0.0
    ref = np.percentile(d2[na:nb], 99.9) + 1e-9
    return float(d2[a:b].max() / ref)


def isolated_spikes(x):
    """Count single-sample outliers anywhere in the programme (a click would be one)."""
    d2 = np.abs(np.diff(x, n=2, axis=0)).max(axis=1)
    loc = uniform_filter1d(d2, size=int(0.004 * SR), mode='nearest') + 1e-7
    z = d2 / loc
    return int(np.sum((z > 40.0) & (d2 > 0.02)))


# --------------------------------------------------------------------------------------- picture
def spectrogram_png(x, path, marks=(), width=1800, height=600, fmin=30.0, fmax=20000.0, dyn=80.0, tick=2.0):
    from PIL import Image, ImageDraw
    m = x.mean(axis=1)
    n = 4096
    hop = max(1, len(m) // width)
    f, t, S = signal.stft(m, SR, nperseg=n, noverlap=max(0, n - hop), padded=False, boundary=None)
    P = 20.0 * np.log10(np.abs(S) + 1e-9)
    fr = np.geomspace(fmin, fmax, height + 1)
    idx = np.clip(np.searchsorted(f, fr), 0, len(f) - 1)
    img = np.zeros((height, P.shape[1]))
    for i in range(height):
        lo = idx[i]
        hi = max(idx[i + 1], lo + 1)
        img[i] = P[lo:hi].max(axis=0)
    img = np.clip((img - (img.max() - dyn)) / dyn, 0, 1)[::-1]
    r = np.clip(img * 2.2, 0, 1)
    g = np.clip(img * 2.2 - 0.8, 0, 1)
    b = np.clip(np.where(img < 0.4, img * 1.6, 1.4 - img * 1.6) + np.clip(img * 3 - 2.3, 0, 1), 0, 1)
    im = Image.fromarray((np.dstack([r, g, b]) * 255).astype(np.uint8)).resize((width, height))
    canvas = Image.new('RGB', (width + 60, height + 44), (0, 0, 0))
    canvas.paste(im, (60, 14))
    dr = ImageDraw.Draw(canvas)
    dur = len(m) / SR
    tt = 0.0
    while tt <= dur + 1e-6:
        xx = 60 + int(tt / dur * width)
        dr.line([(xx, 14), (xx, height + 14)], fill=(60, 60, 60))
        dr.text((xx - 6, height + 20), f'{tt:g}', fill=(255, 255, 255))
        tt += tick
    for fq in (50, 100, 200, 500, 1000, 2000, 5000, 10000, 16000):
        yy = 14 + height - 1 - int(np.log(fq / fmin) / np.log(fmax / fmin) * height)
        dr.text((2, yy - 5), f'{fq}', fill=(255, 255, 255))
        dr.line([(55, yy), (60, yy)], fill=(255, 255, 255))
    for mt, col, full in marks:
        xx = 60 + int(mt / dur * width)
        dr.line([(xx, 0), (xx, 13 if not full else height + 14)], fill=col)
    canvas.save(path)


# --------------------------------------------------------------------------------------- run
def run(tl, out_dir, info=None):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    rep = {}
    paths = {k: os.path.join(out_dir, f'{k}.wav') for k in ('mix', 'sfx', 'music')}
    fi = sf.info(paths['mix'])
    mix, _ = sf.read(paths['mix'], dtype='float64', always_2d=True)
    sfx, _ = sf.read(paths['sfx'], dtype='float64', always_2d=True)
    music, _ = sf.read(paths['music'], dtype='float64', always_2d=True)
    n_expected = int(round(tl['duration_s'] * SR))
    rep['format'] = dict(samplerate=fi.samplerate, channels=fi.channels, subtype=fi.subtype, frames=fi.frames,
                         seconds=fi.frames / fi.samplerate, expected_frames=n_expected)
    ok_format = fi.samplerate == SR and fi.channels == 2 and fi.subtype == 'PCM_24' and fi.frames == n_expected

    lufs = float(meter.integrated_loudness(mix))
    up = signal.resample_poly(mix, 8, 1, axis=0)
    tp = float(db(np.max(np.abs(up))))
    ff = ffmpeg_ebur128(paths['mix'])
    rep['loudness'] = dict(integrated_lufs_pyloudnorm=round(lufs, 2), ffmpeg_ebur128=ff, target=-16.0)
    rep['true_peak'] = dict(dbtp_8x=round(tp, 2), sample_peak_dbfs=round(float(db(np.max(np.abs(mix)))), 2), limit=-1.0,
                            samples_at_full_scale=int(np.sum(np.abs(mix) >= 0.9999)))
    ok_loud = abs(lufs + 16.0) <= 0.5 and (ff['integrated_lufs'] is None or abs(ff['integrated_lufs'] + 16.0) <= 0.5)
    ok_peak = tp <= -1.0 and (ff['true_peak_dbtp'] is None or ff['true_peak_dbtp'] <= -1.0)

    resid = mix - (sfx + music)
    rep['stems'] = dict(null_test_residual_db=round(float(db(np.sqrt(np.mean(resid ** 2)))), 1),
                        sfx_lufs=round(float(meter.integrated_loudness(sfx)), 2),
                        music_lufs=round(float(meter.integrated_loudness(music)), 2),
                        dc_offset=[float(v) for v in np.round(mix.mean(axis=0), 6)])

    # ---- sync
    solo = sync_solo(tl)
    stem, masked = sync_stem(tl, sfx)
    worst_solo = max((abs(r['err_ms']) for r in solo), default=0.0)
    worst_stem = max((abs(r['err_ms']) for r in stem), default=0.0)
    rep['sync'] = dict(limit_ms=SYNC_LIMIT_MS,
                       solo=dict(events=len(solo), worst_abs_ms=round(worst_solo, 3),
                                 over_limit=[r for r in solo if abs(r['err_ms']) > SYNC_LIMIT_MS]),
                       stem=dict(events=len(stem), worst_abs_ms=round(worst_stem, 3),
                                 mean_ms=round(float(np.mean([r['err_ms'] for r in stem])) if stem else 0.0, 3),
                                 over_limit=[r for r in stem if abs(r['err_ms']) > SYNC_LIMIT_MS],
                                 masked_not_measurable=masked),
                       per_event_solo=solo, per_event_stem=stem)
    ok_sync = worst_solo <= SYNC_LIMIT_MS and worst_stem <= SYNC_LIMIT_MS

    # ---- edits
    cuts = list((info or {}).get('music', {}).get('cuts', []))
    points = [dict(t=c, what='music cut') for c in cuts]
    points.append(dict(t=tl['drop_t'], what='drop'))
    if tl.get('final_t') is not None:
        points.append(dict(t=tl['final_t'], what='final hit'))
    seen = set()
    edits = []
    for p in points:
        key = round(p['t'], 4)
        if key in seen or not (0 < p['t'] < tl['duration_s']):
            continue
        seen.add(key)
        edits.append(dict(t=p['t'], what=p['what'], music_click_ratio=round(click_ratio(music, p['t']), 2),
                          mix_click_ratio=round(click_ratio(mix, p['t']), 2)))
    rep['edits'] = dict(points=edits, music_entry_at_drop_ms=drop_onset_ms(music, tl['drop_t']), isolated_spikes_mix=isolated_spikes(mix), isolated_spikes_music=isolated_spikes(music),
                        note='ratio = largest second difference in the 14 ms around the point / 99.9th percentile of the surrounding 400 ms; a splice click would stand far above 1')
    ok_edits = all(e['music_click_ratio'] < 4.0 for e in edits) and rep['edits']['isolated_spikes_music'] == 0

    # ---- ends
    f0 = int(SR / tl['fps'])
    rep['ends'] = dict(first_frame_rms_db=round(float(db(np.sqrt(np.mean(mix[:f0] ** 2)))), 1),
                       first_frame_music_rms_db=round(float(db(np.sqrt(np.mean(music[:f0] ** 2)))), 1),
                       first_100ms_rms_db=round(float(db(np.sqrt(np.mean(mix[:SR // 10] ** 2)))), 1),
                       first_sample_abs=float(np.abs(mix[0]).max()),
                       last_sample_abs=float(np.abs(mix[-1]).max()),
                       last_100ms_rms_db=round(float(db(np.sqrt(np.mean(mix[-SR // 10:] ** 2)))), 1),
                       last_500ms_rms_db=round(float(db(np.sqrt(np.mean(mix[-SR // 2:] ** 2)))), 1))
    ok_ends = rep['ends']['first_frame_music_rms_db'] > -50.0 and rep['ends']['last_sample_abs'] < 1e-4 \
        and rep['ends']['last_100ms_rms_db'] < -40.0 and bool(np.isfinite(mix).all())

    # ---- balance per section
    secs = []
    for s in tl['sections']:
        a, b = int(s['t0'] * SR), int(min(s['t1'], tl['duration_s']) * SR)
        if b - a < int(0.5 * SR):
            continue

        def L(x):
            v = meter.integrated_loudness(x[a:b])
            return round(float(v), 1) if np.isfinite(v) else None
        secs.append(dict(name=s['name'], t0=s['t0'], t1=s['t1'], busy=s['busy'], mix_lufs=L(mix), sfx_lufs=L(sfx), music_lufs=L(music)))
    rep['sections'] = secs
    f, P = signal.welch(mix.mean(axis=1), SR, nperseg=8192)
    tot = P.sum()
    bands = {}
    for fc in (63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000):
        sel = (f >= fc / np.sqrt(2)) & (f < fc * np.sqrt(2))
        bands[str(fc)] = round(float(10 * np.log10(P[sel].sum() / tot + 1e-12)), 1)
    rep['spectrum_octave_db_re_total'] = bands
    rep['energy_above_8k_db'] = round(float(10 * np.log10(P[f >= 8000].sum() / tot + 1e-12)), 1)
    rep['stereo'] = dict(side_minus_mid_db=round(float(db(np.sqrt(np.mean((mix[:, 0] - mix[:, 1]) ** 2))) - db(np.sqrt(np.mean((mix[:, 0] + mix[:, 1]) ** 2)))), 1),
                         correlation=round(float(np.corrcoef(mix[:, 0], mix[:, 1])[0, 1]), 3))
    if info:
        rep['build'] = info

    # ---- picture
    marks = [(e['t'], (0, 255, 0), False) for e in tl['events'] if e['gain'] > 0]
    marks += [(c, (0, 200, 255), False) for c in cuts]
    marks += [(tl['drop_t'], (255, 255, 255), False)]
    try:
        spectrogram_png(mix, os.path.join(out_dir, 'spectrogram.png'), marks)
    except Exception as ex:                              # the picture is a convenience, never a reason to fail
        log('[verify] spectrogram not written:', repr(ex))

    rep['pass'] = dict(format=ok_format, loudness=ok_loud, true_peak=ok_peak, sync=ok_sync, edits=ok_edits, ends=ok_ends)
    ok = all(rep['pass'].values())
    json.dump(rep, open(os.path.join(out_dir, 'report.json'), 'w'), indent=1, default=float)

    log(f"[verify] format    {fi.samplerate} Hz, {fi.channels} ch, {fi.subtype}, {fi.frames} frames = {fi.frames / fi.samplerate:.4f} s "
        f"(expected {n_expected})  {'ok' if ok_format else 'FAIL'}")
    log(f"[verify] loudness  {lufs:.2f} LUFS (pyloudnorm), {ff['integrated_lufs']} LUFS (ffmpeg ebur128), LRA {ff['lra_lu']} LU  {'ok' if ok_loud else 'FAIL'}")
    log(f"[verify] true peak {tp:.2f} dBTP (8x), {ff['true_peak_dbtp']} dBTP (ffmpeg), sample peak {rep['true_peak']['sample_peak_dbfs']} dBFS  {'ok' if ok_peak else 'FAIL'}")
    log(f"[verify] stems     sfx + music - mix = {rep['stems']['null_test_residual_db']} dB;  sfx {rep['stems']['sfx_lufs']} LUFS, music {rep['stems']['music_lufs']} LUFS")
    log(f"[verify] sync A    {len(solo)} events rendered alone: worst |error| {worst_solo:.3f} ms")
    log(f"[verify] sync B    {len(stem)} transients found in the effects stem ({len(masked)} masked by other effects): worst |error| {worst_stem:.3f} ms, mean {rep['sync']['stem']['mean_ms']} ms  "
        f"{'ok' if ok_sync else 'FAIL'} (limit {SYNC_LIMIT_MS} ms)")
    for e in edits:
        log(f"[verify] edit      {e['t']:7.3f} s {e['what']:10s} click ratio music {e['music_click_ratio']:.2f}, mix {e['mix_click_ratio']:.2f}")
    log(f"[verify] drop      the music's full entry lands {rep['edits']['music_entry_at_drop_ms']} ms from drop_t ({tl['drop_t']} s)")
    log(f"[verify] spikes    isolated single-sample spikes: mix {rep['edits']['isolated_spikes_mix']}, music {rep['edits']['isolated_spikes_music']}  {'ok' if ok_edits else 'FAIL'}")
    log(f"[verify] ends      first frame {rep['ends']['first_frame_rms_db']} dB RMS (music {rep['ends']['first_frame_music_rms_db']}), "
        f"last 500 ms {rep['ends']['last_500ms_rms_db']} dB, last sample {rep['ends']['last_sample_abs']:.1e}  {'ok' if ok_ends else 'FAIL'}")
    if rep['ends']['last_100ms_rms_db'] >= -40.0:
        log(f"[verify]           something is still sounding in the last 100 ms ({rep['ends']['last_100ms_rms_db']} dB RMS): an event too close to the end?")
    log('[verify] section            busy   mix    sfx  music  (LUFS)')
    for s in secs:
        log(f"[verify]   {s['name']:16s} {s['busy']:4.1f} {str(s['mix_lufs']):>6s} {str(s['sfx_lufs']):>6s} {str(s['music_lufs']):>6s}")
    log('[verify] octave bands dB re total: ' + '  '.join(f'{k}:{v}' for k, v in bands.items()) + f"   (>8 kHz {rep['energy_above_8k_db']} dB)")
    log(f"[verify] {'ALL CHECKS PASSED' if ok else 'SOME CHECKS FAILED'}  -> {os.path.join(out_dir, 'report.json')}")
    return ok


if __name__ == '__main__':
    import mix as mixer
    tl_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'shared', 'timeline.json')
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'out')
    info = None
    try:
        info = json.load(open(os.path.join(out, 'report.json'))).get('build')
    except Exception:
        pass
    sys.exit(0 if run(mixer.load_timeline(tl_path), out, info) else 2)
