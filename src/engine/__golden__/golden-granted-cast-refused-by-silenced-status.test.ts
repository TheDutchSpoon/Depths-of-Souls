import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-granted-cast-refused-by-silenced-status.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-granted-cast-refused-by-silenced-status.fixture'

describe('golden replay: the real Silenced status refuses a granted cast (the real-status mirror of the trait-borne golden)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
