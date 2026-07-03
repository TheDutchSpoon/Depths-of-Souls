import { describe, expect, it } from 'vitest'
import { compareByKey, compareBySideSlotId, pickExtremum } from './tie-break'
import { makeCreature } from './__fixtures__/creatures'

describe('compareBySideSlotId', () => {
  it('orders player side before enemy side', () => {
    const player = makeCreature({ id: 'p', side: 'player', slot: 0 })
    const enemy = makeCreature({ id: 'e', side: 'enemy', slot: 0 })
    expect(compareBySideSlotId(player, enemy)).toBeLessThan(0)
    expect(compareBySideSlotId(enemy, player)).toBeGreaterThan(0)
  })

  it('breaks a same-side tie by ascending slot index', () => {
    const first = makeCreature({ id: 'a', side: 'player', slot: 0 })
    const second = makeCreature({ id: 'b', side: 'player', slot: 1 })
    expect(compareBySideSlotId(first, second)).toBeLessThan(0)
    expect(compareBySideSlotId(second, first)).toBeGreaterThan(0)
  })

  it('breaks a same-side, same-slot tie by codepoint id, not localeCompare', () => {
    const a = makeCreature({ id: 'a-creature', side: 'player', slot: 0 })
    const b = makeCreature({ id: 'b-creature', side: 'player', slot: 0 })
    expect(compareBySideSlotId(a, b)).toBeLessThan(0)
    expect(compareBySideSlotId(b, a)).toBeGreaterThan(0)
  })

  it('returns 0 for identical side/slot/id', () => {
    const a = makeCreature({ id: 'same', side: 'player', slot: 0 })
    const b = makeCreature({ id: 'same', side: 'player', slot: 0 })
    expect(compareBySideSlotId(a, b)).toBe(0)
  })
})

describe('compareByKey', () => {
  const low = makeCreature({ id: 'low', side: 'player', slot: 0, currentHp: 5 })
  const high = makeCreature({ id: 'high', side: 'player', slot: 1, currentHp: 20 })

  it('orders ascending by key when direction is asc', () => {
    expect(compareByKey(low, high, (c) => c.currentHp, 'asc')).toBeLessThan(0)
  })

  it('orders descending by key when direction is desc', () => {
    expect(compareByKey(low, high, (c) => c.currentHp, 'desc')).toBeGreaterThan(0)
  })

  it('falls back to compareBySideSlotId on a key tie', () => {
    const a = makeCreature({ id: 'a', side: 'player', slot: 0, currentHp: 10 })
    const b = makeCreature({ id: 'b', side: 'player', slot: 1, currentHp: 10 })
    expect(compareByKey(a, b, (c) => c.currentHp, 'asc')).toBeLessThan(0)
  })
})

describe('pickExtremum', () => {
  it('returns undefined for an empty pool', () => {
    expect(pickExtremum([], (c) => c.currentHp, 'asc')).toBeUndefined()
  })

  it('returns the sole element for a singleton pool', () => {
    const only = makeCreature({ id: 'only', currentHp: 7 })
    expect(pickExtremum([only], (c) => c.currentHp, 'asc')).toBe(only)
  })

  it('returns the tie-broken extremum for a multi-way key tie', () => {
    const a = makeCreature({ id: 'a', side: 'player', slot: 0, currentHp: 10 })
    const b = makeCreature({ id: 'b', side: 'player', slot: 1, currentHp: 10 })
    const c = makeCreature({ id: 'c', side: 'player', slot: 2, currentHp: 5 })
    // lowest currentHp -> c wins outright; among a/b (tied at 10) irrelevant here.
    expect(pickExtremum([a, b, c], (x) => x.currentHp, 'asc')).toBe(c)
  })

  it('picks the correct member among several distinct values, descending', () => {
    const low = makeCreature({ id: 'low', currentHp: 5 })
    const mid = makeCreature({ id: 'mid', currentHp: 10 })
    const high = makeCreature({ id: 'high', currentHp: 20 })
    expect(pickExtremum([low, mid, high], (c) => c.currentHp, 'desc')).toBe(high)
  })
})
