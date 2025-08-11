import { Color565, rgb, blend565, modulate565 } from "st7789-color";
import { clamp } from "./util";

/** Minimal 5x7 ASCII Font (32..126). Each char: 5 columns, 7 rows, LSB top. */
const FONT5x7: Record<string, number[]> = (() => {
  // Borrow a classic 5x7 font pattern for printable ASCII (subset shown; extend as needed)
  // Each entry is 5 bytes (columns). Bit 0 = top pixel.
  const raw: Record<string, number[]> = {
    ' ':[0,0,0,0,0],'!':[0x00,0x00,0x5f,0x00,0x00],'"':[0x00,0x07,0x00,0x07,0x00],
    '#':[0x14,0x7f,0x14,0x7f,0x14],'$':[0x24,0x2a,0x7f,0x2a,0x12],'%':[0x23,0x13,0x08,0x64,0x62],
    '&':[0x36,0x49,0x55,0x22,0x50],'\'':[0x00,0x05,0x03,0x00,0x00],'(':[0x00,0x1c,0x22,0x41,0x00],
    ')':[0x00,0x41,0x22,0x1c,0x00],'*':[0x14,0x08,0x3e,0x08,0x14],'+':[0x08,0x08,0x3e,0x08,0x08],
    ',':[0x00,0x50,0x30,0x00,0x00],'-':[0x08,0x08,0x08,0x08,0x08],'.':[0x00,0x60,0x60,0x00,0x00],
    '/':[0x20,0x10,0x08,0x04,0x02],'0':[0x3e,0x51,0x49,0x45,0x3e],'1':[0x00,0x42,0x7f,0x40,0x00],
    '2':[0x42,0x61,0x51,0x49,0x46],'3':[0x21,0x41,0x45,0x4b,0x31],'4':[0x18,0x14,0x12,0x7f,0x10],
    '5':[0x27,0x45,0x45,0x45,0x39],'6':[0x3c,0x4a,0x49,0x49,0x30],'7':[0x01,0x71,0x09,0x05,0x03],
    '8':[0x36,0x49,0x49,0x49,0x36],'9':[0x06,0x49,0x49,0x29,0x1e],':':[0x00,0x36,0x36,0x00,0x00],
    ';':[0x00,0x56,0x36,0x00,0x00],'<':[0x08,0x14,0x22,0x41,0x00],'=':[0x14,0x14,0x14,0x14,0x14],
    '>':[0x00,0x41,0x22,0x14,0x08],'?':[0x02,0x01,0x51,0x09,0x06],'@':[0x32,0x49,0x79,0x41,0x3e],
    'A':[0x7e,0x11,0x11,0x11,0x7e],'B':[0x7f,0x49,0x49,0x49,0x36],'C':[0x3e,0x41,0x41,0x41,0x22],
    'D':[0x7f,0x41,0x41,0x22,0x1c],'E':[0x7f,0x49,0x49,0x49,0x41],'F':[0x7f,0x09,0x09,0x09,0x01],
    'G':[0x3e,0x41,0x49,0x49,0x7a],'H':[0x7f,0x08,0x08,0x08,0x7f],'I':[0x00,0x41,0x7f,0x41,0x00],
    'J':[0x20,0x40,0x41,0x3f,0x01],'K':[0x7f,0x08,0x14,0x22,0x41],'L':[0x7f,0x40,0x40,0x40,0x40],
    'M':[0x7f,0x02,0x0c,0x02,0x7f],'N':[0x7f,0x04,0x08,0x10,0x7f],'O':[0x3e,0x41,0x41,0x41,0x3e],
    'P':[0x7f,0x09,0x09,0x09,0x06],'Q':[0x3e,0x41,0x51,0x21,0x5e],'R':[0x7f,0x09,0x19,0x29,0x46],
    'S':[0x46,0x49,0x49,0x49,0x31],'T':[0x01,0x01,0x7f,0x01,0x01],'U':[0x3f,0x40,0x40,0x40,0x3f],
    'V':[0x1f,0x20,0x40,0x20,0x1f],'W':[0x3f,0x40,0x38,0x40,0x3f],'X':[0x63,0x14,0x08,0x14,0x63],
    'Y':[0x07,0x08,0x70,0x08,0x07],'Z':[0x61,0x51,0x49,0x45,0x43],'[':[0x00,0x7f,0x41,0x41,0x00],
    '\\':[0x02,0x04,0x08,0x10,0x20],']':[0x00,0x41,0x41,0x7f,0x00],'^':[0x04,0x02,0x01,0x02,0x04],
    '_':[0x40,0x40,0x40,0x40,0x40],'`':[0x00,0x01,0x02,0x04,0x00],
    'a':[0x20,0x54,0x54,0x54,0x78],'b':[0x7f,0x48,0x44,0x44,0x38],'c':[0x38,0x44,0x44,0x44,0x20],
    'd':[0x38,0x44,0x44,0x48,0x7f],'e':[0x38,0x54,0x54,0x54,0x18],'f':[0x08,0x7e,0x09,0x01,0x02],
    'g':[0x08,0x54,0x54,0x54,0x3c],'h':[0x7f,0x08,0x04,0x04,0x78],'i':[0x00,0x44,0x7d,0x40,0x00],
    'j':[0x20,0x40,0x44,0x3d,0x00],'k':[0x7f,0x10,0x28,0x44,0x00],'l':[0x00,0x41,0x7f,0x40,0x00],
    'm':[0x7c,0x04,0x18,0x04,0x78],'n':[0x7c,0x08,0x04,0x04,0x78],'o':[0x38,0x44,0x44,0x44,0x38],
    'p':[0x7c,0x14,0x14,0x14,0x08],'q':[0x08,0x14,0x14,0x14,0x7c],'r':[0x7c,0x08,0x04,0x04,0x08],
    's':[0x48,0x54,0x54,0x54,0x20],'t':[0x04,0x3f,0x44,0x40,0x20],'u':[0x3c,0x40,0x40,0x20,0x7c],
    'v':[0x1c,0x20,0x40,0x20,0x1c],'w':[0x3c,0x40,0x30,0x40,0x3c],'x':[0x44,0x28,0x10,0x28,0x44],
    'y':[0x0c,0x50,0x50,0x50,0x3c],'z':[0x44,0x64,0x54,0x4c,0x44],
  };
  return raw;
})();

