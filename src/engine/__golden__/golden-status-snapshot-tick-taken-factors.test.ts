import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-status-snapshot-tick-taken-factors.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-status-snapshot-tick-taken-factors.fixture'

describe("golden replay: a tick passes through the bearer's taken factors, Defend's then Vulnerability's", () => {
  it('matches the committed event log exactly (26 then 13, not 16 then 7)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
