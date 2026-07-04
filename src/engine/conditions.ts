import { pickExtremum } from './tie-break'
import { livingAlliesOf, livingEnemiesOf } from './targeting'
import { getEffectiveStat } from './effective-stats'
import { getAffinityMultiplier } from './affinity'
import { hasStatus } from './effects'
import type { CombatState, Creature } from './types'
import type { Condition, ComparatorOp, HpSubject } from './scripting-types'

function compare(lhs: number, cmp: ComparatorOp, rhs: number): boolean {
  switch (cmp) {
    case '<':
      return lhs < rhs
    case '<=':
      return lhs <= rhs
    case '>':
      return lhs > rhs
    case '>=':
      return lhs >= rhs
    case '==':
      return lhs === rhs
    case '!=':
      return lhs !== rhs
    default: {
      const exhaustive: never = cmp
      throw new Error(`Unhandled comparator: ${String(exhaustive)}`)
    }
  }
}

/** Integer cross-multiplication, no float: currentHp/effMaxHp <cmp> thresholdPercent/100. */
function hpPercentSatisfied(
  creature: Creature,
  comparator: ComparatorOp,
  thresholdPercent: number,
): boolean {
  const effMaxHp = getEffectiveStat(creature, 'health')
  return compare(creature.currentHp * 100, comparator, thresholdPercent * effMaxHp)
}

function subjectPool(
  subject: HpSubject,
  creature: Creature,
  state: CombatState,
): readonly Creature[] {
  switch (subject) {
    case 'self':
      return [creature]
    case 'ally':
      return livingAlliesOf(creature, state)
    case 'enemy':
      return livingEnemiesOf(creature, state)
    default: {
      const exhaustive: never = subject
      throw new Error(`Unhandled HP subject: ${String(exhaustive)}`)
    }
  }
}

/** Pure -- never touches state.rng. Safe to run during lookahead for every rule. */
export function evaluateCondition(
  condition: Condition,
  creature: Creature,
  state: CombatState,
): boolean {
  switch (condition.kind) {
    case 'always':
      return true
    case 'hp-percent': {
      const pool = subjectPool(condition.subject, creature, state)
      if (pool.length === 0) return false
      if (condition.qualifier === 'any') {
        return pool.some((c) =>
          hpPercentSatisfied(c, condition.comparator, condition.thresholdPercent),
        )
      }
      const target = pickExtremum(
        pool,
        (c) => c.currentHp,
        condition.qualifier === 'lowest' ? 'asc' : 'desc',
      )
      return target
        ? hpPercentSatisfied(target, condition.comparator, condition.thresholdPercent)
        : false
    }
    case 'enemy-count':
      return compare(
        livingEnemiesOf(creature, state).length,
        condition.comparator,
        condition.count,
      )
    case 'ally-count':
      return compare(
        livingAlliesOf(creature, state).length,
        condition.comparator,
        condition.count,
      )
    case 'round-number':
      return compare(state.round, condition.comparator, condition.round)
    case 'enemy-weak-to-me-exists':
      return livingEnemiesOf(creature, state).some(
        (enemy) => getAffinityMultiplier(creature.affinity, enemy.affinity) > 1,
      )
    case 'is-provoking':
      return creature.provoking
    case 'has-status':
      return subjectPool(condition.subject, creature, state).some((c) =>
        hasStatus(c, condition.statusId),
      )
    default: {
      const exhaustive: never = condition
      throw new Error(`Unhandled condition kind: ${String(exhaustive)}`)
    }
  }
}
