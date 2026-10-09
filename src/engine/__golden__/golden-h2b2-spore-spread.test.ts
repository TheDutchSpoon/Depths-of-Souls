import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-spore-spread.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-spore-spread.fixture'

describe('golden replay: Spore spreads with the dying bearer whole snapshot: the new host ticks as the original applier (4.1-H2b2)', () => {
  it('matches the committed event log exactly (applier, affinity and potency pass on; a fresh snapshot would read the dying bearer)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
