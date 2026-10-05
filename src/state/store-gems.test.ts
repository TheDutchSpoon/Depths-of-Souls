// Phase 4.1-G2 (D4, ASSUMPTIONS 81-84, 86, 94): player gem sets. Every new player instance (the
// starter grant, the Unicorn, a summon) rolls and STORES a distinct, affinity-matched gem set
// through generation's `rollLoadout`, on its own RNG stream. Real content throughout.
//
// The hand-derived roll test is the anchor: its seed, draws and picks are written out below.

import { describe, expect, test } from 'vitest'
import type { Script } from '../engine/scripting-types'
import type { SeededRng } from '../engine/rng'
import { biomeForFloor, canEquip } from '../engine/generation'
import { createSeededRng } from '../engine/rng'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import {
  BRUTE_STARTER,
  BRUTE_STARTER_SPECIES_ID,
  SHIELDBARER_STARTER,
  SHIELDBARER_STARTER_SPECIES_ID,
  SORCERER_STARTER,
  SORCERER_STARTER_SPECIES_ID,
  UNICORN,
  UNICORN_SPECIES_ID,
} from '../data/species/starters'
import { createGameStore, type GameStoreDeps } from './store'
import type { Instance } from './rewards'
import { createInstanceId } from './ids'

/** An RNG returning `values` in order, then repeating the last one. */
function sequenceRng(values: readonly number[]): SeededRng {
  let cursor = 0
  return {
    next(): number {
      const value = values[Math.min(cursor, values.length - 1)] ?? 0
      cursor += 1
      return value
    },
  }
}

function instanceOf(
  store: ReturnType<typeof createGameStore>,
  creatureId: string,
): Instance {
  const found = [...store.getState().collection.values()].find(
    (inst) => inst.source.kind === 'creature' && inst.source.creatureId === creatureId,
  )
  if (!found) throw new Error(`no instance of ${creatureId}`)
  return found
}

