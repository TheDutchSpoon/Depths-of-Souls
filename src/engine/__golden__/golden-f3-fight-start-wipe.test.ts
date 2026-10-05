import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f3-fight-start-wipe.fixture'
import { expectedEvents, expectedResult } from './golden-f3-fight-start-wipe.fixture'

describe('golden replay: a fight-start wipe ends the fight before RoundStarted', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
