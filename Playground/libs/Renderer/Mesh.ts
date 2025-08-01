import { Vector2 } from "./Vector2";
import { pointInPolygon, clipPolygon } from "./Utilities";

/**
 * A generic mesh consisting of a list of vertex positions relative to
 * the mesh's origin.  The mesh can be translated, rotated and scaled
 * when rendered.
 */
export class Mesh {
  /**
   * The untransformed vertices making up the mesh.  Each vertex
   * position is relative to the origin (0,0) of the mesh.  These
   * vertices should be treated as immutable: do not modify them
   * directly.
   */
  private readonly baseVertices: readonly Vector2[];

  /** Fill colour used when drawing the mesh. */
  public fillColor: string;

  /** Stroke colour used when drawing the mesh. */
  public strokeColor: string;

  /** The line width used when stroking the mesh. */
  public lineWidth: number;

  /** Translation applied to the mesh. */
  public position: Vector2 = new Vector2(0, 0);

  /** Rotation in radians. */
  public rotation: number = 0;

  /** Uniform scale factor. */
  public scaleFactor: number = 1;

  /**
   * Construct a new mesh.
   *
   * @param vertices The vertices making up the mesh.  They are copied
   *                 internally and are not mutated by the mesh.
   * @param fillColor CSS colour string used to fill the mesh interior.
   * @param strokeColor CSS colour string used to stroke the outline.
   * @param lineWidth The width of the outline stroke in canvas units.
   */
  constructor(
    position: Vector2,
    vertices: Vector2[],
    fillColor: string = "rgba(0,0,0,0)",
    strokeColor: string = "#000",
    lineWidth: number = 1,
  ) {
    this.position = position;
    this.baseVertices = vertices.map((v) => v.clone());
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.lineWidth = lineWidth;
  }

  /**
   * Get the transformed vertices according to the mesh's position,
   * rotation and scale.  Returns a new array on each call.
   */
  public getTransformedVertices(): Vector2[] {
    return this.baseVertices.map((v) => {
      // apply scale
      let p: Vector2 = v;
      p = p.scale(this.scaleFactor);
      // apply rotation
      p = p.rotate(this.rotation);
      // apply translation
      p = p.add(this.position);
      return p;
    });
  }

  /**
   * Draw the mesh into a canvas 2D context.  The context is not
   * translated or rotated – transformation is handled internally.
   *
   * @param ctx The 2D drawing context to draw into.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const verts = this.getTransformedVertices();
    if (verts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = this.fillColor;
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    // Only fill if a non‑transparent colour is provided
    if (
      this.fillColor &&
      this.fillColor !== "transparent" &&
      this.fillColor !== "rgba(0,0,0,0)"
    ) {
      ctx.fill();
    }
    ctx.stroke();
  }

  /**
   * Translate the mesh by the given offset.  Returns this mesh for
   * chaining.
   *
   * @param offset The vector by which to translate the mesh.
   */
  public translate(offset: Vector2): this {
    this.position = this.position.add(offset);
    return this;
  }

  /**
   * Rotate the mesh by the given angle in radians.  Positive angles
   * rotate counter‑clockwise.  Returns this mesh for chaining.
   *
   * @param angle The angle in radians.
   */
  public rotateMesh(angle: number): this {
    this.rotation += angle;
    return this;
  }

  /**
   * Scale the mesh uniformly by the given factor.  Returns this mesh
   * for chaining.
   *
   * @param factor The scaling factor.  Values > 1 enlarge the mesh,
   *               values < 1 shrink it.
   */
  public scaleMesh(factor: number): this {
    this.scaleFactor *= factor;
    return this;
  }

  /**
   * Merge this mesh with another mesh. Returns a new mesh that
   * contains all vertices from both meshes, excluding any vertices
   * that are inside the other mesh.
   *
   * @param other The mesh to merge with.
   */
  public merge(other: Mesh): Mesh {
    const ownVerts = this.getTransformedVertices();
    const otherVerts = other.getTransformedVertices();

    const newVerts: Vector2[] = [...ownVerts];

    for (const v of otherVerts) {
      if (!pointInPolygon(v, ownVerts)) {
        newVerts.push(v);
      }
    }

    return new Mesh(newVerts, this.fillColor, this.strokeColor, this.lineWidth);
  }

  /**
   * Clone this mesh.
   * @returns A new mesh with the same vertices, fill color, stroke color, and line width.
   */
  public clone(): Mesh {
    const newVerts = this.getTransformedVertices();
    return new Mesh(
      this.position,
      newVerts,
      this.fillColor,
      this.strokeColor,
      this.lineWidth,
    );
  }

  /**
   * Clip this mesh with another mesh. Returns a new mesh that
   * contains only the vertices that are outside the other mesh.
   *
   * @param other The mesh to clip with.
   */
  public clip(other: Mesh): Mesh {
    const subject = this.getTransformedVertices();
    const clip = other.getTransformedVertices();
    const clippedVerts = clipPolygon(subject, clip);
    return new Mesh(
      this.position,
      clippedVerts,
      this.fillColor,
      this.strokeColor,
      this.lineWidth,
    );
  }
}
