import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-tick-living-applier.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-tick-living-applier.fixture'

describe('golden replay: a status tick is indirect damage from the applier snapshot, credited to the living applier (4.1-H2b2)', () => {
  it('matches the committed event log exactly (snapshot potency, asymmetric affinity, Defence, Defend, no dealt pool, frozen snapshot, dealer hooks)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
