// src/framebuffer.ts
// Requires Bun >= 1.1
import { readFileSync, openSync, closeSync } from "fs";
import { mmap, munmap, PROT, MAP } from "bun:ffi";

type PixelFormat = "RGB565" | "XRGB8888" | "ARGB8888";

export interface FramebufferInfo {
  device: string;
  width: number;
  height: number;
  bpp: number;
  stride: number;
  format: PixelFormat;
}

export interface Color { r: number; g: number; b: number; a?: number; }

function readSysfsNumber(path: string): number | null {
  try { return parseInt(readFileSync(path, "utf8").trim(), 10); } catch { return null; }
}
function readSysfsCsv(path: string): [number, number] | null {
  try {
    const txt = readFileSync(path, "utf8").trim();
    const [a, b] = txt.split(/[, ]+/).map((s) => parseInt(s, 10));
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  } catch {}
  return null;
}

function detectFramebufferInfo(dev: string = "/dev/fb0"): FramebufferInfo {
  const base = "/sys/class/graphics/fb0";
  const bpp = readSysfsNumber(`${base}/bits_per_pixel`) ?? 16;
  const vsz = readSysfsCsv(`${base}/virtual_size`);
  const width = vsz?.[0] ? parseInt(process.env.FB_WIDTH ?? "", 10) : 240;
  const height = vsz?.[1] ? parseInt(process.env.FB_HEIGHT ?? "", 10) : 320;

  const bytesPerPixel = Math.ceil(bpp / 8);
  const stride = width * bytesPerPixel;

  let format: PixelFormat;
  if (bpp === 16) format = "RGB565";
  else if (bpp === 32) format = "XRGB8888";
  else format = "RGB565";

  return { device: dev, width, height, bpp, stride, format };
}

function packRGB565(c: Color): number {
  const r = (c.r & 0xff) >>> 3;   // 5 bits
  const g = (c.g & 0xff) >>> 2;   // 6 bits
  const b = (c.b & 0xff) >>> 3;   // 5 bits
  return (r << 11) | (g << 5) | b;
}
function packXRGB8888(c: Color): number {
  return ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}
function packARGB8888(c: Color): number {
  const a = (c.a ?? 255) & 0xff;
  return (a << 24) | ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}

export class Framebuffer {
  readonly info: FramebufferInfo;
  private fbFd = -1;
  private buffer: ArrayBuffer | null = null;
  private viewU8: Uint8Array | null = null;
  private bytesPerPixel: number;

  private constructor(info: FramebufferInfo, fd: number, ab: ArrayBuffer) {
    this.info = info;
    this.fbFd = fd;
    this.buffer = ab;
    this.length = ab.byteLength;
    this.bytesPerPixel = Math.ceil(info.bpp / 8);
    this.viewU8 = new Uint8Array(ab);
  }

  static open(device: string = "/dev/fb0"): Framebuffer {
    const info = detectFramebufferInfo(device);
    const fd = openSync(info.device, "r+"); // O_RDWR
    const length = info.stride * info.height;

    // Bun’s mmap helper returns an ArrayBuffer directly
    const ab = mmap(length, PROT.READ | PROT.WRITE, MAP.SHARED, fd, 0);
    if (!ab || !(ab instanceof ArrayBuffer)) {
      closeSync(fd);
      throw new Error("mmap failed");
    }
    return new Framebuffer(info, fd, ab);
  }

  close(): void {
    if (this.buffer) {
      munmap(this.buffer);
      this.buffer = null;
      this.viewU8 = null;
    }
    if (this.fbFd >= 0) {
      closeSync(this.fbFd);
      this.fbFd = -1;
    }
  }

  clear(color: Color = { r: 0, g: 0, b: 0 }): void {
    if (!this.viewU8) return;
    this.fillRect(0, 0, this.info.width, this.info.height, color);
  }

