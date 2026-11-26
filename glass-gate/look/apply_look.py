"""Helper B — pipeline stage 2: gate .blend -> look/gate_look.blend

    /opt/blender-env/venv/bin/python look/apply_look.py --gate hardware/gate.blend --studio dark --out look/gate_look.blend
    /opt/blender-env/venv/bin/python look/apply_look.py --gate proxy --studio dark            (Helper B's stand-in gate)

Opens the gate, replaces the placeholder materials by name, makes the scene alive-ready (properties, wave_u check,
glow lights), builds the chosen studio, sets the recommended Cycles settings and saves.
From another script:   import apply_look; info = apply_look.apply(scene, studio_variant='dark')
"""
import bpy, os, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
for p in (HERE, os.path.join(ROOT, 'shared')):
    if p not in sys.path:
        sys.path.insert(0, p)

import gg_common as gg
import materials, studio, alive, settings


def ensure_textures():
    need = ('lcd_idle.png', 'lcd_grant.png', 'wing_idle.png', 'wing_grant.png', 'badge.png', 'pcb_traces.png')
    if not all(os.path.exists(os.path.join(HERE, 'tex', n)) for n in need):
        import make_textures
        make_textures.main()


def open_gate(gate):
    """gate: path of a .blend, or 'proxy'. Returns the scene."""
    if gate == 'proxy':
        import proxy_gate
        sc = gg.reset_scene()
        proxy_gate.build_proxy(sc)
        return sc
    path = gate if os.path.isabs(gate) else os.path.join(ROOT, gate)
    bpy.ops.wm.open_mainfile(filepath=path)
    return bpy.context.scene


def fix_screen_uvs(scene, verbose=True):
    """Text must read correctly: on SCREEN_LCD / SCREEN_WING / BADGE faces the UV map must not be mirrored when the
    face is seen from its front. Mirrored halves of the gate often are; flip U on those faces (in this copy only)."""
    fixed = []
    for ob in scene.objects:
        if ob.type != 'MESH' or not ob.data.uv_layers:
            continue
        me = ob.data
        slots = {i for i, s in enumerate(ob.material_slots)
                 if s.material and materials.base_name(s.material.name) in ('SCREEN_LCD', 'SCREEN_WING', 'BADGE')}
        if not slots:
            continue
        uv = me.uv_layers.active.data
        flip_det = ob.matrix_world.to_3x3().determinant() < 0
        todo = []
        for p in me.polygons:
            if p.material_index not in slots or len(p.loop_indices) < 3:
                continue
            # signed UV area: positive = counter-clockwise in UV = not mirrored (loops run CCW round the normal)
            a = 0.0
            ls = list(p.loop_indices)
            for i in range(len(ls)):
                u0, v0 = uv[ls[i]].uv; u1, v1 = uv[ls[(i + 1) % len(ls)]].uv
                a += u0 * v1 - u1 * v0
            if abs(a) < 1e-9:
                continue
            if (a < 0) != flip_det:
                todo.append(p)
        if todo and len(todo) >= 0.5 * sum(1 for p in me.polygons if p.material_index in slots):
            for p in me.polygons:
                if p.material_index in slots:
                    for li in p.loop_indices:
                        uv[li].uv.x = 1.0 - uv[li].uv.x
            fixed.append(ob.name)
    if fixed and verbose:
        print(f'[apply_look] mirrored UVs flipped on: {fixed}')
    return fixed


def apply(scene=None, studio_variant='dark', quality='default', led_mode=None):
    scene = scene or bpy.context.scene
    ensure_textures()
    if led_mode:
        materials.LED_MODE = led_mode
    report = materials.apply_materials(scene)
    fix_screen_uvs(scene)
    glow = alive.setup_alive(scene)
    st = studio.build_studio(studio_variant, scene)
    if scene.render.engine != 'CYCLES':
        gg.setup_cycles(scene, 'test')
    settings.recommended(scene, quality)
    return {'materials': report, 'studio': st, 'glow_lights': glow}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gate', default='hardware/gate.blend', help="gate .blend, or 'proxy'")
    ap.add_argument('--studio', default='dark', choices=studio.VARIANTS)
    ap.add_argument('--out', default='look/gate_look.blend')
    ap.add_argument('--quality', default='default', choices=list(settings.QUALITY))
    ap.add_argument('--led-mode', default=None, choices=('hybrid', 'mesh'))
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None)
    sc = open_gate(a.gate)
    apply(sc, a.studio, a.quality, a.led_mode)
    out = a.out if os.path.isabs(a.out) else os.path.join(ROOT, a.out)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    try:
        bpy.ops.file.make_paths_relative()
        bpy.ops.wm.save_mainfile()
    except Exception as e:
        print('[apply_look] could not make paths relative:', e)
    print('[apply_look] saved', out)


if __name__ == '__main__':
    main()
