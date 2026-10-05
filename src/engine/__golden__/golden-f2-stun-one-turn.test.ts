import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-stun-one-turn.fixture'
import { expectedEvents, expectedResult } from './golden-f2-stun-one-turn.fixture'

describe('golden replay: Stun 1 skips exactly one turn of its bearer, before or after the applier in the queue', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
