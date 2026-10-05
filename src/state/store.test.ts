// Phase 4 Slice G: the descend() integration test (per the brief's own test list), built
// against fixture biome/specialization data -- real content is integration.test.ts's own
// deliberate exception (see its header comment), never this file's. All win/loss outcomes below
// are engineered to be deterministic by construction (see the header comment on each fixture),
// following Slice A's own precedent (generation.test.ts's constant-stub-RNG traces) rather than
// a generated-then-pasted checkpoint.
//
// Reworked Phase 4.1-A (G5, S5, G6, A6, A7): descend()/pinBiome() return `{ ok, ... }` instead of
// throwing/returning directly; `travelTo` is deleted (G6); the collection is a flat
// `Map<InstanceId, Instance>` (A6); every fixture pins `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` so
// every non-XP number below stays byte-identical to Phase 4 (ASSUMPTION 3) -- only the XP
// expectations changed, each noted inline.
//
// Phase 4.1-G1: the fixture creatures run the `always-*` fixture scripts (ASSUMPTION 68), so every
// deps object below passes `scripts: FIXTURE_SCRIPTS_BY_ID` -- the shipped registry holds only the
// role scripts. Each spawned enemy also draws a full gem set (6 stub draws per spawn, `spawn()`).

import { describe, expect, test } from 'vitest'
import { createBiomeId, type BiomeId } from '../engine/ids'
import type {
  BiomeData,
  BossEncounter,
  Species,
  SpeciesCreature,
} from '../engine/generation'
import type { SeededRng } from '../engine/rng'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from '../engine/__fixtures__/balance'
import { FIXTURE_SCRIPTS_BY_ID } from '../engine/__fixtures__/scripts'
import { enemyLevelRange } from '../engine/curves'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { UNICORN, UNICORN_SPECIES_ID } from '../data/species/starters'
import type { Specialization } from '../data/specializations'
import {
  createGameStore,
  type DescendFailureReason,
  type GameStoreDeps,
  type PinBiomeFailureReason,
} from './store'
import type { StaticCreatureRef, Instance } from './rewards'
import type { InstanceId } from './ids'

// ---- Test helpers ----

/** Narrows a `{ ok: true, ... } | { ok: false, ... }` result, failing the test with the reason
 * (or full payload) when it isn't the branch expected -- avoids a repeated manual `if (!r.ok)
 * throw` at every call site. */
