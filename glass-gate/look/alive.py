"""Helper B — the ALIVE system (the light wave that travels through the gate).

Everything is driven by a handful of custom properties on the SCENE. The shaders read them through
Attribute nodes (type 'View Layer'); the glow lights read them through drivers (simple expressions, no Python
needed at render time). They are ordinary animatable properties, so the keys live in the scene's action and
survive saving the .blend and re-opening it from another script.

    import alive
    alive.key_alive(scene, frame, power=None, wave=None, grant=None, screens=None, ir=None, house=None)

    power    0..1       master. 0 = every emissive and every glow light is dark. 1 = alive.
    wave     -0.1..1.1  wave front position in `wave_u` space. An LED switches on when the front passes its wave_u:
                        hot white head, short tail, then the steady colour.
    grant    0..1       0 = idle blue-violet, 1 = access-granted green. LEDs AHEAD of the front show `grant` x idle:
                          first pass  : grant 0, wave -0.1 -> 1.1   dark gate lights up blue-violet
                          green pass  : jump to grant 1 / wave -0.1 (looks identical to grant 0 / wave 1.1),
                                        then wave -0.1 -> 1.1       green wave runs through the idle gate
                          no wave     : keep wave at 1.1 and blend grant 0 <-> 1 for a plain cross-fade
                        Screens and badge switch to their granted picture as grant crosses 0.5.
    screens  0..1       boot of the reader LCD and the transparent wing displays (0 = black LCD, clear wings).
    ir       0..1       the face-camera IR dots.
    house    0..1       OPTIONAL studio dimmer (default 1 = untouched): scales every studio light, the world and the
                        backdrop glow, so the LEDs can take over at the drop.

Anything left None is not touched. Keys are LINEAR by default (pass interp='BEZIER' for eased keys).

Convenience: set_alive(scene, **values) sets values without keys (for stills); key_first_wave() / key_grant_wave()
write the canonical passes; setup_alive(scene) builds the glow lights (apply_look.py already calls it).
"""
import bpy, math
from mathutils import Vector

import materials as M

PROPS = {   # name: (scene property, default, min, max)
    'power': ('gg_power', 0.0, 0.0, 1.0),
    'wave': ('gg_wave', -0.1, -0.1, 1.1),
    'grant': ('gg_grant', 0.0, 0.0, 1.0),
    'screens': ('gg_screens', 0.0, 0.0, 1.0),
    'ir': ('gg_ir', 0.0, 0.0, 1.0),
    'house': ('gg_house', 1.0, 0.0, 1.0),
}
GLOW_COLLECTION = 'GG_ALIVE_GLOW'
GLOW_WATTS = 340.0       # total steady power of the glow lights (shared between them by emitting area)
GLOW_HEAD = 2.5          # extra gain while the wave head is at a light (x steady)
GLOW_EDGE = 0.20         # how soft a glow light switches on, in wave_u (lights are sparse, so softer than the strip)


# ----------------------------------------------------------------------------------------------- properties
def ensure_props(scene=None):
    scene = scene or bpy.context.scene
    M.ensure_ctrl(scene)
    for name, (key, default, lo, hi) in PROPS.items():
        if key not in scene:
            scene[key] = float(default)
        try:
            scene.id_properties_ui(key).update(min=lo, max=hi, soft_min=lo, soft_max=hi, description=f'HYALO alive: {name}')
        except Exception:
            pass
    return scene


def set_alive(scene=None, **values):
    """Set values immediately, no keyframes (for stills). e.g. set_alive(scene, power=1, wave=1.1, screens=1, ir=1)"""
    scene = ensure_props(scene)
    for name, v in values.items():
        if v is None:
            continue
        scene[PROPS[name][0]] = float(v)
    scene.update_tag()
    for vl in scene.view_layers:
        vl.update()


def get_alive(scene=None):
    scene = ensure_props(scene)
    return {name: scene[key] for name, (key, *_r) in PROPS.items()}


