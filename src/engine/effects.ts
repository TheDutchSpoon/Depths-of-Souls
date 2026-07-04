// Effect-framework runtime helpers (pure). Slice A: instantiate innate-trait effects onto a
// creature's active-effects list, and the HP-vs-effective-max-Health helpers. Grows in
// Slices B/C (status apply/stack/decrement/expire, gatherDealtMods/gatherTakenFactors).
//
// Dependency direction is one-way: effects.ts -> effective-stats.ts (for getEffectiveStat).
// effective-stats.ts never imports this module, so there is no cycle.

import { getEffectiveStat } from './effective-stats'
import { createEffectInstanceId } from './effect-types'
import type {
  ActiveEffect,
  EffectDef,
  EffectInstanceId,
  Hook,
  Trait,
  TriggeredEffect,
} from './effect-types'
import type { Creature } from './types'

/**
 * Resolves a creature's innateTraitIds against the registry and instantiates each trait's
 * effects onto a fresh active-effects list, in canonical order (innate-1's effects, then
 * innate-2's, in trait then declaration order). Unknown trait ids are skipped defensively.
 * Instance ids are deterministic (`creatureId#traitId#ordinal`) — never RNG — so goldens
 * reproduce.
 */
export function instantiateTraitEffects(
  creature: Creature,
  traits: ReadonlyMap<string, Trait>,
): ActiveEffect[] {
  const effects: ActiveEffect[] = []
  for (const traitId of creature.innateTraitIds) {
    const trait = traits.get(traitId)
    if (!trait) continue
    trait.effects.forEach((def, ordinal) => {
      const instanceId = createEffectInstanceId(`${creature.id}#${traitId}#${ordinal}`)
      effects.push(withInstance(def, instanceId, traitId))
    })
  }
  return effects
}

function withInstance(
  def: EffectDef,
  instanceId: EffectInstanceId,
  sourceTraitId: string,
): ActiveEffect {
  switch (def.category) {
    case 'stat-modifier':
      return { ...def, instanceId, sourceTraitId }
    case 'stat-remap':
      return { ...def, instanceId, sourceTraitId }
    case 'triggered':
      return { ...def, instanceId, sourceTraitId }
    default: {
      const exhaustive: never = def
      throw new Error(`Unknown effect def category: ${String(exhaustive)}`)
    }
  }
}

/**
 * The creature's triggered effects registered for `hook`, in canonical active-effects order.
 * Scan-and-filter (a hook-type index is deferred until profiling shows it's needed). The
 * alive/death gating is the caller's (fireHook) responsibility, not this lookup's.
 */
export function effectsForHook(creature: Creature, hook: Hook): TriggeredEffect[] {
  return creature.activeEffects.filter(
    (e): e is TriggeredEffect => e.category === 'triggered' && e.hook === hook,
  )
}

/**
 * A creature's effective maximum HP: effective Health folded from base + stat-modifiers,
 * floored to an integer (HP is always an integer). For a creature with no Health modifier
 * this equals base Health.
 */
export function effectiveMaxHp(creature: Creature): number {
  return Math.floor(getEffectiveStat(creature, 'health'))
}

/**
 * Clamps currentHp down to the effective maximum, returning the (possibly reduced) currentHp.
 * Used at fight-start (init to full) and whenever effective max Health changes (Slice B/C).
 * A rise in max never auto-heals — currentHp only ever moves down here.
 */
export function clampedHp(creature: Creature): number {
  return Math.min(creature.currentHp, effectiveMaxHp(creature))
}
