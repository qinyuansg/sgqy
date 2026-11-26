"""Director animation library: landing curves, part fly-ins, camera baking.

All times are seconds on the 60 fps / 120 BPM grid (1 beat = 0.5 s = 30 frames).
Parts are animated in their parent's space; a parent must be at rest while its children fly.
"""
import bpy, math, random
from mathutils import Vector, Matrix, Quaternion

FPS = 60


def F(t):
    return int(round(t * FPS))


# ------------------------------------------------------------------ curves
def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp01(x)
    return x * x * x * (x * (x * 6 - 15) + 10)


def ease_out(x, p=3.0):
    return 1 - (1 - clamp01(x)) ** p


def ease_in(x, p=3.0):
    return clamp01(x) ** p


def approach(s, k=2.4):
    """Remaining-distance fraction 1 -> 0. Slow start, accelerating into the seat: the part
    is at full speed on contact, which is what makes a landing read as snappy."""
    return 1.0 - clamp01(s) ** k


def rebound(tau, amp, freq=9.0, decay=0.05):
    """Micro-bounce after contact (tau seconds after landing), always on the arrival side."""
    if tau <= 0:
        return 0.0
    return amp * math.exp(-tau / decay) * abs(math.sin(2 * math.pi * freq * tau))


def ring(tau, amp, freq=11.0, decay=0.07):
    """Signed damped wobble after contact."""
    if tau <= 0:
        return 0.0
    return amp * math.exp(-tau / decay) * math.sin(2 * math.pi * freq * tau)


# ------------------------------------------------------------------ parts
class Part:
    """One animatable root object with its rest (assembled) pose."""

    def __init__(self, obj, info):
        self.obj = obj
        self.info = info
        self.name = obj.name
        obj.rotation_mode = 'QUATERNION'
        self.rest_loc = obj.location.copy()
        self.rest_rot = obj.rotation_quaternion.copy()
        self.rest_world = obj.matrix_world.copy()
        if obj.parent:
            pm = (obj.parent.matrix_world @ obj.matrix_parent_inverse).to_3x3()
            self.to_local = pm.inverted()
        else:
            self.to_local = Matrix.Identity(3)
        self.world_rot_inv = obj.matrix_world.to_3x3().normalized().inverted()
        self.keys = {}      # frame -> (loc, rot)
        self.vis = []       # (frame, visible)
        self.center = Vector(info.get('bbox_min', (0, 0, 0))).lerp(Vector(info.get('bbox_max', (0, 0, 0))), 0.5)

    def pose(self, frame, offset_world=(0, 0, 0), twist=0.0, axis_world=(0, 0, 1), wobble=None):
        """Set the pose at a frame: rest + world-space offset, twist (rad) about a world axis
        through the object's origin, optional (axis_world, angle) wobble."""
        loc = self.rest_loc + self.to_local @ Vector(offset_world)
        rot = self.rest_rot.copy()
        if twist:
            ax = (self.world_rot_inv @ Vector(axis_world)).normalized()
            rot = rot @ Quaternion(ax, twist)
        if wobble and wobble[1]:
            ax = (self.world_rot_inv @ Vector(wobble[0])).normalized()
            rot = rot @ Quaternion(ax, wobble[1])
        self.keys[frame] = (loc, rot)

    def show(self, frame, visible):
        self.vis.append((frame, visible))

    def family(self, animatable_names):
        """The object plus every descendant that is not itself an animatable part."""
        out = [self.obj]
        stack = list(self.obj.children)
        while stack:
            c = stack.pop()
            if c.name in animatable_names:
                continue
            out.append(c)
            stack.extend(c.children)
        return out

    def bake(self, animatable_names):
        o = self.obj
        prev = None
        for f in sorted(self.keys):
            loc, rot = self.keys[f]
            if prev is not None and rot.dot(prev) < 0:
                rot = -rot
            prev = rot
            o.location = loc
            o.rotation_quaternion = rot
            o.keyframe_insert('location', frame=f)
            o.keyframe_insert('rotation_quaternion', frame=f)
        fam = self.family(animatable_names)
        for f, v in sorted(self.vis):
            for m in fam:
                m.hide_render = not v
                m.hide_viewport = not v
                m.keyframe_insert('hide_render', frame=f)
                m.keyframe_insert('hide_viewport', frame=f)


