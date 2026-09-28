import { pickExtremum } from './tie-break'
import { livingAlliesOf, livingEnemiesOf } from './targeting'
import { getEffectiveStat } from './effective-stats'
import { nextRandom } from './rng'
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
    case 'highest-hp-ally':
    case 'highest-attack-ally':
    case 'highest-intelligence-ally':
    case 'random-ally':
      // Phase 4 Slice E: always true -- "ally" includes the acting creature itself, which is
      // alive by construction whenever this is evaluated (mirrors lowest-hp-ally's own contract).
      return livingAlliesOf(creature, state).length > 0
    case 'lowest-hp-enemy':
    case 'highest-hp-enemy':
    case 'highest-attack-enemy':
    case 'highest-intelligence-enemy':
    case 'random-enemy':
      return livingEnemiesOf(creature, state).length > 0
    case 'random':
      // Phase 4.1-C2a (PR #71 review): 'random' needs the action's intended side to check
      // existence against, which this module never has -- same reason resolveTargetSelector
      // throws on it below. actions.ts's `hasValidTarget` intercepts 'random' before ever
      // calling this function (checking the intended side's own living pool directly), so this
      // is never actually reached from there; it's still here for exhaustiveness and to fail
      // loudly rather than silently for any other caller.
      throw new Error(
        "targetSelectorHasCandidate cannot check the side-neutral 'random' selector -- resolve the intended side in actions.ts instead",
      )
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
    // Phase 4 Slice E: the one-for-one ally mirror of the four non-trivial enemy selectors
    // below, reusing the exact same pickExtremum/tie-break machinery over livingAlliesOf
    // instead of livingEnemiesOf.
    case 'highest-hp-ally':
      return (
        pickExtremum(livingAlliesOf(creature, state), (c) => c.currentHp, 'desc')?.id ??
        null
      )
    case 'highest-attack-ally':
      return (
        pickExtremum(
          livingAlliesOf(creature, state),
          (c) => getEffectiveStat(c, 'attack'),
          'desc',
        )?.id ?? null
      )
    case 'highest-intelligence-ally':
      return (
        pickExtremum(
          livingAlliesOf(creature, state),
          (c) => getEffectiveStat(c, 'intelligence'),
          'desc',
        )?.id ?? null
      )
    case 'random-ally': {
      const pool = livingAlliesOf(creature, state)
      if (pool.length === 0) return null
      const index = Math.floor(nextRandom(state.rng) * pool.length)
      return pool[index]?.id ?? null
    }
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
      const index = Math.floor(nextRandom(state.rng) * pool.length)
      return pool[index]?.id ?? null
    }
    case 'random':
      // Phase 4.1-C2a (A1): 'random' needs the action's intended side to resolve, which this
      // module never has -- actions.ts's resolveIntent resolves it directly (over
      // livingEnemiesOf/livingAlliesOf, matching random-enemy/random-ally's own draw), never
      // through this function.
      throw new Error(
        "resolveTargetSelector cannot resolve the side-neutral 'random' selector -- resolve it in actions.ts, where the intended side is known",
      )
    default: {
      const exhaustive: never = selector
      throw new Error(`Unhandled target selector kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * Phase 4 Slice C: an RNG-FREE resolution, for the acted-before-target condition's lookahead
 * (see scripting-types.ts's ActedBeforeTargetCondition doc). Every selector kind but
 * random-enemy is already RNG-free in resolveTargetSelector -- this delegates to it unchanged
 * for those, and returns null for random-enemy rather than drawing (there is no way to "peek"
 * a random pick without consuming randomness, and lookahead must never do that). Phase 4 Slice E:
 * random-ally follows the exact same rule, for the same reason.
 */
export function peekTargetSelector(
  selector: TargetSelector,
  creature: Creature,
  state: CombatState,
): CreatureId | null {
  if (
    selector.kind === 'random-enemy' ||
    selector.kind === 'random-ally' ||
    selector.kind === 'random'
  ) {
    return null
  }
  return resolveTargetSelector(selector, creature, state)
}
