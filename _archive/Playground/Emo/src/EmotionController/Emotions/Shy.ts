import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

const duration = 120;
const leftX = -40;
const rightX = 40;
const y = 0;

function shyFrame(scale = 0.7, offset = 6): Frame {
  const radius = 10 * scale;
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX - offset, y + offset),
        Circle(radius),
        "rgba(0,0,0,0.2)",
        "#ccc",
        1,
      ),
      new Mesh(
        new Vector2(rightX - offset, y + offset),
        Circle(radius),
        "rgba(0,0,0,0.2)",
        "#ccc",
        1,
      ),
    ],
  };
}

export const Shy: Emotion = {
  entry: [shyFrame(1.0, 0), shyFrame(0.9, 3)],
  main: [shyFrame(0.8, 6), shyFrame(0.75, 6)],
  leave: [shyFrame(0.9, 3), shyFrame(1.0, 0)],
};
