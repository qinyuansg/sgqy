#!/usr/bin/env bash
# End-to-end test of build.sh without network access to raspberrypi.com and
# without root: builds a synthetic "Raspberry Pi OS" disk image (MBR, FAT32
# boot + ext4 root, pi-gen style config.txt/cmdline.txt/cloud-init seed),
# serves it with a local "latest" redirect + .sha256 like downloads.raspberrypi.com,
# runs the real build, then inspects the result.
#
#   tests/test-synthetic.sh [WORKDIR]
# shellcheck source-path=SCRIPTDIR
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OSIMG="$(cd "${HERE}/.." && pwd)"
WORK="${1:-$(mktemp -d)}"
mkdir -p "${WORK}"
WORK="$(cd "${WORK}" && pwd)"
# shellcheck source=../lib/inject.sh
. "${OSIMG}/lib/inject.sh"

PASS=0
FAIL=0
check() { # description command...
  local what="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    PASS=$((PASS + 1)); echo "ok   ${what}"
  else
    FAIL=$((FAIL + 1)); echo "FAIL ${what}"
  fi
}

require_tools sfdisk mkfs.vfat mkfs.ext4 mcopy debugfs e2fsck fsck.vfat xz python3 openssl

# --- 1. synthetic base image ---------------------------------------------------------
SRC="${WORK}/src"
rm -rf "${SRC}" && mkdir -p "${SRC}/boot" "${SRC}/root/etc/systemd/system" "${SRC}/root/usr/lib" "${SRC}/root/etc/cloud/cloud.cfg.d"
cat > "${SRC}/boot/config.txt" <<'EOF'
# For more options and information see
# http://rptl.io/configtxt
dtparam=audio=on
camera_auto_detect=1
display_auto_detect=1
auto_initramfs=1
dtoverlay=vc4-kms-v3d
max_framebuffers=2
disable_fw_kms_setup=1
disable_overscan=1
arm_boost=1

[cm5]
dtoverlay=dwc2,dr_mode=host

[all]
EOF
echo "console=serial0,115200 console=tty1 root=PARTUUID=deadbeef-02 rootfstype=ext4 fsck.repair=yes rootwait resize" > "${SRC}/boot/cmdline.txt"
printf '#cloud-config\n# pi-gen placeholder\n' > "${SRC}/boot/user-data"
printf 'dsmode: local\ninstance_id: rpios-image\n' > "${SRC}/boot/meta-data"
printf '# placeholder\n' > "${SRC}/boot/network-config"
printf 'proc /proc proc defaults 0 0\nPARTUUID=deadbeef-01 /boot/firmware vfat defaults 0 2\nPARTUUID=deadbeef-02 / ext4 defaults,noatime 0 1\n' > "${SRC}/root/etc/fstab"

BASE="${WORK}/2026-11-01-raspios-trixie-arm64-lite.img"
SECTOR=512
BOOT_START=8192 BOOT_SECTORS=$((256 * 2048)) ROOT_SECTORS=$((320 * 2048))
ROOT_START=$((BOOT_START + BOOT_SECTORS))
truncate -s $(((ROOT_START + ROOT_SECTORS) * SECTOR)) "${BASE}"
sfdisk --quiet "${BASE}" <<EOF
label: dos
label-id: 0xdeadbeef
start=${BOOT_START}, size=${BOOT_SECTORS}, type=c
start=${ROOT_START}, size=${ROOT_SECTORS}, type=83
EOF
mkfs.vfat -F 32 -n bootfs --offset "${BOOT_START}" "${BASE}" $((BOOT_SECTORS / 2)) >/dev/null
export MTOOLS_SKIP_CHECK=1
for f in config.txt cmdline.txt user-data meta-data network-config; do
  mcopy -i "${BASE}@@$((BOOT_START * SECTOR))" "${SRC}/boot/${f}" "::${f}"
done
mkfs.ext4 -q -F -L rootfs -E offset=$((ROOT_START * SECTOR)) -d "${SRC}/root" "${BASE}" $((ROOT_SECTORS / 2))k

