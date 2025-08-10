// src/index.ts
export * from "./st7789.ts";

import { ST7789, toRGB565, rgba } from "./st7789.ts";

// Direktstart-Check (ESM)
const isDirect = (() => {
  try {
    const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
    return entry && entry.href === import.meta.url;
  } catch { return false; }
})();

if (isDirect) {
  (async () => {
    const lcd = new ST7789({
      width: 240,
      height: 320,
      device: "/dev/spidev0.0",
      mode: 0,
      bits: 8,
      speedHz: 20_000_000,   // teste ggf. 24–32 MHz, wenn stabil
      gpioChip: "gpiochip0",
      dcPin: 25,
      resetPin: 27,
      backlightPin: 18,
      invert: true,
      rotation: 270,
      colOffset: 0, rowOffset: 0,
    });

    try {
      lcd.init();
      lcd.setBacklight(true);

      const W = lcd.width, H = lcd.height;

      // Farbverlauf
      const grad = new Uint16Array(W * H);
      for (let y=0; y<H; y++) {
        for (let x=0; x<W; x++) {
          grad[y*W+x] = toRGB565(rgba((x/(W-1))*255|0, (y/(H-1))*255|0, 180));
        }
      }
      lcd.pushRect(0,0,W,H,grad);

      // FPS-Loop
      let frames = 0, last = Date.now();
      const colA = toRGB565(rgba(255, 80, 40));
      const colB = toRGB565(rgba(30, 30, 50));

      const loop = () => {
        lcd.fillScreen(colB);
        lcd.pushRect(10, 10, 60, 40, colA);
        lcd.pushRect(W-70, H-50, 60, 40, colA);

        frames++;
        const now = Date.now();
        if (now - last >= 1000) {
          const fps = (frames*1000)/(now-last);
          console.log(`FPS: ${fps.toFixed(1)}`);
          frames = 0; last = now;
        }
        setImmediate(loop);
      };
      loop();
    } catch (e) {
      console.error("Demo error:", e);
      lcd.dispose();
      process.exit(1);
    }

    process.on("SIGINT", () => {
      console.log("Exiting demo…");
      lcd.dispose();
      process.exit(0);
    });
  })();
}
