import { describe, expect, it } from 'vitest'
import {
  ENEMY_PARTY_SIZE,
  RARITY_DRAW_WEIGHT,
  enemyLevelRange,
  enemyPartySize,
  fightCount,
} from './curves'

describe('enemyLevelRange', () => {
  // Hand-derived against the placeholder formula: min = floor, max = floor + 2 + floor(floor/10).
  it.each([
    [1, { min: 1, max: 3 }],
    [9, { min: 9, max: 11 }],
    [10, { min: 10, max: 13 }],
    [25, { min: 25, max: 29 }],
    [100, { min: 100, max: 112 }],
  ])('floor %i -> %o', (floor, expected) => {
    expect(enemyLevelRange(floor)).toEqual(expected)
  })

  it('the range never inverts (max always >= min)', () => {
    for (const floor of [1, 5, 17, 50, 250]) {
      const { min, max } = enemyLevelRange(floor)
      expect(max).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('fightCount', () => {
  it('is a flat, deterministic placeholder -- same value at any floor, not rolled', () => {
    expect(fightCount(1)).toBe(3)
    expect(fightCount(50)).toBe(3)
    // Deterministic: calling twice for the same floor never differs.
    expect(fightCount(7)).toBe(fightCount(7))
  })
})

describe('RARITY_DRAW_WEIGHT', () => {
  it('weights rarer tiers strictly lower, matching "rarer creatures appear less often"', () => {
    expect(RARITY_DRAW_WEIGHT.common).toBeGreaterThan(RARITY_DRAW_WEIGHT.uncommon)
    expect(RARITY_DRAW_WEIGHT.uncommon).toBeGreaterThan(RARITY_DRAW_WEIGHT.rare)
    expect(RARITY_DRAW_WEIGHT.rare).toBeGreaterThan(0)
  })
})

describe('ENEMY_PARTY_SIZE', () => {
  it('matches combat max party size (6v6)', () => {
    expect(ENEMY_PARTY_SIZE).toBe(6)
  })
})

describe('enemyPartySize', () => {
  it.each([
    [1, 1],
    [3, 3],
    [6, 6],
    [7, 6],
    [100, 6],
  ])('floor %i -> %i (ramps 1->ENEMY_PARTY_SIZE, then clamps)', (floor, expected) => {
    expect(enemyPartySize(floor)).toBe(expected)
  })

  it('never exceeds ENEMY_PARTY_SIZE', () => {
    for (const floor of [1, 5, 50, 500]) {
      expect(enemyPartySize(floor)).toBeLessThanOrEqual(ENEMY_PARTY_SIZE)
    }
  })

  it('is non-decreasing across increasing depth', () => {
    const floors = [1, 2, 3, 4, 5, 6, 7, 20]
    for (let i = 1; i < floors.length; i++) {
      expect(enemyPartySize(floors[i]!)).toBeGreaterThanOrEqual(
        enemyPartySize(floors[i - 1]!),
      )
    }
  })
})
