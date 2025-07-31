import { EyeEmotionSystem } from "./system";
import {
  circle,
  star,
  heart,
  exclamationMark,
  questionMark,
  hashSymbol,
  dollarSign,
  spiral,
  triangleWithExclamation,
  lightningBolt,
} from "./shapes";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
canvas.width = 400;
canvas.height = 400;

const animations = {
  calm: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#00b5c7",
            vertices: circle(60),
          },
        ],
      },
    ],
  },
  excited: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#ffcc00",
            vertices: star(60, 8, 0.4),
          },
        ],
      },
    ],
  },
  heartEyes: {
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#ff3366",
            vertices: heart(50),
          },
        ],
      },
    ],
  },
  // NEUE ANIMATIONEN
  alert: {
    // Ausrufezeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#e74c3c", // ein kräftiges Rot
            vertices: exclamationMark(60),
          },
        ],
      },
    ],
  },
  doubt: {
    // Fragezeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#2980b9", // kühles Blau
            vertices: questionMark(60),
          },
        ],
      },
    ],
  },
  hashTag: {
    // Raute-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#8e44ad", // Violett
            vertices: hashSymbol(60),
          },
        ],
      },
    ],
  },
  rich: {
    // Dollarzeichen-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#27ae60", // sattes Grün
            vertices: dollarSign(60),
          },
        ],
      },
    ],
  },
  spiral: {
    // Spiral-Animation (mehr Punkte = feinere Kurve)
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#16a085", // Türkis
            vertices: spiral(60, 3, 150),
          },
        ],
      },
    ],
  },
  warning: {
    // Dreieck mit Ausrufezeichen (klassisches Warnsymbol)
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#f1c40f", // Gelb wie ein Warnschild
            vertices: triangleWithExclamation(60),
          },
        ],
      },
    ],
  },
  lightning: {
    // Blitz-Animation
    frames: [
      {
        duration: 1000,
        shapes: [
          {
            pos: { x: 200, y: 200 },
            color: "#f39c12", // Goldgelb/Orange
            vertices: lightningBolt(60),
          },
        ],
      },
    ],
  },
};

const system = new EyeEmotionSystem(ctx, animations, "calm");

let last = performance.now();
function loop(timestamp: number) {
  const dt = timestamp - last;
  last = timestamp;
  system.update(timestamp);
  system.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

const buttonContainer = document.querySelector<HTMLElement>("[data-buttons]");
if (buttonContainer) {
  // Für jedes Emotion aus dem animations-Objekt einen Button anlegen
  Object.keys(animations).forEach((emotionKey) => {
    const btn = document.createElement("button");
    btn.textContent = emotionKey;
    btn.setAttribute("data-emotion", emotionKey);
    // Beim Klick soll das System die entsprechende Emotion annehmen
    btn.addEventListener("click", () => {
      system.setEmotion(emotionKey);
    });
    buttonContainer.appendChild(btn);
  });
}
