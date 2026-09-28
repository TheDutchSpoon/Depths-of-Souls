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
 * XP splits into two independent fields, and only one of them is truly inexpressible
 * (Phase 4.1-A review fix F6 -- an earlier draft of this fixture wrongly set BOTH xpCurve* fields
 * to the new defaults, claiming neither had an old-compatible expression):
 *  - `xpForNextLevel`'s curve IS expressible: Phase 4's `100 * level` is exactly
 *    `xpCurveCoefficient: 100, xpCurveExponent: 1` (the new default is `20 * level^2` --
 *    `coefficient: 20, exponent: 2` -- a different pair of the SAME two parameters, not a
 *    different mechanism). Set to the old values here, so `applyXpGain` under this fixture
 *    reproduces Phase 4's leveling exactly.
 *  - `xpAwardForKill` truly has no old-compatible expression: Phase 4's was FLOOR-scaled
 *    (`10 * floor`); 4.1's `xpAwardForKill(victimLevel)` signature is VICTIM-LEVEL-scaled and
 *    has no floor argument at all -- there is no config value that recovers a floor-based amount
 *    from a level-based formula. `xpPerKillMultiplier` is simply the new default (1): every
 *    store/integration test's `xpBanked` expectation changes accordingly, and each change is
 *    listed in the PR, per ASSUMPTION 3.
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
