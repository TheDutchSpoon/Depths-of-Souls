// Phase 4 Slice G: src/state's first file (CONVENTIONS "Generation & the run layer" -- "the
// Zustand store owns navigation + ownership only... and CALLS the generator. It never owns the
// deterministic derivation of a floor's contents."). In-memory only -- no persistence middleware,
// no idb/Dexie (Phase 5, wholesale, per the brief's scope boundary).
//
// Dependency-injected via `createGameStore(overrides)` rather than a bare module-level `create`
// call: the default deps wire in real src/data content (`useGameStore`, below), but most tests
// (store.test.ts) run against a fully isolated, deterministic instance built on Slice A's own
// FIXTURE biome/spec data instead -- this is an ASSUMPTION beyond the brief's literal "store.ts"
// framing, necessary for testability without a UI (no Slice-4.5-style demo exists yet to
// exercise this against). Slice I's `integration.test.ts` is the deliberate exception: it runs
// the zero-override, real-content store end to end (real biomes 1-3 landed in H1-H3; biomes
// 4-10 stay the Slice A placeholder shape -- see data/biomes.ts).
//
// Phase 4.1-A (G5, S5, G6, A6, A7) reworks this file's action/state shape: player-reachable
// failures return `{ ok: false, reason }` instead of throwing (`descend`, `pinBiome`); each such
// action gets a pure `can...` query sharing its check; `currentFloor` is renamed `lastFloor`;
// `travelTo` is deleted (fast-travel is just `descend`); the collection becomes a flat
// `Map<InstanceId, Instance>`; and generation/rewards receive an injected `BalanceConfig`.

import { create } from 'zustand'
import { createCombat, resolveFight } from '../engine/combat'
import type { Trait, StatusDef } from '../engine/effect-types'
import {
  biomeForFloor,
  biomeHasContent,
  contentFrontier,
  FLOORS_PER_BIOME,
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
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
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
import { STATUS_REGISTRY } from '../data/statuses'
import { TRAIT_REGISTRY } from '../data/traits'
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
  /** Phase 4 interstitial slice (cumulative spell unlock): the GLOBAL spell registry
   * `generateFloor` rolls a cast-role loadout from (filtered by `unlockedAtBiome` then
   * affinity) -- replaces the old per-biome `BiomeData.spellPool`. */
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
  /** Phase 4.1-A (A7): the injected progression/economy config. Generation and reward math
   * receive this as an argument rather than reading module-level constants -- tests pin their
   * own config instead of inheriting tuning changes (see __fixtures__/balance.ts). */
  readonly balanceConfig: BalanceConfig
}

// ASSUMPTION: a fixed default so the store is constructible with zero config; a real new-game
// flow (a later phase) lets the player's save generation seed this instead.
const DEFAULT_RUN_SEED = 20260914

const DEFAULT_DEPS: GameStoreDeps = {
  biomes: BIOMES,
  allSpells: ALL_SPELLS,
  scripts: STOCK_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
  statuses: STATUS_REGISTRY,
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
  /** Phase 4.1-A (G6): the floor last FOUGHT (renamed from `currentFloor`) -- set by `descend` on
   * every actually-attempted run, success or failure; a `{ ok: false }` refusal leaves it (and
   * all other state) unchanged, since nothing was attempted. */
  readonly lastFloor: number
  readonly discoveredBiomes: ReadonlySet<BiomeId>
  readonly atlasPins: ReadonlyMap<number, BiomeId>
  /** Phase 4.1-A (A6): a flat map keyed by the OPAQUE InstanceId (never buckets keyed by static
   * creature id). */
  readonly collection: ReadonlyMap<InstanceId, Instance>
  readonly activeParty: readonly (InstanceId | null)[]
  /** 0-100, per static creature id. */
  readonly soulProgress: ReadonlyMap<string, number>
  readonly chosenSpec: string | null
  readonly perkSpend: ReadonlyMap<string, number>
  readonly bossesCleared: ReadonlySet<string>
  readonly currencies: Currencies
  /** ASSUMPTION 27: the run RNG stream's seed + an advance counter, NOT a live SeededRng object
   * -- keeps the store a plain, serializable-shaped record (ready for Phase 5's save format). A
   * fresh SeededRng is re-derived from (runSeed, runCounter) whenever a draw is needed, mirroring
   * biomeForFloor's own per-floor re-derivation (generation.ts) rather than threading a stateful
   * RNG object through Zustand. */
  readonly runSeed: number
  readonly runCounter: number
  /** Own addition (not named by the brief): a monotonic counter used only to mint unique,
   * deterministic, OPAQUE InstanceIds (`inst-<ordinal>`, Phase 4.1-A/A6) -- unrelated to
   * runCounter/RNG. */
  readonly nextInstanceOrdinal: number
}

