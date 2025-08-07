// Bun >= 1.1.x
// Usage (Bun):
//   bun add -d typescript
//   ts-node/bun run: import and call Framebuffer.open();
// Or build a small demo below.

// Minimal-FB-Lib – mmap, RGB565 + XRGB8888/ARGB8888 Support
import { dlopen, FFIType } from "bun:ffi";
import { readFileSync, openSync, closeSync } from "fs";

type PixelFormat = "RGB565" | "XRGB8888" | "ARGB8888";

export interface FramebufferInfo {
  device: string;        // e.g. "/dev/fb0"
  width: number;
  height: number;
  bpp: number;           // bits per pixel
  stride: number;        // bytes per line
  format: PixelFormat;
}

export interface Color {
  r: number; g: number; b: number; a?: number; // 0..255
}

const libc = dlopen(null, {
  mmap: {
    args: [FFIType.ptr, FFIType.usize, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i64],
    returns: FFIType.ptr,
  },
  munmap: {
    args: [FFIType.ptr, FFIType.usize],
    returns: FFIType.i32,
  },
});

const PROT_READ = 0x1;
const PROT_WRITE = 0x2;
const MAP_SHARED = 0x01;

// --- Utils -----------------------------------------------------------------

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
  // Try sysfs first
  const base = "/sys/class/graphics/fb0";
  const bpp = readSysfsNumber(`${base}/bits_per_pixel`) ?? 16;
  const vsz = readSysfsCsv(`${base}/virtual_size`) || readSysfsCsv(`${base}/virtual_size`) /*just once*/;
  // Fallback width/height if sysfs doesn’t expose
  let width = 0, height = 0;
  if (vsz) { width = vsz[0]; height = vsz[1]; }

  // If width/height missing, allow environment overrides
  width ||= parseInt(process.env.FB_WIDTH ?? "", 10) || 240;
  height ||= parseInt(process.env.FB_HEIGHT ?? "", 10) || 320;

  const bytesPerPixel = Math.ceil(bpp / 8);
  // Heuristik: stride = width * bytesPerPixel (bei SPI/fbtft meist korrekt)
  const stride = width * bytesPerPixel;

  // Format aus bpp herleiten
  let format: PixelFormat;
  if (bpp === 16) format = "RGB565";
  else if (bpp === 32) format = "XRGB8888"; // viele Treiber ignorieren Alpha
  else format = "RGB565"; // conservative default

  return { device: dev, width, height, bpp, stride, format };
}

function packRGB565(c: Color): number {
  const r = (c.r & 0xff) >>> 3;   // 5 bits
  const g = (c.g & 0xff) >>> 2;   // 6 bits
  const b = (c.b & 0xff) >>> 3;   // 5 bits
  return (r << 11) | (g << 5) | b; // 16-bit
}

function packXRGB8888(c: Color): number {
  // XRGB: top 8 bits ignored/unused; write as 0x00RRGGBB
  return ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}

function packARGB8888(c: Color): number {
  const a = (c.a ?? 255) & 0xff;
  return (a << 24) | ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}

// --- Framebuffer -----------------------------------------------------------

export class Framebuffer {
  readonly info: FramebufferInfo;
  private fbFd: number = -1;
  private mapPtr: Pointer | null = null;
  private length: number = 0;
  private viewU8: Uint8Array | null = null;
  private bytesPerPixel: number;

  private constructor(info: FramebufferInfo, fd: number, ptr: Pointer, length: number) {
    this.info = info;
    this.fbFd = fd;
    this.mapPtr = ptr;
    this.length = length;
    this.bytesPerPixel = Math.ceil(info.bpp / 8);
    this.viewU8 = new Uint8Array(Bun.read(ptr, length).buffer); // maps memory region
  }

