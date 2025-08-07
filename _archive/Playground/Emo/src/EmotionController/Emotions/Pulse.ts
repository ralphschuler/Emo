import { Vector2, Mesh, Circle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

const duration = 90;

function pulseFrame(scale: number): Frame {
  const r = 10 * scale;
  return {
    duration,
    meshes: [
      new Mesh(new Vector2(-40, 0), Circle(r), "rgba(255,0,0,0.2)", "#f00", 2),
      new Mesh(new Vector2(40, 0), Circle(r), "rgba(255,0,0,0.2)", "#f00", 2),
    ],
  };
}

export const Pulse: Emotion = {
  entry: [pulseFrame(1.0)],
  main: [pulseFrame(1.2), pulseFrame(0.8), pulseFrame(1.0)],
  leave: [pulseFrame(1.0)],
};