export interface FloorOutcome {
  readonly floor: number
  /** One result per fight actually resolved -- stops at the first non-win (CONVENTIONS: "the
   * fight ends the instant a side has no living creatures"; a floor's remaining fights are
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
  /** Phase 4 Slice I (PR #65 review, boss floors): the bossId, iff this floor's (single) fight
   * was a boss encounter AND it was won -- else null. Idempotent at the bossesCleared level (a
   * re-fought, already-cleared boss still reports bossDefeated here, but grants no further perk
   * points -- see `withBossCleared`). */
  readonly bossDefeated: string | null
}

/** Phase 4.1-A (G5, S5): reasons `descend` can refuse -- see CONVENTIONS "State & persistence".
 * `beyond-content-frontier` wins over `floor-out-of-reach` when both apply (ASSUMPTION 23). */
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

/** Phase 4.1-G2 (ASSUMPTIONS 91, 92): `unknown-creature` (not resolvable to static data) is checked
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

/** Phase 4.1-G2 (G4): in this order, per CONVENTIONS "Specializations". */
export type SetPerkLevelFailureReason =
  'no-spec' | 'perk-not-in-spec' | 'invalid-level' | 'over-budget'

export type SetPerkLevelResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SetPerkLevelFailureReason }

export interface GameActions {
  /** Phase 4.1-G2 (§6, ASSUMPTION 87): resets EVERYTHING to a fresh game with the given run seed
   * (an integer in `0 .. 2^32 - 1`; anything else throws -- the seed comes from `src/app`, so a bad
   * one is an impossible state). The scripted intro is run separately. */
  newGame(options: { readonly seed: number }): void
  /** Phase 4.1-G2 (D2): needs 100% soul in `creatureId`; free and unlimited (ASSUMPTIONS 89, 90).
   * Creates a level-1 instance with rolled gems and puts it in the lowest-index empty party slot,
   * if any. `soulProgress` is left alone. */
  summon(creatureId: string): SummonResult
  /** Pure query sharing `summon`'s own check. */
  canSummon(creatureId: string): CanSummonResult
  /** Phase 4.1-G2 (D2): swap semantics -- placing an instance already in another slot swaps the
   * two; `null` empties the slot. An empty party is allowed (`descend` refuses it). */
  setPartySlot(slot: number, instanceId: InstanceId | null): SetPartySlotResult
  /** Pure query sharing `setPartySlot`'s own check. */
  canSetPartySlot(slot: number, instanceId: InstanceId | null): SetPartySlotResult
  /** Phase 4.1-G2 (G4): sets a perk's ABSOLUTE level (buy and refund are one call; 0 removes the
   * entry). Nothing is gated by the Phase 8 inert list. */
  setPerkLevel(perkId: string, level: number): SetPerkLevelResult
  /** Pure query sharing `setPerkLevel`'s own check. */
  canSetPerkLevel(perkId: string, level: number): SetPerkLevelResult
  /** Phase 4.1-G2 (G4, ASSUMPTION 88): clears all perk spend. Can't fail, so no `can…` query. */
  refundAllPerks(): void
  /** Refunds all spent perk points (clears perkSpend -- perk points are derived from
   * bossesCleared, so "refund" just means clearing spend) and, if the new spec's starter isn't
   * already owned, grants one copy of it into the collection (and the first open party slot).
   * ASSUMPTION 28: swapping specs never removes a previously-owned starter. Throws on an unknown
   * spec id (ASSUMPTION 9: the UI only offers real specs, so this is an impossible state, not a
   * player-reachable failure). */
  setSpec(specId: string): void
  /** Idempotent: a boss already in bossesCleared is a no-op (first-clear-only per GAME_DESIGN
   * §9). Own addition (not named by the brief) -- needed for bossesCleared to ever become
   * non-empty; perk points are `bossesCleared.size * 100`, derived, never stored separately. */
  recordBossKill(bossId: string): void
  /** Own addition (not named by the brief, but directly described by CONVENTIONS' Biome Atlas
   * facility). No facility-unlock gating here (Phase 8/facilities scope). Player-reachable
   * failure per G5/S5: returns `{ ok: false, reason }` instead of throwing. Reasons:
   * `floor-out-of-range` (floor < 1), `unknown-biome`, `biome-has-no-content` (review fix F1 --
   * refuses a pin that would otherwise route `descend` into the generator's own throw). */
  pinBiome(floor: number, biomeId: BiomeId): PinBiomeResult
  /** Pure query sharing `pinBiome`'s own check -- lets the UI grey out an invalid pin without
   * performing it. */
  canPinBiome(floor: number, biomeId: BiomeId): PinBiomeResult
  /** The integration action. Bounded to `1..min(deepestFloor+1, contentFrontier)` (can re-farm
   * any already-cleared floor, or push exactly one floor past the current frontier, but never
   * skip ahead or go past the last authored biome). Generates the floor via the engine's pure
   * generation module, runs each fight through the real resolver in sequence, banks soul%/XP/
   * currency rewards as each fight resolves (never held pending the floor's overall outcome),
   * applies XP-driven level-ups post-fight, and advances deepestFloor only on a full clear.
   * Player-reachable failure per G5/S5: returns `{ ok: false, reason }` (state unchanged) instead
   * of throwing. */
  descend(floor: number): DescendResult
  /** Pure query sharing `descend`'s own check -- lets the UI grey out an unreachable floor
   * without resolving anything. */
  canDescend(floor: number): CanDescendResult
  /** ASSUMPTION 23: NOT a new engine mechanism -- a fixed, hardcoded 1-enemy fight (the Unicorn)
   * resolved through the ordinary resolver, with a special outcome handler HERE (the run layer):
   * regardless of win/loss/draw, the Unicorn joins the collection (and the first open party
   * slot) if not already owned. The engine has zero awareness this fight is special. */
  runScriptedIntro(): {
    readonly events: readonly CombatEvent[]
    readonly result: FightResult
  }
}

