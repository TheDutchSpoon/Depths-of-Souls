import { describe, expect, it } from 'vitest'
import { BROODMOTHER_TRAIT, TRAIT_REGISTRY } from '../traits'
import { STATUS_REGISTRY } from '../statuses'
import { canEquip } from '../../engine/generation'
import {
  BROODMOTHER,
  BROODMOTHER_ADDS,
  OVERGROWTH_AFFINITIES,
  OVERGROWTH_BIOME,
  OVERGROWTH_SPECIES_POOL,
  OVERGROWTH_SPELLS,
  SPIDERS,
} from './overgrowth'

// Loader/shape test (per the H1 common checklist item 6): every creature has a valid
// affinity/species/rarity/trait reference; every trait/spell/status referenced actually exists
// in a registry.

const ALL_CREATURES = OVERGROWTH_SPECIES_POOL.flatMap((s) => s.creatures)

describe('The Overgrowth: shape', () => {
  it('ships exactly 6 species x 3 creatures (18 total)', () => {
    expect(OVERGROWTH_SPECIES_POOL).toHaveLength(6)
    for (const species of OVERGROWTH_SPECIES_POOL) {
      expect(species.creatures).toHaveLength(3)
    }
    expect(ALL_CREATURES).toHaveLength(18)
  })

  it('every species has a unique id, every creature within it a unique id', () => {
    const speciesIds = new Set(OVERGROWTH_SPECIES_POOL.map((s) => s.id))
    expect(speciesIds.size).toBe(6)
    const creatureIds = new Set(ALL_CREATURES.map((c) => c.id))
    expect(creatureIds.size).toBe(18)
  })

  it('every species declares a positive draw weight (ASSUMPTION 5)', () => {
    for (const species of OVERGROWTH_SPECIES_POOL) {
      expect(species.weight).toBeGreaterThan(0)
    }
  })

  it('every creature carries exactly one innate trait, referencing a real TRAIT_REGISTRY entry', () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.innateTraitIds).toHaveLength(1)
      for (const traitId of creature.innateTraitIds) {
        expect(TRAIT_REGISTRY.has(traitId)).toBe(true)
      }
    }
  })

  it("base stats fall within GAME_DESIGN's 10-30 range for every stat", () => {
    for (const creature of ALL_CREATURES) {
      for (const value of Object.values(creature.baseStats)) {
        expect(value).toBeGreaterThanOrEqual(10)
        expect(value).toBeLessThanOrEqual(30)
      }
    }
  })

  it('is affinity-complete (all 5 affinities present, "Coverage" note)', () => {
    const affinities = new Set(OVERGROWTH_AFFINITIES)
    expect(affinities).toEqual(
      new Set(['vitality', 'violence', 'wit', 'endurance', 'instinct']),
    )
  })

  it('exactly one cast-role creature, and every spell it could roll is affinity-matched', () => {
    const casters = ALL_CREATURES.filter((c) => c.defaultScriptId === 'always-cast')
    expect(casters).toHaveLength(1)
    for (const caster of casters) {
      const matching = OVERGROWTH_SPELLS.filter((spell) =>
        canEquip(spell, caster.affinity),
      )
      expect(matching.length).toBeGreaterThan(0)
    }
  })

  it('every spell that applies a status references a real STATUS_REGISTRY entry', () => {
    for (const spell of OVERGROWTH_SPELLS) {
      if (spell.appliesStatus) {
        expect(STATUS_REGISTRY.has(spell.appliesStatus.statusId)).toBe(true)
      }
    }
  })

  it('OVERGROWTH_BIOME wires the real species pool', () => {
    expect(OVERGROWTH_BIOME.speciesPool).toBe(OVERGROWTH_SPECIES_POOL)
  })

  it('every OVERGROWTH_SPELLS entry is tagged unlockedAtBiome:1 (this biome is the base tier)', () => {
    for (const spell of OVERGROWTH_SPELLS) {
      expect(spell.unlockedAtBiome).toBe(1)
    }
  })
})

describe('Broodmother (floor-10 boss)', () => {
  it('references a real registered trait', () => {
    expect(TRAIT_REGISTRY.get(BROODMOTHER_TRAIT.id)).toBe(BROODMOTHER_TRAIT)
    expect(BROODMOTHER.innateTraitIds).toEqual([BROODMOTHER_TRAIT.id])
  })

  it('base stats fall within the 10-30 range (elevated power comes from level, not raw base)', () => {
    for (const value of Object.values(BROODMOTHER.baseStats)) {
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThanOrEqual(30)
    }
  })

  it('her adds are real Spider-roster members (species-locked.md: "adds: spiderlings")', () => {
    for (const add of BROODMOTHER_ADDS) {
      expect(SPIDERS.creatures).toContain(add)
    }
  })
})
