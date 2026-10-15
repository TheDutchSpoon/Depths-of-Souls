// src/state's first file (`spec/run.md#generation-is-a-pure-seeded-module`: the store owns
// navigation and ownership only and CALLS the generator). In-memory only -- no persistence
// middleware, no idb/Dexie (`spec/saves.md#the-stores-plain-data-boundary`).
//
// Dependency-injected via `createGameStore(overrides)` rather than a bare module-level `create`
// call: the default deps wire in real src/data content (`useGameStore`, below), but most tests
// (store.test.ts) run against a fully isolated, deterministic instance built on FIXTURE
// biome/spec data instead, so the store is testable without a UI. `integration.test.ts` is the
// deliberate exception: it runs the zero-override, real-content store end to end (biomes 4-10
// are the placeholder shape -- see data/biomes.ts).
//
// Player-reachable failures return `{ ok: false, reason }` instead of throwing (`descend`,
// `pinBiome`; `spec/store.md#how-store-actions-fail`); each such action gets a pure `can...`
// query sharing its check; fast-travel is just `descend`; the collection is a flat
// `Map<InstanceId, Instance>`; and generation/rewards receive an injected `BalanceConfig`.

import { create } from 'zustand'
import { createCombat, resolveFight } from '../engine/combat'
import type { EffectDef, Trait, StatusDef } from '../engine/effect-types'
import {
  biomeForFloor,
  biomeHasContent,
  contentFrontier,
  FLOORS_PER_BIOME,
  floorShape,
  generateFloor,
  materializeCreature,
  rollLoadout,
} from '../engine/generation'
import type { BiomeData, SpeciesCreature } from '../engine/generation'
import type { BiomeId } from '../engine/ids'
import type { BalanceConfig } from '../engine/balance-types'
import { xpAwardForKill } from '../engine/leveling'
import { createSeededRng, type SeededRng } from '../engine/rng'
import type { Script } from '../engine/scripting-types'
import type { CombatEvent, Creature, FightResult, Spell } from '../engine/types'
import { BIOMES } from '../data/biomes'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { ALL_SPELLS } from '../data/spells'
import { DEFAULT_REGISTRIES } from '../data/registries'
import {
  resolveSpecializationEffects,
  SPECIALIZATIONS_BY_ID,
  type Specialization,
} from '../data/specializations'
import {
  BRUTE_STARTER,
  BRUTE_STARTER_SPECIES_ID,
  SHIELDBARER_STARTER,
  SHIELDBARER_STARTER_SPECIES_ID,
  SORCERER_STARTER,
  SORCERER_STARTER_SPECIES_ID,
  UNICORN,
  UNICORN_SPECIES_ID,
} from '../data/species/starters'
import { createInstanceId, type InstanceId } from './ids'
import {
  addCurrencies,
  applyXpGain,
  currencyDropForKill,
  findStaticCreature,
  perkPointsFor,
  resolveKillReward,
  staticCreatureIdFor,
  ZERO_CURRENCIES,
  type Currencies,
  type Instance,
  type StaticCreatureRef,
} from './rewards'

export const PARTY_SIZE = 6

// ---- Dependencies (test/prod injection seam) ----

export interface GameStoreDeps {
  readonly biomes: readonly BiomeData[]
  /** The GLOBAL spell registry `generateFloor` rolls a cast-role loadout from (filtered by
   * `unlockedAtBiome` then affinity; `spec/run.md#spells-unlock-cumulatively`). */
  readonly allSpells: readonly Spell[]
  readonly scripts: ReadonlyMap<string, Script>
  readonly traits: ReadonlyMap<string, Trait>
  readonly statuses: ReadonlyMap<string, StatusDef>
  readonly specializations: ReadonlyMap<string, Specialization>
  /** Static creatures that exist OUTSIDE any biome spawn pool -- see rewards.ts's
   * StaticCreatureRef doc comment. */
  readonly standaloneCreatures: readonly StaticCreatureRef[]
  readonly runSeed: number
  /** The generation-RNG factory only -- combat's OWN internal RNG always goes through the real
   * createSeededRng inside createCombat (not overridable without an engine change, and not
   * needed: combat's own determinism is already proven by the existing engine goldens). */
  readonly createRng: (seed: number) => SeededRng
  /** The injected progression/economy config. Generation and reward math
   * receive this as an argument rather than reading module-level constants -- tests pin their
   * own config instead of inheriting tuning changes (see __fixtures__/balance.ts). */
  readonly balanceConfig: BalanceConfig
}

// A fixed default so the store is constructible with zero config; the real seed is generated in
// `src/app` (`spec/store.md#newgame`).
const DEFAULT_RUN_SEED = 20260914

