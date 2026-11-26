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
    c.blur_glossy = 2.0                 # with clamp 3: 18 % less seed-to-seed difference at 16 spp, same render time
    c.sample_clamp_indirect = 3.0
    c.sample_clamp_direct = 0.0
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = look
    except TypeError:
        pass
    return scene


def final(scene=None, denoise_quality='BALANCED', prefilter='FAST', adaptive_threshold=None, adaptive_min=None):
    """Cost settings for the final animation. Call AFTER gg_common.setup_cycles(scene, preset) and recommended():

        gg.setup_cycles(sc, 'final'); settings.recommended(sc); settings.final(sc)

    Measured on director/scene.blend (see NOTES.md, round 2). Leaves samples, resolution and threads alone."""
    scene = scene or bpy.context.scene
    c = scene.cycles
    if hasattr(c, 'denoising_quality'):
        c.denoising_quality = denoise_quality
    c.denoising_prefilter = prefilter
    c.use_adaptive_sampling = True
    if adaptive_threshold is not None:
        c.adaptive_threshold = adaptive_threshold
    if adaptive_min is not None:
        c.adaptive_min_samples = adaptive_min
    c.use_light_tree = False            # measured: 18-22 % of the frame, and no gain in seed stability with this rig
    scene.render.use_persistent_data = True
    if scene.compositing_node_group is not None:
        scene.render.compositor_device = 'CPU'      # the GPU compositor needs a display and kills a headless bpy
    return scene
