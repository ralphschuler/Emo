import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

// Hilfsfunktion zur Erzeugung eines gleichseitigen Dreiecks
function createWarningTriangle(scale = 1): Vector2[] {
  const size = 20 * scale;
  const h = (Math.sqrt(3) / 2) * size;

  return [
    new Vector2(0, -h / 2),
    new Vector2(-size / 2, h / 2),
    new Vector2(size / 2, h / 2),
  ];
}

// Hilfsfunktion für das Ausrufezeichen
function createExclamationMark(yOffset: number): Mesh[] {
  return [
    new Mesh(
      new Vector2(0, yOffset - 5),
      [
        new Vector2(-1.5, -5),
        new Vector2(1.5, -5),
        new Vector2(1.5, 5),
        new Vector2(-1.5, 5),
      ],
      "#fff",
      "#fff",
      0,
    ),
    new Mesh(new Vector2(0, yOffset + 10), Circle(2), "#fff", "#fff", 0),
  ];
}

const duration = 80;
const leftX = -40;
const rightX = 40;
const y = 0;

function alertFrame(
  scale: number,
  rise: number,
  triangleScale: number = 1,
): Frame {
  const radius = 10 * scale;
  const centerY = y - rise;

  const meshes: Mesh[] = [
    new Mesh(
      new Vector2(leftX, centerY),
      Circle(radius),
      "rgba(255,128,0,0.4)",
      "#fa0",
      2,
    ),
    new Mesh(
      new Vector2(rightX, centerY),
      Circle(radius),
      "rgba(255,128,0,0.4)",
      "#fa0",
      2,
    ),
    new Mesh(
      new Vector2(0, centerY),
      createWarningTriangle(triangleScale),
      "#fa0",
      "#000",
      1.5,
    ),
    ...createExclamationMark(centerY),
  ];

  return { duration, meshes };
}

export const Alert: Emotion = {
  onEnter: () => ({
    frames: [
      alertFrame(1, 0, 0.2),
      alertFrame(1.2, 3, 0.6),
      alertFrame(1.3, 5, 1.0),
    ],
  }),
  onMain: () => ({
    frames: [
      alertFrame(1.3, 5, 1.0),
      alertFrame(1.2, 3, 0.9),
      alertFrame(1.1, 1, 0.8),
      alertFrame(1.3, 5, 1.0),
    ],
  }),
  onLeave: () => ({
    frames: [alertFrame(1.1, 1, 0.5), alertFrame(1.0, 0, 0.2)],
  }),
};
