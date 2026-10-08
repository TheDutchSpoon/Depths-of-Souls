// Phase 4 Slice A: the run-layer generation module (CONVENTIONS "Generation & the run layer").
// Pure, seeded, RNG-free where CONVENTIONS says it must be RNG-free -- an `src/engine` sibling
// to the combat resolver, under the same purity discipline. Built and tested against small
// FIXTURE biome/species/creature data (`__fixtures__/biomes.ts`); Slice H1-H3 plug in real
// content of this exact shape via src/data/species/*.ts + src/data/biomes.ts.
//
// The Zustand store (Slice G) owns navigation/ownership and CALLS this module; it never owns
// the deterministic derivation of a floor's contents.

import { createCreatureId, type BiomeId, type CreatureId } from './ids'
import { createSeededRng, type SeededRng } from './rng'
import { scaleStatsToLevel } from './leveling'
import {
  bossLevel,
  enemyLevelRange,
  enemyPartySize,
  fightCount,
  type RarityTier,
} from './curves'
import type { BalanceConfig } from './balance-types'
import { DEFAULT_GEM_SLOT_COUNT } from './config'
import type { Affinity, Creature, CreatureStats, Side, Spell } from './types'

// ---- Static content shapes ----
// Slice A ships the SHAPE only (this is the "biome data + spawn pools" row of the phase plan's
// module map); H1-H3 author real src/data/species/*.ts content of this exact shape, and
// src/data/biomes.ts's real per-biome entries reference it. Never imported by src/ui/src/app.

export interface SpeciesCreature {
  readonly id: string
  /** Phase 4.1-A (G3): the full display name (e.g. "Treant Grovekeep", "Broodmother"), stored
   * whole -- NEVER assembled from the species name + this creature's own role/label. Required;
   * a data test (data/species/names.test.ts) asserts non-empty + unique across every real
   * SpeciesCreature (starters, the Unicorn, every biome's spawn pool, every boss). */
  readonly name: string
  readonly affinity: Affinity
  readonly baseStats: CreatureStats
  /** The creature's role/behavior when it spawns as an enemy (GAME_DESIGN §5). */
  readonly defaultScriptId: string
  readonly innateTraitIds: readonly string[]
  readonly rarity: RarityTier
}

export interface Species {
  readonly id: string
  readonly name: string
  /**
   * ASSUMPTION 5: this species' draw weight within its biome's spawn pool -- an explicit,
   * data-driven field (never a hardcoded uniform draw), defaulting to equal across a biome's
   * species when the seed content doesn't intentionally skew it.
   */
  readonly weight: number
  readonly creatures: readonly SpeciesCreature[]
}

/**
 * Phase 4 Slice I (PR #65 review, boss floors): a biome's authored floor-`FLOORS_PER_BIOME`
 * encounter (CONVENTIONS "Boss floors"). `speciesId` is explicit data, not derived -- the boss
 * isn't spawn-pool-drawn, so there's no pool entry to read it from (the Broodmother's speciesId
 * happens to equal her Spiders adds' own, so `living-allies-of-species` counts her together with
 * them; a lean boss with no natural species, like the Leech Sovereign, just carries her own id).
 * Every `adds` member must be a real member of this same biome's `speciesPool` (invariant-checked
 * in `generateFloor`, never re-typed here).
 */
export interface BossEncounter {
  readonly bossId: string
  readonly creature: SpeciesCreature
  readonly speciesId: string
  readonly adds: readonly SpeciesCreature[]
}

export interface BiomeData {
  readonly id: BiomeId
  readonly name: string
  readonly speciesPool: readonly Species[]
  readonly boss?: BossEncounter
}

// ---- Equip gating (CONVENTIONS "Spell affinity & equip-gating") ----
// A universal data-driven predicate, not a per-creature allow-list. First consumer: this
// module's cast-role loadout roll; player equipping (Phase 8) reuses the same gate.

export function canEquip(spell: Spell, affinity: Affinity): boolean {
  return spell.affinity === affinity
}

// ---- Biome selection ----

/** GAME_DESIGN §4: v1 ships exactly 10 biomes, one per floor-decade for floors 1-100. */
export const BIOME_COUNT = 10