// ---- Pure helpers over GameState (kept free functions -- easy to unit-test in isolation) ----

/** Builds the resolver-ready player Creature[] from activeParty, in slot order, skipping empty
 * slots and re-assigning CONTIGUOUS slot indices (0..k-1) to the resolved creatures -- the
 * engine's tie-break rule (player -> slot -> id) expects a dense slot space, not one with gaps. */
function resolvePlayerParty(state: GameState, deps: GameStoreDeps): Creature[] {
  const creatures: Creature[] = []
  let slot = 0
  for (const instanceId of state.activeParty) {
    if (instanceId === null) continue
    const instance = state.collection.get(instanceId)
    if (!instance) continue // defensive; activeParty should only ever reference owned instances
    const staticId = staticCreatureIdFor(instance)
    const staticRef = findStaticCreature(staticId, deps.standaloneCreatures, deps.biomes)
    if (!staticRef) continue // defensive; every referenced creatureId resolves to static data
    // ASSUMPTION 84: a stored spell id that no longer resolves is data drift, not a skippable slot.
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
    slot += 1
  }
  return creatures
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

/** Phase 4.1-G2 (ASSUMPTION 82): the unlock biome's 1-based number for a player gem roll -- the
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

/** Phase 4.1-G2 (ASSUMPTION 81): the spell ids a creature holds INNATELY, read from its traits'
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

/** Phase 4.1-G2 (D4, ASSUMPTION 81-84, 95): a new player instance's gem set, rolled once.
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
 * and into the lowest-index empty party slot if there is one (ASSUMPTION 92, brief ASSUMPTION 11).
 * Shared by the starter grant, the Unicorn grant and `summon` (ASSUMPTION 94). */
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
 * first-clear-only per GAME_DESIGN §9). Shared by `recordBossKill` and `descend()`'s own
 * boss-floor-win path (Phase 4 Slice I, PR #65 review) so the two never drift. */
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
 * mirrors generation.ts's own hashFloorDraw (ASSUMPTION 4's precedent), distinct constants so
 * the two hashes never collide by construction. */
