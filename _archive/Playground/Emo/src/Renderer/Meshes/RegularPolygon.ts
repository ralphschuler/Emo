import { Vector2 } from "../Vector2";

/**
 * Create the vertices of a rectangle centred at the origin.
 * The vertices are returned in clockwise order starting at the
 * top‑left corner.  The rectangle is centred on (0,0).
 *
 * @param width The total width of the rectangle.
 * @param height The total height of the rectangle.
 */
export function RegularPolygon(sides: number, radius: number): Vector2[] {
  if (sides < 3) {
    throw new Error("A polygon must have at least three sides");
  }
  const verts: Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    verts.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return verts;
}
