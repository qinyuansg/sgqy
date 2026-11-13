#!/usr/bin/env bash
# Foyer VK-1 first-boot provisioning (runs once, as root, from foyer-provision.service).
#
# Idempotent: every step leaves a stamp in /var/lib/foyer-provision and is
# skipped when re-run after a failure (the unit restarts on failure).
#
# Storage modes:
#   * production — written by rpi-sb-provisioner: the root file system is
#     already a LUKS2 container keyed from the CM5 OTP device key (+ secure
#     boot). /var/lib/foyer is a directory on the encrypted root.
#   * development — flashed directly: root is grown to os.storage.root_size
#     and the rest of the eMMC becomes a LUKS2 data partition for
#     /var/lib/foyer, keyed from the OTP key via rpi-fw-crypto when available.
set -euo pipefail

BUNDLE=/usr/lib/foyer/provision
STAMPS=/var/lib/foyer-provision
SITE=/etc/foyer/site.yaml
BOOT_OVERRIDE=/boot/firmware/foyer/site.yaml
SECRETS=/etc/foyer/provision-secrets
CREDSTORE=/etc/credstore.encrypted
SITE_GET=/usr/lib/foyer/site-get
ROOT_SIZE_DEFAULT=12G

# Pinned cryptoauthlib release for the ATECC608B PKCS#11 module.
CAL_REPO=https://github.com/MicrochipTech/cryptoauthlib.git
CAL_TAG=v3.9.0
CAL_COMMIT=d0b9a77be7372db3bd5ebb1edc321b1374f311a6

PACKAGES=(
  cage chromium wlr-randr fonts-inter curl
  python3-aiohttp python3-yaml python3-cryptography python3-pil python3-qrcode
  python3-libgpiod python3-picamera2
  espeak-ng alsa-utils ddcutil
  cups cups-client printer-driver-ptouch
  nftables unattended-upgrades
  cryptsetup systemd-cryptsetup
  pkcs11-provider p11-kit openssl
)

log() { echo "foyer-provision: $*"; }
site() { "${SITE_GET}" "$@"; }

step() { # name function
  local name="$1"
  shift
  if [[ -f "${STAMPS}/${name}" ]]; then
    log "step ${name}: already done"
    return 0
  fi
  log "step ${name}"
  "$@"
  touch "${STAMPS}/${name}"
}

# --- configuration ------------------------------------------------------------------

load_site() {
  if [[ -f "${BOOT_OVERRIDE}" ]]; then
    log "using site override from the boot partition"
    install -m 0644 "${BOOT_OVERRIDE}" "${SITE}"
  fi
  [[ -f "${SITE}" ]] || { log "no site configuration"; exit 1; }
}

