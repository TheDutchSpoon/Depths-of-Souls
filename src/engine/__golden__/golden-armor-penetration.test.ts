import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-armor-penetration.fixture'
import { expectedEvents, expectedResult } from './golden-armor-penetration.fixture'

describe('golden replay: armor penetration (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
