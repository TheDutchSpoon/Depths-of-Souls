// Depth-scaling curves for the run
// layer, PARAMETERIZED by an injected BalanceConfig instead of hardcoded literals. Every
// number is still explicitly parked balance (`OPEN_QUESTIONS.md#balance-numbers`); retuning happens in
// data/balance.ts, never here.

import type { BalanceConfig } from './balance-types'

export interface LevelRange {
  readonly min: number
  readonly max: number
}

export type RarityTier = 'common' | 'uncommon' | 'rare'

/**
 * min = floor(floor * m(floor)) -- ROUNDED DOWN,
 * so an early floor's minimum never exceeds floor * m(floor) -- where m(floor) rises linearly from
 * levelMultiplier.atFloor1Hundredths/100 at floor 1 to .../atFloor100Hundredths/100 at floor
 * 100, then + perFloorAfter100Hundredths/100 per floor after (`spec/run.md#enemy-levels`).
 * Computed with a SINGLE Math.floor
 * at the very end, in both branches -- multiplying out before dividing keeps the whole computation
 * exact integer arithmetic until that one rounding, so there is no compounding float drift across
 * floors (no intermediate rounding of the multiplier). A flat x1.00
 * multiplier (the placeholder config) makes the quotient an exact integer, so floor and
 * round agree there.
 */
function scaledMinLevel(floor: number, config: BalanceConfig): number {
  const {
    atFloor1Hundredths: a,
    atFloor100Hundredths: b,
    perFloorAfter100Hundredths: p,
  } = config.levelMultiplier
  if (floor <= 100) {
    return Math.floor((floor * (99 * a + (b - a) * (floor - 1))) / 9900)
  }
  return Math.floor((floor * (b + p * (floor - 100))) / 100)
}

export function enemyLevelRange(floor: number, config: BalanceConfig): LevelRange {
  const min = scaledMinLevel(floor, config)
  const max =
    min +
    config.levelRangeWidth.base +
    Math.floor(floor / 10) * config.levelRangeWidth.perTenFloors
  return { min, max }
}

/** Deterministic; NOT rolled -- `spec/run.md#fights-per-floor`: the fight *count* is
 * stable across visits, only the creatures/levels re-roll per visit. Default (data/balance.ts):
 * 10 + (floor - 1), uncapped (floor 1 = 10 fights, +1/floor). */
export function fightCount(floor: number, config: BalanceConfig): number {
  return config.fightCountBase + config.fightCountPerFloor * (floor - 1)
}

/** Ramps 1 -> enemyPartySizeCap and clamps there -- combat's max party size (6v6). Default cap
 * 6, so fights are 6v6 from floor 6 (`min(6, floor)`). */
export function enemyPartySize(floor: number, config: BalanceConfig): number {
  return Math.min(config.enemyPartySizeCap, floor)
}

/** A boss floor's boss spawns a few levels above that floor's own enemyLevelRange(floor).max.
 * Default offset 5, so the narrower
 * range doesn't lower boss levels: 19 / 34 / 52 on floors 10 / 20 / 30. */
export function bossLevel(floor: number, config: BalanceConfig): number {
  return enemyLevelRange(floor, config).max + config.bossLevelOffset
}