  static open(device: string = "/dev/fb0"): Framebuffer {
    const info = detectFramebufferInfo(device);
    const fd = openSync(info.device, "r+"); // O_RDWR
    const length = info.stride * info.height;

    // void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset)
    const addr = 0n;
    const ptr = libc.symbols.mmap(ptrFromBigInt(addr), BigInt(length), PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0n);
    if (!ptr || Number(ptr) === 0) {
      closeSync(fd);
      throw new Error("mmap failed");
    }
    return new Framebuffer(info, fd, ptr, length);
  }

  close(): void {
    if (this.mapPtr) {
      libc.symbols.munmap(this.mapPtr, BigInt(this.length));
      this.mapPtr = null;
      this.viewU8 = null;
    }
    if (this.fbFd >= 0) {
      closeSync(this.fbFd);
      this.fbFd = -1;
    }
  }

  clear(color: Color = { r: 0, g: 0, b: 0 }): void {
    if (!this.viewU8) return;
    const { width, height } = this.info;
    this.fillRect(0, 0, width, height, color);
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
        this.viewU8[offset + 3] = 0x00; // X
        break;
      }
      case "ARGB8888": {
        const v = packARGB8888(color);
        this.viewU8[offset] = v & 0xff;              // B
        this.viewU8[offset + 1] = (v >>> 8) & 0xff;  // G
        this.viewU8[offset + 2] = (v >>> 16) & 0xff; // R
        this.viewU8[offset + 3] = (v >>> 24) & 0xff; // A
        break;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color): void {
    const { width, height, stride } = this.info;
    if (!this.viewU8) return;
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(width, x + w);
    const y1 = Math.min(height, y + h);
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

    // 32-bit fast path
    const isARGB = this.info.format === "ARGB8888";
    const packed = isARGB ? packARGB8888(color) : packXRGB8888(color);
    const b0 = packed & 0xff;
    const b1 = (packed >>> 8) & 0xff;
    const b2 = (packed >>> 16) & 0xff;
    const b3 = (packed >>> 24) & 0xff;

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

  /**
   * Blit in-memory RGBA8888 (Uint8Array length = w*h*4) to FB at (dx,dy).
   * Alpha wird aktuell ignoriert (Over-Write).
   */
  blitRgba8888(dx: number, dy: number, w: number, h: number, rgba: Uint8Array): void {
    const { width, height, stride } = this.info;
    if (!this.viewU8) return;
    if (w <= 0 || h <= 0) return;
    const x0 = Math.max(0, dx);
    const y0 = Math.max(0, dy);
    const x1 = Math.min(width, dx + w);
    const y1 = Math.min(height, dy + h);
    if (x1 <= x0 || y1 <= y0) return;

    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const sx = xx - dx;
        const sy = yy - dy;
        const si = (sy * w + sx) * 4;
        const r = rgba[si], g = rgba[si + 1], b = rgba[si + 2], a = rgba[si + 3];

        this.putPixel(xx, yy, { r, g, b, a });
      }
    }
  }

  // Für spätere Double-Buffer-Strategien reserviert
  present(): void {}
}

// --- tiny demo -------------------------------------------------------------
if (import.meta.main) {
  const fb = Framebuffer.open("/dev/fb0");
  console.log("FB:", fb.info);

  // Hintergrund füllen (dunkelgrau)
  fb.clear({ r: 20, g: 20, b: 20 });

  // Farbverlauf
  for (let y = 0; y < fb.info.height; y++) {
    for (let x = 0; x < fb.info.width; x++) {
      fb.putPixel(x, y, {
        r: Math.floor((x / fb.info.width) * 255),
        g: Math.floor((y / fb.info.height) * 255),
        b: 128,
      });
    }
  }

  // Rechteck
  fb.fillRect(10, 10, 80, 40, { r: 255, g: 80, b: 0 });

  // Fertig
  fb.present();
  // Nicht sofort schließen, damit man was sieht. In echten Apps offen lassen.
  setTimeout(() => fb.close(), 500);
}

// helpers
type Pointer = number; // Bun represents pointers as numbers (usize)
function ptrFromBigInt(n: bigint): Pointer {
  return Number(n);
}
