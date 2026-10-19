// The scripted intro's enemy Unicorn rolls its gems by the enemy rule, from biome 1's spells, on a
// stream of its own: `createRng(hashIntroUnicornDraw(runSeed))`. Real content throughout.
//
// The two seeds below are hand-derived for run seed 1 (all arithmetic mod 2^32):
//
//   intro stream = (imul(1, 0x7feb352d) ^ imul(1, 0x846ca68b)) >>> 0
//                = 0x7feb352d ^ 0x846ca68b
//                  7f^84 = fb, eb^6c = 87, 35^a6 = 93, 2d^8b = a6          = 0xfb8793a6
//
//   the Unicorn's stored set (the grant, ordinal 1: the Brute starter took ordinal 0)
//                = (imul(1, 0x2545f491) ^ imul(1 + 1, 0x9e3779b9)) >>> 0
//                  imul(2, 0x9e3779b9) = 0x13c6ef372 mod 2^32               = 0x3c6ef372
//                  25^3c = 19, 45^6e = 2b, f4^f3 = 07, 91^72 = e3           = 0x192b07e3

import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { CreateCombatInput } from '../engine/combat'
import { createSeededRng } from '../engine/rng'
import type { CombatEvent } from '../engine/types'
import { ALL_SPELLS } from '../data/spells'
import { createGameStore } from './store'

const combatInputs: CreateCombatInput[] = []

vi.mock('../engine/combat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/combat')>()
  return {
    ...actual,
    createCombat: (input: CreateCombatInput) => {
      combatInputs.push(input)
      return actual.createCombat(input)
    },
  }
})

beforeEach(() => {
  combatInputs.length = 0
})

const INTRO_STREAM_SEED_1 = 0xfb8793a6
const UNICORN_GEM_STREAM_SEED_1 = 0x192b07e3

/** A store whose RNG factory records every seed it is asked for. */
function recordingStore(runSeed: number) {
  const requests: number[] = []
  const store = createGameStore({
    runSeed,
    createRng: (seed) => {
      requests.push(seed)
      return createSeededRng(seed)
    },
  })
  return { store, requests }
}

/** The ids of the intro's enemy Unicorn's gem slots, as the combat was given them. */
function enemyUnicornGems(): (string | null)[] {
  const input = combatInputs[combatInputs.length - 1]!
  const enemy = input.enemy.party[0]!
  return enemy.equippedSpells.map((spell) => spell?.id ?? null)
}

describe('the intro Unicorn: RNG requests', () => {
  test('a first intro asks for the enemy roll, then the joining Unicorn’s stored set', () => {
    const { store, requests } = recordingStore(1)
    store.getState().newGame({ seed: 1 })
    store.getState().setSpec('brute')
    expect(store.getState().nextInstanceOrdinal).toBe(1)
    requests.length = 0

    store.getState().runScriptedIntro()

    expect(requests).toEqual([INTRO_STREAM_SEED_1, UNICORN_GEM_STREAM_SEED_1])
    expect(INTRO_STREAM_SEED_1).not.toBe(UNICORN_GEM_STREAM_SEED_1)
  })

  test('with the Unicorn already owned the intro asks for the enemy roll only', () => {
    const { store, requests } = recordingStore(1)
    store.getState().startGame({ seed: 1, specId: 'brute' })
    const before = store.getState()
    requests.length = 0

    store.getState().runScriptedIntro()

    expect(requests).toEqual([INTRO_STREAM_SEED_1])
    expect(store.getState().collection.size).toBe(before.collection.size)
  })

  test('the run counter advances by exactly one, whatever the roll', () => {
    const { store } = recordingStore(1)
    store.getState().newGame({ seed: 1 })
    store.getState().setSpec('brute')
    const before = store.getState().runCounter
    store.getState().runScriptedIntro()
    expect(store.getState().runCounter).toBe(before + 1)
  })
})

describe('the intro Unicorn: its set is biome 1’s, by the enemy rule', () => {
  const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1)
  const BIOME_ONE_VITALITY = ['life-siphon', 'regrowth', 'wild-vigor']

  function introGems(seed: number, runCounter = 0): (string | null)[] {
    const store = createGameStore({ runSeed: seed })
    store.getState().newGame({ seed })
    store.getState().setSpec('brute')
    if (runCounter !== 0) store.setState({ runCounter })
    store.getState().runScriptedIntro()
    return enemyUnicornGems()
  }

  test('biome 1’s Vitality pool is exactly the three spells the rest of this block assumes', () => {
    const pool = ALL_SPELLS.filter(
      (spell) => spell.affinity === 'vitality' && spell.unlockedAtBiome <= 1,
    ).map((spell) => spell.id)
    expect(pool.sort()).toEqual(BIOME_ONE_VITALITY)
    // Biomes 2 and 3 add Vitality spells, so a deeper roll would show them.
    expect(
      ALL_SPELLS.some(
        (spell) => spell.affinity === 'vitality' && spell.unlockedAtBiome > 1,
      ),
    ).toBe(true)
  })

  test('over 24 seeds the enemy Unicorn holds exactly those three, one per slot', () => {
    const sets = SEEDS.map((seed) => introGems(seed))
    for (const gems of sets) {
      expect(gems).toHaveLength(3)
      expect([...gems].sort()).toEqual(BIOME_ONE_VITALITY)
    }
  })

  test('the slot order is rolled: at least two seeds order them differently', () => {
    const orders = new Set(SEEDS.map((seed) => introGems(seed).join(',')))
    expect(orders.size).toBeGreaterThan(1)
  })

  test('the same seed gives the same slots, whatever the run counter says', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      expect(introGems(seed, 7)).toEqual(introGems(seed))
    }
  })
})

describe('the intro Unicorn casts', () => {
  test('a Pacified Unicorn casts a gem instead of waiting', () => {
    const store = createGameStore({ runSeed: 3 })
    store.getState().newGame({ seed: 3 })
    store.getState().setSpec('sorcerer')
    // The Sorcerer's starter holds Pacify, and goes first.
    store.setState((s) => {
      const collection = new Map(s.collection)
      for (const [id, instance] of collection) {
        collection.set(id, { ...instance, gems: ['pacify', null, null] })
      }
      return { collection }
    })

    const { events } = store.getState().runScriptedIntro()

    const input = combatInputs[combatInputs.length - 1]!
    const unicornId = input.enemy.party[0]!.id
    const pacified = events.findIndex(
      (event: CombatEvent) =>
        event.type === 'StatusApplied' &&
        event.targetId === unicornId &&
        event.statusId === 'pacified',
    )
    expect(pacified).toBeGreaterThan(-1)
    const castAfter = events
      .slice(pacified)
      .some((event) => event.type === 'SpellCast' && event.casterId === unicornId)
    expect(castAfter).toBe(true)
  })
})
