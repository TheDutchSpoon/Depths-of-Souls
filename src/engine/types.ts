import type { CreatureId } from './ids'
import type { RngState } from './rng'
import type { Script } from './scripting-types'
import type {
  ActiveEffect,
  BaselineEffectEntry,
  Hook,
  EffectResponse,
  StatusDef,
} from './effect-types'

// ---- Stats & affinity ----

export type Stat = 'health' | 'attack' | 'intelligence' | 'defence' | 'speed'

export type Affinity = 'vitality' | 'violence' | 'wit' | 'endurance' | 'instinct'

export type Side = 'player' | 'enemy'

// ---- Spells ----

/**
 * A spell is data -- a target shape, an intended side, and a LIST of the same
 * `EffectResponse`s traits use (`effects`). The magnitude fields (`spellPower`, `scalingStat`,
 * the stat-modifier's `{ stat, factor }`, the status spec) live on those responses, not here.
 * Effects run once per landed target, in list order, through `executeResponse` directly (a chosen
 * action, never a trigger: no `TriggerFired`). `cast-target` names the current landed target; see
 * `spec/combat.md#spells-carry-responses` and `validateSpellEffects` (effect-types.ts).
 */
export interface Spell {
  readonly id: string
  readonly name: string
  /** Governs equipping only (canEquip(spell, creature) = spell.affinity === creature.affinity,
   * `spec/creatures.md#spell-affinity-gate`) -- the damage affinity cycle stays keyed on
   * the CASTER's affinity, never the spell's. First consumer: the generation
   * module, which rolls an affinity-matched spell per enemy gem slot. */
  readonly affinity: Affinity
  /** The biome number (1-based, matching `spec/run.md#biomes` "Biome 1"/"Biome 2" numbering) at which
   * this spell enters the shared pool. `generateFloor` rolls every enemy's gem set from every
   * spell whose `unlockedAtBiome` is `<=` the current biome's number, filtered by affinity -- so a
   * spell unlocked at biome 1 stays available at every deeper biome too (spells unlock
   * cumulatively; distinct from species/creature biome-exclusivity). REQUIRED. */
  readonly unlockedAtBiome: number
  readonly targetShape: 'single' | 'aoe'
  /** Who this spell targets (the support-spell model, REQUIRED).
   * 'ally' exempts the cast from the Provoke/Confusion targeting-override pipeline entirely
   * (`spec/combat.md#targeting-override`) -- Confusion is bundled into that same exemption,
   * since Confusion's roll is scoped to a "harmful action" and a support cast on an ally isn't
   * one) and, for 'aoe' shape, freezes the caster's own living side instead of the opposing side
   * (mirroring the enemy-AOE freeze rule). */
  readonly targetSide: 'enemy' | 'ally'
  /** What a successful cast does to each landed target, in order. */
  readonly effects: readonly EffectResponse[]
}

// ---- Creature ----

/**
 * run-layer identity on every combat creature -- REQUIRED, but
 * ENGINE-INERT (no engine code reads it; only the run layer/UI do, via origin.templateId).
 * `templateId` is the static SpeciesCreature.id this creature was materialized from; `level` is
 * the level it was materialized at (baked into baseStats by scaleStatsToLevel); `ref` is an
 * OPAQUE string the run layer may stash an InstanceId in (a plain string to the engine, never the
 * state-layer's branded type).
 */
