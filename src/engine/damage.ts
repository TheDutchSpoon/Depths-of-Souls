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
  const core = Math.max(input.offStat - input.defence, 0)
  const chipFloor = CHIP_FLOOR_RATE * input.offStat
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
