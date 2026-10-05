import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-turn-end-interaction.fixture'
import { expectedEvents, expectedResult } from './golden-f2-turn-end-interaction.fixture'

describe('golden replay: a tick-kill spreads on-death, the spread follows the born rule, and a tick-kill wins the fight', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
