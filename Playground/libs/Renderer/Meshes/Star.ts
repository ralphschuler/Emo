import { Vector2 } from "../Vector2";

export function Star(r: number, spikes = 5, innerRatio = 0.5): Vector2[] {
  const verts: Vector2[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const len = i % 2 === 0 ? r : r * innerRatio;
    verts.push(new Vector2(Math.cos(angle) * len, Math.sin(angle) * len));
  }
  return verts;
}
