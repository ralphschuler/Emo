import { Vector2 } from "../Vector2";

export function Ellipse(rx: number, ry: number, segments = 32): Vector2[] {
  const verts: Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    verts.push(new Vector2(Math.cos(angle) * rx, Math.sin(angle) * ry));
  }
  return verts;
}
