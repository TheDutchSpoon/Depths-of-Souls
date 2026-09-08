// Phase 4 Slice A: depth-scaling curves for the run layer. Every number here is explicitly
// parked balance (GAME_DESIGN §13's "master difficulty lever" / "soul-per-kill % per rarity
// tier") -- each curve lives behind its own small function/table so retuning in playtest never
// touches generation.ts's call sites.

export interface LevelRange {
  readonly min: number
  readonly max: number
}

/**
 * ASSUMPTION 2: exact curve shape / width-growth rate is parked balance (§13). A simple
 * explicit placeholder -- enemy level tracks floor 1:1 at the low end, and the range widens
 * (the intended variance axis) as depth increases.
 */
export function enemyLevelRange(floor: number): LevelRange {
  return { min: floor, max: floor + 2 + Math.floor(floor / 10) }
}

/**
 * ASSUMPTION 3: also parked balance. Flat placeholder, deterministic and NOT rolled -- the
 * fight *count* is stable across repeated visits to the same floor; only the creatures/levels
 * re-roll per visit (CONVENTIONS "Generation & the run layer").
 */
export function fightCount(floor: number): number {
  void floor // deliberately floor-independent for now -- see ASSUMPTION above.
  return 3
}

/**
 * ASSUMPTION (Slice A): the brief's "for each fight, for each of up to 6 enemy slots" doesn't
 * pin whether enemy count scales with depth. A flat 6 (the full 6v6 slate) is the simplest
 * reading and matches combat's max party size; not floor-scaled in v1. Revisit if a future
 * design pass wants enemy count to ramp like the level range does.
 */
export const ENEMY_PARTY_SIZE = 6

export type RarityTier = 'common' | 'uncommon' | 'rare'

/**
 * ASSUMPTION (Slice A): GAME_DESIGN §13 parks "soul-per-kill % per rarity tier" as balance but
 * never pins the SPAWN-weight per tier used by the within-species rarity-weighted creature
 * draw (§4/§5: "rarer creatures appear less often"). A simple descending placeholder stands in
 * until playtest tunes it -- common creatures are 6x as likely to spawn as rare ones.
 */
export const RARITY_DRAW_WEIGHT: Record<RarityTier, number> = {
  common: 6,
  uncommon: 3,
  rare: 1,
}
