import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-cost-and-tick-exclusion.fixture'
import { expectedEvents } from './golden-cost-and-tick-exclusion.fixture'

describe('golden replay: the cost rule and the DoT-tick exclusion', () => {
  it('a self-hit through a selector is an exact cost, a zero cost is a no-op, a tick keeps its minimum of 1', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
