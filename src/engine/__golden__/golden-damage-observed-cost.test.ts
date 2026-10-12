import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-damage-observed-cost.fixture'
import { expectedEvents } from './golden-damage-observed-cost.fixture'

describe('golden replay: damage observation of a cost', () => {
  it('an ally and an enemy observer see a cost, an other-side "ally" observer does not, and a creature observes its own', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
