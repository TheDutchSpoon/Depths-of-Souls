import { describe, expect, it } from 'vitest'
import { validateStatusDef } from '../engine/effect-types'
import {
  POISON,
  BURN,
  REGEN,
  SPORE,
  STUN,
  WEAKEN,
  VULNERABILITY,
  SILENCED,
  PACIFIED,
  STOCK_STATUSES,
  STATUS_REGISTRY,
} from './statuses'

describe('stock statuses (representative Phase 3 content)', () => {
  it('registers every stock status by statusId', () => {
    expect([...STATUS_REGISTRY.keys()].sort()).toEqual(
      STOCK_STATUSES.map((s) => s.statusId).sort(),
    )
  })

  it('POISON/BURN are on-turn-end snapshot-potency DoT ticks with no per-tick TriggerFired', () => {
    for (const dot of [POISON, BURN]) {
      expect(dot.polarity).toBe('debuff')
      expect(dot.effects).toHaveLength(1)
      expect(dot.effects[0]).toMatchObject({
        category: 'triggered',
        hook: 'on-turn-end',
        response: {
          kind: 'deal-damage',
          flatAmount: { kind: 'snapshot-potency' },
          damageSource: 'dot',
          emitTriggerFired: false,
        },
      })
    }
  })

  it('REGEN is an on-turn-end snapshot-potency heal with no per-tick TriggerFired', () => {
    expect(REGEN.polarity).toBe('buff')
    expect(REGEN.effects[0]).toMatchObject({
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'heal',
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
      },
    })
  })

  it("the four ticking statuses declare the placeholder potencies (percent of the APPLIER's stat; H2c tunes them)", () => {
    expect(POISON.potency).toEqual({ ofStat: 'attack', percent: 20 })
    expect(BURN.potency).toEqual({ ofStat: 'intelligence', percent: 25 })
    expect(REGEN.potency).toEqual({ ofStat: 'health', percent: 10 })
    expect(SPORE.potency).toEqual({ ofStat: 'speed', percent: 15 })
  })

  it('SPORE carries one tick and one spread: the spread is a plain apply-status of spore (the engine passes the snapshot on)', () => {
    expect(SPORE.effects).toHaveLength(2)
    expect(SPORE.effects[0]).toMatchObject({
      hook: 'on-turn-end',
      response: { kind: 'deal-damage', flatAmount: { kind: 'snapshot-potency' } },
    })
    expect(SPORE.effects[1]).toMatchObject({
      hook: 'on-death',
      response: { kind: 'apply-status', status: { statusId: 'spore' } },
    })
  })

  it('only the four ticking statuses declare a potency', () => {
    expect(
      STOCK_STATUSES.filter((s) => s.potency !== undefined)
        .map((s) => s.statusId)
        .sort(),
    ).toEqual(['burn', 'poison', 'regen', 'spore'])
  })

  it("STUN is a passive 'all' action-lock", () => {
    expect(STUN.polarity).toBe('debuff')
    expect(STUN.effects).toEqual([{ category: 'action-lock', scope: 'all' }])
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

  it("SILENCED is a passive 'cast' action-lock and PACIFIED a passive 'attack' one (3 turns, debuffs)", () => {
    expect(SILENCED.effects).toEqual([{ category: 'action-lock', scope: 'cast' }])
    expect(PACIFIED.effects).toEqual([{ category: 'action-lock', scope: 'attack' }])
    for (const lock of [SILENCED, PACIFIED]) {
      expect(lock.defaultDuration).toBe(3)
      expect(lock.polarity).toBe('debuff')
      expect(STATUS_REGISTRY.get(lock.statusId)).toBe(lock)
    }
  })
})
