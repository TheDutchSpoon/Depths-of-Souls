import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-cross-stat-contribution.fixture'
import { expectedEvents, expectedResult } from './golden-cross-stat-contribution.fixture'

describe('golden replay: cross-stat contribution (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
