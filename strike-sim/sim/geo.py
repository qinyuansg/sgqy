"""Projection helpers. World units are kilometres on an orthographic plane
centred on Ukraine, so distances/speeds are physically meaningful."""
import numpy as np

R_EARTH = 6371.0
LAT0, LON0 = 48.6, 31.4
_phi0 = np.radians(LAT0)


def project(lon, lat):
    lon = np.asarray(lon, dtype=np.float64); lat = np.asarray(lat, dtype=np.float64)
    phi = np.radians(lat); dl = np.radians(lon - LON0)
    x = R_EARTH * np.cos(phi) * np.sin(dl)
    y = R_EARTH * (np.cos(_phi0) * np.sin(phi) - np.sin(_phi0) * np.cos(phi) * np.cos(dl))
    return x, y


def unproject(x, y):
    x = np.asarray(x, dtype=np.float64); y = np.asarray(y, dtype=np.float64)
    rho = np.hypot(x, y)
    c = np.arcsin(np.clip(rho / R_EARTH, -1, 1))
    with np.errstate(invalid='ignore', divide='ignore'):
        phi = np.arcsin(np.cos(c) * np.sin(_phi0) + np.where(rho > 0, y * np.sin(c) * np.cos(_phi0) / np.where(rho > 0, rho, 1), 0))
        lam = np.radians(LON0) + np.arctan2(x * np.sin(c), rho * np.cos(c) * np.cos(_phi0) - y * np.sin(c) * np.sin(_phi0))
    return np.degrees(lam), np.degrees(phi)


# Control points: (pixel x, pixel y) on the 1280x925 source infographic -> (lat, lon)
CONTROL = [
    ((205, 362), (49.84, 24.03)),   # Lviv
    ((287, 285), (50.75, 25.34)),   # Lutsk
    ((341, 295), (50.62, 26.25)),   # Rivne
    ((300, 398), (49.55, 25.59)),   # Ternopil
    ((387, 406), (49.42, 26.99)),   # Khmelnytskyi
    ((245, 450), (48.92, 24.71)),   # Ivano-Frankivsk
    ((320, 505), (48.29, 25.94)),   # Chernivtsi
    ((97, 486), (48.62, 22.29)),    # Uzhhorod
    ((861, 270), (50.91, 34.80)),   # Sumy
    ((947, 356), (49.99, 36.23)),   # Kharkiv
    ((844, 394), (49.59, 34.55)),   # Poltava
    ((836, 35), (53.24, 34.36)),    # Bryansk
    ((966, 287), (50.60, 36.59)),   # Belgorod
    ((1125, 187), (51.67, 39.18)),  # Voronezh
    ((1148, 100), (52.61, 39.60)),  # Lipetsk
    ((692, 409), (49.44, 32.06)),   # Cherkasy
    ((704, 493), (48.51, 32.26)),   # Kropyvnytskyi
    ((690, 632), (46.98, 32.00)),   # Mykolaiv
    ((729, 661), (46.64, 32.62)),   # Kherson
    ((611, 679), (46.48, 30.72)),   # Odesa
    ((818, 809), (44.95, 34.10)),   # Simferopol
    ((781, 839), (44.62, 33.52)),   # Sevastopol
    ((1042, 540), (48.00, 37.80)),  # Donetsk
    ((1133, 487), (48.57, 39.31)),  # Luhansk
    ((1154, 605), (47.24, 39.71)),  # Rostov
    ((486, 327), (50.25, 28.66)),   # Zhytomyr
    ((1038, 817), (44.72, 37.77)),  # Novorossiysk
]


def _merc(lon, lat):
    return np.radians(lon), np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))


def _fit():
    """The source infographic is (close to) Web Mercator: fit an affine map
    between its pixels and Mercator coordinates (~4 px RMS on 27 cities)."""
    P = np.array([c[0] for c in CONTROL], float)
    lat = np.array([c[1][0] for c in CONTROL]); lon = np.array([c[1][1] for c in CONTROL])
    mx, my = _merc(lon, lat)
    A = np.c_[P, np.ones(len(P))]
    M, *_ = np.linalg.lstsq(A, np.c_[mx, my], rcond=None)        # pixel -> merc
    B = np.c_[mx, my, np.ones(len(P))]
    Minv, *_ = np.linalg.lstsq(B, P, rcond=None)                  # merc -> pixel
    err = np.hypot(*(B @ Minv - P).T)
    return M, Minv, err


PIX2MERC, MERC2PIX, FIT_ERR_PX = _fit()


def pix2lonlat(px, py):
    p = np.c_[np.atleast_1d(px).astype(float), np.atleast_1d(py).astype(float), np.ones(np.size(px))]
    m = p @ PIX2MERC
    lon = np.degrees(m[:, 0]); lat = np.degrees(2 * np.arctan(np.exp(m[:, 1])) - np.pi / 2)
    return lon, lat


def pix2world(px, py):
    return project(*pix2lonlat(px, py))


def lonlat2pix(lon, lat):
    mx, my = _merc(np.atleast_1d(lon), np.atleast_1d(lat))
    p = np.c_[mx, my, np.ones(np.size(mx))] @ MERC2PIX
    return p[:, 0], p[:, 1]


def world2pix(x, y):
    return lonlat2pix(*unproject(x, y))


if __name__ == '__main__':
    print('fit error px: mean %.2f max %.2f' % (FIT_ERR_PX.mean(), FIT_ERR_PX.max()))
