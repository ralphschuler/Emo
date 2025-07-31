import type { Point } from "./types";

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
