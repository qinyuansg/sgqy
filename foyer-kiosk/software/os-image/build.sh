#!/usr/bin/env bash
# Build the Foyer VK-1 gold-master image from the latest Raspberry Pi OS Lite (arm64).
#
# Works unprivileged (CI containers): no loop devices or mounts. The FAT boot
# partition is edited with mtools, the ext4 root file system with debugfs, both
# addressed by byte offsets read with sfdisk.
#
#   ./build.sh [--image FILE] [--site site.yaml] [--secrets-dir DIR]
#              [--signing-key ed25519.pem] [--version X.Y.Z] [--out DIR] [--work DIR]
#              [--no-compress]
#
# See README.md for the full flow (dev flashing vs. rpi-sb-provisioner).
# RASPIOS_LATEST_URL overrides the download location (mirrors, tests).

# shellcheck source-path=SCRIPTDIR
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOFTWARE="$(cd "${HERE}/.." && pwd)"
# shellcheck source=lib/inject.sh
. "${HERE}/lib/inject.sh"

LATEST_URL="${RASPIOS_LATEST_URL:-https://downloads.raspberrypi.com/raspios_lite_arm64_latest}"

IMAGE=""
SITE="${SOFTWARE}/agent/config/foyer.example.yaml"
SECRETS_DIR=""
SIGNING_KEY=""
VERSION=""
OUT="${PWD}/out"
WORK="${PWD}/work"
COMPRESS=1

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while (($#)); do
  case "$1" in
    --image) IMAGE="$2"; shift 2 ;;
    --site) SITE="$2"; shift 2 ;;
    --secrets-dir) SECRETS_DIR="$2"; shift 2 ;;
    --signing-key) SIGNING_KEY="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --work) WORK="$2"; shift 2 ;;
    --no-compress) COMPRESS=0; shift ;;
    -h|--help) usage 0 ;;
    *) echo "unknown argument: $1" >&2; usage 2 ;;
  esac
done

require_tools curl xz sha256sum sfdisk mcopy mtype debugfs python3 openssl tar gzip
python3 -c 'import yaml' 2>/dev/null || die "python3 PyYAML is required (apt install python3-yaml)"
[[ -f "${SITE}" ]] || die "site config not found: ${SITE}"
VERSION="${VERSION:-$(PYTHONPATH="${SOFTWARE}/agent" python3 -c 'import foyer_agent; print(foyer_agent.__version__)')}"
mkdir -p "${OUT}" "${WORK}"

# --- 1. base image -----------------------------------------------------------------
fetch_base_image() {
  local url sum_file
  log "resolving ${LATEST_URL}"
  url="$(curl -fsSIL -o /dev/null -w '%{url_effective}' "${LATEST_URL}")" \
    || die "cannot reach downloads.raspberrypi.com (use --image with a local copy)"
  [[ "${url}" == *.img.xz ]] || die "unexpected latest URL: ${url}"
  IMAGE="${WORK}/$(basename "${url}")"
  sum_file="${IMAGE}.sha256"
  if [[ ! -f "${IMAGE}" ]]; then
    log "downloading $(basename "${url}")"
    curl -fL --retry 3 -o "${IMAGE}.part" "${url}"
    mv "${IMAGE}.part" "${IMAGE}"
  fi
  curl -fsSL --retry 3 -o "${sum_file}" "${url}.sha256"
  log "verifying SHA256"
  (cd "${WORK}" && sha256sum -c "$(basename "${sum_file}")") || die "checksum mismatch for ${IMAGE}"
}

[[ -n "${IMAGE}" ]] || fetch_base_image
[[ -f "${IMAGE}" ]] || die "image not found: ${IMAGE}"

STAMP="$(date -u +%Y%m%d)"
TARGET="${WORK}/foyer-vk1-${VERSION}-${STAMP}.img"
log "preparing ${TARGET}"
case "${IMAGE}" in
  *.xz) xz -dc -T0 "${IMAGE}" > "${TARGET}" ;;
  *) cp --reflink=auto "${IMAGE}" "${TARGET}" ;;
esac

read -r BOOT_OFFSET ROOT_OFFSET < <(partition_offsets "${TARGET}")
log "boot partition at byte ${BOOT_OFFSET}, root at byte ${ROOT_OFFSET}"

# --- 2. site rendering and release bundle ---------------------------------------------
RENDER="${WORK}/render"
rm -rf "${RENDER}" && mkdir -p "${RENDER}"
python3 "${HERE}/scripts/render_site.py" --site "${SITE}" --templates "${HERE}/files/boot" --out "${RENDER}"

if [[ -z "${SIGNING_KEY}" ]]; then
  SIGNING_KEY="${WORK}/dev-release-signing.pem"
  if [[ ! -f "${SIGNING_KEY}" ]]; then
    warn "no --signing-key given: generating a DEVELOPMENT release key (${SIGNING_KEY})"
    openssl genpkey -algorithm ed25519 -out "${SIGNING_KEY}" 2>/dev/null
  fi
fi
RELEASE="${WORK}/release"
rm -rf "${RELEASE}"
"${HERE}/scripts/make-release.sh" --version "${VERSION}" --key "${SIGNING_KEY}" --out "${RELEASE}" \
  --base-url "$(python3 "${HERE}/scripts/render_site.py" --site "${SITE}" --get os.ota.channel_url | sed 's#/[^/]*$##')"

# --- 3. boot partition (FAT): config.txt, cmdline.txt, cloud-init seed ---------------
inject_boot "${TARGET}" "${BOOT_OFFSET}" "${RENDER}"

# --- 4. root file system (ext4): first-boot provisioning bundle ----------------------
PAYLOAD="${WORK}/payload"
rm -rf "${PAYLOAD}" && mkdir -p "${PAYLOAD}"
cp -a "${HERE}/files/rootfs/." "${PAYLOAD}/"
BUNDLE="${PAYLOAD}/usr/lib/foyer/provision"
mkdir -p "${BUNDLE}/release" "${PAYLOAD}/etc/foyer"
cp "${RELEASE}"/* "${BUNDLE}/release/"
cp "${RENDER}/site.yaml" "${PAYLOAD}/etc/foyer/site.yaml"
if [[ -n "${SECRETS_DIR}" ]]; then
  mkdir -p "${PAYLOAD}/etc/foyer/provision-secrets"
  cp "${SECRETS_DIR}"/* "${PAYLOAD}/etc/foyer/provision-secrets/"
fi
inject_rootfs "${TARGET}" "${ROOT_OFFSET}" "${PAYLOAD}"

# --- 5. output ---------------------------------------------------------------------
FINAL="${OUT}/$(basename "${TARGET}")"
mv "${TARGET}" "${FINAL}"
if ((COMPRESS)); then
  log "compressing"
  xz -T0 -6 -f "${FINAL}"
  FINAL="${FINAL}.xz"
fi
(cd "${OUT}" && sha256sum "$(basename "${FINAL}")" > "$(basename "${FINAL}").sha256")
cp "${RELEASE}/release-signing.pub" "${OUT}/"
log "done: ${FINAL}"