def fly_in(part, t_land, dur=0.4, dist=0.6, direction=(0, 0, 1), twist_deg=0.0, k=2.4,
           bounce=0.004, wobble_deg=0.6, settle=0.3, turns=0.0, seed=0, side=None, show_from=None, mode='drop'):
    """Fly a part from `dist` metres away along `direction` (world, pointing FROM the seat TO where it
    comes from) and land it exactly at t_land with a micro-bounce and a wobble.
    mode 'screw': arrive fast to 28 mm above the hole, then drive in at constant speed while turning `turns`.
    side: clearance offset held during travel and closed in the last 22 %.
    show_from: first visible frame (a flight that starts before a cut is only shown from the cut)."""
    d = Vector(direction).normalized()
    f0, fl, f1 = F(t_land - dur), F(t_land), F(t_land + settle)
    rnd = random.Random(seed)
    perp = d.orthogonal().normalized()
    perp = Quaternion(d, rnd.uniform(0, math.tau)) @ perp
    vis0 = f0 if show_from is None else max(f0, show_from)
    part.show(vis0 - 1, False)
    part.show(vis0, True)
    NEAR, SPLIT = 0.028, 0.40
    for f in range(f0, f1 + 1):
        if f <= fl:
            s = (f - f0) / max(1, fl - f0)
            if mode == 'screw':
                if s < SPLIT:
                    off = d * (NEAR + (dist - NEAR) * (1 - s / SPLIT) ** 2.2); tw = 0.0
                else:
                    u = (s - SPLIT) / (1 - SPLIT)
                    off = d * (NEAR * (1 - u)); tw = -math.tau * turns * (1 - u)
            else:
                a = approach(s, k)
                off = d * (dist * a)
                tw = math.radians(twist_deg) * a
            if side is not None:
                off = off + Vector(side) * (1.0 - smooth((s - 0.78) / 0.22))
            part.pose(f, off, tw, d)
        else:
            tau = (f - fl) / FPS
            off = d * rebound(tau, bounce)
            part.pose(f, off, 0.0, d, (perp, math.radians(ring(tau, wobble_deg))))
    part.pose(f1 + 1, (0, 0, 0))
    part.fly = (vis0, fl, d * dist + (Vector(side) if side is not None else Vector()))
    return fl


def trapezoid(u, ta=0.25):
    """0..1 position for a trapezoidal velocity profile (servo move): accelerate for ta, cruise, decelerate for ta."""
    u = clamp01(u)
    vmax = 1.0 / (1.0 - ta)
    if u < ta:
        return 0.5 * vmax * u * u / ta
    if u > 1 - ta:
        r = 1 - u
        return 1.0 - 0.5 * vmax * r * r / ta
    return 0.5 * vmax * ta + vmax * (u - ta)


def cam_project(b, p, aspect=1.25, sensor=36.0):
    """Project a world point with a baked camera sample (pos, quat, lens, ...): (x, y, depth), x/y in 0..1."""
    pos, q, lens = b[0], b[1], b[2]
    v = q.inverted() @ (Vector(p) - pos)
    z = -v.z
    if z <= 1e-6:
        return 0.5, 0.5, z
    return 0.5 + (v.x / z) * (lens / sensor), 0.5 + (v.y / z) * (lens / (sensor * aspect)), z


# ------------------------------------------------------------------ camera
def catmull(pts, u):
    """Uniform Catmull-Rom through pts, u in 0..1 over the whole path."""
    n = len(pts)
    if n == 1:
        return Vector(pts[0])
    if n == 2:
        return Vector(pts[0]).lerp(Vector(pts[1]), u)
    x = clamp01(u) * (n - 1)
    i = min(int(x), n - 2)
    t = x - i
    p0 = Vector(pts[max(i - 1, 0)]); p1 = Vector(pts[i]); p2 = Vector(pts[i + 1]); p3 = Vector(pts[min(i + 2, n - 1)])
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


