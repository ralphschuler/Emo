import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 100;
const leftX = -40;
const rightX = 40;
const y = 0;

function happyFrame(scale: number): Frame {
  const radius = 10 * scale;
  return {
    duration,
    meshes: [
      new Mesh(
        new Vector2(leftX, y),
        Circle(radius),
        "rgba(255,255,0,0.2)",
        "#ff0",
        2,
      ),
      new Mesh(
        new Vector2(rightX, y),
        Circle(radius),
        "rgba(255,255,0,0.2)",
        "#ff0",
        2,
      ),
    ],
  };
}

export const HappyEmotion = {
  entry: [happyFrame(0.8), happyFrame(1.0)],
  main: Array.from({ length: 20 }, (_, i) => {
    const t = Math.sin((i / 20) * Math.PI * 2);
    return happyFrame(1 + t * 0.1);
  }),
  leave: [happyFrame(1.0), happyFrame(0.8)],
};
