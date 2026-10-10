import { describe, expect, it } from 'vitest'
import { STATUS_REGISTRY } from '../../data/statuses'
import { holdPotency } from './held-statuses'

describe('holdPotency (4.1-H2d pins)', () => {
  it('replaces only the potency percent: the held def equals the real def apart from it', () => {
    const real = STATUS_REGISTRY.get('poison')!
    const held = holdPotency(STATUS_REGISTRY, { poison: 7 }).get('poison')!
    expect(held.potency).toEqual({ ofStat: real.potency!.ofStat, percent: 7 })
    expect({ ...held, potency: undefined }).toEqual({ ...real, potency: undefined })
    expect(held.effects).toBe(real.effects)
  })

  it('leaves every other status the very same def, and the real registry untouched', () => {
    const before = STATUS_REGISTRY.get('poison')!.potency!.percent
    const held = holdPotency(STATUS_REGISTRY, { poison: 7 })
    for (const [id, def] of STATUS_REGISTRY) {
      if (id !== 'poison') expect(held.get(id)).toBe(def)
    }
    expect(held.size).toBe(STATUS_REGISTRY.size)
    expect(STATUS_REGISTRY.get('poison')!.potency!.percent).toBe(before)
  })

  it('holds several statuses at once', () => {
    const held = holdPotency(STATUS_REGISTRY, { poison: 1, spore: 2 })
    expect(held.get('poison')!.potency!.percent).toBe(1)
    expect(held.get('spore')!.potency!.percent).toBe(2)
  })

  it('throws on an unknown status and on a status with no potency', () => {
    expect(() => holdPotency(STATUS_REGISTRY, { nonsense: 1 })).toThrow(/unknown status/)
    expect(() => holdPotency(STATUS_REGISTRY, { stun: 1 })).toThrow(/no potency/)
  })
})
