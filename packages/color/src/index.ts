export type RGBA = { r: number; g: number; b: number; a?: number };
export type Color565 = number;

export const rgba = (r: number, g: number, b: number, a = 255): RGBA => ({
  r,
  g,
  b,
  a,
});

export const toRGB565 = (c: RGBA | number): Color565 => {
  if (typeof c === "number") return c & 0xffff;
  const r = (c.r & 0xf8) << 8;
  const g = (c.g & 0xfc) << 3;
  const b = (c.b & 0xff) >> 3;
  return r | g | b;
};

export const fromRGB565 = (value: Color565): RGBA => {
  const r5 = (value >> 11) & 0x1f;
  const g6 = (value >> 5) & 0x3f;
  const b5 = value & 0x1f;
  const r = (r5 << 3) | (r5 >> 2);
  const g = (g6 << 2) | (g6 >> 4);
  const b = (b5 << 3) | (b5 >> 2);
  return { r, g, b, a: 255 };
};

export const rgb = (r: number, g: number, b: number): Color565 =>
  toRGB565(rgba(r, g, b));

export const rgbHex = (hex: number): Color565 => {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return rgb(r, g, b);
};

export const blend565 = (src: Color565, dst: Color565, alpha: number): Color565 => {
  if (alpha >= 255) return src;
  if (alpha <= 0) return dst;
  const sr = (src >> 11) & 0x1f;
  const sg = (src >> 5) & 0x3f;
  const sb = src & 0x1f;
  const dr = (dst >> 11) & 0x1f;
  const dg = (dst >> 5) & 0x3f;
  const db = dst & 0x1f;
  const r = ((sr * 255) / 31) | 0;
  const g = ((sg * 255) / 63) | 0;
  const b = ((sb * 255) / 31) | 0;
  const R = ((dr * 255) / 31) | 0;
  const G = ((dg * 255) / 63) | 0;
  const B = ((db * 255) / 31) | 0;
  const inv = 255 - alpha;
  const ro = ((r * alpha + R * inv) / 255) | 0;
  const go = ((g * alpha + G * inv) / 255) | 0;
  const bo = ((b * alpha + B * inv) / 255) | 0;
  return rgb(ro, go, bo);
};

export const modulate565 = (a: Color565, b: Color565): Color565 => {
  const ar = (a >> 11) & 0x1f;
  const ag = (a >> 5) & 0x3f;
  const ab = a & 0x1f;
  const br = (b >> 11) & 0x1f;
  const bg = (b >> 5) & 0x3f;
  const bb = b & 0x1f;
  const r = ((ar * br) / 31) | 0;
  const g = ((ag * bg) / 63) | 0;
  const bl = ((ab * bb) / 31) | 0;
  return (r << 11) | (g << 5) | bl;
};