export interface Gfx2DTarget {
  width: number;
  height: number;
  buf: Uint16Array; // RGB565
}

export class Gfx2D {
  constructor(public target: Gfx2DTarget) {}

  get W(){ return this.target.width; }
  get H(){ return this.target.height; }
  get buf(){ return this.target.buf; }

  clear(color: Color565){ this.buf.fill(color); }

  setPixel(x:number,y:number,color:Color565){
    if (x<0||y<0||x>=this.W||y>=this.H) return;
    this.buf[y*this.W + x] = color;
  }
  getPixel(x:number,y:number): Color565 | undefined {
    if (x<0||y<0||x>=this.W||y>=this.H) return;
    return this.buf[y*this.W + x];
  }


  line(x0:number,y0:number,x1:number,y1:number,color:Color565){
    // Bresenham
    x0|=0; y0|=0; x1|=0; y1|=0;
    let dx = Math.abs(x1-x0), sx = x0<x1?1:-1;
    let dy = -Math.abs(y1-y0), sy = y0<y1?1:-1;
    let err = dx+dy;
    while (true) {
      this.setPixel(x0,y0,color);
      if (x0===x1 && y0===y1) break;
      const e2 = 2*err;
      if (e2 >= dy){ err += dy; x0 += sx; }
      if (e2 <= dx){ err += dx; y0 += sy; }
    }
  }

