// N full rounds complete, then the fight ends as a draw: a backstop for a fight that never ends
// (`spec/combat.md#turn-queue`). Whether 100 is the right cap is open (`OPEN_QUESTIONS.md#fight-length`).
export const ROUND_CAP = 100

export const AFFINITY_ADVANTAGE_MULTIPLIER = 1.25
export const AFFINITY_DISADVANTAGE_MULTIPLIER = 0.75
export const AFFINITY_NEUTRAL_MULTIPLIER = 1.0

export const CHIP_FLOOR_RATE = 0.01

// The Additional (`spec/combat.md#damage-channels-and-the-additional`): a fading flat bonus on DIRECT hits,
// `min(floor(maxHp * PERCENT / 100), max(0, BASE_CAP - FADE_PER_LEVEL * (attackerLevel - 1)))`.
// The 20% is an integer percent (the float rule: floor(maxHp * 20 / 100), never maxHp * 0.2).
export const ADDITIONAL_MAX_HP_PERCENT = 20
export const ADDITIONAL_BASE_CAP = 10
export const ADDITIONAL_CAP_FADE_PER_LEVEL = 1

// Indirect damage (`spec/combat.md#damage-channels-and-the-additional`): meets only this fraction of the target's
// effective Defence, instead of the direct formula's whole Defence.
export const INDIRECT_DEFENCE_RATE = 0.2

// Defend: +50% effective Defence (inside the core) and a x0.65 factor in the defender's
// taken pool, both until the creature's next turn.
export const DEFEND_DEFENCE_MULTIPLIER = 1.5
export const DEFEND_TAKEN_FACTOR = 0.65

// The stat growth per level above 1: `scaleStatsToLevel` multiplies base stats by
// `1 + STAT_GROWTH_PER_LEVEL * (level - 1)` (`spec/creatures.md#levels-and-xp`). Here, not in
// `BalanceConfig`, because `materializeCreature` takes no config.
export const STAT_GROWTH_PER_LEVEL = 0.25

// The regular gem slots a creature has by default: `materializeCreature` and `rollLoadout`
// (generation.ts) size a gem set by it, and fixtures default to it. Creature.equippedSpells stays
// a variable-length array so trait/forge slot-count changes fit later without a retype.
export const DEFAULT_GEM_SLOT_COUNT = 3

// Loop safety: counts trigger-cascade CHAIN DEPTH, not breadth. An over-cap trigger
// does not execute; a mandatory CascadeTruncated event is emitted and resolution unwinds. Depth
// is transient (call-stack only), never stored in CombatState.
export const MAX_TRIGGER_CASCADE_DEPTH = 500

// A creature can be revived at most this many times per fight -- Creature.
// revivesUsed counts. Dead allies at the cap are excluded from revive targeting; an empty
// eligible pool fizzles (TriggerFired only) and draws no random number.
export const MAX_REVIVES_PER_CREATURE = 10

// The HP a successful cheat-death save leaves, and the HP at or below which the roll is not
// made: a creature already at the survival HP gains nothing from a save
// (`spec/effects.md#cheat-death`). One name for both, so they cannot drift.
export const CHEAT_DEATH_SURVIVAL_HP = 1

// The party size a side may field: a creature's slot is an integer in 0..PARTY_SIZE-1
// (`spec/combat.md#automatic-6v6`). `createCombat` checks it at the boundary, and the store's
// party grid is this many slots wide.
export const PARTY_SIZE = 6