/** GAME_DESIGN §4: each biome spans 10 floors -- the decade cadence `biomeForFloor` maps
 * against, and (Phase 4 Slice I) the boss-floor cadence below. Distinct concept from
 * `BIOME_COUNT` above (they share the same v1 value, 10, by coincidence, not by construction). */
export const FLOORS_PER_BIOME = 10

/**
 * Phase 4 Slice I (PR #65 review, boss floors): CONVENTIONS "Boss floors" -- a floor is a boss
 * floor iff it's the last floor of its biome's decade, at every depth (floor 101+ included, no
 * special case). Whether it actually generates as boss-only additionally depends on the
 * resolved biome carrying a `boss` (checked by the caller, `generateFloor` -- a placeholder
 * biome with no authored boss just generates an ordinary floor here).
 */
export function isBossFloor(floor: number): boolean {
  return floor % FLOORS_PER_BIOME === 0
}

/**
 * `(floor, biomes, atlasPins, runSeed) -> BiomeId`. Pure. Floors 1-100 use the fixed onboarding
 * sequence (decade N -> biomes[N]); floor 101+ draws by a seeded hash unless pinned.
 *
 * ASSUMPTION (Slice A, interpreting the brief's `biomeForFloor(floor, atlasPins, runSeed)`
 * shorthand): the ordered biome list is an explicit parameter rather than an implicit import
 * of `src/data/biomes.ts`. Real per-biome ids are authored names (e.g. an eventual
 * `overgrowth`), not numbered slots, so the fixed sequence has to be resolved against actual
 * biome data rather than synthesizing a parallel `biome-N` id space that would need its own
 * translation later. This also keeps the function engine-pure and testable against fixtures,
 * matching how `createCombat` takes `scripts`/`traits`/`statuses` as explicit registries rather
 * than reaching for `src/data` directly.
 */
export function biomeForFloor(
  floor: number,
  biomes: readonly BiomeData[],
  atlasPins: ReadonlyMap<number, BiomeId>,
  runSeed: number,
): BiomeId {
  const pinned = atlasPins.get(floor)
  if (pinned) return pinned

  if (floor <= 100) {
    const decade = Math.floor((floor - 1) / FLOORS_PER_BIOME) // 0..9 for floor 1..100
    const biome = biomes[decade]
    if (!biome) {
      throw new Error(`generation invariant violated: no biome data for decade ${decade}`)
    }
    return biome.id
  }

  // ASSUMPTION 4: a fresh seeded RNG re-derived from (runSeed, floor) -- NOT the live combat
  // RNG, and NOT advanced from a running stream -- so the draw is stable across repeated
  // visits to the same floor without persisting a table of past draws.
  const hash = hashFloorDraw(runSeed, floor)
  const roll = createSeededRng(hash).next()
  const index = Math.min(biomes.length - 1, Math.floor(roll * biomes.length))
  const biome = biomes[index]
  if (!biome) throw new Error('generation invariant violated: empty biome list')
  return biome.id
}

/** Small, deterministic, non-cryptographic combine of the run seed and a floor number --
 * distinct from the live combat RNG and from the run's own advancing RNG stream. */
function hashFloorDraw(runSeed: number, floor: number): number {
  return (Math.imul(runSeed | 0, 0x9e3779b1) ^ Math.imul(floor | 0, 0x85ebca77)) >>> 0
}

// ---- Materialization ----

export interface MaterializeCreatureOptions {
  readonly level: number
  readonly side: Side
  readonly slot: number
  readonly speciesId: string
  /** Phase 4.1-A (A5): named `gems` (not `equippedSpells`) to match its eventual Phase 4.1-G
   * source, `Instance.gems: spellId[]` (resolved to Spell objects by the caller) -- avoids a
   * second rename later. Same fallback semantics as Phase 4's positional `equippedSpells` param
   * (see the fallback-order comment below); untouched otherwise. */
  readonly gems?: readonly (Spell | null)[]
  /** Phase 4.1-A (A5/A6, ASSUMPTION 6): overrides `speciesCreature.defaultScriptId` when given
   * (including explicit `null`, which -- like `undefined` -- falls back to the default; both
   * mean "use the creature's default script"). The run layer resolves `Instance.scriptId` into
   * this option; nothing produces a non-null `Instance.scriptId` before a future
   * script-assignment phase, but the plumbing is real end to end as of this slice. */
  readonly scriptId?: string | null
  /** Phase 4.1-A (A5): an opaque string the run layer may stash an InstanceId in -- see
   * CreatureOrigin's own doc comment (engine/types.ts). Absent for generated enemies. */
  readonly ref?: string
}

