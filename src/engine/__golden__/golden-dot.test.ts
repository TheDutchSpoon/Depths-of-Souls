import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-dot.fixture'
import { expectedEvents, expectedResult } from './golden-dot.fixture'

describe('golden replay: DoT lifecycle (spell-applied Poison, ticks at its bearer turn end, win-check mid-turn)', () => {
  it('applies Poison via a Cast, ticks it flat at its bearer turn end, and the killing tick ends the fight with no expiry', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
