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

export type ActionKind = 'attack' | 'cast'

/**
 * Remap-aware OffStat lookup, scaled by the action's spellPower (1.0 for Attack; a
 * spell's own coefficient for Cast). Order: remap-resolve source stat -> getEffectiveStat
 * -> x spellPower. Phase 1/2: no stat-remap effects exist, so this always falls back to
 * effective Attack/Intelligence. A future remap check (consulting active stat-remap
 * effects, fixed effect order, last-writer-wins) slots in as a lookup BEFORE the
 * fallback, with no change to callers.
 */
export function getOffensiveStat(
  creature: Creature,
  actionKind: ActionKind,
  spellPower: number = 1.0,
): number {
  // Seam: a Phase 3 stat-remap check would go here, before the fallback below.
  switch (actionKind) {
    case 'attack':
      return getEffectiveStat(creature, 'attack') * spellPower
    case 'cast':
      return getEffectiveStat(creature, 'intelligence') * spellPower
    default: {
      const exhaustive: never = actionKind
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}
