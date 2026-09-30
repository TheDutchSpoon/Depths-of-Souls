import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-broodmother.fixture'
import { expectedEvents } from './golden-broodmother.fixture'

describe('golden replay: Overgrowth Broodmother Swarm Call count-scaling (Phase 4 Slice I, PR #65 review, real content)', () => {
  it('matches the committed event log exactly (count 3 while both spiderlings live, count 2 the moment one has died)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // STRIKER survives at 22 HP -- fight not over
  })
})