  putPixel(x: number, y: number, color: Color): void {
    const { width, height, stride } = this.info;
    if (!this.viewU8) return;
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const offset = y * stride + x * this.bytesPerPixel;

    switch (this.info.format) {
      case "RGB565": {
        const v = packRGB565(color);
        this.viewU8[offset] = v & 0xff;
        this.viewU8[offset + 1] = (v >>> 8) & 0xff;
        break;
      }
      case "XRGB8888": {
        const v = packXRGB8888(color);
        this.viewU8[offset] = v & 0xff;
        this.viewU8[offset + 1] = (v >>> 8) & 0xff;
        this.viewU8[offset + 2] = (v >>> 16) & 0xff;
        this.viewU8[offset + 3] = 0x00;
        break;
      }
      case "ARGB8888": {
        const v = packARGB8888(color);
        this.viewU8[offset] = v & 0xff;                 // B
        this.viewU8[offset + 1] = (v >>> 8) & 0xff;     // G
        this.viewU8[offset + 2] = (v >>> 16) & 0xff;    // R
        this.viewU8[offset + 3] = (v >>> 24) & 0xff;    // A
        break;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color): void {
    const { width, height, stride } = this.info;
    if (!this.viewU8) return;
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(width, x + w), y1 = Math.min(height, y + h);
    if (x1 <= x0 || y1 <= y0) return;

    if (this.info.format === "RGB565") {
      const v = packRGB565(color);
      const lo = v & 0xff, hi = (v >>> 8) & 0xff;
      for (let yy = y0; yy < y1; yy++) {
        let off = yy * stride + x0 * 2;
        for (let xx = x0; xx < x1; xx++) {
          this.viewU8![off] = lo;
          this.viewU8![off + 1] = hi;
          off += 2;
        }
      }
      return;
    }

    const isARGB = this.info.format === "ARGB8888";
    const packed = isARGB ? packARGB8888(color) : packXRGB8888(color);
    const b0 = packed & 0xff, b1 = (packed >>> 8) & 0xff, b2 = (packed >>> 16) & 0xff, b3 = (packed >>> 24) & 0xff;

    for (let yy = y0; yy < y1; yy++) {
      let off = yy * stride + x0 * 4;
      for (let xx = x0; xx < x1; xx++) {
        this.viewU8![off] = b0;
        this.viewU8![off + 1] = b1;
        this.viewU8![off + 2] = b2;
        this.viewU8![off + 3] = b3;
        off += 4;
      }
    }
  }

  blitRgba8888(dx: number, dy: number, w: number, h: number, rgba: Uint8Array): void {
    const { width, height } = this.info;
    if (!this.viewU8) return;
    if (w <= 0 || h <= 0) return;
    const x0 = Math.max(0, dx), y0 = Math.max(0, dy);
    const x1 = Math.min(width, dx + w), y1 = Math.min(height, dy + h);
    if (x1 <= x0 || y1 <= y0) return;

    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const sx = xx - dx, sy = yy - dy;
        const si = (sy * w + sx) * 4;
        const r = rgba[si], g = rgba[si + 1], b = rgba[si + 2], a = rgba[si + 3];
        this.putPixel(xx, yy, { r, g, b, a });
      }
    }
  }

  present(): void {}
}

if (import.meta.main) {
  const fb = Framebuffer.open("/dev/fb0");
  console.log("FB:", fb.info);
  fb.clear({ r: 20, g: 20, b: 20 });
  for (let y = 0; y < fb.info.height; y++) {
    for (let x = 0; x < fb.info.width; x++) {
      fb.putPixel(x, y, {
        r: Math.floor((x / fb.info.width) * 255),
        g: Math.floor((y / fb.info.height) * 255),
        b: 128,
      });
    }
  }
  fb.fillRect(10, 10, 80, 40, { r: 255, g: 80, b: 0 });
  fb.present();
  setTimeout(() => fb.close(), 500);
}
