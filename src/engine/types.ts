import type { CreatureId } from './ids'
import type { SeededRng } from './rng'
import type { Script } from './scripting-types'
import type { ActiveEffect, Hook, StatusDef, StatusSpec } from './effect-types'

// ---- Stats & affinity ----

export type Stat = 'health' | 'attack' | 'intelligence' | 'defence' | 'speed'

export type Affinity = 'body' | 'spirit' | 'mind' | 'void' | 'primal'

export type Side = 'player' | 'enemy'

// ---- Spells ----

export interface Spell {
  readonly id: string
  readonly name: string
  readonly targetShape: 'single' | 'aoe'
  readonly spellPower: number
  /** Applied to the target(s) after damage lands, if the target survives. */
  readonly appliesStatus?: StatusSpec
}

// ---- Creature ----

export interface CreatureStats {
  readonly health: number
  readonly attack: number
  readonly intelligence: number
  readonly defence: number
  readonly speed: number
}

/**
 * Base stats are immutable for the lifetime of a fight. Current/effective values
 * are always derived via getEffectiveStat/getOffensiveStat, never read from
 * baseStats directly inside combat math.
 */
export interface Creature {
  readonly id: CreatureId
  readonly side: Side
  readonly slot: number
  readonly baseStats: CreatureStats
  readonly affinity: Affinity
  readonly currentHp: number
  readonly alive: boolean
  /** Reference to a shared script template in CombatState.scripts; null = no assignment. */
  readonly scriptId: string | null
  /** Variable-length; bare Spell slots (not the Gem wrapper -- that's Phase 8 economy). */
  readonly equippedSpells: readonly (Spell | null)[]
  /** Until this creature's next turn: +50% effective Defence, -35% damage taken. */
  readonly defending: boolean
  /** Until this creature's next turn: single-target offensive actions against it redirect here. */
  readonly provoking: boolean
  /** Static references (1 base / 2 fused) resolved from the trait registry at fight-start. */
  readonly innateTraitIds: readonly string[]
  /**
   * Fight-scoped, mutable effect list (threaded via updateCreature). Instantiated from
   * innateTraitIds at createCombat; statuses append here in-fight (Slice C). Canonical order:
   * innate-1 -> innate-2 -> artifact infusions (none in v1) -> applied statuses.
   */
  readonly activeEffects: readonly ActiveEffect[]
}

// ---- Actions ----

export interface AttackAction {
  readonly kind: 'attack'
  readonly targetId: CreatureId
}

export interface CastSingleAction {
  readonly kind: 'cast'
  readonly targetShape: 'single'
  readonly gemSlot: number
  readonly targetId: CreatureId
}

export interface CastAoeAction {
  readonly kind: 'cast'
  readonly targetShape: 'aoe'
  readonly gemSlot: number
  // No target list here: the frozen "all living enemies, slot order" set is computed
  // once inside executeCastAoe and recorded only on the SpellCast event, not the Action.
}

export type CastAction = CastSingleAction | CastAoeAction

export interface DefendAction {
  readonly kind: 'defend'
}

export interface ProvokeAction {
  readonly kind: 'provoke'
}

export interface WaitAction {
  readonly kind: 'wait'
}

export type Action = AttackAction | CastAction | DefendAction | ProvokeAction | WaitAction

// ---- Result ----

export type FightResult = 'win' | 'loss' | 'draw'

// ---- Combat state ----

export interface CombatState {
  readonly rng: SeededRng
  readonly playerParty: readonly Creature[]
  readonly enemyParty: readonly Creature[]
  /** Frozen for the current round; rebuilt only at round-start. Empty before round 1. */
  readonly turnQueue: readonly CreatureId[]
  /** Index into turnQueue of the next creature to act. */
  readonly turnCursor: number
  /** 1-based; 0 before the first RoundStarted. */
  readonly round: number
  readonly result: FightResult | null
  /** Script template registry for this fight, keyed by Script.id. */
  readonly scripts: ReadonlyMap<string, Script>
  /** Status definition registry for this fight, keyed by StatusDef.statusId. */
  readonly statuses: ReadonlyMap<string, StatusDef>
}

// ---- Events ----
// Discriminant casing is PascalCase across all three families (intent, consequence,
// lifecycle), consistently — golden fixtures hard-code these strings.

// Intent events: one variant per action kind, always emitted (including no-consequence
// actions once they exist, e.g. a future Wait).
export interface AttackDeclaredEvent {
  readonly type: 'AttackDeclared'
  readonly attackerId: CreatureId
  readonly targetId: CreatureId
}

export interface SpellCastSingleEvent {
  readonly type: 'SpellCast'
  readonly targetShape: 'single'
  readonly casterId: CreatureId
  readonly gemSlot: number
  readonly targetId: CreatureId
}

export interface SpellCastAoeEvent {
  readonly type: 'SpellCast'
  readonly targetShape: 'aoe'
  readonly casterId: CreatureId
  readonly gemSlot: number
  readonly targetIds: readonly CreatureId[]
}

