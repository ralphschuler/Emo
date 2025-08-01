import { Vector2 } from "../Vector2";

/**
 * Create a line segment between two points.
 *
 * @param start The starting point of the line.
 * @param end The ending point of the line.
 */
export function Line(start: Vector2, end: Vector2): Vector2[] {
  return [start, end];
}
