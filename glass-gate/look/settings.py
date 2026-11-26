"""Helper B — recommended Cycles settings for the glass look (call AFTER gg_common.setup_cycles).

    import settings; settings.recommended(scene)            # or recommended(scene, quality='fast')

The glass material has its own bounce guard (scene["gg_glass_depth"], scene["gg_glass_gloss"]): past that many
transmission / glossy bounces a glass surface turns into a plain transparent one, so nothing goes black. The Cycles
limits only have to stay ABOVE the guard; this function keeps the two in step.
"""
import bpy

QUALITY = {
    #          guard_T guard_G  max  trans gloss diff  transparent
    'fast':    (6,      3,       10,  7,    4,    1,    16),
    'default': (8,      4,       14,  9,    5,    2,    24),
    'macro':   (10,     5,       18,  11,   6,    2,    32),
}


def recommended(scene=None, quality='default', look='AgX - Punchy'):
    scene = scene or bpy.context.scene
    gt, gg_, mx, tr, gl, df, tp = QUALITY[quality]
    scene['gg_glass_depth'] = float(gt)
    scene['gg_glass_gloss'] = float(gl - 1) if gg_ >= gl else float(gg_)
    c = scene.cycles
    c.max_bounces = mx
    c.transmission_bounces = tr
    c.glossy_bounces = gl
    c.diffuse_bounces = df
    c.transparent_max_bounces = tp
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 1.0
    c.sample_clamp_indirect = 6.0
    c.sample_clamp_direct = 0.0
    c.use_light_tree = True
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = look
    except TypeError:
        pass
    return scene
