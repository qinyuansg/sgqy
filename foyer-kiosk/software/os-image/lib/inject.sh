#!/usr/bin/env bash
# Image editing helpers shared by build.sh and tests/test-synthetic.sh.
# Everything operates on image files at byte offsets: no loop devices, no root.

log() { printf '\033[1;34m==>\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

require_tools() {
  local missing=()
  for tool in "$@"; do command -v "${tool}" >/dev/null 2>&1 || missing+=("${tool}"); done
  ((${#missing[@]} == 0)) || die "missing tools: ${missing[*]} (Debian: mtools fdisk e2fsprogs xz-utils curl openssl)"
}

# Print "<boot offset> <root offset>" in bytes for a Raspberry Pi OS image (p1 FAT, p2 ext4).
partition_offsets() {
  sfdisk --json "$1" | python3 -c '
import json, sys
table = json.load(sys.stdin)["partitiontable"]
size = table.get("sectorsize", 512)
parts = table["partitions"]
if len(parts) < 2:
    sys.exit("expected a boot and a root partition")
print(parts[0]["start"] * size, parts[1]["start"] * size)'
}

# config.txt: drop any previous Foyer block, disable camera auto-detect (both
# CSI ports are configured explicitly), append the rendered fragment.
edit_config_txt() {
  local file="$1" fragment="$2"
  sed -i '/^# >>> foyer-vk1/,/^# <<< foyer-vk1/d' "${file}"
  sed -i 's/^camera_auto_detect=1$/camera_auto_detect=0/' "${file}"
  cat "${fragment}" >> "${file}"
}

# cmdline.txt: no first-boot root expansion (provisioning lays out the disk),
# console on tty3 so tty1 stays clean for the kiosk, quiet boot.
edit_cmdline_txt() {
  local file="$1" line
  line="$(tr -d '\n' < "${file}")"
  line=" ${line} "
  line="${line// resize / }"
  line="${line// console=tty1 / console=tty3 }"
  for opt in quiet loglevel=3 logo.nologo vt.global_cursor_default=0 consoleblank=0; do
    [[ "${line}" == *" ${opt} "* ]] || line="${line}${opt} "
  done
  line="$(echo "${line}" | xargs)"
  printf '%s\n' "${line}" > "${file}"
}

inject_boot() {
  local image="$1" offset="$2" render="$3" fat tmp
  fat="${image}@@${offset}"
  tmp="$(mktemp -d)"
  export MTOOLS_SKIP_CHECK=1
  log "boot partition: config.txt, cmdline.txt, cloud-init seed"
  mcopy -n -i "${fat}" ::config.txt "${tmp}/config.txt"
  mcopy -n -i "${fat}" ::cmdline.txt "${tmp}/cmdline.txt"
  edit_config_txt "${tmp}/config.txt" "${render}/config-foyer.txt"
  edit_cmdline_txt "${tmp}/cmdline.txt"
  mcopy -o -i "${fat}" "${tmp}/config.txt" ::config.txt
  mcopy -o -i "${fat}" "${tmp}/cmdline.txt" ::cmdline.txt
  for seed in user-data meta-data network-config; do
    mcopy -o -i "${fat}" "${render}/${seed}" "::${seed}"
  done
  rm -rf "${tmp}"
}

ext4_exists() { # image offset path
  debugfs -R "stat $3" "$1?offset=$2" 2>/dev/null | grep -q '^Inode:'
}

# Copy a directory tree into the ext4 root file system with debugfs, owned by
# root, keeping permission bits and symlinks. Existing directories are left as
# they are; files are replaced.
inject_rootfs() {
  local image="$1" offset="$2" payload="$3" script out path rel perm
  script="$(mktemp)"
  log "root file system: first-boot bundle ($(find "${payload}" -type f | wc -l) files)"
  while IFS= read -r -d '' path; do
    rel="/${path#"${payload}"/}"
    perm="$(stat -c '%a' "${path}")"
    if [[ -L "${path}" ]]; then
      printf 'rm %s\nsymlink %s %s\n' "${rel}" "${rel}" "$(readlink "${path}")"
    elif [[ -d "${path}" ]]; then
      ext4_exists "${image}" "${offset}" "${rel}" && continue
      printf 'mkdir %s\nsif %s mode 040%s\n' "${rel}" "${rel}" "${perm}"
      printf 'sif %s uid 0\nsif %s gid 0\n' "${rel}" "${rel}"
    else
      printf 'rm %s\nwrite %s %s\nsif %s mode 0100%s\n' "${rel}" "${path}" "${rel}" "${rel}" "${perm}"
      printf 'sif %s uid 0\nsif %s gid 0\n' "${rel}" "${rel}"
    fi
  done < <(find "${payload}" -mindepth 1 -print0 | sort -z) > "${script}"
  out="$(debugfs -w -f "${script}" "${image}?offset=${offset}" 2>&1)"
  rm -f "${script}"
  # "rm" of a file that is not there yet is expected.
  local unexpected
  unexpected="$(grep -v -E '^debugfs [0-9.]+|^(debugfs: )?(mkdir|rm|sif|write|symlink) |File not found by ext2_lookup|^Allocated inode' <<<"${out}" || true)"
  if [[ -n "${unexpected}" ]]; then
    printf '%s\n' "${unexpected}" >&2
    die "debugfs reported errors"
  fi
  verify_rootfs "${image}" "${offset}" "${payload}"
}

# Read every injected file back and compare checksums.
verify_rootfs() {
  local image="$1" offset="$2" payload="$3" path rel want got
  while IFS= read -r -d '' path; do
    rel="/${path#"${payload}"/}"
    want="$(sha256sum < "${path}" | cut -d' ' -f1)"
    got="$(debugfs -R "cat ${rel}" "${image}?offset=${offset}" 2>/dev/null | sha256sum | cut -d' ' -f1)"
    [[ "${want}" == "${got}" ]] || die "verification failed for ${rel}"
  done < <(find "${payload}" -type f -print0)
  log "root file system verified"
}