def _fcurves(idblock):
    ad = idblock.animation_data
    if ad is None or ad.action is None:
        return []
    act = ad.action
    out = []
    if hasattr(act, 'layers'):                       # Blender 4.4+ / 5.x layered actions
        for layer in act.layers:
            for strip in layer.strips:
                for cb in getattr(strip, 'channelbags', []):
                    out.extend(cb.fcurves)
    elif hasattr(act, 'fcurves'):
        out.extend(act.fcurves)
    return out


def key_alive(scene, frame, power=None, wave=None, grant=None, screens=None, ir=None, house=None, interp='LINEAR'):
    """Insert keyframes at `frame` for every value that is not None."""
    scene = ensure_props(scene)
    given = dict(power=power, wave=wave, grant=grant, screens=screens, ir=ir, house=house)
    for name, v in given.items():
        if v is None:
            continue
        key, default, lo, hi = PROPS[name]
        scene[key] = float(min(max(v, lo), hi))
        path = f'["{key}"]'
        scene.keyframe_insert(data_path=path, frame=frame)
        for fc in _fcurves(scene):
            if fc.data_path == path:
                for kp in fc.keyframe_points:
                    if abs(kp.co[0] - frame) < 1e-4:
                        kp.interpolation = interp
                fc.update()


def clear_alive_keys(scene):
    """Remove every alive keyframe (values stay as they are)."""
    paths = {f'["{key}"]' for key, *_r in PROPS.values()}
    ad = scene.animation_data
    if ad is None or ad.action is None:
        return
    act = ad.action
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in layer.strips:
                for cb in getattr(strip, 'channelbags', []):
                    for fc in [f for f in cb.fcurves if f.data_path in paths]:
                        cb.fcurves.remove(fc)
    else:
        for fc in [f for f in act.fcurves if f.data_path in paths]:
            act.fcurves.remove(fc)


def key_first_wave(scene, f0, f1, power_frames=4, screens_at=None, screens_frames=45, ir_at=None):
    """Canonical first pass: dark gate -> the wave runs f0..f1 -> steady idle.
    Screens boot at `screens_at` (default: when the front reaches the reader, ~35 % of the pass)."""
    key_alive(scene, f0 - 1, power=0.0, wave=-0.1, grant=0.0, screens=0.0, ir=0.0)
    key_alive(scene, f0 + power_frames, power=1.0)
    key_alive(scene, f0, wave=-0.1)
    key_alive(scene, f1, wave=1.1)
    s0 = screens_at if screens_at is not None else int(f0 + 0.35 * (f1 - f0))
    key_alive(scene, s0, screens=0.0); key_alive(scene, s0 + screens_frames, screens=1.0)
    i0 = ir_at if ir_at is not None else s0 + screens_frames // 2
    key_alive(scene, i0, ir=0.0); key_alive(scene, i0 + 6, ir=1.0)


def key_grant_wave(scene, f0, f1):
    """Green pass: an idle gate (grant 0, wave 1.1) turns green as the front runs f0..f1.
    Uses the look-alike jump (grant 0, wave 1.1) -> (grant 1, wave -0.1) between frame f0-1 and f0."""
    key_alive(scene, f0 - 1, wave=1.1, grant=0.0)
    key_alive(scene, f0, wave=-0.1, grant=1.0)
    key_alive(scene, f1, wave=1.1, grant=1.0)


def key_back_to_idle(scene, f0, f1):
    """Green -> idle as a plain cross-fade (wave stays at 1.1)."""
    key_alive(scene, f0, grant=1.0, wave=1.1)
    key_alive(scene, f1, grant=0.0, wave=1.1)


# ----------------------------------------------------------------------------------------------- wave_u safety net
def _uses(ob, prefix):
    return ob.type == 'MESH' and any(s.material and M.base_name(s.material.name) == prefix for s in ob.material_slots)


