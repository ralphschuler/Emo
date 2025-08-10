import { ST7789, toRGB565, rgba } from "./st7789.ts";

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r=0,g=0,b=0;
  if (h < 60)      { r=c; g=x; b=0; }
  else if (h <120) { r=x; g=c; b=0; }
  else if (h <180) { r=0; g=c; b=x; }
  else if (h <240) { r=0; g=x; b=c; }
  else if (h <300) { r=x; g=0; b=c; }
  else             { r=c; g=0; b=x; }
  return { r: (r+m), g: (g+m), b: (b+m) }; // noch in [0,1]
}

const srgbEncode = (u: number) =>
  u <= 0.0031308 ? 12.92*u : 1.055*Math.pow(u, 1/2.4) - 0.055;

const BAYER8 = [
  0,32, 8,40, 2,34,10,42,
 48,16,56,24,50,18,58,26,
 12,44, 4,36,14,46, 6,38,
 60,28,52,20,62,30,54,22,
  3,35,11,43, 1,33, 9,41,
 51,19,59,27,49,17,57,25,
 15,47, 7,39,13,45, 5,37,
 63,31,55,23,61,29,53,21,
];

const ditherOffset = (x: number, y: number, scale=1/255) =>
  ((BAYER8[(y & 7)*8 + (x & 7)] - 31.5) * scale);

function pack565Dithered(x: number, y: number, r01: number, g01: number, b01: number): number {
  // sRGB-Encoding kompensiert Display-Gamma etwas
  let r = srgbEncode(Math.min(1, Math.max(0, r01)));
  let g = srgbEncode(Math.min(1, Math.max(0, g01)));
  let b = srgbEncode(Math.min(1, Math.max(0, b01)));

  // kleiner Dither-Offset (stärker für G, da 6 Bit)
  const d = ditherOffset(x, y, 1/128);
  r = Math.min(1, Math.max(0, r + d));
  g = Math.min(1, Math.max(0, g + d));
  b = Math.min(1, Math.max(0, b + d));

  // nach 8-bit skalieren
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);

  // dann 565 packen
  const r5 = (R >> 3) & 0x1F;
  const g6 = (G >> 2) & 0x3F;
  const b5 = (B >> 3) & 0x1F;
  return (r5 << 11) | (g6 << 5) | b5;
}

class Clock {
  last = process.hrtime.bigint();
  tick(): number {
    const now = process.hrtime.bigint();
    const dt = Number(now - this.last) / 1e9;
    this.last = now;
    return Math.min(dt, 0.05);
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

export async function runDemo(lcd: ST7789, hueSpeed: number) {
  lcd.init();
  lcd.setBacklight(true);

  const W = lcd.width, H = lcd.height;
  const frame = new Uint16Array(W * H);

  const clock = new Clock();
  const fps   = new FpsCounter();

  let hueBase = 0;
  const HUE_SPAN = 359.999;
  while (true) {
    const dt = clock.tick();
    hueBase = (hueBase + hueSpeed * dt) % 360;

    let off = 0;
    for (let y = 0; y < H; y++) {
      // sanfter V-Verlauf + leichte Gamma auf V (optional)
      const vLin = 0.6 + 0.4 * (1 - y / (H - 1));
      const v = Math.pow(vLin, 0.9);

      for (let x = 0; x < W; x++) {
        // vermeidet h==360 → 0 (mod 360) an der rechten Kante
        const h = (hueBase + (x / W) * HUE_SPAN) % 360;
        const rgb = hsvToRgb(h, 1, v); // r,g,b in [0,1]

        // Dithered 565
        frame[off++] = pack565Dithered(x, y, rgb.r, rgb.g, rgb.b);
      }
    }

    lcd.pushRect(0, 0, W, H, frame);
    fps.tick();
    await new Promise(r => setImmediate(r));
  }
}
