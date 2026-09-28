import { describe, expect, it } from 'vitest'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from './__fixtures__/balance'
import { enemyLevelRange, enemyPartySize, fightCount } from './curves'

describe('enemyLevelRange (Phase-4 placeholder config)', () => {
  // Hand-derived against the placeholder formula: min = floor, max = floor + 2 + floor(floor/10)
  // -- a flat x1.00 multiplier reproduces Phase 4's own `{min: floor, max: ...}` exactly.
  it.each([
    [1, { min: 1, max: 3 }],
    [9, { min: 9, max: 11 }],
    [10, { min: 10, max: 13 }],
    [25, { min: 25, max: 29 }],
    [100, { min: 100, max: 112 }],
  ])('floor %i -> %o', (floor, expected) => {
    expect(enemyLevelRange(floor, CFG)).toEqual(expected)
  })

  it('the range never inverts (max always >= min)', () => {
    for (const floor of [1, 5, 17, 50, 250]) {
      const { min, max } = enemyLevelRange(floor, CFG)
      expect(max).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('enemyLevelRange (default config, Phase 4.1-A / ASSUMPTION 4)', () => {
  // Hand-derived: multiplier rises linearly from x1.25 at floor 1 to x2.00 at floor 100, then
  // +0.01/floor after. min = round(floor * multiplier), max = min + 2 + floor(floor/10).
  it('floor 1 -> multiplier x1.25, min = round(1*1.25) = 1', () => {
    expect(enemyLevelRange(1, DEFAULT_BALANCE_CONFIG)).toEqual({ min: 1, max: 3 })
  })

  it('floor 100 -> multiplier x2.00, min = round(100*2.00) = 200', () => {
    expect(enemyLevelRange(100, DEFAULT_BALANCE_CONFIG)).toEqual({ min: 200, max: 212 })
  })

  it('floor 101 -> multiplier x2.01 (2.00 + 0.01), min = round(101*2.01) = 203', () => {
    expect(enemyLevelRange(101, DEFAULT_BALANCE_CONFIG)).toEqual({ min: 203, max: 215 })
  })

  it('the range never inverts (max always >= min)', () => {
    for (const floor of [1, 5, 17, 50, 100, 101, 250]) {
      const { min, max } = enemyLevelRange(floor, DEFAULT_BALANCE_CONFIG)
      expect(max).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('fightCount', () => {
  it('is a flat, deterministic placeholder under the Phase-4 config -- same value at any floor, not rolled', () => {
    expect(fightCount(1, CFG)).toBe(3)
    expect(fightCount(50, CFG)).toBe(3)
    // Deterministic: calling twice for the same floor never differs.
    expect(fightCount(7, CFG)).toBe(fightCount(7, CFG))
  })

  it('is 10 + (floor - 1), uncapped, under the default config (Phase 4.1-A)', () => {
    expect(fightCount(1, DEFAULT_BALANCE_CONFIG)).toBe(10)
    expect(fightCount(10, DEFAULT_BALANCE_CONFIG)).toBe(19)
    expect(fightCount(30, DEFAULT_BALANCE_CONFIG)).toBe(39)
  })
})

describe('DEFAULT_BALANCE_CONFIG.rarityDrawWeight', () => {
  it('weights rarer tiers strictly lower, matching "rarer creatures appear less often"', () => {
    const { rarityDrawWeight } = DEFAULT_BALANCE_CONFIG
    expect(rarityDrawWeight.common).toBeGreaterThan(rarityDrawWeight.uncommon)
    expect(rarityDrawWeight.uncommon).toBeGreaterThan(rarityDrawWeight.rare)
    expect(rarityDrawWeight.rare).toBeGreaterThan(0)
  })
})

describe('enemyPartySize', () => {
  it.each([
    [1, 1],
    [3, 3],
    [6, 6],
    [7, 6],
    [100, 6],
  ])('floor %i -> %i (ramps 1->cap, then clamps)', (floor, expected) => {
    expect(enemyPartySize(floor, DEFAULT_BALANCE_CONFIG)).toBe(expected)
  })

  it('never exceeds the configured cap', () => {
    for (const floor of [1, 5, 50, 500]) {
      expect(enemyPartySize(floor, DEFAULT_BALANCE_CONFIG)).toBeLessThanOrEqual(
        DEFAULT_BALANCE_CONFIG.enemyPartySizeCap,
      )
    }
  })

  it('is non-decreasing across increasing depth', () => {
    const floors = [1, 2, 3, 4, 5, 6, 7, 20]
    for (let i = 1; i < floors.length; i++) {
      expect(enemyPartySize(floors[i]!, DEFAULT_BALANCE_CONFIG)).toBeGreaterThanOrEqual(
        enemyPartySize(floors[i - 1]!, DEFAULT_BALANCE_CONFIG),
      )
    }
  })
})
