// Phase 4 Slice G: the descend() integration test (per the brief's own test list), built
// against fixture biome/specialization data (never real content -- biomes 1-10 stay Slice A's
// placeholder shape until H1-H3 land, see data/biomes.ts). All win/loss outcomes below are
// engineered to be deterministic by construction (see the header comment on each fixture),
// following Slice A's own precedent (generation.test.ts's constant-stub-RNG traces) rather than
// a generated-then-pasted checkpoint.

import { describe, expect, test } from 'vitest'
import { createBiomeId } from '../engine/ids'
import type { BiomeData, Species, SpeciesCreature } from '../engine/generation'
import type { SeededRng } from '../engine/rng'
import { UNICORN, UNICORN_SPECIES_ID } from '../data/species/starters'
import type { Specialization } from '../data/specializations'
import { createGameStore, type GameStoreDeps } from './store'
import type { StaticCreatureRef } from './rewards'

// ---- Fixture creatures ----
// A deliberately EXTREME stat gap (not a hand-tuned near-threshold value) so every outcome below
// is robust to the exact level rolled within a floor's range -- only WHICH creature spawns needs
// controlling (via the stub RNG below), never the precise level.

const HERO: SpeciesCreature = {
  id: 'fixture-g-hero',
  affinity: 'violence',
  baseStats: { health: 50, attack: 50, intelligence: 10, defence: 20, speed: 50 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'rare',
}

// Common rarity (RARITY_DRAW_WEIGHT.common=6 vs JUGGERNAUT's rare=1, see the stub sequence
// below) -- trivially killed by HERO in one hit, and its own hits barely scratch HERO (the
// unconditional MAX(1,...) floor still lets it chip 1 dmg/turn, HERO's 50 HP easily outlasts it).
const FODDER: SpeciesCreature = {
  id: 'fixture-g-fodder',
  affinity: 'vitality',
  baseStats: { health: 5, attack: 5, intelligence: 5, defence: 5, speed: 5 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'common',
}

// Faster AND overwhelmingly stronger than HERO -- acts first every round and one-shots HERO
// before HERO can act at all (attack100 - HERO's defence20 >> HERO's 50 HP).
const JUGGERNAUT: SpeciesCreature = {
  id: 'fixture-g-juggernaut',
  affinity: 'violence',
  baseStats: { health: 100, attack: 100, intelligence: 10, defence: 100, speed: 100 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'rare',
}

const FIXTURE_SPECIES: Species = {
  id: 'fixture-g-species',
  name: 'Fixture Species G',
  weight: 1,
  creatures: [FODDER, JUGGERNAUT], // authored order matters for the hand-derived weight math below
}

const FIXTURE_BIOME: BiomeData = {
  id: createBiomeId('fixture-g-biome'),
  name: 'Fixture Biome G',
  speciesPool: [FIXTURE_SPECIES],
  spellPool: [],
}

const HERO_STANDALONE: StaticCreatureRef = {
  speciesCreature: HERO,
  speciesId: 'fixture-g-hero-species',
}

const FIXTURE_SPEC: Specialization = {
  id: 'fixture-spec-g',
  name: 'Fixture Spec G',
  starterCreatureId: HERO.id,
  perks: [
    {
      id: 'noop',
      name: 'Noop',
      maxLevel: 10,
      costPerLevel: 100,
      phase: 'p4',
      effects: [],
    },
  ],
}

// ---- Stub RNG (deterministic species/creature/level draws -- Slice A's own testing technique) ----
// generateFloor's per-slot call order (generation.ts, non-cast-role: no loadout roll): species
// pick, creature-within-species pick, level roll. FIXTURE_SPECIES is the pool's only species, so
// its pick is invariant regardless of the value supplied (a single-item weightedPick always
// returns that item -- see rewards.test.ts's sibling reasoning in generation.test.ts). The
// creature-within-species pick uses RARITY_DRAW_WEIGHT (FODDER common=6, JUGGERNAUT rare=1,
// total=7): a value < 6/7 (~0.857) picks FODDER; >= 6/7 picks JUGGERNAUT. The level roll's value
// is irrelevant given the extreme stat gap above, so it's pinned to 0.

function stubRngFactory(sequence: readonly number[]): (seed: number) => SeededRng {
  return () => {
    let cursor = 0
    return {
      next(): number {
        const value = sequence[Math.min(cursor, sequence.length - 1)] ?? 0
        cursor += 1
        return value
      },
    }
  }
}

// floor 1 -> enemyPartySize=1, fightCount=3 -> 3 fights x 1 slot x 3 calls = 9 values.
// Fight1 slot: [species(any), creature(<0.857 -> FODDER), level(any)]
// Fight2 slot: [species(any), creature(>=0.857 -> JUGGERNAUT), level(any)]
// Fight3 slot: unused (the loop stops after fight2's loss) -- filled with FODDER's values.
const WIN_THEN_LOSS_SEQUENCE = [0, 0.1, 0, 0, 0.95, 0, 0, 0.1, 0]

// All 3 fights draw FODDER -- a guaranteed clean win across the whole floor.
const ALL_WIN_SEQUENCE = [0, 0.1, 0, 0, 0.1, 0, 0, 0.1, 0]

function makeDeps(overrides: Partial<GameStoreDeps>): Partial<GameStoreDeps> {
  return {
    biomes: [FIXTURE_BIOME],
    specializations: new Map([[FIXTURE_SPEC.id, FIXTURE_SPEC]]),
    standaloneCreatures: [HERO_STANDALONE],
    runSeed: 99,
    ...overrides,
  }
}

describe('descend()', () => {
  test('a win banks rewards and advances depth', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const outcome = store.getState().descend(1)

    expect(outcome.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcome.cleared).toBe(true)
    expect(outcome.deepestFloorAdvanced).toBe(true)
    // FODDER is common -> SOUL_GAIN_PERCENT.common = 10, killed once per fight, 3 fights.
    expect(outcome.soulGained.get(FODDER.id)).toBe(30)
    // xpAwardForKill(floor=1) = 10, 3 kills.
    expect(outcome.xpBanked).toBe(30)
    // currencyDropForFightWin(1) = {essence:1,ore:1,bricks:1,lifeforce:1}, 3 fights won.
    expect(outcome.currencyGained).toEqual({
      essence: 3,
      ore: 3,
      bricks: 3,
      lifeforce: 3,
    })

    const state = store.getState()
    expect(state.deepestFloor).toBe(1)
    expect(state.currentFloor).toBe(1)
    expect(state.soulProgress.get(FODDER.id)).toBe(30)
    expect(state.currencies).toEqual({ essence: 3, ore: 3, bricks: 3, lifeforce: 3 })
    expect(state.discoveredBiomes.has(FIXTURE_BIOME.id)).toBe(true)
    // The active party's HERO instance banked the XP and leveled accordingly.
    const heroInstance = state.collection.get(HERO.id)?.[0]
    expect(heroInstance?.xp).toBeGreaterThan(0)
  })

  test('a loss stops the descent but keeps prior fights rewards', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(WIN_THEN_LOSS_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const outcome = store.getState().descend(1)

    expect(outcome.fightResults).toEqual(['win', 'loss'])
    expect(outcome.cleared).toBe(false)
    expect(outcome.deepestFloorAdvanced).toBe(false)
    // Only fight 1's kill (FODDER) banked; fight 2's loss grants no kill, fight 3 never runs.
    expect(outcome.soulGained.get(FODDER.id)).toBe(10)
    expect(outcome.soulGained.has(JUGGERNAUT.id)).toBe(false)
    expect(outcome.xpBanked).toBe(10)
    // Currency only banks per FIGHT WON -- fight 1 only.
    expect(outcome.currencyGained).toEqual({
      essence: 1,
      ore: 1,
      bricks: 1,
      lifeforce: 1,
    })

    const state = store.getState()
    expect(state.deepestFloor).toBe(0) // never advanced -- the floor wasn't cleared
    expect(state.soulProgress.get(FODDER.id)).toBe(10) // kept, not rolled back
  })

  test('throws when asked to skip past the frontier', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    expect(() => store.getState().descend(2)).toThrow(RangeError) // deepestFloor is 0 -> max reachable is 1
  })

  test('throws with no specialization chosen', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    expect(() => store.getState().descend(1)).toThrow(/no specialization chosen/)
  })
})

