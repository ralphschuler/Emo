// src/index.ts
export * from "./st7789.js";

import { ST7789, toRGB565, rgba } from "./st7789.js";

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

/* ---------- FPS & Double Buffer ---------- */

class FpsCounter {
  private last = Date.now();
  private frames = 0;
  private avg = 0;

  tick() {
    this.frames++;
    const now = Date.now();
    if (now - this.last >= 1000) {
      const fps = this.frames;
      // einfache gleitende Mittelung
      this.avg = this.avg === 0 ? fps : Math.round(this.avg*0.6 + fps*0.4);
      console.log(`[FPS] ${fps} (avg ${this.avg})`);
      this.frames = 0;
      this.last = now;
    }
  }
}

class DoubleBuffer {
  private buffers: [Uint16Array, Uint16Array];
  private front = 0;
  constructor(private lcd: ST7789) {
    const n = lcd.width * lcd.height;
    this.buffers = [new Uint16Array(n), new Uint16Array(n)];
  }
  /** Buffer zum Zeichnen (Backbuffer) */
  get draw(): Uint16Array { return this.buffers[this.front]; }
  /** Buffer leeren */
  clear(color: number) { this.buffers[this.front].fill(color); }
  /** Auf Display schieben und Buffer tauschen */
  present() {
    const b = this.buffers[this.front];
    this.lcd.pushRect(0, 0, this.lcd.width, this.lcd.height, b);
    this.front ^= 1;
  }
}

/* ---------- Buffer-Zeichenroutinen (16-bit RGB565) ---------- */

function fillRect16(buf: Uint16Array, W:number, H:number, x:number, y:number, w:number, h:number, color:number) {
  const x0 = clamp(x|0, 0, W), y0 = clamp(y|0, 0, H);
  const x1 = clamp((x+w)|0, 0, W), y1 = clamp((y+h)|0, 0, H);
  if (x1<=x0 || y1<=y0) return;
  for (let yy=y0; yy<y1; yy++) {
    const off = yy*W + x0;
    buf.fill(color, off, off + (x1-x0));
  }
}

function drawColorBarsTo(buf: Uint16Array, W:number, H:number) {
  const bars = [
    rgba(255,0,0), rgba(0,255,0), rgba(0,0,255),
    rgba(255,255,0), rgba(0,255,255), rgba(255,0,255),
    rgba(255,255,255), rgba(0,0,0),
  ].map(toRGB565);
  const bh = Math.floor(H / bars.length);
  for (let i=0;i<bars.length;i++){
    const y = i*bh;
    const hh = (i===bars.length-1? H-y: bh);
    fillRect16(buf, W, H, 0, y, W, hh, bars[i]);
  }
}

function drawCheckerboardTo(buf: Uint16Array, W:number, H:number, tile=12) {
  const a = toRGB565(rgba(220,220,220));
  const b = toRGB565(rgba(40,40,40));
  for (let y=0; y<H; y+=tile) {
    for (let x=0; x<W; x+=tile) {
      const on = (((x/tile)|0) ^ ((y/tile)|0)) & 1;
      fillRect16(buf, W, H, x, y, Math.min(tile, W-x), Math.min(tile, H-y), on? a : b);
    }
  }
}

function drawHorizontalGradientTo(buf: Uint16Array, W:number, H:number, hueStart=0, hueSpan=360) {
  const row = new Uint16Array(W);
  for (let x=0; x<W; x++){
    const h = (hueStart + (x/W)*hueSpan) % 360;
    const {r,g,b} = hsvToRgb(h, 1, 1);
    row[x] = toRGB565(rgba(r,g,b));
  }
  for (let y=0; y<H; y++){
    buf.set(row, y*W);
  }
}

function drawRainbowPlasmaTo(buf: Uint16Array, W:number, H:number, t:number) {
  let idx = 0;
  for (let y=0; y<H; y++){
    for (let x=0; x<W; x++){
      const v =
        Math.sin((x + t*40) * 0.05) +
        Math.sin((y + t*25) * 0.07) +
        Math.sin(((x+y) + t*30) * 0.04);
      const n = (v + 3) / 6;
      const h = (n*360) % 360;
      const {r,g,b} = hsvToRgb(h, 0.9, 0.9);
      buf[idx++] = toRGB565(rgba(r,g,b));
    }
  }
}

type Sprite = { x:number; y:number; w:number; h:number; vx:number; vy:number; color:number };

