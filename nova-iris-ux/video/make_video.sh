#!/usr/bin/env bash
# Rebuild the NOVA+ concept video from the original reader recording.
#
#   nova-iris-ux/video/make_video.sh /path/to/recording.mov [workdir]
#
# Needs: ffmpeg, python3 (opencv-python-headless, numpy, scipy, pillow, fonttools),
#        node + playwright (Chromium), and the Inter font.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MOV="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
WORK="${2:-$(mktemp -d)}"
mkdir -p "$WORK/src" && cd "$WORK"

ffmpeg -v error -y -i "$MOV" -vsync 0 src/%04d.png             # 311 frames, 478×850 @ 30 fps
python3 "$HERE/edges2.py" src edges2.json                      # sub-pixel screen edges per frame
python3 "$HERE/fitmodel.py" edges2.json "$HERE"                # focal, aspect, principal point
python3 "$HERE/tracks.py" "$HERE"                              # screen quad per frame
python3 "$HERE/refine_pan.py"                                  # fix the fast pan at the end
python3 "$HERE/video_ui.py" ui_svg                             # animated UI, one SVG per frame
node "$HERE/render_par.cjs" ui_svg ui_png 4                    # rasterise in Chromium
python3 "$HERE/composite.py" comp                              # warp onto the real screen
python3 "$HERE/audio.py" "$MOV" audio_new.wav                  # room audio + new chime
ffmpeg -v error -y -framerate 30 -i comp/%04d.png -i audio_new.wav -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -movflags +faststart -shortest NOVA-Iris-Concept.mp4
python3 "$HERE/sbs.py" NOVA-Iris-Before-After.mp4 audio_new.wav   # before | after, frame-synced
python3 "$HERE/poster.py"                                      # key-frame poster (poster.jpg)
python3 "$HERE/flow_video.py" ui_png NOVA-Iris-Flow.mp4        # UI-only flow on the reader mockup
echo "done: $WORK/NOVA-Iris-Concept.mp4 and $WORK/NOVA-Iris-Before-After.mp4"
