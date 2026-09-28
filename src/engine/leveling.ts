// Phase 4 Slice A; XP curve reworked Phase 4.1-A (A7, ASSUMPTION 5) -- creature leveling. Pure,
// no RNG. GAME_DESIGN §5 / CONVENTIONS "Stat growth is linear and derived from base stats."

import type { CreatureStats } from './types'
import type { BalanceConfig } from './balance-types'

/**
 * Level-N stat = round(base * (1 + 0.25 * (level - 1))), recomputed from base every call --
 * never accumulated, so there is no rounding drift across repeated level-ups. Level 1 returns
 * base unchanged (factor === 1).
 */
export function scaleStatsToLevel(base: CreatureStats, level: number): CreatureStats {
  const factor = 1 + 0.25 * (level - 1)
  return {
    health: Math.round(base.health * factor),
    attack: Math.round(base.attack * factor),
    intelligence: Math.round(base.intelligence * factor),
    defence: Math.round(base.defence * factor),
    speed: Math.round(base.speed * factor),
  }
}

/**
 * Phase 4.1-A (A7, ASSUMPTION 5): parameters, not a function -- xpCurveCoefficient/
 * xpCurveExponent live in BalanceConfig so retuning happens in data/balance.ts. Default
 * `20 * level^2` (quadratic, GAME_DESIGN §5): XP per floor clear grows with floor^2 (kills ∝
 * floor at victim levels ∝ floor), so a quadratic curve keeps party level ≈ floor at every
 * depth. Replaces Phase 4's linear `100 * level` placeholder.
 */
export function xpForNextLevel(level: number, config: BalanceConfig): number {
  return Math.round(config.xpCurveCoefficient * level ** config.xpCurveExponent)
}

/**
 * Phase 4.1-A (ASSUMPTION 5): XP per kill = the victim's OWN level (Creature.origin.level, A5),
 * awarded to every party member regardless of survival -- replaces Phase 4's floor-scaled
 * placeholder (`10 * floor`), which had no way to read the defeated Creature's actual level.
 * xpPerKillMultiplier is the config lever (default 1).
 */
export function xpAwardForKill(victimLevel: number, config: BalanceConfig): number {
  return Math.round(config.xpPerKillMultiplier * victimLevel)
}
