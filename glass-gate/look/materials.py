"""Helper B — materials for the HYALO G1 glass gate.

    import materials; materials.apply_materials()

Finds every material of the spec contract BY NAME and rebuilds its node tree. Unknown names get a sensible
fallback (guessed from the name) and are printed. Safe to call again (idempotent).

Everything that lights up reads five scene custom properties through Attribute nodes of type 'View Layer':
    gg_power, gg_wave, gg_grant, gg_screens, gg_ir          (see look/alive.py — the director keys them)
plus gg_glass_depth / gg_glass_gloss (bounce guard of the glass, see glass()).
"""
import bpy, os, math

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')

# ---------------------------------------------------------------------------------------------- look constants
COL_IDLE = (0.14, 0.11, 1.00)       # idle LED: blue-violet (scene linear)
COL_GRANT = (0.00, 1.00, 0.20)      # access granted: green
COL_IR = (1.00, 0.04, 0.22)         # face-camera IR dots: pink-red
LED_STRENGTH = 90.0                 # steady emission of the LED line  [W/m2/sr]
LED_HEAD = 4.0                      # extra gain of the hot wave head (x steady)
LED_EDGE = 0.012                    # width of the switching-on front, in wave_u
LED_TAIL = 0.09                     # length of the hot tail behind the front, in wave_u
SCREEN_STRENGTH = 3.2
WING_STRENGTH = 5.0
GLASS_IOR = 1.52
# the tint reached after GLASS_TINT_DIST metres inside the glass (thick edges go blue-violet)
GLASS_TINT = (0.60, 0.66, 0.97)
GLASS_TINT_DIST = 0.07
# Light a lamp sends THROUGH one glass surface (shadow rays), as a function of how the surface faces the lamp.
# Facing it: slightly MORE than 1 (a cheap stand-in for refraction gathering light), grazing: dark and blue-violet.
# Flat sheets come out about neutral; flutes, tubes and bevels throw bright streaks with dark rims = the floor caustics.
GLASS_SHADOW = (1.12, 1.14, 1.26)
GLASS_SHADOW_EDGE = (0.10, 0.11, 0.30)
GLASS_BOUNCE = (0.90, 0.92, 0.97)   # per surface for bounce (diffuse) rays: plain, never above 1

# 'mesh'   : the LED meshes light the scene themselves (light tree / MIS)
# 'hybrid' : LED meshes are visible to camera / reflections / refractions only; alive.setup_alive() adds real lights
LED_MODE = 'hybrid'

CONTRACT = ['GLASS_BODY', 'GLASS_WING', 'GLASS_LENS', 'METAL_STEEL', 'METAL_ALU', 'METAL_DARK', 'BRASS', 'COPPER',
            'SPRING_STEEL', 'PCB_GREEN', 'PCB_GOLD', 'CHIP_BLACK', 'CAP_ALU', 'PLASTIC_WHITE', 'PLASTIC_BLACK', 'RUBBER',
            'CABLE_RED', 'CABLE_BLUE', 'CABLE_YELLOW', 'CABLE_WHITE', 'LED_STRIP', 'LED_IR', 'LED_STATUS', 'SCREEN_LCD',
            'SCREEN_WING', 'BADGE', 'PRINT_WHITE']


