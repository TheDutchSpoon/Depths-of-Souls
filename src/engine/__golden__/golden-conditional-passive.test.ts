import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-conditional-passive.fixture'
import { expectedEvents, expectedResult } from './golden-conditional-passive.fixture'

describe('golden replay: conditional passive folded at read time', () => {
  it('re-evaluates +25%-Attack-at-full-HP on each read, weakening the hit after damage', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
