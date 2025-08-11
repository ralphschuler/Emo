import { describe, it, expect } from "bun:test";
import { StateMachine } from "./index";
import type { StateConfig } from "./index";

type State = "idle" | "running";
type Event = "START" | "STOP";
interface Ctx {
  enabled: boolean;
  count: number;
}

const config: StateConfig<State, Event, Ctx> = {
  idle: {
    START: {
      target: "running",
      guard: (ctx) => ctx.enabled,
    },
  },
  running: {
    STOP: {
      target: "idle",
      action: (ctx) => {
        ctx.count++;
      },
    },
  },
};

describe("StateMachine", () => {
  it("transitions when guard passes", () => {
    const machine = new StateMachine<State, Event, Ctx>("idle", config, { enabled: true, count: 0 });
    expect(machine.send("START")).toBe(true);
    expect(machine.state).toBe("running");
  });

  it("blocks transition when guard fails", () => {
    const machine = new StateMachine<State, Event, Ctx>("idle", config, { enabled: false, count: 0 });
    expect(machine.send("START")).toBe(false);
    expect(machine.state).toBe("idle");
  });

  it("executes actions on transition", () => {
    const ctx = { enabled: true, count: 0 };
    const machine = new StateMachine<State, Event, Ctx>("running", config, ctx);
    expect(machine.send("STOP")).toBe(true);
    expect(machine.state).toBe("idle");
    expect(ctx.count).toBe(1);
  });
});
