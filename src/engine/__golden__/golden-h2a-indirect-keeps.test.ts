import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-indirect-keeps.fixture'
import { expectedEvents } from './golden-h2a-indirect-keeps.fixture'

describe('golden replay: indirect damage keeps affinity, the dealt pool, the conditional bonus, the taken pool and armor penetration, and gets no Additional (4.1-H2a)', () => {
  it('each hit isolates one term: 56 (none), 41 (affinity), 86 (dealt), 71 (conditional), 26 (taken), 58 (penetration)', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
