import { Vector2 } from "../Vector2";

export function Heart(radius: number): Vector2[] {
  const verts: Vector2[] = [];
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );
    verts.push(new Vector2((x * radius) / 20, (y * radius) / 20));
  }
  return verts;
}