# ---------------------------------------------------------------------------------------------- node builder
class B:
    """Tiny node-tree builder: every helper returns an OUTPUT SOCKET."""

    def __init__(self, material):
        self.mat = material
        if material.node_tree is None:
            material.use_nodes = True
        self.nt = material.node_tree
        self.nt.nodes.clear()
        self.out = self.nt.nodes.new('ShaderNodeOutputMaterial')
        self._lp = None
        self._geo = None

    def node(self, typ, _in=None, **attrs):
        n = self.nt.nodes.new(typ)
        for k, v in attrs.items():
            setattr(n, k, v)
        for k, v in (_in or {}).items():
            self.set(n, k, v)
        return n

    def sock(self, n, key):
        if isinstance(key, int):
            return n.inputs[key]
        for s in n.inputs:                      # identifier first (Mix node has duplicate names)
            if s.identifier == key and s.enabled:
                return s
        for s in n.inputs:
            if s.name == key and s.enabled:
                return s
        return n.inputs[key]

    def set(self, n, key, v):
        s = self.sock(n, key)
        if isinstance(v, bpy.types.NodeSocket):
            self.nt.links.new(v, s)
        else:
            if isinstance(v, (tuple, list)) and len(v) == 3 and len(getattr(s, 'default_value', ())) == 4:
                v = (*v, 1.0)
            s.default_value = v

    def link(self, a, b):
        self.nt.links.new(a, b)

    def surface(self, shader):
        self.nt.links.new(shader, self.out.inputs['Surface'])

    # --- maths
    def m(self, op, a, b=None, c=None, clamp=False):
        n = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                self.set(n, i, v)
        return n.outputs[0]

    def mix(self, fac, a, b):
        """Colour mix (linear)."""
        n = self.node('ShaderNodeMix', data_type='RGBA', blend_type='MIX', clamp_factor=True)
        self.set(n, 'Factor_Float', fac); self.set(n, 'A_Color', a); self.set(n, 'B_Color', b)
        return n.outputs['Result'] if False else [o for o in n.outputs if o.identifier == 'Result_Color'][0]

    def mixf(self, fac, a, b):
        n = self.node('ShaderNodeMix', data_type='FLOAT', clamp_factor=True)
        self.set(n, 'Factor_Float', fac); self.set(n, 'A_Float', a); self.set(n, 'B_Float', b)
        return [o for o in n.outputs if o.identifier == 'Result_Float'][0]

    def scale(self, col, f):
        """colour * scalar"""
        n = self.node('ShaderNodeVectorMath', operation='SCALE')
        self.set(n, 0, col); self.set(n, 'Scale', f)
        return n.outputs[0]

    def mix_shader(self, fac, a, b):
        n = self.node('ShaderNodeMixShader')
        self.set(n, 0, fac); self.link(a, n.inputs[1]); self.link(b, n.inputs[2])
        return n.outputs[0]

    def add_shader(self, a, b):
        n = self.node('ShaderNodeAddShader')
        self.link(a, n.inputs[0]); self.link(b, n.inputs[1])
        return n.outputs[0]

    # --- inputs
    def ctrl(self, name):
        """A scene custom property (gg_*) as a float socket."""
        n = self.node('ShaderNodeAttribute', attribute_type='VIEW_LAYER', attribute_name=name)
        n.label = name
        return n.outputs['Fac']

    @property
    def lp(self):
        if self._lp is None:
            self._lp = self.node('ShaderNodeLightPath')
        return self._lp

    @property
    def geo(self):
        if self._geo is None:
            self._geo = self.node('ShaderNodeNewGeometry')
        return self._geo

    def objco(self, scale=(1, 1, 1)):
        tc = self.node('ShaderNodeTexCoord')
        mp = self.node('ShaderNodeMapping')
        self.link(tc.outputs['Object'], mp.inputs['Vector'])
        mp.inputs['Scale'].default_value = scale
        return mp.outputs[0]

    def noise(self, scale=(1, 1, 1), size=100.0, detail=3.0, rough=0.55):
        n = self.node('ShaderNodeTexNoise', _in={'Scale': size, 'Detail': detail, 'Roughness': rough})
        self.link(self.objco(scale), n.inputs['Vector'])
        return n.outputs['Fac']

    def image(self, filename, vector=None, colorspace='sRGB', extension='CLIP', projection='FLAT', blend=0.0, interpolation='Cubic'):
        path = os.path.join(TEX, filename)
        img = None
        for i in bpy.data.images:
            if i.filepath and os.path.abspath(bpy.path.abspath(i.filepath)) == os.path.abspath(path):
                img = i
        if img is None:
            img = bpy.data.images.load(path)
        img.colorspace_settings.name = colorspace
        n = self.node('ShaderNodeTexImage', image=img, extension=extension, projection=projection, interpolation=interpolation)
        if projection == 'BOX':
            n.projection_blend = blend
        if vector is not None:
            self.link(vector, n.inputs['Vector'])
        return n

    def principled(self, **kw):
        n = self.node('ShaderNodeBsdfPrincipled')
        for k, v in kw.items():
            self.set(n, k.replace('_', ' ') if k not in n.inputs else k, v)
        return n


MICRO_ROUGH = True      # False: constant roughness everywhere (measurement switch; no visible gain in speed, see NOTES)


def _rough(b, base, var, size=60.0, scale=(1, 1, 1)):
    """Micro-roughness variation: base +- var, driven by object-space noise."""
    if not MICRO_ROUGH:
        return base
    n = b.noise(scale=scale, size=size)
    return b.m('MULTIPLY_ADD', n, 2 * var, base - var)


