import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-damage-observed-tick.fixture'
import { expectedEvents } from './golden-damage-observed-tick.fixture'

describe('golden replay: a DoT tick is not a cost', () => {
  it('a tick on an ally, though its bearer is both source and target, leaves a cost observer silent', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
