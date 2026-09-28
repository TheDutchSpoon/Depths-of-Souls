// Phase 4 Slice A; reworked Phase 4.1-A (A7 + D1 defaults) -- depth-scaling curves for the run
// layer, now PARAMETERIZED by an injected BalanceConfig instead of hardcoded literals. Every
// number is still explicitly parked balance (GAME_DESIGN §13); retuning happens in
// data/balance.ts, never here.

import type { BalanceConfig } from './balance-types'

export interface LevelRange {
  readonly min: number
  readonly max: number
}

export type RarityTier = 'common' | 'uncommon' | 'rare'

/**
 * ASSUMPTION 4 (phase-4.1-implementation-plan.md) + the 4.1-A plan review's own correction:
 * min = round(floor * m(floor)), where m(floor) rises linearly from
 * levelMultiplier.atFloor1Hundredths/100 at floor 1 to .../atFloor100Hundredths/100 at floor
 * 100, then + perFloorAfter100Hundredths/100 per floor after. Computed with a SINGLE Math.round
 * at the very end -- multiplying out before dividing keeps the whole computation exact integer
 * arithmetic until that one rounding, so there is no compounding float drift across floors (the
 * plan's own "no intermediate rounding of the multiplier" requirement).
 */
function scaledMinLevel(floor: number, config: BalanceConfig): number {
  const {
    atFloor1Hundredths: a,
    atFloor100Hundredths: b,
    perFloorAfter100Hundredths: p,
  } = config.levelMultiplier
  if (floor <= 100) {
    return Math.round((floor * (99 * a + (b - a) * (floor - 1))) / 9900)
  }
  return Math.round((floor * (b + p * (floor - 100))) / 100)
}

export function enemyLevelRange(floor: number, config: BalanceConfig): LevelRange {
  const min = scaledMinLevel(floor, config)
  const max =
    min +
    config.levelRangeWidth.base +
    Math.floor(floor / 10) * config.levelRangeWidth.perTenFloors
  return { min, max }
}

/** Deterministic; NOT rolled -- CONVENTIONS "Generation & the run layer": the fight *count* is
 * stable across visits, only the creatures/levels re-roll per visit. Default (data/balance.ts):
 * 10 + (floor - 1), uncapped (floor 1 = 10 fights, +1/floor). */
export function fightCount(floor: number, config: BalanceConfig): number {
  return config.fightCountBase + config.fightCountPerFloor * (floor - 1)
}

/** Ramps 1 -> enemyPartySizeCap and clamps there -- combat's max party size (6v6). Default cap
 * 6, so fights are 6v6 from floor 6 (`min(6, floor)`, unchanged from Phase 4). */
export function enemyPartySize(floor: number, config: BalanceConfig): number {
  return Math.min(config.enemyPartySizeCap, floor)
}

/** A boss floor's boss spawns a few levels above that floor's own enemyLevelRange(floor).max.
 * Default offset 3 (unchanged from Phase 4 Slice I). */
export function bossLevel(floor: number, config: BalanceConfig): number {
  return enemyLevelRange(floor, config).max + config.bossLevelOffset
}
