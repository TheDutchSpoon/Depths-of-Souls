import type { Creature, Side } from './types'
import type { CreatureId } from './ids'
import { getEffectiveStat } from './effective-stats'

/** Player side wins ties over enemy side. */
const SIDE_TIE_RANK: Record<Side, number> = { player: 0, enemy: 1 }

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
      const sideDiff = SIDE_TIE_RANK[a.creature.side] - SIDE_TIE_RANK[b.creature.side]
      if (sideDiff !== 0) return sideDiff
      const slotDiff = a.creature.slot - b.creature.slot
      if (slotDiff !== 0) return slotDiff
      // Plain codepoint compare, NOT localeCompare: localeCompare is locale/ICU-dependent
      // and can order differently across machines (local vs CI), which would silently
      // break byte-identical golden-replay output.
      return a.creature.id < b.creature.id ? -1 : a.creature.id > b.creature.id ? 1 : 0
    })
    .map((entry) => entry.creature.id)
}
