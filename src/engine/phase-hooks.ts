import type { CombatState } from './types'

/**
 * Identifies a phase point in the fight loop. Phase 3 will attach real hook dispatch
 * here (trait/status triggers). Phase 1 has no hooks to fire — this function is a
 * documented no-op, called from these exact points so the resolver's structure doesn't
 * need to change when hooks become real.
 */
export type PhasePoint =
  'fight-start' | 'round-start' | 'turn-start' | 'turn-end' | 'round-end' | 'fight-end'

export function firePhaseHook(_point: PhasePoint, state: CombatState): CombatState {
  // No-op in Phase 1. Phase 3 will look up and run each creature's active hooks
  // registered for `_point`, threading state -> state, respecting
  // MAX_TRIGGER_CASCADE_DEPTH.
  return state
}
