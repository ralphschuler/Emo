import { Vector2, Mesh } from "../Renderer";

export interface Frame {
  meshes: Mesh[];
  duration: number;
}

export interface Animation {
  frames: Frame[];
}

export interface Emotion {
  onEnter: () => Animation;
  onMain: () => Animation;
  onLeave: () => Animation;
}
