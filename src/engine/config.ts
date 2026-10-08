export const ROUND_CAP = 100 // N full rounds complete, then the fight ends as a draw.
// Placeholder per GAME_DESIGN §13 (exact number TBD).

export const AFFINITY_ADVANTAGE_MULTIPLIER = 1.25
export const AFFINITY_DISADVANTAGE_MULTIPLIER = 0.75
export const AFFINITY_NEUTRAL_MULTIPLIER = 1.0

export const CHIP_FLOOR_RATE = 0.01

// The Additional (Phase 4.1-H2a, brief ASSUMPTION 110/135): a fading flat bonus on DIRECT hits,
// `min(floor(maxHp * PERCENT / 100), max(0, BASE_CAP - FADE_PER_LEVEL * (attackerLevel - 1)))`.
// The 20% is an integer percent (the float rule: floor(maxHp * 20 / 100), never maxHp * 0.2).
export const ADDITIONAL_MAX_HP_PERCENT = 20
export const ADDITIONAL_BASE_CAP = 10
export const ADDITIONAL_CAP_FADE_PER_LEVEL = 1

// Indirect damage (Phase 4.1-H2a, brief ASSUMPTION 112): meets only this fraction of the target's
// effective Defence, instead of the direct formula's whole Defence.
export const INDIRECT_DEFENCE_RATE = 0.2

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

// Phase 4.1-B (D3): a creature can be revived at most this many times per fight -- Creature.
// revivesUsed counts. Dead allies at the cap are excluded from revive targeting; an empty
// eligible pool fizzles (TriggerFired only) and draws no random number.
export const MAX_REVIVES_PER_CREATURE = 10
