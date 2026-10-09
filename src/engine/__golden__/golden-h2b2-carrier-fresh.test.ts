import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-carrier-fresh.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-carrier-fresh.fixture'

describe('golden replay: a carrier applying the same status snapshots fresh from itself, not the snapshot it carries (4.1-H2b2)', () => {
  it('matches the committed event log exactly (the Seeder Spore ticks as the Seeder, not as the original applier)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
