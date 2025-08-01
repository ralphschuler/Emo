import { Vector2, Mesh } from "../../Renderer";
import type { Frame } from "../Types";
import { Triangle } from "../../Renderer/Triangle";

const duration = 80;

function rageFrame(jitter: number): Frame {
  const offset = jitter * (Math.random() - 0.5);
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(-40 + offset, 0),
        Triangle(10),
        "rgba(255,0,0,0.3)",
        "#f00",
        2,
      ),
      new Mesh(
        new Vector2(40 - offset, 0),
        Triangle(10),
        "rgba(255,0,0,0.3)",
        "#f00",
        2,
      ),
    ],
  };
}

export const RageEmotion = {
  entry: [rageFrame(0)],
  main: Array.from({ length: 10 }, () => rageFrame(4)),
  leave: [rageFrame(0)],
};
