import { Vector2, Mesh } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

const duration = 150;

function blankFrame(): Frame {
  return {
    duration,
    meshes: [],
  };
}

export const None: Emotion = {
  entry: [blankFrame()],
  main: [blankFrame(), blankFrame()],
  leave: [blankFrame()],
};
