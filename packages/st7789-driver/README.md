Ein ST7789-TFT-Treiber ausschließlich für **Bun** via FFI.
Diese Bibliothek erlaubt die direkte Ansteuerung eines ST7789-Displays auf einem Raspberry Pi **ohne Node.js** und **ohne rpio**, nur mit Bun, SPI (`/dev/spidev*`) und GPIO via `libgpiod`.

---

## Features

- **Reiner Bun-FFI**-Zugriff auf `libc` und `libgpiod`
- **SPI**-Kommunikation über `/dev/spidev*` mit konfigurierbarer Taktfrequenz
- **GPIO**-Steuerung für D/C, RST und Backlight
- Unterstützung für:
  - RGB565 Farbraum
  - `fillScreen()`
  - `pushRect()` für Rechtecke und Bilder
  - Rotation (`0`, `90`, `180`, `270`)
  - Display invertieren (`invert: true`)
- **Demo-Mode** beim direkten Ausführen (`src/index.ts`)
- Geschrieben in **TypeScript ESNext**, buildbar mit `tsc`

---

## Voraussetzungen

### Hardware
- Raspberry Pi (getestet mit Raspberry Pi 3B+)
- ST7789-basiertes TFT-Display (z. B. Waveshare 2.0" oder 2.4")
- Verdrahtung entsprechend der SPI-Schnittstelle und GPIOs

### Software
```bash
sudo apt-get update
sudo apt-get install -y libgpiod2 libgpiod-dev
sudo raspi-config   # SPI aktivieren → reboot
```

---

## Installation

```bash
# Repository klonen
git clone https://github.com/yourname/st7789-bun.git
cd st7789-bun

# Abhängigkeiten installieren
npm install

# Build
npm run build
```

---

## Nutzung

### Beispiel (TypeScript)
```ts
import { ST7789, toRGB565, rgba } from "st7789-driver";

const lcd = new ST7789({
  width: 128,
  height: 160,
  device: "/dev/spidev0.0",
  mode: 0,
  bits: 8,
  speedHz: 20_000_000,
  gpioChip: "gpiochip0",
  dcPin: 25,
  resetPin: 27,
  backlightPin: 18,
  invert: true,
  rotation: 0,
});

lcd.init();
lcd.setBacklight(true);
lcd.fillScreen(toRGB565(rgba(0, 0, 0)));
```

---

## Verkabelung

| Display Pin | Raspberry Pi (BCM) | Beschreibung |
|-------------|--------------------|--------------|
| VCC         | 3.3V               | Stromversorgung |
| GND         | GND                | Masse |
| SCL/SCK     | GPIO11 (SCLK)      | SPI Clock |
| SDA/MOSI    | GPIO10 (MOSI)      | SPI Daten |
| CS          | GPIO8  (CE0)       | Chip Select |
| DC          | GPIO25             | Data/Command |
| RST         | GPIO27             | Reset |
| BL          | GPIO18 (optional)  | Backlight |

---

## Demo starten

```bash
# Im Dev-Modus ohne Build
sudo bun run src/index.ts

# Oder nach Build
sudo bun run dist/index.js
```

Beim direkten Start wird die Demo automatisch ausgeführt.
Sie zeigt einen Farbverlauf und einfache animierte Rechtecke an und gibt die **FPS** in der Konsole aus.

---

## Parameter

| Name          | Typ         | Standard         | Beschreibung |
|---------------|-------------|------------------|--------------|
| width         | number      | Pflicht          | Displaybreite |
| height        | number      | Pflicht          | Displayhöhe |
| device        | string      | "/dev/spidev0.0" | SPI-Gerät |
| mode          | number      | 0                | SPI-Modus |
| bits          | number      | 8                | Bits pro Wort |
| speedHz       | number      | 20_000_000       | SPI-Takt |
| gpioChip      | string      | "gpiochip0"      | libgpiod-Chipname |
| dcPin         | number      | Pflicht          | D/C GPIO |
| resetPin      | number      | Pflicht          | Reset GPIO |
| backlightPin  | number      | -                | Backlight GPIO |
| colOffset     | number      | 0                | X-Offset |
| rowOffset     | number      | 0                | Y-Offset |
| invert        | boolean     | false            | Display invertieren |
| rotation      | 0/90/180/270| 0                | Drehung |

---

## Tipps zur Performance

- **speedHz** kann oft bis 24–32 MHz hochgesetzt werden, wenn das Kabel kurz ist.
- **fillScreen()** ist schneller als viele kleine `drawPixel()` Aufrufe.
- Große Datenblöcke (z. B. Bilder) vor dem Senden in einen `Uint16Array` RGB565 konvertieren.

---

## Lizenz

MIT License
```