const DEFAULT_DEPS: GameStoreDeps = {
  biomes: BIOMES,
  allSpells: ALL_SPELLS,
  scripts: DEFAULT_REGISTRIES.scripts,
  traits: DEFAULT_REGISTRIES.traits,
  statuses: DEFAULT_REGISTRIES.statuses,
  specializations: SPECIALIZATIONS_BY_ID,
  standaloneCreatures: [
    { speciesCreature: SORCERER_STARTER, speciesId: SORCERER_STARTER_SPECIES_ID },
    { speciesCreature: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
    { speciesCreature: SHIELDBARER_STARTER, speciesId: SHIELDBARER_STARTER_SPECIES_ID },
    { speciesCreature: UNICORN, speciesId: UNICORN_SPECIES_ID },
  ],
  runSeed: DEFAULT_RUN_SEED,
  createRng: createSeededRng,
  balanceConfig: DEFAULT_BALANCE_CONFIG,
}

// ---- State shape ----

export interface GameState {
  readonly deepestFloor: number
  /** The floor last FOUGHT -- set by `descend` on
   * every actually-attempted run, success or failure; a `{ ok: false }` refusal leaves it (and
   * all other state) unchanged, since nothing was attempted. */
  readonly lastFloor: number
  readonly discoveredBiomes: ReadonlySet<BiomeId>
  readonly atlasPins: ReadonlyMap<number, BiomeId>
  /** A flat map keyed by the OPAQUE InstanceId (never buckets keyed by static
   * creature id). */
  readonly collection: ReadonlyMap<InstanceId, Instance>
  readonly activeParty: readonly (InstanceId | null)[]
  /** 0-100, per static creature id. */
  readonly soulProgress: ReadonlyMap<string, number>
  readonly chosenSpec: string | null
  readonly perkSpend: ReadonlyMap<string, number>
  readonly bossesCleared: ReadonlySet<string>
  readonly currencies: Currencies
  /** The run RNG stream's seed + an advance counter, NOT a live SeededRng object
   * -- keeps the store a plain, serializable-shaped record (`spec/saves.md#the-stores-plain-data-boundary`). A
   * fresh SeededRng is re-derived from (runSeed, runCounter) whenever a draw is needed, mirroring
   * biomeForFloor's own per-floor re-derivation (generation.ts) rather than threading a stateful
   * RNG object through Zustand. */
  readonly runSeed: number
  readonly runCounter: number
  /** A monotonic counter used only to mint unique, deterministic, OPAQUE InstanceIds
   * (`inst-<ordinal>`, `spec/creatures.md#instance`) -- unrelated to runCounter/RNG. */
  readonly nextInstanceOrdinal: number
}

/** One fight of a descent, with everything needed to replay it: `createCombat` over the seed, the
 * two parties and the player's effects, with the registries the store was given (`deps.scripts`,
 * `deps.traits`, `deps.statuses`), then `resolveFight`, gives back `events` (`spec/store.md#a-descents-outcome`). */
export interface FightRecord {
  readonly events: readonly CombatEvent[]
  readonly result: FightResult
  /** The XP this fight's kills banked, applied to the active party right after the fight. */
  readonly xpBanked: number
  /** The active party's levels after this fight's XP, in `playerParty` order. */
  readonly partyLevelsAfter: readonly number[]
  readonly seed: number
  /** The party `createCombat` was given: materialized for this fight from the collection as the
   * floor's earlier fights left it, not `combat.creatures`, which carries fight-setup output. */
  readonly playerParty: readonly Creature[]
  /** The party `createCombat` was given, including an enemy that never got a turn (the events
   * alone cannot name it). */
  readonly enemyParty: readonly Creature[]
  /** The player side's perk effects `createCombat` was given. */
  readonly playerEffects: readonly EffectDef[]
}

export interface FloorOutcome {
  readonly floor: number
  /** One result per fight actually resolved -- stops at the first non-win (`spec/combat.md#resolution--timing`: "the
   * fight ends the instant a side has no living creature"; a floor's remaining fights are
   * simply never attempted after a wipe). */
  readonly fightResults: readonly FightResult[]
  /** True iff every fight on the floor was won. */
  readonly cleared: boolean
  readonly deepestFloorAdvanced: boolean
  /** Static creatureId -> total % gained THIS call (pre-existing-progress-relative; the store's
   * own soulProgress is where the 0-100 cap is actually applied). */
  readonly soulGained: ReadonlyMap<string, number>
  readonly xpBanked: number
  readonly currencyGained: Currencies
  readonly events: readonly CombatEvent[]
  /** One record per fight resolved, in fight order. The records' events concatenate to `events`,
   * their XP sums to `xpBanked` and their results are `fightResults`. */
  readonly fightRecords: readonly FightRecord[]
  /** The bossId, iff this floor's (single) fight
   * was a boss encounter AND it was won -- else null. Idempotent at the bossesCleared level (a
   * re-fought, already-cleared boss still reports bossDefeated here, but grants no further perk
   * points -- see `withBossCleared`). */
  readonly bossDefeated: string | null
  /** A boss was defeated and wasn't in `bossesCleared` before this descent. */
  readonly bossFirstCleared: boolean
  /** `perkPointsFor` after the descent minus before: 0 unless a boss was first cleared. */
  readonly perkPointsGained: number
}

/** What a floor holds, before it is fought: the biome it resolves to (through the state's pins and
 * run seed, as `descend` resolves it), its fight count and whether it is the boss fight. */
export interface FloorPreview {
  readonly biomeId: BiomeId
  readonly biomeName: string
  readonly fights: number
  readonly boss: boolean
}

export interface PerkPointSummary {
  readonly earned: number
  readonly spent: number
  readonly free: number
}

/** Reasons `descend` can refuse -- see `spec/store.md#how-store-actions-fail`.
 * `beyond-content-frontier` wins over `floor-out-of-reach` when both apply. */
export type DescendFailureReason =
  'no-spec' | 'empty-party' | 'floor-out-of-reach' | 'beyond-content-frontier'

export type DescendResult =
  | { readonly ok: true; readonly outcome: FloorOutcome }
  | { readonly ok: false; readonly reason: DescendFailureReason }

export type CanDescendResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: DescendFailureReason }

export type PinBiomeFailureReason =
  'unknown-biome' | 'floor-out-of-range' | 'biome-has-no-content'

export type PinBiomeResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: PinBiomeFailureReason }

/** `unknown-creature` (not resolvable to static data) is checked
 * before `soul-incomplete` (soul below 100%). */
export type SummonFailureReason = 'unknown-creature' | 'soul-incomplete'

