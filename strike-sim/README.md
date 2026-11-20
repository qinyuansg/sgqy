# Strike night — 3D reconstruction (19–20 Nov 2026)

A cinematic, data-driven animation of the infographic
**«Рух повітряних цілей над територією України», 19.11–20.11.2026**
by ППО РАДАР (t.me/mon1tor_ua) × monitoring (t.me/monitorwarr), licensed CC BY 4.0
(`ref/source_map.jpg`).

Every route on the source map was traced, georeferenced and replayed over a
night-time 3D map of the region, with a flying camera, impacts, interceptors,
a timeline HUD and a synthesised soundtrack.

## What is real and what is illustrative

| Element | Basis |
|---|---|
| Routes, launch areas, impact locations | Traced from the source infographic (Web-Mercator fit, ~4 km RMS) |
| Terrain, coastlines, borders, rivers, cities | AWS Terrain Tiles (SRTM/GEBCO) and Natural Earth 10m |
| Night lights | Synthesised from Natural Earth population and road data; Ukraine dimmed for wartime blackout |
| Front line / occupied area | Approximate, illustrative |
| Clock times, speeds, altitudes, which tracks were intercepted | **Simulated**. The source shows routes, not times |
| Track counts | Count of reconstructed lines, not official figures |

Ukraine is drawn with its internationally recognised borders (Crimea included).

## Build

```bash
pip install numpy scipy opencv-python-headless pillow shapely
sim/fetch_data.sh          # Natural Earth + terrain tiles (~150 MB)
./build.sh                 # -> out/ukraine_air_attack_19-20_nov_2026.mp4
python3 sim/render.py stills 18 46 70   # quick look at single frames -> work/
```

Pipeline: `basemap.py` (texture + vectors) → `tracks.py` (bundles → individual
timed tracks) → `render.py` (perspective camera, bloom, grade, HUD; frames are pure
functions of time and render in parallel) → `audio.py` → ffmpeg.

`scene.py` holds the direction: time mapping, camera keyframes, captions and labels.
