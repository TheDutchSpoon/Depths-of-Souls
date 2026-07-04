import { describe, expect, it } from 'vitest'
import {
  getDefaultTarget,
  getProvokingMembers,
  livingAlliesOf,
  livingEnemiesOf,
  resolveOffensiveTarget,
} from './targeting'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import type { CombatState } from './types'

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
    ...overrides,
  }
}

describe('getDefaultTarget', () => {
  it('returns null when the enemy side has no living creatures', () => {
    expect(getDefaultTarget([])).toBeNull()
    const allDead = makeParty('enemy', [{ id: 'a', alive: false }])
    expect(getDefaultTarget(allDead)).toBeNull()
  })

  it('returns the first living enemy by slot, ascending', () => {
    const enemy = makeParty('enemy', [
      { id: 'first', alive: false },
      { id: 'second' },
      { id: 'third' },
    ])
    expect(getDefaultTarget(enemy)).toBe(enemy[1]?.id)
  })
})

describe('livingEnemiesOf / livingAlliesOf', () => {
  it('selects the opposing side, alive-filtered', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      { id: 'alive-enemy' },
      { id: 'dead-enemy', alive: false },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })

    const hero = player[0]!
    expect(livingEnemiesOf(hero, state)).toEqual([enemy[0]])
  })

  it('ally pool always includes the acting creature itself', () => {
    const player = makeParty('player', [{ id: 'solo' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const solo = player[0]!
    expect(livingAlliesOf(solo, state)).toEqual([solo])
  })

  it('ally pool excludes dead allies but keeps the acting creature', () => {
    const player = makeParty('player', [{ id: 'me' }, { id: 'dead-ally', alive: false }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const me = player[0]!
    expect(livingAlliesOf(me, state)).toEqual([me])
  })
})

describe('getProvokingMembers', () => {
  it('includes only alive + provoking members', () => {
    const party = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'not-provoking' },
      { id: 'dead-provoker', provoking: true, alive: false },
    ])
    expect(getProvokingMembers(party)).toEqual([party[0]])
  })
})

describe('resolveOffensiveTarget', () => {
  it('calls resolveNormally when the opposing side has zero provokers', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [{ id: 'goblin' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    let called = false
    const result = resolveOffensiveTarget(hero, state, () => {
      called = true
      return enemy[0]!.id
    })

    expect(called).toBe(true)
    expect(result).toBe(enemy[0]!.id)
  })

  it('redirects to the sole provoker without ever calling resolveNormally', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'other' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    let called = false
    const result = resolveOffensiveTarget(hero, state, () => {
      called = true
      return enemy[1]!.id
    })

    expect(called).toBe(false)
    expect(result).toBe(enemy[0]!.id)
  })

  it('excludes an expired provoker (provoking: false) from the redirect pool', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      // Simulates a creature that provoked earlier this fight but whose own turn
      // already came and cleared the flag -- it must not still redirect to it.
      { id: 'expired-provoker', provoking: false },
      { id: 'target' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    const result = resolveOffensiveTarget(hero, state, () => enemy[1]!.id)

    expect(result).toBe(enemy[1]!.id)
  })

  it('draws exactly one RNG value when redirecting, even for a singleton provoker pool', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [{ id: 'provoker', provoking: true }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(42),
    })
    const sibling = createSeededRng(42)

    resolveOffensiveTarget(player[0]!, state, () => null)

    // The state's rng should have advanced by exactly one draw relative to a fresh sibling.
    sibling.next()
    expect(state.rng.next()).toBe(sibling.next())
  })
})