function hashRunDraw(runSeed: number, counter: number): number {
  return (Math.imul(runSeed | 0, 0x27d4eb2f) ^ Math.imul(counter | 0, 0x165667b1)) >>> 0
}

/** Phase 4.1-G2 (ASSUMPTION 81): the player gem roll's own hash -- its OWN constants, distinct from
 * `hashRunDraw` above and generation's `hashFloorDraw`. Distinct constants make a coincidence with
 * another stream's seed unlikely, not impossible; what keeps a gem roll from shifting a floor draw
 * is that it is a separate stream that never touches `runCounter`. */
function hashGemDraw(runSeed: number, ordinal: number): number {
  return (
    (Math.imul(runSeed | 0, 0x2545f491) ^ Math.imul((ordinal + 1) | 0, 0x9e3779b9)) >>> 0
  )
}

/** Phase 4.1-A (G5, S5): the shared check behind both `descend` and `canDescend` -- a
 * player-reachable failure returns `{ ok: false, reason }`, never throws. Order: prerequisites
 * that don't depend on which floor was asked for (no-spec, empty-party) first, then
 * `beyond-content-frontier` before `floor-out-of-reach` so the frontier wins when both would
 * otherwise apply (ASSUMPTION 23). */
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

/** Phase 4.1-A (G5, S5): the shared check behind both `pinBiome` and `canPinBiome`. Kept
 * minimal/conservative (ASSUMPTION): only `floor >= 1` is required (no upper bound), preserving
 * today's implicit "pin any floor, including 101+" behaviour.
 *
 * Review fix F1: a pin into a biome with no content (`biomeHasContent`, generation.ts) is
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

/** Phase 4.1-G2 (ASSUMPTIONS 91, 92): shared by `summon` and `canSummon`. */
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