export interface CreatureOrigin {
  readonly templateId: string
  readonly level: number
  readonly ref?: string
}

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
  /** Variable-length; bare Spell slots (not the Gem wrapper, `spec/creatures.md#gems-as-items`). */
  readonly equippedSpells: readonly (Spell | null)[]
  /** Until this creature's next turn: +50% effective Defence, -35% damage taken. */
  readonly defending: boolean
  /** Until this creature's next turn: single-target offensive actions against it redirect here. */
  readonly provoking: boolean
  /** Static references (1 base / 2 fused) resolved from the trait registry at fight-start. */
  readonly innateTraitIds: readonly string[]
  /**
   * Fight-scoped, mutable effect list (threaded via updateCreature). Instantiated from
   * innateTraitIds at createCombat; statuses append here in-fight. Canonical order
   * innate-1 -> innate-2 -> perks (player-side only) -> equipment
   * infusions (none in v1) -> applied statuses.
   */
  readonly activeEffects: readonly ActiveEffect[]
  /** This creature's resolved starting effect list -- innate traits' effects,
   * then (player-side only) perk effects, in canonical order -- computed ONCE at fight-setup by
   * `createCombat` and never re-derived from a registry mid-fight. `revive`'s death-reset
   * re-instantiates exactly this list (fresh instance ids from `CombatState.effectInstanceCounter`),
   * which is what lets `CombatState.traits`/`playerWideEffects` be deleted: nothing mid-fight needs
   * the trait/perk registries again. Plain data (EffectDef contains no functions). */
  readonly baselineEffects: readonly BaselineEffectEntry[]
  /** How many times `revive` has restored this creature THIS FIGHT -- never
   * reset by death or by a successful revive itself (it's the thing `MAX_REVIVES_PER_CREATURE`
   * bounds). Dead allies at the cap are excluded from revive targeting. */
  readonly revivesUsed: number
  /** "times Defended this battle" -- cumulative for the whole
   * fight, incremented in executeDefend, NEVER reset (Bulwark's "each time the creature has
   * Defended this battle"). Not derivable from activeEffects (Defend's own action-state flag
   * clears every turn); a small, explicit field. Feeds the 'self-defend-count' magnitudeSource kind
   * (effects.ts's resolveCount). */
  readonly defendCount: number
  /** A static species reference, read by the 'living-allies-of-species' magnitudeSource kind
   * (resolveCount) and the 'all-allies-of-species' response target. `materializeCreature` sets it
   * from the species it is given, so generated creatures always carry one; it is unset only for a
   * hand-built creature, for which both read empty (0 / no targets). */
  readonly speciesId?: string
  /** Required, engine-inert run-layer identity -- see CreatureOrigin's own doc
   * comment. Rewards read this (soul bar keyed by origin.templateId; XP per kill = the victim's
   * origin.level) instead of parsing the per-fight CreatureId's `-side-slot` suffix. */
  readonly origin: CreatureOrigin
  /** The creature's level, engine-visible -- the Additional reads
   * the ATTACKER's. Set by `materializeCreature` from the same value as `origin.level` (which stays
   * engine-inert); the baked-in stats already reflect it. */
  readonly level: number
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
  /** A plain-data bookmark (the mulberry32 stream position), never a closure.
   * Every roll goes through `nextRandom(rng)` (rng.ts), which advances `rng.position` IN PLACE --
   * safe because `resolveTurn` clones this into a fresh object at the top of every call (its own
   * "per-turn working copy"), so the snapshot passed IN to `resolveTurn` is never touched and the
   * same frozen snapshot resolved twice gives identical results. See rng.ts's own doc comment. */
  readonly rng: RngState
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
  /** Issues every effect instance id this fight (trait/perk instantiation,
   * status apply/refresh-to-a-new-instance, revive's re-instantiation, stat-modifier application)
   * -- the ONLY production issuer. Ids are opaque (`eff-<n>`; never appear in events, so goldens
   * stay byte-identical regardless of the exact format). Starts at 0 in `createCombat`. */
  readonly effectInstanceCounter: number
  /** The born-this-turn clock. Bumped once per turn (a dead creature's slot has none), at the
   * action slot (a skipped turn included); a status instance is "born this turn" iff its
   * `appliedAt` equals it. Plain data, never in an event. Starts at 0 in `createCombat`. */
  readonly turnClock: number
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

/** Precedes a triggered effect's consequences (mirrors AttackDeclared->DamageDealt).
 * `effectId` is the stable definition id (trait/status), not the opaque instance id. */
export interface TriggerFiredEvent {
  readonly type: 'TriggerFired'
  readonly sourceId: CreatureId
  readonly hook: Hook
  readonly effectId: string
}

/** A `perform-action` grant ran and was ACCEPTED -- emitted when the queued
 * grant runs (after the actor's legality check and the gem/target draws), immediately before the
 * granted action's first event. A grant refused or fizzling when it runs emits nothing of its own
 * (the earlier `TriggerFired` stays). `sourceId` is the effect's bearer; `actorId` is who acts
 * (the bearer for `actor: 'self'`, the hook's source for `'triggering-source'`); `effectId` is the
 * granting trait/status/perk's definition id, the same value its `TriggerFired` carries. Replaces
 * `EchoCastGranted`. */
