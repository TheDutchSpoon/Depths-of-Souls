import { describe, expect, it } from 'vitest'
import {
  peekTargetSelector,
  resolveTargetSelector,
  targetSelectorHasCandidate,
} from './target-selectors'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import { createEffectInstanceId } from './effect-types'
import type { CombatState } from './types'
import type { TargetSelector } from './scripting-types'
import type { ActiveEffect } from './effect-types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createSeededRng(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    traits: new Map(),
    ...overrides,
  }
}

const ALL_SELECTORS: TargetSelector[] = [
  { kind: 'self' },
  { kind: 'lowest-hp-ally' },
  { kind: 'highest-hp-ally' },
  { kind: 'highest-attack-ally' },
  { kind: 'highest-intelligence-ally' },
  { kind: 'random-ally' },
  { kind: 'lowest-hp-enemy' },
  { kind: 'highest-hp-enemy' },
  { kind: 'highest-attack-enemy' },
  { kind: 'highest-intelligence-enemy' },
  { kind: 'random-enemy' },
]

describe('targetSelectorHasCandidate / resolveTargetSelector', () => {
  it.each(ALL_SELECTORS)(
    'has a candidate and resolves for kind=%o when a valid pool exists',
    (selector) => {
      const player = makeParty('player', [{ id: 'me' }])
      const enemy = makeParty('enemy', [{ id: 'foe' }])
      const state = makeState({ playerParty: player, enemyParty: enemy })
      const me = player[0]!

      expect(targetSelectorHasCandidate(selector, me, state)).toBe(true)
      expect(resolveTargetSelector(selector, me, state)).not.toBeNull()
    },
  )

  it('self always resolves to the acting creature', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const me = player[0]!
    expect(resolveTargetSelector({ kind: 'self' }, me, state)).toBe(me.id)
  })

  it('lowest-hp-ally on a solo creature resolves to itself', () => {
    const player = makeParty('player', [{ id: 'solo' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const solo = player[0]!
    expect(resolveTargetSelector({ kind: 'lowest-hp-ally' }, solo, state)).toBe(solo.id)
  })

  it('lowest-hp-enemy picks the tie-broken lowest-HP enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(resolveTargetSelector({ kind: 'lowest-hp-enemy' }, player[0]!, state)).toBe(
      enemy[1]!.id,
    )
  })

  it('highest-hp-enemy picks the tie-broken highest-HP enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(resolveTargetSelector({ kind: 'highest-hp-enemy' }, player[0]!, state)).toBe(
      enemy[0]!.id,
    )
  })

  it('highest-attack-enemy and highest-intelligence-enemy compare via getEffectiveStat', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'brute', attack: 30, intelligence: 5 },
      { id: 'mage', attack: 5, intelligence: 30 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      resolveTargetSelector({ kind: 'highest-attack-enemy' }, player[0]!, state),
    ).toBe(enemy[0]!.id)
    expect(
      resolveTargetSelector({ kind: 'highest-intelligence-enemy' }, player[0]!, state),
    ).toBe(enemy[1]!.id)
  })

  it('extremum selectors use the shared tie-break on an exact stat tie', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'first', currentHp: 10 },
      { id: 'second', currentHp: 10 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    // Tied HP -> tie-break falls to side/slot/id, so the first-slotted enemy wins.
    expect(resolveTargetSelector({ kind: 'lowest-hp-enemy' }, player[0]!, state)).toBe(
      enemy[0]!.id,
    )
  })

  it('random-enemy resolves to a pool member and advances state.rng', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(7),
    })
    const before = createSeededRng(7).next()

    const result = resolveTargetSelector({ kind: 'random-enemy' }, player[0]!, state)

    expect(enemy.map((c) => c.id)).toContain(result)
    // The state's rng was advanced by this call (compare against the untouched draw).
    const expectedIndex = Math.floor(before * enemy.length)
    expect(result).toBe(enemy[expectedIndex]!.id)
  })

  it('targetSelectorHasCandidate never advances state.rng, even for random-enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }])
    const seed = 99
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(seed),
    })
    const sibling = createSeededRng(seed)

    targetSelectorHasCandidate({ kind: 'random-enemy' }, player[0]!, state)

    expect(state.rng.next()).toBe(sibling.next())
  })

  it('has no candidate when the required pool is empty', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const me = player[0]!

    expect(targetSelectorHasCandidate({ kind: 'lowest-hp-enemy' }, me, state)).toBe(false)
    expect(targetSelectorHasCandidate({ kind: 'random-enemy' }, me, state)).toBe(false)
  })

  // Phase 4 Slice E: the one-for-one ally mirror of the enemy-selector cases above, over
  // livingAlliesOf instead of livingEnemiesOf. "ally" always includes the acting creature, so
  // candidacy is unconditionally true for these (already covered by the ALL_SELECTORS table
  // above, on a solo party) -- these cases exercise RESOLUTION against a real multi-member pool.

  it('highest-hp-ally picks the tie-broken highest-HP ally', () => {
    const player = makeParty('player', [
      { id: 'me', currentHp: 10 },
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(resolveTargetSelector({ kind: 'highest-hp-ally' }, player[0]!, state)).toBe(
      player[1]!.id,
    )
  })

  it('highest-attack-ally and highest-intelligence-ally compare via getEffectiveStat', () => {
    const player = makeParty('player', [
      { id: 'me', attack: 1, intelligence: 1 },
      { id: 'brute', attack: 30, intelligence: 5 },
      { id: 'mage', attack: 5, intelligence: 30 },
    ])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(
      resolveTargetSelector({ kind: 'highest-attack-ally' }, player[0]!, state),
    ).toBe(player[1]!.id)
    expect(
      resolveTargetSelector({ kind: 'highest-intelligence-ally' }, player[0]!, state),
    ).toBe(player[2]!.id)
  })

  it('highest-attack-ally reads EFFECTIVE Attack, not base', () => {
    const buffed: ActiveEffect = {
      category: 'stat-modifier',
      stat: 'attack',
      factor: 3,
      instanceId: createEffectInstanceId('buff'),
      sourceTraitId: 'buff-fixture',
    }
    const player = makeParty('player', [
      { id: 'me', attack: 1 },
      { id: 'base-higher', attack: 20 },
      { id: 'buffed-lower-base', attack: 10, activeEffects: [buffed] }, // effective 30
    ])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(
      resolveTargetSelector({ kind: 'highest-attack-ally' }, player[0]!, state),
    ).toBe(player[2]!.id)
  })

  it('ally extremum selectors use the shared tie-break on an exact stat tie', () => {
    const player = makeParty('player', [
      { id: 'me', currentHp: 1 },
      { id: 'first', currentHp: 10 },
      { id: 'second', currentHp: 10 },
    ])
    const state = makeState({ playerParty: player, enemyParty: [] })
    // Tied HP -> tie-break falls to side/slot/id, so the first-slotted (non-self) ally wins.
    expect(resolveTargetSelector({ kind: 'highest-hp-ally' }, player[0]!, state)).toBe(
      player[1]!.id,
    )
  })

  it('random-ally resolves to a pool member and advances state.rng', () => {
    const player = makeParty('player', [
      { id: 'me' },
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ])
    const state = makeState({
      playerParty: player,
      enemyParty: [],
      rng: createSeededRng(7),
    })
    const before = createSeededRng(7).next()

    const result = resolveTargetSelector({ kind: 'random-ally' }, player[0]!, state)

    expect(player.map((c) => c.id)).toContain(result)
    const expectedIndex = Math.floor(before * player.length)
    expect(result).toBe(player[expectedIndex]!.id)
  })

  it('targetSelectorHasCandidate never advances state.rng, even for random-ally', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const seed = 99
    const state = makeState({
      playerParty: player,
      enemyParty: [],
      rng: createSeededRng(seed),
    })
    const sibling = createSeededRng(seed)

    targetSelectorHasCandidate({ kind: 'random-ally' }, player[0]!, state)

    expect(state.rng.next()).toBe(sibling.next())
  })

  it('peekTargetSelector resolves the three extremum ally selectors normally', () => {
    const player = makeParty('player', [
      { id: 'me', currentHp: 1 },
      { id: 'high', currentHp: 20 },
    ])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(peekTargetSelector({ kind: 'highest-hp-ally' }, player[0]!, state)).toBe(
      player[1]!.id,
    )
  })

  it('peekTargetSelector never draws RNG for random-ally, returning null', () => {
    const player = makeParty('player', [{ id: 'me' }, { id: 'other' }])
    const seed = 42
    const state = makeState({
      playerParty: player,
      enemyParty: [],
      rng: createSeededRng(seed),
    })
    const sibling = createSeededRng(seed)

    const result = peekTargetSelector({ kind: 'random-ally' }, player[0]!, state)

    expect(result).toBeNull()
    expect(state.rng.next()).toBe(sibling.next())
  })
})
