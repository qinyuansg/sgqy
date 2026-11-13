# Mechanical design — Foyer VK-1

Source of truth: `mechanical/enclosure.py` (parametric CadQuery). Every number
below is a parameter there; change it and re-run `python3 mechanical/build.py`.

## Architecture

```
            ┌──────────────── 250 ────────────────┐
     640 ─┬ │  top band: cameras, ToF, IR, mics,   │  ← light bar along the top edge
          │ │  light bar (sensor bar FYR-SB-01)    │
          │ │                                      │
          │ │      13.3" portrait PCAP display     │  HEAD 430 high, 86 deep
          │ │      (edge-to-edge 4 mm glass)       │  lift-up door, hinged at the top
          │ │                                      │
     250 ─┤ │  lower band: QR scanner │ NFC zone   │
     210 ─┤ ├──────────────────────────────────────┤ ← deck (10°, glass, passport reader)
     190 ─┤ │  LECTERN 200 deep                    │  drop-down door = deck + front
          │ │  badge slot ▭        speaker ⠿       │
       0 ─┴ └──────────────────────────────────────┘
```

* **Silhouette:** a tall rounded rectangle (R10 top and bottom in front view),
  flat glass front, constant 250 mm width — reads as one object, not a stack of boxes.
* **Materials (production):** 3 mm 6063-T5 aluminium, bead-blasted and anodised;
  4 mm chemically strengthened glass with black ceramic frit, IR-transparent
  windows (cameras, IR flood, ToF) and a frosted light-bar strip; 6061-T6 mount plate.
* **No visible fasteners:** the glass is VHB-bonded to the bezel; the lock sits
  under the door lip; the security screw is under the mount plate.

## Service concept — one lock

1. The **head door** (bezel + glass + display) lifts up on two Southco E6
   constant-torque hinges and stays at any angle.
2. Its bottom lip overlaps the rear edge of the **lectern door** (deck glass +
   front panel). With the head door lifted, the lectern door drops down on its
   bottom hinges.
3. A single keyed cam lock (CompX C8051, Ø19 mm) on the head door lip therefore
   secures both doors. A door switch (`J19`) reports every opening to the fleet console.

Behind the doors every module is a field-replaceable unit on a standard
connector (see the Maintenance Manual).

## Thermal

Worst-case dissipation inside the head ≈ 18 W (CM5 under load 7 W, regulators
≈ 4 W at full load, display electronics ≈ 3 W, peripherals 4 W). A 40 mm 5 V PWM
fan on the chassis plate pulls air in through the hidden rear-bottom slots and
out through the rear-top slots (CM5 firmware fan curve, starts at 55 °C). The
printer's peak (≈ 40 W for < 2 s per badge) is in the lectern, which is a
separate air volume.

## Mounting

* **Common mount plate** (200 × 240 × 6 mm): two hooks into slots in the head's
  back, VESA 100 bolt pattern, 160 × 200 fixing pattern, cable window, security
  tab. The unit hangs on the hooks, then one M6 tamper screw from below locks it.
* **Wall kit:** plate direct to the wall, centre 1096 mm above the floor.
* **Desk kit:** 300 × 260 × 10 mm steel base, 12° column, cable channel.
* **Floor kit:** 420 × 360 × 12 mm steel base (≈ 13 kg), 100 × 50 mm aluminium
  column with cable channel.
* All kits put the deck front at **861 mm** above the floor (ADA counter
  ≤ 864 mm) so the same software reach-mode rules hold everywhere.

## Accessibility (ADA 2010 / EN 301 549)

* Deck and document slot at counter height; documents are placed, not inserted.
* Forward reach: the app's reach mode keeps every control in the lower 60 % of
  the screen, ≤ 1117 mm above the floor (limit 1220 mm).
* Protruding objects (ADA §307.2): the wall-mounted unit protrudes 212 mm, but
  its lowest leading edge is at 671 mm — below the 685 mm (27 in) cane-detection
  height — so the protrusion is permitted. The floor kit's base plate is at
  floor level and cane-detectable.
* The space under the lectern is open (no plinth) on the wall and floor kits.
* Audio prompts + volume control; high-contrast and large-text modes; the call-
  reception button is on every screen.

## Prototype vs production

| Part | Prototype (3D print) | Production |
|---|---|---|
| Head shell, lectern, doors | PETG/ASA, split at the print-bed limit, spliced | Folded/CNC aluminium, anodised |
| Glass | 3 mm laser-cut acrylic + vinyl mask | 4 mm chemically strengthened glass, frit |
| Mount plate, stand heads | PETG-CF / nylon-CF | Aluminium / steel, powder coat |
| Floor column | Bought 100 × 50 × 3 mm aluminium tube | Same |
