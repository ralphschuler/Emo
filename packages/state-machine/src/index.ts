export interface Transition<S, Ctx, P = any> {
  target: S;
  guard?: (ctx: Ctx, payload: P) => boolean;
  action?: (ctx: Ctx, payload: P) => void;
}

export type StateConfig<S extends string, E extends string, Ctx, P = any> = {
  [State in S]?: {
    [Event in E]?: Transition<S, Ctx, P>;
  };
};

export class StateMachine<S extends string, E extends string, Ctx, P = any> {
  private currentState: S;

  constructor(
    initial: S,
    private readonly config: StateConfig<S, E, Ctx, P>,
    private readonly context: Ctx
  ) {
    this.currentState = initial;
  }

  get state(): S {
    return this.currentState;
  }

  get ctx(): Ctx {
    return this.context;
  }

  send(event: E, payload?: P): boolean {
    const stateTransitions = this.config[this.currentState];
    const transition = stateTransitions?.[event];
    if (!transition) {
      return false;
    }
    if (transition.guard && !transition.guard(this.context, payload)) {
      return false;
    }
    transition.action?.(this.context, payload);
    this.currentState = transition.target;
    return true;
  }
}

export const createStateMachine = <S extends string, E extends string, Ctx, P = any>(
  initial: S,
  config: StateConfig<S, E, Ctx, P>,
  context: Ctx
) => new StateMachine<S, E, Ctx, P>(initial, config, context);
