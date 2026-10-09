import { pickExtremum } from './tie-break'
import { injuredOtherAlliesOf, livingAlliesOf, livingEnemiesOf } from './targeting'
import { hasStatus, hpPercentSatisfied } from './effective-stats'
import { getAffinityMultiplier } from './affinity'
import { peekTargetSelector } from './target-selectors'
import { findCreature } from './creature-lookup'
import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'
import type { TriggerCondition } from './effect-types'
import type {
  Condition,
  ComparatorOp,
  HpSubject,
  TargetSelector,
} from './scripting-types'

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

/**
 * Phase 4 Slice E2: `resolvingAgainst` is "the creature this effect is being resolved against"
 * -- present when a trigger's own source is known (fireHook) or a conditional-damage-bonus is
 * being gathered against a live target, ABSENT during scripting-rule lookahead (no such creature
 * exists there yet -- see evaluateCondition's own doc comment). 'target' degenerates to a
 * 0-or-1-element pool, so hp-percent's any/lowest/highest qualifiers and has-status's
 * existential `.some()` already do the right thing against it with zero extra branching.
 */
function subjectPool(
  subject: HpSubject,
  creature: Creature,
  state: CombatState,
  resolvingAgainst?: Creature,
): readonly Creature[] {
  switch (subject) {
    case 'self':
      return [creature]
    case 'ally':
      return livingAlliesOf(creature, state)
    case 'enemy':
      return livingEnemiesOf(creature, state)
    case 'target':
      return resolvingAgainst ? [resolvingAgainst] : []
    default: {
      const exhaustive: never = subject
      throw new Error(`Unhandled HP subject: ${String(exhaustive)}`)
    }
  }
}

/**
 * Pure -- never touches state.rng. Safe to run during lookahead for every rule.
 * `ruleTargeting` is the evaluating RULE's own targeting selector (absent for a TriggeredDef's
 * condition, which has no rule context) -- consulted ONLY by acted-before-target (Slice C);
 * every other condition kind ignores it. Phase 4 Slice E2: `resolvingAgainstId` is "the
 * creature this effect is being resolved against" for a 'target'-subject condition -- supplied
 * by fireHook (the trigger's own `source`) or a conditional-damage-bonus gather (the current
 * damage target); resolved to a live Creature via findCreature (undefined/unknown id -> no
 * such creature -> 'target' subject evaluates false, same as scripting-rule lookahead omitting
 * it entirely).
 */
export function evaluateCondition(
  condition: Condition,
  creature: Creature,
  state: CombatState,
  ruleTargeting?: TargetSelector,
  resolvingAgainstId?: CreatureId,
): boolean {
  const resolvingAgainst = resolvingAgainstId
    ? findCreature(state, resolvingAgainstId)
    : undefined
  switch (condition.kind) {
    case 'always':
      return true
    case 'hp-percent': {
      const pool = subjectPool(condition.subject, creature, state, resolvingAgainst)
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
    case 'has-status':
      return subjectPool(condition.subject, creature, state, resolvingAgainst).some((c) =>
        hasStatus(c, condition.statusId),
      )
    case 'acted-before-target': {
      // Phase 4 Slice H2 (PR #60 review, E1): completes the case for the non-scripting call
      // sites -- gatherConditionalDamageBonus (resolution.ts) already passes the CURRENT damage
      // target as resolvingAgainstId, and this function already resolves it into
      // `resolvingAgainst` above (for 'target'-subject hp-percent/has-status conditions); this
      // case just hadn't consulted it yet. `ruleTargeting` (scripting) still wins when present
      // (unchanged path, RNG-free peek); falls back to the already-resolved trigger/gather target
      // when it's the only context available. Blindclaws' Striker (data/traits/glimmerdark.ts) is
      // the first real consumer, via conditional-damage-bonus.
      const targetId = ruleTargeting
        ? peekTargetSelector(ruleTargeting, creature, state)
        : resolvingAgainst?.id
      if (!targetId) return false
      const selfIndex = state.turnQueue.indexOf(creature.id)
      const targetIndex = state.turnQueue.indexOf(targetId)
      if (selfIndex === -1 || targetIndex === -1) return false
      return selfIndex < targetIndex
    }
    default: {
      const exhaustive: never = condition
      throw new Error(`Unhandled condition kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * Phase 4.1-H2b1 (ASSUMPTION 141): a TRIGGER's condition -- any scripting `Condition`, or a
 * trigger-only kind. `other-ally-injured` is true iff `injuredOtherAlliesOf` (targeting.ts, the
 * pool the `lowest-hp-injured-other-ally` target also reads) is non-empty. Every other kind
 * delegates to `evaluateCondition` unchanged, whose exhaustive `never` arm is untouched, so the
 * interpreter can never evaluate the trigger-only kind. Pure; never draws RNG.
 */
export function evaluateTriggerCondition(
  condition: TriggerCondition,
  creature: Creature,
  state: CombatState,
  resolvingAgainstId?: CreatureId,
): boolean {
  if (condition.kind === 'other-ally-injured') {
    return injuredOtherAlliesOf(creature, state).length > 0
  }
  return evaluateCondition(condition, creature, state, undefined, resolvingAgainstId)
}
