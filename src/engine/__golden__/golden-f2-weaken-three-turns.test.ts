import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-weaken-three-turns.fixture'
import { expectedEvents, expectedResult } from './golden-f2-weaken-three-turns.fixture'

describe('golden replay: a 3-turn Weaken covers the next three bearer turns, applied before or after the bearer acted', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
