// src/native/gpio.ts
import { FFIType } from "bun:ffi";
import { dlopenFirst } from "./dlopen.js";

const gpiod = dlopenFirst(
  ["libgpiod.so.2", "libgpiod.so.1", "libgpiod.so"],
  {
    gpiod_chip_open_by_name:   { args: [FFIType.cstring], returns: FFIType.ptr },
    gpiod_chip_close:          { args: [FFIType.ptr], returns: FFIType.void },
    gpiod_line_request_output: { args: [FFIType.ptr, FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
    gpiod_line_release:        { args: [FFIType.ptr], returns: FFIType.void },
    gpiod_line_set_value:      { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
    gpiod_chip_get_line:       { args: [FFIType.ptr, FFIType.u32], returns: FFIType.ptr },
  }
);

export class GpioLine {
  private chip: number;
  private line: number;
  constructor(chipName: string, lineOffset: number, label = "st7735-bun") {
    const chipNameBuf = new TextEncoder().encode(chipName + "\0");
    const chip = gpiod.symbols.gpiod_chip_open_by_name(chipNameBuf);
    if (!chip) throw new Error(`gpiod_chip_open_by_name("${chipName}") returned null/0`);
    this.chip = chip;

    const line = gpiod.symbols.gpiod_chip_get_line(this.chip, lineOffset >>> 0);
    if (!line) throw new Error(`gpiod_chip_get_line(${lineOffset}) returned null/0`);
    this.line = line;

    const labelBuf = new TextEncoder().encode(label + "\0");
    const rc = gpiod.symbols.gpiod_line_request_output(this.line, labelBuf, 0 /* LOW */);
    if (rc !== 0) { gpiod.symbols.gpiod_chip_close(this.chip); throw new Error(`gpiod: request output failed for line ${lineOffset}`); }
  }
  high(){ this.set(1); } low(){ this.set(0); }
  set(v: 0|1){ if (gpiod.symbols.gpiod_line_set_value(this.line, v) !== 0) throw new Error("gpiod: set failed"); }
  close(){ try{ gpiod.symbols.gpiod_line_release(this.line);}catch{} try{ gpiod.symbols.gpiod_chip_close(this.chip);}catch{} }
}