  rect(x:number,y:number,w:number,h:number,color:Color565){
    this.line(x,y,x+w-1,y,color);
    this.line(x,y+h-1,x+w-1,y+h-1,color);
    this.line(x,y,x,y+h-1,color);
    this.line(x+w-1,y,x+w-1,y+h-1,color);
  }
  fillRect(x:number,y:number,w:number,h:number,color:Color565){
    const x0 = clamp(x|0, 0, this.W), y0 = clamp(y|0, 0, this.H);
    const x1 = clamp((x+w)|0, 0, this.W), y1 = clamp((y+h)|0, 0, this.H);
    if (x1<=x0 || y1<=y0) return;
    const rowSpan = x1 - x0;
    for (let yy=y0; yy<y1; yy++){
      const off = yy*this.W + x0;
      this.buf.fill(color, off, off + rowSpan);
    }
  }

  circle(cx:number, cy:number, r:number, color:Color565){
    // Midpoint circle
    let x = r|0, y = 0, err = 0;
    while (x >= y){
      this.setPixel(cx + x, cy + y, color);
      this.setPixel(cx + y, cy + x, color);
      this.setPixel(cx - y, cy + x, color);
      this.setPixel(cx - x, cy + y, color);
      this.setPixel(cx - x, cy - y, color);
      this.setPixel(cx - y, cy - x, color);
      this.setPixel(cx + y, cy - x, color);
      this.setPixel(cx + x, cy - y, color);
      y++; err += 1 + 2*y;
      if (2*(err - x) + 1 > 0){ x--; err += 1 - 2*x; }
    }
  }
  fillCircle(cx:number, cy:number, r:number, color:Color565){
    const R = r|0; if (R<=0) return;
    const y0 = clamp((cy-R)|0, 0, this.H), y1 = clamp((cy+R+1)|0, 0, this.H);
    for (let y=y0; y<y1; y++){
      const dy = y - cy;
      const dx = Math.floor(Math.sqrt(R*R - dy*dy));
      const x0 = clamp((cx - dx)|0, 0, this.W);
      const x1 = clamp((cx + dx + 1)|0, 0, this.W);
      const off = y*this.W + x0;
      this.buf.fill(color, off, off + (x1-x0));
    }
  }

  /** Filled triangle via scanline */
  fillTriangle(x0:number,y0:number,x1:number,y1:number,x2:number,y2:number,color:Color565){
    let pts = [{x:x0,y:y0},{x:x1,y:y1},{x:x2,y:y2}].sort((a,b)=>a.y-b.y);
    const [a,b,c] = pts;
    const drawSpan = (y:number, xs:number, xe:number) => {
      if (y<0||y>=this.H) return;
      let xStart = clamp(Math.min(xs,xe)|0,0,this.W), xEnd = clamp((Math.max(xs,xe)+1)|0,0,this.W);
      const off = y*this.W + xStart;
      this.buf.fill(color, off, off + (xEnd-xStart));
    };
    const edge = (p0:any,p1:any) => {
      const dy = p1.y - p0.y;
      if (dy===0) return [];
      const dx = (p1.x - p0.x) / dy;
      const out: number[] = [];
      let x = p0.x;
      for (let y=p0.y|0; y<(p1.y|0); y++){
        out[y - (a.y|0)] = x; x += dx;
      }
      return out;
    };
    const e0 = edge(a,b), e1 = edge(b,c), e2 = edge(a,c);
    const yStart = a.y|0, yMid = b.y|0, yEnd = c.y|0;

    for (let y=yStart; y<yMid; y++){
      const i = y - yStart;
      drawSpan(y, e2[i], e0[i]);
    }
    for (let y=yMid; y<yEnd; y++){
      const i2 = y - yStart;
      const i1 = y - yMid;
      drawSpan(y, e2[i2], e1[i1]);
    }
  }

  /** Convex polygon fill (fan triangulation) */
  fillPolygon(points: Array<{x:number,y:number}>, color: Color565){
    if (points.length < 3) return;
    const p0 = points[0];
    for (let i=1; i<points.length-1; i++){
      const p1 = points[i], p2 = points[i+1];
      this.fillTriangle(p0.x,p0.y,p1.x,p1.y,p2.x,p2.y,color);
    }
  }

