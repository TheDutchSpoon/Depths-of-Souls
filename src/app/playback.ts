// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
// Playback is a cosmetic reveal of an already-computed log. Its position is a pure reducer so
// the rules are unit-testable, and the component owns exactly one timeout keyed on `timerKey`,
// which makes a stacked timer impossible by construction.

/** Milliseconds per beat. */
export const SPEEDS = { 1: 500, 3: 167, 5: 100 } as const
export type Speed = keyof typeof SPEEDS

export type PlaybackPhase = 'playing' | 'done'

export interface PlaybackState {
  readonly phase: PlaybackPhase
  /** Index of the fight on screen. */
  readonly fight: number
  /** Beats of that fight revealed so far. */
  readonly revealed: number
  readonly speed: Speed
}

export type PlaybackAction =
  | { readonly type: 'timer-elapsed' }
  | { readonly type: 'jump'; readonly fight: number }
  | { readonly type: 'skip-fight' }
  | { readonly type: 'skip-floor' }
  | { readonly type: 'set-speed'; readonly speed: Speed }

/** A descent with no fights has nothing to reveal, so it starts `done`. */
export function initialPlayback(fights = 1): PlaybackState {
  return { phase: fights === 0 ? 'done' : 'playing', fight: 0, revealed: 0, speed: 1 }
}

/** An action that changes nothing returns the identical object, so React skips the render and
 * a no-op never restarts the running timeout. `beatCounts` is the number of beats in each fight
 * of the descent. */
export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
  beatCounts: readonly number[],
): PlaybackState {
  const last = beatCounts.length - 1
  // With no fights there is no beat count to read and no fight to jump to: nothing moves, but the
  // speed still changes.
  if (last < 0 && action.type !== 'set-speed') return state
  switch (action.type) {
    case 'timer-elapsed': {
      if (state.phase === 'done') return state
      const count = beatCounts[state.fight]!
      if (state.revealed < count) {
        const revealed = state.revealed + 1
        const finished = revealed >= count && state.fight === last
        return { ...state, phase: finished ? 'done' : 'playing', revealed }
      }
      if (state.fight < last) return { ...state, fight: state.fight + 1, revealed: 0 }
      return { ...state, phase: 'done' }
    }
    case 'jump': {
      if (!Number.isInteger(action.fight) || action.fight < 0 || action.fight > last) {
        throw new RangeError(`playbackReducer: no fight ${action.fight}`)
      }
      if (
        state.phase === 'playing' &&
        state.fight === action.fight &&
        state.revealed === 0
      ) {
        return state
      }
      return { ...state, phase: 'playing', fight: action.fight, revealed: 0 }
    }
    case 'skip-fight': {
      if (state.phase !== 'playing') return state
      const count = beatCounts[state.fight]!
      if (state.revealed >= count && state.fight < last) return state
      return {
        ...state,
        phase: state.fight === last ? 'done' : 'playing',
        revealed: count,
      }
    }
    case 'skip-floor': {
      const count = beatCounts[last]!
      if (state.phase === 'done' && state.fight === last && state.revealed === count) {
        return state
      }
      return { ...state, phase: 'done', fight: last, revealed: count }
    }
    case 'set-speed':
      return action.speed === state.speed ? state : { ...state, speed: action.speed }
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled playback action: ${String(exhaustive)}`)
    }
  }
}

/** How long the current state waits before the timer fires; null once nothing is pending. */
export function pendingDelayMs(state: PlaybackState): number | null {
  switch (state.phase) {
    case 'playing':
      return SPEEDS[state.speed]
    case 'done':
      return null
  }
}

/** The timer effect's dependency: it changes exactly when the pending timeout must be replaced.
 * Keying the effect on the whole state object would restart a beat on any new object. */
export function timerKey(state: PlaybackState): string {
  return `${state.phase}:${state.fight}:${state.revealed}:${state.speed}`
}
