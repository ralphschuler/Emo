import { Framebuffer, colors } from "./Framebuffer";

const { width, height, depth } = Framebuffer.detect("/dev/fb0");
const fb = new Framebuffer("/dev/fb0", width, height, depth, { /* format/stride optional */ });

fb.clear(colors.black);
// Farbverlauf
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    fb.plot(x, y, {
      r: Math.floor((x / width) * 255),
      g: Math.floor((y / height) * 255),
      b: 96,
    });
  }
}
fb.present();
setTimeout(() => fb.close(), 300);
