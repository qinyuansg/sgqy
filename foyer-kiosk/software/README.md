# Foyer VK-1 — software

Visitor-enrolment kiosk software for the Foyer VK-1 (Raspberry Pi Compute
Module 5 on carrier `FYR-CB-01`). Hardware facts come from
[`../hardware/interface-contract.md`](../hardware/interface-contract.md)
(**rev B**): I2C1 sensors and secure element, PIO light bar, I2S audio,
VL53L1X proximity, dual IMX708 cameras, power policy.

```
app/        enrolment UI — vanilla HTML/CSS/JS ES modules, no build step, no CDN
agent/      device agent — Python 3.11+, asyncio + aiohttp; HAL, VMS, privacy, monitoring, OTA hooks
os-image/   gold-master image build (Raspberry Pi OS Lite arm64) + first-boot provisioning
tests/ui/   Playwright end-to-end run in simulation mode (writes docs/screenshots/)
docs/       screenshots
```

## Architecture

```
 13.3" portrait touch ── cage (Wayland kiosk) ── Chromium --kiosk, incognito, tmpfs profile
                                                     │  http://127.0.0.1:8080   (REST + WebSocket /ws)
 ┌───────────────────────────────── foyer-agent (unprivileged, systemd-hardened) ─────────────────────────┐
 │ server.py      REST API, WebSocket events, static UI, /healthz, /metrics, CSP + origin checks         │
 │ enrolment.py   invitation → details → ID scan → face + liveness → consent → submit → badge/pass        │
 │ session.py     one visitor at a time; wipe on completion / cancel / idle / max duration / shutdown    │
 │ offline_queue  AES-256-GCM sealed store-and-forward, 24 h hard expiry                                 │
 │ vms/           generic REST/webhook adapter (YAML-mapped), mock VMS                                    │
 │ power.py       POE_HIPWR_n / USB-PD contract → budget; printer rail gating                             │
 │ monitoring.py  health snapshot, Prometheus text, HTTPS heartbeat (+ fleet commands)                    │
 │ kiosk.py       wiring: presence → wake, door, sensor polling, display sleep, queue sync                 │
 │ hal/           gpiod GPIO · PIO light bar · VL53L1X · QR (HID/CDC) · ID reader adapter · picamera2 ·   │
 │                liveness adapter · CUPS printer · INA238/TMP1075/STUSB4500 · IR PWM · TTS · display     │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
        │ mTLS (ATECC608B key via PKCS#11) / HTTPS                    │ HTTPS heartbeat
   Visitor management system                                    Fleet monitoring endpoint
```

Every device has a simulator, selected with `--sim`, so the whole stack runs
on a laptop.

### Hardware abstraction (contract rev B)

| Peripheral | Driver | Simulator |
|---|---|---|
| GPIO (`POE_HIPWR_n`, `AMP_SD`, `USBC_ATTACH`, `PRN_PWR_EN`, `TOF_INT_n`, `HUB_RESET_n`, `DOOR_OPEN`, `PD_ALERT_n`, `PWR_ALERT_n`, `DISP_PWR_EN`, `TOF_XSHUT`) | libgpiod v2 (`python3-libgpiod`), edge events on the event loop | `SimGpioController` |
| Status light bar, 24× SK6812MINI RGB on GPIO13 | `/dev/leds0` from `dtoverlay=ws2812-pio` (4 bytes/LED, driver gamma + brightness byte); states idle / attention / busy / success / error / off | `SimWriter` |
| Proximity, VL53L1X @0x29 | register-level driver (long mode, ROI, active-low data-ready on `TOF_INT_n`, `TOF_XSHUT` recovery) + hysteresis presence detector | `SimPresenceSensor` |
| QR scanner (hub U13 P2) | HID keyboard wedge via evdev with `EVIOCGRAB`, or CDC-ACM serial | `SimScanner` |
| ID/passport reader (USB3-1) | adapter interface + ICAO 9303 MRZ parser; integration notes for Regula / HID SDKs | `StubIdReader` (ICAO "Utopia" specimen) |
| Cameras CAM0 RGB / CAM1 NoIR | picamera2 (libcamera), JPEG in memory, MJPEG preview | `StubCamera` |
| Liveness | adapter interface (RGB + IR frame, IR flood on GPIO12 PWM), score threshold | `StubLiveness` |
| Badge printer (hub U13 P3) | CUPS `lp` from stdin, Pillow label at 300 dpi (62×100 mm or 2.25"×4"), PDF | `SimPrinter` |
| INA238 / TMP1075 / STUSB4500 | i2c-dev register access; INA238 power-limit alert on `PWR_ALERT_n` | `SimSensorHub` |
| Audio prompts | espeak-ng on the I2S card, amplifier enabled via `AMP_SD` only while speaking | browser speech synthesis |
| Display | `DISP_PWR_EN` rail, DDC/CI brightness (`ddcutil`) | — |

