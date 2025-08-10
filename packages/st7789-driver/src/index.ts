// src/index.ts
export * from "./st7789.ts";
import { ST7789, toRGB565, rgba } from "./st7789.ts";

/* ---------- Utils ---------- */

const clamp = (v:number, lo:number, hi:number)=>Math.max(lo, Math.min(hi, v));

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

/* ---------- Timing & Stats ---------- */

class Clock {
  last = process.hrtime.bigint();
  tick(): number {
    const now = process.hrtime.bigint();
    const dt = Number(now - this.last) / 1e9; // Sekunden
    this.last = now;
    return Math.min(dt, 0.05); // clamp: max 50 ms (verhindert Sprünge bei Lag)
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

class Stats {
  bytes = 0;
  private last = Date.now();
  private frames = 0;
  addFrame(bytesPushed:number){
    this.bytes += bytesPushed; this.frames++;
    const now = Date.now();
    if (now - this.last >= 1000){
      const mb = (this.bytes / (1024*1024)).toFixed(2);
      console.log(`[SPI] ${mb} MiB/s  | frames ${this.frames}`);
      this.frames = 0; this.bytes = 0; this.last = now;
    }
  }
}

/* ---------- Double Buffer (Back/Front) ---------- */

class DoubleBuffer {
  private bufs: [Uint16Array, Uint16Array];
  private backIndex = 0;
  constructor(public W:number, public H:number){
    const n = W * H;
    this.bufs = [new Uint16Array(n), new Uint16Array(n)];
  }
  flip(){ this.backIndex ^= 1; }
  get back(){ return this.bufs[this.backIndex]; }
  get front(){ return this.bufs[this.backIndex ^ 1]; }
  clearBack(color:number){ this.back.fill(color); }
}

/* ---------- 16-bit Drawing ---------- */

function fillRect16(buf: Uint16Array, W:number, H:number, x:number, y:number, w:number, h:number, color:number) {
  const x0 = clamp(x|0, 0, W), y0 = clamp(y|0, 0, H);
  const x1 = clamp((x+w)|0, 0, W), y1 = clamp((y+h)|0, 0, H);
  if (x1<=x0 || y1<=y0) return;
  const rowSpan = x1 - x0;
  for (let yy=y0; yy<y1; yy++){
    const off = yy*W + x0;
    buf.fill(color, off, off + rowSpan);
  }
}
function fillCircle16(buf: Uint16Array, W:number, H:number, cx:number, cy:number, r:number, color:number) {
  const R = r|0; if (R<=0) return;
  const y0 = clamp((cy-R)|0, 0, H), y1 = clamp((cy+R+1)|0, 0, H);
  for (let y=y0; y<y1; y++){
    const dy = y - cy;
    const dx = Math.floor(Math.sqrt(R*R - dy*dy));
    const x0 = clamp((cx - dx)|0, 0, W);
    const x1 = clamp((cx + dx + 1)|0, 0, W);
    const off = y*W + x0;
    buf.fill(color, off, off + (x1-x0));
  }
}
function fillDiamond16(buf: Uint16Array, W:number, H:number, cx:number, cy:number, r:number, color:number) {
  const R = r|0; if (R<=0) return;
  const y0 = clamp((cy-R)|0, 0, H), y1 = clamp((cy+R+1)|0, 0, H);
  for (let y=y0; y<y1; y++){
    const dy = Math.abs(y - cy);
    const dx = R - dy;
    const x0 = clamp((cx - dx)|0, 0, W);
    const x1 = clamp((cx + dx + 1)|0, 0, W);
    const off = y*W + x0;
    buf.fill(color, off, off + (x1-x0));
  }
}

/* ---------- Dirty-Tiles Renderer ---------- */

class TileRenderer {
  private tilesX: number;
  private tilesY: number;
  private dirty: Uint8Array; // 0/1 pro Tile
  constructor(
    private lcd: ST7789,
    private W: number,
    private H: number,
    private tileW = 16,
    private tileH = 16,
  ) {
    this.tilesX = Math.ceil(W / tileW);
    this.tilesY = Math.ceil(H / tileH);
    this.dirty = new Uint8Array(this.tilesX * this.tilesY);
  }

  markDirtyRect(x:number, y:number, w:number, h:number) {
    const tx0 = Math.max(0, Math.floor(x / this.tileW));
    const ty0 = Math.max(0, Math.floor(y / this.tileH));
    const tx1 = Math.min(this.tilesX-1, Math.floor((x+w) / this.tileW));
    const ty1 = Math.min(this.tilesY-1, Math.floor((y+h) / this.tileH));
    for (let ty=ty0; ty<=ty1; ty++){
      const off = ty * this.tilesX;
      for (let tx=tx0; tx<=tx1; tx++) this.dirty[off + tx] = 1;
    }
  }

  /** push nur die geänderten Tiles der gegebenen Frame-Buffer */
  flush(buf: Uint16Array): number {
    const { tileW, tileH, tilesX, tilesY, W, H } = this;
    let pushedBytes = 0;

    for (let ty=0; ty<tilesY; ty++){
      for (let tx=0; tx<tilesX; tx++){
        const i = ty * tilesX + tx;
        if (!this.dirty[i]) continue;
        this.dirty[i] = 0;

        const x = tx * tileW;
        const y = ty * tileH;
        const w = Math.min(tileW, W - x);
        const h = Math.min(tileH, H - y);

        // tile zeilenweise ohne Kopie senden (pushRect erwartet w*h Uint16Array am Stück)
        // Daher: scratch anlegen und zeilenweise setzen
        const tile = new Uint16Array(w * h);
        for (let yy=0; yy<h; yy++){
          const srcOff = (y + yy) * W + x;
          tile.set(buf.subarray(srcOff, srcOff + w), yy * w);
        }
        this.lcd.pushRect(x, y, w, h, tile);
        pushedBytes += w * h * 2;
      }
    }
    return pushedBytes;
  }
}

/* ---------- Sprite Demo mit Kollisionen ---------- */

type Shape = "rect" | "circle" | "diamond";
type Sprite = {
  shape: Shape;
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; // px/s
  colorIndex: number;
};

function drawSprite(buf: Uint16Array, W:number, H:number, s: Sprite, palette:number[]) {
  const color = palette[s.colorIndex % palette.length];
  if (s.shape === "rect") {
    fillRect16(buf, W, H, s.x, s.y, s.w, s.h, color);
  } else if (s.shape === "circle") {
    const r = Math.min(s.w, s.h) / 2;
    fillCircle16(buf, W, H, s.x + s.w/2, s.y + s.h/2, r, color);
  } else { // diamond
    const r = Math.min(s.w, s.h) / 2;
    fillDiamond16(buf, W, H, s.x + s.w/2, s.y + s.h/2, r, color);
  }
}

function hull(s: Sprite) {
  const r = Math.min(s.w, s.h) / 2;
  return { cx: s.x + s.w/2, cy: s.y + s.h/2, r };
}

function collideWalls(s: Sprite, W:number, H:number, onBounce:()=>void) {
  let bounced = false;
  if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); bounced = true; }
  if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); bounced = true; }
  if (s.x + s.w > W) { s.x = W - s.w; s.vx = -Math.abs(s.vx); bounced = true; }
  if (s.y + s.h > H) { s.y = H - s.h; s.vy = -Math.abs(s.vy); bounced = true; }
  if (bounced) onBounce();
}

