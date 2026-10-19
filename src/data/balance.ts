// The real BalanceConfig values (the engine owns the shape, see engine/balance-types.ts). The
// numbers were tuned by the balancing pass; what is still open is in
// `OPEN_QUESTIONS.md#balance-numbers`.

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
  levelRangeWidth: { base: 0, perTenFloors: 1 },
  bossLevelOffset: 5,
  rarityDrawWeight: { common: 6, uncommon: 3, rare: 1 },
  soulGainPercent: { common: 25, uncommon: 20, rare: 10 },
  xpCurveCoefficient: 20,
  xpCurveExponent: 2,
  xpPerKillMultiplier: 1,
  introXpGrant: 10,
  currencyPerFloor: 1,
  bricksMinimum: 1,
  bricksPerTenFloors: 1,
  summonCost: 0,
  perkPointsPerBoss: 100,
}
