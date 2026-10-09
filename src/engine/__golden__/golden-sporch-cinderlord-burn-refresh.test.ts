import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sporch-cinderlord-burn-refresh.fixture'
import { expectedEvents } from './golden-sporch-cinderlord-burn-refresh.fixture'

describe('golden replay: Sporch Cinderlord applies one Burn per remaining enemy (real content, single instance)', () => {
  it('matches the committed event log exactly (a fresh target gets a Burn, an already-Burning target keeps its one instance with the timer visibly refreshed 1 -> 3)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
