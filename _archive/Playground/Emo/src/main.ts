import {
  EmotionController,
  Alert,
  Angry,
  Curious,
  Dozing,
  Glitch,
  Happy,
  Idle,
  None,
  Pulse,
  Rage,
  Scan,
  Shy,
  Sleepy,
  Smug,
  Thinking,
} from "./EmotionController";

import { Engine } from "./Renderer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const engine = new Engine({
  canvas: canvas,
  width: canvas.width,
  height: canvas.height,
  update: () => {},
  autoStart: true,
});

const emotionController = new EmotionController(engine, {
  alert: Alert,
  angry: Angry,
  curious: Curious,
  dozing: Dozing,
  glitch: Glitch,
  happy: Happy,
  idle: Idle,
  none: None,
  pulse: Pulse,
  rage: Rage,
  scan: Scan,
  shy: Shy,
  sleepy: Sleepy,
  smug: Smug,
  thinking: Thinking,
});
