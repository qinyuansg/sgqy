# Foyer VK-1 — Hardware ⇄ Software Interface Contract (rev B)

This file is the single source of truth for how the OS image, device agent and
carrier board talk to each other. Change it here first, then in the code.

Compute: Raspberry Pi Compute Module 5, `CM5104032` (4 GB LPDDR4X, 32 GB eMMC,
Wi-Fi 5 / BT 5.0), on the Foyer carrier board `FYR-CB-01`.

Rev B changes (from rev A): TPM removed — disk encryption uses the CM5's
official secure-boot + OTP device-key full-disk-encryption flow; ATECC608B
secure element added for device identity; audio moved to I2S (MAX98357A amp +
2× ICS-43434 mics); status light moved to GPIO13 (RP1 PIO); LTE is a USB
modem on an internal hub port; camera-1 I2C clarified.

## Buses

| Bus | CM5 pins (GPIO) | Devices | Linux |
|---|---|---|---|
| I2C1 | GPIO2 SDA / GPIO3 SCL (1.8 kΩ pull-ups on CM5) | Sensor bar: VL53L1X ToF @0x29. Carrier: STUSB4500 USB-PD sink @0x28, INA238 power monitor @0x40, TMP1075 board temp @0x48, ATECC608B secure element @0x60 | `dtparam=i2c_arm=on` → `/dev/i2c-1` |
| MIPI0 + SDA0/SCL0 | MIPI0 4-lane, I2C on CM5 pins 80/82 | Camera 0: Raspberry Pi Camera Module 3 Wide (SC0874, IMX708, RGB) — face capture | `dtoverlay=imx708,cam0` |
| MIPI1 + ID_SD/ID_SC | MIPI1 4-lane, I2C on GPIO0/GPIO1 (CM5 pins 36/35) | Camera 1: Camera Module 3 Wide NoIR (SC0875) — IR liveness | `dtoverlay=imx708,cam1` (verify overlay naming at EVT bring-up) |
| I2S (PCM) | GPIO18 BCLK, GPIO19 LRCLK, GPIO20 DIN (mics), GPIO21 DOUT (amp) | MAX98357A class-D amp (carrier, mono (L+R)/2) + 2× ICS-43434 I2S MEMS mics (sensor bar; L/R) | `dtoverlay=googlevoicehat-soundcard` (same MAX98357A + I2S-mic topology) |
| PIO | GPIO13 | 24× SK6812MINI RGB status light bar (5 V level via SN74LVC1T45) | `dtoverlay=ws2812-pio,gpio=13,num_leds=24` (fallback: `piolib` userspace) |
| UART0 | GPIO14 TX / GPIO15 RX | Service console header `J17` (JST GH 3) | `enable_uart=1`, 115200 8N1 |
| HDMI0 | HDMI0 | 13.3" PCAP display (Elo 1302L), rotated to portrait | `wlr-randr --output HDMI-A-1 --transform 90` |
| USB3-1 | USB 3 port 1 (SS + HS) | Passport/ID reader (USB 3), USB-A `J9` | vendor SDK |
| USB3-0 HS | → hub U13 (USB2514B) | P1 touch `J10A`, P2 QR scanner `J10B`, P3 badge printer `J11A`, P4 → hub U14 | class drivers / CUPS |
| (via U14) | hub U14 (USB2514B) | P1 NFC encoder (option) `J11B`, P2 LTE USB modem (option) `J12A`, P3 service port `J12B`, P4 spare (test pads) | |
| USB2 OTG | CM5 USB2 (pins 103/105) | Rear USB-C `J2` data lines — eMMC flashing with `rpiboot` (hold service button `SW2` = nRPIBOOT) | device mode only |
| Ethernet | CM5 internal PHY | RJ45 `J1` with 4-pair PoE++ magnetics | `eth0` |

## GPIO map (3.3 V logic, GPIO_VREF = CM5_3.3V)

