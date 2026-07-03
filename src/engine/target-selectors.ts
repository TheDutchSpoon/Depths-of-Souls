import { pickExtremum } from './tie-break'
import { livingAlliesOf, livingEnemiesOf } from './targeting'
import { getEffectiveStat } from './effective-stats'
import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'
import type { TargetSelector } from './scripting-types'

/**
 * Existence-only check -- NEVER touches state.rng. This is the interpreter's lookahead
 * seam: a rule referencing e.g. random-enemy must be checkable for validity without
 * consuming randomness, since only the winning rule's actual resolution may draw.
 */
export function targetSelectorHasCandidate(
  selector: TargetSelector,
  creature: Creature,
  state: CombatState,
): boolean {
  switch (selector.kind) {
    case 'self':
      return true
    case 'lowest-hp-ally':
      return livingAlliesOf(creature, state).length > 0
    case 'lowest-hp-enemy':
    case 'highest-hp-enemy':
    case 'highest-attack-enemy':
    case 'highest-intelligence-enemy':
    case 'random-enemy':
      return livingEnemiesOf(creature, state).length > 0
    default: {
      const exhaustive: never = selector
      throw new Error(`Unhandled target selector kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * The real resolution. `random-enemy` is the one blessed RNG draw site in this module --
 * callers must only reach it for the winning rule (see interpreter.ts).
 */
export function resolveTargetSelector(
  selector: TargetSelector,
  creature: Creature,
  state: CombatState,
): CreatureId | null {
  switch (selector.kind) {
    case 'self':
      return creature.id
    case 'lowest-hp-ally':
      return (
        pickExtremum(livingAlliesOf(creature, state), (c) => c.currentHp, 'asc')?.id ??
        null
      )
    case 'lowest-hp-enemy':
      return (
        pickExtremum(livingEnemiesOf(creature, state), (c) => c.currentHp, 'asc')?.id ??
        null
      )
    case 'highest-hp-enemy':
      return (
        pickExtremum(livingEnemiesOf(creature, state), (c) => c.currentHp, 'desc')?.id ??
        null
      )
    case 'highest-attack-enemy':
      return (
        pickExtremum(
          livingEnemiesOf(creature, state),
          (c) => getEffectiveStat(c, 'attack'),
          'desc',
        )?.id ?? null
      )
    case 'highest-intelligence-enemy':
      return (
        pickExtremum(
          livingEnemiesOf(creature, state),
          (c) => getEffectiveStat(c, 'intelligence'),
          'desc',
        )?.id ?? null
      )
    case 'random-enemy': {
      const pool = livingEnemiesOf(creature, state)
      if (pool.length === 0) return null
      const index = Math.floor(state.rng.next() * pool.length)
      return pool[index]?.id ?? null
    }
    default: {
      const exhaustive: never = selector
      throw new Error(`Unhandled target selector kind: ${String(exhaustive)}`)
    }
  }
}