# --- 2. serve it like downloads.raspberrypi.com ---------------------------------------
MIRROR="${WORK}/mirror/images"
mkdir -p "${MIRROR}"
xz -T0 -c "${BASE}" > "${MIRROR}/$(basename "${BASE}").xz"
(cd "${MIRROR}" && sha256sum "$(basename "${BASE}").xz" > "$(basename "${BASE}").xz.sha256")
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
python3 - "${WORK}/mirror" "${PORT}" "images/$(basename "${BASE}").xz" <<'PY' &
import functools, http.server, sys
root, port, target = sys.argv[1], int(sys.argv[2]), sys.argv[3]
class Handler(http.server.SimpleHTTPRequestHandler):
    def redirect(self):
        self.send_response(302)
        self.send_header("Location", "/" + target)
        self.end_headers()
    def do_HEAD(self):
        self.redirect() if self.path == "/raspios_lite_arm64_latest" else super().do_HEAD()
    def do_GET(self):
        self.redirect() if self.path == "/raspios_lite_arm64_latest" else super().do_GET()
    def log_message(self, *args):
        pass
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=root)).serve_forever()
PY
SERVER=$!
trap 'kill ${SERVER} 2>/dev/null || true' EXIT
sleep 0.5

# --- 3. run the real build ---------------------------------------------------------------
SECRETS="${WORK}/secrets"
mkdir -p "${SECRETS}"
printf 'demo-vms-key' > "${SECRETS}/vms-api-key"
printf 'demo-heartbeat-token' > "${SECRETS}/heartbeat-token"
OUT="${WORK}/out"
rm -rf "${OUT}" "${WORK}/build"
RASPIOS_LATEST_URL="http://127.0.0.1:${PORT}/raspios_lite_arm64_latest" \
  "${OSIMG}/build.sh" --site "${OSIMG}/../agent/config/foyer.example.yaml" --secrets-dir "${SECRETS}" \
  --work "${WORK}/build" --out "${OUT}" --version 1.0.0

# --- 4. inspect ----------------------------------------------------------------------------
IMG_XZ="$(ls "${OUT}"/foyer-vk1-1.0.0-*.img.xz)"
check "output checksum file verifies" bash -c "cd '${OUT}' && sha256sum -c '$(basename "${IMG_XZ}").sha256'"
IMG="${WORK}/result.img"
xz -dc "${IMG_XZ}" > "${IMG}"
read -r BOOT_OFF ROOT_OFF < <(partition_offsets "${IMG}")
FAT="${IMG}@@${BOOT_OFF}"
EXT="${IMG}?offset=${ROOT_OFF}"
mtype -i "${FAT}" ::config.txt > "${WORK}/config.txt"
mtype -i "${FAT}" ::cmdline.txt > "${WORK}/cmdline.txt"
for f in user-data meta-data network-config; do mtype -i "${FAT}" "::${f}" > "${WORK}/${f}"; done

check "config.txt keeps pi-gen settings" grep -qx 'dtoverlay=vc4-kms-v3d' "${WORK}/config.txt"
check "config.txt has exactly one Foyer block" test "$(grep -c '^# >>> foyer-vk1' "${WORK}/config.txt")" -eq 1
for line in 'dtparam=i2c_arm=on' 'dtoverlay=imx708,cam0' 'dtoverlay=imx708' 'dtoverlay=googlevoicehat-soundcard' \
            'dtoverlay=ws2812-pio,gpio=13,num_leds=24' 'enable_uart=1' 'force_eeprom_read=0' \
            'dtparam=fan_temp0=55000' 'usb_max_current_enable=1' 'camera_auto_detect=0' 'dtoverlay=disable-bt-pi5'; do
  check "config.txt: ${line}" grep -qx -- "${line}" "${WORK}/config.txt"
