// Phase 4.1-G2 (G4): `setPerkLevel`, `canSetPerkLevel` and `refundAllPerks` against the real specs.
// Budget numbers (ASSUMPTION 93): perk points = bossesCleared x 100; spend = Σ level x
// costPerLevel. Brute's `might` is maxLevel 50 x 2 = 100 and `flurry` is 1 x 100; Sorcerer's
// `wit-mastery` is 1 x 60 and inert until Phase 8 (still buyable: no gating).

import { describe, expect, test } from 'vitest'
import { createGameStore } from './store'

function bruteStore(bosses = 0) {
  const store = createGameStore()
  store.getState().setSpec('brute')
  for (let i = 0; i < bosses; i++) store.getState().recordBossKill(`boss-${i}`)
  return store
}

describe('setPerkLevel()', () => {
  test('no-spec: nothing chosen yet', () => {
    const store = createGameStore()
    expect(store.getState().setPerkLevel('might', 1)).toEqual({
      ok: false,
      reason: 'no-spec',
    })
  })

  test('perk-not-in-spec: another spec’s perk, and an unknown id', () => {
    const store = bruteStore(1)
    expect(store.getState().setPerkLevel('echo', 1)).toEqual({
      ok: false,
      reason: 'perk-not-in-spec',
    })
    expect(store.getState().setPerkLevel('nope', 1)).toEqual({
      ok: false,
      reason: 'perk-not-in-spec',
    })
  })

  test('perk-not-in-spec is checked before invalid-level', () => {
    const store = bruteStore(1)
    expect(store.getState().setPerkLevel('echo', -5)).toEqual({
      ok: false,
      reason: 'perk-not-in-spec',
    })
  })

  test('invalid-level: negative, fractional, NaN, past maxLevel', () => {
    const store = bruteStore(1)
    for (const level of [-1, 1.5, Number.NaN, 51]) {
      expect(store.getState().setPerkLevel('might', level)).toEqual({
        ok: false,
        reason: 'invalid-level',
      })
    }
  })

  test('invalid-level is checked before over-budget', () => {
    const store = bruteStore(0)
    expect(store.getState().setPerkLevel('might', 51)).toEqual({
      ok: false,
      reason: 'invalid-level',
    })
  })

  test('over-budget: no boss cleared means no points', () => {
    const store = bruteStore(0)
    expect(store.getState().setPerkLevel('might', 1)).toEqual({
      ok: false,
      reason: 'over-budget',
    })
  })

  test('over-budget counts every other perk already bought', () => {
    const store = bruteStore(1) // 100 points
    expect(store.getState().setPerkLevel('might', 50)).toEqual({ ok: true }) // 100 spent
    expect(store.getState().setPerkLevel('flurry', 1)).toEqual({
      ok: false,
      reason: 'over-budget',
    })
    // The refused call changed nothing.
    expect(store.getState().perkSpend).toEqual(new Map([['might', 50]]))
  })

  test('the budget check is on the post-change total: exactly the budget passes', () => {
    const store = bruteStore(1)
    expect(store.getState().setPerkLevel('might', 49)).toEqual({ ok: true }) // 98
    expect(store.getState().setPerkLevel('might', 50)).toEqual({ ok: true }) // 100, exactly
  })

  test('setting a perk to a new level replaces its old spend, it does not add to it', () => {
    const store = bruteStore(1)
    store.getState().setPerkLevel('might', 50)
    // 50 -> 50 would double-count if the old level were kept; 30 -> 50 again fits only if replaced.
    store.getState().setPerkLevel('might', 30)
    expect(store.getState().setPerkLevel('might', 50)).toEqual({ ok: true })
    expect(store.getState().perkSpend.get('might')).toBe(50)
  })

  test('lowering a level and level 0 (which removes the entry)', () => {
    const store = bruteStore(1)
    store.getState().setPerkLevel('might', 50)
    expect(store.getState().setPerkLevel('might', 10)).toEqual({ ok: true })
    expect(store.getState().perkSpend.get('might')).toBe(10)
    expect(store.getState().setPerkLevel('might', 0)).toEqual({ ok: true })
    expect(store.getState().perkSpend.has('might')).toBe(false)
  })

  test('a perk inert until Phase 8 is buyable (no gating)', () => {
    const store = createGameStore()
    store.getState().setSpec('sorcerer')
    store.getState().recordBossKill('boss-0')
    expect(store.getState().setPerkLevel('wit-mastery', 1)).toEqual({ ok: true })
    expect(store.getState().perkSpend.get('wit-mastery')).toBe(1)
  })

  test('swapping specs still refunds everything (setSpec clears spend)', () => {
    const store = bruteStore(1)
    store.getState().setPerkLevel('might', 20)
    store.getState().setSpec('sorcerer')
    expect(store.getState().perkSpend.size).toBe(0)
    expect(store.getState().setPerkLevel('might', 1)).toEqual({
      ok: false,
      reason: 'perk-not-in-spec',
    })
  })

  test('canSetPerkLevel agrees with setPerkLevel on every case, and never changes state', () => {
    const store = bruteStore(1)
    const cases: [string, number][] = [
      ['might', 10], // ok
      ['might', 50], // ok (100)
      ['flurry', 1], // over-budget
      ['echo', 1], // perk-not-in-spec
      ['might', 99], // invalid-level
      ['might', 0], // ok
    ]
    for (const [perkId, level] of cases) {
      const before = store.getState()
      const query = store.getState().canSetPerkLevel(perkId, level)
      expect(store.getState()).toBe(before)
      expect(query).toEqual(store.getState().setPerkLevel(perkId, level))
    }
    const noSpec = createGameStore()
    expect(noSpec.getState().canSetPerkLevel('might', 1)).toEqual(
      noSpec.getState().setPerkLevel('might', 1),
    )
  })
})

describe('refundAllPerks()', () => {
  test('clears every purchased level and frees the whole budget', () => {
    const store = bruteStore(1)
    store.getState().setPerkLevel('might', 50)
    store.getState().refundAllPerks()
    expect(store.getState().perkSpend.size).toBe(0)
    expect(store.getState().setPerkLevel('flurry', 1)).toEqual({ ok: true })
  })

  test('leaves the rest of the state alone', () => {
    const store = bruteStore(1)
    store.getState().setPerkLevel('might', 5)
    const before = store.getState()
    store.getState().refundAllPerks()
    const after = store.getState()
    expect({ ...after, perkSpend: before.perkSpend }).toEqual(before)
  })
})