# ---------------------------------------------------------------------------------------------- glass
def glass(mat, ior=GLASS_IOR, tint=GLASS_TINT, tint_dist=GLASS_TINT_DIST, shadow=GLASS_SHADOW, shadow_edge=GLASS_SHADOW_EDGE):
    """Clear crystal.

    camera / glossy / transmission rays : real Glass BSDF (IOR 1.52, roughness 0). Absorption is done with the
        ray-length trick: on a back-facing hit the ray has just travelled `Ray Length` inside the glass, so the BSDF is
        tinted by tint^(length/tint_dist). Thick edges and light trapped inside a sheet go blue-violet; no volume needed.
    shadow rays and bounce rays : a tinted Transparent BSDF, so lamps and bounce light reach the parts inside the
        glass and the floor behind it. For shadow rays the tint depends on how the surface faces the lamp
        (GLASS_SHADOW .. GLASS_SHADOW_EDGE): coloured transparent shadows with bright streaks = the floor caustics,
        free, noise-free and stable in animation.
    bounce guard : past `gg_glass_depth` transmission bounces or `gg_glass_gloss` glossy bounces (total internal
        reflection counts as glossy) the surface turns into plain Transparent, so a path never dies black inside a
        stack of glass walls — it simply stops refracting. Keep Cycles transmission_bounces > gg_glass_depth,
        glossy_bounces > gg_glass_gloss and max_bounces > their sum (settings.recommended() does all of it).
    """
    b = B(mat)
    lp, geo = b.lp, b.geo
    # absorption along the segment that ends at this (back-facing) hit
    expo = b.m('DIVIDE', lp.outputs['Ray Length'], tint_dist)
    expo = b.m('MINIMUM', expo, 40.0)
    pw = b.node('ShaderNodeVectorMath', operation='POWER')
    pw.inputs[0].default_value = tint
    b.link(b.node('ShaderNodeCombineXYZ', _in={0: expo, 1: expo, 2: expo}).outputs[0], pw.inputs[1])
    col = b.mix(geo.outputs['Backfacing'], (1, 1, 1, 1), pw.outputs[0])
    g = b.node('ShaderNodeBsdfGlass', distribution='MULTI_GGX', _in={'Color': col, 'Roughness': 0.0, 'IOR': ior})
    # shadow / diffuse rays: tinted pass-through, darker at grazing angles
    lw = b.node('ShaderNodeLayerWeight', _in={'Blend': 0.35})
    edge = b.m('POWER', lw.outputs['Facing'], 2.0)
    tcol = b.mix(edge, shadow, shadow_edge)
    tcol = b.mix(lp.outputs['Is Shadow Ray'], GLASS_BOUNCE, tcol)
    t_sh = b.node('ShaderNodeBsdfTransparent', _in={'Color': tcol})
    # bounce guard
    over = b.m('MAXIMUM',
               b.m('GREATER_THAN', lp.outputs['Transmission Depth'], b.m('SUBTRACT', b.ctrl('gg_glass_depth'), 0.5)),
               b.m('GREATER_THAN', lp.outputs['Glossy Depth'], b.m('SUBTRACT', b.ctrl('gg_glass_gloss'), 0.5)))
    t_cl = b.node('ShaderNodeBsdfTransparent', _in={'Color': (1, 1, 1, 1)})
    s = b.mix_shader(over, g.outputs[0], t_cl.outputs[0])
    # "diffuse ray" must mean a real bounce ray (diffuse depth >= 1): Cycles' shadow-caustics solver (MNEE) evaluates
    # the caster with the diffuse flag at diffuse depth 0 and needs to find the true refractive BSDF there.
    bounce = b.m('MULTIPLY', lp.outputs['Is Diffuse Ray'], b.m('GREATER_THAN', lp.outputs['Diffuse Depth'], 0.5))
    soft = b.m('MAXIMUM', lp.outputs['Is Shadow Ray'], bounce)
    b.surface(b.mix_shader(soft, s, t_sh.outputs[0]))
    mat.diffuse_color = (0.75, 0.86, 1.0, 0.25)
    return mat


def glass_lens(mat):
    """Small coated lens elements: denser glass with a violet-green anti-reflection sheen."""
    b = B(mat)
    p = b.principled()
    b.set(p, 'Base Color', (0.82, 0.86, 1.0)); b.set(p, 'Roughness', 0.0); b.set(p, 'IOR', 1.62)
    b.set(p, 'Transmission Weight', 1.0)
    for k, v in (('Thin Film Thickness', 420.0), ('Thin Film IOR', 1.38), ('Coat Weight', 0.0)):
        if k in p.inputs:
            b.set(p, k, v)
    lp = b.lp
    t = b.node('ShaderNodeBsdfTransparent', _in={'Color': (0.75, 0.8, 0.95, 1)})
    soft = b.m('MAXIMUM', lp.outputs['Is Shadow Ray'], lp.outputs['Is Diffuse Ray'])
    b.surface(b.mix_shader(soft, p.outputs[0], t.outputs[0]))
    return mat


