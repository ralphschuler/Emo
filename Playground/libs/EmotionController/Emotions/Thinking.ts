import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 100;
const centerY = 0;

function thinkingFrame(angle: number): Frame {
  const r = 10;
  const orbit = 4;
  const dx = Math.cos(angle) * orbit;
  const dy = Math.sin(angle) * orbit;

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(-40 + dx, centerY + dy),
        Circle(r),
        "rgba(0,0,0,0.2)",
        "#0ff",
        1,
      ),
      new Mesh(
        new Vector2(40 + dx, centerY + dy),
        Circle(r),
        "rgba(0,0,0,0.2)",
        "#0ff",
        1,
      ),
    ],
  };
}

export const ThinkingEmotion = {
  entry: [thinkingFrame(0)],
  main: Array.from({ length: 12 }, (_, i) =>
    thinkingFrame((i / 12) * Math.PI * 2),
  ),
  leave: [thinkingFrame(0)],
};
