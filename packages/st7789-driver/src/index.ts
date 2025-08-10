export * from "./st7789.ts";

import { ST7789, type ST7789Rotation } from "./st7789.ts";
import { runDemo } from "./demo.ts";

function getArg(name:string, def:string){
  const i = process.argv.findIndex(a => a === `--${name}`);
  if (i >= 0 && i+1 < process.argv.length) return process.argv[i+1];
  return def;
}

const isDirect = (() => {
  try {
    const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
    return entry && entry.href === import.meta.url;
  } catch { return false; }
})();

if (isDirect) {
  const speedHz = Number(getArg("speed", "512000000"));
  const rotation = Number(getArg("rotation", "0")) as ST7789Rotation;
  const hueSpeed = Number(getArg("hueSpeed", "100"));

  const lcd = new ST7789({
    width: 240,
    height: 320,
    device: "/dev/spidev0.0",
    mode: 0,
    bits: 8,
    speedHz,
    gpioChip: "gpiochip0",
    dcPin: 25,
    resetPin: 27,
    backlightPin: 18,
    invert: false,
    rotation,
    colOffset: 0,
    rowOffset: 0,
  });

  runDemo(lcd, hueSpeed).catch(err => {
    console.error("Demo error:", err);
    try { lcd.setBacklight(false); } catch {}
    lcd.dispose();
    process.exit(1);
  });

  const cleanup = () => {
    try { lcd.setBacklight(false); } catch {}
    lcd.dispose();
    process.exit(0);
  };
  process.on("SIGINT",  cleanup);
  process.on("SIGTERM", cleanup);
}