# ---------------------------------------------------------------------------------------------- metals
def metal(mat, color, rough=0.2, rough_var=0.05, aniso=0.0, streak=False, grain=120.0, coat=0.0):
    b = B(mat)
    if streak:   # brushed: roughness streaks running round the part axis / along its length
        r = _rough(b, rough, rough_var, size=1.0, scale=(5.0, 5.0, 3000.0))
    else:
        r = _rough(b, rough, rough_var, size=grain)
    p = b.principled()
    b.set(p, 'Base Color', color); b.set(p, 'Metallic', 1.0); b.set(p, 'Roughness', r)
    if aniso > 0:
        b.set(p, 'Anisotropic', aniso)
        tg = b.node('ShaderNodeTangent', direction_type='RADIAL', axis='Z')
        b.link(tg.outputs[0], p.inputs['Tangent'])
    if coat > 0:
        b.set(p, 'Coat Weight', coat); b.set(p, 'Coat Roughness', 0.05)
    b.surface(p.outputs[0])
    mat.diffuse_color = (*color[:3], 1.0)
    return mat


def copper(mat):
    """Copper with fine parallel ridges, so a winding block reads as wound enamelled wire."""
    b = B(mat)
    r = _rough(b, 0.24, 0.06, size=200.0)
    w = b.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z', _in={'Scale': 900.0, 'Distortion': 0.4, 'Detail': 0.0})
    b.link(b.objco(), w.inputs['Vector'])
    bump = b.node('ShaderNodeBump', _in={'Strength': 0.5, 'Distance': 0.0003, 'Height': w.outputs['Fac']})
    col = b.mix(w.outputs['Fac'], (0.72, 0.28, 0.12, 1), (0.96, 0.50, 0.28, 1))
    p = b.principled()
    b.set(p, 'Base Color', col); b.set(p, 'Metallic', 1.0); b.set(p, 'Roughness', r)
    b.set(p, 'Coat Weight', 0.5); b.set(p, 'Coat Roughness', 0.08)       # enamel
    b.link(bump.outputs[0], p.inputs['Normal'])
    b.surface(p.outputs[0])
    return mat


def dielectric(mat, color, rough=0.4, rough_var=0.05, spec=0.5, coat=0.0, grain=300.0, emit=None, emit_strength=0.0):
    b = B(mat)
    p = b.principled()
    b.set(p, 'Base Color', color); b.set(p, 'Roughness', _rough(b, rough, rough_var, size=grain))
    b.set(p, 'Specular IOR Level', spec)
    if coat > 0:
        b.set(p, 'Coat Weight', coat); b.set(p, 'Coat Roughness', 0.06)
    if emit is not None:        # softly back-lit when the gate is alive
        b.set(p, 'Emission Color', emit)
        b.set(p, 'Emission Strength', b.m('MULTIPLY', b.ctrl('gg_power'), emit_strength))
        mat.cycles.emission_sampling = 'NONE'
    b.surface(p.outputs[0])
    mat.diffuse_color = (*color[:3], 1.0)
    return mat


# ---------------------------------------------------------------------------------------------- PCB
def pcb(mat, mask=(0.008, 0.085, 0.040), mask_cu=(0.020, 0.21, 0.085), tile=0.085):
    """Solder mask over copper traces (lighter, slightly raised), exposed gold pads, white silkscreen.
    The art (tex/pcb_traces.png) is box-projected in object space with a real-world tile size, so every PCB part
    gets it whatever its UVs are."""
    b = B(mat)
    co = b.objco(scale=(1 / tile, 1 / tile, 1 / tile))
    im = b.image('pcb_traces.png', vector=co, colorspace='Non-Color', extension='REPEAT', projection='BOX', blend=0.05)
    sep = b.node('ShaderNodeSeparateColor')
    b.link(im.outputs['Color'], sep.inputs[0])
    tr, pad, silk = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    weave = b.noise(size=2500.0, detail=1.0)                    # faint glass-fibre mottling under the mask
    base = b.mix(b.m('MULTIPLY', weave, 0.25), mask, (0.012, 0.12, 0.05, 1))
    col = b.mix(tr, base, mask_cu)
    col = b.mix(silk, col, (0.80, 0.82, 0.78, 1))
    col = b.mix(pad, col, (1.0, 0.70, 0.28, 1))
    rough = b.mixf(pad, _rough(b, 0.22, 0.05, size=400.0), 0.28)
    rough = b.mixf(silk, rough, 0.6)
    h = b.m('ADD', b.m('MULTIPLY', tr, 0.6), b.m('MULTIPLY', silk, 0.3))
    h = b.m('SUBTRACT', h, b.m('MULTIPLY', pad, 0.4))
    bump = b.node('ShaderNodeBump', _in={'Strength': 0.8, 'Distance': 0.00006, 'Height': h})
    p = b.principled()
    b.set(p, 'Base Color', col); b.set(p, 'Metallic', pad); b.set(p, 'Roughness', rough)
    b.set(p, 'Coat Weight', b.m('SUBTRACT', 0.6, b.m('MULTIPLY', pad, 0.6))); b.set(p, 'Coat Roughness', 0.12)
    b.link(bump.outputs[0], p.inputs['Normal'])
    b.surface(p.outputs[0])
    mat.diffuse_color = (0.03, 0.25, 0.1, 1.0)
    return mat


