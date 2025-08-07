// src/framebuffer.ts
import { dlopen } from "bun:ffi";
import { ptr, CString, toArrayBuffer } from "bun:ffi";
import { readFileSync } from "node:fs";

// ---- FFI libc ----
const libc = dlopen(null, {
  open:   { args: ["cstring", "i32"], returns: "i32" },                 // int open(const char*, int)
  close:  { args: ["i32"], returns: "i32" },                            // int close(int)
  ioctl:  { args: ["i32", "u64", "ptr"], returns: "i32" },              // int ioctl(int, unsigned long, void*)
  mmap:   { args: ["ptr", "usize", "i32", "i32", "i32", "i64"], returns: "ptr" }, // void* mmap(void*,size_t,int,int,int,off_t)
  munmap: { args: ["ptr", "usize"], returns: "i32" },                   // int munmap(void*, size_t)
});

// ---- Linux flags & consts ----
const O_RDWR = 0x0002;
const PROT_READ = 0x1;
const PROT_WRITE = 0x2;
const MAP_SHARED = 0x01;

// fbdev ioctls (für spätere, genauere Abfrage – derzeit optional)
const FBIOGET_VSCREENINFO = 0x4600n; // unsigned long
const FBIOGET_FSCREENINFO = 0x4602n;

// ---- Types ----
export interface FramebufferInfo {
  xres: number;
  yres: number;
  bitsPerPixel: number;
  lineLength: number; // stride (Bytes pro Zeile)
}

export type RGB = { r: number; g: number; b: number };

// ---- Helpers: sysfs -> Auflösung & bpp & stride ----
// /sys/class/graphics/fb0/virtual_size   => "WIDTH,HEIGHT\n"
function readVirtualSize(device = "fb0") {
  const s = readFileSync(`/sys/class/graphics/${device}/virtual_size`, "utf8").trim();
  const [wStr, hStr] = s.split(",");
  return { xres: parseInt(wStr, 10), yres: parseInt(hStr, 10) };
}

// /sys/class/graphics/fb0/bits_per_pixel => "32\n"
function readBpp(device = "fb0") {
  const s = readFileSync(`/sys/class/graphics/${device}/bits_per_pixel`, "utf8").trim();
  return parseInt(s, 10);
}

// Manche Systeme haben stride/line_length nicht im sysfs. Dann: stride = xres * (bpp/8)
function computeStride(xres: number, bpp: number) {
  return Math.ceil((xres * bpp) / 8);
}

// ---- Pixelpacker ----
function packRGB565(r: number, g: number, b: number): number {
  const R = (r * 31 + 127) / 255 | 0;
  const G = (g * 63 + 127) / 255 | 0;
  const B = (b * 31 + 127) / 255 | 0;
  return ((R & 0x1f) << 11) | ((G & 0x3f) << 5) | (B & 0x1f);
}

function packXRGB8888(r: number, g: number, b: number): number {
  // little-endian Layout im Speicher: B,G,R,X
  return (0xff << 24) | (r << 16) | (g << 8) | b;
}

// ---- Framebuffer Class ----
export class Framebuffer {
  #fd = -1;
  #mapPtr: number = 0;
  #buf: ArrayBuffer | null = null;
  #info: FramebufferInfo;

  constructor(private devicePath = "/dev/fb0") {
    // Basisinfos robust aus sysfs (funktioniert ohne ioctl-Struct-Magie)
    const devName = this.devicePath.split("/").pop() || "fb0";
    const { xres, yres } = readVirtualSize(devName);
    const bitsPerPixel = readBpp(devName);
    const lineLength = computeStride(xres, bitsPerPixel);

    this.#info = { xres, yres, bitsPerPixel, lineLength };

    // Open
    this.#fd = libc.symbols.open(new CString(this.devicePath), O_RDWR);
    if (this.#fd < 0) {
      throw new Error(`open(${this.devicePath}) failed`);
    }

    // mmap
    const size = BigInt(lineLength) * BigInt(yres);
    const p = libc.symbols.mmap(
      0,                      // addr hint
      Number(size),           // length
      PROT_READ | PROT_WRITE, // prot
      MAP_SHARED,             // flags
      this.#fd,               // fd
      0                       // offset
    );
    if (Number(p) === -1 || Number(p) === 0) {
      libc.symbols.close(this.#fd);
      this.#fd = -1;
      throw new Error("mmap failed");
    }
    this.#mapPtr = Number(p);
    this.#buf = toArrayBuffer(this.#mapPtr, Number(size));
  }

  info(): FramebufferInfo {
    return { ...this.#info };
  }

  // --- Optional: ioctl(FBIOGET_*) für exakte Farbfelder/stride ---
  // Beachte: struct-Layouts unterscheiden sich zwischen Architekturen.
  // Für x86_64 kannst du dir zwei ArrayBuffer für fix/var anlegen und via DataView gezielt Felder lesen.
  // TODO: Vollständige Offsets definieren und hier integrieren.
  // private readIoctlInfo() { ... }

  fill({ r, g, b }: RGB) {
    if (!this.#buf) return;
    const { bitsPerPixel, yres, lineLength, xres } = this.#info;

    if (bitsPerPixel === 32) {
      const val = packXRGB8888(r, g, b) >>> 0;
      const view = new DataView(this.#buf);
      for (let y = 0; y < yres; y++) {
        let off = y * lineLength;
        for (let x = 0; x < xres; x++) {
          view.setUint32(off + (x * 4), val, true);
        }
      }
    } else if (bitsPerPixel === 16) {
      const val = packRGB565(r, g, b) & 0xffff;
      const view = new DataView(this.#buf);
      for (let y = 0; y < yres; y++) {
        let off = y * lineLength;
        for (let x = 0; x < xres; x++) {
          view.setUint16(off + (x * 2), val, true);
        }
      }
    } else {
      throw new Error(`Unsupported bpp=${bitsPerPixel}`);
    }
  }

  setPixel(x: number, y: number, { r, g, b }: RGB) {
    if (!this.#buf) return;
    const { xres, yres, lineLength, bitsPerPixel } = this.#info;
    if (x < 0 || y < 0 || x >= xres || y >= yres) return;

    const view = new DataView(this.#buf);
    const base = y * lineLength;

    if (bitsPerPixel === 32) {
      view.setUint32(base + (x * 4), packXRGB8888(r, g, b) >>> 0, true);
    } else if (bitsPerPixel === 16) {
      view.setUint16(base + (x * 2), packRGB565(r, g, b) & 0xffff, true);
    } else {
      throw new Error(`Unsupported bpp=${bitsPerPixel}`);
    }
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    const { xres, yres } = this.#info;
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(x + w, xres);
    const y1 = Math.min(y + h, yres);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        this.setPixel(xx, yy, color);
      }
    }
  }

  close() {
    if (this.#buf) {
      const size = this.#info.lineLength * this.#info.yres;
      libc.symbols.munmap(this.#mapPtr, size);
      this.#buf = null;
    }
    if (this.#fd >= 0) {
      libc.symbols.close(this.#fd);
      this.#fd = -1;
    }
  }
}

// --- Demo wenn direkt ausgeführt ---
if (import.meta.main) {
  const fb = new Framebuffer("/dev/fb0");
  const i = fb.info();
  console.log("FB:", i);

  fb.fill({ r: 0, g: 0, b: 32 });
  fb.fillRect(10, 10, Math.floor(i.xres * 0.6), Math.floor(i.yres * 0.6), { r: 255, g: 255, b: 255 });
  setTimeout(() => {
    fb.fill({ r: 0, g: 0, b: 0 });
    fb.close();
  }, 750);
}
