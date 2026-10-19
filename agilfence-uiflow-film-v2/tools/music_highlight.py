"""Cut B · Highlight score (CUT=highlight): music-led, 120 BPM; every section starts on a beat of the 0.5 s lattice.

Section map (the picture cuts on the timeline's windows, read from S):
  0–1.0       black: a riser into the first downbeat (the product line)
  1.0–fence   product line, quiet console: dark D-minor pad, a soft arpeggio, no drums
  fence–alarm the fence feels the climb: a low hit, the pad carries on, a riser into the alarm
  alarm–lanes the alarm view opens itself (impact on the downbeat), hero push, verification, Confirm intrusion:
              minor progression one chord a bar, held bass then halves, kick on 1 and 3
  lanes–closure  lanes, Dispatch, tower decision and hand-over, on scene: the full groove (bass quarters, kick,
              offbeat hats, a light clap on 2 and 4, a brighter arpeggio)
  closure–closed evidence checklist: the lift (Bbmaj7 → Asus) and a riser into the close
  closed–end  signed and closed: D major on the downbeat, bells
  end–        end card: Dadd9 rings out, fade
Called by tools/music.py as score(M, total, scenes, cues) with M = the music module (shared instruments).
"""
import numpy as np


def score(M, total, S, cues):
    SR, add, pad, bass, bell, mtof, CH = M.SR, M.add, M.pad, M.bass, M.bell, M.mtof, M.CH
    BEAT = 60.0 / 120.0
    BAR = 4 * BEAT
    sec = lambda *a, **k: M.section(*a, beat=BEAT, **k)
    s = lambda k: S[k]["start"]
    buf = np.zeros((int((total + 3) * SR), 2))
    t1 = 1.0                                   # the first downbeat (the product line)
    a0, ln, cl, cd, en = s("alarm"), s("lanes"), s("closure"), s("closed"), s("end")
    fn = s("fence")

    # black: a riser and a low swell into the first downbeat
    add(buf, 0.2, M.riser(t1 - 0.2, 120, 1800), 0.08)
    # intro: product line and the quiet console
    sec(buf, t1, a0, ["Dm9", "Bbmaj7", "Gm9"], 1, pad_fc=900, pad_g=0.42, bass_mode="hold", bass_g=0.1,
        arp_g=0.05, arp_from=t1 + BAR)
    # the fence feels the climb: a low hit under the strained sensors
    add(buf, fn, M.kick(1.0), 0.3)
    add(buf, a0 - BAR / 2, M.riser(BAR / 2, 200, 3200), 0.12)
    # the alarm: impact on the downbeat, the pulse starts
    add(buf, a0, M.kick(1.0), 0.5)
    sec(buf, a0, a0 + 2 * BAR, ["Dm9", "Bbmaj7"], 1, pad_fc=1500, pad_g=0.36, bass_mode="hold", bass_g=0.16,
        arp_g=0.06, kick_mode="one", kick_g=0.26)
    sec(buf, a0 + 2 * BAR, ln, ["Gm9", "Asus", "Dm9", "Bbmaj7"], 1, pad_fc=1700, pad_g=0.36, bass_mode="halves",
        bass_g=0.18, arp_g=0.08, kick_mode="half", kick_g=0.26, hat_mode="off", hat_g=0.035)
    # the response: the full groove
    sec(buf, ln, cl, ["Dm9", "Fmaj7", "Gm9", "Asus"], 1, pad_fc=2100, pad_g=0.36, bass_mode="quarters",
        bass_g=0.18, arp_g=0.1, kick_mode="half", kick_g=0.3, hat_mode="off", hat_g=0.05)
    for j in range(int((cl - ln) / BEAT + 1e-6)):
        if j % 2 == 1:
            add(buf, ln + j * BEAT, M.clap(), 0.07, pan=0.1)
    # evidence: the lift, a riser into the close
    sec(buf, cl, cd, ["Bbmaj7", "Asus"], 1, pad_fc=2300, pad_g=0.38, bass_mode="halves", bass_g=0.17,
        arp_g=0.09, kick_mode="half", kick_g=0.24, hat_mode="off", hat_g=0.04)
    add(buf, cd - BAR / 2, M.riser(BAR / 2, 250, 3800), 0.13)
    # signed and closed: D major on the downbeat, bells; a lighter pulse
    add(buf, cd, M.kick(1.0), 0.42)
    sec(buf, cd, en, ["D", "Gmaj7"], 1, pad_fc=2600, pad_g=0.42, bass_mode="halves", bass_g=0.16,
        arp_g=0.08, kick_mode="one", kick_g=0.2, hat_mode="off", hat_g=0.03)
    for i, m in enumerate([74, 78, 81, 86]):
        add(buf, cd + i * 0.09, bell(mtof(m), 3.2), 0.1, pan=(-0.4 + i * 0.27))
    # end card: Dadd9 rings out under the three lines
    ring = total - en
    add(buf, en, pad(CH["Dadd9"], ring, fc=2600, att=0.5, rel=2.5), 0.5)
    add(buf, en, bass(26, ring, "hold"), 0.17)
    for i, m in enumerate([74, 78, 81, 86]):
        add(buf, en + i * 0.09, bell(mtof(m), 3.6), 0.09, pan=(-0.4 + i * 0.27))
    nfade = int(3.0 * SR); iend = int(total * SR)
    buf[iend - nfade:iend] *= np.linspace(1, 0, nfade)[:, None] ** 1.3
    buf[iend:] = 0
    return buf
