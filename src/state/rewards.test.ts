// Phase 4 Slice G: unit coverage for the pure reward/lookup helpers, isolated from the store's
// Zustand plumbing (store.test.ts covers those integration paths). Reworked Phase 4.1-A (A6, A7)
// for the new Instance shape and the injected BalanceConfig.

import { describe, expect, test } from 'vitest'
import { DEFAULT_GEM_SLOT_COUNT } from '../engine/config'
import { createBiomeId } from '../engine/ids'
import type { BiomeData, Species, SpeciesCreature } from '../engine/generation'
import { makeCreature } from '../engine/__fixtures__/creatures'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from '../engine/__fixtures__/balance'
import { createInstanceId } from './ids'
import {
  addCurrencies,
  applyXpGain,
  currencyDropForKill,
  findStaticCreature,
  perkPointsFor,
  resolveKillReward,
  staticCreatureIdFor,
  ZERO_CURRENCIES,
  type Instance,
  type StaticCreatureRef,
} from './rewards'

// ASSUMPTION 83: a real instance holds one entry per regular gem slot (never `[]`).
const EMPTY_GEM_SLOTS = Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null)

// Review fix F6: the Phase-4 placeholder config reproduces the OLD linear curve
// (xpForNextLevel = 100 * level) exactly -- these four cases are byte-identical to main's own
// pre-4.1 applyXpGain tests, just now routed through CFG instead of an implicit module constant.
describe('applyXpGain (Phase-4 placeholder config: xpForNextLevel = 100 * level)', () => {
  test('no level-up when the gain stays under the threshold', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 5,
      xp: 10,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // xpForNextLevel(5) = 500; 10 + 50 = 60 < 500.
    expect(applyXpGain(instance, 50, CFG)).toEqual({ ...instance, level: 5, xp: 60 })
  })

  test('a single level-up consumes exactly the threshold, keeping the remainder', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // xpForNextLevel(1) = 100; 0 + 250 = 250 -> level 2 (250-100=150) -> 150 <
    // xpForNextLevel(2)=200, stop.
    expect(applyXpGain(instance, 250, CFG)).toEqual({ ...instance, level: 2, xp: 150 })
  })

  test('a large gain cascades through multiple level-ups in one call', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // 0 + 350: L1->L2 costs 100 (250 left), L2->L3 costs 200 (50 left), L3->L4 costs 300
    // (50 < 300, stop).
    expect(applyXpGain(instance, 350, CFG)).toEqual({ ...instance, level: 3, xp: 50 })
  })

  test('zero gain is a no-op', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 3,
      xp: 40,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    expect(applyXpGain(instance, 0, CFG)).toEqual(instance)
  })
})

// The new default curve (20 * level^2, ASSUMPTION 5) -- kept as its own block, separate from the
// byte-identical-to-main placeholder block above.
describe('applyXpGain (Phase 4.1-A default config: xpForNextLevel = 20 * level^2)', () => {
  test('no level-up when the gain stays under the threshold', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 5,
      xp: 10,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // xpForNextLevel(5) = 20*25 = 500; 10 + 50 = 60 < 500.
    expect(applyXpGain(instance, 50, DEFAULT_BALANCE_CONFIG)).toEqual({
      ...instance,
      level: 5,
      xp: 60,
    })
  })

  test('a single level-up consumes exactly the threshold, keeping the remainder', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // xpForNextLevel(1) = 20; 0 + 50 = 50 -> level 2 (50-20=30) -> xpForNextLevel(2)=80,
    // 30 < 80, stop.
    expect(applyXpGain(instance, 50, DEFAULT_BALANCE_CONFIG)).toEqual({
      ...instance,
      level: 2,
      xp: 30,
    })
  })

  test('a large gain cascades through multiple level-ups in one call', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    // 0 + 150: L1->L2 costs 20 (130 left), L2->L3 costs 80 (50 left), L3->L4 costs 180
    // (50 < 180, stop).
    expect(applyXpGain(instance, 150, DEFAULT_BALANCE_CONFIG)).toEqual({
      ...instance,
      level: 3,
      xp: 50,
    })
  })

  test('zero gain is a no-op', () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'c1' },
      level: 3,
      xp: 40,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    expect(applyXpGain(instance, 0, DEFAULT_BALANCE_CONFIG)).toEqual(instance)
  })
})

