import { SpiDev } from "./spi";
import { Gpio } from "./gpio";

export interface St7789Options {
  spiDevice?: string;
  width?: number;
  height?: number;
  rotation?: 0 | 90 | 180 | 270;
  dcPin: number;
  rstPin: number;
  blPin?: number;
  spiMode?: number;
  speedHz?: number;
}

const CMD = { SWRESET:0x01, SLP_OUT:0x11, COLMOD:0x3a, MADCTL:0x36, INVON:0x21, CASET:0x2a, RASET:0x2b, RAMWR:0x2c, DISPON:0x29 } as const;
const MADCTL_MX=0x40, MADCTL_MY=0x80, MADCTL_MV=0x20, MADCTL_RGB=0x00;

export class ST7789 {
  readonly w: number; readonly h: number;
  private spi: SpiDev; private dc: Gpio; private rst: Gpio; private bl?: Gpio;

  constructor(private opts: St7789Options) {
    this.w = opts.width ?? 240; this.h = opts.height ?? 320;
    this.spi = new SpiDev(opts.spiDevice ?? "/dev/spidev0.0");
    this.spi.config({ mode: opts.spiMode ?? 0, bits: 8, speedHz: opts.speedHz ?? 31_000_000 });
    this.dc = new Gpio(opts.dcPin, "out"); this.rst = new Gpio(opts.rstPin, "out");
    if (opts.blPin != null) this.bl = new Gpio(opts.blPin, "out");
  }

  private cmd(b: number){ this.dc.set(0); this.spi.write(Buffer.from([b & 0xff])); }
  private data(d: Buffer|number[]){ this.dc.set(1); const b = Buffer.isBuffer(d)? d : Buffer.from(d); this.spi.write(b); }
  private msleep(ms:number){ this.spi.msleep(ms); }
  reset(){ this.rst.set(0); this.msleep(50); this.rst.set(1); this.msleep(150); }

  init(){
    this.reset();
    this.cmd(CMD.SWRESET); this.msleep(150);
    this.cmd(CMD.SLP_OUT); this.msleep(120);
    this.cmd(CMD.COLMOD); this.data([0x55]); // 16-bit
    let madctl = MADCTL_RGB;
    switch (this.opts.rotation ?? 0) {
      case 0: madctl |= MADCTL_MX; break;
      case 90: madctl |= MADCTL_MV; break;
      case 180: madctl |= MADCTL_MY; break;
      case 270: madctl |= MADCTL_MV | MADCTL_MX | MADCTL_MY; break;
    }
    this.cmd(CMD.MADCTL); this.data([madctl]);
    this.cmd(CMD.INVON); this.msleep(10);
    this.setAddressWindow(0,0,this.w,this.h);
    this.cmd(CMD.DISPON); this.msleep(100);
    if (this.bl) this.bl.set(1);
  }

  setAddressWindow(x:number,y:number,w:number,h:number){
    const x1=x, x2=x+w-1, y1=y, y2=y+h-1;
    this.cmd(CMD.CASET); this.data(Buffer.from([(x1>>8)&0xff,x1&0xff,(x2>>8)&0xff,x2&0xff]));
    this.cmd(CMD.RASET); this.data(Buffer.from([(y1>>8)&0xff,y1&0xff,(y2>>8)&0xff,y2&0xff]));
    this.cmd(CMD.RAMWR);
  }

  fillScreen(rgb565:number){ this.fillRect(0,0,this.w,this.h,rgb565); }

  fillRect(x:number,y:number,w:number,h:number,rgb565:number){
    if(w<=0||h<=0) return;
    this.setAddressWindow(x,y,w,h);
    const hi=(rgb565>>8)&0xff, lo=rgb565&0xff;
    const chunkPx=4096; const chunk=Buffer.alloc(chunkPx*2);
    for(let i=0;i<chunkPx;i++){ chunk[i*2]=hi; chunk[i*2+1]=lo; }
    const total=w*h; let sent=0; this.dc.set(1);
    while(sent<total){ const take=Math.min(chunkPx,total-sent); this.spi.write(chunk.subarray(0,take*2)); sent+=take; }
  }

  drawPixel(x:number,y:number,c:number){
    if(x<0||y<0||x>=this.w||y>=this.h) return;
    this.setAddressWindow(x,y,1,1);
    this.data(Buffer.from([(c>>8)&0xff,c&0xff]));
  }

  blitRGB565(x:number,y:number,w:number,h:number,buf:Buffer){
    if(buf.byteLength!==w*h*2) throw new Error("blitRGB565: invalid buffer size");
    this.setAddressWindow(x,y,w,h);
    this.data(buf);
  }

  rgb888to565(r:number,g:number,b:number){ return ((r&0xf8)<<8)|((g&0xfc)<<3)|(b>>3); }

  close(){ if(this.bl) this.bl.set(0); this.spi.close(); }
}
