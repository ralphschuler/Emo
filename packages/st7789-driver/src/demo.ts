import { ST7789, toRGB565, rgba } from "st7789-driver";

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
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
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

export async function runDemo(lcd: ST7789) {
  lcd.init();
  lcd.setBacklight(true);

  const W = lcd.width, H = lcd.height;
  const frame = new Uint16Array(W * H);

  const clock = new Clock();
  const fps   = new FpsCounter();

  let hueBase = 0;

  while (true) {
    const dt = clock.tick();
    hueBase = (hueBase + hueSpeed * dt) % 360;

    let off = 0;
    for (let y = 0; y < H; y++) {
      const v = 0.6 + 0.4 * (1 - y / (H - 1));
      for (let x = 0; x < W; x++) {
        const h = (hueBase + (x / (W - 1)) * 360) % 360;
        const { r, g, b } = hsvToRgb(h, 1, v);
        frame[off++] = toRGB565(rgba(r, g, b));
      }
    }

    lcd.pushRect(0, 0, W, H, frame);
    fps.tick();
    await new Promise(r => setImmediate(r));
  }
}
