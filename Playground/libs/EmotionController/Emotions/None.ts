import { Vector2, Mesh } from "../../Renderer";
import type { Frame } from "../Types";

const duration = 150;

function blankFrame(): Frame {
  return {
    duration,
    meshes: [],
  };
}

export const BlankEmotion = {
  entry: [blankFrame()],
  main: [blankFrame(), blankFrame()],
  leave: [blankFrame()],
};
