import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import { MAX_TRIGGER_CASCADE_DEPTH } from '../config'
import * as fixture from './golden-e-echo-chain-truncated.fixture'
import { expectedEvents } from './golden-e-echo-chain-truncated.fixture'

describe('golden replay: 4.1-E -- an echo chain through the same Overtone, truncated at the real cap', () => {
  it('matches the hand-built log exactly', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toHaveLength(2007)
    expect(events).toEqual(expectedEvents)
    expect(state.enemyParty[0]?.currentHp).toBe(499) // 1000 - 501 hits
  })

  it("the fixture's cap is the engine's (the derivation is against the real constant)", () => {
    expect(fixture.CAP).toBe(MAX_TRIGGER_CASCADE_DEPTH)
  })

  it('explicit checkpoints, written out independently of the fixture loop', () => {
    const { events } = runGolden(fixture)
    const BEARER = fixture.BEARER
    const hit = (remainingHp: number) => ({
      type: 'DamageDealt',
      sourceId: BEARER,
      targetId: fixture.TARGET,
      rawDamage: 0.1,
      finalDamage: 1,
      affinityMultiplier: 1,
      wasChipOnly: true,
      remainingHp,
      damageSource: 'cast',
    })
    // Indices: 0 FightStarted, 1 RoundStarted, 2 TurnStarted, 3 SpellCast (original),
    // 4 TriggerFired (grant 1), 5 the original's hit; hop k occupies 6 + 4(k-1) .. 9 + 4(k-1).
    expect(events[3]?.type).toBe('SpellCast')
    expect(events[4]).toMatchObject({ type: 'TriggerFired', hook: 'on-action-observed' })
    expect(events[5]).toEqual(hit(999))
    // hop 1
    expect(events[6]).toMatchObject({
      type: 'ActionGranted',
      sourceId: BEARER,
      actorId: BEARER,
    })
    expect(events[7]?.type).toBe('SpellCast')
    expect(events[8]?.type).toBe('TriggerFired')
    expect(events[9]).toEqual(hit(998))
    // hop 2 -- the same Overtone instance again
    expect(events[10]?.type).toBe('ActionGranted')
    expect(events[12]?.type).toBe('TriggerFired')
    expect(events[13]).toEqual(hit(997))
    // hop 499: still firing
    expect(events[1998]?.type).toBe('ActionGranted')
    expect(events[2000]?.type).toBe('TriggerFired')
    expect(events[2001]).toEqual(hit(500))
    // hop 500: the last echo runs, and ITS observation is truncated
    expect(events[2002]?.type).toBe('ActionGranted')
    expect(events[2003]?.type).toBe('SpellCast')
    expect(events[2004]).toEqual({
      type: 'CascadeTruncated',
      creatureId: BEARER,
      effectId: fixture.OVERTONE_FIXTURE.id,
      depth: 501,
    })
    expect(events[2005]).toEqual(hit(499))
    expect(events[2006]).toEqual({ type: 'TurnEnded', creatureId: BEARER })
    // Exactly one truncation, 500 grants, 501 casts.
    expect(events.filter((e) => e.type === 'CascadeTruncated')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'ActionGranted')).toHaveLength(500)
    expect(events.filter((e) => e.type === 'SpellCast')).toHaveLength(501)
  })
})
