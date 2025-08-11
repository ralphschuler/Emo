import { describe, expect, test } from "bun:test";
import { clamp } from "./util";

describe("gfx2d util functions", () => {
  test("clamp bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