describe('staticCreatureIdFor', () => {
  test("resolves a 'creature' source to its creatureId", () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'creature', creatureId: 'spider-weaver' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    expect(staticCreatureIdFor(instance)).toBe('spider-weaver')
  })

  test("throws on a 'fusion' source (Phase 8 not built yet, ASSUMPTION 27)", () => {
    const instance: Instance = {
      id: createInstanceId('i1'),
      source: { kind: 'fusion', identityParent: 'a', affinityParent: 'b' },
      level: 1,
      xp: 0,
      scriptId: null,
      gems: EMPTY_GEM_SLOTS,
    }
    expect(() => staticCreatureIdFor(instance)).toThrow(
      /not materializable before Phase 8/,
    )
  })
})

describe('currencyDropForKill', () => {
  test('scales flat currencies 1:1 with floor; bricks is floor(floor/10), min 1', () => {
    expect(currencyDropForKill(1, CFG)).toEqual({
      essence: 1,
      ore: 1,
      bricks: 1,
      lifeforce: 1,
    })
    expect(currencyDropForKill(25, CFG)).toEqual({
      essence: 25,
      ore: 25,
      bricks: 2,
      lifeforce: 25,
    })
    expect(currencyDropForKill(100, CFG)).toEqual({
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
    name: 'Starter X',
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
    name: 'Pooled Y',
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

describe('resolveKillReward (Phase 4.1-A review fix F4)', () => {
  const BBB: SpeciesCreature = {
    id: 'bbb',
    name: 'BBB',
    affinity: 'wit',
    baseStats: { health: 10, attack: 10, intelligence: 10, defence: 10, speed: 10 },
    defaultScriptId: 'always-attack',
    innateTraitIds: [],
    rarity: 'common',
  }
  const standalone: readonly StaticCreatureRef[] = [
    { speciesCreature: BBB, speciesId: 'bbb-species' },
  ]

  test('resolves via origin.templateId, never the per-fight CreatureId -- id and origin deliberately disagree', () => {
    // The deleted suffix-parser sliced `-${side}-${slot}` off the per-fight CreatureId by exact
    // length: 'aaa-enemy-0' with side='enemy'/slot=0 would have resolved the WRONG static id
    // ('aaa'), which isn't in `standalone` here, so the old approach would have thrown where
    // this one succeeds. origin.templateId is raw data passed straight through by
    // materializeCreature, never derived from what the id string looks like.
    const deadEnemy = makeCreature({
      id: 'aaa-enemy-0',
      side: 'enemy',
      slot: 0,
      origin: { templateId: 'bbb', level: 4 },
    })

    const reward = resolveKillReward(deadEnemy, standalone, [], DEFAULT_BALANCE_CONFIG)

    expect(reward.staticId).toBe('bbb')
    expect(reward.staticRef).toEqual({ speciesCreature: BBB, speciesId: 'bbb-species' })
    expect(reward.xpAwarded).toBe(4) // xpAwardForKill(victimLevel=4, DEFAULT) = 1 * 4
    expect(reward.soulGainPercent).toBe(DEFAULT_BALANCE_CONFIG.soulGainPercent.common)
  })

  test('throws when origin.templateId has no resolvable static creature', () => {
    const deadEnemy = makeCreature({ origin: { templateId: 'does-not-exist', level: 1 } })
    expect(() =>
      resolveKillReward(deadEnemy, standalone, [], DEFAULT_BALANCE_CONFIG),
    ).toThrow(/no resolvable static creature/)
  })
})
