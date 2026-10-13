# Text positions in the V11 product frames, so deck markers point at real UI elements.
# python3 extract_anchors.py <v11SvgDir> <out.json>
import re, sys, json, os, html
src, out = sys.argv[1], sys.argv[2]
res = {}
for f in sorted(os.listdir(src)):
    if not re.match(r'V11-(0[1-9]|1[0-2])-.*\.svg$', f):
        continue
    s = open(os.path.join(src, f), encoding='utf8').read()
    s = re.sub(r'data:image/[^"]+', '', s)
    items = []
    for m in re.finditer(r'<text x="([-\d.]+)" y="([-\d.]+)"([^>]*)>(.*?)</text>', s, re.S):
        x, y, attrs, body = float(m.group(1)), float(m.group(2)), m.group(3), m.group(4)
        size = re.search(r'font-size="([\d.]+)"', attrs)
        t = html.unescape(re.sub(r'<[^>]+>', '', body))
        items.append([round(x, 1), round(y, 1), float(size.group(1)) if size else 14, t])
    res[f[:-4]] = items
json.dump(res, open(out, 'w'), ensure_ascii=False)
print({k: len(v) for k, v in res.items()})