const DEFAULT_DEPS_STANDALONE = [
  { speciesCreature: SORCERER_STARTER, speciesId: SORCERER_STARTER_SPECIES_ID },
  { speciesCreature: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
  { speciesCreature: SHIELDBARER_STARTER, speciesId: SHIELDBARER_STARTER_SPECIES_ID },
  { speciesCreature: UNICORN, speciesId: UNICORN_SPECIES_ID },
]

const spellById = new Map(ALL_SPELLS.map((spell) => [spell.id, spell]))

describe('hand-derived player gem roll (ASSUMPTIONS 81, 82, 95)', () => {
  // Setup: run seed 1, the Sorcerer starter (the Glyphmoth Seer) is the first grant, so its ordinal
  // is 0. deepestFloor is 0, so the unlock biome is that of floor 1 = biome 1.
  //
  // The seed: hashGemDraw(1, 0) = (imul(1, 0x2545f491) ^ imul(0 + 1, 0x9e3779b9)) >>> 0
  //   = 0x2545f491 ^ 0x9e3779b9
  //   nibble by nibble: 2^9=b, 5^e=b, 4^3=7, 5^7=2, f^7=8, 4^9=d, 9^b=2, 1^9=8
  //   = 0xbb728d28.
  //
  // The pool: ALL_SPELLS in registry order, Wit, unlocked at biome <= 1: Vine Snare, Pollen Cloud,
  // Arcane Bolt, Pacify. The Seer holds Arcane Bolt innately, so it is excluded (ASSUMPTION 81):
  // [Vine Snare, Pollen Cloud, Pacify].
  //
  // The draws (rollLoadout: one weightedPick per slot, weight 1 each, `roll = draw * total`, walk
  // the pool subtracting 1 until the roll goes negative), the stub supplies 0.5, 0.0, 0.99:
  //   slot 0: pool of 3, roll 1.5 -> after Vine Snare 0.5 -> after Pollen Cloud -0.5: Pollen Cloud.
  //   slot 1: pool [Vine Snare, Pacify], roll 0.0 -> after Vine Snare -1: Vine Snare.
  //   slot 2: pool [Pacify], roll 0.99 -> after Pacify -0.01: Pacify.
  test('the seed, the draws and the picks', () => {
    const seeds: number[] = []
    const store = createGameStore({
      runSeed: 1,
      createRng: (seed) => {
        seeds.push(seed)
        return sequenceRng([0.5, 0.0, 0.99])
      },
    })
    store.getState().setSpec('sorcerer')

    expect(seeds).toEqual([0xbb728d28])
    expect(instanceOf(store, 'sorcerer-starter').gems).toEqual([
      'pollen-cloud',
      'vine-snare',
      'pacify',
    ])
  })
})

describe('every new player instance rolls and stores a distinct, affinity-matched set', () => {
  function expectValidSet(gems: Instance['gems'], affinity: string, label: string) {
    expect(gems, label).toHaveLength(3)
    const ids = gems.map((id) => id!)
    expect(new Set(ids).size, `${label} distinct`).toBe(3)
    for (const id of ids) {
      const spell = spellById.get(id)
      expect(spell, `${label}: ${id}`).toBeDefined()
      expect(spell!.affinity, `${label}: ${id}`).toBe(affinity)
      expect(spell!.unlockedAtBiome ?? 1, `${label}: ${id}`).toBeLessThanOrEqual(1)
    }
  }

  test('the three starters and the Unicorn', () => {
    for (const [spec, starterId, affinity] of [
      ['sorcerer', 'sorcerer-starter', 'wit'],
      ['brute', 'brute-starter', 'violence'],
      ['shieldbarer', 'shieldbarer-starter', 'endurance'],
    ] as const) {
      const store = createGameStore()
      store.getState().setSpec(spec)
      store.getState().runScriptedIntro()
      expectValidSet(instanceOf(store, starterId).gems, affinity, starterId)
      expectValidSet(instanceOf(store, 'unicorn').gems, 'vitality', 'unicorn')
    }
  })

  test('the Seer never rolls her innate Arcane Bolt, for any seed (ASSUMPTION 81)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const store = createGameStore({ runSeed: seed })
      store.getState().setSpec('sorcerer')
      const gems = instanceOf(store, 'sorcerer-starter').gems
      expect(gems).not.toContain('arcane-bolt')
      expect(new Set(gems).size).toBe(3)
    }
  })

  test('a creature with no innate spell may roll any matching spell, Arcane Bolt included', () => {
    const wit = BIOMES.flatMap((b) => b.speciesPool)
      .flatMap((s) => s.creatures)
      .find((c) => c.affinity === 'wit')!
    const seen = new Set<string>()
    for (let seed = 0; seed < 100; seed++) {
      const store = createGameStore({ runSeed: seed })
      store.getState().setSpec('brute')
      store.setState({ soulProgress: new Map([[wit.id, 100]]) })
      const result = store.getState().summon(wit.id)
      if (!result.ok) throw new Error('summon failed')
      for (const g of store.getState().collection.get(result.instanceId)!.gems)
        seen.add(g!)
    }
    expect(seen.has('arcane-bolt')).toBe(true)
  })

  test('summons: every creature of every authored biome rolls a valid set, and sets vary by ordinal', () => {
    const creatures = BIOMES.flatMap((b) => b.speciesPool).flatMap((s) => s.creatures)
    const store = createGameStore()
    store.getState().setSpec('brute')
    store.setState({ soulProgress: new Map(creatures.map((c) => [c.id, 100] as const)) })
    const sets = new Set<string>()
    for (const creature of creatures) {
      const result = store.getState().summon(creature.id)
      if (!result.ok) throw new Error(`summon ${creature.id}: ${result.reason}`)
      const gems = store.getState().collection.get(result.instanceId)!.gems
      // Distinct and affinity-matched at biome 1 (deepestFloor is 0).
      expect(new Set(gems).size, creature.id).toBe(3)
      for (const g of gems)
        expect(canEquip(spellById.get(g!)!, creature.affinity)).toBe(true)
      sets.add(`${creature.affinity}:${[...gems].sort().join(',')}`)
    }
    // Different ordinals feed different seeds, so the sets are not all one fixed answer.
    expect(sets.size).toBeGreaterThan(5)
  })

  test('a creature whose pool is smaller than 3 repeats a spell only as the safety net (distinctness is the rule)', () => {
    // Two-spell pool: slots 0 and 1 distinct, slot 2 repeats (same rollLoadout as enemies).
    const pool = ALL_SPELLS.filter((s) => s.affinity === 'endurance').slice(0, 2)
    const store = createGameStore({ allSpells: pool })
    store.getState().setSpec('shieldbarer')
    const gems = instanceOf(store, 'shieldbarer-starter').gems
    expect(new Set(gems.slice(0, 2)).size).toBe(2)
    expect(gems[2]).not.toBeNull()
  })
})

