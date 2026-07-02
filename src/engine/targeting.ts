import type { Creature } from './types'
import type { CreatureId } from './ids'

/**
 * First living enemy by slot index, ascending. Deterministic, no RNG. Phase 1's only
 * targeting rule (no scripting/selectors yet).
 *
 * Returns null if the enemy side has no living creatures. That's structurally unreachable
 * when called from resolveTurn in Phase 1 (win/loss is checked after every action, so a
 * turn never starts against an already-empty enemy side) — but this function stays honest
 * about its own contract rather than throwing, since it's a correctly-reusable leaf for
 * Phase 2, where an empty scripted target list is a real case.
 */
export function getDefaultTarget(enemyParty: readonly Creature[]): CreatureId | null {
  const target = enemyParty.find((c) => c.alive)
  return target ? target.id : null
}