def keyed(keys, t):
    """Piecewise smooth interpolation of [(t, value)] (value: float or 3-tuple)."""
    if t <= keys[0][0]:
        v = keys[0][1]
    elif t >= keys[-1][0]:
        v = keys[-1][1]
    else:
        for (ta, va), (tb, vb) in zip(keys, keys[1:]):
            if ta <= t <= tb:
                u = smoother((t - ta) / (tb - ta))
                if isinstance(va, (int, float)):
                    return va + (vb - va) * u
                return Vector(va).lerp(Vector(vb), u)
    return v if isinstance(v, (int, float)) else Vector(v)


def look_quat(pos, target, roll=0.0):
    d = (Vector(target) - Vector(pos)).normalized()
    q = d.to_track_quat('-Z', 'Y')
    if roll:
        q = q @ Quaternion((0, 0, 1), roll)
    return q


class Shot:
    """A camera shot. pos/target: waypoint lists (Catmull-Rom), `ramp` maps shot time 0..1 to path
    position 0..1 (speed ramp). focus: [(t_abs, point)] rack-focus keys. lens/fstop: float or keys."""

    def __init__(self, name, t0, t1, pos, target, focus=None, lens=50.0, fstop=2.8, ramp=None, roll=0.0,
                 target_ramp=None):
        self.name, self.t0, self.t1 = name, t0, t1
        self.pos, self.target = pos, target
        self.focus = focus
        self.lens, self.fstop, self.roll = lens, fstop, roll
        self.ramp = ramp or smooth
        self.target_ramp = target_ramp or self.ramp

    def eval(self, t):
        u = (t - self.t0) / (self.t1 - self.t0)
        pos = catmull(self.pos, self.ramp(u))
        tgt = catmull(self.target, self.target_ramp(u))
        foc = keyed(self.focus, t) if self.focus else tgt
        lens = keyed(self.lens, t) if isinstance(self.lens, list) else self.lens
        fst = keyed(self.fstop, t) if isinstance(self.fstop, list) else self.fstop
        roll = keyed(self.roll, t) if isinstance(self.roll, list) else self.roll
        return pos, tgt, foc, lens, fst, roll


def bake_camera(cam, shots, n_frames, shakes=()):
    """Bake every frame. shakes: [(t, amplitude_m)] decaying impact shakes."""
    cam.rotation_mode = 'QUATERNION'
    cd = cam.data
    cd.dof.use_dof = True
    prev_q = None
    rnd = random.Random(7)
    shake_dirs = [(t, a, Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()) for t, a in shakes]
    out = []
    for f in range(n_frames):
        t = f / FPS
        shot = next((s for s in shots if s.t0 <= t < s.t1), shots[-1])
        pos, tgt, foc, lens, fst, roll = shot.eval(t)
        for ts, amp, dv in shake_dirs:
            tau = t - ts
            if 0 <= tau < 0.25:
                pos = pos + dv * (amp * math.exp(-tau / 0.045) * math.cos(2 * math.pi * 24 * tau))
        q = look_quat(pos, tgt, roll)
        if prev_q is not None and q.dot(prev_q) < 0:
            q = -q
        prev_q = q
        view = q @ Vector((0, 0, -1))
        fd = max(0.03, (Vector(foc) - pos).dot(view))
        cam.location = pos
        cam.rotation_quaternion = q
        cd.lens = lens
        cd.dof.focus_distance = fd
        cd.dof.aperture_fstop = fst
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_quaternion', frame=f)
        cd.keyframe_insert('lens', frame=f)
        cd.dof.keyframe_insert('focus_distance', frame=f)
        cd.dof.keyframe_insert('aperture_fstop', frame=f)
        out.append((pos.copy(), q.copy(), lens, fd, fst, shot.name))
    return out


def set_linear(id_block):
    """Make every key on an ID's action linear (we bake every frame)."""
    ad = id_block.animation_data
    if not ad or not ad.action:
        return
    try:
        from bpy_extras import anim_utils
        cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
        fcs = cb.fcurves if cb else []
    except Exception:
        fcs = getattr(ad.action, 'fcurves', [])
    for fc in fcs:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'


def project(scene, cam, point):
    """NDC of a world point for the scene's camera at the current frame: (x, y, depth); x,y in 0..1."""
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(scene, cam, Vector(point))
    return v.x, v.y, v.z
