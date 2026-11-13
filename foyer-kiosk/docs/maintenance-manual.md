# Foyer VK-1 — Maintenance Manual

Everything is serviced **from the front, without tools, behind one lock**.
Targets: badge paper swap **< 1 min**, any module replaced **< 5 min**.

## 1. Opening the unit

1. Insert the service key in the lock on the **underside of the head door**
   (right-hand side, hidden under the glass lip) and turn ¼ turn.
2. **Lift the head door** (glass + display) upwards; the constant-torque hinges
   hold it at any angle up to 100°. The door switch reports `door_open` to the
   fleet console and `/healthz`, so every opening is logged.
3. The **lectern door** (deck glass + front panel) is now free: pull its top
   edge towards you and it drops down on its bottom hinges.

Closing is the reverse: lift the lectern door, lower the head door over its
edge, lock. The kiosk resumes automatically.

## 2. Layout behind the doors

```
 HEAD (door lifted)                         LECTERN (door dropped)
 ┌────────────────────────────┐             ┌───────────────────────────┐
 │ sensor bar + cameras (top) │             │ passport reader (tilted   │
 │                     fan ○  │             │  cradle, quick-release)   │
 │  ┌──────────────────────┐  │             ├───────────────────────────┤
 │  │ carrier board + CM5  │──┼─ USB-A x6   │ badge printer on drawer   │
 │  │ (compute tray)       │  │   USB3 x1   │ (pull out, drop-in roll)  │
 │  └──────────────────────┘  │             │ speaker (left)            │
 │ QR scanner │ NFC tap zone  │             └───────────────────────────┘
 └────────────────────────────┘
```

## 3. Badge paper (< 1 min)

1. Open the lectern door (§1).
2. Pull the printer drawer forward by the finger pull until it stops.
3. Open the printer's paper cover, drop in the new roll (**thermal side facing
   the print head** — scratch test: a fingernail leaves a dark mark on the
   correct side), pull 5 cm of paper out over the cutter, close the cover.
   The printer auto-feeds and cuts.
4. Push the drawer home, close the doors. The agent prints nothing until a
   visitor checks in; "paper low" alerts reappear only when the next roll runs low.

Media: 80 mm direct-thermal badge stock, ≤ 100 mm roll OD, black-mark sensing.
Adhesive badge stock must be qualified (see verification register D-4).

## 4. Module replacement (< 5 min each)

All modules plug into standard connectors (USB-A, HDMI, Micro-Fit, JST GH).
**Power the unit down first**: briefly press the service power button `SW1`
on the carrier (the CM5 shuts down cleanly; the light bar turns off). Hold it
for more than 5 s only if the OS is unresponsive (forced off).

| Module | Retained by | Disconnect | Time |
|---|---|---|---|
| Badge printer | 2 captive thumbscrews to the drawer | USB `J11A`, 24 V Micro-Fit `J8` | 3 min |
| Passport reader | tool-less cradle latch (lift lever) | USB 3 `J9`, (12 V `J14` if used) | 2 min |
| QR scanner | ¼-20 thumbscrew + bracket | USB `J10B` | 2 min |
| NFC encoder | 2 snap-in posts | USB `J11B` | 1 min |
| LTE modem (option) | hook-and-loop pad | USB `J12A` | 1 min |
| Display (with head door) | 4 × M4 thumbscrews on VESA 75 bars | HDMI `J5`, USB `J10A`, 12 V `J13` | 5 min |
| Sensor bar + cameras | 4 × M2.5 thumbscrews (bracket) | GH cable `J16`, 2 × camera FPC `J6`/`J7` | 4 min |
| Fan | 2 snap rivets | 4-pin `J18` | 1 min |
| Compute tray (carrier + CM5) | 6 captive thumbscrews | all connectors above + RJ45 | 5 min |
| Compute module only | 2 latches on the CM5 standoffs, lift straight up | — | 2 min |
| Speaker | 2 snap-in posts | `J15` | 1 min |
| Glass (head or deck) | bonded VHB to the bezel/door — exchange the complete door | — | 5 min |

FPC tip: the camera connectors (`J6`, `J7`) have a locking bar — lift the bar,
insert the cable contacts-down, press the bar closed.

After replacing a module, close the doors and check `/healthz` (or the fleet
console): every entry in `peripherals` must be true and `problems` empty.
Then do one test check-in.

## 5. Preventive maintenance

| Interval | Task |
|---|---|
| Weekly (facilities) | Wipe the glass and deck with a microfibre cloth and isopropyl ≤ 70 % or a glass cleaner (no ammonia on the AR coating). Never spray directly on the unit. |
| Monthly | Check the printer drawer for paper dust (soft brush); clean the print head with an IPA pen if the badge print is faint. |
| 6-monthly | Inspect the fan filter-free intake slots (rear bottom) for dust; vacuum. Verify the door switch event appears in the fleet console. |
| Yearly | Replace the RTC battery (`J20`, SC1191) if the console reports "RTC battery low". Re-run the full self-test. |

## 6. Software, updates and monitoring

* **Updates are automatic.** OS security updates install nightly; app releases
  are pulled, signature-verified and activated by the update timer, with
  automatic rollback if the post-update health check fails. Nothing to do on site.
* **Remote monitoring.** Each kiosk sends a heartbeat (temperatures, PoE class
  and power draw from the INA238 monitor, printer/paper status, peripheral
  presence, app version, last successful VMS sync) to the fleet endpoint, and
  exposes `/healthz` and `/metrics` on the management VLAN.
* **Status light bar:** shows the agent's states — idle, attention (visitor
  approaching), busy, success and error. Faults are always detailed in
  `/healthz` → `problems`.

## 7. Privacy during service

The kiosk keeps no personal data once a check-in has synced. Visitor images and
document data exist only in memory during the session. If the network is down,
pending check-ins are held in an encrypted queue (≤ 24 h, then deleted).
Replacing the compute tray or CM5 does **not** expose visitor data: the eMMC
is encrypted with a key bound to that CM5's one-time-programmable device key.
Returned CM5 modules should still be wiped before leaving site: boot them
with `nRPIBOOT` held (`SW2`) and re-flash with `rpi-sb-provisioner`, which
re-creates the encrypted volume with a fresh key.

## 8. Fault-finding

| Symptom | Check |
|---|---|
| Black screen, light bar on | Display 12 V lead `J13`, HDMI `J5`; display power rail (`DISP_PWR_EN`) |
| "Camera not detected" | FPC seated and locked, contacts facing the right way; swap the cable |
| Liveness always fails | IR window dirty or covered; IR flood lead / sensor bar `J16` |
| QR codes slow to read | Phone brightness; clean the scanner window area of the glass |
| Printer error, rail off | Over-current on the 24 V rail (LM5176 3.3 A limit) — check for paper jam / printer fault |
| Hub ports dead | A shorted USB device trips its TPS2065C (auto-recovers when removed); reboot resets both hubs (`HUB_RESET_n`) |
| Overheating warning | Fan connector `J18`; rear vents blocked by wall/stand accessories |
