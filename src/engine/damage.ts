import type { Affinity } from './types'
import { getAffinityMultiplier } from './affinity'
import { CHIP_FLOOR_RATE } from './config'

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
