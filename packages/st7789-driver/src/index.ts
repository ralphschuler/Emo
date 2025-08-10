// src/index.ts
export * from "./st7789.ts";

import { ST7789, toRGB565, rgba } from "./st7789.ts";

/* ---------- kleine Utils ---------- */

const clamp = (v:number, lo:number, hi:number)=>Math.max(lo, Math.min(hi, v));

function hsvToRgb(h: number, s: number, v: number) {
  // h in [0,360), s,v in [0,1]
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

function solidBuffer(w:number, h:number, color565:number) {
  const buf = new Uint16Array(w*h);
  buf.fill(color565);
  return buf;
}

/* ---------- Zeichenroutinen ---------- */

function drawColorBars(lcd: ST7789) {
  const { width:W, height:H } = lcd;
  const bars = [
    rgba(255,0,0), rgba(0,255,0), rgba(0,0,255),
    rgba(255,255,0), rgba(0,255,255), rgba(255,0,255),
    rgba(255,255,255), rgba(0,0,0),
  ].map(toRGB565);
  const bh = Math.floor(H / bars.length);
  for (let i=0;i<bars.length;i++){
    const y = i*bh;
    lcd.pushRect(0, y, W, (i===bars.length-1? H-y: bh), bars[i]);
  }
}

function drawCheckerboard(lcd: ST7789, tile = 12) {
  const { width:W, height:H } = lcd;
  const a = toRGB565(rgba(220,220,220));
  const b = toRGB565(rgba(40,40,40));
  for (let y=0; y<H; y+=tile) {
    for (let x=0; x<W; x+=tile) {
      const on = (((x/tile)|0) ^ ((y/tile)|0)) & 1;
      lcd.pushRect(x, y, Math.min(tile, W-x), Math.min(tile, H-y), on? a : b);
    }
  }
}

function drawHorizontalGradient(lcd: ST7789, hueStart=0, hueSpan=360) {
  const { width:W, height:H } = lcd;
  const row = new Uint16Array(W);
  for (let x=0; x<W; x++){
    const h = (hueStart + (x/W)*hueSpan) % 360;
    const {r,g,b} = hsvToRgb(h, 1, 1);
    row[x] = toRGB565(rgba(r,g,b));
  }
  // dieselbe Zeile über den ganzen Bildschirm
  for (let y=0; y<H; y++){
    lcd.pushRect(0, y, W, 1, row);
  }
}

function drawRainbowPlasma(lcd: ST7789, t:number) {
  // hübscher animierter Verlauf (full frame)
  const { width:W, height:H } = lcd;
  const buf = new Uint16Array(W*H);
  let idx = 0;
  for (let y=0; y<H; y++){
    for (let x=0; x<W; x++){
      // einfache Plasma-Funktion
      const v =
        Math.sin((x + t*40) * 0.05) +
        Math.sin((y + t*25) * 0.07) +
        Math.sin(((x+y) + t*30) * 0.04);
      // v in [ -3 .. 3 ] → [0..1]
      const n = (v + 3) / 6;
      const h = (n*360) % 360;
      const s = 0.9;
      const val = 0.9;
      const {r,g,b} = hsvToRgb(h, s, val);
      buf[idx++] = toRGB565(rgba(r,g,b));
    }
  }
  lcd.pushRect(0,0,W,H,buf);
}

type Sprite = { x:number; y:number; w:number; h:number; vx:number; vy:number; color:number };

// nutzt Dirty-Rects: löscht alte Positionen blockweise und zeichnet neue
function animateBouncingSprites(lcd: ST7789, sprites: Sprite[], steps: number, bg: number) {
  const { width:W, height:H } = lcd;

  for (let step=0; step<steps; step++){
    for (const s of sprites) {
      // alten Bereich löschen
      lcd.pushRect(s.x|0, s.y|0, s.w, s.h, bg);

      // Bewegung
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
      if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
      if (s.x + s.w > W) { s.x = W - s.w; s.vx = -Math.abs(s.vx); }
      if (s.y + s.h > H) { s.y = H - s.h; s.vy = -Math.abs(s.vy); }

      // neue Position zeichnen
      lcd.pushRect(s.x|0, s.y|0, s.w, s.h, s.color);
    }
  }
}

/* ---------- Demo-Sequencer ---------- */

class Demo {
  constructor(public lcd: ST7789){}

  async pause(ms:number){ await new Promise(r=>setTimeout(r, ms)); }

  async phaseColorBars(ms=1500){
    drawColorBars(this.lcd);
    await this.pause(ms);
  }
  async phaseChecker(ms=1500){
    drawCheckerboard(this.lcd, 12);
    await this.pause(ms);
  }
  async phaseHueSweep(ms=2000){
    const start = Date.now();
    while (Date.now() - start < ms) {
      const t = (Date.now() - start) / 1000;
      const hue = (t*120) % 360;
      drawHorizontalGradient(this.lcd, hue, 240);
      // kleine Entlastung
      await new Promise(r=>setTimeout(r, 0));
    }
  }
  async phasePlasma(ms=3000){
    const start = Date.now();
    while (Date.now() - start < ms) {
      const t = (Date.now() - start) / 1000;
      drawRainbowPlasma(this.lcd, t);
      await new Promise(r=>setTimeout(r, 0));
    }
  }
  async phaseSprites(ms=3000){
    const { width:W, height:H } = this.lcd;
    const bg = toRGB565(rgba(10,10,16));
    this.lcd.fillScreen(bg);

    const sprites: Sprite[] = [
      { x: 10, y: 20, w: 40, h: 28, vx: 2.1, vy: 1.6, color: toRGB565(rgba(255,80,40)) },
      { x: 50, y: 90, w: 26, h: 26, vx: -1.7, vy: 1.9, color: toRGB565(rgba(40,200,255)) },
      { x: 120, y: 30, w: 18, h: 48, vx: 1.2, vy: -1.4, color: toRGB565(rgba(120,255,80)) },
      { x: W-30, y: H-30, w: 30, h: 30, vx: -1.9, vy: -1.5, color: toRGB565(rgba(255,220,40)) },
    ];
    const start = Date.now();
    while (Date.now() - start < ms) {
      animateBouncingSprites(this.lcd, sprites, 1, bg);
      await new Promise(r=>setTimeout(r, 0));
    }
  }
  async phaseRotate(msPerStep=800){
    // Rotationstest 0→90→180→270
    const rots = [0, 90, 180, 270] as const;
    for (const r of rots) {
      this.lcd.setRotation(r);
      drawColorBars(this.lcd);
      await this.pause(msPerStep);
    }
  }
  async phaseInvert(msPerStep=800){
    // Invert an/aus
    (this.lcd as any).writeCmdByte?.(0x21); // INVON
    drawCheckerboard(this.lcd, 10);
    await this.pause(msPerStep);
    (this.lcd as any).writeCmdByte?.(0x20); // INVOFF
    drawCheckerboard(this.lcd, 10);
    await this.pause(msPerStep);
  }

  async runLoop(){
    // unendliche Schleife aller Phasen
    // (du kannst natürlich kürzen/umordnen)
    // Bonus: FPS-Log während Plasma & Sprites
    // wird implizit durch die Schleifen-Ticks geschätzt
    while (true) {
      await this.phaseColorBars(1200);
      await this.phaseChecker(1200);
      await this.phaseHueSweep(2000);
      await this.phasePlasma(3500);
      await this.phaseSprites(3500);
      await this.phaseRotate(700);
      await this.phaseInvert(700);
    }
  }
}

/* ---------- Direktstart ---------- */

const isDirect = (() => {
  try {
    const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
    return entry && entry.href === import.meta.url;
  } catch { return false; }
})();

if (isDirect) {
  (async () => {
    // Achtung: Wenn du tatsächlich ein 2" Waveshare (ST7789, 240x320) hast:
    // width/height/rotation entsprechend setzen.
    const lcd = new ST7789({
      width: 240,
      height: 320,
      device: "/dev/spidev0.0",
      mode: 0,
      bits: 8,
      speedHz: 16_000_000, // konservativ starten; dann hochtasten
      gpioChip: "gpiochip0",
      dcPin: 25,
      resetPin: 27,
      backlightPin: 18,
      invert: true,
      rotation: 270, // Hochformat
      colOffset: 0,
      rowOffset: 0,
    });

    try {
      lcd.init();
      lcd.setBacklight(true);

      const demo = new Demo(lcd);
      await demo.runLoop();
    } catch (e) {
      console.error("Demo error:", e);
      lcd.dispose();
      process.exit(1);
    }

    process.on("SIGINT", () => {
      console.log("Exiting demo…");
      lcd.dispose();
      process.exit(0);
    });
  })();
}
