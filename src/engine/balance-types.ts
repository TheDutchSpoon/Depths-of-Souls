// Phase 4.1-A (A7): the engine OWNS this shape; the values live in data/balance.ts (real) or a
// test fixture (the Phase-4 placeholder, __fixtures__/balance.ts) -- CONVENTIONS "Where each
// number lives": progression/economy numbers are an injected BalanceConfig, combat rule
// constants (affinity, chip floor, Defend, round cap, cascade depth, MAX_REVIVES_PER_CREATURE)
// stay in engine/config.ts. Curves are PARAMETERS, not functions/closures, so this is plain data
// a simulator can sweep and a save can ignore.

import type { RarityTier } from './curves'

export interface BalanceConfig {
  /** fightCount(floor) = fightCountBase + fightCountPerFloor * (floor - 1). Default: 10, 1
   * (floor 1 -> 10 fights, +1/floor, uncapped). */
  readonly fightCountBase: number
  readonly fightCountPerFloor: number

  /** enemyPartySize(floor) = min(enemyPartySizeCap, floor). Default cap 6 (6v6 by floor 6). */
  readonly enemyPartySizeCap: number

  /**
   * The enemy level multiplier (ASSUMPTION 4): rises linearly from
   * atFloor1Hundredths/100 at floor 1 to atFloor100Hundredths/100 at floor 100, then
   * + perFloorAfter100Hundredths/100 per floor after. Expressed in HUNDREDTHS (integers) so
   * enemyLevelRange can do the whole min-level computation in exact integer arithmetic with a
   * SINGLE Math.round at the end (see curves.ts's scaledMinLevel) -- never rounding the
   * multiplier itself first.
   */
  readonly levelMultiplier: {
    readonly atFloor1Hundredths: number
    readonly atFloor100Hundredths: number
    readonly perFloorAfter100Hundredths: number
  }

  /** enemyLevelRange(floor).max = min + levelRangeWidth.base + floor(floor/10) *
   * levelRangeWidth.perTenFloors. Default 2, 1 (Phase 4's own width rule, unchanged by 4.1). */
  readonly levelRangeWidth: { readonly base: number; readonly perTenFloors: number }

  /** bossLevel(floor) = enemyLevelRange(floor).max + bossLevelOffset. Default 3. */
  readonly bossLevelOffset: number

  /** Within-species rarity-weighted draw. Default {common:6, uncommon:3, rare:1} (unchanged by
   * 4.1 -- only soul gain, below, changed). */
  readonly rarityDrawWeight: Record<RarityTier, number>

  /** Flat soul% banked per kill, by the victim's rarity. Default {common:25, uncommon:20,
   * rare:10} (4.1-A's new values; Phase 4 shipped {10,5,2}). */
  readonly soulGainPercent: Record<RarityTier, number>

  /** xpForNextLevel(level) = round(xpCurveCoefficient * level ** xpCurveExponent). Default 20, 2
   * (quadratic -- GAME_DESIGN §5 / ASSUMPTION 5). */
  readonly xpCurveCoefficient: number
  readonly xpCurveExponent: number

  /** xpAwardForKill(victimLevel) = round(xpPerKillMultiplier * victimLevel) -- the victim's OWN
   * level (Creature.origin.level, A5), replacing the old floor-scaled placeholder. Default 1. */
  readonly xpPerKillMultiplier: number

  /** currencyDropForKill(floor): essence/ore/lifeforce = floor * currencyPerFloor; bricks =
   * max(bricksMinimum, floor(floor/10) * bricksPerTenFloors). Defaults 1, 1, 1 (unchanged by
   * 4.1 -- reproduces Phase 4's {essence:floor, ore:floor, bricks:max(1,floor(floor/10)),
   * lifeforce:floor} exactly). */
  readonly currencyPerFloor: number
  readonly bricksMinimum: number
  readonly bricksPerTenFloors: number

  /** Soul% required to summon is always 100 (fixed); this is the CURRENCY cost of summon()
   * itself (Phase 4.1-G). Default 0 (free), per GAME_DESIGN §9. Nothing reads it until Phase 8's
   * Soul Altar names the currency it is paid in (ASSUMPTION 90). */
  readonly summonCost: number
}