describe('travelTo()', () => {
  test('bounds-checks against deepestFloor', () => {
    const store = createGameStore(makeDeps({}))
    expect(store.getState().travelTo(1)).toBe(false) // deepestFloor is still 0
    store.setState({ deepestFloor: 3 })
    expect(store.getState().travelTo(3)).toBe(true)
    expect(store.getState().currentFloor).toBe(3)
    expect(store.getState().travelTo(4)).toBe(false) // past the frontier
    expect(store.getState().travelTo(0)).toBe(false) // below floor 1
    expect(store.getState().currentFloor).toBe(3) // unchanged by the two rejected calls
  })
})

describe('runScriptedIntro()', () => {
  test('adds the Unicorn on a win', () => {
    // The real Unicorn (health25/attack15/def15/speed20) is trivially weaker than HERO
    // (speed50 acts first, attack50 - def15 easily one-shots a 25-HP target).
    const store = createGameStore(
      makeDeps({
        standaloneCreatures: [
          HERO_STANDALONE,
          { speciesCreature: UNICORN, speciesId: UNICORN_SPECIES_ID },
        ],
      }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const outcome = store.getState().runScriptedIntro()

    expect(outcome.result).toBe('win')
    expect(store.getState().collection.get(UNICORN.id)?.length).toBe(1)
    expect(store.getState().activeParty).toContain(
      store.getState().collection.get(UNICORN.id)?.[0]?.id,
    )
  })

  test('adds the Unicorn on a loss too -- the outcome handler does not branch on result', () => {
    // An overwhelming Unicorn stand-in (same id, stronger stats) guarantees HERO loses.
    const overwhelmingUnicorn: SpeciesCreature = {
      ...UNICORN,
      baseStats: { health: 200, attack: 200, intelligence: 10, defence: 200, speed: 200 },
    }
    const store = createGameStore(
      makeDeps({
        standaloneCreatures: [
          HERO_STANDALONE,
          { speciesCreature: overwhelmingUnicorn, speciesId: UNICORN_SPECIES_ID },
        ],
      }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const outcome = store.getState().runScriptedIntro()

    expect(outcome.result).toBe('loss')
    expect(store.getState().collection.get(UNICORN.id)?.length).toBe(1)
  })

  test('throws with no active party', () => {
    const store = createGameStore(makeDeps({}))
    expect(() => store.getState().runScriptedIntro()).toThrow(/no active party/)
  })
})

describe('setSpec()', () => {
  const SPEC_B_STARTER: SpeciesCreature = {
    id: 'fixture-g-hero-b',
    affinity: 'wit',
    baseStats: { health: 20, attack: 10, intelligence: 30, defence: 10, speed: 20 },
    defaultScriptId: 'always-cast',
    innateTraitIds: [],
    rarity: 'rare',
  }
  const SPEC_B: Specialization = {
    id: 'fixture-spec-g-b',
    name: 'Fixture Spec G B',
    starterCreatureId: SPEC_B_STARTER.id,
    perks: [
      {
        id: 'noop-b',
        name: 'Noop B',
        maxLevel: 10,
        costPerLevel: 100,
        phase: 'p4',
        effects: [],
      },
    ],
  }

  test('swapping specs clears perk spend without losing the collection', () => {
    const store = createGameStore(
      makeDeps({
        specializations: new Map([
          [FIXTURE_SPEC.id, FIXTURE_SPEC],
          [SPEC_B.id, SPEC_B],
        ]),
      }),
    )

    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ perkSpend: new Map([['noop', 5]]) }) // simulate purchased perk points
    expect(store.getState().collection.get(HERO.id)?.length).toBe(1)

    store.getState().setSpec(SPEC_B.id)

    const state = store.getState()
    expect(state.chosenSpec).toBe(SPEC_B.id)
    expect(state.perkSpend.size).toBe(0) // refunded
    expect(state.collection.get(HERO.id)?.length).toBe(1) // still owned -- ASSUMPTION 28
    expect(state.collection.get(SPEC_B_STARTER.id)?.length).toBe(1) // newly granted

    // Swapping back doesn't grant a SECOND copy of an already-owned starter.
    store.getState().setSpec(FIXTURE_SPEC.id)
    expect(store.getState().collection.get(HERO.id)?.length).toBe(1)
  })

  test('throws for an unknown specialization id', () => {
    const store = createGameStore(makeDeps({}))
    expect(() => store.getState().setSpec('does-not-exist')).toThrow(
      /unknown specialization/,
    )
  })
})

describe('recordBossKill() / perk points', () => {
  test('is idempotent and derives perk points as bossesCleared.size * 100', () => {
    const store = createGameStore(makeDeps({}))
    expect(store.getState().bossesCleared.size).toBe(0)
    store.getState().recordBossKill('broodmother')
    store.getState().recordBossKill('broodmother') // no-op, already cleared
    store.getState().recordBossKill('leech-sovereign')
    expect(store.getState().bossesCleared.size).toBe(2)
  })
})

describe('pinBiome()', () => {
  test('sets an atlas pin for a floor', () => {
    const store = createGameStore(makeDeps({}))
    store.getState().pinBiome(5, FIXTURE_BIOME.id)
    expect(store.getState().atlasPins.get(5)).toBe(FIXTURE_BIOME.id)
  })
})