| GPIO | Dir | Net | Function |
|---|---|---|---|
| 0/1 | — | `CAM1_SDA/SCL` | Camera 1 I2C (firmware). Keep `force_eeprom_read=0`. |
| 2/3 | I2C | `I2C1_SDA/SCL` | Sensor + system I2C |
| 4 | in | `POE_HIPWR_n` | Low = PoE PD module reports Type 3/4 high-power class (≥ 51 W) |
| 5 | out | `AMP_SD` | MAX98357A SD_MODE through 680 kΩ: high = on, (L+R)/2 mix; low = shutdown |
| 6 | in | `USBC_ATTACH` | STUSB4500 ATTACH (open-drain, pull-up): low = USB-C source attached |
| 12 | out (PWM0_CH0) | `IR_PWM` | 850 nm IR flood (sensor bar AL8860 CTRL), PWM dim; 0 = off |
| 13 | out (PIO) | `LED_DATA` | Status light bar data |
| 16 | out | `PRN_PWR_EN` | Badge printer 24 V rail enable (LM5176 EN) |
| 17 | in, pull-up | `TOF_INT_n` | VL53L1X GPIO1 interrupt — person in approach zone (wake) |
| 18–21 | I2S | `I2S_*` | Audio |
| 22 | out | `HUB_RESET_n` | Both USB2514B hubs reset (low = reset) |
| 23 | in, pull-up | `DOOR_OPEN` | Service door switch: high = door open (tamper/service event) |
| 24 | in | `PD_ALERT_n` | STUSB4500 ALERT |
| 25 | in | `PWR_ALERT_n` | INA238 ALERT (over-power / under-voltage on the 12 V bus) |
| 26 | out | `DISP_PWR_EN` | Display 12 V rail enable |
| 27 | out | `TOF_XSHUT` | VL53L1X XSHUT (high = enabled) |
| 7–11 | — | spare | Broken out to test pads `TP_SPI*` (SPI0) |
| FAN_PWM / FAN_TACHO | — | dedicated CM5 pins | 5 V 40 mm PWM fan `J18`; fan 5 V switched by `VBUS_EN` so it stops at shutdown |
| CAM_GPIO0 / CAM_GPIO1 | out | dedicated CM5 pins | Camera 0 connector pins 17/18; camera 1 enable pulled up to 3.3 V |

## Boot / firmware configuration required by the hardware

* Bootloader EEPROM: `PSU_MAX_CURRENT=5000` (CM5 CC1/CC2 are not wired; the
  carrier's own 5 V regulator supplies 5 A).
* `config.txt`: `dtparam=i2c_arm=on`, `dtoverlay=imx708,cam0`,
  `dtoverlay=imx708,cam1`, `dtoverlay=googlevoicehat-soundcard`,
  `dtoverlay=ws2812-pio,gpio=13,num_leds=24`, `enable_uart=1`,
  `force_eeprom_read=0`, `dtparam=fan_temp0=55000` (fan curve), `usb_max_current_enable=1`.
* Storage encryption: provision with Raspberry Pi `rpi-sb-provisioner`
  (secure boot + full-disk encryption keyed from the CM5 OTP device-unique
  private key). No discrete TPM.
* Device identity: ATECC608B (I2C1 @0x60), private key never leaves the chip;
  use `cryptoauthlib` PKCS#11 for mTLS to the VMS / fleet endpoint.
* `EEPROM_nWP` is pulled low via `R_WP` (fit at production after
  provisioning) to lock the bootloader EEPROM.

## Power rails

| Rail | Source | Budget | Consumers |
|---|---|---|---|
| `+12V_BUS` | PoE++ PD module (802.3bt Type 4, 12 V out) **or** USB-C PD sink (20 V/15 V contract → 12 V buck), ideal-diode OR | 70 W PoE / 60 W USB-C | everything below |
| `+24V_PRN` | LM5176 buck-boost, enabled by `PRN_PWR_EN` | 24 V 3 A peak | Badge printer |
| `+12V_DISP` | P-FET high-side switch, `DISP_PWR_EN` | 1.5 A | Display |
| `+12V_AUX` | polyfuse 1.5 A | 1.5 A | Passport reader DC input (if required by the selected reader) |
| `+5V_CM` | TPS54560B buck | 5 A | CM5 only |
| `+5V_AUX` | TPS54560B buck | 5 A | USB ports (TPS2065C 1 A limit each), fan, sensor bar, LED bar, amp |
| `+3V3` | TPS62A02 buck from `+5V_AUX` | 2 A | Hubs, sensors, secure element, cameras, mics |

## Power policy (device agent)

* High power available = (`POE_HIPWR_n` low) OR (USB-C contract ≥ 60 W read
  from STUSB4500 over I2C). Otherwise: printer slow mode, display ≤ 70 %
  brightness, IR flood ≤ 50 % duty, LED bar ≤ 30 %.
* Printer rail only on while a badge job is queued (+ 30 s): idle < 12 W.
* INA238 reports bus voltage/current/power for remote monitoring.

## Sensor bar `FYR-SB-01` — 15-pin JST GH cable to carrier `J16`

| Pin | Net | Pin | Net |
|---|---|---|---|
| 1 | +5V_AUX | 9 | TOF_XSHUT |
| 2 | +5V_AUX | 10 | IR_PWM |
| 3 | GND | 11 | LED_DIN (5 V) |
| 4 | GND | 12 | I2S_BCLK |
| 5 | +3V3 | 13 | I2S_LRCLK |
| 6 | I2C1_SDA | 14 | I2S_MIC_DATA |
| 7 | I2C1_SCL | 15 | GND |
| 8 | TOF_INT_n | | |

Sensor bar carries: VL53L1X ToF, 2× ICS-43434 mics (L and R, 60 mm spacing),
2× 850 nm IR emitters with AL8860 1 A constant-current driver, 24× SK6812MINI
light bar, and mounts for both cameras.
