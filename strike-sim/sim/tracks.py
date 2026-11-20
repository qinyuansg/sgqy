"""Trajectory reconstruction.

Bundles are traced from the source infographic (pixel coordinates of the
1280x925 image, converted through the Mercator georeference in geo.py) and
expanded into individual flight tracks with per-track jitter, timing, speed
and an outcome (hit / intercepted / exits).

Story time S is in minutes after 18:00 on 19 Nov 2026 (Kyiv time).
Timing is illustrative: the source map shows routes, not times.
"""
import os, pickle
import numpy as np
from geo import pix2world, pix2lonlat, project

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(2026)

KINDS = {
    #            label                         colour (linear RGB)    km/min   visual alt km
    'drone':  ('Attack drones (Geran/Shahed-type)', (1.00, 0.22, 0.85), 2.9, 1.2),
    'x101':   ('Kh-101 cruise missiles',            (1.00, 0.09, 0.07), 12.0, 0.9),
    'kalibr': ('Kalibr cruise missiles',            (0.18, 1.00, 0.48), 13.0, 0.9),
    'kh59':   ('Kh-59/69 guided missiles',          (0.72, 0.38, 1.00), 13.5, 0.9),
    'iskk':   ('Iskander-K cruise missiles',        (1.00, 0.52, 0.42), 14.0, 0.9),
    'iskm':   ('Iskander-M ballistic missiles',     (1.00, 0.55, 0.10), 95.0, 0.0),
}

SITES = {  # launch areas labelled on the source map (pixel coords)
    'Tsymbulova drone port': (898, 30), 'Navlya': (851, 68), 'Asovytsia': (840, 104),
    'Khalino airfield': (937, 186), 'Millerovo airfield': (1195, 446), 'Donetsk airport': (1036, 527),
    'Primorsko-Akhtarsk airfield': (1070, 700), 'Hvardiiske': (806, 788), 'Cape Chauda range': (923, 794),
    'Novorossiysk': (1038, 817),
}

# Impact sites (pixel coords on the source)
HIT = {
    'Lviv': (206, 360), 'Volodymyr': (207, 284), 'Rivne': (341, 296), 'Korosten': (474, 262),
    'Kyiv': (603, 313), 'Kyiv-E': (622, 333), 'Bila Tserkva': (575, 371), 'Khmelnytskyi': (387, 405),
    'Burshtyn': (240, 418), 'Stryi': (193, 423), 'Ivano-Frankivsk': (246, 448),
    'Kamianets-Podilskyi': (357, 472), 'Chernivtsi': (320, 503), 'Kremenchuk': (774, 437),
    'Dnipro': (868, 492), 'Zaporizhzhia': (882, 550), 'Bashtanka': (737, 601),
}

