import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-affinity-matchup.fixture'
import { expectedEvents, expectedResult } from './golden-affinity-matchup.fixture'

describe('golden replay: affinity matchup', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
