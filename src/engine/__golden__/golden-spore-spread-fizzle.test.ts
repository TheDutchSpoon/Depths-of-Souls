import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-spore-spread-fizzle.fixture'
import { SEED, expectedEvents } from './golden-spore-spread-fizzle.fixture'

describe('golden replay: Spore spread-on-death fizzles when every living ally is already Spored (real content)', () => {
  it('matches the committed event log exactly (TriggerFired still fires; nothing follows it)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
    // Proves the "no RNG draw at all" claim, not just asserts it: if anything in the run above
    // had consumed a draw, the plain-data bookmark's position would have advanced away from its
    // starting seed value.
    expect(state.rng.position).toBe(SEED)
  })
})
