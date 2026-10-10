import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import { getCreature } from '../creature-lookup'
import type { StatusEffect } from '../effect-types'
import * as fixture from './golden-h2d-pollen-cloud.fixture'
import { C, E1, E2, expectedEvents } from './golden-h2d-pollen-cloud.fixture'

describe('golden replay: the real Pollen Cloud puts Sleep on every enemy and deals no damage (4.1-H2d)', () => {
  it('one cast sleeps both enemies for 2 turns with no DamageDealt, and the next hit wakes only its target', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    // No damage is dealt by the cast itself.
    expect(events.filter((e) => e.type === 'DamageDealt' && e.sourceId === C)).toEqual([])
    // E1 woke; E2 still carries its Sleep with the full 2 turns.
    expect(
      getCreature(state, E1).activeEffects.some((e) => e.category === 'status'),
    ).toBe(false)
    const sleep = getCreature(state, E2).activeEffects.find(
      (e): e is StatusEffect => e.category === 'status' && e.statusId === 'sleep',
    )
    expect(sleep?.remainingDuration).toBe(2)
  })
})
