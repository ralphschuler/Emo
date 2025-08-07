import { cc } from "bun:ffi";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(__dirname, "native", p), "utf8");

// Wir halten die Dateien getrennt, aber füttern bun:cc mit einer
// kombinierten Übersetzungseinheit (stabilste Variante).
const header = read("native.h");
const spiC = read("spi.c");
const gpioC = read("gpio.c");

const source = `
${header}
${spiC}
${gpioC}
`;

export const native = await cc.compile({
  source,
  // debug: true, // bei Bedarf
  symbols: {
    // SPI
    spi_open: "int (const char*)",
    spi_config: "int (int, unsigned char, unsigned char, unsigned int)",
    spi_write_buf: "long (int, const unsigned char*, unsigned long)",
    spi_close: "int (int)",
    msleep: "void (unsigned)",
    // GPIO
    gpio_export: "int (unsigned)",
    gpio_unexport: "int (unsigned)",
    gpio_direction: "int (unsigned, int)",
    gpio_write: "int (unsigned, int)",
  },
});

const enc = new TextEncoder();

export const c = {
  // SPI
  spiOpen: (dev: string) => native.symbols.spi_open(enc.encode(dev + "\0")),
  spiConfig: (fd: number, mode: number, bits: number, speed: number) =>
    native.symbols.spi_config(fd, mode >>> 0, bits >>> 0, speed >>> 0),
  spiWrite: (fd: number, buf: Buffer) =>
    Number(native.symbols.spi_write_buf(fd, buf, BigInt(buf.byteLength))),
  spiClose: (fd: number) => native.symbols.spi_close(fd),
  msleep: (ms: number) => native.symbols.msleep(ms >>> 0),

  // GPIO
  gpioExport: (pin: number) => native.symbols.gpio_export(pin >>> 0),
  gpioUnexport: (pin: number) => native.symbols.gpio_unexport(pin >>> 0),
  gpioDirection: (pin: number, isOut: boolean) =>
    native.symbols.gpio_direction(pin >>> 0, isOut ? 1 : 0),
  gpioWrite: (pin: number, value: 0 | 1) =>
    native.symbols.gpio_write(pin >>> 0, value ? 1 : 0),
};
