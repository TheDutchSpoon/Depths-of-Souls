import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f3-silence-three-turns.fixture'
import { expectedEvents, expectedResult } from './golden-f3-silence-three-turns.fixture'

describe('golden replay: Silence locks its target Cast for its next three own turns, applied before or after the target acted', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