/** Sprite-Sprite-Kollision mit Restitution (leicht „bouncy“) */
function collideSprites(a: Sprite, b: Sprite, onBounce:()=>void) {
  const ha = hull(a), hb = hull(b);
  let nx = hb.cx - ha.cx, ny = hb.cy - ha.cy;
  let dist2 = nx*nx + ny*ny;
  const rSum = ha.r + hb.r;
  if (dist2 === 0) { nx = 1; ny = 0; dist2 = 1; }
  const dist = Math.sqrt(dist2);
  if (dist >= rSum) return;

  // Normalisieren
  const inv = 1 / dist;
  const ux = nx * inv, uy = ny * inv;

  // Separieren (damit nichts „klebt“)
  const pen = rSum - dist;
  a.x -= ux * (pen * 0.5);
  a.y -= uy * (pen * 0.5);
  b.x += ux * (pen * 0.5);
  b.y += uy * (pen * 0.5);

  // Geschwindigkeitskomponenten
  const va_n = a.vx * ux + a.vy * uy;
  const vb_n = b.vx * ux + b.vy * uy;
  const va_t_x = a.vx - va_n * ux, va_t_y = a.vy - va_n * uy;
  const vb_t_x = b.vx - vb_n * ux, vb_t_y = b.vy - vb_n * uy;

  const e = 0.98; // Restitution
  a.vx = va_t_x + (vb_n * e) * ux;
  a.vy = va_t_y + (vb_n * e) * uy;
  b.vx = vb_t_x + (va_n * e) * ux;
  b.vy = vb_t_y + (va_n * e) * uy;

  onBounce();
}

/* ---------- CLI Args (optional) ---------- */

function getArg(name:string, def:string){
  const i = process.argv.findIndex(a => a === `--${name}`);
  if (i >= 0 && i+1 < process.argv.length) return process.argv[i+1];
  return def;
}

/* ---------- Hauptprogramm ---------- */

