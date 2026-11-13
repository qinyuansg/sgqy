# Foyer VK-1 — Installation Guide

**Target:** one installer, under 30 minutes, any of the three mounting kits.
**You need:** the service key, a T30 Torx Pin (tamper) bit, a 10 mm masonry/wood
bit and drill (wall kit only), a spirit level, and a PoE++ network drop.

> Before you start, check the network drop: **IEEE 802.3bt Type 4 (Class 8, 90 W
> at the switch)** is recommended. Type 3 (Class 6, 60 W) works with the printer
> in "slow mode". 802.3at (PoE+) is **not** enough. If there is no PoE++, use
> a USB-C PD charger of at least 65 W (20 V) on the rear USB-C port instead.

## 1. Site checklist (5 min)

| Check | Requirement |
|---|---|
| Network | Cat6A (Cat6 acceptable ≤ 55 m), PoE++ Type 4, VLAN with outbound HTTPS to the visitor management system (VMS) and fleet endpoint |
| Wi-Fi (optional) | 5 GHz preferred; WPA2/3-Enterprise supported via the site config |
| Floor/wall | Wall: studs or solid masonry; plasterboard only with 4 metal cavity anchors rated ≥ 500 N each. Floor kit: level floor, optional M8 floor anchors |
| Accessibility | 760 × 1220 mm (30 × 48 in) clear floor space in front of the unit for a wheelchair forward approach; no obstruction below the deck |
| Lighting | Avoid direct sunlight on the glass and camera (backlit faces reduce liveness accuracy) |
| Mount height | Fixed by the kits: deck front at **861 mm** (ADA counter ≤ 864 mm), highest touch target ≤ 1117 mm (ADA forward reach ≤ 1220 mm) |

## 2. Fit the mount

All three kits end in the same **mount plate** (6 mm aluminium, two hooks,
VESA 100), so the core unit is identical everywhere.

### Wall kit (10 min)
1. Print `mechanical/out/drawings/wall-drilling-template-A4.pdf` at 100 % and
   check the 100 mm scale bar.
2. Tape it to the wall: the plate centre is **1096 mm above the finished floor**;
   level it, centre it on the network drop / wall box.
3. Drill 4 × Ø10 mm (masonry) or pilot holes into studs, fit M6 anchors.
4. Pull the patch lead through the plate's cable window, screw the plate on with
   4 × M6, level, tighten.

### Desk kit (5 min)
1. Place the weighted base; route the patch lead up the column channel.
2. Bolt the mount plate to the column head (4 × M6, supplied). Optional: through-desk
   bolts (2 × M8) for public desks.

### Floor kit (8 min)
1. Bolt the column to the base (4 × M8, supplied), stand it up, route the patch
   lead up the column channel from the base grommet.
2. Bolt the mount plate to the column cap (4 × M6). Optional: 4 × M8 floor anchors
   through the base corners.

## 3. Hang the core unit (5 min)

1. Lift the unit (≈ 11 kg — use the lectern underside and the head back) and
   engage the two hooks of the mount plate in the slots on the back of the head.
   Lower it; it self-centres.
2. Fit the M6 tamper screw from underneath through the plate tab into the lug
   on the back of the head (T30 Torx Pin, 6 N·m). The unit can no longer be
   lifted off.

## 4. Connect (3 min)

1. Unlock the service lock (underside of the head door, right) and lift the head
   door — the hinges hold it open. The lectern door can now drop down.
2. Feed the patch lead through the grommet in the back wall and plug it into the
   RJ45 (`J1`) on the bottom edge of the carrier board. Dress the cable in the
   clip.
3. Close the head door and lock it. The unit boots (≈ 40 s) to the attract
   screen; the status light bar shows the idle state.

## 5. Commission (5 min)

Provisioning is zero-touch: the site configuration (`/etc/foyer/site.yaml` —
VMS endpoint, Wi-Fi, language, branding, badge media, fleet endpoint) is baked
into the image at the factory (`software/os-image/README.md`); development
units also accept `foyer/site.yaml` on the boot partition. Secrets are never in
the YAML — they are sealed on the device during provisioning, and the device
authenticates with its ATECC608B identity.

On first power-up at the site:
1. Wait for the attract screen (≈ 40 s; first boot of a development image that
   still has to install packages takes several minutes and needs Internet).
2. From a laptop on the management VLAN (or in the fleet console, which shows
   the same data from the heartbeat) open `http://<kiosk>:<metrics port>/healthz`.
   It must show `"status": "ok"`, an empty `problems` list, and every entry in
   `peripherals` true: display/touch, both cameras, QR scanner, passport reader,
   printer, NFC (if fitted), light bar, proximity sensor, audio, power monitor.
   `door_open` must be false with the doors locked.
3. Check the power class in `/metrics` (`foyer_power_*`): PoE high-power or
   USB-PD ≥ 60 W. Otherwise the printer runs in slow mode — move to a Type 4 port.
4. Do a real check-in with a test invitation QR code: scan a test passport,
   take the face photo, accept the rules, collect the badge, and confirm the
   host notification arrives in the VMS.

## 6. Hand-over

* Load badge stock (see the Maintenance Manual §3) — a full roll is fitted at the factory.
* Leave the two service keys with facilities; record the key code.
* Confirm the visitor flow end-to-end with a real pre-registration QR code.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| No power, no LEDs | No PoE: check the switch port is PoE++ and enabled; try the USB-C PD charger |
| `/healthz` lists a peripheral as false | Re-seat that module's USB / FPC / power lead (Maintenance Manual §4) |
| `door_open` true with doors shut | Door switch lead `J19` unplugged or switch misaligned |
| "VMS unreachable" in the heartbeat | Firewall: allow outbound HTTPS 443 to the VMS host and fleet host; check proxy settings in the site config |
| Printer slow | Low power class (PoE Type 2/3 or small USB-C charger) — move to a Type 4 port |
| Printer test badge blank | Media loaded upside down (thermal side must face the print head) |
