import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'
import { getEffectiveStat } from './effective-stats'
import { flatEffects } from './effects'
import { compareBySideSlotId } from './tie-break'

/**
 * The bearer's active `turn-order` position (carried by Web / Grant Act First),
 * read through the effect iterator (an immune bearer's status doesn't count), never a hook. A bearer carrying both an act-first AND an act-last instance at once
 * resolves to 'first' -- first wins over last when both are simultaneously active.
 */
function turnOrderPosition(creature: Creature): 'first' | 'last' | null {
  let position: 'first' | 'last' | null = null
  for (const effect of flatEffects(creature)) {
    if (effect.category !== 'turn-order') continue
    if (effect.position === 'first') return 'first'
    position = 'last'
  }
  return position
}

interface Ranked {
  readonly creature: Creature
  readonly speed: number
}

/** Speed-descending, then the shared side/slot/id tie-break -- the plain sort, applied
 * within each turn-order pole below. Total (the id is unique), so the result doesn't depend
 * on the input order. */
function sortBySpeed(group: readonly Ranked[]): Creature[] {
  return [...group]
    .sort((a, b) => {
      if (a.speed !== b.speed) return b.speed - a.speed
      return compareBySideSlotId(a.creature, b.creature)
    })
    .map((entry) => entry.creature)
}

/**
 * The living creatures of both sides in turn order: an act-first pole, the normal group, and an
 * act-last pole (Web/Blindclaws' turn-order status), each internally ordered by descending
 * effective Speed with the side/slot/id tie-break, then concatenated first -> normal -> last.
 * With no `turn-order` effects present, both poles are empty and this is the plain single-group
 * sort. Each creature's pole and Speed are read once. The one ordering behind the round-start
 * queue and every per-pass creature list.
 */
function orderedLiving(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): Creature[] {
  const first: Ranked[] = []
  const normal: Ranked[] = []
  const last: Ranked[] = []
  for (const creature of [...playerParty, ...enemyParty]) {
    if (!creature.alive) continue
    const ranked = { creature, speed: getEffectiveStat(creature, 'speed') }
    const position = turnOrderPosition(creature)
    if (position === 'first') first.push(ranked)
    else if (position === 'last') last.push(ranked)
    else normal.push(ranked)
  }
  return [...sortBySpeed(first), ...sortBySpeed(normal), ...sortBySpeed(last)]
}

/**
 * Builds the frozen round-start turn queue: the living creatures in turn order
 * (`spec/combat.md#turn-queue`). Built once per round; the per-pass lists come from
 * `turnOrderIdsOf`, which reads the same ordering from the live state.
 */
export function buildTurnQueue(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): CreatureId[] {
  return orderedLiving(playerParty, enemyParty).map((c) => c.id)
}

/**
 * The living creatures' ids in turn order, read from the live parties at the moment of the call
 * (never from the frozen `turnQueue`, which is empty at fight start, holds the dead and
 * round-start Speeds). Every multi-creature hook pass takes its creatures from here, once per
 * pass.
 */
export function turnOrderIdsOf(state: CombatState): CreatureId[] {
  return buildTurnQueue(state.playerParty, state.enemyParty)
}