export type SpellCastEvent = SpellCastSingleEvent | SpellCastAoeEvent

export interface DefendedEvent {
  readonly type: 'Defended'
  readonly creatureId: CreatureId
}

export interface ProvokedEvent {
  readonly type: 'Provoked'
  readonly creatureId: CreatureId
}

export interface WaitedEvent {
  readonly type: 'Waited'
  readonly creatureId: CreatureId
}

/** Precedes a triggered effect's consequences (mirrors AttackDeclared->DamageDealt). Slice B.
 * `effectId` is the stable definition id (trait/status), not the opaque instance id. */
export interface TriggerFiredEvent {
  readonly type: 'TriggerFired'
  readonly sourceId: CreatureId
  readonly hook: Hook
  readonly effectId: string
}

export type IntentEvent =
  | AttackDeclaredEvent
  | SpellCastEvent
  | DefendedEvent
  | ProvokedEvent
  | WaitedEvent
  | TriggerFiredEvent

// Consequence events: shared across any future source, not just Attack.
export interface DamageDealtEvent {
  readonly type: 'DamageDealt'
  readonly sourceId: CreatureId
  readonly targetId: CreatureId
  /** Full-precision value before the final MAX(1, floor(...)) clamp. */
  readonly rawDamage: number
  /** The actual integer HP removed. */
  readonly finalDamage: number
  readonly affinityMultiplier: number
  readonly wasChipOnly: boolean
  readonly remainingHp: number
  /** What produced this damage. 'dot' bypasses Defence and carries no TriggerFired (Slice C). */
  readonly damageSource: 'attack' | 'cast' | 'dot'
  /** The causing status, when a status produced this damage (DoT ticks). Absent for attack/cast
   * and for a trait's own dot-tagged flat hit. Lets the log render "[creature] took X poison
   * damage" and Phase 7 attribute it. */
  readonly statusId?: string
}

export interface CreatureDiedEvent {
  readonly type: 'CreatureDied'
  readonly creatureId: CreatureId
}

// ---- Phase 3 consequence events (front-loaded for a stable type surface; emitted in the
// slice that owns the mechanism: StatModifierApplied/HpClamped in B, the rest in C). ----

export interface StatusAppliedEvent {
  readonly type: 'StatusApplied'
  readonly targetId: CreatureId
  readonly statusId: string
  readonly stacks: number
  readonly duration: number
  readonly sourceId?: CreatureId
}

export interface StatusExpiredEvent {
  readonly type: 'StatusExpired'
  readonly creatureId: CreatureId
  readonly statusId: string
}

export interface StatModifierAppliedEvent {
  readonly type: 'StatModifierApplied'
  readonly sourceId: CreatureId
  readonly targetId: CreatureId
  readonly stat: Stat
  readonly factor: number
  readonly effectiveBefore: number
  readonly effectiveAfter: number
}

/** Emitted only when a lowered effective max Health actually reduces currentHp (after the
 * StatModifierApplied that caused it). Neither damage nor heal — an explicit currentHp drop. */
export interface HpClampedEvent {
  readonly type: 'HpClamped'
  readonly creatureId: CreatureId
  readonly previousHp: number
  readonly newHp: number
  readonly effectiveMaxHealth: number
}

export interface HealAppliedEvent {
  readonly type: 'HealApplied'
  readonly sourceId: CreatureId
  readonly targetId: CreatureId
  readonly amount: number
  readonly remainingHp: number
}

/** Loop-safety: emitted when a trigger cascade would exceed MAX_TRIGGER_CASCADE_DEPTH. */
export interface CascadeTruncatedEvent {
  readonly type: 'CascadeTruncated'
  readonly creatureId: CreatureId
  readonly effectId: string
  readonly depth: number
}

export type ConsequenceEvent =
  | DamageDealtEvent
  | CreatureDiedEvent
  | StatusAppliedEvent
  | StatusExpiredEvent
  | StatModifierAppliedEvent
  | HpClampedEvent
  | HealAppliedEvent
  | CascadeTruncatedEvent

// Lifecycle events. TurnStarted/TurnEnded are real events (not just internal hook
// checkpoints) so playback has an explicit boundary even for no-op/skipped turns.
export interface FightStartedEvent {
  readonly type: 'FightStarted'
}

export interface RoundStartedEvent {
  readonly type: 'RoundStarted'
  readonly round: number
}

export interface TurnStartedEvent {
  readonly type: 'TurnStarted'
  readonly creatureId: CreatureId
}

export interface TurnEndedEvent {
  readonly type: 'TurnEnded'
  readonly creatureId: CreatureId
}

export interface FightEndedEvent {
  readonly type: 'FightEnded'
  readonly result: FightResult
}

export type LifecycleEvent =
  | FightStartedEvent
  | RoundStartedEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | FightEndedEvent

export type CombatEvent = IntentEvent | ConsequenceEvent | LifecycleEvent
