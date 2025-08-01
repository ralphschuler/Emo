import { Vector2, Mesh } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 60;

function scanFrame(posY: number): Frame {
  const bar = [
    new Vector2(-50, -1 + posY),
    new Vector2(50, -1 + posY),
    new Vector2(50, 1 + posY),
    new Vector2(-50, 1 + posY),
  ];

  return {
    duration,
    meshes: [new Mesh(new Vector2(0, 0), bar, "rgba(0,255,0,0.3)", "#0f0", 1)],
  };
}

export const ScanEmotion = {
  entry: [scanFrame(-10)],
  main: Array.from({ length: 10 }, (_, i) => scanFrame(-10 + i * 2)),
  leave: [scanFrame(10)],
};
