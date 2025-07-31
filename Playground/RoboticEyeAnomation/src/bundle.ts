// types.ts
export interface Point {
  x: number;
  y: number;
}

export interface RGBColour {
  r: number;
  g: number;
  b: number;
}

export interface ShapeDefinition {
  pos: Point;
  vertices: Point[];
  color: string;
}

export interface AnimationFrame {
  shapes: ShapeDefinition[];
  duration: number;
}

export interface AnimationSequence {
  frames: AnimationFrame[];
}

export interface AnimationMap {
  [key: string]: AnimationSequence;
}

// shapes.ts

export function circle(r: number, sides = 32): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * 2 * Math.PI;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

export function triangle(r: number): Point[] {
  return circle(r, 3);
}

export function star(r: number, points = 5, innerRatio = 0.5): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * innerRatio;
    out.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
  }
  return out;
}

export function heart(size = 40, points = 80): Point[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x: x * (size / 32), y: -y * (size / 32) };
  });
}

export function exclamationMark(
  size = 40,
  resolution = 20,
  barHeightRatio = 0.6,
  barWidthRatio = 0.15,
  dotSizeRatio = 0.2,
): Point[] {
  const points: Point[] = [];
  const barHeight = size * barHeightRatio;
  const barWidth = size * barWidthRatio;
  const dotRadius = size * dotSizeRatio;
  const totalHeight = barHeight + dotRadius * 2;
  const barTopY = totalHeight / 2;
  const barBottomY = barTopY - barHeight;

  // Rechteck für den Balken (im Uhrzeigersinn)
  points.push({ x: -barWidth / 2, y: barTopY });
  points.push({ x: barWidth / 2, y: barTopY });
  points.push({ x: barWidth / 2, y: barBottomY });
  points.push({ x: -barWidth / 2, y: barBottomY });

  // Punkt unterhalb des Balkens
  const dotCentreY = barBottomY - dotRadius;
  for (const p of circle(dotRadius, resolution)) {
    points.push({ x: p.x, y: p.y + dotCentreY });
  }
  return points;
}

export function questionMark(size = 40, resolution = 60): Point[] {
  const points: Point[] = [];
  const height = size;
  const arcRadius = height * 0.4;
  const stemHeight = height * 0.25;
  const dotRadius = height * 0.08;
  const arcCentreY = height * 0.15;

  // Krümmung/Haken: Bogen von 200° bis –20°
  const startAngle = (200 * Math.PI) / 180;
  const endAngle = (-20 * Math.PI) / 180;
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const angle = startAngle + (endAngle - startAngle) * t;
    const x = Math.cos(angle) * arcRadius;
    const y = Math.sin(angle) * arcRadius + arcCentreY;
    points.push({ x, y });
  }

  // Senkrechte nach unten
  const stemTop = points[points.length - 1];
  const stemBottomY = stemTop.y - stemHeight;
  points.push({ x: stemTop.x, y: stemBottomY });

  // Punkt
  const dotCentreY = stemBottomY - dotRadius * 2;
  for (const p of circle(dotRadius, Math.floor(resolution / 3))) {
    points.push({ x: p.x, y: p.y + dotCentreY });
  }
  return points;
}

export function hashSymbol(
  size = 40,
  barThicknessRatio = 0.15,
  offsetRatio = 0.25,
): Point[] {
  const points: Point[] = [];
  const t = size * barThicknessRatio;
  const offset = size * offsetRatio;
  const half = size / 2;

  // linke vertikale Linie
  points.push({ x: -offset - t / 2, y: half });
  points.push({ x: -offset + t / 2, y: half });
  points.push({ x: -offset + t / 2, y: -half });
  points.push({ x: -offset - t / 2, y: -half });

  // rechte vertikale Linie
  points.push({ x: offset - t / 2, y: half });
  points.push({ x: offset + t / 2, y: half });
  points.push({ x: offset + t / 2, y: -half });
  points.push({ x: offset - t / 2, y: -half });

  // obere horizontale Linie
  points.push({ x: -half, y: offset + t / 2 });
  points.push({ x: half, y: offset + t / 2 });
  points.push({ x: half, y: offset - t / 2 });
  points.push({ x: -half, y: offset - t / 2 });

  // untere horizontale Linie
  points.push({ x: -half, y: -offset + t / 2 });
  points.push({ x: half, y: -offset + t / 2 });
  points.push({ x: half, y: -offset - t / 2 });
  points.push({ x: -half, y: -offset - t / 2 });

  return points;
}

