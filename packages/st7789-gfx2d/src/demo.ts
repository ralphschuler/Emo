import { type ST7789, toRGB565, rgba } from "st7789-driver";
import { Gfx2D } from "./gfx2d.ts";
import { rgb } from "st7789-color";
import { DoubleBuffer, TileRenderer } from "./tiles.ts";


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

type Shape = "rect" | "circle" | "diamond";
type Sprite = {
  shape: Shape;
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  colorIndex: number;
};

function drawSprite(g: Gfx2D, s: Sprite, palette:number[]) {
  const color = palette[s.colorIndex % palette.length];
  if (s.shape === "rect") {
    g.fillRect(s.x, s.y, s.w, s.h, color);
  } else if (s.shape === "circle") {
    const r = Math.min(s.w, s.h) / 2;
    g.fillCircle((s.x + s.w/2)|0, (s.y + s.h/2)|0, r, color);
  } else {
    const cx = s.x + s.w/2, cy = s.y + s.h/2, r = Math.min(s.w,s.h)/2;
    g.fillPolygon([
      {x: cx, y: cy - r},
      {x: cx + r, y: cy},
      {x: cx, y: cy + r},
      {x: cx - r, y: cy},
    ], color);
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
function collideSprites(a: Sprite, b: Sprite, onBounce:()=>void) {
  const ha = hull(a), hb = hull(b);
  let nx = hb.cx - ha.cx, ny = hb.cy - ha.cy;
  let dist2 = nx*nx + ny*ny;
  const rSum = ha.r + hb.r;
  if (dist2 === 0) { nx = 1; ny = 0; dist2 = 1; }
  const dist = Math.sqrt(dist2);
  if (dist >= rSum) return;

  const inv = 1 / dist;
  const ux = nx * inv, uy = ny * inv;

  const pen = rSum - dist;
  a.x -= ux * (pen * 0.5);
  a.y -= uy * (pen * 0.5);
  b.x += ux * (pen * 0.5);
  b.y += uy * (pen * 0.5);

  const va_n = a.vx * ux + a.vy * uy;
  const vb_n = b.vx * ux + b.vy * uy;
  const va_t_x = a.vx - va_n * ux, va_t_y = a.vy - va_n * uy;
  const vb_t_x = b.vx - vb_n * ux, vb_t_y = b.vy - vb_n * uy;

  const e = 0.98;
  a.vx = va_t_x + (vb_n * e) * ux;
  a.vy = va_t_y + (vb_n * e) * uy;
  b.vx = vb_t_x + (va_n * e) * ux;
  b.vy = vb_t_y + (va_n * e) * uy;

  onBounce();
}

export async function runDemo(lcd: ST7789, tileSize=16) {
  lcd.init();
  lcd.setBacklight(true);

  const W = lcd.width, H = lcd.height;
  const bg = toRGB565(rgba(0,0,0));
  const palette = [0,60,120,180,240,300].map(h => {
    const {r,g,b} = hsvToRgb(h, 1, 1);
    return toRGB565(rgba(r,g,b));
  });

  const dbuf = new DoubleBuffer(W, H);
  const gfx = new Gfx2D({ width: W, height: H, buf: dbuf.back });
  const tiles = new TileRenderer(lcd, W, H, tileSize, tileSize);
  const fps = new FpsCounter();
  const stats = new Stats();
  const clock = new Clock();

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
  let isRunning = true;

  while (isRunning) {
    const dt = clock.tick();

    for (const s of sprites) {
      const r = spriteAABB(s);
      tiles.markDirtyRect(r.x, r.y, r.w, r.h);
    }

    for (const s of sprites) { s.x += s.vx * dt; s.y += s.vy * dt; }
    for (const s of sprites) collideWalls(s, W, H, ()=>onBounce(s));
    for (let i=0; i<sprites.length; i++){
      for (let j=i+1; j<sprites.length; j++){
        collideSprites(sprites[i], sprites[j], ()=>{
          onBounce(sprites[i]); onBounce(sprites[j]);
        });
      }
    }

    dbuf.flip();
    gfx.target.buf = dbuf.back;
    gfx.clear(bg);

    gfx.fillRectGradient(0,0,W,24, rgb(10,10,30), rgb(0,120,255), true);
    gfx.text(4, 8, "gfx2d demo", toRGB565(rgba(255,255,255)), 1);

    for (const s of sprites) {
      drawSprite(gfx, s, palette);
      const r = spriteAABB(s);
      tiles.markDirtyRect(r.x, r.y, r.w, r.h);
    }
    gfx.line(0, H-1, W-1, H-1, toRGB565(rgba(50,50,50)));

    const pushed = tiles.flush(dbuf.back);
    stats.addFrame(pushed);
    fps.tick();

    if ((frame++ & 0x0F) === 0) await new Promise(r=>setImmediate(r));
  }
}
