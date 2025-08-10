export * from "./st7735.ts";

import { ST7735, toRGB565, rgba } from "./st7735.ts";

const isDirect = (() => {
  try {
    const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
    return entry && entry.href === import.meta.url;
  } catch {
    return false;
  }
})();

if (isDirect) {
  (async () => {
    // — Demo-Parameter: passe Pins & Offsets an dein Board an —
    const lcd = new ST7735({
      width: 128,
      height: 160,
      chipSelect: 0,
      spiMode: 0,
      clockDivider: 12, // 250MHz/12 ~ 20.8MHz
      dcPin: 25,
      resetPin: 27,
      backlightPin: 18,
      invert: true,
      rotation: 0,
      // colOffset: 2,
      // rowOffset: 1,
    });

    try {
      lcd.init();
      lcd.setBacklight(true);

      const W = lcd.width, H = lcd.height;

      // 1) Farbverlauf-Vollbild
      const buf = new Uint16Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const r = (x / (W - 1)) * 255;
          const g = (y / (H - 1)) * 255;
          const b = 180;
          buf[y * W + x] = toRGB565(rgba(r | 0, g | 0, b));
        }
      }
      lcd.pushRect(0, 0, W, H, buf);

      // 2) Simple FPS-Loop mit wechselnden Rects
      let frames = 0;
      let last = Date.now();
      const colA = toRGB565(rgba(255, 80, 40));
      const colB = toRGB565(rgba(30, 30, 50));

      const loop = () => {
        lcd.fillScreen(colB);
        lcd.pushRect(10, 10, 60, 40, colA);
        lcd.pushRect(W - 70, H - 50, 60, 40, colA);

        frames++;
        const now = Date.now();
        if (now - last >= 1000) {
          const fps = (frames * 1000) / (now - last);
          console.log(`FPS: ${fps.toFixed(1)}`);
          frames = 0;
          last = now;
        }
        setImmediate(loop);
      };
      loop();
    } catch (err) {
      console.error("Demo error:", err);
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
