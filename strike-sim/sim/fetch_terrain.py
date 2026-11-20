"""Download AWS Terrain Tiles (Terrarium encoding, public dataset) covering the scene."""
import math, os, sys, concurrent.futures as cf, urllib.request
Z = 8
LON = (17.0, 46.0); LAT = (40.8, 56.0)

def tx(lon): return int((lon + 180) / 360 * 2**Z)
def ty(lat):
    r = math.radians(lat); return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**Z)

jobs = [(x, y) for x in range(tx(LON[0]), tx(LON[1]) + 1) for y in range(ty(LAT[1]), ty(LAT[0]) + 1)]
def get(xy):
    x, y = xy; fn = f'data/terrain/{Z}_{x}_{y}.png'
    if os.path.exists(fn) and os.path.getsize(fn) > 1000: return 0
    for attempt in range(4):
        try:
            urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', fn); return 1
        except Exception as e:
            err = e
    print('fail', xy, err); return 0
with cf.ThreadPoolExecutor(16) as ex: n = sum(ex.map(get, jobs))
print(len(jobs), 'tiles,', n, 'downloaded')
