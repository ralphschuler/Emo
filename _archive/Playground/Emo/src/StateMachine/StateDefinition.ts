export interface StateDefinition<S extends PropertyKey> {
  /** Wird ausgeführt, wenn der Zustand betreten wird. */
  onEnter?: (from: S | null) => void | Promise<void>;
  /** Wird ausgeführt, wenn der Zustand läuft wird. */
  onMain?: () => void | Promise<void>;
  /** Wird ausgeführt, wenn der Zustand verlassen wird. */
  onLeave?: (to: S | null) => void | Promise<void>;
}
