import { describe, expect, it } from 'vitest'
import {
  calculateAdditional,
  calculateCost,
  calculateDamage,
  calculateIndirectDamage,
  withAdditional,
} from './damage'

// Phase 4.1-H2a: the pure arithmetic of the Additional, indirect damage and the cost.
// `damage.test.ts` (the direct formula) is untouched by this slice.

describe('calculateAdditional: min(floor(20% x max HP), max(0, 10 - (level - 1)))', () => {
  it('the level cap binds against a large target and falls by 1 per level, gone from level 11', () => {
    const cases: [level: number, expected: number][] = [
      [1, 10],
      [2, 9],
      [8, 3],
      [10, 1],
      [11, 0],
      [50, 0],
    ]
    for (const [level, expected] of cases) {
      expect(calculateAdditional(level, 1000)).toBe(expected)
    }
  })

  it('the 20% of max HP bound binds against a small target, floored', () => {
    expect(calculateAdditional(1, 20)).toBe(4)
    expect(calculateAdditional(1, 19)).toBe(3) // floor(3.8)
    expect(calculateAdditional(1, 4)).toBe(0) // floor(0.8)
    expect(calculateAdditional(1, 0)).toBe(0)
    // 50 x 20 / 100 = 10 exactly: both bounds agree at level 1.
    expect(calculateAdditional(1, 50)).toBe(10)
  })

  it('computes the percent in integers: multiples of 5 never floor one too low', () => {
    for (let maxHp = 5; maxHp <= 100; maxHp += 5) {
      expect(calculateAdditional(1, maxHp)).toBe(Math.min(maxHp / 5, 10))
    }
  })

  it('withAdditional adds to the integer damage and leaves rawDamage as the formula value', () => {
    const base = calculateDamage({
      offStat: 20,
      defence: 5,
      attackerAffinity: 'vitality',
      defenderAffinity: 'vitality',
      dealtMods: [],
      takenFactors: [],
    })
    expect(base).toMatchObject({ rawDamage: 15.2, finalDamage: 15 })
    expect(withAdditional(base, 10)).toEqual({ ...base, finalDamage: 25 })
  })
})

describe('calculateIndirectDamage: magnitude x pools - 0.2 x Defence, MAX(1, floor), no chip', () => {
  const base = {
    magnitude: 30,
    defence: 20,
    attackerAffinity: 'vitality',
    defenderAffinity: 'vitality',
    dealtMods: [],
    takenFactors: [],
  } as const

  it('meets only a fifth of Defence and has no chip floor', () => {
    expect(calculateIndirectDamage(base)).toEqual({
      rawDamage: 26,
      finalDamage: 26,
      affinityMultiplier: 1,
      wasChipOnly: false,
    })
  })

  it('is never chip-only: a magnitude under the Defence term still deals the minimum of 1, raw below 1', () => {
    const r = calculateIndirectDamage({ ...base, magnitude: 3 })
    expect(r.rawDamage).toBe(-1)
    expect(r.finalDamage).toBe(1)
    expect(r.wasChipOnly).toBe(false)
  })

  it('applies affinity, the additive dealt pool and the multiplicative taken pool before the Defence term', () => {
    // 30 x 1.25 (vitality > violence) x (1 + 0.2 + 0.1) x (0.65 x 0.5) - 4 = 15.84375 - ... computed
    // by hand: 30 x 1.25 = 37.5; x 1.3 = 48.75; x 0.325 = 15.84375; - 0.2 x 20 = 11.84375.
    const r = calculateIndirectDamage({
      ...base,
      defenderAffinity: 'violence',
      dealtMods: [0.2, 0.1],
      takenFactors: [0.65, 0.5],
    })
    expect(r.affinityMultiplier).toBe(1.25)
    expect(r.rawDamage).toBeCloseTo(11.84375, 10)
    expect(r.finalDamage).toBe(11)
  })

  it('armor penetration shrinks the Defence term', () => {
    // 50% penetration: effective Defence 10, term 2. 30 - 2 = 28.
    expect(
      calculateIndirectDamage({ ...base, armorPenetrationPercent: 0.5 }).finalDamage,
    ).toBe(28)
  })
})

describe('calculateCost: the exact magnitude, floored once, minimum 0', () => {
  it('floors once and records the magnitude as rawDamage', () => {
    expect(calculateCost(6)).toEqual({
      rawDamage: 6,
      finalDamage: 6,
      affinityMultiplier: 1,
      wasChipOnly: false,
    })
    expect(calculateCost(3.9).finalDamage).toBe(3)
  })

  it('a magnitude under 1 costs 0 (the caller treats 0 as a no-op), never the hit minimum of 1', () => {
    expect(calculateCost(0.3).finalDamage).toBe(0)
    expect(calculateCost(0).finalDamage).toBe(0)
  })
})