function drawSpritesTo(buf: Uint16Array, W:number, H:number, sprites: Sprite[], bg:number) {
  // Hintergrund einmal füllen und alle Sprites als solide Rechtecke zeichnen
  buf.fill(bg);
  for (const s of sprites) {
    fillRect16(buf, W, H, s.x|0, s.y|0, s.w|0, s.h|0, s.color);
  }
}

/* ---------- Demo-Sequencer (mit Double-Buffer & FPS) ---------- */

class Demo {
  private dbuf: DoubleBuffer;
  private fps = new FpsCounter();

  constructor(public lcd: ST7789){
    this.dbuf = new DoubleBuffer(lcd);
  }

  async pause(ms:number){ await new Promise(r=>setTimeout(r, ms)); }

  async phaseColorBars(ms=1500){
    const { width:W, height:H } = this.lcd;
    this.dbuf.clear(0);
    drawColorBarsTo(this.dbuf.draw, W, H);
    this.dbuf.present();
    await this.pause(ms);
  }

  async phaseChecker(ms=1500){
    const { width:W, height:H } = this.lcd;
    this.dbuf.clear(0);
    drawCheckerboardTo(this.dbuf.draw, W, H, 12);
    this.dbuf.present();
    await this.pause(ms);
  }

  async phaseHueSweep(ms=2000){
    const { width:W, height:H } = this.lcd;
    const start = Date.now();
    while (Date.now() - start < ms) {
      const t = (Date.now() - start) / 1000;
      const hue = (t*120) % 360;
      drawHorizontalGradientTo(this.dbuf.draw, W, H, hue, 240);
      this.dbuf.present();
      this.fps.tick();
      // kurze Luft holen
      await new Promise(r=>setTimeout(r, 0));
    }
  }

  async phasePlasma(ms=3000){
    const { width:W, height:H } = this.lcd;
    const start = Date.now();
    while (Date.now() - start < ms) {
      const t = (Date.now() - start) / 1000;
      drawRainbowPlasmaTo(this.dbuf.draw, W, H, t);
      this.dbuf.present();
      this.fps.tick();
      await new Promise(r=>setTimeout(r, 0));
    }
  }

  async phaseSprites(ms=3000){
    const { width:W, height:H } = this.lcd;
    const bg = toRGB565(rgba(10,10,16));

    const sprites: Sprite[] = [
      { x: 10, y: 20, w: 40, h: 28, vx: 2.1, vy: 1.6, color: toRGB565(rgba(255,80,40)) },
      { x: 50, y: 90, w: 26, h: 26, vx: -1.7, vy: 1.9, color: toRGB565(rgba(40,200,255)) },
      { x: 120, y: 30, w: 18, h: 48, vx: 1.2, vy: -1.4, color: toRGB565(rgba(120,255,80)) },
      { x: W-30, y: H-30, w: 30, h: 30, vx: -1.9, vy: -1.5, color: toRGB565(rgba(255,220,40)) },
    ];

    const start = Date.now();
    while (Date.now() - start < ms) {
      // Physik
      for (const s of sprites) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
        if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
        if (s.x + s.w > W) { s.x = W - s.w; s.vx = -Math.abs(s.vx); }
        if (s.y + s.h > H) { s.y = H - s.h; s.vy = -Math.abs(s.vy); }
      }
      // Zeichnen ins Backbuffer + Present
      drawSpritesTo(this.dbuf.draw, W, H, sprites, bg);
      this.dbuf.present();
      this.fps.tick();
      await new Promise(r=>setTimeout(r, 0));
    }
  }

  async phaseRotate(msPerStep=800){
    // Rotationstest 0→90→180→270 (einmal rendern, dann präsentieren)
    const rots = [0, 90, 180, 270] as const;
    for (const r of rots) {
      this.lcd.setRotation(r);
      drawColorBarsTo(this.dbuf.draw, this.lcd.width, this.lcd.height);
      this.dbuf.present();
      await this.pause(msPerStep);
    }
  }

  async phaseInvert(msPerStep=800){
    (this.lcd as any).writeCmdByte?.(0x21); // INVON
    drawCheckerboardTo(this.dbuf.draw, this.lcd.width, this.lcd.height, 10);
    this.dbuf.present();
    await this.pause(msPerStep);

    (this.lcd as any).writeCmdByte?.(0x20); // INVOFF
    drawCheckerboardTo(this.dbuf.draw, this.lcd.width, this.lcd.height, 10);
    this.dbuf.present();
    await this.pause(msPerStep);
  }

  async runLoop(){
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
