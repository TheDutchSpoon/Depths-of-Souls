import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-defend-count-additive-cap.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-defend-count-additive-cap.fixture'

describe('golden replay: defend-count additive-cap accumulation (Phase 4 Slice D, PR #47 review amendment, real Bulwark-shaped)', () => {
  it('matches the committed event log exactly, reaching AND holding the hard cap', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
