import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-fallback-attacks-lowest-hp.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-fallback-attacks-lowest-hp.fixture'

describe('golden replay: the script-less fallback attacks the lowest-HP enemy', () => {
  it('matches the committed event log exactly -- slot 1 (lower HP) is hit before slot 0', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
