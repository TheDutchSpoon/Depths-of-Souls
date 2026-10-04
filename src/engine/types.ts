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
 * Phase 4.1-D (A4): a spell is data -- a target shape, an intended side, and a LIST of the same
 * `EffectResponse`s traits use (`effects`). The magnitude fields (`spellPower`, `scalingStat`,
 * the stat-modifier's `{ stat, factor }`, the status spec) live on those responses, not here.
 * Effects run once per landed target, in list order, through `executeResponse` directly (a chosen
 * action, never a trigger: no `TriggerFired`). `cast-target` names the current landed target; see
 * CONVENTIONS "Spells carry responses" and `validateSpellEffects` (effect-types.ts).
 */
export interface Spell {
  readonly id: string
  readonly name: string
  /** Governs equipping only (canEquip(spell, creature) = spell.affinity === creature.affinity,
   * CONVENTIONS "Spell affinity & equip-gating") -- the damage affinity cycle stays keyed on
   * the CASTER's affinity, never the spell's. First consumer: Phase 4 Slice A's generation
   * module rolls cast-role enemies an affinity-matched spell from their biome's spell pool. */
  readonly affinity: Affinity
  /** The biome number (1-based, matching GAME_DESIGN's "Biome 1"/"Biome 2" numbering) at which
   * this spell enters the shared pool. `generateFloor` rolls a cast-role enemy's loadout from every
   * spell whose `unlockedAtBiome` is `<=` the current biome's number, filtered by affinity -- so a
   * spell unlocked at biome 1 stays available at every deeper biome too (spells unlock
   * cumulatively; distinct from species/creature biome-exclusivity). REQUIRED since 4.1-D. */
  readonly unlockedAtBiome: number
  readonly targetShape: 'single' | 'aoe'
  /** Who this spell targets (Phase 4 Slice E's Support-spell model, REQUIRED since 4.1-D).
   * 'ally' exempts the cast from the Provoke/Confusion targeting-override pipeline entirely
   * (GAME_DESIGN §7: "Provoke applies only to enemy-targeting offensive actions;
   * ally-targeting actions... are unaffected" -- Confusion is bundled into that same exemption,
   * since Confusion's roll is scoped to a "harmful action" and a support cast on an ally isn't
   * one) and, for 'aoe' shape, freezes the caster's own living side instead of the opposing side
   * (mirroring the enemy-AOE freeze rule). */
  readonly targetSide: 'enemy' | 'ally'
  /** What a successful cast does to each landed target, in order. */
  readonly effects: readonly EffectResponse[]
}

// ---- Creature ----

/**
 * Phase 4.1-A (A5): run-layer identity on every combat creature -- REQUIRED, but
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
   * innateTraitIds at createCombat; statuses append here in-fight (Slice C). Canonical order
   * (Phase 4 Slice F / ASSUMPTION 21 -- gains a `perks` slot, a documented change to the
   * previously-pinned ordering): innate-1 -> innate-2 -> perks (player-side only) -> equipment
   * infusions (none in v1) -> applied statuses.
   */
  readonly activeEffects: readonly ActiveEffect[]
  /** Phase 4.1-B (S1): this creature's resolved starting effect list -- innate traits' effects,
   * then (player-side only) perk effects, in canonical order -- computed ONCE at fight-setup by
   * `createCombat` and never re-derived from a registry mid-fight. `revive`'s death-reset
   * re-instantiates exactly this list (fresh instance ids from `CombatState.effectInstanceCounter`),
   * which is what lets `CombatState.traits`/`playerWideEffects` be deleted: nothing mid-fight needs
   * the trait/perk registries again. Plain data (EffectDef contains no functions after S2). */
  readonly baselineEffects: readonly BaselineEffectEntry[]
  /** Phase 4.1-B (D3): how many times `revive` has restored this creature THIS FIGHT -- never
   * reset by death or by a successful revive itself (it's the thing `MAX_REVIVES_PER_CREATURE`
   * bounds). Dead allies at the cap are excluded from revive targeting. */
  readonly revivesUsed: number
  /** Phase 4 Slice D / ASSUMPTION 17: "times Defended this battle" -- cumulative for the whole
   * fight, incremented in executeDefend, NEVER reset (Bulwark's "each time the creature has
   * Defended this battle"). Not derivable from activeEffects (Defend's own action-state flag
   * clears every turn); a small, explicit field, like innateTraitIds/activeEffects were in
   * Phase 3. Feeds the 'self-defend-count' magnitudeSource kind (effects.ts's resolveCount). */
  readonly defendCount: number
  /** Phase 4 Slice D (own ASSUMPTION, not pinned by the brief): a static species reference,
   * needed for the 'living-allies-of-species' magnitudeSource kind (resolveCount). Optional and
   * unset by every Phase 1-3/Slice A-C creature and by this slice's own generation.ts --
   * 'living-allies-of-species' is therefore inert (always 0) until a later slice (H1+) threads
   * a real speciesId through materializeCreature. Deliberately NOT wired into generation.ts here
   * -- out of this slice's own required scope (no Slice D golden exercises real species data);
   * flagged for whichever slice first authors real species content. */
  readonly speciesId?: string
  /** Phase 4.1-A (A5): required, engine-inert run-layer identity -- see CreatureOrigin's own doc
   * comment. Rewards read this (soul bar keyed by origin.templateId; XP per kill = the victim's
   * origin.level) instead of parsing the per-fight CreatureId's `-side-slot` suffix. */
  readonly origin: CreatureOrigin
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
  /** Phase 4.1-B (B3): a plain-data bookmark (the mulberry32 stream position), never a closure.
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
  /** Phase 4.1-B (B4): issues every effect instance id this fight (trait/perk instantiation,
   * status apply/refresh-to-a-new-instance, revive's re-instantiation, stat-modifier application)
   * -- the ONLY production issuer. Ids are opaque (`eff-<n>`; never appear in events, so goldens
   * stay byte-identical regardless of the exact format). Starts at 0 in `createCombat`. */
  readonly effectInstanceCounter: number
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

/** Phase 4 Slice H2 (PR #60 review, E2.5): precedes an echo-cast's own SpellCast, marking it as
 * an echo rather than a chosen action or a bonus-cast (per CONVENTIONS' "emit a minimal
 * echoed:true marker... or an EchoGranted event" -- this project took the dedicated-event
 * option, mirroring TriggerFired's own precedent, rather than growing SpellCastEvent's shape,
 * which many non-echo call sites share). `sourceId` is the effect's bearer (the observer whose
 * Overtone-shaped trait granted this); `casterId` is who actually casts (the observed actor). */
export interface EchoCastGrantedEvent {
  readonly type: 'EchoCastGranted'
  readonly sourceId: CreatureId
  readonly casterId: CreatureId
}

export type IntentEvent =
  | AttackDeclaredEvent
  | SpellCastEvent
  | DefendedEvent
  | ProvokedEvent
  | WaitedEvent
  | TriggerFiredEvent
  | EchoCastGrantedEvent

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

/** Phase 4 Slice B: a dead creature returned to its slot via the `revive` response
 * (death-reset baseline + pct of that baseline's max HP -- the Unicorn). Event shape is an
 * ASSUMPTION (not pinned by the brief) -- follows the existing "every consequence gets a
 * matching event" discipline, mirroring HealApplied's shape. */
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

/** Phase 4.1-C (D6, fixes B6): turn-start cleanup emits this only when a Defend/Provoke flag
 * was actually set and just expired ("until its next turn") -- never on a dead creature's empty
 * bracket, never when neither flag was set. Runs unconditionally on a skipped (Stunned) turn
 * too, which is the fix: previously cleanup only ran when the creature went on to act, so a
 * Stunned or Sleeping creature kept Defend/Provoke through its own skipped turn. A consequence
 * event (PR #70 review), not an intent -- it reports a state ending, like `StatusExpired`, not an
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
