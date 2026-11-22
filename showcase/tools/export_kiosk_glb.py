"""Export the Foyer VK-1 kiosk (core unit + floor kit) as a coloured GLB and
print feature positions in the showcase viewer's normalised coordinates."""
import sys
import cadquery as cq
import enclosure as E

out = sys.argv[1]
MODEL_HEIGHT = 1.7

asm = cq.Assembly(name="EnrolmentKiosk")
shapes = []
STAND = (0.42, 0.45, 0.5)   # lighter than the CAD's near-black so it reads on a dark stage
for p in E.manufactured() + E.kits()["floor"]:
    colour = STAND if p.name in ("floor_stand", "mount_plate") else p.color
    asm.add(p.shape, name=p.name, color=cq.Color(*colour))
    shapes.append(p.shape)

yf = E.Y_HEAD_FRONT
extras = {
    # lit display area just proud of the glass
    "screen": (E.box(E.DISPLAY_ACTIVE[0], 0.6, E.DISPLAY_ACTIVE[1], 0, yf - 0.6,
                     E.Z_DISPLAY + (E.DISPLAY[2] - E.DISPLAY_ACTIVE[1]) / 2), (0.1, 0.36, 0.62)),
    "status_light": (E.box(200, 0.6, 5, 0, yf - 0.6, E.Z_SENSORBAR + 14), (0.13, 0.89, 0.65)),
    "camera_rgb": (cq.Workplane("XZ").center(-18, E.Z_CAM).circle(6).extrude(0.8).translate((0, yf, 0)), (0.1, 0.2, 0.45)),
    "camera_ir": (cq.Workplane("XZ").center(18, E.Z_CAM).circle(6).extrude(0.8).translate((0, yf, 0)), (0.1, 0.2, 0.45)),
    "qr_window": (E.box(50, 0.6, 22, -45, yf - 0.6, E.Z_HEAD + 9), (0.25, 0.05, 0.05)),
}
for name, (shape, colour) in extras.items():
    asm.add(shape, name=name, color=cq.Color(*colour))

asm.save(out, tolerance=0.2, angularTolerance=0.2)

# bounding box of everything -> same normalisation the viewer applies
bb = None
for s in shapes:
    b = s.val().BoundingBox()
    lo, hi = (b.xmin, b.ymin, b.zmin), (b.xmax, b.ymax, b.zmax)
    bb = (lo, hi) if bb is None else (tuple(map(min, bb[0], lo)), tuple(map(max, bb[1], hi)))
(x0, y0, z0), (x1, y1, z1) = bb
s = MODEL_HEIGHT / (z1 - z0)
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
print("bbox", bb, "scale", s)

def norm(x, y, z):
    return [round((x - cx) * s, 3), round((z - z0) * s, 3), round(-(y - cy) * s, 3)]

points = {
    "touchscreen": (0, yf, E.Z_DISPLAY + E.DISPLAY[2] / 2),
    "cameras": (0, yf, E.Z_CAM),
    "status_light": (70, yf, E.Z_SENSORBAR + 16),
    "qr": (-45, yf, E.Z_HEAD + 20),
    "document_reader": (0, 60, E.DECK_FRONT_Z + 12),
    "printer": (0, 0, 45),
    "mount": (0, E.LECT_D + 30, -300),
}
for k, v in points.items():
    print(k, norm(*v))
