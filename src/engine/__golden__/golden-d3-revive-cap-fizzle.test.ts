import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-d3-revive-cap-fizzle.fixture'
import { expectedEvents } from './golden-d3-revive-cap-fizzle.fixture'

describe('golden replay: D3 revive cap -- 11th-attempt fizzle (Phase 4.1-B, PR #69 R5)', () => {
  it('emits TriggerFired only, and draws zero RNG, when the sole dead ally is already at the cap', () => {
    const { initial, events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    // Zero draws -- proves the pool-empty check runs BEFORE any random() call, not merely that
    // the outcome happens to match.
    expect(state.rng.position).toBe(initial.rng.position)
  })
})
