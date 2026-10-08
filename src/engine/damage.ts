import type { Affinity } from './types'
import { getAffinityMultiplier } from './affinity'
import {
  ADDITIONAL_BASE_CAP,
  ADDITIONAL_CAP_FADE_PER_LEVEL,
  ADDITIONAL_MAX_HP_PERCENT,
  CHIP_FLOOR_RATE,
  INDIRECT_DEFENCE_RATE,
} from './config'

export interface DamageInput {
  readonly offStat: number
  readonly defence: number
  readonly attackerAffinity: Affinity
  readonly defenderAffinity: Affinity
  /** Attacker's additive dealt-mod pool. Empty in Phase 1; applied as (1 + Σ). */
  readonly dealtMods: readonly number[]
  /** Defender's multiplicative taken-mod pool. Empty in Phase 1; applied as Π. */
  readonly takenFactors: readonly number[]
  /** Phase 4 Slice B: ignore this fraction of the TARGET's Defence, applied before the
   * subtractive core. 0 by default -- byte-identical to pre-Slice-B behavior. */
  readonly armorPenetrationPercent?: number
  /** Phase 4 Slice B: a flat bonus added to offStat AFTER spellPower, before the subtractive
   * core (Shield Bash's Defence contribution, etc.). 0 by default -- byte-identical to
   * pre-Slice-B behavior. Feeds the chip floor too, since it scales with the same effOffStat. */
  readonly crossStatBonus?: number
}

export interface DamageResult {
  /** Full-precision value before the final MAX(1, floor(...)) clamp. */
  readonly rawDamage: number
  /** The actual integer HP removed. */
  readonly finalDamage: number
  readonly affinityMultiplier: number
  readonly wasChipOnly: boolean
}

export function calculateDamage(input: DamageInput): DamageResult {
  // Both default to their pre-Slice-B no-op value (0), so effectiveOffStat === input.offStat and
  // effectiveDefence === input.defence when neither is set -- provably additive.
  const effectiveOffStat = input.offStat + (input.crossStatBonus ?? 0)
  const effectiveDefence = input.defence * (1 - (input.armorPenetrationPercent ?? 0))

  const core = Math.max(effectiveOffStat - effectiveDefence, 0)
  const chipFloor = CHIP_FLOOR_RATE * effectiveOffStat
  const affinityMultiplier = getAffinityMultiplier(
    input.attackerAffinity,
    input.defenderAffinity,
  )

  const dealtMultiplier = 1 + input.dealtMods.reduce((total, m) => total + m, 0)
  const takenMultiplier = input.takenFactors.reduce((total, f) => total * f, 1)

  // Floor happens exactly once, on the fully-composed value — never per-term. Per-term
  // rounding would compound error and risk cross-platform float drift, breaking golden
  // replay.
  const rawDamage =
    (core + chipFloor) * affinityMultiplier * dealtMultiplier * takenMultiplier
  const finalDamage = Math.max(1, Math.floor(rawDamage))

  return { rawDamage, finalDamage, affinityMultiplier, wasChipOnly: core === 0 }
}

/**
 * Phase 4.1-H2a (ASSUMPTIONS 110, 135): the Additional, a fading flat bonus added to a DIRECT hit
 * after its `MAX(1, floor(...))`. 20% of the target's effective max Health (the integer-percent
 * float rule), capped at `ADDITIONAL_BASE_CAP` at level 1 with the cap falling by
 * `ADDITIONAL_CAP_FADE_PER_LEVEL` per attacker level (gone from level 11). Nothing modifies it.
 */
export function calculateAdditional(attackerLevel: number, targetMaxHp: number): number {
  const hpBound = Math.floor((targetMaxHp * ADDITIONAL_MAX_HP_PERCENT) / 100)
  const levelCap = Math.max(
    0,
    ADDITIONAL_BASE_CAP - ADDITIONAL_CAP_FADE_PER_LEVEL * (attackerLevel - 1),
  )
  return Math.min(hpBound, levelCap)
}

/** A direct hit's result with the Additional added to the integer damage (`rawDamage` stays the
 * formula's pre-clamp value, ASSUMPTION 136). */
export function withAdditional(result: DamageResult, additional: number): DamageResult {
  return { ...result, finalDamage: result.finalDamage + additional }
}

export interface IndirectDamageInput {
  /** The response's own magnitude (`offStat`/`scalingStat` x spellPower x count, or the flat amount). */
  readonly magnitude: number
  /** The target's effective Defence, already including Defend's x1.5. */
  readonly defence: number
  readonly attackerAffinity: Affinity
  readonly defenderAffinity: Affinity
  readonly dealtMods: readonly number[]
  readonly takenFactors: readonly number[]
  /** Fraction of the TARGET's Defence ignored, applied to the Defence term (ASSUMPTION 134). */
  readonly armorPenetrationPercent?: number
}

/**
 * Phase 4.1-H2a (ASSUMPTION 112): INDIRECT damage -- every damage that is not an Attack or Cast
 * action (a trait/status/perk response). `magnitude x affinity x (1 + sum dealt) x prod(taken) -
 * 0.2 x Defence`, then `MAX(1, floor(...))` once. No chip, no Additional: it meets a fifth of
 * the target's Defence. `wasChipOnly` is always false.
 */
export function calculateIndirectDamage(input: IndirectDamageInput): DamageResult {
  const effectiveDefence = input.defence * (1 - (input.armorPenetrationPercent ?? 0))
  const affinityMultiplier = getAffinityMultiplier(
    input.attackerAffinity,
    input.defenderAffinity,
  )
  const dealtMultiplier = 1 + input.dealtMods.reduce((total, m) => total + m, 0)
  const takenMultiplier = input.takenFactors.reduce((total, f) => total * f, 1)
  const rawDamage =
    input.magnitude * affinityMultiplier * dealtMultiplier * takenMultiplier -
    INDIRECT_DEFENCE_RATE * effectiveDefence
  return {
    rawDamage,
    finalDamage: Math.max(1, Math.floor(rawDamage)),
    affinityMultiplier,
    wasChipOnly: false,
  }
}

/**
 * Phase 4.1-H2a (ASSUMPTION 116/132): a COST -- a creature's own response damaging itself. The
 * exact magnitude, floored once, minimum 0 (no Defence, pools, affinity or Additional). The caller
 * treats a 0 result as a full no-op.
 */
export function calculateCost(magnitude: number): DamageResult {
  return {
    rawDamage: magnitude,
    finalDamage: Math.max(0, Math.floor(magnitude)),
    affinityMultiplier: 1,
    wasChipOnly: false,
  }
}
