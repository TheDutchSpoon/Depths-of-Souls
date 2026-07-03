import type { Creature } from './types'
import type { CreatureId } from './ids'
import { getEffectiveStat } from './effective-stats'
import { compareBySideSlotId } from './tie-break'

/**
 * Builds the frozen round-start turn queue: all currently-alive creatures across both
 * sides, ordered by descending effective Speed, ties broken by side (player first),
 * then slot index, then creature id. Called once per round; never called again mid-round
 * even if something changes Speed (nothing can in Phase 1).
 */
export function buildTurnQueue(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): CreatureId[] {
  const combatants = [...playerParty, ...enemyParty].filter((c) => c.alive)

  return combatants
    .map((creature) => ({ creature, speed: getEffectiveStat(creature, 'speed') }))
    .sort((a, b) => {
      if (a.speed !== b.speed) return b.speed - a.speed // descending speed
      return compareBySideSlotId(a.creature, b.creature)
    })
    .map((entry) => entry.creature.id)
}
