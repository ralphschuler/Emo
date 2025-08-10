// src/st7735.ts
import { spiOpen, SPIHandle } from "./native/spi.js";
import { GpioLine } from "./native/gpio.js";

export type RGBA = { r: number; g: number; b: number; a?: number };
export const rgba = (r:number,g:number,b:number,a=255):RGBA=>({r,g,b,a});
export const toRGB565 = (c: RGBA | number) => {
  if (typeof c === "number") return c & 0xffff;
  const r = (c.r & 0xff) >> 3;
  const g = (c.g & 0xff) >> 2;
  const b = (c.b & 0xff) >> 3;
  return (r << 11) | (g << 5) | b;
};

const CMD = {
  SWRESET: 0x01,
  SLPIN:   0x10,
  SLPOUT:  0x11,
  INVOFF:  0x20,
  INVON:   0x21,
  DISPOFF: 0x28,
  DISPON:  0x29,
  CASET:   0x2a,
  RASET:   0x2b,
  RAMWR:   0x2c,
  MADCTL:  0x36,
  COLMOD:  0x3a,
  FRMCTR1: 0xb1,
  FRMCTR2: 0xb2,
  FRMCTR3: 0xb3,
  INVCTR:  0xb4,
  PWCTR1:  0xc0,
  PWCTR2:  0xc1,
  PWCTR3:  0xc2,
  PWCTR4:  0xc3,
  PWCTR5:  0xc4,
  VMCTR1:  0xc5,
  GMCTRP1: 0xe0,
  GMCTRN1: 0xe1,
} as const;

export type ST7735Rotation = 0|90|180|270;

export interface ST7735Options {
  width: number;
  height: number;
  /** z.B. "/dev/spidev0.0" */
  device?: string;
  /** SPI mode (0) */
  mode?: number;
  /** bits per word (8) */
  bits?: number;
  /** max speed hz (20_000_000) */
  speedHz?: number;

  /** libgpiod chip name, i.d.R. "gpiochip0" */
  gpioChip?: string;
  /** GPIO Offsets (BCM) */
  dcPin: number;
  resetPin: number;
  backlightPin?: number;

  colOffset?: number;
  rowOffset?: number;
  invert?: boolean;
  rotation?: ST7735Rotation;
}

export class ST7735 {
  readonly width: number;
  readonly height: number;
  readonly colOffset: number;
  readonly rowOffset: number;

  private spi!: SPIHandle;
  private dc!: GpioLine;
  private rst!: GpioLine;
  private bl?: GpioLine;

  private rotation: ST7735Rotation;

  constructor(private opts: ST7735Options) {
    this.width = opts.width;
    this.height = opts.height;
    this.colOffset = opts.colOffset ?? 0;
    this.rowOffset = opts.rowOffset ?? 0;
    this.rotation = opts.rotation ?? 0;
  }

  private sleep(ms: number) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

  private writeCmdByte(cmd: number) {
    this.dc.low();
    const b = new Uint8Array([cmd & 0xff]);
    this.spi.write(b);
  }
  private writeDataBytes(arr: number[] | Uint8Array) {
    this.dc.high();
    const b = arr instanceof Uint8Array ? arr : Uint8Array.from(arr);
    this.spi.write(b);
  }
  private writePixels565(pix: Uint16Array) {
    const out = new Uint8Array(pix.length * 2);
    for (let i = 0, j = 0; i < pix.length; i++) {
      const v = pix[i];
      out[j++] = (v >> 8) & 0xff;
      out[j++] = v & 0xff;
    }

    const MAX_SPI_BYTES = Number(process.env.SPI_BUFSIZ ?? 4096);

    for (let off = 0; off < out.length; off += MAX_SPI_BYTES) {
      const chunk = out.subarray(off, Math.min(off + MAX_SPI_BYTES, out.length));
      // <- WICHTIG: RAMWR vor jedem Chunk, damit der Controller wieder "im Datenmodus" ist
      this.ramwr();
      this.dc.high();
      this.spi.write(chunk);
    }
  }

