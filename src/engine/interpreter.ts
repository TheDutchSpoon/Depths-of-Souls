import { evaluateCondition } from './conditions'
import { targetSelectorHasCandidate, resolveTargetSelector } from './target-selectors'
import { getDefaultTarget, resolveOffensiveTarget } from './targeting'
import type { Action, CombatState, Creature } from './types'
import type { Rule, RuleAction, Script } from './scripting-types'

function actionNeedsTargeting(action: RuleAction, creature: Creature): boolean {
  if (action.kind === 'attack') return true
  if (action.kind === 'cast') {
    const spell = creature.equippedSpells[action.gemSlot]
    // Shape is resolved from the equipped spell at evaluation time, not authored on the
    // rule; a not-yet-equipped/empty slot still "needs" targeting so isRuleValid's
    // targeting check can gate it (isRuleActionValid already independently rejects it).
    return spell ? spell.targetShape === 'single' : true
  }
  return false // defend / provoke / wait: self-only, never need targeting
}

/** The one reachable v1 invalidity: Cast referencing an empty gem slot. */
function isRuleActionValid(action: RuleAction, creature: Creature): boolean {
  if (action.kind === 'cast') return creature.equippedSpells[action.gemSlot] != null
  return true
}

function isRuleValid(rule: Rule, creature: Creature, state: CombatState): boolean {
  if (!isRuleActionValid(rule.action, creature)) return false
  if (!actionNeedsTargeting(rule.action, creature)) return true
  if (!rule.targeting) return false
  return targetSelectorHasCandidate(rule.targeting, creature, state) // existence check, no RNG
}

function resolveRuleAction(
  rule: Rule,
  creature: Creature,
  state: CombatState,
): Action | null {
  switch (rule.action.kind) {
    case 'attack': {
      const targeting = rule.targeting
      if (!targeting) return null // defensive/unreachable -- validity already checked
      const targetId = resolveOffensiveTarget(creature, state, () =>
        resolveTargetSelector(targeting, creature, state),
      )
      return targetId ? { kind: 'attack', targetId } : null
    }
    case 'cast': {
      const spell = creature.equippedSpells[rule.action.gemSlot]
      if (!spell) return null // defensive/unreachable
      if (spell.targetShape === 'aoe') {
        return { kind: 'cast', targetShape: 'aoe', gemSlot: rule.action.gemSlot }
      }
      const targeting = rule.targeting
      if (!targeting) return null
      const targetId = resolveOffensiveTarget(creature, state, () =>
        resolveTargetSelector(targeting, creature, state),
      )
      return targetId
        ? { kind: 'cast', targetShape: 'single', gemSlot: rule.action.gemSlot, targetId }
        : null
    }
    case 'defend':
      return { kind: 'defend' }
    case 'provoke':
      return { kind: 'provoke' }
    case 'wait':
      return { kind: 'wait' }
    default: {
      const exhaustive: never = rule.action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

function decideImplicitFallback(creature: Creature, state: CombatState): Action {
  const enemyParty = creature.side === 'player' ? state.enemyParty : state.playerParty
  const targetId = resolveOffensiveTarget(creature, state, () =>
    getDefaultTarget(enemyParty),
  )
  return targetId ? { kind: 'attack', targetId } : { kind: 'wait' }
}

/**
 * The Phase 1 seam, now consulting the script. Side-effect-free lookahead: walk the
 * ordered rules top-down, evaluating condition + validity as pure predicates over current
 * state; the first rule that passes wins, and only then is its single action resolved
 * (the one point where a target selector's RNG draw, if any, can occur). Non-winning
 * rules never consume RNG state, so `same seed -> identical outcome` holds regardless of
 * incidental script structure.
 */
export function decideAction(
  creature: Creature,
  script: Script | null,
  state: CombatState,
): Action | null {
  if (script) {
    for (const rule of script.rules) {
      if (!evaluateCondition(rule.condition, creature, state)) continue
      if (!isRuleValid(rule, creature, state)) continue
      return resolveRuleAction(rule, creature, state)
    }
  }
  return decideImplicitFallback(creature, state)
}
