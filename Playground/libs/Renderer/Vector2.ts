/**
 * A simple 2‑D vector class.  Instances are immutable: methods
 * return new vectors rather than mutating the existing instance.
 */
export class Vector2 {
  /** The x coordinate. */
  public readonly x: number;

  /** The y coordinate. */
  public readonly y: number;

  /**
   * Create a new vector.
   *
   * @param x The x component. Defaults to `0`.
   * @param y The y component. Defaults to `0`.
   */
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Make a shallow copy of this vector.
   */
  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * Add another vector to this vector and return the result as a new vector.
   *
   * @param v The vector to add.
   */
  public add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtract another vector from this vector and return the result.
   *
   * @param v The vector to subtract.
   */
  public subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiply both coordinates by a scalar.
   *
   * @param s The scale factor.
   */
  public scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /**
   * Rotate this vector around the origin by the given angle (in radians).
   * Positive angles rotate counter‑clockwise.
   *
   * @param angle The angle in radians.
   */
  public rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  /**
   * Compute the magnitude (length) of the vector.
   */
  public magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Return a unit vector in the same direction as this vector.  If the
   * magnitude is zero the zero vector is returned unchanged.
   */
  public normalized(): Vector2 {
    const m = this.magnitude();
    if (m === 0) return this.clone();
    return this.scale(1 / m);
  }

  /**
   * Create a unit vector at the given angle and optional length.
   *
   * @param angle The direction of the vector in radians.
   * @param length The length of the vector.  Defaults to `1`.
   */
  public static fromAngle(angle: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }
}
