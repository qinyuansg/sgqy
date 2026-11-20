#!/usr/bin/env bash
# Downloads the public datasets used by the basemap (Natural Earth + AWS Terrain Tiles).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data
B=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_10m_admin_0_countries ne_10m_admin_1_states_provinces ne_10m_rivers_lake_centerlines \
         ne_10m_rivers_europe ne_10m_lakes ne_10m_lakes_europe ne_10m_populated_places ne_10m_land ne_10m_roads; do
  [ -s data/$f.geojson ] || curl -sfL -o data/$f.geojson $B/$f.geojson
done
python3 sim/fetch_terrain.py
