import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-tick-taken-factors.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-tick-taken-factors.fixture'

describe("golden replay: a tick passes through the bearer's taken factors, Defend's then Vulnerability's (4.1-H2b2)", () => {
  it('matches the committed event log exactly (26 then 13, not 16 then 7)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
