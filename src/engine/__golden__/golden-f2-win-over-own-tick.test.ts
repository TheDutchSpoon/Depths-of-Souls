import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-win-over-own-tick.fixture'
import { expectedEvents, expectedResult } from './golden-f2-win-over-own-tick.fixture'

describe('golden replay: the last survivor empties the enemy side and would die to its own tick -- a win', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
