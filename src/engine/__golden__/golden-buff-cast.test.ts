import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-buff-cast.fixture'
import { expectedEvents, expectedResult } from './golden-buff-cast.fixture'

describe('golden replay: stat-modifier-payload AOE Cast (Phase 4 Slice E)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
