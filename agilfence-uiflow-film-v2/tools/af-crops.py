#!/usr/bin/env python3
"""Cut C (story): crop the two sensing illustrations (2x renders, 2800x2138) into the plates the story scenes show,
and scan every crop for lavender (the concept-feature accent, #B69CFF and its neighbours). Exits non-zero when a crop holds more than a few isolated violet pixels.

usage: tools/af-crops.py <dir with AF-01-perimeter-triggered.png and AF-04-locate-nearest-cameras.png> <out dir>
Crops (2x px, x, y, w, h):
  AF-01-fence   the fence bay: cable, sensors, the climber and the strain ripple, the segment callout (no title, no badge)
  AF-01-fence-clean  the same bay with the segment callout ('Fence Sector 5 · Segment 5-14 / Pinpointed to within a few
                metres') painted out, for the story cut's cold open, so pinpointing is first shown in its chapter 2: the
                barbed-wire dashes and the centre post's arms are rebuilt behind it (the highlight cut keeps AF-01-fence)
  AF-01-trace   'What the fence feels': wind on 5-09 (no alarm) vs the climb on 5-14 (alarm)
  AF-04-map     the airfield map: the fence line with segment marks, 5-14 lit, the nearest cameras on the map
                (the alert list with its concept line on the left and the right panel are cropped away)
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image

CROPS = {
    "AF-01-fence": ("AF-01-perimeter-triggered.png", (40, 244, 1960, 1180)),
    "AF-01-fence-clean": ("AF-01-perimeter-triggered.png", (40, 244, 1960, 1180)),
    "AF-01-trace": ("AF-01-perimeter-triggered.png", (2018, 298, 702, 628)),
    "AF-04-map": ("AF-04-locate-nearest-cameras.png", (806, 410, 988, 732)),
}


def lavender(px):
    """Count bright violet pixels (hue 250-290 deg, as #B69CFF: h 262, s 0.39, v 1.0). Red-on-blue anti-aliasing
    (the strain ripple over the cable, the alarm zone over the map lines) is dull (v below 0.75) and is not counted."""
    n = 0
    for r, g, b in px:
        if b < 190 or r < 120 or r <= g + 8:   # quick reject: lavender has strong blue and red above green
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if 0.69 <= h <= 0.81 and s >= 0.2 and v >= 0.75:
            n += 1
    return n


def paint_out_callout(im):
    """AF-01-fence-clean: paint out the segment callout (crop px x 766-1494, y 24-138). The patch is the barbed-wire dashes
    (a 26 px period, copied from the clear run left of it, x 300-716), lightened with the left post's top and its two
    arms shifted onto the centre post (posts at x 120 and 980)."""
    a = np.asarray(im).copy()
    x0, x1, y0, y1 = 764, 1496, 22, 140
    xs = np.arange(x0, x1)
    a[y0:y1, x0:x1] = a[y0:y1, 300 + (xs - 300) % 416]
    d0, d1 = 875, 1090                       # the centre post's arms: the left post's (x 15-230) moved by +860
    a[y0:y1, d0:d1] = np.maximum(a[y0:y1, d0:d1], a[y0:y1, d0 - 860:d1 - 860])
    return Image.fromarray(a)


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    sizes, bad = {}, []
    for name, (f, (x, y, w, h)) in CROPS.items():
        im = Image.open(os.path.join(src, f)).convert("RGB").crop((x, y, x + w, y + h))
        if name == "AF-01-fence-clean":
            im = paint_out_callout(im)
        n = lavender(im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata())
        print(f"{name}: {w}x{h} from {f} · lavender pixels {n}")
        if n > 12:   # a few isolated anti-aliased pixels where red meets blue; a lavender line of text is thousands
            bad.append(f"{name} ({n})")
        im.save(os.path.join(out, name + ".png"), optimize=True)
        sizes[name] = [w // 2, h // 2]
    if bad:
        print("lavender found in: " + ", ".join(bad), file=sys.stderr)
        sys.exit(1)
    print(json.dumps(sizes))


if __name__ == "__main__":
    main()
