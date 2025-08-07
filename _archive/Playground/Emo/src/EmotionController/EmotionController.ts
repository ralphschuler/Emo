import { StateMachine } from "../StateMachine";
import { Engine, Mesh } from "../Renderer";
import type { Emotion, Animation } from "./Types";

export class EmotionController {
  private sm: StateMachine<string | "idle">;
  private engine: Engine;
  private activeEmotion: string | null = null;
  private emotionMap: Record<string, Emotion>;

  constructor(engine: Engine, emotionMap: Record<string, Emotion> = {}) {
    this.engine = engine;
    this.sm = new StateMachine();
    this.emotionMap = {};

    for (const key of Object.keys(emotionMap)) {
      this.addEmotion(key, emotionMap[key]);
    }
  }

  /**
   * Dynamisch eine Emotion hinzufügen.
   */
  addEmotion(
    key: string | "idle",
    emotion: Emotion,
    allowedTransitions?: string[],
  ) {
    this.emotionMap[key] = emotion;

    this.sm.addState(key, {
      onEnter: async () => await this.playAnimation(emotion.onEnter()),
      onMain: async () => await this.playAnimation(emotion.onMain()),
      onLeave: async () => await this.playAnimation(emotion.onLeave()),
    });

    if (allowedTransitions) {
      this.sm.setAllowedTransitions(key, allowedTransitions);
    }
  }

  /**
   * Entfernt eine Emotion dynamisch.
   */
  removeEmotion(key: string) {
    delete this.emotionMap[key];
    this.sm.removeState?.(key);
  }

  /**
   * Übergänge explizit setzen.
   */
  setAllowedTransitions(from: string | "idle", to: (string | "idle")[]) {
    this.sm.setAllowedTransitions(from, to);
  }

  /**
   * Startet eine neue Emotion oder stoppt bei `null`.
   */
  async play(emotion: string | "idle", autoLeaveAfterMs?: number) {
    if (this.activeEmotion === emotion) return;
    this.lastEmotion = this.activeEmotion;
    this.activeEmotion = emotion;

    await this.sm.transitionTo(emotion);

    if (autoLeaveAfterMs) {
      setTimeout(() => {
        if (this.sm.getCurrentState() === emotion) {
          this.play("idle");
        }
      }, autoLeaveAfterMs);
    }
  }

  /**
   * Führt eine Animation aus.
   */
  private async playAnimation(animation: Animation): Promise<void> {
    for (const frame of animation.frames) {
      if (this.sm.getCurrentState() !== this.activeEmotion) break;

      const meshes: Mesh[] = frame.shapes.flatMap((shape) =>
        shape.meshes.map((m) => {
          const clone = m.clone();
          clone.position = shape.position.clone();
          return clone;
        }),
      );

      this.engine.setScene(meshes);
      await new Promise((resolve) => setTimeout(resolve, frame.duration));
    }
  }

  getCurrentEmotion(): string | "idle" {
    return this.activeEmotion || "idle";
  }
}