/** Phase 4.1-G2 (ASSUMPTION 92): shared by `setPartySlot` and `canSetPartySlot`. A non-integer
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

/** Phase 4.1-G2 (G4, ASSUMPTION 93): shared by `setPerkLevel` and `canSetPerkLevel`. The budget is
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
  const spent = spec.perks.reduce(
    (sum, p) =>
      sum + (p.id === perkId ? level : (state.perkSpend.get(p.id) ?? 0)) * p.costPerLevel,
    0,
  )
  if (spent > perkPointsFor(state.bossesCleared))
    return { ok: false, reason: 'over-budget' }
  return { ok: true }
}

const MAX_RUN_SEED = 0xffffffff

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

    descend(floor) {
      const state = get()
      const check = checkDescend(state, deps, floor)
      if (!check.ok) return check

      // Guaranteed non-null by checkDescend's own 'no-spec' branch above.
      const spec = deps.specializations.get(state.chosenSpec as string)
      if (!spec) throw new Error(`descend: unknown specialization ${state.chosenSpec}`)
      const partyWideEffects = resolveSpecializationEffects(spec, state.perkSpend)

      const biomeId = biomeForFloor(floor, deps.biomes, state.atlasPins, state.runSeed)
      const biome = deps.biomes.find((b) => b.id === biomeId)
      if (!biome) {
        throw new Error(`descend: no biome data for resolved biome id ${String(biomeId)}`)
      }
      // Phase 4 interstitial slice (cumulative spell unlock): the biome's 1-based number is its
      // position in the caller's own ordered `deps.biomes` list (CONVENTIONS'
      // "biomeForFloor's fixed 1-100 sequence is positional" -- generation.ts stays ignorant of
      // array position itself, it just receives the number).
      const biomeIndex = deps.biomes.findIndex((b) => b.id === biomeId) + 1

      const genRng = deps.createRng(hashRunDraw(state.runSeed, state.runCounter))
      const fights = generateFloor(
        floor,
        biome,
        biomeIndex,
        deps.allSpells,
        genRng,
        deps.balanceConfig,
      )
      const playerCreatures = resolvePlayerParty(state, deps)

      const soulGainedThisCall = new Map<string, number>()
      let xpBanked = 0
      let currencyGained = ZERO_CURRENCIES
      const fightResults: FightResult[] = []
      const allEvents: CombatEvent[] = []
      let cleared = true
      // Phase 4 Slice I (PR #65 review, boss floors): set iff this floor's (single) fight is a
      // boss encounter AND it's won -- CONVENTIONS "winning a boss fight adds its bossId to
      // bossesCleared."
      let bossDefeated: string | null = null

      for (let i = 0; i < fights.length; i++) {
        const fight = fights[i]!
        const combatSeed = hashRunDraw(state.runSeed, state.runCounter + i + 1)
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
        fightResults.push(finalState.result as FightResult)

        // Rewards bank per kill-event, immediately, regardless of how this fight (or the floor)
        // ultimately ends (CONVENTIONS: "never held pending fight outcome").
        for (const event of events) {
          if (event.type !== 'CreatureDied') continue
          const deadEnemy = fight.enemyParty.find((c) => c.id === event.creatureId)
          if (!deadEnemy) continue // a player-side death, not a reward source

          // A boss kill banks XP/currency through the same per-kill path but NO soul% (bosses
          // are not collectable, CONVENTIONS' Rewards clause) -- and isn't looked up via
          // findStaticCreature at all: she isn't spawn-pool-drawn, so there's no static entry to
          // find (an add's death still falls through to the ordinary path below and DOES get
          // soul%, per the same clause).
          if (fight.boss && deadEnemy.id === fight.boss.creatureId) {
            xpBanked += xpAwardForKill(deadEnemy.origin.level, deps.balanceConfig)
            currencyGained = addCurrencies(
              currencyGained,
              currencyDropForKill(floor, deps.balanceConfig),
            )
            continue
          }

          // Phase 4.1-A review fix F4: the ordinary (non-boss) lookup is a pure, independently-
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
          xpBanked += reward.xpAwarded
          currencyGained = addCurrencies(
            currencyGained,
            currencyDropForKill(floor, deps.balanceConfig),
          )
        }

        if (finalState.result !== 'win') {
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
          collection: applyXpToParty(
            s.collection,
            s.activeParty,
            xpBanked,
            deps.balanceConfig,
          ),
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

      return {
        ok: true,
        outcome: {
          floor,
          fightResults,
          cleared,
          bossDefeated,
          deepestFloorAdvanced: cleared && floor > state.deepestFloor,
          soulGained: soulGainedThisCall,
          xpBanked,
          currencyGained,
          events: allEvents,
        },
      }
    },

    runScriptedIntro() {
      const state = get()
      const playerCreatures = resolvePlayerParty(state, deps)
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

      set((s) => ({
        ...grantCreatureIfUnowned(s, deps, UNICORN.id),
        runCounter: s.runCounter + 1,
      }))

      return { events, result: finalState.result as FightResult }
    },
  }))
}

/** The default, zero-config store instance -- real src/data content wired in (Phase 4 Slice G:
 * "first use in the project"). Biomes 1-3 (The Overgrowth/Glimmerdark/Rotcap Hollow) are real,
 * playable content as of Slices H1-H3; biomes 4-10 stay Slice A's placeholder shape (empty
 * spawn pools) until a future phase authors them -- `descend()` against floor 31+ returns
 * `{ ok: false, reason: 'beyond-content-frontier' }` (see data/biomes.ts's own header comment)
 * until then. See integration.test.ts for an end-to-end exercise of this exact instance against
 * real floor 1. */
export const useGameStore = createGameStore()
