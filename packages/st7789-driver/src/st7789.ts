// src/st7735.ts
import { spiOpen, type SPIHandle } from "./native/spi.js";
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

export type ST7789Rotation = 0|90|180|270;

export interface ST7789Options {
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
  rotation?: ST7789Rotation;
}

export class ST7789 {
  readonly width: number;
  readonly height: number;
  readonly colOffset: number;
  readonly rowOffset: number;

  private spi!: SPIHandle;
  private dc!: GpioLine;
  private rst!: GpioLine;
  private bl?: GpioLine;

  private rotation: ST7789Rotation;

  constructor(private opts: ST7789Options) {
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
    this.dc = new GpioLine(chip, this.opts.dcPin, "st7789-dc");
    this.rst = new GpioLine(chip, this.opts.resetPin, "st7789-rst");
    if (typeof this.opts.backlightPin === "number") {
      this.bl = new GpioLine(chip, this.opts.backlightPin, "st7789-bl");
    }

    // Hardware-Reset
    this.rst.high(); this.sleep(10);
    this.rst.low();  this.sleep(20);
    this.rst.high(); this.sleep(120);

    // --- ST7789 init ---
    // Sleep out
    this.writeCmdByte(0x11 /* SLPOUT */);
    this.sleep(120);

    // Farbformat: 16-bit (RGB565)
    this.writeCmdByte(0x3A /* COLMOD */);
    this.writeDataBytes([0x55]); // 16bpp
    this.sleep(10);

    // Porch control
    this.writeCmdByte(0xB2 /* PORCTRL */);
    this.writeDataBytes([0x0C, 0x0C, 0x00, 0x33, 0x33]);

    // Gate control
    this.writeCmdByte(0xB7 /* GCTRL */);
    this.writeDataBytes([0x35]);

    // VCOMS
    this.writeCmdByte(0xBB);
    this.writeDataBytes([0x19]);

    // LCMCTRL
    this.writeCmdByte(0xC0);
    this.writeDataBytes([0x2C]);

    // VDV/VRH enable
    this.writeCmdByte(0xC2 /* VDVVRHEN */);
    this.writeDataBytes([0x01]);

    // VRHS
    this.writeCmdByte(0xC3);
    this.writeDataBytes([0x12]);

    // VDV Set
    this.writeCmdByte(0xC4);
    this.writeDataBytes([0x20]);

    // Frame rate
    this.writeCmdByte(0xC6 /* FRCTRL2 */);
    this.writeDataBytes([0x0F]);

    // Power control
    this.writeCmdByte(0xD0 /* PWCTRL1 */);
    this.writeDataBytes([0xA4, 0xA1]);

    // Inversion (Waveshare 2" will das üblicherweise)
    if (this.opts.invert) this.writeCmdByte(0x21 /* INVON */);
    else this.writeCmdByte(0x20 /* INVOFF */);

    // Gamma (optionale, brauchbare Kurven)
    this.writeCmdByte(0xE0 /* PVGAMCTRL */);
    this.writeDataBytes([
      0xD0,0x04,0x0D,0x11,0x13,0x2B,0x3F,0x54,0x4C,0x18,0x0D,0x0B,0x1F,0x23
    ]);
    this.writeCmdByte(0xE1 /* NVGAMCTRL */);
    this.writeDataBytes([
      0xD0,0x04,0x0C,0x11,0x13,0x2C,0x3F,0x44,0x51,0x2F,0x1F,0x1F,0x20,0x23
    ]);

    // Fenster auf vollen Screen setzen (0..239 / 0..319)
    this.writeCmdByte(0x2A /* CASET */);
    this.writeDataBytes([0x00,0x00, 0x00,0xEF]); // 0..239
    this.writeCmdByte(0x2B /* RASET */);
    this.writeDataBytes([0x00,0x00, 0x01,0x3F]); // 0..319

    // Rotation (MADCTL) – unten
    this.setRotation(this.rotation);

    // Display ON
    this.writeCmdByte(0x29 /* DISPON */);
    this.sleep(100);

    // Clear
    this.fillScreen(0x0000);
  }

  setBacklight(on: boolean) {
    if (!this.bl) return;
    if (on) this.bl.high(); else this.bl.low();
  }

  setRotation(rot: ST7789Rotation) {
    this.rotation = rot;
    let madctl = 0x00;
    madctl |= 0x08;

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

    const MAX_SPI_BYTES = Number(process.env.SPI_BUFSIZ ?? 4096);
    const BYTES_PER_ROW = w * 2;
    const ROWS_PER_BLOCK = Math.max(1, Math.floor(MAX_SPI_BYTES / BYTES_PER_ROW));

    if (src === undefined || typeof src === "number") {
      // Konstante Farbe
      const color = (typeof src === "number") ? (src & 0xffff) : 0x0000;
      const blockPix = new Uint16Array(ROWS_PER_BLOCK * w);
      blockPix.fill(color);

      let rowsLeft = h;
      let yCur = y;
      while (rowsLeft > 0) {
        const rows = Math.min(rowsLeft, ROWS_PER_BLOCK);
        // Fenster exakt auf den Block setzen
        this.setAddressWindow(x, yCur, w, rows);
        // RAMWR einmal pro Block
        this.ramwr();
        // die ersten (rows*w) Pixel aus blockPix senden
        this.writePixels565(rows === ROWS_PER_BLOCK ? blockPix : blockPix.subarray(0, rows * w));
        yCur += rows;
        rowsLeft -= rows;
      }
    } else {
      // Pixel-Array
      if (src.length !== w * h) throw new Error(`src length mismatch`);

      let rowsLeft = h;
      let yCur = y;
      let srcOff = 0;

      while (rowsLeft > 0) {
        const rows = Math.min(rowsLeft, ROWS_PER_BLOCK);
        this.setAddressWindow(x, yCur, w, rows);
        this.ramwr();
        const slice = src.subarray(srcOff, srcOff + rows * w);
        this.writePixels565(slice);
        yCur += rows;
        srcOff += rows * w;
        rowsLeft -= rows;
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
