import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 150;

function dozingFrame(step: number): Frame {
  const r = 10;
  const lidHeight = step;
  const drop = step;

  const lid = (x: number) =>
    new Mesh(
      new Vector2(x, drop),
      [
        new Vector2(-10, -lidHeight),
        new Vector2(10, -lidHeight),
        new Vector2(10, 0),
        new Vector2(-10, 0),
      ],
      "rgba(0,0,0,0.4)",
      "#333",
      1,
    );

  return {
    duration,
    meshes: [
      new Mesh(new Vector2(-40, drop), Circle(r), "#111", "#aaa", 1),
      new Mesh(new Vector2(40, drop), Circle(r), "#111", "#aaa", 1),
      lid(-40),
      lid(40),
    ],
  };
}

export const DozingEmotion = {
  entry: [dozingFrame(0), dozingFrame(3)],
  main: [dozingFrame(5), dozingFrame(8), dozingFrame(10), dozingFrame(8)],
  leave: [dozingFrame(3), dozingFrame(0)],
};
