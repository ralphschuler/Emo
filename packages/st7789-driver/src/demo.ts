import { ST7789 } from "./index";

const lcd = new ST7789({
  spiDevice: "/dev/spidev0.0",
  width: 240,
  height: 320,
  rotation: 0,
  dcPin: 25,
  rstPin: 27,
  blPin: 24,
  speedHz: 31_000_000,
});

lcd.init();
lcd.fillScreen(lcd.rgb888to565(8,8,8));
const colors = [
  lcd.rgb888to565(255,0,0),
  lcd.rgb888to565(0,255,0),
  lcd.rgb888to565(0,0,255),
  lcd.rgb888to565(255,255,0),
  lcd.rgb888to565(255,0,255),
  lcd.rgb888to565(0,255,255),
];
const band = Math.floor(lcd.h / colors.length);
colors.forEach((c, i) => lcd.fillRect(0, i*band, lcd.w, band, c));
for (let i = 0; i < Math.min(lcd.w, lcd.h); i++) {
  lcd.drawPixel(i, i, lcd.rgb888to565(255,255,255));
}
setTimeout(() => lcd.close(), 1500);
