import { describe, expect, test } from 'vitest'
import { createSeededRng } from '../engine/rng'
import { generateFloor } from '../engine/generation'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { STARTERS } from '../data/species/starters'
import { bossName, buildNameTable, creatureName, DEMO_NAMES } from './names'

describe('the name table', () => {
  test('names every creature of the boss floors 10, 20 and 30, boss and adds included', () => {
    for (const floor of [10, 20, 30]) {
      const biomeIndex = Math.floor((floor - 1) / 10)
      const biome = BIOMES[biomeIndex]!
      expect(biome.boss).toBeDefined()
      const fights = generateFloor(
        floor,
        biome,
        biomeIndex + 1,
        ALL_SPELLS,
        createSeededRng(floor),
        DEFAULT_BALANCE_CONFIG,
      )
      expect(fights).toHaveLength(1)
      const party = fights[0]!.enemyParty
      expect(party.some((c) => c.id === fights[0]!.boss!.creatureId)).toBe(true)
      for (const creature of party) {
        expect(creatureName(DEMO_NAMES, creature.origin.templateId)).not.toBe('')
      }
    }
  })

  // The Broodmother is in no species pool, only in the biome's `boss`: without the boss row her
  // template is unnamed and the lookup throws rather than falling back to the id.
  test('a boss is named by the boss row alone, and an unnamed template throws', () => {
    const boss = BIOMES[0]!.boss!
    const withBoss = buildNameTable(STARTERS, BIOMES)
    expect(creatureName(withBoss, boss.creature.id)).toBe(boss.creature.name)
    const withoutBoss = buildNameTable(
      STARTERS,
      BIOMES.map((biome) => ({
        id: biome.id,
        name: biome.name,
        speciesPool: biome.speciesPool,
      })),
    )
    expect(() => creatureName(withoutBoss, boss.creature.id)).toThrow(boss.creature.id)
  })

  test('names the starters and the Unicorn, and every pool creature', () => {
    for (const creature of STARTERS) {
      expect(creatureName(DEMO_NAMES, creature.id)).toBe(creature.name)
    }
    for (const biome of BIOMES) {
      for (const species of biome.speciesPool) {
        for (const creature of species.creatures) {
          expect(creatureName(DEMO_NAMES, creature.id)).toBe(creature.name)
        }
      }
    }
  })

  test('a template in no table throws and never falls back to its id', () => {
    expect(() => creatureName(DEMO_NAMES, 'no-such-creature')).toThrow('no-such-creature')
  })
})

describe('bossName', () => {
  test('finds the boss by its id over the biomes, and throws on an unknown one', () => {
    expect(bossName(BIOMES, 'broodmother')).toBe(BIOMES[0]!.boss!.creature.name)
    expect(() => bossName(BIOMES, 'nobody')).toThrow('nobody')
  })
})
