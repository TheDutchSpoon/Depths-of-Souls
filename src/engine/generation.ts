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
  RARITY_DRAW_WEIGHT,
  bossLevel,
  enemyLevelRange,
  enemyPartySize,
  fightCount,
  type RarityTier,
} from './curves'
import { DEFAULT_GEM_SLOT_COUNT } from './config'
import type { Affinity, Creature, CreatureStats, Side, Spell } from './types'

// ---- Static content shapes ----
// Slice A ships the SHAPE only (this is the "biome data + spawn pools" row of the phase plan's
// module map); H1-H3 author real src/data/species/*.ts content of this exact shape, and
// src/data/biomes.ts's real per-biome entries reference it. Never imported by src/ui/src/app.

export interface SpeciesCreature {
  readonly id: string
  readonly affinity: Affinity
  readonly baseStats: CreatureStats
  /** The creature's role/behavior when it spawns as an enemy (GAME_DESIGN §5). */
  readonly defaultScriptId: string
  readonly innateTraitIds: readonly string[]
  readonly rarity: RarityTier
  /** Phase 4 Slice F (review amendment): a FIXED starter loadout (e.g. the Sorcerer starter's
   * granted extra gem) -- absent for every enemy-spawnable species, whose loadout is instead
   * rolled per-visit from the biome's spell pool (generateFloor's own `equippedSpells` argument
   * to materializeCreature always wins when supplied; see materializeCreature's own doc comment
   * for the exact fallback order). */
  readonly equippedSpells?: readonly (Spell | null)[]
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

/**
 * Pure and RNG-free (generation already spent the randomness upstream, in generateFloor).
 * Bakes `scaleStatsToLevel` into baseStats; copies affinity/defaultScriptId->scriptId/
 * innateTraitIds. `currentHp` is a placeholder (baseStats.health) -- createCombat is what
 * actually initializes it, via the exact same fight-start path any other creature goes
 * through, so a materialized creature never bypasses that init. `speciesId` (Phase 4 Slice E2 --
 * wired here, was left unset since Slice D) is the owning `Species.id`, passed explicitly rather
 * than embedded on `SpeciesCreature` itself (mirrors `side`/`slot`/`level` already being
 * explicit params) -- `living-allies-of-species` (effects.ts) was inert (always 0) until now.
 *
 * `equippedSpells` fallback order (Phase 4 Slice F, review amendment): the caller's own
 * argument wins when supplied (generateFloor's per-visit rolled loadout for a spawned enemy),
 * else `speciesCreature.equippedSpells` when the static data carries a FIXED loadout (a
 * starter's granted gem), else all-null slots (the pre-Slice-F default -- byte-identical for
 * every species/enemy that sets neither).
 */
export function materializeCreature(
  speciesCreature: SpeciesCreature,
  level: number,
  side: Side,
  slot: number,
  speciesId: string,
  equippedSpells?: readonly (Spell | null)[],
): Creature {
  const baseStats = scaleStatsToLevel(speciesCreature.baseStats, level)
  return {
    id: createCreatureId(`${speciesCreature.id}-${side}-${slot}`),
    side,
    slot,
    baseStats,
    affinity: speciesCreature.affinity,
    currentHp: baseStats.health,
    alive: true,
    scriptId: speciesCreature.defaultScriptId,
    equippedSpells:
      equippedSpells ??
      speciesCreature.equippedSpells ??
      Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    defending: false,
    provoking: false,
    innateTraitIds: speciesCreature.innateTraitIds,
    activeEffects: [],
    // Phase 4 Slice D: cumulative-per-fight, always starts at 0.
    defendCount: 0,
    speciesId,
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
 * ASSUMPTION (Slice A): "cast-role" is read narrowly, per the brief's own parenthetical, as
 * `defaultScriptId === 'always-cast'`. The broader "or more generally has a Cast rule" reading
 * needs real authored scripts to test against (Slice F+ content) and isn't reachable from
 * Slice A's stock-script-shaped fixtures.
 */
function isCastRole(speciesCreature: SpeciesCreature): boolean {
  return speciesCreature.defaultScriptId === 'always-cast'
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

/** A cast-role creature is generated with >=1 castable spell (CONVENTIONS: coherence, never an
 * empty loadout); everyone else spawns with empty gem slots. Rolls exactly one spell into slot
 * 0 from the cumulative-unlocked, affinity-matched pool -- gem-slot count itself isn't rolled in
 * v1. Replaces the old per-biome `spellPool` exclusivity (Phase 4 Slice A-H2): the pool a
 * cast-role enemy draws from is no longer scoped to its own biome's authored spells, it's every
 * spell unlocked at or before the current biome. */
function rollLoadout(
  speciesCreature: SpeciesCreature,
  biomeIndex: number,
  allSpells: readonly Spell[],
  rng: SeededRng,
): readonly (Spell | null)[] {
  const slots: (Spell | null)[] = Array.from(
    { length: DEFAULT_GEM_SLOT_COUNT },
    () => null,
  )
  if (!isCastRole(speciesCreature)) return slots

  const matchingSpells = spellsUnlockedAt(biomeIndex, allSpells).filter((spell) =>
    canEquip(spell, speciesCreature.affinity),
  )
  if (matchingSpells.length === 0) return slots // defensive; a real biome always has a match

  slots[0] = weightedPick(matchingSpells, () => 1, rng)
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
 * `(floor, biomeData, biomeIndex, allSpells, runRng) -> Fight[]`, one entry per
 * `fightCount(floor)`. Advances `runRng` (the caller's persistent run RNG stream, per
 * CONVENTIONS) -- re-descending the same floor with the stream at a different position
 * re-rolls its creatures, while `biomeForFloor` keeps the biome itself fixed.
 *
 * `biomeIndex` is the current biome's 1-based number (the caller's own resolved position in its
 * ordered biome list, per CONVENTIONS' "biomeForFloor's fixed 1-100 sequence is positional" --
 * generation.ts stays ignorant of array position itself, it just receives the number) and
 * `allSpells` is the GLOBAL spell registry (no longer a per-biome `spellPool`, Phase 4
 * interstitial slice) -- together they drive `rollLoadout`'s cumulative-unlock filter.
 *
 * Phase 4 Slice I (PR #65 review, boss floors): when `isBossFloor(floor)` and the resolved
 * `biome` carries a `boss`, this returns exactly ONE Fight -- the boss at slot 0 (materialized at
 * `bossLevel(floor)`, no per-visit LEVEL roll of her own -- an authored, elevated Instance, not a
 * spawn-pool draw -- but still rolling a loadout via `rollLoadout` like any spawn, so a cast-role
 * boss never breaks the "casters always get a spell" coherence rule; a no-op RNG-wise for every
 * currently-shipped boss, all of which are `always-attack`) followed by her authored adds (each
 * rolling a level within `enemyLevelRange(floor)` and a loadout via `rollLoadout`, the SAME
 * per-slot RNG calls an ordinary spawn makes, minus the species/creature draws a fixed add
 * doesn't need). `fightCount`/`enemyPartySize` are NOT consulted -- only which creatures appear
 * is authored, per CONVENTIONS. A boss-less biome (the placeholder biomes, every fixture) falls
 * through to the ordinary path below unchanged.
 */
export function generateFloor(
  floor: number,
  biome: BiomeData,
  biomeIndex: number,
  allSpells: readonly Spell[],
  runRng: SeededRng,
): readonly Fight[] {
  if (isBossFloor(floor) && biome.boss) {
    const boss = biome.boss
    const bossLoadout = rollLoadout(boss.creature, biomeIndex, allSpells, runRng)
    const bossCreature = materializeCreature(
      boss.creature,
      bossLevel(floor),
      'enemy',
      0,
      boss.speciesId,
      bossLoadout,
    )
    const { min, max } = enemyLevelRange(floor)
    const enemyParty: Creature[] = [bossCreature]
    boss.adds.forEach((add, index) => {
      const addSpeciesId = resolveAddSpeciesId(biome, add)
      const level = min + Math.floor(runRng.next() * (max - min + 1))
      const equippedSpells = rollLoadout(add, biomeIndex, allSpells, runRng)
      enemyParty.push(
        materializeCreature(add, level, 'enemy', index + 1, addSpeciesId, equippedSpells),
      )
    })
    return [{ enemyParty, boss: { bossId: boss.bossId, creatureId: bossCreature.id } }]
  }

  const fights: Fight[] = []
  const { min, max } = enemyLevelRange(floor)
  const partySize = enemyPartySize(floor)

  for (let fightIndex = 0; fightIndex < fightCount(floor); fightIndex++) {
    const enemyParty: Creature[] = []
    for (let slot = 0; slot < partySize; slot++) {
      const species = weightedPick(biome.speciesPool, (s) => s.weight, runRng)
      const speciesCreature = weightedPick(
        species.creatures,
        (c) => RARITY_DRAW_WEIGHT[c.rarity],
        runRng,
      )
      const level = min + Math.floor(runRng.next() * (max - min + 1))
      const equippedSpells = rollLoadout(speciesCreature, biomeIndex, allSpells, runRng)
      enemyParty.push(
        materializeCreature(
          speciesCreature,
          level,
          'enemy',
          slot,
          species.id,
          equippedSpells,
        ),
      )
    }
    fights.push({ enemyParty })
  }

  return fights
}
