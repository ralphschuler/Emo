import { dlopen, FFIType, ptr, CString } from "bun:ffi";

// libc: open, close, ioctl, write
const libc = dlopen(null, {
  open:   { args: [FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
  close:  { args: [FFIType.i32], returns: FFIType.i32 },
  ioctl:  { args: [FFIType.i32, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
  write:  { args: [FFIType.i32, FFIType.ptr, FFIType.usize], returns: FFIType.isize },
});

// Flags for open()
const O_RDWR = 0x0002;

// ioctl Requests (aus linux/spi/spidev.h)
const IOC_NRBITS = 8, IOC_TYPEBITS = 8, IOC_SIZEBITS = 14, IOC_DIRBITS = 2;
const IOC_NRSHIFT = 0, IOC_TYPESHIFT = IOC_NRSHIFT + IOC_NRBITS;
const IOC_SIZESHIFT = IOC_TYPESHIFT + IOC_TYPEBITS;
const IOC_DIRSHIFT = IOC_SIZESHIFT + IOC_SIZEBITS;
const IOC_WRITE = 1;

function _IOC(dir: number, type: number, nr: number, size: number) {
  return (BigInt(dir) << BigInt(IOC_DIRSHIFT))
       | (BigInt(type) << BigInt(IOC_TYPESHIFT))
       | (BigInt(nr) << BigInt(IOC_NRSHIFT))
       | (BigInt(size) << BigInt(IOC_SIZESHIFT));
}
function _IOW(type: number, nr: number, size: number) {
  return _IOC(IOC_WRITE, type, nr, size);
}
const SPI_IOC_MAGIC = 0x6b;

// Einzelwerte setzen (mode u8, bits u8, speed u32)
const SPI_IOC_WR_MODE           = _IOW(SPI_IOC_MAGIC, 1, 1);
const SPI_IOC_WR_BITS_PER_WORD  = _IOW(SPI_IOC_MAGIC, 3, 1);
const SPI_IOC_WR_MAX_SPEED_HZ   = _IOW(SPI_IOC_MAGIC, 4, 4);

// Helper um Pointer-Buffer zu bauen
function u8buf(v: number) {
  const b = new Uint8Array(1); b[0] = v & 0xff; return b;
}
function u32buf(v: number) {
  const b = new Uint8Array(4);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, v, true); // little-endian
  return b;
}

export interface SPIHandle {
  fd: number;
  mode: number;
  bits: number;
  speedHz: number;
  write(buf: Uint8Array): number;
  close(): void;
}

export function spiOpen(dev: string, mode = 0, bitsPerWord = 8, speedHz = 20_000_000): SPIHandle {
  const fd = libc.symbols.open(CString(dev), O_RDWR);
  if (fd < 0) throw new Error(`spiOpen: cannot open ${dev}`);

  // mode
  {
    const b = u8buf(mode);
    const rc = libc.symbols.ioctl(fd, SPI_IOC_WR_MODE, ptr(b));
    if (rc !== 0) { libc.symbols.close(fd); throw new Error("ioctl WR_MODE failed"); }
  }
  // bits
  {
    const b = u8buf(bitsPerWord);
    const rc = libc.symbols.ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, ptr(b));
    if (rc !== 0) { libc.symbols.close(fd); throw new Error("ioctl WR_BITS_PER_WORD failed"); }
  }
  // speed
  {
    const b = u32buf(speedHz);
    const rc = libc.symbols.ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, ptr(b));
    if (rc !== 0) { libc.symbols.close(fd); throw new Error("ioctl WR_MAX_SPEED_HZ failed"); }
  }

  function write(buf: Uint8Array): number {
    const n = libc.symbols.write(fd, ptr(buf), buf.byteLength);
    if (Number(n) < 0) throw new Error("spi write failed");
    return Number(n);
  }
  function close() {
    libc.symbols.close(fd);
  }

  return { fd, mode, bits: bitsPerWord, speedHz, write, close };
}
