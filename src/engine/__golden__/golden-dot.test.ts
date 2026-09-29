import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-dot.fixture'
import { expectedEvents, expectedResult } from './golden-dot.fixture'

describe('golden replay: DoT lifecycle (spell-applied Poison, ticks, expiry, round-end win-check)', () => {
  it('applies Poison via a Cast, ticks it flat at round-end, and expires it on the killing tick', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
