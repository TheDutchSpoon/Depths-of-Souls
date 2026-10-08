import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b1-observed-cost.fixture'
import { expectedEvents } from './golden-h2b1-observed-cost.fixture'

describe('golden replay: damage observation of a cost (4.1-H2b1)', () => {
  it('an ally and an enemy observer see a cost, an other-side "ally" observer does not, and a creature observes its own', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
