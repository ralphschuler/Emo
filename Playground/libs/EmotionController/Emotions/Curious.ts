import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 120;
const leftX = -40;
const rightX = 40;
const y = 0;

function curiousFrame(offset: number): Frame {
  const radius = 10;
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX + offset, y),
        Circle(radius),
        "rgba(0,0,0,0.5)",
        "#0ff",
        1,
      ),
      new Mesh(
        new Vector2(rightX + offset, y),
        Circle(radius),
        "rgba(0,0,0,0.5)",
        "#0ff",
        1,
      ),
    ],
  };
}

export const CuriousEmotion = {
  entry: [curiousFrame(0)],
  main: [curiousFrame(-5), curiousFrame(0), curiousFrame(5), curiousFrame(0)],
  leave: [curiousFrame(0)],
};
