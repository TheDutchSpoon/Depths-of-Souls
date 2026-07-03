import { describe, expect, it } from 'vitest'
import { resolveTargetSelector, targetSelectorHasCandidate } from './target-selectors'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import type { CombatState } from './types'
import type { TargetSelector } from './scripting-types'

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
    ...overrides,
  }
}

const ALL_SELECTORS: TargetSelector[] = [
  { kind: 'self' },
  { kind: 'lowest-hp-ally' },
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
})
