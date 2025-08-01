import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 100;
const leftX = -40;
const rightX = 40;
const y = 0;

function createEyeFrame(scale: number): Frame {
  const radius = 10 * scale;

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX, y),
        Circle(radius),
        "rgba(0, 0, 0, 0.5)",
        "#0f0",
        1,
      ),
      new Mesh(
        new Vector2(rightX, y),
        Circle(radius),
        "rgba(0, 0, 0, 0.5)",
        "#0f0",
        1,
      ),
    ],
  };
}

function createBlinkFrame(progress: number): Frame {
  const height = 20 * (1 - Math.abs(0.5 - progress) * 2);
  const vertices = [
    new Vector2(-10, 0),
    new Vector2(10, 0),
    new Vector2(10, -height),
    new Vector2(-10, -height),
  ];

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX, y),
        vertices,
        "rgba(0, 0, 0, 0.5)",
        "#0f0",
        1,
      ),
      new Mesh(
        new Vector2(rightX, y),
        vertices,
        "rgba(0, 0, 0, 0.5)",
        "#0f0",
        1,
      ),
    ],
  };
}

function generateBreathFrames(): Frame[] {
  const frames: Frame[] = [];
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const t = Math.sin((i / steps) * Math.PI); // 0 → 1 → 0
    frames.push(createEyeFrame(1 + t * 0.2));
  }
  return frames;
}

function generateBlinkSequence(): Frame[] {
  const frames: Frame[] = [];
  const blinkFrames = 6;
  for (let i = 0; i < blinkFrames; i++) {
    frames.push(createBlinkFrame(i / (blinkFrames - 1)));
  }
  return frames;
}

export const IdleEmotion = {
  entry: generateBreathFrames().slice(0, 5),
  main: [
    ...generateBreathFrames(),
    ...generateBlinkSequence(),
    ...generateBreathFrames(),
  ],
  leave: generateBreathFrames().slice(-5).reverse(),
};
