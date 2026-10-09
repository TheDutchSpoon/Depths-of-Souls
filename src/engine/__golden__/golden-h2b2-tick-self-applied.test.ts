import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-tick-self-applied.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-tick-self-applied.fixture'

describe('golden replay: a self-applied tick makes its bearer the dealer, and is still never self-inflicted (4.1-H2b2)', () => {
  it('matches the committed event log exactly (Dealer fires, the cost observer stays silent)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