  /** Linear gradient fill (two colors) */
  fillRectGradient(x:number,y:number,w:number,h:number, c0: Color565, c1: Color565, horizontal=false){
    const steps = horizontal ? w : h; if (steps<=0) return;
    const sr = (c0>>11)&0x1f, sg=(c0>>5)&0x3f, sb=c0&0x1f;
    const er = (c1>>11)&0x1f, eg=(c1>>5)&0x3f, eb=c1&0x1f;
    for (let i=0; i<steps; i++){
      const t = i/(steps-1);
      const r = ((sr*(1-t) + er*t)|0);
      const g = ((sg*(1-t) + eg*t)|0);
      const b = ((sb*(1-t) + eb*t)|0);
      const col = (r<<11)|(g<<5)|b;
      if (horizontal) this.fillRect(x+i, y, 1, h, col);
      else this.fillRect(x, y+i, w, 1, col);
    }
  }

  /** Blit another RGB565 buffer */
  blit565(src: Uint16Array, sx:number, sy:number, sw:number, sh:number, dx:number, dy:number, opts?:{alpha?:number, key?:Color565, tint?:Color565}){
    const alpha = opts?.alpha ?? 255;
    const key = opts?.key;
    const tint = opts?.tint;
    const W=this.W,H=this.H;
    if (alpha === 255){
      for (let y=0; y<sh; y++){
        const yy = dy + y; if (yy<0||yy>=H) continue;
        const syy = sy + y;
        const srcRow = syy*sw + sx;
        const dstRow = yy*W + dx;
        for (let x=0; x<sw; x++){
          const xx = dx + x; if (xx<0||xx>=W) continue;
          const sCol = src[srcRow + x];
          if (key !== undefined && sCol === key) continue;
            const srcTinted = tint ? modulate565(sCol, tint) : sCol;
          this.buf[dstRow + x] = srcTinted;
        }
      }
    } else {
      for (let y=0; y<sh; y++){
        const yy = dy + y; if (yy<0||yy>=H) continue;
        const syy = sy + y;
        const srcRow = syy*sw + sx;
        const dstRow = yy*W + dx;
        for (let x=0; x<sw; x++){
          const xx = dx + x; if (xx<0||xx>=W) continue;
          const sCol = src[srcRow + x];
          if (key !== undefined && sCol === key) continue;
            const srcTinted = tint ? modulate565(sCol, tint) : sCol;
          const off = dstRow + x;
            this.buf[off] = blend565(srcTinted, this.buf[off], alpha);
        }
      }
    }
  }

  /** Convert and blit from RGBA8888 (Uint8ClampedArray), optional global alpha */
  blitRGBA(src: Uint8ClampedArray, sw:number, sh:number, dx:number, dy:number, opts?:{alpha?:number}){
    const aGlobal = opts?.alpha ?? 255;
    for (let y=0; y<sh; y++){
      const yy = dy + y; if (yy<0||yy>=this.H) continue;
      for (let x=0; x<sw; x++){
        const xx = dx + x; if (xx<0||xx>=this.W) continue;
        const i = (y*sw + x) * 4;
        const r = src[i], g = src[i+1], b = src[i+2], a = src[i+3];
        const col = rgb(r,g,b);
        const alpha = Math.min(255, ((a * aGlobal) / 255)|0);
        const off = yy*this.W + xx;
          this.buf[off] = blend565(col, this.buf[off], alpha);
      }
    }
  }


  /** Tiny text draw (5x7 + 1px spacing) */
  text(x:number,y:number,msg:string,color:Color565, scale=1){
    let cx = x|0;
    for (const ch of msg){
      const glyph = FONT5x7[ch] || FONT5x7['?'];
      if (glyph){
        for (let col=0; col<5; col++){
          const v = glyph[col];
          for (let row=0; row<7; row++){
            if (v & (1<<row)){
              if (scale===1){
                this.setPixel(cx+col, y+row, color);
              } else {
                this.fillRect(cx+col*scale, y+row*scale, scale, scale, color);
              }
            }
          }
        }
      }
      cx += (5*scale + 1); // spacing
    }
  }
}
