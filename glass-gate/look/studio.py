"""Helper B — studios for the HYALO G1 glass gate.

    import studio
    st = studio.build_studio('dark')        # 'dark' | 'violet' | 'highkey' | 'hdri'
    st['rig'].rotation_euler.z = ...        # every light hangs on one empty: turn the whole rig
    studio.aim_rig(st['rig'], camera)       # ...or turn it so the rim lights sit behind the gate for this camera

Every variant builds floor, backdrop, world and lights into the collection STUDIO and returns a dict:
    {'variant', 'collection', 'rig', 'floor', 'backdrop', 'world', 'lights': {name: object}, 'key', 'spark'}
Calling build_studio again replaces the previous studio. All studios are round (the backdrop is a surface of
revolution, the world has no seam), so they hold up from any azimuth.

Light energies: each light object carries a custom property `gg_energy` (watts); the real energy is driven as
gg_energy x scene["gg_house"] (the optional studio dimmer in alive.key_alive). To change a light's power, change
obj["gg_energy"] — not light.energy.

`spark` is the one small hard light: it draws the crisp coloured glass shadows on the floor, the sparkle on the
bevels, and it is the light the optional MNEE caustics hang on (studio.set_caustics).
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
HDRI = os.path.join(HERE, 'hdri', 'studio_small_09_2k.hdr')
VARIANTS = ('dark', 'violet', 'highkey', 'hdri')
COLLECTION = 'STUDIO'
DESIGN_AZIMUTH = math.radians(-53.5)       # camera azimuth (atan2(y, x)) the rigs were lit for


# ----------------------------------------------------------------------------------------------- helpers
def _clear_nodes(idblock):
    if idblock.node_tree is None:
        idblock.use_nodes = True
    nt = idblock.node_tree
    nt.nodes.clear()
    return nt


def _house_driver(owner, path, scene, base_expr_var=None, base=None, index=-1):
    """value = base x scene['gg_house']; base is a number, or an (object, custom-property) pair."""
    fc = owner.driver_add(path, index) if index >= 0 else owner.driver_add(path)
    d = fc.driver; d.type = 'SCRIPTED'
    v = d.variables.new(); v.name = 'h'; v.type = 'SINGLE_PROP'
    v.targets[0].id_type = 'SCENE'; v.targets[0].id = scene; v.targets[0].data_path = '["gg_house"]'
    if base_expr_var is not None:
        ob, key = base_expr_var
        v = d.variables.new(); v.name = 'e'; v.type = 'SINGLE_PROP'
        v.targets[0].id_type = 'OBJECT'; v.targets[0].id = ob; v.targets[0].data_path = f'["{key}"]'
        d.expression = 'e*h'
    else:
        d.expression = f'{base:.6f}*h'
    return fc


def remove_studio():
    coll = bpy.data.collections.get(COLLECTION)
    if coll is None:
        return
    for ob in list(coll.all_objects):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data is not None and data.users == 0:
            (bpy.data.lights if isinstance(data, bpy.types.Light) else bpy.data.meshes).remove(data)
    bpy.data.collections.remove(coll)
    for c in [c for c in bpy.data.collections if c.name.startswith('STUDIO_LL_')]:
        bpy.data.collections.remove(c)
    for m in [m for m in bpy.data.materials if m.name.startswith('STUDIO_') and m.users == 0]:
        bpy.data.materials.remove(m)
    for w in [w for w in bpy.data.worlds if w.name.startswith('STUDIO_')]:
        if w.animation_data:
            w.animation_data_clear()


class Rig:
    def __init__(self, scene, variant):
        self.scene = scene
        if 'gg_house' not in scene:
            scene['gg_house'] = 1.0
        remove_studio()
        self.coll = bpy.data.collections.new(COLLECTION)
        scene.collection.children.link(self.coll)
        self.rig = bpy.data.objects.new('STUDIO_RIG', None)
        self.rig.empty_display_size = 0.3
        self.coll.objects.link(self.rig)
        self.lights = {}
        self.out = {'variant': variant, 'collection': self.coll, 'rig': self.rig, 'lights': self.lights,
                    'floor': None, 'backdrop': None, 'world': None, 'key': None, 'spark': None}

    # --- lights
    def _finish(self, name, ld, loc, target, energy, camera=False):
        ob = bpy.data.objects.new(name, ld)
        self.coll.objects.link(ob)
        ob.parent = self.rig
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        ob['gg_energy'] = float(energy)
        ob.visible_camera = camera
        ld.energy = energy
        _house_driver(ld, 'energy', self.scene, base_expr_var=(ob, 'gg_energy'))
        self.lights[name.replace('STUDIO_', '')] = ob
        return ob

    def area(self, name, loc, target, size, energy, color=(1, 1, 1), spread=math.pi, camera=False):
        ld = bpy.data.lights.new('STUDIO_' + name, 'AREA')
        ld.shape = 'RECTANGLE'; ld.size, ld.size_y = size
        ld.color = color; ld.spread = spread
        return self._finish('STUDIO_' + name, ld, loc, target, energy, camera)

    def spot(self, name, loc, target, energy, cone=math.radians(34), blend=0.35, radius=0.02, color=(1, 1, 1)):
        ld = bpy.data.lights.new('STUDIO_' + name, 'SPOT')
        ld.spot_size = cone; ld.spot_blend = blend; ld.shadow_soft_size = radius; ld.color = color
        return self._finish('STUDIO_' + name, ld, loc, target, energy)

    # --- geometry
    def cyc(self, name, r_floor, fillet, height, material, segments=128, ring=16):
        """Round cyclorama: flat floor disc, fillet, vertical wall. One smooth mesh."""
        prof = [(0.0, 0.0), (r_floor * 0.25, 0.0), (r_floor * 0.6, 0.0), (r_floor, 0.0)]
        for i in range(1, ring + 1):
            a = (math.pi / 2) * i / ring
            prof.append((r_floor + fillet * math.sin(a), fillet * (1 - math.cos(a))))
        prof.append((r_floor + fillet, height))
        verts, faces = [(0.0, 0.0, 0.0)], []
        for (r, z) in prof[1:]:
            for s in range(segments):
                a = 2 * math.pi * s / segments
                verts.append((r * math.cos(a), r * math.sin(a), z))
        for s in range(segments):
            faces.append((0, 1 + s, 1 + (s + 1) % segments))
        for k in range(len(prof) - 2):
            for s in range(segments):
                a0 = 1 + k * segments + s; a1 = 1 + k * segments + (s + 1) % segments
                faces.append((a0, a0 + segments, a1 + segments, a1))
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        # normals must face the inside (up on the floor)
        if me.polygons[0].normal.z < 0:
            me.flip_normals()
        me.materials.append(material)
        ob = bpy.data.objects.new(name, me)
        self.coll.objects.link(ob)
        return ob

    def disc(self, name, radius, material, segments=96):
        """Flat floor disc (no wall): for studios whose backdrop is the world."""
        verts = [(0.0, 0.0, 0.0)]
        rings = [radius * f for f in (0.02, 0.06, 0.15, 0.4, 1.0)]
        for r in rings:
            verts += [(r * math.cos(2 * math.pi * s / segments), r * math.sin(2 * math.pi * s / segments), 0.0) for s in range(segments)]
        faces = [(0, 1 + s, 1 + (s + 1) % segments) for s in range(segments)]
        for k in range(len(rings) - 1):
            for s in range(segments):
                a0 = 1 + k * segments + s; a1 = 1 + k * segments + (s + 1) % segments
                faces.append((a0, a0 + segments, a1 + segments, a1))
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces); me.update()
        if me.polygons[0].normal.z < 0:
            me.flip_normals()
        me.materials.append(material)
        ob = bpy.data.objects.new(name, me)
        self.coll.objects.link(ob)
        return ob

    def world(self, name):
        w = bpy.data.worlds.get(name) or bpy.data.worlds.new(name)
        self.scene.world = w
        self.out['world'] = w
        return w, _clear_nodes(w)


def _mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    return m, _clear_nodes(m)


def _n(nt, typ, **attrs):
    n = nt.nodes.new(typ)
    for k, v in attrs.items():
        setattr(n, k, v)
    return n


def _house_attr(nt):
    n = _n(nt, 'ShaderNodeAttribute', attribute_type='VIEW_LAYER', attribute_name='gg_house')
    return n.outputs['Fac']


def floor_material(name, color, rough, rough_var=0.03, spec=0.5, coat=0.0, coat_rough=0.03, glow=None, fade=None, fillet=2.0, pool=None):
    """Lit floor (Principled) that blends into an optional self-lit wall gradient above the fillet.

    glow : (colour_low, colour_high, strength, z_peak, z_top) emission gradient of the wall (x gg_house)
    pool : (colour, r0, r1) a lighter patch of floor under the gate (full inside r0 metres, gone by r1): it is what
           shows the light pool, the glass shadows, the caustics and the LED colour, while the rest stays dark.
    fade : (colour, r0, r1) for a wall-less floor: between r0 and r1 metres from the centre the floor dissolves into a
           flat colour (the world's horizon colour), so there is no horizon line.
    """
    m, nt = _mat(name)
    out = _n(nt, 'ShaderNodeOutputMaterial')
    p = _n(nt, 'ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Specular IOR Level'].default_value = spec
    if coat:      # polished floor: a matt base that shows light pools, shadows and LED colour, under a sharp clear coat
        p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = coat_rough
        p.inputs['Coat IOR'].default_value = 1.5
    if pool is not None:
        p_col, pr0, pr1 = pool
        g0 = _n(nt, 'ShaderNodeNewGeometry')
        l0 = _n(nt, 'ShaderNodeVectorMath', operation='LENGTH'); nt.links.new(g0.outputs['Position'], l0.inputs[0])
        w0 = _n(nt, 'ShaderNodeMapRange', interpolation_type='SMOOTHERSTEP'); nt.links.new(l0.outputs['Value'], w0.inputs[0])
        w0.inputs[1].default_value = pr0; w0.inputs[2].default_value = pr1; w0.inputs[3].default_value = 1.0; w0.inputs[4].default_value = 0.0
        mx = _n(nt, 'ShaderNodeMix', data_type='RGBA')
        ins = {i.identifier: i for i in mx.inputs}
        nt.links.new(w0.outputs[0], ins['Factor_Float']); ins['A_Color'].default_value = (*color, 1); ins['B_Color'].default_value = (*p_col, 1)
        nt.links.new([o for o in mx.outputs if o.identifier == 'Result_Color'][0], p.inputs['Base Color'])
    # micro-roughness: broad smears + fine grain, in object space (the floor does not move)
    tc = _n(nt, 'ShaderNodeTexCoord')
    n1 = _n(nt, 'ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.7; n1.inputs['Detail'].default_value = 5.0
    n2 = _n(nt, 'ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 60.0; n2.inputs['Detail'].default_value = 2.0
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    a = _n(nt, 'ShaderNodeMath', operation='MULTIPLY_ADD'); nt.links.new(n1.outputs['Fac'], a.inputs[0])
    a.inputs[1].default_value = 2 * rough_var; a.inputs[2].default_value = rough - rough_var
    b = _n(nt, 'ShaderNodeMath', operation='MULTIPLY_ADD'); nt.links.new(n2.outputs['Fac'], b.inputs[0])
    b.inputs[1].default_value = rough_var * 0.5; nt.links.new(a.outputs[0], b.inputs[2])
    nt.links.new(b.outputs[0], p.inputs['Roughness'])
    shader = p.outputs[0]
    if glow is not None:
        c_lo, c_hi, strength, z_peak, z_top = glow
        geo = _n(nt, 'ShaderNodeNewGeometry')
        sep = _n(nt, 'ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
        ramp = _n(nt, 'ShaderNodeValToRGB')
        mr = _n(nt, 'ShaderNodeMapRange'); nt.links.new(sep.outputs['Z'], mr.inputs[0])
        mr.inputs[1].default_value = 0.0; mr.inputs[2].default_value = z_top
        nt.links.new(mr.outputs[0], ramp.inputs[0])
        els = ramp.color_ramp.elements
        els[0].position = 0.0; els[0].color = (0, 0, 0, 1)
        els[1].position = 1.0; els[1].color = (*c_hi, 1)
        e = els.new(z_peak / z_top); e.color = (*c_lo, 1)
        e = els.new(0.02 / z_top + 0.004); e.color = (0, 0, 0, 1)
        ramp.color_ramp.interpolation = 'EASE'
        em = _n(nt, 'ShaderNodeEmission')
        nt.links.new(ramp.outputs[0], em.inputs['Color'])
        mul = _n(nt, 'ShaderNodeMath', operation='MULTIPLY'); mul.inputs[0].default_value = strength
        nt.links.new(_house_attr(nt), mul.inputs[1]); nt.links.new(mul.outputs[0], em.inputs['Strength'])
        # lit floor below, self-lit wall above
        w = _n(nt, 'ShaderNodeMapRange', interpolation_type='SMOOTHSTEP'); nt.links.new(sep.outputs['Z'], w.inputs[0])
        w.inputs[1].default_value = 0.02; w.inputs[2].default_value = fillet * 0.6
        mix = _n(nt, 'ShaderNodeMixShader'); nt.links.new(w.outputs[0], mix.inputs[0])
        nt.links.new(p.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
        shader = mix.outputs[0]
        m.cycles.emission_sampling = 'FRONT'
    if fade is not None:
        f_col, r0, r1 = fade
        geo = _n(nt, 'ShaderNodeNewGeometry')
        ln = _n(nt, 'ShaderNodeVectorMath', operation='LENGTH'); nt.links.new(geo.outputs['Position'], ln.inputs[0])
        w = _n(nt, 'ShaderNodeMapRange', interpolation_type='SMOOTHSTEP'); nt.links.new(ln.outputs['Value'], w.inputs[0])
        w.inputs[1].default_value = r0; w.inputs[2].default_value = r1
        em = _n(nt, 'ShaderNodeEmission'); em.inputs['Color'].default_value = (*f_col, 1)
        nt.links.new(_house_attr(nt), em.inputs['Strength'])
        mix = _n(nt, 'ShaderNodeMixShader'); nt.links.new(w.outputs[0], mix.inputs[0])
        nt.links.new(shader, mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
        shader = mix.outputs[0]
        m.cycles.emission_sampling = 'NONE'
    nt.links.new(shader, out.inputs['Surface'])
    return m


def world_gradient(rig, name, zenith, horizon, strength, lighting=None):
    """Seamless world: vertical gradient for camera + refraction rays; `lighting` (colour, strength) optionally
    replaces it for diffuse / glossy rays."""
    w, nt = rig.world(name)
    out = _n(nt, 'ShaderNodeOutputWorld')
    tc = _n(nt, 'ShaderNodeTexCoord')
    sep = _n(nt, 'ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    ramp = _n(nt, 'ShaderNodeValToRGB')
    mr = _n(nt, 'ShaderNodeMapRange'); nt.links.new(sep.outputs['Z'], mr.inputs[0])
    mr.inputs[1].default_value = -0.05; mr.inputs[2].default_value = 0.7
    nt.links.new(mr.outputs[0], ramp.inputs[0])
    ramp.color_ramp.elements[0].color = (*horizon, 1); ramp.color_ramp.elements[1].color = (*zenith, 1)
    bg = _n(nt, 'ShaderNodeBackground'); nt.links.new(ramp.outputs[0], bg.inputs['Color'])
    bg.name = 'Background'
    bg.inputs['Strength'].default_value = strength
    _house_driver(nt, 'nodes["Background"].inputs[1].default_value', rig.scene, base=strength)
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return w


# ----------------------------------------------------------------------------------------------- the variants
TARGET = (0.0, 0.0, 0.52)


def _rel(rel_deg, radius, z):
    """A position given by its azimuth RELATIVE to the design camera (0 = at the camera, 180 = straight behind the gate)."""
    a = DESIGN_AZIMUTH + math.radians(rel_deg)
    return (radius * math.cos(a), radius * math.sin(a), z)


def _rims(rig, energy, fill=0.3, radius=3.0, size=(0.40, 2.6), z=1.32, color=(0.86, 0.90, 1.0), rel=118.0):
    """Two tall strip lights behind the gate, left and right, just outside the frame: they are refracted and reflected
    in every glass edge (dark-field lighting). Plus a dimmer strip beside the camera for the faces turned to the lens."""
    for name, r in (('RIM_L', -rel), ('RIM_R', rel)):
        rig.area(name, _rel(r, radius, z), (0, 0, z * 0.7), size, energy, color=color, spread=math.radians(100))
    if fill > 0:
        rig.area('FILL', _rel(32.0, radius, z + 0.2), (0, 0, 0.6), (0.5, 2.2), energy * fill, color=color, spread=math.radians(120))


SPARK_POS = dict(rel=150.0, radius=4.2, z=2.35)      # low, behind the gate, a little to the right of the lens axis


def _spark(rig, energy, color=(1.0, 0.98, 0.95), cone=30.0):
    """The hard light: from behind and fairly low, so the coloured glass shadows and the caustic streaks run across the
    floor TOWARD the camera, and every glass edge is back-lit.

    It is two lamps in one place: SPARK lights everything except the floor (light linking), SPARK_FLOOR (a child of
    SPARK, diffuse only) lights only the floor. Without the split the polished floor mirrors the bare lamp as a
    burnt-out hot spot. Move / re-aim SPARK; change SPARK["gg_energy"]; the child follows both."""
    loc = _rel(SPARK_POS['rel'], SPARK_POS['radius'], SPARK_POS['z'])
    sp = rig.spot('SPARK', loc, (0.0, 0.0, 0.30), energy, cone=math.radians(cone), blend=0.5, color=color)
    rig.out['spark'] = sp
    rig._spark_color = color
    return sp


def _finish_spark(rig):
    """Called once the floor exists: adds SPARK_FLOOR and the light-linking collections."""
    sp, floor = rig.out.get('spark'), rig.out.get('floor')
    if sp is None or floor is None:
        return
    ld = sp.data.copy(); ld.name = 'STUDIO_SPARK_FLOOR'
    if ld.animation_data:
        ld.animation_data_clear()
    ob = bpy.data.objects.new('STUDIO_SPARK_FLOOR', ld)
    rig.coll.objects.link(ob)
    ob.parent = sp                                   # identity child: same place, same aim
    ob.visible_camera = False; ob.visible_glossy = False      # transmission stays on: MNEE caustics need it
    _house_driver(ld, 'energy', rig.scene, base_expr_var=(sp, 'gg_energy'))
    for i, (src, tgt) in enumerate((('spot_size', 'spot_size'), ('spot_blend', 'spot_blend'))):
        fc = ld.driver_add(tgt); d = fc.driver; d.type = 'AVERAGE'
        v = d.variables.new(); v.name = 'v'; v.type = 'SINGLE_PROP'
        v.targets[0].id_type = 'LIGHT'; v.targets[0].id = sp.data; v.targets[0].data_path = src
    for name, light, state in (('STUDIO_LL_spark', sp, 'EXCLUDE'), ('STUDIO_LL_spark_floor', ob, 'INCLUDE')):
        coll = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        for o in list(coll.objects):
            coll.objects.unlink(o)
        coll.objects.link(floor)
        coll.collection_objects[0].light_linking.link_state = state
        light.light_linking.receiver_collection = coll
    rig.lights['SPARK_FLOOR'] = ob
    rig.out['spark_floor'] = ob


def studio_dark(rig):
    """Black studio: polished black floor running into darkness, soft top key, two cool strip lights behind the gate
    (rim on every glass edge), a dim strip beside the camera, one hard spark light from behind."""
    sc = rig.scene
    world_gradient(rig, 'STUDIO_WORLD_dark', zenith=(0.002, 0.002, 0.005), horizon=(0.010, 0.009, 0.026), strength=1.0)
    m = floor_material('STUDIO_FLOOR_dark', (0.012, 0.012, 0.016), rough=0.6, rough_var=0.05, spec=0.0, coat=1.0, coat_rough=0.045,
                       pool=((0.030, 0.030, 0.036), 0.9, 3.2), fade=((0.010, 0.009, 0.026), 9.0, 45.0))
    floor = rig.disc('STUDIO_FLOOR', 80.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = None
    rig.out['key'] = rig.area('KEY', _rel(-25.0, 1.7, 3.3), TARGET, (2.4, 2.4), 180.0, color=(1.0, 0.97, 0.93), spread=math.radians(100))
    _rims(rig, 420.0, fill=0.2)
    _spark(rig, 12000.0)
    return rig.out


def studio_violet(rig):
    """Deep blue-violet cyc: the round wall glows from a violet horizon into indigo black, polished violet-black floor,
    soft key, cool rims, hard spark. The glass picks the gradient up in every refraction."""
    world_gradient(rig, 'STUDIO_WORLD_violet', zenith=(0.002, 0.0015, 0.010), horizon=(0.008, 0.005, 0.03), strength=1.0)
    m = floor_material('STUDIO_FLOOR_violet', (0.012, 0.009, 0.036), rough=0.6, rough_var=0.05, spec=0.0, coat=1.0, coat_rough=0.035,
                       glow=((0.040, 0.016, 0.24), (0.0015, 0.001, 0.010), 1.0, 1.1, 7.0), fillet=2.6)
    floor = rig.cyc('STUDIO_FLOOR', 7.5, 2.6, 7.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = floor
    rig.out['key'] = rig.area('KEY', _rel(-25.0, 1.7, 3.3), TARGET, (2.4, 2.4), 180.0, color=(1.0, 0.96, 0.95), spread=math.radians(100))
    _rims(rig, 400.0, fill=0.2, color=(0.80, 0.84, 1.0))
    _spark(rig, 11000.0, color=(1.0, 0.97, 0.95))
    return rig.out


def studio_highkey(rig):
    """Light high-key cyc: white round cyc, big top softbox, bright-field glass (the edges draw themselves dark),
    black cards all round for edge definition, hard spark for the floor shadows."""
    world_gradient(rig, 'STUDIO_WORLD_highkey', zenith=(0.80, 0.82, 0.86), horizon=(0.92, 0.93, 0.95), strength=1.6)
    m = floor_material('STUDIO_FLOOR_highkey', (0.78, 0.79, 0.81), rough=0.32, rough_var=0.04, spec=0.5,
                       glow=((0.88, 0.89, 0.92), (0.70, 0.72, 0.78), 1.7, 1.2, 7.0), fillet=2.6)
    floor = rig.cyc('STUDIO_FLOOR', 7.5, 2.6, 7.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = floor
    rig.out['key'] = rig.area('KEY', _rel(-25.0, 1.2, 3.6), TARGET, (3.6, 3.6), 1100.0, color=(1.0, 0.99, 0.97), spread=math.radians(140))
    _spark(rig, 20000.0, color=(1.0, 0.98, 0.96))
    # black cards: seen by reflections only, they draw dark lines into every glass face and bevel
    bm_ = bpy.data.materials.get('STUDIO_BLACKCARD') or bpy.data.materials.new('STUDIO_BLACKCARD')
    nt = _clear_nodes(bm_)
    o = _n(nt, 'ShaderNodeOutputMaterial'); d = _n(nt, 'ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (0.005, 0.005, 0.006, 1)
    nt.links.new(d.outputs[0], o.inputs['Surface'])
    for az in (0, 90, 180, 270):
        a = math.radians(az)
        me = bpy.data.meshes.new(f'STUDIO_CARD_{az:03d}')
        w, h = 0.55, 2.6
        me.from_pydata([(-w, 0, 0), (w, 0, 0), (w, 0, h), (-w, 0, h)], [], [(0, 1, 2, 3)]); me.update()
        me.materials.append(bm_)
        ob = bpy.data.objects.new(me.name, me); rig.coll.objects.link(ob); ob.parent = rig.rig
        ob.location = (2.6 * math.cos(a), 2.6 * math.sin(a), 0.02); ob.rotation_euler.z = a + math.pi / 2
        ob.visible_camera = False; ob.visible_diffuse = False; ob.visible_shadow = False; ob.visible_transmission = False
        rig.out.setdefault('cards', []).append(ob)
    return rig.out


def studio_hdri(rig):
    """Poly Haven studio HDRI (studio_small_09, CC0) for light and reflections; the camera and refractions see a
    quiet dark-neutral gradient instead of the photographed room; matt neutral floor (a glossy one would mirror the
    photographed room); hard spark. aim_rig() turns the rig, not the HDRI: rotate nodes["HDRI_Mapping"] for that."""
    sc = rig.scene
    w, nt = rig.world('STUDIO_WORLD_hdri')
    out = _n(nt, 'ShaderNodeOutputWorld')
    tc = _n(nt, 'ShaderNodeTexCoord')
    mp = _n(nt, 'ShaderNodeMapping'); mp.name = 'HDRI_Mapping'
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(120))
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    env = _n(nt, 'ShaderNodeTexEnvironment')
    img = None
    for i in bpy.data.images:
        if i.filepath and os.path.abspath(bpy.path.abspath(i.filepath)) == HDRI:
            img = i
    env.image = img or bpy.data.images.load(HDRI)
    nt.links.new(mp.outputs[0], env.inputs['Vector'])
    sep = _n(nt, 'ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    mr = _n(nt, 'ShaderNodeMapRange'); nt.links.new(sep.outputs['Z'], mr.inputs[0]); mr.inputs[1].default_value = -0.05; mr.inputs[2].default_value = 0.7
    ramp = _n(nt, 'ShaderNodeValToRGB'); nt.links.new(mr.outputs[0], ramp.inputs[0])
    ramp.color_ramp.elements[0].color = (0.040, 0.041, 0.047, 1); ramp.color_ramp.elements[1].color = (0.008, 0.008, 0.011, 1)
    lp = _n(nt, 'ShaderNodeLightPath')
    seen = _n(nt, 'ShaderNodeMath', operation='MAXIMUM')
    nt.links.new(lp.outputs['Is Camera Ray'], seen.inputs[0]); nt.links.new(lp.outputs['Is Transmission Ray'], seen.inputs[1])
    mix = _n(nt, 'ShaderNodeMix', data_type='RGBA')
    ins = {s.identifier: s for s in mix.inputs}
    nt.links.new(seen.outputs[0], ins['Factor_Float']); nt.links.new(env.outputs[0], ins['A_Color']); nt.links.new(ramp.outputs[0], ins['B_Color'])
    bg = _n(nt, 'ShaderNodeBackground'); bg.name = 'Background'
    nt.links.new([o for o in mix.outputs if o.identifier == 'Result_Color'][0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0
    _house_driver(nt, 'nodes["Background"].inputs[1].default_value', sc, base=1.0)
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    m = floor_material('STUDIO_FLOOR_hdri', (0.050, 0.051, 0.056), rough=0.42, rough_var=0.05, spec=0.25,
                       fade=((0.040, 0.041, 0.047), 7.0, 30.0))
    floor = rig.disc('STUDIO_FLOOR', 80.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = floor
    _spark(rig, 9000.0)
    rig.out['key'] = rig.out['spark']
    return rig.out


_BUILD = {'dark': studio_dark, 'violet': studio_violet, 'highkey': studio_highkey, 'hdri': studio_hdri}


def build_studio(variant='dark', scene=None):
    scene = scene or bpy.context.scene
    if variant not in _BUILD:
        raise ValueError(f'unknown studio variant {variant!r}; choose from {VARIANTS}')
    rig = Rig(scene, variant)
    out = _BUILD[variant](rig)
    _finish_spark(rig)
    scene['gg_studio'] = variant
    bpy.context.view_layer.update()
    return out


def get_studio(scene=None):
    """Re-collect the dict of an already built studio (after re-opening a .blend)."""
    scene = scene or bpy.context.scene
    coll = bpy.data.collections.get(COLLECTION)
    if coll is None:
        return None
    lights = {o.name.replace('STUDIO_', ''): o for o in coll.objects if o.type == 'LIGHT'}
    return {'variant': scene.get('gg_studio'), 'collection': coll, 'rig': bpy.data.objects.get('STUDIO_RIG'),
            'floor': bpy.data.objects.get('STUDIO_FLOOR'), 'backdrop': bpy.data.objects.get('STUDIO_FLOOR'),
            'world': scene.world, 'lights': lights, 'key': lights.get('KEY') or lights.get('SPARK'), 'spark': lights.get('SPARK')}


def aim_rig(rig, camera, frame=None):
    """Turn the whole light rig about Z so it is lit for this camera position the way the tests were
    (key over the camera's left shoulder, spark behind the gate). Optionally keyframe it."""
    bpy.context.view_layer.update()            # a freshly made / moved camera has a stale matrix_world
    loc = camera.matrix_world.translation
    rig.rotation_euler.z = math.atan2(loc.y, loc.x) - DESIGN_AZIMUTH
    if frame is not None:
        rig.keyframe_insert('rotation_euler', index=2, frame=frame)
    return rig.rotation_euler.z


def set_caustics(scene=None, mode='mnee', verbose=True):
    """Floor caustics. mode 'off' : coloured transparent glass shadows only (free).
                       mode 'mnee': Cycles shadow caustics (manifold next-event estimation) from the SPARK light through
                                    every GLASS_BODY / GLASS_WING object onto the floor. Deterministic (no fireflies),
                                    follows the animation. Costs render time on floor pixels (see NOTES.md).
    Call again after objects were added."""
    scene = scene or bpy.context.scene
    on = mode == 'mnee'
    spark = bpy.data.objects.get('STUDIO_SPARK_FLOOR') or bpy.data.objects.get('STUDIO_SPARK')
    floor = bpy.data.objects.get('STUDIO_FLOOR')
    if spark is not None:
        spark.data.cycles.is_caustics_light = on
    if floor is not None:
        floor.cycles.is_caustics_receiver = on
    n = 0
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        is_glass = any(s.material and s.material.name.split('.')[0] in ('GLASS_BODY', 'GLASS_WING') for s in ob.material_slots)
        if is_glass:
            ob.cycles.is_caustics_caster = on; n += 1
    scene['gg_caustics'] = mode
    if verbose:
        print(f'[studio] caustics {mode}: {n} glass casters, light {spark.name if spark else None}, receiver {floor.name if floor else None}')
    return n
