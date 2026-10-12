import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-web-rolls.fixture'

describe('golden replay: Web break-free rolls in turn order', () => {
  it('the draws go to the faster bearer first', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(fixture.expectedEvents)
    // Two draws, no more: E's roll and P's roll.
    expect(state.rng.position).toBe(((fixture.SEED >>> 0) + 2 * 0x6d2b79f5) >>> 0)
  })
})
