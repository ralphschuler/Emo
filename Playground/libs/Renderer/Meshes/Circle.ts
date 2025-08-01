import { Vector2 } from "../Vector2";

/**
 * Create the vertices of a circle centred at the origin.
 * The vertices are returned in clockwise order starting at the
 * top‑left corner.  The circle is centred on (0,0).
 *
 * @param radius The radius of the circle.
 */
export function Circle(radius: number): Vector2[] {
  const vertices: Vector2[] = [];
  const numVertices = 32;
  const angleStep = (Math.PI * 2) / numVertices;

  for (let i = 0; i < numVertices; i++) {
    const angle = i * angleStep;
    vertices.push(
      new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius),
    );
  }

  return vertices;
}
