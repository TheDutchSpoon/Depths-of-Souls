import { describe, expect, it } from 'vitest'
import { LEECH_SOVEREIGN_TRAIT, TRAIT_REGISTRY } from '../traits'
import { STATUS_REGISTRY } from '../statuses'
import { STOCK_SCRIPTS_BY_ID } from '../scripts'
import { canEquip, CAST_ROLE_SCRIPT_IDS } from '../../engine/generation'
import {
  GLIMMERDARK_AFFINITIES,
  GLIMMERDARK_BIOME,
  GLIMMERDARK_SPECIES_POOL,
  GLIMMERDARK_SPELLS,
  LEECH_SOVEREIGN,
} from './glimmerdark'

// Loader/shape test (per the H1/H2 common checklist item 6): every creature has a valid
// affinity/species/rarity/trait/script reference; every trait/spell/status referenced actually
// exists in a registry.

const ALL_CREATURES = GLIMMERDARK_SPECIES_POOL.flatMap((s) => s.creatures)
const FLICKERLING_IDS = [
  'flickerling-wick',
  'flickerling-flare',
  'flickerling-last-gleam',
]

describe('Glimmerdark: shape', () => {
  it('ships exactly 6 species x 3 creatures (18 total)', () => {
    expect(GLIMMERDARK_SPECIES_POOL).toHaveLength(6)
    for (const species of GLIMMERDARK_SPECIES_POOL) {
      expect(species.creatures).toHaveLength(3)
    }
    expect(ALL_CREATURES).toHaveLength(18)
  })

  it('every species has a unique id, every creature within it a unique id', () => {
    const speciesIds = new Set(GLIMMERDARK_SPECIES_POOL.map((s) => s.id))
    expect(speciesIds.size).toBe(6)
    const creatureIds = new Set(ALL_CREATURES.map((c) => c.id))
    expect(creatureIds.size).toBe(18)
  })

  it('every species declares a positive draw weight (ASSUMPTION 5)', () => {
    for (const species of GLIMMERDARK_SPECIES_POOL) {
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

  it('every creature references a real STOCK_SCRIPTS_BY_ID script', () => {
    for (const creature of ALL_CREATURES) {
      expect(STOCK_SCRIPTS_BY_ID.has(creature.defaultScriptId)).toBe(true)
    }
  })

  it("base stats fall within GAME_DESIGN's ranges: Health 20-45 for the three Flickerlings (the new scale, 4.1-H2b1), 10-30 for every other creature's stats and for the Flickerlings' own Attack, Intelligence, Defence and Speed", () => {
    for (const creature of ALL_CREATURES) {
      const onNewHealthScale = FLICKERLING_IDS.includes(creature.id)
      for (const [stat, value] of Object.entries(creature.baseStats)) {
        if (stat === 'health' && onNewHealthScale) {
          expect(value).toBeGreaterThanOrEqual(20)
          expect(value).toBeLessThanOrEqual(45)
        } else {
          expect(value).toBeGreaterThanOrEqual(10)
          expect(value).toBeLessThanOrEqual(30)
        }
      }
    }
  })

  it('the Flickerlings take the old first slot (pool index 0), in rarity order, with the content doc Health and scripts (4.1-H2b1)', () => {
    const flickerlings = GLIMMERDARK_SPECIES_POOL[0]!
    expect(flickerlings.id).toBe('flickerlings')
    expect(flickerlings.weight).toBe(1)
    expect(
      flickerlings.creatures.map((c) => [c.id, c.rarity, c.affinity, c.defaultScriptId]),
    ).toEqual([
      ['flickerling-wick', 'common', 'vitality', 'support'],
      ['flickerling-flare', 'uncommon', 'wit', 'caster'],
      ['flickerling-last-gleam', 'rare', 'violence', 'striker'],
    ])
    expect(flickerlings.creatures.map((c) => c.baseStats.health)).toEqual([38, 25, 28])
    expect(flickerlings.creatures.map((c) => c.baseStats)).toEqual([
      { health: 38, attack: 10, intelligence: 16, defence: 14, speed: 16 },
      { health: 25, attack: 14, intelligence: 22, defence: 10, speed: 22 },
      { health: 28, attack: 24, intelligence: 10, defence: 14, speed: 18 },
    ])
  })

  it('the affinity spread is 4 Wit / 3 Instinct / 5 Violence / 4 Endurance / 2 Vitality (4.1-H2b1)', () => {
    const count = (affinity: string) =>
      GLIMMERDARK_AFFINITIES.filter((a) => a === affinity).length
    expect([
      count('wit'),
      count('instinct'),
      count('violence'),
      count('endurance'),
      count('vitality'),
    ]).toEqual([4, 3, 5, 4, 2])
  })

  it('is affinity-complete (all 5 affinities present, "Coverage" note)', () => {
    const affinities = new Set(GLIMMERDARK_AFFINITIES)
    expect(affinities).toEqual(
      new Set(['vitality', 'violence', 'wit', 'endurance', 'instinct']),
    )
  })

  it('the cast-role creatures (caster / support / opener, 4.1-G1) are exactly the roles table ones, and each has an affinity-matched spell', () => {
    const casters = ALL_CREATURES.filter((c) =>
      CAST_ROLE_SCRIPT_IDS.includes(c.defaultScriptId),
    )
    expect(casters.map((c) => c.id)).toEqual([
      'flickerling-wick',
      'flickerling-flare',
      'blindclaws-setter',
      'resonant-chorus',
      'resonant-adept',
      'resonant-overtone',
      'gloomjaw-stalker',
    ])
    for (const caster of casters) {
      const matching = GLIMMERDARK_SPELLS.filter((spell) =>
        canEquip(spell, caster.affinity),
      )
      expect(matching.length).toBeGreaterThan(0)
    }
  })

  it('every spell that applies a status references a real STATUS_REGISTRY entry', () => {
    for (const spell of GLIMMERDARK_SPELLS) {
      for (const effect of spell.effects) {
        if (effect.kind === 'apply-status') {
          expect(STATUS_REGISTRY.has(effect.status.statusId)).toBe(true)
        }
      }
    }
  })

  it('GLIMMERDARK_BIOME wires the real species pool', () => {
    expect(GLIMMERDARK_BIOME.speciesPool).toBe(GLIMMERDARK_SPECIES_POOL)
  })

  it('every GLIMMERDARK_SPELLS entry is tagged unlockedAtBiome:2 (this biome is the second tier)', () => {
    for (const spell of GLIMMERDARK_SPELLS) {
      expect(spell.unlockedAtBiome).toBe(2)
    }
  })
})

describe('Leech Sovereign (floor-20 boss)', () => {
  it('references a real registered trait', () => {
    expect(TRAIT_REGISTRY.get(LEECH_SOVEREIGN_TRAIT.id)).toBe(LEECH_SOVEREIGN_TRAIT)
    expect(LEECH_SOVEREIGN.innateTraitIds).toEqual([LEECH_SOVEREIGN_TRAIT.id])
  })

  it('base stats fall within the 10-30 range (elevated power comes from level, not raw base)', () => {
    for (const value of Object.values(LEECH_SOVEREIGN.baseStats)) {
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThanOrEqual(30)
    }
  })
})
