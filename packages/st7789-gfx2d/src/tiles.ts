import type { ST7789 } from "st7789-driver";

export class DoubleBuffer {
  private bufs: [Uint16Array, Uint16Array];
  private backIndex = 0;
  constructor(public W:number, public H:number){
    const n = W * H;
    this.bufs = [new Uint16Array(n), new Uint16Array(n)];
  }
  flip(){ this.backIndex ^= 1; }
  get back(){ return this.bufs[this.backIndex]; }
  get front(){ return this.bufs[this.backIndex ^ 1]; }
  clearBack(color:number){ this.back.fill(color); }
}

/** Dirty-tiles sender (RGB565) */
export class TileRenderer {
  private tilesX: number;
  private tilesY: number;
  private dirty: Uint8Array;
  constructor(
    private lcd: ST7789,
    private W: number,
    private H: number,
    private tileW = 16,
    private tileH = 16,
  ) {
    this.tilesX = Math.ceil(W / tileW);
    this.tilesY = Math.ceil(H / tileH);
    this.dirty = new Uint8Array(this.tilesX * this.tilesY);
    this.markAll();
  }
  markAll(){ this.dirty.fill(1); }
  markDirtyRect(x:number, y:number, w:number, h:number) {
    const tx0 = Math.max(0, Math.floor(x / this.tileW));
    const ty0 = Math.max(0, Math.floor(y / this.tileH));
    const tx1 = Math.min(this.tilesX-1, Math.floor((x+w) / this.tileW));
    const ty1 = Math.min(this.tilesY-1, Math.floor((y+h) / this.tileH));
    for (let ty=ty0; ty<=ty1; ty++){
      const off = ty * this.tilesX;
      for (let tx=tx0; tx<=tx1; tx++) this.dirty[off + tx] = 1;
    }
  }
  flush(buf: Uint16Array): number {
    const { tileW, tileH, tilesX, tilesY, W, H } = this;
    let pushedBytes = 0;
    for (let ty=0; ty<tilesY; ty++){
      for (let tx=0; tx<tilesX; tx++){
        const i = ty * tilesX + tx;
        if (!this.dirty[i]) continue;
        this.dirty[i] = 0;

        const x = tx * tileW;
        const y = ty * tileH;
        const w = Math.min(tileW, W - x);
        const h = Math.min(tileH, H - y);

        const tile = new Uint16Array(w * h);
        for (let yy=0; yy<h; yy++){
          const srcOff = (y + yy) * W + x;
          tile.set(buf.subarray(srcOff, srcOff + w), yy * w);
        }
        this.lcd.pushRect(x, y, w, h, tile);
        pushedBytes += w * h * 2;
      }
    }
    return pushedBytes;
  }
}
