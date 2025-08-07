import { dlopen } from "bun:ffi"

const libc = dlopen("libc.so.6", {
  open: { args: ["ptr", "i32", "i32"], returns: "i32" },
  close: { args: ["i32"], returns: "i32" },
  ioctl: { args: ["i32", "u64", "ptr"], returns: "i32" },
  write: { args: ["i32", "ptr", "usize"], returns: "isize" },
  usleep: { args: ["u32"], returns: "i32" }
} as const);

export const { symbols } = libc;
export function cstr(str: string) {
  return Buffer.from(str + "\0", "utf8");
}
