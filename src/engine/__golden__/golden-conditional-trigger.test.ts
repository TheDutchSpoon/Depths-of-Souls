import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-conditional-trigger.fixture'
import { expectedEvents, expectedResult } from './golden-conditional-trigger.fixture'

describe('golden replay: conditional trigger (retaliate gated on self HP% < 50)', () => {
  it('stays silent while healthy, then fires once a hit crosses the threshold, not on death', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
