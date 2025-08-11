import { describe, expect, test } from "bun:test";
import { rgba, toRGB565, fromRGB565, rgb, blend565, modulate565 } from "./index";

describe("color conversions", () => {
  test("toRGB565 basic colors", () => {
    expect(toRGB565(rgba(255, 0, 0))).toBe(0xf800);
    expect(toRGB565(rgba(0, 255, 0))).toBe(0x07e0);
    expect(toRGB565(rgba(0, 0, 255))).toBe(0x001f);
  });

  test("round trip preserves approximate color", () => {
    const original = rgba(123, 200, 45);
    const round = fromRGB565(toRGB565(original));
    expect(Math.abs(round.r - original.r)).toBeLessThanOrEqual(8);
    expect(Math.abs(round.g - original.g)).toBeLessThanOrEqual(4);
    expect(Math.abs(round.b - original.b)).toBeLessThanOrEqual(8);
  });
});

describe("rgb helpers", () => {
  test("rgb basic colors", () => {
    expect(rgb(255, 0, 0)).toBe(0xf800);
    expect(rgb(0, 255, 0)).toBe(0x07e0);
    expect(rgb(0, 0, 255)).toBe(0x001f);
  });

  test("blend565 extremes", () => {
    const red = rgb(255, 0, 0);
    const blue = rgb(0, 0, 255);
    expect(blend565(red, blue, 255)).toBe(red);
    expect(blend565(red, blue, 0)).toBe(blue);
  });

  test("modulate565 multiplies channels", () => {
    const red = rgb(255, 0, 0);
    const green = rgb(0, 255, 0);
    const white = rgb(255, 255, 255);
    expect(modulate565(red, white)).toBe(red);
    expect(modulate565(red, green)).toBe(0x0000);
  });
});