done
check "config.txt: no TPM overlay (contract rev B)" bash -c "! grep -q tpm '${WORK}/config.txt'"
check "cmdline.txt: single line" test "$(wc -l < "${WORK}/cmdline.txt")" -eq 1
check "cmdline.txt: first-boot resize removed" bash -c "! grep -qw resize '${WORK}/cmdline.txt'"
check "cmdline.txt: console moved off tty1" grep -q 'console=tty3' "${WORK}/cmdline.txt"
check "cmdline.txt: root= kept" grep -q 'root=PARTUUID=deadbeef-02' "${WORK}/cmdline.txt"
check "user-data: growpart disabled" grep -q 'mode: .off.' "${WORK}/user-data"
if command -v cloud-init >/dev/null; then
  check "cloud-init schema: user-data" cloud-init schema -c "${WORK}/user-data"
  check "cloud-init schema: network-config" cloud-init schema --schema-type network-config -c "${WORK}/network-config"
fi
check "boot partition passes fsck.vfat" bash -c "dd if='${IMG}' of='${WORK}/boot.part' bs=512 skip=$((BOOT_OFF / 512)) count=${BOOT_SECTORS} status=none && fsck.vfat -n '${WORK}/boot.part'"
check "root partition passes e2fsck" bash -c "dd if='${IMG}' of='${WORK}/root.part' bs=512 skip=$((ROOT_OFF / 512)) status=none && e2fsck -fn '${WORK}/root.part'"

stat_field() { debugfs -R "stat $1" "${EXT}" 2>/dev/null | grep -o "$2: *[0-9a-fx]*" | head -n1 | awk '{print $2}'; }
check "provision.sh installed executable, root-owned" bash -c "[[ \$(debugfs -R 'stat /usr/lib/foyer/provision/provision.sh' '${EXT}' 2>/dev/null | grep -c 'Mode:  0755') == 1 ]]"
check "provision unit enabled (wants symlink)" bash -c "debugfs -R 'stat /etc/systemd/system/multi-user.target.wants/foyer-provision.service' '${EXT}' 2>/dev/null | grep -q 'Type: symlink'"
check "files owned by root" test "$(stat_field /usr/lib/foyer/foyer-ota User)" = "0"
check "pre-existing fstab untouched" bash -c "debugfs -R 'cat /etc/fstab' '${EXT}' 2>/dev/null | grep -q deadbeef-02"
check "site.yaml in rootfs" bash -c "debugfs -R 'cat /etc/foyer/site.yaml' '${EXT}' 2>/dev/null | grep -q 'heartbeat_url'"
check "secrets only in rootfs, not on FAT" bash -c "debugfs -R 'cat /etc/foyer/provision-secrets/vms-api-key' '${EXT}' 2>/dev/null | grep -q demo-vms-key && ! mdir -i '${FAT}' -/ :: 2>/dev/null | grep -qi secret"

REL="${WORK}/rel"
mkdir -p "${REL}"
for f in latest.json latest.json.sig release-signing.pub foyer-1.0.0.tar.gz; do
  debugfs -R "cat /usr/lib/foyer/provision/release/${f}" "${EXT}" > "${REL}/${f}" 2>/dev/null
done
check "release manifest signature verifies" openssl pkeyutl -verify -pubin -inkey "${REL}/release-signing.pub" -rawin -in "${REL}/latest.json" -sigfile "${REL}/latest.json.sig"
check "release tarball matches manifest sha256" bash -c "[[ \$(sha256sum < '${REL}/foyer-1.0.0.tar.gz' | cut -d' ' -f1) == \$(python3 -c 'import json; print(json.load(open(\"${REL}/latest.json\"))[\"sha256\"])') ]]"
check "release contains agent, app and VERSION" bash -c "tar tzf '${REL}/foyer-1.0.0.tar.gz' | grep -q 'foyer-1.0.0/agent/foyer_agent/__main__.py' && tar tzf '${REL}/foyer-1.0.0.tar.gz' | grep -q 'foyer-1.0.0/app/index.html' && tar tzf '${REL}/foyer-1.0.0.tar.gz' | grep -q 'foyer-1.0.0/VERSION'"
check "release excludes bytecode and tests" bash -c "! tar tzf '${REL}/foyer-1.0.0.tar.gz' | grep -qE '__pycache__|/tests/'"

# Tampered manifest must be rejected by the device updater's verification command.
sed 's/1.0.0/9.9.9/' "${REL}/latest.json" > "${REL}/tampered.json"
check "tampered manifest rejected" bash -c "! openssl pkeyutl -verify -pubin -inkey '${REL}/release-signing.pub' -rawin -in '${REL}/tampered.json' -sigfile '${REL}/latest.json.sig'"