export type SummonResult =
  | { readonly ok: true; readonly instanceId: InstanceId }
  | { readonly ok: false; readonly reason: SummonFailureReason }

export type CanSummonResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: SummonFailureReason }

export type SetPartySlotFailureReason = 'slot-out-of-range' | 'unknown-instance'

export type SetPartySlotResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SetPartySlotFailureReason }

/** In this order, per `spec/progression.md#specializations`. */
export type SetPerkLevelFailureReason =
  'no-spec' | 'perk-not-in-spec' | 'invalid-level' | 'over-budget'

export type SetPerkLevelResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SetPerkLevelFailureReason }

export interface GameActions {
  /** Resets EVERYTHING to a fresh game with the given run seed
   * (an integer in `0 .. 2^32 - 1`; anything else throws -- the seed comes from `src/app`, so a bad
   * one is an impossible state). The scripted intro is run separately. */
  newGame(options: { readonly seed: number }): void
  /** The one run start: `newGame`, then `setSpec`, then `runScriptedIntro`, in that order. Throws
   * where those throw. */
  startGame(options: { readonly seed: number; readonly specId: string }): void
  /** Needs 100% soul in `creatureId`; free and unlimited.
   * Creates a level-1 instance with rolled gems and puts it in the lowest-index empty party slot,
   * if any. `soulProgress` is left alone. */
  summon(creatureId: string): SummonResult
  /** Pure query sharing `summon`'s own check. */
  canSummon(creatureId: string): CanSummonResult
  /** Swap semantics -- placing an instance already in another slot swaps the
   * two; `null` empties the slot. An empty party is allowed (`descend` refuses it). */
  setPartySlot(slot: number, instanceId: InstanceId | null): SetPartySlotResult
  /** Pure query sharing `setPartySlot`'s own check. */
  canSetPartySlot(slot: number, instanceId: InstanceId | null): SetPartySlotResult
  /** Sets a perk's ABSOLUTE level (buy and refund are one call; 0 removes the
   * entry). Nothing is gated by the inert list (`spec/progression.md#inert-perks`). */
  setPerkLevel(perkId: string, level: number): SetPerkLevelResult
  /** Pure query sharing `setPerkLevel`'s own check. */
  canSetPerkLevel(perkId: string, level: number): SetPerkLevelResult
  /** Clears all perk spend. Can't fail, so no `can…` query. */
  refundAllPerks(): void
  /** Refunds all spent perk points (clears perkSpend -- perk points are derived from
   * bossesCleared, so "refund" just means clearing spend) and, if the new spec's starter isn't
   * already owned, grants one copy of it into the collection (and the first open party slot).
   * Swapping specs never removes a previously-owned starter. Throws on an unknown
   * spec id (the UI only offers real specs, so this is an impossible state, not a player-reachable failure). */
  setSpec(specId: string): void
  /** Idempotent: a boss already in bossesCleared is a no-op (first-clear-only per
   * `spec/progression.md#perk-points`). Needed for bossesCleared to ever become
   * non-empty; perk points are `bossesCleared.size * 100`, derived, never stored separately. */
  recordBossKill(bossId: string): void
  /** Pins a biome for a floor (the Biome Atlas facility, `spec/run.md#facilities`). No
   * facility-unlock gating here (the facilities wait, `spec/run.md#facilities`). Player-reachable
   * failure (`spec/store.md#how-store-actions-fail`): returns `{ ok: false, reason }` instead of throwing. Reasons:
   * `floor-out-of-range` (floor < 1), `unknown-biome`, `biome-has-no-content` (refuses a pin that
   * would otherwise route `descend` into the generator's own throw). */
  pinBiome(floor: number, biomeId: BiomeId): PinBiomeResult
  /** Pure query sharing `pinBiome`'s own check -- lets the UI grey out an invalid pin without
   * performing it. */
  canPinBiome(floor: number, biomeId: BiomeId): PinBiomeResult
  /** The integration action. Bounded to `1..min(deepestFloor+1, contentFrontier)` (can re-farm
   * any already-cleared floor, or push exactly one floor past the current frontier, but never
   * skip ahead or go past the last authored biome). Generates the floor via the engine's pure
   * generation module, runs each fight through the real resolver in sequence, banks soul%/XP/
   * currency rewards as each fight resolves (never held pending the floor's overall outcome),
   * applies each fight's XP to the active party right after it, win or not, so the next fight
   * materializes the party at its new levels, and advances deepestFloor only on a full clear.
   * Player-reachable failure (`spec/store.md#how-store-actions-fail`): returns
   * `{ ok: false, reason }` (state unchanged) instead of throwing. */
  descend(floor: number): DescendResult
  /** Pure query sharing `descend`'s own check -- lets the UI grey out an unreachable floor
   * without resolving anything. */
  canDescend(floor: number): CanDescendResult
  /** What `floor` holds (`null` unless it is a whole number >= 1; never throws). Beyond the
   * content frontier it still previews: only `descend` refuses there. */
  floorPreview(floor: number): FloorPreview | null
  /** Perk points earned (`perkPointsFor` the bosses cleared), spent on the chosen spec's perks
   * (0 with none) and free. */
  perkPointSummary(): PerkPointSummary
  /** NOT a new engine mechanism -- a fixed, hardcoded 1-enemy fight (the Unicorn)
   * resolved through the ordinary resolver, with a special outcome handler HERE (the run layer):
   * regardless of win/loss/draw, the Unicorn joins the collection (and the first open party
   * slot) if not already owned, and every creature in the active party then gets the intro's flat
   * XP grant (`BalanceConfig.introXpGrant`), whatever the result; the intro's kills bank nothing.
   * The engine has zero awareness this fight is special. */
  runScriptedIntro(): {
    readonly events: readonly CombatEvent[]
    readonly result: FightResult
  }
}