secure_boot_root() {
  [[ "$(findmnt -no SOURCE /)" == /dev/mapper/* ]]
}

# --- storage ------------------------------------------------------------------------

storage_production() {
  install -d -m 0750 /var/lib/foyer
  echo "fde-otp" > /etc/foyer/storage-protection
}

# Resize partition PART_NO of DISK (device or image file) to SIZE and append a
# data partition directly after it, filling the rest of the disk.
layout_partitions() { # disk part_no size
  local disk="$1" part_no="$2" size="$3" end
  echo ",${size}" | sfdisk --quiet --no-reread --no-tell-kernel -N "${part_no}" "${disk}"
  end="$(sfdisk --json "${disk}" | python3 -c '
import json, sys
part = json.load(sys.stdin)["partitiontable"]["partitions"][int(sys.argv[1]) - 1]
print(part["start"] + part["size"])' "${part_no}")"
  echo "start=${end}, type=83" | sfdisk --quiet --no-reread --no-tell-kernel --append "${disk}"
}

storage_development() {
  local root_part disk part_no root_size data_part
  root_part="$(findmnt -no SOURCE /)"
  disk="/dev/$(lsblk -no PKNAME "${root_part}")"
  part_no="$(cat "/sys/class/block/$(basename "${root_part}")/partition")"
  root_size="$(site os.storage.root_size "${ROOT_SIZE_DEFAULT}")"

  log "growing ${root_part} to ${root_size} and adding the encrypted data partition"
  layout_partitions "${disk}" "${part_no}" "${root_size}"
  partx -u "${disk}"
  partx -a "${disk}" 2>/dev/null || true
  resize2fs "${root_part}"
  udevadm settle
  data_part="$(lsblk -lnpo NAME "${disk}" | tail -n1)"

  install -m 0644 "${BUNDLE}/units/foyer-data-unlock.service" /etc/systemd/system/
  if ! /usr/lib/foyer/foyer-data-unlock key >/dev/null 2>&1; then
    log "WARNING: OTP device key unavailable - using a key file (development only)"
    (umask 077 && head -c 64 /dev/urandom | base64 -w0 > /etc/foyer/data.key)
    echo "keyfile" > /etc/foyer/storage-protection
  else
    echo "luks-otp" > /etc/foyer/storage-protection
  fi
  /usr/lib/foyer/foyer-data-unlock key |
    cryptsetup luksFormat --batch-mode --type luks2 --label foyerdata --key-file=- "${data_part}"
  udevadm settle
  /usr/lib/foyer/foyer-data-unlock open
  mkfs.ext4 -q -L foyer-data /dev/mapper/foyerdata
  echo "/dev/mapper/foyerdata /var/lib/foyer ext4 defaults,noatime,nodev,nosuid,noexec,x-systemd.requires=foyer-data-unlock.service 0 2" >> /etc/fstab
  systemctl daemon-reload
  systemctl enable foyer-data-unlock.service
  install -d /var/lib/foyer
  mount /var/lib/foyer
  chmod 0750 /var/lib/foyer
}

storage() {
  if secure_boot_root; then storage_production; else storage_development; fi
}

# --- network & packages -------------------------------------------------------------

wifi() {
  local ssid psk_name psk
  ssid="$(site os.wifi.ssid)"
  [[ -n "${ssid}" ]] || return 0
  psk_name="$(site os.wifi.psk_secret)"
  psk="$(cat "${SECRETS}/${psk_name}" 2>/dev/null || true)"
  [[ -n "${psk}" ]] || { log "Wi-Fi configured but no passphrase secret supplied"; return 0; }
  iw reg set "$(site os.wifi.country GB)" 2>/dev/null || true
  rfkill unblock wifi 2>/dev/null || true
  nmcli connection delete foyer-wifi >/dev/null 2>&1 || true
  nmcli connection add type wifi ifname wlan0 con-name foyer-wifi ssid "${ssid}" \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${psk}" connection.autoconnect yes >/dev/null
  nmcli connection up foyer-wifi >/dev/null || true
}

wait_online() {
  local i
  for i in $(seq 1 60); do
    curl -fsS -o /dev/null --max-time 5 https://deb.debian.org/ && return 0
    log "waiting for network (${i})"
    sleep 5
  done
  log "no network: provisioning needs Internet access for packages"
  return 1
}

packages() {
  export DEBIAN_FRONTEND=noninteractive
  local attempt
  for attempt in 1 2 3; do
    if apt-get update && apt-get -y -o Dpkg::Options::=--force-confold full-upgrade &&
       apt-get -y --no-install-recommends install "${PACKAGES[@]}"; then
      return 0
    fi
    log "apt attempt ${attempt} failed"
    sleep 20
  done
  return 1
}

# --- accounts, files, services ------------------------------------------------------

accounts() {
  getent group foyer-hw >/dev/null || groupadd --system foyer-hw
  id foyer-agent >/dev/null 2>&1 ||
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin foyer-agent
  id foyer-kiosk >/dev/null 2>&1 ||
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin \
      --groups video,render,input,audio foyer-kiosk
  # No interactive first-user wizard; lock any default account and root.
  systemctl disable --now userconfig.service 2>/dev/null || true
  passwd -l root >/dev/null
}

system_files() {
  cp -r "${BUNDLE}/etc/." /etc/
  install -m 0644 "${BUNDLE}"/units/foyer-{agent,kiosk,hw-setup,ota}.service "${BUNDLE}"/units/foyer-ota.{timer,path} \
    /etc/systemd/system/
  local vendor product
  vendor="$(site os.qr_scanner.vendor_id)"
  product="$(site os.qr_scanner.product_id)"
  if [[ -n "${vendor}" && -n "${product}" ]]; then
    cat > /etc/udev/rules.d/71-foyer-qr.rules <<EOF
# QR scanner on hub U13 port 2: stable names, exclusive to the agent, ignored by the compositor.
SUBSYSTEM=="input", KERNEL=="event*", ENV{ID_VENDOR_ID}=="${vendor}", ENV{ID_MODEL_ID}=="${product}", SYMLINK+="foyer/qr-kbd", GROUP="foyer-hw", MODE="0640", ENV{LIBINPUT_IGNORE_DEVICE}="1"
SUBSYSTEM=="tty", ATTRS{idVendor}=="${vendor}", ATTRS{idProduct}=="${product}", SYMLINK+="foyer/qr-tty", GROUP="foyer-hw", MODE="0660"
EOF
  fi
  # tmpfs for temporary data and the CUPS spool; read-only firmware partition.
  grep -q ' /var/tmp ' /etc/fstab || echo "tmpfs /var/tmp tmpfs nodev,nosuid,size=64M 0 0" >> /etc/fstab
  grep -q ' /var/spool/cups ' /etc/fstab ||
    echo "tmpfs /var/spool/cups tmpfs nodev,nosuid,noexec,mode=0710,gid=lp,size=64M 0 0" >> /etc/fstab
  sed -i -E 's#^(\S+\s+/boot/firmware\s+vfat\s+)defaults#\1defaults,ro#' /etc/fstab
  systemctl daemon-reload
  systemd-tmpfiles --create /etc/tmpfiles.d/foyer.conf
  udevadm control --reload
}

seal() { # name < secret
  install -d -m 0700 "${CREDSTORE}"
  systemd-creds encrypt --with-key=auto --name="$1" - "${CREDSTORE}/$1"
}

secrets() {
  local name file
  # The offline-queue key is generated on the device and never leaves it.
  [[ -f "${CREDSTORE}/foyer-queue-key" ]] || head -c 32 /dev/urandom | seal foyer-queue-key
  while IFS= read -r name; do
    file="$(site "os.secrets.${name}")"
    if [[ -f "${SECRETS}/${file}" ]]; then
      seal "${name}" < "${SECRETS}/${file}"
    else
      log "secret ${name} not supplied (${file}); configure it later with systemd-creds"
    fi
  done < <(site --keys os.secrets)
  if [[ -d "${SECRETS}" ]]; then
    find "${SECRETS}" -type f -exec shred -u {} +
    rm -rf "${SECRETS}"
  fi
}

application() {
  install -m 0644 "${BUNDLE}/release/release-signing.pub" /etc/foyer/release-signing.pub
  /usr/lib/foyer/foyer-ota install-local "${BUNDLE}/release" no-restart
  # The site file doubles as the agent configuration (the agent ignores `os`).
  install -m 0640 -g foyer-agent "${SITE}" /etc/foyer/foyer.yaml
  if [[ -d /etc/foyer/branding ]]; then chmod -R a+rX /etc/foyer/branding; fi
}

identity() {
  [[ "$(site os.identity.backend atecc608b)" == atecc608b ]] || return 0
  local src
  src="$(mktemp -d)"
  apt-get -y --no-install-recommends install git cmake build-essential
  git clone --quiet --depth 1 --branch "${CAL_TAG}" "${CAL_REPO}" "${src}/cal"
  [[ "$(git -C "${src}/cal" rev-parse HEAD)" == "${CAL_COMMIT}" ]] || { log "cryptoauthlib commit mismatch"; return 1; }
  cmake -S "${src}/cal" -B "${src}/build" -DCMAKE_BUILD_TYPE=Release -DATCA_HAL_I2C=ON -DATCA_PKCS11=ON \
    -DATCA_TNGTLS_SUPPORT=ON -DDEFAULT_LIB_PATH=/usr/local/lib -DDEFAULT_CONF_PATH=/etc/cryptoauthlib \
    -DDEFAULT_STORE_PATH=/var/lib/cryptoauthlib
  cmake --build "${src}/build" -j"$(nproc)"
  cmake --install "${src}/build"
  ldconfig
  rm -rf "${src}"
  apt-get -y purge git cmake build-essential && apt-get -y autoremove --purge
  /usr/lib/foyer/foyer-identity setup
}

printer() {
  cupsctl --no-share-printers --no-remote-admin --no-remote-any --no-debug-logging
  cupsctl PreserveJobHistory=No PreserveJobFiles=No MaxJobTime=300
  systemctl disable --now cups-browsed.service 2>/dev/null || true
  local uri model queue
  uri="$(site os.printer.device_uri)"
  model="$(site os.printer.model everywhere)"
  queue="$(site hardware.printer.queue FoyerBadge)"
  if [[ -n "${uri}" ]]; then
    lpadmin -p "${queue}" -E -v "${uri}" -m "${model}" -o printer-error-policy=abort-job
  else
    log "no printer configured (os.printer.device_uri); badges will not print"
  fi
}

ssh_access() {
  local keys
  keys="$(site --list os.ssh.authorized_keys)"
  if [[ "$(site os.ssh.enabled false)" == true && -n "${keys}" ]]; then
    id foyeradmin >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --groups sudo foyeradmin
    passwd -l foyeradmin >/dev/null
    install -d -m 0700 -o foyeradmin -g foyeradmin /home/foyeradmin/.ssh
    printf '%s\n' "${keys}" > /home/foyeradmin/.ssh/authorized_keys
    chown foyeradmin:foyeradmin /home/foyeradmin/.ssh/authorized_keys
    chmod 0600 /home/foyeradmin/.ssh/authorized_keys
    echo "foyeradmin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/foyeradmin
    chmod 0440 /etc/sudoers.d/foyeradmin
    systemctl enable ssh.service
  else
    rm -f /etc/ssh/sshd_config.d/foyer.conf
    systemctl disable --now ssh.service ssh.socket 2>/dev/null || true
  fi
}

firewall() {
  local mgmt=() cidr metrics_port
  mapfile -t mgmt < <(site --list os.firewall.mgmt_cidrs)
  metrics_port="$(site monitoring.metrics_listen | sed -n 's/.*://p')"
  {
    echo "#!/usr/sbin/nft -f"
    echo "# Foyer VK-1: outbound only; optional management access from listed networks."
    echo "flush ruleset"
    echo "table inet filter {"
    echo "  chain input {"
    echo "    type filter hook input priority filter; policy drop;"
    echo "    iif lo accept"
    echo "    ct state established,related accept"
    echo "    ct state invalid drop"
    echo "    ip protocol icmp icmp type { echo-request, destination-unreachable, time-exceeded } limit rate 5/second accept"
    echo "    ip6 nexthdr icmpv6 icmpv6 type { nd-neighbor-solicit, nd-neighbor-advert, nd-router-advert, echo-request, packet-too-big } accept"
    echo "    udp sport 67 udp dport 68 accept"
    echo "    udp sport 547 udp dport 546 accept"
    for cidr in "${mgmt[@]}"; do
      [[ -n "${cidr}" ]] || continue
      local family=ip
      [[ "${cidr}" == *:* ]] && family=ip6
      echo "    ${family} saddr ${cidr} tcp dport 22 accept"
      [[ -n "${metrics_port}" ]] && echo "    ${family} saddr ${cidr} tcp dport ${metrics_port} accept"
    done
    echo "  }"
    echo "  chain forward { type filter hook forward priority filter; policy drop; }"
    echo "  chain output { type filter hook output priority filter; policy accept; }"
    echo "}"
  } > /etc/nftables.conf
  nft -c -f /etc/nftables.conf
  systemctl enable nftables.service
}

lockdown() {
  systemctl mask ctrl-alt-del.target getty@tty1.service autovt@.service
  systemctl mask swap.target
  swapoff -a || true
  systemctl disable --now avahi-daemon.service avahi-daemon.socket triggerhappy.service 2>/dev/null || true
  [[ "$(site os.radios.disable_bluetooth true)" == true ]] &&
    { systemctl disable --now bluetooth.service hciuart.service 2>/dev/null || true; }
  systemctl disable rpi-resize.service 2>/dev/null || true
  timedatectl set-timezone "$(site os.timezone Etc/UTC)" || true
  hostnamectl set-hostname "$(site os.hostname foyer-vk1)"
  sysctl --system >/dev/null
  # cloud-init has done its job (development images) and must not run again.
  touch /etc/cloud/cloud-init.disabled
}

updates() {
  if secure_boot_root; then
    # Signed boot.img: kernel and firmware ship as rpi-sb-provisioner boot
    # packages through the OTA channel, never as unsigned apt updates.
    cat > /etc/apt/apt.conf.d/53foyer-secure-boot <<'EOF'
Unattended-Upgrade::Package-Blacklist { "linux-image-.*"; "linux-headers-.*"; "raspi-firmware"; "rpi-eeprom"; "linux-kbuild-.*"; };
EOF
  fi
  local window
  window="$(site os.updates.reboot_window 03:30)"
  echo "Unattended-Upgrade::Automatic-Reboot-Time \"${window}\";" > /etc/apt/apt.conf.d/54foyer-reboot-window
  if [[ "$(site os.updates.unattended_upgrades true)" == true ]]; then
    systemctl enable apt-daily.timer apt-daily-upgrade.timer
  fi
}

eeprom() {
  # Contract: PSU_MAX_CURRENT=5000 (CM5 CC lines not wired). Production devices get
  # it from rpi-sb-provisioner's bootloader configuration.
  command -v rpi-eeprom-config >/dev/null || return 0
  if rpi-eeprom-config | grep -q '^PSU_MAX_CURRENT=5000'; then return 0; fi
  if secure_boot_root; then
    log "WARNING: PSU_MAX_CURRENT is not 5000; fix the rpi-sb-provisioner bootloader config"
    return 0
  fi
  local cfg
  cfg="$(mktemp)"
  rpi-eeprom-config | sed '/^PSU_MAX_CURRENT=/d' > "${cfg}"
  echo "PSU_MAX_CURRENT=5000" >> "${cfg}"
  rpi-eeprom-config --apply "${cfg}" || log "WARNING: could not update the bootloader EEPROM"
  rm -f "${cfg}"
}

services() {
  systemctl set-default graphical.target
  systemctl enable foyer-hw-setup.service foyer-agent.service foyer-kiosk.service foyer-ota.timer foyer-ota.path
}

main() {
  install -d -m 0700 "${STAMPS}"
  load_site
  step storage storage
  step wifi wifi
  wait_online
  step packages packages
  step accounts accounts
  step system-files system_files
  step secrets secrets
  step application application
  step identity identity
  step printer printer
  step ssh ssh_access
  step firewall firewall
  step lockdown lockdown
  step updates updates
  step eeprom eeprom
  step services services
  touch /etc/foyer/provisioned
  log "provisioning complete; rebooting into kiosk mode"
  systemctl disable foyer-provision.service
  systemctl reboot
}

# Sourcing the script (tests) only defines the functions.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