/**
 * Pure and RNG-free (generation already spent the randomness upstream, in generateFloor).
 * Bakes `scaleStatsToLevel` into baseStats; copies affinity/innateTraitIds; resolves scriptId
 * (options.scriptId ?? the template's defaultScriptId) and fills `origin` (Phase 4.1-A, A5) from
 * the template id, the level, and the optional instance ref. `currentHp` is a placeholder
 * (baseStats.health) -- createCombat is what actually initializes it, via the exact same
 * fight-start path any other creature goes through, so a materialized creature never bypasses
 * that init. `speciesId` (Phase 4 Slice E2) is the owning `Species.id`, passed explicitly rather
 * than embedded on `SpeciesCreature` itself (mirrors `side`/`slot`/`level` already being
 * explicit options) -- `living-allies-of-species` (effects.ts) was inert (always 0) until then.
 *
 * `gems` fallback (Phase 4.1-B, A8: the FIXED-starter-loadout branch of this fallback is
 * deleted -- `SpeciesCreature.equippedSpells` no longer exists; a starter's granted spell is now
 * an `innate-spell` passive on its trait, prepended by `createCombat`'s fight-setup, never by
 * materializeCreature): the caller's own option wins when supplied (generateFloor's per-visit
 * rolled loadout for a spawned enemy), else all-null slots.
 *
 * `baselineEffects`/`revivesUsed` (Phase 4.1-B, S1/D3) are placeholders here -- `createCombat`
 * ALWAYS recomputes `baselineEffects` from the creature's `innateTraitIds` (never trusts an input
 * creature's own field) and resets `revivesUsed` to `0`; materializeCreature only needs to
 * satisfy `Creature`'s shape before fight-setup runs.
 */
export function materializeCreature(
  speciesCreature: SpeciesCreature,
  options: MaterializeCreatureOptions,
): Creature {
  const { level, side, slot, speciesId, gems, scriptId, ref } = options
  const baseStats = scaleStatsToLevel(speciesCreature.baseStats, level)
  return {
    id: createCreatureId(`${speciesCreature.id}-${side}-${slot}`),
    side,
    slot,
    baseStats,
    affinity: speciesCreature.affinity,
    currentHp: baseStats.health,
    alive: true,
    scriptId: scriptId ?? speciesCreature.defaultScriptId,
    equippedSpells: gems ?? Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    defending: false,
    provoking: false,
    innateTraitIds: speciesCreature.innateTraitIds,
    activeEffects: [],
    baselineEffects: [],
    revivesUsed: 0,
    // Phase 4 Slice D: cumulative-per-fight, always starts at 0.
    defendCount: 0,
    speciesId,
    // `ref` spread only when defined (nit, review) -- origin stays plain data with no explicit
    // `undefined` keys for a generated enemy, which never gets one.
    origin: {
      templateId: speciesCreature.id,
      level,
      ...(ref !== undefined ? { ref } : {}),
    },
    // Phase 4.1-H2a (ASSUMPTION 111): the engine-visible level, from the SAME variable as
    // `origin.level` so the two can never disagree.
    level,
  }
}

// ---- Weighted draws ----
// Pool iteration order is the pool's OWN authored order, never re-sorted -- this is a weighted
// random pick, not an extremum selection, so the shared side/slot/id tie-break doesn't apply.

function weightedPick<T>(
  pool: readonly T[],
  weightOf: (item: T) => number,
  rng: SeededRng,
): T {
  const first = pool[0]
  const total = pool.reduce((sum, item) => sum + weightOf(item), 0)
  if (!first || total <= 0) {
    throw new Error('generation invariant violated: empty or zero-weight pool')
  }
  let roll = rng.next() * total
  for (const item of pool) {
    roll -= weightOf(item)
    if (roll < 0) return item
  }
  return first // floating-point rounding guard at the top of the range; not normally reached
}

/**
 * Phase 4.1-G1 (ASSUMPTION 67): the role-script ids that make a creature a CAST ROLE -- one whose
 * script casts as a main action, so it must be generated with something to cast. A creature's
 * `defaultScriptId` is its role (CONVENTIONS "Role scripts"); `caster`, `support` and `opener` cast.
 * The other roles (striker, guardian, warden, taunter) only cast as a fallback. Named here because
 * the engine imports no data; a data test pins every shipped caster/support/opener against this
 * list, so a renamed role cannot silently stop being a cast role.
 */
