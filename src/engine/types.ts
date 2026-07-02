import type { CreatureId } from './ids'
import type { SeededRng } from './rng'

// ---- Stats & affinity ----

export type Stat = 'health' | 'attack' | 'intelligence' | 'defence' | 'speed'

export type Affinity = 'body' | 'spirit' | 'mind' | 'void' | 'primal'

export type Side = 'player' | 'enemy'

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
}

// ---- Actions ----

export interface AttackAction {
  readonly kind: 'attack'
  readonly targetId: CreatureId
}

// Future variants (Phase 2+): CastAction | DefendAction | ProvokeAction | WaitAction
export type Action = AttackAction

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

export type IntentEvent = AttackDeclaredEvent

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
}

export interface CreatureDiedEvent {
  readonly type: 'CreatureDied'
  readonly creatureId: CreatureId
}

export type ConsequenceEvent = DamageDealtEvent | CreatureDiedEvent

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