export interface ActionGrantedEvent {
  readonly type: 'ActionGranted'
  readonly sourceId: CreatureId
  readonly actorId: CreatureId
  readonly effectId: string
}

/** An `'all'` action-lock skipped this turn -- fills the turn's action slot
 * (after the turn-start cleanup and grants), like `Waited`. `effectId` is the first `'all'` lock's
 * carrier's definition id in canonical effect order (the status id for a status), the same value
 * `TriggerFired.effectId` carries.  */
export interface TurnSkippedEvent {
  readonly type: 'TurnSkipped'
  readonly creatureId: CreatureId
  readonly effectId: string
}

export type IntentEvent =
  | AttackDeclaredEvent
  | SpellCastEvent
  | DefendedEvent
  | ProvokedEvent
  | WaitedEvent
  | TurnSkippedEvent
  | TriggerFiredEvent
  | ActionGrantedEvent

// Consequence events: shared across any future source, not just Attack.
export interface DamageDealtEvent {
  readonly type: 'DamageDealt'
  readonly sourceId: CreatureId
  readonly targetId: CreatureId
  /** Full-precision value before the final MAX(1, floor(...)) clamp (excludes the Additional). */
  readonly rawDamage: number
  /** The actual integer HP removed (includes the Additional on a direct hit). */
  readonly finalDamage: number
  readonly affinityMultiplier: number
  readonly wasChipOnly: boolean
  readonly remainingHp: number
  /** What produced this damage: a display tag, NOT the damage channel (a trait response tagged
   * 'attack' is still indirect). 'dot' is the default tag of a flat-mode response and implies no
   * Defence bypass: only a self-inflicted cost skips Defence, and an indirect hit (a status tick
   * included) meets a fifth of it (`spec/combat.md#damage-channels-and-the-additional`). */
  readonly damageSource: 'attack' | 'cast' | 'dot'
  /** The causing status, when a status produced this damage (DoT ticks). Absent for attack/cast
   * and for a trait's own dot-tagged flat hit. Lets the log render "[creature] took X poison
   * damage". */
  readonly statusId?: string
}

export interface CreatureDiedEvent {
  readonly type: 'CreatureDied'
  readonly creatureId: CreatureId
}

// ---- consequence events ----

export interface StatusAppliedEvent {
  readonly type: 'StatusApplied'
  readonly targetId: CreatureId
  readonly statusId: string
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

/** A dead creature returned to its slot via the `revive` response
 * (death-reset baseline + pct of that baseline's max HP -- the Unicorn). Event shape follows the
 * existing "every consequence gets a matching event" discipline, mirroring HealApplied's shape. */
export interface RevivedEvent {
  readonly type: 'Revived'
  readonly sourceId: CreatureId
  readonly targetId: CreatureId
  readonly currentHp: number
}

/** Loop-safety: emitted when a trigger cascade would exceed MAX_TRIGGER_CASCADE_DEPTH. */
export interface CascadeTruncatedEvent {
  readonly type: 'CascadeTruncated'
  readonly creatureId: CreatureId
  readonly effectId: string
  readonly depth: number
}

/** turn-start cleanup emits this only when a Defend/Provoke flag
 * was actually set and just expired ("until its next turn") -- never on a dead creature's empty
 * bracket, never when neither flag was set. Runs unconditionally on a skipped (Stunned) turn
 * too, not only when the creature goes on to act, so a Stunned or Sleeping creature does not
 * keep Defend/Provoke through its own skipped turn. A consequence
 * event, not an intent -- it reports a state ending, like `StatusExpired`, not an
 * action taken. */
export interface ActionStateEndedEvent {
  readonly type: 'ActionStateEnded'
  readonly creatureId: CreatureId
  readonly defending: boolean
  readonly provoking: boolean
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
  | RevivedEvent
  | ActionStateEndedEvent

// Lifecycle events. TurnStarted/TurnEnded are real events (not just internal hook
// checkpoints) so playback has an explicit boundary for every living creature's turn, a
// skipped one included. A dead creature's slot has no turn, so no bracket.
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