Vendor SDK adapters (ID reader, liveness) register in `agent/foyer_agent/hal/__init__.py`.
With the stub adapters on real hardware the agent logs a warning and reports
itself degraded (`stub_adapters`).

### Power policy

High power = `POE_HIPWR_n` low (PoE Type 3/4) **or** USB-C attached with a
negotiated STUSB4500 contract ≥ 60 W (RDO operating current ×
`hardware.power.usbc_contract_volts`). Otherwise: slow printing (`lp`
options), display ≤ 70 %, IR flood ≤ 50 %, light bar ≤ 30 %. The 24 V printer
rail is switched on for a job and off 30 s after the queue drains. Changes are
re-evaluated on `POE_HIPWR_n`, `USBC_ATTACH` and `PD_ALERT_n` edges.

## Running in simulation

```sh
cd foyer-kiosk/software/agent
pip install -r requirements.txt          # aiohttp, PyYAML, cryptography, Pillow, qrcode
python -m foyer_agent --sim              # prints http://127.0.0.1:8080/
```

Open `http://127.0.0.1:8080/?simpanel=1` in Chrome/Chromium (the 1080×1920
canvas scales to the window). The simulator panel triggers devices: person
approaching, invitation QR (`INV-7KQ2M9`), ID read failure, low liveness
score, VMS offline, power source, service door. `?theme=dark` previews the dark
theme. `--sim` also starts an in-process mock VMS with demo hosts and an
invitation; run it alone with
`python -m foyer_agent.vms.mock_server --api-key demo`.

Render a sample badge: `python -m foyer_agent.badge --out badge.png`.

## Tests

```sh
cd agent && pip install -r requirements-dev.txt && python -m pytest       # 55 tests
cd .. && node tests/ui/kiosk-e2e.cjs                                       # Playwright, simulation mode
cd os-image && tests/test-synthetic.sh /tmp/foyer-osimg                    # image build, unprivileged
```

The pytest suite covers session lifecycle and PII wipe, encrypted offline
queue (ciphertext at rest, tamper detection, expiry, clock jumps, drain
semantics), the REST adapter against the mock VMS (mapping, errors, signed
webhook, TLS rule), power policy and printer rail gating, light bar frame
format, badge rendering, MRZ check digits, keyboard-wedge decoding, presence
hysteresis, sensor conversions, log redaction, config validation, and full
HTTP flows (invitation, walk-up, offline queue + sync, liveness retries,
cross-origin rejection, events, health, metrics), asserting that no personal
data reaches the logs.

The UI run drives the invitation and walk-up paths, accessibility (reach)
mode — asserting that no control sits above y = 768 px — German, dark theme,
the call overlay and the idle timeout, and saves 1080×1920 screenshots to
[`docs/screenshots/`](docs/screenshots/).

## Configuration

One YAML file configures the agent and the OS provisioning:
[`agent/config/foyer.example.yaml`](agent/config/foyer.example.yaml). The agent
reads `/etc/foyer/foyer.yaml` (or `--config`); unknown keys are rejected,
`os:` is reserved for provisioning. Highlights:

* `vms`: base URL (HTTPS required except for localhost), auth header/scheme,
  `endpoints` / `response_map` overrides with dotted paths, optional signed
  webhook (HMAC-SHA256, no personal data).
* `identity`: client certificate + PKCS#11-URI key file for mTLS.
* `ui`: languages (`app/i18n/<lang>.json`), theme, timeouts, purposes.
* `branding`: company, location, accent colour, logo file.
* `hardware`: adapters, printer label/queue/options, ToF thresholds and ROI,
  light bar brightness, TTS voices, power thresholds.