export function dollarSign(
  size = 40,
  resolution = 80,
  amplitudeRatio = 0.25,
): Point[] {
  const points: Point[] = [];
  const amplitude = size * amplitudeRatio;

  // S-Linie von oben nach unten
  for (let i = 0; i < resolution; i++) {
    const t = i / (resolution - 1);
    const y = (0.5 - t) * size;
    const x = amplitude * Math.sin(2 * Math.PI * t + Math.PI / 2);
    points.push({ x, y });
  }

  // durchgehende senkrechte Linie
  points.push({ x: 0, y: size / 2 });
  points.push({ x: 0, y: -size / 2 });

  return points;
}

export function spiral(radius: number, turns = 3, points = 100): Point[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const r = radius * t;
    const angle = t * turns * 2 * Math.PI;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

export function triangleWithExclamation(size = 40): Point[] {
  const outer = triangle(size); // 3 Punkte
  const inner = exclamationMark(size * 0.5); // auf halbe Größe skaliert
  return [...outer, ...inner];
}

export function lightningBolt(size = 40): Point[] {
  const h = size;
  const w = size * 0.4;
  return [
    { x: -w * 0.2, y: h / 2 },
    { x: w * 0.3, y: h * 0.1 },
    { x: -w * 0.25, y: -h * 0.1 },
    { x: w * 0.35, y: -h / 2 },
  ];
}

// system.ts
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

// main.ts
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
canvas.width = 400;
canvas.height = 400;

const animations = {
  calm: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#00b5c7",
            vertices: circle(60),
          },
        ],
      },
    ],
  },
  excited: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#ffcc00",
            vertices: star(60, 8, 0.4),
          },
        ],
      },
    ],
  },
  heartEyes: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#ff3366",
            vertices: heart(50),
          },
        ],
      },
    ],
  },
  // NEUE ANIMATIONEN
  alert: {
    // Ausrufezeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#e74c3c", // ein kräftiges Rot
            vertices: exclamationMark(60),
          },
        ],
      },
    ],
  },
  doubt: {
    // Fragezeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#2980b9", // kühles Blau
            vertices: questionMark(60),
          },
        ],
      },
    ],
  },
  hashTag: {
    // Raute-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#8e44ad", // Violett
            vertices: hashSymbol(60),
          },
        ],
      },
    ],
  },
  rich: {
    // Dollarzeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#27ae60", // sattes Grün
            vertices: dollarSign(60),
          },
        ],
      },
    ],
  },
  spiral: {
    // Spiral-Animation (mehr Punkte = feinere Kurve)
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#16a085", // Türkis
            vertices: spiral(60, 3, 150),
          },
        ],
      },
    ],
  },
  warning: {
    // Dreieck mit Ausrufezeichen (klassisches Warnsymbol)
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#f1c40f", // Gelb wie ein Warnschild
            vertices: triangleWithExclamation(60),
          },
        ],
      },
    ],
  },
  lightning: {
    // Blitz-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#f39c12", // Goldgelb/Orange
            vertices: lightningBolt(60),
          },
        ],
      },
    ],
  },
};

const system = new EyeEmotionSystem(ctx, animations, "calm");

let last = performance.now();
function loop(timestamp: number) {
  const dt = timestamp - last;
  last = timestamp;
  system.update(timestamp);
  system.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

const buttonContainer = document.querySelector<HTMLElement>("[data-buttons]");
if (buttonContainer) {
  // Für jedes Emotion aus dem animations-Objekt einen Button anlegen
  Object.keys(animations).forEach((emotionKey) => {
    const btn = document.createElement("button");
    btn.textContent = emotionKey;
    btn.setAttribute("data-emotion", emotionKey);
    // Beim Klick soll das System die entsprechende Emotion annehmen
    btn.addEventListener("click", () => {
      system.setEmotion(emotionKey);
    });
    buttonContainer.appendChild(btn);
  });
}
