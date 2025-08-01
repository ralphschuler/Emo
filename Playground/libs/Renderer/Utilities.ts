import { Vector2 } from "./Vector2";

export function pointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-10) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function clipPolygon(subject: Vector2[], clip: Vector2[]): Vector2[] {
  let output = [...subject];

  for (let i = 0; i < clip.length; i++) {
    const input = [...output];
    output = [];

    const A = clip[i];
    const B = clip[(i + 1) % clip.length];

    for (let j = 0; j < input.length; j++) {
      const P = input[j];
      const Q = input[(j + 1) % input.length];

      const inside = (p: Vector2) =>
        (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x) >= 0;

      const intersect = (): Vector2 => {
        const dx1 = Q.x - P.x;
        const dy1 = Q.y - P.y;
        const dx2 = B.x - A.x;
        const dy2 = B.y - A.y;
        const denominator = dx1 * dy2 - dy1 * dx2;
        if (denominator === 0) return P.clone();
        const t = ((A.x - P.x) * dy2 - (A.y - P.y) * dx2) / denominator;
        return new Vector2(P.x + t * dx1, P.y + t * dy1);
      };

      const Pinside = inside(P);
      const Qinside = inside(Q);

      if (Pinside && Qinside) {
        output.push(Q);
      } else if (Pinside && !Qinside) {
        output.push(intersect());
      } else if (!Pinside && Qinside) {
        output.push(intersect());
        output.push(Q);
      }
    }
  }

  return output;
}
