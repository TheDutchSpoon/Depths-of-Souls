// Creature leveling. Pure,
// no RNG. `spec/creatures.md#levels-and-xp`

import type { CreatureStats } from './types'
import type { BalanceConfig } from './balance-types'
import { STAT_GROWTH_PER_LEVEL } from './config'

/**
 * Level-N stat = round(base * (1 + STAT_GROWTH_PER_LEVEL * (level - 1))), recomputed from base every call --
 * never accumulated, so there is no rounding drift across repeated level-ups. Level 1 returns
 * base unchanged (factor === 1).
 */
export function scaleStatsToLevel(base: CreatureStats, level: number): CreatureStats {
  const factor = 1 + STAT_GROWTH_PER_LEVEL * (level - 1)
  return {
    health: Math.round(base.health * factor),
    attack: Math.round(base.attack * factor),
    intelligence: Math.round(base.intelligence * factor),
    defence: Math.round(base.defence * factor),
    speed: Math.round(base.speed * factor),
  }
}

/**
 * Parameters, not a function -- xpCurveCoefficient/
 * xpCurveExponent live in BalanceConfig so retuning happens in data/balance.ts. Default
 * `20 * level^2` (quadratic, `spec/creatures.md#levels-and-xp`): XP per floor clear grows with floor^2 (kills ∝
 * floor at victim levels ∝ floor), so a quadratic curve keeps party level ≈ floor at every
 * depth.
 */
export function xpForNextLevel(level: number, config: BalanceConfig): number {
  return Math.round(config.xpCurveCoefficient * level ** config.xpCurveExponent)
}

/**
 * XP per kill = the victim's OWN level (Creature.origin.level),
 * awarded to every party member regardless of survival.
 * xpPerKillMultiplier is the config lever (default 1).
 */
export function xpAwardForKill(victimLevel: number, config: BalanceConfig): number {
  return Math.round(config.xpPerKillMultiplier * victimLevel)
}
