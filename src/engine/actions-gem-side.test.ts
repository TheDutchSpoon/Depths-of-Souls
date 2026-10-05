// Phase 4.1-G1 (ASSUMPTION 69): the `gemSide` filter on a `gemSlot: 'random'` cast, the `support`
// role's "cast random ally-side gem". It is read at TWO sites -- `checkLegality` (is any gem of that
// side castable?) and `resolveGemSlot` (which one?) -- and each has its own test below, so removing
// either read fails a test. With the field absent, the pre-G1 draw must be unchanged: pinned here
// against an independent computation, not only by the goldens and the digest.

import { describe, expect, it } from 'vitest'
import { castableGemSlots, checkLegality, resolveIntent } from './actions'
import { makeParty } from './__fixtures__/creatures'
import { createRngState, nextRandom } from './rng'
import type { CombatState, Spell } from './types'
import type { Intent } from './scripting-types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createRngState(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    effectInstanceCounter: 0,
    turnClock: 0,
    ...overrides,
  }
}

const damage = {
  kind: 'deal-damage',
  target: { kind: 'cast-target' },
  offStat: 'cast',
  spellPower: 0.5,
} as const

const spell = (
  id: string,
  targetSide: 'enemy' | 'ally',
  targetShape: 'single' | 'aoe' = 'single',
): Spell => ({
  id,
  name: id,
  targetShape,
  affinity: 'vitality',
  targetSide,
  unlockedAtBiome: 1,
  effects: [damage],
})

const ENEMY_SINGLE = spell('enemy-single', 'enemy')
const ALLY_SINGLE = spell('ally-single', 'ally')
const ENEMY_AOE = spell('enemy-aoe', 'enemy', 'aoe')
const ALLY_AOE = spell('ally-aoe', 'ally', 'aoe')

const RANDOM_ANY: Intent = { action: { kind: 'cast', gemSlot: 'random' } }
const RANDOM_ALLY: Intent = {
  action: { kind: 'cast', gemSlot: 'random', gemSide: 'ally' },
}
const RANDOM_ENEMY: Intent = {
  action: { kind: 'cast', gemSlot: 'random', gemSide: 'enemy' },
}

describe('castableGemSlots with a side filter', () => {
  const player = makeParty('player', [
    {
      id: 'me',
      equippedSpells: [ENEMY_SINGLE, ALLY_SINGLE, null, ENEMY_AOE, ALLY_AOE],
    },
  ])
  const state = makeState({
    playerParty: player,
    enemyParty: makeParty('enemy', [{ id: 'foe' }]),
  })

  it('keeps only the gems whose own targetSide is that side, AOE spells included', () => {
    expect(castableGemSlots(player[0]!, state, 'ally')).toEqual([1, 4])
    expect(castableGemSlots(player[0]!, state, 'enemy')).toEqual([0, 3])
  })

  it('with no side it is every castable slot, exactly as before', () => {
    expect(castableGemSlots(player[0]!, state)).toEqual([0, 1, 3, 4])
    expect(castableGemSlots(player[0]!, state, undefined)).toEqual([0, 1, 3, 4])
  })
})

describe('the side filter at checkLegality (site 1)', () => {
  const foe = makeParty('enemy', [{ id: 'foe' }])

  it('an ally-side random cast is illegal when the actor holds only enemy-side gems, though a plain random cast is legal', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SINGLE] }])
    const state = makeState({ playerParty: player, enemyParty: foe })
    expect(checkLegality(player[0]!, RANDOM_ANY, state)).toBe(true)
    expect(checkLegality(player[0]!, RANDOM_ALLY, state)).toBe(false)
  })

  it('it is legal once one ally-side gem exists, and the enemy-side filter mirrors it', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SINGLE, ALLY_SINGLE] },
    ])
    const state = makeState({ playerParty: player, enemyParty: foe })
    expect(checkLegality(player[0]!, RANDOM_ALLY, state)).toBe(true)
    expect(checkLegality(player[0]!, RANDOM_ENEMY, state)).toBe(true)
    const onlyAlly = makeParty('player', [{ id: 'me', equippedSpells: [ALLY_SINGLE] }])
    expect(
      checkLegality(onlyAlly[0]!, RANDOM_ENEMY, makeState({ playerParty: onlyAlly })),
    ).toBe(false)
  })
})

describe('the side filter at resolveGemSlot (site 2, via resolveIntent)', () => {
  it('an ally-side random cast always resolves to the ally-side gem, across seeds 0-19', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SINGLE, ALLY_SINGLE, ENEMY_SINGLE] },
      { id: 'hurt', currentHp: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        playerParty: player,
        enemyParty: enemy,
        rng: createRngState(seed),
      })
      const action = resolveIntent(player[0]!, RANDOM_ALLY, state)
      // Unfiltered, slots 0 and 2 would also be drawn; filtered, the one ally gem is every time.
      expect(action).toMatchObject({ kind: 'cast', gemSlot: 1 })
      // The default target of an ally-side spell is the lowest-HP ally: the wounded one.
      expect(action).toMatchObject({ targetId: player[1]!.id })
      // One gem draw (even over a single candidate); the ally-side default draws nothing more.
      const expected = createRngState(seed)
      nextRandom(expected)
      expect(state.rng.position).toBe(expected.position)
    }
  })

  it('the draw is uniform over the FILTERED slots: two ally gems among three castable', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ALLY_SINGLE, ENEMY_SINGLE, ALLY_AOE] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const picked = new Set<number>()
    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        playerParty: player,
        enemyParty: enemy,
        rng: createRngState(seed),
      })
      const action = resolveIntent(player[0]!, RANDOM_ALLY, state)
      if (action?.kind !== 'cast') throw new Error('expected a cast')
      // Filtered slots are [0, 2]; the draw indexes THAT list.
      const r = nextRandom(createRngState(seed))
      expect(action.gemSlot).toBe([0, 2][Math.floor(r * 2)])
      picked.add(action.gemSlot)
    }
    expect(picked).toEqual(new Set([0, 2]))
  })
})

describe("with `gemSide` absent, today's random draw is unchanged (ASSUMPTION 69)", () => {
  it('draws one value and indexes the UNFILTERED castable slots, across seeds 0-19', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SINGLE, ALLY_SINGLE, ENEMY_SINGLE] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const picked = new Set<number>()
    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        playerParty: player,
        enemyParty: enemy,
        rng: createRngState(seed),
      })
      const action = resolveIntent(player[0]!, RANDOM_ANY, state)
      if (action?.kind !== 'cast') throw new Error('expected a cast')
      const r = nextRandom(createRngState(seed))
      expect(action.gemSlot).toBe([0, 1, 2][Math.floor(r * 3)])
      const expected = createRngState(seed)
      nextRandom(expected) // the gem draw; the default targets draw nothing further
      expect(state.rng.position).toBe(expected.position)
      picked.add(action.gemSlot)
    }
    expect(picked).toEqual(new Set([0, 1, 2]))
  })

  it('an explicit `gemSide: undefined` is the same intent as an absent one', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SINGLE, ALLY_SINGLE] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    for (let seed = 0; seed < 10; seed++) {
      const make = () =>
        makeState({ playerParty: player, enemyParty: enemy, rng: createRngState(seed) })
      const absent = make()
      const explicit = make()
      expect(
        resolveIntent(
          player[0]!,
          { action: { kind: 'cast', gemSlot: 'random', gemSide: undefined } },
          explicit,
        ),
      ).toEqual(resolveIntent(player[0]!, RANDOM_ANY, absent))
      expect(explicit.rng.position).toBe(absent.rng.position)
    }
  })
})
