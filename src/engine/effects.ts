// Effect-framework runtime helpers (pure). Slice A: instantiate innate-trait effects onto a
// creature's active-effects list, and the HP-vs-effective-max-Health helpers. Grows in
// Slices B/C (status apply/stack/decrement/expire, gatherDealtMods/gatherTakenFactors).
//
// Dependency direction is one-way: effects.ts -> effective-stats.ts (for getEffectiveStat).
// effective-stats.ts never imports this module, so there is no cycle.

import { getEffectiveStat } from './effective-stats'
import { createEffectInstanceId } from './effect-types'
import type {
  ActionInstanceEffect,
  ActiveEffect,
  ArmorPenetrationEffect,
  ConditionStatusEffect,
  CrossStatEffect,
  DamageModifierEffect,
  EffectDef,
  EffectInstanceId,
  Hook,
  StatusDef,
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
    case 'armor-penetration':
      return { ...def, instanceId, sourceTraitId }
    case 'cross-stat':
      return { ...def, instanceId, sourceTraitId }
    case 'action-instance':
      return { ...def, instanceId, sourceTraitId }
    default: {
      const exhaustive: never = def
      throw new Error(`Unknown effect def category: ${String(exhaustive)}`)
    }
  }
}

/**
 * The creature's effects registered for `hook`, in canonical active-effects order. Matches BOTH
 * permanent triggered traits (Retaliate, Grudge) and timed condition-status effects (DoT/Regen/
 * Stun) -- both fire via the same hook-dispatch machinery in resolution.ts's fireHook.
 * Scan-and-filter (a hook-type index is deferred until profiling shows it's needed). The
 * alive/death gating is the caller's (fireHook) responsibility, not this lookup's.
 */
export function effectsForHook(
  creature: Creature,
  hook: Hook,
): (TriggeredEffect | ConditionStatusEffect)[] {
  return creature.activeEffects.filter(
    (e): e is TriggeredEffect | ConditionStatusEffect =>
      (e.category === 'triggered' || e.category === 'condition-status') &&
      e.hook === hook,
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

/** Attacker's additive dealt-mod pool contribution from active damage-modifier statuses
 * (e.g. Weaken: -20%/stack). Read passively, like getEffectiveStat -- never fired via a hook. */
export function gatherDealtMods(creature: Creature): number[] {
  return creature.activeEffects
    .filter(
      (e): e is DamageModifierEffect =>
        e.category === 'damage-modifier' && e.direction === 'dealt',
    )
    .map((e) => e.magnitude * e.stacks)
}

/** Defender's multiplicative taken-pool contribution from active damage-modifier statuses
 * (e.g. Vulnerability: x1.5/stack, compounding via magnitude ** stacks). */
export function gatherTakenFactors(creature: Creature): number[] {
  return creature.activeEffects
    .filter(
      (e): e is DamageModifierEffect =>
        e.category === 'damage-modifier' && e.direction === 'taken',
    )
    .map((e) => e.magnitude ** e.stacks)
}

/** True iff `creature` carries the literal statusId among its status-carrying effects
 * (condition-status or damage-modifier) -- what scripting's has-status condition scopes to.
 * Never matches a stat-modifier/stat-remap/plain-triggered effect. */
export function hasStatus(creature: Creature, statusId: string): boolean {
  return creature.activeEffects.some(
    (e) =>
      (e.category === 'condition-status' || e.category === 'damage-modifier') &&
      e.statusId === statusId,
  )
}

/** Attacker's summed armor-penetration passives (additive across sources, clamped [0,1]) --
 * read passively by dealDamage/dealDamageWithScalingStat, never fired via a hook. */
export function gatherArmorPenetration(creature: Creature): number {
  const total = creature.activeEffects
    .filter((e): e is ArmorPenetrationEffect => e.category === 'armor-penetration')
    .reduce((sum, e) => sum + e.percent, 0)
  return Math.min(1, Math.max(0, total))
}

/** Attacker's summed cross-stat contribution for `actionKind` (its own effOffStat, added
 * post-spellPower, before the subtractive core) -- sums `percentPerRank ×
 * getEffectiveStat(creature, fromStat)` over matching effects whose appliesTo covers actionKind. */
export function gatherCrossStatContribution(
  creature: Creature,
  actionKind: 'attack' | 'cast',
): number {
  return creature.activeEffects
    .filter(
      (e): e is CrossStatEffect =>
        e.category === 'cross-stat' &&
        (e.appliesTo === actionKind || e.appliesTo === 'both'),
    )
    .reduce(
      (sum, e) => sum + e.percentPerRank * getEffectiveStat(creature, e.fromStat),
      0,
    )
}

/** The powerPercent of each active action-instance passive matching `actionKind` (or 'both'),
 * in canonical active-effects order -- appended after the base [100] entry to build an Attack/
 * Cast's instance list (combat.ts's buildInstanceList). See ActionInstanceDef's own doc comment
 * for the inline ASSUMPTION this primitive's exact shape rests on. */
export function gatherExtraInstances(
  creature: Creature,
  actionKind: 'attack' | 'cast',
): number[] {
  return creature.activeEffects
    .filter(
      (e): e is ActionInstanceEffect =>
        e.category === 'action-instance' &&
        (e.actionKind === actionKind || e.actionKind === 'both'),
    )
    .map((e) => e.powerPercent)
}

/** Instantiates a status definition into an ActiveEffect with fresh duration/stack bookkeeping.
 * `instanceId` follows the `${creatureId}#status#${statusId}` scheme (deterministic, never RNG). */
export function instantiateStatus(
  def: StatusDef,
  instanceId: EffectInstanceId,
  remainingDuration: number,
  stacks: number,
): ActiveEffect {
  const base = { instanceId, sourceTraitId: def.statusId, remainingDuration, stacks }
  switch (def.category) {
    case 'condition-status':
      return { ...def, ...base }
    case 'damage-modifier':
      return { ...def, ...base }
    default: {
      const exhaustive: never = def
      throw new Error(`Unknown status category: ${String(exhaustive)}`)
    }
  }
}
