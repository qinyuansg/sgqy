"""Preview stills of hardware/gate.blend ('test' preset, one render at a time).

    /opt/blender-env/venv/bin/python hardware/render_previews.py <shot> [<shot> ...]

shots: see SHOTS below (clay, exploded, hero, glass, glass2, glass_seam, gearbox, gearbox_open, gear_top, motor, drive,
reader, reader_top, reader_macro, rfid, pcb, pcb_open, psu, seam, clamp, base, column_top, speaker, lcd_side, post_out ...)
"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'shared'))
import bpy
from mathutils import Vector
import gg_common

OUT = os.path.join(HERE, 'preview')
GLASS = ('GLASS_BODY', 'GLASS_WING', 'GLASS_LENS')


def look_at(cam, loc, tgt):
    cam.location = loc
    d = Vector(tgt) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def add_area(name, loc, tgt, size, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA')
    l.shape = 'RECTANGLE'
    l.size, l.size_y = size
    l.energy = power
    l.color = color
    o = bpy.data.objects.new(name, l)
    bpy.context.scene.collection.objects.link(o)
    look_at(o, loc, tgt)
    return o


def studio(sc, dark=True, k=0.5):
    w = bpy.data.worlds.new('W')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (0.02, 0.022, 0.03, 1) if dark else (0.12, 0.12, 0.13, 1)
    bg.inputs[1].default_value = 1.0
    me = bpy.data.meshes.new('floor')
    s = 6.0
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    fl = bpy.data.objects.new('PREVIEW_floor', me)
    m = bpy.data.materials.new('PREVIEW_floor')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.08, 0.085, 0.1, 1) if dark else (0.25, 0.25, 0.26, 1)
    b.inputs['Roughness'].default_value = 0.35
    me.materials.append(m)
    sc.collection.objects.link(fl)
    fl.location.z = -0.0005
    add_area('key', (1.8, -2.2, 2.6), (0, 0, 0.5), (2.0, 2.0), 900 * k)
    add_area('rim', (-2.2, 2.0, 1.8), (0, 0, 0.6), (1.2, 2.4), 700 * k, (0.85, 0.9, 1.0))
    add_area('fill', (-2.0, -2.4, 1.0), (0, 0, 0.5), (2.5, 1.5), 250 * k)
    add_area('top', (0, 0, 3.0), (0, 0, 0), (1.0, 3.0), 500 * k)


def plain_glass(lit=False):
    """Plain Glass BSDF on every GLASS_* material. lit=True adds the usual
    'transparent to shadow rays' trick so the inner parts receive direct light
    (preview only - the look helper owns the real shader)."""
    for n in GLASS:
        m = bpy.data.materials.get(n)
        if not m:
            continue
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        g = nt.nodes.new('ShaderNodeBsdfGlass')
        g.inputs['IOR'].default_value = 1.52
        g.inputs['Roughness'].default_value = 0.0
        g.inputs['Color'].default_value = (0.97, 0.985, 1.0, 1)
        if not lit:
            nt.links.new(g.outputs[0], out.inputs[0])
            continue
        lp = nt.nodes.new('ShaderNodeLightPath')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        tr.inputs['Color'].default_value = (0.93, 0.95, 0.98, 1)
        mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs[0])
        nt.links.new(g.outputs[0], mx.inputs[1])
        nt.links.new(tr.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], out.inputs[0])


def emit_diffusers(strength=14.0, color=(0.30, 0.28, 1.0, 1)):
    """Proof look for the light guides: plain emission on LED_DIFFUSER (and the chips)."""
    for n in ('LED_DIFFUSER', 'LED_STRIP'):
        m = bpy.data.materials.get(n)
        if not m:
            continue
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Color'].default_value = color
        e.inputs['Strength'].default_value = strength
        nt.links.new(e.outputs[0], out.inputs[0])


def clay():
    m = bpy.data.materials.new('PREVIEW_clay')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.42, 0.42, 0.42, 1)
    b.inputs['Roughness'].default_value = 0.6
    for o in bpy.data.objects:
        if o.type == 'MESH' and not o.name.startswith('PREVIEW'):
            for s in o.material_slots:
                s.material = m


def hide(pred):
    for o in bpy.data.objects:
        if o.type == 'MESH' and pred(o.name):
            o.hide_render = True


def explode(scale=1.0, side=None):
    man = json.load(open(os.path.join(HERE, 'manifest.json')))
    lift = {1: 0.0, 2: 0.55, 3: 0.2, 4: 1.25, 5: 1.7, 6: 0.0}
    for p in man['parts']:
        o = bpy.data.objects[p['name']]
        d = Vector(p['insert_dir'])
        w, k = p['wave'], p['order']
        if w == 2:
            off = Vector((0, 0, 0.05 + 0.085 * k))
        elif w == 6 or abs(d.x) > 0.5:
            off = d * (0.25 + 0.06 * k)
        elif w == 5:
            off = Vector((0, 0, 0.12 + 0.045 * k))
        elif w == 4:
            off = Vector((0, 0, 0.75 + 0.06 * k))
        elif w == 3:
            off = Vector((0, 0, 0.02 * k)) + Vector((0, 0.25 if o.matrix_world.translation.y > 0 else -0.25, 0))
        else:
            off = Vector((0, 0, 0.03 * k))
        if w == 1 and k == 1:
            off = Vector((0, 0, 0))
        o.location = o.location + off * scale


SHOTS = {
    # name: (cam loc, target, lens mm, options)
    'clay': ((1.9, -2.3, 1.5), (0, 0, 0.5), 50, dict(clay=True, dark=False)),
    'hero': ((1.7, -2.2, 1.25), (0, 0, 0.5), 50, dict(glass='lit')),
    'glass': ((-0.2, -1.9, 1.0), (-0.38, -0.1, 0.55), 50, dict(glass=True)),
    'glass2': ((1.25, 1.75, 1.15), (0.2, 0.0, 0.55), 50, dict(glass=True)),
    'exploded': ((2.6, -3.4, 2.3), (0, 0, 1.05), 50, dict(glass='lit', explode=1.0)),
    'gearbox': ((-0.38 + 0.26, -0.3, 0.36), (-0.38, 0, 0.215), 70, dict(glass='lit')),
    'gearbox_open': ((-0.38 + 0.17, -0.2, 0.36), (-0.38, 0, 0.222), 70, dict(glass='lit', hide=('GLS_column', 'DRV_cage', 'DRV_spring', 'DRV_encoder', 'DRV_encdisc'))),
    'motor': ((-0.38 + 0.3, -0.34, 0.2), (-0.38, 0, 0.13), 70, dict(glass='lit')),
    'drive': ((-0.38 + 0.45, -0.55, 0.42), (-0.38, 0, 0.22), 60, dict(glass='lit')),
    'reader': ((-0.38 + 0.3, -0.98, 1.36), (-0.38, -0.47, 0.98), 50, dict(glass='lit')),
    'reader_macro': ((-0.38 + 0.12, -0.52, 1.14), (-0.38, -0.33, 1.0), 60, dict(glass='lit')),
    'rfid': ((-0.38 + 0.1, -0.78, 1.16), (-0.38, -0.6, 0.985), 60, dict(glass='lit')),
    'pcb': ((-0.38 + 0.42, -0.9, 0.45), (-0.38, -0.615, 0.30), 50, dict(glass='lit')),
    'pcb_open': ((-0.38 + 0.33, -0.78, 0.42), (-0.38, -0.615, 0.30), 50, dict(glass='lit', hide=('GLS_post', 'ELE_sensor', 'LED_accent'))),
    'psu': ((-0.38 + 0.42, 0.9, 0.35), (-0.38, 0.61, 0.16), 50, dict(glass='lit')),
    'post': ((-0.38 - 0.35, -1.15, 0.75), (-0.38, -0.66, 0.6), 60, dict(glass='lit')),
    'wing': ((-0.05, -0.9, 0.85), (-0.25, 0, 0.62), 50, dict(glass='lit')),
    'clamp': ((-0.38 + 0.25, -0.3, 0.62), (-0.38 + 0.07, 0, 0.53), 60, dict(glass='lit')),
    'top': ((0.0, -0.6, 1.9), (-0.2, -0.3, 0.9), 50, dict(glass='lit')),
    'seam': ((-0.38 + 0.25, -0.95, 1.02), (-0.38, -0.66, 0.94), 70, dict(glass='lit')),
    'gear_top': ((-0.38 + 0.03, -0.045, 0.40), (-0.38, 0, 0.222), 70, dict(glass='lit', hide=('GLS_column', 'DRV_cage', 'DRV_spring', 'DRV_encoder', 'DRV_encdisc', 'DRV_shaft', 'WING_', 'DRV_carrier'))),
    'reader_top': ((-0.38 + 0.05, -0.80, 1.52), (-0.38, -0.46, 1.0), 50, dict(glass='lit')),
    'speaker': ((-0.38 + 0.2, -0.12, 1.12), (-0.38, -0.215, 0.97), 70, dict(glass='lit')),
    'column_top': ((-0.38 + 0.3, -0.35, 1.08), (-0.38, 0, 0.93), 60, dict(glass='lit')),
    'post_out': ((-0.38 - 0.55, -1.05, 0.55), (-0.38, -0.62, 0.33), 50, dict(glass='lit')),
    'lcd_side': ((-0.38 + 0.34, -0.5, 0.99), (-0.38, -0.41, 0.965), 70, dict(glass='lit')),
    'glass_seam': ((-0.38 + 0.25, -0.95, 1.02), (-0.38, -0.66, 0.94), 70, dict(glass=True)),
    'led_entry': ((0.25, -3.25, 1.3), (0.0, 0.0, 0.52), 40, dict(glass='lit', emit=True, light=0.06)),
    'led_close': ((-0.38 + 0.5, -1.05, 1.13), (-0.38, -0.33, 0.93), 50, dict(glass='lit', emit=True, light=0.06)),
    'led_column': ((-0.38 + 0.42, -0.42, 1.06), (-0.38, 0.02, 0.9), 60, dict(glass='lit', emit=True, light=0.06)),
    'card': ((-0.38 + 0.16, -0.80, 1.13), (-0.38, -0.61, 1.0), 70, dict(glass='lit')),
    'base': ((-0.38 + 0.5, -0.5, 0.3), (-0.38, -0.2, 0.02), 50, dict(glass='lit', hide=('GLS_',))),
}


def render(shot):
    loc, tgt, lens, opt = SHOTS[shot]
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, 'gate.blend'))
    sc = bpy.context.scene
    gg_common.setup_cycles(sc, 'test')
    studio(sc, opt.get('dark', True), opt.get('light', 0.5))
    if opt.get('emit'):
        emit_diffusers()
    if opt.get('glass'):
        plain_glass(lit=opt.get('glass') == 'lit')
    if opt.get('clay'):
        clay()
    if opt.get('hide'):
        hide(lambda n: any(n.startswith(h) for h in opt['hide']))
    if opt.get('explode'):
        explode(opt['explode'])
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens
    cd.sensor_width = 36
    cd.clip_start = 0.01
    cam = bpy.data.objects.new('cam', cd)
    sc.collection.objects.link(cam)
    look_at(cam, loc, tgt)
    sc.camera = cam
    os.makedirs(OUT, exist_ok=True)
    gg_common.render_still(sc, os.path.join(OUT, shot + '.png'))


if __name__ == '__main__':
    for s in sys.argv[1:]:
        render(s)
