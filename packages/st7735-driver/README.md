# @your-scope/st7735-driver

Minimaler **ST7735**-TFT-Treiber für **Raspberry Pi** in **TypeScript (ESNext/ESM)** über **rpio** (SPI + GPIO).

- Unterstützt: 16-Bit **RGB565**, Vollbild-/Rect-Writes, Rotation, Display-Inversion, Backlight-Pin
- Optimiert für: **große Buffer-Writes** (schnell) statt per-Pixel-I/O
- Saubere API: `init()`, `setRotation()`, `fillScreen()`, `pushRect()`, `drawPixel()`, `setBacklight()`
- Läuft mit **Bun** oder **Node.js** (ESM). Für SPI-Zugriff in der Regel **root** nötig.

> Hinweis: ST7735 hat diverse Varianten (“Tab Colors”, Offsets). Die Defaults sind solide; ggf. `colOffset`, `rowOffset`, `invert`, `MADCTL` anpassen.

---

## Installation

```bash
# In deinem Projekt
npm i rpio @your-scope/st7735-driver
# oder
bun add rpio @your-scope/st7735-driver
```

> `rpio` ist ein CJS-Modul. Wir binden es ESM-freundlich via `createRequire` ein.

---

## Hardware-Voraussetzungen

- Raspberry Pi (getestet auf 3B/3B+/4)
- ST7735 128×160 TFT (SPI, D/C, RST, optional BL)
- Verkabelung (BCM-Nummern):

| Signal | Display | Raspberry Pi (BCM) |
|-------:|:--------|:-------------------|
| VCC    | 3V3     | 3.3V               |
| GND    | GND     | GND                |
| SCL    | SCLK    | GPIO 11 (SPI0 SCLK)|
| SDA    | MOSI    | GPIO 10 (SPI0 MOSI)|
| CS     | CS      | GPIO 8  (SPI0 CE0) |
| DC     | D/C     | z. B. GPIO 25      |
| RST    | RESET   | z. B. GPIO 27      |
| BL     | Backlight| z. B. GPIO 18 (optional)|

---

## SPI aktivieren

```bash
sudo raspi-config
# Interfacing Options -> SPI -> Enable
sudo reboot
```

Danach sollte `/dev/spidev0.0` verfügbar sein.

---

## Schnellstart (Library verwenden)

```ts
import { ST7735, toRGB565, rgba } from "@your-scope/st7735-driver";

const lcd = new ST7735({
  width: 128,
  height: 160,
  chipSelect: 0,     // CE0
  spiMode: 0,        // ST7735 = Mode 0
  clockDivider: 12,  // 250MHz/12 ≈ 20.8 MHz (kleiner = schneller)
  dcPin: 25,
  resetPin: 27,
  backlightPin: 18,  // optional
  invert: true,      // viele Module sehen so korrekt aus
  rotation: 0
});

lcd.init();
lcd.setBacklight(true);

// Bildschirm schwarz
lcd.fillScreen(toRGB565(rgba(0, 0, 0)));

// Rotes Rechteck
lcd.pushRect(10, 10, 60, 40, toRGB565(rgba(255, 50, 50)));
```

> Auf **Linux** mit direktem SPI/GPIO-Zugriff oft als **root** ausführen:
> ```bash
> sudo node dist/index.js
> # oder:
> sudo bun run dist/index.js
> ```

---

## Demo direkt starten

Dieses Paket bringt eine kleine Demo mit (Farbverlauf + FPS-Ausgabe). Führe die **kompilierte** `dist/index.js` direkt aus:

```bash
# Build
npm run build

# Demo (als root)
sudo node dist/index.js
# oder:
sudo bun run dist/index.js
```

Wenn du im **Dev-Modus** ohne build testen willst (Bun), kannst du auch direkt die TS-Quelle starten:

```bash
# Achtung: rpio benötigt Root
sudo bun run src/index.ts
```

---

## API

### `class ST7735(opts: ST7735Options)`

**Wichtigste Optionen:**
- `width`, `height`: Panel-Auflösung, z. B. `128×160`
- `chipSelect`: `0` (CE0) oder `1` (CE1)
- `spiMode`: meist `0`
- `clockDivider`: Taktteiler (250 MHz / divider). **Kleiner = schneller**. Typisch zwischen `8..20`.
- `dcPin`, `resetPin`: BCM-GPIOs
- `backlightPin?`: optional (falls per GPIO verdrahtet)
- `colOffset?`, `rowOffset?`: Panel-spezifisch (z. B. 2/1)
- `invert?`: `true` → `INVON` (manche Module brauchen das)
- `rotation?`: `0 | 90 | 180 | 270`

**Methoden:**
- `init()`: Initialisiert das Display (Reset, Modus, Gamma, etc.)
- `setRotation(deg)`: Setzt Ausrichtung (schreibt `MADCTL`)
- `fillScreen(color565)`: Vollbild-Füllung
- `pushRect(x, y, w, h, src)`: Rechteck füllen — entweder mit **konstanter Farbe** (`number` RGB565) oder **Pixel-Array** (`Uint16Array` in RGB565, Länge = `w*h`)
- `drawPixel(x, y, color565)`: einzelnes Pixel (langsam, Debug)
- `setBacklight(on)`: Backlight per GPIO
- `dispose()`: Ressourcen freigeben (SPI/GPIO schließen)

**Hilfen:**
- `toRGB565(rgba | number)`: RGBA→RGB565
- `rgba(r,g,b,a?)`: einfacher RGBA-Builder

---

## Performance-Tipps

- **`clockDivider`** so klein wie stabil möglich (z. B. 8..12). Teste auf Artefakte.
- **Große Buffer-Writes** (Vollbild/Rect) sind schneller als viele kleine Writes.
- **Dirty-Rects** nutzen, statt jedes Frame Fullscreen.
- Wenn Farben “komisch” wirken: `invert` togglen **oder** in `setRotation()` das **BGR-Bit (0x08)** setzen.

---

## Troubleshooting

- **`Error: EPERM`/Zugriff verweigert** → Als **root** ausführen oder User in Gruppen `gpio`/`spi` hinzufügen.
- **Kein SPI-Gerät** → SPI in `raspi-config` aktivieren, neu booten.
- **Vertauschte Farben** → `invert` ändern oder BGR-Bit setzen.
- **Verschobenes Bild** → `colOffset`/`rowOffset` justieren.
- **Flackern/Artefakte** → `clockDivider` erhöhen (langsamerer Takt), Leitungen kurz halten.

---

## Lizenz

MIT. Viel Spaß und viele Frames. 😄
