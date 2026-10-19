// The farthest floor a player can enter is one past the deepest cleared (`farthestReachableFloor`),
// whatever the biome list holds; the store refuses a biome list it could not generate floors from; and the
// player gem pool follows the deepest floor up to `LAST_FIXED_FLOOR` only.

import { describe, expect, test } from 'vitest'
import { LAST_FIXED_FLOOR } from '../engine/generation'
import type { BiomeData } from '../engine/generation'
import { createBiomeId } from '../engine/ids'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { farthestReachableFloor, createGameStore } from './store'

const EMPTY: BiomeData = { id: createBiomeId('empty'), name: 'Empty', speciesPool: [] }
const FIRST = BIOMES[0]!
const SECOND = BIOMES[1]!

function readyStore(overrides: Parameters<typeof createGameStore>[0] = {}) {
  const store = createGameStore(overrides)
  store.getState().setSpec('brute')
  return store
}

describe('farthestReachableFloor', () => {
  test.each([
    [0, 1],
    [1, 2],
    [12, 13],
    [99, 100],
    [150, 151],
  ])('deepest %i reaches %i', (deepest, reach) => {
    expect(farthestReachableFloor(deepest)).toBe(reach)
  })
})

describe('canDescend and descend: the reach', () => {
  test('one past the deepest floor cleared is entered, the next one is refused', () => {
    const store = readyStore()
    store.setState({ deepestFloor: 30 })
    expect(store.getState().canDescend(31)).toEqual({ ok: true })
    expect(store.getState().canDescend(32)).toEqual({
      ok: false,
      reason: 'floor-out-of-reach',
    })
    const refused = store.getState().descend(32)
    expect(refused).toEqual({ ok: false, reason: 'floor-out-of-reach' })
  })

  test('the reach follows the deepest floor with no bound of its own', () => {
    const store = readyStore()
    store.setState({ deepestFloor: 400 })
    expect(store.getState().canDescend(401)).toEqual({ ok: true })
    expect(store.getState().canDescend(402)).toEqual({
      ok: false,
      reason: 'floor-out-of-reach',
    })
  })

  test.each([0, -3, 2.5, 1e20, Infinity, -Infinity, NaN])(
    'floor %s is out of reach at deepest 30',
    (floor) => {
      const store = readyStore()
      store.setState({ deepestFloor: 30 })
      const before = store.getState()
      expect(store.getState().canDescend(floor)).toEqual({
        ok: false,
        reason: 'floor-out-of-reach',
      })
      expect(store.getState().descend(floor)).toEqual({
        ok: false,
        reason: 'floor-out-of-reach',
      })
      expect(store.getState()).toBe(before)
    },
  )
})

describe('createGameStore refuses a biome list it cannot generate floors from', () => {
  test('an empty list throws', () => {
    expect(() => createGameStore({ biomes: [] })).toThrow(/biome list is empty/)
  })

  test('an empty first biome throws, even with an authored biome after it', () => {
    expect(() => createGameStore({ biomes: [EMPTY, FIRST] })).toThrow(
      /first biome .* has no content/,
    )
  })

  test('an authored first biome is enough: empty biomes after it build', () => {
    expect(() => createGameStore({ biomes: [FIRST, EMPTY] })).not.toThrow()
  })
})

describe('floorPreview never throws on a list with fewer authored biomes than the sequence', () => {
  test.each([
    ['one biome', [FIRST]],
    ['a gap in the list', [FIRST, EMPTY, SECOND]],
    ['an authored biome then empty ones', [FIRST, EMPTY, EMPTY]],
  ] as const)('%s', (_name, biomes) => {
    const store = createGameStore({ biomes })
    const authored = new Set(
      biomes.filter((b) => b.speciesPool.length > 0).map((b) => b.id),
    )
    for (const floor of [1, 10, 11, 25, 30, 31, 100, 101, 400, 1e20]) {
      const preview = store.getState().floorPreview(floor)
      expect(preview).not.toBeNull()
      expect(authored.has(preview!.biomeId)).toBe(true)
    }
    for (const floor of [0, -1, 2.5, NaN, Infinity]) {
      expect(store.getState().floorPreview(floor)).toBeNull()
    }
  })

  test('a gap is filled by the biome before it, a floor past the list by the last authored one', () => {
    const store = createGameStore({ biomes: [FIRST, EMPTY, SECOND] })
    expect(store.getState().floorPreview(15)?.biomeId).toBe(FIRST.id)
    expect(store.getState().floorPreview(25)?.biomeId).toBe(SECOND.id)
    expect(store.getState().floorPreview(95)?.biomeId).toBe(SECOND.id)
  })
})

describe('the player gem pool follows the deepest floor, up to LAST_FIXED_FLOOR', () => {
  const spellById = new Map(ALL_SPELLS.map((spell) => [spell.id, spell]))

  /** The unlock biome number of every gem the starter rolled at the given deepest floor. */
  function gemUnlocks(
    deepestFloor: number,
    seed: number,
    overrides: Parameters<typeof createGameStore>[0] = {},
  ): number[] {
    const store = createGameStore({ runSeed: seed, ...overrides })
    store.setState({ deepestFloor })
    store.getState().setSpec('sorcerer')
    const starter = [...store.getState().collection.values()][0]!
    return starter.gems.flatMap((id) =>
      id === null ? [] : [spellById.get(id)!.unlockedAtBiome],
    )
  }

  const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

  test('a one-biome list rolls from the pool of biome 1 at any depth', () => {
    for (const seed of SEEDS) {
      for (const deepest of [0, 25, 100, 150]) {
        for (const unlock of gemUnlocks(deepest, seed, { biomes: [FIRST] })) {
          expect(unlock).toBe(1)
        }
      }
    }
  })

  test('the real list reaches biome 3 spells at depth 25 (the check above is not vacuous)', () => {
    const unlocks = SEEDS.flatMap((seed) => gemUnlocks(25, seed))
    expect(Math.max(...unlocks)).toBe(3)
  })

  test('past LAST_FIXED_FLOOR the pool stops growing: deepest 150 rolls what deepest 100 rolls', () => {
    expect(LAST_FIXED_FLOOR).toBe(100)
    for (const seed of SEEDS) {
      expect(gemUnlocks(150, seed)).toEqual(gemUnlocks(LAST_FIXED_FLOOR, seed))
      expect(gemUnlocks(1e6, seed)).toEqual(gemUnlocks(LAST_FIXED_FLOOR, seed))
    }
  })

  test('the pool is that of the real biome list at every depth up to the last authored floor', () => {
    // Biome 1 to floor 10, 2 to floor 20, 3 from floor 21 on (31 and past included).
    const limit = (deepest: number) => (deepest <= 10 ? 1 : deepest <= 20 ? 2 : 3)
    for (const seed of SEEDS) {
      for (const deepest of [0, 1, 10, 11, 20, 21, 30, 31, 60, 100]) {
        for (const unlock of gemUnlocks(deepest, seed)) {
          expect(unlock).toBeLessThanOrEqual(limit(deepest))
        }
      }
    }
  })
})