  init() {
    const dev = this.opts.device ?? "/dev/spidev0.0";
    const mode = this.opts.mode ?? 0;
    const bits = this.opts.bits ?? 8;
    const speed = this.opts.speedHz ?? 20_000_000;
    this.spi = spiOpen(dev, mode, bits, speed);

    const chip = this.opts.gpioChip ?? "gpiochip0";
    this.dc = new GpioLine(chip, this.opts.dcPin, "st7735-dc");
    this.rst = new GpioLine(chip, this.opts.resetPin, "st7735-rst");
    if (typeof this.opts.backlightPin === "number") {
      this.bl = new GpioLine(chip, this.opts.backlightPin, "st7735-bl");
    }

    // Hardware-Reset
    this.rst.high(); this.sleep(10);
    this.rst.low();  this.sleep(20);
    this.rst.high(); this.sleep(120);

    // Init-Sequence
    this.writeCmdByte(CMD.SWRESET); this.sleep(150);
    this.writeCmdByte(CMD.SLPOUT);  this.sleep(120);

    this.writeCmdByte(CMD.COLMOD);  this.writeDataBytes([0x05]); this.sleep(10);

    this.writeCmdByte(CMD.FRMCTR1); this.writeDataBytes([0x01,0x2c,0x2d]);
    this.writeCmdByte(CMD.FRMCTR2); this.writeDataBytes([0x01,0x2c,0x2d]);
    this.writeCmdByte(CMD.FRMCTR3); this.writeDataBytes([0x01,0x2c,0x2d,0x01,0x2c,0x2d]);

    this.writeCmdByte(CMD.INVCTR);  this.writeDataBytes([0x07]);

    this.writeCmdByte(CMD.PWCTR1);  this.writeDataBytes([0xa2,0x02,0x84]);
    this.writeCmdByte(CMD.PWCTR2);  this.writeDataBytes([0xc5]);
    this.writeCmdByte(CMD.PWCTR3);  this.writeDataBytes([0x0a,0x00]);
    this.writeCmdByte(CMD.PWCTR4);  this.writeDataBytes([0x8a,0x2a]);
    this.writeCmdByte(CMD.PWCTR5);  this.writeDataBytes([0x8a,0xee]);

    this.writeCmdByte(CMD.VMCTR1);  this.writeDataBytes([0x0e]);

    // Gamma
    this.writeCmdByte(CMD.GMCTRP1);
    this.writeDataBytes([0x0f,0x1a,0x0f,0x18,0x2f,0x28,0x20,0x22,0x1f,0x1b,0x23,0x37,0x00,0x07,0x02,0x10]);
    this.writeCmdByte(CMD.GMCTRN1);
    this.writeDataBytes([0x0f,0x1b,0x0f,0x17,0x33,0x2c,0x29,0x2e,0x30,0x30,0x39,0x3f,0x00,0x07,0x03,0x10]);

    this.setRotation(this.rotation);

    if (this.opts.invert) this.writeCmdByte(CMD.INVON);
    else this.writeCmdByte(CMD.INVOFF);

    this.writeCmdByte(CMD.DISPON); this.sleep(100);

    this.fillScreen(0x0000);
  }

  setBacklight(on: boolean) {
    if (!this.bl) return;
    if (on) this.bl.high(); else this.bl.low();
  }

  setRotation(rot: ST7735Rotation) {
    this.rotation = rot;
    let madctl = 0x00;
    // Optional BGR-Bit je nach Modul:
    // madctl |= 0x08;
    switch (rot) {
      case 0:   madctl |= 0x00; break;
      case 90:  madctl |= 0x60; break; // MV|MX
      case 180: madctl |= 0xc0; break; // MY|MX
      case 270: madctl |= 0xa0; break; // MV|MY
    }
    this.writeCmdByte(CMD.MADCTL);
    this.writeDataBytes([madctl]);
  }

  private setAddressWindow(x: number, y: number, w: number, h: number) {
    const x0 = x + (this.colOffset|0);
    const x1 = x + w - 1 + (this.colOffset|0);
    const y0 = y + (this.rowOffset|0);
    const y1 = y + h - 1 + (this.rowOffset|0);

    this.writeCmdByte(CMD.CASET);
    this.writeDataBytes([ (x0>>8)&0xff, x0&0xff, (x1>>8)&0xff, x1&0xff ]);

    this.writeCmdByte(CMD.RASET);
    this.writeDataBytes([ (y0>>8)&0xff, y0&0xff, (y1>>8)&0xff, y1&0xff ]);

    this.writeCmdByte(CMD.RAMWR);
  }

  fillScreen(color565: number) {
    this.pushRect(0, 0, this.width, this.height, color565);
  }

  private ramwr() {
    // 0x2C = RAMWR
    this.writeCmdByte(0x2c);
  }

  pushRect(x: number, y: number, w: number, h: number, src?: number | Uint16Array) {
    if (w <= 0 || h <= 0) return;
    if (x < 0 || y < 0 || x + w > this.width || y + h > this.height)
      throw new Error(`pushRect OOB: ${x},${y},${w},${h}`);
    this.setAddressWindow(x, y, w, h);

    if (src === undefined || typeof src === "number") {
      const color = (typeof src === "number") ? (src & 0xffff) : 0x0000;
      const total = w * h;
      const buf = new Uint16Array(Math.min(total, 2048)); // nur temporär für Fills
      buf.fill(color);
      let remaining = total;
      while (remaining > 0) {
        const n = Math.min(remaining, buf.length);
        this.writePixels565(n === buf.length ? buf : buf.subarray(0, n));
        remaining -= n;
      }
    } else {
      if (src.length !== w*h) throw new Error(`src length mismatch`);
      const MAX_PIX = Math.floor((Number(process.env.SPI_BUFSIZ ?? 4096)) / 2);
      for (let off = 0; off < src.length; off += MAX_PIX) {
        this.writePixels565(src.subarray(off, Math.min(off + MAX_PIX, src.length)));
      }

    }
  }

  drawPixel(x:number,y:number,color565:number){
    if (x<0||y<0||x>=this.width||y>=this.height) return;
    this.setAddressWindow(x,y,1,1);
    const px=new Uint16Array(1); px[0]=color565&0xffff;
    this.writePixels565(px);
  }

  dispose() {
    try { this.spi?.close(); } catch {}
    try { this.bl?.close(); } catch {}
    try { this.dc?.close(); } catch {}
    try { this.rst?.close(); } catch {}
  }
}
