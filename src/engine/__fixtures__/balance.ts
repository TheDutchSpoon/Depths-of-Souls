// Test-only fixture (Phase 4.1-A, ASSUMPTION 3). NOT shipped in src/data -- proves that moving
// Phase 4's hardcoded generation/curve numbers into an injected BalanceConfig changed nothing:
// every existing generation/store/integration test pins THIS config and its outcomes stay
// byte-identical to Phase 4, with one deliberate exception (XP -- see below). Never imported by
// src/app or src/ui.

import type { BalanceConfig } from '../balance-types'

/**
 * Reproduces Phase 4's exact generation/curve behaviour:
 *  - fightCount(floor) = 3 (flat, floor-independent -- fightCountPerFloor: 0).
 *  - enemyLevelRange(floor) = {min: floor, max: floor + 2 + floor(floor/10)} -- a flat x1.00
 *    multiplier at both ends (atFloor1Hundredths === atFloor100Hundredths === 100,
 *    perFloorAfter100Hundredths: 0) makes scaledMinLevel(floor) === floor exactly, for every
 *    floor (curves.ts's post-100 branch only needs perFloorAfter100Hundredths to diverge, and it
 *    doesn't here).
 *  - enemyPartySize(floor) = min(6, floor) -- unchanged between Phase 4 and 4.1, so this field is
 *    the same value as the real default config.
 *  - rarityDrawWeight {6,3,1} -- unchanged between Phase 4 and 4.1.
 *  - soulGainPercent {10,5,2} -- Phase 4's OLD values (4.1-A's new default is {25,20,10}).
 *  - currency drop shape -- unchanged between Phase 4 and 4.1 (currencyPerFloor/bricksMinimum/
 *    bricksPerTenFloors are the same in both configs).
 *
 * XP is the one deliberate exception (ASSUMPTION 3/5): Phase 4's `xpAwardForKill` was
 * FLOOR-scaled (`10 * floor`) and `xpForNextLevel` was `100 * level`. Neither has an
 * old-compatible expression under 4.1's new, VICTIM-LEVEL-scaled `xpAwardForKill(victimLevel)`
 * signature -- there is no config value that recovers "floor-scaled" from a level-based formula.
 * So this fixture's XP fields are simply the SAME as the real default config (20/2/1): every
 * store/integration test's `xpBanked` expectation changes accordingly, and each change is listed
 * in the PR, per ASSUMPTION 3.
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
  xpCurveCoefficient: 20,
  xpCurveExponent: 2,
  xpPerKillMultiplier: 1,
  currencyPerFloor: 1,
  bricksMinimum: 1,
  bricksPerTenFloors: 1,
  summonCost: 0,
}