# The device updater (foyer-ota) against the built release, in a sandbox.
OTA="${WORK}/ota"
rm -rf "${OTA}" && mkdir -p "${OTA}/root" "${OTA}/state" "${OTA}/drop"
cp "${REL}/latest.json" "${REL}/latest.json.sig" "${REL}/foyer-1.0.0.tar.gz" "${OTA}/drop/"
ota() {
  FOYER_OTA_ROOT="${OTA}/root" FOYER_OTA_STATE_DIR="${OTA}/state" FOYER_OTA_PUBKEY="${REL}/release-signing.pub" \
    "${OSIMG}/files/rootfs/usr/lib/foyer/foyer-ota" install-local "$1" 2>/dev/null
}
installed() { [[ "$(cat "${OTA}/root/$1/VERSION")" == "$2" ]]; }
check "foyer-ota installs the signed release" ota "${OTA}/drop"
check "foyer-ota: current is 1.0.0" installed current 1.0.0
check "foyer-ota: same version is not reinstalled" bash -c "$(declare -f ota); OTA='${OTA}' REL='${REL}' OSIMG='${OSIMG}'; ota '${OTA}/drop' && grep -q up-to-date '${OTA}/state/state.json'"
NEXT="${WORK}/next"
"${OSIMG}/scripts/make-release.sh" --version 1.0.1 --key "${WORK}/build/dev-release-signing.pem" --out "${NEXT}" >/dev/null
printf 'tamper' >> "${NEXT}/foyer-1.0.1.tar.gz"
check "foyer-ota rejects a tarball that does not match the signed checksum" bash -c "! { $(declare -f ota); OTA='${OTA}' REL='${REL}' OSIMG='${OSIMG}'; ota '${NEXT}'; }"
"${OSIMG}/scripts/make-release.sh" --version 1.0.1 --key "${WORK}/build/dev-release-signing.pem" --out "${NEXT}" >/dev/null
check "foyer-ota upgrades to 1.0.1" ota "${NEXT}"
check "foyer-ota keeps 1.0.0 as the rollback target" installed previous 1.0.0
openssl genpkey -algorithm ed25519 -out "${WORK}/other.pem" 2>/dev/null
"${OSIMG}/scripts/make-release.sh" --version 1.0.2 --key "${WORK}/other.pem" --out "${WORK}/foreign" >/dev/null
check "foyer-ota rejects a release signed with another key" bash -c "! { $(declare -f ota); OTA='${OTA}' REL='${REL}' OSIMG='${OSIMG}'; ota '${WORK}/foreign'; }"
check "foyer-ota: still on 1.0.1 after rejections" installed current 1.0.1

# Idempotency of the config.txt editor.
cp "${WORK}/config.txt" "${WORK}/config.again"
edit_config_txt "${WORK}/config.again" "${WORK}/build/render/config-foyer.txt"
check "re-running the config.txt edit keeps one block" test "$(grep -c '^# >>> foyer-vk1' "${WORK}/config.again")" -eq 1

# The partition layout provision.sh applies on development devices, run on an image file.
DISK="${WORK}/disk.img"
cp "${BASE}" "${DISK}"
truncate -s 1G "${DISK}"
(
  # shellcheck source=../files/rootfs/usr/lib/foyer/provision/provision.sh
  . "${OSIMG}/files/rootfs/usr/lib/foyer/provision/provision.sh"
  layout_partitions "${DISK}" 2 400M
)
check "dev layout: root grown to 400 MiB, data partition appended after it" bash -c "sfdisk --json '${DISK}' | python3 -c 'import json,sys; p=json.load(sys.stdin)[\"partitiontable\"][\"partitions\"]; assert p[1][\"size\"]==400*2048 and len(p)==3 and p[2][\"start\"]==p[1][\"start\"]+p[1][\"size\"] and p[2][\"start\"]+p[2][\"size\"]==2097152'"

echo
echo "${PASS} passed, ${FAIL} failed"
((FAIL == 0))
