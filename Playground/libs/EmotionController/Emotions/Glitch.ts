import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 60;
const leftX = -40;
const rightX = 40;
const y = 0;

function glitchFrame(): Frame {
  const radius = 10;
  const dx = (Math.random() - 0.5) * 10;
  const dy = (Math.random() - 0.5) * 10;
  const color = Math.random() > 0.5 ? "#0ff" : "#f0f";
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX + dx, y + dy),
        Circle(radius),
        color,
        "#000",
        1,
      ),
      new Mesh(
        new Vector2(rightX - dx, y - dy),
        Circle(radius),
        color,
        "#000",
        1,
      ),
    ],
  };
}

export const GlitchEmotion = {
  entry: [glitchFrame()],
  main: Array.from({ length: 10 }, () => glitchFrame()),
  leave: [glitchFrame()],
};
