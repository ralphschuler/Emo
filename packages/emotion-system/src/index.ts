import {
  createStateMachine,
  type StateConfig,
  type StateMachine,
} from "../../state-machine/src/index.ts";
import type { Gfx2D } from "../../st7789-gfx2d/src/gfx2d.ts";

export interface Frame {
  duration: number;
  draw: (gfx: Gfx2D) => void;
}

export interface Animation {
  frames: Frame[];
}

export interface Emotion {
  onEnter?: Animation;
  onMain: Animation;
  onLeave?: Animation;
}

export type EmotionKey = string | "idle";

interface Ctx {
  system: EmotionSystem;
}

/**
 * EmotionSystem manages named emotions and plays their animations using a state machine.
 */
export class EmotionSystem {
  private config: StateConfig<EmotionKey, EmotionKey, Ctx, EmotionKey> = {};
  private sm: StateMachine<EmotionKey, EmotionKey, Ctx, EmotionKey>;
  private emotions = new Map<EmotionKey, Emotion>();
  private current: EmotionKey;
  private currentPromise: Promise<void> = Promise.resolve();

  constructor(private gfx: Gfx2D, initial: EmotionKey = "idle") {
    this.current = initial;
    this.config[initial] = {};
    this.sm = createStateMachine(initial, this.config, { system: this });
    // ensure initial state exists even if no emotion defined
    this.emotions.set(initial, { onMain: { frames: [] } });
  }

  /**
     * Register a new emotion.
     */
  addEmotion(key: EmotionKey, emotion: Emotion) {
    this.emotions.set(key, emotion);
    if (!this.config[key]) this.config[key] = {};

    // create transitions from every state to the new one and vice versa
    for (const state of Object.keys(this.config) as EmotionKey[]) {
      this.config[state][key] = {
        target: key,
        action: (ctx) => {
          ctx.system.current = key;
          ctx.system.currentPromise = ctx.system.playEmotion(key);
        },
      };
      this.config[key][state] = {
        target: state,
        action: (ctx) => {
          ctx.system.current = state;
          ctx.system.currentPromise = ctx.system.playEmotion(state);
        },
      };
    }
  }

  /**
     * Play an emotion by name. Returns a promise that resolves when the emotion's
     * animations complete.
     */
  play(key: EmotionKey): Promise<void> {
    this.sm.send(key, key);
    return this.currentPromise;
  }

  get currentEmotion(): EmotionKey {
    return this.current;
  }

  private async playEmotion(key: EmotionKey): Promise<void> {
    const emo = this.emotions.get(key);
    if (!emo) return;
    if (emo.onEnter) await this.playAnimation(emo.onEnter);
    await this.playAnimation(emo.onMain);
    if (emo.onLeave) await this.playAnimation(emo.onLeave);
  }

  private async playAnimation(animation: Animation): Promise<void> {
    for (const frame of animation.frames) {
      frame.draw(this.gfx);
      if (frame.duration > 0) {
        await new Promise((resolve) => setTimeout(resolve, frame.duration));
      }
    }
  }
}
