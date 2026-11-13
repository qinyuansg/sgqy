# Manufacturing package — Foyer VK-1

## 1. PCB fabrication

| | Carrier FYR-CB-01 | Sensor bar FYR-SB-01 |
|---|---|---|
| Files | `hardware/carrier/fab/carrier-gerbers.zip` (Gerber RS-274X + Excellon + drill map) | `hardware/sensorbar/fab/sensorbar-gerbers.zip` |
| Size | 180 × 120 mm, R3 corners, 6 × M3 holes | 200 × 22 mm, 4 × M2.5 holes |
| Layers | 6: F.Cu sig / In1 GND / In2 sig / In3 power (12 V, 5 V_CM, 5 V_AUX planes) / In4 GND / B.Cu sig | 2 |
| Thickness | 1.6 mm, FR-4 Tg 170 | 1.6 mm FR-4 |
| Copper | 1 oz outer, 1 oz inner (2 oz In3 recommended for the 12 V plane) | 1 oz |
| Min track/space | 0.10 / 0.10 mm (CM5 escape), 0.127 mm default | 0.15 / 0.15 mm |
| Min via | 0.45 / 0.20 mm through | 0.6 / 0.3 mm |
| Impedance | Controlled: 90 Ω diff (USB), 100 Ω diff (HDMI, MIPI, Ethernet MDI) — fab to tune widths to its stack-up | — |
| Finish | ENIG (0.4 mm-pitch DF40 connectors) | ENIG or HASL LF |
| Mask / silk | Matte black / white | Matte black / white |
| Standards | IPC-6012 Class 2, IPC-A-600 | same |

US fabs able to build both: e.g. Advanced Circuits, Sierra Circuits, Royal Circuits (quick-turn), OSH Park (sensor bar prototypes).

## 2. PCB assembly

* BOMs: `hardware/carrier/fab/carrier-bom.csv`, `hardware/sensorbar/fab/sensorbar-bom.csv`
  (generic passives are "to spec": value, voltage, dielectric, size — EMS may source any AEC/industrial-grade equivalent).
* Pick-and-place: `*-cpl.csv` (KiCad position file, mm, top/bottom).
* Assembly drawing: `*-assembly-top.pdf`; 3D board STEP `*.step`.
* Double-sided: carrier top-only SMT + THT (RJ45, USB-A, Micro-Fit, fan header);
  sensor bar SMT both sides (microphones on bottom).
* DNP: `EEPROM_nWP` resistor (fitted after secure-boot provisioning), reader-fault test resistor.
* Stencil 0.12 mm (carrier, 0.4 mm pitch), 0.12 mm sensor bar. Reflow per J-STD-020.
* Inspection: AOI 100 %, X-ray on DF40 connectors and QFN/HTSSOP thermal pads (first article + sample).
* Workmanship IPC-A-610 Class 2, J-STD-001.

## 3. Production test (per PCBA)

1. **Flying-probe / ICT** on bare-board and assembled carrier (net list = `carrier.net.txt`).
2. **Power-up on a bench fixture** with a 90 W PoE++ injector: check PoE class, 12 V bus, 5 V_CM, 5 V_AUX, 3.3 V, 24 V (enable via fixture GPIO) within ±3 %.
3. **Golden CM5** fitted, boot the factory test image over USB-C (`rpiboot`, hold `nRPIBOOT`), run the self-test: Ethernet link 1 Gb/s, USB enumeration of both hubs and all 7 ports (loopback dongles), HDMI EDID read, camera I2C probe on both ports, I2C devices (STUSB4500 0x28, INA238 0x40, TMP1075 0x48, ATECC608B 0x60), audio I2S loopback via the sensor-bar fixture, light-bar pattern, fan tach.
4. Sensor bar on its own fixture: ToF range check, both mics, IR current (667 mA ±10 %), 24-LED pattern.
5. Log serials + results to the MES.

## 4. Device provisioning (production line)

1. Fit the production CM5 (CM5104032).
2. `rpi-sb-provisioner`: program the customer secure-boot key into OTP, flash the signed Foyer OS image, enable full-disk encryption keyed from the CM5's OTP device key.
3. Generate the ATECC608B device identity (key never leaves the chip), register the device certificate with the fleet CA.
4. Fit the `EEPROM_nWP` resistor (locks the bootloader EEPROM), label with the device ID / MAC.

## 5. Final assembly sequence (≈ 25 min)

1. Lectern body: fit printer slides, reader cradle, speaker, foot pads.
2. Head shell: rivet the chassis plate; fit the fan; mount the compute tray (carrier + CM5 + heatsink pad).
3. Sensor bar + camera bracket behind the top band; route GH cable and FPCs.
4. QR scanner and NFC module in the lower band.
5. Head door: VHB-bond the glass (pre-printed frit), fit the display on its VESA bars, fit the hinges; hang the door on the shell; fit the lock and strike.
6. Join head to lectern (4 × M5 from inside); fit the lectern door.
7. Cable dress per the harness drawing; fit the printer and reader; load a badge roll.
8. Run the end-of-line self-test (same as the installer's commissioning test) — 100 % PASS required.
9. Box: unit in moulded pulp, mount plate + chosen kit in a separate carton, 2 keys, quick-start card, drilling template.

## 6. Mechanical parts

* Production STEP: `mechanical/out/step/parts/*.step`, assembly `foyer-vk1-assembly.step`, kits `foyer-vk1-{desk,floor}-kit.step`.
* Glass and plate profiles: `mechanical/out/dxf/`.
* Drawings: `mechanical/out/drawings/GA-core-unit.pdf`, `wall-drilling-template-A4.pdf`.
* Finishes: aluminium bead-blast + clear or graphite anodise (Type II, 15 µm); steel bases powder coat RAL 7021; glass black ceramic frit with IR-transparent ink windows over the cameras (850 nm, T > 85 %), ToF (940 nm) and a frosted light-bar strip.

## 7. Prototype build (3D printed)

* Files: `mechanical/out/print/*.stl` / `*.3mf` (split to fit a 250 mm bed; see `print-manifest.json`).
* Material: PETG or ASA, 0.2 mm layers, 4 perimeters, 30 % gyroid; mount plate and stand heads in PETG-CF or nylon-CF (load bearing).
* Joining split parts: glue (cyanoacrylate for PETG / MEK for ASA) + 20 × 20 × 2 mm splice plates with M3 heat-set inserts.
* Prototype glass: 3 mm cast acrylic laser-cut from `dxf/head_glass.dxf`, black vinyl mask on the inside.
* Floor-stand column for prototypes: buy 100 × 50 × 3 mm 6063 aluminium tube cut to length (the printed parts are the base quarters and cap).
