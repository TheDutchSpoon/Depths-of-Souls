import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-defend-count.fixture'
import { expectedEvents, expectedResult } from './golden-defend-count.fixture'

describe('golden replay: defend-count magnitudeSource (Phase 4 Slice D, Bulwark-shaped)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
