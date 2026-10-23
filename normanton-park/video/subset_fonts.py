"""Subset the CJK fonts to the glyphs the video actually uses (run before committing).
Full fonts: assets/fonts/fetch_fonts.sh. Subsets are written in place with the same names."""
import os, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, 'assets', 'fonts')
text = ''
for f in ['scenes.js', 'timing.js', 'index.html', 'engine.js']:
    text += open(os.path.join(HERE, f), encoding='utf-8').read()
chars = set(text) | set(chr(c) for c in range(0x20, 0x7F)) | set('，。：；！？（）『』「」《》、…—–·≈≥≤×→−％＋')
chars |= set('零一二三四五六七八九十百千万亿年月日')
txt = os.path.join(HERE, 'assets', 'fonts', 'glyphs.txt'); open(txt, 'w', encoding='utf-8').write(''.join(sorted(chars)))
for name in os.listdir(F):
    if not name.endswith('.ttf'): continue
    src = os.path.join(F, name); size0 = os.path.getsize(src)
    if size0 < 2_000_000: print('skip (already small)', name); continue
    subprocess.check_call(['pyftsubset', src, f'--text-file={txt}', '--layout-features=*', '--no-hinting', f'--output-file={src}.tmp'])
    os.replace(src + '.tmp', src); print(name, size0 // 1024, 'KB ->', os.path.getsize(src) // 1024, 'KB')