describe('the unlock biome (ASSUMPTION 82)', () => {
  // A constant draw of 0.7 over the affinity-matched pool of a non-innate Wit creature picks:
  //   biome 1  (4 spells: Vine Snare, Pollen Cloud, Arcane Bolt, Pacify):   2.8 -> Arcane Bolt
  //   biome 2  (7: + Beacon Charge, Overcharge, Luminous Tide):             4.9 -> Overcharge
  //   biome 3+ (8: + Spore Cyst):                                           5.6 -> Luminous Tide
  // (registry order: Vine, Pollen, Arcane, Beacon, Overcharge, Luminous, Spore Cyst, Pacify).
  const wit = BIOMES.flatMap((b) => b.speciesPool)
    .flatMap((s) => s.creatures)
    .find((c) => c.affinity === 'wit')!

  function firstPick(options: {
    deepestFloor: number
    runSeed?: number
    pinFloor?: number
  }): string {
    const store = createGameStore({
      runSeed: options.runSeed ?? 5,
      createRng: () => sequenceRng([0.7]),
    })
    store.getState().setSpec('brute')
    store.setState({
      deepestFloor: options.deepestFloor,
      soulProgress: new Map([[wit.id, 100]]),
    })
    if (options.pinFloor !== undefined) {
      expect(store.getState().pinBiome(options.pinFloor, BIOMES[0]!.id)).toEqual({
        ok: true,
      })
    }
    const result = store.getState().summon(wit.id)
    if (!result.ok) throw new Error('summon failed')
    return store.getState().collection.get(result.instanceId)!.gems[0]!
  }

  test('floor 0 and floor 1 both use biome 1', () => {
    expect(firstPick({ deepestFloor: 0 })).toBe('arcane-bolt')
    expect(firstPick({ deepestFloor: 1 })).toBe('arcane-bolt')
  })

  test('the pool follows depth: biome 2 at floor 11, biome 3 at floor 21', () => {
    expect(firstPick({ deepestFloor: 11 })).toBe('overcharge')
    expect(firstPick({ deepestFloor: 21 })).toBe('luminous-tide')
  })

  test('an atlas pin on the deepest floor does not change the pool', () => {
    // Pinned to biome 1, floor 11 would draw Arcane Bolt if the roll followed the pin.
    expect(firstPick({ deepestFloor: 11, pinFloor: 11 })).toBe('overcharge')
  })

  test('past floor 100 the floor clamps to 100, never the seed-hashed biome', () => {
    // Find a seed whose floor-150 hash would pick biome 1 (a smaller pool) if it were read.
    let seed = 0
    while (biomeForFloor(150, BIOMES, new Map(), seed) !== BIOMES[0]!.id) seed++
    expect(firstPick({ deepestFloor: 150, runSeed: seed })).toBe('luminous-tide')
  })
})

describe('the gem RNG is its own stream (ASSUMPTION 81)', () => {
  test('rolling gems never reads or advances runCounter', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    expect(store.getState().runCounter).toBe(0)
    const creature = BIOMES[0]!.speciesPool[0]!.creatures[0]!
    store.setState({ soulProgress: new Map([[creature.id, 100]]) })
    store.getState().summon(creature.id)
    store.getState().summon(creature.id)
    expect(store.getState().runCounter).toBe(0)
  })

  test('each roll makes exactly one createRng call, on its own seed, distinct per ordinal', () => {
    const seeds: number[] = []
    const store = createGameStore({
      runSeed: 77,
      createRng: (seed) => {
        seeds.push(seed)
        return createSeededRng(seed)
      },
    })
    store.getState().setSpec('brute') // ordinal 0
    const creature = BIOMES[0]!.speciesPool[0]!.creatures[0]!
    store.setState({ soulProgress: new Map([[creature.id, 100]]) })
    store.getState().summon(creature.id) // ordinal 1
    store.getState().summon(creature.id) // ordinal 2
    expect(seeds).toHaveLength(3)
    expect(new Set(seeds).size).toBe(3)
  })

  test('benched summons leave the next floor, and its whole fight, exactly as without them', () => {
    function descendWith(summons: number) {
      const store = createGameStore()
      store.getState().setSpec('brute')
      const creature = BIOMES[0]!.speciesPool[0]!.creatures[0]!
      store.setState({ soulProgress: new Map([[creature.id, 100]]) })
      for (let i = 0; i < summons; i++) {
        const result = store.getState().summon(creature.id)
        if (!result.ok) throw new Error('summon failed')
        store
          .getState()
          .setPartySlot(store.getState().activeParty.indexOf(result.instanceId), null)
      }
      const result = store.getState().descend(1)
      if (!result.ok) throw new Error('descend failed')
      return result.outcome
    }
    const plain = descendWith(0)
    const withSummons = descendWith(3)
    expect(withSummons.events).toEqual(plain.events)
    expect(withSummons.fightResults).toEqual(plain.fightResults)
  })
})

