import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 80;
const leftX = -40;
const rightX = 40;
const y = 0;

function alertFrame(scale: number, rise: number): Frame {
  const radius = 10 * scale;
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX, y - rise),
        Circle(radius),
        "rgba(255,128,0,0.4)",
        "#fa0",
        2,
      ),
      new Mesh(
        new Vector2(rightX, y - rise),
        Circle(radius),
        "rgba(255,128,0,0.4)",
        "#fa0",
        2,
      ),
    ],
  };
}

export const AlertEmotion = {
  entry: [alertFrame(1, 0), alertFrame(1.2, 3)],
  main: [
    alertFrame(1.3, 5),
    alertFrame(1.2, 3),
    alertFrame(1.1, 1),
    alertFrame(1.3, 5),
  ],
  leave: [alertFrame(1.0, 0)],
};
