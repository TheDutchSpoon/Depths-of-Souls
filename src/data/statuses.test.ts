import { describe, expect, it } from 'vitest'
import { validateStatusDef } from '../engine/effect-types'
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
      expect(dot.polarity).toBe('debuff')
      expect(dot.effects).toHaveLength(1)
      expect(dot.effects[0]).toMatchObject({
        category: 'triggered',
        hook: 'on-round-end',
        response: { kind: 'deal-damage', damageSource: 'dot', emitTriggerFired: false },
      })
    }
  })

  it('REGEN is an on-round-end heal with no per-tick TriggerFired', () => {
    expect(REGEN.polarity).toBe('buff')
    expect(REGEN.effects[0]).toMatchObject({
      category: 'triggered',
      hook: 'on-round-end',
      response: { kind: 'heal', emitTriggerFired: false },
    })
  })

  it("STUN is a passive 'all' action-lock, capped at 1 stack", () => {
    expect(STUN.polarity).toBe('debuff')
    expect(STUN.effects).toEqual([{ category: 'action-lock', scope: 'all' }])
    expect(STUN.cap).toBe(1)
  })

  it('WEAKEN reduces damage dealt additively; VULNERABILITY increases damage taken multiplicatively', () => {
    expect(WEAKEN).toMatchObject({ polarity: 'debuff', defaultDuration: 3 })
    expect(WEAKEN.effects).toEqual([
      { category: 'damage-modifier', direction: 'dealt', magnitude: -0.2 },
    ])
    expect(VULNERABILITY).toMatchObject({ polarity: 'debuff', defaultDuration: 3 })
    expect(VULNERABILITY.effects).toEqual([
      { category: 'damage-modifier', direction: 'taken', magnitude: 1.5 },
    ])
  })

  it('every stock status carries only effects a status may carry (the load-time validator already ran)', () => {
    for (const status of STOCK_STATUSES) {
      expect(() => validateStatusDef(status)).not.toThrow()
    }
  })
})
