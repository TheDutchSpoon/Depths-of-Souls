import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b1-fallback-lowest-hp.fixture'
import { expectedEvents, expectedResult } from './golden-b1-fallback-lowest-hp.fixture'

describe('golden replay: B1 -- the script-less fallback attacks the lowest-HP enemy (Phase 4.1-C2b)', () => {
  it('matches the committed event log exactly -- slot 1 (lower HP) is hit before slot 0', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