export const CAST_ROLE_SCRIPT_IDS: readonly string[] = ['caster', 'support', 'opener']

function isCastRole(speciesCreature: SpeciesCreature): boolean {
  return CAST_ROLE_SCRIPT_IDS.includes(speciesCreature.defaultScriptId)
}

/**
 * Phase 4 interstitial slice (cumulative spell unlock): every spell whose `unlockedAtBiome` is
 * `<=` the current biome's 1-based number -- spells unlock cumulatively as the player descends,
 * so a biome-1 spell stays rollable at every deeper biome too. Pure filter, no RNG.
 */
export function spellsUnlockedAt(
  biomeIndex: number,
  allSpells: readonly Spell[],
): readonly Spell[] {
  return allSpells.filter((spell) => (spell.unlockedAtBiome ?? 1) <= biomeIndex)
}

/**
 * Phase 4.1-G1 (D4, ASSUMPTION 70): every enemy rolls a FULL, DISTINCT gem set -- one spell per
 * regular gem slot (`DEFAULT_GEM_SLOT_COUNT`), whatever its role -- from the cumulative-unlocked,
 * affinity-matched pool (`spellsUnlockedAt` then `canEquip`). Replaces "a cast-role enemy rolls one
 * spell into slot 0".
 *
 * One `weightedPick` per slot, in slot order, each over the pool minus the spells already chosen.
 * When that runs out (a pool smaller than the slot count) the remaining slots draw from the FULL
 * pool: duplicates only as this safety net. Exactly one draw per slot whenever the pool is
 * non-empty. An empty pool draws nothing and leaves the slots empty, except for a cast-role
 * creature, which throws (ASSUMPTION 71: "usable" = affinity-matched and unlocked, not castable in
 * any given fight; a cast role with nothing to cast is an authoring mistake, never a runtime state).
 *
 * Exported in Phase 4.1-G2 (ASSUMPTION 95) so the store's player gem roll is this same rule, not a
 * copy; the body is unchanged.
 */
export function rollLoadout(
  speciesCreature: SpeciesCreature,
  biomeIndex: number,
  allSpells: readonly Spell[],
  rng: SeededRng,
): readonly (Spell | null)[] {
  const slots: (Spell | null)[] = Array.from(
    { length: DEFAULT_GEM_SLOT_COUNT },
    () => null,
  )
  const matchingSpells = spellsUnlockedAt(biomeIndex, allSpells).filter((spell) =>
    canEquip(spell, speciesCreature.affinity),
  )
  if (matchingSpells.length === 0) {
    if (isCastRole(speciesCreature)) {
      throw new Error(
        `generation invariant violated: cast-role creature ${speciesCreature.id} has no ` +
          `${speciesCreature.affinity} spell unlocked at biome ${biomeIndex}`,
      )
    }
    return slots
  }

  for (let slot = 0; slot < slots.length; slot++) {
    const remaining = matchingSpells.filter((spell) => !slots.includes(spell))
    slots[slot] = weightedPick(
      remaining.length > 0 ? remaining : matchingSpells,
      () => 1,
      rng,
    )
  }
  return slots
}

// ---- Floor generation ----

export interface Fight {
  readonly enemyParty: readonly Creature[]
  /** Phase 4 Slice I (PR #65 review, boss floors): present iff this Fight is a boss encounter --
   * marks WHICH materialized enemy is the boss (its bossesCleared key + its assigned CreatureId,
   * so the run layer can single it out for reward-banking without re-deriving identity from the
   * id string, the way it does for ordinary spawn-pool enemies). */
  readonly boss?: { readonly bossId: string; readonly creatureId: CreatureId }
}

/** Resolves a boss's add to the real `Species.id` it belongs to in the biome's own pool --
 * mirrors `findStaticCreature`'s own scan (src/state/rewards.ts), engine-local so `generateFloor`
 * never re-types a speciesId as separate authored data. Throws (never re-typed, never silently
 * skipped) when an add isn't actually a member of the biome it's fought in -- a content-authoring
 * mistake, not a reachable runtime state. */