# ------------------------------------------------------------------ bundles
# n: tracks; hits: list of (target, arrive window S) -- the first len(hits) tracks hit;
# launch: launch window S for the others; spread: lateral km; loops: loiter probability
P = dict
BUNDLES = [
    # ---------------- drones from Bryansk / Kursk regions
    P(kind='drone', site='Tsymbulova drone port', n=11, spread=4.0, launch=(15, 330), loops=0.15,
      hits=[('Lviv', (665, 675)), ('Lviv', (685, 695))],
      pts=[(898, 30), (865, 46), (820, 70), (775, 84), (740, 96), (712, 116), (690, 142), (662, 163), (632, 178),
           (614, 196), (608, 216), (598, 232), (565, 236), (530, 240), (500, 250), (470, 258), (432, 257),
           (395, 258), (365, 263), (340, 274), (318, 294), (296, 316), (272, 336), (247, 352), (222, 362), (206, 360)]),
    P(kind='drone', site='Navlya', n=10, spread=4.5, launch=(25, 300), loops=0.2, hits=[],
      pts=[(851, 68), (820, 74), (775, 86), (738, 98), (712, 118), (690, 144), (662, 164), (632, 180),
           (614, 198), (608, 220), (590, 240), (555, 255), (520, 268), (500, 282), (470, 300), (432, 315),
           (390, 332), (348, 348), (307, 361), (265, 369), (225, 368)]),
    P(kind='drone', site='Tsymbulova drone port', n=4, spread=3.0, launch=(40, 200), loops=0.0,
      hits=[('Korosten', (492, 506))],
      pts=[(898, 30), (865, 46), (820, 70), (775, 84), (740, 96), (712, 116), (690, 142), (662, 163),
           (632, 178), (614, 196), (608, 216), (585, 233), (550, 238), (515, 242), (492, 247), (478, 255), (474, 262)]),
    P(kind='drone', site='Navlya', n=5, spread=6.0, launch=(60, 330), loops=0.6, hits=[],
      pts=[(851, 68), (820, 74), (775, 86), (738, 98), (712, 118), (690, 144), (662, 164), (632, 180),
           (614, 198), (612, 228), (606, 255), (598, 280), (590, 300), (575, 322), (560, 345)]),
    P(kind='drone', site='Asovytsia', n=6, spread=4.0, launch=(30, 260), loops=0.3, hits=[],
      pts=[(840, 104), (800, 103), (762, 112), (728, 132), (700, 160), (672, 186), (642, 204), (612, 220),
           (575, 232), (535, 228), (495, 234), (455, 240), (415, 246), (380, 252)]),
    P(kind='drone', site='Asovytsia', n=6, spread=5.0, launch=(50, 280), loops=0.6, hits=[],
      pts=[(840, 104), (795, 108), (755, 124), (725, 158), (708, 198), (702, 238), (694, 268), (676, 292),
           (652, 308), (628, 318), (600, 330), (570, 345)]),
    # ---------------- drones from Millerovo airfield: the long western stream
    P(kind='drone', site='Millerovo airfield', n=22, spread=5.0, launch=(40, 330), loops=0.12,
      hits=[('Burshtyn', (655, 662))],
      pts=[(1190, 447), (1150, 448), (1100, 447), (1050, 446), (1000, 443), (950, 440), (900, 434), (855, 430),
           (800, 428), (755, 435), (713, 442), (672, 451), (630, 459), (588, 465), (547, 465), (505, 459),
           (463, 451), (422, 445), (380, 440), (345, 432), (305, 426), (268, 422), (240, 418)]),
    P(kind='drone', site='Millerovo airfield', n=4, spread=3.0, launch=(60, 200), loops=0.0,
      hits=[('Kremenchuk', (428, 440)), ('Kremenchuk', (446, 458))],
      pts=[(1190, 447), (1150, 448), (1100, 447), (1050, 446), (1000, 443), (950, 440), (900, 434), (855, 430),
           (815, 428), (790, 432), (774, 437)]),
    P(kind='drone', site='Millerovo airfield', n=4, spread=5.0, launch=(80, 260), loops=0.7, hits=[],
      pts=[(1190, 447), (1100, 447), (1000, 443), (930, 438), (880, 433), (845, 440), (815, 458), (790, 480),
           (765, 500), (742, 516)]),
    # ---------------- drones from Donetsk airport
    P(kind='drone', site='Donetsk airport', n=9, spread=4.0, launch=(60, 280), loops=0.35, hits=[],
      pts=[(1034, 529), (990, 535), (940, 541), (890, 546), (850, 548), (810, 547), (782, 544), (752, 534),
           (726, 520), (700, 506), (670, 492), (640, 482), (610, 470)]),
    P(kind='drone', site='Donetsk airport', n=7, spread=4.0, launch=(70, 240), loops=0.2,
      hits=[('Zaporizhzhia', (338, 352)), ('Zaporizhzhia', (366, 384))],
      pts=[(1034, 529), (1010, 548), (980, 568), (950, 585), (920, 596), (892, 598), (872, 588), (874, 568), (882, 550)]),
    P(kind='drone', site='Donetsk airport', n=5, spread=3.5, launch=(60, 200), loops=0.0,
      hits=[('Dnipro', (296, 312)), ('Dnipro', (322, 336))],
      pts=[(1034, 529), (992, 531), (952, 528), (920, 518), (894, 505), (868, 492)]),
    P(kind='drone', site='Donetsk airport', n=4, spread=5.0, launch=(90, 260), loops=0.5, hits=[],
      pts=[(1034, 529), (990, 520), (950, 505), (918, 488), (890, 468), (860, 452), (825, 446), (790, 452)]),
    # ---------------- drones from occupied Crimea and the Azov coast
    P(kind='drone', site='Hvardiiske', n=6, spread=4.0, launch=(90, 330), loops=0.7, hits=[],
      pts=[(803, 788), (765, 768), (735, 745), (706, 722), (682, 705), (656, 692), (630, 690), (612, 700),
           (602, 712), (608, 722), (623, 711), (624, 690), (613, 676)]),
    P(kind='drone', site='Hvardiiske', n=6, spread=4.0, launch=(100, 330), loops=0.4, hits=[],
      pts=[(803, 788), (765, 768), (735, 745), (710, 720), (690, 700), (668, 672), (650, 650), (640, 620),
           (630, 590), (615, 560), (590, 535), (560, 520), (528, 506), (500, 492)]),
    P(kind='drone', site='Hvardiiske', n=4, spread=5.0, launch=(120, 300), loops=0.5, hits=[],
      pts=[(803, 788), (760, 781), (720, 766), (680, 746), (640, 722), (608, 706), (590, 688), (580, 660),
           (575, 630), (566, 600), (548, 575)]),
    P(kind='drone', site='Cape Chauda range', n=4, spread=4.0, launch=(150, 260), loops=0.5, hits=[],
      pts=[(923, 794), (880, 790), (840, 795), (803, 788), (765, 768), (735, 745), (706, 722), (684, 700), (668, 676)]),
    P(kind='drone', site='Primorsko-Akhtarsk airfield', n=4, spread=4.0, launch=(110, 220), loops=0.4, hits=[],
      pts=[(1070, 700), (1030, 676), (990, 650), (955, 628), (925, 610), (900, 598), (880, 590), (862, 578)]),
    P(kind='drone', site='Khalino airfield', n=2, spread=4.0, launch=(120, 220), loops=0.8, hits=[],
      pts=[(937, 186), (925, 230), (915, 270), (935, 305), (975, 335), (985, 380), (975, 420), (955, 450)]),

    # ---------------- Kh-101 from strategic bombers, entering from the north-east
    P(kind='x101', site=None, n=7, spread=3.0, launch=(572, 588), extend=150,
      hits=[('Volodymyr', (680, 684))],
      pts=[(850, 125), (793, 137), (752, 158), (710, 175), (668, 196), (635, 213), (602, 214), (560, 210),
           (502, 208), (460, 206), (432, 208), (400, 214), (369, 216), (327, 224), (290, 240), (257, 261),
           (230, 278), (207, 284)]),
    P(kind='x101', site=None, n=1, spread=1.0, launch=(580, 580), extend=150, hits=[], exit=True,
      pts=[(850, 125), (793, 137), (752, 158), (710, 175), (668, 196), (635, 213), (602, 214), (560, 210),
           (502, 208), (460, 206), (400, 214), (350, 240), (318, 272), (286, 304), (250, 318), (205, 324), (150, 327)]),
    P(kind='x101', site=None, n=4, spread=2.5, launch=(578, 596), extend=150,
      hits=[('Rivne', (668, 672))],
      pts=[(845, 128), (793, 140), (752, 160), (710, 177), (668, 198), (635, 217), (606, 233), (564, 246),
           (522, 256), (500, 265), (466, 274), (432, 282), (395, 290), (373, 294), (341, 296)]),
    P(kind='x101', site=None, n=5, spread=2.5, launch=(580, 598), extend=150,
      hits=[('Khmelnytskyi', (670, 673)), ('Khmelnytskyi', (674, 677))],
      pts=[(838, 132), (793, 142), (752, 162), (710, 179), (668, 200), (635, 219), (606, 236), (564, 250),
           (528, 268), (500, 288), (470, 312), (445, 335), (422, 356), (402, 378), (387, 405)]),
    P(kind='x101', site=None, n=5, spread=2.5, launch=(582, 600), extend=150,
      hits=[('Lviv', (688, 692)), ('Lviv', (693, 697))],
      pts=[(845, 120), (793, 135), (752, 156), (710, 173), (668, 194), (635, 211), (602, 212), (560, 208),
           (502, 207), (460, 205), (432, 207), (400, 213), (369, 222), (343, 255), (318, 290), (290, 322),
           (262, 344), (232, 356), (206, 360)]),
    P(kind='x101', site=None, n=16, spread=3.0, launch=(572, 596), extend=160,
      hits=[('Ivano-Frankivsk', (684, 687)), ('Ivano-Frankivsk', (688, 690)), ('Chernivtsi', (679, 683)),
            ('Kamianets-Podilskyi', (674, 677)), ('Burshtyn', (677, 680)), ('Stryi', (690, 694))],
      pts=[(962, 228), (948, 252), (933, 278), (914, 306), (893, 336), (868, 366), (838, 394), (800, 420),
           (760, 446), (715, 474), (672, 494), (630, 504), (588, 507), (547, 505), (505, 497), (463, 485),
           (422, 476), (385, 470), (350, 463), (312, 456), (280, 452), (246, 448)]),

    # ---------------- Kh-59/69 launched by tactical aircraft over Kursk region / near Millerovo
    P(kind='kh59', site=None, n=3, spread=2.5, launch=(612, 618), extend=60,
      hits=[('Bila Tserkva', (640, 642))],
      pts=[(895, 197), (840, 220), (780, 245), (720, 270), (670, 290), (630, 308), (605, 330), (588, 352), (575, 371)]),
    P(kind='kh59', site=None, n=1, spread=1.0, launch=(600, 600), extend=60, hits=[],
      pts=[(1185, 441), (1100, 423), (1000, 402), (900, 378), (850, 366), (790, 352), (735, 342), (690, 336)]),

    # ---------------- Kalibr from the Black Sea near Novorossiysk
    P(kind='kalibr', site='Novorossiysk', n=9, spread=2.2, launch=(578, 590),
      hits=[('Lviv', (698, 701)), ('Lviv', (702, 705)), ('Ivano-Frankivsk', (692, 694))],
      pts=[(1024, 822), (980, 790), (930, 750), (880, 705), (840, 665), (805, 630), (780, 605), (750, 577),
           (730, 555), (706, 534), (680, 521), (640, 515), (600, 515), (560, 515), (525, 515), (500, 518),
           (486, 502), (473, 482), (457, 457), (440, 442), (423, 437), (390, 436), (348, 433), (315, 422),
           (277, 406), (248, 386), (220, 368), (206, 360)]),

    # ---------------- Iskander-K towards Kyiv
    P(kind='iskk', site=None, n=3, spread=2.0, launch=(624, 628), extend=40,
      hits=[('Kyiv-E', (651, 652))],
      pts=[(902, 206), (840, 225), (780, 248), (720, 272), (670, 295), (640, 318), (622, 333)]),

    # ---------------- Iskander-M ballistic salvo on Kyiv (from Bryansk / Kursk regions)
    P(kind='iskm', site=None, n=3, spread=0.5, launch=(647.5, 649.0),
      hits=[('Kyiv', (652.4, 652.8)), ('Kyiv', (653.0, 653.4))], fan=[(747, 8), (764, 22)],
      pts=[(755, 14), (603, 313)]),
    P(kind='iskm', site=None, n=7, spread=0.5, launch=(647.0, 649.6),
      hits=[('Kyiv', (651.6, 652.0)), ('Kyiv', (652.1, 652.5)), ('Kyiv-E', (652.8, 653.2)), ('Kyiv', (653.5, 653.9))],
      fan=[(670, 60), (708, 88)], pts=[(690, 72), (606, 314)]),
    P(kind='iskm', site=None, n=3, spread=0.5, launch=(648.0, 649.4),
      hits=[('Kyiv-E', (652.6, 653.0))], fan=[(800, 86), (828, 102)], pts=[(815, 94), (622, 333)]),
    # ---------------- Iskander-M from Crimea
    P(kind='iskm', site=None, n=3, spread=0.5, launch=(659.0, 660.0),
      hits=[('Bashtanka', (663.5, 664.0))], fan=[(820, 742), (832, 765)], pts=[(826, 754), (737, 601)]),
    P(kind='iskm', site=None, n=1, spread=0.5, launch=(661.0, 661.0), hits=[], fan=[(808, 770), (808, 770)],
      pts=[(808, 770), (575, 605)]),
]


