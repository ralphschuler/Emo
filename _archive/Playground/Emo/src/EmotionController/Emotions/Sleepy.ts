import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

const duration = 150;
const leftX = -40;
const rightX = 40;
const y = 0;

function sleepyFrame(drop: number, lid: number): Frame {
  const radius = 10;
  const lidHeight = lid;

  const lidMesh = (x: number) =>
    new Mesh(
      new Vector2(x, y + drop),
      [
        new Vector2(-10, -lidHeight),
        new Vector2(10, -lidHeight),
        new Vector2(10, 0),
        new Vector2(-10, 0),
      ],
      "rgba(0, 0, 0, 0.5)",
      "#00f",
      1,
    );

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX, y + drop),
        Circle(radius),
        "rgba(0,0,64,0.2)",
        "#00f",
        1,
      ),
      new Mesh(
        new Vector2(rightX, y + drop),
        Circle(radius),
        "rgba(0,0,64,0.2)",
        "#00f",
        1,
      ),
      lidMesh(leftX),
      lidMesh(rightX),
    ],
  };
}

export const Sleepy: Emotion = {
  entry: [sleepyFrame(0, 0), sleepyFrame(3, 4)],
  main: [
    sleepyFrame(5, 6),
    sleepyFrame(6, 8),
    sleepyFrame(7, 10),
    sleepyFrame(6, 8),
    sleepyFrame(5, 6),
  ],
  leave: [sleepyFrame(3, 4), sleepyFrame(0, 0)],
};