// ---- Pure helpers over GameState (kept free functions -- easy to unit-test in isolation) ----

/** Builds the resolver-ready player Creature[] from activeParty, in slot order, skipping empty
 * slots and re-assigning CONTIGUOUS slot indices (0..k-1) to the resolved creatures -- the
 * engine's tie-break rule (player -> slot -> id) expects a dense slot space, not one with gaps.
 * Reads the collection it is given, so a caller mid-floor passes the collection as the floor's
 * earlier fights left it. `instanceIds` names each materialized creature's instance, in the same
 * order. */
function resolvePlayerParty(
  collection: ReadonlyMap<InstanceId, Instance>,
  activeParty: readonly (InstanceId | null)[],
  deps: GameStoreDeps,
): { readonly creatures: Creature[]; readonly instanceIds: InstanceId[] } {
  const creatures: Creature[] = []
  const instanceIds: InstanceId[] = []
  let slot = 0
  for (const instanceId of activeParty) {
    if (instanceId === null) continue
    const instance = collection.get(instanceId)
    if (!instance) continue // defensive; activeParty should only ever reference owned instances
    const staticId = staticCreatureIdFor(instance)
    const staticRef = findStaticCreature(staticId, deps.standaloneCreatures, deps.biomes)
    if (!staticRef) continue // defensive; every referenced creatureId resolves to static data
    // A stored spell id that no longer resolves is data drift, not a skippable slot.
    const gems = instance.gems.map((spellId) => {
      if (spellId === null) return null
      const spell = deps.allSpells.find((candidate) => candidate.id === spellId)
      if (!spell) {
        throw new Error(
          `resolvePlayerParty: instance ${instance.id} holds unknown spell id ${spellId}`,
        )
      }
      return spell
    })
    creatures.push(
      materializeCreature(staticRef.speciesCreature, {
        level: instance.level,
        side: 'player',
        slot,
        speciesId: staticRef.speciesId,
        scriptId: instance.scriptId,
        gems,
        ref: instance.id,
      }),
    )
    instanceIds.push(instanceId)
    slot += 1
  }
  return { creatures, instanceIds }
}

/** Immutably applies a flat XP gain to every Instance currently in the active party. */
function applyXpToParty(
  collection: ReadonlyMap<InstanceId, Instance>,
  activeParty: readonly (InstanceId | null)[],
  xpGain: number,
  balanceConfig: BalanceConfig,
): ReadonlyMap<InstanceId, Instance> {
  if (xpGain <= 0) return collection
  const targets = activeParty.filter((id): id is InstanceId => id !== null)
  if (targets.length === 0) return collection
  const next = new Map(collection)
  for (const id of targets) {
    const instance = collection.get(id)
    if (instance) next.set(id, applyXpGain(instance, xpGain, balanceConfig))
  }
  return next
}

/** The unlock biome's 1-based number for a player gem roll -- the
 * biome of `min(100, max(1, deepestFloor))` through `biomeForFloor` with EMPTY pins, so a farming
 * pin never changes a roll and the pool stops growing at floor 100 (the fixed sequence ends there;
 * past it `biomeForFloor` draws by seed hash and could shrink the pool). The cap is also bounded by
 * the biome list actually supplied (a test fixture with one biome has one decade). */
function unlockBiomeIndex(state: GameState, deps: GameStoreDeps): number {
  const cap = Math.min(100, deps.biomes.length * FLOORS_PER_BIOME)
  const floor = Math.min(cap, Math.max(1, state.deepestFloor))
  const biomeId = biomeForFloor(floor, deps.biomes, new Map(), state.runSeed)
  return deps.biomes.findIndex((b) => b.id === biomeId) + 1
}

/** The spell ids a creature holds INNATELY, read from its traits'
 * `innate-spell` effects (createCombat prepends them to the gem slots). A general rule: whatever a
 * creature holds this way is excluded from its own roll pool. */
function innateSpellIds(
  creature: SpeciesCreature,
  deps: GameStoreDeps,
): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const traitId of creature.innateTraitIds) {
    const trait = deps.traits.get(traitId)
    if (!trait) continue
    for (const effect of trait.effects) {
      if (effect.category === 'innate-spell') ids.add(effect.spell.id)
    }
  }
  return ids
}

/** A new player instance's gem set, rolled once.
 * Its OWN stream, `createRng(hashGemDraw(runSeed, ordinal))`: never the run stream, never advances
 * `runCounter`, so a roll can't shift a floor draw. The roll itself is generation's `rollLoadout`
 * (the enemy rule: distinct picks, safety net, cast-role throw) over the unlocked, affinity-matched
 * pool minus the creature's innate spells. */
function rollPlayerGems(
  state: GameState,
  deps: GameStoreDeps,
  creature: SpeciesCreature,
  ordinal: number,
): readonly (string | null)[] {
  const innate = innateSpellIds(creature, deps)
  const pool = deps.allSpells.filter((spell) => !innate.has(spell.id))
  const rng = deps.createRng(hashGemDraw(state.runSeed, ordinal))
  return rollLoadout(creature, unlockBiomeIndex(state, deps), pool, rng).map(
    (spell) => spell?.id ?? null,
  )
}

/** Adds one fresh Instance of `creatureId` (level 1, rolled gems, role script) to the collection,
 * and into the lowest-index empty party slot if there is one.
 * Shared by the starter grant, the Unicorn grant and `summon`. */
