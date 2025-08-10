// src/native/spi.ts
import { FFIType } from "bun:ffi";
import { dlopenFirst } from "./dlopen.js";

// libc laden (kein null!)
const libc = dlopenFirst(["libc.so.6", "libc.so"], {
  open:  { args: [FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
  close: { args: [FFIType.i32], returns: FFIType.i32 },
  // ioctl:  int ioctl(int fd, unsigned long request, void *argp)
  // -> request Breite variiert (32/64). "usize" ist hier die robustere Wahl.
  ioctl: { args: [FFIType.i32, FFIType.usize, FFIType.ptr], returns: FFIType.i32 },
  // write:  ssize_t write(int fd, const void *buf, size_t count)
  write: { args: [FFIType.i32, FFIType.ptr, FFIType.usize], returns: FFIType.isize },
});

const O_RDWR = 0x0002;

// ioctl-Makros
const IOC_NRBITS=8, IOC_TYPEBITS=8, IOC_SIZEBITS=14, IOC_DIRBITS=2;
const IOC_NRSHIFT=0, IOC_TYPESHIFT=IOC_NRSHIFT+IOC_NRBITS;
const IOC_SIZESHIFT=IOC_TYPESHIFT+IOC_TYPEBITS;
const IOC_DIRSHIFT=IOC_SIZESHIFT+IOC_SIZEBITS;
const IOC_WRITE=1;
function _IOC(dir:number,type:number,nr:number,size:number){
  return (BigInt(dir)<<BigInt(IOC_DIRSHIFT))
       | (BigInt(type)<<BigInt(IOC_TYPESHIFT))
       | (BigInt(nr)<<BigInt(IOC_NRSHIFT))
       | (BigInt(size)<<BigInt(IOC_SIZESHIFT));
}
function _IOW(type:number,nr:number,size:number){ return _IOC(IOC_WRITE,type,nr,size); }
const SPI_IOC_MAGIC = 0x6b;
const SPI_IOC_WR_MODE          = _IOW(SPI_IOC_MAGIC, 1, 1);
const SPI_IOC_WR_BITS_PER_WORD = _IOW(SPI_IOC_MAGIC, 3, 1);
const SPI_IOC_WR_MAX_SPEED_HZ  = _IOW(SPI_IOC_MAGIC, 4, 4);

function u8buf(v:number){ const b=new Uint8Array(1); b[0]=v&0xff; return b; }
function u32buf(v:number){
  const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return b;
}

export interface SPIHandle {
  fd: number;
  mode: number;
  bits: number;
  speedHz: number;
  write(buf: Uint8Array): number;
  close(): void;
}

export function spiOpen(dev: string, mode=0, bitsPerWord=8, speedHz=20_000_000): SPIHandle {
  // JS-String -> null-terminierter UTF-8 Buffer → direkt als TypedArray übergeben
  const devBuf = new TextEncoder().encode(dev + "\0");
  const fd = libc.symbols.open(devBuf, O_RDWR);
  if (fd < 0) throw new Error(`spiOpen: cannot open ${dev}`);

  // mode
  if (libc.symbols.ioctl(fd, Number(SPI_IOC_WR_MODE), u8buf(mode)) !== 0)
    throw new Error("ioctl WR_MODE failed");
  // bits/word
  if (libc.symbols.ioctl(fd, Number(SPI_IOC_WR_BITS_PER_WORD), u8buf(bitsPerWord)) !== 0)
    throw new Error("ioctl WR_BITS_PER_WORD failed");
  // speed
  if (libc.symbols.ioctl(fd, Number(SPI_IOC_WR_MAX_SPEED_HZ), u32buf(speedHz)) !== 0)
    throw new Error("ioctl WR_MAX_SPEED_HZ failed");

  function write(buf: Uint8Array): number {
    const n = libc.symbols.write(fd, buf, buf.byteLength);
    if (Number(n) < 0) throw new Error("spi write failed");
    return Number(n);
  }
  function close(){ libc.symbols.close(fd); }

  return { fd, mode, bits: bitsPerWord, speedHz, write, close };
}
