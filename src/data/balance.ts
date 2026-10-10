// Phase 4.1-A (A7 + D1 defaults): the real BalanceConfig values (the engine owns the shape, see
// engine/balance-types.ts). 4.1-H2c applied the H2 grill's run-structure rulings (the level-range
// width and the boss offset below, ASSUMPTIONS 118, 119); the balancing pass (4.1-H2d) tunes the
// rest. Every number here is parked balance (GAME_DESIGN §13) until then.

import type { BalanceConfig } from '../engine/balance-types'

export const DEFAULT_BALANCE_CONFIG: BalanceConfig = {
  fightCountBase: 10,
  fightCountPerFloor: 1,
  enemyPartySizeCap: 6,
  levelMultiplier: {
    atFloor1Hundredths: 125, // x1.25
    atFloor100Hundredths: 200, // x2.00
    perFloorAfter100Hundredths: 1, // +0.01/floor after 100
  },
  levelRangeWidth: { base: 0, perTenFloors: 1 }, // 4.1-H2c (ASSUMPTION 118): was base 2
  bossLevelOffset: 5, // 4.1-H2c (ASSUMPTION 119): was 3
  rarityDrawWeight: { common: 6, uncommon: 3, rare: 1 },
  soulGainPercent: { common: 25, uncommon: 20, rare: 10 },
  xpCurveCoefficient: 20,
  xpCurveExponent: 2,
  xpPerKillMultiplier: 1,
  currencyPerFloor: 1,
  bricksMinimum: 1,
  bricksPerTenFloors: 1,
  summonCost: 0,
}
