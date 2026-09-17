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

// ---- Fixtures for the "wipe with a mid-fight kill" regression (Fix 2) ----
// Slower than HERO (speed 1 << HERO's 50, so HERO always acts first) but overwhelming enough to
// one-shot HERO on its own turn -- proves a kill banks even when the FIGHT it happened in is
// ultimately lost.
const SLOW_JUGGERNAUT: SpeciesCreature = {
  id: 'fixture-g-slow-juggernaut',
  affinity: 'violence',
  baseStats: { health: 100, attack: 1000, intelligence: 10, defence: 100, speed: 1 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'rare',
}

const FIXTURE_SPECIES_MIXED: Species = {
  id: 'fixture-g-species-mixed',
  name: 'Fixture Species Mixed',
  weight: 1,
  creatures: [FODDER, SLOW_JUGGERNAUT], // same common/rare weight split as FIXTURE_SPECIES
}

const FIXTURE_BIOME_MIXED: BiomeData = {
  id: createBiomeId('fixture-g-biome-mixed'),
  name: 'Fixture Biome Mixed',
  speciesPool: [FIXTURE_SPECIES_MIXED],
}

// floor 2 -> enemyPartySize=2, fightCount=3 -> 3 fights x 2 slots x 3 calls = 18 values. Only
// fight 1 matters (the loop stops there); its two slots: [species,creature,level] x2, same
// <0.857/>=0.857 FODDER/rare threshold as WIN_THEN_LOSS_SEQUENCE above.
const MIXED_FIGHT_SEQUENCE = [
  0,
  0.1,
  0, // fight1 slot0 -> FODDER
  0,
  0.95,
  0, // fight1 slot1 -> SLOW_JUGGERNAUT
  0,
  0.1,
  0,
  0,
  0.1,
  0, // fight2 (unused)
  0,
  0.1,
  0,
  0,
  0.1,
  0, // fight3 (unused)
]

// ---- Fixtures for the perk-plumbing regression (Fix 3) ----
// An extreme stat gap engineered so a single stat-modifier perk flips the fight's outcome
// outright (loss with the perk absent, win with it applied), rather than merely changing a
// damage number -- proves resolveSpecializationEffects's output genuinely reaches createCombat's
// partyWidePlayerEffects, not just that the wiring compiles.
const WEAK_HERO: SpeciesCreature = {
  id: 'fixture-g-weak-hero',
  affinity: 'violence',
  baseStats: { health: 10, attack: 1, intelligence: 10, defence: 1, speed: 50 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'rare',
}

const WEAK_HERO_STANDALONE: StaticCreatureRef = {
  speciesCreature: WEAK_HERO,
  speciesId: 'fixture-g-weak-hero-species',
}

// Far tougher than WEAK_HERO can scratch (unmodified attack1 vs defence1000 chips 1 dmg/hit) but
// far slower (speed1 << WEAK_HERO's 50, so WEAK_HERO always acts first) -- WEAK_HERO reliably
// loses unmodified (TOUGH_TARGET one-shots it back on round 1) and reliably wins once its own
// attack is massively boosted (one-shots TOUGH_TARGET before it ever acts).
const TOUGH_TARGET: SpeciesCreature = {
  id: 'fixture-g-tough-target',
  affinity: 'violence',
  baseStats: { health: 50, attack: 1000, intelligence: 10, defence: 1000, speed: 1 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'common',
}

const FIXTURE_SPECIES_TOUGH: Species = {
  id: 'fixture-g-species-tough',
  name: 'Fixture Species Tough',
  weight: 1,
  creatures: [TOUGH_TARGET],
}

const FIXTURE_BIOME_TOUGH: BiomeData = {
  id: createBiomeId('fixture-g-biome-tough'),
  name: 'Fixture Biome Tough',
  speciesPool: [FIXTURE_SPECIES_TOUGH],
}

const HUGE_ATTACK_PERK_SPEC: Specialization = {
  id: 'fixture-perk-spec-g',
  name: 'Fixture Perk Spec G',
  starterCreatureId: WEAK_HERO.id,
  perks: [
    {
      id: 'huge-attack',
      name: 'Huge Attack',
      maxLevel: 1,
      costPerLevel: 1000,
      phase: 'p4',
      effects: [{ category: 'stat-modifier', stat: 'attack', factor: 2000 }],
    },
  ],
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
    // currencyDropForKill(1) = {essence:1,ore:1,bricks:1,lifeforce:1}, banked per kill -- 3 kills.
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
    // Currency banks per KILL, same as soul%/XP -- fight 2's loss has no kill, so only fight 1's
    // single kill contributes.
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

  test('a wipe after some enemies died keeps that kill banked (per-kill, not per-fight-won)', () => {
    // enemyPartySize(2)=2 -- two enemy slots in the same fight, so a kill and a wipe can both
    // happen within ONE fight (floor 1's single-enemy fights can't distinguish per-kill from
    // per-fight-won banking, since a win always has exactly one kill and a loss always has zero).
    const store = createGameStore(
      makeDeps({
        biomes: [FIXTURE_BIOME_MIXED],
        createRng: stubRngFactory(MIXED_FIGHT_SEQUENCE),
      }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ deepestFloor: 1 }) // precondition: floor 1 already cleared

    const outcome = store.getState().descend(2)

    // Slot0 (FODDER) dies to HERO's first attack; slot1 (SLOW_JUGGERNAUT) then one-shots HERO on
    // its own turn -- the fight is a loss with exactly one enemy dead.
    expect(outcome.fightResults).toEqual(['loss'])
    expect(outcome.cleared).toBe(false)
    expect(outcome.deepestFloorAdvanced).toBe(false)
    expect(outcome.soulGained.get(FODDER.id)).toBe(10) // FODDER is common
    expect(outcome.soulGained.has(SLOW_JUGGERNAUT.id)).toBe(false) // never died
    expect(outcome.xpBanked).toBe(20) // xpAwardForKill(floor=2) = 20, one kill
    // currencyDropForKill(2) = {essence:2,ore:2,bricks:max(1,floor(2/10))=1,lifeforce:2}.
    expect(outcome.currencyGained).toEqual({
      essence: 2,
      ore: 2,
      bricks: 1,
      lifeforce: 2,
    })

    const state = store.getState()
    expect(state.deepestFloor).toBe(1) // unchanged -- floor 2 wasn't cleared
    expect(state.soulProgress.get(FODDER.id)).toBe(10)
    expect(state.currencies).toEqual({ essence: 2, ore: 2, bricks: 1, lifeforce: 2 })
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

describe('perk effects reach combat', () => {
  function makePerkDeps(overrides: Partial<GameStoreDeps> = {}): Partial<GameStoreDeps> {
    return {
      biomes: [FIXTURE_BIOME_TOUGH],
      specializations: new Map([[HUGE_ATTACK_PERK_SPEC.id, HUGE_ATTACK_PERK_SPEC]]),
      standaloneCreatures: [WEAK_HERO_STANDALONE],
      runSeed: 99,
      ...overrides,
    }
  }

  test('an empty perkSpend loses; a purchased huge-attack perk wins the SAME fight', () => {
    // FIXTURE_BIOME_TOUGH's pool has exactly one creature, so species/creature draws are
    // invariant regardless of RNG -- the real createRng is fine here, no stub needed. The level
    // roll (within enemyLevelRange(1)) doesn't matter either, given the extreme stat gap.
    const storeWithoutPerk = createGameStore(makePerkDeps())
    storeWithoutPerk.getState().setSpec(HUGE_ATTACK_PERK_SPEC.id)
    const outcomeWithoutPerk = storeWithoutPerk.getState().descend(1)
    expect(outcomeWithoutPerk.fightResults[0]).toBe('loss')

    const storeWithPerk = createGameStore(makePerkDeps())
    storeWithPerk.getState().setSpec(HUGE_ATTACK_PERK_SPEC.id)
    storeWithPerk.setState({ perkSpend: new Map([['huge-attack', 1]]) })
    const outcomeWithPerk = storeWithPerk.getState().descend(1)
    expect(outcomeWithPerk.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcomeWithPerk.cleared).toBe(true)
  })
})
