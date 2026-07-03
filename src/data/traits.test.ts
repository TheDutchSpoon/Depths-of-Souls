import { describe, expect, it } from 'vitest'
import { BRUTISH, BLOODLUST, SWIFT_STRIKER, STOCK_TRAITS, TRAIT_REGISTRY } from './traits'
import { getEffectiveStat, getOffensiveStat } from '../engine/effective-stats'
import { instantiateTraitEffects } from '../engine/effects'
import { makeCreature } from '../engine/__fixtures__/creatures'

describe('stock traits (representative Phase 3 content)', () => {
  it('registers every stock trait by id', () => {
    expect([...TRAIT_REGISTRY.keys()].sort()).toEqual(
      STOCK_TRAITS.map((t) => t.id).sort(),
    )
  })

  it('BRUTISH is a flat +30% Attack passive', () => {
    const c = makeCreature({ attack: 20, innateTraitIds: [BRUTISH.id] })
    const withEffects = {
      ...c,
      activeEffects: instantiateTraitEffects(c, TRAIT_REGISTRY),
    }
    expect(getEffectiveStat(withEffects, 'attack')).toBe(26)
  })

  it('BLOODLUST grants +25% Attack only at full HP', () => {
    const c = makeCreature({ attack: 20, health: 40, innateTraitIds: [BLOODLUST.id] })
    const full = { ...c, activeEffects: instantiateTraitEffects(c, TRAIT_REGISTRY) }
    expect(getEffectiveStat(full, 'attack')).toBe(25)

    const hurt = { ...full, currentHp: 39 }
    expect(getEffectiveStat(hurt, 'attack')).toBe(20)
  })

  it('SWIFT_STRIKER remaps the Attack action to read Speed', () => {
    const c = makeCreature({ attack: 8, speed: 24, innateTraitIds: [SWIFT_STRIKER.id] })
    const withEffects = {
      ...c,
      activeEffects: instantiateTraitEffects(c, TRAIT_REGISTRY),
    }
    expect(getOffensiveStat(withEffects, 'attack')).toBe(24)
  })
})
