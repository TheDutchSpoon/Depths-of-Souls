import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-e-grant-actor-dies-first.fixture'
import { expectedEvents } from './golden-e-grant-actor-dies-first.fixture'

describe('golden replay: 4.1-E -- a queued grant whose actor died first emits nothing', () => {
  it('matches the hand-derived log exactly', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })

  it('the trigger fired, but no grant event and no echo cast followed', () => {
    const { events } = runGolden(fixture)
    expect(events.filter((e) => e.type === 'TriggerFired')).toHaveLength(2)
    expect(events.some((e) => e.type === 'ActionGranted')).toBe(false)
    expect(events.filter((e) => e.type === 'SpellCast')).toHaveLength(1)
  })
})
