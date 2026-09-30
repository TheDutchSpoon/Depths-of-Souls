import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-skip-on-invalid.fixture'
import { expectedEvents, expectedResult } from './golden-skip-on-invalid.fixture'

describe('golden replay: skip on invalid (empty gem slot)', () => {
  it('matches the committed event log exactly, with zero SpellCast events', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(events.some((e) => e.type === 'SpellCast')).toBe(false)
    expect(state.result).toBe(expectedResult)
  })
})
