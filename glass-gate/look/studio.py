"""Helper B — studios for the HYALO G1 glass gate.

    import studio
    st = studio.build_studio('dark')        # 'dark' | 'violet' | 'highkey' | 'hdri'
    st['rig'].rotation_euler.z = ...        # every light hangs on one empty: turn the whole rig
    studio.aim_for_director(scene)          # ONE call after the camera bake: keys the rig for every shot and checks it
    studio.aim_rig(st['rig'], camera)       # ...or place it once for one camera (stills)

Every variant builds floor, backdrop, world and lights into the collection STUDIO and returns a dict:
    {'variant', 'collection', 'rig', 'floor', 'backdrop', 'world', 'lights': {name: object}, 'key', 'spark'}
Calling build_studio again replaces the previous studio. All studios are round (the backdrop is a surface of
revolution, the world has no seam), so they hold up from any azimuth.

Light energies: each light object carries a custom property `gg_energy` (watts); the real energy is driven as
gg_energy x scene["gg_house"] (the optional studio dimmer in alive.key_alive). To change a light's power, change
obj["gg_energy"] — not light.energy.

`spark` is the one small hard light: it draws the crisp coloured glass shadows on the floor and the sparkle on the
bevels. Every other lamp is a soft-edged CARD (soft_light): what glass mirrors of it is a gradient, not a slab.
No lamp is mirrored by the polished floor: each one has a diffuse-only twin `STUDIO_<name>_FLOOR` that lights only
the floor (floor_split, light linking); obj["gg_floor_gain"] on the twin scales it.
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


# ----------------------------------------------------------------------------------------------- cards
def soft_light(ld, edge=0.45):
    """Give an AREA lamp soft edges: its emission falls smoothly to zero over the outer `edge` of each half side
    (light node tree on the lamp's parametric coordinates). A soft card mirrors as a gradient, never as a hard slab."""
    ld.use_nodes = True
    nt = ld.node_tree
    nt.nodes.clear()
    out = _n(nt, 'ShaderNodeOutputLight'); em = _n(nt, 'ShaderNodeEmission')
    geo = _n(nt, 'ShaderNodeNewGeometry'); sep = _n(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Parametric'], sep.inputs[0])

    def side(sock):
        a = _n(nt, 'ShaderNodeMath', operation='SUBTRACT'); nt.links.new(sock, a.inputs[0]); a.inputs[1].default_value = 0.5
        b = _n(nt, 'ShaderNodeMath', operation='ABSOLUTE'); nt.links.new(a.outputs[0], b.inputs[0])
        m = _n(nt, 'ShaderNodeMapRange', interpolation_type='SMOOTHERSTEP'); nt.links.new(b.outputs[0], m.inputs[0])
        m.inputs[1].default_value = 0.5 * (1.0 - edge); m.inputs[2].default_value = 0.5
        m.inputs[3].default_value = 1.0; m.inputs[4].default_value = 0.0
        return m.outputs[0]
    mu = _n(nt, 'ShaderNodeMath', operation='MULTIPLY')
    nt.links.new(side(sep.outputs[0]), mu.inputs[0]); nt.links.new(side(sep.outputs[1]), mu.inputs[1])
    nt.links.new(mu.outputs[0], em.inputs['Strength']); nt.links.new(em.outputs[0], out.inputs[0])
    ld['gg_soft'] = edge
    return ld


def _link_coll(name, floor, state):
    coll = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if floor.name not in coll.objects:
        coll.objects.link(floor)
    for co in coll.collection_objects:
        co.light_linking.link_state = state
    return coll


def floor_split(scene, light_ob, gain=1.0, floor=None, coll=None):
    """The polished floor must never mirror a lamp. `light_ob` stops lighting the floor (light linking) and gets a twin
    `STUDIO_<name>_FLOOR`: same lamp, a child in the same place, diffuse only, lighting ONLY the floor with
    gain x the parent's energy. So every lamp still makes its pool and shadows on the floor, but no lamp shows up in it.
    Works for any lamp (the director's too). Idempotent."""
    floor = floor or bpy.data.objects.get('STUDIO_FLOOR')
    coll = coll or bpy.data.collections.get(COLLECTION)
    if floor is None or coll is None or light_ob.type != 'LIGHT':
        return None
    base = light_ob.name.replace('STUDIO_', '')
    name = f'STUDIO_{base}_FLOOR'
    tw = bpy.data.objects.get(name)
    if tw is None:
        ld = light_ob.data.copy(); ld.name = name
        if ld.animation_data:
            ld.animation_data_clear()
        tw = bpy.data.objects.new(name, ld)
        coll.objects.link(tw)
        tw.parent = light_ob                       # identity child: same place, same aim
        tw.visible_camera = False; tw.visible_glossy = False     # transmission stays on (MNEE needs it)
        fc = ld.driver_add('energy'); d = fc.driver; d.type = 'SCRIPTED'
        if 'gg_energy' in light_ob:
            v = d.variables.new(); v.name = 'e'; v.type = 'SINGLE_PROP'
            v.targets[0].id_type = 'OBJECT'; v.targets[0].id = light_ob; v.targets[0].data_path = '["gg_energy"]'
            v = d.variables.new(); v.name = 'h'; v.type = 'SINGLE_PROP'
            v.targets[0].id_type = 'SCENE'; v.targets[0].id = scene; v.targets[0].data_path = '["gg_house"]'
            v = d.variables.new(); v.name = 'g'; v.type = 'SINGLE_PROP'
            v.targets[0].id_type = 'OBJECT'; v.targets[0].id = tw; v.targets[0].data_path = '["gg_floor_gain"]'
            d.expression = 'e*h*g'
        else:                                       # a foreign lamp: follow whatever its energy does
            v = d.variables.new(); v.name = 'e'; v.type = 'SINGLE_PROP'
            v.targets[0].id_type = 'LIGHT'; v.targets[0].id = light_ob.data; v.targets[0].data_path = 'energy'
            v = d.variables.new(); v.name = 'g'; v.type = 'SINGLE_PROP'
            v.targets[0].id_type = 'OBJECT'; v.targets[0].id = tw; v.targets[0].data_path = '["gg_floor_gain"]'
            d.expression = 'e*g'
        if light_ob.data.type == 'SPOT':
            for src in ('spot_size', 'spot_blend'):
                fc = ld.driver_add(src); d = fc.driver; d.type = 'AVERAGE'
                v = d.variables.new(); v.name = 'v'; v.type = 'SINGLE_PROP'
                v.targets[0].id_type = 'LIGHT'; v.targets[0].id = light_ob.data; v.targets[0].data_path = src
    tw['gg_floor_gain'] = float(gain)
    light_ob.light_linking.receiver_collection = _link_coll('STUDIO_LL_nofloor', floor, 'EXCLUDE')
    tw.light_linking.receiver_collection = _link_coll('STUDIO_LL_floor', floor, 'INCLUDE')
    return tw


def link_only(light_ob, objects, name):
    """Light linking: `light_ob` lights (and is mirrored by) these objects only."""
    coll = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    for o in list(coll.objects):
        coll.objects.unlink(o)
    for o in objects:
        coll.objects.link(o)
    for co in coll.collection_objects:
        co.light_linking.link_state = 'INCLUDE'
    light_ob.light_linking.receiver_collection = coll if objects else None
    return coll


# ----------------------------------------------------------------------------------------------- the variants
TARGET = (0.0, 0.0, 0.52)


def _rel(rel_deg, radius, z):
    """A position given by its azimuth RELATIVE to the design camera (0 = at the camera, 180 = straight behind the gate)."""
    a = DESIGN_AZIMUTH + math.radians(rel_deg)
    return (radius * math.cos(a), radius * math.sin(a), z)


def _card(rig, name, rel, radius, z, aim, size, radiance, color=(1, 1, 1), soft=0.45, floor_gain=0.3):
    """A soft-edged light card. `radiance` is its peak brightness as a mirror would show it (W/m2/sr): what a flat
    glass face reflects is about 4-8 % of that, a bevel or a brass tooth up to all of it."""
    energy = radiance * math.pi * size[0] * size[1]
    ob = rig.area(name, _rel(rel, radius, z), aim, size, energy, color=color)
    soft_light(ob.data, soft)
    ob['gg_floor_gain'] = float(floor_gain)
    return ob


RIM_REL = 125.0        # the rims stand this far round from the lens axis: outside any 24 mm+ frame, and away from the
#                        direction a side panel mirrors in the usual 3/4 view (about 100 degrees)


def _cards(rig, key=7.0, front=2.6, rim=11.0, color=(0.88, 0.92, 1.0), warm=(1.0, 0.97, 0.93)):
    """The card set of the dark / violet studios (positions relative to the lens axis, see aim_rig):
        KEY     big soft box overhead: lights the parts from above, top bevels, the rail lid
        FRONT   big soft wall behind the camera: the sheen across glass faces turned to the lens (the wings!)
        RIM_L/R tall soft strips left and right, behind the gate, out of frame: edge light in every bevel and flute
        GEAR    soft card above and behind, linked to the drive parts only (see _finish_cards)"""
    rig.out['key'] = _card(rig, 'KEY', -20.0, 0.5, 3.5, TARGET, (3.4, 3.4), key, color=warm, soft=0.5, floor_gain=0.35)
    _card(rig, 'FRONT', 6.0, 3.4, 1.45, (0.0, 0.0, 1.2), (3.8, 2.3), front, color=color, soft=0.55, floor_gain=0.25)
    _card(rig, 'RIM_L', -RIM_REL, 3.2, 1.40, (0.0, 0.0, 0.95), (1.0, 2.8), rim, color=color, soft=0.6, floor_gain=0.25)
    _card(rig, 'RIM_R', RIM_REL, 3.2, 1.40, (0.0, 0.0, 0.95), (1.0, 2.8), rim, color=color, soft=0.6, floor_gain=0.25)
    _card(rig, 'GEAR', 172.0, 2.1, 1.75, (0.0, 0.0, 0.3), (2.6, 1.6), 9.0, color=warm, soft=0.55, floor_gain=0.0)


SPARK_POS = dict(rel=150.0, radius=4.2, z=2.35)      # low, behind the gate, a little to the right of the lens axis
GEAR_PREFIX = ('DRV_',)                             # objects the GEAR card lights


def _spark(rig, energy, color=(1.0, 0.98, 0.95), cone=30.0):
    """The hard light: from behind and fairly low, so the coloured glass shadows and the light streaks run across the
    floor TOWARD the camera, and every glass edge is back-lit. A spot is a point: it glints, it never makes a slab."""
    loc = _rel(SPARK_POS['rel'], SPARK_POS['radius'], SPARK_POS['z'])
    sp = rig.spot('SPARK', loc, (0.0, 0.0, 0.30), energy, cone=math.radians(cone), blend=0.5, color=color)
    sp['gg_floor_gain'] = 1.0
    rig.out['spark'] = sp
    return sp


def _finish_cards(rig):
    """Once the floor exists: every studio lamp gets its floor twin (floor_split), GEAR is linked to the drive."""
    floor = rig.out.get('floor')
    if floor is None:
        return
    for key, ob in list(rig.lights.items()):
        if key.endswith('_FLOOR') or ob.name.endswith('_FLOOR'):
            continue
        if key == 'GEAR':
            link_gear(rig.scene)
            continue
        tw = floor_split(rig.scene, ob, gain=ob.get('gg_floor_gain', 0.3), floor=floor, coll=rig.coll)
        if tw is not None:
            rig.lights[tw.name.replace('STUDIO_', '')] = tw
    rig.out['spark_floor'] = rig.lights.get('SPARK_FLOOR')


def link_gear(scene=None):
    """(Re)link the GEAR card to the drive parts (objects named DRV_*). Call again after the gate objects changed."""
    scene = scene or bpy.context.scene
    g = bpy.data.objects.get('STUDIO_GEAR')
    if g is None:
        return 0
    objs = [o for o in scene.objects if o.type == 'MESH' and o.name.startswith(GEAR_PREFIX)]
    link_only(g, objs, 'STUDIO_LL_gear')
    g.hide_render = not objs
    return len(objs)


def studio_dark(rig):
    """Black studio: polished black floor running into darkness; soft cards only (overhead key, a wall behind the
    camera, two strips behind the gate), one hard spark light from behind. No lamp is ever mirrored by the floor."""
    world_gradient(rig, 'STUDIO_WORLD_dark', zenith=(0.002, 0.002, 0.005), horizon=(0.010, 0.009, 0.026), strength=1.0)
    m = floor_material('STUDIO_FLOOR_dark', (0.012, 0.012, 0.016), rough=0.6, rough_var=0.05, spec=0.0, coat=1.0, coat_rough=0.045,
                       pool=((0.024, 0.024, 0.030), 0.9, 3.2), fade=((0.010, 0.009, 0.026), 9.0, 45.0))
    floor = rig.disc('STUDIO_FLOOR', 80.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = None
    _cards(rig)
    _spark(rig, 9000.0)
    return rig.out


def studio_violet(rig):
    """Deep blue-violet cyc: the round wall glows from a violet horizon into indigo black, polished violet-black floor,
    the same soft cards and spark as 'dark'. The glass picks the gradient up in every refraction."""
    world_gradient(rig, 'STUDIO_WORLD_violet', zenith=(0.002, 0.0015, 0.010), horizon=(0.008, 0.005, 0.03), strength=1.0)
    m = floor_material('STUDIO_FLOOR_violet', (0.007, 0.005, 0.020), rough=0.6, rough_var=0.05, spec=0.0, coat=1.0, coat_rough=0.045,
                       pool=((0.018, 0.015, 0.040), 0.9, 3.2),
                       glow=((0.022, 0.008, 0.125), (0.001, 0.0007, 0.007), 1.0, 1.3, 7.0), fillet=2.6)
    floor = rig.cyc('STUDIO_FLOOR', 7.5, 2.6, 7.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = floor
    _cards(rig, color=(0.80, 0.84, 1.0), warm=(1.0, 0.96, 0.95))
    _spark(rig, 8500.0, color=(1.0, 0.97, 0.95))
    return rig.out


def studio_highkey(rig):
    """Light high-key cyc: white round cyc, big top softbox, bright-field glass (the edges draw themselves dark),
    black cards all round for edge definition, hard spark for the floor shadows."""
    world_gradient(rig, 'STUDIO_WORLD_highkey', zenith=(0.80, 0.82, 0.86), horizon=(0.92, 0.93, 0.95), strength=1.6)
    m = floor_material('STUDIO_FLOOR_highkey', (0.78, 0.79, 0.81), rough=0.32, rough_var=0.04, spec=0.5,
                       glow=((0.88, 0.89, 0.92), (0.70, 0.72, 0.78), 1.7, 1.2, 7.0), fillet=2.6)
    floor = rig.cyc('STUDIO_FLOOR', 7.5, 2.6, 7.0, m)
    rig.out['floor'] = floor; rig.out['backdrop'] = floor
    rig.out['key'] = _card(rig, 'KEY', -25.0, 1.2, 3.6, TARGET, (3.6, 3.6), 27.0, color=(1.0, 0.99, 0.97), soft=0.4, floor_gain=1.0)
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
    _finish_cards(rig)
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


# ----------------------------------------------------------------------------------------------- aiming the rig
GATE_HALF = (0.50, 0.75)         # the subject point is kept inside this footprint (metres)


def _fcurves(idblock):
    ad = idblock.animation_data
    if ad is None or ad.action is None:
        return []
    act, out = ad.action, []
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in layer.strips:
                for cb in getattr(strip, 'channelbags', []):
                    out.extend(cb.fcurves)
    elif hasattr(act, 'fcurves'):
        out.extend(act.fcurves)
    return out


def rig_pose(camera):
    """(x, y, rot_z) of the rig for the camera as it stands NOW.

    The rig is placed on the SUBJECT (where the lens axis meets the gate: the focus point if depth of field is on,
    else where the axis crosses z = 0.5), and turned so that the design camera direction lies along the real lens
    axis. So the cards keep their place relative to the frame whatever the camera looks at or from how close."""
    bpy.context.view_layer.update()            # a freshly made / moved camera has a stale matrix_world
    mw = camera.matrix_world
    p = mw.translation
    fw = -(mw.to_3x3() @ Vector((0.0, 0.0, 1.0))).normalized()
    dof = camera.data.dof
    if dof.use_dof and dof.focus_object is not None:
        s = dof.focus_object.matrix_world.translation.copy()
    elif dof.use_dof and dof.focus_distance > 0.05:
        s = p + fw * dof.focus_distance
    elif fw.z < -0.05:
        s = p + fw * ((0.5 - p.z) / fw.z)
    else:
        s = p + fw * max(0.3, Vector((p.x, p.y)).length)
    sx = max(-GATE_HALF[0], min(GATE_HALF[0], s.x)); sy = max(-GATE_HALF[1], min(GATE_HALF[1], s.y))
    h = Vector((fw.x, fw.y))
    if h.length < 0.15:                         # looking almost straight down: fall back to where the camera stands
        h = Vector((sx - p.x, sy - p.y))
    if h.length < 1e-4:
        h = Vector((0.0, 1.0))
    rz = math.atan2(-h.y, -h.x) - DESIGN_AZIMUTH
    return sx, sy, rz


def aim_rig(rig, camera, frame=None):
    """Put the light rig where this camera needs it (see rig_pose): key above, soft wall behind the lens, the two rim
    strips behind the gate just outside the frame, spark low behind. Optionally keyframe it."""
    x, y, rz = rig_pose(camera)
    rig.location.x, rig.location.y = x, y
    rig.rotation_euler.z = rz
    if frame is not None:
        rig.keyframe_insert('location', index=0, frame=frame); rig.keyframe_insert('location', index=1, frame=frame)
        rig.keyframe_insert('rotation_euler', index=2, frame=frame)
    return rz


def _unwrap(a, ref):
    while a - ref > math.pi: a -= 2 * math.pi
    while a - ref < -math.pi: a += 2 * math.pi
    return a


def aim_rig_shots(scene, rig, camera, cut_frames, hold_deg=12.0, hold_m=0.35, samples=5):
    """Key the rig for every shot. cut_frames = first frame of each shot + the last frame of the film.
    A shot whose camera hardly turns gets ONE held pose (the light does not travel). A shot with a big move (the lens
    axis turns more than hold_deg, or the subject moves more than hold_m) is tracked: the rig follows the camera
    through `samples` keys, as if it rode on the crane. Cuts are hard (CONSTANT) so nothing bleeds across them.
    Returns [(first_frame, last_frame, 'hold'|'track', rot_deg_first, rot_deg_last)]."""
    cur = scene.frame_current
    if rig.animation_data:
        rig.animation_data_clear()
    report, keys = [], []
    shots = list(zip(cut_frames[:-1], cut_frames[1:]))
    for i, (f0, f_next) in enumerate(shots):
        f1 = f_next - 1 if i < len(shots) - 1 else f_next
        f1 = max(f1, f0)
        fs = sorted({int(round(f0 + (f1 - f0) * k / (samples - 1))) for k in range(samples)})
        poses = []
        for f in fs:
            scene.frame_set(f)
            x, y, rz = rig_pose(camera)
            if poses:
                rz = _unwrap(rz, poses[-1][3])
            poses.append((f, x, y, rz))
        rzs = [p[3] for p in poses]
        spread = math.degrees(max(rzs) - min(rzs))
        move = max(math.hypot(p[1] - poses[0][1], p[2] - poses[0][2]) for p in poses)
        if spread <= hold_deg and move <= hold_m:
            mid = poses[len(poses) // 2]
            keys.append((f0, mid[1], mid[2], mid[3], 'CONSTANT'))
            report.append((f0, f1, 'hold', round(math.degrees(mid[3]), 1), round(math.degrees(mid[3]), 1)))
        else:
            for k, (f, x, y, rz) in enumerate(poses):
                keys.append((f, x, y, rz, 'CONSTANT' if k == len(poses) - 1 else 'LINEAR'))
            report.append((f0, f1, 'track', round(math.degrees(poses[0][3]), 1), round(math.degrees(poses[-1][3]), 1)))
    for f, x, y, rz, interp in keys:
        rig.location.x, rig.location.y, rig.rotation_euler.z = x, y, rz
        rig.keyframe_insert('location', index=0, frame=f); rig.keyframe_insert('location', index=1, frame=f)
        rig.keyframe_insert('rotation_euler', index=2, frame=f)
    kmap = {k[0]: k[4] for k in keys}
    for fc in _fcurves(rig):
        for kp in fc.keyframe_points:
            kp.interpolation = kmap.get(int(round(kp.co[0])), 'CONSTANT')
        fc.update()
    scene.frame_set(cur)
    return report


def cut_frames_from(scene, timeline=None):
    """First frame of every shot + the last frame. Source: the scene's timeline markers if there are at least two,
    else `cuts` (seconds) in shared/timeline.json."""
    ms = sorted({m.frame for m in scene.timeline_markers})
    if len(ms) >= 2:
        cuts = [f for f in ms if scene.frame_start <= f <= scene.frame_end]
        src = 'markers'
    else:
        import json
        path = timeline or os.path.join(os.path.dirname(HERE), 'shared', 'timeline.json')
        tl = json.load(open(path))
        fps = tl.get('fps', scene.render.fps)
        cuts = [int(round(t * fps)) for t in tl['cuts']]
        src = os.path.relpath(path, os.path.dirname(HERE))
    cuts = sorted(set(cuts) | {scene.frame_start})
    cuts = [f for f in cuts if f < scene.frame_end] + [scene.frame_end]
    return cuts, src


def cards(scene=None):
    """The lamps that could show as a shape: every AREA lamp of the scene except the floor twins (diffuse only,
    floor only) and GEAR (linked to the drive parts only: no glass and no floor ever sees it)."""
    scene = scene or bpy.context.scene
    return [o for o in scene.objects if o.type == 'LIGHT' and o.data.type == 'AREA'
            and not o.name.endswith('_FLOOR') and o.name != 'STUDIO_GEAR' and not o.name.startswith('GG_')]


def check_cards(scene, frames, camera=None, margin=0.04, verbose=True):
    """For each frame: is any part of any card inside the camera frame (it would then show through the glass in front
    of it)? Lamps that are off at that frame are skipped. Returns [(frame, lamp name, covered fraction of its 9 probes)]."""
    from bpy_extras.object_utils import world_to_camera_view
    camera = camera or scene.camera
    cur = scene.frame_current
    bad = []
    for f in frames:
        scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        for ob in cards(scene):
            ev = ob.evaluated_get(dg)
            if ev.data.energy <= 1e-4 or ob.hide_render:
                continue
            hx = ev.data.size / 2
            hy = (ev.data.size_y if ev.data.shape in ('RECTANGLE', 'ELLIPSE') else ev.data.size) / 2
            soft = ob.data.get('gg_soft', 0.0)
            hx *= (1.0 - 0.5 * soft); hy *= (1.0 - 0.5 * soft)         # the outer part of a soft card is nearly dark
            n = 0
            for ux in (-1, 0, 1):
                for uy in (-1, 0, 1):
                    co = ev.matrix_world @ Vector((ux * hx, uy * hy, 0.0))
                    v = world_to_camera_view(scene, camera, co)
                    if v.z > 0 and -margin < v.x < 1 + margin and -margin < v.y < 1 + margin:
                        n += 1
            if n:
                bad.append((f, ob.name, round(n / 9, 2)))
    scene.frame_set(cur)
    if verbose:
        print(f'[studio] card check on {len(frames)} frames: ' + ('no card in frame' if not bad else f'{len(bad)} hits: {bad[:12]}'))
    return bad


def aim_for_director(scene=None, camera=None, timeline=None, others=True, verbose=True):
    """ONE call after the camera bake. Finds STUDIO_RIG and the camera (DIRECTOR_CAM, else scene.camera), reads the cuts
    (timeline markers, else shared/timeline.json), keys the rig per shot (aim_rig_shots), gives every other AREA lamp in
    the scene soft edges and a floor twin (others=True: the director's sweep / pass lights then cannot print a hard
    slab either), re-links the GEAR card, and checks first / middle / last frame of every shot for a card in frame.
    Returns {'cuts', 'source', 'shots', 'in_frame'}."""
    scene = scene or bpy.context.scene
    rig = bpy.data.objects.get('STUDIO_RIG')
    camera = camera or bpy.data.objects.get('DIRECTOR_CAM') or scene.camera
    if rig is None or camera is None:
        raise RuntimeError('aim_for_director: needs a built studio (STUDIO_RIG) and a camera')
    cuts, src = cut_frames_from(scene, timeline)
    shots = aim_rig_shots(scene, rig, camera, cuts)
    if others:
        for ob in list(scene.objects):
            if ob.type == 'LIGHT' and ob.data.type == 'AREA' and not ob.name.startswith(('STUDIO_', 'GG_')):
                if 'gg_soft' not in ob.data:
                    soft_light(ob.data, 0.5)
                floor_split(scene, ob, gain=0.6)
    link_gear(scene)
    probe = sorted({f for (f0, f1, *_r) in shots for f in (f0, (f0 + f1) // 2, f1)})
    bad = check_cards(scene, probe, camera, verbose=False)
    if verbose:
        print(f'[studio] aim_for_director: {len(shots)} shots from {src}; '
              + ', '.join(f'{f0}-{f1} {m}' for f0, f1, m, *_r in shots))
        print('[studio] cards in frame at first/mid/last of every shot: ' + ('none' if not bad else str(bad)))
    return {'cuts': cuts, 'source': src, 'shots': shots, 'in_frame': bad}


def set_caustics(scene=None, mode='mnee', verbose=True):
    """Floor caustics. mode 'off' : coloured transparent glass shadows only (free).
                       mode 'mnee': Cycles shadow caustics (manifold next-event estimation) from the SPARK light through
                                    every GLASS_BODY / GLASS_WING object onto the floor. Measured: no visible gain on the
                                    real gate for +9 % render time (see NOTES.md). Off by default."""
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
