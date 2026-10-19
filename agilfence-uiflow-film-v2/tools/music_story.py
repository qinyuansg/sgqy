"""Cut C (story) score: the section map for CUT=story on tools/music.py's instruments (80 BPM, a bar every 3 s from 0).

Each chapter card is a two-beat pickup (a short riser) and every chapter starts on a downbeat:
  cold open            the downbeat on the first frame (kick, low D, a fast Dm9 swell) under the fence bay and a low
                       drone through card 1
  1 Feels a climb      Dm9 · Bbmaj7, a held bass; a sparse arpeggio from 0.3 s, as the climb registers on the fibre
  2 Pinpoints          Gm9 · Asus, the arpeggio and a slow pulse
  3 Shows who is there the quiet console, then the lift as the alarm view opens itself (pulse, held bass)
  4 Coordinates        Dm9 · Fmaj7 · Gm9 · Asus, walking bass, arpeggio, light hats: steady and confident, still minor,
                       a touch fuller than the chapters around it so the middle of the film does not sag
  5 Closes             Bbmaj7 · Fmaj7, then IV - V - I into D major on the sign-off's success cue, ringing under the end card
Called by tools/music.py as score(M, total, scenes, cues) with M = the music module.
"""
import numpy as np

BPM = 80.0
BEAT = 60.0 / BPM


def score(M, total, S, cues):
    SR, add, pad, bass, bell, riser, CH, mtof = M.SR, M.add, M.pad, M.bass, M.bell, M.riser, M.CH, M.mtof
    buf = np.zeros((int((total + 3) * SR), 2))
    s = lambda k: S[k]["start"]
    e = lambda k: S[k]["end"]
    first = lambda typ, after, dflt: next((c["t"] for c in cues if c["type"] == typ and c["t"] > after), dflt)
    sec = lambda t0, t1, prog, bars=2, **kw: M.section(buf, t0, t1, prog, bars, beat=BEAT, **kw)

    # cold open: the downbeat lands on the first frame (the fence bay), a drone under it through card 1
    c1 = s("fence")
    add(buf, c1, M.kick(), 0.32)
    add(buf, c1, bass(26, 2.6, "hold"), 0.16)
    add(buf, c1, pad(CH["Dm9"], 2.6, fc=900, att=0.08, rel=2.0), 0.3)
    n = int((s("trace") + 1.0) * SR)
    drone = (M.sine(mtof(26), n) + 0.4 * M.sine(mtof(38), n)) * M.env_adsr(n, 0.15, 0.1, 1.0, 1.2)
    add(buf, c1, drone, 0.13)
    # each chapter card: a two-beat riser into the chapter's downbeat
    for k in ("card1", "card2", "card3", "card4", "card5"):
        add(buf, s(k), riser(e(k) - s(k), 180, 2600), 0.1)
    # 1 Feels a climb
    sec(c1, s("map"), ["Dm9", "Bbmaj7"], 2, pad_fc=1300, pad_g=0.4, bass_mode="hold", bass_g=0.14,
        arp_g=0.06, arp_from=c1 + 0.3, kick_mode="one", kick_g=0.14, drums_from=c1 + 3.0)
    # 2 Pinpoints the segment
    sec(s("map"), s("alarm"), ["Gm9", "Asus"], 1, pad_fc=1600, pad_g=0.36, bass_mode="halves", bass_g=0.15,
        arp_g=0.08, kick_mode="one", kick_g=0.17)
    # 3 Shows who is there: the quiet console, then the lift as the alarm view opens itself
    al = first("alert", s("alarm"), s("alarm") + 1.4)
    sec(s("alarm"), s("respond"), ["Dm9", "Bbmaj7"], 2, pad_fc=1600, pad_g=0.34, bass_mode="hold", bass_g=0.15,
        arp_g=0.07, arp_from=s("verify"), kick_mode="one", kick_g=0.2, drums_from=al + 0.6)
    # 4 Coordinates the response
    sec(s("respond"), s("closure"), ["Dm9", "Fmaj7", "Gm9", "Asus"], 1, pad_fc=2300, pad_g=0.42, bass_mode="quarters",
        bass_g=0.18, arp_g=0.105, kick_mode="half", kick_g=0.22, hat_mode="off", hat_g=0.04)
    # 5 Closes with evidence: the checklist lighter, then IV - V - I into D major on the success cue
    o0 = s("signoff")
    sec(s("closure"), o0, ["Bbmaj7", "Fmaj7"], 1, pad_fc=2200, pad_g=0.36, bass_mode="halves", bass_g=0.15,
        arp_g=0.07, kick_mode="one", kick_g=0.16)
    tres = first("success", o0, e("signoff"))
    h = (tres - o0) / 2
    add(buf, o0, pad(CH["Gmaj7"], h + 0.3, fc=2000), 0.4)
    add(buf, o0 + h, pad(CH["A"], h + 0.3, fc=2200), 0.4)
    add(buf, o0, bass(31, h, "hold"), 0.14)
    add(buf, o0 + h, bass(33, h, "hold"), 0.14)
    add(buf, tres, pad(CH["Dadd9"], total - tres, fc=2600, att=0.8, rel=2.5), 0.48)
    add(buf, tres, bass(26, total - tres, "hold"), 0.17)
    for i, m in enumerate([74, 78, 81, 86]):
        add(buf, tres + i * 0.09, bell(mtof(m), 3.2), 0.1, pan=(-0.4 + i * 0.27))
    nfade = int(2.4 * SR); iend = int(total * SR)
    buf[iend - nfade:iend] *= np.linspace(1, 0, nfade)[:, None] ** 1.3
    buf[iend:] = 0
    return buf
