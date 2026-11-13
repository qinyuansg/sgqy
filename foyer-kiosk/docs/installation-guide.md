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
3. Close the head door and lock it. The unit boots (~40 s); the status light bar
   breathes **white** while booting, then **blue** when ready.

## 5. Commission (5 min)

Provisioning is zero-touch when a site config is present. Two ways to give it one:

* **Pre-staged (recommended):** the site config YAML was written to the boot
  partition before shipping (see `software/os-image/README.md`).
* **On site:** plug a USB stick containing `foyer-site.yaml` into the internal
  service USB-A port (`J12B`, behind the head door) — the agent imports it, wipes
  it from the stick's copy log and asks for a reboot.

Then, on the kiosk:
1. Hold a finger on the top-left corner of the screen for 5 s → enter the
   installer PIN (from the site config) → **Commissioning**.
2. The self-test runs automatically: display/touch, both cameras (RGB + IR
   liveness target), QR scanner, passport reader (insert the test card), NFC
   (tap test badge), printer (prints a test badge), speaker + microphones (loopback),
   ToF approach sensor, light bar, power (reports PoE class / USB-PD contract),
   network/VMS reachability, clock, disk encryption status.
3. Every line must show **PASS**. Tap **Finish** — the unit registers with the
   fleet endpoint and appears online in the VMS console.

## 6. Hand-over

* Load badge stock (see the Maintenance Manual §3) — a full roll is fitted at the factory.
* Leave the two service keys with facilities; record the key code.
* Confirm the visitor flow end-to-end with a real pre-registration QR code.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| No power, no LEDs | No PoE: check the switch port is PoE++ and enabled; try the USB-C PD charger |
| Light bar **amber** pulsing | Low power class (PoE Type 2/3): kiosk works, printer is in slow mode — move to a Type 4 port |
| Light bar **red** | Self-test failure — open Commissioning to see which module |
| "VMS unreachable" | Firewall: allow outbound HTTPS 443 to the VMS host and fleet host; check proxy settings in the site config |
| Printer test badge blank | Media loaded upside down (thermal side must face the print head) |
