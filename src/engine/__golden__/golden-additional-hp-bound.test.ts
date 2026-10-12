import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-additional-hp-bound.fixture'
import { expectedEvents } from './golden-additional-hp-bound.fixture'

describe('golden replay: the Additional is bounded by 20% of the target max Health', () => {
  it('adds 4 (not the level cap 10) against a 20-HP target', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
