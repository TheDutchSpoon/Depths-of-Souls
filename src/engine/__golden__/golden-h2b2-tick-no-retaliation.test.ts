import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-tick-no-retaliation.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-tick-no-retaliation.fixture'

describe('golden replay: a tick from a living applier offers no triggering-source: no retaliator answers, on-damage-taken still fires and wakes Sleep (4.1-H2b2)', () => {
  it('matches the committed event log exactly (Snapback and Madness Touch fire and fizzle, Sleep wakes)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
