import { Vector2, Mesh, Circle, Rectangle } from "../../Renderer";
import type { Emotion, Frame } from "../Types";

function createScanFrame(progress: number): Frame {
  const duration = 100;

  // Bewegung von links nach rechts über den Verlauf
  const moveX = -50 + progress * 100; // von -50 nach +50
  const moveY = Math.sin(progress * Math.PI * 2) * 10; // leichtes Wackeln

  const glassCenter = new Vector2(moveX, moveY);
  const handleOffset = new Vector2(20, 30);

  const meshes: Mesh[] = [];

  // 1. Glas
  meshes.push(
    new Mesh(glassCenter, Circle(20), "rgba(180, 220, 255, 0.3)", "#88c", 1.5),
  );

  // 2. Rand
  meshes.push(new Mesh(glassCenter, Circle(22), "transparent", "#444", 2));

  // 3. Griff
  const grip = Rectangle(8, 25);
  meshes.push(
    new Mesh(glassCenter.add(handleOffset), grip, "#555", "#222", 1).rotate(45),
  );

  return {
    duration,
    meshes,
  };
}

export const Scan: Emotion = {
  entry: [createScanFrame(0)],
  main: Array.from({ length: 20 }, (_, i) => createScanFrame(i / 19)),
  leave: [createScanFrame(1)],
};
