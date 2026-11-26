"""Shared helpers for the Glass Gate project. Run everything with:
    /opt/blender-env/venv/bin/python <script.py> [args]
(Blender 5.3 as a Python module; there is no `blender` binary.)
"""
import bpy, os, sys, json, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 60
RES = (1080, 1350)

def path(*p):
    return os.path.join(ROOT, *p)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.unit_settings.system = 'METRIC'
    return sc

PRESETS = {
    # name: (scale %, samples, threads, adaptive threshold)
    'test':  (50, 24, 2, 0.05),    # helpers: quick look-dev stills, 540x675
    'still': (100, 48, 4, 0.02),   # director review stills
    'final': (100, 16, 4, 0.03),   # final animation (director only)
}

def setup_cycles(sc, preset='test'):
    scale, spp, threads, thr = PRESETS[preset]
    sc.render.engine = 'CYCLES'
    c = sc.cycles
    c.device = 'CPU'
    c.samples = spp
    c.use_adaptive_sampling = True
    c.adaptive_threshold = thr
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.max_bounces = 16
    c.transmission_bounces = 16
    c.glossy_bounces = 6
    c.diffuse_bounces = 2
    c.transparent_max_bounces = 24
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 6.0
    c.seed = 0
    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.resolution_percentage = scale
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = threads
    sc.render.use_persistent_data = False
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    return sc

def render_still(sc, filepath, frame=None):
    if frame is not None:
        sc.frame_set(frame)
    sc.render.filepath = filepath
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t
    print(f'[render] {filepath} {dt:.1f}s')
    return dt
