# Foyer VK-1 OS image

Reproducible image build for the kiosk: the latest official **Raspberry Pi OS
Lite (arm64, Debian trixie)** plus the Foyer configuration, output as a
`.img.xz` gold master. Hardware facts come from
[`../../hardware/interface-contract.md`](../../hardware/interface-contract.md) (rev B).

```
build.sh                    the build (unprivileged: mtools + debugfs + sfdisk, no loop mounts)
lib/inject.sh               FAT/ext4 editing helpers (byte offsets from sfdisk --json)
scripts/render_site.py      site YAML -> config.txt fragment + cloud-init seed, validation
scripts/make-release.sh     signed, reproducible application release (agent + UI)
files/boot/                 config.txt fragment (contract rev B)
files/rootfs/               injected into the root file system: first-boot provisioning,
                            updater, kiosk session, hardware delegation, unit files, policies
rpi-sb-provisioner/         production provisioning config (secure boot + FDE)
tests/test-synthetic.sh     end-to-end test against a synthetic disk image
```

## How the image is put together

| Where | What | Why there |
|---|---|---|
| Boot partition (FAT) | `config.txt` block (I2C, `imx708` CAM0/CAM1, `googlevoicehat-soundcard`, `ws2812-pio` on GPIO13, PWM on GPIO12, UART, `force_eeprom_read=0`, fan curve, `usb_max_current_enable=1`, boot-time GPIO levels, radios), `cmdline.txt` (no first-boot `resize`, console off tty1, quiet), cloud-init NoCloud seed (`user-data`, `meta-data`, `network-config`) | Read by firmware/cloud-init. `rpi-sb-provisioner` packs this partition into the signed `boot.img`, so config.txt travels with it |
| Root file system (ext4) | `/usr/lib/foyer/provision/` (provisioning script, units, system config, signed release), `/etc/foyer/site.yaml`, optional `/etc/foyer/provision-secrets/`, `foyer-provision.service` (enabled) | Must work in **both** flows. After secure-boot provisioning the boot partition only holds `boot.img`/`boot.sig`, so first-boot logic cannot live there |

Raspberry Pi OS trixie images ship cloud-init (pi-gen `stage2/04-cloud-init`
installs `cloud-init` + `rpi-cloud-init-mods` and seeds `user-data`,
`meta-data`, `network-config` on the boot partition; verified against the
current pi-gen sources). The seed here only sets identity (host name, time
zone, locale), disables `growpart`/`resize_rootfs`, creates no users and
switches off the first-user wizard. Everything kiosk-specific is done by
`foyer-provision.service`, which runs in either flow.

## Build

Requirements (Debian/Ubuntu): `curl xz-utils fdisk mtools e2fsprogs python3 python3-yaml openssl tar`.
No root, no loop devices: works in unprivileged containers and CI.

```sh
cd foyer-kiosk/software/os-image
./build.sh \
  --site ../agent/config/foyer.example.yaml \   # your site file (see "Configuration")
  --secrets-dir ~/foyer-secrets/hq-lobby \     # optional: files named in os.secrets
  --signing-key ~/keys/foyer-release.pem \     # Ed25519 release key (dev key generated if omitted)
  --work /tmp/foyer-work --out ./out
```

1. Resolves `https://downloads.raspberrypi.com/raspios_lite_arm64_latest`,
   downloads the `.img.xz` and its `.sha256`, verifies the checksum (`--image`
   skips the download; `RASPIOS_LATEST_URL` points at a mirror).
2. Reads partition offsets with `sfdisk --json`.
3. Renders the site file and builds the signed application release.
4. Edits the FAT partition with `mcopy -i image@@offset`.
5. Writes the provisioning bundle into ext4 with `debugfs -w image?offset=…`
   (root-owned, modes preserved) and reads every file back to verify it.
6. Writes `out/foyer-vk1-<version>-<date>.img.xz`, its `.sha256`, and
   `release-signing.pub`.

### Tests

```sh
tests/test-synthetic.sh /tmp/foyer-osimg-test
```

Builds a synthetic pi-gen-like disk image (MBR, FAT32 + ext4, pi-gen
`config.txt`/`cmdline.txt`/seed), serves it through a local
`raspios_lite_arm64_latest` redirect with a `.sha256` file, runs the real
`build.sh`, and checks: config.txt/cmdline.txt edits, cloud-init schema
validation (`cloud-init schema`, when installed), `fsck.vfat` and `e2fsck` on
the result, ownership/modes/symlinks in ext4, secrets absent from FAT, release
signature and checksum, the updater (`foyer-ota`) accepting/rejecting releases
and keeping a rollback target, and the development partition layout.

## Flashing and provisioning

### Production: `rpi-sb-provisioner` (secure boot + full-disk encryption)

