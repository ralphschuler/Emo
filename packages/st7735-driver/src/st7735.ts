// ESNext/ESM kompatibel, rpio ist CJS -> via createRequire einbinden
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpio: any = require("rpio");

export type RGBA = { r: number; g: number; b: number; a?: number };
export const rgba = (r: number, g: number, b: number, a = 255): RGBA => ({ r, g, b, a });

export const toRGB565 = (c: RGBA | number) => {
  if (typeof c === "number") return c & 0xffff;
  const r = (c.r & 0xff) >> 3;
  const g = (c.g & 0xff) >> 2;
  const b = (c.b & 0xff) >> 3;
  return (r << 11) | (g << 5) | b;
};

const CMD = {
  NOP: 0x00,
  SWRESET: 0x01,
  SLPIN: 0x10,
  SLPOUT: 0x11,
  INVOFF: 0x20,
  INVON: 0x21,
  DISPOFF: 0x28,
  DISPON: 0x29,
  CASET: 0x2a,
  RASET: 0x2b,
  RAMWR: 0x2c,
  MADCTL: 0x36,
  COLMOD: 0x3a,
  FRMCTR1: 0xb1,
  FRMCTR2: 0xb2,
  FRMCTR3: 0xb3,
  INVCTR: 0xb4,
  PWCTR1: 0xc0,
  PWCTR2: 0xc1,
  PWCTR3: 0xc2,
  PWCTR4: 0xc3,
  PWCTR5: 0xc4,
  VMCTR1: 0xc5,
  GMCTRP1: 0xe0,
  GMCTRN1: 0xe1
} as const;

export type ST7735Rotation = 0 | 90 | 180 | 270;

export interface ST7735Options {
  width: number;           // z.B. 128
  height: number;          // z.B. 160
  spiBus?: 0 | 1;          // SPI0/1 (rpio nutzt global; Chip-Select separat)
  chipSelect?: 0 | 1;      // CE0/CE1
  spiMode?: 0 | 1 | 2 | 3; // meist 0
  clockDivider?: number;   // kleiner = schneller (250MHz/div); 8..20 oft gut
  dcPin: number;           // D/C
  resetPin: number;        // RST
  backlightPin?: number;   // optional
  colOffset?: number;      // panel-spezifisch
  rowOffset?: number;      // panel-spezifisch
  invert?: boolean;        // INVON/INVOFF
  rotation?: ST7735Rotation;
  rpioInit?: { gpiomem?: boolean };
}

export class ST7735 {
  readonly width: number;
  readonly height: number;
  readonly colOffset: number;
  readonly rowOffset: number;
  readonly dc: number;
  readonly rst: number;
  readonly bl?: number;
  private rotation: ST7735Rotation;

  constructor(private opts: ST7735Options) {
    this.width = opts.width;
    this.height = opts.height;
    this.colOffset = opts.colOffset ?? 0;
    this.rowOffset = opts.rowOffset ?? 0;
    this.dc = opts.dcPin;
    this.rst = opts.resetPin;
    this.bl = opts.backlightPin;
    this.rotation = opts.rotation ?? 0;

    // Für SPI-Zugriff: i.d.R. gpiomem:false (Root)
    rpio.init({ gpiomem: false, ...(opts.rpioInit ?? {}) });

    // GPIO
    rpio.open(this.dc, rpio.OUTPUT, rpio.LOW);
    rpio.open(this.rst, rpio.OUTPUT, rpio.HIGH);
    if (this.bl !== undefined) rpio.open(this.bl, rpio.OUTPUT, rpio.HIGH);

    // SPI Setup
    const cs = opts.chipSelect ?? 0;
    rpio.spiBegin();
    rpio.spiChipSelect(cs);
    rpio.spiSetCSPolarity(cs, rpio.LOW);
    rpio.spiSetDataMode(opts.spiMode ?? 0);
    rpio.spiSetClockDivider(opts.clockDivider ?? 12); // ~20.8 MHz
  }

  private hwReset() {
    rpio.write(this.rst, rpio.HIGH);
    rpio.msleep(10);
    rpio.write(this.rst, rpio.LOW);
    rpio.msleep(20);
    rpio.write(this.rst, rpio.HIGH);
    rpio.msleep(120);
  }

  private writeCommand(cmd: number) {
    rpio.write(this.dc, rpio.LOW);
    const buf = Buffer.from([cmd & 0xff]);
    rpio.spiWrite(buf, buf.length);
  }

  private writeDataBytes(bytes: number[] | Uint8Array | Buffer) {
    rpio.write(this.dc, rpio.HIGH);
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    rpio.spiWrite(buf, buf.length);
  }

  private writeDataPixels565(pixels: Uint16Array) {
    rpio.write(this.dc, rpio.HIGH);
    const out = Buffer.allocUnsafe(pixels.length * 2);
    for (let i = 0, j = 0; i < pixels.length; i++, j += 2) {
      const v = pixels[i];
      out[j] = (v >> 8) & 0xff;
      out[j + 1] = v & 0xff;
    }
    rpio.spiWrite(out, out.length);
  }

