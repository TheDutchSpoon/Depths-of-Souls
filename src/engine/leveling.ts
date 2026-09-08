// Phase 4 Slice A: creature leveling. Pure, no RNG. GAME_DESIGN §5 / CONVENTIONS "Stat growth
// is linear and derived from base stats" -- this is the first slice any creature has a level,
// so this formula was fully specified but never implemented before now.

import type { CreatureStats } from './types'

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
 * ASSUMPTION 1 (phase-4-implementation-plan.md, Slice A): the XP curve's shape is parked
 * balance (GAME_DESIGN §13 -- "XP/level growth pacing"). A simple monotonic placeholder,
 * isolated behind this one function so retuning in playtest never touches a call site.
 */
export function xpForNextLevel(level: number): number {
  return 100 * level
}
