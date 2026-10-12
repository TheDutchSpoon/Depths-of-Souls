import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import {
  revived,
  revivedExpected,
  speedUp,
  speedUpExpected,
} from './golden-pass-order-live.fixture'

describe('golden replay: a pass reads the live order', () => {
  it('a Speed change earlier in the round reorders the round-end pass against the round-start queue', () => {
    const { events } = runGolden(speedUp)

    expect(events).toEqual(speedUpExpected)
  })

  it('a creature revived in round 2 fires in its live place in the round-end pass', () => {
    const { events, state } = runGolden(revived)

    expect(events).toEqual(revivedExpected)
    // The revive pick among a pool of one is the fight's only draw.
    expect(state.rng.position).toBe(((revived.SEED >>> 0) + 0x6d2b79f5) >>> 0)
  })
})
