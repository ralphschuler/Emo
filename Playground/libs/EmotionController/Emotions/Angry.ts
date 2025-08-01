import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 80;
const leftX = -40;
const rightX = 40;
const y = 0;

function angryFrame(jitter: number): Frame {
  const radius = 10;
  const jx = (Math.random() - 0.5) * jitter;
  const jy = (Math.random() - 0.5) * jitter;

  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX + jx, y + jy),
        Circle(radius),
        "rgba(255,0,0,0.3)",
        "#f00",
        2,
      ),
      new Mesh(
        new Vector2(rightX - jx, y - jy),
        Circle(radius),
        "rgba(255,0,0,0.3)",
        "#f00",
        2,
      ),
    ],
  };
}

export const AngryEmotion = {
  entry: [angryFrame(0)],
  main: Array.from({ length: 15 }, () => angryFrame(4)),
  leave: [angryFrame(0)],
};
