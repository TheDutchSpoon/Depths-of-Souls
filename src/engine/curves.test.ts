import { describe, expect, it } from 'vitest'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from './__fixtures__/balance'
import { bossLevel, enemyLevelRange, enemyPartySize, fightCount } from './curves'

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

  it('the minimum is exactly the floor at every floor, so rounding it down (4.1-H2c) cannot move this config', () => {
    for (let floor = 1; floor <= 250; floor++) {
      expect(enemyLevelRange(floor, CFG).min).toBe(floor)
    }
  })

  it('the range never inverts (max always >= min)', () => {
    for (const floor of [1, 5, 17, 50, 250]) {
      const { min, max } = enemyLevelRange(floor, CFG)
      expect(max).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('enemyLevelRange (default config, Phase 4.1-H2c / ASSUMPTIONS 4, 118, 119)', () => {
  // Hand-derived: the multiplier rises linearly from x1.25 at floor 1 to x2.00 at floor 100, then
  // +0.01/floor after. min = floor(floor * multiplier) -- rounded DOWN since H2c (ASSUMPTION 118),
  // computed as floor * (99a + (b - a)(floor - 1)) / 9900 with a = 125, b = 200 (floors <= 100) and
  // floor * (b + (floor - 100)) / 100 above; max = min + 0 + floor(floor/10) (width base 0).
  //   floor: raw min -> min  (round would give)
  //     1: 1.250 -> 1   2: 2.515 -> 2 (3)   3: 3.795 -> 3 (4)   4: 5.091 -> 5   5: 6.402 -> 6
  //     6: 7.727 -> 7 (8)   7: 9.068 -> 9   8: 10.424 -> 10   9: 11.795 -> 11 (12)
  //    10: 13.182 -> 13   20: 27.879 -> 27 (28)   30: 44.091 -> 44
  //   100: 200.000 -> 200   101: 203.010 -> 203   108: 224.640 -> 224 (225)
  it.each([
    [1, { min: 1, max: 1 }],
    [2, { min: 2, max: 2 }],
    [3, { min: 3, max: 3 }],
    [4, { min: 5, max: 5 }],
    [5, { min: 6, max: 6 }],
    [6, { min: 7, max: 7 }],
    [7, { min: 9, max: 9 }],
    [8, { min: 10, max: 10 }],
    [9, { min: 11, max: 11 }],
    [10, { min: 13, max: 14 }],
    [20, { min: 27, max: 29 }],
    [30, { min: 44, max: 47 }],
    [100, { min: 200, max: 210 }],
    [101, { min: 203, max: 213 }],
    [108, { min: 224, max: 234 }], // the one floor above 100 where round and floor differ
  ])('floor %i -> %o', (floor, expected) => {
    expect(enemyLevelRange(floor, DEFAULT_BALANCE_CONFIG)).toEqual(expected)
  })

  it('floors 1-9 spawn at exactly 1, 2, 3, 5, 6, 7, 9, 10, 11 (ASSUMPTION 118)', () => {
    const minimums = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
      (floor) => enemyLevelRange(floor, DEFAULT_BALANCE_CONFIG).min,
    )
    expect(minimums).toEqual([1, 2, 3, 5, 6, 7, 9, 10, 11])
  })

  it('the range never inverts (max always >= min)', () => {
    for (const floor of [1, 5, 17, 50, 100, 101, 250]) {
      const { min, max } = enemyLevelRange(floor, DEFAULT_BALANCE_CONFIG)
      expect(max).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('bossLevel (default config, Phase 4.1-H2c / ASSUMPTION 119)', () => {
  // bossLevel = enemyLevelRange(floor).max + 5: floor 10: 14 + 5, floor 20: 29 + 5, floor 30: 47 + 5.
  it.each([
    [10, 19],
    [20, 34],
    [30, 52],
  ])('floor %i -> boss level %i', (floor, expected) => {
    expect(bossLevel(floor, DEFAULT_BALANCE_CONFIG)).toBe(expected)
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