# ---------------------------------------------------------------------------------------------- emissives
def _wave(b, edge=LED_EDGE, tail=LED_TAIL):
    """Returns (colour socket, strength socket) of the LED line at this point of the mesh.

        d      = gg_wave - wave_u            (>0 once the front has passed)
        on     = clamp(d / edge)             the point is behind the front
        head   = on * (1 - clamp(d / tail))^2   hot head, zero again `tail` behind the front
        colour = mix(idle, green, grant * on)
        level  = on + (1 - on) * grant + LED_HEAD * head

    Ahead of the front the LEDs show `grant` x idle: with grant = 0 the first pass lights a dark gate, with
    grant = 1 a second pass turns an idle (blue-violet) gate green. (grant 0, wave 1.1) and (grant 1, wave -0.1)
    look identical, so the director can jump between them on a cut-free frame.
    """
    u = b.node('ShaderNodeAttribute', attribute_type='GEOMETRY', attribute_name='wave_u').outputs['Fac']
    d = b.m('SUBTRACT', b.ctrl('gg_wave'), u)
    on = b.m('DIVIDE', d, edge, clamp=True)
    head = b.m('MULTIPLY', on, b.m('POWER', b.m('SUBTRACT', 1.0, b.m('DIVIDE', d, tail, clamp=True)), 2.0))
    g = b.ctrl('gg_grant')
    col = b.mix(b.m('MULTIPLY', g, on), COL_IDLE, COL_GRANT)
    col = b.mix(b.m('MULTIPLY', head, 0.75), col, (1, 1, 1, 1))            # the head burns white
    level = b.m('ADD', b.m('ADD', on, b.m('MULTIPLY', b.m('SUBTRACT', 1.0, on), g)), b.m('MULTIPLY', head, LED_HEAD))
    return col, level


def led_strip(mat, mode=None):
    mode = mode or LED_MODE
    b = B(mat)
    col, level = _wave(b)
    st = b.m('MULTIPLY', b.m('MULTIPLY', level, b.ctrl('gg_power')), LED_STRENGTH)
    if mode == 'hybrid':        # real lights do the diffuse lighting; the mesh is for the eye, reflections, refractions
        st = b.m('MULTIPLY', st, b.m('SUBTRACT', 1.0, b.lp.outputs['Is Diffuse Ray']))
    em = b.node('ShaderNodeEmission', _in={'Color': col, 'Strength': st})
    # unlit: a milky diffuser so the strip is a real part during the build
    p = b.principled()
    b.set(p, 'Base Color', (0.62, 0.64, 0.72)); b.set(p, 'Roughness', 0.35); b.set(p, 'Specular IOR Level', 0.4)
    b.surface(b.add_shader(p.outputs[0], em.outputs[0]))
    mat.cycles.emission_sampling = 'NONE' if mode == 'hybrid' else 'FRONT_BACK'
    mat['gg_led_mode'] = mode
    return mat


def led_dot(mat, color, ctrl, strength, off=(0.05, 0.01, 0.02)):
    b = B(mat)
    st = b.m('MULTIPLY', b.m('MULTIPLY', b.ctrl(ctrl), b.ctrl('gg_power')), strength) if ctrl else b.m('MULTIPLY', b.ctrl('gg_power'), strength)
    p = b.principled()
    b.set(p, 'Base Color', off); b.set(p, 'Roughness', 0.15)
    b.set(p, 'Emission Color', color); b.set(p, 'Emission Strength', st)
    b.surface(p.outputs[0])
    mat.cycles.emission_sampling = 'NONE'
    return mat


