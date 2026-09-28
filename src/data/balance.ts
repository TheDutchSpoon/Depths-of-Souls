// Phase 4.1-A (A7 + D1 defaults): the real, tuned BalanceConfig values (the engine owns the
// shape, see engine/balance-types.ts). First tuning pass lands in Phase 4.1-H; every number here
// is explicitly parked balance (GAME_DESIGN §13) until then.

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
  levelRangeWidth: { base: 2, perTenFloors: 1 },
  bossLevelOffset: 3,
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
