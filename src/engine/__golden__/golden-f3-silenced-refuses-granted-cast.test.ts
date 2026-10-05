import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f3-silenced-refuses-granted-cast.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-f3-silenced-refuses-granted-cast.fixture'

describe('golden replay: the real Silenced status refuses a granted cast (the real-status mirror of B2.2)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
