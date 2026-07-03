export const ROUND_CAP = 100 // N full rounds complete, then the fight ends as a draw.
// Placeholder per GAME_DESIGN §13 (exact number TBD).

export const AFFINITY_ADVANTAGE_MULTIPLIER = 1.25
export const AFFINITY_DISADVANTAGE_MULTIPLIER = 0.75
export const AFFINITY_NEUTRAL_MULTIPLIER = 1.0

export const CHIP_FLOOR_RATE = 0.01

// Defend: +50% effective Defence (inside the core) and a x0.65 factor in the defender's
// taken pool, both until the creature's next turn.
export const DEFEND_DEFENCE_MULTIPLIER = 1.5
export const DEFEND_TAKEN_FACTOR = 0.65

// Fixture/data-default convenience only -- no engine logic reads this; Creature.equippedSpells
// stays a variable-length array so trait/forge slot-count changes fit later without a retype.
export const DEFAULT_GEM_SLOT_COUNT = 3

// Loop safety (Phase 3): counts trigger-cascade CHAIN DEPTH, not breadth. An over-cap trigger
// does not execute; a mandatory CascadeTruncated event is emitted and resolution unwinds. Depth
// is transient (call-stack only), never stored in CombatState. Wired in Slice B.
export const MAX_TRIGGER_CASCADE_DEPTH = 500
