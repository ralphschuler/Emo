import { dlopen, FFIType, ptr, CString } from "bun:ffi";

// libgpiod v2 API (Debian bookworm/bullseye: libgpiod.so.2)
const gpiod = dlopen("libgpiod.so.2", {
  gpiod_chip_open_by_name: { args: [FFIType.cstring], returns: FFIType.ptr },
  gpiod_chip_close:        { args: [FFIType.ptr], returns: FFIType.void },
  gpiod_line_request_output: { args: [FFIType.ptr, FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
  gpiod_line_release:      { args: [FFIType.ptr], returns: FFIType.void },
  gpiod_line_set_value:    { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
  gpiod_chip_get_line:     { args: [FFIType.ptr, FFIType.u32], returns: FFIType.ptr },
});

// Konstanten
const GPIOD_LINE_VALUE_ACTIVE = 1;
const GPIOD_LINE_VALUE_INACTIVE = 0;

// Einfacher Output-Liner
export class GpioLine {
  private chip: Pointer;
  private line: Pointer;
  constructor(chipName: string, lineOffset: number, label = "st7735-bun") {
    // chip öffnen
    this.chip = gpiod.symbols.gpiod_chip_open_by_name(CString(chipName));
    if (!this.chip) throw new Error(`gpiod: open chip ${chipName} failed`);
    // line holen
    this.line = gpiod.symbols.gpiod_chip_get_line(this.chip, lineOffset >>> 0);
    if (!this.line) {
      gpiod.symbols.gpiod_chip_close(this.chip);
      throw new Error(`gpiod: get line ${lineOffset} failed`);
    }
    // als output requesten (default low)
    const rc = gpiod.symbols.gpiod_line_request_output(this.line, CString(label), GPIOD_LINE_VALUE_INACTIVE);
    if (rc !== 0) {
      gpiod.symbols.gpiod_chip_close(this.chip);
      throw new Error(`gpiod: request output failed for line ${lineOffset}`);
    }
  }
  high() { this.set(1); }
  low()  { this.set(0); }
  set(v: 0 | 1) {
    const rc = gpiod.symbols.gpiod_line_set_value(this.line, v ? GPIOD_LINE_VALUE_ACTIVE : GPIOD_LINE_VALUE_INACTIVE);
    if (rc !== 0) throw new Error("gpiod: set value failed");
  }
  close() {
    try { gpiod.symbols.gpiod_line_release(this.line); } catch {}
    try { gpiod.symbols.gpiod_chip_close(this.chip); } catch {}
  }
}
