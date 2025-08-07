import { Framebuffer, colors } from "./framebuffer";

/** Schnelles HSV→RGB für smooth Color Cycling */
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
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
  };
}

async function main() {
  // Auto-Detect (breite, höhe, depth) aus /sys/class/graphics/fb0
  const det = Framebuffer.detect("/dev/fb0");
  const fb = new Framebuffer("/dev/fb0", det.width, det.height, det.depth);
  console.log("Framebuffer:", det);

  const { width, height } = fb;
  const fps = 30;
  const frameDurationMs = Math.floor(1000 / fps);

  let t = 0; // Zeit/Phase
  let running = true;

  // Sauberes Beenden (Ctrl+C)
  process.on("SIGINT", () => {
    running = false;
    console.log("\nStopping animation…");
  });

  // Kleines Plasma: Summe von Sinuswellen -> Hue, dann HSV->RGB
  const loop = () => {
    if (!running) {
      fb.close();
      return;
    }

    // Hintergrund ggf. „leicht“ abdunkeln für weniger harte Kanten
    // fb.clear({ r: 8, g: 8, b: 10 });

    const scaleX = 0.020;         // Frequenz X
    const scaleY = 0.028;         // Frequenz Y
    const cx = width * 0.5;
    const cy = height * 0.5;

    for (let y = 0; y < height; y++) {
      const yy = (y - cy) * scaleY;
      for (let x = 0; x < width; x++) {
        const xx = (x - cx) * scaleX;

        // Drei Wellen mit Phase t
        const w1 = Math.sin(xx * 2.3 + t * 0.045);
        const w2 = Math.sin(yy * 1.9 - t * 0.037);
        const w3 = Math.sin((xx * 1.2 + yy * 1.4) + t * 0.05);

        // Wert normalisieren und als Hue verwenden
        const v = (w1 + w2 + w3) / 3;           // -1..1
        const hue = (v * 0.5 + 0.5) % 1.0;      // 0..1
        const rgb = hsvToRgb(hue, 0.9, 1.0);    // kräftige Farben

        fb.plot(x, y, rgb);
      }
    }

    fb.present();
    t++;
    setTimeout(loop, frameDurationMs);
  };

  // Start
  fb.clear(colors.black);
  loop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
