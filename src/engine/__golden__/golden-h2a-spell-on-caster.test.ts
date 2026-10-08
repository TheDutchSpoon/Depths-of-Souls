import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-spell-on-caster.fixture'
import { expectedEvents } from './golden-h2a-spell-on-caster.fixture'

describe('golden replay: a spell effect on its own caster is direct damage (4.1-H2a)', () => {
  it('deals the formula plus the Additional (22), not a cost (20) and not indirect (18)', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
