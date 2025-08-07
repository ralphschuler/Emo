import { Vector2 } from "../../Renderer";

export function Drop(radius = 10, height = 20, segments = 24): Vector2[] {
  const verts: Vector2[] = [];

  // Rundung oben
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * t;
    verts.push(
      new Vector2(Math.cos(angle) * radius, -Math.sin(angle) * radius),
    );
  }

  // Spitze unten
  verts.push(new Vector2(0, height));
  return verts;
}