def ensure_wave_u(scene=None, verbose=True):
    """Every LED_STRIP mesh must carry the float point attribute `wave_u`. If one does not, derive it from the
    world Y of its vertices (0.05 at the entry end .. 0.80 at the exit end) and say so."""
    scene = scene or bpy.context.scene
    fixed = []
    for ob in scene.objects:
        if not (_uses(ob, 'LED_STRIP') or _uses(ob, 'LED_DIFFUSER')):
            continue
        me = ob.data
        at = me.attributes.get('wave_u')
        if at is not None and at.domain == 'POINT' and at.data_type == 'FLOAT':
            continue
        if at is not None:
            me.attributes.remove(at)
        at = me.attributes.new('wave_u', 'FLOAT', 'POINT')
        mw = ob.matrix_world
        for i, v in enumerate(me.vertices):
            y = (mw @ v.co).y
            at.data[i].value = min(1.0, max(0.0, 0.05 + 0.75 * (y + 0.70) / 1.40))
        fixed.append(ob.name)
    if fixed and verbose:
        print(f'[alive] WARNING: {len(fixed)} LED meshes had no wave_u; derived from world Y: {fixed[:8]}{"..." if len(fixed) > 8 else ""}')
    return fixed


# ----------------------------------------------------------------------------------------------- glow lights
LED_MATS = ('LED_STRIP', 'LED_DIFFUSER')


def _led_samples(scene):
    """(world centre, area, wave_u, object) for every polygon of an LED run (chips and light-guide bands)."""
    out = []
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        led_slots = {i for i, s in enumerate(ob.material_slots) if s.material and M.base_name(s.material.name) in LED_MATS}
        if not led_slots:
            continue
        me = ob.data
        at = me.attributes.get('wave_u')
        mw = ob.matrix_world
        sc = abs(mw.to_scale().x * mw.to_scale().y * mw.to_scale().z) ** (2.0 / 3.0)
        for p in me.polygons:
            if p.material_index not in led_slots:
                continue
            u = sum(at.data[v].value for v in p.vertices) / len(p.vertices) if at else 0.5
            out.append((mw @ p.center, p.area * sc, u, ob))
    return out


def _cluster(samples, cell):
    """Coarse clusters: one per stretch of rail (both sides and the column ring together), one per accent bar, one
    per wing edge. Kept apart by the root object, by `cell` metres along the lane and by height."""
    bins = {}
    for co, area, u, ob in samples:
        root = ob
        while root.parent is not None:
            root = root.parent
        side = 0 if abs(co.x) < 1e-6 else (1 if co.x > 0 else -1)
        key = (root.name, side, round(co.y / cell), round(co.z / 0.45))
        b = bins.setdefault(key, {'co': Vector(), 'area': 0.0, 'u': 0.0, 'obs': {}})
        b['co'] += co * area; b['area'] += area; b['u'] += u * area
        b['obs'][ob.name] = b['obs'].get(ob.name, 0.0) + area
    out = []
    for b in bins.values():
        if b['area'] <= 0:
            continue
        out.append({'co': b['co'] / b['area'], 'area': b['area'], 'u': b['u'] / b['area'],
                    'owner': max(b['obs'], key=b['obs'].get)})
    return out


def _driver_var(drv, name, scene, key):
    v = drv.variables.new(); v.name = name; v.type = 'SINGLE_PROP'
    t = v.targets[0]; t.id_type = 'SCENE'; t.id = scene; t.data_path = f'["{key}"]'


def remove_glow(scene=None):
    coll = bpy.data.collections.get(GLOW_COLLECTION)
    if coll is None:
        return
    for ob in list(coll.objects):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data and data.users == 0:
            bpy.data.lights.remove(data)
    bpy.data.collections.remove(coll)