  init() {
    this.hwReset();

    this.writeCommand(CMD.SWRESET);
    rpio.msleep(150);

    this.writeCommand(CMD.SLPOUT);
    rpio.msleep(120);

    // 16-bit Color
    this.writeCommand(CMD.COLMOD);
    this.writeDataBytes([0x05]);
    rpio.msleep(10);

    // Frame Rate Control (basic sane defaults)
    this.writeCommand(CMD.FRMCTR1); this.writeDataBytes([0x01, 0x2c, 0x2d]);
    this.writeCommand(CMD.FRMCTR2); this.writeDataBytes([0x01, 0x2c, 0x2d]);
    this.writeCommand(CMD.FRMCTR3); this.writeDataBytes([0x01, 0x2c, 0x2d, 0x01, 0x2c, 0x2d]);

    this.writeCommand(CMD.INVCTR); this.writeDataBytes([0x07]);

    // Power
    this.writeCommand(CMD.PWCTR1); this.writeDataBytes([0xa2, 0x02, 0x84]);
    this.writeCommand(CMD.PWCTR2); this.writeDataBytes([0xc5]);
    this.writeCommand(CMD.PWCTR3); this.writeDataBytes([0x0a, 0x00]);
    this.writeCommand(CMD.PWCTR4); this.writeDataBytes([0x8a, 0x2a]);
    this.writeCommand(CMD.PWCTR5); this.writeDataBytes([0x8a, 0xee]);

    this.writeCommand(CMD.VMCTR1); this.writeDataBytes([0x0e]);

    // Gamma
    this.writeCommand(CMD.GMCTRP1);
    this.writeDataBytes([0x0f,0x1a,0x0f,0x18,0x2f,0x28,0x20,0x22,0x1f,0x1b,0x23,0x37,0x00,0x07,0x02,0x10]);
    this.writeCommand(CMD.GMCTRN1);
    this.writeDataBytes([0x0f,0x1b,0x0f,0x17,0x33,0x2c,0x29,0x2e,0x30,0x30,0x39,0x3f,0x00,0x07,0x03,0x10]);

    this.setRotation(this.rotation);

    if (this.opts.invert) this.writeCommand(CMD.INVON);
    else this.writeCommand(CMD.INVOFF);

    this.writeCommand(CMD.DISPON);
    rpio.msleep(100);

    this.fillScreen(0x0000);
  }

  setRotation(rot: ST7735Rotation) {
    this.rotation = rot;
    // MADCTL: MY MX MV ML BGR MH 0 0
    let madctl = 0x00;
    // Je nach Panel evtl. BGR:
    // madctl |= 0x08;
    switch (rot) {
      case 0:   madctl |= 0x00; break;
      case 90:  madctl |= 0x60; break; // MV|MX
      case 180: madctl |= 0xc0; break; // MY|MX
      case 270: madctl |= 0xa0; break; // MV|MY
    }
    this.writeCommand(CMD.MADCTL);
    this.writeDataBytes([madctl]);
  }

  setAddressWindow(x: number, y: number, w: number, h: number) {
    const x0 = x + this.colOffset;
    const x1 = x + w - 1 + this.colOffset;
    const y0 = y + this.rowOffset;
    const y1 = y + h - 1 + this.rowOffset;

    this.writeCommand(CMD.CASET);
    this.writeDataBytes([ (x0 >> 8) & 0xff, x0 & 0xff, (x1 >> 8) & 0xff, x1 & 0xff ]);

    this.writeCommand(CMD.RASET);
    this.writeDataBytes([ (y0 >> 8) & 0xff, y0 & 0xff, (y1 >> 8) & 0xff, y1 & 0xff ]);

    this.writeCommand(CMD.RAMWR);
  }

  fillScreen(color565: number) {
    this.pushRect(0, 0, this.width, this.height, color565);
  }

  pushRect(x: number, y: number, w: number, h: number, src?: number | Uint16Array) {
    if (w <= 0 || h <= 0) return;
    if (x < 0 || y < 0 || x + w > this.width || y + h > this.height) {
      throw new Error(`pushRect out of bounds: x=${x},y=${y},w=${w},h=${h}`);
    }

    this.setAddressWindow(x, y, w, h);

    if (src === undefined || typeof src === "number") {
      const color = (typeof src === "number") ? (src & 0xffff) : 0x0000;
      const total = w * h;
      const chunk = Math.min(total, 4096);
      const buf = new Uint16Array(chunk);
      buf.fill(color);
      let remaining = total;
      while (remaining > 0) {
        const n = Math.min(remaining, chunk);
        this.writeDataPixels565(n === chunk ? buf : buf.subarray(0, n));
        remaining -= n;
      }
    } else {
      if (src.length !== w * h) {
        throw new Error(`src length mismatch: got ${src.length}, expected ${w * h}`);
      }
      this.writeDataPixels565(src);
    }
  }

  drawPixel(x: number, y: number, color565: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.setAddressWindow(x, y, 1, 1);
    const px = new Uint16Array(1);
    px[0] = color565 & 0xffff;
    this.writeDataPixels565(px);
  }

  setBacklight(on: boolean) {
    if (this.bl === undefined) return;
    rpio.write(this.bl, on ? rpio.HIGH : rpio.LOW);
  }

  dispose() {
    try { rpio.spiEnd(); } catch {}
    try { if (this.bl !== undefined) rpio.close(this.bl); } catch {}
    try { rpio.close(this.dc); } catch {}
    try { rpio.close(this.rst); } catch {}
  }
}
