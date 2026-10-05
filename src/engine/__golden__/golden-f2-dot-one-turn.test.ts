import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-dot-one-turn.fixture'
import { expectedEvents, expectedResult } from './golden-f2-dot-one-turn.fixture'

describe('golden replay: a 1-turn DoT ticks exactly once; a self-applied one is born and ticks next turn', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