describe('stored gems reach the fight (ASSUMPTIONS 83, 84)', () => {
  /** A fixture script: cast gem slot 0 at the lowest-HP enemy, else wait. */
  const CAST_SLOT_0: Script = {
    id: 'cast-slot-0',
    rules: [
      {
        condition: { kind: 'always' },
        action: { kind: 'cast', gemSlot: 0 },
      },
    ],
  }

  function storeWithGems(gems: Instance['gems']) {
    const deps: Partial<GameStoreDeps> = {
      scripts: new Map([...STOCK_SCRIPTS_BY_ID, [CAST_SLOT_0.id, CAST_SLOT_0]]),
    }
    const store = createGameStore(deps)
    store.getState().setSpec('brute')
    store.setState((s) => {
      const collection = new Map(s.collection)
      const brute = collection.get(createInstanceId('inst-0'))!
      collection.set(brute.id, { ...brute, scriptId: CAST_SLOT_0.id, gems })
      return { collection }
    })
    return store
  }

  function playerCasts(store: ReturnType<typeof createGameStore>): number {
    const result = store.getState().descend(1)
    if (!result.ok) throw new Error('descend failed')
    return result.outcome.events.filter(
      (e) => e.type === 'SpellCast' && e.casterId.includes('-player-'),
    ).length
  }

  test('a stored gem is equipped and cast; with empty slots the same script never casts', () => {
    expect(playerCasts(storeWithGems(['ember-lance', null, null]))).toBeGreaterThan(0)
    expect(playerCasts(storeWithGems([null, null, null]))).toBe(0)
  })

  test('an unknown stored spell id throws when the party is resolved', () => {
    const store = storeWithGems(['no-such-spell', null, null])
    expect(() => store.getState().descend(1)).toThrow(/unknown spell id no-such-spell/)
  })
})

describe('a new instance runs its role (ASSUMPTION 86)', () => {
  // The Brute starter, re-roled to a script id nothing else in the game uses, so a lookup of that
  // id can only come from a player instance of it (enemies never run it).
  const PROBE_ROLE: Script = {
    id: 'role-probe',
    rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
  }
  const PROBE_STARTER = { ...BRUTE_STARTER, defaultScriptId: PROBE_ROLE.id }

  /** A script registry that records which ids the fight looks up. */
  class SpyScripts extends Map<string, Script> {
    readonly requested = new Set<string>()
    override get(key: string): Script | undefined {
      this.requested.add(key)
      return super.get(key)
    }
  }

  function probeStore(extra: readonly Script[] = []) {
    const scripts = new SpyScripts([
      ...STOCK_SCRIPTS_BY_ID,
      [PROBE_ROLE.id, PROBE_ROLE],
      ...extra.map((script) => [script.id, script] as const),
    ])
    const store = createGameStore({
      scripts,
      standaloneCreatures: [
        { speciesCreature: PROBE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
        ...DEFAULT_DEPS_STANDALONE.filter(
          (ref) => ref.speciesCreature.id !== BRUTE_STARTER.id,
        ),
      ],
    })
    store.getState().setSpec('brute')
    return { store, scripts }
  }

  test('scriptId null resolves to the creature’s role at materialization', () => {
    const { store, scripts } = probeStore()
    expect(instanceOf(store, 'brute-starter').scriptId).toBeNull()
    expect(store.getState().descend(1).ok).toBe(true)
    expect(scripts.requested.has('role-probe')).toBe(true)
  })

  test('a set scriptId overrides the role', () => {
    const custom: Script = {
      id: 'custom',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
    }
    const { store, scripts } = probeStore([custom])
    store.setState((s) => {
      const collection = new Map(s.collection)
      const brute = collection.get(createInstanceId('inst-0'))!
      collection.set(brute.id, { ...brute, scriptId: 'custom' })
      return { collection }
    })
    store.getState().descend(1)
    expect(scripts.requested.has('custom')).toBe(true)
    expect(scripts.requested.has('role-probe')).toBe(false)
  })

  test('a summoned instance starts on its role too', () => {
    const { store, scripts } = probeStore()
    // Bench the granted starter, then summon a second copy: only the summon can ask for the role.
    store.getState().setPartySlot(0, null)
    store.setState({ soulProgress: new Map([['brute-starter', 100]]) })
    const summoned = store.getState().summon('brute-starter')
    if (!summoned.ok) throw new Error('summon failed')
    expect(store.getState().collection.get(summoned.instanceId)!.scriptId).toBeNull()
    store.getState().descend(1)
    expect(scripts.requested.has('role-probe')).toBe(true)
  })
})