function resolveAddSpeciesId(biome: BiomeData, add: SpeciesCreature): string {
  for (const species of biome.speciesPool) {
    if (species.creatures.some((c) => c.id === add.id)) return species.id
  }
  throw new Error(
    `generation invariant violated: boss add ${add.id} is not a member of ${biome.name}'s species pool`,
  )
}

/**
 * The ordinary spawn path, shared by an ordinary fight's slots and a boss floor's fill (Phase
 * 4.1-G1): weighted species from `pool`, rarity-weighted creature within it, a level in range, then
 * a loadout -- always in that draw order -- materialized at `slot`.
 */
function spawnEnemy(
  pool: readonly Species[],
  slot: number,
  range: { readonly min: number; readonly max: number },
  biomeIndex: number,
  allSpells: readonly Spell[],
  runRng: SeededRng,
  balanceConfig: BalanceConfig,
): Creature {
  const species = weightedPick(pool, (s) => s.weight, runRng)
  const speciesCreature = weightedPick(
    species.creatures,
    (c) => balanceConfig.rarityDrawWeight[c.rarity],
    runRng,
  )
  const level = range.min + Math.floor(runRng.next() * (range.max - range.min + 1))
  const equippedSpells = rollLoadout(speciesCreature, biomeIndex, allSpells, runRng)
  return materializeCreature(speciesCreature, {
    level,
    side: 'enemy',
    slot,
    speciesId: species.id,
    gems: equippedSpells,
  })
}

/**
 * `(floor, biomeData, biomeIndex, allSpells, runRng, balanceConfig) -> Fight[]`, one entry per
 * `fightCount(floor, balanceConfig)`. Advances `runRng` (the caller's persistent run RNG stream,
 * per CONVENTIONS) -- re-descending the same floor with the stream at a different position
 * re-rolls its creatures, while `biomeForFloor` keeps the biome itself fixed.
 *
 * `biomeIndex` is the current biome's 1-based number (the caller's own resolved position in its
 * ordered biome list, per CONVENTIONS' "biomeForFloor's fixed 1-100 sequence is positional" --
 * generation.ts stays ignorant of array position itself, it just receives the number) and
 * `allSpells` is the GLOBAL spell registry (no longer a per-biome `spellPool`, Phase 4
 * interstitial slice) -- together they drive `rollLoadout`'s cumulative-unlock filter.
 * `balanceConfig` (Phase 4.1-A, A7) drives every depth curve below -- fightCount/enemyPartySize/
 * enemyLevelRange/bossLevel are now pure functions of `(floor, balanceConfig)`, never a literal.
 *
 * Phase 4 Slice I (PR #65 review, boss floors): when `isBossFloor(floor)` and the resolved
 * `biome` carries a `boss`, this returns exactly ONE Fight -- the boss at slot 0 (materialized at
 * `bossLevel(floor, balanceConfig)`, no per-visit LEVEL roll of her own -- an authored, elevated
 * Instance, not a spawn-pool draw -- but rolling a loadout via `rollLoadout` like any spawn, so
 * from 4.1-G1 she holds a full gem set whatever her role) followed by her authored adds (each
 * rolling a level within `enemyLevelRange(floor, balanceConfig)` and a loadout, the SAME per-slot
 * RNG calls an ordinary spawn makes, minus the species/creature draws a fixed add doesn't need).
 * `fightCount` is NOT consulted (one fight, no trash).
 *
 * Phase 4.1-G1 (6v6 boss floors, PR #81 review): the side is then FILLED up to
 * `enemyPartySize(floor)` -- 6 at every boss floor -- through the ordinary spawn path (`spawnEnemy`)
 * over the biome's pool minus the boss's own species, drawn from `runRng` after the boss's and the
 * adds' draws. Only which creatures the boss BRINGS is authored; the rest of her side is the biome's
 * own. A boss-less biome (the placeholder biomes, every fixture) falls through to the ordinary
 * path below unchanged.
 */