const isDirect = (() => {
  try {
    const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
    return entry && entry.href === import.meta.url;
  } catch { return false; }
})();

if (isDirect) {
  (async () => {
    const speedHz = Number(getArg("speed", "512000000")); // realistische Defaults
    const rotation = Number(getArg("rotation", "0")) as 0|1|2|3;
    const tileSize = Number(getArg("tile", "16"));

    const lcd = new ST7789({
      width: 240,
      height: 320,
      device: "/dev/spidev0.0",
      mode: 0,
      bits: 8,
      speedHz,                 // z. B. --speed 80000000
      gpioChip: "gpiochip0",
      dcPin: 25,
      resetPin: 27,
      backlightPin: 18,
      invert: false,
      rotation,                // z. B. --rotation 1
      colOffset: 0,
      rowOffset: 0,
    });

    let isRunning = true;

    try {
      lcd.init();
      lcd.setBacklight(true);

      const W = lcd.width, H = lcd.height;
      const bg = toRGB565(rgba(0,0,0));

      // 6 knallige Farben (Palette)
      const palette = [0,60,120,180,240,300].map(h => {
        const {r,g,b} = hsvToRgb(h, 1, 1);
        return toRGB565(rgba(r,g,b));
      });

      const dbuf = new DoubleBuffer(W, H);
      const tiles = new TileRenderer(lcd, W, H, tileSize, tileSize);
      const fps = new FpsCounter();
      const stats = new Stats();
      const clock = new Clock();

      // vx/vy hier als px/s (schön unabhängig von FPS)
      const sprites: Sprite[] = [
        { shape: "rect",    x: 10,  y: 20,  w: 40, h: 28, vx: 130,  vy: 100,  colorIndex: 0 },
        { shape: "circle",  x: 80,  y: 60,  w: 32, h: 32, vx: -95,  vy: 120,  colorIndex: 1 },
        { shape: "diamond", x: 40,  y: 120, w: 36, h: 36, vx:  80,  vy: -85,  colorIndex: 2 },
        { shape: "rect",    x: 150, y: 40,  w: 28, h: 44, vx: -125, vy:  70,  colorIndex: 3 },
        { shape: "circle",  x: 110, y: 180, w: 40, h: 40, vx:  105, vy: -110, colorIndex: 4 },
        { shape: "diamond", x: 170, y: 110, w: 30, h: 30, vx: -90,  vy:  90,  colorIndex: 5 },
      ];

      const onBounce = (s: Sprite) => { s.colorIndex = (s.colorIndex + 1) % palette.length; };

      const spriteAABB = (s: Sprite) => ({
        x: Math.floor(s.x),
        y: Math.floor(s.y),
        w: Math.ceil(s.w),
        h: Math.ceil(s.h),
      });

      let frame = 0;

      while (isRunning) {
        const dt = clock.tick(); // Sekunden

        // 1) Alte Bereiche auf Front-Buffer dirty markieren (zum „Überschreiben“)
        //    Da wir volle Back-Buffer neu zeichnen, reicht es, die alten AABBs als dirty zu markieren.
        for (const s of sprites) {
          const r = spriteAABB(s);
          tiles.markDirtyRect(r.x, r.y, r.w, r.h);
        }

        // 2) Bewegung
        for (const s of sprites) {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }

        // 3) Wände
        for (const s of sprites) collideWalls(s, W, H, ()=>onBounce(s));

        // 4) Paarweise Sprite-Kollisionen
        for (let i=0; i<sprites.length; i++){
          for (let j=i+1; j<sprites.length; j++){
            collideSprites(sprites[i], sprites[j], ()=>{
              onBounce(sprites[i]); onBounce(sprites[j]);
            });
          }
        }

        // 5) Back-Buffer vorbereiten und zeichnen
        dbuf.flip();
        dbuf.clearBack(bg);
        for (const s of sprites) {
          drawSprite(dbuf.back, W, H, s, palette);
          const r = spriteAABB(s);
          tiles.markDirtyRect(r.x, r.y, r.w, r.h);
        }

        // 6) Nur geänderte Tiles senden
        const pushed = tiles.flush(dbuf.back);
        stats.addFrame(pushed);
        fps.tick();

        // Nettes Yield alle paar Frames, um IO nicht zu verstopfen (optional)
        if ((frame++ & 0x0F) === 0) await new Promise(r=>setImmediate(r));
      }
    } catch (e) {
      console.error("Demo error:", e);
      lcd.dispose();
      process.exit(1);
    }

    const cleanup = () => {
      isRunning = false;
      try { lcd.setBacklight(false); } catch {}
      lcd.dispose();
      process.exit(0);
    };
    process.on("SIGINT",  cleanup);
    process.on("SIGTERM", cleanup);
  })();
}
