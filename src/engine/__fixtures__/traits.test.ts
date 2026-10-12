import { describe, expect, it } from 'vitest'
import {
  BRUTISH,
  BLOODLUST,
  SWIFT_STRIKER,
  RETALIATE,
  GRUDGE,
  VENGEFUL,
  REELING,
  CATASTROPHIC_COLLAPSE,
  FIXTURE_TRAITS,
  FIXTURE_TRAITS_BY_ID,
} from './traits'
import { validateTrait } from '../../data/traits'
import { getEffectiveStat, getOffensiveStat } from '../effective-stats'
import { resolveBaselineEffects, instantiateEffectDefs } from '../effects'
import { makeCreature } from './creatures'
import type { Creature } from '../types'

function instantiateTraitEffects(
  c: Pick<Creature, 'innateTraitIds' | 'side'>,
  registry: typeof FIXTURE_TRAITS_BY_ID,
) {
  return instantiateEffectDefs(resolveBaselineEffects(c, registry), 0).effects
}

describe('the nine mechanism-test fixture traits', () => {
  it('every fixture trait passes the load-time trait validators', () => {
    expect(FIXTURE_TRAITS).toHaveLength(9)
    for (const trait of FIXTURE_TRAITS) {
      expect(() => validateTrait(trait)).not.toThrow()
    }
  })

  it('BRUTISH is a flat +30% Attack passive', () => {
    const c = makeCreature({ attack: 20, innateTraitIds: [BRUTISH.id] })
    const withEffects = {
      ...c,
      activeEffects: instantiateTraitEffects(c, FIXTURE_TRAITS_BY_ID),
    }
    expect(getEffectiveStat(withEffects, 'attack')).toBe(26)
  })

  it('BLOODLUST grants +25% Attack only at full HP', () => {
    const c = makeCreature({ attack: 20, health: 40, innateTraitIds: [BLOODLUST.id] })
    const full = { ...c, activeEffects: instantiateTraitEffects(c, FIXTURE_TRAITS_BY_ID) }
    expect(getEffectiveStat(full, 'attack')).toBe(25)

    const hurt = { ...full, currentHp: 39 }
    expect(getEffectiveStat(hurt, 'attack')).toBe(20)
  })

  it('SWIFT_STRIKER remaps the Attack action to read Speed', () => {
    const c = makeCreature({ attack: 8, speed: 24, innateTraitIds: [SWIFT_STRIKER.id] })
    const withEffects = {
      ...c,
      activeEffects: instantiateTraitEffects(c, FIXTURE_TRAITS_BY_ID),
    }
    expect(getOffensiveStat(withEffects, 'attack')).toBe(24)
  })

  it('RETALIATE is a triggered on-damage-taken deal-damage response (30% Attack)', () => {
    expect(RETALIATE.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          offStat: 'attack',
          spellPower: 0.3,
        },
      },
    ])
  })

  it('GRUDGE is a triggered on-ally-death apply-stat-modifier (+50% Attack)', () => {
    expect(GRUDGE.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-ally-death',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.5,
        },
      },
    ])
  })

  it('VENGEFUL is a triggered on-damage-taken retaliate gated on self HP% < 50', () => {
    expect(VENGEFUL.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        condition: {
          kind: 'hp-percent',
          subject: 'self',
          qualifier: 'any',
          comparator: '<',
          thresholdPercent: 50,
        },
        response: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          offStat: 'attack',
          spellPower: 0.3,
        },
      },
    ])
  })

  it('REELING is a triggered on-damage-taken apply-status (self-stun for 1 round)', () => {
    expect(REELING.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'apply-status',
          target: { kind: 'self' },
          status: { statusId: 'stun', duration: 1 },
        },
      },
    ])
  })

  it('CATASTROPHIC_COLLAPSE bundles a self-kill, an ally-hit, and an on-death apply-status', () => {
    expect(CATASTROPHIC_COLLAPSE.effects).toHaveLength(3)
    expect(CATASTROPHIC_COLLAPSE.effects[0]).toMatchObject({
      hook: 'on-round-end',
      response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 999 },
    })
    expect(CATASTROPHIC_COLLAPSE.effects[1]).toMatchObject({
      hook: 'on-round-end',
      response: { kind: 'deal-damage', target: { kind: 'selector' } },
    })
    expect(CATASTROPHIC_COLLAPSE.effects[2]).toMatchObject({
      hook: 'on-death',
      response: { kind: 'apply-status', status: { statusId: 'weaken' } },
    })
  })
})
