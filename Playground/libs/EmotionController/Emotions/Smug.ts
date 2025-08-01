import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 110;

function smugFrame(): Frame {
  const offset = 5;
  const r = 10;

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(-40 + offset, 2),
        Circle(r),
        "rgba(200,200,200,0.2)",
        "#f3c",
        2,
      ),
      new Mesh(
        new Vector2(40 - offset, -2),
        Circle(r),
        "rgba(200,200,200,0.2)",
        "#f3c",
        2,
      ),
    ],
  };
}

export const SmugEmotion = {
  entry: [smugFrame()],
  main: [smugFrame(), smugFrame()],
  leave: [smugFrame()],
};