function addInstance(
  state: GameState,
  deps: GameStoreDeps,
  creatureId: string,
): Pick<GameState, 'collection' | 'activeParty' | 'nextInstanceOrdinal'> & {
  readonly instanceId: InstanceId
} {
  const staticRef = findStaticCreature(creatureId, deps.standaloneCreatures, deps.biomes)
  if (!staticRef) throw new Error(`addInstance: unknown creature ${creatureId}`)
  const ordinal = state.nextInstanceOrdinal
  const instanceId = createInstanceId(`inst-${ordinal}`)
  const instance: Instance = {
    id: instanceId,
    source: { kind: 'creature', creatureId },
    level: 1,
    xp: 0,
    scriptId: null,
    gems: rollPlayerGems(state, deps, staticRef.speciesCreature, ordinal),
  }
  const collection = new Map(state.collection)
  collection.set(instanceId, instance)
  let activeParty = state.activeParty
  const openSlot = state.activeParty.indexOf(null)
  if (openSlot !== -1) {
    const next = [...state.activeParty]
    next[openSlot] = instanceId
    activeParty = next
  }
  return { collection, activeParty, nextInstanceOrdinal: ordinal + 1, instanceId }
}

/** Grants one fresh Instance of `creatureId` into the collection and the first open party slot,
 * if not already owned. Shared by setSpec (the chosen spec's starter) and runScriptedIntro (the
 * Unicorn) -- both are "unconditional one-time grants," never soul-gated. */
function grantCreatureIfUnowned(
  state: GameState,
  deps: GameStoreDeps,
  creatureId: string,
): Pick<GameState, 'collection' | 'activeParty' | 'nextInstanceOrdinal'> {
  const alreadyOwned = [...state.collection.values()].some(
    (inst) => inst.source.kind === 'creature' && inst.source.creatureId === creatureId,
  )
  if (alreadyOwned) {
    return {
      collection: state.collection,
      activeParty: state.activeParty,
      nextInstanceOrdinal: state.nextInstanceOrdinal,
    }
  }
  const { collection, activeParty, nextInstanceOrdinal } = addInstance(
    state,
    deps,
    creatureId,
  )
  return { collection, activeParty, nextInstanceOrdinal }
}

/** Idempotent add -- a boss already in `bossesCleared` returns the SAME Set reference (a no-op,
 * first-clear-only per `spec/progression.md#perk-points`). Shared by `recordBossKill` and `descend()`'s own
 * boss-floor-win path so the two never drift. */
function withBossCleared(
  bossesCleared: ReadonlySet<string>,
  bossId: string,
): ReadonlySet<string> {
  if (bossesCleared.has(bossId)) return bossesCleared
  const next = new Set(bossesCleared)
  next.add(bossId)
  return next
}

/** Small, deterministic, non-cryptographic combine of the run seed and an advance counter --
 * mirrors generation.ts's own hashFloorDraw, distinct constants so
 * the two hashes never collide by construction. */
function hashRunDraw(runSeed: number, counter: number): number {
  return (Math.imul(runSeed | 0, 0x27d4eb2f) ^ Math.imul(counter | 0, 0x165667b1)) >>> 0
}

/** The player gem roll's own hash -- its OWN constants, distinct from
 * `hashRunDraw` above and generation's `hashFloorDraw`. Distinct constants make a coincidence with
 * another stream's seed unlikely, not impossible; what keeps a gem roll from shifting a floor draw
 * is that it is a separate stream that never touches `runCounter`. */
function hashGemDraw(runSeed: number, ordinal: number): number {
  return (
    (Math.imul(runSeed | 0, 0x2545f491) ^ Math.imul((ordinal + 1) | 0, 0x9e3779b9)) >>> 0
  )
}

/** Resolves a floor to its biome through the state's pins and run seed, and the biome's 1-based
 * number in `deps.biomes` (`spec/run.md#biomeforfloor`). The one resolution behind `descend` and
 * `floorPreview`; the floor must be a whole number >= 1. */
function resolveFloorBiome(
  state: GameState,
  deps: GameStoreDeps,
  floor: number,
): { readonly biome: BiomeData; readonly biomeIndex: number } {
  const biomeId = biomeForFloor(floor, deps.biomes, state.atlasPins, state.runSeed)
  const biome = deps.biomes.find((b) => b.id === biomeId)
  if (!biome) {
    throw new Error(
      `resolveFloorBiome: no biome data for resolved biome id ${String(biomeId)}`,
    )
  }
  // The biome's 1-based number (`spec/run.md#spells-unlock-cumulatively`) is its position in the
  // caller's own ordered `deps.biomes` list (the 1-100 sequence is positional) -- generation.ts
  // stays ignorant of array position itself, it just receives the number.
  return { biome, biomeIndex: deps.biomes.indexOf(biome) + 1 }
}

/** The shared check behind both `descend` and `canDescend` -- a
 * player-reachable failure returns `{ ok: false, reason }`, never throws. Order: prerequisites
 * that don't depend on which floor was asked for (no-spec, empty-party) first, then
 * `beyond-content-frontier` before `floor-out-of-reach` so the frontier wins when both would
 * otherwise apply. */
function checkDescend(
  state: GameState,
  deps: GameStoreDeps,
  floor: number,
): CanDescendResult {
  if (!state.chosenSpec) return { ok: false, reason: 'no-spec' }
  if (state.activeParty.every((id) => id === null)) {
    return { ok: false, reason: 'empty-party' }
  }
  if (!Number.isInteger(floor) || floor < 1) {
    return { ok: false, reason: 'floor-out-of-reach' }
  }
  if (floor > contentFrontier(deps.biomes)) {
    return { ok: false, reason: 'beyond-content-frontier' }
  }
  if (floor > state.deepestFloor + 1) {
    return { ok: false, reason: 'floor-out-of-reach' }
  }
  return { ok: true }
}

