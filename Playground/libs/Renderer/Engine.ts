import { Mesh } from "./Mesh";

/**
 * A callback invoked once per animation frame.  The `delta` is the
 * elapsed time since the last frame in **seconds**.  The `elapsed`
 * parameter is the total time since the engine was started, also in
 * seconds.  The engine instance is passed to allow clients to
 * manipulate meshes on the fly.
 */
export type UpdateCallback = (
  delta: number,
  elapsed: number,
  engine: Engine,
) => void;

/**
 * The rendering engine manages a canvas element and a collection of
 * meshes.  Each frame it clears the canvas, invokes an optional
 * update callback and draws all meshes.  The engine can be started
 * and stopped.
 */
export class Engine {
  /** The canvas element used for rendering. */
  public readonly canvas: HTMLCanvasElement;
  /** The 2D rendering context used for drawing meshes. */
  public readonly ctx: CanvasRenderingContext2D;
  /** The collection of meshes to draw each frame. */
  public meshes: Mesh[] = [];

  private running = false;
  private lastTime = 0;
  private elapsed = 0;
  private frameRequestId: number | null = null;
  private updateCallback?: UpdateCallback;

  /**
   * Construct a new engine.  Either provide an existing canvas or a
   * width and height to create a new canvas and append it to the
   * document body.  Optionally you can pass an update callback and
   * whether to start the engine immediately.
   *
   * @param options Configuration options for the engine.
   */
  constructor(
    options: {
      canvas?: HTMLCanvasElement;
      width?: number;
      height?: number;
      update?: UpdateCallback;
      autoStart?: boolean;
    } = {},
  ) {
    const {
      canvas,
      width = 800,
      height = 600,
      update,
      autoStart = false,
    } = options;
    let c: HTMLCanvasElement;
    if (canvas) {
      c = canvas;
      // If width/height were provided they override the canvas element's
      // existing dimensions.
      c.width = width;
      c.height = height;
    } else {
      c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.style.border = "1px solid #ccc";
      document.body.appendChild(c);
    }
    const ctx = c.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D rendering context not available");
    }
    this.canvas = c;
    this.ctx = ctx;
    this.updateCallback = update;
    if (autoStart) {
      this.start();
    }
  }

  /**
   * Add a mesh to the engine.  The mesh will be drawn each frame.
   *
   * @param mesh The mesh to add.
   */
  public addMesh(mesh: Mesh): void {
    this.meshes.push(mesh);
  }

  /**
   * Remove a mesh from the engine.  If the mesh is not found nothing
   * happens.
   *
   * @param mesh The mesh to remove.
   */
  public removeMesh(mesh: Mesh): void {
    const idx = this.meshes.indexOf(mesh);
    if (idx >= 0) this.meshes.splice(idx, 1);
  }

  /**
   * Set the scene for the engine.  This will replace the current scene
   * with the new one.
   *
   * @param meshes The meshes to set as the scene.
   */
  public setScene(meshes: Mesh[]): void {
    this.meshes = meshes;
  }

  /**
   * Clear the canvas to prepare for a new frame.  Override this
   * method if you wish to implement custom clearing (e.g. partial
   * clearing, background colours, etc.).
   */
  protected clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Start the animation loop.  Does nothing if the engine is
   * already running.
   */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.elapsed = 0;
    const loop = (time: number) => {
      if (!this.running) return;
      const deltaMs = time - this.lastTime;
      this.lastTime = time;
      const deltaSec = deltaMs / 1000;
      this.elapsed += deltaSec;
      // Clear before update
      this.clear();
      // Call user update callback
      if (this.updateCallback) {
        this.updateCallback(deltaSec, this.elapsed, this);
      }
      // Draw all meshes
      for (const mesh of this.meshes) {
        mesh.draw(this.ctx);
      }
      this.frameRequestId = requestAnimationFrame(loop);
    };
    this.frameRequestId = requestAnimationFrame(loop);
  }

  /**
   * Stop the animation loop.  Has no effect if the engine is
   * already stopped.
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }
}
