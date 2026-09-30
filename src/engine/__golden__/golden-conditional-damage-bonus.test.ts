import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-conditional-damage-bonus.fixture'
import { expectedEvents, expectedResult } from './golden-conditional-damage-bonus.fixture'

describe('golden replay: conditional-damage-bonus (Phase 4 Slice E2)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