Contract rev B has no discrete TPM. Storage is protected with Raspberry Pi's
official flow: [`rpi-sb-provisioner`](https://github.com/raspberrypi/rpi-sb-provisioner)
programs the customer key hash into OTP (signed boot), provisions the CM5's
device-unique private key, partitions the eMMC as `boot.img` + a LUKS2
container filling the rest, and installs a pre-boot initramfs that unlocks the
root file system with a key derived from the OTP device key
(`rpi-fw-crypto hmac --key-id 1`). Storage removed from one device cannot be
read elsewhere, and only software signed with your key boots.

1. Install `rpi-sb-provisioner` on the provisioning station (a Raspberry Pi 5).
2. Copy `rpi-sb-provisioner/config.example` to `/etc/rpi-sb-provisioner/config`
   and `foyer-bootloader.conf` to `/etc/rpi-sb-provisioner/` (it sets the
   **`PSU_MAX_CURRENT=5000`** the carrier needs; the provisioner signs and
   flashes it). Set `GOLD_MASTER_OS_FILE` to the built image and configure the
   signing key (HSM via PKCS#11 recommended).
3. Per board: hold **SW2 (nRPIBOOT)**, connect rear **USB-C J2** to the
   station, power on. The provisioner bootstraps, provisions keys, writes the
   encrypted OS and switches the power LED off when done.
4. Fit `R_WP` after provisioning to lock the bootloader EEPROM (contract).

Kernel and firmware live inside the signed `boot.img`, so on secure-boot
devices provisioning blacklists kernel/firmware packages in
unattended-upgrades; ship them as the `rpi-sb-boot-update` package that the
provisioner generates for each new image (through the OTA channel).

### Development boards: direct flashing

1. Hold SW2 (nRPIBOOT), connect J2 to a Linux/macOS host and run
   `sudo rpiboot -d mass-storage-gadget64` ([usbboot](https://github.com/raspberrypi/usbboot));
   the eMMC appears as a USB disk.
2. Write the image with Raspberry Pi Imager ("Use custom", **no OS
   customisation** — the image brings its own) or
   `xzcat foyer-vk1-*.img.xz | sudo dd of=/dev/sdX bs=4M conv=fsync`.
3. Optional: put a modified `foyer/site.yaml` on the boot partition; it
   overrides the baked-in one on first boot.
4. `PSU_MAX_CURRENT=5000`: provisioning applies it with `rpi-eeprom-config
   --apply` when it is missing (or use usbboot's `recovery5` with an edited
   `boot.conf`).

Without FDE, provisioning grows the root partition to `os.storage.root_size`
(default 12 GiB) and turns the rest of the eMMC into a **LUKS2 data partition**
for `/var/lib/foyer`, keyed from the same OTP device key via `rpi-fw-crypto`
(HMAC over the eMMC CID; `foyer-data-unlock.service` opens it at boot). If the
key slot is not provisioned, a key file is used and the agent reports
`storage_protection: keyfile`. This is for development only.

### First boot

`foyer-provision.service` (needs Internet; each step is stamped and resumes
after failures):

1. Storage (above) and Wi-Fi (`os.wifi`, passphrase from a sealed secret).
2. Packages: `cage`, `chromium`, `wlr-randr`, `fonts-inter`, Python
   dependencies from Debian (`python3-aiohttp`, `-yaml`, `-cryptography`,
   `-pil`, `-qrcode`, `-libgpiod`, `-picamera2`), `espeak-ng`, `cups` +
   `printer-driver-ptouch`, `ddcutil`, `nftables`, `unattended-upgrades`,
   `cryptsetup`, `pkcs11-provider` (`rpi-fw-crypto` is already part of the base image).
3. Accounts: `foyer-agent` and `foyer-kiosk` system users without a login
   shell; root locked; no first-user wizard.
4. Secrets: generates the offline-queue key on the device and seals it, plus
   any supplied secrets, with `systemd-creds encrypt --with-key=auto` into
   `/etc/credstore.encrypted`; plaintext copies are shredded.
5. Application: verifies and installs the signed release into
   `/opt/foyer/releases/<version>` (`/opt/foyer/current` symlink).
6. Identity (`os.identity.backend: atecc608b`): builds cryptoauthlib
   (pinned tag and commit) with its PKCS#11 module, configures the ATECC608B
   slot (I2C1, 0x60), registers it with p11-kit, and points OpenSSL's
   `pkcs11-provider` at it for the agent (`OPENSSL_CONF`). Factory enrolment:
   `foyer-identity csr <device-id>` → sign with the fleet CA →
   `foyer-identity install-cert device.crt`, then set `identity.client_cert`
   and `identity.client_key` (`/etc/foyer/identity/device.key.pem`, a PEM
   wrapper around the key's PKCS#11 URI). The private key never leaves the chip.
7. CUPS: local-only, no job files or history kept, spool on tmpfs; adds the
   badge queue from `os.printer`.
8. Lock-down: kiosk on tty1 (`cage` + Chromium, no VT switching), no getty on
   tty1, Ctrl-Alt-Del masked, no swap, Avahi/Bluetooth off, sysctl hardening,
   journald **volatile**, hardware watchdog (`RuntimeWatchdogSec=15s`),
   `/boot/firmware` read-only (remounted rw only while dpkg runs), `/var/tmp`
   and the CUPS spool on tmpfs, nftables: inbound drop except DHCP/ICMP and
   optional SSH/metrics from `os.firewall.mgmt_cidrs`; SSH disabled unless
   `os.ssh.enabled` with keys (key-only, `foyeradmin`).
9. Updates: unattended-upgrades for Debian security/stable and the Raspberry Pi
   archive (Chromium) with a reboot window; `foyer-ota.timer` (daily) and
   `foyer-ota.path` (fleet-requested checks).
10. Reboot into kiosk mode. cloud-init is disabled afterwards.

## Configuration

One YAML file: [`../agent/config/foyer.example.yaml`](../agent/config/foyer.example.yaml).
Top-level sections configure the agent; `os:` configures provisioning
(host name, time zone, Wi-Fi, SSH keys, firewall, radios, update window, OTA
channel, identity backend, printer, secret file names). It is baked into the
image as `/etc/foyer/site.yaml`; development images also accept
`foyer/site.yaml` on the boot partition.

Secrets never appear in the YAML: fields such as `vms.api_key` reference
`cred:<name>` and the values come from `--secrets-dir` files that provisioning
seals on the device. Prefer mTLS with the ATECC608B identity over API keys
where the VMS supports it. Note that the uncompressed gold master contains
supplied secrets in its root file system until a device is provisioned:
treat it as confidential, or enrol secrets after provisioning
(`systemd-creds encrypt --with-key=auto --name=foyer-vms-api-key - /etc/credstore.encrypted/foyer-vms-api-key`).

Branding: copy `logo.svg` into `/etc/foyer/branding/` and set `branding.logo`.

## Application OTA

```sh
scripts/make-release.sh --version 1.2.0 --key foyer-release.pem --out dist \
  --base-url https://updates.example.com/foyer/stable
# publish dist/latest.json, dist/latest.json.sig and dist/foyer-1.2.0.tar.gz
```

`foyer-ota check` downloads `latest.json` + `.sig` over HTTPS, verifies the
Ed25519 signature against `/etc/foyer/release-signing.pub`, refuses
downgrades and versions that failed before, verifies the tarball's SHA-256,
unpacks it beside the running release, switches `/opt/foyer/current`
atomically, restarts the agent and kiosk, and requires `/healthz` to report
the new version within 90 s; otherwise it switches back to `previous` and
marks the version bad. State is in `/var/lib/foyer-ota/state.json` and is
reported in the heartbeat. The fleet can request a check through the
heartbeat response (`{"commands":[{"type":"ota_check"}]}`).

## Status and things to verify at EVT bring-up

* **Real build done** (2026-11-13): `build.sh` resolved
  `raspios_lite_arm64_latest` to `2026-10-06-raspios-trixie-arm64-lite.img.xz`,
  verified its SHA-256 and produced `foyer-vk1-1.0.0-20261113.img.xz` (588 MB).
  On the result: `e2fsck -fn` and `fsck.vfat -n` clean, every injected file
  read back and checksum-verified, `cloud-init schema` valid for `user-data`
  and `network-config`. Inspecting the base image confirmed: NoCloud seed on
  the boot partition (`/etc/cloud/cloud.cfg.d/99_raspberry-pi.cfg`:
  `seedfrom: file:///boot/firmware`), `resize` on the kernel command line,
  `userconfig.service` enabled (disabled by the seed and by provisioning),
  `rpi-fw-crypto` installed. The image has **not been booted** on a CM5.
* `tests/test-synthetic.sh` covers the same pipeline offline (45 checks).
* `dtoverlay=imx708` (no parameter) for CAM1: the overlay has a `cam0`
  parameter but no `cam1` one (CAM1 is its default); contract rev B lists
  `imx708,cam1`.
* `dtparam=uart0_console` (route the console to GPIO14/15 for J17) and the RP1
  PWM chip path in `foyer-hw-setup` (`1f00098000.pwm`) are inferred from the
  Pi 5 documentation.
* ATECC608B: cryptoauthlib slot config and the PKCS#11 URI PEM wrapper for
  `pkcs11-provider` need a hardware test; device certificate enrolment is a
  factory step.
* First boot (packages, LUKS data partition, kiosk session) has only been
  reviewed and shellchecked, not executed.