# ------------------------------------------------------------------ helpers
def catmull(P, step):
    """Centripetal Catmull-Rom through P (N,2) resampled every `step` km."""
    P = np.asarray(P, float)
    if len(P) == 2:
        L = np.hypot(*(P[1] - P[0])); n = max(2, int(L / step) + 1)
        t = np.linspace(0, 1, n)[:, None]
        return P[0] * (1 - t) + P[1] * t
    Q = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        t0 = 0; t1 = t0 + np.hypot(*(p1 - p0)) ** 0.5 + 1e-6
        t2 = t1 + np.hypot(*(p2 - p1)) ** 0.5 + 1e-6; t3 = t2 + np.hypot(*(p3 - p2)) ** 0.5 + 1e-6
        n = max(2, int(np.hypot(*(p2 - p1)) / step * 1.5) + 1)
        t = np.linspace(t1, t2, n)[:, None]
        a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
        a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
        a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
        b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
        b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
        c = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2
        out.append(c[:-1] if i < len(Q) - 3 else c)
    return resample(np.vstack(out), step)


def resample(P, step):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    n = max(2, int(d[-1] / step) + 1)
    s = np.linspace(0, d[-1], n)
    return np.c_[np.interp(s, d, P[:, 0]), np.interp(s, d, P[:, 1])]


