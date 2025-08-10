import { dlopen } from "bun:ffi";

export function dlopenFirst(candidates: string[], symbols: Record<string, any>) {
  const errors: string[] = [];
  for (const name of candidates) {
    try {
      return dlopen(name, symbols);
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }
  throw new Error(`dlopen: none of [${candidates.join(", ")}] worked:\n  ${errors.join("\n  ")}`);
}
