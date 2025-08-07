import { ST7789 } from "./st7789";

const lcd = new ST7789({
  spiDevice: "/dev/spidev0.0",
  width: 240,
  height: 320,
  rotation: 0,
  dcPin: 25,     // anpassen!
  rstPin: 27,    // anpassen!
  blPin: 24,     // optional
  speedHz: 31_000_000
});

lcd.init();

// Bildschirm füllen
lcd.fillScreen(lcd.rgb888to565(16, 16, 16));

// Farbbalken
const H = lcd.h, W = lcd.w;
const colors = [
  lcd.rgb888to565(255,0,0),
  lcd.rgb888to565(0,255,0),
  lcd.rgb888to565(0,0,255),
  lcd.rgb888to565(255,255,0),
  lcd.rgb888to565(255,0,255),
  lcd.rgb888to565(0,255,255),
];
const band = Math.floor(H / colors.length);
colors.forEach((c, i) => lcd.fillRect(0, i*band, W, band, c));

// Diagonalpunkte
for (let i = 0; i < Math.min(W, H); i++) {
  lcd.drawPixel(i, i, lcd.rgb888to565(255,255,255));
}

setTimeout(() => lcd.close(), 2000);
