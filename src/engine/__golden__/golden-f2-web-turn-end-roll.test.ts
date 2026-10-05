import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-web-turn-end-roll.fixture'
import { expectedEvents, expectedResult } from './golden-f2-web-turn-end-roll.fixture'

describe('golden replay: the Web roll is in turn-end cleanup and skips a Web applied this turn', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