def fit_wave_axis(scene, samples=None):
    """Tell the glass shader where the wave is in space: wave_u ~ a * world_y + b along the rails (scene gg_wave_a,
    gg_wave_b) and the height of the LED seam (gg_led_z). Fitted to the long LED runs (the rails)."""
    samples = samples if samples is not None else _led_samples(scene)
    by = {}
    for co, area, u, ob in samples:
        by.setdefault(ob.name, []).append((co.y, co.z, u, area))
    sy = syy = su = suy = sw = sz = 0.0
    for name, rows in by.items():
        ys = [r[0] for r in rows]
        if max(ys) - min(ys) < 0.8:                 # not a rail
            continue
        for y, z, u, w in rows:
            sy += w * y; syy += w * y * y; su += w * u; suy += w * u * y; sw += w; sz += w * z
    if sw <= 0:
        return None
    den = sw * syy - sy * sy
    if abs(den) < 1e-12:
        return None
    a = (sw * suy - sy * su) / den
    b = (su - a * sy) / sw
    scene['gg_wave_a'] = float(a); scene['gg_wave_b'] = float(b); scene['gg_led_z'] = float(sz / sw)
    M.set_wave_axis(a, b, sz / sw)
    return a, b, sz / sw


def setup_alive(scene=None, max_lights=14, radius=0.035, verbose=True):
    """Make the scene alive-ready: properties, wave_u safety net, the wave axis for the glass, the glow lights.

    Glow lights (LED_MODE 'hybrid'): the LED runs are grouped into a few clusters (a stretch of rail, an accent bar, a
    wing edge); each gets ONE sphere light, parented to the LED object it stands for (so it follows the part), a few
    centimetres below and on the lane side of the run (under the rail spine, where it can see the floor on both sides).
    Together they carry GLOW_WATTS, shared by emitting area, and replay the shader's wave law for their mean wave_u.
    They are diffuse-only: the LED meshes themselves are what the eye, mirrors and refractions see.
    Idempotent: call it again after the LED objects changed.
    """
    scene = ensure_props(scene)
    ensure_wave_u(scene, verbose)
    remove_glow(scene)
    bpy.context.view_layer.update()
    samples = _led_samples(scene)
    axis = fit_wave_axis(scene, samples)
    led_mat = [m for m in bpy.data.materials if M.base_name(m.name) == 'LED_STRIP']
    mode = led_mat[0].get('gg_led_mode', M.LED_MODE) if led_mat else M.LED_MODE
    if mode != 'hybrid':
        if verbose:
            print('[alive] LED_MODE is "mesh": no glow lights, the LED meshes light the scene themselves')
        return []
    if not samples:
        if verbose:
            print('[alive] no LED geometry found: no glow lights')
        return []
    cell = 0.50
    clusters = _cluster(samples, cell)
    while len(clusters) > max_lights and cell < 3.0:
        cell *= 1.2
        clusters = _cluster(samples, cell)
    coll = bpy.data.collections.new(GLOW_COLLECTION)
    scene.collection.children.link(coll)
    # share of the power: by emitting area, but no cluster below 40 % of an even share (small accent bars still count)
    tot_area = sum(c['area'] for c in clusters)
    share = [max(c['area'] / tot_area, 0.4 / len(clusters)) for c in clusters]
    norm = sum(share)
    lights = []
    order = sorted(range(len(clusters)), key=lambda i: clusters[i]['u'])
    for n_, i in enumerate(order):
        c = clusters[i]
        ld = bpy.data.lights.new(f'GG_GLOW_{n_:02d}', 'POINT')
        ld.shadow_soft_size = radius
        ld.use_shadow = True
        base = GLOW_WATTS * share[i] / norm
        ob = bpy.data.objects.new(ld.name, ld)
        coll.objects.link(ob)
        owner = bpy.data.objects.get(c['owner'])
        co = c['co'].copy()
        co.x -= 0.02 * (1 if co.x > 0 else -1)          # toward the lane
        co.z = max(0.08, co.z - 0.06)                   # under the seam / spine
        ob.matrix_world.translation = co
        if owner is not None:
            ob.parent = owner
            ob.matrix_parent_inverse = owner.matrix_world.inverted()
        ob['gg_wave_u'] = c['u']; ob['gg_energy'] = base
        ob.visible_camera = False; ob.visible_glossy = False; ob.visible_transmission = False
        u = round(c['u'], 4)
        on = f'clamp((w-{u})/{GLOW_EDGE}+0.5)'
        head = f'{on}*(1-clamp((w-{u})/{M.LED_TAIL * 1.5:.3f}))**2'
        fc = ld.driver_add('energy'); d = fc.driver; d.type = 'SCRIPTED'
        for n, k in (('p', 'gg_power'), ('w', 'gg_wave'), ('g', 'gg_grant')):
            _driver_var(d, n, scene, k)
        d.expression = f'{base:.5f}*p*({on}+(1-{on})*g+{GLOW_HEAD:.2f}*{head})'
        for ch in range(3):
            fc = ld.driver_add('color', ch); d = fc.driver; d.type = 'SCRIPTED'
            for n, k in (('w', 'gg_wave'), ('g', 'gg_grant')):
                _driver_var(d, n, scene, k)
            d.expression = f'lerp(lerp({M.COL_IDLE[ch]:.3f},{M.COL_GRANT[ch]:.3f},g*{on}),1.0,0.5*{head})'
        lights.append(ob)
    if verbose:
        tot = sum(o['gg_energy'] for o in lights)
        ax = f', wave axis u = {axis[0]:.3f}*y + {axis[1]:.3f}, seam z = {axis[2]:.3f}' if axis else ''
        print(f'[alive] {len(lights)} glow lights for {len(samples)} LED polygons, {tot:.0f} W in total (steady){ax}')
    return lights


