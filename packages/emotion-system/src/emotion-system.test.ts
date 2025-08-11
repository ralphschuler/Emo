import { describe, it, expect } from "bun:test";
import { EmotionSystem, type Frame, type Emotion } from "./index.ts";

class StubGfx {
  buf = new Uint16Array(1);
  setPixel(x: number, y: number, color: number) {
    this.buf[0] = color;
  }
}

describe("EmotionSystem", () => {
  it("plays frames and updates current emotion", async () => {
    const gfx = new StubGfx();
    const frame: Frame = {
      duration: 0,
      draw: (g) => g.setPixel(0, 0, 0xffff),
    };
    const emotion: Emotion = { onMain: { frames: [frame] } };

    const system = new EmotionSystem(gfx as any);
    system.addEmotion("test", emotion);
    await system.play("test");

    expect(system.currentEmotion).toBe("test");
    expect(gfx.buf[0]).toBe(0xffff);
  });

  it("can transition back to idle", async () => {
    const gfx = new StubGfx();
    const system = new EmotionSystem(gfx as any);
    system.addEmotion("test", { onMain: { frames: [] } });
    await system.play("test");
    await system.play("idle");
    expect(system.currentEmotion).toBe("idle");
  });
});
