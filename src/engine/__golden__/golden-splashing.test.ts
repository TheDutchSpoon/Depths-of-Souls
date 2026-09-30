import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-splashing.fixture'
import { expectedEvents } from './golden-splashing.fixture'

describe('golden replay: Splashing (Phase 4 Slice C)', () => {
  it('matches the committed event log exactly -- main hit + two distinctly-recomputed splash hits', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // all three enemies survive
  })
})
