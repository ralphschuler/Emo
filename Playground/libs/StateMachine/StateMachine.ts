import { StateDefinition } from "./StateDefinition";

/**
 * A simple finite state machine with support for asynchronous enter,
 * main and leave transitions.  Each state can define callbacks that run
 * when the machine enters or leaves that state.  State names may be
 * strings, numbers or symbols.  Developers can also restrict which
 * transitions are allowed between states.
 */
export class StateMachine<S extends PropertyKey> {
  private readonly states: Map<S, StateDefinition<S>> = new Map();
  private current: S | null = null;

  /**
   * A mapping of allowed transitions.  If a current state appears in
   * this map only the listed target states are permitted.  If a
   * state is absent from the map then all transitions are permitted
   * from that state.  When the current state is `null` (i.e. before
   * starting or after auto leave) any target state is allowed.
   */
  private allowedTransitions: Map<S, Set<S>> = new Map();

  private callCounter = 0;

  public addState(name: S, definition: StateDefinition<S>): void {
    this.states.set(name, definition);
  }

  public removeState(name: S): void {
    this.states.delete(name);
  }

  /**
   * Transition to the given state.  Will throw an error if the target
   * state is not registered or the transition is not allowed.
   */
  public async transitionTo(next: S): Promise<void> {
    if (!this.states.has(next)) {
      throw new Error(`State '${String(next)}' is not registered.`);
    }
    if (this.current === next) {
      return;
    }
    if (this.current !== null) {
      const allowed = this.allowedTransitions.get(this.current);
      if (allowed && !allowed.has(next)) {
        throw new Error(
          `Transition from '${String(this.current)}' to '${String(next)}' is not allowed.`,
        );
      }
    }
    const previous = this.current;
    const prevDef = previous !== null ? this.states.get(previous) : undefined;
    const nextDef = this.states.get(next);
    if (prevDef && prevDef.onLeave) {
      await prevDef.onLeave(next);
    }
    this.current = next;
    if (nextDef && nextDef.onEnter) {
      await nextDef.onEnter(previous);
    }
    if (nextDef) {
      this.invokeMain(next, nextDef);
    }
  }

  public async start(initial: S): Promise<void> {
    if (this.current !== null) {
      throw new Error("State machine has already been started");
    }
    if (!this.states.has(initial)) {
      throw new Error(`State '${String(initial)}' is not registered.`);
    }
    this.current = initial;
    const def = this.states.get(initial);
    if (def && def.onEnter) {
      await def.onEnter(null);
    }
    if (def) {
      this.invokeMain(initial, def);
    }
  }

  public getCurrentState(): S | null {
    return this.current;
  }

  /**
   * Define which target states can be transitioned to from a given
   * state.  If no allowed transitions are defined for a state then
   * all transitions are permitted from that state.  The allowed
   * transitions replace any previously defined transitions for the
   * state.
   *
   * @param state The state from which transitions originate.
   * @param allowed An array of state names that are permitted as targets.
   */
  public setAllowedTransitions(state: S, allowed: S[]): void {
    this.allowedTransitions.set(state, new Set(allowed));
  }

  private invokeMain(state: S, def: StateDefinition<S>): void {
    const callId = ++this.callCounter;
    if (!def.onMain) return;
    try {
      const result = def.onMain();
      if (result && typeof (result as any).then === "function") {
        (result as Promise<any>)
          .then(async () => {
            if (this.current === state && callId === this.callCounter) {
              if (def.onLeave) {
                await def.onLeave(null);
              }
              this.current = null;
            }
          })
          .catch(() => {
            // errors in onMain are ignored
          });
      }
    } catch {
      // synchronous errors in onMain are ignored
    }
  }
}
