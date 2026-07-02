import { describe, expect, it } from 'vitest'
import { calculateDamage, type DamageInput } from './damage'

const NEUTRAL: Pick<DamageInput, 'attackerAffinity' | 'defenderAffinity'> = {
  attackerAffinity: 'body',
  defenderAffinity: 'mind', // non-adjacent in the cycle -> neutral (1.0)
}

function input(overrides: Partial<DamageInput>): DamageInput {
  return {
    offStat: 20,
    defence: 0,
    ...NEUTRAL,
    dealtMods: [],
    takenFactors: [],
    ...overrides,
  }
}

describe('calculateDamage', () => {
  it('is chip-floor-only when the core is fully absorbed (offStat <= defence)', () => {
    const result = calculateDamage(input({ offStat: 10, defence: 15 }))
    expect(result.wasChipOnly).toBe(true)
    expect(result.rawDamage).toBeCloseTo(0.1) // 0 core + (0.01 * 10) chip floor
    expect(result.finalDamage).toBe(1) // MAX(1, floor(0.1))
  })

  it('adds the chip floor on top of a positive core (not just the max of the two)', () => {
    const result = calculateDamage(input({ offStat: 30, defence: 10 }))
    expect(result.wasChipOnly).toBe(false)
    expect(result.rawDamage).toBeCloseTo(20.3) // 20 core + (0.01 * 30) chip floor
    expect(result.finalDamage).toBe(20)
  })

  it('applies the affinity advantage multiplier (x1.25) when the attacker beats the defender', () => {
    const result = calculateDamage(
      input({
        offStat: 30,
        defence: 10,
        attackerAffinity: 'body',
        defenderAffinity: 'spirit',
      }),
    )
    expect(result.affinityMultiplier).toBe(1.25)
    expect(result.rawDamage).toBeCloseTo(25.375) // 20.3 * 1.25
    expect(result.finalDamage).toBe(25)
  })

  it('applies the affinity disadvantage multiplier (x0.75) when the defender beats the attacker', () => {
    const result = calculateDamage(
      input({
        offStat: 30,
        defence: 10,
        attackerAffinity: 'spirit',
        defenderAffinity: 'body',
      }),
    )
    expect(result.affinityMultiplier).toBe(0.75)
    expect(result.rawDamage).toBeCloseTo(15.225) // 20.3 * 0.75
    expect(result.finalDamage).toBe(15)
  })

  it('applies a neutral affinity multiplier (x1.0) for a non-adjacent matchup', () => {
    const result = calculateDamage(input({ offStat: 30, defence: 10 }))
    expect(result.affinityMultiplier).toBe(1.0)
    expect(result.rawDamage).toBeCloseTo(20.3)
  })

  it('treats empty dealt/taken pools as exactly 1x each', () => {
    const result = calculateDamage(
      input({ offStat: 20, defence: 0, dealtMods: [], takenFactors: [] }),
    )
    expect(result.rawDamage).toBeCloseTo(20.2) // 20 core + 0.2 chip, x1.0 affinity, x1 x1 pools
  })

  it('sums the additive dealt pool and multiplies through the multiplicative taken pool', () => {
    const result = calculateDamage(
      input({
        offStat: 20,
        defence: 0,
        dealtMods: [0.5, 0.25],
        takenFactors: [0.8, 0.5],
      }),
    )
    // base = 20.2; dealt = 1 + 0.75 = 1.75; taken = 0.8 * 0.5 = 0.4
    // raw = 20.2 * 1.75 * 0.4 = 14.14
    expect(result.rawDamage).toBeCloseTo(14.14)
    expect(result.finalDamage).toBe(14)
  })

  it('never deals less than 1 damage, even when raw rounds down to 0', () => {
    const result = calculateDamage(input({ offStat: 1, defence: 100 }))
    expect(result.rawDamage).toBeCloseTo(0.01)
    expect(result.finalDamage).toBe(1)
    expect(result.wasChipOnly).toBe(true)
  })

  it('floors the fully-composed value once, not each term before multiplying', () => {
    // core=10, chipFloor=0.5, affinity x1.25 (advantage).
    // Correct (floor once at the end): floor((10 + 0.5) * 1.25) = floor(13.125) = 13.
    // A "floor each term first" bug would instead compute floor(10.5) * 1.25 = 10 * 1.25 = 12.5,
    // then presumably floor that to 12 -- a different, wrong answer this test would catch.
    const result = calculateDamage(
      input({
        offStat: 50,
        defence: 40,
        attackerAffinity: 'body',
        defenderAffinity: 'spirit',
      }),
    )
    expect(result.rawDamage).toBeCloseTo(13.125)
    expect(result.finalDamage).toBe(13)
  })
})
