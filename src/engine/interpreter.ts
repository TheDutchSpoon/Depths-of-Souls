import { evaluateCondition } from './conditions'
import { checkLegality } from './actions'
import type { CombatState, Creature } from './types'
import type { Intent, Rule, RuleAction, Script } from './scripting-types'

/**
 * Phase 4.1-C2a: whether `action` needs an EXPLICIT `targeting` field to be a valid rule -- this
 * gate is C2a-INTERIM (mirrors today's Phase-1-through-4.1-C1 behaviour exactly: a rule without
 * targeting is invalid, full stop). `checkLegality` (actions.ts) itself is already the general,
 * final-shape answer (missing targeting is fine -- some default target exists), since it also
 * has to answer the implicit fallback's own legality question (which never had a `targeting`
 * field to omit). C2b (B1) deletes this function outright and lets `checkLegality` alone decide
 * rule validity, once the engine's own default-target resolution actually uses the side-aware
 * default instead of today's first-by-slot one (see actions.ts's own header comment).
 */
function ruleNeedsExplicitTargeting(action: RuleAction, creature: Creature): boolean {
  if (action.kind === 'attack') return true
  if (action.kind === 'cast') {
    if (action.gemSlot === 'random') return true // no resolved spell yet to know AOE vs single
    const spell = creature.equippedSpells[action.gemSlot]
    // Shape is resolved from the equipped spell at evaluation time, not authored on the
    // rule; a not-yet-equipped/empty slot still "needs" targeting so isRuleValid can gate on
    // it (checkLegality already independently rejects an empty slot regardless).
    return spell ? spell.targetShape === 'single' : true
  }
  return false // defend / provoke / wait: self-only, never need targeting
}

function isRuleValid(rule: Rule, creature: Creature, state: CombatState): boolean {
  if (ruleNeedsExplicitTargeting(rule.action, creature) && !rule.targeting) return false
  return checkLegality(
    creature,
    { action: rule.action, targeting: rule.targeting },
    state,
  )
}

/**
 * Phase 4.1-C2a: mirrors today's `decideImplicitFallback` exactly, just expressed as an intent
 * instead of a pre-resolved Action -- `checkLegality` already replicates the old
 * `isActionSuppressed(creature, 'attack')` + "does the enemy side have a valid target" check
 * (see actions.ts's `hasValidTarget`), pure and RNG-free either way.
 */
function decideImplicitFallback(creature: Creature, state: CombatState): Intent {
  const attack: Intent = { action: { kind: 'attack' } }
  return checkLegality(creature, attack, state) ? attack : { action: { kind: 'wait' } }
}

/**
 * The Phase 1 seam, now consulting the script. Side-effect-free lookahead: walk the
 * ordered rules top-down, evaluating condition + validity as pure predicates over current
 * state; the first rule that passes wins. Non-winning rules never consume RNG state, so
 * `same seed -> identical outcome` holds regardless of incidental script structure.
 *
 * Phase 4.1-C2a (A1): returns the winning rule's UNRESOLVED `Intent` (or the fallback intent),
 * never a resolved `Action` -- resolution (target/gem draws) happens exactly once, in
 * `actions.ts`'s `resolveIntent`, for whichever intent this function returns.
 */
export function decideAction(
  creature: Creature,
  script: Script | null,
  state: CombatState,
): Intent {
  if (script) {
    for (const rule of script.rules) {
      if (!evaluateCondition(rule.condition, creature, state, rule.targeting)) continue
      if (!isRuleValid(rule, creature, state)) continue
      return { action: rule.action, targeting: rule.targeting }
    }
  }
  return decideImplicitFallback(creature, state)
}
