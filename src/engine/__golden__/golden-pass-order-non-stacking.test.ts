import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-non-stacking.fixture'

describe('golden replay: a non-stacking trigger in turn order', () => {
  it('the faster carrier gets the chance and the slower one draws nothing', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(fixture.expectedEvents)
    // One draw in all: the claiming carrier's roll.
    expect(state.rng.position).toBe(((fixture.SEED >>> 0) + 0x6d2b79f5) >>> 0)
  })
})
