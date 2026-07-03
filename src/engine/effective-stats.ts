import type { Creature, Stat } from './types'

/**
 * A creature's current value for `stat`: base folded with active `stat-modifier` effects,
 * **multiplicatively** (`base × Π(factors)`), in canonical active-effects order. A conditional
 * passive's factor is included only when its read-time predicate holds. Base stats are
 * immutable; this is computed on demand and never written back.
 *
 * Multiplication is commutative, so numeric order is irrelevant here — but effects are still
 * iterated in canonical order (shared with hook firing / remap resolution). A predicate may read
 * OTHER effective stats but must not read `stat` itself (no read-cycle — see CONVENTIONS §6).
 */
export function getEffectiveStat(creature: Creature, stat: Stat): number {
  let value = creature.baseStats[stat]
  for (const effect of creature.activeEffects) {
    if (effect.category !== 'stat-modifier') continue
    if (effect.stat !== stat) continue
    if (effect.predicate && !effect.predicate(creature)) continue
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