def arclen(P):
    return np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]


def smooth_noise(n, scale, seed):
    r = np.random.default_rng(seed)
    k = max(2, int(n / scale) + 3)
    ctrl = r.standard_normal(k)
    x = np.linspace(0, k - 1, n)
    i = np.clip(x.astype(int), 0, k - 2); f = x - i; f = f * f * (3 - 2 * f)
    return ctrl[i] * (1 - f) + ctrl[i + 1] * f


def normals(P):
    d = np.gradient(P, axis=0); d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
    return np.c_[-d[:, 1], d[:, 0]]


def add_loop(P, idx, radius, side, seed=0):
    """Insert an irregular loiter loop at index idx (tangent to the path)."""
    r = np.random.default_rng(seed)
    d = P[min(idx + 1, len(P) - 1)] - P[max(idx - 1, 0)]; d /= np.linalg.norm(d) + 1e-9
    n = np.array([-d[1], d[0]]) * side
    c = P[idx] + n * radius
    a0 = np.arctan2(*(P[idx] - c)[::-1])
    m = max(24, int(2 * np.pi * radius / 1.2))
    t = np.linspace(0, 1, m)
    ang = a0 - side * 2 * np.pi * t
    rad = radius * (1 + 0.35 * np.sin(2 * np.pi * t * r.integers(1, 3) + r.uniform(0, 6)) * np.sin(np.pi * t))
    ecc = r.uniform(0.55, 1.0); rot = r.uniform(0, np.pi)
    q = np.c_[np.cos(ang) * rad, np.sin(ang) * rad * ecc]
    # keep the loop attached to the path at both ends
    q = q - q[0] + (P[idx] - c)
    R = np.array([[np.cos(rot), -np.sin(rot)], [np.sin(rot), np.cos(rot)]])
    q = (q - q[0]) @ R.T + q[0]
    loop = c + q
    drift = np.linspace(0, 1, m)[:, None] * (loop[-1] - loop[0])
    loop = loop - drift
    return np.vstack([P[:idx], loop, P[idx:]])


