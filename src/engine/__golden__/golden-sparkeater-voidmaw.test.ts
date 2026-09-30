import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sparkeater-voidmaw.fixture'
import { expectedEvents } from './golden-sparkeater-voidmaw.fixture'

describe('golden replay: Glimmerdark Sparkeater Voidmaw (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (target max-HP down + clamp, team max-HP up, no auto-heal)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 25 HP
  })
})
