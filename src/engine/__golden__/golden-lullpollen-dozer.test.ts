import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-lullpollen-dozer.fixture'
import { expectedEvents } from './golden-lullpollen-dozer.fixture'

describe('golden replay: Lullpollen Dozer (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (bonus hit scaled by live Sleeping-enemy count)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // OTHERFOE (1000 HP) survives
  })
})