def led_status(mat):
    """Tiny PCB status LEDs: each object picks green / amber / blue at random, a few stay off."""
    b = B(mat)
    oi = b.node('ShaderNodeObjectInfo')
    ramp = b.node('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.0, 1.0, 0.15, 1)
    els[1].position = 0.55; els[1].color = (1.0, 0.45, 0.0, 1)
    e = els.new(0.75); e.color = (0.1, 0.25, 1.0, 1)
    e = els.new(0.9); e.color = (0, 0, 0, 1)
    b.link(oi.outputs['Random'], ramp.inputs[0])
    p = b.principled()
    b.set(p, 'Base Color', (0.5, 0.5, 0.5)); b.set(p, 'Roughness', 0.2)
    b.set(p, 'Emission Color', ramp.outputs[0]); b.set(p, 'Emission Strength', b.m('MULTIPLY', b.ctrl('gg_power'), 18.0))
    b.surface(p.outputs[0])
    mat.cycles.emission_sampling = 'NONE'
    return mat


def _uv(b):
    return b.node('ShaderNodeTexCoord').outputs['UV']


def _grant_switch(b):
    """grant 0..1 -> a quick but soft idle->granted switch around 0.5"""
    g = b.ctrl('gg_grant')
    return b.m('SMOOTHSTEP', g, 0.35, 0.65) if False else b.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP', _in={0: g, 1: 0.35, 2: 0.65, 3: 0.0, 4: 1.0}).outputs[0]


def screen_lcd(mat):
    """Reader LCD. Off = black glass. Boot (gg_screens 0..1): the picture opens from the centre line and fades up."""
    b = B(mat)
    uv = _uv(b)
    a = b.image('lcd_idle.png', vector=uv).outputs['Color']
    g = b.image('lcd_grant.png', vector=uv).outputs['Color']
    img = b.mix(_grant_switch(b), a, g)
    s = b.ctrl('gg_screens')
    v = b.node('ShaderNodeSeparateXYZ', _in={0: uv}).outputs[1]
    dist = b.m('MULTIPLY', b.m('ABSOLUTE', b.m('SUBTRACT', v, 0.5)), 2.0)             # 0 centre .. 1 edge
    opened = b.m('MULTIPLY', s, 1.6)
    mask = b.m('DIVIDE', b.m('SUBTRACT', opened, dist), 0.08, clamp=True)
    line = b.m('MULTIPLY', b.m('SUBTRACT', 1.0, b.m('DIVIDE', b.m('ABSOLUTE', b.m('SUBTRACT', opened, dist)), 0.05, clamp=True)),
               b.m('SUBTRACT', 1.0, b.m('DIVIDE', b.m('SUBTRACT', s, 0.55), 0.15, clamp=True)))   # bright opening edge, gone by s~0.7
    lvl = b.m('MULTIPLY', mask, b.m('DIVIDE', s, 0.75, clamp=True))
    col = b.mix(line, img, (0.6, 0.6, 1.0, 1))
    back = b.mix(lvl, (0, 0, 0, 1), (0.012, 0.012, 0.03, 1))                              # back-light bleed of a lit panel
    n = b.node('ShaderNodeMix', data_type='RGBA', blend_type='ADD')
    b.set(n, 'Factor_Float', 1.0); b.set(n, 'A_Color', b.scale(col, b.m('MAXIMUM', lvl, b.m('MULTIPLY', line, s)))); b.set(n, 'B_Color', back)
    emc = [o for o in n.outputs if o.identifier == 'Result_Color'][0]
    p = b.principled()
    b.set(p, 'Base Color', (0.004, 0.004, 0.006)); b.set(p, 'Roughness', 0.04); b.set(p, 'Specular IOR Level', 0.6)
    b.set(p, 'Emission Color', emc); b.set(p, 'Emission Strength', b.m('MULTIPLY', b.ctrl('gg_power'), SCREEN_STRENGTH))
    b.surface(p.outputs[0])
    mat.cycles.emission_sampling = 'FRONT'
    return mat


def screen_wing(mat):
    """Transparent display layer in the wing. Off = perfectly clear. Boot: the picture wipes up with a bright scan line."""
    b = B(mat)
    uv = _uv(b)
    a = b.image('wing_idle.png', vector=uv).outputs['Color']
    g = b.image('wing_grant.png', vector=uv).outputs['Color']
    img = b.mix(_grant_switch(b), a, g)
    s = b.ctrl('gg_screens')
    v = b.node('ShaderNodeSeparateXYZ', _in={0: uv}).outputs[1]
    front = b.m('MULTIPLY', s, 1.25)
    mask = b.m('DIVIDE', b.m('SUBTRACT', front, v), 0.04, clamp=True)
    line = b.m('MULTIPLY', b.m('SUBTRACT', 1.0, b.m('DIVIDE', b.m('ABSOLUTE', b.m('SUBTRACT', front, v)), 0.012, clamp=True)),
               b.m('SUBTRACT', 1.0, b.m('DIVIDE', b.m('SUBTRACT', s, 0.7), 0.1, clamp=True)))
    inside = b.m('MULTIPLY', b.m('LESS_THAN', b.m('ABSOLUTE', b.m('SUBTRACT', b.node('ShaderNodeSeparateXYZ', _in={0: uv}).outputs[0], 0.5)), 0.5),
                 b.m('LESS_THAN', b.m('ABSOLUTE', b.m('SUBTRACT', v, 0.5)), 0.5))
    lvl = b.m('MULTIPLY', b.m('MULTIPLY', mask, b.m('DIVIDE', s, 0.6, clamp=True)), inside)
    col = b.scale(img, lvl)
    n = b.node('ShaderNodeMix', data_type='RGBA', blend_type='ADD')
    b.set(n, 'Factor_Float', 1.0); b.set(n, 'A_Color', col); b.set(n, 'B_Color', b.scale(b.mix(_grant_switch(b), COL_IDLE, COL_GRANT), b.m('MULTIPLY', line, b.m('MULTIPLY', inside, 1.5))))
    emc = [o for o in n.outputs if o.identifier == 'Result_Color'][0]
    em = b.node('ShaderNodeEmission', _in={'Color': emc, 'Strength': b.m('MULTIPLY', b.ctrl('gg_power'), WING_STRENGTH)})
    tr = b.node('ShaderNodeBsdfTransparent', _in={'Color': (1, 1, 1, 1)})
    b.surface(b.add_shader(tr.outputs[0], em.outputs[0]))
    mat.cycles.emission_sampling = 'FRONT_BACK'
    mat.diffuse_color = (0.3, 0.4, 0.8, 0.2)
    return mat


def badge(mat):
    """Brushed steel plate, black-filled engraved HYALO G1 lettering with a faint back-lit glow when alive."""
    b = B(mat)
    k = b.image('badge.png', vector=_uv(b), colorspace='Non-Color').outputs['Color']
    k = b.node('ShaderNodeSeparateColor', _in={0: k}).outputs[0]
    r = _rough(b, 0.26, 0.06, size=1.0, scale=(8.0, 2500.0, 2500.0))
    p = b.principled()
    b.set(p, 'Base Color', b.mix(k, (0.78, 0.79, 0.82, 1), (0.01, 0.01, 0.014, 1)))
    b.set(p, 'Metallic', b.m('SUBTRACT', 1.0, k)); b.set(p, 'Roughness', b.mixf(k, r, 0.35))
    bump = b.node('ShaderNodeBump', _in={'Strength': 0.6, 'Distance': 0.0002, 'Height': b.m('SUBTRACT', 1.0, k)})
    b.link(bump.outputs[0], p.inputs['Normal'])
    b.set(p, 'Emission Color', b.mix(b.ctrl('gg_grant'), (0.55, 0.5, 1.0, 1), (0.3, 1.0, 0.5, 1)))
    b.set(p, 'Emission Strength', b.m('MULTIPLY', b.m('MULTIPLY', k, b.ctrl('gg_power')), 2.2))
    b.surface(p.outputs[0])
    mat.cycles.emission_sampling = 'NONE'
    return mat


# ---------------------------------------------------------------------------------------------- the table
BUILDERS = {
    'GLASS_BODY': lambda m: glass(m),
    'GLASS_WING': lambda m: glass(m, tint=(0.64, 0.72, 0.98), tint_dist=0.08),
    'GLASS_LENS': glass_lens,
    'METAL_STEEL': lambda m: metal(m, (0.76, 0.77, 0.79), rough=0.10, rough_var=0.04, grain=220.0),
    'METAL_ALU': lambda m: metal(m, (0.80, 0.81, 0.83), rough=0.27, rough_var=0.05, aniso=0.7, streak=True),
    'METAL_DARK': lambda m: metal(m, (0.045, 0.045, 0.060), rough=0.34, rough_var=0.06, aniso=0.4, streak=True),
    'BRASS': lambda m: metal(m, (0.93, 0.66, 0.26), rough=0.17, rough_var=0.06, grain=260.0),
    'COPPER': copper,
    'SPRING_STEEL': lambda m: metal(m, (0.33, 0.36, 0.46), rough=0.16, rough_var=0.04, grain=300.0),
    'PCB_GREEN': pcb,
    'PCB_GOLD': lambda m: metal(m, (1.0, 0.72, 0.29), rough=0.22, rough_var=0.05, grain=500.0),
    'CHIP_BLACK': lambda m: dielectric(m, (0.016, 0.016, 0.018), rough=0.42, rough_var=0.08, grain=1500.0),
    'CAP_ALU': lambda m: metal(m, (0.86, 0.86, 0.88), rough=0.16, rough_var=0.04, aniso=0.5, streak=True),
    'PLASTIC_WHITE': lambda m: dielectric(m, (0.80, 0.80, 0.78), rough=0.38, rough_var=0.05),
    'PLASTIC_BLACK': lambda m: dielectric(m, (0.012, 0.012, 0.014), rough=0.28, rough_var=0.06),
    'RUBBER': lambda m: dielectric(m, (0.015, 0.015, 0.015), rough=0.72, rough_var=0.06, spec=0.3),
    'CABLE_RED': lambda m: dielectric(m, (0.62, 0.02, 0.02), rough=0.38, rough_var=0.05),
    'CABLE_BLUE': lambda m: dielectric(m, (0.02, 0.07, 0.62), rough=0.38, rough_var=0.05),
    'CABLE_YELLOW': lambda m: dielectric(m, (0.80, 0.55, 0.02), rough=0.38, rough_var=0.05),
    'CABLE_WHITE': lambda m: dielectric(m, (0.78, 0.78, 0.76), rough=0.38, rough_var=0.05),
    'LED_STRIP': led_strip,
    'LED_IR': lambda m: led_dot(m, COL_IR, 'gg_ir', 22.0),
    'LED_STATUS': led_status,
    'SCREEN_LCD': screen_lcd,
    'SCREEN_WING': screen_wing,
    'BADGE': badge,
    'PRINT_WHITE': lambda m: dielectric(m, (0.86, 0.86, 0.86), rough=0.5, emit=(0.7, 0.7, 1.0, 1), emit_strength=1.6),
}

_FALLBACK = [   # (keyword, contract material whose look to borrow)
    ('GLASS', 'GLASS_BODY'), ('LENS', 'GLASS_LENS'), ('SCREEN', 'SCREEN_LCD'), ('LED', 'LED_STATUS'), ('BRASS', 'BRASS'),
    ('BRONZE', 'BRASS'), ('GOLD', 'PCB_GOLD'), ('COPPER', 'COPPER'), ('PCB', 'PCB_GREEN'), ('STEEL', 'METAL_STEEL'),
    ('CHROME', 'METAL_STEEL'), ('ALU', 'METAL_ALU'), ('DARK', 'METAL_DARK'), ('METAL', 'METAL_STEEL'), ('RUBBER', 'RUBBER'),
    ('CABLE', 'CABLE_WHITE'), ('WIRE', 'CABLE_WHITE'), ('WHITE', 'PLASTIC_WHITE'), ('PRINT', 'PRINT_WHITE'), ('CHIP', 'CHIP_BLACK'),
    ('BLACK', 'PLASTIC_BLACK'), ('PLASTIC', 'PLASTIC_BLACK'),
]

SKIP_PREFIX = ('STUDIO_', 'GG_')        # studio.py materials are not ours to rebuild here


def base_name(name):
    """'BRASS.001' -> 'BRASS'"""
    if len(name) > 4 and name[-4] == '.' and name[-3:].isdigit():
        return name[:-4]
    return name


def ensure_ctrl(scene=None):
    """The scene properties the shaders read (alive.py owns the alive ones; this only makes sure they exist)."""
    scene = scene or bpy.context.scene
    for key, default in (('gg_power', 0.0), ('gg_wave', -0.1), ('gg_grant', 0.0), ('gg_screens', 0.0), ('gg_ir', 0.0),
                         ('gg_house', 1.0), ('gg_glass_depth', 8.0), ('gg_glass_gloss', 4.0)):
        if key not in scene:
            scene[key] = default


def apply_materials(scene=None, verbose=True, create_missing=True):
    """Fill every contract material; give unknown names a fallback. Returns {'filled': [...], 'fallback': {...}, 'created': [...]}."""
    scene = scene or bpy.context.scene
    ensure_ctrl(scene)
    report = {'filled': [], 'fallback': {}, 'created': []}
    if create_missing:
        for name in CONTRACT:
            if name not in bpy.data.materials:
                bpy.data.materials.new(name); report['created'].append(name)
    for m in list(bpy.data.materials):
        if m.name.startswith(SKIP_PREFIX) or m.is_grease_pencil:
            continue
        name = base_name(m.name)
        if name in BUILDERS:
            BUILDERS[name](m)
            report['filled'].append(m.name)
            continue
        up = name.upper()
        like = next((tgt for key, tgt in _FALLBACK if key in up), None)
        if like is None:        # keep the modeller's viewport colour on a neutral satin plastic
            c = tuple(m.diffuse_color[:3])
            dielectric(m, c, rough=0.4)
            m.diffuse_color = (*c, 1.0)
            like = 'neutral satin plastic in its viewport colour'
        else:
            BUILDERS[like](m)
        report['fallback'][m.name] = like
    if verbose:
        print(f"[materials] filled {len(report['filled'])} contract materials"
              + (f", created (unused so far): {report['created']}" if report['created'] else ''))
        for k, v in report['fallback'].items():
            print(f'[materials] UNKNOWN material "{k}" -> fallback: {v}')
    return report