def world_pts(px):
    x, y = pix2world(*np.asarray(px, float).T)
    return np.c_[x, y]


# ------------------------------------------------------------------ build
def build():
    tracks, hits, pops = [], [], []
    tid = 0
    for bi, B in enumerate(BUNDLES):
        kind = B['kind']; label, col, speed, alt = KINDS[kind]
        base = world_pts(B['pts'])
        nh = len(B['hits'])
        for k in range(B['n']):
            seed = bi * 100 + k
            r = np.random.default_rng(seed)
            P = base.copy()
            if kind == 'iskm':
                f0, f1 = np.array(B['fan'][0], float), np.array(B['fan'][1], float)
                start = world_pts([f0 + (f1 - f0) * (k / max(1, B['n'] - 1))])[0]
                tgt = world_pts([B['pts'][-1]])[0] + r.normal(0, 2.5, 2)
                P = np.vstack([start, tgt])
            if B.get('extend'):
                d = P[0] - P[1]; d /= np.linalg.norm(d)
                d2 = P[0] - P[min(3, len(P) - 1)]; d2 /= np.linalg.norm(d2)
                P = np.vstack([P[0] + d2 * B['extend'], P[0] + d2 * B['extend'] * 0.5, P])
            P = catmull(P, 1.5) if kind != 'iskm' else resample(P, 1.0)
            n = len(P); s = arclen(P); L = s[-1]
            # lateral jitter: fixed at launch, converging on hit targets
            if kind != 'iskm':
                off = r.normal(0, B['spread']) + B['spread'] * 0.6 * smooth_noise(n, max(8, 120 / 1.5), seed + 7)
                if kind == 'drone':
                    off = off + r.uniform(1.0, 3.0) * np.sin(s / r.uniform(25, 60) + r.uniform(0, 6))
                ramp_in = np.clip(s / 40.0, 0, 1) if B.get('site') else np.ones(n)
                is_hit = k < nh
                ramp_out = np.clip((L - s) / 60.0, 0, 1) if is_hit else np.ones(n)
                P = P + normals(P) * (off * ramp_in * ramp_out)[:, None]
                if is_hit:
                    P[-1] += r.normal(0, 1.2, 2)
            # outcome & timing
            is_hit = k < nh
            if is_hit:
                target, (a, b) = B['hits'][k]
                t_end = r.uniform(a, b)
                end = 'hit'
            else:
                end = 'exit' if B.get('exit') else 'intercept'
            if kind == 'iskm':
                dur = r.uniform(4.0, 4.8)
                if is_hit:
                    t0 = t_end - dur
                else:
                    t0 = r.uniform(*B['launch'])
                frac = 1.0 if is_hit or end == 'exit' else r.uniform(0.80, 0.93)
                m = max(2, int(n * frac)); P = P[:m]; s = s[:m]
                u = s / L
                # ballistic profile: boost, high arc, steep terminal dive (exaggerated)
                z = 125.0 * np.sin(np.pi * np.clip(u, 0, 1) ** 0.85) ** 1.2
                tau = t0 + dur * u
                xyz = np.c_[P, z]
            else:
                sp = speed * r.uniform(0.92, 1.08)
                if not is_hit and end == 'intercept':
                    lo = 0.35 if kind == 'drone' else 0.55
                    frac = r.uniform(lo, 0.97)
                    m = max(3, int(n * frac)); P = P[:m]; s = s[:m]
                    if kind == 'drone' and r.random() < B.get('loops', 0) * 0.6:
                        idx = int(len(P) * r.uniform(0.75, 0.98))
                        P = add_loop(P, idx, r.uniform(4, 11), r.choice([-1, 1]), seed)
                        s = arclen(P)
                elif is_hit and kind == 'drone' and r.random() < B.get('loops', 0) * 0.5:
                    idx = int(len(P) * r.uniform(0.5, 0.8))
                    P = add_loop(P, idx, r.uniform(4, 9), r.choice([-1, 1]), seed); s = arclen(P)
                if is_hit:
                    t0 = t_end - s[-1] / sp
                else:
                    t0 = r.uniform(*B['launch'])
                tau = t0 + s / sp
                z = np.full(len(P), alt)
                z = z * np.clip(s / 15.0, 0.05, 1)            # climb out after launch
                if is_hit:
                    z = z * np.clip((s[-1] - s) / 8.0, 0, 1)    # terminal dive
                xyz = np.c_[P, z]
            trk = dict(id=tid, kind=kind, bundle=bi, site=B.get('site'), end=end,
                       xyz=xyz.astype(np.float32), tau=tau.astype(np.float32))
            tracks.append(trk)
            if end == 'hit':
                hits.append(dict(S=float(tau[-1]), x=float(xyz[-1, 0]), y=float(xyz[-1, 1]), kind=kind,
                                 target=target, big=kind != 'drone'))
            elif end == 'intercept':
                pops.append(dict(S=float(tau[-1]), x=float(xyz[-1, 0]), y=float(xyz[-1, 1]), z=float(xyz[-1, 2]),
                                 kind=kind, track=tid))
            tid += 1
    sites = {}
    for k, v in SITES.items():
        lo, la = pix2lonlat(*v); x, y = project(lo, la)
        sites[k] = (float(x[0]), float(y[0]))
    out = dict(tracks=tracks, hits=hits, pops=pops, sites=sites, kinds=KINDS)
    pickle.dump(out, open(os.path.join(ROOT, 'work', 'tracks.pkl'), 'wb'))
    return out


if __name__ == '__main__':
    o = build()
    from collections import Counter
    print('tracks', len(o['tracks']), Counter(t['kind'] for t in o['tracks']))
    print('hits', len(o['hits']), 'intercepts', len(o['pops']))
    for h in sorted(o['hits'], key=lambda h: h['S']):
        S = h['S']; hh = int(18 + S // 60) % 24; mm = int(S % 60)
        print(f"  {hh:02d}:{mm:02d}  {h['kind']:6s} {h['target']}")
    ts = [t['tau'][0] for t in o['tracks']]
    print('launch range', min(ts), max(ts))
