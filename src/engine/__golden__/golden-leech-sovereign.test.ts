import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-leech-sovereign.fixture'
import { expectedEvents } from './golden-leech-sovereign.fixture'

describe('golden replay: the Leech Sovereign, Glimmerdark boss (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Attack steal compounds across two hits)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 32 HP
  })
})
