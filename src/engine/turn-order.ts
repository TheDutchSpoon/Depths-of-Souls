import type { Creature } from './types'
import type { CreatureId } from './ids'
import { getEffectiveStat } from './effective-stats'
import { compareBySideSlotId } from './tie-break'

/**
 * Phase 4 Slice C: the bearer's active turn-order-status position, read passively (never a
 * hook). ASSUMPTION 9: a bearer carrying both an act-first AND an act-last instance at once
 * resolves to 'first' -- first wins over last when both are simultaneously active.
 */
function turnOrderPosition(creature: Creature): 'first' | 'last' | null {
  let position: 'first' | 'last' | null = null
  for (const effect of creature.activeEffects) {
    if (effect.category !== 'turn-order-status') continue
    if (effect.position === 'first') return 'first'
    position = 'last'
  }
  return position
}

/** Speed-descending, then the shared side/slot/id tie-break -- the pre-Slice-C sort, applied
 * within each turn-order pole below. */
function sortBySpeed(group: readonly Creature[]): CreatureId[] {
  return group
    .map((creature) => ({ creature, speed: getEffectiveStat(creature, 'speed') }))
    .sort((a, b) => {
      if (a.speed !== b.speed) return b.speed - a.speed
      return compareBySideSlotId(a.creature, b.creature)
    })
    .map((entry) => entry.creature.id)
}

/**
 * Builds the frozen round-start turn queue: all currently-alive creatures across both sides,
 * partitioned into an act-first pole, the normal group, and an act-last pole (Phase 4 Slice C
 * -- Web/Blindclaws' turn-order status), each internally ordered by descending effective
 * Speed with the existing side/slot/id tie-break, then concatenated first -> normal -> last.
 * With no turn-order-status effects present, both poles are empty and this is byte-identical
 * to the pre-Slice-C single-group sort. Called once per round; never called again mid-round
 * even if something changes Speed or position (nothing can mid-round in v1).
 */
export function buildTurnQueue(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): CreatureId[] {
  const combatants = [...playerParty, ...enemyParty].filter((c) => c.alive)

  const first = combatants.filter((c) => turnOrderPosition(c) === 'first')
  const last = combatants.filter((c) => turnOrderPosition(c) === 'last')
  const normal = combatants.filter((c) => turnOrderPosition(c) === null)

  return [...sortBySpeed(first), ...sortBySpeed(normal), ...sortBySpeed(last)]
}
