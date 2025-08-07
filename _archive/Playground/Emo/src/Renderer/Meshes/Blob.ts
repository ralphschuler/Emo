import { Vector2 } from "../../Renderer";

export function Blob(
  radius = 10,
  wobble = 3,
  spikes = 6,
  segments = 64,
): Vector2[] {
  const verts: Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = t * 2 * Math.PI;
    const r = radius + Math.sin(angle * spikes) * wobble;
    verts.push(new Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
  }
  return verts;
}
