import { Vector2 } from "../Vector2";

/**
 * Create the vertices of a rectangle centred at the origin.
 * The vertices are returned in clockwise order starting at the
 * top‑left corner.  The rectangle is centred on (0,0).
 *
 * @param width The total width of the rectangle.
 * @param height The total height of the rectangle.
 */
export function Rectangle(width: number, height: number): Vector2[] {
  const w2 = width / 2;
  const h2 = height / 2;
  return [
    new Vector2(-w2, -h2),
    new Vector2(w2, -h2),
    new Vector2(w2, h2),
    new Vector2(-w2, h2),
  ];
}
