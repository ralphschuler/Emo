import { ST7789 } from "./st7789.ts";

/** Packt r,g,b in [0..1] direkt nach RGB565 – ohne Umwege. */
const pack565 = (r: number, g: number, b: number): number => {
  // minimal clamp, dann auf 0..255 skalieren
  const R = ((r < 0 ? 0 : r > 1 ? 1 : r) * 255) | 0;
  const G = ((g < 0 ? 0 : g > 1 ? 1 : g) * 255) | 0;
  const B = ((b < 0 ? 0 : b > 1 ? 1 : b) * 255) | 0;
  return ((R & 0xf8) << 8) | ((G & 0xfc) << 3) | (B >> 3);
};

/** Sehr schnelle HSV→RGB mit s=1; h in [0..360), v in [0..1]. */
const hsvToRgbFast = (h: number, v: number) => {
  // s = 1 → c = v
  const c = v;
  // f = (h % 60) / 60, x = c * (1 - |2f - 1|)
  const hh = h >= 360 ? h - 360 : h < 0 ? h + 360 : h;
  const sect = (hh / 60) | 0;
  const f = (hh - sect * 60) / 60;
  const x = c * (1 - Math.abs(2 * f - 1));
  switch (sect) {
    case 0: return { r: c, g: x, b: 0 };
    case 1: return { r: x, g: c, b: 0 };
    case 2: return { r: 0, g: c, b: x };
    case 3: return { r: 0, g: x, b: c };
    case 4: return { r: x, g: 0, b: c };
    default: return { r: c, g: 0, b: x };
  }
};

class Clock {
  last = process.hrtime.bigint();
  tick(): number {
    const now = process.hrtime.bigint();
    const dt = Number(now - this.last) / 1e9;
    this.last = now;
    // cap dt, damit Sprünge (Debugger etc.) die Animation nicht zerreißen
    return dt > 0.05 ? 0.05 : dt;
  }
}

class FpsCounter {
  private last = Date.now();
  private frames = 0;
  tick() {
    this.frames++;
    const now = Date.now();
    if (now - this.last >= 1000) {
      console.log(`[FPS] ${this.frames}`);
      this.frames = 0;
      this.last = now;
    }
  }
}

/**
 * Ultra-simple, schnelle Demo:
 * - Horizontaler Hue-Verlauf (0..360)
 * - Vertikale Helligkeit (linear, ohne Gamma)
 * - Reuse eines einzigen Frame-Buffers
 * - Inkrementelle Hue-Berechnung (keine Division im inneren Loop)
 */
export async function runDemo(lcd: ST7789, hueSpeed = 60 /* Grad/s */) {
  lcd.init();
  lcd.setBacklight(true);

  const W = lcd.width;
  const H = lcd.height;
  const frame = new Uint16Array(W * H);

  const clock = new Clock();
  const fps = new FpsCounter();

  // Hue-Parameter
  let hueBase = 0;
  const HUE_SPAN = 360;                 // komplette Runde über die Breite
  const HUE_STEP = HUE_SPAN / W;        // pro Pixel
  // kleiner Trick: wir starten bei -HUE_STEP, damit die erste Add sofort in Range landet
  const HUE_WRAP = 360;

  while (true) {
    const dt = clock.tick();
    hueBase += hueSpeed * dt;
    // sauber im Bereich halten (ohne teures % in inneren Loops)
    if (hueBase >= HUE_WRAP) hueBase -= HUE_WRAP;
    else if (hueBase < 0) hueBase += HUE_WRAP;

    let off = 0;

    // vorab: für jede Zeile die Helligkeit (V) linear bestimmen
    for (let y = 0; y < H; y++) {
      // 0.6 .. 1.0, linear (keine pow)
      const v = 1.0 - 0.4 * (y / (H - 1)); // oben heller, unten dunkler

      // Hue inkrementell über die Zeile
      let h = hueBase;
      for (let x = 0; x < W; x++) {
        const { r, g, b } = hsvToRgbFast(h, v);
        frame[off++] = pack565(r, g, b);

        h += HUE_STEP;
        // Verhindert teure Modulo-Operationen pro Pixel
        if (h >= HUE_WRAP) h -= HUE_WRAP;
      }
    }

    lcd.pushRect(0, 0, W, H, frame);
    fps.tick();

    // kooperatives Yield – lässt I/O atmen, ohne den Takt zu ruinieren
    await new Promise<void>((r) => setImmediate(r));
  }
}
