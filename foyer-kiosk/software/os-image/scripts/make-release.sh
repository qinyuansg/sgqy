#!/usr/bin/env bash
# Package agent + app as a signed, reproducible release for foyer-ota.
#
#   make-release.sh --version 1.2.0 --key release-ed25519.pem --out DIR [--base-url URL]
#
# Produces foyer-<version>.tar.gz, latest.json (version, url, sha256) and
# latest.json.sig (Ed25519 over the manifest bytes), plus release-signing.pub.
# Publish the three files under the channel URL configured in os.ota.channel_url.

set -euo pipefail

SOFTWARE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="" KEY="" OUT="" BASE_URL=""
while (($#)); do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --key) KEY="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "${VERSION}" && -f "${KEY}" && -n "${OUT}" ]] || { echo "usage: $0 --version V --key KEY --out DIR" >&2; exit 2; }
[[ "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version must be X.Y.Z" >&2; exit 2; }

mkdir -p "${OUT}"
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT
ROOT="${STAGE}/foyer-${VERSION}"
mkdir -p "${ROOT}/agent"
cp -r "${SOFTWARE}/agent/foyer_agent" "${ROOT}/agent/"
cp "${SOFTWARE}/agent/requirements.txt" "${ROOT}/agent/"
cp -r "${SOFTWARE}/app" "${ROOT}/app"
printf '%s\n' "${VERSION}" > "${ROOT}/VERSION"
find "${ROOT}" -name __pycache__ -prune -exec rm -rf {} +

EPOCH="${SOURCE_DATE_EPOCH:-$(git -C "${SOFTWARE}" log -1 --format=%ct 2>/dev/null || date +%s)}"
TARBALL="foyer-${VERSION}.tar.gz"
tar --sort=name --mtime="@${EPOCH}" --owner=0 --group=0 --numeric-owner --mode='u+rwX,go+rX,go-w' \
  -C "${STAGE}" -cf - "foyer-${VERSION}" | gzip -n -9 > "${OUT}/${TARBALL}"

SHA="$(sha256sum "${OUT}/${TARBALL}" | cut -d' ' -f1)"
URL="${BASE_URL:+${BASE_URL%/}/}${TARBALL}"
printf '{"version":"%s","url":"%s","sha256":"%s"}\n' "${VERSION}" "${URL}" "${SHA}" > "${OUT}/latest.json"
openssl pkeyutl -sign -inkey "${KEY}" -rawin -in "${OUT}/latest.json" -out "${OUT}/latest.json.sig"
openssl pkey -in "${KEY}" -pubout -out "${OUT}/release-signing.pub"
openssl pkeyutl -verify -pubin -inkey "${OUT}/release-signing.pub" -rawin \
  -in "${OUT}/latest.json" -sigfile "${OUT}/latest.json.sig" >/dev/null
echo "release ${VERSION}: ${OUT}/${TARBALL} (sha256 ${SHA})"
