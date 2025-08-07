import { openSync, closeSync, writeSync, readFileSync } from "fs";

export type PixelFormat = "RGB565" | "XRGB8888" | "ARGB8888";

/** Simple named colors (0..255 components). */
export const colors = {
  black:   { r: 0,   g: 0,   b: 0   },
  white:   { r: 255, g: 255, b: 255 },
  red:     { r: 255, g: 0,   b: 0   },
  green:   { r: 0,   g: 255, b: 0   },
  blue:    { r: 0,   g: 0,   b: 255 },
  yellow:  { r: 255, g: 255, b: 0   },
  cyan:    { r: 0,   g: 255, b: 255 },
  magenta: { r: 255, g: 0,   b: 255 },
} as const;

export interface Color { r: number; g: number; b: number; a?: number; }

export interface FramebufferOptions {
  /** Override detected/derived pixel format; default aus depth. */
  format?: PixelFormat;
  /** Bytes pro Zeile; default: width * depth. */
  stride?: number;
}

/**
 * API-nah zu "node-framebuffer": new Framebuffer('/dev/fb0', w, h, depthBytes)
 * - depthBytes: 2 -> RGB565, 4 -> XRGB8888 (oder ARGB via options.format)
 * Methoden: plot(x,y,color), clear(color), fillRect(...), blitRgba8888(...), present(), close()
 */
export class Framebuffer {
  readonly device: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number; // bytes per pixel
  readonly stride: number;
  readonly format: PixelFormat;

  private fd: number = -1;
  private back: Uint8Array;

  constructor(
    device: string,
    width: number,
    height: number,
    depth: number, // bytes per pixel (2 oder 4)
    opts: FramebufferOptions = {},
  ) {
    if (depth !== 2 && depth !== 4) {
      throw new Error(`Unsupported depth=${depth}. Use 2 (RGB565) or 4 (XRGB8888/ARGB8888).`);
    }
    this.device = device;
    this.width = width;
    this.height = height;
    this.depth = depth;

    // Format ableiten/übernehmen
    this.format =
      opts.format ??
      (depth === 2 ? "RGB565" : "XRGB8888");

    // Stride festlegen (bei exotischen Treibern per Option überschreiben)
    this.stride = opts.stride ?? width * depth;

    // /dev/fb0 öffnen und Backbuffer anlegen
    this.fd = openSync(this.device, "r+");
    this.back = new Uint8Array(this.stride * this.height);
  }

  /** Optional: aus /sys/class/graphics/fbX lesen (width,height,bpp). */
  static detect(device: string = "/dev/fb0"): { width: number; height: number; depth: number } {
    const base = "/sys/class/graphics/fb0";
    const vsz = tryRead(`${base}/virtual_size`);
    const bpp = parseInt(tryRead(`${base}/bits_per_pixel`), 10) || 16;
    const [w, h] = vsz
      ? vsz.trim().split(/[, ]+/).map((s) => parseInt(s, 10))
      : [parseInt(process.env.FB_WIDTH || "240", 10), parseInt(process.env.FB_HEIGHT || "320", 10)];
    return { width: w || 240, height: h || 320, depth: Math.ceil(bpp / 8) };
  }

  /** Zeichnet einen Pixel in den Backbuffer. */
  plot(x: number, y: number, c: Color): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const off = y * this.stride + x * this.depth;

    if (this.format === "RGB565") {
      const v = packRGB565(c);
      this.back[off] = v & 0xff;
      this.back[off + 1] = (v >>> 8) & 0xff;
      return;
    }

    if (this.format === "XRGB8888") {
      const v = packXRGB8888(c);
      this.back[off] = v & 0xff;           // B
      this.back[off + 1] = (v >>> 8) & 0xff;  // G
      this.back[off + 2] = (v >>> 16) & 0xff; // R
      this.back[off + 3] = 0x00;              // X
      return;
    }

    // ARGB8888
    const v = packARGB8888(c);
    this.back[off] = v & 0xff;               // B
    this.back[off + 1] = (v >>> 8) & 0xff;   // G
    this.back[off + 2] = (v >>> 16) & 0xff;  // R
    this.back[off + 3] = (v >>> 24) & 0xff;  // A
  }

  clear(color: Color = colors.black): void {
    this.fillRect(0, 0, this.width, this.height, color);
  }

  fillRect(x: number, y: number, w: number, h: number, c: Color): void {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w), y1 = Math.min(this.height, y + h);
    if (x1 <= x0 || y1 <= y0) return;

    if (this.format === "RGB565") {
      const v = packRGB565(c), lo = v & 0xff, hi = (v >>> 8) & 0xff;
      for (let yy = y0; yy < y1; yy++) {
        let off = yy * this.stride + x0 * 2;
        for (let xx = x0; xx < x1; xx++) {
          this.back[off] = lo;
          this.back[off + 1] = hi;
          off += 2;
        }
      }
      return;
    }

    // 32-bit
    const isARGB = this.format === "ARGB8888";
    const v = isARGB ? packARGB8888(c) : packXRGB8888(c);
    const b0 = v & 0xff, b1 = (v >>> 8) & 0xff, b2 = (v >>> 16) & 0xff, b3 = (v >>> 24) & 0xff;
    for (let yy = y0; yy < y1; yy++) {
      let off = yy * this.stride + x0 * 4;
      for (let xx = x0; xx < x1; xx++) {
        this.back[off] = b0; this.back[off + 1] = b1; this.back[off + 2] = b2; this.back[off + 3] = b3;
        off += 4;
      }
    }
  }

  /** RGBA8888-Quellpuffer (w*h*4) in Backbuffer kopieren (Alpha aktuell ignoriert). */
  blitRgba8888(dx: number, dy: number, w: number, h: number, rgba: Uint8Array): void {
    const x0 = Math.max(0, dx), y0 = Math.max(0, dy);
    const x1 = Math.min(this.width, dx + w), y1 = Math.min(this.height, dy + h);
    if (x1 <= x0 || y1 <= y0) return;

    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const sx = xx - dx, sy = yy - dy;
        const si = (sy * w + sx) * 4;
        this.plot(xx, yy, { r: rgba[si], g: rgba[si + 1], b: rgba[si + 2], a: rgba[si + 3] });
      }
    }
  }

  /** Backbuffer → /dev/fb0 */
  present(): void {
    if (this.fd >= 0) writeSync(this.fd, this.back, 0, this.back.length, 0);
  }

  close(): void {
    try { this.present(); } catch {}
    if (this.fd >= 0) closeSync(this.fd);
    this.fd = -1;
  }
}

/* ---------------- helpers ---------------- */

function packRGB565(c: Color): number {
  const r = (c.r & 0xff) >>> 3;
  const g = (c.g & 0xff) >>> 2;
  const b = (c.b & 0xff) >>> 3;
  return (r << 11) | (g << 5) | b;
}
function packXRGB8888(c: Color): number {
  return ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}
function packARGB8888(c: Color): number {
  const a = (c.a ?? 255) & 0xff;
  return (a << 24) | ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}
function tryRead(p: string): string {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}
