import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b4-cleanse-then-tick.fixture'
import { expectedEvents } from './golden-b4-cleanse-then-tick.fixture'

describe('golden replay: B4 exact-instance rule -- cleanse-then-tick (Phase 4.1-B, PR #69 R5)', () => {
  it('matches the committed event log exactly across fight-start and the bearer’s own first turn', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
