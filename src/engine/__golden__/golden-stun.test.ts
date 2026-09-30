import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-stun.fixture'
import { expectedEvents, expectedResult } from './golden-stun.fixture'

describe('golden replay: Stun (condition-status suppress-action via a trait apply-status)', () => {
  it('skips the stunned creature’s very next turn via the empty bracket, then expires', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
