import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import { countDraws } from '../test-utils/rng-draw-count'
import * as fixture from './golden-revive-cap-exclusion.fixture'
import { expectedEvents } from './golden-revive-cap-exclusion.fixture'

describe('golden replay: revive cap -- mixed-pool exclusion', () => {
  it('excludes the capped dead ally from the pool, always reviving the eligible one, off exactly one draw', () => {
    const { initial, events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    // Exactly one draw (the pool-index pick) -- proves this golden's seed choice (SEED = 7, not
    // the previous coincidence-prone SEED = 1) is actually exercising the cap filter, not just
    // happening to match its outcome. See this fixture's own header comment for the derivation.
    expect(countDraws(initial.rng, state.rng)).toBe(1)
  })
})
