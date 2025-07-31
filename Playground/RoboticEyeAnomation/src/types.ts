export interface Point {
  x: number;
  y: number;
}

export interface RGBColour {
  r: number;
  g: number;
  b: number;
}

export interface ShapeDefinition {
  pos: Point;
  vertices: Point[];
  color: string;
}

export interface AnimationFrame {
  shapes: ShapeDefinition[];
  duration: number;
}

export interface AnimationSequence {
  frames: AnimationFrame[];
}

export interface AnimationMap {
  [key: string]: AnimationSequence;
}
