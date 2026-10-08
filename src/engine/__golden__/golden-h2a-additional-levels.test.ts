import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-additional-levels.fixture'
import { expectedEvents } from './golden-h2a-additional-levels.fixture'

describe('golden replay: the Additional at attacker levels 1, 8 and 11 (4.1-H2a)', () => {
  it('adds 10 at level 1, 3 at level 8 (the cap fades 1 per level) and 0 at level 11', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
