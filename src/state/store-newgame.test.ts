// Phase 4.1-G2 (§6, ASSUMPTION 87): `newGame({ seed })` resets EVERYTHING and is deterministic: two
// `newGame` calls with the same seed give deep-equal states, and the same follow-up play from
// either gives the same game. Each field of the reset has its own test, so a field dropped from
// the reset fails by name.

import { describe, expect, test } from 'vitest'
import { createSeededRng } from '../engine/rng'
import { BIOMES } from '../data/biomes'
import { createGameStore, type GameState } from './store'

/** The data fields of the state (no actions), for deep comparison. */
function data(state: GameState): GameState {
  const {
    deepestFloor,
    lastFloor,
    discoveredBiomes,
    atlasPins,
    collection,
    activeParty,
    soulProgress,
    chosenSpec,
    perkSpend,
    bossesCleared,
    currencies,
    runSeed,
    runCounter,
    nextInstanceOrdinal,
  } = state
  return {
    deepestFloor,
    lastFloor,
    discoveredBiomes,
    atlasPins,
    collection,
    activeParty,
    soulProgress,
    chosenSpec,
    perkSpend,
    bossesCleared,
    currencies,
    runSeed,
    runCounter,
    nextInstanceOrdinal,
  }
}

const CREATURE = BIOMES[0]!.speciesPool[0]!.creatures[0]!

/** A store in which EVERY field is away from its initial value. */
function playedStore() {
  const store = createGameStore({ runSeed: 555 })
  const s = store.getState()
  s.setSpec('brute')
  s.runScriptedIntro()
  const cleared = store.getState().descend(1)
  if (!cleared.ok) throw new Error('descend failed')
  store.getState().recordBossKill('boss-0')
  store.getState().setPerkLevel('might', 5)
  store.getState().pinBiome(15, BIOMES[1]!.id)
  store.setState({ soulProgress: new Map([[CREATURE.id, 100]]), deepestFloor: 4 })
  store.getState().summon(CREATURE.id)
  return store
}

const FIELDS = [
  'deepestFloor',
  'lastFloor',
  'discoveredBiomes',
  'atlasPins',
  'collection',
  'activeParty',
  'soulProgress',
  'chosenSpec',
  'perkSpend',
  'bossesCleared',
  'currencies',
  'runSeed',
  'runCounter',
  'nextInstanceOrdinal',
] as const

describe('newGame()', () => {
  test('the played store really has every field away from fresh (the reset test is not vacuous)', () => {
    const played = data(playedStore().getState())
    const fresh = data(createGameStore({ runSeed: 7 }).getState())
    for (const field of FIELDS) {
      expect(played[field], field).not.toEqual(fresh[field])
    }
  })

  test.each(FIELDS)('resets %s to its fresh value', (field) => {
    const store = playedStore()
    store.getState().newGame({ seed: 7 })
    const fresh = data(createGameStore({ runSeed: 7 }).getState())
    expect(data(store.getState())[field]).toEqual(fresh[field])
  })

  // Every other test here compares against `createGameStore`, which builds its state with the same
  // `freshState` as the reset, so a wrong value inside `freshState` would pass them all. This one
  // pins the fresh state to a literal.
  test('the fresh state is exactly this literal (initial store and after newGame)', () => {
    const literal: GameState = {
      deepestFloor: 0,
      lastFloor: 0,
      discoveredBiomes: new Set(),
      atlasPins: new Map(),
      collection: new Map(),
      activeParty: [null, null, null, null, null, null],
      soulProgress: new Map(),
      chosenSpec: null,
      perkSpend: new Map(),
      bossesCleared: new Set(),
      currencies: { essence: 0, ore: 0, bricks: 0, lifeforce: 0 },
      runSeed: 7,
      runCounter: 0,
      nextInstanceOrdinal: 0,
    }
    expect(data(createGameStore({ runSeed: 7 }).getState())).toEqual(literal)
    const played = playedStore()
    played.getState().newGame({ seed: 7 })
    expect(data(played.getState())).toEqual(literal)
  })

  test('the whole state after newGame equals a fresh store seeded the same', () => {
    const store = playedStore()
    store.getState().newGame({ seed: 7 })
    expect(data(store.getState())).toEqual(
      data(createGameStore({ runSeed: 7 }).getState()),
    )
  })

  test('state.runSeed takes the new seed; deps.runSeed only seeds a fresh store', () => {
    const store = createGameStore({ runSeed: 3 })
    expect(store.getState().runSeed).toBe(3)
    store.getState().newGame({ seed: 4_000_000_000 })
    expect(store.getState().runSeed).toBe(4_000_000_000)
  })

  test('two newGame calls with the same seed give deep-equal states', () => {
    const a = playedStore()
    const b = createGameStore()
    b.getState().setSpec('shieldbarer') // a different history entirely
    a.getState().newGame({ seed: 12345 })
    b.getState().newGame({ seed: 12345 })
    expect(data(a.getState())).toEqual(data(b.getState()))
  })

  test('the same follow-up play after the same seed gives the same game, events included', () => {
    function play(store: ReturnType<typeof createGameStore>) {
      store.getState().newGame({ seed: 99 })
      store.getState().setSpec('sorcerer')
      store.getState().runScriptedIntro()
      const result = store.getState().descend(1)
      if (!result.ok) throw new Error('descend failed')
      store.setState({ soulProgress: new Map([[CREATURE.id, 100]]) })
      store.getState().summon(CREATURE.id)
      return result.outcome
    }
    const a = playedStore()
    const b = createGameStore()
    const outcomeA = play(a)
    const outcomeB = play(b)
    expect(outcomeA.events).toEqual(outcomeB.events)
    expect(data(a.getState())).toEqual(data(b.getState()))
  })

  test('the gem roll restarts from the new seed and ordinal 0', () => {
    const seeds: number[] = []
    const store = createGameStore({
      createRng: (seed) => {
        seeds.push(seed)
        return createSeededRng(seed)
      },
    })
    store.getState().setSpec('brute')
    const first = store.getState().collection.get(store.getState().activeParty[0]!)!.gems
    store.getState().newGame({ seed: 0 })
    seeds.length = 0
    store.getState().setSpec('brute')
    const again = store.getState().collection.get(store.getState().activeParty[0]!)!.gems
    expect(seeds).toHaveLength(1)
    // Seed 0 vs the default seed: a fresh game is a different game, but replaying seed 0 is not.
    store.getState().newGame({ seed: 0 })
    store.getState().setSpec('brute')
    expect(
      store.getState().collection.get(store.getState().activeParty[0]!)!.gems,
    ).toEqual(again)
    expect(first).toHaveLength(3)
  })

  test('the seed must be an integer in 0 .. 2^32 - 1 (ASSUMPTION 87)', () => {
    const store = createGameStore()
    for (const seed of [
      -1,
      4294967296,
      2 ** 40,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => store.getState().newGame({ seed }), String(seed)).toThrow(/seed/)
    }
    for (const seed of [0, 1, 4294967295]) {
      expect(() => store.getState().newGame({ seed }), String(seed)).not.toThrow()
    }
  })

  test('a rejected seed leaves the played game untouched', () => {
    const store = playedStore()
    const before = store.getState()
    expect(() => store.getState().newGame({ seed: -1 })).toThrow()
    expect(store.getState()).toBe(before)
  })
})