/** The shared check behind both `pinBiome` and `canPinBiome`. Kept
 * minimal: only `floor >= 1` is required (no upper bound), so any floor can be pinned,
 * including 101+.
 *
 * A pin into a biome with no content (`biomeHasContent`, generation.ts) is
 * refused with `biome-has-no-content` -- without this, `pinBiome` could route `descend` straight
 * into `generateFloor`'s own `weightedPick` throw (a player-reachable crash through a second
 * route beyond `contentFrontier`'s own gate, since a pin can target a biome the fixed 1-100
 * sequence would never have picked for that floor). Checked last (after floor-out-of-range and
 * unknown-biome) since it needs a resolved biome to test. */
function checkPinBiome(
  deps: GameStoreDeps,
  floor: number,
  biomeId: BiomeId,
): PinBiomeResult {
  if (!Number.isInteger(floor) || floor < 1) {
    return { ok: false, reason: 'floor-out-of-range' }
  }
  const biome = deps.biomes.find((b) => b.id === biomeId)
  if (!biome) {
    return { ok: false, reason: 'unknown-biome' }
  }
  if (!biomeHasContent(biome)) {
    return { ok: false, reason: 'biome-has-no-content' }
  }
  return { ok: true }
}

/** Shared by `summon` and `canSummon`. */
function checkSummon(
  state: GameState,
  deps: GameStoreDeps,
  creatureId: string,
): CanSummonResult {
  if (!findStaticCreature(creatureId, deps.standaloneCreatures, deps.biomes)) {
    return { ok: false, reason: 'unknown-creature' }
  }
  if ((state.soulProgress.get(creatureId) ?? 0) < 100) {
    return { ok: false, reason: 'soul-incomplete' }
  }
  return { ok: true }
}

/** Shared by `setPartySlot` and `canSetPartySlot`. A non-integer
 * slot is out of range; `null` (emptying) is always valid on an in-range slot. */
function checkSetPartySlot(
  state: GameState,
  slot: number,
  instanceId: InstanceId | null,
): SetPartySlotResult {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_SIZE) {
    return { ok: false, reason: 'slot-out-of-range' }
  }
  if (instanceId !== null && !state.collection.has(instanceId)) {
    return { ok: false, reason: 'unknown-instance' }
  }
  return { ok: true }
}

/** Σ `level × costPerLevel` over the spec's perks. */
export function perkPointsSpent(
  spec: Specialization,
  perkSpend: ReadonlyMap<string, number>,
): number {
  return spec.perks.reduce(
    (sum, perk) => sum + (perkSpend.get(perk.id) ?? 0) * perk.costPerLevel,
    0,
  )
}

/** Shared by `setPerkLevel` and `canSetPerkLevel`. The budget is
 * `Σ level × costPerLevel` over the current spec's perks with this change applied, against
 * `bossesCleared × 100`; lowering a level can't go over (spend only ever falls). */
function checkSetPerkLevel(
  state: GameState,
  deps: GameStoreDeps,
  perkId: string,
  level: number,
): SetPerkLevelResult {
  if (!state.chosenSpec) return { ok: false, reason: 'no-spec' }
  const spec = deps.specializations.get(state.chosenSpec)
  if (!spec) throw new Error(`setPerkLevel: unknown specialization ${state.chosenSpec}`)
  const perk = spec.perks.find((p) => p.id === perkId)
  if (!perk) return { ok: false, reason: 'perk-not-in-spec' }
  if (!Number.isInteger(level) || level < 0 || level > perk.maxLevel) {
    return { ok: false, reason: 'invalid-level' }
  }
  const spent = perkPointsSpent(spec, new Map(state.perkSpend).set(perkId, level))
  if (spent > perkPointsFor(state.bossesCleared))
    return { ok: false, reason: 'over-budget' }
  return { ok: true }
}

/** The largest run seed `newGame` accepts. */
export const MAX_RUN_SEED = 0xffffffff

/** The state of a fresh game with run seed `seed` -- the store's initial state and what
 * `newGame` resets to, so the two can't drift. */
function freshState(seed: number): GameState {
  return {
    deepestFloor: 0,
    lastFloor: 0,
    discoveredBiomes: new Set(),
    atlasPins: new Map(),
    collection: new Map(),
    activeParty: Array.from({ length: PARTY_SIZE }, () => null),
    soulProgress: new Map(),
    chosenSpec: null,
    perkSpend: new Map(),
    bossesCleared: new Set(),
    currencies: ZERO_CURRENCIES,
    runSeed: seed,
    runCounter: 0,
    nextInstanceOrdinal: 0,
  }
}

// ---- The store ----

