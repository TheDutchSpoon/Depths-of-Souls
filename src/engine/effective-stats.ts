import type { Creature, Stat } from './types'

/**
 * Phase 1: no stat-modifier effects exist, so this is a pure passthrough to base.
 * Every stat read in combat math MUST go through this function — never `creature.baseStats.x`
 * inline. Phase 3 will fold active stat-modifier effects over base here, in a fixed
 * deterministic order.
 */
export function getEffectiveStat(creature: Creature, stat: Stat): number {
  return creature.baseStats[stat]
}

export type ActionKind = 'attack' // grows to 'attack' | 'cast' in Phase 2

/**
 * Remap-aware OffStat lookup. Phase 1: no stat-remap effects exist, so this always
 * falls back to effective Attack for the 'attack' action kind. A future remap check
 * (consulting active stat-remap effects, fixed effect order, last-writer-wins) slots
 * in as a lookup BEFORE the fallback, with no change to callers.
 */
export function getOffensiveStat(creature: Creature, actionKind: ActionKind): number {
  // Seam: a Phase 3 stat-remap check would go here, before the fallback below.
  switch (actionKind) {
    case 'attack':
      return getEffectiveStat(creature, 'attack')
    default: {
      const exhaustive: never = actionKind
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}
