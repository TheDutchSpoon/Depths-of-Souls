import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-provoke-redirect.fixture'
import { expectedEvents, expectedResult } from './golden-provoke-redirect.fixture'

describe('golden replay: provoke redirect', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