# ----------------------------------------------------------------------------------------------- optional bloom
GLARE_GROUP = 'GG_GLARE'


def setup_glare(scene=None, strength=0.30, threshold=4.0, size=0.42, saturation=1.3, clamp=14.0):
    """OPTIONAL bloom, in Blender's compositor (applied to every render of this scene, saved with the .blend).

    The LED chips are a couple of millimetres tall: in a wide shot they are thinner than a pixel and tone-map to a
    white hairline. A fog-glow bloom puts their COLOUR back around them (and gives the hottest glass glints a small
    halo). Only pixels brighter than `threshold` (scene-linear) bloom, so the unlit build is hardly touched.
    Remove with remove_glare(scene). Costs well under a second per frame."""
    scene = scene or bpy.context.scene
    ng = bpy.data.node_groups.get(GLARE_GROUP)
    if ng is not None:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new(GLARE_GROUP, 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers'); rl.scene = scene
    gl = ng.nodes.new('CompositorNodeGlare'); gl.name = 'Glare'
    out = ng.nodes.new('NodeGroupOutput')

    def put(key, value):
        for s in gl.inputs:
            if s.identifier == key or s.name == key:
                s.default_value = value
                return True
        return False
    put('Type', 'Bloom'); put('Quality', 'High')
    put('Highlights Threshold', threshold); put('Highlights Smoothness', 0.5)
    put('Clamp Highlights', True); put('Maximum Highlights', clamp)       # a glint on metal must not throw a fog bank
    put('Strength', strength); put('Saturation', saturation); put('Size', size)
    ng.links.new(rl.outputs['Image'], gl.inputs['Image'])
    ng.links.new(gl.outputs['Image'], out.inputs[0])
    scene.compositing_node_group = ng
    scene.render.use_compositing = True
    scene.render.compositor_device = 'CPU'       # the GPU compositor needs a display context and kills a headless bpy
    return ng


def remove_glare(scene=None):
    scene = scene or bpy.context.scene
    scene.compositing_node_group = None
    ng = bpy.data.node_groups.get(GLARE_GROUP)
    if ng is not None:
        bpy.data.node_groups.remove(ng)
