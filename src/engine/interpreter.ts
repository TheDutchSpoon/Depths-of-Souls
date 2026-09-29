import { evaluateCondition } from './conditions'
import { checkLegality, defaultTargetingFor } from './actions'
import type { CombatState, Creature } from './types'
import type { Intent, Rule, Script } from './scripting-types'

function isRuleValid(rule: Rule, creature: Creature, state: CombatState): boolean {
  return checkLegality(
    creature,
    { action: rule.action, targeting: rule.targeting },
    state,
  )
}

/**
 * The implicit fallback is an ordinary intent (`{ action: attack }`, no targeting): resolved later
 * through the pipeline, so it gets the side-aware default (lowest-HP enemy). `checkLegality`
 * decides Attack vs Wait, pure and RNG-free.
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
      // B1: a targeting-less rule peeks the side-aware default (pure, no RNG). No single default
      // before the draw (`gemSlot: 'random'`, AOE, self-only) -> `undefined` -> acted-before-target
      // is false. conditions.ts never imports actions.ts (that would be a cycle).
      const peekTargeting = rule.targeting ?? defaultTargetingFor(creature, rule.action)
      if (!evaluateCondition(rule.condition, creature, state, peekTargeting)) continue
      if (!isRuleValid(rule, creature, state)) continue
      return { action: rule.action, targeting: rule.targeting }
    }
  }
  return decideImplicitFallback(creature, state)
}
