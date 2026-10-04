import type { ComparatorOp } from './scripting-types'
import type { SelfCondition } from './effect-types'
import type { Creature, Stat } from './types'

/**
 * True iff `creature` carries a status container (`category: 'status'`, 4.1-F1) with the
 * literal statusId -- what scripting's has-status condition scopes to. Reads the raw list, never
 * the effect iterator: an immune bearer's status still exists and counts. Never matches a
 * stat-modifier/stat-remap/plain-triggered effect, nor the permanent perk-granted passives, which
 * carry no statusId and are never themselves a status.
 *
 * Phase 4.1-B (S2/B-8): lives HERE, not effects.ts, so `evaluateSelfCondition`'s `has-status`
 * branch (below) can read it without effects.ts -> effective-stats.ts becoming a cycle --
 * effects.ts re-exports this for its existing importers (conditions.ts, interpreter.ts,
 * resolution.ts, combat.ts, effects.ts itself), so nothing else about the public API changes.
 */
export function hasStatus(creature: Creature, statusId: string): boolean {
  return creature.activeEffects.some(
    (e) => e.category === 'status' && e.statusId === statusId,
  )
}

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
 * Integer cross-multiplication, no float: `currentHp/maxHp <cmp> thresholdPercent/100`, i.e.
 * `currentHp * 100 <cmp> thresholdPercent * maxHp`. Shared by conditions.ts's scripting
 * `hp-percent` Condition and this module's own `SelfCondition` (S2) -- one implementation, per
 * design-review B-7. `maxHp` is `floor(getEffectiveStat(creature, 'health'))` -- the SAME integer
 * `currentHp` is initialised and clamped to (effects.ts's `effectiveMaxHp`), computed HERE from
 * `creature` directly (not passed in) so there is exactly one place either caller's "what does
 * HP% divide by" reading can come from (Phase 4.1-B review, PR #69: the previous unfloored
 * `getEffectiveStat` reading made "at full HP" untrue whenever a Health modifier left effective
 * Health fractional -- a creature at its own max is trivially 100% only against the floored value
 * currentHp actually gets clamped to).
 */
export function hpPercentSatisfied(
  creature: Creature,
  comparator: ComparatorOp,
  thresholdPercent: number,
): boolean {
  const maxHp = Math.floor(getEffectiveStat(creature, 'health'))
  return compare(creature.currentHp * 100, comparator, thresholdPercent * maxHp)
}

/**
 * Phase 4.1-B (S2): evaluates a conditional passive's read-time gate -- DATA, not a function
 * (replaces `predicate: ActivationPredicate`). Self-only, mirroring the old predicate's contract:
 * may read OTHER effective stats but must never read the stat it gates (no read-cycle). This is
 * enforced by a load-time validator (data/traits/index.ts, data/specializations.ts), not here --
 * `hp-percent` reads effective Health via `getEffectiveStat`, which only terminates without
 * infinite recursion because the validator guarantees a Health-stat modifier can never carry an
 * `hp-percent` condition (the one shape that would read the very stat being folded).
 */
function evaluateSelfCondition(condition: SelfCondition, creature: Creature): boolean {
  switch (condition.kind) {
    case 'always':
      return true
    case 'hp-percent':
      return hpPercentSatisfied(
        creature,
        condition.comparator,
        condition.thresholdPercent,
      )
    case 'has-status':
      return hasStatus(creature, condition.statusId)
    default: {
      const exhaustive: never = condition
      throw new Error(`Unhandled self-condition kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * A creature's current value for `stat`: base folded with active `stat-modifier` effects,
 * **multiplicatively** (`base × Π(factors)`), in canonical active-effects order. A conditional
 * passive's factor is included only when its read-time `condition` (SelfCondition, S2) holds.
 * Base stats are immutable; this is computed on demand and never written back.
 *
 * Multiplication is commutative, so numeric order is irrelevant here — but effects are still
 * iterated in canonical order (shared with hook firing / remap resolution).
 */
export function getEffectiveStat(creature: Creature, stat: Stat): number {
  let value = creature.baseStats[stat]
  for (const effect of creature.activeEffects) {
    if (effect.category !== 'stat-modifier') continue
    if (effect.stat !== stat) continue
    if (effect.condition && !evaluateSelfCondition(effect.condition, creature)) continue
    value *= effect.factor
  }
  return value
}

export type ActionKind = 'attack' | 'cast'

/**
 * Remap-aware OffStat lookup, scaled by the action's spellPower (1.0 for Attack; a spell's own
 * coefficient for Cast). Order: remap-resolve the source stat -> getEffectiveStat -> × spellPower.
 * A `stat-remap` effect on the slot redirects which stat is read (e.g. Speed-as-Attack), with
 * multiple remaps resolving last-writer-wins in canonical order. The substituted stat is read
 * through getEffectiveStat, so the slot's own stat-modifiers do NOT transfer (a Speed-attacker
 * wants +Speed, not +Attack) — a legible, automatic consequence of reading the remapped stat.
 */
export function getOffensiveStat(
  creature: Creature,
  actionKind: ActionKind,
  spellPower: number = 1.0,
): number {
  const sourceStat = resolveRemappedStat(creature, actionKind)
  return getEffectiveStat(creature, sourceStat) * spellPower
}

function resolveRemappedStat(creature: Creature, slot: ActionKind): Stat {
  let stat: Stat = slot === 'attack' ? 'attack' : 'intelligence'
  for (const effect of creature.activeEffects) {
    if (effect.category !== 'stat-remap') continue
    if (effect.slot !== slot) continue
    stat = effect.fromStat // last-writer-wins in canonical order
  }
  return stat
}
