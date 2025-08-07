import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

const duration = 80;
const leftX = -40;
const rightX = 40;
const y = 0;
const radius = 10;

const symbols = ["#", "!", "?", "%"] as const;

function randSymbol(): (center: Vector2) => Mesh[] {
  const choice = symbols[Math.floor(Math.random() * symbols.length)];
  switch (choice) {
    case "#":
      return createSymbolHash;
    case "!":
      return createSymbolExclamation;
    case "?":
      return createSymbolQuestion;
    case "%":
      return createSymbolPercent;
  }
}

function angryFrame(jitter: number): Frame {
  const jx = (Math.random() - 0.5) * jitter;
  const jy = (Math.random() - 0.5) * jitter;

  const leftPos = new Vector2(leftX + jx, y + jy);
  const rightPos = new Vector2(rightX - jx, y - jy);

  const meshes: Mesh[] = [
    new Mesh(leftPos, Circle(radius), "rgba(255,0,0,0.3)", "#f00", 2),
    new Mesh(rightPos, Circle(radius), "rgba(255,0,0,0.3)", "#f00", 2),
    ...randSymbol()(leftPos),
    ...randSymbol()(rightPos),
  ];

  return { duration, meshes };
}

export const Angry: Emotion = {
  onended: () => ({ frames: [angryFrame(0)] }),
  onMain: () => ({
    frames: Array.from({ length: 15 }, () => angryFrame(4)),
  }),
  onLeave: () => ({ frames: [angryFrame(0)] }),
};

// ───────────────────────────────────────────────
// Symbol-Funktionen – jeder gibt 1+ Meshes zurück
// ───────────────────────────────────────────────

function createSymbolHash(center: Vector2): Mesh[] {
  const lines = [
    // Vertikale Linien
    [-4, -6, -4, 6],
    [4, -6, 4, 6],
    // Horizontale Linien
    [-6, -3, 6, -3],
    [-6, 3, 6, 3],
  ];
  return lines.map(
    ([x1, y1, x2, y2]) =>
      new Mesh(
        center,
        [new Vector2(x1, y1), new Vector2(x2, y2)],
        "#f00",
        "#f00",
        1,
      ),
  );
}

function createSymbolExclamation(center: Vector2): Mesh[] {
  return [
    new Mesh(
      center,
      [new Vector2(0, -6), new Vector2(0, 4)],
      "#f00",
      "#f00",
      1.5,
    ),
    new Mesh(center.add(new Vector2(0, 7)), Circle(1.5), "#f00", "#f00", 0),
  ];
}

function createSymbolQuestion(center: Vector2): Mesh[] {
  return [
    new Mesh(
      center,
      [
        new Vector2(-3, -4),
        new Vector2(0, -6),
        new Vector2(3, -4),
        new Vector2(0, -2),
      ],
      "#f00",
      "#f00",
      1.5,
    ),
    new Mesh(center.add(new Vector2(0, 6)), Circle(1.5), "#f00", "#f00", 0),
  ];
}

function createSymbolPercent(center: Vector2): Mesh[] {
  return [
    new Mesh(
      center,
      [new Vector2(-5, 5), new Vector2(5, -5)],
      "#f00",
      "#f00",
      1.5,
    ),
    new Mesh(center.add(new Vector2(-4, -4)), Circle(2), "#f00", "#f00", 0),
    new Mesh(center.add(new Vector2(4, 4)), Circle(2), "#f00", "#f00", 0),
  ];
}