* `queue`: offline queue path, key reference, max age (default 24 h), size.
* `monitoring`: heartbeat URL + token reference, interval, optional read-only
  metrics listener for a management network.

Secrets are references (`cred:NAME` → systemd credential, `file:`, `env:`),
never values.

## Security and privacy model

* **Data minimisation in memory.** Visitor data exists only in the agent's
  session object and the browser's in-memory state. Images and signatures are
  `SensitiveBytes` (zeroed on wipe). Vendor SDK scratch files go to
  `/run/foyer/session` (tmpfs, cleared after each session). IR frames are
  wiped right after the liveness decision. The camera preview is MJPEG from
  memory.
* **Wipe points.** Immediately after the VMS accepts the visit (or after it is
  sealed into the offline queue), on cancel, on idle timeout (UI: 45 s + 15 s
  warning; agent hard limit 120 s), on max session duration (15 min) and on
  shutdown. The UI clears its state on every return to the welcome screen.
* **Offline queue.** Each item is AES-256-GCM encrypted with a 32-byte key
  generated on the device and sealed with `systemd-creds`; the authenticated
  header carries the creation time, items are deleted after sync or rejection
  and unconditionally after `queue.max_age_h` (24 h), including when the
  clock jumps back. The queue lives on the encrypted volume (production: FDE
  root from `rpi-sb-provisioner`; development: LUKS2 data partition).
* **Transport.** VMS and heartbeat over HTTPS only; mTLS with the ATECC608B
  device key. The webhook carries ids, never personal data.
* **No personal data in logs.** Log calls reference random session ids;
  `RedactingFilter` scrubs e-mail addresses, MRZ-like strings, long numbers
  and blobs; aiohttp access logs are off; journald is volatile. Badge jobs are
  titled `badge`, piped via stdin, and CUPS keeps no job files or history on a
  tmpfs spool.
* **Local attack surface.** The API binds to 127.0.0.1, rejects foreign
  `Origin`s, sends a strict CSP; Chromium runs incognito with a URL allowlist
  policy; the QR scanner is grabbed exclusively and ignored by the compositor.
* **Agent sandbox.** Dedicated system user, `ProtectSystem=strict`,
  `NoNewPrivileges`, empty capability set, system-call filter,
  `DevicePolicy=closed` with an explicit device allowlist, `UMask=0077`,
  systemd watchdog.
* **Device.** Secure boot + full-disk encryption keyed from the CM5 OTP key,
  nftables inbound-deny, SSH off by default (key-only when enabled), no getty
  on the kiosk VT, hardware watchdog, unattended security updates.

## OTA

* OS packages: unattended-upgrades (Debian security/stable, Raspberry Pi
  archive incl. Chromium) with a configurable reboot window. On secure-boot
  devices kernel/firmware come as signed boot packages instead.
* Application (agent + UI): signed releases (`os-image/scripts/make-release.sh`),
  installed by `foyer-ota` (daily timer or fleet request via the heartbeat
  response), with downgrade protection, health-checked switch-over and
  automatic rollback. The agent reports its version and the updater state.

## Monitoring

* `GET /healthz` — `ok` / `degraded` with the list of problems (peripherals,
  door open, stub adapters, VMS unreachable).
* `GET /metrics` — Prometheus text: temperatures, 12 V bus voltage/current/power,
  USB-PD contract, power budget, printer rail, peripheral up/down, door,
  display, VMS reachability, offline queue depth/age/outcomes, sessions by
  outcome, data-volume free space, power alerts.
* Heartbeat — the same snapshot as JSON to `monitoring.heartbeat_url` every
  `interval_s` (jittered) with a bearer token and/or mTLS; the response can
  request an update check.

## Known limitations

* ID reader and liveness ship as stubs behind adapter interfaces; production
  needs the vendor SDK adapters (Regula or HID reader, certified PAD engine).
* "Call reception" is a stub or an embedded WebRTC page (`call.adapter:
  webrtc`); no native SIP stack.
* The VL53L1X, PIO light bar, STUSB4500 contract reading, ATECC608B/PKCS#11
  and picamera2 paths are written against datasheets and kernel/driver
  sources but have not run on FYR-CB-01 hardware yet.
* Python cannot guarantee that no transient copy of personal data remains in
  freed memory; the design keeps a single wipeable copy and short lifetimes.
