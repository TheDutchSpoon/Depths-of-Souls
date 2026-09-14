import { describe, expect, it } from 'vitest'
import {
  POISON,
  BURN,
  REGEN,
  STUN,
  WEAKEN,
  VULNERABILITY,
  STOCK_STATUSES,
  STATUS_REGISTRY,
} from './statuses'

describe('stock statuses (representative Phase 3 content)', () => {
  it('registers every stock status by statusId', () => {
    expect([...STATUS_REGISTRY.keys()].sort()).toEqual(
      STOCK_STATUSES.map((s) => s.statusId).sort(),
    )
  })

  it('POISON/BURN are on-round-end flat DoT ticks with no per-tick TriggerFired', () => {
    for (const dot of [POISON, BURN]) {
      expect(dot.category).toBe('condition-status')
      expect(dot.polarity).toBe('debuff')
      expect(dot.triggers).toHaveLength(1)
      expect(dot.triggers[0]!.hook).toBe('on-round-end')
      expect(dot.triggers[0]!.response).toMatchObject({
        kind: 'deal-damage',
        damageSource: 'dot',
        emitTriggerFired: false,
      })
    }
  })

  it('REGEN is an on-round-end heal with no per-tick TriggerFired', () => {
    expect(REGEN.category).toBe('condition-status')
    expect(REGEN.polarity).toBe('buff')
    expect(REGEN.triggers[0]!.hook).toBe('on-round-end')
    expect(REGEN.triggers[0]!.response).toMatchObject({
      kind: 'heal',
      emitTriggerFired: false,
    })
  })

  it('STUN is an on-turn-start suppress-action, capped at 1 stack', () => {
    expect(STUN.category).toBe('condition-status')
    expect(STUN.polarity).toBe('debuff')
    expect(STUN.triggers[0]!.hook).toBe('on-turn-start')
    expect(STUN.triggers[0]!.response).toEqual({ kind: 'suppress-action' })
    expect(STUN.cap).toBe(1)
  })

  it('WEAKEN reduces damage dealt additively; VULNERABILITY increases damage taken multiplicatively', () => {
    expect(WEAKEN).toMatchObject({
      category: 'damage-modifier',
      direction: 'dealt',
      magnitude: -0.2,
      polarity: 'debuff',
      defaultDuration: 3,
    })
    expect(VULNERABILITY).toMatchObject({
      category: 'damage-modifier',
      direction: 'taken',
      magnitude: 1.5,
      polarity: 'debuff',
      defaultDuration: 3,
    })
  })
})
