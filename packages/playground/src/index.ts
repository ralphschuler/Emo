import { ST7789 } from "st7789-driver";
import { Gfx2D } from "st7789-gfx2d";
import { createStateMachine } from "state-machine";
import { rgb, type Color565 } from "color";

const WIDTH = 240;
const HEIGHT = 320;

const lcd = new ST7789({
  width: WIDTH,
  height: HEIGHT,
  device: "/dev/spidev0.0",
  dcPin: 25,
  resetPin: 27,
  backlightPin: 18,
  invert: false,
});

lcd.init();
lcd.setBacklight(true);

const buffer = new Uint16Array(WIDTH * HEIGHT);
const gfx = new Gfx2D({ width: WIDTH, height: HEIGHT, buf: buffer });
const BG = rgb(0, 0, 0);

const centerY = (HEIGHT / 2) | 0;
const leftX = (WIDTH / 4) | 0;
const rightX = ((WIDTH * 3) / 4) | 0;

function translate(points: Array<{ x: number; y: number }>, x: number, y: number) {
  return points.map((p) => ({ x: p.x + x, y: p.y + y }));
}

function drawShape(points: Array<{ x: number; y: number }>, x: number, y: number, color: Color565) {
  gfx.fillPolygon(translate(points, x, y), color);
}

function star(r: number, points = 5, innerRatio = 0.5) {
  const pts: Array<{ x: number; y: number }> = [];
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const angle = (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * innerRatio;
    pts.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
  }
  return pts;
}

function triangle(r: number) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * 2 * Math.PI - Math.PI / 2;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pts;
}

function heart(size = 40, steps = 80) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    pts.push({ x: x * (size / 32), y: -y * (size / 32) });
  }
  return pts;
}

const starPts = star(35, 5, 0.45);
const triPts = triangle(40);
const heartPts = heart(50, 80);

type Emotion = "neutral" | "happy" | "angry" | "surprised" | "love";

function drawEmotion(e: Emotion) {
  gfx.clear(BG);
  switch (e) {
    case "neutral":
      gfx.fillCircle(leftX, centerY, 30, rgb(0, 255, 0));
      gfx.fillCircle(rightX, centerY, 30, rgb(0, 255, 0));
      break;
    case "happy":
      drawShape(starPts, leftX, centerY, rgb(255, 255, 0));
      drawShape(starPts, rightX, centerY, rgb(255, 255, 0));
      break;
    case "angry":
      drawShape(triPts, leftX, centerY, rgb(255, 51, 51));
      drawShape(triPts, rightX, centerY, rgb(255, 51, 51));
      break;
    case "surprised":
      gfx.fillCircle(leftX, centerY, 45, rgb(51, 153, 255));
      gfx.fillCircle(rightX, centerY, 45, rgb(51, 153, 255));
      break;
    case "love":
      drawShape(heartPts, leftX, centerY, rgb(255, 102, 204));
      drawShape(heartPts, rightX, centerY, rgb(255, 102, 204));
      break;
  }
  lcd.pushRect(0, 0, WIDTH, HEIGHT, buffer);
}

const machine = createStateMachine<Emotion, "NEXT", {}>(
  "neutral",
  {
    neutral: { NEXT: { target: "happy" } },
    happy: { NEXT: { target: "angry" } },
    angry: { NEXT: { target: "surprised" } },
    surprised: { NEXT: { target: "love" } },
    love: { NEXT: { target: "neutral" } },
  },
  {}
);

drawEmotion(machine.state);
setInterval(() => {
  machine.send("NEXT");
  drawEmotion(machine.state);
}, 2000);

const cleanup = () => {
  try {
    lcd.setBacklight(false);
  } catch {}
  lcd.dispose();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
