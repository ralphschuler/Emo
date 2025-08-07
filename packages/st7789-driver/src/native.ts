import { cc, FFIType } from "bun:ffi";
import source from "./native/native_all.c" with { type: "file" };

const { symbols } = cc({
  source,
  symbols: {
    // SPI
    spi_open:       { args: [FFIType.cstring], returns: FFIType.i32 },
    spi_config:     { args: [FFIType.i32, FFIType.u8, FFIType.u8, FFIType.u32], returns: FFIType.i32 },
    spi_write_buf:  { args: [FFIType.i32, FFIType.buffer, FFIType.u32], returns: FFIType.i32 },
    spi_close:      { args: [FFIType.i32], returns: FFIType.i32 },
    msleep:         { args: [FFIType.u32], returns: FFIType.void },

    // GPIO (Sysfs)
    gpio_export:    { args: [FFIType.u32], returns: FFIType.i32 },
    gpio_unexport:  { args: [FFIType.u32], returns: FFIType.i32 },
    gpio_direction: { args: [FFIType.u32, FFIType.i32], returns: FFIType.i32 },
    gpio_write:     { args: [FFIType.u32, FFIType.i32], returns: FFIType.i32 },
  },
});

const enc = new TextEncoder();

export const c = {
  // SPI
  spiOpen: (dev: string) => symbols.spi_open(enc.encode(dev + "\0")),
  spiConfig: (fd: number, mode: number, bits: number, speed: number) =>
    symbols.spi_config(fd|0, mode|0, bits|0, speed>>>0),
  spiWrite: (fd: number, buf: Buffer) =>
    symbols.spi_write_buf(fd|0, buf, buf.byteLength>>>0),
  spiClose: (fd: number) => symbols.spi_close(fd|0),
  msleep: (ms: number) => symbols.msleep(ms>>>0),

  // GPIO
  gpioExport: (pin: number) => symbols.gpio_export(pin>>>0),
  gpioUnexport: (pin: number) => symbols.gpio_unexport(pin>>>0),
  gpioDirection: (pin: number, isOut: boolean) => symbols.gpio_direction(pin>>>0, isOut ? 1 : 0),
  gpioWrite: (pin: number, v: 0|1) => symbols.gpio_write(pin>>>0, v ? 1 : 0),
};
