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

/* ---------- FPS & Double Buffer ---------- */

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
class DoubleBuffer {
  private bufs: [Uint16Array, Uint16Array];
  private front = 0;
  constructor(private lcd: ST7789){
    const n = lcd.width * lcd.height;
    this.bufs = [new Uint16Array(n), new Uint16Array(n)];
  }
  get draw(){ return this.bufs[this.front]; }
  clear(color:number){ this.bufs[this.front].fill(color); }
  present(){
    const b = this.bufs[this.front];
    this.lcd.pushRect(0,0,this.lcd.width,this.lcd.height,b);
    this.front ^= 1;
  }
}

/* ---------- 16-bit Drawing ---------- */

function fillRect16(buf: Uint16Array, W:number, H:number, x:number, y:number, w:number, h:number, color:number) {
  const x0 = clamp(x|0, 0, W), y0 = clamp(y|0, 0, H);
  const x1 = clamp((x+w)|0, 0, W), y1 = clamp((y+h)|0, 0, H);
  if (x1<=x0 || y1<=y0) return;
  for (let yy=y0; yy<y1; yy++){
    const off = yy*W + x0;
    buf.fill(color, off, off + (x1-x0));
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

/* ---------- Sprite Demo mit Kollisionen ---------- */

type Shape = "rect" | "circle" | "diamond";
type Sprite = {
  shape: Shape;
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
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

/** Kreishülle (Center + Radius) – schnell & ausreichend für bunte Bumper-Cars */
function hull(s: Sprite) {
  const r = Math.min(s.w, s.h) / 2;
  return { cx: s.x + s.w/2, cy: s.y + s.h/2, r };
}

/** Wand-Kollision (mit Farbwechsel) */
function collideWalls(s: Sprite, W:number, H:number, onBounce:()=>void) {
  let bounced = false;
  if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); bounced = true; }
  if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); bounced = true; }
  if (s.x + s.w > W) { s.x = W - s.w; s.vx = -Math.abs(s.vx); bounced = true; }
  if (s.y + s.h > H) { s.y = H - s.h; s.vy = -Math.abs(s.vy); bounced = true; }
  if (bounced) onBounce();
}

/** Sprite-Sprite-Kollision (elastisch, gleiche Masse) mit Entzerrung & Farbwechsel */
function collideSprites(a: Sprite, b: Sprite, onBounce:()=>void) {
  const ha = hull(a), hb = hull(b);
  let nx = hb.cx - ha.cx;
  let ny = hb.cy - ha.cy;
  const dist2 = nx*nx + ny*ny;
  const r = ha.r + hb.r;

  if (dist2 === 0) {
    // Perfekte Überlappung – leicht auseinander schieben
    nx = 1; ny = 0;
  }
  const dist = Math.sqrt(dist2 || 1);

  if (dist < r) {
    // Penetration auflösen (je zur Hälfte entlang der Normalen)
    const pen = r - dist;
    const invDist = 1 / (dist || 1);
    const ux = nx * invDist, uy = ny * invDist;

    a.x -= ux * (pen * 0.5);
    a.y -= uy * (pen * 0.5);
    b.x += ux * (pen * 0.5);
    b.y += uy * (pen * 0.5);

    // Geschwindigkeiten entlang der Kollisionsnormalen tauschen (equal mass, elastisch)
    const va_n = a.vx * ux + a.vy * uy;
    const vb_n = b.vx * ux + b.vy * uy;

    const va_t_x = a.vx - va_n * ux;
    const va_t_y = a.vy - va_n * uy;
    const vb_t_x = b.vx - vb_n * ux;
    const vb_t_y = b.vy - vb_n * uy;

    // swap normal components
    a.vx = va_t_x + vb_n * ux;
    a.vy = va_t_y + vb_n * uy;
    b.vx = vb_t_x + va_n * ux;
    b.vy = vb_t_y + va_n * uy;

    onBounce();
  }
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
    const lcd = new ST7789({
      width: 240,
      height: 320,
      device: "/dev/spidev0.0",
      mode: 0,
      bits: 8,
      speedHz: 24_000_000,
      gpioChip: "gpiochip0",
      dcPin: 25,
      resetPin: 27,
      backlightPin: 18,
      invert: false,
      rotation: 0,
      colOffset: 0,
      rowOffset: 0,
    });

    try {
      lcd.init();
      lcd.setBacklight(true);

      const W = lcd.width, H = lcd.height;
      const bg = toRGB565(rgba(0,0,0));

      // 6 knallige Farben
      const palette = [0,60,120,180,240,300].map(h => {
        const {r,g,b} = hsvToRgb(h, 1, 1);
        return toRGB565(rgba(r,g,b));
      });

      const dbuf = new DoubleBuffer(lcd);
      const fps = new FpsCounter();

      const sprites: Sprite[] = [
        { shape: "rect",    x: 10,  y: 20,  w: 40, h: 28, vx:  2.2, vy:  1.7, colorIndex: 0 },
        { shape: "circle",  x: 80,  y: 60,  w: 32, h: 32, vx: -1.6, vy:  2.0, colorIndex: 1 },
        { shape: "diamond", x: 40,  y: 120, w: 36, h: 36, vx:  1.3, vy: -1.4, colorIndex: 2 },
        { shape: "rect",    x: 150, y: 40,  w: 28, h: 44, vx: -2.1, vy:  1.2, colorIndex: 3 },
        { shape: "circle",  x: 110, y: 180, w: 40, h: 40, vx:  1.8, vy: -1.9, colorIndex: 4 },
        { shape: "diamond", x: 170, y: 110, w: 30, h: 30, vx: -1.5, vy:  1.5, colorIndex: 5 },
      ];

      const onBounce = (s: Sprite) => { s.colorIndex = (s.colorIndex + 1) % palette.length; };

      while (true) {
        // 1) Bewegung
        for (const s of sprites) {
          s.x += s.vx; s.y += s.vy;
        }

        // 2) Wände
        for (const s of sprites) {
          collideWalls(s, W, H, () => onBounce(s));
        }

        // 3) Paarweise Sprite-Kollisionen
        for (let i=0; i<sprites.length; i++){
          for (let j=i+1; j<sprites.length; j++){
            const si = sprites[i], sj = sprites[j];
            let collided = false;
            const beforeVi = { x: si.vx, y: si.vy };
            const beforeVj = { x: sj.vx, y: sj.vy };

            collideSprites(si, sj, () => { collided = true; });

            if (collided) {
              // Bei Kollision beide färben (aber nur wenn sich tatsächlich was geändert hat)
              if (si.vx !== beforeVi.x || si.vy !== beforeVi.y) onBounce(si);
              if (sj.vx !== beforeVj.x || sj.vy !== beforeVj.y) onBounce(sj);
            }
          }
        }

        // 4) Rendern
        dbuf.clear(bg);
        for (const s of sprites) {
          drawSprite(dbuf.draw, W, H, s, palette);
        }
        dbuf.present();
        fps.tick();

        await new Promise(r=>setTimeout(r, 0));
      }
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
