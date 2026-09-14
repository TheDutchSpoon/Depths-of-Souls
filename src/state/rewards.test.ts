// Phase 4 Slice G: unit coverage for the pure reward/lookup helpers, isolated from the store's
// Zustand plumbing (store.test.ts covers those integration paths).

import { describe, expect, test } from 'vitest'
import { createBiomeId } from '../engine/ids'
import type { BiomeData, Species, SpeciesCreature } from '../engine/generation'
import { createInstanceId } from './ids'
import {
  addCurrencies,
  applyXpGain,
  currencyDropForKill,
  findStaticCreature,
  perkPointsFor,
  ZERO_CURRENCIES,
  type Instance,
  type StaticCreatureRef,
} from './rewards'

describe('applyXpGain', () => {
  // xpForNextLevel(level) = 100 * level (leveling.ts).
  test('no level-up when the gain stays under the threshold', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      creatureId: 'c1',
      level: 5,
      xp: 10,
    }
    // xpForNextLevel(5) = 500; 10 + 50 = 60 < 500.
    expect(applyXpGain(instance, 50)).toEqual({ ...instance, level: 5, xp: 60 })
  })

  test('a single level-up consumes exactly the threshold, keeping the remainder', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      creatureId: 'c1',
      level: 1,
      xp: 0,
    }
    // xpForNextLevel(1) = 100; 0 + 250 = 250 -> level 2 (250-100=150) -> 150 < xpForNextLevel(2)=200, stop.
    expect(applyXpGain(instance, 250)).toEqual({ ...instance, level: 2, xp: 150 })
  })

  test('a large gain cascades through multiple level-ups in one call', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      creatureId: 'c1',
      level: 1,
      xp: 0,
    }
    // 0 + 350: L1->L2 costs 100 (250 left), L2->L3 costs 200 (50 left), L3->L4 costs 300 (50 < 300, stop).
    expect(applyXpGain(instance, 350)).toEqual({ ...instance, level: 3, xp: 50 })
  })

  test('zero gain is a no-op', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      creatureId: 'c1',
      level: 3,
      xp: 40,
    }
    expect(applyXpGain(instance, 0)).toEqual(instance)
  })
})

describe('currencyDropForKill', () => {
  test('scales flat currencies 1:1 with floor; bricks is floor(floor/10), min 1', () => {
    expect(currencyDropForKill(1)).toEqual({
      essence: 1,
      ore: 1,
      bricks: 1,
      lifeforce: 1,
    })
    expect(currencyDropForKill(25)).toEqual({
      essence: 25,
      ore: 25,
      bricks: 2,
      lifeforce: 25,
    })
    expect(currencyDropForKill(100)).toEqual({
      essence: 100,
      ore: 100,
      bricks: 10,
      lifeforce: 100,
    })
  })
})

describe('addCurrencies', () => {
  test('sums each field independently', () => {
    const a = { essence: 1, ore: 2, bricks: 3, lifeforce: 4 }
    const b = { essence: 10, ore: 20, bricks: 30, lifeforce: 40 }
    expect(addCurrencies(a, b)).toEqual({
      essence: 11,
      ore: 22,
      bricks: 33,
      lifeforce: 44,
    })
    expect(addCurrencies(a, ZERO_CURRENCIES)).toEqual(a)
  })
})

describe('perkPointsFor', () => {
  test('100 points per boss, derived from the set size', () => {
    expect(perkPointsFor(new Set())).toBe(0)
    expect(perkPointsFor(new Set(['broodmother']))).toBe(100)
    expect(perkPointsFor(new Set(['broodmother', 'leech-sovereign']))).toBe(200)
  })
})

describe('findStaticCreature', () => {
  const STARTER: SpeciesCreature = {
    id: 'starter-x',
    affinity: 'wit',
    baseStats: { health: 10, attack: 10, intelligence: 10, defence: 10, speed: 10 },
    defaultScriptId: 'always-attack',
    innateTraitIds: [],
    rarity: 'rare',
  }
  const standalone: readonly StaticCreatureRef[] = [
    { speciesCreature: STARTER, speciesId: 'starter-x-species' },
  ]

  const POOLED: SpeciesCreature = {
    id: 'pooled-y',
    affinity: 'instinct',
    baseStats: { health: 12, attack: 12, intelligence: 12, defence: 12, speed: 12 },
    defaultScriptId: 'always-attack',
    innateTraitIds: [],
    rarity: 'common',
  }
  const species: Species = {
    id: 'species-y',
    name: 'Species Y',
    weight: 1,
    creatures: [POOLED],
  }
  const biome: BiomeData = {
    id: createBiomeId('biome-y'),
    name: 'Biome Y',
    speciesPool: [species],
    spellPool: [],
  }

  test('resolves a standalone (starter/Unicorn) creature by id', () => {
    expect(findStaticCreature('starter-x', standalone, [])).toEqual({
      speciesCreature: STARTER,
      speciesId: 'starter-x-species',
    })
  })

  test('falls back to scanning every biome species pool', () => {
    expect(findStaticCreature('pooled-y', standalone, [biome])).toEqual({
      speciesCreature: POOLED,
      speciesId: 'species-y',
    })
  })

  test('returns undefined for an unknown id', () => {
    expect(findStaticCreature('nope', standalone, [biome])).toBeUndefined()
  })
})
