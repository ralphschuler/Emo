import type {
  Point,
  RGBColour,
  ShapeDefinition,
  AnimationFrame,
  AnimationSequence,
  AnimationMap,
} from "./types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hexToRgb(hex: string): RGBColour {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned =
      cleaned[0] +
      cleaned[0] +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

export function lerpColor(c1: RGBColour, c2: RGBColour, t: number): RGBColour {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

export function resamplePoints(points: Point[], count: number): Point[] {
  if (points.length === count) return points.map((p) => ({ ...p }));

  const closed = points.concat([points[0]]);
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const dx = closed[i + 1].x - closed[i].x;
    const dy = closed[i + 1].y - closed[i].y;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    total += len;
  }

  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const dist = (i / count) * total;
    let accum = 0,
      seg = 0;
    while (seg < segLengths.length && accum + segLengths[seg] < dist) {
      accum += segLengths[seg++];
    }
    const segDist = dist - accum;
    const t = segLengths[seg] > 0 ? segDist / segLengths[seg] : 0;
    const p0 = closed[seg],
      p1 = closed[seg + 1];
    out.push({ x: lerp(p0.x, p1.x, t), y: lerp(p0.y, p1.y, t) });
  }
  return out;
}

export function centroid(shape: ShapeDefinition): Point {
  let cx = 0,
    cy = 0;
  for (const p of shape.vertices) {
    cx += p.x + shape.pos.x;
    cy += p.y + shape.pos.y;
  }
  return { x: cx / shape.vertices.length, y: cy / shape.vertices.length };
}

interface ShapePair {
  startIndex: number;
  targetIndex: number;
}

interface DrawableShape {
  points: Point[];
  color: string;
}

export class EyeEmotionSystem {
  private ctx: CanvasRenderingContext2D;
  private unifyCount: number;
  private animations: AnimationMap = {};
  private emotionColours: { [key: string]: RGBColour } = {};
  private currentEmotion: string;
  private targetEmotion: string | null = null;
  private morphing = false;
  private morphStartTime = 0;
  private readonly MORPH_DURATION = 400;
  private startShapes: ShapeDefinition[] | null = null;
  private startColour: RGBColour | null = null;
  private targetColour: RGBColour | null = null;
  private startPairs: ShapePair[] | null = null;
  private cycleStartTime: number;
  private shapesToDraw: DrawableShape[] = [];

  constructor(
    ctx: CanvasRenderingContext2D,
    animations: AnimationMap,
    initialEmotion: string,
    unifyCount = 64,
  ) {
    this.ctx = ctx;
    this.unifyCount = unifyCount;
    this.currentEmotion = initialEmotion;
    this.cycleStartTime = performance.now();

    Object.entries(animations).forEach(([key, anim]) =>
      this.addEmotion(key, anim),
    );

    if (!this.animations[initialEmotion])
      throw new Error(`Unknown emotion '${initialEmotion}'`);
  }

  public addEmotion(key: string, animation: AnimationSequence): void {
    const processedFrames: AnimationFrame[] = [];
    let baseColour: RGBColour | null = null;
    for (const frame of animation.frames) {
      const newShapes = frame.shapes.map((shape) => {
        if (!baseColour) baseColour = hexToRgb(shape.color);
        return {
          pos: { ...shape.pos },
          color: shape.color,
          vertices: resamplePoints(shape.vertices, this.unifyCount),
        };
      });
      processedFrames.push({ shapes: newShapes, duration: frame.duration });
    }
    this.animations[key] = { frames: processedFrames };
    this.emotionColours[key] = baseColour || { r: 255, g: 255, b: 255 };
  }

  public setEmotion(key: string): void {
    if (!this.animations[key] || key === this.currentEmotion || this.morphing)
      return;
    const now = performance.now();
    const { shapes } = this.getCurrentFrame(now);
    this.startShapes = shapes.map((shape) => ({
      pos: { ...shape.pos },
      color: shape.color,
      vertices: shape.vertices.map((p) => ({ ...p })),
    }));
    this.startColour = this.emotionColours[this.currentEmotion];
    this.targetColour = this.emotionColours[key];
    this.targetEmotion = key;
    this.morphStartTime = now;
    this.morphing = true;
    this.startPairs = null;
  }

  public update(timestamp: number): void {
    this.shapesToDraw = [];
    if (this.morphing && this.targetEmotion) {
      const t = Math.min(
        1,
        (timestamp - this.morphStartTime) / this.MORPH_DURATION,
      );
      if (!this.startShapes) return;
      const targetShapes = this.animations[this.targetEmotion].frames[0].shapes;
      if (!this.startPairs) {
        this.startPairs = this.computePairs(this.startShapes, targetShapes);
      }
      for (const { startIndex, targetIndex } of this.startPairs) {
        const s = this.startShapes[startIndex];
        const tShape = targetShapes[targetIndex];
        const points: Point[] = s.vertices.map((v, i) => ({
          x:
            v.x +
            s.pos.x +
            (tShape.vertices[i].x + tShape.pos.x - (v.x + s.pos.x)) * t,
          y:
            v.y +
            s.pos.y +
            (tShape.vertices[i].y + tShape.pos.y - (v.y + s.pos.y)) * t,
        }));
        const color =
          this.startColour && this.targetColour
            ? lerpColor(this.startColour, this.targetColour, t)
            : { r: 255, g: 255, b: 255 };
        this.shapesToDraw.push({
          points,
          color: `rgb(${color.r},${color.g},${color.b})`,
        });
      }
      if (t >= 1) {
        this.currentEmotion = this.targetEmotion;
        this.targetEmotion = null;
        this.morphing = false;
        this.cycleStartTime = timestamp;
      }
    } else {
      const { shapes } = this.getCurrentFrame(timestamp);
      for (const shape of shapes) {
        this.shapesToDraw.push({
          points: shape.vertices.map((v) => ({
            x: v.x + shape.pos.x,
            y: v.y + shape.pos.y,
          })),
          color: shape.color,
        });
      }
    }
  }

  public draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const { points, color } of this.shapesToDraw) {
      if (!points.length) continue;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  private getCurrentFrame(timestamp: number) {
    const frames = this.animations[this.currentEmotion].frames;
    const total = frames.reduce((a, f) => a + f.duration, 0);
    const mod = (timestamp - this.cycleStartTime) % total;
    let accum = 0;
    for (const frame of frames) {
      if (mod < accum + frame.duration) return frame;
      accum += frame.duration;
    }
    return frames[frames.length - 1];
  }

  private computePairs(
    start: ShapeDefinition[],
    target: ShapeDefinition[],
  ): ShapePair[] {
    const pairs: ShapePair[] = [];
    const used = new Set<number>();
    const sc = start.map(centroid);
    const tc = target.map(centroid);
    for (let i = 0; i < start.length; i++) {
      let min = Infinity,
        index = 0;
      for (let j = 0; j < target.length; j++) {
        if (used.has(j)) continue;
        const dx = sc[i].x - tc[j].x;
        const dy = sc[i].y - tc[j].y;
        const dist = dx * dx + dy * dy;
        if (dist < min) {
          min = dist;
          index = j;
        }
      }
      used.add(index);
      pairs.push({ startIndex: i, targetIndex: index });
    }
    return pairs;
  }
}
