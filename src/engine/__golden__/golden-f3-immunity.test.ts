import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f3-immunity.fixture'
import { expectedEvents, expectedResult } from './golden-f3-immunity.fixture'

describe('golden replay: Clear Mind and Aggressive let the locked action through while the status lands and has-status stays true', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
