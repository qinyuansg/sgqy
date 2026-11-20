"""Scene direction: video-time <-> story-time mapping, camera path, captions, labels."""
import math
import numpy as np
from scipy.interpolate import PchipInterpolator
from geo import project

W, H, FPS = 1920, 1080, 30
BAR = 100                       # letterbox bars (2.2:1 picture)
DURATION = 77.0

# (video seconds, story minutes after 18:00 on 19 Nov)
TIME_KEYS = [(0, 0), (4.5, 0), (6, 12), (27, 540), (29, 570), (38, 628), (42, 645), (48, 655),
             (59.5, 712), (65, 810), (DURATION, 810)]
_tk = np.array(TIME_KEYS, float)
_story = PchipInterpolator(_tk[:, 0], _tk[:, 1])
_rate = _story.derivative()
_vg = np.linspace(0, DURATION, 40001)
_sg = _story(_vg) + _vg * 1e-7


def story(v):
    return float(_story(np.clip(v, 0, DURATION)))


def rate(v):
    return float(_rate(np.clip(v, 0, DURATION)))


def s2v(S):
    return np.interp(S, _sg, _vg)


def clock(S):
    m = int(round(18 * 60 + S))
    return (m // 60) % 24, m % 60, (19 if m < 24 * 60 else 20)


# camera: (v, lon, lat, distance km, heading deg (0 = looking north), pitch deg from vertical)
CAM_KEYS = [
    (0.0, 31.6, 47.6, 2400, 8, 26),
    (5.0, 32.4, 49.4, 1650, 14, 38),
    (9.5, 33.9, 51.7, 720, 228, 52),
    (13.0, 32.9, 51.2, 640, 240, 56),
    (16.5, 36.2, 48.5, 760, 262, 54),
    (20.0, 35.3, 47.9, 600, 276, 57),
    (23.2, 33.0, 45.8, 720, 335, 54),
    (26.8, 31.6, 46.6, 760, 350, 52),
    (30.2, 34.6, 50.6, 1250, 238, 46),
    (33.8, 33.5, 48.6, 1550, 300, 42),
    (37.2, 30.9, 49.95, 700, 345, 56),
    (41.0, 30.55, 50.12, 430, 8, 60),
    (46.5, 30.55, 50.32, 380, 15, 58),
    (49.8, 27.2, 49.6, 760, 265, 52),
    (53.5, 25.7, 49.35, 620, 272, 56),
    (57.0, 25.1, 49.4, 560, 285, 55),
    (60.5, 29.5, 49.2, 1500, 330, 40),
    (65.0, 31.4, 48.65, 2050, 360, 18),
    (DURATION, 31.4, 48.75, 1930, 360, 12),
]
_ck = np.array(CAM_KEYS, float)
_cx, _cy = project(_ck[:, 1], _ck[:, 2])
_head = np.degrees(np.unwrap(np.radians(_ck[:, 4])))
_cam = {
    'tx': PchipInterpolator(_ck[:, 0], _cx), 'ty': PchipInterpolator(_ck[:, 0], _cy),
    'ld': PchipInterpolator(_ck[:, 0], np.log(_ck[:, 3])),
    'hd': PchipInterpolator(_ck[:, 0], _head), 'pt': PchipInterpolator(_ck[:, 0], _ck[:, 5]),
}


def camera(v):
    v = float(np.clip(v, 0, DURATION))
    return dict(tx=float(_cam['tx'](v)), ty=float(_cam['ty'](v)), dist=float(np.exp(_cam['ld'](v))),
                heading=float(_cam['hd'](v)), pitch=float(_cam['pt'](v)))


# captions: (in, out, title, subtitle, accent kind)
CAPTIONS = [
    (6.4, 12.6, 'Wave one: attack drones', 'Launched from Bryansk and Kursk regions, streaming past Chernihiv toward the west', 'drone'),
    (13.6, 19.8, 'From Millerovo and Donetsk', 'Dense drone streams cross the east; Dnipro and Zaporizhzhia are hit', 'drone'),
    (20.8, 27.0, 'From occupied Crimea', 'Drones swing out over the Black Sea toward Odesa and Mykolaiv', 'drone'),
    (28.6, 33.2, 'Kh-101 cruise missiles', 'Launched by strategic bombers, entering from the north-east', 'x101'),
    (33.6, 37.6, 'Kalibr cruise missiles', 'A salvo from the Black Sea near Novorossiysk', 'kalibr'),
    (38.2, 42.6, 'Closing on Kyiv', 'Kh-59/69 and Iskander-K missiles approach the capital region', 'kh59'),
    (42.9, 49.0, 'Iskander-M ballistic missiles', 'A salvo on Kyiv from the north; air defence engages', 'iskm'),
    (49.8, 59.2, 'Western Ukraine', 'Strikes across Lviv, Volyn, Rivne, Khmelnytskyi, Ivano-Frankivsk and Chernivtsi regions', 'x101'),
    (60.3, 65.4, 'Dawn, 20 November', 'The night’s routes, as traced by Ukrainian air-monitoring channels', None),
]
TITLE = (0.5, 5.6)
END_CARD = 66.0

# (name, lon, lat, tier, ukrainian)
CITIES = [
    ('Kyiv', 30.52, 50.45, 1, 1), ('Lviv', 24.03, 49.84, 1, 1), ('Kharkiv', 36.23, 49.99, 1, 1),
    ('Odesa', 30.72, 46.48, 1, 1), ('Dnipro', 35.05, 48.46, 1, 1),
    ('Lutsk', 25.34, 50.75, 2, 1), ('Rivne', 26.25, 50.62, 2, 1), ('Ternopil', 25.59, 49.55, 2, 1),
    ('Khmelnytskyi', 26.99, 49.42, 2, 1), ('Ivano-Frankivsk', 24.71, 48.92, 2, 1), ('Chernivtsi', 25.94, 48.29, 2, 1),
    ('Uzhhorod', 22.29, 48.62, 2, 1), ('Vinnytsia', 28.47, 49.23, 2, 1), ('Zhytomyr', 28.66, 50.25, 2, 1),
    ('Chernihiv', 31.29, 51.50, 2, 1), ('Sumy', 34.80, 50.91, 2, 1), ('Poltava', 34.55, 49.59, 2, 1),
    ('Cherkasy', 32.06, 49.44, 2, 1), ('Kropyvnytskyi', 32.26, 48.51, 2, 1), ('Zaporizhzhia', 35.14, 47.84, 2, 1),
    ('Mykolaiv', 32.00, 46.98, 2, 1), ('Kherson', 32.62, 46.64, 2, 1), ('Donetsk', 37.80, 48.00, 2, 1),
    ('Luhansk', 39.31, 48.57, 2, 1), ('Simferopol', 34.10, 44.95, 2, 1), ('Sevastopol', 33.52, 44.62, 2, 1),
    ('Kremenchuk', 33.42, 49.07, 3, 1), ('Kryvyi Rih', 33.39, 47.91, 3, 1), ('Bila Tserkva', 30.11, 49.80, 3, 1),
    ('Korosten', 28.64, 50.95, 3, 1), ('Kovel', 24.71, 51.21, 3, 1), ('Volodymyr', 24.32, 50.85, 3, 1),
    ('Stryi', 23.85, 49.26, 3, 1), ('Drohobych', 23.51, 49.35, 3, 1), ('Kamianets-Podilskyi', 26.58, 48.68, 3, 1),
    ('Burshtyn', 24.63, 49.26, 3, 1), ('Kolomyia', 25.04, 48.53, 3, 1), ('Uman', 30.22, 48.75, 3, 1),
    ('Brovary', 30.79, 50.51, 3, 1), ('Nizhyn', 31.89, 51.05, 3, 1), ('Pryluky', 32.39, 50.59, 3, 1),
    ('Konotop', 33.20, 51.24, 3, 1), ('Shostka', 33.48, 51.87, 3, 1), ('Kramatorsk', 37.56, 48.72, 3, 1),
    ('Pavlohrad', 35.87, 48.53, 3, 1), ('Izium', 37.26, 49.21, 3, 1), ('Kupiansk', 37.61, 49.71, 3, 1),
    ('Melitopol', 35.37, 46.85, 3, 1), ('Mariupol', 37.55, 47.10, 3, 1), ('Berdiansk', 36.79, 46.76, 3, 1),
    ('Nikopol', 34.40, 47.57, 3, 1), ('Pervomaisk', 30.85, 48.05, 3, 1), ('Bashtanka', 32.44, 47.41, 3, 1),
    ('Izmail', 28.84, 45.35, 3, 1), ('Kerch', 36.47, 45.36, 3, 1), ('Feodosia', 35.38, 45.03, 3, 1),
    ('Starokostiantyniv', 27.20, 49.76, 3, 1), ('Shepetivka', 27.06, 50.18, 3, 1), ('Kalush', 24.36, 49.03, 3, 1),
    ('Okhtyrka', 34.90, 50.31, 3, 1), ('Lubny', 33.00, 50.02, 3, 1), ('Vasylkiv', 30.32, 50.18, 3, 1),
    ('Fastiv', 29.92, 50.08, 3, 1), ('Berdychiv', 28.58, 49.90, 3, 1), ('Kovel', 24.71, 51.21, 3, 1),
    ('Bryansk', 34.36, 53.24, 2, 0), ('Kursk', 36.19, 51.73, 2, 0), ('Belgorod', 36.59, 50.60, 2, 0),
    ('Voronezh', 39.18, 51.67, 2, 0), ('Rostov-on-Don', 39.71, 47.24, 2, 0), ('Krasnodar', 38.98, 45.04, 2, 0),
    ('Gomel', 30.98, 52.43, 3, 0), ('Brest', 23.69, 52.09, 3, 0), ('Lublin', 22.57, 51.25, 3, 0),
    ('Rzeszów', 22.00, 50.04, 3, 0), ('Chișinău', 28.86, 47.01, 2, 0), ('Iași', 27.60, 47.16, 3, 0),
    ('Suceava', 26.25, 47.65, 3, 0),
]
