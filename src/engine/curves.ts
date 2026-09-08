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

/** The ceiling `enemyPartySize` ramps to and clamps at -- combat's max party size (6v6). */
export const ENEMY_PARTY_SIZE = 6

/**
 * Decided in review of Slice A, superseding the earlier flat-6 reading of the brief's "up to 6
 * enemy slots": enemy party size scales with depth, ramping 1 -> ENEMY_PARTY_SIZE and clamping
 * there -- the same treatment enemyLevelRange already gets, rather than every fight spawning
 * the full slate from floor 1. Exact ramp shape is parked balance (GAME_DESIGN §13); this is
 * the simplest monotonic 1->6 placeholder, tuned in playtest.
 */
export function enemyPartySize(floor: number): number {
  return Math.min(ENEMY_PARTY_SIZE, floor)
}

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
