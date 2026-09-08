// Phase 4 Slice A: the run-layer generation module (CONVENTIONS "Generation & the run layer").
// Pure, seeded, RNG-free where CONVENTIONS says it must be RNG-free -- an `src/engine` sibling
// to the combat resolver, under the same purity discipline. Built and tested against small
// FIXTURE biome/species/creature data (`__fixtures__/biomes.ts`); Slice H1-H3 plug in real
// content of this exact shape via src/data/species/*.ts + src/data/biomes.ts.
//
// The Zustand store (Slice G) owns navigation/ownership and CALLS this module; it never owns
// the deterministic derivation of a floor's contents.

import { createCreatureId, type BiomeId } from './ids'
import { createSeededRng, type SeededRng } from './rng'
import { scaleStatsToLevel } from './leveling'
import {
  ENEMY_PARTY_SIZE,
  RARITY_DRAW_WEIGHT,
  enemyLevelRange,
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

export interface BiomeData {
  readonly id: BiomeId
  readonly name: string
  readonly speciesPool: readonly Species[]
  /** The affinity-matched pool a cast-role enemy's spell(s) are rolled from. */
  readonly spellPool: readonly Spell[]
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
    const decade = Math.floor((floor - 1) / 10) // 0..9 for floor 1..100
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
 * through, so a materialized creature never bypasses that init.
 */
export function materializeCreature(
  speciesCreature: SpeciesCreature,
  level: number,
  side: Side,
  slot: number,
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
      equippedSpells ?? Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    defending: false,
    provoking: false,
    innateTraitIds: speciesCreature.innateTraitIds,
    activeEffects: [],
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

/** A cast-role creature is generated with >=1 castable spell (CONVENTIONS: coherence, never an
 * empty loadout); everyone else spawns with empty gem slots. Rolls exactly one spell into slot
 * 0 from the biome's affinity-matched pool -- gem-slot count itself isn't rolled in v1. */
function rollLoadout(
  speciesCreature: SpeciesCreature,
  biome: BiomeData,
  rng: SeededRng,
): readonly (Spell | null)[] {
  const slots: (Spell | null)[] = Array.from(
    { length: DEFAULT_GEM_SLOT_COUNT },
    () => null,
  )
  if (!isCastRole(speciesCreature)) return slots

  const matchingSpells = biome.spellPool.filter((spell) =>
    canEquip(spell, speciesCreature.affinity),
  )
  if (matchingSpells.length === 0) return slots // defensive; a real biome always has a match

  slots[0] = weightedPick(matchingSpells, () => 1, rng)
  return slots
}

// ---- Floor generation ----

export interface Fight {
  readonly enemyParty: readonly Creature[]
}

/**
 * `(floor, biomeData, runRng) -> Fight[]`, one entry per `fightCount(floor)`. Advances
 * `runRng` (the caller's persistent run RNG stream, per CONVENTIONS) -- re-descending the same
 * floor with the stream at a different position re-rolls its creatures, while `biomeForFloor`
 * keeps the biome itself fixed.
 */
export function generateFloor(
  floor: number,
  biome: BiomeData,
  runRng: SeededRng,
): readonly Fight[] {
  const fights: Fight[] = []
  const { min, max } = enemyLevelRange(floor)

  for (let fightIndex = 0; fightIndex < fightCount(floor); fightIndex++) {
    const enemyParty: Creature[] = []
    for (let slot = 0; slot < ENEMY_PARTY_SIZE; slot++) {
      const species = weightedPick(biome.speciesPool, (s) => s.weight, runRng)
      const speciesCreature = weightedPick(
        species.creatures,
        (c) => RARITY_DRAW_WEIGHT[c.rarity],
        runRng,
      )
      const level = min + Math.floor(runRng.next() * (max - min + 1))
      const equippedSpells = rollLoadout(speciesCreature, biome, runRng)
      enemyParty.push(
        materializeCreature(speciesCreature, level, 'enemy', slot, equippedSpells),
      )
    }
    fights.push({ enemyParty })
  }

  return fights
}