export function generateFloor(
  floor: number,
  biome: BiomeData,
  biomeIndex: number,
  allSpells: readonly Spell[],
  runRng: SeededRng,
  balanceConfig: BalanceConfig,
): readonly Fight[] {
  if (isBossFloor(floor) && biome.boss) {
    const boss = biome.boss
    const bossLoadout = rollLoadout(boss.creature, biomeIndex, allSpells, runRng)
    const bossCreature = materializeCreature(boss.creature, {
      level: bossLevel(floor, balanceConfig),
      side: 'enemy',
      slot: 0,
      speciesId: boss.speciesId,
      gems: bossLoadout,
    })
    const { min, max } = enemyLevelRange(floor, balanceConfig)
    const enemyParty: Creature[] = [bossCreature]
    boss.adds.forEach((add, index) => {
      const addSpeciesId = resolveAddSpeciesId(biome, add)
      const level = min + Math.floor(runRng.next() * (max - min + 1))
      const equippedSpells = rollLoadout(add, biomeIndex, allSpells, runRng)
      enemyParty.push(
        materializeCreature(add, {
          level,
          side: 'enemy',
          slot: index + 1,
          speciesId: addSpeciesId,
          gems: equippedSpells,
        }),
      )
    })
    // Phase 4.1-G1 (6v6 boss floors, PR #81 review; ASSUMPTION 72): fill the rest of the side up to
    // `enemyPartySize(floor)` through the ordinary spawn path, over the biome's pool MINUS the boss's
    // own species (so a count-scaling signature -- the Broodmother's spiderlings -- stays her
    // authored adds). Drawn from the run RNG after the boss's and the adds' draws, so it varies per
    // visit. A pool left with no positive-weight species fills nothing and throws nothing.
    const fillPool = biome.speciesPool.filter((species) => species.id !== boss.speciesId)
    const fillCount = Math.max(
      0,
      enemyPartySize(floor, balanceConfig) - enemyParty.length,
    )
    if (biomeHasContent({ ...biome, speciesPool: fillPool })) {
      for (let i = 0; i < fillCount; i++) {
        enemyParty.push(
          spawnEnemy(
            fillPool,
            enemyParty.length,
            { min, max },
            biomeIndex,
            allSpells,
            runRng,
            balanceConfig,
          ),
        )
      }
    }
    return [{ enemyParty, boss: { bossId: boss.bossId, creatureId: bossCreature.id } }]
  }

  const fights: Fight[] = []
  const { min, max } = enemyLevelRange(floor, balanceConfig)
  const partySize = enemyPartySize(floor, balanceConfig)

  for (let fightIndex = 0; fightIndex < fightCount(floor, balanceConfig); fightIndex++) {
    const enemyParty: Creature[] = []
    for (let slot = 0; slot < partySize; slot++) {
      enemyParty.push(
        spawnEnemy(
          biome.speciesPool,
          slot,
          { min, max },
          biomeIndex,
          allSpells,
          runRng,
          balanceConfig,
        ),
      )
    }
    fights.push({ enemyParty })
  }

  return fights
}

/**
 * Phase 4.1-A review fix (F1): true iff `generateFloor`'s own `weightedPick` calls (species,
 * then creature-within-species) could actually succeed against this biome -- at least one
 * species with a positive weight that itself has at least one creature. This is exactly the
 * condition whose absence makes `weightedPick` throw ("empty or zero-weight pool"), so it's the
 * single shared predicate behind both `contentFrontier` (below) and the store's `pinBiome` guard
 * -- the two must never disagree about what "no content" means.
 */
export function biomeHasContent(biome: BiomeData): boolean {
  return biome.speciesPool.some(
    (species) => species.weight > 0 && species.creatures.length > 0,
  )
}

/**
 * Phase 4.1-A (G5, S5); tightened by review fix F1: the last floor of the CONTIGUOUS prefix of
 * authored (has-content) biomes, derived from the biome data itself -- never a constant, so
 * authoring a new biome moves the frontier automatically. Stops at the FIRST biome without
 * content (never "the last non-empty one") -- a gap (an empty biome 2 followed by an authored
 * biome 3) must not make floors 21-30 "reachable": `biomeForFloor` would resolve biome 2 for
 * floors 11-20 and `generateFloor` would throw there regardless of biome 3's own content. `0` if
 * the very first biome has no content. Pure; `biomes` is read in its own authored/positional
 * order, matching `biomeForFloor`'s own fixed-sequence indexing.
 */
export function contentFrontier(biomes: readonly BiomeData[]): number {
  let count = 0
  for (const biome of biomes) {
    if (!biomeHasContent(biome)) break
    count += 1
  }
  return count * FLOORS_PER_BIOME
}
