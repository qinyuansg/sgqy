"""Freeze the animated scene for the final render: a copy with every image texture packed inside the .blend, plus
the timeline it was built with.  A plain file copy is NOT enough: the textures are stored as relative paths and a
copy in another folder renders them as missing (flat magenta).

  /opt/blender-env/venv/bin/python director/freeze_scene.py [--blend director/scene.blend] [--out renders/final/scene_final.blend]
"""
import bpy, sys, os, shutil, argparse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared'))
import gg_common as gg

ap = argparse.ArgumentParser()
ap.add_argument('--blend', default=gg.path('director', 'scene.blend'))
ap.add_argument('--out', default=gg.path('renders', 'final', 'scene_final.blend'))
a = ap.parse_args()
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
n = 0
for im in bpy.data.images:
    if im.source != 'FILE':
        continue
    if im.size[0] == 0:
        raise SystemExit(f'[freeze] texture missing: {im.name} ({bpy.path.abspath(im.filepath)})')
    if not im.packed_file:
        im.pack(); n += 1
    print(f'[freeze] packed {im.name} {im.size[0]}x{im.size[1]}')
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out), copy=True)
shutil.copyfile(gg.path('shared', 'timeline.json'), os.path.join(os.path.dirname(os.path.abspath(a.out)), 'timeline_final.json'))
print(f'[freeze] {a.out}  ({n} images packed)')