function expectOk<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected { ok: true }, got ${JSON.stringify(result)}`)
  }
  return result as Extract<T, { ok: true }>
}

function expectFailure<T extends { ok: boolean }>(result: T): Extract<T, { ok: false }> {
  if (result.ok) {
    throw new Error(`expected { ok: false }, got ${JSON.stringify(result)}`)
  }
  return result as Extract<T, { ok: false }>
}

/** The collection is now a flat `Map<InstanceId, Instance>` (Phase 4.1-A, A6) -- this scans it
 * for the (at most one, per grantCreatureIfUnowned's own no-duplicate rule) Instance sourced from
 * a given static creatureId, mirroring what the old `collection.get(creatureId)` bucket lookup
 * used to answer directly. */
function instanceFor(
  collection: ReadonlyMap<InstanceId, Instance>,
  creatureId: string,
): Instance | undefined {
  return [...collection.values()].find(
    (inst) => inst.source.kind === 'creature' && inst.source.creatureId === creatureId,
  )
}

// ---- Fixture creatures ----
// A deliberately EXTREME stat gap (not a hand-tuned near-threshold value) so every outcome below
// is robust to the exact level rolled within a floor's range -- only WHICH creature spawns needs
// controlling (via the stub RNG below), never the precise level.

const HERO: SpeciesCreature = {
  id: 'fixture-g-hero',
  name: 'Fixture Hero',
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
  name: 'Fixture Fodder',
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
  name: 'Fixture Juggernaut',
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

      effects: [],
    },
  ],
}

// ---- Stub RNG (deterministic species/creature/level draws -- Slice A's own testing technique) ----
// generateFloor's per-slot call order (generation.ts, `spawnEnemy`): species pick,
// creature-within-species pick, level roll, then (Phase 4.1-G1: every enemy rolls a full gem set,
// whatever its role) one loadout draw per gem slot -- 6 draws per spawned enemy. FIXTURE_SPECIES is the pool's only species, so
// its pick is invariant regardless of the value supplied (a single-item weightedPick always
// returns that item -- see rewards.test.ts's sibling reasoning in generation.test.ts). The
// creature-within-species pick uses CFG.rarityDrawWeight (FODDER common=6, JUGGERNAUT rare=1,
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

// One spawned enemy: [species(any), creature(`creatureRoll`), level(any), gem x3 (any)].
const spawn = (creatureRoll: number): number[] => [0, creatureRoll, 0, 0, 0, 0]
const FODDER_ROLL = 0.1 // < 6/7 -> FODDER
const RARE_ROLL = 0.95 // >= 6/7 -> the pool's rare creature

// floor 1 -> enemyPartySize=1, fightCount(CFG)=3 -> 3 fights x 1 slot x 6 draws = 18 values.
// Fight1 slot: FODDER; fight2 slot: JUGGERNAUT; fight3 slot: unused (the loop stops after fight2's
// loss) -- filled with FODDER's values.
const WIN_THEN_LOSS_SEQUENCE = [
  ...spawn(FODDER_ROLL),
  ...spawn(RARE_ROLL),
  ...spawn(FODDER_ROLL),
]

// All 3 fights draw FODDER -- a guaranteed clean win across the whole floor.
const ALL_WIN_SEQUENCE = [
  ...spawn(FODDER_ROLL),
  ...spawn(FODDER_ROLL),
  ...spawn(FODDER_ROLL),
]

function makeDeps(overrides: Partial<GameStoreDeps>): Partial<GameStoreDeps> {
  return {
    biomes: [FIXTURE_BIOME],
    specializations: new Map([[FIXTURE_SPEC.id, FIXTURE_SPEC]]),
    standaloneCreatures: [HERO_STANDALONE],
    runSeed: 99,
    scripts: FIXTURE_SCRIPTS_BY_ID,
    balanceConfig: CFG,
    ...overrides,
  }
}

// ---- Fixtures for the "wipe with a mid-fight kill" regression (Fix 2) ----
// Slower than HERO (speed 1 << HERO's 50, so HERO always acts first) but overwhelming enough to
// one-shot HERO on its own turn -- proves a kill banks even when the FIGHT it happened in is
// ultimately lost.
const SLOW_JUGGERNAUT: SpeciesCreature = {
  id: 'fixture-g-slow-juggernaut',
  name: 'Fixture Slow Juggernaut',
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

// floor 2 -> enemyPartySize=2, fightCount(CFG)=3 -> 3 fights x 2 slots x 6 draws = 36 values. Only
// fight 1 matters (the loop stops there); its two slots, same <0.857/>=0.857 FODDER/rare
// threshold as WIN_THEN_LOSS_SEQUENCE above.
const MIXED_FIGHT_SEQUENCE = [
  ...spawn(FODDER_ROLL), // fight1 slot0 -> FODDER
  ...spawn(RARE_ROLL), // fight1 slot1 -> SLOW_JUGGERNAUT
  ...spawn(FODDER_ROLL), // fight2 (unused)
  ...spawn(FODDER_ROLL),
  ...spawn(FODDER_ROLL), // fight3 (unused)
  ...spawn(FODDER_ROLL),
]

// ---- Fixtures for the perk-plumbing regression (Fix 3) ----
// An extreme stat gap engineered so a single stat-modifier perk flips the fight's outcome
// outright (loss with the perk absent, win with it applied), rather than merely changing a
// damage number -- proves resolveSpecializationEffects's output genuinely reaches createCombat's
// partyWidePlayerEffects, not just that the wiring compiles.
const WEAK_HERO: SpeciesCreature = {
  id: 'fixture-g-weak-hero',
  name: 'Fixture Weak Hero',
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
  name: 'Fixture Tough Target',
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

    const { outcome } = expectOk(store.getState().descend(1))

    expect(outcome.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcome.cleared).toBe(true)
    expect(outcome.deepestFloorAdvanced).toBe(true)
    // FODDER is common -> CFG.soulGainPercent.common = 10, killed once per fight, 3 fights.
    expect(outcome.soulGained.get(FODDER.id)).toBe(30)
    // xpAwardForKill = the victim's own level (Phase 4.1-A, ASSUMPTION 5); CFG's flat x1.00
    // multiplier makes FODDER's level == floor == 1 for all 3 kills.
    expect(outcome.xpBanked).toBe(3)
    // currencyDropForKill(1, CFG) = {essence:1,ore:1,bricks:1,lifeforce:1}, banked per kill -- 3 kills.
    expect(outcome.currencyGained).toEqual({
      essence: 3,
      ore: 3,
      bricks: 3,
      lifeforce: 3,
    })

    const state = store.getState()
    expect(state.deepestFloor).toBe(1)
    expect(state.lastFloor).toBe(1)
    expect(state.soulProgress.get(FODDER.id)).toBe(30)
    expect(state.currencies).toEqual({ essence: 3, ore: 3, bricks: 3, lifeforce: 3 })
    expect(state.discoveredBiomes.has(FIXTURE_BIOME.id)).toBe(true)
    // The active party's HERO instance banked the XP and leveled accordingly.
    const heroInstance = instanceFor(state.collection, HERO.id)
    expect(heroInstance?.xp).toBeGreaterThan(0)
  })

  test('review fix F5: soul-gain under the DEFAULT config is exact per tier (common=25, rare=10), not just "a multiple of 10"', () => {
    // Three distinct rarity tiers in one species pool, deterministically routed by the stub RNG
    // via DEFAULT_BALANCE_CONFIG.rarityDrawWeight {common:6, uncommon:3, rare:1} (total 10,
    // authored in that order): roll = rngValue*10; common wins roll<6 (rngValue<0.6), uncommon
    // wins 6<=roll<9 (0.6<=rngValue<0.9), rare wins roll>=9 (rngValue>=0.9).
    const TIER_COMMON: SpeciesCreature = {
      id: 'fixture-tier-common',
      name: 'Fixture Tier Common',
      affinity: 'vitality',
      baseStats: { health: 5, attack: 5, intelligence: 5, defence: 5, speed: 5 },
      defaultScriptId: 'always-attack',
      innateTraitIds: [],
      rarity: 'common',
    }
    const TIER_RARE: SpeciesCreature = {
      id: 'fixture-tier-rare',
      name: 'Fixture Tier Rare',
      affinity: 'vitality',
      baseStats: { health: 5, attack: 5, intelligence: 5, defence: 5, speed: 5 },
      defaultScriptId: 'always-attack',
      innateTraitIds: [],
      rarity: 'rare',
    }
    // Overwhelming (one-shots HERO) so the descent stops after exactly 3 fights instead of
    // needing to hand-derive all 10 of the default config's fights.
    const TIER_UNCOMMON_OVERWHELMING: SpeciesCreature = {
      id: 'fixture-tier-uncommon-overwhelming',
      name: 'Fixture Tier Uncommon Overwhelming',
      affinity: 'violence',
      baseStats: {
        health: 100,
        attack: 1000,
        intelligence: 10,
        defence: 100,
        speed: 100,
      },
      defaultScriptId: 'always-attack',
      innateTraitIds: [],
      rarity: 'uncommon',
    }
    const species: Species = {
      id: 'fixture-tiers-species',
      name: 'Fixture Tiers Species',
      weight: 1,
      creatures: [TIER_COMMON, TIER_UNCOMMON_OVERWHELMING, TIER_RARE],
    }
    const biome: BiomeData = {
      id: createBiomeId('fixture-tiers-biome'),
      name: 'Fixture Tiers Biome',
      speciesPool: [species],
    }
    // fight1 creature-roll 0.1 -> common; fight2 creature-roll 0.95 -> rare; fight3 creature-roll
    // 0.7 -> the overwhelming uncommon, which one-shots HERO and stops the loop.
    const sequence = [...spawn(0.1), ...spawn(0.95), ...spawn(0.7)]
    const store = createGameStore(
      makeDeps({
        biomes: [biome],
        createRng: stubRngFactory(sequence),
        balanceConfig: DEFAULT_BALANCE_CONFIG,
      }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const { outcome } = expectOk(store.getState().descend(1))

    expect(outcome.fightResults).toEqual(['win', 'win', 'loss'])
    expect(outcome.soulGained.get(TIER_COMMON.id)).toBe(
      DEFAULT_BALANCE_CONFIG.soulGainPercent.common,
    )
    expect(outcome.soulGained.get(TIER_COMMON.id)).toBe(25)
    expect(outcome.soulGained.get(TIER_RARE.id)).toBe(
      DEFAULT_BALANCE_CONFIG.soulGainPercent.rare,
    )
    expect(outcome.soulGained.get(TIER_RARE.id)).toBe(10)
    expect(outcome.soulGained.has(TIER_UNCOMMON_OVERWHELMING.id)).toBe(false) // never died
  })

  test('a loss stops the descent but keeps prior fights rewards', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(WIN_THEN_LOSS_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const { outcome } = expectOk(store.getState().descend(1))

    expect(outcome.fightResults).toEqual(['win', 'loss'])
    expect(outcome.cleared).toBe(false)
    expect(outcome.deepestFloorAdvanced).toBe(false)
    // Only fight 1's kill (FODDER) banked; fight 2's loss grants no kill, fight 3 never runs.
    expect(outcome.soulGained.get(FODDER.id)).toBe(10)
    expect(outcome.soulGained.has(JUGGERNAUT.id)).toBe(false)
    expect(outcome.xpBanked).toBe(1) // FODDER's level (== floor 1 under CFG's flat multiplier)
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
    expect(state.lastFloor).toBe(1) // still set -- the floor WAS attempted, just not cleared
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

    const { outcome } = expectOk(store.getState().descend(2))

    // Slot0 (FODDER) dies to HERO's first attack; slot1 (SLOW_JUGGERNAUT) then one-shots HERO on
    // its own turn -- the fight is a loss with exactly one enemy dead.
    expect(outcome.fightResults).toEqual(['loss'])
    expect(outcome.cleared).toBe(false)
    expect(outcome.deepestFloorAdvanced).toBe(false)
    expect(outcome.soulGained.get(FODDER.id)).toBe(10) // FODDER is common
    expect(outcome.soulGained.has(SLOW_JUGGERNAUT.id)).toBe(false) // never died
    expect(outcome.xpBanked).toBe(2) // FODDER's level (== floor 2 under CFG's flat multiplier)
    // currencyDropForKill(2, CFG) = {essence:2,ore:2,bricks:max(1,floor(2/10))=1,lifeforce:2}.
    expect(outcome.currencyGained).toEqual({
      essence: 2,
      ore: 2,
      bricks: 1,
      lifeforce: 2,
    })

    const state = store.getState()
    expect(state.deepestFloor).toBe(1) // unchanged -- floor 2 wasn't cleared
    expect(state.lastFloor).toBe(2) // still set -- floor 2 WAS attempted
    expect(state.soulProgress.get(FODDER.id)).toBe(10)
    expect(state.currencies).toEqual({ essence: 2, ore: 2, bricks: 1, lifeforce: 2 })
  })

  test('smoke test: descend() reaches rewards through a real fight, not just resolveKillReward in isolation', () => {
    // Review fix F4: this fixture's static id doesn't actually discriminate the deleted
    // suffix-parser from the current origin.templateId lookup -- the old parser sliced exactly
    // `-${side}-${slot}` off the CreatureId BY LENGTH, so it resolved this id correctly too. The
    // real discriminating case (an id/origin pair the old parser would get WRONG) is
    // rewards.test.ts's own resolveKillReward unit test. This test's only job is to prove the
    // real descend() loop actually reaches that helper end-to-end, through a real generated
    // fight -- kept as a smoke test, not a regression test for the old bug.
    const CONFUSABLE: SpeciesCreature = {
      id: 'fixture-g-confusable-enemy-0',
      name: 'Fixture Confusable',
      affinity: 'vitality',
      baseStats: { health: 5, attack: 5, intelligence: 5, defence: 5, speed: 5 },
      defaultScriptId: 'always-attack',
      innateTraitIds: [],
      rarity: 'common',
    }
    const species: Species = {
      id: 'fixture-confusable-species',
      name: 'Fixture Confusable Species',
      weight: 1,
      creatures: [CONFUSABLE],
    }
    const biome: BiomeData = {
      id: createBiomeId('fixture-confusable-biome'),
      name: 'Fixture Confusable Biome',
      speciesPool: [species],
    }
    const store = createGameStore(
      makeDeps({ biomes: [biome], createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)

    const { outcome } = expectOk(store.getState().descend(1))

    expect(outcome.cleared).toBe(true)
    expect(outcome.soulGained.get(CONFUSABLE.id)).toBe(30) // common, 3 kills, CFG's 10%/kill
  })

  test('an instance with a custom scriptId uses it instead of the creature default (Phase 4.1-A, A6/ASSUMPTION 6)', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    const heroInstance = instanceFor(store.getState().collection, HERO.id)
    expect(heroInstance).toBeDefined()
    store.setState((s) => {
      const collection = new Map(s.collection)
      collection.set(heroInstance!.id, { ...heroInstance!, scriptId: 'always-defend' })
      return { collection }
    })

    const { outcome } = expectOk(store.getState().descend(1))

    // HERO's per-fight id is deterministic (materializeCreature's own `${id}-${side}-${slot}`);
    // it always resolves to player slot 0 here (the only party member).
    const defended = outcome.events.some(
      (e) => e.type === 'Defended' && e.creatureId === `${HERO.id}-player-0`,
    )
    expect(defended).toBe(true)
  })
})

// Phase 4.1-A review fix F3/F7: table-driven over every descend() reason -- each scenario
// asserts canDescend() AGREES with descend(), and that BOTH leave the store's state object
// completely unchanged (reference equality on the whole state, not a field-by-field spot check --
// no `set()` call may run on any refusal path).
interface DescendReasonScenario {
  readonly reason: DescendFailureReason
  readonly floor: number
  readonly setup: (store: ReturnType<typeof createGameStore>) => void
}

const DESCEND_REASON_SCENARIOS: readonly DescendReasonScenario[] = [
  {
    reason: 'no-spec',
    floor: 1,
    setup: () => {}, // a fresh store, setSpec never called
  },
  {
    reason: 'empty-party',
    floor: 1,
    setup: (store) => {
      store.getState().setSpec(FIXTURE_SPEC.id)
      store.setState((s) => ({ activeParty: s.activeParty.map(() => null) }))
    },
  },
  {
    // deepestFloor is 0 -> max reachable is 1; FIXTURE_BIOME alone gives a frontier of 10, so
    // floor 2 fails ONLY the reach check, not the frontier check.
    reason: 'floor-out-of-reach',
    floor: 2,
    setup: (store) => {
      store.getState().setSpec(FIXTURE_SPEC.id)
    },
  },
  {
    // FIXTURE_BIOME alone gives a content frontier of 10; deepestFloor 15 would otherwise make
    // floor 11 reachable (reach itself passes), but 11 > the frontier (ASSUMPTION 23: frontier
    // wins even when reach alone would have been fine).
    reason: 'beyond-content-frontier',
    floor: 11,
    setup: (store) => {
      store.getState().setSpec(FIXTURE_SPEC.id)
      store.setState({ deepestFloor: 15 })
    },
  },
]

describe('descend() / canDescend(): every refusal reason', () => {
  test.each(DESCEND_REASON_SCENARIOS)(
    '$reason: canDescend agrees with descend, and both leave state untouched',
    ({ reason, floor, setup }) => {
      const store = createGameStore(
        makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
      )
      setup(store)
      const before = store.getState()

      expect(store.getState().canDescend(floor)).toEqual({ ok: false, reason })
      const failure = expectFailure(store.getState().descend(floor))
      expect(failure.reason).toBe(reason)

      // Reference equality on the WHOLE state object: no `set()` ran on either call.
      expect(store.getState()).toBe(before)
    },
  )

  test('reason: floor-out-of-reach also covers floor 0 and negative floors', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    expect(expectFailure(store.getState().descend(0)).reason).toBe('floor-out-of-reach')
    expect(expectFailure(store.getState().descend(-1)).reason).toBe('floor-out-of-reach')
  })

  test('reason: beyond-content-frontier wins even when floor-out-of-reach ALSO fails (F3)', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    // deepestFloor stays 0 (max reachable 1) AND floor 11 is past FIXTURE_BIOME's frontier of 10
    // -- BOTH checks fail here, unlike the table's own 'beyond-content-frontier' scenario above
    // (deepestFloor 15), which only exercises the frontier check failing ALONE. Swapping
    // checkDescend's two checks would still pass that scenario; this one is what actually pins
    // the precedence (ASSUMPTION 23).
    expect(store.getState().canDescend(11)).toEqual({
      ok: false,
      reason: 'beyond-content-frontier',
    })
    expect(expectFailure(store.getState().descend(11)).reason).toBe(
      'beyond-content-frontier',
    )
  })

  test('a valid floor: canDescend agrees, and calling it changes nothing', () => {
    const store = createGameStore(
      makeDeps({ createRng: stubRngFactory(ALL_WIN_SEQUENCE) }),
    )
    store.getState().setSpec(FIXTURE_SPEC.id)
    const before = store.getState()
    expect(store.getState().canDescend(1)).toEqual({ ok: true })
    expect(store.getState()).toBe(before)

    const { outcome } = expectOk(store.getState().descend(1))
    expect(outcome.cleared).toBe(true)
  })
})

// Phase 4.1-A review fix F1/F7: a content-less biome pin must never reach descend()'s own
// generator throw -- table-driven over every pinBiome() reason, mirroring the descend() table
// above.
const EMPTY_CONTENT_BIOME: BiomeData = {
  id: createBiomeId('fixture-empty-pin-target'),
  name: 'Fixture Empty Pin Target',
  speciesPool: [],
}

interface PinBiomeReasonScenario {
  readonly reason: PinBiomeFailureReason
  readonly floor: number
  readonly biomeId: BiomeId
}

const PIN_BIOME_REASON_SCENARIOS: readonly PinBiomeReasonScenario[] = [
  { reason: 'floor-out-of-range', floor: 0, biomeId: FIXTURE_BIOME.id },
  { reason: 'unknown-biome', floor: 5, biomeId: createBiomeId('does-not-exist') },
  { reason: 'biome-has-no-content', floor: 5, biomeId: EMPTY_CONTENT_BIOME.id },
]

describe('pinBiome() / canPinBiome()', () => {
  function makePinDeps(): Partial<GameStoreDeps> {
    return makeDeps({ biomes: [FIXTURE_BIOME, EMPTY_CONTENT_BIOME] })
  }

  test('sets an atlas pin for a known, has-content floor and biome', () => {
    const store = createGameStore(makePinDeps())
    expect(store.getState().canPinBiome(5, FIXTURE_BIOME.id)).toEqual({ ok: true })
    const result = expectOk(store.getState().pinBiome(5, FIXTURE_BIOME.id))
    expect(result).toEqual({ ok: true })
    expect(store.getState().atlasPins.get(5)).toBe(FIXTURE_BIOME.id)
  })

  test.each(PIN_BIOME_REASON_SCENARIOS)(
    '$reason: canPinBiome agrees with pinBiome, and both leave state untouched',
    ({ reason, floor, biomeId }) => {
      const store = createGameStore(makePinDeps())
      const before = store.getState()

      expect(store.getState().canPinBiome(floor, biomeId)).toEqual({ ok: false, reason })
      const failure = expectFailure(store.getState().pinBiome(floor, biomeId))
      expect(failure.reason).toBe(reason)

      expect(store.getState()).toBe(before)
      expect(store.getState().atlasPins.has(floor)).toBe(false)
    },
  )

  test('review fix F1: refusing the pin closes the descend()-throws route (reproduces the review-found bug)', () => {
    // Before F1, pinBiome accepted this pin, canDescend(1) agreed it was fine, and descend(1)
    // then threw the generator's own "empty or zero-weight pool" error -- a player-reachable
    // crash through a second route beyond contentFrontier's own gate.
    const store = createGameStore(makePinDeps())
    store.getState().setSpec(FIXTURE_SPEC.id)

    const failure = expectFailure(store.getState().pinBiome(1, EMPTY_CONTENT_BIOME.id))
    expect(failure.reason).toBe('biome-has-no-content')
    expect(store.getState().atlasPins.has(1)).toBe(false)

    // Without the pin ever landing, descend(1) resolves the fixed sequence's real biome
    // (FIXTURE_BIOME, at decade index 0) instead of the empty target, and succeeds.
    expect(() => store.getState().descend(1)).not.toThrow()
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
    const state = store.getState()
    const unicornInstance = instanceFor(state.collection, UNICORN.id)
    expect(unicornInstance).toBeDefined()
    expect(state.activeParty).toContain(unicornInstance!.id)
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
    expect(instanceFor(store.getState().collection, UNICORN.id)).toBeDefined()
  })

  test('throws with no active party', () => {
    const store = createGameStore(makeDeps({}))
    expect(() => store.getState().runScriptedIntro()).toThrow(/no active party/)
  })
})

describe('setSpec()', () => {
  const SPEC_B_STARTER: SpeciesCreature = {
    id: 'fixture-g-hero-b',
    name: 'Fixture Hero B',
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
        // 4.1-G2: a granted starter now rolls gems, so it must resolve to static data.
        standaloneCreatures: [
          HERO_STANDALONE,
          { speciesCreature: SPEC_B_STARTER, speciesId: 'fixture-g-hero-b-species' },
        ],
      }),
    )

    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ perkSpend: new Map([['noop', 5]]) }) // simulate purchased perk points
    expect(instanceFor(store.getState().collection, HERO.id)).toBeDefined()

    store.getState().setSpec(SPEC_B.id)

    const state = store.getState()
    expect(state.chosenSpec).toBe(SPEC_B.id)
    expect(state.perkSpend.size).toBe(0) // refunded
    expect(instanceFor(state.collection, HERO.id)).toBeDefined() // still owned -- ASSUMPTION 28
    expect(instanceFor(state.collection, SPEC_B_STARTER.id)).toBeDefined() // newly granted

    // Swapping back doesn't grant a SECOND copy of an already-owned starter.
    store.getState().setSpec(FIXTURE_SPEC.id)
    const heroInstances = [...store.getState().collection.values()].filter(
      (inst) => inst.source.kind === 'creature' && inst.source.creatureId === HERO.id,
    )
    expect(heroInstances).toHaveLength(1)
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

describe('perk effects reach combat', () => {
  function makePerkDeps(overrides: Partial<GameStoreDeps> = {}): Partial<GameStoreDeps> {
    return {
      biomes: [FIXTURE_BIOME_TOUGH],
      specializations: new Map([[HUGE_ATTACK_PERK_SPEC.id, HUGE_ATTACK_PERK_SPEC]]),
      standaloneCreatures: [WEAK_HERO_STANDALONE],
      runSeed: 99,
      scripts: FIXTURE_SCRIPTS_BY_ID,
      balanceConfig: CFG,
      ...overrides,
    }
  }

  test('an empty perkSpend loses; a purchased huge-attack perk wins the SAME fight', () => {
    // FIXTURE_BIOME_TOUGH's pool has exactly one creature, so species/creature draws are
    // invariant regardless of RNG -- the real createRng is fine here, no stub needed. The level
    // roll (within enemyLevelRange(1)) doesn't matter either, given the extreme stat gap.
    const storeWithoutPerk = createGameStore(makePerkDeps())
    storeWithoutPerk.getState().setSpec(HUGE_ATTACK_PERK_SPEC.id)
    const { outcome: outcomeWithoutPerk } = expectOk(
      storeWithoutPerk.getState().descend(1),
    )
    expect(outcomeWithoutPerk.fightResults[0]).toBe('loss')

    const storeWithPerk = createGameStore(makePerkDeps())
    storeWithPerk.getState().setSpec(HUGE_ATTACK_PERK_SPEC.id)
    storeWithPerk.setState({ perkSpend: new Map([['huge-attack', 1]]) })
    const { outcome: outcomeWithPerk } = expectOk(storeWithPerk.getState().descend(1))
    expect(outcomeWithPerk.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcomeWithPerk.cleared).toBe(true)
  })
})

describe('boss floors (Phase 4 Slice I, PR #65 review)', () => {
  // Stat gaps here are EXTREME (matching the file's own established style, e.g. HERO vs FODDER
  // above) rather than hand-tuned near a threshold, for a reason specific to boss floors: the
  // ADD's level is a real RNG draw within enemyLevelRange(10, CFG)={min:10,max:13} (never
  // stubbed -- its single-item species pool makes the species/creature picks invariant
  // regardless of RNG, same reasoning as the perk-effects test above), so its SCALED stats
  // aren't a fixed number. The boss's own level is NOT rolled (bossLevel(10, CFG) =
  // enemyLevelRange(10,CFG).max + 3 = 16, fixed), so her scaled stats below (in comments) are
  // exact. Gaps are wide enough that every outcome is robust to whichever level the add rolls.

  const BOSS_ADD_WIN: SpeciesCreature = {
    id: 'fixture-boss-win-add',
    name: 'Fixture Boss Win Add',
    affinity: 'violence',
    // Scaled at level 10-13 (factor 3.25-4.0): health 1 -> 3 or 4, speed 5 -> 16-20 (still <<
    // HERO's 50, and << the boss's own fixed scaled health of 48 -- see below).
    baseStats: { health: 1, attack: 1, intelligence: 1, defence: 0, speed: 5 },
    defaultScriptId: 'always-wait', // never acts before dying; keeps the log minimal
    innateTraitIds: [],
    rarity: 'common', // CFG.soulGainPercent.common = 10
  }
  const BOSS_SPECIES_WIN: Species = {
    id: 'fixture-boss-win-species',
    name: 'Fixture Boss Win Species',
    weight: 1,
    creatures: [BOSS_ADD_WIN],
  }
  // Scaled at the FIXED bossLevel(10,CFG)=16 (factor 4.75): health 10 -> round(47.5)=48, attack
  // 1 -> round(4.75)=5, speed 1 -> round(4.75)=5 (<< HERO's 50 -- HERO always acts first).
  const BOSS_CREATURE_WIN: SpeciesCreature = {
    id: 'fixture-boss-win-boss',
    name: 'Fixture Boss Win Boss',
    affinity: 'violence',
    baseStats: { health: 10, attack: 1, intelligence: 1, defence: 0, speed: 1 },
    defaultScriptId: 'always-wait', // harmless even across the extra round it takes to kill her
    innateTraitIds: [],
    rarity: 'rare', // mechanically meaningless -- never spawn-pool-drawn
  }
  const BOSS_ENCOUNTER_WIN: BossEncounter = {
    bossId: 'fixture-boss-win-id',
    creature: BOSS_CREATURE_WIN,
    speciesId: 'fixture-boss-win-standalone-species',
    adds: [BOSS_ADD_WIN],
  }
  const BIOME_BOSS_WIN: BiomeData = {
    id: createBiomeId('fixture-boss-win-biome'),
    name: 'Fixture Boss Win Biome',
    speciesPool: [BOSS_SPECIES_WIN],
    boss: BOSS_ENCOUNTER_WIN,
  }

  function makeBossWinDeps(): Partial<GameStoreDeps> {
    return {
      biomes: [BIOME_BOSS_WIN],
      specializations: new Map([[FIXTURE_SPEC.id, FIXTURE_SPEC]]),
      standaloneCreatures: [HERO_STANDALONE],
      runSeed: 99,
      scripts: FIXTURE_SCRIPTS_BY_ID,
      balanceConfig: CFG,
    }
  }

  test('a boss win: bossDefeated is set, bossesCleared banks it, the boss gives XP/currency with no soul entry, the add gives soul%', () => {
    const store = createGameStore(makeBossWinDeps())
    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ deepestFloor: 9 }) // precondition: floor 9 already cleared

    const { outcome } = expectOk(store.getState().descend(10))

    // A boss floor is exactly ONE fight (fightCount is not consulted): HERO (speed 50, attack
    // 50) always acts first, kills the ADD (lowest scaled HP, round 1), then the boss (round 2,
    // her only remaining enemy) -- both one-shot regardless of the add's exact rolled level.
    expect(outcome.fightResults).toEqual(['win'])
    expect(outcome.cleared).toBe(true)
    expect(outcome.bossDefeated).toBe(BOSS_ENCOUNTER_WIN.bossId)
    // 6v6 (4.1-G1): the boss, her one authored add, and FOUR fill creatures drawn from the biome's
    // pool (BOSS_SPECIES_WIN holds only this add's kind) -- 5 add-kind kills at 10% each.
    expect(outcome.soulGained.get(BOSS_ADD_WIN.id)).toBe(50)
    expect(outcome.soulGained.has(BOSS_CREATURE_WIN.id)).toBe(false) // bosses grant no soul%
    // Review fix F7: pinned exact, not a range -- runSeed:99 is the real seeded RNG (never
    // stubbed here), so the add's rolled level is deterministic. Generated-then-checkpoint-
    // verified (regenerated in 4.1-G1, the 6v6 boss floor): the five add-kind kills (the authored
    // add and four fill creatures) roll levels summing to 53, and the boss's fixed level is 16,
    // so xpAwardForKill summed = 53 + 16 = 69. Checkpoint: five levels each within
    // enemyLevelRange(10, CFG) = 10..13 sum to 50..65, and 53 is inside it.
    expect(outcome.xpBanked).toBe(69)
    const { min, max } = enemyLevelRange(10, CFG)
    expect(outcome.xpBanked - 16).toBeGreaterThanOrEqual(5 * min)
    expect(outcome.xpBanked - 16).toBeLessThanOrEqual(5 * max)
    // currencyDropForKill(10, CFG) = {essence:10,ore:10,bricks:max(1,floor(10/10))=1,lifeforce:10},
    // banked per kill -- 6 kills (the boss and five add-kind creatures).
    expect(outcome.currencyGained).toEqual({
      essence: 60,
      ore: 60,
      bricks: 6,
      lifeforce: 60,
    })

    const state = store.getState()
    expect(state.bossesCleared.has(BOSS_ENCOUNTER_WIN.bossId)).toBe(true)
    expect(state.deepestFloor).toBe(10)
  })

  test('re-clearing an already-cleared boss floor leaves bossesCleared.size unchanged (idempotent, no further perk points)', () => {
    const store = createGameStore(makeBossWinDeps())
    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ deepestFloor: 9 })
    store.getState().descend(10)
    expect(store.getState().bossesCleared.size).toBe(1)

    const { outcome } = expectOk(store.getState().descend(10)) // re-fight the now-cleared floor 10

    expect(outcome.bossDefeated).toBe(BOSS_ENCOUNTER_WIN.bossId) // still reports the win...
    expect(store.getState().bossesCleared.size).toBe(1) // ...but grants no further perk points
  })

  const BOSS_ADD_LOSS: SpeciesCreature = {
    id: 'fixture-boss-loss-add',
    name: 'Fixture Boss Loss Add',
    affinity: 'violence',
    // Same shape as BOSS_ADD_WIN above -- dies to HERO's first hit regardless of rolled level.
    baseStats: { health: 1, attack: 1, intelligence: 1, defence: 0, speed: 5 },
    defaultScriptId: 'always-wait',
    innateTraitIds: [],
    rarity: 'common',
  }
  // Overwhelming and fixed (bossLevel(10,CFG)=16, factor 4.75): attack 1000 -> round(4750)=4750,
  // far beyond HERO's 50 HP -- one-shots her on the boss's own turn, AFTER HERO has already
  // killed the (lower-HP) add earlier in the same round.
  const BOSS_CREATURE_LOSS: SpeciesCreature = {
    id: 'fixture-boss-loss-boss',
    name: 'Fixture Boss Loss Boss',
    affinity: 'violence',
    baseStats: { health: 1000, attack: 1000, intelligence: 1, defence: 0, speed: 1 },
    defaultScriptId: 'always-attack',
    innateTraitIds: [],
    rarity: 'rare',
  }
  const BOSS_SPECIES_LOSS: Species = {
    id: 'fixture-boss-loss-species',
    name: 'Fixture Boss Loss Species',
    weight: 1,
    creatures: [BOSS_ADD_LOSS],
  }
  const BOSS_ENCOUNTER_LOSS: BossEncounter = {
    bossId: 'fixture-boss-loss-id',
    creature: BOSS_CREATURE_LOSS,
    speciesId: 'fixture-boss-loss-standalone-species',
    adds: [BOSS_ADD_LOSS],
  }
  const BIOME_BOSS_LOSS: BiomeData = {
    id: createBiomeId('fixture-boss-loss-biome'),
    name: 'Fixture Boss Loss Biome',
    speciesPool: [BOSS_SPECIES_LOSS],
    boss: BOSS_ENCOUNTER_LOSS,
  }

  test('a boss loss: nothing boss-related is recorded, but the add kill still banks', () => {
    const store = createGameStore({
      biomes: [BIOME_BOSS_LOSS],
      specializations: new Map([[FIXTURE_SPEC.id, FIXTURE_SPEC]]),
      standaloneCreatures: [HERO_STANDALONE],
      runSeed: 99,
      scripts: FIXTURE_SCRIPTS_BY_ID,
      balanceConfig: CFG,
    })
    store.getState().setSpec(FIXTURE_SPEC.id)
    store.setState({ deepestFloor: 9 })

    const { outcome } = expectOk(store.getState().descend(10))

    // HERO (speed 50) still acts first and kills the ADD (round 1) -- rewards bank per kill,
    // immediately, regardless of the fight's eventual outcome (CONVENTIONS). The boss then
    // one-shots HERO on its own turn, later in the SAME round -- a loss, zero further turns.
    expect(outcome.fightResults).toEqual(['loss'])
    expect(outcome.cleared).toBe(false)
    expect(outcome.bossDefeated).toBeNull()
    expect(outcome.soulGained.get(BOSS_ADD_LOSS.id)).toBe(10)
    expect(outcome.soulGained.has(BOSS_CREATURE_LOSS.id)).toBe(false)
    // Review fix F7: pinned exact -- runSeed:99 is the real seeded RNG (never stubbed here), so
    // the killed add's rolled level is deterministic. Generated-then-checkpoint-verified
    // (regenerated in 4.1-G1: the run stream now also feeds four fill creatures and every loadout):
    // the one kill rolls level 10, so xpAwardForKill(10,CFG) = 10. Checkpoint: it is inside
    // enemyLevelRange(10, CFG) = 10..13.
    expect(outcome.xpBanked).toBe(10)
    expect(outcome.xpBanked).toBeGreaterThanOrEqual(enemyLevelRange(10, CFG).min)
    expect(outcome.xpBanked).toBeLessThanOrEqual(enemyLevelRange(10, CFG).max)
    expect(outcome.currencyGained).toEqual({
      essence: 10,
      ore: 10,
      bricks: 1,
      lifeforce: 10,
    })

    const state = store.getState()
    expect(state.bossesCleared.size).toBe(0)
    expect(state.deepestFloor).toBe(9) // unchanged -- the boss floor wasn't cleared
  })
})
