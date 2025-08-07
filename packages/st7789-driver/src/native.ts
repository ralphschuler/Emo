import { cc } from "bun:ffi";
import source from "./native/native_all.c" with { type: "file" };

// Wichtig: KEIN FFIType importieren, sondern String-Typen verwenden!
const { symbols } = cc({
  source,
  symbols: {
    // SPI
    spi_open:       { args: ["cstring"],                returns: "i32" },
    spi_config:     { args: ["i32", "u8", "u8", "u32"], returns: "i32" },
    // len als u32, Rückgabe als i32 (Bytes geschrieben oder <0)
    spi_write_buf:  { args: ["i32", "buffer", "u32"],   returns: "i32" },
    spi_close:      { args: ["i32"],                    returns: "i32" },
    msleep:         { args: ["u32"],                    returns: "void" },

    // GPIO (Sysfs)
    gpio_export:    { args: ["u32"],                    returns: "i32" },
    gpio_unexport:  { args: ["u32"],                    returns: "i32" },
    gpio_direction: { args: ["u32", "i32"],             returns: "i32" },
    gpio_write:     { args: ["u32", "i32"],             returns: "i32" },
  },
});

const enc = new TextEncoder();

export const c = {
  // SPI
  spiOpen:   (dev: string)        => symbols.spi_open(enc.encode(dev + "\0")),
  spiConfig: (fd: number, mode: number, bits: number, speed: number) =>
    symbols.spi_config(fd|0, mode|0, bits|0, speed>>>0),
  spiWrite:  (fd: number, buf: Buffer) =>
    symbols.spi_write_buf(fd|0, buf, buf.byteLength>>>0),
  spiClose:  (fd: number)         => symbols.spi_close(fd|0),
  msleep:    (ms: number)         => symbols.msleep(ms>>>0),

  // GPIO
  gpioExport:    (pin: number)           => symbols.gpio_export(pin>>>0),
  gpioUnexport:  (pin: number)           => symbols.gpio_unexport(pin>>>0),
  gpioDirection: (pin: number, isOut: boolean) =>
    symbols.gpio_direction(pin>>>0, isOut ? 1 : 0),
  gpioWrite:     (pin: number, v: 0|1)   =>
    symbols.gpio_write(pin>>>0, v ? 1 : 0),
};
