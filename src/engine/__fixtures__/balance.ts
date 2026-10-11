// Test-only fixture. NOT shipped in src/data -- a fixed BalanceConfig holding the placeholder
// generation/curve numbers: every generation/store/integration test that wants stable numbers
// pins THIS config, so tuning the real default config doesn't move them. Never imported by
// src/app or src/ui.

import type { BalanceConfig } from '../balance-types'

/**
 * Hard-coded generation/curve behaviour as a BalanceConfig:
 *  - fightCount(floor) = 3 (flat, floor-independent -- fightCountPerFloor: 0).
 *  - enemyLevelRange(floor) = {min: floor, max: floor + 2 + floor(floor/10)} -- a flat x1.00
 *    multiplier at both ends (atFloor1Hundredths === atFloor100Hundredths === 100,
 *    perFloorAfter100Hundredths: 0) makes scaledMinLevel(floor) === floor exactly, for every
 *    floor (curves.ts's post-100 branch only needs perFloorAfter100Hundredths to diverge, and it
 *    doesn't here).
 *  - enemyPartySize(floor) = min(6, floor), the same value as the real default config.
 *  - rarityDrawWeight {6,3,1}, the same as the real default config.
 *  - soulGainPercent {10,5,2} (the real default config uses {25,20,10}).
 *  - currency drop shape: currencyPerFloor/bricksMinimum/bricksPerTenFloors are the same as the
 *    real default config's.
 *
 * XP is two independent fields:
 *  - `xpForNextLevel`'s curve is `100 * level`, exactly `xpCurveCoefficient: 100,
 *    xpCurveExponent: 1` (the real default is `20 * level^2` -- `coefficient: 20, exponent: 2`,
 *    the SAME two parameters with other values), so `applyXpGain` under this fixture levels on a
 *    linear curve.
 *  - `xpAwardForKill(victimLevel)` is VICTIM-LEVEL-scaled and has no floor argument at all, so no
 *    config value gives a floor-based amount. `xpPerKillMultiplier` is simply the default (1):
 *    every store/integration test's `xpBanked` expectation follows the victim's level
 *    (`spec/creatures.md#levels-and-xp`).
 */
export const PHASE_4_PLACEHOLDER_BALANCE_CONFIG: BalanceConfig = {
  fightCountBase: 3,
  fightCountPerFloor: 0,
  enemyPartySizeCap: 6,
  levelMultiplier: {
    atFloor1Hundredths: 100,
    atFloor100Hundredths: 100,
    perFloorAfter100Hundredths: 0,
  },
  levelRangeWidth: { base: 2, perTenFloors: 1 },
  bossLevelOffset: 3,
  rarityDrawWeight: { common: 6, uncommon: 3, rare: 1 },
  soulGainPercent: { common: 10, uncommon: 5, rare: 2 },
  xpCurveCoefficient: 100,
  xpCurveExponent: 1,
  xpPerKillMultiplier: 1,
  currencyPerFloor: 1,
  bricksMinimum: 1,
  bricksPerTenFloors: 1,
  summonCost: 0,
}
