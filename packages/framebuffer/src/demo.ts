import { Framebuffer, colors } from "./framebuffer";

function hsvToRgb(h: number, s: number, v: number) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

async function main() {
  const det = Framebuffer.detect("/dev/fb0");
  const fb = new Framebuffer("/dev/fb0", det.width, det.height, det.depth);
  console.log("Framebuffer:", det);

  const { width, height } = fb;
  const fpsTarget = 30;
  const frameDurationMs = Math.floor(1000 / fpsTarget);

  let t = 0;
  let running = true;

  // FPS-Messung
  let lastTime = performance.now();
  let frames = 0;
  let fps = 0;

  process.on("SIGINT", () => {
    running = false;
    console.log("\nStopping animation…");
  });

  const loop = () => {
    if (!running) {
      fb.close();
      return;
    }

    const scaleX = 0.020;
    const scaleY = 0.028;
    const cx = width * 0.5;
    const cy = height * 0.5;

    for (let y = 0; y < height; y++) {
      const yy = (y - cy) * scaleY;
      for (let x = 0; x < width; x++) {
        const xx = (x - cx) * scaleX;
        const w1 = Math.sin(xx * 2.3 + t * 0.045);
        const w2 = Math.sin(yy * 1.9 - t * 0.037);
        const w3 = Math.sin((xx * 1.2 + yy * 1.4) + t * 0.05);
        const v = (w1 + w2 + w3) / 3;
        const hue = (v * 0.5 + 0.5) % 1.0;
        const rgb = hsvToRgb(hue, 0.9, 1.0);
        fb.plot(x, y, rgb);
      }
    }

    fb.present();
    t++;

    // FPS berechnen
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frames / ((now - lastTime) / 1000);
      frames = 0;
      lastTime = now;
      process.stdout.write(`\rFPS: ${fps.toFixed(1)}   `);
    }

    setTimeout(loop, frameDurationMs);
  };

  fb.clear(colors.black);
  loop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