export function createGameStore(overrides: Partial<GameStoreDeps> = {}) {
  const deps: GameStoreDeps = { ...DEFAULT_DEPS, ...overrides }

  return create<GameState & GameActions>((set, get) => ({
    ...freshState(deps.runSeed),

    newGame({ seed }) {
      if (!Number.isInteger(seed) || seed < 0 || seed > MAX_RUN_SEED) {
        throw new Error(`newGame: seed must be an integer in 0..2^32-1, got ${seed}`)
      }
      set(freshState(seed))
    },

    startGame({ seed, specId }) {
      get().newGame({ seed })
      get().setSpec(specId)
      get().runScriptedIntro()
    },

    canSummon(creatureId) {
      return checkSummon(get(), deps, creatureId)
    },

    summon(creatureId) {
      const state = get()
      const check = checkSummon(state, deps, creatureId)
      if (!check.ok) return check
      const { instanceId, ...next } = addInstance(state, deps, creatureId)
      set(next)
      return { ok: true, instanceId }
    },

    canSetPartySlot(slot, instanceId) {
      return checkSetPartySlot(get(), slot, instanceId)
    },

    setPartySlot(slot, instanceId) {
      const state = get()
      const check = checkSetPartySlot(state, slot, instanceId)
      if (!check.ok) return check
      const activeParty = [...state.activeParty]
      if (instanceId === null) {
        activeParty[slot] = null
      } else {
        const from = activeParty.indexOf(instanceId)
        const displaced = activeParty[slot] ?? null
        activeParty[slot] = instanceId
        if (from !== -1 && from !== slot) activeParty[from] = displaced
      }
      set({ activeParty })
      return { ok: true }
    },

    canSetPerkLevel(perkId, level) {
      return checkSetPerkLevel(get(), deps, perkId, level)
    },

    setPerkLevel(perkId, level) {
      const check = checkSetPerkLevel(get(), deps, perkId, level)
      if (!check.ok) return check
      set((s) => {
        const perkSpend = new Map(s.perkSpend)
        if (level === 0) perkSpend.delete(perkId)
        else perkSpend.set(perkId, level)
        return { perkSpend }
      })
      return { ok: true }
    },

    refundAllPerks() {
      set({ perkSpend: new Map() })
    },

    setSpec(specId) {
      const spec = deps.specializations.get(specId)
      if (!spec) throw new Error(`setSpec: unknown specialization ${specId}`)
      set((s) => ({
        chosenSpec: specId,
        perkSpend: new Map(),
        ...grantCreatureIfUnowned(s, deps, spec.starterCreatureId),
      }))
    },

    recordBossKill(bossId) {
      set((s) => ({ bossesCleared: withBossCleared(s.bossesCleared, bossId) }))
    },

    canPinBiome(floor, biomeId) {
      return checkPinBiome(deps, floor, biomeId)
    },

    pinBiome(floor, biomeId) {
      const check = checkPinBiome(deps, floor, biomeId)
      if (!check.ok) return check
      set((s) => {
        const atlasPins = new Map(s.atlasPins)
        atlasPins.set(floor, biomeId)
        return { atlasPins }
      })
      return { ok: true }
    },

    canDescend(floor) {
      return checkDescend(get(), deps, floor)
    },

    floorPreview(floor) {
      if (!Number.isInteger(floor) || floor < 1) return null
      const { biome } = resolveFloorBiome(get(), deps, floor)
      const { boss, fights } = floorShape(floor, biome, deps.balanceConfig)
      return { biomeId: biome.id, biomeName: biome.name, fights, boss }
    },

    perkPointSummary() {
      const state = get()
      const earned = perkPointsFor(state.bossesCleared)
      const spec =
        state.chosenSpec === null ? undefined : deps.specializations.get(state.chosenSpec)
      const spent = spec ? perkPointsSpent(spec, state.perkSpend) : 0
      return { earned, spent, free: earned - spent }
    },

    descend(floor) {
      const state = get()
      const check = checkDescend(state, deps, floor)
      if (!check.ok) return check

      // Guaranteed non-null by checkDescend's own 'no-spec' branch above.
      const spec = deps.specializations.get(state.chosenSpec as string)
      if (!spec) throw new Error(`descend: unknown specialization ${state.chosenSpec}`)
      const partyWideEffects = resolveSpecializationEffects(spec, state.perkSpend)

      const { biome, biomeIndex } = resolveFloorBiome(state, deps, floor)
      const biomeId = biome.id

      const genRng = deps.createRng(hashRunDraw(state.runSeed, state.runCounter))
      const fights = generateFloor(
        floor,
        biome,
        biomeIndex,
        deps.allSpells,
        genRng,
        deps.balanceConfig,
      )

      const soulGainedThisCall = new Map<string, number>()
      let xpBanked = 0
      let currencyGained = ZERO_CURRENCIES
      const fightResults: FightResult[] = []
      const allEvents: CombatEvent[] = []
      const fightRecords: FightRecord[] = []
      // The collection as the floor's fights leave it: each fight's XP lands before the next
      // fight's party is materialized.
      let collection = state.collection
      let cleared = true
      // Set iff this floor's (single) fight is a
      // boss encounter AND it's won -- `spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log`: winning a boss fight adds its
      // bossId to bossesCleared.
      let bossDefeated: string | null = null

      for (let i = 0; i < fights.length; i++) {
        const fight = fights[i]!
        const combatSeed = hashRunDraw(state.runSeed, state.runCounter + i + 1)
        const { creatures: playerCreatures, instanceIds } = resolvePlayerParty(
          collection,
          state.activeParty,
          deps,
        )
        const combat = createCombat({
          seed: combatSeed,
          player: { party: playerCreatures, effects: partyWideEffects },
          enemy: { party: fight.enemyParty },
          registries: {
            scripts: deps.scripts,
            traits: deps.traits,
            statuses: deps.statuses,
          },
        })
        const { state: finalState, events } = resolveFight(combat)
        allEvents.push(...events)
        const result = finalState.result as FightResult
        fightResults.push(result)
        let fightXp = 0

        // Rewards bank per kill-event, immediately, regardless of how this fight (or the floor)
        // ultimately ends (`spec/run.md#rewards`).
        for (const event of events) {
          if (event.type !== 'CreatureDied') continue
          const deadEnemy = fight.enemyParty.find((c) => c.id === event.creatureId)
          if (!deadEnemy) continue // a player-side death, not a reward source

          // A boss kill banks XP/currency through the same per-kill path but NO soul% (bosses
          // are not collectable, `spec/run.md#rewards` Rewards clause) -- and isn't looked up via
          // findStaticCreature at all: she isn't spawn-pool-drawn, so there's no static entry to
          // find (an add's death still falls through to the ordinary path below and DOES get
          // soul%, per the same clause).
          if (fight.boss && deadEnemy.id === fight.boss.creatureId) {
            fightXp += xpAwardForKill(deadEnemy.origin.level, deps.balanceConfig)
            currencyGained = addCurrencies(
              currencyGained,
              currencyDropForKill(floor, deps.balanceConfig),
            )
            continue
          }

          // The ordinary (non-boss) lookup is a pure, independently-
          // tested helper (rewards.ts's resolveKillReward) -- reads deadEnemy.origin.templateId,
          // never a parsed CreatureId suffix.
          const reward = resolveKillReward(
            deadEnemy,
            deps.standaloneCreatures,
            deps.biomes,
            deps.balanceConfig,
          )
          soulGainedThisCall.set(
            reward.staticId,
            (soulGainedThisCall.get(reward.staticId) ?? 0) + reward.soulGainPercent,
          )
          fightXp += reward.xpAwarded
          currencyGained = addCurrencies(
            currencyGained,
            currencyDropForKill(floor, deps.balanceConfig),
          )
        }

        // Whatever the fight's result: a lost or drawn fight's kills still level the party.
        xpBanked += fightXp
        collection = applyXpToParty(
          collection,
          state.activeParty,
          fightXp,
          deps.balanceConfig,
        )
        fightRecords.push({
          events,
          result,
          xpBanked: fightXp,
          partyLevelsAfter: instanceIds.map((id) => collection.get(id)!.level),
          seed: combatSeed,
          playerParty: playerCreatures,
          enemyParty: fight.enemyParty,
          playerEffects: partyWideEffects,
        })

        if (result !== 'win') {
          cleared = false
          break
        }

        if (fight.boss) bossDefeated = fight.boss.bossId
      }

      set((s) => {
        const soulProgress = new Map(s.soulProgress)
        for (const [id, gain] of soulGainedThisCall) {
          soulProgress.set(id, Math.min(100, (soulProgress.get(id) ?? 0) + gain))
        }
        const discoveredBiomes = new Set(s.discoveredBiomes)
        discoveredBiomes.add(biomeId)
        return {
          soulProgress,
          collection,
          discoveredBiomes,
          lastFloor: floor,
          deepestFloor: cleared ? Math.max(s.deepestFloor, floor) : s.deepestFloor,
          currencies: addCurrencies(s.currencies, currencyGained),
          runCounter: s.runCounter + fights.length + 1,
          bossesCleared:
            bossDefeated !== null
              ? withBossCleared(s.bossesCleared, bossDefeated)
              : s.bossesCleared,
        }
      })

      const bossesAfter =
        bossDefeated !== null
          ? withBossCleared(state.bossesCleared, bossDefeated)
          : state.bossesCleared
      const bossFirstCleared = bossesAfter !== state.bossesCleared

      return {
        ok: true,
        outcome: {
          floor,
          fightResults,
          cleared,
          bossDefeated,
          bossFirstCleared,
          perkPointsGained:
            perkPointsFor(bossesAfter) - perkPointsFor(state.bossesCleared),
          deepestFloorAdvanced: cleared && floor > state.deepestFloor,
          soulGained: soulGainedThisCall,
          xpBanked,
          currencyGained,
          events: allEvents,
          fightRecords,
        },
      }
    },

    runScriptedIntro() {
      const state = get()
      const { creatures: playerCreatures } = resolvePlayerParty(
        state.collection,
        state.activeParty,
        deps,
      )
      if (playerCreatures.length === 0) {
        throw new Error('runScriptedIntro: no active party -- call setSpec first')
      }
      const unicornRef = findStaticCreature(
        UNICORN.id,
        deps.standaloneCreatures,
        deps.biomes,
      )
      if (!unicornRef)
        throw new Error('runScriptedIntro: Unicorn not found in standaloneCreatures')
      const enemyCreature = materializeCreature(unicornRef.speciesCreature, {
        level: 1,
        side: 'enemy',
        slot: 0,
        speciesId: unicornRef.speciesId,
      })
      const combatSeed = hashRunDraw(state.runSeed, state.runCounter)
      const combat = createCombat({
        seed: combatSeed,
        player: { party: playerCreatures },
        enemy: { party: [enemyCreature] },
        registries: {
          scripts: deps.scripts,
          traits: deps.traits,
          statuses: deps.statuses,
        },
      })
      const { state: finalState, events } = resolveFight(combat)

      set((s) => {
        const granted = grantCreatureIfUnowned(s, deps, UNICORN.id)
        return {
          ...granted,
          collection: applyXpToParty(
            granted.collection,
            granted.activeParty,
            deps.balanceConfig.introXpGrant,
            deps.balanceConfig,
          ),
          runCounter: s.runCounter + 1,
        }
      })

      return { events, result: finalState.result as FightResult }
    },
  }))
}

/** The default, zero-config store instance -- real src/data content wired in. Biomes 1-3
 * (The Overgrowth/Glimmerdark/Rotcap Hollow) are real, playable content; biomes 4-10 are the
 * placeholder shape (empty spawn pools) until content authors them -- `descend()` against
 * floor 31+ returns `{ ok: false, reason: 'beyond-content-frontier' }` (see data/biomes.ts's own
 * header comment) until then. See integration.test.ts for an end-to-end exercise of this exact
 * instance against real floor 1. */
export const useGameStore = createGameStore()
