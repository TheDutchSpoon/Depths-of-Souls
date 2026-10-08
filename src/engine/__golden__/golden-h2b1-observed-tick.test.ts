import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b1-observed-tick.fixture'
import { expectedEvents } from './golden-h2b1-observed-tick.fixture'

describe('golden replay: a DoT tick is not a cost (4.1-H2b1)', () => {
  it('a tick on an ally, though its bearer is both source and target, leaves a cost observer silent', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
